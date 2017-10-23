///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import _ from 'lodash';
import moment from 'moment';
import * as dateMath from 'app/core/utils/datemath';

const durationSplitRegexp = /(\d+)(ms|s|m|h|d|w|M|y)/;

// Things we still need to do:
// - Fully understand the code; it looks like there are still leftovers
//   from the Prometheus data source plugin in this code.
// - Decide on the final "DSL" for template variable queries in
//   metricFindQuery() and see if the autocomplete endpoint can do this
//   more efficiently.
// - start/end really shouldn't be instance fields on the data source
//   object but it is not clear how else to have a time range handy
//   for performSuggestQuery.
// - quantizationDefined is wonky and shouldn't be an instance field
//   either.
// - How to support alerting?
// - How to support annotations?


/** @ngInject */
export default class SumoLogicMetricsDatasource {

  url: string;
  basicAuth: boolean;
  start: number;
  end: number;
  error: string;
  quantizationDefined: boolean;

  /** @ngInject */
  constructor(instanceSettings, private backendSrv, private templateSrv, private $q) {
    this.url = instanceSettings.url;
    this.basicAuth = instanceSettings.basicAuth;
    console.log("Creating sumo-logic-metrics-datasource.");
  }

  // Main API.

  // Called by Grafana to, well, test a datasource. Invoked
  // during Save & Test on a Datasource editor screen.
  testDatasource() {
    return this.metricFindQuery('metrics|*').then(() => {
      return {status: 'success', message: 'Data source is working', title: 'Success'};
    });
  }

  // Called by Grafana to find values for template variables.
  metricFindQuery(query) {

    // Bail out immediately if the caller didn't specify a query.
    if (!query) {
      return this.$q.when([]);
    }

    // With the help of templateSrv, we are going to first of all figure
    // out the current values of all template variables.
    let templateVariables = {};
    _.forEach(_.clone(this.templateSrv.variables), (variable) => {
      let name = variable.name;
      let value = variable.current.value;

      // Prepare the an object for this template variable in the map
      // following the same structure as options.scopedVars from
      // this.query() so we can then in the next step simply pass
      // on the map to templateSrv.replace().
      templateVariables[name] = {'selelected': true, 'text': value, 'value': value};
    });

    // Resolve template variables in the query to their current value.
    let interpolated;
    try {
      interpolated = this.templateSrv.replace(query, templateVariables);
    } catch (err) {
      return this.$q.reject(err);
    }

    // The catalog query API returns many duplicate results and this
    // could be a problem. Maybe figure out how to do the same thing
    // with the autocomplete API?
    if (interpolated.startsWith("metaTags|")) {
      let split = interpolated.split("|");
      let parameter = split[1];
      let actualQuery = split[2];

      let url = '/api/v1/metrics/meta/catalog/query';
      let data = '{"query":"' + actualQuery + '", "offset":0, "limit":100000}';
      return this.doRequest('POST', url, data)
        .then((result) => {
          let metaTagValues = _.map(result.data.results, (resultEntry) => {
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
      return this.doRequest('POST', url, data)
        .then((result) => {
          let metricNames = _.map(result.data.results, (resultEntry) => {
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
      return this.doRequest('POST', url, data)
        .then((result) => {
          return _.map(result.data.suggestions[0].items, (suggestion) => {
            return {
              text: suggestion.display,
            };
          });
        });
    }

    // Unknown query type - error.
    return this.$q.reject("Unknown metric find query: " + query);
  }

  // Called by Grafana to execute a metrics query.
  query(options) {

    let self = this;

    // Get the start and end time for the query. Remember the values so
    // we can reuse them during performSuggestQuery, where we will also
    // need a time range.
    this.start = options.range.from.valueOf();
    this.end = options.range.to.valueOf();

    // This gives us the upper limit of data points to be returned
    // by the Sumo backend and seems to be based on the width in
    // pixels of the panel.
    let maxDataPoints = options.maxDataPoints;

    // Empirically, it seems that we get better looking graphs
    // when requesting some fraction of the indicated width...
    let requestedDataPoints = Math.round(maxDataPoints / 6);

    // Figure out the desired quantization.
    let desiredQuantization = this.calculateInterval(options.interval);

    let queries = [];
    let activeTargets = [];

    _.each(options.targets, target => {
      if (!target.expr || target.hide) {
        return;
      }
      activeTargets.push(target);
      let query: any = {};
      query.expr = this.templateSrv.replace(target.expr, options.scopedVars);
      query.requestId = options.panelId + target.refId;
      queries.push(query);
    });

    // If there's no valid targets, return the empty result to
    // save a round trip.
    if (_.isEmpty(queries)) {
      let d = this.$q.defer();
      d.resolve({data: []});
      return d.promise;
    }

    // Set up the promises.
    let allQueryPromise = [
      this.doMetricsQuery(
        queries,
        this.start,
        this.end,
        maxDataPoints,
        requestedDataPoints,
        desiredQuantization)];

    // Execute the queries and collect all the results.
    return this.$q.all(allQueryPromise).then((allResponse) => {
      let result = [];
      _.each(allResponse, (response) => {
        if (response.status === 'error') {
          throw response.error;
        } else {
          result = self.transformMetricData(response.data.response);
        }
        result = self.transformMetricData(response.data.response);
      });

      // Return the results.
      return {data: result};
    });
  }

  performSuggestQuery(query) {
    let url = '/api/v1/metrics/suggest/autocomplete';
    let data = {
      query: query,
      pos: query.length,
      queryStartTime: this.start,
      queryEndTime: this.end
    };
    return this.doRequest('POST', url, data).then((result) => {
      let suggestionsList = [];
      _.each(result.data.suggestions, (suggestion) => {
        _.each(suggestion.items, (item) => {
          suggestionsList.push(item.replacement.text);
        });
      });
      return suggestionsList;
    });
  }

  // Helper methods.

  doMetricsQuery(queries, start, end, maxDataPoints,
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
    return this.doRequest('POST', url, data);
  }

  doRequest(method, url, data) {
    let options: any = {
      url: this.url + url,
      method: method,
      data: data,
      withCredentials: this.basicAuth,
      headers: {
        "Content-Type": "application/json",
        "Authorization": this.basicAuth,
      }
    };
    return this.backendSrv.datasourceRequest(options);
  }

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
  }

  targetContainsTemplate(target) {
    return this.templateSrv.variableExists(target.expr);
  }

  calculateInterval(interval) {
    let m = interval.match(durationSplitRegexp);
    let dur = moment.duration(parseInt(m[1]), m[2]);
    let sec = dur.asSeconds();
    if (sec < 1) {
      sec = 1;
    }
    return Math.ceil(sec);
  };

  changeQuantization() {
    this.quantizationDefined = true;
  };
}
