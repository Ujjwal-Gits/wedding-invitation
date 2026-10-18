// Public website settings: the 'site' document = { v, plans, paymentMethods, payRemark, contact, hero, hiddenThemes,
// featuredThemes, branding }. `branding` (lib/branding.js): the logos and the preview watermark's opacity. Prices live only here: orders and payments read them on the server, never from the browser.
// GET /api/site is public and returns a projection (enabled payment methods, no admin-only fields);
// GET /api/admin/site returns everything plus what each payment QR supports; PUT is the planner's, fully validated.
// v2 (October 2026): the four plans Saral, Shubha, Shahi and Custom (NPR and USD) and QR payment methods. Older
// documents are migrated on read (features kept where plan ids match) and stored as v2 on the next save.
// Markets (docs/PLATFORM.md "Markets"): the top-level hero, contact and featuredThemes are the Nepal website's (as
// before); `intl` holds what differs on the International website (hero, contact, which contact line leads), and
// `featuredThemesIntl`, `themeMarkets`, `themeStyles`, `themeOrder` are the Themes page's per-market choices. Each plan
// has `markets` (['np', 'intl'] when missing: offered on both). Every new key is optional: older documents read as
// they did.
import { resolve } from 'node:path';
import { DATA_DIR } from './env.js';
import { getDoc, putDoc } from './store.js'; // the 'site' document (SQLite, or data/site.json with STORE=json)
import { entity, sendEntity } from './http-cache.js';
import { isTheme, listThemes, TIERS, defaultTier, metaOf } from './catalog.js';
import { loadManifest } from './slots.js';
import { hasPerm } from './auth.js';
import { MARKETS, THEME_MARKETS, STYLES, themeFits } from './market.js';
import { defaultBranding, cleanBranding, brandingOf, publicBranding } from './branding.js'; // logos + watermark opacity

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
  { id: 'saral', name: 'Standard', nameNe: 'सरल', price: 2999, priceUsd: 49, from: false, currency: 'NPR', note: '',
    features: ['A ready-made design', 'Your names, date and venue', 'Guest replies (RSVP)', 'A link to share on WhatsApp'], highlight: false },
  { id: 'shubha', name: 'Pro', nameNe: 'शुभ', price: 4999, priceUsd: 99, from: false, currency: 'NPR', note: 'Most couples choose this',
    features: ['Everything in Standard', 'Photos and your story', 'Every ceremony with maps', 'Music and the opening scene'], highlight: true },
  { id: 'shahi', name: 'Pro Max', nameNe: 'शाही', price: 6999, priceUsd: 149, from: false, currency: 'NPR', note: '',
    features: ['Everything in Pro', 'Premium designs', 'Personal guest links', 'Priority help until the wedding'], highlight: false },
  { id: 'custom', name: 'Custom', nameNe: 'आफ्नै', price: 11111, priceUsd: 199, from: true, currency: 'NPR', note: 'A design made only for you',
    features: ['A design made for your wedding', 'Your colours, art and wording', 'Everything in Pro Max'], highlight: false },
];

// A plan's name in Nepali (`nameNe`, the website's small Nepali word beside each plan) arrived after the plans did:
// a stored plan without one gets the usual word for its id, so older documents read as before.
const PLAN_NE = { saral: 'सरल', shubha: 'शुभ', shahi: 'शाही', custom: 'आफ्नै' };
const nameNeOf = (p) => (typeof p?.nameNe === 'string' ? p.nameNe : PLAN_NE[p?.id] || '');

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
  themeTiers: {},
  intl: { hero: { title: '', subtitle: '' }, contact: { phone: '', whatsapp: '', email: '', address: '' }, lead: 'email' },
  featuredThemesIntl: [],
  themeMarkets: {},
  themeStyles: {},
  themeOrder: { np: [], intl: [] },
  branding: defaultBranding(),
};
export const CONTACT_LEADS = ['email', 'whatsapp', 'phone'];

