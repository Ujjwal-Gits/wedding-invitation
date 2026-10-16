// One-time migration (2026-10-16): clears the demo couple's words and photos (src/config.js) from stored invitations.
// Older invitations were started from the sample card, so their drafts and published snapshots may still hold the
// demo's venues, travel notes, stays, contacts, story, people photos (and, very early ones, names). Only fields that
// still hold the demo's exact value are cleared (lib/demo.js scrubDemo); anything the couple changed is left alone.
// Safety: a backup first (SQLite: an online copy in data/backups/; JSON: the invitation files copied to
// data/backups/demo-scrub-<time>/), then each invitation under its lock, and a marker (`migrations` document) so it
// runs once. `node scripts/scrub-demo.js --dry-run` lists what it would change; `--force` runs it again.
import { promises as fs } from 'node:fs';
import { resolve, basename } from 'node:path';
import { BACKUP_DIR, INV_DIR } from './env.js';
import { STORE_KIND, listInvitations, withLock, getInvitation, saveInvitation, getDoc, putDoc } from './store.js';
import { backupNow } from './backup.js';
import { scrubDemo } from './demo.js';

const KEY = 'migrations';
const ID = 'demo-scrub-2026-10-16';

async function backup() {
  if (STORE_KIND === 'sqlite') return backupNow();
  const dir = resolve(BACKUP_DIR, `demo-scrub-${new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)}`);
  await fs.mkdir(dir, { recursive: true });
  for (const f of await fs.readdir(INV_DIR).catch(() => [])) if (f.endsWith('.json')) await fs.copyFile(resolve(INV_DIR, f), resolve(dir, f));
  return dir;
}

/**
 * Runs the scrub once. { dryRun, force }. Returns { ran, changed: { slug: [paths] }, backup }.
 */
export async function scrubDemoOnce({ dryRun = false, force = false, log = console } = {}) {
  const done = (await getDoc(KEY))?.value || {};
  if (done[ID] && !force && !dryRun) return { ran: false, changed: {}, backup: null };
  const docs = await listInvitations();
  const plan = {};
  for (const d of docs) {
    const copy = structuredClone(d);
    const paths = [...scrubDemo(copy.draft).map((p) => `draft.${p}`), ...(copy.published ? scrubDemo(copy.published).map((p) => `published.${p}`) : [])];
    if (paths.length) plan[d.slug] = paths;
  }
  if (dryRun) return { ran: false, changed: plan, backup: null };
  const slugs = Object.keys(plan);
  const file = slugs.length ? await backup() : null;
  const changed = {};
  for (const slug of slugs) {
    await withLock(`inv:${slug}`, async () => {
      const doc = await getInvitation(slug);
      if (!doc) return;
      const paths = [...scrubDemo(doc.draft).map((p) => `draft.${p}`), ...(doc.published ? scrubDemo(doc.published).map((p) => `published.${p}`) : [])];
      if (!paths.length) return;
      doc.version += 1; // an open studio tab reloads instead of saving the old words back
      await saveInvitation(doc);
      changed[slug] = paths;
    });
  }
  await putDoc(KEY, { ...done, [ID]: { at: new Date().toISOString(), invitations: Object.keys(changed).length, backup: file ? basename(String(file)) : null } });
  if (slugs.length) log.info(`[migrate] ${ID}: cleaned ${Object.keys(changed).length} invitation(s); backup ${file}`);
  for (const [slug, paths] of Object.entries(changed)) log.info(`[migrate]   ${slug}: ${paths.join(', ')}`);
  return { ran: true, changed, backup: file };
}
