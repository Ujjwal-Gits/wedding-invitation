// The blog of both websites: posts in the store (one small document, `blog`), edited in the studio's Blog module, and
// served as SERVER-RENDERED pages (lib/blog-render.js) so search engines read every word without JavaScript.
//   Public:  GET /blog/, /blog/<slug>/, /blog/rss.xml, the same under /international/blog/, /sitemap-blog.xml, and
//            /llms.txt + /llms-full.txt with the live blog part (the build writes the rest).
//   Admin:   /api/admin/blog (perm 'content', the same as the Content page; CSRF via requirePerm): list, read, create, update, delete, preview, cover upload.
// A post: { id, slug, site: 'np'|'intl', title, excerpt, category, body (Markdown), faq: [{ q, a }], cover, og,
//   seoTitle, seoDesc, keyword, secondary, designs, related, status: 'draft'|'published', publishedAt (YYYY-MM-DD),
//   schemaType: 'BlogPosting'|'Article'|'HowTo', speakable (false leaves it out), updatedAt, createdAt, builtin? }.
// The body stays Markdown: the studio's visual editor (src/studio/blog-editor.js) turns its document into Markdown
// (src/studio/blog-md-out.js), and opens a post from the HTML this server renders, so old and new posts are one format.
// The built-in posts (src/blog/posts/<site>/<slug>.md) are copied into the store the first time (and any new one later),
// so the owner edits them like any other; a built-in the owner deleted stays deleted (doc.seeds remembers it).
import express from 'express';
import sharp from 'sharp';
import { readdirSync, readFileSync, existsSync, promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { getDoc, putDoc, withLock } from './store.js';
import { ROOT_DIR, UPLOAD_DIR } from './env.js';
import { readMultipart, receiving, withSlot, MAX_BYTES } from './uploads.js';
import { plainText, renderMarkdown } from './blog-md.js';
import { entity, sendEntity } from './http-cache.js';
import { preloadLinks } from './static.js';
import { readSite } from './site.js';
import { contentOf, viewFor } from './content.js';
import { applyContent } from './content-render.js';
import { notifyChanged } from './indexnow.js';
import { THEMES } from '../../src/site/themes.js';
import { INTL_THEMES, NP_DESIGNS_INTL } from '../../src/site/intl-designs.js';
import {
  SITES, compilePost, renderIndex, renderPost, renderNotFound, renderRss, renderSitemap, llmsBlock, LLMS_START, LLMS_END,
  shellFor, designExists, postPath, catSlug, postSchema, schemaChecks, SCHEMA_TYPES,
} from './blog-render.js';

const KEY = 'blog';
export const SEED_DIR = resolve(ROOT_DIR, 'src', 'blog', 'posts');
export const BLOG_UPLOADS = resolve(UPLOAD_DIR, '_site', 'blog');
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+){0,12}$/;
const ID_RE = /^[A-Za-z0-9_-]{8,24}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const COVER_RE = /^\/uploads\/_site\/blog\/[A-Za-z0-9_-]{24}-1600\.webp$/;
/** a built-in feature image: its base path (the files are <base>-2400|1600|800.webp, src/site/make-blog.mjs) */
const IMAGE_RE = /^\/site\/blog\/[a-z0-9-]{2,90}-v\d{1,3}$/;
const OG_RE = /^\/(?:site\/og\/[a-z0-9-]{2,80}\.jpg|uploads\/_site\/blog\/[A-Za-z0-9_-]{24}-og\.jpg)$/;
export const CATEGORIES = {
  np: ['Wording', 'Ceremonies', 'Planning', 'Etiquette', 'Families abroad'],
  intl: ['Etiquette', 'Wording', 'Planning', 'RSVP', 'Culture'],
};
export const LIMITS = { title: 140, slug: 80, excerpt: 300, category: 40, body: 120_000, faq: 12, q: 240, a: 1500, seoTitle: 80, seoDesc: 200, keyword: 100, alt: 200, caption: 240 };

