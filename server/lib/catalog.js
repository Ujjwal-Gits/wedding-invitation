// Fixed lists the studio and the validator share: themes, bundled music, library photos.
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT_DIR } from './env.js';
import { config as demo } from '../../src/config.js';

export const THEMES = [
  { slug: 'dhoka', name: 'Dhoka', concept: 'Ivory Press: a printed-card editorial with a golden door that opens' },
  { slug: 'ghar', name: 'Ghar', concept: 'Lamplight Cinema: a dark film walk through a Newar house' },
  { slug: 'sayapatri', name: 'Sayapatri', concept: 'Haldi Daylight: a bright marigold journey with drifting petals' },
  { slug: 'chitra', name: 'Chitra', concept: 'Illustrated storybook with Mithila-inspired characters' },
  { slug: 'mandap', name: 'Mandap', concept: 'Night diorama: the mandap and seven rounds of the fire in 3D' },
  { slug: 'bagaicha', name: 'Bagaicha', concept: 'Garden venue in 3D: pavilion, waterfall and lanterns' },
  { slug: 'dhaka', name: 'Dhaka', concept: 'Dhaka Modern: kinetic type, woven pattern, photo collage' },
  { slug: 'himal', name: 'Himal', concept: 'Himalayan minimal luxury: calm, photo-led, mountain dawn' },
];
export const THEME_SLUGS = new Set(THEMES.map((t) => t.slug));

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
