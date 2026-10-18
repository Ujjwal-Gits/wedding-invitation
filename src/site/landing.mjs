// The landing pages of both sites (src/site/landings.mjs): one layout, the site's own components (the design page's
// stage, the bento, rail cards, steps, FAQ, closing) in each site's palette. Partials:
//   <!--@landing:<id>-->      the page body          <!--@land-ld:<id>-->   its JSON-LD (breadcrumbs, offers, designs)
//   <!--@crossband:np|intl-->  "Living abroad?" on Nepal pages, "Getting married in Nepal?" on international pages
// Plain module: Node runs it at build, never the browser.
import { guideLinks } from './blog-links.mjs';
import { LANDINGS } from './landings.mjs';
import { BY_SLUG, CATEGORIES, FALLBACK_SITE, planForTier, TIER_LABEL } from './themes.js';
import { fillPlans, SITE_URL } from './content.mjs';
import { fillUsd, INTL_PAGES, INTL_BASE } from './intl-content.mjs';
import { ARTWORK, artSrc } from './intl-designs.js';
import { intlPlans, usdText } from './intl-plans.js';
import { PAGES } from './seo.mjs';
import { esc, jsonLd, phone, faqBlock, cmsSlot, crumbsLd, rs, ICON, LEGAL_LINKS, withIntl, railCard as npRailCard } from './partials.mjs';
import { railCard, npAsIntl } from './intl.mjs';
import { INTL_THEMES, designPage } from './intl-designs.js';

const NP_PLANS = FALLBACK_SITE.plans;
const I_PLANS = intlPlans(FALLBACK_SITE.plans);
const fill = (l, s, html = true) => (l.market === 'intl' ? fillUsd(s, html) : fillPlans(fillUsd(s, false), html));
/** guide text (our own data, escaped first) with three marks: [words](/path/) a link (or a cited source, https://...),
 *  **words** bold, {ne:शब्द} Nepali */
