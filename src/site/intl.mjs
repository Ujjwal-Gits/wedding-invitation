// The international home page (/intl-preview/, hidden: noindex, in no sitemap, linked from nowhere): the same
// sections and markup as the home page (src/site/partials.mjs), with international words, US dollar prices and the
// Christian-first invitation stills in public/site/intl/. Rendered by the same `site-partials` Vite plugin.
// Plain module: Node runs it at build, never the browser.
import { FALLBACK_SITE } from './themes.js';
import { intlPlans, usdText } from './intl-plans.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ARROW = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const CONTACT = { phone: '+977 980-6393298', wa: '9779806393298', email: 'nimttoz@gmail.com' };
const SITE = 'https://nimtto.com';

/* ---------------- the invitation stills (public/site/intl/<name>-<w>.webp, 390x844 screens at 3x) ---------------- */
export const SCREENS = {
  olive: { name: 'Olive', alt: 'an olive wreath in watercolour around the date', tier: 'shubha', tint: '#EAF1E7' },
  chapel: { name: 'Chapel', alt: 'a stone chapel arch under climbing garden roses', tier: 'shahi', tint: '#E6EFE3' },
  dove: { name: 'Dove', alt: 'a white dove with a gold olive branch on cotton paper', tier: 'saral', tint: '#EFF3EC' },
  garden: { name: 'Garden', alt: 'a garden ceremony with a rose arbor and white chairs', tier: 'shubha', tint: '#E3EEE2' },
  tuscany: { name: 'Tuscany', alt: 'vineyard hills and a small chapel at golden hour', tier: 'shubha', tint: '#F1F2EA' },
  seal: { name: 'Wax Seal', alt: 'a white envelope with a sage wax seal and a blush rose', tier: 'saral', tint: '#EBF0EA' },
  noor: { name: 'Noor', alt: 'a gold arch with a crescent moon for a Nikah', tier: 'shubha', tint: '#E4EEE6' },
  cathedral: { name: 'Cathedral', alt: 'a cathedral rose window in soft watercolour', tier: 'shahi', tint: '#EEF1EA' },
};
const W = [480, 800, 1170];
export const srcset = (n) => W.map((w) => `/site/intl/${n}-${w}.webp ${w}w`).join(', ');
/** a phone frame with an international still (decorative unless `alt` is given) */
export function iphone(n, { sizes = '220px', alt = '', eager = false } = {}) {
  return `<span class="phone"><img src="/site/intl/${n}-480.webp" srcset="${srcset(n)}" sizes="${sizes}" width="390" height="844" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></span>`;
}

const PLANS = intlPlans(FALLBACK_SITE.plans);
const planOf = (tier) => PLANS.find((p) => p.id === tier);
const tierTag = (tier) => {
  const p = planOf(tier);
  return `<span class="tier tier--${tier}">${esc(p?.name || '')}</span><span class="dcard__price" data-usd-from="${tier}">${p ? `from ${usdText(p.usd)}` : ''}</span>`;
};

/* ---------------- head: a hidden preview, never indexed ---------------- */
function head() {
  const title = 'Online Wedding Invitations for Every Tradition · Nimtto';
  const desc = 'Wedding invitation websites for church, garden and every tradition. Guests open one link, see the day and reply. From $49, paid once.';
  return `<title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta name="robots" content="noindex, nofollow" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Nimtto" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${SITE}/site/intl/share.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="The Olive wedding invitation: an olive wreath around Emily and James" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="theme-color" content="#FFFFFF" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="preload" href="/site/fonts/instrument-serif-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/site/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin />`;
}

