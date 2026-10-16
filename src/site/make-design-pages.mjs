// Writes one static page per design: designs/<slug>/index.html, from src/site/design-template.html and the list in
// src/site/themes.js (names, Nepali names, plain-English descriptions, categories, communities from each theme's
// slots.js). Static pages give every design its own title, description, link preview and crawlable stills;
// src/site/design-page.js then fills prices, contact and anything the admin changed.
// Run after adding a theme or changing the template:  node src/site/make-thumbs.mjs && node src/site/make-design-pages.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { THEMES, CATEGORIES, RELIGION_LABEL } from './themes.js';
import { phoneStill, STILL_SIZES } from './stills.js';

const ROOT = resolve(import.meta.dirname, '..', '..');
const OUT = resolve(ROOT, 'designs');
const tpl = readFileSync(resolve(import.meta.dirname, 'design-template.html'), 'utf8');
const stills = JSON.parse(readFileSync(resolve(import.meta.dirname, 'stills.json'), 'utf8'));
const thumbs = new Set(JSON.parse(readFileSync(resolve(import.meta.dirname, 'thumbs.json'), 'utf8')));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonLd = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

/** the communities a theme declares in src/themes/<slug>/slots.js (absent = hindu only) */
function religionsOf(t) {
  const f = resolve(ROOT, 'src', 'themes', t.slug, 'slots.js');
  if (!existsSync(f)) return t.religions || ['hindu'];
  const m = readFileSync(f, 'utf8').match(/religions\s*:\s*\[([^\]]*)\]/);
  if (!m) return ['hindu'];
  const list = [...m[1].matchAll(/['"]([a-z]+)['"]/g)].map((x) => x[1]).filter((r) => RELIGION_LABEL[r]);
  return list.length ? list : ['hindu'];
}

const thumbSrc = (slug) => (thumbs.has(slug) ? `/site/thumbs/${slug}-480.webp` : `/themes/${slug}/thumb.jpg`);
/** the picture inside a phone frame: the design's chosen still (src + srcset), else the big-screen thumb */
const phonePic = (slug) => phoneStill(stills, slug, thumbSrc(slug));
const srcsetAttr = (pic, sizes) => (pic.srcset ? ` srcset="${pic.srcset}" sizes="${sizes}"` : '');
/** the first view's label: the gate is "the opening"; any other chosen frame is simply the design */
const firstView = (slug) => (['gate', 'mid'].includes(stills[slug]?.kind) ? ['Opening', 'The opening', 'The opening of the'] : ['Design', 'The real design', 'The']);
const suitsText = (rel) => {
  const names = rel.filter((r) => r !== 'other').map((r) => RELIGION_LABEL[r]);
  if (rel.includes('other')) names.push('other');
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return `${list} weddings`;
};

function related(t) {
  const i = THEMES.findIndex((x) => x.slug === t.slug);
  const rot = [...THEMES.slice(i + 1), ...THEMES.slice(0, i)];
  const same = rot.filter((x) => x.cat === t.cat);
  const other = rot.filter((x) => x.cat !== t.cat);
  return [...same, ...other].slice(0, 3);
}
function relatedHtml(x) {
  return `<li><a class="rcard" href="/designs/${x.slug}/"><span class="rcard__pic" style="--tint:${CATEGORIES[x.cat].tint}"><span class="rcard__phone"><img src="${phonePic(x.slug).src}"${srcsetAttr(phonePic(x.slug), STILL_SIZES.related)} width="390" height="844" alt="" loading="lazy" decoding="async" /></span></span>`
    + `<span class="rcard__name">${esc(x.name)} <span class="rcard__ne" lang="ne">${esc(x.ne)}</span></span>`
    + `<span class="rcard__meta">${esc(CATEGORIES[x.cat].label.toLowerCase())} · <span class="js-from">from Rs. 2,999</span></span></a></li>`;
}

if (existsSync(OUT)) for (const d of readdirSync(OUT, { withFileTypes: true })) if (d.isDirectory()) rmSync(resolve(OUT, d.name), { recursive: true });
mkdirSync(OUT, { recursive: true });
const done = [];
for (const t of THEMES) {
  const rel = religionsOf(t);
  const allFaiths = rel.includes('muslim') && rel.includes('christian');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Product', name: `${t.name} wedding invitation design`, alternateName: t.ne, image: `https://nimtto.com/themes/${t.slug}/thumb.jpg`, description: t.concept, brand: { '@type': 'Brand', name: 'Nimtto' }, category: 'Wedding invitations', url: `https://nimtto.com/designs/${t.slug}/` },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://nimtto.com/' },
        { '@type': 'ListItem', position: 2, name: 'Designs', item: 'https://nimtto.com/#designs' },
        { '@type': 'ListItem', position: 3, name: t.name, item: `https://nimtto.com/designs/${t.slug}/` },
      ] },
    ],
  };
  const vals = {
    SLUG: t.slug,
    NAME: esc(t.name),
    DESC: esc(t.concept),
    DETAIL: esc(t.concept),
    META_DESC: esc(`${t.concept} A Nepali wedding invitation website with your song, Nepali dates and RSVP, shared in one link.`),
    ALT: esc(t.alt),
    CAT: t.cat,
    CAT_LABEL: esc(CATEGORIES[t.cat].label.toLowerCase()),
    CAT_ONE: esc(CATEGORIES[t.cat].one),
    NE_LINE: t.ne ? `<p class="info__ne" lang="ne">${esc(t.ne)}</p>` : '',
    OPEN_SRC: phonePic(t.slug).src,
    OPEN_SRCSET: srcsetAttr(phonePic(t.slug), STILL_SIZES.gallery),
    OPEN_PRELOAD: phonePic(t.slug).srcset ? ` imagesrcset="${phonePic(t.slug).srcset}" imagesizes="${STILL_SIZES.gallery}"` : '',
    OPEN_TAB: firstView(t.slug)[0],
    OPEN_CAP: firstView(t.slug)[1],
    OPEN_ALT: `${firstView(t.slug)[2]} ${esc(t.name)} design: ${esc(t.alt)}`,
    SUITS: esc(suitsText(rel)),
    FAITH_NOTE: allFaiths ? ' Muslim, Christian and other weddings get their own events and words.' : '',
    RELATED: related(t).map(relatedHtml).join(''),
    JSONLD: jsonLd(ld),
  };
  for (const c of Object.keys(CATEGORIES)) vals[`CUR_${c}`] = c === t.cat ? ' class="is-current" aria-current="true"' : '';
  const html = tpl.replace(/%([A-Za-z_]+)%/g, (m, k) => (k in vals ? vals[k] : m));
  mkdirSync(resolve(OUT, t.slug), { recursive: true });
  writeFileSync(resolve(OUT, t.slug, 'index.html'), html);
  done.push(t.slug);
}
writeFileSync(resolve(import.meta.dirname, 'design-pages.json'), `${JSON.stringify(done)}\n`);
console.log(`design pages: ${done.length} written to designs/<slug>/index.html`);
