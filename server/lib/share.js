// GET /i/<slug>: a tiny link-preview page (Open Graph + Twitter card) that forwards guests to the theme page.
// No JS. Only published invitations. Every value is HTML-escaped; the forward URL is built from the stored
// theme slug and validated query values only, so this is not an open redirect.
import { SLUG_RE, getInvitation } from './store.js';
import { PUBLIC_ORIGINS } from './env.js';
import { listThemes } from './catalog.js';
import { photoUrl } from './invitations.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/** The origin guests reach us on: the configured public origin, else this request's own host. */
const originOf = (req) => PUBLIC_ORIGINS[0] || `${req.protocol}://${req.get('host')}`;

export async function sharePage(req, res) {
  const { slug } = req.params;
  if (!SLUG_RE.test(slug)) return res.status(404).type('text/plain').send('Not found');
  const doc = await getInvitation(slug);
  if (!doc || doc.status !== 'published' || !doc.published) return res.status(404).type('text/plain').send('Not found');
  const inv = doc.published;

  const q = new URLSearchParams({ id: slug });
  const to = typeof req.query.to === 'string' ? req.query.to.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 60) : '';
  if (to) q.set('to', to);
  const ids = new Set(inv.events.map((e) => e.id));
  const e = typeof req.query.e === 'string' ? req.query.e.split(',').filter((x) => ids.has(x)).slice(0, 12) : [];
  if (e.length) q.set('e', e.join(','));
  const target = `/${inv.theme}/?${q}`;

  const origin = originOf(req);
  const nm = (p) => p?.name?.en || p?.name?.ne || '';
  const names = [nm(inv.couple.bride), nm(inv.couple.groom)].filter(Boolean).join(' & ');
  const title = inv.share?.title || (names ? `${names} · Shubha Bibaha` : 'Wedding invitation');
  const description = inv.share?.description || 'You are warmly invited to our wedding.';
  let img = photoUrl(inv.share?.image) || photoUrl(inv.couple.portraits[0]?.photo);
  if (!img) img = listThemes().find((t) => t.slug === inv.theme)?.thumb || '';
  const image = img ? (img.startsWith('https://') ? img : `${origin}${img}`) : '';
  const url = `${origin}/i/${slug}`;

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
