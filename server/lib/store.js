// JSON file storage with atomic writes and a per-key lock (read-modify-write never interleaves).
import { promises as fs } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve, dirname, basename } from 'node:path';
import { INV_DIR, RSVP_DIR, TRASH_DIR, UPLOAD_DIR } from './env.js';

export const SLUG_RE = /^[a-z0-9-]{3,64}$/;

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Write to a temp file in the same folder, fsync, then rename over the target. */
export async function writeJsonAtomic(file, value) {
  await fs.mkdir(dirname(file), { recursive: true });
  const tmp = resolve(dirname(file), `.${basename(file)}.${randomBytes(6).toString('hex')}.tmp`);
  const fh = await fs.open(tmp, 'w', 0o600);
  try {
    await fh.writeFile(JSON.stringify(value, null, 2));
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

const must = (slug) => {
  if (!SLUG_RE.test(slug)) throw Object.assign(new Error('Invalid slug'), { status: 400 });
  return slug;
};

export const invPath = (slug) => resolve(INV_DIR, `${must(slug)}.json`);
export const rsvpPath = (slug) => resolve(RSVP_DIR, `${must(slug)}.json`);
export const uploadDir = (slug) => resolve(UPLOAD_DIR, must(slug));

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

export const getInvitation = async (slug) => migrateDoc(await readJson(invPath(slug)));

export async function listInvitations() {
  await fs.mkdir(INV_DIR, { recursive: true });
  const files = (await fs.readdir(INV_DIR)).filter((f) => f.endsWith('.json') && SLUG_RE.test(f.slice(0, -5)));
  const docs = await Promise.all(files.map((f) => readJson(resolve(INV_DIR, f)).catch(() => null)));
  return docs.filter(Boolean).map(migrateDoc);
}

/** Moves an invitation, its replies and its uploads into data/trash/<slug>-<time>/ (recoverable). */
export async function trashInvitation(slug) {
  const dest = resolve(TRASH_DIR, `${must(slug)}-${Date.now()}`);
  await fs.mkdir(dest, { recursive: true });
  const moves = [
    [invPath(slug), resolve(dest, 'invitation.json')],
    [rsvpPath(slug), resolve(dest, 'rsvps.json')],
    [uploadDir(slug), resolve(dest, 'uploads')],
  ];
  for (const [from, to] of moves) {
    try { await fs.rename(from, to); } catch (err) { if (err.code !== 'ENOENT') throw err; }
  }
}
