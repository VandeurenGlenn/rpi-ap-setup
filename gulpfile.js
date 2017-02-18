'use strict';
const {task, series, parallel, src, dest} = require('gulp');
const del = require('del');
const {rollup} = require('rollup');
const babel = require('rollup-plugin-babel');
const json = require('rollup-plugin-json');
const merge = require('merge-stream');
let cache;

const rollupTask = (src, dest) => {
  return rollup({
    entry: src,
    // Use the previous bundle as starting point.
    cache: cache
  }).then(bundle => {
    // Cache our bundle for later use (optional)
    cache = bundle;

    bundle.write({
      format: 'es',
      sourceMap: true,
      plugins: [
        json(),
        babel()
      ],
      dest: dest
    });
  });
}
task('clean', () => {
  return del(['backed.js', 'backed.min.js']);
});

task('rollup:wifi', () => {
  return rollupTask('src/index.js', 'dist/rpi-wifi.js');
});

task('rollup:install', () => {
  return rollupTask('src/install.js', 'dist/install.js');
});

task('rollup', parallel('rollup:wifi', 'rollup:install'));

// setup build & development tasks
task('build', series('rollup'));
task('default', series('build'));
