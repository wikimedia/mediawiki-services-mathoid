'use strict';

const BBPromise = require('bluebird');
const texvcInfo = require('texvcinfo');
const sre = require('speech-rule-engine');
const SVGO = require('svgo');
const Readable = require('stream').Readable;
const HTTPError = require('./util').HTTPError;
// TODO: Parsoid uses a more elaborated approach to determine the content version
// via a middleware environment variable
// cf. https://github.com/wikimedia/parsoid/blob/c596a3afae8080247911a6ed58dd08951b7bcc5e/lib/api/routes.js#L169
const contentVersion = require('../package.json')['content-version'];
const svgo = new SVGO({
    plugins: [
        { convertTransform: false }
    ]
});

function emitError(txt, detail) {
    if (detail === undefined) {
        detail = txt;
    }
    throw new HTTPError({
        status: 400,
        success: false,
        title: 'Bad Request',
        type: 'bad_request',
        detail,
        error: txt
    });
}

function emitFormatError(format) {
    emitError(`Output format ${format} is disabled via config, try setting "${
        format}: true" to enable ${format}rendering.`);
}

function optimizeSvg(data, logger) {
    return BBPromise.resolve(svgo.optimize(data.svg))
    .then((result) => {
        if (!result.error) {
            data.svg = result.data;
        } else {
            logger.log('warn/svgo', result.error);
        }
    })
    .catch((e) => {
        logger.log('warn/svgo', e);
    });
}

function verifyOutFormat(fmt, type, conf) {
    if (!fmt) {
        return 'json';
    }
    let outFormat;

    function setOutFormat(format) {
        if (conf[format] || (format === 'graph' && conf.texvcinfo)) {
            outFormat = format;
        } else {
            emitFormatError(format);
        }
    }

    switch (fmt.toLowerCase()) {
        case 'svg':
            setOutFormat('svg');
            break;
        case 'png':
            setOutFormat('png');
            break;
        case 'texvcinfo':
            setOutFormat('texvcinfo');
            if (!/(chem|tex$)/i.test(type)) {
                emitError(`texvcinfo accepts only tex, inline-tex, or chem as the input type,
                 "${type}" given!`);
            }
            break;
        case 'graph':
            setOutFormat('graph');
            if (!/tex$/i.test(type)) {
                emitError(`graph accepts only tex or inline-tex as the input type,
                 "${type}" given!`);
            }
            break;
        case 'json':
            outFormat = 'json';
            break;
        case 'complete':
            outFormat = 'complete';
            break;
        case 'mml':
        case 'mathml':
            outFormat = 'mml';
            break;
        case 'speech':
            setOutFormat('speech');
            break;
        default:
            emitError(`Output format "${fmt}" is not recognized!`);
    }
    return outFormat;
}

// From https://github.com/pkra/mathjax-node-sre/blob/master/lib/main.js
function srePostProcessor(config, result) {
    if (result.error) {
        throw result.error;
    }
    if (!result.mml) {
        throw new Error('No MathML found. Please check the mathjax-node configuration');
    }
    if (!result.svgNode && !result.htmlNode && !result.mmlNode) {
        throw new Error('No suitable output found. Please check the mathjax-node configuration');
    }
    // add semantic tree
    if (config.semantic) {
        result.streeJson = sre.toJson(result.mml);
        const xml = sre.toSemantic(result.mml).toString();
        result.streeXml = config.minSTree ? xml : sre.pprintXML(xml);
    }
    // return if no speakText is requested
    if (!config.speakText) {
        return result;
    }
    // enrich output
    sre.setupEngine(config);
    result.speakText = sre.toSpeech(result.mml);
    if (result.svgNode && result.svg) {
        result.svgNode.querySelector('title').innerHTML = result.speakText;
        // update serialization
        // HACK add lost xlink namespaces TODO file jsdom bug
        result.svg = result.svgNode.outerHTML
          .replace(/(<(?:use|image) [^>]*)(href=)/g, ' $1xlink:$2');
    }
    // mathoid currently does not support html Node output
    // if (result.htmlNode) {
    //     result.htmlNode.firstChild.setAttribute("aria-label", result.speakText);
    //     // update serialization
    //     if (result.html) result.html = result.htmlNode.outerHTML;
    // }
    if (result.mmlNode && result.mml) {
        result.mmlNode.setAttribute('alttext', result.speakText);
        // update serialization
        result.mml = result.mmlNode.outerHTML;
    }
    if (config.enrich) {
        result.mml = sre.toEnriched(result.mml).toString();
    }
    return result;
}

//
//  Create the PNG file asynchronously, reporting errors.
//
function getPNG(result, resolve, conf) {
    const Rsvg = require('librsvg').Rsvg;
    const s = new Readable();
    const pngScale = conf.dpi / 90; // 90 DPI is the effective setting used by librsvg
    const ex = 6;
    const width = result.svgNode.getAttribute('width').replace('ex', '') * ex;
    const height = result.svgNode.getAttribute('height').replace('ex', '') * ex;

    const svgRenderer = new Rsvg();
// eslint-disable-next-line no-underscore-dangle
    s._read = function () {
        s.push(result.svg.replace(/="currentColor"/g, '="black"'));
        s.push(null);
    };
    svgRenderer.on('finish', () => {
        try {
            const buffer = svgRenderer.render({
                format: 'png',
                width: width * pngScale,
                height: height * pngScale
            });
            result.png = buffer.data || Buffer.from([]);
        } catch (e) {
            result.errors = e.message;
        }
        resolve(result);
    });
    s.pipe(svgRenderer);
    return resolve;  // This keeps the queue from continuing until the readFile() is complete
}

