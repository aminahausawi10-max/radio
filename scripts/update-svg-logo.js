const fs = require('fs');

const b64 = fs.readFileSync('public/images/logo.png').toString('base64');
const dataUri = `data:image/png;base64,${b64}`;

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <image href="${dataUri}" width="500" height="500" preserveAspectRatio="xMidYMid meet" />
</svg>
`;

fs.writeFileSync('public/images/logo.svg', svgContent, 'utf8');
fs.writeFileSync('public/favicon.svg', svgContent, 'utf8');
console.log('SVG files generated successfully');
