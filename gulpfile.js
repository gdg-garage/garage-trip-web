import gulp from 'gulp';
import webp from 'gulp-webp';
import { src, dest, parallel, series } from 'gulp';
import imageResize from 'gulp-image-resize';

function bootstrap(cb) {
  src('node_modules/bootstrap/scss/**')
  .pipe(dest('assets/css/boostrap'));
  cb();
}

function images(cb) {
  [400, 2000].forEach(function (size) {
    src('_images/*.{jpg,jpeg,png}', {encoding: false})
      .pipe(imageResize({ width: size }))
      .pipe(webp())
      .pipe(dest(`assets/images/${size}/`));
  });
  cb();
}

export default parallel(images, bootstrap);