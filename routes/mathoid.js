'use strict';


const sUtil = require('../lib/util');
const mathoid = require('../lib/math');
const emitError = mathoid.emitError;


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

