///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';
import {QueryCtrl} from 'app/plugins/sdk';
import './css/query_editor.css!';

export default class SumoLogicMetricsQueryCtrl extends QueryCtrl {
  static templateUrl = 'partials/query.editor.html';

  defaults = {
  };

  suggestMetrics: any;
  savedCallback: any;

  /** @ngInject */
  constructor($scope, $injector, private templateSrv) {
    super($scope, $injector);

    console.log("sumo-logic-metrics-datasource - QueryCtrl created.");

    _.defaultsDeep(this.target, this.defaults);

    var target = this.target;
    target.expr = target.expr || '';
    target.intervalFactor = 1;
    $scope.$on('typeahead-updated', () => {
      $scope.$apply(() => {
      });
    });

    // called from typeahead, so needed this here in order to ensure this ref
    this.suggestMetrics = (query, callback) => {
      var cb;
      if (callback!==undefined){
        this.savedCallback = callback;
      }
      cb = this.savedCallback;
      this.datasource.performSuggestQuery(query)
        .then(cb);
    };
  }
}