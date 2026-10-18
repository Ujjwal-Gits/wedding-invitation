// A blog post's landscape feature image from one large source picture (a Canva export, at least 2400 px wide):
//   public/site/blog/<slug>-v<N>-2400.webp, -1600.webp, -800.webp   (the post's hero, the blog cards)
//   public/site/og/blog-<slug>-v<M>.jpg                              (1200x630 share image)
// Then set the post's frontmatter: "cover": { "type": "image", "src": "/site/blog/<slug>-v<N>", "alt", "caption" },
// "og": "/site/og/blog-<slug>-v<M>.jpg", and bump SEED_VERSION in server/lib/blog.js so the live store takes it
// (owner-edited posts are never overwritten). New pictures get a new version number: caches never show an old one.
// Usage (repo root): node scripts/blog-art.mjs <source.jpg> <slug> <N> <M>
import sharp from 'sharp';
import { resolve } from 'node:path';

const [src, slug, v = '1', ogV = '2'] = process.argv.slice(2);
if (!src || !/^[a-z0-9-]+$/.test(slug || '')) { console.error('usage: node scripts/blog-art.mjs <source.jpg> <slug> [version] [og version]'); process.exit(1); }
const root = resolve(import.meta.dirname, '..');
const img = () => sharp(src).rotate();
for (const w of [2400, 1600, 800]) {
  await img().resize({ width: w }).webp({ quality: w === 2400 ? 74 : 78, effort: 5 }).toFile(resolve(root, 'public/site/blog', `${slug}-v${v}-${w}.webp`));
}
await img().resize({ width: 1200, height: 630, fit: 'cover', position: 'attention' }).jpeg({ quality: 84, mozjpeg: true }).toFile(resolve(root, 'public/site/og', `blog-${slug}-v${ogV}.jpg`));
console.log(`blog art: /site/blog/${slug}-v${v}-{2400,1600,800}.webp and /site/og/blog-${slug}-v${ogV}.jpg`);
