// Earnings, free access and refunds (lib/finance.js, lib/finance-admin.js, the PayPal refund in
// lib/payments/checkout.js). Unit tests on plain order objects, then the real routes, store and sessions in a
// throwaway DATA_ROOT, with PayPal mocked (no network). Run: npm test (in server/), and STORE=json npm test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash as argonHash } from '@node-rs/argon2';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-finance-'));
process.env.DATA_ROOT = DATA_ROOT;
process.env.ADMIN_EMAIL = 'owner@test.local';
process.env.ADMIN_PASSWORD_HASH = await argonHash('test-password-1', { memoryCost: 4096, timeCost: 2 });

await import('../lib/env.js');
const store = await import('../lib/store.js');
store.openStore();
const { startSessions } = await import('../lib/sessions.js');
startSessions();
const express = (await import('express')).default;
const auth = await import('../lib/auth.js');
const orders = await import('../lib/orders.js');
const site = await import('../lib/site.js');
const manual = await import('../lib/payments/manual.js');
const accounts = await import('../lib/accounts.js');
const fin = await import('../lib/finance.js');
const { financeRouter } = await import('../lib/finance-admin.js');
const { createClient } = await import('../lib/payments/paypal.js');
const { createCheckout } = await import('../lib/payments/checkout.js');

const NOW = new Date('2026-10-17T06:00:00Z'); // 17 October 2026, Kathmandu

// ── Unit: the earnings function ─────────────────────────────────────────────

const order = (o) => ({ id: `id${Math.random().toString(36).slice(2, 12)}`.slice(0, 12), at: '2026-09-01T05:00:00Z', kind: 'order', status: 'new', name: 'Sita', plan: 'shubha', planName: 'Shubha', amount: { npr: 4999, usd: 39 }, ...o });
const qrPaid = (at, extra = {}) => order({ pay: { status: 'confirmed', via: 'proof', confirmedAt: at, proofs: [{ n: 1, method: 'nabil', methodLabel: 'Nabil Bank', currency: 'NPR' }], history: [] }, ...extra });
const ppPaid = (at, extra = {}) => order({ payment: { provider: 'paypal', env: 'live', status: 'paid', amount: '39.00', currency: 'USD', captureId: 'CAP12345678', paidAt: at }, pay: { status: 'confirmed', via: 'paypal', proofs: [], history: [] }, ...extra });

test('earnings: a confirmed QR payment counts; awaiting payment and a screenshot to check do not', () => {
  const list = [
    qrPaid('2026-10-03T10:00:00Z'),
    order({ pay: { status: 'awaiting_payment', proofs: [], history: [] } }),
    order({ pay: { status: 'proof_submitted', proofs: [{ n: 1, currency: 'NPR', method: 'nabil' }], history: [] } }),
    order({ pay: { status: 'rejected', reason: 'x', proofs: [], history: [] }, amount: { npr: 9999, usd: 79 } }),
  ];
  const e = fin.earnings(list, { now: NOW });
  assert.deepEqual(e.periods.thisMonth.NPR, { received: 4999, refunded: 0, net: 4999, payments: 1, refunds: 0 });
  assert.equal(e.periods.thisMonth.USD.received, 0);
  assert.equal(e.periods.allTime.NPR.received, 4999);
  assert.equal(e.months[0].month, '2026-10');
  assert.equal(e.months[0].NPR.net, 4999);
  assert.equal(e.months.length, 12);
  assert.deepEqual(e.byMethod, [{ method: 'Nabil Bank', currency: 'NPR', received: 4999, refunded: 0, net: 4999, payments: 1, refunds: 0 }]);
  assert.deepEqual(e.pending.awaiting, { count: 2, noPrice: 0, NPR: 4999 + 9999, USD: 0 });
  assert.deepEqual(e.pending.toCheck, { count: 1, noPrice: 0, NPR: 4999, USD: 0 });
});

