// Enquiries (docs/API.md "Enquiries"): a Custom design request is an enquiry, not an order. The planner replies with a
// price (a quote in rupees or US dollars), marks it sent, and turns the enquiry into an order the customer pays like
// any other (a pay link; PayPal or a card for a dollar quote when PayPal Checkout is on). Admin routes, 'orders' perm:
//   PATCH /api/orders/:id/quote    { amount, currency, note?, sent? }   set or change the quote; sent: true = "Quote sent"
//   POST  /api/orders/:id/convert  {}                                   the enquiry becomes an order: { order, payUrl }
// order.quote = { amount, currency, note, at, by, sentAt?, sentBy? }; a converted enquiry keeps `enquiry: true` and
// `convertedAt`, and its kind becomes 'order'.
import { mutateOrder, adminView, historyAdd, clean, ID_RE, newPayToken, payUrl } from './orders.js';
import { readSite } from './site.js';
import { orderMarket } from './market.js';
import { CURRENCIES, manualReceipt, paypalReceipt } from './finance.js';

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const bodyOf = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {});
const idOf = (req) => { if (!ID_RE.test(req.params.id || '')) throw httpError(404, 'Request not found.'); return req.params.id; };
const by = (req) => req.admin?.email || 'admin';

/** A Custom design request (the website's kind 'custom', or 'enquiry'), before or after it became an order. */
export const isEnquiry = (o) => o?.kind === 'custom' || o?.kind === 'enquiry' || o?.enquiry === true;

/** 'new' (no price yet) · 'quoted' (price set, not sent) · 'sent' · 'converted' (now an order) · 'closed' (archived). */
export function enquiryStage(o) {
  if (o.convertedAt) return 'converted';
  if (o.status === 'archived') return 'closed';
  if (o.quote?.sentAt) return 'sent';
  if (o.quote) return 'quoted';
  return 'new';
}

/** A quote amount in its currency: rupees whole (1 – 10,000,000), dollars 1 – 10,000 with at most two decimals. */
function quoteAmount(v, currency) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  if (currency === 'NPR') return Number.isInteger(v) && v >= 1 && v <= 10_000_000 ? v : null;
  return v >= 1 && v <= 10_000 && Math.abs(Math.round(v * 100) - v * 100) < 1e-6 ? Math.round(v * 100) / 100 : null;
}

/** PATCH /api/orders/:id/quote (admin, 'orders') */
export async function setQuote(req, res) {
  const id = idOf(req);
  const b = bodyOf(req);
  const errors = [];
  if (b.currency != null && !CURRENCIES.includes(b.currency)) errors.push({ path: 'currency', message: 'must be NPR or USD' });
  if (b.note != null && (typeof b.note !== 'string' || b.note.length > 1000)) errors.push({ path: 'note', message: 'must be text of at most 1000 characters' });
  if (b.sent != null && typeof b.sent !== 'boolean') errors.push({ path: 'sent', message: 'must be true or false' });
  if (errors.length) throw httpError(400, 'Please check the quote.', { errors });
  const order = await mutateOrder(id, (o) => {
    if (!isEnquiry(o)) throw httpError(409, 'Only an enquiry (a custom design request) gets a quote.');
    if (o.convertedAt) throw httpError(409, 'This enquiry is already an order. Change its price on the order.');
    const currency = b.currency || o.quote?.currency || (orderMarket(o) === 'intl' ? 'USD' : 'NPR');
    const wantsPrice = b.amount !== undefined || !o.quote || currency !== o.quote.currency;
    const amount = wantsPrice ? quoteAmount(b.amount, currency) : o.quote.amount;
    if (amount == null) {
      throw httpError(400, currency === 'NPR' ? 'Enter the price in rupees, a whole number.' : 'Enter the price in US dollars (1 to 10,000, at most 2 decimals).', { errors: [{ path: 'amount', message: 'is not a price' }] });
    }
    const was = o.quote;
    const changed = !was || was.amount !== amount || was.currency !== currency;
    const now = new Date().toISOString();
    o.quote = { ...(was || {}), amount, currency, note: b.note !== undefined ? clean(b.note, 1000, true) : was?.note || '', at: changed ? now : was.at, by: changed ? by(req) : was.by };
    if (changed && was?.sentAt && b.sent !== true) { delete o.quote.sentAt; delete o.quote.sentBy; } // a new price must be sent again
    if (b.sent === true && !o.quote.sentAt) { o.quote.sentAt = now; o.quote.sentBy = by(req); if (o.status === 'new') o.status = 'contacted'; }
    if (b.sent === false) { delete o.quote.sentAt; delete o.quote.sentBy; }
    if (o.pay) historyAdd(o.pay, o.pay.status, 'admin', `quote ${currency} ${amount}${o.quote.sentAt && (changed || b.sent === true) ? ' sent' : ''}`);
    return undefined;
  });
  console.info(`[admin] quote order=${order.ref || id} ${order.quote.currency} ${order.quote.amount}${order.quote.sentAt ? ' (sent)' : ''}`);
  res.json({ order: adminView(order) });
}

/**
 * POST /api/orders/:id/convert (admin, 'orders'): the enquiry becomes an order at its quote, on the Custom plan when
 * the site has one. A new pay link is made (the old one stops working) and returned once: { order, payUrl }.
 */
export async function convert(req, res) {
  const id = idOf(req);
  const site = await readSite();
  const custom = site.plans.find((p) => p.id === 'custom') || null;
  let token = '';
  const order = await mutateOrder(id, (o) => {
    if (!isEnquiry(o)) throw httpError(409, 'Only an enquiry (a custom design request) can be turned into an order.');
    if (o.convertedAt) throw httpError(409, 'This enquiry is already an order.');
    if (!o.quote) throw httpError(409, 'Set the price first (Quote), then turn it into an order.');
    if (manualReceipt(o) || paypalReceipt(o) || o.pay?.status === 'comped') throw httpError(409, 'This request is already paid or has free access.');
    const now = new Date().toISOString();
    const { amount, currency } = o.quote;
    o.enquiry = true;
    o.enquiryKind = o.kind;
    o.kind = 'order';
    o.convertedAt = now;
    o.convertedBy = by(req);
    if (custom) Object.assign(o, { plan: custom.id, planName: custom.name, planFrom: false });
    else if (!o.planName) o.planName = 'Custom design';
    o.amount = { npr: currency === 'NPR' ? amount : null, usd: currency === 'USD' ? amount : null };
    if (o.status === 'new') o.status = 'contacted';
    const pay = o.pay || (o.pay = { status: 'awaiting_payment', reason: null, proofs: [], history: [] });
    if (!['awaiting_payment', 'rejected'].includes(pay.status)) pay.status = 'awaiting_payment';
    pay.reason = null;
    historyAdd(pay, 'awaiting_payment', 'admin', `enquiry turned into an order at ${currency} ${amount}`);
    token = newPayToken(o);
    return undefined;
  });
  console.info(`[admin] enquiry ${order.ref || id} converted to an order ${order.quote.currency} ${order.quote.amount}`);
  res.json({ order: adminView(order), payUrl: payUrl(order.ref, token) });
}
