// Andalus · international, destination, made for Muslim weddings: every design image and text, replaceable from the
// studio. Plain data, no imports (the server loads this file). Names, dates, events, story, photos, travel, RSVP and the
// card wording are invitation data, edited in the studio's own sections. English only (the `ne` side stays empty on purpose).
export default {
  theme: 'andalus',
  name: 'Andalus',
  description: 'A tiled scroll unrolls into a Moorish courtyard: horseshoe arch, fountain and orange trees, a calendar laid in zellige with your day in gold',
  market: 'intl',
  style: 'destination',
  occasions: ['wedding', 'engagement', 'anniversary'],
  // Made for Muslim weddings: the Bismillah, the verse and the crescent emblem show only when the invitation's faith is
  // Muslim (src/core/faith.js) and 'faith.show' is not "off"; 'other' (no faith) and ?v=neutral show none of them.
  faith: 'muslim',
  religions: ['muslim', 'other'],
  faithInk: '--vw-accent',
  images: {
    'hero.court': { label: 'Courtyard painting (first screen)', kind: 'detail', default: { lg: '/themes/andalus/art/court.webp', sm: '/themes/andalus/art/court-sm.webp', w: 1100, h: 1750, alt: 'A watercolor courtyard seen through a horseshoe arch, with a fountain and two orange trees' }, note: 'A transparent watercolor scene, tall. Leave as is unless you have your own art.' },
    'rsvp.blossom': { label: 'Orange blossom branch (reply scroll, closing)', kind: 'detail', default: { lg: '/themes/andalus/art/blossom.webp', sm: '/themes/andalus/art/blossom-sm.webp', w: 1200, h: 650, alt: '' }, note: 'A transparent watercolor branch. Leave as is unless you have your own art.' },
    'couple.lead': { label: 'Main photo', kind: 'couple', default: { portrait: 0 }, note: 'Shown whole in a tiled frame beside your story. Hands, rings and flowers work beautifully.' },
    'gallery.1': { label: 'Photos: photo 1', kind: 'couple', default: { portrait: 1 }, note: 'Shown whole, never cropped. Repeats are skipped.' },
    'gallery.2': { label: 'Photos: photo 2', kind: 'couple', default: { portrait: 2 }, note: 'Shown whole, never cropped.' },
    'gallery.3': { label: 'Photos: photo 3', kind: 'couple', default: { portrait: 3 }, note: 'Shown whole, never cropped.' },
    'gallery.4': { label: 'Photos: photo 4', kind: 'couple', default: { portrait: 4 }, note: 'Shown whole, never cropped.' },
    'gallery.5': { label: 'Photos: photo 5', kind: 'couple', default: { portrait: 5 }, note: 'Shown whole, never cropped.' },
    'gallery.6': { label: 'Photos: photo 6', kind: 'couple', default: { portrait: 6 }, note: 'Shown whole, never cropped.' },
  },
  texts: {
    'gate.line': { shared: 'gate.line', label: 'Opening: line above the button', default: { en: 'You’re invited', ne: '' }, max: 48 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Unroll the invitation', ne: '' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: '' }, max: 32 },
    'hero.kicker': { shared: 'hero.kicker', label: 'First screen: line above the names', default: { en: 'Together with their families', ne: '' }, max: 56 },
    'hero.line': { shared: 'hero.line', label: 'First screen: line under the names', default: { en: 'invite you to their Nikah and Walima', ne: '' }, max: 70 },
    'couple.title': { shared: 'couple.title', label: 'Story: title', default: { en: 'The two of us', ne: '' }, max: 36 },
    'story.title': { label: 'Story: small heading', default: { en: 'Our story', ne: '' }, max: 30 },
    'count.title': { label: 'Countdown: title', default: { en: 'Counting down to the big day', ne: '' }, max: 48 },
    'count.done': { label: 'Countdown: on the day', default: { en: 'Today’s the day', ne: '' }, max: 40 },
    'cal.title': { label: 'Calendar: title', default: { en: 'Save the date', ne: '' }, max: 32 },
    'prog.title': { shared: 'events.title', label: 'Schedule: title', default: { en: 'The celebrations', ne: '' }, max: 32 },
    'gallery.title': { shared: 'gallery.title', label: 'Photos: title', default: { en: 'A few favorites', ne: '' }, max: 32 },
    'info.title': { label: 'Travel: title', default: { en: 'Travel and stays', ne: '' }, max: 32 },
    'live.line': { label: 'Livestream: line', default: { en: 'Can’t be there? Watch the Nikah live.', ne: '' }, max: 70 },
    'card.button': { shared: 'card.button', label: 'Button: read the full invitation', default: { en: 'Read the invitation', ne: '' }, max: 32 },
    'families.title': { label: 'Hosts: title', default: { en: 'With love from our families', ne: '' }, max: 40 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: '' }, max: 32 },
    'rsvp.yes': { label: 'RSVP: yes', default: { en: 'Joyfully accepts', ne: '' }, max: 28 },
    'rsvp.no': { label: 'RSVP: no', default: { en: 'Regretfully declines', ne: '' }, max: 28 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Seal and send', ne: '' }, max: 24 },
    'faith.show': { label: 'Faith: show the Bismillah, the verse and the small crescent emblem (type off to hide)', default: { en: 'on', ne: '' }, max: 8 },
    'bismillah.show': { label: 'Faith: show the Bismillah above the verse (type off to hide)', default: { en: 'on', ne: '' }, max: 8 },
    'verse.text': { label: 'Verse', default: { en: 'And among His signs is that He created for you spouses from among yourselves, that you may find tranquility in them; and He placed between you affection and mercy.', ne: '' }, max: 240, multiline: true },
    'verse.ref': { label: 'Verse: reference', default: { en: 'Qur’an 30:21', ne: '' }, max: 40 },
  },
  // Colours the client may change; applied inline on <body>.
  colors: {
    '--vw-accent': { label: 'Deep teal (names, headings, buttons)', default: '#0D5A50' },
    '--an-field': { label: 'Courtyard tiles (opening and page edges)', default: '#0B3A35' },
    '--an-gold': { label: 'Gold leaf (the day, ornaments)', default: '#C2A05A' },
    '--vw-bg': { label: 'Scroll paper', default: '#FBF7EE' },
  },
  // Mix (docs/MIX.md): the international designs do not lend or take Nepal gates and first screens.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: { gate: 'International designs keep their own opening.', hero: 'International designs keep their own first screen.', hostGate: 'International designs keep their own opening.', hostHero: 'International designs keep their own first screen.' },
  },
};
