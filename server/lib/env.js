// Environment and paths. Reads server/.env (never committed) with Node's built-in parser.
import { existsSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';

export const SERVER_DIR = resolve(import.meta.dirname, '..');
export const ROOT_DIR = resolve(SERVER_DIR, '..');

const envFile = resolve(SERVER_DIR, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

if (process.argv.includes('--production')) process.env.NODE_ENV = 'production';

const env = process.env;
const list = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

export const IS_PROD = env.NODE_ENV === 'production';
export const PORT = Number(env.PORT) || 8787;
export const ADMIN_EMAIL = String(env.ADMIN_EMAIL || '').trim().toLowerCase();
export const ADMIN_PASSWORD_HASH = String(env.ADMIN_PASSWORD_HASH || '').trim();
export const PUBLIC_ORIGINS = list(env.PUBLIC_ORIGIN).map((o) => {
  try { return new URL(o).origin; } catch { return null; }
}).filter(Boolean);
// Optional (32+ chars): key for the stored couple links. Unset: a random key in data/link.key is used.
const linkSecret = String(env.LINK_SECRET || '').trim();
export const LINK_SECRET = linkSecret.length >= 32 ? linkSecret : '';
export const TRUST_PROXY = env.TRUST_PROXY && env.TRUST_PROXY !== '0' ? (Number(env.TRUST_PROXY) || env.TRUST_PROXY) : false;

const defaultPython = resolve(ROOT_DIR, 'tools', '.venv', 'Scripts', process.platform === 'win32' ? 'python.exe' : 'python');
const unixPython = resolve(ROOT_DIR, 'tools', '.venv', 'bin', 'python');
export const DEPTH_PYTHON = env.DEPTH_PYTHON || (existsSync(defaultPython) ? defaultPython : unixPython);
export const DEPTH_ENABLED = env.DEPTH_ENABLED !== '0' && existsSync(DEPTH_PYTHON);

// DATA_ROOT (optional) moves data/ and uploads/ elsewhere, e.g. a scratch copy for testing a push.
const DATA_ROOT = env.DATA_ROOT ? resolve(env.DATA_ROOT) : SERVER_DIR;
export const DATA_DIR = resolve(DATA_ROOT, 'data');
export const INV_DIR = resolve(DATA_DIR, 'invitations');
export const RSVP_DIR = resolve(DATA_DIR, 'rsvps');
export const TRASH_DIR = resolve(DATA_DIR, 'trash');
export const UPLOAD_DIR = resolve(DATA_ROOT, 'uploads');
export const DIST_DIR = resolve(ROOT_DIR, 'dist');
// Studio sessions (hashed ids, CSRF tokens). Lives in data/, which is never served and is gitignored.
export const SESSIONS_FILE = resolve(DATA_DIR, 'sessions.json');

// Storage: 'sqlite' (data/nimtto.db) or 'json' (the original files; the rollback path). See lib/store.js.
export const STORE = String(env.STORE || 'sqlite').trim().toLowerCase() === 'json' ? 'json' : 'sqlite';
export const DB_FILE = resolve(DATA_DIR, 'nimtto.db');
export const DB_SYNC = String(env.DB_SYNC || 'normal').trim().toLowerCase() === 'full' ? 'full' : 'normal';
export const BACKUP_DIR = resolve(DATA_DIR, 'backups');
// Behind Cloudflare: take the visitor's IP from CF-Connecting-IP when the request came from a Cloudflare address
// (default on; CLOUDFLARE=0 turns it off). CLOUDFLARE_ONLY=1 also refuses requests that bypassed Cloudflare.
export const CLOUDFLARE = env.CLOUDFLARE !== '0';
export const CLOUDFLARE_ONLY = env.CLOUDFLARE_ONLY === '1';

const within = (p, dir) => { const r = relative(dir, p); return r === '' || (!r.startsWith('..') && !isAbsolute(r)); };

export function assertConfigured() {
  const problems = [];
  if (!/^[^\s@]+@[^\s@]+$/.test(ADMIN_EMAIL)) problems.push('ADMIN_EMAIL is missing or invalid');
  if (!/^\$(argon2id|argon2i|2[aby])\$/.test(ADMIN_PASSWORD_HASH)) problems.push('ADMIN_PASSWORD_HASH must be an argon2id or bcrypt hash (npm run hash-password)');
  // data/ holds sessions and drafts: it must never sit inside a folder that is served or built from.
  if ([DIST_DIR, resolve(ROOT_DIR, 'public')].some((d) => within(DATA_DIR, d))) problems.push('DATA_ROOT must not be inside dist/ or public/');
  if (problems.length) {
    console.error(`\n[studio] server/.env is not configured:\n  - ${problems.join('\n  - ')}\n  See server/README.md.\n`);
    process.exit(1);
  }
}
