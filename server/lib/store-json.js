// JSON-file storage: the original store, kept as the rollback path (STORE=json). One file per invitation and per
// invitation's replies, orders.json, site.json, sessions.json; atomic writes (temp file, fsync, rename).
// One process only: the locks that keep read-modify-write from interleaving live in memory (lib/store.js).
import { promises as fs, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve, dirname, basename } from 'node:path';
import { DATA_DIR, INV_DIR, RSVP_DIR, TRASH_DIR, UPLOAD_DIR, SESSIONS_FILE } from './env.js';

const SLUG_RE = /^[a-z0-9-]{3,64}$/;
const ORDERS_FILE = resolve(DATA_DIR, 'orders.json');
const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Write to a temp file in the same folder, fsync, then rename over the target. */
export async function writeJsonAtomic(file, value, pretty = true) {
  await fs.mkdir(dirname(file), { recursive: true });
  const tmp = resolve(dirname(file), `.${basename(file)}.${randomBytes(6).toString('hex')}.tmp`);
  const fh = await fs.open(tmp, 'w', 0o600);
  try {
    await fh.writeFile(pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value));
    await fh.sync();
  } finally {
    await fh.close();
  }
  // Windows can briefly refuse a rename while another handle reads the target.
  for (let i = 0; ; i++) {
    try {
      await fs.rename(tmp, file);
      return;
    } catch (err) {
      if (i >= 6 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) {
        await fs.rm(tmp, { force: true });
        throw err;
      }
      await sleep(25 * (i + 1));
    }
  }
}

export async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

const invPath = (slug) => resolve(INV_DIR, `${slug}.json`);
const rsvpPath = (slug) => resolve(RSVP_DIR, `${slug}.json`);

export function open() { loadSessions(); }
export function close() {}

// ── Invitations: rev = the file's mtime and size (changes on every write, also by another program).
async function statRev(slug) {
  try { const s = await fs.stat(invPath(slug)); return s.mtimeMs * 1e3 + (s.size % 1000) + 1; } catch (err) { if (err.code === 'ENOENT') return 0; throw err; }
}
export const invitationRev = statRev;
export async function readInvitation(slug) {
  const rev = await statRev(slug);
  if (!rev) return null;
  const doc = await readJson(invPath(slug));
  return doc ? { rev, doc } : null;
}
export async function listInvitationRevs() {
  await fs.mkdir(INV_DIR, { recursive: true });
  const files = (await fs.readdir(INV_DIR)).filter((f) => f.endsWith('.json') && SLUG_RE.test(f.slice(0, -5)));
  return Promise.all(files.map(async (f) => ({ slug: f.slice(0, -5), rev: await statRev(f.slice(0, -5)) })));
}
export async function insertInvitation(doc) {
  if (await statRev(doc.slug)) throw httpError(409, 'That link name is already taken.');
  await writeJsonAtomic(invPath(doc.slug), doc);
  return statRev(doc.slug);
}
export async function updateInvitation(doc) {
  await writeJsonAtomic(invPath(doc.slug), doc);
  return statRev(doc.slug);
}
export async function trashInvitation(slug) {
  const dest = resolve(TRASH_DIR, `${slug}-${Date.now()}`);
  await fs.mkdir(dest, { recursive: true });
  const moves = [
    [invPath(slug), resolve(dest, 'invitation.json')],
    [rsvpPath(slug), resolve(dest, 'rsvps.json')],
    [resolve(UPLOAD_DIR, slug), resolve(dest, 'uploads')],
  ];
  for (const [from, to] of moves) {
    try { await fs.rename(from, to); } catch (err) { if (err.code !== 'ENOENT') throw err; }
  }
}

