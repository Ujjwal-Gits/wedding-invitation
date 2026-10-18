// Account emails (Brevo stubbed): sign-up emails a 6-digit code first (in the subject, for "Copy code") and only the
// right code makes the account (email confirmed); old unconfirmed accounts still confirm with "Confirm your email";
// "Forgot password" sends a one-use code; the code alone is checked first (a short-lived reset ticket back), then the
// ticket sets the new password and signs in; the same answer for unknown emails.
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
  api.post('/auth/signup/start', json, wrap(customers.signupStart));
  api.post('/auth/signup', json, wrap(customers.signup));
  api.post('/auth/forgot', json, wrap(customers.forgot));
  api.post('/auth/reset/check', json, wrap(customers.checkResetCode));
  api.post('/auth/reset', json, wrap(customers.resetPassword));
  api.post('/account/verify', auth.requireCustomer, wrap(customers.resendVerify));
  api.post('/account/verify/confirm', auth.requireCustomer, json, wrap(customers.confirmVerify));
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
const codeIn = (mail) => /^(\d{6}) is your Nimtto (?:sign-up )?code$/.exec(mail.body.subject)?.[1];
const until = async (fn) => { for (let i = 0; i < 50 && !fn(); i++) await new Promise((r) => setTimeout(r, 10)); };
const other = (code) => (code === '000000' ? '111111' : '000000');
const ASHA = { name: 'Asha Rai', email: 'Asha@Example.com', phone: '+977 9801234567', password: 'first-pass-1' };

test('sign-up: a code is emailed first; no account until the right code; then made (email confirmed) and signed in', async () => {
  const b = browser();
  // the phone (with its country code) is required, and stored as E.164
  for (const phone of [undefined, '', '555-1234', '+1 555 123 4567']) {
    const bad = await b.req('/auth/signup/start', { method: 'POST', body: { ...ASHA, phone } });
    assert.equal(bad.status, 400, String(phone));
    assert.deepEqual(bad.data.fields, ['phone']);
    assert.equal(bad.data.error, 'Enter a valid phone number with country code.');
  }
  const n = sent.length;
  const r = await b.req('/auth/signup/start', { method: 'POST', body: ASHA });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { ok: true, email: 'asha@example.com', expiresIn: 900 });
  assert.equal(sent.length, n + 1);
  assert.ok(!store.customerStore.byEmail('asha@example.com'), 'no account before the code');
  assert.equal(b.cookie, '', 'not signed in yet');
  const mail = sent.at(-1);
  assert.equal(mail.headers['api-key'], 'test-key');
  assert.deepEqual(mail.body.to, [{ email: 'asha@example.com', name: 'Asha Rai' }]);
  assert.deepEqual(mail.body.tags, ['signup-code']);
  assert.match(mail.body.subject, /^\d{6} is your Nimtto sign-up code$/);
  const code = codeIn(mail);
  assert.ok(code, 'the code is in the subject');
  assert.ok(mail.body.textContent.includes(code));
  // a wrong code: still no account
  const wrong = await b.req('/auth/signup', { method: 'POST', body: { email: 'asha@example.com', code: other(code) } });
  assert.equal(wrong.status, 400);
  assert.equal(wrong.data.code, 'code_wrong');
  assert.ok(!store.customerStore.byEmail('asha@example.com'));
  assert.equal((await b.req('/auth/signup', { method: 'POST', body: { email: 'asha@example.com', code: '12345' } })).status, 400);
  assert.equal((await b.req('/auth/signup', { method: 'POST', body: { email: 'bina@example.com', code } })).status, 400, 'the code belongs to its email');
  // the right code (spaces are fine, any case of email): the account, confirmed, signed in
  const ok = await b.req('/auth/signup', { method: 'POST', body: { email: 'ASHA@example.com', code: `${code.slice(0, 3)} ${code.slice(3)}` } });
  assert.equal(ok.status, 201, JSON.stringify(ok.data));
  assert.equal(ok.data.role, 'customer');
  assert.equal(ok.data.email, 'asha@example.com');
  assert.equal(ok.data.name, 'Asha Rai');
  assert.ok(ok.data.csrf);
  const c = store.customerStore.byEmail('asha@example.com');
  assert.equal(c.phone, '+9779801234567');
  assert.equal(c.emailVerified, true);
  assert.equal(JSON.stringify(c).includes(ASHA.password), false, 'only the password hash is kept');
  assert.equal((await b.req('/account')).data.customer.emailVerified, true, 'no "confirm your email" banner');
  assert.equal((await b.req('/auth/signup', { method: 'POST', body: { email: 'asha@example.com', code } })).status, 400, 'the code is used up');
  assert.equal((await browser().req('/auth/login', { method: 'POST', body: { email: 'asha@example.com', password: ASHA.password } })).status, 200);
  // an email with an account: 409 account_exists, and no code is sent
  const m = sent.length;
  const again = await browser().req('/auth/signup/start', { method: 'POST', body: ASHA });
  assert.equal(again.status, 409);
  assert.equal(again.data.code, 'account_exists');
  assert.equal(sent.length, m);
});

