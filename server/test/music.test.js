// The music library (lib/music.js): public list, admin upload/edit/reorder/delete, MP3 sniffing, invitations using
// library songs. Runs the real handlers, sessions and store in a throwaway DATA_ROOT.
// Run: npm test (in server/), and STORE=json npm test for the JSON store.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { hash as argonHash } from '@node-rs/argon2';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-music-'));
process.env.DATA_ROOT = DATA_ROOT;
process.env.ADMIN_EMAIL = 'owner@test.local';
process.env.ADMIN_PASSWORD_HASH = await argonHash('test-password-1', { memoryCost: 4096, timeCost: 2 });

const store = await import('../lib/store.js');
store.openStore();
const { startSessions } = await import('../lib/sessions.js');
startSessions();
const express = (await import('express')).default;
const auth = await import('../lib/auth.js');
const inv = await import('../lib/invitations.js');
const music = await import('../lib/music.js');
const { mp3Duration } = await import('../lib/uploads.js');
const { BUILTIN_MUSIC } = await import('../../src/core/music-library.js');

let server;
let base;
let admin;

before(async () => {
  const app = express();
  app.use(auth.loadSession);
  const api = express.Router();
  const json = express.json({ limit: '64kb' });
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const editor = auth.requireEditor(store.peekInvitation);
  api.post('/auth/login', json, wrap(auth.login));
  api.get('/music', wrap(music.publicList));
  api.get('/admin/music', auth.requireAdmin, wrap(music.adminList));
  api.post('/admin/music', auth.requireAdmin, wrap(music.upload));
  api.patch('/admin/music', auth.requireAdmin, json, wrap(music.reorder));
  api.patch('/admin/music/:musicId', auth.requireAdmin, json, wrap(music.patch));
  api.delete('/admin/music/:musicId', auth.requireAdmin, wrap(music.remove));
  api.post('/invitations', auth.requireAdmin, json, wrap(inv.create));
  api.get('/invitations/:slug', editor, wrap(inv.read));
  api.put('/invitations/:slug', editor, express.json({ limit: '768kb' }), wrap(inv.update));
  app.use('/api', api);
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.expose || (err.status || 500) < 500 ? err.message : String(err.stack), ...(err.errors ? { errors: err.errors } : {}) }));
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
  admin = await browser().login('owner@test.local', 'test-password-1');
});

after(() => {
  server?.close();
  try { store.closeStore(); } catch { /* already closed */ }
  try { rmSync(DATA_ROOT, { recursive: true, force: true }); } catch { /* Windows may hold a file a moment */ }
});

