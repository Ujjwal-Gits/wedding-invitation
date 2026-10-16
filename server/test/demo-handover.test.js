// No demo couple on real invitations, invitations for customer accounts, and Clear cache
// (lib/demo.js, lib/migrate-demo.js, lib/handover.js, lib/accounts.js pending links, lib/share.js, POST /api/clear-cache).
// Run: npm test (in server/), and STORE=json npm test for the JSON store.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash as argonHash } from '@node-rs/argon2';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-demo-'));
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
const inv = await import('../lib/invitations.js');
const customers = await import('../lib/customers.js');
const handover = await import('../lib/handover.js');
const { sharePage } = await import('../lib/share.js');
const { scrubDemoOnce } = await import('../lib/migrate-demo.js');
const { config: demo } = await import('../../src/config.js');

// Every couple-specific demo value: none may be in a real invitation.
const DEMO_WORDS = ['Binisha', 'Ujjwal', 'बिनिशा', 'उज्ज्वल', 'Katwal', 'कटवाल', 'Dahal', 'दाहाल', 'Thapa', 'थापा', 'Shrestha', 'श्रेष्ठ', 'Baluwatar', 'Jawalakhel', 'Rohan', 'Shanti Banquet', '9800000000'];
const DEMO_PHOTOS = demo.couple.portraits.map((p) => p.photo);
const leaks = (value) => {
  const s = JSON.stringify(value);
  return [...DEMO_WORDS.filter((w) => s.includes(w)), ...DEMO_PHOTOS.filter((p) => s.includes(`"${p}"`))];
};

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
  api.get('/auth/me', wrap(auth.me));
  api.post('/clear-cache', auth.requireSession, auth.clearCache);
  api.post('/orders', json, wrap(orders.submit));
  api.get('/orders', auth.requireAdmin, wrap(orders.list));
  api.post('/orders/:id/invitation', auth.requireAdmin, json, wrap(handover.createForOrder));
  api.get('/account', auth.requireCustomer, wrap(customers.account));
  api.patch('/account/orders/:ref', auth.requireCustomer, json, wrap(customers.patchOrder));
  api.get('/admin/customers', auth.requireAdmin, wrap(customers.adminList));
  api.put('/admin/customers/:id/invitations/:slug', auth.requireAdmin, json, wrap(customers.adminLink));
  api.post('/admin/pending/link', auth.requireAdmin, json, wrap(customers.adminConfirmPending));
  api.post('/admin/pending/dismiss', auth.requireAdmin, json, wrap(customers.adminDismissPending));
  api.post('/invitations', auth.requireAdmin, json, wrap(inv.create));
  api.get('/invitations/:slug', editor, wrap(inv.read));
  api.get('/invitations/:slug/public', wrap(inv.publicData));
  app.use('/api', api);
  app.get('/i/:slug', wrap(sharePage));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.expose || (err.status || 500) < 500 ? err.message : String(err.stack), ...(err.current ? { current: err.current } : {}) }));
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
  admin = await browser().login('owner@test.local', 'test-password-1');
});

after(() => {
  server?.close();
  try { store.closeStore(); } catch { /* already closed */ }
  try { rmSync(DATA_ROOT, { recursive: true, force: true }); } catch { /* Windows may hold a file a moment */ }
});

