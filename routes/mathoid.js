'use strict';


var sUtil = require('../lib/util');
var texvcjs = require('texvcjs');
var HTTPError = sUtil.HTTPError;


/**
 * The main router object
 */
var router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
var app;


function handleRequest(res, q, type) {
    var mml = true;
    var sanitizedTex;
    //Keep format variables constant
    if (type === "tex") {
        type = "TeX";
        var sanitizationOutput = texvcjs.check(q);
        // XXX properly handle errors here!
        if (sanitizationOutput.status === '+') {
            sanitizedTex = sanitizationOutput.output || '';
            q = sanitizedTex;
        } else {
            throw new HTTPError
            ({
                status: 400,
                log: sanitizationOutput.status + ': ' + sanitizationOutput.details,
                success: false
            });
        }
    }
    if (type === "mml" || type === "MathML") {
        type = "MathML";
        mml = false;
    }
    if (type === "ascii" || type === "asciimath") {
        type = "AsciiMath";
    }
    app.mjAPI.typeset( {
        math: q,
        format: type,
        svg: app.conf.svg,
        img: app.conf.img,
        mml: mml,
        speakText: app.conf.speakText,
        png: app.conf.png }, function (data) {
        if (data.errors) {
            data.success = false;
            data.log = "Error:" + JSON.stringify(data.errors);
        } else {
            data.success = true;
            data.log = "success";
        }

        // Strip some styling returned by MathJax
        if (data.svg) {
            data.svg = data.svg.replace(/style="([^"]+)"/, function(match, style) {
                return 'style="'
                    + style.replace(/(?:margin(?:-[a-z]+)?|position):[^;]+; */g, '')
                    + '"';
            });
        }

        // Return the sanitized TeX to the client
        if (sanitizedTex !== undefined) {
            data.sanetex = sanitizedTex;
        }

        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(data));
    });
}


/**
 * POST /
 * Performs the rendering request
 */
router.post(/^\/$/, function(req, res) {

    // First some rudimentary input validation
    if (!(req.body.q)) {
        throw new HTTPError
        ({
            status: 400,
            error: "q (query) post parameter is missing!"
        });
    }
    var q = req.body.q;
    var type = req.body.type;
    if (!(req.body.type) ){
        type = 'tex';
    }
    handleRequest(res, q, type);

});


module.exports = function(appObj) {

    app = appObj;

    return {
        path: '/',
        skip_domain: true,
        router: router
    };

};

