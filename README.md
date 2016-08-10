# New Relic Synthetics Plugin
[![Build Status](https://travis-ci.org/kenahrens/nr-synthetics-plugin.svg?branch=master)](https://travis-ci.org/kenahrens/nr-synthetics-plugin)

This plugin runs queries against New Relic Insights to calculate things like % of locations with a failure.

### Multi Account: Configuration JSON
If you want to query metrics from multiple accounts and post to a specific result account, you must setup a JSON config file of your own.

### Single Account: Environment Variables
If you want to query metrics from a single account and post to the same account, you can just set these 3 environment variables:
* NEWRELIC_LICENSE_KEY maps to licenseKey (for plugin to publish metrics)
* NEWRELIC_ACCOUNT_ID maps to accountId
* NEWRELIC_INSIGHTS_QUERY_KEY maps to insightsQueryKey (for plugin to query metrics)
