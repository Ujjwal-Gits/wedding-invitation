// Persistent studio sessions: data/sessions.json (outside every served folder, gitignored with data/).
// Only sha256(session id) is stored, never the id itself. The Map is the live copy; the file is written
// through (atomically, coalesced) on create, delete and the throttled `seen` updates, and read once on start.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SESSIONS_FILE } from './env.js';
import { writeJsonAtomic, SLUG_RE } from './store.js';

const DAY = 24 * 60 * 60 * 1000;
/** Sliding expiry since the last activity, per role. No absolute cap: a session lasts until sign-out. */
export const TTL = { admin: 30 * DAY, client: 180 * DAY };
/** `seen` (and the cookie) are refreshed at most this often per session, so browsing does not write every request. */
export const SEEN_EVERY = 10 * 60 * 1000;
const MAX_SESSIONS = 5000;

export const keyOf = (id) => createHash('sha256').update(id).digest('hex');

const map = new Map(); // sha256(id) -> { role, slug?, fp, csrf, created, seen }

const HEX64 = /^[a-f0-9]{64}$/;
const isTime = (n) => Number.isFinite(n) && n > 0;
function validEntry(k, s) {
  if (!HEX64.test(k) || !s || typeof s !== 'object') return false;
  if (!TTL[s.role] || typeof s.csrf !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(s.csrf)) return false;
  if (!isTime(s.created) || !isTime(s.seen) || typeof s.fp !== 'string' || !HEX64.test(s.fp)) return false;
  return s.role === 'admin' || SLUG_RE.test(s.slug);
}
const clean = (s) => (s.role === 'client'
  ? { role: 'client', slug: s.slug, fp: s.fp, csrf: s.csrf, created: s.created, seen: s.seen }
  : { role: 'admin', fp: s.fp, csrf: s.csrf, created: s.created, seen: s.seen });

export const expired = (s, now = Date.now()) => now - s.seen >= TTL[s.role];

// ── Write-through, coalesced: one write at a time; changes made during a write trigger one more.
let writing = null;
let dirty = false;
export function persist() {
  dirty = true;
  if (!writing) {
    writing = (async () => {
      try {
        while (dirty) {
          dirty = false;
          await writeJsonAtomic(SESSIONS_FILE, { v: 1, sessions: Object.fromEntries(map) });
        }
      } catch (err) {
        dirty = true; // retried by the next change or sweep
        console.error('[auth] could not save sessions:', err.message);
      } finally {
        writing = null;
      }
    })();
  }
  return writing;
}

/** Drops expired sessions; returns how many. */
function sweep(now = Date.now()) {
  let n = 0;
  for (const [k, s] of map) if (expired(s, now)) { map.delete(k); n++; }
  return n;
}

/** Keeps at most MAX_SESSIONS, evicting the least recently seen. */
function cap() {
  if (map.size <= MAX_SESSIONS) return;
  const oldest = [...map].sort((a, b) => a[1].seen - b[1].seen).slice(0, map.size - MAX_SESSIONS);
  for (const [k] of oldest) map.delete(k);
}

// Load on start (synchronously, before the server listens).
try {
  const raw = JSON.parse(readFileSync(SESSIONS_FILE, 'utf8'));
  for (const [k, s] of Object.entries(raw?.sessions || {})) if (validEntry(k, s)) map.set(k, clean(s));
} catch (err) {
  if (err.code !== 'ENOENT') console.warn(`[auth] sessions file unreadable, starting empty: ${err.message}`);
}
{
  const before = map.size;
  sweep();
  cap();
  if (map.size !== before) persist();
  console.info(`[auth] ${map.size} saved session(s) loaded`);
}

setInterval(() => { if (sweep() || dirty) persist(); }, 60 * 60 * 1000).unref();

export const getSession = (k) => map.get(k);

/** Stores a new session under sha256(id). Awaitable so the response follows the durable write. */
export function putSession(k, s) {
  map.set(k, clean(s));
  cap();
  return persist();
}

export function deleteSession(k) {
  if (!k || !map.delete(k)) return Promise.resolve();
  return persist();
}

/** Deletes every session matching fn(session). */
export function deleteSessionsWhere(fn) {
  let n = 0;
  for (const [k, s] of map) if (fn(s)) { map.delete(k); n++; }
  return n ? persist() : Promise.resolve();
}

/** Marks activity; true when `seen` moved (written to disk), so the caller re-sends the cookie. */
export function touchSession(s, now = Date.now()) {
  if (now - s.seen < SEEN_EVERY) return false;
  s.seen = now;
  persist();
  return true;
}
