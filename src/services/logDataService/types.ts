import type { Observable } from 'rxjs';
import { RunSearchActionType, SearchQueryType, SearchStatus } from './constants';


export interface ISearchQueryDataService {
    create: (
        searchQueryParams: Omit<SearchQueryParams, 'paginationInfo' | 'types'>
    ) => Promise<ISearchCreate>;
    status: (searchQuerySessionId: string, baseUrl: string, basicAuth: string) => Promise<ISearchStatus>;
    delete: (searchQuerySessionId: string, baseUrl: string, basicAuth: string) => Promise<any>;
    messages: (
        searchQuerySessionId: string,
        offset: number,
        length: number,
        baseUrl: string,
        basicAuth: string,
    ) => Promise<ISearchMessageResult>;
    aggregates: (
        searchQuerySessionId: string,
        offset: number,
        length: number,
        baseUrl: string,
        basicAuth: string,
    ) => Promise<ISearchAggregateResult>;
}

export interface ISearchCreate {
    id: string;
}


export type SearchStatusFilter = (
    searchObservable: Observable<ISearchStatus>,
) => Observable<ISearchStatus>;



export interface SearchPaginationInfo {
    offset: number;
    length: number;
    hasMore?: boolean;
    totalResults?: number;
}

export interface SearchQueryParams {
    types: SearchQueryType[];
    query: string;
    startTime: number,
    endTime: number,
    timeZone?: string;
    baseUrl: string,
    basicAuth: string,
    paginationInfo: SearchPaginationInfo;
}

export interface RunSearchAction {
    type: RunSearchActionType;
    payload?: any;
}

export interface ISearchStatus {
    state: SearchStatus;
    messageCount?: number;
    recordCount?: number;
    pendingErrors?: any[];
    pendingWarnings?: any[];
}

export interface IField {
    name: string,
    fieldType: string,
    keyField: boolean
}

export interface IRecords {
    map: Record<string, string>
}

export interface ISearchAggregateResult {
    fields: IField[];
    records: IRecords[];
}

export interface ISearchMessageResult {
    fields: IField[];
    messages: IRecords[];
}

export interface SearchResult {
    status: ISearchStatus;
    // These keys should match SearchQueryType enum
    message?: ISearchMessageResult;
    aggregate?: ISearchAggregateResult;
}


export type RetrievePageFunction = (
    sessionId: string,
    offset: number,
    length: number,
    baseUrl: string,
    basicAuth: string
) => Promise<any>;

