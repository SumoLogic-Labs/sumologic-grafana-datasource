import { KeyedError } from '../types/metricsApi.types';

export function mapKeyedErrorMessage(keyedError?: KeyedError, queryRow?: string): string {
  const type = keyedError?.values?.type ?? 'error';
  const queryRowPrefix = queryRow ? `Row ${queryRow}: ` : '';

  if (!keyedError) {
    return `${queryRowPrefix}Unknown ${type} returned from the API`;
  }

  if (keyedError.values?.cause) {
    return queryRowPrefix + keyedError.values.cause;
  }

  if (keyedError.values?.message) {
    return queryRowPrefix + keyedError.values?.message;
  }

  if (keyedError.key) {
    return `${queryRowPrefix}API return ${type} with code "${keyedError.key}"`;
  }

  return `${queryRowPrefix}Unknown returned from the API`;
}
