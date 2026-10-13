// Theme slot manifests + the shared vocabulary, for the studio (THEME-CONTRACT §9–10).
import { SHARED_SLOTS } from '../core/slot-vocab.js';

export const VOCAB = SHARED_SLOTS;
const loaders = import.meta.glob('../themes/*/slots.js');
const cache = new Map();

/** The manifest of one theme, or null while the theme has not published one. */
export async function loadManifest(theme) {
  const load = loaders[`../themes/${theme}/slots.js`];
  if (!load) return null;
  if (!cache.has(theme)) cache.set(theme, load().then((m) => m.default || m).catch(() => null));
  return cache.get(theme);
}

export async function loadAll(themes) {
  const out = {};
  await Promise.all(themes.map(async (t) => { out[t.slug] = await loadManifest(t.slug); }));
  return out;
}

/** A manifest entry's shared key, when it is a real vocabulary key of that kind. */
export const sharedKey = (spec, kind) => (spec?.shared && Object.hasOwn(VOCAB[kind], spec.shared) ? spec.shared : null);

/** Smallest max any theme allows for a shared text key (it must fit everywhere it appears). */
export function sharedTextMax(all, key, fallback = 200) {
  let max = Infinity;
  for (const m of Object.values(all)) for (const s of Object.values(m?.texts || {})) if (s.shared === key && Number.isInteger(s.max)) max = Math.min(max, s.max);
  return Number.isFinite(max) ? max : fallback;
}

/** Theme slugs whose manifests show a shared key. */
export const themesUsing = (all, kind, key) => Object.entries(all).filter(([, m]) => Object.values(m?.[kind] || {}).some((s) => s.shared === key)).map(([t]) => t);
