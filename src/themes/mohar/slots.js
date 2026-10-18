// Mohar (मोहर) · the royal seal: every theme image and text, replaceable from the studio. Plain data, no imports (the server loads this file).
// Invitation data (names, parents, dates, events, card wording, gallery, RSVP, closing) lives in the studio sections.
export default {
  // Faith (docs/PLATFORM.md "Religion"): a brass seal, red lac, parchment and an indigo cloth. No sacred image in the
  // art; the invocation line and शुभ विवाह follow the community (src/core/faith.js), so the design suits every one.
  religions: ['hindu', 'buddhist', 'kirat', 'muslim', 'christian', 'other'],
  // Sold on both sites (src/core/markets.js): neutral art, English and Nepali, any venue time zone.
  market: 'both',
  style: 'classic',
  occasions: ['wedding', 'engagement', 'anniversary', 'vow-renewal'],
  theme: 'mohar',
  images: {
    'couple.lead': { label: 'Main photo of the couple (the blessing page of the decree)', kind: 'couple', default: { portrait: 0 }, note: 'Shown whole in a brass frame. Portrait works best.' },
    'gallery.1': { label: 'Portraits: photo 1', kind: 'couple', default: { portrait: 1 }, note: 'Each photo sits whole in a brass frame. Repeats are skipped.' },
    'gallery.2': { label: 'Portraits: photo 2', kind: 'couple', default: { portrait: 2 }, note: 'Each photo sits whole in a brass frame. Repeats are skipped.' },
    'gallery.3': { label: 'Portraits: photo 3', kind: 'couple', default: { portrait: 3 }, note: 'Each photo sits whole in a brass frame. Repeats are skipped.' },
    'gallery.4': { label: 'Portraits: photo 4', kind: 'couple', default: { portrait: 4 }, note: 'Each photo sits whole in a brass frame. Repeats are skipped.' },
    'gallery.5': { label: 'Portraits: photo 5', kind: 'couple', default: { portrait: 5 }, note: 'Each photo sits whole in a brass frame. Repeats are skipped.' },
    'gallery.6': { label: 'Portraits: photo 6', kind: 'couple', default: { portrait: 6 }, note: 'Each photo sits whole in a brass frame. Repeats are skipped.' },
    'families.bride': { label: 'Bride portrait (families page)', kind: 'bride', default: null, note: 'Shown only when bride and groom both have their own photo.' },
    'families.groom': { label: 'Groom portrait (families page)', kind: 'groom', default: null, note: 'Shown only when bride and groom both have their own photo.' },
  },
  texts: {
    'gate.line': { label: 'Opening: line above the button', default: { en: 'A sealed invitation, for you', ne: 'हजुरका लागि मोहर लगाइएको निम्तो' }, max: 60 },
    'gate.hint': { label: 'Opening: under the seal, before it is pressed', default: { en: 'Press and hold the seal', ne: 'मोहर थिचिराख्नुहोस्' }, max: 36 },
    'gate.after': { label: 'Opening: under the seal, once it is pressed', default: { en: 'Tap the seal to break it', ne: 'खोल्न मोहरमा छुनुहोस्' }, max: 36 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Break the seal', ne: 'मोहर खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'seal.initials': { label: 'Seal: the two letters on it (leave empty for your first letters)', default: { en: '', ne: '' }, max: 6 },
    'hero.invocation': { label: 'Decree: invocation (type - to remove)', default: { en: '॥ श्री गणेशाय नमः ॥', ne: '॥ श्री गणेशाय नमः ॥' }, max: 40 },
    'hero.title': { shared: 'hero.kicker', label: 'Decree: title', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 24 },
    'hero.line': { label: 'Decree: one line above the names', default: { en: 'With the blessings of both families, we announce the wedding of', ne: 'दुवै परिवारको शुभ आशीर्वादसहित हाम्रो शुभ विवाहको घोषणा' }, max: 90, multiline: true },
    'decree.kicker': { label: 'Farman: small label on the first page', default: { en: 'By this decree', ne: 'यस फर्मानद्वारा' }, max: 28 },
    'decree.title': { label: 'Farman: title of the first page', default: { en: 'You are invited', ne: 'हजुरलाई निम्तो' }, max: 32 },
    'card.line': { shared: 'hero.line', label: 'Card wording: the one line of invitation', default: { en: 'We joyfully invite you and your family to bless the couple with your presence.', ne: 'शुभ विवाहमा सपरिवार पधारी आशीर्वाद दिनुहुन हार्दिक अनुरोध छ।' }, max: 100, multiline: true },
    'card.button': { shared: 'card.button', label: 'Button: read the full card', default: { en: 'Read the full invitation', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'families.title': { label: 'Families: title', default: { en: 'Two families', ne: 'दुई परिवार' }, max: 48 },
    'prog.kicker': { label: 'Programme: small label', default: { en: 'When and where', ne: 'कहिले र कहाँ' }, max: 28 },
    'prog.title': { shared: 'events.title', label: 'Programme: title', default: { en: 'The celebrations', ne: 'कार्यक्रम' }, max: 32 },
    'venue.title': { label: 'Venue page: title', default: { en: 'The venue', ne: 'विवाहस्थल' }, max: 32 },
    'date.kicker': { label: 'Countdown page: small label', default: { en: 'Save the date', ne: 'शुभ साइत' }, max: 28 },
    'count.title': { label: 'Countdown: title', default: { en: 'Until the big day', ne: 'शुभ घडी आउन बाँकी' }, max: 36 },
    'bless.title': { label: 'Blessing page: title', default: { en: 'With your blessings', ne: 'हजुरको आशीर्वाद' }, max: 32 },
    'couple.line': { shared: 'couple.line', label: 'Blessing page: one line (type - to remove)', default: { en: 'Soon to be married, with the blessings of both families.', ne: 'दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।' }, max: 90, multiline: true },
    'gallery.title': { label: 'Portraits: title', default: { en: 'Portraits', ne: 'तस्बिरहरू' }, max: 32 },
    'rsvp.kicker': { label: 'RSVP: label on the ledger cover', default: { en: 'The register', ne: 'बही खाता' }, max: 24 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 32 },
    'rsvp.entry': { label: 'RSVP: the register line', default: { en: 'Entered in the register', ne: 'बहीमा दर्ता' }, max: 32 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Sign the register', ne: 'बहीमा दर्ता गर्नुहोस्' }, max: 28 },
  },
  // Colours the client may change (docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--su-accent': { label: 'Lac red', default: '#8E1B1B' },
    '--mo-brass': { label: 'Brass', default: '#AE8840' },
    '--su-bg': { label: 'Indigo cloth', default: '#1E2A44' },
  },
  // Mix (docs/MIX.md): the seal is pressed into this design's own folded decree, so neither travels alone.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: {
      gate: 'The seal closes Mohar’s own folded decree; it opens only on that page.',
      hero: 'The decree unfolds out of Mohar’s own sealed opening.',
      hostGate: 'Mohar keeps its own seal opening.',
      hostHero: 'Mohar keeps its own decree.',
    },
  },
};
