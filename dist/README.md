**Note** Information for plugin developers are [at the end of this document](#plugin-development).

This page describes the sumologic-metrics-grafana-datasource plugin, a datasource plugin for Grafana that can deliver metrics from your Sumo deployment to Grafana. After installing and configuring the plugin, you can query and visualize metrics from Sumo in the Grafana user interface. You initiate a query from the Grafana UI, the search runs on Sumo, and results are returned to Grafana.

The Grafana backend will proxy all requests from the browser, and send them on to the data source.

This beta version of sumologic-metrics-grafana-datasource contains most planned features, but is not yet complete.


- [Grafana version support](#grafana-version-support)
- [Install the plugin](#install-the-plugin)
  * [Install on Mac](#install-on-mac)
  * [Install on Ubuntu Linux](#install-on-ubuntu-linux)
- [Configure the plugin](#configure-the-plugin)
- [Query metrics in Grafana](#query-metrics-in-grafana)
- [Create a dashboard](#create-a-dashboard)
- [Templating](#templating)
- [Plugin development](#plugin-development)

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

`cp -r dist /usr/local/var/lib/grafana/plugins/sumologic-metrics-grafana-datasource && brew services restart grafana`

## Install on Ubuntu Linux

To install the plugin on Ubuntu Linux:

`sudo cp -r dist /path_to_plugins/sumologic-metrics-grafana-datasource && sudo /bin/systemctl restart grafana-server`

Where `path_to_plugins`  is the path to the plugins folder in your Grafana environment. The plugins folder is typically `/var/lib/grafana/`, but it may be different in your environment. 

# Configure the plugin

1. In Sumo, generate an Access ID and Key. For instructions, see [Access Keys](https://help.sumologic.com/Manage/Security/Access-Keys). Save the ID and Key, as you will enter them later in this procedure. 

2. On the Grafana Home Dashboard, click **Add data source**.
![datasource](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/add-datasource.png)

3. Enter a name for the plugin in the **Name** field.  

4. Deselect the **Default** checkbox, unless you want to make the Sumo Logic datasource your default datasource type. 

5. Select **Sumo Logic Metrics** from the **Type** dropdown.

6. In the **Http settings** section:
   - In the **URL** field, enter the API endpoint for your deployment. To determine the API endpoint, see [Sumo Logic Endpoints and Firewall Security](https://help.sumologic.com/APIs/General-API-Information/Sumo-Logic-Endpoints-and-Firewall-Security) in Sumo help.
   - In the **Access** field, leave “proxy” selected. 

7. In the **Http Auth** section, select the **Basic Auth** checkbox. The **Basic Auth Details** section appears.
![dash-icon](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/basic-auth.png)

8. In the **Basic Auth Details** section:
   - In the **User** field, enter the Access ID you generated in step 1.
   - In the **Password** field, enter the Access Key you generated in step 1.

9. Click **Add** to save the new data source. 

# Query metrics in Grafana

You can query your Sumo metrics using the same query syntax you use in the the Sumo UI. For more information, see [Metrics Queries](https://help.sumologic.com/Metrics/Working-with-Metrics/Metrics-Queries) in Sumo help.




# Create a dashboard

To create a new dashboard, click **New Dashboard**.

![dash-icon](screenshots/new-dash-icon.png)

Click the **Graph** icon.

![graph-icon](screenshots/graph-icon.png)

Click **Panel Title**.

![panel-title](screenshots/panel-title.png)

Click **Edit** in the menu that pops up.

![panel-title](screenshots/edit-button.png)


A metrics menu opens. Select the name of the data source that you created.

![data-source](screenshots/select-data-source.png)

Enter the query that you want to run.

![queryx](screenshots/add-query.png)


Write the query. To see the results, hit Tab to de-focus the query text box, or click outside of the query text box.

![query](screenshots/results.png)


Close the edit box and click **Save**.

![save](screenshots/save.png)


# Templating

To use templating, click the **Settings** icon and select **Templating**.

![templating](screenshots/settings-templating.png)


Click the **+NEW** button.

![new-button](screenshots/new-button.png)

There are multiple template types. The one that is most customizable with Sumo is the **Query** template.  

![templatetypes](screenshots/template-types.png)


Sumo supports two types of queries for generating template autocomplete values.

* Metadata
* Metric names

## Metadata

Use this to get a list of values for a particular dimension. The values for the dimensions will populate the dropdown menu for the template variable. This is a workaround for the fact that the current API doesn't quite let us get the values for a dimensions given already existing values for other metadata dimensions without specifying the metrics dimension as well. For example:

`metaTags|_sourceCategory|_contentType=HostMetrics metric=CPU_LoadAvg_1Min`

This will return all the value for dimension `_sourceCategory` given dimension `_contentType` has value `HostMetrics`. In other words, all the source categories that report host metrics via the Sumo Logic host metrics collector source.

Format: 

`metatags | <dimensionName> | <Query to run>`

where: 

* \<dimensionName\> is the dimension that you want from the query result. For example, if the query narrows it down to five possible dimensions, you can specify which dimension to use to autocomplete the parameter value.

* \<Query to run\> is the query that you want to use to narrow down the autocomplete. 

![preview](screenshots/preview-values.png)

If you save the dashboard, you can see the values being autocompleted which were shown in the preview.

![autocomplete](screenshots/cluster.png)

## Metrics 

Use this to get a list for all metrics being reported given a set of metadata dimensions being set to specified values. For example:

`metrics|_contentType=HostMetrics`

This will produce a lit of metric names reported as host metrics via the Sumo Logic host metrics collector source.

Format:

`metrics  | <Query to run>`


where:

* \<Query to run\> is the query that you want to use to narrow down the autocomplete. 

You can see the preview values like following: 

![preview](screenshots/preview2.png)


If you save the dashboard, you can see the values being autocompleted which were in the preview.

![autocomplete](screenshots/avail-metrics.png)


# Plugin development
The layout of this repository is based on https://github.com/grafana/typescript-template-datasource.

1. Run `npm install` to fetch all the dependencies.
2. If you don't already have Grunt, install it with: 
`sudo npm install -g grunt-cli`. 
3. Run grunt to build the plugin into `dist`.
4. While developing, run `grunt watch` to see errors and warnings when saving files.

Make all changes need to be made in the `src` directory. Once you are happy with the changes, remove the previous versions of the plugin from Grafana's plugin directory, then copy the `dist` folder (making sure to run grunt first!) to the plugin directory.
