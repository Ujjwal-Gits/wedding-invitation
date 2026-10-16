// Money actually received, computed from the order documents (docs/PAYMENTS.md "Earnings"). Pure functions: no
// store, no clock unless one is passed in, so every rule here is unit-tested (test/finance.test.js).
//
// What counts:
//   payment  a manual payment the planner confirmed (QR screenshot, or "mark paid by hand": cash, a transfer…), and
//            a completed PayPal capture. Sandbox (test money) PayPal payments are listed but never counted.
//   refund   order.refunds[] (recorded by hand, made through PayPal, or reported by PayPal's webhook), subtracted
//            in the month of the refund. Removed (voided) refunds and failed PayPal refunds do not count.
//   comp     free access (pay.status 'comped'): listed with its would-be value, NEVER counted.
// NPR and USD are always kept apart (no conversion). Amounts are added up in paisa/cents (integers).
//
// Older orders without the newer fields still work: a confirmed payment without pay.received is read from the
// order's price and its last screenshot's currency; a refund recorded before order.refunds existed (pay.status
// 'refunded', or PayPal's payment.refunded) becomes one refund for what is missing.

export const TZ = 'Asia/Kathmandu';
export const CURRENCIES = ['NPR', 'USD'];
const PAYPAL_SETTLED = new Set(['paid', 'partially_refunded', 'refunded']);
const REFUND_DEAD = new Set(['FAILED', 'CANCELLED']);

/** 49 / 49.5 / '49.50' → 4950 (minor units); anything else (negative, 3 decimals, junk) → NaN. */
export function minor(v) {
  if (typeof v === 'number') {
    if (!Number.isFinite(v) || v < 0) return NaN;
    const m = Math.round(v * 100);
    return Math.abs(m - v * 100) < 1e-6 ? m : NaN;
  }
  const m = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(String(v ?? '').trim());
  return m ? Number(m[1]) * 100 + Number((m[2] || '0').padEnd(2, '0')) : NaN;
}
/** 4950 → 49.5 */
export const major = (m) => Math.round(m) / 100;
const sumMinor = (list) => list.reduce((a, x) => a + (Number.isFinite(minor(x.amount)) ? minor(x.amount) : 0), 0);

