// Venue time zones (src/core/tz.js): DST-aware offsets, validation of the zone name, the guests' times and the
// calendar file, and that an older invitation without a timeZone reads exactly as before (Nepal time).
// Run: npm test (in server/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.DATA_ROOT ||= mkdtempSync(join(tmpdir(), 'nimtto-tz-'));

const tz = await import('../../src/core/tz.js');
const i18n = await import('../../src/core/i18n.js');
const { icsEnd } = await import('../../src/core/calendar.js');
const { sanitizeInvitation, ValidationError } = await import('../lib/validate.js');
const { config: demo } = await import('../../src/config.js');

test('offsets follow daylight saving time at the venue', () => {
  // Chicago: CST (-06:00) until 14 March 2027, CDT (-05:00) until 7 November 2027
  assert.equal(tz.zonedIso('2027-03-01', '15:00', 'America/Chicago'), '2027-03-01T15:00:00-06:00');
  assert.equal(tz.zonedIso('2027-03-20', '15:00', 'America/Chicago'), '2027-03-20T15:00:00-05:00');
  assert.equal(tz.zonedIso('2027-10-30', '15:00', 'America/Chicago'), '2027-10-30T15:00:00-05:00');
  assert.equal(tz.zonedIso('2027-11-10', '15:00', 'America/Chicago'), '2027-11-10T15:00:00-06:00');
  // the hour that happens twice is the first one; the hour that does not exist keeps the offset before the change
  assert.equal(tz.zonedIso('2027-11-07', '01:30', 'America/Chicago'), '2027-11-07T01:30:00-05:00');
  assert.equal(tz.zonedIso('2027-03-14', '02:30', 'America/Chicago'), '2027-03-14T02:30:00-06:00');
  // Nepal: +05:45 all year
  assert.equal(tz.zonedIso('2027-02-12', '10:30', 'Asia/Kathmandu'), '2027-02-12T10:30:00+05:45');
  assert.equal(tz.zonedIso('2027-07-12', '18:05'), '2027-07-12T18:05:00+05:45');
  // other hemispheres and half-hour zones
  assert.equal(tz.zonedIso('2027-01-10', '16:00', 'Australia/Sydney'), '2027-01-10T16:00:00+11:00');
  assert.equal(tz.zonedIso('2027-07-10', '16:00', 'Australia/Sydney'), '2027-07-10T16:00:00+10:00');
  assert.equal(tz.zonedIso('2027-07-10', '16:00', 'Asia/Kolkata'), '2027-07-10T16:00:00+05:30');
  assert.equal(tz.offsetMinutes('America/Chicago', Date.parse('2027-03-20T20:00:00Z')), -300);
  assert.equal(tz.offsetMinutes('Asia/Kathmandu', Date.parse('2027-03-20T20:00:00Z')), 345);
  // the typed wall-clock time comes back, and survives a change of zone
  assert.deepEqual(tz.wallOf('2027-03-20T15:00:00-05:00', 'America/Chicago'), { date: '2027-03-20', time: '15:00' });
  assert.deepEqual(tz.wallOf('2027-03-20T20:00:00Z', 'America/Chicago'), { date: '2027-03-20', time: '15:00' });
  assert.equal(tz.restamp('2027-03-20T15:00:00+05:45', 'Asia/Kathmandu', 'America/Chicago'), '2027-03-20T15:00:00-05:00');
});

test('only real IANA zone names are accepted', () => {
  for (const z of ['Asia/Kathmandu', 'America/Chicago', 'Europe/London', 'Asia/Qatar', 'UTC', 'America/Argentina/Buenos_Aires']) assert.ok(tz.isTimeZone(z), z);
  for (const z of ['', 'Mars/Olympus', '+05:45', 'GMT+5', 'America/Chicago<script>', 'Asia/Kathmandu ', 42, null, {}, 'a'.repeat(80)]) assert.equal(tz.isTimeZone(z), false, String(z));
  assert.equal(tz.zoneOf({}), 'Asia/Kathmandu');
  assert.equal(tz.zoneOf({ timeZone: 'Nope/Nope' }), 'Asia/Kathmandu');
  assert.equal(tz.zoneOf({ timeZone: 'America/Chicago' }), 'America/Chicago');
  const all = tz.allZones();
  for (const [z] of tz.COMMON_ZONES) assert.ok(all.includes(z), z);
});

test('the server stores a valid venue zone, rejects a bad one, and leaves Nepal unstored', () => {
  const base = { theme: 'dhoka', weddingDate: demo.weddingDate, events: demo.events.map(({ id, title, start, end }) => ({ id, title, start, end })) };
  const old = sanitizeInvitation(base, 'tz-test');
  assert.equal('timeZone' in old, false, 'an invitation without a zone stays without one');
  assert.equal(old.weddingDate, demo.weddingDate, 'stored times keep their meaning');
  assert.deepEqual(old.events.map((e) => [e.start, e.end]), demo.events.map((e) => [e.start, e.end]));
  assert.equal('timeZone' in sanitizeInvitation({ ...base, timeZone: 'Asia/Kathmandu' }, 'tz-test'), false);
  const chicago = sanitizeInvitation({ ...base, timeZone: 'America/Chicago', weddingDate: '2027-03-20T15:00:00-05:00' }, 'tz-test');
  assert.equal(chicago.timeZone, 'America/Chicago');
  assert.equal(chicago.weddingDate, '2027-03-20T15:00:00-05:00');
  for (const bad of ['Mars/Olympus', '+05:45', 7]) {
    assert.throws(() => sanitizeInvitation({ ...base, timeZone: bad }, 'tz-test'), (e) => e instanceof ValidationError && e.errors.some((x) => x.path === 'timeZone'));
  }
});

