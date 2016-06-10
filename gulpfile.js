var gulp = require('gulp');
var gls = require('gulp-live-server');
var sass = require('gulp-sass');
var gutil = require('gulp-util');
var ts = require('gulp-typescript');
var uglify = require('gulp-uglify');
var opn = require('opn');

/* ------------------------------------------------- */
 
gulp.task('ts', function () {
    return gulp.src('./src/**/*.ts')
        .pipe(ts({
            noImplicitAny: true
        }).on('error', gutil.log))
        .pipe(gulp.dest('./dist'))
        .pipe(gulp.dest('./examples/js'));
});

gulp.task('watch:ts', function () {
  gulp.watch('./src/**/*.ts', ['ts']);
});

/* ------------------------------------------------- */

gulp.task('js:compress', function() {
  return gulp.src('./dist/**/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));
});

gulp.task('watch:js', function () {
  gulp.watch(['./**/*.js', '!./**/*.min.js', '!./node_modules/**/*.js'], ['js:compress']);
});

/* ------------------------------------------------- */
 
gulp.task('sass', function () {
  return gulp.src('./examples/sass/**/*.scss')
    .pipe(sass().on('error', gutil.log))
    .pipe(gulp.dest('./examples/css'));
});
 
gulp.task('watch:sass', function () {
  gulp.watch('./**/*.scss', ['sass']);
});

/* ------------------------------------------------- */

gulp.task('watch', ['js:compress', 'ts', 'sass', 'watch:sass', 'watch:ts', 'watch:js']);

/* ------------------------------------------------- */

gulp.task('serve', ['watch'], function() {
  var server = gls.static('./examples');
  server.start();
 
  gulp.watch(['examples/**/*.css', 'examples/**/*.js', 'examples/**/*.html'], function (file) {
    server.notify.apply(server, [file]);
  });

  opn('http://localhost:3000/', {app: ['chrome', '--incognito']});
});