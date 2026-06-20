const { Jimp, intToRGBA, rgbaToInt } = require('jimp');
const path = require('path');

async function clean() {
  try {
    const imagePath = path.join(__dirname, '../27a9a917-dedf-45c5-ac50-2a259190cd28.jpg');
    const outputPath = path.join(__dirname, '../apps/web/public/images/logo.png');
    
    console.log('Loading image:', imagePath);
    const image = await Jimp.read(imagePath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    console.log(`Image dimensions: ${width}x${height}`);
    
    let killedCount = 0;
    
    // Scan every pixel in the image
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = image.getPixelColor(x, y);
        const rgba = intToRGBA(color);
        
        // A pixel is background if it matches the grey checkerboard pattern:
        // - r, g, b are within 15 of each other (neutral grey)
        // - r, g, b are between 30 and 150 (not too dark, not too bright white outline)
        const isGreyBackground = 
          Math.abs(rgba.r - rgba.g) < 15 && 
          Math.abs(rgba.g - rgba.b) < 15 && 
          Math.abs(rgba.r - rgba.b) < 15 && 
          rgba.r > 30 && rgba.r < 150;
        
        if (isGreyBackground) {
          // Set transparent
          image.setPixelColor(rgbaToInt(rgba.r, rgba.g, rgba.b, 0), x, y);
          killedCount++;
        }
      }
    }
    
    console.log(`Killed ${killedCount} background pixels (including closed loops).`);
    await image.write(outputPath);
    console.log('Cleaned logo successfully written to:', outputPath);
  } catch (err) {
    console.error('Error cleaning logo:', err);
  }
}

clean();
