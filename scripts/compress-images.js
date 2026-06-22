const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, '../apps/web/public/images');
const BACKUP_DIR = path.join(__dirname, '../apps/web/public/images/_backup');

// Tạo thư mục backup
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

const files = fs.readdirSync(INPUT_DIR).filter(f => /\.(jpg|jpeg)$/i.test(f));

async function compressAll() {
  console.log(`\n🔧 Bắt đầu nén ${files.length} ảnh...\n`);
  let totalBefore = 0, totalAfter = 0;

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const backupPath = path.join(BACKUP_DIR, file);
    const stat = fs.statSync(inputPath);
    const sizeBefore = stat.size;
    totalBefore += sizeBefore;

    // Backup bản gốc
    fs.copyFileSync(inputPath, backupPath);

    // Nén: resize max 800px width, quality 75, webp-like optimization
    const tempPath = inputPath + '.tmp';
    await sharp(inputPath)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 75, progressive: true, mozjpeg: true })
      .toFile(tempPath);

    fs.renameSync(tempPath, inputPath);

    const sizeAfter = fs.statSync(inputPath).size;
    totalAfter += sizeAfter;
    const saved = Math.round((1 - sizeAfter / sizeBefore) * 100);

    console.log(`✅ ${file.padEnd(45)} ${Math.round(sizeBefore/1024)}KB → ${Math.round(sizeAfter/1024)}KB  (-${saved}%)`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 Tổng trước: ${(totalBefore/1024/1024).toFixed(2)} MB`);
  console.log(`📦 Tổng sau:   ${(totalAfter/1024/1024).toFixed(2)} MB`);
  console.log(`💾 Tiết kiệm:  ${((totalBefore-totalAfter)/1024/1024).toFixed(2)} MB (-${Math.round((1-totalAfter/totalBefore)*100)}%)`);
  console.log(`\n📁 Bản gốc đã backup tại: images/_backup/`);
}

compressAll().catch(console.error);
