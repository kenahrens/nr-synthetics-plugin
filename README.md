# New Relic Synthetics Plugin
[![Build Status](https://travis-ci.org/kenahrens/nr-synthetics-plugin.svg?branch=master)](https://travis-ci.org/kenahrens/nr-synthetics-plugin)

This plugin runs queries against New Relic Insights to calculate things like % of locations with a failure. It works by querying Insights every 30 seconds, calculating the new metrics (like % of failing locations) and publishing the results as Plugin metrics.

## Installation and Setup
Here are the steps to get set up with this plugin:
* Pre-requisite is NodeJS (4.x or newer) and npm
* Clone or download this repository
* Once in the directory run ```npm install```
* Setup your configuration for a single account

Once you are all set up you can run the plugin with ```npm start```

## Metrics Included
For every monitor that has reported data, this plugin currently will calculate and publish the following metrics:
* Component/Location/{locationName}/Success[pct]
* Component/Location/{locationName}/Failure[pct]
* Component/Location/{locationName}/Duration[ms]
* Component/Overall/Success[pct]
* Component/Overall/Success[count]
* Component/Overall/Failure[pct]
* Component/Overall/Failure[count]
* Component/Overall/Duration[ms]

## Configure for a Single Account
There is a config file `default.json` which defines the required keys. You have 2 options for how to configure the keys:
* Config File: Copy `default.json` and create your own config file
* Environment Variables: Set environment variables

### Single Account: Config file
Copy `default.json` and to your own file like `ken-config.json`. At runtime, you must define an environment variable ```NODE_ENV``` and set to the name of your file **(NOTE: do not include the extension)**.

Example: `export NODE_ENV=ken-config.json`

### Single Account: Environment Variables
If you want to query metrics from a single account and post to the same account, you can just set these 3 environment variables:
* `NEWRELIC_LICENSE_KEY` maps to licenseKey (for plugin to publish metrics)
* `NEWRELIC_ACCOUNT_ID` maps to accountId
* `NEWRELIC_INSIGHTS_QUERY_KEY` maps to insightsQueryKey (for plugin to query metrics)
* `NEWRELIC_INSIGHTS_INSERT_KEY` maps to insightsInsertKey (for plugin to publish events)

### Running the Plugin Directly
You can run the plugin directly like so:
```
kahrens:nr-synthetics-plugin kahrens$ npm start

> nr-synthetics-plugin@2.0.0 start /Users/kahrens/Documents/github/nr-synthetics-plugin
> node index.js

Tue, 20 Sep 2016 13:35:29 GMT - info: Synthetics Plugin started:
Tue, 20 Sep 2016 13:35:29 GMT - info: * GUID: com.adg.synthetics.monitor.Synthetics
Tue, 20 Sep 2016 13:35:29 GMT - info: * Frequency is every 30s, cron: (*/30 * * * * *)
Tue, 20 Sep 2016 13:35:29 GMT - info: * Running as a single config.
```

## Running the Plugin with Forever
Or you can use forever to launch the plugin (and re-launch if it crashes):
```
kahrens:nr-synthetics-plugin kahrens$ ./node_modules/forever/bin/forever start index.js
warn:    --minUptime not set. Defaulting to: 1000ms
warn:    --spinSleepTime not set. Your script will exit if it does not stay up for at least 1000ms
info:    Forever processing file: index.js
```

This is how you get a list of all your forever processes:
```
kahrens:nr-synthetics-plugin kahrens$ ./node_modules/forever/bin/forever list
info:    Forever processes running
data:        uid  command             script   forever pid   id logfile                          uptime      
data:    [0] UKn_ /usr/local/bin/node index.js 70782   70783    /Users/kahrens/.forever/UKn_.log 0:0:0:8.935
```

And this is how you get the log:
```
kahrens:nr-synthetics-plugin kahrens$ ./node_modules/forever/bin/forever logs 0
data:    index.js:71019 - Mon, 22 Aug 2016 12:45:59 GMT - info: Synthetics Plugin started
data:    index.js:71019 - Mon, 22 Aug 2016 12:46:00 GMT - info: Starting poll cycle with env: multi
data:    index.js:71019 - Mon, 22 Aug 2016 12:46:00 GMT - info: getMonitorList for: Ahrens Design Group
data:    index.js:71019 - Mon, 22 Aug 2016 12:46:00 GMT - info: getMonitorList for: Demotron
```

This is how you stop your plugin, then run ```list``` to see it's no longer running.
```
kahrens:nr-synthetics-plugin kahrens$ ./node_modules/forever/bin/forever stop index.js
info:    Forever stopped process:
    uid  command             script   forever pid   id logfile                          uptime      
[0] UKn_ /usr/local/bin/node index.js 70782   70783    /Users/kahrens/.forever/UKn_.log 0:0:8:0.212
```

### Running the Tests
The tests work if you're using a single account and will make sure your node environment is setup properly. All you have to do to run them is:
```
kahrens:nr-synthetics-plugin kahrens$ npm test

> nr-synthetics-plugin@1.0.0 test /Users/kahrens/Documents/github/nr-synthetics-plugin
> mocha



  New Relic Insights API Test
    ✓ calls the query api (271ms)

  New Relic Plugin Make Metric Test
    ✓ makes a full metric name
    ✓ makes the complete metric JSON


  3 passing (283ms)
```
