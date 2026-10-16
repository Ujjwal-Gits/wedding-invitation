// The built site (dist/) in production: express.static plus
//   - precompressed files: <file>.br / <file>.gz made at build time (scripts/compress-dist.js) are sent as is to
//     browsers that accept them, so nothing is compressed per request;
//   - one caching policy (cacheControlFor), shared with docs/OPERATIONS.md's Cloudflare rules.
// Gated theme pages keep the gate's `private, no-store` (lib/gate.js sets res.locals.gatedPage).
import express from 'express';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { acceptedEncodings } from './http-cache.js';

const YEAR = 'public, max-age=31536000, immutable';
// Not content-hashed, so not "immutable": a week in browsers, a month at Cloudflare's edge (purge it after a deploy
// that changes art), and a stale copy may be served for a day while a fresh one is fetched.
const ART = 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400';
const SMALL = 'public, max-age=86400, stale-while-revalidate=604800';

/** Cache-Control for a file under dist/ (path relative to dist, forward slashes). */
export function cacheControlFor(rel) {
  if (rel.startsWith('assets/')) return YEAR; // Vite's hashed bundles
  if (/\.html?$/i.test(rel) || /\.(?:css|js|mjs)$/i.test(rel)) return 'no-cache'; // pages and unhashed code: always revalidate
  if (/^(?:themes|photos|audio|art|site\/fonts)\//.test(rel)) return ART;
  if (/\.(?:svg|ico|png|jpe?g|webp|avif|woff2?)$/i.test(rel)) return SMALL;
  return 'no-cache';
}

/**
 * Every file in dist/ with a .br and/or .gz sibling: rel -> { br, gz } where each is the variant's ETag (or null).
 * Read once (dist does not change while the server runs). The ETags are set here because res.sendFile follows the
 * app's 'etag' setting, which is off (API bodies get their own, lib/http-cache.js).
 */
function scanVariants(dir, base = '', out = new Map()) {
  if (!existsSync(dir)) return out;
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (d.name.startsWith('.')) continue;
    const rel = base ? `${base}/${d.name}` : d.name;
    if (d.isDirectory()) { scanVariants(resolve(dir, d.name), rel, out); continue; }
    const m = /^(.*)\.(br|gz)$/.exec(rel);
    if (!m) continue;
    const v = out.get(m[1]) || { br: null, gz: null };
    const st = statSync(resolve(dir, d.name));
    v[m[2]] = `W/"${m[2]}-${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    out.set(m[1], v);
  }
  return out;
}

export function staticFiles(distDir) {
  const variants = scanVariants(distDir);
  if (variants.size) console.info(`[static] ${variants.size} precompressed file(s) in dist/`);
  const serve = express.static(distDir, {
    index: 'index.html',
    redirect: true,
    dotfiles: 'deny',
    setHeaders(res, path) {
      if (res.locals.gatedPage) return; // the gate already set private, no-store
      const rel = path.slice(distDir.length + 1).replace(/\\/g, '/');
      res.set('Cache-Control', cacheControlFor(rel));
      if (variants.has(rel)) res.vary('Accept-Encoding');
    },
  });
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let rel;
    try { rel = decodeURIComponent(req.path).replace(/^\/+/, ''); } catch { return serve(req, res, next); }
    // The .br/.gz files are never addressed directly: a gated theme page's HTML must not be readable as
    // /<theme>/index.html.br (any case, trailing dots or spaces, which Windows ignores).
    if (/\.(?:br|gz)[. ]*$/i.test(rel)) return res.status(404).type('text/plain').send('Not found');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const v = variants.get(rel);
    if (!v) return serve(req, res, next);
    const ok = acceptedEncodings(req.headers['accept-encoding']);
    const enc = v.br && ok.has('br') ? 'br' : v.gz && ok.has('gzip') ? 'gzip' : null;
    res.vary('Accept-Encoding');
    if (!enc) return serve(req, res, next);
    res.type(extname(rel) || 'html'); // the original's type, not the .br/.gz file's
    res.setHeader('Content-Encoding', enc);
    res.setHeader('ETag', enc === 'br' ? v.br : v.gz); // send() answers If-None-Match against it (304)
    if (!res.locals.gatedPage) res.setHeader('Cache-Control', cacheControlFor(rel));
    const file = resolve(distDir, `${rel}.${enc === 'br' ? 'br' : 'gz'}`);
    return res.sendFile(file, { dotfiles: 'deny', acceptRanges: false, cacheControl: false, etag: true, lastModified: true }, (err) => {
      if (!err) return;
      if (res.headersSent) return next(err);
      res.removeHeader('Content-Encoding');
      res.removeHeader('ETag');
      return serve(req, res, next); // variant missing: the plain file
    });
  };
}
