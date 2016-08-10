const insights = require('./lib/insights.js');
const plugins = require('./lib/plugins.js');

const CronJob = require('cron').CronJob;
const winston = require('winston');
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp: function() {return new Date().toUTCString();}
    })
  ]
})

// Configuration used for Insights queries
var configId = 'newrelic';
var monitorListNQRL = "SELECT uniques(monitorName) FROM SyntheticCheck";
var locationStatusNRQL = "SELECT latest(result) FROM SyntheticCheck FACET locationLabel WHERE monitorName = '{monitorName}'"

// Publish the metric to the Plugin API
var reportMetric = function(monitorName, successRate, configId) {
  logger.info('Report Metric: ' + monitorName + ' (' + successRate + ')');
  var successMetricName = plugins.makeMetricName(monitorName, 'Location Success', 'pct');
  var failMetricName = plugins.makeMetricName(monitorName, 'Location Fail', 'pct');
  var metricArr = {};
  metricArr[successMetricName] = successRate;
  metricArr[failMetricName] = 100 - successRate;
  plugins.post(metricArr, configId, function(error, response, body) {
    if (response.statusCode == 200) {
      logger.info(body);
    } else {
      logger.error('Response to Plugin POST: ' + response.statusCode);
      logger.error(body);
    }
  });
}

// Get the location status for the given monitor
var getLocationStatus = function(monitorName) {
  logger.info('Get status for: ' + monitorName);
  var nrql = locationStatusNRQL.replace('{monitorName}', monitorName);
  insights.query(nrql, configId, function(error, response, body) {
    if (response.statusCode == 200) {
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
    } else {
      logger.error('Response to Insights location status: ' + response.statusCode);
      logger.error(body);
    }
  });
}

// Get the list of monitors
var getMonitorList = function() {
  var nrql = monitorListNQRL;
  insights.query(nrql, configId, function(error, response, body) {
    if (response.statusCode == 200) {
      var monitors = body.results[0].members;
      for (var i = 0; i < monitors.length; i++) {
        var monitorName = monitors[i];
        getLocationStatus(monitorName);
      }
    } else {
      logger.error('Response to Insights monitor list: ' + response.statusCode);
      logger.error(body);
    }
  });
}

// Run every {duration} seconds
var cronTime = '*/30 * * * * *';
var job = new CronJob(cronTime, function() {
  logger.info('Starting poll');
  getMonitorList();
});
job.start();
logger.info('Job started');