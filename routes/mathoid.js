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


/* The response headers for different render types */
var outHeaders = {
    svg: {
        'content-type': 'image/svg+xml'
    },
    png: {
        'content-type': 'image/png'
    },
    mml: {
        'content-type': 'application/mathml+xml'
    }
};


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
    if (type === "TeX" || type === "inline-TeX") {
        var sanitizationOutput = texvcjs.check(q);
        // XXX properly handle errors here!
        if (sanitizationOutput.status === '+') {
            sanitizedTex = sanitizationOutput.output || '';
            q = sanitizedTex;
        } else {
            emitError(sanitizationOutput.status + ': ' + sanitizationOutput.details);
        }
    }
    mml = /^mml|json|complete$/.test(outFormat);
    png = app.conf.png && /^png|json|complete$/.test(outFormat);
    svg = app.conf.svg && /^svg|json|complete$/.test(outFormat);
    img = app.conf.img && /^json|complete$/.test(outFormat);
    if (type === "MathML") {
        mml = false; // use the original MathML
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
                case 'json':
                    res.json(data).end();
                    break;
                case 'complete':
                    Object.keys(outHeaders).forEach(function(outType) {
                        if (data[outType]) {
                            data[outType] = {
                                headers: outHeaders[outType],
                                body: data[outType]
                            };
                        }
                    });
                    res.json(data).end();
                    break;
                default:
                    res.set(outHeaders[outFormat]);
                    res.send(data[outFormat]).end();
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
    switch (type) {
        case "tex":
            type = "TeX";
            break;
        case "inline-tex":
            type = "inline-TeX";
            break;
        case "mml":
        case "mathml":
            type = "MathML";
            break;
        case "ascii":
        case "asciimathml":
        case "asciimath":
            type = "AsciiMath";
            break;
        default :
            emitError("Input format \""+type+"\" is not recognized!");
    }
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
            case 'complete':
                outFormat = 'complete';
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

