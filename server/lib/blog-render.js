// The blog's server-rendered pages (lib/blog.js serves them): /blog/ and /international/blog/ (index), their posts
// (/blog/<slug>/), the RSS feeds, /sitemap-blog.xml and the blog part of llms.txt / llms-full.txt.
// A page is the site's own built shell (dist/blog/index.html, dist/international/blog/index.html: header, footer,
// dialogs, CSS and JS from the build, src/site/blog.mjs) with two holes filled here: <!--blog:head--> (title, meta,
// canonical, Open Graph, JSON-LD) and <!--blog:main--> (the page). Every word from the store is escaped; post bodies are
// Markdown made safe by lib/blog-md.js. Plain functions (no Express): the tests call them directly.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT_DIR } from './env.js';
import { renderMarkdown, renderInline } from './blog-md.js';
import { BY_SLUG, CATEGORIES, THEMES, FALLBACK_SITE, planForTier, tierName as planTierName } from '../../src/site/themes.js';
import { INTL_BY_SLUG, INTL_THEMES, NP_DESIGNS_INTL, STYLE_LABEL } from '../../src/site/intl-designs.js';
import { intlPlans, usdText, INTL_NAME } from '../../src/site/intl-plans.js';
import { tierOf as siteTierOf, themeMarketOf, featuredOf, orderedFor } from './site.js';
import { phoneStill } from '../../src/site/stills.js';
import { AUTHOR_LD, TEAM_URL, TEAM_URL_INTL } from '../../src/site/seo-site.mjs';

