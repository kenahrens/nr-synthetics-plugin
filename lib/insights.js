const request = require('request');
const config = require('config');

// Define the initial API
var insights = {};
insights.query = function query(nrql, configId, cb) {
  
  // Look up config items
  var accountId = config.get(configId + '.accountId');
  var insightsQueryKey = config.get(configId + '.insightsQueryKey');

  // URI changes for every account
  var uri = 'https://insights-api.newrelic.com/v1/accounts/' +
    accountId + '/query';

  var options = {
    'method': 'GET',
    'uri': uri,
    'headers': {'X-Query-Key': insightsQueryKey},
    'json': true,
    'qs': {
      'nrql': nrql
    }
  };

  // Call the API
  request(options, cb);
}

insights.publish = function publish(eventArr, configId, cb) {
  
  // Look up config items
  var accountId = config.get(configId + '.accountId');
  var insightsInsertKey = config.get(configId + '.insightsInsertKey');

  // URI changes for every account
  var uri = 'https://insights-collector.newrelic.com/v1/accounts/' +
    accountId + '/events';

  var options = {
    'method': 'POST',
    'uri': uri,
    'headers': {'X-Insert-Key': insightsInsertKey},
    'json': true,
    'body': eventArr
  }

  // Call the API
  request(options, cb);
}

module.exports = insights;
