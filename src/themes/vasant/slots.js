// Vasant (वसन्त) · the spring garden of butterflies: every theme image and text, replaceable from the studio.
// Plain data, no imports (the server loads this file). Invitation data (names, parents, dates, events, card wording,
// gallery, RSVP, closing) lives in the studio's own sections.
const photo = (n) => ({
  label: `Photos: plate ${n}`,
  kind: 'couple',
  default: { portrait: n },
  note: 'The couple, tipped onto a botanical plate with photo corners. Shown whole, never cropped. Repeats are skipped.',
});

export default {
  theme: 'vasant',
  // Sold on both sites (src/core/markets.js): flowers and butterflies, no religious symbol anywhere in the art.
  market: 'both',
  style: 'garden',
  // Faith (docs/FAITH-DESIGNS.md): botanical plates, butterflies and a marigold-and-rose garland; no deity, no rite.
  religions: ['hindu', 'buddhist', 'kirat', 'other'],
  images: {
    'hero.ganesh': {
      label: 'Ganesh (only on the full invitation card, when the Ganesh line is on)',
      kind: 'detail',
      default: { lg: '/themes/_nepali/ganesh-brass.webp', sm: '/themes/_nepali/ganesh-brass-sm.webp', w: 831, h: 1400, alt: 'A brass idol of Shri Ganesh' },
      note: 'A cut-out picture with a transparent background works best.',
    },
    'couple.lead': {
      label: 'Main photo of the couple',
      kind: 'couple',
      default: { portrait: 0 },
      note: 'Tipped onto the first botanical plate beside a pressed spray. Shown whole; portrait works best.',
    },
    'gallery.1': photo(1),
    'gallery.2': photo(2),
    'gallery.3': photo(3),
    'gallery.4': photo(4),
    'gallery.5': photo(5),
    'gallery.6': photo(6),
    'families.bride': {
      label: 'Bride portrait (families)',
      kind: 'bride',
      default: null,
      note: 'Shown on the family plate only when bride and groom both have their own photo.',
    },
    'families.groom': {
      label: 'Groom portrait (families)',
      kind: 'groom',
      default: null,
      note: 'Shown on the family plate only when bride and groom both have their own photo.',
    },
  },
  texts: {
    'ganesh.show': {
      label: 'Ganesh on the full card (type on to show him; the design itself has no religious marks)',
      default: { en: 'off', ne: 'off' },
      max: 8,
    },
    'gate.line': {
      shared: 'gate.line',
      label: 'Opening: line above the button',
      default: { en: 'You are invited to our wedding', ne: 'हाम्रो शुभ विवाहमा हजुरलाई निम्तो' },
      max: 60,
    },
    'gate.open': {
      shared: 'gate.open',
      label: 'Opening: open button',
      default: { en: 'Open the invitation', ne: 'निम्तो खोल्नुहोस्' },
      max: 28,
    },
    'gate.quiet': {
      shared: 'gate.quiet',
      label: 'Opening: open without music',
      default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' },
      max: 32,
    },
    'hero.title': {
      shared: 'hero.kicker',
      label: 'First screen: small heading above the names',
      default: { en: 'Together with their families', ne: 'शुभ विवाह' },
      max: 36,
    },
    'hero.line': {
      label: 'First screen: line under the names',
      default: { en: 'request the joy of your company at their wedding', ne: 'को शुभ विवाहमा हजुरलाई सादर निम्तो' },
      max: 80,
      multiline: true,
    },
    'couple.title': {
      shared: 'couple.title',
      label: 'Couple: title',
      default: { en: 'The two of us', ne: 'हामी दुई' },
      max: 28,
    },
    'couple.line': {
      shared: 'couple.line',
      label: 'Couple: one line (type - to remove)',
      default: { en: 'Soon to be married, with the blessings of both families.', ne: 'दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।' },
      max: 90,
      multiline: true,
    },
    'date.kicker': {
      label: 'Date: small label',
      default: { en: 'Save the date', ne: 'शुभ साइत' },
      max: 28,
    },
    'date.title': {
      label: 'Date: title',
      default: { en: 'The day we begin', ne: 'शुभ दिन' },
      max: 32,
    },
    'count.title': {
      label: 'Countdown: title',
      default: { en: 'Wingbeats until the day', ne: 'शुभ घडी आउन बाँकी' },
      max: 36,
    },
    'families.title': {
      label: 'Families: title',
      default: { en: 'Two families, one garden', ne: 'दुई परिवार, एउटै बगैँचा' },
      max: 48,
    },
    'prog.kicker': {
      label: 'Ceremonies: small label',
      default: { en: 'When and where', ne: 'कहिले र कहाँ' },
      max: 28,
    },
    'prog.title': {
      shared: 'events.title',
      label: 'Ceremonies: title',
      default: { en: 'Each day its own flower', ne: 'हरेक कार्यक्रम, आफ्नै फूल' },
      max: 36,
    },
    'gallery.title': {
      label: 'Photos: title',
      default: { en: 'The two of us, pressed in spring', ne: 'हामी दुईका तस्बिर' },
      max: 40,
    },
    'card.line': {
      shared: 'hero.line',
      label: 'Card wording: the one line of invitation',
      default: { en: 'We joyfully invite you and your family to bless the couple with your presence.', ne: 'शुभ विवाहमा सपरिवार पधारी आशीर्वाद दिनुहुन हार्दिक अनुरोध छ।' },
      max: 100,
      multiline: true,
    },
    'card.button': {
      shared: 'card.button',
      label: 'Button: read the full card',
      default: { en: 'Read the full invitation', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' },
      max: 36,
    },
    'scratch.hint': {
      label: 'Scratch card: line on the wing',
      default: { en: 'Brush the wing to see the date', ne: 'पखेटा हटाएर मिति हेर्नुहोस्' },
      max: 36,
    },
    'scratch.button': {
      label: 'Scratch card: button that reveals it at once',
      default: { en: 'Tap to reveal', ne: 'थिचेर हेर्नुहोस्' },
      max: 24,
    },
    'rsvp.kicker': {
      label: 'RSVP: line on the seed packet',
      default: { en: 'RSVP', ne: 'जवाफ' },
      max: 32,
    },
    'rsvp.title': {
      shared: 'reply.title',
      label: 'RSVP: title',
      default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' },
      max: 32,
    },
    'rsvp.send': {
      label: 'RSVP: send button',
      default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' },
      max: 28,
    },
  },
  // Colours the client may change (docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--va-paper': { label: 'Paper (haldi cream)', default: '#FFF7E6' },
    '--va-leaf': { label: 'Leaf green (headings)', default: '#3B6B35' },
    '--su-accent': { label: 'Rani pink (buttons, the one accent)', default: '#C2185B' },
  },
  // Mix (docs/MIX.md). The garland of the gate is the same garland as the first screen's, and the butterflies fly
  // from one to the other, so the opening travels only with its own first screen.
  parts: {
    gate: false,
    hero: false,
    hostGate: true,
    hostHero: false,
    ownGateNeedsHero: true,
    why: {
      gate: 'Vasant’s butterflies lift off the same garland that hangs over its first screen, so its opening is not offered on other pages.',
      hero: 'Vasant’s first screen is the garland the opening’s butterflies leave from; it comes only with Vasant’s own opening.',
      hostHero: 'Vasant’s opening lands on its own garland, so it keeps its own first screen.',
    },
    gateUses: { texts: ['gate.line', 'gate.open', 'gate.quiet'], images: [], colors: ['--va-paper', '--su-accent'] },
    heroUses: { texts: ['hero.title', 'hero.line'], images: [], colors: ['--va-paper', '--va-leaf', '--su-accent'] },
  },
};
