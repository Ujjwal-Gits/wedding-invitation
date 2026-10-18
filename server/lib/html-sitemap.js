// GET /sitemap/: a readable list of every public page, built from the XML sitemaps (public/sitemap-*.xml and the
// live blog sitemap). People and search engines can follow it; the XML files stay plain for Google.
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { DIST_DIR } from './env.js';

const GROUPS = [
  ['sitemap-pages-np.xml', 'Nimtto Nepal'],
  ['sitemap-pages-intl.xml', 'Nimtto International'],
  ['sitemap-designs.xml', 'Designs'],
];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const locs = (xml) => [...String(xml).matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /^https:\/\/[^\s<>"]+$/.test(u));
const label = (url) => {
  const path = new URL(url).pathname.replace(/\/$/, '');
  if (!path) return 'Home';
  const last = path.split('/').pop().replace(/-/g, ' ');
  return last.charAt(0).toUpperCase() + last.slice(1);
};

let cache = { at: 0, html: '' };
/** blogXml(): the live blog sitemap (lib/blog), so new posts show at once. */
export function htmlSitemap(blogXml) {
  return async (req, res, next) => {
    try {
      if (Date.now() - cache.at > 10 * 60 * 1000) {
        const parts = [];
        for (const [file, title] of GROUPS) {
          const xml = await fs.readFile(resolve(DIST_DIR, file), 'utf8').catch(() => '');
          parts.push([title, locs(xml)]);
        }
        parts.push(['Guides (blog)', locs(await Promise.resolve(blogXml?.()).catch(() => ''))]);
        const sections = parts.filter(([, l]) => l.length).map(([t, l]) => `<section><h2>${esc(t)} <small>${l.length}</small></h2><ul>${
          l.map((u) => `<li><a href="${esc(u)}">${esc(label(u))}</a><span>${esc(new URL(u).pathname)}</span></li>`).join('')}</ul></section>`).join('');
        cache = { at: Date.now(), html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sitemap: Every Page on Nimtto | Nimtto</title><meta name="description" content="Every public page on Nimtto: designs, occasions, pricing and invitation guides for Nepal and international customers.">
<link rel="canonical" href="https://nimtto.com/sitemap/"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>body{margin:0;background:#fff;color:#1e1216;font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}.w{max-width:1100px;margin:0 auto;padding:40px 20px 64px}
.b{font-weight:700;color:#A8123A;font-size:20px;text-decoration:none}h1{font-size:30px;margin:16px 0 4px;letter-spacing:-.02em}p{color:#5b4a50;margin:0 0 24px}
section{margin:28px 0}h2{font-size:18px;margin:0 0 10px;padding-bottom:8px;border-bottom:1px solid #eadfe2}h2 small{color:#8a7a80;font-weight:400;font-size:13px}
ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:4px 24px}
li{padding:7px 0;border-bottom:1px solid #f4ecee;display:grid}a{color:#1e1216;text-decoration:none}a:hover{color:#A8123A;text-decoration:underline}li span{font-size:12px;color:#8a7a80;word-break:break-all}</style></head>
<body><div class="w"><a class="b" href="/">Nimtto</a><h1>Sitemap</h1><p>Every public page on nimtto.com. For search engines: <a href="/sitemap.xml">sitemap.xml</a>.</p>${sections}</div></body></html>` };
      }
      res.set('Cache-Control', 'public, max-age=600');
      res.type('html').send(cache.html);
    } catch (err) { next(err); }
  };
}
