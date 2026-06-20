const { Jimp, intToRGBA, rgbaToInt } = require('jimp');
const path = require('path');

async function clean() {
  try {
    const imagePath = path.join(__dirname, '../anhlooooo.jpg');
    const outputPath = path.join(__dirname, '../apps/web/public/images/menu-logo.png');
    
    console.log('Loading new menu image:', imagePath);
    const image = await Jimp.read(imagePath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    console.log(`Image dimensions: ${width}x${height}`);
    
    let killedCount = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // 1. Remove the "CUSTOM TYPE LOGO" at the top (rows 0 to 22)
        if (y <= 22) {
          image.setPixelColor(rgbaToInt(255, 255, 255, 0), x, y);
          killedCount++;
          continue;
        }
        
        const color = image.getPixelColor(x, y);
        const rgba = intToRGBA(color);
        
        // 2. Remove pure/near-pure white background (since it's a JPEG, we allow a tolerance of 250+)
        const isWhiteBackground = rgba.r >= 250 && rgba.g >= 250 && rgba.b >= 250;
        
        if (isWhiteBackground) {
          image.setPixelColor(rgbaToInt(rgba.r, rgba.g, rgba.b, 0), x, y);
          killedCount++;
        }
      }
    }
    
    console.log(`Killed ${killedCount} pixels (including top header text and white background).`);
    await image.write(outputPath);
    console.log('New menu logo successfully written to:', outputPath);
  } catch (err) {
    console.error('Error cleaning new menu logo:', err);
  }
}

clean();
