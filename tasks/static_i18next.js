'use strict';
var Q = require('q');
var static_i18nextTask = require('./static_i18nextTask');

module.exports = function (grunt) {
    grunt.registerMultiTask('static_i18next', 'Grunt plugin for localizing static assets', function () {
        var self = this, promises = [], done = self.async(), options = this.options({
            defaultNamespace: 'ns.common'
        });

        promises.push((new static_i18nextTask.TranslateTask.Task(grunt, self)).start(options));

        Q.all(promises).then(function () {
            done();
        }, function () {
            done(false);
        });
    });
};
