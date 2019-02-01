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

// return: List of monitors grouped in chunks
byMonitor.splitMonitorArray=function( { monitors=[], chunk=20 }  ){

    let monitorArrayList=[]
    for (let i=0, j=monitors.length; i< j; i+=chunk) {
        monitorArrayList.push( monitors.slice(i,i+chunk))
    }

    return monitorArrayList
}


byMonitor.getMonitorsStatus = async function({monitors=[], configId=''}){
    if (configId == '' || monitors.length == 0){

        let msg= `Missing parameters monitors len= ${monitors.length} configId=${configId}`
        helper.logError(msg, Error(msg));
        return
    }

    let monitorList = monitors.reduce((acc, cur)=>{
                                        if (acc.length >0){
                                            acc+=","
                                        }
                                        return  acc+`\'${cur.replace(/\'/g, "\\'")}\'`
                                    }, '' )

    let {accountId, insightsQueryKey} = helper.getInsightsQueryConfig(configId);

    let nrql=`SELECT latest(result), latest(duration) FROM SyntheticCheck FACET locationLabel,monitorName WHERE monitorName in ( ${monitorList} ) SINCE 5 minutes ago limit 100`
    let jsonResp  = await insights.queryAsync({nrql, accountId, insightsQueryKey})

    return jsonResp
}


/*

Sample Facets input:
{"facets":[{"name":["Columbus, OH, USA","monitorname"],"results":[{"latest":"SUCCESS"},{"latest":267.11}]}

Output: Map of Parsed Monitor check status
   {
        "monitor id":{
                "locations":[
                                { "label":"location label",  "status": "SUCCESS", "duration": 12345}
                            ],
                "statistics":{
                       successCount:0,
                        locationCount:0,
                        totalDuration:0,
                        avgDuration:0,
                        successRate:0,
                        failRate:0,
                        failCount:0
                }
          }

          ....
    }

*/
byMonitor.parseFacets= ( {facets} )=>{

    let monitorMap={}

    if (typeof(facets) == 'undefined' || facets.length == 0){
        let msg= `Missing facets  len= ${facets.length}`
        helper.logError(msg, Error(msg));
    }

    for (entry of facets){
        let [location, monitor] = entry.name
        if ( typeof(monitorMap[monitor]) == 'undefined') {
            monitorMap[monitor]={
                locations:[],
                statistics:{
                    successCount:0,
                    locationCount:0,
                    totalDuration:0,
                    avgDuration:0,
                    successRate:0,
                    failRate:0,
                    failCount:0
                }
            }
        }

        let [statusProp, durationProp] = entry.results
        let locationStat={
            label: location,
            status:statusProp.latest ,
            duration: durationProp.latest
        }

        monitorMap[monitor].locations.push(locationStat)
        monitorMap[monitor].statistics.successCount += (statusProp.latest =="SUCCESS")?1:0
        monitorMap[monitor].statistics.locationCount+= 1
        monitorMap[monitor].statistics.totalDuration+= durationProp.latest

        // avgDuration = totalDuration / locationCount
        monitorMap[monitor].statistics.avgDuration =  (monitorMap[monitor].statistics.totalDuration) / monitorMap[monitor].statistics.locationCount
        // successRate = successCount / locationCount  * 100
        monitorMap[monitor].statistics.successRate = 100 *  (monitorMap[monitor].statistics.successCount / monitorMap[monitor].statistics.locationCount)
        // failRate =  100 - successRate
        monitorMap[monitor].statistics.failRate = 100 - monitorMap[monitor].statistics.successRate
        // failCount =  locationCount - successCount
        monitorMap[monitor].statistics.failCount = monitorMap[monitor].statistics.locationCount -  monitorMap[monitor].statistics.successCount
    }
    return monitorMap
}

//
// parsedFacetMap - Map using monitor name as keys
// see parseFacets() output for this method's input
/*
OUTPUT:  Map of plugin statistics
 {
    "monitor name":
                {
                  "Component/Location/<location>[ms]": 451.979741,
                  "Component/Location/<location>/Success[pct]": 100,
                  "Component/Location/<location>/Failure[pct]": 0,
                  "Component/Overall/Success[count]": 5,
                  "Component/Overall/Success[pct]": 100,
                  "Component/Overall/Failure[count]": 0,
                  "Component/Overall/Failure[pct]": 0,
                  "Component/Overall/Duration[ms]": 221.2998142
                }
        ....
 }

 */
