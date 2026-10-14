// Jhyal (झ्याल) · "the carved Newari window": every theme image and theme text, replaceable from the studio.
// Plain data, no imports (the server loads this file). See src/core/slots.js.
// Invitation data (names, parents, dates, events, card wording, gallery, travel/stays/contacts, RSVP,
// closing blessing) is edited in the studio's normal sections and is not repeated here.
// The invocation is optional: type "-" (or "off") to remove it.
const photo = (n) => [`photos.${n}`, {
  label: `Photographs: photo ${n}`, kind: 'couple', default: { portrait: n },
  note: 'The couple. In the calm photo grid under “The two of us”, in a thin wooden-lined mount; shown whole, never cropped, any orientation. Repeats are skipped.',
}];

export default {
  theme: 'jhyal',
  images: {
    'couple.lead': {
      label: 'Main photo (inside the carved-window frame, beside शुभ विवाह)', kind: 'couple', default: { portrait: 0 },
      note: 'The couple’s best photo. The carved window is built around it at its own shape, so it is always shown whole. Portrait works best.',
    },
    ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(photo)),
    'families.bride': {
      label: 'Bride portrait (families)', kind: 'bride', default: null,
      note: 'Portrait of the bride, above her family. Shown only when bride and groom both have their own photo.',
    },
    'families.groom': {
      label: 'Groom portrait (families)', kind: 'groom', default: null,
      note: 'Portrait of the groom, above his family. Shown only when bride and groom both have their own photo.',
    },
  },
  texts: {
    'gate.line': { shared: 'gate.line', label: 'Window: small line above it', default: { en: 'An invitation for you and your family', ne: 'हजुरलाई सपरिवार निमन्त्रणा' }, max: 60 },
    'gate.open': { shared: 'gate.open', label: 'Window: open button', default: { en: 'Open the window', ne: 'झ्याल खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Window: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'hero.invocation': { label: 'Opening: invocation in small sindoor red (type - to remove)', default: { en: '॥ श्री गणेशाय नमः ॥', ne: '॥ श्री गणेशाय नमः ॥' }, max: 40 },
    'hero.title': { shared: 'hero.kicker', label: 'Opening: title (the Nepali is always shown)', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 24 },
    'hero.blessing': { label: 'Opening: one warm line under the names', default: { en: 'Awaiting your blessings and your presence', ne: 'हजुरको आशीर्वाद र साथको प्रतीक्षामा' }, max: 70, multiline: true },
    'hero.symbol': { label: 'Full card: sacred symbol at the top (type - to remove)', default: { en: 'ॐ', ne: 'ॐ' }, max: 6 },
    'date.kicker': { label: 'Date: small label', default: { en: 'The auspicious day', ne: 'शुभ दिन' }, max: 28 },
    'date.title': { label: 'Date: title', default: { en: 'The lagan patra', ne: 'लगन पत्र' }, max: 32 },
    'date.seal': { label: 'Date: word on the folded red paper', default: { en: 'Lagan patra', ne: 'लगन पत्र' }, max: 20 },
    'date.button': { label: 'Date: button that unfolds the paper', default: { en: 'Unfold the date', ne: 'मिति हेर्नुहोस्' }, max: 28 },
    'count.title': { label: 'Countdown: title', default: { en: 'Until the auspicious hour', ne: 'शुभ साइत आउन बाँकी' }, max: 36 },
    'families.title': { label: 'Families: title', default: { en: 'With the blessings of our families', ne: 'दुवै परिवारको आशीर्वादसहित' }, max: 48 },
    'families.bride': { label: 'Families: bride label', default: { en: 'The bride', ne: 'दुलही' }, max: 20 },
    'families.groom': { label: 'Families: groom label', default: { en: 'The groom', ne: 'दुलहा' }, max: 20 },
    'families.daughter': { label: 'Families: “daughter of”', default: { en: 'Daughter of', ne: 'सुपुत्री' }, max: 20 },
    'families.son': { label: 'Families: “son of”', default: { en: 'Son of', ne: 'सुपुत्र' }, max: 20 },
    'photos.title': { shared: 'couple.title', label: 'Photographs: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 28 },
    'photos.line': { shared: 'couple.line', label: 'Photographs: one line', default: { en: 'Soon to be married, with the blessings of both families.', ne: 'दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।' }, max: 90, multiline: true },
    'card.kicker': { label: 'Card wording: small label', default: { en: 'The invitation card', ne: 'निमन्त्रणा पत्र' }, max: 28 },
    'card.line': { shared: 'hero.line', label: 'Card wording: the one line of invitation', default: { en: 'We joyfully invite you and your family to bless the couple with your presence.', ne: 'शुभ विवाहमा सपरिवार पधारी आशीर्वाद दिनुहुन हार्दिक अनुरोध छ।' }, max: 100, multiline: true },
    'card.button': { shared: 'card.button', label: 'Button: read the full card', default: { en: 'Read the full invitation', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'prog.kicker': { label: 'Programme: small label', default: { en: 'When and where', ne: 'कहिले र कहाँ' }, max: 28 },
    'prog.title': { shared: 'events.title', label: 'Programme: title', default: { en: 'The programme', ne: 'कार्यक्रम' }, max: 32 },
    'prog.more': { label: 'Programme: travel/stays/contacts toggle', default: { en: 'Travel, stays and contacts', ne: 'यात्रा, बसाइ र सम्पर्क' }, max: 36 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 32 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
  },
};
