// The planner's money tools, all under /api/admin/finance (docs/API.md "Finance", docs/PAYMENTS.md "Earnings"):
//   GET  /summary?market                  earnings (NPR and USD apart), pending money, free access; byMarket totals
//   GET  /transactions?type&currency&month&q&market&page&per
//   GET  /transactions.csv?from&to&type&currency&market
//   POST /orders/:id/comp                 { plan, reason }        free access on an order
//   POST /orders/:id/uncomp               { note? }               undo free access (back to awaiting payment)
//   POST /orders/:id/refunds              { of?, amount, reason, date?, through: 'paypal'|'record' }
//   POST /orders/:id/refunds/:rid/void    { reason? }             remove a refund recorded by mistake
//   POST /customers/:id/comp              { plan, reason, theme? } a new order with free access for an account
// Every route is the planner's (requireAdmin: the session, and the CSRF token on writes). Earnings are computed
// from the orders on every request by lib/finance.js; nothing here keeps a second copy of any amount.
import express from 'express';
import { requireAdmin } from './auth.js';
import { allOrders, getOrder, mutateOrder, adminView, addAdminOrder, recordRefund, historyAdd, amountOf, clean, ID_RE } from './orders.js';
import { readSite, tierProblem } from './site.js';
import { listThemes, isTheme } from './catalog.js';
import { getCustomer, CUSTOMER_ID_RE } from './accounts.js';
import { activate } from './activation.js';
import { csvCell } from './rsvp.js';
import { earnings, ledger, filterEntries, refundable, manualReceipt, paypalReceipt, dayKey, minor, CURRENCIES } from './finance.js';
import { PayPalError } from './payments/paypal.js';
import { isMarket, orderMarket } from './market.js';

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const RID_RE = /^[A-Za-z0-9_-]{6,20}$/;
const TYPES = ['payment', 'refund', 'comp'];
const today = () => dayKey(new Date().toISOString());
const realDay = (s) => {
  const m = typeof s === 'string' ? DAY_RE.exec(s) : null;
  return Boolean(m && +m[1] >= 2000 && +m[1] <= 2100 && new Date(Date.UTC(+m[1], m[2] - 1, +m[3])).toISOString().slice(0, 10) === s);
};
const isAmount = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 10_000_000 && Number.isFinite(minor(v));
const bodyOf = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {});
const orderId = (req) => { if (!ID_RE.test(req.params.id || '')) throw httpError(404, 'Request not found.'); return req.params.id; };
/** ?market=np|intl ('' = both); anything else is a 400. */
const marketQuery = (q) => {
  if (q.market === undefined || q.market === '') return '';
  if (!isMarket(q.market)) throw httpError(400, "market must be 'np' or 'intl'.");
  return q.market;
};

/** { plan, reason } of a free-access request, checked against the site's plans. */
async function compInput(b) {
  const fields = [];
  const site = await readSite();
  const plan = typeof b.plan === 'string' ? site.plans.find((p) => p.id === b.plan) : null;
  if (!plan) fields.push('plan');
  const reason = typeof b.reason === 'string' ? clean(b.reason, 301) : '';
  if (reason.length < 2 || reason.length > 300) fields.push('reason');
  if (fields.length) throw httpError(400, fields.includes('reason') && !fields.includes('plan') ? 'Say why you are giving free access (for example: friend, promotion, replacement).' : 'Choose a plan and say why.', { errors: fields.map((f) => ({ path: f, message: 'is required' })) });
  return { site, plan, reason };
}
const themeName = (slug) => listThemes().find((t) => t.slug === slug)?.name || slug;
const compOf = (plan, reason, value) => ({ at: new Date().toISOString(), plan: plan.id, planName: plan.name, reason, value, by: 'admin' });

