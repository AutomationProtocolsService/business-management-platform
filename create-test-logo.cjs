const sharp = require('sharp');

// Create a simple company logo as PNG
const logoSvg = `
<svg width="200" height="80" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="80" fill="#2563eb" rx="8"/>
  <text x="100" y="30" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">Lancashire</text>
  <text x="100" y="50" font-family="Arial, sans-serif" font-size="14" fill="white" text-anchor="middle">Shopfronts</text>
  <text x="100" y="66" font-family="Arial, sans-serif" font-size="10" fill="#e2e8f0" text-anchor="middle">LIMITED</text>
</svg>
`;

sharp(Buffer.from(logoSvg))
  .png()
  .toFile('./uploads/logos/company-logo.png')
  .then(() => {
    console.log('Logo created successfully');
  })
  .catch(err => {
    console.error('Error creating logo:', err);
  });