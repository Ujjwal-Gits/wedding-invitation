// Himal · "Himalayan minimal": every theme image and theme text, replaceable from the studio.
// Plain data, no imports (the server loads this file). See src/core/slots.js.
// Invitation data (names, parents, dates, events + their photos, card wording, story, gallery,
// travel/stay/contacts, RSVP) is edited in the studio's normal sections and is not repeated here.
const essay = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`essay.${i + 1}`, {
  label: `Photo essay, photo ${i + 1}`, kind: 'couple', default: { portrait: i + 1 },
  note: 'The couple. Any orientation: shown whole in its own frame on charcoal; two portrait photos (or two landscape on phones) pair up side by side. Repeats of other slots are skipped.',
}]));
const album = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`album.${i + 1}`, {
  label: `Album, couple photo ${i + 1}`, kind: 'couple', default: { portrait: i + 8 },
  note: 'The couple. Leads the album grid, before the gallery photos. Shown uncropped. Repeats are skipped.',
}]));

export default {
  // Faith (docs/PLATFORM.md "Religion"): the communities this design suits once its symbols and words are swapped.
  religions: ['hindu', 'buddhist', 'kirat', 'muslim', 'christian', 'other'],
  theme: 'himal',
  images: {
    'hero.dawn': {
      shared: 'place.mountain', label: 'Opening mountain (the sunrise)', kind: 'scene', default: 'himalaya-dawn',
      alt: 'Machhapuchhre before sunrise',
      note: 'Landscape, a mountain silhouette against open sky with a dark foreground ridge across the bottom third (the names sit there). The sun rises from just behind the main peak; library photos with a depth map get the light and mist effects at full strength.',
    },
    'intro.photo': {
      label: 'Portrait plate beside the families', kind: 'couple', default: { portrait: 0 },
      note: 'The couple together, any orientation, shown uncropped. Replaced by a bride + groom pair when both have their own photo.',
    },
    'intro.bridePhoto': {
      label: 'Bride portrait (intro pair)', kind: 'bride', default: null,
      note: 'Portrait of the bride. The pair is shown only when bride and groom both have photos.',
    },
    'intro.groomPhoto': {
      label: 'Groom portrait (intro pair)', kind: 'groom', default: null,
      note: 'Portrait of the groom. The pair is shown only when bride and groom both have photos.',
    },
    ...essay,
    ...album,
    'travel.arrive': { nonHindu: 'phewa-lake', /* a temple photo: its neutral twin for other communities */
      shared: 'place.night', label: 'Travel: arriving', kind: 'scene', default: 'kathmandu-night-alt',
      alt: 'The gilded roof of Taleju temple, Patan, at night',
      note: 'Landscape, the city or region of the wedding. No people in focus.',
    },
    'travel.stay': { nonHindu: 'lights-garden', /* a temple photo: its neutral twin for other communities */
      shared: 'place.courtyard', label: 'Travel: staying', kind: 'scene', default: 'courtyard-dusk-alt',
      alt: 'Taumadhi Square, Bhaktapur, at blue hour',
      note: 'Landscape, a heritage street, square or hotel. No people in focus.',
    },
    'travel.ask': {
      shared: 'place.garden', label: 'Travel: questions', kind: 'scene', default: 'garden-of-dreams',
      alt: 'The Garden of Dreams pavilion, Kathmandu',
      note: 'Landscape, a calm place near the venue.',
    },
    'close.photo': {
      shared: 'place.closing', label: 'Closing mountain (dusk)', kind: 'scene', default: 'himalaya-dawn-alt',
      alt: 'Everest and Lhotse lit pink at the end of the day',
      note: 'Landscape, mountains at dusk or another calm, wide view. Shown uncropped.',
    },
  },
  texts: {
    'gate.from': { label: 'Gate: line above the families', default: { en: 'An invitation from', ne: 'हार्दिक निमन्त्रणा' }, max: 40 },
    'gate.open': { shared: 'gate.open', label: 'Gate: open button', default: { en: 'Open at first light', ne: 'निम्तो खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Gate: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'hero.eyebrow': { shared: 'hero.kicker', label: 'Hero: small line above the names', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 32 },
    'intro.line': { shared: 'couple.line', label: 'Intro: the one line', default: { en: 'With the blessings of our elders, we are to be married.', ne: 'गुरुजनको आशीर्वादसहित हामी विवाह बन्धनमा बाँधिँदैछौं।' }, max: 90, multiline: true },
    'intro.bride': { label: 'Intro: bride label', default: { en: 'The bride', ne: 'दुलही' }, max: 20 },
    'intro.groom': { label: 'Intro: groom label', default: { en: 'The groom', ne: 'दुलहा' }, max: 20 },
    'intro.daughter': { label: 'Intro: “daughter of”', default: { en: 'Daughter of', ne: 'सुपुत्री' }, max: 20 },
    'intro.son': { label: 'Intro: “son of”', default: { en: 'Son of', ne: 'सुपुत्र' }, max: 20 },
    'intro.card': { shared: 'card.button', label: 'Intro: link to the full card', default: { en: 'Read the invitation card', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'card.title': { label: 'Invitation card: title', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 32 },
    'essay.title': { shared: 'couple.title', label: 'Photo essay: label', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 28 },
    'days.eyebrow': { label: 'Ceremonies: small label', default: { en: 'The ceremonies', ne: 'कार्यक्रमहरू' }, max: 28 },
    'days.title': { shared: 'events.title', label: 'Ceremonies: title', default: { en: 'Where to find us', ne: 'हामी कहाँ हुनेछौं' }, max: 40 },
    'days.order': { label: 'Ceremonies: order-of-the-day toggle', default: { en: 'Order of the day', ne: 'दिनको क्रम' }, max: 28 },
    'travel.eyebrow': { label: 'Travel: small label', default: { en: 'Travel & stay', ne: 'यात्रा तथा बसाइ' }, max: 28 },
    'travel.arrive': { label: 'Travel: arriving title', default: { en: 'Arriving', ne: 'आगमन' }, max: 24 },
    'travel.stay': { label: 'Travel: staying title', default: { en: 'Staying', ne: 'बसाइ' }, max: 24 },
    'travel.ask': { label: 'Travel: questions title', default: { en: 'Questions', ne: 'सोधपुछ' }, max: 24 },
    'album.eyebrow': { shared: 'gallery.kicker', label: 'Album: small label', default: { en: 'Album', ne: 'एल्बम' }, max: 24 },
    'album.title': { shared: 'gallery.title', label: 'Album: title', default: { en: 'A few more', ne: 'केही थप तस्बिर' }, max: 40 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 40 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
  },
  // Hero/opening colours the client may change (see docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--hm-snow': { label: 'Snow white (gate, names)', default: '#FFFFFF' },
    '--hm-accent': { label: 'Accent brown', default: '#8A5A3C' },
    '--hm-night': { label: 'Night', default: '#1A1D20' },
  },
  // Mix (docs/MIX.md): which parts this theme gives to other pages and which it takes. Plain data (the server reads it).
  parts: {
    gate: false, hero: false, hostGate: true, hostHero: false,
    why: {
      gate: 'Its opening is a few words over the moving mountain dawn; without the dawn behind them it would look empty.',
      hero: 'Its first screen is the sunrise over the mountain, which only plays on its own page.',
      hostHero: 'The sunrise is the first screen here and the page grows out of it, so it cannot be replaced.',
    },
  },
};
