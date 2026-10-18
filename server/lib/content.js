// The website's editable words without a rebuild: the 'content' document (the studio's Content page; docs/API.md
// "Content"). The build stays the source of every default: the server reads each built page's own title,
// description, heading, intro and questions (lib/content-render.js readPage), and the document holds only what the
// planner changed. Every save bumps `ver` (a stale editor gets 409) and is recorded by the audit middleware.
//
// content = {
//   v: 1, ver, updatedAt, updatedBy,
//   pages: { '<path>': { title?, desc?, h1?, lede?, faq?: [{ q, a, group? }] } },        missing = the built words
//   sites: { np | intl: { hours, social: { facebook, ... }, footer: { blurb, payLine }, trust: { line, policy },
//                         announce: { on, text, link, linkText, from, to } } },
// }
// The contact lines themselves (email, phone, WhatsApp, address) stay in the site settings (lib/site.js), which
// orders, the pay page and the website's scripts already read; this page edits them there.
// The home pages' heading falls back to the Website page's headline (site settings hero) before the built words.
//
// Serving (production): contentPages() answers GET/HEAD for every built public page with the edits written in,
// cached per page and per (content, settings, day) revision, so a save shows on the next request. A page with
// nothing to change is left to lib/static.js (its precompressed file).
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { getDoc, putDoc, withLock } from './store.js';
import { readSite, marketView, saveContact } from './site.js';
import { publicBranding } from './branding.js';
import { entity, sendEntity } from './http-cache.js';
import { preloadLinks } from './static.js';
import { notifyChanged } from './indexnow.js';
import { normalizeText, inlineProblem, safeHref, cleanInline, inlineText, INLINE, HEADING } from './safe-html.js';
import { readPage, readSiteBits, applyContent, announceHtml, footExtraHtml, trustHtml } from './content-render.js';