// ── Markets of designs and plans (docs/API.md "Markets") ──
const catalogEntry = (slug) => listThemes().find((t) => t.slug === slug) || null;
/** A design's market after the planner's override: 'np' | 'intl' | 'both' (else the catalog's, else Nepal). */
export function themeMarketOf(slug, site, t = null) {
  if (THEME_MARKETS.includes(site?.themeMarkets?.[slug])) return site.themeMarkets[slug];
  const own = THEME_MARKETS.includes(t?.market) ? t.market : catalogEntry(slug)?.market ?? metaOf(slug).market;
  return THEME_MARKETS.includes(own) ? own : 'np';
}
/** A design's style after the planner's override ('' when none). */
export function themeStyleOf(slug, site, t = null) {
  if (STYLES.includes(site?.themeStyles?.[slug])) return site.themeStyles[slug];
  const own = STYLES.includes(t?.style) ? t.style : catalogEntry(slug)?.style ?? metaOf(slug).style;
  return STYLES.includes(own) ? own : '';
}
/** The markets a plan is offered on (both when the plan does not say). */
export const planMarkets = (plan) => (Array.isArray(plan?.markets) && plan.markets.some((m) => MARKETS.includes(m)) ? MARKETS.filter((m) => plan.markets.includes(m)) : [...MARKETS]);
export const planOffered = (plan, market) => planMarkets(plan).includes(market === 'intl' ? 'intl' : 'np');
/** The featured designs of one market's website. */
export const featuredOf = (site, market) => (market === 'intl' ? site.featuredThemesIntl || [] : site.featuredThemes || []);
/** Slugs in the planner's order for a market: the ones in themeOrder first (in that order), the rest as they came. */
export function orderedFor(slugs, site, market) {
  const at = new Map((site?.themeOrder?.[market === 'intl' ? 'intl' : 'np'] || []).map((s, i) => [s, i]));
  const rank = ([s, i]) => (at.has(s) ? at.get(s) : 1e6 + i);
  return slugs.map((s, i) => [s, i]).sort((a, b) => rank(a) - rank(b)).map(([s]) => s);
}

// ── Design tiers (docs/API.md "Design tiers"): a design's tier is the cheapest plan that includes it.
export const TIER_RANK = { saral: 1, shubha: 2, shahi: 3 };
const TIER_NAME = { saral: 'Saral', shubha: 'Shubha', shahi: 'Shahi' };
/** A tier's name as the website shows it: the name the planner gave the plan with that id (they can rename it). */
export const tierName = (tier, plans = []) => plans.find((p) => p.id === tier)?.name || TIER_NAME[tier] || tier;
/** The tier of a theme after the planner's overrides. */
export const tierOf = (slug, site) => (TIER_RANK[site?.themeTiers?.[slug]] ? site.themeTiers[slug] : defaultTier(slug));
/**
 * The highest tier a plan covers: saral, shubha, shahi by id; custom (and a plan with no price) everything; any other
 * plan by its price against the three tier plans.
 */
