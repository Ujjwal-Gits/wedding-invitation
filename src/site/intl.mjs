// The international site (/international/ and its pages): the home page's design system, components and scroll scenes
// (src/site/partials.mjs, motion.js) in the sage palette (intl.css), for couples and hosts outside Nepal: designs,
// occasions, what guests see, prices in US dollars and a plain FAQ. The words live in src/site/intl-content.mjs, the
// designs in src/site/intl-designs.js, the landing pages in src/site/landings.mjs. Every claim is something the
// product does today. No religion labels on this site.
// Rendered by the same `site-partials` Vite plugin. Plain module: Node runs it at build, never the browser.
import { FALLBACK_SITE, TIER_LABEL, BY_SLUG } from './themes.js';
import { intlPlans, usdText } from './intl-plans.js';
import { INTL_PAGES, EVENTS, FAQ_SETS, faqList, fillUsd, STEPS, INTL_BASE } from './intl-content.mjs';
import { STYLES, STYLE_LABEL, V, artSrc, artSrcset, INTL_THEMES, NP_DESIGNS_INTL, designPage } from './intl-designs.js';
import { LANDINGS } from './landings.mjs';
import { PAGES } from './seo.mjs';
import { jsonLd, faqBlock, faqLd, LEGAL_LINKS, phone, pic } from './partials.mjs';
import { SITE_URL } from './content.mjs';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ARROW = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const CONTACT = { phone: '+977 980-6393298', wa: '9779806393298', email: 'nimttoz@gmail.com' };

/** a phone frame with one of the international screens (decorative unless `alt` is given) */
export function iphone(n, { sizes = '220px', alt = '', eager = false } = {}) {
  return `<span class="phone"><img src="${artSrc(n)}" srcset="${artSrcset(n)}" sizes="${sizes}" width="390" height="844" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></span>`;
}
export const srcset = artSrcset;
export { V };

const PLANS = intlPlans(FALLBACK_SITE.plans);
export const planOf = (tier) => PLANS.find((p) => p.id === tier);
export const fromPrice = (tier) => { const p = planOf(tier); return p ? `from ${usdText(p.usd)}` : ''; };
const TINTS = ['#EAF1E7', '#F1F5EF', '#E6EFE3', '#EEF2EA'];

