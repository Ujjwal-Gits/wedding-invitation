// The international site's words, in ONE place: every main page's search title, description, H1 and summary, the
// occasions list and the FAQ. src/site/seo.mjs reads the meta and src/site/intl.mjs renders the rest. The landing
// pages (occasions, Nepali and South Asian weddings, RSVP, USA) live in src/site/landings.mjs.
// Keyword map: docs/SEO-KEYWORDS.md. Plain US English, short sentences. Only what the product does today: weddings
// have ready-made designs; every other occasion is designed for you on the Custom plan (an enquiry: we reply with a
// price). No religion labels on the international site.
// Prices are tokens ({usd:saral}): the build writes today's dollar price, and in the page they sit in
// data-usd-from spans that src/site/intl.js refreshes from GET /api/site.
// Titles: Title Case (seo.mjs applies it), primary keyword first, at most 60 characters. Descriptions: at most 155.
import { FALLBACK_SITE } from './themes.js';
import { intlPlans, usdText } from './intl-plans.js';

export const INTL_BASE = '/international/';
const PLANS = intlPlans(FALLBACK_SITE.plans);
const usdOf = (id) => PLANS.find((p) => p.id === id)?.usd ?? 0;
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TOKEN = /\{usd:([a-z0-9-]+)\}/g;
/** Fills {usd:<plan>}: plain text, or escaped HTML with the data-usd-from spans the page refreshes. */
export function fillUsd(s, html = false) {
  let out = '';
  let at = 0;
  for (const m of String(s).matchAll(TOKEN)) {
    const v = usdText(usdOf(m[1]));
    const lit = s.slice(at, m.index);
    out += html ? `${escHtml(lit)}<span data-usd-from="${m[1]}">${v}</span>` : lit + v;
    at = m.index + m[0].length;
  }
  const rest = s.slice(at);
  return out + (html ? escHtml(rest) : rest);
}

/* ---------------- the main pages: meta + page head ----------------
   id -> { path, title, desc, img (public/site/og/<img>.jpg), alt, type, ogType, np (the Nepal page it pairs with,
   cross-linked), eyebrow, h1 (HTML: <em> allowed), lede (the 40-60 word summary search and answer engines read) } */
