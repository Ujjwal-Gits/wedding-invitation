// Orders and custom-design requests: data/orders.json (a list, newest last).
// Public POST: Origin check, honeypot, per-IP and global rate limits, strict validation and length caps.
// Admin: list, update status/notes, delete.
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { DATA_DIR, IS_PROD } from './env.js';
// Stored by lib/store.js (SQLite table, or data/orders.json with STORE=json). addOrder/deleteOrder take the 'orders'
// lock themselves; saveOrder is called under it.
import { withLock, listOrders as storedOrders, getOrderById, addOrder, saveOrder, deleteOrder, countNewOrders } from './store.js';
import { rateLimiter, originAllowed, clientIp } from './security.js';
import { isTheme } from './catalog.js';
import { readSite, EMAIL_RE } from './site.js';

export const ORDERS_FILE = resolve(DATA_DIR, 'orders.json');
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;
const PHONE_RE = /^[0-9+()\-\s]{6,20}$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const ID_RE = /^[A-Za-z0-9_-]{12}$/;
const STATUSES = ['new', 'contacted', 'done', 'archived'];
const MAX_ORDERS = 5000;

// Stored requests: 5 / hour / IP (dev: agents test from one IP) and 200 / hour overall. Attempts (including
// ones that fail validation, so a typo does not use up a real person's quota): 60 / hour / IP.
const perIp = rateLimiter({ windowMs: 60 * 60 * 1000, max: IS_PROD ? 5 : 100 });
const global = rateLimiter({ windowMs: 60 * 60 * 1000, max: 200 });
const attempts = rateLimiter({ windowMs: 60 * 60 * 1000, max: IS_PROD ? 60 : 1000 });
const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });

const clean = (v, max, multiline = false) => {
  if (typeof v !== 'string') return '';
  let s = v.normalize('NFC').replace(CTRL, '');
  if (!multiline) s = s.replace(/[\r\n]+/g, ' ');
  return s.trim();
};

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
  // Honeypot: people never see or fill "website". Pretend success (same status as a real one), store nothing.
  if (b.website != null && b.website !== '') { perIp.hit(ip); return res.status(201).json({ ok: true }); }

  const fields = [];
  const capped = (key, max, { required = false, multiline = false } = {}) => {
    if (b[key] != null && typeof b[key] !== 'string') { fields.push(key); return ''; }
    const s = clean(b[key], max, multiline);
    if (s.length > max || (required && !s)) fields.push(key);
    return s.slice(0, max);
  };
  const kind = b.kind === 'order' || b.kind === 'custom' ? b.kind : (fields.push('kind'), '');
  const name = capped('name', 80, { required: true });
  if (name && name.length < 2) fields.push('name');
  const phone = capped('phone', 20, { required: true });
  if (phone && !PHONE_RE.test(phone)) fields.push('phone');
  const email = capped('email', 254);
  if (email && !EMAIL_RE.test(email)) fields.push('email');
  const weddingDate = capped('weddingDate', 10);
  const dm = DATE_RE.exec(weddingDate);
  const realDate = dm && new Date(Date.UTC(+dm[1], dm[2] - 1, +dm[3])).toISOString().slice(0, 10) === weddingDate; // no 30 February
  if (weddingDate && (!realDate || Number(dm[1]) < 2000 || Number(dm[1]) > 2100)) fields.push('weddingDate');
  const theme = capped('theme', 31);
  if (theme && !isTheme(theme)) fields.push('theme');
  const plan = capped('plan', 32);
  if (plan && !(await readSite()).plans.some((p) => p.id === plan)) fields.push('plan');
  const message = capped('message', 2000, { required: kind === 'custom', multiline: true });
  if (fields.length) return res.status(400).json({ ok: false, error: 'Please check the form.', fields: [...new Set(fields)] });

  const order = { id: randomBytes(9).toString('base64url'), at: new Date().toISOString(), kind, name, phone, message, status: 'new' };
  if (email) order.email = email;
  if (weddingDate) order.weddingDate = weddingDate;
  if (theme) order.theme = theme;
  if (plan) order.plan = plan;
  // A couple asking for a custom design from their studio: link the request to their invitation.
  if (kind === 'custom' && req.session?.role === 'client') order.invitation = req.session.slug;
  perIp.hit(ip);
  global.hit('all');
  try {
    await addOrder(order, MAX_ORDERS); // 507 when full
  } catch (err) {
    if (err.expose) return res.status(err.status).json({ ok: false, error: err.message });
    throw err;
  }
  console.info(`[orders] new kind=${kind} id=${order.id}`);
  // ref: the request's id, so the website can offer to pay for it online (lib/payments) and show it as a reference
  res.status(201).json({ ok: true, ref: order.id });
}

/** GET /api/orders (admin): newest first. */
export async function list(req, res) {
  const all = await storedOrders();
  all.sort((x, y) => String(y.at).localeCompare(String(x.at)));
  res.json({ orders: all });
}

/** PATCH /api/orders/:id { status?, notes? } (admin) */
export async function update(req, res) {
  const { id } = req.params;
  if (!ID_RE.test(id)) throw httpError(400, 'Bad id.');
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  if (b.status !== undefined && !STATUSES.includes(b.status)) throw httpError(400, `status must be one of ${STATUSES.join(', ')}.`);
  if (b.notes !== undefined && (typeof b.notes !== 'string' || b.notes.length > 2000)) throw httpError(400, 'notes must be text of at most 2000 characters.');
  const order = await withLock('orders', async () => {
    const o = await getOrderById(id);
    if (!o) throw httpError(404, 'Request not found.');
    if (b.status !== undefined) o.status = b.status;
    if (b.notes !== undefined) o.notes = clean(b.notes, 2000, true);
    await saveOrder(o);
    return o;
  });
  res.json({ order });
}

/** DELETE /api/orders/:id (admin) */
export async function remove(req, res) {
  const { id } = req.params;
  if (!ID_RE.test(id)) throw httpError(400, 'Bad id.');
  if (!(await deleteOrder(id))) throw httpError(404, 'Request not found.');
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
