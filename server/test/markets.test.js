// Markets (Nepal and International), enquiries (quote, quote sent, order) and the routes' permissions, against the real
// server (index.js) in a child process with a throwaway DATA_ROOT. Run: npm test, and STORE=json npm test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { hash as argonHash } from '@node-rs/argon2';
import { checkPhone, zoneOfPhone, customerMarket, likelyZone } from '../lib/market.js';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-markets-'));
const OWNER = { email: 'owner@test.local', password: 'owner-password-1' };
let child;
let base;
let owner;

const freePort = () => new Promise((ok, fail) => {
  const s = createServer();
  s.once('error', fail);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
});

before(async () => {
  const port = await freePort();
  base = `http://localhost:${port}`;
  child = spawn(process.execPath, ['index.js'], {
    cwd: resolve(import.meta.dirname, '..'),
    env: {
      ...process.env, DATA_ROOT, PORT: String(port), NODE_ENV: 'test', ADMIN_EMAIL: OWNER.email, DEPTH_ENABLED: '0',
      ADMIN_PASSWORD_HASH: await argonHash(OWNER.password, { memoryCost: 4096, timeCost: 2 }), CLOUDFLARE_ONLY: '0', TRUST_PROXY: '0',
      PUBLIC_ORIGIN: base, BREVO_API_KEY: '', BREVO_SMTP_KEY: '', PAYPAL_CLIENT_ID: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  await new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error(`server did not start:\n${log}`)), 30_000);
    const on = (d) => { log += d; if (log.includes('[studio] API on')) { clearTimeout(t); ok(); } };
    child.stdout.on('data', on);
    child.stderr.on('data', on);
    child.once('exit', (code) => { clearTimeout(t); fail(new Error(`server exited (${code}):\n${log}`)); });
  });
  owner = await browser().login(OWNER.email, OWNER.password);
});

after(() => {
  child?.kill();
  try { rmSync(DATA_ROOT, { recursive: true, force: true }); } catch { /* Windows may hold a file a moment */ }
});

