import React from 'react';
import { Button, QueryField } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { SumoQuery } from '../types/metricsApi.types';

type Props = QueryEditorProps<DataSource, SumoQuery>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const onQueryTextChange = (changedQueryText: string) => {
    onChange({ ...query, queryText: changedQueryText });
  };

  const { queryText } = query;

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <QueryField
        onChange={onQueryTextChange}
        placeholder="Metric Query"
        query={queryText || ''}
        portalOrigin="plugin"
      />
      <Button onClick={onRunQuery}>Run</Button>
    </div>
  );
}
