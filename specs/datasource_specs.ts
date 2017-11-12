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
