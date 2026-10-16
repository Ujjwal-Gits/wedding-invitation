// Public website settings: data/site.json = { plans, contact, hero, hiddenThemes, featuredThemes }.
// GET is public (defaults when the file does not exist yet); PUT is the planner's, fully validated.
import { resolve } from 'node:path';
import { DATA_DIR } from './env.js';
import { withLock, readJson, writeJsonAtomic } from './store.js';
import { isTheme, listThemes } from './catalog.js';
import { loadManifest } from './slots.js';

export const SITE_FILE = resolve(DATA_DIR, 'site.json');
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;
const PHONE_RE = /^[0-9+()\-\s]{6,20}$/;
export const EMAIL_RE = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;
const PLAN_ID_RE = /^[a-z0-9-]{1,32}$/;
const SLUG_LIKE = /^[a-z][a-z0-9-]{1,30}$/;

const DEFAULTS = {
  plans: [
    { id: 'classic', name: 'Classic', price: null, currency: 'NPR', note: '', features: [], highlight: false },
    { id: 'premium', name: 'Premium', price: null, currency: 'NPR', note: '', features: [], highlight: true },
    { id: 'custom', name: 'Custom', price: null, currency: 'NPR', note: '', features: [], highlight: false },
  ],
  contact: { phone: '', whatsapp: '', email: '', address: '' },
  hero: { title: '', subtitle: '' },
  hiddenThemes: [],
  featuredThemes: [],
};

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });

function sanitizeSite(input) {
  const errors = [];
  const fail = (path, message) => { errors.push({ path, message }); };
  const o = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const text = (v, path, max, multiline = false) => {
    if (v == null) return '';
    if (typeof v !== 'string') { fail(path, 'must be text'); return ''; }
    let s = v.normalize('NFC').replace(CTRL, '');
    if (!multiline) s = s.replace(/[\r\n]+/g, ' ');
    s = s.trim();
    if (s.length > max) { fail(path, `must be at most ${max} characters`); return ''; }
    return s;
  };
  const d = o(input);
  const plansIn = d.plans == null ? [] : d.plans;
  if (!Array.isArray(plansIn) || plansIn.length > 8) fail('plans', 'must be a list of at most 8 plans');
  const plans = (Array.isArray(plansIn) ? plansIn.slice(0, 8) : []).map((raw, i) => {
    const p = o(raw);
    const path = `plans[${i}]`;
    const id = typeof p.id === 'string' && PLAN_ID_RE.test(p.id) ? p.id : (fail(`${path}.id`, 'must be 1-32 lowercase letters, digits or hyphens'), '');
    const name = text(p.name, `${path}.name`, 60);
    if (!name) fail(`${path}.name`, 'is required');
    let price = null;
    if (p.price != null && p.price !== '') {
      if (typeof p.price === 'number' && Number.isInteger(p.price) && p.price >= 0 && p.price <= 10_000_000) price = p.price;
      else fail(`${path}.price`, 'must be a whole number of rupees, or empty for "Ask for price"');
    }
    if (p.currency != null && p.currency !== 'NPR') fail(`${path}.currency`, "must be 'NPR'");
    const feats = p.features == null ? [] : p.features;
    if (!Array.isArray(feats) || feats.length > 20) fail(`${path}.features`, 'must be a list of at most 20 lines');
    const features = (Array.isArray(feats) ? feats.slice(0, 20) : []).map((f, j) => text(f, `${path}.features[${j}]`, 120)).filter(Boolean);
    const out = { id, name, price, currency: 'NPR', note: text(p.note, `${path}.note`, 160), features, highlight: p.highlight === true };
    return out;
  });
  const ids = plans.map((p) => p.id);
  if (new Set(ids).size !== ids.length) fail('plans', 'two plans have the same id');

  const c = o(d.contact);
  const phoneOf = (v, path) => {
    const s = text(v, path, 20);
    if (s && !PHONE_RE.test(s)) fail(path, 'must be a phone number (digits, spaces, + ( ) -)');
    return s;
  };
  const email = text(c.email, 'contact.email', 254);
  if (email && !EMAIL_RE.test(email)) fail('contact.email', 'must be an email address');
  const contact = { phone: phoneOf(c.phone, 'contact.phone'), whatsapp: phoneOf(c.whatsapp, 'contact.whatsapp'), email, address: text(c.address, 'contact.address', 300, true) };

  const h = o(d.hero);
  const hero = { title: text(h.title, 'hero.title', 120), subtitle: text(h.subtitle, 'hero.subtitle', 300, true) };

  const themeList = (v, path) => {
    if (v == null) return [];
    if (!Array.isArray(v) || v.length > 100 || !v.every((x) => typeof x === 'string' && SLUG_LIKE.test(x))) { fail(path, 'must be a list of theme slugs'); return []; }
    return [...new Set(v)].filter(isTheme); // themes that no longer exist are dropped quietly
  };
  const out = { plans, contact, hero, hiddenThemes: themeList(d.hiddenThemes, 'hiddenThemes'), featuredThemes: themeList(d.featuredThemes, 'featuredThemes') };
  if (errors.length) throw httpError(400, 'Please check the website settings.', { errors: errors.slice(0, 50) });
  return out;
}

/** The current settings (defaults merged in for anything missing). */
export async function readSite() {
  const s = await readJson(SITE_FILE, null);
  if (!s || typeof s !== 'object') return structuredClone(DEFAULTS);
  return { ...structuredClone(DEFAULTS), ...s };
}

/** GET /api/site (public) */
export async function getSite(req, res) {
  res.json(await readSite());
}

/** PUT /api/site (admin): the whole object, validated; returns what was stored. */
export async function putSite(req, res) {
  const clean = sanitizeSite(req.body);
  await withLock('site', () => writeJsonAtomic(SITE_FILE, clean));
  console.info('[admin] site settings saved');
  res.json(clean);
}

/**
 * GET /api/themes (public): ready themes for the website gallery, minus hiddenThemes. No page URLs: the theme
 * pages themselves are only served to the studios and to guests of a published invitation (lib/gate.js).
 */
export async function publicThemes(req, res) {
  const { hiddenThemes } = await readSite();
  const hidden = new Set(hiddenThemes);
  const out = [];
  for (const t of listThemes()) {
    if (!t.ready || hidden.has(t.slug)) continue;
    const m = await loadManifest(t.slug);
    out.push({ slug: t.slug, name: m?.name || t.name, concept: m?.description || t.concept, thumb: t.thumb, religions: m?.religions || ['hindu'] });
  }
  res.set('Cache-Control', 'no-cache');
  res.json(out);
}
