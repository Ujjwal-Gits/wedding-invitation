// Single-admin authentication: server-side sessions in an HttpOnly cookie, rotated on login,
// with a synchronizer CSRF token bound to each session.
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { verify as argonVerify, hash as argonHash } from '@node-rs/argon2';
import { verify as bcryptVerify } from '@node-rs/bcrypt';
import { IS_PROD, ADMIN_EMAIL, ADMIN_PASSWORD_HASH } from './env.js';
import { rateLimiter, originAllowed, clientIp } from './security.js';

export const COOKIE = IS_PROD ? '__Host-studio' : 'studio_sid';
const IDLE_MS = 12 * 60 * 60 * 1000; // 12 h without activity
const ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days at most

// Sessions live in memory: a restart signs the admin out, which is acceptable for one user.
const sessions = new Map(); // sha256(id) -> { email, csrf, created, seen }
const keyOf = (id) => createHash('sha256').update(id).digest('hex');

setInterval(() => {
  const now = Date.now();
  for (const [k, s] of sessions) if (now - s.seen > IDLE_MS || now - s.created > ABSOLUTE_MS) sessions.delete(k);
}, 10 * 60 * 1000).unref();

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setCookie(res, value, maxAgeSec) {
  const attrs = [`${COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (IS_PROD) attrs.push('Secure');
  res.append('Set-Cookie', attrs.join('; '));
}

/** Middleware: attaches req.session (or null) for a valid, unexpired session. */
export function loadSession(req, res, next) {
  const id = parseCookies(req.headers.cookie)[COOKIE];
  req.session = null;
  if (id && /^[A-Za-z0-9_-]{43}$/.test(id)) {
    const k = keyOf(id);
    const s = sessions.get(k);
    const now = Date.now();
    if (s && now - s.seen < IDLE_MS && now - s.created < ABSOLUTE_MS) {
      s.seen = now;
      req.session = s;
      req.sessionKey = k;
    } else if (s) {
      sessions.delete(k);
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
        if (!doc?.clientAccess?.tokenHash || !safeEqual(doc.clientAccess.tokenHash, req.session.tokenHash)) {
          sessions.delete(req.sessionKey);
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

/** Ends every couple session of one invitation (link turned off or replaced). */
export function revokeClientSessions(slug) {
  for (const [k, s] of sessions) if (s.role === 'client' && s.slug === slug) sessions.delete(k);
}

const linkLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

/** POST /api/client/session { token }: trade the link token for a session limited to one invitation. */
export function clientSession(listInvitations) {
  return async (req, res) => {
    const ip = clientIp(req);
    const st = linkLimiter.peek(ip);
    if (!st.ok) {
      res.set('Retry-After', String(st.retryAfter));
      return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
    }
    if (!originAllowed(req)) return res.status(403).json({ error: 'Cross-site request refused.' });
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const fail = () => {
      linkLimiter.hit(ip);
      console.warn(`[auth] bad client link ip=${ip}`);
      return res.status(401).json({ error: 'This link is no longer active. Please ask your planner for a new one.' });
    };
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return fail();
    const h = hashToken(token);
    const docs = await listInvitations();
    const doc = docs.find((d) => d.clientAccess?.tokenHash && safeEqual(d.clientAccess.tokenHash, h));
    if (!doc) return fail();
    if (req.sessionKey) sessions.delete(req.sessionKey);
    const id = randomBytes(32).toString('base64url');
    const s = { role: 'client', slug: doc.slug, tokenHash: h, csrf: randomBytes(32).toString('base64url'), created: Date.now(), seen: Date.now() };
    sessions.set(keyOf(id), s);
    setCookie(res, id, Math.floor(ABSOLUTE_MS / 1000));
    console.info(`[auth] client link ok slug=${doc.slug} ip=${ip}`);
    res.json({ role: 'client', slug: doc.slug, csrf: s.csrf });
  };
}

// Login throttling: per IP and per account. Failed attempts only.
const ipLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const accountLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
// A real hash to verify against when the email is wrong, so timing does not reveal valid emails.
const dummyHash = await argonHash(randomBytes(16).toString('hex'));

async function checkPassword(password) {
  const h = ADMIN_PASSWORD_HASH;
  try {
    if (h.startsWith('$argon2')) return await argonVerify(h, password);
    if (/^\$2[aby]\$/.test(h)) return await bcryptVerify(password, h);
  } catch { /* malformed hash */ }
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
  const passOk = emailOk ? await checkPassword(password) : (await argonVerify(dummyHash, password).catch(() => false), false);

  if (!emailOk || !passOk) {
    ipLimiter.hit(ip);
    accountLimiter.hit('admin');
    console.warn(`[auth] failed login ip=${ip}`);
    return res.status(401).json({ error: 'That email and password do not match.' });
  }

  // Rotate: drop any session this browser had, then issue a fresh id.
  if (req.sessionKey) sessions.delete(req.sessionKey);
  const id = randomBytes(32).toString('base64url');
  const s = { role: 'admin', email: ADMIN_EMAIL, csrf: randomBytes(32).toString('base64url'), created: Date.now(), seen: Date.now() };
  sessions.set(keyOf(id), s);
  setCookie(res, id, Math.floor(ABSOLUTE_MS / 1000));
  ipLimiter.reset(ip);
  console.info(`[auth] login ok ip=${ip}`);
  res.json({ role: 'admin', email: s.email, csrf: s.csrf });
}

export function logout(req, res) {
  if (req.sessionKey) sessions.delete(req.sessionKey);
  setCookie(res, '', 0);
  console.info(`[auth] logout ip=${clientIp(req)}`);
  res.json({ ok: true });
}

export function me(req, res) {
  if (!req.session) return res.status(401).json({ error: 'Not signed in.' });
  const s = req.session;
  res.json(s.role === 'client' ? { role: 'client', slug: s.slug, csrf: s.csrf } : { role: 'admin', email: s.email, csrf: s.csrf });
}
