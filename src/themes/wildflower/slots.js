// Wildflower · international, romantic: every design image and text, replaceable from the studio. Plain data, no
// imports (the server loads this file). Names, dates, events, story, photos, travel, RSVP and the card wording are
// invitation data, edited in the studio's own sections. English only (the `ne` side stays empty on purpose).
const A = (name, w, h, alt = '') => ({ lg: `/themes/wildflower/art/${name}.webp`, sm: `/themes/wildflower/art/${name}-sm.webp`, w, h, alt });
const B = (name, w, h) => ({ lg: `/themes/wildflower/art/${name}.webp`, sm: `/themes/wildflower/art/${name}.webp`, w, h, alt: '' });
export default {
  theme: 'wildflower',
  name: 'Wildflower',
  description: 'A summer meadow of cosmos and lavender grows up the screen, butterflies drift in, and your story turns like a book',
  market: 'intl',
  style: 'romantic',
  occasions: ['wedding', 'engagement', 'anniversary', 'vow-renewal', 'rehearsal-dinner', 'bridal-shower', 'baby-shower', 'birthday'],
  // Made for Christian weddings: the cross-and-rings emblem and the verse show only when the invitation's faith is
  // Christian (src/core/faith.js) and 'faith.show' is not "off"; 'other' (no faith) shows neither.
  faith: 'christian',
  religions: ['christian', 'other'],
  faithInk: '--vw-accent',
  images: {
    'meadow.back': { label: 'Meadow: back layer (opening, first screen, last screen)', kind: 'detail', default: A('meadow-back', 1200, 760), note: 'Transparent watercolor, the top of the meadow. Leave as is unless you have your own art.' },
    'meadow.mid': { label: 'Meadow: middle layer', kind: 'detail', default: A('meadow-mid', 1200, 560), note: 'Transparent watercolor, the middle of the meadow.' },
    'meadow.front': { label: 'Meadow: front layer', kind: 'detail', default: A('meadow-front', 1200, 410), note: 'Transparent watercolor, the front of the meadow.' },
    'butterfly.1': { label: 'Butterfly (blue)', kind: 'detail', default: B('bfly-blue', 108, 106), note: 'A small transparent butterfly that flies in.' },
    'butterfly.2': { label: 'Butterfly (pink)', kind: 'detail', default: B('bfly-pink', 131, 118), note: 'A small transparent butterfly that flies in.' },
    'bloom.1': { label: 'Pressed flower: open cosmos', kind: 'detail', default: B('bloom-cosmos', 229, 221), note: 'A single transparent bloom, used as a small accent.' },
    'bloom.2': { label: 'Pressed flower: small cosmos', kind: 'detail', default: B('bloom-cosmos-2', 127, 161), note: 'A single transparent bloom beside the headings.' },
    'bloom.3': { label: 'Pressed flower: bud', kind: 'detail', default: B('bloom-bud', 70, 112), note: 'A single transparent bud: the timeline’s bullets.' },
    'couple.lead': { label: 'Main photo (the storybook)', kind: 'couple', default: { portrait: 0 }, note: 'Shown whole on a page of the storybook. Portrait or landscape.' },
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
    'hero.kicker': { shared: 'hero.kicker', label: 'First screen: line above the names', default: { en: 'Join us for the wedding of', ne: '' }, max: 48 },
    'hero.line': { shared: 'hero.line', label: 'First screen: line under the names', default: { en: '', ne: '' }, max: 70 },
    'couple.title': { shared: 'couple.title', label: 'Storybook: title page', default: { en: 'The two of us', ne: '' }, max: 36 },
    'story.title': { label: 'Storybook: small heading', default: { en: 'Our story', ne: '' }, max: 30 },
    'book.hint': { label: 'Storybook: hint on wide screens', default: { en: 'Scroll to turn the pages', ne: '' }, max: 40 },
    'book.end': { label: 'Storybook: line on the last page', default: { en: 'And the next chapter starts here.', ne: '' }, max: 70 },
    'count.title': { label: 'Countdown: title', default: { en: 'Counting down to the big day', ne: '' }, max: 48 },
    'count.done': { label: 'Countdown: on the day', default: { en: 'Today’s the day', ne: '' }, max: 40 },
    'prog.title': { shared: 'events.title', label: 'Schedule: title', default: { en: 'The weekend', ne: '' }, max: 32 },
    'gallery.title': { shared: 'gallery.title', label: 'Photos: title', default: { en: 'Little moments', ne: '' }, max: 32 },
    'info.title': { label: 'Travel: title', default: { en: 'Travel and stays', ne: '' }, max: 32 },
    'live.line': { label: 'Livestream: line', default: { en: 'Can’t be there? Watch the ceremony live.', ne: '' }, max: 70 },
    'card.button': { shared: 'card.button', label: 'Button: read the full invitation', default: { en: 'Read the invitation', ne: '' }, max: 32 },
    'families.title': { label: 'Hosts: title', default: { en: 'With love from our families', ne: '' }, max: 40 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: '' }, max: 32 },
    'rsvp.yes': { label: 'RSVP: yes', default: { en: 'Joyfully accepts', ne: '' }, max: 28 },
    'rsvp.no': { label: 'RSVP: no', default: { en: 'Regretfully declines', ne: '' }, max: 28 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send RSVP', ne: '' }, max: 24 },
    'faith.show': { label: 'Faith: show the small cross emblem and the verse (type off to hide)', default: { en: 'on', ne: '' }, max: 8 },
    'verse.text': { label: 'Verse', default: { en: 'Flowers appear on the earth; the season of singing has come.', ne: '' }, max: 220, multiline: true },
    'verse.ref': { label: 'Verse: reference', default: { en: 'Song of Songs 2:12', ne: '' }, max: 40 },
  },
  // Colours the client may change; applied inline on <body>.
  colors: {
    '--vw-accent': { label: 'Cosmos pink (names, buttons, links)', default: '#A3245E' },
    '--vw-bg': { label: 'Page', default: '#FFFFFF' },
    '--wf-blush': { label: 'Blush (countdown petals)', default: '#FCF1F5' },
  },
  // Mix (docs/MIX.md): the international designs do not lend or take Nepal gates and first screens.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: { gate: 'International designs keep their own opening.', hero: 'International designs keep their own first screen.', hostGate: 'International designs keep their own opening.', hostHero: 'International designs keep their own first screen.' },
  },
};
