# New Relic Synthetics Plugin
This plugin runs queries against New Relic Insights to calculate things like % of locations with a failure.

### Setup Environment Variables
Set 2 environment variables to the correct values for your account, this works if you're using a single account. 
* NEWRELIC_ACCOUNT_ID maps to accountId
* NEWRELIC_INSIGHTS_QUERY_KEY maps to insightsQueryKey