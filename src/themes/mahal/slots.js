// Mahal (महल) · "the palace gate" (Mangal's card behind a golden gate): every theme image and theme text, replaceable
// from the studio. Plain data, no imports (the server loads this file). See src/core/slots.js.
// Invitation data (names, parents, dates, events, card wording, gallery, travel/stays/contacts,
// RSVP, closing blessing) is edited in the studio's normal sections and is not repeated here.
// Religious marks are optional: Ganesh (type "off" in ganesh.show), ॐ and the invocation (type "-").
const couple = (id, label, n, note) => [id, { label, kind: 'couple', default: { portrait: n }, note }];
const gallery = Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`gallery.${n}`, {
  label: `Photo strip: photo ${n + 5}`, kind: 'couple', default: { portrait: n + 5 },
  note: 'The couple. In the photo strip after photos 1–5, before the invitation gallery photos. Shown whole, never cropped. Repeats are skipped.',
}]));

export default {
  theme: 'mahal',
  images: {
    'hero.ganesh': {
      label: 'Ganesh (the medallion in the gate crest, then above the names on the balcony)', kind: 'detail',
      default: { lg: '/themes/mahal/ganesh-card-1000.webp', sm: '/themes/mahal/ganesh-card-500.webp', w: 1000, h: 1793, face: [0.5, 0.41], zoom: 0.74, alt: 'Shri Ganesh with a golden crown and marigold garland' },
      note: 'A cut-out picture with a transparent background works best (PNG or WebP); the medallion shows his whole head, crown to trunk. A public-domain hand-coloured Ganesh (1842) by default. To remove it, type “off” in the Ganesh line.',
    },
    'close.ganesh': {
      label: 'Ganesh at the closing blessing (between the two diyos)', kind: 'detail',
      default: { lg: '/themes/mahal/ganesh-throne-1000.webp', sm: '/themes/mahal/ganesh-throne-500.webp', w: 1000, h: 1221, alt: 'Shri Ganesh seated on a golden throne' },
      note: 'A cut-out picture with a transparent background works best. Hidden when Ganesh is turned off.',
    },
    ...Object.fromEntries([
      couple('couple.lead', 'Main photo, just below the doors (gold temple-arch frame)', 0, 'The couple’s best photo, in its own section under शुभ विवाह. Shown whole under a gold temple-arch crown. Portrait works best.'),
      couple('couple.pair.1', 'Photo strip: photo 1', 1, 'The couple. Moves across the screen in a plain gold-line mount; shown whole, any orientation.'),
      couple('couple.pair.2', 'Photo strip: photo 2', 2, 'The couple. Shown whole; any orientation.'),
      couple('couple.row.1', 'Photo strip: photo 3', 3, 'The couple. Shown whole; any orientation.'),
      couple('couple.row.2', 'Photo strip: photo 4', 4, 'The couple. Shown whole; any orientation.'),
      couple('couple.row.3', 'Photo strip: photo 5', 5, 'The couple. Shown whole; any orientation.'),
    ]),
    'families.bride': {
      label: 'Bride portrait (families)', kind: 'bride', default: null,
      note: 'Portrait of the bride, above her family. Shown only when bride and groom both have their own photo.',
    },
    'families.groom': {
      label: 'Groom portrait (families)', kind: 'groom', default: null,
      note: 'Portrait of the groom, above his family. Shown only when bride and groom both have their own photo.',
    },
    ...gallery,
  },
  texts: {
    'gate.line': { label: 'Gate: line above the button', default: { en: 'An invitation for you and your family', ne: 'हजुरलाई सपरिवार निमन्त्रणा' }, max: 60 },
    'gate.open': { shared: 'gate.open', label: 'Gate: open button (the bow is a button too)', default: { en: 'Untie the ribbon', ne: 'रिबन खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Gate: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'ganesh.show': { label: 'Ganesh in the crest and on the balcony (type “off” to hide him)', default: { en: 'on', ne: 'on' }, max: 8 },
    'hero.invocation': { label: 'Opening: invocation line (type - to remove)', default: { en: '॥ श्री गणेशाय नमः ॥', ne: '॥ श्री गणेशाय नमः ॥' }, max: 40 },
    'hero.title': { shared: 'hero.kicker', label: 'Opening: calligraphy title (the Nepali is always shown large)', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 24 },
    'hero.blessing': { label: 'Opening: one warm line under the names', default: { en: 'Awaiting your blessings as two families become one', ne: 'हजुरको शुभ आशीर्वादको प्रतीक्षामा' }, max: 70, multiline: true },
    'hero.symbol': { label: 'Full card: sacred symbol at the top (type - to remove)', default: { en: 'ॐ', ne: 'ॐ' }, max: 6 },
    'date.kicker': { label: 'Date: small label', default: { en: 'Save the date', ne: 'शुभ साइत' }, max: 28 },
    'date.title': { label: 'Date: title above the scratch card', default: { en: 'The auspicious day', ne: 'शुभ दिन' }, max: 32 },
    'scratch.hint': { label: 'Scratch card: line on the gold foil', default: { en: 'Scratch to reveal the date', ne: 'मिति हेर्न कोर्नुहोस्' }, max: 32 },
    'scratch.button': { label: 'Scratch card: button that reveals it at once', default: { en: 'Tap to reveal', ne: 'थिचेर हेर्नुहोस्' }, max: 24 },
    'count.title': { label: 'Countdown: title', default: { en: 'Counting down to the big day', ne: 'शुभ घडी आउन बाँकी' }, max: 36 },
    'couple.title': { shared: 'couple.title', label: 'Photos: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 28 },
    'couple.line': { shared: 'couple.line', label: 'Photos: one line', default: { en: 'Soon to be married, with the blessings of both families.', ne: 'दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।' }, max: 90, multiline: true },
    'families.title': { label: 'Families: title', default: { en: 'With the blessings of our families', ne: 'दुवै परिवारको आशीर्वादसहित' }, max: 48 },
    'families.bride': { label: 'Families: bride label', default: { en: 'The bride', ne: 'दुलही' }, max: 20 },
    'families.groom': { label: 'Families: groom label', default: { en: 'The groom', ne: 'दुलहा' }, max: 20 },
    'families.daughter': { label: 'Families: “daughter of”', default: { en: 'Daughter of', ne: 'सुपुत्री' }, max: 20 },
    'families.son': { label: 'Families: “son of”', default: { en: 'Son of', ne: 'सुपुत्र' }, max: 20 },
    'card.kicker': { label: 'Card wording: small label', default: { en: 'The invitation card', ne: 'निमन्त्रणा पत्र' }, max: 28 },
    'card.line': { shared: 'hero.line', label: 'Card wording: the one line of invitation', default: { en: 'We joyfully invite you and your family to bless the couple with your presence.', ne: 'शुभ विवाहमा सपरिवार पधारी आशीर्वाद दिनुहुन हार्दिक अनुरोध छ।' }, max: 100, multiline: true },
    'card.button': { shared: 'card.button', label: 'Button: read the full card', default: { en: 'Read the full invitation', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'prog.kicker': { label: 'Programme: small label', default: { en: 'When and where', ne: 'कहिले र कहाँ' }, max: 28 },
    'prog.title': { shared: 'events.title', label: 'Programme: title', default: { en: 'The programme', ne: 'कार्यक्रम' }, max: 32 },
    'prog.more': { label: 'Programme: travel/stays/contacts toggle', default: { en: 'Travel, stays and contacts', ne: 'यात्रा, बसाइ र सम्पर्क' }, max: 36 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 32 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
  },
  // Hero/opening colours the client may change (see docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--mh-night': { label: 'Night shade around the gate', default: '#050E2A', note: 'The dark that frames the painted gate and sits behind the names on the balcony (the gate and the palace are paintings and keep their colours).' },
    '--mh-gold-lt': { label: 'Light gold (invocation, WEDS, scroll cue)', default: '#F6D98C', note: 'Keep it light: it is text on the night.' },
    '--mg-red': { label: 'Main red', default: '#8C1018', note: 'The velvet curtains on the balcony and the card under the gate; also frames, buttons and headings below.' },
    '--mg-ivory': { label: 'Page ivory', default: '#F8F1E3', note: 'Tints the handmade paper of the page below the opening.' },
  },
};
