const request = require('request');
const config = require('config');
const version = require('../package.json').version;
const os = require('os');

// Define the initial API
var plugins = {};

// This will prepare the overall JSON Message
plugins.makeJsonMessage = function makeJsonMessage(configId, metricArr) {
  
  var guid = config.get('guid');
  var duration = config.get('duration');

  // Create the message to publish
  var msg = {};
  var agent = {};
  msg.agent = agent;
  agent.host = os.hostname();
  agent.pid = process.pid;
  agent.version = version;

  // Create the components array
  var components = [];
  msg.components = components;
  components[0] = {};
  components[0].name = configId;
  components[0].guid = guid;
  components[0].duration = duration;
  components[0].metrics = metricArr;

  return msg;
}

// This call creates the metric name fragment
plugins.makeMetricName = function makeMetricName(monitorName, metricName, units) {
  var fullMetricName = 'Component/' + monitorName + '/' + metricName + '[' + units + ']';
  return fullMetricName;
}

// This call will POST to New Relic
plugins.post = function post(metricArr, configId, cb) {
  
  // Look up config items
  var licenseKey = config.get('licenseKey');

  // Create the options, note the body is built on the fly
  var options = {
    'method': 'POST',
    'uri': 'https://platform-api.newrelic.com/platform/v1/metrics',
    'headers': {'X-License-Key': licenseKey},
    'json': true,
    'body': plugins.makeJsonMessage(configId, metricArr)
  };

  // Call the API
  // console.log('PLUGINS POST');
  // console.log(options.body.components[0].metrics);
  request(options, cb);
}

module.exports = plugins;
