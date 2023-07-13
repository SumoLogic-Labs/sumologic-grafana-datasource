import { IField, ISearchAggregateResult, ISearchMessageResult, ISearchStatus, SearchResult } from "./types";
import { Observable, filter } from 'rxjs';
import { SearchStatus } from "./constants";
import { MutableDataFrame } from "@grafana/data";
import { formatSumoValues, getNonAggregateFieldName, getSumoToGrafanaType } from "../../types/constants";


export interface IPreviousCount {
  statusmessageCount: number,
  actualMessageCount: number
}

export const searchFilterForAggregateQuery = (status$: Observable<ISearchStatus>, previousCountMap: IPreviousCount) =>
  status$.pipe(
    filter((searchStatusResponse: ISearchStatus) => {
      const isMessageCountUpdated = searchStatusResponse.messageCount && searchStatusResponse.messageCount > previousCountMap.statusmessageCount ? true : false;

      if (isMessageCountUpdated) {
        previousCountMap.statusmessageCount = searchStatusResponse.messageCount as number
      }
      const isQueryCompleted = searchStatusResponse.state === SearchStatus.DONE_GATHERING_RESULTS
      return (
        //fetching records when messages count changes and when query gets completed
        (isMessageCountUpdated || isQueryCompleted)
      );
    }),
  );


export const SearchFilterForNonAggregateQuery = (status$: Observable<ISearchStatus>, maxRecords: number, previousCountMap: IPreviousCount) => status$.pipe(
  filter((searchStatusResponse: ISearchStatus) => {
    const isMessageCountUpdated = searchStatusResponse.messageCount && searchStatusResponse.messageCount > previousCountMap.statusmessageCount ? true : false;

    const isMessagesLimitCountReached = previousCountMap.actualMessageCount >= maxRecords;

    if (isMessageCountUpdated) {
      previousCountMap.statusmessageCount = searchStatusResponse.messageCount as number
    }
    return (
      // when query gets completed
      !(isMessagesLimitCountReached) // no need to fetch further messages once limit reached for non aggergate messages
    );
  }),
);


export const generateAggregateResponse = (response: SearchResult, previousCountMap: IPreviousCount) => {
  const aggregateData = response.aggregate
  const { fields, records } = aggregateData as ISearchAggregateResult

  previousCountMap.actualMessageCount = records.length;
  return new MutableDataFrame({
    name: 'AggregateResponse', // dataframe name
    fields: fields.map((field: IField) => {
      return {
        name: field.name,
        type: getSumoToGrafanaType(field.name, field.fieldType),
        values: records.map(record => formatSumoValues(field.name , record.map[field.name], field.fieldType)),
      }
    }),
  })

}

export const generateNonAggregateResponse = (response: SearchResult, previousCountMap: IPreviousCount) => {
  const nonAggregateData = response.message
  const { fields, messages } = nonAggregateData as ISearchMessageResult

  previousCountMap.actualMessageCount = messages.length;
  return new MutableDataFrame({
    name: 'NonAggregateResponse', // dataframe name
    fields: fields.map((field: IField) => {
      return {
        name: getNonAggregateFieldName(field.name),
        type: getSumoToGrafanaType(field.name, field.fieldType),
        values: messages.map(message => formatSumoValues(field.name ,message.map[field.name], field.fieldType)),
      }
    }),
    meta : {
      preferredVisualisationType : 'logs'
    }
  })

}