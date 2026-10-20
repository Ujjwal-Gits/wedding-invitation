// Sawari (सवारी) · the ride: every theme image and text, replaceable from the studio. Plain data, no imports (the
// server loads this file). Invitation data (names, parents, dates, events, story, vows, card wording, gallery, RSVP,
// closing) lives in the studio sections. The painted journey itself (the horse, the bride and groom, the seven places
// on the road) is the design, so it is not a slot.
const couple = (n) => ({ label: `Photos: photo ${n}`, kind: 'couple', default: { portrait: n }, note: 'The couple. Shown whole, never cropped. Repeats are skipped.' });
export default {
  // Faith (docs/PLATFORM.md "Religion"): a Hindu wedding procession to a mandap with the sacred fire, kalash and
  // the seven steps; Ganesh above the names. A Hindu design.
  religions: ['hindu'],
  faithInk: '--su-accent',
  market: 'np',
  style: 'romantic',
  occasions: ['wedding'],
  theme: 'sawari',
  images: {
    'hero.ganesh': {
      label: 'Ganesh (above the names on the first screen)',
      kind: 'detail',
      default: { lg: '/themes/_nepali/ganesh-brass.webp', sm: '/themes/_nepali/ganesh-brass-sm.webp', w: 1000, h: 1000, alt: 'Shri Ganesh in brass' },
      note: 'A cut-out picture with a transparent background works best. Type off in the Ganesh line to hide him.',
    },
    'couple.lead': { label: 'The couple, in the carved frame by the mustard fields', kind: 'couple', default: { portrait: 0 }, note: 'Portrait works best. Shown whole inside a carved frame garlanded with marigolds.' },
    'gallery.1': couple(1),
    'gallery.2': couple(2),
    'gallery.3': couple(3),
    'gallery.4': couple(4),
    'gallery.5': couple(5),
    'gallery.6': couple(6),
    'finale.photo': { label: 'The couple, beside the reply card', kind: 'couple', default: { portrait: 7 }, note: 'Portrait works best. Shown whole in a thin gold frame next to the RSVP.' },
    'families.bride': { label: 'Bride portrait (on her family’s milestone)', kind: 'bride', default: null, note: 'Shown only when bride and groom both have their own photo.' },
    'families.groom': { label: 'Groom portrait (on his family’s milestone)', kind: 'groom', default: null, note: 'Shown only when bride and groom both have their own photo.' },
  },
  texts: {
    'gate.line': { label: 'Opening: line above the button', default: { en: 'The horse is dressed. The road is waiting.', ne: 'घोडा सजिसक्यो, बाटो पर्खिरहेछ।' }, max: 60 },
    'gate.open': { shared: 'gate.open', label: 'Opening: open button', default: { en: 'Begin the journey', ne: 'यात्रा सुरु गरौं' }, max: 28 },
    'gate.quiet': { shared: 'gate.quiet', label: 'Opening: open without music', default: { en: 'Open without music', ne: 'संगीतबिना खोल्नुहोस्' }, max: 32 },
    'ganesh.show': { label: 'Ganesh (type off to hide him)', default: { en: 'on', ne: 'on' }, max: 8 },
    'hero.invocation': { label: 'First screen: invocation (type - to remove)', default: { en: '॥ श्री गणेशाय नमः ॥', ne: '॥ श्री गणेशाय नमः ॥' }, max: 40 },
    'hero.title': { shared: 'hero.kicker', label: 'First screen: small title', default: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, max: 24 },
    'hero.line': { label: 'First screen: one line (type - to remove)', default: { en: 'Ride with us, all the way to the mandap.', ne: 'मण्डपसम्मको यो यात्रामा हामीसँगै हिँड्नुहोस्।' }, max: 70 },
    'stop.home': { label: 'Route sign 1: the family home', default: { en: 'From the family home', ne: 'घर आँगनबाट' }, max: 32 },
    'stop.fields': { label: 'Route sign 2: the mustard fields', default: { en: 'Through the mustard fields', ne: 'तोरीबारी हुँदै' }, max: 32 },
    'stop.bridge': { label: 'Route sign 3: the river', default: { en: 'Across the river', ne: 'खोला तरेर' }, max: 32 },
    'stop.chautari': { label: 'Route sign 4: the chautari', default: { en: 'A rest at the chautari', ne: 'चौतारीमा बिसौनी' }, max: 32 },
    'stop.temple': { label: 'Route sign 5: the temple', default: { en: 'Past the temple at sunset', ne: 'साँझ मन्दिर हुँदै' }, max: 32 },
    'stop.toran': { label: 'Route sign 6: the welcome gate', default: { en: 'Under the toran', ne: 'तोरणमुनि' }, max: 32 },
    'stop.mandap': { label: 'Route sign 7: the mandap', default: { en: 'At the mandap', ne: 'मण्डपमा' }, max: 32 },
    'couple.title': { shared: 'couple.title', label: 'Couple: title', default: { en: 'The two of us', ne: 'हामी दुई' }, max: 28 },
    'couple.line': { shared: 'couple.line', label: 'Couple: one line (type - to remove)', default: { en: 'Soon to be married, with the blessings of both families.', ne: 'दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।' }, max: 90, multiline: true },
    'story.title': { label: 'Our story: title (type - to hide the story)', default: { en: 'Our road so far', ne: 'हाम्रो बाटो, अहिलेसम्म' }, max: 32 },
    'families.title': { label: 'Families: title', default: { en: 'Two families, one road', ne: 'दुई परिवार, एउटै बाटो' }, max: 40 },
    'gallery.title': { label: 'Photos: title', default: { en: 'Together, soon', ne: 'चाँडै, सँगै' }, max: 32 },
    'prog.kicker': { label: 'Ceremonies: small label', default: { en: 'When and where', ne: 'कहिले र कहाँ' }, max: 28 },
    'prog.title': { shared: 'events.title', label: 'Ceremonies: title', default: { en: 'The celebrations', ne: 'कार्यक्रम' }, max: 32 },
    'count.title': { label: 'Countdown: line on the milestone', default: { en: 'to the mandap', ne: 'मण्डपसम्म' }, max: 24 },
    'scratch.title': { label: 'Mandap: title', default: { en: 'The mandap is ready', ne: 'मण्डप तयार छ' }, max: 36 },
    'scratch.hint': { label: 'Scratch card: line on the cover', default: { en: 'Scratch to see the day', ne: 'शुभ दिन हेर्न कोर्नुहोस्' }, max: 32 },
    'scratch.button': { label: 'Scratch card: button that reveals it at once', default: { en: 'Show the date', ne: 'मिति हेर्नुहोस्' }, max: 24 },
    'vows.title': { shared: 'rite.saptapadi.title', label: 'Seven steps: title', default: { en: 'Seven steps, seven promises', ne: 'सात पाइला, सात वाचा' }, max: 40 },
    'vows.line': { shared: 'rite.saptapadi.line', label: 'Seven steps: one line (type - to remove)', default: { en: 'Around the sacred fire, tied by the ganthi, we will take them together.', ne: 'पवित्र अग्निको साक्षीमा, गाँठो कसेर, यी पाइला हामी सँगै चाल्नेछौं।' }, max: 100, multiline: true },
    'card.line': { shared: 'hero.line', label: 'Card wording: the one line of invitation', default: { en: 'We joyfully invite you and your family to bless the couple with your presence.', ne: 'शुभ विवाहमा सपरिवार पधारी आशीर्वाद दिनुहुन हार्दिक अनुरोध छ।' }, max: 100, multiline: true },
    'card.button': { shared: 'card.button', label: 'Button: read the full card', default: { en: 'Read the full invitation', ne: 'निमन्त्रणा पत्र पढ्नुहोस्' }, max: 36 },
    'arrive.title': { label: 'Arrival: title over the painting', default: { en: 'Walk the last steps with us', ne: 'अन्तिम पाइला हामीसँगै' }, max: 40 },
    'rsvp.title': { shared: 'reply.title', label: 'RSVP: title', default: { en: 'Will you join us at the mandap?', ne: 'मण्डपमा हजुर आउनुहुन्छ?' }, max: 40 },
    'rsvp.send': { label: 'RSVP: send button', default: { en: 'Send my reply', ne: 'जवाफ पठाउनुहोस्' }, max: 28 },
  },
  // Colours the client may change (docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--su-accent': { label: 'Sindoor red (buttons, titles)', default: '#A6271F' },
    '--sw-night': { label: 'Himalayan dusk (the evening pages)', default: '#16243A' },
    '--sw-gold': { label: 'Marigold gold (rules, numbers)', default: '#D69A2D' },
  },
  // Mix (docs/MIX.md): the opening hands the horse to this design's own road, and the road starts on its first screen.
  parts: {
    gate: false, hero: false, hostGate: false, hostHero: false,
    why: {
      gate: 'The opening sets the horse on this design’s own road.',
      hero: 'The first screen is the start of the painted road the journey rides along.',
      hostGate: 'The opening is part of the road: it hands over to this design’s own first screen.',
      hostHero: 'The journey needs this design’s own road as its first screen.',
    },
  },
};
