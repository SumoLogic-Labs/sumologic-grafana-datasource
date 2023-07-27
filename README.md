**Note** Information for plugin developers is [at the end of this document](#plugin-development).

This page describes the sumologic-grafana-datasource (old name sumologic-metrics-grafana-datasource) plugin, a datasource plugin for Grafana that can deliver metrics from your Sumo deployment to Grafana. After installing and configuring the plugin, you can query and visualize metrics from Sumo in the Grafana user interface. You initiate a query from the Grafana UI, the search runs on Sumo, and results are returned to Grafana.

The Grafana backend will proxy all requests from the browser, and send them on to the data source.

- [Grafana version support](#grafana-version-support)
- [Install the plugin](#install-the-plugin)
    * [Install on Mac](#install-on-mac)
    * [Install on Ubuntu Linux](#install-on-ubuntu-linux)
- [Configure the plugin](#configure-the-plugin)
- [Query metrics in Grafana](#query-metrics-in-grafana)
- [Plugin development](#plugin-development)

**Note** This plugin is community-supported. For support, add a request in the issues tab.

# Grafana version support

The plugin supports Grafana starting from the v9.

The master branch attempts to track Grafana development as much as possible.

**This is the master branch.**

For specific version families, please have a look at the accordingly named branches.

# Install the plugin

The GA version of sumologic-grafana-datasource will be available on https://grafana.com/plugins. At that point, the plugin will be installable using the Grafana command-line interface.

To build the beta version, please run following steps:

1. Run `yarn install` to fetch all the dependencies.
2. Run `yarn build` in order to run webpack, you are ready to start development
3. Copy `./dist` content to `grafana/plugins/sumologic-grafana-datasource`
4. Ensure that `GF_DEFAULT_APP_MODE=development` environment variable is set (required for unsigned plugins) for the Grafana.
5. Restart the Grafana.

**For developers**: In order to have local Grafana version, it's recommended to use Docker compose, please just run `docker-compose up`

# Configure the plugin

1. In Sumo, generate an Access ID and Key. For instructions, see [Access Keys](https://help.sumologic.com/Manage/Security/Access-Keys). Save the ID and Key, as you will enter them later in this procedure. If you would like to use Browser Data Source in Grafana, then please ensure that you have added your Grafana domain in the Allowlisted CORS Domains list.

2. On the Grafana Home Dashboard, click **Add data source**.
   ![datasource](https://github.com/SumoLogic-Labs/sumologic-grafana-datasource/blob/HEAD/screenshots/add-datasource.png?raw=true)

3. Enter a name for the plugin in the **Name** field.

4. Deselect the **Default** checkbox/switch, unless you want to make the Sumo Logic datasource your default datasource type.

5. You may change **Access** to **Browser**, if you want to load data directly from browser. For this you would need proper entry in Allowlisted CORS Domains which you filled in step 1.

6. In the **URL** field, enter the API endpoint for your deployment. To determine the API endpoint, see [Sumo Logic Endpoints and Firewall Security](https://help.sumologic.com/APIs/General-API-Information/Sumo-Logic-Endpoints-and-Firewall-Security) in Sumo help.

7. In the **Auth** section, select the **Basic auth** checkbox. The **Basic Auth Details** section appears.
   ![dash-icon](https://github.com/SumoLogic-Labs/sumologic-grafana-datasource/blob/HEAD/screenshots/basic-auth.png?raw=true)

8. In the **Basic Auth Details** section:
    - In the **User** field, enter the Access ID you generated in step 1.
    - In the **Password** field, enter the Access Key you generated in step 1.

9. If you are using **old Grafana version**, there are few more points need to be taken into account:
    1. Select **Sumo Logic Metrics** from the **Type** dropdown.
    2. In the **Access** field, leave "proxy" selected.

10. Click **Add** to save the new data source.

# Query metrics in Grafana

You can query your Sumo metrics using the same query syntax you use in the Sumo UI. For more information, see [Metrics Queries](https://help.sumologic.com/Metrics/Working-with-Metrics/Metrics-Queries) in Sumo help.

This plugin supports [Grafana template variables](https://grafana.com/docs/grafana/latest/dashboards/variables/).

# Query Logs in Grafana

You can query your Sumo Logs using the same query syntax you use in the Sumo UI. For more information, see [Logs Queries](https://help.sumologic.com/docs/search/) in Sumo help.

# Plugin development

1. Run `yarn install` to fetch all the dependencies.
2. Run `docker-compose up` in order to get local grafana setup
3. Run `yarn dev` in order to run webpack, you are ready to start development

### TLS 1.2 Requirement

Sumo Logic only accepts connections from clients using TLS version 1.2 or greater. To utilize the content of this repo, ensure that it's running in an execution environment that is configured to use TLS 1.2 or greater.
