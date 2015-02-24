'use strict';


// mocha defines to avoid JSHint breakage
/* global describe, it, before, beforeEach, after, afterEach */


var preq   = require('preq');
var assert = require('../../utils/assert.js');
var server = require('../../utils/server.js');


describe('page gets', function() {

    this.timeout(20000);

    before(function () { return server.start(); });

    // common URI prefix for the page
    var uri = server.config.uri + 'v1/page/Mulholland%20Drive%20%28film%29/';

    it('should get the whole page body', function() {
        return preq.get({
            uri: uri
        }).then(function(res) {
            // check the status
            assert.status(res, 200);
            // check the returned Content-Type header
            assert.contentType(res, 'text/html');
            // inspect the body
            assert.notDeepEqual(res.body, undefined, 'No body returned!');
            // this should be the right page
            if(!/<\s*?h1.+Mulholland/.test(res.body)) {
                throw new Error('Not the title I was expecting!');
            }
        });
    });

    it('should get only the leading section', function() {
        return preq.get({
            uri: uri + 'lead'
        }).then(function(res) {
            // check the status
            assert.status(res, 200);
            // check the returned Content-Type header
            assert.contentType(res, 'text/html');
            // inspect the body
            assert.notDeepEqual(res.body, undefined, 'No body returned!');
            // this should be the right page
            if(!/Mulholland/.test(res.body)) {
                throw new Error('Not the page I was expecting!');
            }
            // .. and should start with <div id="lead_section">
            if(!/^<div id="lead_section">/.test(res.body)) {
                throw new Error('This is not a leading section!');
            }
        });
    });

});
