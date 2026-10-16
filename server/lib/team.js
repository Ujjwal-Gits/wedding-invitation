// The Team page (super admins only): add admins, set their role and permissions, turn them off, reset a password,
// remove them. The env owner (ADMIN_EMAIL) is listed but locked. Data helpers: lib/staff.js. Sign-in: lib/auth.js.
//   GET    /api/admin/team
//   POST   /api/admin/team        { email, name, password, role: 'super' | 'admin', perms: [key] }
//   PATCH  /api/admin/team/:id    { name?, role?, perms?, disabled?, password? }
//   DELETE /api/admin/team/:id
// Any change to a member's role, permissions, password or on/off state ends their sessions at once.
import { ADMIN_EMAIL } from './env.js';
import { EMAIL_RE } from './site.js';
import { normEmail, customerByEmail } from './accounts.js';
import { hashAccountPassword, revokeStaffSessions } from './auth.js';
import {
  PERMS, PERM_KEYS, STAFF_ID_RE, STAFF_PASSWORD_MIN, STAFF_PASSWORD_MAX,
  getStaff, staffByEmail, listStaff, createStaff, mutateStaff, deleteStaff, staffView, cleanPerms,
} from './staff.js';

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const nameOf = (v) => (typeof v === 'string' ? v.normalize('NFC').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 80) : '');
const passwordOk = (p) => typeof p === 'string' && p.length >= STAFF_PASSWORD_MIN && p.length <= STAFF_PASSWORD_MAX;
const PASSWORD_MSG = `must be ${STAFF_PASSWORD_MIN}-${STAFF_PASSWORD_MAX} characters`;
const ROLES = ['super', 'admin'];
const roleText = (x) => (x.role === 'super' ? 'Super admin' : `Admin (${cleanPerms(x.perms).join(', ') || 'no areas'})`);
const permsValid = (v) => Array.isArray(v) && v.length <= PERM_KEYS.length * 2 && v.every((k) => typeof k === 'string' && PERM_KEYS.includes(k));
const idParam = (req) => {
  if (!STAFF_ID_RE.test(req.params.id || '')) throw httpError(404, 'No team member with that id.');
  return req.params.id;
};

/** GET /api/admin/team */
export function list(req, res) {
  const staff = listStaff().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))).map(staffView);
  res.json({
    owner: { id: 'owner', email: ADMIN_EMAIL, name: 'Owner', role: 'super', locked: true },
    staff,
    perms: PERMS,
    me: req.admin.id,
  });
}

/** POST /api/admin/team */
export async function create(req, res) {
  const b = req.body || {};
  const email = normEmail(b.email);
  const name = nameOf(b.name);
  const role = ROLES.includes(b.role) ? b.role : null;
  const errors = [];
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) errors.push({ path: 'email', message: 'must be an email address' });
  if (name.length < 2) errors.push({ path: 'name', message: 'is required' });
  if (!passwordOk(b.password)) errors.push({ path: 'password', message: PASSWORD_MSG });
  if (!role) errors.push({ path: 'role', message: "must be 'super' or 'admin'" });
  if (role === 'admin' && b.perms !== undefined && !permsValid(b.perms)) errors.push({ path: 'perms', message: 'has an unknown permission' });
  if (errors.length) throw httpError(400, 'Please check the details.', { errors });
  if (email === ADMIN_EMAIL) throw httpError(409, 'That is the owner’s email.');
  if (staffByEmail(email)) throw httpError(409, 'That email is already on the team.');
  // One email, one sign-in: a staff email would hide the customer account with the same email.
  if (customerByEmail(email)) throw httpError(409, 'That email has a customer account. Use another email for the team.');
  const x = await createStaff({ email, name, passwordHash: await hashAccountPassword(b.password), role, perms: b.perms || [], createdBy: req.admin.email });
  console.info(`[team] added id=${x.id} role=${x.role} by=${req.admin.id}`);
  res.locals.auditLabel = `Added ${x.name} (${x.email}) as ${roleText(x)}`;
  res.locals.auditTarget = x.id;
  res.status(201).json({ member: staffView(x) });
}