function browser() {
  const b = { cookie: '', csrf: '' };
  b.req = async (path, { method = 'GET', body, csrf = true } = {}) => {
    const headers = { Origin: base };
    if (b.cookie) headers.Cookie = b.cookie;
    if (csrf && b.csrf && method !== 'GET') headers['X-CSRF-Token'] = b.csrf;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(base + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
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
    return b;
  };
  return b;
}
const ORDER = { kind: 'order', plan: 'shubha', phone: '9800000001', website: '' };

test('a new invitation starts with the names entered and nothing of the demo couple', async () => {
  const r = await admin.req('/api/invitations', { method: 'POST', body: { slug: 'sita-ram', bride: 'Sita', groom: 'Ram', theme: 'mangal', sample: true } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const d = r.body.data;
  assert.deepEqual(leaks(d), []);
  assert.deepEqual(d.couple.bride.name, { en: 'Sita', ne: '' });
  assert.deepEqual(d.couple.groom.name, { en: 'Ram', ne: '' });
  assert.equal(d.couple.portraits.length, 0);
  assert.equal(d.gallery.length, 0);
  assert.equal(d.story.length, 0);
  assert.equal(d.info.contacts.length + d.info.stays.length, 0);
  assert.ok(d.events.every((e) => !e.venue.en && !e.venue.ne && !e.mapQuery));
  assert.notEqual(d.weddingDate, demo.weddingDate);
  for (const rel of ['muslim', 'christian', 'other']) {
    const x = await admin.req('/api/invitations', { method: 'POST', body: { slug: `t-${rel}`, bride: 'A', groom: 'B', religion: rel } });
    assert.equal(x.status, 201);
    assert.deepEqual(leaks(x.body.data), [], rel);
  }
});

test('/i/<slug> uses the real names, or our brand when there are none; never the demo', async () => {
  // a published invitation whose names are empty (written straight to the store: publishing needs names)
  await store.withLock('inv:sita-ram', async () => {
    const doc = await store.getInvitation('sita-ram');
    doc.draft.couple.bride.name = { en: '', ne: '' };
    doc.draft.couple.groom.name = { en: '', ne: '' };
    doc.draft.share.title = '';
    doc.published = structuredClone(doc.draft);
    doc.status = 'published';
    await store.saveInvitation(doc);
  });
  const page = await admin.req('/i/sita-ram');
  assert.equal(page.status, 200);
  assert.match(page.body, /<title>Wedding invitation · Nimtto<\/title>/);
  assert.match(page.body, /property="og:title" content="Wedding invitation · Nimtto"/);
  assert.deepEqual(DEMO_WORDS.filter((w) => page.body.includes(w)), []);
  assert.match(page.body, /property="og:image" content="[^"]*\/art\/og\.jpg"/, 'a neutral picture, never the design thumbnail (it shows the demo couple)');
  assert.ok(!page.body.includes('thumb.jpg'));
  // with names: the names
  await store.withLock('inv:sita-ram', async () => {
    const doc = await store.getInvitation('sita-ram');
    doc.published.couple.bride.name = { en: 'Sita', ne: '' };
    doc.published.couple.groom.name = { en: 'Ram', ne: '' };
    await store.saveInvitation(doc);
  });
  assert.match((await admin.req('/i/sita-ram')).body, /og:title" content="Sita &amp; Ram · /);
});

test('the migration clears untouched demo fields only, once, after a backup', async () => {
  const d = structuredClone(demo);
  d.couple.bride.name = { en: 'Priya', ne: 'प्रिया' }; // changed by the couple: kept
  d.couple.groom.name = { en: 'Rohan', ne: 'रोहन' };
  d.events[0].venue = { en: 'Thapa Niwas, Ratnanagar-12, Chitwan', ne: '' }; // a real family called Thapa: kept
  d.events[1].venue = { en: 'Thapa Niwas, Baluwatar', ne: 'थापा निवास, बालुवाटार' }; // the older sample's venue: cleared too
  d.couple.bride.parents = { en: 'Mr. Ram Bahadur Thapa & Mrs. Sita Thapa', ne: '' }; // older sample family
  d.couple.portraits.push({ photo: 'himalaya-dawn', alt: '' }); // a library scene the owner picked: kept
  d.info.contacts.push({ name: { en: 'Gopal', ne: '' }, role: { en: 'Uncle', ne: '' }, phone: '9811111112' });
  d.share.image = '';
  const { sanitizeInvitation } = await import('../lib/validate.js');
  const draft = sanitizeInvitation(d, 'old-sample');
  const now = new Date().toISOString();
  await store.createInvitation({ slug: 'old-sample', version: 3, status: 'published', createdAt: now, updatedAt: now, publishedAt: now, draft, published: structuredClone(draft) });

  const dry = await scrubDemoOnce({ dryRun: true });
  assert.ok(dry.changed['old-sample']?.length, 'the dry run lists the changes');
  assert.equal((await store.getInvitation('old-sample')).version, 3, 'a dry run writes nothing');

  const out = await scrubDemoOnce({ force: true, log: { info() {} } });
  assert.equal(out.ran, true);
  if (store.STORE_KIND === 'sqlite') assert.ok(out.backup, 'a backup first');
  const doc = await store.getInvitation('old-sample');
  for (const x of [doc.draft, doc.published]) {
    assert.deepEqual(x.couple.bride.name, { en: 'Priya', ne: 'प्रिया' });
    assert.deepEqual(x.couple.groom.name, { en: 'Rohan', ne: 'रोहन' });
    assert.equal(x.events[0].venue.en, 'Thapa Niwas, Ratnanagar-12, Chitwan');
    assert.equal(x.events[1].venue.en, '', 'the older demo venue is cleared');
    assert.equal(x.events[1].venue.ne, '');
    assert.equal(x.events[2].venue.en, '', 'the current demo venue is cleared');
    assert.equal(x.events[1].mapQuery, '');
    assert.deepEqual(x.couple.portraits.map((p) => p.photo), ['himalaya-dawn']);
    assert.deepEqual(x.info.contacts.map((c) => c.name.en), ['Gopal']);
    assert.equal(x.story.length, 0);
    assert.equal(x.info.stays.length, 0);
    assert.equal(x.couple.bride.parents.en, '');
    assert.equal(x.hosts.en, '');
    assert.equal(x.couple.hashtag, '');
    assert.equal(x.invitation.body.en, '');
    assert.equal(x.invitation.salutation.en, demo.invitation.salutation.en, 'generic wording stays');
    assert.equal(x.saptapadi.length, 7, 'generic vows stay');
    assert.deepEqual(leaks(x).filter((w) => w !== 'Rohan' && w !== 'Thapa'), []);
  }
  assert.equal(doc.version, 4, 'version bumped so an open studio reloads');
  // the exact demo couple's names are cleared (both, per language)
  await store.withLock('inv:old-sample', async () => {
    const x = await store.getInvitation('old-sample');
    x.draft.couple.bride.name = structuredClone(demo.couple.bride.name);
    x.draft.couple.groom.name = structuredClone(demo.couple.groom.name);
    await store.saveInvitation(x);
  });
  assert.equal((await scrubDemoOnce({ log: { info() {} } })).ran, false, 'runs once');
  await scrubDemoOnce({ force: true, log: { info() {} } });
  const again = await store.getInvitation('old-sample');
  assert.deepEqual(again.draft.couple.bride.name, { en: '', ne: '' });
  assert.deepEqual(again.draft.couple.groom.name, { en: '', ne: '' });
});

test('POST /api/clear-cache answers Clear-Site-Data "cache" and keeps the session', async () => {
  const b = await browser().login('owner@test.local', 'test-password-1');
  const r = await b.req('/api/clear-cache', { method: 'POST' });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('clear-site-data'), '"cache"');
  assert.equal(r.headers.get('set-cookie'), null, 'the session cookie is not touched');
  assert.equal((await b.req('/api/auth/me')).status, 200, 'still signed in');
  assert.equal((await b.req('/api/clear-cache', { method: 'POST', csrf: false })).status, 403, 'CSRF');
  assert.equal((await browser().req('/api/clear-cache', { method: 'POST' })).status, 401, 'signed-in roles only');
});

test('an invitation made for a customer email appears in their dashboard; another customer cannot see it', async () => {
  const a = browser();
  assert.equal((await a.req('/api/orders', { method: 'POST', body: { ...ORDER, plan: 'saral', name: 'Asha', email: 'asha@example.com', password: 'asha-pass-1' } })).status, 201);
  const other = browser();
  assert.equal((await other.req('/api/orders', { method: 'POST', body: { ...ORDER, name: 'Bina', email: 'bina@example.com', password: 'bina-pass-1' } })).status, 201);

  const r = await admin.req('/api/invitations', { method: 'POST', body: { slug: 'asha-hari', bride: 'Asha', groom: 'Hari', customerEmail: ' Asha@Example.com ' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.deepEqual(r.body.customer, { email: 'asha@example.com', name: 'Asha', linked: true, pending: false });
  const acc = (await a.req('/api/account')).body;
  const card = acc.invitations.find((i) => i.slug === 'asha-hari');
  assert.ok(card, 'in the dashboard at once, no second password');
  assert.equal(card.perms.canChangeTheme, true);
  assert.ok(Array.isArray(card.perms.themes) && card.perms.themes.length > 0, 'designs of their plan');
  assert.equal(card.plan.id, 'saral');
  assert.equal(card.payStatus, 'awaiting_payment');
  assert.equal(card.shareUrl, null, 'no share link before publishing');
  assert.equal((await a.req('/api/invitations/asha-hari')).status, 200);

  assert.equal((await other.req('/api/invitations/asha-hari')).status, 403);
  assert.equal((await other.req('/api/invitations/asha-hari/public')).status, 404);
  assert.ok(!(await other.req('/api/account')).body.invitations.some((i) => i.slug === 'asha-hari'));
  assert.equal((await admin.req('/api/invitations', { method: 'POST', body: { slug: 'bad-mail', bride: 'A', groom: 'B', customerEmail: 'not-an-email' } })).status, 400);
});

test('an email with no account gets a pending link: never claimed on signup, linked only when the owner confirms', async () => {
  const r = await admin.req('/api/invitations', { method: 'POST', body: { slug: 'maya-dev', bride: 'Maya', groom: 'Dev', customerEmail: 'maya@example.com' } });
  assert.equal(r.status, 201);
  assert.deepEqual(r.body.customer, { email: 'maya@example.com', linked: false, pending: true });
  let pending = (await admin.req('/api/admin/customers')).body.pending;
  assert.deepEqual(pending.map((p) => [p.email, p.slug, p.account]), [['maya@example.com', 'maya-dev', null]]);
  // the owner cannot link it before an account exists
  assert.equal((await admin.req('/api/admin/pending/link', { method: 'POST', body: { email: 'maya@example.com', slug: 'maya-dev' } })).status, 404);
  // someone registers that email (emails are not verified): nothing is handed over by itself
  const m = browser();
  assert.equal((await m.req('/api/orders', { method: 'POST', body: { ...ORDER, name: 'Maya', email: 'maya@example.com', password: 'maya-pass-1' } })).status, 201);
  assert.deepEqual((await m.req('/api/account')).body.invitations, [], 'no auto-claim on signup');
  assert.equal((await m.req('/api/invitations/maya-dev')).status, 403);
  await m.req('/api/auth/me');
  assert.equal((await m.req('/api/auth/login', { method: 'POST', body: { email: 'maya@example.com', password: 'maya-pass-1' } })).status, 200);
  assert.deepEqual((await m.req('/api/account')).body.invitations, [], 'nor on sign-in');
  // the owner sees who signed up and confirms
  pending = (await admin.req('/api/admin/customers')).body.pending;
  assert.equal(pending[0].account.email, 'maya@example.com');
  assert.equal(pending[0].account.name, 'Maya');
  assert.equal((await m.req('/api/admin/pending/link', { method: 'POST', body: { email: 'maya@example.com', slug: 'maya-dev' } })).status, 401 + 2, 'customers cannot confirm');
  const ok = await admin.req('/api/admin/pending/link', { method: 'POST', body: { email: 'maya@example.com', slug: 'maya-dev' } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.deepEqual((await m.req('/api/account')).body.invitations.map((i) => i.slug), ['maya-dev']);
  assert.equal((await m.req('/api/invitations/maya-dev')).status, 200);
  assert.deepEqual((await admin.req('/api/admin/customers')).body.pending, []);
  // dismiss
  await admin.req('/api/invitations', { method: 'POST', body: { slug: 'maya-dev-2', bride: 'Maya', groom: 'Dev', customerEmail: 'nobody@example.com' } });
  assert.equal((await admin.req('/api/admin/pending/dismiss', { method: 'POST', body: { email: 'nobody@example.com', slug: 'maya-dev-2' } })).status, 200);
  assert.deepEqual((await admin.req('/api/admin/customers')).body.pending, []);
});

test('Create invitation from an order: one click, filled from the order, linked; later details fill empty fields', async () => {
  const c = browser();
  const o = await c.req('/api/orders', { method: 'POST', body: { ...ORDER, name: 'Kamal', email: 'kamal@example.com', password: 'kamal-pass-1', theme: 'mangal', bride: 'Rita', groom: 'Kamal' } });
  assert.equal(o.status, 201, JSON.stringify(o.body));
  await c.req('/api/auth/me'); // the CSRF token for this browser's session
  const order = (await admin.req('/api/orders')).body.orders.find((x) => x.ref === o.body.ref);
  const r = await admin.req(`/api/orders/${order.id}/invitation`, { method: 'POST', body: {} });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.slug, 'rita-kamal');
  assert.equal(r.body.data.theme, 'mangal');
  assert.deepEqual(r.body.data.couple.bride.name, { en: 'Rita', ne: '' });
  assert.deepEqual(leaks(r.body.data), []);
  assert.equal(r.body.customer.linked, true);
  assert.equal((await admin.req('/api/orders')).body.orders.find((x) => x.id === order.id).invitation, 'rita-kamal');
  assert.equal((await admin.req(`/api/orders/${order.id}/invitation`, { method: 'POST', body: {} })).status, 409);
  // the customer adds the date and the venue later: the placeholder date and the empty venue follow
  const p = await c.req(`/api/account/orders/${o.body.ref}`, { method: 'PATCH', body: { weddingDate: '2027-11-20', venue: 'Hotel Annapurna' } });
  assert.equal(p.status, 200, JSON.stringify(p.body));
  assert.ok(p.body.filled.includes('weddingDate'));
  const d = (await c.req('/api/invitations/rita-kamal')).body.data;
  assert.equal(d.weddingDate.slice(0, 10), '2027-11-20');
  assert.ok(d.events.some((e) => e.venue.en === 'Hotel Annapurna'));
  assert.ok(d.events.every((e) => e.start.slice(0, 4) === '2027'), 'the ceremonies moved with the date');
  // a name the couple typed is never overwritten
  const q = await c.req(`/api/account/orders/${o.body.ref}`, { method: 'PATCH', body: { bride: 'Someone Else' } });
  assert.deepEqual(q.body.filled, []);
  assert.equal((await c.req('/api/invitations/rita-kamal')).body.data.couple.bride.name.en, 'Rita');
});
