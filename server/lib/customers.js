// Customer accounts: the customer's own dashboard data (GET /api/account, ...) and the planner's account admin
// (GET/POST/PATCH /api/admin/customers, linking invitations). Data helpers: lib/accounts.js. Sign-in: lib/auth.js.
import { EMAIL_RE, readSite } from './site.js';
import { isTheme } from './catalog.js';
import { peekInvitation, listOrders, withLock, getOrderByRef, saveOrder, SLUG_RE } from './store.js';
import {
  customerByEmail, createCustomer, mutateCustomer, listCustomers, adminCustomer, linkOf, normEmail, listPending, confirmPending, dropPending,
  CUSTOMER_ID_RE, ACCOUNT_PASSWORD_MIN, ACCOUNT_PASSWORD_MAX,
} from './accounts.js';
import { syncOrderDetails, prefillFromCustomer } from './handover.js';
import { PUBLIC_ORIGINS } from './env.js';
import { hashAccountPassword, revokeCustomerSessions, permsOf, checkCustomer, signInCustomer, loginThrottle } from './auth.js';
import { clientIp } from './security.js';
import { clean, planView, REF_RE } from './orders.js';

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const PHONE_RE = /^[0-9+()\-\s]{6,20}$/;
const passwordOk = (p) => typeof p === 'string' && p.length >= ACCOUNT_PASSWORD_MIN && p.length <= ACCOUNT_PASSWORD_MAX;
const PASSWORD_MSG = `The password must be ${ACCOUNT_PASSWORD_MIN}-${ACCOUNT_PASSWORD_MAX} characters.`;

// ── The customer ───────────────────────────────────────────────────────────

const payStatusOf = (o) => o.pay?.status || (o.payment?.status === 'paid' ? 'confirmed' : o.payment?.status === 'refunded' ? 'refunded' : 'awaiting_payment');

/** An order as its customer sees it: no token hash, no admin notes, no proof files. */
export function customerOrderView(o) {
  const status = payStatusOf(o);
  const out = {
    ref: o.ref, at: o.at, kind: o.kind, plan: planView(o), amount: o.amount || { npr: null, usd: null },
    message: o.message || '', payStatus: status, reason: status === 'rejected' ? o.pay?.reason || null : null,
    payUrl: o.ref ? `/pay/${o.ref}` : null,
  };
  for (const k of ['theme', 'weddingDate', 'venue', 'bride', 'groom', 'invitation']) if (o[k]) out[k] = o[k];
  return out;
}

const ordersOf = async (cid) => (await listOrders()).filter((o) => o.customerId === cid && o.ref)
  .sort((a, b) => String(b.at).localeCompare(String(a.at)));