/* ---------------- header and footer ---------------- */
const NAV = [['#designs', 'Designs'], ['#traditions', 'Traditions'], ['#how', 'How it works'], ['#features', 'Features'], ['#plans', 'Pricing'], ['#faq', 'Questions']];
/** International | Nepal. Nepal is today's site at / (it moves to /np/ later). */
const market = (cls) => `<nav class="mkt ${cls}" aria-label="Choose your site"><a class="mkt__a" href="/intl-preview/" aria-current="page">International</a><a class="mkt__a" href="/" hreflang="en-NP">Nepal</a></nav>`;
function header() {
  const links = NAV.map(([href, t]) => `<a href="${href}">${t}</a>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>
  <header class="nav" id="nav">
    <div class="wrap nav__in">
      <a class="nav__logo" href="/intl-preview/"><img src="/site/brand/nimtto-logo.svg" width="146" height="34" alt="Nimtto home" /></a>
      <nav class="nav__links" aria-label="Main">${links}</nav>
      <div class="nav__end">
        ${market('mkt--bar')}
        <a class="nav__auth" href="/studio/" data-auth>Sign in</a>
        <a class="btn btn--accent btn--sm nav__order" href="#plans">Order</a>
        <button class="nav__menu" id="menu-btn" type="button" aria-expanded="false" aria-controls="menu"><span class="nav__menu-i" aria-hidden="true"><i></i><i></i></span><span class="nav__menu-t">Menu</span></button>
      </div>
    </div>
    <div class="sheet" id="menu">
      <div class="sheet__top">
        ${market('mkt--sheet')}
        <nav class="sheet__links" aria-label="Main">${links}</nav>
      </div>
      <div class="sheet__end">
        <a class="btn btn--accent" href="#plans">Order an invitation</a>
        <a class="btn btn--ghost" href="/studio/" data-auth>Sign in</a>
      </div>
    </div>
  </header>`;
}

function footer() {
  const col = (h, items) => `<div class="foot__col"><p class="foot__h">${h}</p><ul>${items.map(([href, t]) => `<li><a href="${href}">${t}</a></li>`).join('')}</ul></div>`;
  return `<footer class="foot">
    <div class="wrap">
      <div class="foot__top">
        <div class="foot__brand">
          <img src="/site/brand/nimtto-logo.svg" width="146" height="34" alt="Nimtto" loading="lazy" />
          <p>Online wedding invitations for every tradition. Made with care by a small studio, and shared in one link.</p>
          <p class="foot__np"><a class="link" href="/">Looking for Nepali designs? Visit Nimtto Nepal ${ARROW}</a></p>
        </div>
        ${col('Invitations', [['#designs', 'All designs'], ['#traditions', 'Traditions'], ['#traditions', 'Christian weddings'], ['#traditions', 'Nikah'], ['#traditions', 'Interfaith']])}
        ${col('Nimtto', [['#how', 'How it works'], ['#features', 'Features'], ['#plans', 'Pricing'], ['#faq', 'Questions']])}
        <div class="foot__col"><p class="foot__h">Talk to us</p><ul>
          <li><a data-contact="email" href="mailto:${CONTACT.email}"><span data-contact="email-text">${CONTACT.email}</span></a></li>
          <li><a data-contact="wa" href="https://wa.me/${CONTACT.wa}" target="_blank" rel="noopener">WhatsApp <span data-contact="wa-text">${CONTACT.phone}</span></a></li>
          <li><a href="/studio/" data-auth>Sign in</a></li>
        </ul></div>
      </div>
      <div class="foot__base"><p>© <span data-year>2026</span> Nimtto</p><p>Pay by card or PayPal, in US dollars</p></div>
    </div>
  </footer>`;
}

/* ---------------- THE WREATH (the home page's lotus, in olive leaves): same classes, so motion.js runs it as is ---------------- */
const f2 = (n) => Math.round(n * 100) / 100;
const leaf = (L, W) => `M0 0C${f2(W * 0.62)} ${f2(-L * 0.18)} ${f2(W * 0.56)} ${f2(-L * 0.7)} 0 ${-L}C${f2(-W * 0.56)} ${f2(-L * 0.7)} ${f2(-W * 0.62)} ${f2(-L * 0.18)} 0 0Z`;
// two rows of olive leaves leaning opposite ways make the wreath; an inner ring of small gold leaves frames the rings
const RINGS = [
  { n: 28, r: 116, L: 54, W: 21, off: 0, tilt: 40, olives: 4, blooms: 7 },
  { n: 28, r: 110, L: 44, W: 17, off: 6.43, tilt: -36, olives: 0 },
  { n: 16, r: 58, L: 22, W: 10, off: 11.25, tilt: 30, olives: 0 },
];
const VAR = [1, 0.86, 0.94]; // leaves of a living branch are never all one length
/** a small blush sweet-pea blossom tucked into the wreath */
const bloom = (x, y) => `<g class="lo-bloom" transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="3.2" ry="5" cy="-4.6" transform="rotate(${a})"/>`).join('')}<circle r="2"/></g>`;
function wreath() {
  const ticks = Array.from({ length: 72 }, (_, i) => `<line y1="-182" y2="${i % 3 ? -186 : -190}" transform="rotate(${f2((i * 360) / 72)})"/>`).join('');
  const beads = Array.from({ length: 48 }, (_, i) => `<circle r="${i % 2 ? 1 : 1.8}" cy="-196" transform="rotate(${f2((i * 360) / 48 + 3.75)})"/>`).join('');
  const ring = (R, k) => `<g class="lo-ring" data-ring="${k}">${Array.from({ length: R.n }, (_, i) => `<g transform="rotate(${f2((i * 360) / R.n + R.off)}) translate(0 ${-R.r}) rotate(${R.tilt})"><g class="lo-p">`
    + `<path class="lo-p__b" d="${leaf(R.L * VAR[i % 3], R.W)}" fill="url(#lo-g${k})"/><path class="lo-p__v" d="M0 ${f2(-R.L * 0.08)}V${f2(-R.L * VAR[i % 3] * 0.82)}"/>`
    + (R.blooms && i % R.blooms === 3 ? bloom(f2(-R.W * 0.7), f2(-R.L * 0.62)) : '')
    + (R.olives && i % R.olives === 0 ? `<ellipse class="lo-olive" cx="${f2(R.W * 0.62)}" cy="${f2(-R.L * 0.3)}" rx="4.6" ry="6.4" transform="rotate(-24 ${f2(R.W * 0.62)} ${f2(-R.L * 0.3)})"/>` : '')
    + '</g></g>').join('')}</g>`;
  const grads = [['#3E6A4C', '#6E9A72', '#B7CFAE'], ['#2F5A3E', '#5E8A66', '#A3C29B'], ['#A88748', '#C8A96A', '#E9D9AE']]
    .map((c, k) => `<linearGradient id="lo-g${k}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>`).join('');
  // the pod: two interlocked wedding rings
  const pod = '<g class="lo-pod"><circle class="lo-podc" r="40"/><g class="lo-rings"><circle cx="-11" r="19"/><circle cx="11" r="19"/></g><path class="lo-spark" d="M0 -32l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>';
  return `<svg class="lo lo--wreath" viewBox="-200 -200 400 400" aria-hidden="true" focusable="false"><defs>${grads}</defs>
    <g class="lo-frame"><g class="lo-rays">${ticks}</g><circle class="lo-c1" r="178"/><circle class="lo-c2" r="200"/><g class="lo-beads">${beads}</g></g>
    ${ring(RINGS[0], 0)}${ring(RINGS[1], 1)}${pod}${ring(RINGS[2], 2)}</svg>`;
}

