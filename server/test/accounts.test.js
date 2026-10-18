// Customer accounts, the minimal order, and design tiers (lib/accounts.js, lib/customers.js, lib/auth.js, lib/orders.js,
// lib/site.js). Runs a small app with the real handlers, sessions and store in a throwaway DATA_ROOT.
// Run: npm test (in server/), and STORE=json npm test for the JSON store.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash as argonHash } from '@node-rs/argon2';
import { makeCustomer } from './_order-as.js';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-accounts-'));
process.env.DATA_ROOT = DATA_ROOT;
process.env.ADMIN_EMAIL = 'owner@test.local';
process.env.ADMIN_PASSWORD_HASH = await argonHash('test-password-1', { memoryCost: 4096, timeCost: 2 });

const store = await import('../lib/store.js');
store.openStore();
const { startSessions } = await import('../lib/sessions.js');
startSessions();
const express = (await import('express')).default;
const auth = await import('../lib/auth.js');
const orders = await import('../lib/orders.js');
const site = await import('../lib/site.js');
const inv = await import('../lib/invitations.js');
const customers = await import('../lib/customers.js');
const manual = await import('../lib/payments/manual.js');
const { listThemes } = await import('../lib/catalog.js');

let server;
let base;
let admin;

before(async () => {
  const app = express();
  app.use(auth.loadSession);
  const api = express.Router();
  const json = express.json({ limit: '64kb' });
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const editor = auth.requireEditor(store.peekInvitation);
  api.param('ref', (req, res, next, ref) => (orders.REF_RE.test(ref) ? next() : res.status(404).json({ error: 'Not found.' })));
  api.post('/auth/login', json, wrap(auth.login));
  api.post('/auth/logout', auth.requireSession, wrap(auth.logout));
  api.get('/auth/me', wrap(auth.me));
  api.get('/site', wrap(site.getSite));
  api.get('/themes', wrap(site.publicThemes));
  api.get('/meta', auth.requireSession, wrap(inv.meta));
  api.put('/site', auth.requireAdmin, json, wrap(site.putSite));
  api.get('/admin/site', auth.requireAdmin, wrap(site.getAdminSite));
  api.post('/orders', json, wrap(orders.submit));
  api.get('/orders', auth.requireAdmin, wrap(orders.list));
  api.get('/orders/:ref/pay', wrap(manual.payInfo));
  api.get('/account', auth.requireCustomer, wrap(customers.account));
  api.patch('/account/orders/:ref', auth.requireCustomer, json, wrap(customers.patchOrder));
  api.post('/account/password', auth.requireCustomer, json, wrap(customers.changePassword));
  api.get('/admin/customers', auth.requireAdmin, wrap(customers.adminList));
  api.post('/admin/customers', auth.requireAdmin, json, wrap(customers.adminCreate));
  api.patch('/admin/customers/:id', auth.requireAdmin, json, wrap(customers.adminPatch));
  api.put('/admin/customers/:id/invitations/:slug', auth.requireAdmin, json, wrap(customers.adminLink));
  api.delete('/admin/customers/:id/invitations/:slug', auth.requireAdmin, wrap(customers.adminUnlink));
  api.get('/invitations', auth.requireAdmin, wrap(inv.list));
  api.post('/invitations', auth.requireAdmin, json, wrap(inv.create));
  api.get('/invitations/:slug', editor, wrap(inv.read));
  api.put('/invitations/:slug', editor, express.json({ limit: '768kb' }), wrap(inv.update));
  api.delete('/invitations/:slug', auth.requireAdmin, json, wrap(inv.remove));
  app.use('/api', api);
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.expose || (err.status || 500) < 500 ? err.message : String(err.stack), ...(err.errors ? { errors: err.errors } : {}) }));
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
  admin = await browser().login('owner@test.local', 'test-password-1');
});

after(() => {
  server?.close();
  try { store.closeStore(); } catch { /* already closed */ }
  try { rmSync(DATA_ROOT, { recursive: true, force: true }); } catch { /* Windows may hold a file a moment */ }
});

