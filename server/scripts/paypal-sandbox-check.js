// End-to-end PayPal SANDBOX check (refuses to run against live). Needs PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET
// of a sandbox app (server/.env or the environment). See docs/PAYMENTS.md.
//
//   node scripts/paypal-sandbox-check.js
//       Direct: token -> create a USD 1.00 order -> you approve it in the browser with the sandbox PERSONAL
//       account -> capture -> verify amount, currency and status. Also checks the webhook (if PAYPAL_WEBHOOK_ID).
//   node scripts/paypal-sandbox-check.js --site https://nimtto.com --plan premium
//       Through the website's own API: POST /api/orders -> /api/pay/paypal/order -> approve -> /api/pay/paypal/capture.
//       The server must run with the sandbox keys, and the plan must have a USD price (Website module).
//       Afterwards the request shows as Paid in the studio's Orders.
import '../lib/env.js'; // loads server/.env
import { readConfig, createClient } from '../lib/payments/paypal.js';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const site = opt('--site');
const planId = opt('--plan') || 'premium';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log('[paypal-check]', ...a);
const die = (msg) => { console.error(`[paypal-check] FAILED: ${msg}`); process.exit(1); };

const cfg = readConfig();
if (cfg.env !== 'sandbox') die('PAYPAL_ENV is live. This script only runs against the sandbox.');
if (!cfg.clientId || !cfg.secret) die('Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (sandbox app) first.');
const client = createClient(cfg);

async function waitForApproval(id) {
  say(`Open this link, log in with your sandbox PERSONAL account and press "Pay" / "Complete purchase":`);
  say(`  https://www.sandbox.paypal.com/checkoutnow?token=${id}`);
  say('Waiting for approval (up to 10 minutes)…');
  for (let i = 0; i < 200; i++) {
    const o = await client.getOrder(id);
    if (o.status === 'APPROVED' || o.status === 'COMPLETED') return o.status;
    if (o.status === 'VOIDED') die('The order was voided.');
    await sleep(3000);
  }
  return die('Timed out waiting for approval.');
}

async function checkWebhook() {
  if (!cfg.webhookId) { say('PAYPAL_WEBHOOK_ID not set: webhook not checked (the site keeps payments off without it).'); return; }
  const list = await client.request('GET', '/v1/notifications/webhooks');
  const hook = (list?.webhooks || []).find((w) => w.id === cfg.webhookId);
  if (!hook) die(`No webhook with id ${cfg.webhookId} in this sandbox app.`);
  const names = new Set((hook.event_types || []).map((e) => e.name));
  const want = ['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.DENIED', 'PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED', 'PAYMENT.CAPTURE.PENDING', 'CHECKOUT.ORDER.APPROVED'];
  const missing = names.has('*') ? [] : want.filter((n) => !names.has(n));
  say(`Webhook ${hook.id} -> ${hook.url}`);
  if (!/\/api\/pay\/paypal\/webhook$/.test(hook.url)) say('  WARNING: the URL should end with /api/pay/paypal/webhook');
  say(missing.length ? `  WARNING: not subscribed to ${missing.join(', ')}` : '  events: ok');
}

async function direct() {
  await client.accessToken();
  say('OAuth token: ok');
  const ref = `check${Date.now().toString(36)}`.slice(0, 12);
  const created = await client.createOrder({ ref, amount: '1.00', currency: 'USD', description: 'Nimtto sandbox check', requestId: `check-${ref}` });
  say(`Order created: ${created.id}`);
  await waitForApproval(created.id);
  const out = await client.captureOrder(created.id, `check-capture-${created.id}`);
  const cap = out.purchase_units?.[0]?.payments?.captures?.[0];
  if (out.status !== 'COMPLETED' || cap?.status !== 'COMPLETED') die(`capture status ${out.status}/${cap?.status}`);
  if (cap.amount?.currency_code !== 'USD' || cap.amount?.value !== '1.00') die(`captured ${cap.amount?.value} ${cap.amount?.currency_code}, expected 1.00 USD`);
  say(`Captured: ${cap.id} 1.00 USD, payer ${out.payer?.email_address || '?'}`);
  const again = await client.captureOrder(created.id, `check-capture-${created.id}`);
  say(`Repeat capture with the same request id returned the same capture: ${again.purchase_units?.[0]?.payments?.captures?.[0]?.id === cap.id ? 'yes' : 'NO'}`);
}

async function viaSite() {
  const origin = new URL(site).origin;
  const post = async (path, body) => {
    const r = await fetch(`${origin}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, Accept: 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) die(`${path} -> ${r.status} ${data.error || ''}`);
    return data;
  };
  const conf = await (await fetch(`${origin}/api/pay/config`)).json();
  if (!conf.paypal?.enabled) die(`${origin} says PayPal is off. Set the four PAYPAL_* values there and redeploy.`);
  if (conf.paypal.env !== 'sandbox') die(`${origin} runs PayPal in ${conf.paypal.env} mode; this check is for the sandbox.`);
  const req = await post('/api/orders', { kind: 'order', name: 'Sandbox Check', phone: '9800000000', plan: planId, message: 'PayPal sandbox check (safe to delete)', website: '' });
  if (!req.ref) die('/api/orders returned no ref (is the server up to date?)');
  say(`Request created: ${req.ref}`);
  const pp = await post('/api/pay/paypal/order', { ref: req.ref, website: '' });
  say(`PayPal order ${pp.id} for ${pp.amount} ${pp.currency}`);
  await waitForApproval(pp.id);
  const done = await post('/api/pay/paypal/capture', { ref: req.ref, orderID: pp.id, website: '' });
  if (done.status !== 'paid') die(`status ${done.status}`);
  say(`Paid: capture ${done.captureId}, ${done.amount} ${done.currency}. Check Orders in the studio for the Paid badge.`);
}

try {
  await (site ? viaSite() : direct());
  await checkWebhook();
  say('All good.');
} catch (err) {
  die(`${err.message}${err.debugId ? ` (debug_id ${err.debugId})` : ''}`);
}
