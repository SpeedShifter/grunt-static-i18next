'use strict';
var _ = require('lodash');

var path = require('path');
var Q = require('q');
var i18next = require('i18next-client');

module.exports = function (grunt) {
    grunt.registerMultiTask('static_i18next', 'Grunt plugin for localizing static assets', function () {
        var _this = this;
        var self = this, promises = [], done = self.async(), options = this.options({});

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

        var locale_object = _.reduce(locales, function (obj, filepath) {
            var glob_path = path.join(options.localeDir, filepath);
            if (grunt.file.exists(glob_path)) {
                var data = grunt.file.readJSON(glob_path);
                if (data) {
                    var last_obj = obj;

                    (path.dirname(filepath).split(path.sep) || []).forEach(function (pt) {
                        last_obj = last_obj[pt] = last_obj[pt] || {};
                    });

                    last_obj[path.basename(filepath, path.extname(filepath))] = data;
                }
            } else {
                grunt.log.warn('File "' + glob_path + '" doesn\'t exists.');
            }
            return obj;
        }, {});

        var langs = options.lang;
        if (langs) {
            if (!_.isArray(langs))
                langs = [langs];
        } else {
            langs = _.keys(locale_object);
        }

        grunt.log.warn('i18next.translate', options);

        i18next.init({
            resStore: locale_object
        });
        i18next.setDefaultNamespace('ns.common');

        langs.forEach(function (lang) {
            i18next.setLng(lang, function (translate) {
                _this.files.forEach(function (file) {
                    var src = file.src.filter(function (filepath) {
                        if (!grunt.file.exists(filepath)) {
                            grunt.log.warn('Source file "' + filepath + '" not found.');
                            return false;
                        } else {
                            return true;
                        }
                    }).map(function (filepath) {
                        var data = grunt.file.read(filepath);
                        try  {
                            data = _.template(data, {}, {
                                imports: {
                                    t: translate
                                }
                            });
                        } catch (e) {
                            grunt.log.warn('Error while translate: ' + e.message);
                        }
                        return data;
                    }).join('\n');

                    var destfile = path.join(path.dirname(file.dest), lang, path.basename(file.dest));
                    grunt.file.write(destfile, src);

                    grunt.log.writeln('File "' + destfile + '" created.');
                });
            });
        });

        Q.all(promises).then(function () {
            done();
        }, function () {
            done(false);
        });
    });
};
