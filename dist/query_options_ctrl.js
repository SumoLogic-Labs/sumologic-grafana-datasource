///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register([], function(exports_1) {
    var SumoLogicMetricsQueryOptionsCtrl;
    return {
        setters:[],
        execute: function() {
            SumoLogicMetricsQueryOptionsCtrl = (function () {
                function SumoLogicMetricsQueryOptionsCtrl($scope) {
                    console.log("sumo-logic-metrics-datasource - QueryOptionsCtrl created.");
                }
                SumoLogicMetricsQueryOptionsCtrl.templateUrl = 'partials/query.options.html';
                return SumoLogicMetricsQueryOptionsCtrl;
            })();
            exports_1("default", SumoLogicMetricsQueryOptionsCtrl);
        }
    }
});
//# sourceMappingURL=query_options_ctrl.js.map