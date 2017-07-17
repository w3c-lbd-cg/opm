module.exports = function(grunt) {
  "use strict";

  grunt.initConfig({
    copy: {
      build: {
        files: [
          {
            expand: true,
            cwd: "./public",
            src: ["**"],
            dest: "./dist/public"
          },
          {
            expand: true,
            cwd: "./views",
            src: ["**"],
            dest: "./dist/views"
          }
        ]
      }
    },
    ts: {
      app: {
        files: [{
          src: ["src/\*\*/\*.ts", "!src/.baseDir.ts", "!src/config/_app.ts", "!src/config/_database.ts", "!src/config/_cors.ts"],
          dest: "./dist"
        }],
        options: {
          module: "commonjs",
          target: "es6",
          sourceMap: false
        }
      }
    },
    watch: {
      ts: {
        files: ["src/\*\*/\*.ts"],
        tasks: ["ts"]
      },
      views: {
        files: ["views/**/*.pug"],
        tasks: ["copy"]
      }
    },
    nodemon: {
      dev: {
        script: './bin/www',
        options: {
          args: ['dev'],
          nodeArgs: ['--inspect'],
          callback: function (nodemon) {
            nodemon.on('log', function (event) {
              console.log(event.colour);
            });
          },
          cwd: __dirname,
          ignore: ['node_modules/**'],
          ext: 'js,ts',
        }
      }
    },
    concurrent: {
      watchers: {
        tasks: ['nodemon', 'watch'],
        options: {
            logConcurrentOutput: true
        }
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-ts");
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks("grunt-concurrent");
  grunt.registerTask("default", [
    "copy",
    "ts"
  ]);
  grunt.registerTask("serve", ["concurrent:watchers"]);
};