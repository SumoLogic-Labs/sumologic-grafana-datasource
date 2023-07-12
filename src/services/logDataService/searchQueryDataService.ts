

import { getBackendSrv } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';

import { ISearchAggregateResult, ISearchQueryDataService, ISearchStatus, ISearchCreate, SearchQueryParams } from './types';


const SEARCH_JOB_API = '/v1/search/jobs'

export class SearchQueryDataService implements ISearchQueryDataService {

  create(
    searchQueryParams : Omit<SearchQueryParams , 'paginationInfo' | 'types' >  
  ): Promise<ISearchCreate> {

    const { query , startTime , endTime  , baseUrl , basicAuth } = searchQueryParams
    const data = {
      query,
      from : startTime,
      to : endTime,
      byReceiptTime: true

    };
    return  lastValueFrom(getBackendSrv().fetch<ISearchCreate>({
      method : 'POST',
      credentials: 'include',
      headers: {
        Authorization: basicAuth,
      },
      url: baseUrl + SEARCH_JOB_API,
      data,
    })).then(response => response.data);
  }

  status(searchQuerySessionId: string , baseUrl : string , basicAuth:string): Promise<ISearchStatus> {
    return lastValueFrom(getBackendSrv().fetch<ISearchStatus>({
      method : 'GET',
      credentials: 'include',
      headers: {
        Authorization: basicAuth,
      },
      url: `${baseUrl}${SEARCH_JOB_API}/${searchQuerySessionId}` ,
    })).then(response => response.data)
  }

  delete(searchQuerySessionId: string , baseUrl : string , basicAuth  :string): Promise<any>{
    return lastValueFrom(getBackendSrv().fetch<ISearchStatus>({
      method : 'DELETE',
      credentials: 'include',
      headers: {
        Authorization: basicAuth,
      },
      url: `${baseUrl}${SEARCH_JOB_API}/${searchQuerySessionId}`,
    })).then(response => response.data)
  }

  messages(
    searchQuerySessionId: string,
    offset: number,
    length: number,
    baseUrl : string,
    basicAuth : string,
  ): Promise<any> {
    return lastValueFrom(getBackendSrv().fetch<ISearchAggregateResult>({
      method : 'GET',
      credentials: 'include',
      headers: {
        Authorization: basicAuth,
      },
      params : {
        offset,
        limit : length,
      },
      url:  `${baseUrl}${SEARCH_JOB_API}/${searchQuerySessionId}/messages`,
    })).then(response => response.data)
  }

  aggregates(
    searchQuerySessionId: string,
    offset: number,
    length: number,
    baseUrl : string,
    basicAuth : string,
  ): Promise<any> {

    return lastValueFrom(getBackendSrv().fetch<ISearchAggregateResult>({
      method : 'GET',
      credentials: 'include',
      headers: {
        Authorization: basicAuth,
      },
      params : {
        offset,
        limit : length,
      },
      url: `${baseUrl}${SEARCH_JOB_API}/${searchQuerySessionId}/records`,
    })).then(response => response.data)
  }
}

export const searchQueryDataService = new SearchQueryDataService();
