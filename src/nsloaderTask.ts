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
import path = require('path');
import Q = require('q');
import static_i18nextTask = require('./static_i18nextTask');

export module NSLoaderTask {

  export interface ITaskOptions extends static_i18nextTask.TranslateTask.IPathConstructOptions {
    langPlaceholder?: string;
    nsPlaceholder?: string;
  }

  export class Task {
    private options: ITaskOptions;

    static regexps = {
      css: '^[\\s\\t]*(<!--[\\s\\t]*nsloader[\\s\\t]*:[\\s\\t]*css\\((.+)\\)[\\s\\t]*-->)[\\s\\t]*$',
      js:  '^[\\s\\t]*(<!--[\\s\\t]*nsloader[\\s\\t]*:[\\s\\t]*js\\((.+)\\)[\\s\\t]*-->)[\\s\\t]*$',
      css_link: '^[\\s\\t]*(<link(?:[\\s\\t]+.+)?[\\s\\t]+(?:href=[\'"](.*)[\'"])[\\s\\t]*(?:\\/?>|>[\\s\\t]*<\\/[\\s\\t]*link[\\s\\t]*>))[\\s\\t]*$',
      js_link: '^[\\s\\t]*(<script(?:[\\s\\t]+.+)?[\\s\\t]+(?:src=[\'"](.*)[\'"])[\\s\\t]*(?:\\/?>|>[\\s\\t]*<\\/[\\s\\t]*script[\\s\\t]*>))[\\s\\t]*$'
    };

    static loaderTemplateNSplaceholder = '<-ns->';
    static loaderTemplateLangPlaceholder = '<-lang->';
    static loaderTemplate =
      '<script>' +
        '(function(context) {' +
          'var css = <%= csslinks%>,' +
            'js = <%= jslinks%>;' +
          'context.nsloader = function(lang, ns) {' +
            'var place = document.head || document.body;' +
            'for (var i=0, ii=css.length; i<ii; i++) {' +
              'var s = document.createElement( "link" );' +
              's.setAttribute("href", css[i].replace("'+Task.loaderTemplateNSplaceholder+'", ns).replace("'+Task.loaderTemplateLangPlaceholder+'", lang));' +
              's.setAttribute("rel", "stylesheet");' +
              'place.appendChild(s);' +
            '}' +
            'for (var i=0, ii=js.length; i<ii; i++) {' +
              'var s = document.createElement( "script" );' +
              's.setAttribute("src", js[i].replace("'+Task.loaderTemplateNSplaceholder+'", ns).replace("'+Task.loaderTemplateLangPlaceholder+'", lang));' +
              'place.appendChild(s);' +
            '}' +
          '};' +
        '})(window);' +
      '</script>';

    static fileTemplateToRegexp(template: string) {
      if (!template) return template;
      return '^[\\s\\t]*' + template.replace(/\./g, '\\.').replace(/\*\*\//g, '(?:[^\/]+\/)*').replace(/(?:^|([^\)]))\*/g, '$1[^\/]+').replace(/\//g, '\\/') + '(?:[\\?#].*)?[\\s\\t]*$';
    }

    constructor(private grunt: IGrunt, private task: grunt.task.IMultiTask<any>) {

    }

    start(options): Q.IPromise<any> {
      this.options = _.extend({}, options);
      return Q.fcall(this.exec.bind(this));
    }

    exec() {
      try {

      } catch(e) {
        this.grunt.log.warn('Error while init: ' + e.message);
      }

      try {
        this.processFiles()
      } catch(e) {
        this.grunt.log.warn('Error while processing Files: ' + e.message);
      }
    }

    private processFiles() {
      this.task.files.forEach(this.processFile.bind(this));
    }

    private processFile(file: grunt.file.IFilesConfig) {
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
          data = this.generateLoader(file, data);
        } catch (e) {
          this.grunt.log.warn('Error while processing file ' + filepath + ' : ' + e.message);
        }
        return data;
      }).join('\n');

      try {
        this.saveFile(file, src);
      } catch (e) {
        this.grunt.log.warn('Error while writing file: ' + e.message);
      }
    }

    private saveFile(file: grunt.file.IFilesConfig, content: string) {
      var dest = file.dest;

      this.grunt.file.write(dest, content);
      this.grunt.log.writeln('File "' + dest + '" created.');
    }

    private getLinks(content: string, regexp: RegExp, regexp_link: RegExp) {
      var cssLoader,
        css_items = [];

      regexp.lastIndex = 0;

      while (cssLoader = regexp.exec(content)) {
        var options = cssLoader[2],
          param1 = options.split(',')[0].replace(/(?:^\s*'|'\s*$)/g, '');

        css_items.push({
          str: cssLoader[1],
          options: options,
          regexp: new RegExp(Task.fileTemplateToRegexp(param1)),
          links: []
        });
      }

      _.forEach(css_items, (item) => {
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
    }

    private generateLoader(file: grunt.file.IFilesConfig, content: string) {
      var css_items = this.getLinks(content, new RegExp(Task.regexps.css, 'gim'), new RegExp(Task.regexps.css_link, 'gim')),
        js_items = this.getLinks(content, new RegExp(Task.regexps.js, 'gim'), new RegExp(Task.regexps.js_link, 'gim')),

        cssLinks = <string[]>_.uniq(_.map(_.flatten(_.map(css_items, 'links')), 'link')),
        jsLinks = <string[]>_.uniq(_.map(_.flatten(_.map(js_items, 'links')), 'link')),

        cssStr = <string[]>_.map(_.flatten(_.map(css_items, 'links')), 'str'),
        jsStr = <string[]>_.map(_.flatten(_.map(js_items, 'links')), 'str'),

        code_template = _.template(Task.loaderTemplate),

        code = code_template(
          {
            csslinks: JSON.stringify(Task.addPlaceholders(cssLinks, this.options,
                                      this.options.langPlaceholder, this.options.nsPlaceholder)),
            jslinks: JSON.stringify(Task.addPlaceholders(jsLinks, this.options,
                                      this.options.langPlaceholder, this.options.nsPlaceholder))
          }
        ),

        positions = <string[]>_.flattenDeep([_.map(css_items, 'str'), _.map(js_items, 'str')]);

      content = content.replace(positions[0], code);

      // clear links
      _.forEach(positions.concat(cssStr).concat(jsStr), (pos) => {
        content = content.replace(pos, '');
      });

      return content;
    }

    static addPlaceholders(scripts: string[], options: ITaskOptions,
                         langPlaceholder: string = Task.loaderTemplateLangPlaceholder,
                         nsPlaceholder: string = Task.loaderTemplateNSplaceholder) {

      return _.map(scripts, (link: string) => {
        return static_i18nextTask.TranslateTask.Task.constructPath(link, options, langPlaceholder, nsPlaceholder).replace(/\\/g, '/');
      });
    }

    static escapeRegExp(text) {
      return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }
  }
}