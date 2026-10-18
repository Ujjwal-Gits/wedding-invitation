// Orders and custom-design requests (SQLite table, or data/orders.json with STORE=json).
// Public POST: Origin check, honeypot, per-IP and global rate limits, strict validation and length caps. Every order
// gets a short public reference (NM-24817) and a pay token (256 random bits, shown once; only its SHA-256 is
// stored), so the customer can come back to /pay/<ref>?t=<token> to pay by QR and upload a screenshot
// (lib/payments/manual.js). Amounts always come from the server's plan prices.
// Admin: list, update the workflow status/notes, the payment status (confirm / reject / mark paid / refunded), delete.
// Money (earnings, refunds, free access) is read by lib/finance.js and changed by lib/finance-admin.js.
import { randomBytes, randomInt, createHash, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { DATA_DIR, IS_PROD, PUBLIC_ORIGINS } from './env.js';
// Stored by lib/store.js. addOrder/deleteOrder take the 'orders' lock themselves; saveOrder is called under it.
import { withLock, listOrders as storedOrders, getOrderById, getOrderByRef, addOrder, saveOrder, deleteOrder, countNewOrders } from './store.js';
import { rateLimiter, originAllowed, clientIp } from './security.js';
import { isTheme, listThemes } from './catalog.js';
import { readSite, EMAIL_RE, e164, tierProblem, planOffered } from './site.js';
import { activate } from './activation.js';
import { normEmail } from './accounts.js';
import { hasPerm } from './auth.js';
import { suspendOrder, liftOn, suspendOn, releaseInvitation, holdInvitation } from './suspend.js';
import { refundable, refundState, payStatusOf, dayKey, minor, major, CURRENCIES } from './finance.js';
import { orderMarket, asMarket, isMarket, checkPhone, PHONE_MSG } from './market.js';

export const ORDERS_FILE = resolve(DATA_DIR, 'orders.json');
export const PROOF_DIR = resolve(DATA_DIR, 'proofs'); // payment screenshots: private, never served statically
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const ID_RE = /^[A-Za-z0-9_-]{12}$/;
export const REF_RE = /^NM-\d{5,6}$/;
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const STATUSES = ['new', 'contacted', 'done', 'archived'];
// The statuses PATCH /api/orders/:id can set. 'comped' (free access) is set and undone only through
// /api/admin/finance (lib/finance-admin.js), with a plan and a reason.
export const PAY_STATUSES = ['awaiting_payment', 'proof_submitted', 'confirmed', 'rejected', 'refunded'];
const MAX_ORDERS = 5000;
const MAX_HISTORY = 50;
const MAX_REFUNDS = 50;

// Stored requests: 5 / hour / IP (dev: agents test from one IP) and 200 / hour overall. Attempts (including
// ones that fail validation, so a typo does not use up a real person's quota): 60 / hour / IP.
const perIp = rateLimiter({ windowMs: 60 * 60 * 1000, max: IS_PROD ? 5 : 100 });
const global = rateLimiter({ windowMs: 60 * 60 * 1000, max: 200 });
const attempts = rateLimiter({ windowMs: 60 * 60 * 1000, max: IS_PROD ? 60 : 1000 });
const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });

export const clean = (v, max, multiline = false) => {
  if (typeof v !== 'string') return '';
  let s = v.normalize('NFC').replace(CTRL, '');
  if (!multiline) s = s.replace(/[\r\n]+/g, ' ');
  return s.trim().slice(0, max);
};

// ── Pay token ─────────────────────────────────────────────────────────────

const tokenHash = (t) => createHash('sha256').update(String(t)).digest();
const DUMMY = tokenHash('nimtto-no-order');
/** Constant-time check of a pay token against the order's stored hash. */
export function tokenMatches(order, t) {
  const ok = typeof t === 'string' && TOKEN_RE.test(t);
  const want = order && typeof order.payTokenHash === 'string' && order.payTokenHash.length === 64 ? Buffer.from(order.payTokenHash, 'hex') : DUMMY;
  const same = timingSafeEqual(tokenHash(ok ? t : ''), want);
  return Boolean(ok && order && order.payTokenHash && same);
}

