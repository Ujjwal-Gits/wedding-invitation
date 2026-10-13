// Builds web assets from art-src/:
//   art-src/photos/<slug>.jpg  → public/photos/<slug>-lg.webp (2560w) and -sm.webp (1280w)
//   art-src/depth/<slug>.png   → public/photos/<slug>-depth.webp   (run scripts/depth.py first)
//   art-src/music/*.mp3        → public/audio/
//   art-src/photos/credits.json → src/generated/credits.json
//   art-src/*.jpg (legacy art)  → public/art/
// Run: node scripts/optimize-art.mjs            (everything)
//      node scripts/optimize-art.mjs slug slug  (only these photos/depths; lists are always rebuilt)
import sharp from 'sharp';
import { readdir, mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const R = (...p) => path.resolve(...p);
const dirs = { photos: R('public/photos'), art: R('public/art'), audio: R('public/audio'), gen: R('src/generated') };
await Promise.all(Object.values(dirs).map((d) => mkdir(d, { recursive: true })));
const list = async (d) => (existsSync(d) ? readdir(d) : []);
const only = new Set(process.argv.slice(2));
const wanted = (name) => only.size === 0 || only.has(name);

// Photographs
for (const f of await list(R('art-src/photos'))) {
  const { name, ext } = path.parse(f);
  if (!/\.(jpe?g|png)$/i.test(ext) || !wanted(name)) continue;
  const src = R('art-src/photos', f);
  for (const [size, width, q] of [['lg', 2560, 80], ['sm', 1280, 76]]) {
    const out = R(dirs.photos, `${name}-${size}.webp`);
    const info = await sharp(src).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: q, effort: 5 }).toFile(out);
    console.log(`photo  ${name}-${size}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)}KB`);
  }
}

// Depth maps
for (const f of await list(R('art-src/depth'))) {
  const { name, ext } = path.parse(f);
  if (ext !== '.png' || !wanted(name)) continue;
  await sharp(R('art-src/depth', f)).greyscale().webp({ quality: 92 }).toFile(R(dirs.photos, `${name}-depth.webp`));
  console.log(`depth  ${name}`);
}

// Music
for (const f of await list(R('art-src/music'))) {
  if (!/\.(mp3|m4a)$/i.test(f)) continue;
  await copyFile(R('art-src/music', f), R(dirs.audio, f));
  console.log(`audio  ${f}`);
}

// Credits for openly licensed photos
const creditsSrc = R('art-src/photos/credits.json');
const credits = existsSync(creditsSrc) ? JSON.parse(await readFile(creditsSrc, 'utf8')) : [];
await writeFile(R(dirs.gen, 'credits.json'), JSON.stringify(credits, null, 2));
console.log(`credits ${credits.length}`);
const depthList = (await list(R('art-src/depth'))).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));
await writeFile(R(dirs.gen, 'depth.json'), JSON.stringify(depthList));
console.log(`depth list ${depthList.length}`);

// Legacy generated art (couple portrait placeholder, textures)
const SPECIAL = { velvet: { lg: 1264, sm: 700 }, couple: { lg: 1136, sm: 720 } };
for (const f of await list(R('art-src'))) {
  const { name, ext } = path.parse(f);
  if (!SPECIAL[name] || ext !== '.jpg') continue;
  for (const [size, width] of Object.entries(SPECIAL[name])) {
    await sharp(R('art-src', f)).resize({ width }).webp({ quality: 80 }).toFile(R(dirs.art, `${name}-${size}.webp`));
  }
}
const og = R('art-src/couple.jpg');
if (existsSync(og)) {
  const m = await sharp(og).resize({ width: 1200 }).toBuffer({ resolveWithObject: true });
  const top = Math.max(0, Math.min(m.info.height - 630, Math.round(m.info.height * 0.1)));
  await sharp(m.data).extract({ left: 0, top, width: 1200, height: 630 }).jpeg({ quality: 82, mozjpeg: true }).toFile(R(dirs.art, 'og.jpg'));
}
console.log('done');
