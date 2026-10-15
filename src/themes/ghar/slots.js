// Ghar · "Lamplight Cinema": every theme image and theme text, replaceable from the studio.
// Plain data, no imports (the server loads this file). See src/core/slots.js and src/core/slot-vocab.js.
// Invitation data (names, parents, dates, events and their photos, vows, story, card wording,
// portraits, gallery, RSVP, closing line) is edited in the studio's normal sections and is not repeated here.
// Texts may use {hosts}, which is replaced by the inviting families' names.
export default {
  theme: 'ghar',
  images: {
    'threshold.door': {
      label: 'House door (opens in 3D)', kind: 'scene', default: 'door-newari', shared: 'place.entrance',
      alt: 'A carved Newar door in Patan, at night',
      note: 'Portrait, a frontal closed door with its frame, the door in the lower half. Library doors with a measured opening (door-newari, door-golden) open exactly; other photos open from the centre of the lower half.',
    },
    'courtyard.view': {
      label: 'Courtyard (seen from the passage)', kind: 'scene', default: 'chowk', shared: 'place.courtyard',
      alt: 'A Newar courtyard with a white shrine, at night',
      note: 'Portrait, an open courtyard seen from a doorway, horizon a little above the middle. Shown at night; library photos have depth.',
    },
    'hall.corridor': {
      label: 'Corridor at the end of the hall', kind: 'scene', default: 'interior-newari', shared: 'place.interior',
      alt: 'A lamplit wooden corridor',
      note: 'Portrait, a corridor or doorway with strong one-point perspective; the camera walks into it.',
    },
    'lattice.window': {
      label: 'Lattice window (pre-wedding room)', kind: 'scene', default: 'window-sanjhyal-alt', shared: 'place.window',
      alt: 'A carved lattice window glowing in a dark wall',
      note: 'Portrait, a small glowing window in a dark wall, window at about one third from the top.',
    },
    'window.view': {
      label: 'Great window (wedding room)', kind: 'scene', default: 'interior-newari-alt',
      alt: 'Open lattice shutters onto a courtyard in morning light',
      note: 'Portrait, a window seen from inside with the sill at about three quarters down.',
    },
    'rooftop.view': {
      label: 'City at night (rooftop)', kind: 'scene', default: 'kathmandu-night', shared: 'place.night',
      alt: 'Kathmandu at night from above, temple roofs lit gold',
      note: 'Landscape (panorama is best), a lit city or temple at night seen from above.',
    },
    'hall.frame1': { label: 'Hall picture 1 (largest)', kind: 'couple', default: { portrait: 0 }, note: 'The couple. Any orientation; framed uncropped.' },
    'hall.frame2': { label: 'Hall picture 2', kind: 'couple', default: { portrait: 1 }, note: 'The couple. Shown when there are at least 2 couple photos.' },
    'hall.frame3': { label: 'Hall picture 3', kind: 'couple', default: { portrait: 2 }, note: 'The couple. Shown when there are at least 3 couple photos.' },
    'hall.frame4': { label: 'Hall picture 4', kind: 'couple', default: { portrait: 3 }, note: 'The couple. Shown when there are at least 4 couple photos.' },
    'hall.frame5': { label: 'Hall picture 5', kind: 'couple', default: { portrait: 4 }, note: 'The couple. Shown when there are at least 5 couple photos.' },
    'hall.frame6': { label: 'Hall picture 6', kind: 'couple', default: { portrait: 5 }, note: 'The couple. Shown when there are at least 6 couple photos.' },
    'hall.bride': { label: 'Hall: the bride', kind: 'bride', default: null, note: 'Portrait of the bride. Shown only when the bride has her own photo.' },
    'hall.groom': { label: 'Hall: the groom', kind: 'groom', default: null, note: 'Portrait of the groom. Shown only when the groom has his own photo.' },
    'window.couple': { label: 'Great window: couple picture', kind: 'couple', default: { portrait: 1 }, note: 'The couple, hung opposite the wedding picture. Landscape reads best.' },
    'texture.brick': {
      label: 'Brick texture (walls and floors)', kind: 'detail', default: '/themes/ghar/brick.webp',
      alt: '', note: 'A seamless, evenly lit brick wall photographed straight on, about 0.7 m wide.',
    },
    'texture.post': {
      label: 'Carved post texture', kind: 'detail', default: '/themes/ghar/post.webp',
      alt: '', note: 'A tall narrow photo of one carved wooden post, straight on.',
    },
  },
  texts: {
    'gate.present': { label: 'Opening credit: word under the families', default: { en: 'present', ne: 'सादर प्रस्तुत गर्दछ' }, max: 40 },
    'gate.open': { label: 'Begin button', default: { en: 'Begin, with sound', ne: 'संगीतसहित सुरु गर्नुहोस्' }, max: 32, shared: 'gate.open' },
    'gate.quiet': { label: 'Begin quietly button', default: { en: 'Begin quietly', ne: 'संगीतबिना' }, max: 28, shared: 'gate.quiet' },
    'film.cue': { label: 'Scroll hint', default: { en: 'Scroll to walk in', ne: 'भित्र पस्न तल सार्नुहोस्' }, max: 32 },
    'card.button': { label: 'Invitation card link (top bar)', default: { en: 'The card', ne: 'निम्तो पत्र' }, max: 20, shared: 'card.button' },
    'ch1.title': { label: 'Chapter 1 title card (big word / small line)', default: { ne: 'पिखालखु', en: 'The threshold' }, max: 30, note: 'Nepali is the big word, English the small line.' },
    'ch2.title': { label: 'Chapter 2 title card', default: { ne: 'चोक', en: 'The courtyard' }, max: 30 },
    'ch3.title': { label: 'Chapter 3 title card', default: { ne: 'मातँ', en: 'The upper hall' }, max: 30 },
    'ch4.title': { label: 'Chapter 4 title card', default: { ne: 'तिकिझ्याः', en: 'The lattice window' }, max: 30 },
    'ch5.title': { label: 'Chapter 5 title card', default: { ne: 'सँझ्याः', en: 'The great window' }, max: 30 },
    'ch6.title': { label: 'Chapter 6 title card', default: { ne: 'कौसी', en: 'The rooftop' }, max: 30 },
    'threshold.welcome': { label: 'Subtitle at the door', default: { en: '{hosts} welcome you home.', ne: '{hosts} हजुरलाई घरमा स्वागत गर्दछ।' }, max: 90 },
    'threshold.bow': { label: 'Subtitle as the door opens', default: { en: 'The door is low. Everyone bows as they enter.', ne: 'ढोका होचो छ, सबै शिर झुकाएर भित्र पस्छन्।' }, max: 80 },
    'lattice.line': { label: 'Subtitle in the pre-wedding room', default: { en: 'Before the wedding, the house fills with songs.', ne: 'विवाहअघि घर गीत र हाँसोले भरिन्छ।' }, max: 80 },
    'window.line': { label: 'Subtitle at the couple picture', default: { en: 'Two families, one sacred fire.', ne: 'दुई परिवार, एउटै पवित्र अग्नि।' }, max: 80, shared: 'couple.line' },
    'window.vows': { label: 'Subtitle before the seven vows', default: { en: 'Seven steps around the sacred fire.', ne: 'अग्निसाक्षी सप्तपदी, सात पाइला।' }, max: 80, shared: 'rite.saptapadi.line' },
    'end.ask': { label: 'Question under the names at the end', default: { en: 'Will you come?', ne: 'हजुर आउनुहुन्छ?' }, max: 30 },
    'events.title': { label: 'Programme title (big / small)', default: { ne: 'कार्यक्रम', en: 'The programme' }, max: 30, shared: 'events.title' },
    'stills.title': { label: 'Stills title (big word / small line)', default: { ne: 'चित्रहरू', en: 'Stills' }, max: 30, shared: 'gallery.title' },
    'reply.title': { label: 'Reply title (big / small)', default: { ne: 'हजुर आउनुहुन्छ?', en: 'Will you come?' }, max: 40, shared: 'reply.title' },
    'reply.send': { label: 'Send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 30 },
    'roll.of': { label: 'Credits: first heading', default: { en: 'The wedding of', ne: 'शुभ विवाह' }, max: 40 },
    'roll.blessings': { label: 'Credits: blessings heading', default: { en: 'With the blessings of', ne: 'आशीर्वादसहित' }, max: 40 },
  },
  // Hero/opening colours the client may change (see docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--bg': { label: 'Night background', default: '#05070c' },
    '--accent': { label: 'Gold', default: '#e3a857' },
    '--accent-2': { label: 'Light gold', default: '#f3d3a0' },
  },
};
