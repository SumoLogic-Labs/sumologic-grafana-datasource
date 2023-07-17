import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
  TimeRange,
  DataSourceWithLogsVolumeSupport,
  LoadingState,
} from '@grafana/data';
import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { lastValueFrom , Observable , Subject , of , from , map , startWith  } from 'rxjs';
import { calculateInterval, createEpochTimeRangeBoundary } from './utils/time.utils';
import { SumoApiDimensionValuesResponse } from './types/metadataCatalogApi.types';
import { mapKeyedErrorMessage } from './utils/keyedErrors.utils';
import { MetricsQuery, SumoApiMetricsResponse, SumoQuery } from './types/metricsApi.types';
import { dimensionsToLabelSuffix } from './utils/labels.utils';
import { interpolateVariable } from './utils/interpolation.utils';

import { isLogsQuery, SumoQueryType } from './types/constants';
import { searchQueryExecutionService } from './services/logDataService/searchQueryExecutionService';
import { MAX_NUMBER_OF_RECORDS, RunSearchActionType, SearchQueryType, SearchStatus } from './services/logDataService/constants';
import { ISearchStatus, RunSearchAction, SearchQueryParams, SearchResult } from './services/logDataService/types';

import { generateAggregateResponse, generateFullRangeHistogram, generateNonAggregateResponse, IPreviousCount, searchFilterForAggregateQuery, searchFilterForNonAggregateQuery } from './services/logDataService/logSearch.utils';

