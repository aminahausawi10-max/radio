const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const desktopDir = path.join(process.env.USERPROFILE || 'C:\\Users\\Ameeynerh', 'Desktop');
const zipDest = path.join(desktopDir, 'arab-hausa-website.zip');
const sourceDir = path.join(__dirname, '..');
const tempDir = path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'deploy_arab_hausa');

if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const itemsToCopy = ['index.php', '.htaccess', 'public', 'api-php', 'data'];
itemsToCopy.forEach(item => {
  const srcPath = path.join(sourceDir, item);
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, path.join(tempDir, item));
  }
});

if (fs.existsSync(zipDest)) {
  fs.unlinkSync(zipDest);
}

execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipDest}' -Force"`);
fs.rmSync(tempDir, { recursive: true, force: true });

const stats = fs.statSync(zipDest);
const mb = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`READY: ${zipDest} (${mb} MB)`);
