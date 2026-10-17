// The international designs' demo: an American couple (or host), English only, a US venue time zone. It shows only
// where the Nepali demo would (a design page without ?id, thumbnails, the watermarked showcase); a real invitation
// never sees it (src/core/data.js). Each design passes its own names, date and place (T.demo), matching its art.
// Demo photos: CC0 (Wikimedia Commons, Unsplash-era uploads), public/themes/_vow/demo/credits.json.
import { zonedIso } from '../../core/tz.js';

const E = (en) => ({ en, ne: '' });
const ph = (name, w, h, alt) => ({ lg: `/themes/_vow/demo/${name}-lg.webp`, sm: `/themes/_vow/demo/${name}-sm.webp`, w, h, alt });
export const DEMO_PHOTOS = {
  goldenHour: ph('golden-hour', 2000, 1335, 'The two of them at golden hour'),
  embrace: ph('embrace', 1333, 2000, 'An embrace among the dune grass'),
  veilBack: ph('veil-back', 1335, 2000, 'Her hand on his shoulder, the lace back of her dress'),
  handsBouquet: ph('hands-bouquet', 2000, 1333, 'Hands held beside a pink bouquet'),
  ringsBouquet: ph('rings-bouquet', 2000, 1333, 'Two hands with rings over a peach bouquet'),
  countryRoad: ph('country-road', 2000, 1333, 'Walking down a country road together'),
  brideBouquet: ph('bride-bouquet', 1333, 2000, 'Smiling over a bouquet of white flowers'),
  meadow: ph('meadow', 2000, 1333, 'Side by side in a summer meadow'),
  aisle: ph('aisle', 2000, 1336, 'A garden aisle lined with pink flowers'),
  sunset: ph('sunset', 2000, 1333, 'Two silhouettes at sunset'),
  bouquetHug: ph('bouquet-hug', 2000, 1333, 'A hug, with the bouquet held behind'),
  woodsWalk: ph('woods-walk', 2000, 1333, 'A walk down a leafy path'),
};
const P = DEMO_PHOTOS;
const day = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const at = (date, time, tz) => zonedIso(date, time, tz);
const hm = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

