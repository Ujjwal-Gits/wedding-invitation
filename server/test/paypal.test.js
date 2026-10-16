// PayPal checkout against a mocked PayPal API (no network, no credentials). Run: npm test (in server/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Keep every file the server code touches in a throwaway folder, never server/data.
const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-pay-'));
process.env.DATA_ROOT = DATA_ROOT;

const store = await import('../lib/store.js');
store.openStore(); // SQLite (default) or JSON files, in DATA_ROOT
process.on('exit', () => {
  try { store.closeStore(); } catch { /* already closed */ }
  try { rmSync(DATA_ROOT, { recursive: true, force: true }); } catch { /* Windows may hold the file a moment */ }
});
const { readConfig, createClient } = await import('../lib/payments/paypal.js');
const { createCheckout, toCents } = await import('../lib/payments/checkout.js');
const { createPayments, withPayPalCsp } = await import('../lib/payments/routes.js');

const CONFIG = { env: 'sandbox', clientId: 'AaBbCcDdEeFfGgHhIiJj', secret: 'SecretSecretSecretSecret', webhookId: 'WH12345678', enabled: true, problems: [] };
const REF = 'Abc123_-xyzQ';

/** A fake PayPal: tokens, orders, captures and the signature check, with knobs for failures. */
function fakePayPal() {
  const s = { tokens: 0, creates: [], captures: 0, verify: 'SUCCESS', verifyBodies: [], orders: new Map(), next: 1, captureAs: null, captureError: null, payer: { email_address: 'buyer@example.com', name: { given_name: 'Sita', surname: 'Rai' } } };
  const reply = (status, body) => ({ ok: status < 300, status, headers: new Headers(), text: async () => JSON.stringify(body) });
  s.fetch = async (url, init) => {
    const path = new URL(url).pathname;
    if (path === '/v1/oauth2/token') {
      assert.match(init.headers.Authorization, /^Basic /);
      s.tokens += 1;
      return reply(200, { access_token: `tok${s.tokens}`, expires_in: 32400 });
    }
    assert.match(init.headers.Authorization, /^Bearer tok\d+$/);
    if (path === '/v2/checkout/orders' && init.method === 'POST') {
      const b = JSON.parse(init.body);
      const id = `5O19012${String(s.next++).padStart(10, '0')}`;
      s.creates.push({ body: b, requestId: init.headers['PayPal-Request-Id'] });
      s.orders.set(id, { pu: b.purchase_units[0], status: 'CREATED' });
      return reply(201, { id, status: 'CREATED' });
    }
    let m = /^\/v2\/checkout\/orders\/([A-Z0-9]+)\/capture$/.exec(path);
    if (m) {
      s.captures += 1;
      if (s.captureError) return reply(422, { name: 'UNPROCESSABLE_ENTITY', details: [{ issue: s.captureError }], debug_id: 'dbg1' });
      const o = s.orders.get(m[1]);
      if (!o) return reply(404, { name: 'RESOURCE_NOT_FOUND' });
      o.status = 'COMPLETED';
      return reply(201, captured(m[1], o));
    }
    m = /^\/v2\/checkout\/orders\/([A-Z0-9]+)$/.exec(path);
    if (m) { const o = s.orders.get(m[1]); return reply(200, captured(m[1], o)); }
    if (path === '/v1/notifications/verify-webhook-signature') {
      s.verifyBodies.push(init.body);
      JSON.parse(init.body); // must be valid JSON
      return reply(200, { verification_status: s.verify });
    }
    return reply(404, { name: 'NOT_FOUND' });
  };
  const captured = (id, o) => {
    const amount = s.captureAs?.amount || o.pu.amount;
    return {
      id, status: s.captureAs?.orderStatus || 'COMPLETED', payer: s.payer,
      purchase_units: [{ reference_id: o.pu.reference_id, payments: { captures: [{ id: `CAP${id.slice(-8)}`, status: s.captureAs?.status || 'COMPLETED', amount, custom_id: o.pu.custom_id }] } }],
    };
  };
  return s;
}

