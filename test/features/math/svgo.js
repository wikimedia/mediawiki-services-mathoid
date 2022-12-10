'use strict';

const rewire = require( 'rewire' );
const mathoid = rewire( '../../../lib/math' );
// To test with invalid files as well, we need to gain direct access the optimize SVG method.
// eslint-disable-next-line no-underscore-dangle
const optimize = mathoid.__get__( 'optimizeSvg' );
const assert = require( '../../utils/assert.js' );

const testcases = [
	{ in: '<svg>', err: 'Unclosed root tag' },
	{ in: 'invalid', err: 'Non-whitespace before first tag' },
	{
		in: '<?xml version="1.0"?>\r\n    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">\r\n        <text font-size="68" font-weight="bold" font-family="DejaVu Sans"\r\n    y="52" x="4" transform="scale(.8,1.7)"><tspan fill="#248">W3</tspan>C</text>\r\n        <path fill="none" stroke="#490" stroke-width="12" d="m138 66 20 20 30-74"/>\r\n        </svg>',
		title: 'compress from https://en.wikipedia.org/wiki/File:W3C_valid.svg',
		contains: 'W3'
	}
];
describe( 'Mathoids SVG compression', () => {
	testcases.forEach( ( t ) => {
		it( t.title || ( `hanlde ${t.err}` ), ( done ) => {
			let err = false;
			let msg = false;
			const logger = {
				log( m, e ) {
					msg = m;
					if ( e instanceof Error ) {
						err = e.message;
					} else {
						err = e;
					}
				}
			};
			const data = { svg: t.in };
			optimize( data, logger );
			if ( t.err ) {
				assert.deepEqual( msg, 'warn/svgo' );
				assert.ok( err.includes( t.err ), `${err} should contain ${t.err}` );
			} else {
				assert.deepEqual( msg, false );
				assert.deepEqual( err, false );
				assert.ok( data.svg.length <= t.in.length, 'Compression increased the file size' );
				if ( t.contains ) {
					assert.ok( data.svg.includes( t.contains ), 'compressed svg should contain', t.contains );
				}
			}
			done();
		} );
	} );
} );
