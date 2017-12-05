///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

export default class SumoLogicMetricsConfigCtrl {
  static templateUrl = 'partials/config.html';
  current: any;

  constructor($scope) {
    console.log("sumo-logic-metrics-datasource - ConfigCtrl created.");
  }
}
