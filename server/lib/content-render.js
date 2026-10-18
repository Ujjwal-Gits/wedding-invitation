// Writes the studio's Content edits into a built page (dist/**/index.html) at request time. Pure string work on the
// hooks the build leaves in the markup (src/site/partials.mjs cmsSlot, data-cms="..."):
//   <title>, meta description, og:/twitter: title and description, the WebPage JSON-LD (data-cms="webpage")
//   data-cms="h1" / "lede"            the page heading and its intro (inner HTML replaced)
//   <!--cms:faq-->...<!--/cms:faq-->  the questions AND their FAQPage JSON-LD, always re-rendered together
//   data-contact="wa|phone|email"     contact links (href) and their *-text spans, as src/site/common.js applyContact
//   data-cms="hours" | "foot-blurb" | "foot-pay", slots announce / foot-extra / trust, the Organization JSON-LD (org)
//   <img src="/site/brand/nimtto-logo(-intl).svg">  the header and footer logo (Website → Branding)
// Everything written here is escaped text or the safe subset from lib/safe-html.js. No inline script or style is
// added (JSON-LD blocks are data, never executed), so the CSP is unchanged.
import { escText, escAttr, cleanInline, inlineText, htmlToModel, decodeEntities, INLINE, HEADING, safeHref } from './safe-html.js';

