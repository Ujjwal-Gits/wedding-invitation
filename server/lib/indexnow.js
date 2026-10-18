// IndexNow (https://www.indexnow.org/documentation): tells Bing, Yandex, Seznam and Naver that public pages changed,
// so they recrawl in minutes, not days (Bing's index also feeds Copilot and ChatGPT search). Google does not use it;
// Google reads the sitemaps (docs/SEO-SETUP.md).
//
// For other code (blog publish, the CMS saving page copy):
//   import { notifyChanged } from './indexnow.js';
//   notifyChanged(['/blog/my-post/', 'https://nimtto.com/blog/']);   // paths or absolute URLs; batched for 15 s
// It does nothing outside production, with INDEXNOW=0, or for private and foreign URLs, and never throws.
// Admin route: POST /api/admin/seo/indexnow { urls: [...] } or { all: true } (every sitemap URL).
// After a deploy the server also sends, once, every sitemap URL whose <lastmod> changed since the last send
// (submitChangedOnBoot; what was sent is kept in data/indexnow-sent.json).
// The key is public by design: https://nimtto.com/<key>.txt (public/<key>.txt) must hold exactly the key.
import { existsSync, readFileSync, promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { IS_PROD, PUBLIC_ORIGINS, DIST_DIR, DATA_DIR } from './env.js';
import { PRIVATE_PATH } from './security.js';

const DEFAULT_KEY = '30d1bc34d78e6e19e40a917412221df1';
export const INDEXNOW_KEY = /^[0-9a-f]{32}$/i.test(process.env.INDEXNOW_KEY || '') ? process.env.INDEXNOW_KEY.toLowerCase() : DEFAULT_KEY;
export const INDEXNOW_ENDPOINT = process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';
export const SITE_ORIGIN = PUBLIC_ORIGINS[0] || 'https://nimtto.com';
const MAX_URLS = 10_000; // per request (protocol limit)
const SENT_FILE = resolve(DATA_DIR, 'indexnow-sent.json');

/** True when pings really go out: production, a public https origin, not switched off. */
export function indexNowEnabled(origin = SITE_ORIGIN) {
  return IS_PROD && process.env.INDEXNOW !== '0' && /^https:\/\/(?!localhost|127\.)/.test(origin);
}

/** The URLs worth sending: absolute, on our origin, public (not /studio/, /api/, /i/ ...), no query, deduplicated. */
export function publicUrls(urls, origin = SITE_ORIGIN) {
  const out = new Set();
  for (const raw of [].concat(urls || [])) {
    if (typeof raw !== 'string' || raw.length > 2048) continue;
    let u;
    try { u = new URL(raw, `${origin}/`); } catch { continue; }
    if (u.origin !== origin || u.search || u.username || PRIVATE_PATH.test(u.pathname)) continue;
    u.hash = '';
    out.add(u.href);
    if (out.size >= MAX_URLS) break;
  }
  return [...out];
}

/** Sends URLs now. Resolves { ok, status?, sent, skipped? }; never rejects. `force` sends outside production too. */
export async function submitUrls(urls, { fetchImpl = globalThis.fetch, origin = SITE_ORIGIN, key = INDEXNOW_KEY, endpoint = INDEXNOW_ENDPOINT, force = false } = {}) {
  const list = publicUrls(urls, origin);
  if (!list.length) return { ok: true, sent: 0, skipped: 'no public URLs' };
  if (!force && !indexNowEnabled(origin)) return { ok: true, sent: 0, skipped: 'off (not production, or INDEXNOW=0)' };
  const body = { host: new URL(origin).host, key, keyLocation: `${origin}/${key}.txt`, urlList: list };
  try {
    const r = await fetchImpl(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
    });
    // 200 OK, 202 Accepted (key check pending); 400/403/422/429 are problems worth a log line
    return { ok: r.status === 200 || r.status === 202, status: r.status, sent: list.length };
  } catch (err) {
    return { ok: false, sent: 0, error: err.message };
  }
}

const pending = new Set();
let timer = null;
/** Queues changed URLs and sends them together after `delayMs` (one request per burst of edits). */
export function notifyChanged(urls, { delayMs = 15_000 } = {}) {
  if (!indexNowEnabled()) return;
  for (const u of publicUrls(urls)) pending.add(u);
  if (timer || !pending.size) return;
  timer = setTimeout(async () => {
    timer = null;
    const batch = [...pending];
    pending.clear();
    const r = await submitUrls(batch);
    if (!r.ok) console.warn(`[indexnow] ${batch.length} URL(s) not accepted:`, r.status ?? r.error);
  }, delayMs);
  timer.unref?.();
}

/** Every <loc> with its <lastmod> in the built sitemaps (the index and the files it lists): [{ url, lastmod }]. */
export function sitemapEntries(distDir = DIST_DIR) {
  const out = [];
  const seen = new Set();
  const read = (name) => {
    if (seen.has(name) || !/^sitemap[\w-]*\.xml$/.test(name)) return;
    seen.add(name);
    const file = resolve(distDir, name);
    if (!existsSync(file)) return;
    const xml = readFileSync(file, 'utf8');
    for (const [, loc] of xml.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/g)) read(new URL(loc).pathname.slice(1));
    for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
      const url = /<loc>([^<]+)<\/loc>/.exec(block)?.[1];
      if (url) out.push({ url, lastmod: /<lastmod>([^<]+)<\/lastmod>/.exec(block)?.[1] || '' });
    }
  };
  read('sitemap.xml');
  return out;
}

/** After a deploy: sends the sitemap URLs that are new or have a newer <lastmod> than when they were last sent. */
export async function submitChangedOnBoot({ distDir = DIST_DIR, sentFile = SENT_FILE, ...opts } = {}) {
  if (!opts.force && !indexNowEnabled(opts.origin)) return { ok: true, sent: 0, skipped: 'off' };
  let sent = {};
  try { sent = JSON.parse(await fs.readFile(sentFile, 'utf8')); } catch { /* first run */ }
  const changed = sitemapEntries(distDir).filter((e) => sent[e.url] !== e.lastmod);
  if (!changed.length) return { ok: true, sent: 0 };
  const r = await submitUrls(changed.map((e) => e.url), opts);
  if (r.ok) {
    for (const e of changed) sent[e.url] = e.lastmod;
    await fs.writeFile(sentFile, JSON.stringify(sent), { mode: 0o600 }).catch(() => {});
  }
  return r;
}

/** POST /api/admin/seo/indexnow { urls: string[] } | { all: true } */
export async function adminSubmit(req, res) {
  const body = req.body || {};
  const urls = body.all === true ? sitemapEntries().map((e) => e.url) : Array.isArray(body.urls) ? body.urls.slice(0, MAX_URLS) : [];
  if (!urls.length) return res.status(400).json({ error: 'Send { urls: [...] } or { all: true }.' });
  const r = await submitUrls(urls);
  return res.status(r.ok ? 200 : 502).json(r);
}
