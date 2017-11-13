'use strict';


const BBPromise = require('bluebird');
const fs = BBPromise.promisifyAll(require('fs'));
const path = require('path');
const HTTPError = require('../lib/util.js').HTTPError;


// Swagger-ui helpfully exporting the absolute path of its dist directory
const docRoot = `${require('swagger-ui').dist}/`;

function processRequest(app, req, res) {

    const reqPath = req.query.path || '/index.html';
    const filePath = path.join(docRoot, reqPath);

    // Disallow relative paths.
    // Test relies on docRoot ending on a slash.
    if (filePath.substring(0, docRoot.length) !== docRoot) {
        throw new HTTPError({
            status: 404,
            type: 'not_found',
            title: 'File not found',
            detail: `${reqPath} could not be found.`
        });
    }

    return fs.readFileAsync(filePath)
    .then((body) => {
        if (reqPath === '/index.html') {
            body = body.toString()
                .replace(/((?:src|href)=['"])/g, '$1?doc&path=')
                // Some self-promotion
                .replace(/<a id="logo".*?<\/a>/,
                        `<a id="logo" href="${app.info.homepage}">${app.info.name}</a>`)
                .replace(/<title>[^<]*<\/title>/, `<title>${app.info.name}</title>`)
                // Replace the default url with ours, switch off validation &
                // limit the size of documents to apply syntax highlighting to
                .replace(/docExpansion: "none"/, 'docExpansion: "list", '
                    + 'validatorUrl: null, '
                    + 'highlightSizeThreshold: 10000')
                .replace(/ url: url,/, 'url: "/?spec",');
        }

        let contentType = 'text/html';
        if (/\.js$/.test(reqPath)) {
            contentType = 'text/javascript';
            body = body.toString()
                .replace(/underscore-min\.map/, '?doc&path=lib/underscore-min.map');
        } else if (/\.png$/.test(reqPath)) {
            contentType = 'image/png';
        } else if (/\.map$/.test(reqPath)) {
            contentType = 'application/json';
        } else if (/\.ttf$/.test(reqPath)) {
            contentType = 'application/x-font-ttf';
        } else if (/\.css$/.test(reqPath)) {
            contentType = 'text/css';
            body = body.toString().replace(/\.\.\/(images|fonts)\//g, '?doc&path=$1/');
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('content-security-policy', "default-src 'none'; " +
                        "script-src 'self' 'unsafe-inline'; connect-src *; " +
                        "style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self';");
        res.send(body.toString());
    })
    .catch({ code: 'ENOENT' }, () => {
        res.status(404)
            .type('not_found')
            .send('not found');
    });

}

module.exports = {
    processRequest
};

