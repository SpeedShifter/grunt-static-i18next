# Static Internationalization

> Grunt plugin to translate static assets, using i18next translator.

Say you have:

```
app/
├── Gruntfile.js
└── app
    ├── locale
    │   ├── en
    │   │  └── ns.common.json
    │   │  └── ns.special.json
    │   └── en-US
    │       └── ns.common.json
    │       └── ns.special.json
    └── static
        └── data.json
        └── template.html
```

Static internationalization would like like:

```
app/
├── Gruntfile.js
└── app
    ├── i18next_static
    │   ├── en
    │   │   └── data.json
    │   │   └── template.html
    │   ├── en-US
    │       └── data.json
    │       └── template.html
    ├── locale
    │   ├── en
    │   │  └── ns.common.json
    │   │  └── ns.special.json
    │   └── en-US
    │       └── ns.common.json
    │       └── ns.special.json
    └── static
        └── data.json
        └── template.html
```


## Getting Started

This plugin requires [Grunt](http://gruntjs.com/).

Translation done with i18next translator.
See [i18next project](http://i18next.com/) (client lib).
Text replacement is done with [lodash template](http://lodash.com/docs#template).

## The "static_i18next" task

### Overview

Default configuration:

```js
grunt.initConfig({
    static_i18next: {
        options: {
          localeDir: '<%= yeoman.app %>/locale'
        },
        translateApp: {
          options: {},
          files: [{
            expand: true,
            cwd: '<%= yeoman.app %>/static',
            src: '**/*.*',
            dest: '.tmp/i18next'
          }]
        }
    }
})
```

### Options

#### options.localeDir
Type: `String`
Default value: `locale`

Locale Directory should contain json files, each json file should be in `lang` folder (for example `en`, `en-US`).
`lang` folder could contain subfolder with json files in it, subfolder name will be assumed as name of locale namespace,
 see [i18next docs](http://i18next.com/pages/doc_features.html).

#### options.lang
Type: `String` or `String[]`

Language to translate assets. By default, files will be translated to languages, defined in locale dir. 

#### options.langInFilename
Type: `String`
Default value: `false`

If you want not to place translated files in lang folders, but to place lang string in filename, specify langInFilename 
as string.  

## Tests

Run `grunt test`

## Release History

* 0.0.1 - initial release

## License
Copyright (c) 2014 Stas Yermakov. Licensed under the MIT license.
