// Guest replies (lib/rsvp.js, src/core/rsvp-rules.js): the reply-form questions an invitation stores, one name and
// meal per guest, the couple's own meal list, dietary needs and song requests, replies saved before any of this
// (one meal per party) still reading and counting right, and the CSV.
// Run: npm test (in server/), and STORE=json npm test for the JSON store.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-rsvp-'));
process.env.DATA_ROOT = DATA_ROOT;

const store = await import('../lib/store.js');
store.openStore();
const rsvp = await import('../lib/rsvp.js');
const { sanitizeInvitation, ValidationError } = await import('../lib/validate.js');
const rules = await import('../../src/core/rsvp-rules.js');
const { config: demo } = await import('../../src/config.js');

const base = { theme: 'dhoka', weddingDate: demo.weddingDate, events: demo.events.slice(0, 2).map(({ id, title, start, end }) => ({ id, title, start, end })) };
const EVENT_IDS = base.events.map((e) => e.id);

async function publish(slug, rsvpSettings = {}) {
  const data = sanitizeInvitation({ ...base, rsvp: { maxGuests: 6, ...rsvpSettings } }, slug);
  const now = new Date().toISOString();
  await store.createInvitation({ slug, version: 3, status: 'published', createdAt: now, updatedAt: now, publishedAt: now, draft: data, published: structuredClone(data) });
}

let ipN = 0;
const fakeRes = () => ({
  statusCode: 200, headers: {}, body: undefined,
  status(c) { this.statusCode = c; return this; },
  json(o) { this.body = o; return this; },
  set(k, v) { this.headers[k] = v; return this; },
  send(s) { this.body = s; return this; },
});
const fakeReq = (slug, body, extra = {}) => {
  const headers = { origin: 'http://localhost:5173', host: 'localhost:8787' };
  ipN += 1;
  return { params: { slug, ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body), headers, get: (k) => headers[k.toLowerCase()], ip: `10.0.${ipN >> 8}.${ipN & 255}`, socket: { remoteAddress: '10.0.0.1' }, app: { get: () => false } };
};
async function send(slug, body) {
  const res = fakeRes();
  await rsvp.submit(fakeReq(slug, body), res);
  return res;
}
async function list(slug) {
  const res = fakeRes();
  await rsvp.listReplies(fakeReq(slug), res);
  return res.body;
}
async function csv(slug) {
  const res = fakeRes();
  await rsvp.exportCsv(fakeReq(slug), res);
  return res.body.replace(/^﻿/, '').trim().split('\r\n');
}
const reply = (over = {}) => ({ name: 'Ana Smith', phone: '', attending: 'yes', guests: 1, events: EVENT_IDS, party: [{ name: 'Ana Smith', meal: 'veg' }], message: '', website: '', ...over });

before(async () => {
  await publish('rsvp-default');
  await publish('rsvp-us', {
    meals: [{ id: 'chicken', label: { en: 'Chicken', ne: '' } }, { id: 'fish', label: { en: 'Fish', ne: '' } }, { id: 'kids', label: { en: 'Kids meal', ne: '' } }],
    guestNames: 'required', askDiet: true, askSong: true,
  });
  await publish('rsvp-nomeal', { mealChoice: false, guestNames: 'off' });
});
after(() => { store.closeStore(); rmSync(DATA_ROOT, { recursive: true, force: true }); });

test('the form questions are stored only when they differ from the default', () => {
  const plain = sanitizeInvitation({ ...base, rsvp: { maxGuests: 4 } }, 'q-test');
  assert.deepEqual(plain.rsvp, { enabled: true, deadline: { en: '', ne: '' }, maxGuests: 4, endpoint: '' }, 'an older invitation reads exactly as before');
  const same = sanitizeInvitation({ ...base, rsvp: { meals: rules.DEFAULT_MEALS.map((m) => ({ ...m, label: { ...m.label } })), mealChoice: true, guestNames: 'optional', askDiet: false } }, 'q-test');
  assert.deepEqual(Object.keys(same.rsvp), ['enabled', 'deadline', 'maxGuests', 'endpoint'], 'the defaults sent back by the studio are not stored');
  const own = sanitizeInvitation({ ...base, rsvp: { meals: [{ id: 'chicken', label: { en: ' Chicken ', ne: 'कुखुरा' } }], mealChoice: false, guestNames: 'required', askDiet: true, askSong: true } }, 'q-test');
  assert.deepEqual(own.rsvp.meals, [{ id: 'chicken', label: { en: 'Chicken', ne: 'कुखुरा' } }]);
  assert.equal(own.rsvp.mealChoice, false);
  assert.equal(own.rsvp.guestNames, 'required');
  assert.equal(own.rsvp.askDiet, true);
  assert.equal(own.rsvp.askSong, true);
  for (const bad of [
    { meals: [{ id: 'Chicken!', label: { en: 'Chicken' } }] },
    { meals: [{ id: 'a', label: { en: 'A' } }, { id: 'a', label: { en: 'B' } }] },
    { meals: Array.from({ length: 9 }, (_, i) => ({ id: `m${i}`, label: { en: `M${i}` } })) },
    { meals: [{ id: 'x', label: { en: 'x'.repeat(61) } }] },
    { guestNames: 'sometimes' },
    { mealChoice: 'no' },
  ]) assert.throws(() => sanitizeInvitation({ ...base, rsvp: bad }, 'q-test'), ValidationError, JSON.stringify(bad));
});

