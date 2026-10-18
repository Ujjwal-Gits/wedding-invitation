// The website's words that more than one page (and the build) uses: occasions, steps, features and the FAQ.
// Plain module: the Vite partials plugin (src/site/partials.mjs) renders it into static HTML and JSON-LD at build,
// so every answer is in the page source for search and answer engines. Plain English, short sentences.
// Plan names and prices in the FAQ are tokens ({plan:saral}, {price:saral}, {usd:saral}): the build writes the first
// names, and in the page's HTML they sit in data-plan-* spans that src/site/plans.js fills with the planner's names.
import { FALLBACK_SITE } from './themes.js';

export const SITE_URL = 'https://nimtto.com';

/** Occasions: `designs: true` has ready-made designs today; the rest are made for you (Custom plan).
 *  page: the occasion's own page (src/site/landings.mjs). */
export const OCCASIONS = [
  { id: 'wedding', en: 'Wedding', ne: 'शुभ विवाह', alt: 'बिहे', designs: true, line: '27 ready wedding card designs, with every ceremony from mehendi to reception.', key: 'wedding invitation card', page: '/wedding-invitation-nepal/' },
  { id: 'engagement', en: 'Engagement', ne: 'माग्नी', alt: 'टीका', line: 'The tika, the rings and the family lunch, in one link.', key: 'engagement invitation card', page: '/occasions/engagement/' },
  { id: 'bratabandha', en: 'Bratabandha', ne: 'ब्रतबन्ध', line: 'The sacred thread day, with the full programme and the feast.', key: 'bratabandha invitation card', page: '/occasions/bratabandha/' },
  { id: 'gunyu-cholo', en: 'Gunyu Cholo', ne: 'गुन्यू चोलो', line: 'A daughter’s first gunyu cholo, shared with the whole family.', key: 'gunyu cholo invitation', page: '/occasions/gunyu-cholo/' },
  { id: 'pasni', en: 'Pasni', ne: 'पास्नी', alt: 'अन्नप्राशन', line: 'Baby’s first rice, with photos and the time of the feast.', key: 'pasni invitation card', page: '/occasions/pasni/' },
  { id: 'nwaran', en: 'Nwaran', ne: 'न्वारन', line: 'The naming day. The new name appears as guests open it.', key: 'nwaran invitation card', page: '/occasions/nwaran/' },
  { id: 'birthday', en: 'Birthday', ne: 'जन्मदिन', line: 'Any age, from a first birthday to a chaurasi and beyond, in English and Nepali.', key: 'birthday invitation card', page: '/occasions/birthday/' },
  { id: 'janku', en: 'Janku', ne: 'जंकु', line: 'The Newar old-age rites that honour an elder, from Bhimratha on.', key: 'janku invitation card', page: '/occasions/janku/' },
  { id: 'bhoj', en: 'Bhoj and reception', ne: 'भोज', line: 'A reception or family feast, with a map and replies for numbers.', key: 'reception invitation card', page: '/occasions/reception-bhoj/' },
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
  what: ['What is Nimtto?', 'Nimtto (निम्तो, “invitation” in Nepali) is an online wedding invitation maker from Nepal. We make digital wedding cards and invitation websites for weddings, bratabandha, pasni, gunyu cholo and other family occasions. Your guests open one link on their phone and see every event, the date in Nepali and English, a map, your photos and a reply form.'],
  how: ['How do I make an online wedding card in Nepal?', 'Choose a design on Nimtto, fill the short order form and pay by QR. We then message you on WhatsApp for your names, dates, photos and song, and send you the finished link to share.'],
  cost: ['How much does an online wedding invitation cost in Nepal?', 'A Nimtto invitation website costs {price:saral} ({plan:saral}), {price:shubha} ({plan:shubha}) or {price:shahi} ({plan:shahi}). A custom design made only for you starts at {price:custom}. From abroad you can pay in US dollars by PayPal, from {usd:saral}.'],
  pay: ['How do I pay?', 'From abroad, you pay by card or PayPal on the payment page, and your plan switches on at once. In Nepal, you pay by Khalti, eSewa or any bank app by scanning the QR with your order number, then upload a screenshot and we confirm it.'],
  time: ['How long does it take?', 'We start as soon as your payment is confirmed and we have your details. A ready-made design is quicker than a custom one. Tell us your date when you order and we plan around it.'],
  nepali: ['Can the wedding invitation be in Nepali (नेपाली)?', 'Yes. Every invitation works in English and Nepali, and guests switch with one tap. Dates show in Bikram Sambat and AD side by side.'],
  occasions: ['Do you make invitations for bratabandha, pasni and other occasions?', 'Yes. Besides weddings, we make invitation websites for engagement, bratabandha, gunyu cholo, pasni, nwaran, birthdays, janku, bhoj and receptions, and any family occasion. These are designed for you on the Custom plan.'],
  rsvp: ['Can guests RSVP to an online wedding invitation?', 'Yes. Guests tell you if they are coming, to which events and how many people. You read every reply in your own dashboard and can download the list.'],
  change: ['Can I change details after the invitation is shared?', 'Yes. The link stays the same and changes show at once. You can update times, venues and photos from your dashboard, or message us and we change it for you.'],
  app: ['Do guests need to install an app?', 'No. The invitation is a website. It opens in any phone browser from WhatsApp, Viber, Messenger or SMS, also on slow mobile data.'],
  abroad: ['Can family abroad see it and pay from abroad?', 'Yes. The invitation opens anywhere in the world, and you can pay in US dollars by card or PayPal.'],
  difference: ['What is the difference between {plan:saral}, {plan:shubha} and {plan:shahi}?', 'The plans differ in which designs and extras they include. {plan:saral} has 7 designs and all the basics. {plan:shubha} adds 8 more designs, photos, every ceremony with maps and music. {plan:shahi} includes every design, personal guest links and priority help.'],
  custom: ['What is a custom design?', 'A custom design is a new invitation made only for you, with your colours, art and wording. It suits any occasion, not only weddings. It starts at {price:custom}: tell us your idea in the order form and we reply within one business day with a price.'],
  account: ['Why do I make an account when I order?', 'Your account lets you come back to your order, pay later, and later edit your invitation and read guest replies. You sign in with your email and the password you choose.'],
  where: ['Where is Nimtto based?', 'Nimtto is made in Nepal and serves Nepali families in Nepal and around the world. We talk to you on WhatsApp in English or Nepali.'],
  esewa: ['Can I pay with eSewa or Khalti?', 'Yes. On the payment page, scan the QR with Khalti, eSewa or any bank app (Fonepay), with your order number in the remark. Then upload the payment screenshot and we confirm it, usually the same day. From abroad, pay by card or PayPal in US dollars.'],
  whatsapp: ['Can I send a digital wedding card on WhatsApp and Viber?', 'Yes. Your invitation is one link: share it on WhatsApp, Viber, Messenger or SMS. The preview shows your names and a picture. Guests open it in their phone browser, with no app, and everyone sees the same up-to-date details.'],
  outside: ['Do you serve outside Kathmandu?', 'Yes. Nimtto works online across Nepal: Kathmandu, Lalitpur, Bhaktapur, Pokhara, Butwal, Chitwan, Dharan, Biratnagar, Birgunj and everywhere else. We make your invitation with you on WhatsApp, and you pay by QR, so it does not matter where you live.'],
  acceptable: ['Is an e-invitation card acceptable for a Nepali wedding?', 'Yes. More Nepali families now send their invitation on WhatsApp or Viber, often with a few printed cards for elders. Guests like having the date, the venue and a map on their phone, and relatives abroad can open it anywhere.'],
  wording: ['What should I write on a Nepali wedding card (बिहेको कार्ड)?', 'Most cards open with a blessing, name the couple and both sets of parents, give the date in Bikram Sambat with the day and the AD date, the sait of the main rite, each ceremony with its time and venue, and the preetibhoj. They close with the hosts after निमन्त्रक or विनीत. Our Nepali wedding card page has samples in Nepali and English.'],
  when: ['When should I send wedding invitation cards in Nepal?', 'We suggest sending the online card three to four weeks before the wedding to guests in Nepal, and six to eight weeks before to relatives abroad, who need time to travel. Order your design a few weeks before that, so there is time for changes.'],
  bs: ['Can the date be in Bikram Sambat?', 'Yes. Every invitation shows the date in Bikram Sambat beside the AD date, with the day of the week, so elders and friends abroad read the same day. If your family uses the tithi or Nepal Sambat, tell us and we add it.'],
  print: ['Can I also print cards?', 'Yes. Many families send the online card to everyone and take a few printed cards to close elders by hand. Nimtto makes the online invitation; a local press can print matching cards if you show them your design.'],
  guests: ['Is there a limit on guests?', 'No. You pay once for your plan and can send the link to as many guests as you like, in Nepal and abroad. There is no charge per guest and no charge per reply.'],
  online: ['How long does the invitation stay online?', 'Your invitation stays online for at least one year after the event date, so guests can look back at the details and photos. If you would like it online for longer, ask us.'],
  privacy: ['Who can see my invitation and the replies?', 'Only the people you send the link to can open your invitation; we do not list it anywhere. Guest replies are shown only to you and our team. We never sell your data, and you can ask us to delete it at any time.'],
  refund: ['Can I get a refund?', 'Payments are final. In a critical case you can ask us, and we may approve a full or partial refund. If anything is wrong with your invitation, we fix it for you free. Our refund policy page has the details.'],
};

