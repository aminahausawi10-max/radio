const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const targetUrl = 'https://radio-nine-gamma.vercel.app';
const publicDir = path.join(__dirname, '..', 'public', 'images');
const artifactDir = path.join('C:', 'Users', 'Ameeynerh', '.gemini', 'antigravity', 'brain', 'be27ed52-81fc-4419-b27c-c6cf84aacdbf');

async function generate() {
  console.log(`Generating QR codes for: ${targetUrl}`);

  // Options for styling
  const svgOptions = {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#0047AB', // Royal Blue matching the theme
      light: '#FFFFFF'
    }
  };

  const pngOptions = {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 2,
    width: 800,
    color: {
      dark: '#0047AB',
      light: '#FFFFFF'
    }
  };

  // 1. Generate SVG in public/images
  const svgString = await QRCode.toString(targetUrl, svgOptions);
  const svgPath = path.join(publicDir, 'qr-code.svg');
  fs.writeFileSync(svgPath, svgString);
  console.log(`Saved SVG to ${svgPath}`);

  // 2. Generate PNG in public/images
  const pngPath = path.join(publicDir, 'qr-code.png');
  await QRCode.toFile(pngPath, targetUrl, pngOptions);
  console.log(`Saved PNG to ${pngPath}`);

  // 3. Also copy to artifact directory for instant viewing
  if (fs.existsSync(artifactDir)) {
    fs.writeFileSync(path.join(artifactDir, 'arab-hausa-qr-code.svg'), svgString);
    await QRCode.toFile(path.join(artifactDir, 'arab-hausa-qr-code.png'), targetUrl, pngOptions);
    console.log(`Copied QR code files to artifact directory: ${artifactDir}`);
  }
}

generate().catch(err => {
  console.error('Error generating QR code:', err);
  process.exit(1);
});
