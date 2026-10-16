// Public website settings: the 'site' document = { v, plans, paymentMethods, payRemark, contact, hero, hiddenThemes,
// featuredThemes }. Prices live only here: orders and payments read them on the server, never from the browser.
// GET /api/site is public and returns a projection (enabled payment methods, no admin-only fields);
// GET /api/admin/site returns everything plus what each payment QR supports; PUT is the planner's, fully validated.
// v2 (October 2026): the four plans Saral, Shubha, Shahi and Custom (NPR and USD) and QR payment methods. Older
// documents are migrated on read (features kept where plan ids match) and stored as v2 on the next save.
import { resolve } from 'node:path';
import { DATA_DIR } from './env.js';
import { getDoc, putDoc } from './store.js'; // the 'site' document (SQLite, or data/site.json with STORE=json)
import { entity, sendEntity } from './http-cache.js';
import { isTheme, listThemes } from './catalog.js';
import { loadManifest } from './slots.js';

export const SITE_FILE = resolve(DATA_DIR, 'site.json');
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;
const PHONE_RE = /^[0-9+()\-\s]{6,20}$/;
export const EMAIL_RE = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;
const PLAN_ID_RE = /^[a-z0-9-]{1,32}$/;
const SLUG_LIKE = /^[a-z][a-z0-9-]{1,30}$/;
export const METHOD_KINDS = ['khalti', 'esewa', 'bank', 'paypal', 'other'];
export const METHOD_ID_RE = /^[a-z0-9-]{1,32}$/;
// A QR image is one of the shipped defaults (public/site/pay) or one the admin uploaded (lib/payments/manual.js).
export const QR_URL_RE = /^\/(?:site\/pay\/[a-z0-9-]{1,32}|uploads\/_site\/pay\/[A-Za-z0-9_-]{24})\.png$/;
const PAYPALME_RE = /^[A-Za-z0-9]{1,40}$/;
const SITE_V = 2;

const DEFAULT_PLANS = [
  { id: 'saral', name: 'Saral', price: 2999, priceUsd: 49, from: false, currency: 'NPR', note: '',
    features: ['A ready-made design', 'Your names, date and venue', 'Guest replies (RSVP)', 'A link to share on WhatsApp'], highlight: false },
  { id: 'shubha', name: 'Shubha', price: 4999, priceUsd: 99, from: false, currency: 'NPR', note: 'Most couples choose this',
    features: ['Everything in Saral', 'Photos and your story', 'Every ceremony with maps', 'Music and the opening scene'], highlight: true },
  { id: 'shahi', name: 'Shahi', price: 6999, priceUsd: 149, from: false, currency: 'NPR', note: '',
    features: ['Everything in Shubha', 'Premium designs', 'Personal guest links', 'Priority help until the wedding'], highlight: false },
  { id: 'custom', name: 'Custom', price: 11111, priceUsd: 199, from: true, currency: 'NPR', note: 'A design made only for you',
    features: ['A design made for your wedding', 'Your colours, art and wording', 'Everything in Shahi'], highlight: false },
];

const DEFAULT_METHODS = [
  { id: 'khalti', label: 'Khalti', kind: 'khalti', currency: 'NPR', accountName: 'Roshan Shrestha', accountHint: '', qr: '/site/pay/khalti.png', note: '', enabled: true, order: 0, autoAmount: false, paypalMe: '' },
  { id: 'esewa', label: 'eSewa', kind: 'esewa', currency: 'NPR', accountName: 'Roshan Shrestha', accountHint: '', qr: '/site/pay/esewa.png', note: '', enabled: true, order: 1, autoAmount: false, paypalMe: '' },
  { id: 'nabil', label: 'Nabil Bank', kind: 'bank', currency: 'NPR', accountName: 'Roshan Shrestha', accountHint: '', qr: '/site/pay/nabil.png', note: 'Scan with any bank app (Fonepay / NepalPay)', enabled: true, order: 2, autoAmount: true, paypalMe: '' },
  { id: 'paypal', label: 'PayPal', kind: 'paypal', currency: 'USD', accountName: 'Bijaya Gurung', accountHint: '', qr: '/site/pay/paypal.png', note: 'For payments from abroad, in US dollars', enabled: true, order: 3, autoAmount: false, paypalMe: '' },
];

