// Customer accounts: the customer's own dashboard data (GET /api/account, ...) and the planner's account admin
// (GET/POST/PATCH /api/admin/customers, linking invitations). Data helpers: lib/accounts.js. Sign-in: lib/auth.js.
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { EMAIL_RE, readSite, planOffered } from './site.js';
import { staffByEmail } from './staff.js';
import { isTheme } from './catalog.js';
import { peekInvitation, isLive, listOrders, withLock, getOrderByRef, saveOrder, SLUG_RE } from './store.js';
import {
  customerByEmail, getCustomer, createCustomer, mutateCustomer, listCustomers, adminCustomer, linkOf, normEmail, listPending, confirmPending, dropPending,
  CUSTOMER_ID_RE, ACCOUNT_PASSWORD_MIN, ACCOUNT_PASSWORD_MAX,
} from './accounts.js';
import { syncOrderDetails, prefillFromCustomer } from './handover.js';
import { PUBLIC_ORIGINS, ADMIN_EMAIL, IS_PROD } from './env.js';
import { hashAccountPassword, revokeCustomerSessions, permsOf, checkCustomer, signInCustomer, loginThrottle } from './auth.js';
import { clientIp, originAllowed, rateLimiter } from './security.js';
import { sendVerify, sendReset, sendSignupCode, useCode, CODE_RE, MAIL_ON } from './account-mail.js';
import { clean, planView, REF_RE, amountOf, dropOpenCheckout } from './orders.js';
import { orderMarket, checkPhone, countryOfPhone, customerMarket, likelyZone, isMarket, MARKET_NAME, PHONE_MSG } from './market.js';
import { marketView } from './site.js';
import { requestsFor } from './change-requests.js'; // "Request a change" for a locked name or date
import { lockOut } from './invitations.js';
/** A required phone, as E.164 ('' when missing or not a real number); `market` picks the country for a number without a code. */
const phoneOf = (v, market) => { const r = checkPhone(typeof v === 'string' ? v : '', market === 'intl' ? 'US' : 'NP'); return r.ok ? r.e164 : ''; };

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const passwordOk = (p) => typeof p === 'string' && p.length >= ACCOUNT_PASSWORD_MIN && p.length <= ACCOUNT_PASSWORD_MAX;
const PASSWORD_MSG = `The password must be ${ACCOUNT_PASSWORD_MIN}-${ACCOUNT_PASSWORD_MAX} characters.`;

// ── The customer ───────────────────────────────────────────────────────────

const payStatusOf = (o) => o.pay?.status || (o.payment?.status === 'paid' ? 'confirmed' : o.payment?.status === 'refunded' ? 'refunded' : 'awaiting_payment');

const waitingForPrice = (o) => o.enquiry === true && o.amount?.npr == null && o.amount?.usd == null;

/** An order as its customer sees it: no token hash, no admin notes, no proof files. */
export function customerOrderView(o) {
  const status = payStatusOf(o);
  const out = {
    ref: o.ref, at: o.at, kind: o.kind, plan: planView(o), amount: o.amount || { npr: null, usd: null },
    message: o.message || '', payStatus: status, reason: status === 'rejected' ? o.pay?.reason || null : null,
    payUrl: o.ref && !waitingForPrice(o) ? `/pay/${o.ref}` : null, market: o.market === 'intl' ? 'intl' : 'np',
  };
  if (o.enquiry) out.enquiry = true; // a custom design: no payment page until the planner gives it a price
  if (o.quote?.sentAt) out.quote = { amount: o.quote.amount, currency: o.quote.currency, note: o.quote.note || '', sentAt: o.quote.sentAt };
  for (const k of ['theme', 'weddingDate', 'venue', 'bride', 'groom', 'invitation']) if (o[k]) out[k] = o[k];
  return out;
}

const ordersOf = async (cid) => (await listOrders()).filter((o) => o.customerId === cid && o.ref)
  .sort((a, b) => String(b.at).localeCompare(String(a.at)));

/** GET /api/account (customer): their details, orders and invitations. */
export async function account(req, res) {
  res.json(await accountView(req.customer));
}

/** GET /api/admin/customers/:id/account (planner): exactly what that customer's dashboard shows, read-only. */
export async function adminAccount(req, res) {
  const c = getCustomer(idParam(req));
  if (!c) throw httpError(404, 'No account with that id.');
  console.info(`[admin] viewed customer dashboard id=${c.id}`);
  res.json(await accountView(c));
}