export const INTL_PAGES = {
  'intl/home': {
    path: INTL_BASE, img: 'intl-home', type: 'WebPage', ogType: 'website', np: 'home', speak: true,
    title: 'Animated Wedding Invitation Website With RSVP | Nimtto',
    desc: 'One link for your animated invitation, event site and RSVP, made with a real designer. Pay once from $49. US, UK, Canada, Australia, UAE.',
    alt: 'Nimtto animated wedding invitation website: the Olive Grove invitation on a phone among other designs',
    eyebrow: 'Weddings and every celebration',
    h1: 'Your invitation, event website and RSVP, <em>in one link.</em>',
    lede: 'Weddings first, and every party after. Pick a design and a real designer makes it yours: an animated invitation, a page with every detail and RSVPs, in one link you send by text or email. Paid once, from {usd:saral}.',
  },
  'intl/designs': {
    path: `${INTL_BASE}designs/`, img: 'intl-designs', type: 'CollectionPage', ogType: 'website', np: 'designs',
    title: 'Animated Wedding Invitation Designs | Nimtto',
    desc: 'Browse animated wedding invitation designs in five styles: garden, romantic, classic, modern and destination. Each with RSVP and a website. From $49.',
    alt: 'Nimtto animated wedding invitation designs on phones: an olive wreath, a rose arch and a wax seal',
    eyebrow: 'Designs',
    h1: 'Animated invitation designs, <em>made with you.</em>',
    lede: 'Every design opens like a real card and comes with a matching event website and RSVP. Narrow them down by style, then order the one you love, and a real designer sets it up with you. Want something else? We design one for your occasion.',
  },
  'intl/occasions': {
    path: `${INTL_BASE}occasions/`, img: 'intl-occasions', type: 'CollectionPage', ogType: 'website', np: 'occasions',
    title: 'Digital Invitations for Every Occasion, With RSVP | Nimtto',
    desc: 'Digital invitations with RSVP for weddings, birthdays of any age, baby and bridal showers, engagements, anniversaries, graduations and company events.',
    alt: 'Nimtto digital invitations for weddings, birthdays, showers, anniversaries and more',
    eyebrow: 'Occasions',
    h1: 'Every celebration <em>deserves an invitation.</em>',
    lede: 'Weddings have ready-made designs. For birthdays of any age, baby and bridal showers, engagement parties, anniversaries, graduations, housewarmings, dinners and company events, we design an invitation for your occasion, with an event page and RSVP.',
  },
  'intl/features': {
    path: `${INTL_BASE}features/`, img: 'intl-features', type: 'WebPage', ogType: 'website', np: 'features',
    title: 'Wedding RSVP Website Features: Maps, Music, Travel | Nimtto',
    desc: 'A wedding RSVP website in your invitation: replies per event, the schedule with maps, travel and hotels, your story, your song and a live stream link.',
    alt: 'A Nimtto wedding RSVP website on a phone with the schedule, RSVP and music',
    eyebrow: 'Features',
    h1: 'More than a card. <em>A whole event page.</em>',
    lede: 'Your invitation opens like a real card, then guests scroll down for the schedule, maps, travel notes and the RSVP. You read every reply in your dashboard and download the list. There is no app for anyone.',
  },
  'intl/how': {
    path: `${INTL_BASE}how-it-works/`, img: 'intl-how', type: 'WebPage', ogType: 'article', np: 'how-it-works',
    title: 'How to Make a Digital Wedding Invitation | Nimtto',
    desc: 'How to make a digital wedding invitation: pick a design, pay once by card or PayPal, a real designer sets it up, then send one link by text or email.',
    alt: 'The four Nimtto steps beside a digital wedding invitation on a phone',
    eyebrow: 'How it works',
    h1: 'How to make a digital invitation, <em>in four steps.</em>',
    lede: 'You pick a design and pay once, a real designer sets everything up with you, and you send one link by text or email. Guests reply in a minute, with no app. Your invitation is in your dashboard as soon as payment is confirmed.',
  },
  'intl/pricing': {
    path: `${INTL_BASE}pricing/`, img: 'intl-pricing', type: 'WebPage', ogType: 'website', np: 'pricing',
    title: 'Digital Wedding Invitation Cost: $49 to $199 | Nimtto',
    desc: 'Transparent one-time pricing: $49, $99, $149, custom from $199. No subscription. Card or PayPal.',
    alt: 'Nimtto prices: three plans at $49, $99 and $149, paid once',
    eyebrow: 'Pricing',
    h1: 'One price. <em>Paid once.</em>',
    lede: 'A Nimtto digital invitation costs {usd:saral}, {usd:shubha} or {usd:shahi}, paid once in US dollars by card or PayPal. There are no monthly fees, no subscriptions and no charge per guest. A design made just for your occasion starts at {usd:custom}.',
  },
  'intl/faq': {
    path: `${INTL_BASE}faq/`, img: 'intl-faq', type: 'WebPage', ogType: 'website', np: 'faq', speak: true,
    title: 'Digital Invitation FAQ: RSVP, Cost and Timing | Nimtto',
    desc: 'Answers about digital invitations: how guests RSVP, what it costs, if it is a subscription, timing, refunds, privacy and the occasions we design.',
    alt: 'Questions and answers about Nimtto digital invitations',
    eyebrow: 'FAQ',
    h1: 'Questions, <em>answered.</em>',
    lede: 'Short, clear answers about how Nimtto works, what it costs, how guests reply and how we look after your details. Can’t find yours? Email us and a real person replies, usually within one business day.',
  },
  'intl/contact': {
    path: `${INTL_BASE}contact/`, img: 'intl-contact', type: 'ContactPage', ogType: 'website', np: 'contact',
    title: 'Contact Nimtto: Talk to an Invitation Designer',
    desc: 'Email nimttoz@gmail.com or WhatsApp +977 980-6393298 about a design, a custom invitation or a payment. A real designer replies within one business day.',
    alt: 'Contact Nimtto by email at nimttoz@gmail.com',
    eyebrow: 'Contact',
    h1: 'Hello. <em>Let’s talk.</em>',
    lede: 'Questions about a design, a custom invitation or a payment? Email us, or message us on WhatsApp. A real person replies, usually within one business day.',
  },
};

