const helper = require('./helper.js');
const insights = require('./insights.js');
const plugins = require('./plugins.js');

////////////////////////////////////////////////////////////////////////////////
// These functions are run if there are a smaller number of locations
// * getLocationList() - gets the unique locations
// * getLocationStatus() - gets the latest monitor result for each location
// * calculateLocationMetrics() - turns the location result into plugin data
////////////////////////////////////////////////////////////////////////////////

// Insights queries
var monitorStatusNRQL = "SELECT latest(result), latest(duration) FROM SyntheticCheck FACET monitorName WHERE locationLabel = '{locationLabel}' SINCE 15 minutes ago LIMIT 1000"

// Initialize
var byLocation = {};
var startTime = rspCount = errCount = totCount = 0;
var locationStorage = {};

// Start the query cycle
byLocation.start = function(configId, locations) {
  
  // Re-initialize all the local variables
  startTime = Date.now();
  rspCount = errCount = 0;
  locationStorage = {};
  totCount = locations.length;

  // Create the NRQL query with a filter statement for each location
  var filterNRQL = makeFilterNRQL(locations);
  insights.query(filterNRQL, configId, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var facets = body.facets;
      logger.info('- There are: ' + facets.length + ' monitors');
      for (var i=0; i < facets.length; i++) {
        var facet = facets[i];
        calculateMetrics(facet, locations, configId);
      }
      logger.info('- Processing complete for : ' + facets.length + ' monitors');
    } else {
      helper.logError('Insights filter NRQL error', error, response, body);
    }
  });
}

// Helper function to make the entire NRQL query: SELECT filter(BLAH), filter(BLAH) FROM BLAH
var makeFilterNRQL = function(locations) {

  // Start by putting in the first location
  var filterNRQL = "SELECT ";
  filterNRQL += makeFilter(locations[0]);
  
  // Add a comma and then each subsequent location
  for (var i=1; i < locations.length; i++) {
    var locationLabel = locations[i];
    filterNRQL += ', ' + makeFilter(locations[i]);
  }

  // Close off the NRQL query
  filterNRQL += ' FROM SyntheticCheck FACET monitorName LIMIT 1000';
  return filterNRQL;
}

// This will just make a single filter section for the query
var makeFilter = function(locationLabel) {
  var snippet = 'filter(latest(result), WHERE locationLabel=\'';
  snippet += locationLabel;
  snippet += '\'),';
  snippet += ' filter(latest(duration), WHERE locationLabel=\'';
  snippet += locationLabel;
  snippet += '\')';
  return snippet;
}

var calculateMetrics = function(facet, locations, configId) {
  var successCount = 0;
  var sumDuration = 0;
  var locationCount = 0;
  var pluginMetricArr = {};
  var insightsMetricArr = {};
  
  // This is the monitor we have metrics about
  var monitorName = facet.name;
  var results = facet.results;

  // Loop through the list of locations
  for (var i=0; i < locations.length; i++) {
    var locationName = 'Location/' + locations[i];
    
    // Get the latest result and duration for this location
    var idxResult = i * 2;
    var idxDuration = (i * 2) + 1;
    var locResult = results[idxResult].latest;
    var locDuration = results[idxDuration].latest;

    // Only count this location if non-null
    if (locResult != null) {
      locationCount++;

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
  }

  var successRate = 100 * successCount / locationCount;
  var avgDuration = sumDuration / locationCount;

  // Create the rollup metric names
  var metricRollupSuccessCount = plugins.makeMetricName('Overall', 'Success', 'count'); 
  var metricRollupSuccessPct = plugins.makeMetricName('Overall', 'Success', 'pct');
  var metricRollupFailCount = plugins.makeMetricName('Overall', 'Failure', 'count'); 
  var metricRollupFailPct = plugins.makeMetricName('Overall', 'Failure', 'pct');
  var metricRollupDuration = plugins.makeMetricName('Overall', 'Duration', 'ms');
  
  // Store the values in the plugin metric array
  pluginMetricArr[metricRollupSuccessCount] = successCount;
  pluginMetricArr[metricRollupSuccessPct] = successRate;
  pluginMetricArr[metricRollupFailCount] = locationCount - successCount;
  pluginMetricArr[metricRollupFailPct] = 100 - successRate;
  pluginMetricArr[metricRollupDuration] = avgDuration;

  // Store the values in the insights metric array
  insightsMetricArr['successCount'] = successCount;
  insightsMetricArr['successRate'] = successRate;
  insightsMetricArr['failCount'] = locationCount - successCount;
  insightsMetricArr['failRate'] = 100 - successRate;
  insightsMetricArr['locationCount'] = locationCount;
  insightsMetricArr['duration'] = avgDuration;
  
  plugins.reportMetric(monitorName, pluginMetricArr, configId);
  insights.reportEvent(monitorName, insightsMetricArr, configId);
}


module.exports = byLocation;