const LINK = /\[([^\]]+)\]\(((?:\/|https:\/\/)[^)\s]*)\)/g;
const inline = (l, s) => fill(l, String(s), true)
  .replace(LINK, (m, t, href) => `<a class="lp-a" href="${href}"${href.startsWith('https://') ? ' rel="noopener" target="_blank"' : ''}>${t}</a>`)
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\{ne:([^}]+)\}/g, '<span lang="ne">$1</span>');
/** the same words as plain text (JSON-LD, llms-full.txt, word counts) */
const plain = (l, s) => fill(l, String(s), false).replace(LINK, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\{ne:([^}]+)\}/g, '$1');
const DATE_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const DATE_FMT_US = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
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
        <a class="dp__peek btn btn--ghost btn--sm" href="/${h.design}/?showcase=1${l.market === 'intl' ? '&amp;m=intl' : ''}" data-preview="${h.design}">${ICON.eye}See it move</a></div>`;
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
  const SZ = '(max-width: 599px) 56vw, 236px';
  let cards;
  if (intl) {
    // every card opens the design's own page: the international designs, or the Nepal ones (their /designs/ page)
    const list = l.designs.list === 'art' ? INTL_THEMES : l.designs.list.map(npAsIntl).filter(Boolean);
    cards = list.map((d, i) => railCard(d, i, SZ)).join('');
  } else {
    // the Nepal designs the page names, then a few international ones (every design shows on the Nepal site)
    cards = withIntl(l.designs.list, 4).map((t) => npRailCard(t, SZ)).join('');
  }
  const all = intl ? (l.catalog === 'np' ? '' : `<a class="btn btn--ghost" href="${INTL_PAGES['intl/designs'].path}">See all designs</a>`) : '<a class="btn btn--ghost" href="/designs/">See all designs</a>';
  return `<section class="sec" id="lp-designs" aria-labelledby="lp-d-h">
      <div class="wrap">
        <header class="shead shead--split" data-rv>
          <div><p class="eyebrow">Designs</p><h2 class="h2" id="lp-d-h">${esc(l.designs.title)}</h2></div>
          <div class="rail__side"><p class="lede">${intl && l.catalog === 'np' ? 'Tap a design to see it up close. Each one works in English and Nepali.' : 'Each design opens like a real card and comes with every detail and an RSVP.'}</p>${all}</div>
        </header>
      </div>
      <div class="rail__view"><ul class="rail__track lp__rail">${cards}</ul></div>
    </section>`;
}

/* ---------------- the guide: long-form sections from the data (l.guide) ----------------
   Each section: { id, h (the H2), toc? (a shorter label), eyebrow?, lead?, p: [..], list: [..], ol: [..], check: [..],
   sub: [{ h (an H3), p, list, ol }], table: { cap, head: [..], rows: [[..]] }, wording: [{ label, ne?, en? }],
   fig: { design: <Nepal slug> } | { art: <international artwork id> } with alt and cap, note } */
function table(l, t, id) {
  const head = (t.head || []).map((h) => `<th scope="col">${inline(l, h)}</th>`).join('');
  const rows = (t.rows || []).map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${inline(l, c)}</th>` : `<td>${inline(l, c)}</td>`)).join('')}</tr>`).join('');
  return `<div class="lp-tbl" role="region" aria-labelledby="${id}-cap" tabindex="0"><table>
          <caption id="${id}-cap">${inline(l, t.cap || '')}</caption>
          ${head ? `<thead><tr>${head}</tr></thead>` : ''}<tbody>${rows}</tbody></table></div>`;
}
function wording(l, items) {
  return `<div class="lp-w">${items.map((w) => `<figure class="lp-w__i">
          <figcaption class="lp-w__l">${inline(l, w.label)}</figcaption>
          ${w.ne ? `<blockquote class="lp-w__t lp-w__t--ne" lang="ne"><p>${esc(w.ne)}</p></blockquote>` : ''}
          ${w.en ? `<blockquote class="lp-w__t"><p>${esc(fill(l, w.en, false))}</p></blockquote>` : ''}
        </figure>`).join('')}</div>`;
}
function figure(l, f) {
  if (f.design && BY_SLUG[f.design]) {
    const t = BY_SLUG[f.design];
    return `<figure class="lp-fig"><a class="lp-fig__pic" href="${l.market === 'intl' ? designPage(f.design) : `/designs/${f.design}/`}" style="--tint:${CATEGORIES[t.cat].tint}">${phone(f.design, { sizes: '(max-width: 899px) 60vw, 280px', alt: f.alt || `The ${t.name} design on a phone: ${t.alt}` })}</a>${f.cap ? `<figcaption class="lp-fig__cap">${inline(l, f.cap)}</figcaption>` : ''}</figure>`;
  }
  if (f.art) {
    return `<figure class="lp-fig"><span class="lp-fig__pic" style="--tint:#EAF1E7"><span class="phone"><img src="${artSrc(f.art, 800)}" srcset="${artSrc(f.art, 480)} 480w, ${artSrc(f.art, 800)} 800w" sizes="(max-width: 899px) 60vw, 280px" width="390" height="844" alt="${esc(f.alt || '')}" loading="lazy" decoding="async" /></span></span>${f.cap ? `<figcaption class="lp-fig__cap">${inline(l, f.cap)}</figcaption>` : ''}</figure>`;
  }
  return '';
}
const paras = (l, ps, cls = '') => (ps || []).map((p) => `<p${cls ? ` class="${cls}"` : ''}>${inline(l, p)}</p>`).join('');
const ulist = (l, xs, cls) => (xs?.length ? `<ul class="${cls}">${xs.map((x) => `<li>${inline(l, x)}</li>`).join('')}</ul>` : '');
const olist = (l, xs) => (xs?.length ? `<ol class="lp-g__ol">${xs.map((x) => `<li>${inline(l, x)}</li>`).join('')}</ol>` : '');
function guideSec(l, s, i) {
  const fig = s.fig ? figure(l, s.fig) : '';
  const wide = Boolean(s.table || s.wording);
  const text = `${s.lead ? `<p class="lp-g__lead">${inline(l, s.lead)}</p>` : ''}${paras(l, s.p)}${ulist(l, s.list, 'lp-g__ul')}${olist(l, s.ol)}${ulist(l, s.check, 'lp-check')}
          ${(s.sub || []).map((x) => `<h3 class="lp-g__h3">${inline(l, x.h)}</h3>${paras(l, x.p)}${ulist(l, x.list, 'lp-g__ul')}${olist(l, x.ol)}`).join('')}`;
  const extra = `${s.table ? table(l, s.table, s.id) : ''}${s.wording ? wording(l, s.wording) : ''}${s.note ? `<p class="lp-g__note">${inline(l, s.note)}</p>` : ''}`;
  const kind = fig ? 'lp-g--fig' : wide ? 'lp-g--wide' : 'lp-g--side';
  return `<section class="sec lp-g ${kind}${i % 2 ? ' sec--blush' : ''}" id="${s.id}" aria-labelledby="${s.id}-h">
      <div class="wrap lp-g__in">
        <header class="lp-g__head">${s.eyebrow ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ''}<h2 class="h2 lp-g__h" id="${s.id}-h">${inline(l, s.h)}</h2></header>
        <div class="lp-g__body">${text}${wide ? '' : extra}</div>
        ${fig}${wide ? `<div class="lp-g__wide">${extra}</div>` : ''}
      </div>
    </section>`;
}
/** "On this page": the guide's sections and the fixed ones below them */
function toc(l) {
  const items = [...(l.guide || []).map((s) => [s.id, s.toc || plain(l, s.h)]), ...(l.designs ? [['lp-designs', 'Designs']] : []), ['lp-how', 'How Nimtto makes it'], ['lp-price', 'Price'], ['faq', 'Questions']];
  const when = l.updated ? `<time datetime="${l.updated}">${(l.market === 'intl' ? DATE_FMT_US : DATE_FMT).format(new Date(l.updated))}</time>` : '';
  return `<nav class="wrap lp-toc" aria-labelledby="lp-toc-h">
      <div class="lp-toc__in">
        <p class="lp-toc__h" id="lp-toc-h">On this page</p>
        <ol class="lp-toc__list">${items.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ol>
        <p class="lp-toc__by">By the Nimtto team${when ? ` · Updated ${when}` : ''}</p>
      </div>
    </nav>`;
}
/** the price, in the page's currency: the ready-made plans, or the Custom plan for occasions designed for you */
function priceSec(l) {
  const intl = l.market === 'intl';
  const custom = l.offer === 'custom';
  const pricing = intl ? `${INTL_BASE}pricing/` : '/pricing/';
  const plans = intl ? I_PLANS : NP_PLANS;
  const list = custom ? plans.filter((p) => p.id === 'custom') : plans.filter((p) => p.id !== 'custom');
  const price = (p) => (intl ? `<span data-usd-from="${p.id}">${usdText(p.usd)}</span>` : `<span data-plan-price="${p.id}">${rs(p.price)}</span>`);
  const name = (p) => (intl ? esc(p.name) : `<span data-plan-name="${p.id}">${esc(p.name)}</span>`);
  const feats = (p) => p.features.map((f) => esc(f)).join(' · ');
  const rows = list.map((p) => `<tr><th scope="row">${name(p)}</th><td class="lp-price__p">${p.from || custom ? 'from ' : ''}${price(p)}</td><td>${feats(p)}</td></tr>`).join('');
  const lead = l.priceLead ? inline(l, l.priceLead) : custom
    ? (intl ? 'Every invitation for this occasion is designed for you on the Custom plan. Tell us your idea and we reply within one business day with a fixed price. You pay once, by card or PayPal, and only when you are happy with the price.'
      : 'Every card for this occasion is designed for your family on the Custom plan. Tell us your idea and we reply within one business day with a fixed price. You pay once, by Khalti, eSewa, bank QR or PayPal, only when you are happy with it.')
    : (intl ? 'Pick the plan that fits your design. You pay once, in US dollars, by card or PayPal. There is no subscription and no charge per guest.'
      : 'Pick the plan that fits your design. You pay once, by Khalti, eSewa, bank QR, or PayPal from abroad. There is no monthly fee and no charge per guest.');
  return `<section class="sec" id="lp-price" aria-labelledby="lp-price-h">
      <div class="wrap lp-price">
        <header class="lp-price__head"><p class="eyebrow">Price</p><h2 class="h2" id="lp-price-h">${esc(l.priceTitle || (custom ? 'What it costs' : 'Plans, paid once'))}</h2><p class="lede">${lead}</p>
          <p><a class="link" href="${pricing}">${intl ? 'See full pricing' : 'See every plan and price'} ${ICON.arrow}</a></p></header>
        <div class="lp-tbl" role="region" aria-labelledby="lp-price-cap" tabindex="0"><table>
          <caption id="lp-price-cap">${intl ? 'Nimtto plans in US dollars, paid once' : 'Nimtto plans in Nepali rupees, paid once'}</caption>
          <thead><tr><th scope="col">Plan</th><th scope="col">Price</th><th scope="col">What you get</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>
    </section>`;
}
/** guides from the blog (engineer B fills l.relatedPosts with [title, path] pairs); nothing shows until there are some */
function posts(l) {
  const list = l.relatedPosts || [];
  if (!list.length) return '';
  return `<section class="sec sec--tight" aria-labelledby="lp-posts-h">
      <div class="wrap">
        <h2 class="h3" id="lp-posts-h">${l.market === 'intl' ? 'Guides and ideas' : 'Guides from Nimtto'}</h2>
        <ul class="lp-links lp-links--cols">${list.map(([t, p]) => `<li><a class="link" href="${p}">${esc(t)} ${ICON.arrow}</a></li>`).join('')}</ul>
      </div>
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
  // every page links to its hub, its related pages, the designs and the prices (each path once)
  const hub = l.parent ? [[intl ? 'Every occasion' : 'Every Nepali occasion', parentPath(l.parent)]] : [];
  const base = intl ? [['Wedding invitation designs', INTL_PAGES['intl/designs'].path], ['Pricing in US dollars', `${INTL_BASE}pricing/`]]
    : [['Nepali wedding card designs', '/designs/'], ['Prices in rupees', '/pricing/']];
  const seen = new Set([l.path]);
  const links = [...(l.links || []), ...related.map((r) => [r.eyebrow, r.path]), ...hub, ...base, ...guideLinks(id)].filter(([, p]) => p && !seen.has(p) && seen.add(p));
  return `<div class="wrap">
      <nav class="crumbs dp-crumbs" aria-label="Breadcrumb"><ol>${crumbHtml}</ol></nav>
    </div>

    <section class="wrap dp lp" aria-labelledby="lp-h">
      ${stage(l)}
      <div class="dp__info">
        <p class="eyebrow">${esc(l.eyebrow)}${l.ne ? ` <span class="lp__ne" lang="ne">${esc(l.ne)}</span>` : ''}</p>
        <h1 class="display dp__name lp__h" id="lp-h" data-cms="h1">${l.h1}</h1>
        <p class="dp__desc lp__lede" data-speak data-cms="lede">${fill(l, l.lede)}</p>
        ${priceLine(l)}
        <div class="dp__btns">${buttons(l)}</div>
        <ul class="dp__notes">${(l.notes || []).map((n) => `<li>${fill(l, n)}</li>`).join('')}</ul>
      </div>
    </section>

    ${l.guide?.length ? toc(l) : ''}

    <section class="sec sec--blush" aria-labelledby="lp-inc-h">
      <div class="wrap">
        <header class="shead" data-rv><p class="eyebrow">What’s included</p><h2 class="h2" id="lp-inc-h">${esc(l.includesTitle)}</h2></header>
        <ul class="lp-inc">${(l.includes || []).map(([t, d], i) => `<li class="lp-inc__i"><span class="lp-inc__n">${String(i + 1).padStart(2, '0')}</span><h3 class="lp-inc__t">${esc(t)}</h3><p class="lp-inc__d">${fill(l, d)}</p></li>`).join('')}</ul>
      </div>
    </section>

    ${(l.guide || []).map((s, i) => guideSec(l, s, i)).join('\n    ')}

    ${designRow(l)}

    <section class="sec" aria-label="Quick answers">
      <div class="wrap lp-ans">
        ${(l.answers || []).map(([q, a]) => `<article class="lp-ans__i"><h2 class="h3 lp-ans__q">${esc(q)}</h2><p class="lp-ans__a">${fill(l, a)}</p></article>`).join('')}
        <aside class="lp-ideas" aria-labelledby="lp-ideas-h"><h2 class="lp-ideas__h" id="lp-ideas-h">${esc(l.ideasTitle)}</h2><ul class="lp-ideas__list">${(l.ideas || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></aside>
      </div>
    </section>

    <section class="sec sec--blush" id="lp-how" aria-labelledby="lp-how-h">
      <div class="wrap">
        <header class="shead shead--split" data-rv><div><p class="eyebrow">How it works</p><h2 class="h2" id="lp-how-h">${l.howTitle || 'Four steps. <em>No app.</em>'}</h2></div><p class="lede">${intl ? 'A real designer sets it up with you, and you check every change before guests see it.' : 'We make it with you on WhatsApp, in English or Nepali. You see every change first.'}</p></header>
        <ol class="steps">${steps}</ol>
      </div>
    </section>

    ${priceSec(l)}

    <section class="sec sec--blush" id="faq" aria-labelledby="faq-h">
      <div class="wrap faq">
        <header class="shead"><p class="eyebrow">Questions</p><h2 class="h2" id="faq-h">${l.faqTitle || 'Good to <em>know.</em>'}</h2></header>
        ${cmsSlot('faq', faqBlock(faqItems))}
      </div>
    </section>

    ${posts(l)}

    ${links.length ? `<section class="sec sec--tight" aria-labelledby="lp-more-h">
      <div class="wrap">
        <h2 class="h3" id="lp-more-h">${intl ? 'More invitations' : 'More from Nimtto'}</h2>
        <ul class="lp-links lp-links--cols">${links.map(([t, p]) => `<li><a class="link" href="${p}">${esc(t)} ${ICON.arrow}</a></li>`).join('')}</ul>
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
  const url = `${SITE_URL}${l.path}`;
  const out = [crumbsLd(trail(l)), jsonLd(service)];
  // the visible four steps, as a HowTo
  if (l.steps?.length) {
    const from = offers[0];
    out.push(jsonLd({ '@context': 'https://schema.org', '@type': 'HowTo', name: plain(l, l.howName || `How to order ${/^[aeiou]/i.test(l.name) ? 'an' : 'a'} ${l.name.toLowerCase()} invitation online`),
      ...(from ? { estimatedCost: { '@type': 'MonetaryAmount', currency: cur, value: from.price } } : {}),
      step: l.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.t, text: s.d, url: `${url}#lp-how` })) }));
  }
  if (l.designs) {
    const list = l.designs.list === 'art' ? INTL_THEMES : l.market === 'intl' ? l.designs.list.map((s) => BY_SLUG[s]).filter(Boolean) : withIntl(l.designs.list, 4);
    out.push(jsonLd({ '@context': 'https://schema.org', '@type': 'ItemList', name: l.designs.title, numberOfItems: list.length,
      itemListElement: list.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${t.name} invitation design`, url: `${SITE_URL}${designPage(t.slug)}` })) }));
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

/** A landing page's words as plain text, section by section (llms-full.txt and the word counts in docs/SEO-KEYWORDS.md). */
export function landingText(id) {
  const l = LANDINGS[id];
  const f = (s) => plain(l, s);
  const strip = (s) => String(s).replace(/<[^>]+>/g, '');
  const out = [`${strip(l.h1)}. ${f(l.lede)}`, `${l.includesTitle}:\n${(l.includes || []).map(([t, d]) => `- ${t}: ${f(d)}`).join('\n')}`];
  for (const s of l.guide || []) {
    const sub = (s.sub || []).map((x) => [`### ${f(x.h)}`, ...(x.p || []).map(f), ...(x.list || []).map((y) => `- ${f(y)}`), ...(x.ol || []).map((y, i) => `${i + 1}. ${f(y)}`)].join('\n'));
    const tbl = s.table ? [f(s.table.cap || ''), ...(s.table.head ? [s.table.head.map(f).join(' | ')] : []), ...s.table.rows.map((r) => r.map(f).join(' | '))].join('\n') : '';
    const words = (s.wording || []).map((w) => [`${f(w.label)}:`, w.ne, w.en && f(w.en)].filter(Boolean).join('\n'));
    out.push([`## ${f(s.h)}`, s.lead && f(s.lead), ...(s.p || []).map(f), ...(s.list || []).map((y) => `- ${f(y)}`), ...(s.ol || []).map((y, i) => `${i + 1}. ${f(y)}`), ...(s.check || []).map((y) => `- ${f(y)}`), ...sub, tbl, ...words, s.note && f(s.note)].filter(Boolean).join('\n'));
  }
  out.push(...(l.answers || []).map(([q, a]) => `### ${q}\n${f(a)}`));
  if (l.ideas?.length) out.push(`${l.ideasTitle}: ${l.ideas.join(', ')}.`);
  if (l.steps?.length) out.push(`How it works:\n${l.steps.map((s, i) => `${i + 1}. ${s.t}: ${s.d}`).join('\n')}`);
  out.push(...(l.faq || []).map(([q, a]) => `### ${q}\n${f(a)}`));
  return out.join('\n\n');
}

export const LANDING_PARTIALS = { landing: body, 'land-ld': ld, crossband };
