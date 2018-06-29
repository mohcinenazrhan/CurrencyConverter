const gulp         = require('gulp'),
      uglify       = require('gulp-uglify-es').default,
      sass         = require('gulp-sass'),
      autoprefixer = require('gulp-autoprefixer'),
      uglifycss    = require('gulp-uglifycss'),
      plumber      = require('gulp-plumber'),
      babel        = require('gulp-babel'),
      concat       = require('gulp-concat'),
      browserSync  = require('browser-sync').create(),
      browserify   = require('gulp-browserify');

/////////////////////////////// Watch Mode ///////////////////////////////

gulp.task('serve', ['js-watch', 'sass-watch'], function () {

    browserSync.init({
        server: "./src"
    });

    gulp.watch("src/sass/*.scss", ['sass-watch']);
    gulp.watch("src/js/*.js", ['js-watch']);
    gulp.watch("src/*.html").on('change', browserSync.reload);
});

gulp.task('sass-watch', function () {
    return gulp.src("src/sass/*.scss")
        .pipe(sass({
            includePaths: require('node-normalize-scss').includePaths
        }))
        .pipe(plumber())
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('style.css'))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: true
        }))
        .pipe(gulp.dest('src/temp/css'))
        .pipe(browserSync.stream());
});

gulp.task('js', function (cb) {
    return gulp.src(['src/js/*.js'])
        .pipe(plumber())
        .pipe(concat('app.js'))
        .pipe(babel({
            presets: ['env']
        }))
        .pipe(gulp.dest('src/temp/js'))
});

gulp.task('js-watch', ['js'], function (done) {
    browserSync.reload();
    done();
});

gulp.task('default', ['serve']);