/* The response headers for different render types */
function outHeaders(data) {
    return {
        svg: {
            'content-type': `image/svg+xml; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/SVG/${contentVersion}"`
        },
        png: {
            'content-type': `image/png; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/PNG/${contentVersion}"`
        },
        mml: {
            'content-type': `application/mathml+xml; charset=utf-8; profile="https://www.mediawiki.org/wiki/Specs/MathML/${contentVersion}"`,
            'x-mathoid-style': data.mathoidStyle
        }
    };
}

function verifyRequestType(type) {
    type = (type || 'tex').toLowerCase();
    switch (type) {
        case 'tex':
            type = 'TeX';
            break;
        case 'inline-tex':
            type = 'inline-TeX';
            break;
        case 'mml':
        case 'mathml':
            type = 'MathML';
            break;
        case 'ascii':
        case 'asciimathml':
        case 'asciimath':
            type = 'AsciiMath';
            break;
        case 'chem':
            type = 'chem';
            break;
        default:
            emitError(`Input format "${type}" is not recognized!`);
    }
    return type;
}

function handleRequest(res, q, type, outFormat, features, logger, conf, mjAPI) {
    // First some rudimentary input validation
    if (!q) {
        emitError('q (query) parameter is missing!');
    }
    type = verifyRequestType(type);
    outFormat = verifyOutFormat(outFormat, type, conf);
    features = features || { speech: conf.speech_on };

    let sanitizedTex;
    let feedback;
    const svg = conf.svg && /^svg|json|complete|png$/.test(outFormat);
    const mml = (type !== 'MathML') && /^mml|json|complete$/.test(outFormat);
    const png = conf.png && /^png|json|complete$/.test(outFormat);
    const info = conf.texvcinfo && /^graph|texvcinfo$/.test(outFormat);
    const img = conf.img && /^mml|json|complete$/.test(outFormat);
    const speech = (outFormat !== 'png') && features.speech || outFormat === 'speech';
    const chem = type === 'chem';

    if (chem) {
        type = 'inline-TeX';
    }
    if ((!conf.no_check && /^TeX|inline-TeX$/.test(type)) || info) {
        feedback = texvcInfo.feedback(q, { usemhchem: chem });
        // XXX properly handle errors here!
        if (feedback.success) {
            sanitizedTex = feedback.checked || '';
            q = sanitizedTex;
        } else {
            emitError(`${feedback.error.name}: ${feedback.error.message}`, feedback);
        }
        if (info) {
            if (outFormat === 'graph') {
                res.json(texvcInfo.texvcinfo(q, { format: 'json', compact: true }));
                return;
            }
            if (outFormat === 'texvcinfo') {
                res.json(feedback).end();
                return;
            }
        }
    }

    const mathJaxOptions = {
        math: q,
        format: type,
        svg,
        svgNode: img || png,
        mml
    };
    if (speech) {
        mathJaxOptions.mmlNode = true;
        mathJaxOptions.mml = true;
    }
    return new BBPromise(((resolve) => {
        mjAPI.typeset(mathJaxOptions, (data) => resolve(data));
    })).then((data) => {
        return new BBPromise(((resolve) => {
            if (png) {
                getPNG(data, resolve, conf);
            } else {
                return resolve(data);
            }
        }));
    }).then((data) => {
        if (data.errors) {
            emitError(data.errors);
        }
        if (speech) {
            data = srePostProcessor(conf.speech_config, data);
        }
        data.success = true;
        // @deprecated
        data.log = 'success';
        if (data.svgNode) {
            data.mathoidStyle = [
                data.svgNode.style.cssText,
                ' width:', data.svgNode.getAttribute('width'),
                '; height:', data.svgNode.getAttribute('height'), ';'
            ].join('');
        }

        // make sure to delete non serializable objects
        data.svgNode = undefined;
        data.mmlNode = undefined;
        // Return the sanitized TeX to the client
        if (sanitizedTex !== undefined) {
            data.sanetex = sanitizedTex;
        }
        if (speech) {
            data.speech = data.speakText;
        }

        function outputResponse() {
            switch (outFormat) {
                case 'complete': {
                    const headers = outHeaders(data);
                    Object.keys(headers).forEach((outType) => {
                        if (data[outType]) {
                            data[outType] = {
                                headers: headers[outType],
                                body: data[outType]
                            };
                        }
                    });
                    res.json(data).end();
                    break;
                }
                case 'json':
                    res.json(data).end();
                    break;
                default:
                    res.set(outHeaders(data)[outFormat]);
                    res.send(data[outFormat]).end();
            }
        }

        if (data.svg && conf.svgo) {
            optimizeSvg(data, logger).then(() => outputResponse());
        } else {
            outputResponse();
        }
    });
}

module.exports = {
    handleRequest,
    emitError
};
