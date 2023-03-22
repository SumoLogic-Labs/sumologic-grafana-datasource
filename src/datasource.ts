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

import { lastValueFrom } from 'rxjs';

import { calculateInterval, createEpochTimeRangeBoundary } from './utils/time.utils';
import { SumoApiDimensionValuesResponse } from './types/metadataCatalogApi.types';
import { mapKeyedErrorMessage } from './utils/keyedErrors.utils';
import { MetricsQuery, SumoApiMetricsResponse, SumoQuery } from './types/metricsApi.types';
import { dimensionsToLabelSuffix } from './utils/labels.utils';
import { interpolateVariable } from './utils/interpolation.utils';

export class DataSource extends DataSourceApi<SumoQuery> {
  private readonly baseUrl: string;
  private readonly basicAuth: string;

  constructor(instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
    this.baseUrl = instanceSettings.url as string;
    this.basicAuth = instanceSettings.basicAuth as string;
  }

  // perform metrics query by Grafana
  async query(options: DataQueryRequest<SumoQuery>): Promise<DataQueryResponse> {
    const { range, maxDataPoints, targets, scopedVars, interval } = options;
    const templateSrv = getTemplateSrv();

    const startTime = range!.from.valueOf();
    const endTime = range!.to.valueOf();

    // Empirically, it seems that we get better looking graphs
    // when requesting some fraction of the indicated width...
    let requestedDataPoints = Math.round(maxDataPoints! / 6);

    // Figure out the desired quantization.
    const desiredQuantizationInSec = calculateInterval(interval);

    const queries: MetricsQuery[] = targets
      .filter(({ queryText }) => Boolean(queryText))
      .map(({ refId, queryText }) => ({
        query: templateSrv.replace(queryText!, scopedVars, interpolateVariable),
        rowId: refId,
      }));

    if (!queries.length) {
      return {
        data: []
      };
    }

    const { data: { response, keyedErrors, error, errorKey, errorMessage } } = await this.fetchMetrics(queries, {
      startTime,
      endTime,
      requestedDataPoints,
      maxDataPoints: maxDataPoints!,
      desiredQuantizationInSec,
    });

    if (error && !response.length) {
      if (errorMessage) {
        throw new Error(errorMessage);
      }

      if (errorKey) {
        throw new Error(`API return error with code "${errorKey}"`);
      }

      const firstKeyedError = keyedErrors.find((keyedError) => keyedError.values?.type === 'error');

      throw new Error(mapKeyedErrorMessage(firstKeyedError));
    }

    const data = response.flatMap(({ rowId, results }) =>
      results.map(({ metric, datapoints }) => new MutableDataFrame({
      name: `${metric.name} ${dimensionsToLabelSuffix(metric.dimensions)}`.trim(),
      refId: rowId,
      meta: {
        notices: keyedErrors.filter(({ values }) => values?.rowId === rowId)
          .map(keyedError => ({
            text: mapKeyedErrorMessage(keyedError),
            severity: keyedError.values?.type ?? 'error',
          })),
      },
      fields: [
        { name: 'Time', values: datapoints.timestamp, type: FieldType.time},
        { name: 'Value', values: datapoints.value, type: FieldType.number}
      ]
    })));

    return { data };
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
    data?: any;
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
