// GET /i/<slug>: a tiny link-preview page (Open Graph + Twitter card) that forwards guests to the theme page.
// No JS. Only published invitations. Every value is HTML-escaped; the forward URL is built from the stored
// theme slug and validated query values only, so this is not an open redirect.
import { SLUG_RE, isLive, peekInvitation as getInvitation } from './store.js'; // read-only, cached
import { PUBLIC_ORIGINS } from './env.js';
import { photoUrl } from './invitations.js';
import { VERSIONS, TITLE, isReligion } from '../../src/core/faith.js';
import { DEMO_PEOPLE_PHOTOS, DEMO_SHARE } from './demo.js';
import { OCCASIONS, isOccasion } from '../../src/core/markets.js';
import { activeLink, eventNames, linkParam, LINK_ID_RE, sendInactive } from './guest-links.js';

const NEUTRAL_IMAGE = '/art/og.jpg'; // public/art/og.jpg: hands joined at a wedding (no names, no faces)

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/** The origin guests reach us on: the configured public origin, else this request's own host. */
const originOf = (req) => PUBLIC_ORIGINS[0] || `${req.protocol}://${req.get('host')}`;

/**
 * What a link preview of this invitation says: its own share words, else its names, else our brand
 * ("Wedding invitation · Nimtto"). Never the demo couple's (lib/demo.js).
 */
export function shareInfo(inv, req, slug, link = null) {
  const origin = originOf(req);
  // The invitation's own words only, never the demo's (lib/demo.js); no names at all -> our brand.
  const real = (s) => (typeof s === 'string' && s.trim() && !DEMO_SHARE.has(s.trim()) ? s.trim() : '');
  const nm = (p) => real(p?.name?.en) || real(p?.name?.ne);
  const names = [nm(inv.couple?.bride), nm(inv.couple?.groom)].filter(Boolean).join(' & ');
  // another occasion (a birthday, a baby shower …; src/core/markets.js) never reads "wedding"
  const occ = inv.occasion && inv.occasion !== 'wedding' && isOccasion(inv.occasion) ? OCCASIONS[inv.occasion].en : '';
  const title = real(inv.share?.title) || (names ? `${names} · ${occ || TITLE[isReligion(inv.religion) ? inv.religion : 'hindu'].en}` : occ ? `${occ} invitation · Nimtto` : 'Wedding invitation · Nimtto');
  let description = real(inv.share?.description) || (occ ? 'You’re warmly invited.' : 'You are warmly invited to our wedding.');
  // a guest link's preview names its ceremonies ("Haldi & Mehendi · You are warmly invited …"), never the others
  const only = link ? eventNames(inv, link) : '';
  if (only) description = `${only} · ${description}`;
  const portrait = (inv.couple?.portraits || []).find((p) => p?.photo && !(typeof p.photo === 'string' && DEMO_PEOPLE_PHOTOS.has(p.photo)))?.photo;
  let img = photoUrl(inv.share?.image) || photoUrl(portrait);
  // No photo of their own yet: a neutral picture (joined hands), never the design's thumbnail (it shows the demo couple).
  if (!img) img = NEUTRAL_IMAGE;
  const image = img ? (img.startsWith('https://') ? img : `${origin}${img}`) : '';
  return { title, description, image, url: `${origin}/i/${slug}${link ? `?g=${link.id}` : ''}` };
}

/** The built theme page with this invitation's own title and link-preview tags (lib/gate.js, ?id=<slug>). */
export function withShareMeta(html, info) {
  const set = (attr, name, value) => {
    const re = new RegExp(`(<meta\\s+${attr}="${name}"\\s+content=")[^"]*(")`, 'gi');
    html = html.replace(re, (m, a, b) => `${a}${esc(value)}${b}`);
  };
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(info.title)}</title>`);
  set('property', 'og:title', info.title);
  set('property', 'og:description', info.description);
  set('name', 'description', info.description);
  if (info.image) set('property', 'og:image', info.image);
  return html;
}

export async function sharePage(req, res) {
  const { slug } = req.params;
  if (!SLUG_RE.test(slug)) return res.status(404).type('text/plain').send('Not found');
  const doc = await getInvitation(slug);
  if (!isLive(doc)) return res.status(404).type('text/plain').send('Not found');
  const inv = doc.published;
  const g = linkParam(req);
  const link = g ? activeLink(doc, inv, g) : null;
  if (g && !link) return sendInactive(res);

  const q = new URLSearchParams({ id: slug });
  if (link && LINK_ID_RE.test(link.id)) q.set('g', link.id);
  const to = typeof req.query.to === 'string' ? req.query.to.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 60) : '';
  if (to) q.set('to', to);
  const ids = new Set(inv.events.map((e) => e.id));
  const e = typeof req.query.e === 'string' ? req.query.e.split(',').filter((x) => ids.has(x)).slice(0, 12) : [];
  if (e.length) q.set('e', e.join(','));
  // a personal link's version of the religious symbols (docs/PLATFORM.md "Religion"): only the known values
  if (typeof req.query.v === 'string' && VERSIONS.includes(req.query.v)) q.set('v', req.query.v);
  const target = `/${inv.theme}/?${q}`;

  const { title, description, image, url } = shareInfo(inv, req, slug, link);
  const meta = [
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'Nimtto'],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', url],
    ...(image ? [['property', 'og:image', image], ['property', 'og:image:alt', title]] : []),
    ['name', 'twitter:card', image ? 'summary_large_image' : 'summary'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
    ...(image ? [['name', 'twitter:image', image]] : []),
    ['name', 'description', description],
    ['name', 'robots', 'noindex, nofollow'],
  ].map(([k, n, v]) => `<meta ${k}="${esc(n)}" content="${esc(v)}">`).join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${meta}
<meta http-equiv="refresh" content="0; url=${esc(target)}">
<link rel="canonical" href="${esc(url)}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fbf6ee;color:#3a2a1e;font:16px/1.5 Georgia,serif;text-align:center}a{color:#8e1424}</style>
</head>
<body>
<p><a href="${esc(target)}">Open the invitation</a></p>
</body>
</html>
`;
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(html);
}
