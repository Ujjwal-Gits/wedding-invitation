// Search plumbing: robots.txt, the sitemap index and its files, crawl headers (X-Robots-Tag on private areas, caching
// of robots/sitemaps, Link preloads) and IndexNow. Run: npm test (in server/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

process.env.DATA_ROOT ||= mkdtempSync(join(tmpdir(), 'nimtto-seo-'));

const { securityHeaders, PRIVATE_PATH } = await import('../lib/security.js');
const { cacheControlFor, preloadLinks } = await import('../lib/static.js');
const { INDEXNOW_KEY, publicUrls, submitUrls, sitemapEntries, submitChangedOnBoot } = await import('../lib/indexnow.js');

const PUBLIC = resolve(import.meta.dirname, '..', '..', 'public');
const PRIVATE = ['/api/', '/studio/', '/pay/', '/clients/', '/i/', '/preview/'];

/** robots.txt groups: [{ agents: [...], rules: [[directive, value]] }] */
function robotsGroups(txt) {
  const groups = [];
  let cur = null;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const [k, ...v] = line.split(':');
    const key = k.trim().toLowerCase();
    const val = v.join(':').trim();
    if (key === 'user-agent') {
      if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
    } else if (key === 'allow' || key === 'disallow') cur.rules.push([key, val]);
  }
  return groups;
}

test('robots.txt: private areas closed for every agent group, public site and assets open, sitemap named', () => {
  const txt = readFileSync(resolve(PUBLIC, 'robots.txt'), 'utf8');
  assert.match(txt, /^Sitemap: https:\/\/nimtto\.com\/sitemap\.xml$/m);
  const groups = robotsGroups(txt);
  const star = groups.find((g) => g.agents.includes('*'));
  assert.ok(star, 'a * group');
  for (const ai of ['gptbot', 'oai-searchbot', 'claudebot', 'perplexitybot', 'google-extended']) assert.ok(groups.some((g) => g.agents.includes(ai)), ai);
  for (const g of groups) {
    const dis = g.rules.filter(([k]) => k === 'disallow').map(([, v]) => v);
    for (const p of PRIVATE.filter((x) => x !== '/i/')) assert.ok(dis.includes(p), `${g.agents[0]} blocks ${p}`);
    // nothing public is blocked: no bare "Disallow: /", no assets, CSS, JS or pictures
    for (const v of dis) assert.ok(v !== '/' && !/^\/(assets|site|themes|photos|art|designs|international)\b/.test(v), `${g.agents[0]} must not block ${v}`);
  }
  // search engines and AI agents also stay out of guests' link previews (/i/); only link-preview bots may read them
  for (const g of groups.filter((x) => x.agents.includes('*') || x.agents.includes('gptbot'))) assert.ok(g.rules.some(([k, v]) => k === 'disallow' && v === '/i/'));
});

