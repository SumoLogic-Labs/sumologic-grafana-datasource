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
  makeList: any;
  updateHtml: any;
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

      if (!this.target.catalogBrowsing) {
          this.datasource.performSuggestQuery(query)
          .then(cb);
      } else {
          this.datasource.callCatalogBrowser(query)
              .then(cb);
      }
    };

    this.showValue = (query) => {
        console.log(query);
    };

    this.updateHtml = (information) => {
        if (this.target.catalogBrowsing){
            this.makeTable(information);
        } else {
            this.makeList(information);
        }
      };

      this.makeList = (information) => {
          this.target.html = "<ul>";
          information.suggestions.every((suggestion, index) => {
              if (index>11) {
                  return false;
              }
              target.html+="<li><span class='matched'>"+information.query+"</span>"+suggestion.slice(information.query.length)+"</li>";
              return true;
          });
          this.target.html += "</ul>";

      };

    this.makeTable = (information) => {
        if (information.falseReturn) {
            return;
        }
        console.log(information);
        this.target.html = "<div class='keys' style=\"width:100%\"><span class='keysHeader'>Matching Keys: </span>";
        this.target.html += information.keys + "</div>";

        if (information.colRows.length===0){ return;}

        this.target.html += "<table style=\"width:100%\"><tr><th class='first'></th>";
        let counter = 1;
        information.colNames.forEach((column) => {
            if (counter<=information.specifiedCols){
                this.target.html += "<th class='specified'>"+column+"</th>";
            } else {
            this.target.html += "<th>" + column + "</th>";
            }
            counter+=1;
        });
        this.target.html += "</tr>";
        let rowNum, colNum;
        for (rowNum = 0; rowNum < information.colRows[0].length; rowNum++) {
            this.target.html += "<tr><td class='first'> M"+(rowNum+1)+" </td>";
            for (colNum = 0; colNum < information.colRows.length; colNum++) {
                const cell = information.colRows[colNum][rowNum] || '';
                if (colNum<information.specifiedCols) {
                    this.target.html += "<td class='specified'>" + cell + "</td>";
                }else {
                    this.target.html += "<td>" + cell + "</td>";
                }
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
