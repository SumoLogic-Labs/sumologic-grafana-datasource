import React from 'react';
import { Button, QueryField } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { SumoQuery } from '../types/metricsApi.types';

type Props = QueryEditorProps<DataSource, SumoQuery>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const onQueryTextChange = React.useCallback((changedQueryText: string) => {
    onChange({ ...query, queryText: changedQueryText });
  }, [query]);

  const { queryText } = query;

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <QueryField
        // if onRunQuery is not passed then you user would not be able to focus out from the QueryField
        onRunQuery={onRunQuery}
        onChange={onQueryTextChange}
        placeholder="Metric Query"
        query={queryText || ''}
        portalOrigin="sumo-metrics"
      />
      <Button onClick={onRunQuery}>Run</Button>
    </div>
  );
}
