// Studio authentication: server-side sessions in an HttpOnly cookie, rotated on login,
// with a synchronizer CSRF token bound to each session. Sessions persist across restarts (lib/sessions.js)
// and slide: the planner 30 days, a couple 180 days since last activity, until they sign out.
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { hash as argonHashRaw } from '@node-rs/argon2';
import { verify as bcryptVerify } from '@node-rs/bcrypt';
import { IS_PROD, ADMIN_EMAIL, ADMIN_PASSWORD_HASH } from './env.js';
import { rateLimiter, originAllowed, clientIp } from './security.js';
import { peekInvitation, findInvitationByTokenHash } from './store.js';
// argon2 runs through a capped queue (lib/guard.js): a burst of sign-in attempts gets 503s, never every core.
import { verifyPassword as argonVerify, hashPassword as argonHash, mimicVerify } from './guard.js';
import { TTL, keyOf, expired, getSession, putSession, deleteSession, deleteSessionsWhere, touchSession } from './sessions.js';
import { getCustomer, customerByEmail, normEmail, linkOf, mutateCustomer } from './accounts.js';
import { getStaff, staffByEmail, mutateStaff, permsOfStaff, ALL_PERMS, SUPER_ONLY } from './staff.js';
import { recordAudit, actorOf } from './audit.js';

export const COOKIE = IS_PROD ? '__Host-studio' : 'studio_sid';
const sha = (s) => createHash('sha256').update(s).digest('hex');
/** A failed check counts as "no", but "server busy" (503 from the argon2 queue) is passed on as is. */
const busyOr = (v) => (err) => { if (err?.status === 503) throw err; return v; };
const newId = () => randomBytes(32).toString('base64url'); // 256-bit session ids and CSRF tokens

/**
 * Fingerprints bind a stored session to the credentials it was opened with. The planner's changes when
 * ADMIN_EMAIL or ADMIN_PASSWORD_HASH change; a couple's when their link is replaced or its password changes,
 * so such a session stops working even if it was not deleted.
 */
const ADMIN_FP = sha(`admin\n${ADMIN_EMAIL}\n${ADMIN_PASSWORD_HASH}`);
const linkFp = (access) => sha(`client\n${access?.tokenHash || ''}\n${access?.passwordHash || ''}`);
const linkActive = (doc, s) => Boolean(doc?.access?.tokenHash) && safeEqual(linkFp(doc.access), s.fp);
const maxAge = (role) => Math.floor(TTL[role] / 1000);
/** A customer's session is bound to their id and password hash: a new password ends every older session. */
const customerFp = (c) => sha(`customer\n${c.id}\n${c.passwordHash || ''}`);
/**
 * A staff session is bound to the member's id, password hash, role, permissions and on/off state: changing any of them
 * ends every older session of theirs (they are also deleted, revokeStaffSessions).
 */
const staffFp = (x) => sha(`staff\n${x.id}\n${x.passwordHash || ''}\n${x.role}\n${[...(x.perms || [])].sort().join(',')}\n${x.disabled === true ? 1 : 0}`);
/** The env owner: the one super admin nobody can remove or limit. */
const OWNER = Object.freeze({ id: 'owner', owner: true, email: ADMIN_EMAIL, name: 'Owner', role: 'super', perms: ALL_PERMS });
/**
 * Who is behind an admin session: { id, owner?, email, name, role: 'super' | 'admin', perms }, or null (a staff member
 * gone, turned off or changed since, or the owner's credentials changed in .env).
 */
