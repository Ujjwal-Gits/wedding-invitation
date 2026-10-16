// Small WebP copies of each theme's stills for the website.
//  - thumb.jpg (1200x900)  -> public/site/thumbs/<slug>-480|800.webp      (gallery cards, design pages)
//  - gate.jpg / hero.jpg   -> public/site/stills/<slug>-gate|hero.webp     (phone-shaped stills, 480x720)
// Run after adding a theme:  node src/site/make-thumbs.mjs   (then node src/site/make-design-pages.mjs)
// Writes src/site/thumbs.json (slugs with thumbs) and src/site/stills.json ({ slug: ['gate', 'hero'] }).
import { createRequire } from 'node:module';
import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const sharp = createRequire(resolve(ROOT, 'server', 'package.json'))('sharp');
const OUT = resolve(ROOT, 'public', 'site', 'thumbs');
const OUT_STILLS = resolve(ROOT, 'public', 'site', 'stills');
const WIDTHS = [480, 800];
mkdirSync(OUT, { recursive: true });
mkdirSync(OUT_STILLS, { recursive: true });
const done = [];
const stills = {};
for (const slug of readdirSync(resolve(ROOT, 'public', 'themes')).sort()) {
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(slug)) continue;
  const dir = resolve(ROOT, 'public', 'themes', slug);
  const src = resolve(dir, 'thumb.jpg');
  if (existsSync(src)) {
    for (const w of WIDTHS) {
      const out = resolve(OUT, `${slug}-${w}.webp`);
      if (!existsSync(out)) await sharp(src).resize({ width: w }).webp({ quality: 76, effort: 6 }).toFile(out);
    }
    done.push(slug);
  }
  for (const kind of ['gate', 'hero']) {
    const s = resolve(dir, `${kind}.jpg`);
    if (!existsSync(s)) continue;
    const out = resolve(OUT_STILLS, `${slug}-${kind}.webp`);
    if (!existsSync(out)) await sharp(s).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 78, effort: 6 }).toFile(out);
    (stills[slug] ||= []).push(kind);
  }
}
writeFileSync(resolve(import.meta.dirname, 'thumbs.json'), `${JSON.stringify(done)}\n`);
writeFileSync(resolve(import.meta.dirname, 'stills.json'), `${JSON.stringify(stills)}\n`);
console.log(`thumbs: ${done.length} themes x ${WIDTHS.join('/')}w; stills: ${Object.keys(stills).length} themes`);
