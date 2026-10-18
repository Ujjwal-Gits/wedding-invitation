// The blog's build-time files, from the built-in posts (src/blog/posts/<np|intl>/<slug>.md, JSON frontmatter):
//   - public/sitemap-blog.xml (src/site/sitemaps.mjs writeSitemap) and the sitemap index (writeSitemapIndex)
//   - the blog part of public/llms.txt and public/llms-full.txt, between <!-- blog:start --> and <!-- blog:end -->
//   - with --og: the share-image list for scripts/make-og.py (public/site/og/blog-<slug>.jpg, blog.jpg, intl-blog.jpg)
// The server serves the live versions of all three from the store as soon as a post is published or edited in the studio
// (server/lib/blog.js); these files are what a fresh deploy starts from. Run after changing a built-in post, and after
// make-landing-pages.mjs (it rewrites llms*.txt):  node src/site/make-blog.mjs   (og list: node src/site/make-blog.mjs --og)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeSitemap, writeSitemapIndex } from './sitemaps.mjs';
import { SITE_URL } from './content.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIR = resolve(ROOT, 'src', 'blog', 'posts');
const BASE = { np: '/blog/', intl: '/international/blog/' };
const START = '<!-- blog:start -->';
const END = '<!-- blog:end -->';

const posts = [];
for (const site of ['np', 'intl']) {
  const d = resolve(DIR, site);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d).filter((n) => n.endsWith('.md')).sort()) {
    const raw = readFileSync(resolve(d, f), 'utf8').replace(/\r\n?/g, '\n');
    const m = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/.exec(raw);
    if (!m) throw new Error(`blog: ${site}/${f} has no frontmatter`);
    const meta = JSON.parse(m[1]);
    if (meta.status === 'draft') continue;
    posts.push({ ...meta, site, body: m[2], path: `${BASE[site]}${meta.slug}/` });
  }
}
posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title));
const bySite = (s) => posts.filter((p) => p.site === s);
const lastOf = (list) => list.reduce((m, p) => ((p.updatedAt || p.publishedAt) > m ? p.updatedAt || p.publishedAt : m), '');
const stillOf = (p) => (p.cover?.type === 'design' ? `/site/stills/${p.cover.design}-800.webp` : null);

/* ---------------- --og: the share images to draw ---------------- */
if (process.argv.includes('--og')) {
  const em = (t) => { const w = t.replace(/\s*\(.*\)\s*$/, '').split(' '); const k = Math.min(2, w.length - 1); return `${w.slice(0, -k).join(' ')} <i>${w.slice(-k).join(' ')}</i>`; };
  const out = posts.map((p) => {
    const phone = p.cover?.type === 'mock' ? { mock: p.cover.mock } : { src: stillOf(p) || '/site/stills/laali-800.webp' };
    return { img: `blog-${p.slug}`, market: p.site, eyebrow: `Nimtto guide · ${p.category}`, ne: '', h1: em(p.title.length > 64 ? p.title.replace(/:.*$/, '') : p.title),
      sub: p.site === 'intl' ? 'Wording, timing and etiquette, from the Nimtto team' : 'Wording, customs and timing, from the Nimtto team',
      foot: p.site === 'intl' ? 'Animated invitations with RSVP, made with a real designer' : 'Digital invitations for Nepal, made with a real designer', phone };
  });
  out.push({ img: 'blog', market: 'np', eyebrow: 'The Nimtto blog', ne: '', h1: 'Guides for Nepali <i>invitations.</i>', sub: 'Wording in Nepali and English, customs and timelines', foot: 'Digital invitations for Nepal, made with a real designer', phone: { src: '/site/stills/kham-800.webp' } });
  out.push({ img: 'intl-blog', market: 'intl', eyebrow: 'The Nimtto blog', ne: '', h1: 'Wedding invitation <i>guides.</i>', sub: 'Wording examples, timelines, etiquette and RSVP tips', foot: 'Animated invitations with RSVP, made with a real designer', phone: { src: '/site/stills/olive-grove-800.webp' } });
  console.log(JSON.stringify(out));
  process.exit(0);
}

/* ---------------- sitemap-blog.xml + the index ---------------- */
const entries = [];
for (const site of ['np', 'intl']) {
  const list = bySite(site);
  if (!list.length) continue;
  entries.push({ path: BASE[site], lastmod: lastOf(list), imgs: [site === 'intl' ? '/site/og/intl-blog.jpg' : '/site/og/blog.jpg'] });
  for (const p of list) entries.push({ path: p.path, lastmod: p.updatedAt || p.publishedAt, imgs: [p.og, stillOf(p)].filter(Boolean) });
}
writeSitemap('sitemap-blog.xml', entries, { images: true });
const indexed = writeSitemapIndex();

/* ---------------- llms.txt and llms-full.txt ---------------- */
const plain = (md) => md
  .replace(/^```copy\s*(.*)$/gm, (m, t) => (t ? `${t}:` : ''))
  .replace(/^```.*$/gm, '')
  .replace(/^>\s*\[![A-Z]+\]\s*$/gm, '')
  .replace(/^>\s?/gm, '')
  .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/(^|\s)\*([^*\n]+)\*/g, '$1$2')
  .replace(/^#{2,4}\s+/gm, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
const block = (full) => {
  const part = (site, h) => {
    const list = bySite(site);
    if (!list.length) return '';
    if (!full) return `## ${h}\n${list.map((p) => `- [${p.title}](${SITE_URL}${p.path}): ${p.excerpt}`).join('\n')}\n`;
    return list.map((p) => `## ${p.title}\nURL: ${SITE_URL}${p.path}\nBy Nimtto Team · Published ${p.publishedAt} · Updated ${p.updatedAt || p.publishedAt}\n${p.excerpt}\n\n${plain(p.body)}\n\n${(p.faq || []).map((x) => `### ${x.q}\n${x.a}\n`).join('\n')}`).join('\n');
  };
  return `${START}\n${part('np', full ? 'Blog (Nepal)' : 'Blog: Nepal site')}\n${part('intl', full ? 'Blog (International)' : 'Blog: International site')}${END}`;
};
for (const [file, full] of [['llms.txt', false], ['llms-full.txt', true]]) {
  const f = resolve(ROOT, 'public', file);
  if (!existsSync(f)) continue;
  const base = readFileSync(f, 'utf8');
  const a = base.indexOf(START);
  const b = base.indexOf(END);
  writeFileSync(f, a >= 0 && b > a ? base.slice(0, a) + block(full) + base.slice(b + END.length) : `${base.trimEnd()}\n\n${block(full)}\n`);
}
console.log(`blog: ${posts.length} posts; sitemap-blog.xml ${entries.length} urls; index: ${indexed.join(', ')}; llms.txt and llms-full.txt updated`);
