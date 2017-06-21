const winston = require('winston');

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

module.exports = helper;