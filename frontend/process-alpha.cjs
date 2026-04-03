const Jimp = require('jimp');

Jimp.read('public/lady_of_justice.png')
  .then(img => {
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx];
      const g = this.bitmap.data[idx+1];
      const b = this.bitmap.data[idx+2];
      // Key out dark pixels
      if (r < 25 && g < 25 && b < 25) {
        this.bitmap.data[idx+3] = 0;
      }
    });
    return img.writeAsync('public/lady_of_justice.png');
  })
  .then(() => {
    console.log('Image keyed successfully');
  })
  .catch(console.error);