// The owner's official contact (used while nothing is saved): the customer's "Message us on WhatsApp" goes here.
const DEFAULT_CONTACT = { phone: '+977 980-6393298', whatsapp: '+9779806393298', email: 'nimttoz@gmail.com', address: '' };

const DEFAULTS = {
  v: SITE_V,
  plans: DEFAULT_PLANS,
  paymentMethods: DEFAULT_METHODS,
  payRemark: 'Nimtto {ref}',
  contact: DEFAULT_CONTACT,
  hero: { title: '', subtitle: '' },
  hiddenThemes: [],
  featuredThemes: [],
};

/** A WhatsApp number in E.164 form ('+9779806393298'), or '' when it is not one. Nepali mobiles get +977. */
export function e164(v) {
  let d = String(v || '').replace(/[^\d+]/g, '');
  const plus = d.startsWith('+');
  d = d.replace(/\D/g, '');
  if (!plus && /^9[78]\d{8}$/.test(d)) d = `977${d}`;
  else if (!plus && d.startsWith('00')) d = d.slice(2);
  return /^\d{8,15}$/.test(d) ? `+${d}` : '';
}

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
    // Price in US dollars (PayPal, buyers abroad). `usdPrice` is the old name, still accepted.
    const usdIn = p.priceUsd !== undefined ? p.priceUsd : p.usdPrice;
    let priceUsd = null;
    if (usdIn != null && usdIn !== '') {
      const n = typeof usdIn === 'string' && /^\d{1,5}(\.\d{1,2})?$/.test(usdIn.trim()) ? Number(usdIn.trim()) : usdIn;
      if (typeof n === 'number' && Number.isFinite(n) && n >= 1 && n <= 10_000 && Math.abs(Math.round(n * 100) - n * 100) < 1e-6) priceUsd = Math.round(n * 100) / 100;
      else fail(`${path}.priceUsd`, 'must be US dollars from 1 to 10000 with at most two decimals, or empty');
    }
    const feats = p.features == null ? [] : p.features;
    if (!Array.isArray(feats) || feats.length > 20) fail(`${path}.features`, 'must be a list of at most 20 lines');
    const features = (Array.isArray(feats) ? feats.slice(0, 20) : []).map((f, j) => text(f, `${path}.features[${j}]`, 120)).filter(Boolean);
    return { id, name, price, priceUsd, from: p.from === true, currency: 'NPR', note: text(p.note, `${path}.note`, 160), features, highlight: p.highlight === true };
  });
  const ids = plans.map((p) => p.id);
  if (new Set(ids).size !== ids.length) fail('plans', 'two plans have the same id');

  // Payment methods: shown as QR codes on the website and the customer's pay page, in this order.
  const methodsIn = d.paymentMethods == null ? [] : d.paymentMethods;
  if (!Array.isArray(methodsIn) || methodsIn.length > 12) fail('paymentMethods', 'must be a list of at most 12 methods');
  const paymentMethods = (Array.isArray(methodsIn) ? methodsIn.slice(0, 12) : [])
    .map((raw, i) => ({ raw: o(raw), i, order: Number.isInteger(o(raw).order) ? o(raw).order : i }))
    .sort((a, b) => a.order - b.order || a.i - b.i)
    .map(({ raw: m, i }, k) => {
      const path = `paymentMethods[${i}]`;
      const id = typeof m.id === 'string' && METHOD_ID_RE.test(m.id) ? m.id : (fail(`${path}.id`, 'must be 1-32 lowercase letters, digits or hyphens'), '');
      const label = text(m.label, `${path}.label`, 40);
      if (!label) fail(`${path}.label`, 'is required');
      const kind = METHOD_KINDS.includes(m.kind) ? m.kind : (fail(`${path}.kind`, `must be one of ${METHOD_KINDS.join(', ')}`), 'other');
      const currency = m.currency === 'USD' || m.currency === 'NPR' ? m.currency : (fail(`${path}.currency`, "must be 'NPR' or 'USD'"), 'NPR');
      const qr = m.qr == null || m.qr === '' ? '' : typeof m.qr === 'string' && QR_URL_RE.test(m.qr) ? m.qr : (fail(`${path}.qr`, 'must be an uploaded QR image'), '');
      const paypalMe = text(m.paypalMe, `${path}.paypalMe`, 40).replace(/^(?:https?:\/\/)?(?:www\.)?(?:paypal\.me|paypal\.com\/paypalme)\//i, '').replace(/\/.*$/, '');
      if (paypalMe && !PAYPALME_RE.test(paypalMe)) fail(`${path}.paypalMe`, 'must be a PayPal.me name (letters and digits)');
      return {
        id, label, kind, currency,
        accountName: text(m.accountName, `${path}.accountName`, 80),
        accountHint: text(m.accountHint, `${path}.accountHint`, 60), // optional: a wallet id, phone or account number
        qr,
        note: text(m.note, `${path}.note`, 160),
        enabled: m.enabled !== false,
        order: k,
        autoAmount: m.autoAmount === true,
        paypalMe: kind === 'paypal' ? paypalMe : '',
      };
    });
  const mids = paymentMethods.map((m) => m.id);
  if (new Set(mids).size !== mids.length) fail('paymentMethods', 'two payment methods have the same id');

  // The remark put into the QR / shown to type: printable ASCII, {ref} {plan} {name} placeholders.
  const payRemark = text(d.payRemark, 'payRemark', 40) || DEFAULTS.payRemark;
  if (!/^[\x20-\x7E]*$/.test(payRemark)) fail('payRemark', 'must use plain letters, digits and punctuation (no Nepali script: bank apps cannot show it)');
  else if (!payRemark.includes('{ref}')) fail('payRemark', 'must contain {ref}, so you can match each payment to its order');

  const c = o(d.contact);
  const phoneOf = (v, path) => {
    const s = text(v, path, 20);
    if (s && !PHONE_RE.test(s)) fail(path, 'must be a phone number (digits, spaces, + ( ) -)');
    return s;
  };
  const email = text(c.email, 'contact.email', 254);
  if (email && !EMAIL_RE.test(email)) fail('contact.email', 'must be an email address');
  const wa = phoneOf(c.whatsapp, 'contact.whatsapp');
  const whatsapp = wa ? e164(wa) : '';
  if (wa && !whatsapp) fail('contact.whatsapp', 'must be a full WhatsApp number, e.g. +977 98…');
  const contact = { phone: phoneOf(c.phone, 'contact.phone'), whatsapp, email, address: text(c.address, 'contact.address', 300, true) };

  const h = o(d.hero);
  const hero = { title: text(h.title, 'hero.title', 120), subtitle: text(h.subtitle, 'hero.subtitle', 300, true) };

  const themeList = (v, path) => {
    if (v == null) return [];
    if (!Array.isArray(v) || v.length > 100 || !v.every((x) => typeof x === 'string' && SLUG_LIKE.test(x))) { fail(path, 'must be a list of theme slugs'); return []; }
    return [...new Set(v)].filter(isTheme); // themes that no longer exist are dropped quietly
  };
  const out = { v: SITE_V, plans, paymentMethods, payRemark, contact, hero, hiddenThemes: themeList(d.hiddenThemes, 'hiddenThemes'), featuredThemes: themeList(d.featuredThemes, 'featuredThemes') };
  if (errors.length) throw httpError(400, 'Please check the website settings.', { errors: errors.slice(0, 50) });
  return out;
}