/** In-memory orders with the same helper shapes as lib/orders.js. */
function memoryOrders(list) {
  const all = list.map((o) => structuredClone(o));
  return {
    all,
    getOrder: async (id) => structuredClone(all.find((o) => o.id === id) || null),
    findOrder: async (pred) => structuredClone(all.find(pred) || null),
    mutateOrder: async (id, fn) => {
      const o = all.find((x) => x.id === id);
      if (!o) throw Object.assign(new Error('Request not found.'), { status: 404, expose: true });
      await fn(o);
      return structuredClone(o);
    },
  };
}
const SITE = { plans: [{ id: 'premium', name: 'Premium', price: 9000, priceUsd: 49 }, { id: 'classic', name: 'Classic', price: 5000, priceUsd: null }] };

function setup({ order = {}, site = SITE } = {}) {
  const pp = fakePayPal();
  const store = memoryOrders([{ id: REF, kind: 'order', plan: 'premium', name: 'Sita', phone: '9800000000', status: 'new', at: '2026-10-16T00:00:00Z', ...order }]);
  const client = createClient({ ...CONFIG, fetch: pp.fetch });
  const checkout = createCheckout({ client, config: CONFIG, ...store, readSite: async () => site });
  return { pp, store, client, checkout, order: () => store.all[0] };
}
const hookHeaders = {
  'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
  'paypal-transmission-id': 'tid-1', 'paypal-transmission-sig': 'sig==', 'paypal-transmission-time': '2026-10-16T10:00:00Z',
};
const event = (id, type, resource) => JSON.stringify({ id, event_type: type, resource });

test('config: off unless all four values are set; never live by accident', () => {
  assert.equal(readConfig({}).enabled, false);
  const on = readConfig({ PAYPAL_CLIENT_ID: CONFIG.clientId, PAYPAL_CLIENT_SECRET: CONFIG.secret, PAYPAL_WEBHOOK_ID: CONFIG.webhookId });
  assert.equal(on.enabled, true);
  assert.equal(on.env, 'sandbox');
  assert.equal(readConfig({ PAYPAL_ENV: 'prod', PAYPAL_CLIENT_ID: CONFIG.clientId, PAYPAL_CLIENT_SECRET: CONFIG.secret, PAYPAL_WEBHOOK_ID: CONFIG.webhookId }).enabled, false);
  assert.equal(readConfig({ PAYPAL_ENV: 'live', PAYPAL_CLIENT_ID: CONFIG.clientId, PAYPAL_CLIENT_SECRET: CONFIG.secret, PAYPAL_WEBHOOK_ID: CONFIG.webhookId }).env, 'live');
});

test('cents', () => {
  assert.equal(toCents('49.00'), 4900);
  assert.equal(toCents('49.5'), 4950);
  assert.equal(toCents(49), 4900);
  assert.ok(Number.isNaN(toCents('49.001')));
  assert.ok(Number.isNaN(toCents('-1')));
});

test('OAuth token is cached and shared, and refreshed after a 401', async () => {
  const pp = fakePayPal();
  const client = createClient({ ...CONFIG, fetch: pp.fetch });
  await Promise.all([client.accessToken(), client.accessToken(), client.accessToken()]);
  assert.equal(pp.tokens, 1);
  let first = true;
  const inner = pp.fetch;
  const client2 = createClient({ ...CONFIG, fetch: async (url, init) => {
    if (url.includes('/v2/') && first) { first = false; return { ok: false, status: 401, headers: new Headers(), text: async () => '{}' }; }
    return inner(url, init);
  } });
  const o = await client2.createOrder({ ref: REF, amount: '1.00', currency: 'USD', description: 'x', requestId: 'r1' });
  assert.ok(o.id);
  assert.equal(pp.tokens, 3); // client 1 once, client 2 twice (the 401 forced a new token)
});

