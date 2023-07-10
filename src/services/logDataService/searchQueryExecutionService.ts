import type { Observable } from 'rxjs';
import {
  from,
  combineLatest,
  Subject,
  throwError,
  of,
  merge,
  defer,
} from 'rxjs';
import {
  mergeMap,
  switchMap,
  share,
  repeatWhen,
  delay,
  takeUntil,
  startWith,
  filter,
  retryWhen,
  take,
  takeWhile,
  publish,
  skipWhile,
  merge as mergeOprator
} from 'rxjs/operators';



export const takeWhileInclusive = <T>(predicate: (value: T, index: number) => boolean) =>
  (source: Observable<T>) =>
    source.pipe(
      publish((co) =>
        co.pipe(
          takeWhile(predicate),
          mergeOprator(co.pipe(skipWhile(predicate), take(1))),
        ),
      ),
    );

import { searchQueryDataService } from './searchQueryDataService';
import { MESSAGES_RETRY_COUNT, MESSAGES_RETRY_DELAY, MESSAGES_RETRY_EMPTY_ERROR, QUERY_STOPPED_STATES, RunSearchActionType, SearchQueryType } from './constants';
import { ISearchMessageResult, ISearchStatus, ISearchCreate, RetrievePageFunction, RunSearchAction, SearchPaginationInfo, SearchQueryParams, SearchResult, SearchStatusFilter } from './types';

export class SearchQueryExecutionService {
  public run(
    searchParams: SearchQueryParams,
    control$: Observable<RunSearchAction>,
    statusFilter: SearchStatusFilter,

  ): Observable<SearchResult> {
    // Create a search
    const { query, startTime, endTime, baseUrl, basicAuth, timeZone } = searchParams;
    const create$ = from(
      searchQueryDataService.create({
        query,
        startTime,
        endTime,
        baseUrl,
        basicAuth,
        timeZone
      }
      ),
    );
    return create$.pipe(
      mergeMap((response: ISearchCreate) => {
        // Transform promise observable into search result observable
        return this.runSearchWithQueryId(
          response.id,
          searchParams,
          control$,
          statusFilter,
        );
      }),
    );
  }

  // The rest of the methods are meant to be private but are public to enable unit testing
  runSearchWithQueryId(
    searchQueryId: string,
    searchParams: SearchQueryParams,
    control$: Observable<RunSearchAction>,
    statusFilter: SearchStatusFilter,
  ): Observable<SearchResult> {


    const { baseUrl, basicAuth } = searchParams

    // Listen for control$ actions
    const stop$ = control$.pipe(
      switchMap((runSearchAction) => {
        switch (runSearchAction.type) {
          case RunSearchActionType.STOP:
            return searchQueryDataService.delete(
              searchQueryId,
              baseUrl,
              basicAuth
            );
          default:
            throw new Error(
              `Action type not supported in control$: ${runSearchAction.type}`,
            );
        }
      }),
      share(),
    );

    // Make status observable
    const status$ = this.runGetStatus(searchQueryId, baseUrl, basicAuth, stop$);

    // Use status observable as input to raw messages and aggregate query observables
    const types = searchParams.types;
    const observablesByType: Observable<ISearchMessageResult>[] = []; // Array of results matching index of types

    // Execute search type specific logic
    types.forEach((queryType: string) => {
      switch (queryType) {
        case SearchQueryType.MESSAGES:
          observablesByType.push(
            this.runGetMessages(
              searchQueryId,
              searchParams.paginationInfo,
              baseUrl,
              basicAuth,
              status$,
              control$,
              statusFilter,
            ),
          );
          break;
        case SearchQueryType.AGGREGATE:
          observablesByType.push(
            this.runGetAggregates(
              searchQueryId,
              baseUrl,
              basicAuth,
              searchParams.paginationInfo,
              status$,
              control$,
              statusFilter,
            ),
          );
          break;
        default:
          break;
      }
    });

    // Result selector to pass into combineLatest.
    const resultSelector = (status: ISearchStatus, ...resultByType: any[]) => {
      const combinedResult : any = { status };
      resultByType.forEach((result, index) => {
        combinedResult[types[index]] = result; 
      });

      return combinedResult;
    };

    // Push result selector into observablesByType so it can be the last parameter
    const params: any = [status$, ...observablesByType, resultSelector];

    // Return unified observable with the result of [status, messages?, aggregate?]
    // The observable completes when all the combined observables complete
    const searchResultCombined$: Observable<SearchResult> = combineLatest.apply(
      this,
      params,
    ) as Observable<SearchResult>;

    return searchResultCombined$.pipe(takeUntil(stop$));
  }

  /**
   * Continuously polls for getStatus until pollCondition is met
   * Ex:
   * NOT_STARTED -> GATHERING_RESULTS  -> GATHERING_RESULTS -> GATHERING_RESULTS -> DONE_GATHERING_RESULTS
   * @param searchQueryId
   * @returns {Observable<ISearchStatus>}
   */
  runGetStatus(
    searchQueryId: string,
    baseUrl: string,
    basicAuth: string,
    stop$: Observable<{}>,
  ): Observable<ISearchStatus> {
    // If we make poll condition configurable then it becomes similar to statusFilter.  statusFilter is more like
    // filtering statuses for a desired one, while poll condition controls polling itself.  Is this something
    // we should allow the caller to specify or should we just let them filter for the desired statuses?
    const pollCondition = (statusResponse: ISearchStatus) =>
      !QUERY_STOPPED_STATES[statusResponse.state];

    const statusSubject = new Subject<ISearchStatus>();

    defer(() => searchQueryDataService.status(searchQueryId, baseUrl, basicAuth))
      .pipe(
        // TODO remove takeUntil(stop$) once SUMO-97437 is solved
        // Currently, we need to take stop$ into account as well becase pausing a raw query doesn't always
        // result in change of state in subsequent status calls. Therefore, the check in pollCondition
        // may not be sufficient.
        repeatWhen((notifications) =>
          notifications.pipe(delay(1000), takeUntil(stop$)),
        ),
        takeWhileInclusive(pollCondition),
      )
      .subscribe((status: ISearchStatus) => {
        statusSubject.next(status);
      });

    return statusSubject.asObservable();
  }

