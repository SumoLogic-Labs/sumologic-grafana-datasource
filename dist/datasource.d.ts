/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
/** @ngInject */
export default class SumoLogicMetricsDatasource {
    private backendSrv;
    private templateSrv;
    private $q;
    url: string;
    basicAuth: boolean;
    start: number;
    end: number;
    error: string;
    quantizationDefined: boolean;
    /** @ngInject */
    constructor(instanceSettings: any, backendSrv: any, templateSrv: any, $q: any);
    testDatasource(): any;
    metricFindQuery(query: any): any;
    query(options: any): any;
    performSuggestQuery(query: any): any;
    transformMetricData(responses: any): any[];
    doMetricsQuery(queries: any, start: any, end: any, maxDataPoints: any, requestedDataPoints: any, desiredQuantization: any): any;
    doRequest(method: any, url: any, data: any): any;
    calculateInterval(interval: any): number;
    changeQuantization(): void;
}
