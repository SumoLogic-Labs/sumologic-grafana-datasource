import { KeyedError } from '../types/metricsApi.types';

export function mapKeyedErrorMessage(keyedError?: KeyedError): string {
  const type = keyedError?.values?.type ?? 'error';

  if (keyedError) {
    if (keyedError.values?.cause) {
      return keyedError.values.cause;
    }

    if (keyedError.values?.message) {
      return keyedError.values?.message;
    }

    if (keyedError.key) {
      return `API return ${type} with code "${keyedError.key}"`;
    }
  }

  return `Unknown ${type} returned from the API`;
}
