// Rose Arch · international, romantic: every design image and text, replaceable from the studio. Plain data, no
// imports (the server loads this file). Names, dates, events, story, photos, travel, RSVP and the card wording are
// invitation data, edited in the studio's own sections. English only (the `ne` side stays empty on purpose).
export default {
  theme: 'rose-arch',
  name: 'Rose Arch',
  description: 'Walk through a stone arch of climbing roses into a garden of rooms: your date in the doorway, cards that stack as you scroll',
  market: 'intl',
  style: 'romantic',
  occasions: ['wedding', 'engagement', 'anniversary', 'vow-renewal', 'rehearsal-dinner'],
  // Made for Christian weddings (a chapel-garden mood): the cross-and-rings emblem and the verse show only when the
  // invitation's faith is Christian (src/core/faith.js) and 'faith.show' is not "off"; 'other' (no faith) shows neither.
  faith: 'christian',
  religions: ['christian', 'other'],
  faithInk: '--vw-accent',
  images: {
    'gate.arch': { label: 'Rose arch (opening)', kind: 'detail', default: { lg: '/themes/rose-arch/art/gate.webp', sm: '/themes/rose-arch/art/gate-sm.webp', w: 1200, h: 2400, alt: '' }, note: 'The watercolor arch guests walk through. The opening is fitted to its doorway: leave as is unless your art has the same shape (1:2, doorway in the middle).' },
    'hero.arch': { label: 'Rose arch (first screen)', kind: 'detail', default: { lg: '/themes/rose-arch/art/arch.webp', sm: '/themes/rose-arch/art/arch-sm.webp', w: 1200, h: 1880, alt: '' }, note: 'The arch with your date in its doorway. Leave as is unless you have the same art.' },
    'couple.lead': { label: 'Main photo', kind: 'couple', default: { portrait: 0 }, note: 'Shown whole in a matted frame beside your names. Portrait or landscape.' },
    'gallery.1': { label: 'Photos: photo 1', kind: 'couple', default: { portrait: 1 }, note: 'Shown whole on the photo wall, never cropped. Repeats are skipped.' },
    'gallery.2': { label: 'Photos: photo 2', kind: 'couple', default: { portrait: 2 }, note: 'Shown whole, never cropped.' },
    'gallery.3': { label: 'Photos: photo 3', kind: 'couple', default: { portrait: 3 }, note: 'Shown whole, never cropped.' },
    'gallery.4': { label: 'Photos: photo 4', kind: 'couple', default: { portrait: 4 }, note: 'Shown whole, never cropped.' },
    'gallery.5': { label: 'Photos: photo 5', kind: 'couple', default: { portrait: 5 }, note: 'Shown whole, never cropped.' },
    'gallery.6': { label: 'Photos: photo 6', kind: 'couple', default: { portrait: 6 }, note: 'Shown whole, never cropped.' },
  },
  texts: {
    'gate.line': { shared: 'gate.line', label: 'Opening: line above the names', default: { en: 'You’re invited', ne: '' }, max: 48 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Step inside', ne: '' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: '' }, max: 32 },
    'faith.show': { label: 'Faith: show the small cross emblem and the verse (type off to hide)', default: { en: 'on', ne: '' }, max: 8 },
    'verse.text': { label: 'Verse (in the arched panel)', default: { en: 'Love is patient, love is kind. It always protects, always trusts, always hopes, always perseveres.', ne: '' }, max: 220, multiline: true },
    'verse.ref': { label: 'Verse: reference', default: { en: '1 Corinthians 13:4, 7', ne: '' }, max: 40 },
    'hero.kicker': { shared: 'hero.kicker', label: 'First screen: line above the names', default: { en: 'The wedding of', ne: '' }, max: 48 },
    'hero.line': { shared: 'hero.line', label: 'First screen: line under the names', default: { en: 'Please join us as we say “I do”', ne: '' }, max: 70 },
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
  },
  // Colours the client may change; applied inline on <body>.
  colors: {
    '--vw-accent': { label: 'Deep rose (buttons, headings, reply card)', default: '#7E2A40' },
    '--vw-bg': { label: 'Page', default: '#FEFDFB' },
    '--ra-blush': { label: 'Blush rooms (photos, hosts)', default: '#FAEEEA' },
    '--ra-sage': { label: 'Garden green rooms (countdown)', default: '#F2F6E6' },
  },
  // Mix (docs/MIX.md): the international designs do not lend or take Nepal gates and first screens.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: { gate: 'International designs keep their own opening.', hero: 'International designs keep their own first screen.', hostGate: 'International designs keep their own opening.', hostHero: 'International designs keep their own first screen.' },
  },
};
