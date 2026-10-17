// The international home page (/intl-preview/, hidden: noindex, in no sitemap, linked from nowhere): the home page's
// design system, components and scroll scenes (src/site/partials.mjs, motion.js), arranged for US couples: designs
// first, then what guests see, why paperless, a real designer, other events, prices in US dollars and a plain FAQ.
// Every claim here is something the product does today (see the report for the features we recommend adding).
// Rendered by the same `site-partials` Vite plugin. Plain module: Node runs it at build, never the browser.
import { FALLBACK_SITE } from './themes.js';
import { intlPlans, usdText } from './intl-plans.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ARROW = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const CONTACT = { phone: '+977 980-6393298', wa: '9779806393298', email: 'nimttoz@gmail.com' };
const SITE = 'https://nimtto.com';

/* ---------------- the phone screens (public/site/intl/<name>-<w>.webp, 390x844 at 3x) ---------------- */
export const STYLES = [['garden', 'Garden'], ['romantic', 'Romantic'], ['classic', 'Classic'], ['modern', 'Modern'], ['destination', 'Destination']];
export const DESIGNS = [
  { id: 'olive', name: 'Olive Grove', style: 'garden', tier: 'shubha', alt: 'a watercolor olive wreath around the date' },
  { id: 'rosearch', name: 'Rose Arch', style: 'romantic', tier: 'shahi', alt: 'a stone arch covered in climbing garden roses' },
  { id: 'roses', name: 'Blush Roses', style: 'classic', tier: 'saral', alt: 'peach and blush garden roses inside a thin gold frame' },
  { id: 'arch', name: 'Gold Arch', style: 'modern', tier: 'shubha', alt: 'a thin gold arch with a blush rose' },
  { id: 'amalfi', name: 'Amalfi', style: 'destination', tier: 'shahi', alt: 'lemon branches above the Amalfi coast' },
  { id: 'garden', name: 'Garden Party', style: 'garden', tier: 'shubha', alt: 'a garden ceremony with a rose arbor and white chairs' },
  { id: 'wildflower', name: 'Wildflower', style: 'romantic', tier: 'shubha', alt: 'a summer meadow of pink and peach wildflowers' },
  { id: 'letterpress', name: 'Letterpress', style: 'classic', tier: 'saral', alt: 'a deckled cotton card on sage linen' },
  { id: 'seal', name: 'Wax Seal', style: 'modern', tier: 'saral', alt: 'a white envelope with a sage wax seal' },
  { id: 'tuscany', name: 'Tuscany', style: 'destination', tier: 'shubha', alt: 'vineyard hills at golden hour' },
];
const W = [480, 800, 1170];
/** the art version, in every file name: new art gets a new URL, so no browser or CDN cache can show an old picture */
export const V = 'v3';
export const srcset = (n) => W.map((w) => `/site/intl/${n}-${V}-${w}.webp ${w}w`).join(', ');
/** a phone frame with one of the international screens (decorative unless `alt` is given) */
export function iphone(n, { sizes = '220px', alt = '', eager = false } = {}) {
  return `<span class="phone"><img src="/site/intl/${n}-${V}-480.webp" srcset="${srcset(n)}" sizes="${sizes}" width="390" height="844" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></span>`;
}

const PLANS = intlPlans(FALLBACK_SITE.plans);
const planOf = (tier) => PLANS.find((p) => p.id === tier);
const fromPrice = (tier) => { const p = planOf(tier); return p ? `from ${usdText(p.usd)}` : ''; };

/* ---------------- head: a hidden preview, never indexed ---------------- */
function head() {
  const title = 'Online Wedding Invitations and Wedding Websites · Nimtto';
  const desc = 'Beautiful online wedding invitations with a matching wedding website and RSVPs. Send them by text or email. Made with you by a real designer, from $49.';
  return `<title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta name="robots" content="noindex, nofollow" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Nimtto" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${SITE}/site/intl/share-${V}.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="The Olive Grove wedding invitation for Emily and James" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="theme-color" content="#FFFFFF" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="preload" href="/site/fonts/instrument-serif-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/site/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin />`;
}

