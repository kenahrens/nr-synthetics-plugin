const insights = require('./lib/insights.js');
const plugins = require('./lib/plugins.js');
const config = require('config');
const CronJob = require('cron').CronJob;
const winston = require('winston');
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp: function() {return new Date().toUTCString();},
      level: 'debug'
    })
  ]
})

// Insights queries
var monitorListNQRL = "SELECT uniques(monitorName) FROM SyntheticCheck";
var locationStatusNRQL = "SELECT latest(result) FROM SyntheticCheck FACET locationLabel WHERE monitorName = '{monitorName}'"

// Publish the event to the Insights API
var reportEvent = function(monitorName, successRate, configId) {
  var event = {};
  event.eventType = 'SyntheticsLocation';
  event.timestamp = new Date().getTime();
  event.monitorName = monitorName;
  event.successRate = successRate;

  logger.debug('reportEvent: ');
  logger.debug(event);
  insights.publish(event, configId, function(error, response, body) {
    if (error) {
      logger.error('Error in Insights POST');
      logger.error(error);
    } else if (response.statusCode != 200) {
      logger.error('Response to Insights POST: ' + response.statusCode);
      logger.error(body);
    }
  });
}

// Publish the metric to the Plugin API
var reportMetric = function(monitorName, successRate, configId) {
  logger.debug('reportMetric: ' + monitorName + ' (' + successRate + ')');
  var successMetricName = plugins.makeMetricName(monitorName, 'Location Success', 'pct');
  var failMetricName = plugins.makeMetricName(monitorName, 'Location Fail', 'pct');
  var metricArr = {};
  metricArr[successMetricName] = successRate;
  metricArr[failMetricName] = 100 - successRate;
  // plugins.post(metricArr, configId, function(error, response, body) {
  //   if (error) {
  //     logger.error('Error in Plugin POST');
  //     logger.error(error);
  //   } else if (response.statusCode != 200) {
  //     logger.error('Response to Plugin POST: ' + response.statusCode);
  //     logger.error(body);
  //   }
  // });
}

// Get the location status for the given monitor
var getLocationStatus = function(monitorName, configId) {
  logger.debug('getLocationStatus for: ' + monitorName);
  var nrql = locationStatusNRQL.replace('{monitorName}', monitorName);
  insights.query(nrql, configId, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var facets = body.facets;
      var success = 0;
      for (var i = 0; i < facets.length; i++) {
        var latest = facets[i].results[0].latest;
        if (latest == 'SUCCESS') {
          success++;
        }
      }
      var successRate = 100 * success / facets.length;
      reportMetric(monitorName, successRate, configId);
      reportEvent(monitorName, successRate, configId);
    } else {
      if (error) {
        logger.error('Error on Insights location status call');
        logger.error(error);
      } else {
        logger.error('Response to Insights location status: ' + response.statusCode);
        logger.error(body);
      }
    }
  });
}

// Get the list of monitors
var getMonitorList = function(configId) {
  logger.info('getMonitorList for: ' + configId);
  var nrql = monitorListNQRL;
  insights.query(nrql, configId, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var monitors = body.results[0].members;
      for (var i = 0; i < monitors.length; i++) {
        var monitorName = monitors[i];
        getLocationStatus(monitorName, configId);
      }
    } else {
      if (error) {
        logger.error('Error on Insights monitor list call');
        logger.error(error);
      } else {
        logger.error('Response to Insights monitor list: ' + response.statusCode);
        logger.error(body);
      }
    }
  });
}

// Run every {duration} seconds
var cronTime = '*/15 * * * * *';
var job = new CronJob(cronTime, function() {
  logger.info('Starting poll cycle with env: ' + process.env.NODE_ENV);
  var configArr = config.get('configArr');
  for (var i = 0; i < configArr.length; i++) {
    var configId = configArr[i];
    getMonitorList(configId);
  }
});
job.start();
logger.info('Synthetics Plugin started');