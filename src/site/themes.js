// Static theme list: the fallback when GET /api/themes is unavailable, and the source of the Nepali names and
// alt text (the API returns { slug, name, concept, thumb, demo } only).
export const THEMES = [
  ['kham', 'Kham', 'खाम', 'A handmade-paper envelope sealed with the endless knot; the card unfolds into a clear programme.', 'a handmade-paper envelope with a sindoor wax seal'],
  ['dhoka', 'Dhoka', 'ढोका', 'White editorial print. The Golden Door of Patan opens in 3D.', 'the Golden Door of Patan beside the couple’s names'],
  ['mala', 'Mala', 'माला', 'A dressed Nepali mandap: silk drapes, marigold strings and brass kalash of fresh flowers.', 'red silk drapes with marigold rosettes and brass kalash'],
  ['durbar', 'Durbar', 'दरबार', 'A 3D morning walk through Bhaktapur Durbar Square, under flower arches, past the Nyatapola.', 'the Nyatapola temple of Bhaktapur in 3D'],
  ['gurans', 'Phoolbari', 'फूलबारी', 'A flower gate opens on शुभ विवाह; then a calm, paper-soft invitation.', 'a flower gate with शुभ विवाह on an ivory crest'],
  ['dhaka', 'Dhaka', 'ढाका', 'Break the seal, slip off the Dhaka band, and the couple rise from the envelope into flowers.', 'an ivory envelope with a Dhaka band and wax seal'],
  ['sayapatri', 'Sayapatri', 'सयपत्री', 'A doorway hung with real marigold strings; they lift to open a calm ivory invitation.', 'a doorway hung with marigold strings and mango leaves'],
  ['himal', 'Himal', 'हिमाल', 'Quiet luxury. Sunrise over the Himalaya and a photo essay of the couple.', 'Machhapuchhre at dawn with the couple’s names'],
  ['chitra', 'Chitra', 'चित्र', 'A Mithila picture book: janti, swayambar, seven rounds, sindoor, the dance.', 'an illustrated couple walking around the sacred fire'],
  ['mandap', 'Mandap', 'मण्डप', 'A 3D mandap on a bright morning; the couple exchange garlands and walk seven rounds.', 'a 3D mandap with the bride by the sacred fire'],
  ['bagaicha', 'Bagaicha', 'बगैंचा', 'A 3D garden wedding: through the rose arch, seven rounds of the fire, on to the reception.', 'a 3D garden with a domed pavilion and reflecting pool'],
  ['ghar', 'Ghar', 'घर', 'A lamplit film walking through a Newar house, room by room.', 'a Newar courtyard at dusk in film framing'],
  ['mangal', 'Mangal', 'मंगल', 'A wide red temple doorway with garlands and bells; the doors swing open on शुभ विवाह.', 'a red carved doorway hung with marigold garlands and brass bells'],
  ['nimantrana', 'Nimantrana', 'निमन्त्रणा', 'A traditional tri-fold card that unfolds in 3D: Ganesh, the couple, the programme.', 'a red and gold tri-fold wedding card with Ganesh, the couple and the programme'],
  ['jhyal', 'Jhyal', 'झ्याल', 'A carved Newari window on handmade paper; the lattice shutters swing open on शुभ विवाह.', 'a carved Newari wooden window with a marigold toran and two brass diyos'],
  ['mahal', 'Mahal', 'महल', 'A golden palace gate tied with a satin bow; it swings open onto a palace balcony at night.', 'a golden palace gate under roses, tied with an ivory satin bow'],
  ['laali', 'Laali', 'लाली', 'Blush pink and gold: an arched card under hanging lanterns that drop in as the arch draws itself.', 'a blush pink arched card with gold lanterns and peonies'],
  ['mehendi', 'Mehendi', 'मेहन्दी', 'Henna on ivory: a henna mandala draws itself, then the joined, hennaed hands glide in.', 'an ivory card with joined henna hands and a henna Ganesh'],
  ['hariyo', 'Hariyo', 'हरियो', 'Sage-green watercolour garden: the leaves part on a white pavilion with the couple and two peacocks.', 'sage watercolour greenery around a white garden pavilion'],
  ['shree', 'Shree', 'श्री', 'Deep plum and antique gold: a gold lotus opens on Ganesh while two hanging diyas descend.', 'a gold line-art Ganesh on deep plum with hanging diyas'],
  ['pardaa', 'Pardaa', 'पर्दा', 'Red velvet curtains part on a dressed mandap with a living fire; each ceremony in its own colours.', 'red and gold velvet curtains tied back around a marigold-dressed mandap'],
  ['rajdwar', 'Rajdwar', 'राजद्वार', 'A painted gold palace gate tied with a satin bow; untie it and walk through onto the red-and-gold Mangal card.', 'a painted gold palace gate with Ganesh on its crest, tied with an ivory satin bow'],
  ['agni', 'Agni', 'अग्नि', 'The sacred fire at night: the fire catches on a tap, then the couple walk the seven rounds and the vows appear.', 'a brass havan kunda with a living fire under Ganesh'],
  ['janti', 'Janti', 'जन्ती', 'The janti strikes up: walk with the Naumati Baja and the doli down an old Newari street to the bride’s door.', 'the Naumati Baja and a red doli in a golden Newari street'],
  ['swayambar', 'Swayambar', 'स्वयम्बर', 'Two fresh garlands swing apart on the jaimala; the bride’s and groom’s sides come together as you scroll.', 'the bride and groom exchanging marigold garlands'],
  ['sindoor', 'Sindoor', 'सिन्दूर', 'Minimal red, white and black: the sindoor box opens in a bloom of red and a parting line threads the story.', 'a red-and-gold sindoor box on white with a red line-drawn Ganesh'],
  ['rangoli', 'Rangoli', 'रंगोली', 'A flower rangoli on a courtyard brick floor: its rings assemble, the centre diyo lights, and the floor tells the day.', 'a round marigold and rose rangoli on a brick courtyard with lit diyos'],
].map(([slug, name, ne, concept, alt]) => ({ slug, name, ne, concept, alt, thumb: `/themes/${slug}/thumb.jpg`, demo: `/${slug}/` }));

export const BY_SLUG = Object.fromEntries(THEMES.map((t) => [t.slug, t]));
// Nepali names for designs that the API lists but the static fallback does not carry yet
export const NE_NAMES = { rajdwar: 'राजद्वार' };

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];
/** 22 -> 'twenty-two' (falls back to digits beyond 59) */
export function countWord(n) {
  if (n < 20) return WORDS[n];
  if (n < 60) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${WORDS[n % 10]}` : '');
  return String(n);
}

// Shown only when GET /api/site is unavailable; the admin edits the real plans in the studio.
export const FALLBACK_SITE = {
  plans: [
    { id: 'classic', name: 'Classic', price: null, currency: 'NPR', note: '', features: [], highlight: false },
    { id: 'premium', name: 'Premium', price: null, currency: 'NPR', note: '', features: [], highlight: true },
    { id: 'custom', name: 'Custom', price: null, currency: 'NPR', note: '', features: [], highlight: false },
  ],
  contact: { phone: '', whatsapp: '', email: '', address: '' },
  hero: { title: '', subtitle: '' },
  hiddenThemes: [],
  featuredThemes: [],
};
