// Phoolbari (फूलबारी) · slug "gurans": every theme image and theme text, replaceable from the studio.
// Plain data, no imports (the server loads this file). See src/core/slots.js.
// Invitation data (names, parents, dates, events, card wording, gallery, travel/stay/contacts,
// RSVP, closing line) is edited in the studio's normal sections and is not repeated here.
// The floral gate and the flower arrangements are theme art (cut-out flower photographs), not slots.
const album = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`album.${i + 1}`, {
  label: `Album, couple photo ${i + 1}`, kind: 'couple', default: { portrait: i + 4 },
  note: 'The couple. Shown whole (never cropped) in alternating frames. Repeats of photos used elsewhere are skipped.',
}]));

export default {
  theme: 'gurans',
  images: {
    'hero.photo': {
      label: 'Welcome: main couple photo', kind: 'couple', default: { portrait: 0 },
      note: 'The couple together, portrait works best. Framed with roses at two corners; the corners are covered by flowers, so keep faces away from the very corners.',
    },
    'couple.first': {
      label: 'The two of us: first photo', kind: 'couple', default: { portrait: 1 },
      note: 'The couple, any orientation, in a white mat with a fine gold line. Replaced by the bride’s portrait when bride and groom both have one.',
    },
    'couple.second': {
      label: 'The two of us: second photo', kind: 'couple', default: { portrait: 2 },
      note: 'The couple, any orientation, as a tilted print with a caption strip. Replaced by the groom’s portrait when both have one.',
    },
    'couple.bride': { label: 'Bride portrait', kind: 'bride', default: null, note: 'Portrait of the bride (used when the groom’s portrait is uploaded too).' },
    'couple.groom': { label: 'Groom portrait', kind: 'groom', default: null, note: 'Portrait of the groom (used when the bride’s portrait is uploaded too).' },
    'programme.photo': {
      label: 'Programme: couple photo', kind: 'couple', default: { portrait: 3 },
      note: 'The couple, portrait, in a blush mat beside the programme on wide screens.',
    },
    ...album,
    'close.photo': {
      label: 'Blessing: closing photo', kind: 'couple', default: { portrait: 12 },
      note: 'A calm photo of the couple for the last screen, any orientation, framed by a posy of roses.',
    },
  },
  texts: {
    'gate.crest': { label: 'Gate: lettering on the crest', default: { en: 'शुभ विवाह', ne: 'शुभ विवाह' }, max: 16 },
    'gate.welcome': { label: 'Gate: welcome board heading', default: { en: 'Welcome', ne: 'स्वागतम्' }, max: 20 },
    'gate.line': { shared: 'gate.line', label: 'Gate: line under the names', default: { en: 'request the pleasure of your company', ne: 'को शुभ विवाहमा हजुरलाई हार्दिक निम्तो' }, max: 60 },
    'gate.open': { shared: 'gate.open', label: 'Gate: open button', default: { en: 'Open the gate', ne: 'ढोका खोल्नुहोस्' }, max: 24 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Gate: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'hero.kicker': { shared: 'hero.kicker', label: 'Welcome: small line above the names', default: { en: 'Together with their families', ne: 'परिवारजनको आशीर्वादसहित' }, max: 40 },
    'hero.line': { shared: 'hero.line', label: 'Welcome: line under the names', default: { en: 'are getting married', ne: 'विवाह बन्धनमा बाँधिँदै छन्' }, max: 48 },
    'couple.title': { shared: 'couple.title', label: 'The two of us: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 32 },
    'couple.line': { shared: 'couple.line', label: 'The two of us: one line', default: { en: 'With the blessings of our elders, we are to be married.', ne: 'गुरुजनको आशीर्वादसहित हामी विवाह गर्दैछौं।' }, max: 90, multiline: true },
    'couple.brideLabel': { label: 'Families: bride label', default: { en: 'The bride', ne: 'दुलही' }, max: 20 },
    'couple.groomLabel': { label: 'Families: groom label', default: { en: 'The groom', ne: 'दुलहा' }, max: 20 },
    'couple.daughter': { label: 'Families: “daughter of”', default: { en: 'Daughter of', ne: 'सुपुत्री' }, max: 20 },
    'couple.son': { label: 'Families: “son of”', default: { en: 'Son of', ne: 'सुपुत्र' }, max: 20 },
    'card.button': { shared: 'card.button', label: 'Button: read the invitation card', default: { en: 'Read the invitation card', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'card.title': { label: 'Invitation card: title', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 32 },
    'programme.kicker': { label: 'Programme: small label', default: { en: 'When & where', ne: 'कहिले, कहाँ' }, max: 28 },
    'programme.title': { shared: 'events.title', label: 'Programme: title', default: { en: 'The programme', ne: 'कार्यक्रम' }, max: 40 },
    'programme.order': { label: 'Programme: order-of-the-day toggle', default: { en: 'Order of the day', ne: 'दिनको क्रम' }, max: 28 },
    'album.kicker': { shared: 'gallery.kicker', label: 'Album: small label', default: { en: 'Photographs', ne: 'तस्बिरहरू' }, max: 24 },
    'album.title': { shared: 'gallery.title', label: 'Album: title', default: { en: 'A few more of us', ne: 'हाम्रा केही तस्बिर' }, max: 40 },
    'info.kicker': { label: 'Guest notes: small label', default: { en: 'For our guests', ne: 'पाहुनाहरूका लागि' }, max: 28 },
    'info.travel': { label: 'Guest notes: travel title', default: { en: 'Getting there', ne: 'आइपुग्ने बाटो' }, max: 24 },
    'info.stay': { label: 'Guest notes: stays title', default: { en: 'Where to stay', ne: 'बस्ने ठाउँ' }, max: 24 },
    'info.ask': { label: 'Guest notes: contacts title', default: { en: 'Questions', ne: 'सोधपुछ' }, max: 24 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 40 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
    'close.kicker': { label: 'Blessing: small line above the closing words', default: { en: 'With love', ne: 'मायासहित' }, max: 32 },
  },
  // Hero/opening colours the client may change (see docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--rose': { label: 'Rose (buttons, links)', default: '#9E4659' },
    '--gold-text': { label: 'Gold text', default: '#8A6731' },
    '--sage-deep': { label: 'Deep sage', default: '#43574A' },
    '--paper': { label: 'Paper', default: '#FBF7F3' },
  },
  // Mix (docs/MIX.md): which parts this theme gives to other pages and which it takes. Plain data (the server reads it).
  parts: {
    gate: true, hero: true, hostGate: true, hostHero: true,
    ownGateNeedsHero: false, // the arch clears onto whatever first screen is beneath it
    gateUses: { texts: ['gate.crest', 'gate.welcome', 'gate.line', 'gate.open', 'gate.quiet'], images: [], colors: ['--rose', '--gold-text'] },
    heroUses: { texts: ['hero.kicker', 'hero.line'], images: ['hero.photo'], colors: ['--gold-text', '--sage-deep', '--paper'] },
  },
};