/* ---------------- traditions (the occasions cards) ---------------- */
const TRADITIONS = [
  { id: 'christian', kick: 'Holy Matrimony', en: 'Christian wedding', line: '8 new designs, with the ceremony, the reception and everything between.', lead: true },
  { id: 'catholic', kick: 'Nuptial Mass', en: 'Catholic', line: 'The Mass, the readings and the order of service, in one link.' },
  { id: 'orthodox', kick: 'The Crowning', en: 'Orthodox', line: 'The betrothal and the crowning, with the full order of the day.' },
  { id: 'nikah', kick: 'Nikah & Walima', en: 'Muslim Nikah', line: 'The Nikah, the walima and the mehndi, each with its time and place.' },
  { id: 'nepali', kick: 'Shubha Bibaha', en: 'Nepali & Hindu', line: 'Our first home: 27 designs with every ceremony, on the Nepal site.', href: '/', cta: 'Visit Nimtto Nepal' },
  { id: 'interfaith', kick: 'Two traditions', en: 'Interfaith', line: 'Both families’ traditions in one invitation, in words you choose together.' },
  { id: 'engagement', kick: 'She said yes', en: 'Engagement', line: 'The engagement party and the dinner, with replies for numbers.' },
  { id: 'renewal', kick: 'Still, I do', en: 'Vow renewal', line: 'Ten, twenty-five or fifty years on. The same promise, a new card.' },
  { id: 'custom', kick: 'Your own day', en: 'Your own celebration', line: 'An elopement party or a garden blessing. Designed only for you.' },
];
function traditions() {
  const std = planOf('saral');
  return TRADITIONS.map((o) => {
    const cta = o.lead
      ? `<a class="occ__cta" href="#designs">See the designs ${ARROW}</a>`
      : o.href ? `<a class="occ__cta" href="${o.href}">${o.cta} ${ARROW}</a>`
        : `<a class="occ__cta" href="#plans">${o.id === 'custom' ? 'Tell us your idea' : 'Ask for a design'} ${ARROW}</a>`;
    const art = o.lead ? `<span class="occ__phones" aria-hidden="true">${iphone('olive', { sizes: '140px' })}${iphone('chapel', { sizes: '140px' })}${iphone('dove', { sizes: '140px' })}</span>` : '';
    const more = o.lead ? `<ul class="occ__chips">${['Rehearsal dinner', 'Ceremony', 'Cocktail hour', 'Reception', 'Brunch'].map((t) => `<li>${t}</li>`).join('')}</ul>
      <ul class="occ__facts"><li><b>8</b><span>new designs</span></li><li><b data-usd-from="saral">${std ? usdText(std.usd) : ''}</b><span>starting price</span></li><li><b>RSVP</b><span>meals and plus-ones</span></li></ul>` : '';
    return `<li class="occ occ--${o.id}${o.lead ? ' occ--lead' : ''}${o.id === 'custom' ? ' occ--custom' : ''}" id="occ-${o.id}">
      <p class="occ__ne occ__kick">${esc(o.kick)}</p>
      <h3 class="occ__en">${esc(o.en)}</h3>
      <p class="occ__line">${esc(o.line)}</p>
      ${more}
      <p class="occ__kind">${o.lead ? 'Ready-made designs' : o.href ? 'On the Nepal site' : 'Designed for you'}</p>
      ${cta}${art}
    </li>`;
  }).join('');
}

