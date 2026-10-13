// Environment and paths. Reads server/.env (never committed) with Node's built-in parser.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

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
export const TRUST_PROXY = env.TRUST_PROXY && env.TRUST_PROXY !== '0' ? (Number(env.TRUST_PROXY) || env.TRUST_PROXY) : false;

const defaultPython = resolve(ROOT_DIR, 'tools', '.venv', 'Scripts', process.platform === 'win32' ? 'python.exe' : 'python');
const unixPython = resolve(ROOT_DIR, 'tools', '.venv', 'bin', 'python');
export const DEPTH_PYTHON = env.DEPTH_PYTHON || (existsSync(defaultPython) ? defaultPython : unixPython);
export const DEPTH_ENABLED = env.DEPTH_ENABLED !== '0' && existsSync(DEPTH_PYTHON);

export const DATA_DIR = resolve(SERVER_DIR, 'data');
export const INV_DIR = resolve(DATA_DIR, 'invitations');
export const RSVP_DIR = resolve(DATA_DIR, 'rsvps');
export const TRASH_DIR = resolve(DATA_DIR, 'trash');
export const UPLOAD_DIR = resolve(SERVER_DIR, 'uploads');
export const DIST_DIR = resolve(ROOT_DIR, 'dist');

export function assertConfigured() {
  const problems = [];
  if (!/^[^\s@]+@[^\s@]+$/.test(ADMIN_EMAIL)) problems.push('ADMIN_EMAIL is missing or invalid');
  if (!/^\$(argon2id|argon2i|2[aby])\$/.test(ADMIN_PASSWORD_HASH)) problems.push('ADMIN_PASSWORD_HASH must be an argon2id or bcrypt hash (npm run hash-password)');
  if (problems.length) {
    console.error(`\n[studio] server/.env is not configured:\n  - ${problems.join('\n  - ')}\n  See server/README.md.\n`);
    process.exit(1);
  }
}