test('sitemap.xml is an index of existing files; every URL is public, absolute, dated and listed once', () => {
  const index = readFileSync(resolve(PUBLIC, 'sitemap.xml'), 'utf8');
  assert.match(index, /<sitemapindex xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  const files = [...index.matchAll(/<loc>https:\/\/nimtto\.com\/(sitemap-[a-z0-9-]+\.xml)<\/loc>/g)].map((m) => m[1]);
  for (const f of ['sitemap-pages-np.xml', 'sitemap-pages-intl.xml', 'sitemap-designs.xml', 'sitemap-images.xml']) assert.ok(files.includes(f), f);
  // every sitemap-*.xml in public/ is in the index (the blog's too, once it writes one)
  assert.deepEqual(readdirSync(PUBLIC).filter((f) => /^sitemap-.+\.xml$/.test(f)).sort(), [...files].sort());
  const pages = new Set();
  for (const f of files) {
    const xml = readFileSync(resolve(PUBLIC, f), 'utf8');
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    const seen = new Set();
    for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
      const loc = /<loc>([^<]+)<\/loc>/.exec(block)[1];
      const path = new URL(loc).pathname;
      assert.ok(loc.startsWith('https://nimtto.com/') && loc.endsWith('/'), `${f}: ${loc}`);
      assert.ok(!PRIVATE_PATH.test(path), `${f}: private ${loc}`);
      assert.match(block, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, `${f}: lastmod for ${loc}`);
      assert.ok(!seen.has(loc), `${f}: ${loc} twice`);
      seen.add(loc);
      if (f !== 'sitemap-images.xml') { assert.ok(!pages.has(loc), `${loc} in two page sitemaps`); pages.add(loc); }
      for (const [, img] of block.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)) assert.ok(existsSync(resolve(PUBLIC, decodeURIComponent(new URL(img).pathname).slice(1))), `image ${img}`);
    }
  }
  assert.ok(pages.has('https://nimtto.com/') && pages.has('https://nimtto.com/international/') && pages.has('https://nimtto.com/about/'));
  // the design pages behind the gate (/<theme>/) are never listed
  assert.ok(![...pages].some((u) => /^https:\/\/nimtto\.com\/(kham|mala|olive-grove)\//.test(u)));
});

test('caching: hashed assets a year, pages revalidate, robots and sitemaps an hour', () => {
  assert.equal(cacheControlFor('assets/site-abc123.js'), 'public, max-age=31536000, immutable');
  assert.equal(cacheControlFor('index.html'), 'no-cache');
  assert.equal(cacheControlFor('about/index.html'), 'no-cache');
  for (const f of ['robots.txt', 'sitemap.xml', 'sitemap-pages-np.xml', 'sitemap-blog.xml', 'llms.txt', `${INDEXNOW_KEY}.txt`]) assert.equal(cacheControlFor(f), 'public, max-age=3600', f);
});

test('X-Robots-Tag: noindex on private areas only', () => {
  const run = (path) => {
    const h = {};
    securityHeaders({ path }, { setHeader: (k, v) => { h[k.toLowerCase()] = v; } }, () => {});
    return h['x-robots-tag'];
  };
  for (const p of ['/api/site', '/studio/', '/studio/orders/NM-12345', '/pay/NM-12345', '/i/asha-ravi', '/preview/kham', '/uploads/a/b.webp', '/go']) assert.match(run(p) || '', /noindex/, p);
  for (const p of ['/', '/designs/', '/international/pricing/', '/about/', '/gold-arch/', '/goals/', '/sitemap.xml']) assert.equal(run(p), undefined, p);
});

test('Link header: the page\'s own preloads, local only', () => {
  const html = `<html><head><link rel="preload" as="image" href="/site/stills/laali-480.webp" imagesrcset="/a-480.webp 480w, /a-800.webp 800w" imagesizes="(max-width: 599px) 41vw, 340px" fetchpriority="high" />
    <link rel="preload" href="/site/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="https://evil.example/x.js" as="script" /><link rel="stylesheet" href="/x.css"></head><body><link rel="preload" href="/late.png" as="image"></body></html>`;
  const l = preloadLinks(html);
  assert.equal(l, '</site/stills/laali-480.webp>; rel=preload; as=image; imagesrcset="/a-480.webp 480w, /a-800.webp 800w"; imagesizes="(max-width: 599px) 41vw, 340px"; fetchpriority=high, </site/fonts/geist-latin.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin');
  assert.equal(preloadLinks('<html><head></head></html>'), '');
});

test('IndexNow: the key file is public, only public URLs of our site are sent, in the protocol\'s shape', async () => {
  assert.match(INDEXNOW_KEY, /^[0-9a-f]{32}$/);
  assert.equal(readFileSync(resolve(PUBLIC, `${INDEXNOW_KEY}.txt`), 'utf8').trim(), INDEXNOW_KEY);
  const origin = 'https://nimtto.com';
  assert.deepEqual(publicUrls(['/about/', 'https://nimtto.com/designs/kham/#x', '/studio/', '/api/site', '/i/abc', 'https://evil.example/', '/pricing/?plan=x', '/about/', 42], origin),
    ['https://nimtto.com/about/', 'https://nimtto.com/designs/kham/']);
  let sent = null;
  const fetchImpl = async (url, opts) => { sent = { url, ...opts, json: JSON.parse(opts.body) }; return { status: 202 }; };
  // outside production nothing goes out unless forced
  assert.equal((await submitUrls(['/about/'], { fetchImpl, origin })).sent, 0);
  assert.equal(sent, null);
  const r = await submitUrls(['/about/', '/studio/'], { fetchImpl, origin, force: true, endpoint: 'https://api.indexnow.org/indexnow' });
  assert.deepEqual(r, { ok: true, status: 202, sent: 1 });
  assert.equal(sent.url, 'https://api.indexnow.org/indexnow');
  assert.equal(sent.method, 'POST');
  assert.deepEqual(sent.json, { host: 'nimtto.com', key: INDEXNOW_KEY, keyLocation: `https://nimtto.com/${INDEXNOW_KEY}.txt`, urlList: ['https://nimtto.com/about/'] });
  // a failed request is reported, never thrown
  const bad = await submitUrls(['/about/'], { fetchImpl: async () => { throw new Error('offline'); }, origin, force: true });
  assert.equal(bad.ok, false);
});

test('IndexNow after a deploy: only new or re-dated sitemap URLs are sent, once', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nimtto-seo-dist-'));
  const sentFile = join(dir, 'sent.json');
  const write = (lastmod) => {
    writeFileSync(join(dir, 'sitemap.xml'), '<sitemapindex><sitemap><loc>https://nimtto.com/sitemap-pages-np.xml</loc></sitemap></sitemapindex>');
    writeFileSync(join(dir, 'sitemap-pages-np.xml'), `<urlset><url><loc>https://nimtto.com/</loc><lastmod>2026-10-01</lastmod></url><url><loc>https://nimtto.com/about/</loc><lastmod>${lastmod}</lastmod></url></urlset>`);
  };
  write('2026-10-01');
  assert.equal(sitemapEntries(dir).length, 2);
  const lists = [];
  const fetchImpl = async (u, o) => { lists.push(JSON.parse(o.body).urlList); return { status: 200 }; };
  const opts = { distDir: dir, sentFile, fetchImpl, origin: 'https://nimtto.com', force: true };
  assert.equal((await submitChangedOnBoot(opts)).sent, 2);
  assert.equal((await submitChangedOnBoot(opts)).sent, 0); // nothing changed
  write('2026-10-18');
  assert.equal((await submitChangedOnBoot(opts)).sent, 1);
  assert.deepEqual(lists[1], ['https://nimtto.com/about/']);
});
