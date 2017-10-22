///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';
import moment from 'moment';
import * as dateMath from 'app/core/utils/datemath';

var durationSplitRegexp = /(\d+)(ms|s|m|h|d|w|M|y)/;

/** @ngInject */
export default class SumoLogicMetricsDatasource {

  type: string;
  name: string;
  id: number;
  supportMetrics: boolean;
  url: string;
  directUrl: string;
  basicAuth: boolean;
  withCredentials: boolean;
  lastErrors: {};
  start: number;
  end: number;
  error: string;
  quantizationDefined: boolean;
  desiredQuantization: number;
  currentTemplateVars: {};

  /** @ngInject */
  constructor(instanceSettings, private backendSrv, private templateSrv, private $q, private timeSrv) {
    this.type = 'sumo-logic-metrics';
    this.name = instanceSettings.name;
    this.id = instanceSettings.id;
    this.supportMetrics = true;
    this.url = instanceSettings.url;
    this.directUrl = instanceSettings.directUrl;
    this.basicAuth = instanceSettings.basicAuth;
    this.withCredentials = instanceSettings.withCredentials;
  };

  _request(method, url, data) {
    var options: any = {
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

  specialRegexEscape(value) {
    return value.replace(/[\\^$*+?.()|[\]{}]/g, '\\\\$&');
  }

  interpolateQueryExpr = function (value, variable, defaultFormatFn) {

    // if no multi or include all do not regexEscape. Is this needed?
    if (!variable.multi && !variable.includeAll) {
      return value;
    }

    if (typeof value === 'string') {
      return this.specialRegexEscape(value);
    }

    var escapedValues = _.map(value, this.specialRegexEscape);
    return escapedValues.join('|');
  };

  targetContainsTemplate = function (target) {
    return this.templateSrv.variableExists(target.expr);
  };

  // Called once per panel (graph)
  query(options) {

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

    options = _.clone(options);

    _.each(options.targets, target => {
      if (!target.expr || target.hide) {
        return;
      }

      activeTargets.push(target);

      var query: any = {};
      query.expr = this.templateSrv.replace(target.expr, options.scopedVars, self.interpolateQueryExpr);
      query.requestId = options.panelId + target.refId;
      queries.push(query);
    });

    // No valid targets, return the empty result to save a round trip.
    if (_.isEmpty(queries)) {
      var d = this.$q.defer();
      d.resolve({data: []});
      return d.promise;
    }

    var allQueryPromise = [this.performTimeSeriesQuery(queries, this.start, this.end,
      maxDataPoints, requestedDataPoints, this.desiredQuantization)];

    return this.$q.all(allQueryPromise).then(function (allResponse) {
      var result = [];
      _.each(allResponse, function (response, index) {
        if (response.status === 'error') {
          this.lastErrors.query = response.error;
          throw response.error;
        } else {
          result = self.transformMetricData(response.data.response);
        }
        delete this.lastErrors.query;
        result = self.transformMetricData(response.data.response);
      });

      return {data: result};
    });
  };

  performTimeSeriesQuery(queries, start, end, maxDataPoints,
                         requestedDataPoints, desiredQuantization) {
    if (start > end) {
      throw {message: 'Invalid time range'};
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

  performSuggestQuery(query) {
    var url = '/api/v1/metrics/suggest/autocomplete';
    var data = {
      query: query,
      pos: query.length,
      queryStartTime: this.start,
      queryEndTime: this.end
    };
    return this._request('POST', url, data).then(function (result) {
      var suggestionsList = [];
      _.each(result.data.suggestions, function (suggestion) {
        _.each(suggestion.items, function (item) {
          suggestionsList.push(item.replacement.text);
        });
      });
      return suggestionsList;
    });
  };

  metricFindQuery(query) {

    // Bail out immediately if the caller didn't specify a query.
    if (!query) {
      return this.$q.when([]);
    }

    // With the help of templateSrv, we are going to first of figure
    // out the current values of all template variables.
    var templateVariables = {};
    _.forEach(_.clone(this.templateSrv.variables), function (variable) {
      var name = variable.name;
      var value = variable.current.value;

      // Prepare the an object for this template variable in the map
      // following the same structure as options.scopedVars from
      // this.query() so we can then in the next step simply pass
      // on the map to templateSrv.replace()
      templateVariables[name] = {'selelected': true, 'text': value, 'value': value};
    });

    // Resolve template variables in the query to their current value
    var interpolated;
    try {
      interpolated = this.templateSrv.replace(query, templateVariables, this.interpolateQueryExpr);
    } catch (err) {
      return this.$q.reject(err);
    }

    if (interpolated.startsWith("metaTags|")) {
      var split = interpolated.split("|");
      var type = split[0];
      var parameter = split[1];
      var actualQuery = split[2];

      var url = '/api/v1/metrics/meta/catalog/query';
      var data = '{"query":"' + actualQuery + '", "offset":0, "limit":100000}';
      return this._request('POST', url, data)
        .then(function (result) {
          var metaTagValues = _.map(result.data.results, function (resultEntry) {
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
          var resultToReturn = _.uniqBy(metaTagValues, 'text');
          return resultToReturn;
        });
    } else if (interpolated.startsWith("metrics|")) {
      var split = interpolated.split("|");
      var actualQuery = split[1];

      var url = '/api/v1/metrics/meta/catalog/query';
      var data = '{"query":"' + actualQuery + '", "offset":0, "limit":100000}';
      return this._request('POST', url, data)
        .then(function (result) {
          var metricNames = _.map(result.data.results, function (resultEntry) {
            var name = resultEntry.name;
            return {
              text: name,
              expandable: true
            };
          });
          var resultToReturn = _.uniqBy(metricNames, 'text');
          return resultToReturn;
        });
    } else if (interpolated.startsWith("x-tokens|")) {
      var split = interpolated.split("|");
      var type = split[0];
      var actualQuery = split[1];

      var url = '/api/v1/metrics/suggest/autocomplete';
      var data = '{"queryId":"1","query":"' + actualQuery + '","pos":0,"apiVersion":"0.2.0",' +
        '"requestedSectionsAndCounts":{"tokens":1000}}';
      return this._request('POST', url, data)
        .then(function (result) {
          var tokens = _.map(result.data.suggestions[0].items, function (suggestion) {
            return {
              text: suggestion.display,
            };
          });
          return tokens;
        });
    }

    // Unknown query type - error.
    return this.$q.reject("Unknown metric find query: " + query);
  };

  testDatasource() {
    return this.metricFindQuery('metrics(.*)').then(function () {
      return {status: 'success', message: 'Data source is working', title: 'Success'};
    });
  };

  calculateInterval(interval) {
    var m = interval.match(durationSplitRegexp);
    var dur = moment.duration(parseInt(m[1]), m[2]);
    var sec = dur.asSeconds();
    if (sec < 1) {
      sec = 1;
    }
    return Math.ceil(sec);
  };

  transformMetricData(responses) {

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
          var length = Math.min(values.length, timestamps.length);
          var datapoints = [];
          for (var l = 0; l < length; l++) {
            var value = values[l];
            var valueParsed = parseFloat(value);
            var timestamp = timestamps[l];
            var timestampParsed = parseFloat(timestamp);
            datapoints.push([valueParsed, timestampParsed]);
          }

          // Add the series.
          seriesList.push({target: target, datapoints: datapoints});
        }
      } else {
        warning = "Warning: " + response.message;
      }
    }
    if (warning) {
      this.error = warning;
    }

    return seriesList;
  };

  renderTemplate(aliasPattern, aliasData) {
    var aliasRegex = /\{\{\s*(.+?)\s*\}\}/g;
    return aliasPattern.replace(aliasRegex, function (match, g1) {
      if (aliasData[g1]) {
        return aliasData[g1];
      }
      return g1;
    });
  };

  getOriginalMetricName(labelData) {
    var metricName = labelData.__name__ || '';
    delete labelData.__name__;
    var labelPart = _.map(_.toPairs(labelData), function (label) {
      return label[0] + '="' + label[1] + '"';
    }).join(',');
    return metricName + '{' + labelPart + '}';
  };

  getTime(date, roundUp) {
    if (_.isString(date)) {
      date = dateMath.parse(date, roundUp);
    }
    return Math.ceil(date.valueOf());
  };

  changeQuantization() {
    this.quantizationDefined = true;
  };

  clearError() {
    this.error = "";
  };
}