require('babel-core/register');

var gulp = require('gulp');
var browserify = require('browserify');
var babel = require('gulp-babel');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var nodemon = require('gulp-nodemon');
var mocha = require('gulp-mocha');
var eslint = require('gulp-eslint');
var util = require('gulp-util');
var webpack = require('webpack');

function restart_nodemon () {
    if (nodemon_instance) {
        console.log("Restarting nodemon");
        nodemon_instance.emit('restart');
    } else {
        console.log("Nodemon isntance not ready yet")
    }

}

gulp.task('test', function() {
    var grepStatement = util.env.grep ? {grep:util.env.grep} : {};
    return gulp.src('test/**/*.js', {read: false})
        // gulp-mocha needs filepaths so you can't have any plugins before it
        .pipe(mocha(Object.assign({
            reporter: 'dot',
            timeout: 60000,
        },grepStatement)))
        .once('error', function (err) {
            dumpError(err);
            process.exit(1);
        })
        .once('end', function () {
            process.exit();
        });
});

gulp.task('lint', function () {
    // ESLint ignores files with "node_modules" paths.
    // So, it's best to have gulp ignore the directory as well.
    // Also, Be sure to return the stream from the task;
    // Otherwise, the task may end before the stream has finished.
    return gulp.src(['./src/**/*.js*','!./src/client/js/3rdparty/*.js*'])
        // eslint() attaches the lint output to the "eslint" property
        // of the file object so it can be used by other modules.
        .pipe(eslint())
        // eslint.format() outputs the lint results to the console.
        // Alternatively use eslint.formatEach() (see Docs).
        .pipe(eslint.format())
        // To have the process exit with an error code (1) on
        // lint error, return the stream and pipe to failAfterError last.
        .pipe(eslint.failAfterError());
});



gulp.task('babel-server-transpile', function() {
    return gulp.src(['src/index.js','src/constant.js','src/currency.js'])
        .on('error', function(err) {
            console.log('Babel server:', err.toString());
        })
        .pipe(babel())
        .pipe(gulp.dest('app'))
        .on('end',function (){
            gulp.src('src/server/**/*.*')
                .on('error', function(err) {
                    console.log('Babel server:', err.toString());
                })
                .pipe(babel())
                .pipe(gulp.dest('app/server'))
                .on('end',function() {
                    restart_nodemon();
                });
        });
});


gulp.task('babel-server', ['babel-server-transpile']);
gulp.task('babel-client',function(callback) {
    gulp.src('src/client/js/3rdparty/*.*')
        .on('error',function (err) {
            console.log("3rd party copy error",err);
        })
        .pipe(gulp.dest('app/client/3rdparty'));

    gulp.src('hub/**/*.*')
        .on('error',function (err) {
            console.log("hub copy error",err);
        })
        .pipe(gulp.dest('app/hub/'));

    webpack(require('./webpack.config.js'),
        function(err, stats) {
            if(err) throw new gutil.PluginError("webpack", err);
            console.log("[webpack]", stats.toString({
                // output options
            }));
        callback();
    });

});

gulp.task('views', function() {
    return gulp.src('src/client/views/**/*.*')
        .pipe(gulp.dest('app/client/views'));
});


var nodemon_instance;

gulp.task('nodemon', function() {

    if (!nodemon_instance) {
        nodemon_instance = nodemon({
            script: 'server.js',
            watch: 'src/__manual_watch__',
            ext: '__manual_watch__',
            verbose: false,
        }).on('restart', function() {
            console.log('~~~ restart server ~~~');
        });
    } else {
        nodemon_instance.emit('restart');
    }

});

gulp.task('default', ['babel-server-transpile', 'views']);

gulp.task('watch', ['default', 'nodemon'], function() {
    gulp.watch(['src/index.js', 'src/server/**/*.*'], ['babel-server-transpile']);
    gulp.watch('src/client/views/**/*.*', ['views']);
});


function dumpError(err) {
    if (!err) return;
    if (typeof err === 'object') {
        if (err.message) {
            console.log('\nMessage: ' + err.message);
        }
        if (err.stack) {
            console.log('\nStacktrace:');
            console.log('====================');
            console.log(err.stack);
        }
    }
}