/* ---------------- occasions: the list (home, occasions page, order form) ----------------
   page: the landing page (src/site/landings.mjs) when there is one; id: the order form's occasion value. */
export const EVENTS = [
  { id: 'wedding', en: 'Weddings', line: 'Ready-made designs, each with a matching wedding website and RSVP.', lead: true, page: 'i-wedding' },
  { id: 'birthday', en: 'Birthdays', line: 'Any age, from a first birthday to a 90th.', page: 'i-birthday' },
  { id: 'baby-shower', en: 'Baby showers', line: 'Showers, sprinkles and gender reveals.', page: 'i-baby-shower' },
  { id: 'bridal-shower', en: 'Bridal showers', line: 'Brunch, games and gifts, all in one link.', page: 'i-bridal' },
  { id: 'engagement', en: 'Engagement parties', line: 'Celebrate the big news with friends and family.', page: 'i-engagement' },
  { id: 'anniversary', en: 'Anniversaries', line: 'Milestone years and vow renewals.', page: 'i-anniversary' },
  { id: 'graduation', en: 'Graduations', line: 'Caps off, party on.', page: 'i-graduation' },
  { id: 'housewarming', en: 'Housewarmings', line: 'New keys, new address, a map to your door.', page: 'i-housewarming' },
  { id: 'dinner', en: 'Dinner parties', line: 'A table for friends, with the menu and the RSVP.', page: 'i-dinner' },
  { id: 'corporate', en: 'Company and community events', line: 'Launches, galas, reunions and fundraisers.', page: 'i-corporate' },
  { id: 'rehearsal', en: 'Rehearsal dinners', line: 'The night before, with who’s invited.' },
  { id: 'custom', en: 'Your own celebration', line: 'Something else in mind? Tell us about it.' },
];

/* ---------------- FAQ: the first sentence always answers the question (40-60 words) ---------------- */
const Q = {
  site: ['What is a digital invitation website?', 'A digital invitation website is an invitation guests open on their phone, with a page of every detail behind it. With Nimtto it opens like a real card, then shows the schedule, maps, travel notes, your story and an RSVP form, all in one link you send by text or email.'],
  what: ['What is Nimtto?', 'Nimtto makes animated invitations with a matching event website and RSVPs. You pick a design, and a real designer sets it up with you. Guests open one link on their phone to see the details, the schedule, maps and a reply form. Weddings come first, and we design for every other celebration too.'],
  occasions: ['What occasions do you make invitations for?', 'Weddings have ready-made designs. For engagement parties, birthdays of any age, baby and bridal showers, anniversaries, graduations, housewarmings, dinner parties and company or community events, we design an invitation for your occasion on the Custom plan, from {usd:custom}.'],
  'rsvp-app': ['How do guests RSVP? Do they need an app?', 'Guests open your link in any phone or computer browser and reply in about a minute: who is coming, to which events and how many. There is no app to install, no account and no password. You see every reply in your dashboard and can download the guest list at any time.'],
  send: ['How do I send an online invitation?', 'Copy your link and send it any way you like: text message, email, WhatsApp, Instagram or Messenger. Your names and a picture show in the link preview. Everyone with the link sees the same up-to-date invitation, so you only send it once.'],
  change: ['Can I change details after I send it?', 'Yes. Change a time, a place or a photo whenever you need to. The link stays the same, and every guest sees the new details right away. You can edit from your dashboard, or tell us what to change and we update it for you.'],
  cost: ['How much does a digital wedding invitation cost?', 'A Nimtto digital invitation costs {usd:saral} (Standard), {usd:shubha} (Pro) or {usd:shahi} (Pro Max), paid once. A design made just for your occasion starts at {usd:custom}. There are no monthly fees and no charge per guest, so you can send it to as many people as you like.'],
  subscription: ['Is it a subscription?', 'No. You pay once for your plan, in US dollars, and that is all. There is no monthly fee, no subscription to cancel and no charge per guest. Your invitation stays online for at least one year after your event date.'],
  pay: ['How do I pay?', 'You pay once, in US dollars, by card or PayPal on PayPal’s secure checkout. We never see your card number. As soon as the payment goes through, your plan switches on and your invitation appears in your dashboard, ready for your details.'],
  time: ['How long does it take?', 'Your invitation appears in your dashboard as soon as your payment is confirmed. Our design help usually takes 1 to 3 business days once we have your details. A design made just for you takes longer, so tell us your date and we plan around it.'],
  diy: ['How is Nimtto different from a DIY invitation site?', 'You don’t have to build anything. A real designer sets up your invitation and event website with you, and you check every change before guests see it. You still get the tools you need: RSVP tracking, a guest list download and changes at any time.'],
  online: ['How long does my invitation stay online?', 'Your invitation stays online for at least one year after your event date, so guests can look back at the details and photos. If you need it online longer, just ask us.'],
  timezones: ['What about guests in other time zones?', 'Every time shows in the venue’s local time, so nobody is confused about when to arrive. Guests can add each event to their own calendar with one tap, and their calendar shows it in their own time.'],
  refund: ['Can I get a refund?', 'Payments are final. In a critical case you can ask us, and we may approve a full or partial refund. If anything is wrong with your invitation, we fix it for you. Our refund policy page has the details.'],
  privacy: ['Is my guests’ information private?', 'Yes. We never sell your data. Guest replies are shown only to you and our team, and we use them only to run your invitation. Payments go through PayPal, so we never see card numbers. You can ask us to delete your data at any time.'],
  custom: ['What is a custom design?', 'A custom design is a brand-new invitation made just for you, with your colors, art and words. It works for any occasion, not only weddings, and starts at {usd:custom}. Send us your idea and we reply within one business day with a price.'],
  multi: ['Can I add multiple events?', 'Yes. One link can hold the whole weekend: welcome drinks, the ceremony, the reception and a farewell brunch, each with its own time, place and map. Guests reply to each event, so you know the numbers for every part of the day.'],
  contact: ['How do I reach Nimtto?', 'Email us at nimttoz@gmail.com, or message us on WhatsApp at +977 980-6393298. A real person replies, usually within one business day. Our team is based in Nepal and works with couples and hosts around the world.'],
  etiquette: ['Are digital wedding invitations acceptable?', 'Yes. Many couples now send digital wedding invitations, and guests like having the details, maps and RSVP on their phone. Send them six to eight weeks before the wedding. For a few older relatives, you can also print a card or ask family to help them open the link.'],
};

