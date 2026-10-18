// Test helper (not a test file): an order needs a signed-in customer (lib/orders.js answers credentials alone with
// 401 sign_in_required). These make the account first, directly in the store as a confirmed sign-up would
// (`verified: false` for an older, unconfirmed account), sign in with POST /api/auth/login, then send the order
// without email or password. Only for tests whose app runs in this process (same store).
import assert from 'node:assert/strict';

/** The customer with this email, made if missing. */
export async function makeCustomer({ email, password, name = 'Test Customer', phone = '', market, verified = true }) {
  const accounts = await import('../lib/accounts.js');
  const { hashAccountPassword } = await import('../lib/auth.js');
  const { checkPhone } = await import('../lib/market.js'); // lib modules load after the test set DATA_ROOT
  const e = accounts.normEmail(email);
  const found = accounts.customerByEmail(e);
  if (found) return found;
  const p = checkPhone(String(phone || ''), market === 'intl' ? 'US' : 'NP');
  return accounts.createCustomer({
    email: e, name, phone: p.ok ? p.e164 : '', market: market === 'intl' || market === 'np' ? market : undefined,
    passwordHash: await hashAccountPassword(password), emailVerified: verified,
  });
}

/**
 * For a test browser `b` (with b.cookie and b.login): when the order body carries email + password and `b` is not
 * signed in, makes that account and signs `b` in. Returns the body without email and password.
 */
export async function signUpFor(b, body, { verified = true } = {}) {
  const { email, password, ...rest } = body;
  if (email && password && !b.cookie) {
    await makeCustomer({ email, password, name: rest.name, phone: rest.phone, market: rest.market, verified });
    await b.login(email, password);
  }
  return rest;
}

/** POST /api/orders with plain fetch: signs in as the body's email + password first (made if missing). */
export async function placeOrder(base, body, { origin = base, verified = true } = {}) {
  const { email, password, ...rest } = body;
  const headers = { 'Content-Type': 'application/json', Origin: origin };
  if (email && password) {
    await makeCustomer({ email, password, name: rest.name, phone: rest.phone, market: rest.market, verified });
    const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email, password }) });
    assert.equal(r.status, 200, `login ${email}`);
    headers.Cookie = r.headers.get('set-cookie').split(';')[0];
    headers['X-CSRF-Token'] = (await r.json()).csrf;
  }
  return fetch(`${base}/api/orders`, { method: 'POST', headers, body: JSON.stringify(rest) });
}