// ── Replies
export const listReplies = (slug) => readJson(rsvpPath(slug), []);
export async function addReply(slug, reply, max) {
  const all = await readJson(rsvpPath(slug), []);
  if (all.length >= max) throw httpError(507, 'This invitation cannot take more replies.');
  all.push(reply);
  await writeJsonAtomic(rsvpPath(slug), all);
}
export async function deleteReply(slug, id) {
  const all = await readJson(rsvpPath(slug), []);
  const next = all.filter((r) => r.id !== id);
  if (next.length === all.length) return false;
  await writeJsonAtomic(rsvpPath(slug), next);
  return true;
}
export async function replyStats() {
  await fs.mkdir(RSVP_DIR, { recursive: true });
  const files = (await fs.readdir(RSVP_DIR)).filter((f) => f.endsWith('.json') && SLUG_RE.test(f.slice(0, -5)));
  const out = new Map();
  await Promise.all(files.map(async (f) => {
    const list = await readJson(resolve(RSVP_DIR, f), []).catch(() => []);
    let guests = 0;
    for (const r of list) if (r.attending === 'yes') guests += Number(r.guests) || 0;
    out.set(f.slice(0, -5), { count: list.length, guests });
  }));
  return out;
}

// ── Orders
export const listOrders = () => readJson(ORDERS_FILE, []);
export async function getOrder(id) { return (await listOrders()).find((o) => o.id === id) || null; }
export async function getOrderByRef(ref) { return (await listOrders()).find((o) => o.ref === ref) || null; }
export async function addOrder(order, max) {
  const all = await listOrders();
  if (all.length >= max) throw httpError(507, 'We cannot take more requests right now. Please call us.');
  all.push(order);
  await writeJsonAtomic(ORDERS_FILE, all);
}
export async function saveOrder(order) {
  const all = await listOrders();
  const i = all.findIndex((o) => o.id === order.id);
  if (i < 0) return false;
  all[i] = order;
  await writeJsonAtomic(ORDERS_FILE, all);
  return true;
}
export async function deleteOrder(id) {
  const all = await listOrders();
  const next = all.filter((o) => o.id !== id);
  if (next.length === all.length) return false;
  await writeJsonAtomic(ORDERS_FILE, next);
  return true;
}
export async function countNewOrders() { return (await listOrders()).filter((o) => o.status === 'new').length; }

// ── Small documents
const kvFile = (k) => resolve(DATA_DIR, `${k}.json`);
let kvRev = 1;
export async function getKv(k) { const v = await readJson(kvFile(k), null); return v == null ? null : { rev: kvRev, value: v }; }
export async function putKv(k, value) { await writeJsonAtomic(kvFile(k), value); return ++kvRev; }

// ── Sessions: an in-memory map written through to data/sessions.json (coalesced: one write at a time).
const map = new Map();
let loaded = false;
function loadSessions() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = JSON.parse(readFileSync(SESSIONS_FILE, 'utf8'));
    for (const [k, s] of Object.entries(raw?.sessions || {})) map.set(k, s);
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`[auth] sessions file unreadable, starting empty: ${err.message}`);
  }
}
let writing = null;
let dirty = false;
function persist() {
  dirty = true;
  if (!writing) {
    writing = (async () => {
      try {
        while (dirty) {
          dirty = false;
          await writeJsonAtomic(SESSIONS_FILE, { v: 1, sessions: Object.fromEntries(map) }, false);
        }
      } catch (err) {
        dirty = true;
        console.error('[auth] could not save sessions:', err.message);
      } finally {
        writing = null;
      }
    })();
  }
  return writing;
}
export const sessions = {
  get: (k) => map.get(k) || null,
  all: () => [...map].map(([k, s]) => ({ k, ...s })),
  put: (k, s) => { map.set(k, s); return persist(); },
  seen: (k, t) => { const s = map.get(k); if (s) { s.seen = t; persist(); } },
  del: (k) => { const had = map.delete(k); if (had) persist(); return had ? 1 : 0; },
  delMany: (keys) => { let n = 0; for (const k of keys) if (map.delete(k)) n++; if (n) persist(); },
  count: () => map.size,
  dropOldest: (n) => { const old = [...map].sort((a, b) => a[1].seen - b[1].seen).slice(0, n); for (const [k] of old) map.delete(k); if (old.length) persist(); return old.length; },
  flush: () => (writing || Promise.resolve()),
};

export const ping = () => true;
export async function backupTo() { /* the JSON store is backed up by copying data/ (docs/OPERATIONS.md) */ }
