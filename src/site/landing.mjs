// The landing pages of both sites (src/site/landings.mjs): one layout, the site's own components (the design page's
// stage, the bento, rail cards, steps, FAQ, closing) in each site's palette. Partials:
//   <!--@landing:<id>-->      the page body          <!--@land-ld:<id>-->   its JSON-LD (breadcrumbs, offers, designs)
//   <!--@crossband:np|intl-->  "Living abroad?" on Nepal pages, "Getting married in Nepal?" on international pages
//   <!--@legal-header-->, <!--@legal-footer-->      the neutral header and footer of the legal pages
// Plain module: Node runs it at build, never the browser.
import { LANDINGS } from './landings.mjs';
import { BY_SLUG, CATEGORIES, FALLBACK_SITE, planForTier, TIER_LABEL } from './themes.js';
import { fillPlans, SITE_URL } from './content.mjs';
import { fillUsd, INTL_PAGES, INTL_BASE } from './intl-content.mjs';
import { ARTWORK, artSrc, STYLE_LABEL } from './intl-designs.js';
import { intlPlans, usdText } from './intl-plans.js';
import { PAGES } from './seo.mjs';
import { esc, jsonLd, phone, faqBlock, crumbsLd, rs, ICON, LEGAL_LINKS } from './partials.mjs';
import { iphone, planOf as intlPlan } from './intl.mjs';

const NP_PLANS = FALLBACK_SITE.plans;
const I_PLANS = intlPlans(FALLBACK_SITE.plans);
const fill = (l, s, html = true) => (l.market === 'intl' ? fillUsd(s, html) : fillPlans(fillUsd(s, false), html));
const pageName = (id) => (id === 'intl/occasions' ? 'Occasions' : id === 'occasions' ? 'Occasions' : '');
const parentPath = (id) => (id?.startsWith('intl/') ? INTL_PAGES[id]?.path : PAGES[id]?.path);

/** [name, path] from the site home to this page (the home itself is added by crumbsLd) */
function trail(l) {
  const out = [];
  if (l.parent) out.push([pageName(l.parent), parentPath(l.parent)]);
  out.push([l.name, l.path]);
  return out;
}

/* ---------------- the stage: a real design, an international artwork, or a sample invitation ---------------- */
function mock(m, market) {
  return `<span class="phone lp__phone"><span class="mock${market === 'intl' ? ' mock--intl' : ''}" role="img" aria-label="${esc(`A sample invitation: ${m.kick} ${m.name}, ${m.when}, ${m.where}`)}">
      ${m.ne ? `<span class="mock__ne" lang="ne">${esc(m.ne)}</span>` : '<span class="mock__orn" aria-hidden="true"></span>'}
      <span class="mock__kick">${esc(m.kick)}</span>
      <span class="mock__name">${esc(m.name)}</span>
      <span class="mock__rule" aria-hidden="true"></span>
      <span class="mock__when">${esc(m.when)}</span>
      <span class="mock__where">${esc(m.where)}</span>
      <span class="mock__btn">RSVP</span>
      <span class="mock__map" aria-hidden="true"><i></i></span>
    </span></span>`;
}
function stage(l) {
  const h = l.hero || {};
  if (h.design) {
    const t = BY_SLUG[h.design];
    return `<div class="dp__stage" style="--tint:${CATEGORIES[t.cat].tint}">${phone(h.design, { sizes: '(max-width: 899px) 58vw, 300px', alt: `The ${t.name} design on a phone: ${t.alt}`, eager: true, cls: 'dp__phone' })}
        <a class="dp__peek btn btn--ghost btn--sm" href="/${h.design}/?showcase=1" data-preview="${h.design}">${ICON.eye}See it move</a></div>`;
  }
  if (h.art) {
    const d = ARTWORK.find((x) => x.id === h.art);
    return `<div class="dp__stage" style="--tint:#EAF1E7"><span class="phone dp__phone"><img src="${artSrc(h.art, 800)}" srcset="${artSrc(h.art, 480)} 480w, ${artSrc(h.art, 800)} 800w, ${artSrc(h.art, 1170)} 1170w" sizes="(max-width: 899px) 58vw, 300px" width="390" height="844" alt="${esc(l.alt || (d ? `The ${d.name} design` : ''))}" fetchpriority="high" decoding="async" /></span></div>`;
  }
  return `<div class="dp__stage lp__stage">${mock(h.mock, l.market)}<p class="lp__sample">A sample. We design yours for your occasion.</p></div>`;
}

