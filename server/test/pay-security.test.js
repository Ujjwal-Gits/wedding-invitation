// The payment audit fixes: sandbox money in production, access suspended on a reversal or full refund, money edits
// need 'finance', the price re-checked at capture, webhook order id / replay checks, the bare order id, HEIC limits.
// A throwaway DATA_ROOT, PayPal and Brevo mocked (no network). Run: npm test (in server/).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-paysec-'));
process.env.DATA_ROOT = DATA_ROOT;
process.env.ADMIN_EMAIL = 'owner@test.local';
process.env.BREVO_API_KEY = 'test-key';
process.env.BREVO_SMTP_USER = '';
process.env.BREVO_SMTP_KEY = '';
process.env.MAIL_FROM = 'hello@test.local';

const mails = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (String(url).startsWith('https://api.brevo.com/')) { mails.push(JSON.parse(opts.body)); return new Response('{"messageId":"x"}', { status: 201 }); }
  return realFetch(url, opts);
};

const store = await import('../lib/store.js');
store.openStore();
after(() => {
  try { store.closeStore(); } catch { /* already closed */ }
  try { rmSync(DATA_ROOT, { recursive: true, force: true }); } catch { /* Windows may hold a file a moment */ }
});
const { readConfig, createClient, paypalCounts } = await import('../lib/payments/paypal.js');
const { createCheckout } = await import('../lib/payments/checkout.js');
const { createPayments } = await import('../lib/payments/routes.js');
const orders = await import('../lib/orders.js');
const auth = await import('../lib/auth.js');
const inv = await import('../lib/invitations.js');
const { suspendOrder } = await import('../lib/suspend.js');
const { heicPixels, proofImage } = await import('../lib/payments/manual.js');

const CONFIG = { env: 'sandbox', clientId: 'AaBbCcDdEeFfGgHhIiJj', secret: 'SecretSecretSecretSecret', webhookId: 'WH12345678', enabled: true, problems: [] };
const CREDS = { PAYPAL_CLIENT_ID: CONFIG.clientId, PAYPAL_CLIENT_SECRET: CONFIG.secret, PAYPAL_WEBHOOK_ID: CONFIG.webhookId };
const SITE = { plans: [{ id: 'premium', name: 'Premium', price: 9000, priceUsd: 49 }, { id: 'basic', name: 'Basic', price: 5000, priceUsd: 29 }] };
const REF = 'Abc123_-xyzQ';
const hookHeaders = (at = new Date()) => ({
  'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
  'paypal-transmission-id': 'tid-1', 'paypal-transmission-sig': 'sig==', 'paypal-transmission-time': at.toISOString(),
});
const event = (id, type, resource) => JSON.stringify({ id, event_type: type, resource });

/** A small fake PayPal: tokens, orders, captures, the signature check. */
function fakePayPal() {
  const s = { captures: 0, orders: new Map(), next: 1 };
  const reply = (status, body) => ({ ok: status < 300, status, headers: new Headers(), text: async () => JSON.stringify(body) });
  s.fetch = async (url, init) => {
    const path = new URL(url).pathname;
    if (path === '/v1/oauth2/token') return reply(200, { access_token: 'tok1', expires_in: 32400 });
    if (path === '/v1/notifications/verify-webhook-signature') return reply(200, { verification_status: 'SUCCESS' });
    if (path === '/v2/checkout/orders') {
      const id = `5O19012${String(s.next++).padStart(10, '0')}`;
      s.orders.set(id, JSON.parse(init.body).purchase_units[0]);
      return reply(201, { id, status: 'CREATED' });
    }
    const m = /^\/v2\/checkout\/orders\/([A-Z0-9]+)\/capture$/.exec(path);
    if (m) {
      s.captures += 1;
      const pu = s.orders.get(m[1]);
      return reply(201, { id: m[1], status: 'COMPLETED', payer: {}, purchase_units: [{ reference_id: pu.reference_id, payments: { captures: [{ id: `CAP${m[1].slice(-8)}`, status: 'COMPLETED', amount: pu.amount, custom_id: pu.custom_id }] } }] });
    }
    return reply(404, { name: 'NOT_FOUND' });
  };
  return s;
}
function memoryOrders(list) {
  const all = list.map((o) => structuredClone(o));
  return {
    all,
    getOrder: async (id) => structuredClone(all.find((o) => o.id === id) || null),
    findOrder: async (pred) => structuredClone(all.find(pred) || null),
    mutateOrder: async (id, fn) => { const o = all.find((x) => x.id === id); await fn(o); return structuredClone(o); },
  };
}
function setup({ order = {}, env = {} } = {}) {
  const pp = fakePayPal();
  const mem = memoryOrders([{ id: REF, kind: 'order', plan: 'premium', name: 'Sita', status: 'new', at: '2026-10-16T00:00:00Z', ...order }]);
  const suspended = [];
  const checkout = createCheckout({
    client: createClient({ ...CONFIG, fetch: pp.fetch }), config: CONFIG, ...mem, readSite: async () => SITE, env,
    suspend: async (id, why, o) => { suspended.push({ id, why, kind: o.kind }); return true; },
  });
  return { pp, mem, checkout, suspended, order: () => mem.all[0] };
}
const fakeRes = () => {
  const r = { code: 200, body: null };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.set = () => r;
  r.vary = () => r;
  return r;
};
const staff = (perms) => ({ session: { role: 'admin' }, admin: { role: 'admin', email: 'staff@test.local', perms } });

