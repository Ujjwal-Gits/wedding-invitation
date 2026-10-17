// Venue time zones. Every time on an invitation is a wall-clock time at the venue: `timeZone` in the invitation
// data (an IANA name such as "America/Chicago"; absent = Nepal, so older invitations are unchanged). Stored times are
// ISO strings whose offset is the venue's offset on that date (DST-aware), e.g. 2027-03-20T15:00:00-05:00.
// Shared by the invitation pages, the studio and the server (validation). No DOM, no dependencies.

export const DEFAULT_TZ = 'Asia/Kathmandu';

/** Offered first in the studio's picker, in this order. */
export const COMMON_ZONES = [
  ['Asia/Kathmandu', 'Kathmandu, Nepal'],
  ['America/New_York', 'New York'],
  ['America/Chicago', 'Chicago'],
  ['America/Denver', 'Denver'],
  ['America/Los_Angeles', 'Los Angeles'],
  ['America/Toronto', 'Toronto'],
  ['Europe/London', 'London'],
  ['Australia/Sydney', 'Sydney'],
  ['Australia/Melbourne', 'Melbourne'],
  ['Asia/Dubai', 'Dubai'],
  ['Asia/Riyadh', 'Riyadh'],
  ['Asia/Qatar', 'Doha'],
  ['Asia/Kuwait', 'Kuwait'],
  ['Asia/Tokyo', 'Tokyo'],
  ['Asia/Hong_Kong', 'Hong Kong'],
  ['Asia/Singapore', 'Singapore'],
];

// Old ICU names some engines still list; the picker shows the current name.
const RENAMED = { 'Asia/Katmandu': 'Asia/Kathmandu', 'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Rangoon': 'Asia/Yangon', 'Europe/Kiev': 'Europe/Kyiv', 'America/Godthab': 'America/Nuuk', 'Pacific/Enderbury': 'Pacific/Kanton' };
const NAME_RE = /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+){0,2}$/;

let supported = null;
const supportedSet = () => {
  if (supported) return supported;
  try { supported = typeof Intl.supportedValuesOf === 'function' ? new Set(Intl.supportedValuesOf('timeZone')) : new Set(); } catch { supported = new Set(); }
  return supported;
};

/** True for a real IANA zone name ("America/Chicago", "UTC"); never for an offset like "+05:45". */
export function isTimeZone(z) {
  if (typeof z !== 'string' || z.length > 64 || !NAME_RE.test(z)) return false;
  let canonical;
  try { canonical = new Intl.DateTimeFormat('en-US', { timeZone: z }).resolvedOptions().timeZone; } catch { return false; }
  const set = supportedSet();
  if (!set.size) return true; // no list in this engine: the formatter accepting it is the check
  return set.has(z) || set.has(canonical) || z === 'UTC' || canonical === 'UTC' || RENAMED[z] != null || Object.values(RENAMED).includes(z);
}

/** Every zone this engine knows, current names, sorted (for the "All time zones" list). */
export function allZones() {
  const names = new Set([...supportedSet()].map((z) => RENAMED[z] || z));
  for (const [z] of COMMON_ZONES) names.add(z);
  return [...names].filter((z) => z.includes('/') && !z.startsWith('Etc/')).sort();
}

/** The invitation's venue zone, falling back to Nepal for older data or anything unexpected. */
export const zoneOf = (data) => (isTimeZone(data?.timeZone) ? data.timeZone : DEFAULT_TZ);

const fmts = new Map();
const partsFmt = (tz) => {
  let f = fmts.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    fmts.set(tz, f);
  }
  return f;
};
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Wall-clock parts at `tz` of an instant (ms or ISO): { y, m (0-11), day, wd (0 = Sunday), h, min, s }. */
export function wallParts(at, tz = DEFAULT_TZ) {
  const ms = typeof at === 'number' ? at : new Date(at).getTime();
  if (tz === DEFAULT_TZ) { // Nepal is UTC+05:45 with no DST: plain arithmetic, exactly as before time zones existed
    const d = new Date(ms + 345 * 60000);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate(), wd: d.getUTCDay(), h: d.getUTCHours(), min: d.getUTCMinutes(), s: d.getUTCSeconds() };
  }
  const p = Object.fromEntries(partsFmt(tz).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month - 1, day: +p.day, wd: WD[p.weekday] ?? 0, h: +p.hour % 24, min: +p.minute, s: +p.second };
}

/** Minutes ahead of UTC at `tz` at that instant (Kathmandu 345, Chicago -300 in summer, -360 in winter). */
export function offsetMinutes(tz, ms) {
  const t = Math.floor(ms / 1000) * 1000;
  const p = wallParts(t, tz);
  return Math.round((Date.UTC(p.y, p.m, p.day, p.h, p.min, p.s) - t) / 60000);
}

const pad = (n) => String(n).padStart(2, '0');
export const offsetText = (min) => `${min < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(min) / 60))}:${pad(Math.abs(min) % 60)}`;

/**
 * The ISO date-time of a wall-clock time at the venue: zonedIso('2027-03-20', '15:00', 'America/Chicago')
 * = '2027-03-20T15:00:00-05:00'. The offset is the zone's on that date (DST-aware). A time that happens twice
 * (clocks go back) is the first one; a time that does not exist (clocks go forward) uses the offset before the change.
 */
export function zonedIso(date, time, tz = DEFAULT_TZ) {
  const [y, mo, d] = String(date).split('-').map(Number);
  const [h, mi] = String(time).split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let off;
  if (tz === DEFAULT_TZ) off = 345;
  else {
    const before = offsetMinutes(tz, wall - 864e5 / 2 - 345 * 60000);
    const after = offsetMinutes(tz, wall + 864e5 / 2);
    const fits = (o) => { const p = wallParts(wall - o * 60000, tz); return p.h === h && p.min === mi; };
    off = [Math.max(before, after), Math.min(before, after)].find(fits) ?? before;
  }
  return `${date}T${pad(h)}:${pad(mi)}:00${offsetText(off)}`;
}

/** { date: 'YYYY-MM-DD', time: 'HH:MM' } at the venue for a stored ISO date-time ('' parts when there is none). */
export function wallOf(iso, tz = DEFAULT_TZ) {
  const ms = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(ms)) return { date: '', time: '' };
  const p = wallParts(ms, tz);
  return { date: `${p.y}-${pad(p.m + 1)}-${pad(p.day)}`, time: `${pad(p.h)}:${pad(p.min)}` };
}

/** The same wall-clock time re-stamped for another zone (the couple changed the venue's zone: 3 PM stays 3 PM). */
export function restamp(iso, from, to) {
  const w = wallOf(iso, from);
  return w.date ? zonedIso(w.date, w.time, to) : iso;
}

/**
 * Short name of the zone at that instant for guests: "CDT", "BST", "AEDT", else "GMT+4". Empty for Nepal, so
 * Nepali invitations read exactly as before.
 */
export function zoneLabel(at, tz = DEFAULT_TZ) {
  if (tz === DEFAULT_TZ) return '';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  let fallback = '';
  for (const locale of ['en-US', 'en-GB', 'en-AU', 'en-IN']) {
    try {
      const v = new Intl.DateTimeFormat(locale, { timeZone: tz, timeZoneName: 'short' }).formatToParts(d).find((x) => x.type === 'timeZoneName')?.value || '';
      if (v && !/^(GMT|UTC)[+\-−]/.test(v)) return v;
      fallback ||= v;
    } catch { /* locale data missing */ }
  }
  return fallback.replace('−', '-');
}
