const Jimp = require('jimp');

Jimp.read('C:\\Users\\ACER\\.gemini\\antigravity\\brain\\618b554c-5055-4880-8ff6-6fb6fa1c2f88\\lady_of_justice_1775164529320.png')
  .then(img => {
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx];
      const g = this.bitmap.data[idx+1];
      const b = this.bitmap.data[idx+2];
      
      // Calculate perceptive luminance of the pixel
      const luminance = (0.299*r + 0.587*g + 0.114*b);
      
      let alpha = 255;
      if (luminance < 15) {
        alpha = 0; // Pure black/very dark becomes completely transparent
      } else if (luminance < 80) {
        // Smoothly ramp up the alpha between 10 and 60 luminance
        // This gives a beautiful anti-aliased feathered soft edge!
        alpha = Math.floor(((luminance - 15) / 65) * 255);
      }
      
      this.bitmap.data[idx+3] = alpha;
    });
    return img.writeAsync('public/lady_of_justice.png');
  })
  .then(() => console.log('Smoothed anti-aliased image saved successfully'))
  .catch(console.error);