/** the designs a post may show, per website (the international blog may also show the Nepal designs it offers) */
const DESIGN_LISTS = {
  np: THEMES.map((t) => ({ slug: t.slug, name: t.name })),
  intl: [...INTL_THEMES.map((d) => ({ slug: d.slug, name: d.name })), ...NP_DESIGNS_INTL.map((s) => ({ slug: s, name: `${THEMES.find((t) => t.slug === s)?.name || s} (Nepali)` }))],
};
const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const newId = () => randomBytes(9).toString('base64url');
const today = () => new Date().toISOString().slice(0, 10);
/** one line of text: control characters out, spaces folded, trimmed, at most n characters */
const line = (v, n) => String(v ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
/** Markdown: control characters out except new lines and tabs, Windows line ends folded */
const text = (v, n) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, n);
const validDay = (d) => DAY_RE.test(d) && !Number.isNaN(new Date(`${d}T00:00:00Z`).getTime());

/**
 * A post from untrusted input (the studio, or a seed file), cleaned. Throws 400 with `errors` for what must be fixed.
 * `prev`: the stored post (keeps id, createdAt, builtin).
 */
export function cleanPost(input, prev = null) {
  const x = input && typeof input === 'object' ? input : {};
  const errors = {};
  const site = x.site === 'intl' ? 'intl' : x.site === 'np' ? 'np' : null;
  if (!site) errors.site = 'Choose the website: Nepal or International.';
  const title = line(x.title, LIMITS.title);
  if (!title) errors.title = 'Write a title.';
  const slug = line(x.slug, LIMITS.slug).toLowerCase();
  if (!SLUG_RE.test(slug)) errors.slug = 'The link name: lower-case letters, numbers and hyphens only (e.g. pasni-invitation-guide).';
  const category = line(x.category, LIMITS.category);
  if (!category) errors.category = 'Choose a category.';
  const status = x.status === 'published' ? 'published' : 'draft';
  const publishedAt = validDay(String(x.publishedAt || '')) ? String(x.publishedAt) : today();
  const faq = (Array.isArray(x.faq) ? x.faq : []).slice(0, LIMITS.faq)
    .map((f) => ({ q: line(f?.q, LIMITS.q), a: text(f?.a, LIMITS.a).trim() })).filter((f) => f.q || f.a);
  if (faq.some((f) => !f.q || !f.a)) errors.faq = 'Every question needs an answer (or remove it).';
  const list = (v, n, re) => [...new Set((Array.isArray(v) ? v : []).map((s) => line(s, 80).toLowerCase()).filter((s) => re.test(s)))].slice(0, n);
  const designs = site ? list(x.designs, 6, SLUG_RE).filter((s) => designExists(site, s)) : [];
  const related = list(x.related, 6, SLUG_RE).filter((s) => s !== slug);
  // the cover: a design's still, a sample card (built-in posts) or an uploaded photo
  const c = x.cover && typeof x.cover === 'object' ? x.cover : {};
  let cover = { type: 'none' };
  if (c.type === 'design' && site && designExists(site, line(c.design, 40))) cover = { type: 'design', design: line(c.design, 40) };
  else if (c.type === 'photo' && COVER_RE.test(String(c.src || ''))) cover = { type: 'photo', src: String(c.src) };
  else if (c.type === 'image' && IMAGE_RE.test(String(c.src || ''))) cover = { type: 'image', src: String(c.src) };
  else if (c.type === 'mock' && c.mock && typeof c.mock === 'object') cover = { type: 'mock', mock: Object.fromEntries(['ne', 'kick', 'name', 'when', 'where'].map((k) => [k, line(c.mock[k], 60)])) };
  cover.alt = line(c.alt, LIMITS.alt);
  cover.caption = line(c.caption, LIMITS.caption);
  const og = OG_RE.test(String(x.og || '')) ? String(x.og) : null;
  if (Object.keys(errors).length) throw httpError(400, Object.values(errors)[0], { errors });
  return {
    id: prev?.id || (ID_RE.test(String(x.id || '')) ? String(x.id) : newId()),
    slug, site, title, category, status, publishedAt,
    excerpt: line(x.excerpt, LIMITS.excerpt),
    body: text(x.body, LIMITS.body),
    faq, designs, related, cover, og,
    seoTitle: line(x.seoTitle, LIMITS.seoTitle),
    seoDesc: line(x.seoDesc, LIMITS.seoDesc),
    keyword: line(x.keyword, LIMITS.keyword),
    schemaType: SCHEMA_TYPES.includes(x.schemaType) ? x.schemaType : 'BlogPosting',
    speakable: x.speakable !== false,
    secondary: (Array.isArray(x.secondary) ? x.secondary : []).map((s) => line(s, LIMITS.keyword)).filter(Boolean).slice(0, 8),
    updatedAt: validDay(String(x.updatedAt || '').slice(0, 10)) && !prev ? String(x.updatedAt).slice(0, 10) : today(),
    createdAt: prev?.createdAt || new Date().toISOString(),
    ...(prev?.builtin || x.builtin ? { builtin: true } : {}),
  };
}

