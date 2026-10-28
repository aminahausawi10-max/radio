const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Running Arab Hausa Radio TV Build Process...\n');

// 1. Verify Environment Variables
console.log('📦 Step 1: Checking environment configuration...');
let envFound = false;
['.env.local', '.env'].forEach(f => {
  if (fs.existsSync(path.join(__dirname, '..', f))) {
    console.log(`   ✓ Found ${f}`);
    envFound = true;
  }
});

if (!envFound) {
  console.error('❌ Build failed: Missing .env or .env.local file.');
  process.exit(1);
}

// 2. Validate PWA & Public Assets
console.log('\n📱 Step 2: Validating PWA and Liquid Glass assets...');
const requiredAssets = [
  'public/index.html',
  'public/admin.php',
  'public/manifest.json',
  'public/sw.js',
  'public/css/liquid-glass.css',
  'public/css/admin.css',
  'public/js/app.js',
  'public/js/pwa-install.js',
  'public/js/admin.js',
  'public/images/logo.svg',
  'public/favicon.svg'
];

requiredAssets.forEach(asset => {
  const fullPath = path.join(__dirname, '..', asset);
  if (fs.existsSync(fullPath)) {
    const size = (fs.statSync(fullPath).size / 1024).toFixed(1);
    console.log(`   ✓ ${asset} (${size} KB)`);
  } else {
    console.error(`❌ Missing critical asset: ${asset}`);
    process.exit(1);
  }
});

// 3. Validate PHP Syntax (Linting with zero errors)
console.log('\n🐘 Step 3: Linting PHP backend scripts...');
const phpFiles = [
  'index.php',
  'api/db.php',
  'api/settings.php',
  'api/news.php',
  'api/schedule.php',
  'api/admin-auth.php',
  'api/test-connection.php',
  'public/admin.php'
];

phpFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  try {
    const lintOutput = execSync(`php -l "${fullPath}"`, { encoding: 'utf8' });
    console.log(`   ✓ ${file}: ${lintOutput.trim()}`);
  } catch (err) {
    console.error(`❌ PHP syntax error in ${file}:`, err.message);
    process.exit(1);
  }
});

// 4. Test Neon Lakebase Postgres Service
console.log('\n⚡ Step 4: Testing wired Neon Postgres database connection...');
try {
  execSync('node scripts/test-db.js', { stdio: 'inherit' });
} catch (err) {
  console.error('❌ Neon database validation failed.');
  process.exit(1);
}

console.log('====================================================');
console.log('🎉 BUILD SUCCESSFUL! Arab Hausa Radio TV is ready.');
console.log('====================================================');
