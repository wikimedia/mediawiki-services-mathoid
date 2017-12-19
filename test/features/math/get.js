'use strict';

/*
 * Simple API tests
 */

/*
 * Could also check out the nock package to record / replay http interactions
 */

var preq = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');

var baseURL = server.config.uri;

describe('Mathoid GET API tests ', function () {
    before(function (cb) {
        server.start({speech_config: {enrich: false}});
        // Wait for MathJax startup, as that's somewhat async but has a sync
        // interface
        setTimeout(cb, 1000);
    });

    describe('query parameter', function () {
        it("missing q parameter should return 400", function () {
            return preq.get(baseURL + "get/mml/tex").then(function (res) {
                // if we are here, no error was thrown, not good
                throw new Error('Expected an error to be thrown, got status: ' + res.status);
            }, function (res) {
                assert.status(res, 400);
                assert.deepEqual(res.body.error, "q (query) parameter is missing!");
            });
        });
        it("reject invalid tex input", function () {
            return preq.get(baseURL + "get/mml/tex/%5Cnewcommand%7B%5Ccommandname%7D%7Bbuh%7D").then(function (res) {
                // if we are here, no error was thrown, not good
                throw new Error('Expected an error to be thrown, got status: ' + res.status);
            }, function (res) {
                assert.status(res, 400);
                assert.deepEqual(res.body.success, false);
                assert.deepEqual(res.body.error, "SyntaxError: \\Illegal TeX function");
                assert.deepEqual(res.body.detail.error.found, "\\newcommand");
                assert.deepEqual(res.body.detail.error.location.end.column, 12);
            });
        });
        it("reject use of \\ce commands without chemistry mode enabled", function () {
            return preq.get(baseURL + "get/mml/tex/%5Cce%7BH2O%7D%0A").then(function (res) {
                // if we are here, no error was thrown, not good
                throw new Error('Expected an error to be thrown, got status: ' + res.status);
            }, function (res) {
                assert.status(res, 400);
                assert.deepEqual(res.body.success, false);
                assert.deepEqual(res.body.detail.error.found, "\\ce");
                assert.deepEqual(res.body.error, "SyntaxError: Attempting to use the $\\ce$ command outside of a chemistry environment.");
            });
        });
        it("reject invalid input type", function () {
            return preq.get( baseURL + "get/mml/invalid/E%3Dmc%5E2").then(function (res) {
                // if we are here, no error was thrown, not good
                throw new Error('Expected an error to be thrown, got status: ' + res.status);
            }, function (res) {
                assert.status(res, 400);
                assert.deepEqual(res.body.success, false);
                assert.deepEqual(res.body.detail, "Input format \"invalid\" is not recognized!");
            });
        });
        it("display texvcinfo", function () {
            return preq.get( baseURL + "get/texvcinfo/tex/%5Cmathcal%7BS%7D").then(function (res) {
                assert.status(res, 200);
                assert.ok(res.body.identifiers.indexOf("\\mathcal{S}") === 0);
            });
        });
        it("display graph", function () {
            return preq.get( baseURL + "get/graph/tex/%5Cfrac%7Ba%7D%7Bb%7D").then(function (res) {
                assert.status(res, 200);
                assert.notDeepEqual(res.body.name === 'root');
            });
        });
        it("get speech text", function () {
            return preq.get( baseURL + "get/speech/tex/E%3Dmc%5E2").then(function (res) {
                assert.status(res, 200);
                assert.deepEqual(res.body, "upper E equals m c squared");
            });
        });
        it("get svg dimensions in mathml headers", function () {
            return preq.get({
                uri: baseURL + "get/mml/tex/E=mc^2"
            }).then(function (res) {
                assert.status(res, 200);
                assert.deepEqual(res.headers['x-mathoid-style'], 'vertical-align: -0.338ex; width:8.976ex; height:2.676ex;');
            });
        });
    });

});
