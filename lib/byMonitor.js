const helper = require('./helper.js');
const insights = require('./insights.js');
const plugins = require('./plugins.js');

////////////////////////////////////////////////////////////////////////////////
// These functions are run if there are a small number of monitors
// * getMonitorList() - gets the unique monitors
// * getMonitorStatus() - gets the latest location result for each monitor
// * calculateMonitorMetrics() - turns the monitor result into plugin data
////////////////////////////////////////////////////////////////////////////////

// Insights queries
var monitorStatusNRQL = "SELECT latest(result), latest(duration) FROM SyntheticCheck FACET locationLabel WHERE monitorName = '{monitorName}' SINCE 15 minutes ago LIMIT 100"

// Initialize
var byMonitor = {};
var startTime = rspCount = errCount = totCount = 0;

// Start the query cycle
byMonitor.start = function(configId, monitors) {
  // Re-initialize all the local variables
  startTime = Date.now();
  rspCount = errCount = 0;
  totCount = monitors.length;
  
  // Get the status for each monitor
  for (var i=0; i < monitors.length; i++) {
    var monitorName = monitors[i];
    getMonitorStatus(monitorName, configId);
  }
}

// Get the location status and duration for the given monitor
var getMonitorStatus = function(monitorName, configId) {
  logger.debug('- getMonitorStatus for: ' + monitorName);
  var escapedName = monitorName.replace('\'', '\\\'');
  var nrql = monitorStatusNRQL.replace('{monitorName}', escapedName);
  insights.query(nrql, configId, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      rspCount++;
      calculateMonitorMetrics(monitorName, body.facets, configId);
    } else {
      errCount++;
      helper.logError('Insights Location Status Query', error, response, body);
    }

    // Once we have all the calls log out the error rate
    var runningCount = rspCount + errCount;
    if (runningCount == totCount) {
      var evt = {
        eventType: 'ExtraSyntheticsPluginStats',
        approach: 'byMonitor',
        errorCount: errCount,
        responseCount: rspCount,
        totalCount: totCount,
        errorRate: (100 * errCount / totCount).toFixed(2),
        duration: Date.now() - startTime
      }
      logger.debug('-', evt);
      insights.publish(evt, configId, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          logger.debug('Posted Insights event for ' + monitorName);
        } else {
          helper.logError('Insights POST', error, response, body);
        }
      });
    }
  });
}

// Helper function reads the latest result and duration and calculates all metrics
// Result % (success / fail) and Duration per location
// Overall Result % (success / fail) and Duration
var calculateMonitorMetrics = function(monitorName, facets, configId) {
  var successCount = 0;
  var sumDuration = 0;
  var pluginMetricArr = {};
  var insightsMetricArr = {};
  
  for (var i = 0; i < facets.length; i++) {
    var locationName = 'Location/' + facets[i].name;
    var locResult = facets[i].results[0].latest;
    var locDuration = facets[i].results[1].latest;
    
    // Create the metric names for this location
    var metricSuccessPct = plugins.makeMetricName(locationName, 'Success', 'pct');
    var metricFailPct = plugins.makeMetricName(locationName, 'Failure', 'pct');
    var metricDuration = plugins.makeMetricName(locationName, 'Duration', 'ms');
    pluginMetricArr[metricDuration] = locDuration;

    sumDuration += locDuration;
    if (locResult == 'SUCCESS') {
      successCount++;
      pluginMetricArr[metricSuccessPct] = 100;
      pluginMetricArr[metricFailPct] = 0;
    } else {
      pluginMetricArr[metricSuccessPct] = 0;
      pluginMetricArr[metricFailPct] = 100;
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
  
  // Store the values in the plugin metric array
  pluginMetricArr[metricRollupSuccessCount] = successCount;
  pluginMetricArr[metricRollupSuccessPct] = successRate;
  pluginMetricArr[metricRollupFailCount] = facets.length - successCount;
  pluginMetricArr[metricRollupFailPct] = 100 - successRate;
  pluginMetricArr[metricRollupDuration] = avgDuration;

  // Store the values in the insights metric array
  insightsMetricArr['successCount'] = successCount;
  insightsMetricArr['successRate'] = successRate;
  insightsMetricArr['failCount'] = facets.length - successCount;
  insightsMetricArr['failRate'] = 100 - successRate;
  insightsMetricArr['locationCount'] = facets.length;
  insightsMetricArr['duration'] = avgDuration;
  
  plugins.reportMetric(monitorName, pluginMetricArr, configId);
  insights.reportEvent(monitorName, insightsMetricArr, configId);
}

module.exports = byMonitor;
