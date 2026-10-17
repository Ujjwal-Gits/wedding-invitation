// GET /api/admin/markets (an admin with 'orders' or 'finance'): the Overview's figures per market (docs/API.md
// "Markets"): new orders, enquiries waiting for a reply, payment screenshots to check, and money received this month
// (rupees and dollars apart, as Finance counts it). Counts only; nothing personal.
import { allOrders } from './orders.js';
import { hasPerm } from './auth.js';
import { earnings, payStatusOf } from './finance.js';
import { MARKETS, orderMarket } from './market.js';
import { isEnquiry, enquiryStage } from './enquiries.js';

export async function marketStats(req, res) {
  const orders = await allOrders();
  const money = earnings(orders);
  const seeMoney = hasPerm(req, 'finance');
  const markets = {};
  for (const m of MARKETS) {
    const mine = orders.filter((o) => orderMarket(o) === m && o.status !== 'archived');
    const paid = money.byMarket[m].thisMonth;
    markets[m] = {
      newOrders: mine.filter((o) => o.status === 'new' && !isEnquiry(o)).length,
      enquiriesWaiting: mine.filter((o) => isEnquiry(o) && ['new', 'quoted'].includes(enquiryStage(o))).length,
      quotesSent: mine.filter((o) => isEnquiry(o) && enquiryStage(o) === 'sent').length,
      toCheck: mine.filter((o) => payStatusOf(o) === 'proof_submitted').length,
      ...(seeMoney ? { paidThisMonth: { NPR: paid.NPR.received, USD: paid.USD.received, payments: paid.NPR.payments + paid.USD.payments } } : {}),
    };
  }
  res.set('Cache-Control', 'private, no-store');
  res.json({ month: money.keys.thisMonth, markets });
}
