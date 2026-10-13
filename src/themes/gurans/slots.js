// Gurans (गुराँस) · "Rhododendron": every theme image and theme text, replaceable from the studio.
// Plain data, no imports (the server loads this file). See src/core/slots.js.
// Invitation data (names, parents, dates, events, card wording, gallery, travel/stay/contacts,
// RSVP, closing line) is edited in the studio's normal sections and is not repeated here.
const album = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`album.${i + 1}`, {
  label: `Album, couple photo ${i + 1}`, kind: 'couple', default: { portrait: i + 4 },
  note: 'The couple. Mounted as a pressed print, shown whole (any orientation). Repeats of photos used elsewhere are skipped.',
}]));

export default {
  theme: 'gurans',
  images: {
    'walk.path': {
      label: 'The walk 1: forest path (wide screens)', kind: 'scene', default: 'gurans-path',
      alt: 'A red rhododendron tree beside a trail above a misty valley',
      note: 'Landscape. A path or trail leading into flowering forest, daylight, no people in focus. The camera walks into it; library photos with a depth map move in 3D.',
    },
    'walk.pathTall': {
      label: 'The walk 1: forest path (phones)', kind: 'scene', default: 'gurans-trail',
      alt: 'A stone trail climbing through a rhododendron forest in bloom',
      note: 'Portrait version of the forest path for phones held upright. Same subject: a trail into flowering forest.',
    },
    'walk.clearing': {
      shared: 'place.mountain', label: 'The walk 2: the clearing', kind: 'scene', default: 'gurans-meadow',
      alt: 'Rhododendron trees around a meadow below Dhaulagiri',
      note: 'Landscape. An open clearing or viewpoint with mountains, bright daylight. The date sits on a paper label at the lower left.',
    },
    'walk.lake': {
      label: 'The walk 3: the lake', kind: 'scene', default: 'gurans-lake-boats',
      alt: 'Painted wooden boats moored on Phewa Lake by day',
      note: 'Landscape. A lake or wide calm view below the hills. The couple’s photo is laid over it as a mounted print.',
    },
    'walk.couple': {
      label: 'The walk 3: couple print over the lake', kind: 'couple', default: { portrait: 0 },
      note: 'The couple together, any orientation, shown whole as a mounted print at the end of the walk.',
    },
    'couple.photo': {
      label: 'The two of us: large print', kind: 'couple', default: { portrait: 1 },
      note: 'The couple, any orientation, the largest pressed print beside the families. Shown uncropped.',
    },
    'couple.second': {
      label: 'The two of us: second print', kind: 'couple', default: { portrait: 2 },
      note: 'The couple. Used when the bride and groom have no portraits of their own. Shown uncropped.',
    },
    'couple.third': {
      label: 'The two of us: third print', kind: 'couple', default: { portrait: 3 },
      note: 'The couple. Used when the bride and groom have no portraits of their own. Shown uncropped.',
    },
    'couple.bride': {
      label: 'Bride portrait', kind: 'bride', default: null,
      note: 'Portrait of the bride. The bride + groom pair replaces the second and third prints when both have a photo.',
    },
    'couple.groom': {
      label: 'Groom portrait', kind: 'groom', default: null,
      note: 'Portrait of the groom. Shown with the bride’s portrait when both are uploaded.',
    },
    'programme.detail': {
      label: 'Programme: botanical photo', kind: 'detail', default: 'gurans-truss',
      alt: 'A truss of red lali gurans among leaves',
      note: 'A small flower or detail photo beside the programme heading. Landscape or square works best. No people.',
    },
    ...album,
    'travel.photo': {
      label: 'Travel & stay: landscape print', kind: 'scene', default: 'gurans-tree',
      alt: 'A rhododendron tree in bloom against a deep blue sky',
      note: 'The region of the wedding, daylight. Any orientation; shown whole beside the travel notes.',
    },
    'close.photo': {
      shared: 'place.closing', label: 'Closing print', kind: 'scene', default: 'gurans-lake-view',
      alt: 'Machhapuchhre and the Annapurna range above Phewa Lake on a clear day',
      note: 'A calm, wide view (lake, hills, sunrise). Any orientation; shown whole beside the blessing.',
    },
  },
  texts: {
    'gate.kicker': { label: 'Opening: small line above the names', default: { en: 'An invitation', ne: 'शुभ निमन्त्रणा' }, max: 32 },
    'gate.line': { shared: 'gate.line', label: 'Opening: line under the names', default: { en: 'Please join us in the season of the gurans', ne: 'गुराँस फुल्ने यामको शुभ अवसरमा हजुरलाई निम्तो' }, max: 70 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Open the invitation', ne: 'निम्तो खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'hero.kicker': { shared: 'hero.kicker', label: 'Walk 1: small line above the names', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 32 },
    'hero.line': { shared: 'hero.line', label: 'Walk 1: line under the names', default: { en: 'are getting married', ne: 'विवाह बन्धनमा बाँधिँदै छन्' }, max: 48 },
    'walk.date': { label: 'Walk 2: small line above the date', default: { en: 'Save the date', ne: 'शुभ मिति' }, max: 28 },
    'walk.lake': { label: 'Walk 3: line beside the couple print', default: { en: 'We would love you beside us.', ne: 'हजुरको साथ र आशीर्वाद चाहन्छौं।' }, max: 60 },
    'walk.cue': { label: 'Walk 3: link to the programme', default: { en: 'See the programme', ne: 'कार्यक्रम हेर्नुहोस्' }, max: 28 },
    'couple.title': { shared: 'couple.title', label: 'The two of us: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 32 },
    'couple.line': { shared: 'couple.line', label: 'The two of us: one line', default: { en: 'With the blessings of our elders, we are to be married.', ne: 'गुरुजनको आशीर्वादसहित हामी विवाह गर्दैछौं।' }, max: 90, multiline: true },
    'couple.brideLabel': { label: 'Families: bride label', default: { en: 'The bride', ne: 'दुलही' }, max: 20 },
    'couple.groomLabel': { label: 'Families: groom label', default: { en: 'The groom', ne: 'दुलहा' }, max: 20 },
    'couple.daughter': { label: 'Families: “daughter of”', default: { en: 'Daughter of', ne: 'सुपुत्री' }, max: 20 },
    'couple.son': { label: 'Families: “son of”', default: { en: 'Son of', ne: 'सुपुत्र' }, max: 20 },
    'card.button': { shared: 'card.button', label: 'Button: read the invitation card', default: { en: 'Read the invitation card', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'card.title': { label: 'Invitation card: title', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 32 },
    'programme.kicker': { label: 'Programme: small label', default: { en: 'When & where', ne: 'कहिले र कहाँ' }, max: 28 },
    'programme.title': { shared: 'events.title', label: 'Programme: title', default: { en: 'The programme', ne: 'कार्यक्रम' }, max: 40 },
    'programme.order': { label: 'Programme: order-of-the-day toggle', default: { en: 'Order of the day', ne: 'दिनको क्रम' }, max: 28 },
    'album.kicker': { shared: 'gallery.kicker', label: 'Album: small label', default: { en: 'Pressed prints', ne: 'तस्बिरहरू' }, max: 24 },
    'album.title': { shared: 'gallery.title', label: 'Album: title', default: { en: 'A few more of us', ne: 'हाम्रा केही थप तस्बिर' }, max: 40 },
    'travel.kicker': { label: 'Travel: small label', default: { en: 'For the journey', ne: 'यात्राका लागि' }, max: 28 },
    'travel.arrive': { label: 'Travel: getting there title', default: { en: 'Getting there', ne: 'आइपुग्ने बाटो' }, max: 24 },
    'travel.stay': { label: 'Travel: staying title', default: { en: 'Where to stay', ne: 'बस्ने ठाउँ' }, max: 24 },
    'travel.ask': { label: 'Travel: questions title', default: { en: 'Any questions', ne: 'सोधपुछ' }, max: 24 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 40 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
  },
};
