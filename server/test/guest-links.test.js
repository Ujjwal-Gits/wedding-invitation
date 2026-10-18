// Guest links (lib/guest-links.js): a link per group of ceremonies. The guest's page, its data and the API carry only
// the link's ceremonies; replies through it may only name those and keep its id; an unknown or deleted link gets
// "This link is no longer active"; only the invitation's planner or couple manage the links.
// The first half calls the modules directly (the gate with a throwaway dist/ for a _suite, a _vow and a standalone
// design); the second runs the real server (index.js, so the real route → permission map) in a child process.
// Run: npm test (in server/), and STORE=json npm test for the JSON store.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { hash as argonHash } from '@node-rs/argon2';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-glinks-'));
const SERVER_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-glinks-srv-'));
const DIST = mkdtempSync(join(tmpdir(), 'nimtto-glinks-dist-'));
process.env.DATA_ROOT = DATA_ROOT;

const store = await import('../lib/store.js');
store.openStore();
const gl = await import('../lib/guest-links.js');
const rsvp = await import('../lib/rsvp.js');
const { publishedJson } = await import('../lib/invitations.js');
const { themePageGate } = await import('../lib/gate.js');
const { sharePage } = await import('../lib/share.js');
const { sanitizeInvitation } = await import('../lib/validate.js');
const { config: demo } = await import('../../src/config.js');

const THEMES = ['agni', 'amalfi', 'kham']; // a _suite design, a _vow design, a standalone one
const events = demo.events.map(({ id, title, start, end }) => ({ id, title, start, end })); // mehendi, haldi, wedding, reception

async function publishDoc(slug, theme = 'kham') {
  const data = sanitizeInvitation({ theme, weddingDate: demo.weddingDate, couple: { bride: { name: { en: 'Asha', ne: '' } }, groom: { name: { en: 'Ravi', ne: '' } } }, events, rsvp: { maxGuests: 6 } }, slug);
  const now = new Date().toISOString();
  await store.createInvitation({ slug, version: 3, status: 'published', createdAt: now, updatedAt: now, publishedAt: now, draft: data, published: structuredClone(data) });
}

const fakeRes = () => ({
  statusCode: 200, headers: {}, body: undefined, locals: {}, redirected: null,
  status(c) { this.statusCode = c; return this; },
  json(o) { this.body = o; return this; },
  set(k, v) { this.headers[k] = v; return this; },
  vary() { return this; },
  type() { return this; },
  send(s) { this.body = s; return this; },
  redirect(c, u) { this.statusCode = c; this.redirected = u; return this; },
});
let ipN = 0;
const fakeReq = ({ slug, body, query = {}, path = '/', params = {} }) => {
  const headers = { origin: 'http://localhost:5173', host: 'localhost:8787' };
  ipN += 1;
  return {
    method: 'GET', path, query, params: { slug, ...params }, body: body === undefined ? undefined : JSON.stringify(body), headers, protocol: 'http',
    get: (k) => headers[k.toLowerCase()], ip: `10.1.${ipN >> 8}.${ipN & 255}`, socket: { remoteAddress: '10.0.0.1' }, app: { get: () => false },
  };
};
const call = async (fn, req) => { const res = fakeRes(); await fn(req, res); return res; };
const parsed = (req) => { req.body = req.body === undefined ? undefined : JSON.parse(req.body); return req; };
const createLink = async (slug, name, evs) => {
  const res = fakeRes();
  await gl.create(parsed(fakeReq({ slug, body: { name, events: evs } })), res);
  return res;
};
const gate = themePageGate(DIST);
const openPage = async (theme, query) => {
  const res = fakeRes();
  let nexted = false;
  await gate(fakeReq({ path: `/${theme}/`, query }), res, (err) => { if (err) throw err; nexted = true; });
  return { res, nexted };
};
const dataBlock = (html) => JSON.parse(/<script type="application\/json" id="nimtto-data"[^>]*>([\s\S]*?)<\/script>/.exec(html)[1]);

before(async () => {
  for (const t of THEMES) {
    mkdirSync(join(DIST, t), { recursive: true });
    writeFileSync(join(DIST, t, 'index.html'), '<!doctype html><html><head><title>x</title><meta property="og:title" content="x"><meta property="og:description" content="x"><meta name="description" content="x"></head><body><main></main></body></html>');
  }
  for (const t of THEMES) await publishDoc(`gl-${t}`, t);
  await publishDoc('gl-rsvp');
  const draft = sanitizeInvitation({ theme: 'kham', weddingDate: demo.weddingDate, events }, 'gl-draft');
  const now = new Date().toISOString();
  await store.createInvitation({ slug: 'gl-draft', version: 1, status: 'draft', createdAt: now, updatedAt: now, publishedAt: null, draft, published: null });
});

