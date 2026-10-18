// Static HTML shared by every public page, put in at build (and in dev) by the `site-partials` plugin in
// vite.config.js: <!--@name--> or <!--@name:arg--> in a page becomes the markup below. Everything here is crawlable
// HTML (search and answer engines read it without JavaScript); the page scripts only refresh prices and tiers from
// the API. Plain module: Node runs it at build, never the browser.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { THEMES, BY_SLUG, CATEGORIES, FALLBACK_SITE, PLAN_DESC, PLAN_NE, TIER_LABEL, planForTier } from './themes.js';
import { phoneStill } from './stills.js';
import { OCCASIONS, STEPS, FEATURES, FAQ, faqItems, faqItemsOf, SITE_URL } from './content.mjs';
import { pageMeta } from './seo.mjs';
import { qrSvg } from '../studio/qr.js';
import { INTL_PARTIALS } from './intl.mjs';
import { LANDING_PARTIALS } from './landing.mjs';
import { EVENTS } from './intl-content.mjs';
import { NAP, SAME_AS, OWNER, FOUNDED, EQUIVALENTS, HTML_LANG } from './seo-site.mjs';
import { TRUST_PARTIALS } from './trust.mjs';

const here = import.meta.dirname;
const stills = JSON.parse(readFileSync(resolve(here, 'stills.json'), 'utf8'));
const thumbs = new Set(JSON.parse(readFileSync(resolve(here, 'thumbs.json'), 'utf8')));

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** `attrs`: extra attributes for the tag, e.g. the data-cms hooks the server fills from the studio's Content page */
export const jsonLd = (o, attrs = '') => `<script type="application/ld+json"${attrs}>${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
/** Content hooks (server/lib/content-render.js): the server writes the studio's Content edits into the built HTML at
 *  request time. `data-cms="..."` marks an element whose inner HTML it may replace; a `<!--cms:name-->...<!--/cms:name-->`
 *  pair marks a region (the FAQ with its JSON-LD) or an empty slot (announcement bar, social links). Markup stays the same. */
export const cmsSlot = (name, inner = '') => `<!--cms:${name}-->${inner}<!--/cms:${name}-->`;
const npr = new Intl.NumberFormat('en-IN');
export const rs = (n) => `Rs ${npr.format(n)}`;
const PLANS = FALLBACK_SITE.plans;
const CONTACT = { phone: '+977 980-6393298', tel: '+9779806393298', wa: '9779806393298', email: 'nimttoz@gmail.com' };

export const SIZES = {
  card: '(max-width: 599px) 40vw, (max-width: 1023px) 26vw, 220px',
  rail: '(max-width: 599px) 56vw, 260px',
  hero: '(max-width: 599px) 62vw, 340px',
  side: '(max-width: 599px) 40vw, 240px',
  modal: '72px',
};
const thumbSrc = (slug) => (thumbs.has(slug) ? `/site/thumbs/${slug}-480.webp` : `/themes/${slug}/thumb.jpg`);
export const pic = (slug) => phoneStill(stills, slug, thumbSrc(slug));
/** a phone frame with a design's still (the img is decorative unless `alt` is given) */
export function phone(slug, { sizes = SIZES.card, alt = '', eager = false, cls = '' } = {}) {
  const p = pic(slug);
  const set = p.srcset ? ` srcset="${p.srcset}" sizes="${sizes}"` : '';
  return `<span class="phone ${cls}"><img src="${p.src}"${set} width="390" height="844" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></span>`;
}

const I = {
  arrow: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  close: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  wa: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8c-1-.4-2.3-1.7-2.7-2.7l.8-1-1-2z"/></svg>',
  phone: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  mail: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3z"/><path d="M3 7l9 6 9-6"/></svg>',
  eye: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  plus: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
};
export const ICON = I;

const NAV = [
  ['designs', '/designs/', 'Designs'],
  ['occasions', '/occasions/', 'Occasions'],
  ['how', '/how-it-works/', 'How it works'],
  ['features', '/features/', 'Features'],
  ['pricing', '/pricing/', 'Pricing'],
  ['contact', '/contact/', 'Contact'],
];

/* ---------------- head ---------------- */
/** title, description, canonical, robots, hreflang, Open Graph and Twitter tags for a page (src/site/seo.mjs).
 *  The Nepal site (en-NP) and the international site (en) are separate sites that cross-link, so each page names only
 *  its own language (no hreflang twins). Home and FAQ pages carry a SpeakableSpecification (the H1 and [data-speak]). */
/** hreflang links for a page with a true equivalent on the other site (seo-site.mjs EQUIVALENTS), else none:
 *  en-NP -> the Nepal page, en -> the international page, x-default -> the international page. */
const INTL_EQ = Object.fromEntries(Object.entries(EQUIVALENTS).map(([np, intl]) => [intl, np]));
export function hreflangLinks(id) {
  const npId = EQUIVALENTS[id] ? id : INTL_EQ[id];
  if (!npId) return '';
  const np = pageMeta(npId).url, intl = pageMeta(EQUIVALENTS[npId]).url;
  return `\n  <link rel="alternate" hreflang="en-NP" href="${np}" />\n  <link rel="alternate" hreflang="en" href="${intl}" />\n  <link rel="alternate" hreflang="x-default" href="${intl}" />`;
}
function meta(id = 'home') {
  const m = pageMeta(id);
  const t = esc(m.title), d = esc(m.desc), a = esc(m.alt);
  const np = m.market === 'np';
  const lang = HTML_LANG[m.market] || 'en';
  return `<title>${t}</title>
  <meta name="description" content="${d}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <link rel="canonical" href="${m.url}" />${hreflangLinks(id)}
  <meta property="og:type" content="${m.ogType}" />
  <meta property="og:site_name" content="Nimtto" />
  <meta property="og:locale" content="${np ? 'en_NP' : 'en_US'}" />${np ? '\n  <meta property="og:locale:alternate" content="ne_NP" />' : ''}
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:url" content="${m.url}" />
  <meta property="og:image" content="${m.image}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${a}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${m.image}" />
  <meta name="twitter:image:alt" content="${a}" />
  ${jsonLd({ '@context': 'https://schema.org', '@type': m.type, '@id': `${m.url}#webpage`, url: m.url, name: m.title, description: m.desc, inLanguage: lang,
    isPartOf: { '@id': `${SITE_URL}/#web` }, publisher: { '@id': `${SITE_URL}/#org` },
    primaryImageOfPage: { '@type': 'ImageObject', url: m.image, width: 1200, height: 630 },
    ...(m.type === 'AboutPage' ? { about: { '@id': `${SITE_URL}/#org` }, mainEntity: { '@id': `${SITE_URL}/#org` } } : {}),
    ...(m.speak ? { speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '[data-speak]'] } } : {}) }, ` data-cms="webpage" data-cms-id="${esc(id)}" data-cms-site="${esc(m.market)}"`)}`;
}
/** The organisation and the website, the same on every page of both sites (no LocalBusiness: there is no shop).
 *  Name, contact and profiles come from seo-site.mjs (NAP, SAME_AS, OWNER, FOUNDED). */
export const ORG_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: NAP.name, alternateName: NAP.nameNe, url: `${SITE_URL}/`,
      logo: { '@type': 'ImageObject', '@id': `${SITE_URL}/#logo`, url: `${SITE_URL}/site/brand/nimtto-logo-512.png`, contentUrl: `${SITE_URL}/site/brand/nimtto-logo-512.png`, width: 512, height: 512, caption: 'Nimtto' },
      image: `${SITE_URL}/site/og/home.jpg`, email: NAP.email, telephone: NAP.tel,
      description: 'Nimtto makes animated invitation websites with RSVP, set up with you by a real designer: for Nepali weddings and family ceremonies in Nepal (nimtto.com, in rupees) and for weddings and every celebration worldwide (nimtto.com/international, in US dollars).',
      areaServed: [{ '@type': 'Country', name: 'Nepal' }, { '@type': 'Country', name: 'United States' }, { '@type': 'Country', name: 'United Kingdom' }, { '@type': 'Country', name: 'Canada' }, { '@type': 'Country', name: 'Australia' }, { '@type': 'Country', name: 'United Arab Emirates' }],
      knowsLanguage: ['en', 'ne'],
      address: { '@type': 'PostalAddress', addressCountry: NAP.country },
      contactPoint: [
        { '@type': 'ContactPoint', contactType: 'customer support', email: NAP.email, telephone: NAP.tel, availableLanguage: NAP.languages, areaServed: ['NP', 'US', 'GB', 'CA', 'AU', 'AE'] },
        { '@type': 'ContactPoint', contactType: 'sales', email: NAP.email, telephone: NAP.tel, availableLanguage: NAP.languages, url: `${SITE_URL}/contact/` },
      ],
      // digital invitations cannot be returned; refunds are case by case (/refunds/)
      hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: ['NP', 'US', 'GB', 'CA', 'AU', 'AE'], returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted', merchantReturnLink: `${SITE_URL}/refunds/` },
      ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
      ...(FOUNDED ? { foundingDate: FOUNDED } : {}),
      ...(OWNER.name ? { founder: { '@id': `${SITE_URL}/about/#owner` } } : {}),
    },
    { '@type': 'WebSite', '@id': `${SITE_URL}/#web`, url: `${SITE_URL}/`, name: 'Nimtto', alternateName: ['निम्तो', 'Nimtto International'], description: 'Animated invitation websites with RSVP: Nepali weddings and ceremonies in Nepal, and weddings and every celebration worldwide.', inLanguage: ['en', 'ne'], publisher: { '@id': `${SITE_URL}/#org` } },
  ],
};
function head(id = 'home') {
  const org = ORG_LD;
  return `${meta(id)}
  <meta name="theme-color" content="#FFFFFF" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="preload" href="/site/fonts/instrument-serif-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/site/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin />
  ${jsonLd(org, ' data-cms="org"')}`;
}

