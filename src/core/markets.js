// Design metadata the website, the studio and the server share: which market a design is sold in, its style and the
// occasions it reads naturally for. Plain data, no imports (the server loads it).
//
//   market:    'np'   — the Nepal site (bilingual, B.S. dates, Nepali wedding culture)
//              'intl' — the international site (English, faith-neutral, any venue time zone)
//              'both' — listed on both
//   style:     'garden' | 'romantic' | 'classic' | 'modern' | 'destination' (international filter chips; '' = none)
//   occasions: ids from OCCASIONS below, the first is the main one
//   faith:     'christian' | 'muslim' | '' (international designs made for a community; the symbols follow src/core/faith.js)
//
// A design's own manifest (src/themes/<slug>/slots.js) may declare `market`, `style` and `occasions`; the catalog
// (server/lib/catalog.js) fills in the rest, and every design without any is a Nepal wedding design.

export const MARKETS = ['np', 'intl', 'both'];
export const STYLES = ['garden', 'romantic', 'classic', 'modern', 'destination'];
/** The community a design is made for, so the admin can feature it per site (never shown to guests as a label). '' = none. */
export const FAITHS = ['christian', 'muslim'];

/** Every occasion an invitation can be for. `couple`: the page shows two names (bride and groom, or a pair). */
export const OCCASIONS = {
  wedding: { en: 'Wedding', couple: true },
  engagement: { en: 'Engagement party', couple: true },
  anniversary: { en: 'Anniversary', couple: true },
  'vow-renewal': { en: 'Vow renewal', couple: true },
  'rehearsal-dinner': { en: 'Rehearsal dinner', couple: true },
  'bridal-shower': { en: 'Bridal shower', couple: false },
  'baby-shower': { en: 'Baby shower', couple: false },
  birthday: { en: 'Birthday', couple: false },
  graduation: { en: 'Graduation', couple: false },
  housewarming: { en: 'Housewarming', couple: false },
  'dinner-party': { en: 'Dinner party', couple: false },
  // the Nepal site's family occasions (custom designs today)
  bratabandha: { en: 'Bratabandha', couple: false },
  pasni: { en: 'Pasni', couple: false },
  'gunyu-cholo': { en: 'Gunyu Cholo', couple: false },
};
export const OCCASION_IDS = Object.keys(OCCASIONS);
export const isOccasion = (v) => typeof v === 'string' && Object.hasOwn(OCCASIONS, v);
/** True when the occasion is about two people (two names on the page). Unknown or absent = a wedding. */
export const isCoupleOccasion = (v) => !isOccasion(v) || OCCASIONS[v].couple;

/** Does a design with this market show on that site? ('both' shows on both.) */
export const inMarket = (designMarket, market) => designMarket === 'both' || designMarket === market;