export function planIncludes(plan, plans = []) {
  if (!plan) return 'saral';
  if (TIER_RANK[plan.id]) return plan.id;
  if (plan.id === 'custom' || !Number.isInteger(plan.price)) return 'shahi';
  let best = 'saral';
  for (const t of TIERS) {
    const p = plans.find((x) => x.id === t);
    if (p && Number.isInteger(p.price) && p.price <= plan.price) best = t;
  }
  return best;
}
/** null when the plan includes the theme, else { needs, error } for the customer. */
export function tierProblem(site, plan, slug, themeName = slug) {
  const need = tierOf(slug, site);
  if (TIER_RANK[planIncludes(plan, site.plans)] >= TIER_RANK[need]) return null;
  return { needs: need, error: `The ${themeName} design needs the ${tierName(need, site.plans)} plan or above.` };
}

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
    const nameNe = p.nameNe === undefined ? nameNeOf({ id: p.id }) : text(p.nameNe, `${path}.nameNe`, 40); // optional
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
    // the markets the plan is offered on: missing means both (older documents); an empty list is refused
    let markets = [...MARKETS];
    if (p.markets != null) {
      if (!Array.isArray(p.markets) || !p.markets.length || !p.markets.every((m) => MARKETS.includes(m))) fail(`${path}.markets`, "must list 'np' and/or 'intl'");
      else markets = MARKETS.filter((m) => p.markets.includes(m));
    }
    return { id, name, nameNe, price, priceUsd, from: p.from === true, currency: 'NPR', note: text(p.note, `${path}.note`, 160), features, highlight: p.highlight === true, markets };
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

  const heroOf = (v, path) => { const x = o(v); return { title: text(x.title, `${path}.title`, 120), subtitle: text(x.subtitle, `${path}.subtitle`, 300, true) }; };
  const hero = heroOf(d.hero, 'hero');

  // The International website: its own headline and contact lines; empty fields fall back to Nepal's (marketView).
  const ii = o(d.intl);
  const ic = o(ii.contact);
  const iEmail = text(ic.email, 'intl.contact.email', 254);
  if (iEmail && !EMAIL_RE.test(iEmail)) fail('intl.contact.email', 'must be an email address');
  const iWa = phoneOf(ic.whatsapp, 'intl.contact.whatsapp');
  const iWhatsapp = iWa ? e164(iWa) : '';
  if (iWa && !iWhatsapp) fail('intl.contact.whatsapp', 'must be a full WhatsApp number with the country code, e.g. +1 …');
  const lead = ii.lead == null || ii.lead === '' ? 'email' : CONTACT_LEADS.includes(ii.lead) ? ii.lead : (fail('intl.lead', `must be one of ${CONTACT_LEADS.join(', ')}`), 'email');
  const intl = {
    hero: heroOf(ii.hero, 'intl.hero'),
    contact: { phone: phoneOf(ic.phone, 'intl.contact.phone'), whatsapp: iWhatsapp, email: iEmail, address: text(ic.address, 'intl.contact.address', 300, true) },
    lead,
  };

  const themeList = (v, path) => {
    if (v == null) return [];
    if (!Array.isArray(v) || v.length > 100 || !v.every((x) => typeof x === 'string' && SLUG_LIKE.test(x))) { fail(path, 'must be a list of theme slugs'); return []; }
    return [...new Set(v)].filter(isTheme); // themes that no longer exist are dropped quietly
  };
  // Tier overrides: { slug: 'saral'|'shubha'|'shahi' }; themes that no longer exist are dropped quietly.
  const themeTiers = {};
  if (d.themeTiers != null) {
    const tt = d.themeTiers;
    if (!tt || typeof tt !== 'object' || Array.isArray(tt) || Object.keys(tt).length > 100) fail('themeTiers', 'must be an object of theme slug: tier');
    else {
      for (const [slug, tier] of Object.entries(tt)) {
        if (!SLUG_LIKE.test(slug)) { fail(`themeTiers.${slug.slice(0, 40)}`, 'is not a theme slug'); continue; }
        if (!TIER_RANK[tier]) { fail(`themeTiers.${slug}`, "must be 'saral', 'shubha' or 'shahi'"); continue; }
        if (isTheme(slug)) themeTiers[slug] = tier;
      }
    }
  }
  // Per-design market and style overrides: { slug: 'np'|'intl'|'both' }, { slug: style }; '' clears one (back to the
  // catalog's); designs that no longer exist are dropped quietly.
  const overrides = (key, allowed) => {
    const res = {};
    const v = d[key];
    if (v == null) return res;
    if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length > 100) { fail(key, 'must be an object of theme slug: value'); return res; }
    for (const [slug, x] of Object.entries(v)) {
      if (!SLUG_LIKE.test(slug)) { fail(`${key}.${slug.slice(0, 40)}`, 'is not a theme slug'); continue; }
      if (x === '' || x == null) continue;
      if (!allowed.includes(x)) { fail(`${key}.${slug}`, `must be one of ${allowed.join(', ')}`); continue; }
      if (isTheme(slug)) res[slug] = x;
    }
    return res;
  };
  const to = o(d.themeOrder);
  const out = {
    v: SITE_V, plans, paymentMethods, payRemark, contact, hero, hiddenThemes: themeList(d.hiddenThemes, 'hiddenThemes'), featuredThemes: themeList(d.featuredThemes, 'featuredThemes'), themeTiers,
    intl, featuredThemesIntl: themeList(d.featuredThemesIntl, 'featuredThemesIntl'),
    themeMarkets: overrides('themeMarkets', THEME_MARKETS), themeStyles: overrides('themeStyles', STYLES),
    themeOrder: { np: themeList(to.np, 'themeOrder.np'), intl: themeList(to.intl, 'themeOrder.intl') },
    branding: cleanBranding(d.branding, fail),
  };
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

/** The parts of the site document the Themes page owns; everything else is the Website page's. */
const THEME_KEYS = ['hiddenThemes', 'featuredThemes', 'themeTiers', 'featuredThemesIntl', 'themeMarkets', 'themeStyles', 'themeOrder'];

/**
 * PUT /api/site sends the whole document. An admin with only one of the 'themes' / 'website' permissions changes only
 * their part: the other part is taken from what is stored, whatever the browser sent.
 */
async function scopedBody(req) {
  const b = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const themes = hasPerm(req, 'themes');
  const website = hasPerm(req, 'website');
  if (!req.admin || (themes && website)) return b; // no admin: a direct call (scripts, tests); the route checks admins
  const cur = await readSite();
  const out = { ...b };
  for (const k of Object.keys(out)) if (THEME_KEYS.includes(k) ? !themes : !website) delete out[k];
  for (const k of Object.keys(cur)) if ((THEME_KEYS.includes(k) ? !themes : !website) && cur[k] !== undefined) out[k] = cur[k];
  return out;
}