test('earnings: free access is listed with its value and never counted', () => {
  const comped = order({ pay: { status: 'comped', proofs: [], history: [], comp: { at: '2026-10-05T05:00:00Z', plan: 'shahi', planName: 'Shahi', reason: 'friend', value: { npr: 9999, usd: 79 } } } });
  const e = fin.earnings([comped], { now: NOW });
  assert.equal(e.periods.allTime.NPR.received, 0);
  assert.equal(e.periods.allTime.USD.received, 0);
  assert.equal(e.comps.count, 1);
  assert.deepEqual(e.comps.value, { NPR: 9999, USD: 79 });
  assert.equal(e.pending.awaiting.count, 0);
  assert.equal(fin.ledger([comped])[0].counted, false);
});

test('earnings: NPR and USD stay apart; a refund subtracts in the month it happens; sandbox money is not counted', () => {
  const qr = qrPaid('2026-09-20T10:00:00Z', {
    refunds: [{ id: 'r1aaaa', of: 'manual', via: 'record', amount: 1000, currency: 'NPR', date: '2026-10-02', at: '2026-10-02T06:15:00Z', reason: 'part' }],
  });
  const pp = ppPaid('2026-10-10T10:00:00Z', {
    refunds: [{ id: 'r2bbbb', of: 'paypal', via: 'paypal', amount: 9, currency: 'USD', at: '2026-10-11T10:00:00Z', reason: 'x', paypalRefundId: 'RF1', status: 'COMPLETED' }],
  });
  pp.payment.refunded = '9.00';
  pp.payment.status = 'partially_refunded';
  const sandbox = ppPaid('2026-10-12T10:00:00Z');
  sandbox.payment.env = 'sandbox';
  const voided = qrPaid('2026-10-01T10:00:00Z', { refunds: [{ id: 'r3cccc', of: 'manual', via: 'record', amount: 4999, currency: 'NPR', date: '2026-10-01', at: '2026-10-01T06:00:00Z', reason: 'oops', voidedAt: '2026-10-01T07:00:00Z' }] });
  const e = fin.earnings([qr, pp, sandbox, voided], { now: NOW });
  // September: the QR payment; October: its refund, the PayPal payment and its refund, the second QR payment
  assert.deepEqual(e.periods.lastMonth.NPR, { received: 4999, refunded: 0, net: 4999, payments: 1, refunds: 0 });
  assert.deepEqual(e.periods.thisMonth.NPR, { received: 4999, refunded: 1000, net: 3999, payments: 1, refunds: 1 });
  assert.deepEqual(e.periods.thisMonth.USD, { received: 39, refunded: 9, net: 30, payments: 1, refunds: 1 });
  assert.equal(e.periods.thisYear.NPR.net, 4999 + 3999);
  assert.equal(e.test.payments, 1);
  const pal = e.byMethod.find((m) => m.method === 'PayPal');
  assert.deepEqual([pal.currency, pal.received, pal.refunded], ['USD', 39, 9]);
  // a refund is never more than what can still be refunded
  assert.deepEqual(fin.refundable(qr), [{ of: 'manual', currency: 'NPR', label: 'Nabil Bank', paid: 4999, refunded: 1000, left: 3999, test: false }]);
  assert.equal(fin.refundState(qr), 'partial');
  assert.equal(fin.refundState(voided), null); // the removed refund does not count
});

