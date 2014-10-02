'use strict';
module.exports = function (grunt) {
    grunt.registerMultiTask('static_i18next', 'Grunt plugin for localizing static assets', function () {
        var options = this.options({
            punctuation: '.',
            separator: ', '
        });

        this.files.forEach(function (file) {
            var src = file.src.filter(function (filepath) {
                if (!grunt.file.exists(filepath)) {
                    grunt.log.warn('Source file "' + filepath + '" not found.');
                    return false;
                } else {
                    return true;
                }
            }).map(function (filepath) {
                return grunt.file.read(filepath);
            }).join(grunt.util.normalizelf(options.separator));

            src += options.punctuation;

            grunt.file.write(file.dest, src);

            grunt.log.writeln('File "' + file.dest + '" created.');
        });
    });
};
