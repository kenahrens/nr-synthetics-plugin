const plugins = require('../lib/plugins.js');
const assert = require('assert');

var configId = 'newrelic';

describe('New Relic Plugin Make Metric Test', function() {
  it('makes a full metric name', function(done) {
    
    var monitorName = 'My Favorite Monitor';
    var metric = 'Monitor Success';
    var units = 'pct';
    var fullMetricName = plugins.makeMetricName(monitorName, metric, units);
    var fullMetricTest = 'Component/' + monitorName + '/' + metric + '[' + units + ']';
    assert.equal(fullMetricName, fullMetricTest);
    done();
  });
  
  it('makes the complete metric JSON', function(done) {
    // This time make 2 metrics
    var monitorName = 'My Favorite Monitor';
    var metric1 = 'Monitor Success';
    var metricValue1 = 66;
    var metric2 = 'Monitor Fail';
    var metricValue2 = 34;
    var units = 'pct';
    var fullMetricName1 = plugins.makeMetricName(monitorName, metric1, units);
    var fullMetricName2 = plugins.makeMetricName(monitorName, metric2, units);
    var metricArr = {};
    metricArr[fullMetricName1] = metricValue1;
    metricArr[fullMetricName2] = metricValue2;
    var msg = plugins.makeJsonMessage(configId, metricArr);
    
    // Now check the message to make sure the metrics are populated correctly
    assert.equal(msg.components[0].metrics[fullMetricName1], metricValue1);
    assert.equal(msg.components[0].metrics[fullMetricName2], metricValue2);
    done();
  })
});