test('create: price comes from site.json in USD, never from the client', async () => {
  const { pp, checkout, order } = setup();
  const out = await checkout.start(REF);
  assert.equal(out.amount, '49.00');
  assert.equal(out.currency, 'USD');
  const pu = pp.creates[0].body.purchase_units[0];
  assert.deepEqual(pu.amount, { currency_code: 'USD', value: '49.00' });
  assert.equal(pu.custom_id, REF);
  assert.equal(pp.creates[0].body.intent, 'CAPTURE');
  assert.ok(pp.creates[0].requestId);
  assert.equal(order().payment.status, 'created');
  assert.equal(order().payment.paypalOrderId, out.id);
});

test('create: plans without a USD price, custom requests and missing requests are refused', async () => {
  await assert.rejects(setup({ order: { plan: 'classic' } }).checkout.start(REF), { status: 400 });
  await assert.rejects(setup({ order: { kind: 'custom', plan: undefined } }).checkout.start(REF), { status: 400 });
  await assert.rejects(setup().checkout.start('Nope12345678'), { status: 404 });
});

test('capture: verifies and records paid once; a second capture is a no-op', async () => {
  const { pp, checkout, order } = setup();
  const { id } = await checkout.start(REF);
  const out = await checkout.capture(REF, id);
  assert.equal(out.status, 'paid');
  assert.equal(out.repeat, false);
  const p = order().payment;
  assert.equal(p.status, 'paid');
  assert.equal(p.amount, '49.00');
  assert.equal(p.currency, 'USD');
  assert.equal(p.payerEmail, 'buyer@example.com');
  assert.ok(p.captureId && p.paidAt);
  const again = await checkout.capture(REF, id);
  assert.equal(again.repeat, true);
  assert.equal(pp.captures, 1);
  assert.equal(order().payment.paidAt, p.paidAt);
  await assert.rejects(checkout.start(REF), { status: 409 }); // no second checkout for a paid request
});

test('capture: two at once capture at PayPal only once', async () => {
  const { pp, checkout, order } = setup();
  const { id } = await checkout.start(REF);
  const [a, b] = await Promise.all([checkout.capture(REF, id), checkout.capture(REF, id)]);
  assert.equal(pp.captures, 1);
  assert.deepEqual([a.repeat, b.repeat].sort(), [false, true]);
  assert.equal(order().payment.status, 'paid');
});

test('capture: wrong amount is never recorded as paid', async () => {
  const { pp, checkout, order } = setup();
  const { id } = await checkout.start(REF);
  pp.captureAs = { amount: { currency_code: 'USD', value: '1.00' } };
  await assert.rejects(checkout.capture(REF, id), { status: 409 });
  assert.equal(order().payment.status, 'mismatch');
  assert.match(order().payment.problem, /1\.00 USD/);
  await assert.rejects(checkout.start(REF), { status: 409 });
});

test('capture: wrong currency is never recorded as paid', async () => {
  const { pp, checkout, order } = setup();
  const { id } = await checkout.start(REF);
  pp.captureAs = { amount: { currency_code: 'EUR', value: '49.00' } };
  await assert.rejects(checkout.capture(REF, id), { status: 409 });
  assert.equal(order().payment.status, 'mismatch');
});

test('capture: status other than COMPLETED is not paid', async () => {
  const { pp, checkout, order } = setup();
  const { id } = await checkout.start(REF);
  pp.captureAs = { status: 'PENDING' };
  const out = await checkout.capture(REF, id);
  assert.equal(out.status, 'pending');
  assert.equal(order().payment.status, 'pending');
  const s2 = setup();
  const r2 = await s2.checkout.start(REF);
  s2.pp.captureAs = { status: 'DECLINED' };
  await assert.rejects(s2.checkout.capture(REF, r2.id), { status: 402 });
  assert.equal(s2.order().payment.status, 'denied');
});

test('capture: a PayPal order id that is not this request\'s is refused', async () => {
  const { checkout } = setup();
  await checkout.start(REF);
  await assert.rejects(checkout.capture(REF, 'ZZZZZZZZZZZZZZZZ'), { status: 400 });
});

