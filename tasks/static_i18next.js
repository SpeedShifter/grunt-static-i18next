/// <reference path="./inc.d.ts" />
/*
 * grunt-static-i18next
 *
 *
 * Copyright (c) 2014 Stas Yermakov
 * Licensed under the MIT license.
 */
'use strict';
var Q = require('q');
var static_i18nextTask = require('./static_i18nextTask');
var nsloaderTask = require('./nsloaderTask');
module.exports = function (grunt) {
    grunt.registerMultiTask('static_i18next', 'Grunt plugin for localizing static assets', function () {
        var self = this, promises = [], done = self.async(), options = this.options({
            localeDir: 'locale'
        });
        promises.push((new static_i18nextTask.TranslateTask.Task(grunt, self)).start(options));
        Q.all(promises).then(function () {
            done();
        }, function () {
            done(false);
        });
    });
    grunt.registerMultiTask('nsloader', 'Grunt plugin to dynamically load translated files', function () {
        var self = this, promises = [], done = self.async(), options = this.options({});
        promises.push((new nsloaderTask.NSLoaderTask.Task(grunt, self)).start(options));
        Q.all(promises).then(function () {
            done();
        }, function () {
            done(false);
        });
    });
};
