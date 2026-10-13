import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
import { config } from './src/config.js';

const root = import.meta.dirname;
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Fills the link-preview meta tags from src/config.js at build time. */
const shareMeta = () => ({
  name: 'share-meta',
  transformIndexHtml(html) {
    const { title, description, image, siteUrl } = config.share;
    const img = siteUrl ? new URL(image, siteUrl).href : `/${image}`;
    return html
      .replaceAll('%SHARE_TITLE%', escAttr(title))
      .replaceAll('%SHARE_DESCRIPTION%', escAttr(description))
      .replaceAll('%SHARE_IMAGE%', escAttr(img));
  },
});

// Every top-level folder with an index.html is a page (one per theme, plus the studio).
const SKIP = new Set(['node_modules', 'dist', 'public', 'src', 'server', 'art-src', 'tools', 'scripts', 'docs', 'apps-script']);
const pages = { showroom: resolve(root, 'index.html') };
for (const d of readdirSync(root, { withFileTypes: true })) {
  if (d.isDirectory() && !SKIP.has(d.name) && !d.name.startsWith('.') && existsSync(resolve(root, d.name, 'index.html'))) {
    pages[d.name] = resolve(root, d.name, 'index.html');
  }
}

export default defineConfig({
  plugins: [shareMeta()],
  server: {
    // A fixed port of its own, so it never silently lands on another project's dev server.
    port: 5190,
    strictPort: true,
    // The Python venv, server data and original art are huge and irrelevant to the front end.
    watch: { ignored: ['**/tools/**', '**/server/**', '**/art-src/**', '**/dist/**'] },
    proxy: {
      '/api': 'http://localhost:8787',
      '/uploads': 'http://localhost:8787',
    },
  },
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 700, rollupOptions: { input: pages } },
});