/** A wedding weekend: welcome drinks, the ceremony, the reception, a farewell brunch. */
function weddingEvents(o) {
  const { date, time = '16:00', tz, venue, mapQuery, dress = 'Garden formal', colors = ['#5F7A55', '#E8C9C1', '#F4EFE6'] } = o;
  const [hh, mm] = time.split(':').map(Number);
  const after = (h, m = 0) => { const t = Math.min(hh * 60 + mm + h * 60 + m, 23 * 60 + 59); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  return [
    { id: 'welcome', title: E('Welcome drinks'), blurb: E('Come early and say hello. Drinks and small bites.'), start: at(day(date, -1), '18:30', tz), end: at(day(date, -1), '21:00', tz),
      venue: E(o.welcomeVenue || 'The Garden Terrace'), mapQuery: o.welcomeMap || mapQuery, dress: { colors: [], text: E('Smart casual') } },
    { id: 'ceremony', title: E('The ceremony'), blurb: E('Please be seated ten minutes early.'), start: at(date, time, tz), end: at(date, after(0, 45), tz),
      venue: E(venue), mapQuery, dress: { colors, text: E(dress) } },
    { id: 'reception', title: E('Cocktails, dinner and dancing'), blurb: E('Cocktail hour on the lawn, then dinner under the lights.'), start: at(date, after(1, 15), tz), end: at(date, '23:00', tz),
      venue: E(venue), mapQuery, dress: { colors, text: E(dress) },
      rituals: [{ time: E(hm(after(1, 15))), title: E('Cocktail hour') }, { time: E(hm(after(2, 30))), title: E('Dinner and toasts') }, { time: E(hm(after(4, 0))), title: E('First dance, then the party') }] },
    { id: 'brunch', title: E('Farewell brunch'), blurb: E('Coffee, pancakes and one last goodbye.'), start: at(day(date, 1), '10:00', tz), end: at(day(date, 1), '12:00', tz),
      venue: E(o.brunchVenue || 'The Garden Terrace'), mapQuery: o.brunchMap || mapQuery, dress: { colors: [], text: E('Come as you are') } },
  ];
}

/** One party: the main event, plus an optional after-party. */
function partyEvents(o) {
  const { date, time = '18:00', tz, venue, mapQuery } = o;
  const [hh, mm] = time.split(':').map(Number);
  const end = `${String(Math.min(hh + 4, 23)).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  return [
    { id: 'party', title: E(o.eventTitle || 'The party'), blurb: E(o.eventBlurb || 'Food, music and good company.'), start: at(date, time, tz), end: at(date, end, tz),
      venue: E(venue), mapQuery, dress: { colors: o.colors || [], text: E(o.dress || 'Dress to celebrate') } },
  ];
}

/**
 * The demo config for a design. o: { occasion, bride, groom, brideLast, groomLast, date 'YYYY-MM-DD', time 'HH:MM',
 * tz, venue, city, mapQuery, dress, colors, portraits: [photo], gallery: [photo] }.
 */
export function intlDemo(o, base) {
  const occasion = o.occasion || 'wedding';
  const single = !o.groom;
  const tz = o.tz || 'America/New_York';
  const mapQuery = o.mapQuery || `${o.venue}, ${o.city}`;
  const opts = { ...o, tz, mapQuery };
  const events = occasion === 'wedding' ? weddingEvents(opts) : partyEvents(opts);
  const main = events.find((e) => e.id === 'ceremony') || events[0];
  const who = single ? o.bride : `${o.bride} & ${o.groom}`;
  const portraits = (o.portraits || [P.goldenHour, P.embrace, P.veilBack, P.handsBouquet, P.countryRoad, P.brideBouquet, P.meadow])
    .map((photo) => ({ photo, alt: photo.alt }));
  const gallery = (o.gallery || [P.ringsBouquet, P.sunset, P.bouquetHug, P.woodsWalk, P.aisle])
    .map((photo) => ({ photo, shape: photo.w > photo.h ? 'land' : 'port', alt: photo.alt }));
  const person = (first, last, parents, home) => ({ name: E(first || ''), fullName: E(first ? `${first} ${last || ''}`.trim() : ''), parents: E(parents || ''), home: E(home || ''), photo: null });
  return {
    ...structuredClone(base),
    occasion,
    timeZone: tz,
    couple: {
      bride: person(o.bride, o.brideLast, single ? '' : (o.brideParents || `Mr. and Mrs. Robert ${o.brideLast}`), o.brideHome || ''),
      groom: person(o.groom, o.groomLast, o.groomParents || (o.groomLast ? `Mr. and Mrs. David ${o.groomLast}` : ''), o.groomHome || ''),
      portraits,
      hashtag: o.hashtag || '',
    },
    hosts: E(o.hosts || (single ? '' : `The ${o.brideLast} and ${o.groomLast} families`)),
    weddingDate: main.start,
    weddingDateBS: E(''),
    city: E(o.city || ''),
    invitation: {
      shloka: { sa: '', en: '' },
      salutation: E(o.salutation || (single ? 'Dear friends,' : 'Together with their families')),
      body: E(o.body || (single
        ? `Please join us for ${o.eventTitle ? o.eventTitle.toLowerCase() : 'a celebration'} in ${o.city}.`
        : `${o.bride} ${o.brideLast} and ${o.groom} ${o.groomLast} request the pleasure of your company at their wedding in ${o.city}.`)),
      request: E(o.request || 'Dinner, dancing and the people we love most. We would be so happy to have you there.'),
      signoff: E(o.signoff || 'With love'),
    },
    story: o.story || [
      { year: E('2019'), text: E('We met at a friend’s birthday dinner and talked until the restaurant closed.') },
      { year: E('2022'), text: E('A road trip, a rescue dog and our first tiny apartment.') },
      { year: E('2026'), text: E('A question asked on a quiet beach at sunrise. The answer was yes.') },
    ],
    events,
    saptapadi: [],
    gallery,
    info: {
      travel: E(o.travel || `The nearest airport is about 25 minutes away. We have arranged a shuttle from both hotels to the venue and back.`),
      stays: o.stays || [
        { name: E('The Harbor Inn'), note: E('Room block under our names until April 30'), mapQuery: `hotels near ${mapQuery}` },
        { name: E('Juniper House'), note: E('A short walk to the venue'), mapQuery: `inn near ${mapQuery}` },
      ],
      contacts: o.contacts || [
        { name: E('Megan Brooks'), role: E(single ? 'Party planner' : 'Wedding planner'), phone: '+1 843 555 0142' },
        { name: E('Chris Hale'), role: E(single ? 'Best friend' : 'Best man'), phone: '+1 843 555 0178' },
      ],
      livestream: o.livestream ?? 'https://www.youtube.com/',
    },
    rsvp: { enabled: true, endpoint: '', deadline: E(o.deadline || 'Kindly reply by May 1'), maxGuests: 4 },
    music: { volume: 0.7, tracks: [
      { title: E('Canon in D'), mood: E('Strings and harp'), src: '/audio/canon-in-d.mp3', credit: '' },
      { title: E('There Is Romance'), mood: E('Romantic'), src: '/audio/there-is-romance.mp3', credit: '' },
      { title: E('Gymnopédie No. 1'), mood: E('Piano'), src: '/audio/gymnopedie.mp3', credit: '' },
    ] },
    closing: { en: o.closing || (single ? 'We can’t wait to celebrate with you.' : 'We can’t wait to celebrate with you.'), ne: '' },
    themeContent: {},
    content: { images: {}, texts: {} },
    share: { title: `${who} · ${single ? 'You’re invited' : 'Wedding'}`, description: `You’re invited. ${main.start.slice(0, 10)}, ${o.city}.`, image: base?.share?.image || '', siteUrl: '' },
  };
}
