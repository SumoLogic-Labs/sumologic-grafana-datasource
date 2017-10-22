/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
/** @ngInject */
export default class SumoLogicMetricsDatasource {
    private backendSrv;
    private templateSrv;
    private $q;
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
    constructor(instanceSettings: any, backendSrv: any, templateSrv: any, $q: any);
    _request(method: any, url: any, data: any): any;
    specialRegexEscape(value: any): any;
    interpolateQueryExpr: (value: any, variable: any) => any;
    targetContainsTemplate: (target: any) => any;
    query(options: any): any;
    performTimeSeriesQuery(queries: any, start: any, end: any, maxDataPoints: any, requestedDataPoints: any, desiredQuantization: any): any;
    performSuggestQuery(query: any): any;
    metricFindQuery(query: any): any;
    testDatasource(): any;
    calculateInterval(interval: any): number;
    transformMetricData(responses: any): any[];
    renderTemplate(aliasPattern: any, aliasData: any): any;
    getOriginalMetricName(labelData: any): string;
    getTime(date: any, roundUp: any): number;
    changeQuantization(): void;
    clearError(): void;
}
