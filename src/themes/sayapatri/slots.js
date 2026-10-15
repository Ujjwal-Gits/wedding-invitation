// Sayapatri · studio-replaceable images and texts (plain data, no imports).
// Read through useSlots(manifest) in src/core/slots.js. Every couple photo is shown whole, at its own
// proportions (no arches, circles or crops), so nothing important is cut.
// `shared` points an entry at src/core/slot-vocab.js so content entered in any theme appears here too.
export default {
  theme: 'sayapatri',
  images: {
    'hero.photo': { label: 'Welcome: feature photo of the couple', kind: 'couple', default: { portrait: 0 }, note: 'The couple together. Any shape; shown whole beside the names.' },
    'pair.left': { label: 'Framed pair: left photo', kind: 'bride', default: { portrait: 1 }, note: 'The bride, or the two of you. Portrait.' },
    'pair.right': { label: 'Framed pair: right photo', kind: 'groom', default: { portrait: 2 }, note: 'The groom, or the two of you. Portrait.' },
    'band.1': { label: 'Quiet row: first photo', kind: 'couple', default: { portrait: 3 }, note: 'Any shape; the row lines the photos up at one height without cropping.' },
    'band.2': { label: 'Quiet row: second photo', kind: 'couple', default: { portrait: 4 }, note: 'Any shape.' },
    'band.3': { label: 'Quiet row: third photo', kind: 'couple', default: { portrait: 5 }, note: 'Any shape.' },
    'prints.1': { label: 'Photo trio: large photo', kind: 'couple', default: { portrait: 6 }, note: 'A relaxed photo of the two of you. Shown large, whole.' },
    'prints.2': { label: 'Photo trio: small photo, top', kind: 'couple', default: { portrait: 7 }, note: 'A relaxed photo of the two of you.' },
    'prints.3': { label: 'Photo trio: small photo, bottom', kind: 'couple', default: { portrait: 8 }, note: 'A relaxed photo of the two of you.' },
    'closing.photo': { label: 'Closing: small photo above the blessing', kind: 'couple', shared: 'place.closing', default: { portrait: 9 }, note: 'The couple. Any shape; shown whole in a small frame.' },
  },
  texts: {
    'gate.kicker': { label: 'Opening: small line above the names', shared: 'hero.kicker', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 40 },
    'gate.line': { label: 'Opening: line under the names', shared: 'gate.line', default: { en: 'You are warmly invited', ne: 'हजुरलाई हार्दिक निमन्त्रणा' }, max: 60 },
    'gate.open': { label: 'Opening: main button', shared: 'gate.open', default: { en: 'Open the invitation', ne: 'निमन्त्रणा खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { label: 'Opening: quiet button', shared: 'gate.quiet', default: { en: 'Without music', ne: 'संगीतबिना' }, max: 24 },
    'hero.kicker': { label: 'Welcome: small line above the names', default: { en: 'Together with our families', ne: 'परिवारसहित' }, max: 40 },
    'hero.line': { label: 'Welcome: line under the date', shared: 'hero.line', default: { en: 'We would love you beside us as we marry.', ne: 'हाम्रो विवाहमा हजुरको साथ चाहन्छौं।' }, max: 90 },
    'pair.title': { label: 'Framed pair: title', shared: 'couple.title', default: { en: 'Two families, one sacred fire', ne: 'दुई परिवार, एउटै अग्नि' }, max: 50 },
    'pair.bride.line': { label: 'Framed pair: bride line ({parents} = her parents)', shared: 'bride.line', default: { en: 'Daughter of {parents}', ne: '{parents}की सुपुत्री' }, max: 120 },
    'pair.groom.line': { label: 'Framed pair: groom line ({parents} = his parents)', shared: 'groom.line', default: { en: 'Son of {parents}', ne: '{parents}का सुपुत्र' }, max: 120 },
    'pair.card': { label: 'Framed pair: link to the full card wording', shared: 'card.button', default: { en: 'Read the invitation card', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'prints.title': { label: 'Photo trio: title', shared: 'couple.line', default: { en: 'Soon, one family', ne: 'चाँडै, एउटै परिवार' }, max: 40 },
    'prog.kicker': { label: 'Programme: small line', default: { en: 'When and where', ne: 'कहिले र कहाँ' }, max: 30 },
    'prog.title': { label: 'Programme: title', shared: 'events.title', default: { en: 'The programme', ne: 'कार्यक्रम तालिका' }, max: 40 },
    'gallery.title': { label: 'Photos: title', shared: 'gallery.title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 40 },
    'nav.welcome': { label: 'Side menu: welcome', default: { en: 'Welcome', ne: 'स्वागत' }, max: 20 },
    'nav.couple': { label: 'Side menu: couple', default: { en: 'The couple', ne: 'जोडी' }, max: 20 },
    'nav.prog': { label: 'Side menu: programme', default: { en: 'Programme', ne: 'कार्यक्रम' }, max: 20 },
    'nav.gallery': { label: 'Side menu: photos', default: { en: 'Photos', ne: 'तस्बिर' }, max: 20 },
    'nav.reply': { label: 'Side menu: reply', default: { en: 'Reply', ne: 'जवाफ' }, max: 20 },
  },
  // Hero/opening colours the client may change (see docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--red': { label: 'Red (names)', default: '#8E1C22' },
    '--saffron': { label: 'Saffron (date)', default: '#E8890C' },
    '--saffron-ink': { label: 'Deep saffron (small lines)', default: '#9A4A06' },
    '--leaf': { label: 'Leaf green', default: '#2E4A27' },
    '--white': { label: 'Background', default: '#FFFFFF' },
  },
};
