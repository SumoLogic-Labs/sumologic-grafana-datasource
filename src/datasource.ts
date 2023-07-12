import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
  TimeRange,
} from '@grafana/data';
import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { lastValueFrom , Observable , Subject , of , from , map } from 'rxjs';
import { calculateInterval, createEpochTimeRangeBoundary } from './utils/time.utils';
import { SumoApiDimensionValuesResponse } from './types/metadataCatalogApi.types';
import { mapKeyedErrorMessage } from './utils/keyedErrors.utils';
import { MetricsQuery, SumoApiMetricsResponse, SumoQuery } from './types/metricsApi.types';
import { dimensionsToLabelSuffix } from './utils/labels.utils';
import { interpolateVariable } from './utils/interpolation.utils';

import { formatSumoValues, getSumoToGrafanaType, SumoQueryType } from './types/constants';
import { searchQueryExecutionService } from './services/logDataService/searchQueryExecutionService';
import { RunSearchActionType, SearchQueryType, SearchStatus } from './services/logDataService/constants';
import { IField, ISearchStatus, RunSearchAction, SearchQueryParams } from './services/logDataService/types';

import { filter , switchMap } from 'rxjs/operators';

export class DataSource extends DataSourceApi<SumoQuery> {
  private readonly baseUrl: string;
  private readonly basicAuth: string;

  private logsController$ :  Subject<RunSearchAction> | null

  constructor(instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
    this.baseUrl = instanceSettings.url as string;
    this.basicAuth = instanceSettings.basicAuth as string;
    this.logsController$ = null
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

    //Check if any logs query present
    const isLogsQuery = targets.find(query=>query.type === SumoQueryType.Logs)

    if(isLogsQuery){
      return this.fetchLogsQuery(options);
    }
    else{
      return this.fetchMetricsQuery(options);
    }
  }


  fetchLogsQuery(options: DataQueryRequest<SumoQuery>) : Observable<DataQueryResponse>{

    const { targets, range , scopedVars } = options;

    const templateSrv = getTemplateSrv();

    const modifiedQueries : SumoQuery[] = targets
    .filter(({ queryText }) => Boolean(queryText))
    .map((query) => ({
      ...query,
      queryText: templateSrv.replace(query.queryText as string, scopedVars, interpolateVariable),
    }));


    const logsQueryObj  = modifiedQueries.find(query=>query.type === SumoQueryType.Logs) as SumoQuery

    if (!logsQueryObj) {
      return of({ data : []})
    }

    const startTime = range.from.valueOf();
    const endTime = range.to.valueOf();
    const { queryText } = logsQueryObj 

    const searchParams : SearchQueryParams = {
      types: [SearchQueryType.AGGREGATE],
      query: queryText || '',
      startTime : startTime,
      endTime : endTime,
      baseUrl : this.baseUrl,
      basicAuth : this.basicAuth, 
      paginationInfo : {
        offset : 0,
        length : 10000 // fetching first 10000 records only
      }
    }
    const previousCountMap = {
      messageCount : 0
    }

    const searchStatusFilter = (status$: Observable<ISearchStatus>) =>
    status$.pipe(
      filter((searchStatusResponse: ISearchStatus) => {
        const isMessageCountUpdated = searchStatusResponse.messageCount && searchStatusResponse.messageCount > previousCountMap.messageCount ? true : false
        if(isMessageCountUpdated){
          previousCountMap.messageCount = searchStatusResponse.messageCount as number
        }

        const isQueryCompleted = searchStatusResponse.state === SearchStatus.DONE_GATHERING_RESULTS

        return (
          //fetching records when messages count changes and when query gets completed
          isMessageCountUpdated || isQueryCompleted
        );
      }),
    );

    this.logsController$ = new Subject();

    return searchQueryExecutionService.run(
      searchParams,
      this.logsController$,
      searchStatusFilter
    ).pipe(switchMap(response=>{
      const aggregateResponse = response.aggregate
      if(!aggregateResponse){
        return of({
          data  : []
        }) as  Observable<DataQueryResponse>
      }
      const {fields , records} = aggregateResponse

      const dataFrame = new MutableDataFrame({
        name : 'AggregateResponse', // dataframe name
        fields: fields.map((field : IField)=>{
          return{
            name : field.name,
            type :  getSumoToGrafanaType(field.name , field.fieldType),
            values : records.map(record=> formatSumoValues(record.map[field.name] , field.fieldType )),
          }
        }),
      })
      return of({ data : [dataFrame] })
    }),
    filter(value=>value.data.length>0)
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
