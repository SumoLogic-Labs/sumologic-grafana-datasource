///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register(['lodash', 'app/plugins/sdk', './css/query_editor.css!'], function(exports_1) {
    var __extends = (this && this.__extends) || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
    var lodash_1, sdk_1;
    var SumoLogicMetricsQueryCtrl;
    return {
        setters:[
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (sdk_1_1) {
                sdk_1 = sdk_1_1;
            },
            function (_1) {}],
        execute: function() {
            SumoLogicMetricsQueryCtrl = (function (_super) {
                __extends(SumoLogicMetricsQueryCtrl, _super);
                /** @ngInject */
                function SumoLogicMetricsQueryCtrl($scope, $injector, templateSrv) {
                    var _this = this;
                    _super.call(this, $scope, $injector);
                    this.templateSrv = templateSrv;
                    this.defaults = {};
                    console.log("sumo-logic-metrics-datasource - QueryCtrl created.");
                    lodash_1.default.defaultsDeep(this.target, this.defaults);
                    var target = this.target;
                    target.expr = target.expr || '';
                    target.intervalFactor = 1;
                    target.error = null;
                    target.catalogBrowsing = true;
                    target.html = "Htmllll";
                    $scope.$on('typeahead-updated', function () {
                        $scope.$apply(function () {
                        });
                    });
                    // Called from typeahead, so needed this here in order to ensure this ref.
                    this.suggestMetrics = function (query, callback) {
                        var cb;
                        if (callback !== undefined) {
                            _this.savedCallback = callback;
                        }
                        cb = _this.savedCallback;
                        //this.datasource.performSuggestQuery(query)
                        //.then(cb);
                        _this.datasource.callCatalogBrowser(query)
                            .then(cb);
                    };
                    this.showValue = function (query) {
                        console.log(query);
                    };
                    this.makeTable = function (information) {
                        console.log(information);
                        _this.target.html = "<table style=\"width:100%\">\n" +
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
                SumoLogicMetricsQueryCtrl.templateUrl = 'partials/query.editor.html';
                return SumoLogicMetricsQueryCtrl;
            })(sdk_1.QueryCtrl);
            exports_1("default", SumoLogicMetricsQueryCtrl);
        }
    }
});
//# sourceMappingURL=query_ctrl.js.map