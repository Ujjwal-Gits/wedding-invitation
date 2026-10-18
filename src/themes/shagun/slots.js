// Shagun (शगुन / सगुन) · the brass thali: every theme image and text, replaceable from the studio. Plain data, no imports
// (the server loads this file). Invitation data (names, parents, dates, events, card wording, gallery, RSVP, closing)
// lives in the studio's own sections.
const pic = (n) => ({ label: `Shagun moments: photo ${n}`, kind: 'couple', default: { portrait: n }, note: 'The couple. Shown whole on a row of prints, never cropped. Repeats are skipped.' });
export default {
  // Faith (docs/FAITH-DESIGNS.md): a puja thali with sindoor, kalash, diyo and Ganesh. Hindu only.
  religions: ['hindu'],
  faithInk: '--sg-brass',
  theme: 'shagun',
  market: 'np',
  images: {
    'hero.ganesh': {
      label: 'Ganesh (the first item on the thali, and the full card)',
      kind: 'detail',
      default: { lg: '/themes/_nepali/ganesh-brass.webp', sm: '/themes/_nepali/ganesh-brass-sm.webp', w: 831, h: 1400, alt: 'A brass idol of Shri Ganesh' },
      note: 'A cut-out picture with a transparent background works best. Type off in the Ganesh line to hide him.',
    },
    'couple.lead': { label: 'Main photo of the couple', kind: 'couple', default: { portrait: 0 }, note: 'Shown whole as a print beside the thali. Portrait works best.' },
    'gallery.1': pic(1), 'gallery.2': pic(2), 'gallery.3': pic(3), 'gallery.4': pic(4), 'gallery.5': pic(5), 'gallery.6': pic(6),
    'families.bride': { label: 'Bride portrait (families)', kind: 'bride', default: null, note: 'Shown only when bride and groom both have their own photo.' },
    'families.groom': { label: 'Groom portrait (families)', kind: 'groom', default: null, note: 'Shown only when bride and groom both have their own photo.' },
  },
  texts: {
    'gate.line': { label: 'Opening: line above the button', default: { en: 'A shagun thali, offered with our invitation', ne: 'शुभ सगुनको थालसँगै हजुरलाई निम्तो' }, max: 60 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Open the invitation', ne: 'निम्तो खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'ganesh.show': { label: 'Ganesh (type off to hide him)', default: { en: 'on', ne: 'on' }, max: 8 },
    'hero.invocation': { label: 'Opening: invocation (type - to remove)', default: { en: '॥ श्री गणेशाय नमः ॥', ne: '॥ श्री गणेशाय नमः ॥' }, max: 40 },
    'hero.title': { shared: 'hero.kicker', label: 'Opening: title', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 24 },
    'hero.line': { label: 'Opening: one short line under the names', default: { en: 'With the blessings of both families, we invite you to our wedding', ne: 'दुवै परिवारको आशीर्वादसहित हजुरलाई सादर निम्तो' }, max: 90, multiline: true },
    'hero.seal': { label: 'Opening: words beside the sindoor thumb-tika', default: { en: 'Sealed with sindoor', ne: 'सिन्दूरको टीकासहित' }, max: 28 },

    // the eight things on the thali, one per part of the invitation
    'item.1': { label: 'Thali item 1 (the invocation)', default: { en: 'Supari and dubo', ne: 'सुपारी र दुबो' }, max: 28 },
    'item.2': { label: 'Thali item 2 (the couple)', default: { en: 'The sindoor box', ne: 'सिन्दूरदानी' }, max: 28 },
    'item.3': { label: 'Thali item 3 (the families)', default: { en: 'The kalash', ne: 'कलश' }, max: 28 },
    'item.4': { label: 'Thali item 4 (the ceremonies)', default: { en: 'Akshata rice', ne: 'अक्षता' }, max: 28 },
    'item.5': { label: 'Thali item 5 (the blessing)', default: { en: 'Dahi and sagun', ne: 'दही र सगुन' }, max: 28 },
    'item.6': { label: 'Thali item 6 (the countdown)', default: { en: 'Laddoo', ne: 'लड्डु' }, max: 28 },
    'item.7': { label: 'Thali item 7 (the venue)', default: { en: 'The coconut', ne: 'नरिवल' }, max: 28 },
    'item.8': { label: 'Thali item 8 (the reply)', default: { en: 'The diyo', ne: 'दियो' }, max: 28 },

    'invoke.title': { label: 'Invocation: title', default: { en: 'We begin with Shri Ganesh', ne: 'श्री गणेशको स्मरणसहित' }, max: 40 },
    'card.line': { shared: 'hero.line', label: 'Card wording: the one line of invitation', default: { en: 'We joyfully invite you and your family to bless the couple with your presence.', ne: 'शुभ विवाहमा सपरिवार पधारी आशीर्वाद दिनुहुन हार्दिक अनुरोध छ।' }, max: 100, multiline: true },
    'card.button': { shared: 'card.button', label: 'Button: read the full card', default: { en: 'Read the full invitation', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'couple.title': { shared: 'couple.title', label: 'Couple: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 28 },
    'couple.line': { shared: 'couple.line', label: 'Couple: one line (type - to remove)', default: { en: 'Soon to be married, with the blessings of both families.', ne: 'दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।' }, max: 90, multiline: true },
    'families.title': { label: 'Families: title', default: { en: 'Two families, one kalash', ne: 'दुई परिवार, एउटै कलश' }, max: 48 },
    'prog.kicker': { label: 'Ceremonies: small label', default: { en: 'When and where', ne: 'कहिले र कहाँ' }, max: 28 },
    'prog.title': { shared: 'events.title', label: 'Ceremonies: title', default: { en: 'The celebrations', ne: 'कार्यक्रम' }, max: 32 },
    'bless.title': { label: 'Blessing: title', default: { en: 'Dahi, sagun and blessings', ne: 'दही, सगुन र आशीर्वाद' }, max: 40 },
    'bless.line': { label: 'Blessing: the line (type - to remove)', default: { en: 'Every good beginning in a Nepali home starts with curd and sagun. Come and give yours to the two of us.', ne: 'नेपाली घरमा हरेक शुभ काम दही र सगुनबाट सुरु हुन्छ। हामी दुईलाई हजुरको आशीर्वाद चाहिन्छ।' }, max: 140, multiline: true },
    'count.title': { label: 'Countdown: title', default: { en: 'Until the auspicious hour', ne: 'शुभ घडी आउन बाँकी' }, max: 36 },
    'venue.title': { label: 'Venue: title', default: { en: 'Where we gather', ne: 'भेटघाटको ठाउँ' }, max: 32 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 32 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
    'gallery.title': { label: 'Photos: title', default: { en: 'Shagun moments', ne: 'सगुनका पलहरू' }, max: 32 },
    'date.kicker': { label: 'Sindoor box: label inside the lid', default: { en: 'The auspicious hour', ne: 'शुभ साइत' }, max: 28 },
    'scratch.title': { label: 'Sindoor box: title above it', default: { en: 'Open the sindoor box', ne: 'सिन्दूरदानी खोल्नुहोस्' }, max: 36 },
    'scratch.hint': { label: 'Sindoor box: line on the lid', default: { en: 'Rub the lid open', ne: 'बिर्को खोल्न कोर्नुहोस्' }, max: 32 },
    'scratch.button': { label: 'Sindoor box: button that opens it at once', default: { en: 'Tap to open', ne: 'थिचेर खोल्नुहोस्' }, max: 24 },
  },
  // Colours the client may change (docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--su-accent': { label: 'Sindoor red', default: '#C3102E' },
    '--sg-brass': { label: 'Brass', default: '#B88A2F' },
    '--sg-floor': { label: 'Floor', default: '#9A4A2F' },
    '--su-paper': { label: 'Curd white (cards)', default: '#FAF6ED' },
  },
  // Mix (docs/MIX.md): the covered thali opens into the turning thali; neither leaves this page.
  parts: {
    gate: false, hero: false, hostGate: true, hostHero: false,
    why: {
      gate: 'The silk lifts off the same thali that turns through the page, so the opening stays with Shagun.',
      hero: 'The first screen is the thali the whole page turns; it cannot sit on another page.',
      hostHero: 'The thali on the first screen is the dial the page turns, so it cannot be replaced.',
    },
  },
};
