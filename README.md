| TLS Deprecation Notice |
| --- |
| In keeping with industry standard security best practices, as of May 31, 2018, the Sumo Logic service will only support TLS version 1.2 going forward. Verify that all connections to Sumo Logic endpoints are made from software that supports TLS 1.2. |

**Note** Information for plugin developers is [at the end of this document](#plugin-development).

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
  * [Values](#values)
- [Plugin development](#plugin-development)

**Note** This plugin is community-supported. For support, add a request in the issues tab.

# Grafana version support

The plugin has been tested with Grafana v4.5.2, v4.6.2, and v4.6.3.

The master branch attempts to track Grafana development as much as possible.

**This is the master branch.**

For specific version families, please have a look at the accordingly named branches.

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

You can query your Sumo metrics using the same query syntax you use in the Sumo UI. For more information, see [Metrics Queries](https://help.sumologic.com/Metrics/Working-with-Metrics/Metrics-Queries) in Sumo help.




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


Write the query. To see the results, hit Tab to de-focus the query text box, or click outside of the query text box.

![query](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/results.png)


Close the edit box and click **Save**.

![save](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/save.png)


# Templating

To use templating, click the **Settings** icon and select **Templating**.

![templating](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/settings-templating.png)


Click the **+NEW** button.

![new-button](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/new-button.png)

There are multiple template types. The one that is most customizable with Sumo is the **Query** template.  

![templatetypes](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/template-types.png)


Sumo currently supports one special type of query for generating template autocomplete values from timeseries metadata.

* Values

## Values

Every metric time series in Sumo Logic has a set of associated key-value pairs. This is based on the [Metrics 2.0](http://metrics20.org/) concept. Common keys include `_contentType`, `metric`, `_sourceCategory`, `_sourceHost`, `_rawName`, and so on. For dashboard templating, we often want to create a template variable to specify a value for a given key. In order to create a list of all the values for a key, we can use the special query type "values". Consider this example:

`values|_sourceCategory|_contentType=HostMetrics`

This will return all the value for dimension `_sourceCategory` given dimension `_contentType` has value `HostMetrics`. In other words, this will return all the source categories that report host metrics via the Sumo Logic host metrics collector source. Note that it is possible to use the value of another template variable in the query. Assuming we have defined a template variable `$sourceCategory" with the above query, we can then create a template variable that will only have the hosts in the given source category by defining another template variable:

`values|_sourceHost|_contentType=HostMetrics _sourceCategory=$sourceCategory`

Format: 

`values | <dimensionName> | <Query to run>`

where: 

* \<dimensionName\> is the key that you want from the query result. For example, if the query narrows it down to five possible keys, you can specify which key to use to autocomplete the parameter value.

* \<Query to run\> is the query that you want to use to narrow down the autocomplete. 

![preview](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/preview-values.png)

If you save the dashboard, you can see the values being autocompleted which were shown in the preview.

![autocomplete](https://github.com/SumoLogic/sumologic-metrics-grafana-datasource/blob/master/screenshots/cluster.png)


# Plugin development
The layout of this repository is based on https://github.com/grafana/typescript-template-datasource.

1. Run `npm install` to fetch all the dependencies.
2. If you don't already have Grunt, install it with: 
`sudo npm install -g grunt-cli`. 
3. Run grunt to build the plugin into `dist`.
4. While developing, run `grunt watch` to see errors and warnings when saving files.

Make all changes need to be made in the `src` directory. Once you are happy with the changes, remove the previous versions of the plugin from Grafana's plugin directory, then copy the `dist` folder (making sure to run grunt first!) to the plugin directory.
