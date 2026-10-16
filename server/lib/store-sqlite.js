// SQLite storage (default; STORE=json falls back to lib/store-json.js). One file, data/nimtto.db, in WAL mode:
// readers never wait for the writer, every write is one short transaction, and the file is safe for more than one
// process. Invitations, replies, orders, site settings and sessions live here; uploads stay on disk.
//
// Durability: synchronous=NORMAL with WAL. A crash of the app or the container loses nothing that was committed;
// only a power cut of the host can lose the last few seconds of commits (a checkpoint runs every 5 s after writes).
// The file can never be left half-written. DB_SYNC=full makes every commit wait for the disk instead.
//
// First start with this store: the JSON files (data/invitations, data/rsvps, orders.json, site.json, sessions.json)
// are copied to data/backups/pre-sqlite-<time>/ and imported in one transaction. The import is recorded in the
// database, so it runs once; a crash halfway leaves no partial import. The JSON files are left where they were.
import Database from 'better-sqlite3';
import { promises as fs, existsSync, readdirSync, readFileSync, mkdirSync, cpSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA_DIR, INV_DIR, RSVP_DIR, TRASH_DIR, UPLOAD_DIR, DB_FILE, BACKUP_DIR, SESSIONS_FILE, DB_SYNC } from './env.js';