/* ---------------- header and footer ---------------- */
/** Terms, Privacy and Refunds: in every footer of both sites, and next to the PayPal buttons (src/site/payment.js) */
export const LEGAL_LINKS = '<p class="foot__legal"><a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a> · <a href="/refunds/">Refunds</a></p>';
function header(active = '') {
  const links = NAV.map(([k, href, t]) => `<a href="${href}"${k === active ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>${cmsSlot('announce')}
  <header class="nav" id="nav">
    <div class="wrap nav__in">
      <a class="nav__logo" href="/"><img src="/site/brand/nimtto-logo.svg" width="146" height="34" alt="Nimtto home" /></a>
      <nav class="nav__links" aria-label="Main">${links}</nav>
      <div class="nav__end">
        <nav class="mkt mkt--bar" aria-label="Choose your site"><a class="mkt__a" href="/international/" hreflang="en">International</a><a class="mkt__a" href="/" aria-current="page">Nepal</a></nav>
        <a class="nav__auth" href="/studio/" data-auth>Sign in</a>
        <a class="btn btn--accent btn--sm nav__order" href="/pricing/#plans" data-order>Order</a>
        <button class="nav__menu" id="menu-btn" type="button" aria-expanded="false" aria-controls="menu"><span class="nav__menu-i" aria-hidden="true"><i></i><i></i></span><span class="nav__menu-t">Menu</span></button>
      </div>
    </div>
    <div class="sheet" id="menu">
      <div class="sheet__top"><nav class="mkt mkt--sheet" aria-label="Choose your site"><a class="mkt__a" href="/international/" hreflang="en">International</a><a class="mkt__a" href="/" aria-current="page">Nepal</a></nav></div>
      <nav class="sheet__links" aria-label="Main">${links}</nav>
      <div class="sheet__end">
        <a class="btn btn--accent" href="/pricing/#plans" data-order>Order an invitation</a>
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
          <p data-cms="foot-blurb">Online invitations for Nepali weddings and every family occasion. Made in Nepal, in English and Nepali.</p>
          <p class="foot__ne" lang="ne">निम्तो, मायाले पठाइएको</p>${cmsSlot('foot-extra')}
        </div>
        ${col('Invitations', [['/wedding-invitation-nepal/', 'Wedding cards'], ['/designs/', 'All designs'], ['/occasions/', 'Occasions'], ['/occasions/bratabandha/', 'Bratabandha'], ['/occasions/pasni/', 'Pasni'], ['/occasions/gunyu-cholo/', 'Gunyu Cholo'], ['/nepali-abroad/', 'For families abroad']])}
        ${col('Nimtto', [['/about/', 'About us'], ['/how-it-works/', 'How it works'], ['/features/', 'Features'], ['/pricing/', 'Pricing'], ['/faq/', 'FAQ'], ['/contact/', 'Contact'], ['/international/', 'Nimtto International'], ['/credits/', 'Credits']])}
        <div class="foot__col"><p class="foot__h">Talk to us</p><ul>
          <li><a data-contact="wa" href="https://wa.me/${CONTACT.wa}" target="_blank" rel="noopener">WhatsApp <span data-contact="wa-text">${CONTACT.phone}</span></a></li>
          <li><a data-contact="email" href="mailto:${CONTACT.email}"><span data-contact="email-text">${CONTACT.email}</span></a></li>
          <li><a href="/studio/" data-auth>Sign in</a></li>
        </ul></div>
      </div>
      <div class="foot__base"><p>© <span data-year>2026</span> Nimtto · Made in Nepal</p>${LEGAL_LINKS}<p data-cms="foot-pay">Pay by Khalti, eSewa, bank QR or PayPal</p>${cmsSlot('trust')}</div>
    </div>
  </footer>`;
}

/* ---------------- dialogs: the watermarked preview and the order form ---------------- */
/** `dialogs:intl` on the international site: its occasions, "Phone number", and card or PayPal in the fine print */
function dialogs(variant = '') {
  const intl = variant === 'intl';
  const phoneLabel = intl ? 'Phone number' : 'WhatsApp number';
  const occ = intl ? EVENTS.map((o) => [o.id, o.en]) : OCCASIONS.map((o) => [o.id, o.en]);
  return `<dialog class="pv" id="pv" aria-labelledby="pv-name">
    <div class="pv__in">
      <div class="pv__phone"><iframe class="pv__frame" id="pv-frame" title="Design preview" src="about:blank" referrerpolicy="same-origin" allow="autoplay"></iframe></div>
      <div class="pv__body">
        <p class="eyebrow">Preview</p>
        <h2 class="pv__name" id="pv-name"></h2>
        <p class="pv__ne" id="pv-ne" lang="ne"></p>
        <p class="pv__text">Tap the opening, as a guest would. The names, dates and photos are only samples.</p>
        <div class="pv__acts">
          <a class="btn btn--accent" id="pv-order" href="/pricing/#plans">Order this design</a>
          <a class="link" id="pv-full" href="/designs/">Open full screen</a>
        </div>
      </div>
      <button type="button" class="round pv__close" id="pv-close" aria-label="Close the preview">${I.close}</button>
    </div>
  </dialog>
  <dialog class="om" id="om" aria-labelledby="om-title">
    <form class="om__form" id="om-form" novalidate>
      <header class="om__head">
        <div><p class="eyebrow" id="om-kick">Order</p><h2 class="om__title" id="om-title">Order your invitation</h2></div>
        <button type="button" class="round om__close" id="om-close" aria-label="Close the order form">${I.close}</button>
      </header>
      <div class="om__body">
        <fieldset class="om__sec">
          <legend class="om__lab">1. Plan</legend>
          <div class="om-plans" id="om-plans" role="radiogroup" aria-label="Plan"></div>
        </fieldset>
        <fieldset class="om__sec" id="om-design-sec">
          <legend class="om__lab">2. Design <span class="om__hint" id="om-design-hint">Pick one now, or decide later.</span></legend>
          <div class="om-designs" id="om-designs" role="radiogroup" aria-label="Design"></div>
          <p class="om-tier" id="om-tier" role="status" hidden></p>
        </fieldset>
        <fieldset class="om__sec" id="om-idea-sec" hidden>
          <legend class="om__lab">2. Your idea</legend>
          <div class="field">
            <label for="om-occasion">Occasion</label>
            <select id="om-occasion" name="occasion">${occ.map(([id, en]) => `<option value="${id}">${esc(en)}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label for="om-message">Tell us your idea <span class="req" aria-hidden="true">*</span></label>
            <textarea id="om-message" name="message" rows="3" maxlength="1800" placeholder="${intl ? 'Colors' : 'Colours'}, the feeling you want, the date, anything"></textarea>
            <p class="field__err" id="om-message-err" hidden>Please write a few words about your idea.</p>
          </div>
        </fieldset>
        <fieldset class="om__sec">
          <legend class="om__lab">3. Your details</legend>
          <p class="om-signed" id="om-signed" hidden></p>
          <div class="om-grid">
            <div class="field">
              <label for="om-name">Your name <span class="req" aria-hidden="true">*</span></label>
              <input id="om-name" name="name" type="text" autocomplete="name" maxlength="80" required />
              <p class="field__err" id="om-name-err" hidden>Please write your name.</p>
            </div>
            <div class="field">
              <label for="om-phone">${phoneLabel} <span class="req" aria-hidden="true">*</span></label>
              <input id="om-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="24" required />
              <p class="field__err" id="om-phone-err" hidden>Enter a valid phone number with country code.</p>
            </div>
          </div>
        </fieldset>
        <div class="hp" aria-hidden="true"><label for="om-website">Website</label><input id="om-website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>
      </div>
      <footer class="om__foot">
        <p class="om__err" id="om-err" role="alert" hidden></p>
        <div class="om__total"><span id="om-total-l">Total</span><b id="om-total">Rs 4,999</b></div>
        <button class="btn btn--accent btn--lg om__submit" id="om-submit" type="submit">Continue to payment</button>
        <p class="om__fine" id="om-fine">${intl ? 'Next, you pay by card or PayPal, in US dollars, on the payment page.' : 'Next, you pay by Khalti, eSewa, bank QR or PayPal on the payment page.'}</p>
      </footer>
    </form>
  </dialog>
  <dialog class="om om--auth" id="oa" aria-labelledby="oa-title">
    <form class="om__form" id="oa-form" novalidate>
      <header class="om__head">
        <div><p class="eyebrow">Before you order</p><h2 class="om__title" id="oa-title">Make your account</h2></div>
        <button type="button" class="round om__close" id="oa-close" aria-label="Close">${I.close}</button>
      </header>
      <div class="om__body">
        <p class="oa-lede" id="oa-lede">Your account keeps your order and payment in one place. Later you edit your invitation and read guest replies there.</p>
        <p class="om-signed" id="oa-note" role="status" hidden></p>
        <div class="oa-grid">
          <div class="field oa-up">
            <label for="oa-name">Your name <span class="req" aria-hidden="true">*</span></label>
            <input id="oa-name" name="name" type="text" autocomplete="name" maxlength="80" required />
            <p class="field__err" id="oa-name-err" hidden>Please write your name.</p>
          </div>
          <div class="field">
            <label for="oa-email">Email <span class="req" aria-hidden="true">*</span></label>
            <input id="oa-email" name="email" type="email" autocomplete="email" maxlength="254" required />
            <p class="field__err" id="oa-email-err" hidden>Please write a full email address.</p>
          </div>
          <div class="field oa-up">
            <label for="oa-phone">${phoneLabel} <span class="req" aria-hidden="true">*</span></label>
            <input id="oa-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="24" required />
            <p class="field__err" id="oa-phone-err" hidden>Enter a valid phone number with country code.</p>
          </div>
          <div class="field">
            <label for="oa-password">Password <span class="req" aria-hidden="true">*</span></label>
            <div class="pw"><input id="oa-password" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required aria-describedby="oa-password-hint" />
              <button type="button" class="pw__btn" id="oa-pw-toggle" aria-pressed="false" aria-controls="oa-password" aria-label="Show password">Show</button></div>
            <p class="field__hint oa-up" id="oa-password-hint">8 or more characters. You sign in with it later.</p>
            <p class="field__err" id="oa-password-err" hidden>Please choose a password of 8 or more characters.</p>
            <p class="oa-forgot oa-in" hidden><a class="link" href="/studio/forgot">Forgot password?</a></p>
          </div>
        </div>
      </div>
      <footer class="om__foot oa__foot">
        <p class="om__err" id="oa-err" role="alert" hidden></p>
        <button class="btn btn--accent btn--lg oa__submit" id="oa-submit" type="submit">Make account and continue</button>
        <p class="oa-switch"><span id="oa-switch-t">Already have an account?</span> <button type="button" class="oa-switch__btn" id="oa-switch">Sign in</button></p>
      </footer>
    </form>
  </dialog>`;
}

/* ---------------- the lotus (THE LOTUS OPENS, after the Shree design) ---------------- */
const RINGS = [
  { n: 16, r: 78, L: 100, W: 50, off: 0 },
  { n: 12, r: 56, L: 86, W: 50, off: 15 },
  { n: 8, r: 34, L: 66, W: 42, off: 22.5 },
];
const f2 = (n) => Math.round(n * 100) / 100;
const petal = (L, W) => `M0 0C${f2(W * 0.62)} ${f2(-L * 0.18)} ${f2(W * 0.56)} ${f2(-L * 0.7)} 0 ${-L}C${f2(-W * 0.56)} ${f2(-L * 0.7)} ${f2(-W * 0.62)} ${f2(-L * 0.18)} 0 0Z`;
function lotus() {
  const rays = Array.from({ length: 32 }, (_, i) => `<line y1="-92" y2="${i % 2 ? -150 : -168}" transform="rotate(${f2((i * 360) / 32 + 5.625)})"/>`).join('');
  const beads = Array.from({ length: 48 }, (_, i) => `<circle r="${i % 2 ? 1.1 : 1.9}" cy="-186" transform="rotate(${f2((i * 360) / 48)})"/>`).join('');
  const ring = (R, k) => `<g class="lo-ring" data-ring="${k}">${Array.from({ length: R.n }, (_, i) => `<g transform="rotate(${f2((i * 360) / R.n + R.off)}) translate(0 ${-R.r})"><g class="lo-p">`
    + `<path class="lo-p__b" d="${petal(R.L, R.W)}" fill="url(#lo-g${k})"/><path class="lo-p__in" d="${petal(R.L * 0.66, R.W * 0.5)}"/><path class="lo-p__v" d="M0 ${f2(-R.L * 0.12)}V${f2(-R.L * 0.6)}"/></g></g>`).join('')}</g>`;
  const seeds = [[0, 0], ...Array.from({ length: 6 }, (_, i) => [f2(Math.sin((i * Math.PI) / 3) * 14), f2(-Math.cos((i * Math.PI) / 3) * 14)])].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('');
  const grads = [['#B5173F', '#E2708C', '#FBD3DC'], ['#A8123A', '#DA5F7E', '#F8C3CF'], ['#9A1033', '#CF4E6F', '#F4B4C3']]
    .map((c, k) => `<linearGradient id="lo-g${k}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>`).join('');
  return `<svg class="lo" viewBox="-200 -200 400 400" aria-hidden="true" focusable="false"><defs>${grads}</defs>
    <g class="lo-frame"><g class="lo-rays">${rays}</g><circle class="lo-c1" r="178"/><circle class="lo-c2" r="194"/><g class="lo-beads">${beads}</g></g>
    ${ring(RINGS[0], 0)}${ring(RINGS[1], 1)}<g class="lo-pod"><circle class="lo-podc" r="30"/><g class="lo-seeds">${seeds}</g></g>${ring(RINGS[2], 2)}</svg>`;
}


/* ---------------- designs ---------------- */
const tierPlan = (tier) => planForTier(PLANS, tier);
/** a tier's (plan's) name, kept live: src/site/plans.js fills [data-tier-name] / [data-plan-name] with the planner's names */
export const tn = (tier) => `<span data-tier-name="${tier}">${esc(TIER_LABEL[tier])}</span>`;
export const pn = (id) => `<span data-plan-name="${id}">${esc(PLANS.find((p) => p.id === id)?.name || id)}</span>`;
function tierTag(tier) {
  const p = tierPlan(tier);
  return `<span class="tier tier--${tier}" data-tier-tag="${tier}">${TIER_LABEL[tier]}</span><span class="dcard__price" data-tier-price="${tier}">${p ? `from ${rs(p.price)}` : ''}</span>`;
}
function designCard(t, i) {
  const cat = CATEGORIES[t.cat];
  return `<li class="dcard" data-slug="${t.slug}" data-cat="${t.cat}" data-tier="${t.tier}" data-faiths="${(t.religions || []).join(' ')}">
    <a class="dcard__pic" href="/designs/${t.slug}/" style="--tint:${cat.tint}" tabindex="-1" aria-hidden="true">${phone(t.slug, { eager: false })}</a>
    <div class="dcard__body">
      <h3 class="dcard__name"><a href="/designs/${t.slug}/">${esc(t.name)}</a> <span class="dcard__ne" lang="ne">${esc(t.ne)}</span></h3>
      <p class="dcard__meta">${tierTag(t.tier)}</p>
      <p class="dcard__desc">${esc(t.concept)}</p>
      <div class="dcard__acts">
        <a class="btn btn--accent btn--sm" href="/pricing/?design=${t.slug}#plans" data-order data-design="${t.slug}" aria-label="Order ${esc(t.name)}">Order</a>
        <a class="btn btn--ghost btn--sm" href="/${t.slug}/?showcase=1" data-preview="${t.slug}" aria-label="Preview ${esc(t.name)}">${I.eye}Preview</a>
      </div>
    </div>
  </li>`;
}
function designsGrid() {
  return THEMES.map(designCard).join('');
}
function designsLd() {
  return jsonLd({
    '@context': 'https://schema.org', '@type': 'ItemList', name: `Wedding Invitation Designs: ${THEMES.length} Nepali Digital Cards`, numberOfItems: THEMES.length,
    itemListElement: THEMES.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/designs/${t.slug}/`, name: `${t.name} Wedding Invitation Design` })),
  });
}
const RAIL = ['laali', 'gurans', 'mahal', 'swayambar', 'dhaka', 'hariyo', 'mehendi', 'kham', 'sindoor', 'rajdwar', 'shree', 'mala'];
function rail() {
  return RAIL.map((s) => BY_SLUG[s]).map((t) => `<li class="rcard" data-slug="${t.slug}">
    <a class="rcard__pic" href="/designs/${t.slug}/" style="--tint:${CATEGORIES[t.cat].tint}">${phone(t.slug, { sizes: SIZES.rail, alt: `The ${t.name} design: ${t.alt}` })}</a>
    <p class="rcard__name"><a href="/designs/${t.slug}/">${esc(t.name)}</a> <span lang="ne">${esc(t.ne)}</span></p>
    <p class="rcard__meta">${tierTag(t.tier)}</p>
  </li>`).join('');
}
function designCount() { return String(THEMES.length); }

/* ---------------- occasions ---------------- */
function occasions(variant = 'full') {
  return OCCASIONS.map((o, i) => {
    const cta = o.designs
      ? `<a class="occ__cta" href="/designs/">See ${THEMES.length} designs ${I.arrow}</a>`
      : `<a class="occ__cta" href="/pricing/?plan=custom#plans" data-order data-plan="custom" data-occasion="${o.id}">${o.id === 'custom' ? 'Tell us your idea' : 'Ask for a design'} ${I.arrow}</a>`;
    const art = o.designs ? `<span class="occ__phones" aria-hidden="true">${phone('laali', { sizes: '140px' })}${phone('gurans', { sizes: '140px' })}${phone('mahal', { sizes: '140px' })}</span>` : '';
    // the wedding card is the big one on desktop: give it the ceremonies and a few facts (hidden on phones)
    const more = o.designs ? `<ul class="occ__chips">${[['Mehendi', 'मेहेन्दी'], ['Haldi', 'हल्दी'], ['Janti', 'जन्ती'], ['Wedding', 'विवाह'], ['Reception', 'स्वागत']].map(([en, ne]) => `<li>${en} <span lang="ne">${ne}</span></li>`).join('')}</ul>
      <ul class="occ__facts"><li><b>${THEMES.length}</b><span>designs</span></li><li><b data-plan-price="saral">Rs 2,999</b><span>starting price</span></li><li><b>EN · <span lang="ne">ने</span></b><span>English and Nepali</span></li></ul>` : '';
    return `<li class="occ occ--${o.id}${o.designs ? ' occ--lead' : ''}" id="${variant === 'full' ? o.id : `occ-${o.id}`}">
      <p class="occ__ne" lang="ne">${esc(o.ne)}${o.alt ? `<span> · ${esc(o.alt)}</span>` : ''}</p>
      <h3 class="occ__en">${o.page ? `<a href="${o.page}">${esc(o.en)}</a>` : esc(o.en)}</h3>
      <p class="occ__line">${esc(o.line)}</p>
      ${more}
      <p class="occ__kind">${o.designs ? 'Ready-made designs' : 'Designed for you'}</p>
      ${cta}${art}
    </li>`;
  }).join('');
}

/* ---------------- steps and features ---------------- */
function steps() {
  return STEPS.map((s, i) => `<li class="step"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><h3 class="step__t">${esc(s.t)}</h3><p class="step__d">${esc(s.d)}</p></li>`).join('');
}
const VIS = {
  dates: '<div class="fx fx--dates" aria-hidden="true"><span class="fx__ne" lang="ne">माघ २९, २०८३</span><span class="fx__en">Friday, 12 February 2027</span></div>',
  lang: '<div class="fx fx--lang" aria-hidden="true"><span class="fx__pill"><b>EN</b><i lang="ne">ने</i></span><span class="fx__big" lang="ne">शुभ विवाह</span></div>',
  events: '<ul class="fx fx--events" aria-hidden="true"><li style="--c:#E0A030"><b>Haldi</b><span>Thu · 10:00</span></li><li style="--c:#D9567A"><b>Janti</b><span>Fri · 14:00</span></li><li style="--c:#A8123A"><b>Wedding</b><span>Fri · 18:30</span></li><li style="--c:#22141A"><b>Reception</b><span>Sat · 19:00</span></li></ul>',
  rsvp: '<div class="fx fx--rsvp" aria-hidden="true"><span class="fx__num">148</span><span class="fx__lbl">guests coming</span><span class="fx__bar"><i style="--w:74%"></i></span><span class="fx__sub">Janti 62 · Wedding 148 · Reception 131</span></div>',
  music: '<div class="fx fx--music" aria-hidden="true"><span class="fx__play"></span><span class="fx__wave">' + Array.from({ length: 28 }, (_, i) => `<i style="--h:${20 + Math.round(Math.abs(Math.sin(i * 1.7)) * 70)}%"></i>`).join('') + '</span></div>',
  opening: `<div class="fx fx--opening" aria-hidden="true">${phone('dhaka', { sizes: '200px' })}</div>`,
  photos: `<div class="fx fx--photos" aria-hidden="true">${phone('chitra', { sizes: '160px' })}${phone('swayambar', { sizes: '160px' })}</div>`,
  share: '<div class="fx fx--share" aria-hidden="true"><span class="fx__bubble"><img src="/site/og.jpg" width="1200" height="630" alt="" loading="lazy" decoding="async" /><b>Binisha &amp; Ujjwal · Shubha Bibaha</b><span>nimtto.com</span></span></div>',
  faiths: '<div class="fx fx--faiths" aria-hidden="true"><span lang="ne">शुभ विवाह</span><span>Nikah</span><span>Holy Matrimony</span></div>',
};
function features(set = 'all') {
  const ids = set === 'home' ? ['dates', 'events', 'rsvp', 'opening', 'music', 'share', 'lang'] : FEATURES.map((x) => x.id);
  return ids.map((id) => FEATURES.find((x) => x.id === id)).map((x) => `<li class="feat feat--${x.id}">${VIS[x.id] || ''}<div class="feat__txt"><h3 class="feat__t">${esc(x.t)}</h3><p class="feat__d">${esc(x.d)}</p></div></li>`).join('');
}

/* ---------------- plans ---------------- */
function plans() {
  return PLANS.map((p) => `<li class="plan${p.highlight ? ' plan--hi' : ''}" data-plan-id="${p.id}">
    ${p.highlight ? '<p class="plan__flag">Most chosen</p>' : ''}
    <div class="plan__top"><h3 class="plan__name">${esc(p.name)}</h3><span class="plan__ne" lang="ne">${esc(p.nameNe || PLAN_NE[p.id] || '')}</span></div>
    <p class="plan__price">${p.from ? '<span class="plan__from">from</span>' : ''}<span class="plan__num">${rs(p.price)}</span></p>
    <p class="plan__usd">or USD ${p.priceUsd} from abroad</p>
    <p class="plan__desc">${esc(p.note || PLAN_DESC[p.id] || '')}</p>
    <a class="btn ${p.highlight ? 'btn--accent' : 'btn--ghost'} plan__btn" href="/pricing/?plan=${p.id}#plans" data-order data-plan="${p.id}">Choose ${esc(p.name)}</a>
    <ul class="plan__feats">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  </li>`).join('');
}
function offersLd() {
  return jsonLd({
    '@context': 'https://schema.org', '@type': 'Service', '@id': `${SITE_URL}/#service`, name: 'Online Invitation Website',
    serviceType: 'Digital invitation card and invitation website', provider: { '@id': `${SITE_URL}/#org` },
    areaServed: [{ '@type': 'Country', name: 'Nepal' }, 'Worldwide'],
    description: 'Invitation websites for Nepali weddings, engagements, bratabandha, gunyu cholo, pasni, nwaran, birthdays, janku and receptions, in English and Nepali, with RSVP, music, maps and Nepali dates.',
    hasOfferCatalog: {
      '@type': 'OfferCatalog', name: 'Nimtto plans',
      itemListElement: PLANS.map((p) => ({
        '@type': 'Offer', name: `${p.name} plan`, price: String(p.price), priceCurrency: 'NPR', url: `${SITE_URL}/pricing/`, availability: 'https://schema.org/InStock',
        description: [p.note || PLAN_DESC[p.id], ...p.features].filter(Boolean).join('. '),
        ...(p.from ? { priceSpecification: { '@type': 'PriceSpecification', minPrice: String(p.price), priceCurrency: 'NPR' } } : {}),
      })),
    },
  });
}

/** the designs in each tier, as small phones (pricing page) */
function tiers() {
  const blurb = { saral: 'In every plan.', shubha: `In ${tn('shubha')} and ${tn('shahi')}.`, shahi: `In ${tn('shahi')}.` };
  return ['saral', 'shubha', 'shahi'].map((tier) => {
    const list = THEMES.filter((t) => t.tier === tier);
    const p = tierPlan(tier);
    return `<li class="tierrow"><div class="tierrow__h"><span class="tier tier--${tier}" data-tier-tag="${tier}">${TIER_LABEL[tier]}</span><h3>${list.length} designs</h3><p>${blurb[tier]} <span data-tier-price="${tier}">${p ? `from ${rs(p.price)}` : ''}</span></p></div>
      <div class="tierrow__list">${list.map((t) => `<a href="/designs/${t.slug}/">${phone(t.slug, { sizes: '82px' })}<span>${esc(t.name)}</span></a>`).join('')}</div></li>`;
  }).join('');
}

/* ---------------- FAQ ---------------- */
/** The questions as open/close rows (answers in the HTML) and their FAQPage JSON-LD. items: { q, a, qHtml?, aHtml? } */
export function faqBlock(items, { ld = true, openFirst = true } = {}) {
  const html = items.map((x, i) => `<details class="qa"${openFirst && i === 0 ? ' open' : ''}><summary class="qa__q"><span>${x.qHtml ?? esc(x.q)}</span><i aria-hidden="true"></i></summary><div class="qa__a"><p>${x.aHtml ?? esc(x.a)}</p></div></details>`).join('');
  return `<div class="faq__list">${html}</div>${ld ? faqLd(items) : ''}`;
}
export const faqLd = (items) => jsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) });
/** Grouped questions ([[heading, items]]): a heading per group and one FAQPage for all of them (the FAQ pages). */
export const faqGroups = (all) => all.map(([h, items], g) => `<section class="faq__group" aria-labelledby="fg-${g}"><h2 class="h3 faq__gh" id="fg-${g}">${esc(h)}</h2>${faqBlock(items, { ld: false, openFirst: g === 0 })}</section>`).join('')
  + faqLd(all.flatMap(([, items]) => items));