/** PATCH /api/admin/team/:id */
export async function patch(req, res) {
  const id = idParam(req);
  const b = req.body || {};
  const errors = [];
  if (b.name !== undefined && nameOf(b.name).length < 2) errors.push({ path: 'name', message: 'is required' });
  if (b.role !== undefined && !ROLES.includes(b.role)) errors.push({ path: 'role', message: "must be 'super' or 'admin'" });
  if (b.perms !== undefined && !permsValid(b.perms)) errors.push({ path: 'perms', message: 'has an unknown permission' });
  if (b.disabled !== undefined && typeof b.disabled !== 'boolean') errors.push({ path: 'disabled', message: 'must be true or false' });
  if (b.password !== undefined && !passwordOk(b.password)) errors.push({ path: 'password', message: PASSWORD_MSG });
  if (errors.length) throw httpError(400, 'Please check the details.', { errors });
  const self = id === req.admin.id;
  if (self && (b.disabled === true || (b.role !== undefined && b.role !== 'super') || b.perms !== undefined)) {
    throw httpError(400, 'You cannot turn off or limit your own account. Ask another super admin.');
  }
  if (!getStaff(id)) throw httpError(404, 'No team member with that id.');
  const passwordHash = b.password !== undefined ? await hashAccountPassword(b.password) : null;
  const changed = [];
  const x = await mutateStaff(id, (m) => {
    if (b.name !== undefined && nameOf(b.name) !== m.name) { m.name = nameOf(b.name); changed.push('name'); }
    if (b.role !== undefined && b.role !== m.role) { m.role = b.role; changed.push('role'); }
    if (m.role === 'super') m.perms = [];
    else if (b.perms !== undefined) {
      const next = cleanPerms(b.perms);
      if (next.join() !== cleanPerms(m.perms).join()) changed.push('perms');
      m.perms = next;
    }
    if (b.disabled !== undefined && b.disabled !== (m.disabled === true)) {
      m.disabled = b.disabled;
      changed.push(b.disabled ? 'turned off' : 'turned on');
      if (b.disabled) m.disabledAt = new Date().toISOString(); else delete m.disabledAt;
    }
    if (passwordHash) { m.passwordHash = passwordHash; changed.push('password'); }
    if (!changed.length) return false;
  });
  // the session fingerprint already refuses older sessions; deleting them keeps the store tidy and is immediate
  if (changed.some((c) => c === 'role' || c === 'perms' || c === 'password' || c === 'turned off')) await revokeStaffSessions(id);
  console.info(`[team] changed id=${id} (${changed.join(', ') || 'nothing'}) by=${req.admin.id}`);
  const what = changed.map((c) => (c === 'perms' || c === 'role' ? `${c === 'perms' ? 'access' : 'role'}: ${roleText(x)}` : c === 'password' ? 'password reset' : c));
  res.locals.auditLabel = `Changed ${x.name} (${x.email})${what.length ? `: ${[...new Set(what)].join('; ')}` : ''}`;
  res.locals.auditTarget = x.id;
  res.json({ member: staffView(x) });
}

/** DELETE /api/admin/team/:id */
export async function remove(req, res) {
  const id = idParam(req);
  if (id === req.admin.id) throw httpError(400, 'You cannot remove your own account. Ask another super admin.');
  const x = getStaff(id);
  if (!x) throw httpError(404, 'No team member with that id.');
  await deleteStaff(id);
  await revokeStaffSessions(id);
  console.info(`[team] removed id=${id} by=${req.admin.id}`);
  res.locals.auditLabel = `Removed ${x.name} (${x.email})`;
  res.locals.auditTarget = id;
  res.json({ ok: true });
}
