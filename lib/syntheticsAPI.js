const fetch = require("node-fetch")
const config = require('config');
const Q = require('q')
const helper = require('./helper.js');
var parseLinkHeader = require('parse-link-header')
var querystring = require('querystring');


var syntheticsAPI = {}

syntheticsAPI.getAllMonitors = async function ({offset = 0, limit = 100, adminAPIKey}) {
    let qs = querystring.stringify({offset, limit})
    let uri = `https://synthetics.newrelic.com/synthetics/api/v3/monitors?${qs}`
    let options = {
        'method': 'GET',
        'headers': {'X-Api-Key': adminAPIKey},
    }


    let response = await fetch(uri, options)
    if (!response.ok) {
        throw new Error(response.statusText)
    }
    let json = await response.json()
    let headers = await response.headers.get("link")
    let linkHeader = parseLinkHeader(headers)
    let monitors=[]

    // console.log(`offset=${offset}, limit=${limit} adminAPIKey=${adminAPIKey}`)
    // console.log(`link=${JSON.stringify(linkHeader)}`)
    // console.log(`monitors len =${(typeof(json.monitors)!='undefined')?json.monitors.length:-1}`)


    if (typeof(json.monitors) != 'undefined' && json.monitors.length > 0) {
        monitors = json.monitors
    }

    let hasNext = (typeof linkHeader.next != 'undefined')
    if (hasNext) {
        offset = linkHeader.next.offset
        return this.getAllMonitors({offset, limit, adminAPIKey})
            .then(tmp => {
                return monitors.concat(tmp)
            })
    }
    return monitors

}

const LocationLabels = {
    "AWS_AP_SOUTH_1": "Mumbai, IN",
    "AWS_AP_SOUTHEAST_1": "Singapore, SG",
    "AWS_AP_NORTHEAST_2": "Seoul, KR",
    "AWS_AP_NORTHEAST_1": "Tokyo, JP",
    "AWS_AP_SOUTHEAST_2": "Sydney, AU",
    "AWS_US_WEST_1": "San Francisco, CA, USA",
    "AWS_US_WEST_2": "Portland, OR, USA",
    "LINODE_US_WEST_1": "Fremont, CA, USA",
    "LINODE_US_CENTRAL_1": "Dallas, TX, USA",
    "AWS_US_EAST_2": "Columbus, OH, USA",
    "LINODE_US_EAST_1": "Newark, NJ, USA",
    "AWS_US_EAST_1": "Washington, DC, USA",
    "AWS_CA_CENTRAL_1": "Montreal, Québec, CA",
    "AWS_SA_EAST_1": "São Paulo, BR",
    "AWS_EU_WEST_1": "Dublin, IE",
    "AWS_EU_WEST_2": "London, England, UK",
    "AWS_EU_WEST_3": "Paris, FR",
    "AWS_EU_CENTRAL_1": "Frankfurt, DE"
}

// ignore DISABLED monitors
// Maps location to location label
// Generate unique monitor names and locations
syntheticsAPI.parse = function (monitors) {

    if(  (typeof (monitors) == 'undefined')  || monitors.length == 0){
        return [[], [] ]
    }

    let monitorNames = []
    let locations = []
    monitors.filter(monitor=> monitor.status.trim() == "ENABLED" ).forEach(entry => {
        monitorNames.push(entry.name)
        locations = locations.concat(entry.locations)
    })

    let uniqueMonitors = [...new Set(monitorNames)];
    let uniqueLocations = [...new Set(locations)].map( location=>LocationLabels[location])

    return [uniqueMonitors, uniqueLocations]
}

module.exports = syntheticsAPI;
