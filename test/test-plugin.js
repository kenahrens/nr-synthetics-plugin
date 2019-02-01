const plugins = require('../lib/plugins.js');
const chai = require('chai')
const assert = chai.assert
const expect = chai.expect

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

    it('jsonPluginMap', function(done) {
        let metricMap={
            "monitorName1":
                {
                    "Component/Location/Seoul, KR/Duration[ms]": 111,
                    "Component/Location/Seoul, KR/Success[pct]": 100,
                    "Component/Location/Seoul, KR/Failure[pct]": 0,
                    "Component/Overall/Success[count]": 5,
                    "Component/Overall/Success[pct]": 100,
                    "Component/Overall/Failure[count]": 0,
                    "Component/Overall/Failure[pct]": 0,
                    "Component/Overall/Duration[ms]": 221
                },
            "monitorName2":
                {
                    "Component/Location/Dublin, IE/Duration[ms]": 451.979741,
                    "Component/Location/Dublin, IE/Success[pct]": 100,
                    "Component/Location/Dublin, IE/Failure[pct]": 0,
                    "Component/Overall/Success[count]": 2,
                    "Component/Overall/Success[pct]": 100,
                    "Component/Overall/Failure[count]": 0,
                    "Component/Overall/Failure[pct]": 0,
                    "Component/Overall/Duration[ms]": 333
                }

        }



        var json = plugins.pluginMapToJSON( metricMap);

        assert(json.components.length == 2, "invalid component count")
        assert.property(json.agent,"host", "missing \"host\"" )

        assert.property(json.components[0].metrics,"Component/Location/Seoul, KR/Duration[ms]", "missing \"Component/Location/Seoul, KR/Duration[ms]\"")
        assert.property(json.components[0].metrics,"Component/Location/Seoul, KR/Success[pct]","missing \"Component/Location/Seoul, KR/Success[pct]\"")
        assert.property(json.components[0].metrics,"Component/Location/Seoul, KR/Failure[pct]","missing \"Component/Location/Seoul, KR/Failure[pct]\"")
        assert.property(json.components[0].metrics,"Component/Overall/Success[count]","missing \"Component/Overall/Success[count]\"")
        assert.property(json.components[0].metrics,"Component/Overall/Success[pct]","missing \"Component/Overall/Success[pct]\"")
        assert.property(json.components[0].metrics,"Component/Overall/Failure[count]", "missing \"Component/Overall/Failure[count]\"")
        assert.property(json.components[0].metrics,"Component/Overall/Failure[pct]", "missing \"Component/Overall/Failure[pct]\"")
        assert.property(json.components[0].metrics,"Component/Overall/Duration[ms]", "missing \"Component/Overall/Duration[ms]\"")




        done();
    })
});