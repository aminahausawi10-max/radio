const fs = require('fs');

let css = fs.readFileSync('public/css/liquid-glass.css', 'utf8');

// Replace .brand-logo-img
css = css.replace(
  /\.brand-logo-img\s*\{[^}]+\}/,
  `.brand-logo-img {
  width: 42px;
  height: 42px;
  border-radius: 9px;
  background: #ffffff;
  padding: 2px;
  object-fit: contain;
  box-shadow: 0 0 12px rgba(0, 242, 254, 0.4);
}`
);

// Replace .modal-logo
css = css.replace(
  /\.modal-logo\s*\{[^}]+\}/,
  `.modal-logo {
  width: 84px;
  height: 84px;
  margin: 0 auto 12px;
  border-radius: 14px;
  background: #ffffff;
  padding: 4px;
  object-fit: contain;
  box-shadow: 0 0 20px rgba(0, 242, 254, 0.45);
}`
);

// Replace .footer-logo
css = css.replace(
  /\.footer-logo\s*\{[^}]+\}/,
  `.footer-logo {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #ffffff;
  padding: 3px;
  object-fit: contain;
  box-shadow: 0 0 12px rgba(0, 242, 254, 0.3);
}`
);

// Ensure .home-disc-thumb and .radio-disc-large background is white
css = css.replace(
  /\.home-disc-thumb\s*\{([^}]+)\}/,
  (match, p1) => {
    if (!p1.includes('background')) {
      return `.home-disc-thumb {${p1}  background: #ffffff;\n}`;
    }
    return match;
  }
);

css = css.replace(
  /\.radio-disc-large\s*\{([^}]+)\}/,
  (match, p1) => {
    if (!p1.includes('background')) {
      return `.radio-disc-large {${p1}  background: #ffffff;\n}`;
    }
    return match;
  }
);

fs.writeFileSync('public/css/liquid-glass.css', css, 'utf8');
console.log('CSS updated successfully!');
