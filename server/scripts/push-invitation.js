// Copies one invitation from one studio server to another (e.g. local -> live), through the
// normal studio API: sign in, read the invitation, re-upload its photos and MP3s, save, publish.
// RSVPs and the couple's private link are never copied.
//
//   PUSH_EMAIL=you@example.com PUSH_PASSWORD='…' \
//     node server/scripts/push-invitation.js --from http://localhost:8787 --to https://nimtto.com --slug sunil-srijana
//
// Credentials come from the environment only (never arguments, never logged). If the two servers
// have different admin logins, PUSH_FROM_EMAIL / PUSH_FROM_PASSWORD override them for --from.
// Options:
//   --publish-draft  the source is live but has unpublished edits: publish those edits on the target too
//                    (without it the target is saved as a draft and left as it was).
import { parseArgs } from 'node:util';

const SLUG_RE = /^[a-z0-9-]{3,64}$/;
const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]']);

function fail(msg) {
  console.error(`push-invitation: ${msg}`);
  process.exit(1);
}

let args;
try {
  ({ values: args } = parseArgs({
    options: {
      from: { type: 'string' },
      to: { type: 'string' },
      slug: { type: 'string' },
      'publish-draft': { type: 'boolean', default: false },
    },
    strict: true,
  }));
} catch (err) {
  fail(`${err.message}\nUsage: node server/scripts/push-invitation.js --from <url> --to <url> --slug <slug> [--publish-draft]\nThe password is read from PUSH_PASSWORD, never from an argument.`);
}

const base = (name, v) => {
  let u;
  try { u = new URL(v || ''); } catch { fail(`--${name} must be a URL such as https://nimtto.com`); }
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && LOCAL.has(u.hostname))) fail(`--${name} must use https:// (plain http is allowed only for localhost)`);
  return u.origin;
};
const FROM = base('from', args.from);
const TO = base('to', args.to);
const SLUG = String(args.slug || '');
if (!SLUG_RE.test(SLUG)) fail('--slug must be 3-64 lowercase letters, digits or hyphens');
if (FROM === TO) fail('--from and --to are the same server');

const creds = {
  to: { email: process.env.PUSH_EMAIL || '', password: process.env.PUSH_PASSWORD || '' },
  from: { email: process.env.PUSH_FROM_EMAIL || process.env.PUSH_EMAIL || '', password: process.env.PUSH_FROM_PASSWORD || process.env.PUSH_PASSWORD || '' },
};
// Keep the secrets out of any child process environment.
for (const k of ['PUSH_PASSWORD', 'PUSH_FROM_PASSWORD']) delete process.env[k];
if (!creds.to.email || !creds.to.password || !creds.from.email || !creds.from.password) fail('set PUSH_EMAIL and PUSH_PASSWORD in the environment');

// ── A signed-in studio session (HttpOnly cookie + CSRF token, as the studio uses) ──

class ApiError extends Error {
  constructor(where, status, body) {
    super(`${where} failed (${status}): ${body?.error || 'no message'}`);
    this.status = status;
    this.body = body || {};
  }
}

