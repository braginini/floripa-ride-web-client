module.exports = function(grunt) {
    var files = require('./loader.js').getIncludeFiles();

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            extras: {
                src: files.js,
                dest: 'build/build.js',
                nonull: true
            }
        },

        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                compress: true
            },
            build: {
                src: 'build/build.js',
                dest: 'build/build<%= pkg.version %>.min.js'
            }
        },

        bump: {
            options: {
                updateConfigs: ['pkg'],
                commit: false,
                push: false,
                createTag: false
            }
        },

        replace: {
            version: {
                options: {
                    patterns: [
                        {
                            match: 'version',
                            replacement: '<%= pkg.version %>',
                            expression: false
                        }
                    ]
                },
                files: {'build/loader.js':'loader.js'}
            }
        },

        clean: {
            build: {
                src: "build"
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-replace');
    grunt.loadNpmTasks('grunt-bump');
    grunt.loadNpmTasks('grunt-contrib-clean');

    // Default task(s).
    grunt.registerTask('default', ['clean','bump','concat','replace','uglify']);
}