/** `faq:<set>`; the FAQ page's grouped set renders a heading per group and one FAQPage for all of them. The whole
 *  block (HTML and JSON-LD) is the `faq` content region: an edited FAQ replaces both together (server/lib/content-render.js). */
function faq(set = 'home') {
  const groups = FAQ[set];
  if (Array.isArray(groups?.[0])) return cmsSlot('faq', faqGroups(groups.map(([h, keys]) => [h, faqItemsOf(keys)])));
  return cmsSlot('faq', faqBlock(faqItems(set)));
}

/** A real, scannable QR code as inline SVG (src/studio/qr.js): `qr:https://nimtto.com/go`. Only our own URLs. */
function qr(url = '') {
  if (!/^https:\/\/nimtto\.com\/[a-z0-9/-]*$/.test(url)) throw new Error(`qr partial: unexpected URL ${url}`);
  return qrSvg(url, { dark: '#2A1A1D', quiet: 2 }).replace('<svg ', `<svg class="qr" role="img" aria-label="QR code for ${esc(url.replace(/^https:\/\//, ''))}" `);
}

/** BreadcrumbList JSON-LD for a sub page: `crumbs:Designs|/designs/` or several levels, `crumbs:Occasions|/occasions/|Pasni|/occasions/pasni/`.
 *  Pages under /international/ start at the international home. */
