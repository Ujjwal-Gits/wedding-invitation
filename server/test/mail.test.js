// Account emails (Brevo stubbed): sign-up sends "Confirm your email", the link confirms it; "Forgot password"
// sends a one-use reset link that sets a new password and signs in; the same answer for unknown emails.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-mail-'));
process.env.DATA_ROOT = DATA_ROOT;
process.env.BREVO_API_KEY = 'test-key';
process.env.MAIL_FROM = 'hello@test.local';

const sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (String(url).startsWith('https://api.brevo.com/')) { sent.push({ headers: opts.headers, body: JSON.parse(opts.body) }); return new Response('{"messageId":"x"}', { status: 201 }); }
  return realFetch(url, opts);
};

const store = await import('../lib/store.js');
store.openStore();
const { startSessions } = await import('../lib/sessions.js');
startSessions();
const express = (await import('express')).default;
const auth = await import('../lib/auth.js');
const customers = await import('../lib/customers.js');

let server;
let base;
before(() => {
  const app = express();
  app.use(auth.loadSession);
  const api = express.Router();
  const json = express.json({ limit: '8kb' });
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  api.post('/auth/login', json, wrap(auth.login));
  api.post('/auth/signup', json, wrap(customers.signup));
  api.post('/auth/forgot', json, wrap(customers.forgot));
  api.post('/auth/reset', json, wrap(customers.resetPassword));
  api.post('/auth/verify', json, wrap(customers.verifyEmail));
  api.get('/account', auth.requireCustomer, wrap(customers.account));
  app.use('/api', api);
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
});
after(() => {
  server?.close();
  try { store.closeStore(); } catch { /* closed */ }
  try { rmSync(DATA_ROOT, { recursive: true, force: true }); } catch { /* Windows */ }
});

function browser() {
  const b = { cookie: '', csrf: '' };
  b.req = async (path, { method = 'GET', body } = {}) => {
    const headers = { Origin: base };
    if (b.cookie) headers.Cookie = b.cookie;
    if (b.csrf) headers['X-CSRF-Token'] = b.csrf;
    if (body) headers['Content-Type'] = 'application/json';
    const r = await realFetch(`${base}/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const set = r.headers.get('set-cookie');
    if (set) b.cookie = set.split(';')[0];
    const data = await r.json().catch(() => ({}));
    if (data.csrf) b.csrf = data.csrf;
    return { status: r.status, data };
  };
  return b;
}
const linkIn = (mail, kind) => new RegExp(`/studio/${kind}/([A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]+)`).exec(mail.body.textContent)?.[1];
const until = async (fn) => { for (let i = 0; i < 50 && !fn(); i++) await new Promise((r) => setTimeout(r, 10)); };

test('sign-up emails a confirm link through Brevo; the link confirms the email once', async () => {
  const b = browser();
  const r = await b.req('/auth/signup', { method: 'POST', body: { name: 'Asha Rai', email: 'Asha@Example.com', password: 'first-pass-1' } });
  assert.equal(r.status, 201);
  assert.equal(r.data.verifySent, true);
  const mail = sent.at(-1);
  assert.equal(mail.headers['api-key'], 'test-key');
  assert.deepEqual(mail.body.to, [{ email: 'asha@example.com', name: 'Asha Rai' }]);
  assert.equal(mail.body.sender.email, 'hello@test.local');
  const tok = linkIn(mail, 'verify');
  assert.ok(tok);
  assert.equal((await b.req('/account')).data.customer.emailVerified, false);
  assert.equal((await browser().req('/auth/verify', { method: 'POST', body: { token: `${tok.split('.')[0]}.wrong-token-wrong-token-xx` } })).status, 400);
  assert.equal((await browser().req('/auth/verify', { method: 'POST', body: { token: tok } })).status, 200);
  assert.equal((await b.req('/account')).data.customer.emailVerified, true);
});

test('forgot password: same answer for unknown emails; the link sets a new password once and signs in', async () => {
  const n = sent.length;
  const unknown = await browser().req('/auth/forgot', { method: 'POST', body: { email: 'nobody@example.com' } });
  assert.deepEqual(unknown.data, { ok: true, mail: true });
  const r = await browser().req('/auth/forgot', { method: 'POST', body: { email: 'asha@example.com' } });
  assert.deepEqual(r.data, { ok: true, mail: true });
  await until(() => sent.length > n);
  assert.equal(sent.length, n + 1, 'only the real account gets an email');
  const tok = linkIn(sent.at(-1), 'reset');
  const b = browser();
  assert.equal((await b.req('/auth/reset', { method: 'POST', body: { token: tok, password: 'short' } })).status, 400);
  const ok = await b.req('/auth/reset', { method: 'POST', body: { token: tok, password: 'second-pass-2' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.role, 'customer');
  assert.equal((await b.req('/account')).status, 200);
  assert.equal((await browser().req('/auth/reset', { method: 'POST', body: { token: tok, password: 'third-pass-3' } })).status, 400, 'one use only');
  assert.equal((await browser().req('/auth/login', { method: 'POST', body: { email: 'asha@example.com', password: 'first-pass-1' } })).status, 401);
  assert.equal((await browser().req('/auth/login', { method: 'POST', body: { email: 'asha@example.com', password: 'second-pass-2' } })).status, 200);
});