/** Where the customer is (lib/market.js): { market, country, zone }. */
export const whereOf = (c, orders) => {
  const market = customerMarket(c, orders);
  return { market, country: countryOfPhone(c.phone), zone: likelyZone({ market, phone: c.phone }) };
};

async function accountView(c) {
  const [orders, site] = await Promise.all([ordersOf(c.id), readSite()]);
  const where = whereOf(c, orders);
  const mv = marketView(site, where.market);
  const invitations = [];
  for (const l of c.invitations || []) {
    const doc = await peekInvitation(l.slug);
    if (!doc) continue;
    const d = doc.draft;
    // the order this invitation belongs to (its own, else the newest), for the plan and the payment on its card
    const o = orders.find((x) => x.invitation === doc.slug) || orders[0] || null;
    const live = isLive(doc); // a suspended invitation (payment reversed or refunded) has no share link
    invitations.push({
      slug: doc.slug, bride: d.couple?.bride?.name || null, groom: d.couple?.groom?.name || null, theme: d.theme,
      status: doc.status, suspended: Boolean(doc.suspended), weddingDate: d.weddingDate || null, updatedAt: doc.updatedAt, perms: permsOf(l),
      plan: o ? planView(o) : null, payStatus: o ? payStatusOf(o) : null, payUrl: o?.ref ? `/pay/${o.ref}` : null, orderRef: o?.ref || null,
      previewUrl: `/${d.theme}/?id=${doc.slug}`, shareUrl: live ? `${PUBLIC_ORIGINS[0] || ''}/i/${doc.slug}` : null,
      // the event lock (names and date after the first publish) and the couple's change requests
      lock: lockOut(doc), requests: await requestsFor(doc.slug),
    });
  }
  return {
    customer: { name: c.name || '', email: c.email, phone: c.phone || '', emailVerified: c.emailVerified === true, mail: MAIL_ON },
    orders: orders.map(customerOrderView),
    invitations,
    // where they are (lib/market.js): what the dashboard shows follows it (docs/PLATFORM.md "Markets")
    market: where.market, marketName: MARKET_NAME[where.market], country: where.country, zone: where.zone,
    // how to reach us, for their market: International leads with email (Website › International)
    contact: { whatsapp: mv.contact.whatsapp || '', phone: mv.contact.phone || '', email: mv.contact.email || '', lead: mv.lead },
  };
}

/**
 * PATCH /api/account (customer) { phone }: their phone number, checked and stored in E.164 (+14155552671). A number
 * without a country code is read as their market's (Nepal: 98XXXXXXXX). It is required, so it can't be removed.
 */
export async function patchAccount(req, res) {
  const b = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  if (b.phone === undefined) return res.status(400).json({ error: 'Nothing to change.', fields: [] });
  if (typeof b.phone !== 'string' || !b.phone.trim()) return res.status(400).json({ error: 'Please enter a phone number.', fields: ['phone'] });
  const all = await listOrders();
  const fallback = customerMarket(req.customer, all) === 'intl' ? 'US' : 'NP';
  const r = checkPhone(b.phone, fallback);
  if (!r.ok) return res.status(400).json({ error: 'Please enter the full number with the country code, for example +1 415 555 2671 or +977 98XXXXXXXX.', fields: ['phone'] });
  const c = await mutateCustomer(req.customer.id, (x) => { if (x.phone === r.e164) return false; x.phone = r.e164; });
  console.info(`[account] phone changed id=${c.id} country=${r.country || '-'}`);
  res.json({ customer: { phone: c.phone || '', ...whereOf(c, all.filter((o) => o.customerId === c.id)) } });
}