test('sign-up: five wrong codes end it; an expired code makes no account; Send again sends a new code', async () => {
  const b = browser();
  const BINA = { name: 'Bina Lama', email: 'bina@example.com', phone: '+1 201 555 0123', password: 'first-pass-1' };
  await b.req('/auth/signup/start', { method: 'POST', body: BINA });
  const code = codeIn(sent.at(-1));
  for (let i = 0; i < 5; i++) assert.equal((await b.req('/auth/signup', { method: 'POST', body: { email: BINA.email, code: other(code) } })).status, 400);
  const late = await b.req('/auth/signup', { method: 'POST', body: { email: BINA.email, code } });
  assert.equal(late.status, 400);
  assert.equal(late.data.code, 'code_expired');
  assert.ok(!store.customerStore.byEmail(BINA.email));
  // expired after 15 minutes
  await b.req('/auth/signup/start', { method: 'POST', body: BINA });
  const code2 = codeIn(sent.at(-1));
  const now = Date.now;
  Date.now = () => now() + 16 * 60 * 1000;
  let r;
  try { r = await b.req('/auth/signup', { method: 'POST', body: { email: BINA.email, code: code2 } }); } finally { Date.now = now; }
  assert.equal(r.status, 400);
  assert.equal(r.data.code, 'code_expired');
  assert.ok(!store.customerStore.byEmail(BINA.email));
  // Send again: a new code, and only the newest one works
  await b.req('/auth/signup/start', { method: 'POST', body: BINA });
  const code3 = codeIn(sent.at(-1));
  assert.equal((await b.req('/auth/signup/start', { method: 'POST', body: BINA })).status, 429, 'three codes per email per hour');
  assert.equal((await b.req('/auth/signup', { method: 'POST', body: { email: BINA.email, code: code3 } })).status, 201);
  assert.equal(store.customerStore.byEmail(BINA.email).emailVerified, true);
});

test('an old account that never confirmed its email still confirms with a code; wrong codes run out', async () => {
  const accounts = await import('../lib/accounts.js');
  const passwordHash = await auth.hashAccountPassword('old-pass-12');
  await accounts.createCustomer({ email: 'old@example.com', name: 'Old Timer', phone: '+9779801234500', passwordHash });
  const b = browser();
  assert.equal((await b.req('/auth/login', { method: 'POST', body: { email: 'old@example.com', password: 'old-pass-12' } })).status, 200);
  assert.equal((await b.req('/account')).data.customer.emailVerified, false, 'the banner shows');
  assert.equal((await b.req('/account/verify', { method: 'POST' })).status, 200);
  const mail = sent.at(-1);
  assert.deepEqual(mail.body.tags, ['verify-email']);
  const code = codeIn(mail);
  assert.equal((await b.req('/account/verify/confirm', { method: 'POST', body: { code: other(code) } })).status, 400);
  assert.equal((await b.req('/account/verify/confirm', { method: 'POST', body: { code: `${code.slice(0, 3)} ${code.slice(3)}` } })).status, 200, 'spaces are fine');
  assert.equal((await b.req('/account')).data.customer.emailVerified, true);

  // five wrong tries and a code is gone, even the right one
  await accounts.createCustomer({ email: 'old2@example.com', name: 'Old Two', phone: '+9779801234501', passwordHash });
  const b2 = browser();
  await b2.req('/auth/login', { method: 'POST', body: { email: 'old2@example.com', password: 'old-pass-12' } });
  await b2.req('/account/verify', { method: 'POST' });
  const code2 = codeIn(sent.at(-1));
  for (let i = 0; i < 5; i++) await b2.req('/account/verify/confirm', { method: 'POST', body: { code: other(code2) } });
  assert.equal((await b2.req('/account/verify/confirm', { method: 'POST', body: { code: code2 } })).status, 400);
});