const CONTENT_V = 1;
export const MARKETS = ['np', 'intl'];
export const SOCIAL = [
  ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'],
  ['x', 'X (Twitter)'], ['linkedin', 'LinkedIn'], ['pinterest', 'Pinterest'],
];
/** Hard limits (the studio warns earlier: titles over 60, descriptions over 155). */
export const LIMITS = { title: 70, desc: 200, h1: 160, lede: 600, q: 200, a: 1500, group: 80, faq: 30, hours: 120, blurb: 300, payLine: 140, trustLine: 160, policy: 240, announce: 160, linkText: 40, address: 300 };
const LEGAL = new Set(['terms', 'privacy', 'refunds']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const isObj = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/* ---------------- the document ---------------- */

const emptySite = () => ({ hours: '', social: {}, footer: { blurb: '', payLine: '' }, trust: { line: '', policy: '' }, announce: { on: false, text: '', link: '', linkText: '', from: '', to: '' } });
function siteOf(s) {
  const d = emptySite();
  if (!isObj(s)) return d;
  const str = (v) => (typeof v === 'string' ? v : '');
  d.hours = str(s.hours);
  for (const [k] of SOCIAL) if (typeof s.social?.[k] === 'string' && s.social[k]) d.social[k] = s.social[k];
  d.footer = { blurb: str(s.footer?.blurb), payLine: str(s.footer?.payLine) };
  d.trust = { line: str(s.trust?.line), policy: str(s.trust?.policy) };
  const a = isObj(s.announce) ? s.announce : {};
  d.announce = { on: a.on === true, text: str(a.text), link: str(a.link), linkText: str(a.linkText), from: str(a.from), to: str(a.to) };
  return d;
}
/** The stored document with every part present. */
export function contentOf(value) {
  const v = isObj(value) ? value : {};
  const pages = {};
  for (const [p, o] of Object.entries(isObj(v.pages) ? v.pages : {})) if (isObj(o)) pages[p] = o;
  return { v: CONTENT_V, ver: Number.isInteger(v.ver) ? v.ver : 0, updatedAt: v.updatedAt || null, updatedBy: v.updatedBy || null, pages, sites: { np: siteOf(v.sites?.np), intl: siteOf(v.sites?.intl) } };
}
export async function readContent() {
  const d = await getDoc('content');
  return { rev: d?.rev ?? 0, doc: contentOf(d?.value) };
}

/* ---------------- the built pages (dist), read once ---------------- */

const SKIP_DIRS = new Set(['assets', 'themes', 'photos', 'audio', 'art', 'site', 'studio', 'uploads', 'fonts', 'pay']);
const GROUPS = { main: 'Main pages', landing: 'Occasion and landing pages', designs: 'Design pages', legal: 'Legal pages' };
const groupOf = (id) => (/^(?:intl-)?design\//.test(id) ? 'designs' : id.startsWith('land/') ? 'landing' : LEGAL.has(id) ? 'legal' : 'main');

let registry = null; // Promise<{ pages: Map(path -> page), bits: { np, intl } }>
let registryDir = null;
async function scanDist(distDir) {
  const pages = new Map();
  const walk = async (dir, rel, depth) => {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const d of entries) {
      if (d.isFile() && d.name === 'index.html') {
        const file = resolve(dir, d.name);
        const html = await fs.readFile(file, 'utf8');
        const info = readPage(html);
        if (!info) continue;
        const path = `/${rel}`;
        const site = info.site || (path.startsWith('/international/') ? 'intl' : 'np');
        pages.set(path, { ...info, site, path, file, group: groupOf(info.id), label: info.title.replace(/\s*\|\s*Nimtto\s*$/i, '') || path, bits: path === '/' || path === '/international/' || path === '/contact/' ? readSiteBits(html) : null });
      } else if (d.isDirectory() && depth < 4 && !d.name.startsWith('.') && !(depth === 0 && SKIP_DIRS.has(d.name))) {
        await walk(resolve(dir, d.name), `${rel}${d.name}/`, depth + 1);
      }
    }
  };
  await walk(distDir, '', 0);
  const bits = (p) => pages.get(p)?.bits || {};
  const np = bits('/');
  const intl = bits('/international/');
  return {
    pages,
    bits: {
      np: { footBlurb: np.footBlurb || '', footPay: np.footPay || '', hours: bits('/contact/').hours || '' },
      intl: { footBlurb: intl.footBlurb || '', footPay: intl.footPay || '', hours: '' },
    },
  };
}
/** The built pages (scanned on first use; dist does not change while the server runs). */
export function builtPages(distDir) {
  if (!registry || registryDir !== distDir) { registryDir = distDir; registry = scanDist(distDir); }
  return registry;
}
/** Forget the scan (tests that rebuild their fixture dist). */
export const rescan = () => { registry = null; clearCache(); };

/* ---------------- what a page shows ---------------- */

/** Kathmandu's calendar date (YYYY-MM-DD): the announcement's from/to days. */
export const todayKey = (now = new Date()) => now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' });
export const announceActive = (a, today = todayKey()) => Boolean(a?.on && a.text && (!a.from || a.from <= today) && (!a.to || today <= a.to));

/** The Website page's headline, for the two home pages' heading and intro (when Content leaves them as built). */
function heroOf(page, site) {
  const h = page.path === '/' ? site.hero : page.path === '/international/' ? site.intl?.hero : null;
  return { h1: String(h?.title || '').trim(), lede: String(h?.subtitle || '').trim() };
}

/** Everything applyContent needs for one page. */
export function viewFor(page, doc, site, today = todayKey()) {
  const o = doc.pages[page.path] || {};
  const market = page.site === 'intl' ? 'intl' : 'np';
  const cs = doc.sites[market];
  const hero = heroOf(page, site);
  const np = marketView(site, 'np').contact;
  const intl = marketView(site, 'intl').contact;
  const social = (s) => SOCIAL.map(([k, label]) => [k, label, s.social[k] || '']).filter(([, , u]) => u);
  const sameAs = [...new Set([...social(doc.sites.np), ...social(doc.sites.intl)].map(([, , u]) => u))];
  return {
    title: o.title || '',
    desc: o.desc || '',
    h1: page.hasH1 ? o.h1 || '' : '',
    h1Text: page.hasH1 ? hero.h1 : '',
    lede: page.hasLede ? o.lede || '' : '',
    ledeText: page.hasLede ? hero.lede : '',
    faq: page.faq && Array.isArray(o.faq) && o.faq.length ? { items: o.faq, grouped: page.faqGrouped } : null,
    contact: market === 'intl' ? intl : np,
    hours: cs.hours,
    footBlurb: cs.footer.blurb,
    footPay: cs.footer.payLine,
    footExtra: footExtraHtml({ social: social(cs), address: (market === 'intl' ? intl : np).address || '', hours: cs.hours }),
    trust: trustHtml(cs.trust),
    announce: announceActive(cs.announce, today) ? announceHtml(cs.announce) : '',
    org: { np, intl, sameAs, address: np.address || '' },
    // Website → Branding: the header and footer logo ('' keeps the built one: crimson on Nepal, sage on International)
    logo: publicBranding(site.branding).logos[market === 'intl' ? 'intl' : 'site'],
  };
}

/* ---------------- serving ---------------- */

let cache = { key: '', pages: new Map() }; // path -> { e: entity, link } , or null when the built file is right as it is
export const clearCache = () => { cache = { key: '', pages: new Map() }; };

/** The key a request for a page path is cached under ('/faq/', '/'), or null when it is not a page path. */
function pagePath(reqPath) {
  let p;
  try { p = decodeURIComponent(reqPath); } catch { return null; }
  if (p.endsWith('/index.html')) p = p.slice(0, -10);
  return p.endsWith('/') ? p : null;
}

/** Express middleware (production, before lib/static.js): built pages with the Content edits written in. */
export function contentPages(distDir) {
  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (res.locals.gatedPage) return next(); // never a design page (lib/gate.js); they carry no hooks either
    const path = pagePath(req.path);
    if (!path) return next();
    try {
      const reg = await builtPages(distDir);
      const page = reg.pages.get(path);
      if (!page) return next();
      const [c, s] = await Promise.all([getDoc('content'), getDoc('site')]);
      const today = todayKey();
      const key = `${c?.rev ?? 0}:${s?.rev ?? 0}:${today}`;
      if (cache.key !== key) cache = { key, pages: new Map() };
      let e = cache.pages.get(path);
      if (e === undefined) {
        const html = await fs.readFile(page.file, 'utf8');
        const out = applyContent(html, viewFor(page, contentOf(c?.value), await readSite(), today));
        e = out === html ? null : { e: entity(out, 'text/html; charset=utf-8'), link: preloadLinks(out) };
        if (cache.key === key) cache.pages.set(path, e);
      }
      if (!e) return next();
      // the same headers lib/static.js gives the built page: no-cache (always revalidate) and its preloads
      res.set('Cache-Control', 'no-cache');
      if (e.link) res.set('Link', e.link);
      return sendEntity(req, res, e.e);
    } catch (err) { return next(err); }
  };
}