/** PATCH /api/account/orders/:ref (customer): the details they could leave out when ordering. */
export async function patchOrder(req, res) {
  const { ref } = req.params;
  if (!REF_RE.test(ref)) throw httpError(404, 'Order not found.');
  const b = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const fields = [];
  const text = (k, max, multiline = false) => {
    if (b[k] === undefined) return undefined;
    if (typeof b[k] !== 'string') { fields.push(k); return undefined; }
    const s = clean(b[k], max + 1, multiline);
    if (s.length > max) { fields.push(k); return undefined; }
    return s;
  };
  const patch = { venue: text('venue', 200), bride: text('bride', 80), groom: text('groom', 80), message: text('message', 2000, true), weddingDate: text('weddingDate', 10) };
  if (patch.weddingDate) {
    const m = DATE_RE.exec(patch.weddingDate);
    const real = m && new Date(Date.UTC(+m[1], m[2] - 1, +m[3])).toISOString().slice(0, 10) === patch.weddingDate;
    if (!real || +m[1] < 2000 || +m[1] > 2100) fields.push('weddingDate');
  }
  // "Change plan" before paying: another plan with a fixed price on the order's website (Custom stays a request)
  let newPlan = null;
  if (b.plan !== undefined) {
    if (typeof b.plan !== 'string' || !/^[a-z0-9-]{1,40}$/.test(b.plan)) fields.push('plan');
    else newPlan = (await readSite()).plans.find((p) => p.id === b.plan) || null;
    if (b.plan !== undefined && !newPlan) fields.push('plan');
  }
  if (fields.length) return res.status(400).json({ error: 'Please check the form.', fields: [...new Set(fields)] });
  const order = await withLock('orders', async () => {
    const o = await getOrderByRef(ref);
    if (!o || o.customerId !== req.customer.id) throw httpError(404, 'Order not found.');
    if (newPlan && newPlan.id !== o.plan) {
      const market = orderMarket(o);
      const amount = amountOf(newPlan);
      if (o.kind !== 'order' || !['awaiting_payment', 'rejected'].includes(payStatusOf(o))) throw httpError(409, 'The plan can only be changed before the order is paid. Please message us.');
      if (newPlan.from === true || !planOffered(newPlan, market) || (market === 'intl' ? amount.usd == null : amount.npr == null)) throw httpError(400, 'That plan cannot be chosen here. Please message us.');
      const was = o.planName || o.plan;
      Object.assign(o, { plan: newPlan.id, planName: newPlan.name, planFrom: false, amount });
      dropOpenCheckout(o, 'the plan changed');
      if (o.pay) o.pay.history = [...(o.pay.history || []), { at: new Date().toISOString(), status: o.pay.status, by: 'customer', note: `Plan changed from ${was} to ${newPlan.name}` }].slice(-50);
      console.info(`[account] plan changed ref=${o.ref} ${was} -> ${newPlan.id}`);
    }
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      if (v === '' && k !== 'message') delete o[k];
      else o[k] = v;
    }
    await saveOrder(o);
    return o;
  });
  // the linked invitation's names, date and venue that are still empty (or still the demo's) follow these details
  const filled = await syncOrderDetails(req.customer, order).catch((err) => { console.warn(`[account] sync failed: ${err.message}`); return []; });
  res.json({ order: customerOrderView(order), filled });
}

/** POST /api/account/password (customer): { current, password }. Their other sessions end; this browser stays in. */
export async function changePassword(req, res) {
  const b = req.body || {};
  if (!passwordOk(b.password)) return res.status(400).json({ error: PASSWORD_MSG, fields: ['password'] });
  const ip = clientIp(req);
  const c = req.customer;
  const wait = loginThrottle(ip, `c:${c.email}`);
  if (wait) {
    res.set('Retry-After', String(wait));
    return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
  }
  const r = await checkCustomer(ip, c.email, typeof b.current === 'string' ? b.current.slice(0, 1024) : '');
  if (!r.ok) return res.status(401).json({ error: 'Your current password is not right.', fields: ['current'] });
  const passwordHash = await hashAccountPassword(b.password);
  const saved = await mutateCustomer(c.id, (x) => { x.passwordHash = passwordHash; });
  await revokeCustomerSessions(c.id);
  await signInCustomer(req, res, saved);
  console.info(`[account] password changed id=${c.id}`);
  res.json({ ok: true });
}

// ── The planner ────────────────────────────────────────────────────────────

/** The account as the admin sees it, with its order count and market / country (all: every order, when at hand). */
const adminOut = async (c, all = null) => {
  const mine = (all || await listOrders()).filter((o) => o.customerId === c.id);
  return adminCustomer(c, mine.length, whereOf(c, mine));
};
const idParam = (req) => {
  if (!CUSTOMER_ID_RE.test(req.params.id || '')) throw httpError(404, 'No account with that id.');
  return req.params.id;
};
const nameOf = (v, max) => (typeof v === 'string' ? clean(v, max) : '');

/** GET /api/admin/customers */
export async function adminList(req, res) {
  const all = await listOrders();
  const m = req.query?.market;
  if (m != null && m !== '' && !isMarket(m)) throw httpError(400, "market must be 'np' or 'intl'.");
  let list = listCustomers().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const out = [];
  for (const c of list) {
    const v = await adminOut(c, all);
    if (!m || v.market === m) out.push(v);
  }
  list = null;
  // invitations waiting for an email; `account` once an account with that email exists (the owner confirms the link)
  const pending = (await listPending()).map(({ email, slug, at }) => {
    const c = customerByEmail(email);
    return { email, slug, at, account: c ? { id: c.id, name: c.name || '', email: c.email, createdAt: c.createdAt, emailVerified: c.emailVerified === true } : null };
  });
  res.json({ customers: out, pending });
}

