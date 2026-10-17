// The top-level areas of an invitation draft, used to describe a change in plain words
// ("The couple changed photos and wording"). Shared by the studio server (activity log)
// and the studio (live-update toasts), so both always name a change the same way.

/** [id, label] in display order. */
export const AREAS = [
  ['names', 'names'],
  ['photos', 'photos'],
  ['dates', 'dates & ceremonies'],
  ['wording', 'wording'],
  ['theme', 'theme'],
  ['music', 'music'],
  ['gallery', 'gallery'],
  ['rsvp', 'RSVP settings'],
  ['info', 'guest info'],
  ['other', 'other details'],
];
export const AREA_IDS = AREAS.map(([id]) => id);
const LABEL = Object.fromEntries(AREAS);

const KNOWN = new Set(['couple', 'hosts', 'weddingDate', 'weddingDateBS', 'city', 'events', 'invitation', 'story',
  'saptapadi', 'closing', 'content', 'themeContent', 'share', 'theme', 'design', 'music', 'gallery', 'rsvp', 'info', 'timeZone']);

const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o?.[k]]));
const omit = (o, keys) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !keys.includes(k)));
const perTheme = (tc, key) => Object.fromEntries(Object.entries(tc || {}).map(([t, v]) => [t, v?.[key]]));

/** One comparable string per area. */
function project(d = {}) {
  const c = d.couple || {};
  const other = Object.fromEntries(Object.entries(d).filter(([k]) => !KNOWN.has(k)));
  return {
    names: [omit(c, ['portraits', 'bride', 'groom']), omit(c.bride, ['photo']), omit(c.groom, ['photo']), d.hosts],
    photos: [c.portraits, c.bride?.photo, c.groom?.photo, (d.events || []).map((e) => e?.photo ?? null),
      d.content?.images, perTheme(d.themeContent, 'images')],
    dates: [pick(d, ['weddingDate', 'weddingDateBS', 'city', 'timeZone']), (d.events || []).map((e) => omit(e, ['photo']))],
    wording: [pick(d, ['invitation', 'story', 'saptapadi', 'closing', 'share']), d.content?.texts, perTheme(d.themeContent, 'texts')],
    theme: d.design ? [d.theme, d.design] : d.theme, // the gate and first screen (docs/MIX.md) are part of the design
    music: d.music,
    gallery: d.gallery,
    rsvp: d.rsvp,
    info: d.info,
    other,
  };
}

/** Area ids that differ between two drafts, in display order. */
export function changedAreas(before, after) {
  const a = project(before);
  const b = project(after);
  return AREA_IDS.filter((id) => JSON.stringify(a[id]) !== JSON.stringify(b[id]));
}

export const areaLabel = (id) => LABEL[id] || id;

/** ['photos', 'wording', 'theme'] -> "photos, wording and theme". */
export function areaList(ids = []) {
  const l = ids.map(areaLabel);
  return l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} and ${l.at(-1)}`;
}
