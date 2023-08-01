import { FieldType } from '@grafana/data';

export const enum SumoQueryType {
  LogsAggregate = 'LogsAggregate',
  LogsNonAggregate = 'LogsNonAggregate',
  Metrics = 'Metrics',
}

export const SumoToGrafanaTypeMap: Record<string, FieldType> = {
  int: FieldType.number,
  double: FieldType.number,
  string: FieldType.string,
  long: FieldType.number,
};

export const SumoToGrafanaFieldName: Record<string, string> = {
  _loglevel: 'level',
  _messagetime: 'Time',
};

const TimeFields = ['_timeslice', '_receipttime', '_messagetime', '_start_time', '_end_time'];

export const getSumoToGrafanaType = (fieldName: string, fieldType: string): FieldType => {
  if (TimeFields.includes(fieldName)) {
    return FieldType.time;
  }
  return SumoToGrafanaTypeMap[fieldType] || FieldType.string;
};

export const getNonAggregateFieldName = (fieldName: string): string => {
  return SumoToGrafanaFieldName[fieldName] || fieldName;
};

export const formatSumoValues = (name: string, value: string, type: string) => {
  if (name === '_loglevel') {
    return (value || '').toLocaleLowerCase();
  }

  if (type === 'int' || type === 'double' || type === 'long') {
    return Number(value);
  }

  return value;
};

export const isLogsQuery = (type: SumoQueryType | undefined) => {
  return type === SumoQueryType.LogsAggregate || type === SumoQueryType.LogsNonAggregate;
};
