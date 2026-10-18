// Toran (तोरण) · seven dressed doorways of a haveli: every theme image and text, replaceable from the studio. Plain data, no imports (the server loads this file).
// Invitation data (names, parents, dates, events, card wording, gallery, RSVP, closing) lives in the studio sections.
// The seven doorways themselves are the design (painted art with cut-out openings), so they are not slots.
const couple = (n) => ({ label: `Photos: photo ${n}`, kind: 'couple', default: { portrait: n }, note: 'The couple. Shown whole, never cropped. Repeats are skipped.' });
export default {
  // Faith (docs/PLATFORM.md "Religion"): Ganesh over the first door, the kalash and the mandap: a Hindu design.
  religions: ['hindu'],
  faithInk: '--su-accent',
  theme: 'toran',
  images: {
    'hero.ganesh': {
      label: 'Ganesh (above the first door)',
      kind: 'detail',
      default: { lg: '/themes/_nepali/ganesh-brass.webp', sm: '/themes/_nepali/ganesh-brass-sm.webp', w: 1000, h: 1000, alt: 'Shri Ganesh in brass' },
      note: 'A cut-out picture with a transparent background works best. Type off in the Ganesh line to hide him.',
    },
    'couple.lead': { label: 'Main photo of the couple (second door)', kind: 'couple', default: { portrait: 0 }, note: 'Shown whole on a plaque. Portrait works best.' },
    'gallery.1': couple(1),
    'gallery.2': couple(2),
    'gallery.3': couple(3),
    'gallery.4': couple(4),
    'gallery.5': couple(5),
    'gallery.6': couple(6),
    'families.bride': { label: 'Bride portrait (families)', kind: 'bride', default: null, note: 'Shown only when bride and groom both have their own photo.' },
    'families.groom': { label: 'Groom portrait (families)', kind: 'groom', default: null, note: 'Shown only when bride and groom both have their own photo.' },
  },
  texts: {
    'gate.line': { label: 'Opening: line above the button', default: { en: 'The doors are dressed for you', ne: 'हजुरलाई स्वागत गर्न ढोका सजिएका छन्' }, max: 60 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Part the garlands', ne: 'माला हटाउनुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'ganesh.show': { label: 'Ganesh (type off to hide him)', default: { en: 'on', ne: 'on' }, max: 8 },
    'hero.invocation': { label: 'First door: invocation (type - to remove)', default: { en: '॥ श्री गणेशाय नमः ॥', ne: '॥ श्री गणेशाय नमः ॥' }, max: 40 },
    'hero.title': { shared: 'hero.kicker', label: 'First door: title', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 24 },
    'hero.line': { label: 'First door: welcome line (type - to remove)', default: { en: 'Seven doors to the mandap. Step in.', ne: 'मण्डपसम्म सात ढोका। भित्र आउनुहोस्।' }, max: 60 },
    'couple.title': { shared: 'couple.title', label: 'Couple: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 28 },
    'couple.line': { shared: 'couple.line', label: 'Couple: one line (type - to remove)', default: { en: 'Soon to be married, with the blessings of both families.', ne: 'दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।' }, max: 90, multiline: true },
    'families.title': { label: 'Families: title', default: { en: 'Two families, one doorway', ne: 'दुई परिवार, एउटै ढोका' }, max: 48 },
    'prog.kicker': { label: 'Ceremonies: small label', default: { en: 'When and where', ne: 'कहिले र कहाँ' }, max: 28 },
    'prog.title': { shared: 'events.title', label: 'Ceremonies: title', default: { en: 'The ceremonies', ne: 'कार्यक्रमहरू' }, max: 32 },
    'date.kicker': { label: 'Date: small label', default: { en: 'Save the date', ne: 'शुभ साइत' }, max: 28 },
    'date.title': { label: 'Date: title', default: { en: 'The auspicious day', ne: 'शुभ दिन' }, max: 32 },
    'gallery.title': { label: 'Photos: title', default: { en: 'Moments together', ne: 'सँगैका पलहरू' }, max: 32 },
    'count.title': { label: 'Countdown: title', default: { en: 'The lamps are lit. Not long now.', ne: 'दियो बलिसक्यो, अब धेरै बाँकी छैन' }, max: 40 },
    'card.line': { shared: 'hero.line', label: 'Card wording: the one line of invitation', default: { en: 'We joyfully invite you and your family to bless the couple with your presence.', ne: 'शुभ विवाहमा सपरिवार पधारी आशीर्वाद दिनुहुन हार्दिक अनुरोध छ।' }, max: 100, multiline: true },
    'card.button': { shared: 'card.button', label: 'Button: read the full card', default: { en: 'Read the full invitation', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'scratch.hint': { label: 'Scratch card: line on the cover', default: { en: 'Scratch to reveal the date', ne: 'मिति हेर्न कोर्नुहोस्' }, max: 32 },
    'scratch.button': { label: 'Scratch card: button that reveals it at once', default: { en: 'Tap to reveal', ne: 'थिचेर हेर्नुहोस्' }, max: 24 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us at the mandap?', ne: 'मण्डपमा हजुर आउनुहुन्छ?' }, max: 40 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
  },
  // Colours the client may change (docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--su-accent': { label: 'Haveli red', default: '#6D1F1A' },
    '--to-marigold': { label: 'Marigold', default: '#EC8A1C' },
    '--to-leaf': { label: 'Mango leaf', default: '#2F5D2C' },
    '--to-plaque': { label: 'Plaques', default: '#FFFAF0' },
  },
};
