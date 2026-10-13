// Theme slots: every image and every piece of text a theme shows that is not
// already part of the invitation data (names, dates, events…) is declared in
// the theme's `src/themes/<slug>/slots.js` manifest and read through here, so
// the studio can replace any of it per invitation.
//
// Manifest shape (plain data, no imports, so the server can load it too):
//   export default {
//     theme: 'dhoka',
//     images: {
//       'gate.door':  { label: 'Entrance door', kind: 'scene',  default: 'door-golden', note: 'Portrait, door centred' },
//       'hero.photo': { label: 'Hero photo',    kind: 'couple', default: { portrait: 0 } },
//       'bride.photo':{ label: 'Bride',         kind: 'bride',  default: { portrait: 1 } },
//     },
//     texts: {
//       'gate.line': { label: 'Line under the names', default: { en: '…', ne: '…' }, max: 90, multiline: false },
//     },
//   };
//
// kind: 'couple' | 'bride' | 'groom' | 'scene' | 'detail'.
//   couple/bride/groom slots fall back to the couple's own uploaded photos, never to library people.
// default: a library slug, an uploaded photo object, or { portrait: n } (the couple's n-th photo).
//
// Overrides live in the invitation data: config.themeContent[theme] = { images: { id: ref }, texts: { id: { en, ne } } }.
import { config } from '../config.js';

const portrait = (n) => {
  const list = config.couple?.portraits || [];
  return list[n]?.photo ?? list[n % Math.max(list.length, 1)]?.photo ?? null;
};

/** Resolve a manifest default (or override) to a photo reference. */
function resolveImage(def, kind) {
  if (def && typeof def === 'object' && 'portrait' in def) return portrait(def.portrait);
  if (def) return def;
  if (kind === 'bride') return config.couple?.bride?.photo ?? portrait(0);
  if (kind === 'groom') return config.couple?.groom?.photo ?? portrait(0);
  if (kind === 'couple') return portrait(0);
  return null;
}

// Shared content travels between themes: a manifest entry with `shared: '<key>'`
// reads config.content.images[key] / config.content.texts[key] when the theme has
// no override of its own. Couple photos always live in config.couple.portraits.
export function useSlots(manifest) {
  const over = config.themeContent?.[manifest.theme] || {};
  const shared = config.content || {};
  const img = (id) => {
    const spec = manifest.images?.[id];
    if (!spec) console.warn(`[slots] unknown image slot "${id}" in ${manifest.theme}`);
    const o = over.images?.[id] ?? (spec?.shared ? shared.images?.[spec.shared] : undefined);
    if (o) return resolveImage(o, spec?.kind);
    // Bride/groom slots prefer the couple's dedicated uploads over the manifest default.
    if (spec?.kind === 'bride' && config.couple?.bride?.photo) return config.couple.bride.photo;
    if (spec?.kind === 'groom' && config.couple?.groom?.photo) return config.couple.groom.photo;
    return resolveImage(spec?.default, spec?.kind);
  };
  const txt = (id) => {
    const spec = manifest.texts?.[id];
    if (!spec) console.warn(`[slots] unknown text slot "${id}" in ${manifest.theme}`);
    const o = over.texts?.[id] || (spec?.shared ? shared.texts?.[spec.shared] : null) || {};
    const d = spec?.default || {};
    return { en: o.en || d.en || '', ne: o.ne || d.ne || o.en || d.en || '' };
  };
  /** Alt text for an image slot: the override's alt, else the manifest label. */
  const alt = (id) => {
    const spec = manifest.images?.[id];
    const o = over.images?.[id] ?? (spec?.shared ? shared.images?.[spec.shared] : undefined);
    return (o && typeof o === 'object' && o.alt) || manifest.images?.[id]?.alt || manifest.images?.[id]?.label || '';
  };
  return { img, txt, alt };
}
