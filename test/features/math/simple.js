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
var testData = require('../../files/mathjax-texvc/basic-test-data.json');

var baseURL = server.config.uri;

var testGroups = [{
    testName: "Simple",
    testSettings: {speech_config: {enrich: false}},
    skipTests: []
}, {
    testName: "No-check",
    testSettings: {no_check: true, png: false, speech_config: {enrich: false}},
    skipTests: ['reject', 'sanetex']
}
];

testGroups.forEach(function (t) {
    describe('Mathoid API tests ' + t.testName, function () {
        before(function (cb) {
            server.start(t.testSettings);
            // Wait for MathJax startup, as that's somewhat async but has a sync
            // interface
            setTimeout(cb, 1000);
        });

        describe('Standard input / output pairs', function () {
            testData.forEach(function (data) {
                it(data.query.q, function () {
                    this.timeout(30000);
                    return preq.post({
                        uri: baseURL,
                        body: data.query
                    }).then(function (res) {
                        assert.status(res, data.response.status);
                        Object.keys(data.response.body).forEach(function (key) {
                            if (key === 'png') {
                                assert.notDeepEqual(res.body.png, undefined);
                                assert.notDeepEqual(res.body.png.length, 0);
                            } else if (/mml|svg/.test(key)) {
                                assert.xEqual(res.body[key], data.response.body[key]);
                            } else if (t.skipTests.indexOf(key) == -1) {
                                assert.deepEqual(res.body[key], data.response.body[key], "Difference in key " + key);
                            }
                        });
                    });
                });
            });
        });
        describe('annotation security', function () {
            it("annotation xml should be properly escaped", function () {
                this.timeout(4000);
                return preq.post({
                    uri: baseURL,
                    body: {
                        q: "\\mathrm {</annotation-xml><script>alert('test');</script>} ",
                        nospeech: true
                    }
                }).then(function (res) {
                    assert.status(res, 200);
                    assert.deepEqual(res.body.mml, "<math xmlns=\"http://www.w3.org/1998/Math/MathML\" display=\"block\" alttext=\"\\mathrm {&lt;/annotation-xml&gt;&lt;script&gt;alert('test');&lt;/script&gt;} \">\n  <semantics>\n    <mrow class=\"MJX-TeXAtom-ORD\">\n      <mo>&lt;</mo>\n      <mrow class=\"MJX-TeXAtom-ORD\">\n        <mo>/</mo>\n      </mrow>\n      <mi mathvariant=\"normal\">a</mi>\n      <mi mathvariant=\"normal\">n</mi>\n      <mi mathvariant=\"normal\">n</mi>\n      <mi mathvariant=\"normal\">o</mi>\n      <mi mathvariant=\"normal\">t</mi>\n      <mi mathvariant=\"normal\">a</mi>\n      <mi mathvariant=\"normal\">t</mi>\n      <mi mathvariant=\"normal\">i</mi>\n      <mi mathvariant=\"normal\">o</mi>\n      <mi mathvariant=\"normal\">n</mi>\n      <mo>&#x2212;<!-- − --></mo>\n      <mi mathvariant=\"normal\">x</mi>\n      <mi mathvariant=\"normal\">m</mi>\n      <mi mathvariant=\"normal\">l</mi>\n      <mo>&gt;&lt;</mo>\n      <mi mathvariant=\"normal\">s</mi>\n      <mi mathvariant=\"normal\">c</mi>\n      <mi mathvariant=\"normal\">r</mi>\n      <mi mathvariant=\"normal\">i</mi>\n      <mi mathvariant=\"normal\">p</mi>\n      <mi mathvariant=\"normal\">t</mi>\n      <mo>&gt;</mo>\n      <mi mathvariant=\"normal\">a</mi>\n      <mi mathvariant=\"normal\">l</mi>\n      <mi mathvariant=\"normal\">e</mi>\n      <mi mathvariant=\"normal\">r</mi>\n      <mi mathvariant=\"normal\">t</mi>\n      <msup>\n        <mo stretchy=\"false\">(</mo>\n        <mo>&#x2032;</mo>\n      </msup>\n      <mi mathvariant=\"normal\">t</mi>\n      <mi mathvariant=\"normal\">e</mi>\n      <mi mathvariant=\"normal\">s</mi>\n      <msup>\n        <mi mathvariant=\"normal\">t</mi>\n        <mo>&#x2032;</mo>\n      </msup>\n      <mo stretchy=\"false\">)</mo>\n      <mo>;</mo>\n      <mo>&lt;</mo>\n      <mrow class=\"MJX-TeXAtom-ORD\">\n        <mo>/</mo>\n      </mrow>\n      <mi mathvariant=\"normal\">s</mi>\n      <mi mathvariant=\"normal\">c</mi>\n      <mi mathvariant=\"normal\">r</mi>\n      <mi mathvariant=\"normal\">i</mi>\n      <mi mathvariant=\"normal\">p</mi>\n      <mi mathvariant=\"normal\">t</mi>\n      <mo>&gt;</mo>\n    </mrow>\n    <annotation encoding=\"application/x-tex\">\\mathrm {&lt;/annotation-xml&gt;&lt;script&gt;alert('test');&lt;/script&gt;}</annotation>\n  </semantics>\n</math>");
                    if (t.skipTests.indexOf('sanetex') == -1) {
                        assert.deepEqual(res.body.sanetex, "\\mathrm {</annotation-xml><script>alert('test');</script>} ");
                    }
                });
            });
        });
        describe('query parameter', function () {
            it("missing q parameter should return 400", function () {
                return preq.post({
                    uri: baseURL,
                    body: {}
                }).then(function (res) {
                    // if we are here, no error was thrown, not good
                    throw new Error('Expected an error to be thrown, got status: ' + res.status);
                }, function (res) {
                    assert.status(res, 400);
                    assert.deepEqual(res.body.error, "q (query) parameter is missing!");
                });
            });
            if (t.skipTests.indexOf('reject') == -1) {
                it("reject invalid tex input", function () {
                    return preq.post({
                        uri: baseURL,
                        body: {q: "\\newcommand{\\commandname}{buh}"}
                    }).then(function (res) {
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
                    return preq.post({
                        uri: baseURL,
                        body: {q: "\\ce{H2O}"}
                    }).then(function (res) {
                        // if we are here, no error was thrown, not good
                        throw new Error('Expected an error to be thrown, got status: ' + res.status);
                    }, function (res) {
                        assert.status(res, 400);
                        assert.deepEqual(res.body.success, false);
                        assert.deepEqual(res.body.detail.error.found, "\\ce");
                        assert.deepEqual(res.body.error, "SyntaxError: Attempting to use the $\\ce$ command outside of a chemistry environment.");
                    });
                });
            }
            it("reject invalid input type", function () {
                return preq.post({
                    uri: baseURL,
                    body: {q: "E=mc^2}", type: "invalid"}
                }).then(function (res) {
                    // if we are here, no error was thrown, not good
                    throw new Error('Expected an error to be thrown, got status: ' + res.status);
                }, function (res) {
                    assert.status(res, 400);
                    assert.deepEqual(res.body.success, false);
                    assert.deepEqual(res.body.detail, "Input format \"invalid\" is not recognized!");
                });
            });
            it("display texvcinfo", function () {
                return preq.post({
                    uri: baseURL + "texvcinfo",
                    body: {q: "\\mathcal{S}"}
                }).then(function (res) {
                    assert.status(res, 200);
                    assert.ok(res.body.identifiers.indexOf("\\mathcal{S}") === 0);
                });
            });
            it("display graph", function () {
                return preq.post({
                    uri: baseURL + "graph",
                    body: {q: "\\frac{a}{b}"}
                }).then(function (res) {
                    assert.status(res, 200);
                    assert.notDeepEqual(res.body.name === 'root');
                });
            });
            it("get speech text", function () {
                return preq.post({
                    uri: baseURL + "speech",
                    body: {q: "E=mc^2"}
                }).then(function (res) {
                    assert.status(res, 200);
                    assert.deepEqual(res.body, "upper E equals m c squared");
                });
            });
            it("get svg dimensions in mathml headers", function () {
                return preq.post({
                    uri: baseURL + "mml",
                    body: {q: "E=mc^2"}
                }).then(function (res) {
                    assert.status(res, 200);
                    assert.deepEqual(res.headers['x-mathoid-style'], 'vertical-align: -0.338ex; width:8.976ex; height:2.676ex;');
                });
            });
            it("warn on deprecated mhchem syntax", function () {
                return preq.post({
                    uri: baseURL + "texvcinfo",
                    body: {q: "\\ce {pH=-\\log _{10}[H+]}", type: "chem"}
                }).then(function (res) {
                    assert.status(res, 200);
                    assert.deepEqual(res.body.warnings.length, 1);
                    assert.deepEqual(res.body.warnings[0].type, "mhchem-deprecation");
                });
            });
        });

    });

});