/* ---------------- validation ---------------- */

function textField(v, path, max, errors, { allowed = null, oneLine = true } = {}) {
  if (v == null) return '';
  if (typeof v !== 'string') { errors.push({ path, message: 'must be text' }); return ''; }
  const s = normalizeText(v, { oneLine });
  if (s.length > max) { errors.push({ path, message: `must be at most ${max} characters` }); return ''; }
  if (allowed) {
    const bad = inlineProblem(s, allowed);
    if (bad) { errors.push({ path, message: bad }); return ''; }
  }
  return s;
}

/** One page's override from the editor: fields equal to the built words (or empty) are dropped (= default). */
export function cleanPage(body, page) {
  const b = isObj(body) ? body : {};
  const errors = [];
  const out = {};
  const title = textField(b.title, 'title', LIMITS.title, errors);
  if (title && title !== page.title) out.title = title;
  const desc = textField(b.desc, 'desc', LIMITS.desc, errors);
  if (desc && desc !== page.desc) out.desc = desc;
  if (page.hasH1) {
    const h1 = textField(b.h1, 'h1', LIMITS.h1, errors, { allowed: HEADING });
    if (h1 && h1 !== page.h1) out.h1 = h1;
  }
  if (page.hasLede) {
    const lede = textField(b.lede, 'lede', LIMITS.lede, errors, { allowed: INLINE });
    if (lede && lede !== page.lede) out.lede = lede;
  }
  if (page.faq && b.faq != null) {
    if (!Array.isArray(b.faq) || b.faq.length < 1 || b.faq.length > LIMITS.faq) errors.push({ path: 'faq', message: `must be a list of 1 to ${LIMITS.faq} questions (or "Reset to default")` });
    else {
      const items = b.faq.map((x, i) => {
        const r = isObj(x) ? x : {};
        const q = textField(r.q, `faq[${i}].q`, LIMITS.q, errors);
        const a = textField(r.a, `faq[${i}].a`, LIMITS.a, errors, { allowed: INLINE });
        if (!q) errors.push({ path: `faq[${i}].q`, message: 'needs a question' });
        if (!a) errors.push({ path: `faq[${i}].a`, message: 'needs an answer' });
        const item = { q, a };
        if (page.faqGrouped) item.group = textField(r.group, `faq[${i}].group`, LIMITS.group, errors);
        return item;
      });
      const same = items.length === page.faq.length && items.every((x, i) => x.q === page.faq[i].q && x.a === page.faq[i].a && (!page.faqGrouped || (x.group || '') === (page.faq[i].group || '')));
      if (!same) out.faq = items;
    }
  }
  if (errors.length) throw httpError(400, 'Please check the page content.', { errors: errors.slice(0, 50) });
  return out;
}

