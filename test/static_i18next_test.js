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

var compareFiles = function(basepath, test) {
  var expected_path = path.join('test/expected', basepath),
    actual_path = path.join('.tmp', basepath);

  var expected_files = grunt.file.expand({
    cwd: expected_path,
    filter: 'isFile'
  }, ['**/*.*']);
  var actual_files = grunt.file.expand({
    cwd: actual_path,
    filter: 'isFile'
  }, ['**/*.*']);

  test.deepEqual(actual_files.sort(), expected_files.sort(), 'files structure should be the same');

  expected_files.forEach(function(file) {
    var actual_file = path.join(actual_path, file);
    var expected_file = path.join(expected_path, file);
    grunt.log.warn(file, grunt.file.exists(actual_file), grunt.file.exists(expected_file));
    test.equal(grunt.file.exists(actual_file), grunt.file.exists(expected_file), 'both '+file+' files should exist or both not exist');
    if (grunt.file.exists(actual_file))
      test.equal(grunt.file.read(actual_file), grunt.file.read(expected_file), 'both '+file+' files should be equal');
  });
};

exports.static_i18next = {
  setUp: function (done) {
    // setup here if necessary
    done();
  },
  translateApp: function (test) {
    test.expect(11); // 5 files test for exist and content + same files structure
    var folder = 'translateApp';

    compareFiles(folder, test);

    test.done();
  },
  translateEnLang: function (test) {
    test.expect(3); // 1 file test for exist and content + same files structure
    var folder = 'translateEnLang';

    compareFiles(folder, test);

    test.done();
  },
  translateLangInFilename: function (test) {
    test.expect(5); // 2 files test for exist and content + same files structure
    var folder = 'translateLangInFilename';

    compareFiles(folder, test);

    test.done();
  },
  translateDefNamespace: function (test) {
    test.expect(3); // 1 files test for exist and content + same files structure
    var folder = 'translateDefNamespace';

    compareFiles(folder, test);

    test.done();
  },
  translateSingleLang: function (test) {
    test.expect(3); // 1 files test for exist and content + same files structure
    var folder = 'translateSingleLang';

    compareFiles(folder, test);

    test.done();
  },
  translateSplitNS: function (test) {
    test.expect(9); // 4 files test for exist and content + same files structure
    var folder = 'translateSplitNS';

    compareFiles(folder, test);

    test.done();
  },
  translateSplitNSInFileName: function (test) {
    test.expect(9); // 4 files test for exist and content + same files structure
    var folder = 'translateSplitNSInFileName';

    compareFiles(folder, test);

    test.done();
  }
};
