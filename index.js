const config = require('config');
const CronJob = require('cron').CronJob;
const version = require('./package.json').version;

// These are helper libraries
const helper = require('./lib/helper.js');
const insights = require('./lib/insights.js');
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

    byMonitor.start(configId, monitorNames);

    return monitors
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
var job = new CronJob(cronTime, function() {
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
      getAllMonitors(configId, restAPIAdminKey)
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

