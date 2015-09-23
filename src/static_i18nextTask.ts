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

  export interface IPathConstructOptions {
    langInFilename?: string | boolean;
    nsInFilename?: string | boolean;
    splitNamespace?: boolean;
    singleLang?: boolean;
  }

  export interface ITaskOptions extends IPathConstructOptions {
    localeDir?: string;
    lang?: string[] | string; // meaning string or string[]
    i18next?: I18nextOptions;
    lodashTemplate?: _.TemplateSettings;
  }

  export class Task {
    private options: ITaskOptions;

    private localesSet: any;
    private taskLangs: string[];
    private namespaces: string[];

    constructor(private grunt: IGrunt, private task: grunt.task.IMultiTask<any>) {

    }

    start(options): Q.IPromise<any> {
      this.options = _.extend({}, options);
      return Q.fcall(this.exec.bind(this));
    }

    exec() {
      try {
        this.loadLocales();
        this.getTaskLangs();
        this.initI18next();
      } catch(e) {
        this.grunt.log.warn('Error while init: ' + e.message);
      }

      try {
        this.translateFiles();
      } catch(e) {
        this.grunt.log.warn('Error while translate Files: ' + e.message);
      }
    }

    private getTaskLangs() {
      var langs = _.keys(this.localesSet); // array of languages should be translate
      if (this.options.lang) {
        if (_.isArray(this.options.lang))
          langs = <string[]>this.options.lang;
        else
          langs = [<string>this.options.lang];
      }

      this.options.singleLang = this.options.singleLang && langs.length == 1;
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
      var namespaces = [];
      this.taskLangs.forEach((lang: string) => {
        namespaces = namespaces.concat(_.keys(this.localesSet[lang]));
      });
      namespaces = _.uniq(namespaces);
      this.namespaces = namespaces;

      var task_i18next_options = _.cloneDeep<any>(this.options.i18next);

      if (this.options.splitNamespace) {
        var defNS = task_i18next_options
          && task_i18next_options.ns
          && task_i18next_options.ns.defaultNs;

        if (!task_i18next_options.fallbackNS && defNS)
          task_i18next_options.fallbackNS = [defNS];

        task_i18next_options.fallbackToDefaultNS = true;
      }

      var init = <I18nextOptions>_.defaults(_.extend(task_i18next_options || {}, <I18nextOptions>{
          resStore: this.localesSet
        }), {ns: {}});

      _.defaults(init.ns, {
        namespaces: namespaces,
        defaultNs: namespaces[0]
      });

      //this.grunt.log.writeln(JSON.stringify(_.omit(init, 'resStore'), null, '  '));

      i18next.init(init);
    }

    static constructPath(link: string, options: IPathConstructOptions, lang: string = '', ns?: string) {
      var dest = link,
        extname = path.extname(link),
        filename = [path.basename(link, extname), extname],
        filepath = path.dirname(link);

      if (!options.singleLang) {
        if (options.langInFilename) {
          var langname = (_.isString(options.langInFilename) ? options.langInFilename : '.') + lang;
          filename.splice(-1,0, langname);
        } else {
          filepath = path.join(filepath, lang);
        }
      }

      if (ns) {
        if (options.nsInFilename) {
          var nsname = (_.isString(options.nsInFilename) ? options.nsInFilename : '.') + ns;
          filename.splice(-1,0, nsname);
        } else
          filepath = path.join(filepath, ns);
      }

      return path.join(filepath, filename.join(''));
    }

    private saveFile(file, content, lang: string = '', ns?: string) {
      var dest = Task.constructPath(file.dest, this.options, lang, ns);

      this.grunt.file.write(dest, content);
      this.grunt.log.writeln('File "' + dest + '" created.');
    }

    private translateFileLang(file: grunt.file.IFilesConfig, lang: string, ns?: string) {
      var lodashTemplate = this.options.lodashTemplate || {};
      if (ns)
        i18next.setDefaultNamespace(ns);

      i18next.setLng(lang, (error: any, translate: (key: string, options?: any) => string) => {
        var src = file.src.filter((filepath) => {
          // Warn on and remove invalid source files (if nonull was set).
          if (!this.grunt.file.exists(filepath)) {
            this.grunt.log.warn('Source file "' + filepath + '" not found.');
            return false;
          } else {
            return true;
          }
        }).map((filepath) => {
          var data = this.grunt.file.read(filepath),
            templateOptions = _.defaults<_.TemplateSettings, _.TemplateSettings>(lodashTemplate, {imports: {}});

          _.extend(templateOptions.imports, {
            t: translate
          });

          try {
            var executor = _.template(data, templateOptions);
            data = executor({});
          } catch (e) {
            this.grunt.log.warn('Error while translate: ' + e.message);
          }
          return data;
        }).join('\n');

        try {
          this.saveFile(file, src, lang, ns);
        } catch (e) {
          this.grunt.log.warn('Error while writing file: ' + e.message);
        }
      });
    }

    private translateFiles() {
      this.taskLangs.forEach((lang: string) => {
        if (this.options.splitNamespace) {
          _.forEach(this.namespaces, (ns: string) => {
            this.task.files.forEach((file: grunt.file.IFilesConfig) => {
              this.translateFileLang(file, lang, ns);
            });
          });
        } else {
          this.task.files.forEach((file: grunt.file.IFilesConfig) => {
            this.translateFileLang(file, lang);
          });
        }
      });
    }
  }
}