// Fixed lists the studio and the validator share: themes, bundled music, library photos.
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT_DIR, DIST_DIR } from './env.js';
import { config as demo } from '../../src/config.js';
import { BUILTIN_MUSIC } from '../../src/core/music-library.js';
import { MARKETS, STYLES, FAITHS, isOccasion } from '../../src/core/markets.js';

// Themes are discovered on disk: every src/themes/<slug>/slots.js (plus the original eight).
// A theme is "ready" once its page exists (<slug>/index.html in dev, dist/<slug>/index.html built).
const KNOWN = {
  dhoka: { name: 'Dhoka', concept: 'A printed ivory card with a golden door that opens' },
  ghar: { name: 'Ghar', concept: 'A lamplit evening walk through a Newar house' },
  sayapatri: { name: 'Sayapatri', concept: 'A marigold-hung doorway opening on a calm ivory invitation' },
  chitra: { name: 'Chitra', concept: 'An illustrated storybook in Mithila colours' },
  mandap: { name: 'Mandap', concept: 'A floral 3D mandap; garland exchange and seven rounds' },
  bagaicha: { name: 'Bagaicha', concept: '3D garden wedding: rose arch and seven rounds of the fire' },
  dhaka: { name: 'Dhaka', concept: 'Seal breaks, Dhaka band slides off, couple rise into flowers' },
  himal: { name: 'Himal', concept: 'Calm and photo-led, at mountain dawn' },
  kham: { name: 'Kham', concept: 'Handmade-paper envelope that unfolds into a clear programme' },
  durbar: { name: 'Durbar', concept: 'A 3D morning walk through Bhaktapur Durbar Square' },
  mala: { name: 'Mala', concept: 'A dressed mandap: silk drapes, marigold strings, brass kalash' },
  nimantrana: { name: 'Nimantrana', concept: 'A traditional tri-fold card that unfolds: Ganesh, the couple, the programme' },
  mangal: { name: 'Mangal', concept: 'A red temple doorway with garlands and bells; doors open on शुभ विवाह' },
  gurans: { name: 'Phoolbari', concept: 'A flower gate with शुभ विवाह, then calm normal scrolling' },
  jhyal: { name: 'Jhyal', concept: 'A carved Newari window; lattice shutters swing open on शुभ विवाह' },
  mahal: { name: 'Mahal', concept: 'A golden palace gate tied with a satin bow; it opens onto a palace balcony at night' },
  laali: { name: 'Laali', concept: 'A blush pink and gold arched card under hanging lanterns' },
  mehendi: { name: 'Mehendi', concept: 'Henna on ivory; a mandala draws itself and joined hands glide in' },
  hariyo: { name: 'Hariyo', concept: 'A watercolour garden; the leaves part on a white pavilion and peacocks' },
  shree: { name: 'Shree', concept: 'Plum and gold; a lotus opens on Ganesh and hanging diyas descend' },
  pardaa: { name: 'Pardaa', concept: 'Red velvet curtains part on a dressed mandap with a living fire' },
  rajdwar: { name: 'Rajdwar', concept: 'A painted gold palace gate tied with a satin bow; it opens onto the red-and-gold Mangal card' },
  agni: { name: 'Agni', concept: 'The sacred fire at night; the couple walk the seven rounds and the vows appear' },
  janti: { name: 'Janti', concept: 'The wedding procession with the Naumati Baja and the doli through an old Newari street' },
  swayambar: { name: 'Swayambar', concept: 'Fresh garlands part on the jaimala; the bride’s and groom’s sides come together' },
  sindoor: { name: 'Sindoor', concept: 'Minimal red, white and black; the sindoor box opens and a red parting line runs through the story' },
  rangoli: { name: 'Rangoli', concept: 'A flower rangoli on a courtyard brick floor, ringed by diyos with living flames' },
  kalapi: { name: 'Kalapi', concept: 'A peacock fans its tail; then walk sideways along a painted pichwai cloth of the monsoon' },
  shagun: { name: 'Shagun', concept: 'A brass shagun thali on a banana leaf turns as you scroll; each offering opens a part of the wedding' },
  sandesh: { name: 'Sandesh', concept: 'Doves bring a lac-sealed letter to a morning rooftop, then deliver each event as a hand-stamped postcard' },
  vasant: { name: 'Vasant', concept: 'Butterflies lift off a fresh flower garland; each ceremony’s own flower opens as you scroll' },
  toran: { name: 'Toran', concept: 'Part the marigold strings, then walk deeper through seven dressed doorways to the mandap' },
  sanjhi: { name: 'Sanjhi', concept: 'A hand-cut paper pop-up book at dusk: a stencil fills with colour, then every page stands up in layers' },
  // International (English-first; nine for Christian, four for Muslim weddings; src/themes/_vow engine)
  'olive-grove': { name: 'Olive Grove', concept: 'A folded linen card opens and a watercolor olive wreath grows around your names' },
  'rose-arch': { name: 'Rose Arch', concept: 'Walk through a stone arch of climbing garden roses into the green beyond' },
  'blush-roses': { name: 'Blush Roses', concept: 'A gold frame draws itself while blush garden roses bloom in the corners' },
  'gold-arch': { name: 'Gold Arch', concept: 'A fine gold mihrab arch draws itself under an eight-point star; a modern editorial page' },
  amalfi: { name: 'Amalfi', concept: 'A lemon-branch postcard from the Amalfi Coast turns over for a weekend by the sea' },
  'garden-party': { name: 'Garden Party', concept: 'A garden ceremony under a rose arbor; the invitation slides out of its band' },
  wildflower: { name: 'Wildflower', concept: 'A summer meadow grows up the page, with butterflies' },
  letterpress: { name: 'Letterpress', concept: 'A deckled cotton card lifts off sage linen and turns over' },
  'wax-seal': { name: 'Wax Seal', concept: 'Break the sage wax seal and the letter rises out of the envelope into a collection of notes' },
  tuscany: { name: 'Tuscany', concept: 'Golden hour over the vineyard hills; a wine-label invitation' },
  noor: { name: 'Noor', concept: 'A sage mihrab arch with fresh roses; the arch glows open on the Bismillah and your names' },
  jali: { name: 'Jali', concept: 'Carved emerald-and-gold lattice screens slide apart under hanging lanterns' },
  andalus: { name: 'Andalus', concept: 'Through a horseshoe arch into a tiled courtyard with a fountain and orange trees' },
  // Both sites (bilingual in Nepal, English abroad; no religious image)
  sarovar: { name: 'Sarovar', concept: 'A lotus lake at dawn: a bud opens, two swans meet, and you glide across living water to a marble pavilion' },
  mohar: { name: 'Mohar', concept: 'Press the brass seal into red lac; the folded decree unfolds in 3D, page by page' },
  // both sites (Nepal and international)
  kalpataru: { name: 'Kalpataru', concept: 'A leaf turns over on your names, then you climb a great painted tree from its roots to its crown' },
  zari: { name: 'Zari', concept: 'A sapphire velvet trousseau trunk unlocks and its gold-thread trays lift out one by one' },
};
// Market, style and occasions (src/core/markets.js). Absent = a Nepal wedding design. A manifest may override them.
const INTL_WEDDING = ['wedding', 'engagement', 'anniversary', 'vow-renewal', 'rehearsal-dinner'];
const C = 'christian'; const M = 'muslim';
const NIKAH = ['wedding', 'engagement', 'anniversary'];
const META = {
  // nine for Christian weddings
  'olive-grove': { market: 'intl', style: 'garden', faith: C, occasions: [...INTL_WEDDING, 'bridal-shower', 'dinner-party'] },
  'rose-arch': { market: 'intl', style: 'romantic', faith: C, occasions: INTL_WEDDING },
  'blush-roses': { market: 'intl', style: 'classic', faith: C, occasions: [...INTL_WEDDING, 'bridal-shower', 'baby-shower'] },
  letterpress: { market: 'intl', style: 'classic', faith: C, occasions: [...INTL_WEDDING, 'graduation', 'dinner-party'] },
  'wax-seal': { market: 'intl', style: 'modern', faith: C, occasions: [...INTL_WEDDING, 'birthday', 'graduation', 'housewarming'] },
  'garden-party': { market: 'intl', style: 'garden', faith: C, occasions: [...INTL_WEDDING, 'bridal-shower', 'birthday', 'dinner-party'] },
  wildflower: { market: 'intl', style: 'romantic', faith: C, occasions: [...INTL_WEDDING, 'bridal-shower', 'baby-shower', 'birthday'] },
  tuscany: { market: 'intl', style: 'destination', faith: C, occasions: [...INTL_WEDDING, 'dinner-party'] },
  amalfi: { market: 'intl', style: 'destination', faith: C, occasions: [...INTL_WEDDING, 'birthday'] },
  // four for Muslim weddings (Nikah, Walima, Mehndi)
  'gold-arch': { market: 'intl', style: 'modern', faith: M, occasions: [...NIKAH, 'dinner-party'] },
  noor: { market: 'intl', style: 'romantic', faith: M, occasions: NIKAH },
  jali: { market: 'intl', style: 'classic', faith: M, occasions: NIKAH },
  andalus: { market: 'intl', style: 'destination', faith: M, occasions: NIKAH },
  // on both sites
  sarovar: { market: 'both', style: 'romantic', faith: '', occasions: ['wedding'] },
  // both sites: neutral art (a seal, parchment, an indigo cloth), English and Nepali
  mohar: { market: 'both', style: 'classic', faith: '', occasions: ['wedding', 'engagement', 'anniversary', 'vow-renewal'] },
  // both sites: a painted tree with birds; the Hindu shrine at its roots shows only on Hindu invitations
  kalpataru: { market: 'both', style: 'garden', faith: '', occasions: ['wedding', 'engagement', 'anniversary', 'vow-renewal'] },
  // on both sites (neutral art: doves, a rooftop, roses, postage stamps)
  sandesh: { market: 'both', style: 'romantic', faith: '', occasions: ['wedding', 'engagement', 'anniversary', 'vow-renewal'] },
  // sold on both sites (botanical plates and butterflies, no religious marks)
  vasant: { market: 'both', style: 'garden', faith: '', occasions: ['wedding', 'engagement', 'anniversary', 'vow-renewal'] },
  // both websites (a Nepali design with no religious art)
  zari: { market: 'both', style: 'classic', faith: '', occasions: ['wedding', 'engagement', 'anniversary'] },
};
const NP_META = { market: 'np', style: '', faith: '', occasions: ['wedding'] };
/** { market, style, faith, occasions } of a design, from the catalog (a manifest's own values win in metaOf). */
export const catalogMeta = (slug) => { const m = { ...NP_META, ...(META[slug] || {}) }; return { ...m, occasions: [...m.occasions] }; };
/** The catalog's metadata merged with a theme manifest's own `market`, `style` and `occasions` (when valid). */
export function metaOf(slug, manifest) {
  const base = catalogMeta(slug);
  const market = MARKETS.includes(manifest?.market) ? manifest.market : base.market;
  const style = STYLES.includes(manifest?.style) ? manifest.style : base.style;
  const faith = FAITHS.includes(manifest?.faith) ? manifest.faith : base.faith;
  const occ = Array.isArray(manifest?.occasions) ? manifest.occasions.filter(isOccasion) : [];
  return { market, style, faith, occasions: occ.length ? [...new Set(occ)] : [...base.occasions] };
}
const THEME_RE = /^[a-z][a-z0-9-]{1,30}$/;

