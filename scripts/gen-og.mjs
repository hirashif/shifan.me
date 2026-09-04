// Regenerates public/og.png (1200x630), the Open Graph / Twitter card image
// used sitewide via src/layouts/Base.astro. Run with: node scripts/gen-og.mjs
import { readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function resolveSharp() {
  try {
    return require('sharp');
  } catch {
    const storeDir = new URL('../node_modules/.pnpm/', import.meta.url);
    const entry = readdirSync(storeDir).find((d) => d.startsWith('sharp@'));
    if (!entry) throw new Error('sharp not found in node_modules/.pnpm — run pnpm install');
    return require(new URL(`../node_modules/.pnpm/${entry}/node_modules/sharp`, import.meta.url).pathname);
  }
}

const sharp = resolveSharp();

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0a0a0b" />
  <text x="90" y="330" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="130" letter-spacing="-5" fill="#e7e7ea">shifan<tspan fill="#e8b04b">.</tspan></text>
  <text x="92" y="394" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="28" fill="#a1a1a8">i like systems where the numbers have to add up.</text>
  <text x="92" y="434" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="28" fill="#a1a1a8">money, markets, machines that write code.</text>
  <text x="92" y="474" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="28" fill="#a1a1a8">building in the open, mostly at night.</text>
</svg>`;

const outPath = new URL('../public/og.png', import.meta.url).pathname;
await sharp(Buffer.from(svg)).resize(1200, 630).png().toFile(outPath);
writeFileSync(new URL('../scripts/og.svg', import.meta.url), svg);
console.log('wrote public/og.png (1200x630) and scripts/og.svg (source)');
