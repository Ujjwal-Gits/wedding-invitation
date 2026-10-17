// Escaping, bilingual markup, venue-time dates and the language switch.
import * as NepaliDateModule from 'nepali-date-converter';
import { DEFAULT_TZ, isTimeZone, wallParts, zoneLabel } from './tz.js';

// Times show as wall-clock times at the venue (src/core/tz.js). The page sets the zone from the invitation's
// `timeZone` when it loads (src/core/data.js); absent = Nepal, exactly as before time zones existed.
let TZ = DEFAULT_TZ;
export const setTimeZone = (z) => { TZ = isTimeZone(z) ? z : DEFAULT_TZ; };
/** The venue's IANA zone, for a theme's own Intl.DateTimeFormat({ timeZone }). */
export const timeZone = () => TZ;
const NepaliDate = NepaliDateModule.default?.default || NepaliDateModule.default;

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const filled = (s) => (s == null ? '' : String(s)).trim() !== '';
const DEVA = /[ऀ-ॿ]/;
/**
 * The two sides of a bilingual text, each falling back to the other when it is empty: a name typed only in
 * English shows in the नेपाली view too, and Nepali typed alone shows in the English view (in a Devanagari face).
 */
export const pair = (v) => {
  const o = typeof v === 'string' ? { en: v } : v ?? {};
  const en = filled(o.en) ? String(o.en) : filled(o.ne) ? String(o.ne) : '';
  const ne = filled(o.ne) ? String(o.ne) : en;
  return { en, ne };
};

/** Bilingual inline text. Accepts {en, ne} or a plain string. */
export const bi = (v) => {
  const p = pair(v);
  return `<span class="l-en"${DEVA.test(p.en) && !/[A-Za-z]/.test(p.en) ? ' lang="ne"' : ''}>${esc(p.en)}</span><span class="l-ne" lang="ne">${esc(p.ne)}</span>`;
};

/** Same as bi() but builds DOM nodes, for text that came from a guest or URL. */
export const biNodes = (en, ne) => {
  const p = pair({ en, ne });
  return [
    Object.assign(document.createElement('span'), { className: 'l-en', textContent: p.en }),
    Object.assign(document.createElement('span'), { className: 'l-ne', lang: 'ne', textContent: p.ne }),
  ];
};

// Nepali is formatted by hand: not every browser ships ne-NP locale data.
const NE_DIGITS = '०१२३४५६७८९';
export const neNum = (n) => String(n).replace(/\d/g, (d) => NE_DIGITS[d]);
const NE_MONTHS = ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'];
const NE_DAYS = ['आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
const npt = (iso, tz = TZ) => wallParts(new Date(iso).getTime(), tz);
/** Wall-clock parts at the venue: { y, m (0-11), day, wd (0 = Sunday), h, min }. */
export const venueParts = (iso) => npt(iso);
const nePeriod = (h) => (h < 4 ? 'राति' : h < 12 ? 'बिहान' : h < 16 ? 'दिउँसो' : h < 19 ? 'बेलुका' : 'राति');
const fmt = (iso, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts }).format(new Date(iso));

export const dateOf = (iso) => {
  const p = npt(iso);
  return {
    en: fmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    ne: `${NE_DAYS[p.wd]}, ${NE_MONTHS[p.m]} ${neNum(p.day)}, ${neNum(p.y)}`,
  };
};
/**
 * Bikram Sambat date of an ISO date-time (on the venue's calendar day; `tz` for the server, which has no page zone), e.g.
 * { en: 'Friday, 29 Magh 2083 B.S.', ne: 'वि.सं. २०८३ माघ २९ गते, शुक्रबार', short: { en: '29 Magh 2083', ne: 'माघ २९, २०८३' } }.
 * An event's own `dateBS` ({en, ne}) always wins, so a family can match their priest's patro exactly.
 */
export const bsDateOf = (iso, override, tz) => {
  if (override && (override.en || override.ne)) return { ...override, short: override };
  const p = npt(iso, isTimeZone(tz) ? tz : TZ);
  const n = new NepaliDate(new Date(p.y, p.m, p.day, 12));
  return {
    en: `${n.format('ddd')}, ${Number(n.format('D'))} ${n.format('MMMM')} ${n.format('YYYY')} B.S.`,
    ne: `वि.सं. ${n.format('YYYY', 'np')} ${n.format('MMMM', 'np')} ${n.format('D', 'np')} गते, ${n.format('ddd', 'np')}`,
    short: { en: `${Number(n.format('D'))} ${n.format('MMMM')} ${n.format('YYYY')}`, ne: `${n.format('MMMM', 'np')} ${n.format('D', 'np')}, ${n.format('YYYY', 'np')}` },
  };
};

export const shortDate = (iso) => {
  const p = npt(iso);
  return { en: fmt(iso, { day: 'numeric', month: 'short' }), ne: `${NE_MONTHS[p.m]} ${neNum(p.day)}` };
};
export const dayNum = (iso) => { const p = npt(iso); return { en: String(p.day).padStart(2, '0'), ne: neNum(String(p.day).padStart(2, '0')) }; };
const clock = (iso) => {
  const p = npt(iso);
  const h12 = p.h % 12 || 12;
  return {
    en: fmt(iso, { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', ' '),
    ne: `${nePeriod(p.h)} ${neNum(h12)}:${neNum(String(p.min).padStart(2, '0'))} बजे`,
  };
};
/** The zone's short name after a time ("3:00 pm CDT"); nothing for Nepal, so Nepali invitations read as before. */
const tagged = (t, iso) => {
  const z = zoneLabel(iso, TZ);
  return z ? { en: `${t.en} ${z}`, ne: `${t.ne} (${z})` } : t;
};
export const zoneTag = (iso) => zoneLabel(iso, TZ);
export const timeOf = (iso) => tagged(clock(iso), iso);
export const timeRange = (a, b) => tagged({ en: `${clock(a).en} – ${clock(b).en}`, ne: `${clock(a).ne} – ${clock(b).ne}` }, a);
/**
 * When an event happens, for display: "11:00 AM onwards" when the event has no fixed end
 * (event.openEnded, set in the studio), otherwise the start–end range.
 */
export const timeLabel = (e) => (e?.openEnded || !e?.end
  ? (({ en, ne }, z) => ({ en: `${en}${z ? ` ${z}` : ''} onwards`, ne: `${ne}देखि${z ? ` (${z})` : ''}` }))(clock(e.start), zoneLabel(e.start, TZ))
  : timeRange(e.start, e.end));

export const mapUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

const LANG_KEY = 'sayapatri-lang';
export function initLang(button) {
  const set = (lang) => {
    document.documentElement.dataset.lang = lang;
    document.documentElement.lang = lang === 'ne' ? 'ne' : 'en';
    button?.setAttribute('aria-pressed', String(lang === 'ne'));
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* private mode */ }
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  };
  const url = new URLSearchParams(location.search).get('lang');
  let saved = null;
  try { saved = localStorage.getItem(LANG_KEY); } catch { /* ignore */ }
  set(url === 'ne' || url === 'en' ? url : saved || 'en');
  button?.addEventListener('click', () => set(document.documentElement.dataset.lang === 'ne' ? 'en' : 'ne'));
}
