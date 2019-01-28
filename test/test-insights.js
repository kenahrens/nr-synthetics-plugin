const chai = require('chai')
const expect = chai.expect
const assert = chai.assert
const sinon = require('sinon')

const insights = require('../lib/insights.js');
const helper = require('../lib/helper.js')

var quickAssert = function(error, response) {
  assert.equal(error, null);
  assert.equal(response.statusCode, 200);
}


describe('New Relic Insights API Test', function() {
  this.timeout(5000);
  
  it('Integration test', function (done) {
    let configId='newrelic'

    let {accountId, insightsQueryKey} = helper.getInsightsQueryConfig(configId);

    var nrql = 'SELECT count(*) FROM SyntheticCheck';

    let stub = sinon.stub(helper, "getInsightsQueryConfig")

    assert(insightsQueryKey.length >0, "Missing - Insights Query Key")
    assert(accountId.length >0, "Missing - Account ID")

    stub.withArgs(configId).returns( {accountId, insightsQueryKey})

    insights.query(nrql, configId, function (error, response, body) {
        quickAssert(error, response);
        stub.restore()
        done();
    });

  });

    it('Integration test: Query Async', async () => {
        let configId='newrelic'

        let {accountId, insightsQueryKey} = helper.getInsightsQueryConfig(configId);
        let nrql = 'SELECT count(*) FROM SyntheticCheck';

        assert(insightsQueryKey.length >0, "Missing - Insights Query Key")
        assert(accountId.length >0, "Missing - Account ID")

        let jsonResponse = await insights.queryAsync({nrql, accountId, insightsQueryKey})
        let respKeys = Object.keys(jsonResponse.json)

        expect(respKeys).to.deep.equal(
            ['results', 'performanceStats', 'metadata']
        )

    });

    it('insightsMapToEvent',  (done) => {
        let insightsMap = {
            "monitorName1":
            {
                "successCount": 5,
                "successRate": 100,
                "failCount": 0,
                "failRate": 0,
                "locationCount": 5,
                "duration": 221.2998142
            },
            "monitorName2":
                {
                    "successCount": 5,
                    "successRate": 100,
                    "failCount": 0,
                    "failRate": 0,
                    "locationCount": 5,
                    "duration": 221.2998142
                },

        }

        let events = insights.insightsMapToEvent(insightsMap)


        assert(events.length==2, 'invalid output')
        assert(events[0].eventType == "ExtraSyntheticsInfo", "missing event type \"ExtraSyntheticsInfo\"")
        assert.property(events[0], "eventType", "missing \"eventType\"")
        assert.property(events[0], "timestamp", "missing \"timestamp\"")
        assert.property(events[0], "monitorName", "missing \"monitorName\"")
        assert.property(events[0], "successCount", "missing \"successCount\"")
        assert.property(events[0], "successRate", "missing \"successRate\"")
        assert.property(events[0], "failCount", "missing \"failCount\"")
        assert.property(events[0], "failRate", "missing \"failRate\"")
        assert.property(events[0], "locationCount", "missing \"locationCount\"")
        assert.property(events[0], "duration", "missing \"duration\"")


        done();

    });


});
