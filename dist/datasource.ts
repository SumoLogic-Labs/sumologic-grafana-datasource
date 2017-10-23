///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';
import moment from 'moment';
import * as dateMath from 'app/core/utils/datemath';

const durationSplitRegexp = /(\d+)(ms|s|m|h|d|w|M|y)/;

/** @ngInject */
export default class SumoLogicMetricsDatasource {

  id: number;
  name: string;
  url: string;
  basicAuth: boolean;
  withCredentials: boolean;
  lastErrors: {};
  start: number;
  end: number;
  error: string;
  quantizationDefined: boolean;
  desiredQuantization: number;

  /** @ngInject */
  constructor(instanceSettings, private backendSrv, private templateSrv, private $q) {
    this.id = instanceSettings.id;
    this.name = instanceSettings.name;
    this.url = instanceSettings.url;
    this.basicAuth = instanceSettings.basicAuth;
    this.withCredentials = instanceSettings.withCredentials;
  };

  _request(method, url, data) {
    let options: any = {
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

  interpolateQueryExpr = function (value, variable) {

    // if no multi or include all do not regexEscape. Is this needed?
    if (!variable.multi && !variable.includeAll) {
      return value;
    }

    if (typeof value === 'string') {
      return this.specialRegexEscape(value);
    }

    let escapedValues = _.map(value, this.specialRegexEscape);
    return escapedValues.join('|');
  };

  targetContainsTemplate = function (target) {
    return this.templateSrv.variableExists(target.expr);
  };

  // Called once per panel (graph)
  query(options) {

    let self = this;
    this.start = this.getTime(options.range.from, false);
    this.end = this.getTime(options.range.to, true);


    // This gives us the upper limit of data points to be returned
    // by the Sumo backend and seems to be based on the width in
    // pixels of the panel.
    let maxDataPoints = options.maxDataPoints;

    // Empirically, it seems that we get better looking graphs
    // when requesting some fraction of the indicated width...
    let requestedDataPoints = Math.round(maxDataPoints / 6);

    this.desiredQuantization = this.calculateInterval(options.interval);
    let queries = [];
    let activeTargets = [];

    options = _.clone(options);

    _.each(options.targets, target => {
      if (!target.expr || target.hide) {
        return;
      }

      activeTargets.push(target);

      let query: any = {};
      query.expr = this.templateSrv.replace(target.expr, options.scopedVars, self.interpolateQueryExpr);
      query.requestId = options.panelId + target.refId;
      queries.push(query);
    });

    // No valid targets, return the empty result to save a round trip.
    if (_.isEmpty(queries)) {
      let d = this.$q.defer();
      d.resolve({data: []});
      return d.promise;
    }

    let allQueryPromise = [this.performTimeSeriesQuery(queries, this.start, this.end,
      maxDataPoints, requestedDataPoints, this.desiredQuantization)];

    return this.$q.all(allQueryPromise).then(function (allResponse) {
      let result = [];
      _.each(allResponse, function (response) {
        if (response.status === 'error') {
          // self.lastErrors['query'] = response.error;
          throw response.error;
        } else {
          result = self.transformMetricData(response.data.response);
        }
        // delete self.lastErrors['query'];
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
    let queryList = [];
    for (let i = 0; i < queries.length; i++) {
      queryList.push({
        'query': queries[i].expr,
        'rowId': queries[i].requestId,
      });
    }
    let url = '/api/v1/metrics/annotated/results';
    let data = {
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
    let url = '/api/v1/metrics/suggest/autocomplete';
    let data = {
      query: query,
      pos: query.length,
      queryStartTime: this.start,
      queryEndTime: this.end
    };
    return this._request('POST', url, data).then(function (result) {
      let suggestionsList = [];
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
    let templateVariables = {};
    _.forEach(_.clone(this.templateSrv.variables), function (variable) {
      let name = variable.name;
      let value = variable.current.value;

      // Prepare the an object for this template variable in the map
      // following the same structure as options.scopedVars from
      // this.query() so we can then in the next step simply pass
      // on the map to templateSrv.replace()
      templateVariables[name] = {'selelected': true, 'text': value, 'value': value};
    });

    // Resolve template variables in the query to their current value
    let interpolated;
    try {
      interpolated = this.templateSrv.replace(query, templateVariables, this.interpolateQueryExpr);
    } catch (err) {
      return this.$q.reject(err);
    }

    if (interpolated.startsWith("metaTags|")) {
      let split = interpolated.split("|");
      let parameter = split[1];
      let actualQuery = split[2];

      let url = '/api/v1/metrics/meta/catalog/query';
      let data = '{"query":"' + actualQuery + '", "offset":0, "limit":100000}';
      return this._request('POST', url, data)
        .then(function (result) {
          let metaTagValues = _.map(result.data.results, function (resultEntry) {
            let metaTags = resultEntry.metaTags;
            let metaTagCount = metaTags.length;
            let metaTag = null;
            for (let metaTagIndex = 0; metaTagIndex < metaTagCount; metaTagIndex++) {
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
          return _.uniqBy(metaTagValues, 'text');
        });
    } else if (interpolated.startsWith("metrics|")) {
      let split = interpolated.split("|");
      let actualQuery = split[1];

      let url = '/api/v1/metrics/meta/catalog/query';
      let data = '{"query":"' + actualQuery + '", "offset":0, "limit":100000}';
      return this._request('POST', url, data)
        .then(function (result) {
          let metricNames = _.map(result.data.results, function (resultEntry) {
            let name = resultEntry.name;
            return {
              text: name,
              expandable: true
            };
          });
          return _.uniqBy(metricNames, 'text');
        });
    } else if (interpolated.startsWith("x-tokens|")) {
      let split = interpolated.split("|");
      let actualQuery = split[1];

      let url = '/api/v1/metrics/suggest/autocomplete';
      let data = '{"queryId":"1","query":"' + actualQuery + '","pos":0,"apiVersion":"0.2.0",' +
        '"requestedSectionsAndCounts":{"tokens":1000}}';
      return this._request('POST', url, data)
        .then(function (result) {
          return _.map(result.data.suggestions[0].items, function (suggestion) {
            return {
              text: suggestion.display,
            };
          });
        });
    }

    // Unknown query type - error.
    return this.$q.reject("Unknown metric find query: " + query);
  };

  testDatasource() {
    return this.metricFindQuery('metrics|*').then(function () {
      return {status: 'success', message: 'Data source is working', title: 'Success'};
    });
  };

  calculateInterval(interval) {
    let m = interval.match(durationSplitRegexp);
    let dur = moment.duration(parseInt(m[1]), m[2]);
    let sec = dur.asSeconds();
    if (sec < 1) {
      sec = 1;
    }
    return Math.ceil(sec);
  };

  transformMetricData(responses) {

    let seriesList = [];
    let warning;

    for (let i = 0; i < responses.length; i++) {
      let response = responses[i];

      if (!response.messageType) {
        for (let j = 0; j < response.results.length; j++) {
          let result = response.results[j];

          // Synthesize the "target" - the "metric name" basically.
          let target = "";
          let dimensions = result.metric.dimensions;
          let firstAdded = false;
          for (let k = 0; k < dimensions.length; k++) {
            let dimension = dimensions[k];
            if (dimension.legend === true) {
              if (firstAdded) {
                target += ",";
              }
              target += dimension.key + "=" + dimension.value;
              firstAdded = true;
            }
          }

          // Create Grafana-suitable datapoints.
          let values = result.datapoints.value;
          let timestamps = result.datapoints.timestamp;
          let length = Math.min(values.length, timestamps.length);
          let datapoints = [];
          for (let l = 0; l < length; l++) {
            let value = values[l];
            let valueParsed = parseFloat(value);
            let timestamp = timestamps[l];
            let timestampParsed = parseFloat(timestamp);
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
    let aliasRegex = /\{\{\s*(.+?)\s*\}\}/g;
    return aliasPattern.replace(aliasRegex, function (match, g1) {
      if (aliasData[g1]) {
        return aliasData[g1];
      }
      return g1;
    });
  };

  getOriginalMetricName(labelData) {
    let metricName = labelData.__name__ || '';
    delete labelData.__name__;
    let labelPart = _.map(_.toPairs(labelData), function (label) {
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
