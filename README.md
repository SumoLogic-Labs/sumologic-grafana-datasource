## Sumo Logic Metrics Datasource

A Sumo Logic Metrics datasource plugin for Grafana. This plugin is still being developed. It is 
being used internally and therefore should work. But please consider the plugin experimental as 
of now.

### Using the plugin with Grafana

It is planned to publish the plugin to [https://grafana.com/plugins](https://grafana.com/plugins) once it reaches version 1.0.
It will then be possible use the customary `grafana-cli plugins` method for installing. But for
now, the plugin will have to be installed by using the code in this repository.

We have tested this plugin with Grafana version v4.4.3 (commit: 54c79c5).

Grafana plugin repositories contain a `dist` directory. In order to install the plugin, simply
copy the `dist` to the plugin directory of your Grafana installation, then restart Grafana.

##### Mac

To install the plugin on a Mac, with Grafana installed using Homebrew:

`cp -r dist /usr/local/var/lib/grafana/plugins/sumo-logic-metrics-datasource && brew services restart grafana`

##### Linux

To install the plugin on Ubuntu Linux:

`sudo cp -r dist /var/lib/grafana/plugins/sumo-logic-metrics-datasource && sudo /bin/systemctl restart grafana-server`

### Developing

The layout of the repository is based on [https://github.com/grafana/typescript-template-datasource](https://github.com/grafana/typescript-template-datasource)
which is a very helpful starting point.

1. Run `npm install` to fetch all the dependencies.
2. Install Grunt with `sudo npm install -g grunt-cli` if you don't already have it.
3. Run `grunt` to build the plugin into `dist`
4. Run `grunt watch` while developing to see errors and warnings when saving files.

All changes need to be made in the `src` directory. Once you are happy with the changes, remove the
previous version of the plugin from Grafana's plugin directory, then copy the
`dist` folder (make sure to run `grunt` first!) to the plugin directory.

