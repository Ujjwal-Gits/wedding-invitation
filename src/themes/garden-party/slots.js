// Garden Party · international, garden: every design image and text, replaceable from the studio. Plain data, no
// imports (the server loads this file). Names, dates, events, story, photos, travel, RSVP and the card wording are
// invitation data, edited in the studio's own sections. English only (the `ne` side stays empty on purpose).
export default {
  theme: 'garden-party',
  name: 'Garden Party',
  description: 'A sheet of frosted vellum lifts off a watercolor garden: a rose arbor, white chairs and a lawn aisle',
  market: 'intl',
  style: 'garden',
  occasions: ['wedding', 'engagement', 'anniversary', 'vow-renewal', 'rehearsal-dinner', 'bridal-shower', 'birthday', 'dinner-party'],
  // Made for Christian weddings: the cross-and-rings emblem and the verse show only when the invitation's faith is
  // Christian (src/core/faith.js) and 'faith.show' is not "off"; 'other' (no faith) shows neither.
  faith: 'christian',
  religions: ['buddhist', 'kirat', 'muslim', 'christian', 'other'],
  faithInk: '--vw-accent',
  images: {
    'hero.sky': { label: 'Sky (top of the first screen)', kind: 'detail', default: { lg: '/themes/garden-party/art/sky.webp', sm: '/themes/garden-party/art/sky-sm.webp', w: 1200, h: 440, alt: '' }, note: 'A wide, soft sky that fades to white at the bottom. Leave as is unless you have your own art.' },
    'hero.garden': { label: 'Garden painting (opening and first screen)', kind: 'scene', default: { lg: '/themes/garden-party/art/garden.webp', sm: '/themes/garden-party/art/garden-sm.webp', w: 1200, h: 1420, alt: 'A watercolor garden: a white rose arbor at the end of a lawn aisle, white chairs on both sides' }, note: 'Portrait painting with white at the top; the scene sits at the bottom.' },
    'close.arbor': { label: 'Arbor (closing window)', kind: 'scene', default: { lg: '/themes/garden-party/art/arbor.webp', sm: '/themes/garden-party/art/arbor-sm.webp', w: 744, h: 992, alt: 'The rose arbor at the end of the aisle' }, note: 'Portrait, about 3:4. Shown in an arched window at the end of the page.' },
    'couple.lead': { label: 'Main photo', kind: 'couple', default: { portrait: 0 }, note: 'Shown whole beside your story. Portrait or landscape.' },
    'gallery.1': { label: 'Photos: photo 1', kind: 'couple', default: { portrait: 1 }, note: 'Shown whole, never cropped. Repeats are skipped.' },
    'gallery.2': { label: 'Photos: photo 2', kind: 'couple', default: { portrait: 2 }, note: 'Shown whole, never cropped.' },
    'gallery.3': { label: 'Photos: photo 3', kind: 'couple', default: { portrait: 3 }, note: 'Shown whole, never cropped.' },
    'gallery.4': { label: 'Photos: photo 4', kind: 'couple', default: { portrait: 4 }, note: 'Shown whole, never cropped.' },
    'gallery.5': { label: 'Photos: photo 5', kind: 'couple', default: { portrait: 5 }, note: 'Shown whole, never cropped.' },
    'gallery.6': { label: 'Photos: photo 6', kind: 'couple', default: { portrait: 6 }, note: 'Shown whole, never cropped.' },
  },
  texts: {
    'gate.line': { shared: 'gate.line', label: 'Opening: line on the vellum', default: { en: 'You’re invited', ne: '' }, max: 48 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Open the invitation', ne: '' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: '' }, max: 32 },
    'hero.kicker': { shared: 'hero.kicker', label: 'First screen: line above the names', default: { en: 'Together with their families', ne: '' }, max: 48 },
    'hero.line': { shared: 'hero.line', label: 'First screen: line under the names', default: { en: 'invite you to a garden wedding', ne: '' }, max: 70 },
    'couple.title': { shared: 'couple.title', label: 'Story: title', default: { en: 'The two of us', ne: '' }, max: 36 },
    'story.title': { label: 'Story: small heading', default: { en: 'Our story', ne: '' }, max: 30 },
    'count.title': { label: 'Countdown: title', default: { en: 'Counting down to the big day', ne: '' }, max: 48 },
    'count.done': { label: 'Countdown: on the day', default: { en: 'Today’s the day', ne: '' }, max: 40 },
    'prog.title': { shared: 'events.title', label: 'Schedule: title', default: { en: 'The weekend', ne: '' }, max: 32 },
    'prog.menu': { label: 'Schedule: small menu heading', default: { en: 'At a glance', ne: '' }, max: 28 },
    'gallery.title': { shared: 'gallery.title', label: 'Photos: title', default: { en: 'A few favorites', ne: '' }, max: 32 },
    'info.title': { label: 'Travel: title', default: { en: 'Travel and stays', ne: '' }, max: 32 },
    'live.line': { label: 'Livestream: line', default: { en: 'Can’t be there? Watch the ceremony live.', ne: '' }, max: 70 },
    'card.button': { shared: 'card.button', label: 'Button: read the full invitation', default: { en: 'Read the invitation', ne: '' }, max: 32 },
    'families.title': { label: 'Hosts: title', default: { en: 'With love from our families', ne: '' }, max: 40 },
    'rsvp.kicker': { label: 'RSVP: small heading on the guestbook page', default: { en: 'The guestbook', ne: '' }, max: 32 },
    'rsvp.sign': { label: 'RSVP: label of the name line', default: { en: 'Sign your name', ne: '' }, max: 32 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: '' }, max: 32 },
    'rsvp.yes': { label: 'RSVP: yes', default: { en: 'Happily attends', ne: '' }, max: 28 },
    'rsvp.no': { label: 'RSVP: no', default: { en: 'Sadly can’t make it', ne: '' }, max: 28 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send RSVP', ne: '' }, max: 24 },
    'faith.show': { label: 'Faith: show the small cross emblem and the verse (type off to hide)', default: { en: 'on', ne: '' }, max: 8 },
    'verse.text': { label: 'Verse', default: { en: 'And over all these virtues put on love, which binds them all together in perfect unity.', ne: '' }, max: 220, multiline: true },
    'verse.ref': { label: 'Verse: reference', default: { en: 'Colossians 3:14', ne: '' }, max: 40 },
  },
  // Colours the client may change; applied inline on <body>.
  colors: {
    '--vw-accent': { label: 'Garden green (names, buttons, stripes)', default: '#2D6A3E' },
    '--vw-bg': { label: 'Page', default: '#FFFFFF' },
    '--gp-tint': { label: 'Lawn tint (hosts band)', default: '#F0F6EE' },
  },
  // Mix (docs/MIX.md): the international designs do not lend or take Nepal gates and first screens.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: { gate: 'International designs keep their own opening.', hero: 'International designs keep their own first screen.', hostGate: 'International designs keep their own opening.', hostHero: 'International designs keep their own first screen.' },
  },
};
