'use strict';

const sUtil = require('../lib/util');
const mathoid = require('../lib/math');
const emitError = mathoid.emitError;
const BBPromise = require('bluebird');
const zlib = BBPromise.promisifyAll(require('zlib'));

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET /
 * Performs the check get request
 */
router.get('/get/:outformat?/:type?/:q?', (req, res) => {
    if (!(req.params.q)) {
        emitError('q (query) parameter is missing!');
    }
    res.set('Warning',
        '299 mathoid Rendering via GET request discouraged. Consider using the POST endpoint.');
    return mathoid.handleRequest(res,
        req.params.q,
        req.params.type,
        req.params.outformat,
        {},
        req.logger, app.conf,
        app.mjAPI);
});

/**
 * GET /
 * Performs the check get request
 */
router.get('/zlib/:outformat/:type/:q*', (req, res) => {
    if (!(req.params.q)) {
        emitError('q (query) parameter is missing!');
    }
    res.set('Warning',
        '299 mathoid Rendering via GET request discouraged. Consider using the POST endpoint.');
    // if the q parameter contains '/' everything after the first '/' is stored in the req.param[0]
    if (req.params[0]) {
        req.params.q += req.params[0];
    }
    // base64 encoding also accepts Encoding with URL and Filename Safe Alphabet https://tools.ietf.org/html/rfc4648#section-5
    const buffer = Buffer.from(req.params.q, 'base64');
    return zlib.unzipAsync(buffer, { finishFlush: (zlib.constants || zlib).Z_SYNC_FLUSH })
        .then((q) => mathoid.handleRequest(res,
            q,
            req.params.type,
            req.params.outformat,
            {},
            req.logger, app.conf,
            app.mjAPI));
});
/**
 * POST /
 * Performs the rendering request
 */
router.post('/:outformat?/', (req, res) => {
    let speech = app.conf.speech_on;
    if (req.body.nospeech) {
        speech = false;
    }
    return mathoid.handleRequest(res,
        req.body.q,
        req.body.type,
        req.params.outformat,
        { speech },
        req.logger,
        app.conf,
        app.mjAPI);

});

module.exports = (appObj) => {

    app = appObj;

    return {
        path: '/',
        skip_domain: true,
        router
    };

};