  /**
   * Call the get raw messages api endpoint and places results in an observable.
   * The message observable starts when a condition on the status$ is met.  This condition is specified by statusFilter.
   * So if statusFilter returns true only when the status is DONE_GATHERING_RESULTS, the observable will look like this:
   *
   * Status Observable: NOT_STARTED -> GATHERING_RESULTS -> GATHERING_RESULTS -> DONE_GATHERING_RESULTS
   *                                                                                  |
   * Message Observable:                                                          MESSAGE (PAGE 1)
   * @param paginationInfo
   * @param status$
   * @param control$
   * @param statusFilter
   * @returns {Observable<ISearchMessageResult>}
   */
  runGetMessages(
    searchQueryId: string,
    paginationInfo: SearchPaginationInfo,
    baseUrl: string,
    basicAuth: string,
    status$: Observable<ISearchStatus>,
    control$: Observable<RunSearchAction>,
    statusFilter: SearchStatusFilter,
  ): Observable<ISearchMessageResult> {
    const messages$ = statusFilter(status$).pipe(
      switchMap((searchStatusResponse: ISearchStatus) => {
        // Switch to a message promise once condition is met
        if (searchStatusResponse.messageCount! > 0) {
          return this.fetchMessagesWithRetry(
            searchQueryId,
            baseUrl,
            basicAuth,
            paginationInfo,
          );
        } else if (searchStatusResponse?.pendingErrors?.[0]) {
          // Throw an error because the /create call also will trigger an observable error and we want to be consisten
          return throwError(
            new Error(searchStatusResponse.pendingErrors[0]),
          );
        } else {
          return of(undefined);
        }
      }),
    );

    return merge(
      messages$,
      this.addPagingForControlObservable(
        control$,
        baseUrl,
        basicAuth,
        searchQueryDataService.messages,
      ),
    ).pipe(
      startWith(undefined), // Start with undefined so that combineLatest will take status without messages;
    ) as Observable<ISearchMessageResult>;
  }

  runGetAggregates(
    searchQueryId: string,
    baseUrl: string,
    basicAuth: string,
    paginationInfo: SearchPaginationInfo,
    status$: Observable<ISearchStatus>,
    control$: Observable<RunSearchAction>,
    statusFilter: SearchStatusFilter,
  ) {
    const aggregate$ = statusFilter(status$).pipe(
      switchMap((searchStatusResponse: ISearchStatus) => {
        if (searchStatusResponse.recordCount! > 0) {
          return searchQueryDataService.aggregates(
            searchQueryId,
            paginationInfo.offset,
            paginationInfo.length,
            baseUrl,
            basicAuth
          );
        } else if (searchStatusResponse?.pendingErrors?.[0]) {
          // Throw an error because the /create call also will trigger an observable error and we want to be consisten
          return throwError(
            new Error(searchStatusResponse.pendingErrors[0]),
          );
        } else {
          return of(undefined);
        }
      }),
    );

    return merge(
      aggregate$,
      this.addPagingForControlObservable(
        control$,
        baseUrl,
        basicAuth,
        searchQueryDataService.aggregates,
      ),
    ).pipe(
      startWith(undefined), // Start with undefined so that combineLatest will take status without messages;
    );
  }

  // This method retries because of a bug in search (SUMO-97298). It can happen that
  // even though `rawMessageCount` is greater then zero, the subsequent call to `messages`
  // returns empty message array.
  private fetchMessagesWithRetry(
    searchQueryId: string,
    baseUrl: string,
    basicAuth: string,
    paginationInfo: SearchPaginationInfo,
  ) {
    return defer(() =>
      searchQueryDataService.messages(
        searchQueryId,
        paginationInfo.offset,
        paginationInfo.length,
        baseUrl,
        basicAuth
      ),
    ).pipe(
      switchMap((result) =>
        result.messages.length
          ? of(result)
          : throwError(new Error(MESSAGES_RETRY_EMPTY_ERROR)),
      ),
      retryWhen((error$) =>
        error$.pipe(
          filter(
            (error: Error) => error.message === MESSAGES_RETRY_EMPTY_ERROR,
          ),
          delay(MESSAGES_RETRY_DELAY),
          take(MESSAGES_RETRY_COUNT),
        ),
      ),
    );
  }

  /**
   * Handles the SET_PAGE RunSearchActionType in the control$ observable.
   * NOTE: There is no restriction on when the page of messages can be set.  The code emitting events to control$ may want to retrieve
   * the second page before the first page, or retrieve results when the search status is still GATHERING RESULTS.
   * @param control$
   * @param retrievePageFunction
   * @returns {Observable<any>}
   */
  private addPagingForControlObservable(
    control$: Observable<RunSearchAction>,
    baseUrl: string,
    basicAuth: string,
    retrievePageFunction: RetrievePageFunction,
  ): Observable<any> {
    return control$.pipe(
      filter(
        (runSearchAction) =>
          runSearchAction.type === RunSearchActionType.SET_PAGE,
      ),
      switchMap((runSearchAction) => {
        const {
          sessionId,
          paginationInfo: { offset, length },
        } = runSearchAction.payload;
        return retrievePageFunction(sessionId, offset, length, baseUrl, basicAuth);
      }),
    );
  }
}

export const searchQueryExecutionService = new SearchQueryExecutionService();
