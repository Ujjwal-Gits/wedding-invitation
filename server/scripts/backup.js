// A database backup now (the server also makes one every BACKUP_HOURS): data/backups/nimtto-<time>.db.
//   cd server && npm run backup          (safe while the server runs: SQLite's online backup)
// In the container: docker exec <container> node server/scripts/backup.js
process.env.STORE = 'sqlite';
const { openStore, closeStore } = await import('../lib/store.js');
const { backupNow } = await import('../lib/backup.js');
openStore();
const file = await backupNow();
closeStore();
console.log(`backup: ${file}`);
