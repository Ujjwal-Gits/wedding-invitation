// Automatic database backups (SQLite store): a consistent online copy of data/nimtto.db into data/backups/
// every BACKUP_HOURS (default 24; 0 turns it off), keeping BACKUP_KEEP (default 14) copies. The app keeps serving
// while a copy is made. data/backups/ is on the data volume: copy it off the server too (docs/OPERATIONS.md).
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { BACKUP_DIR } from './env.js';
import { STORE_KIND, backupStore } from './store.js';

const HOURS = Number(process.env.BACKUP_HOURS ?? 24);
const KEEP = Math.max(1, Number(process.env.BACKUP_KEEP) || 14);
const NAME = /^nimtto-\d{8}-\d{6}\.db$/;
const stamp = (d = new Date()) => d.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

async function existing() {
  try {
    return (await fs.readdir(BACKUP_DIR)).filter((f) => NAME.test(f)).sort();
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/** Makes one backup now; returns its path. Also used by `npm run backup`. */
export async function backupNow() {
  if (STORE_KIND !== 'sqlite') throw new Error('backups are made of the SQLite store; with STORE=json copy data/ instead');
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const file = resolve(BACKUP_DIR, `nimtto-${stamp()}.db`);
  const tmp = `${file}.part`;
  const t0 = Date.now();
  await backupStore(tmp);
  await fs.rename(tmp, file);
  const { size } = await fs.stat(file);
  const all = await existing();
  for (const old of all.slice(0, Math.max(0, all.length - KEEP))) await fs.rm(resolve(BACKUP_DIR, old), { force: true });
  console.info(`[backup] ${file.slice(BACKUP_DIR.length + 1)} bytes=${size} ms=${Date.now() - t0} kept=${Math.min(all.length, KEEP)}`);
  return file;
}

let timer = null;
/** Schedules backups: the first one when the newest copy is older than the interval (or 10 minutes after start). */
export async function startBackups() {
  if (STORE_KIND !== 'sqlite' || !(HOURS > 0)) return;
  const every = HOURS * 3600e3;
  const all = await existing().catch(() => []);
  const last = all.length ? Date.parse(all.at(-1).replace(/^nimtto-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.db$/, '$1-$2-$3T$4:$5:$6Z')) : 0;
  const run = () => backupNow().catch((err) => console.error('[backup] failed:', err.message));
  const first = Math.max(10 * 60e3, (last || 0) + every - Date.now());
  timer = setTimeout(() => { run(); timer = setInterval(run, every); timer.unref(); }, first);
  timer.unref();
}

export function stopBackups() { if (timer) { clearTimeout(timer); clearInterval(timer); } }
