// The blog of both websites: posts in the store (one small document, `blog`), edited in the studio's Blog module, and
// served as SERVER-RENDERED pages (lib/blog-render.js) so search engines read every word without JavaScript.
//   Public:  GET /blog/, /blog/<slug>/, /blog/rss.xml, the same under /international/blog/, /sitemap-blog.xml, and
//            /llms.txt + /llms-full.txt with the live blog part (the build writes the rest).
//   Admin:   /api/admin/blog (perm 'blog', CSRF via requirePerm): list, read, create, update, delete, preview, cover upload.
// A post: { id, slug, site: 'np'|'intl', title, excerpt, category, body (Markdown), faq: [{ q, a }], cover, og,
//   seoTitle, seoDesc, keyword, secondary, designs, related, status: 'draft'|'published', publishedAt (YYYY-MM-DD),
//   updatedAt, createdAt, builtin? }.
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
import { plainText } from './blog-md.js';
import { THEMES } from '../../src/site/themes.js';
import { INTL_THEMES, NP_DESIGNS_INTL } from '../../src/site/intl-designs.js';
import {
  SITES, compilePost, renderIndex, renderPost, renderNotFound, renderRss, renderSitemap, llmsBlock, LLMS_START, LLMS_END,
  shellFor, designExists, postPath, catSlug,
} from './blog-render.js';

