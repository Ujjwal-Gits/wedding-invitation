// Jali · international, classic: every design image and text, replaceable from the studio. Plain data, no imports
// (the server loads this file). Names, dates, events, story, photos, travel, RSVP and the card wording are invitation
// data, edited in the studio's own sections. English only (the `ne` side stays empty on purpose). The lattice screens
// and the brass lanterns are drawn in code (no art to replace); their colours follow the tokens below.
export default {
  theme: 'jali',
  name: 'Jali',
  description: 'Emerald lattice screens slide apart under glowing brass lanterns',
  market: 'intl',
  style: 'classic',
  occasions: ['wedding', 'engagement', 'anniversary'],
  // Made for Muslim weddings: the Bismillah, the verse and the crescent emblem show only when the invitation's faith is
  // Muslim (src/core/faith.js) and 'faith.show' is not "off"; 'other' (no faith) and ?v=neutral show none of them.
  faith: 'muslim',
  religions: ['muslim', 'other'],
  faithInk: '--vw-accent',
  images: {
    'couple.lead': { label: 'Main photo', kind: 'couple', default: { portrait: 0 }, note: 'Shown whole in the story tile. Portrait or landscape.' },
    'gallery.1': { label: 'Photos: photo 1', kind: 'couple', default: { portrait: 1 }, note: 'Shown whole, never cropped. Repeats are skipped.' },
    'gallery.2': { label: 'Photos: photo 2', kind: 'couple', default: { portrait: 2 }, note: 'Shown whole, never cropped.' },
    'gallery.3': { label: 'Photos: photo 3', kind: 'couple', default: { portrait: 3 }, note: 'Shown whole, never cropped.' },
    'gallery.4': { label: 'Photos: photo 4', kind: 'couple', default: { portrait: 4 }, note: 'Shown whole, never cropped.' },
    'gallery.5': { label: 'Photos: photo 5', kind: 'couple', default: { portrait: 5 }, note: 'Shown whole, never cropped.' },
    'gallery.6': { label: 'Photos: photo 6', kind: 'couple', default: { portrait: 6 }, note: 'Shown whole, never cropped.' },
  },
  texts: {
    'gate.line': { shared: 'gate.line', label: 'Opening: line on the screens', default: { en: 'You are invited', ne: '' }, max: 40 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Open the invitation', ne: '' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: '' }, max: 32 },
    'hero.kicker': { shared: 'hero.kicker', label: 'First screen: line above the names', default: { en: 'With the blessings of their families', ne: '' }, max: 48 },
    'hero.line': { shared: 'hero.line', label: 'First screen: line under the names', default: { en: 'request the honor of your presence at their wedding', ne: '' }, max: 70 },
    'couple.title': { shared: 'couple.title', label: 'Story: title', default: { en: 'The two of us', ne: '' }, max: 36 },
    'story.title': { label: 'Story: small heading', default: { en: 'Our story', ne: '' }, max: 30 },
    'count.title': { label: 'Countdown: title', default: { en: 'Counting the days', ne: '' }, max: 40 },
    'count.done': { label: 'Countdown: on the day', default: { en: 'Today is the day', ne: '' }, max: 40 },
    'prog.title': { shared: 'events.title', label: 'Schedule: title', default: { en: 'The celebrations', ne: '' }, max: 32 },
    'gallery.title': { shared: 'gallery.title', label: 'Photos: title', default: { en: 'A few favorites', ne: '' }, max: 32 },
    'info.title': { label: 'Travel: title', default: { en: 'Travel and stays', ne: '' }, max: 32 },
    'live.line': { label: 'Livestream: line', default: { en: 'Can’t be there? Watch the Nikah live.', ne: '' }, max: 70 },
    'card.button': { shared: 'card.button', label: 'Button: read the full invitation', default: { en: 'Read the invitation', ne: '' }, max: 32 },
    'families.title': { label: 'Hosts: title', default: { en: 'With love from our families', ne: '' }, max: 40 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Kindly reply', ne: '' }, max: 32 },
    'rsvp.turn': { label: 'RSVP: button that turns the tile over', default: { en: 'Reply now', ne: '' }, max: 24 },
    'rsvp.yes': { label: 'RSVP: yes', default: { en: 'Joyfully accepts', ne: '' }, max: 28 },
    'rsvp.no': { label: 'RSVP: no', default: { en: 'Regretfully declines', ne: '' }, max: 28 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send reply', ne: '' }, max: 24 },
    'faith.show': { label: 'Faith: show the Bismillah, the verse and the small emblem (type off to hide)', default: { en: 'on', ne: '' }, max: 8 },
    'bismillah.show': { label: 'Faith: show the Bismillah (type off to hide)', default: { en: 'on', ne: '' }, max: 8 },
    'verse.text': { label: 'Verse', default: { en: 'And among His signs is that He created for you spouses from among yourselves, that you may find tranquility in them; and He placed between you affection and mercy.', ne: '' }, max: 240, multiline: true },
    'verse.ref': { label: 'Verse: reference', default: { en: 'Qur’an 30:21', ne: '' }, max: 40 },
  },
  // Colours the client may change; applied inline on <body>.
  colors: {
    '--vw-accent': { label: 'Gold (lines, stars, buttons)', default: '#CDA959' },
    '--jl-emerald': { label: 'Emerald (page and screens)', default: '#0E3B31' },
    '--jl-ivory': { label: 'Ivory (light tiles)', default: '#F7F1E3' },
  },
  // Mix (docs/MIX.md): the international designs do not lend or take Nepal gates and first screens.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: { gate: 'International designs keep their own opening.', hero: 'International designs keep their own first screen.', hostGate: 'International designs keep their own opening.', hostHero: 'International designs keep their own first screen.' },
  },
};
