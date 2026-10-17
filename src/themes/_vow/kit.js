// Dates and times the American way, at the venue: "Saturday, June 12, 2027", "4:00 PM EDT". The venue's zone comes from
// the invitation (src/core/i18n.js timeZone(); set by data.js), so a Chicago wedding reads Chicago time for every guest.
import { timeZone, zoneTag } from '../../core/i18n.js';

const cache = new Map();
const fmt = (opts) => {
  const tz = timeZone();
  const k = `${tz}|${JSON.stringify(opts)}`;
  let f = cache.get(k);
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }); cache.set(k, f); }
  return f;
};
const ok = (iso) => Number.isFinite(Date.parse(iso || ''));
const partsOf = (iso, opts) => Object.fromEntries(fmt(opts).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));

/** "4:00 PM" (no zone). */
export const clock = (iso) => (ok(iso) ? fmt({ hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)) : '');

/** Every way a theme may print a date: { wd, wdShort, month, monthShort, day, day2, year, long, short, numeric, time, zone } */
export function dateParts(iso) {
  if (!ok(iso)) return { wd: '', wdShort: '', month: '', monthShort: '', day: '', day2: '', year: '', long: '', short: '', numeric: '', time: '', zone: '' };
  const p = partsOf(iso, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const s = partsOf(iso, { weekday: 'short', month: 'short' });
  const n = partsOf(iso, { month: '2-digit', day: '2-digit', year: '2-digit' });
  return {
    wd: p.weekday, wdShort: s.weekday, month: p.month, monthShort: s.month, day: p.day, day2: String(p.day).padStart(2, '0'), year: p.year,
    long: `${p.weekday}, ${p.month} ${p.day}, ${p.year}`,
    short: `${p.month} ${p.day}, ${p.year}`,
    numeric: `${n.month}.${n.day}.${n.year}`,
    time: clock(iso),
    zone: zoneTag(iso),
  };
}

/** When an event happens: "4:00 – 10:00 PM EDT", "4:00 PM – 1:00 AM EDT", or "From 4:00 PM EDT" without an end. */
export function timeText(e) {
  if (!e || !ok(e.start)) return '';
  const z = zoneTag(e.start);
  const tail = z ? ` ${z}` : '';
  if (e.openEnded || !ok(e.end)) return `From ${clock(e.start)}${tail}`;
  const a = clock(e.start); const b = clock(e.end);
  const [at, ap] = a.split(' '); const [, bp] = b.split(' ');
  return ap === bp ? `${at} – ${b}${tail}` : `${a} – ${b}${tail}`;
}

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ORD = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
const words = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`);
const ordinal = (n) => {
  const w = words(n);
  const parts = w.split('-');
  const last = parts.pop();
  const o = ORD[last] || (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`);
  return [...parts, o].join('-');
};
const yearWords = (y) => (y >= 2000 && y < 2100 ? `two thousand${y % 100 ? ` ${words(y % 100)}` : ''}` : String(y));

/**
 * The date as formal stationery prints it: { day: 'Saturday, the second of October', year: 'two thousand twenty-seven',
 * time: 'at four o’clock in the afternoon' }.
 */
export function spelled(iso) {
  if (!ok(iso)) return { day: '', year: '', time: '' };
  const p = partsOf(iso, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
  const h = Number(p.hour) % 24; const m = Number(p.minute);
  const h12 = h % 12 || 12;
  const part = h < 12 ? 'in the morning' : h < 17 ? 'in the afternoon' : 'in the evening';
  const at = m === 0 ? `${words(h12)} o’clock` : m === 30 ? `half past ${words(h12)}` : `${words(h12)} ${m < 10 ? `oh ${words(m)}` : words(m)}`;
  return { day: `${p.weekday}, the ${ordinal(Number(p.day))} of ${p.month}`, year: yearWords(Number(p.year)), time: `at ${at} ${part}` };
}

/** The same calendar day at the venue? */
export const sameDay = (a, b) => ok(a) && ok(b) && dateParts(a).short === dateParts(b).short;