const fmtMonth = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' });
const fmtDay = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const validDate = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : d; };
/** '2026-10' for an ISO time, in Nepal time. */
export const monthKey = (iso) => { const d = validDate(iso); return d ? fmtMonth.format(d).slice(0, 7) : ''; };
/** '2026-10-17' for an ISO time, in Nepal time. */
export const dayKey = (iso) => { const d = validDate(iso); return d ? fmtDay.format(d).slice(0, 10) : ''; };
/** The month before '2026-01' is '2025-12'. */
export function prevMonth(key, n = 1) {
  let [y, m] = key.split('-').map(Number);
  m -= n;
  while (m < 1) { m += 12; y -= 1; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** The payment status the dashboards show (PayPal included). */
export function payStatusOf(o) {
  return o.pay?.status || (o.payment?.status === 'paid' || o.payment?.status === 'partially_refunded' ? 'confirmed' : o.payment?.status === 'refunded' ? 'refunded' : null);
}

/**
 * The manual payment the planner confirmed, or null: { amount, currency, label, at }. pay.via 'paypal' means the
 * confirmation came from PayPal (counted by paypalReceipt, never twice).
 */
export function manualReceipt(o) {
  const pay = o?.pay;
  if (!pay || !['confirmed', 'refunded'].includes(pay.status) || pay.via === 'paypal') return null;
  if (pay.received && CURRENCIES.includes(pay.received.currency)) return { ...pay.received };
  const last = (pay.proofs || []).at(-1);
  const byHand = pay.via === 'manual';
  const hasNpr = o.amount?.npr != null;
  const currency = (!byHand && last?.currency === 'USD') || (!hasNpr && o.amount?.usd != null) ? 'USD' : 'NPR';
  const amount = (currency === 'USD' ? o.amount?.usd : o.amount?.npr) ?? 0;
  const confirmed = [...(pay.history || [])].reverse().find((x) => x.status === 'confirmed')?.at;
  return {
    amount, currency, at: pay.confirmedAt || confirmed || o.at,
    label: byHand ? pay.manual?.method || 'Cash' : last?.methodLabel || last?.method || 'QR payment',
  };
}

/** A completed PayPal capture, or null: { amount, currency, label: 'PayPal', at, test, captureId }. */
export function paypalReceipt(o) {
  const p = o?.payment;
  if (!p || p.provider !== 'paypal' || !PAYPAL_SETTLED.has(p.status)) return null;
  return { amount: major(minor(p.amount) || 0), currency: p.currency || 'USD', label: 'PayPal', at: p.paidAt || p.updatedAt || o.at, test: p.env === 'sandbox', captureId: p.captureId || null };
}

const receiptOf = (o, source) => (source === 'paypal' ? paypalReceipt(o) : manualReceipt(o));
const isActive = (r) => !r.voidedAt && !REFUND_DEAD.has(r.status);

/**
 * Every refund of an order, oldest first: the stored records plus, for older orders, one "earlier refund" for what
 * the order says was refunded but no record explains.
 */
export function refundsOf(o) {
  const stored = (Array.isArray(o?.refunds) ? o.refunds : []).filter((r) => r && (r.of === 'manual' || r.of === 'paypal'));
  const out = [...stored];
  const mr = manualReceipt(o);
  if (mr && o.pay.status === 'refunded') {
    const gap = minor(mr.amount) - sumMinor(stored.filter((r) => r.of === 'manual' && isActive(r)));
    if (gap > 0) out.push({ id: 'earlier-manual', of: 'manual', via: 'record', amount: major(gap), currency: mr.currency, at: o.pay.refundedAt || mr.at, reason: o.pay.history?.findLast?.((x) => x.status === 'refunded')?.note || 'Marked refunded', legacy: true });
  }
  const pr = paypalReceipt(o);
  if (pr && o.payment.refunded) {
    const gap = minor(o.payment.refunded) - sumMinor(stored.filter((r) => r.of === 'paypal' && isActive(r)));
    if (gap > 0) out.push({ id: 'earlier-paypal', of: 'paypal', via: 'paypal', amount: major(gap), currency: pr.currency, at: o.payment.refundedAt || pr.at, reason: 'Refunded in PayPal', legacy: true });
  }
  return out;
}

/** What can still be refunded, per payment: [{ of, currency, label, paid, refunded, left, test }]. */
export function refundable(o) {
  const out = [];
  for (const source of ['manual', 'paypal']) {
    const rc = receiptOf(o, source);
    if (!rc) continue;
    const paid = minor(rc.amount) || 0;
    const done = sumMinor(refundsOf(o).filter((r) => r.of === source && isActive(r)));
    out.push({ of: source, currency: rc.currency, label: rc.label, paid: major(paid), refunded: major(done), left: major(Math.max(0, paid - done)), test: Boolean(rc.test) });
  }
  return out;
}

/** 'full' when every payment was refunded, 'partial' when some money went back, else null. */
export function refundState(o) {
  const r = refundable(o);
  if (!r.length || !r.some((x) => x.refunded > 0)) return null;
  return r.every((x) => x.left === 0) ? 'full' : 'partial';
}

/** The would-be value of free access, { npr, usd }. */
const compValue = (o) => ({ npr: o.pay?.comp?.value?.npr ?? o.amount?.npr ?? null, usd: o.pay?.comp?.value?.usd ?? o.amount?.usd ?? null });

/** The money lines of one order (payments, refunds, free access). */
export function entriesOf(o) {
  const base = { orderId: o.id, ref: o.ref || null, name: o.name || '', email: o.email || '', plan: o.planName || o.plan || '' };
  const out = [];
  const receipts = {};
  for (const source of ['manual', 'paypal']) {
    const rc = receiptOf(o, source);
    if (!rc) continue;
    receipts[source] = rc;
    out.push({
      ...base, id: `${o.id}.${source === 'paypal' ? 'p' : 'm'}`, type: 'payment', source, at: rc.at, day: dayKey(rc.at), month: monthKey(rc.at),
      amount: major(minor(rc.amount) || 0), currency: rc.currency, method: rc.label, test: Boolean(rc.test), counted: !rc.test,
      ...(source === 'paypal' ? { paypalId: rc.captureId } : { note: o.pay?.manual?.note || '' }),
    });
  }
  for (const r of refundsOf(o)) {
    const rc = receipts[r.of];
    if (!rc) continue; // a refund of a payment that no longer counts (the planner reopened it)
    const at = r.at || o.at;
    out.push({
      ...base, id: `${o.id}.r.${r.id}`, type: 'refund', source: r.of, at, day: r.date || dayKey(at), month: (r.date || dayKey(at)).slice(0, 7),
      amount: major(minor(r.amount) || 0), currency: r.currency || rc.currency, method: rc.label, via: r.via || 'record', reason: r.reason || '',
      test: Boolean(rc.test), voided: Boolean(r.voidedAt), status: r.status || null, paypalId: r.paypalRefundId || null, legacy: Boolean(r.legacy),
      refundId: r.id, counted: !rc.test && isActive(r),
    });
  }
  if (o.pay?.status === 'comped' && o.pay.comp) {
    const at = o.pay.comp.at || o.at;
    out.push({ ...base, id: `${o.id}.c`, type: 'comp', source: 'comp', at, day: dayKey(at), month: monthKey(at), amount: null, currency: null, value: compValue(o), method: 'Free access', reason: o.pay.comp.reason || '', counted: false });
  }
  return out;
}

/** Every money line of every order, newest first. */
export function ledger(orders) {
  return orders.flatMap(entriesOf).sort((a, b) => String(b.day).localeCompare(String(a.day)) || String(b.at).localeCompare(String(a.at)) || a.id.localeCompare(b.id));
}

const emptyMoney = () => Object.fromEntries(CURRENCIES.map((c) => [c, { received: 0, refunded: 0, net: 0, payments: 0, refunds: 0 }]));
const add = (bucket, e) => {
  const b = bucket[e.currency];
  if (!b) return;
  if (e.type === 'payment') { b.received += minor(e.amount) || 0; b.payments += 1; } else { b.refunded += minor(e.amount) || 0; b.refunds += 1; }
};
const finish = (bucket) => Object.fromEntries(Object.entries(bucket).map(([c, b]) => [c, { received: major(b.received), refunded: major(b.refunded), net: major(b.received - b.refunded), payments: b.payments, refunds: b.refunds }]));

/** Money not received yet: orders waiting for payment, and screenshots to check. */
export function pendingOf(orders) {
  const out = { awaiting: { count: 0, noPrice: 0, NPR: 0, USD: 0 }, toCheck: { count: 0, noPrice: 0, NPR: 0, USD: 0 } };
  for (const o of orders) {
    if (o.status === 'archived' || (o.kind !== 'order' && !o.plan)) continue;
    if (paypalReceipt(o) || manualReceipt(o)) continue;
    const s = payStatusOf(o) || (o.kind === 'order' ? 'awaiting_payment' : null);
    const k = s === 'proof_submitted' ? 'toCheck' : s === 'awaiting_payment' || s === 'rejected' ? 'awaiting' : null;
    if (!k) continue;
    const proofCur = k === 'toCheck' ? (o.pay?.proofs || []).at(-1)?.currency : null;
    const cur = proofCur === 'USD' || o.payment?.status === 'pending' ? 'USD' : proofCur === 'NPR' ? 'NPR' : o.amount?.npr != null ? 'NPR' : o.amount?.usd != null ? 'USD' : null;
    const amt = cur ? minor((cur === 'USD' ? o.amount?.usd : o.amount?.npr) ?? NaN) : NaN;
    out[k].count += 1;
    if (Number.isFinite(amt)) out[k][cur] += amt; else out[k].noPrice += 1;
  }
  for (const k of ['awaiting', 'toCheck']) for (const c of CURRENCIES) out[k][c] = major(out[k][c]);
  return out;
}

/**
 * THE earnings function: everything the Finance page shows, from the orders alone.
 * { periods: { thisMonth, lastMonth, thisYear, allTime } (each { NPR, USD } of { received, refunded, net, payments,
 *   refunds }), months: 12 × { month, NPR, USD } newest first, byMethod: [{ method, currency, … }],
 *   pending, comps: { count, value: { NPR, USD }, items }, test: { payments }, keys: { thisMonth, lastMonth, year } }
 */
export function earnings(orders, { now = new Date() } = {}) {
  const all = ledger(orders);
  const thisMonth = monthKey(now.toISOString());
  const lastMonth = prevMonth(thisMonth);
  const year = thisMonth.slice(0, 4);
  const periods = { thisMonth: emptyMoney(), lastMonth: emptyMoney(), thisYear: emptyMoney(), allTime: emptyMoney() };
  const monthKeys = Array.from({ length: 12 }, (_, i) => prevMonth(thisMonth, i));
  const months = new Map(monthKeys.map((k) => [k, emptyMoney()]));
  const methods = new Map();
  for (const e of all) {
    if (!e.counted || (e.type !== 'payment' && e.type !== 'refund')) continue;
    add(periods.allTime, e);
    if (e.month === thisMonth) add(periods.thisMonth, e);
    if (e.month === lastMonth) add(periods.lastMonth, e);
    if (e.month.startsWith(`${year}-`)) add(periods.thisYear, e);
    if (months.has(e.month)) add(months.get(e.month), e);
    const key = `${e.method}\u0000${e.currency}`;
    if (!methods.has(key)) methods.set(key, { method: e.method, currency: e.currency, bucket: emptyMoney() });
    add(methods.get(key).bucket, e);
  }
  const comps = all.filter((e) => e.type === 'comp');
  const compValueSum = { NPR: 0, USD: 0 };
  for (const c of comps) {
    if (c.value?.npr != null && Number.isFinite(minor(c.value.npr))) compValueSum.NPR += minor(c.value.npr);
    if (c.value?.usd != null && Number.isFinite(minor(c.value.usd))) compValueSum.USD += minor(c.value.usd);
  }
  return {
    keys: { thisMonth, lastMonth, year },
    periods: Object.fromEntries(Object.entries(periods).map(([k, b]) => [k, finish(b)])),
    months: monthKeys.map((k) => ({ month: k, ...finish(months.get(k)) })),
    byMethod: [...methods.values()].map((m) => ({ method: m.method, currency: m.currency, ...finish(m.bucket)[m.currency] }))
      .sort((a, b) => a.currency.localeCompare(b.currency) || b.received - a.received || a.method.localeCompare(b.method)),
    pending: pendingOf(orders),
    comps: { count: comps.length, value: { NPR: major(compValueSum.NPR), USD: major(compValueSum.USD) }, items: comps },
    test: { payments: all.filter((e) => e.type === 'payment' && e.test).length },
  };
}

/**
 * Filters for the transactions list and the CSV: { type, currency, month, from, to, q }. A free-access line matches a
 * currency when its plan has a price in it.
 */
export function filterEntries(list, { type, currency, month, from, to, q } = {}) {
  const needle = String(q || '').trim().toLowerCase();
  return list.filter((e) => {
    if (type && e.type !== type) return false;
    if (currency && (e.type === 'comp' ? e.value?.[currency.toLowerCase()] == null : e.currency !== currency)) return false;
    if (month && e.month !== month) return false;
    if (from && e.day < from) return false;
    if (to && e.day > to) return false;
    if (needle && !`${e.ref || ''} ${e.name} ${e.email} ${e.paypalId || ''}`.toLowerCase().includes(needle)) return false;
    return true;
  });
}
