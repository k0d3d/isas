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
    uglify : {     
      build:{
        options:{
          mangle: false
        },
        files:{
          'public/app/js/app.js': [
            'public/app/bower_components/bootstrap/js/*.js',
            //'public/app/bower_components/jquery/src/*.js',
            'public/app/js/*.js'
          ],
          'public/app/js/theme.js': [
            'public/app/assets/**/*.js'
          ]
        }
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
        src : ['api/**/*.js', 'models/**/*.js', 'lib/**/*.js', 'test/**/*.js', 'Gruntfile.js', 'bncauth.js']
      }
    },
    watch : {
      gruntfile : {
        files : '<%= jshint.gruntfile.src %>',
        tasks : ['jshint:gruntfile']
      },
      lib_test : {
        files : '<%= jshint.lib_test.src %>',
        tasks : ['jshint:lib_test', 'nodeunit']
      }
    },
    clean:{
      build:{
        src:['public/app']
      },
      stylesheets:{
        src: [
          'public/app/assets/**/*',      
          'public/app/css/**/*', 
          '!public/app/css/app.css',
          '!public/app/css/theme.css',
          //'!public/app/less/**/*',

        ]
      },
      scripts: {
        src: [
          'public/app/js/**/*',         
          '!public/app/js/app.js',          
          '!public/app/js/theme.js',          
          '!public/app/js'
        ]
      },
      components: {
        src: [
          'public/app/bower_components/**/*',
          'public/app/bower_components'
        ]
      }
    },
    copy: {
      build: {
        cwd: 'for-client-build',
        src: [
          // 'bower_components/bootstrap/js/affix.js', 
          // 'bower_components/bootstrap/js/alert.js', 
          // 'bower_components/bootstrap/js/button.js', 
          // 'bower_components/bootstrap/js/carousel.js', 
          // 'bower_components/bootstrap/js/collapse.js', 
          // 'bower_components/bootstrap/js/dropdown.js', 
          // 'bower_components/bootstrap/js/modal.js', 
          // 'bower_components/bootstrap/js/popover.js', 
          // 'bower_components/bootstrap/js/scrollspy.js', 
          // 'bower_components/bootstrap/js/tab.js', 
          // 'bower_components/bootstrap/js/tooltip.js', 
          // 'bower_components/bootstrap/js/transition.js', 
          //'bower_components/jquery/src/*.js', 
          //'bower_components/bootstrap/less/*.less',
        
          'less/**/*.less', 
          'img/**/*',
          'assets/img/**/*',
          'assets/fonts/**/*',
          'favicon.ico',
          'assets/plugins/uniform/images/sprite.png',
          'css/jquery.dataTables.css',
          'css/custom.css',
          'css/images/**/*',
          'css/theme.css',
          'css/.css',
          // Template CSS
          'assets/plugins/uniform/css/uniform.default.css',
          "assets/css/style-metronic.css",
          "assets/css/style.css",
          "assets/css/style-responsive.css",
          "assets/css/plugins.css",
          "assets/css/pages/tasks.css",
          "assets/css/themes/default.css",
          "assets/css/custom.css", 
          'assets/css/pages/login-soft.css',
          "assets/css/fonts/font.css",
          'assets/plugins/gritter/css/jquery.gritter.css',
          'assets/css/admin-portal.css',
          'assets/plugins/bootstrap-daterangepicker/daterangepicker-bs3.css',
          //Template JS
          "assets/plugins/jquery-ui/jquery-ui-1.10.3.custom.min.js",
          'assets/plugins/jquery-migrate-1.2.1.min.js',
          "assets/plugins/bootstrap-hover-dropdown/twitter-bootstrap-hover-dropdown.min.js",
          "assets/plugins/jquery-slimscroll/jquery.slimscroll.min.js",
          "assets/plugins/jquery.blockui.min.js",
          "assets/plugins/jquery.cookie.min.js",
          "assets/plugins/uniform/jquery.uniform.min.js",
          "assets/plugins/flot/jquery.flot.js" ,
          "assets/plugins/flot/jquery.flot.resize.js",
          "assets/plugins/jquery.pulsate.min.js",
          "assets/plugins/bootstrap-daterangepicker/moment.min.js",
          "assets/plugins/bootstrap-daterangepicker/daterangepicker.js",
          "assets/plugins/gritter/js/jquery.gritter.js",
          "assets/scripts/app.js",
          "assets/scripts/index.js",
          "assets/scripts/tasks.js",
          'assets/scripts/login-soft.js',
          'assets/scripts/app.js',
          'assets/plugins/backstretch/jquery.backstretch.min.js',
          'js/jquery.validate.min.js',
          'js/zxcvbn.js',
          'js/zxcvbn-async.js',
          'js/pwstrength.js',
          'js/main.js',
          'js/ICanHaz.min.js',
          'js/jquery.dataTables.min.js',
          'js/table-managed.js'
          ],
        dest: 'public/app/',
        expand: true
      }
    },
    cssmin:{
      build:{
        files:{
          'public/app/css/app.css': ['public/app/css/**/*.css'],
          'public/app/css/theme.css': ['public/app/assets/**/*.css']
        }
      }
    },
    autoprefixer:{
      build:{
        expand: true,
        cwd:'public/app/css',
        src: ['**/*.css'],
        dest: 'public/app/css'
      }
    },
    less: {
      options: {
        //paths: ['for-client-build/bower_components/bootstrap/less/'],
        yuicompress: false,
        ieCompat: true
      },
      src: {
        expand: true,
        cwd: 'public/app',
        src: [
            //'less/**/*.less',
            //'bower_components/bootstrap/less/alert.less'
            //'bower_components/bootstrap/less/carousel.less'
        ],
        ext: '.css',
        dest: 'public/app/css'
        // rename: function(dest, src) {
        //   return path.join(dest, src.replace(/^styles/, 'css'));
        // }
      }
    },
    imagemin: {
      png: {
        options: {
          optimizationLevel: 7
        },
        files: [
          {
            // Set to true to enable the following options…
            expand: true,
            // cwd is 'current working directory'
            cwd: 'for-client-build/img/',
            src: ['**/*.png'],
            // Could also match cwd line above. i.e. project-directory/img/
            dest: 'public/app/img/compressed/',
            ext: '.png'
          }
        ]
      },
      jpg: {
        options: {
          progressive: true
        },
        files: [
          {
            // Set to true to enable the following options…
            expand: true,
            // cwd is 'current working directory'
            cwd: 'for-client-build/img/',
            src: ['**/*.jpg'],
            // Could also match cwd. i.e. project-directory/img/
            dest: 'public/app/img/',
            ext: '.jpg'
          }
        ]
      }
    }    
  });

  // These plugins provide necessary tasks
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-docco');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-autoprefixer');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-imagemin');

  // Default task
  grunt.registerTask('default', ['jshint', 'build']);

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