/* ---------------- the designs rail ---------------- */
const RAIL = ['olive', 'chapel', 'dove', 'garden', 'tuscany', 'seal', 'noor', 'cathedral'];
function rail() {
  return RAIL.map((n) => {
    const s = SCREENS[n];
    return `<li class="rcard" data-slug="${n}">
    <a class="rcard__pic" href="#plans" style="--tint:${s.tint}">${iphone(n, { sizes: '(max-width: 599px) 56vw, 260px', alt: `The ${s.name} design: ${s.alt}` })}</a>
    <p class="rcard__name"><a href="#plans">${esc(s.name)}</a></p>
    <p class="rcard__meta">${tierTag(s.tier)}</p>
  </li>`;
  }).join('');
}

/* ---------------- steps, features ---------------- */
const STEPS = [
  { t: 'Choose a design', d: 'Pick one of our designs, or ask for one made only for you. Open the preview and see it move first.' },
  { t: 'Order and pay', d: 'Make your account, then choose your plan and design. Pay once by card or PayPal, in US dollars.' },
  { t: 'We make it with you', d: 'We ask for your names, times, photos and song by email or WhatsApp. You see every change.' },
  { t: 'Share one link', d: 'Send it by text, email or WhatsApp. Guests open it, see the day and reply.' },
];
function steps() {
  return STEPS.map((s, i) => `<li class="step"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><h3 class="step__t">${esc(s.t)}</h3><p class="step__d">${esc(s.d)}</p></li>`).join('');
}
const FEATURES = [
  { id: 'dates', t: 'The day, in their calendar', d: 'Guests add the ceremony to their calendar in one tap, in their own time zone.',
    vis: '<div class="fx fx--dates" aria-hidden="true"><span class="fx__day">Saturday, June 12</span><span class="fx__en">4:00 PM · St. Mary’s Chapel</span><span class="fx__chip">Add to calendar</span></div>' },
  { id: 'events', t: 'Every part of the day', d: 'Rehearsal, ceremony, cocktails and reception. Each with its time, place and a map.',
    vis: '<ul class="fx fx--events" aria-hidden="true"><li style="--c:#C8A96A"><b>Rehearsal dinner</b><span>Fri · 7:00 PM</span></li><li style="--c:#8FB08F"><b>Ceremony</b><span>Sat · 4:00 PM</span></li><li style="--c:#4A7556"><b>Cocktail hour</b><span>Sat · 5:00 PM</span></li><li style="--c:#2F4D3A"><b>Reception</b><span>Sat · 6:30 PM</span></li></ul>' },
  { id: 'rsvp', t: 'Guest replies', d: 'Guests reply with names, meal choices and plus-ones. You read every reply in your own dashboard.',
    vis: '<div class="fx fx--rsvp" aria-hidden="true"><span class="fx__num">148</span><span class="fx__lbl">guests coming</span><span class="fx__bar"><i style="--w:74%"></i></span><span class="fx__sub">Ceremony 148 · Reception 131 · 12 vegetarian</span></div>' },
  { id: 'opening', t: 'An opening to remember', d: 'A wax seal breaks, a chapel door opens, a wreath unfolds. Every design has its own moment.',
    vis: `<div class="fx fx--opening" aria-hidden="true">${iphone('seal', { sizes: '200px' })}</div>` },
  { id: 'music', t: 'Your song', d: 'Your first-dance song plays as the invitation opens. Guests can turn it off.',
    vis: '<div class="fx fx--music" aria-hidden="true"><span class="fx__play"></span><span class="fx__wave">' + Array.from({ length: 28 }, (_, i) => `<i style="--h:${20 + Math.round(Math.abs(Math.sin(i * 1.7)) * 70)}%"></i>`).join('') + '</span></div>' },
  { id: 'share', t: 'A link that looks good', d: 'Your names and picture show when you text, email or post the link. No app to install.',
    vis: '<div class="fx fx--share" aria-hidden="true"><span class="fx__bubble"><img src="/site/intl/share.jpg" width="1200" height="630" alt="" loading="lazy" decoding="async" /><b>Emily &amp; James · June 12, 2027</b><span>nimtto.com</span></span></div>' },
  { id: 'details', t: 'Registry and the details', d: 'Registry links, dress code, hotels and travel, all in one place.',
    vis: '<div class="fx fx--details" aria-hidden="true"><span>Registry</span><span>Dress code</span><span>Hotels</span><span>Travel</span></div>' },
];
function features() {
  return FEATURES.map((x) => `<li class="feat feat--${x.id}">${x.vis}<div class="feat__txt"><h3 class="feat__t">${esc(x.t)}</h3><p class="feat__d">${esc(x.d)}</p></div></li>`).join('');
}

