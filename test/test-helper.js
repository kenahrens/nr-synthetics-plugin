const chai = require('chai')
const assert = chai.assert
const expect = chai.expect
const nock = require('nock')
const sinon = require('sinon')
const config = require('config')
const helper = require('../lib/helper.js')

describe('Helper test', function () {

    it('test getConfigValue', (done) => {

        let configId = 'newrelic'
        let key = 'insightsInsertKey'

        let stub = sinon.stub(config, "get")
        stub.withArgs(`${configId}.${key}`).returns('expected string')
        stub.withArgs(`${configId}.target`).returns(null)
        let value = helper.getConfigValue(configId, key)

        expect(value).equals('expected string')
        stub.restore()
        done()

    });

    it('test getConfigValue with override', (done) => {

        let configId = 'newrelic'
        let key = 'insightsInsertKey'

        let stub = sinon.stub(config, "get")
        stub.withArgs(`${configId}.${key}`).returns('somestring')
        stub.withArgs(`${configId}.target`).returns({
            "accountId": "some account id",
            "accountName": "some account name",
            "insightsInsertKey": "override key"
        })

        let value = helper.getConfigValue(configId, key)

        expect(value).equals("override key")
        stub.restore()
        done()

    });


    it('test getConfigValue with no override', (done) => {

        let configId = 'newrelic'
        let key = 'insightsInsertKey'

        let stub = sinon.stub(config, "get")
        stub.withArgs(`${configId}.${key}`).returns('somestring')
        stub.withArgs(`${configId}.target`).returns({
            "accountId": "",
            "accountName": "",
            "insightsInsertKey": ""
        })

        let value = helper.getConfigValue(configId, key)

        expect(value).equals("somestring")
        stub.restore()
        done()

    });
    it('test getConfigValue with empty override', (done) => {

        let configId = 'newrelic'
        let key = 'insightsInsertKey'

        let stub = sinon.stub(config, "get")
        stub.withArgs(`${configId}.${key}`).returns('somestring')
        stub.withArgs(`${configId}.target`).returns({})

        let value = helper.getConfigValue(configId, key)

        expect(value).equals("somestring")
        stub.restore()
        done()

    });


    it('test-A-getConfigInsightsInsertConfig-override', (done) => {

        let configId = 'newrelic'

        let stub = sinon.stub(config, "get")

        stub.withArgs(`${configId}.accountId`).returns('origAccountId')
        stub.withArgs(`${configId}.insightsInsertKey`).returns('origInsertKey')

        stub.withArgs(`${configId}.target`).returns({
            "accountId": "targetAccountId",
            "accountName": "targetAccountName",
            "insightsInsertKey": "targetInsertKey"
        })

        let {accountId, insightsInsertKey} = helper.getInsightsInsertConfig(configId)

        expect(accountId).equals("targetAccountId")
        expect(insightsInsertKey).equals("targetInsertKey")

        stub.restore()
        done()

    });

    it('test-B-getConfigInsightsInsertConfig-no-override', (done) => {

        let configId = 'newrelic'

        let stub = sinon.stub(config, "get")

        stub.withArgs(`${configId}.accountId`).returns('origAccountId')
        stub.withArgs(`${configId}.insightsInsertKey`).returns('origInsertKey')

        stub.withArgs(`${configId}.target`).returns({
            "accountId": "targetAccountId",
            "accountName": "targetAccountName",
            "insightsInsertKey": ""
        })

        let {accountId, insightsInsertKey} = helper.getInsightsInsertConfig(configId)

        expect(accountId).equals("origAccountId")
        expect(insightsInsertKey).equals("origInsertKey")

        expect(insightsInsertKey).not.equal("targetInsertKey")

        stub.restore()
        done()

    });



    it('test-A-getInsightsQueryConfig-override', (done) => {

        let configId = 'newrelic'

        let stub = sinon.stub(config, "get")

        stub.withArgs(`${configId}.accountId`).returns('origAccountId')
        stub.withArgs(`${configId}.insightsQueryKey`).returns('origQueryKey')

        stub.withArgs(`${configId}.target`).returns({
            "accountId": "targetAccountId",
            "accountName": "targetAccountName",
            "insightsQueryKey": "targetQueryKey"
        })

        let {accountId, insightsQueryKey} = helper.getInsightsQueryConfig(configId)

        expect(accountId).equals("targetAccountId")
        expect(insightsQueryKey).equals("targetQueryKey")

        stub.restore()
        done()

    });

    it('test-B-getInsightsQueryConfig-no-override', (done) => {


        let configId = 'newrelic'

        let stub = sinon.stub(config, "get")

        stub.withArgs(`${configId}.accountId`).returns('origAccountId')
        stub.withArgs(`${configId}.insightsQueryKey`).returns('origQueryKey')

        stub.withArgs(`${configId}.target`).returns({
            "accountId": "targetAccountId",
            "accountName": "targetAccountName",
            "insightsQueryKey": ""
        })

        let {accountId, insightsQueryKey} = helper.getInsightsQueryConfig(configId)

        expect(accountId).equals("origAccountId")
        expect(insightsQueryKey).equals("origQueryKey")

        expect(insightsQueryKey).not.equal("targetQueryKey")

        stub.restore()
        done()

    });

    it('test splitMap', (done) => {
        let mapObj = {
            'monitorName1':{
                'prop1':1,
                'prop2': 'a',
                'prop3': true
            },
            'monitorName2':{
                'prop1':1,
                'prop2': 'a',
                'prop3': true
            },
            'monitorName3':{
                'prop1':1,
                'prop2': 'a',
                'prop3': true
            }
            ,
            'monitorName4':{
                'prop1':1,
                'prop2': 'a',
                'prop3': true
            }
            ,
            'monitorName5':{
                'prop1':1,
                'prop2': 'a',
                'prop3': true
            }
        }



        let arrMap= helper.splitMap({mapObj,chunk:2})
        // console.log(JSON.stringify(arrMap))

        assert (arrMap.length == 3, 'invalid chunking')



        done()

    });
});