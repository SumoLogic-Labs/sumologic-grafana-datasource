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
    target.html  = "";

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
        if (information.colRows.length===0){
            return;
        }
        this.target.html = "<table style=\"width:100%\"><tr>";
        let counter = 1;
        information.colNames.forEach((column) => {
            if (counter<=information.specifiedCols){
                this.target.html += "<th class='specified'>"+column+"</th>";
            } else if (counter<=information.matchedCols){
                this.target.html += "<th class='matched'>"+column+"</th>";
            } else {
            this.target.html += "<th>" + column + "</th>";
            }
            counter+=1;
        });
        this.target.html += "</tr>";
        let rowNum, colNum;
        for (rowNum = 0; rowNum < information.colRows[0].length; rowNum++) {
            this.target.html += "<tr>";
            for (colNum = 0; colNum < information.colRows.length; colNum++) {
                const cell = information.colRows[colNum][rowNum] || '';
                this.target.html += "<td>" + cell + "</td>";
            }
            this.target.html +=  "</tr>";
        }
        this.target.html += "</table>";
    };


      // Refresh to execute the query, which will update any errors so
    // we can display them.
    this.refresh();
  }
}