const signupLimiter = rateLimiter({ windowMs: 60 * 60 * 1000, max: 5 }); // new accounts per IP per hour
const signupSendIp = rateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }); // sign-up code emails per IP per hour
const signupSendEmail = rateLimiter({ windowMs: 60 * 60 * 1000, max: 3 }); // sign-up code emails per address per hour
const signupCodeIp = rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }); // sign-up code tries per IP

// Sign-ups waiting for their email code, in memory only (a restart drops them; the person asks for a new code).
// No account exists until the code is right. Keyed by the normalised email; only a hash of the code is kept.
const SIGNUP_TTL = 15 * 60 * 1000;
const SIGNUP_TRIES = 5;
const SIGNUP_MAX = 5000;
const pendingSignups = new Map(); // email -> { name, email, phone, market, passwordHash, codeHash, exp, tries }
const signupHash = (email, code) => createHash('sha256').update(`signup:${email}:${code}`).digest();
function keepPending(p) {
  const now = Date.now();
  for (const [k, v] of pendingSignups) if (!(v.exp > now)) pendingSignups.delete(k);
  pendingSignups.delete(p.email); // re-inserted at the end (newest)
  while (pendingSignups.size >= SIGNUP_MAX) pendingSignups.delete(pendingSignups.keys().next().value);
  pendingSignups.set(p.email, p);
}
const accountExists = { error: 'This email already has an account. Please sign in instead.', code: 'account_exists', fields: ['email'] };
// a team member's email signs in as the team member (lib/auth.js), so it cannot be a customer account too
const emailTaken = (email) => Boolean(customerByEmail(email) || staffByEmail(email) || email === ADMIN_EMAIL);

/**
 * POST /api/auth/signup/start { name, email, phone, password, market? }: step 1 of making an account (sign-in page and
 * the order form). Checks the details, keeps them (password hashed with argon2id) as a pending sign-up for 15 minutes
 * and emails a 6-digit sign-up code. No account is made yet. Calling it again ("Send again") sends a new code.
 * The phone (with its country code) is required and stored as E.164 (lib/phone.js).
 */
export async function signupStart(req, res) {
  if (!originAllowed(req)) return res.status(403).json({ error: 'Cross-site request refused.' });
  const b = req.body || {};
  const email = normEmail(b.email).slice(0, 254);
  const name = nameOf(b.name, 80);
  // the website they came from ('intl' from /international/); missing: worked out later from orders and the phone
  const market = isMarket(b.market) ? b.market : undefined;
  const phone = phoneOf(b.phone, market); // required, with its country code (E.164)
  const fields = [];
  if (name.length < 2) fields.push('name');
  if (!email || !EMAIL_RE.test(email)) fields.push('email');
  if (!phone) fields.push('phone');
  if (!passwordOk(b.password)) fields.push('password');
  if (fields.length) {
    const what = { name: 'your name', email: 'a valid email', phone: 'a valid phone number with country code', password: PASSWORD_MSG.toLowerCase() };
    const only = fields.length === 1 ? fields[0] : '';
    const error = only === 'password' ? PASSWORD_MSG : only === 'phone' ? PHONE_MSG : `Please enter ${fields.map((f) => f === 'password' ? 'a password of 8+ characters' : what[f]).join(', ')}.`;
    return res.status(400).json({ error, fields });
  }
  const lim = signupSendIp.hit(clientIp(req));
  if (lim.ok && !signupLimiter.peek(clientIp(req)).ok) Object.assign(lim, signupLimiter.peek(clientIp(req)));
  if (!lim.ok) { res.set('Retry-After', String(lim.retryAfter)); return res.status(429).json({ error: 'Too many new accounts from here. Please try again later.' }); }
  if (emailTaken(email)) return res.status(409).json(accountExists);
  if (!MAIL_ON && IS_PROD) return res.status(503).json({ error: 'Email is not set up yet, so new accounts cannot be made just now. Please try again later.' });
  const per = signupSendEmail.hit(email);
  if (!per.ok) { res.set('Retry-After', String(per.retryAfter)); return res.status(429).json({ error: 'We sent a few codes to this email already. Please check your inbox and spam folder, or try again later.', code: 'too_many_codes' }); }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const passwordHash = await hashAccountPassword(String(b.password).normalize('NFC'));
  keepPending({ name, email, phone, market, passwordHash, codeHash: signupHash(email, code), exp: Date.now() + SIGNUP_TTL, tries: 0 });
  if (MAIL_ON) {
    const sent = await sendSignupCode({ email, name, code, minutes: SIGNUP_TTL / 60000 }).catch(() => false);
    if (!sent) { pendingSignups.delete(email); return res.status(502).json({ error: 'We could not send the email just now. Please try again in a moment.' }); }
  } else {
    console.info(`[account] mail is off (not production): sign-up code for ${email} is ${code}`); // dev only, never in production
  }
  res.json({ ok: true, email, expiresIn: SIGNUP_TTL / 1000 });
}

