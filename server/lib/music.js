// The site-wide music library (docs/API.md "Music library"). Built-in songs ship in public/audio and are listed in
// src/core/music-library.js; the planner can rename them, change their mood, turn them off and reorder them, but
// never delete their files. The planner's own MP3s are stored as uploads/_site/music/<random id>.mp3.
// Stored document (key "music"): { items: { <id>: { title, titleNe, artist, mood, credit, enabled, ... } }, order: [id] }.
import { promises as fs } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { UPLOAD_DIR } from './env.js';
import { getDoc, putDoc, withLock, listInvitations } from './store.js';
import { readMultipart, receiving, looksLikeMp3, mp3Duration, MAX_BYTES } from './uploads.js';
import { rateLimiter } from './security.js';
import { BUILTIN_MUSIC, MUSIC_MOODS, MOOD_IDS, LIBRARY_DIR_URL } from '../../src/core/music-library.js';

export const MUSIC_DIR = resolve(UPLOAD_DIR, '_site', 'music');
export const CUSTOM_ID_RE = /^[A-Za-z0-9_-]{24}$/;
const BUILTIN = new Map(BUILTIN_MUSIC.map((t) => [t.id, t]));
const MAX_TRACKS = 200;
const MAX_SECONDS = 20 * 60;

const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });
// One line of plain text: no control characters, trimmed, capped. Rendered as text everywhere (never as HTML).
const line = (v, max) => String(v ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); // \s also covers U+2028/2029
const uploadLimit = rateLimiter({ windowMs: 60 * 60 * 1000, max: 60 });

async function readDoc() {
  const v = (await getDoc('music'))?.value;
  return {
    items: v?.items && typeof v.items === 'object' && !Array.isArray(v.items) ? v.items : {},
    order: Array.isArray(v?.order) ? v.order.filter((x) => typeof x === 'string') : [],
  };
}

/** Every track, in the planner's order (built-ins first by default, then uploads oldest first). */
function tracksOf(doc) {
  const out = [];
  for (const b of BUILTIN_MUSIC) {
    const o = doc.items[b.id] || {};
    out.push({
      id: b.id, builtin: true, src: b.src, duration: b.duration,
      title: o.title || b.title, titleNe: o.titleNe ?? b.titleNe ?? '', artist: o.artist ?? b.artist ?? '',
      mood: MOOD_IDS.has(o.mood) ? o.mood : b.mood, credit: o.credit ?? b.credit ?? '',
      enabled: o.enabled !== false,
    });
  }
  const customs = Object.entries(doc.items)
    .filter(([id, t]) => CUSTOM_ID_RE.test(id) && t && typeof t === 'object' && !BUILTIN.has(id))
    .sort(([, a], [, b]) => String(a.addedAt || '').localeCompare(String(b.addedAt || '')));
  for (const [id, t] of customs) {
    out.push({
      id, builtin: false, src: `${LIBRARY_DIR_URL}${id}.mp3`, duration: Number(t.duration) || 0,
      title: t.title || 'Untitled', titleNe: t.titleNe || '', artist: t.artist || '',
      mood: MOOD_IDS.has(t.mood) ? t.mood : 'instrumental', credit: t.credit || '',
      enabled: t.enabled !== false, addedAt: t.addedAt || '',
    });
  }
  const rank = new Map(doc.order.map((id, i) => [id, i]));
  const base = new Map(out.map((t, i) => [t.id, i]));
  const key = (t) => (rank.has(t.id) ? rank.get(t.id) : doc.order.length + base.get(t.id));
  return out.sort((a, b) => key(a) - key(b));
}

const publicTrack = ({ id, title, titleNe, artist, mood, duration, src, credit, builtin }) => ({ id, title, titleNe, artist, mood, duration, src, credit, builtin });

/** GET /api/music (public): the enabled tracks, in order, and the moods to group them by. */
export async function publicList(req, res) {
  const tracks = tracksOf(await readDoc()).filter((t) => t.enabled).map(publicTrack);
  res.set('Cache-Control', 'no-cache');
  res.json({ moods: MUSIC_MOODS, tracks });
}

/** GET /api/admin/music: every track, with enabled and builtin. */
export async function adminList(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json({ moods: MUSIC_MOODS, tracks: tracksOf(await readDoc()) });
}

/** The editable fields from a body; only those present. Throws 400 on a bad value. */
function editsOf(body, { requireTitle = false } = {}) {
  const b = body && typeof body === 'object' ? body : {};
  const out = {};
  if ('title' in b || requireTitle) {
    out.title = line(b.title, 80);
    if (!out.title) throw httpError(400, 'Give the song a title.');
  }
  if ('titleNe' in b) out.titleNe = line(b.titleNe, 80);
  if ('artist' in b) out.artist = line(b.artist, 80);
  if ('credit' in b) out.credit = line(b.credit, 300);
  if ('mood' in b) {
    if (!MOOD_IDS.has(b.mood)) throw httpError(400, 'Choose one of the moods.');
    out.mood = b.mood;
  }
  if ('enabled' in b) {
    if (typeof b.enabled !== 'boolean') throw httpError(400, 'enabled must be true or false.');
    out.enabled = b.enabled;
  }
  return out;
}