export function crumbsLd(pairs) {
  const intl = pairs[0]?.[1]?.startsWith('/international/');
  const list = [[intl ? 'Nimtto International' : 'Home', intl ? '/international/' : '/'], ...pairs];
  return jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE_URL}${path}` })) });
}
function crumbs(arg = '') {
  const parts = arg.split('|');
  const pairs = [];
  for (let i = 0; i + 1 < parts.length; i += 2) pairs.push([parts[i], parts[i + 1]]);
  return crumbsLd(pairs);
}

export const PARTIALS = { ...TRUST_PARTIALS, head, meta, header, footer, dialogs, lotus, designs: designsGrid, 'designs-ld': designsLd, rail, count: designCount, occasions, steps, features, plans, tiers, 'offers-ld': offersLd, faq, crumbs, qr, ...INTL_PARTIALS, ...LANDING_PARTIALS };

/** Replaces every <!--@name--> / <!--@name:arg--> in a page. */
export function renderPartials(html) {
  // <html lang> follows the page's site (seo-site.mjs HTML_LANG): en-NP for Nepal, en-US for the international site
  const id = /<!--@(?:head|meta):([^>]*?)-->/.exec(html)?.[1];
  const lang = id ? HTML_LANG[pageMeta(id).market] : null;
  if (lang) html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  return html.replace(/<!--@([a-z-]+)(?::([^>]*?))?-->/g, (m, name, arg) => (PARTIALS[name] ? PARTIALS[name](arg) : m));
}