/** the price line under the H1 */
function priceLine(l) {
  if (l.offer === 'custom') {
    return l.market === 'intl'
      ? `<p class="dp__tier"><span class="dp__price">from <span data-usd-from="custom">${usdText(I_PLANS.find((p) => p.id === 'custom')?.usd ?? 199)}</span></span><span class="dp__per">Designed for your occasion · we reply with a price in one business day · paid once</span></p>`
      : `<p class="dp__tier"><span class="dp__price">from <span data-plan-price="custom">${rs(NP_PLANS.find((p) => p.id === 'custom')?.price ?? 11111)}</span></span><span class="dp__per">Designed for your family · we reply with a price in one business day · paid once</span></p>`;
  }
  return l.market === 'intl'
    ? `<p class="dp__tier"><span class="dp__price">from <span data-usd-from="saral">${usdText(I_PLANS[0]?.usd ?? 49)}</span></span><span class="dp__per">Paid once, by card or PayPal · no monthly fees</span></p>`
    : `<p class="dp__tier"><span class="dp__price">from <span data-plan-price="saral">${rs(NP_PLANS[0]?.price ?? 2999)}</span></span><span class="dp__per">Paid once, by Khalti, eSewa, bank QR or PayPal · no monthly fee</span></p>`;
}

function buttons(l) {
  const intl = l.market === 'intl';
  const pricing = intl ? `${INTL_BASE}pricing/` : '/pricing/';
  if (l.offer === 'custom') {
    return `<a class="btn btn--accent btn--lg" href="${pricing}?plan=custom&amp;occasion=${l.event}#plans" data-order data-plan="custom" data-occasion="${l.event}">${intl ? 'Ask for this invitation' : 'Ask for your card'}</a>
          <a class="btn btn--ghost btn--lg" href="${intl ? INTL_PAGES['intl/how'].path : '/how-it-works/'}">How it works</a>`;
  }
  const designs = l.catalog === 'np' || !intl ? '#lp-designs' : INTL_PAGES['intl/designs'].path;
  return `<a class="btn btn--accent btn--lg" href="${pricing}#plans" data-order>${intl ? 'Get started' : 'Order your card'}</a>
          <a class="btn btn--ghost btn--lg" href="${l.designs ? '#lp-designs' : designs}">See the designs</a>`;
}