export class DataSource extends DataSourceApi<SumoQuery> 
implements DataSourceWithLogsVolumeSupport<SumoQuery>
{
  private readonly baseUrl: string;
  private readonly basicAuth: string;

  private logsController$ :  Subject<RunSearchAction> | null

  private logsVolumnsProvider$ : Subject<SearchResult> | null

  constructor(instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
    this.baseUrl = instanceSettings.url as string;
    this.basicAuth = instanceSettings.basicAuth as string;
    this.logsController$ = null
    this.logsVolumnsProvider$ = null
  }

  // perform logs/metrics query by Grafana
  query(options: DataQueryRequest<SumoQuery>): Observable<DataQueryResponse> {
    const { range , targets } = options;

    if (!range) {
      throw new Error('No range has been provided');
    }
    if(this.logsController$){
      // stop previous running logs query
      this.logsController$.next({ type : RunSearchActionType.STOP })
      this.logsController$ = null;
    }
    this.logsVolumnsProvider$ = null;

    //Check if any logs query present
    const isLogsQueryType = targets.find(query=> isLogsQuery(query.type))

    if(isLogsQueryType){
      return this.fetchLogsQuery(options);
    }
    else{
      return this.fetchMetricsQuery(options);
    }
  }

  getLogsVolumeDataProvider(): Observable<DataQueryResponse> | undefined{
    if(this.logsVolumnsProvider$){
      return this.logsVolumnsProvider$.asObservable()
      .pipe(map(response=>{
        const dataFrame = generateFullRangeHistogram(response.status)
        return {
          data : [dataFrame],
          state : LoadingState.Done
        }
      }))
    } 
    return 
  }


  fetchLogsQuery(options: DataQueryRequest<SumoQuery>) : Observable<DataQueryResponse>{

    const { targets, range , scopedVars , maxDataPoints } = options;

    const templateSrv = getTemplateSrv();

    const modifiedQueries : SumoQuery[] = targets
    .filter(({ queryText }) => Boolean(queryText))
    .map((query) => ({
      ...query,
      queryText: templateSrv.replace(query.queryText as string, scopedVars, interpolateVariable),
    }));


    const logsQueryObj  = modifiedQueries.find(query=>isLogsQuery(query.type))

    if (!logsQueryObj) {
      return of({ data : []})
    }

    const maxRecords = Math.min(maxDataPoints || MAX_NUMBER_OF_RECORDS , MAX_NUMBER_OF_RECORDS )

    const startTime = range.from.valueOf();
    const endTime = range.to.valueOf();
    const { queryText , type } = logsQueryObj 
    const searchType = type === SumoQueryType.LogsAggregate ? SearchQueryType.AGGREGATE : SearchQueryType.MESSAGES;

    const searchParams : SearchQueryParams = {
      types: [searchType],
      query: queryText || '',
      startTime : startTime,
      endTime : endTime,
      baseUrl : this.baseUrl,
      basicAuth : this.basicAuth, 
      paginationInfo : {
        offset : 0,
        length : maxRecords 
      }
    }
    const previousCountMap : IPreviousCount = {
      statusMessageCount : 0, // message count in status api
      actualMessageCount : 0  // messages count in message api

    }

    const searchStatusFilter = (status$: Observable<ISearchStatus>) => {
      // filters are used to fetch records and messages
      return searchType === SearchQueryType.AGGREGATE ?
        searchFilterForAggregateQuery(status$, previousCountMap) :
        searchFilterForNonAggregateQuery(status$, maxRecords, previousCountMap);
    }

    this.logsController$ = new Subject();
    if(searchType === SearchQueryType.MESSAGES){
      this.logsVolumnsProvider$ = new Subject();
    }

    return searchQueryExecutionService.run(
      searchParams,
      this.logsController$,
      searchStatusFilter
    ).pipe( 
      map(response => {
        // update log exploror histogram
        if(searchType === SearchQueryType.MESSAGES){
          this.logsVolumnsProvider$?.next(response)
        }
        const responseObj = response[searchType];
        const status = response.status;
        if (!responseObj) {
          return {
            data: [],
            state : LoadingState.Loading
          }
        }
        let dataFrame : MutableDataFrame; 
        if(searchType === SearchQueryType.AGGREGATE){
          dataFrame = generateAggregateResponse(response);
        }else{
          dataFrame = generateNonAggregateResponse(response, previousCountMap)
        }

        return { data: [dataFrame], 
          state : status.state === SearchStatus.DONE_GATHERING_RESULTS ?  LoadingState.Done : LoadingState.Loading
          }
      }),
      startWith({ data : [] , state : LoadingState.Loading })
    )
  }


  fetchMetricsQuery(options: DataQueryRequest<SumoQuery>) : Observable<DataQueryResponse>{

    const { range, maxDataPoints, targets, scopedVars, interval } = options;

    const templateSrv = getTemplateSrv();

    const startTime = range.from.valueOf();
    const endTime = range.to.valueOf();

    // Empirically, it seems that we get better looking graphs
    // when requesting some fraction of the indicated width...
    const requestedDataPoints = maxDataPoints ? Math.round(maxDataPoints / 6) : 100;

    // Figure out the desired quantization.
    const desiredQuantizationInSec = calculateInterval(interval);

    const queries: MetricsQuery[] = targets
      .filter(({ queryText }) => Boolean(queryText))
      .map(({ refId, queryText }) => ({
        query: templateSrv.replace(queryText as string, scopedVars, interpolateVariable),
        rowId: refId,
      }));

    if (!queries.length) {
      return of({ data : []})
    }

    const hasMultipleQueries = queries.length > 1;

    return from(this.fetchMetrics(queries, {
      startTime,
      endTime,
      requestedDataPoints,
      maxDataPoints: maxDataPoints ?? 100,
      desiredQuantizationInSec,
    })).pipe(
      map(res=>{
        const { data: { response, keyedErrors, error, errorKey, errorMessage } } = res;
        if (error && !response.length) {
          if (errorMessage) {
            throw new Error(errorMessage);
          }
    
          if (errorKey) {
            throw new Error(`API return error with code "${errorKey}"`);
          }
    
          const firstKeyedError = keyedErrors.find((keyedError) => keyedError.values?.type === 'error');
          const firstWarningError = keyedErrors.find((keyedError) => keyedError.values?.type === 'warning');
    
          throw new Error(mapKeyedErrorMessage(firstKeyedError ?? firstWarningError));
        }
    
        const data = response.flatMap(({ rowId, results }) => {
          const responseSpecificErrors = hasMultipleQueries
            ? keyedErrors.filter(({ values }) => values?.rowId === rowId)
            : keyedErrors;
          const notices = responseSpecificErrors
            .map(keyedError => ({
              text: mapKeyedErrorMessage(keyedError, hasMultipleQueries ? rowId : undefined),
              severity: keyedError.values?.type ?? 'error',
            }));
          return results.length
            ? results.map(({ metric, datapoints }) => new MutableDataFrame({
              name: `${metric.name} ${dimensionsToLabelSuffix(metric.dimensions)}`.trim(),
              refId: rowId,
              meta: { notices },
              fields: [
                { name: 'Time', values: datapoints.timestamp, type: FieldType.time},
                { name: 'Value', values: datapoints.value, type: FieldType.number}
              ]
            }))
            : new MutableDataFrame({
              name: `${rowId}`,
              refId: rowId,
              meta: { notices, },
              fields: []
            });
        });
        return { data }   
      })
    )
  }

  // used to get Query dependent variables by Grafana
  async metricFindQuery(query: string, { variable: { name }, range }: {
    range: TimeRange;
    variable: {
      name: string;
      query: string;
    };
  }) {
    const response = await this.getDimensionValues(name, {
      query,
      from: range.from.valueOf(),
      to: range.to.valueOf()
    });

    return response.data.data.map(({ value }) => ({ text: value }));
  }

  // used to check if plugin configured properly by Grafana
  testDatasource() {
    return this.getDimensionValues('metric', {
        size: 1,
        from: Date.now() - 60 * 1000,
        to: Date.now()
      })
      .catch(err => {
        if (err.status === 404) {
          if (!this.baseUrl.endsWith('/api/')) {
            return Promise.reject(new Error('API returns 404. Please ensure that provided URL contain full path.'));
          }
        }

        return Promise.reject(err);
      })
      .then(() => ({
        status: 'success',
        message: 'Success',
      }));
  }

  private getDimensionValues(term: string, { query, from, to, size = 1000 }: {
    query?: string;
    from: number;
    to: number;
    size?: number;
  }) {
    return this.sumoApiRequest<SumoApiDimensionValuesResponse>({
      url: `/v1/metadataCatalog/dimensions/${encodeURIComponent(term)}/values/search`,
      data: {
        selector: query ? [query] : [],
        term: '',
        from: createEpochTimeRangeBoundary(from),
        to: createEpochTimeRangeBoundary(to),
        size,
      },
    })
      .catch(err => {
        if (Array.isArray(err.data?.errors)) {
          return Promise.reject(new Error(err.data?.errors[0].message));
        }

        return Promise.reject(err);
      });
  }

  private fetchMetrics(
    queries: MetricsQuery[],
    {
      startTime,
      endTime,
      maxDataPoints,
      requestedDataPoints,
      desiredQuantizationInSec
    }: {
      startTime: number;
      endTime: number;
      maxDataPoints: number;
      requestedDataPoints: number;
      desiredQuantizationInSec: number;
    }
  ) {
    return this.sumoApiRequest<SumoApiMetricsResponse>({
      url: '/v1/metrics/annotated/results',
      data: {
        query: queries,
        startTime,
        endTime,
        maxDataPoints,
        requestedDataPoints,
        desiredQuantizationInSec,
      },
    });
  }

  private sumoApiRequest<Response>({ url, method = 'POST', data }: {
    method?: 'POST' | 'GET';
    url: string;
    data?: unknown;
  }) {
    return lastValueFrom(getBackendSrv().fetch<Response>({
      method,
      credentials: 'include',
      headers: {
        Authorization: this.basicAuth,
      },
      url: this.baseUrl + url,
      data,
    }));
  }
}
