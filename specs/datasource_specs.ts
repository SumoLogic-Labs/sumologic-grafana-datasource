import {describe, beforeEach, it, sinon, expect, angularMocks} from './lib/common';
import SumologicDatasource from '../src/datasource';
import TemplateSrvStub from './lib/template_srv_stub';
import Q from 'q';
import moment from 'moment';

describe('SumologicDatasource', function() {
  let ctx: any = {
    backendSrv: {},
    templateSrv: new TemplateSrvStub()
  };

  beforeEach(function() {
    ctx.$q = Q;
    ctx.instanceSettings = {};

    ctx.ds = new SumologicDatasource(ctx.instanceSettings, ctx.backendSrv, ctx.templateSrv, ctx.$q);
  });

  describe('When performing testDatasource', function() {
    describe('and an error is returned', function() {
      const errorData = {
        data: {
          error: {
            code: 'Error Code',
            message: `An error message.`
          }
        },
        status: 400,
        statusText: 'Bad Request'
      };

      beforeEach(function() {
        ctx.backendSrv.datasourceRequest = function(options) {
          return ctx.$q.reject(errorData);
        };
      });

      it('should return error status and a detailed error message', function () {
        return ctx.ds.testDatasource().catch(function (results) {
          expect(results.data.error.code).to.equal(errorData.data.error.code);
          expect(results.data.error.message).to.equal(errorData.data.error.message);
        });
      });
    });

    describe('and the response works', function() {
      const response = {
        data: {
        },
        status: 200,
        statusText: 'OK'
      };

      beforeEach(function() {
        ctx.backendSrv.datasourceRequest = function(options) {
          return ctx.$q.when({data: response, status: 200});
        };
      });

      it('should return success status', function() {
        return ctx.ds.testDatasource().then(function(results) {
          expect(results.status).to.equal('success');
        });
      });
    });
  });

  describe('transform the sumo results into grafana consumable results correctly', function () {
    let metricsResponse = {
      "response": [
        {
          rowId: "1A",
          results: [
            {
              metric: {
                name: "",
                dimensions: [
                  {
                    key: "metric",
                    value: "sum(Mem_Used)",
                    legend: true
                  }
                ],
                algoId: 1,
                customLabel: ""
              },
              datapoints: {
                timestamp: [
                  1502755200000,
                  1502841600000,
                  1502928000000,
                  1503014400000
                ],
                value: [
                  9.464266168519951E10,
                  8.237131403306667E10,
                  8.067944976113092E10,
                  8.82104353912889E10
                ],
                outlierParams: [],
                max: null,
                min: null,
                avg: null,
                count: null,
                isFilled: [
                  false,
                  false,
                  false,
                  false
                ]
              }
            }
          ]
        }
      ],
      queryInfo: {
        startTime: 1502737914240,
        endTime: 1510513914240,
        desiredQuantizationInSecs: {
          empty: true,
          defined: false
        },
        actualQuantizationInSecs: 86400
      }
    };

    let options = {
      targets: [{
        expr: "_contentType=HostMetrics _sourceHost=$cluster-* metric=CPU_LoadAvg_1min | avg"
      }],
      range: {
        from: 1502738508591,
        to: 1510514508591
      },
      interval: '1s',
      maxDataPoints: 716,
      requestedDataPoints: 119
    };

    let expectedDataPointsAfterTransformation = [
      [
        94642661685.19951,
        1502755200000
      ],
      [
        82371314033.06667,
        1502841600000
      ],
      [
        80679449761.13092,
        1502928000000
      ],
      [
        88210435391.2889,
        1503014400000
      ]
    ];

    beforeEach(function () {
      ctx.backendSrv.datasourceRequest = function (options) {
        return ctx.$q.when({data: metricsResponse, status: 200});
      };
    });

    it('when asked for dimensions', function () {
      return ctx.ds.query(options).then(function (results) {
        expect(results.data[0].target).to.equal('metric=sum(Mem_Used)');
        expect(results.data[0].datapoints).to.eql(expectedDataPointsAfterTransformation);
      });
    });
  });

  describe('When doing interval calculation', function () {
    it('return correct intervals', function () {
      expect(ctx.ds.calculateInterval('1m')).to.equal(60);
      expect(ctx.ds.calculateInterval('1h')).to.equal(3600);
      expect(ctx.ds.calculateInterval('0s')).to.equal(1);
      expect(ctx.ds.calculateInterval('2s')).to.equal(2);
      expect(ctx.ds.calculateInterval('1s')).to.equal(1);
    });
  });
});
