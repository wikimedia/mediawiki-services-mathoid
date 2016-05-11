'use strict';
var rewire = require('rewire');
var mathoid = rewire('../../../routes/mathoid');
//To test with invalid files as well, we need to gain direct access the optimize SVG method.
var optimize = mathoid.__get__('optimizeSvg');
var assert = require('../../utils/assert.js');


var testcases = [
    {in: '<svg>', err: 'Unclosed root tag'},
    {in: 'invalid', err: 'Error in parsing SVG'},
    {
        in: '<?xml version=\"1.0\"?>\r\n    <svg xmlns=\"http:\/\/www.w3.org\/2000\/svg\" width=\"200\" height=\"100\">\r\n        <text font-size=\"68\" font-weight=\"bold\" font-family=\"DejaVu Sans\"\r\n    y=\"52\" x=\"4\" transform=\"scale(.8,1.7)\"><tspan fill=\"#248\">W3<\/tspan>C<\/text>\r\n        <path fill=\"none\" stroke=\"#490\" stroke-width=\"12\" d=\"m138 66 20 20 30-74\"\/>\r\n        <\/svg>',
        title: 'compress from https://en.wikipedia.org/wiki/File:W3C_valid.svg',
        contains: 'W3'
    }
];
describe('Mathoids SVG compression', function () {
    testcases.forEach(function (t) {
        it(t.title || ('hanlde ' + t.err), function (done) {
            var err = false;
            var msg = false;
            var fakeReq = {
                logger: {
                    log: function (m, e) {
                        msg = m;
                        if (e instanceof Error) {
                            err = e.message;
                        } else {
                            err = e;
                        }
                    }
                }
            };
            var data = {svg: t.in};
            optimize(data, fakeReq, function () {
                if (t.err) {
                    assert.deepEqual(msg, 'warn/svgo');
                    assert.ok(err.indexOf(t.err) > 0, err.message + ' should contain ' + t.err);
                } else {
                    assert.deepEqual(msg, false);
                    assert.deepEqual(err, false);
                    assert.ok(data.svg.length <= t.in.length, 'Compression increased the file size');
                    if (t.contains) {
                        assert.ok(data.svg.indexOf(t.contains) >= 0, 'compressed svg should contain', t.contains);
                    }
                }
                done();
            });
        });
    });
});
