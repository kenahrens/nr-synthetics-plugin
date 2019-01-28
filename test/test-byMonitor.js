const chai = require('chai')
const assert = chai.assert
const expect = chai.expect
const nock = require('nock')
const sinon = require('sinon')
const config = require('config')
const helper = require('../lib/helper.js')
const byMonitor = require('../lib/byMonitor.js')
const insights = require('../lib/insights.js');

describe('byMonitor test', function () {
    this.timeout(30000);


    it('Integration test: getMonitorstatus, chunking', async() => {

        let configId='newrelic'
        let {accountId, insightsQueryKey} = helper.getInsightsQueryConfig(configId);
        let stub = sinon.stub(helper, "getInsightsQueryConfig")
        stub.withArgs(configId).returns( {accountId, insightsQueryKey})

        let nrql=`select uniques(monitorName) from SyntheticCheck since 5 minutes ago`
        let response = await insights.queryAsync({nrql, accountId, insightsQueryKey})

        let tmpMembers = response.json.results[0].members
        let chunk=5
        let members =  byMonitor.splitMonitorArray( {monitors:tmpMembers, chunk})

        // Test chunking
        assert( ((tmpMembers.length / chunk) + ((tmpMembers % chunk >0)?1:0))   == members.length, 'invalid chunkinkg logic')
        assert(members.length >0, `no SyntheticCheck found for accountId ${accountId}`)


        // Test getMonitorStatus
        let resp = await byMonitor.getMonitorsStatus({monitors:members[0], configId})
        assert.property(resp.json,'facets')

        assert(resp.json.facets.length > 0, 'failed to query insights')
        assert.property(resp.json.facets[0],'name', 'missing name property')
        assert(resp.json.facets[0].name.length == 2, 'invalid values for name property')

        stub.restore()
    });


    it('Integration test: parseFacets, createPluginMap,createInsightsMap', async() => {

        let configId='newrelic'
        let {accountId, insightsQueryKey} = helper.getInsightsQueryConfig(configId);
        let stub = sinon.stub(helper, "getInsightsQueryConfig")
        stub.withArgs(configId).returns( {accountId, insightsQueryKey})

        // Integration Test data
        let nrql=`select uniques(monitorName) from SyntheticCheck since 5 minutes ago`
        let response = await insights.queryAsync({nrql, accountId, insightsQueryKey})

        let tmpMembers = response.json.results[0].members
        let chunk=20
        let members =  byMonitor.splitMonitorArray( {monitors:tmpMembers, chunk})

        let executions=[]
        for(i=0, j=members.length; i< j; i++){
            executions.push(byMonitor.getMonitorsStatus({monitors:members[0], configId}))
        }

        let responses = await Promise.all(executions).catch( e=>{
            console.log("rejected with error =" + e)
        })

        assert(responses.length >0, "no responses")

        // Test parseFacets
       let parsedFacets = byMonitor.parseFacets(responses[0].json)

        let keys= Object.keys(parsedFacets)
        assert(keys.length>0, "no keys generated")

        let monitorName= keys[0]
        let monitor = parsedFacets[monitorName]
        assert.property(monitor, "locations", "missing location property")
        assert.property(monitor, "statistics", "missing statistics property")

        // Test createPluginMap
        let pluginMap = byMonitor.createPluginMap(parsedFacets)

        let monitorPluginStats= pluginMap[monitorName]
        assert.property(monitorPluginStats, "Component/Overall/Success[count]", "missing \"Component/Overall/Success[count]\"")
        assert.property(monitorPluginStats, "Component/Overall/Success[pct]",   "missing     \"Component/Overall/Success[pct]\":")
        assert.property(monitorPluginStats, "Component/Overall/Failure[count]", "missing \"Component/Overall/Failure[count]\"")
        assert.property(monitorPluginStats, "Component/Overall/Failure[pct]",   "missing     \"Component/Overall/Failure[pct]\"")
        assert.property(monitorPluginStats, "Component/Overall/Duration[ms]",   "missing  \"Component/Overall/Duration[ms]\""  )


        // Test createInsightsMap
        let insightMap =byMonitor.createInsightsMap(parsedFacets)
        let monitorInsightsStats= insightMap[monitorName]


        assert.property(monitorInsightsStats, "successCount", "missing \"successCount\"")
        assert.property(monitorInsightsStats, "successRate", "missing \"successRate\"")
        assert.property(monitorInsightsStats, "failCount", "missing \"failCount\"")
        assert.property(monitorInsightsStats, "failRate", "missing \"failRate\"")
        assert.property(monitorInsightsStats, "locationCount", "missing \"locationCount\"")
        assert.property(monitorInsightsStats, "duration", "missing \"duration\"")


        stub.restore()
    });

});