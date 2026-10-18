// The international site's designs: ONE data source for the build (src/site/intl.mjs: the gallery, the designs page,
// JSON-LD) and the browser (src/site/intl.js, the order form). Plain module.
//
// INTL_THEMES: the real international designs (src/themes/<slug>/, market 'intl' in server/lib/catalog.js), each
// with its own page at /international/designs/<slug>/ (src/site/make-design-pages.mjs) and its phone still in
// public/site/stills/. The live list (GET /api/themes?market=intl) replaces it in the browser, in the planner's order.
// ARTWORK: the older painted phone screens (public/site/intl/<id>-<V>-<w>.webp), still used for the guest-journey
// screens and a few landing heroes; it is no longer a design list.
//
// NP_DESIGNS_INTL: the Nepal designs the international site's Nepali and South Asian wedding pages show and offer in
// their order form (no religious images on the international site).
import { BY_SLUG } from './themes.js';

export const NP_DESIGNS_INTL = ['laali', 'mahal', 'swayambar', 'dhaka', 'hariyo', 'mehendi', 'kham', 'gurans', 'sindoor', 'rangoli', 'mohar'];

export const STYLES = [['garden', 'Garden'], ['romantic', 'Romantic'], ['classic', 'Classic'], ['modern', 'Modern'], ['destination', 'Destination'], ['nepali', 'Nepali']];
export const STYLE_LABEL = Object.fromEntries(STYLES);

/** the art version, in every file name: new art gets a new URL, so no browser or CDN cache can show an old picture */
export const V = 'v3';
export const WIDTHS = [480, 800, 1170];
export const artSrc = (id, w = 480) => `/site/intl/${id}-${V}-${w}.webp`;
export const artSrcset = (id) => WIDTHS.map((w) => `${artSrc(id, w)} ${w}w`).join(', ');

/** The artwork designs. tier: the cheapest plan that includes it (saral = Standard, shubha = Pro, shahi = Pro Max). */
export const ARTWORK = [
  { id: 'olive', name: 'Olive Grove', style: 'garden', tier: 'shubha', alt: 'a watercolor olive wreath around the date', line: 'A watercolor olive wreath and soft sweet peas around your names.' },
  { id: 'rosearch', name: 'Rose Arch', style: 'romantic', tier: 'shahi', alt: 'a stone arch covered in climbing garden roses', line: 'Guests step through a stone arch of climbing garden roses.' },
  { id: 'roses', name: 'Blush Roses', style: 'classic', tier: 'saral', alt: 'peach and blush garden roses inside a thin gold frame', line: 'Peach and blush roses inside a thin gold frame.' },
  { id: 'arch', name: 'Gold Arch', style: 'modern', tier: 'shubha', alt: 'a thin gold arch with a blush rose', line: 'A clean gold arch with a single blush rose.' },
  { id: 'amalfi', name: 'Amalfi', style: 'destination', tier: 'shahi', alt: 'lemon branches above the Amalfi coast', line: 'Lemon branches above the sea, for a wedding far from home.' },
  { id: 'garden', name: 'Garden Party', style: 'garden', tier: 'shubha', alt: 'a garden ceremony with a rose arbor and white chairs', line: 'A rose arbor and white chairs on a summer lawn.' },
  { id: 'wildflower', name: 'Wildflower', style: 'romantic', tier: 'shubha', alt: 'a summer meadow of pink and peach wildflowers', line: 'A summer meadow of pink and peach wildflowers.' },
  { id: 'letterpress', name: 'Letterpress', style: 'classic', tier: 'saral', alt: 'a deckled cotton card on sage linen', line: 'A deckled cotton card on sage linen, simple and timeless.' },
  { id: 'seal', name: 'Wax Seal', style: 'modern', tier: 'saral', alt: 'a white envelope with a sage wax seal', line: 'Guests break a sage wax seal to open the envelope.' },
  { id: 'tuscany', name: 'Tuscany', style: 'destination', tier: 'shubha', alt: 'vineyard hills at golden hour', line: 'Vineyard hills at golden hour.' },
].map((d) => ({ ...d, slug: d.id, mini: artSrc(d.id, 480), art: true }));

