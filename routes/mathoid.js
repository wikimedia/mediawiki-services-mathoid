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

function emitError(txt) {
    throw new HTTPError({
        status: 400,
        title: 'Bad Request',
        type: 'bad_request',
        detail: txt,
        error: txt,
        success: false
    });
}

function emitFormatError(format) {
    emitError("Output format " + format + " is disabled via config, try setting \"" +
        format + ": true\" to enable "+ format + "rendering.");
}

function handleRequest(res, q, type, outFormat, speakText) {
    var sanitizedTex;
    var svg = false;
    var mml = false;
    var png = false;
    var img = false;
    //Keep format variables constant
    if (type === "tex") {
        type = "TeX";
        var sanitizationOutput = texvcjs.check(q);
        // XXX properly handle errors here!
        if (sanitizationOutput.status === '+') {
            sanitizedTex = sanitizationOutput.output || '';
            q = sanitizedTex;
        } else {
            emitError(sanitizationOutput.status + ': ' + sanitizationOutput.details);
        }
    }
    mml = outFormat === "mml" || outFormat === "json";
    png = app.conf.png && (outFormat === "png" || outFormat === "json");
    svg = app.conf.svg && (outFormat === "svg" || outFormat === "json");
    img = app.conf.img && outFormat === "json";
    if (type === "mml" || type === "MathML") {
        type = "MathML";
        mml = false; // use the original MathML
    }
    if (type === "ascii" || type === "asciimath") {
        type = "AsciiMath";
    }
    if (speakText && outFormat === "png") {
        speakText = false;
    }
    app.mjAPI.typeset({
        math: q,
        format: type,
        svg: svg,
        img: img,
        mml: mml,
        speakText: speakText,
        png: png }, function (data) {
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
            switch (outFormat) {
                case "json":
                    res.json(data).end();
                    break;
                case "svg":
                    res.type('image/svg+xml');
                    res.send(data.svg).end();
                    break;
                case "png":
                    res.type('image/png');
                    res.send(data.png).end();
                    break;
                case "mml":
                    res.type('application/mathml+xml');
                    res.send(data.mml).end();
                    break;
            }
    });
}


/**
 * POST /
 * Performs the rendering request
 */
router.post('/:outformat?/', function(req, res) {
    var outFormat;
    var speakText = app.conf.speakText;
    // First some rudimentary input validation
    if (!(req.body.q)) {
        emitError( "q (query) post parameter is missing!" );
    }
    var q = req.body.q;
    var type = (req.body.type || 'tex').toLowerCase();
    if (req.body.noSpeak){
        speakText = false;
    }
    function setOutFormat(fmt) {
        if (app.conf[fmt]) {
            outFormat = fmt;
        } else {
            emitFormatError(fmt);
        }
    }
    if (req.params.outformat) {
        switch (req.params.outformat.toLowerCase()) {
            case "svg":
                setOutFormat('svg');
                break;
            case "png":
                setOutFormat('png');
                break;
            case "json":
                outFormat = "json";
                break;
            case "mml":
            case "mathml":
                outFormat = "mml";
                break;
            default:
                throw new HTTPError({
                    status: 400,
                    error: "Output format \"" + req.params.outformat + "\" is not recognized!"
                });
        }
    } else {
        outFormat = "json";
    }
    handleRequest(res, q, type, outFormat, speakText);

});


module.exports = function(appObj) {

    app = appObj;

    return {
        path: '/',
        skip_domain: true,
        router: router
    };

};