function browser() {
  const b = { cookie: '', csrf: '' };
  b.req = async (path, { method = 'GET', body } = {}) => {
    const headers = { Origin: base };
    if (b.cookie) headers.Cookie = b.cookie;
    if (b.csrf && method !== 'GET') headers['X-CSRF-Token'] = b.csrf;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(base + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    const set = r.headers.get('set-cookie');
    if (set) { const v = set.split(';')[0]; b.cookie = v.endsWith('=') ? '' : v; }
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    if (data && typeof data === 'object' && typeof data.csrf === 'string') b.csrf = data.csrf;
    return { status: r.status, body: data };
  };
  b.login = async (email, password) => {
    const r = await b.req('/api/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(r.status, 200, `login ${email}: ${JSON.stringify(r.body)}`);
    b.me = r.body;
    return b;
  };
  return b;
}

const staff = async (email, perms) => {
  const r = await owner.req('/api/admin/team', { method: 'POST', body: { email, name: email.split('@')[0], password: 'staff-password-1', role: 'admin', perms } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return browser().login(email, 'staff-password-1');
};
const INTL = { kind: 'order', plan: 'shubha', name: 'Emma Clark', phone: '+1 415 555 2671', market: 'intl', website: '' };

test('phone numbers: E.164, the country, and the likely venue zone', () => {
  assert.deepEqual(checkPhone('+1 (415) 555-2671'), { ok: true, e164: '+14155552671', country: 'US' });
  assert.deepEqual(checkPhone('9806393298'), { ok: true, e164: '+9779806393298', country: 'NP' });
  assert.equal(checkPhone('0044 20 7946 0958').country, 'GB');
  assert.equal(checkPhone('12345').ok, false);
  assert.equal(checkPhone('+1 415 <script>').ok, false);
  assert.deepEqual(checkPhone(''), { ok: true, e164: '', country: '' });
  assert.equal(zoneOfPhone('+14155552671'), 'America/Los_Angeles');
  assert.equal(zoneOfPhone('+13125550100'), 'America/Chicago');
  assert.equal(zoneOfPhone('+12125550100'), 'America/New_York');
  assert.equal(zoneOfPhone('+44 20 7946 0958'), 'Europe/London');
  assert.equal(likelyZone({ market: 'np', phone: '+14155552671' }), '');
  // the account's own market first, then orders, then the phone
  assert.equal(customerMarket({ id: 'a', market: 'np', phone: '+14155552671' }, []), 'np');
  assert.equal(customerMarket({ id: 'a', phone: '9806393298' }, [{ customerId: 'a', market: 'intl', at: '1' }]), 'intl');
  assert.equal(customerMarket({ id: 'a', phone: '+14155552671' }, []), 'intl');
  assert.equal(customerMarket({ id: 'a' }, []), 'np');
});

test('plans per market: both by default, saved per plan, refused when empty; orders check it', async () => {
  const cur = (await owner.req('/api/admin/site')).body;
  assert.ok(cur.plans.every((p) => p.markets.join() === 'np,intl'), 'older plans are offered on both');
  const pub0 = (await browser().req('/api/site')).body;
  assert.deepEqual(pub0.markets.intl.plans, ['saral', 'shubha', 'shahi', 'custom']);
  assert.equal(pub0.markets.intl.currency, 'USD');
  assert.equal(pub0.markets.intl.lead, 'email');
  const empty = await owner.req('/api/site', { method: 'PUT', body: { ...cur, plans: cur.plans.map((p) => (p.id === 'saral' ? { ...p, markets: [] } : p)) } });
  assert.equal(empty.status, 400);
  assert.ok(empty.body.errors.some((e) => e.path === 'plans[0].markets'));
  const plans = cur.plans.map((p) => (p.id === 'saral' ? { ...p, markets: ['np'] } : p));
  const put = await owner.req('/api/site', { method: 'PUT', body: { ...cur, plans, intl: { hero: { title: 'Wedding websites for modern couples', subtitle: '' }, contact: { email: 'hello@nimtto.com', whatsapp: '', phone: '', address: '' }, lead: 'email' } } });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  const pub = (await browser().req('/api/site')).body;
  assert.deepEqual(pub.markets.intl.plans, ['shubha', 'shahi', 'custom']);
  assert.deepEqual(pub.markets.np.plans, ['saral', 'shubha', 'shahi', 'custom']);
  assert.equal(pub.markets.intl.hero.title, 'Wedding websites for modern couples');
  assert.equal(pub.markets.intl.contact.email, 'hello@nimtto.com');
  assert.equal(pub.markets.intl.contact.whatsapp, pub.contact.whatsapp, 'empty International fields fall back to Nepal');
  assert.deepEqual(pub.plans.find((p) => p.id === 'saral').markets, ['np']);
  // an International order cannot take a Nepal-only plan
  const bad = await browser().req('/api/orders', { method: 'POST', body: { ...INTL, plan: 'saral', email: 'emma0@example.com', password: 'emma-pass-1' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.fields.includes('plan'));
  assert.equal((await browser().req('/api/orders', { method: 'POST', body: { ...INTL, market: 'mars', email: 'emma0@example.com', password: 'emma-pass-1' } })).body.fields.includes('market'), true);
  assert.equal((await owner.req('/api/site', { method: 'PUT', body: cur })).status, 200);
});

test('orders carry their market: list filter, account market, phone edit and the venue zone', async () => {
  const c = browser();
  const r = await c.req('/api/orders', { method: 'POST', body: { ...INTL, email: 'emma@example.com', password: 'emma-pass-1', bride: 'Emma', groom: 'Liam' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const np = await browser().req('/api/orders', { method: 'POST', body: { kind: 'order', plan: 'shubha', name: 'Gita Thapa', phone: '9800000001', email: 'gita@example.com', password: 'gita-pass-1', website: '' } });
  assert.equal(np.status, 201);
  const all = (await owner.req('/api/orders')).body.orders;
  assert.equal(all.find((o) => o.ref === r.body.ref).market, 'intl');
  assert.equal(all.find((o) => o.ref === np.body.ref).market, 'np');
  const intl = (await owner.req('/api/orders?market=intl')).body.orders;
  assert.ok(intl.length >= 1 && intl.every((o) => o.market === 'intl'));
  assert.equal((await owner.req('/api/orders?market=xx')).status, 400);
  // the account: market from the order (and saved at sign-up), the country from the phone
  assert.equal((await c.req('/api/auth/me')).body.market, 'intl');
  const acc = (await c.req('/api/account')).body;
  assert.deepEqual([acc.market, acc.country, acc.zone, acc.contact.lead], ['intl', 'US', 'America/Los_Angeles', 'email']);
  assert.equal(acc.orders[0].market, 'intl');
  const cust = (await owner.req('/api/admin/customers?market=intl')).body.customers;
  assert.ok(cust.length >= 1 && cust.every((x) => x.market === 'intl'));
  assert.equal(cust.find((x) => x.email === 'emma@example.com').country, 'US');
  assert.ok((await owner.req('/api/admin/customers?market=np')).body.customers.some((x) => x.email === 'gita@example.com'));
  // phone edit: E.164 only (no country code = their market's), CSRF needed
  assert.equal((await c.req('/api/account', { method: 'PATCH', body: { phone: 'not a phone' } })).status, 400);
  assert.equal((await c.req('/api/account', { method: 'PATCH', body: { phone: '+1 312 555 0100' } })).body.customer.phone, '+13125550100');
  assert.equal((await c.req('/api/account', { method: 'PATCH', body: { phone: '(212) 555-0100' } })).body.customer.phone, '+12125550100', 'a US customer types a US number');
  const noCsrf = await fetch(`${base}/api/account`, { method: 'PATCH', headers: { Cookie: c.cookie, Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '+12125550101' }) });
  assert.equal(noCsrf.status, 403);
  // a new invitation from the order starts in the customer's zone (New York, from the 212 number)
  const order = all.find((o) => o.ref === r.body.ref);
  const made = await owner.req(`/api/orders/${order.id}/invitation`, { method: 'POST', body: {} });
  assert.equal(made.status, 201, JSON.stringify(made.body));
  assert.equal(made.body.data.timeZone, 'America/New_York');
  assert.match(made.body.data.weddingDate, /T10:30:00-0[45]:00$/);
  // a Nepal order's invitation stays on Nepal time
  const npOrder = all.find((o) => o.ref === np.body.ref);
  const madeNp = await owner.req(`/api/orders/${npOrder.id}/invitation`, { method: 'POST', body: {} });
  assert.equal(madeNp.body.data.timeZone || 'Asia/Kathmandu', 'Asia/Kathmandu');
  // sign-up from the International website keeps the market on the account
  const s = await browser().req('/api/auth/signup', { method: 'POST', body: { name: 'Ava Stone', email: 'ava@example.com', password: 'ava-pass-12', phone: '+977 980-6393298', market: 'intl' } });
  assert.equal(s.status, 201);
  assert.equal(s.body.market, 'intl');
  const ava = (await owner.req('/api/admin/customers')).body.customers.find((x) => x.email === 'ava@example.com');
  assert.deepEqual([ava.market, ava.marketSet, ava.country, ava.phone], ['intl', true, 'NP', '+9779806393298']);
  const moved = await owner.req(`/api/admin/customers/${ava.id}`, { method: 'PATCH', body: { market: 'np' } });
  assert.equal(moved.body.customer.market, 'np');
});

test('enquiries: quote, quote sent, then an order with a pay link', async () => {
  const c = browser();
  const r = await c.req('/api/orders', { method: 'POST', body: { kind: 'custom', name: 'Olivia Reed', phone: '+1 646 555 0199', email: 'olivia@example.com', password: 'olivia-pass-1', message: 'A garden design in sage and ivory, please.', market: 'intl', website: '' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const o = (await owner.req('/api/orders?market=intl')).body.orders.find((x) => x.ref === r.body.ref);
  assert.equal(o.kind, 'custom');
  assert.equal((await owner.req(`/api/orders/${o.id}/convert`, { method: 'POST', body: {} })).status, 409, 'no price yet');
  const bad = await owner.req(`/api/orders/${o.id}/quote`, { method: 'PATCH', body: { amount: 12.345 } });
  assert.equal(bad.status, 400);
  const q = await owner.req(`/api/orders/${o.id}/quote`, { method: 'PATCH', body: { amount: 349, note: 'Includes two rounds of changes' } });
  assert.equal(q.status, 200, JSON.stringify(q.body));
  assert.deepEqual([q.body.order.quote.amount, q.body.order.quote.currency, q.body.order.quote.sentAt], [349, 'USD', undefined], 'dollars for an International enquiry');
  const sent = await owner.req(`/api/orders/${o.id}/quote`, { method: 'PATCH', body: { sent: true } });
  assert.ok(sent.body.order.quote.sentAt);
  assert.equal(sent.body.order.status, 'contacted');
  assert.equal((await c.req('/api/account')).body.orders.find((x) => x.ref === r.body.ref).quote.amount, 349, 'the customer sees a sent quote');
  // a new price must be sent again
  const changed = await owner.req(`/api/orders/${o.id}/quote`, { method: 'PATCH', body: { amount: 399 } });
  assert.equal(changed.body.order.quote.sentAt, undefined);
  await owner.req(`/api/orders/${o.id}/quote`, { method: 'PATCH', body: { sent: true } });
  const conv = await owner.req(`/api/orders/${o.id}/convert`, { method: 'POST', body: {} });
  assert.equal(conv.status, 200, JSON.stringify(conv.body));
  assert.equal(conv.body.order.kind, 'order');
  assert.equal(conv.body.order.enquiry, true);
  assert.deepEqual(conv.body.order.amount, { npr: null, usd: 399 });
  assert.equal(conv.body.order.plan, 'custom');
  assert.equal(conv.body.order.payStatus, 'awaiting_payment');
  const u = new URL(conv.body.payUrl);
  const pay = await fetch(`${base}/api/orders/${u.pathname.split('/')[2]}/pay?t=${u.searchParams.get('t')}`);
  assert.equal(pay.status, 200);
  assert.equal((await pay.json()).amount.usd, 399);
  assert.equal((await owner.req(`/api/orders/${o.id}/convert`, { method: 'POST', body: {} })).status, 409, 'only once');
  assert.equal((await owner.req(`/api/orders/${o.id}/quote`, { method: 'PATCH', body: { amount: 1 } })).status, 409);
  // a Nepal enquiry is quoted in rupees, whole numbers
  const n = await browser().req('/api/orders', { method: 'POST', body: { kind: 'custom', name: 'Sita Rai', phone: '9800000002', message: 'Our own design', website: '' } });
  const no = (await owner.req('/api/orders?market=np')).body.orders.find((x) => x.ref === n.body.ref);
  assert.equal((await owner.req(`/api/orders/${no.id}/quote`, { method: 'PATCH', body: { amount: 15000.5 } })).status, 400);
  assert.equal((await owner.req(`/api/orders/${no.id}/quote`, { method: 'PATCH', body: { amount: 15000 } })).body.order.quote.currency, 'NPR');
  // an order is not an enquiry
  const plain = (await owner.req('/api/orders')).body.orders.find((x) => x.kind === 'order' && !x.enquiry);
  assert.equal((await owner.req(`/api/orders/${plain.id}/quote`, { method: 'PATCH', body: { amount: 10 } })).status, 409);
});

test('Overview and Finance per market; the new routes keep to their permissions', async () => {
  const m = await owner.req('/api/admin/markets');
  assert.equal(m.status, 200);
  assert.ok(m.body.markets.np.newOrders >= 1);
  assert.ok('enquiriesWaiting' in m.body.markets.intl);
  assert.deepEqual(Object.keys(m.body.markets.intl.paidThisMonth).sort(), ['NPR', 'USD', 'payments']);
  // a paid International order counts in dollars for International only
  const o = (await owner.req('/api/orders?market=intl')).body.orders.find((x) => x.kind === 'order' && !x.enquiry);
  assert.equal((await owner.req(`/api/orders/${o.id}`, { method: 'PATCH', body: { payment: { status: 'confirmed', manual: true, method: 'PayPal', currency: 'USD', amount: 99 } } })).status, 200);
  const all = (await owner.req('/api/admin/finance/summary')).body;
  assert.equal(all.byMarket.intl.thisMonth.USD.received, 99);
  assert.equal(all.byMarket.np.thisMonth.USD.received, 0);
  const intl = (await owner.req('/api/admin/finance/summary?market=intl')).body;
  assert.equal(intl.market, 'intl');
  assert.equal(intl.periods.thisMonth.USD.received, 99);
  const npOnly = (await owner.req('/api/admin/finance/summary?market=np')).body;
  assert.equal(npOnly.periods.thisMonth.USD.received, 0);
  assert.equal((await owner.req('/api/admin/finance/summary?market=eu')).status, 400);
  const tx = (await owner.req('/api/admin/finance/transactions?market=intl')).body;
  assert.ok(tx.items.length >= 1 && tx.items.every((e) => e.market === 'intl'));
  assert.equal((await owner.req('/api/admin/finance/transactions?market=np')).body.items.some((e) => e.ref === o.ref), false);
  assert.equal((await owner.req('/api/admin/markets')).body.markets.intl.paidThisMonth.USD, 99);

  // permissions: orders → quote, convert, market figures; finance → market figures; others → 403
  const ord = await staff('ord@test.local', ['orders']);
  const fin = await staff('fin@test.local', ['finance']);
  const cus = await staff('cus@test.local', ['customers']);
  const thm = await staff('thm@test.local', ['themes']);
  const enq = (await owner.req('/api/orders')).body.orders.find((x) => x.kind === 'custom');
  assert.equal((await ord.req('/api/admin/markets')).status, 200);
  assert.equal((await fin.req('/api/admin/markets')).status, 200);
  assert.equal((await cus.req('/api/admin/markets')).status, 403);
  assert.equal((await thm.req('/api/admin/markets')).status, 403);
  assert.equal((await ord.req(`/api/orders/${enq.id}/quote`, { method: 'PATCH', body: { amount: 20000 } })).status, 200);
  for (const s of [fin, cus, thm]) {
    assert.equal((await s.req(`/api/orders/${enq.id}/quote`, { method: 'PATCH', body: { amount: 1 } })).status, 403);
    assert.equal((await s.req(`/api/orders/${enq.id}/convert`, { method: 'POST', body: {} })).status, 403);
  }
  assert.equal((await ord.req('/api/orders?market=intl')).status, 200);
  assert.equal((await cus.req('/api/orders?market=intl')).status, 403);
  assert.equal((await cus.req('/api/admin/customers?market=intl')).status, 200);
  assert.equal((await ord.req('/api/admin/customers?market=intl')).status, 403);
  assert.equal((await fin.req('/api/admin/finance/summary?market=intl')).status, 200);
  assert.equal((await ord.req('/api/admin/finance/summary?market=intl')).status, 403);
  // customers cannot reach the admin routes, and admins have no /api/account
  assert.equal((await ord.req('/api/account', { method: 'PATCH', body: { phone: '+12125550100' } })).status, 403);
});

test('designs per market: market and style overrides, featured and order per market, scoped to the Themes perm', async () => {
  const cur = (await owner.req('/api/admin/site')).body;
  const meta0 = (await owner.req('/api/meta')).body.themes;
  const [a, b, c] = meta0.filter((t) => t.ready !== false).map((t) => t.slug);
  const bad = await owner.req('/api/site', { method: 'PUT', body: { ...cur, themeMarkets: { [a]: 'mars' } } });
  assert.equal(bad.status, 400);
  const thm = await browser().login('thm@test.local', 'staff-password-1');
  const put = await thm.req('/api/site', { method: 'PUT', body: {
    ...cur, themeMarkets: { [a]: 'intl', [b]: 'both' }, themeStyles: { [a]: 'garden', [b]: 'modern' },
    featuredThemesIntl: [b], themeOrder: { np: [], intl: [b, a] },
    intl: { hero: { title: 'Not mine to change', subtitle: '' }, contact: {}, lead: 'whatsapp' },
  } });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  assert.equal(put.body.themeMarkets[a], 'intl');
  assert.notEqual(put.body.intl.hero.title, 'Not mine to change', 'the Themes perm cannot change the website part');
  const list = (await browser().req('/api/themes?market=intl')).body;
  assert.deepEqual(list.slice(0, 2).map((t) => t.slug), [b, a], 'in the planner order');
  assert.equal(list[0].featured, true);
  assert.equal(list[1].style, 'garden');
  // every design shows on both websites: the market's own first, then the others (never featured there)
  const firstOther = list.findIndex((t) => !(t.market === 'intl' || t.market === 'both'));
  assert.ok(firstOther === -1 || list.slice(firstOther).every((t) => !(t.market === 'intl' || t.market === 'both') && !t.featured));
  const np = (await browser().req('/api/themes?market=np')).body;
  assert.ok(np.findIndex((t) => t.slug === a) > np.findIndex((t) => t.slug === c), 'an International design comes after the Nepal ones');
  assert.ok(np.some((t) => t.slug === b) && np.some((t) => t.slug === c));
  const every = (await browser().req('/api/themes')).body;
  assert.equal(every.find((t) => t.slug === a).market, 'intl');
  assert.equal('featured' in every[0], false, 'without ?market the list is as before');
  const meta = (await owner.req('/api/meta')).body.themes;
  assert.deepEqual([meta.find((t) => t.slug === a).market, meta.find((t) => t.slug === a).style], ['intl', 'garden']);
  // '' clears an override (back to the catalog's)
  const cleared = await owner.req('/api/site', { method: 'PUT', body: { ...put.body, themeMarkets: { [a]: '' } } });
  assert.equal(cleared.body.themeMarkets[a], undefined);
  assert.equal((await owner.req('/api/site', { method: 'PUT', body: cur })).status, 200);
});