/** A new pay token for an order: stores its hash on `o` and returns the token (shown once). */
export function newPayToken(o) {
  const t = randomBytes(32).toString('base64url');
  o.payTokenHash = tokenHash(t).toString('hex');
  return t;
}

/** The customer's own order by its public ref (an account session instead of the pay token), or null. */
export async function orderForCustomer(ref, customerId) {
  const o = typeof ref === 'string' && REF_RE.test(ref) && customerId ? await getOrderByRef(ref) : null;
  return o && o.customerId === customerId ? o : null;
}

/** The order for a public ref and its pay token, or null (unknown ref and wrong token look the same). */
export async function orderByRefAndToken(ref, t) {
  const o = typeof ref === 'string' && REF_RE.test(ref) ? await getOrderByRef(ref) : null;
  return tokenMatches(o, t) ? o : null;
}

/** A new unique NM-xxxxx reference (6 digits once 5 get crowded). Call under withLock('order-ref'). */
async function newRef() {
  for (let i = 0; i < 40; i++) {
    const ref = i < 30 ? `NM-${randomInt(10000, 100000)}` : `NM-${randomInt(100000, 1000000)}`;
    if (!(await getOrderByRef(ref))) return ref;
  }
  throw httpError(503, 'Please try again in a moment.');
}

// ── Money and messages ────────────────────────────────────────────────────

/** { npr, usd } for a plan from the server's prices (null where the plan has no price). */
export const amountOf = (plan) => ({ npr: Number.isInteger(plan?.price) ? plan.price : null, usd: Number.isFinite(plan?.priceUsd) ? plan.priceUsd : null });
const rs = (n) => `Rs ${Number(n).toLocaleString('en-IN')}`;
export const planView = (order) => (order.plan ? { id: order.plan, name: order.planName || order.plan, from: order.planFrom === true } : null);

/** The customer's link back to their order (absolute when PUBLIC_ORIGIN is set). */
export const payUrl = (ref, token) => `${PUBLIC_ORIGINS[0] || ''}/pay/${ref}?t=${token}`;

/** A short WhatsApp message to the owner (never the pay token), and a wa.me link to the site's WhatsApp number. */
export function whatsappFor(order, site) {
  const a = order.amount || {};
  const money = a.npr != null ? `${order.planFrom ? 'from ' : ''}${rs(a.npr)}` : '';
  const text = [
    'Namaste! I placed an order on Nimtto.',
    `Order: ${order.ref}`,
    order.planName ? `Plan: ${order.planName}${money ? ` (${money})` : ''}` : null,
    `Name: ${order.name}`,
    order.weddingDate ? `Wedding: ${order.weddingDate}` : null,
    order.enquiry ? 'I asked for a custom design. Please send me the price.' : 'I will send the payment screenshot here.',
  ].filter(Boolean).join('\n');
  const num = e164(site?.contact?.whatsapp || site?.contact?.phone).replace(/^\+/, '');
  return { text, link: num ? `https://wa.me/${num}?text=${encodeURIComponent(text)}` : null };
}

/**
 * The order's price or plan changed: a PayPal checkout opened at the old price (not captured yet) is cancelled, so it
 * can never be captured (lib/payments/checkout.js refuses it with price_changed and the customer starts again).
 */
export function dropOpenCheckout(o, why = 'the price changed') {
  const p = o.payment;
  if (p?.provider !== 'paypal' || p.status !== 'created') return false;
  p.status = 'cancelled';
  p.problem = `Checkout cancelled: ${why}. The customer needs to start the payment again.`;
  p.updatedAt = new Date().toISOString();
  return true;
}

const historyAdd = (pay, status, by, note) => {
  pay.history = [...(pay.history || []), { at: new Date().toISOString(), status, by, ...(note ? { note } : {}) }].slice(-MAX_HISTORY);
};

/** A 'YYYY-MM-DD' (Nepal) day as an ISO time: now for today, else midday that day in Kathmandu. */
const dayToIso = (day) => (!day || day === dayKey(new Date().toISOString()) ? new Date().toISOString() : new Date(`${day}T12:00:00+05:45`).toISOString());

