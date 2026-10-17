// The website's words that more than one page (and the build) uses: occasions, steps, features and the FAQ.
// Plain module: the Vite partials plugin (src/site/partials.mjs) renders it into static HTML and JSON-LD at build,
// so every answer is in the page source for search and answer engines. Plain English, short sentences.
// Plan names and prices in the FAQ are tokens ({plan:saral}, {price:saral}, {usd:saral}): the build writes the first
// names, and in the page's HTML they sit in data-plan-* spans that src/site/plans.js fills with the planner's names.
import { FALLBACK_SITE } from './themes.js';

export const SITE_URL = 'https://nimtto.com';

/** Occasions: `designs: true` has ready-made designs today; the rest are made for you (Custom plan). */
export const OCCASIONS = [
  { id: 'wedding', en: 'Wedding', ne: 'शुभ विवाह', alt: 'बिहे', designs: true, line: '27 ready designs, with every ceremony from mehendi to reception.', key: 'wedding invitation card' },
  { id: 'engagement', en: 'Engagement', ne: 'माग्नी', alt: 'टीका', line: 'The tika, the rings and the family lunch, in one link.', key: 'engagement invitation card' },
  { id: 'bratabandha', en: 'Bratabandha', ne: 'ब्रतबन्ध', line: 'The sacred thread day, with the full programme and the feast.', key: 'bratabandha invitation card' },
  { id: 'gunyu-cholo', en: 'Gunyu Cholo', ne: 'गुन्यू चोलो', line: 'A daughter’s first gunyu cholo, shared with the whole family.', key: 'gunyu cholo invitation' },
  { id: 'pasni', en: 'Pasni', ne: 'पास्नी', alt: 'अन्नप्राशन', line: 'Baby’s first rice, with photos and the time of the feast.', key: 'pasni invitation card' },
  { id: 'nwaran', en: 'Nwaran', ne: 'न्वारान', line: 'The naming day. The new name appears as guests open it.', key: 'nwaran invitation card' },
  { id: 'birthday', en: 'Birthday', ne: 'जन्मदिन', line: 'From a first birthday to an 84th, in English and Nepali.', key: 'birthday invitation card' },
  { id: 'janku', en: 'Janku', ne: 'जंकु', line: 'The Newar old-age rites that honour an elder, from Bhimratha on.', key: 'janku invitation card' },
  { id: 'bhoj', en: 'Bhoj and reception', ne: 'भोज', line: 'A reception or family feast, with a map and replies for numbers.', key: 'reception invitation card' },
  { id: 'custom', en: 'Your own occasion', ne: 'आफ्नै अवसर', line: 'Griha pravesh, a puja, an anniversary. Designed for you.', key: 'custom invitation' },
];

export const STEPS = [
  { t: 'Choose a design', d: 'Pick one of our designs, or ask for one made only for you. Open the preview and see it move first.' },
  { t: 'Order and pay', d: 'Make your account, then fill a short form with your plan, design and WhatsApp. Pay by Khalti, eSewa, bank QR or PayPal.' },
  { t: 'We make it with you', d: 'We message you on WhatsApp for names, dates, photos and your song. You see every change.' },
  { t: 'Share one link', d: 'Send the link on WhatsApp, Viber or Messenger. Guests open it, see every event and reply.' },
];

export const FEATURES = [
  { id: 'dates', t: 'Nepali and English dates', d: 'Bikram Sambat and AD side by side, so elders and friends abroad read the same day.' },
  { id: 'lang', t: 'English and Nepali, one tap', d: 'Guests switch the whole invitation between English and नेपाली.' },
  { id: 'events', t: 'Every ceremony', d: 'Mehendi, haldi, janti, the wedding and the reception. Each with time, place and a map.' },
  { id: 'rsvp', t: 'Guest replies', d: 'Guests say who is coming and to which event. You read every reply in your own dashboard.' },
  { id: 'music', t: 'Your song', d: 'Your chosen song plays as the invitation opens. Guests can turn it off.' },
  { id: 'opening', t: 'An opening to remember', d: 'Doors open, a seal breaks, flowers part. Every design has its own moment.' },
  { id: 'photos', t: 'Photos and your story', d: 'A gallery of your photos and a few lines about the two of you.' },
  { id: 'share', t: 'A link that looks good', d: 'Your names and picture show in the WhatsApp preview. No app to install.' },
  { id: 'faiths', t: 'For every family', d: 'Hindu, Muslim, Christian and mixed families get their own events and words.' },
];