/* ---------------- header and footer ---------------- */
const NAV = [['#designs', 'Designs'], ['#guests', 'Wedding website'], ['#how', 'How it works'], ['#plans', 'Pricing'], ['#faq', 'FAQ']];
/** International | Nepal. Nepal is today's site at / (it moves to /np/ later). */
const market = (cls) => `<nav class="mkt ${cls}" aria-label="Choose your site"><a class="mkt__a" href="/intl-preview/" aria-current="page">International</a><a class="mkt__a" href="/">Nepal</a></nav>`;
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
        <a class="btn btn--accent btn--sm nav__order" href="#plans">Get started</a>
        <button class="nav__menu" id="menu-btn" type="button" aria-expanded="false" aria-controls="menu"><span class="nav__menu-i" aria-hidden="true"><i></i><i></i></span><span class="nav__menu-t">Menu</span></button>
      </div>
    </div>
    <div class="sheet" id="menu">
      <div class="sheet__top">
        ${market('mkt--sheet')}
        <nav class="sheet__links" aria-label="Main">${links}</nav>
      </div>
      <div class="sheet__end">
        <a class="btn btn--accent" href="#plans">Get started</a>
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
          <p>Online wedding invitations and wedding websites, made with you by a real designer.</p>
        </div>
        ${col('Invitations', [['#designs', 'All designs'], ['#guests', 'Wedding website'], ['#why', 'Why go paperless'], ['#events', 'Other events']])}
        ${col('Nimtto', [['#how', 'How it works'], ['#plans', 'Pricing'], ['#faq', 'FAQ'], ['/', 'Nimtto Nepal']])}
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

/* ---------------- designs: a gallery you can narrow by style (src/site/intl.js filters it) ---------------- */
function styleChips() {
  return `<button class="chip" type="button" data-style="all" aria-pressed="true">All designs</button>${STYLES.map(([id, t]) => `<button class="chip" type="button" data-style="${id}" aria-pressed="false">${t}</button>`).join('')}`;
}
const TINTS = ['#EAF1E7', '#F1F5EF', '#E6EFE3', '#EEF2EA'];
/** the design cards: the home page's rail cards, with the style beside the name */
function gallery() {
  const label = Object.fromEntries(STYLES);
  return DESIGNS.map((d, i) => {
    const p = planOf(d.tier);
    return `<li class="rcard" data-style="${d.style}">
    <a class="rcard__pic" href="#plans" style="--tint:${TINTS[i % TINTS.length]}">${iphone(d.id, { sizes: '(max-width: 599px) 56vw, 260px', alt: `The ${d.name} design: ${d.alt}` })}</a>
    <p class="rcard__name"><a href="#plans">${esc(d.name)}</a> <span>${label[d.style]}</span></p>
    <p class="rcard__meta"><span class="tier tier--${d.tier}">${esc(p?.name || '')}</span><span class="dcard__price" data-usd-from="${d.tier}">${fromPrice(d.tier)}</span></p>
  </li>`;
  }).join('');
}

/* ---------------- THE WREATH (the home page's lotus, in olive leaves round two rings): same classes, so motion.js runs it as is ---------------- */
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
  // the pod: two linked wedding rings
  const pod = '<g class="lo-pod"><circle class="lo-podc" r="40"/><g class="lo-rings"><circle cx="-11" r="19"/><circle cx="11" r="19"/></g><path class="lo-spark" d="M0 -32l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>';
  return `<svg class="lo lo--wreath" viewBox="-200 -200 400 400" aria-hidden="true" focusable="false"><defs>${grads}</defs>
    <g class="lo-frame"><g class="lo-rays">${ticks}</g><circle class="lo-c1" r="178"/><circle class="lo-c2" r="200"/><g class="lo-beads">${beads}</g></g>
    ${ring(RINGS[0], 0)}${ring(RINGS[1], 1)}${pod}${ring(RINGS[2], 2)}</svg>`;
}

