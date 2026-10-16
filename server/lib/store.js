// Storage facade. Every module reads and writes data through this file; the backend is SQLite (lib/store-sqlite.js,
// the default) or the original JSON files (lib/store-json.js, STORE=json, the rollback path).
// On top of either: a per-key lock (read-modify-write never interleaves in this process) and an in-memory cache of
// parsed invitations, checked against the stored revision on every read (so it is never stale, even when another
// process writes).
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { STORE, DB_FILE, INV_DIR, RSVP_DIR, UPLOAD_DIR } from './env.js';

export const SLUG_RE = /^[a-z0-9-]{3,64}$/;
const backend = STORE === 'json' ? await import('./store-json.js') : await import('./store-sqlite.js');
export const STORE_KIND = STORE === 'json' ? 'json' : 'sqlite';
// The original file helpers stay available (scripts, the JSON backend); data goes through the functions below.
export { writeJsonAtomic, readJson } from './store-json.js';

const locks = new Map();
/** Runs fn while holding the lock for key; calls for the same key queue up. */
export function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  const tail = run.catch(() => {});
  locks.set(key, tail);
  tail.then(() => { if (locks.get(key) === tail) locks.delete(key); });
  return run;
}

const must = (slug) => {
  if (!SLUG_RE.test(slug)) throw Object.assign(new Error('Invalid slug'), { status: 400 });
  return slug;
};
export const invPath = (slug) => resolve(INV_DIR, `${must(slug)}.json`);
export const rsvpPath = (slug) => resolve(RSVP_DIR, `${must(slug)}.json`);
export const uploadDir = (slug) => resolve(UPLOAD_DIR, must(slug));

/** Opens the store (SQLite: creates the file and imports the JSON files on first start). Call before listening. */
export function openStore() {
  if (STORE_KIND === 'json' && existsSync(DB_FILE)) {
    console.warn('[store] STORE=json, but data/nimtto.db exists: anything saved while on SQLite is only in that file. '
      + 'Run `npm run export-json` first to bring it back into the JSON files (docs/OPERATIONS.md).');
  }
  backend.open();
}
export const closeStore = () => backend.close();
export const storePing = () => backend.ping();
export const backupStore = (file) => backend.backupTo(file);
export const sessionStore = backend.sessions;
/** Customer accounts (lib/accounts.js): get(id), byEmail(email), all(), put(c), del(id); reads are synchronous. */
export const customerStore = backend.customers;

/**
 * Client access, normalised. Older files stored `clientAccess: { tokenHash, createdAt }` (a link with no
 * password, full rights); it becomes `access` with the same rights, and is written back on the next save.
 */
export function migrateDoc(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  if (doc.clientAccess && !doc.access) {
    doc.access = { tokenHash: doc.clientAccess.tokenHash, passwordHash: null, createdAt: doc.clientAccess.createdAt, themes: 'all', canChangeTheme: true, canChangeColors: true };
  }
  delete doc.clientAccess;
  if (doc.access) {
    const a = doc.access;
    if (a.themes !== 'all' && !Array.isArray(a.themes)) a.themes = 'all';
    a.canChangeTheme = a.canChangeTheme === true;
    a.canChangeColors = a.canChangeColors === true;
    if (typeof a.passwordHash !== 'string') a.passwordHash = null;
    if (typeof a.tokenEnc !== 'string') delete a.tokenEnc;
  }
  return doc;
}

// ── Invitations ────────────────────────────────────────────────────────────

const CACHE_MAX = 500;
const cache = new Map(); // slug -> { rev, doc } (doc shared and read-only), least recently used first
const revs = new WeakMap(); // doc object -> the rev it was read at

function remember(slug, rev, doc) {
  cache.delete(slug);
  cache.set(slug, { rev, doc });
  revs.set(doc, rev);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return doc;
}

async function cached(slug, rev) {
  if (!rev) { cache.delete(slug); return null; }
  const hit = cache.get(slug);
  if (hit && hit.rev === rev) {
    cache.delete(slug);
    cache.set(slug, hit);
    return hit.doc;
  }
  const row = await backend.readInvitation(slug);
  if (!row) { cache.delete(slug); return null; }
  return remember(slug, row.rev, migrateDoc(row.doc));
}

