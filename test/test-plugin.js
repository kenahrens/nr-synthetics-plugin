const plugins = require('../lib/plugins.js');
var assert = require('assert');

describe('New Relic Plugin Make Metric Test', function() {
  it('makes a metric', function(done) {
    
    var metricName = 'My Favorite Monitor/Monitor Success[pct]';
    var metricValue = 66;
    var jsonMetric = plugins.makeJsonMetric(metricName, metricValue);
    var fullMetric = 'Component/' + metricName;
    assert.equal(jsonMetric.metrics[fullMetric], metricValue);
    done();
  });
});