/* ---------------- what guests see: one phone, its screen changing step by step (src/site/intl-journey.js) ----------------
   The markup is the finished, still state: every step with its own small phone and caption (no JavaScript, reduced
   motion). The script turns it into the pinned 3D phone (wide screens) or a swipe row under one phone (phones). */
const GUEST = [
  ['olive', 'The invitation', 'It opens like a real card, with your names, the date and the place.'],
  ['countdown', 'Countdown', 'Days to go, and one tap to add the day to their calendar.'],
  ['schedule', 'Schedule', 'The whole weekend, with a map for every stop.'],
  ['rsvp', 'RSVP', 'Guests reply in a minute. No account and no app.'],
  ['stay', 'Travel and hotels', 'Where to stay, how to get there and who to call.'],
  ['story', 'Your story', 'How you met and how it happened, in your own words.'],
  ['music', 'Your song', 'The song you pick plays as guests open the invitation.'],
  ['live', 'Watch live', 'A live stream link for family who are far away.'],
];
const SCREEN = '(max-width: 1023px) 52vw, 360px';
function journey() {
  const n = GUEST.length;
  const screens = GUEST.map(([id, t], i) => `<img class="journey__scr${i ? '' : ' is-on'}" data-i="${i}" src="/site/intl/${id}-${V}-480.webp" srcset="${srcset(id)}" sizes="${SCREEN}" width="390" height="844" alt="" loading="lazy" decoding="async" />`).join('');
  const steps = GUEST.map(([id, t, d], i) => `<li class="journey__step" data-i="${i}">
      <div class="journey__fig">${iphone(id, { sizes: '(max-width: 699px) 44vw, 220px', alt: `${t}: ${d}` })}</div>
      <div class="journey__cap"><p class="journey__n">${String(i + 1).padStart(2, '0')} <span>/ ${String(n).padStart(2, '0')}</span></p><h3 class="journey__t">${esc(t)}</h3><p class="journey__d">${esc(d)}</p></div>
    </li>`).join('');
  const dots = GUEST.map(([, t], i) => `<button class="journey__dot" type="button" data-i="${i}" aria-label="Step ${i + 1}: ${esc(t)}"${i ? '' : ' aria-current="step"'}></button>`).join('');
  return `<div class="journey__stage" aria-hidden="true"><div class="journey__float"><div class="journey__phone"><span class="phone"><span class="journey__screens">${screens}</span></span></div></div><div class="journey__glow"></div></div>
    <ol class="journey__steps">${steps}</ol>
    <div class="journey__nav" hidden><div class="journey__bar"><i></i></div><div class="journey__dots">${dots}</div></div>`;
}

