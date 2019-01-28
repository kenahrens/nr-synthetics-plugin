const winston = require('winston');
const config = require('config');

var helper = {};

// Setup the logger
logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp: function() {return new Date().toUTCString();},
      level: 'info'
    })
  ]
});

// Helper function to log an error from HTTP response to the console
helper.logError = function(msg, error, response, body) {
  if (error) {
    logger.error('!! Error: ' + msg, error);
    // logger.error(error);
  } else {
    logger.error('!! Non-200 response to ' + msg + ' (' + response.statusCode + ')');
    // logger.error(body);
  }
}

// Override the value if an override value exists for the target/destination entity/account
helper.getConfigValue=function( configId, key ){

    var origValue =  config.get (`${configId}.${key}`)
    var override=''
    var  target
    try{
        target = config.get(`${configId}.target`)
        override =  target[key]
    }catch(err){
        // swallow
    }
     return ((override && override.length >0 )? override: origValue)

}


// returns {accountId, insightsInsertKey}
// if overrides exist returns the override values
helper.getInsightsInsertConfig=function( configId){
    if (typeof(configId)== 'undefined' || configId.length == 0){
        throw new Error ("Missing parameter configId")
    }

    var accountId =  config.get (`${configId}.accountId`)
    var insightsInsertKey =  config.get (`${configId}.insightsInsertKey`)

    var accountIdTarget="", insertKeyTarget=""
    try{
        target = config.get(`${configId}.target`)
        accountIdTarget =  target['accountId']
        insertKeyTarget =  target['insightsInsertKey']
        if(accountIdTarget.length >0 && insertKeyTarget.length>0 ){
            insightsInsertKey= insertKeyTarget
            accountId = accountIdTarget
        }
    }catch(err){
        // swallow
        accountIdTarget=""
        insertKeyTarget=""

    }




    return {accountId, insightsInsertKey}

}


helper.splitMap=( {mapObj={}, chunk=20})=>{
    let arrMap=[]
    let keys = Object.keys(mapObj)

    if ( keys.length ==0){
        logger.info ('no mapkeys found')
        return []
    }

    let keyListChunked=[] // chunked Keys list of array
    for (let i=0, j=keys.length; i<j; i+=chunk){
        keyListChunked.push( keys.slice(i,i+chunk))
    }


    for (let i=0, j=keyListChunked.length ; i < j ; i++){
        let tmp={}
        let keysTmp = keyListChunked[i]

        for (let k of keysTmp){
            tmp[k]= Object.assign({}, mapObj[k])
        }

        arrMap.push(tmp)
    }

    return arrMap
}



// returns {accountId, insightsQueryKey}
// if overrides exist returns the override values
helper.getInsightsQueryConfig=function( configId){

    if (typeof(configId)== 'undefined' || configId.length == 0){
        throw new Error ("Missing parameter configId")
    }

    var accountId =  config.get (`${configId}.accountId`)
    var insightsQueryKey =  config.get (`${configId}.insightsQueryKey`)

    var accountIdTarget="", queryKeyTarget=""
    try{
        target = config.get(`${configId}.target`)
        accountIdTarget =  target['accountId']
        queryKeyTarget =  target['insightsQueryKey']
        if(accountIdTarget.length >0 && queryKeyTarget.length>0 ){
            insightsQueryKey= queryKeyTarget
            accountId = accountIdTarget
        }
    }catch(err){
        // swallow
        accountIdTarget=""
        queryKeyTarget=""
    }

    return {accountId, insightsQueryKey}

}

module.exports = helper;