/** The current settings (defaults merged in for anything missing; older documents migrated). */
export async function readSite() {
  return merged((await getDoc('site'))?.value);
}
function merged(s) {
  const d = structuredClone(DEFAULTS);
  for (const p of d.plans) p.markets = planMarkets(p);
  if (!s || typeof s !== 'object') return d;
  const out = { ...d, ...s };
  if (s.v !== SITE_V) { out.plans = migratePlans(s.plans); out.v = SITE_V; }
  else out.plans = (Array.isArray(s.plans) ? s.plans : []).map((p) => ({ ...p, nameNe: nameNeOf(p), priceUsd: p.priceUsd ?? p.usdPrice ?? null, from: p.from === true }));
  for (const p of out.plans) { delete p.usdPrice; p.markets = planMarkets(p); }
  if (!Array.isArray(s.paymentMethods)) out.paymentMethods = d.paymentMethods;
  if (typeof s.payRemark !== 'string' || !s.payRemark) out.payRemark = d.payRemark;
  if (!s.themeTiers || typeof s.themeTiers !== 'object' || Array.isArray(s.themeTiers)) out.themeTiers = {};
  for (const k of ['themeMarkets', 'themeStyles']) if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) out[k] = {};
  if (!Array.isArray(s.featuredThemesIntl)) out.featuredThemesIntl = [];
  const so = s.themeOrder && typeof s.themeOrder === 'object' ? s.themeOrder : {};
  out.themeOrder = { np: Array.isArray(so.np) ? so.np : [], intl: Array.isArray(so.intl) ? so.intl : [] };
  const si = s.intl && typeof s.intl === 'object' ? s.intl : {};
  out.intl = { hero: { ...d.intl.hero, ...(si.hero || {}) }, contact: { ...d.intl.contact, ...(si.contact || {}) }, lead: CONTACT_LEADS.includes(si.lead) ? si.lead : 'email' };
  out.branding = brandingOf(s.branding);
  const c = s.contact && typeof s.contact === 'object' ? s.contact : {};
  // Nothing saved yet: the owner's official contact. Anything the admin saved is kept as it is.
  out.contact = !c.phone && !c.whatsapp && !c.email ? { ...DEFAULT_CONTACT, address: c.address || '' } : { ...d.contact, ...c };
  return out;
}

/** The public part of the settings: enabled payment methods only, and only what a visitor needs. */
export function publicSite(s) {
  const named = renamer(s.plans);
  return {
    plans: s.plans.map((p) => ({ id: p.id, name: p.name, nameNe: nameNeOf(p), price: p.price ?? null, priceUsd: p.priceUsd ?? null, from: p.from === true, currency: 'NPR', note: named(p.note || ''), features: (p.features || []).map(named), highlight: p.highlight === true, includes: planIncludes(p, s.plans), markets: planMarkets(p) })),
    paymentMethods: publicMethods(s),
    contact: s.contact,
    hero: s.hero,
    hiddenThemes: s.hiddenThemes,
    featuredThemes: s.featuredThemes,
    // per market, ready to use (docs/API.md "Markets"); the International website's empty fields fall back to Nepal's
    markets: { np: marketView(s, 'np'), intl: marketView(s, 'intl') },
    branding: publicBranding(s.branding), // logos ('' = the bundled ones) and the preview watermark's opacity
  };
}
/** One market's website settings: headline, contact (and which line leads), plans offered, featured designs, order. */
export function marketView(s, market) {
  const intl = market === 'intl';
  const ic = s.intl?.contact || {};
  return {
    hero: intl ? { title: s.intl?.hero?.title || '', subtitle: s.intl?.hero?.subtitle || '' } : s.hero,
    contact: intl ? { phone: ic.phone || s.contact.phone || '', whatsapp: ic.whatsapp || s.contact.whatsapp || '', email: ic.email || s.contact.email || '', address: ic.address || '' } : s.contact,
    lead: intl ? s.intl?.lead || 'email' : 'whatsapp',
    currency: intl ? 'USD' : 'NPR',
    plans: s.plans.filter((p) => planOffered(p, market)).map((p) => p.id),
    featuredThemes: featuredOf(s, market),
    themeOrder: s.themeOrder?.[market] || [],
  };
}
/**
 * Feature lines and notes written with the first plan names ("Everything in Saral") follow a renamed plan
 * ("Everything in Standard") on the website, so the planner never has to hunt for the old names.
 */
