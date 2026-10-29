const fs = require('fs');
const zlib = require('zlib');

// Let's see if sharp is installed, or canvas
try {
  require('sharp');
  console.log('sharp is available');
} catch (e) {
  console.log('sharp not available');
}