test('capture: already captured at PayPal reads the order instead; declined card asks to retry', async () => {
  const a = setup();
  const { id } = await a.checkout.start(REF);
  a.pp.captureError = 'ORDER_ALREADY_CAPTURED';
  assert.equal((await a.checkout.capture(REF, id)).status, 'paid');
  const b = setup();
  const r = await b.checkout.start(REF);
  b.pp.captureError = 'INSTRUMENT_DECLINED';
  await assert.rejects(b.checkout.capture(REF, r.id), (err) => err.status === 402 && err.code === 'retry');
  assert.equal(b.order().payment.status, 'created');
});

test('webhook: a bad signature changes nothing', async () => {
  const { pp, checkout, order } = setup();
  const { id } = await checkout.start(REF);
  pp.verify = 'FAILURE';
  const out = await checkout.webhook(event('WH-1', 'PAYMENT.CAPTURE.COMPLETED', { id: 'CAP1', status: 'COMPLETED', custom_id: REF, amount: { currency_code: 'USD', value: '49.00' }, supplementary_data: { related_ids: { order_id: id } } }), hookHeaders);
  assert.equal(out.status, 400);
  assert.equal(order().payment.status, 'created');
  const missing = await checkout.webhook(event('WH-2', 'PAYMENT.CAPTURE.COMPLETED', {}), { ...hookHeaders, 'paypal-transmission-sig': '' });
  assert.equal(missing.status, 400);
});

test('webhook: the event is sent to PayPal byte for byte', async () => {
  const { pp, checkout } = setup();
  await checkout.start(REF);
  const raw = '{"id":"WH-9","event_type":"PAYMENT.SALE.COMPLETED","resource":{"note":"keeps   spacing é"}}';
  await checkout.webhook(raw, hookHeaders);
  assert.ok(pp.verifyBodies[0].endsWith(`"webhook_event":${raw}}`));
  assert.equal(JSON.parse(pp.verifyBodies[0]).webhook_id, CONFIG.webhookId);
});

test('webhook: completed records paid (if the page never captured); replays and late events do not double-record', async () => {
  const { checkout, order } = setup();
  const { id } = await checkout.start(REF);
  const done = { id: 'CAPX1', status: 'COMPLETED', custom_id: REF, amount: { currency_code: 'USD', value: '49.00' }, supplementary_data: { related_ids: { order_id: id } } };
  assert.equal((await checkout.webhook(event('WH-A', 'PAYMENT.CAPTURE.COMPLETED', done), hookHeaders)).body.outcome, 'applied');
  const paidAt = order().payment.paidAt;
  assert.equal(order().payment.status, 'paid');
  assert.equal((await checkout.webhook(event('WH-A', 'PAYMENT.CAPTURE.COMPLETED', done), hookHeaders)).body.outcome, 'duplicate');
  assert.equal((await checkout.capture(REF, id)).repeat, true);
  assert.equal(order().payment.paidAt, paidAt);
});

test('webhook: wrong amount in a completed event is flagged, not paid', async () => {
  const { checkout, order } = setup();
  const { id } = await checkout.start(REF);
  await checkout.webhook(event('WH-B', 'PAYMENT.CAPTURE.COMPLETED', { id: 'CAPX2', status: 'COMPLETED', custom_id: REF, amount: { currency_code: 'USD', value: '4.90' }, supplementary_data: { related_ids: { order_id: id } } }), hookHeaders);
  assert.equal(order().payment.status, 'mismatch');
});