/* ---------------- why paperless (the bento) ---------------- */
const WHY = [
  { id: 'cost', t: 'Costs less than paper', d: 'Printed invitations and stamps can add up to hundreds of dollars. Nimtto starts at $49, and you can send it to as many guests as you like.',
    vis: () => `<div class="fx fx--cost" aria-hidden="true"><span class="fx__num" data-usd-from="saral">${usdText(planOf('saral')?.usd ?? 49)}</span><span class="fx__lbl">paid once</span><span class="fx__sub">No stamps, no printing, no monthly fees</span></div>` },
  { id: 'change', t: 'Plans change. That’s okay.', d: 'Change a time or a place whenever you need to. Everyone with the link sees the new details right away.',
    vis: () => '<div class="fx fx--change" aria-hidden="true"><span class="fx__old">Ceremony · 4:00 PM</span><span class="fx__new"><i></i>Ceremony · 4:30 PM</span><span class="fx__note">Updated for every guest</span></div>' },
  { id: 'rsvp', t: 'Know who’s coming', d: 'Replies go straight to your dashboard: who is coming, to which events, how many, and their meal choice. Download the list any time.',
    vis: () => '<div class="fx fx--rsvp" aria-hidden="true"><span class="fx__num">148</span><span class="fx__lbl">guests coming</span><span class="fx__bar"><i style="--w:74%"></i></span><span class="fx__sub">Ceremony 148 · Dinner 131 · Brunch 64</span></div>' },
  { id: 'opening', t: 'A moment to remember', d: 'Every design opens in its own way. Guests break a seal or open a gate, just like a real card.',
    vis: () => `<div class="fx fx--opening" aria-hidden="true">${iphone('seal', { sizes: '200px' })}</div>` },
  { id: 'music', t: 'Your song plays', d: 'Pick a song to play as the invitation opens. Guests can turn it off.',
    vis: () => '<div class="fx fx--music" aria-hidden="true"><span class="fx__play"></span><span class="fx__wave">' + Array.from({ length: 28 }, (_, i) => `<i style="--h:${20 + Math.round(Math.abs(Math.sin(i * 1.7)) * 70)}%"></i>`).join('') + '</span></div>' },
  { id: 'share', t: 'Send it by text or email', d: 'Copy your link and send it any way you like. Your names and picture show in the preview.',
    vis: () => '<div class="fx fx--share" aria-hidden="true"><span class="fx__bubble"><img src="/site/intl/share-' + V + '.jpg" width="1200" height="630" alt="" loading="lazy" decoding="async" /><b>Emily &amp; James · June 12, 2027</b><span>nimtto.com</span></span></div>' },
  { id: 'eco', t: 'Kinder to the planet', d: 'No paper, no envelopes and no shipping. Just one link.',
    vis: () => '<div class="fx fx--eco" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M14 50C12 30 26 14 52 12c0 26-14 40-34 40" fill="var(--blush-100)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 50C24 38 32 30 44 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>0 paper · 0 stamps</span></div>' },
];
function why() {
  return WHY.map((x) => `<li class="feat feat--${x.id}">${x.vis()}<div class="feat__txt"><h3 class="feat__t">${esc(x.t)}</h3><p class="feat__d">${esc(x.d)}</p></div></li>`).join('');
}

/* ---------------- how it works: a real designer ---------------- */
const STEPS = [
  { t: 'Pick a design', d: 'Choose one you love, or ask for one made just for you.' },
  { t: 'Pay once', d: 'Pay by card or PayPal, in US dollars. No monthly fees.' },
  { t: 'Send us your details', d: 'Names, times, places, photos and your song. We set it all up, and you check every change.' },
  { t: 'Share your link', d: 'Send it by text or email. Replies come straight to you.' },
];
function steps() {
  return STEPS.map((s, i) => `<li class="step"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><h3 class="step__t">${esc(s.t)}</h3><p class="step__d">${esc(s.d)}</p></li>`).join('');
}

/* ---------------- other events (the occasion cards) ---------------- */
const EVENTS = [
  { id: 'wedding', en: 'Weddings', line: '10 designs to choose from, each with a matching wedding website.', lead: true },
  { id: 'engagement', en: 'Engagement party', line: 'Celebrate the big news with friends and family.' },
  { id: 'rehearsal', en: 'Rehearsal dinner', line: 'The night before, with the time, the place and who’s invited.' },
  { id: 'shower', en: 'Bridal shower', line: 'Brunch, games and gifts, all in one link.' },
  { id: 'welcome', en: 'Welcome party', line: 'Say hello to the guests who traveled to be there.' },
  { id: 'renewal', en: 'Vow renewal', line: 'Say “I do” again, years later.' },
  { id: 'anniversary', en: 'Anniversary', line: 'Ten years, twenty-five or fifty. Time to celebrate.' },
  { id: 'birthday', en: 'Birthday', line: 'From a first birthday to a fiftieth.' },
  { id: 'custom', en: 'Something else', line: 'Have another event in mind? Tell us about it.' },
];
function events() {
  const std = planOf('saral');
  return EVENTS.map((o) => {
    const cta = o.lead ? `<a class="occ__cta" href="#designs">See the designs ${ARROW}</a>`
      : `<a class="occ__cta" href="#plans">${o.id === 'custom' ? 'Tell us your idea' : 'Ask us about it'} ${ARROW}</a>`;
    const art = o.lead ? `<span class="occ__phones" aria-hidden="true">${iphone('olive', { sizes: '140px' })}${iphone('rosearch', { sizes: '140px' })}${iphone('wildflower', { sizes: '140px' })}</span>` : '';
    const more = o.lead ? `<ul class="occ__chips">${['Welcome drinks', 'Ceremony', 'Cocktail hour', 'Dinner and dancing', 'Farewell brunch'].map((t) => `<li>${t}</li>`).join('')}</ul>
      <ul class="occ__facts"><li><b>10</b><span>designs</span></li><li><b data-usd-from="saral">${std ? usdText(std.usd) : ''}</b><span>starting price</span></li><li><b>RSVP</b><span>built in</span></li></ul>` : '';
    return `<li class="occ occ--${o.id}${o.lead ? ' occ--lead' : ''}${o.id === 'custom' ? ' occ--custom' : ''}" id="ev-${o.id}">
      <h3 class="occ__en">${esc(o.en)}</h3>
      <p class="occ__line">${esc(o.line)}</p>
      ${more}
      <p class="occ__kind">${o.lead ? 'Ready-made designs' : 'Made for you'}</p>
      ${cta}${art}
    </li>`;
  }).join('');
}

