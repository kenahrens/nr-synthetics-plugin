const client = require('newrelic-api-client');
const insights = client.insights;
var assert = require('assert');

var quickAssert = function(error, response) {
  assert.equal(error, null);
  assert.equal(response.statusCode, 200);
}

var configId = 'newrelic';

describe('New Relic Insights API Test', function() {
  this.timeout(5000);
  
  it('calls the query api', function(done) {
    var nrql = 'SELECT count(*) FROM SyntheticCheck';
    insights.query(nrql, configId, function(error, response, body) {
      quickAssert(error, response);
      done();
    });
  });
});
