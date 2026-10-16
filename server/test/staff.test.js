// Staff accounts, permissions and the audit log, against the real server (index.js, so the real route → permission
// map) started in a child process with a throwaway DATA_ROOT. Run: npm test, and STORE=json npm test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { hash as argonHash } from '@node-rs/argon2';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-staff-'));
const OWNER = { email: 'owner@test.local', password: 'owner-password-1' };
let child;
let base;
let owner;
let slug;

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
  slug = 'asha-ravi';
  const inv = await owner.req('/api/invitations', { method: 'POST', body: { bride: 'Asha', groom: 'Ravi', slug } });
  assert.equal(inv.status, 201, JSON.stringify(inv.body));
  assert.equal((await owner.req(`/api/invitations/${slug}/client-link`, { method: 'POST', body: { password: 'couple-pass-1' } })).status, 201);
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

const addStaff = async (email, role, perms = [], password = 'staff-password-1') => {
  const r = await owner.req('/api/admin/team', { method: 'POST', body: { email, name: email.split('@')[0], password, role, perms } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.member;
};

test('the owner adds, lists, changes and removes team members; the owner is listed but locked', async () => {
  const m = await addStaff('rina@test.local', 'admin', ['orders', 'replies']);
  assert.deepEqual(m.perms, ['replies', 'orders']);
  assert.equal(m.role, 'admin');
  assert.equal(JSON.stringify(m).includes('Hash'), false, 'never the password hash');
  const bad = await owner.req('/api/admin/team', { method: 'POST', body: { email: 'x@test.local', name: 'X', password: 'staff-password-1', role: 'admin', perms: ['nonsense'] } });
  assert.equal(bad.status, 400);
  assert.equal((await owner.req('/api/admin/team', { method: 'POST', body: { email: 'RINA@test.local', name: 'Rina', password: 'staff-password-1', role: 'admin' } })).status, 409, 'email taken');
  assert.equal((await owner.req('/api/admin/team', { method: 'POST', body: { email: OWNER.email, name: 'Me', password: 'staff-password-1', role: 'super' } })).status, 409, 'the owner email');
  assert.equal((await owner.req('/api/admin/team', { method: 'POST', body: { email: 'short@test.local', name: 'Short', password: 'short', role: 'admin' } })).status, 400, 'password too short');
  const list = await owner.req('/api/admin/team');
  assert.equal(list.status, 200);
  assert.equal(list.body.owner.email, OWNER.email);
  assert.equal(list.body.owner.locked, true);
  assert.ok(list.body.staff.some((x) => x.id === m.id));
  assert.ok(list.body.perms.some((p) => p.key === 'finance'));
  const renamed = await owner.req(`/api/admin/team/${m.id}`, { method: 'PATCH', body: { name: 'Rina Shah' } });
  assert.equal(renamed.body.member.name, 'Rina Shah');
  const gone = await addStaff('temp@test.local', 'admin', ['music']);
  assert.equal((await owner.req(`/api/admin/team/${gone.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await owner.req(`/api/admin/team/${gone.id}`, { method: 'DELETE' })).status, 404);
  // a team email cannot also be a customer account
  assert.equal((await browser().req('/api/auth/signup', { method: 'POST', body: { name: 'Rina', email: 'rina@test.local', password: 'customer-pass-1' } })).status, 409);
});

test('an admin only reaches the areas they were given; team and audit are for super admins', async () => {
  await addStaff('orders@test.local', 'admin', ['orders']);
  const s = await browser().login('orders@test.local', 'staff-password-1');
  assert.deepEqual(s.me.perms, ['orders']);
  assert.equal(s.me.superAdmin, false);
  const me = await s.req('/api/auth/me');
  assert.deepEqual(me.body.perms, ['orders']);
  assert.equal((await s.req('/api/orders')).status, 200);
  assert.equal((await s.req('/api/admin/stats')).status, 200);
  assert.equal((await s.req('/api/admin/site')).status, 200, 'plans and payment methods for the orders page');
  for (const [method, path] of [
    ['GET', '/api/admin/customers'], ['GET', '/api/admin/music'], ['GET', '/api/invitations'], ['GET', `/api/invitations/${slug}`],
    ['PUT', `/api/invitations/${slug}`], ['GET', `/api/invitations/${slug}/rsvps`], ['POST', `/api/invitations/${slug}/unpublish`],
    ['PUT', '/api/site'], ['GET', '/api/pay/status'], ['GET', '/api/admin/team'], ['GET', '/api/admin/audit'],
    ['POST', '/api/admin/team'], ['GET', '/api/admin/finance/summary'], ['POST', `/api/orders/x/invitation`],
  ]) {
    const r = await s.req(path, { method, body: method === 'GET' ? undefined : {} });
    assert.equal(r.status, 403, `${method} ${path} -> ${r.status}`);
  }

  // replies: the list (couple links left out) and the replies, but not the invitation itself
  await addStaff('replies@test.local', 'admin', ['replies']);
  const r = await browser().login('replies@test.local', 'staff-password-1');
  const list = await r.req('/api/invitations');
  assert.equal(list.status, 200);
  const item = list.body.invitations.find((i) => i.slug === slug);
  assert.ok(item.clientLink, 'the link exists');
  assert.equal(item.clientLink.url, null, 'but its URL (the couple token) is not shown');
  assert.match((await owner.req('/api/invitations')).body.invitations.find((i) => i.slug === slug).clientLink.url, /#\/c\//);
  assert.equal((await r.req(`/api/invitations/${slug}/rsvps`)).status, 200);
  assert.equal((await r.req(`/api/invitations/${slug}`)).status, 403);

  // finance: the area under /api/admin/finance lets them through (404: no such page yet), others get 403
  await addStaff('money@test.local', 'admin', ['finance']);
  const f = await browser().login('money@test.local', 'staff-password-1');
  assert.equal((await f.req('/api/admin/finance/summary')).status, 404);

  // themes only: saving the site changes the themes part and nothing else
  await owner.req('/api/site', { method: 'PUT', body: { ...(await owner.req('/api/admin/site')).body, contact: { phone: '9800000000', whatsapp: '', email: '', address: 'Kathmandu' } } });
  await addStaff('themes@test.local', 'admin', ['themes']);
  const t = await browser().login('themes@test.local', 'staff-password-1');
  const cur = (await t.req('/api/admin/site')).body;
  const saved = await t.req('/api/site', { method: 'PUT', body: { ...cur, hiddenThemes: ['mahal'], contact: { phone: '9811111111', whatsapp: '', email: '', address: 'Elsewhere' } } });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  const after1 = (await owner.req('/api/admin/site')).body;
  assert.deepEqual(after1.hiddenThemes, ['mahal']);
  assert.equal(after1.contact.address, 'Kathmandu', 'the website part is kept');

  // a super admin (staff) manages the team, but cannot remove or limit themselves
  const sup = await addStaff('boss@test.local', 'super');
  const b = await browser().login('boss@test.local', 'staff-password-1');
  assert.equal(b.me.superAdmin, true);
  assert.equal((await b.req('/api/admin/team')).status, 200);
  assert.equal((await b.req('/api/admin/audit')).status, 200);
  assert.equal((await b.req(`/api/invitations/${slug}`)).status, 200);
  assert.equal((await b.req(`/api/admin/team/${sup.id}`, { method: 'DELETE' })).status, 400);
  assert.equal((await b.req(`/api/admin/team/${sup.id}`, { method: 'PATCH', body: { disabled: true } })).status, 400);
  assert.equal((await b.req(`/api/admin/team/${sup.id}`, { method: 'PATCH', body: { role: 'admin' } })).status, 400);
});

test('turning a member off, changing their access or resetting their password ends their sessions', async () => {
  const m = await addStaff('kiran@test.local', 'admin', ['orders']);
  let s = await browser().login('kiran@test.local', 'staff-password-1');
  assert.equal((await s.req('/api/orders')).status, 200);
  assert.equal((await owner.req(`/api/admin/team/${m.id}`, { method: 'PATCH', body: { disabled: true } })).status, 200);
  assert.equal((await s.req('/api/auth/me')).status, 401, 'signed out at once');
  assert.equal((await s.req('/api/orders')).status, 401);
  assert.equal((await browser().req('/api/auth/login', { method: 'POST', body: { email: 'kiran@test.local', password: 'staff-password-1' } })).status, 401, 'cannot sign in while off');
  await owner.req(`/api/admin/team/${m.id}`, { method: 'PATCH', body: { disabled: false } });

  s = await browser().login('kiran@test.local', 'staff-password-1');
  await owner.req(`/api/admin/team/${m.id}`, { method: 'PATCH', body: { perms: ['orders', 'music'] } });
  assert.equal((await s.req('/api/auth/me')).status, 401, 'access changed');
  s = await browser().login('kiran@test.local', 'staff-password-1');
  assert.deepEqual(s.me.perms, ['orders', 'music']);
  await owner.req(`/api/admin/team/${m.id}`, { method: 'PATCH', body: { password: 'brand-new-pass-2' } });
  assert.equal((await s.req('/api/auth/me')).status, 401, 'password reset');
  assert.equal((await browser().req('/api/auth/login', { method: 'POST', body: { email: 'kiran@test.local', password: 'staff-password-1' } })).status, 401);
  s = await browser().login('kiran@test.local', 'brand-new-pass-2');
  await owner.req(`/api/admin/team/${m.id}`, { method: 'DELETE' });
  assert.equal((await s.req('/api/auth/me')).status, 401, 'removed');
});

test('the audit log records admin changes (never a password), sign-ins and refused requests; super admins read it', async () => {
  const m = await addStaff('audit-me@test.local', 'admin', ['orders']);
  const secret = 'Very-Secret-Pass-77';
  await owner.req(`/api/admin/team/${m.id}`, { method: 'PATCH', body: { password: secret } });
  const s = await browser().login('audit-me@test.local', secret);
  await s.req('/api/admin/customers', { method: 'POST', body: { email: 'c@test.local', name: 'C', password: 'whatever-1' } }); // 403
  await browser().req('/api/auth/login', { method: 'POST', body: { email: 'audit-me@test.local', password: 'wrong-password' } });
  const log = await owner.req('/api/admin/audit');
  assert.equal(log.status, 200);
  const raw = JSON.stringify(log.body);
  assert.equal(raw.includes(secret), false, 'no password value');
  assert.equal(raw.includes('whatever-1'), false, 'no body values');
  const change = log.body.rows.find((e) => e.action === 'PATCH /admin/team/:id' && e.target === m.id);
  assert.ok(change, 'the change is there');
  assert.equal(change.actor, 'owner');
  assert.equal(change.actorEmail, OWNER.email);
  assert.equal(change.status, 200);
  assert.deepEqual(change.fields, ['password']);
  assert.match(change.label, /password reset/);
  assert.ok(change.ip);
  const refused = log.body.rows.find((e) => e.action === 'POST /admin/customers' && e.actor === `staff:${m.id}`);
  assert.equal(refused?.status, 403);
  assert.ok(log.body.rows.some((e) => e.action === 'POST /auth/login' && e.actor === `staff:${m.id}` && e.status === 200));
  assert.ok(log.body.rows.some((e) => e.action === 'POST /auth/login' && e.actor === `staff:${m.id}` && e.status === 401));
  assert.ok(log.body.rows.some((e) => e.action === 'POST /invitations' && e.target === null && e.label === 'Created an invitation'));
  // newest first, filter by person and by text, paging
  assert.ok(log.body.rows[0].seq > log.body.rows.at(-1).seq);
  const mine = await owner.req(`/api/admin/audit?actor=${encodeURIComponent(`staff:${m.id}`)}`);
  assert.ok(mine.body.rows.length >= 3 && mine.body.rows.every((e) => e.actor === `staff:${m.id}`));
  assert.ok(mine.body.actors.some((a) => a.actor === `staff:${m.id}`));
  const text = await owner.req('/api/admin/audit?q=customers');
  assert.ok(text.body.rows.length >= 1 && text.body.rows.every((e) => JSON.stringify(e).toLowerCase().includes('customers')));
  const odd = await owner.req(`/api/admin/audit?q=${encodeURIComponent("%' OR 1=1 --")}`);
  assert.equal(odd.status, 200);
  assert.equal(odd.body.total, 0, 'the filter is text, never SQL');
  const p2 = await owner.req('/api/admin/audit?page=2');
  assert.equal(p2.body.page, 2);
  assert.equal(p2.body.pageSize, 50);
});
