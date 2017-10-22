System.register(['./datasource', './config_ctrl', './query_ctrl', './query_options_ctrl'], function(exports_1) {
    var datasource_1, config_ctrl_1, query_ctrl_1, query_options_ctrl_1;
    return {
        setters:[
            function (datasource_1_1) {
                datasource_1 = datasource_1_1;
            },
            function (config_ctrl_1_1) {
                config_ctrl_1 = config_ctrl_1_1;
            },
            function (query_ctrl_1_1) {
                query_ctrl_1 = query_ctrl_1_1;
            },
            function (query_options_ctrl_1_1) {
                query_options_ctrl_1 = query_options_ctrl_1_1;
            }],
        execute: function() {
            exports_1("Datasource", datasource_1.default);
            exports_1("ConfigCtrl", config_ctrl_1.SumoLogicMetricsConfigCtrl);
            exports_1("QueryCtrl", query_ctrl_1.SumoLogicMetricsQueryCtrl);
            exports_1("QueryOptionsCtrl", query_options_ctrl_1.SumoLogicMetricsQueryOptionsCtrl);
        }
    }
});
//# sourceMappingURL=module.js.map