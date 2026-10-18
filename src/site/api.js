// The website's API layer (docs/API.md): site settings, the design list, orders and the payment step.
// The static fallback (themes.js) covers an API that is down. In development only, while the server does not
// speak the payment contract yet (no `paymentMethods` in /api/site), orders and payments run against a small
// mock kept in this browser's localStorage, so the whole flow can be built and tested. Production never mocks.
import { FALLBACK_SITE, THEMES, BY_SLUG, TIER_RANK, PLAN_NE, tierOf } from './themes.js';
import { INTL_THEMES, INTL_BY_SLUG, intlAsNp } from './intl-designs.js';
import { SLUG_RE, str, localPath } from './common.js';

export const REF_RE = /^[A-Za-z0-9_-]{3,40}$/;
const DEV = import.meta.env.DEV;

export async function getJson(url, ms = 6000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctl.signal, credentials: 'same-origin' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; } finally { clearTimeout(t); }
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const num = (v, min, max) => (Number.isFinite(v) && v >= min && v <= max ? v : null);

function normPlan(p) {
  if (!isObj(p)) return null;
  const id = str(p.id, 32);
  if (!/^[a-z0-9-]{1,32}$/.test(id)) return null;
  return {
    id,
    name: str(p.name, 60) || id,
    nameNe: typeof p.nameNe === 'string' ? str(p.nameNe, 40) : (PLAN_NE[id] || ''), // '' when the planner cleared it
    price: num(p.price, 0, 10_000_000),
    priceUsd: num(p.priceUsd ?? p.usdPrice, 0, 10_000),
    from: Boolean(p.from),
    note: str(p.note, 160),
    features: Array.isArray(p.features) ? p.features.map((f) => str(f, 120)).filter(Boolean).slice(0, 20) : [],
    highlight: Boolean(p.highlight),
    includes: TIER_RANK[p.includes] ? p.includes : (id === 'custom' || p.from ? 'shahi' : TIER_RANK[id] ? id : 'shahi'),
    // the markets the plan is offered on (docs/API.md "Markets"); missing: both
    markets: Array.isArray(p.markets) && p.markets.some((m) => m === 'np' || m === 'intl') ? p.markets.filter((m) => m === 'np' || m === 'intl') : ['np', 'intl'],
  };
}
/** the plans offered on one market */
export const plansFor = (site, market) => (site?.plans || []).filter((p) => p.markets.includes(market === 'intl' ? 'intl' : 'np'));
/** one market's contact (GET /api/site `markets`): the International website falls back to Nepal's on the server */
function marketContact(raw, market) {
  const c = raw?.markets?.[market]?.contact;
  return isObj(c) && Object.values(c).some(Boolean) ? c : null;
}
function normMethod(m) {
  if (!isObj(m)) return null;
  const id = str(m.id, 32);
  if (!/^[a-z0-9-]{1,32}$/.test(id)) return null;
  return {
    id,
    label: str(m.label, 60) || id,
    kind: str(m.kind, 20),
    currency: m.currency === 'USD' ? 'USD' : 'NPR',
    accountName: str(m.accountName, 120),
    accountHint: str(m.accountHint, 160),
    qr: localPath(m.qr, ''),
    note: str(m.note, 240),
  };
}

/** GET /api/site, cleaned. `mock` is true in development while the server lacks the payment contract. */
/** The visitor's currency: NPR in Nepal, USD anywhere else (GET /api/geo); unknown → the site's own (Nepal: NPR). */
let geoLoad = null;
function visitorCurrency() {
  geoLoad ||= getJson('/api/geo', 2500).then((g) => (g && (g.currency === 'NPR' || g.currency === 'USD') ? g.currency : null)).catch(() => null);
  return geoLoad;
}
const SITE_MARKET = typeof document !== 'undefined' && document.body?.classList.contains('market-intl') ? 'intl' : 'np';