test('webhook: refunds (full and partial), replayed refunds and a late completed event', async () => {
  const { checkout, order } = setup();
  const { id } = await checkout.start(REF);
  await checkout.capture(REF, id);
  const cap = order().payment.captureId;
  const refund = (rid, value) => ({ id: rid, status: 'COMPLETED', amount: { currency_code: 'USD', value }, links: [{ rel: 'up', href: `https://api.sandbox.paypal.com/v2/payments/captures/${cap}` }] });
  await checkout.webhook(event('WH-R1', 'PAYMENT.CAPTURE.REFUNDED', refund('1JU08902781691411', '9.00')), hookHeaders);
  assert.equal(order().payment.status, 'partially_refunded');
  assert.equal(order().payment.refunded, '9.00');
  await checkout.webhook(event('WH-R1', 'PAYMENT.CAPTURE.REFUNDED', refund('1JU08902781691411', '9.00')), hookHeaders); // replay
  await checkout.webhook(event('WH-R1b', 'PAYMENT.CAPTURE.REFUNDED', refund('1JU08902781691411', '9.00')), hookHeaders); // same refund, new event id
  assert.equal(order().payment.refunded, '9.00');
  await checkout.webhook(event('WH-R2', 'PAYMENT.CAPTURE.REFUNDED', refund('2KV19013892702522', '40.00')), hookHeaders);
  assert.equal(order().payment.status, 'refunded');
  assert.equal(order().payment.refunded, '49.00');
  // an old COMPLETED delivered late must not flip it back to paid
  await checkout.webhook(event('WH-OLD', 'PAYMENT.CAPTURE.COMPLETED', { id: cap, status: 'COMPLETED', custom_id: REF, amount: { currency_code: 'USD', value: '49.00' } }), hookHeaders);
  assert.equal(order().payment.status, 'refunded');
});

test('webhook: denied marks an unpaid checkout denied, never a paid one', async () => {
  const a = setup();
  const r = await a.checkout.start(REF);
  await a.checkout.webhook(event('WH-D', 'PAYMENT.CAPTURE.DENIED', { id: 'CAPD1', status: 'DECLINED', custom_id: REF, amount: { currency_code: 'USD', value: '49.00' }, supplementary_data: { related_ids: { order_id: r.id } } }), hookHeaders);
  assert.equal(a.order().payment.status, 'denied');
  const b = setup();
  const r2 = await b.checkout.start(REF);
  await b.checkout.capture(REF, r2.id);
  await b.checkout.webhook(event('WH-D2', 'PAYMENT.CAPTURE.DENIED', { id: b.order().payment.captureId, status: 'DECLINED', custom_id: REF, amount: { currency_code: 'USD', value: '49.00' } }), hookHeaders);
  assert.equal(b.order().payment.status, 'paid');
});

test('webhook: an approved order the page never captured is captured by the server', async () => {
  const { pp, checkout, order } = setup();
  const { id } = await checkout.start(REF);
  await checkout.webhook(event('WH-AP', 'CHECKOUT.ORDER.APPROVED', { id, status: 'APPROVED', purchase_units: [{ reference_id: REF, custom_id: REF }] }), hookHeaders);
  assert.equal(order().payment.status, 'paid');
  assert.equal(pp.captures, 1);
});

test('CSP: PayPal sources only in the directives the SDK needs', () => {
  const out = withPayPalCsp("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self'; object-src 'none'");
  assert.match(out, /script-src 'self' https:\/\/\*\.paypal\.com https:\/\/\*\.paypalobjects\.com/);
  assert.match(out, /frame-src 'self' https:\/\/\*\.paypal\.com/);
  assert.match(out, /connect-src 'self' https:\/\/\*\.paypal\.com/);
  assert.match(out, /default-src 'self';/);
  assert.doesNotMatch(out, /object-src[^;]*paypal/);
});