/**
 * Records a refund the planner made outside Nimtto (money sent back in the bank or wallet app, or cash) as a line
 * in order.refunds, and moves the payment to 'refunded' once nothing is left. of: 'manual' (a QR or by-hand
 * payment) or 'paypal' (only when PayPal is off on this server: otherwise refunds go through PayPal). The caller
 * has checked amount ≤ what is left (lib/finance.js refundable) and holds the orders lock.
 */
export function recordRefund(o, { of = 'manual', amount, currency, date = '', reason, by = 'admin' }) {
  const now = new Date().toISOString();
  const day = date || dayKey(now);
  o.refunds = [...(Array.isArray(o.refunds) ? o.refunds : []), {
    id: randomBytes(6).toString('base64url'), of, via: 'record', amount, currency, date: day, at: dayToIso(day), reason, by, recordedAt: now,
  }].slice(-MAX_REFUNDS);
  const pay = o.pay; // an older PayPal-only order may have none: never make one here (it would read as a manual payment)
  const full = refundable(o).find((x) => x.of === of)?.left === 0;
  if (of === 'paypal' && o.payment) {
    const p = o.payment;
    p.refunded = (major((minor(p.refunded || '0') || 0) + minor(amount))).toFixed(2);
    p.status = full ? 'refunded' : 'partially_refunded';
    p.refundedAt = now;
  }
  if (!pay) return;
  if (full && pay.status === 'confirmed') { pay.status = 'refunded'; pay.refundedAt = now; }
  historyAdd(pay, full ? 'refunded' : 'partly_refunded', by, `${currency} ${amount} refunded: ${reason}`);
}

/** What the planner received for a confirmed manual payment (lib/finance.js counts it): { amount, currency, label, at }. */
function receivedFor(o, p) {
  const pay = o.pay;
  const at = new Date().toISOString();
  if (p.manual === true) {
    const currency = CURRENCIES.includes(p.currency) ? p.currency : o.amount?.npr == null && o.amount?.usd != null ? 'USD' : 'NPR';
    const amount = typeof p.amount === 'number' ? p.amount : (currency === 'USD' ? o.amount?.usd : o.amount?.npr) ?? 0;
    return { amount, currency, label: pay.manual?.method || 'Cash', at };
  }
  const last = (pay.proofs || []).at(-1);
  const currency = last?.currency === 'USD' || (o.amount?.npr == null && o.amount?.usd != null) ? 'USD' : 'NPR';
  const amount = typeof p.amount === 'number' ? p.amount : (currency === 'USD' ? o.amount?.usd : o.amount?.npr) ?? 0;
  return { amount, currency, label: last?.methodLabel || last?.method || 'QR payment', at };
}

// ── Public: a new order ───────────────────────────────────────────────────

