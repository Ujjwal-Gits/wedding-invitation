// Gold Arch · international, modern, made for Muslim weddings: every design image and text, replaceable from the studio. Plain data, no
// imports (the server loads this file). Names, dates, events, story, photos, travel, RSVP and the card wording are
// invitation data, edited in the studio's own sections. English only (the `ne` side stays empty on purpose).
export default {
  theme: 'gold-arch',
  name: 'Gold Arch',
  description: 'A fine gold mihrab arch draws itself, an eight-point star at its apex; a modern, editorial page in black, white and gold',
  market: 'intl',
  style: 'modern',
  occasions: ['wedding', 'engagement', 'anniversary', 'dinner-party'],
  // Made for Muslim weddings: the Bismillah, the verse and the crescent emblem show only when the invitation's faith is
  // Muslim (src/core/faith.js) and 'faith.show' is not "off"; 'other' (no faith) and ?v=neutral show none of them.
  faith: 'muslim',
  religions: ['muslim'],
  faithInk: '--ga-gold',
  images: {
    'hero.rose': { label: 'Rose and eucalyptus (first screen, closing)', kind: 'detail', default: { lg: '/themes/gold-arch/art/rose.webp', sm: '/themes/gold-arch/art/rose-sm.webp', w: 682, h: 999, alt: '' }, note: 'A transparent watercolor corner spray that sits on the arch’s lower right. Leave as is unless you have your own art.' },
    'couple.lead': { label: 'Main photo', kind: 'couple', default: { portrait: 0 }, note: 'Shown whole above your story. Landscape or portrait; hands, rings and flowers work beautifully.' },
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
    'hero.line': { shared: 'hero.line', label: 'First screen: line under the names', default: { en: 'invite you to their wedding', ne: '' }, max: 60 },
    'couple.title': { shared: 'couple.title', label: 'Story: title', default: { en: 'The two of us', ne: '' }, max: 36 },
    'story.title': { label: 'Story: small heading', default: { en: 'Our story', ne: '' }, max: 30 },
    'count.title': { label: 'Countdown: title', default: { en: 'The day', ne: '' }, max: 40 },
    'count.left': { label: 'Countdown: words under the days', default: { en: 'days to go', ne: '' }, max: 24 },
    'count.done': { label: 'Countdown: on the day', default: { en: 'Today’s the day', ne: '' }, max: 40 },
    'prog.title': { shared: 'events.title', label: 'Schedule: title', default: { en: 'Schedule', ne: '' }, max: 32 },
    'gallery.title': { shared: 'gallery.title', label: 'Photos: title', default: { en: 'Photographs', ne: '' }, max: 32 },
    'info.title': { label: 'Travel: title', default: { en: 'Travel and stays', ne: '' }, max: 32 },
    'live.line': { label: 'Livestream: line', default: { en: 'Can’t be there? Watch the ceremony live.', ne: '' }, max: 70 },
    'card.button': { shared: 'card.button', label: 'Button: read the full invitation', default: { en: 'Read the invitation', ne: '' }, max: 32 },
    'families.title': { label: 'Hosts: title', default: { en: 'Hosted by', ne: '' }, max: 40 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Kindly reply', ne: '' }, max: 32 },
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
    '--ga-gold': { label: 'Gold (the arch, the star and fine rules)', default: '#B08D57' },
    '--vw-accent': { label: 'Ink (buttons, links)', default: '#161513' },
    '--vw-bg': { label: 'Page', default: '#FFFFFF' },
  },
  // Mix (docs/MIX.md): the international designs do not lend or take Nepal gates and first screens.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: { gate: 'International designs keep their own opening.', hero: 'International designs keep their own first screen.', hostGate: 'International designs keep their own opening.', hostHero: 'International designs keep their own first screen.' },
  },
};