test('rsvpOptions: built-in choices by default, the couple’s own list, or no meal question', () => {
  assert.deepEqual(rules.rsvpOptions({}).meals.map((m) => m.id), ['veg', 'nonveg']);
  assert.deepEqual(rules.rsvpOptions(undefined), { meals: rules.DEFAULT_MEALS, guestNames: 'optional', diet: false, song: false });
  assert.deepEqual(rules.rsvpOptions({ meals: [{ id: 'fish', label: { en: 'Fish', ne: '' } }, { id: 'x', label: { en: '', ne: '' } }] }).meals.map((m) => m.id), ['fish'], 'an unnamed choice is not offered');
  assert.deepEqual(rules.rsvpOptions({ mealChoice: false }).meals, []);
});

test('a party of three: everyone’s name and meal is validated and stored', async () => {
  let r = await send('rsvp-us', reply({ guests: 3, party: [{ name: 'ignored', meal: 'chicken' }, { name: 'Ben Smith', meal: 'fish' }, { name: 'Cara Smith', meal: 'kids' }], diet: 'Ben: no nuts', song: 'September' }));
  assert.equal(r.statusCode, 200, JSON.stringify(r.body));
  const [saved] = (await list('rsvp-us')).replies;
  assert.deepEqual(saved.party, [{ name: 'Ana Smith', meal: 'chicken' }, { name: 'Ben Smith', meal: 'fish' }, { name: 'Cara Smith', meal: 'kids' }], 'the first guest is the person replying');
  assert.equal(saved.diet, 'Ben: no nuts');
  assert.equal(saved.song, 'September');
  assert.equal('meal' in saved, false);

  // a meal that is not on the list, a missing meal, a missing name (names required here), a party of the wrong size
  for (const [party, guests, field] of [
    [[{ meal: 'chicken' }, { name: 'Ben', meal: 'veg' }], 2, 'meal'],
    [[{ meal: 'chicken' }, { name: 'Ben' }], 2, 'meal'],
    [[{ meal: 'chicken' }, { name: '', meal: 'fish' }], 2, 'party'],
    [[{ meal: 'chicken' }], 2, 'party'],
    ['chicken', 1, 'party'],
  ]) {
    r = await send('rsvp-us', reply({ guests, party }));
    assert.equal(r.statusCode, 400, JSON.stringify(party));
    assert.ok(r.body.fields.includes(field), `${JSON.stringify(party)} -> ${r.body.fields}`);
  }
  // nobody preselects: a reply without a meal is refused while meals are asked
  r = await send('rsvp-default', reply({ party: [{ name: 'Ana', meal: '' }] }));
  assert.deepEqual(r.body.fields, ['meal']);
});

test('without a meal question or name boxes, nothing is required and nothing extra is kept', async () => {
  const r = await send('rsvp-nomeal', reply({ guests: 2, party: [{ meal: 'veg' }, { name: 'Someone', meal: 'veg' }], diet: 'not asked', song: 'not asked' }));
  assert.equal(r.statusCode, 200, JSON.stringify(r.body));
  const { replies, totals } = await list('rsvp-nomeal');
  assert.deepEqual(replies[0].party, [{ name: 'Ana Smith', meal: '' }, { name: '', meal: '' }]);
  assert.equal('diet' in replies[0], false);
  assert.equal('song' in replies[0], false);
  assert.deepEqual(totals.meals, []);
});

test('“Can’t come” keeps no party, meals, dietary note or song', async () => {
  const r = await send('rsvp-us', reply({ attending: 'no', guests: 3, party: [{ meal: 'fish' }], diet: 'x', song: 'y', message: 'Congratulations!' }));
  assert.equal(r.statusCode, 200, JSON.stringify(r.body));
  const saved = (await list('rsvp-us')).replies.find((x) => x.attending === 'no');
  assert.deepEqual([saved.guests, saved.party, saved.diet, saved.song, saved.message], [0, [], undefined, undefined, 'Congratulations!']);
});