/**
 * The international designs, in the catalog's order. tier and style follow server/lib/catalog.js (the planner can
 * change the tier; the live list wins in the browser). occasions: what the design reads naturally for (src/core/markets.js).
 * line/alt: plain US English, no religion words (this site has no religion labels).
 * cat and faith are for the Nepal site only (its look and faith filters, which list every design): cat is one of its
 * looks (flowers | doors | cards | film), faith the community the art is made for, religions every community it suits
 * (exactly the design's slots.js `religions`; docs/FAITH-DESIGNS.md).
 */
const W = ['wedding', 'engagement', 'anniversary', 'vow-renewal', 'rehearsal-dinner'];
const N = ['wedding', 'engagement', 'anniversary'];
export const INTL_THEMES = [
  { slug: 'olive-grove', cat: 'cards', faith: 'christian', religions: ['buddhist', 'kirat', 'muslim', 'christian', 'other'], name: 'Olive Grove', style: 'garden', tier: 'shubha', occasions: [...W, 'bridal-shower', 'dinner-party'], line: 'A folded linen card opens and a watercolor olive wreath grows around your names.', alt: 'a watercolor olive wreath around the couple’s names on linen' },
  { slug: 'rose-arch', cat: 'doors', faith: 'christian', religions: ['christian'], name: 'Rose Arch', style: 'romantic', tier: 'shahi', occasions: W, line: 'Guests walk through a stone arch of climbing garden roses into the green garden beyond.', alt: 'a stone arch covered in climbing garden roses' },
  { slug: 'blush-roses', cat: 'flowers', faith: 'christian', religions: ['buddhist', 'kirat', 'muslim', 'christian', 'other'], name: 'Blush Roses', style: 'classic', tier: 'saral', occasions: [...W, 'bridal-shower', 'baby-shower'], line: 'A thin gold frame draws itself while blush garden roses bloom in the corners.', alt: 'blush garden roses in the corners of a thin gold frame' },
  { slug: 'gold-arch', cat: 'doors', faith: 'muslim', religions: ['muslim'], name: 'Gold Arch', style: 'modern', tier: 'shubha', occasions: [...N, 'dinner-party'], line: 'A fine gold arch draws itself under an eight-point star, on a clean and modern page.', alt: 'a fine gold arch under an eight-point star on ivory' },
  { slug: 'amalfi', cat: 'cards', faith: 'christian', religions: ['buddhist', 'kirat', 'christian', 'other'], name: 'Amalfi', style: 'destination', tier: 'shahi', occasions: [...W, 'birthday'], line: 'A lemon-branch postcard from the Amalfi Coast turns over for a weekend by the sea.', alt: 'a postcard of lemon branches above the Amalfi Coast' },
  { slug: 'garden-party', cat: 'flowers', faith: 'christian', religions: ['buddhist', 'kirat', 'muslim', 'christian', 'other'], name: 'Garden Party', style: 'garden', tier: 'shubha', occasions: [...W, 'bridal-shower', 'birthday', 'dinner-party'], line: 'A garden ceremony under a rose arbor. The invitation slides out of its paper band.', alt: 'a rose arbor and white chairs on a summer lawn' },
  { slug: 'wildflower', cat: 'flowers', faith: 'christian', religions: ['buddhist', 'kirat', 'muslim', 'christian', 'other'], name: 'Wildflower', style: 'romantic', tier: 'shubha', occasions: [...W, 'bridal-shower', 'baby-shower', 'birthday'], line: 'A summer meadow of pink and peach wildflowers grows up the page, with butterflies.', alt: 'a summer meadow of pink and peach wildflowers' },
  { slug: 'letterpress', cat: 'cards', faith: 'christian', religions: ['buddhist', 'kirat', 'muslim', 'christian', 'other'], name: 'Letterpress', style: 'classic', tier: 'saral', occasions: [...W, 'graduation', 'dinner-party'], line: 'A deckled cotton card lifts off sage linen and turns over. Simple and timeless.', alt: 'a deckled cotton card on sage linen' },
  { slug: 'wax-seal', cat: 'cards', faith: 'christian', religions: ['buddhist', 'kirat', 'muslim', 'christian', 'other'], name: 'Wax Seal', style: 'modern', tier: 'saral', occasions: [...W, 'birthday', 'graduation', 'housewarming'], line: 'Guests break a sage wax seal and the letter rises out of the envelope.', alt: 'a white envelope closed with a sage wax seal' },
  { slug: 'tuscany', cat: 'cards', faith: 'christian', religions: ['buddhist', 'kirat', 'christian', 'other'], name: 'Tuscany', style: 'destination', tier: 'shubha', occasions: [...W, 'dinner-party'], line: 'Golden hour over the vineyard hills, with an invitation dressed like a wine label.', alt: 'vineyard hills in Tuscany at golden hour' },
  { slug: 'noor', cat: 'doors', faith: 'muslim', religions: ['muslim'], name: 'Noor', style: 'romantic', tier: 'shahi', occasions: N, line: 'A sage arch hung with fresh roses glows open on your names.', alt: 'a sage arch framed with fresh roses' },
  { slug: 'jali', cat: 'doors', faith: 'muslim', religions: ['muslim'], name: 'Jali', style: 'classic', tier: 'saral', occasions: N, line: 'Carved emerald and gold lattice screens slide apart under hanging lanterns.', alt: 'carved emerald and gold lattice screens under lanterns' },
  { slug: 'andalus', cat: 'doors', faith: 'muslim', religions: ['muslim'], name: 'Andalus', style: 'destination', tier: 'shahi', occasions: N, line: 'Through a horseshoe arch into a tiled courtyard with a fountain and orange trees.', alt: 'a tiled courtyard with a fountain and orange trees through an arch' },
].map((d) => ({ ...d, id: d.slug, mini: `/site/thumbs/${d.slug}-480.webp`, art: false }));
/** The international designs the Nepal site's rows show after its own (the home rail, landing rows); every one of
 *  them is in its designs page, pricing tiers and order form. */
