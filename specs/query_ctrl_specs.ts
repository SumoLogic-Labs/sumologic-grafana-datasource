import {describe, beforeEach, it, sinon, expect} from './lib/common';
import SumoLogicMetricsQueryCtrl from '../src/query_ctrl';
import TemplateSrvStub from './lib/template_srv_stub';
import Q from 'q';

describe('SumologicQueryCtrl', function() {
  let queryCtrl;

  beforeEach(function() {
    queryCtrl = new SumoLogicMetricsQueryCtrl({
      $on: () => {}
    }, {}, new TemplateSrvStub());
    queryCtrl.datasource = {$q: Q};
  });

  describe('init query_ctrl variables', function() {
    it('defaults should be initialized', function() {
      // Replace with test for defaults that should be set in the query ctrl.
      expect(queryCtrl.target.target).to.be('');
    });
  });
});
