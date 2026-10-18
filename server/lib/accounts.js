// Customer accounts (email + password), kept by the store (lib/store.js: the `customers` table, or data/customers.json).
// A customer = { id, email (trimmed, NFC, lower case), name, phone, passwordHash (argon2id), createdAt, updatedAt,
//   lastLoginAt?, disabled, invitations: [{ slug, themes, canChangeTheme, canChangeColors, linkedAt }],
//   market? ('np' | 'intl': the website they signed up on; lib/market.js customerMarket reads it first) }.
// Data helpers only: sign-in lives in lib/auth.js, the routes in lib/customers.js.
import { randomBytes } from 'node:crypto';
import { customerStore, withLock, getDoc, putDoc, peekInvitation } from './store.js';
import { isMarket } from './market.js';

export const CUSTOMER_ID_RE = /^[A-Za-z0-9_-]{12}$/;
export const ACCOUNT_PASSWORD_MIN = 8;
export const ACCOUNT_PASSWORD_MAX = 128;
const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });

/** The one form of an email we store and look up. */
export const normEmail = (v) => (typeof v === 'string' ? v.normalize('NFC').trim().toLowerCase().slice(0, 300) : '');

/** A customer by id (a fresh copy), or null. */
export const getCustomer = (id) => (typeof id === 'string' && CUSTOMER_ID_RE.test(id) ? customerStore.get(id) : null);
/** A customer by normalised email, or null. */
export const customerByEmail = (email) => (email ? customerStore.byEmail(email) : null);
export const listCustomers = () => customerStore.all();

/** The customer's link to one invitation (with its perms), or null. */
export const linkOf = (c, slug) => (Array.isArray(c?.invitations) ? c.invitations.find((l) => l.slug === slug) || null : null);

/** Creates an account; 409 (code account_exists) when the email is taken. */
export function createCustomer({ email, name, phone = '', passwordHash, market, emailVerified = false }) {
  return withLock('customers', async () => {
    if (customerStore.byEmail(email)) throw httpError(409, 'This email already has an account. Sign in, or enter that account’s password.', { code: 'account_exists' });
    const now = new Date().toISOString();
    const c = { id: randomBytes(9).toString('base64url'), email, name, phone, passwordHash, createdAt: now, updatedAt: now, disabled: false, invitations: [] };
    if (isMarket(market)) c.market = market;
    if (emailVerified === true) c.emailVerified = true; // sign-up confirmed the email with a code first
    await customerStore.put(c);
    return c;
  });
}

/** Runs fn(customer) under the accounts lock and saves it; returns the saved customer. 404 when unknown. */
export function mutateCustomer(id, fn) {
  return withLock('customers', async () => {
    const c = getCustomer(id);
    if (!c) throw httpError(404, 'No account with that id.');
    if ((await fn(c)) === false) return c;
    c.updatedAt = new Date().toISOString();
    await customerStore.put(c);
    return c;
  });
}

/** Removes an invitation from every account and every pending link (the invitation was deleted). */
export async function unlinkEverywhere(slug) {
  await withLock('customers', async () => {
    for (const c of customerStore.all()) {
      if (!linkOf(c, slug)) continue;
      c.invitations = c.invitations.filter((l) => l.slug !== slug);
      await customerStore.put(c);
    }
  });
  await dropPending((p) => p.slug === slug);
}

/**
 * Links an invitation to an account (or updates the link's perms). perms: { themes, canChangeTheme, canChangeColors }.
 * Returns the saved customer.
 */
export function linkInvitation(id, slug, perms = {}) {
  return mutateCustomer(id, (x) => {
    x.invitations = Array.isArray(x.invitations) ? x.invitations : [];
    let l = linkOf(x, slug);
    if (!l) {
      if (x.invitations.length >= 20) throw httpError(400, 'An account can have at most 20 invitations.');
      l = { slug, themes: 'all', canChangeTheme: false, canChangeColors: true, linkedAt: new Date().toISOString() };
      x.invitations.push(l);
    }
    for (const k of ['themes', 'canChangeTheme', 'canChangeColors']) if (perms[k] !== undefined) l[k] = perms[k];
  });
}

