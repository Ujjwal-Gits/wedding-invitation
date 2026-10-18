// Kalapi (कलापी) · the peacock's monsoon, painted on one long pichwai cloth: every theme image and text, replaceable from the studio. Plain data, no imports (the server loads this file).
// Invitation data (names, parents, dates, events, card wording, gallery, RSVP, closing) lives in the studio sections.
const photo = (n) => ({ label: `Monsoon diary: photo ${n}`, kind: 'couple', default: { portrait: n }, note: 'The couple. Tipped onto the cloth whole, never cropped. Repeats are skipped.' });
export default {
  // Faith (docs/PLATFORM.md "Religion"): the communities this design suits once its symbols and words are swapped. Not for others: a Nathdwara pichwai (Krishna-temple cloth) with cows, lotuses and peacocks.
  religions: ['hindu'],
  faithInk: '--kp-gold', // the emblem that replaces Ganesh for other communities is drawn in this colour
  theme: 'kalapi',
  market: 'np',
  images: {
    'hero.ganesh': {
      label: 'Ganesh (on the invitation cartouche and the full card)',
      kind: 'detail',
      default: { lg: '/themes/_nepali/ganesh-brass.webp', sm: '/themes/_nepali/ganesh-brass-sm.webp', w: 831, h: 1400, alt: 'Shri Ganesh in polished brass' },
      note: 'A cut-out picture with a transparent background works best. Type off in the Ganesh line to hide him.',
    },
    'couple.lead': {
      label: 'Main photo of the couple',
      kind: 'couple',
      default: { portrait: 0 },
      note: 'Shown whole under a cusped arch on the lotus-pond panel of the painted cloth. Portrait works best.',
    },
    'gallery.1': photo(1), 'gallery.2': photo(2), 'gallery.3': photo(3), 'gallery.4': photo(4), 'gallery.5': photo(5), 'gallery.6': photo(6),
    'families.bride': { label: 'Bride portrait (families)', kind: 'bride', default: null, note: 'Shown in her miniature panel only when bride and groom both have their own photo; otherwise a painted peacock faces the other panel.' },
    'families.groom': { label: 'Groom portrait (families)', kind: 'groom', default: null, note: 'Shown in his miniature panel only when bride and groom both have their own photo.' },
  },
  texts: {
    'gate.line': { label: 'Opening: line above the button', default: { en: 'The first rain clouds have come', ne: 'असारका पहिला बादल आए' }, max: 60 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Open the invitation', ne: 'निम्तो खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'ganesh.show': { label: 'Ganesh (type off to hide him)', default: { en: 'on', ne: 'on' }, max: 8 },
    'hero.invocation': { label: 'First screen: invocation (type - to remove)', default: { en: '॥ श्री गणेशाय नमः ॥', ne: '॥ श्री गणेशाय नमः ॥' }, max: 40 },
    'hero.title': { shared: 'hero.kicker', label: 'First screen: title', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 24 },
    'hero.line': { shared: 'hero.line', label: 'First screen: one short line under the names (type - to remove)', default: { en: 'As the peacock dances for the first rain, we begin our life together.', ne: 'पहिलो वर्षामा मयूर नाचेझैं, हाम्रो सहयात्रा सुरु हुँदैछ।' }, max: 90, multiline: true },
    'cloth.kicker': { label: 'Painted cloth: small label on the first panel', default: { en: 'An invitation', ne: 'निमन्त्रणा' }, max: 28 },
    'card.line': { label: 'Painted cloth: the invitation line (first panel)', default: { en: 'We joyfully invite you and your family to bless the couple with your presence.', ne: 'शुभ विवाहमा सपरिवार पधारी आशीर्वाद दिनुहुन हार्दिक अनुरोध छ।' }, max: 100, multiline: true },
    'card.button': { shared: 'card.button', label: 'Button: read the full card', default: { en: 'Read the full invitation', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'couple.title': { shared: 'couple.title', label: 'Couple: title (lotus-pond panel)', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 28 },
    'couple.line': { shared: 'couple.line', label: 'Couple: one line (type - to remove)', default: { en: 'Soon to be married, with the blessings of both families.', ne: 'दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।' }, max: 90, multiline: true },
    'prog.kicker': { label: 'Ceremonies: small label', default: { en: 'When and where', ne: 'कहिले र कहाँ' }, max: 28 },
    'prog.title': { shared: 'events.title', label: 'Ceremonies: title', default: { en: 'The celebrations', ne: 'कार्यक्रम' }, max: 32 },
    'count.title': { label: 'Countdown: title (in the full moon)', default: { en: 'Until the auspicious hour', ne: 'शुभ घडी आउन बाँकी' }, max: 36 },
    'cloth.end': { label: 'Painted cloth: line on the last panel, the rain clouds (type - to remove)', default: { en: 'The rains are here, and so is our day.', ne: 'वर्षा आयो, हाम्रो शुभ दिन पनि।' }, max: 60, multiline: true },
    'families.title': { label: 'Families: title', default: { en: 'With the blessings of our families', ne: 'दुवै परिवारको आशीर्वादसहित' }, max: 48 },
    'date.kicker': { label: 'Date: small label', default: { en: 'Save the date', ne: 'शुभ साइत' }, max: 28 },
    'date.title': { label: 'Date: title', default: { en: 'The auspicious day', ne: 'शुभ दिन' }, max: 32 },
    'scratch.hint': { label: 'Scratch card: line on the peacock-feather eye', default: { en: 'Scratch the feather', ne: 'प्वाँख कोर्नुहोस्' }, max: 28 },
    'scratch.button': { label: 'Scratch card: button that reveals it at once', default: { en: 'Tap to reveal', ne: 'थिचेर हेर्नुहोस्' }, max: 24 },
    'gallery.title': { shared: 'gallery.title', label: 'Photos: title', default: { en: 'A monsoon diary', ne: 'वर्षाको डायरी' }, max: 32 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 32 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
  },
  // First-screen colours the client may change (see docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--kp-teal': { label: 'Monsoon teal (the cloth)', default: '#0F3D41' },
    '--kp-gold': { label: 'Antique gold (borders, buttons)', default: '#C69A3E' },
    '--kp-red': { label: 'Miniature red (the cloth’s borders)', default: '#8E2A22' },
    '--kp-ivory': { label: 'Cloth ivory (cartouches)', default: '#F3EAD6' },
  },
  // Mix (docs/MIX.md): the peacock's fan opens into this page's own first screen, so Kalapi keeps its own opening.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: {
      gate: 'Kalapi’s peacock fans its tail into its own first screen: it is not offered on other pages.',
      hero: 'Kalapi’s first screen is crowned by the fan from its own opening.',
      hostGate: 'Kalapi’s fan rises into its own first screen, so it keeps its own opening.',
      hostHero: 'Kalapi’s opening lands its fan on its own first screen.',
    },
  },
};
