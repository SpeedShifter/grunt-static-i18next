'use strict';
var Q = require('q');

module.exports = function (grunt) {
    grunt.registerMultiTask('static_i18next', 'Grunt plugin for localizing static assets', function () {
        var self = this, promises = [], done = self.async(), options = this.options({});

        if (!options.localeDir) {
            grunt.fail.warn("Specify localeDir option.");
            return done();
        }
        grunt.log.warn('i18next.translate', options);

        var a = 1;
        self.files.forEach(function (gruntFile) {
        });

        Q.all(promises).then(function () {
            done();
        }, function () {
            done(false);
        });
    });
};
