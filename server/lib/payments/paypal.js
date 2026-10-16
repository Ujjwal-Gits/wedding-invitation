// PayPal REST client: OAuth token (cached), Orders v2 (create, capture, show), refunds of a capture and webhook
// signature verification.
// Off unless PAYPAL_ENV, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and PAYPAL_WEBHOOK_ID are all set (server/.env).
// Nothing here ever logs or returns the secret or an access token.

const API_BASE = { sandbox: 'https://api-m.sandbox.paypal.com', live: 'https://api-m.paypal.com' };
const CRED_RE = /^[A-Za-z0-9_-]{16,128}$/;
const WEBHOOK_ID_RE = /^[A-Za-z0-9_-]{6,64}$/;
export const PAYPAL_ORDER_ID_RE = /^[A-Z0-9]{8,32}$/;
export const CAPTURE_ID_RE = /^[A-Za-z0-9]{6,64}$/;

/** Reads the PayPal settings from the environment. `enabled` only when every value is present and well formed. */
export function readConfig(env = process.env) {
  const mode = String(env.PAYPAL_ENV || '').trim().toLowerCase();
  const clientId = String(env.PAYPAL_CLIENT_ID || '').trim();
  const secret = String(env.PAYPAL_CLIENT_SECRET || '').trim();
  const webhookId = String(env.PAYPAL_WEBHOOK_ID || '').trim();
  const problems = [];
  if (mode && mode !== 'sandbox' && mode !== 'live') problems.push("PAYPAL_ENV must be 'sandbox' or 'live'");
  if (!clientId) problems.push('PAYPAL_CLIENT_ID is not set');
  else if (!CRED_RE.test(clientId)) problems.push('PAYPAL_CLIENT_ID does not look like a PayPal client ID');
  if (!secret) problems.push('PAYPAL_CLIENT_SECRET is not set');
  else if (!CRED_RE.test(secret)) problems.push('PAYPAL_CLIENT_SECRET does not look like a PayPal secret');
  if (!webhookId) problems.push('PAYPAL_WEBHOOK_ID is not set');
  else if (!WEBHOOK_ID_RE.test(webhookId)) problems.push('PAYPAL_WEBHOOK_ID does not look like a webhook ID');
  const envName = mode === 'live' ? 'live' : 'sandbox'; // unset means sandbox: never live by accident
  return { env: envName, clientId, secret, webhookId, enabled: problems.length === 0, problems };
}

export class PayPalError extends Error {
  constructor(message, { status = 0, name = '', issue = '', debugId = '' } = {}) {
    super(message);
    this.name = 'PayPalError';
    this.httpStatus = status;
    this.ppName = name;
    this.issue = issue;
    this.debugId = debugId;
  }
}

/**
 * A client for one PayPal app. `fetch` is injectable (tests use a mock). Calls time out after `timeoutMs`.
 */