/**
 * POST /api/auth/signup { email, code }: step 2. A right code makes the account (email confirmed) and signs this
 * browser in, answering { role, name, email, csrf, market }. 5 wrong codes and the pending sign-up is gone.
 * Invitations waiting for this email still need the owner's "Link now".
 */
export async function signup(req, res) {
  if (!originAllowed(req)) return res.status(403).json({ error: 'Cross-site request refused.' });
  const ip = clientIp(req);
  if (!signupCodeIp.hit(ip).ok) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });
  const b = req.body || {};
  const email = normEmail(b.email).slice(0, 254);
  const code = String(b.code ?? '').replace(/\s+/g, '');
  if (!CODE_RE.test(code)) return res.status(400).json({ error: 'Enter the 6-digit code from the email.', fields: ['code'] });
  const p = pendingSignups.get(email);
  const expired = { error: 'This code has expired. Click Send again for a new one.', fields: ['code'], code: 'code_expired' };
  if (!p || !(p.exp > Date.now()) || p.tries >= SIGNUP_TRIES) { if (p) pendingSignups.delete(email); return res.status(400).json(expired); }
  const got = signupHash(email, code);
  if (!(got.length === p.codeHash.length && timingSafeEqual(got, p.codeHash))) {
    p.tries += 1;
    if (p.tries < SIGNUP_TRIES) return res.status(400).json({ error: 'That code is not right. Check the email and try again.', fields: ['code'], code: 'code_wrong' });
    pendingSignups.delete(email);
    return res.status(400).json({ error: 'Too many wrong codes. Click Send again for a new one.', fields: ['code'], code: 'code_expired' });
  }
  pendingSignups.delete(email); // used up
  if (emailTaken(email)) return res.status(409).json(accountExists);
  const lim = signupLimiter.hit(ip);
  if (!lim.ok) { res.set('Retry-After', String(lim.retryAfter)); return res.status(429).json({ error: 'Too many new accounts from here. Please try again later.' }); }
  let c;
  try { c = await createCustomer({ email, name: p.name, phone: p.phone, market: p.market, passwordHash: p.passwordHash, emailVerified: true }); } catch (err) {
    if (err.code === 'account_exists') return res.status(409).json(accountExists);
    throw err;
  }
  console.info(`[account] signed up id=${c.id} ip=${ip}`);
  const s = await signInCustomer(req, res, c);
  res.status(201).json({ role: 'customer', name: c.name || '', email: c.email, csrf: s.csrf, market: customerMarket(c, []) });
}

const forgotIp = rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
const forgotEmail = rateLimiter({ windowMs: 60 * 60 * 1000, max: 3 });
const resendLimiter = rateLimiter({ windowMs: 60 * 60 * 1000, max: 3 });
const codeLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

/** POST /api/auth/forgot { email }: emails a 6-digit code when the account exists. Same answer either way. */
export async function forgot(req, res) {
  if (!originAllowed(req)) return res.status(403).json({ error: 'Cross-site request refused.' });
  if (!MAIL_ON) return res.json({ ok: true, mail: false });
  const email = normEmail(req.body?.email).slice(0, 254);
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter your email.', fields: ['email'] });
  const a = forgotIp.hit(clientIp(req));
  const b = forgotEmail.hit(email);
  if (!a.ok || !b.ok) { res.set('Retry-After', String(Math.max(a.retryAfter || 0, b.retryAfter || 0, 1))); return res.status(429).json({ error: 'Too many requests. Please wait a while and try again.' }); }
  sendReset(req, email).catch((err) => console.error(`[account] reset mail failed: ${err.message}`));
  res.json({ ok: true, mail: true });
}