/** A browser: keeps its own session cookie and CSRF token. */
function browser() {
  const b = { cookie: '', csrf: '' };
  b.req = async (path, { method = 'GET', body, csrf = true } = {}) => {
    const headers = { Origin: base };
    if (b.cookie) headers.Cookie = b.cookie;
    if (csrf && b.csrf && method !== 'GET') headers['X-CSRF-Token'] = b.csrf;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(base + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    const set = r.headers.get('set-cookie');
    if (set) { const v = set.split(';')[0]; b.cookie = v.endsWith('=') ? '' : v; }
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    if (data && typeof data === 'object' && typeof data.csrf === 'string') b.csrf = data.csrf;
    return { status: r.status, body: data, headers: r.headers };
  };
  b.login = async (email, password) => {
    const r = await b.req('/api/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(r.status, 200, `login ${email}: ${JSON.stringify(r.body)}`);
    b.last = r;
    return b;
  };
  /** The account as a confirmed sign-up makes it (lib/customers.js signup), then this browser signs in. */
  b.signup = async (email, password, { name = 'Gita Thapa', phone = '9800000001', market } = {}) => {
    await makeCustomer({ email, password, name, phone, market });
    return b.login(email, password);
  };
  return b;
}

const ORDER = { kind: 'order', plan: 'shubha', name: 'Gita Thapa', phone: '9800000001', website: '' };

test('an order without a customer session is refused (401 sign_in_required): it never makes or opens an account', async () => {
  const b = browser();
  const want = { ok: false, code: 'sign_in_required', error: 'Please sign in or make an account first, then place your order.' };
  // email + password of a new email: no account is made
  let r = await b.req('/api/orders', { method: 'POST', body: { ...ORDER, email: 'new.person@example.com', password: 'new-pass-12' } });
  assert.equal(r.status, 401);
  assert.deepEqual(r.body, want);
  assert.ok(!store.customerStore.byEmail('new.person@example.com'), 'no account from an order');
  // no credentials at all: the same
  r = await b.req('/api/orders', { method: 'POST', body: { ...ORDER } });
  assert.equal(r.status, 401);
  assert.equal(r.body.code, 'sign_in_required');
  // the right password of an existing account: still refused, and this browser is not signed in
  await makeCustomer({ email: 'has.account@example.com', password: 'has-pass-12', name: 'Has Account', phone: '9800000009' });
  r = await b.req('/api/orders', { method: 'POST', body: { ...ORDER, email: 'has.account@example.com', password: 'has-pass-12' } });
  assert.equal(r.status, 401);
  assert.deepEqual(r.body, want);
  assert.equal(b.cookie, '');
  assert.equal(r.headers.get('set-cookie'), null);
  // a custom-design enquiry with a password is refused too; without one a guest may still send it
  r = await b.req('/api/orders', { method: 'POST', body: { kind: 'custom', name: 'Hari Bahadur', phone: '9800000002', message: 'Temple design', email: 'hari@example.com', password: 'hari-pass-12', website: '' } });
  assert.equal(r.status, 401);
  assert.ok(!store.customerStore.byEmail('hari@example.com'));
  // the honeypot still answers like a success and stores nothing
  r = await b.req('/api/orders', { method: 'POST', body: { ...ORDER, website: 'bot.example' } });
  assert.equal(r.status, 201);
});

test('a signed-in customer orders without email or password: the order goes to their account', async () => {
  const b = browser();
  const soft = await b.req('/api/auth/me?soft=1');
  assert.equal(soft.status, 200);
  assert.deepEqual(soft.body, { role: null });
  assert.equal((await b.req('/api/auth/me')).status, 401);

  await b.signup('gita.thapa@example.com', 'gita-pass-1');
  assert.ok(b.cookie, 'session cookie set');
  const setCookie = b.last.headers.get('set-cookie');
  // no wedding date, venue or message: still a good order
  const r = await b.req('/api/orders', { method: 'POST', body: { ...ORDER } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.match(r.body.ref, /^NM-\d{5,6}$/);
  assert.equal(r.body.amount.npr, 4999); // the server's price
  assert.deepEqual(r.body.account, { email: 'gita.thapa@example.com', name: 'Gita Thapa', created: false });
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  const me = await b.req('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.role, 'customer');
  assert.equal(me.body.email, 'gita.thapa@example.com');
  assert.equal(me.body.name, 'Gita Thapa');
  assert.match(me.body.csrf, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(me.headers.get('cache-control'), 'no-store');

  // the stored account: argon2id hash, normalised email, never returned
  const list = await admin.req('/api/admin/customers');
  const c = list.body.customers.find((x) => x.email === 'gita.thapa@example.com');
  assert.ok(c);
  assert.equal(c.orders, 1);
  assert.equal(JSON.stringify(list.body).includes('argon2'), false);
  assert.match(store.customerStore.get(c.id).passwordHash, /^\$argon2id\$/);
  const o = (await admin.req('/api/orders')).body.orders.find((x) => x.ref === r.body.ref);
  assert.equal(o.customerId, c.id);
});

test('a guest may still send a custom enquiry; a signed-in order still checks its details', async () => {
  const b = browser();
  // a custom request still works without an account
  let r = await b.req('/api/orders', { method: 'POST', body: { kind: 'custom', name: 'Hari Bahadur', phone: '9800000002', message: 'A design with our village temple', website: '' } });
  assert.equal(r.status, 201);
  assert.equal(r.body.account, undefined);
  assert.equal(b.cookie, '');
  // optional details are still checked when sent
  await b.signup('x1@example.com', 'long-enough');
  r = await b.req('/api/orders', { method: 'POST', body: { ...ORDER, weddingDate: '2026-02-30', venue: 'v'.repeat(201) } });
  assert.equal(r.status, 400);
  assert.deepEqual(r.body.fields.sort(), ['venue', 'weddingDate']);
});

test('an existing account: the order form signs in first, then orders go to it; a wrong password is refused there', async () => {
  const b = browser();
  const wrong = await b.req('/api/auth/login', { method: 'POST', body: { email: 'gita.thapa@example.com', password: 'not-her-password' } });
  assert.equal(wrong.status, 401);
  assert.equal(b.cookie, '');
  await b.login('GITA.thapa@example.com', 'gita-pass-1');
  const right = await b.req('/api/orders', { method: 'POST', body: { ...ORDER, plan: 'saral', venue: 'Hotel Annapurna' } });
  assert.equal(right.status, 201);
  assert.equal(right.body.account.created, false);
  const acc = await b.req('/api/account');
  assert.equal(acc.status, 200);
  assert.equal(acc.body.orders.length, 2);
  assert.equal(acc.body.orders[0].venue, 'Hotel Annapurna');
  // signed in: the next order needs no account fields
  const third = await b.req('/api/orders', { method: 'POST', body: { ...ORDER, plan: 'shahi' } });
  assert.equal(third.status, 201);
  assert.equal(third.body.account.email, 'gita.thapa@example.com');
});

test('sign-in: wrong password and unknown email get the same answer; email is normalised', async () => {
  const b = browser();
  const wrong = await b.req('/api/auth/login', { method: 'POST', body: { email: 'gita.thapa@example.com', password: 'nope-nope-1' } });
  const unknown = await b.req('/api/auth/login', { method: 'POST', body: { email: 'nobody@example.com', password: 'nope-nope-1' } });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.body, unknown.body);
  assert.equal(b.cookie, '');
  const ok = await b.req('/api/auth/login', { method: 'POST', body: { email: ' Gita.Thapa@EXAMPLE.com', password: 'gita-pass-1' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.role, 'customer');
  assert.equal(ok.body.email, 'gita.thapa@example.com');
  // cross-site sign-in refused
  const xs = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: JSON.stringify({ email: 'gita.thapa@example.com', password: 'gita-pass-1' }) });
  assert.equal(xs.status, 403);
  // a customer is not the planner
  assert.equal((await b.req('/api/admin/customers')).status, 403);
  assert.equal((await b.req('/api/orders')).status, 403);
});

test('the dashboard: orders with payment status and a pay link the session opens; details filled in later; CSRF', async () => {
  const b = await browser().login('gita.thapa@example.com', 'gita-pass-1');
  const acc = (await b.req('/api/account')).body;
  assert.deepEqual(acc.customer, { name: 'Gita Thapa', email: 'gita.thapa@example.com', phone: '+9779800000001', emailVerified: true, mail: false });
  const o = acc.orders.at(-1);
  assert.equal(o.payStatus, 'awaiting_payment');
  assert.equal(o.reason, null);
  assert.equal(o.payUrl, `/pay/${o.ref}`);
  assert.equal(JSON.stringify(acc).includes('payTokenHash'), false);
  // the admin rejects with a reason: the customer sees it
  const id = (await admin.req('/api/orders')).body.orders.find((x) => x.ref === o.ref).id;
  await orders.mutateOrder(id, (x) => { x.pay.status = 'rejected'; x.pay.reason = 'Amount was short'; });
  const again = (await b.req('/api/account')).body.orders.find((x) => x.ref === o.ref);
  assert.equal(again.payStatus, 'rejected');
  assert.equal(again.reason, 'Amount was short');
  // pay info with the session instead of the token; nobody else's
  const pay = await b.req(`/api/orders/${o.ref}/pay`);
  assert.equal(pay.status, 200);
  assert.equal(pay.body.ref, o.ref);
  assert.ok(pay.body.paymentMethods.every((m) => !m.qr || m.qr.includes('?t=')));
  const other = browser();
  assert.equal((await other.req(`/api/orders/${o.ref}/pay`)).status, 404);
  // later details
  const patch = await b.req(`/api/account/orders/${o.ref}`, { method: 'PATCH', body: { weddingDate: '2027-01-20', venue: 'Pokhara', bride: 'Gita', groom: 'Ramesh' } });
  assert.equal(patch.status, 200, JSON.stringify(patch.body));
  assert.equal(patch.body.order.weddingDate, '2027-01-20');
  assert.equal(patch.body.order.venue, 'Pokhara');
  assert.equal((await b.req(`/api/account/orders/${o.ref}`, { method: 'PATCH', body: { venue: 'x' }, csrf: false })).status, 403);
  assert.equal((await b.req(`/api/account/orders/${o.ref}`, { method: 'PATCH', body: { weddingDate: '2027-13-01' } })).status, 400);
  // another customer cannot touch it
  const c2 = browser();
  await c2.signup('sunita@example.com', 'sunita-pass', { name: 'Sunita Rai' });
  await c2.req('/api/orders', { method: 'POST', body: { ...ORDER, name: 'Sunita Rai' } });
  assert.equal((await c2.req(`/api/account/orders/${o.ref}`, { method: 'PATCH', body: { venue: 'mine' } })).status, 404);
  assert.equal((await c2.req('/api/account')).body.orders.length, 1);
});

test('tiers: defaults, the plan must include the design, admin overrides, exposed in /themes, /meta and /site', async () => {
  const ready = new Set(listThemes().filter((t) => t.ready).map((t) => t.slug));
  const b = await browser().signup('tier1@example.com', 'tier-pass-1');
  // mahal is a Shahi design: a Saral order is refused, a Shahi one is fine
  let r = await b.req('/api/orders', { method: 'POST', body: { ...ORDER, plan: 'saral', theme: 'mahal' } });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'tier');
  assert.equal(r.body.needs, 'shahi');
  assert.deepEqual(r.body.fields, ['plan']);
  assert.match(r.body.error, /needs the Pro Max plan/);
  assert.equal((await b.req('/api/account')).body.orders.length, 0, 'nothing stored for a refused order');
  r = await b.req('/api/orders', { method: 'POST', body: { ...ORDER, plan: 'shahi', theme: 'mahal' } });
  assert.equal(r.status, 201);
  // saral design on the saral plan; shubha design on shubha; custom covers everything
  for (const [plan, theme, want] of [['saral', 'kham', 201], ['saral', 'dhoka', 400], ['shubha', 'dhoka', 201], ['shubha', 'agni', 400], ['custom', 'agni', 201]]) {
    const x = await b.req('/api/orders', { method: 'POST', body: { ...ORDER, plan, theme } });
    assert.equal(x.status, want, `${plan} + ${theme}`);
  }
  // /site: what each plan includes
  const s = (await b.req('/api/site')).body;
  assert.deepEqual(Object.fromEntries(s.plans.map((p) => [p.id, p.includes])), { saral: 'saral', shubha: 'shubha', shahi: 'shahi', custom: 'shahi' });
  // /themes: tier per theme
  const themes = (await b.req('/api/themes')).body;
  if (ready.has('mahal')) assert.equal(themes.find((t) => t.slug === 'mahal').tier, 'shahi');
  if (ready.has('kham')) assert.equal(themes.find((t) => t.slug === 'kham').tier, 'saral');
  assert.ok(themes.every((t) => ['saral', 'shubha', 'shahi'].includes(t.tier)));
  // the admin moves kham to shahi
  const cur = (await admin.req('/api/admin/site')).body;
  const bad = await admin.req('/api/site', { method: 'PUT', body: { ...cur, themeTiers: { kham: 'gold' } } });
  assert.equal(bad.status, 400);
  const put = await admin.req('/api/site', { method: 'PUT', body: { ...cur, themeTiers: { kham: 'shahi', 'no-such-theme': 'saral' } } });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  assert.deepEqual(put.body.themeTiers, { kham: 'shahi' });
  r = await b.req('/api/orders', { method: 'POST', body: { ...ORDER, plan: 'saral', theme: 'kham' } });
  assert.equal(r.status, 400);
  assert.equal(r.body.needs, 'shahi');
  const meta = (await admin.req('/api/meta')).body;
  assert.equal(meta.themes.find((t) => t.slug === 'kham').tier, 'shahi');
  assert.equal(meta.themes.find((t) => t.slug === 'dhoka').tier, 'shubha');
  if (ready.has('kham')) assert.equal((await b.req('/api/themes')).body.find((t) => t.slug === 'kham').tier, 'shahi');
});

test('plan names: the planner renames plans and their Nepali names; older documents fall back by id', async () => {
  const b = browser();
  let s = (await b.req('/api/site')).body;
  assert.deepEqual(Object.fromEntries(s.plans.map((p) => [p.id, p.nameNe])), { saral: 'सरल', shubha: 'शुभ', shahi: 'शाही', custom: 'आफ्नै' });
  const cur = (await admin.req('/api/admin/site')).body;
  const plans = structuredClone(cur.plans);
  const by = (id) => plans.find((p) => p.id === id);
  delete by('saral').nameNe; // a client that never sends it: the usual word for the id
  Object.assign(by('shubha'), { name: 'Pro', nameNe: ' प्रो ' });
  by('shahi').nameNe = ''; // cleared on purpose: stays empty
  const tooLong = await admin.req('/api/site', { method: 'PUT', body: { ...cur, plans: plans.map((p) => (p.id === 'custom' ? { ...p, nameNe: 'क'.repeat(41) } : p)) } });
  assert.equal(tooLong.status, 400);
  assert.ok(tooLong.body.errors.some((e) => e.path === 'plans[3].nameNe'));
  const put = await admin.req('/api/site', { method: 'PUT', body: { ...cur, plans } });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  assert.deepEqual(put.body.plans.map((p) => p.nameNe), ['सरल', 'प्रो', '', 'आफ्नै']);
  s = (await b.req('/api/site')).body;
  assert.equal(s.plans.find((p) => p.id === 'shubha').name, 'Pro');
  assert.equal(s.plans.find((p) => p.id === 'shahi').nameNe, '');
  // feature lines written with the first names follow the rename on the website ("Shubha Bibaha" is left alone)
  assert.ok(s.plans.find((p) => p.id === 'shahi').features.includes('Everything in Pro'));
  // the tier error names the plan as the planner calls it
  const nb = await browser().signup('names1@example.com', 'names-pass-1');
  const r = await nb.req('/api/orders', { method: 'POST', body: { ...ORDER, plan: 'saral', theme: 'dhoka' } });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /needs the Pro plan/);
  assert.equal((await admin.req('/api/site', { method: 'PUT', body: cur })).status, 200);
});

test('the admin links an invitation: the customer edits it within the link perms; unlink, delete', async () => {
  const created = await admin.req('/api/invitations', { method: 'POST', body: { slug: 'gita-ramesh', bride: 'Gita', groom: 'Ramesh', theme: 'dhoka' } });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const b = await browser().login('gita.thapa@example.com', 'gita-pass-1');
  assert.equal((await b.req('/api/invitations/gita-ramesh')).status, 403);
  const cid = store.customerStore.byEmail('gita.thapa@example.com').id;
  const link = await admin.req(`/api/admin/customers/${cid}/invitations/gita-ramesh`, { method: 'PUT', body: { themes: ['dhoka', 'kham'], canChangeTheme: false } });
  assert.equal(link.status, 200, JSON.stringify(link.body));
  assert.equal(link.body.customer.invitations[0].slug, 'gita-ramesh');
  assert.equal((await admin.req('/api/admin/customers/AAAAAAAAAAAA/invitations/gita-ramesh', { method: 'PUT', body: {} })).status, 404);
  assert.equal((await admin.req(`/api/admin/customers/${cid}/invitations/no-such-inv`, { method: 'PUT', body: {} })).status, 404);
  // the admin's list shows who it is linked to
  const sum = (await admin.req('/api/invitations')).body.invitations.find((x) => x.slug === 'gita-ramesh');
  assert.deepEqual(sum.customers.map((c) => c.email), ['gita.thapa@example.com']);

  const acc = (await b.req('/api/account')).body;
  assert.equal(acc.invitations.length, 1);
  assert.deepEqual(acc.invitations[0].perms, { themes: ['dhoka', 'kham'], canChangeTheme: false, canChangeColors: true });
  const doc = await b.req('/api/invitations/gita-ramesh');
  assert.equal(doc.status, 200);
  assert.equal(doc.body.clientLink, null);
  assert.equal(doc.body.activity, undefined);
  // words: fine; the design: not allowed
  const data = structuredClone(doc.body.data);
  data.couple.bride.name = { en: 'Gita', ne: 'गीता' };
  const ok = await b.req('/api/invitations/gita-ramesh', { method: 'PUT', body: { version: doc.body.version, data } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const theme = await b.req('/api/invitations/gita-ramesh', { method: 'PUT', body: { version: ok.body.version, data: { ...ok.body.data, theme: 'kham' } } });
  assert.equal(theme.status, 403);
  await admin.req(`/api/admin/customers/${cid}/invitations/gita-ramesh`, { method: 'PUT', body: { canChangeTheme: true } });
  const theme2 = await b.req('/api/invitations/gita-ramesh', { method: 'PUT', body: { version: ok.body.version, data: { ...ok.body.data, theme: 'kham' } } });
  assert.equal(theme2.status, 200, JSON.stringify(theme2.body));
  // another customer: no access
  const other = await browser().login('sunita@example.com', 'sunita-pass');
  assert.equal((await other.req('/api/invitations/gita-ramesh')).status, 403);
  // unlink: access ends at once
  assert.equal((await admin.req(`/api/admin/customers/${cid}/invitations/gita-ramesh`, { method: 'DELETE' })).status, 200);
  assert.equal((await b.req('/api/invitations/gita-ramesh')).status, 403);
  // link again, then delete the invitation: unlinked everywhere
  await admin.req(`/api/admin/customers/${cid}/invitations/gita-ramesh`, { method: 'PUT', body: {} });
  assert.equal((await admin.req('/api/invitations/gita-ramesh', { method: 'DELETE', body: { confirm: 'gita-ramesh' } })).status, 200);
  assert.deepEqual(store.customerStore.get(cid).invitations, []);
});

test('password reset by the admin and turning an account off end its sessions; same sign-in answer when off', async () => {
  const s1 = await browser().signup('kamala@example.com', 'kamala-pass', { name: 'Kamala KC' });
  assert.equal((await s1.req('/api/orders', { method: 'POST', body: { ...ORDER, name: 'Kamala KC' } })).status, 201);
  const s2 = await browser().login('kamala@example.com', 'kamala-pass');
  assert.equal((await s1.req('/api/auth/me')).status, 200);
  const cid = store.customerStore.byEmail('kamala@example.com').id;
  assert.equal((await admin.req(`/api/admin/customers/${cid}`, { method: 'PATCH', body: { password: 'short' } })).status, 400);
  const reset = await admin.req(`/api/admin/customers/${cid}`, { method: 'PATCH', body: { password: 'kamala-new-pass' } });
  assert.equal(reset.status, 200);
  assert.equal((await s1.req('/api/auth/me')).status, 401);
  assert.equal((await s2.req('/api/account')).status, 401);
  assert.equal((await browser().req('/api/auth/login', { method: 'POST', body: { email: 'kamala@example.com', password: 'kamala-pass' } })).status, 401);
  const s3 = await browser().login('kamala@example.com', 'kamala-new-pass');
  // the customer changes it themselves: wrong current refused; their other sessions end, this one stays
  const s4 = await browser().login('kamala@example.com', 'kamala-new-pass');
  assert.equal((await s3.req('/api/account/password', { method: 'POST', body: { current: 'wrong-wrong', password: 'kamala-third' } })).status, 401);
  assert.equal((await s3.req('/api/account/password', { method: 'POST', body: { current: 'kamala-new-pass', password: 'kamala-third' } })).status, 200);
  assert.equal((await s3.req('/api/auth/me')).status, 200);
  assert.equal((await s4.req('/api/auth/me')).status, 401);
  // off: sessions end, sign-in gets the generic answer, an order with the right password is refused
  const off = await admin.req(`/api/admin/customers/${cid}`, { method: 'PATCH', body: { disabled: true } });
  assert.equal(off.body.customer.disabled, true);
  assert.equal((await s3.req('/api/auth/me')).status, 401);
  assert.equal((await s3.req('/api/orders', { method: 'POST', body: { ...ORDER } })).status, 401, 'the ended session cannot order');
  const login = await browser().req('/api/auth/login', { method: 'POST', body: { email: 'kamala@example.com', password: 'kamala-third' } });
  assert.equal(login.status, 401);
  assert.equal(login.body.error, 'That email and password do not match.');
  const order = await browser().req('/api/orders', { method: 'POST', body: { ...ORDER, email: 'kamala@example.com', password: 'kamala-third' } });
  assert.equal(order.status, 401);
  assert.equal(order.body.code, 'sign_in_required');
  await admin.req(`/api/admin/customers/${cid}`, { method: 'PATCH', body: { disabled: false } });
  await browser().login('kamala@example.com', 'kamala-third');
});

test('the admin creates an account for an older couple; duplicate emails refused; logout', async () => {
  // a phone with its country code is required for a new account
  const noPhone = await admin.req('/api/admin/customers', { method: 'POST', body: { email: 'old.couple@example.com', name: 'Old Couple', password: 'old-couple-1' } });
  assert.equal(noPhone.status, 400);
  assert.equal(noPhone.body.error, 'Enter a valid phone number with country code.');
  const r = await admin.req('/api/admin/customers', { method: 'POST', body: { email: 'Old.Couple@Example.com', name: 'Old Couple', phone: '+977 980-1234567', password: 'old-couple-1' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.customer.email, 'old.couple@example.com');
  assert.equal(r.body.customer.passwordHash, undefined);
  assert.equal((await admin.req('/api/admin/customers', { method: 'POST', body: { email: 'old.couple@example.com', name: 'Again', phone: '+977 980-1234567', password: 'old-couple-1' } })).status, 409);
  const b = await browser().login('old.couple@example.com', 'old-couple-1');
  assert.equal((await b.req('/api/auth/logout', { method: 'POST' })).status, 200);
  assert.equal((await b.req('/api/auth/me')).status, 401);
});
