// Olive Grove · international, garden: every design image and text, replaceable from the studio. Plain data, no
// imports (the server loads this file). Names, dates, events, story, photos, travel, RSVP and the card wording are
// invitation data, edited in the studio's own sections. English only (the `ne` side stays empty on purpose).
export default {
  theme: 'olive-grove',
  name: 'Olive Grove',
  description: 'A folded linen card opens and a watercolor olive wreath grows around your names',
  market: 'intl',
  style: 'garden',
  occasions: ['wedding', 'engagement', 'anniversary', 'vow-renewal', 'rehearsal-dinner', 'bridal-shower', 'dinner-party'],
  // Made for Christian weddings: the cross-and-rings emblem and the verse show only when the invitation's faith is
  // Christian (src/core/faith.js) and 'faith.show' is not "off"; 'other' (no faith) shows neither.
  faith: 'christian',
  religions: ['buddhist', 'kirat', 'muslim', 'christian', 'other'],
  faithInk: '--vw-accent',
  images: {
    'hero.wreath': { label: 'Olive wreath (opening and first screen)', kind: 'detail', default: { lg: '/themes/olive-grove/art/wreath.webp', sm: '/themes/olive-grove/art/wreath-sm.webp', w: 1200, h: 1536, alt: '' }, note: 'A transparent watercolor wreath, open at the top. Leave as is unless you have your own art.' },
    'couple.lead': { label: 'Main photo', kind: 'couple', default: { portrait: 0 }, note: 'Shown whole beside your story. Portrait or landscape.' },
    'gallery.1': { label: 'Photos: photo 1', kind: 'couple', default: { portrait: 1 }, note: 'Shown whole, never cropped. Repeats are skipped.' },
    'gallery.2': { label: 'Photos: photo 2', kind: 'couple', default: { portrait: 2 }, note: 'Shown whole, never cropped.' },
    'gallery.3': { label: 'Photos: photo 3', kind: 'couple', default: { portrait: 3 }, note: 'Shown whole, never cropped.' },
    'gallery.4': { label: 'Photos: photo 4', kind: 'couple', default: { portrait: 4 }, note: 'Shown whole, never cropped.' },
    'gallery.5': { label: 'Photos: photo 5', kind: 'couple', default: { portrait: 5 }, note: 'Shown whole, never cropped.' },
    'gallery.6': { label: 'Photos: photo 6', kind: 'couple', default: { portrait: 6 }, note: 'Shown whole, never cropped.' },
  },
  texts: {
    'gate.line': { shared: 'gate.line', label: 'Opening: line above the button', default: { en: 'You’re invited', ne: '' }, max: 48 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Open the invitation', ne: '' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: '' }, max: 32 },
    'hero.kicker': { shared: 'hero.kicker', label: 'First screen: line above the names', default: { en: 'Together with their families', ne: '' }, max: 48 },
    'hero.line': { shared: 'hero.line', label: 'First screen: line under the names', default: { en: 'invite you to celebrate their wedding', ne: '' }, max: 70 },
    'couple.title': { shared: 'couple.title', label: 'Story: title', default: { en: 'The two of us', ne: '' }, max: 36 },
    'story.title': { label: 'Story: small heading', default: { en: 'Our story', ne: '' }, max: 30 },
    'count.title': { label: 'Countdown: title', default: { en: 'Counting down to the big day', ne: '' }, max: 48 },
    'count.done': { label: 'Countdown: on the day', default: { en: 'Today’s the day', ne: '' }, max: 40 },
    'prog.title': { shared: 'events.title', label: 'Schedule: title', default: { en: 'The weekend', ne: '' }, max: 32 },
    'gallery.title': { shared: 'gallery.title', label: 'Photos: title', default: { en: 'A few favorites', ne: '' }, max: 32 },
    'info.title': { label: 'Travel: title', default: { en: 'Travel and stays', ne: '' }, max: 32 },
    'live.line': { label: 'Livestream: line', default: { en: 'Can’t be there? Watch the ceremony live.', ne: '' }, max: 70 },
    'card.button': { shared: 'card.button', label: 'Button: read the full invitation', default: { en: 'Read the invitation', ne: '' }, max: 32 },
    'families.title': { label: 'Hosts: title', default: { en: 'With love from our families', ne: '' }, max: 40 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: '' }, max: 32 },
    'rsvp.yes': { label: 'RSVP: yes', default: { en: 'Joyfully accepts', ne: '' }, max: 28 },
    'rsvp.no': { label: 'RSVP: no', default: { en: 'Regretfully declines', ne: '' }, max: 28 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send RSVP', ne: '' }, max: 24 },
    'faith.show': { label: 'Faith: show the small cross emblem and the verse (type off to hide)', default: { en: 'on', ne: '' }, max: 8 },
    'verse.text': { label: 'Verse', default: { en: 'Love is patient, love is kind. It always protects, always trusts, always hopes, always perseveres.', ne: '' }, max: 220, multiline: true },
    'verse.ref': { label: 'Verse: reference', default: { en: '1 Corinthians 13:4, 7', ne: '' }, max: 40 },
  },
  // Colours the client may change; applied inline on <body>.
  colors: {
    '--vw-accent': { label: 'Olive green (names, buttons)', default: '#4A6136' },
    '--vw-bg': { label: 'Page', default: '#FFFFFF' },
    '--og-linen': { label: 'Linen card (opening)', default: '#F3F1EA' },
  },
  // Mix (docs/MIX.md): the international designs do not lend or take Nepal gates and first screens.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: { gate: 'International designs keep their own opening.', hero: 'International designs keep their own first screen.', hostGate: 'International designs keep their own opening.', hostHero: 'International designs keep their own first screen.' },
  },
};
