// A crawl of the built site (dist/) the way the production server answers it (server/index.js, lib/gate.js,
// lib/static.js): every page reachable from the two home pages and the sitemaps, checked for status, canonical,
// titles and descriptions, H1 and heading order, internal links, orphans, redirects, robots, images, JSON-LD and
// page weight. No dependencies; run after `npm run build`:
//   node scripts/seo-crawl.mjs            a summary, exit 1 when an error-level problem is found
//   node scripts/seo-crawl.mjs --json     every page's findings as JSON (for docs/SEO-AUDIT.md)
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { validateLd } from './seo-ld-check.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');
const ORIGIN = 'https://nimtto.com';
if (!existsSync(resolve(DIST, 'index.html'))) { console.error('seo-crawl: build first (npm run build)'); process.exit(2); }

// The gate's open pages (lib/gate.js OPEN_PAGES): every other top-level folder with an index.html is a design page.
const gateSrc = readFileSync(resolve(ROOT, 'server', 'lib', 'gate.js'), 'utf8');
const OPEN = new Set(JSON.parse(`[${/const OPEN_PAGES = new Set\(\[([^\]]*)\]/.exec(gateSrc)[1].replace(/'/g, '"')}]`));
const GATED = new Set(readdirSync(DIST, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !OPEN.has(d.name) && existsSync(resolve(DIST, d.name, 'index.html'))).map((d) => d.name));
// Private paths: never crawled, never in a sitemap, disallowed in robots.txt.
const PRIVATE = [/^\/studio\//, /^\/api\//, /^\/pay\//, /^\/i\//, /^\/preview\//, /^\/clients\//, /^\/go$/, /^\/uploads\//];

/** What the server sends for a path: { status, file?, location? } */
function resolvePath(path) {
  if (PRIVATE.some((r) => r.test(path))) return { status: 'private' };
  const seg = path.split('/')[1];
  if (GATED.has(seg)) return { status: 302, location: '/#designs' };
  const rel = path.replace(/^\/+/, '');
  const abs = resolve(DIST, rel);
  if (path.endsWith('/')) return existsSync(resolve(abs, 'index.html')) ? { status: 200, file: resolve(abs, 'index.html') } : { status: 404 };
  if (existsSync(abs) && statSync(abs).isFile()) return { status: 200, file: abs };
  if (existsSync(abs) && statSync(abs).isDirectory()) return { status: 301, location: `${path}/` };
  return { status: 404 };
}

const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? (m[2] ?? m[3] ?? m[4]) : null;
};
const decode = (s) => String(s ?? '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const text = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const size = (p) => { try { return statSync(p).size; } catch { return 0; } };

function analyse(path, html) {
  const noComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const body = noComments.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const headPart = (/<head\b[\s\S]*?<\/head>/i.exec(noComments) || [''])[0];
  const metas = [...headPart.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const links = [...headPart.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const metaName = (n) => { const t = metas.find((x) => (attr(x, 'name') || '').toLowerCase() === n); return t ? decode(attr(t, 'content')) : null; };
  const p = {
    path,
    lang: attr((/<html\b[^>]*>/i.exec(html) || [''])[0], 'lang'),
    title: (() => { const m = /<title>([\s\S]*?)<\/title>/i.exec(headPart); return m ? decode(m[1]).trim() : null; })(),
    desc: metaName('description'),
    robots: metaName('robots'),
    canonical: (() => { const l = links.filter((x) => /rel\s*=\s*["']?canonical/i.test(x)); return l.length ? l.map((x) => attr(x, 'href')) : []; })(),
    hreflang: links.filter((x) => /rel\s*=\s*["']?alternate/i.test(x) && attr(x, 'hreflang')).map((x) => [attr(x, 'hreflang'), attr(x, 'href')]),
    preloads: links.filter((x) => /rel\s*=\s*["']?preload/i.test(x)).map((x) => [attr(x, 'as'), attr(x, 'href')]),
    headings: [...body.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => [Number(m[1]), text(m[2])]),
    anchors: [...body.matchAll(/<a\b[^>]*>/gi)].map((m) => attr(m[0], 'href')).filter((h) => h != null),
    imgs: [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => ({ src: attr(m[0], 'src'), alt: attr(m[0], 'alt'), w: attr(m[0], 'width'), h: attr(m[0], 'height'), lazy: attr(m[0], 'loading'), pri: attr(m[0], 'fetchpriority') })),
    ld: [...noComments.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]),
    og: Object.fromEntries(metas.filter((x) => /property\s*=\s*["']og:/i.test(x)).map((x) => [attr(x, 'property'), decode(attr(x, 'content'))])),
    scripts: [...noComments.matchAll(/<script\b[^>]*\ssrc\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]),
    css: links.filter((x) => /rel\s*=\s*["']?(stylesheet|modulepreload)/i.test(x)).map((x) => attr(x, 'href')),
    words: text(body.replace(/<(nav|header|footer|dialog)\b[\s\S]*?<\/\1>/gi, '')).split(' ').filter(Boolean).length,
  };
  // the HTML plus its own code and styles (what loads before the page is usable), images not counted
  const local = (u) => (u && u.startsWith('/') && !u.startsWith('//') ? size(resolve(DIST, u.split(/[?#]/)[0].replace(/^\/+/, ''))) : 0);
  p.weight = { html: Buffer.byteLength(html), code: [...p.scripts, ...p.css].reduce((n, u) => n + local(u), 0) };
  return p;
}

function issues(p, dupTitle, dupDesc) {
  const out = [];
  const add = (level, code, msg) => out.push({ level, code, msg });
  const self = `${ORIGIN}${p.path}`;
  if (!p.title) add('error', 'title-missing', 'no <title>');
  else if (p.title.length > 60) add('warn', 'title-long', `title ${p.title.length} chars`);
  if (!p.desc) add('error', 'desc-missing', 'no meta description');
  else if (p.desc.length > 160) add('warn', 'desc-long', `description ${p.desc.length} chars`);
  if (dupTitle.get(p.title)?.length > 1) add('error', 'title-dup', `same title as ${dupTitle.get(p.title).filter((x) => x !== p.path).join(', ')}`);
  if (p.desc && dupDesc.get(p.desc)?.length > 1) add('error', 'desc-dup', `same description as ${dupDesc.get(p.desc).filter((x) => x !== p.path).join(', ')}`);
  if (p.canonical.length !== 1) add('error', 'canonical-count', `${p.canonical.length} canonical tags`);
  else if (p.canonical[0] !== self) add('error', 'canonical-not-self', `canonical ${p.canonical[0]}`);
  if (p.robots && /noindex/i.test(p.robots)) add('error', 'noindex', `robots ${p.robots}`);
  if (!p.lang) add('error', 'lang-missing', 'no <html lang>');
  const h1 = p.headings.filter(([l]) => l === 1);
  if (h1.length === 0) add('error', 'h1-missing', 'no H1');
  if (h1.length > 1) add('warn', 'h1-multiple', `${h1.length} H1s`);
  let prev = 0;
  for (const [l, t] of p.headings) { if (prev && l > prev + 1) { add('warn', 'heading-skip', `H${prev} -> H${l} ("${t.slice(0, 40)}")`); break; } prev = l; }
  const noAlt = p.imgs.filter((i) => i.alt == null);
  if (noAlt.length) add('error', 'img-alt-missing', `${noAlt.length} img without alt: ${noAlt.slice(0, 3).map((i) => i.src).join(', ')}`);
  const noDim = p.imgs.filter((i) => !i.w || !i.h);
  if (noDim.length) add('warn', 'img-no-dimensions', `${noDim.length} img without width/height: ${noDim.slice(0, 3).map((i) => i.src).join(', ')}`);
  if (!p.og['og:image']) add('warn', 'og-image-missing', 'no og:image');
  else if (p.og['og:image'].startsWith(ORIGIN) && !existsSync(resolve(DIST, p.og['og:image'].slice(ORIGIN.length + 1)))) add('error', 'og-image-404', p.og['og:image']);
  if (p.og['og:url'] && p.og['og:url'] !== self) add('warn', 'og-url', `og:url ${p.og['og:url']}`);
  for (const [hl, href] of p.hreflang) if (!href?.startsWith(ORIGIN)) add('error', 'hreflang-href', `${hl} ${href}`);
  if (p.ld.length === 0) add('warn', 'ld-missing', 'no JSON-LD');
  let faqPages = 0;
  for (const raw of p.ld) {
    let o;
    try { o = JSON.parse(raw); } catch (e) { add('error', 'ld-parse', e.message); continue; }
    faqPages += (JSON.stringify(o).match(/"@type":"FAQPage"/g) || []).length;
    for (const pr of validateLd(o)) add(pr.level, 'ld-' + pr.code, pr.msg);
  }
  if (faqPages > 1) add('error', 'ld-faq-twice', `${faqPages} FAQPage blocks (Google allows one per page)`);
  // the site's language: en-NP on the Nepal site, en-US on /international/, en on the shared legal pages
  const want = p.path.startsWith('/international/') ? 'en-US' : /^\/(terms|privacy|refunds)\//.test(p.path) ? 'en' : 'en-NP';
  if (p.lang && p.lang !== want) add('warn', 'lang-site', `<html lang="${p.lang}">, expected ${want}`);
  if (p.hreflang.length) {
    if (!p.hreflang.some(([, h]) => h === self)) add('error', 'hreflang-self', 'hreflang set without a link to itself');
    if (!p.hreflang.some(([l]) => l === 'x-default')) add('warn', 'hreflang-x-default', 'no x-default');
  }
  const kb = (p.weight.html + p.weight.code) / 1024;
  if (kb > 600) add('warn', 'weight', `${Math.round(kb)} KB html+code`);
  if (p.words < 150 && !/^\/(terms|privacy|refunds|credits)\//.test(p.path)) add('warn', 'thin', `${p.words} words in main content`);
  return out;
}

/* ---------------- crawl ---------------- */
const seeds = new Set(['/', '/international/']);
const sitemapUrls = new Map(); // path -> sitemap file
const sitemapProblems = [];
function readSitemap(rel) {
  const f = resolve(DIST, rel);
  if (!existsSync(f)) { sitemapProblems.push(`${rel}: missing`); return; }
  const xml = readFileSync(f, 'utf8');
  if (/<sitemapindex/.test(xml)) { for (const m of xml.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/g)) readSitemap(new URL(m[1]).pathname.slice(1)); return; }
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = /<loc>([^<]+)<\/loc>/.exec(m[1])?.[1];
    if (!loc) continue;
    const u = new URL(loc);
    if (u.origin !== ORIGIN) sitemapProblems.push(`${rel}: foreign url ${loc}`);
    if (!/<lastmod>\d{4}-\d{2}-\d{2}/.test(m[1])) sitemapProblems.push(`${rel}: no lastmod for ${loc}`);
    for (const im of m[1].matchAll(/<image:loc>([^<]+)<\/image:loc>/g)) {
      const ip = new URL(im[1]).pathname;
      if (!existsSync(resolve(DIST, decodeURIComponent(ip).slice(1)))) sitemapProblems.push(`${rel}: image 404 ${ip}`);
    }
    sitemapUrls.set(u.pathname, rel);
    seeds.add(u.pathname);
  }
}
readSitemap('sitemap.xml');

const pages = new Map(); // path -> analysis
const inbound = new Map(); // path -> Set(from)
const responses = new Map(); // path -> resolvePath result
const queue = [...seeds];
const broken = [];
const redirects = [];
let showcaseLinks = 0;
while (queue.length) {
  const path = queue.shift();
  if (responses.has(path)) continue;
  const r = resolvePath(path);
  responses.set(path, r);
  if (r.status === 301 || r.status === 302) { redirects.push([path, r.status, r.location]); if (!responses.has(r.location.split('#')[0])) queue.push(r.location.split('#')[0]); continue; }
  if (r.status !== 200 || !r.file || extname(r.file) !== '.html') continue;
  const p = analyse(path, readFileSync(r.file, 'utf8'));
  pages.set(path, p);
  for (const raw of p.anchors) {
    if (/^(mailto:|tel:|https?:\/\/(?!nimtto\.com)|#|javascript:|sms:|whatsapp:)/i.test(raw)) continue;
    let u;
    try { u = new URL(decode(raw), `${ORIGIN}${path}`); } catch { broken.push([path, raw, 'bad url']); continue; }
    if (u.origin !== ORIGIN) continue;
    const t = u.pathname;
    // /<design>/?showcase=1: the watermarked preview (server/lib/showcase.js), noindex by header; not a page to crawl
    if (u.searchParams.has('showcase') && GATED.has(t.split('/')[1])) { showcaseLinks += 1; continue; }
    if (!inbound.has(t)) inbound.set(t, new Set());
    inbound.get(t).add(path);
    const tr = resolvePath(t);
    if (tr.status === 404) broken.push([path, raw, '404']);
    if (!responses.has(t) && tr.status !== 'private') queue.push(t);
  }
}

const dupTitle = new Map(), dupDesc = new Map();
for (const p of pages.values()) {
  if (p.title) dupTitle.set(p.title, [...(dupTitle.get(p.title) || []), p.path]);
  if (p.desc) dupDesc.set(p.desc, [...(dupDesc.get(p.desc) || []), p.path]);
}
const report = [];
for (const p of pages.values()) {
  const list = issues(p, dupTitle, dupDesc);
  if (!sitemapUrls.has(p.path)) list.push({ level: 'warn', code: 'not-in-sitemap', msg: 'indexable page missing from the sitemaps' });
  // hreflang must be reciprocal: every page named links back to this one
  for (const [hl, href] of p.hreflang) {
    const other = pages.get(new URL(href).pathname);
    if (!other) list.push({ level: 'error', code: 'hreflang-target', msg: `${hl} -> ${href} not crawled` });
    else if (!other.hreflang.some(([, h]) => h === `${ORIGIN}${p.path}`)) list.push({ level: 'error', code: 'hreflang-return', msg: `${href} does not link back` });
  }
  const from = [...(inbound.get(p.path) || [])].filter((x) => x !== p.path);
  if (!from.length && p.path !== '/') list.push({ level: 'warn', code: 'orphan', msg: 'no internal link points here' });
  report.push({ path: p.path, lang: p.lang, title: p.title, inbound: from.length, weightKB: Math.round((p.weight.html + p.weight.code) / 1024), words: p.words, issues: list });
}
for (const [path, rel] of sitemapUrls) {
  const r = responses.get(path);
  if (!r || r.status !== 200) sitemapProblems.push(`${rel}: ${path} answers ${r?.status ?? 'not crawled'}`);
}
for (const [from, , to] of redirects) if (responses.get(to.split('#')[0])?.status === 301) sitemapProblems.push(`redirect chain ${from} -> ${to}`);
const linkedRedirects = redirects.filter(([p]) => inbound.has(p)).map(([p, s, l]) => ({ path: p, status: s, to: l, from: [...inbound.get(p)].slice(0, 3) }));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ pages: report, broken, redirects: linkedRedirects, sitemapProblems }, null, 1));
} else {
  const counts = {};
  for (const r of report) for (const i of r.issues) counts[`${i.level} ${i.code}`] = (counts[`${i.level} ${i.code}`] || 0) + 1;
  console.log(`pages crawled: ${report.length}; sitemap urls: ${sitemapUrls.size}; broken links: ${broken.length}; linked redirects: ${linkedRedirects.length}; showcase preview links (noindex): ${showcaseLinks}; sitemap problems: ${sitemapProblems.length}`);
  for (const [k, n] of Object.entries(counts).sort()) console.log(`  ${k}: ${n}`);
  for (const b of broken.slice(0, 20)) console.log(`  broken: ${b.join(' | ')}`);
  for (const r of linkedRedirects.slice(0, 20)) console.log(`  redirect: ${r.path} ${r.status} -> ${r.to} (from ${r.from.join(', ')})`);
  for (const s of sitemapProblems.slice(0, 20)) console.log(`  sitemap: ${s}`);
  if (process.argv.includes('--verbose')) for (const r of report) for (const i of r.issues) console.log(`  ${r.path} ${i.level} ${i.code}: ${i.msg}`);
  const errors = report.reduce((n, r) => n + r.issues.filter((i) => i.level === 'error').length, 0) + broken.length + sitemapProblems.length;
  console.log(errors ? `${errors} error(s)` : 'no errors');
  process.exitCode = errors ? 1 : 0;
}