export function createClient({ env, clientId, secret, fetch: fetchFn = globalThis.fetch, timeoutMs = 15_000, now = Date.now }) {
  const base = API_BASE[env] || API_BASE.sandbox;
  let token = null; // { value, exp }
  let pending = null;

  async function call(url, init) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      return await fetchFn(url, { ...init, signal: ctl.signal });
    } catch (err) {
      throw new PayPalError(err.name === 'AbortError' ? 'PayPal did not answer in time.' : 'Could not reach PayPal.', { status: 0 });
    } finally {
      clearTimeout(t);
    }
  }

  async function readBody(res) {
    const text = await res.text().catch(() => '');
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  }

  async function fetchToken() {
    const res = await call(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    const body = await readBody(res);
    if (!res.ok || typeof body?.access_token !== 'string') {
      throw new PayPalError('PayPal refused the app credentials (check PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET and PAYPAL_ENV).', { status: res.status, name: body?.error || '' });
    }
    const life = Number(body.expires_in) || 3600;
    // refresh five minutes early; never cache for less than a minute
    token = { value: body.access_token, exp: now() + Math.max(60, life - 300) * 1000 };
    return token.value;
  }

  /** The cached token, or a fresh one (concurrent callers share one request). */
  async function accessToken() {
    if (token && token.exp > now()) return token.value;
    if (!pending) pending = fetchToken().finally(() => { pending = null; });
    return pending;
  }

  async function request(method, path, { body, rawBody, headers = {} } = {}, retried = false) {
    const res = await call(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    if (res.status === 401 && !retried) { token = null; return request(method, path, { body, rawBody, headers }, true); }
    const data = await readBody(res);
    if (!res.ok) {
      const d = Array.isArray(data?.details) ? data.details[0] : null;
      throw new PayPalError(`PayPal ${method} ${path.split('?')[0]} failed: ${res.status} ${data?.name || ''}`.trim(), {
        status: res.status, name: data?.name || '', issue: d?.issue || '', debugId: data?.debug_id || res.headers?.get?.('paypal-debug-id') || '',
      });
    }
    return data;
  }

  return {
    env,
    accessToken,
    request, // for scripts/paypal-sandbox-check.js
    /** POST /v2/checkout/orders. amount is a string with two decimals. */
    createOrder({ ref, amount, currency, description, requestId }) {
      return request('POST', '/v2/checkout/orders', {
        headers: { 'PayPal-Request-Id': requestId, Prefer: 'return=minimal' },
        body: {
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: ref,
            custom_id: ref,
            description: description.slice(0, 127),
            soft_descriptor: 'NIMTTO',
            amount: { currency_code: currency, value: amount },
          }],
          payment_source: {
            paypal: { experience_context: { brand_name: 'Nimtto', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' } },
          },
        },
      });
    },
    /** POST /v2/checkout/orders/{id}/capture. The same requestId makes a repeated call return the first result. */
    captureOrder(id, requestId) {
      if (!PAYPAL_ORDER_ID_RE.test(id)) throw new PayPalError('Bad PayPal order id.', { status: 400 });
      return request('POST', `/v2/checkout/orders/${id}/capture`, { headers: { 'PayPal-Request-Id': requestId, Prefer: 'return=representation' }, rawBody: '{}' });
    },
    getOrder(id) {
      if (!PAYPAL_ORDER_ID_RE.test(id)) throw new PayPalError('Bad PayPal order id.', { status: 400 });
      return request('GET', `/v2/checkout/orders/${id}`);
    },
    /**
     * POST /v2/payments/captures/{id}/refund (full or partial). amount is a string with two decimals. The same
     * requestId makes a repeated call (a timeout, a double click) return the first refund instead of a second one.
     */
    refundCapture(captureId, { amount, currency, requestId, note = '' }) {
      if (!CAPTURE_ID_RE.test(String(captureId))) throw new PayPalError('Bad PayPal capture id.', { status: 400 });
      return request('POST', `/v2/payments/captures/${captureId}/refund`, {
        headers: { 'PayPal-Request-Id': requestId, Prefer: 'return=representation' },
        body: { amount: { value: amount, currency_code: currency }, ...(note ? { note_to_payer: note.slice(0, 255) } : {}) },
      });
    },
    /**
     * POST /v1/notifications/verify-webhook-signature. The event goes in exactly as received (re-serialising
     * it can change the bytes and fail the check), so the body is assembled around the raw text.
     */
    async verifyWebhook({ headers, rawBody, webhookId }) {
      const h = (k) => String(headers[k] || '');
      const fields = {
        auth_algo: h('paypal-auth-algo'),
        cert_url: h('paypal-cert-url'),
        transmission_id: h('paypal-transmission-id'),
        transmission_sig: h('paypal-transmission-sig'),
        transmission_time: h('paypal-transmission-time'),
        webhook_id: webhookId,
      };
      if (Object.values(fields).some((v) => !v || v.length > 2048)) return false;
      if (!/^https:\/\/api(-m)?\.(sandbox\.)?paypal\.com\//.test(fields.cert_url)) return false;
      const raw = `${JSON.stringify(fields).slice(0, -1)},"webhook_event":${rawBody}}`;
      const out = await request('POST', '/v1/notifications/verify-webhook-signature', { rawBody: raw });
      return out?.verification_status === 'SUCCESS';
    },
  };
}
