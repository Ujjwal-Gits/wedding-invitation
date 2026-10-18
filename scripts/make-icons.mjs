// The site's favicon and app icons, all drawn from the one Nimtto mark (public/site/brand/nimtto-mark.svg):
//   public/favicon.svg            crimson tile, cream mark; a brighter tile in dark mode (prefers-color-scheme)
//   public/favicon.ico            16, 32 and 48 px (PNG entries)
//   public/apple-touch-icon.png   180 px, solid tile (iOS adds its own rounding)
//   public/icon-192.png, icon-512.png, icon-maskable-512.png (mark inside the 80% safe circle)
//   public/site.webmanifest (Nepal, crimson) and public/site-intl.webmanifest (international, sage)
// Run: node scripts/make-icons.mjs   (needs the dev dependency sharp)
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pub = (...p) => resolve(root, 'public', ...p);
const CRIMSON = '#9A1829', SAGE = '#4A7556', CRIMSON_DARK = '#C02A40', CREAM = '#FBF1EC';
const W = 528, H = 476; // the mark's viewBox
const d = /\sd="([^"]+)"/.exec(readFileSync(pub('site', 'brand', 'nimtto-mark.svg'), 'utf8'))[1];

/** An SVG tile of `size` with the mark `share` of its width, centred; `rx` corner radius (0 = square). */
function tile(size, share, rx, { dark = false } = {}) {
  const mw = size * share, mh = mw * H / W;
  const x = ((size - mw) / 2).toFixed(2), y = ((size - mh) / 2).toFixed(2);
  const style = dark ? `<style>.t{fill:${CRIMSON}}@media (prefers-color-scheme:dark){.t{fill:${CRIMSON_DARK}}}</style>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${style}<rect class="t" width="${size}" height="${size}"${rx ? ` rx="${rx}"` : ''} fill="${CRIMSON}"/><svg x="${x}" y="${y}" width="${mw.toFixed(2)}" height="${mh.toFixed(2)}" viewBox="0 0 ${W} ${H}"><path fill="${CREAM}" fill-rule="evenodd" d="${d}"/></svg></svg>`;
}
const png = (svg, size) => sharp(Buffer.from(svg), { density: 72 * Math.max(1, 512 / size) }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

/** A .ico holding PNG images (every browser and Windows since Vista read these). */
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let off = head.length;
  images.forEach(({ size, buf }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(off, e + 12);
    off += buf.length;
  });
  return Buffer.concat([head, ...images.map((x) => x.buf)]);
}

// The tab icon: rounded tile; small sizes get a bigger mark so it stays legible at 16 px.
writeFileSync(pub('favicon.svg'), tile(64, 0.74, 14, { dark: true }));
const small = await Promise.all([16, 32, 48].map(async (size) => ({ size, buf: await png(tile(64, size === 16 ? 0.84 : 0.78, 12), size) })));
writeFileSync(pub('favicon.ico'), ico(small));
// Home-screen and install icons: square, solid (the platform rounds them).
writeFileSync(pub('apple-touch-icon.png'), await png(tile(180, 0.62, 0), 180));
writeFileSync(pub('icon-192.png'), await png(tile(192, 0.64, 0), 192));
writeFileSync(pub('icon-512.png'), await png(tile(512, 0.64, 0), 512));
writeFileSync(pub('icon-maskable-512.png'), await png(tile(512, 0.54, 0), 512));
const manifest = (start, theme, description) => `${JSON.stringify({
  name: 'Nimtto',
  short_name: 'Nimtto',
  description,
  start_url: start,
  scope: '/',
  display: 'browser',
  background_color: '#FFFFFF',
  theme_color: theme,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2)}
`;
writeFileSync(pub('site.webmanifest'), manifest('/', CRIMSON, 'Animated invitation websites with RSVP for Nepali weddings and family ceremonies.'));
writeFileSync(pub('site-intl.webmanifest'), manifest('/international/', SAGE, 'Animated invitation websites with RSVP for weddings and every celebration.'));
console.log('icons written');
