const sharp = require('sharp');
const path = require('path');

async function processMockup() {
  const input = path.join(__dirname, '..', 'public', 'images', 'mockup-full.jpg');
  const outDir = path.join(__dirname, '..', 'public', 'images');

  // 1. Perfectly cropped circular logo with transparent alpha channel
  const logoSize = 120;
  const circleSvg = Buffer.from(
    `<svg width="${logoSize}" height="${logoSize}">
      <circle cx="${logoSize / 2}" cy="${logoSize / 2}" r="${logoSize / 2}" fill="white" />
    </svg>`
  );

  await sharp(input)
    .extract({ left: 41, top: 10, width: logoSize, height: logoSize })
    .composite([{ input: circleSvg, blend: 'dest-in' }])
    .png()
    .toFile(path.join(outDir, 'logo-circle.png'));
  console.log('✓ logo-circle.png created');

  // 2. High-res Hero Card Graphic (Microphone, Globe, ON AIR, Waves, and Badge)
  // The hero in mockup-full.jpg runs from y ~ 230 to y ~ 770
  // Let's extract the full hero graphic and also the right artwork
  await sharp(input)
    .extract({ left: 340, top: 230, width: 467, height: 535 })
    .png()
    .toFile(path.join(outDir, 'hero-artwork.png'));
  console.log('✓ hero-artwork.png created');

  // 3. Let's also extract the entire hero card canvas to use as high-def backdrop/asset if needed
  await sharp(input)
    .extract({ left: 16, top: 232, width: 775, height: 538 })
    .png()
    .toFile(path.join(outDir, 'hero-card-full.png'));
  console.log('✓ hero-card-full.png created');

  // 4. Let's extract the Features Icons (Radio, TV, News, Globe) individually for 100% fidelity!
  // In mockup-full.jpg: features bar is y: 790 to 980
  // Column 1 Radio: x: 80-160
  // Column 2 TV: x: 260-340
  // Column 3 News: x: 450-530
  // Column 4 Globe: x: 640-720
  await sharp(input)
    .extract({ left: 88, top: 825, width: 75, height: 75 })
    .png()
    .toFile(path.join(outDir, 'icon-feature-radio.png'));

  await sharp(input)
    .extract({ left: 278, top: 825, width: 75, height: 75 })
    .png()
    .toFile(path.join(outDir, 'icon-feature-tv.png'));

  await sharp(input)
    .extract({ left: 470, top: 825, width: 75, height: 75 })
    .png()
    .toFile(path.join(outDir, 'icon-feature-news.png'));

  await sharp(input)
    .extract({ left: 660, top: 825, width: 75, height: 75 })
    .png()
    .toFile(path.join(outDir, 'icon-feature-globe.png'));
  console.log('✓ 4 feature icons extracted');
}

processMockup().catch(console.error);
