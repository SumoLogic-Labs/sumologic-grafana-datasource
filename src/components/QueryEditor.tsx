import React, { useMemo } from 'react';
import { Button, QueryField, Select } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { SumoQuery } from '../types/metricsApi.types';
import { isLogsQuery, SumoQueryType } from '../types/constants';

type Props = QueryEditorProps<DataSource, SumoQuery>;

const selectOptions = [
  {
    value: SumoQueryType.LogsAggregate,
    label: 'Logs: Aggregate',
  },
  {
    value: SumoQueryType.LogsNonAggregate,
    label: 'Logs: Non-Aggregate',
  },
  {
    value: SumoQueryType.Metrics,
    label: 'Metrics',
  },
];

export function QueryEditor(props: Props) {
  const { queries, query, onChange, onRunQuery } = props;

  const onQueryTextChange = React.useCallback(
    (changedQueryText: string) => {
      onChange({ ...query, queryText: changedQueryText });
    },
    [query, onChange]
  );

  const { queryText, type, refId } = query;

  const onTypeChangeHandler = React.useCallback(
    (selectedObj: { value?: SumoQueryType; label?: string }) => {
      onChange({ ...query, type: selectedObj.value });
    },
    [query, onChange]
  );

  const isEditorDisabled = useMemo(() => {
    if (isLogsQuery(type)) {
      return false;
    }
    // disable editor is there is any log query present
    if (queries) {
      const logsQuery = queries.find((queryObj: SumoQuery) => isLogsQuery(queryObj.type));
      return logsQuery ? true : false;
    }

    return false;
  }, [queries, query]);

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div style={{ width: '175px' }}>
        <Select
          options={selectOptions}
          value={type || SumoQueryType.Metrics}
          onChange={onTypeChangeHandler}
          disabled={isEditorDisabled}
        />
      </div>

      <QueryField
        // if onRunQuery is not passed then you user would not be able to focus out from the QueryField
        onRunQuery={onRunQuery}
        onChange={onQueryTextChange}
        placeholder={isLogsQuery(type) ? 'Logs Query' : 'Metric Query'}
        query={queryText || ''}
        portalOrigin="sumo-metrics"
        disabled={isEditorDisabled}
        key={refId + type}
      />
      <Button disabled={isEditorDisabled} onClick={onRunQuery}>
        Run
      </Button>
    </div>
  );
}