/** A browser: keeps its own session cookie and CSRF token. form: a FormData body (multipart). */
function browser() {
  const b = { cookie: '', csrf: '' };
  b.req = async (path, { method = 'GET', body, form, csrf = true } = {}) => {
    const headers = { Origin: base };
    if (b.cookie) headers.Cookie = b.cookie;
    if (csrf && b.csrf && method !== 'GET') headers['X-CSRF-Token'] = b.csrf;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(base + path, { method, headers, body: form || (body !== undefined ? JSON.stringify(body) : undefined) });
    const set = r.headers.get('set-cookie');
    if (set) { const v = set.split(';')[0]; b.cookie = v.endsWith('=') ? '' : v; }
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    if (data && typeof data === 'object' && typeof data.csrf === 'string') b.csrf = data.csrf;
    return { status: r.status, body: data };
  };
  b.login = async (email, password) => {
    const r = await b.req('/api/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(r.status, 200, `login ${email}: ${JSON.stringify(r.body)}`);
    return b;
  };
  return b;
}

/** A real (silent) MP3: `frames` MPEG-1 layer III frames at 128 kbps, 44.1 kHz (417 bytes, 1152 samples each). */
function silentMp3(frames = 200) {
  const frame = Buffer.alloc(417);
  frame.set([0xff, 0xfb, 0x90, 0x00]);
  return Buffer.concat(Array.from({ length: frames }, () => frame));
}
const form = (buf, name, fields = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  f.append('file', new Blob([buf]), name);
  return f;
};

test('the MP3 reader counts frames; anything else reads as 0 seconds', () => {
  assert.equal(mp3Duration(silentMp3(200)), Math.round((200 * 1152 / 44100) * 10) / 10);
  assert.equal(mp3Duration(Buffer.from('<html><body>not audio</body></html>'.repeat(100))), 0);
  assert.equal(mp3Duration(Buffer.alloc(50_000)), 0);
});

test('the public list has the built-in songs with their credits; no session needed', async () => {
  const r = await browser().req('/api/music');
  assert.equal(r.status, 200);
  assert.ok(r.body.moods.length >= 5);
  assert.equal(r.body.tracks.length, BUILTIN_MUSIC.length);
  assert.ok(BUILTIN_MUSIC.length >= 12, 'at least 12 built-in songs');
  for (const t of r.body.tracks) {
    assert.deepEqual(Object.keys(t).sort(), ['artist', 'builtin', 'credit', 'duration', 'id', 'mood', 'src', 'title', 'titleNe'].sort());
    assert.match(t.src, /^\/audio\/[a-z0-9-]+\.mp3$/);
    assert.ok(existsSync(resolve(import.meta.dirname, '..', '..', 'public', t.src.slice(1))), `${t.src} is in public/`);
    assert.ok(t.duration > 30, `${t.id} has a duration`);
    assert.ok(t.credit, `${t.id} has a credit`);
  }
});

test('only the planner can list, upload, edit, reorder or delete; CSRF is required', async () => {
  const anon = browser();
  assert.equal((await anon.req('/api/admin/music')).status, 401);
  assert.equal((await anon.req('/api/admin/music', { method: 'POST', form: form(silentMp3(), 'a.mp3') })).status, 401);
  assert.equal((await anon.req('/api/admin/music/canon-in-d', { method: 'PATCH', body: { enabled: false } })).status, 401);
  assert.equal((await anon.req('/api/admin/music/canon-in-d', { method: 'DELETE' })).status, 401);
  // signed in, but without the CSRF token
  assert.equal((await admin.req('/api/admin/music/canon-in-d', { method: 'PATCH', body: { enabled: false }, csrf: false })).status, 403);
  assert.equal((await admin.req('/api/admin/music', { method: 'POST', form: form(silentMp3(), 'a.mp3'), csrf: false })).status, 403);
  assert.equal((await admin.req('/api/admin/music')).status, 200);
});

test('upload: a real MP3 is stored with its duration; a non-MP3 (even named .mp3) is refused', async () => {
  const bad = await admin.req('/api/admin/music', { method: 'POST', form: form(Buffer.from('ID3 but not really an mp3 '.repeat(200)), 'song.mp3', { title: 'Fake' }) });
  assert.equal(bad.status, 415, JSON.stringify(bad.body));
  const png = await admin.req('/api/admin/music', { method: 'POST', form: form(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(4000)]), 'cover.mp3') });
  assert.equal(png.status, 415);
  const badMood = await admin.req('/api/admin/music', { method: 'POST', form: form(silentMp3(), 'x.mp3', { mood: 'sad' }) });
  assert.equal(badMood.status, 400);

  const ok = await admin.req('/api/admin/music', { method: 'POST', form: form(silentMp3(400), 'our_song.mp3', { title: '  Mero <b>Geet</b>  ', artist: 'Band', mood: 'romantic', credit: '“Mero Geet” by Band, CC BY 4.0' }) });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
  const t = ok.body.track;
  assert.match(t.id, /^[A-Za-z0-9_-]{24}$/);
  assert.equal(t.src, `/uploads/_site/music/${t.id}.mp3`);
  assert.equal(t.title, 'Mero <b>Geet</b>'); // stored as text; every page renders it as text
  assert.equal(t.mood, 'romantic');
  assert.equal(t.builtin, false);
  assert.ok(Math.abs(t.duration - 10.4) < 0.2, `duration ${t.duration}`);
  assert.ok(existsSync(join(DATA_ROOT, 'uploads', '_site', 'music', `${t.id}.mp3`)));
  // the title falls back to the file name
  const named = await admin.req('/api/admin/music', { method: 'POST', form: form(silentMp3(), 'Wedding_Flute.mp3') });
  assert.equal(named.status, 201);
  assert.equal(named.body.track.title, 'Wedding Flute');
  const pub = await browser().req('/api/music');
  assert.ok(pub.body.tracks.some((x) => x.id === t.id));
  assert.equal(pub.body.tracks.at(-1).id, named.body.track.id, 'new uploads go last');
});