/* ---------------- plans, in US dollars (src/site/intl.js refreshes them from GET /api/site) ---------------- */
export function planCard(p) {
  return `<li class="plan${p.highlight ? ' plan--hi' : ''}" data-plan-id="${p.id}">
    ${p.highlight ? '<p class="plan__flag">Most chosen</p>' : ''}
    <div class="plan__top"><h3 class="plan__name">${esc(p.name)}</h3></div>
    <p class="plan__price">${p.from ? '<span class="plan__from">from</span>' : ''}<span class="plan__num">${usdText(p.usd)}</span></p>
    <p class="plan__usd">Paid once, in US dollars</p>
    <p class="plan__desc">${esc(p.desc)}</p>
    <a class="btn ${p.highlight ? 'btn--accent' : 'btn--ghost'} plan__btn" href="/pricing/?plan=${p.id}#plans" data-order data-plan="${p.id}">Choose ${esc(p.name)}</a>
    <ul class="plan__feats">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  </li>`;
}
function plans() { return PLANS.map(planCard).join(''); }

/* ---------------- questions ---------------- */
const FAQ = [
  ['What is Nimtto?', 'Nimtto makes wedding invitation websites. Your guests open one link on their phone and see the day, every event with a map, your photos and a reply form.'],
  ['How much does an online wedding invitation cost?', `A Nimtto invitation costs ${PLANS.filter((p) => !p.from).map((p) => `${usdText(p.usd)} (${p.name})`).join(', ')}, paid once. A design made only for you starts at ${usdText(PLANS.find((p) => p.from)?.usd ?? 199)}.`],
  ['Do guests need to install an app?', 'No. The invitation is a website. It opens in any phone browser from a text, an email, WhatsApp or Instagram.'],
  ['Can guests reply with meal choices and plus-ones?', 'Yes. Guests say who is coming, to which events, their meal choice and any plus-ones. You read every reply in your own dashboard and can download the list.'],
  ['Can it follow our church or our tradition?', 'Yes. The words and events follow your wedding: a Nuptial Mass, an Orthodox crowning, a Nikah and walima, or an interfaith day.'],
  ['Can I change details after the invitation is shared?', 'Yes. The link stays the same and changes show at once. You update times, venues and photos from your dashboard, or we change them for you.'],
  ['How long does it take?', 'We start as soon as your payment is in and we have your details. A ready-made design is quicker than a custom one. Tell us your date when you order and we plan around it.'],
  ['How do I pay?', 'You pay once, by card or PayPal, in US dollars. There are no monthly fees.'],
];
function faq() {
  return `<div class="faq__list">${FAQ.map(([q, a], i) => `<details class="qa"${i === 0 ? ' open' : ''}><summary class="qa__q"><span>${esc(q)}</span><i aria-hidden="true"></i></summary><div class="qa__a"><p>${esc(a)}</p></div></details>`).join('')}</div>`;
}

export const INTL_PARTIALS = {
  'intl-head': head, 'intl-header': header, 'intl-footer': footer, wreath, traditions,
  'intl-rail': rail, 'intl-steps': steps, 'intl-features': features, 'intl-plans': plans, 'intl-faq': faq,
};
