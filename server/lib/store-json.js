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

export function open() { loadSessions(); loadCustomers(); loadStaff(); loadAudit(); }
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

// ── Customer accounts: an in-memory map written through to data/customers.json (same pattern as the sessions).
const CUSTOMERS_FILE = resolve(DATA_DIR, 'customers.json');
const cmap = new Map();
let cloaded = false;
function loadCustomers() {
  if (cloaded) return;
  cloaded = true;
  try {
    const raw = JSON.parse(readFileSync(CUSTOMERS_FILE, 'utf8'));
    for (const c of raw?.customers || []) if (c && typeof c.id === 'string' && typeof c.email === 'string') cmap.set(c.id, c);
  } catch (err) {
    if (err.code !== 'ENOENT') throw Object.assign(new Error(`cannot read ${CUSTOMERS_FILE}: ${err.message}`), { cause: err });
  }
}
let cwriting = null;
let cdirty = false;
function persistCustomers() {
  cdirty = true;
  if (!cwriting) {
    cwriting = (async () => {
      try {
        while (cdirty) {
          cdirty = false;
          await writeJsonAtomic(CUSTOMERS_FILE, { v: 1, customers: [...cmap.values()] });
        }
      } finally {
        cwriting = null;
      }
    })();
  }
  return cwriting;
}
export const customers = {
  get: (id) => (cmap.has(id) ? structuredClone(cmap.get(id)) : null),
  byEmail: (email) => { for (const c of cmap.values()) if (c.email === email) return structuredClone(c); return null; },
  all: () => [...cmap.values()].map((c) => structuredClone(c)),
  put: (c) => { cmap.set(c.id, structuredClone(c)); return persistCustomers(); },
  del: (id) => { const had = cmap.delete(id); if (had) persistCustomers(); return had; },
};

// ── Staff accounts: an in-memory map written through to data/staff.json (same pattern as the customers).
const STAFF_FILE = resolve(DATA_DIR, 'staff.json');
const smap = new Map();
let sloaded = false;
function loadStaff() {
  if (sloaded) return;
  sloaded = true;
  try {
    const raw = JSON.parse(readFileSync(STAFF_FILE, 'utf8'));
    for (const x of raw?.staff || []) if (x && typeof x.id === 'string' && typeof x.email === 'string') smap.set(x.id, x);
  } catch (err) {
    if (err.code !== 'ENOENT') throw Object.assign(new Error(`cannot read ${STAFF_FILE}: ${err.message}`), { cause: err });
  }
}
let swriting = null;
let sdirty = false;
function persistStaff() {
  sdirty = true;
  if (!swriting) {
    swriting = (async () => {
      try {
        while (sdirty) {
          sdirty = false;
          await writeJsonAtomic(STAFF_FILE, { v: 1, staff: [...smap.values()] });
        }
      } finally {
        swriting = null;
      }
    })();
  }
  return swriting;
}
export const staff = {
  get: (id) => (smap.has(id) ? structuredClone(smap.get(id)) : null),
  byEmail: (email) => { for (const x of smap.values()) if (x.email === email) return structuredClone(x); return null; },
  all: () => [...smap.values()].map((x) => structuredClone(x)),
  put: (x) => { smap.set(x.id, structuredClone(x)); return persistStaff(); },
  del: (id) => { const had = smap.delete(id); if (had) persistStaff(); return had; },
};

// ── Audit log: data/audit.jsonl, one entry per line, appended; also kept in memory (oldest first). Past
// AUDIT_SOFT_CAP entries the file is rewritten with the newest 50 000 (lib/audit.js prunes by age as well).
const AUDIT_FILE = resolve(DATA_DIR, 'audit.jsonl');
const AUDIT_SOFT_CAP = 60_000;
const alog = [];
let aloaded = false;
let aseq = 0;
let achain = Promise.resolve();
function loadAudit() {
  if (aloaded) return;
  aloaded = true;
  let text = '';
  try { text = readFileSync(AUDIT_FILE, 'utf8'); } catch (err) { if (err.code !== 'ENOENT') console.warn(`[audit] ${AUDIT_FILE} unreadable: ${err.message}`); }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { const e = JSON.parse(line); if (e && typeof e.seq === 'number') { alog.push(e); aseq = Math.max(aseq, e.seq); } } catch { /* a torn last line */ }
  }
}
async function writeJsonLines(file, list) {
  await fs.mkdir(dirname(file), { recursive: true });
  const tmp = resolve(dirname(file), `.${basename(file)}.${randomBytes(6).toString('hex')}.tmp`);
  await fs.writeFile(tmp, list.map((e) => JSON.stringify(e)).join('\n') + (list.length ? '\n' : ''), { mode: 0o600 });
  for (let i = 0; ; i++) {
    try { await fs.rename(tmp, file); return; } catch (err) {
      if (i >= 6 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) { await fs.rm(tmp, { force: true }); throw err; }
      await sleep(25 * (i + 1));
    }
  }
}
const rewriteAudit = () => {
  const snapshot = alog.slice();
  achain = achain.then(() => writeJsonLines(AUDIT_FILE, snapshot)).catch((err) => console.error('[audit] could not save:', err.message));
  return achain;
};
const auditMatch = (e, actor, text) => {
  if (actor && e.actor !== actor) return false;
  if (!text) return true;
  const t = String(text).toLowerCase();
  return [e.action, e.label, e.target, e.actorEmail, e.ip].some((v) => typeof v === 'string' && v.toLowerCase().includes(t));
};
export const audit = {
  add: (e) => {
    loadAudit();
    const row = { seq: ++aseq, ...e, fields: e.fields || [] };
    alog.push(row);
    if (alog.length > AUDIT_SOFT_CAP) { alog.splice(0, alog.length - 50_000); return rewriteAudit(); }
    const line = `${JSON.stringify(row)}\n`;
    achain = achain.then(async () => { await fs.mkdir(DATA_DIR, { recursive: true }); await fs.appendFile(AUDIT_FILE, line, { mode: 0o600 }); })
      .catch((err) => console.error('[audit] could not save:', err.message));
    return achain;
  },
  list: ({ actor = null, text = null, offset = 0, limit = 50 } = {}) => {
    loadAudit();
    const hits = [];
    for (let i = alog.length - 1; i >= 0; i--) if (auditMatch(alog[i], actor, text)) hits.push(alog[i]);
    return { total: hits.length, rows: hits.slice(offset, offset + limit).map((e) => structuredClone(e)) };
  },
  actors: () => {
    loadAudit();
    const seen = new Map();
    for (let i = alog.length - 1; i >= 0 && seen.size < 500; i--) {
      const k = `${alog[i].actor}\n${alog[i].actorEmail || ''}`;
      if (!seen.has(k)) seen.set(k, { actor: alog[i].actor, email: alog[i].actorEmail || null });
    }
    return [...seen.values()];
  },
  prune: (before, keep, cap) => {
    loadAudit();
    const n = alog.length;
    let drop = 0;
    while (drop < n - keep && alog[drop].at < before) drop++;
    drop = Math.max(drop, n - cap);
    if (drop <= 0) return 0;
    alog.splice(0, drop);
    rewriteAudit();
    return drop;
  },
  flush: () => achain,
};

export const ping = () => true;
export async function backupTo() { /* the JSON store is backed up by copying data/ (docs/OPERATIONS.md) */ }
