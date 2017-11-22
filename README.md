This page describes the sumologic-metrics-grafana-datasource plugin, a datasource plugin for Grafana that can deliver metrics from your Sumo deployment to Grafana. After installing and configuring the plugin, you can query and visualize metrics from Sumo in the Grafana user interface. You initiate a query from the Grafana UI, the search runs on Sumo, and results are returned to Grafana.

The Grafana backend will proxy all requests from the browser, and send them on to the Data Source.

This beta version of sumologic-metrics-grafana-datasource contains most planned features, but is not yet complete.


- [Grafana version support](#grafana-version-support)
- [Install the plugin](#install-the-plugin)
  * [Install on Mac](#install-on-mac)
  * [Install on Ubuntu Linux](#install-on-ubuntu-linux)
- [Configure the plugin](#configure-the-plugin)
- [Query metrics in Grafana](#query-metrics-in-grafana)
- [Plugin development](#plugin-development)
- [Create a dashboard](#create-a-dashboard)
- [Use a template](#use-a-template)
  * [Dimensions](#dimensions)
  * [Metadata](#metadata)
  * [Metrics](#metrics)



**Note** This plugin is community-supported. For support, add a request in the issues tab. 



# Grafana version support

The plugin has been tested with Grafana v4.4.3 and v4.5.2.

This branch supports Grafana v4.5.x.

A version that works with Grafana v4.4.x is available at https://github.com/SumoLogic/sumo-logic-metrics-datasource/tree/v4.4.x.


# Install the plugin

The GA version of sumologic-metrics-grafana-datasource will be available on https://grafana.com/plugins. At that point, the plugin will be installable using the Grafana command-line interface. 

To install the beta version, copy the `dist` directory of this repository to the plugin directory of your Grafana installation, then restart Grafana. Environment-specific instructions follow.


## Install on Mac

To install the plugin on a Mac, with Grafana installed using Homebrew:

`cp -r dist /usr/local/var/lib/grafana/plugins/sumo-logic-metrics-datasource && brew services restart grafana`

## Install on Ubuntu Linux

To install the plugin on Ubuntu Linux:

`sudo cp -r dist /path_to_plugins/sumo-logic-metrics-datasource && sudo /bin/systemctl restart grafana-server`

Where `path_to_plugins`  is the path to the plugins folder in your Grafana environment. The plugins folder is typically `/var/lib/grafana/`, but it may be different in your environment. 

# Configure the plugin

1. In Sumo, generate an Access ID and Key. For instructions, see [Access Keys](https://help.sumologic.com/Manage/Security/Access-Keys). Save the ID and Key, as you will enter them later in this procedure. 

2. On the Grafana Home Dashboard, click **Add data source**.

3. Enter a name for the plugin in the **Name** field.  

4. Deselect the **Default** checkbox, unless you want to make the Sumo Logic datasource your default datasource type. 

5. Select **Sumo Logic Metrics** from the **Type** dropdown.

6. In the **Http settings** section:
   - In the **URL** field, enter the API endpoint for your deployment. To determine the API endpoint, see [Sumo Logic Endpoints and Firewall Security](https://help.sumologic.com/APIs/General-API-Information/Sumo-Logic-Endpoints-and-Firewall-Security) in Sumo help.
   - In the **Access** field, leave “proxy” selected. 

7. In the **Http Auth** section, select the **Basic Auth** checkbox. The **Basic Auth Details** section appears.

8. In the **Basic Auth Details** section:
   - In the **User** field, enter the Access ID you generated in step 1.
   - In the **Password** field, enter the Access Key you generated in step 1.

9. Click **Add** to save the new data source. 

# Query metrics in Grafana

You can query your Sumo metrics using the same query syntax you use in the the Sumo UI. For more information, see [Metrics Queries](https://help.sumologic.com/Metrics/Working-with-Metrics/Metrics-Queries) in Sumo help


# Plugin development
The layout of this repository is based on https://github.com/grafana/typescript-template-datasource.


1. Run `npm install` to fetch all the dependencies.
2. If you don't already have Grunt, install it with: 
`sudo npm install -g grunt-cli`. 
3. Run grunt to build the plugin into `dist`.
4. While developing, run `grunt watch` to see errors and warnings when saving files.

Make all changes need to be made in the `src` directory. Once you are happy with the changes, remove the previous versions of the plugin from Grafana's plugin directory, then copy the `dist` folder (making sure to run grunt first!) to the plugin directory.

# Create a dashboard

To create a new dashboard, click **New Dashboard**.

![dash-icon](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/new-dash-icon.png)

Click the **Graph** icon.

![graph-icon](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/graph-icon.png)

Click **Panel Title**.

![panel-title](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/panel-title.png)

Click **Edit** in the menu that pops up.

![panel-title](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/edit-button.png)


A metrics menu opens. Select the name of the data source that you created.

![data-source](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/select-data-source.png)

Enter the query that you want to run.

![queryx](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/add-query.png)


Write the query and click somewhere else, it will show you sample output

![query](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/results.png)


Close the edit box and click **Save**.

![save](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/save.png)


# Use a template

To create a template, click the **Settings** icon and select **Templating**.

![templating](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/settings-templating.png)


Click the **+NEW** button.

![new-button](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/new-button.png)

There are multiple templates. The one that is most customizable with Sumo is the **Query** tempate.  

![templatetypes](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/template-types.png)


Sumo supports four types of query for generating template autocomplete values.

* Dimensions
* Metadata
* Metric names
* Suggestions

## Dimensions


Format: 

`Dimension | <dimensionName> | <Query to run>`


where: 

* <dimensionName> is the dimension that you want from the query result. For example, if the query narrows it down to five possible dimensions, you can specify which dimension to use to autocomplete the parameter value.

* <Query to run> is the query that you want to use to narrow down the autocomplete. 

![query](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/query.png)

Note that preview values are displayed at the bottom of the screenshot above..

If you save the dashboard, you can see the values being autocompleted which were being shown in the preview.

![save](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/statistic.png)


## Metadata

Format: 

`Metatags | <dimensionName> | <Query to run>`

where: 

* <dimensionName> is the dimension that you want from the query result. For example, if the query narrows it down to five possible dimensions, you can specify which dimension to use to autocomplete the parameter value.

* <Query to run> is the query that you want to use to narrow down the autocomplete. 

![preview](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/preview-values.png)

If you save the dashboard, you can see the values being autocompleted which were shown in the preview.

![autocomplete](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/cluster.png)

## Metrics 

Format:

`metrics  | <Query to run>`


where:

* <Query to run> is the query that you want to use to narrow down the autocomplete. 

You can see the preview values like following: 

![preview](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/preview2.png)


If you save the dashboard, you can see the values being autocompleted which were in the preview.

![autocomplete](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/avail-metrics.png)