/** POST /api/admin/music (multipart: file, title, titleNe?, artist?, mood, credit?): a new MP3 in the library. */
export async function upload(req, res) {
  const lim = uploadLimit.hit('admin');
  if (!lim.ok) { res.set('Retry-After', String(lim.retryAfter)); throw httpError(429, 'Too many uploads in the last hour. Please wait a little.'); }
  const len = Number(req.get('content-length') || 0);
  if (len > MAX_BYTES + 64 * 1024) { res.set('Connection', 'close'); throw httpError(413, 'That file is larger than 15 MB.'); }
  let parsed;
  try {
    parsed = await receiving.run(() => readMultipart(req, { maxBytes: MAX_BYTES, fields: 6, fieldSize: 600 }));
  } catch (err) {
    if (err.status === 503) res.set('Connection', 'close');
    throw err;
  }
  const { fields, file } = parsed;
  // The bytes decide, never the name or the type the browser claimed.
  const duration = looksLikeMp3(file.buffer) ? mp3Duration(file.buffer) : 0;
  if (!duration) throw httpError(415, 'That file is not an MP3.');
  if (duration > MAX_SECONDS) throw httpError(400, 'That song is longer than 20 minutes.');
  const fallbackTitle = line(String(file.name || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[_-]+/g, ' '), 80);
  const edits = editsOf({ mood: 'instrumental', ...fields, title: fields.title || fallbackTitle || 'Untitled', enabled: true }, { requireTitle: true });
  const id = randomBytes(18).toString('base64url');
  const track = await withLock('music', async () => {
    const doc = await readDoc();
    if (Object.keys(doc.items).filter((k) => !BUILTIN.has(k)).length >= MAX_TRACKS) throw httpError(400, `The library holds up to ${MAX_TRACKS} uploaded songs. Delete one first.`);
    await fs.mkdir(MUSIC_DIR, { recursive: true });
    await fs.writeFile(resolve(MUSIC_DIR, `${id}.mp3`), file.buffer, { mode: 0o644 });
    doc.items[id] = { ...edits, duration, addedAt: new Date().toISOString() };
    doc.order = [...tracksOf(doc).map((t) => t.id).filter((x) => x !== id), id];
    await putDoc('music', doc);
    return tracksOf(doc).find((t) => t.id === id);
  });
  console.info(`[admin] music uploaded id=${id} bytes=${file.size} seconds=${duration}`);
  res.status(201).json({ track });
}

const known = (doc, id) => BUILTIN.has(id) || (CUSTOM_ID_RE.test(id) && doc.items[id]);

/** PATCH /api/admin/music/:id { title?, titleNe?, artist?, mood?, credit?, enabled? } */
export async function patch(req, res) {
  const id = req.params.musicId;
  const edits = editsOf(req.body);
  const track = await withLock('music', async () => {
    const doc = await readDoc();
    if (!known(doc, id)) throw httpError(404, 'No such song.');
    doc.items[id] = { ...(doc.items[id] || {}), ...edits };
    await putDoc('music', doc);
    return tracksOf(doc).find((t) => t.id === id);
  });
  res.json({ track });
}

/** PATCH /api/admin/music { order: [id, …] }: the library's order (ids left out keep their place after these). */
export async function reorder(req, res) {
  const order = req.body?.order;
  if (!Array.isArray(order) || order.length > MAX_TRACKS + BUILTIN.size || !order.every((x) => typeof x === 'string' && x.length <= 40)) {
    throw httpError(400, 'order must be a list of song ids.');
  }
  const tracks = await withLock('music', async () => {
    const doc = await readDoc();
    const ids = [...new Set(order)].filter((id) => known(doc, id));
    const rest = tracksOf(doc).map((t) => t.id).filter((id) => !ids.includes(id));
    doc.order = [...ids, ...rest];
    await putDoc('music', doc);
    return tracksOf(doc);
  });
  res.json({ tracks });
}

/**
 * DELETE /api/admin/music/:id: an uploaded song leaves the library. Its file is removed too, unless an invitation
 * (draft or published) still plays it; then the file stays so that invitation keeps its music.
 */
export async function remove(req, res) {
  const id = req.params.musicId;
  if (BUILTIN.has(id)) throw httpError(400, 'Built-in songs cannot be deleted. Turn it off instead.');
  if (!CUSTOM_ID_RE.test(id)) throw httpError(404, 'No such song.');
  const src = `${LIBRARY_DIR_URL}${id}.mp3`;
  const used = await withLock('music', async () => {
    const doc = await readDoc();
    if (!doc.items[id]) throw httpError(404, 'No such song.');
    delete doc.items[id];
    doc.order = doc.order.filter((x) => x !== id);
    await putDoc('music', doc);
    const docs = await listInvitations();
    const n = docs.filter((d) => [d.draft, d.published].some((x) => x?.music?.tracks?.some?.((t) => t?.src === src))).length;
    if (!n) await fs.rm(resolve(MUSIC_DIR, `${id}.mp3`), { force: true });
    return n;
  });
  res.json({ ok: true, inUse: used });
}