test('edit, turn off, reorder: the public list leaves out disabled songs', async () => {
  const id = 'canon-in-d';
  const off = await admin.req(`/api/admin/music/${id}`, { method: 'PATCH', body: { enabled: false, title: 'Canon', mood: 'piano', credit: 'x' } });
  assert.equal(off.status, 200, JSON.stringify(off.body));
  assert.equal(off.body.track.enabled, false);
  assert.equal(off.body.track.mood, 'piano');
  let pub = await browser().req('/api/music');
  assert.ok(!pub.body.tracks.some((x) => x.id === id), 'disabled song not public');
  const all = await admin.req('/api/admin/music');
  assert.ok(all.body.tracks.some((x) => x.id === id && !x.enabled), 'admin still sees it');
  assert.equal((await admin.req(`/api/admin/music/${id}`, { method: 'PATCH', body: { mood: 'sad' } })).status, 400);
  assert.equal((await admin.req(`/api/admin/music/${id}`, { method: 'PATCH', body: { title: '   ' } })).status, 400);
  assert.equal((await admin.req('/api/admin/music/no-such-song', { method: 'PATCH', body: { enabled: true } })).status, 404);
  assert.equal((await admin.req(`/api/admin/music/${id}`, { method: 'PATCH', body: { enabled: true } })).status, 200);

  const ids = all.body.tracks.map((x) => x.id);
  const want = [ids[3], ids[0], 'not-a-song'];
  const re = await admin.req('/api/admin/music', { method: 'PATCH', body: { order: want } });
  assert.equal(re.status, 200);
  assert.deepEqual(re.body.tracks.slice(0, 2).map((x) => x.id), [ids[3], ids[0]]);
  assert.equal(re.body.tracks.length, ids.length);
  pub = await browser().req('/api/music');
  assert.equal(pub.body.tracks[0].id, ids[3]);
  assert.equal((await admin.req('/api/admin/music', { method: 'PATCH', body: { order: 'x' } })).status, 400);
});

test('built-ins cannot be deleted; an upload can, and an invitation may use library songs', async () => {
  assert.equal((await admin.req('/api/admin/music/canon-in-d', { method: 'DELETE' })).status, 400);
  assert.equal((await admin.req('/api/admin/music/..%2F..%2Fdata', { method: 'DELETE' })).status, 404);
  const up = await admin.req('/api/admin/music', { method: 'POST', form: form(silentMp3(), 'keep.mp3', { title: 'Keep' }) });
  const t = up.body.track;

  // an invitation plays a built-in and the uploaded library song
  const c = await admin.req('/api/invitations', { method: 'POST', body: { slug: 'sita-ram', bride: 'Sita', groom: 'Ram', theme: 'dhoka' } });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  const cur = await admin.req('/api/invitations/sita-ram');
  const lib = BUILTIN_MUSIC.find((x) => x.id === 'gymnopedie');
  const data = { ...cur.body.data, music: { ...cur.body.data.music, tracks: [
    { title: { en: lib.title, ne: '' }, mood: { en: 'Soft piano', ne: '' }, src: lib.src, credit: lib.credit },
    { title: { en: t.title, ne: '' }, mood: { en: '', ne: '' }, src: t.src, credit: '' },
  ] } };
  const put = await admin.req('/api/invitations/sita-ram', { method: 'PUT', body: { version: cur.body.version, data } });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  assert.deepEqual(put.body.data.music.tracks.map((x) => x.src), [lib.src, t.src]);
  const bad = await admin.req('/api/invitations/sita-ram', { method: 'PUT', body: { version: put.body.version, data: { ...data, music: { ...data.music, tracks: [{ ...data.music.tracks[0], src: '/uploads/_site/music/../../data/x.mp3' }] } } } });
  assert.equal(bad.status, 400);

  // deleting a song an invitation uses: gone from the library, the file stays for that invitation
  const del = await admin.req(`/api/admin/music/${t.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  assert.equal(del.body.inUse, 1);
  assert.ok(existsSync(join(DATA_ROOT, 'uploads', '_site', 'music', `${t.id}.mp3`)));
  assert.ok(!(await admin.req('/api/admin/music')).body.tracks.some((x) => x.id === t.id));
  assert.equal((await admin.req(`/api/admin/music/${t.id}`, { method: 'DELETE' })).status, 404);

  // an unused upload: its file goes too
  const up2 = await admin.req('/api/admin/music', { method: 'POST', form: form(silentMp3(), 'gone.mp3') });
  const del2 = await admin.req(`/api/admin/music/${up2.body.track.id}`, { method: 'DELETE' });
  assert.equal(del2.body.inUse, 0);
  assert.ok(!existsSync(join(DATA_ROOT, 'uploads', '_site', 'music', `${up2.body.track.id}.mp3`)));
});