test('earnings: orders from before refunds were recorded still add up', () => {
  // marked refunded by hand (no order.refunds), and a PayPal refund only in payment.refunded
  const old = order({ pay: { status: 'refunded', via: 'manual', manual: { method: 'Cash' }, confirmedAt: '2026-08-02T05:00:00Z', refundedAt: '2026-10-01T05:00:00Z', proofs: [], history: [] } });
  const pp = ppPaid('2026-08-05T05:00:00Z');
  Object.assign(pp.payment, { status: 'refunded', refunded: '39.00', refundedAt: '2026-09-09T05:00:00Z' });
  const e = fin.earnings([old, pp], { now: NOW });
  assert.equal(e.months.find((m) => m.month === '2026-08').NPR.received, 4999);
  assert.equal(e.periods.thisMonth.NPR.refunded, 4999);
  assert.equal(e.periods.lastMonth.USD.refunded, 39);
  assert.equal(e.periods.allTime.NPR.net, 0);
  assert.equal(e.periods.allTime.USD.net, 0);
  assert.equal(fin.refundState(old), 'full');
  assert.equal(fin.ledger([old]).find((x) => x.type === 'payment').method, 'Cash');
  // money with paisa/cents adds up exactly
  assert.equal(fin.minor(0.1) + fin.minor(0.2), fin.minor(0.3));
  assert.ok(Number.isNaN(fin.minor(1.005)));
  assert.equal(fin.prevMonth('2026-01'), '2025-12');
});

// ── The routes ──────────────────────────────────────────────────────────────

const CONFIG = { env: 'sandbox', clientId: 'AaBbCcDdEeFfGgHhIiJj', secret: 'SecretSecretSecretSecret', webhookId: 'WH12345678', enabled: true, problems: [] };
/** A fake PayPal for refunds and the webhook signature check. The same PayPal-Request-Id returns the same refund. */
const pp = { refunds: new Map(), calls: 0, status: 'COMPLETED' };
const reply = (status, body) => ({ ok: status < 300, status, headers: new Headers(), text: async () => JSON.stringify(body) });
pp.fetch = async (url, init) => {
  const path = new URL(url).pathname;
  if (path === '/v1/oauth2/token') return reply(200, { access_token: 'tok1', expires_in: 32400 });
  if (path === '/v1/notifications/verify-webhook-signature') return reply(200, { verification_status: 'SUCCESS' });
  const m = /^\/v2\/payments\/captures\/([A-Za-z0-9]+)\/refund$/.exec(path);
  if (m) {
    pp.calls += 1;
    const key = init.headers['PayPal-Request-Id'];
    assert.ok(key, 'a PayPal-Request-Id is sent');
    if (!pp.refunds.has(key)) pp.refunds.set(key, { id: `RF${String(pp.refunds.size + 1).padStart(8, '0')}`, status: pp.status, amount: JSON.parse(init.body).amount, capture: m[1] });
    return reply(201, pp.refunds.get(key));
  }
  return reply(404, { name: 'NOT_FOUND' });
};
const checkout = createCheckout({ client: createClient({ ...CONFIG, fetch: pp.fetch }), config: CONFIG, getOrder: orders.getOrder, findOrder: orders.findOrder, mutateOrder: orders.mutateOrder, readSite: site.readSite });
const hookHeaders = {
  'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
  'paypal-transmission-id': 'tid-1', 'paypal-transmission-sig': 'sig==', 'paypal-transmission-time': '2026-10-16T10:00:00Z',
};

let server;
let base;
let admin;
before(async () => {
  const app = express();
  app.use(auth.loadSession);
  const api = express.Router();
  const json = express.json({ limit: '32kb' });
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  api.param('ref', (req, res, next, ref) => (orders.REF_RE.test(ref) ? next() : res.status(404).json({ error: 'Not found.' })));
  api.post('/auth/login', json, wrap(auth.login));
  api.post('/orders', json, wrap(orders.submit));
  api.get('/orders/:ref/pay', wrap(manual.payInfo));
  api.get('/orders', auth.requireAdmin, wrap(orders.list));
  api.patch('/orders/:id', auth.requireAdmin, json, wrap(orders.update));
  api.use('/admin/finance', financeRouter({ checkout, paypal: { enabled: true, env: 'sandbox' } }));
  app.use('/api', api);
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.expose || (err.status || 500) < 500 ? err.message : 'error', errors: err.errors }));
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
  const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email: 'owner@test.local', password: 'test-password-1' }) });
  assert.equal(r.status, 200, 'admin login');
  admin = { cookie: r.headers.get('set-cookie').split(';')[0], csrf: (await r.json()).csrf };
});
after(() => {
  server?.close();
  try { store.closeStore(); } catch { /* already closed */ }
  try { rmSync(DATA_ROOT, { recursive: true, force: true }); } catch { /* Windows may hold a file a moment */ }
});

