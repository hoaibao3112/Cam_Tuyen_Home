const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DIRS = [
  path.join(__dirname, '../apps/web/public/product-images'),
  path.join(__dirname, '../product-images')
];

async function compressAll() {
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) {
      console.log(`⚠️ Thư mục không tồn tại: ${dir}`);
      continue;
    }

    const backupDir = path.join(dir, '_backup');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

    const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    console.log(`\n🔧 Bắt đầu nén ${files.length} ảnh trong ${dir}...\n`);
    let totalBefore = 0, totalAfter = 0;

    for (const file of files) {
      const inputPath = path.join(dir, file);
      const backupPath = path.join(backupDir, file);
      const stat = fs.statSync(inputPath);
      const sizeBefore = stat.size;
      totalBefore += sizeBefore;

      // Backup bản gốc nếu chưa có bản backup
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(inputPath, backupPath);
      }

      // Nén: resize max 800px width, quality 75, webp-like optimization
      const tempPath = inputPath + '.tmp';
      try {
        const pipeline = sharp(inputPath).resize({ width: 800, withoutEnlargement: true });
        
        if (/\.png$/i.test(file)) {
          await pipeline.png({ quality: 75, compressionLevel: 8 }).toFile(tempPath);
        } else {
          await pipeline.jpeg({ quality: 75, progressive: true, mozjpeg: true }).toFile(tempPath);
        }

        fs.renameSync(tempPath, inputPath);

        const sizeAfter = fs.statSync(inputPath).size;
        totalAfter += sizeAfter;
        const saved = Math.round((1 - sizeAfter / sizeBefore) * 100);

        console.log(`   ✅ ${file.padEnd(45)} ${Math.round(sizeBefore/1024)}KB → ${Math.round(sizeAfter/1024)}KB  (-${saved}%)`);
      } catch (err) {
        console.error(`   ❌ Lỗi khi nén ${file}:`, err.message);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    }

    if (files.length > 0) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 Thư mục: ${path.basename(dir)}`);
      console.log(`📦 Tổng trước: ${(totalBefore/1024/1024).toFixed(2)} MB`);
      console.log(`📦 Tổng sau:   ${(totalAfter/1024/1024).toFixed(2)} MB`);
      console.log(`💾 Tiết kiệm:  ${((totalBefore-totalAfter)/1024/1024).toFixed(2)} MB (-${Math.round((1-totalAfter/totalBefore)*100)}%)`);
    }
  }
}

compressAll().catch(console.error);