const TICKET_TTL = 10 * 60 * 1000;
const TICKET_RE = /^[A-Za-z0-9_-]{43}$/;
const sha256 = (s) => createHash('sha256').update(String(s)).digest();

/**
 * POST /api/auth/reset/check { email, code }: step 1 of "Forgot password". A right code is used up and answered with a
 * one-time reset ticket for step 2 (only its SHA-256 is kept on the account, for 10 minutes). Wrong codes count as
 * before (5 and the code is gone).
 */
export async function checkResetCode(req, res) {
  if (!originAllowed(req)) return res.status(403).json({ error: 'Cross-site request refused.' });
  if (!codeLimiter.hit(clientIp(req)).ok) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });
  const b = req.body || {};
  const code = String(b.code ?? '').replace(/\s+/g, '');
  if (!CODE_RE.test(code)) return res.status(400).json({ error: 'Enter the 6-digit code from the email.', fields: ['code'] });
  const found = customerByEmail(normEmail(b.email));
  const r = found && found.disabled !== true ? await useCode(found, 'reset', code) : 'wrong';
  // the same answer for a wrong code, an expired one and an email without an account (no account probing)
  if (r !== 'ok') return res.status(400).json({ error: 'That code is not right or has expired. Check the email, or ask for a new code.', fields: ['code'], code: 'code_bad' });
  const ticket = randomBytes(32).toString('base64url');
  await mutateCustomer(found.id, (x) => { x.resetTicket = { hash: sha256(ticket).toString('hex'), exp: Date.now() + TICKET_TTL }; });
  res.json({ ok: true, ticket, expiresIn: TICKET_TTL / 1000 });
}

/**
 * POST /api/auth/reset { email, ticket, password }: step 2. Sets the new password with the ticket from step 1 (once),
 * ends every other session, signs this browser in.
 */
export async function resetPassword(req, res) {
  if (!originAllowed(req)) return res.status(403).json({ error: 'Cross-site request refused.' });
  if (!codeLimiter.hit(clientIp(req)).ok) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });
  const b = req.body || {};
  const ticket = typeof b.ticket === 'string' ? b.ticket : '';
  const expired = { error: 'This reset has expired. Please start again and ask for a new code.', fields: ['code'], code: 'ticket_expired' };
  if (!TICKET_RE.test(ticket)) return res.status(400).json(expired);
  if (!passwordOk(b.password)) return res.status(400).json({ error: PASSWORD_MSG, fields: ['password'] });
  const found = customerByEmail(normEmail(b.email));
  if (!found || found.disabled === true) return res.status(400).json(expired);
  let ok = false;
  await mutateCustomer(found.id, (x) => {
    const t = x.resetTicket;
    if (!t?.hash) return false;
    const want = Buffer.from(String(t.hash), 'hex');
    const got = sha256(ticket);
    const live = t.exp > Date.now();
    ok = live && want.length === got.length && timingSafeEqual(want, got);
    if (ok || !live) delete x.resetTicket; else return false; // used once; a wrong ticket leaves the right one alone
  });
  if (!ok) return res.status(400).json(expired);
  const passwordHash = await hashAccountPassword(b.password);
  const c = await mutateCustomer(found.id, (x) => { x.passwordHash = passwordHash; x.emailVerified = true; delete x.verify; delete x.reset; });
  await revokeCustomerSessions(c.id);
  console.info(`[account] password reset by email code id=${c.id}`);
  const s = await signInCustomer(req, res, c);
  res.json({ role: 'customer', name: c.name || '', email: c.email, csrf: s.csrf });
}

/** POST /api/account/verify (customer): emails a new "Confirm your email" code. */
export async function resendVerify(req, res) {
  if (req.customer.emailVerified === true) return res.json({ ok: true, already: true });
  if (!MAIL_ON) return res.status(503).json({ error: 'Email is not set up yet. Please try again later.' });
  if (!resendLimiter.hit(req.customer.id).ok) return res.status(429).json({ error: 'We sent a few already. Please check your inbox and spam folder.' });
  const ok = await sendVerify(req, req.customer);
  if (!ok) return res.status(502).json({ error: 'The email could not be sent. Please try again later.' });
  res.json({ ok: true });
}

