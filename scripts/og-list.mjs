// Lists the share images (public/site/og/<img>.jpg) the pages name that do not exist yet, with what to draw on each.
// Usage (repo root): node scripts/og-list.mjs "$PWD" > og.json, then python scripts/make-og.py og.json public/site/og http://localhost:<port>
// (a running production server serves the art and fonts).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.argv[2];
const { ALL_PAGE_IDS, pageMeta } = await import(`file:///${root}/src/site/seo.mjs`);
const { LANDINGS } = await import(`file:///${root}/src/site/landings.mjs`);
const { INTL_PAGES } = await import(`file:///${root}/src/site/intl-content.mjs`);
const stills = JSON.parse(readFileSync(resolve(root, 'src/site/stills.json'), 'utf8'));
const strip = (s) => String(s).replace(/<[^>]+>/g, '');
const em = (s) => String(s).replace(/<em>/g, '<i>').replace(/<\/em>/g, '</i>');
const ART = { 'intl/home': 'olive', 'intl/designs': 'rosearch', 'intl/occasions': 'garden', 'intl/features': 'schedule', 'intl/how': 'seal', 'intl/pricing': 'roses', 'intl/faq': 'rsvp', 'intl/contact': 'letterpress' };
const out = [];
for (const id of ALL_PAGE_IDS) {
  const m = pageMeta(id);
  if (existsSync(resolve(root, 'public/site/og', `${m.img}.jpg`)) || out.some((x) => x.img === m.img)) continue;
  const l = id.startsWith('land/') ? LANDINGS[id.slice(5)] : null;
  const p = INTL_PAGES[id];
  const market = m.market === 'intl' ? 'intl' : 'np';
  let phone = null;
  if (id.startsWith('intl-design/')) phone = { src: `/site/stills/${id.slice(12)}-800.webp` };
  else if (l?.hero?.design) phone = { src: `/site/stills/${l.hero.design}-800.webp` };
  else if (l?.hero?.art) phone = { src: `/site/intl/${l.hero.art}-v3-800.webp` };
  else if (l?.hero?.mock) phone = { mock: l.hero.mock };
  else if (ART[id]) phone = { src: `/site/intl/${ART[id]}-v3-800.webp` };
  else phone = { src: '/site/stills/laali-800.webp' };
  const h1 = l ? l.h1 : p ? p.h1 : id.startsWith('intl-design/') ? `${m.name.replace(/ Wedding Invitation Design$/, '')} <em>wedding invitation</em>` : m.title.replace(/ \| Nimtto$/, '');
  out.push({ img: m.img, market, eyebrow: l?.eyebrow || p?.eyebrow || m.eyebrow || 'Nimtto', ne: l?.ne || '', h1: em(h1), sub: market === 'intl' ? `Paid once, from ${(id.startsWith('intl-design/') && /from (\$\d+(?:,\d{3})*)/.exec(m.desc)?.[1]) || '$49'} · card or PayPal` : 'Paid once, from Rs 2,999 · Khalti, eSewa, QR', foot: market === 'intl' ? 'Animated invitations with RSVP, made with a real designer' : 'Digital invitations for Nepal, made with a real designer', phone, custom: l?.offer === 'custom' });
}
console.log(JSON.stringify(out));
