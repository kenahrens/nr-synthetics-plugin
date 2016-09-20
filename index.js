const insights = require('./lib/insights.js');
const plugins = require('./lib/plugins.js');
const config = require('config');
const CronJob = require('cron').CronJob;
const winston = require('winston');
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp: function() {return new Date().toUTCString();},
      level: 'info'
    })
  ]
})

// Insights queries
var monitorListNQRL = "SELECT uniques(monitorName) FROM SyntheticCheck";
var locationStatusNRQL = "SELECT latest(result), latest(duration) FROM SyntheticCheck FACET locationLabel WHERE monitorName = '{monitorName}'"

// Global variables
var freq = config.get('duration');
var configArr = config.get('configArr')
var guid = config.get('guid');
var cronTime = '*/' + freq + ' * * * * *';
var single = true;

// Publish the event to the Insights API
// var reportEvent = function(monitorName, successRate, configId) {
//   var event = {};
//   event.eventType = 'SyntheticsLocation';
//   event.timestamp = new Date().getTime();
//   event.monitorName = monitorName;
//   event.successRate = successRate;

//   logger.debug('reportEvent: ');
//   logger.debug(event);
//   insights.publish(event, configId, function(error, response, body) {
//     if (error) {
//       logger.error('Error in Insights POST');
//       logger.error(error);
//     } else if (response.statusCode != 200) {
//       logger.error('Response to Insights POST: ' + response.statusCode);
//       logger.error(body);
//     }
//   });
// }

var reportMetric = function(monitorName, metricArr, configId) {
  plugins.post(monitorName, metricArr, configId, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      logger.debug('Posted ' + Object.keys(metricArr).length + ' metrics to ' + monitorName);
    } else {
      if (error) {
        logger.error('Error in Plugin POST');
        logger.error(error);
      } else {
        logger.error('Response to Plugin POST: ' + response.statusCode);
        logger.error(body);
      }
    }
  });
}

// Helper function reads the latest result and duration and calculates all metrics
// Result % (success / fail) and Duration per location
// Overall Result % (success / fail) and Duration
var calculateMetrics = function(monitorName, facets, configId) {
  var successCount = 0;
  var sumDuration = 0;
  var metricArr = {};
  
  for (var i = 0; i < facets.length; i++) {
    var locationName = 'Location/' + facets[i].name;
    var locResult = facets[i].results[0].latest;
    var locDuration = facets[i].results[1].latest;
    
    // Create the metric names for this location
    var metricSuccessPct = plugins.makeMetricName(locationName, 'Success', 'pct');
    var metricFailPct = plugins.makeMetricName(locationName, 'Failure', 'pct');
    var metricDuration = plugins.makeMetricName(locationName, 'Duration', 'ms');
    metricArr[metricDuration] = locDuration;

    sumDuration += locDuration;
    if (locResult == 'SUCCESS') {
      successCount++;
      metricArr[metricSuccessPct] = 100;
      metricArr[metricFailPct] = 0;
    } else {
      metricArr[metricSuccessPct] = 0;
      metricArr[metricFailPct] = 100;
    }
  }

  var successRate = 100 * successCount / facets.length;
  var avgDuration = sumDuration / facets.length;

  // Create the rollup metric names
  var metricRollupSuccessCount = plugins.makeMetricName('Overall', 'Success', 'count'); 
  var metricRollupSuccessPct = plugins.makeMetricName('Overall', 'Success', 'pct');
  var metricRollupFailCount = plugins.makeMetricName('Overall', 'Failure', 'count'); 
  var metricRollupFailPct = plugins.makeMetricName('Overall', 'Failure', 'pct');
  var metricRollupDuration = plugins.makeMetricName('Overall', 'Duration', 'ms');
  
  // Store the values in the metric array
  metricArr[metricRollupSuccessCount] = successCount;
  metricArr[metricRollupSuccessPct] = successRate;
  metricArr[metricRollupFailCount] = facets.length - successCount;
  metricArr[metricRollupFailPct] = 100 - successRate;
  metricArr[metricRollupDuration] = avgDuration;

  reportMetric(monitorName, metricArr, configId);
  // reportEvent(monitorName, successRate, configId);
}

// Get the location status and duration for the given monitor
var getLocationStatus = function(monitorName, configId) {
  logger.debug('getLocationStatus for: ' + monitorName);
  var nrql = locationStatusNRQL.replace('{monitorName}', monitorName);
  insights.query(nrql, configId, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      calculateMetrics(monitorName, body.facets, configId);
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
  logger.info('getMonitorList for config: ' + configId);
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
var job = new CronJob(cronTime, function() {
  var env = process.env.NODE_ENV;
  if (env == null) {
    env = 'default';
  }
  logger.info('Starting poll cycle with NODE_ENV Environment: ' + env);
  
  // Loop through each of the configurations 
  for (var i = 0; i < configArr.length; i++) {
    var configId = configArr[i];
    getMonitorList(configId);
  }
});

// Determine if this is single config or multi config
logger.info('Synthetics Plugin started:');
logger.info('* GUID: ' + guid);
logger.info('* Frequency is every ' + freq + 's, cron: (' + cronTime + ')');
if (configArr.length == 1) {
  logger.info('* Running as a single config.');
  single = true;
} else {
  logger.info('* Running as a multi config.');
  single = false;
}
job.start();
