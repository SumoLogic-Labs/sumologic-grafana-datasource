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
                    target.html = "";
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
                        if (!_this.target.catalogBrowsing) {
                            _this.datasource.performSuggestQuery(query)
                                .then(cb);
                        }
                        else {
                            _this.datasource.callCatalogBrowser(query)
                                .then(cb);
                        }
                    };
                    this.showValue = function (query) {
                        console.log(query);
                    };
                    this.updateHtml = function (information) {
                        if (_this.target.catalogBrowsing) {
                            _this.makeTable(information);
                        }
                        else {
                            _this.makeList(information);
                        }
                    };
                    this.makeList = function (information) {
                        _this.target.html = "<ul>";
                        information.suggestions.every(function (suggestion, index) {
                            if (index > 11) {
                                return false;
                            }
                            target.html += "<li><span class='matched'>" + information.query + "</span>" + suggestion.slice(information.query.length) + "</li>";
                            return true;
                        });
                        _this.target.html += "</ul>";
                    };
                    this.makeTable = function (information) {
                        if (information.falseReturn) {
                            return;
                        }
                        _this.target.html = "<div class='keys' style=\"width:100%\"><span class='keysHeader'>Matching Keys: </span>";
                        information.keys.forEach(function (key) {
                            _this.target.html += key + ", ";
                        });
                        _this.target.html += "</div>";
                        if (information.colRows.length === 0) {
                            return;
                        }
                        _this.target.html += "<table style=\"width:100%\"><tr>";
                        var counter = 1;
                        information.colNames.forEach(function (column) {
                            if (counter <= information.specifiedCols) {
                                _this.target.html += "<th class='specified'>" + column + "</th>";
                            }
                            else {
                                _this.target.html += "<th>" + column + "</th>";
                            }
                            counter += 1;
                        });
                        _this.target.html += "</tr>";
                        var rowNum, colNum;
                        for (rowNum = 0; rowNum < information.colRows[0].length; rowNum++) {
                            _this.target.html += "<tr>";
                            for (colNum = 0; colNum < information.colRows.length; colNum++) {
                                var cell = information.colRows[colNum][rowNum] || '';
                                if (colNum < information.specifiedCols) {
                                    _this.target.html += "<td class='specified'>" + cell + "</td>";
                                }
                                else {
                                    _this.target.html += "<td>" + cell + "</td>";
                                }
                            }
                            _this.target.html += "</tr>";
                        }
                        _this.target.html += "</table>";
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