test('a guest link shows only its ceremonies: the page, its data block and the API, in every kind of design', async () => {
  for (const t of THEMES) {
    const slug = `gl-${t}`;
    const made = await createLink(slug, 'Haldi guests', ['haldi', 'mehendi']);
    assert.equal(made.statusCode, 201, JSON.stringify(made.body));
    const { link } = made.body;
    assert.match(link.id, gl.LINK_ID_RE);
    assert.deepEqual(link.events, ['mehendi', 'haldi'], 'kept in the invitation’s order');

    const { res } = await openPage(t, { id: slug, g: link.id });
    assert.equal(res.statusCode, 200, `${t}: ${res.body}`);
    const html = res.body;
    const data = dataBlock(html);
    assert.deepEqual(data.events.map((e) => e.id), ['mehendi', 'haldi'], `${t}: only the link's events`);
    for (const hidden of ['Reception', 'Janti', '"id":"reception"', '"id":"wedding"']) assert.equal(html.includes(hidden), false, `${t}: ${hidden} is not in the HTML`);
    assert.equal(data.rsvp.endpoint, `/api/invitations/${slug}/rsvp?g=${link.id}`, 'replies go to the link’s endpoint');
    assert.match(html, /<meta property="og:description" content="Mehendi &amp; Haldi · /, 'the preview names the link’s ceremonies');

    // the full link is unchanged
    const full = await openPage(t, { id: slug });
    assert.deepEqual(dataBlock(full.res.body).events.map((e) => e.id), ['mehendi', 'haldi', 'wedding', 'reception']);
    // the JSON the page falls back to is the same, and cached apart from the full one
    const doc = await store.peekInvitation(slug);
    assert.deepEqual(JSON.parse(publishedJson(doc, slug, gl.guestLink(doc, link.id))).events.map((e) => e.id), ['mehendi', 'haldi']);
    assert.equal(JSON.parse(publishedJson(doc, slug)).events.length, 4);
  }
});

test('an unknown or deleted guest link gets the "no longer active" page, never the full invitation', async () => {
  const slug = 'gl-kham';
  const { res: bogus } = await openPage('kham', { id: slug, g: 'nOtALink00' });
  assert.equal(bogus.statusCode, 410);
  assert.match(bogus.body, /This link is no longer active/);
  assert.equal(bogus.body.includes('Mehendi'), false);
  const { res: junk } = await openPage('kham', { id: slug, g: '<script>' });
  assert.equal(junk.statusCode, 410, 'a malformed id too');

  const made = await createLink(slug, 'Reception only', ['reception']);
  const id = made.body.link.id;
  assert.equal((await openPage('kham', { id: slug, g: id })).res.statusCode, 200);
  const share = await call(sharePage, fakeReq({ query: { g: id }, params: { slug } }));
  assert.match(share.body, new RegExp(`url=/kham/\\?id=${slug}&amp;g=${id}`), 'the short link forwards with the link');

  const del = await call(gl.remove, fakeReq({ slug, params: { linkId: id } }));
  assert.equal(del.statusCode, 200);
  assert.equal((await openPage('kham', { id: slug, g: id })).res.statusCode, 410, 'deleting a link disables it at once');
  assert.equal((await call(sharePage, fakeReq({ query: { g: id }, params: { slug } }))).statusCode, 410, 'the short link too');
});

test('links: names and ceremonies are checked, published invitations only, at most 20', async () => {
  const bad = async (slug, body) => {
    try { await gl.create(parsed(fakeReq({ slug, body })), fakeRes()); } catch (err) { return err.status; }
    return 200;
  };
  assert.equal(await bad('gl-rsvp', { name: '', events: ['haldi'] }), 400);
  assert.equal(await bad('gl-rsvp', { name: 'X', events: [] }), 400);
  assert.equal(await bad('gl-rsvp', { name: 'X', events: ['nope'] }), 400);
  assert.equal(await bad('gl-rsvp', { name: 'X', events: 'haldi' }), 400);
  assert.equal(await bad('gl-draft', { name: 'X', events: ['haldi'] }), 409, 'a draft has no guest links yet');
  const slug = 'gl-amalfi';
  const doc = await store.peekInvitation(slug);
  for (let i = gl.linksOf(doc).length; i < gl.MAX_LINKS; i++) assert.equal((await createLink(slug, `Group ${i}`, ['wedding'])).statusCode, 201);
  assert.equal(await bad(slug, { name: 'One too many', events: ['wedding'] }), 409);
  // rename and change the ceremonies
  const first = gl.linksOf(await store.peekInvitation(slug))[0];
  const res = fakeRes();
  await gl.patch(parsed(fakeReq({ slug, params: { linkId: first.id }, body: { name: '  Close   family ', events: ['reception', 'haldi'] } })), res);
  assert.deepEqual(res.body.link, { ...first, name: 'Close family', events: ['haldi', 'reception'] });
});

test('replies through a guest link: only its ceremonies, with the link kept; the list shows and filters by link', async () => {
  const slug = 'gl-rsvp';
  const { link } = (await createLink(slug, 'Haldi guests', ['haldi'])).body;
  const reply = (over = {}) => ({ name: 'Ana Smith', phone: '', attending: 'yes', guests: 1, events: ['haldi'], party: [{ name: 'Ana Smith', meal: 'veg' }], message: '', website: '', ...over });
  const send = (body, g) => call(rsvp.submit, fakeReq({ slug, body, query: g ? { g } : {} }));

  const ok = await send(reply(), link.id);
  assert.equal(ok.statusCode, 200, JSON.stringify(ok.body));
  const hidden = await send(reply({ events: ['haldi', 'reception'] }), link.id);
  assert.equal(hidden.statusCode, 400, 'a ceremony the link does not show is refused');
  assert.deepEqual(hidden.body.fields, ['events']);
  const all = await send(reply({ name: 'No List', events: undefined }), link.id);
  assert.equal(all.statusCode, 200, 'an older form that sends no list counts for the link’s ceremonies only');
  assert.equal((await send(reply(), 'nOtALink00')).statusCode, 410);
  assert.equal((await send(reply({ name: 'Full Guest', events: ['reception'] }))).statusCode, 200, 'the full link answers for any ceremony');

  const list = await call(rsvp.listReplies, fakeReq({ slug }));
  const viaLink = list.body.replies.filter((r) => r.link === link.id);
  assert.equal(viaLink.length, 2);
  for (const r of viaLink) assert.deepEqual(r.events, ['haldi']);
  assert.equal(list.body.replies.find((r) => r.name === 'Full Guest').link, undefined);
  const t = Object.fromEntries(list.body.links.map((l) => [l.id, l]));
  assert.equal(t[''].replies, 1);
  assert.equal(t[link.id].replies, 2);
  assert.equal(t[link.id].name, 'Haldi guests');
  const only = await call(rsvp.listReplies, fakeReq({ slug, query: { link: link.id } }));
  assert.equal(only.body.replies.length, 2);
  const full = await call(rsvp.listReplies, fakeReq({ slug, query: { link: 'full' } }));
  assert.deepEqual(full.body.replies.map((r) => r.name), ['Full Guest']);
  const csv = await call(rsvp.exportCsv, fakeReq({ slug }));
  const rows = csv.body.replace(/^﻿/, '').trim().split('\r\n');
  assert.match(rows[0], /,Guest link$/);
  assert.ok(rows.some((r) => r.startsWith('20') && r.endsWith(',Haldi guests')));

  // the link deleted: its replies stay, under "Deleted link"; new replies through it are refused
  await call(gl.remove, fakeReq({ slug, params: { linkId: link.id } }));
  assert.equal((await send(reply(), link.id)).statusCode, 410);
  const after = await call(rsvp.listReplies, fakeReq({ slug }));
  assert.equal(after.body.replies.length, 3);
  assert.equal(after.body.links.find((l) => l.id === link.id).name, 'Deleted link');
});

// ── The real server: who may manage the links, and the public API ─────────────────────────────────────

const OWNER = { email: 'owner@test.local', password: 'owner-password-1' };
let child;
let base;
let owner;

const freePort = () => new Promise((ok, fail) => {
  const s = createServer();
  s.once('error', fail);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
});
function browser() {
  const b = { cookie: '', csrf: '' };
  b.req = async (path, { method = 'GET', body } = {}) => {
    const headers = { Origin: base };
    if (b.cookie) headers.Cookie = b.cookie;
    if (b.csrf && method !== 'GET') headers['X-CSRF-Token'] = b.csrf;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(base + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
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

before(async () => {
  const port = await freePort();
  base = `http://localhost:${port}`;
  child = spawn(process.execPath, ['index.js'], {
    cwd: resolve(import.meta.dirname, '..'),
    env: {
      ...process.env, DATA_ROOT: SERVER_ROOT, PORT: String(port), NODE_ENV: 'test', ADMIN_EMAIL: OWNER.email, DEPTH_ENABLED: '0',
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
  store.closeStore();
  for (const d of [DATA_ROOT, SERVER_ROOT, DIST]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* Windows may hold a file a moment */ } }
});

test('only the invitation’s planner or couple manage its guest links; guests get the filtered API', async () => {
  for (const slug of ['asha-ravi', 'mina-hari']) {
    assert.equal((await owner.req('/api/invitations', { method: 'POST', body: { bride: 'Asha', groom: 'Ravi', slug, weddingDate: '2027-02-14' } })).status, 201);
  }
  const slug = 'asha-ravi';
  const path = `/api/invitations/${slug}/guest-links`;
  const draftList = await owner.req(path);
  assert.equal(draftList.status, 200);
  assert.equal(draftList.body.live, false);
  assert.equal((await owner.req(path, { method: 'POST', body: { name: 'Haldi', events: ['haldi'] } })).status, 409, 'drafts: after publishing');
  const pub = await owner.req(`/api/invitations/${slug}/publish`, { method: 'POST', body: {} });
  assert.equal(pub.status, 200, JSON.stringify(pub.body));
  const { body: listed } = await owner.req(path);
  assert.equal(listed.live, true);
  const evIds = listed.events.map((e) => e.id);
  assert.ok(evIds.length >= 2, `starter ceremonies: ${evIds}`);
  const made = await owner.req(path, { method: 'POST', body: { name: 'First group', events: [evIds[0]] } });
  assert.equal(made.status, 201, JSON.stringify(made.body));
  const id = made.body.link.id;

  // the couple of this invitation may; a couple of another one, a staff member without 'invitations', a stranger may not
  const coupleLink = await owner.req(`/api/invitations/${slug}/client-link`, { method: 'POST', body: { password: 'couple-pass-1' } });
  const couple = browser();
  assert.equal((await couple.req('/api/client/session', { method: 'POST', body: { token: coupleLink.body.token, password: 'couple-pass-1' } })).status, 200);
  assert.equal((await couple.req(path, { method: 'POST', body: { name: 'Couple’s group', events: [evIds[1]] } })).status, 201);
  assert.equal((await couple.req(`${path}/${id}`, { method: 'PATCH', body: { name: 'Renamed' } })).status, 200);

  const otherLink = await owner.req('/api/invitations/mina-hari/client-link', { method: 'POST', body: { password: 'couple-pass-2' } });
  const other = browser();
  assert.equal((await other.req('/api/client/session', { method: 'POST', body: { token: otherLink.body.token, password: 'couple-pass-2' } })).status, 200);
  assert.equal((await owner.req('/api/admin/team', { method: 'POST', body: { email: 'replies@test.local', name: 'Rina', password: 'staff-password-1', role: 'admin', perms: ['replies'] } })).status, 201);
  const staff = await browser().login('replies@test.local', 'staff-password-1');
  const stranger = browser();
  for (const [who, b, want] of [['another couple', other, 403], ['staff without invitations', staff, 403], ['a stranger', stranger, 401]]) {
    assert.equal((await b.req(path)).status, want, `${who}: list`);
    assert.equal((await b.req(path, { method: 'POST', body: { name: 'X', events: [evIds[0]] } })).status, want, `${who}: create`);
    assert.equal((await b.req(`${path}/${id}`, { method: 'PATCH', body: { name: 'X' } })).status, want, `${who}: rename`);
    assert.equal((await b.req(`${path}/${id}`, { method: 'DELETE' })).status, want, `${who}: delete`);
  }

  // guests: the API through the link carries only its ceremony; an unknown link is gone
  const guest = browser();
  const narrowed = await guest.req(`/api/invitations/${slug}/public?g=${id}`);
  assert.equal(narrowed.status, 200);
  assert.deepEqual(narrowed.body.events.map((e) => e.id), [evIds[0]]);
  assert.equal(JSON.stringify(narrowed.body).includes(`"${evIds[1]}"`), false, 'the hidden ceremony is not in the JSON');
  assert.equal((await guest.req(`/api/invitations/${slug}/public`)).body.events.length, evIds.length, 'the full link shows everything');
  const gone = await guest.req(`/api/invitations/${slug}/public?g=nOtALink00`);
  assert.equal(gone.status, 410);
  assert.equal(gone.body.code, 'link_inactive');
  const short = await guest.req(`/i/${slug}?g=nOtALink00`);
  assert.equal(short.status, 410);
  assert.match(short.body, /This link is no longer active/);

  assert.equal((await owner.req(`${path}/${id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await guest.req(`/api/invitations/${slug}/public?g=${id}`)).status, 410, 'deleted: disabled at once');
  assert.equal((await owner.req(`${path}/${id}`, { method: 'DELETE' })).status, 404);
});
