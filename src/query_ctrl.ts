///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';
import {QueryCtrl} from 'app/plugins/sdk';
import './css/query_editor.css!';

export default class SumoLogicMetricsQueryCtrl extends QueryCtrl {
  static templateUrl = 'partials/query.editor.html';

  defaults = {};

  suggestMetrics: any;
  showValue: any;
  makeTable: any;
  savedCallback: any;
  html: string;

  /** @ngInject */
  constructor($scope, $injector, private templateSrv) {
    super($scope, $injector);

    console.log("sumo-logic-metrics-datasource - QueryCtrl created.");

    _.defaultsDeep(this.target, this.defaults);

    var target = this.target;
    target.expr = target.expr || '';
    target.intervalFactor = 1;
    target.error = null;
    target.catalogBrowsing = true;
    target.html  = "Htmllll";

    $scope.$on('typeahead-updated', () => {
      $scope.$apply(() => {
      });
    });

    // Called from typeahead, so needed this here in order to ensure this ref.
    this.suggestMetrics = (query, callback) => {
      var cb;
      if (callback !== undefined) {
        this.savedCallback = callback;
      }
      cb = this.savedCallback;
      //this.datasource.performSuggestQuery(query)
        //.then(cb);
      this.datasource.callCatalogBrowser(query)
          .then(cb);
    };

    this.showValue = (query) => {
        console.log(query);
    };

    this.makeTable = (information) => {
        console.log(information);
        this.target.html =  "<table style=\"width:100%\">\n" +
            "  <tr>\n" +
            "    <th>Firstname</th>\n" +
            "    <th>Lastname</th> \n" +
            "    <th>Age</th>\n" +
            "  </tr>\n" +
            "  <tr>\n" +
            "    <td>Jill</td>\n" +
            "    <td>Smith</td> \n" +
            "    <td>50</td>\n" +
            "  </tr>\n" +
            "  <tr>\n" +
            "    <td>Eve</td>\n" +
            "    <td>Jackson</td> \n" +
            "    <td>94</td>\n" +
            "  </tr>\n" +
            "</table>";
    };


      // Refresh to execute the query, which will update any errors so
    // we can display them.
    this.refresh();
  }
}