test('forgot password: same answer for unknown emails; the code sets a new password once and signs in', async () => {
  const n = sent.length;
  const unknown = await browser().req('/auth/forgot', { method: 'POST', body: { email: 'nobody@example.com' } });
  assert.deepEqual(unknown.data, { ok: true, mail: true });
  const r = await browser().req('/auth/forgot', { method: 'POST', body: { email: 'asha@example.com' } });
  assert.deepEqual(r.data, { ok: true, mail: true });
  await until(() => sent.length > n);
  assert.equal(sent.length, n + 1, 'only the real account gets an email');
  const code = codeIn(sent.at(-1));
  const b = browser();
  // step 1: the code alone; a right code is used up and answered with a one-time ticket
  assert.equal((await b.req('/auth/reset/check', { method: 'POST', body: { email: 'nobody@example.com', code } })).status, 400, 'the code belongs to its account');
  assert.equal((await b.req('/auth/reset/check', { method: 'POST', body: { email: 'asha@example.com', code: '12345' } })).status, 400);
  const checked = await b.req('/auth/reset/check', { method: 'POST', body: { email: 'ASHA@example.com', code } });
  assert.equal(checked.status, 200);
  const { ticket } = checked.data;
  assert.match(ticket, /^[A-Za-z0-9_-]{43}$/);
  assert.equal((await browser().req('/auth/reset/check', { method: 'POST', body: { email: 'asha@example.com', code } })).status, 400, 'the code is used up');
  // only the ticket's hash is stored
  const stored = (await import('../lib/accounts.js')).customerByEmail('asha@example.com');
  assert.equal(JSON.stringify(stored).includes(ticket), false);
  assert.match(stored.resetTicket.hash, /^[a-f0-9]{64}$/);
  // step 2: the ticket and the new password
  assert.equal((await b.req('/auth/reset', { method: 'POST', body: { email: 'asha@example.com', ticket, password: 'short' } })).status, 400);
  assert.equal((await b.req('/auth/reset', { method: 'POST', body: { email: 'asha@example.com', code, password: 'second-pass-2' } })).status, 400, 'a code alone no longer sets a password');
  assert.equal((await b.req('/auth/reset', { method: 'POST', body: { email: 'asha@example.com', ticket: 'A'.repeat(43), password: 'second-pass-2' } })).status, 400, 'a wrong ticket');
  assert.equal((await b.req('/auth/reset', { method: 'POST', body: { email: 'bina@example.com', ticket, password: 'second-pass-2' } })).status, 400, 'the ticket belongs to its account');
  const ok = await b.req('/auth/reset', { method: 'POST', body: { email: 'ASHA@example.com', ticket, password: 'second-pass-2' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.role, 'customer');
  assert.equal((await b.req('/account')).status, 200);
  assert.equal((await browser().req('/auth/reset', { method: 'POST', body: { email: 'asha@example.com', ticket, password: 'third-pass-3' } })).status, 400, 'one use only');
  assert.equal((await browser().req('/auth/login', { method: 'POST', body: { email: 'asha@example.com', password: 'first-pass-1' } })).status, 401);
  assert.equal((await browser().req('/auth/login', { method: 'POST', body: { email: 'asha@example.com', password: 'second-pass-2' } })).status, 200);
});

test('forgot password: wrong codes at the check step count, and five end the code', async () => {
  const n = sent.length;
  await browser().req('/auth/forgot', { method: 'POST', body: { email: 'bina@example.com' } });
  await until(() => sent.length > n);
  const code = codeIn(sent.at(-1));
  const wrong = code === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) {
    const r = await browser().req('/auth/reset/check', { method: 'POST', body: { email: 'bina@example.com', code: wrong } });
    assert.equal(r.status, 400);
  }
  const late = await browser().req('/auth/reset/check', { method: 'POST', body: { email: 'bina@example.com', code } });
  assert.equal(late.status, 400);
  assert.equal(late.data.code, 'code_bad', 'one answer for wrong, expired and unknown');
});
