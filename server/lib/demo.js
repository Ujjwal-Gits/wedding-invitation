// The demo couple (src/config.js: Binisha & Ujjwal, their families, venues, story, contacts and photos) belongs to
// the theme demo, the watermarked showcase and the design thumbnails only. It must never show on a real invitation.
// This module knows the demo's couple-specific values exactly, so a real invitation can be checked and cleaned:
//   scrubDemo(data): clears every field that still holds the demo's exact words (per language) and drops the demo's
//   people photos, sample contacts, stays and story lines. Fields the couple changed are never touched: only an exact
//   match (after trimming) of the demo value counts. Generic wording every new card starts with (the salutation, the
//   request, the sign-off, the closing line, the shloka, the seven vows, ceremony names) is not the demo couple's and
//   is kept.
import { config as demo } from '../../src/config.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const sides = (o) => [str(o?.en), str(o?.ne)].filter(Boolean);
const setOf = (...pairs) => new Set(pairs.flatMap(sides));

const B = demo.couple.bride;
const G = demo.couple.groom;
/** Exact demo words per field kind (both languages). */
const D = {
  name: setOf(B.name, G.name),
  fullName: setOf(B.fullName, G.fullName),
  parents: setOf(B.parents, G.parents),
  home: setOf(B.home, G.home),
  hosts: setOf(demo.hosts),
  city: setOf(demo.city),
  weddingDateBS: setOf(demo.weddingDateBS),
  body: setOf(demo.invitation.body),
  deadline: setOf(demo.rsvp.deadline),
  travel: setOf(demo.info.travel),
  venue: setOf(...demo.events.map((e) => e.venue)),
  mapQuery: new Set(demo.events.map((e) => str(e.mapQuery)).filter(Boolean)),
  storyText: setOf(...demo.story.map((s) => s.text)),
  stayName: setOf(...demo.info.stays.map((s) => s.name)),
  stayNote: setOf(...demo.info.stays.map((s) => s.note)),
  contactName: setOf(...demo.info.contacts.map((c) => c.name)),
  contactPhone: new Set(demo.info.contacts.map((c) => str(c.phone).replace(/\s+/g, ''))),
  shareTitle: new Set([str(demo.share.title)]),
  shareDescription: new Set([str(demo.share.description)]),
};
// Earlier versions of the demo (the sample's surnames were Thapa and Shrestha until 2026-10-16, now Katwal and Dahal):
// invitations started from the old sample still hold those words, so they count as the demo's too.
const LEGACY = {
  fullName: [{ en: 'Binisha Thapa', ne: 'सौ.का. बिनिशा थापा' }, { en: 'Ujjwal Shrestha', ne: 'चि. उज्ज्वल श्रेष्ठ' }],
  parents: [{ en: 'Mr. Ram Bahadur Thapa & Mrs. Sita Thapa', ne: 'श्री राम बहादुर थापा तथा श्रीमती सीता थापा' }, { en: 'Mr. Hari Prasad Shrestha & Mrs. Gita Shrestha', ne: 'श्री हरि प्रसाद श्रेष्ठ तथा श्रीमती गीता श्रेष्ठ' }],
  hosts: [{ en: 'The Thapa & Shrestha families', ne: 'थापा तथा श्रेष्ठ परिवार' }],
  body: [{
    en: 'By the grace of our family deity and the blessings of our elders, the auspicious marriage of Ujjwal, son of Mr. Hari Prasad and Mrs. Gita Shrestha, with Binisha, daughter of Mr. Ram Bahadur and Mrs. Sita Thapa, has been fixed.',
    ne: 'कुलदेवताको असीम कृपा र गुरुजनको आशीर्वादले श्री हरि प्रसाद श्रेष्ठ तथा श्रीमती गीता श्रेष्ठका सुपुत्र चि. उज्ज्वलको शुभ विवाह श्री राम बहादुर थापा तथा श्रीमती सीता थापाकी सुपुत्री सौ.का. बिनिशासँग हुने शुभ साइत जुरेको छ।',
  }],
  venue: [{ en: 'Thapa Niwas, Baluwatar', ne: 'थापा निवास, बालुवाटार' }],
  contactName: [{ en: 'Rohan Thapa', ne: 'रोहन थापा' }, { en: 'Nisha Shrestha', ne: 'निशा श्रेष्ठ' }],
};
for (const [kind, pairs] of Object.entries(LEGACY)) for (const s of pairs.flatMap(sides)) D[kind].add(s);
const HASHTAGS = new Set([demo.couple.hashtag, '#BinishaWedsUjjwal', '#UjjwalWedsBinisha'].map((t) => t.toLowerCase()));
/** Library photos of the demo couple (their portraits); scenery photos are not the couple and stay. */
export const DEMO_PEOPLE_PHOTOS = new Set(demo.couple.portraits.map((p) => p.photo).filter((p) => typeof p === 'string'));
/** The demo's first names in both languages (for checks and tests). */
export const DEMO_NAMES = [...D.name];
/** The demo's share title and description. */
export const DEMO_SHARE = new Set([...D.shareTitle, ...D.shareDescription]);

