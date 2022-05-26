#!/usr/bin/env node
'use strict';
const program = require( 'commander' );

const BBPromise = require( 'bluebird' );
const json = require( '../package.json' );
const preq = require( 'preq' );

const server = require( '../test/utils/server.js' );
const fs = BBPromise.promisifyAll( require( 'fs' ) );
const path = require( 'path' );

const baseURL = server.config.uri;

program
	.version( json.version )
	.usage( '[options]' )
	.option( '-f, --force', 'Replace images in the data folders.' );

program.parse( process.argv );
const options = program.opts();
const filename = '../test/files/mathjax-texvc/basic-test-data.json';
const data = require( filename );
const dPath = path.resolve( __dirname, filename );

return server.start( { speech_config: { enrich: false } } ).delay( 1000 ).then( function () {
	console.log( 'Server started' );
	return BBPromise.resolve( data );
} ).each( function ( testcase ) { // we could use map but better keep the order
	console.log( '\n~~ ' + testcase.query.q + ' ~~' );
	return preq.post( {
		uri: baseURL,
		body: testcase.query
	} ).then( function ( res ) {
		testcase.response.status = res.status;
		delete res.body.png;
		delete res.body.streeXml;
		delete res.body.streeJson;
		testcase.response.body = res.body;
		return testcase;

	} );
} ).then( function ( newData ) {
	const outStr = JSON.stringify( newData, null, '\t' ) + '\n';
	if ( options.force ) {
		fs.writeFileSync( dPath, outStr );
	} else {
		console.log( outStr );
	}

} ).then( server.stop ).then( function () {
	console.log( 'done' );
	// eslint-disable-next-line no-process-exit
	process.exit( 0 );
} );
