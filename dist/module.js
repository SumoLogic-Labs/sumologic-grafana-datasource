System.register(['./datasource', './query_ctrl'], function(exports_1) {
    var datasource_1, query_ctrl_1;
    var SumoLogicMetricsConfigCtrl;
    return {
        setters:[
            function (datasource_1_1) {
                datasource_1 = datasource_1_1;
            },
            function (query_ctrl_1_1) {
                query_ctrl_1 = query_ctrl_1_1;
            }],
        execute: function() {
            SumoLogicMetricsConfigCtrl = (function () {
                function SumoLogicMetricsConfigCtrl() {
                }
                SumoLogicMetricsConfigCtrl.templateUrl = 'partials/config.html';
                return SumoLogicMetricsConfigCtrl;
            })();
            exports_1("Datasource", datasource_1.default);
            exports_1("ConfigCtrl", SumoLogicMetricsConfigCtrl);
            exports_1("QueryCtrl", query_ctrl_1.default);
        }
    }
});
//# sourceMappingURL=module.js.map