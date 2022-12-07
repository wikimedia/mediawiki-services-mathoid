'use strict';
/*
 * Exception handling and special cases
 */
const render = require( '../../../lib/render.js' );
const assert = require( '../../utils/assert.js' );

describe( 'Mathoid special tests ', function () {
	let config;
	before( function () {
		config = render.start( 'config.dev.yaml' );
	} );
	it( 'test invalid output format', function () {
		const confNoSvg = render.config( 'config.dev.yaml' );
		confNoSvg.svg = false;
		const input = [ { query: { q: 'E=mc^2', outformat: 'svg' } } ];
		const rend = render.render( JSON.stringify( input ), confNoSvg ).then( function ( res ) {
			assert.ok( res.success );
			const firstRes = res.nohash[ 0 ].res;
			assert.ok( !firstRes.success );
			assert.deepEqual( firstRes.detail, 'Output format svg is disabled via config' );
		} );
		return rend;
	} );
	it( 'render invalid texvcinfo type', function () {
		const input = [ {
			query: {
				q: 'E=mc^2',
				outformat: 'texvcinfo',
				type: 'mml'
			}
		} ];
		return render.render( JSON.stringify( input ), config ).then( function ( res ) {
			assert.ok( res.success );
			const firstRes = res.nohash[ 0 ].res;
			assert.ok( !firstRes.success, 'texvcinfo accepts only tex' );
		} );
	} );
	it( 'render invalid graph type', function () {
		const input = [ {
			query: {
				q: 'E=mc^2',
				outformat: 'graph',
				type: 'mml'
			}
		} ];
		return render.render( JSON.stringify( input ), config ).then( function ( res ) {
			assert.ok( res.success );
			const firstRes = res.nohash[ 0 ].res;
			assert.ok( !firstRes.success, 'texvcinfo accepts only tex' );
		} );
	} );
	it( 'render json example', function () {
		const input = [ {
			query: {
				q: 'E=mc^2',
				outformat: 'json'
			}
		} ];
		return render.render( JSON.stringify( input ), config ).then( function ( res ) {
			assert.ok( res.success );
			const firstRes = res.nohash[ 0 ].res;
			assert.ok( firstRes.svg );
		} );
	} );
	it( 'render invalid outformat', function () {
		const input = [ { query: { q: 'E=mc^2', outformat: 'invalid' } } ];

		return render.render( JSON.stringify( input ), config ).then( function ( res ) {
			assert.ok( res.success );
			const firstRes = res.nohash[ 0 ].res;
			assert.ok( !firstRes.success );
			assert.deepEqual( firstRes.detail, 'Output format "invalid" is not' );
		} );
	} );
	it( 'respect the nospeech flag', function () {
		const input = [ {
			query: {
				q: 'E=mc^2',
				features: {
					nospeech: true
				}
			}
		} ];
		return render.render( JSON.stringify( input ), config ).then( function ( res ) {
			assert.ok( res.success );
			const firstRes = res.nohash[ 0 ].res;
			assert.deepEqual( firstRes.speakText, 'E=mc^{2}' );
		} );
	} );
	it( 'respect the details speech config', function () {
		const confNoSpeech = render.config( 'config.dev.yaml' );
		confNoSpeech.speech_config.speakText = false;
		const input = [ {
			query: {
				q: 'E=mc^2'
			}
		} ];
		return render.render( JSON.stringify( input ), confNoSpeech ).then( function ( res ) {
			assert.ok( res.success );
			const firstRes = res.nohash[ 0 ].res;
			assert.deepEqual( firstRes.speakText, 'E=mc^{2}' );
		} );
	} );
	it( 'compress svg images', function () {
		const confSvgo = render.config( 'config.dev.yaml' );
		confSvgo.svgo = true;
		const input = [ {
			query: {
				q: 'E=mc^2',
				outformat: 'svg'
			}
		} ];
		return render.render( JSON.stringify( input ), confSvgo ).then( function ( res ) {
			assert.ok( res.success );
			const firstRes = res.nohash[ 0 ].res;
			// The length of the uncompressed SVG image 3653 chars
			assert.ok( firstRes.length < 3653, 'compressed image should be smaller than uncompressed image' );
		} );
	} );
} );
