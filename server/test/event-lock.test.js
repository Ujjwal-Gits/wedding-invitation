// Event lock: one paid plan is one wedding (src/core/event-lock.js, lib/invitations.js applyLock, lib/change-requests.js).
// Run: npm test (in server/), and STORE=json npm test for the JSON store.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash as argonHash } from '@node-rs/argon2';
import { makeCustomer } from './_order-as.js';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-lock-'));
process.env.DATA_ROOT = DATA_ROOT;
process.env.ADMIN_EMAIL = 'owner@test.local';
process.env.ADMIN_PASSWORD_HASH = await argonHash('test-password-1', { memoryCost: 4096, timeCost: 2 });

const store = await import('../lib/store.js');
store.openStore();
const { startSessions } = await import('../lib/sessions.js');
startSessions();
const express = (await import('express')).default;
const auth = await import('../lib/auth.js');
const inv = await import('../lib/invitations.js');
const customers = await import('../lib/customers.js');
const accounts = await import('../lib/accounts.js');
const changeReq = await import('../lib/change-requests.js');
const lockLib = await import('../../src/core/event-lock.js');

let server;
let base;
let admin;

before(async () => {
  const app = express();
  app.use(auth.loadSession);
  const api = express.Router();
  const json = express.json({ limit: '256kb' });
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const editor = auth.requireEditor(store.peekInvitation);
  api.post('/auth/login', json, wrap(auth.login));
  api.get('/account', auth.requireCustomer, wrap(customers.account));
  api.post('/invitations', auth.requirePerm('invitations'), json, wrap(inv.create));
  api.get('/invitations/:slug', editor, wrap(inv.read));
  api.put('/invitations/:slug', editor, json, wrap(inv.update));
  api.post('/invitations/:slug/publish', editor, wrap(inv.publish));
  api.get('/invitations/:slug/public', wrap(inv.publicData));
  api.delete('/invitations/:slug/lock', auth.requirePerm('invitations'), wrap(inv.resetLock));
  api.get('/invitations/:slug/change-requests', editor, wrap(changeReq.listForInvitation));
  api.post('/invitations/:slug/change-requests', editor, json, wrap(changeReq.create));
  api.get('/admin/change-requests', auth.requireAnyPerm('orders', 'invitations'), wrap(changeReq.adminList));
  api.post('/admin/change-requests/:reqId/approve', auth.requireAnyPerm('orders', 'invitations'), wrap(changeReq.approve));
  api.post('/admin/change-requests/:reqId/decline', auth.requireAnyPerm('orders', 'invitations'), json, wrap(changeReq.decline));
  app.use('/api', api);
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.expose || (err.status || 500) < 500 ? err.message : String(err.stack), ...(err.errors ? { errors: err.errors } : {}), ...(typeof err.code === 'string' && /^[a-z_]{3,30}$/.test(err.code) ? { code: err.code } : {}) }));
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
    return b;
  };
  return b;
}