/** GET /api/account (customer): their details, orders and invitations. */
export async function account(req, res) {
  const c = req.customer;
  const [orders, site] = await Promise.all([ordersOf(c.id), readSite()]);
  const invitations = [];
  for (const l of c.invitations || []) {
    const doc = await peekInvitation(l.slug);
    if (!doc) continue;
    const d = doc.draft;
    // the order this invitation belongs to (its own, else the newest), for the plan and the payment on its card
    const o = orders.find((x) => x.invitation === doc.slug) || orders[0] || null;
    const live = doc.status === 'published';
    invitations.push({
      slug: doc.slug, bride: d.couple?.bride?.name || null, groom: d.couple?.groom?.name || null, theme: d.theme,
      status: doc.status, weddingDate: d.weddingDate || null, updatedAt: doc.updatedAt, perms: permsOf(l),
      plan: o ? planView(o) : null, payStatus: o ? payStatusOf(o) : null, payUrl: o?.ref ? `/pay/${o.ref}` : null, orderRef: o?.ref || null,
      previewUrl: `/${d.theme}/?id=${doc.slug}`, shareUrl: live ? `${PUBLIC_ORIGINS[0] || ''}/i/${doc.slug}` : null,
    });
  }
  res.json({
    customer: { name: c.name || '', email: c.email, phone: c.phone || '' },
    orders: orders.map(customerOrderView),
    invitations,
    contact: { whatsapp: site.contact?.whatsapp || '', phone: site.contact?.phone || '' },
  });
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
  if (fields.length) return res.status(400).json({ error: 'Please check the form.', fields: [...new Set(fields)] });
  const order = await withLock('orders', async () => {
    const o = await getOrderByRef(ref);
    if (!o || o.customerId !== req.customer.id) throw httpError(404, 'Order not found.');
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

const orderCounts = async () => {
  const n = new Map();
  for (const o of await listOrders()) if (o.customerId) n.set(o.customerId, (n.get(o.customerId) || 0) + 1);
  return n;
};
const idParam = (req) => {
  if (!CUSTOMER_ID_RE.test(req.params.id || '')) throw httpError(404, 'No account with that id.');
  return req.params.id;
};
const nameOf = (v, max) => (typeof v === 'string' ? clean(v, max) : '');

/** GET /api/admin/customers */
export async function adminList(req, res) {
  const counts = await orderCounts();
  const list = listCustomers().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  // invitations waiting for an email; `account` once an account with that email exists (the owner confirms the link)
  const pending = (await listPending()).map(({ email, slug, at }) => {
    const c = customerByEmail(email);
    return { email, slug, at, account: c ? { id: c.id, name: c.name || '', email: c.email, createdAt: c.createdAt } : null };
  });
  res.json({ customers: list.map((c) => adminCustomer(c, counts.get(c.id) || 0)), pending });
}

/** POST /api/admin/customers { email, name, phone?, password }: an account for a couple who did not order online. */
export async function adminCreate(req, res) {
  const b = req.body || {};
  const email = normEmail(b.email);
  const name = nameOf(b.name, 80);
  const phone = nameOf(b.phone, 20);
  const errors = [];
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) errors.push({ path: 'email', message: 'must be an email address' });
  if (name.length < 2) errors.push({ path: 'name', message: 'is required' });
  if (phone && !PHONE_RE.test(phone)) errors.push({ path: 'phone', message: 'must be a phone number' });
  if (!passwordOk(b.password)) errors.push({ path: 'password', message: `must be ${ACCOUNT_PASSWORD_MIN}-${ACCOUNT_PASSWORD_MAX} characters` });
  if (errors.length) throw httpError(400, 'Please check the account details.', { errors });
  if (customerByEmail(email)) throw httpError(409, 'That email already has an account.');
  const c = await createCustomer({ email, name, phone, passwordHash: await hashAccountPassword(b.password) })
    .catch((err) => { throw err.code === 'account_exists' ? httpError(409, 'That email already has an account.') : err; });
  console.info(`[admin] customer created id=${c.id}`);
  res.status(201).json({ customer: adminCustomer(c) });
}

/** PATCH /api/admin/customers/:id { name?, phone?, password?, disabled? } */
export async function adminPatch(req, res) {
  const id = idParam(req);
  const b = req.body || {};
  const errors = [];
  if (b.name !== undefined && nameOf(b.name, 80).length < 2) errors.push({ path: 'name', message: 'is required' });
  if (b.phone !== undefined && (typeof b.phone !== 'string' || (nameOf(b.phone, 20) && !PHONE_RE.test(nameOf(b.phone, 20))))) errors.push({ path: 'phone', message: 'must be a phone number' });
  if (b.password !== undefined && !passwordOk(b.password)) errors.push({ path: 'password', message: `must be ${ACCOUNT_PASSWORD_MIN}-${ACCOUNT_PASSWORD_MAX} characters` });
  if (b.disabled !== undefined && typeof b.disabled !== 'boolean') errors.push({ path: 'disabled', message: 'must be true or false' });
  if (errors.length) throw httpError(400, 'Please check the account details.', { errors });
  const passwordHash = b.password !== undefined ? await hashAccountPassword(b.password) : null;
  const c = await mutateCustomer(id, (x) => {
    if (b.name !== undefined) x.name = nameOf(b.name, 80);
    if (b.phone !== undefined) x.phone = nameOf(b.phone, 20);
    if (passwordHash) x.passwordHash = passwordHash;
    if (b.disabled !== undefined) { x.disabled = b.disabled; if (b.disabled) x.disabledAt = new Date().toISOString(); else delete x.disabledAt; }
  });
  if (passwordHash || b.disabled === true) await revokeCustomerSessions(id);
  console.info(`[admin] customer changed id=${id}${passwordHash ? ' (password reset)' : ''}${b.disabled === true ? ' (turned off)' : b.disabled === false ? ' (turned on)' : ''}`);
  res.json({ customer: adminCustomer(c, (await orderCounts()).get(id) || 0) });
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
  res.json({ customer: adminCustomer(c, (await orderCounts()).get(id) || 0), filled });
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
  res.json({ customer: adminCustomer(c, (await orderCounts()).get(id) || 0) });
}



/** POST /api/admin/pending/link { email, slug }: the owner links a waiting invitation to the account with that email. */
export async function adminConfirmPending(req, res) {
  const email = normEmail(req.body?.email);
  const slug = typeof req.body?.slug === 'string' ? req.body.slug : '';
  if (!email || !SLUG_RE.test(slug)) throw httpError(400, 'Please send the email and the invitation.');
  const c = await confirmPending(email, slug);
  console.info(`[admin] pending invitation ${slug} linked to customer ${c.id}`);
  const filled = await prefillFromCustomer(c.id, slug).catch(() => []);
  res.json({ customer: adminCustomer(c, (await orderCounts()).get(c.id) || 0), filled });
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