export const SITE_URL = 'https://nimtto.com';
export const SITES = {
  np: {
    base: '/blog/', home: '/', homeName: 'Home', lang: 'en-NP', locale: 'en_NP', dateLocale: 'en-GB', currencyNote: 'rupees',
    name: 'Nimtto Blog', feedTitle: 'Nimtto Blog: Nepali Invitations, Wording and Ceremonies',
    title: 'Nepali Wedding and Ceremony Invitation Guides | Nimtto Blog',
    desc: 'Wording in Nepali and English, bratabandha and pasni customs, timelines and etiquette for invitations in Nepal, from the Nimtto team.',
    eyebrow: 'The Nimtto blog', h1: 'Guides for Nepali <em>invitations.</em>',
    lede: 'Wording in Nepali and English, ceremony customs, timelines and etiquette. Written by the team that makes Nimtto invitations, with every fact linked to its source.',
    og: '/site/og/blog.jpg', ogFallback: '/site/og/home.jpg', pricing: '/pricing/', designs: '/designs/', about: '/about/#team', team: TEAM_URL,
    tints: ['#FDEDF0', '#F6E9E7', '#F3E2E2', '#FFF1EC'],
  },
  intl: {
    base: '/international/blog/', home: '/international/', homeName: 'Home', lang: 'en-US', locale: 'en_US', dateLocale: 'en-US', currencyNote: 'US dollars',
    name: 'Nimtto International Blog', feedTitle: 'Nimtto Blog: Invitation Wording, Etiquette and RSVP for Every Celebration',
    title: 'Invitation Guides: Wording, Etiquette and RSVP | Nimtto Blog',
    desc: 'Invitation wording examples, timelines, online etiquette and RSVP tips for weddings, birthdays, showers and every celebration, from the Nimtto team.',
    eyebrow: 'The Nimtto blog', h1: 'Invitation guides for <em>every celebration.</em>',
    lede: 'Wording examples, timelines, online etiquette and RSVP tips for weddings, birthdays, showers and every party. Written by the team that makes Nimtto invitations, with every fact linked to its source.',
    og: '/site/og/intl-blog.jpg', ogFallback: '/site/og/intl-home.jpg', pricing: '/international/pricing/', designs: '/international/designs/', about: '/international/about/#team', team: TEAM_URL_INTL,
    tints: ['#EAF1E7', '#F1F5EF', '#E6EFE3', '#EEF2EA'],
  },
};
/** The author of every post: the team, backed by the organisation (an About page, not a made-up person). */
export const AUTHOR = {
  name: 'Nimtto Team',
  bio: 'The designers who set up Nimtto invitations with families in Nepal and abroad. We write these guides from the questions people ask us while we make their invitations, and we link every fact to its source.',
};
const READ_WPM = 220;

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const xml = (s) => esc(s).replace(/'/g, '&apos;');
const jsonLd = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const abs = (p) => (/^https?:\/\//.test(p) ? p : `${SITE_URL}${p}`);
const NE_RUN = /[\u0900-\u097F]+(?:[\s,.;:!?'"()/-]+[\u0900-\u097F]+)*/g;
/** escaped text with its Nepali words in <span lang="ne"> */
const escNe = (s) => esc(s).replace(NE_RUN, (m) => `<span lang="ne">${m}</span>`);

/** Title Case for meta titles (the same rule as src/site/seo.mjs): small joining words stay lower case inside. */
const MINOR = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'the', 'to', 'vs']);
export function titleCase(s) {
  let first = true;
  return String(s).split(/(\s+)/).map((w) => {
    if (/^\s+$/.test(w) || !w) return w;
    const bare = w.replace(/[^\w-]/g, '');
    const out = bare === 'eSewa' ? w : !first && MINOR.has(bare.toLowerCase()) ? w.toLowerCase() : w.replace(/^([("']?)([a-z])/, (m, p, c) => p + c.toUpperCase());
    first = /[:|]$/.test(w) || w === '|';
    return out;
  }).join('');
}

export const postPath = (p) => `${SITES[p.site].base}${p.slug}/`;
export const catSlug = (c) => String(c).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fmtDate = (site, iso) => {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(SITES[site].dateLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
};
const isoDay = (iso) => String(iso || '').slice(0, 10);

/* ---------------- what a post renders to (cached per post revision by lib/blog.js) ---------------- */
/** { html, toc, words, minutes, images, faq: [{ q, a, aHtml }] } */
export function compilePost(post) {
  const body = renderMarkdown(post.body || '');
  const faq = (post.faq || []).filter((x) => x.q && x.a).map((x) => { const r = renderInline(x.a); return { q: x.q, a: r.plain, aHtml: r.html }; });
  return { ...body, minutes: Math.max(1, Math.round(body.words / READ_WPM)), faq };
}

/* ---------------- pictures ---------------- */
const stillsFile = resolve(ROOT_DIR, 'src', 'site', 'stills.json');
const STILLS = existsSync(stillsFile) ? JSON.parse(readFileSync(stillsFile, 'utf8')) : {};
const designOf = (site, slug) => (site === 'intl' && INTL_BY_SLUG[slug] ? { ...INTL_BY_SLUG[slug], page: `/international/designs/${slug}/`, intl: true }
  : BY_SLUG[slug] ? { ...BY_SLUG[slug], line: BY_SLUG[slug].concept, page: `/designs/${slug}/`, intl: false } : null);
export const designExists = (site, slug) => Boolean(designOf(site, slug));
const tintOf = (site, i) => SITES[site].tints[i % SITES[site].tints.length];

function phoneImg(slug, { sizes, alt = '', eager = false }) {
  const p = phoneStill(STILLS, slug, `/site/thumbs/${slug}-480.webp`);
  return `<span class="phone"><img src="${p.src}"${p.srcset ? ` srcset="${p.srcset}" sizes="${sizes}"` : ''} width="390" height="844" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></span>`;
}
function mockPhone(m, site) {
  return `<span class="phone"><span class="mock${site === 'intl' ? ' mock--intl' : ''}" role="img" aria-label="${esc(`A sample invitation: ${m.kick || ''} ${m.name || ''}, ${m.when || ''}`)}">
      ${m.ne ? `<span class="mock__ne" lang="ne">${esc(m.ne)}</span>` : '<span class="mock__orn" aria-hidden="true"></span>'}
      <span class="mock__kick">${esc(m.kick)}</span><span class="mock__name">${esc(m.name)}</span><span class="mock__rule" aria-hidden="true"></span>
      <span class="mock__when">${esc(m.when)}</span><span class="mock__where">${esc(m.where)}</span><span class="mock__btn">RSVP</span>
    </span></span>`;
}
/** a landscape picture's files: a built-in feature image (<base>-2400|1600|800.webp) or an uploaded photo (-1600|-800) */
function pictureSet(c) {
  if (c.type === 'image' && c.src) return { src: `${c.src}-1600.webp`, set: `${c.src}-800.webp 800w, ${c.src}-1600.webp 1600w, ${c.src}-2400.webp 2400w`, w: 2400, h: 1350 };
  if (c.type === 'photo' && c.src) { const s800 = c.src.replace(/-1600\.webp$/, '-800.webp'); return { src: c.src, set: `${s800} 800w, ${c.src} 1600w`, w: 1600, h: 1000 }; }
  return null;
}
/** the post page's feature picture: a wide landscape image (none for a post without a photo) */
function heroImage(post) {
  const c = post.cover || {};
  const pic = pictureSet(c);
  if (!pic) return '';
  return `<figure class="wrap bp-w bp-hero"><img src="${esc(pic.src)}" srcset="${esc(pic.set)}" sizes="(max-width: 1263px) calc(100vw - 2 * var(--gut, 16px)), 1200px" width="${pic.w}" height="${pic.h}" alt="${esc(c.alt || '')}" fetchpriority="high" decoding="async" />${c.caption ? `<figcaption>${escNe(c.caption)}</figcaption>` : ''}</figure>`;
}
/** the cover on cards and the featured post: a landscape picture, else a design's phone still or a sample card */
function coverArt(post, { big = false, i = 0 } = {}) {
  const c = post.cover || {};
  const alt = big ? c.alt || '' : '';
  const pic = pictureSet(c);
  if (pic) {
    return `<span class="bcover bcover--photo"><img src="${esc(pic.src.replace(/-(?:1600|2400)\.webp$/, '-800.webp'))}" srcset="${esc(pic.set)}" sizes="${big ? '(max-width: 899px) 100vw, 40vw' : '(max-width: 599px) 92vw, (max-width: 1023px) 46vw, 30vw'}" width="${pic.w}" height="${pic.h}" alt="${esc(alt)}" ${big ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></span>`;
  }
  const d = c.type === 'design' ? designOf(post.site, c.design) : null;
  const tint = d && !d.intl && CATEGORIES[d.cat] ? CATEGORIES[d.cat].tint : tintOf(post.site, i);
  const inner = d ? phoneImg(c.design, { sizes: big ? '(max-width: 899px) 52vw, 300px' : '(max-width: 599px) 40vw, 180px', alt, eager: big })
    : c.type === 'mock' && c.mock ? mockPhone(c.mock, post.site)
      : phoneImg(post.site === 'intl' ? 'olive-grove' : 'kham', { sizes: big ? '300px' : '180px', alt, eager: big });
  return `<span class="bcover" style="--tint:${tint}">${inner}</span>`;
}
const ogOf = (post) => post.og || (post.cover?.type === 'design' && post.cover.design
  ? (post.site === 'intl' && INTL_BY_SLUG[post.cover.design] ? `/site/og/intl-design-${post.cover.design}.jpg` : `/site/og/design-${post.cover.design}.jpg`)
  : SITES[post.site].ogFallback);
const coverUrl = (post) => {
  const c = post.cover || {};
  if (c.type === 'photo' && c.src) return c.src;
  if (c.type === 'image' && c.src) return `${c.src}-2400.webp`;
  if (c.type === 'design' && c.design) return phoneStill(STILLS, c.design, '').src || null;
  return null;
};

/* ---------------- shared bits ---------------- */
const ARROW = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
function crumbs(list) {
  return `<nav class="crumbs bl-crumbs" aria-label="Breadcrumb"><ol>${list.map(([n, p], i) => (i === list.length - 1 ? `<li><span aria-current="page">${esc(n)}</span></li>` : `<li><a href="${esc(p)}">${esc(n)}</a></li>`)).join('')}</ol></nav>`;
}
const crumbsLd = (list) => jsonLd({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })) });
function card(p, c, i) {
  const href = postPath(p);
  return `<li class="bcard" data-cat="${esc(catSlug(p.category))}">
      <a class="bcard__pic" href="${esc(href)}" tabindex="-1" aria-hidden="true">${coverArt(p, { i })}</a>
      <div class="bcard__body">
        <p class="bcard__meta"><span class="bcard__cat">${esc(p.category)}</span><span>${c.minutes} min read</span></p>
        <h3 class="bcard__t"><a href="${esc(href)}">${escNe(p.title)}</a></h3>
        <p class="bcard__x">${escNe(p.excerpt)}</p>
        <p class="bcard__date"><time datetime="${isoDay(p.publishedAt)}">${fmtDate(p.site, p.publishedAt)}</time></p>
      </div>
    </li>`;
}
function closing(site) {
  const s = SITES[site];
  const intl = site === 'intl';
  return `<section class="sec" aria-labelledby="bl-close-h">
      <div class="wrap"><div class="closing">
        <h2 class="h2 closing__h" id="bl-close-h">${intl ? 'Let’s make your invitation.' : 'Let’s make your card.'}</h2>
        <p class="closing__p">${intl ? 'An animated invitation with an event website and RSVP, set up with you by a real designer. Paid once, in US dollars.' : 'An animated invitation with every ceremony, maps and RSVP, made with you on WhatsApp. Paid once, from Rs 2,999.'}</p>
        <div class="closing__acts"><a class="btn btn--white btn--lg" href="${s.pricing}#plans" data-order>${intl ? 'See the prices' : 'Order your card'}</a><a class="btn btn--line-w btn--lg" href="${s.designs}">See the designs</a></div>
      </div></div>
    </section>`;
}
function crossband(site) {
  const [h, p, links] = site === 'intl'
    ? ['Getting married in Nepal?', 'Our Nepal site has wedding cards and ceremony invitations priced in rupees, paid by Khalti, eSewa or bank QR.', [['Nepal blog', '/blog/'], ['Nimtto Nepal', '/']]]
    : ['Living abroad?', 'Inviting family in Nepal from the USA, the UK, Australia or the Gulf? Pay by card or PayPal and send one link home.', [['For families abroad', '/nepali-abroad/'], ['Nimtto International', '/international/']]];
  return `<aside class="wrap xband" aria-label="${esc(h)}"><div class="xband__in"><p class="xband__h">${esc(h)}</p><p class="xband__p">${esc(p)}</p><p class="xband__links">${links.map(([t, href]) => `<a class="link" href="${href}"${href.startsWith('/international/') ? ' hreflang="en"' : ' hreflang="en-NP"'}>${esc(t)} ${ARROW}</a>`).join('')}</p></div></aside>`;
}

/* ---------------- <head> ---------------- */
function headTags({ title, desc, url, image, imageAlt, site, type = 'website', noindex = false, extra = '', ld = [] }) {
  const s = SITES[site];
  const t = esc(title);
  const d = esc(desc);
  return `<title>${t}</title>
  <meta name="description" content="${d}" />
  <meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />
  <link rel="canonical" href="${esc(url)}" />
  <link rel="alternate" hreflang="${s.lang}" href="${esc(url)}" />
  <link rel="alternate" type="application/rss+xml" title="${esc(s.name)}" href="${s.base}rss.xml" />
  <meta property="og:type" content="${type}" />
  <meta property="og:site_name" content="Nimtto" />
  <meta property="og:locale" content="${s.locale}" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:image" content="${esc(image)}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${esc(imageAlt)}" />${extra}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${esc(image)}" />
  <meta name="twitter:image:alt" content="${esc(imageAlt)}" />
  ${ld.join('\n  ')}`;
}
/** the shell with its two holes filled, and <html lang> set for the site (en-NP, en-US) */
const fill = (shell, head, main, site) => shell.replace(/<html lang="[^"]*"/, `<html lang="${SITES[site].lang}"`).replace('<!--blog:head-->', () => head).replace('<!--blog:main-->', () => main);

/* ---------------- the index ---------------- */
/** posts: this site's published posts, newest first, each with its compiled `c` */
export function renderIndex({ site, posts, shell }) {
  const s = SITES[site];
  const url = abs(s.base);
  const trail = [[s.homeName, s.home], ['Blog', s.base]];
  const [lead, ...rest] = posts;
  const cats = [...new Set(posts.map((p) => p.category))];
  const feature = lead ? `<section class="wrap bl-feature" aria-labelledby="bl-f-h">
      <a class="bl-feature__pic" href="${esc(postPath(lead))}" tabindex="-1" aria-hidden="true">${coverArt(lead, { big: true })}</a>
      <div class="bl-feature__txt">
        <p class="bcard__meta"><span class="bcard__cat">${esc(lead.category)}</span><span>${lead.c.minutes} min read</span><span><time datetime="${isoDay(lead.publishedAt)}">${fmtDate(site, lead.publishedAt)}</time></span></p>
        <h2 class="h2 bl-feature__t" id="bl-f-h"><a href="${esc(postPath(lead))}">${escNe(lead.title)}</a></h2>
        <p class="lede">${escNe(lead.excerpt)}</p>
        <a class="link" href="${esc(postPath(lead))}">Read the guide ${ARROW}</a>
      </div>
    </section>` : '';
  const list = rest.length ? `<section class="sec bl-list" aria-labelledby="bl-all-h">
      <div class="wrap">
        <div class="bl-bar">
          <h2 class="h3" id="bl-all-h">More guides</h2>
          ${cats.length > 1 ? `<div class="chips bl-chips" role="group" aria-label="Show guides about" data-bl-filter hidden><button type="button" class="chip" aria-pressed="true" data-cat="">All</button>${cats.map((c) => `<button type="button" class="chip" aria-pressed="false" data-cat="${esc(catSlug(c))}">${esc(c)}</button>`).join('')}</div>` : ''}
        </div>
        <ul class="bl-grid" id="bl-grid">${rest.map((p, i) => card(p, p.c, i + 1)).join('')}</ul>
        <p class="bl-empty" id="bl-empty" hidden>No guides on this yet. <button type="button" class="link" data-bl-all>See them all</button></p>
      </div>
    </section>` : '';
  const empty = !posts.length ? '<section class="wrap sec bl-none"><p class="lede">The first guides are on their way. Meanwhile, the designs are ready to see.</p></section>' : '';
  const main = `<div class="wrap">${crumbs(trail)}</div>
    <header class="wrap pagehead bl-head">
      <p class="eyebrow">${esc(s.eyebrow)}</p>
      <h1 class="display">${s.h1}</h1>
      <p class="lede" data-speak>${esc(s.lede)}</p>
    </header>
    ${feature}${list}${empty}
    ${closing(site)}
    ${crossband(site)}`;
  const blogLd = {
    '@context': 'https://schema.org', '@type': 'Blog', '@id': `${url}#blog`, url, name: s.name, description: s.desc, inLanguage: s.lang,
    publisher: { '@id': `${SITE_URL}/#org` }, isPartOf: { '@id': `${SITE_URL}/#web` },
    blogPost: posts.map((p) => ({ '@type': 'BlogPosting', '@id': `${abs(postPath(p))}#article`, headline: p.title, url: abs(postPath(p)), datePublished: isoDay(p.publishedAt), dateModified: isoDay(p.updatedAt || p.publishedAt), image: abs(ogOf(p)), articleSection: p.category })),
  };
  const page = { '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': `${url}#webpage`, url, name: s.title, description: s.desc, inLanguage: s.lang,
    isPartOf: { '@id': `${SITE_URL}/#web` }, publisher: { '@id': `${SITE_URL}/#org` }, mainEntity: { '@id': `${url}#blog` },
    speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '[data-speak]'] } };
  const head = headTags({ title: s.title, desc: s.desc, url, image: abs(s.og), imageAlt: `${s.name}: invitation guides on a phone`, site, ld: [jsonLd(page), jsonLd(blogLd), crumbsLd(trail)] });
  return fill(shell, head, main, site);
}

/* ---------------- a post ---------------- */
function toc(c) {
  const items = [...c.toc, ...(c.faq.length ? [{ level: 2, id: 'faq', text: 'Questions people ask' }] : [])];
  if (items.length < 2) return '';
  return `<aside class="bp-toc" aria-labelledby="bp-toc-h"><details class="bp-toc__box" open><summary class="bp-toc__s" id="bp-toc-h">On this page</summary>
      <ol class="bp-toc__list">${items.map((x) => `<li class="bp-toc__i bp-toc__i--${x.level}"><a href="#${esc(x.id)}">${escNe(x.text)}</a></li>`).join('')}</ol></details></aside>`;
}
/** share links; `where` keeps the two rows' ids apart ('top' under the picture, 'end' after the article) */
function share(post, url, where = 'end') {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(post.title);
  const img = encodeURIComponent(abs(ogOf(post)));
  const ICO = {
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    wa: '<path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8c-1-.4-2.3-1.7-2.7-2.7l.8-1-1-2z"/>',
    fb: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v7h4v-7h3l1-4h-4V8z"/>',
    x: '<path d="M4 4l16 16M20 4L4 20"/>',
    pin: '<circle cx="12" cy="12" r="9"/><path d="M11 8.5c3-1 5 .5 5 2.8 0 2.4-1.6 4-3.5 4-1 0-1.7-.6-1.9-1.4L9.5 20"/>',
    mail: '<path d="M3 6h18v12H3z"/><path d="M3 7l9 6 9-6"/>',
  };
  const ico = (k) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
  const a = (href, k, label) => `<a class="bp-share__a" href="${href}" target="_blank" rel="noopener noreferrer">${ico(k)}<span>${label}</span></a>`;
  return `<div class="bp-share bp-share--${where}" aria-labelledby="bp-share-h-${where}"><p class="bp-share__h" id="bp-share-h-${where}">${where === 'top' ? 'Share' : 'Share this guide'}</p><div class="bp-share__list">
      <button type="button" class="bp-share__a" data-copy-link="${esc(url)}">${ico('link')}<span>Copy link</span></button>
      ${a(`https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`, 'wa', 'WhatsApp')}
      ${a(`https://www.facebook.com/sharer/sharer.php?u=${u}`, 'fb', 'Facebook')}
      ${a(`https://x.com/intent/post?url=${u}&amp;text=${t}`, 'x', 'X')}
      ${a(`https://www.pinterest.com/pin/create/button/?url=${u}&amp;media=${img}&amp;description=${t}`, 'pin', 'Pinterest')}
      <a class="bp-share__a" href="mailto:?subject=${t}&amp;body=${encodeURIComponent(`${post.title}\n${url}`)}">${ico('mail')}<span>Email</span></a>
    </div><p class="bp-share__ok" role="status" aria-live="polite"></p></div>`;
}
/* ---------------- designs in and under a post ---------------- */
const npr = new Intl.NumberFormat('en-IN');
/** a design of either catalog, with its page: { slug, name, ne, line, alt, cat, intl, page } */
function anyDesign(slug) {
  const t = BY_SLUG[slug];
  if (t) return { slug, name: t.name, ne: t.ne, line: t.concept, alt: t.alt, cat: t.cat, words: `${(t.religions || []).join(' ')} ${t.cat}`, intl: false, page: `/designs/${slug}/` };
  const d = INTL_BY_SLUG[slug];
  if (d) return { slug, name: d.name, ne: '', style: d.style, line: d.line, alt: d.alt, cat: d.cat, words: `${d.faith || ''} ${d.style || ''} ${d.cat || ''}`, intl: true, page: `/international/designs/${slug}/` };
  return null;
}
/**
 * A design a post on this website may show, or null: known to the catalog, not hidden by the planner (Themes page),
 * and on the international website one it offers (its own, the Nepal ones it carries, or any the planner opened to it).
 */
export function designFor(site, slug, siteDoc = null) {
  const d = anyDesign(slug);
  if (!d || (siteDoc?.hiddenThemes || []).includes(slug)) return null;
  if (site === 'intl' && !d.intl && !NP_DESIGNS_INTL.includes(slug) && !['intl', 'both'].includes(themeMarketOf(slug, siteDoc))) return null;
  return d;
}
/** a design's plan badge and "from" price: the build-time text, which the site's script sets in the visitor's currency */
function priceBits(site, slug, siteDoc) {
  const plans = siteDoc?.plans?.length ? siteDoc.plans : FALLBACK_SITE.plans;
  const tier = siteTierOf(slug, siteDoc);
  if (site === 'intl') {
    const p = intlPlans(plans).find((x) => x.id === tier);
    return `<span class="tier tier--${tier}">${esc(INTL_NAME[tier] || '')}</span><span class="dcard__price bdc__price" data-usd-from="${tier}">${p ? `from ${usdText(p.usd)}` : ''}</span>`;
  }
  const p = planForTier(plans, tier);
  return `<span class="tier tier--${tier}" data-tier-tag="${tier}">${esc(planTierName(plans, tier))}</span><span class="dcard__price bdc__price" data-tier-price="${tier}">${p ? `from Rs ${npr.format(p.price)}` : ''}</span>`;
}
/** The in-body design card (a ```design block): 1 to 3 designs, each with Preview and Order; '' when none can show. */
export function designCardsHtml(slugs, post, siteDoc = null) {
  const list = slugs.map((s) => designFor(post.site, s, siteDoc)).filter(Boolean).slice(0, 3);
  if (!list.length) return '';
  const intl = post.site === 'intl';
  const pricing = intl ? '/international/pricing/' : '/pricing/';
  return `<aside class="bdc bdc--n${list.length}" aria-label="${list.length > 1 ? 'Designs' : 'A design'} for this guide">
  <p class="bdc__kick">${list.length > 1 ? 'Designs to try' : 'A design to try'}</p>
  <ul class="bdc__list">${list.map((d, i) => `<li class="bdc__item">
    <a class="bdc__pic" href="${d.page}" style="--tint:${!d.intl && CATEGORIES[d.cat] ? CATEGORIES[d.cat].tint : tintOf(post.site, i)}" tabindex="-1" aria-hidden="true">${phoneImg(d.slug, { sizes: '(max-width: 599px) 30vw, 150px', alt: '' })}</a>
    <div class="bdc__body">
      <p class="bdc__name"><a href="${d.page}">${esc(d.name)}</a>${!intl && d.ne ? ` <span lang="ne">${esc(d.ne)}</span>` : ''}</p>
      <p class="bdc__meta">${priceBits(post.site, d.slug, siteDoc)}</p>
      <p class="bdc__line">${esc(d.line || '')}</p>
      <div class="bdc__acts"><a class="btn btn--accent btn--sm" href="${pricing}?design=${d.slug}#plans" data-order data-design="${d.slug}" aria-label="Order the ${esc(d.name)} design">Order this design</a><a class="btn btn--ghost btn--sm" href="/${d.slug}/?showcase=1${intl ? '&amp;market=intl' : ''}" data-preview="${d.slug}" aria-label="Preview ${esc(d.name)}">Preview</a></div>
    </div></li>`).join('')}</ul>
</aside>`;
}
/** the body with every design slot (lib/blog-md.js) filled for this website */
export const fillDesignSlots = (html, post, siteDoc = null) => html.replace(/<aside class="bdc-slot" data-designs="([a-z0-9,-]*)"><\/aside>\n?/g, (m, list) => designCardsHtml(list.split(','), post, siteDoc));

const MATCH_SKIP = new Set(['wedding', 'weddings', 'invitation', 'invitations', 'invite', 'invites', 'guide', 'guides', 'card', 'cards', 'design', 'designs', 'digital', 'online', 'with', 'your', 'from', 'what', 'when', 'that', 'this', 'how', 'for', 'and', 'the', 'nimtto', 'wording', 'examples', 'planning', 'etiquette', 'send']);
/**
 * The designs under a post, never empty: the writer's picks, then designs whose words match the post (title,
 * keywords, category), then the website's featured designs, then the rest in the website's order. Designs already
 * in the post's design cards come last. Up to n.
 */
export function relatedDesigns(post, siteDoc = null, { exclude = [], n = 4 } = {}) {
  const site = post.site;
  const out = [];
  const add = (s, inBody = false) => { if (out.length < n && !out.includes(s) && (inBody || !exclude.includes(s)) && designFor(site, s, siteDoc)) out.push(s); };
  for (const s of post.designs || []) add(s, true);
  const pool = orderedFor(site === 'intl' ? [...INTL_THEMES.map((d) => d.slug), ...NP_DESIGNS_INTL] : [...THEMES.map((t) => t.slug), ...INTL_THEMES.map((d) => d.slug)], siteDoc, site);
  const words = [...new Set(`${post.title} ${post.keyword || ''} ${(post.secondary || []).join(' ')} ${post.category}`.toLowerCase().match(/[a-zऀ-ॿ]{4,}/g) || [])].filter((w) => !MATCH_SKIP.has(w));
  if (words.length) {
    // a word in the design's name counts most (a "mehendi" post -> the Mehendi design), then its line and alt text
    pool.map((s, i) => { const d = anyDesign(s); const n = d.name.toLowerCase(); const t = `${d.line} ${d.alt || ''} ${d.words}`.toLowerCase(); return [s, words.reduce((sum, w) => sum + (n.includes(w) ? 3 : 0) + (t.includes(w) ? 1 : 0), 0), i]; })
      .filter(([, score]) => score > 0).sort((a, b) => b[1] - a[1] || a[2] - b[2]).forEach(([s]) => add(s));
  }
  featuredOf(siteDoc || {}, site).forEach((s) => add(s));
  pool.forEach((s) => add(s));
  pool.forEach((s) => add(s, true));
  return out;
}

const EYE = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
/** the small line under a design's name, as on the website's own design cards: its Nepali name ("International" for
 *  an international design on the Nepal site); on the international site its style ("Nepali" for a Nepal design) */
const subOf = (site, d) => (site === 'intl' ? esc(d.intl ? (STYLE_LABEL[d.style] || '') : 'Nepali') : d.intl ? 'International' : `<span lang="ne">${esc(d.ne || '')}</span>`);
/** The designs under a post (after "Keep reading"): the website's own design card (src/site/partials.mjs and
 *  src/site/intl.mjs designCard): the picture with the plan badge in its frame, the name, its second line, the price
 *  in the visitor's currency, one short line, Order and Preview. Four in a row, two by two on tablets and phones. */
function designsBlock(post, siteDoc, inBody = []) {
  const list = relatedDesigns(post, siteDoc, { exclude: inBody }).map((s) => [s, designFor(post.site, s, siteDoc)]);
  if (!list.length) return '';
  const intl = post.site === 'intl';
  const all = SITES[post.site].designs;
  const pricing = intl ? '/international/pricing/' : '/pricing/';
  return `<section class="sec sec--blush bp-designs" aria-labelledby="bp-d-h">
      <div class="wrap bp-w">
        <header class="bp-designs__head"><div><p class="eyebrow">Made for this</p><h2 class="h2" id="bp-d-h">Designs for this <em>occasion.</em></h2></div>
          <a class="bp-designs__all" href="${all}">See all designs ${ARROW}</a></header>
        <ul class="bp-dgrid">${list.map(([slug, d], i) => `<li class="dcard bp-dcard" data-slug="${slug}">
          <a class="dcard__pic" href="${d.page}" style="--tint:${!d.intl && CATEGORIES[d.cat] ? CATEGORIES[d.cat].tint : tintOf(post.site, i)}" tabindex="-1" aria-hidden="true">${phoneImg(slug, { sizes: '(max-width: 599px) 40vw, (max-width: 1023px) 30vw, 200px', alt: '' })}</a>
          <div class="dcard__body">
            <h3 class="dcard__name"><a href="${d.page}">${esc(d.name)}</a> <span class="dcard__ne">${subOf(post.site, d)}</span></h3>
            <p class="dcard__meta">${priceBits(post.site, slug, siteDoc)}</p>
            <p class="dcard__desc bp-dcard__l">${esc(d.line || '')}</p>
            <div class="dcard__acts">
              <a class="btn btn--accent btn--sm" href="${pricing}?design=${slug}#plans" data-order data-design="${slug}" aria-label="Order ${esc(d.name)}">Order</a>
              <a class="btn btn--ghost btn--sm" href="/${slug}/?showcase=1${intl ? '&amp;m=intl' : ''}" data-preview="${slug}" aria-label="Preview ${esc(d.name)}">${EYE}Preview</a>
            </div>
          </div></li>`).join('')}</ul>
      </div>
    </section>`;
}
/** related: the post's own picks, then the same category, then the newest */
export function relatedPosts(post, all, n = 3) {
  const pool = all.filter((p) => p.site === post.site && p.id !== post.id && p.status === 'published');
  const out = [];
  const add = (p) => { if (p && !out.includes(p) && out.length < n) out.push(p); };
  for (const s of post.related || []) add(pool.find((p) => p.slug === s));
  pool.filter((p) => p.category === post.category).forEach(add);
  pool.forEach(add);
  return out;
}

/** post: the post with `c` (compiled); others: this site's published posts (with c) for "related"; preview: noindex */
export function renderPost({ post, others = [], shell, preview = false, siteDoc = null }) {
  const site = post.site;
  const s = SITES[site];
  const c = post.c || compilePost(post);
  const url = abs(postPath(post));
  const trail = [[s.homeName, s.home], ['Blog', s.base], [post.title, postPath(post)]];
  const og = abs(ogOf(post));
  const published = isoDay(post.publishedAt);
  const updated = isoDay(post.updatedAt || post.publishedAt);
  const rel = relatedPosts(post, others);
  const faqHtml = c.faq.length ? `<section class="bp-faq" aria-labelledby="faq">
          <h2 id="faq">Questions people ask</h2>
          <div class="faq__list">${c.faq.map((x, i) => `<details class="qa"${i === 0 ? ' open' : ''}><summary class="qa__q"><span>${escNe(x.q)}</span><i aria-hidden="true"></i></summary><div class="qa__a"><p>${x.aHtml}</p></div></details>`).join('')}</div>
        </section>` : '';
  const main = `<div class="bp-progress" aria-hidden="true"><i></i></div>
    <div class="wrap bp-w">${crumbs(trail)}</div>
    <article class="bp" aria-labelledby="bp-h">
      <header class="wrap bp-w bp-head">
        <p class="eyebrow"><a class="bp-cat" href="${s.base}?topic=${esc(catSlug(post.category))}">${esc(post.category)}</a></p>
        <h1 class="bp-h1" id="bp-h">${escNe(post.title)}</h1>
      </header>
      ${heroImage(post)}
      <div class="wrap bp-w bp-intro">
        <p class="bp-standfirst" data-speak>${escNe(post.excerpt)}</p>
        <div class="bp-intro__row">
          <div class="bp-by">
            <img class="bp-by__mark" src="/favicon.svg" width="38" height="38" alt="" />
            <p class="bp-by__meta"><span class="bp-by__name">By <a href="${s.about}" rel="author">${esc(AUTHOR.name)}</a></span><span>Published <time datetime="${published}">${fmtDate(site, published)}</time></span><span>Updated <time datetime="${updated}">${fmtDate(site, updated)}</time></span><span>${c.minutes} min read</span></p>
          </div>
          ${share(post, url, 'top')}
        </div>
      </div>
      <div class="wrap bp-w bp-layout">
        ${toc(c)}
        <div class="bp-main">
          <div class="bp-body">${fillDesignSlots(c.html, post, siteDoc)}</div>
          ${faqHtml}
          <aside class="bp-author" aria-label="About the author">
            <img class="bp-author__mark" src="/favicon.svg" width="56" height="56" alt="" />
            <div><p class="bp-author__name"><a href="${s.about}" rel="author">${esc(AUTHOR.name)}</a></p><p class="bp-author__bio">${esc(AUTHOR.bio)}</p></div>
          </aside>
          ${share(post, url)}
        </div>
      </div>
    </article>
    ${rel.length ? `<section class="sec bp-rel" aria-labelledby="bp-rel-h"><div class="wrap">
        <header class="shead"><p class="eyebrow">Keep reading</p><h2 class="h2" id="bp-rel-h">Related <em>guides.</em></h2></header>
        <ul class="bl-grid">${rel.map((p, i) => card(p, p.c || compilePost(p), i)).join('')}</ul>
      </div></section>` : ''}
    ${designsBlock(post, siteDoc, c.designs || [])}
    ${closing(site)}
    ${crossband(site)}`;

  const { ld: schema } = postSchema(post, c);
  const ld = schema.map(jsonLd);
  const extra = `
  <meta property="article:published_time" content="${published}" />
  <meta property="article:modified_time" content="${updated}" />
  <meta property="article:section" content="${esc(post.category)}" />
  <meta property="article:author" content="${s.team}" />`;
  const title = metaTitle(post);
  const head = headTags({ title, desc: post.seoDesc || post.excerpt, url, image: og, imageAlt: post.cover?.alt || post.title, site, type: 'article', noindex: preview || post.status !== 'published', extra, ld });
  return fill(shell, head, main, site);
}

/** a post's <title>: its search title, or the title + " | Nimtto", in Title Case */
export const metaTitle = (post) => titleCase(post.seoTitle || `${post.title} | Nimtto`);
export const SCHEMA_TYPES = ['BlogPosting', 'Article', 'HowTo'];

/**
 * The JSON-LD a post page publishes (plain objects, in page order) and its search snippet: the article (BlogPosting,
 * or Article; a "guide with steps" (HowTo) adds a HowTo with one step per H2), the breadcrumbs, and FAQPage when
 * it has questions. post.speakable === false leaves the speakable part out. The studio's Schema panel shows the same.
 */
export function postSchema(post, c = post.c || compilePost(post)) {
  const s = SITES[post.site];
  const url = abs(postPath(post));
  const trail = [[s.homeName, s.home], ['Blog', s.base], [post.title, postPath(post)]];
  const og = abs(ogOf(post));
  const published = isoDay(post.publishedAt);
  const updated = isoDay(post.updatedAt || post.publishedAt);
  const desc = post.seoDesc || post.excerpt;
  const author = { ...AUTHOR_LD, url: s.team, description: AUTHOR.bio };
  const images = [og, coverUrl(post) && abs(coverUrl(post))].filter(Boolean);
  const article = {
    '@context': 'https://schema.org', '@type': post.schemaType === 'Article' ? 'Article' : 'BlogPosting', '@id': `${url}#article`, url,
    headline: post.title.slice(0, 110), description: desc, abstract: post.excerpt,
    image: images.map((u, i) => (i === 0 ? { '@type': 'ImageObject', url: u, width: 1200, height: 630 } : u)),
    datePublished: published, dateModified: updated,
    author, publisher: { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: 'Nimtto', url: `${SITE_URL}/`, logo: { '@type': 'ImageObject', url: `${SITE_URL}/site/brand/nimtto-logo.svg` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    isPartOf: { '@type': 'Blog', '@id': `${abs(s.base)}#blog`, name: s.name, url: abs(s.base) },
    wordCount: c.words, timeRequired: `PT${c.minutes}M`, articleSection: post.category, inLanguage: s.lang,
    ...(post.keyword ? { keywords: [post.keyword, ...(post.secondary || [])].join(', ') } : {}),
    ...(post.speakable === false ? {} : { speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.bp-h1', '.bp-standfirst'] } }),
  };
  const ld = [article, { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })) }];
  if (c.faq.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: c.faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) });
  if (post.schemaType === 'HowTo') {
    const steps = c.toc.filter((t) => t.level === 2);
    ld.push({
      '@context': 'https://schema.org', '@type': 'HowTo', '@id': `${url}#howto`, name: post.title.slice(0, 110), description: desc, image: og,
      totalTime: `PT${c.minutes}M`, inLanguage: s.lang,
      step: steps.map((t, i) => ({ '@type': 'HowToStep', position: i + 1, name: t.text, text: t.text, url: `${url}#${t.id}` })),
    });
  }
  return { title: metaTitle(post), desc, url, ld };
}

/** What Google needs in each block, as a list for the studio: [{ ok, text }]. */
export function schemaChecks(ld) {
  const out = [];
  const add = (ok, text) => out.push({ ok: Boolean(ok), text });
  const a = ld.find((x) => x['@type'] === 'BlogPosting' || x['@type'] === 'Article');
  add(a, 'An article block is published');
  if (a) {
    add(a.headline && a.headline.length <= 110, 'Headline is set (110 characters at most)');
    add(a.description, 'Description is set (search description or standfirst)');
    add(Array.isArray(a.image) && a.image.length, 'Image is set');
    add(a.author?.name && a.publisher?.name && a.publisher?.logo?.url, 'Author and publisher with logo');
    add(/^\d{4}-\d{2}-\d{2}$/.test(a.datePublished) && /^\d{4}-\d{2}-\d{2}$/.test(a.dateModified), 'Published and modified dates');
    add(a.wordCount > 0, 'Word count');
    add(a.articleSection, 'Article section (category)');
    add(a.keywords, 'Keywords (from the focus keyword)');
  }
  add(ld.some((x) => x['@type'] === 'BreadcrumbList'), 'Breadcrumbs');
  const f = ld.find((x) => x['@type'] === 'FAQPage');
  if (f) add(f.mainEntity.every((q) => q.name && q.acceptedAnswer?.text), 'Every question has an answer');
  const h = ld.find((x) => x['@type'] === 'HowTo');
  if (h) add(h.step.length >= 2, 'The guide has at least 2 steps (one per H2 heading)');
  return out;
}

export function renderNotFound({ site, shell }) {
  const s = SITES[site];
  const head = `<title>Guide Not Found | Nimtto</title>\n  <meta name="robots" content="noindex, nofollow" />`;
  const main = `<div class="wrap">${crumbs([[s.homeName, s.home], ['Blog', s.base], ['Not found', s.base]])}</div>
    <header class="wrap pagehead"><p class="eyebrow">404</p><h1 class="display">This guide <em>isn’t here.</em></h1>
      <p class="lede">It may have moved, or the link is mistyped. The rest of the guides are one tap away.</p>
      <p class="bl-404"><a class="btn btn--accent btn--lg" href="${s.base}">See all guides</a></p></header>`;
  return fill(shell, head, main, site);
}

/* ---------------- feeds, sitemap, llms ---------------- */
const rfc822 = (iso) => new Date(`${isoDay(iso)}T06:00:00Z`).toUTCString();
export function renderRss(site, posts) {
  const s = SITES[site];
  const items = posts.slice(0, 50).map((p) => `    <item>
      <title>${xml(p.title)}</title>
      <link>${abs(postPath(p))}</link>
      <guid isPermaLink="true">${abs(postPath(p))}</guid>
      <pubDate>${rfc822(p.publishedAt)}</pubDate>
      <category>${xml(p.category)}</category>
      <dc:creator>${xml(AUTHOR.name)}</dc:creator>
      <description>${xml(p.excerpt)}</description>
      <enclosure url="${xml(abs(ogOf(p)))}" type="image/jpeg" length="0" />
    </item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xml(s.feedTitle)}</title>
    <link>${abs(s.base)}</link>
    <atom:link href="${abs(`${s.base}rss.xml`)}" rel="self" type="application/rss+xml" />
    <description>${xml(s.desc)}</description>
    <language>${s.lang.toLowerCase()}</language>
    ${posts[0] ? `<lastBuildDate>${rfc822(posts[0].updatedAt || posts[0].publishedAt)}</lastBuildDate>` : ''}
    <image><url>${SITE_URL}/apple-touch-icon.png</url><title>${xml(s.feedTitle)}</title><link>${abs(s.base)}</link></image>
${items}
  </channel>
</rss>
`;
}
export function renderSitemap(bySite) {
  const urls = [];
  for (const site of ['np', 'intl']) {
    const posts = bySite[site] || [];
    const last = posts.reduce((m, p) => (isoDay(p.updatedAt || p.publishedAt) > m ? isoDay(p.updatedAt || p.publishedAt) : m), '');
    urls.push(`  <url><loc>${abs(SITES[site].base)}</loc>${last ? `<lastmod>${last}</lastmod>` : ''}<priority>0.7</priority>\n    <image:image><image:loc>${abs(SITES[site].og)}</image:loc></image:image></url>`);
    for (const p of posts) {
      const imgs = [ogOf(p), coverUrl(p), ...(p.c?.images || [])].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);
      urls.push(`  <url><loc>${abs(postPath(p))}</loc><lastmod>${isoDay(p.updatedAt || p.publishedAt)}</lastmod><priority>0.6</priority>${imgs.map((i) => `\n    <image:image><image:loc>${xml(abs(i))}</image:loc></image:image>`).join('')}</url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`;
}
export const LLMS_START = '<!-- blog:start -->';
export const LLMS_END = '<!-- blog:end -->';
/** the blog's part of llms.txt (a list) or llms-full.txt (every post's words) */
export function llmsBlock(bySite, full = false) {
  const part = (site, h) => {
    const posts = bySite[site] || [];
    if (!posts.length) return '';
    if (!full) return `## ${h}\n${posts.map((p) => `- [${p.title}](${abs(postPath(p))}): ${p.excerpt}`).join('\n')}\n`;
    return posts.map((p) => `## ${p.title}\nURL: ${abs(postPath(p))}\nBy ${AUTHOR.name} · Published ${isoDay(p.publishedAt)} · Updated ${isoDay(p.updatedAt || p.publishedAt)}\n${p.excerpt}\n\n${p.text || ''}\n\n${(p.faq || []).map((x) => `### ${x.q}\n${x.a}\n`).join('\n')}`).join('\n');
  };
  return `${LLMS_START}\n${part('np', full ? 'Blog (Nepal)' : 'Blog: Nepal site')}${full ? '\n' : '\n'}${part('intl', full ? 'Blog (International)' : 'Blog: International site')}${LLMS_END}`;
}

/* ---------------- the shells ---------------- */
const FALLBACK_SHELL = (site) => `<!doctype html>
<html lang="${site === 'intl' ? 'en-US' : 'en-NP'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <link rel="icon" href="/favicon.ico" sizes="48x48" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <!--blog:head-->
</head>
<body data-page="blog"${site === 'intl' ? ' class="market-intl"' : ''}>
  <main id="main"><!--blog:main--></main>
</body>
</html>
`;
const shells = new Map();
/** The built shell of a site's blog pages (read once; dist does not change while the server runs). */
export function shellFor(distDir, site) {
  const key = `${distDir}|${site}`;
  if (shells.has(key)) return shells.get(key);
  const file = resolve(distDir, ...(site === 'intl' ? ['international', 'blog'] : ['blog']), 'index.html');
  let html = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (!html.includes('<!--blog:main-->') || !html.includes('<!--blog:head-->')) html = FALLBACK_SHELL(site);
  shells.set(key, html);
  return html;
}