/* ---------------- plans, in US dollars (src/site/intl.js refreshes them from GET /api/site) ---------------- */
export function planCard(p) {
  return `<li class="plan${p.highlight ? ' plan--hi' : ''}" data-plan-id="${p.id}">
    ${p.highlight ? '<p class="plan__flag">Recommended</p>' : ''}
    <div class="plan__top"><h3 class="plan__name">${esc(p.name)}</h3></div>
    <p class="plan__price">${p.from ? '<span class="plan__from">from</span>' : ''}<span class="plan__num">${usdText(p.usd)}</span></p>
    <p class="plan__usd">One-time payment</p>
    <p class="plan__desc">${esc(p.desc)}</p>
    <a class="btn ${p.highlight ? 'btn--accent' : 'btn--ghost'} plan__btn" href="/pricing/?plan=${p.id}#plans" data-order data-plan="${p.id}">Choose ${esc(p.name)}</a>
    <ul class="plan__feats">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  </li>`;
}
function plans() { return PLANS.map(planCard).join(''); }

/* ---------------- FAQ, in plain words ---------------- */
const price = (id) => usdText(PLANS.find((p) => p.id === id)?.usd ?? 0);
const FAQ = [
  ['Do guests need an account or an app to RSVP?', 'No. Guests just open your link and reply. No account, no app and no password.'],
  ['Can I send it by text?', 'Yes. It’s one link, so you can send it by text, email, WhatsApp, Instagram or any app you like.'],
  ['Can I change details after I send it?', 'Yes. Change times, places or photos any time. The link stays the same, and guests see the new details right away.'],
  ['How much does it cost?', `Plans start at ${price('saral')}, paid once. Pro is ${price('shubha')} and Pro Max is ${price('shahi')}. A design made just for you starts at ${price('custom')}. There are no monthly fees.`],
  ['How is this different from a DIY website builder?', 'You don’t have to build anything. A real designer sets up your invitation and wedding website with you, and you check every change before guests see it.'],
  ['Can I see who has replied?', 'Yes. Every reply shows up in your dashboard: who is coming, to which events, how many and their meal choice. You can download the list.'],
  ['What about guests in other time zones?', 'Every time is shown in the venue’s local time, so no one gets confused. Guests can also add each event to their calendar.'],
  ['How long does it take?', 'We start as soon as we have your details. A ready-made design is quicker than a custom one. Tell us your wedding date and we’ll plan around it.'],
];
function faq() {
  return `<div class="faq__list">${FAQ.map(([q, a], i) => `<details class="qa"${i === 0 ? ' open' : ''}><summary class="qa__q"><span>${esc(q)}</span><i aria-hidden="true"></i></summary><div class="qa__a"><p>${esc(a)}</p></div></details>`).join('')}</div>`;
}

export const INTL_PARTIALS = {
  'intl-head': head, 'intl-header': header, 'intl-footer': footer, 'intl-styles': styleChips, 'intl-gallery': gallery,
  wreath, 'intl-journey': journey, 'intl-why': why, 'intl-steps': steps, 'intl-events': events, 'intl-plans': plans, 'intl-faq': faq,
};
