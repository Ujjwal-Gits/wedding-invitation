// Staff accounts: more admins next to the owner (the env owner, ADMIN_EMAIL, stays the one super admin nobody can
// remove or limit). Kept by the store (lib/store.js: the `staff` table, or data/staff.json).
// A staff member = { id, email (normalised), name, passwordHash (argon2id), role: 'super' | 'admin', perms: [key],
//   disabled, createdAt, updatedAt, createdBy, lastLoginAt? }. Data helpers only: sign-in and the permission checks live
// in lib/auth.js, the Team routes in lib/team.js. docs/API.md "Team and permissions".
import { randomBytes } from 'node:crypto';
import { staffStore, withLock } from './store.js';

export const STAFF_ID_RE = /^[A-Za-z0-9_-]{12}$/;
export const STAFF_PASSWORD_MIN = 10;
export const STAFF_PASSWORD_MAX = 128;

/**
 * What an "Admin" can be given (a checklist). A "Super admin" has all of them plus `team` and `audit`, which are never
 * given one by one. Every admin route on the server maps to one of these (server/index.js); unmapped admin routes need
 * a super admin.
 */
export const PERMS = [
  { key: 'invitations', label: 'Invitations', help: 'Invitations, clients and access links' },
  { key: 'replies', label: 'Replies', help: 'Guest replies' },
  { key: 'customers', label: 'Customers', help: 'Customer accounts, their market and phone' },
  { key: 'orders', label: 'Orders', help: 'Orders, enquiries and quotes, payment checks, figures by market' },
  { key: 'finance', label: 'Finance', help: 'Money pages, per market' },
  { key: 'website', label: 'Website', help: 'Both websites: plans per market, payment methods, contact, headlines' },
  { key: 'themes', label: 'Themes', help: 'Designs per market: shown, featured, order, style' },
  { key: 'music', label: 'Music', help: 'The music library' },
];
export const PERM_KEYS = PERMS.map((p) => p.key);
/** Only super admins: managing the team, and reading the audit log. */
export const SUPER_ONLY = ['team', 'audit'];
export const ALL_PERMS = [...PERM_KEYS, ...SUPER_ONLY];

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });

/** The known permission keys in `list`, in the standard order (unknown keys dropped). */
export const cleanPerms = (list) => (Array.isArray(list) ? PERM_KEYS.filter((k) => list.includes(k)) : []);
/** Everything this staff member may do. */
export const permsOfStaff = (x) => (x.role === 'super' ? [...ALL_PERMS] : cleanPerms(x.perms));

export const getStaff = (id) => (typeof id === 'string' && STAFF_ID_RE.test(id) ? staffStore.get(id) : null);
export const staffByEmail = (email) => (email ? staffStore.byEmail(email) : null);
export const listStaff = () => staffStore.all();

/** Creates a staff member; 409 when the email is taken. */
export function createStaff({ email, name, passwordHash, role, perms, createdBy }) {
  return withLock('staff', async () => {
    if (staffStore.byEmail(email)) throw httpError(409, 'That email is already on the team.');
    const now = new Date().toISOString();
    const x = { id: randomBytes(9).toString('base64url'), email, name, passwordHash, role, perms: role === 'super' ? [] : cleanPerms(perms), disabled: false, createdAt: now, updatedAt: now, createdBy };
    await staffStore.put(x);
    return x;
  });
}

/** Runs fn(staff) under the team lock and saves it; returns the saved record. 404 when unknown. */
export function mutateStaff(id, fn) {
  return withLock('staff', async () => {
    const x = getStaff(id);
    if (!x) throw httpError(404, 'No team member with that id.');
    if ((await fn(x)) === false) return x;
    x.updatedAt = new Date().toISOString();
    await staffStore.put(x);
    return x;
  });
}

export function deleteStaff(id) {
  return withLock('staff', async () => {
    if (!getStaff(id)) throw httpError(404, 'No team member with that id.');
    await staffStore.del(id);
  });
}

/** What the Team page sees (never the hash). */
export const staffView = (x) => ({
  id: x.id, email: x.email, name: x.name || '', role: x.role === 'super' ? 'super' : 'admin', perms: permsOfStaff(x),
  disabled: x.disabled === true, createdAt: x.createdAt, updatedAt: x.updatedAt, lastLoginAt: x.lastLoginAt || null,
});
