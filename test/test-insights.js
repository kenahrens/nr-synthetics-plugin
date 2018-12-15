const insights = require('../lib/insights.js');
var assert = require('assert');
const sinon = require('sinon')
const helper = require('../lib/helper.js')

var quickAssert = function(error, response) {
  assert.equal(error, null);
  assert.equal(response.statusCode, 200);
}

var configId = 'newrelic';

describe('New Relic Insights API Test', function() {
  this.timeout(5000);
  
  it('Integration test', function (done) {

    /////////////////////////////////////
    //
    // IMPORTANT!!!
    // Enter the account and the Insights Query Key
    ///

    let accountId =""
    let insightsQueryKey = ""



    var nrql = 'SELECT count(*) FROM SyntheticCheck';

    let stub = sinon.stub(helper, "getInsightsQueryConfig")

    assert(insightsQueryKey.length >0, "Missing - Insights Query Key")
    assert(accountId.length >0, "Missing - Account ID")

    stub.withArgs(configId).returns( {accountId, insightsQueryKey})

    insights.query(nrql, configId, function (error, response, body) {
        quickAssert(error, response);
        done();
    });

  });


});