export const FAQ = {
  home: ['what', 'cost', 'rsvp', 'whatsapp', 'acceptable', 'time', 'esewa', 'occasions', 'outside', 'when'],
  designs: ['difference', 'nepali', 'bs', 'app', 'change', 'custom', 'print'],
  occasions: ['occasions', 'custom', 'time', 'nepali', 'cost', 'abroad'],
  how: ['how', 'time', 'when', 'pay', 'account', 'change', 'whatsapp', 'wording'],
  features: ['rsvp', 'nepali', 'bs', 'app', 'change', 'abroad', 'privacy', 'online'],
  pricing: ['cost', 'difference', 'guests', 'esewa', 'abroad', 'custom', 'account', 'refund', 'outside'],
  contact: ['where', 'time', 'pay', 'abroad', 'outside'],
  design: ['difference', 'how', 'change', 'app'],
  // the FAQ page: every question, in groups
  faq: [
    ['About Nimtto', ['what', 'where', 'outside', 'occasions', 'custom']],
    ['Price and payment', ['cost', 'difference', 'guests', 'esewa', 'pay', 'abroad', 'refund']],
    ['Making and sharing', ['how', 'time', 'when', 'account', 'change', 'whatsapp']],
    ['Wording and dates', ['wording', 'bs', 'nepali', 'print']],
    ['For your guests', ['acceptable', 'rsvp', 'app', 'privacy', 'online']],
  ],
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
export const faqItemsOf = (keys) => keys.filter((k) => Q[k]).map((k) => ({ q: fillPlans(Q[k][0]), a: fillPlans(Q[k][1]), qHtml: fillPlans(Q[k][0], true), aHtml: fillPlans(Q[k][1], true) }));
export const faqItems = (set) => (Array.isArray(FAQ[set]?.[0]) ? faqItemsOf(FAQ[set].flatMap(([, keys]) => keys)) : faqItemsOf(FAQ[set] || []));