const KEY = 'blog';
export const SEED_DIR = resolve(ROOT_DIR, 'src', 'blog', 'posts');
export const BLOG_UPLOADS = resolve(UPLOAD_DIR, '_site', 'blog');
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+){0,12}$/;
const ID_RE = /^[A-Za-z0-9_-]{8,24}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const COVER_RE = /^\/uploads\/_site\/blog\/[A-Za-z0-9_-]{24}-1600\.webp$/;
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
/** The blog document { v, seeds: [key], posts: [post] }, with any built-in post not seen before added. */
async function readBlog() {
  const cur = await getDoc(KEY);
  const doc = cur?.value && Array.isArray(cur.value.posts) ? cur.value : { v: 1, seeds: [], posts: [] };
  seedsOnce ??= loadSeeds();
  const fresh = seedsOnce.filter((s) => !doc.seeds.includes(s.key));
  if (!fresh.length && cur) return { doc, rev: cur.rev };
  return withLock(`kv:${KEY}:seed`, async () => {
    const again = await getDoc(KEY);
    const d = again?.value && Array.isArray(again.value.posts) ? structuredClone(again.value) : { v: 1, seeds: [], posts: [] };
    for (const s of seedsOnce) {
      if (d.seeds.includes(s.key)) continue;
      d.seeds.push(s.key);
      if (!d.posts.some((p) => p.site === s.post.site && p.slug === s.post.slug)) d.posts.push(s.post);
    }
    const rev = await putDoc(KEY, d);
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

async function cachedPage(key, make) {
  const { doc, rev } = await readBlog();
  if (pageCache.rev !== rev) pageCache = { rev, pages: new Map() };
  let body = pageCache.pages.get(key);
  if (body === undefined) {
    body = make(doc);
    pageCache.pages.set(key, body);
  }
  return body;
}

/* ---------------- public pages ---------------- */
function send(req, res, type, body, status = 200) {
  if (body == null) return false;
  const etag = `W/"b-${hash(body)}"`;
  res.set('Cache-Control', 'no-cache');
  res.set('ETag', etag);
  if (status === 200 && req.headers['if-none-match'] === etag) { res.status(304).end(); return true; }
  res.status(status).type(type).send(body);
  return true;
}

/** Express middleware for the public blog paths (both sites), the blog sitemap and llms files. */
export function blogPages({ distDir }) {
  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const p = req.path;
    try {
      if (p === '/sitemap-blog.xml') {
        return send(req, res, 'application/xml', await cachedPage('sitemap', (doc) => renderSitemap({ np: live(doc, 'np'), intl: live(doc, 'intl') })));
      }
      if (p === '/llms.txt' || p === '/llms-full.txt') {
        const file = resolve(distDir, p.slice(1));
        if (!existsSync(file)) return next();
        const full = p === '/llms-full.txt';
        const body = await cachedPage(p, (doc) => {
          const base = readFileSync(file, 'utf8');
          const bySite = Object.fromEntries(['np', 'intl'].map((s) => [s, live(doc, s).map((x) => ({ ...x, text: full ? plainText(x.body) : '' }))]));
          const block = llmsBlock(bySite, full);
          const a = base.indexOf(LLMS_START);
          const b = base.indexOf(LLMS_END);
          return a >= 0 && b > a ? base.slice(0, a) + block + base.slice(b + LLMS_END.length) : `${base.trimEnd()}\n\n${block}\n`;
        });
        return send(req, res, 'text/plain; charset=utf-8', body);
      }
      const m = /^\/(international\/)?blog(?:\/(.*))?$/.exec(p);
      if (!m) return next();
      const site = m[1] ? 'intl' : 'np';
      const rest = m[2];
      const base = SITES[site].base;
      if (rest === undefined) return res.redirect(301, base);
      if (rest === '' || rest === 'index.html') {
        if (rest === 'index.html') return res.redirect(301, base);
        return send(req, res, 'html', await cachedPage(`${site}:index`, (doc) => renderIndex({ site, posts: live(doc, site), shell: shellFor(distDir, site) })));
      }
      if (rest === 'rss.xml') return send(req, res, 'application/rss+xml; charset=utf-8', await cachedPage(`${site}:rss`, (doc) => renderRss(site, live(doc, site))));
      const sm = /^([a-z0-9-]{1,80})(\/?)(?:index\.html)?$/.exec(rest);
      if (sm && SLUG_RE.test(sm[1])) {
        if (!sm[2] || rest.endsWith('index.html')) {
          const q = req.originalUrl.indexOf('?');
          return res.redirect(301, `${base}${sm[1]}/${q >= 0 ? req.originalUrl.slice(q) : ''}`);
        }
        const html = await cachedPage(`${site}:post:${sm[1]}`, (doc) => {
          const posts = live(doc, site);
          const post = posts.find((x) => x.slug === sm[1]);
          return post ? renderPost({ post, others: posts, shell: shellFor(distDir, site) }) : null;
        });
        if (html) return send(req, res, 'html', html);
      }
      res.set('X-Robots-Tag', 'noindex');
      return send(req, res, 'html', renderNotFound({ site, shell: shellFor(distDir, site) }), 404);
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
    await img().resize({ width: 1600, height: 1000, fit: 'cover', position: 'attention' }).webp({ quality: 80, effort: 3 }).toFile(resolve(BLOG_UPLOADS, `${id}-1600.webp`));
    await img().resize({ width: 800, height: 500, fit: 'cover', position: 'attention' }).webp({ quality: 78, effort: 3 }).toFile(resolve(BLOG_UPLOADS, `${id}-800.webp`));
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

/** The router for /api/admin/blog (server/index.js mounts it behind requirePerm('blog')). */
export function adminRouter({ json, heavy, distDir }) {
  const r = express.Router();
  r.param('id', (req, res, next, id) => (ID_RE.test(id) ? next() : res.status(404).json({ error: 'No such post.' })));
  r.get('/', wrap(async (req, res) => {
    const { doc } = await readBlog();
    res.json({ posts: doc.posts.map(summary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || byNewest(a, b)), categories: CATEGORIES, designs: DESIGN_LISTS, sites: Object.fromEntries(Object.entries(SITES).map(([k, s]) => [k, { base: s.base }])) });
  }));
  r.get('/:id', wrap(async (req, res) => {
    const { doc } = await readBlog();
    const p = doc.posts.find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'No such post.' });
    const { c } = withC(p);
    res.json({ post: p, stamp: stampOf(p), words: c.words, minutes: c.minutes });
  }));
  r.post('/', json('256kb'), wrap(async (req, res) => {
    const post = cleanPost({ ...req.body, id: undefined, builtin: false });
    const out = await mutate((doc) => {
      if (taken(doc, post)) throw httpError(409, 'Another post on this website already uses that link name.', { errors: { slug: 'Already used on this website.' } });
      doc.posts.push(post);
      return post;
    });
    res.locals.auditLabel = 'Created a blog post';
    res.locals.auditTarget = out.title;
    res.status(201).json({ post: out, stamp: stampOf(out) });
  }));
  r.put('/:id', json('256kb'), wrap(async (req, res) => {
    const out = await mutate((doc) => {
      const i = doc.posts.findIndex((x) => x.id === req.params.id);
      if (i < 0) throw httpError(404, 'No such post.');
      const prev = doc.posts[i];
      // someone else saved since this editor opened it: never overwrite their words silently
      if (typeof req.body?.baseStamp === 'string' && req.body.baseStamp !== stampOf(prev)) {
        throw httpError(409, 'This post was changed somewhere else since you opened it. Reload it to see the latest version.', { code: 'stale' });
      }
      const post = cleanPost(req.body, prev);
      if (taken(doc, post)) throw httpError(409, 'Another post on this website already uses that link name.', { errors: { slug: 'Already used on this website.' } });
      doc.posts[i] = post;
      return post;
    });
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
    res.locals.auditLabel = 'Deleted a blog post';
    res.locals.auditTarget = gone.title;
    res.json({ ok: true });
  }));
  // the editor's live preview: the full page as it would be served, never stored, never indexed
  r.post('/preview', json('256kb'), wrap(async (req, res) => {
    res.locals.auditSkip = true;
    let post;
    try { post = cleanPost({ ...req.body, slug: req.body?.slug || 'preview', title: req.body?.title || 'Untitled', category: req.body?.category || 'Guide' }); } catch (err) { return res.status(400).json({ error: err.message, errors: err.errors }); }
    const { doc } = await readBlog();
    const others = live(doc, post.site).filter((p) => p.id !== req.body?.id);
    const html = renderPost({ post: { ...post, id: req.body?.id || post.id, c: compilePost(post) }, others, shell: shellFor(distDir, post.site), preview: true });
    res.json({ html, words: compilePost(post).words });
  }));
  r.post('/cover', heavy, wrap(uploadCover));
  return r;
}
/** a post's version stamp for the editor's conflict check */
export const stampOf = (p) => hash(JSON.stringify(p));

export { catSlug };
