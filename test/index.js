'use strict';


// Run jshint as part of normal testing
require('mocha-jshint')();
require('mocha-eslint')([
    'lib',
    'routes'
], {
    timeout: 10000
});
