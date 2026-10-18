// Payments API, mounted at /api/pay (server/index.js), plus the page headers the PayPal buttons need on /.
//   GET  /api/pay/config           public: { paypal: { enabled, env, clientId?, currency } } (the client ID is public)
//   GET  /api/pay/status           admin with 'website': configured or not, sandbox or live; never a secret
//   POST /api/pay/paypal/order     public { ref, t, source?, website }: Origin check, honeypot, rate limits
//   POST /api/pay/paypal/capture   public { ref, t, orderID, website }: same
// `ref` is the order's public reference (NM-24817) with its pay token `t`, or no token and the signed-in customer
// account that placed the order (the dashboard's payment section; then the session's CSRF token is required too).
// Requests made before references existed pass their 12-character id (itself unguessable) and no token.
// source 'card': a PayPal order for the card fields (payment_source card, 3-D Secure when the bank asks).
//   POST /api/pay/paypal/webhook   PayPal: raw JSON, verified with PayPal's verify-webhook-signature API
import express from 'express';
import { IS_PROD, PUBLIC_ORIGINS } from '../env.js';
import { rateLimiter, originAllowed, clientIp } from '../security.js';
import { requirePerm, csrfProblem } from '../auth.js';
import { getOrder, findOrder, mutateOrder, orderByRefAndToken, orderForCustomer, ID_RE, REF_RE } from '../orders.js';
import { readSite } from '../site.js';
import { readConfig, createClient, PayPalError, PAYPAL_ORDER_ID_RE } from './paypal.js';
import { createCheckout, CURRENCY } from './checkout.js';

// Exactly what PayPal's JS SDK needs (developer.paypal.com/sdk/js/csp): the SDK, its frames and its calls.
// *.paypal.com covers www.paypal.com and www.sandbox.paypal.com. Venmo is turned off in the SDK URL, so
// *.venmo.com is not needed. style-src already allows 'unsafe-inline', which the buttons use.
const PAYPAL_SOURCES = 'https://*.paypal.com https://*.paypalobjects.com';
const CSP_ADD = ['script-src', 'connect-src', 'frame-src', 'img-src', 'style-src'];

/** The site's CSP with the PayPal sources added to the directives the buttons use. */
export function withPayPalCsp(csp) {
  return String(csp).split(';').map((d) => {
    const t = d.trim();
    return CSP_ADD.includes(t.split(/\s+/)[0]) ? `${t} ${PAYPAL_SOURCES}` : t;
  }).join('; ');
}

