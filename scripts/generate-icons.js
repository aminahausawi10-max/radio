const sharp = require('sharp');
const fs = require('fs');

async function processIcons() {
  const input = 'public/images/logo.png';
  
  // 512x512 with white background squircle/rounded padding if needed or direct resize
  await sharp(input)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile('public/images/icon-512.png');

  // 192x192
  await sharp(input)
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile('public/images/icon-192.png');

  // Apple touch icon (180x180)
  await sharp(input)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile('public/images/apple-touch-icon.png');

  // Favicon (64x64 and 32x32)
  await sharp(input)
    .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile('public/favicon.png');

  // Circular logo for spinning radio disc
  const circleSvg = Buffer.from(
    '<svg><circle cx="256" cy="256" r="256" fill="#fff"/></svg>'
  );
  await sharp(input)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .composite([{ input: circleSvg, blend: 'dest-in' }])
    .png()
    .toFile('public/images/logo-circle.png');

  console.log('All icons generated successfully!');
}

processIcons().catch(console.error);