/* ---------------- the built-in posts ---------------- */
/** { key: 'np/<slug>', post } for every src/blog/posts/<site>/<slug>.md (JSON frontmatter between --- lines). */
export function loadSeeds(dir = SEED_DIR) {
  const out = [];
  for (const site of ['np', 'intl']) {
    const d = resolve(dir, site);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).filter((n) => /^[a-z0-9-]+\.md$/.test(n)).sort()) {
      const raw = readFileSync(resolve(d, f), 'utf8').replace(/^﻿/, '');
      const m = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/.exec(raw.replace(/\r\n?/g, '\n'));
      if (!m) { console.warn(`[blog] ${site}/${f}: no frontmatter, skipped`); continue; }
      let meta;
      try { meta = JSON.parse(m[1]); } catch (err) { console.warn(`[blog] ${site}/${f}: bad frontmatter (${err.message}), skipped`); continue; }
      try {
        const post = cleanPost({ ...meta, site, slug: meta.slug || f.slice(0, -3), body: m[2].trim(), status: meta.status || 'published', builtin: true, updatedAt: meta.updatedAt || meta.publishedAt });
        out.push({ key: `${site}/${post.slug}`, post });
      } catch (err) { console.warn(`[blog] ${site}/${f}: ${err.message}`); }
    }
  }
  return out;
}

/* ---------------- the store ---------------- */
let seedsOnce = null;
/**
 * The built-in posts' version. Bump it when the files in src/blog/posts change: on the next start every built-in post
 * the owner has NOT edited takes the new file's words and pictures; an edited one is never touched. "Not edited" means
 * the stored post still equals what was seeded: its `seedHash`, or (posts seeded before hashes were kept) one of the
 * earlier versions of its file listed in src/blog/posts/seed-history.json.
 */
export const SEED_VERSION = 2;
const SEED_HISTORY_FILE = resolve(SEED_DIR, 'seed-history.json');
let historyOnce = null;
const seedHistory = () => (historyOnce ??= existsSync(SEED_HISTORY_FILE) ? JSON.parse(readFileSync(SEED_HISTORY_FILE, 'utf8')) : {});
/** What a post says and shows (not its id, dates of storage or seed bookkeeping): the "was it edited?" fingerprint. */
const CONTENT_KEYS = ['slug', 'site', 'title', 'category', 'status', 'publishedAt', 'excerpt', 'body', 'faq', 'designs', 'related', 'cover', 'og', 'seoTitle', 'seoDesc', 'keyword', 'secondary'];
export const contentHash = (p) => createHash('sha1').update(JSON.stringify(CONTENT_KEYS.map((k) => p[k] ?? null))).digest('hex').slice(0, 20);

/** Applies the built-in posts to a blog document; returns true when it changed. */
export function syncSeeds(d, seeds, history = {}) {
  let changed = false;
  for (const s of seeds) {
    const fresh = contentHash(s.post);
    if (!d.seeds.includes(s.key)) {
      d.seeds.push(s.key);
      if (!d.posts.some((p) => p.site === s.post.site && p.slug === s.post.slug)) d.posts.push({ ...s.post, seedHash: fresh });
      changed = true;
      continue;
    }
    if (d.seedVersion === SEED_VERSION) continue;
    const i = d.posts.findIndex((p) => p.builtin && p.site === s.post.site && p.slug === s.post.slug);
    if (i < 0) continue; // deleted by the owner: stays deleted
    const p = d.posts[i];
    const h = contentHash(p);
    if (h === fresh) { if (p.seedHash !== fresh) { p.seedHash = fresh; changed = true; } continue; }
    const untouched = p.seedHash ? h === p.seedHash : (history[s.key] || []).includes(h);
    if (!untouched) continue; // the owner edited it: theirs
    d.posts[i] = { ...s.post, id: p.id, createdAt: p.createdAt, seedHash: fresh };
    changed = true;
  }
  if (d.seedVersion !== SEED_VERSION) { d.seedVersion = SEED_VERSION; changed = true; }
  return changed;
}

