// Paying for a website request with PayPal. The request (lib/orders.js) exists first; its id is the reference.
// The price always comes from site.json (plans[].usdPrice), never from the browser. Every state change is recorded
// on the order as `payment` and is idempotent: a repeated capture, a replayed webhook or the capture and its webhook
// arriving together record the payment once.
//
// order.payment = { provider: 'paypal', env, status, plan, amount: '49.00', currency: 'USD', paypalOrderId,
//   captureId?, payerEmail?, payerName?, createdAt, paidAt?, refunded?: '10.00', refunds?: [refundId], refundedAt?,
//   problem?, events?: [webhook event ids], updatedAt }
// status: created (checkout opened) · pending (PayPal is holding the capture) · paid · partially_refunded · refunded
//         · denied · mismatch (PayPal reported an amount or currency we did not ask for; never treated as paid)
import { randomBytes } from 'node:crypto';
import { withLock } from '../store.js';
import { PayPalError, PAYPAL_ORDER_ID_RE } from './paypal.js';

export const CURRENCY = 'USD';
const SETTLED = new Set(['paid', 'partially_refunded', 'refunded']);
const MAX_EVENTS = 40;

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });

/** '49.00' → 4900; anything else → NaN. */
export function toCents(v) {
  const s = typeof v === 'number' ? v.toFixed(2) : String(v ?? '');
  const m = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(s);
  return m ? Number(m[1]) * 100 + Number((m[2] || '0').padEnd(2, '0')) : NaN;
}
const fromCents = (c) => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;

/**
 * deps: { client (paypal.js), config, getOrder, findOrder, mutateOrder (lib/orders.js), readSite (lib/site.js), now? }
 */