// Design tiers: the cheapest plan that includes the design (the planner can override them in the site settings).
export const TIERS = ['saral', 'shubha', 'shahi'];
const DEFAULT_TIERS = {
  // Canva-painted designs
  mahal: 'shahi', rajdwar: 'shahi', laali: 'shahi', mehendi: 'shahi', hariyo: 'shahi', shree: 'shahi',
  pardaa: 'shahi', agni: 'shahi', janti: 'shahi', swayambar: 'shahi', sindoor: 'shahi', rangoli: 'shahi',
  kalapi: 'shahi',
  shagun: 'shahi',
  sandesh: 'shahi',
  vasant: 'shahi',
  toran: 'shahi',
  sanjhi: 'shahi',
  // 3D, film and the richer cards
  bagaicha: 'shubha', durbar: 'shubha', mandap: 'shubha', ghar: 'shubha', dhoka: 'shubha', himal: 'shubha', mangal: 'shubha', nimantrana: 'shubha',
  // the simple, calm cards
  kham: 'saral', mala: 'saral', gurans: 'saral', sayapatri: 'saral', jhyal: 'saral', chitra: 'saral', dhaka: 'saral',
  // international: Standard / Pro / Pro Max
  'blush-roses': 'saral', letterpress: 'saral', 'wax-seal': 'saral', jali: 'saral',
  'olive-grove': 'shubha', 'gold-arch': 'shubha', 'garden-party': 'shubha', wildflower: 'shubha', tuscany: 'shubha',
  'rose-arch': 'shahi', amalfi: 'shahi', noor: 'shahi', andalus: 'shahi',
  sarovar: 'shahi',
  mohar: 'shahi',
  kalpataru: 'shahi',
  zari: 'shahi',
};
/** A theme's tier before any override (an unknown theme: shubha). */
export const defaultTier = (slug) => DEFAULT_TIERS[slug] || 'shubha';
const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
let themeCache = { at: 0, list: [] };

