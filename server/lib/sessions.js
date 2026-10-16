// Persistent studio sessions, kept by the store (lib/store.js: a table in data/nimtto.db, or data/sessions.json with
// STORE=json). Outside every served folder. Only sha256(session id) is stored, never the id itself.
// `seen` is written at most every SEEN_EVERY per session, so browsing does not write on every request.
import { createHash } from 'node:crypto';
import { SLUG_RE, sessionStore } from './store.js';

const DAY = 24 * 60 * 60 * 1000;
/** Sliding expiry since the last activity, per role. No absolute cap: a session lasts until sign-out. */
export const TTL = { admin: 30 * DAY, client: 180 * DAY, customer: 180 * DAY };
const CID_RE = /^[A-Za-z0-9_-]{12}$/;
/** `seen` (and the cookie) are refreshed at most this often per session, so browsing does not write every request. */
export const SEEN_EVERY = 10 * 60 * 1000;
const MAX_SESSIONS = 5000;

export const keyOf = (id) => createHash('sha256').update(id).digest('hex');

const HEX64 = /^[a-f0-9]{64}$/;
const isTime = (n) => Number.isFinite(n) && n > 0;
function validEntry(k, s) {
  if (!HEX64.test(k) || !s || typeof s !== 'object') return false;
  if (!TTL[s.role] || typeof s.csrf !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(s.csrf)) return false;
  if (!isTime(s.created) || !isTime(s.seen) || typeof s.fp !== 'string' || !HEX64.test(s.fp)) return false;
  if (s.role === 'client') return SLUG_RE.test(s.slug);
  if (s.role === 'customer') return CID_RE.test(s.cid);
  return s.sid == null || CID_RE.test(s.sid); // admin: the owner (no sid) or a staff member (lib/staff.js)
}
const clean = (s) => (s.role === 'client'
  ? { role: 'client', slug: s.slug, fp: s.fp, csrf: s.csrf, created: s.created, seen: s.seen }
  : s.role === 'customer'
    ? { role: 'customer', cid: s.cid, fp: s.fp, csrf: s.csrf, created: s.created, seen: s.seen }
    : s.sid
      ? { role: 'admin', sid: s.sid, fp: s.fp, csrf: s.csrf, created: s.created, seen: s.seen }
      : { role: 'admin', fp: s.fp, csrf: s.csrf, created: s.created, seen: s.seen });

export const expired = (s, now = Date.now()) => now - s.seen >= TTL[s.role];

/** Drops expired and malformed sessions, then keeps at most MAX_SESSIONS (least recently seen go first). */
function sweep(now = Date.now()) {
  const drop = sessionStore.all().filter(({ k, ...s }) => !validEntry(k, s) || expired(s, now)).map((r) => r.k);
  if (drop.length) sessionStore.delMany(drop);
  trim();
  return drop.length;
}

const PER_ACCOUNT = 10;
/** Keeps at most MAX_SESSIONS: the least recently seen couple and customer sessions go first, admins' last. */
function trim() {
  const over = sessionStore.count() - MAX_SESSIONS;
  if (over <= 0) return;
  const rank = (s) => (s.role === 'admin' ? 1 : 0);
  const keys = sessionStore.all().sort((a, b) => rank(a) - rank(b) || a.seen - b.seen).slice(0, over).map((r) => r.k);
  if (keys.length) sessionStore.delMany(keys);
}

/** Call once the store is open: tidies the saved sessions, then hourly. */
export function startSessions() {
  sweep();
  console.info(`[auth] ${sessionStore.count()} saved session(s) loaded`);
  setInterval(() => { try { sweep(); } catch (err) { console.warn('[auth] session sweep failed:', err.message); } }, 60 * 60 * 1000).unref();
}

/** The session stored under sha256(id) (a copy; `k` is its key), or undefined. */
export function getSession(k) {
  const s = sessionStore.get(k);
  if (!s || !validEntry(k, s)) return undefined;
  return { ...clean(s), k };
}

/** Stores a new session under sha256(id). Awaitable so the response follows the durable write. */
export async function putSession(k, s) {
  await sessionStore.put(k, clean(s));
  // one account can't fill the store (and so sign everyone else out): its oldest sessions beyond PER_ACCOUNT go
  const owner = s.role === 'customer' ? (x) => x.role === 'customer' && x.cid === s.cid : s.role === 'client' ? (x) => x.role === 'client' && x.slug === s.slug : null;
  if (owner) {
    const mine = sessionStore.all().filter((x) => owner(x)).sort((a, b) => b.seen - a.seen);
    if (mine.length > PER_ACCOUNT) await sessionStore.delMany(mine.slice(PER_ACCOUNT).map((r) => r.k));
  }
  if (sessionStore.count() > MAX_SESSIONS) trim();
}

export async function deleteSession(k) {
  if (k) await sessionStore.del(k);
}

/** Deletes every session matching fn(session). */
export async function deleteSessionsWhere(fn) {
  const keys = sessionStore.all().filter(({ k, ...s }) => fn(s)).map((r) => r.k);
  if (keys.length) await sessionStore.delMany(keys);
}

/** Marks activity; true when `seen` moved (written to the store), so the caller re-sends the cookie. */
export function touchSession(s, now = Date.now()) {
  if (now - s.seen < SEEN_EVERY) return false;
  s.seen = now;
  sessionStore.seen(s.k, now);
  return true;
}
