/**
 * Generates PWA PNG icons for Azzay Pharmacy Pro.
 * Pure Node.js — no native dependencies.
 * Run: node scripts/generate-icons.mjs
 * For crisp PNGs: pnpm add -D sharp && node scripts/generate-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../public/icons');
mkdirSync(OUT_DIR, { recursive: true });

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const TEAL_DARK = '#004E57';
const TEAL      = '#006D77';
const WHITE     = '#FFFFFF';

// ── CRC32 table (must be defined before use) ──────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.concat([typeB, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, typeB, data, crc]);
}

function deflateRaw(data) {
  const len = data.length;
  const out = Buffer.alloc(2 + 5 + len + 4);
  let i = 0;
  out[i++] = 0x78; // zlib CMF
  out[i++] = 0x01; // zlib FLG
  out[i++] = 0x01; // BFINAL=1, BTYPE=00 (stored)
  out[i++] = len & 0xFF;
  out[i++] = (len >> 8) & 0xFF;
  out[i++] = (~len) & 0xFF;
  out[i++] = ((~len) >> 8) & 0xFF;
  data.copy(out, i); i += len;
  // Adler-32
  let s1 = 1, s2 = 0;
  for (const byte of data) { s1 = (s1 + byte) % 65521; s2 = (s2 + s1) % 65521; }
  out.writeUInt32BE((s2 << 16) | s1, i);
  return out.slice(0, i + 4);
}

/**
 * Creates a minimal valid 1×1 PNG with the given RGB colour.
 * Browsers scale it up — good enough for PWA install prompts.
 */
function createMinimalPng(r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0);
  ihdrData.writeUInt32BE(1, 4);
  ihdrData[8] = 8; ihdrData[9] = 2; // 8-bit RGB
  const ihdr = makeChunk('IHDR', ihdrData);
  const raw = Buffer.from([0, r, g, b]); // filter=0 + RGB
  const idat = makeChunk('IDAT', deflateRaw(raw));
  const iend = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

function buildSvg(size) {
  const cx = size / 2, cy = size / 2;
  const pw = size * 0.55, ph = size * 0.22, pr = ph / 2;
  const px = cx - pw / 2, py = cy - ph / 2;
  const pmid = px + pw / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${TEAL_DARK}"/>
      <stop offset="100%" stop-color="${TEAL}"/>
    </linearGradient>
    <clipPath id="c"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="${pr}"/></clipPath>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${size / 2}" fill="url(#bg)"/>
  <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="${pr}" fill="${WHITE}" opacity="0.9"/>
  <rect x="${px}" y="${py}" width="${pw / 2}" height="${ph}" fill="${WHITE}" opacity="0.55" clip-path="url(#c)"/>
  <line x1="${pmid}" y1="${py}" x2="${pmid}" y2="${py + ph}" stroke="${TEAL}" stroke-width="${size * 0.015}" opacity="0.4"/>
  <line x1="${pmid + pw * 0.12}" y1="${cy - ph * 0.3}" x2="${pmid + pw * 0.12}" y2="${cy + ph * 0.3}" stroke="${TEAL}" stroke-width="${size * 0.025}" stroke-linecap="round"/>
  <line x1="${pmid + pw * 0.04}" y1="${cy}" x2="${pmid + pw * 0.2}" y2="${cy}" stroke="${TEAL}" stroke-width="${size * 0.025}" stroke-linecap="round"/>
</svg>`;
}

// Try sharp first for proper PNGs
let usedSharp = false;
try {
  const { default: sharp } = await import('sharp');
  usedSharp = true;
  for (const size of SIZES) {
    const pngPath = join(OUT_DIR, `icon-${size}x${size}.png`);
    await sharp(Buffer.from(buildSvg(size))).resize(size, size).png().toFile(pngPath);
    console.log(`✓ PNG ${size}x${size} (sharp)`);
  }
} catch {
  console.log('sharp not available — writing 1×1 teal PNG placeholders (browsers scale them)');
  const png = createMinimalPng(0x00, 0x6D, 0x77); // #006D77
  for (const size of SIZES) {
    const pngPath = join(OUT_DIR, `icon-${size}x${size}.png`);
    writeFileSync(pngPath, png);
    console.log(`✓ PNG placeholder ${size}x${size}`);
  }
}

// Always write SVGs alongside (useful for debugging)
for (const size of SIZES) {
  writeFileSync(join(OUT_DIR, `icon-${size}x${size}.svg`), buildSvg(size), 'utf8');
}

console.log(`\nDone — icons in public/icons/`);
if (!usedSharp) {
  console.log('For full-quality icons: pnpm add -D sharp && node scripts/generate-icons.mjs');
}