/** The blog document { v, seeds: [key], seedVersion, posts: [post] }, with the built-in posts applied (syncSeeds). */
async function readBlog() {
  const cur = await getDoc(KEY);
  const doc = cur?.value && Array.isArray(cur.value.posts) ? cur.value : { v: 1, seeds: [], posts: [] };
  seedsOnce ??= loadSeeds();
  const pending = !cur || doc.seedVersion !== SEED_VERSION || seedsOnce.some((s) => !doc.seeds.includes(s.key));
  if (!pending) return { doc, rev: cur.rev };
  return withLock(`kv:${KEY}:edit`, async () => {
    const again = await getDoc(KEY);
    const d = again?.value && Array.isArray(again.value.posts) ? structuredClone(again.value) : { v: 1, seeds: [], posts: [] };
    if (!syncSeeds(d, seedsOnce, seedHistory()) && again) return { doc: again.value, rev: again.rev };
    const rev = await putDoc(KEY, d);
    clearCaches();
    return { doc: d, rev };
  });
}
/** read-modify-write of the blog document; fn(doc) returns the response value */
async function mutate(fn) {
  await readBlog(); // seeds first
  return withLock(`kv:${KEY}:edit`, async () => {
    const cur = await getDoc(KEY);
    const doc = structuredClone(cur.value);
    const out = await fn(doc);
    await putDoc(KEY, doc);
    clearCaches();
    return out;
  });
}

