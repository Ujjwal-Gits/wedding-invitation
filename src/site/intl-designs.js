// The international site's designs: ONE data source for the build (src/site/intl.mjs: the gallery, the designs page,
// JSON-LD) and the browser (src/site/intl.js, the order form). Plain module.
//
// Today the gallery shows the artwork designs below (phone screens in public/site/intl/<id>-<V>-<w>.webp). Once
// themes tagged for the international market come from GET /api/themes (`market: 'intl'`, or a list containing
// 'intl', with an optional `style`), intlCatalog() uses those instead and the page swaps its cards at load.
// To switch for good, replace ARTWORK with the real themes and the build shows them too.
//
// NP_DESIGNS_INTL: the Nepal designs the international site's Nepali and South Asian wedding pages show and offer in
// their order form (no religious images on the international site).
export const NP_DESIGNS_INTL = ['laali', 'mahal', 'swayambar', 'dhaka', 'hariyo', 'mehendi', 'kham', 'gurans', 'sindoor', 'rangoli'];

export const STYLES = [['garden', 'Garden'], ['romantic', 'Romantic'], ['classic', 'Classic'], ['modern', 'Modern'], ['destination', 'Destination']];
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

const TIERS = ['saral', 'shubha', 'shahi'];
const isIntl = (m) => m === 'intl' || m === 'both' || (Array.isArray(m) && m.includes('intl')); // GET /api/themes: market 'np' | 'intl' | 'both'
const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/;
const text = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max) : '');
const localPath = (v) => (typeof v === 'string' && /^\/(?!\/)[A-Za-z0-9/_.-]{1,200}$/.test(v) ? v : '');

/**
 * The international designs: the themes from GET /api/themes tagged for the international market, as
 * { slug, name, style, tier, mini, line, alt, art: false }; the artwork designs while there are none.
 */
export function intlCatalog(apiThemes) {
  const live = (Array.isArray(apiThemes) ? apiThemes : []).filter((t) => t && typeof t === 'object' && SLUG_RE.test(t.slug) && isIntl(t.market)).map((t) => {
    const name = text(t.name, 60) || t.slug;
    return {
      slug: t.slug, id: t.slug, name,
      style: STYLE_LABEL[t.style] ? t.style : 'classic',
      tier: TIERS.includes(t.tier) ? t.tier : 'shubha',
      mini: localPath(t.thumb) || `/themes/${t.slug}/thumb.jpg`,
      line: text(t.concept, 160), alt: text(t.concept, 160) || `${name} design`, art: false,
    };
  });
  return live.length ? live : ARTWORK;
}