// ── H1: sandbox money in production ─────────────────────────────────────────

test('H1: in production PayPal is off for sandbox or an unset PAYPAL_ENV, unless sandbox is allowed on purpose', () => {
  const prod = { ...CREDS, NODE_ENV: 'production' };
  const sandbox = readConfig({ ...prod, PAYPAL_ENV: 'sandbox' });
  assert.deepEqual([sandbox.enabled, sandbox.sandboxBlocked], [false, true]);
  assert.match(sandbox.problems.join(' '), /sandbox/);
  const unset = readConfig(prod);
  assert.deepEqual([unset.enabled, unset.sandboxBlocked], [false, true]);
  assert.equal(readConfig({ ...prod, PAYPAL_ENV: 'sandbox', PAYPAL_ALLOW_SANDBOX: '1' }).enabled, true);
  assert.equal(readConfig({ ...prod, PAYPAL_ENV: 'live' }).enabled, true);
  assert.equal(readConfig(CREDS).enabled, true); // development: unset still means sandbox
  // what a recorded payment may count for
  assert.equal(paypalCounts({ env: 'sandbox' }, { NODE_ENV: 'production' }), false);
  assert.equal(paypalCounts({ env: 'live' }, { NODE_ENV: 'production' }), true);
  assert.equal(paypalCounts({ env: 'sandbox' }, { NODE_ENV: 'production', PAYPAL_ALLOW_SANDBOX: '1' }), true);
  assert.equal(paypalCounts({ env: 'sandbox' }, {}), true);
});

test('H1: a sandbox capture in production never confirms the order', async () => {
  const pay = { status: 'awaiting_payment', proofs: [], history: [] };
  const a = setup({ order: { pay }, env: { NODE_ENV: 'production' } });
  const { id } = await a.checkout.start(REF);
  await a.checkout.capture(REF, id);
  assert.equal(a.order().payment.status, 'paid');
  assert.equal(a.order().pay.status, 'awaiting_payment');
  const b = setup({ order: { pay }, env: {} }); // development: the same capture confirms it
  await b.checkout.capture(REF, (await b.checkout.start(REF)).id);
  assert.equal(b.order().pay.status, 'confirmed');
});

// ── M2: the price at capture ────────────────────────────────────────────────