export async function loadSite() {
  const [raw, geo] = await Promise.all([getJson('/api/site', 4000), visitorCurrency()]);
  const currency = geo || (SITE_MARKET === 'intl' ? 'USD' : 'NPR');
  const live = isObj(raw);
  const contract = live && Array.isArray(raw.paymentMethods);
  const src = live && (contract || !DEV) ? raw : FALLBACK_SITE;
  const plans = (Array.isArray(src.plans) ? src.plans : []).map(normPlan).filter(Boolean).slice(0, 8);
  const methods = (Array.isArray(src.paymentMethods) ? src.paymentMethods : []).map(normMethod).filter(Boolean);
  const contact = isObj(src.contact) ? src.contact : {};
  return {
    live,
    mock: DEV && !contract,
    plans: plans.length ? plans : FALLBACK_SITE.plans.map(normPlan),
    paymentMethods: methods.length ? methods : FALLBACK_SITE.paymentMethods.map(normMethod),
    contact: Object.values(contact).some(Boolean) ? contact : FALLBACK_SITE.contact,
    contactIntl: marketContact(src, 'intl'),
    hero: isObj(raw?.hero) ? raw.hero : {},
    hiddenThemes: Array.isArray(raw?.hiddenThemes) ? raw.hiddenThemes : [],
    featuredThemes: Array.isArray(raw?.featuredThemes) ? raw.featuredThemes : [],
    // prices and payment follow where the visitor is: Nepal → Rs + QR; anywhere else → $ + card/PayPal
    currency,
    buyerMarket: currency === 'USD' ? 'intl' : 'np',
  };
}

const FAITH_IDS = ['hindu', 'buddhist', 'kirat', 'muslim', 'christian', 'other'];
/**
 * The design list: the API's (minus hidden), enriched from the static lists; the static lists when the API is down.
 * Every design, the international ones after Nepal's (`intl: true`, their page is /international/designs/<slug>/).
 * `ordered`: the API answered for this site (?market=np), already in the planner's order, so it is kept as is.
 */
export function normaliseThemes(api, site, { ordered = false } = {}) {
  const hidden = new Set(site.hiddenThemes || []);
  // every design shows on both sites: on the Nepal site its own designs first, the international ones after them
  const intlOnly = (m) => m === 'intl' || (Array.isArray(m) && m.includes('intl') && !m.includes('np'));
  const rows = Array.isArray(api) ? api.filter((t) => isObj(t) && SLUG_RE.test(t.slug) && !hidden.has(t.slug)) : [];
  let list = rows.length
    ? [...rows.filter((t) => !intlOnly(t.market)), ...rows.filter((t) => intlOnly(t.market))].map((t) => {
      const own = BY_SLUG[t.slug];
      const local = own || (INTL_BY_SLUG[t.slug] ? intlAsNp(INTL_BY_SLUG[t.slug]) : {});
      const rel = Array.isArray(t.religions) ? t.religions.filter((r) => FAITH_IDS.includes(r)) : null;
      return {
        slug: t.slug,
        name: str(t.name, 60) || local.name || t.slug,
        ne: local.ne || '',
        cat: local.cat || 'cards',
        concept: local.concept || str(t.concept, 240),
        alt: local.alt || `${str(t.name, 60) || t.slug} design`,
        religions: rel && rel.length ? rel : (local.religions || ['hindu']),
        thumb: localPath(t.thumb, local.thumb || `/themes/${t.slug}/thumb.jpg`),
        tier: TIER_RANK[t.tier] ? t.tier : (own ? tierOf(t.slug) : local.tier || 'shubha'),
        intl: !own && (intlOnly(t.market) || Boolean(INTL_BY_SLUG[t.slug])),
        featured: t.featured === true,
      };
    })
    : [...THEMES, ...INTL_THEMES.filter((d) => !BY_SLUG[d.slug]).map(intlAsNp)].filter((t) => !hidden.has(t.slug)); // a design on both sites: once
  if (ordered && rows.length) return list;
  const featured = (site.featuredThemes || []).filter((s) => list.some((t) => t.slug === s));
  if (featured.length) {
    const rank = (s) => { const i = featured.indexOf(s); return i < 0 ? Infinity : i; };
    list = list.map((t, i) => ({ t, i })).sort((a, b) => (rank(a.t.slug) - rank(b.t.slug)) || (a.i - b.i))
      .map(({ t }) => ({ ...t, featured: featured.includes(t.slug) }));
  } else {
    // no featured list: open with the lightest, freshest designs, then the richer ones
    const lead = ['gurans', 'swayambar', 'laali', 'mala', 'dhaka', 'mahal', 'sindoor', 'rangoli', 'sayapatri', 'hariyo', 'mangal', 'jhyal', 'pardaa', 'nimantrana', 'mehendi', 'agni', 'janti'];
    list = [...lead.map((s) => list.find((t) => t.slug === s)).filter(Boolean), ...list.filter((t) => !lead.includes(t.slug))];
  }
  return list;
}

