const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = 'C:/Users/Ameeynerh/.gemini/antigravity/brain/b52706f8-19aa-4693-9d9f-afc7360c14a8/.user_uploaded/media_1793398778424_ec9c5953.png';
const publicDir = path.join(__dirname, '..', 'public');
const imgDir = path.join(publicDir, 'images');

async function updateLogos() {
  if (!fs.existsSync(inputPath)) {
    throw new Error('Input logo not found: ' + inputPath);
  }

  // 1. Direct optimized logo.png for public/ and public/images/
  await sharp(inputPath).png({ quality: 95 }).toFile(path.join(imgDir, 'logo.png'));
  fs.copyFileSync(path.join(imgDir, 'logo.png'), path.join(publicDir, 'logo.png'));
  console.log('✓ Updated logo.png in public/ and public/images/');

  // 2. Icon 512x512
  await sharp(inputPath)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(imgDir, 'icon-512.png'));
  console.log('✓ Updated icon-512.png');

  // 3. Icon 192x192
  await sharp(inputPath)
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(imgDir, 'icon-192.png'));
  console.log('✓ Updated icon-192.png');

  // 4. Apple Touch Icon 180x180
  await sharp(inputPath)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(imgDir, 'apple-touch-icon.png'));
  console.log('✓ Updated apple-touch-icon.png');

  // 5. Favicon 64x64
  await sharp(inputPath)
    .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ Updated favicon.png');

  // 6. Circular logo for radio disc / spinning thumb
  const discSize = 300;
  const circleMask = Buffer.from(
    `<svg width="${discSize}" height="${discSize}"><circle cx="${discSize/2}" cy="${discSize/2}" r="${discSize/2}" fill="white"/></svg>`
  );

  await sharp(inputPath)
    .resize(discSize - 30, discSize - 30, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .extend({
      top: 15, bottom: 15, left: 15, right: 15,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toFile(path.join(imgDir, 'logo-circle.png'));
  console.log('✓ Updated logo-circle.png');

  // 7. SVG versions
  const logoBuf = fs.readFileSync(path.join(imgDir, 'logo.png'));
  const base64 = logoBuf.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 845" width="100%" height="100%">
  <image width="1024" height="845" href="data:image/png;base64,${base64}" />
</svg>`;
  fs.writeFileSync(path.join(imgDir, 'logo.svg'), svgContent);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  console.log('✓ Updated logo.svg and favicon.svg');
}

updateLogos().catch(err => {
  console.error(err);
  process.exit(1);
});