function renamer(plans) {
  const map = new Map();
  for (const [id, old] of Object.entries(TIER_NAME)) {
    const now = plans.find((p) => p.id === id)?.name;
    if (now && now !== old) map.set(old, now);
  }
  if (!map.size) return (t) => t;
  // only "in Saral" / "than Shubha" ...: "Shubha" alone is also a wedding word (Shubha Bibaha)
  const re = new RegExp(`\\b(in|than|of|from|to) (${[...map.keys()].join('|')})\\b`, 'g');
  return (t) => String(t).replace(re, (m, pre, w) => `${pre} ${map.get(w)}`);
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
let themesEntity = { rev: -1, at: 0, e: {} }; // e: { all, np, intl } (?market=)

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
  const clean = sanitizeSite(await scopedBody(req));
  await putDoc('site', clean);
  siteEntity = { rev: -1, e: null };
  themesEntity = { rev: -1, at: 0, e: {} };
  console.info('[admin] site settings saved');
  res.json(await adminView(clean));
}

/**
 * One website's contact lines (email, phone, WhatsApp, address) from the studio's Content page, validated exactly as
 * PUT /api/site (400 with `errors` under `contact.` or `intl.contact.`). Nothing is written when nothing changed.
 */
export async function saveContact(market, c) {
  const cur = await readSite();
  const o = c && typeof c === 'object' && !Array.isArray(c) ? c : {};
  const next = { phone: o.phone ?? '', whatsapp: o.whatsapp ?? '', email: o.email ?? '', address: o.address ?? '' };
  const draft = structuredClone(cur);
  if (market === 'intl') draft.intl = { ...draft.intl, contact: next };
  else draft.contact = next;
  const clean = sanitizeSite(draft);
  const before = JSON.stringify(market === 'intl' ? cur.intl?.contact : cur.contact);
  const after = JSON.stringify(market === 'intl' ? clean.intl.contact : clean.contact);
  if (before === after) return clean;
  await putDoc('site', clean);
  siteEntity = { rev: -1, e: null };
  themesEntity = { rev: -1, at: 0, e: {} };
  return clean;
}

/**
 * GET /api/themes (public): ready themes for the website gallery, minus hiddenThemes. No page URLs: the theme
 * pages themselves are only served to the studios and to guests of a published invitation (lib/gate.js).
 */
export async function publicThemes(req, res) {
  const d = await getDoc('site');
  const rev = d?.rev ?? 0;
  // ?market=np|intl: that market's designs first ('both' included), in the planner's order, each with `featured`;
  // then every other design (all designs show on both sites, only the order differs)
  const market = req.query?.market === 'intl' || req.query?.market === 'np' ? req.query.market : '';
  const key = market || 'all';
  const fresh = themesEntity.rev === rev && Date.now() - themesEntity.at < 10_000;
  if (fresh && themesEntity.e[key]) {
    res.set('Cache-Control', 'no-cache');
    return sendEntity(req, res, themesEntity.e[key]);
  }
  if (!fresh) themesEntity = { rev, at: Date.now(), e: {} };
  const s = merged(d?.value);
  const { hiddenThemes } = s;
  const hidden = new Set(hiddenThemes);
  let out = [];
  for (const t of listThemes()) {
    if (!t.ready || hidden.has(t.slug)) continue;
    const tm = themeMarketOf(t.slug, s, t);
    const m = await loadManifest(t.slug);
    // the design's own metadata (catalog: market, style, faith, occasions), then the admin's per-site overrides
    out.push({ slug: t.slug, name: m?.name || t.name, concept: m?.description || t.concept, thumb: t.thumb, religions: m?.religions || ['hindu'], tier: tierOf(t.slug, s), ...metaOf(t.slug, m), market: tm, style: themeStyleOf(t.slug, s, t) });
  }
  if (market) {
    const feat = new Set(featuredOf(s, market));
    const by = new Map(out.map((x) => [x.slug, x]));
    const own = out.filter((x) => themeFits(x.market, market)).map((x) => x.slug);
    const rest = out.filter((x) => !themeFits(x.market, market)).map((x) => ({ ...x, featured: false }));
    out = [...orderedFor(own, s, market).map((slug) => ({ ...by.get(slug), featured: feat.has(slug) })), ...rest];
  }
  themesEntity.e[key] = entity(JSON.stringify(out), 'application/json; charset=utf-8');
  res.set('Cache-Control', 'no-cache');
  return sendEntity(req, res, themesEntity.e[key]);
}
