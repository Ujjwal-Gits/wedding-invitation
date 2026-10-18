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
    title: 'Digital Wedding Invitation in Nepal With RSVP | Nimtto',
    desc: 'Animated wedding invitation website with RSVP, maps and Nepali dates, made with a real designer. Pay once from Rs 2,999 by eSewa, Khalti or bank QR.',
    alt: 'Nimtto digital wedding invitations for Nepal: three invitation designs on phones, in white and blush',
  },
  designs: {
    path: '/designs/', img: 'designs', type: 'CollectionPage', ogType: 'website',
    title: 'Nepali Wedding Card Designs and Animated Invites | Nimtto',
    desc: `Browse ${N} premium Nepali wedding card designs with animation, music and RSVP. Pick one and our designer personalises it for you. From Rs 2,999, paid once.`,
    alt: `${N} Nimtto Nepali wedding card designs on phones: a sealed envelope, a temple door and a garden pavilion`,
  },
  occasions: {
    path: '/occasions/', img: 'occasions', type: 'CollectionPage', ogType: 'website',
    title: 'Invitation Cards for Every Nepali Occasion | Nimtto',
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
    title: 'Wedding RSVP Website and Invitation Features | Nimtto',
    desc: 'RSVP tracking, every ceremony with Google Maps, Bikram Sambat and AD dates, English and Nepali, music and photos, all in one invitation link on WhatsApp.',
    alt: 'A Nimtto wedding RSVP website on a phone with a Nepali date, guest replies and music',
  },
  pricing: {
    path: '/pricing/', img: 'pricing', type: 'WebPage', ogType: 'website',
    title: 'Digital Invitation Price in Nepal From Rs 2,999 | Nimtto',
    // no plan names here: the planner renames plans in the studio, and meta tags are only built, never refreshed
    desc: 'Plans at Rs 2,999, Rs 4,999 and Rs 6,999, custom designs from Rs 11,111. Pay once by Khalti, eSewa or bank QR, or PayPal from abroad. No monthly fee.',
    alt: 'Nimtto prices: three plans at Rs 2,999, Rs 4,999 and Rs 6,999, paid once, beside an invitation on a phone',
  },
  faq: {
    path: '/faq/', img: 'faq', type: 'WebPage', ogType: 'website', speak: true,
    title: 'Digital Wedding Card FAQ for Nepal: Price and RSVP | Nimtto',
    desc: 'Answers on price, eSewa and Khalti payment, timing, changes, RSVP, wording and sharing on WhatsApp for Nepali digital invitations, and guests abroad.',
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

/** The legal pages: one neutral set for both sites (market 'both'). */
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

/** An international design's page (/international/designs/<slug>/): the style in the title, the US dollar price in
 *  the description. Its share image is public/site/og/intl-design-<slug>.jpg (scripts/og-list.mjs). */
const STYLE_WORD = { garden: 'Garden', romantic: 'Romantic', classic: 'Classic', modern: 'Modern', destination: 'Destination' };
export function intlDesignMeta(slug) {
  const d = INTL_BY_SLUG[slug];
  if (!d) throw new Error(`seo: no international design ${slug}`);
  const p = intlPlans(FALLBACK_SITE.plans).find((x) => x.id === d.tier);
  const from = p ? usdText(p.usd) : '$49';
  const kind = `${STYLE_WORD[d.style] || 'Animated'} Wedding Invitation`;
  const title = [`${d.name}: Animated ${kind} | Nimtto`, `${d.name}: ${kind} | Nimtto`].find((x) => x.length <= 60);
  const desc = [`${d.name} animated wedding invitation: ${d.line} With an event website and RSVP, from ${from}, paid once.`,
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
  for (const id of ALL_PAGE_IDS) {
    const m = pageMeta(id);
    if (m.title.length > 60) out.push(`${id}: title ${m.title.length} > 60: ${m.title}`);
    if (m.desc.length > 155) out.push(`${id}: description ${m.desc.length} > 155`);
    if (seen.has(m.title)) out.push(`${id}: same title as ${seen.get(m.title)}`);
    seen.set(m.title, id);
  }
  return out;
}
