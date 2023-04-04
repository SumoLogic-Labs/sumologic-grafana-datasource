import React from 'react';
import { Alert, DataSourceHttpSettings } from '@grafana/ui';
import { DataSourceJsonData, DataSourcePluginOptionsEditorProps } from '@grafana/data';

export function ConfigEditor({ onOptionsChange, options }: DataSourcePluginOptionsEditorProps) {
  return (
    <div className="gf-form-group">
      <p>URL should be taken from{' '}
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://help.sumologic.com/docs/api/getting-started/#sumo-logic-endpoints-by-deployment-and-firewall-security"
        >
          Sumo Logic Endpoints by Deployment and Firewall Security
        </a>.
      </p>
      <p>
        You also need to get <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://help.sumologic.com/Manage/Security/Access-Keys"
        >Access Key</a>.
        {' '}<strong>Access ID</strong> should be used in the <strong>User</strong> field,
        and <strong>Access Key</strong> should be passed to the <strong>Password</strong> field.
      </p>
      {options.access === 'direct' && (
        <Alert title="Browser access" severity="info">
          In order to ensure that Browser access works as expected, please keep in mind to add the Grafana domain
          to your Allowlisted CORS Domains in the Sumo Logic Access Key configuration.
        </Alert>
      )}
      <DataSourceHttpSettings
        defaultUrl="https://api.sumologic.com/api/"
        dataSourceConfig={options}
        showAccessOptions={true}
        onChange={(newOptions) => {
          onOptionsChange({ ...newOptions, jsonData: { url: newOptions.url } as DataSourceJsonData });
        }}
      />
    </div>
  );
}
