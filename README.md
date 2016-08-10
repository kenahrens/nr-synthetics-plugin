# New Relic Synthetics Plugin
[![Build Status](https://travis-ci.org/kenahrens/nr-synthetics-plugin.svg?branch=master)](https://travis-ci.org/kenahrens/nr-synthetics-plugin)

This plugin runs queries against New Relic Insights to calculate things like % of locations with a failure.

## Installation and Setup
Here are the steps to get set up with this plugin:
* Pre-requisite is NodeJS (4.x or newer) and npm
* Clone or download this repository
* Once in the directory run ```npm install```
* Setup your configuration either for single account or multi account

Once you are all set up you can run the plugin with ```npm start```

## Metrics Included
This plugin currently calculates and publishes the following metrics:
* Component/{monitorName}/Location Success[pct]
* Component/{monitorName}/Location Fail[pct]

At this time (version 1.0.0) there are no rollup metrics.

### Multi Account: Configuration JSON
If you want to query metrics from multiple accounts and post to a specific result account, you must setup a JSON config file of your own. Then before you run the plugin you want to set an environment variable ```NODE_ENV``` with a value of the name of your configuration. Here is an example of how to setup a custom JSON file with multiple sets of keys. At runtime you must set NODE_ENV to the name of this config. (Note that if you want to change the GUID you can put a new value in your custom config and it will over-ride the value in default.json.)
```
{
  "configArr": [
    "MasterAccount",
    "SubAccount1",
    "SubAccount2"
  ],
  "MasterAccount": {
    "accountId": "",
    "insightsQueryKey": ""
  },
  "SubAccount1": {
    "accountId": "",
    "insightsQueryKey": ""
  },
  "SubAccount2": {
    "accountId": "",
    "insightsQueryKey": ""
  }
}
```

### Single Account: Environment Variables
If you want to query metrics from a single account and post to the same account, you can just set these 3 environment variables:
* NEWRELIC_LICENSE_KEY maps to licenseKey (for plugin to publish metrics)
* NEWRELIC_ACCOUNT_ID maps to accountId
* NEWRELIC_INSIGHTS_QUERY_KEY maps to insightsQueryKey (for plugin to query metrics)

### Running the Plugin

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
