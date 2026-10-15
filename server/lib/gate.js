// Production gate for the theme pages. The designs are the product, so a theme's HTML entry point
// (/<theme>/, /<theme>/index.html) is served only to:
//   (a) guests of a published invitation:  /<theme>/?id=<slug> (the invitation's own theme),
//   (b) the planner (admin session), or
//   (c) a couple with a live client session (their studio previews drafts and shows the designs they may pick).
// Everyone else is sent to the website's gallery (no id) or gets a small "not available" page (unknown or
// unpublished id: the same answer for both, so it never tells whether a draft exists).
// Static files (/assets, /themes art, thumbs, fonts) stay public: invitations need them.
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { SLUG_RE, getInvitation } from './store.js';
import { listThemes } from './catalog.js';
import { hasStudioSession } from './auth.js';

// Pages under dist/ that are not designs.
const OPEN_PAGES = new Set(['studio', 'credits', 'assets', 'themes', 'site', 'photos', 'audio', 'art']);

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

/** Express middleware for the production static setup (place it before express.static). */
export function themePageGate(distDir) {
  return async (req, res, next) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const themes = new Set([...listThemes().map((t) => t.slug), ...builtPages(distDir)]);
      for (const p of OPEN_PAGES) themes.delete(p);
      const theme = themeOfPath(req.path, themes);
      if (!theme) return next();
      res.set('Cache-Control', 'private, no-store');
      res.vary('Cookie');
      res.locals.gatedPage = true;

      if (await hasStudioSession(req)) return next(); // (b) planner, (c) couple: any design, drafts included

      const id = typeof req.query.id === 'string' ? req.query.id : '';
      if (!id) return res.redirect(302, '/#designs');
      const doc = SLUG_RE.test(id) ? await getInvitation(id) : null;
      const pub = doc?.status === 'published' ? doc.published : null;
      if (!pub) return res.status(404).type('html').send(NOT_AVAILABLE);
      // (a) a published invitation, shown only in its own design: a guest link cannot be used to try others.
      if (pub.theme !== theme) {
        const q = new URLSearchParams();
        for (const [k, v] of Object.entries(req.query)) if (typeof v === 'string') q.set(k, v);
        return res.redirect(302, `/${encodeURIComponent(pub.theme)}/?${q}`);
      }
      return next();
    } catch (err) { return next(err); }
  };
}