/** One site's settings from the editor (contact lines excluded: lib/site.js saveContact). */
export function cleanSite(body) {
  const b = isObj(body) ? body : {};
  const errors = [];
  const out = emptySite();
  out.hours = textField(b.hours, 'hours', LIMITS.hours, errors);
  const social = isObj(b.social) ? b.social : {};
  for (const [k, label] of SOCIAL) {
    const u = textField(social[k], `social.${k}`, 300, errors);
    if (!u) continue;
    if (!safeHref(u).startsWith('https://')) errors.push({ path: `social.${k}`, message: `${label}: must be a full https:// link` });
    else out.social[k] = u;
  }
  const f = isObj(b.footer) ? b.footer : {};
  out.footer = { blurb: textField(f.blurb, 'footer.blurb', LIMITS.blurb, errors, { allowed: INLINE }), payLine: textField(f.payLine, 'footer.payLine', LIMITS.payLine, errors, { allowed: INLINE }) };
  const t = isObj(b.trust) ? b.trust : {};
  out.trust = { line: textField(t.line, 'trust.line', LIMITS.trustLine, errors, { allowed: INLINE }), policy: textField(t.policy, 'trust.policy', LIMITS.policy, errors, { allowed: INLINE }) };
  const a = isObj(b.announce) ? b.announce : {};
  const date = (v, path) => {
    const s = textField(v, path, 10, errors);
    if (s && (!DATE_RE.test(s) || Number.isNaN(Date.parse(s)))) { errors.push({ path, message: 'must be a date (YYYY-MM-DD)' }); return ''; }
    return s;
  };
  out.announce = {
    on: a.on === true,
    text: textField(a.text, 'announce.text', LIMITS.announce, errors),
    link: textField(a.link, 'announce.link', 500, errors),
    linkText: textField(a.linkText, 'announce.linkText', LIMITS.linkText, errors),
    from: date(a.from, 'announce.from'),
    to: date(a.to, 'announce.to'),
  };
  if (out.announce.link && !safeHref(out.announce.link)) errors.push({ path: 'announce.link', message: 'must start with https:// or / (a page on this site)' });
  if (out.announce.link && /^(mailto|tel):/i.test(out.announce.link)) errors.push({ path: 'announce.link', message: 'must start with https:// or / (a page on this site)' });
  if (out.announce.on && !out.announce.text) errors.push({ path: 'announce.text', message: 'is needed to show the bar' });
  if (out.announce.from && out.announce.to && out.announce.from > out.announce.to) errors.push({ path: 'announce.to', message: 'must be on or after the start date' });
  if (errors.length) throw httpError(400, 'Please check these settings.', { errors: errors.slice(0, 50) });
  return out;
}

/* ---------------- the studio's routes ---------------- */

