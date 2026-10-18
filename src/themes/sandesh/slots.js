// Sandesh (सन्देश) · "the message": doves bring the invitation to an old-city rooftop as hand-stamped postcards. Every theme
// image and text, replaceable from the studio. Plain data, no imports (the server loads this file).
// Invitation data (names, parents, dates, events, card wording, gallery, RSVP, closing) lives in the studio sections.
const ART = '/themes/sandesh/art/';
const stamp = (k, label, alt) => ({
  label: `Postage stamp: ${label}`,
  kind: 'detail',
  default: { lg: `${ART}stamp-${k}.webp`, sm: `${ART}stamp-${k}.webp`, w: 560, h: 700, alt },
  note: 'The little painting on that ceremony’s stamp. Portrait 4:5, a calm picture with no words.',
});
export default {
  // Faith (docs/FAITH-DESIGNS.md): neutral art (doves, a lime-washed rooftop, roses, marigold garlands, postage stamps of
  // the ceremonies' own things). No deity, temple or rite in the art; Ganesh only on the full card, and only if asked.
  religions: ['hindu', 'buddhist', 'kirat', 'christian', 'muslim', 'other'],
  faithInk: '--sd-brass',
  market: 'both',
  style: 'romantic',
  occasions: ['wedding', 'engagement', 'anniversary', 'vow-renewal'],
  theme: 'sandesh',
  images: {
    'scene.phone': {
      label: 'Rooftop painting (phones)',
      kind: 'scene',
      default: { lg: `${ART}rooftop-p.webp`, sm: `${ART}rooftop-p-sm.webp`, w: 1080, h: 1920, alt: 'An old-city rooftop at morning, with a garlanded door, bougainvillea and roses in brass pots' },
      note: 'Behind the letter on phones. Portrait 9:16, calm sky in the middle.',
    },
    'scene.wide': {
      label: 'Rooftop painting (computers)',
      kind: 'scene',
      default: { lg: `${ART}rooftop-l.webp`, sm: `${ART}rooftop-l-sm.webp`, w: 2048, h: 1152, alt: 'An old-city rooftop at morning, with a garlanded door, bougainvillea and roses in brass pots' },
      note: 'Behind the letter on computers. Landscape 16:9, calm sky in the middle.',
    },
    'hero.ganesh': {
      label: 'Ganesh (on the full card only)',
      kind: 'detail',
      default: { lg: '/themes/_nepali/ganesh-brass.webp', sm: '/themes/_nepali/ganesh-brass-sm.webp', w: 831, h: 1400, alt: 'A brass idol of Shri Ganesh' },
      note: 'Shown at the top of the full invitation card when the Ganesh line says on.',
    },
    'couple.lead': { label: 'Picture postcard of the couple', kind: 'couple', default: { portrait: 0 }, note: 'The first postcard the doves bring. Shown whole; portrait or landscape.' },
    'gallery.1': { label: 'Postcard rack: photo 1', kind: 'couple', default: { portrait: 1 }, note: 'The couple. Shown whole, never cropped. Repeats are skipped.' },
    'gallery.2': { label: 'Postcard rack: photo 2', kind: 'couple', default: { portrait: 2 }, note: 'The couple. Shown whole, never cropped. Repeats are skipped.' },
    'gallery.3': { label: 'Postcard rack: photo 3', kind: 'couple', default: { portrait: 3 }, note: 'The couple. Shown whole, never cropped. Repeats are skipped.' },
    'gallery.4': { label: 'Postcard rack: photo 4', kind: 'couple', default: { portrait: 4 }, note: 'The couple. Shown whole, never cropped. Repeats are skipped.' },
    'gallery.5': { label: 'Postcard rack: photo 5', kind: 'couple', default: { portrait: 5 }, note: 'The couple. Shown whole, never cropped. Repeats are skipped.' },
    'gallery.6': { label: 'Postcard rack: photo 6', kind: 'couple', default: { portrait: 6 }, note: 'The couple. Shown whole, never cropped. Repeats are skipped.' },
    'families.bride': { label: 'Bride’s stamp (families)', kind: 'bride', default: null, note: 'Shown on her stamp when bride and groom both have their own photo; otherwise her initial.' },
    'families.groom': { label: 'Groom’s stamp (families)', kind: 'groom', default: null, note: 'Shown on his stamp when bride and groom both have their own photo; otherwise his initial.' },
    'stamp.haldi': stamp('haldi', 'Haldi', 'A brass bowl of turmeric paste among marigolds'),
    'stamp.mehendi': stamp('mehendi', 'Mehendi or Mehndi', 'A henna cone and a bowl of henna with roses and jasmine'),
    'stamp.wedding': stamp('wedding', 'the wedding', 'Two garlands of roses and marigolds with two white doves'),
    'stamp.reception': stamp('reception', 'reception and evening parties', 'Brass lanterns over a bowl of roses at night'),
    'stamp.engagement': stamp('rings', 'engagement and rings', 'Two gold rings on rose petals'),
    'stamp.other': stamp('bouquet', 'any other ceremony', 'A bouquet of roses and marigolds tied with thread'),
  },
  texts: {
    'gate.line': { label: 'Opening: line on the tag', default: { en: 'A letter has come for you', ne: 'हजुरका लागि एउटा चिठी आएको छ' }, max: 48 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Break the seal', ne: 'छाप खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'ganesh.show': { label: 'Ganesh on the full card (type on to show him)', default: { en: 'off', ne: 'off' }, max: 8 },
    'hero.title': { shared: 'hero.kicker', label: 'Letter: first line', default: { en: 'We are getting married', ne: 'शुभ विवाह' }, max: 32 },
    'hero.line': { label: 'Letter: one line above the names', default: { en: 'Together with our families, we would love you to celebrate with us', ne: 'दुवै परिवारको शुभ आशीर्वादसहित हजुरलाई सादर निम्तो' }, max: 90, multiline: true },
    'wall.kicker': { label: 'Postcards: small label', default: { en: 'By dove post', ne: 'परेवाको हुलाक' }, max: 28 },
    'wall.title': { label: 'Postcards: title', default: { en: 'News for you, card by card', ne: 'हजुरका लागि शुभ सन्देश' }, max: 40 },
    'couple.title': { shared: 'couple.title', label: 'Couple postcard: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 28 },
    'couple.line': { shared: 'couple.line', label: 'Couple postcard: one line (type - to remove)', default: { en: 'Soon to be married, with the blessings of both families.', ne: 'दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।' }, max: 90, multiline: true },
    'families.title': { label: 'Families: title', default: { en: 'With our families’ blessings', ne: 'दुवै परिवारको आशीर्वादसहित' }, max: 48 },
    'count.title': { label: 'Countdown: title', default: { en: 'Until the day', ne: 'शुभ घडी आउन बाँकी' }, max: 36 },
    'prog.title': { shared: 'events.title', label: 'Ceremonies: title on each postcard', default: { en: 'The celebrations', ne: 'कार्यक्रम' }, max: 32 },
    'gallery.title': { label: 'Postcard rack: title', default: { en: 'Picture postcards', ne: 'तस्बिरका पोस्टकार्ड' }, max: 32 },
    'gallery.hint': { label: 'Postcard rack: hint', default: { en: 'Keep scrolling to turn the cards', ne: 'कार्ड पल्टाउन तल सार्नुहोस्' }, max: 48 },
    'card.line': { shared: 'hero.line', label: 'Letter: the one line of invitation', default: { en: 'We joyfully invite you and your family to bless the couple with your presence.', ne: 'शुभ विवाहमा सपरिवार पधारी आशीर्वाद दिनुहुन हार्दिक अनुरोध छ।' }, max: 100, multiline: true },
    'card.button': { shared: 'card.button', label: 'Button: read the full card', default: { en: 'Read the full letter', ne: 'पूरा निम्तो पढ्नुहोस्' }, max: 36 },
    'rsvp.title': { shared: 'reply.title', label: 'Reply: title', default: { en: 'Write back to us', ne: 'जवाफ लेखिपठाउनुहोस्' }, max: 32 },
    'rsvp.send': { label: 'Reply: send button', default: { en: 'Post your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
    'rsvp.sent': { label: 'Reply: line after posting', default: { en: 'Your reply is on its way to us', ne: 'हजुरको जवाफ हामीतिर आउँदैछ' }, max: 48 },
  },
  // Opening colours the client may change (docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--sd-lac': { label: 'Lac red (seal, postmarks, buttons)', default: '#B3261E' },
    '--sd-paper': { label: 'Letter paper', default: '#FFFBF3' },
    '--sd-ink': { label: 'Ink', default: '#2A1E1A' },
    '--sd-brass': { label: 'Brass', default: '#A57F37' },
  },
  // Mix (docs/MIX.md). The opening is this first screen itself (the letter on the rooftop breaks its seal and unfolds into
  // the names), so neither part travels alone; another theme's gate may open onto the letter, already unfolded.
  parts: {
    gate: false, hero: false, hostGate: true, hostHero: false, ownGateNeedsHero: true,
    why: {
      gate: 'Its opening is the letter on its own first screen: the seal breaks and the letter unfolds into the names.',
      hero: 'The letter unfolds out of its own opening; it does not stand alone as a first screen.',
      hostHero: 'The doves bring the letter that opens here; another first screen would leave nothing to unfold.',
    },
  },
};
