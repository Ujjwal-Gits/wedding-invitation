// The sitemaps: /sitemap.xml is an index of every public/sitemap-*.xml (pages per site, designs, images, and the
// blog's own file once it exists). <lastmod> is the date a page's main content really changed: each page's content
// (its own markup and the partials it uses, never the shared header, footer or head) is hashed, and the date moves
// only when the hash does (src/site/lastmod.json keeps hash and date per URL; commit it with the sitemaps).
//
//   writeSitemap(file, entries)       entries: [{ path, lastmod, imgs?: ['/site/..'] }] -> public/<file>
//   writeSitemapIndex()               rewrites public/sitemap.xml from the sitemap-*.xml files present
//   lastmodOf(path, extraSources)     the content date for one URL (updates the manifest in memory)
//   saveLastmods()                    writes src/site/lastmod.json
// The blog (sitemap-blog.xml) writes its own file with writeSitemap and then calls writeSitemapIndex(); any other
// generator can do the same. Plain module: Node runs it at build, never the browser.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { SITE_URL } from './content.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PUBLIC = resolve(ROOT, 'public');
const MANIFEST = resolve(import.meta.dirname, 'lastmod.json');
const today = () => new Date().toISOString().slice(0, 10);
const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');

/** Partials that are the same on every page (header, footer, dialogs, head, breadcrumbs): not part of a page's content. */
const CHROME = /<!--@(?:head|meta|header|footer|dialogs|intl-header|intl-footer|legal-header|legal-footer|crumbs)(?::[^>]*?)?-->/g;

let manifest = null;
const load = () => (manifest ??= existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {});

/** The page's source file: <path>/index.html in the project (the home page is index.html). */
export const sourceOf = (path) => resolve(ROOT, `.${path}`, 'index.html');

/** The newest commit date (YYYY-MM-DD) of these files, or '' when git cannot tell. */
function gitDate(files) {
  try {
    const rel = files.map((f) => relative(ROOT, f).split(sep).join('/'));
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...rel], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : '';
  } catch { return ''; }
}

/**
 * A page's content fingerprint: its source with the chrome partials removed and the rest rendered (the words, the
 * design cards, the FAQ, the plans, its JSON-LD), whitespace folded. `render` is partials.mjs renderPartials.
 */
export function fingerprint(path, render, extra = '') {
  const file = sourceOf(path);
  if (!existsSync(file)) return null;
  const html = render(readFileSync(file, 'utf8').replace(CHROME, '')).replace(/\s+/g, ' ');
  return createHash('sha1').update(html).update(extra).digest('hex').slice(0, 16);
}

/**
 * The <lastmod> for a URL: kept while its fingerprint is unchanged, today when it changed. A URL seen for the first
 * time takes the last commit date of its source files (`sources`, project paths), so the first run does not claim
 * that every page changed today.
 */
export function lastmodOf(path, render, { sources = [], extra = '' } = {}) {
  const m = load();
  const h = fingerprint(path, render, extra);
  if (!h) return m[path]?.d || today();
  const prev = m[path];
  if (prev && prev.h === h) return prev.d;
  const d = prev ? today() : (gitDate([sourceOf(path), ...sources.map((s) => resolve(ROOT, s))]) || today());
  m[path] = { h, d };
  return d;
}

/** Writes src/site/lastmod.json, keeping only the URLs still in a sitemap (`keep`, a set of paths). */
export function saveLastmods(keep) {
  const m = load();
  const out = {};
  for (const k of Object.keys(m).sort()) if (!keep || keep.has(k)) out[k] = m[k];
  writeFileSync(MANIFEST, `${JSON.stringify(out, null, 1)}\n`);
}

/** Writes public/<file>: a urlset; entries with `imgs` get image entries (absolute URLs, same site). */
export function writeSitemap(file, entries, { images = false } = {}) {
  if (!/^sitemap-[a-z0-9-]+\.xml$/.test(file)) throw new Error(`sitemaps: bad file name ${file}`);
  const abs = (p) => (/^https:\/\//.test(p) ? p : `${SITE_URL}${p}`);
  const body = entries.map((e) => {
    const imgs = images ? [...new Set(e.imgs || [])].map((i) => `\n    <image:image><image:loc>${xmlEsc(abs(i))}</image:loc></image:image>`).join('') : '';
    return `  <url><loc>${xmlEsc(abs(e.path))}</loc><lastmod>${e.lastmod}</lastmod>${imgs}</url>`;
  }).join('\n');
  writeFileSync(resolve(PUBLIC, file), `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${images ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ''}>
${body}
</urlset>
`);
  return entries.length;
}

/** Rewrites public/sitemap.xml: one <sitemap> per public/sitemap-*.xml, its <lastmod> the newest inside it. */
export function writeSitemapIndex() {
  const files = readdirSync(PUBLIC).filter((f) => /^sitemap-[a-z0-9-]+\.xml$/.test(f)).sort();
  const items = files.map((f) => {
    const xml = readFileSync(resolve(PUBLIC, f), 'utf8');
    const dates = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((x) => x[1].slice(0, 10)).sort();
    return `  <sitemap><loc>${SITE_URL}/${f}</loc>${dates.length ? `<lastmod>${dates[dates.length - 1]}</lastmod>` : ''}</sitemap>`;
  });
  writeFileSync(resolve(PUBLIC, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items.join('\n')}
</sitemapindex>
`);
  return files;
}
