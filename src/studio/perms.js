// What the signed-in admin may open (from POST /api/auth/login or GET /api/auth/me: superAdmin, perms). Only hides
// what they cannot use; the server checks every request (server/index.js, docs/API.md "Team and permissions").
let me = null;

/** Called by main.js whenever the signed-in user is known (null when signed out). */
export const setAdmin = (m) => { me = m?.role === 'admin' ? m : null; };

/** Whether the admin may use one area: invitations, replies, customers, orders, finance, website, themes, music, team, audit. */
export function can(perm) {
  if (!me) return false;
  if (me.superAdmin || !Array.isArray(me.perms)) return true; // a server without staff accounts: the owner
  return me.perms.includes(perm);
}
export const canAny = (...perms) => perms.some(can);
/** At least one area (an Admin with an empty checklist sees only Overview and Settings). */
export const canSomething = () => Boolean(me) && (me.superAdmin || !Array.isArray(me.perms) || me.perms.length > 0);

/** 'Owner' | 'Super admin' | 'Admin', for the account box and Settings. */
export const roleName = () => (!me ? '' : me.owner || !Array.isArray(me.perms) ? 'Owner' : me.superAdmin ? 'Super admin' : 'Admin');
