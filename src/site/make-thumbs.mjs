// Small WebP copies of each theme's thumb.jpg for the website gallery (the originals are 1200x900 JPEGs).
// Run after adding a theme:  node src/site/make-thumbs.mjs   (writes public/site/thumbs/ and src/site/thumbs.json)
import { createRequire } from 'node:module';
import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const sharp = createRequire(resolve(ROOT, 'server', 'package.json'))('sharp');
const OUT = resolve(ROOT, 'public', 'site', 'thumbs');
const WIDTHS = [480, 800];
mkdirSync(OUT, { recursive: true });
const done = [];
for (const slug of readdirSync(resolve(ROOT, 'public', 'themes')).sort()) {
  const src = resolve(ROOT, 'public', 'themes', slug, 'thumb.jpg');
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(slug) || !existsSync(src)) continue;
  for (const w of WIDTHS) await sharp(src).resize({ width: w }).webp({ quality: 76, effort: 6 }).toFile(resolve(OUT, `${slug}-${w}.webp`));
  done.push(slug);
}
writeFileSync(resolve(import.meta.dirname, 'thumbs.json'), `${JSON.stringify(done)}\n`);
console.log(`thumbs: ${done.length} themes x ${WIDTHS.join('/')}w`);
