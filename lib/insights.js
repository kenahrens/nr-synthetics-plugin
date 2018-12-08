const request = require('request');
const config = require('config');
const helper = require('./helper.js');

// Define the initial API
var insights = {};
insights.query = function query(nrql, configId, cb) {

  // Look up config items
  var {accountId, insightsQueryKey} =helper.getInsightsQueryConfig(configId)

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
    },
    'timeout': 10000
  };

  // Call the API and check for error
  request(options, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      cb(error, response, body);
    } else {
      // First retry
      helper.logError('Insights query error (attempt #1)', error, response, body);
      request(options, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          cb(error, response, body);
        } else {
          // Second retry
          helper.logError('Insights query error (attempt #2)', error, response, body);
          request(options, cb);
        }
      });
    }
  });
  // request(options, cb);
}

insights.publish = function publish(eventArr, configId, cb) {

  // Look up config items
  var {accountId,insightsInsertKey }  = helper.getInsightsInsertConfig(configId)

  // URI changes for every account
  var uri = 'https://insights-collector.newrelic.com/v1/accounts/' +
    accountId + '/events';

  var options = {
    'method': 'POST',
    'uri': uri,
    'headers': {'X-Insert-Key': insightsInsertKey},
    'json': true,
    'body': eventArr,
    'timeout': 10000
  }

  // Call the API
  request(options, cb);
}

insights.reportEvent = function(monitorName, insightsMetricArr, configId) {
  var evt = {};
  evt.eventType = 'ExtraSyntheticsInfo';
  evt.timestamp = new Date().getTime();
  evt.monitorName = monitorName;
  for (var attribute in insightsMetricArr) {
    evt[attribute] = insightsMetricArr[attribute];
  }

  insights.publish(evt, configId, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      logger.debug('- Posted Insights event for ' + monitorName);
    } else {
      helper.logError('Insights POST', error, response, body);
    }
  });
}

module.exports = insights;