/** Which questions each page shows (FAQPage JSON-LD follows the same list). */
export const FAQ_SETS = {
  home: ['site', 'cost', 'subscription', 'rsvp-app', 'multi', 'occasions', 'diy', 'time'],
  designs: ['occasions', 'custom', 'change', 'rsvp-app', 'cost'],
  design: ['change', 'rsvp-app', 'multi', 'timezones', 'time', 'cost'], // a design's own page
  occasions: ['occasions', 'custom', 'multi', 'time', 'cost'],
  features: ['rsvp-app', 'change', 'multi', 'timezones', 'privacy', 'online'],
  how: ['time', 'pay', 'diy', 'change', 'send', 'etiquette'],
  pricing: ['cost', 'subscription', 'pay', 'custom', 'refund', 'online'],
  contact: ['contact', 'time', 'pay', 'refund'],
  // the FAQ page: every general question, in groups
  faq: [
    ['About Nimtto', ['what', 'site', 'occasions', 'diy', 'custom']],
    ['For your guests', ['rsvp-app', 'send', 'multi', 'timezones', 'etiquette']],
    ['Prices and payment', ['cost', 'subscription', 'pay', 'refund']],
    ['Timing and changes', ['time', 'change', 'online']],
    ['Privacy and help', ['privacy', 'contact']],
  ],
};

/** A list of question keys as { k, q, a (plain), aHtml } (prices filled). */
export const faqList = (keys) => keys.filter((k) => Q[k]).map((k) => ({ k, q: Q[k][0], a: fillUsd(Q[k][1]), aHtml: fillUsd(Q[k][1], true) }));

/* ---------------- how it works (home) ---------------- */
export const STEPS = [
  { t: 'Pick a design', d: 'Choose a wedding design you love, or ask for one made just for your occasion.' },
  { t: 'Pay once', d: 'Pay by card or PayPal, in US dollars. No monthly fees.' },
  { t: 'Send us your details', d: 'Names, times, places, photos and your song. We set it all up, and you check every change.' },
  { t: 'Share your link', d: 'Send it by text or email. Replies come straight to your dashboard.' },
];
