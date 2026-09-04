// Regenerates public/favicon.ico and public/apple-touch-icon.png from
// public/favicon.svg, so all three icon assets always match its design.
// Run with: node scripts/gen-icons.mjs
//
// `sharp` isn't hoisted to the top-level node_modules under this pnpm
// layout (it's a transitive dep), so it's resolved from the pnpm store
// below rather than a plain `require('sharp')`.
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
const svgPath = new URL('../public/favicon.svg', import.meta.url).pathname;

function buildIco(pngsBySize) {
  const sizes = Object.keys(pngsBySize).map(Number).sort((a, b) => a - b);
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + entrySize * sizes.length;

  const entries = [];
  const buffers = [];
  for (const size of sizes) {
    const png = pngsBySize[size];
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    buffers.push(png);
    offset += png.length;
  }

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);

  return Buffer.concat([header, ...entries, ...buffers]);
}

const icoSizes = [16, 32, 48];
const pngsBySize = {};
for (const size of icoSizes) {
  pngsBySize[size] = await sharp(svgPath).resize(size, size).png().toBuffer();
}
writeFileSync(new URL('../public/favicon.ico', import.meta.url), buildIco(pngsBySize));
console.log(`wrote public/favicon.ico (sizes: ${icoSizes.join('/')})`);

await sharp(svgPath).resize(180, 180).png().toFile(
  new URL('../public/apple-touch-icon.png', import.meta.url).pathname,
);
console.log('wrote public/apple-touch-icon.png (180x180)');