/* ---------------- compiled posts and rendered pages, cached per store revision ---------------- */
const compiled = new Map(); // post id + updated stamp + body hash -> compiled
let pageCache = { rev: -1, pages: new Map() };
const clearCaches = () => { pageCache = { rev: -1, pages: new Map() }; };
const hash = (s) => createHash('sha1').update(s).digest('base64url').slice(0, 16);
function withC(p) {
  const k = `${p.id}|${hash(JSON.stringify([p.body, p.faq]))}`;
  let c = compiled.get(k);
  if (!c) {
    c = compilePost(p);
    compiled.set(k, c);
    if (compiled.size > 400) compiled.delete(compiled.keys().next().value);
  }
  return { ...p, c };
}
const byNewest = (a, b) => (b.publishedAt.localeCompare(a.publishedAt) || b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
/** a site's published posts, newest first; a post dated in the future waits for its day */
const live = (doc, site) => doc.posts.filter((p) => p.site === site && p.status === 'published' && p.publishedAt <= today()).sort(byNewest).map(withC);

/**
 * The site's shell for its blog pages with the Content page's site-wide words written in (contact, footer lines, the
 * announcement bar, the organisation JSON-LD: lib/content.js), exactly as every other built page gets them.
 */
function siteShell(distDir, site, contentDoc, siteDoc, day) {
  const shell = shellFor(distDir, site);
  try {
    const page = { path: SITES[site].base, site, hasH1: false, hasLede: false, faq: false };
    return applyContent(shell, { ...viewFor(page, contentOf(contentDoc), siteDoc, day), title: '', desc: '' });
  } catch (err) {
    console.warn('[blog] could not apply the site content to the shell:', err.message);
    return shell;
  }
}

/**
 * A rendered body, cached until the blog, the Content page, the website settings or the date (scheduled posts, the
 * announcement's days) change. make(doc, shell) returns a string or null (shell(site): the site's shell, filled).
 */
async function cachedPage(key, type, make, distDir) {
  const [{ doc, rev }, c, s] = await Promise.all([readBlog(), getDoc('content'), getDoc('site')]);
  const day = today();
  const stamp = `${rev}:${c?.rev ?? 0}:${s?.rev ?? 0}:${day}`;
  if (pageCache.rev !== stamp) pageCache = { rev: stamp, pages: new Map() };
  let e = pageCache.pages.get(key);
  if (e === undefined) {
    let siteDoc = null;
    const shell = async (site) => siteShell(distDir, site, c?.value, siteDoc ??= await readSite(), day);
    const body = await make(doc, shell);
    e = body == null ? null : { e: entity(body, type), link: type.startsWith('text/html') ? preloadLinks(body) : '' };
    if (pageCache.rev === stamp) pageCache.pages.set(key, e);
  }
  return e;
}

/* ---------------- public pages ---------------- */
const HTML = 'text/html; charset=utf-8';
/** the headers every built page gets (lib/static.js, lib/content.js): no-cache, ETag (304), its preloads as Link */
function send(req, res, e, status = 200) {
  if (!e) return false;
  res.set('Cache-Control', 'no-cache');
  if (e.link) res.set('Link', e.link);
  return sendEntity(req, res, e.e, { status });
}

/** Express middleware for the public blog paths (both sites), the blog sitemap and llms files. */
export function blogPages({ distDir }) {
  const cached = (key, type, make) => cachedPage(key, type, make, distDir);
  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const p = req.path;
    try {
      if (p === '/sitemap-blog.xml') {
        return send(req, res, await cached('sitemap', 'application/xml; charset=utf-8', (doc) => renderSitemap({ np: live(doc, 'np'), intl: live(doc, 'intl') })));
      }
      if (p === '/llms.txt' || p === '/llms-full.txt') {
        const file = resolve(distDir, p.slice(1));
        if (!existsSync(file)) return next();
        const full = p === '/llms-full.txt';
        return send(req, res, await cached(p, 'text/plain; charset=utf-8', (doc) => {
          const base = readFileSync(file, 'utf8');
          const bySite = Object.fromEntries(['np', 'intl'].map((s) => [s, live(doc, s).map((x) => ({ ...x, text: full ? plainText(x.body) : '' }))]));
          const block = llmsBlock(bySite, full);
          const a = base.indexOf(LLMS_START);
          const b = base.indexOf(LLMS_END);
          return a >= 0 && b > a ? base.slice(0, a) + block + base.slice(b + LLMS_END.length) : `${base.trimEnd()}\n\n${block}\n`;
        }));
      }
      const m = /^\/(international\/)?blog(?:\/(.*))?$/.exec(p);
      if (!m) return next();
      const site = m[1] ? 'intl' : 'np';
      const rest = m[2];
      const base = SITES[site].base;
      if (rest === undefined || rest === 'index.html') return res.redirect(301, base);
      if (rest === '') return send(req, res, await cached(`${site}:index`, HTML, async (doc, shell) => renderIndex({ site, posts: live(doc, site), shell: await shell(site) })));
      if (rest === 'rss.xml') return send(req, res, await cached(`${site}:rss`, 'application/rss+xml; charset=utf-8', (doc) => renderRss(site, live(doc, site))));
      const sm = /^([a-z0-9-]{1,80})(\/?)(?:index\.html)?$/.exec(rest);
      if (sm && SLUG_RE.test(sm[1])) {
        if (!sm[2] || rest.endsWith('index.html')) {
          const q = req.originalUrl.indexOf('?');
          return res.redirect(301, `${base}${sm[1]}/${q >= 0 ? req.originalUrl.slice(q) : ''}`);
        }
        const e = await cached(`${site}:post:${sm[1]}`, HTML, async (doc, shell) => {
          const posts = live(doc, site);
          const post = posts.find((x) => x.slug === sm[1]);
          return post ? renderPost({ post, others: posts, shell: await shell(site) }) : null;
        });
        if (e) return send(req, res, e);
        const { doc } = await readBlog();
        const moved = live(doc, site).find((x) => (x.redirects || []).includes(sm[1]));
        if (moved) return res.redirect(301, postPath(moved));
      }
      res.set('X-Robots-Tag', 'noindex');
      return send(req, res, await cached(`${site}:404`, HTML, async (doc, shell) => renderNotFound({ site, shell: await shell(site) })), 404);
    } catch (err) { return next(err); }
  };
}