/** [{ slug, name, concept, ready, thumb, market, style, occasions }] in a stable order (the originals first). */
export function listThemes() {
  if (Date.now() - themeCache.at < 10_000) return themeCache.list;
  const dir = resolve(ROOT_DIR, 'src', 'themes');
  const found = new Set();
  if (existsSync(dir)) {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      if (d.isDirectory() && THEME_RE.test(d.name) && existsSync(resolve(dir, d.name, 'slots.js'))) found.add(d.name);
    }
  }
  for (const slug of Object.keys(KNOWN)) if (existsSync(resolve(ROOT_DIR, slug, 'index.html'))) found.add(slug);
  const order = Object.keys(KNOWN);
  const list = [...found]
    .sort((a, b) => ((order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99)) || a.localeCompare(b))
    .map((slug) => ({
      slug,
      name: KNOWN[slug]?.name || titleCase(slug),
      concept: KNOWN[slug]?.concept || '',
      ready: existsSync(resolve(ROOT_DIR, slug, 'index.html')) || existsSync(resolve(ROOT_DIR, 'dist', slug, 'index.html')),
      thumb: [resolve(ROOT_DIR, 'public', 'themes', slug, 'thumb.jpg'), resolve(ROOT_DIR, 'dist', 'themes', slug, 'thumb.jpg')].some(existsSync) ? `/themes/${slug}/thumb.jpg` : '', // dist only in production
      ...catalogMeta(slug),
    }));
  themeCache = { at: Date.now(), list };
  return list;
}
export const isTheme = (slug) => typeof slug === 'string' && listThemes().some((t) => t.slug === slug);

/** The bundled tracks (from the demo config): a new invitation's default song. */
export const BUNDLED_TRACKS = demo.music.tracks.map((t) => structuredClone(t));
/** Every song shipped in public/audio (the music library's built-ins): the only non-upload audio allowed. */
export const BUNDLED_SRCS = new Set([...BUNDLED_TRACKS.map((t) => t.src), ...BUILTIN_MUSIC.map((t) => t.src)]);

export const demoConfig = () => structuredClone(demo);

// Library photos = files public/photos/<slug>-lg.webp. Re-read at most once a minute (the photo agent adds more).
let libCache = { at: 0, set: new Set() };
export function librarySlugs() {
  if (Date.now() - libCache.at < 60_000) return libCache.set;
  // the built site (dist/photos) is what production has (the Docker image has no public/); public/ in development
  const set = new Set();
  for (const dir of [resolve(DIST_DIR, 'photos'), resolve(ROOT_DIR, 'public', 'photos')]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const m = /^([a-z0-9-]+)-lg\.webp$/.exec(f);
      if (m) set.add(m[1]);
    }
  }
  if (!set.size) console.warn('[catalog] no library photos found in dist/photos or public/photos');
  libCache = { at: Date.now(), set };
  return set;
}
