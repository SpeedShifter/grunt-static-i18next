/// <reference path="./inc.d.ts" />
/*
 * grunt-static-i18next
 *
 *
 * Copyright (c) 2014 Stas Yermakov
 * Licensed under the MIT license.
 */
'use strict';
var _ = require('lodash');
var path = require('path');
var Q = require('q');
var i18next = require('i18next-client');
var TranslateTask;
(function (TranslateTask) {
    var Task = (function () {
        function Task(grunt, task) {
            this.grunt = grunt;
            this.task = task;
        }
        Task.prototype.start = function (options) {
            this.options = _.extend({}, options);
            return Q.fcall(this.exec.bind(this));
        };
        Task.prototype.exec = function () {
            try {
                this.loadLocales();
                this.getTaskLangs();
                this.initI18next();
            }
            catch (e) {
                this.grunt.log.warn('Error while init: ' + e.message);
            }
            try {
                this.translateFiles();
            }
            catch (e) {
                this.grunt.log.warn('Error while translate Files: ' + e.message);
            }
        };
        Task.prototype.getTaskLangs = function () {
            var langs = _.keys(this.localesSet); // array of languages should be translate
            if (this.options.lang) {
                if (_.isArray(this.options.lang))
                    langs = this.options.lang;
                else
                    langs = [this.options.lang];
            }
            return this.taskLangs = langs;
        };
        Task.prototype.loadLocales = function () {
            var _this = this;
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
            return this.localesSet = _.reduce(locales, function (obj, filepath) {
                var glob_path = path.join(_this.options.localeDir, filepath);
                if (_this.grunt.file.exists(glob_path)) {
                    var data = _this.grunt.file.readJSON(glob_path);
                    if (data) {
                        var last_obj = obj;
                        (path.dirname(filepath).split(path.sep) || [])
                            .forEach(function (pt) {
                            last_obj = last_obj[pt] = last_obj[pt] || {};
                        });
                        last_obj[path.basename(filepath, path.extname(filepath))] = data;
                    }
                }
                else {
                    _this.grunt.log.warn('File "' + glob_path + '" doesn\'t exists.');
                }
                return obj;
            }, {});
        };
        Task.prototype.initI18next = function () {
            var _this = this;
            var namespaces = [];
            this.taskLangs.forEach(function (lang) {
                namespaces = namespaces.concat(_.keys(_this.localesSet[lang]));
            });
            namespaces = _.uniq(namespaces);
            this.namespaces = namespaces;
            var task_i18next_options = _.cloneDeep(this.options.i18next);
            if (this.options.splitNamespace) {
                var defNS = task_i18next_options
                    && task_i18next_options.ns
                    && task_i18next_options.ns.defaultNs;
                if (!task_i18next_options.fallbackNS && defNS)
                    task_i18next_options.fallbackNS = [defNS];
                task_i18next_options.fallbackToDefaultNS = true;
            }
            var init = _.defaults(_.extend(task_i18next_options || {}, {
                resStore: this.localesSet
            }), { ns: {} });
            _.defaults(init.ns, {
                namespaces: namespaces,
                defaultNs: namespaces[0]
            });
            //this.grunt.log.writeln(JSON.stringify(_.omit(init, 'resStore'), null, '  '));
            i18next.init(init);
        };
        Task.prototype.saveFile = function (file, content, lang, ns) {
            if (lang === void 0) { lang = ''; }
            var dest = file.dest, extname = path.extname(file.dest), filename = [path.basename(file.dest, extname), extname], filepath = path.dirname(file.dest);
            if (!(this.options.singleLang && this.taskLangs.length == 1)) {
                if (this.options.langInFilename) {
                    var langname = (_.isString(this.options.langInFilename) ? this.options.langInFilename : '.') + lang;
                    filename.splice(-1, 0, langname);
                }
                else {
                    filepath = path.join(filepath, lang);
                }
            }
            if (ns) {
                if (this.options.nsInFilename) {
                    var nsname = (_.isString(this.options.nsInFilename) ? this.options.nsInFilename : '.') + ns;
                    filename.splice(-1, 0, nsname);
                }
                else
                    filepath = path.join(filepath, ns);
            }
            dest = path.join(filepath, filename.join(''));
            this.grunt.file.write(dest, content);
            this.grunt.log.writeln('File "' + dest + '" created.');
        };
        Task.prototype.translateFileLang = function (file, lang, ns) {
            var _this = this;
            var lodashTemplate = this.options.lodashTemplate || {};
            if (ns)
                i18next.setDefaultNamespace(ns);
            i18next.setLng(lang, function (error, translate) {
                var src = file.src.filter(function (filepath) {
                    // Warn on and remove invalid source files (if nonull was set).
                    if (!_this.grunt.file.exists(filepath)) {
                        _this.grunt.log.warn('Source file "' + filepath + '" not found.');
                        return false;
                    }
                    else {
                        return true;
                    }
                }).map(function (filepath) {
                    var data = _this.grunt.file.read(filepath), templateOptions = _.defaults(lodashTemplate, { imports: {} });
                    _.extend(templateOptions.imports, {
                        t: translate
                    });
                    try {
                        var executor = _.template(data, templateOptions);
                        data = executor({});
                    }
                    catch (e) {
                        _this.grunt.log.warn('Error while translate: ' + e.message);
                    }
                    return data;
                }).join('\n');
                try {
                    _this.saveFile(file, src, lang, ns);
                }
                catch (e) {
                    _this.grunt.log.warn('Error while writing file: ' + e.message);
                }
            });
        };
        Task.prototype.translateFiles = function () {
            var _this = this;
            this.taskLangs.forEach(function (lang) {
                if (_this.options.splitNamespace) {
                    _.forEach(_this.namespaces, function (ns) {
                        _this.task.files.forEach(function (file) {
                            _this.translateFileLang(file, lang, ns);
                        });
                    });
                }
                else {
                    _this.task.files.forEach(function (file) {
                        _this.translateFileLang(file, lang);
                    });
                }
            });
        };
        return Task;
    })();
    TranslateTask.Task = Task;
})(TranslateTask = exports.TranslateTask || (exports.TranslateTask = {}));
