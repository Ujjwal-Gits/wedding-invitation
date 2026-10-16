// Every third-party asset Nimtto ships, grouped for the credits pages (the studio's Credits view
// and the public /credits/ page). Invitations never show these; the data files stay the source.
import photos from '../generated/credits.json';
import { BUILTIN_MUSIC } from './music-library.js';
import { FLOWER_CREDITS as dhaka } from '../themes/dhaka/flowers.js';
import gurans from '../themes/gurans/flora-credits.js';
import mala from '../themes/mala/flora-credits.js';
import mangal from '../themes/mangal/flora-credits.js';
import jhyal from '../themes/jhyal/flora-credits.js';
import mahal from '../themes/mahal/flora-credits.js';
import rajdwar from '../themes/rajdwar/flora-credits.js';
import nimantrana from '../themes/nimantrana/flora-credits.json';
import sayapatri from '../themes/sayapatri/flora-credits.json';

/** A licence's deed URL from its short name ("CC BY-SA 4.0", "CC0 1.0"), when it has one. */
export function licenceUrl(name = '') {
  const s = String(name).trim();
  if (/^CC0\b/i.test(s)) return 'https://creativecommons.org/publicdomain/zero/1.0/';
  const m = /^CC (BY(?:-SA|-ND|-NC)*) (\d\.\d)$/i.exec(s);
  return m ? `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/` : '';
}

const https = (u) => (/^https:\/\//.test(u || '') ? u : u && /^[a-z0-9.-]+\.[a-z]{2,}\//i.test(u) ? `https://${u}` : '');
const item = ({ title, author, license, licenseUrl, sourceUrl, source }) => ({
  title: String(title || 'Untitled').trim(),
  author: String(author || '').trim(),
  license: String(license || '').trim(),
  licenseUrl: https(licenseUrl) || licenceUrl(license),
  sourceUrl: https(sourceUrl),
  source: String(source || '').trim(),
});

const photoItems = photos
  .map((p) => item({
    title: String(p.title || p.slot).replace(/\.(jpe?g|png|tiff?|webp)$/i, '').replace(/_/g, ' '),
    author: p.creator, license: p.license, licenseUrl: p.license_url, sourceUrl: p.source_url, source: p.source,
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

const THEME_FLORA = [
  ['Dhaka', dhaka.map((k) => ({ ...k, source_url: k.url }))],
  ['Gurans', gurans],
  ['Mala', mala],
  ['Mangal', mangal],
  ['Jhyal', jhyal],
  ['Mahal', mahal],
  ['Rajdwar', rajdwar],
  ['Nimantrana', nimantrana],
  ['Sayapatri', sayapatri],
];

/** One row per source file (the same rose is cut out for several themes), noting where it is used. */
function floraItems() {
  const bySource = new Map();
  for (const [theme, list] of THEME_FLORA) {
    for (const k of list) {
      if (!k.source_url) continue; // notes such as "marigolds are cut from a library photo"
      const key = k.source_url.replace(/[?#].*$/, '');
      const row = bySource.get(key) || { ...item({ title: k.title, author: k.creator, license: k.license, licenseUrl: k.license_url, sourceUrl: k.source_url }), usedIn: [] };
      if (!row.usedIn.includes(theme)) row.usedIn.push(theme);
      bySource.set(key, row);
    }
  }
  return [...bySource.values()].sort((a, b) => a.title.localeCompare(b.title));
}

/** The music library's built-in songs (src/core/music-library.js); the planner's uploads are added by the page. */
const musicItems = BUILTIN_MUSIC.filter((t) => t.credit)
  .map((t) => ({ ...item({ title: t.title, author: t.artist, license: t.license, licenseUrl: t.licenseUrl, sourceUrl: t.sourceUrl }), note: t.credit }));

/** A library song the planner uploaded (GET /api/music): its credit line is free text, shown as it is. */
export const uploadedMusicItem = (t) => ({ ...item({ title: t.title, author: t.artist, license: '' }), note: String(t.credit || '').trim() });

export const CREDIT_GROUPS = [
  { id: 'photos', title: 'Photos', items: photoItems },
  { id: 'flowers', title: 'Flowers & decor', items: floraItems() },
  { id: 'music', title: 'Music', items: musicItems },
];
