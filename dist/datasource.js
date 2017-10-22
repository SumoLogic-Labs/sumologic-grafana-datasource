///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register(['lodash', 'moment', 'app/core/utils/datemath'], function(exports_1) {
    var lodash_1, moment_1, dateMath;
    var durationSplitRegexp, SumoLogicMetricsDatasource;
    return {
        setters:[
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (moment_1_1) {
                moment_1 = moment_1_1;
            },
            function (dateMath_1) {
                dateMath = dateMath_1;
            }],
        execute: function() {
            durationSplitRegexp = /(\d+)(ms|s|m|h|d|w|M|y)/;
            /** @ngInject */
            SumoLogicMetricsDatasource = (function () {
                /** @ngInject */
                function SumoLogicMetricsDatasource(instanceSettings, backendSrv, templateSrv, $q) {
                    this.backendSrv = backendSrv;
                    this.templateSrv = templateSrv;
                    this.$q = $q;
                    this.interpolateQueryExpr = function (value, variable) {
                        // if no multi or include all do not regexEscape. Is this needed?
                        if (!variable.multi && !variable.includeAll) {
                            return value;
                        }
                        if (typeof value === 'string') {
                            return this.specialRegexEscape(value);
                        }
                        var escapedValues = lodash_1.default.map(value, this.specialRegexEscape);
                        return escapedValues.join('|');
                    };
                    this.targetContainsTemplate = function (target) {
                        return this.templateSrv.variableExists(target.expr);
                    };
                    this.id = instanceSettings.id;
                    this.name = instanceSettings.name;
                    this.url = instanceSettings.url;
                    this.basicAuth = instanceSettings.basicAuth;
                    this.withCredentials = instanceSettings.withCredentials;
                }
                ;
                SumoLogicMetricsDatasource.prototype._request = function (method, url, data) {
                    var options = {
                        url: this.url + url,
                        method: method,
                        data: data,
                    };
                    if (this.basicAuth || this.withCredentials) {
                        options.withCredentials = true;
                    }
                    if (this.basicAuth) {
                        options.headers = {
                            "Content-Type": "application/json",
                            "Authorization": this.basicAuth,
                        };
                    }
                    return this.backendSrv.datasourceRequest(options);
                };
                ;
                SumoLogicMetricsDatasource.prototype.specialRegexEscape = function (value) {
                    return value.replace(/[\\^$*+?.()|[\]{}]/g, '\\\\$&');
                };
                // Called once per panel (graph)
                SumoLogicMetricsDatasource.prototype.query = function (options) {
                    var _this = this;
                    var self = this;
                    this.start = this.getTime(options.range.from, false);
                    this.end = this.getTime(options.range.to, true);
                    // This gives us the upper limit of data points to be returned
                    // by the Sumo backend and seems to be based on the width in
                    // pixels of the panel.
                    var maxDataPoints = options.maxDataPoints;
                    // Empirically, it seems that we get better looking graphs
                    // when requesting some fraction of the indicated width...
                    var requestedDataPoints = Math.round(maxDataPoints / 6);
                    this.desiredQuantization = this.calculateInterval(options.interval);
                    var queries = [];
                    var activeTargets = [];
                    options = lodash_1.default.clone(options);
                    lodash_1.default.each(options.targets, function (target) {
                        if (!target.expr || target.hide) {
                            return;
                        }
                        activeTargets.push(target);
                        var query = {};
                        query.expr = _this.templateSrv.replace(target.expr, options.scopedVars, self.interpolateQueryExpr);
                        query.requestId = options.panelId + target.refId;
                        queries.push(query);
                    });
                    // No valid targets, return the empty result to save a round trip.
                    if (lodash_1.default.isEmpty(queries)) {
                        var d = this.$q.defer();
                        d.resolve({ data: [] });
                        return d.promise;
                    }
                    var allQueryPromise = [this.performTimeSeriesQuery(queries, this.start, this.end, maxDataPoints, requestedDataPoints, this.desiredQuantization)];
                    return this.$q.all(allQueryPromise).then(function (allResponse) {
                        var result = [];
                        lodash_1.default.each(allResponse, function (response) {
                            if (response.status === 'error') {
                                this.lastErrors.query = response.error;
                                throw response.error;
                            }
                            else {
                                result = self.transformMetricData(response.data.response);
                            }
                            delete this.lastErrors.query;
                            result = self.transformMetricData(response.data.response);
                        });
                        return { data: result };
                    });
                };
                ;
                SumoLogicMetricsDatasource.prototype.performTimeSeriesQuery = function (queries, start, end, maxDataPoints, requestedDataPoints, desiredQuantization) {
                    if (start > end) {
                        throw { message: 'Invalid time range' };
                    }
                    var queryList = [];
                    for (var i = 0; i < queries.length; i++) {
                        queryList.push({
                            'query': queries[i].expr,
                            'rowId': queries[i].requestId,
                        });
                    }
                    var url = '/api/v1/metrics/annotated/results';
                    var data = {
                        'query': queryList,
                        'startTime': start,
                        'endTime': end,
                        'maxDataPoints': maxDataPoints,
                        'requestedDataPoints': requestedDataPoints
                    };
                    if (this.quantizationDefined && desiredQuantization) {
                        data['desiredQuantizationInSecs'] = desiredQuantization;
                    }
                    return this._request('POST', url, data);
                };
                ;
                SumoLogicMetricsDatasource.prototype.performSuggestQuery = function (query) {
                    var url = '/api/v1/metrics/suggest/autocomplete';
                    var data = {
                        query: query,
                        pos: query.length,
                        queryStartTime: this.start,
                        queryEndTime: this.end
                    };
                    return this._request('POST', url, data).then(function (result) {
                        var suggestionsList = [];
                        lodash_1.default.each(result.data.suggestions, function (suggestion) {
                            lodash_1.default.each(suggestion.items, function (item) {
                                suggestionsList.push(item.replacement.text);
                            });
                        });
                        return suggestionsList;
                    });
                };
                ;
                SumoLogicMetricsDatasource.prototype.metricFindQuery = function (query) {
                    // Bail out immediately if the caller didn't specify a query.
                    if (!query) {
                        return this.$q.when([]);
                    }
                    // With the help of templateSrv, we are going to first of figure
                    // out the current values of all template variables.
                    var templateVariables = {};
                    lodash_1.default.forEach(lodash_1.default.clone(this.templateSrv.variables), function (variable) {
                        var name = variable.name;
                        var value = variable.current.value;
                        // Prepare the an object for this template variable in the map
                        // following the same structure as options.scopedVars from
                        // this.query() so we can then in the next step simply pass
                        // on the map to templateSrv.replace()
                        templateVariables[name] = { 'selelected': true, 'text': value, 'value': value };
                    });
                    // Resolve template variables in the query to their current value
                    var interpolated;
                    try {
                        interpolated = this.templateSrv.replace(query, templateVariables, this.interpolateQueryExpr);
                    }
                    catch (err) {
                        return this.$q.reject(err);
                    }
                    if (interpolated.startsWith("metaTags|")) {
                        var split = interpolated.split("|");
                        var parameter = split[1];
                        var actualQuery = split[2];
                        var url = '/api/v1/metrics/meta/catalog/query';
                        var data = '{"query":"' + actualQuery + '", "offset":0, "limit":100000}';
                        return this._request('POST', url, data)
                            .then(function (result) {
                            var metaTagValues = lodash_1.default.map(result.data.results, function (resultEntry) {
                                var metaTags = resultEntry.metaTags;
                                var metaTagCount = metaTags.length;
                                var metaTag = null;
                                for (var metaTagIndex = 0; metaTagIndex < metaTagCount; metaTagIndex++) {
                                    metaTag = metaTags[metaTagIndex];
                                    if (metaTag.key === parameter) {
                                        break;
                                    }
                                }
                                return {
                                    text: metaTag.value,
                                    expandable: true
                                };
                            });
                            return lodash_1.default.uniqBy(metaTagValues, 'text');
                        });
                    }
                    else if (interpolated.startsWith("metrics|")) {
                        var split = interpolated.split("|");
                        var actualQuery = split[1];
                        var url = '/api/v1/metrics/meta/catalog/query';
                        var data = '{"query":"' + actualQuery + '", "offset":0, "limit":100000}';
                        return this._request('POST', url, data)
                            .then(function (result) {
                            var metricNames = lodash_1.default.map(result.data.results, function (resultEntry) {
                                var name = resultEntry.name;
                                return {
                                    text: name,
                                    expandable: true
                                };
                            });
                            return lodash_1.default.uniqBy(metricNames, 'text');
                        });
                    }
                    else if (interpolated.startsWith("x-tokens|")) {
                        var split = interpolated.split("|");
                        var actualQuery = split[1];
                        var url = '/api/v1/metrics/suggest/autocomplete';
                        var data = '{"queryId":"1","query":"' + actualQuery + '","pos":0,"apiVersion":"0.2.0",' +
                            '"requestedSectionsAndCounts":{"tokens":1000}}';
                        return this._request('POST', url, data)
                            .then(function (result) {
                            return lodash_1.default.map(result.data.suggestions[0].items, function (suggestion) {
                                return {
                                    text: suggestion.display,
                                };
                            });
                        });
                    }
                    // Unknown query type - error.
                    return this.$q.reject("Unknown metric find query: " + query);
                };
                ;
                SumoLogicMetricsDatasource.prototype.testDatasource = function () {
                    return this.metricFindQuery('metrics(.*)').then(function () {
                        return { status: 'success', message: 'Data source is working', title: 'Success' };
                    });
                };
                ;
                SumoLogicMetricsDatasource.prototype.calculateInterval = function (interval) {
                    var m = interval.match(durationSplitRegexp);
                    var dur = moment_1.default.duration(parseInt(m[1]), m[2]);
                    var sec = dur.asSeconds();
                    if (sec < 1) {
                        sec = 1;
                    }
                    return Math.ceil(sec);
                };
                ;
                SumoLogicMetricsDatasource.prototype.transformMetricData = function (responses) {
                    var seriesList = [];
                    var warning;
                    for (var i = 0; i < responses.length; i++) {
                        var response = responses[i];
                        if (!response.messageType) {
                            for (var j = 0; j < response.results.length; j++) {
                                var result = response.results[j];
                                // Synthesize the "target" - the "metric name" basically.
                                var target = "";
                                var dimensions = result.metric.dimensions;
                                var firstAdded = false;
                                for (var k = 0; k < dimensions.length; k++) {
                                    var dimension = dimensions[k];
                                    if (dimension.legend === true) {
                                        if (firstAdded) {
                                            target += ",";
                                        }
                                        target += dimension.key + "=" + dimension.value;
                                        firstAdded = true;
                                    }
                                }
                                // Create Grafana-suitable datapoints.
                                var values = result.datapoints.value;
                                var timestamps = result.datapoints.timestamp;
                                var length_1 = Math.min(values.length, timestamps.length);
                                var datapoints = [];
                                for (var l = 0; l < length_1; l++) {
                                    var value = values[l];
                                    var valueParsed = parseFloat(value);
                                    var timestamp = timestamps[l];
                                    var timestampParsed = parseFloat(timestamp);
                                    datapoints.push([valueParsed, timestampParsed]);
                                }
                                // Add the series.
                                seriesList.push({ target: target, datapoints: datapoints });
                            }
                        }
                        else {
                            warning = "Warning: " + response.message;
                        }
                    }
                    if (warning) {
                        this.error = warning;
                    }
                    return seriesList;
                };
                ;
                SumoLogicMetricsDatasource.prototype.renderTemplate = function (aliasPattern, aliasData) {
                    var aliasRegex = /\{\{\s*(.+?)\s*\}\}/g;
                    return aliasPattern.replace(aliasRegex, function (match, g1) {
                        if (aliasData[g1]) {
                            return aliasData[g1];
                        }
                        return g1;
                    });
                };
                ;
                SumoLogicMetricsDatasource.prototype.getOriginalMetricName = function (labelData) {
                    var metricName = labelData.__name__ || '';
                    delete labelData.__name__;
                    var labelPart = lodash_1.default.map(lodash_1.default.toPairs(labelData), function (label) {
                        return label[0] + '="' + label[1] + '"';
                    }).join(',');
                    return metricName + '{' + labelPart + '}';
                };
                ;
                SumoLogicMetricsDatasource.prototype.getTime = function (date, roundUp) {
                    if (lodash_1.default.isString(date)) {
                        date = dateMath.parse(date, roundUp);
                    }
                    return Math.ceil(date.valueOf());
                };
                ;
                SumoLogicMetricsDatasource.prototype.changeQuantization = function () {
                    this.quantizationDefined = true;
                };
                ;
                SumoLogicMetricsDatasource.prototype.clearError = function () {
                    this.error = "";
                };
                ;
                return SumoLogicMetricsDatasource;
            })();
            exports_1("default", SumoLogicMetricsDatasource);
        }
    }
});
//# sourceMappingURL=datasource.js.map