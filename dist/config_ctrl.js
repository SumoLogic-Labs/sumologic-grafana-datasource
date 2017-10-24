///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register([], function(exports_1) {
    var SumoLogicMetricsConfigCtrl;
    return {
        setters:[],
        execute: function() {
            SumoLogicMetricsConfigCtrl = (function () {
                function SumoLogicMetricsConfigCtrl($scope) {
                    console.log("sumo-logic-metrics-datasource - ConfigCtrl created.");
                }
                SumoLogicMetricsConfigCtrl.templateUrl = 'partials/config.html';
                return SumoLogicMetricsConfigCtrl;
            })();
            exports_1("default", SumoLogicMetricsConfigCtrl);
        }
    }
});
//# sourceMappingURL=config_ctrl.js.map