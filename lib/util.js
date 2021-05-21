'use strict';

const BBPromise = require( 'bluebird' );
const express = require( 'express' );
const uuid = require( 'cassandra-uuid' );
const bunyan = require( 'bunyan' );

/**
 * Error instance wrapping HTTP error responses
 */
class HTTPError extends Error {

	constructor( response ) {
		super();
		Error.captureStackTrace( this, HTTPError );

		if ( response.constructor !== Object ) {
			// just assume this is just the error message
			response = {
				status: 500,
				type: 'internal_error',
				title: 'InternalError',
				detail: response
			};
		}

		this.name = this.constructor.name;
		this.message = `${response.status}`;
		if ( response.type ) {
			this.message += `: ${response.type}`;
		}

		Object.assign( this, response );
	}
}

/**
 * Generates an object suitable for logging out of a request object
 *
 * @param {Object} req Request
 * @param {?RegExp} whitelistRE RegExp used to filter headers
 * @return {!Object} an object containing the key components of the request
 */
function reqForLog( req, whitelistRE ) {

	const ret = {
		url: req.originalUrl,
		headers: {},
		method: req.method,
		params: req.params,
		query: req.query,
		body: req.body,
		remoteAddress: req.connection.remoteAddress,
		remotePort: req.connection.remotePort
	};

	if ( req.headers && whitelistRE ) {
		Object.keys( req.headers ).forEach( ( hdr ) => {
			if ( whitelistRE.test( hdr ) ) {
				ret.headers[ hdr ] = req.headers[ hdr ];
			}
		} );
	}

	return ret;

}

/**
 * Serialises an error object in a form suitable for logging.
 *
 * @param {!Error} err error to serialise
 * @return {!Object} the serialised version of the error
 */
function errForLog( err ) {

	const ret = bunyan.stdSerializers.err( err );
	ret.status = err.status;
	ret.type = err.type;
	ret.detail = err.detail;

	// log the stack trace only for 500 errors
	if ( Number.parseInt( ret.status, 10 ) !== 500 ) {
		ret.stack = undefined;
	}

	return ret;

}

/**
 * Generates a unique request ID.
 *
 * @return {!string} the generated request ID
 */
function generateRequestId() {

	return uuid.TimeUuid.now().toString();

}

/**
 * Wraps all of the given router's handler functions with
 * promised try blocks so as to allow catching all errors,
 * regardless of whether a handler returns/uses promises
 * or not.
 *
 * @param {!Object} route the object containing the router and path to bind it to
 * @param {!Object} app the application object
 */
function wrapRouteHandlers( route, app ) {

	route.router.stack.forEach( ( routerLayer ) => {
		const path = ( route.path + routerLayer.route.path.slice( 1 ) )
			.replace( /\/:/g, '/--' )
			.replace( /^\//, '' )
			.replace( /[/?]+$/, '' );
		routerLayer.route.stack.forEach( ( layer ) => {
			const origHandler = layer.handle;
			const metric = app.metrics.makeMetric( {
				type: 'Histogram',
				name: 'router',
				prometheus: {
					name: 'service_runner_request_duration_seconds',
					help: 'request duration handled by router in seconds',
					staticLabels: app.metrics.getServiceLabel(),
					buckets: [ 0.01, 0.05, 0.1, 0.3, 1, 10 ]
				},
				labels: {
					names: [ 'path', 'method', 'status' ],
					omitLabelNames: true
				}
			} );
			layer.handle = ( req, res, next ) => {
				const startTime = Date.now();
				BBPromise.try( () => origHandler( req, res, next ) )
					.catch( next )
					.finally( () => {
						let statusCode = parseInt( res.statusCode, 10 ) || 500;
						if ( statusCode < 100 || statusCode > 599 ) {
							statusCode = 500;
						}
						metric.endTiming( startTime, [ path || 'root', req.method, statusCode ] );
					} );
			};
		} );
	} );
}

/**
 * Generates an error handler for the given applications and installs it.
 *
 * @param {!Object} app the application object to add the handler to
 */
function setErrorHandler( app ) {

	app.use( ( err, req, res, next ) => {
		let errObj;
		// ensure this is an HTTPError object
		if ( err.constructor === HTTPError ) {
			errObj = err;
		} else if ( err instanceof Error ) {
			// is this an HTTPError defined elsewhere? (preq)
			if ( err.constructor.name === 'HTTPError' ) {
				const o = { status: err.status };
				if ( err.body && err.body.constructor === Object ) {
					Object.keys( err.body ).forEach( ( key ) => {
						o[ key ] = err.body[ key ];
					} );
				} else {
					o.detail = err.body;
				}
				o.message = err.message;
				errObj = new HTTPError( o );
			} else {
				// this is a standard error, convert it
				errObj = new HTTPError( {
					status: 500,
					type: 'internal_error',
					title: err.name,
					detail: err.message,
					stack: err.stack
				} );
			}
		} else if ( err.constructor === Object ) {
			// this is a regular object, suppose it's a response
			errObj = new HTTPError( err );
		} else {
			// just assume this is just the error message
			errObj = new HTTPError( {
				status: 500,
				type: 'internal_error',
				title: 'InternalError',
				detail: err
			} );
		}
		// ensure some important error fields are present
		errObj.status = errObj.status || 500;
		errObj.type = errObj.type || 'internal_error';
		// add the offending URI and method as well
		errObj.method = errObj.method || req.method;
		errObj.uri = errObj.uri || req.url;
		// some set 'message' or 'description' instead of 'detail'
		errObj.detail = errObj.detail || errObj.message || errObj.description || '';
		// Keep error compatible to mathoid 0.2.x API
		errObj.log = errObj.log || errObj.detail;
		errObj.error = errObj.error || '';
		errObj.success = errObj.success || false;
		//
		// adjust the log level based on the status code
		let level = 'error';
		if ( Number.parseInt( errObj.status, 10 ) < 400 ) {
			level = 'trace';
		} else if ( Number.parseInt( errObj.status, 10 ) < 500 ) {
			level = 'info';
		}
		// log the error
		const component = ( errObj.component ? errObj.component : errObj.status );
		( req.logger || app.logger ).log( `${level}/${component}`, errForLog( errObj ) );
		// let through only non-sensitive info
		const respBody = {
			status: errObj.status,
			type: errObj.type,
			title: errObj.title,
			detail: errObj.detail,
			method: errObj.method,
			uri: errObj.uri,
			success: errObj.success,
			log: errObj.log,
			error: errObj.error
		};
		res.status( errObj.status ).json( respBody );
	} );

}

/**
 * Creates a new router with some default options.
 *
 * @param {?Object} [opts] additional options to pass to express.Router()
 * @return {!Object} a new router object
 */
function createRouter( opts ) {

	const options = {
		mergeParams: true
	};

	if ( opts && opts.constructor === Object ) {
		Object.assign( options, opts );
	}

	return new express.Router( options );

}

/**
 * Adds logger to the request and logs it.
 *
 * @param {!*} req request object
 * @param {!Object} app application object
 */
function initAndLogRequest( req, app ) {
	req.headers = req.headers || {};
	req.headers[ 'x-request-id' ] = req.headers[ 'x-request-id' ] || generateRequestId();
	req.logger = app.logger.child( {
		request_id: req.headers[ 'x-request-id' ],
		request: reqForLog( req, app.conf.log_header_whitelist )
	} );
	req.logger.log( 'trace/req', { msg: 'incoming request' } );
}

module.exports = {
	HTTPError,
	initAndLogRequest,
	wrapRouteHandlers,
	setErrorHandler,
	router: createRouter
};
