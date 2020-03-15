'use strict';

const sUtil = require('../lib/util');
const express = require('express');

let swaggerUi;

try {
    swaggerUi = require('../lib/swagger-ui');
} catch (e) {}

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET /robots.txt
 * Instructs robots no indexing should occur on this domain.
 */
router.get('/robots.txt', (req, res) => {
    res.type('txt').send('User-agent: *\nDisallow: /\n');
});

/**
 * GET /
 * Main entry point. Currently it only responds if the spec or doc query
 * parameter is given, otherwise it displays the test page.
 */
router.get('/', (req, res, next) => {

    if ({}.hasOwnProperty.call(req.query || {}, 'spec')) {
        res.json(app.conf.spec);
    } else if ({}.hasOwnProperty.call(req.query || {}, 'doc') && swaggerUi) {
        return swaggerUi.processRequest(app, req, res);
    } else {
        res.redirect('info.html');
    }

});

module.exports = (appObj) => {

    app = appObj;
    app.use(express.static('./static'));

    return {
        path: '/',
        skip_domain: true,
        router
    };

};