const asAdmin = (path, { method = 'GET', body } = {}) => fetch(base + path, {
  method, headers: { Cookie: admin.cookie, 'X-CSRF-Token': admin.csrf, Origin: base, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
});
let n = 0;
async function newOrder(extra = {}) {
  n += 1;
  const r = await fetch(`${base}/api/orders`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ kind: 'order', plan: 'shubha', name: 'Gita Rai', phone: '9800000000', email: `gita${n}@example.com`, password: 'gita-pass-123', website: '', ...extra }),
  });
  assert.equal(r.status, 201);
  const out = await r.json();
  return { ...out, id: (await store.getOrderByRef(out.ref)).id };
}
const summary = async () => (await asAdmin('/api/admin/finance/summary')).json();

test('routes: planner only, CSRF on writes', async () => {
  assert.equal((await fetch(`${base}/api/admin/finance/summary`)).status, 401);
  const o = await newOrder();
  const noCsrf = await fetch(`${base}/api/admin/finance/orders/${o.id}/comp`, { method: 'POST', headers: { Cookie: admin.cookie, 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ plan: 'shubha', reason: 'friend' }) });
  assert.equal(noCsrf.status, 403);
  assert.equal((await asAdmin('/api/admin/finance/transactions?type=bogus')).status, 400);
  assert.equal((await asAdmin('/api/admin/finance/transactions.csv?from=2026-10-10&to=2026-10-01')).status, 400);
});

test('free access: needs a plan and a reason, is never counted, closes the pay page, and can be undone', async () => {
  const o = await newOrder();
  assert.equal((await asAdmin(`/api/admin/finance/orders/${o.id}/comp`, { method: 'POST', body: { plan: 'shahi' } })).status, 400);
  assert.equal((await asAdmin(`/api/admin/finance/orders/${o.id}/comp`, { method: 'POST', body: { plan: 'nope', reason: 'friend' } })).status, 400);
  const before = await summary();
  const r = await asAdmin(`/api/admin/finance/orders/${o.id}/comp`, { method: 'POST', body: { plan: 'shahi', reason: 'Friend of the family' } });
  assert.equal(r.status, 200);
  const { order: c } = await r.json();
  assert.deepEqual([c.payStatus, c.plan, c.pay.comp.reason, c.pay.comp.value.npr], ['comped', 'shahi', 'Friend of the family', c.amount.npr]);
  assert.ok(c.amount.npr > 0);
  assert.equal((await asAdmin(`/api/admin/finance/orders/${o.id}/comp`, { method: 'POST', body: { plan: 'shahi', reason: 'again' } })).status, 409);
  const after = await summary();
  assert.equal(after.periods.allTime.NPR.received, before.periods.allTime.NPR.received);
  assert.equal(after.comps.count, before.comps.count + 1);
  assert.equal(after.pending.awaiting.count, before.pending.awaiting.count - 1);
  // the customer's pay page: nothing to pay; the old payment buttons are refused
  const pay = await (await fetch(`${base}/api/orders/${o.ref}/pay?t=${o.payToken}`)).json();
  assert.deepEqual([pay.status, pay.canUpload, pay.paypalCheckout.enabled], ['comped', false, false]);
  assert.equal((await asAdmin(`/api/orders/${o.id}`, { method: 'PATCH', body: { payment: { status: 'confirmed' } } })).status, 409);
  await assert.rejects(checkout.start(o.id), (err) => err.status === 409);
  // listed as free access in the transactions
  const tx = await (await asAdmin('/api/admin/finance/transactions?type=comp')).json();
  assert.ok(tx.items.some((e) => e.ref === o.ref && e.counted === false && e.reason === 'Friend of the family'));
  // undo: back to awaiting payment, with the history kept
  const u = await (await asAdmin(`/api/admin/finance/orders/${o.id}/uncomp`, { method: 'POST', body: { note: 'they will pay' } })).json();
  assert.equal(u.order.payStatus, 'awaiting_payment');
  assert.equal(u.order.pay.compUndone.length, 1);
  assert.match(u.order.pay.history.at(-1).note, /free access undone/);
  assert.equal((await asAdmin(`/api/admin/finance/orders/${o.id}/uncomp`, { method: 'POST', body: {} })).status, 409);
  // a paid order cannot get free access
  await asAdmin(`/api/orders/${o.id}`, { method: 'PATCH', body: { payment: { status: 'confirmed', manual: true, method: 'Cash' } } });
  assert.equal((await asAdmin(`/api/admin/finance/orders/${o.id}/comp`, { method: 'POST', body: { plan: 'shahi', reason: 'friend' } })).status, 409);
});

