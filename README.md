## TypeScript Template Data Source For Grafana

This plugin is a template to help you get started with writing a data source plugin for Grafana in TypeScript.

This template plugin includes:

- Karma and mocha for unit testing in TypeScript
- Mocks for testing and TypeScript typings to be able to compile the plugin.
- A basic Grunt script to build the plugin. Builds TypeScript and copies the required files to the dist directory.

### Getting Started

1. Make a subdirectory named after your plugin in the `data/plugins` subdirectory in your Grafana instance. It does not really matter what the directory name is. When the plugin is installed via the grafana cli, it will create a directory named after the plugin id field in the plugin.json file.

1. Copy the files in this project into your new plugin subdirectory.
2. `npm install` or `yarn install`
3. `grunt`
4. `karma start --single-run` to run the tests once. There is one failing test for the `testDatasource` in the datasource.ts file.
5. Restart your Grafana server to start using the plugin in Grafana (Grafana only needs to be restarted once).

`grunt watch` will build the TypeScript files and copy everything to the dist directory automatically when a file changes. This is useful for when working on the code. `karma start` will turn on the karma file watcher so that it reruns all the tests automatically when a file changes.

Changes should be made in the `src` directory. The build task transpiles the TypeScript code into JavaScript and copies it to the `dist` directory. Grafana will load the JavaScript from the `dist` directory and ignore the `src` directory.

### Preparing To Publish Your Plugin On Grafana.com

- The plugin id field in the plugin.json file should be unique and should follow the plugin naming convention: `yourorgname-pluginname-datasource`.
- If the plugin supports annotations, then change the annotations field in the plugin.json file to `true`.
- Image links in the plugin are relative to the plugin.json file.
- Everywhere a class is named ChangeMyName, change it your plugin name.
- Commit the `dist` directory to Git. Grafana cannot build plugins when loading them and will load the JavaScript in the dist directory if it exists.
- The README.md should not contain HTML, only Markdown.
- If the README.md file contains links to images, they should be the GitHub link to the image. For example: `https://raw.githubusercontent.com/yourorg/pluginname-datasource/master/src/img/image_name.png`

### Grafana SDK Mocks

The [Grafana SDK Mocks](https://github.com/grafana/grafana-sdk-mocks) package contains mocks for the Grafana classes that a plugin needs to build in TypeScript. It also contains some of the commonly used util classes that are used in plugins. This allows you to write unit tests for your plugin.

It is already included in the package.json but if you need to add it again then the command is:

`npm install --save-dev grafana/grafana-sdk-mocks`

It also contains a TypeScript Typings file - common.d.ts that you can refer to in your classes that use classes or functions from core Grafana. Use the following [triple slash directive](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html) to use Grafana classes in your code. The directive will point the TypeScript compiler at the mocks package so that it can find the files it needs to build. Place the directive at the top of all your TypeScript files:

```js
///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
```

### Unit Testing with Karma and Mocha and ExpectJS

The Karma configuration uses the SystemJS TypeScript plugin to load files from the src directory and transpile them on the fly. It also uses some simple fakes in the Mocks package so that you can unit test properly.

The settings for Karma are in the karma.conf.js file in the root. If you add any external files, then they need to be added to the SystemJS section to be used in tests.

### CHANGELOG

#### v0.0.1

- First version.