/** Plans from before v2 become the four default plans; a stored plan with the same id keeps its feature lines. */
function migratePlans(old) {
  const byId = new Map((Array.isArray(old) ? old : []).filter((p) => p && typeof p.id === 'string').map((p) => [p.id, p]));
  return DEFAULT_PLANS.map((p) => {
    const was = byId.get(p.id);
    const feats = Array.isArray(was?.features) ? was.features.filter((f) => typeof f === 'string' && f.trim()) : [];
    return { ...structuredClone(p), features: feats.length ? feats : [...p.features] };
  });
}

/** The current settings (defaults merged in for anything missing; older documents migrated). */
export async function readSite() {
  return merged((await getDoc('site'))?.value);
}
function merged(s) {
  const d = structuredClone(DEFAULTS);
  if (!s || typeof s !== 'object') return d;
  const out = { ...d, ...s };
  if (s.v !== SITE_V) { out.plans = migratePlans(s.plans); out.v = SITE_V; }
  else out.plans = (Array.isArray(s.plans) ? s.plans : []).map((p) => ({ ...p, priceUsd: p.priceUsd ?? p.usdPrice ?? null, from: p.from === true }));
  for (const p of out.plans) delete p.usdPrice;
  if (!Array.isArray(s.paymentMethods)) out.paymentMethods = d.paymentMethods;
  if (typeof s.payRemark !== 'string' || !s.payRemark) out.payRemark = d.payRemark;
  const c = s.contact && typeof s.contact === 'object' ? s.contact : {};
  // Nothing saved yet: the owner's official contact. Anything the admin saved is kept as it is.
  out.contact = !c.phone && !c.whatsapp && !c.email ? { ...DEFAULT_CONTACT, address: c.address || '' } : { ...d.contact, ...c };
  return out;
}

