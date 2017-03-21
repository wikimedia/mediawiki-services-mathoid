#!/usr/bin/env node
'use strict';
var program = require('commander');

var BBPromise = require('bluebird');
var json = require('../package.json');
var preq = require('preq');

var server = require('../test/utils/server.js');
var fs = BBPromise.promisifyAll(require('fs'));
var path = require('path');

var baseURL = server.config.uri;

program
    .version(json.version)
    .usage('[options]')
    .option('-v, --verbose', 'Show verbose error information')
    .option('-f, --force', 'Replace images in the data folders.');

program.parse(process.argv);
var filename = '../test/files/mathjax-texvc/basic-test-data.json';
var data = require(filename);
var dPath = path.resolve(__dirname, filename);

return server.start({speech_config: {enrich: false}}).delay(1000).then(function () {
    console.log("Server started");
    return BBPromise.resolve(data);
}).each(function (testcase) { // we could use map but better keep the order
    console.log("\n~~ " + testcase.query.q + " ~~");
    return preq.post({
        uri: baseURL,
        body: testcase.query
    }).then(function (res) {
        testcase.response.status = res.status;
        delete res.body.png;
        delete res.body.streeXml;
        delete res.body.streeJson;
        testcase.response.body = res.body;
        return testcase;

    });
}).then(function (newData) {
    var outStr = JSON.stringify(newData, null, 2);
    if (program.force) {
        fs.writeFileSync(dPath, outStr);
    } else {
        console.log(outStr);
    }

}).then(server.stop).then(function () {
    console.log('done');
    process.exit(0);
});

