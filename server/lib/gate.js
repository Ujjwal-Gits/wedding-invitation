// Production gate for the theme pages. The designs are the product, so a theme's HTML entry point
// (/<theme>/, /<theme>/index.html) is served only to:
//   (a) guests of a published invitation:  /<theme>/?id=<slug> (the invitation's own theme),
//   (b) the planner (admin session), or
//   (c) a couple with a live client session (their studio previews drafts and shows the designs they may pick).
// Everyone else is sent to the website's gallery (no id) or gets a small "not available" page (unknown or
// unpublished id: the same answer for both, so it never tells whether a draft exists).
// Static files (/assets, /themes art, thumbs, fonts) stay public: invitations need them.
import { existsSync, readdirSync, readFileSync, promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { SLUG_RE, isLive, peekInvitation as getInvitation } from './store.js'; // read-only, cached
import { listThemes } from './catalog.js';
import { hasStudioSession, canEdit } from './auth.js';
import { shareInfo, withShareMeta } from './share.js';
import { publishedJson } from './invitations.js';
import { publicMusic } from './music.js';
import { activeLink, linkParam, sendInactive } from './guest-links.js';

const built = new Map(); // theme -> its built index.html (dist does not change while the server runs)
/**
 * Serves the theme page with the invitation's own title and link-preview tags (the build carries neutral brand words,
 * never the demo couple's). Returns false when the page is not built (the static files answer as before).
 */
async function sendWithMeta(req, res, distDir, theme, inv, slug, doc = null, link = null) {
  let html = built.get(theme);
  if (html === undefined) {
    const file = resolve(distDir, theme, 'index.html');
    html = existsSync(file) ? await fs.readFile(file, 'utf8') : null;
    built.set(theme, html);
  }
  if (!html) return false;
  html = withShareMeta(html, shareInfo(inv, req, slug, link));
  if (doc) html = await withPageData(html, doc, slug, link);
  res.type('html').send(html);
  return true;
}

/** JSON for a <script type="application/json"> block: nothing in it can close the element or start a comment. */
const jsonBlock = (id, json, attrs = '') => `<script type="application/json" id="${id}"${attrs}>${json.replace(/</g, '\\u003c')}</script>`;

/**
 * A guest's page carries its own data (the published invitation and the music list, exactly what the two API calls
 * return), so the design renders as soon as its code has run instead of waiting for two more round trips
 * (src/core/data.js reads them; the API stays the fallback). Data blocks are never executed, so the CSP is unchanged.
 */
export async function withPageData(html, doc, slug, link = null) {
  let music = '';
  try { music = JSON.stringify(await publicMusic()); } catch { /* the page fetches it */ }
  const blocks = jsonBlock('nimtto-data', publishedJson(doc, slug, link), ` data-id="${slug}"`) + (music ? jsonBlock('nimtto-music', music) : '');
  return html.includes('</body>') ? html.replace('</body>', () => `${blocks}\n</body>`) : html + blocks; // a function: "$" in the data stays as it is
}

// Pages under dist/ that are not designs.
// about: the About page; blog: the blog (docs/SEO-AUDIT.md), listed ahead so it is public as soon as it is built.
const OPEN_PAGES = new Set(['studio', 'credits', 'international', 'terms', 'privacy', 'refunds', 'faq', 'wedding-invitation-nepal', 'nepali-abroad', 'designs', 'occasions', 'how-it-works', 'features', 'pricing', 'contact', 'pay', 'assets', 'themes', 'site', 'photos', 'audio', 'art', 'about', 'blog']);

/** Top-level folders of every public page in the built sitemaps (a new landing page is open without a list edit). */
function sitemapPages(distDir) {
  const out = new Set();
  for (const f of ['sitemap-pages-np.xml', 'sitemap-pages-intl.xml']) {
    let xml = '';
    try { xml = readFileSync(resolve(distDir, f), 'utf8'); } catch { continue; }
    for (const m of xml.matchAll(/<loc>https?:\/\/[^/<]+\/([^/<]+)\/[^<]*<\/loc>/g)) out.add(m[1].toLowerCase());
  }
  return out;
}

let distPages = null;
/** Top-level dist folders with an index.html (every built page), read once: dist does not change at runtime. */
function builtPages(distDir) {
  if (distPages) return distPages;
  distPages = new Set();
  if (existsSync(distDir)) {
    for (const d of readdirSync(distDir, { withFileTypes: true })) {
      if (d.isDirectory() && existsSync(resolve(distDir, d.name, 'index.html'))) distPages.add(d.name.toLowerCase());
    }
  }
  return distPages;
}

/**
 * The theme slug when this path would serve a theme page's HTML, else null. Normalised the way the static
 * server and the file system would read it: decoded, '.' and empty segments dropped, either slash, case and
 * trailing dots/spaces ignored (Windows), so /MANGAL/./index.html. still counts.
 */
function themeOfPath(path, themes) {
  let p;
  try { p = decodeURIComponent(path); } catch { return null; }
  const segs = p.split(/[\\/]+/).map((s) => s.replace(/[. ]+$/, '').toLowerCase()).filter((s) => s && s !== '.');
  if (!segs.length || !themes.has(segs[0])) return null;
  const last = segs.length > 1 ? segs[segs.length - 1] : '';
  return segs.length === 1 || /\.html?$/.test(last) ? segs[0] : null;
}

const NOT_AVAILABLE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Invitation not available · Nimtto</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>
:root{--ink:#121116;--ink-2:#45434C;--ink-3:#66636E;--line:#C9CDD4;--crimson:#B3122F;--crimson-deep:#8E0E25}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:32px 16px;background:#fff;color:var(--ink);font:400 16.5px/1.6 'Geist','Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased}
main{width:min(100%,460px)}
.mark{font:500 26px/1 Gambetta,'Iowan Old Style',Georgia,serif;letter-spacing:-.03em;color:var(--ink);text-decoration:none}
h1{margin:48px 0 0;font:400 clamp(34px,7vw,48px)/1.05 Gambetta,'Iowan Old Style',Georgia,serif;letter-spacing:-.028em}
p{margin:16px 0 0;color:var(--ink-2)}
.ne{margin-top:6px;color:var(--ink-3);font-family:Mukta,'Nirmala UI',sans-serif}
a.btn{display:inline-flex;align-items:center;min-height:48px;margin-top:32px;padding:0 22px;border-radius:6px;background:var(--crimson);color:#fff;font-weight:500;text-decoration:none}
a.btn:hover{background:var(--crimson-deep)}
a:focus-visible{outline:2px solid var(--crimson);outline-offset:3px}
</style>
</head>
<body>
<main>
<a class="mark" href="/">Nimtto</a>
<h1>This invitation isn’t available.</h1>
<p class="ne" lang="ne">यो निम्तो अहिले उपलब्ध छैन।</p>
<p>The link may be mistyped, or the invitation is not shared yet. Please ask the family for their link.</p>
<a class="btn" href="/#designs">See our designs</a>
</main>
</body>
</html>
`;

// The names that are designs (catalog + built pages, minus OPEN_PAGES). listThemes() refreshes every 10 s; the set is
// rebuilt only when that list changes, not on every request.
let gated = { list: null, set: null };
function gatedNames(distDir) {
  const list = listThemes();
  if (gated.list === list) return gated.set;
  const set = new Set([...list.map((t) => t.slug), ...builtPages(distDir)]);
  for (const p of [...OPEN_PAGES, ...sitemapPages(distDir)]) set.delete(p);
  gated = { list, set };
  return set;
}

/** A design's public page: /designs/<slug>/ (Nepal) or /international/designs/<slug>/, else the designs list. */
function designPageOf(distDir, theme) {
  for (const p of [`/designs/${theme}/`, `/international/designs/${theme}/`]) if (existsSync(resolve(distDir, `.${p}`, 'index.html'))) return p;
  return '/designs/';
}

/** Express middleware for the production static setup (place it before express.static). */
export function themePageGate(distDir) {
  return async (req, res, next) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const theme = themeOfPath(req.path, gatedNames(distDir));
      if (!theme) return next();
      res.set('Cache-Control', 'private, no-store');
      // A guest's invitation (names, dates, venues, photos) is never indexed, even when its link is posted publicly;
      // the bare design page only redirects. The public, watermarked showcase sets the same (lib/showcase.js).
      res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      res.vary('Cookie');
      res.locals.gatedPage = true;

      const id = typeof req.query.id === 'string' ? req.query.id : '';
      if (await hasStudioSession(req)) { // (b) planner, (c) couple: any design, drafts included
        const doc = id && SLUG_RE.test(id) ? await getInvitation(id) : null;
        const inv = doc ? (canEdit(req, id) ? doc.draft : isLive(doc) ? doc.published : null) : null;
        const g = inv ? linkParam(req) : '';
        const link = g ? activeLink(doc, inv, g) : null;
        if (g && !link) return sendInactive(res);
        if (inv && (await sendWithMeta(req, res, distDir, theme, inv, id, null, link))) return undefined;
        return next();
      }

      // the bare design (an old search result, a shared link): its own design page, permanently, so search engines
      // replace the sample invitation ("Aarati & Sameer") with the design's page and title. no-store above keeps a
      // planner who signs in later from being sent there by a cached redirect.
      if (!id) return res.redirect(301, designPageOf(distDir, theme));
      const doc = SLUG_RE.test(id) ? await getInvitation(id) : null;
      const pub = isLive(doc) ? doc.published : null; // unpublished or suspended: the same answer
      if (!pub) return res.status(404).type('html').send(NOT_AVAILABLE);
      // a guest link (?g=, lib/guest-links.js): only its ceremonies are sent; a deleted or unknown one, nothing
      const g = linkParam(req);
      const link = g ? activeLink(doc, pub, g) : null;
      if (g && !link) return sendInactive(res);
      // (a) a published invitation, shown only in its own design: a guest link cannot be used to try others.
      if (pub.theme !== theme) {
        const q = new URLSearchParams();
        for (const [k, v] of Object.entries(req.query)) if (typeof v === 'string') q.set(k, v);
        return res.redirect(302, `/${encodeURIComponent(pub.theme)}/?${q}`);
      }
      if (await sendWithMeta(req, res, distDir, theme, pub, id, doc, link)) return undefined;
      return next();
    } catch (err) { return next(err); }
  };
}
