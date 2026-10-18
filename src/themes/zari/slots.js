// Zari (ज़री) · the bridal trousseau trunk: every theme image and text, replaceable from the studio. Plain data, no
// imports (the server loads this file). Names, parents, dates, events, card wording, photos, travel, RSVP and the
// closing blessing are invitation data, edited in the studio's own sections.
export default {
  theme: 'zari',
  name: 'Zari',
  description: 'A sapphire velvet trousseau trunk unlocks; its trays lift out one by one, each holding a part of the day',
  // Both websites: a Nepali wedding card on the Nepal site, a "classic" design on the international one.
  market: 'both',
  style: 'classic',
  occasions: ['wedding', 'engagement', 'anniversary'],
  // Faith (docs/FAITH-DESIGNS.md): neutral art (a velvet trunk, a red odhni, bangles, roses). The Ganesh invocation is a
  // default text that follows the invitation's community, and the optional Ganesh on the full card swaps for its emblem.
  religions: ['hindu', 'buddhist', 'kirat', 'other'],
  faithInk: '--zr-gold',
  images: {
    'couple.lead': { label: 'Photo in the trunk lid', kind: 'couple', default: { portrait: 0 }, note: 'Framed in the lid lining, shown whole. Portrait works best.' },
    'gallery.1': { label: 'Photos tray: photo 1', kind: 'couple', default: { portrait: 1 }, note: 'The couple. Shown whole, never cropped. Repeats are skipped.' },
    'gallery.2': { label: 'Photos tray: photo 2', kind: 'couple', default: { portrait: 2 }, note: 'The couple. Shown whole, never cropped.' },
    'gallery.3': { label: 'Photos tray: photo 3', kind: 'couple', default: { portrait: 3 }, note: 'The couple. Shown whole, never cropped.' },
    'gallery.4': { label: 'Photos tray: photo 4', kind: 'couple', default: { portrait: 4 }, note: 'The couple. Shown whole, never cropped.' },
    'gallery.5': { label: 'Photos: photo 5 (in the album)', kind: 'couple', default: { portrait: 5 }, note: 'Opens with the photos tray. Shown whole, never cropped.' },
    'gallery.6': { label: 'Photos: photo 6 (in the album)', kind: 'couple', default: { portrait: 6 }, note: 'Opens with the photos tray. Shown whole, never cropped.' },
    'families.bride': { label: 'Bride portrait (families tray)', kind: 'bride', default: null, note: 'Shown in place of the bangle box when bride and groom both have their own photo.' },
    'families.groom': { label: 'Groom portrait (families tray)', kind: 'groom', default: null, note: 'Shown in place of the bangle box when bride and groom both have their own photo.' },
    'hero.ganesh': { label: 'Ganesh (on the full card only)', kind: 'detail', default: { lg: '/themes/_nepali/ganesh-brass.webp', sm: '/themes/_nepali/ganesh-brass-sm.webp', alt: 'Shri Ganesh in brass' }, note: 'Shown on the full invitation card when the Ganesh line says on. A cut-out works best.' },
  },
  texts: {
    'gate.line': { shared: 'gate.line', label: 'Opening: line above the button', default: { en: 'Kept for you, in gold thread', ne: 'सुनको धागोमा हजुरका लागि साँचिएको' }, max: 48 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Unlock the trunk', ne: 'सन्दुक खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'ganesh.show': { label: 'Ganesh on the full card (type on to show him)', default: { en: 'off', ne: 'off' }, max: 8 },
    'hero.invocation': { label: 'Odhni: invocation above the title (empty by default; e.g. ॥ श्री गणेशाय नमः ॥)', default: { en: '-', ne: '-' }, max: 40 },
    'hero.title': { shared: 'hero.kicker', label: 'Odhni: title above the names', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 28 },
    'hero.line': { label: 'Odhni: one line under the names', default: { en: 'request the pleasure of your company', ne: 'हजुरको उपस्थितिको हार्दिक अपेक्षा गर्दछौं' }, max: 70, multiline: true },
    'date.kicker': { label: 'Coin tray: small label', default: { en: 'Save the date', ne: 'शुभ साइत' }, max: 28 },
    'families.title': { label: 'Bangle tray: title', default: { en: 'Two families', ne: 'दुई परिवार' }, max: 36 },
    'gallery.title': { shared: 'gallery.title', label: 'Photos tray: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 32 },
    'prog.kicker': { label: 'Ceremonies tray: small label', default: { en: 'When and where', ne: 'कहिले र कहाँ' }, max: 28 },
    'prog.title': { shared: 'events.title', label: 'Ceremonies tray: title', default: { en: 'The celebrations', ne: 'कार्यक्रमहरू' }, max: 32 },
    'venue.title': { label: 'Map tray: title', default: { en: 'Finding your way', ne: 'आउने बाटो' }, max: 32 },
    'count.title': { label: 'Watch tray: title', default: { en: 'Until the big day', ne: 'शुभ घडी आउन बाँकी' }, max: 36 },
    'rsvp.title': { shared: 'reply.title', label: 'Tag tray: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 32 },
    'rsvp.open': { label: 'Tag tray: reply button', default: { en: 'Reply now', ne: 'जवाफ दिनुहोस्' }, max: 24 },
    'rsvp.send': { label: 'Reply form: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
    'card.button': { shared: 'card.button', label: 'Button: read the full invitation', default: { en: 'Read the full invitation', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'close.line': { shared: 'closing.line', label: 'After the trunk closes: one line', default: { en: 'With love, and with the blessings of our elders', ne: 'माया र गुरुजनको आशीर्वादसहित' }, max: 70 },
  },
  // Colours the client may change (docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--zr-velvet': { label: 'Velvet (sapphire)', default: '#152241' },
    '--zr-night': { label: 'Night', default: '#0D1424' },
    '--zr-gold': { label: 'Zari gold', default: '#CFA54A' },
    '--zr-gold-text': { label: 'Gold text', default: '#E2C27A' },
  },
  // Mix (docs/MIX.md): the trunk is both the opening and the whole page, so nothing is lent or borrowed.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: {
      gate: 'Zari’s opening unlocks the very trunk that holds the whole page, so it cannot open another theme.',
      hero: 'Zari has no separate first screen: the trunk stays on screen while its trays lift out.',
      hostGate: 'The trunk is the page itself: another opening would hide it.',
      hostHero: 'The trunk is the page itself: there is no first screen to swap.',
    },
  },
};
