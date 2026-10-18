// Sarovar (सरोवर) · the swan lake at dawn: every theme image and text, replaceable from the studio. Plain data, no
// imports (the server loads this file). Invitation data (names, parents, dates, events, card wording, gallery, RSVP,
// closing) lives in the studio's own sections.
export default {
  // Faith (docs/PLATFORM.md "Religion"): a lotus lake, swans and a marble pavilion; no religious image or word.
  religions: ['hindu', 'buddhist', 'kirat', 'christian', 'muslim', 'other'],
  // On both websites (src/core/markets.js): bilingual with B.S. dates in Nepal, English only abroad.
  market: 'both',
  style: 'romantic',
  occasions: ['wedding'],
  theme: 'sarovar',
  name: 'Sarovar',
  description: 'A lotus lake at dawn: a bud opens, two swans meet, and you glide across living water to a marble pavilion',
  images: {
    'couple.lead': { label: 'Main photo of the couple (stands on the water)', kind: 'couple', default: { portrait: 0 }, note: 'Shown whole with its reflection in the lake. Portrait works best.' },
    'gallery.1': { label: 'Photos: photo 1', kind: 'couple', default: { portrait: 1 }, note: 'The couple. Shown whole, never cropped, with a reflection. Repeats are skipped.' },
    'gallery.2': { label: 'Photos: photo 2', kind: 'couple', default: { portrait: 2 }, note: 'The couple. Shown whole, never cropped, with a reflection. Repeats are skipped.' },
    'gallery.3': { label: 'Photos: photo 3', kind: 'couple', default: { portrait: 3 }, note: 'The couple. Shown whole, never cropped, with a reflection. Repeats are skipped.' },
    'gallery.4': { label: 'Photos: photo 4', kind: 'couple', default: { portrait: 4 }, note: 'The couple. Shown whole, never cropped, with a reflection. Repeats are skipped.' },
    'gallery.5': { label: 'Photos: photo 5', kind: 'couple', default: { portrait: 5 }, note: 'The couple. Shown whole, never cropped, with a reflection. Repeats are skipped.' },
    'gallery.6': { label: 'Photos: photo 6', kind: 'couple', default: { portrait: 6 }, note: 'The couple. Shown whole, never cropped, with a reflection. Repeats are skipped.' },
    'families.bride': { label: 'Bride portrait (families)', kind: 'bride', default: null, note: 'Shown only when bride and groom both have their own photo.' },
    'families.groom': { label: 'Groom portrait (families)', kind: 'groom', default: null, note: 'Shown only when bride and groom both have their own photo.' },
  },
  texts: {
    'gate.line': { shared: 'gate.line', label: 'Opening: line above the button', default: { en: 'You are invited to our wedding', ne: 'हाम्रो शुभ विवाहमा हजुरलाई निम्तो' }, max: 60 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Open the invitation', ne: 'निम्तो खोल्नुहोस्' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'gate.hint': { label: 'Opening: small hint under the lotus bud', default: { en: 'Touch the lotus', ne: 'कमल छुनुहोस्' }, max: 28 },
    'hero.kicker': { shared: 'hero.kicker', label: 'First screen: small line above the names', default: { en: 'Together with their families', ne: 'दुवै परिवारको शुभ आशीर्वादसहित' }, max: 48 },
    'hero.line': { label: 'First screen: line under the names', default: { en: 'invite you to celebrate their wedding', ne: 'शुभ विवाहमा हजुरलाई सादर निम्तो गर्दछन्' }, max: 70, multiline: true },
    'glide.kicker': { label: 'The lake: small label at the start', default: { en: 'Save the date', ne: 'शुभ साइत' }, max: 28 },
    'count.title': { label: 'Countdown: title', default: { en: 'Counting down to the day', ne: 'शुभ घडी आउन बाँकी' }, max: 36 },
    'prog.title': { shared: 'events.title', label: 'Programme: title on each stone', default: { en: 'The celebrations', ne: 'कार्यक्रम' }, max: 32 },
    'glide.end': { label: 'The lake: line at the pavilion', default: { en: 'Across the water, our families wait for you', ne: 'तालपारि दुवै परिवार हजुरलाई पर्खिरहेका छन्' }, max: 60, multiline: true },
    'families.title': { label: 'Families: title', default: { en: 'With the blessings of our families', ne: 'दुवै परिवारको आशीर्वादसहित' }, max: 48 },
    'couple.title': { shared: 'couple.title', label: 'Couple: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 28 },
    'couple.line': { shared: 'couple.line', label: 'Couple: one line (type - to remove)', default: { en: 'Two swans, one lake: soon to be married, with the blessings of both families.', ne: 'एउटै सरोवरका दुई हंस: दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।' }, max: 100, multiline: true },
    'gallery.title': { label: 'Photos: title', default: { en: 'Soon, together', ne: 'चाँडै, सँगसँगै' }, max: 32 },
    'hero.title': { label: 'Invitation card: title', default: { en: 'Wedding Invitation', ne: 'शुभ विवाह' }, max: 32 },
    'card.line': { shared: 'hero.line', label: 'Card wording: the one line of invitation', default: { en: 'We joyfully invite you and your family to bless the couple with your presence.', ne: 'शुभ विवाहमा सपरिवार पधारी आशीर्वाद दिनुहुन हार्दिक अनुरोध छ।' }, max: 100, multiline: true },
    'card.button': { shared: 'card.button', label: 'Button: read the full card', default: { en: 'Read the full invitation', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' }, max: 32 },
    'rsvp.line': { label: 'RSVP: line under the title', default: { en: 'Send your reply and a little light floats across the lake to us.', ne: 'जवाफ पठाउनुहोस्, एउटा सानो बत्ती तालपारि हामीकहाँ तैरिएर आउनेछ।' }, max: 80, multiline: true },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
  },
  // Colours the client may change (docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--sv-rose': { label: 'Lotus rose (buttons, names)', default: '#A93A58' },
    '--sv-jade': { label: 'Lake jade', default: '#2E6E70' },
    '--sv-deep': { label: 'Deep water', default: '#12343A' },
    '--sv-pearl': { label: 'Dawn pearl', default: '#FBF6EF' },
  },
  // Mix (docs/MIX.md): the lake is one continuous scene (the gate's bud opens into the first screen's bloom, and the
  // same living water runs under the whole page), so no part travels to or from another design.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: {
      gate: 'The lotus bud opens on Sarovar’s own lake; it cannot open another design.',
      hero: 'The swans and the bloom float on Sarovar’s living lake, which runs under the whole page.',
      hostGate: 'Sarovar’s opening is part of its lake scene.',
      hostHero: 'Sarovar’s first screen is part of its lake scene.',
    },
  },
};
