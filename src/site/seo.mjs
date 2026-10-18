// Search and share meta for every public page of both sites: <title>, description, canonical, robots, hreflang,
// Open Graph, Twitter card and a WebPage JSON-LD node. The `head` partial (src/site/partials.mjs) renders it from
// <!--@head:<id>-->: a Nepal page id, design/<slug>, intl-design/<slug>, intl/<page> (src/site/intl-content.mjs), land/<id> (the landing
// pages in src/site/landings.mjs) or a legal page. Share images live in public/site/og/ (1200x630 JPG).
// Titles: Title Case, primary keyword first, at most 60 characters; descriptions at most 155 (checkLengths warns).
// The two sites (nimtto.com for Nepal, /international/) never target the same primary keyword: they are separate
// sites that cross-link, not hreflang twins. Keyword map: docs/SEO-KEYWORDS.md.
// Plain module: Node runs it at build, never the browser.
import { THEMES, BY_SLUG, FALLBACK_SITE, planForTier } from './themes.js';
import { SITE_URL } from './content.mjs';
import { INTL_PAGES } from './intl-content.mjs';
import { LANDINGS } from './landings.mjs';
import { INTL_THEMES, INTL_BY_SLUG } from './intl-designs.js';
import { intlPlans, usdText } from './intl-plans.js';
import { TRUST_PAGES } from './seo-site.mjs';

const N = THEMES.length;
const rs = (n) => `Rs ${new Intl.NumberFormat('en-IN').format(n)}`;

/** Title Case: every word capitalised except short joining words (a, and, for, in, of, the, to ...) inside the title;
 *  brand words keep their own case (eSewa). Devanagari is unchanged. */
