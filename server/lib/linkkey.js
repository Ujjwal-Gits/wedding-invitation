// The couple's link token, kept so the planner can see and copy the link again. Encrypted at rest with
// AES-256-GCM, bound to the invitation's slug. Key: LINK_SECRET from the environment when set (optional),
// else a random key created once in data/link.key (never served, gitignored with data/). If the key is
// lost, stored links simply cannot be shown again; a new link fixes that. tokenHash stays the lookup.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { DATA_DIR, LINK_SECRET } from './env.js';

function loadKey() {
  if (LINK_SECRET) return createHash('sha256').update(`nimtto-link\n${LINK_SECRET}`).digest();
  const file = resolve(DATA_DIR, 'link.key');
  try {
    const k = Buffer.from(readFileSync(file, 'utf8').trim(), 'base64url');
    if (k.length === 32) return k;
    console.warn('[auth] data/link.key is malformed; stored couple links cannot be shown again');
    return null;
  } catch (err) {
    if (err.code !== 'ENOENT') { console.warn(`[auth] data/link.key unreadable: ${err.message}`); return null; }
  }
  const k = randomBytes(32);
  mkdirSync(DATA_DIR, { recursive: true });
  try {
    writeFileSync(file, k.toString('base64url'), { mode: 0o600, flag: 'wx' });
    return k;
  } catch (err) {
    if (err.code === 'EEXIST') return loadKey(); // created by a parallel start
    console.warn(`[auth] could not create data/link.key: ${err.message}`);
    return null;
  }
}
const KEY = loadKey();

/** Encrypts a link token for storage (null when no key is available: the link then cannot be shown again). */
export function sealToken(slug, token) {
  if (!KEY) return null;
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', KEY, iv);
  c.setAAD(Buffer.from(`link:${slug}`));
  const ct = Buffer.concat([c.update(token, 'utf8'), c.final()]);
  return ['v1', iv, ct, c.getAuthTag()].map((x) => (typeof x === 'string' ? x : x.toString('base64url'))).join('.');
}

/** The stored token, or null (older link, other key, or tampered). Checked against tokenHash. */
export function openToken(slug, access) {
  const sealed = access?.tokenEnc;
  if (!KEY || typeof sealed !== 'string') return null;
  const [v, iv, ct, tag] = sealed.split('.');
  if (v !== 'v1' || !iv || !ct || !tag) return null;
  try {
    const d = createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64url'), { authTagLength: 16 });
    d.setAAD(Buffer.from(`link:${slug}`));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    const token = Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8');
    return createHash('sha256').update(token).digest('hex') === access.tokenHash ? token : null;
  } catch {
    return null;
  }
}
