// Static design list: the fallback when GET /api/themes is unavailable, and the source of the Nepali names,
// plain-English descriptions, categories and alt text (the API returns { slug, name, concept, thumb, religions }).
// Designs are never linked live from the website: only stills, the design pages and the watermarked showcase.
// Categories: flowers | doors | cards | film. Religions: exactly what the theme's slots.js declares (absent = hindu
// only), judged from each design's own art: docs/FAITH-DESIGNS.md (server/test/theme-meta.test.js keeps them equal).
/** The Nepal site's faiths, in the order its faith section and filter show them: [id, English, Nepali]. */
export const SITE_FAITHS = [
  ['hindu', 'Hindu', 'हिन्दू'], ['buddhist', 'Buddhist', 'बौद्ध'], ['kirat', 'Kirat', 'किराँत'],
  ['christian', 'Christian', 'क्रिश्चियन'], ['muslim', 'Muslim', 'मुस्लिम'], ['other', 'Other or mixed', 'अन्य वा मिश्रित'],
];
export const THEMES = [
  ['kham', 'Kham', 'खाम', 'cards', 'A paper envelope with a red wax seal. It opens into a clear card with all your events.', 'a handmade-paper envelope with a red wax seal', ['hindu', 'buddhist']],
  ['dhoka', 'Dhoka', 'ढोका', 'doors', 'A clean white card. The golden door of Patan opens in 3D to show your names.', 'the golden door of Patan beside the couple’s names', ['hindu']],
  ['mala', 'Mala', 'माला', 'flowers', 'A wedding mandap with red silk, marigold strings and brass kalash full of flowers.', 'red silk drapes with marigold flowers and brass kalash', ['hindu']],
  ['durbar', 'Durbar', 'दरबार', 'film', 'A 3D morning walk through Bhaktapur Durbar Square, under flower arches.', 'the Nyatapola temple of Bhaktapur in 3D', ['hindu']],
  ['gurans', 'Phoolbari', 'फूलबारी', 'flowers', 'A gate of fresh roses and marigold strings opens to show शुभ विवाह. Then a calm, soft invitation.', 'a flower gate with शुभ विवाह on an ivory crest', ['hindu']],
  ['dhaka', 'Dhaka', 'ढाका', 'cards', 'Break the seal and slide off the Dhaka band. Your names rise out of the envelope among flowers.', 'an ivory envelope with a Dhaka band and a wax seal', ['hindu', 'buddhist', 'kirat', 'muslim', 'christian', 'other']],
  ['sayapatri', 'Sayapatri', 'सयपत्री', 'flowers', 'A doorway hung with marigold strings. The strings lift to open a calm ivory invitation.', 'a doorway hung with marigold strings and mango leaves', ['hindu', 'buddhist']],
  ['himal', 'Himal', 'हिमाल', 'film', 'Sunrise over the Himalaya, then a quiet photo story of the two of you.', 'Machhapuchhre at sunrise with the couple’s names', ['hindu', 'buddhist', 'kirat', 'muslim', 'christian', 'other']],
  ['chitra', 'Chitra', 'चित्र', 'cards', 'A picture book in Mithila art: the janti, the garlands, the seven rounds and the dance.', 'a painted couple walking around the sacred fire', ['hindu']],
  ['mandap', 'Mandap', 'मण्डप', 'film', 'A 3D mandap on a bright morning. The couple exchange garlands and walk the seven rounds.', 'a 3D mandap with the bride by the sacred fire', ['hindu']],
  ['bagaicha', 'Bagaicha', 'बगैंचा', 'film', 'A 3D garden wedding: through a rose arch, around the sacred fire, on to the reception.', 'a 3D garden with a pavilion and a long pool', ['hindu']],
  ['ghar', 'Ghar', 'घर', 'film', 'A warm evening walk through a Newar house, room by room, like a film.', 'a Newar courtyard at dusk', ['hindu']],
  ['mangal', 'Mangal', 'मंगल', 'doors', 'A red temple door with garlands and bells. The doors swing open on शुभ विवाह.', 'a red carved door hung with marigold garlands and brass bells', ['hindu']],
  ['nimantrana', 'Nimantrana', 'निमन्त्रणा', 'cards', 'A traditional red and gold card that unfolds in 3D: Ganesh, the couple, then the programme.', 'a red and gold folded wedding card with Ganesh and the programme', ['hindu']],
  ['jhyal', 'Jhyal', 'झ्याल', 'doors', 'A carved Newari window. The wooden shutters open on शुभ विवाह.', 'a carved Newari window with a marigold toran and two brass diyos', ['hindu', 'buddhist']],
  ['mahal', 'Mahal', 'महल', 'doors', 'A golden palace gate tied with a satin bow. It opens onto a palace balcony at night.', 'a golden palace gate under roses, tied with an ivory satin bow', ['hindu']],
  ['laali', 'Laali', 'लाली', 'flowers', 'Blush pink and gold. Lanterns drop in as an arched card draws itself.', 'a blush pink arched card with gold lanterns and peonies', ['hindu']],
  ['mehendi', 'Mehendi', 'मेहन्दी', 'cards', 'Henna on ivory. A henna pattern draws itself, then two hennaed hands come together.', 'an ivory card with joined henna hands', ['hindu']],
  ['hariyo', 'Hariyo', 'हरियो', 'flowers', 'A soft green garden in watercolour. The leaves part to show a white pavilion and two peacocks.', 'green watercolour leaves around a white garden pavilion', ['hindu']],
  ['shree', 'Shree', 'श्री', 'cards', 'Deep plum and gold. A gold lotus opens on Ganesh as two diyas come down.', 'a gold Ganesh drawing on deep plum with hanging diyas', ['hindu']],
  ['pardaa', 'Pardaa', 'पर्दा', 'doors', 'Red velvet curtains open on a mandap with a living fire. Each event has its own colours.', 'red and gold velvet curtains around a marigold mandap', ['hindu']],
  ['rajdwar', 'Rajdwar', 'राजद्वार', 'doors', 'A painted gold palace gate with a satin bow. Untie it and walk through to a red and gold card.', 'a painted gold palace gate with Ganesh on top, tied with an ivory bow', ['hindu']],
  ['agni', 'Agni', 'अग्नि', 'film', 'The sacred fire at night. Tap to light it, then the couple walk the seven rounds.', 'a brass havan kunda with a living fire under Ganesh', ['hindu']],
  ['janti', 'Janti', 'जन्ती', 'film', 'Walk with the Naumati Baja band and the doli down an old Newari street to the bride’s door.', 'the Naumati Baja band and a red doli in a golden Newari street', ['hindu']],
  ['swayambar', 'Swayambar', 'स्वयम्बर', 'flowers', 'Two fresh garlands swing apart. The bride’s side and the groom’s side come together as you scroll.', 'the bride and groom exchanging marigold garlands', ['hindu']],
  ['sindoor', 'Sindoor', 'सिन्दूर', 'cards', 'Red, white and black. The sindoor box opens and a red line carries your story.', 'a red and gold sindoor box on white with a red Ganesh drawing', ['hindu']],
  ['kalapi', 'Kalapi', 'कलापी', 'film', 'A peacock fans its tail to show your names. Then you walk sideways along a painted pichwai of the monsoon.', 'a peacock fan around the couple’s names on monsoon-teal cloth', ['hindu']],
  ['rangoli', 'Rangoli', 'रंगोली', 'flowers', 'A flower rangoli on a brick courtyard. The rings come together and the diyo in the middle lights up.', 'a round marigold and rose rangoli on a brick courtyard with lit diyos', ['hindu']],
].map(([slug, name, ne, cat, concept, alt, religions]) => ({ slug, name, ne, cat, concept, alt, religions, thumb: `/themes/${slug}/thumb.jpg` }));

