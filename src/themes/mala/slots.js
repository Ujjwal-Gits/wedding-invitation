// Mala (माला) · "Garland": every theme image and theme text, replaceable from the studio.
// Plain data, no imports (the server loads this file). See src/core/slots.js.
// Invitation data (names, parents, dates, events, card wording, gallery, travel, RSVP) is edited in the
// studio's normal sections and is not repeated here. The garlands themselves are fixed theme art.
const line = Object.fromEntries([1, 2, 3].map((n, i) => [`line.${n}`, {
  label: `Photo line, photo ${n}`, kind: 'couple', default: { portrait: [1, 3, 6][i] },
  note: 'The couple. Hangs from the marigold garland like a print on a string; any orientation, shown uncropped. Repeats of other slots are skipped.',
}]));
const album = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`album.${i + 1}`, {
  label: `Album, couple photo ${i + 1}`, kind: 'couple', default: { portrait: i + 7 },
  note: 'The couple. Leads the album grid, before the gallery photos. Shown uncropped. Repeats are skipped.',
}]));

export default {
  theme: 'mala',
  images: {
    'hero.photo': {
      label: 'Opening photo (under the garlands)', kind: 'couple', default: { portrait: 0 },
      note: 'The couple together, portrait orientation works best. Two jasmine strands hang on either side of it; shown uncropped.',
    },
    ...line,
    'swayambar.bride': {
      shared: 'rite.swayambar', label: 'Swayambar: the bride’s side', kind: 'bride', default: { portrait: 2 },
      note: 'Portrait of the bride (or the couple). The garlands are exchanged above it; garlands never touch the photo.',
    },
    'swayambar.groom': {
      label: 'Swayambar: the groom’s side', kind: 'groom', default: { portrait: 4 },
      note: 'Portrait of the groom (or the couple). The garlands are exchanged above it.',
    },
    ...album,
    'travel.photo': {
      shared: 'place.mountain', label: 'Travel: a calm view of Nepal', kind: 'scene', default: 'rhododendron',
      alt: 'Laligurans (rhododendron) in bloom below Annapurna South',
      note: 'Landscape, a bright, calm view of the region. No people in focus. Shown uncropped.',
    },
  },
  texts: {
    'gate.from': { shared: 'gate.line', label: 'Gate: line above the families', default: { en: 'With the blessings of our elders', ne: 'गुरुजनको आशीर्वादसहित' }, max: 48 },
    'gate.open': { shared: 'gate.open', label: 'Gate: open button', default: { en: 'Open the invitation', ne: 'निम्तो खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Gate: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'hero.kicker': { shared: 'hero.kicker', label: 'Hero: small line above the names', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 32 },
    'hero.line': { shared: 'hero.line', label: 'Hero: line under the names', default: { en: 'request the pleasure of your company', ne: 'हजुरको उपस्थितिको हार्दिक अनुरोध गर्दछन्' }, max: 60 },
    'intro.line': { shared: 'couple.line', label: 'Families: the one line', default: { en: 'Two families, one garland.', ne: 'दुई परिवार, एउटै माला।' }, max: 60 },
    'intro.bride': { label: 'Families: bride label', default: { en: 'The bride', ne: 'दुलही' }, max: 20 },
    'intro.groom': { label: 'Families: groom label', default: { en: 'The groom', ne: 'दुलहा' }, max: 20 },
    'intro.daughter': { label: 'Families: “daughter of”', default: { en: 'Daughter of', ne: 'सुपुत्री' }, max: 20 },
    'intro.son': { label: 'Families: “son of”', default: { en: 'Son of', ne: 'सुपुत्र' }, max: 20 },
    'intro.card': { shared: 'card.button', label: 'Families: open the full card', default: { en: 'Read the invitation card', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'card.title': { label: 'Invitation card: title', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 32 },
    'line.title': { shared: 'couple.title', label: 'Photo line: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 32 },
    'sway.title': { shared: 'rite.swayambar.title', label: 'Swayambar: title', default: { en: 'Swayambar', ne: 'स्वयम्बर' }, max: 28 },
    'sway.line': { shared: 'rite.swayambar.line', label: 'Swayambar: line', default: { en: 'Two garlands change hands, and two families become one.', ne: 'दुई माला साटिन्छन्, दुई परिवार एक हुन्छन्।' }, max: 80 },
    'days.kicker': { label: 'Programme: small label', default: { en: 'The programme', ne: 'कार्यक्रम' }, max: 28 },
    'days.title': { shared: 'events.title', label: 'Programme: title', default: { en: 'When & where', ne: 'कहिले, कहाँ' }, max: 32 },
    'days.order': { label: 'Programme: order-of-the-day toggle', default: { en: 'Order of the day', ne: 'दिनको क्रम' }, max: 28 },
    'travel.title': { label: 'Travel: title', default: { en: 'Getting there', ne: 'आइपुग्ने बाटो' }, max: 32 },
    'travel.stay': { label: 'Travel: staying label', default: { en: 'Staying', ne: 'बसाइ' }, max: 24 },
    'travel.ask': { label: 'Travel: questions label', default: { en: 'Questions', ne: 'सोधपुछ' }, max: 24 },
    'album.kicker': { shared: 'gallery.kicker', label: 'Album: small label', default: { en: 'Album', ne: 'एल्बम' }, max: 24 },
    'album.title': { shared: 'gallery.title', label: 'Album: title', default: { en: 'A few more', ne: 'केही थप तस्बिर' }, max: 32 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 40 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
  },
};
