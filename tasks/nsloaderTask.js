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
                return null;
            var negative = false;
            if (template[0] == '!') {
                template = template.substr(1);
                negative = true;
            }
            return { isNegative: negative,
                regexp: new RegExp('^(?:[\\s\\t]*'
                    + template.replace(/\./g, '\\.')
                        .replace(/\*\*\//g, '(?:[^\/]+\/)*')
                        .replace(/(?:^|([^\)]))\*/g, '$1[^\/]*')
                        .replace(/\//g, '\\/')
                    + '(?:[\\?#].*)?[\\s\\t]*)$') };
        };
        Task.testFileRegexp = function (regexps, str) {
            if (!regexps || !regexps.length)
                return false;
            return _.find(regexps, function (rg) {
                return !rg.isNegative && rg.regexp.test(str);
            })
                && !_.find(regexps, function (rg) {
                    return rg.isNegative && rg.regexp.test(str);
                });
        };
        Task.getLinks = function (content, regexp_link, filter) {
            var link, links = [];
            regexp_link.lastIndex = 0;
            while (link = regexp_link.exec(content)) {
                if (!filter) {
                    links.push({
                        index: link.index,
                        raw: link[1],
                        link: link[2]
                    });
                }
                else if (Task.testFileRegexp(filter, link[2])) {
                    links.push({
                        index: link.index,
                        raw: link[1],
                        link: link[2]
                    });
                }
            }
            return links;
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
            var loader, reg = [new RegExp(regexp[0], 'gi'), new RegExp(regexp[1], 'gi')], block_start = [], block_end = [], blocks = [];
            while (loader = reg[0].exec(content)) {
                var options = _.trim(loader[2]);
                if (/^\(.*\)$/i.test(options)) {
                    blocks.push({
                        type: 'inline',
                        options: options,
                        index: loader.index,
                        raw: loader[1]
                    });
                }
                else {
                    block_start.push({
                        type: 'block-start',
                        options: options,
                        index: loader.index,
                        raw: loader[1]
                    });
                }
            }
            while (loader = reg[1].exec(content)) {
                block_end.push({
                    type: 'block-end',
                    index: loader.index,
                    raw: loader[1]
                });
            }
            _.forEach(block_end, function (blck) {
                var index = _.findLastIndex(block_start, function (b) {
                    return blck.index > b.index;
                });
                block_start.splice(index + 1, 0, blck);
            });
            var stack = [];
            _.forEach(block_start, function (blck, index) {
                if (blck.type == 'block-start') {
                    stack.push(blck);
                }
                if (blck.type == 'block-end' && stack.length) {
                    var start_blck = stack.splice(-1, 1);
                    blocks.push({
                        type: 'block',
                        start: start_blck[0],
                        end: blck
                    });
                }
            });
            _.forEach(blocks, function (block) {
                switch (block.type) {
                    case 'inline':
                        var filter = _.map(_.map(block.options
                            .replace(/(?:^[\s\t]*\(|\)[\s\t]*$)/g, '')
                            .replace(/(?:^[\s\t]*\[|\][\s\t]*$)/g, '')
                            .replace(/(?:^[\s\t]*['"]|['"][\s\t]*$)/g, '')
                            .split(','), function (str) { return str.replace(/(?:^[\s\t]*['"]|['"][\s\t]*$)/g, ''); }), Task.fileTemplateToRegexp);
                        block.links = Task.getLinks(content, regexp_link, filter);
                        break;
                    case 'block':
                        var block_start = block.start.index + block.start.raw.length, block_content = content.substring(block_start, block.end.index);
                        block.links = Task.getLinks(block_content, regexp_link);
                        _.forEach(block.links, function (link) {
                            link.index += block_start;
                        });
                        break;
                }
            });
            _.forEach(blocks, function (block) {
            });
            return blocks;
        };
        Task.prototype.generateLoader = function (file, content) {
            var css_items = this.getLinks(content, Task.regexps.css, new RegExp(Task.regexps.css_link, 'gim')), js_items = this.getLinks(content, Task.regexps.js, new RegExp(Task.regexps.js_link, 'gim')), cssLinks = _.uniq(_.map(_.flatten(_.map(css_items, 'links')), 'link')), jsLinks = _.uniq(_.map(_.flatten(_.map(js_items, 'links')), 'link')), code_template = _.template(Task.loaderTemplate), code = code_template({
                csslinks: JSON.stringify(Task.addPlaceholders(cssLinks, this.options, this.options.langPlaceholder, this.options.nsPlaceholder)),
                jslinks: JSON.stringify(Task.addPlaceholders(jsLinks, this.options, this.options.langPlaceholder, this.options.nsPlaceholder))
            });
            var indexes = [], block_indexes = function (block) {
                switch (block.type) {
                    case 'inline':
                        indexes.push([block.index, block.index + block.raw.length]);
                        return;
                    case 'block':
                        indexes.push([block.start.index, block.end.index + block.end.raw.length]);
                        return;
                }
            }, link_indexes = function (block) {
                _.forEach(block.links, function (item) {
                    indexes.push([item.index, item.index + item.raw.length]);
                });
            };
            _.forEach(css_items, block_indexes);
            _.forEach(js_items, block_indexes);
            _.forEach(css_items, link_indexes);
            _.forEach(js_items, link_indexes);
            indexes = _.sortBy(indexes, function (ind) { return ind[0]; });
            var collapsed = [];
            _.forEach(indexes, function (a) {
                var overlaps = _.findIndex(collapsed, function (b) {
                    return a[0] >= b[0] && a[0] <= b[1];
                });
                if (overlaps > -1) {
                    var b = collapsed[overlaps];
                    collapsed[overlaps] = [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
                }
                else {
                    collapsed.push(a);
                }
            });
            var splits = _.map(collapsed, function (a, index) {
                if (index == 0)
                    return [0, a[0]];
                if (index == collapsed.length - 1)
                    return [a[1], content.length];
                return [collapsed[index - 1][1], a[0]];
            });
            if (!splits.length)
                splits = [[0, content.length]];
            var text = _.map(splits, function (a) {
                return content.substring(a[0], a[1]);
            });
            if (cssLinks.length || jsLinks.length)
                text.splice(1, 0, code);
            return text.join('');
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
            css: ['(<!--[\\s\\t]*nsloader[\\s\\t]*:[\\s\\t]*css[\\s\\t]*(.+)[\\s\\t]*-->)', '(<!--[\\s\\t]*endnsloader[\\s\\t]*-->)'],
            js: ['(<!--[\\s\\t]*nsloader[\\s\\t]*:[\\s\\t]*js[\\s\\t]*(.+)[\\s\\t]*-->)', '(<!--[\\s\\t]*endnsloader[\\s\\t]*-->)'],
            css_link: '([\\n\\r]*<link(?:[\\s\\t]+.+)?[\\s\\t]+(?:href=[\'"](.*)[\'"])[\\s\\t]*(?:>[\\s\\t]*<\\/[\\s\\t]*link[\\s\\t]*>|\\/?>)[\\n\\r]*)',
            js_link: '([\\n\\r]*<script(?:[\\s\\t]+.+)?[\\s\\t]+(?:src=[\'"](.*)[\'"])[\\s\\t]*(?:>[\\s\\t]*<\\/[\\s\\t]*script[\\s\\t]*>|\\/?>)[\\n\\r]*)'
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
            '})(window);' +
            '</script>';
        return Task;
    })();
    NSLoaderTask.Task = Task;
})(NSLoaderTask = exports.NSLoaderTask || (exports.NSLoaderTask = {}));