/** The router, mounted at /api/admin/finance. checkout: lib/payments/checkout.js (null when PayPal is off). */
export function financeRouter({ checkout = null, paypal = { enabled: false, env: '' } } = {}) {
  const r = express.Router();
  const json = express.json({ limit: '4kb', strict: true, type: 'application/json' });
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  r.use(requireAdmin);
  r.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });

  r.get('/summary', wrap(async (req, res) => {
    const market = marketQuery(req.query);
    const all = await allOrders();
    const mine = market ? all.filter((o) => orderMarket(o) === market) : all;
    // byMarket always covers every order, so the page can show both markets side by side under any filter
    res.json({ ...earnings(mine), byMarket: earnings(all).byMarket, market, paypal: { enabled: Boolean(paypal.enabled), env: paypal.env || '' } });
  }));

  r.get('/transactions', wrap(async (req, res) => {
    const q = req.query;
    if (q.type !== undefined && q.type !== '' && !TYPES.includes(q.type)) throw httpError(400, `type must be one of ${TYPES.join(', ')}.`);
    if (q.currency !== undefined && q.currency !== '' && !CURRENCIES.includes(q.currency)) throw httpError(400, 'currency must be NPR or USD.');
    if (q.month !== undefined && q.month !== '' && !MONTH_RE.test(String(q.month))) throw httpError(400, 'month must look like 2026-10.');
    const per = Math.min(200, Math.max(10, Number.parseInt(q.per, 10) || 50));
    const page = Math.min(10_000, Math.max(1, Number.parseInt(q.page, 10) || 1));
    const all = ledger(await allOrders());
    const list = filterEntries(all, { type: q.type || '', currency: q.currency || '', month: q.month || '', q: typeof q.q === 'string' ? q.q.slice(0, 80) : '', market: marketQuery(q) });
    res.json({ items: list.slice((page - 1) * per, page * per), total: list.length, page, per, months: [...new Set(all.map((e) => e.month).filter(Boolean))].sort().reverse() });
  }));

  r.get('/transactions.csv', wrap(async (req, res) => {
    const { from, to } = req.query;
    if (!realDay(from) || !realDay(to) || from > to) throw httpError(400, 'Choose a start and an end date (the start first).');
    const type = TYPES.includes(req.query.type) ? req.query.type : '';
    const currency = CURRENCIES.includes(req.query.currency) ? req.query.currency : '';
    const rows = filterEntries(ledger(await allOrders()), { from, to, type, currency, market: marketQuery(req.query) }).reverse(); // oldest first
    const header = ['Date', 'Type', 'Counted', 'Order', 'Customer', 'Email', 'Plan', 'Method', 'Currency', 'Amount', 'Signed amount', 'Free access value NPR', 'Free access value USD', 'Reason or note', 'PayPal id', 'Test money', 'Market'];
    const num = (n) => (n == null ? '' : String(n)); // our own numbers: never a formula
    const lines = rows.map((e) => [
      csvCell(e.day), csvCell(e.type === 'comp' ? 'free access' : e.type), e.counted ? 'yes' : 'no', csvCell(e.ref || ''), csvCell(e.name), csvCell(e.email), csvCell(e.plan),
      csvCell(e.method), csvCell(e.currency || ''), num(e.amount), e.amount == null ? '' : num(e.type === 'refund' ? -e.amount : e.amount),
      num(e.value?.npr), num(e.value?.usd), csvCell(e.voided ? `removed: ${e.reason}` : e.reason || e.note || ''), csvCell(e.paypalId || ''), e.test ? 'yes' : 'no', e.market === 'intl' ? 'International' : 'Nepal',
    ].join(','));
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="nimtto-transactions-${from}-to-${to}.csv"`);
    console.info(`[admin] finance csv ${from}..${to} rows=${rows.length}`);
    res.send(`﻿${[header.map(csvCell).join(','), ...lines].join('\r\n')}\r\n`);
  }));

  // ── Free access ─────────────────────────────────────────────────────────

  r.post('/orders/:id/comp', json, wrap(async (req, res) => {
    const id = orderId(req);
    const { site, plan, reason } = await compInput(bodyOf(req));
    const order = await mutateOrder(id, (o) => {
      if (o.pay?.status === 'comped') throw httpError(409, 'This order already has free access.');
      if (manualReceipt(o) || paypalReceipt(o)) throw httpError(409, 'This order is paid. Record a refund instead of giving free access.');
      if (o.payment?.status === 'pending') throw httpError(409, 'PayPal is still holding a payment for this order. Wait until it is settled.');
      if (o.theme) { const tp = tierProblem(site, plan, o.theme, themeName(o.theme)); if (tp) throw httpError(400, tp.error, { errors: [{ path: 'plan', message: tp.error }] }); }
      if (o.plan !== plan.id) Object.assign(o, { plan: plan.id, planName: plan.name, planFrom: plan.from === true, amount: amountOf(plan) });
      const pay = o.pay || (o.pay = { status: 'awaiting_payment', reason: null, proofs: [], history: [] });
      pay.status = 'comped';
      pay.reason = null;
      delete pay.received;
      pay.comp = compOf(plan, reason, { npr: o.amount?.npr ?? null, usd: o.amount?.usd ?? null });
      historyAdd(pay, 'comped', 'admin', `free access (${plan.name}): ${reason}`);
    });
    activate(order.id, 'free'); // the plan switches on: invitation made or designs widened (lib/activation.js)
    console.info(`[admin] free access order=${order.ref || id} plan=${plan.id}`);
    res.json({ order: adminView(order) });
  }));

  r.post('/orders/:id/uncomp', json, wrap(async (req, res) => {
    const id = orderId(req);
    const b = bodyOf(req);
    if (b.note != null && (typeof b.note !== 'string' || b.note.length > 300)) throw httpError(400, 'note must be text of at most 300 characters.');
    const note = clean(b.note, 300);
    const order = await mutateOrder(id, (o) => {
      const pay = o.pay;
      if (pay?.status !== 'comped') throw httpError(409, 'This order does not have free access.');
      pay.compUndone = [...(pay.compUndone || []), { ...pay.comp, undoneAt: new Date().toISOString(), ...(note ? { note } : {}) }].slice(-10);
      delete pay.comp;
      pay.status = 'awaiting_payment';
      historyAdd(pay, 'awaiting_payment', 'admin', `free access undone${note ? `: ${note}` : ''}`);
    });
    console.info(`[admin] free access undone order=${order.ref || id}`);
    res.json({ order: adminView(order) });
  }));

  r.post('/customers/:id/comp', json, wrap(async (req, res) => {
    const c = CUSTOMER_ID_RE.test(req.params.id || '') ? getCustomer(req.params.id) : null;
    if (!c) throw httpError(404, 'No account with that id.');
    const b = bodyOf(req);
    const { site, plan, reason } = await compInput(b);
    let theme = '';
    if (b.theme != null && b.theme !== '') {
      if (!isTheme(b.theme)) throw httpError(400, 'No such design.', { errors: [{ path: 'theme', message: 'is not a design' }] });
      const tp = tierProblem(site, plan, b.theme, themeName(b.theme));
      if (tp) throw httpError(400, tp.error, { errors: [{ path: 'plan', message: tp.error }] });
      theme = b.theme;
    }
    const amount = amountOf(plan);
    const comp = compOf(plan, reason, { ...amount });
    const order = await addAdminOrder({
      kind: 'order', source: 'admin', name: clean(c.name, 80) || c.email.split('@')[0], phone: c.phone || '', email: c.email, customerId: c.id,
      ...(theme ? { theme } : {}), plan: plan.id, planName: plan.name, planFrom: plan.from === true, amount,
      pay: { status: 'comped', reason: null, proofs: [], comp, history: [{ at: comp.at, status: 'comped', by: 'admin', note: `free access (${plan.name}): ${reason}` }] },
    });
    console.info(`[admin] free access for customer ${c.id}: order=${order.ref} plan=${plan.id}`);
    res.status(201).json({ order: adminView(order) });
  }));

  // ── Refunds ─────────────────────────────────────────────────────────────

  r.post('/orders/:id/refunds', json, wrap(async (req, res) => {
    const id = orderId(req);
    const b = bodyOf(req);
    const fields = [];
    if (!isAmount(b.amount)) fields.push('amount');
    const reason = typeof b.reason === 'string' ? clean(b.reason, 301) : '';
    if (reason.length < 2 || reason.length > 300) fields.push('reason');
    const date = b.date == null || b.date === '' ? today() : b.date;
    if (!realDay(date) || date > today()) fields.push('date');
    if (b.of != null && b.of !== 'manual' && b.of !== 'paypal') fields.push('of');
    if (b.through != null && b.through !== 'paypal' && b.through !== 'record') fields.push('through');
    if (fields.length) {
      const msg = fields[0] === 'amount' ? 'Enter the amount to refund (more than 0, at most 2 decimals).' : fields[0] === 'reason' ? 'Say why you are refunding.' : fields[0] === 'date' ? 'The refund date must be a real day, not in the future.' : 'Bad request.';
      throw httpError(400, msg, { errors: fields.map((f) => ({ path: f, message: 'is not valid' })) });
    }
    const o0 = await getOrder(id);
    if (!o0) throw httpError(404, 'Request not found.');
    const options = refundable(o0);
    if (!options.length) throw httpError(409, 'This order has no payment to refund.');
    const of = b.of || (options.length === 1 ? options[0].of : null);
    if (!of || !options.some((x) => x.of === of)) throw httpError(400, 'Choose which payment to refund.');

    if (b.through === 'paypal') {
      if (of !== 'paypal') throw httpError(400, 'Only a PayPal payment can be refunded through PayPal.');
      if (!checkout) throw httpError(409, 'PayPal is not set up on this server, so it cannot send the refund.');
      try {
        const out = await checkout.refund(id, { amount: b.amount.toFixed(2), reason });
        return res.status(201).json({ order: adminView(out.order), refund: { id: out.refundId, status: out.status, repeat: out.repeat } });
      } catch (err) {
        if (err.expose || !(err instanceof PayPalError)) throw err;
        console.error(`[finance] paypal refund failed order=${o0.ref || id}: ${err.message} issue=${err.issue || '-'} debug_id=${err.debugId || '-'}`);
        throw httpError(502, `PayPal did not make the refund${err.issue ? ` (${err.issue})` : ''}. Nothing was recorded. Try again, or refund in PayPal itself.`);
      }
    }

    // recorded only: the planner sends the money back themselves
    if (of === 'paypal' && checkout) throw httpError(409, 'Refund PayPal payments through PayPal, so the record matches PayPal.');
    const order = await mutateOrder(id, (o) => {
      const opt = refundable(o).find((x) => x.of === of);
      if (!opt) throw httpError(409, 'This order has no payment to refund.');
      if (minor(b.amount) > minor(opt.left)) throw httpError(400, opt.left > 0 ? `At most ${opt.currency} ${opt.left} can still be refunded.` : 'This payment is already fully refunded.', { errors: [{ path: 'amount', message: 'is more than what is left' }] });
      const paidDay = dayKey((of === 'paypal' ? paypalReceipt(o) : manualReceipt(o))?.at || o.at);
      if (date < paidDay) throw httpError(400, 'The refund date cannot be before the payment.', { errors: [{ path: 'date', message: 'is before the payment' }] });
      recordRefund(o, { of, amount: b.amount, currency: opt.currency, date, reason });
    });
    console.info(`[admin] refund recorded order=${order.ref || id} ${b.amount} (${of})`);
    res.status(201).json({ order: adminView(order) });
  }));

  r.post('/orders/:id/refunds/:rid/void', json, wrap(async (req, res) => {
    const id = orderId(req);
    if (!RID_RE.test(req.params.rid || '')) throw httpError(404, 'No such refund.');
    const b = bodyOf(req);
    if (b.reason != null && (typeof b.reason !== 'string' || b.reason.length > 300)) throw httpError(400, 'reason must be text of at most 300 characters.');
    const order = await mutateOrder(id, (o) => {
      const rf = (o.refunds || []).find((x) => x.id === req.params.rid);
      if (!rf) throw httpError(404, 'No such refund.');
      if (rf.voidedAt) throw httpError(409, 'This refund was already removed.');
      if (rf.via !== 'record' || rf.of !== 'manual') throw httpError(409, 'Only a refund you recorded by hand can be removed. A PayPal refund cannot be undone here.');
      rf.voidedAt = new Date().toISOString();
      rf.voidReason = clean(b.reason, 300) || 'recorded by mistake';
      const pay = o.pay;
      if (pay?.status === 'refunded') { pay.status = 'confirmed'; delete pay.refundedAt; }
      if (pay) historyAdd(pay, pay.status, 'admin', `refund of ${rf.currency} ${rf.amount} removed: ${rf.voidReason}`);
    });
    console.info(`[admin] refund removed order=${order.ref || id} refund=${req.params.rid}`);
    res.json({ order: adminView(order) });
  }));

  return r;
}