/**
 * The invitation as stored, shared and READ-ONLY (never mutate it): the hot path for guests, the gate, the share
 * page and session checks. One indexed lookup of the revision when cached.
 */
export async function peekInvitation(slug) {
  if (!SLUG_RE.test(slug)) return null;
  return cached(slug, await backend.invitationRev(slug));
}

/** The revision a doc from peekInvitation/getInvitation was read at (a cache key for derived data). */
export const revOf = (doc) => revs.get(doc) ?? 0;

/** A private, mutable copy (for read-modify-write under withLock(`inv:<slug>`)), or null. */
export async function getInvitation(slug) {
  const doc = await peekInvitation(slug);
  if (!doc) return null;
  const copy = structuredClone(doc);
  revs.set(copy, revs.get(doc));
  return copy;
}

export async function invitationExists(slug) {
  return SLUG_RE.test(slug) && (await backend.invitationRev(slug)) > 0;
}

/** Every invitation (READ-ONLY docs), from the cache where it is current. */
export async function listInvitations() {
  const rows = await backend.listInvitationRevs();
  const docs = await Promise.all(rows.map(({ slug, rev }) => cached(slug, rev).catch(() => null)));
  return docs.filter(Boolean);
}

/** The invitation whose couple link has this token hash (READ-ONLY), or null. */
export async function findInvitationByTokenHash(h) {
  if (backend.slugByTokenHash) {
    const slug = backend.slugByTokenHash(h);
    const doc = slug ? await peekInvitation(slug) : null;
    return doc?.access?.tokenHash === h ? doc : null;
  }
  let found = null;
  for (const d of await listInvitations()) if (d.access?.tokenHash === h) found = d; // JSON: a scan, no early exit
  return found;
}

/** Stores a new invitation; 409 when the link name is taken. */
export async function createInvitation(doc) {
  must(doc.slug);
  const rev = await backend.insertInvitation(doc);
  cache.delete(doc.slug);
  revs.set(doc, rev);
}

/** Saves a doc obtained from getInvitation (call under withLock(`inv:<slug>`)). */
export async function saveInvitation(doc) {
  must(doc.slug);
  const at = revs.get(doc) ?? await backend.invitationRev(doc.slug);
  const rev = await backend.updateInvitation(doc, at);
  cache.delete(doc.slug);
  revs.set(doc, rev);
}

/** Moves an invitation, its replies and its uploads into data/trash/<slug>-<time>/ (recoverable). */
export async function trashInvitation(slug) {
  must(slug);
  await backend.trashInvitation(slug);
  cache.delete(slug);
}

// ── Replies ────────────────────────────────────────────────────────────────

export const listReplies = async (slug) => backend.listReplies(must(slug));
export const addReply = (slug, reply, max) => withLock(`rsvp:${must(slug)}`, async () => backend.addReply(slug, reply, max));
export const deleteReply = (slug, id) => withLock(`rsvp:${must(slug)}`, async () => backend.deleteReply(slug, id));
/** Map slug -> { count, guests }. */
export const replyStats = async () => backend.replyStats();

// ── Orders (lib/orders.js is the only caller) ─────────────────────────────

export const listOrders = async () => backend.listOrders();
export const getOrderById = async (id) => backend.getOrder(id);
/** The order with this public reference (NM-12345), or null. */
export const getOrderByRef = async (ref) => backend.getOrderByRef(ref);
export const addOrder = (order, max) => withLock('orders', async () => backend.addOrder(order, max));
/** Replaces the stored order with the same id; false when there is none. Call under withLock('orders'). */
export const saveOrder = async (order) => backend.saveOrder(order);
export const deleteOrder = (id) => withLock('orders', async () => backend.deleteOrder(id));
export const countNewOrders = async () => backend.countNewOrders();

// ── Small documents (site settings) ───────────────────────────────────────

/** { rev, value } or null. */
export const getDoc = async (k) => backend.getKv(k);
/** Stores the value; returns its new rev. */
export const putDoc = (k, value) => withLock(`kv:${k}`, async () => backend.putKv(k, value));