/* ---------------- the designs row ---------------- */
function designRow(l) {
  if (!l.designs) return '';
  const intl = l.market === 'intl';
  let cards;
  if (l.designs.list === 'art') {
    cards = ARTWORK.map((d) => `<li class="rcard" data-slug="${d.id}">
      <a class="rcard__pic" href="${INTL_PAGES['intl/designs'].path}#d-${d.id}" style="--tint:#EAF1E7">${iphone(d.id, { sizes: '(max-width: 599px) 56vw, 236px', alt: `The ${d.name} design: ${d.alt}` })}</a>
      <p class="rcard__name"><a href="${INTL_PAGES['intl/designs'].path}#d-${d.id}">${esc(d.name)}</a> <span>${STYLE_LABEL[d.style]}</span></p>
      <p class="rcard__meta"><span class="tier tier--${d.tier}">${esc(intlPlan(d.tier)?.name || '')}</span><span class="dcard__price" data-usd-from="${d.tier}">from ${usdText(intlPlan(d.tier)?.usd ?? 49)}</span></p></li>`).join('');
  } else {
    cards = l.designs.list.map((s) => BY_SLUG[s]).filter(Boolean).map((t) => {
      const href = intl ? `/${t.slug}/?showcase=1` : `/designs/${t.slug}/`;
      const price = intl ? `<span class="dcard__price" data-usd-from="${t.tier}">from ${usdText(intlPlan(t.tier)?.usd ?? 49)}</span>` : `<span class="dcard__price" data-tier-price="${t.tier}">from ${rs(planForTier(NP_PLANS, t.tier)?.price ?? 2999)}</span>`;
      const tier = intl ? esc(intlPlan(t.tier)?.name || '') : `<span data-tier-name="${t.tier}">${esc(TIER_LABEL[t.tier])}</span>`;
      return `<li class="rcard" data-slug="${t.slug}">
      <a class="rcard__pic" href="${href}"${intl ? ` data-preview="${t.slug}"` : ''} style="--tint:${CATEGORIES[t.cat].tint}">${phone(t.slug, { sizes: '(max-width: 599px) 56vw, 236px', alt: `The ${t.name} design: ${t.alt}` })}</a>
      <p class="rcard__name"><a href="${href}"${intl ? ` data-preview="${t.slug}"` : ''}>${esc(t.name)}</a>${intl ? '' : ` <span lang="ne">${esc(t.ne)}</span>`}</p>
      <p class="rcard__meta"><span class="tier tier--${t.tier}">${tier}</span>${price}</p></li>`;
    }).join('');
  }
  const all = intl ? (l.catalog === 'np' ? '' : `<a class="btn btn--ghost" href="${INTL_PAGES['intl/designs'].path}">See all designs</a>`) : '<a class="btn btn--ghost" href="/designs/">See all designs</a>';
  return `<section class="sec" id="lp-designs" aria-labelledby="lp-d-h">
      <div class="wrap">
        <header class="shead shead--split" data-rv>
          <div><p class="eyebrow">Designs</p><h2 class="h2" id="lp-d-h">${esc(l.designs.title)}</h2></div>
          <div class="rail__side"><p class="lede">${intl && l.catalog === 'np' ? 'Tap a design to see it move, with sample names. Each one works in English and Nepali.' : 'Each design opens like a real card and comes with every detail and an RSVP.'}</p>${all}</div>
        </header>
      </div>
      <div class="rail__view"><ul class="rail__track lp__rail">${cards}</ul></div>
    </section>`;
}

