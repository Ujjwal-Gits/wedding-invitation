// Fixed lists the studio and the validator share: themes, bundled music, library photos.
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT_DIR } from './env.js';
import { config as demo } from '../../src/config.js';

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
};
const THEME_RE = /^[a-z][a-z0-9-]{1,30}$/;
const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
let themeCache = { at: 0, list: [] };

/** [{ slug, name, concept, ready, thumb }] in a stable order (the originals first). */
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
    }));
  themeCache = { at: Date.now(), list };
  return list;
}
export const isTheme = (slug) => typeof slug === 'string' && listThemes().some((t) => t.slug === slug);

/** The bundled tracks (from the demo config). Their src paths are the only non-upload audio allowed. */
export const BUNDLED_TRACKS = demo.music.tracks.map((t) => structuredClone(t));
export const BUNDLED_SRCS = new Set(BUNDLED_TRACKS.map((t) => t.src));

export const demoConfig = () => structuredClone(demo);

// Library photos = files public/photos/<slug>-lg.webp. Re-read at most once a minute (the photo agent adds more).
let libCache = { at: 0, set: new Set() };
export function librarySlugs() {
  if (Date.now() - libCache.at < 60_000) return libCache.set;
  const dir = resolve(ROOT_DIR, 'public', 'photos');
  const set = new Set();
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      const m = /^([a-z0-9-]+)-lg\.webp$/.exec(f);
      if (m) set.add(m[1]);
    }
  }
  libCache = { at: Date.now(), set };
  return set;
}
