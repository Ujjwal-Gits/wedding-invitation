// Dhaka Modern: every image and visible text the theme shows that is not invitation data.
// Plain data only (loaded by the studio server). See src/core/slots.js.
const us = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [
  `us.${i + 1}`,
  {
    label: `The two of us: photo ${i + 1}`,
    kind: 'couple',
    default: { portrait: i + 2 },
    note: 'Any orientation; shown whole (never cropped) in justified rows. Repeats of earlier photos are skipped.',
  },
]));

export default {
  theme: 'dhaka',
  images: {
    'hero.photo': { label: 'Hero photo, under the names', kind: 'couple', default: { portrait: 0 }, note: 'The couple together. Portrait or landscape; shown whole on desktop, cropped to its focal point on phones.' },
    'reveal.photo': { label: 'Photo revealed when the woven cloth unravels', kind: 'couple', default: { portrait: 1 }, note: 'The couple. Landscape or portrait; shown whole beside "Getting married".' },
    ...us,
    'fam.bride': { label: 'Bride portrait (Two families)', kind: 'bride', note: 'Portrait 4:5, face in the upper third. Leave empty to show her woven initial.' },
    'fam.groom': { label: 'Groom portrait (Two families)', kind: 'groom', note: 'Portrait 4:5, face in the upper third. Leave empty to show his woven initial.' },
  },
  texts: {
    'gate.kicker': { shared: 'gate.line', label: 'Entry: line above the names', default: { en: 'You are invited', ne: 'हजुरलाई निम्तो' }, max: 40 },
    'gate.music': { shared: 'gate.open', label: 'Entry: open-with-music button', default: { en: 'Open with music', ne: 'संगीतसहित खोल्नुहोस्' }, max: 30 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Entry: open-quietly link', default: { en: 'Open quietly', ne: 'संगीतबिना' }, max: 24 },
    'hero.kicker': { shared: 'hero.kicker', label: 'Hero: top-left label', default: { en: 'N°01 — Shubha Bibaha', ne: 'शुभ विवाह' }, max: 40 },
    'hero.line': { shared: 'hero.line', label: 'Hero: one line beside the photo', default: { en: 'Two threads, one cloth.', ne: 'दुई धागो, एउटै बुनाइ।' }, max: 48 },
    'hero.cue': { label: 'Hero: scroll cue', default: { en: 'Scroll to weave', ne: 'तल सार्नुहोस्' }, max: 28 },
    'loom.hint': { label: 'Weave: hint while weaving starts', default: { en: 'Keep scrolling. The cloth is being woven.', ne: 'तल सार्दै जानुहोस्, कपडा बुनिँदैछ।' }, max: 60 },
    'loom.count': { label: 'Weave: row counter label', default: { en: 'rows woven', ne: 'पङ्क्ति बुनियो' }, max: 24 },
    'reveal.kicker': { label: 'Reveal: small label', default: { en: 'The promise', ne: 'वाचा' }, max: 28 },
    'reveal.title': { label: 'Reveal: big title', default: { en: 'Getting married', ne: 'शुभ विवाह' }, max: 28 },
    'marquee.1': { label: 'Moving band: phrase 1 (both languages shown)', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 32 },
    'marquee.2': { label: 'Moving band: phrase 2 (both languages shown)', default: { en: 'Two threads, one cloth', ne: 'दुई धागो, एउटै बुनाइ' }, max: 40 },
    'marquee.3': { label: 'Moving band: phrase 3 (both languages shown)', default: { en: 'Seven steps', ne: 'सप्तपदी' }, max: 32 },
    'us.title': { shared: 'couple.title', label: 'Photos: section title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 24 },
    'us.since': { label: 'Photos: "since" line ({year} = first story year)', default: { en: 'Since {year}', ne: '{year} देखि' }, max: 24 },
    'us.frames': { label: 'Photos: count label ({n} = number of photos)', default: { en: '{n} frames', ne: '{n} तस्बिर' }, max: 24 },
    'rib.title': { shared: 'events.title', label: 'Ceremonies: title', default: { en: 'The ceremonies', ne: 'कार्यक्रमहरू' }, max: 28 },
    'rib.sub': { label: 'Ceremonies: subtitle ({n} = number of days)', default: { en: '{n} days, one wedding', ne: '{n} दिन, एउटै विवाह' }, max: 40 },
    'rib.end': { label: 'Ceremonies: closing line', default: { en: 'Come as you are. Leave as family.', ne: 'आउनुहोस्, परिवार बनेर फर्कनुहोस्।' }, max: 60 },
    'rib.cta': { label: 'Ceremonies: reply button', default: { en: 'Reply now', ne: 'जवाफ दिनुहोस्' }, max: 24 },
    'fam.title': { label: 'Families: title', default: { en: 'Two families', ne: 'दुई परिवार' }, max: 28 },
    'fam.bride': { label: 'Families: bride label', default: { en: 'The bride', ne: 'दुलही' }, max: 20 },
    'fam.groom': { label: 'Families: groom label', default: { en: 'The groom', ne: 'दुलाहा' }, max: 20 },
    'fam.card': { shared: 'card.button', label: 'Families: open-the-card button', default: { en: 'Read the invitation card', ne: 'निम्तो कार्ड पढ्नुहोस्' }, max: 36 },
    'card.title': { label: 'Invitation card: heading', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 28 },
    'reply.title': { shared: 'reply.title', label: 'Reply: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 32 },
    'reply.send': { label: 'Reply: send button', default: { en: 'Send reply', ne: 'जवाफ पठाउनुहोस्' }, max: 24 },
  },
};