const SITE_LABEL = { np: 'Nepal', intl: 'International', both: 'Both sites' };
function pageEntry(p, doc, site) {
  const hero = heroOf(p, site);
  return {
    path: p.path, url: p.url, id: p.id, site: p.site, siteLabel: SITE_LABEL[p.site] || '', group: p.group, groupLabel: GROUPS[p.group], label: p.label,
    defaults: { title: p.title, desc: p.desc, h1: p.h1, lede: p.lede, faq: p.faq, faqGrouped: p.faqGrouped, hasH1: p.hasH1, hasLede: p.hasLede },
    // the Website page's headline: what the home page shows when Content leaves its heading as built
    base: { h1: hero.h1, lede: hero.lede },
    override: doc.pages[p.path] || {},
  };
}
function siteEntry(market, doc, site, bits) {
  const raw = market === 'intl' ? site.intl?.contact || {} : site.contact || {};
  const np = site.contact || {};
  return {
    ...doc.sites[market],
    contact: { email: raw.email || '', phone: raw.phone || '', whatsapp: raw.whatsapp || '', address: raw.address || '' },
    // what an empty field shows: the International site falls back to Nepal's contact lines
    fallback: market === 'intl' ? { email: np.email || '', phone: np.phone || '', whatsapp: np.whatsapp || '', address: '' } : { email: '', phone: '', whatsapp: '', address: '' },
    defaults: { footer: { blurb: bits[market].footBlurb, payLine: bits[market].footPay }, hours: bits[market].hours },
    announceLive: announceActive(doc.sites[market].announce),
  };
}

/** GET /api/admin/content: every built page with its built words and the planner's changes, and both sites' settings. */
export function adminContent(distDir) {
  return async (req, res) => {
    const [reg, { doc }, site] = await Promise.all([builtPages(distDir), readContent(), readSite()]);
    res.set('Cache-Control', 'no-store');
    res.json({
      ver: doc.ver, updatedAt: doc.updatedAt, updatedBy: doc.updatedBy, built: reg.pages.size > 0, today: todayKey(),
      pages: [...reg.pages.values()].map((p) => pageEntry(p, doc, site)),
      sites: { np: siteEntry('np', doc, site, reg.bits), intl: siteEntry('intl', doc, site, reg.bits) },
      limits: LIMITS, social: SOCIAL, groups: GROUPS,
    });
  };
}

/** Read-modify-write of the document under one lock, refusing a stale editor (409). */
async function mutate(req, fn) {
  return withLock('content:edit', async () => {
    const { doc } = await readContent();
    const want = req.body?.ver;
    if (want != null && want !== doc.ver) throw httpError(409, 'Someone saved the content while you were editing. Reload to see their changes, then try again.', { code: 'conflict' });
    await fn(doc);
    doc.ver += 1;
    doc.updatedAt = new Date().toISOString();
    doc.updatedBy = req.admin?.email || null;
    await putDoc('content', doc);
    clearCache();
    return doc;
  });
}

/** PUT /api/admin/content/page { ver, path, title, desc, h1, lede, faq }: the whole override of one page (empty or
 *  null fields, and fields equal to the built words, go back to the built words). */
export function putPage(distDir) {
  return async (req, res) => {
    const path = typeof req.body?.path === 'string' ? req.body.path : '';
    const reg = await builtPages(distDir);
    const page = reg.pages.get(path);
    if (!page) throw httpError(404, 'No page with that address.');
    const clean = cleanPage(req.body, page);
    res.locals.auditTarget = path;
    res.locals.auditFields = Object.keys(clean).length ? Object.keys(clean) : ['reset'];
    const doc = await mutate(req, (d) => { if (Object.keys(clean).length) d.pages[path] = clean; else delete d.pages[path]; });
    notifyChanged([page.url || path]); // IndexNow: search engines recrawl the page (production only; never throws)
    res.json({ ver: doc.ver, page: pageEntry(page, doc, await readSite()) });
  };
}

/** PUT /api/admin/content/site/:market { ver, contact, hours, social, footer, trust, announce } */
export function putSiteContent(distDir) {
  return async (req, res) => {
    const market = req.params.market;
    if (!MARKETS.includes(market)) throw httpError(404, 'No such website.');
    const clean = cleanSite(req.body);
    res.locals.auditTarget = market;
    // the contact lines live in the site settings: validated and saved there (400 with errors), after the stale check
    const doc = await mutate(req, async (d) => {
      if (isObj(req.body?.contact)) await saveContact(market, req.body.contact);
      d.sites[market] = clean;
    });
    const [reg, site] = await Promise.all([builtPages(distDir), readSite()]);
    // contact, footer and social lines are on every page of that site: let search engines know
    notifyChanged([...reg.pages.values()].filter((p) => p.site === market || p.site === 'both').map((p) => p.url || p.path));
    res.json({ ver: doc.ver, site: siteEntry(market, doc, site, reg.bits) });
  };
}

// for tests and the SEO health column: the plain text the page will show
export const plainOf = (s) => inlineText(cleanInline(s));
