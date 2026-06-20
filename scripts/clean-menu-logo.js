const { Jimp, intToRGBA, rgbaToInt } = require('jimp');
const path = require('path');

async function clean() {
  try {
    const imagePath = path.join(__dirname, '../anhLogoMeNu.jpg');
    const outputPath = path.join(__dirname, '../apps/web/public/images/menu-logo.png');
    
    console.log('Loading menu logo image:', imagePath);
    const image = await Jimp.read(imagePath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    console.log(`Image dimensions: ${width}x${height}`);
    
    let killedCount = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = image.getPixelColor(x, y);
        const rgba = intToRGBA(color);
        
        // Checkerboard detection:
        // White squares: r, g, b are all very high (e.g. > 240)
        // Grey squares: r, g, b are all around 204 (e.g. 195 to 215) and very close to each other
        const isWhite = rgba.r > 240 && rgba.g > 240 && rgba.b > 240;
        
        const isGrey = 
          Math.abs(rgba.r - rgba.g) < 8 && 
          Math.abs(rgba.g - rgba.b) < 8 && 
          Math.abs(rgba.r - rgba.b) < 8 && 
          rgba.r > 190 && rgba.r < 220;
          
        const isBackground = isWhite || isGrey;
        
        if (isBackground) {
          // Make it transparent
          image.setPixelColor(rgbaToInt(rgba.r, rgba.g, rgba.b, 0), x, y);
          killedCount++;
        }
      }
    }
    
    console.log(`Killed ${killedCount} background pixels.`);
    await image.write(outputPath);
    console.log('Cleaned menu logo successfully written to:', outputPath);
  } catch (err) {
    console.error('Error cleaning menu logo:', err);
  }
}

clean();
