/**
 * Generate PWA icon PNGs from the SVG source.
 *
 * Usage:  node scripts/generate-icons.js
 *
 * Requires: sharp (already a dependency of this project via Next.js)
 *
 * Outputs:
 *   public/icon-192.png  (192x192)
 *   public/icon-512.png  (512x512)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SVG_PATH = path.join(PUBLIC_DIR, 'icon.svg');

async function generateIcons() {
  const svgBuffer = fs.readFileSync(SVG_PATH);

  const sizes = [192, 512];

  for (const size of sizes) {
    const outputPath = path.join(PUBLIC_DIR, `icon-${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`Created ${outputPath} (${stats.size} bytes)`);
  }

  console.log('\nDone! PWA icons generated successfully.');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