test('M2: a checkout opened before the price or plan changed is not captured', async () => {
  const a = setup();
  const { id } = await a.checkout.start(REF);
  a.order().amount = { npr: 9000, usd: 59 };
  await assert.rejects(a.checkout.capture(REF, id), (err) => err.status === 409 && err.code === 'price_changed');
  a.order().amount = undefined;
  a.order().plan = 'basic';
  await assert.rejects(a.checkout.capture(REF, id), (err) => err.status === 409 && err.code === 'price_changed');
  assert.equal(a.pp.captures, 0);
  assert.equal(a.order().payment.status, 'created');
  // a new checkout at the new price works
  const again = await a.checkout.start(REF);
  assert.equal((await a.checkout.capture(REF, again.id)).status, 'paid');
  assert.equal(a.order().payment.amount, '29.00');
  // a checkout the planner's price change cancelled (orders.dropOpenCheckout) is refused too
  const b = setup();
  const r = await b.checkout.start(REF);
  assert.equal(orders.dropOpenCheckout(b.order()), true);
  await assert.rejects(b.checkout.capture(REF, r.id), (err) => err.code === 'price_changed');
  assert.equal(b.pp.captures, 0);
});

// ── L1, L2: webhook checks ──────────────────────────────────────────────────

test('L1: a completed capture naming another PayPal order is ignored', async () => {
  const a = setup();
  const { id } = await a.checkout.start(REF);
  const done = (orderId) => ({ id: 'CAPX1', status: 'COMPLETED', custom_id: REF, amount: { currency_code: 'USD', value: '49.00' }, supplementary_data: { related_ids: { order_id: orderId } } });
  assert.equal((await a.checkout.webhook(event('WH-1', 'PAYMENT.CAPTURE.COMPLETED', done('5O190129999999999')), hookHeaders())).body.outcome, 'other order');
  assert.equal((await a.checkout.webhook(event('WH-2', 'PAYMENT.CAPTURE.COMPLETED', { ...done(id), supplementary_data: undefined }), hookHeaders())).body.outcome, 'other order');
  assert.equal(a.order().payment.status, 'created');
  assert.equal((await a.checkout.webhook(event('WH-3', 'PAYMENT.CAPTURE.COMPLETED', done(id)), hookHeaders())).body.outcome, 'applied');
  assert.equal(a.order().payment.status, 'paid');
});

test('L2: an event older than three days is refused; event ids are kept well past 40', async () => {
  const a = setup();
  await a.checkout.start(REF);
  const old = await a.checkout.webhook(event('WH-OLD', 'PAYMENT.CAPTURE.PENDING', { id: 'CAPP1', custom_id: REF }), hookHeaders(new Date(Date.now() - 4 * 864e5)));
  assert.equal(old.status, 400);
  const none = await a.checkout.webhook(event('WH-NONE', 'PAYMENT.CAPTURE.PENDING', { custom_id: REF }), { ...hookHeaders(), 'paypal-transmission-time': '' });
  assert.equal(none.status, 400);
  assert.equal(a.order().payment.status, 'created');
  for (let i = 0; i < 60; i++) await a.checkout.webhook(event(`WH-N${i}`, 'PAYMENT.CAPTURE.NOTED', { custom_id: REF }), hookHeaders());
  assert.equal(a.order().payment.events.length, 60);
  assert.equal((await a.checkout.webhook(event('WH-N0', 'PAYMENT.CAPTURE.NOTED', { custom_id: REF }), hookHeaders())).body.outcome, 'duplicate');
});

// ── H2: a reversal or a full refund suspends ────────────────────────────────

test('H2: a reversal and a full refund suspend the order; a partial refund does not', async () => {
  const refund = (cap, rid, value) => ({ id: rid, status: 'COMPLETED', amount: { currency_code: 'USD', value }, links: [{ rel: 'up', href: `https://api.sandbox.paypal.com/v2/payments/captures/${cap}` }] });
  const a = setup();
  await a.checkout.capture(REF, (await a.checkout.start(REF)).id);
  const cap = a.order().payment.captureId;
  await a.checkout.webhook(event('WH-R1', 'PAYMENT.CAPTURE.REFUNDED', refund(cap, 'RF00000001', '9.00')), hookHeaders());
  assert.equal(a.order().payment.status, 'partially_refunded');
  assert.equal(a.suspended.length, 0);
  await a.checkout.webhook(event('WH-R2', 'PAYMENT.CAPTURE.REFUNDED', refund(cap, 'RF00000002', '40.00')), hookHeaders());
  assert.deepEqual(a.suspended.map((x) => [x.id, x.kind]), [[REF, 'refunded']]);
  const b = setup();
  await b.checkout.capture(REF, (await b.checkout.start(REF)).id);
  await b.checkout.webhook(event('WH-V1', 'PAYMENT.CAPTURE.REVERSED', refund(b.order().payment.captureId, 'RF00000003', '49.00')), hookHeaders());
  assert.deepEqual(b.suspended.map((x) => x.kind), ['reversed']);
});