test('PayPal never charges a plan price for an order priced only in rupees', async () => {
  const o = await newOrder();
  assert.equal((await asAdmin(`/api/orders/${o.id}`, { method: 'PATCH', body: { amount: { npr: 80000, usd: null } } })).status, 200);
  await assert.rejects(checkout.start(o.id), (err) => err.status === 400 && /rupees/.test(err.message));
});

test('free access for a customer makes a new order in their account', async () => {
  const c = await accounts.createCustomer({ email: 'hari@example.com', name: 'Hari', phone: '', passwordHash: 'x' });
  assert.equal((await asAdmin('/api/admin/finance/customers/AAAAAAAAAAAA/comp', { method: 'POST', body: { plan: 'saral', reason: 'promotion' } })).status, 404);
  const r = await asAdmin(`/api/admin/finance/customers/${c.id}/comp`, { method: 'POST', body: { plan: 'saral', reason: 'Promotion winner' } });
  assert.equal(r.status, 201);
  const { order: o } = await r.json();
  assert.match(o.ref, /^NM-\d{5,6}$/);
  assert.deepEqual([o.customerId, o.email, o.payStatus, o.source, o.payTokenHash], [c.id, 'hari@example.com', 'comped', 'admin', undefined]);
});

test('refunds: partial then full, never more than paid, the date and reason checked, removable when recorded by mistake', async () => {
  const o = await newOrder();
  const url = `/api/admin/finance/orders/${o.id}/refunds`;
  assert.equal((await asAdmin(url, { method: 'POST', body: { amount: 100, reason: 'x y' } })).status, 409); // not paid
  const paid = await (await asAdmin(`/api/orders/${o.id}`, { method: 'PATCH', body: { payment: { status: 'confirmed', manual: true, method: 'eSewa', currency: 'NPR', amount: 4000 } } })).json();
  assert.deepEqual([paid.order.pay.received.amount, paid.order.pay.received.currency, paid.order.pay.received.label], [4000, 'NPR', 'eSewa']);
  const s0 = await summary();
  assert.equal((await asAdmin(url, { method: 'POST', body: { amount: 4000.01, reason: 'too much' } })).status, 400);
  assert.equal((await asAdmin(url, { method: 'POST', body: { amount: 0, reason: 'zero' } })).status, 400);
  assert.equal((await asAdmin(url, { method: 'POST', body: { amount: 10.123, reason: 'decimals' } })).status, 400);
  assert.equal((await asAdmin(url, { method: 'POST', body: { amount: 100 } })).status, 400); // a reason is required
  assert.equal((await asAdmin(url, { method: 'POST', body: { amount: 100, reason: 'later', date: '2099-01-01' } })).status, 400);
  assert.equal((await asAdmin(url, { method: 'POST', body: { amount: 100, reason: 'before', date: '2020-01-01' } })).status, 400);
  assert.equal((await asAdmin(url, { method: 'POST', body: { amount: 100, reason: 'paypal', through: 'paypal' } })).status, 400); // not a PayPal payment
  const part = await (await asAdmin(url, { method: 'POST', body: { amount: 1500, reason: 'One event cancelled' } })).json();
  assert.deepEqual([part.order.payStatus, part.order.refundState, part.order.refundable[0].left], ['confirmed', 'partial', 2500]);
  assert.equal((await asAdmin(url, { method: 'POST', body: { amount: 2500.5, reason: 'more than left' } })).status, 400);
  // the payment cannot be reopened while refunds are recorded
  assert.equal((await asAdmin(`/api/orders/${o.id}`, { method: 'PATCH', body: { payment: { status: 'awaiting_payment' } } })).status, 409);
  const full = await (await asAdmin(url, { method: 'POST', body: { amount: 2500, reason: 'Wedding cancelled' } })).json();
  assert.deepEqual([full.order.payStatus, full.order.refundState, full.order.refundable[0].left], ['refunded', 'full', 0]);
  assert.equal((await asAdmin(url, { method: 'POST', body: { amount: 1, reason: 'nothing left' } })).status, 400);
  const s1 = await summary();
  assert.equal(s1.periods.thisMonth.NPR.refunded - s0.periods.thisMonth.NPR.refunded, 4000);
  assert.equal(s1.periods.thisMonth.NPR.net - s0.periods.thisMonth.NPR.net, -4000);
  // the last refund was a mistake: removing it brings the payment back to paid
  const rid = full.order.refunds.at(-1).id;
  const v = await (await asAdmin(`${url}/${rid}/void`, { method: 'POST', body: { reason: 'typed twice' } })).json();
  assert.deepEqual([v.order.payStatus, v.order.refundState, v.order.refundable[0].left], ['confirmed', 'partial', 2500]);
  assert.equal((await asAdmin(`${url}/${rid}/void`, { method: 'POST', body: {} })).status, 409);
  const s2 = await summary();
  assert.equal(s2.periods.thisMonth.NPR.refunded - s0.periods.thisMonth.NPR.refunded, 1500);
  // "Mark refunded" (the older button) records a refund of what is left
  const marked = await (await asAdmin(`/api/orders/${o.id}`, { method: 'PATCH', body: { payment: { status: 'refunded', note: 'All back' } } })).json();
  assert.deepEqual([marked.order.payStatus, marked.order.refundable[0].left, marked.order.refunds.at(-1).amount], ['refunded', 0, 2500]);
  // CSV: the payment and its refunds, with signed amounts and no formulas
  const day = fin.dayKey(new Date().toISOString());
  const csv = await asAdmin(`/api/admin/finance/transactions.csv?from=${day}&to=${day}`);
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  const text = await csv.text();
  assert.ok(text.includes(`${o.ref}`));
  assert.ok(text.includes(',-1500,'));
  // the transactions list filters and searches
  const tx = await (await asAdmin(`/api/admin/finance/transactions?type=refund&currency=NPR&q=${o.ref}`)).json();
  assert.equal(tx.items.length, 3); // 1500, 2500 (removed), 2500 (marked)
  assert.ok(tx.items.every((e) => e.type === 'refund' && e.ref === o.ref));
  assert.equal(tx.items.filter((e) => e.voided).length, 1);
});