test('routes: Origin check, honeypot, validation, disabled state, page headers', async () => {
  const express = (await import('express')).default;
  const pp = fakePayPal();
  const store = memoryOrders([{ id: REF, kind: 'order', plan: 'premium', name: 'Sita', phone: '9800000000', status: 'new' }]);
  const on = createPayments({ config: CONFIG, fetch: pp.fetch, deps: { ...store, readSite: async () => SITE } });
  const off = createPayments({ config: readConfig({}) });
  const app = express();
  app.use((req, res, next) => { res.setHeader('Content-Security-Policy', "script-src 'self'; frame-src 'self'"); res.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); next(); });
  app.use(on.pageHeaders);
  app.use('/on', on.router);
  app.use('/off', off.router);
  app.get('/', (req, res) => res.send('page'));
  app.get('/studio/', (req, res) => res.send('studio'));
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}`;
  const post = (path, body, origin = base) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) });
  try {
    assert.equal((await post('/on/paypal/order', { ref: REF }, 'https://evil.example')).status, 403);
    assert.equal((await post('/on/paypal/order', { ref: REF, website: 'spam' })).status, 400);
    assert.equal((await post('/on/paypal/order', { ref: '../etc' })).status, 400);
    assert.equal((await post('/on/paypal/order', { ref: REF, amount: '0.01' })).status, 201); // a client amount is ignored
    assert.equal(pp.creates.at(-1).body.purchase_units[0].amount.value, '49.00');
    assert.equal((await post('/on/paypal/capture', { ref: REF, orderID: 'bad id' })).status, 400);
    assert.equal((await post('/off/paypal/order', { ref: REF })).status, 503);
    assert.deepEqual(await (await fetch(`${base}/off/config`)).json(), { paypal: { enabled: false } });
    const cfg = await (await fetch(`${base}/on/config`)).json();
    assert.equal(cfg.paypal.clientId, CONFIG.clientId);
    assert.equal(JSON.stringify(cfg).includes(CONFIG.secret), false);
    const page = await fetch(`${base}/`);
    assert.match(page.headers.get('content-security-policy'), /paypal/);
    assert.equal(page.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups');
    const studio = await fetch(`${base}/studio/`);
    assert.doesNotMatch(studio.headers.get('content-security-policy'), /paypal/);
    assert.equal(studio.headers.get('cross-origin-opener-policy'), 'same-origin');
    const hook = await fetch(`${base}/on/paypal/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...hookHeaders }, body: event('WH-Z', 'PAYMENT.SALE.COMPLETED', {}) });
    assert.equal(hook.status, 200);
  } finally {
    server.close();
  }
});

test('site.json: priceUsd per plan is validated on the server (usdPrice, the old name, still accepted)', async () => {
  const { putSite, readSite } = await import('../lib/site.js');
  const res = () => ({ body: null, json(b) { this.body = b; return this; } });
  const plan = (priceUsd) => ({ plans: [{ id: 'premium', name: 'Premium', price: 9000, priceUsd }] });
  const ok = res();
  await putSite({ body: plan('49.5') }, ok);
  assert.equal(ok.body.plans[0].priceUsd, 49.5);
  assert.equal((await readSite()).plans[0].priceUsd, 49.5);
  const legacy = res();
  await putSite({ body: { plans: [{ id: 'premium', name: 'Premium', price: 9000, usdPrice: 39 }] } }, legacy);
  assert.equal(legacy.body.plans[0].priceUsd, 39);
  const empty = res();
  await putSite({ body: plan('') }, empty);
  assert.equal(empty.body.plans[0].priceUsd, null);
  for (const bad of [0.5, -3, 10001, 49.999, 'abc', '1e3', true]) {
    await assert.rejects(putSite({ body: plan(bad) }, res()), (err) => err.status === 400 && err.errors.some((e) => e.path === 'plans[0].priceUsd'), String(bad));
  }
});

test('orders: the public POST returns the reference, and the store helpers find and update it', async () => {
  const orders = await import('../lib/orders.js');
  const req = { body: { kind: 'order', plan: 'premium', name: 'Sita Rai', phone: '9800000000', message: '', website: '' }, get: (h) => (h === 'origin' ? 'http://localhost:5195' : h === 'host' ? 'localhost:8787' : undefined), app: { get: () => false }, ip: '127.0.0.1', socket: {}, headers: {} };
  const res = { code: 0, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, set() { return this; } };
  await orders.submit(req, res);
  assert.equal(res.code, 201);
  assert.match(res.body.ref, /^NM-\d{5,6}$/);
  const found = await orders.orderByRefAndToken(res.body.ref, res.body.payToken);
  assert.match(found.id, /^[A-Za-z0-9_-]{12}$/);
  assert.equal(await orders.orderByRefAndToken(res.body.ref, 'A'.repeat(43)), null);
  const saved = await orders.mutateOrder(found.id, (o) => { o.payment = { provider: 'paypal', status: 'paid', captureId: 'CAPTEST123' }; });
  assert.equal(saved.payment.status, 'paid');
  assert.equal((await orders.findOrder((o) => o.payment?.captureId === 'CAPTEST123')).id, found.id);
  assert.equal(await orders.getOrder('not-an-id'), null);
});
