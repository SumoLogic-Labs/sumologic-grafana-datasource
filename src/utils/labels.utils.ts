import { MetricResultDetailsDimensions } from '../types/metricsApi.types';

export function dimensionsToLabelSuffix(dimensions: MetricResultDetailsDimensions[]) {
  return dimensions
    .filter(({ key, legend }) => legend && key !== 'metric')
    .map(({ key, value }) => `${key}=${value}`)
    .join(' ');
}
