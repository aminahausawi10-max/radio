const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('public/images/logo.png');
let pos = 8;
const idatChunks = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.slice(pos + 4, pos + 8).toString('ascii');
  if (type === 'IDAT') {
    idatChunks.push(buf.slice(pos + 8, pos + 8 + len));
  }
  pos += 12 + len;
}
const allIdat = Buffer.concat(idatChunks);
const raw = zlib.inflateSync(allIdat);
// Check first pixel (after filter byte 0)
console.log('Row 0 filter byte:', raw[0]);
console.log('Pixel (0,0) RGBA:', raw[1], raw[2], raw[3], raw[4]);
console.log('Pixel (10,10) approx:', raw[1 + 10*(1024*4+1) + 40], raw[2 + 10*(1024*4+1) + 40], raw[3 + 10*(1024*4+1) + 40], raw[4 + 10*(1024*4+1) + 40]);