// ── Pending links: an invitation made for an email that has no account yet ─────────────────────────────────────
// Kept in the store's small documents (`pending-links`): [{ email, slug, themes, canChangeTheme, canChangeColors, at }].
// NEVER claimed automatically: emails are not verified, so registering an email first is no proof of being that couple.
// Once an account with that email exists, the owner sees "… signed up: link the invitation?" (Overview, Customer
// accounts) and links it with one click (confirmPending), or dismisses it.

const PENDING_KEY = 'pending-links';
const PENDING_MAX = 2000;
const readPending = async () => {
  const v = (await getDoc(PENDING_KEY))?.value;
  return Array.isArray(v?.links) ? v.links : [];
};

/** Every pending link (admin views). */
export const listPending = () => readPending();

/** Adds (or replaces) the pending link of this invitation for this email. */
export function addPending(email, slug, perms = {}) {
  return withLock(`kv:${PENDING_KEY}:edit`, async () => {
    const links = (await readPending()).filter((p) => !(p.email === email && p.slug === slug));
    if (links.length >= PENDING_MAX) throw httpError(507, 'Too many invitations are waiting for an account.');
    links.push({ email, slug, themes: perms.themes ?? 'all', canChangeTheme: perms.canChangeTheme ?? true, canChangeColors: perms.canChangeColors ?? true, at: new Date().toISOString() });
    await putDoc(PENDING_KEY, { links });
    return links.at(-1);
  });
}

/** Removes the pending links that match. */
export function dropPending(match) {
  return withLock(`kv:${PENDING_KEY}:edit`, async () => {
    const links = await readPending();
    const keep = links.filter((p) => !match(p));
    if (keep.length !== links.length) await putDoc(PENDING_KEY, { links: keep });
  });
}

/**
 * The owner confirms a pending link: the invitation is linked to the account with that email (with the perms kept on
 * the pending link) and the pending link goes. 404 when there is no such pending link, or no account for the email yet.
 */
export async function confirmPending(email, slug, { unconfirmed = false } = {}) {
  const p = (await readPending()).find((x) => x.email === email && x.slug === slug);
  if (!p) throw httpError(404, 'That invitation is not waiting for this email any more.');
  const c = customerByEmail(email);
  if (!c) throw httpError(404, 'No account with that email yet.');
  // anyone can sign up with any email: an account that has not confirmed it is linked only when the planner says so
  if (c.emailVerified !== true && !unconfirmed) throw Object.assign(httpError(409, 'This account has not confirmed its email yet. Link it only if you are sure it is your customer.'), { code: 'unconfirmed' });
  if (!(await peekInvitation(slug))) { await dropPending((x) => x.slug === slug); throw httpError(404, 'That invitation was deleted.'); }
  const saved = await linkInvitation(c.id, slug, { themes: p.themes, canChangeTheme: p.canChangeTheme, canChangeColors: p.canChangeColors });
  await dropPending((x) => x.email === email && x.slug === slug);
  return saved;
}

/** slug -> [{ id, email, name }] for the admin's invitation list. */
export function customersBySlug() {
  const out = new Map();
  for (const c of customerStore.all()) {
    for (const l of c.invitations || []) {
      if (!out.has(l.slug)) out.set(l.slug, []);
      out.get(l.slug).push({ id: c.id, email: c.email, name: c.name });
    }
  }
  return out;
}

/** What the admin sees (never the hash). where: { market, country } (lib/market.js; from the account, orders, phone). */
export const adminCustomer = (c, orders = 0, where = {}) => ({
  id: c.id, email: c.email, name: c.name || '', phone: c.phone || '', createdAt: c.createdAt, lastLoginAt: c.lastLoginAt || null,
  market: where.market || (isMarket(c.market) ? c.market : 'np'), marketSet: isMarket(c.market), country: where.country || '',
  emailVerified: c.emailVerified === true,
  loginCount: Number(c.loginCount) || (c.lastLoginAt ? 1 : 0), logins: Array.isArray(c.logins) ? c.logins.slice(0, 20) : [],
  disabled: c.disabled === true, orders,
  invitations: (c.invitations || []).map(({ slug, themes, canChangeTheme, canChangeColors, linkedAt }) => ({ slug, themes, canChangeTheme, canChangeColors, linkedAt })),
});
