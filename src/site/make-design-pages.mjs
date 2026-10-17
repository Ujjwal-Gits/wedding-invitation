// Writes one static page per design: designs/<slug>/index.html, from src/site/design-template.html and the list in
// src/site/themes.js (names, Nepali names, descriptions, categories, tiers, communities from each theme's slots.js).
// The shared header, footer, dialogs and FAQ are filled in by the Vite partials plugin (src/site/partials.mjs).
// Also writes public/sitemap.xml (every public page). designs/index.html (the Designs page) is not touched.
// Run after adding a theme or changing the template:  node src/site/make-thumbs.mjs && node src/site/make-design-pages.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { THEMES, CATEGORIES, RELIGION_LABEL, FALLBACK_SITE, TIER_LABEL, planForTier } from './themes.js';
import { phoneStill, STILL_SIZES } from './stills.js';
import { esc, phone, rs, SIZES } from './partials.mjs';
import { pageMeta } from './seo.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const OUT = resolve(ROOT, 'designs');
const SITE = 'https://nimtto.com';
const tpl = readFileSync(resolve(import.meta.dirname, 'design-template.html'), 'utf8');
const stills = JSON.parse(readFileSync(resolve(import.meta.dirname, 'stills.json'), 'utf8'));
const thumbs = new Set(JSON.parse(readFileSync(resolve(import.meta.dirname, 'thumbs.json'), 'utf8')));
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
const phonePic = (slug) => phoneStill(stills, slug, thumbSrc(slug));
const srcsetAttr = (pic, sizes) => (pic.srcset ? ` srcset="${pic.srcset}" sizes="${sizes}"` : '');
const firstView = (slug) => (['gate', 'mid'].includes(stills[slug]?.kind) ? 'The opening of the' : 'The');
const suitsText = (rel) => {
  const names = rel.filter((r) => r !== 'other').map((r) => RELIGION_LABEL[r]);
  if (rel.includes('other')) names.push('other');
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return `${list} weddings`;
};

function related(t) {
  const i = THEMES.findIndex((x) => x.slug === t.slug);
  const rot = [...THEMES.slice(i + 1), ...THEMES.slice(0, i)];
  return [...rot.filter((x) => x.cat === t.cat), ...rot.filter((x) => x.cat !== t.cat)].slice(0, 4);
}
function relatedHtml(x) {
  const p = planForTier(FALLBACK_SITE.plans, x.tier);
  return `<li class="rcard"><a class="rcard__pic" href="/designs/${x.slug}/" style="--tint:${CATEGORIES[x.cat].tint}" tabindex="-1" aria-hidden="true">${phone(x.slug, { sizes: SIZES.rail })}</a>`
    + `<p class="rcard__name"><a href="/designs/${x.slug}/">${esc(x.name)}</a> <span lang="ne">${esc(x.ne)}</span></p>`
    + `<p class="rcard__meta"><span class="tier tier--${x.tier}" data-tier-tag="${x.tier}">${TIER_LABEL[x.tier]}</span><span data-tier-price="${x.tier}">${p ? `from ${rs(p.price)}` : ''}</span></p></li>`;
}

if (existsSync(OUT)) for (const d of readdirSync(OUT, { withFileTypes: true })) if (d.isDirectory()) rmSync(resolve(OUT, d.name), { recursive: true });
mkdirSync(OUT, { recursive: true });
const done = [];
const GALLERY = '(max-width: 899px) 58vw, 360px';
for (const t of THEMES) {
  const rel = religionsOf(t);
  const allFaiths = rel.includes('muslim') && rel.includes('christian');
  const plan = planForTier(FALLBACK_SITE.plans, t.tier);
  const seo = pageMeta(`design/${t.slug}`);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product', '@id': `${SITE}/designs/${t.slug}/#product`, name: seo.name, alternateName: t.ne, image: [seo.image, `${SITE}/themes/${t.slug}/thumb.jpg`], description: seo.desc,
        brand: { '@type': 'Brand', name: 'Nimtto' }, category: 'Digital wedding invitation', url: `${SITE}/designs/${t.slug}/`,
        ...(plan ? { offers: { '@type': 'Offer', price: String(plan.price), priceCurrency: 'NPR', availability: 'https://schema.org/InStock', url: `${SITE}/designs/${t.slug}/`, seller: { '@id': `${SITE}/#org` } } } : {}),
      },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Designs', item: `${SITE}/designs/` },
        { '@type': 'ListItem', position: 3, name: t.name, item: `${SITE}/designs/${t.slug}/` },
      ] },
    ],
  };
  const pic = phonePic(t.slug);
  const vals = {
    SLUG: t.slug,
    NAME: esc(t.name),
    NE: esc(t.ne),
    DESC: esc(t.concept),
    ALT: esc(t.alt),
    CAT: t.cat,
    CAT_LABEL: esc(CATEGORIES[t.cat].label),
    CAT_ONE: esc(CATEGORIES[t.cat].one),
    TINT: CATEGORIES[t.cat].tint,
    NE_LINE: t.ne ? `<p class="dp__ne" lang="ne">${esc(t.ne)}</p>` : '',
    TIER: t.tier,
    TIER_LABEL: TIER_LABEL[t.tier],
    TIER_PRICE: plan ? rs(plan.price) : '',
    OPEN_SRC: pic.src,
    OPEN_SRCSET: srcsetAttr(pic, GALLERY),
    OPEN_PRELOAD: pic.srcset ? ` imagesrcset="${pic.srcset}" imagesizes="${GALLERY}"` : '',
    OPEN_ALT: `${firstView(t.slug)} ${esc(t.name)} design: ${esc(t.alt)}`,
    SUITS: esc(suitsText(rel)),
    FAITH_NOTE: allFaiths ? ' Muslim, Christian and other weddings get their own events and words.' : '',
    RELATED: related(t).map(relatedHtml).join(''),
    JSONLD: jsonLd(ld),
  };
  const html = tpl.replace(/%([A-Z_]+)%/g, (m, k) => (k in vals ? vals[k] : m));
  mkdirSync(resolve(OUT, t.slug), { recursive: true });
  writeFileSync(resolve(OUT, t.slug, 'index.html'), html);
  done.push(t.slug);
}
writeFileSync(resolve(import.meta.dirname, 'design-pages.json'), `${JSON.stringify(done)}\n`);

// the sitemap and llms files (every public page of both sites) are written by make-landing-pages.mjs, from
// design-pages.json above: run it next.
console.log(`design pages: ${done.length} written to designs/<slug>/index.html; now run node src/site/make-landing-pages.mjs`);