/** POST /api/account/verify/confirm { code } (customer): confirms the email with the code. */
export async function confirmVerify(req, res) {
  if (req.customer.emailVerified === true) return res.json({ ok: true });
  if (!codeLimiter.hit(`v:${req.customer.id}`).ok) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });
  const code = String(req.body?.code ?? '').replace(/\s+/g, '');
  if (!CODE_RE.test(code)) return res.status(400).json({ error: 'Enter the 6-digit code from the email.', fields: ['code'] });
  const r = await useCode(req.customer, 'verify', code);
  if (r !== 'ok') return res.status(400).json({ error: r === 'wrong' ? 'That code is not right. Check the email and try again.' : 'This code has expired. Click Send again for a new one.', fields: ['code'], code: `code_${r}` });
  await mutateCustomer(req.customer.id, (x) => { x.emailVerified = true; });
  console.info(`[account] email confirmed id=${req.customer.id}`);
  res.json({ ok: true });
}

/** POST /api/admin/customers { email, name, phone, password, market? }: an account for a couple who did not order online.
 *  The phone (with its country code) is required, stored as E.164. */
export async function adminCreate(req, res) {
  const b = req.body || {};
  const email = normEmail(b.email);
  const name = nameOf(b.name, 80);
  const phone = phoneOf(b.phone, isMarket(b.market) ? b.market : 'np');
  const errors = [];
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) errors.push({ path: 'email', message: 'must be an email address' });
  if (name.length < 2) errors.push({ path: 'name', message: 'is required' });
  if (!phone) errors.push({ path: 'phone', message: 'must be a valid phone number with country code' });
  if (!passwordOk(b.password)) errors.push({ path: 'password', message: `must be ${ACCOUNT_PASSWORD_MIN}-${ACCOUNT_PASSWORD_MAX} characters` });
  if (errors.length) throw httpError(400, errors.length === 1 && errors[0].path === 'phone' ? PHONE_MSG : 'Please check the account details.', { errors });
  if (customerByEmail(email)) throw httpError(409, 'That email already has an account.');
  if (staffByEmail(email) || email === ADMIN_EMAIL) throw httpError(409, 'That email belongs to the team. Use another email.');
  if (b.market != null && b.market !== '' && !isMarket(b.market)) throw httpError(400, 'Please check the account details.', { errors: [{ path: 'market', message: "must be 'np' or 'intl'" }] });
  const market = isMarket(b.market) ? b.market : undefined;
  const c = await createCustomer({ email, name, phone, market, passwordHash: await hashAccountPassword(b.password) })
    .catch((err) => { throw err.code === 'account_exists' ? httpError(409, 'That email already has an account.') : err; });
  console.info(`[admin] customer created id=${c.id}`);
  res.status(201).json({ customer: await adminOut(c) });
}

/** PATCH /api/admin/customers/:id { name?, phone?, password?, disabled?, market? ('np' | 'intl' | '' = work it out) } */
export async function adminPatch(req, res) {
  const id = idParam(req);
  const b = req.body || {};
  const errors = [];
  if (b.name !== undefined && nameOf(b.name, 80).length < 2) errors.push({ path: 'name', message: 'is required' });
  // an older account may have no phone: '' keeps it empty, anything else must be a valid number (stored as E.164)
  if (b.phone !== undefined && (typeof b.phone !== 'string' || (b.phone.trim() && !checkPhone(b.phone, 'NP').ok && !checkPhone(b.phone, 'US').ok))) errors.push({ path: 'phone', message: 'must be a valid phone number with country code' });
  if (b.password !== undefined && !passwordOk(b.password)) errors.push({ path: 'password', message: `must be ${ACCOUNT_PASSWORD_MIN}-${ACCOUNT_PASSWORD_MAX} characters` });
  if (b.disabled !== undefined && typeof b.disabled !== 'boolean') errors.push({ path: 'disabled', message: 'must be true or false' });
  if (b.market !== undefined && b.market !== '' && b.market !== null && !isMarket(b.market)) errors.push({ path: 'market', message: "must be 'np', 'intl' or empty" });
  if (errors.length) throw httpError(400, 'Please check the account details.', { errors });
  if (b.password !== undefined && req.admin?.role !== 'super') throw httpError(403, 'Only a super admin can reset a customer’s password.');
  const passwordHash = b.password !== undefined ? await hashAccountPassword(b.password) : null;
  const c = await mutateCustomer(id, (x) => {
    if (b.name !== undefined) x.name = nameOf(b.name, 80);
    if (b.market !== undefined) { if (isMarket(b.market)) x.market = b.market; else delete x.market; }
    if (b.phone !== undefined) {
      const r = checkPhone(b.phone, x.market === 'intl' ? 'US' : 'NP');
      if (!r.ok) throw httpError(400, PHONE_MSG, { errors: [{ path: 'phone', message: 'must be a valid phone number with country code' }] });
      x.phone = r.e164; // '' removes it
    }
    if (passwordHash) x.passwordHash = passwordHash;
    if (b.disabled !== undefined) { x.disabled = b.disabled; if (b.disabled) x.disabledAt = new Date().toISOString(); else delete x.disabledAt; }
  });
  if (passwordHash || b.disabled === true) await revokeCustomerSessions(id);
  console.info(`[admin] customer changed id=${id}${passwordHash ? ' (password reset)' : ''}${b.disabled === true ? ' (turned off)' : b.disabled === false ? ' (turned on)' : ''}`);
  res.json({ customer: await adminOut(c) });
}

