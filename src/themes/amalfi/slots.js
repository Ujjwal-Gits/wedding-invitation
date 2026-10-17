// Amalfi · international, destination: every design image and text, replaceable from the studio. Plain data, no
// imports (the server loads this file). Names, dates, events, story, photos, travel, stays, RSVP and the card wording
// are invitation data, edited in the studio's own sections. English only (the `ne` side stays empty on purpose).
const art = (name, w, h, alt = '') => ({ lg: `/themes/amalfi/art/${name}.webp`, sm: `/themes/amalfi/art/${name}-sm.webp`, w, h, alt });
const one = (name, w, h, alt = '') => ({ lg: `/themes/amalfi/art/${name}.webp`, sm: `/themes/amalfi/art/${name}.webp`, w, h, alt });

export default {
  theme: 'amalfi',
  name: 'Amalfi',
  description: 'A postcard from the coast turns over to a painting of Positano; then a weekend guide with boarding-pass tickets',
  market: 'intl',
  style: 'destination',
  occasions: ['wedding', 'engagement', 'anniversary', 'vow-renewal', 'rehearsal-dinner', 'birthday'],
  // Made for Christian weddings: the cross-and-rings emblem and the verse show only when the invitation's faith is
  // Christian (src/core/faith.js) and 'faith.show' is not "off"; 'other' (no faith) and ?v=neutral show neither.
  faith: 'christian',
  religions: ['christian', 'other'],
  faithInk: '--vw-accent',
  images: {
    'hero.lemons': { label: 'Lemon branches (top of the first screen)', kind: 'detail', default: art('lemons', 1200, 801), note: 'A transparent watercolor branch across the top. Leave as is unless you have your own art.' },
    'hero.coast': { label: 'The coast (bottom of the first screen, closing)', kind: 'scene', default: art('coast', 1200, 816), note: 'A transparent watercolor coastline, landscape, fading to white at the top.' },
    'postcard.front': { label: 'Postcard painting, landscape (opening, computers)', kind: 'scene', default: art('front-land', 1200, 800), note: 'Landscape 3:2 painting of the place. Shown whole on the postcard.' },
    'postcard.frontTall': { label: 'Postcard painting, portrait (opening, phones)', kind: 'scene', default: art('front-port', 620, 930), note: 'Portrait 2:3 painting of the place.' },
    'postcard.stamp': { label: 'Postage stamp picture', kind: 'detail', default: one('stamp', 240, 300), note: 'Portrait 4:5, a small detail (a lemon, a flower).' },
    'crown.a': { label: 'Lemon sprig, left corner', kind: 'detail', default: one('sprig-a', 400, 501), note: 'Transparent, hangs from the top-left corner of a section.' },
    'crown.b': { label: 'Lemon sprig, right corner', kind: 'detail', default: one('sprig-b', 560, 527), note: 'Transparent, hangs from the top-right corner of a section.' },
    'couple.lead': { label: 'Main photo', kind: 'couple', default: { portrait: 0 }, note: 'Shown whole beside your story. Portrait or landscape.' },
    'gallery.1': { label: 'Photos: photo 1', kind: 'couple', default: { portrait: 1 }, note: 'Shown whole, never cropped. Repeats are skipped.' },
    'gallery.2': { label: 'Photos: photo 2', kind: 'couple', default: { portrait: 2 }, note: 'Shown whole, never cropped.' },
    'gallery.3': { label: 'Photos: photo 3', kind: 'couple', default: { portrait: 3 }, note: 'Shown whole, never cropped.' },
    'gallery.4': { label: 'Photos: photo 4', kind: 'couple', default: { portrait: 4 }, note: 'Shown whole, never cropped.' },
    'gallery.5': { label: 'Photos: photo 5', kind: 'couple', default: { portrait: 5 }, note: 'Shown whole, never cropped.' },
    'gallery.6': { label: 'Photos: photo 6', kind: 'couple', default: { portrait: 6 }, note: 'Shown whole, never cropped.' },
  },
  texts: {
    'gate.line': { shared: 'gate.line', label: 'Opening: line above the button', default: { en: 'You’ve got mail from the coast', ne: '' }, max: 48 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Turn the postcard over', ne: '' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: '' }, max: 32 },
    'postcard.print': { label: 'Postcard: printed word at the top', default: { en: 'Post card', ne: '' }, max: 20 },
    'postcard.note': { label: 'Postcard: handwritten note', default: { en: 'See you by the sea', ne: '' }, max: 36 },
    'hero.kicker': { shared: 'hero.kicker', label: 'First screen: line above the names', default: { en: 'We’re getting married', ne: '' }, max: 48 },
    'hero.line': { shared: 'hero.line', label: 'First screen: line under the names', default: { en: 'and we’d love you there for a weekend by the sea', ne: '' }, max: 70 },
    'couple.title': { shared: 'couple.title', label: 'Story: title', default: { en: 'The two of us', ne: '' }, max: 36 },
    'story.title': { label: 'Story: small heading', default: { en: 'How we got here', ne: '' }, max: 30 },
    'count.title': { label: 'Countdown: title', default: { en: 'Counting down to the big day', ne: '' }, max: 48 },
    'count.done': { label: 'Countdown: on the day', default: { en: 'Today’s the day', ne: '' }, max: 40 },
    'board.to': { label: 'Countdown board: “to” label', default: { en: 'Destination', ne: '' }, max: 16 },
    'board.date': { label: 'Countdown board: date label', default: { en: 'Date', ne: '' }, max: 16 },
    'board.time': { label: 'Countdown board: time label', default: { en: 'Time', ne: '' }, max: 16 },
    'prog.title': { shared: 'events.title', label: 'Schedule: title', default: { en: 'The weekend', ne: '' }, max: 32 },
    'prog.day': { label: 'Schedule: the word before the day number', default: { en: 'Day', ne: '' }, max: 12 },
    'gallery.title': { shared: 'gallery.title', label: 'Photos: title', default: { en: 'A few favorites', ne: '' }, max: 32 },
    'info.title': { label: 'Travel: title', default: { en: 'Getting there', ne: '' }, max: 32 },
    'info.kicker': { label: 'Travel: small heading', default: { en: 'A short guide', ne: '' }, max: 30 },
    'live.line': { label: 'Livestream: line', default: { en: 'Can’t make the trip? Watch the ceremony live.', ne: '' }, max: 70 },
    'card.button': { shared: 'card.button', label: 'Button: read the full invitation', default: { en: 'Read the invitation', ne: '' }, max: 32 },
    'families.title': { label: 'Hosts: title', default: { en: 'With love from our families', ne: '' }, max: 40 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: '' }, max: 32 },
    'rsvp.note': { label: 'RSVP: handwritten line', default: { en: 'Write back soon', ne: '' }, max: 30 },
    'rsvp.yes': { label: 'RSVP: yes', default: { en: 'Joyfully accepts', ne: '' }, max: 28 },
    'rsvp.no': { label: 'RSVP: no', default: { en: 'Regretfully declines', ne: '' }, max: 28 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send RSVP', ne: '' }, max: 24 },
    'faith.show': { label: 'Faith: show the small cross emblem and the verse (type off to hide)', default: { en: 'on', ne: '' }, max: 8 },
    'verse.text': { label: 'Verse (on the postcard and before the reply)', default: { en: 'Love is patient, love is kind. It always protects, always trusts, always hopes, always perseveres.', ne: '' }, max: 220, multiline: true },
    'verse.ref': { label: 'Verse: reference', default: { en: '1 Corinthians 13:4, 7', ne: '' }, max: 40 },
  },
  // Colours the client may change; applied inline on <body>.
  colors: {
    '--vw-accent': { label: 'Sea blue (names, buttons, tickets)', default: '#1C5880' },
    '--vw-bg': { label: 'Page', default: '#FFFFFF' },
    '--am-table': { label: 'Tabletop (opening)', default: '#F2F3F1' },
    '--am-card': { label: 'Postcard paper', default: '#FFFDF8' },
  },
  // Mix (docs/MIX.md): the international designs do not lend or take Nepal gates and first screens.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: { gate: 'International designs keep their own opening.', hero: 'International designs keep their own first screen.', hostGate: 'International designs keep their own opening.', hostHero: 'International designs keep their own first screen.' },
  },
};