let k = 0;
async function storedOrder(extra = {}) {
  k += 1;
  const slug = `couple-${k}-wedding`;
  await store.createInvitation({ slug, version: 1, status: 'published', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', publishedAt: '2026-10-01T00:00:00Z', draft: { theme: 'mahal' }, published: { theme: 'mahal' } });
  const o = {
    id: `ord${String(k).padStart(9, '0')}`, ref: `NM-${10000 + k}`, at: '2026-10-10T00:00:00Z', kind: 'order', status: 'new', name: 'Gita', plan: 'premium', amount: { npr: 9000, usd: 49 }, invitation: slug,
    payment: { provider: 'paypal', env: 'live', status: 'paid', plan: 'premium', amount: '49.00', currency: 'USD', paypalOrderId: `5O1901${String(k).padStart(11, '0')}`, captureId: `CAP${String(k).padStart(8, '0')}`, events: [] },
    pay: { status: 'confirmed', via: 'paypal', proofs: [], history: [] },
    ...extra,
  };
  await store.addOrder(o, 5000);
  return { o, slug };
}

test('H2: suspending hides the invitation from guests, stops the customer editing, emails the admin; staff with finance lift it', async () => {
  const pp = fakePayPal();
  const checkout = createCheckout({ client: createClient({ ...CONFIG, fetch: pp.fetch }), config: CONFIG, getOrder: orders.getOrder, findOrder: orders.findOrder, mutateOrder: orders.mutateOrder, readSite: async () => SITE });
  const { o, slug } = await storedOrder();
  mails.length = 0;
  const out = await checkout.webhook(event('WH-REV-1', 'PAYMENT.CAPTURE.REVERSED', { id: 'RFREV00001', status: 'COMPLETED', amount: { currency_code: 'USD', value: '49.00' }, links: [{ rel: 'up', href: `https://api.paypal.com/v2/payments/captures/${o.payment.captureId}` }] }), hookHeaders());
  assert.equal(out.body.outcome, 'applied');
  const s = await store.getOrderById(o.id);
  assert.equal(s.access, 'suspended');
  assert.equal(s.suspension.kind, 'reversed');
  const doc = await store.getInvitation(slug);
  assert.ok(doc.suspended);
  assert.equal(store.isLive(doc), false);
  assert.equal(doc.published.theme, 'mahal'); // kept, for when it is lifted
  await assert.rejects(inv.publicData({ params: { slug }, session: null }, fakeRes()), (err) => err.status === 404); // guests: "not available"
  assert.equal(mails.length, 1);
  assert.equal(mails[0].subject, `Payment reversed for ${o.ref}`);
  assert.equal(mails[0].to[0].email, 'owner@test.local');
  // the customer may look at it, not change it
  const editor = auth.requireEditor(store.peekInvitation);
  const customerReq = (method) => ({ method, params: { slug }, session: { role: 'customer', csrf: 'c' }, customer: { id: 'cu1', invitations: [{ slug }] }, get: () => undefined });
  const put = fakeRes();
  await editor(customerReq('PUT'), put, () => assert.fail('a suspended invitation must not be saved by the customer'));
  assert.deepEqual([put.code, put.body.code], [403, 'suspended']);
  let looked = false;
  await editor(customerReq('GET'), fakeRes(), () => { looked = true; });
  assert.equal(looked, true);
  // twice is once
  assert.equal(await suspendOrder(o.id, 'again'), false);
  assert.equal(mails.length, 1);
  // only finance lifts it
  const noFin = { ...staff(['orders']), params: { id: o.id }, body: { access: 'active' } };
  await assert.rejects(orders.update(noFin, fakeRes()), (err) => err.status === 403);
  const res = fakeRes();
  await orders.update({ ...staff(['orders', 'finance']), params: { id: o.id }, body: { access: 'active' } }, res);
  assert.equal(res.body.order.access, 'active');
  assert.equal(res.body.order.suspension.liftedBy, 'staff@test.local');
  assert.equal(store.isLive(await store.getInvitation(slug)), true);
});

test('H2: free access is never suspended; a full PayPal refund or "Mark refunded" suspends, a partial refund does not', async () => {
  const { o: comped } = await storedOrder({ payment: undefined, pay: { status: 'comped', proofs: [], history: [], comp: { plan: 'premium' } } });
  assert.equal(await suspendOrder(comped.id, 'Payment refunded in full'), false);
  assert.equal((await store.getOrderById(comped.id)).access, undefined);
  // PayPal refund of everything from the dashboard
  const pp = fakePayPal();
  const baseFetch = pp.fetch;
  pp.fetch = async (url, init) => (/\/refund$/.test(new URL(url).pathname)
    ? { ok: true, status: 201, headers: new Headers(), text: async () => JSON.stringify({ id: 'RFDASH0001', status: 'COMPLETED' }) }
    : baseFetch(url, init));
  const checkout = createCheckout({ client: createClient({ ...CONFIG, fetch: pp.fetch }), config: CONFIG, getOrder: orders.getOrder, findOrder: orders.findOrder, mutateOrder: orders.mutateOrder, readSite: async () => SITE });
  const { o, slug } = await storedOrder();
  const r = await checkout.refund(o.id, { amount: '49.00', reason: 'cancelled' });
  assert.equal(r.order.access, 'suspended');
  assert.ok((await store.getInvitation(slug)).suspended);
  const { o: part } = await storedOrder();
  const pp2 = fakePayPal();
  const base2 = pp2.fetch;
  pp2.fetch = async (url, init) => (/\/refund$/.test(new URL(url).pathname)
    ? { ok: true, status: 201, headers: new Headers(), text: async () => JSON.stringify({ id: 'RFDASH0002', status: 'COMPLETED' }) }
    : base2(url, init));
  const c2 = createCheckout({ client: createClient({ ...CONFIG, fetch: pp2.fetch }), config: CONFIG, getOrder: orders.getOrder, findOrder: orders.findOrder, mutateOrder: orders.mutateOrder, readSite: async () => SITE });
  const r2 = await c2.refund(part.id, { amount: '10.00', reason: 'one event' });
  assert.equal(r2.order.access, undefined);
  // "Mark refunded" on a cash payment gives everything back: suspended too
  const { o: cash, slug: cashSlug } = await storedOrder({ payment: undefined, pay: { status: 'confirmed', via: 'manual', manual: { method: 'Cash' }, received: { amount: 9000, currency: 'NPR', label: 'Cash', at: '2026-10-11T00:00:00Z' }, proofs: [], history: [] } });
  const res = fakeRes();
  await orders.update({ ...staff(['orders', 'finance']), params: { id: cash.id }, body: { payment: { status: 'refunded' } } }, res);
  assert.deepEqual([res.body.order.payStatus, res.body.order.access], ['refunded', 'suspended']);
  assert.ok((await store.getInvitation(cashSlug)).suspended);
});

// ── M1: money edits need finance ────────────────────────────────────────────

test('M1: staff with orders only cannot confirm payments or change amounts; other edits still work', async () => {
  const { o } = await storedOrder({ payment: undefined, pay: { status: 'awaiting_payment', proofs: [], history: [] } });
  const call = (perms, body) => orders.update({ ...staff(perms), params: { id: o.id }, body }, fakeRes());
  await assert.rejects(call(['orders'], { payment: { status: 'confirmed', manual: true, method: 'Cash' } }), (err) => err.status === 403);
  await assert.rejects(call(['orders'], { amount: { npr: 1, usd: null } }), (err) => err.status === 403);
  await call(['orders'], { status: 'contacted', notes: 'called' });
  const after = await store.getOrderById(o.id);
  assert.deepEqual([after.status, after.notes, after.pay.status, after.amount.npr], ['contacted', 'called', 'awaiting_payment', 9000]);
  await call(['orders', 'finance'], { payment: { status: 'confirmed', manual: true, method: 'Cash' } });
  assert.equal((await store.getOrderById(o.id)).pay.status, 'confirmed');
});

test('M2: changing the amount cancels an open PayPal checkout', async () => {
  const { o } = await storedOrder({ payment: { provider: 'paypal', env: 'live', status: 'created', plan: 'premium', amount: '49.00', currency: 'USD', paypalOrderId: '5O190127TN3647150', events: [] }, pay: { status: 'awaiting_payment', proofs: [], history: [] } });
  await orders.update({ ...staff(['orders', 'finance']), params: { id: o.id }, body: { amount: { npr: 9000, usd: 59 } } }, fakeRes());
  const after = await store.getOrderById(o.id);
  assert.equal(after.payment.status, 'cancelled');
});

// ── L3: the bare order id ───────────────────────────────────────────────────

test('L3: the bare order id opens only a legacy order (no pay token) or the signed-in owner\'s own', async () => {
  const express = (await import('express')).default;
  const pp = fakePayPal();
  const mem = memoryOrders([
    { id: REF, kind: 'order', plan: 'premium', status: 'new' }, // from before pay tokens
    { id: 'Tok123_-xyzQ', ref: 'NM-55555', customerId: 'cu1', payTokenHash: 'a'.repeat(64), kind: 'order', plan: 'premium', status: 'new' },
  ]);
  const on = createPayments({ config: CONFIG, fetch: pp.fetch, deps: { ...mem, readSite: async () => SITE } });
  const app = express();
  app.use((req, res, next) => {
    const who = req.get('x-test-customer');
    req.session = who ? { role: 'customer', csrf: 'csrf-1' } : null;
    req.customer = who ? { id: who } : null;
    next();
  });
  app.use('/on', on.router);
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}`;
  const post = (body, headers = {}) => fetch(`${base}/on/paypal/order`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...headers }, body: JSON.stringify(body) });
  try {
    assert.equal((await post({ ref: REF })).status, 201);
    assert.equal((await post({ ref: 'Tok123_-xyzQ' })).status, 404); // has a pay token: the id alone is not enough
    assert.equal((await post({ ref: 'Tok123_-xyzQ' }, { 'x-test-customer': 'cu2', 'x-csrf-token': 'csrf-1' })).status, 404);
    assert.equal((await post({ ref: 'Tok123_-xyzQ' }, { 'x-test-customer': 'cu1' })).status, 403); // no CSRF token
    assert.equal((await post({ ref: 'Tok123_-xyzQ' }, { 'x-test-customer': 'cu1', 'x-csrf-token': 'csrf-1' })).status, 201);
    assert.equal((await post({ ref: 'Nope23_-xyzQ' })).status, 404);
  } finally {
    server.close();
  }
});

// ── L4: HEIC limits before decoding ─────────────────────────────────────────

test('L4: a HEIC declaring too many pixels (or none) is refused before it is decoded', async () => {
  const box = (type, body) => { const b = Buffer.alloc(8 + body.length); b.writeUInt32BE(8 + body.length, 0); b.write(type, 4, 'latin1'); body.copy(b, 8); return b; };
  const ftyp = box('ftyp', Buffer.from('heic\0\0\0\0mif1heic', 'latin1'));
  const ispe = (w, h) => { const b = Buffer.alloc(12); b.writeUInt32BE(w, 4); b.writeUInt32BE(h, 8); return box('ispe', b); };
  const huge = Buffer.concat([ftyp, box('meta', Buffer.concat([ispe(512, 512), ispe(20000, 20000)])), Buffer.alloc(64)]);
  assert.equal(heicPixels(huge), 20000 * 20000);
  await assert.rejects(proofImage(huge), (err) => err.status === 413);
  const blind = Buffer.concat([ftyp, Buffer.alloc(64)]);
  assert.equal(heicPixels(blind), 0);
  await assert.rejects(proofImage(blind), (err) => err.status === 415);
  await assert.rejects(proofImage(Buffer.alloc(9 * 1024 * 1024)), (err) => err.status === 413);
});