/** PUT /api/admin/customers/:id/invitations/:slug { themes?, canChangeTheme?, canChangeColors? }: link it (or change the perms). */
export async function adminLink(req, res) {
  const id = idParam(req);
  const { slug } = req.params;
  if (!SLUG_RE.test(slug) || !(await peekInvitation(slug))) throw httpError(404, 'No invitation with that link name.');
  const b = req.body || {};
  const errors = [];
  let themes;
  if (b.themes !== undefined) {
    if (b.themes === 'all') themes = 'all';
    else if (Array.isArray(b.themes) && b.themes.length <= 100 && b.themes.every((t) => typeof t === 'string' && isTheme(t))) themes = [...new Set(b.themes)];
    else errors.push({ path: 'themes', message: "must be 'all' or a list of theme slugs" });
  }
  for (const k of ['canChangeTheme', 'canChangeColors']) if (b[k] !== undefined && typeof b[k] !== 'boolean') errors.push({ path: k, message: 'must be true or false' });
  if (errors.length) throw httpError(400, 'Please check the access settings.', { errors });
  const c = await mutateCustomer(id, (x) => {
    x.invitations = Array.isArray(x.invitations) ? x.invitations : [];
    let l = linkOf(x, slug);
    if (!l) {
      if (x.invitations.length >= 20) throw httpError(400, 'An account can have at most 20 invitations.');
      l = { slug, themes: 'all', canChangeTheme: false, canChangeColors: true, linkedAt: new Date().toISOString() };
      x.invitations.push(l);
    }
    if (themes !== undefined) l.themes = themes;
    if (b.canChangeTheme !== undefined) l.canChangeTheme = b.canChangeTheme;
    if (b.canChangeColors !== undefined) l.canChangeColors = b.canChangeColors;
  });
  console.info(`[admin] customer ${id} linked to ${slug}`);
  // the names, date and venue the customer gave fill the invitation's still-empty fields
  const filled = await prefillFromCustomer(id, slug).catch((err) => { console.warn(`[admin] prefill failed: ${err.message}`); return []; });
  res.json({ customer: await adminOut(c), filled });
}

/** DELETE /api/admin/customers/:id/invitations/:slug */
export async function adminUnlink(req, res) {
  const id = idParam(req);
  const { slug } = req.params;
  const c = await mutateCustomer(id, (x) => {
    if (!linkOf(x, slug)) return false;
    x.invitations = x.invitations.filter((l) => l.slug !== slug);
  });
  console.info(`[admin] customer ${id} unlinked from ${slug}`);
  res.json({ customer: await adminOut(c) });
}



/** POST /api/admin/pending/link { email, slug }: the owner links a waiting invitation to the account with that email. */
export async function adminConfirmPending(req, res) {
  const email = normEmail(req.body?.email);
  const slug = typeof req.body?.slug === 'string' ? req.body.slug : '';
  if (!email || !SLUG_RE.test(slug)) throw httpError(400, 'Please send the email and the invitation.');
  const c = await confirmPending(email, slug, { unconfirmed: req.body?.unconfirmed === true });
  console.info(`[admin] pending invitation ${slug} linked to customer ${c.id}${c.emailVerified === true ? '' : ' (email not confirmed; planner chose to link)'}`);
  const filled = await prefillFromCustomer(c.id, slug).catch(() => []);
  res.json({ customer: await adminOut(c), filled });
}

/** POST /api/admin/pending/dismiss { email, slug }: the owner drops a waiting invitation link. */
export async function adminDismissPending(req, res) {
  const email = normEmail(req.body?.email);
  const slug = typeof req.body?.slug === 'string' ? req.body.slug : '';
  if (!email || !SLUG_RE.test(slug)) throw httpError(400, 'Please send the email and the invitation.');
  await dropPending((p) => p.email === email && p.slug === slug);
  console.info(`[admin] pending invitation ${slug} dismissed`);
  res.json({ ok: true });
}