export const BY_SLUG = Object.fromEntries(THEMES.map((t) => [t.slug, t]));

// label: chips and related cards; one: the kicker on a design; short: under a thumbnail; tint: the canvas panels
export const CATEGORIES = {
  flowers: { label: 'Flowers', one: 'Flower design', short: 'Flowers', tint: '#F6E9E7' },
  doors: { label: 'Doors and gates', one: 'Door or gate', short: 'Door', tint: '#EFE3DA' },
  cards: { label: 'Cards and envelopes', one: 'Card design', short: 'Card', tint: '#F3E2E2' },
  film: { label: '3D and film', one: '3D or film design', short: '3D and film', tint: '#ECE8DF' },
};

// The plans' short descriptions (the canvas cards carry one); the admin's `note` wins when it is set.
export const PLAN_DESC = {
  saral: 'One beautiful link with all the basics.',
  shubha: 'Everything a full Nepali wedding needs, in one link.',
  shahi: 'Every design, and the whole invitation made around you.',
  custom: 'A new design, made only for your occasion.',
};

export const RELIGION_LABEL = { hindu: 'Hindu', buddhist: 'Buddhist', kirat: 'Kirat', muslim: 'Muslim', christian: 'Christian', other: 'Other' };

// Shown only when GET /api/site is unavailable (the admin edits the real plans, methods and contact in the studio).
export const FALLBACK_SITE = {
  plans: [
    { id: 'saral', name: 'Standard', nameNe: 'सरल', price: 2999, priceUsd: 49, includes: 'saral', features: ['A ready-made design', 'Your names, date and venue', 'Guest replies (RSVP)', 'A link to share on WhatsApp'], highlight: false },
    { id: 'shubha', name: 'Pro', nameNe: 'शुभ', price: 4999, priceUsd: 99, includes: 'shubha', note: 'Most couples choose this', features: ['Everything in Standard', 'Photos and your story', 'Every ceremony with maps', 'Music and the opening scene'], highlight: true },
    { id: 'shahi', name: 'Pro Max', nameNe: 'शाही', price: 6999, priceUsd: 149, includes: 'shahi', features: ['Everything in Pro', 'Premium designs', 'Personal guest links', 'Priority help until the wedding'], highlight: false },
    { id: 'custom', name: 'Custom', nameNe: 'आफ्नै', price: 11111, priceUsd: 199, from: true, includes: 'shahi', note: 'A design made only for you', features: ['A design made for your occasion', 'Your colours, art and wording', 'Everything in Pro Max'], highlight: false },
  ],
  paymentMethods: [
    { id: 'khalti', label: 'Khalti', kind: 'wallet', currency: 'NPR', accountName: '', qr: '/site/pay/khalti.png' },
    { id: 'esewa', label: 'eSewa', kind: 'wallet', currency: 'NPR', accountName: '', qr: '/site/pay/esewa.png' },
    { id: 'nabil', label: 'Nabil Bank', kind: 'bank', currency: 'NPR', accountName: '', qr: '/site/pay/nabil.png' },
    { id: 'paypal', label: 'PayPal', kind: 'paypal', currency: 'USD', accountName: '', qr: '/site/pay/paypal.png', note: 'For payments from abroad' },
  ],
  contact: { phone: '+977 980-6393298', whatsapp: '+977 980-6393298', email: 'nimttoz@gmail.com', address: '' },
  hero: { title: '', subtitle: '' },
  hiddenThemes: [],
  featuredThemes: [],
};