const NONE = new Set();
// the built header and footer logos, and what may replace them (an upload: lib/branding.js BRAND_URL_RE)
const LOGO_IMG_RE = /(<img\b[^>]*?\bsrc=")\/site\/brand\/nimtto-logo(?:-intl)?\.svg("[^>]*>)/g;
const LOGO_URL_RE = /^\/uploads\/_site\/brand\/[A-Za-z0-9_-]{24}\.(?:svg|png|webp)$/;
export const jsonLd = (o, attrs = '') => `<script type="application/ld+json"${attrs}>${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

const slotRe = (name) => new RegExp(`(<!--cms:${name}-->)([\\s\\S]*?)(<!--/cms:${name}-->)`);
const hookRe = (tag, name) => new RegExp(`(<${tag}\\b[^>]*\\bdata-cms="${name}"[^>]*>)([\\s\\S]*?)(</${tag}>)`);
const ldRe = (name) => new RegExp(`(<script type="application/ld\\+json" data-cms="${name}"[^>]*>)([\\s\\S]*?)(</script>)`);
const metaRe = (attr, key) => new RegExp(`(<meta ${attr}="${key}" content=")([^"]*)(")`);

export const setSlot = (html, name, inner) => html.replace(slotRe(name), (m, a, _, b) => a + inner + b);
const setHook = (html, tag, name, inner) => html.replace(hookRe(tag, name), (m, a, _, b) => a + inner + b);
const setMeta = (html, attr, key, value) => html.replace(metaRe(attr, key), (m, a, _, b) => a + escAttr(value) + b);
function setLd(html, name, fn) {
  return html.replace(ldRe(name), (m, a, body, b) => {
    let o;
    try { o = JSON.parse(body); } catch { return m; }
    return a + JSON.stringify(fn(o) ?? o).replace(/</g, '\\u003c') + b;
  });
}
const pick = (html, re, i = 2) => { const m = re.exec(html); return m ? m[i] : null; };

/* ---------------- what a built page says by itself (the defaults the studio shows) ---------------- */

/** The questions of a built FAQ region: [{ q, a, group? }] and whether they come in groups (the FAQ pages). */
export function readFaq(region) {
  const items = [];
  let grouped = false;
  let group = '';
  const re = /<h2 class="h3 faq__gh"[^>]*>([\s\S]*?)<\/h2>|<summary class="qa__q"><span>([\s\S]*?)<\/span><i aria-hidden="true"><\/i><\/summary><div class="qa__a"><p>([\s\S]*?)<\/p><\/div>/g;
  for (const m of String(region || '').matchAll(re)) {
    if (m[1] != null) { grouped = true; group = htmlToModel(m[1], NONE); continue; }
    items.push({ q: htmlToModel(m[2], NONE), a: htmlToModel(m[3], INLINE), ...(grouped ? { group } : {}) });
  }
  return { items, grouped };
}

/** The page's own words and hooks: { id, site, title, desc, h1, lede, faq, faqGrouped, hasH1, hasLede, url }, or null
 *  for HTML that is not a public website page (no WebPage hook). */
export function readPage(html) {
  const ld = /<script type="application\/ld\+json" data-cms="webpage" data-cms-id="([^"]*)" data-cms-site="([^"]*)">/.exec(html);
  if (!ld) return null;
  const h1 = pick(html, hookRe('h1', 'h1'));
  const lede = pick(html, hookRe('p', 'lede'));
  const faqRegion = pick(html, slotRe('faq'));
  const faq = faqRegion == null ? null : readFaq(faqRegion);
  return {
    id: decodeEntities(ld[1]),
    site: ld[2] === 'intl' || ld[2] === 'both' ? ld[2] : ld[2] === 'np' ? 'np' : '',
    url: decodeEntities(pick(html, /<link rel="canonical" href="([^"]*)"/, 1) || ''),
    title: decodeEntities(pick(html, /<title\b[^>]*>([\s\S]*?)<\/title>/, 1) || '').trim(),
    desc: decodeEntities(pick(html, metaRe('name', 'description')) || ''),
    hasH1: h1 != null,
    h1: h1 == null ? '' : htmlToModel(h1, HEADING),
    hasLede: lede != null,
    lede: lede == null ? '' : htmlToModel(lede, INLINE),
    faq: faq && faq.items.length ? faq.items : null,
    faqGrouped: Boolean(faq?.grouped),
  };
}

/** The site-wide words a built page carries (footer, contact hours): the defaults of the Contact & footer tab. */
export function readSiteBits(html) {
  const inner = (tag, name) => { const v = pick(html, hookRe(tag, name)); return v == null ? null : htmlToModel(v, INLINE); };
  return { footBlurb: inner('p', 'foot-blurb'), footPay: inner('p', 'foot-pay'), hours: inner('span', 'hours') };
}

/* ---------------- rendering ---------------- */

/** Consecutive items with the same group heading form one group; an item without one stays in the group before it. */
function groupsOf(items) {
  const out = [];
  for (const x of items) {
    const g = String(x.group || '').trim();
    if (!out.length || (g && g !== out[out.length - 1][0])) out.push([g || 'Questions', []]);
    out[out.length - 1][1].push(x);
  }
  return out;
}
const qa = (x, open) => `<details class="qa"${open ? ' open' : ''}><summary class="qa__q"><span>${escText(x.q)}</span><i aria-hidden="true"></i></summary><div class="qa__a"><p>${cleanInline(x.a)}</p></div></details>`;
const faqList = (items, openFirst) => `<div class="faq__list">${items.map((x, i) => qa(x, openFirst && i === 0)).join('')}</div>`;
/** FAQPage JSON-LD for exactly the questions shown (answers as plain text). */
export const faqLd = (items) => jsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: inlineText(cleanInline(x.a)) } })) });
/** The FAQ region: the same markup as src/site/partials.mjs faqBlock / faqGroups, and its JSON-LD from the same list. */
export function renderFaq(items, grouped = false) {
  if (!grouped) return faqList(items, true) + faqLd(items);
  return groupsOf(items).map(([h, list], g) => `<section class="faq__group" aria-labelledby="fg-${g}"><h2 class="h3 faq__gh" id="fg-${g}">${escText(h)}</h2>${faqList(list, g === 0)}</section>`).join('') + faqLd(items);
}