byMonitor.createPluginMap=(  parsedFacetMap )=> {

    var pluginMetricMap={}

    if (typeof (parsedFacetMap) == 'undefined' ||  Object.keys(parsedFacetMap).length ==0){
        let msg= "Missing parameters parsedFacet"
        helper.logError(msg, Error(msg));
        return
    }

    //
    for (let monitorName in parsedFacetMap) {


        var pluginMetricArr = {};

        var monitor = parsedFacetMap[monitorName]
        var locations = monitor.locations
        for (let location of locations){

            let locationName = 'Location/' + location.label
            let locResult = location.status
            let locDuration = location.duration

            // Create the metric names for this location
            let metricSuccessPct = plugins.makeMetricName(locationName, 'Success', 'pct')
            let metricFailPct = plugins.makeMetricName(locationName, 'Failure', 'pct')
            let metricDuration = plugins.makeMetricName(locationName, 'Duration', 'ms')

            pluginMetricArr[metricDuration] = locDuration
            pluginMetricArr[metricSuccessPct] = 100
            pluginMetricArr[metricFailPct] = 0

            if (locResult != 'SUCCESS') {
                pluginMetricArr[metricSuccessPct] = 0
                pluginMetricArr[metricFailPct] = 100
            }
        }

        // Create the rollup metric names
        var metricRollupSuccessCount = plugins.makeMetricName('Overall', 'Success', 'count')
        var metricRollupSuccessPct = plugins.makeMetricName('Overall', 'Success', 'pct')
        var metricRollupFailCount = plugins.makeMetricName('Overall', 'Failure', 'count')
        var metricRollupFailPct = plugins.makeMetricName('Overall', 'Failure', 'pct')
        var metricRollupDuration = plugins.makeMetricName('Overall', 'Duration', 'ms')

        // Store the values in the plugin metric array
        pluginMetricArr[metricRollupSuccessCount] = monitor.statistics.successCount
        pluginMetricArr[metricRollupSuccessPct] =   monitor.statistics.successRate
        pluginMetricArr[metricRollupFailCount]  =   monitor.statistics.failCount
        pluginMetricArr[metricRollupFailPct]    =   monitor.statistics.failRate
        pluginMetricArr[metricRollupDuration]   =   monitor.statistics.avgDuration

        pluginMetricMap[monitorName]=pluginMetricArr
    }

    return pluginMetricMap

}


//
// parsedFacetMap - Map using monitor name as keys
// see parseFacets() output for this method's input
/*
OUTPUT:

    {
        "monitor name":
                        {
                      "successCount": 5,
                      "successRate": 100,
                      "failCount": 0,
                      "failRate": 0,
                      "locationCount": 5,
                      "duration": 221.2998142
                }
        ...

    }

 */
byMonitor.createInsightsMap=(  parsedFacetMap )=> {

    var insightsMetricMap={}

    if (typeof (parsedFacetMap) == 'undefined' ||  Object.keys(parsedFacetMap).length ==0){
        let msg= "Missing parameters parsedFacet"
        helper.logError(msg, Error(msg));
        return
    }


    for (let monitorName in parsedFacetMap) {

        var monitor = parsedFacetMap[monitorName]
        var insightsMetricArr = {};

        // Store the values in the insights metric array
        insightsMetricArr['successCount']   = monitor.statistics.successCount;
        insightsMetricArr['successRate']    = monitor.statistics.successRate;
        insightsMetricArr['failCount']      = monitor.statistics.failCount;
        insightsMetricArr['failRate']       = monitor.statistics.failRate;
        insightsMetricArr['locationCount']  = monitor.statistics.locationCount;
        insightsMetricArr['duration']       = monitor.statistics.avgDuration;


        insightsMetricMap[monitorName]=insightsMetricArr
    }

    return insightsMetricMap

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
