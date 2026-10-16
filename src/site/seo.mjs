// Search and share meta for every public page: <title>, description, canonical, robots, hreflang, Open Graph,
// Twitter card and a WebPage JSON-LD node. The `head` partial (src/site/partials.mjs) renders it from <!--@head:<id>-->
// (design pages: <!--@head:design/<slug>-->); credits uses <!--@meta:credits-->. Share images live in public/site/og/
// (1200x630 JPG). Titles: Title Case, primary keyword first, brand last, at most 60 characters; descriptions 140-158.
// Plain module: Node runs it at build, never the browser.
import { THEMES, BY_SLUG, FALLBACK_SITE, planForTier } from './themes.js';
import { SITE_URL } from './content.mjs';

const N = THEMES.length;
const rs = (n) => `Rs ${new Intl.NumberFormat('en-IN').format(n)}`;

/** Capitalise the first letter of every word; brand words keep their own case (eSewa). Devanagari is unchanged. */
const KEEP = new Set(['eSewa']);
export const titleCase = (s) => s.split(/(\s+)/).map((w) => (KEEP.has(w.replace(/[^\w-]/g, '')) ? w : w.replace(/^([("']?)([a-z])/, (m, p, c) => p + c.toUpperCase()))).join('');

/** Main pages. `img` is the share image in public/site/og/, `type` the schema.org page type. */
export const PAGES = {
  home: {
    path: '/', img: 'home', type: 'WebPage', ogType: 'website',
    title: 'Online Invitation Maker Nepal: Wedding Websites | Nimtto',
    desc: 'Nimtto is the online invitation maker for Nepal: wedding invitation websites and e-cards for bratabandha, pasni and more, with RSVP. From Rs 2,999. Start now.',
    alt: 'Nimtto online invitation maker: three wedding invitation designs on phones, in white and blush',
  },
  designs: {
    path: '/designs/', img: 'designs', type: 'CollectionPage', ogType: 'website',
    title: `Wedding Invitation Designs: ${N} Nepali Digital Cards | Nimtto`,
    desc: `Browse ${N} wedding invitation designs for Nepali weddings: doors, wax seals, flower gates and 3D scenes that open like real cards. From Rs 2,999. See them now.`,
    alt: `${N} Nimtto wedding invitation designs on phones: a sealed envelope, a temple door and a garden pavilion`,
  },
  occasions: {
    path: '/occasions/', img: 'occasions', type: 'CollectionPage', ogType: 'website',
    title: 'Bratabandha, Pasni And Gunyu Cholo Invitation Cards | Nimtto',
    desc: 'Online invitation cards for bratabandha, pasni, gunyu cholo, nwaran, engagement and bhoj, in English and Nepali with RSVP and maps. Ask for your design today.',
    alt: 'Nimtto invitations for every Nepali occasion: bratabandha, pasni and gunyu cholo, beside an invitation on a phone',
  },
  'how-it-works': {
    path: '/how-it-works/', img: 'how-it-works', type: 'WebPage', ogType: 'article',
    title: 'How To Make An Online Wedding Invitation In Nepal | Nimtto',
    desc: 'How to make an online wedding invitation in Nepal: choose a design, pay by Khalti, eSewa or PayPal, we build it with you on WhatsApp. Share one link.',
    alt: 'The four Nimtto steps, choose, order and pay, make it together and share one link, beside an invitation on a phone',
  },
  features: {
    path: '/features/', img: 'features', type: 'WebPage', ogType: 'website',
    title: 'E-Invitation Nepal: RSVP, Nepali Dates And Music | Nimtto',
    desc: 'Every Nimtto e-invitation has Bikram Sambat and AD dates, English and Nepali, each ceremony with a map, guest RSVP, your song and photos. See all features.',
    alt: 'A Nimtto e-invitation on a phone with a Nepali date, guest replies and music',
  },
  pricing: {
    path: '/pricing/', img: 'pricing', type: 'WebPage', ogType: 'website',
    title: 'Online Invitation Card Price Nepal: From Rs 2,999 | Nimtto',
    desc: 'Online invitation card prices in Nepal: Saral Rs 2,999, Shubha Rs 4,999, Shahi Rs 6,999, custom from Rs 11,111. Pay once by Khalti, eSewa or PayPal.',
    alt: 'Nimtto prices: Saral Rs 2,999, Shubha Rs 4,999 and Shahi Rs 6,999, paid once, beside an invitation on a phone',
  },
  contact: {
    path: '/contact/', img: 'contact', type: 'ContactPage', ogType: 'website',
    title: 'Contact Us: Wedding Invitation Help On WhatsApp | Nimtto',
    desc: 'Contact Nimtto about an online wedding invitation or a bratabandha or pasni card. WhatsApp or call +977 980-6393298 or email. We reply in English or Nepali.',
    alt: 'Contact Nimtto on WhatsApp at +977 980-6393298, beside a wedding invitation on a phone',
  },
  credits: {
    path: '/credits/', img: 'home', type: 'WebPage', ogType: 'website',
    title: 'Credits: Photos, Flowers, Art And Music Licences | Nimtto',
    desc: 'Credits for the photographs, flowers, art and music used in Nimtto\'s online wedding invitation designs, with each author and licence. Thanks to every creator.',
    alt: 'Nimtto online invitation maker: three wedding invitation designs on phones, in white and blush',
  },
};

/** One line per design for its description (plain English); `{p}` is the plan price the design starts at. */
const LEAD = {
  kham: 'Kham online wedding invitation: a paper envelope with a red wax seal opens into a clear card of every event. RSVP and Nepali dates, from {p}. Preview it.',
  dhoka: 'Dhoka wedding invitation design: the golden door of Patan opens in 3D to show your names on a white card. RSVP and Nepali dates, from {p}. See it open.',
  mala: 'Mala wedding invitation design: red silk, marigold strings and brass kalash frame your mandap. An online card with RSVP and Nepali dates, from {p}.',
  durbar: 'Durbar online wedding invitation: a 3D morning walk through Bhaktapur Durbar Square under flower arches. RSVP and Nepali dates, from {p}. Preview it.',
  gurans: 'Phoolbari wedding invitation design: a gate of fresh roses and marigold opens on शुभ विवाह, then a calm card with RSVP. From {p}. See it open.',
  dhaka: 'Dhaka online wedding invitation: break the wax seal, slide off the Dhaka band and your names rise among flowers. RSVP and Nepali dates, from {p}.',
  sayapatri: 'Sayapatri wedding invitation design: marigold strings lift from a doorway to open a calm ivory card with RSVP and maps. From {p}. Preview it now.',
  himal: 'Himal online wedding invitation: sunrise over the Himalaya, then a quiet photo story of the two of you, with RSVP and Nepali dates. From {p}. Preview it.',
  chitra: 'Chitra wedding invitation design: a Mithila art picture book of the janti, the garlands and the seven rounds. RSVP and Nepali dates, from {p}. See it.',
  mandap: 'Mandap online wedding invitation: a 3D mandap on a bright morning where the couple exchange garlands and walk seven rounds. With RSVP, from {p}.',
  bagaicha: 'Bagaicha wedding invitation design: a 3D garden wedding through a rose arch, around the sacred fire, on to the reception. With RSVP, from {p}.',
  ghar: 'Ghar online wedding invitation: a warm evening walk through a Newar house, room by room, like a film. Every event and RSVP, from {p}. Preview it.',
  mangal: 'Mangal wedding invitation design: a red temple door with garlands and bells swings open on शुभ विवाह. An online card with RSVP, from {p}. See it open.',
  nimantrana: 'Nimantrana online wedding invitation: a red and gold card unfolds in 3D with Ganesh, the couple and the programme. With RSVP, from {p}. Preview it.',
  jhyal: 'Jhyal wedding invitation design: the shutters of a carved Newari window open on शुभ विवाह. An online card with RSVP and maps, from {p}. See it open.',
  mahal: 'Mahal online wedding invitation: untie the satin bow and a golden palace gate opens onto a balcony at night. RSVP and Nepali dates, from {p}. See it.',
  laali: 'Laali wedding invitation design: blush pink and gold, with lanterns that drop in as an arched card draws itself. RSVP and Nepali dates, from {p}.',
  mehendi: 'Mehendi online wedding invitation: a henna pattern draws itself on ivory, then two hennaed hands come together. RSVP and Nepali dates, from {p}.',
  hariyo: 'Hariyo wedding invitation design: green watercolour leaves part to show a white pavilion and two peacocks. An online card with RSVP, from {p}. See it.',
  shree: 'Shree online wedding invitation: deep plum and gold, where a gold lotus opens on Ganesh as two diyas come down. RSVP and Nepali dates, from {p}.',
  pardaa: 'Pardaa wedding invitation design: red velvet curtains open on a mandap with a living fire, each event in its own colours. With RSVP, from {p}. See it.',
  rajdwar: 'Rajdwar online wedding invitation: untie the bow and walk through a painted gold palace gate to a red and gold card. RSVP and Nepali dates, from {p}.',
  agni: 'Agni wedding invitation design: tap to light the sacred fire at night, then the couple walk the seven rounds. An online card with RSVP, from {p}. See it.',
  janti: "Janti online wedding invitation: walk with the Naumati Baja band and the doli down an old Newari street to the bride's door. With RSVP, from {p}.",
  swayambar: 'Swayambar wedding invitation design: two fresh garlands swing apart and both families come together as you scroll. RSVP and Nepali dates, from {p}.',
  sindoor: 'Sindoor online wedding invitation: red, white and black, the sindoor box opens and a red line carries your story. RSVP and Nepali dates, from {p}.',
  rangoli: 'Rangoli wedding invitation design: a flower rangoli on a brick courtyard comes together and the diyo lights up. An online card with RSVP, from {p}.',
};
/** the second half of a design title, by category (the longest that keeps the title within 60 characters) */
const CAT_TAIL = { flowers: ['Floral Online Card', 'Floral E-Card'], doors: ['Opening Door Card', 'Door E-Card'], cards: ['Digital Card', 'E-Card'], film: ['Cinematic Online Card', 'Cinematic E-Card', 'Film E-Card'] };

export function designMeta(slug) {
  const t = BY_SLUG[slug];
  if (!t) throw new Error(`seo: no design ${slug}`);
  const plan = planForTier(FALLBACK_SITE.plans, t.tier);
  const base = `${t.name} Wedding Invitation Design`;
  const title = [...CAT_TAIL[t.cat], null].map((x) => (x ? `${base}: ${x} | Nimtto` : `${base} | Nimtto`)).find((s) => s.length <= 60);
  return {
    path: `/designs/${slug}/`, img: `design-${slug}`, type: 'ItemPage', ogType: 'product',
    title, name: `${t.name} Wedding Invitation Design`,
    desc: (LEAD[slug] || `${t.name} online wedding invitation: ${t.concept} RSVP and Nepali dates, from {p}. Preview it now.`).replace('{p}', plan ? rs(plan.price) : 'Rs 2,999'),
    alt: `The ${t.name} online wedding invitation design by Nimtto on a phone: ${t.alt}`,
  };
}

/** the meta for a partial argument: a page id, or design/<slug> */
export function pageMeta(id = 'home') {
  const m = id.startsWith('design/') ? designMeta(id.slice(7)) : PAGES[id];
  if (!m) throw new Error(`seo: no page "${id}"`);
  return { ...m, title: titleCase(m.title), url: `${SITE_URL}${m.path}`, image: `${SITE_URL}/site/og/${m.img}.jpg` };
}
