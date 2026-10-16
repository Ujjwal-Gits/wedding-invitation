// Customer accounts (email + password), kept by the store (lib/store.js: the `customers` table, or data/customers.json).
// A customer = { id, email (trimmed, NFC, lower case), name, phone, passwordHash (argon2id), createdAt, updatedAt,
//   lastLoginAt?, disabled, invitations: [{ slug, themes, canChangeTheme, canChangeColors, linkedAt }] }.
// Data helpers only: sign-in lives in lib/auth.js, the routes in lib/customers.js.
import { randomBytes } from 'node:crypto';
import { customerStore, withLock } from './store.js';

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
export function createCustomer({ email, name, phone = '', passwordHash }) {
  return withLock('customers', async () => {
    if (customerStore.byEmail(email)) throw httpError(409, 'This email already has an account. Sign in, or enter that account’s password.', { code: 'account_exists' });
    const now = new Date().toISOString();
    const c = { id: randomBytes(9).toString('base64url'), email, name, phone, passwordHash, createdAt: now, updatedAt: now, disabled: false, invitations: [] };
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

/** Removes an invitation from every account (the invitation was deleted). */
export function unlinkEverywhere(slug) {
  return withLock('customers', async () => {
    for (const c of customerStore.all()) {
      if (!linkOf(c, slug)) continue;
      c.invitations = c.invitations.filter((l) => l.slug !== slug);
      await customerStore.put(c);
    }
  });
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

/** What the admin sees (never the hash). */
export const adminCustomer = (c, orders = 0) => ({
  id: c.id, email: c.email, name: c.name || '', phone: c.phone || '', createdAt: c.createdAt, lastLoginAt: c.lastLoginAt || null,
  disabled: c.disabled === true, orders,
  invitations: (c.invitations || []).map(({ slug, themes, canChangeTheme, canChangeColors, linkedAt }) => ({ slug, themes, canChangeTheme, canChangeColors, linkedAt })),
});
