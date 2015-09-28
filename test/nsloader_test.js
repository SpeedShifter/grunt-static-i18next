'use strict';

var grunt = require('grunt');
var path = require('path');

/*
 ======== A Handy Little Nodeunit Reference ========
 https://github.com/caolan/nodeunit

 Test methods:
 test.expect(numAssertions)
 test.done()
 Test assertions:
 test.ok(value, [message])
 test.equal(actual, expected, [message])
 test.notEqual(actual, expected, [message])
 test.deepEqual(actual, expected, [message])
 test.notDeepEqual(actual, expected, [message])
 test.strictEqual(actual, expected, [message])
 test.notStrictEqual(actual, expected, [message])
 test.throws(block, [error], [message])
 test.doesNotThrow(block, [error], [message])
 test.ifError(value)
 */

exports.static_i18next = {
  setUp: function (done) {
    // setup here if necessary
    done();
  },
  index: function (test) {
    var file = '.tmp/index.html';
    test.equal(grunt.file.exists(file), true, file + ' should be created');

    test.equal(grunt.file.read(file).indexOf('nsloader = function') > -1, true, file + ' should contain nsloader JS script');
    test.equal(grunt.file.read(file).indexOf('["css/views/<-lang->/<-ns->/index.css","css/views/<-lang->/<-ns->/settings.css","css/widgets/<-lang->/<-ns->/user.css","css/widgets/<-lang->/<-ns->/panel.css?param=1","css/widgets/<-lang->/<-ns->/board.css#hash"]') > -1, true, file + ' should contain css assertions');
    test.equal(grunt.file.read(file).indexOf('["js/widgets/<-lang->/<-ns->/user.js","js/widgets/<-lang->/<-ns->/panel.js?param=1","js/widgets/<-lang->/<-ns->/board.js#hash"]') > -1, true, file + ' should contain js assertions');

    test.done();
  },
  index2: function (test) {
    var file = '.tmp/index2.html';
    test.equal(grunt.file.exists(file), true, file + ' should be created');

    test.equal(grunt.file.read(file).indexOf('nsloader = function') > -1, true, file + ' should contain nsloader JS script');
    test.equal(grunt.file.read(file).indexOf('["css/views/<-lang->/<-ns->/index.css","css/views/<-lang->/<-ns->/settings.css","css/widgets/<-lang->/<-ns->/panel.css?param=1","css/widgets/<-lang->/<-ns->/board.css#hash"]') > -1, true, file + ' should contain css assertions');
    test.equal(grunt.file.read(file).indexOf('["js/<-lang->/<-ns->/main.js","js/<-lang->/<-ns->/menu.js","js/<-lang->/<-ns->/footer.js","js/widgets/<-lang->/<-ns->/user.js","js/widgets/<-lang->/<-ns->/panel.js?param=1","js/widgets/<-lang->/<-ns->/board.js#hash"]') > -1, true, file + ' should contain js assertions');

    test.done();
  }
};
