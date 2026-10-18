// Site-wide search settings that are not page copy: who we are (name, address, contact: the same everywhere), the
// public profiles the organisation links to, the owner's own details for the About pages, which pages of the two
// sites are true equivalents (hreflang), the html lang per site, the About pages' meta and the blog author.
// The page words live in seo.mjs / content.mjs / intl-content.mjs / landings.mjs; this file holds facts.
// Plain module: Node runs it at build, never the browser.
import { SITE_URL } from './content.mjs';

/* ---------------- name, address, contact (NAP): one source for every page, llms.txt and JSON-LD ---------------- */
export const NAP = {
  name: 'Nimtto',
  nameNe: 'निम्तो',
  email: 'nimttoz@gmail.com',
  phone: '+977 980-6393298', // as shown
  tel: '+977-980-6393298', // schema.org / E.164 with dashes
  wa: '9779806393298', // wa.me/<number>
  country: 'NP',
  countryName: 'Nepal',
  languages: ['English', 'Nepali'],
  replies: 'usually within one business day',
};

/**
 * TODO(owner): the organisation's real public profiles, as full https URLs. Only profiles that exist and that you
 * control (Instagram, Facebook page, TikTok, YouTube, LinkedIn page, Pinterest, a Google Business Profile link ...).
 * They go into Organization.sameAs on every page; an empty list adds nothing. Never add a profile that is not ours.
 */
export const SAME_AS = [
  // 'https://www.instagram.com/<handle>/',
  // 'https://www.facebook.com/<page>/',
];

/**
 * TODO(owner): the person behind Nimtto, for the About pages (E-E-A-T: a real, named person people can check).
 * Leave a field null and that part is not shown (nothing is invented). photo: a square JPG/WebP in public/site/team/
 * (at least 400x400), e.g. '/site/team/owner.jpg'. story: one or two short paragraphs, plain text.
 * sameAs: the owner's own public profiles (LinkedIn ...), only if they want them linked.
 */
export const OWNER = {
  name: null, // 'First Last'
  role: null, // 'Founder and designer'
  photo: null, // '/site/team/owner.jpg'
  story: null, // 'I started Nimtto in ...'
  sameAs: [],
};

/** Founded year, if the owner wants it shown (Organization.foundingDate). TODO(owner): e.g. '2026'. */
export const FOUNDED = null;

/* ---------------- the blog author (B's blog links articles to this) ---------------- */
export const TEAM_URL = `${SITE_URL}/about/#team`;
/** schema.org author for every article signed "Nimtto Team": `author: AUTHOR_LD` in a BlogPosting. */
export const AUTHOR_LD = { '@type': 'Organization', '@id': TEAM_URL, name: 'Nimtto Team', url: TEAM_URL, parentOrganization: { '@id': `${SITE_URL}/#org` } };
/** the same team on the international site's About page (articles under /international/blog/ link here) */
export const TEAM_URL_INTL = `${SITE_URL}/international/about/#team`;

/* ---------------- languages and equivalents ---------------- */
/** <html lang> per site: Nepal English (with Nepali phrases marked lang="ne"), American English abroad. */
export const HTML_LANG = { np: 'en-NP', intl: 'en-US', both: 'en' };

/**
 * True equivalents: the same page for the other market (prices in rupees or dollars, Nepal or worldwide). Only these
 * pairs carry hreflang (en-NP -> Nepal, en -> international, x-default -> international). Landing pages, design pages
 * and occasion pages target different searches on each site and stand alone (docs/SEO-KEYWORDS.md).
 * Nepal page id -> international page id.
 */
export const EQUIVALENTS = {
  home: 'intl/home',
  designs: 'intl/designs',
  occasions: 'intl/occasions',
  'how-it-works': 'intl/how',
  features: 'intl/features',
  pricing: 'intl/pricing',
  faq: 'intl/faq',
  contact: 'intl/contact',
  about: 'intl/about',
};

/* ---------------- the About pages' meta (rendered by the head partial like every other page) ---------------- */
export const TRUST_PAGES = {
  about: {
    path: '/about/', img: 'home', type: 'AboutPage', ogType: 'website', market: 'np',
    title: 'About Nimtto: Online Invitations Made in Nepal',
    desc: 'Who we are and how we work: Nimtto, based in Nepal, designs animated invitation websites with RSVP for Nepali weddings and family occasions.',
    alt: 'Nimtto online invitations for Nepal: three invitation designs on phones, in white and blush',
  },
  'intl/about': {
    path: '/international/about/', img: 'intl-home', type: 'AboutPage', ogType: 'website', market: 'intl',
    title: 'About Nimtto: Designer-Made Digital Invitations',
    desc: 'Who makes Nimtto invitations and how we work with couples and hosts worldwide: a real designer, one payment in US dollars and a reply within one day.',
    alt: 'Nimtto animated digital invitations on phones',
  },
};
