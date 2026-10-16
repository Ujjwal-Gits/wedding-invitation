// Chitra · studio-replaceable images and texts (plain data, no imports).
// Read through useSlots(manifest) in src/core/slots.js.
export default {
  // Faith (docs/PLATFORM.md "Religion"): the communities this design suits once its symbols and words are swapped. Not for others: the storybook paints the seven rounds of the fire.
  religions: ['hindu'],
  theme: 'chitra',
  images: {
    'title.photo': { label: 'Title page: framed couple photo', kind: 'couple', default: { portrait: 0 }, note: 'The couple together. Portrait or landscape both fit; the frame takes the photo’s own shape.' },
    'swayambar.photo': { shared: 'rite.swayambar', label: 'Swayambar: photo hanging on the painted wall', kind: 'couple', default: { portrait: 5 }, note: 'The couple, bright and clear. Portrait works best.' },
    'sindoor.bride': { label: 'Sindoor: the bride’s framed portrait', kind: 'bride', default: { portrait: 3 }, note: 'The bride alone. Portrait.' },
    'sindoor.groom': { label: 'Sindoor: the groom’s framed portrait', kind: 'groom', default: { portrait: 6 }, note: 'The groom alone. Portrait.' },
    'reception.photo': { label: 'Reception: photo on the easel', kind: 'couple', default: { portrait: 1 }, note: 'A bright photo of the couple; avoid dark or black backgrounds (the scene is at night).' },
  },
  texts: {
    'cover.kicker': { label: 'Cover: small line above the names', default: { en: 'A wedding storybook', ne: 'विवाहको चित्रकथा' }, max: 40 },
    'cover.open': { shared: 'gate.open', label: 'Cover: open button', default: { en: 'Open the book', ne: 'किताब खोल्नुहोस्' }, max: 28 },
    'cover.quiet': { shared: 'gate.quiet', label: 'Cover: open without music', default: { en: 'Without music', ne: 'संगीतबिना' }, max: 28 },
    'card.button': { shared: 'card.button', label: 'Title page: read-the-card button', default: { en: 'Read the invitation card', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'title.kicker': { shared: 'hero.kicker', label: 'Title page: line above the names', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 40 },
    'title.cue': { label: 'Title page: scroll hint', default: { en: 'Scroll to turn the page', ne: 'पाना पल्टाउन तल सार्नुहोस्' }, max: 40 },
    'janti.title': { label: 'Page 1 title (Janti)', default: { en: 'The Janti arrives', ne: 'जन्ती आगमन' }, max: 40 },
    'swayambar.title': { shared: 'rite.swayambar.title', label: 'Page 2 title (Swayambar)', default: { en: 'Swayambar', ne: 'स्वयम्बर' }, max: 40 },
    'swayambar.line': { shared: 'rite.swayambar.line', label: 'Page 2 line', default: { en: 'Garlands before both families', ne: 'दुवै परिवारसामु माला साटासाट' }, max: 70 },
    'pheras.title': { shared: 'rite.saptapadi.title', label: 'Page 3 title (seven rounds)', default: { en: 'Seven rounds of the fire', ne: 'अग्नि परिक्रमा, सप्तपदी' }, max: 40 },
    'pheras.hint': { label: 'Page 3 hint before the first round', default: { en: 'Scroll to walk the seven rounds', ne: 'सात फेरा हिँड्न तल सार्नुहोस्' }, max: 60 },
    'sindoor.title': { shared: 'rite.sindoor.title', label: 'Page 4 title (Sindoor)', default: { en: 'Sindoor', ne: 'सिन्दूर हाल्ने' }, max: 40 },
    'sindoor.line': { shared: 'rite.sindoor.line', label: 'Page 4 line', default: { en: 'A line of vermilion, a promise for life', ne: 'सिउँदोको सिन्दूर, जीवनभरको वाचा' }, max: 70 },
    'reception.cta': { label: 'Page 5 button', default: { en: 'Reply to the invitation', ne: 'जवाफ दिनुहोस्' }, max: 32 },
    'days.title': { shared: 'events.title', label: 'Programme page title', default: { en: 'The days', ne: 'कार्यक्रमहरू' }, max: 40 },
    'days.cta': { label: 'Programme page button', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 32 },
    'gallery.eyebrow': { shared: 'gallery.kicker', label: 'Photo section: small line', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 40 },
    'gallery.title': { shared: 'gallery.title', label: 'Photo section: title', default: { en: 'Soon, one family', ne: 'चाँडै, एउटै परिवार' }, max: 50 },
  },
  // Hero/opening colours the client may change (see docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--indigo': { label: 'Cover indigo', default: '#25345e' },
    '--paper': { label: 'Paper', default: '#ffffff' },
    '--turmeric': { label: 'Turmeric gold', default: '#e5a52a' },
    '--verm': { label: 'Vermilion', default: '#b8321a' },
  },
  // Mix (docs/MIX.md): which parts this theme gives to other pages and which it takes. Plain data (the server reads it).
  parts: {
    gate: true, hero: false, hostGate: true, hostHero: false,
    ownGateNeedsHero: false, // the cover swings open onto whatever first screen is beneath
    why: {
      hero: 'Chitra’s first screen is the first page of its painted storybook, so it only comes with the rest of the book.',
      hostHero: 'Chitra’s pages turn like a book from its own title page, so another first screen can’t take that page’s place.',
    },
    gateUses: { texts: ['cover.kicker', 'cover.open', 'cover.quiet'], images: [], colors: ['--indigo', '--turmeric'] },
    heroUses: { texts: [], images: [], colors: [] },
  },
};
