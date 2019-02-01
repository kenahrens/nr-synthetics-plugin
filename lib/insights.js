const request = require('request');
const config = require('config');
const helper = require('./helper.js');
const fetch = require("node-fetch")


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

/*******************************
 Execute Async Insights Query using Post

 OUTPUT:

         {status:"<SUCCESS|FAILED>" , json:"<json response>"}
*******************************/

insights.queryAsync = async  ({nrql='', accountId='', insightsQueryKey=''}) => {
    let output={}

    if (nrql.length ==0 || accountId.length == 0 || insightsQueryKey.length == 0){
        let msg= `Missing parameters monitors nrql= ${nrql} accountId=${accountId} insightsQueryKey=${insightsQueryKey}`

        helper.logError(msg ,Error(msg))
        return output
    }


    let uri = `https://insights-api.newrelic.com/v1/accounts/${accountId}/query`
    let options = {
        'method': 'POST',
        'compress': true,
        'headers': {'X-Query-Key': insightsQueryKey},
        'body': nrql
    }
    let ret={status:"SUCCESS", json:''}
    let response = await fetch(uri, options)
    if (!response.ok) {
        // throw new Error(response.statusText)
        ret.status="FAILED"
        ret.json= await response.statusText
    }else{
        ret.json= await response.json()
    }

    return  ret
}

// Execute Async Insights Insert using Post
insights.publishAsync = async  ({body='', accountId='', insightsInsertKey=''}) => {
    let output={}

    if (body.length ==0 || accountId.length == 0 || insightsInsertKey.length == 0){
        let msg= `Missing parameters monitors body= ${body.length} accountId=${accountId} insightsInsertKey=${insightsInsertKey}`

        helper.logError(msg ,Error(msg))
        return output
    }

    var uri = `https://insights-collector.newrelic.com/v1/accounts/${accountId}/events`;
    let options = {
        'method': 'POST',
        'compress': true,
        'headers': {'X-Insert-Key': insightsInsertKey,
            'Content-Type': 'application/json'
        },
        'compress': true,
        'timeout': 10000,
        'body': JSON.stringify(body)
    }

    let response = await fetch(uri, options)
    if (!response.ok) {
        throw new Error(response.statusText)
    }

    return response.json()
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

/*
INPUT:
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



OUTPUT:
    [
      {
        "eventType": "ExtraSyntheticsInfo",
        "timestamp": 1548552719548,
        "monitorName": "Basic - John Lewis Plc (Basic) - ENDUSER2",
        "successCount": 5,
        "successRate": 100,
        "failCount": 0,
        "failRate": 0,
        "locationCount": 5,
        "duration": 433.0909613999999
        }
        ...
    ]
 */
insights.insightsMapToEvent=(insightsMap)=>{
    let events=[]

    let time =new Date().getTime();
    for(let monitorName in insightsMap){
        let  stats = insightsMap[monitorName]

        var event = Object.assign({}, stats)
        event.eventType = 'ExtraSyntheticsInfo';
        event.timestamp = time
        event.monitorName = monitorName;

        events.push(event)
    }

    return events

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
