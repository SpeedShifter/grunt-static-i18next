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
var Q = require('q');
var static_i18nextTask = require('./static_i18nextTask');
var NSLoaderTask;
(function (NSLoaderTask) {
    var Task = (function () {
        function Task(grunt, task) {
            this.grunt = grunt;
            this.task = task;
        }
        Task.fileTemplateToRegexp = function (template) {
            if (!template)
                return template;
            return '^[\\s\\t]*' + template.replace(/\./g, '\\.').replace(/\*\*\//g, '(?:[^\/]+\/)*').replace(/(?:^|([^\)]))\*/g, '$1[^\/]+').replace(/\//g, '\\/') + '[\\s\\t]*$';
        };
        Task.prototype.start = function (options) {
            this.options = _.extend({}, options);
            return Q.fcall(this.exec.bind(this));
        };
        Task.prototype.exec = function () {
            try {
            }
            catch (e) {
                this.grunt.log.warn('Error while init: ' + e.message);
            }
            try {
                this.processFiles();
            }
            catch (e) {
                this.grunt.log.warn('Error while processing Files: ' + e.message);
            }
        };
        Task.prototype.processFiles = function () {
            this.task.files.forEach(this.processFile.bind(this));
        };
        Task.prototype.processFile = function (file) {
            var _this = this;
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
                var data = _this.grunt.file.read(filepath);
                try {
                    data = _this.generateLoader(file, data);
                }
                catch (e) {
                    _this.grunt.log.warn('Error while processing file ' + filepath + ' : ' + e.message);
                }
                return data;
            }).join('\n');
            try {
                this.saveFile(file, src);
            }
            catch (e) {
                this.grunt.log.warn('Error while writing file: ' + e.message);
            }
        };
        Task.prototype.saveFile = function (file, content) {
            var dest = file.dest;
            this.grunt.file.write(dest, content);
            this.grunt.log.writeln('File "' + dest + '" created.');
        };
        Task.prototype.getLinks = function (content, regexp, regexp_link) {
            var cssLoader, css_items = [];
            regexp.lastIndex = 0;
            while (cssLoader = regexp.exec(content)) {
                var options = cssLoader[2], param1 = options.split(',')[0].replace(/(?:^\s*'|'\s*$)/g, '');
                css_items.push({
                    str: cssLoader[1],
                    options: options,
                    regexp: new RegExp(Task.fileTemplateToRegexp(param1)),
                    links: []
                });
            }
            _.forEach(css_items, function (item) {
                var cssLink;
                regexp_link.lastIndex = 0;
                while (cssLink = regexp_link.exec(content)) {
                    if (item.regexp.test(cssLink[2])) {
                        item.links.push({
                            str: cssLink[1],
                            link: cssLink[2]
                        });
                    }
                }
            });
            return css_items;
        };
        Task.prototype.generateLoader = function (file, content) {
            var css_items = this.getLinks(content, new RegExp(Task.regexps.css, 'gim'), new RegExp(Task.regexps.css_link, 'gim')), js_items = this.getLinks(content, new RegExp(Task.regexps.js, 'gim'), new RegExp(Task.regexps.js_link, 'gim')), cssLinks = _.uniq(_.map(_.flatten(_.map(css_items, 'links')), 'link')), jsLinks = _.uniq(_.map(_.flatten(_.map(js_items, 'links')), 'link')), cssStr = _.map(_.flatten(_.map(css_items, 'links')), 'str'), jsStr = _.map(_.flatten(_.map(js_items, 'links')), 'str'), code_template = _.template(Task.loaderTemplate), code = code_template({
                csslinks: JSON.stringify(Task.addPlaceholders(cssLinks, this.options, this.options.langPlaceholder, this.options.nsPlaceholder)),
                jslinks: JSON.stringify(Task.addPlaceholders(jsLinks, this.options, this.options.langPlaceholder, this.options.nsPlaceholder))
            }), positions = _.flattenDeep([_.map(css_items, 'str'), _.map(js_items, 'str')]);
            content = content.replace(positions[0], code);
            // clear links
            _.forEach(positions.concat(cssStr).concat(jsStr), function (pos) {
                content = content.replace(pos, '');
            });
            return content;
        };
        Task.addPlaceholders = function (scripts, options, langPlaceholder, nsPlaceholder) {
            if (langPlaceholder === void 0) { langPlaceholder = Task.loaderTemplateLangPlaceholder; }
            if (nsPlaceholder === void 0) { nsPlaceholder = Task.loaderTemplateNSplaceholder; }
            return _.map(scripts, function (link) {
                return static_i18nextTask.TranslateTask.Task.constructPath(link, options, langPlaceholder, nsPlaceholder).replace(/\\/g, '/');
            });
        };
        Task.escapeRegExp = function (text) {
            return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        };
        Task.regexps = {
            css: '^[\\s\\t]*(<!--[\\s\\t]*nsloader[\\s\\t]*:[\\s\\t]*css\\((.+)\\)[\\s\\t]*-->)[\\s\\t]*$',
            js: '^[\\s\\t]*(<!--[\\s\\t]*nsloader[\\s\\t]*:[\\s\\t]*js\\((.+)\\)[\\s\\t]*-->)[\\s\\t]*$',
            css_link: '^[\\s\\t]*(<link(?:[\\s\\t]+.+)?[\\s\\t]+(?:href=[\'"](.*)[\'"])[\\s\\t]*(?:\\/?>|>[\\s\\t]*<\\/[\\s\\t]*link[\\s\\t]*>))[\\s\\t]*$',
            js_link: '^[\\s\\t]*(<script(?:[\\s\\t]+.+)?[\\s\\t]+(?:src=[\'"](.*)[\'"])[\\s\\t]*(?:\\/?>|>[\\s\\t]*<\\/[\\s\\t]*script[\\s\\t]*>))[\\s\\t]*$'
        };
        Task.loaderTemplateNSplaceholder = '<-ns->';
        Task.loaderTemplateLangPlaceholder = '<-lang->';
        Task.loaderTemplate = '<script>' +
            '(function(context) {' +
            'var css = <%= csslinks%>,' +
            'js = <%= jslinks%>;' +
            'context.nsloader = function(lang, ns) {' +
            'var place = document.head || document.body;' +
            'for (var i=0, ii=css.length; i<ii; i++) {' +
            'var s = document.createElement( "link" );' +
            's.setAttribute("href", css[i].replace("' + Task.loaderTemplateNSplaceholder + '", ns).replace("' + Task.loaderTemplateLangPlaceholder + '", lang));' +
            's.setAttribute("rel", "stylesheet");' +
            'place.appendChild(s);' +
            '}' +
            'for (var i=0, ii=js.length; i<ii; i++) {' +
            'var s = document.createElement( "script" );' +
            's.setAttribute("src", js[i].replace("' + Task.loaderTemplateNSplaceholder + '", ns).replace("' + Task.loaderTemplateLangPlaceholder + '", lang));' +
            'place.appendChild(s);' +
            '}' +
            '};' +
            '})(window); nsloader("dev", "ns.common");' +
            '</script>';
        return Task;
    })();
    NSLoaderTask.Task = Task;
})(NSLoaderTask = exports.NSLoaderTask || (exports.NSLoaderTask = {}));