/** True when the text contains one of the demo couple's first names (a quick leak check for page text). */
export const hasDemoName = (s) => typeof s === 'string' && DEMO_NAMES.some((n) => s.includes(n));

/**
 * Clears the demo's exact values from invitation data (draft or published), in place.
 * Returns the paths it changed (empty when there was nothing to clean).
 */
export function scrubDemo(data) {
  const changed = [];
  if (!data || typeof data !== 'object') return changed;
  /** Clears each language of a pair that equals a demo value of this kind. */
  const pair = (o, kind, path) => {
    if (!o || typeof o !== 'object') return;
    for (const k of ['en', 'ne']) {
      if (str(o[k]) && D[kind].has(str(o[k]))) { o[k] = ''; changed.push(`${path}.${k}`); }
    }
  };
  /** Every non-empty language of a pair is a demo value of this kind (an untouched demo item). */
  const allDemo = (o, kind) => sides(o).length > 0 && sides(o).every((s) => D[kind].has(s));

  const c = data.couple;
  if (c && typeof c === 'object') {
    for (const who of ['bride', 'groom']) {
      const p = c[who];
      if (!p || typeof p !== 'object') continue;
      for (const f of ['fullName', 'parents', 'home']) pair(p[f], f, `couple.${who}.${f}`);
    }
    // First names: a real person may be called Binisha or Ujjwal, so a name is the demo's only while the other one is
    // too (the bride's demo name as the bride's, the groom's as the groom's, per language).
    for (const k of ['en', 'ne']) {
      const b = c.bride?.name;
      const g = c.groom?.name;
      if (b && g && str(b[k]) === str(B.name[k]) && str(g[k]) === str(G.name[k]) && str(b[k])) {
        b[k] = ''; g[k] = '';
        changed.push(`couple.bride.name.${k}`, `couple.groom.name.${k}`);
      }
    }
    if (typeof c.hashtag === 'string' && HASHTAGS.has(str(c.hashtag).toLowerCase())) { c.hashtag = ''; changed.push('couple.hashtag'); }
    if (Array.isArray(c.portraits)) {
      const keep = c.portraits.filter((p) => !(typeof p?.photo === 'string' && DEMO_PEOPLE_PHOTOS.has(p.photo)));
      if (keep.length !== c.portraits.length) { c.portraits = keep; changed.push('couple.portraits'); }
    }
  }
  if (Array.isArray(data.gallery)) {
    const keep = data.gallery.filter((g) => !(typeof g?.photo === 'string' && DEMO_PEOPLE_PHOTOS.has(g.photo)));
    if (keep.length !== data.gallery.length) { data.gallery = keep; changed.push('gallery'); }
  }
  pair(data.hosts, 'hosts', 'hosts');
  pair(data.city, 'city', 'city');
  pair(data.weddingDateBS, 'weddingDateBS', 'weddingDateBS');
  pair(data.invitation?.body, 'body', 'invitation.body');
  pair(data.rsvp?.deadline, 'deadline', 'rsvp.deadline');
  pair(data.info?.travel, 'travel', 'info.travel');
  if (Array.isArray(data.events)) {
    data.events.forEach((e, i) => {
      if (!e || typeof e !== 'object') return;
      pair(e.venue, 'venue', `events[${i}].venue`);
      if (str(e.mapQuery) && D.mapQuery.has(str(e.mapQuery))) { e.mapQuery = ''; changed.push(`events[${i}].mapQuery`); }
      if (typeof e.photo === 'string' && DEMO_PEOPLE_PHOTOS.has(e.photo)) { e.photo = null; changed.push(`events[${i}].photo`); }
    });
  }
  if (Array.isArray(data.story)) {
    const keep = data.story.filter((s) => !allDemo(s?.text, 'storyText'));
    if (keep.length !== data.story.length) { data.story = keep; changed.push('story'); }
  }
  if (data.info && typeof data.info === 'object') {
    if (Array.isArray(data.info.stays)) {
      const keep = data.info.stays.filter((s) => !(allDemo(s?.name, 'stayName') && (!sides(s?.note).length || allDemo(s?.note, 'stayNote'))));
      if (keep.length !== data.info.stays.length) { data.info.stays = keep; changed.push('info.stays'); }
    }
    if (Array.isArray(data.info.contacts)) {
      const keep = data.info.contacts.filter((k) => !(allDemo(k?.name, 'contactName') && (!str(k?.phone) || D.contactPhone.has(str(k.phone).replace(/\s+/g, '')))));
      if (keep.length !== data.info.contacts.length) { data.info.contacts = keep; changed.push('info.contacts'); }
    }
  }
  const s = data.share;
  if (s && typeof s === 'object') {
    if (str(s.title) && D.shareTitle.has(str(s.title))) { s.title = ''; changed.push('share.title'); }
    if (str(s.description) && D.shareDescription.has(str(s.description))) { s.description = ''; changed.push('share.description'); }
  }
  return changed;
}

/** True when the value is empty or still exactly a demo value of this kind ('name', 'venue', ...). */
export function emptyOrDemo(o, kind) {
  const all = sides(o);
  return !all.length || all.every((x) => D[kind]?.has(x));
}
