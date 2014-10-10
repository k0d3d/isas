// set timer
var timer = require("grunt-timer");

module.exports = function (grunt) {

  timer.init(grunt);

  // Project configuration
  grunt.initConfig({
    // Metadata
    pkg : grunt.file.readJSON('package.json'),
    banner : '/*! <%= pkg.name %> - v<%= pkg.version %> - ' + '<%= grunt.template.today("yyyy-mm-dd") %>\n' + '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' + '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' + ' Licensed <%= props.license %> */\n',
    // Task configuration
    bump : {
      options : {
        files : ['package.json'],
        updateConfigs : [],
        commit : true,
        commitMessage : 'Release v%VERSION%',
        commitFiles : ['-a'], // '-a' for all files createTag: true, tagName: 'v%VERSION%', tagMessage: 'Version %VERSION%', push: true, pushTo: 'origin', gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d' // options to use with '$ git describe'
      }
    },
    docco : {
      development : {
        src : ['*.js', 'lib/**/*.js', 'controllers/**/*.js', 'models/**/*.js', 'tests/**/*.js'],
        options : {
          output : 'docs/'
        }
      }
    },
    concat : {
      options : {
        banner : '<%= banner %>',
        stripBanners : true
      },
      dist : {
        src : ['lib/<%= pkg.name %>.js'],
        dest : 'dist/<%= pkg.name %>.js'
      }
    },
    jshint : {
      options : {
        node : true,
        curly : true,
        eqeqeq : true,
        immed : true,
        latedef : true,
        newcap : true,
        noarg : true,
        sub : true,
        undef : true,
        unused : true,
        boss : true,
        eqnull : true,
        globals : {}
      },
      gruntfile : {
        src : 'gruntfile.js'
      },
      lib_test : {
        src : ['models/**/*.js', 'lib/**/*.js', 'controllers/**/*.js', 'test/**/*.js']
      }
    },
    watch : {
      lib_test : {
        files : '<%= jshint.lib_test.src %>',
        tasks : ['jshint:lib_test']
      },
      gruntfile : {
        files : '<%= jshint.gruntfile.src %>',
        tasks : ['jshint:gruntfile']
      }
    },
    'node-inspector': {
      dev: {
        options: {
          'web-port': 5888,
          'web-host': 'localhost',
          'debug-port': 5899,
          'stack-trace-limit': 4,
          'hidden': ['node_modules']
        }
      }
    },

    concurrent: {
      dev: {
        tasks: ['nodemon', 'node-inspector', 'watch:lib_test'],
        options: {
          logConcurrentOutput: true
        }
      }
    },
    nodemon: {
      dev: {
        script: 'server.js',
        options: {
          // nodeArgs: ['--debug'],
          env: {
            PORT: '3001'
          },
          ignore: ['node_modules/**'],
          ext: 'js,coffee',
          // omit this property if you aren't serving HTML files and
          // don't want to open a browser tab on start
          callback: function (nodemon) {
            nodemon.on('log', function (event) {
              console.log(event.colour);
            });
          }
        }
      }
    }
  });

  // These plugins provide necessary tasks
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-docco');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-node-inspector');
  grunt.loadNpmTasks('grunt-concurrent');

  // Default task
  grunt.registerTask('default', ['jshint', 'build']);
  grunt.registerTask('rundkeep', ['concurrent:dev', 'build']);

  // Nightly Build - we will be elaborating on this task
  grunt.registerTask('nightly-build', ['jshint', 'docco']);
  grunt.registerTask(
    'build',
    'Compiles all of the assets and copies the files to the build directory.',
    [ 'clean:build', 'copy', 'stylesheets', 'scripts', 'clean:components', 'clean:stylesheets', 'clean:scripts']
  );
  grunt.registerTask(
    'stylesheets',
    'Compiles the stylesheets.',
    [ 'less', 'autoprefixer', 'cssmin']
  );
  grunt.registerTask(
    'scripts',
    'Compiles the JavaScript files.',
    [ 'uglify']
  );
  grunt.registerTask(
    'copynclean',
    'Copies files needed for app',
    ['clean:build', 'copy']
  );


};