/** POST /api/orders (public) */
export async function submit(req, res) {
  if (!originAllowed(req)) return res.status(403).json({ ok: false, error: 'Cross-site request refused.' });
  const ip = clientIp(req);
  const t = attempts.hit(ip);
  const a = perIp.peek(ip);
  const g = global.peek('all');
  if (!t.ok || !a.ok || !g.ok) {
    res.set('Retry-After', String(Math.max(t.ok ? 0 : t.retryAfter, a.retryAfter, g.retryAfter)));
    return res.status(429).json({ ok: false, error: 'Too many requests from here. Please try again later, or call us.' });
  }
  const b = req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return res.status(400).json({ ok: false, error: 'Bad request.' });
  const site = await readSite();
  // Honeypot: people never see or fill "website". Pretend success with the same shape, store nothing.
  if (b.website != null && b.website !== '') {
    perIp.hit(ip);
    const plan = site.plans.find((p) => p.id === b.plan) || null;
    const ref = `NM-${randomInt(10000, 100000)}`;
    const payToken = randomBytes(32).toString('base64url');
    const fake = b.kind === 'custom' || plan?.from === true ? { enquiry: true, amount: { npr: null, usd: null } } : { payToken, payUrl: payUrl(ref, payToken), amount: amountOf(plan) };
    return res.status(201).json({ ok: true, ref, market: b.market === 'intl' ? 'intl' : 'np', plan: plan ? { id: plan.id, name: plan.name, from: plan.from === true } : null, whatsapp: { text: '', link: null }, ...fake });
  }
  // The customer's account (docs/API.md "Account on order"): an order needs a signed-in customer. The website signs
  // in or signs up first (sign-up = an emailed code, lib/customers.js); an order never makes or opens an account.
  // A custom-design enquiry without credentials may still come from a guest.
  const signedIn = req.session?.role === 'customer' && req.customer ? req.customer : null;
  const credentials = b.password != null && b.password !== '';
  if (!signedIn && (b.kind === 'order' || credentials)) {
    return res.status(401).json({ ok: false, code: 'sign_in_required', error: 'Please sign in or make an account first, then place your order.' });
  }

  const fields = [];
  const capped = (key, max, { required = false, multiline = false } = {}) => {
    if (b[key] != null && typeof b[key] !== 'string') { fields.push(key); return ''; }
    const s = clean(b[key], max + 1, multiline);
    if (s.length > max || (required && !s)) fields.push(key);
    return s.slice(0, max);
  };
  const kind = b.kind === 'order' || b.kind === 'custom' ? b.kind : (fields.push('kind'), '');
  const name = capped('name', 80, { required: true });
  if (name && name.length < 2) fields.push('name');
  // the phone (required), with its country code, stored as E.164 (lib/market.js checkPhone); a number without a
  // code is read as the site's country (Nepal, or the United States on the international site)
  if (b.phone != null && typeof b.phone !== 'string') fields.push('phone');
  const pr = checkPhone(typeof b.phone === 'string' ? b.phone : '', b.market === 'intl' ? 'US' : 'NP');
  const phone = pr.ok ? pr.e164 : '';
  if (!phone) fields.push('phone');
  const email = signedIn && !b.email ? signedIn.email : normEmail(capped('email', 254));
  if (email && !EMAIL_RE.test(email)) fields.push('email');
  const bride = capped('bride', 80);
  const groom = capped('groom', 80);
  const weddingDate = capped('weddingDate', 10);
  const dm = DATE_RE.exec(weddingDate);
  const realDate = dm && new Date(Date.UTC(+dm[1], dm[2] - 1, +dm[3])).toISOString().slice(0, 10) === weddingDate; // no 30 February
  if (weddingDate && (!realDate || Number(dm[1]) < 2000 || Number(dm[1]) > 2100)) fields.push('weddingDate');
  const venue = capped('venue', 200);
  const theme = capped('theme', 31);
  if (theme && !isTheme(theme)) fields.push('theme');
  let planId = capped('plan', 32);
  if (!planId && kind === 'custom' && site.plans.some((p) => p.id === 'custom')) planId = 'custom';
  const plan = planId ? site.plans.find((p) => p.id === planId) : null;
  if ((planId && !plan) || (kind === 'order' && !plan)) fields.push('plan');
  const message = capped('message', 2000, { required: kind === 'custom', multiline: true });
  // The website the order came from (docs/API.md "Markets"): 'np' (default) or 'intl'; the plan must be offered there.
  if (b.market != null && !isMarket(b.market)) fields.push('market');
  const market = asMarket(b.market);
  if (plan && kind === 'order' && !planOffered(plan, market)) fields.push('plan');
  if (fields.length) {
    const f = [...new Set(fields)];
    const error = f.length === 1 && f[0] === 'phone' ? PHONE_MSG : 'Please check the form.';
    return res.status(400).json({ ok: false, error, fields: f });
  }
  // Design tiers: the plan must include the design (amounts always come from the server's plan prices).
  if (theme && plan) {
    const tp = tierProblem(site, plan, theme, listThemes().find((x) => x.slug === theme)?.name || theme);
    if (tp) return res.status(400).json({ ok: false, error: tp.error, fields: ['plan'], code: 'tier', needs: tp.needs });
  }

  const customer = signedIn; // the signed-in customer (a guest enquiry has none)

  const payToken = randomBytes(32).toString('base64url'); // 256 bits; only the hash is stored
  const now = new Date().toISOString();
  const order = { id: randomBytes(9).toString('base64url'), at: now, kind, name, phone, message, status: 'new', market };
  // A custom design is an enquiry (lib/enquiries.js): no price yet and no payment page. The planner sends a quote
  // and turns it into an order with its own pay link.
  const enquiry = kind === 'custom' || plan?.from === true;
  if (enquiry) order.enquiry = true;
  if (email) order.email = email;
  if (customer) order.customerId = customer.id;
  if (venue) order.venue = venue;
  if (bride) order.bride = bride;
  if (groom) order.groom = groom;
  if (weddingDate) order.weddingDate = weddingDate;
  if (theme) order.theme = theme;
  if (plan) Object.assign(order, { plan: plan.id, planName: plan.name, planFrom: plan.from === true });
  order.amount = enquiry ? { npr: null, usd: null } : amountOf(plan); // the server's price at the time of ordering
  order.payTokenHash = tokenHash(payToken).toString('hex');
  order.pay = { status: 'awaiting_payment', reason: null, proofs: [], history: [{ at: now, status: 'awaiting_payment', by: 'customer' }] };
  // A couple asking for a custom design from their studio: link the request to their invitation.
  if (kind === 'custom' && req.session?.role === 'client') order.invitation = req.session.slug;
  perIp.hit(ip);
  global.hit('all');
  try {
    await withLock('order-ref', async () => {
      order.ref = await newRef();
      await addOrder(order, MAX_ORDERS); // 507 when full
    });
  } catch (err) {
    if (err.expose) return res.status(err.status).json({ ok: false, error: err.message });
    throw err;
  }
  console.info(`[orders] new kind=${kind} ref=${order.ref} plan=${order.plan || '-'} market=${market}${enquiry ? ' (enquiry)' : ''}${customer ? ` customer=${customer.id}` : ''}`);
  res.status(201).json({
    ok: true, ref: order.ref, market, amount: order.amount, plan: planView(order), whatsapp: whatsappFor(order, site),
    // an enquiry has no payment page yet
    ...(enquiry ? { enquiry: true } : { payToken, payUrl: payUrl(order.ref, payToken) }),
    ...(customer ? { account: { email: customer.email, name: customer.name || '', created: false } } : {}),
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────

/** An order as the dashboard sees it: no token hash, proof files as admin-only URLs. */
export function adminView(o) {
  const { payTokenHash, ...rest } = o;
  if (rest.pay) {
    rest.pay = {
      ...rest.pay,
      proofs: (rest.pay.proofs || []).map(({ file, thumb, ...p }) => ({ ...p, url: `/api/admin/orders/${o.id}/proof/${p.n}`, thumb: `/api/admin/orders/${o.id}/proof/${p.n}?size=sm` })),
    };
  }
  rest.market = orderMarket(o); // 'np' when the order has none (made before markets)
  // PayPal Checkout (lib/payments) paid it: show it as confirmed. 'comped': free access (never counted as money).
  rest.payStatus = payStatusOf(o);
  // per payment: paid, refunded and what can still be refunded; 'partial' / 'full' once money went back
  rest.refundable = refundable(o);
  rest.refundState = refundState(o);
  return rest;
}

/** GET /api/orders (admin): newest first. ?market=np|intl: one market only (an order without one is Nepal). */
export async function list(req, res) {
  const m = req.query?.market;
  if (m != null && m !== '' && !isMarket(m)) throw httpError(400, "market must be 'np' or 'intl'.");
  const all = (await storedOrders()).filter((o) => !m || orderMarket(o) === m);
  all.sort((x, y) => String(y.at).localeCompare(String(x.at)));
  res.json({ orders: all.map(adminView) });
}

const isMoney = (v, max) => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max && Math.abs(Math.round(v * 100) - v * 100) < 1e-6);

/**
 * PATCH /api/orders/:id (admin)
 * { status?, notes?, amount?: { npr, usd }, payment?: { status, reason?, note?, manual?: true, method? },
 *   access?: 'active' | 'suspended' }
 * payment.status 'rejected' needs a reason (the customer sees it); 'refunded' only after a confirmed payment;
 * manual: true records "marked paid by hand" (cash, or a transfer seen elsewhere) with the method.
 * amount, payment and access are money: they need the 'finance' permission as well as 'orders' (403 otherwise).
 * access 'active' lifts a suspension (a reversed or fully refunded payment, lib/suspend.js); 'suspended' sets one.
 */
export async function update(req, res) {
  const { id } = req.params;
  if (!ID_RE.test(id)) throw httpError(400, 'Bad id.');
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  if (b.status !== undefined && !STATUSES.includes(b.status)) throw httpError(400, `status must be one of ${STATUSES.join(', ')}.`);
  if (b.notes !== undefined && (typeof b.notes !== 'string' || b.notes.length > 2000)) throw httpError(400, 'notes must be text of at most 2000 characters.');
  if (b.amount !== undefined && (!b.amount || typeof b.amount !== 'object' || !isMoney(b.amount.npr ?? null, 10_000_000) || !isMoney(b.amount.usd ?? null, 10_000))) {
    throw httpError(400, 'amount must be { npr, usd } (numbers, or null).');
  }
  if ((b.amount !== undefined || b.payment !== undefined || b.access !== undefined) && !hasPerm(req, 'finance')) {
    throw Object.assign(httpError(403, 'Changing the price, the payment or the access needs the Finance permission.'), { code: 'no_access' });
  }
  if (b.access !== undefined && b.access !== 'active' && b.access !== 'suspended') throw httpError(400, "access must be 'active' or 'suspended'.");
  const p = b.payment;
  if (p !== undefined) {
    if (!p || typeof p !== 'object' || !PAY_STATUSES.includes(p.status)) throw httpError(400, `payment.status must be one of ${PAY_STATUSES.join(', ')}.`);
    for (const [k, max] of [['reason', 300], ['note', 500], ['method', 40]]) {
      if (p[k] != null && (typeof p[k] !== 'string' || p[k].length > max)) throw httpError(400, `payment.${k} must be text of at most ${max} characters.`);
    }
    if (p.status === 'rejected' && !clean(p.reason, 300)) throw httpError(400, 'Say why the payment was rejected: the customer sees this.');
    // what was received (optional; else the order's price): { currency: 'NPR'|'USD', amount }
    if (p.currency != null && !CURRENCIES.includes(p.currency)) throw httpError(400, 'payment.currency must be NPR or USD.');
    if (p.amount != null && (!isMoney(p.amount, 10_000_000) || p.amount <= 0)) throw httpError(400, 'payment.amount must be a positive amount with at most 2 decimals.');
  }
  const who = req.admin?.email || 'admin';
  let accessChange = '';
  const order = await withLock('orders', async () => {
    const o = await getOrderById(id);
    if (!o) throw httpError(404, 'Request not found.');
    if (p !== undefined && o.pay?.status === 'comped') throw httpError(409, 'This order has free access. Undo free access first.');
    if (p !== undefined && o.payment?.provider === 'paypal' && ['paid', 'partially_refunded', 'refunded'].includes(o.payment.status)) {
      throw httpError(409, 'This order was paid with PayPal. Its payment is managed by PayPal: use Refund for money back.');
    }
    if (b.status !== undefined) o.status = b.status;
    if (b.notes !== undefined) o.notes = clean(b.notes, 2000, true);
    if (b.amount !== undefined) {
      const amount = { npr: b.amount.npr ?? null, usd: b.amount.usd ?? null };
      if (amount.npr !== (o.amount?.npr ?? null) || amount.usd !== (o.amount?.usd ?? null)) dropOpenCheckout(o, 'the planner changed the price');
      o.amount = amount;
    }
    if (b.access === 'active') accessChange = liftOn(o, who) ? 'lifted' : '';
    else if (b.access === 'suspended') accessChange = suspendOn(o, who, 'Suspended by staff') ? 'suspended' : '';
    if (p !== undefined) {
      const pay = o.pay || (o.pay = { status: 'awaiting_payment', reason: null, proofs: [], history: [] });
      const paidBefore = pay.status === 'confirmed' || o.payment?.status === 'paid';
      if (p.status === 'refunded' && !paidBefore) throw httpError(409, 'Only a confirmed payment can be marked refunded.');
      const note = clean(p.note, 500, true);
      const wasPaid = pay.status === 'confirmed' || pay.status === 'refunded';
      if (wasPaid && !['confirmed', 'refunded'].includes(p.status) && (o.refunds || []).some((r) => r.of === 'manual' && !r.voidedAt)) {
        throw httpError(409, 'This payment has refunds recorded. Remove the refunds first.');
      }
      if (p.status === 'refunded') {
        // "Mark refunded": a refund of everything still left of the manual payment, recorded now
        const left = refundable(o).find((x) => x.of === 'manual');
        if (!left) throw httpError(409, 'This order was paid with PayPal: use Refund to send the money back through PayPal.');
        if (left.left > 0) recordRefund(o, { of: 'manual', amount: left.left, currency: left.currency, reason: note || 'Marked refunded' });
      }
      pay.status = p.status;
      if (p.status === 'rejected') pay.reason = clean(p.reason, 300, true);
      else if (p.status !== 'refunded') pay.reason = null;
      if (p.status === 'confirmed') {
        pay.confirmedAt = new Date().toISOString();
        pay.via = p.manual === true ? 'manual' : pay.proofs?.length ? 'proof' : 'manual';
        if (p.manual === true) pay.manual = { method: clean(p.method, 40) || 'cash', note };
        pay.received = receivedFor(o, p);
      } else if (p.status !== 'refunded') delete pay.received;
      if (p.status === 'refunded') pay.refundedAt = new Date().toISOString();
      if (p.status !== 'refunded') historyAdd(pay, p.status, 'admin', p.status === 'rejected' ? pay.reason : note || (p.manual === true ? `marked paid by hand (${pay.manual.method})` : ''));
    }
    await saveOrder(o);
    if (p?.status === 'confirmed') activate(o.id, 'payment'); // the plan switches on by itself (lib/activation.js)
    return o;
  });
  if (p !== undefined) console.info(`[admin] order ${order.ref || order.id} payment=${p.status}${p.manual === true ? ' (manual)' : ''}`);
  // the invitation follows the order's access (the audit log records this PATCH and its fields, lib/audit.js)
  if (accessChange === 'lifted') await releaseInvitation(order);
  if (accessChange === 'suspended') await holdInvitation(order);
  if (accessChange) console.info(`[access] order ${order.ref || order.id} access ${accessChange} by ${who}`);
  // "Mark refunded" gave everything back: the access goes too (never for free access)
  if (p?.status === 'refunded' && !accessChange) {
    if (await suspendOrder(order.id, 'Payment marked refunded', { kind: 'refunded', by: who })) return res.json({ order: adminView(await getOrderById(order.id)) });
  }
  res.json({ order: adminView(order) });
}

/** DELETE /api/orders/:id (admin): the order and its payment screenshots. */
export async function remove(req, res) {
  const { id } = req.params;
  if (!ID_RE.test(id)) throw httpError(400, 'Bad id.');
  if (!(await deleteOrder(id))) throw httpError(404, 'Request not found.');
  await fs.rm(resolve(PROOF_DIR, id), { recursive: true, force: true });
  console.info(`[admin] delete order id=${id}`);
  res.json({ ok: true });
}

/** Count of orders still marked new (for the admin overview). */
export async function newCount() {
  return countNewOrders();
}

// Store helpers for other modules (lib/payments): every read and write of orders goes through this file.

/** One order by id, or null. */
export async function getOrder(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) return null;
  return getOrderById(id);
}

/** Every stored order (any order; lib/finance-admin.js sorts what it shows). */
export const allOrders = () => storedOrders();

/** The first order for which pred(order) is true, or null. */
export async function findOrder(pred) {
  const all = await storedOrders();
  return all.find(pred) || null;
}

/**
 * Runs fn(order) under the orders lock and saves the change; returns the order. fn may return false to skip the
 * write (nothing changed). A missing order throws 404.
 */
export async function mutateOrder(id, fn) {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw httpError(404, 'Request not found.');
  return withLock('orders', async () => {
    const o = await getOrderById(id);
    if (!o) throw httpError(404, 'Request not found.');
    if ((await fn(o)) !== false) await saveOrder(o);
    return structuredClone(o);
  });
}

/**
 * Stores an order the planner made (free access for a customer, lib/finance-admin.js) with a new reference.
 * It has no pay token: the customer opens it from their account. Returns the stored order.
 */
export async function addAdminOrder(fields) {
  const order = { id: randomBytes(9).toString('base64url'), at: new Date().toISOString(), status: 'new', message: '', ...fields };
  await withLock('order-ref', async () => {
    order.ref = await newRef();
    await addOrder(order, MAX_ORDERS);
  });
  return order;
}

export { historyAdd };