/** +9779806393298 -> +977 980-6393298 (Nepali mobiles); anything else as given (as src/site/common.js prettyPhone) */
export function prettyPhone(v) {
  const s = String(v || '').trim();
  const d = s.replace(/[^\d]/g, '');
  if (/^977\d{10}$/.test(d) && /^[+\d\s-]+$/.test(s)) return `+977 ${d.slice(3, 6)}-${d.slice(6)}`;
  return s;
}
const EMAIL_RE = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;
/** The values of the data-contact hooks for one site's contact lines (empty when a line is not set). */
export function contactValues(c = {}) {
  const wa = String(c.whatsapp || '').replace(/[^\d]/g, '');
  const phone = String(c.phone || '').trim();
  const email = EMAIL_RE.test(String(c.email || '').trim()) ? String(c.email).trim() : '';
  return {
    wa: wa.length >= 8 && wa.length <= 15 ? `https://wa.me/${wa}` : '',
    'wa-text': wa.length >= 8 ? prettyPhone(c.whatsapp) : '',
    phone: phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '',
    'phone-text': prettyPhone(phone),
    email: email ? `mailto:${email}` : '',
    'email-text': email,
  };
}
const telOf = (p) => String(p || '').trim().replace(/\s+/g, '-');

/**
 * The Organization node (built from src/site/seo-site.mjs NAP / SAME_AS) with the studio's contact lines, address
 * and social profiles in place of the built ones. Every existing ContactPoint keeps its shape; only its email and
 * telephone follow the Nepal contact lines. A different International email or phone adds one more point. Social
 * profiles, when any are set, replace sameAs. Nothing changes when the values are the built ones.
 */
function updateOrg(o, org) {
  const node = Array.isArray(o?.['@graph']) ? o['@graph'].find((x) => x?.['@type'] === 'Organization') : null;
  if (!node) return o;
  const { np = {}, intl = null, sameAs = [], address = '' } = org;
  const tel = np.phone ? telOf(np.phone) : '';
  if (np.email) node.email = np.email;
  if (tel) node.telephone = tel;
  const points = node.contactPoint == null ? [] : Array.isArray(node.contactPoint) ? node.contactPoint : [node.contactPoint];
  for (const p of points) {
    if (np.email && p.email) p.email = np.email;
    if (tel && p.telephone) p.telephone = tel;
  }
  if (intl && ((intl.email && intl.email !== np.email) || (intl.phone && intl.phone !== np.phone))) {
    const extra = { '@type': 'ContactPoint', contactType: 'customer support', ...(intl.email ? { email: intl.email } : {}), ...(intl.phone ? { telephone: telOf(intl.phone) } : {}), availableLanguage: ['English'], areaServed: ['US', 'GB', 'CA', 'AU', 'AE'] };
    node.contactPoint = [...points, extra];
  }
  if (address) node.address = { ...(node.address || {}), '@type': 'PostalAddress', streetAddress: address, addressCountry: node.address?.addressCountry || 'NP' };
  if (sameAs.length) node.sameAs = sameAs;
  return o;
}

/** The announcement bar (empty when there is nothing to say). */
export function announceHtml(a) {
  if (!a?.text) return '';
  const href = safeHref(a.link);
  return `<div class="announce" role="region" aria-label="Announcement"><p class="wrap announce__in"><span class="announce__t">${escText(a.text)}</span>${href ? ` <a class="announce__a" href="${escAttr(href)}">${escText(a.linkText || 'Find out more')}</a>` : ''}</p></div>`;
}
/** The footer's extra lines under the brand words: social profiles, then the address and hours. */
export function footExtraHtml({ social = [], address = '', hours = '' } = {}) {
  const links = social.filter(([, , url]) => safeHref(url).startsWith('https://'));
  const lines = [address, hours].map((x) => String(x || '').trim()).filter(Boolean);
  return (links.length ? `<ul class="foot__social" aria-label="Nimtto on social media">${links.map(([, label, url]) => `<li><a href="${escAttr(url)}" target="_blank" rel="me noopener">${escText(label)}</a></li>`).join('')}</ul>` : '')
    + (lines.length ? `<p class="foot__addr">${lines.map(escText).join(' · ')}</p>` : '');
}
/** The trust and policy lines in the footer's base row. */
export function trustHtml({ line = '', policy = '' } = {}) {
  return (line ? `<p class="foot__trust">${cleanInline(line)}</p>` : '') + (policy ? `<p class="foot__policy">${cleanInline(policy)}</p>` : '');
}

