export enum RunSearchActionType {
  SET_PAGE = 'Page',
  PAUSE = 'Pause',
  STOP = 'Stop',
}

export enum SearchStatus {
  NOT_STARTED = 'NOT STARTED',
  GATHERING_RESULTS = 'GATHERING RESULTS',
  FORCE_PAUSED = 'FORCE PAUSED',
  DONE_GATHERING_RESULTS = 'DONE GATHERING RESULTS',
  CANCELLED = 'CANCELLED',
}

export const QUERY_STOPPED_STATES: any = {
  [SearchStatus.DONE_GATHERING_RESULTS]: true,
  [SearchStatus.CANCELLED]: true,
  [SearchStatus.FORCE_PAUSED]: true,
};

export enum SearchQueryType {
  MESSAGES = 'message',
  AGGREGATE = 'aggregate',
}

export const MESSAGES_RETRY_COUNT = 100;
export const MESSAGES_RETRY_DELAY = 3000;
export const MESSAGES_RETRY_EMPTY_ERROR = 'MESSAGES_RETRY_EMPTY_ERROR';

export const MAX_NUMBER_OF_RECORDS = 10000;