test('PayPal: refund through PayPal (idempotent), and the webhook that follows is not counted twice', async () => {
  const o = await newOrder();
  // a captured PayPal payment (as checkout.capture would leave it)
  await orders.mutateOrder(o.id, (x) => {
    x.payment = { provider: 'paypal', env: 'live', status: 'paid', plan: 'shubha', amount: '39.00', currency: 'USD', paypalOrderId: '5O190127TN364715T', captureId: 'CAPAAA111', paidAt: new Date().toISOString(), events: [] };
    x.pay.status = 'confirmed';
    x.pay.via = 'paypal';
  });
  const s0 = await summary();
  const url = `/api/admin/finance/orders/${o.id}/refunds`;
  assert.equal((await asAdmin(url, { method: 'POST', body: { amount: 5, reason: 'record only' } })).status, 409); // PayPal is on: through PayPal
  assert.equal((await asAdmin(url, { method: 'POST', body: { amount: 39.01, reason: 'too much', through: 'paypal' } })).status, 400);
  const r = await asAdmin(url, { method: 'POST', body: { amount: 10, reason: 'Late delivery', through: 'paypal' } });
  assert.equal(r.status, 201);
  const out = await r.json();
  assert.equal(out.refund.status, 'COMPLETED');
  assert.deepEqual([out.order.payment.status, out.order.payment.refunded, out.order.refundState], ['partially_refunded', '10.00', 'partial']);
  const refundId = out.refund.id;
  assert.equal([...pp.refunds.values()][0].amount.value, '10.00');
  // PayPal then reports the same refund: recorded once
  const hook = (id) => JSON.stringify({ id, event_type: 'PAYMENT.CAPTURE.REFUNDED', resource: { id: refundId, status: 'COMPLETED', amount: { currency_code: 'USD', value: '10.00' }, links: [{ rel: 'up', href: 'https://api.sandbox.paypal.com/v2/payments/captures/CAPAAA111' }] } });
  assert.equal((await checkout.webhook(hook('WH-1'), hookHeaders)).body.outcome, 'duplicate refund');
  assert.equal((await checkout.webhook(hook('WH-1'), hookHeaders)).body.outcome, 'duplicate'); // a replayed event
  const after1 = await orders.getOrder(o.id);
  assert.equal(after1.refunds.length, 1);
  assert.equal(after1.payment.refunded, '10.00');
  const s1 = await summary();
  assert.equal(s1.periods.thisMonth.USD.refunded - s0.periods.thisMonth.USD.refunded, 10);
  assert.equal(s1.periods.thisMonth.USD.received - s0.periods.thisMonth.USD.received, 0);
  // a refund made in PayPal itself arrives only by webhook: recorded once, and it completes the refund
  const other = JSON.stringify({ id: 'WH-2', event_type: 'PAYMENT.CAPTURE.REFUNDED', resource: { id: 'RFPAYPAL0001', status: 'COMPLETED', create_time: new Date().toISOString(), amount: { currency_code: 'USD', value: '29.00' }, links: [{ rel: 'up', href: 'https://api.sandbox.paypal.com/v2/payments/captures/CAPAAA111' }] } });
  assert.equal((await checkout.webhook(other, hookHeaders)).body.outcome, 'applied');
  const after2 = await orders.getOrder(o.id);
  assert.deepEqual([after2.payment.status, after2.pay.status, after2.refunds.length], ['refunded', 'refunded', 2]);
  const s2 = await summary();
  assert.equal(s2.periods.thisMonth.USD.refunded - s0.periods.thisMonth.USD.refunded, 39);
  assert.equal(s2.periods.thisMonth.USD.net - s0.periods.thisMonth.USD.net, -39);
  assert.equal((await asAdmin(url, { method: 'POST', body: { amount: 1, reason: 'again', through: 'paypal' } })).status, 409); // nothing left
  // the same request twice (a timeout, a double click) reuses PayPal-Request-Id: one refund
  const o2 = await newOrder();
  await orders.mutateOrder(o2.id, (x) => {
    x.payment = { provider: 'paypal', env: 'live', status: 'paid', amount: '39.00', currency: 'USD', paypalOrderId: '5O190127TN364716T', captureId: 'CAPBBB222', paidAt: new Date().toISOString(), events: [] };
  });
  const a = await checkout.refund(o2.id, { amount: '5.00', reason: 'x' });
  // simulate a lost answer: forget our record of the refund id, then retry the same amount
  const calls = pp.calls;
  await orders.mutateOrder(o2.id, (x) => { x.payment.refunds = []; x.payment.refunded = '0.00'; x.payment.status = 'paid'; x.refunds = []; });
  const b = await checkout.refund(o2.id, { amount: '5.00', reason: 'x' });
  assert.equal(pp.calls, calls + 1);
  assert.equal(b.refundId, a.refundId); // PayPal answered with the first refund
  assert.equal((await orders.getOrder(o2.id)).refunds.length, 1);
});
