const request = require('request');
const config = require('config');

const helper = require('./helper.js');

const version = require('../package.json').version;
const os = require('os');
const fetch = require("node-fetch")

// Define the initial API
var plugins = {};

// This will prepare the overall JSON Message
plugins.makeJsonMessage = function makeJsonMessage(componentName, metricArr) {
  
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
  components[0].name = componentName;
  components[0].guid = guid;
  components[0].duration = duration;
  components[0].metrics = metricArr;

  return msg;
}


/*********************

INPUT: Plugin Map
                {
                        "monitorName1":
                                {
                                    "Component/Location/Seoul, KR/Duration[ms]": 111,
                                    "Component/Location/Seoul, KR/Success[pct]": 100,
                                    "Component/Location/Seoul, KR/Failure[pct]": 0,
                                    "Component/Overall/Success[count]": 5,
                                    "Component/Overall/Success[pct]": 100,
                                    "Component/Overall/Failure[count]": 0,
                                    "Component/Overall/Failure[pct]": 0,
                                    "Component/Overall/Duration[ms]": 221
                                }
                        ...
                }


OUTPUT: Plugin JSON
            {
                "agent": {
                  "host": "C02RT7G9G8WP",
                  "pid": 40225,
                  "version": "2.2.1"
                },
                "components": [
                  {
                    "name": "Basic - Southern Company Services - AUTHOR",
                    "guid": "com.adg.synthetics.monitor.Synthetics",
                    "duration": 30,
                    "metrics": {
                      "Component/Location/Dallas, TX, USA/Duration[ms]": 151.64887,
                      "Component/Location/Dallas, TX, USA/Success[pct]": 100,
                      "Component/Location/Dallas, TX, USA/Failure[pct]": 0,
                      "Component/Location/Newark, NJ, USA/Duration[ms]": 84.030507,
                      "Component/Location/Newark, NJ, USA/Success[pct]": 100,
                      "Component/Location/Newark, NJ, USA/Failure[pct]": 0,
                      "Component/Location/Washington, DC, USA/Duration[ms]": 19.191919,
                      "Component/Location/Washington, DC, USA/Success[pct]": 100,
                      "Component/Location/Washington, DC, USA/Failure[pct]": 0,
                      "Component/Location/Columbus, OH, USA/Duration[ms]": 72.151589,
                      "Component/Location/Columbus, OH, USA/Success[pct]": 100,
                      "Component/Location/Columbus, OH, USA/Failure[pct]": 0,
                      "Component/Location/San Francisco, CA, USA/Duration[ms]": 283.81986,
                      "Component/Location/San Francisco, CA, USA/Success[pct]": 100,
                      "Component/Location/San Francisco, CA, USA/Failure[pct]": 0,
                      "Component/Overall/Success[count]": 5,
                      "Component/Overall/Success[pct]": 100,
                      "Component/Overall/Failure[count]": 0,
                      "Component/Overall/Failure[pct]": 0,
                      "Component/Overall/Duration[ms]": 122.16854899999998
                    }
                  }
                ] // end Components
            }

 *********************/
plugins.pluginMapToJSON = (pluginMap) => {

    var guid = config.get('guid');
    var duration = config.get('duration');

    var json={
        agent:{
            host: os.hostname(),
            pid:  process.pid,
            version: version
        },
        components:[]
    }

    for (let monitorName in pluginMap){
        let component ={}
        component.name = monitorName;
        component.guid = guid;
        component.duration = duration;
        component.metrics =  pluginMap[monitorName]
        json.components.push(component)
    }

    return json;
}
// This call creates the metric name fragment
plugins.makeMetricName = function makeMetricName(componentName, metricName, units) {
  var fullMetricName = 'Component/' + componentName + '/' + metricName + '[' + units + ']';
  return fullMetricName;
}

// This call will POST to New Relic
plugins.post = function post(componentName, metricArr, configId, cb) {
  
  // Look up config items
  var licenseKey = config.get('licenseKey');
  var body = plugins.makeJsonMessage(componentName, metricArr);

  // Create the options, note the body is built on the fly
  var options = {
    'method': 'POST',
    'uri': 'https://platform-api.newrelic.com/platform/v1/metrics',
    'headers': {'X-License-Key': licenseKey},
    'json': true,
    'body': body
  };

  // Call the API
  request(options, cb);
}

// Execute Async Plugin Post capable
plugins.postAsync= async  ( {body='', licenseKey=''}) =>{
    let output={}

    if (body.length ==0 || licenseKey.length == 0 ){
        let msg= `Missing parameters poastAsync() body length=${body.length} licenseKey=${licenseKey}`
        helper.logError(msg ,Error(msg))
        return output
    }


    let uri = 'https://platform-api.newrelic.com/platform/v1/metrics'
    let options = {
        'method': 'POST',
        'headers': {
            'X-License-Key': licenseKey,
            'Content-Type': 'application/json'
        },
        'compress': true,
        'body': JSON.stringify(body)
    }

    logger.debug(`postAsync() license=${licenseKey} url=${uri}`)
    logger.debug('postAsync() body=\n' + JSON.stringify(body))

    let response = await fetch(uri, options).catch( e=>{
        console.log(e)
    })
    if (!response.ok) {
        throw new Error(response.statusText)
    }

    return response.json()
}


// This will report the data from the Metric Array to Plugins
plugins.reportMetric = function(monitorName, pluginMetricArr, configId) {
  plugins.post(monitorName, pluginMetricArr, configId, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      logger.debug('- Posted ' + Object.keys(pluginMetricArr).length + ' metrics to ' + monitorName);
    } else {
      helper.logError('Plugin POST', error, response, body);
    }
  });
}

module.exports = plugins;
