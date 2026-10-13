// Dhaka (heirloom stationery among flowers): every image and visible text the theme shows that is
// not invitation data. Plain data only (the studio server loads it). See src/core/slots.js and slot-vocab.js.
const more = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [
  `more.${i + 1}`,
  { label: `Loose prints: photo ${i + 1}`, kind: 'couple', default: { portrait: i + 5 }, note: 'Any orientation; shown whole. Repeats of photos already used are skipped.' },
]));

export default {
  theme: 'dhaka',
  images: {
    'welcome.photo': { label: 'Welcome photo (inside the floral frame, rises from the envelope)', kind: 'couple', default: { portrait: 0 }, note: 'The couple together, portrait orientation works best. Shown whole, never cropped.' },
    'print.photo': { label: 'Mounted print (The two of us)', kind: 'couple', default: { portrait: 1 }, note: 'Portrait or landscape; shown whole in a mat.' },
    'pair.a': { label: 'Framed pair: left photo', kind: 'couple', default: { portrait: 2 }, note: 'Portrait works best; shown whole.' },
    'pair.b': { label: 'Framed pair: right photo', kind: 'couple', default: { portrait: 3 }, note: 'Portrait works best; shown whole.' },
    'feature.photo': { label: 'Feature photo (full width, floral border)', kind: 'couple', default: { portrait: 4 }, note: 'Any orientation; shown whole over a soft blurred copy of itself.' },
    ...more,
    'fam.bride': { label: 'Bride portrait (Families)', kind: 'bride', note: 'Portrait 4:5, face in the upper third. Leave empty for a text-only family card.' },
    'fam.groom': { label: 'Groom portrait (Families)', kind: 'groom', note: 'Portrait 4:5, face in the upper third. Leave empty for a text-only family card.' },
    'envelope.lining': { label: 'Envelope lining (optional photo of Dhaka cloth)', kind: 'detail', note: 'A flat, evenly lit photo of Dhaka cloth. Empty = the woven Palpali Dhaka pattern drawn by the theme.' },
  },
  texts: {
    'env.kicker': { label: 'Envelope: small heading', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 30 },
    'gate.line': { shared: 'gate.line', label: 'Envelope: line under the names', default: { en: 'You are warmly invited', ne: 'हजुरलाई हार्दिक निमन्त्रणा' }, max: 50 },
    'gate.open': { shared: 'gate.open', label: 'Envelope: open instruction', default: { en: 'Tap the seal to open', ne: 'खोल्न छापमा थिच्नुहोस्' }, max: 40 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Envelope: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 40 },
    'welcome.kicker': { shared: 'hero.kicker', label: 'Welcome: heading above the photo', default: { en: 'शुभ विवाह', ne: 'शुभ विवाह' }, max: 30 },
    'welcome.line': { shared: 'hero.line', label: 'Welcome: line under the names', default: { en: 'invite you to celebrate their marriage', ne: 'हाम्रो शुभ विवाहमा हजुरलाई सादर निमन्त्रणा' }, max: 70 },
    'card.button': { shared: 'card.button', label: 'Read-the-invitation button', default: { en: 'Read the invitation', ne: 'निम्तो पढ्नुहोस्' }, max: 36 },
    'us.title': { shared: 'couple.title', label: 'Photos: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 30 },
    'us.line': { shared: 'couple.line', label: 'Photos: line beside the mounted print (empty = the last line of your story)', default: { en: 'Two families, one celebration. We would love you beside us.', ne: 'दुई परिवार, एउटै उत्सव। हजुर हाम्रो साथमा हुनुहोस्।' }, max: 110 },
    'feature.line': { label: 'Feature photo: line', default: { en: 'Soon, the seven steps.', ne: 'छिट्टै, सप्तपदी।' }, max: 60 },
    'prog.title': { shared: 'events.title', label: 'Programme: title', default: { en: 'When and where', ne: 'कहिले र कहाँ' }, max: 30 },
    'prog.note': { label: 'Programme: small note', default: { en: 'All times are Nepal time.', ne: 'सबै समय नेपाली समयअनुसार।' }, max: 60 },
    'fam.title': { label: 'Families: title', default: { en: 'Our families', ne: 'हाम्रा परिवार' }, max: 30 },
    'fam.bride': { label: 'Families: bride label', default: { en: 'The bride', ne: 'दुलही' }, max: 24 },
    'fam.groom': { label: 'Families: groom label', default: { en: 'The groom', ne: 'दुलाहा' }, max: 24 },
    'reply.title': { shared: 'reply.title', label: 'Reply: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 32 },
    'reply.send': { label: 'Reply: send button', default: { en: 'Send reply', ne: 'जवाफ पठाउनुहोस्' }, max: 24 },
    'closing.line': { shared: 'closing.line', label: 'Closing line (empty = the invitation closing)', default: { en: '', ne: '' }, max: 110 },
  },
};