export function createCheckout({ client, config, getOrder, findOrder, mutateOrder, readSite, now = () => new Date() }) {
  const stamp = () => now().toISOString();
  const lock = (ref, fn) => withLock(`pay:${ref}`, fn);

  /** The plan and its online price for a request, or an error the visitor can read. */
  async function priceFor(order) {
    if (order.kind !== 'order' || !order.plan) throw httpError(400, 'This request has no plan to pay for. We will call you about the price.');
    const plan = (await readSite()).plans.find((p) => p.id === order.plan);
    const cents = plan ? toCents(plan.usdPrice) : NaN;
    if (!plan || !Number.isFinite(cents) || cents < 100) throw httpError(400, 'This plan cannot be paid online. We will call you about the price.');
    return { plan, amount: fromCents(cents) };
  }

  /** POST /api/pay/paypal/order: a PayPal order for the request `ref`, priced from site.json. */
  async function start(ref) {
    return lock(ref, async () => {
      const order = await getOrder(ref);
      if (!order) throw httpError(404, 'We could not find your request. Please send the form again.');
      const p = order.payment;
      if (p && (SETTLED.has(p.status) || p.status === 'pending')) throw httpError(409, 'This request is already paid.', { code: 'already_paid' });
      if (p?.status === 'mismatch') throw httpError(409, 'We are checking a payment for this request. We will call you.');
      const { plan, amount } = await priceFor(order);
      const created = await client.createOrder({
        ref, amount, currency: CURRENCY, description: `Nimtto invitation website, ${plan.name} plan`,
        requestId: `nimtto-${ref}-${randomBytes(6).toString('hex')}`,
      });
      if (!created || !PAYPAL_ORDER_ID_RE.test(String(created.id))) throw new PayPalError('PayPal returned no order id.', { status: 502 });
      await mutateOrder(ref, (o) => {
        o.payment = {
          provider: 'paypal', env: config.env, status: 'created', plan: plan.id, amount, currency: CURRENCY,
          paypalOrderId: created.id, createdAt: stamp(), updatedAt: stamp(), events: o.payment?.events || [],
        };
      });
      console.info(`[pay] paypal order created ref=${ref} paypal=${created.id} amount=${amount} ${CURRENCY}`);
      return { id: created.id, amount, currency: CURRENCY };
    });
  }

  /** Checks a capture against what we asked for. Returns the new payment fields. */
  function judgeCapture(p, ppOrder, ref) {
    const pu = Array.isArray(ppOrder?.purchase_units) ? ppOrder.purchase_units[0] : null;
    const cap = Array.isArray(pu?.payments?.captures) ? pu.payments.captures[0] : null;
    if (!cap || typeof cap.id !== 'string') throw new PayPalError('PayPal returned no capture.', { status: 502 });
    const refOk = pu.reference_id === ref || cap.custom_id === ref;
    const sameMoney = cap.amount?.currency_code === p.currency && toCents(cap.amount?.value) === toCents(p.amount);
    const payer = ppOrder.payer || {};
    const fields = {
      captureId: cap.id,
      payerEmail: typeof payer.email_address === 'string' ? payer.email_address.slice(0, 254) : undefined,
      payerName: [payer.name?.given_name, payer.name?.surname].filter((x) => typeof x === 'string').join(' ').slice(0, 120) || undefined,
    };
    if (!refOk || !sameMoney) {
      return { ...fields, status: 'mismatch', problem: `PayPal reported ${cap.amount?.value} ${cap.amount?.currency_code}${refOk ? '' : ' for another reference'}; expected ${p.amount} ${p.currency}.` };
    }
    if (ppOrder.status === 'COMPLETED' && cap.status === 'COMPLETED') return { ...fields, status: 'paid', paidAt: stamp() };
    if (cap.status === 'PENDING') return { ...fields, status: 'pending', problem: cap.status_details?.reason ? `PayPal is holding it: ${cap.status_details.reason}` : undefined };
    if (cap.status === 'DECLINED' || cap.status === 'FAILED') return { ...fields, status: 'denied' };
    return { ...fields, status: 'mismatch', problem: `Unexpected PayPal status ${ppOrder.status}/${cap.status}.` };
  }

  /** POST /api/pay/paypal/capture: captures on the server, verifies, records. Safe to call twice. */
  async function capture(ref, paypalOrderId) {
    return lock(ref, async () => {
      const order = await getOrder(ref);
      if (!order) throw httpError(404, 'We could not find your request.');
      const p = order.payment;
      if (!p || p.provider !== 'paypal' || p.paypalOrderId !== paypalOrderId) throw httpError(400, 'This payment does not belong to your request. Please start again.');
      if (SETTLED.has(p.status) || p.status === 'pending') return view(ref, p, true);
      let result;
      try {
        result = await client.captureOrder(paypalOrderId, `nimtto-capture-${paypalOrderId}`);
      } catch (err) {
        if (!(err instanceof PayPalError)) throw err;
        if (err.issue === 'ORDER_ALREADY_CAPTURED') result = await client.getOrder(paypalOrderId);
        else if (err.issue === 'INSTRUMENT_DECLINED' || err.issue === 'PAYER_ACTION_REQUIRED') {
          throw httpError(402, 'Your bank or PayPal declined this card. Please choose another way to pay.', { code: 'retry' });
        } else if (err.issue === 'ORDER_NOT_APPROVED') throw httpError(409, 'The payment was not approved in PayPal yet.', { code: 'retry' });
        else throw err;
      }
      const next = judgeCapture(p, result, ref);
      const saved = await mutateOrder(ref, (o) => {
        if (o.payment?.paypalOrderId !== paypalOrderId) return false; // a newer checkout replaced it meanwhile
        if (SETTLED.has(o.payment.status)) return false; // the webhook got there first
        Object.assign(o.payment, clean(next), { updatedAt: stamp() });
      });
      const pay = saved.payment;
      console.info(`[pay] paypal capture ref=${ref} paypal=${paypalOrderId} status=${pay.status}`);
      if (pay.status === 'mismatch') throw httpError(409, 'PayPal reported a different amount. We have stopped this payment; we will call you.');
      if (pay.status === 'denied') throw httpError(402, 'PayPal declined the payment. Please choose another way to pay.', { code: 'retry' });
      return view(ref, pay, false);
    });
  }

  const view = (ref, p, repeat) => ({ ok: true, ref, status: p.status, amount: p.amount, currency: p.currency, captureId: p.captureId || null, repeat });
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  const remember = (p, eventId) => { p.events = [...(p.events || []), eventId].slice(-MAX_EVENTS); };

  /** The order a capture or refund belongs to: custom_id first, else our stored PayPal ids. */
  async function orderFor({ ref, captureId, paypalOrderId }) {
    if (ref) { const o = await getOrder(ref); if (o?.payment?.provider === 'paypal') return o; }
    if (captureId) { const o = await findOrder((x) => x.payment?.captureId === captureId); if (o) return o; }
    if (paypalOrderId) return findOrder((x) => x.payment?.paypalOrderId === paypalOrderId);
    return null;
  }
  const upLink = (links, re) => (Array.isArray(links) ? links : []).map((l) => re.exec(String(l?.href || ''))?.[1]).find(Boolean) || null;

  /**
   * POST /api/pay/paypal/webhook. Verifies the signature with PayPal, then applies the event once.
   * Returns { status, body } for the route.
   */
  async function webhook(rawBody, headers) {
    let event;
    try { event = JSON.parse(rawBody); } catch { return { status: 400, body: { error: 'Bad request.' } }; }
    if (!event || typeof event !== 'object' || typeof event.id !== 'string' || !/^[A-Za-z0-9-]{3,128}$/.test(event.id)
      || typeof event.event_type !== 'string' || !event.resource || typeof event.resource !== 'object') {
      return { status: 400, body: { error: 'Bad request.' } };
    }
    const verified = await client.verifyWebhook({ headers, rawBody, webhookId: config.webhookId });
    if (!verified) {
      console.warn(`[pay] webhook signature rejected event=${event.id}`);
      return { status: 400, body: { error: 'Signature not verified.' } };
    }
    const type = event.event_type;
    const r = event.resource;
    const str = (v, re) => (typeof v === 'string' && re.test(v) ? v : null);
    const idRe = /^[A-Za-z0-9_-]{6,64}$/;

    if (type === 'CHECKOUT.ORDER.APPROVED') {
      // The buyer approved but the page never asked us to capture (closed tab, lost connection): finish it here.
      const ppId = str(r.id, PAYPAL_ORDER_ID_RE);
      const pu = Array.isArray(r.purchase_units) ? r.purchase_units[0] : null;
      const o = await orderFor({ ref: str(pu?.custom_id, idRe) || str(pu?.reference_id, idRe), paypalOrderId: ppId });
      if (!o || o.payment.paypalOrderId !== ppId || o.payment.status !== 'created') return ok(type, 'nothing to do');
      try { await capture(o.id, ppId); } catch (err) { if (!err.expose) throw err; }
      return ok(type, 'captured');
    }

    const isCapture = type.startsWith('PAYMENT.CAPTURE.');
    if (!isCapture) return ok(type, 'ignored');
    const refund = type === 'PAYMENT.CAPTURE.REFUNDED' || type === 'PAYMENT.CAPTURE.REVERSED';
    // capture events carry the capture; refund events carry the refund, whose "up" link is the capture
    const captureId = refund
      ? (upLink(r.links, /\/v2\/payments\/captures\/([A-Za-z0-9]+)$/) || (r.status === 'REFUNDED' || r.status === 'PARTIALLY_REFUNDED' ? str(r.id, idRe) : null))
      : str(r.id, idRe);
    const found = await orderFor({
      ref: str(r.custom_id, idRe), captureId,
      paypalOrderId: str(r.supplementary_data?.related_ids?.order_id, PAYPAL_ORDER_ID_RE),
    });
    if (!found) { console.warn(`[pay] webhook ${type} event=${event.id}: no matching request`); return ok(type, 'no matching request'); }

    let outcome = 'applied';
    await lock(found.id, () => mutateOrder(found.id, (o) => {
      const p = o.payment;
      if (!p || p.provider !== 'paypal') { outcome = 'no payment'; return false; }
      if ((p.events || []).includes(event.id)) { outcome = 'duplicate'; return false; }
      if (p.captureId && captureId && p.captureId !== captureId && !refund) { outcome = 'other capture'; return false; }
      remember(p, event.id);
      p.updatedAt = stamp();
      if (type === 'PAYMENT.CAPTURE.COMPLETED') {
        if (SETTLED.has(p.status)) { outcome = 'already settled'; return; } // a late or replayed event never undoes a refund
        const sameMoney = r.amount?.currency_code === p.currency && toCents(r.amount?.value) === toCents(p.amount);
        p.captureId = captureId;
        if (!sameMoney || r.status !== 'COMPLETED') {
          p.status = 'mismatch';
          p.problem = `PayPal reported ${r.amount?.value} ${r.amount?.currency_code} (${r.status}); expected ${p.amount} ${p.currency}.`;
          return;
        }
        p.status = 'paid';
        p.paidAt = p.paidAt || stamp();
        delete p.problem;
      } else if (type === 'PAYMENT.CAPTURE.PENDING') {
        if (p.status === 'created') { p.status = 'pending'; p.captureId = captureId; } else outcome = 'kept';
      } else if (type === 'PAYMENT.CAPTURE.DENIED' || type === 'PAYMENT.CAPTURE.DECLINED') {
        if (SETTLED.has(p.status)) { outcome = 'kept'; return; }
        p.status = 'denied';
        p.captureId = captureId || p.captureId;
      } else if (refund) {
        const refundId = str(r.id, idRe);
        if (refundId && (p.refunds || []).includes(refundId)) { outcome = 'duplicate refund'; return; }
        const cents = toCents(r.amount?.value);
        const total = toCents(p.refunded || '0') + (Number.isFinite(cents) && r.amount?.currency_code === p.currency ? cents : toCents(p.amount));
        p.refunds = [...(p.refunds || []), refundId].filter(Boolean).slice(-20);
        p.refunded = fromCents(Math.min(total, toCents(p.amount)));
        p.status = total >= toCents(p.amount) ? 'refunded' : 'partially_refunded';
        p.refundedAt = stamp();
        if (type === 'PAYMENT.CAPTURE.REVERSED') p.problem = 'Reversed by PayPal (a dispute or chargeback).';
      } else {
        outcome = 'ignored';
      }
    }));
    console.info(`[pay] webhook ${type} event=${event.id} ref=${found.id} ${outcome}`);
    return ok(type, outcome);
  }
  const ok = (type, outcome) => ({ status: 200, body: { ok: true, outcome } });

  return { start, capture, webhook };
}
