const config = require('config');
const CronJob = require('cron').CronJob;
const version = require('./package.json').version;

// These are helper libraries
const helper = require('./lib/helper.js');
const insights = require('./lib/insights.js');
const plugins = require('./lib/plugins.js');

const byMonitor = require('./lib/byMonitor.js');
const byLocation = require('./lib/byLocation.js');
const syntheticsAPI = require ('./lib/syntheticsAPI')

// Insights queries
var uniqueCountNRQL = "SELECT uniques(monitorName), uniques(locationLabel) FROM SyntheticCheck";

// Global variables
var freq = config.get('duration');
var configArr = config.get('configArr')
var guid = config.get('guid');
var cronTime = '*/' + freq + ' * * * * *';
var single = true;

// Get the count of monitors and locations
var getUniqueCounts = function(configId) {
  logger.debug('getUniqueCounts for config: ' + configId);
  var nrql = uniqueCountNRQL;
  insights.query(nrql, configId, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      
      // Pull monitors and locations from the response
      var monitors = body.results[0].members;
      var monitorCount = monitors.length;
      var locations = body.results[1].members;
      var locationCount = locations.length;

      // Determine which approach will call Insights the least (# of locations or # of monitors)
      if (monitorCount > locationCount) {
        logger.info('- Query by location: (' + locationCount + ') locations < (' + monitorCount + ') monitors');
        byLocation.start(configId, locations);
      } else {
        logger.info('- Query by monitor: (' + monitorCount + ') monitors < (' + locationCount + ') locations');
        byMonitor.start(configId, monitors);
      }
    }
  });
}

async function getAllMonitors(configId, adminAPIKey ) {

    if ( (typeof(adminAPIKey)=='undefined' || (adminAPIKey.length==0))){
        logger.error ("getAllMonitors missing adminAPIKey")
        return []
    }

    let monitors = await syntheticsAPI.getAllMonitors({adminAPIKey})
        .catch(error => console.log(`failed to get all Synthetics Monitorserror =${error}`))

    if (typeof (monitors) == 'undefined' || monitors.length ==0){
        logger.info('getAllMonitors return no monitor')
        return []
    }

    let [monitorNames, locations] = syntheticsAPI.parse(monitors)
    return  [monitorNames, locations]

}

async  function processMonitorStatus({monitorNames, configId}){

    let startTime = Date.now();


    //********************************************************
    // Group Insights Query for Synthetic Check events
    //
    let members =  byMonitor.splitMonitorArray( {monitors:monitorNames, chunk:20})
    let executors=[]
    for(let i=0, j=members.length; i< j; i++){
        // run Insights query on Synthetic check event for select monitors
        executors.push(byMonitor.getMonitorsStatus({monitors:members[i], configId}))
    }


    // responses is [ {status:"<SUCCESS|FAILED>" , json:"<json response>"} ]
    let responses = await Promise.all(executors).catch( e=>{
        logger.error ("rejected with error =" + e)
    })

    //********************************************************


    //********************************************************
    // publish  ExtraSyntheticsPluginStats
    // startTime - startTime of Query
    postExtraSynthPluginStats(responses, configId, startTime)
    //********************************************************


    //********************************************************
    // Create the Plugin and Insights Metrics from the response
    let pluginMap={}
    let insightsMap={}
    for (let response of responses){

        if (response.status != 'SUCCESS'){
            continue;
        }

        let parsedFacets = byMonitor.parseFacets(response.json)

        pluginMap= Object.assign(  {}, pluginMap, byMonitor.createPluginMap(parsedFacets))
        insightsMap= Object.assign( {}, insightsMap, byMonitor.createInsightsMap(parsedFacets))
    }
    logger.debug("pluginMap="+  JSON.stringify(pluginMap))
    logger.debug("insightsMap="+  JSON.stringify(insightsMap))

    //********************************************************


    //********************************************************
    // Publish Plugin Metrics
    let ret= await postPluginMetrics(pluginMap)
    logger.info(`Plugin Post status=${ret.status}`)
    //********************************************************


    //********************************************************
    // Publish Insights Metrics
    let {accountId,insightsInsertKey }  = helper.getInsightsInsertConfig(configId)
    let {success, uuid}= await insights.publishAsync({body:insights.insightsMapToEvent(insightsMap), accountId, insightsInsertKey})
    logger.info(`Insights Post status=${ (success)?"SUCCCESS":"FAILED"} uuid=${uuid}` )
    //********************************************************

}


async function postPluginMetrics(pluginMap){
    let monitorChunk = 500
    let monitorBuckets= helper.splitMap({mapObj:pluginMap, chunk:monitorChunk})

    let pluginExecutor=[]
    for(let i=0, j=monitorBuckets.length; i< j; i++){
        pluginExecutor.push(  plugins.postAsync({body: plugins.pluginMapToJSON(monitorBuckets[i]) , licenseKey: config.get('licenseKey')}) )
    }

    let pluginResponses = await Promise.all(pluginExecutor).catch( e=>{
        logger.error ("rejected with error =" + e)
        return { status:'FAILED', responses}
    })

    logger.debug(`Plugins Post status=${JSON.stringify(pluginResponses)}`)

    return {status:'SUCCESS', response:{count:pluginResponses.length, pluginResponses }}
}

function postExtraSynthPluginStats(responses, configId, startTime){
    let totalCount= responses.length
    let responseCount= responses.filter( resp=>resp.status=="SUCCESS" ).length
    let errorCount= totalCount - responseCount
    let event={
        eventType: 'ExtraSyntheticsPluginStats',
        approach: 'byMonitor',
        errorCount,
        responseCount,
        totalCount,
        errorRate: (100 * errorCount / totalCount).toFixed(2),
        duration: (Date.now() - startTime)
    }
    insights.publish(event, configId, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            logger.info(`Posted ExtraSyntheticsPluginStats stats=${JSON.stringify(event)}`);
        } else {
            helper.logError('Insights POST', error, response, body);
        }
    });
}



function useSynthRestAPI(configId){
    let useSynthAPI=false
    let restAPIAdminKey=""

    try{
        restAPIAdminKey = config.get(`${configId}.restAPIAdminKey`)
        useSynthAPI = (restAPIAdminKey.length >0)?true:false
    }catch (err){
        // swallow
        useSynthAPI=false
        restAPIAdminKey=""
    }
    return {useSynthAPI, restAPIAdminKey}
}


// Run every {duration} seconds
var job =new CronJob(cronTime,  async  function() {
  var env = process.env.NODE_ENV;
  if (env == null) {
    env = 'default';
  }
  logger.info('Starting poll cycle with NODE_ENV Environment: ' + env);
  
  // Loop through each of the configurations 
  for (var i = 0; i < configArr.length; i++) {
    var configId = configArr[i];
    // getMonitorList(configId);

    let {useSynthAPI,restAPIAdminKey} = useSynthRestAPI(configId)
    if (useSynthAPI){
        let [monitorNames, locations]= await getAllMonitors(configId, restAPIAdminKey)
        processMonitorStatus({monitorNames, configId}).catch( e=>{
            logger.error(`Failed to process monitor status Err= ${JSON.stringify(e)}`)
        })

    }else{
      getUniqueCounts(configId);
    }
  }
});

// Determine if this is single config or multi config
logger.info('Synthetics Plugin version: ' + version + ' started:');
logger.info('* GUID: ' + guid);
logger.info('* Frequency is every ' + freq + 's, cron: (' + cronTime + ')');
if (configArr.length == 1) {
  logger.info('* Running as a single config.');
  single = true;
} else {
  logger.error('* Running as a multi config is not implemented');
  single = false;
}
job.start();