/** A new invitation linked to a new customer, who is signed in. Returns { slug, b (customer browser) }. */
async function couple(slug, email) {
  const r = await admin.req('/api/invitations', { method: 'POST', body: { slug, bride: 'Sita', groom: 'Ram', weddingDate: '2027-02-12' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const c = await makeCustomer({ email, password: 'customer-pass-1', name: 'Sita Sharma' });
  await accounts.linkInvitation(c.id, slug);
  const b = await browser().login(email, 'customer-pass-1');
  return { slug, b };
}

/** Saves the draft after `change(data)`, as the studio does (version + whole data). */
async function edit(b, slug, change) {
  const cur = await b.req(`/api/invitations/${slug}`);
  assert.equal(cur.status, 200, JSON.stringify(cur.body));
  const data = cur.body.data;
  change(data);
  return b.req(`/api/invitations/${slug}`, { method: 'PUT', body: { version: cur.body.version, data } });
}
const setBride = (v) => (d) => { d.couple.bride.name.en = v; };
const setDay = (day) => (d) => { d.weddingDate = `${day}${d.weddingDate.slice(10)}`; };

test('distance: case-insensitive, NFC, Devanagari letters', () => {
  assert.equal(lockLib.distance(lockLib.norm(' SITA '), lockLib.norm('sita')), 0);
  assert.equal(lockLib.distance('sita', 'seeta'), 2);
  assert.equal(lockLib.distance('सीता', 'सिता'), 1);
  assert.equal(lockLib.distance(lockLib.norm('é'), lockLib.norm('é')), 0);
});

test('before the first publish every name and the date change freely', async () => {
  const { slug, b } = await couple('lock-free', 'free@test.local');
  let r = await edit(b, slug, setBride('Gita Kumari'));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.lock, null);
  r = await edit(b, slug, (d) => { d.couple.groom.name.en = 'Hari Prasad'; d.couple.bride.parents.en = 'Mr. & Mrs. Sharma'; setDay('2028-09-01')(d); });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const pub = await b.req(`/api/invitations/${slug}/publish`, { method: 'POST' });
  assert.equal(pub.status, 200, JSON.stringify(pub.body));
  assert.equal(pub.body.lock.fixesUsed, 0);
  assert.equal(pub.body.lock.fixesLeft, 3);
  assert.equal(pub.body.lock.names['couple.bride.name.en'], 'Gita Kumari');
  assert.equal(pub.body.lock.names['couple.bride.parents.en'], 'Mr. & Mrs. Sharma');
  assert.equal(pub.body.lock.date, '2028-09-01');
});

test('spelling fixes: up to 3 letters each, one fix per save, the 4th is blocked; other edits stay free', async () => {
  const { slug, b } = await couple('lock-fix', 'fix@test.local');
  assert.equal((await b.req(`/api/invitations/${slug}/publish`, { method: 'POST' })).status, 200);
  // wording, venues and only the case of a name: no fix used
  let r = await edit(b, slug, (d) => { d.invitation.body.en = 'With joy we invite you.'; d.couple.bride.name.en = 'SITA'; });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.lock.fixesUsed, 0);
  r = await edit(b, slug, setBride('Seeta')); // 2 letters
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.lock.fixesUsed, 1);
  assert.equal(r.body.lock.names['couple.bride.name.en'], 'Seeta');
  // two names in one save: still one fix; distance is from the current locked spelling
  r = await edit(b, slug, (d) => { d.couple.bride.name.en = 'Seetaa'; d.couple.groom.name.en = 'Raam'; });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.lock.fixesUsed, 2);
  r = await edit(b, slug, (d) => { d.couple.groom.name.ne = 'राम'; }); // a name added later: locked as it is, free
  assert.equal(r.body.lock.fixesUsed, 2);
  r = await edit(b, slug, setBride('Seetah'));
  assert.equal(r.body.lock.fixesUsed, 3);
  assert.equal(r.body.lock.fixesLeft, 0);
  r = await edit(b, slug, setBride('Seeta'));
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'locked');
  assert.match(r.body.error, /Request a change/);
  // everything else still saves
  r = await edit(b, slug, (d) => { d.closing.en = 'See you there'; });
  assert.equal(r.status, 200, JSON.stringify(r.body));
});

test('a bigger change is blocked; the date moves 60 days either way without a fix', async () => {
  const { slug, b } = await couple('lock-big', 'big@test.local');
  assert.equal((await b.req(`/api/invitations/${slug}/publish`, { method: 'POST' })).status, 200);
  let r = await edit(b, slug, setBride('Laxmi'));
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'locked');
  assert.equal(r.body.errors[0].path, 'couple.bride.name.en');
  r = await edit(b, slug, (d) => { d.couple.bride.parents.en = 'Mr. Hari & Mrs. Gita Adhikari'; }); // was empty: free
  assert.equal(r.status, 200);
  r = await edit(b, slug, (d) => { d.couple.bride.parents.en = 'Mr. Shyam & Mrs. Rita Thapa'; });
  assert.equal(r.status, 409);
  r = await edit(b, slug, setDay('2027-04-13')); // +60 days
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.lock.fixesUsed, 0);
  assert.equal(r.body.lock.date, '2027-02-12');
  r = await edit(b, slug, setDay('2026-12-14')); // -60 days
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await edit(b, slug, setDay('2027-04-14')); // 61 days
  assert.equal(r.status, 409);
  assert.equal(r.body.errors[0].path, 'weddingDate');
  // publishing is checked the same way, and the published names stay the locked ones
  const pub = await b.req(`/api/invitations/${slug}/publish`, { method: 'POST' });
  assert.equal(pub.status, 200);
  const guest = await browser().req(`/api/invitations/${slug}/public`);
  assert.equal(guest.body.couple.bride.name.en, 'Sita');
});

test('staff are never blocked, the lock follows their edits, and they can reset it', async () => {
  const { slug, b } = await couple('lock-staff', 'staff@test.local');
  assert.equal((await b.req(`/api/invitations/${slug}/publish`, { method: 'POST' })).status, 200);
  let r = await edit(admin, slug, (d) => { setBride('Parbati Devi')(d); setDay('2029-01-01')(d); });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.lock.names['couple.bride.name.en'], 'Parbati Devi');
  assert.equal(r.body.lock.date, '2029-01-01');
  assert.equal(r.body.lock.fixesUsed, 0);
  r = await edit(b, slug, (d) => { d.closing.en = 'Thank you'; }); // the couple's next save is not blocked by it
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await b.req(`/api/invitations/${slug}/lock`, { method: 'DELETE' })).status, 403);
  assert.equal((await admin.req(`/api/invitations/${slug}/lock`, { method: 'DELETE' })).status, 200);
  r = await edit(b, slug, setBride('Laxmi'));
  assert.equal(r.status, 200, 'free until the next publish');
  const pub = await b.req(`/api/invitations/${slug}/publish`, { method: 'POST' });
  assert.equal(pub.body.lock.names['couple.bride.name.en'], 'Laxmi');
});