async function signIn(origin, { email, password }) {
  const res = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    redirect: 'error',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(`Sign-in to ${origin}`, res.status, body);
  if (body.role !== 'admin' || !body.csrf) throw new Error(`Sign-in to ${origin} did not return a planner session`);
  const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).filter((c) => /^(__Host-studio|studio_sid)=[A-Za-z0-9_-]{43}$/.test(c));
  if (!cookie.length) throw new Error(`Sign-in to ${origin} did not set a session cookie`);
  const headers = (extra = {}) => ({ Accept: 'application/json', Cookie: cookie.join('; '), Origin: origin, ...extra });

  /** JSON API call; state-changing requests carry the session's CSRF token. */
  async function api(path, { method = 'GET', body: payload } = {}) {
    const h = headers(method === 'GET' ? {} : { 'X-CSRF-Token': body.csrf });
    if (payload !== undefined) h['Content-Type'] = 'application/json';
    const r = await fetch(`${origin}/api${path}`, { method, redirect: 'error', headers: h, body: payload === undefined ? undefined : JSON.stringify(payload) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new ApiError(`${method} ${origin}/api${path}`, r.status, data);
    return data;
  }

  /** The studio's own upload endpoint (multipart: kind + file). */
  async function upload(slug, buffer, kind, name) {
    const fd = new FormData();
    fd.append('kind', kind);
    fd.append('file', new Blob([buffer], { type: kind === 'audio' ? 'audio/mpeg' : 'image/webp' }), name);
    const r = await fetch(`${origin}/api/invitations/${slug}/uploads`, { method: 'POST', redirect: 'error', headers: headers({ 'X-CSRF-Token': body.csrf }), body: fd });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new ApiError(`Upload to ${origin}`, r.status, data);
    return data;
  }

  async function signOut() {
    await fetch(`${origin}/api/auth/logout`, { method: 'POST', redirect: 'error', headers: headers({ 'X-CSRF-Token': body.csrf }) }).catch(() => {});
  }

  return { origin, api, upload, signOut };
}

async function download(origin, path) {
  const r = await fetch(`${origin}${path}`, { redirect: 'error' });
  if (!r.ok) throw new Error(`Download ${origin}${path} failed (${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}

// ── Uploaded files referenced by an invitation ──

// The server names files <id>-lg|sm|depth.webp and <id>.mp3; ids are base64url, so they may contain "-".
const UP = new RegExp(`^/uploads/${SLUG}/(?:([A-Za-z0-9_-]{16,40}?)-(lg|sm|depth)\\.webp|([A-Za-z0-9_-]{16,40})\\.mp3)$`);
const parse = (s) => {
  const m = UP.exec(s);
  return m && (m[3] ? { id: m[3], audio: true } : { id: m[1], size: m[2] });
};

/** id -> 'image' | 'audio' for every uploaded file the data points at. */
function collectUploads(node, out = new Map()) {
  if (typeof node === 'string') {
    const p = parse(node);
    if (p) out.set(p.id, p.audio ? 'audio' : 'image');
  } else if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectUploads(v, out);
  }
  return out;
}

/** Points every reference at the target's copies. Depth maps are regenerated by the target. */
function rewrite(node, map) {
  if (typeof node === 'string') {
    const p = parse(node);
    if (!p) return node;
    const n = map.get(p.id);
    if (p.audio) return n.src;
    return p.size === 'sm' ? n.sm : n.lg;
  }
  if (Array.isArray(node)) return node.map((v) => rewrite(v, map));
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === 'depth' && typeof v === 'string' && parse(v)) continue;
    out[k] = rewrite(v, map);
  }
  const p = typeof node.lg === 'string' && parse(node.lg);
  const n = p && map.get(p.id);
  if (n?.w) { out.w = n.w; out.h = n.h; }
  return out;
}

const firstName = (p, fallback) => String(p?.name?.en || p?.name?.ne || fallback).slice(0, 60);

// ── Run ──

let src;
let dst;
try {
  console.info(`Signing in to ${FROM} and ${TO}…`);
  src = await signIn(FROM, creds.from);
  dst = await signIn(TO, creds.to);
  creds.from.password = creds.to.password = '';

  const doc = await src.api(`/invitations/${SLUG}`);
  const data = doc.data;
  const live = doc.status === 'published';
  let publish = live && (!doc.changed || args['publish-draft']);
  console.info(`Source: ${SLUG} (${data.theme} theme, ${live ? (doc.changed ? 'live with unpublished edits' : 'live') : 'draft'})`);

  let target = await dst.api(`/invitations/${SLUG}`).catch((err) => { if (err.status === 404) return null; throw err; });
  if (!target) {
    await dst.api('/invitations', { method: 'POST', body: { slug: SLUG, bride: firstName(data.couple?.bride, 'Bride'), groom: firstName(data.couple?.groom, 'Groom'), theme: data.theme, sample: false } });
    target = await dst.api(`/invitations/${SLUG}`);
    console.info(`Target: created ${SLUG}`);
  } else {
    console.info(`Target: updating ${SLUG} (currently ${target.status})`);
  }

  const files = collectUploads(data);
  const map = new Map();
  let i = 0;
  for (const [id, kind] of files) {
    i += 1;
    let buf;
    if (kind === 'audio') {
      buf = await download(FROM, `/uploads/${SLUG}/${id}.mp3`);
      map.set(id, await dst.upload(SLUG, buf, 'audio', `${id}.mp3`));
    } else {
      buf = await download(FROM, `/uploads/${SLUG}/${id}-lg.webp`).catch(() => download(FROM, `/uploads/${SLUG}/${id}-sm.webp`));
      map.set(id, await dst.upload(SLUG, buf, 'image', `${id}.webp`));
    }
    console.info(`  [${i}/${files.size}] ${kind} ${Math.round(buf.length / 1024)} KB`);
  }

  const saved = await dst.api(`/invitations/${SLUG}`, { method: 'PUT', body: { version: target.version, data: rewrite(data, map) } });
  console.info(`Saved the invitation on ${TO} (version ${saved.version}).`);

  if (live && doc.changed && !args['publish-draft']) {
    console.warn('The source has unpublished edits, so the target was saved as a draft and not published. Re-run with --publish-draft to publish those edits.');
    publish = false;
  }
  if (publish) {
    try {
      await dst.api(`/invitations/${SLUG}/publish`, { method: 'POST' });
      console.info('Published.');
    } catch (err) {
      if (err.body?.problems) console.error(`Not published: ${err.body.problems.map((p) => p.message || p).join('; ')}`);
      throw err;
    }
  }
  console.info(`Done: ${TO}/${data.theme}/?id=${SLUG}`);
} catch (err) {
  console.error(`push-invitation: ${err.message}`);
  process.exitCode = 1;
} finally {
  await Promise.all([src?.signOut(), dst?.signOut()]);
}
