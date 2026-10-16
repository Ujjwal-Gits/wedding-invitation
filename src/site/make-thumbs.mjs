// Small WebP copies of each theme's stills for the website.
//  - public/themes/<slug>/thumb.jpg (1200x900, the big-screen still) -> public/site/thumbs/<slug>-480|800.webp
//  - art-src/stills/<slug>.png (1170x2532: the design's chosen phone frame, shot at 390x844 @3x; gitignored)
//      -> public/site/stills/<slug>-480|800|1170.webp, served with srcset (src/site/stills.js)
//    Which frame was chosen (gate, opening, first screen or a body moment) and why: src/site/stills-picks.json.
// Run after adding a theme or re-shooting:  node src/site/make-thumbs.mjs   (then node src/site/make-design-pages.mjs)
// Rebuilds an output when its source is newer. Writes src/site/thumbs.json (slugs with thumbs) and
// src/site/stills.json ({ slug: { kind, w: [480, 800, 1170] } }).
import { createRequire } from 'node:module';
import { readdirSync, existsSync, mkdirSync, writeFileSync, readFileSync, statSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const sharp = createRequire(resolve(ROOT, 'server', 'package.json'))('sharp');
const OUT = resolve(ROOT, 'public', 'site', 'thumbs');
const OUT_STILLS = resolve(ROOT, 'public', 'site', 'stills');
const SRC_STILLS = resolve(ROOT, 'art-src', 'stills');
const WIDTHS = [480, 800];
const STILL_W = [480, 800, 1170];
const picks = JSON.parse(readFileSync(resolve(import.meta.dirname, 'stills-picks.json'), 'utf8'));
mkdirSync(OUT, { recursive: true });
mkdirSync(OUT_STILLS, { recursive: true });

const stale = (src, out) => !existsSync(out) || statSync(out).mtimeMs < statSync(src).mtimeMs;
const done = [];
const stills = {};
for (const slug of readdirSync(resolve(ROOT, 'public', 'themes')).sort()) {
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(slug)) continue;
  const src = resolve(ROOT, 'public', 'themes', slug, 'thumb.jpg');
  if (existsSync(src)) {
    for (const w of WIDTHS) {
      const out = resolve(OUT, `${slug}-${w}.webp`);
      if (stale(src, out)) await sharp(src).resize({ width: w }).webp({ quality: 80, effort: 6 }).toFile(out);
    }
    done.push(slug);
  }
  const still = resolve(SRC_STILLS, `${slug}.png`);
  const outs = STILL_W.map((w) => resolve(OUT_STILLS, `${slug}-${w}.webp`));
  if (existsSync(still)) {
    for (const [i, w] of STILL_W.entries()) {
      if (stale(still, outs[i])) await sharp(still).resize({ width: w, withoutEnlargement: true, kernel: 'lanczos3' }).webp({ quality: w >= 1000 ? 82 : 84, effort: 6, smartSubsample: true }).toFile(outs[i]);
    }
  }
  if (outs.every(existsSync)) stills[slug] = { kind: picks[slug]?.kind || 'hero', w: STILL_W };
  // the old single-size stills (<slug>-gate|hero.webp) are replaced by the chosen frame
  for (const k of ['gate', 'hero']) { const old = resolve(OUT_STILLS, `${slug}-${k}.webp`); if (stills[slug] && existsSync(old)) rmSync(old); }
}
writeFileSync(resolve(import.meta.dirname, 'thumbs.json'), `${JSON.stringify(done)}\n`);
writeFileSync(resolve(import.meta.dirname, 'stills.json'), `${JSON.stringify(stills)}\n`);
console.log(`thumbs: ${done.length} themes x ${WIDTHS.join('/')}w; stills: ${Object.keys(stills).length} themes x ${STILL_W.join('/')}w`);