function adminOf(s) {
  if (s.sid) {
    const x = getStaff(s.sid);
    if (!x || x.disabled === true || !safeEqual(staffFp(x), s.fp)) return null;
    return { id: x.id, email: x.email, name: x.name || '', role: x.role === 'super' ? 'super' : 'admin', perms: permsOfStaff(x) };
  }
  return safeEqual(s.fp, ADMIN_FP) ? OWNER : null;
}
/** The account behind a customer session, or null (gone, turned off, or the password changed since). */
const liveCustomer = (s) => {
  const c = getCustomer(s.cid);
  return c && c.disabled !== true && safeEqual(customerFp(c), s.fp) ? c : null;
};

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/** Sets (or clears, maxAgeSec 0) the session cookie, replacing any earlier one in this response. */
function setCookie(res, value, maxAgeSec) {
  const attrs = [`${COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (IS_PROD) attrs.push('Secure');
  const prev = [].concat(res.getHeader('Set-Cookie') || []).filter((c) => !String(c).startsWith(`${COOKIE}=`));
  res.setHeader('Set-Cookie', [...prev, attrs.join('; ')]);
}

/** Middleware: attaches req.session (or null) for a valid, unexpired session. */
export function loadSession(req, res, next) {
  const id = parseCookies(req.headers.cookie)[COOKIE];
  req.session = null;
  req.customer = null;
  req.admin = null;
  if (id && /^[A-Za-z0-9_-]{43}$/.test(id)) {
    const k = keyOf(id);
    const s = getSession(k);
    const now = Date.now();
    const customer = s?.role === 'customer' ? liveCustomer(s) : null;
    const admin = s?.role === 'admin' ? adminOf(s) : null;
    if (s && !expired(s, now) && (s.role !== 'admin' || admin) && (s.role !== 'customer' || customer)) {
      req.session = s;
      req.customer = customer;
      req.admin = admin;
      req.sessionKey = k;
      // Sliding expiry: every SEEN_EVERY, save `seen` and re-send the cookie so the browser keeps it as long.
      if (touchSession(s, now)) setCookie(res, id, maxAge(s.role));
    } else if (s) {
      deleteSession(k);
    }
  }
  next();
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

/** CSRF token + same-site Origin on every state-changing request. Returns an error message or null. */
function csrfProblem(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return null;
  const token = req.get('x-csrf-token');
  if (!token || !safeEqual(token, req.session.csrf)) return 'Your session token is out of date. Reload the page.';
  if (req.get('origin') && !originAllowed(req)) return 'Cross-site request refused.';
  return null;
}

export const isAdmin = (req) => req.session?.role === 'admin';
/**
 * Whether this admin may use one area (a key of lib/staff.js PERMS, or 'team' / 'audit'). Super admins (the owner
 * among them) may use everything; 'team' and 'audit' are theirs alone.
 */
export function hasPerm(req, perm) {
  const a = isAdmin(req) ? req.admin : null;
  if (!a) return false;
  if (a.role === 'super') return true;
  return !SUPER_ONLY.includes(perm) && a.perms.includes(perm);
}
/** An admin with 'invitations', the couple of this one invitation (client link), or a customer account it is linked to. */
export const canEdit = (req, slug) => (isAdmin(req) && hasPerm(req, 'invitations'))
  || (req.session?.role === 'client' && req.session.slug === slug)
  || (req.session?.role === 'customer' && Boolean(linkOf(req.customer, slug)));

/** What a couple may change on this invitation (client link or account link); null for the planner. */
export function permsFor(req, doc) {
  if (isAdmin(req)) return null;
  if (req.session?.role === 'customer') return permsOf(linkOf(req.customer, doc.slug));
  return permsOf(doc.access);
}

/** Middleware: a signed-in customer (account). */
export function requireCustomer(req, res, next) {
  if (!req.session) return res.status(401).json({ error: 'Please sign in.' });
  if (req.session.role !== 'customer' || !req.customer) return res.status(403).json({ error: 'Please sign in with your email and password.' });
  const bad = csrfProblem(req);
  if (bad) return res.status(403).json({ error: bad });
  next();
}

const NO_ACCESS = 'You do not have access to this. Ask the owner to give it to you.';
/** An admin-only guard: signed in, an admin, ok(req), then CSRF. */
const adminGuard = (ok) => (req, res, next) => {
  if (!req.session) return res.status(401).json({ error: 'Please sign in.' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only the planner can do that.' });
  if (!ok(req)) return res.status(403).json({ error: NO_ACCESS, code: 'no_access' });
  const bad = csrfProblem(req);
  if (bad) return res.status(403).json({ error: bad });
  next();
};

/** Middleware: an admin with every one of these permissions (lib/staff.js PERMS). */
export const requirePerm = (...perms) => adminGuard((req) => perms.every((p) => hasPerm(req, p)));
/** Middleware: an admin with at least one of these permissions. */
export const requireAnyPerm = (...perms) => adminGuard((req) => perms.some((p) => hasPerm(req, p)));
/** Middleware: a super admin (the owner, or staff with the Super admin role). */
export const requireSuper = adminGuard((req) => req.admin?.role === 'super');

/**
 * Marks a group of routes as one permission's area (server/index.js mounts it on a path prefix, e.g. /admin/finance).
 * requireAdmin inside such an area lets admins with that permission through.
 */
export const adminArea = (perm) => (req, res, next) => { req.adminArea = perm; next(); };

/**
 * Middleware: a super admin, or, inside an area marked with adminArea(perm), an admin with that permission.
 * The safe default for any admin route that is not mapped to a permission.
 */
export const requireAdmin = adminGuard((req) => req.admin?.role === 'super' || (Boolean(req.adminArea) && hasPerm(req, req.adminArea)));

/** Middleware: anyone signed in (planner or couple). */
export function requireSession(req, res, next) {
  if (!req.session) return res.status(401).json({ error: 'Please sign in.' });
  const bad = csrfProblem(req);
  if (bad) return res.status(403).json({ error: bad });
  next();
}

/**
 * Middleware: an admin with `perm` ('invitations', or 'replies' for the guest replies), or the couple for their own
 * invitation (:slug). A couple's session also stops working the moment their link is turned off or replaced.
 */
export function requireEditor(getInvitation, perm = 'invitations') {
  return async (req, res, next) => {
    try {
      if (!req.session) return res.status(401).json({ error: 'Please sign in.' });
      if (isAdmin(req) ? !hasPerm(req, perm) : !canEdit(req, req.params.slug)) return res.status(403).json({ error: 'You do not have access to this invitation.' });
      if (req.session.role === 'client') {
        const doc = await getInvitation(req.params.slug);
        if (!linkActive(doc, req.session)) {
          await deleteSession(req.sessionKey);
          return res.status(401).json({ error: 'This link is no longer active. Please ask your planner for a new one.' });
        }
      }
      const bad = csrfProblem(req);
      if (bad) return res.status(403).json({ error: bad });
      next();
    } catch (err) { next(err); }
  };
}

// ── Couple's link (client access) ──────────────────────────────────────────

export const hashToken = (t) => createHash('sha256').update(String(t)).digest('hex');
export const newClientToken = () => randomBytes(32).toString('base64url');

/** Ends every couple session of one invitation (link turned off or replaced, password changed, deleted). */
export const revokeClientSessions = (slug) => deleteSessionsWhere((s) => s.role === 'client' && s.slug === slug);

/** Ends every session of one customer account (password changed or reset, account turned off). */
export const revokeCustomerSessions = (cid) => deleteSessionsWhere((s) => s.role === 'customer' && s.cid === cid);

/** Ends every session of one staff member (turned off, deleted, password reset, role or permissions changed). */
export const revokeStaffSessions = (id) => deleteSessionsWhere((s) => s.role === 'admin' && s.sid === id);

/** Starts a fresh session (the browser's old one, if any, is dropped first) and sets its cookie. */
async function startSession(req, res, data) {
  if (req.sessionKey) await deleteSession(req.sessionKey);
  const id = newId();
  const now = Date.now();
  const s = { ...data, csrf: newId(), created: now, seen: now };
  await putSession(keyOf(id), s);
  setCookie(res, id, maxAge(s.role));
  return s;
}

const linkLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }); // failed attempts per IP
const slugLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }); // wrong passwords per invitation
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;
const ARGON = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 }; // argon2id, OWASP parameters

/** argon2id hash of a couple's link password (NFC, so the same Devanagari typed twice matches). */
export const hashLinkPassword = (pw) => argonHash(String(pw).normalize('NFC'), ARGON);
/** argon2id hash of a customer account's password (same parameters and normalisation). */
export const hashAccountPassword = hashLinkPassword;

/** What the couple may change: { themes: 'all' | string[], canChangeTheme, canChangeColors }. */
export const permsOf = (access) => ({
  themes: access?.themes === 'all' || !Array.isArray(access?.themes) ? 'all' : [...access.themes],
  canChangeTheme: access?.canChangeTheme === true,
  canChangeColors: access?.canChangeColors === true,
});

/** POST /api/client/session { token, password }: trade the link token + password for a session limited to one invitation. */
export function clientSession() {
  return async (req, res) => {
    const ip = clientIp(req);
    const st = linkLimiter.peek(ip);
    if (!st.ok) {
      res.set('Retry-After', String(st.retryAfter));
      return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
    }
    if (!originAllowed(req)) return res.status(403).json({ error: 'Cross-site request refused.' });
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    // Already signed in with this very link (the couple opened it again): go straight in, no password.
    if (req.session?.role === 'client' && /^[A-Za-z0-9_-]{43}$/.test(token)) {
      const cur = await peekInvitation(req.session.slug);
      if (linkActive(cur, req.session) && safeEqual(cur.access.tokenHash, hashToken(token))) {
        return res.json({ role: 'client', slug: cur.slug, csrf: req.session.csrf, perms: permsOf(cur.access) });
      }
    }
    const password = typeof req.body?.password === 'string' ? req.body.password.slice(0, PASSWORD_MAX * 4).normalize('NFC') : '';
    const fail = (slug) => {
      linkLimiter.hit(ip);
      if (slug) slugLimiter.hit(slug);
      console.warn(`[auth] bad client link ip=${ip}`);
      return res.status(401).json({ error: 'That link or password is not right. Please check it, or ask your planner.' });
    };
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      await mimicVerify(); // about the time of a real check, without the CPU (lib/guard.js)
      return fail();
    }
    // An indexed lookup by sha256(token) (lib/store.js), not a scan of every invitation.
    const doc = await findInvitationByTokenHash(hashToken(token));
    if (!doc) {
      await mimicVerify();
      return fail();
    }
    const ss = slugLimiter.peek(doc.slug);
    if (!ss.ok) {
      res.set('Retry-After', String(ss.retryAfter));
      return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
    }
    // Links made before passwords existed (passwordHash null) still open with the token alone, until the planner sets one.
    if (doc.access.passwordHash) {
      const ok = password ? await argonVerify(doc.access.passwordHash, password).catch(busyOr(false)) : false;
      if (!ok) return fail(doc.slug);
    }
    const s = await startSession(req, res, { role: 'client', slug: doc.slug, fp: linkFp(doc.access) });
    linkLimiter.reset(ip);
    console.info(`[auth] client link ok slug=${doc.slug} ip=${ip}`);
    res.json({ role: 'client', slug: doc.slug, csrf: s.csrf, perms: permsOf(doc.access) });
  };
}

// Login throttling: per IP and per account. Failed attempts only.
const ipLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const accountLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
// A real hash (same parameters as account hashes) to verify against when the email is wrong, so timing does not reveal emails.
const dummyHash = await argonHashRaw(randomBytes(16).toString('hex'), ARGON);

/** Seconds to wait when this IP or this account has failed too often, else 0. */
export function loginThrottle(ip, account) {
  const a = ipLimiter.peek(ip);
  const b = accountLimiter.peek(account);
  return a.ok && b.ok ? 0 : Math.max(a.retryAfter, b.retryAfter, 1);
}
const failedLogin = (ip, account) => { ipLimiter.hit(ip); accountLimiter.hit(account); };

/**
 * Checks a customer's email (normalised) and password. Unknown emails are checked against a dummy hash, so the time
 * taken is the same. Failures count against the sign-in limits. -> { ok: true, customer } | { ok: false, exists }
 */
export async function checkCustomer(ip, email, password) {
  const c = customerByEmail(email);
  const pw = String(password).normalize('NFC');
  const ok = c && c.passwordHash ? await argonVerify(c.passwordHash, pw).catch(busyOr(false)) : (await argonVerify(dummyHash, pw).catch(busyOr(false)), false);
  if (!ok) { failedLogin(ip, `c:${email}`); return { ok: false, exists: Boolean(c) }; }
  ipLimiter.reset(ip);
  return { ok: true, customer: c };
}

/** "iPhone · Safari": the device and browser of a sign-in, for the planner's Customers page (no IP is kept). */
function deviceOf(ua = '') {
  const s = String(ua).slice(0, 400);
  const os = /iPhone/.test(s) ? 'iPhone' : /iPad/.test(s) ? 'iPad' : /Android/.test(s) ? 'Android' : /Windows/.test(s) ? 'Windows'
    : /Mac OS X|Macintosh/.test(s) ? 'Mac' : /Linux/.test(s) ? 'Linux' : 'Other device';
  const br = /Edg\//.test(s) ? 'Edge' : /OPR\//.test(s) ? 'Opera' : /SamsungBrowser/.test(s) ? 'Samsung Internet' : /Firefox\//.test(s) ? 'Firefox'
    : /Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : 'Browser';
  return `${os} · ${br}`;
}

/** Signs this browser in as the customer (a new session id, cookie set). Returns the session. */
export async function signInCustomer(req, res, c) {
  const s = await startSession(req, res, { role: 'customer', cid: c.id, fp: customerFp(c) });
  const at = new Date().toISOString();
  const device = deviceOf(req.get('user-agent'));
  mutateCustomer(c.id, (x) => {
    x.lastLoginAt = at;
    x.loginCount = (Number(x.loginCount) || 0) + 1;
    x.logins = [{ at, device }, ...(Array.isArray(x.logins) ? x.logins : [])].slice(0, 20);
  }).catch(() => {});
  console.info(`[auth] customer sign-in id=${c.id} ip=${clientIp(req)}`);
  return s;
}

async function checkPassword(password) {
  const h = ADMIN_PASSWORD_HASH;
  try {
    if (h.startsWith('$argon2')) return await argonVerify(h, password);
    if (/^\$2[aby]\$/.test(h)) return await bcryptVerify(password, h);
  } catch (err) { if (err?.status === 503) throw err; /* else a malformed hash */ }
  return false;
}

export async function login(req, res) {
  const ip = clientIp(req);
  const email = normEmail(req.body?.email).slice(0, 254);
  const password = typeof req.body?.password === 'string' ? req.body.password.slice(0, 1024) : '';
  const emailOk = safeEqual(email, ADMIN_EMAIL);
  const wait = loginThrottle(ip, emailOk ? 'admin' : `c:${email}`);
  if (wait) {
    res.set('Retry-After', String(wait));
    console.warn(`[auth] login throttled ip=${ip}`);
    return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
  }
  if (!originAllowed(req)) return res.status(403).json({ error: 'Cross-site request refused.' });

  // Any other email: a staff member's first, else a customer account. An unknown email, a wrong password and a
  // turned-off account all get the same answer and cost one password check either way (no account enumeration).
  const member = emailOk ? null : staffByEmail(email);
  if (member) {
    const ok = await argonVerify(member.passwordHash, password.normalize('NFC')).catch(busyOr(false));
    if (!ok || member.disabled === true) {
      failedLogin(ip, `c:${email}`);
      console.warn(`[auth] failed login ip=${ip}`);
      recordAudit({ actor: `staff:${member.id}`, actorEmail: member.email, action: 'POST /auth/login', label: ok ? 'Sign-in refused: turned off' : 'Failed sign-in: wrong password', ip, status: 401 });
      return res.status(401).json({ error: 'That email and password do not match.' });
    }
    const s = await startSession(req, res, { role: 'admin', sid: member.id, fp: staffFp(member) });
    ipLimiter.reset(ip);
    mutateStaff(member.id, (x) => { x.lastLoginAt = new Date().toISOString(); }).catch(() => {});
    console.info(`[auth] staff login ok id=${member.id} ip=${ip}`);
    const a = adminOf(s);
    recordAudit({ ...actorOf(a), action: 'POST /auth/login', label: 'Signed in', ip, status: 200 });
    return res.json(adminMe(a, s.csrf));
  }
  if (!emailOk) {
    const r = await checkCustomer(ip, email, password);
    if (!r.ok || r.customer.disabled === true) {
      console.warn(`[auth] failed login ip=${ip}`);
      return res.status(401).json({ error: 'That email and password do not match.' });
    }
    const s = await signInCustomer(req, res, r.customer);
    return res.json({ role: 'customer', name: r.customer.name || '', email: r.customer.email, csrf: s.csrf });
  }

  const passOk = await checkPassword(password);
  if (!passOk) {
    failedLogin(ip, 'admin');
    console.warn(`[auth] failed login ip=${ip}`);
    recordAudit({ ...actorOf(OWNER), action: 'POST /auth/login', label: 'Failed sign-in: wrong password', ip, status: 401 });
    return res.status(401).json({ error: 'That email and password do not match.' });
  }

  // Rotate: drop any session this browser had, then issue a fresh id.
  const s = await startSession(req, res, { role: 'admin', fp: ADMIN_FP });
  ipLimiter.reset(ip);
  console.info(`[auth] login ok ip=${ip}`);
  recordAudit({ ...actorOf(OWNER), action: 'POST /auth/login', label: 'Signed in', ip, status: 200 });
  res.json(adminMe(OWNER, s.csrf));
}

/** What the studio gets for an admin (login, /auth/me): who they are and what they may open. */
const adminMe = (a, csrf) => ({
  role: 'admin', email: a.email, name: a.name || '', owner: Boolean(a.owner), superAdmin: a.role === 'super',
  perms: a.role === 'super' ? [...ALL_PERMS] : [...a.perms], csrf,
});

export async function logout(req, res) {
  await deleteSession(req.sessionKey);
  setCookie(res, '', 0);
  console.info(`[auth] logout ip=${clientIp(req)}`);
  res.json({ ok: true });
}

/**
 * True when this request carries a live studio session: the planner, or a couple whose link is still active
 * (a revoked or replaced link ends the session here too). Used to let the studios open any design page.
 */
export async function hasStudioSession(req) {
  const s = req.session;
  if (!s) return false;
  if (s.role === 'admin') return true;
  if (s.role === 'customer') return Boolean(req.customer?.invitations?.length); // once the planner has linked an invitation
  if (s.role !== 'client') return false;
  const doc = await peekInvitation(s.slug);
  if (linkActive(doc, s)) return true;
  await deleteSession(req.sessionKey);
  return false;
}

export async function me(req, res) {
  res.set('Cache-Control', 'no-store');
  // ?soft=1 (the website's nav): signed out is a normal answer, not an error.
  if (!req.session) return req.query.soft != null ? res.json({ role: null }) : res.status(401).json({ error: 'Not signed in.' });
  const s = req.session;
  if (s.role === 'customer') return res.json({ role: 'customer', name: req.customer.name || '', email: req.customer.email, csrf: s.csrf });
  if (s.role !== 'client') return res.json(adminMe(req.admin, s.csrf));
  const doc = await peekInvitation(s.slug);
  if (!linkActive(doc, s)) {
    await deleteSession(req.sessionKey);
    return res.status(401).json({ error: 'This link is no longer active. Please ask your planner for a new one.' });
  }
  res.json({ role: 'client', slug: s.slug, csrf: s.csrf, perms: permsOf(doc.access) });
}

/**
 * POST /api/clear-cache (any signed-in role, CSRF): tells the browser to drop its HTTP cache for this site
 * (`Clear-Site-Data: "cache"`). Never "cookies" or "storage": the session cookie and the sign-in stay.
 * The studio also empties Cache Storage and its own non-sign-in keys, then reloads (src/studio/cache.js).
 */
export function clearCache(req, res) {
  res.set('Clear-Site-Data', '"cache"');
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true });
}
