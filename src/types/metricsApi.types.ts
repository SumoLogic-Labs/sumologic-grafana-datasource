import { DataQuery } from '@grafana/data';

export interface MetricResultDetailsDimensions {
  key: string;
  legend: boolean;
  value: string;
}

interface MetricResultDetails {
  algoId: number;
  name: string;
  customLabel: string;
  dimensions: MetricResultDetailsDimensions[];
}

interface OutlierParam {
  anomalyScore: number;
  baseline: number;
  isOutlier: boolean;
  lowerBound: number;
  outlier: boolean;
  unit: number;
  upperBound: number;
}

interface MetricResultAggregates {
  avg: number;
  count: number;
  latest: number;
  max: number;
  min: number;
  sum: number;
}

interface MetricResultDatapoints {
  avg: number[];
  count: number[];
  isFilled: boolean[];
  max: number[];
  min: number[];
  timestamp: number[];
  value: number[];
  outlierParams: OutlierParam[];
}

interface MetricsResult {
  datapoints: MetricResultDatapoints;
  horAggs: MetricResultAggregates;
  metric: MetricResultDetails;
}

export interface MetricsResponse {
  rowId: string;
  results: MetricsResult[];
}

export interface KeyedErrorValue {
  cause?: string;
  rowId: string;
  message?: string;
  type: 'error' | 'warning';
}

export interface KeyedError {
  key: string;
  values?: KeyedErrorValue;
}

export interface SumoApiMetricsResponse {
  error: boolean;
  errorMessage: string | null;
  errorKey: string | null;
  response: MetricsResponse[];
  keyedErrors: KeyedError[];
}

export interface MetricsQuery {
  query: string;
  rowId: string;
}

export interface SumoQuery extends DataQuery {
  queryText?: string;
}
