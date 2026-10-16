// Clears the demo couple's words and photos from stored invitations (lib/migrate-demo.js). The server runs this once
// on start; use this script to preview it or run it again.
//   node scripts/scrub-demo.js --dry-run   lists what would change, writes nothing
//   node scripts/scrub-demo.js --force     runs it again (a backup is made first)
const { openStore, closeStore } = await import('../lib/store.js');
openStore();
const { scrubDemoOnce } = await import('../lib/migrate-demo.js');
const dryRun = process.argv.includes('--dry-run');
const out = await scrubDemoOnce({ dryRun, force: process.argv.includes('--force') });
const n = Object.keys(out.changed).length;
console.log(dryRun ? `Would clean ${n} invitation(s):` : out.ran ? `Cleaned ${n} invitation(s). Backup: ${out.backup || 'none needed'}` : 'Already done (use --force to run again).');
for (const [slug, paths] of Object.entries(out.changed)) console.log(`  ${slug}: ${paths.join(', ')}`);
closeStore();