const KEEP = new Set(['eSewa']);
const MINOR = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'the', 'to', 'vs']);
export const titleCase = (s) => {
  let first = true;
  return s.split(/(\s+)/).map((w) => {
    if (/^\s+$/.test(w) || !w) return w;
    const bare = w.replace(/[^\w-]/g, '');
    const out = KEEP.has(bare) ? w
      : !first && MINOR.has(bare.toLowerCase()) ? w.toLowerCase()
        : w.replace(/^([("']?)([a-z])/, (m, p, c) => p + c.toUpperCase());
    first = /[:|]$/.test(w) || w === '|'; // a word after a colon or the brand bar starts again
    return out;
  }).join('');
};

/** The Nepal site's main pages. `img` is the share image in public/site/og/, `type` the schema.org page type.
 *  `speak`: a SpeakableSpecification on the WebPage node (home and FAQ only). */
export const PAGES = {
  home: {
    path: '/', img: 'home', type: 'WebPage', ogType: 'website', speak: true,
    title: 'Nimtto: Online Wedding Invitation Card in Nepal With RSVP',
    desc: 'Nimtto makes online wedding invitation cards in Nepal: a digital wedding card with RSVP, maps and Nepali dates in one link. Pay once from Rs 2,999.',
    alt: 'Nimtto online wedding invitation cards for Nepal: three digital wedding card designs on phones, in white and blush',
  },
  designs: {
    path: '/designs/', img: 'designs', type: 'CollectionPage', ogType: 'website',
    title: `Wedding Card Designs: ${N} Animated Nepali Templates | Nimtto`,
    desc: `${N} Nepali wedding card designs that open like a real card: doors, wax seals, flower gates and 3D films. Each with RSVP and Nepali dates. From Rs 2,999.`,
    alt: `${N} Nimtto Nepali wedding card designs on phones: a sealed envelope, a temple door and a garden pavilion`,
  },
  occasions: {
    path: '/occasions/', img: 'occasions', type: 'CollectionPage', ogType: 'website',
    title: 'Online Invitation Cards for Nepali Ceremonies | Nimtto',
    desc: 'Online invitation cards for maagni, bratabandha, gunyo cholo, pasni, nwaran, birthdays, janku and bhoj, in English and Nepali with RSVP and maps.',
    alt: 'Nimtto invitations for every Nepali occasion: bratabandha, pasni and gunyu cholo, beside an invitation on a phone',
  },
  'how-it-works': {
    path: '/how-it-works/', img: 'how-it-works', type: 'WebPage', ogType: 'article',
    title: 'How to Make a Digital Wedding Invitation in Nepal | Nimtto',
    desc: 'Choose a design, pay once by eSewa, Khalti or bank QR, review it with your designer on WhatsApp, then send one link to every guest. Ready in days.',
    alt: 'The four Nimtto steps, choose, order and pay, make it together and share one link, beside an invitation on a phone',
  },
  features: {
    path: '/features/', img: 'features', type: 'WebPage', ogType: 'website',
    title: 'Wedding Website With RSVP for Nepal: Features | Nimtto',
    desc: 'A wedding website inside your invitation: RSVP per ceremony, Google Maps, Bikram Sambat and AD dates, English and Nepali, music and photos, in one link.',
    alt: 'A Nimtto wedding RSVP website on a phone with a Nepali date, guest replies and music',
  },
  pricing: {
    path: '/pricing/', img: 'pricing', type: 'WebPage', ogType: 'website',
    title: 'Digital Wedding Card Price in Nepal From Rs 2,999 | Nimtto',
    // no plan names here: the planner renames plans in the studio, and meta tags are only built, never refreshed
    desc: 'Plans at Rs 2,999, Rs 4,999 and Rs 6,999, custom designs from Rs 11,111. Pay once by Khalti, eSewa or bank QR, or PayPal from abroad. No monthly fee.',
    alt: 'Nimtto prices: three plans at Rs 2,999, Rs 4,999 and Rs 6,999, paid once, beside an invitation on a phone',
  },
  faq: {
    path: '/faq/', img: 'faq', type: 'WebPage', ogType: 'website', speak: true,
    title: 'E-Invitation FAQ for Nepal: Cost, RSVP and Wording | Nimtto',
    desc: 'What an e-invitation costs in Nepal, paying by eSewa or Khalti, timing, RSVP, Nepali card wording and sharing on WhatsApp or Viber, answered in short.',
    alt: 'Questions and answers about Nimtto digital invitations in Nepal',
  },
  contact: {
    path: '/contact/', img: 'contact', type: 'ContactPage', ogType: 'website',
    title: 'Contact Nimtto to Order a Digital Invitation in Nepal',
    desc: 'Talk to a designer on WhatsApp or email. Tell us your date and we suggest a design. WhatsApp +977 980-6393298, in English or Nepali. We reply in a day.',
    alt: 'Contact Nimtto on WhatsApp at +977 980-6393298, beside a wedding invitation on a phone',
  },
  credits: {
    path: '/credits/', img: 'home', type: 'WebPage', ogType: 'website',
    title: 'Credits: Photos, Flowers, Art and Music Licences | Nimtto',
    desc: 'Credits for the photographs, flowers, art and music used in Nimtto\'s online wedding invitation designs, with each author, source and licence named.',
    alt: 'Nimtto online invitation maker: three wedding invitation designs on phones, in white and blush',
  },
};

/** The legal pages: the Nepal site's (here) and the international site's twins (below). */
export const LEGAL = {
  terms: {
    path: '/terms/', img: 'home', type: 'WebPage', ogType: 'website', market: 'both',
    title: 'Terms of Service | Nimtto',
    desc: 'The terms for Nimtto online invitations: your account, orders and payment, what we deliver and when, your content and how long invitations stay online.',
    alt: 'Nimtto terms of service',
  },
  privacy: {
    path: '/privacy/', img: 'home', type: 'WebPage', ogType: 'website', market: 'both',
    title: 'Privacy Policy | Nimtto',
    desc: 'What Nimtto collects (name, email, phone, event details, photos, guest replies), why, who processes it, that we never sell it, and how to delete it.',
    alt: 'Nimtto privacy policy',
  },
  refunds: {
    path: '/refunds/', img: 'home', type: 'WebPage', ogType: 'website', market: 'both',
    title: 'Refund Policy | Nimtto',
    desc: 'Nimtto refund policy: payments are final. In a critical case you can ask for a refund, and we may approve a full or partial one.',
    alt: 'Nimtto refund policy',
  },
};
// the same pages on the international site (its header, footer and colours; make-landing-pages.mjs writes them)
for (const [k, m] of Object.entries({ ...LEGAL })) {
  m.market = 'np';
  LEGAL[`intl-${k}`] = { ...m, path: `/international${m.path}`, market: 'intl', title: m.title.replace('| Nimtto', '| Nimtto International') };
}

/** Each design's search title (before " | Nimtto") and description. The title leads with the design's name, then a
 *  real search phrase matched to how the design looks, varied across designs so each page covers its own query
 *  (online wedding card, Nepali wedding card design, digital wedding invitation, e-card, wedding invitation video,
 *  biha card ...). The description says what it looks like and does, the benefit, a price hook (`{p}`: the plan price
 *  it starts at) and a call to action. Keyword map: docs/SEO-KEYWORDS.md. */
const DESIGN_SEO = {
  kham: ['Kham Envelope Online Wedding Card With Wax Seal', 'A paper envelope with a red wax seal opens into a clean card of every event. RSVP, maps and Nepali dates, shared on WhatsApp. From {p}. Preview it.'],
  dhoka: ['Dhoka 3D Door Wedding Invitation, Patan Style', 'The golden door of Patan swings open in 3D to show your names. Every ceremony with a map, RSVP and BS dates, on any phone. From {p}. See it open.'],
  mala: ['Mala Marigold Mandap Nepali Wedding Card', 'A mandap of red silk, marigold strings and brass kalash frames your names. Nepali dates, maps and RSVP in one WhatsApp link. From {p}. Preview it.'],
  durbar: ['Durbar Square 3D Wedding Invitation Video', 'Walk through Bhaktapur Durbar Square at dawn, like a short film, to your wedding programme. RSVP, maps and BS dates. From {p}. Watch it play.'],
  gurans: ['Phoolbari Flower Gate Wedding E-Card', 'A gate of fresh roses and marigold opens on शुभ विवाह, then a calm card with every event, maps and RSVP. Send it on Viber or WhatsApp. From {p}.'],
  dhaka: ['Dhaka Envelope Wedding E-Invitation for Every Faith', 'Break the seal and slide off the Dhaka band; your names rise among flowers. RSVP and Nepali dates, for weddings of every faith. From {p}. Preview it.'],
  sayapatri: ['Sayapatri Marigold Doorway Digital Wedding Card', 'Marigold strings lift from a doorway to open a calm ivory wedding card. Every ceremony with Google Maps, RSVP and BS dates. From {p}. Preview it.'],
  himal: ['Himal Mountain Sunrise Photo Wedding Invitation', 'Sunrise over Machhapuchhre, then a photo story of the two of you. Nepali dates, maps and RSVP, easy for guests abroad. From {p}. Preview it now.'],
  chitra: ['Chitra Mithila Art Wedding Invitation Card', 'A Mithila art picture book of the janti, the garlands and the seven rounds. An online biha card with RSVP and Nepali dates. From {p}. See it.'],
  mandap: ['Mandap 3D Animated Wedding Invitation, Seven Rounds', 'A bright 3D mandap where the couple exchange garlands and walk the seven rounds. RSVP, maps and BS dates in one link. From {p}. Watch it play.'],
  bagaicha: ['Bagaicha 3D Garden Wedding Invitation', 'A 3D garden wedding: through a rose arch, around the sacred fire, on to the reception. RSVP and a map for each event. From {p}. Preview it now.'],
  ghar: ['Ghar Newari House Cinematic Wedding Invitation', 'An evening walk through a Newar house, room by room, like a film. Every event with time, place and RSVP, shared on WhatsApp. From {p}. Preview it.'],
  mangal: ['Mangal Temple Door Shubha Bibaha Card Online', 'A red temple door hung with garlands and bells swings open on शुभ विवाह. Nepali dates, maps and guest replies in one link. From {p}. See it open.'],
  nimantrana: ['Nimantrana Traditional Red and Gold Biha Card', 'A traditional red and gold wedding card that unfolds in 3D: Ganesh, the couple, then the programme. With RSVP and BS dates. From {p}. Preview it.'],
  jhyal: ['Jhyal Newari Window Nepali Wedding Card Design', 'The shutters of a carved Newari window open on शुभ विवाह. A Nepali wedding card with every ceremony, maps and RSVP. From {p}. See it open.'],
  mahal: ['Mahal Royal Palace Gate Wedding Invitation', 'Untie the satin bow and a golden palace gate opens onto a night balcony. A royal wedding invitation with RSVP and Nepali dates. From {p}. See it.'],
  laali: ['Laali Blush Pink Digital Wedding Invitation Nepal', 'Blush pink and gold: lanterns drop in as an arched card draws itself. A digital wedding invitation with RSVP, maps and BS dates. From {p}. Preview it.'],
  mehendi: ['Mehendi Henna Wedding Invitation Card Online', 'A henna pattern draws itself on ivory, then two hennaed hands meet. Mehendi, haldi and the wedding, each with a map and RSVP. From {p}. See it.'],
  hariyo: ['Hariyo Green Watercolour Wedding Card With Peacocks', 'Green watercolour leaves part to show a white pavilion and two peacocks. A fresh online wedding card with RSVP and Nepali dates. From {p}. See it.'],
  shree: ['Shree Ganesh Wedding Card in Plum and Gold', 'Deep plum and gold: a gold lotus opens on Ganesh as two diyas come down. Every ceremony, RSVP and BS dates in one link. From {p}. Preview it.'],
  pardaa: ['Pardaa Curtain Reveal Wedding Invitation Online', 'Red velvet curtains open on a mandap with a living fire, each event in its own colours. Maps, RSVP and Nepali dates. From {p}. See it open.'],
  rajdwar: ['Rajdwar Gold Palace Gate Nepali Wedding Card', 'Untie the bow and walk through a painted gold palace gate to a red and gold card. RSVP, maps and BS dates, sent on WhatsApp. From {p}. See it.'],
  agni: ['Agni Sacred Fire Animated Wedding Invitation', 'Tap to light the sacred fire at night, then the couple walk the seven rounds. An animated wedding card with RSVP and maps. From {p}. Watch it play.'],
  janti: ['Janti Procession Wedding Invitation Video', 'Walk with the Naumati Baja band and the doli down an old Newari street to the bride’s door. Every event with RSVP. From {p}. Watch it play.'],
  swayambar: ['Swayambar Garland Wedding Invitation With RSVP', 'Two fresh garlands swing apart and both families come together as you scroll. Guests RSVP to each ceremony, with Nepali dates. From {p}. Preview it.'],
  sindoor: ['Sindoor Red and White Wedding E-Card', 'Red, white and black: the sindoor box opens and a red line carries your story. A wedding e-card with RSVP and BS dates. From {p}. Preview it now.'],
  mohar: ['Mohar Royal Seal Wedding Invitation, 3D Unfolding', 'Press a brass seal into red lac and a royal decree unfolds page by page in 3D. RSVP register, maps and BS dates. From {p}. See it open.'],
  kalapi: ['Kalapi Peacock Pichwai Wedding Invitation Online', 'A peacock fans its tail, then a painted pichwai of the monsoon scrolls by. Every ceremony, RSVP and Nepali dates. From {p}. See it open.'],
  rangoli: ['Rangoli Flower and Diyo Wedding Invitation Card', 'A flower rangoli on a brick courtyard comes together and the diyo lights up. Every ceremony with maps and RSVP. From {p}. Preview it now.'],
  sarovar: ['Sarovar Swan Lake Animated Wedding Invitation', 'A lotus opens on a living lake at dawn, two swans meet, and each ceremony rises on a stone post. RSVP, maps and BS dates. From {p}. Preview it.'],
};
/** A short keyword phrase per category, for the design page's eyebrow and the line after its summary. */
export const CAT_KEYWORD = { flowers: 'floral online wedding card', doors: 'Nepali wedding card that opens like a door', cards: 'digital wedding card', film: 'wedding invitation that plays like a video' };

/** a new design without a DESIGN_SEO entry yet: the second half of its title, by category (the longest within 60) */
const CAT_TAIL = { flowers: ['Floral Online Card', 'Floral E-Card'], doors: ['Opening Door Card', 'Door E-Card'], cards: ['Digital Card', 'E-Card'], film: ['Cinematic Online Card', 'Cinematic E-Card', 'Film E-Card'] };

export function designMeta(slug) {
  const t = BY_SLUG[slug];
  if (!t) throw new Error(`seo: no design ${slug}`);
  const plan = planForTier(FALLBACK_SITE.plans, t.tier);
  const base = `${t.name} Wedding Invitation Design`;
  const own = DESIGN_SEO[slug];
  const title = own ? `${own[0]} | Nimtto`
    : [...CAT_TAIL[t.cat], null].map((x) => (x ? `${base}: ${x} | Nimtto` : `${base} | Nimtto`)).find((s) => s.length <= 60);
  return {
    path: `/designs/${slug}/`, img: `design-${slug}`, type: 'ItemPage', ogType: 'product',
    title, name: `${t.name} Wedding Invitation Design`,
    desc: (own?.[1] || `${t.name} online wedding invitation: ${t.concept} RSVP and Nepali dates, from {p}. Preview it now.`).replace('{p}', plan ? rs(plan.price) : 'Rs 2,999'),
    alt: `The ${t.name} ${CAT_KEYWORD[t.cat] || 'online wedding card'} by Nimtto on a phone: ${t.alt}`,
  };
}

/** An international design's page (/international/designs/<slug>/): the style in the title, the US dollar price in
 *  the description. Its share image is public/site/og/intl-design-<slug>.jpg (scripts/og-list.mjs). */
const STYLE_WORD = { garden: 'Garden', romantic: 'Romantic', classic: 'Classic', modern: 'Modern', destination: 'Destination' };
/** Each international design's search title (before " | Nimtto") and description, US English, no religion words:
 *  the name first, then a US search phrase (wedding invitation website, digital or animated wedding invitation,
 *  online wedding invitation with RSVP, e-invite ...), varied across designs. `{p}`: the dollar price it starts at. */
const INTL_DESIGN_SEO = {
  'olive-grove': ['Olive Grove Animated Wedding Invitation With RSVP', 'A linen card opens and a watercolor olive wreath grows around your names. Your wedding website and RSVP in one link. From {p}, paid once. Preview it.'],
  'rose-arch': ['Rose Arch Garden Wedding Invitation Website', 'Guests walk through a stone arch of climbing roses into the garden, then find your schedule, maps and RSVP. From {p}, paid once. See it open.'],
  'blush-roses': ['Blush Roses Digital Wedding Invitation, Gold Frame', 'A thin gold frame draws itself as blush roses bloom in the corners. A classic digital invitation with RSVP and a wedding website. From {p}. Preview it.'],
  'gold-arch': ['Gold Arch Modern Online Wedding Invitation', 'A fine gold arch draws itself under an eight-point star on a clean page. A modern online invitation with RSVP, sent by text. From {p}. Preview it.'],
  amalfi: ['Amalfi Destination Wedding Invitation Website', 'A lemon-branch postcard from the Amalfi Coast turns over for your weekend by the sea, with travel, hotels and RSVP. From {p}, paid once. See it.'],
  'garden-party': ['Garden Party Wedding E-Invite With RSVP', 'A garden ceremony under a rose arbor: the invitation slides out of its paper band. Guests RSVP per event, no app. From {p}, paid once. Preview it.'],
  wildflower: ['Wildflower Meadow Animated Wedding Invitation', 'Pink and peach wildflowers grow up the page with butterflies. A summer wedding invitation with a website and RSVP. From {p}, paid once. See it.'],
  letterpress: ['Letterpress Classic Digital Wedding Invitation', 'A deckled cotton card lifts off sage linen and turns over. Simple, timeless and sent by text or email, with RSVP. From {p}, paid once. Preview it.'],
  'wax-seal': ['Wax Seal Envelope Online Wedding Invitation', 'Guests break a sage wax seal and your letter rises out of the envelope. An online invitation with RSVP and a website. From {p}, paid once. See it.'],
  tuscany: ['Tuscany Vineyard Destination Wedding Invite', 'Golden hour over the vineyard hills, with an invitation dressed like a wine label. Travel notes, hotels and RSVP in one link. From {p}. Preview it.'],
  noor: ['Noor Rose Arch Elegant Wedding Invitation Online', 'A sage arch hung with fresh roses glows open on your names. An elegant invitation with every event, maps and RSVP. From {p}, paid once. See it.'],
  jali: ['Jali Lattice and Lantern Digital Wedding Invitation', 'Carved emerald and gold lattice screens slide apart under hanging lanterns. A multi-event invitation with RSVP for each. From {p}. Preview it.'],
  andalus: ['Andalus Courtyard Destination Wedding Website', 'Step through a horseshoe arch into a tiled courtyard with a fountain and orange trees. Travel, schedule and RSVP in one link. From {p}. See it.'],
};
export function intlDesignMeta(slug) {
  const d = INTL_BY_SLUG[slug];
  if (!d) throw new Error(`seo: no international design ${slug}`);
  const p = intlPlans(FALLBACK_SITE.plans).find((x) => x.id === d.tier);
  const from = p ? usdText(p.usd) : '$49';
  const kind = `${STYLE_WORD[d.style] || 'Animated'} Wedding Invitation`;
  const own = INTL_DESIGN_SEO[slug];
  const title = own ? `${own[0]} | Nimtto` : [`${d.name}: Animated ${kind} | Nimtto`, `${d.name}: ${kind} | Nimtto`].find((x) => x.length <= 60);
  const desc = own ? own[1].replace('{p}', from) : [`${d.name} animated wedding invitation: ${d.line} With an event website and RSVP, from ${from}, paid once.`,
    `${d.name} wedding invitation: ${d.line} With RSVP, from ${from}.`, `${d.name} animated wedding invitation with RSVP, from ${from}, paid once.`].find((x) => x.length <= 155);
  return {
    path: `/international/designs/${slug}/`, img: `intl-design-${slug}`, type: 'ItemPage', ogType: 'product', market: 'intl',
    title, name: `${d.name} Wedding Invitation Design`, desc, eyebrow: `${STYLE_WORD[d.style] || 'Wedding'} design`,
    alt: `The ${d.name} animated wedding invitation by Nimtto on a phone: ${d.alt}`,
  };
}

/** The meta for a partial argument: a Nepal page id, design/<slug>, intl/<page>, land/<id> or a legal page.
 *  Adds market ('np' | 'intl' | 'both'), url, image and the Title Case title. */
export function pageMeta(id = 'home') {
  let m;
  if (id.startsWith('design/')) m = { ...designMeta(id.slice(7)), market: 'np' };
  else if (id.startsWith('intl-design/')) m = intlDesignMeta(id.slice(12));
  else if (id.startsWith('intl/') && INTL_PAGES[id]) m = { ...INTL_PAGES[id], market: 'intl' };
  else if (id.startsWith('land/')) m = LANDINGS[id.slice(5)] && { type: 'WebPage', ogType: 'website', speak: true, ...LANDINGS[id.slice(5)] };
  else if (LEGAL[id]) m = LEGAL[id];
  else if (TRUST_PAGES[id]) m = TRUST_PAGES[id]; // the About pages (seo-site.mjs)
  else m = PAGES[id] && { ...PAGES[id], market: 'np' };
  if (!m) throw new Error(`seo: no page "${id}"`);
  return { ...m, title: titleCase(m.title), url: `${SITE_URL}${m.path}`, image: `${SITE_URL}/site/og/${m.img}.jpg` };
}

/** Every public page id, for the sitemap, llms-full.txt and the length check. */
export const ALL_PAGE_IDS = [
  ...Object.keys(PAGES), ...Object.keys(INTL_PAGES), ...Object.keys(LANDINGS).map((k) => `land/${k}`), ...Object.keys(LEGAL),
  ...INTL_THEMES.map((d) => `intl-design/${d.slug}`), ...Object.keys(TRUST_PAGES),
];

/** Warnings for titles over 60 and descriptions over 155 characters, and for a primary title used twice. */
export function checkLengths() {
  const out = [];
  const seen = new Map();
  const descs = new Map();
  for (const id of [...ALL_PAGE_IDS, ...THEMES.map((t) => `design/${t.slug}`)]) {
    const m = pageMeta(id);
    if (descs.has(m.desc) && LEGAL[id]?.market !== 'intl') out.push(`${id}: same description as ${descs.get(m.desc)}`);
    descs.set(m.desc, id); // the international legal pages mirror the Nepal ones word for word
    if (m.title.length > 60) out.push(`${id}: title ${m.title.length} > 60: ${m.title}`);
    if (m.desc.length > 155) out.push(`${id}: description ${m.desc.length} > 155`);
    if (seen.has(m.title)) out.push(`${id}: same title as ${seen.get(m.title)}`);
    seen.set(m.title, id);
  }
  return out;
}
