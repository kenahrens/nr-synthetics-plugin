const client = require('newrelic-api-client');
const insights = client.insights;
const CronJob = require('cron').CronJob;

var poll = function() {
  console.log('Poll');
}

var job = new CronJob('* * * * * *', poll());
