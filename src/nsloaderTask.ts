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

  export interface IFileTemplateRegexp {
    isNegative: boolean;
    regexp: RegExp;
  }

  export interface IMatchBlock {
    type: string; // 'inline' | 'block' | 'block-start' | 'block-end'
    links?: {raw: string; index: number; link: string}[];

    // for 'inline' type
    options?: string;
    index?: number;
    raw?: string;

    // for 'block' type
    start?: IMatchBlock;
    end?: IMatchBlock;
  }

  export class Task {
    private options: ITaskOptions;

    static regexps = {
      css: ['(<!--[\\s\\t]*nsloader[\\s\\t]*:[\\s\\t]*css[\\s\\t]*(.+)[\\s\\t]*-->)', '(<!--[\\s\\t]*endnsloader[\\s\\t]*-->)'],
      js:  ['(<!--[\\s\\t]*nsloader[\\s\\t]*:[\\s\\t]*js[\\s\\t]*(.+)[\\s\\t]*-->)', '(<!--[\\s\\t]*endnsloader[\\s\\t]*-->)'],
      css_link: '([\\n\\r]*<link(?:[\\s\\t]+.+)?[\\s\\t]+(?:href=[\'"](.*)[\'"])[\\s\\t]*(?:>[\\s\\t]*<\\/[\\s\\t]*link[\\s\\t]*>|\\/?>)[\\n\\r]*)',
      js_link: '([\\n\\r]*<script(?:[\\s\\t]+.+)?[\\s\\t]+(?:src=[\'"](.*)[\'"])[\\s\\t]*(?:>[\\s\\t]*<\\/[\\s\\t]*script[\\s\\t]*>|\\/?>)[\\n\\r]*)'
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
      if (!template) return null;
      var negative = false;
      if (template[0] == '!') {
        template = template.substr(1);
        negative = true;
      }

      return <IFileTemplateRegexp>{isNegative: negative,
        regexp: new RegExp('^(?:[\\s\\t]*'
          + template.replace(/\./g, '\\.')
            .replace(/\*\*\//g, '(?:[^\/]+\/)*')
            .replace(/(?:^|([^\)]))\*/g, '$1[^\/]*')
            .replace(/\//g, '\\/')
          + '(?:[\\?#].*)?[\\s\\t]*)$')};
    }

    static testFileRegexp(regexps: IFileTemplateRegexp[], str: string) {
      if (!regexps || !regexps.length)
        return false;

      return _.find(regexps, (rg: IFileTemplateRegexp) => {
          return !rg.isNegative && rg.regexp.test(str);
        })
        && !_.find(regexps, (rg: IFileTemplateRegexp) => {
          return rg.isNegative && rg.regexp.test(str);
        });
    }

    static getLinks(content: string, regexp_link: RegExp, filter?: IFileTemplateRegexp[]) {
      var link,
        links = [];
      regexp_link.lastIndex = 0;

      while (link = regexp_link.exec(content)) {
        if (!filter) {
          links.push({
            index: link.index,
            raw: link[1],
            link: link[2]
          });
        } else
        if (Task.testFileRegexp(filter, link[2])) {
          links.push({
            index: link.index,
            raw: link[1],
            link: link[2]
          });
        }
      }

      return links;
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

    private getLinks(content: string, regexp: string[], regexp_link: RegExp) {
      var loader,
        reg = [new RegExp(regexp[0], 'gi'), new RegExp(regexp[1], 'gi')],
        block_start: IMatchBlock[] = [],
        block_end: IMatchBlock[] = [],
        blocks: IMatchBlock[] = [];

      while(loader = reg[0].exec(content)) {
        var options = _.trim(loader[2]);
        if (/^\(.*\)$/i.test(options)) {
          blocks.push({
            type: 'inline',
            options: options,
            index: loader.index,
            raw: loader[1]
          });
        } else {
          block_start.push({
            type: 'block-start',
            options: options,
            index: loader.index,
            raw: loader[1]
          });
        }
      }

      while(loader = reg[1].exec(content)) {
        block_end.push({
          type: 'block-end',
          index: loader.index,
          raw: loader[1]
        });
      }

      _.forEach(block_end, (blck: IMatchBlock) => {
        var index = _.findLastIndex(block_start, (b: IMatchBlock) => {
          return blck.index > b.index;
        });

        block_start.splice(index+1, 0, blck);
      });

      var stack: IMatchBlock[] = [];
      _.forEach(block_start, (blck: IMatchBlock, index: number) => {
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

      _.forEach(blocks, (block: IMatchBlock) => {
        switch (block.type) {
          case 'inline':
            var filter = _.map(
              _.map(block.options
                  .replace(/(?:^[\s\t]*\(|\)[\s\t]*$)/g, '')
                  .replace(/(?:^[\s\t]*\[|\][\s\t]*$)/g, '')
                  .replace(/(?:^[\s\t]*['"]|['"][\s\t]*$)/g, '')
                  .split(','),
                (str) => str.replace(/(?:^[\s\t]*['"]|['"][\s\t]*$)/g, '')),
              Task.fileTemplateToRegexp);

            block.links = Task.getLinks(content, regexp_link, filter);
            break;
          case 'block':
            var block_start = block.start.index + block.start.raw.length,
              block_content = content.substring(block_start, block.end.index);

            block.links = Task.getLinks(block_content, regexp_link);
            _.forEach(block.links, (link: any) => {
              link.index += block_start;
            });
            break;
        }
      });

      _.forEach(blocks, (block: IMatchBlock) => {

      });

      return blocks;
    }

    private generateLoader(file: grunt.file.IFilesConfig, content: string) {
      var css_items = this.getLinks(content, Task.regexps.css, new RegExp(Task.regexps.css_link, 'gim')),
        js_items = this.getLinks(content, Task.regexps.js, new RegExp(Task.regexps.js_link, 'gim')),

        cssLinks = <string[]>_.uniq(_.map(_.flatten(_.map(css_items, 'links')), 'link')),
        jsLinks = <string[]>_.uniq(_.map(_.flatten(_.map(js_items, 'links')), 'link')),

        code_template = _.template(Task.loaderTemplate),

        code = code_template(
          {
            csslinks: JSON.stringify(Task.addPlaceholders(cssLinks, this.options,
              this.options.langPlaceholder, this.options.nsPlaceholder)),
            jslinks: JSON.stringify(Task.addPlaceholders(jsLinks, this.options,
              this.options.langPlaceholder, this.options.nsPlaceholder))
          }
        );

      var indexes = [],
        block_indexes = (block: IMatchBlock) => {
          switch (block.type) {
            case 'inline':
              indexes.push([block.index, block.index + block.raw.length]);
              return;
            case 'block':
              indexes.push([block.start.index, block.end.index + block.end.raw.length]);
              return;
          }
        },
        link_indexes = (block: IMatchBlock) => {
          _.forEach(block.links, (item: any) => {
            indexes.push([item.index, item.index + item.raw.length]);
          });
        };
      _.forEach(css_items, block_indexes);
      _.forEach(js_items, block_indexes);
      _.forEach(css_items, link_indexes);
      _.forEach(js_items, link_indexes);

      indexes = _.sortBy(indexes, (ind: number[]) => ind[0]);

      var collapsed = [];
      _.forEach(indexes, (a: number[]) => {
        var overlaps = _.findIndex(collapsed, (b: number[]) => {
          return a[0] >= b[0] && a[0] <= b[1];
        });
        if (overlaps > -1) {
          var b = collapsed[overlaps];
          collapsed[overlaps] = [Math.min(a[0], b[0]), Math.max(a[1], b[1])];
        } else {
          collapsed.push(a);
        }
      });

      var splits = _.map(collapsed, (a: number[], index: number) => {
        if (index == 0)
          return [0, a[0]];
        if (index == collapsed.length -1)
          return [a[1], content.length];
        return [collapsed[index-1][1], a[0]];
      });
      if (!splits.length) // no splits here, means we dont have nsloader task
        splits = [[0, content.length]];

      var text = _.map(splits, (a: number[]) => {
        return content.substring(a[0], a[1]);
      });

      if (cssLinks.length || jsLinks.length)
        text.splice(1,0,code);

      return text.join('');
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