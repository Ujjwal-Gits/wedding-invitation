import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
import { config } from './src/config.js';
import { renderPartials } from './src/site/partials.mjs';

const root = import.meta.dirname;
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * Fills the link-preview meta tags at build time with our neutral brand words, never the demo couple's: a theme page
 * is a real couple's invitation (?id=) far more often than the demo. The server writes the invitation's own words into
 * them for /<theme>/?id=<slug> (server/lib/gate.js), and the page sets its own title (src/core/data.js).
 */
const shareMeta = () => ({
  name: 'share-meta',
  transformIndexHtml(html) {
    const { image, siteUrl } = config.share;
    const title = 'Wedding invitation · Nimtto';
    const description = 'You are warmly invited to our wedding.';
    const img = siteUrl ? new URL(image, siteUrl).href : `/${image}`;
    return html
      .replaceAll('%SHARE_TITLE%', escAttr(title))
      .replaceAll('%SHARE_DESCRIPTION%', escAttr(description))
      .replaceAll('%SHARE_IMAGE%', escAttr(img));
  },
});

/** The public website's shared markup (header, footer, dialogs, design cards, FAQ ...): src/site/partials.mjs. */
const sitePartials = () => ({
  name: 'site-partials',
  transformIndexHtml: { order: 'pre', handler: (html) => (html.includes('<!--@') ? renderPartials(html) : html) },
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

/** /pay/<ref> serves pay/index.html (the page reads the order number from the path); /studio/<route> serves the studio. Production: server/. */
const payRoute = () => {
  const rewrite = (req, res, next) => {
    const m = /^\/pay\/([A-Za-z0-9_-]{3,40})\/?(\?.*)?$/.exec(req.url || '');
    if (m) req.url = `/pay/index.html${m[2] || ''}`;
    // The studio's clean paths (/studio/orders/NM-12345, src/studio/nav.js): every /studio/<route> is its one page.
    // Production does the same in server/index.js. A path with a dot (a file) is left alone.
    const s = /^\/studio\/([^?]*)(\?.*)?$/.exec(req.url || '');
    if (s && s[1] && !s[1].includes('.')) req.url = `/studio/index.html${s[2] || ''}`;
    next();
  };
  return { name: 'pay-route', configureServer: (s) => { s.middlewares.use(rewrite); }, configurePreviewServer: (s) => { s.middlewares.use(rewrite); } };
};

export default defineConfig({
  plugins: [sitePartials(), shareMeta(), payRoute()],
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
