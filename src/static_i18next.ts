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
import Q = require('q');
import i18next = require('i18next-client');

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

    var locales = grunt.file.expand({
      cwd: options.localeDir,
      filter: 'isFile'
    }, '**/*.json');

    if (!locales.length) {
      grunt.log.warn('There is no locale json files.');
      return done();
    }

    var locale_object = _.reduce(locales, (obj: any, filepath: string) => {
      var glob_path = path.join(options.localeDir, filepath);
      if (grunt.file.exists(glob_path)) {
        var data = grunt.file.readJSON(glob_path);
        if (data) {
          var last_obj = obj;

          (path.dirname(filepath).split(path.sep) || [])
            .forEach((pt: string) => {
              last_obj = last_obj[pt] = last_obj[pt] || {};
            });

          last_obj[path.basename(filepath, path.extname(filepath))] = data;
        }
      } else {
        grunt.log.warn('File "'+glob_path+'" doesn\'t exists.');
      }
      return obj;
    }, {});

    var langs = options.lang; // array of languages should be translate
    if (langs) {
      if (!_.isArray(langs))
        langs = [langs];
    } else { // if not specified, we need to translate all
      langs = _.keys(locale_object);
    }

    grunt.log.warn('i18next.translate', options);
//    grunt.log.warn('i18next.translate', options, JSON.stringify(locale_object, null, '  '));
//    grunt.log.warn('i18next.translate', i18next.translate ? true : false);


    i18next.init(<I18nextOptions>{
      resStore: locale_object
    });
    i18next.setDefaultNamespace('ns.common');

    langs.forEach((lang: string) => {
      i18next.setLng(lang, (translate: (key: string, options?: any) => string) => {
        this.files.forEach((file) => {
          var src = file.src.filter(function (filepath) {
            // Warn on and remove invalid source files (if nonull was set).
            if (!grunt.file.exists(filepath)) {
              grunt.log.warn('Source file "' + filepath + '" not found.');
              return false;
            } else {
              return true;
            }
          }).map(function (filepath) {
            var data = grunt.file.read(filepath);
            try {
              data = _.template(data, {}, {
                imports: {
                  t: translate
                }
              })
            } catch (e) {
              grunt.log.warn('Error while translate: ' + e.message);
            }
            return data;
          }).join('\n');

          grunt.file.write(file.dest, src);

          // Print a success message.
          grunt.log.writeln('File "' + file.dest + '" created.');
        });
      });
    });

    Q.all(promises).then(() => {
      done();
    }, () => {
      done(false);
    });
  });

};