/* ---------------- FAQ: the first sentence always answers the question ---------------- */
const Q = {
  what: ['What is Nimtto?', 'Nimtto is an online invitation maker from Nepal. We make invitation websites for weddings, bratabandha, pasni, gunyu cholo and other family occasions. Your guests open one link on their phone and see every event, the date in Nepali and English, a map, your photos and a reply form.'],
  how: ['How do I make an online wedding invitation in Nepal?', 'Choose a design on Nimtto, fill the short order form and pay by QR. We then message you on WhatsApp for your names, dates, photos and song, and send you the finished link to share.'],
  cost: ['How much does a digital wedding card cost in Nepal?', 'A Nimtto invitation website costs {price:saral} ({plan:saral}), {price:shubha} ({plan:shubha}) or {price:shahi} ({plan:shahi}). A custom design made only for you starts at {price:custom}. From abroad you can pay in US dollars by PayPal, from {usd:saral}.'],
  pay: ['How do I pay?', 'From abroad, you pay by card or PayPal on the payment page, and your plan switches on at once. In Nepal, you pay by Khalti, eSewa or any bank app by scanning the QR with your order number, then upload a screenshot and we confirm it.'],
  time: ['How long does it take?', 'We start as soon as your payment is confirmed and we have your details. A ready-made design is quicker than a custom one. Tell us your date when you order and we plan around it.'],
  nepali: ['Can the invitation be in Nepali?', 'Yes. Every invitation works in English and Nepali, and guests switch with one tap. Dates show in Bikram Sambat and AD side by side.'],
  occasions: ['Do you make invitations for bratabandha, pasni and other occasions?', 'Yes. Besides weddings, we make invitation websites for engagement, bratabandha, gunyu cholo, pasni, nwaran, birthdays, janku, bhoj and receptions, and any family occasion. These are designed for you on the Custom plan.'],
  rsvp: ['Can guests reply to the invitation?', 'Yes. Guests tell you if they are coming, to which events and how many people. You read every reply in your own dashboard and can download the list.'],
  change: ['Can I change details after the invitation is shared?', 'Yes. The link stays the same and changes show at once. You can update times, venues and photos from your dashboard, or message us and we change it for you.'],
  app: ['Do guests need to install an app?', 'No. The invitation is a website. It opens in any phone browser from WhatsApp, Viber, Messenger or SMS, also on slow mobile data.'],
  abroad: ['Can family abroad see it and pay from abroad?', 'Yes. The invitation opens anywhere in the world, and you can pay in US dollars by card or PayPal.'],
  difference: ['What is the difference between {plan:saral}, {plan:shubha} and {plan:shahi}?', 'The plans differ in which designs and extras they include. {plan:saral} has 7 designs and all the basics. {plan:shubha} adds 8 more designs, photos, every ceremony with maps and music. {plan:shahi} includes every design, personal guest links and priority help.'],
  custom: ['What is a custom design?', 'A custom design is a new invitation made only for you, with your colours, art and wording. It suits any occasion, not only weddings. It starts at Rs 11,111 and we talk it through with you before we begin.'],
  account: ['Why do I make an account when I order?', 'Your account lets you come back to your order, pay later, and later edit your invitation and read guest replies. You sign in with your email and the password you choose.'],
  where: ['Where is Nimtto based?', 'Nimtto is made in Nepal and serves Nepali families in Nepal and around the world. We talk to you on WhatsApp in English or Nepali.'],
};

export const FAQ = {
  home: ['what', 'how', 'cost', 'occasions', 'nepali', 'rsvp', 'app', 'time'],
  designs: ['difference', 'nepali', 'app', 'change', 'custom'],
  occasions: ['occasions', 'custom', 'time', 'nepali', 'cost'],
  how: ['how', 'time', 'pay', 'account', 'change'],
  features: ['rsvp', 'nepali', 'app', 'change', 'abroad'],
  pricing: ['cost', 'difference', 'pay', 'abroad', 'custom', 'account'],
  contact: ['where', 'time', 'pay', 'abroad'],
  design: ['difference', 'how', 'change', 'app'],
};

const npr = new Intl.NumberFormat('en-IN');
const PLAN = Object.fromEntries(FALLBACK_SITE.plans.map((p) => [p.id, p]));
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TOKEN = /\{(plan|price|usd):([a-z0-9-]+)\}/g;
const ATTR = { plan: 'data-plan-name', price: 'data-plan-price', usd: 'data-plan-usd' };
/** Fills the plan tokens: plain text, or escaped HTML with the data-plan-* spans the page updates live. */
export function fillPlans(s, html = false) {
  let out = '';
  let at = 0;
  for (const m of s.matchAll(TOKEN)) {
    const p = PLAN[m[2]];
    const v = !p ? '' : m[1] === 'plan' ? p.name : m[1] === 'price' ? `Rs ${npr.format(p.price)}` : `USD ${p.priceUsd}`;
    const lit = s.slice(at, m.index);
    out += html ? `${escHtml(lit)}<span ${ATTR[m[1]]}="${m[2]}">${escHtml(v)}</span>` : lit + v;
    at = m.index + m[0].length;
  }
  const rest = s.slice(at);
  return out + (html ? escHtml(rest) : rest);
}
/** A page's questions: q and a as plain text (JSON-LD), qHtml and aHtml as escaped HTML with live plan names. */
export const faqItems = (set) => (FAQ[set] || []).map((k) => ({ q: fillPlans(Q[k][0]), a: fillPlans(Q[k][1]), qHtml: fillPlans(Q[k][0], true), aHtml: fillPlans(Q[k][1], true) }));