/* ---------------- the uploaded covers ---------------- */
const MAX_PIXELS = 80_000_000;
/** POST /api/admin/blog/cover (multipart "file"): a photo -> 1600 and 800 wide WebP and a 1200x630 share JPEG. */
async function uploadCover(req, res) {
  const len = Number(req.get('content-length') || 0);
  if (len > MAX_BYTES + 64 * 1024) { res.set('Connection', 'close'); return res.status(413).json({ error: 'That file is larger than 15 MB.' }); }
  const { file } = await receiving.run(() => readMultipart(req, { fields: 2 }));
  let meta;
  try { meta = await sharp(file.buffer, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).metadata(); } catch { meta = null; }
  if (!meta || !['jpeg', 'png', 'webp', 'avif'].includes(meta.format) || !meta.width) throw httpError(415, 'Please upload a JPEG, PNG, WebP or AVIF photo.');
  const id = randomBytes(18).toString('base64url');
  await fs.mkdir(BLOG_UPLOADS, { recursive: true });
  await withSlot(async () => {
    const img = () => sharp(file.buffer, { limitInputPixels: MAX_PIXELS }).rotate();
    await img().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80, effort: 3 }).toFile(resolve(BLOG_UPLOADS, `${id}-1600.webp`));
    await img().resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78, effort: 3 }).toFile(resolve(BLOG_UPLOADS, `${id}-800.webp`));
    await img().resize({ width: 1200, height: 630, fit: 'cover', position: 'attention' }).flatten({ background: '#ffffff' }).jpeg({ quality: 84, mozjpeg: true }).toFile(resolve(BLOG_UPLOADS, `${id}-og.jpg`));
  });
  res.locals.auditLabel = 'Uploaded a blog cover photo';
  res.status(201).json({ src: `/uploads/_site/blog/${id}-1600.webp`, og: `/uploads/_site/blog/${id}-og.jpg` });
}
/** GET /uploads/_site/blog/<id>-(1600|800).webp | <id>-og.jpg */
export function blogUpload(req, res, next) {
  const m = /^\/uploads\/_site\/blog\/([A-Za-z0-9_-]{24}-(?:1600|800)\.webp|[A-Za-z0-9_-]{24}-og\.jpg)$/.exec(req.path);
  if (!m) return next();
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  return res.sendFile(resolve(BLOG_UPLOADS, m[1]), { dotfiles: 'deny' }, (err) => {
    if (err && !res.headersSent) res.status(err.statusCode === 404 || err.code === 'ENOENT' ? 404 : 500).end();
    else if (err) next(err);
  });
}

