'use strict';
const preq = require( 'preq' );
const assert = require( '../../utils/assert.js' );
const server = require( '../../utils/server.js' );
const baseURL = server.config.uri;

const fs = require( 'fs' );
const path = require( 'path' );

describe( 'Run test for all mathjax-texvc commands:', function () {
	this.timeout( 0 );
	before( function ( cb ) {
		// Wait for MathJax startup, as that's somewhat async but has a sync
		// interface
		setTimeout( cb, 2000 );
	} );
	// read test cases
	const formulae = require( '../../files/mathjax-texvc/mathjax-texvc.json' );
	// create a mocha test case for each chunk
	describe( 'Run texvc tests', function () {
		formulae.forEach( function ( testcase ) {
			if ( testcase.ignore !== true ) {
				it( testcase.id + ' $' + testcase.input + '$', function () {
					return preq.post( {
						uri: baseURL + 'svg/',
						body: { q: testcase.input, nospeech: true }
					} ).then( function ( res ) {
						assert.status( res, 200 );
						const referenceSvg = fs.readFileSync( path.resolve( __dirname, '../../files/mathjax-texvc/svg', testcase.id + '.svg' ) );
						assert.deepEqual( res.body, referenceSvg, testcase.id + ' failed. SVG is different!' );
					} );
				} );
			}
		} );
	} );
} );