// The Nepal-only formatting before venue zones, kept here as the reference for older invitations.
const oldNpt = (iso) => { const d = new Date(new Date(iso).getTime() + 345 * 60000); return { day: d.getUTCDate(), h: d.getUTCHours() }; };
const oldFmt = (iso, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', ...opts }).format(new Date(iso));

test('an invitation without a timeZone reads exactly as before (Nepal time, no zone label)', () => {
  i18n.setTimeZone(undefined);
  assert.equal(i18n.timeZone(), 'Asia/Kathmandu');
  const isos = [demo.weddingDate, ...demo.events.flatMap((e) => [e.start, e.end]), '2027-04-13T23:50:00+05:45', '2027-04-13T18:30:00Z', '2026-12-31T19:00:00Z'];
  for (const iso of isos) {
    assert.equal(i18n.dateOf(iso).en, oldFmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    assert.equal(i18n.timeOf(iso).en, oldFmt(iso, { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', ' '));
    assert.equal(i18n.dayNum(iso).en, String(oldNpt(iso).day).padStart(2, '0'));
    assert.match(i18n.timeOf(iso).ne, /बजे$/);
    assert.equal(i18n.zoneTag(iso), '');
  }
  const e = demo.events[0];
  assert.equal(i18n.timeLabel(e).en, `${oldFmt(e.start, { hour: 'numeric', minute: '2-digit', hour12: true })} – ${oldFmt(e.end, { hour: 'numeric', minute: '2-digit', hour12: true })}`);
  assert.equal(i18n.timeLabel({ start: e.start, openEnded: true }).en, `${oldFmt(e.start, { hour: 'numeric', minute: '2-digit', hour12: true })} onwards`);
  // Bikram Sambat: 12 Feb 2027 is 29 Magh 2083
  assert.equal(i18n.bsDateOf('2027-02-12T10:30:00+05:45').short.en, '29 Magh 2083');
  // late evening in Nepal is already the next day there
  assert.equal(i18n.dayNum('2027-04-13T18:30:00Z').en, '14');
});

test('a Chicago invitation shows the times as typed, with the zone, and the B.S. date of the venue day', () => {
  i18n.setTimeZone('America/Chicago');
  try {
    const start = tz.zonedIso('2027-03-20', '15:00', 'America/Chicago');
    assert.equal(i18n.timeOf(start).en, '3:00 pm CDT');
    assert.equal(i18n.timeOf(tz.zonedIso('2027-01-09', '15:00', 'America/Chicago')).en, '3:00 pm CST');
    assert.match(i18n.dateOf(start).en, /^Saturday,? 20 March 2027$/);
    assert.equal(i18n.timeLabel({ start, openEnded: true }).en, '3:00 pm CDT onwards');
    assert.equal(i18n.timeLabel({ start, end: tz.zonedIso('2027-03-20', '20:00', 'America/Chicago') }).en, '3:00 pm – 8:00 pm CDT');
    // 9 PM in Chicago is already the next morning in Nepal: the venue's day counts
    const late = tz.zonedIso('2027-03-20', '21:00', 'America/Chicago');
    assert.equal(i18n.dayNum(late).en, '20');
    assert.equal(i18n.bsDateOf(late).short.en, i18n.bsDateOf('2027-03-20T12:00:00+05:45', null, 'Asia/Kathmandu').short.en);
    assert.equal(i18n.bsDateOf(late, null, 'America/Chicago').short.en, i18n.bsDateOf(late).short.en);
    // the countdown is to the absolute moment: 3 PM CDT = 20:00 UTC
    assert.equal(new Date(start).toISOString(), '2027-03-20T20:00:00.000Z');
  } finally {
    i18n.setTimeZone(undefined);
  }
  i18n.setTimeZone('Not/AZone');
  assert.equal(i18n.timeZone(), 'Asia/Kathmandu');
});

test('calendar file times: the event end, else three hours', () => {
  const start = '2027-03-20T15:00:00-05:00';
  assert.equal(icsEnd({ start, end: '2027-03-20T20:00:00-05:00' }), '2027-03-21T01:00:00.000Z');
  assert.equal(icsEnd({ start, end: '2027-03-21T01:00:00+00:00', openEnded: true }), '2027-03-20T23:00:00.000Z');
  assert.equal(icsEnd({ start, end: '' }), '2027-03-20T23:00:00.000Z');
  assert.equal(icsEnd({ start, end: '2027-03-20T14:00:00-05:00' }), '2027-03-20T23:00:00.000Z', 'an end before the start is ignored');
});