test('change requests: create, list, approve, decline; limits; only the owner sees or acts', async () => {
  const { slug, b } = await couple('lock-req', 'req@test.local');
  const other = await couple('lock-other', 'other@test.local');
  let r = await b.req(`/api/invitations/${slug}/change-requests`, { method: 'POST', body: { field: 'couple.bride.name.en', value: 'Laxmi', reason: 'Wrong name typed' } });
  assert.equal(r.status, 400, 'nothing is locked before publishing');
  assert.equal((await b.req(`/api/invitations/${slug}/publish`, { method: 'POST' })).status, 200);
  r = await b.req(`/api/invitations/${slug}/change-requests`, { method: 'POST', body: { field: 'couple.bride.name.en', value: 'Laxmi', reason: '' } });
  assert.equal(r.status, 400);
  r = await b.req(`/api/invitations/${slug}/change-requests`, { method: 'POST', body: { field: 'share.title', value: 'x', reason: 'because' } });
  assert.equal(r.status, 400);
  r = await b.req(`/api/invitations/${slug}/change-requests`, { method: 'POST', body: { field: 'couple.bride.name.en', value: 'Laxmi', reason: 'My legal name is Laxmi' } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const first = r.body.request;
  assert.equal(first.old, 'Sita');
  assert.equal(first.status, 'open');
  r = await b.req(`/api/invitations/${slug}/change-requests`, { method: 'POST', body: { field: 'weddingDate', value: '2027-12-01', reason: 'The wedding moved' } });
  assert.equal(r.status, 201);
  const second = r.body.request;
  r = await b.req(`/api/invitations/${slug}/change-requests`, { method: 'POST', body: { field: 'couple.groom.name.en', value: 'Krishna', reason: 'Spelling' } });
  assert.equal(r.status, 201);
  r = await b.req(`/api/invitations/${slug}/change-requests`, { method: 'POST', body: { field: 'couple.groom.name.en', value: 'Shyam', reason: 'Spelling' } });
  assert.equal(r.status, 409, 'at most 3 open per invitation');
  assert.equal(r.body.code, 'too_many');

  // another customer: cannot see, create or act on them
  assert.equal((await other.b.req(`/api/invitations/${slug}/change-requests`)).status, 403);
  assert.equal((await other.b.req(`/api/invitations/${slug}/change-requests`, { method: 'POST', body: { field: 'couple.bride.name.en', value: 'Laxmi', reason: 'Mine now' } })).status, 403);
  assert.equal((await other.b.req('/api/admin/change-requests')).status, 403);
  assert.equal((await other.b.req(`/api/admin/change-requests/${first.id}/approve`, { method: 'POST' })).status, 403);
  assert.equal((await b.req(`/api/admin/change-requests/${first.id}/approve`, { method: 'POST' })).status, 403);
  const otherList = await other.b.req('/api/account');
  assert.ok(otherList.body.invitations.every((i) => i.requests.length === 0));

  // staff
  r = await admin.req('/api/admin/change-requests');
  assert.equal(r.status, 200);
  assert.equal(r.body.open, 3);
  assert.equal(r.body.requests[0].customerEmail, 'req@test.local');
  r = await admin.req(`/api/admin/change-requests/${first.id}/approve`, { method: 'POST' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.request.status, 'approved');
  assert.equal((await admin.req(`/api/admin/change-requests/${first.id}/approve`, { method: 'POST' })).status, 409);
  const doc = await store.peekInvitation(slug);
  assert.equal(doc.draft.couple.bride.name.en, 'Laxmi');
  assert.equal(doc.published.couple.bride.name.en, 'Laxmi');
  assert.equal(doc.lock.names['couple.bride.name.en'], 'Laxmi');
  assert.equal(doc.lock.fixesUsed, 0);
  r = await admin.req(`/api/admin/change-requests/${second.id}/decline`, { method: 'POST', body: { note: 'Please send the new card' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.request.status, 'declined');
  assert.equal((await store.peekInvitation(slug)).lock.date, '2027-02-12');

  // the couple sees the outcome in the editor and the dashboard
  r = await b.req(`/api/invitations/${slug}/change-requests`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.requests.map((x) => x.status).sort(), ['approved', 'declined', 'open']);
  assert.equal(r.body.requests.find((x) => x.status === 'declined').note, 'Please send the new card');
  const acc = await b.req('/api/account');
  const card = acc.body.invitations.find((i) => i.slug === slug);
  assert.equal(card.requests.length, 3);
  assert.equal(card.lock.names['couple.bride.name.en'], 'Laxmi');
  assert.equal(card.requests[0].customerEmail, undefined, 'no staff-only fields');
});