export function createPayments({ config = readConfig(), fetch: fetchFn, deps = {} } = {}) {
  const client = config.enabled || deps.client ? (deps.client || createClient({ ...config, fetch: fetchFn })) : null;
  const checkout = client ? createCheckout({
    client, config,
    getOrder: deps.getOrder || getOrder,
    findOrder: deps.findOrder || findOrder,
    mutateOrder: deps.mutateOrder || mutateOrder,
    readSite: deps.readSite || readSite,
  }) : null;

  // per IP: opening checkout and capturing are cheap for PayPal but not free for us; webhooks come from PayPal's IPs
  const startLimit = rateLimiter({ windowMs: 10 * 60 * 1000, max: IS_PROD ? 20 : 500 });
  const captureLimit = rateLimiter({ windowMs: 10 * 60 * 1000, max: IS_PROD ? 30 : 500 });
  const hookLimit = rateLimiter({ windowMs: 60 * 1000, max: 120 });

  const router = express.Router();
  const json = express.json({ limit: '2kb', strict: true, type: 'application/json' });
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const limited = (lim, req, res) => {
    const r = lim.hit(clientIp(req));
    if (r.ok) return false;
    res.set('Retry-After', String(r.retryAfter));
    res.status(429).json({ ok: false, error: 'Too many tries from here. Please wait a few minutes.' });
    return true;
  };
  /** Shared checks for the two public POSTs. Returns the body, or null after answering. */
  const guard = async (lim, req, res) => {
    if (!originAllowed(req)) { res.status(403).json({ ok: false, error: 'Cross-site request refused.' }); return null; }
    if (limited(lim, req, res)) return null;
    if (!checkout) { res.status(503).json({ ok: false, error: 'Online payment is not available right now. We will call you instead.' }); return null; }
    const b = req.body;
    if (!b || typeof b !== 'object' || Array.isArray(b)) { res.status(400).json({ ok: false, error: 'Bad request.' }); return null; }
    if (b.website != null && b.website !== '') { res.status(400).json({ ok: false, error: 'Bad request.' }); return null; } // honeypot
    if (typeof b.ref === 'string' && REF_RE.test(b.ref)) {
      // no token: the signed-in customer who placed the order (with the session's CSRF token)
      const bySession = (b.t == null || b.t === '') && req.session?.role === 'customer' && req.customer;
      if (bySession) {
        const bad = csrfProblem(req);
        if (bad) { res.status(403).json({ ok: false, error: bad }); return null; }
      }
      const o = bySession
        ? await (deps.orderForCustomer || orderForCustomer)(b.ref, req.customer.id)
        : await (deps.orderByRefAndToken || orderByRefAndToken)(b.ref, b.t);
      if (!o) { res.status(404).json({ ok: false, error: 'We could not find your order.' }); return null; }
      return { ...b, id: o.id };
    }
    if (typeof b.ref !== 'string' || !ID_RE.test(b.ref)) { res.status(400).json({ ok: false, error: 'Bad request.' }); return null; }
    return { ...b, id: b.ref };
  };
  /** PayPal failures: the visitor sees a calm message; the log gets PayPal's debug id (never credentials). */
  const fail = (res, err, what) => {
    if (err.expose) return res.status(err.status).json({ ok: false, error: err.message, code: err.code });
    if (err instanceof PayPalError) {
      console.error(`[pay] paypal ${what} failed: ${err.message} issue=${err.issue || '-'} debug_id=${err.debugId || '-'}`);
      return res.status(502).json({ ok: false, error: 'PayPal could not take the payment just now. Your request is saved; please try again or pay later.' });
    }
    throw err;
  };

  router.get('/config', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ paypal: config.enabled ? { enabled: true, env: config.env, clientId: config.clientId, currency: CURRENCY } : { enabled: false } });
  });

  router.get('/status', requirePerm('website'), (req, res) => {
    const mask = (s) => (s ? `${s.slice(0, 4)}…${s.slice(-4)}` : '');
    const origin = PUBLIC_ORIGINS[0] || `${req.protocol}://${req.get('host')}`;
    res.json({
      paypal: {
        enabled: config.enabled, env: config.env, currency: CURRENCY,
        clientId: mask(config.clientId), secretSet: Boolean(config.secret), webhookIdSet: Boolean(config.webhookId),
        webhookUrl: `${origin}/api/pay/paypal/webhook`,
        dashboard: config.env === 'live' ? 'https://www.paypal.com/activities' : 'https://www.sandbox.paypal.com/activities',
        problems: config.problems,
      },
    });
  });

  router.post('/paypal/order', json, wrap(async (req, res) => {
    const b = await guard(startLimit, req, res);
    if (!b) return;
    try { res.status(201).json({ ok: true, ...(await checkout.start(b.id, { card: b.source === 'card' })) }); } catch (err) { fail(res, err, 'create order'); }
  }));

  router.post('/paypal/capture', json, wrap(async (req, res) => {
    const b = await guard(captureLimit, req, res);
    if (!b) return;
    if (typeof b.orderID !== 'string' || !PAYPAL_ORDER_ID_RE.test(b.orderID)) return res.status(400).json({ ok: false, error: 'Bad request.' });
    try { res.json({ ...(await checkout.capture(b.id, b.orderID)), ref: b.ref }); } catch (err) { fail(res, err, 'capture'); }
  }));

  router.post('/paypal/webhook', express.text({ type: 'application/json', limit: '64kb' }), wrap(async (req, res) => {
    if (limited(hookLimit, req, res)) return;
    if (!checkout) return res.status(404).json({ error: 'Not found.' });
    if (typeof req.body !== 'string' || !req.body) return res.status(400).json({ error: 'Bad request.' });
    try {
      const out = await checkout.webhook(req.body, req.headers);
      res.status(out.status).json(out.body);
    } catch (err) {
      // 500 makes PayPal retry later (it does for up to three days)
      if (err instanceof PayPalError) console.error(`[pay] webhook: ${err.message} debug_id=${err.debugId || '-'}`);
      else console.error('[pay] webhook failed', err?.message);
      res.status(500).json({ error: 'Try again later.' });
    }
  }));

  /**
   * App middleware (after securityHeaders): on the website's home, the /pay/ page and the studio (the customer's
   * dashboard pays in place), let the PayPal SDK load and open its popup.
   */
  const pageHeaders = (req, res, next) => {
    if (config.enabled && (req.method === 'GET' || req.method === 'HEAD') && (req.path === '/' || req.path === '/index.html' || /^\/(?:pay|studio)(?:\/|$)/.test(req.path))) {
      const csp = res.getHeader('Content-Security-Policy');
      if (typeof csp === 'string') res.setHeader('Content-Security-Policy', withPayPalCsp(csp));
      // PayPal's checkout window talks back to the page that opened it (PayPal recommends this value)
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    }
    next();
  };

  return { router, pageHeaders, config, checkout };
}

export const payments = createPayments();
if (payments.config.enabled) console.info(`[pay] PayPal on (${payments.config.env})`);
