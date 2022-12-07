'use strict';
/*
 * Simple CLI tests
 */
const render = require( '../../../lib/render.js' );
const assert = require( '../../utils/assert.js' );

describe( 'Mathoid CLI tests ', function () {
	let config;
	before( function () {
		config = render.start( 'config.dev.yaml' );
	} );
	it( 'get config test', function () {
		assert.ok( config.svg );
	} );
	it( 'render minimal example', function () {
		return render.render( '[{"query":{"q":"E=mc^2"}}]', config ).then( function ( res ) {
			assert.ok( res.success );
			assert.ok( res.nohash[ 0 ].res.success );
		} );
	} );
	it( 'try render empty', function () {
		return render.render( '', config ).then( function ( res ) {
			assert.ok( !res.success );
			assert.deepEqual( res.error, 'empty' );
		} );
	} );
	it( 'try render invalid', function () {
		return render.render( '{no-json}', config ).then( function ( res ) {
			assert.ok( !res.success );
			assert.deepEqual( res.error, 'invalid json' );
		} );
	} );
	it( 'render failing example', function () {
		return render.render( '[{"query":{"q":"\\fail"}}]', config ).then( function ( res ) {
			assert.ok( res.success );
			assert.ok( !res.nohash[ 0 ].res.success );
			assert.deepEqual( res.nohash[ 0 ].res.status, 400 );
			assert.deepEqual( res.nohash[ 0 ].res.error, 'SyntaxError' );
		} );
	} );
	it( 'render multiple hash formulae', function () {
		return render.render( '[{"query":{"q":"A", "hash":"h65"}},{"query":{"q":"B", "hash":"h66"}}]', config ).then( function ( res ) {
			assert.ok( res.success );
			assert.ok( res.h65.success );
			assert.ok( res.h66.success );
			assert.deepEqual( res.h65.speech, 'upper A' );
			assert.deepEqual( res.h66.speech, 'upper B' );
			assert.deepEqual( res.nohash.length, 0 );
		} );
	} );
	it( 'render to mml format', function () {
		const input = [ {
			query: {
				q: 'E=mc^2',
				outformat: 'mml'
			}
		} ];
		return render.render( JSON.stringify( input ), config ).then( function ( res ) {
			assert.ok( res.success );
			const firstRes = res.nohash[ 0 ].res;
			assert.deepEqual( firstRes, '</math>' );
			assert.deepEqual( firstRes, '</mi>' );
		} );
	} );
} );