/* ---------------- the body ---------------- */
function body(id) {
  const l = LANDINGS[id];
  if (!l) throw new Error(`landing: no page ${id}`);
  const intl = l.market === 'intl';
  const crumbs = [[intl ? 'Home' : 'Home', intl ? INTL_BASE : '/'], ...trail(l)];
  const crumbHtml = crumbs.map(([n, p], i) => (i === crumbs.length - 1 ? `<li><span aria-current="page">${esc(n)}</span></li>` : `<li><a href="${p}">${esc(n)}</a></li>`)).join('');
  const steps = (l.steps || []).map((s, i) => `<li class="step"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><h3 class="step__t">${esc(s.t)}</h3><p class="step__d">${esc(s.d)}</p></li>`).join('');
  const faqItems = (l.faq || []).map(([q, a]) => ({ q, a: fill(l, a, false), aHtml: fill(l, a, true) }));
  const related = (l.related || []).map((r) => LANDINGS[r]).filter(Boolean);
  const links = [...(l.links || []), ...related.map((r) => [r.h1.replace(/<[^>]+>/g, ''), r.path])];
  return `<div class="wrap">
      <nav class="crumbs dp-crumbs" aria-label="Breadcrumb"><ol>${crumbHtml}</ol></nav>
    </div>

    <section class="wrap dp lp" aria-labelledby="lp-h">
      ${stage(l)}
      <div class="dp__info">
        <p class="eyebrow">${esc(l.eyebrow)}${l.ne ? ` <span class="lp__ne" lang="ne">${esc(l.ne)}</span>` : ''}</p>
        <h1 class="display dp__name lp__h" id="lp-h">${l.h1}</h1>
        <p class="dp__desc lp__lede" data-speak>${fill(l, l.lede)}</p>
        ${priceLine(l)}
        <div class="dp__btns">${buttons(l)}</div>
        <ul class="dp__notes">${(l.notes || []).map((n) => `<li>${fill(l, n)}</li>`).join('')}</ul>
      </div>
    </section>

    <section class="sec sec--blush" aria-labelledby="lp-inc-h">
      <div class="wrap">
        <header class="shead" data-rv><p class="eyebrow">What’s included</p><h2 class="h2" id="lp-inc-h">${esc(l.includesTitle)}</h2></header>
        <ul class="lp-inc">${(l.includes || []).map(([t, d], i) => `<li class="lp-inc__i"><span class="lp-inc__n">${String(i + 1).padStart(2, '0')}</span><h3 class="lp-inc__t">${esc(t)}</h3><p class="lp-inc__d">${fill(l, d)}</p></li>`).join('')}</ul>
      </div>
    </section>

    ${designRow(l)}

    <section class="sec" aria-label="Good to know">
      <div class="wrap lp-ans">
        ${(l.answers || []).map(([q, a]) => `<article class="lp-ans__i"><h2 class="h3 lp-ans__q">${esc(q)}</h2><p class="lp-ans__a">${fill(l, a)}</p></article>`).join('')}
        <aside class="lp-ideas" aria-labelledby="lp-ideas-h"><h2 class="lp-ideas__h" id="lp-ideas-h">${esc(l.ideasTitle)}</h2><ul class="occ__chips lp-ideas__list">${(l.ideas || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></aside>
      </div>
    </section>

    <section class="sec sec--blush" aria-labelledby="lp-how-h">
      <div class="wrap">
        <header class="shead shead--split" data-rv><div><p class="eyebrow">How it works</p><h2 class="h2" id="lp-how-h">Four steps. <em>No app.</em></h2></div><p class="lede">${intl ? 'A real designer sets it up with you, and you check every change before guests see it.' : 'We make it with you on WhatsApp, in English or Nepali. You see every change first.'}</p></header>
        <ol class="steps">${steps}</ol>
      </div>
    </section>

    <section class="sec" aria-labelledby="faq-h">
      <div class="wrap faq">
        <header class="shead"><p class="eyebrow">Questions</p><h2 class="h2" id="faq-h">Good to <em>know.</em></h2></header>
        ${faqBlock(faqItems)}
      </div>
    </section>

    ${links.length ? `<section class="sec sec--blush sec--tight" aria-labelledby="lp-more-h">
      <div class="wrap">
        <h2 class="h3" id="lp-more-h">${intl ? 'More invitations' : 'More from Nimtto'}</h2>
        <ul class="lp-links">${links.map(([t, p]) => `<li><a class="link" href="${p}">${esc(t)} ${ICON.arrow}</a></li>`).join('')}</ul>
      </div>
    </section>` : ''}

    ${crossband(l.cross === 'intl' ? 'np-abroad' : intl ? 'intl' : 'np')}

    <section class="sec" aria-labelledby="lp-close-h">
      <div class="wrap">
        <div class="closing">
          <h2 class="h2 closing__h" id="lp-close-h">${intl ? 'Let’s make your invitation.' : 'Let’s make your card.'}</h2>
          <p class="closing__p">${intl ? 'Tell us about your day. A real person replies, usually within one business day.' : 'Tell us about your day. We reply on WhatsApp, in English or Nepali.'}</p>
          <div class="closing__acts">${buttons(l).replace(/btn--accent/, 'btn--white').replace(/btn--ghost/, 'btn--line-w')}</div>
        </div>
      </div>
    </section>`;
}

