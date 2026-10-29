const fs = require('fs');

// Patch index.html
let indexHtml = fs.readFileSync('public/index.html', 'utf8');

// Update icon links in head
indexHtml = indexHtml.replace(
  '<link rel="apple-touch-icon" href="/images/logo.svg">',
  '<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">\n  <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">'
);

// Update header logo
indexHtml = indexHtml.replace(
  '<img src="/images/logo.svg" alt="Arab Hausa Logo" class="brand-logo-img">',
  '<img src="/images/logo.png" alt="Arab Hausa Logo" class="brand-logo-img">'
);

// Update install modal logos
indexHtml = indexHtml.replace(
  /<img src="\/images\/logo\.svg" alt="Arab Hausa Logo" class="modal-logo"/g,
  '<img src="/images/logo.png" alt="Arab Hausa Logo" class="modal-logo"'
);

// Update home welcome logo
indexHtml = indexHtml.replace(
  '<img src="/images/logo.svg" alt="Station Logo" style="width: 76px; margin-bottom: 8px;">',
  '<img src="/images/logo.png" alt="Arab Hausa Logo" style="width: 80px; height: 80px; border-radius: 14px; background: #fff; padding: 4px; box-shadow: 0 4px 20px rgba(0,242,254,0.35); margin-bottom: 12px; object-fit: contain;">'
);

// Update disc thumb to circular logo
indexHtml = indexHtml.replace(
  '<img src="/images/logo.svg" alt="Disc" class="home-disc-thumb" id="homeDiscThumb">',
  '<img src="/images/logo-circle.png" alt="Disc" class="home-disc-thumb" id="homeDiscThumb">'
);

// Update large radio disc to circular logo
indexHtml = indexHtml.replace(
  '<img src="/images/logo.svg" alt="Radio Disc" class="radio-disc-large" id="radioDisc">',
  '<img src="/images/logo-circle.png" alt="Radio Disc" class="radio-disc-large" id="radioDisc">'
);

// Update TV poster
indexHtml = indexHtml.replace(
  'poster="/images/logo.svg"',
  'poster="/images/logo.png"'
);

// Update footer logo
indexHtml = indexHtml.replace(
  '<img src="/images/logo.svg" alt="Arab Hausa Logo" class="footer-logo">',
  '<img src="/images/logo.png" alt="Arab Hausa Logo" class="footer-logo">'
);

// Bump css version for cache busting
indexHtml = indexHtml.replace(
  '/css/liquid-glass.css?v=10',
  '/css/liquid-glass.css?v=11'
);

fs.writeFileSync('public/index.html', indexHtml, 'utf8');

// Patch admin.html
let adminHtml = fs.readFileSync('public/admin.html', 'utf8');
adminHtml = adminHtml.replace(
  '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
  '<link rel="icon" type="image/png" href="/favicon.png">'
);
adminHtml = adminHtml.replace(
  /<img src="\/images\/logo\.svg" alt="Arab Hausa Logo"/g,
  '<img src="/images/logo.png" alt="Arab Hausa Logo"'
);
adminHtml = adminHtml.replace(
  '/css/admin.css?v=13',
  '/css/admin.css?v=14'
);

fs.writeFileSync('public/admin.html', adminHtml, 'utf8');

console.log('HTML files patched successfully!');
