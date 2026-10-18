// Letterpress · international, classic: every design image and text, replaceable from the studio. Plain data, no
// imports (the server loads this file). Names, dates, events, story, photos, travel, RSVP and the card wording are
// invitation data, edited in the studio's own sections. English only (the `ne` side stays empty on purpose).
export default {
  theme: 'letterpress',
  name: 'Letterpress',
  description: 'A deckled cotton card lifts off sage linen and turns over to its pressed invitation; the suite lies on the linen',
  market: 'intl',
  style: 'classic',
  occasions: ['wedding', 'engagement', 'anniversary', 'vow-renewal', 'rehearsal-dinner', 'graduation', 'dinner-party'],
  // Made for Christian weddings: the cross-and-rings emblem (debossed on the card) and the verse show only when the
  // invitation's faith is Christian (src/core/faith.js) and 'faith.show' is not "off"; 'other' (no faith) shows neither.
  faith: 'christian',
  religions: ['buddhist', 'kirat', 'muslim', 'christian', 'other'],
  faithInk: '--vw-accent',
  images: {
    'hero.card': { label: 'Cotton card (opening, first screen, every card of the suite)', kind: 'detail', default: { lg: '/themes/letterpress/art/card.webp', sm: '/themes/letterpress/art/card-sm.webp', w: 1098, h: 1598, alt: '' }, note: 'A blank deckled cotton card on a transparent ground, portrait 1098 × 1598. Leave as is unless you have your own.' },
    'hero.sprig': { label: 'Olive sprig and silk ribbon (tucked under the card)', kind: 'detail', default: { lg: '/themes/letterpress/art/sprig.webp', sm: '/themes/letterpress/art/sprig-sm.webp', w: 730, h: 1220, alt: '' }, note: 'Made to sit under the card’s bottom-right corner; transparent where the card lies.' },
    'hero.linen': { label: 'Linen (the table under the suite)', kind: 'detail', default: { lg: '/themes/letterpress/art/linen.webp', sm: '/themes/letterpress/art/linen.webp', w: 512, h: 200, alt: '' }, note: 'A seamless fabric tile.' },
    'couple.lead': { label: 'Main photo (a print beside your story)', kind: 'couple', default: { portrait: 0 }, note: 'Shown whole as a print laid on the linen. Portrait or landscape.' },
    'gallery.1': { label: 'Prints: photo 1', kind: 'couple', default: { portrait: 1 }, note: 'Whole prints laid on the linen, never cropped. Repeats are skipped.' },
    'gallery.2': { label: 'Prints: photo 2', kind: 'couple', default: { portrait: 2 }, note: 'Shown whole, never cropped.' },
    'gallery.3': { label: 'Prints: photo 3', kind: 'couple', default: { portrait: 3 }, note: 'Shown whole, never cropped.' },
    'gallery.4': { label: 'Prints: photo 4', kind: 'couple', default: { portrait: 4 }, note: 'Shown whole, never cropped.' },
  },
  texts: {
    'gate.line': { shared: 'gate.line', label: 'Opening: line on the back of the card', default: { en: 'You’re invited', ne: '' }, max: 48 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Turn the card over', ne: '' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: '' }, max: 32 },
    'hero.kicker': { shared: 'hero.kicker', label: 'Card: line above the names', default: { en: 'The pleasure of your company is requested at the wedding of', ne: '' }, max: 80 },
    'hero.line': { shared: 'hero.line', label: 'Card: line under the names (empty for a wedding: the line above says it)', default: { en: '', ne: '' }, max: 70 },
    'couple.title': { shared: 'couple.title', label: 'Story: title', default: { en: 'The two of us', ne: '' }, max: 36 },
    'story.title': { label: 'Story: small heading', default: { en: 'Our story', ne: '' }, max: 30 },
    'count.title': { label: 'Calendar card: small heading', default: { en: 'Save the date', ne: '' }, max: 48 },
    'count.done': { label: 'Countdown: on the day', default: { en: 'Today’s the day', ne: '' }, max: 40 },
    'prog.title': { shared: 'events.title', label: 'Schedule: title', default: { en: 'The weekend', ne: '' }, max: 32 },
    'gallery.title': { shared: 'gallery.title', label: 'Prints: label', default: { en: 'A few favorites', ne: '' }, max: 32 },
    'info.title': { label: 'Travel: title', default: { en: 'Travel and stays', ne: '' }, max: 32 },
    'live.line': { label: 'Livestream: line', default: { en: 'Can’t be there? Watch the ceremony live.', ne: '' }, max: 70 },
    'card.button': { shared: 'card.button', label: 'Button: read the full invitation', default: { en: 'Read the invitation', ne: '' }, max: 32 },
    'families.title': { label: 'Hosts: title', default: { en: 'With love from our families', ne: '' }, max: 40 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Kindly reply', ne: '' }, max: 32 },
    'rsvp.yes': { label: 'RSVP: yes', default: { en: 'Joyfully accepts', ne: '' }, max: 28 },
    'rsvp.no': { label: 'RSVP: no', default: { en: 'Regretfully declines', ne: '' }, max: 28 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send RSVP', ne: '' }, max: 24 },
    'faith.show': { label: 'Faith: show the small cross emblem and the verse (type off to hide)', default: { en: 'on', ne: '' }, max: 8 },
    'verse.text': { label: 'Verse (pressed on the families card)', default: { en: 'Love is patient, love is kind. It always protects, always trusts, always hopes, always perseveres.', ne: '' }, max: 220, multiline: true },
    'verse.ref': { label: 'Verse: reference', default: { en: '1 Corinthians 13:4, 7', ne: '' }, max: 40 },
  },
  // Colours the client may change; applied inline on <body>.
  colors: {
    '--vw-accent': { label: 'Pressed green ink (names, headings, buttons)', default: '#33472F' },
    '--lp-linen': { label: 'Linen', default: '#97977F' },
  },
  // Mix (docs/MIX.md): the international designs do not lend or take Nepal gates and first screens.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: { gate: 'International designs keep their own opening.', hero: 'International designs keep their own first screen.', hostGate: 'International designs keep their own opening.', hostHero: 'International designs keep their own first screen.' },
  },
};
