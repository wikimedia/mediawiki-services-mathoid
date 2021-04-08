'use strict';

const Mocks = require('mock-express-response');
const mathoid = require('./math.js');
const BBPromise = require('bluebird');
const fs = BBPromise.promisifyAll(require('fs'));
const mjAPI = require('mathoid-mathjax-node');
const yaml = require('js-yaml');

function getError(msg, detail) {
	return new BBPromise(((res) => {
		res({ success: false, error: msg, detail });
	}));
}

function handleRequest(req, response, q, type, outformat, features, logger, conf, api) {
	return BBPromise.try(() => mathoid.handleRequest(response,
		q,
		type,
		outformat,
		features,
		logger,
		conf,
		api)
		.then(() => {
			let jsonResult;
			const contentType = response.get('Content-Type');
			if (/json/.test(contentType)) {
				// eslint-disable-next-line no-underscore-dangle
				jsonResult = response._getJSON();
			} else if (/xml/.test(contentType)) {
				// eslint-disable-next-line no-underscore-dangle
				jsonResult = response._getString();
			} else {
				// eslint-disable-next-line no-underscore-dangle
				jsonResult = Buffer.concat(response._responseData);
			}
			return { req, res: jsonResult };
		})).catch((e) => { return { req, res: e }; });
}

function render(data, conf) {
	if (!data) {
		return getError('empty input data');
	}
	try {
		data = JSON.parse(data);
	} catch (e) {
		return getError(`invalid json input: ${e.message}`);
	}
	const renderings = BBPromise.map(data, (req) => {
		const response = new Mocks();
		return handleRequest(req,
			response,
			req.query.q,
			req.query.type,
			req.query.outformat,
			req.query.features,
			{},
			conf,
			mjAPI);
	});
	return BBPromise.reduce(renderings, (out, el) => {
		if (el.req.query.hash) {
			const key = el.req.query.hash;
			out[key] = el.res;
		} else {
			out.nohash.push(el);
		}
		return out;
	}, { nohash: [], success: true });
}

function getConfig(configLocation) {
	const config = yaml.load(fs.readFileSync(configLocation));
	const myServiceIdx = config.services.length - 1;
	const conf = config.services[myServiceIdx].conf;
	if (conf.png) {
		let rsvgVersion = false;
		try {
			// eslint-disable-next-line node/no-missing-require
			rsvgVersion = require('librsvg/package.json').version;
		} catch (e) {
		}
		if (!rsvgVersion) {
			conf.png = false;
		}
	}
	return conf;
}

function startMathJax(configLocation) {
	const conf = getConfig(configLocation);
	mjAPI.config(conf.mj_config);
	// This call is not required but it might improve the performance slightly
	mjAPI.start();
	return conf;
}

module.exports = {
	render,
	config: getConfig,
	start: startMathJax
};
