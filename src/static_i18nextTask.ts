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

export module TranslateTask {
  export interface ITaskOptions {
    localeDir?: string;
    lang?: any; // meaning string or string[]
    langInFilename?: string;
    i18next?: I18nextOptions;
    lodashTemplate?: _.TemplateSettings;
  }

  export class Task {
    private options: ITaskOptions;

    private localesSet: any;
    private taskLangs: string[];


    constructor(private grunt: IGrunt, private task: grunt.task.IMultiTask<any>) {

    }

    start(options): Q.IPromise<any> {
      this.options = options;
      return Q.promise((resolve: (val: any) => void, reject: (val: any) => void, notify: (val: any) => void) => {
        try{
          this.exec();
          resolve(true);
        }catch(e){
          reject(e);
        }
      });
    }

    exec() {
      this.loadLocales();
      this.getTaskLangs();
      this.initI18next();
      this.translateFiles();
    }

    private getTaskLangs() {
      var langs = this.options.lang; // array of languages should be translate
      if (langs) {
        if (!_.isArray(langs))
          langs = [langs];
      } else { // if not specified, we need to translate all
        langs = _.keys(this.localesSet);
      }
      return this.taskLangs = langs;
    }

    private loadLocales() {
      if (!this.options.localeDir) {
        this.grunt.fail.warn("Specify localeDir option.");
        throw new Error();
      }

      var locales = this.grunt.file.expand({
        cwd: this.options.localeDir,
        filter: 'isFile'
      }, ['**/*.json']);

      if (!locales.length) {
        this.grunt.log.warn('There is no locale json files.');
        throw new Error();
      }

      return this.localesSet = _.reduce(locales, (obj: any, filepath: string) => {
        var glob_path = path.join(this.options.localeDir, filepath);
        if (this.grunt.file.exists(glob_path)) {
          var data = this.grunt.file.readJSON(glob_path);
          if (data) {
            var last_obj = obj;

            (path.dirname(filepath).split(path.sep) || [])
              .forEach((pt: string) => {
                last_obj = last_obj[pt] = last_obj[pt] || {};
              });

            last_obj[path.basename(filepath, path.extname(filepath))] = data;
          }
        } else {
          this.grunt.log.warn('File "'+glob_path+'" doesn\'t exists.');
        }
        return obj;
      }, {});
    }

    private initI18next() {
      var i18next_defaults:I18nextOptions = {};
      var namespaces = [];
      this.taskLangs.forEach((lang: string) => {
        namespaces = namespaces.concat(_.keys(this.localesSet[lang]));
      });
      namespaces = _.uniq(namespaces);
      i18next_defaults.ns = {
        namespaces: namespaces,
        defaultNs: namespaces[0]
      };

      var init = <I18nextOptions>_.extend(_.defaults(this.options.i18next || {}, i18next_defaults), <I18nextOptions>{
        resStore: this.localesSet
      });
      _.defaults(init.ns, i18next_defaults.ns);

      i18next.init(init);
    }

    private saveFile(file, content, lang) {
      lang = lang || '';
      var dest = file.dest;
      if (this.options.langInFilename) {
        var langname = (this.options.langInFilename || '.') + lang,
          extname = path.extname(file.dest),
          filename = path.basename(file.dest, extname) + langname  + extname;
        dest = path.join(path.dirname(file.dest), filename);
      } else{
        var langDir = path.join(file.orig.dest, lang);
        dest = path.normalize(file.dest.replace(file.orig.dest, langDir));
      }

      this.grunt.file.write(dest, content);
      this.grunt.log.writeln('File "' + dest + '" created.');
    }

    private translateFiles() {
      var lodashTemplate = this.options.lodashTemplate || {};
      this.taskLangs.forEach((lang: string) => {
        i18next.setLng(lang, (translate: (key: string, options?: any) => string) => {
          this.task.files.forEach((file: grunt.file.IFilesConfig) => {
            var src = file.src.filter((filepath) => {
              // Warn on and remove invalid source files (if nonull was set).
              if (!this.grunt.file.exists(filepath)) {
                this.grunt.log.warn('Source file "' + filepath + '" not found.');
                return false;
              } else {
                return true;
              }
            }).map((filepath) => {

              var data = this.grunt.file.read(filepath);
              try {
                data = _.template(data, {}, _.extend(lodashTemplate, {
                  imports: {
                    t: translate
                  }
                }))
              } catch (e) {
                this.grunt.log.warn('Error while translate: ' + e.message);
              }
              return data;
            }).join('\n');

            this.saveFile(file, src, lang);
          });
        });
      });
    }
  }
}