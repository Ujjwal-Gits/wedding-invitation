// Nimantrana (निमन्त्रणा) · the printed tri-fold card: every theme image and theme text, replaceable
// from the studio. Plain data, no imports (the server loads this file). See src/core/slots.js.
// Invitation data (names, parents, dates, events, card wording, gallery, travel/stays/contacts,
// RSVP, closing blessing) is edited in the studio's normal sections and is not repeated here.
//
// Not every family is Hindu: the Ganesh painting, the shloka and the four sacred tiles can each be
// replaced, and the whole sacred set can be switched off with the “Sacred art” line (type: off).
// Any single line set to “-” is hidden.
const album = Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`album.${n}`, {
  label: `Album, couple photo ${n}`, kind: 'couple', default: { portrait: n + 2 },
  note: 'The couple. Leads the album, before the gallery photos. Shown whole, never cropped. Repeats are skipped.',
}]));

export default {
  theme: 'nimantrana',
  images: {
    'card.photo': {
      label: 'Card: the couple in the gold arch (centre panel)', kind: 'couple', default: { portrait: 0 },
      note: 'The couple’s best photo, set in the gold-framed arch in the middle of the card. Portrait works best; shown whole, never cropped.',
    },
    'card.deity': {
      label: 'Card: Ganesh painting (left panel)', kind: 'detail',
      default: { lg: '/themes/nimantrana/ganesh-lg.webp', sm: '/themes/nimantrana/ganesh-sm.webp', w: 900, h: 1265, alt: 'Ganesha seated on a lotus, Basohli miniature painting, about 1730' },
      note: 'A Basohli miniature of Ganesh on a lotus (public domain). Replace it with your family’s deity or any blessing image; portrait works best. To remove it, type “off” in the Sacred art line.',
    },
    'couple.bride': {
      label: 'The two of us: left arch photo', kind: 'bride', default: { portrait: 1 },
      note: 'The bride, or the couple. Shown whole in a gold arch frame next to her family. Uses the bride’s own photo when there is one.',
    },
    'couple.groom': {
      label: 'The two of us: right arch photo', kind: 'groom', default: { portrait: 2 },
      note: 'The groom, or the couple. Shown whole in a gold arch frame next to his family. Uses the groom’s own photo when there is one.',
    },
    ...album,
  },
  texts: {
    'gate.line': { shared: 'gate.line', label: 'Cover: line above the names', default: { en: 'You are invited to the wedding of', ne: 'शुभ विवाहको निमन्त्रणा' }, max: 48 },
    'gate.open': { shared: 'gate.open', label: 'Cover: open button', default: { en: 'Open the card', ne: 'कार्ड खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Cover: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'card.title': { shared: 'hero.kicker', label: 'Card title (the Nepali is set large in calligraphy)', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 24 },
    'card.subtitle': { label: 'Card: word under the title', default: { en: 'Wedding Invitation', ne: 'निमन्त्रणा' }, max: 28 },
    'card.line': { shared: 'hero.line', label: 'Card: one line of invitation', default: { en: 'With joy, we invite you and your family.', ne: 'हजुरलाई सपरिवार हार्दिक निमन्त्रणा छ।' }, max: 80, multiline: true },
    'card.button': { shared: 'card.button', label: 'Button: read the invitation', default: { en: 'Read the invitation', ne: 'निमन्त्रणा पढ्नुहोस्' }, max: 32 },
    'faith.show': { label: 'Sacred art: Ganesh, shloka and the four tiles (type “off” to hide them all)', default: { en: 'on', ne: 'on' }, max: 8 },
    'card.invocation': { label: 'Card: invocation above Ganesh (“-” hides it)', default: { en: '॥ श्री गणेशाय नमः ॥', ne: '॥ श्री गणेशाय नमः ॥' }, max: 40 },
    'card.shloka': {
      label: 'Card: mangal shloka (Nepali box = the verse, English box = its meaning)',
      default: {
        ne: 'मङ्गलम् भगवान् विष्णुः मङ्गलम् गरुडध्वजः। मङ्गलम् पुण्डरीकाक्षः मङ्गलायतनो हरिः॥',
        en: 'Auspicious is Lord Vishnu, auspicious the one whose banner bears Garuda; auspicious the lotus-eyed one: Hari, the home of every blessing.',
      },
      max: 160, multiline: true,
    },
    'tile.1': { label: 'Sacred tile 1 (श्री)', default: { en: 'श्री', ne: 'श्री' }, max: 8 },
    'tile.2': { label: 'Sacred tile 2 (ॐ)', default: { en: 'ॐ', ne: 'ॐ' }, max: 8 },
    'tile.3': { label: 'Sacred tile 3 (drawn swastika; type a word or symbol to replace it)', default: { en: 'स्वस्तिक', ne: 'स्वस्तिक' }, max: 8 },
    'tile.4': { label: 'Sacred tile 4 (drawn havan kunda; type a word or symbol to replace it)', default: { en: 'हवन कुण्ड', ne: 'हवन कुण्ड' }, max: 10 },
    'blessing.title': { label: 'Blessing: title', default: { en: 'With the blessing of Shree Ganesh', ne: 'श्री गणेशको आशीर्वादसहित' }, max: 48 },
    'couple.title': { shared: 'couple.title', label: 'The two of us: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 28 },
    'couple.line': { shared: 'couple.line', label: 'The two of us: one line', default: { en: 'Two families, one sacred fire.', ne: 'दुई परिवार, एउटै पवित्र अग्नि।' }, max: 80, multiline: true },
    'families.daughter': { label: 'Families: “daughter of”', default: { en: 'Daughter of', ne: 'सुपुत्री' }, max: 20 },
    'families.son': { label: 'Families: “son of”', default: { en: 'Son of', ne: 'सुपुत्र' }, max: 20 },
    'words.title': { label: 'Card wording: title', default: { en: 'The invitation', ne: 'निमन्त्रणा पत्र' }, max: 32 },
    'prog.title': { shared: 'events.title', label: 'Programme: title', default: { en: 'The programme', ne: 'कार्यक्रम' }, max: 32 },
    'prog.more': { label: 'Travel, stays and contacts toggle', default: { en: 'Travel, stays and contacts', ne: 'यात्रा, बसाइ र सम्पर्क' }, max: 36 },
    'gallery.title': { shared: 'gallery.title', label: 'Album: title', default: { en: 'A few more of us', ne: 'हाम्रा केही तस्बिर' }, max: 32 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 32 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
  },
};
