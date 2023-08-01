import { IField, ISearchAggregateResult, ISearchMessageResult, ISearchStatus, SearchResult } from './types';
import { Observable, filter } from 'rxjs';
import { SearchStatus } from './constants';
import { FieldType, MutableDataFrame } from '@grafana/data';
import { formatSumoValues, getNonAggregateFieldName, getSumoToGrafanaType } from '../../types/constants';

export interface IPreviousCount {
  statusMessageCount: number;
  // messages count in status api can be different from messages api
  actualMessageCount: number;
}

export const searchFilterForAggregateQuery = (status$: Observable<ISearchStatus>, previousCountMap: IPreviousCount) =>
  status$.pipe(
    filter((searchStatusResponse: ISearchStatus) => {
      const isMessageCountUpdated =
        searchStatusResponse.messageCount && searchStatusResponse.messageCount > previousCountMap.statusMessageCount
          ? true
          : false;

      if (isMessageCountUpdated) {
        previousCountMap.statusMessageCount = searchStatusResponse.messageCount as number;
      }
      const isQueryCompleted = searchStatusResponse.state === SearchStatus.DONE_GATHERING_RESULTS;

      return (
        //fetching records when messages count changes and when query gets completed
        isMessageCountUpdated || isQueryCompleted
      );
    })
  );

export const searchFilterForNonAggregateQuery = (
  status$: Observable<ISearchStatus>,
  maxRecords: number,
  previousCountMap: IPreviousCount
) =>
  status$.pipe(
    filter((searchStatusResponse: ISearchStatus) => {
      const isMessageCountUpdated =
        searchStatusResponse.messageCount && searchStatusResponse.messageCount > previousCountMap.statusMessageCount
          ? true
          : false;

      const isMessagesLimitCountReached = previousCountMap.actualMessageCount >= maxRecords; // grafana messages maxRecords

      if (isMessageCountUpdated) {
        previousCountMap.statusMessageCount = searchStatusResponse.messageCount as number;
      }
      const isQueryCompleted = searchStatusResponse.state === SearchStatus.DONE_GATHERING_RESULTS;

      return (
        !isMessagesLimitCountReached || isQueryCompleted // no need to fetch further messages once limit reached for non aggergate messages
      );
    })
  );

export const generateAggregateResponse = (response: SearchResult) => {
  const aggregateData = response.aggregate;
  const { fields, records } = aggregateData as ISearchAggregateResult;

  return new MutableDataFrame({
    name: 'AggregateResponse', // dataframe name
    fields: fields.map((field: IField) => {
      return {
        name: field.name,
        type: getSumoToGrafanaType(field.name, field.fieldType),
        values: records.map((record) => formatSumoValues(field.name, record.map[field.name], field.fieldType)),
      };
    }),
  });
};

export const generateNonAggregateResponse = (response: SearchResult, previousCountMap: IPreviousCount) => {
  const nonAggregateData = response.message;
  const { fields, messages } = nonAggregateData as ISearchMessageResult;

  previousCountMap.actualMessageCount = messages.length;
  return new MutableDataFrame({
    name: 'NonAggregateResponse', // dataframe name
    fields: fields.map((field: IField) => {
      return {
        name: getNonAggregateFieldName(field.name),
        type: getSumoToGrafanaType(field.name, field.fieldType),
        values: messages.map((message) => formatSumoValues(field.name, message.map[field.name], field.fieldType)),
      };
    }),
    meta: {
      preferredVisualisationType: 'logs',
    },
  });
};

export const generateFullRangeHistogram = (statusObj: ISearchStatus) => {
  const histohramBuckets = statusObj.histogramBuckets || [];

  histohramBuckets.sort((bucket1, bucket2) => bucket1.startTimestamp - bucket2.startTimestamp);

  return new MutableDataFrame({
    name: 'logsVolumn', // dataframe name
    fields: [
      {
        name: 'MinBucket',
        type: FieldType.time,
        values: histohramBuckets.map((bucket) => bucket.startTimestamp),
      },
      {
        name: 'MaxBucket',
        type: FieldType.time,
        values: histohramBuckets.map((bucket) => bucket.startTimestamp + bucket.length),
      },
      {
        name: 'count',
        type: FieldType.number,
        values: histohramBuckets.map((bucket) => bucket.count),
        config: {
          color: {
            mode: 'fixed',
            fixedColor: '#8e8e8e',
          },
          custom: {
            drawStyle: 'bars',
            fillColor: '#8e8e8e',
            fillOpacity: 100,
          },
        },
      },
    ],
  });
};
