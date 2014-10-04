/// <reference path="./inc.d.ts" />
/*
 * grunt-static-i18next
 * 
 *
 * Copyright (c) 2014 Stas Yermakov
 * Licensed under the MIT license.
 */

'use strict';

import path = require('path');
import Q = require('q');
import static_i18nextTask = require('./static_i18nextTask');

module.exports = function (grunt: IGrunt) {

  grunt.registerMultiTask('static_i18next', 'Grunt plugin for localizing static assets', function () {
    var self: grunt.task.IMultiTask<{src: string;}> = this,
      promises: Q.IPromise<any>[] = [],
      done = self.async(),
      options = this.options({
        localeDir: 'locale'
      });

    promises.push((new static_i18nextTask.TranslateTask.Task(grunt, self)).start(options));

    Q.all(promises).then(() => {
      done();
    }, () => {
      done(false);
    });
  });

};