/** The public part of the settings: enabled payment methods only, and only what a visitor needs. */
export function publicSite(s) {
  return {
    plans: s.plans.map((p) => ({ id: p.id, name: p.name, price: p.price ?? null, priceUsd: p.priceUsd ?? null, from: p.from === true, currency: 'NPR', note: p.note || '', features: p.features || [], highlight: p.highlight === true })),
    paymentMethods: publicMethods(s),
    contact: s.contact,
    hero: s.hero,
    hiddenThemes: s.hiddenThemes,
    featuredThemes: s.featuredThemes,
  };
}
/** Enabled methods in order, without admin-only fields; accountHint/note only when filled in. */
export function publicMethods(s) {
  return s.paymentMethods.filter((m) => m.enabled !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((m) => {
    const out = { id: m.id, label: m.label, kind: m.kind, currency: m.currency, accountName: m.accountName || '', qr: m.qr || '' };
    if (m.accountHint) out.accountHint = m.accountHint;
    if (m.note) out.note = m.note;
    return out;
  });
}

// Public answers built once per settings revision (and, for the theme list, at most every 10 s, since manifests
// can change on disk in development), served from memory with an ETag.
let siteEntity = { rev: -1, e: null };
let themesEntity = { rev: -1, at: 0, e: null };

/** GET /api/site (public) */
export async function getSite(req, res) {
  const d = await getDoc('site');
  const rev = d?.rev ?? 0;
  if (siteEntity.rev !== rev || !siteEntity.e) siteEntity = { rev, e: entity(JSON.stringify(publicSite(merged(d?.value))), 'application/json; charset=utf-8') };
  res.set('Cache-Control', 'no-cache');
  return sendEntity(req, res, siteEntity.e);
}

// What each method's QR supports (lib/payments/manual.js registers this, so site.js does not import the QR code).
let describeMethods = async (methods) => methods;
export const setMethodDescriber = (fn) => { describeMethods = fn; };

/** Everything, for the dashboard: methods carry `qrInfo` (format, whether the amount fills in). */
async function adminView(s) {
  return { ...s, paymentMethods: await describeMethods(s.paymentMethods) };
}

/** GET /api/admin/site (admin) */
export async function getAdminSite(req, res) {
  res.json(await adminView(await readSite()));
}

/** PUT /api/site (admin): the whole object, validated; returns what was stored (as GET /api/admin/site). */
export async function putSite(req, res) {
  const clean = sanitizeSite(req.body);
  await putDoc('site', clean);
  siteEntity = { rev: -1, e: null };
  themesEntity = { rev: -1, at: 0, e: null };
  console.info('[admin] site settings saved');
  res.json(await adminView(clean));
}

/**
 * GET /api/themes (public): ready themes for the website gallery, minus hiddenThemes. No page URLs: the theme
 * pages themselves are only served to the studios and to guests of a published invitation (lib/gate.js).
 */
export async function publicThemes(req, res) {
  const d = await getDoc('site');
  const rev = d?.rev ?? 0;
  if (themesEntity.e && themesEntity.rev === rev && Date.now() - themesEntity.at < 10_000) {
    res.set('Cache-Control', 'no-cache');
    return sendEntity(req, res, themesEntity.e);
  }
  const { hiddenThemes } = merged(d?.value);
  const hidden = new Set(hiddenThemes);
  const out = [];
  for (const t of listThemes()) {
    if (!t.ready || hidden.has(t.slug)) continue;
    const m = await loadManifest(t.slug);
    out.push({ slug: t.slug, name: m?.name || t.name, concept: m?.description || t.concept, thumb: t.thumb, religions: m?.religions || ['hindu'] });
  }
  themesEntity = { rev, at: Date.now(), e: entity(JSON.stringify(out), 'application/json; charset=utf-8') };
  res.set('Cache-Control', 'no-cache');
  return sendEntity(req, res, themesEntity.e);
}
