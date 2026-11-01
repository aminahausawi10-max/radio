const { execSync } = require('child_process');
const path = require('path');

const pyScript = path.join(__dirname, 'bundle-zip.py');
execSync(`python "${pyScript}"`, { stdio: 'inherit' });
