import { DataQueryRequest, DataSourceInstanceSettings, TimeRange } from '@grafana/data';
import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { of } from 'rxjs';

import { DataSource } from './datasource';
import { SumoQuery } from './types/metricsApi.types';
import { interpolateVariable } from './utils/interpolation.utils';

jest.mock('@grafana/runtime', () => {
  const backendSrv = {
    fetch: jest.fn(),
  };
  const templateSrv = {
    replace: jest.fn().mockImplementation((val) => val),
  };

  return {
    ...jest.requireActual('@grafana/runtime'),
    getTemplateSrv() {
      return templateSrv;
    },
    getBackendSrv() {
      return backendSrv;
    },
  };
});

describe('placeholder test', () => {

  function createDataSource() {
    return new DataSource({
      url: 'https://long-api.sumologic.net/api',
      basicAuth: 'authorizationHeaderContent',
    } as DataSourceInstanceSettings);
  }

  beforeEach(() => {
    const mockedFetch = getBackendSrv().fetch as jest.Mock;
    mockedFetch.mockReset();
  });

  describe('testDatasource', () => {
    it('should return success if connection is established', async () => {
      const mockedFetch = getBackendSrv().fetch as jest.Mock;

      mockedFetch.mockReturnValue(of(true));

      const result = await createDataSource().testDatasource();

      expect(mockedFetch).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://long-api.sumologic.net/api/v1/metadataCatalog/dimensions/metric/values/search',
        credentials: 'include',
        headers: {
          Authorization: 'authorizationHeaderContent',
        },
        data: {
          selector: [],
          term: '',
          from: {
            epochMillis: expect.any(Number),
            type: 'EpochTimeRangeBoundary',
          },
          to: {
            epochMillis: expect.any(Number),
            type: 'EpochTimeRangeBoundary',
          },
          size: 1,
        },
      });

      expect(result).toEqual({
        status: 'success',
        message: 'Success',
      });
    });

    it('should throw if connection cannot be established', async () => {
      try {
        await createDataSource().testDatasource();
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });

  describe('metricFindQuery', () => {
    it('should call sumo API and map response', async () => {
      const mockedFetch = getBackendSrv().fetch as jest.Mock;

      mockedFetch.mockReturnValue(of({
        data: {
          data: [
            { value: 'Value 1', count: 0 },
            { value: 'Value 2', count: 0 },
          ],
        },
      }));

      const result = await createDataSource()
        .metricFindQuery('metric=cpu', {
          range: {
            from: new Date(2022, 7, 1, 13, 30, 0, 0), // in real env Moment instance would be passed
            to: new Date(2022, 7, 1, 13, 45, 0, 0), // in real env Moment instance would be passed
          } as unknown as TimeRange,
          variable: {
            name: '_source',
            query: 'metric=cpu',
          }
        });

      expect(mockedFetch).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://long-api.sumologic.net/api/v1/metadataCatalog/dimensions/_source/values/search',
        credentials: 'include',
        headers: {
          Authorization: 'authorizationHeaderContent',
        },
        data: {
          selector: ['metric=cpu'],
          term: '',
          from: {
            epochMillis: 1659360600000,
            type: 'EpochTimeRangeBoundary',
          },
          to: {
            epochMillis: 1659361500000,
            type: 'EpochTimeRangeBoundary',
          },
          size: 1000,
        },
      });

      expect(result).toEqual([{ text: 'Value 1' }, { text: 'Value 2' }]);
    });
  });

  describe('query', () => {
    const queryMockResponse = () => {
      return {
        error: false,
        errorMessage: null,
        errorInstanceId: null,
        errorKey: null,
        keyedErrors: [],
        response: [{
          rowId: 'A',
          results: [{
            metric: {
              name: 'CPUFrequencyMHz_19',
              dimensions: [{
                key: '_sourceHost',
                value: 'us2-tsat-clickhouse-3',
                legend: true
              }, { key: 'Role', value: 'tsat-clickhouse', legend: false }, {
                key: 'metric',
                value: 'CPUFrequencyMHz_19',
                legend: true
              }],
              algoId: 1,
              customLabel: ''
            },
            horAggs: {
              min: 2937.0,
              max: 3100.0,
              avg: 3095.8098591549297,
              sum: 1099012.5,
              count: 355,
              latest: 3100.0
            },
            datapoints: {
              timestamp: [1677148320000, 1677148380000],
              value: [3099.0, 3100.0],
              outlierParams: [{
                anomalyScore: 0.0,
                baseline: 0.0,
                unit: 0.0,
                lowerBound: 0.0,
                upperBound: 0.0,
                isOutlier: false,
                outlier: false
              }, {
                anomalyScore: 0.0,
                baseline: 0.0,
                unit: 0.0,
                lowerBound: 0.0,
                upperBound: 0.0,
                isOutlier: false,
                outlier: false
              }],
              max: [3099.0, 3100.0],
              min: [3099.0, 3100.0],
              avg: [3099.0, 3100.0],
              count: [1, 1],
              isFilled: [false, false]
            }
          }, {
            metric: {
              name: 'CPUFrequencyMHz_19',
              dimensions: [{
                key: '_sourceHost',
                value: 'us2-tsat-clickhouse-2',
                legend: true
              }, { key: 'Role', value: 'tsat-clickhouse', legend: false }, {
                key: 'metric',
                value: 'CPUFrequencyMHz_19',
                legend: true
              }],
              algoId: 1,
              customLabel: ''
            },
            horAggs: {
              min: 2953.0,
              max: 3100.0,
              avg: 3094.7897727272725,
              sum: 1089366.0,
              count: 352,
              latest: 3098.0
            },
            datapoints: {
              timestamp: [1677148320000, 1677148380000],
              value: [3098.0, 3099.0],
              outlierParams: [{
                anomalyScore: 0.0,
                baseline: 0.0,
                unit: 0.0,
                lowerBound: 0.0,
                upperBound: 0.0,
                isOutlier: false,
                outlier: false
              }, {
                anomalyScore: 0.0,
                baseline: 0.0,
                unit: 0.0,
                lowerBound: 0.0,
                upperBound: 0.0,
                isOutlier: false,
                outlier: false
              }],
              max: [3098.0, 3099.0],
              min: [3098.0, 3099.0],
              count: [1, 1],
              isFilled: [false, false]
            }
          }]
        }],
        queryInfo: {
          startTime: 1677148320000,
          endTime: 1677169920000,
          desiredQuantizationInSecs: { empty: false, defined: true },
          actualQuantizationInSecs: 60,
          sessionIdStr: ''
        }
      };
    };

    it('should map metrics response properly', async () => {
      const mockedFetch = getBackendSrv().fetch as jest.Mock;
      const mockedReplace = getTemplateSrv().replace as jest.Mock;

      mockedFetch.mockReturnValue(of({
        data: queryMockResponse(),
      }));

      const result = await createDataSource().query({
        interval: '6h',
        range: {
          from: new Date(2022, 7, 1, 13, 30, 0, 0), // in real env Moment instance would be passed
          to: new Date(2022, 7, 1, 13, 45, 0, 0), // in real env Moment instance would be passed
        } as unknown as TimeRange,
        maxDataPoints: 100,
        targets: [{
          queryText: 'metric=CPUFrequencyMHz_19',
          refId: 'A',
        }],
        scopedVars: {
          test: 'abc'
        },
      } as unknown as DataQueryRequest<SumoQuery>);

      expect(mockedFetch).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://long-api.sumologic.net/api/v1/metrics/annotated/results',
        credentials: 'include',
        headers: {
          Authorization: 'authorizationHeaderContent',
        },
        data: {
          query: [{
            rowId: 'A',
            query: 'metric=CPUFrequencyMHz_19'
          }],
          startTime: 1659360600000,
          endTime: 1659361500000,
          maxDataPoints: 100,
          requestedDataPoints: 17,
          desiredQuantizationInSec: 21600,
        },
      });

      expect(mockedReplace)
        .toHaveBeenCalledWith(
          'metric=CPUFrequencyMHz_19',
          {
            test: 'abc',
          },
          interpolateVariable
        );
      expect(result.data.length).toEqual(2);
      expect(result.data[0].name).toEqual('CPUFrequencyMHz_19 _sourceHost=us2-tsat-clickhouse-3');
      expect(result.data[1].name).toEqual('CPUFrequencyMHz_19 _sourceHost=us2-tsat-clickhouse-2');
      expect(result.data[0].fields[0].values.toArray()).toEqual([1677148320000, 1677148380000]);
      expect(result.data[0].fields[1].values.toArray()).toEqual([3099.0, 3100.0]);
      expect(result.data[1].fields[0].values.toArray()).toEqual([1677148320000, 1677148380000]);
      expect(result.data[1].fields[1].values.toArray()).toEqual([3098.0, 3099.0]);
    });

    it('should handle metrics error', async() => {
      const mockedFetch = getBackendSrv().fetch as jest.Mock;

      mockedFetch.mockReturnValue(of({
        data: {
          ...queryMockResponse(),
          error: true,
          errorMessage: 'API failed',
          response: [],
        },
      }));

      try {
        await createDataSource().query({
          interval: '6h',
          range: {
            from: new Date(2022, 7, 1, 13, 30, 0, 0), // in real env Moment instance would be passed
            to: new Date(2022, 7, 1, 13, 45, 0, 0), // in real env Moment instance would be passed
          } as unknown as TimeRange,
          maxDataPoints: 100,
          targets: [],
          scopedVars: {},
        } as unknown as DataQueryRequest<SumoQuery>);
      } catch (error: unknown) {
        if (error instanceof Error) {
          expect(error.message).toEqual('API failed');
        } else {
          throw error;
        }
      }
    });

    it('should handle metrics warning', async () => {
      const mockedFetch = getBackendSrv().fetch as jest.Mock;

      mockedFetch.mockReturnValue(of({
        data: {
          ...queryMockResponse(),
          error: true,
          keyedErrors: [{
            key: 'error:code',
            values: {
              type: 'warning',
              rowId: 'A',
            },
          }],
        },
      }));

      const result = await createDataSource().query({
        interval: '6h',
        range: {
          from: new Date(2022, 7, 1, 13, 30, 0, 0), // in real env Moment instance would be passed
          to: new Date(2022, 7, 1, 13, 45, 0, 0), // in real env Moment instance would be passed
        } as unknown as TimeRange,
        maxDataPoints: 100,
        targets: [{
          queryText: 'metric=CPUFrequencyMHz_19',
          refId: 'A',
        }],
        scopedVars: {},
      } as unknown as DataQueryRequest<SumoQuery>);

      expect(result.data[0].meta.notices).toEqual([{
        severity: 'warning',
        text: 'API return warning with code "error:code"',
      }]);
    });

    it('should handle metrics warning for multiple queries', async () => {
      const mockedFetch = getBackendSrv().fetch as jest.Mock;
      // const queryMockResponse();
      const mockResponse = queryMockResponse();
      mockedFetch.mockReturnValue(of({
        data: {
          ...mockResponse,
          error: true,
          keyedErrors: [{
            key: 'error:code',
            values: {
              type: 'warning',
              rowId: 'B',
            },
          }],
          response: [
            mockResponse.response[0],
            {
              rowId: 'B',
              results: [],
            },
          ],
        },
      }));

      const result = await createDataSource().query({
        interval: '6h',
        range: {
          from: new Date(2022, 7, 1, 13, 30, 0, 0), // in real env Moment instance would be passed
          to: new Date(2022, 7, 1, 13, 45, 0, 0), // in real env Moment instance would be passed
        } as unknown as TimeRange,
        maxDataPoints: 100,
        targets: [{
          queryText: 'metric=CPUFrequencyMHz_19',
          refId: 'A',
        }, {
          queryText: '/',
          refId: 'B',
        }],
        scopedVars: {},
      } as unknown as DataQueryRequest<SumoQuery>);
      
      expect(result.data[0].meta.notices).toEqual([]);
      expect(result.data[1].meta.notices).toEqual([]);
      expect(result.data[2].meta.notices).toEqual([{
        severity: 'warning',
        text: 'Row B: API return warning with code "error:code"',
      }]);
    });
  });
});