/* ---------------- admin API ---------------- */
const summary = (p) => ({
  id: p.id, slug: p.slug, site: p.site, title: p.title, category: p.category, status: p.status, publishedAt: p.publishedAt,
  updatedAt: p.updatedAt, builtin: p.builtin === true, path: postPath(p), cover: p.cover, words: withC(p).c.words,
});
const taken = (doc, post) => doc.posts.some((p) => p.id !== post.id && p.site === post.site && p.slug === post.slug);
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** The router for /api/admin/blog (server/index.js mounts it behind requirePerm('content')). */
export function adminRouter({ json, heavy, distDir }) {
  const r = express.Router();
  r.param('id', (req, res, next, id) => (ID_RE.test(id) ? next() : res.status(404).json({ error: 'No such post.' })));
  r.get('/', wrap(async (req, res) => {
    const { doc } = await readBlog();
    res.json({ posts: doc.posts.map(summary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || byNewest(a, b)), categories: CATEGORIES, designs: DESIGN_LISTS, sites: Object.fromEntries(Object.entries(SITES).map(([k, s]) => [k, { base: s.base }])) });
  }));
  r.get('/media', wrap(async (req, res) => res.json(await mediaList(distDir)))); // the media gallery (before /:id)
  r.get('/:id', wrap(async (req, res) => {
    const { doc } = await readBlog();
    const p = doc.posts.find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'No such post.' });
    const { c } = withC(p);
    res.json({ post: p, stamp: stampOf(p), words: c.words, minutes: c.minutes, html: c.html }); // html: what the editor opens
  }));
  r.post('/', json('256kb'), wrap(async (req, res) => {
    const post = cleanPost({ ...req.body, id: undefined, builtin: false });
    const out = await mutate((doc) => {
      if (taken(doc, post)) throw httpError(409, 'Another post on this website already uses that link name.', { errors: { slug: 'Already used on this website.' } });
      doc.posts.push(post);
      return post;
    });
    if (out.status === 'published') notifyChanged([postPath(out), SITES[out.site].base]);
    res.locals.auditLabel = 'Created a blog post';
    res.locals.auditTarget = out.title;
    res.status(201).json({ post: out, stamp: stampOf(out) });
  }));
  r.put('/:id', json('256kb'), wrap(async (req, res) => {
    let before = null;
    const out = await mutate((doc) => {
      const i = doc.posts.findIndex((x) => x.id === req.params.id);
      if (i < 0) throw httpError(404, 'No such post.');
      const prev = doc.posts[i];
      before = prev;
      // someone else saved since this editor opened it: never overwrite their words silently
      if (typeof req.body?.baseStamp === 'string' && req.body.baseStamp !== stampOf(prev)) {
        throw httpError(409, 'This post was changed somewhere else since you opened it. Reload it to see the latest version.', { code: 'stale' });
      }
      const post = cleanPost(req.body, prev);
      // a renamed link keeps working: the old link names redirect to the new one (301)
      const olds = [...(prev.redirects || []), ...(prev.slug !== post.slug && prev.status === 'published' ? [prev.slug] : [])].filter((s) => s !== post.slug);
      if (olds.length) post.redirects = [...new Set(olds)].slice(-10);
      if (taken(doc, post)) throw httpError(409, 'Another post on this website already uses that link name.', { errors: { slug: 'Already used on this website.' } });
      doc.posts[i] = post;
      return post;
    });
    // search engines that take IndexNow hear about it (lib/indexnow.js: production only, batched, never throws)
    if (out.status === 'published' || before?.status === 'published') notifyChanged([postPath(out), ...(before && before.slug !== out.slug ? [postPath(before)] : []), SITES[out.site].base]);
    res.locals.auditLabel = out.status === 'published' ? 'Saved a published blog post' : 'Saved a blog draft';
    res.locals.auditTarget = out.title;
    res.json({ post: out, stamp: stampOf(out) });
  }));
  r.delete('/:id', wrap(async (req, res) => {
    const gone = await mutate((doc) => {
      const i = doc.posts.findIndex((x) => x.id === req.params.id);
      if (i < 0) throw httpError(404, 'No such post.');
      return doc.posts.splice(i, 1)[0];
    });
    if (gone.status === 'published') notifyChanged([postPath(gone), SITES[gone.site].base]);
    res.locals.auditLabel = 'Deleted a blog post';
    res.locals.auditTarget = gone.title;
    res.json({ ok: true });
  }));
  // the editor's preview: the full page as it would be served, never stored, never indexed. `url` opens it in a tab
  // (GET /studio/blog-preview/<token>, previewPage below) for this session only, for 30 minutes.
  r.post('/preview', json('256kb'), wrap(async (req, res) => {
    res.locals.auditSkip = true;
    let post;
    try { post = draftOf(req.body); } catch (err) { return res.status(400).json({ error: err.message, errors: err.errors }); }
    const { doc } = await readBlog();
    const others = live(doc, post.site).filter((p) => p.id !== req.body?.id);
    const c = compilePost(post);
    const html = renderPost({ post: { ...post, id: req.body?.id || post.id, c }, others, shell: shellFor(distDir, post.site), preview: true });
    res.json({ html, words: c.words, url: `/studio/blog-preview/${keepPreview(html, req.sessionKey)}` });
  }));
  // Markdown -> the HTML the visual editor opens (switching back from the editor's Markdown view)
  r.post('/render', json('256kb'), wrap(async (req, res) => {
    res.locals.auditSkip = true;
    res.json({ html: renderMarkdown(text(req.body?.body, LIMITS.body)).html });
  }));
  // the SEO and Schema panels: the search snippet and JSON-LD this post would publish, with the checks
  r.post('/schema', json('256kb'), wrap(async (req, res) => {
    res.locals.auditSkip = true;
    let post;
    try { post = draftOf(req.body); } catch (err) { return res.status(400).json({ error: err.message, errors: err.errors }); }
    const c = compilePost(post);
    const out = postSchema({ ...post, updatedAt: today() }, c);
    res.json({ ...out, checks: schemaChecks(out.ld), words: c.words, minutes: c.minutes, toc: c.toc });
  }));
  r.post('/cover', heavy, wrap(uploadCover));
  return r;
}
/** an unsaved post for the preview and schema panels: what cleanPost keeps, with stand-ins for a missing title or link */
const draftOf = (b) => cleanPost({ ...b, slug: b?.slug || 'preview', title: b?.title || 'Untitled', category: b?.category || 'Guide' });