// Nepali names for the usual plans: the fallback when a plan has no `nameNe` (the planner edits both names)
export const PLAN_NE = { saral: 'सरल', shubha: 'शुभ', shahi: 'शाही', custom: 'आफ्नै' };

// Design tiers (docs/API.md "Design tiers"): the lowest plan that includes a design. /api/themes `tier` wins.
export const TIER_RANK = { saral: 1, shubha: 2, shahi: 3 };
export const TIER_LABEL = { saral: 'Standard', shubha: 'Pro', shahi: 'Pro Max' };
const TIERS = {
  shahi: ['mahal', 'rajdwar', 'laali', 'mehendi', 'hariyo', 'shree', 'pardaa', 'agni', 'janti', 'swayambar', 'sindoor', 'rangoli', 'kalapi'],
  saral: ['kham', 'mala', 'gurans', 'sayapatri', 'jhyal', 'chitra', 'dhaka'],
};
export const tierOf = (slug) => (TIERS.shahi.includes(slug) ? 'shahi' : TIERS.saral.includes(slug) ? 'saral' : 'shubha');
for (const t of THEMES) t.tier = tierOf(t.slug);
/** a tier's name: the name of the plan with that id (the planner can rename it), else the plan the tier starts at */
export const tierName = (plans, tier) => (plans || []).find((p) => p.id === tier)?.name || planForTier(plans || [], tier)?.name || TIER_LABEL[tier] || '';
/** the plan a tier starts at, from a plan list (the cheapest plan whose `includes` covers it) */
export function planForTier(plans, tier) {
  const need = TIER_RANK[tier] || 2;
  return plans.filter((p) => !p.from && p.id !== 'custom' && (TIER_RANK[p.includes] || 3) >= need && p.price != null)
    .sort((a, b) => a.price - b.price)[0] || null;
}
