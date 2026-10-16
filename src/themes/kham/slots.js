// Kham (खाम) · "the envelope": every theme image and theme text, replaceable from the studio.
// Plain data, no imports (the server loads this file). See src/core/slots.js.
// Invitation data (names, parents, dates, events, card wording, gallery, travel/stays/contacts,
// RSVP, closing blessing) is edited in the studio's normal sections and is not repeated here.
const prints = Object.fromEntries([1, 2, 3].map((n) => [`prints.${n}`, {
  label: `“The two of us”, print ${n}`, kind: 'couple', default: { portrait: n },
  note: 'The couple. Any orientation; shown whole as a mounted print with a deckled edge. Repeats of other slots are skipped.',
}]));
const album = Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`album.${n}`, {
  label: `Album, couple photo ${n}`, kind: 'couple', default: { portrait: n + 3 },
  note: 'The couple. Leads the album, before the gallery photos. Shown uncropped. Repeats are skipped.',
}]));

export default {
  // Faith (docs/PLATFORM.md "Religion"): the communities this design suits once its symbols and words are swapped. Not for others: the endless knot (shrivatsa) is the seal and the motif.
  religions: ['hindu', 'other'],
  theme: 'kham',
  images: {
    'hero.print': {
      label: 'Print tucked in the envelope', kind: 'couple', default: { portrait: 0 },
      note: 'The couple’s best photo. Slides out of the envelope with the card and rests beside it on wide screens (first print on phones). Portrait works best; shown uncropped.',
    },
    ...prints,
    'families.bride': {
      label: 'Bride portrait (families)', kind: 'bride', default: null,
      note: 'Portrait of the bride. Shown above her family only when bride and groom both have their own photo.',
    },
    'families.groom': {
      label: 'Groom portrait (families)', kind: 'groom', default: null,
      note: 'Portrait of the groom. Shown above his family only when bride and groom both have their own photo.',
    },
    ...album,
  },
  texts: {
    'gate.line': { shared: 'gate.line', label: 'Envelope: line above the names', default: { en: 'An invitation for you and your family', ne: 'हजुर र हजुरको परिवारका लागि निम्तो' }, max: 60 },
    'gate.open': { shared: 'gate.open', label: 'Envelope: “tap the seal” hint', default: { en: 'Tap the seal to open', ne: 'खोल्न छापमा थिच्नुहोस्' }, max: 32 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Envelope: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'card.invocation': { label: 'Card: invocation at the top', default: { en: '॥ श्री गणेशाय नमः ॥', ne: '॥ श्री गणेशाय नमः ॥' }, max: 40 },
    'card.title': { shared: 'hero.kicker', label: 'Card: title (Nepali is always shown large)', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 28 },
    'card.line': { shared: 'hero.line', label: 'Card: the one line of invitation', default: { en: 'We joyfully invite you and your family to celebrate with us.', ne: 'हाम्रो शुभ विवाहमा हजुरलाई सपरिवार हार्दिक निमन्त्रणा छ।' }, max: 90, multiline: true },
    'card.button': { shared: 'card.button', label: 'Button: read the full card', default: { en: 'Read the full invitation', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'prints.title': { shared: 'couple.title', label: 'Photos: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 28 },
    'prints.line': { shared: 'couple.line', label: 'Photos: one line', default: { en: 'Soon to be married, with the blessings of both families.', ne: 'दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।' }, max: 90, multiline: true },
    'prog.kicker': { label: 'Programme: small label', default: { en: 'When and where', ne: 'कहिले र कहाँ' }, max: 28 },
    'prog.title': { shared: 'events.title', label: 'Programme: title', default: { en: 'The programme', ne: 'कार्यक्रम' }, max: 32 },
    'prog.order': { label: 'Programme: order-of-the-day label', default: { en: 'Order of the day', ne: 'दिनको क्रम' }, max: 28 },
    'prog.more': { label: 'Programme: travel/stays/contacts toggle', default: { en: 'Travel, stays and contacts', ne: 'यात्रा, बसाइ र सम्पर्क' }, max: 36 },
    'families.title': { label: 'Families: title', default: { en: 'With the blessings of our families', ne: 'दुवै परिवारको आशीर्वादसहित' }, max: 48 },
    'families.bride': { label: 'Families: bride label', default: { en: 'The bride', ne: 'दुलही' }, max: 20 },
    'families.groom': { label: 'Families: groom label', default: { en: 'The groom', ne: 'दुलहा' }, max: 20 },
    'families.daughter': { label: 'Families: “daughter of”', default: { en: 'Daughter of', ne: 'सुपुत्री' }, max: 20 },
    'families.son': { label: 'Families: “son of”', default: { en: 'Son of', ne: 'सुपुत्र' }, max: 20 },
    'album.title': { shared: 'gallery.title', label: 'Album: title', default: { en: 'A few more', ne: 'केही थप तस्बिर' }, max: 32 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 32 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
  },
  // Hero/opening colours the client may change (see docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--kh-sindoor': { label: 'Sindoor red', default: '#9A1B1F' },
    '--kh-card': { label: 'Card', default: '#FCFAF5' },
    '--kh-page': { label: 'Page', default: '#F7F3EB' },
  },
  // Mix (docs/MIX.md): which parts this theme gives to other pages and which it takes. Plain data (the server reads it).
  parts: {
    gate: false, hero: true, hostGate: true, hostHero: true,
    // the envelope opens into the card itself: with another first screen, another theme's gate is needed too
    ownGateNeedsHero: true,
    why: {
      gate: 'Kham’s envelope opens into its own card, so the envelope only comes with Kham’s first screen.',
    },
    heroUses: { texts: ['card.invocation', 'card.title', 'card.line'], images: ['hero.print'], colors: ['--kh-sindoor', '--kh-card', '--kh-page'] },
  },
};