test('older replies (one meal per party) and the older form still work', async () => {
  // a reply stored before per-guest entries existed
  await store.addReply('rsvp-default', { id: 'oldreply01', at: '2026-01-02T03:04:05.000Z', name: 'Old Timer', phone: '', attending: 'yes', guests: 3, events: EVENT_IDS, meal: 'veg', message: '' }, 5000);
  await store.addReply('rsvp-default', { id: 'oldreply02', at: '2026-01-02T04:04:05.000Z', name: 'Meat Lover', phone: '', attending: 'yes', guests: 2, events: EVENT_IDS, meal: 'nonveg', message: '' }, 5000);
  // the older form (a cached page): no party, one meal for everyone
  const r = await send('rsvp-default', { name: 'Cached Page', attending: 'yes', guests: 2, events: EVENT_IDS, meal: 'nonveg', message: '' });
  assert.equal(r.statusCode, 200, JSON.stringify(r.body));
  const { replies, totals } = await list('rsvp-default');
  const cached = replies.find((x) => x.name === 'Cached Page');
  assert.deepEqual(cached.party, [{ name: 'Cached Page', meal: 'nonveg' }, { name: '', meal: 'nonveg' }]);
  assert.deepEqual(rules.partyOf(replies.find((x) => x.id === 'oldreply01')), [{ name: 'Old Timer', meal: 'veg' }, { name: '', meal: 'veg' }, { name: '', meal: 'veg' }]);
  assert.equal(totals.veg, 3);
  assert.deepEqual(totals.meals.map((m) => [m.id, m.label.en, m.guests]), [['veg', 'Vegetarian', 3], ['nonveg', 'Non-vegetarian', 4]]);
  assert.equal(totals.guests, 7);
});

test('totals per meal follow the couple’s list, with old ids and unchosen meals after it', () => {
  const meals = [{ id: 'chicken', label: { en: 'Chicken', ne: '' } }, { id: 'fish', label: { en: 'Fish', ne: '' } }];
  const t = rules.mealTotals([
    { attending: 'yes', guests: 2, party: [{ name: 'A', meal: 'chicken' }, { name: 'B', meal: 'fish' }] },
    { attending: 'yes', guests: 2, meal: 'veg' },
    { attending: 'yes', guests: 1, party: [{ name: 'C', meal: '' }] },
    { attending: 'no', guests: 0, party: [] },
  ], meals);
  assert.deepEqual(t.map((m) => [m.id, m.label.en, m.guests]), [['chicken', 'Chicken', 1], ['fish', 'Fish', 1], ['veg', 'Vegetarian', 2], ['', 'Not chosen', 1]]);
  assert.deepEqual(rules.mealLabel('fish', meals), { en: 'Fish', ne: 'Fish' }, 'an empty Nepali label shows the English one');
  assert.deepEqual(rules.mealLabel('gone', meals), { en: 'gone', ne: 'gone' });
});

test('the CSV lists every guest’s name and meal, dietary needs and songs, and neutralises formulas', async () => {
  await send('rsvp-us', reply({ name: '=HYPERLINK("x")', guests: 2, party: [{ meal: 'fish' }, { name: '+Dan', meal: 'kids' }], diet: '@gluten free', song: 'Dancing Queen, ABBA' }));
  const rows = await csv('rsvp-us');
  assert.equal(rows[0], 'Received,Name,Phone,Attending,Guests,Ceremonies,Guest names,Meals,Dietary needs,Song request,Message');
  const ana = rows.find((l) => l.includes('Ana Smith / Ben Smith / Cara Smith'));
  assert.ok(ana, rows.join('\n'));
  assert.ok(ana.includes(',Chicken / Fish / Kids meal,Ben: no nuts,September,'), ana);
  const evil = rows.find((l) => l.includes('HYPERLINK'));
  assert.ok(evil.includes(`"'=HYPERLINK(""x"")"`), evil);
  assert.ok(evil.includes(`"'=HYPERLINK(""x"") / +Dan"`), 'a guest name list starting with = is neutralised too');
  assert.ok(evil.includes(`'@gluten free`), evil);
  assert.ok(evil.includes('"Dancing Queen, ABBA"'), evil);
  const old = (await csv('rsvp-default')).find((l) => l.includes('Old Timer'));
  assert.ok(old.includes(',Old Timer / Guest 2 / Guest 3,Vegetarian / Vegetarian / Vegetarian,'), old);
  const declined = rows.find((l) => l.includes(',no,0,'));
  assert.ok(declined.endsWith(',,,,,Congratulations!'), declined);
});
