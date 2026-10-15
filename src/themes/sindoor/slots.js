// Sindoor (सिन्दूर) · an editorial wedding issue on warm white: every theme image and text, replaceable from the studio. Plain data, no imports (the server loads this file).
// Invitation data (names, parents, dates, events, card wording, gallery, RSVP, closing) lives in the studio sections.
const photo = (n) => ({
  label: `Photos: photo ${n}`,
  kind: 'couple',
  default: { portrait: n },
  note: 'The couple. Shown whole, never cropped. Repeats are skipped.',
});

export default {
  theme: 'sindoor',
  images: {
    'hero.ganesh': {
      label: 'Ganesh (on the cover and the card)',
      kind: 'detail',
      default: { lg: '/themes/_nepali/ganesh-ink.webp', sm: '/themes/_nepali/ganesh-ink-sm.webp', w: 1064, h: 1400, alt: 'Shri Ganesh, a fine red line drawing' },
      note: 'A cut-out picture with a transparent background works best. Type off in the Ganesh line to hide him.',
    },
    'couple.lead': {
      label: 'Main photo of the couple',
      kind: 'couple',
      default: { portrait: 0 },
      note: 'Shown in a tall frame, centred near the top. Portrait works best.',
    },
    'gallery.1': photo(1),
    'gallery.2': photo(2),
    'gallery.3': photo(3),
    'gallery.4': photo(4),
    'gallery.5': photo(5),
    'gallery.6': photo(6),
    'families.bride': { label: 'Bride portrait (families)', kind: 'bride', default: null, note: 'Shown only when bride and groom both have their own photo.' },
    'families.groom': { label: 'Groom portrait (families)', kind: 'groom', default: null, note: 'Shown only when bride and groom both have their own photo.' },
  },
  texts: {
    'gate.line': { label: 'Opening: line above the button', default: { en: 'You are invited to our wedding', ne: 'हाम्रो शुभ विवाहमा हजुरलाई निम्तो' }, max: 60 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Open the sindoor box', ne: 'सिन्दूरदानी खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'ganesh.show': { label: 'Ganesh (type off to hide him)', default: { en: 'on', ne: 'on' }, max: 8 },
    'hero.invocation': { label: 'Cover: invocation under Ganesh (type - to remove)', default: { en: '॥ श्री गणेशाय नमः ॥', ne: '॥ श्री गणेशाय नमः ॥' }, max: 40 },
    'hero.title': { shared: 'hero.kicker', label: 'Cover: title in the top line', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 24 },
    'hero.line': { label: 'Cover: one short line beside the sindoor box', default: { en: 'With the blessings of both families, we invite you to our wedding.', ne: 'दुवै परिवारको आशीर्वादसहित हजुरलाई हाम्रो शुभ विवाहमा सादर निम्तो।' }, max: 90, multiline: true },
    'couple.title': { shared: 'couple.title', label: 'Couple: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 28 },
    'couple.line': { shared: 'couple.line', label: 'Couple: one line (type - to remove)', default: { en: 'Soon to be married, with the blessings of both families.', ne: 'दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।' }, max: 90, multiline: true },
    'bond.title': { label: 'The sindoor: title (type - to remove the section)', default: { en: 'One red line', ne: 'सिउँदोको रातो रेखा' }, max: 32 },
    'bond.line': { label: 'The sindoor: a few words', default: { en: 'When he fills the parting of her hair with sindoor, two lives become one. Every line of this invitation follows that one red line.', ne: 'जब दुलहाले दुलहीको सिउँदोमा सिन्दूर भर्छन्, दुई जीवन एउटै हुन्छन्। यो निम्तोको हरेक हरफ त्यही रातो रेखा पछ्याउँछ।' }, max: 180, multiline: true },
    'date.kicker': { label: 'Date: small label', default: { en: 'Save the date', ne: 'शुभ साइत' }, max: 28 },
    'date.title': { label: 'Date: title', default: { en: 'The auspicious day', ne: 'शुभ दिन' }, max: 32 },
    'count.title': { label: 'Countdown: title', default: { en: 'Until we are married', ne: 'शुभ घडी आउन बाँकी' }, max: 36 },
    'families.title': { label: 'Families: title', default: { en: 'With the blessings of our families', ne: 'दुवै परिवारको आशीर्वादसहित' }, max: 48 },
    'prog.kicker': { label: 'Programme: small label', default: { en: 'When and where', ne: 'कहिले र कहाँ' }, max: 28 },
    'prog.title': { shared: 'events.title', label: 'Programme: title', default: { en: 'The celebrations', ne: 'कार्यक्रम' }, max: 32 },
    'gallery.title': { label: 'Photos: title', default: { en: 'Moments together', ne: 'सँगैका पलहरू' }, max: 32 },
    'card.line': { shared: 'hero.line', label: 'Card wording: the one line of invitation', default: { en: 'We joyfully invite you and your family to bless the couple with your presence.', ne: 'शुभ विवाहमा सपरिवार पधारी आशीर्वाद दिनुहुन हार्दिक अनुरोध छ।' }, max: 100, multiline: true },
    'card.button': { shared: 'card.button', label: 'Button: read the full card', default: { en: 'Read the full invitation', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'scratch.hint': { label: 'Scratch card: line on the cover', default: { en: 'Rub the sindoor to see the date', ne: 'मिति हेर्न सिन्दूर पुछ्नुहोस्' }, max: 34 },
    'scratch.button': { label: 'Scratch card: button that reveals it at once', default: { en: 'Tap to reveal', ne: 'थिचेर हेर्नुहोस्' }, max: 24 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 32 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
  },
  // Cover colours the client may change (see docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--sd-red': { label: 'Sindoor red', default: '#C8141D', note: 'The names, the parting line, the numbers. Keep it deep enough to read on white.' },
    '--sd-paper': { label: 'Paper', default: '#FCFAF7' },
    '--sd-ink': { label: 'Ink', default: '#141212' },
  },
  // Mix (docs/MIX.md): which parts this theme gives to other pages and which it takes. Plain data (the server reads it).
  parts: {
    gate: 'pair', hero: true, hostGate: true, hostHero: true, // 'pair': an opening scene, its gate only with its own first screen
    ownGateNeedsHero: true, // its own gate opens its own cover's box: with another first screen, choose another gate too
    why: {
      gate: 'Sindoor’s gate is its own cover before the box is opened, so it comes only as Sindoor’s opening scene: its gate and first screen together.',
      hostHero: 'Sindoor’s own gate opens the box on its own cover: with another first screen, choose another gate too.',
    },
    gateUses: { texts: ['gate.line', 'gate.open', 'gate.quiet'], images: [], colors: ['--sd-ink', '--sd-paper'] },
    heroUses: { texts: ['hero.invocation', 'hero.title', 'hero.line', 'ganesh.show'], images: ['hero.ganesh'], colors: ['--sd-red', '--sd-paper', '--sd-ink'] },
  },
};
