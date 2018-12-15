const syntheticsAPI = require('../lib/syntheticsAPI.js');
const chai = require('chai')
const expect = chai.expect
const assert = chai.assert
const nock = require('nock')
const sinon = require('sinon')

describe('New Relic Synthetics API Test', function () {

    it('test pagination', async () => {
        let mockBody =
            {
                "monitors": [{
                    "id": "111-aaaaaabbbbbccccc-3333-4444",
                    "name": "Monitor Name",
                    "type": "SIMPLE",
                    "frequency": 5,
                    "uri": "http://1.2.3.4.5/content/login.html",
                    "locations": ["AWS_AP_NORTHEAST_1", "AWS_EU_CENTRAL_1", "AWS_US_EAST_1", "AWS_US_WEST_1", "AWS_US_WEST_2"],
                    "status": "ENABLED",
                    "slaThreshold": 7,
                    "options": {},
                    "modifiedAt": "",
                    "createdAt": "",
                    "userId": 0,
                    "apiVersion": ""
                }]
            }
        ;
        let mockHeader_once =
            '<https://synthetics.newrelic.com/synthetics/api/v3/monitors?offset=0&limit=1>; rel="first", ' +
            '<https://synthetics.newrelic.com/synthetics/api/v3/monitors?offset=1&limit=1>; rel="last", ' +
            '<https://synthetics.newrelic.com/synthetics/api/v3/monitors?offset=1&limit=1>; rel="next"'
        ;


        let mockHeader_twice =
            '<https://synthetics.newrelic.com/synthetics/api/v3/monitors?offset=0&limit=1>; rel="first", ' +
            '<https://synthetics.newrelic.com/synthetics/api/v3/monitors?offset=1&limit=1>; rel="last", ' +
            '<https://synthetics.newrelic.com/synthetics/api/v3/monitors?offset=0&limit=1>; rel="prev"'
        ;


        nock('https://synthetics.newrelic.com')
            .get("/synthetics/api/v3/monitors")
            .query({offset: 0, limit: 1})
            .reply(200, mockBody, {"Link": mockHeader_once})
            .get("/synthetics/api/v3/monitors")
            .query({offset: 1, limit: 1})
            .reply(200, mockBody, {"Link": mockHeader_twice})

        ;


        let result = await syntheticsAPI.getAllMonitors({offset: 0, limit: 1, adminAPIKey: "TestAPIKey"})
            .catch(error => console.log(`error =${error}`))

        expect(result).to.have.lengthOf(2)
    });


    it('test extraction : uniqueness for names and location and location label mapping', () => {
        let monitors = [
            {
                "name": "Monitor Name",
                "locations": [
                    "AWS_AP_NORTHEAST_1",
                    "AWS_EU_CENTRAL_1",
                    "AWS_US_EAST_1",
                    "AWS_US_WEST_1",
                    "AWS_US_WEST_2"
                ],
                "status": "ENABLED"

            },
            {
                "name": "Monitor Name_1",
                "locations": [
                    "AWS_AP_NORTHEAST_1",
                    "AWS_EU_CENTRAL_1",
                ],
                "status": "ENABLED"

            },
            {
                "name": "Monitor Name_1",
                "locations": [
                    "AWS_AP_NORTHEAST_1",
                    "AWS_EU_CENTRAL_1",
                ],
                "status": "ENABLED"

            },
            {
                "name": "Monitor Name_2",
                "locations": [
                    "AWS_AP_NORTHEAST_2"
                ],
                "status": "ENABLED"

            }
            ,
            {
                "name": "Monitor Name_3",
                "locations": [
                    "AWS_EU_WEST_1"
                ],
                "status": "DISABLED"

            }
        ]

        let [uniqueNames, uniqueLocations] = syntheticsAPI.parse(monitors)

        // console.log(`uniqueNames=${JSON.stringify(uniqueNames)}`)
        // console.log(`uniqueLocations=${JSON.stringify(uniqueLocations)}`)

        expect(uniqueNames).to.have.lengthOf(3)
        expect(uniqueLocations).to.have.lengthOf(6)

        // uniqueness
        expect(uniqueNames).to.deep.equal(
            [
                "Monitor Name",
                "Monitor Name_1",
                "Monitor Name_2"
            ]
        )

        // filter DISABLED
        expect(uniqueNames).to.be.an('array').that.does.not.include(
                "Monitor Name_3"
        )

        // uniqueness and label mapping
        expect(uniqueLocations).to.deep.equal(
            [
                "Tokyo, JP",
                "Frankfurt, DE",
                "Washington, DC, USA",
                "San Francisco, CA, USA",
                "Portland, OR, USA",
                "Seoul, KR"

            ]
        )
    });

});
