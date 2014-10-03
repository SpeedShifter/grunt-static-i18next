'use strict';
var _ = require('lodash');

var path = require('path');
var Q = require('q');
var i18next = require('i18next-client');

(function (TranslateTask) {
    var Task = (function () {
        function Task(grunt, task) {
            this.grunt = grunt;
            this.task = task;
        }
        Task.prototype.start = function (options) {
            var _this = this;
            this.options = options;
            return Q.promise(function (resolve, reject, notify) {
                try  {
                    _this.exec();
                    resolve(true);
                } catch (e) {
                    reject(e);
                }
            });
        };

        Task.prototype.exec = function () {
            this.loadLocales();
            this.getTaskLangs();
            this.initI18next();
            this.translateFiles();
        };

        Task.prototype.getTaskLangs = function () {
            var langs = this.options.lang;
            if (langs) {
                if (!_.isArray(langs))
                    langs = [langs];
            } else {
                langs = _.keys(this.localesSet);
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

                        (path.dirname(filepath).split(path.sep) || []).forEach(function (pt) {
                            last_obj = last_obj[pt] = last_obj[pt] || {};
                        });

                        last_obj[path.basename(filepath, path.extname(filepath))] = data;
                    }
                } else {
                    _this.grunt.log.warn('File "' + glob_path + '" doesn\'t exists.');
                }
                return obj;
            }, {});
        };

        Task.prototype.initI18next = function () {
            var _this = this;
            var i18next_defaults = {};
            var namespaces = [];
            this.taskLangs.forEach(function (lang) {
                namespaces = namespaces.concat(_.keys(_this.localesSet[lang]));
            });
            namespaces = _.uniq(namespaces);
            i18next_defaults.ns = {
                namespaces: namespaces,
                defaultNs: namespaces[0]
            };

            var init = _.extend(_.defaults(this.options.i18next || {}, i18next_defaults), {
                resStore: this.localesSet
            });
            _.defaults(init.ns, i18next_defaults.ns);

            i18next.init(init);
        };

        Task.prototype.saveFile = function (file, content, lang) {
            lang = lang || '';
            var dest = file.dest;
            if (this.options.langInFilename) {
                var langname = (this.options.langInFilename || '.') + lang, extname = path.extname(file.dest), filename = path.basename(file.dest, extname) + langname + extname;
                dest = path.join(path.dirname(file.dest), filename);
            } else {
                var langDir = path.join(file.orig.dest, lang);
                dest = path.normalize(file.dest.replace(file.orig.dest, langDir));
            }

            this.grunt.file.write(dest, content);
            this.grunt.log.writeln('File "' + dest + '" created.');
        };

        Task.prototype.translateFiles = function () {
            var _this = this;
            var lodashTemplate = this.options.lodashTemplate || {};
            this.taskLangs.forEach(function (lang) {
                i18next.setLng(lang, function (translate) {
                    _this.task.files.forEach(function (file) {
                        var src = file.src.filter(function (filepath) {
                            if (!_this.grunt.file.exists(filepath)) {
                                _this.grunt.log.warn('Source file "' + filepath + '" not found.');
                                return false;
                            } else {
                                return true;
                            }
                        }).map(function (filepath) {
                            var data = _this.grunt.file.read(filepath);
                            try  {
                                data = _.template(data, {}, _.extend(lodashTemplate, {
                                    imports: {
                                        t: translate
                                    }
                                }));
                            } catch (e) {
                                _this.grunt.log.warn('Error while translate: ' + e.message);
                            }
                            return data;
                        }).join('\n');

                        _this.saveFile(file, src, lang);
                    });
                });
            });
        };
        return Task;
    })();
    TranslateTask.Task = Task;
})(exports.TranslateTask || (exports.TranslateTask = {}));
var TranslateTask = exports.TranslateTask;
