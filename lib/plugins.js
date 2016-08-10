const request = require('request');
const config = require('config');

// Define the initial API
var plugins = {};
plugins.post = function post(metric, configId, cb) {
  
  // Look up config items
  var licenseKey = config.get(configId + '.licenseKey');
  var options = {
    'method': 'POST',
    'uri': 'https://platform-api.newrelic.com/platform/v1/metrics',
    'headers': {'X-License-Key': licenseKey},
    'json': true
  };

  // Call the API
  request(options, cb);
}

plugins.makeJsonMetric = function makeMetric(metricName, metricValue) {
  var fullMetricName = "Component/" + metricName;
  var jsonMetric = { };
  jsonMetric["metrics"] = { };
  jsonMetric.metrics[fullMetricName] = metricValue;
  return jsonMetric;
}

module.exports = plugins;
