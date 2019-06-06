#!/usr/bin/env node
'use strict';
var program = require('commander');
//var util = require('util');

var BBPromise = require('bluebird');
var json = require('../package.json');
var preq = require('preq');
var xmldom = require("xmldom");
var parser = new xmldom.DOMParser();
var compare = require('dom-compare').compare;
var reporter = require('dom-compare').GroupingReporter;
var assert = require('../test/utils/assert.js');
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

var formulae = require('../test/files/mathjax-texvc/mathjax-texvc.json');
var mdPath = path.resolve(__dirname, "../test/files/mathjax-texvc/test.md");

return server.start().delay(1000).then(function () {
    console.log("Server started");
    if (program.force) {
        fs.writeFileSync(mdPath, "## Test overview");
    }
    return BBPromise.resolve(formulae);
}).each(function (testcase) {
    console.log("\n~~ " + testcase.id + " $" + testcase.input + "$ ~~");
    if (testcase.ignore) {
        console.log(testcase.id + " $" + testcase.input + "$ is ignored");
        return;
    }
    return preq.post({
        uri: baseURL + "svg/",
        encoding: null,
        body: {q: testcase.input, nospeech: true}
    }).then(function (res) {
        var referenceSvg, nextProm = BBPromise.resolve();
        var svgPath = path.resolve(__dirname, "../test/files/mathjax-texvc/svg", testcase.id + ".svg");
        try{
            referenceSvg = fs.readFileSync(svgPath).toString();
        } catch (e) {
            console.log("Reference SVG for testcase " + testcase.id + " could not be read.");
            referenceSvg = false;
        }
        assert.status(res, 200);
        var actualSvg = res.body.toString();
        if (referenceSvg === actualSvg) {
            if (program.verbose) {
                console.log("SVG for testcase " + testcase.id + " has not changed.");
            }
        } else {
            console.log("SVG for testcase " + testcase.id + " has changed.");
            if ( referenceSvg ) {
                var domReal = parser.parseFromString(actualSvg);
                var domRef = parser.parseFromString(referenceSvg);
                var result = compare(domRef, domReal);
                console.log(reporter.report(result));
            }
            if (program.force) {
                nextProm = fs.writeFileAsync(svgPath, actualSvg).catch(function(err) {
                    console.log(err);
                }).then(function() {
                    console.log("SVG file for " + testcase.id + " has been saved!");
                });
            }
        }
        return nextProm.then(function() {
            return preq.post({
                uri: baseURL + "png/",
                body: {q: testcase.input, noSpeak: true}
            });
        }).catch(function (){
            console.log('skip');
        });
    }).then(function (res) {
        var referencePng, nextProm = BBPromise.resolve();
        var pngPath = path.resolve(__dirname, "../test/files/mathjax-texvc/png", testcase.id + ".png");
        try{
            referencePng = fs.readFileSync(pngPath);
        } catch (e) {
            console.log("Reference PNG for testcase " + testcase.id + " could not be read.");
            referencePng = Buffer.alloc(0);
        }
        assert.status(res, 200);
        if (referencePng.compare(res.body) === 0) {
            if (program.verbose) {
                console.log("PNG for testcase " + testcase.id + " has not changed.");
            }
        } else {
            console.log("PNG for testcase " + testcase.id + " has changed.");
            if (program.force) {
                nextProm = fs.writeFileAsync(pngPath, res.body, 'binary').catch(function (err) {
                    console.log(err);
                }).then(function() {
                    console.log("PNG file for " + testcase.id + " has been saved!");
                });
            }
        }
        if (program.force) {
            nextProm = nextProm.then(function() {
                return fs.appendFileAsync(mdPath, "\n * Test " + testcase.id + " $" + testcase.input +
                    "$ ($"+ testcase.texvcjs + "$)![Test-image](png/" + testcase.id +
                    ".png) [Test-image-svg](svg/" + testcase.id + ".svg)")
                .catch(function(err) {
                    console.log(err);
                }).then(function() {
                    console.log("MD file for " + testcase.id + " has been updated!");
                });
            });
        }
        return nextProm;
    }).catch(function(err){
        console.log('Skip testcase ' + testcase.id + "\n");
        console.log(err);
    });
}).then(server.stop).then(function () {
    console.log('done');
    process.exit(0);
});

