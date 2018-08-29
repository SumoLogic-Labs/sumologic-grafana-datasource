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
  basicAuth: any;
  withCredentials: any;
  start: number;
  end: number;
  error: string;
  quantizationDefined: boolean;

  /** @ngInject */
  constructor(instanceSettings, private backendSrv, private templateSrv, private $q) {
    this.url = instanceSettings.url;
    this.basicAuth = instanceSettings.basicAuth;
    this.withCredentials = instanceSettings.withCredentials;
    console.log("sumo-logic-metrics-datasource - Datasource created.");
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
    _.forEach(_.clone(this.templateSrv.variables), variable => {
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

    if (interpolated.startsWith("values|")) {
      return this.getValuesFromAutocomplete(interpolated);
    }

    // Unknown query type - error.
    return this.$q.reject("Unknown metric find query: " + query);
  }

  getValuesFromAutocomplete(interpolatedQuery) {
    let split = interpolatedQuery.split("|");

    // The metatag whose values we want to enumerate.
    let key = split[1];

    // The query to constrain the result - a metrics selector.
    let metricsSelector = split[2];

    // PLEASE NOTE THAT THIS IS USING AN UNOFFICIAL API AND IN
    // GENERAL EXPERIMENTAL - BUT IT IS BETTER THAN NOTHING AND
    // IT DOES IN FACT WORK. WE WILL UPDATE TEMPLATE VARIABLE
    // QUERY FUNCTIONALITY ONCE AN OFFICIAL PUBLIC API IS OUT.
    //
    // Returns the values for the key specified as the parameter
    // given the metrics selector given in query. This is a much
    // more efficient way to get the value for a key than the
    // method used in getAvailableMetaTags() which might return
    // a lot of duplicated data.

    // a hack to get current time range; see: https://github.com/grafana/grafana/issues/1909
    let timeRange = (<any>window).angular.element('grafana-app').injector().get('timeSrv').timeRange();

    let startTime = this.start || new Date(timeRange.from).getTime();
    let endTime = this.end || new Date(timeRange.to).getTime();

    let urlParams = [];
    urlParams.push("beginTimestamp=" + startTime);
    urlParams.push("endTimestamp=" + endTime);
    urlParams.push("filters=" + encodeURIComponent(metricsSelector));

    let url = "/api/v1alpha/metadataCatalog/keys/" + encodeURIComponent(key) + "/values?" + urlParams.join("&");
    return this._sumoLogicRequest('GET', url, null)
      .then(result => {
        if (result.data.data.length < 1) {
          return [];
        }
        return _.map(result.data.data, valueAndCount => {
          return {
            text: valueAndCount.value,
          };
        });
      });
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

    const targets = options.targets;
    const queries = [];
    _.each(options.targets, target => {
      if (!target.expr || target.hide) {
        return;
      }

      // Reset previous errors, if any.
      target.error = null;

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
    let queriesPromise = [
      this.doMetricsQuery(
        queries,
        this.start,
        this.end,
        maxDataPoints,
        requestedDataPoints,
        desiredQuantization)];

    // Execute the queries and collect all the results.
    return this.$q.all(queriesPromise).then(responses => {
      let result = [];
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        if (response.status === 'error') {
          throw response.error;
        }
        result = self.transformMetricData(targets, response.data.response);
      }

      // Return the results.
      return {data: result};
    });
  }

  // Helper methods.

  // Called from SumoLogicMetricsQueryCtrl.
  performSuggestQuery(query) {
    let url = '/api/v1/metrics/suggest/autocomplete';
    let data = {
      query: query,
      pos: query.length,
      queryStartTime: this.start,
      queryEndTime: this.end
    };
    return this._sumoLogicRequest('POST', url, data).then(result => {
      let suggestionsList = [];
      _.each(result.data.suggestions, suggestion => {
        _.each(suggestion.items, item => {
          suggestionsList.push(item.replacement.text);
        });
      });
      return suggestionsList;
    });
  }

  // Transform results from the Sumo Logic Metrics API called in
  // query() into the format Grafana expects.
  transformMetricData(targets, responses) {

    let seriesList = [];
    let errors = [];

    for (let i = 0; i < responses.length; i++) {
      let response = responses[i];
      let target = targets[i];

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
        console.log("sumo-logic-metrics-datasource - Datasource.transformMetricData - error: " +
          JSON.stringify(response));
        errors.push(response.message);
      }
    }

    if (errors.length > 0) {
      throw {message: errors.join("<br>")};
    }

    return seriesList;
  }

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
    console.log("sumo-logic-metrics-datasource - Datasource.doMetricsQuery: " +
      JSON.stringify(data));
    return this._sumoLogicRequest('POST', url, data);
  }

  _sumoLogicRequest(method, url, data) {
    var options: any;
    if(method == "GET") {
      options = {
        url: this.url + url,
        method: method,
        headers: {}
      };

    } else {
      options = {
        url: this.url + url,
        method: method,
        data: data,
        headers: {
          "Content-Type": "application/json"
        }
      };
    }

    if (this.basicAuth || this.withCredentials) {
      options.withCredentials = true;
    }
    if (this.basicAuth) {
      options.headers.Authorization = this.basicAuth;
    }

    return this.backendSrv.datasourceRequest(options).then(result => {
      return result;
    }, function (err) {
      if (err.status !== 0 || err.status >= 300) {
        if (err.data && err.data.error) {
          throw {
            message: 'Sumo Logic Error: ' + err.data.error,
            data: err.data,
            config: err.config
          };
        } else {
          throw {
            message: 'Network Error: ' + err.statusText + '(' + err.status + ')',
            data: err.data,
            config: err.config
          };
        }
      }
    });
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
