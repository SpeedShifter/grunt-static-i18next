/*
 * grunt-static-i18next
 * 
 *
 * Copyright (c) 2014 Stas Yermakov
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
  // load all npm grunt tasks
  require('load-grunt-tasks')(grunt);

  // Project configuration.
  grunt.initConfig({

    yeoman: {
      // configurable paths
      tasks: 'tasks',
      dist: 'dist',
      test_app: 'test/fixtures/app'
    },

    watch: {
      gruntfile: {
        files: ['Gruntfile.js']
      },
      typescript: {
        files: ["<%= yeoman.tasks %>/**/*.ts"],
        tasks: ["typescript"]
      }
    },

    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      }
    },

    // Configuration to be run (and then tested).
    static_i18next: {
      options: {
        localeDir: '<%= yeoman.test_app %>/locale'
      },
      translateFixtureApp: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.test_app %>',
          src: 'static/*.*',
          dest: '.tmp/i18n'
        }]
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js']
    },

    // Compile TypeScript source codes
    typescript: {
      dist: {
        src: ['<%= yeoman.tasks %>/**/*.ts'],
        options: {
          expand: true,
          target: 'es5', //or es3
          basePath: '<%= yeoman.tasks %>/',
          sourceMap: false,
          declaration: false,
          module: 'commonjs'
        }
      }
    },

    // Empties folders to start fresh
    clean: {
      dist: {
        files: [
          {
            dot: true,
            src: [
              '.tmp',
              '<%= yeoman.dist %>/*',
              '!<%= yeoman.dist %>/.git*'
            ]
          }
        ]
      },
      server: '.tmp'
    },

    // Run some tasks in parallel to speed up the build process
    concurrent: {
      server: [
        'typescript'
      ],
      test: [
        'typescript'
      ],
      dist: [
        'typescript'
      ]
    }
  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  grunt.registerTask('serve', function (target) {
    grunt.task.run([
      'clean:server',
      'concurrent:server',
      'watch'
    ]);
  });

  // Whenever the "test" task is run, first clean the ".tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'static_i18next'/*, 'nodeunit'*/]);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
