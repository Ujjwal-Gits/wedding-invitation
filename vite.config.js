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
// One generated page per design: designs/<slug>/index.html (node src/site/make-design-pages.mjs).
if (existsSync(resolve(root, 'designs'))) {
  for (const d of readdirSync(resolve(root, 'designs'), { withFileTypes: true })) {
    if (d.isDirectory() && /^[a-z][a-z0-9-]{1,30}$/.test(d.name) && existsSync(resolve(root, 'designs', d.name, 'index.html'))) {
      pages[`designs-${d.name}`] = resolve(root, 'designs', d.name, 'index.html');
    }
  }
}

/** /pay/<ref> serves pay/index.html (the page reads the order number from the path). Production: server/. */
const payRoute = () => {
  const rewrite = (req, res, next) => {
    const m = /^\/pay\/([A-Za-z0-9_-]{3,40})\/?(\?.*)?$/.exec(req.url || '');
    if (m) req.url = `/pay/index.html${m[2] || ''}`;
    next();
  };
  return { name: 'pay-route', configureServer: (s) => { s.middlewares.use(rewrite); }, configurePreviewServer: (s) => { s.middlewares.use(rewrite); } };
};

export default defineConfig({
  plugins: [shareMeta(), payRoute()],
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
  // `vite preview` (the built site) needs the same forwarding, or the studio cannot reach the API.
  preview: {
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8787',
      '/uploads': 'http://localhost:8787',
    },
  },
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 700, rollupOptions: { input: pages } },
});