/* ---------------- the preview tab ---------------- */
const previews = new Map(); // token -> { html, owner, exp }
const PREVIEW_MS = 30 * 60 * 1000;
function keepPreview(html, owner) {
  const now = Date.now();
  for (const [k, v] of previews) if (v.exp < now) previews.delete(k);
  while (previews.size >= 40) previews.delete(previews.keys().next().value);
  const token = randomBytes(18).toString('base64url');
  previews.set(token, { html, owner: owner || '', exp: now + PREVIEW_MS });
  return token;
}
/** GET /studio/blog-preview/<token> (server/index.js, behind requirePerm('content')): the page, for the session that made it */
export function previewPage(req, res) {
  const p = /^[A-Za-z0-9_-]{24}$/.test(req.params.token || '') ? previews.get(req.params.token) : null;
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  if (!p || p.exp < Date.now() || p.owner !== (req.sessionKey || '')) {
    return res.status(404).type('text/plain').send('This preview has expired. Press Preview in the editor again.');
  }
  return res.type('html').send(p.html);
}

/* ---------------- the media gallery ---------------- */
const STILLS_FILE = resolve(ROOT_DIR, 'src', 'site', 'stills.json');
const nameOf = (slug) => DESIGN_LISTS.np.find((d) => d.slug === slug)?.name || DESIGN_LISTS.intl.find((d) => d.slug === slug)?.name || slug;
const pretty = (s) => s.replace(/-(?:v\d+|lg)$/, '').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
/** The pictures a post may use: the blog's uploads (newest first), the designs' phone stills, the site's own images. */
async function mediaList(distDir) {
  const uploads = [];
  try {
    const names = await fs.readdir(BLOG_UPLOADS);
    const ids = names.map((n) => /^([A-Za-z0-9_-]{24})-1600\.webp$/.exec(n)?.[1]).filter(Boolean);
    const withTime = await Promise.all(ids.map(async (id) => ({ id, t: (await fs.stat(resolve(BLOG_UPLOADS, `${id}-1600.webp`))).mtimeMs })));
    for (const { id, t } of withTime.sort((a, b) => b.t - a.t).slice(0, 300)) {
      uploads.push({ src: `/uploads/_site/blog/${id}-1600.webp`, thumb: `/uploads/_site/blog/${id}-800.webp`, og: names.includes(`${id}-og.jpg`) ? `/uploads/_site/blog/${id}-og.jpg` : null, at: new Date(t).toISOString() });
    }
  } catch { /* no uploads yet */ }
  let stills = {};
  try { stills = JSON.parse(readFileSync(STILLS_FILE, 'utf8')); } catch { /* none */ }
  const designs = Object.entries(stills).filter(([slug, v]) => SLUG_RE.test(slug) && (v.w || []).includes(800))
    .map(([slug, v]) => ({ src: `/site/stills/${slug}-800.webp`, thumb: `/site/stills/${slug}-${(v.w || []).includes(480) ? 480 : 800}.webp`, name: nameOf(slug), design: slug, sites: ['np', 'intl'].filter((s) => designExists(s, slug)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const site = [];
  const scan = async (dir, url, re, thumbOf) => {
    const at = [resolve(distDir, ...dir), resolve(ROOT_DIR, 'public', ...dir)].find((d) => existsSync(d));
    if (!at) return;
    const names = (await fs.readdir(at)).sort();
    for (const n of names) {
      const m = re.exec(n);
      if (m) site.push({ src: `${url}${n}`, thumb: `${url}${thumbOf(m[1], names) || n}`, name: pretty(m[1]) });
    }
  };
  await scan(['site', 'intl'], '/site/intl/', /^([a-z0-9-]{2,60})-800\.webp$/, (b, names) => (names.includes(`${b}-480.webp`) ? `${b}-480.webp` : null));
  await scan(['photos'], '/photos/', /^([a-z0-9-]{2,60})-lg\.webp$/, (b, names) => (names.includes(`${b}-sm.webp`) ? `${b}-sm.webp` : null));
  return { uploads, designs, site };
}

/** a post's version stamp for the editor's conflict check */
export const stampOf = (p) => hash(JSON.stringify(p));

export { catSlug };