/**
 * The page with `v` written in. v (every key optional; missing = leave the build's words):
 *   title, desc        plain text
 *   h1, lede           the editor's text (heading: <em> only; intro: the inline subset)
 *   h1Text, ledeText   plain text instead (the Website page's headline), used when h1 / lede are empty
 *   faq                { items: [{ q, a, group? }], grouped }
 *   contact            { email, phone, whatsapp } of this page's site; hours (text)
 *   footBlurb, footPay the editor's text (inline subset)
 *   footExtra, trust, announce  ready HTML from the helpers above ('' empties the slot)
 *   org                { np, intl, sameAs, address } for the Organization JSON-LD
 *   logo               an uploaded logo's URL (lib/branding.js BRAND_URL_RE) for the header and footer images
 */
export function applyContent(html, v = {}) {
  let out = html;
  if (v.title) {
    out = out.replace(/(<title\b[^>]*>)[\s\S]*?(<\/title>)/, (m, a, b) => a + escText(v.title) + b);
    out = setMeta(out, 'property', 'og:title', v.title);
    out = setMeta(out, 'name', 'twitter:title', v.title);
  }
  if (v.desc) {
    out = setMeta(out, 'name', 'description', v.desc);
    out = setMeta(out, 'property', 'og:description', v.desc);
    out = setMeta(out, 'name', 'twitter:description', v.desc);
  }
  if (v.title || v.desc) out = setLd(out, 'webpage', (o) => { if (v.title) o.name = v.title; if (v.desc) o.description = v.desc; return o; });
  if (v.h1 || v.h1Text) out = setHook(out, 'h1', 'h1', v.h1 ? cleanInline(v.h1, HEADING) : escText(v.h1Text));
  if (v.lede || v.ledeText) out = setHook(out, 'p', 'lede', v.lede ? cleanInline(v.lede, INLINE) : escText(v.ledeText));
  if (v.faq?.items?.length) out = setSlot(out, 'faq', renderFaq(v.faq.items, v.faq.grouped));
  if (v.contact) {
    const c = contactValues(v.contact);
    out = out.replace(/<a\b[^>]*\bdata-contact="(wa|phone|email)"[^>]*>/g, (tag, k) => (c[k] ? tag.replace(/\bhref="[^"]*"/, () => `href="${escAttr(c[k])}"`) : tag));
    out = out.replace(/(<(span|b|strong|p)\b[^>]*\bdata-contact="(wa-text|phone-text|email-text)"[^>]*>)[^<]*(<\/\2>)/g, (m, a, tag, k, b) => (c[k] ? a + escText(c[k]) + b : m));
  }
  if (v.hours) out = setHook(out, 'span', 'hours', escText(v.hours));
  if (v.footBlurb) out = setHook(out, 'p', 'foot-blurb', cleanInline(v.footBlurb));
  if (v.footPay) out = setHook(out, 'p', 'foot-pay', cleanInline(v.footPay));
  if (v.footExtra != null) out = setSlot(out, 'foot-extra', v.footExtra);
  if (v.trust != null) out = setSlot(out, 'trust', v.trust);
  if (v.announce != null) out = setSlot(out, 'announce', v.announce);
  if (v.org) out = setLd(out, 'org', (o) => updateOrg(o, v.org));
  if (v.logo && LOGO_URL_RE.test(v.logo)) out = out.replace(LOGO_IMG_RE, (m, a, b) => `${a}${escAttr(v.logo)}${b.replace(/^"/, '" data-brand="custom"')}`);
  return out;
}
