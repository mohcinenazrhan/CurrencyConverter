const gulp         = require('gulp'),
      uglify       = require('gulp-uglify-es').default,
      sass         = require('gulp-sass'),
      autoprefixer = require('gulp-autoprefixer'),
      uglifycss    = require('gulp-uglifycss'),
      plumber      = require('gulp-plumber'),
      babel        = require('gulp-babel'),
      concat       = require('gulp-concat'),
      browserSync  = require('browser-sync').create(),
      htmlmin      = require('gulp-htmlmin'),
      clean        = require('gulp-clean'),
      replace      = require('gulp-string-replace');

/////////////////////////////// Watch Mode ///////////////////////////////

gulp.task('serve', ['js-watch', 'sass-watch'], function () {

    browserSync.init({
        server: "./src"
    });

    gulp.src('src/sass/icons/*')
        .pipe(gulp.dest('src/temp/css/icons'))

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
    return gulp.src([
        'src/js/idb.js',
        'src/js/CurrencyConverter.js',
        'src/js/main.js'
        ])
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

/////////////////////////////// Build for Prod : Dist ///////////////////////////////

// Copy All HTML files to dist
function copyHtml() {
    return gulp.src('src/*.html')
        .pipe(replace('temp/', ''))
        .pipe(htmlmin({
            collapseWhitespace: true
        }))
        .pipe(gulp.dest('dist/'))
}
gulp.task('copyHtml', () => copyHtml())

// Copy All icons files to css folder
function iconMove() {
    return gulp.src('src/sass/icons/*')
        .pipe(gulp.dest('dist/css/icons'))
}
gulp.task('iconMove', () => iconMove())

// Move Service Worker to dist Prod
function swMove() {
    return gulp.src([
        'src/service-worker.js',
        'src/serviceworker-cache-polyfill.js'
        ])
        .pipe(babel({
            presets: ['env']
        }))
        .pipe(gulp.dest('dist'))
}
gulp.task('swMove', () => swMove())

// Move files to dist Prod
function filesMove() {
    return gulp.src([
            'src/manifest.json',
            'src/pwicons/**/*.*'
        ], { base: './src' })
        .pipe(gulp.dest('dist'))
}
gulp.task('filesMove', () => filesMove())

// Prepare js script for prod
function scripts() {
    return gulp.src([
            'src/js/idb.js',
            'src/js/CurrencyConverter.js',
            'src/js/main.js'
        ])
        .pipe(plumber())
        .pipe(concat('app.js'))
        .pipe(babel({
            presets: ['env']
        }))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'))
}
gulp.task('scripts', () => scripts())

// Prepare css style for prod
function style() {
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
        .pipe(uglifycss())
        .pipe(gulp.dest('dist/css'));
}
gulp.task('sass', () => style());

// Clean folder before build

gulp.task('clean', () => {
    return gulp.src('dist', {
        read: false
    }).pipe(clean())
})

// Build fro Prod
gulp.task('prod', ['clean'], () => {
    return copyHtml() && scripts() && style() && iconMove() && swMove() && filesMove();
})