export async function loadThemes(site) {
  return normaliseThemes(await getJson('/api/themes', 4000), site);
}

/* ---------------- orders and payment ---------------- */
async function send(url, init) {
  try {
    const r = await fetch(url, { credentials: 'same-origin', ...init, headers: { Accept: 'application/json', ...(init.headers || {}) } });
    let data = null;
    try { data = await r.json(); } catch { /* not JSON */ }
    return { ok: r.ok && data?.ok !== false, status: r.status, data: data || {} };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

/** POST /api/orders → { ok, ref, payToken, amount: { npr, usd }, plan }. `csrf`: the signed-in session's token. */
export async function createOrder(body, site, csrf = '') {
  if (site.mock) return mock.create(body, site);
  const headers = { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) };
  return send('/api/orders', { method: 'POST', headers, body: JSON.stringify(body) });
}

/** GET /api/orders/:ref/pay?t= → the order's payment page data, cleaned (see normPay) */
export async function getPayment(ref, token) {
  if (!REF_RE.test(ref)) return { ok: false, status: 400, data: {} };
  const r = await send(`/api/orders/${encodeURIComponent(ref)}/pay?t=${encodeURIComponent(token || '')}`, { method: 'GET' });
  if (!r.ok && DEV && (r.status === 404 || r.status === 0) && mock.has(ref)) return mock.pay(ref, token);
  return r.ok ? { ...r, data: normPay(r.data, ref) } : r;
}

/** POST /api/orders/:ref/proof?t= (multipart: file, method, amountPaid, note) */
export async function sendProof(ref, token, form) {
  if (DEV && mock.has(ref)) {
    const probe = await send(`/api/orders/${encodeURIComponent(ref)}/pay?t=${encodeURIComponent(token)}`, { method: 'GET' });
    if (!probe.ok) return mock.proof(ref, form);
  }
  return send(`/api/orders/${encodeURIComponent(ref)}/proof?t=${encodeURIComponent(token || '')}`, { method: 'POST', body: form });
}

/** Tolerant reader for the pay endpoint's answer (field names per docs/API.md, with a few aliases). */
export function normPay(d, ref) {
  const order = isObj(d.order) ? d.order : d;
  const amount = isObj(order.amount) ? order.amount : {};
  const rawMethods = Array.isArray(d.methods) ? d.methods : Array.isArray(d.paymentMethods) ? d.paymentMethods : [];
  const methods = rawMethods.map((m) => {
    const base = normMethod(m);
    if (!base) return null;
    return {
      ...base,
      qr: localPath(m.qr, base.qr),
      dynamic: Boolean(m.dynamic),
      amount: num(m.amount, 0, 10_000_000),
      remark: str(m.remark, 60),
      remarkMax: num(m.remarkMax, 4, 60) || 25,
    };
  }).filter(Boolean);
  const proofs = Array.isArray(order.proofs) ? order.proofs.filter(isObj) : [];
  const proof = proofs.length ? proofs[proofs.length - 1] : isObj(order.proof) ? order.proof : null;
  return {
    ref: str(order.ref, 40) || ref,
    market: (d.market ?? order.market) === 'intl' ? 'intl' : 'np', // the site it was ordered on: card or PayPal first for 'intl'
    status: str(order.status, 40) || (proof ? 'proof_submitted' : 'awaiting_payment'),
    reason: str(order.reason, 300),
    canUpload: order.canUpload !== false,
    plan: isObj(order.plan) ? { id: str(order.plan.id, 32), name: str(order.plan.name, 60) } : { id: str(order.plan, 32), name: str(order.planName, 60) || str(order.plan, 32) },
    theme: str(order.theme, 40),
    name: str(order.name, 80),
    amount: { npr: num(amount.npr, 0, 10_000_000), usd: num(amount.usd, 0, 10_000) },
    remark: str(d.remark ?? order.remark, 60),
    methods,
    proof: proof ? { method: str(proof.method, 32), at: str(proof.at, 40), amountPaid: str(String(proof.amountPaid ?? ''), 20) } : null,
    // 'USD': paid by card or PayPal only, never by QR and a screenshot (an international or dollar-only order)
    currency: d.currency === 'USD' ? 'USD' : 'NPR',
    contact: isObj(d.contact) ? {
      email: /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}$/.test(String(d.contact.email || '')) ? d.contact.email : '',
      whatsapp: /^\d{6,15}$/.test(String(d.contact.whatsapp || '')) ? d.contact.whatsapp : '',
    } : null,
    paypalCheckout: d.paypalCheckout?.enabled === true,
    paypal: isObj(d.paypal) ? {
      status: str(d.paypal.status, 30), transactionId: /^[A-Z0-9]{8,30}$/.test(String(d.paypal.transactionId || '')) ? d.paypal.transactionId : '',
      amount: str(String(d.paypal.amount ?? ''), 20), currency: str(d.paypal.currency, 3), paidAt: str(d.paypal.paidAt, 40), test: d.paypal.test === true,
    } : null,
  };
}

