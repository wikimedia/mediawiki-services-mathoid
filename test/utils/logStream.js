'use strict';

const bunyan = require( 'bunyan' );

function logStream( logStdout ) {

	const log = [];
	const parrot = bunyan.createLogger( {
		name: 'test-logger',
		level: 'warn'
	} );

	function write( chunk, encoding, callback ) {
		try {
			const entry = JSON.parse( chunk );
			const levelMatch = /^(\w+)/.exec( entry.levelPath );
			if ( logStdout && levelMatch ) {
				const level = levelMatch[ 1 ];
				if ( parrot[ level ] ) {
					parrot[ level ]( entry );
				}
			}
		} catch ( e ) {
			console.error( 'something went wrong trying to parrot a log entry', e, chunk );
		}

		log.push( chunk );
	}

	// to implement the stream writer interface
	function end( chunk, encoding, callback ) {
	}

	function get() {
		return log;
	}

	function slice() {

		const beginPos = log.length;
		let endPos = null;

		function halt() {
			if ( endPos === null ) {
				endPos = log.length;
			}
		}

		function getInner() {
			return log.slice( beginPos, endPos );
		}

		return {
			halt: halt,
			get: getInner
		};

	}

	return {
		write: write,
		end: end,
		slice: slice,
		get: get
	};
}

module.exports = logStream;
