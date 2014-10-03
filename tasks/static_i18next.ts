/// <reference path="./inc.d.ts" />
/*
 * grunt-static-i18next
 * 
 *
 * Copyright (c) 2014 Stas Yermakov
 * Licensed under the MIT license.
 */

'use strict';

import _ = require('lodash');
import fs = require('fs');
import path = require('path');
import i18next = require('i18next');
import Q = require('q');

module.exports = function (grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('static_i18next', 'Grunt plugin for localizing static assets', function () {
    var self: grunt.task.IMultiTask<{src: string;}> = this,
      promises: Q.IPromise<any>[] = [],
      done = self.async(),
      options = this.options({
      });

    if (!options.localeDir) {
      grunt.fail.warn("Specify localeDir option.");
      return done();
    }
    grunt.log.warn('i18next.translate', options);
//    grunt.log.warn('i18next.translate', i18next.translate ? true : false);

    var a = 1;
    self.files.forEach(function (gruntFile: grunt.file.IFileMap) {

    });

    Q.all(promises).then(() => {
      done();
    }, () => {
      done(false);
    });
  });

};