/**
 * POST /api/pay/paypal/{order,capture} (public, Origin-checked): { ok, id | status, ... }. With no pay token the
 * signed-in customer's session opens their own order, and `csrf` (the session's token) goes with it.
 */
export function paypalCall(step, body, csrf = '') {
  const headers = { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) };
  return send(`/api/pay/paypal/${step}`, { method: 'POST', headers, body: JSON.stringify({ ...body, website: '' }) });
}

/** GET /api/pay/config → { enabled, env, clientId, currency } (the client ID is public). */
export async function paypalConfig() {
  const r = await send('/api/pay/config', { method: 'GET' });
  const p = r.data?.paypal;
  return p?.enabled && typeof p.clientId === 'string' && /^[A-Za-z0-9_-]{20,128}$/.test(p.clientId) ? p : null;
}

/* ---------------- development mock (never in production builds) ---------------- */
const KEY = 'nimtto-dev-orders';
const mock = {
  all() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } },
  save(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* private mode */ } },
  has(ref) { return DEV && Boolean(this.all()[ref]); },
  create(body, site) {
    if (body.website) return { ok: true, status: 201, data: { ok: true } };
    const plan = site.plans.find((p) => p.id === body.plan);
    const ref = `NM-${String(Math.floor(10000 + Math.random() * 89999))}`;
    const payToken = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
    const amount = { npr: plan?.price ?? null, usd: plan?.priceUsd ?? null };
    const all = this.all();
    all[ref] = { ref, payToken, amount, plan: plan ? { id: plan.id, name: plan.name } : null, name: body.name, theme: body.theme || '', status: 'awaiting_payment', methods: site.paymentMethods, proof: null };
    this.save(all);
    return { ok: true, status: 201, data: { ok: true, ref, payToken, amount, plan: plan?.id || null } };
  },
  pay(ref, token) {
    const o = this.all()[ref];
    if (!o || o.payToken !== token) return { ok: false, status: 404, data: { error: 'Not found' } };
    const remark = `Nimtto ${ref}`;
    const methods = o.methods.map((m) => ({ ...m, dynamic: m.id === 'khalti', amount: m.currency === 'USD' ? o.amount.usd : o.amount.npr, remark }));
    return { ok: true, status: 200, data: normPay({ order: { ...o }, methods, remark }, ref) };
  },
  proof(ref, form) {
    const all = this.all();
    const o = all[ref];
    if (!o) return { ok: false, status: 404, data: {} };
    const f = form.get('file');
    if (!(f instanceof File) || !/^image\//.test(f.type)) return { ok: false, status: 415, data: { error: 'Please choose a photo or screenshot.' } };
    o.status = 'proof_submitted';
    o.proof = { method: form.get('method'), amountPaid: form.get('amountPaid'), at: new Date().toISOString() };
    this.save(all);
    return { ok: true, status: 201, data: { ok: true, status: 'proof_submitted' } };
  },
};
