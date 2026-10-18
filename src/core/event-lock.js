// Event lock (docs/PLATFORM.md "Event lock"): one paid plan is one wedding. On the first publish the names and the
// main wedding date are locked to that wedding. Afterwards a couple may fix the spelling of the names up to 3 times
// (each save that changes one or more names is one fix, of at most 3 letters per name, compared without case), and
// move the date up to 60 days either way. Photos, wording, music, venues, times and the other events stay free.
// Staff are never blocked. Plain functions with no I/O: the server enforces them (server/lib/invitations.js), the
// studio mirrors them (src/studio/lock-ui.js).
//
// lock = { names: { 'couple.bride.name.en': 'Sita', ... }, date: 'YYYY-MM-DD', fixesUsed: 0..3, lockedAt }
// Only names that had a value are locked; one typed into an empty field later is locked as it is (no fix used).

/** The person-name fields every design shares (src/config.js couple), each with an English and a Nepali side. */
export const NAME_FIELDS = [
  { path: ['couple', 'bride', 'name'], label: 'Bride’s first name' },
  { path: ['couple', 'bride', 'fullName'], label: 'Bride’s full name' },
  { path: ['couple', 'bride', 'parents'], label: 'Bride’s parents' },
  { path: ['couple', 'groom', 'name'], label: 'Groom’s first name' },
  { path: ['couple', 'groom', 'fullName'], label: 'Groom’s full name' },
  { path: ['couple', 'groom', 'parents'], label: 'Groom’s parents' },
];
const LANGS = [['en', 'English'], ['ne', 'Nepali']];
/** Every locked key ('couple.bride.name.en') with its label. */
export const NAME_KEYS = NAME_FIELDS.flatMap((f) => LANGS.map(([l, ln]) => ({ key: [...f.path, l].join('.'), label: `${f.label} (${ln})` })));
export const DATE_KEY = 'weddingDate';
export const MAX_FIXES = 3;
export const MAX_LETTERS = 3;
export const DATE_DAYS = 60;

const KEYS = new Set(NAME_KEYS.map((k) => k.key));
export const isNameKey = (k) => KEYS.has(k);
export const labelOf = (k) => (k === DATE_KEY ? 'Wedding date' : NAME_KEYS.find((x) => x.key === k)?.label || k);

/** The value at 'a.b.c' in data ('' when missing or not text). */
export function valueAt(data, key) {
  const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);
  return typeof v === 'string' ? v.normalize('NFC').trim() : '';
}

/** Sets the value at 'a.b.c' (creating objects on the way). */
export function setAt(data, key, value) {
  const ks = key.split('.');
  let o = data;
  for (const k of ks.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
  o[ks.at(-1)] = value;
}

/** How a name compares: NFC, trimmed, single spaces, lower case (Devanagari has no case and is left as it is). */
export const norm = (s) => String(s ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

/** Levenshtein distance in Unicode code points (a Devanagari vowel sign is one letter). */
export function distance(a, b) {
  const x = Array.from(a);
  const y = Array.from(b);
  if (!x.length) return y.length;
  if (!y.length) return x.length;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length];
}

/** 'YYYY-MM-DD' of a wedding date ('' when none). */
export const dayOf = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(String(iso || '')) ? String(iso).slice(0, 10) : '');
/** Whole days between two 'YYYY-MM-DD' days. */
export const daysApart = (a, b) => Math.round(Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 864e5);

/** A new lock from the invitation as it is published. */
export function makeLock(data, at = new Date().toISOString()) {
  const names = {};
  for (const { key } of NAME_KEYS) { const v = valueAt(data, key); if (v) names[key] = v; }
  return { names, date: dayOf(data?.weddingDate), fixesUsed: 0, lockedAt: at };
}

/** The lock re-based on what staff saved (staff edits are never blocked and use no fix). */
export function rebase(lock, data) {
  const next = makeLock(data, lock.lockedAt);
  return { ...lock, names: next.names, date: next.date || lock.date };
}

/**
 * Checks a draft against the lock. Returns { blocked: [{ key, reason: 'big' | 'nofixes' | 'date', from, to }],
 * fixed: [keys changed by a spelling fix], usesFix, next: the lock to store when nothing is blocked }.
 */
export function checkLock(lock, data) {
  const out = { blocked: [], fixed: [], usesFix: false, next: lock };
  if (!lock || typeof lock !== 'object') return out;
  const names = { ...(lock.names || {}) };
  const used = Number(lock.fixesUsed) || 0;
  for (const { key } of NAME_KEYS) {
    const was = typeof names[key] === 'string' ? names[key] : '';
    const now = valueAt(data, key);
    if (!was) { if (now) names[key] = now; continue; } // a name added later: locked as it is
    if (now === was) continue;
    const d = distance(norm(now), norm(was));
    if (d === 0) { names[key] = now; continue; } // only the case or the spaces: free
    if (d > MAX_LETTERS) out.blocked.push({ key, reason: 'big', from: was, to: now });
    else out.fixed.push(key);
    if (now) names[key] = now; else delete names[key];
  }
  if (out.fixed.length && used >= MAX_FIXES) {
    for (const key of out.fixed) out.blocked.push({ key, reason: 'nofixes', from: lock.names[key], to: valueAt(data, key) });
  }
  const day = dayOf(data?.weddingDate);
  if (lock.date && day && day !== lock.date && daysApart(day, lock.date) > DATE_DAYS) out.blocked.push({ key: DATE_KEY, reason: 'date', from: lock.date, to: day });
  out.usesFix = out.fixed.length > 0;
  if (!out.blocked.length) out.next = { ...lock, names, fixesUsed: used + (out.usesFix ? 1 : 0) };
  return out;
}

/** Fixes left on a lock (0..3). */
export const fixesLeft = (lock) => (lock ? Math.max(0, MAX_FIXES - (Number(lock.fixesUsed) || 0)) : MAX_FIXES);

/** One plain sentence for a blocked change. */
export function blockedMessage(blocked) {
  const b = blocked[0];
  if (!b) return '';
  if (b.reason === 'date') return `The wedding date is locked to this wedding: it can move up to ${DATE_DAYS} days from ${b.from}. For a bigger change, use “Request a change”.`;
  if (b.reason === 'nofixes') return `The names are locked to this wedding and all ${MAX_FIXES} spelling fixes are used. To change a name, use “Request a change”.`;
  return `The names are locked to this wedding. A spelling fix can change up to ${MAX_LETTERS} letters of a name. For a bigger change, use “Request a change”.`;
}