export const INTL_PICKS = ['olive-grove', 'rose-arch', 'noor', 'blush-roses', 'gold-arch', 'wildflower'];
/** An international design as a Nepal-site design ({ slug, name, ne, cat, concept, alt, religions, tier, thumb, intl }). */
export const intlAsNp = (d) => ({
  slug: d.slug, name: d.name, ne: '', cat: d.cat || 'cards', concept: d.line, alt: d.alt,
  religions: d.religions || [d.faith || 'christian'], tier: d.tier, thumb: d.mini, intl: true,
});
export const INTL_BY_SLUG = Object.fromEntries(INTL_THEMES.map((d) => [d.slug, d]));
/** a design's page: the international ones have their own under /international/designs/, the Nepal ones /designs/;
 *  a design new to the catalog and without a page yet opens its watermarked showcase */
export const designPage = (slug) => (INTL_BY_SLUG[slug] ? `/international/designs/${slug}/` : BY_SLUG[slug] ? `/designs/${slug}/` : `/${slug}/?showcase=1`);

const TIERS = ['saral', 'shubha', 'shahi'];
const isIntl = (m) => m === 'intl' || m === 'both' || (Array.isArray(m) && m.includes('intl')); // GET /api/themes: market 'np' | 'intl' | 'both'
const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/;
const text = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max) : '');
const localPath = (v) => (typeof v === 'string' && /^\/(?!\/)[A-Za-z0-9/_.-]{1,200}$/.test(v) ? v : '');

/**
 * The international designs: the themes from GET /api/themes tagged for the international market, as
 * { slug, name, style, tier, mini, line, alt, art: false }; INTL_THEMES while there are none (the API is down).
 */
export function intlCatalog(apiThemes) {
  // every design is shown here; the international ones come first, then the Nepal ones (style "Nepali")
  const all = (Array.isArray(apiThemes) ? apiThemes : []).filter((t) => t && typeof t === 'object' && SLUG_RE.test(t.slug));
  const ordered = [...all.filter((t) => isIntl(t.market)), ...all.filter((t) => !isIntl(t.market))];
  const live = ordered.map((t) => {
    const name = text(t.name, 60) || t.slug;
    return {
      slug: t.slug, id: t.slug, name,
      style: !isIntl(t.market) ? 'nepali' : STYLE_LABEL[t.style] ? t.style : 'classic',
      tier: TIERS.includes(t.tier) ? t.tier : 'shubha',
      // our own plain words and still for a known design (the catalog's concept can name religious symbols)
      mini: INTL_BY_SLUG[t.slug]?.mini || localPath(t.thumb) || `/themes/${t.slug}/thumb.jpg`,
      line: INTL_BY_SLUG[t.slug]?.line || text(t.concept, 160), alt: INTL_BY_SLUG[t.slug]?.alt || text(t.concept, 160) || `${name} design`, art: false,
    };
  });
  return live.length ? live : INTL_THEMES;
}
