// The way back from SQLite to the JSON files (STORE=json): writes data/invitations/*.json, data/rsvps/*.json,
// orders.json, site.json and sessions.json from data/nimtto.db. The current JSON files are first moved to
// data/backups/json-before-export-<time>/. Stop the server first (or run it in a copy), then:
//   cd server && npm run export-json            then set STORE=json and start the server.
// DATA_ROOT works as for the server.
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

process.env.STORE = 'sqlite';
const { DATA_DIR, INV_DIR, RSVP_DIR, BACKUP_DIR, SESSIONS_FILE, DB_FILE } = await import('../lib/env.js');
if (!existsSync(DB_FILE)) { console.error(`export-json: ${DB_FILE} does not exist; nothing to export.`); process.exit(1); }
const sqlite = await import('../lib/store-sqlite.js');
sqlite.open();
const all = sqlite.dumpAll();

const keep = resolve(BACKUP_DIR, `json-before-export-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`);
mkdirSync(keep, { recursive: true });
const SITE = resolve(DATA_DIR, 'site.json');
const ORDERS = resolve(DATA_DIR, 'orders.json');
for (const p of [INV_DIR, RSVP_DIR, SITE, ORDERS, SESSIONS_FILE]) if (existsSync(p)) renameSync(p, resolve(keep, p.slice(DATA_DIR.length + 1)));

const write = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });
mkdirSync(INV_DIR, { recursive: true });
mkdirSync(RSVP_DIR, { recursive: true });
for (const doc of all.invitations) write(resolve(INV_DIR, `${doc.slug}.json`), doc);
for (const [slug, list] of Object.entries(all.rsvps)) write(resolve(RSVP_DIR, `${slug}.json`), list);
write(ORDERS, all.orders);
if (all.site) write(SITE, all.site);
write(SESSIONS_FILE, { v: 1, sessions: all.sessions });
sqlite.close();
console.log(`export-json: ${all.invitations.length} invitations, ${Object.values(all.rsvps).flat().length} replies, ${all.orders.length} orders, `
  + `${Object.keys(all.sessions).length} sessions written to ${DATA_DIR}; the previous JSON files are in ${keep}.`);
console.log('Now set STORE=json and start the server. data/nimtto.db is left as it was.');