/* ---------------- header and footer ---------------- */
const NAV = [
  // same order and labels as the Nepal site's nav, so switching sites feels like one site
  ['intl/designs', 'Designs'], ['intl/occasions', 'Occasions'], ['intl/how', 'How it works'],
  ['intl/features', 'Features'], ['intl/pricing', 'Pricing'], ['intl/contact', 'Contact'],
];
/** the page a partial argument names: an INTL_PAGES id or land/<id> */
const pageOf = (arg) => (arg?.startsWith('land/') ? LANDINGS[arg.slice(5)] : INTL_PAGES[arg]) || null;
/** International | Nepal. Nepal opens the Nepal site's page for the same thing (else its home). */
const market = (cls, nepal) => `<nav class="mkt ${cls}" aria-label="Choose your site"><a class="mkt__a" href="${INTL_BASE}" aria-current="page">International</a><a class="mkt__a" href="${nepal}" hreflang="en-NP">Nepal</a></nav>`;
function header(arg = '') {
  const pg = pageOf(arg);
  const active = arg.startsWith('land/') ? pg?.parent || '' : arg;
  const nepal = (pg?.np && PAGES[pg.np]?.path) || '/';
  const links = NAV.map(([id, t]) => `<a href="${INTL_PAGES[id].path}"${id === active ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>
  <header class="nav" id="nav">
    <div class="wrap nav__in">
      <a class="nav__logo" href="${INTL_BASE}"><img src="/site/brand/nimtto-logo.svg" width="146" height="34" alt="Nimtto International home" /></a>
      <nav class="nav__links" aria-label="Main">${links}</nav>
      <div class="nav__end">
        ${market('mkt--bar', nepal)}
        <a class="nav__auth" href="/studio/" data-auth>Sign in</a>
        <a class="btn btn--accent btn--sm nav__order" href="${INTL_BASE}pricing/#plans" data-order>Order</a>
        <button class="nav__menu" id="menu-btn" type="button" aria-expanded="false" aria-controls="menu"><span class="nav__menu-i" aria-hidden="true"><i></i><i></i></span><span class="nav__menu-t">Menu</span></button>
      </div>
    </div>
    <div class="sheet" id="menu">
      <div class="sheet__top">
        ${market('mkt--sheet', nepal)}
        <nav class="sheet__links" aria-label="Main">${links}</nav>
      </div>
      <div class="sheet__end">
        <a class="btn btn--accent" href="${INTL_BASE}pricing/#plans" data-order>Order an invitation</a>
        <a class="btn btn--ghost" href="/studio/" data-auth>Sign in</a>
      </div>
    </div>
  </header>`;
}

function footer() {
  const col = (h, items) => `<div class="foot__col"><p class="foot__h">${h}</p><ul>${items.map(([href, t]) => `<li><a href="${href}">${t}</a></li>`).join('')}</ul></div>`;
  const occ = ['i-wedding', 'i-birthday', 'i-baby-shower', 'i-engagement', 'i-anniversary'].map((id) => [LANDINGS[id].path, LANDINGS[id].name]);
  return `<footer class="foot">
    <div class="wrap">
      <div class="foot__top">
        <div class="foot__brand">
          <img src="/site/brand/nimtto-logo.svg" width="146" height="34" alt="Nimtto" loading="lazy" />
          <p>Animated invitations with an event website and RSVP, made with you by a real designer. Weddings first, and every celebration after.</p>
        </div>
        ${col('Invitations', [[INTL_PAGES['intl/designs'].path, 'All designs'], [INTL_PAGES['intl/occasions'].path, 'All occasions'], ...occ, [LANDINGS['i-nepali'].path, 'Nepali weddings'], [LANDINGS['i-southasian'].path, 'South Asian weddings']])}
        ${col('Nimtto', [[INTL_PAGES['intl/how'].path, 'How it works'], [INTL_PAGES['intl/features'].path, 'Features'], [INTL_PAGES['intl/pricing'].path, 'Pricing'], [INTL_PAGES['intl/faq'].path, 'FAQ'], ['/international/blog/', 'Blog'], [INTL_PAGES['intl/contact'].path, 'Contact'], ['/', 'Nimtto Nepal']])}
        <div class="foot__col"><p class="foot__h">Talk to us</p><ul>
          <li><a data-contact="email" href="mailto:${CONTACT.email}"><span data-contact="email-text">${CONTACT.email}</span></a></li>
          <li><a data-contact="wa" href="https://wa.me/${CONTACT.wa}" target="_blank" rel="noopener">WhatsApp <span data-contact="wa-text">${CONTACT.phone}</span></a></li>
          <li><a href="/studio/" data-auth>Sign in</a></li>
        </ul></div>
      </div>
      <div class="foot__base"><p>© <span data-year>2026</span> Nimtto</p>${LEGAL_LINKS}<p>Pay by card or PayPal, in US dollars</p></div>
    </div>
  </footer>`;
}

/** the page head of a main page: eyebrow, H1 and the summary (data-speak: read aloud by assistants) */
function pagehead(id) {
  const p = INTL_PAGES[id];
  return `<header class="wrap pagehead">
      <p class="eyebrow">${esc(p.eyebrow)}</p>
      <h1 class="display">${p.h1}</h1>
      <p class="lede" data-speak>${fillUsd(p.lede, true)}</p>
    </header>`;
}
/** the home page's hero words */
function heroCopy() {
  const p = INTL_PAGES['intl/home'];
  return `<p class="eyebrow">${esc(p.eyebrow)}</p>
          <h1 class="display hero__h" id="hero-h">${p.h1}</h1>
          <p class="lede hero__lede" data-speak>${fillUsd(p.lede, true)}</p>`;
}

/* ---------------- designs ---------------- */
function styleChips() {
  return `<button class="chip" type="button" data-style="all" aria-pressed="true">All designs</button>${STYLES.map(([id, t]) => `<button class="chip" type="button" data-style="${id}" aria-pressed="false">${t}</button>`).join('')}`;
}
/** a Nepal design as an international card ({ slug, name, style: 'nepali', tier, line, alt }) */
export const npAsIntl = (slug) => { const t = BY_SLUG[slug]; return t && { slug, id: slug, name: t.name, style: 'nepali', tier: t.tier, line: t.concept, alt: t.alt }; };
/** the cards the build shows: the international designs, then the Nepal ones this site offers (`np` of them) */
export const intlList = (np = NP_DESIGNS_INTL.length) => [...INTL_THEMES, ...NP_DESIGNS_INTL.slice(0, np).map(npAsIntl).filter(Boolean)];
const ICON_EYE = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
/** the plan badge and "from $X" of a card (src/site/intl.js keeps the price live) */
export const tierRow = (tier, cls = 'rcard__meta') => `<p class="${cls}"><span class="tier tier--${tier}">${esc(planOf(tier)?.name || '')}</span><span class="dcard__price" data-usd-from="${tier}">${fromPrice(tier)}</span></p>`;
/** a rail card (home page, landing pages, related designs): picture and name open the design's own page; the
 *  style sits on its own line under the name, then the plan and price */
export function railCard(d, i = 0, sizes = '(max-width: 599px) 56vw, 260px') {
  const href = designPage(d.slug);
  return `<li class="rcard" data-style="${d.style}" data-slug="${esc(d.slug)}">
    <a class="rcard__pic" href="${href}" style="--tint:${TINTS[i % TINTS.length]}">${phone(d.slug, { sizes, alt: `The ${d.name} design: ${d.alt}` })}</a>
    <p class="rcard__name"><a href="${href}">${esc(d.name)}</a> <span>${STYLE_LABEL[d.style] || ''}</span></p>
    ${tierRow(d.tier)}
  </li>`;
}
/** the home page's rail: every international design and a few Nepal ones (the "Nepali" chip) */
function gallery() { return intlList(4).map((d, i) => railCard(d, i)).join(''); }
/** one card on the designs page (src/site/intl.js builds the same card for designs from the catalog API) */
export function designCard(d, i = 0) {
  const href = designPage(d.slug);
  return `<li class="dcard" id="d-${esc(d.slug)}" data-slug="${esc(d.slug)}" data-style="${d.style}" data-tier="${d.tier}">
    <a class="dcard__pic" href="${href}" style="--tint:${TINTS[i % TINTS.length]}" tabindex="-1" aria-hidden="true">${phone(d.slug)}</a>
    <div class="dcard__body">
      <h3 class="dcard__name"><a href="${href}">${esc(d.name)}</a> <span class="dcard__ne">${STYLE_LABEL[d.style] || ''}</span></h3>
      ${tierRow(d.tier, 'dcard__meta')}
      <p class="dcard__desc">${esc(d.line)}</p>
      <div class="dcard__acts">
        <a class="btn btn--accent btn--sm" href="${INTL_BASE}pricing/?design=${esc(d.slug)}#plans" data-order data-design="${esc(d.slug)}" aria-label="Order ${esc(d.name)}">Order</a>
        <a class="btn btn--ghost btn--sm" href="/${esc(d.slug)}/?showcase=1" data-preview="${esc(d.slug)}" aria-label="Preview ${esc(d.name)}">${ICON_EYE}Preview</a>
      </div>
    </div>
  </li>`;
}
function grid() { return intlList().map(designCard).join(''); }
function designsLd() {
  const list = intlList();
  return jsonLd({
    '@context': 'https://schema.org', '@type': 'ItemList', name: 'Animated wedding invitation designs', numberOfItems: list.length,
    itemListElement: list.map((d, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}${designPage(d.slug)}`, name: `${d.name} invitation design`, image: `${SITE_URL}${pic(d.slug).src}` })),
  });
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
  ['schedule', 'Schedule', 'Every event of the day or the weekend, with a map for every stop.'],
  ['rsvp', 'RSVP', 'Guests reply in a minute. No account and no app.'],
  ['stay', 'Travel and hotels', 'Where to stay, how to get there and who to call.'],
  ['story', 'Your story', 'A few photos and words, in your own voice.'],
  ['music', 'Your song', 'The song you pick plays as guests open the invitation.'],
  ['live', 'Watch live', 'A live stream link for family who are far away.'],
];
const SCREEN = '(max-width: 1023px) 52vw, 360px';
function journey() {
  const n = GUEST.length;
  const screens = GUEST.map(([id], i) => `<img class="journey__scr${i ? '' : ' is-on'}" data-i="${i}" src="${artSrc(id)}" srcset="${artSrcset(id)}" sizes="${SCREEN}" width="390" height="844" alt="" loading="lazy" decoding="async" />`).join('');
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
  { id: 'cost', t: 'Costs less than paper', d: 'Printed invitations and stamps can add up to hundreds of dollars. Nimtto starts at {usd:saral}, paid once, and you can send it to as many guests as you like.',
    vis: () => `<div class="fx fx--cost" aria-hidden="true"><span class="fx__num" data-usd-from="saral">${usdText(planOf('saral')?.usd ?? 49)}</span><span class="fx__lbl">paid once</span><span class="fx__sub">No stamps, no printing, no monthly fees</span></div>` },
  { id: 'change', t: 'Plans change. That’s okay.', d: 'Change a time or a place whenever you need to. Everyone with the link sees the new details right away.',
    vis: () => '<div class="fx fx--change" aria-hidden="true"><span class="fx__old">Party · 4:00 PM</span><span class="fx__new"><i></i>Party · 4:30 PM</span><span class="fx__note">Updated for every guest</span></div>' },
  { id: 'rsvp', t: 'Know who’s coming', d: 'Replies go straight to your dashboard: who is coming, to which events, how many, and their meal choice. Download the list any time.',
    vis: () => '<div class="fx fx--rsvp" aria-hidden="true"><span class="fx__num">148</span><span class="fx__lbl">guests coming</span><span class="fx__bar"><i style="--w:74%"></i></span><span class="fx__sub">Ceremony 148 · Dinner 131 · Brunch 64</span></div>' },
  { id: 'opening', t: 'A moment to remember', d: 'Every design opens in its own way. Guests break a seal or open a gate, just like a real card.',
    vis: () => `<div class="fx fx--opening" aria-hidden="true">${iphone('seal', { sizes: '200px' })}</div>` },
  { id: 'music', t: 'Your song plays', d: 'Pick a song to play as the invitation opens. Guests can turn it off.',
    vis: () => '<div class="fx fx--music" aria-hidden="true"><span class="fx__play"></span><span class="fx__wave">' + Array.from({ length: 28 }, (_, i) => `<i style="--h:${20 + Math.round(Math.abs(Math.sin(i * 1.7)) * 70)}%"></i>`).join('') + '</span></div>' },
  { id: 'share', t: 'Send it by text or email', d: 'Copy your link and send it any way you like. Your names and picture show in the preview.',
    vis: () => `<div class="fx fx--share" aria-hidden="true"><span class="fx__bubble"><img src="/site/intl/share-${V}.jpg" width="1200" height="630" alt="" loading="lazy" decoding="async" /><b>Emily &amp; James · June 12, 2027</b><span>nimtto.com</span></span></div>` },
  { id: 'eco', t: 'Kinder to the planet', d: 'No paper, no envelopes and no shipping. Just one link.',
    vis: () => '<div class="fx fx--eco" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M14 50C12 30 26 14 52 12c0 26-14 40-34 40" fill="var(--blush-100)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 50C24 38 32 30 44 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>0 paper · 0 stamps</span></div>' },
];
function why(set = '') {
  const list = set === 'features' ? WHY.filter((x) => x.id !== 'eco') : WHY;
  return list.map((x) => `<li class="feat feat--${x.id}">${x.vis()}<div class="feat__txt"><h3 class="feat__t">${esc(x.t)}</h3><p class="feat__d">${fillUsd(x.d, true)}</p></div></li>`).join('');
}

/* ---------------- how it works: a real designer ---------------- */
function steps() {
  return STEPS.map((s, i) => `<li class="step"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><h3 class="step__t">${esc(s.t)}</h3><p class="step__d">${esc(s.d)}</p></li>`).join('');
}
function howtoLd() {
  const p = INTL_PAGES['intl/how'];
  const step = (name, text, url) => ({ '@type': 'HowToStep', name, text, ...(url ? { url: `${SITE_URL}${url}` } : {}) });
  return jsonLd({
    '@context': 'https://schema.org', '@type': 'HowTo', name: 'How to make a digital wedding invitation', description: p.desc,
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: String(planOf('saral')?.usd ?? 49) },
    supply: [{ '@type': 'HowToSupply', name: 'Names, dates and places of each event' }, { '@type': 'HowToSupply', name: 'A few photos and your song (optional)' }],
    step: [
      step('Pick a design', 'Choose one of the animated designs, or ask for one made just for your occasion.', INTL_PAGES['intl/designs'].path),
      step('Pay once', 'Make your account, choose your plan and pay once by card or PayPal, in US dollars.', INTL_PAGES['intl/pricing'].path),
      step('Send us your details', 'Send names, events, places, photos and your song. A real designer sets it up and you check every change.'),
      step('Share your link', 'Send one link by text or email. Guests open it on any phone and reply; you read every reply in your dashboard.'),
    ],
  });
}

/* ---------------- occasions (the occasion cards) ---------------- */
function events(variant = 'home') {
  const std = planOf('saral');
  const list = variant === 'home' ? EVENTS.filter((o) => o.id !== 'rehearsal') : EVENTS;
  return list.map((o) => {
    const page = o.page ? LANDINGS[o.page]?.path : '';
    const cta = o.lead ? `<a class="occ__cta" href="${page || INTL_PAGES['intl/designs'].path}">See the designs ${ARROW}</a>`
      : page ? `<a class="occ__cta" href="${page}">${esc(o.en)} invitations ${ARROW}</a>`
        : `<a class="occ__cta" href="${INTL_BASE}pricing/?plan=custom#plans" data-order data-plan="custom" data-occasion="${o.id}">${o.id === 'custom' ? 'Tell us your idea' : 'Ask us about it'} ${ARROW}</a>`;
    const art = o.lead ? `<span class="occ__phones" aria-hidden="true">${iphone('olive', { sizes: '140px' })}${iphone('rosearch', { sizes: '140px' })}${iphone('wildflower', { sizes: '140px' })}</span>` : '';
    const more = o.lead ? `<ul class="occ__chips">${['Welcome drinks', 'Ceremony', 'Cocktail hour', 'Dinner and dancing', 'Farewell brunch'].map((t) => `<li>${t}</li>`).join('')}</ul>
      <ul class="occ__facts"><li><b>${INTL_THEMES.length}</b><span>designs</span></li><li><b data-usd-from="saral">${std ? usdText(std.usd) : ''}</b><span>starting price</span></li><li><b>RSVP</b><span>built in</span></li></ul>` : '';
    return `<li class="occ occ--${o.id}${o.lead ? ' occ--lead' : ''}${o.id === 'custom' ? ' occ--custom' : ''}" id="ev-${o.id}">
      <h3 class="occ__en">${page ? `<a href="${page}">${esc(o.en)}</a>` : esc(o.en)}</h3>
      <p class="occ__line">${esc(o.line)}</p>
      ${more}
      <p class="occ__kind">${o.lead ? 'Ready-made designs' : 'Designed for your occasion'}</p>
      ${cta}${art}
    </li>`;
  }).join('');
}

/* ---------------- plans, in US dollars (src/site/intl.js refreshes them from GET /api/site) ---------------- */
export function planCard(p) {
  const custom = p.id === 'custom' || p.from;
  return `<li class="plan${p.highlight ? ' plan--hi' : ''}" data-plan-id="${p.id}">
    ${p.highlight ? '<p class="plan__flag">Recommended</p>' : ''}
    <div class="plan__top"><h3 class="plan__name">${esc(p.name)}</h3></div>
    <p class="plan__price">${p.from ? '<span class="plan__from">from</span>' : ''}<span class="plan__num">${usdText(p.usd)}</span></p>
    <p class="plan__usd">${custom ? 'We reply with a price in one business day' : 'One-time payment'}</p>
    <p class="plan__desc">${esc(p.desc)}</p>
    <a class="btn ${p.highlight ? 'btn--accent' : 'btn--ghost'} plan__btn" href="${INTL_BASE}pricing/?plan=${p.id}#plans" data-order data-plan="${p.id}">${custom ? 'Ask for a custom design' : `Choose ${esc(p.name)}`}</a>
    <ul class="plan__feats">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  </li>`;
}
function plans() { return PLANS.map(planCard).join(''); }
/** Service + an Offer per plan, in US dollars */
export function offersLd() {
  return jsonLd({
    '@context': 'https://schema.org', '@type': 'Service', '@id': `${SITE_URL}${INTL_BASE}#service`, name: 'Animated invitation website with RSVP',
    serviceType: 'Digital invitation and event website', provider: { '@id': `${SITE_URL}/#org` },
    areaServed: ['United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates'].map((name) => ({ '@type': 'Country', name })),
    description: 'Animated invitations with an event website and RSVP, set up with you by a real designer: ready-made wedding designs, and invitations designed for birthdays, showers, anniversaries and every other celebration.',
    hasOfferCatalog: {
      '@type': 'OfferCatalog', name: 'Nimtto plans (US dollars)',
      itemListElement: PLANS.map((p) => ({
        '@type': 'Offer', name: `${p.name} plan`, price: String(p.usd), priceCurrency: 'USD', url: `${SITE_URL}${INTL_BASE}pricing/`, availability: 'https://schema.org/InStock',
        description: [p.desc, ...p.features].filter(Boolean).join('. '),
        ...(p.from ? { priceSpecification: { '@type': 'PriceSpecification', minPrice: String(p.usd), priceCurrency: 'USD' } } : {}),
      })),
    },
  });
}

/* ---------------- FAQ, in plain words ---------------- */
function faq(set = 'home') {
  const s = FAQ_SETS[set];
  if (Array.isArray(s?.[0])) {
    const all = s.map(([h, keys]) => [h, faqList(keys)]);
    return all.map(([h, items], g) => `<section class="faq__group" aria-labelledby="fg-${g}"><h2 class="h3 faq__gh" id="fg-${g}">${esc(h)}</h2>${faqBlock(items, { ld: false, openFirst: g === 0 })}</section>`).join('')
      + faqLd(all.flatMap(([, items]) => items));
  }
  return faqBlock(faqList(s || []));
}

export const INTL_PARTIALS = {
  'intl-header': header, 'intl-footer': footer, 'intl-pagehead': pagehead, 'intl-hero': heroCopy,
  'intl-styles': styleChips, 'intl-gallery': gallery, 'intl-grid': grid, 'intl-designs-ld': designsLd,
  wreath, 'intl-journey': journey, 'intl-why': why, 'intl-steps': steps, 'intl-howto-ld': howtoLd, 'intl-events': events,
  'intl-plans': plans, 'intl-offers-ld': offersLd, 'intl-faq': faq,
};
// tier names, for pages that name the plans in prose
export const INTL_TIER = Object.fromEntries(['saral', 'shubha', 'shahi'].map((t) => [t, planOf(t)?.name || TIER_LABEL[t]]));
