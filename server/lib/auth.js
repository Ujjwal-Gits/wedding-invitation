// Single-admin authentication: server-side sessions in an HttpOnly cookie, rotated on login,
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
  if (id && /^[A-Za-z0-9_-]{43}$/.test(id)) {
    const k = keyOf(id);
    const s = getSession(k);
    const now = Date.now();
    if (s && !expired(s, now) && (s.role !== 'admin' || safeEqual(s.fp, ADMIN_FP))) {
      req.session = s;
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
/** The planner, or the couple of this one invitation (client link). */
export const canEdit = (req, slug) => isAdmin(req) || (req.session?.role === 'client' && req.session.slug === slug);

/** Middleware: the planner only. */
export function requireAdmin(req, res, next) {
  if (!req.session) return res.status(401).json({ error: 'Please sign in.' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only the planner can do that.' });
  const bad = csrfProblem(req);
  if (bad) return res.status(403).json({ error: bad });
  next();
}

/** Middleware: anyone signed in (planner or couple). */
export function requireSession(req, res, next) {
  if (!req.session) return res.status(401).json({ error: 'Please sign in.' });
  const bad = csrfProblem(req);
  if (bad) return res.status(403).json({ error: bad });
  next();
}

/**
 * Middleware: the planner, or the couple for their own invitation (:slug). A couple's session also
 * stops working the moment their link is turned off or replaced.
 */
export function requireEditor(getInvitation) {
  return async (req, res, next) => {
    try {
      if (!req.session) return res.status(401).json({ error: 'Please sign in.' });
      if (!canEdit(req, req.params.slug)) return res.status(403).json({ error: 'You do not have access to this invitation.' });
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
// A real hash to verify against when the email is wrong, so timing does not reveal valid emails.
const dummyHash = await argonHashRaw(randomBytes(16).toString('hex'));

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
  const ipState = ipLimiter.peek(ip);
  const accState = accountLimiter.peek('admin');
  if (!ipState.ok || !accState.ok) {
    res.set('Retry-After', String(Math.max(ipState.retryAfter, accState.retryAfter)));
    console.warn(`[auth] login throttled ip=${ip}`);
    return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
  }
  if (!originAllowed(req)) return res.status(403).json({ error: 'Cross-site request refused.' });

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
  const password = typeof req.body?.password === 'string' ? req.body.password.slice(0, 1024) : '';

  const emailOk = safeEqual(email, ADMIN_EMAIL);
  const passOk = emailOk ? await checkPassword(password) : (await argonVerify(dummyHash, password).catch(busyOr(false)), false);

  if (!emailOk || !passOk) {
    ipLimiter.hit(ip);
    accountLimiter.hit('admin');
    console.warn(`[auth] failed login ip=${ip}`);
    return res.status(401).json({ error: 'That email and password do not match.' });
  }

  // Rotate: drop any session this browser had, then issue a fresh id.
  const s = await startSession(req, res, { role: 'admin', fp: ADMIN_FP });
  ipLimiter.reset(ip);
  console.info(`[auth] login ok ip=${ip}`);
  res.json({ role: 'admin', email: ADMIN_EMAIL, csrf: s.csrf });
}

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
  if (s.role !== 'client') return false;
  const doc = await peekInvitation(s.slug);
  if (linkActive(doc, s)) return true;
  await deleteSession(req.sessionKey);
  return false;
}

export async function me(req, res) {
  if (!req.session) return res.status(401).json({ error: 'Not signed in.' });
  const s = req.session;
  if (s.role !== 'client') return res.json({ role: 'admin', email: ADMIN_EMAIL, csrf: s.csrf });
  const doc = await peekInvitation(s.slug);
  if (!linkActive(doc, s)) {
    await deleteSession(req.sessionKey);
    return res.status(401).json({ error: 'This link is no longer active. Please ask your planner for a new one.' });
  }
  res.json({ role: 'client', slug: s.slug, csrf: s.csrf, perms: permsOf(doc.access) });
}
