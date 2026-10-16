// Public showcase of the designs: a watermarked, demo-only view of a theme page (docs/API.md "Theme pages").
//   /<theme>/?showcase=1[&lang=en|ne]   the showcase page (any ready theme in the catalog, no session needed)
//   /preview/<theme>                    a short link: 302 to the line above
// The server marks the response itself: it rewrites the built theme HTML to add data-showcase="1" on <html>, the
// showcase stylesheet and noindex (no inline script, so the page CSP is unchanged). Every other query key, ?id= above
// all, is dropped by a 302 to the canonical URL, so a showcase can never load a couple's invitation or try a
// published one in another design. Paths that are not exactly /<theme>/ or /<theme>/index.html fall through to the
// normal gate (lib/gate.js), which still guards the plain theme pages exactly as before.
// The watermark, copy blocking and capture deterrents run in the page (src/core/showcase.js + public/showcase.css).
import { existsSync, promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { listThemes } from './catalog.js';

const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/;
const NOT_DESIGNS = new Set(['studio', 'credits', 'assets', 'themes', 'site', 'photos', 'audio', 'art', 'preview', 'i', 'api', 'uploads']);
const LANGS = new Set(['en', 'ne']);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** A ready design in the catalog, or null. */
function readyTheme(slug) {
  if (!SLUG_RE.test(slug) || NOT_DESIGNS.has(slug)) return null;
  return listThemes().find((t) => t.slug === slug && t.ready) || null;
}

/** The only showcase URL that is served as is. */
function canonical(slug, query) {
  const lang = typeof query.lang === 'string' && LANGS.has(query.lang) ? query.lang : '';
  return `/${slug}/?showcase=1${lang ? `&lang=${lang}` : ''}`;
}

const pages = new Map(); // slug -> rewritten HTML (dist does not change while the server runs)
async function showcaseHtml(distDir, theme) {
  if (pages.has(theme.slug)) return pages.get(theme.slug);
  const file = resolve(distDir, theme.slug, 'index.html');
  if (!existsSync(file)) return null;
  let html = await fs.readFile(file, 'utf8');
  const head = '<meta name="robots" content="noindex, nofollow">'
    + '<link rel="stylesheet" href="/showcase.css">';
  html = html.replace(/<html(?=[\s>])/i, '<html data-showcase="1"');
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(theme.name)} · Preview · Nimtto</title>`);
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${head}</head>`) : head + html;
  if (!html.includes('data-showcase="1"')) return null; // never serve an unmarked page as a showcase
  pages.set(theme.slug, html);
  return html;
}

/** Express middleware for production, placed before the theme page gate. */
export function showcaseGate(distDir) {
  return async (req, res, next) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const short = /^\/preview\/([^/]+)\/?$/.exec(req.path);
      if (short) {
        const theme = readyTheme(short[1]);
        res.set('Cache-Control', 'private, no-store');
        return res.redirect(302, theme ? canonical(theme.slug, req.query) : '/#designs');
      }
      if (!Object.prototype.hasOwnProperty.call(req.query, 'showcase')) return next();
      const m = /^\/([a-z][a-z0-9-]{1,30})(\/|\/index\.html)?$/.exec(req.path);
      const theme = m ? readyTheme(m[1]) : null;
      if (!theme) return next(); // anything else: the normal gate decides
      const want = canonical(theme.slug, req.query);
      if (req.originalUrl !== want) {
        res.set('Cache-Control', 'private, no-store');
        return res.redirect(302, want);
      }
      const html = await showcaseHtml(distDir, theme);
      if (!html) return next();
      res.set('Cache-Control', 'private, no-store');
      res.set('X-Robots-Tag', 'noindex, nofollow');
      return res.type('html').send(html);
    } catch (err) { return next(err); }
  };
}
