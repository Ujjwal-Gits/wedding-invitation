// Wax Seal · international, modern, made for Christian weddings: every design image and text, replaceable from the
// studio. Plain data, no imports (the server loads this file). Names, dates, events, story, photos, travel, RSVP and the
// card wording are invitation data, edited in the studio's own sections. English only (the `ne` side stays empty).
export default {
  theme: 'wax-seal',
  name: 'Wax Seal',
  description: 'Break the sage wax seal and the letter rises out of its envelope; a collection of letters and notes',
  market: 'intl',
  style: 'modern',
  occasions: ['wedding', 'engagement', 'anniversary', 'vow-renewal', 'rehearsal-dinner', 'birthday', 'graduation', 'housewarming'],
  // Made for Christian weddings: the cross-and-rings emblem and the verse show only when the invitation's faith is
  // Christian (src/core/faith.js) and 'faith.show' is not "off"; 'other' (no faith) and ?v=neutral show neither.
  faith: 'christian',
  religions: ['buddhist', 'kirat', 'muslim', 'christian', 'other'],
  faithInk: '--vw-accent',
  images: {
    'gate.linen': { label: 'Linen (opening and first screen background)', kind: 'detail', default: { lg: '/themes/wax-seal/art/linen.webp', sm: '/themes/wax-seal/art/linen-sm.webp', w: 1200, h: 1060, alt: '' }, note: 'A soft white linen texture. Keep it light: the words sit on it.' },
    'gate.seal': { label: 'Wax seal (the button that opens the invitation)', kind: 'detail', default: { lg: '/themes/wax-seal/art/seal.webp', sm: '/themes/wax-seal/art/seal.webp', w: 246, h: 249, alt: '' }, note: 'A round wax seal on a transparent background, seen from above.' },
    'gate.sprig': { label: 'Rose and eucalyptus (on the envelope and the letter)', kind: 'detail', default: { lg: '/themes/wax-seal/art/sprig.webp', sm: '/themes/wax-seal/art/sprig-sm.webp', w: 615, h: 805, alt: '' }, note: 'A transparent cutout of fresh flowers, stems to the lower right.' },
    'couple.lead': { label: 'Main photo', kind: 'couple', default: { portrait: 0 }, note: 'Tucked into the story letter, shown whole. Portrait or landscape.' },
    'gallery.1': { label: 'Photos: photo 1', kind: 'couple', default: { portrait: 1 }, note: 'Shown whole, never cropped. Repeats are skipped.' },
    'gallery.2': { label: 'Photos: photo 2', kind: 'couple', default: { portrait: 2 }, note: 'Shown whole, never cropped.' },
    'gallery.3': { label: 'Photos: photo 3', kind: 'couple', default: { portrait: 3 }, note: 'Shown whole, never cropped.' },
    'gallery.4': { label: 'Photos: photo 4', kind: 'couple', default: { portrait: 4 }, note: 'Shown whole, never cropped.' },
    'gallery.5': { label: 'Photos: photo 5', kind: 'couple', default: { portrait: 5 }, note: 'Shown whole, never cropped.' },
    'gallery.6': { label: 'Photos: photo 6', kind: 'couple', default: { portrait: 6 }, note: 'Shown whole, never cropped.' },
  },
  texts: {
    'gate.line': { shared: 'gate.line', label: 'Opening: line above the names', default: { en: 'You’re invited', ne: '' }, max: 48 },
    'gate.open': { shared: 'gate.open', label: 'Opening: words under the envelope', default: { en: 'Tap the seal to open', ne: '' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: '' }, max: 32 },
    'hero.kicker': { shared: 'hero.kicker', label: 'First screen: line above the names', default: { en: 'Together with their families', ne: '' }, max: 48 },
    'hero.line': { shared: 'hero.line', label: 'First screen: line under the names', default: { en: 'invite you to celebrate their marriage', ne: '' }, max: 70 },
    'couple.title': { shared: 'couple.title', label: 'Story letter: title', default: { en: 'The two of us', ne: '' }, max: 36 },
    'story.title': { label: 'Story letter: greeting', default: { en: 'Dear friends and family,', ne: '' }, max: 40 },
    'story.sign': { label: 'Story letter: sign-off', default: { en: 'With love,', ne: '' }, max: 30 },
    'count.title': { label: 'Countdown note: title', default: { en: 'Save the date', ne: '' }, max: 40 },
    'count.done': { label: 'Countdown: on the day', default: { en: 'Today’s the day', ne: '' }, max: 40 },
    'prog.title': { shared: 'events.title', label: 'Schedule: title', default: { en: 'The weekend', ne: '' }, max: 32 },
    'prog.hint': { label: 'Schedule: swipe hint (phones)', default: { en: 'Swipe through the cards', ne: '' }, max: 32 },
    'gallery.title': { shared: 'gallery.title', label: 'Photos: title', default: { en: 'Snapshots', ne: '' }, max: 32 },
    'info.title': { label: 'Travel: title', default: { en: 'Notes for your trip', ne: '' }, max: 32 },
    'live.line': { label: 'Livestream: line', default: { en: 'Can’t be there? Watch the ceremony live.', ne: '' }, max: 70 },
    'card.button': { shared: 'card.button', label: 'Button: read the full invitation', default: { en: 'Read the invitation', ne: '' }, max: 32 },
    'families.title': { label: 'Hosts: title', default: { en: 'With love from our families', ne: '' }, max: 40 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Please reply', ne: '' }, max: 32 },
    'rsvp.yes': { label: 'RSVP: yes', default: { en: 'Joyfully accepts', ne: '' }, max: 28 },
    'rsvp.no': { label: 'RSVP: no', default: { en: 'Regretfully declines', ne: '' }, max: 28 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send the reply', ne: '' }, max: 24 },
    'faith.show': { label: 'Faith: show the small cross emblem and the verse (type off to hide)', default: { en: 'on', ne: '' }, max: 8 },
    'verse.text': { label: 'Verse', default: { en: 'Where you go I will go, and where you stay I will stay. Your people will be my people.', ne: '' }, max: 220, multiline: true },
    'verse.ref': { label: 'Verse: reference', default: { en: 'Ruth 1:16', ne: '' }, max: 40 },
  },
  // Colours the client may change; applied inline on <body>.
  colors: {
    '--vw-accent': { label: 'Deep sage (buttons, links, the emblem)', default: '#4C6150' },
    '--ws-sage': { label: 'Sage paper (notes, the reply envelope)', default: '#E9EFE6' },
    '--vw-bg': { label: 'Page', default: '#FFFFFF' },
  },
  // Mix (docs/MIX.md): the international designs do not lend or take Nepal gates and first screens.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: { gate: 'International designs keep their own opening.', hero: 'International designs keep their own first screen.', hostGate: 'International designs keep their own opening.', hostHero: 'International designs keep their own first screen.' },
  },
};
