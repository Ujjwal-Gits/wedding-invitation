// Optional dev config for the studio: the root config, plus a file watcher that skips the
// heavy folders (Python venv, server data/uploads, source art) so Vite stays responsive on Windows.
// Usage (from the project root): npx vite --config src/studio/vite.studio.config.js --port 5190 --strictPort
import base from '../../vite.config.js';

export default {
  ...base,
  server: {
    ...base.server,
    watch: { ignored: ['**/tools/**', '**/server/**', '**/art-src/**', '**/dist/**', '**/.impeccable/**'] },
  },
};