/** the page's JSON-LD: breadcrumbs, the service with its offers in the page's currency, and the designs it shows */
function ld(id) {
  const l = LANDINGS[id];
  const intl = l.market === 'intl';
  const cur = intl ? 'USD' : 'NPR';
  const plans = intl ? I_PLANS.map((p) => ({ id: p.id, name: p.name, price: p.usd, from: p.from })) : NP_PLANS.map((p) => ({ id: p.id, name: p.name, price: p.price, from: p.from }));
  const offers = (l.offer === 'custom' ? plans.filter((p) => p.id === 'custom') : plans.filter((p) => p.id !== 'custom')).map((p) => ({
    '@type': 'Offer', name: `${p.name} plan`, price: String(p.price), priceCurrency: cur, availability: 'https://schema.org/InStock', url: `${SITE_URL}${l.path}`,
    ...(p.from ? { priceSpecification: { '@type': 'PriceSpecification', minPrice: String(p.price), priceCurrency: cur } } : {}),
  }));
  const service = {
    '@context': 'https://schema.org', '@type': 'Service', name: l.name.replace(/^./, (c) => c.toUpperCase()) + (/invitation/i.test(l.name) ? '' : ' invitations'),
    serviceType: 'Digital invitation and event website', provider: { '@id': `${SITE_URL}/#org` }, url: `${SITE_URL}${l.path}`,
    description: l.desc, areaServed: intl ? ['United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates'].map((name) => ({ '@type': 'Country', name })) : { '@type': 'Country', name: 'Nepal' },
    offers,
  };
  const out = [crumbsLd(trail(l)), jsonLd(service)];
  if (l.designs && l.designs.list !== 'art') {
    const list = l.designs.list.map((s) => BY_SLUG[s]).filter(Boolean);
    out.push(jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList', name: l.designs.title, numberOfItems: list.length,
      itemListElement: list.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${t.name} invitation design`, url: intl ? `${SITE_URL}/${t.slug}/?showcase=1` : `${SITE_URL}/designs/${t.slug}/` })) }));
  }
  return out.join('\n  ');
}

/* ---------------- the cross-links between the two sites ---------------- */
function crossband(kind = 'np') {
  const B = {
    np: ['Living abroad?', 'Inviting family in Nepal from the USA, the UK, Australia or the Gulf? Pay by card or PayPal and send one link home.', [['For families abroad', '/nepali-abroad/'], ['Nimtto International', '/international/']]],
    'np-abroad': ['Getting married outside Nepal?', 'Our international site has designs and prices in US dollars, with Nepali wedding invitations for families in the USA.', [['Nepali wedding invitations, USA', '/international/nepali-wedding-invitations/'], ['Nimtto International', '/international/']]],
    intl: ['Getting married in Nepal?', 'Our Nepal site has wedding cards and ceremony invitations priced in rupees, paid by Khalti, eSewa or bank QR.', [['Wedding invitation cards in Nepal', '/wedding-invitation-nepal/'], ['Nimtto Nepal', '/']]],
  }[kind] || null;
  if (!B) return '';
  const [h, p, links] = B;
  return `<aside class="wrap xband" aria-label="${esc(h)}"><div class="xband__in"><p class="xband__h">${esc(h)}</p><p class="xband__p">${esc(p)}</p><p class="xband__links">${links.map(([t, href]) => `<a class="link" href="${href}"${href.startsWith('/international/') ? ' hreflang="en"' : ' hreflang="en-NP"'}>${esc(t)} ${ICON.arrow}</a>`).join('')}</p></div></aside>`;
}

/* ---------------- the legal pages' neutral header and footer ---------------- */
function legalHeader() {
  return `<a class="skip" href="#main">Skip to content</a>
  <header class="nav" id="nav">
    <div class="wrap nav__in">
      <a class="nav__logo" href="/"><img src="/site/brand/nimtto-logo.svg" width="146" height="34" alt="Nimtto home" /></a>
      <nav class="nav__links" aria-label="Legal"><a href="/terms/">Terms</a><a href="/privacy/">Privacy</a><a href="/refunds/">Refunds</a></nav>
      <div class="nav__end">
        <nav class="mkt mkt--bar mkt--legal" aria-label="Choose your site"><a class="mkt__a" href="/international/" hreflang="en">International</a><a class="mkt__a" href="/" hreflang="en-NP">Nepal</a></nav>
        <a class="nav__auth" href="/studio/" data-auth>Sign in</a>
      </div>
    </div>
  </header>`;
}
function legalFooter() {
  return `<footer class="foot foot--min">
    <div class="wrap foot__base">
      <p><a href="/">Nimtto Nepal</a> · <a href="/international/">Nimtto International</a> · <a href="/contact/">Contact</a></p>
      ${LEGAL_LINKS}
      <p>© <span data-year>2026</span> Nimtto</p>
    </div>
  </footer>`;
}

export const LANDING_PARTIALS = { landing: body, 'land-ld': ld, crossband, 'legal-header': legalHeader, 'legal-footer': legalFooter };