const SLUG_RE = /^[a-z0-9-]{3,64}$/;
const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS invitations (
  slug TEXT PRIMARY KEY,
  rev INTEGER NOT NULL,
  status TEXT NOT NULL,
  token_hash TEXT,
  updated_at TEXT,
  doc TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS invitations_token ON invitations(token_hash) WHERE token_hash IS NOT NULL;
CREATE TABLE IF NOT EXISTS rsvps (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  id TEXT NOT NULL,
  at TEXT NOT NULL,
  attending TEXT,
  guests INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  UNIQUE (slug, id)
);
CREATE INDEX IF NOT EXISTS rsvps_slug ON rsvps(slug, seq);
CREATE TABLE IF NOT EXISTS orders (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  status TEXT,
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, rev INTEGER NOT NULL, v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (
  k TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  slug TEXT,
  fp TEXT NOT NULL,
  csrf TEXT NOT NULL,
  created INTEGER NOT NULL,
  seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_seen ON sessions(seen);
CREATE INDEX IF NOT EXISTS sessions_slug ON sessions(slug) WHERE slug IS NOT NULL;
`;

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

let db = null;
let wrote = false;
const q = {}; // prepared statements

function readJsonSync(file, fallback) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw Object.assign(new Error(`cannot read ${file}: ${err.message}`), { cause: err });
  }
}

/** Imports the JSON files once (see the header). Returns a summary, or null when there was nothing to do. */
function migrateFromJson() {
  if (db.prepare("SELECT v FROM meta WHERE k = 'json_import'").get()) return null;
  const invFiles = existsSync(INV_DIR) ? readdirSync(INV_DIR).filter((f) => f.endsWith('.json') && SLUG_RE.test(f.slice(0, -5))) : [];
  const rsvpFiles = existsSync(RSVP_DIR) ? readdirSync(RSVP_DIR).filter((f) => f.endsWith('.json') && SLUG_RE.test(f.slice(0, -5))) : [];
  const ordersFile = resolve(DATA_DIR, 'orders.json');
  const siteFile = resolve(DATA_DIR, 'site.json');
  const extras = [ordersFile, siteFile, SESSIONS_FILE].filter(existsSync);
  const any = invFiles.length || rsvpFiles.length || extras.length;
  let backup = null;
  if (any) {
    // A plain copy of every JSON file before anything is imported: the way back if anything looks wrong.
    backup = resolve(BACKUP_DIR, `pre-sqlite-${stamp()}`);
    mkdirSync(backup, { recursive: true });
    if (invFiles.length) cpSync(INV_DIR, resolve(backup, 'invitations'), { recursive: true });
    if (rsvpFiles.length) cpSync(RSVP_DIR, resolve(backup, 'rsvps'), { recursive: true });
    for (const f of extras) cpSync(f, resolve(backup, f.slice(DATA_DIR.length + 1)));
  }
  const counts = { invitations: 0, rsvps: 0, orders: 0, sessions: 0, site: 0, skipped: [] };
  const run = db.transaction(() => {
    for (const f of invFiles) {
      const doc = readJsonSync(resolve(INV_DIR, f), null);
      if (!doc || typeof doc !== 'object' || doc.slug !== f.slice(0, -5)) { counts.skipped.push(`invitations/${f}`); continue; }
      q.insInv.run(doc.slug, 1, doc.status || 'draft', tokenHashOf(doc), doc.updatedAt || null, JSON.stringify(doc));
      counts.invitations++;
    }
    for (const f of rsvpFiles) {
      const slug = f.slice(0, -5);
      const list = readJsonSync(resolve(RSVP_DIR, f), []);
      if (!Array.isArray(list)) { counts.skipped.push(`rsvps/${f}`); continue; }
      for (const r of list) {
        if (!r || typeof r.id !== 'string') continue;
        counts.rsvps += q.insReply.run(slug, r.id, String(r.at || ''), r.attending || null, Number(r.guests) || 0, JSON.stringify(r)).changes;
      }
    }
    const orders = readJsonSync(ordersFile, []);
    if (Array.isArray(orders)) {
      for (const o of orders) if (o && typeof o.id === 'string') counts.orders += q.insOrder.run(o.id, o.status || null, JSON.stringify(o)).changes;
    }
    const site = readJsonSync(siteFile, null);
    if (site && typeof site === 'object') { q.putKv.run('site', 1, JSON.stringify(site)); counts.site = 1; }
    const sess = readJsonSync(SESSIONS_FILE, null);
    for (const [k, s] of Object.entries(sess?.sessions || {})) {
      if (!/^[a-f0-9]{64}$/.test(k) || !s || typeof s !== 'object') continue;
      counts.sessions += q.insSession.run(k, s.role, s.slug ?? null, s.fp, s.csrf, s.created, s.seen).changes;
    }
    db.prepare("INSERT INTO meta (k, v) VALUES ('json_import', ?)").run(JSON.stringify({ at: new Date().toISOString(), backup, ...counts }));
  });
  run();
  return { backup, ...counts };
}

/**
 * Writes that reached the JSON files after the import (during a deploy the old container keeps serving for a moment,
 * or someone ran with STORE=json for a while): replies and orders not in the database yet are added (by id; nothing
 * is changed or removed). An invitation file newer than the import with a higher version is only reported, since the
 * database copy may have been edited too. Runs at start and again 2 and 10 minutes later.
 */
function lateImport() {
  const rec = db.prepare("SELECT v FROM meta WHERE k = 'json_import'").pluck().get();
  if (!rec) return;
  // Only files changed since the import or the previous check (so a reply deleted later is not brought back).
  const last = Number(db.prepare("SELECT v FROM meta WHERE k = 'json_late_scan'").pluck().get()) || 0;
  const since = Math.max(Date.parse(JSON.parse(rec).at) || 0, last);
  const scanAt = Date.now();
  const newer = (f) => { try { return statSync(f).mtimeMs > since; } catch { return false; } };
  let replies = 0;
  let orders = 0;
  const stale = [];
  const run = db.transaction(() => {
    for (const f of existsSync(RSVP_DIR) ? readdirSync(RSVP_DIR) : []) {
      const slug = f.slice(0, -5);
      if (!f.endsWith('.json') || !SLUG_RE.test(slug) || !newer(resolve(RSVP_DIR, f))) continue;
      const list = readJsonSync(resolve(RSVP_DIR, f), []);
      for (const r of Array.isArray(list) ? list : []) {
        if (r && typeof r.id === 'string') replies += q.insReply.run(slug, r.id, String(r.at || ''), r.attending || null, Number(r.guests) || 0, JSON.stringify(r)).changes;
      }
    }
    const ordersFile = resolve(DATA_DIR, 'orders.json');
    if (newer(ordersFile)) {
      const list = readJsonSync(ordersFile, []);
      for (const o of Array.isArray(list) ? list : []) if (o && typeof o.id === 'string') orders += q.insOrder.run(o.id, o.status || null, JSON.stringify(o)).changes;
    }
    for (const f of existsSync(INV_DIR) ? readdirSync(INV_DIR) : []) {
      const slug = f.slice(0, -5);
      if (!f.endsWith('.json') || !SLUG_RE.test(slug) || !newer(resolve(INV_DIR, f))) continue;
      const file = readJsonSync(resolve(INV_DIR, f), null);
      const row = q.invGet.get(slug);
      if (!row) { if (file?.slug === slug) { q.insInv.run(slug, 1, file.status || 'draft', tokenHashOf(file), file.updatedAt || null, JSON.stringify(file)); stale.push(`${slug} (added)`); } continue; }
      if ((file?.version || 0) > (JSON.parse(row.doc).version || 0)) stale.push(slug);
    }
    db.prepare("INSERT INTO meta (k, v) VALUES ('json_late_scan', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(String(scanAt));
  });
  try { run(); } catch (err) { console.warn('[store] late JSON check failed:', err.message); return; }
  if (replies || orders) console.info(`[store] added ${replies} reply(ies) and ${orders} order(s) written to the JSON files after the import`);
  if (stale.length) console.warn(`[store] invitation file(s) changed after the import: ${stale.join(', ')}. The database copy is used; see docs/OPERATIONS.md "First deploy".`);
}

const tokenHashOf = (doc) => (typeof doc?.access?.tokenHash === 'string' ? doc.access.tokenHash
  : typeof doc?.clientAccess?.tokenHash === 'string' ? doc.clientAccess.tokenHash : null);

function prepare() {
  q.insInv = db.prepare('INSERT OR IGNORE INTO invitations (slug, rev, status, token_hash, updated_at, doc) VALUES (?, ?, ?, ?, ?, ?)');
  q.insReply = db.prepare('INSERT OR IGNORE INTO rsvps (slug, id, at, attending, guests, data) VALUES (?, ?, ?, ?, ?, ?)');
  q.insOrder = db.prepare('INSERT OR IGNORE INTO orders (id, status, data) VALUES (?, ?, ?)');
  q.putKv = db.prepare('INSERT INTO kv (k, rev, v) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET rev = kv.rev + 1, v = excluded.v');
  q.insSession = db.prepare('INSERT OR REPLACE INTO sessions (k, role, slug, fp, csrf, created, seen) VALUES (?, ?, ?, ?, ?, ?, ?)');

  q.invRev = db.prepare('SELECT rev FROM invitations WHERE slug = ?').pluck();
  q.invGet = db.prepare('SELECT rev, doc FROM invitations WHERE slug = ?');
  q.invAll = db.prepare('SELECT slug, rev FROM invitations');
  q.invByToken = db.prepare('SELECT slug FROM invitations WHERE token_hash = ?').pluck();
  q.invUpdate = db.prepare('UPDATE invitations SET rev = rev + 1, status = ?, token_hash = ?, updated_at = ?, doc = ? WHERE slug = ? AND rev = ?');
  q.invDelete = db.prepare('DELETE FROM invitations WHERE slug = ?');

  q.replies = db.prepare('SELECT data FROM rsvps WHERE slug = ? ORDER BY seq').pluck();
  q.replyCount = db.prepare('SELECT count(*) FROM rsvps WHERE slug = ?').pluck();
  q.replyDelete = db.prepare('DELETE FROM rsvps WHERE slug = ? AND id = ?');
  q.repliesDelete = db.prepare('DELETE FROM rsvps WHERE slug = ?');
  q.replyStats = db.prepare("SELECT slug, count(*) AS n, sum(CASE WHEN attending = 'yes' THEN guests ELSE 0 END) AS guests FROM rsvps GROUP BY slug");

  q.orders = db.prepare('SELECT data FROM orders ORDER BY seq').pluck();
  q.orderGet = db.prepare('SELECT data FROM orders WHERE id = ?').pluck();
  q.orderCount = db.prepare('SELECT count(*) FROM orders').pluck();
  q.orderNew = db.prepare("SELECT count(*) FROM orders WHERE status = 'new'").pluck();
  q.orderUpdate = db.prepare('UPDATE orders SET status = ?, data = ? WHERE id = ?');
  q.orderDelete = db.prepare('DELETE FROM orders WHERE id = ?');

  q.kvGet = db.prepare('SELECT rev, v FROM kv WHERE k = ?');

  q.sGet = db.prepare('SELECT role, slug, fp, csrf, created, seen FROM sessions WHERE k = ?');
  q.sAll = db.prepare('SELECT k, role, slug, fp, csrf, created, seen FROM sessions');
  q.sSeen = db.prepare('UPDATE sessions SET seen = ? WHERE k = ?');
  q.sDel = db.prepare('DELETE FROM sessions WHERE k = ?');
  q.sCount = db.prepare('SELECT count(*) FROM sessions').pluck();
  q.sCap = db.prepare('DELETE FROM sessions WHERE k IN (SELECT k FROM sessions ORDER BY seen ASC LIMIT ?)');
}

/** Opens (and on first start, creates and fills) the database. Synchronous: runs before the server listens. */
export function open() {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  const fresh = !existsSync(DB_FILE);
  db = new Database(DB_FILE, { timeout: 5000 });
  db.pragma('journal_mode = WAL');
  db.pragma(`synchronous = ${DB_SYNC === 'full' ? 'FULL' : 'NORMAL'}`);
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');
  db.pragma('cache_size = -16000'); // 16 MB page cache
  if (!fresh && statSync(DB_FILE).size < 512 * 2 ** 20) {
    const ok = db.pragma('quick_check', { simple: true });
    if (ok !== 'ok') throw new Error(`data/nimtto.db failed its integrity check (${ok}). Restore the latest file from data/backups/ (docs/OPERATIONS.md).`);
  }
  db.exec(SCHEMA);
  prepare();
  const m = migrateFromJson();
  if (m && (m.invitations || m.rsvps || m.orders || m.sessions || m.site)) {
    console.info(`[store] imported the JSON files into SQLite: ${m.invitations} invitations, ${m.rsvps} replies, ${m.orders} orders, ${m.sessions} sessions${m.site ? ', site settings' : ''}; copies kept in ${m.backup}`);
  }
  if (m?.skipped.length) console.warn(`[store] skipped unreadable files during the import: ${m.skipped.join(', ')}`);
  if (!m) lateImport();
  for (const ms of [2 * 60e3, 10 * 60e3]) setTimeout(() => { if (db) lateImport(); }, ms).unref();
  // Checkpoint the WAL into the main file a few seconds after writes (bounds what a power cut can take).
  setInterval(() => {
    if (!wrote) return;
    wrote = false;
    try { db.pragma('wal_checkpoint(PASSIVE)'); } catch (err) { console.warn('[store] checkpoint failed:', err.message); }
  }, 5000).unref();
  return db;
}

export function close() {
  if (!db) return;
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch { /* closing anyway */ }
  db.close();
  db = null;
}

const w = (fn) => { const r = fn(); wrote = true; return r; };

// ── Invitations ── docs are the same objects the JSON files held; `rev` grows on every write (cache key).
export function invitationRev(slug) { return q.invRev.get(slug) ?? 0; }
export function readInvitation(slug) {
  const row = q.invGet.get(slug);
  return row ? { rev: row.rev, doc: JSON.parse(row.doc) } : null;
}
export function listInvitationRevs() { return q.invAll.all(); }
export function slugByTokenHash(h) { return q.invByToken.get(h) ?? null; }

/** Creates (rev 1); 409 when the slug exists. */
export function insertInvitation(doc) {
  const r = w(() => q.insInv.run(doc.slug, 1, doc.status || 'draft', tokenHashOf(doc), doc.updatedAt || null, JSON.stringify(doc)));
  if (!r.changes) throw httpError(409, 'That link name is already taken.');
  return 1;
}

/** Replaces the doc read at `rev`; returns the new rev. Another process writing in between: 409 (reload). */
export function updateInvitation(doc, rev) {
  const r = w(() => q.invUpdate.run(doc.status || 'draft', tokenHashOf(doc), doc.updatedAt || null, JSON.stringify(doc), doc.slug, rev));
  if (!r.changes) throw httpError(409, 'This invitation was changed elsewhere a moment ago. Please try again.');
  return rev + 1;
}

/** Moves the invitation and its replies to data/trash/<slug>-<time>/ (files, as before), then removes the rows. */
export async function trashInvitation(slug) {
  const row = q.invGet.get(slug);
  const dest = resolve(TRASH_DIR, `${slug}-${Date.now()}`);
  await fs.mkdir(dest, { recursive: true });
  if (row) await fs.writeFile(resolve(dest, 'invitation.json'), JSON.stringify(JSON.parse(row.doc), null, 2), { mode: 0o600 });
  const replies = q.replies.all(slug).map((s) => JSON.parse(s));
  if (replies.length) await fs.writeFile(resolve(dest, 'rsvps.json'), JSON.stringify(replies, null, 2), { mode: 0o600 });
  try { await fs.rename(resolve(UPLOAD_DIR, slug), resolve(dest, 'uploads')); } catch (err) { if (err.code !== 'ENOENT') throw err; }
  w(() => db.transaction(() => { q.repliesDelete.run(slug); q.invDelete.run(slug); })());
}

// ── Replies
export function listReplies(slug) { return q.replies.all(slug).map((s) => JSON.parse(s)); }
export function addReply(slug, reply, max) {
  w(() => db.transaction(() => {
    if (q.replyCount.get(slug) >= max) throw httpError(507, 'This invitation cannot take more replies.');
    q.insReply.run(slug, reply.id, reply.at, reply.attending, Number(reply.guests) || 0, JSON.stringify(reply));
  }).immediate());
}
export function deleteReply(slug, id) { return w(() => q.replyDelete.run(slug, id).changes > 0); }
/** Map slug -> { count, guests } (guests: people attending). */
export function replyStats() {
  return new Map(q.replyStats.all().map((r) => [r.slug, { count: r.n, guests: r.guests || 0 }]));
}

// ── Orders
export function listOrders() { return q.orders.all().map((s) => JSON.parse(s)); }
export function getOrder(id) { const s = q.orderGet.get(id); return s ? JSON.parse(s) : null; }
export function addOrder(order, max) {
  w(() => db.transaction(() => {
    if (q.orderCount.get() >= max) throw httpError(507, 'We cannot take more requests right now. Please call us.');
    q.insOrder.run(order.id, order.status || null, JSON.stringify(order));
  }).immediate());
}
export function saveOrder(order) { return w(() => q.orderUpdate.run(order.status || null, JSON.stringify(order), order.id).changes > 0); }
export function deleteOrder(id) { return w(() => q.orderDelete.run(id).changes > 0); }
export function countNewOrders() { return q.orderNew.get(); }

// ── Small documents (site settings)
export function getKv(k) { const r = q.kvGet.get(k); return r ? { rev: r.rev, value: JSON.parse(r.v) } : null; }
export function putKv(k, value) { w(() => q.putKv.run(k, 1, JSON.stringify(value))); return q.kvGet.get(k).rev; }

// ── Sessions (lib/sessions.js)
export const sessions = {
  get: (k) => q.sGet.get(k) || null,
  all: () => q.sAll.all(),
  put: (k, s) => w(() => q.insSession.run(k, s.role, s.role === 'client' ? s.slug : null, s.fp, s.csrf, s.created, s.seen)),
  seen: (k, t) => w(() => q.sSeen.run(t, k)),
  del: (k) => w(() => q.sDel.run(k).changes),
  delMany: (keys) => w(() => db.transaction(() => { for (const k of keys) q.sDel.run(k); })()),
  count: () => q.sCount.get(),
  dropOldest: (n) => w(() => q.sCap.run(n).changes),
};

// ── Health and backups
export function ping() { return db.prepare('SELECT 1').pluck().get() === 1; }

/** Online backup to `file` (consistent snapshot; the app keeps serving while it runs). */
export async function backupTo(file) {
  await db.backup(file);
}

/** Everything, for scripts/export-json.js (the way back to STORE=json). */
export function dumpAll() {
  return {
    invitations: q.invAll.all().map(({ slug }) => readInvitation(slug).doc),
    rsvps: Object.fromEntries([...replyStats().keys()].map((slug) => [slug, listReplies(slug)])),
    orders: listOrders(),
    site: getKv('site')?.value ?? null,
    sessions: Object.fromEntries(q.sAll.all().map(({ k, ...s }) => [k, s.role === 'client' ? s : { role: s.role, fp: s.fp, csrf: s.csrf, created: s.created, seen: s.seen }])),
  };
}
