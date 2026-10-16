// Nimtto public website. Everything that comes from the API is rendered with textContent / attributes only.
import './site.css';
import { THEMES, BY_SLUG, NE_NAMES, FALLBACK_SITE, countWord } from './themes.js';
import { enhance } from '../ui/enhance.js'; // Nimtto dropdowns and date picker on the order form
import SMALL_THUMBS from './thumbs.json'; // slugs with /site/thumbs/<slug>-480|800.webp (node src/site/make-thumbs.mjs)

const $ = (s, r = document) => r.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/;
enhance(document.getElementById('order') || document);
const FIRST_PHONE = 11; // cards shown before "Show all": 11 on phones (ends on a wide card), 12 from 600px (four rows of three)
const FIRST_WIDE = 12;
const from600 = matchMedia('(min-width: 600px)');

/** create an element with text and attributes (never HTML) */
function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c != null) n.append(c);
  return n;
}
const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
// only same-origin paths ('/x', never '//x' or 'javascript:')
const localPath = (v, fallback) => (typeof v === 'string' && /^\/(?!\/)[A-Za-z0-9._~\-/]*$/.test(v) ? v : fallback);
const pad = (n) => String(n).padStart(2, '0');

async function getJson(url, ms = 6000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctl.signal, credentials: 'same-origin' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; } finally { clearTimeout(t); }
}

/* ---------------- header ---------------- */
function initBar() {
  const bar = $('.bar');
  const btn = $('#menu-btn');
  const nav = $('#nav');
  const close = () => { bar.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', () => {
    const open = !bar.classList.contains('is-open');
    bar.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && bar.classList.contains('is-open')) { close(); btn.focus(); } });
  let ticking = false;
  const upd = () => { ticking = false; bar.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  upd();
}

/* ---------------- hero: the doors (the one signature motion) ----------------
   Two blush leaves meet over a real design with निम्तो across the seam and swing open once (CSS keyframes, so it
   runs without JS). JS only holds them shut until the picture has decoded, then hides the leaves to free the layers.
   Under the arch, two quiet buttons crossfade between a few designs. Reduced motion: no leaves at all. */
const HERO = [
  ['gurans', 'a gate of fresh roses and marigold strings under शुभ विवाह', '50% 46%'],
  ['dhaka', 'an ivory envelope with a Dhaka band and a wax seal among red roses', '50% 46%'],
  ['sayapatri', 'a doorway hung with fresh marigold strings and mango leaves', '50% 16%'],
  ['mangal', 'a red carved doorway hung with marigold garlands and brass bells', '50% 22%'],
  ['swayambar', 'two marigold garlands around Ganesh', '50% 34%'],
  ['mahal', 'a golden palace gate tied with an ivory satin bow', '50% 40%'],
];
const hero = { list: [], imgs: [], i: 0 };

function initDoor() {
  const door = $('#door');
  const first = $('#screens img');
  first.style.setProperty('--pos', HERO[0][2]);
  let held = true;
  const release = () => { if (held) { held = false; door.classList.remove('is-waiting'); } };
  if (!reduced.matches && !(first.complete && first.naturalWidth)) {
    door.classList.add('is-waiting');
    const fonts = document.fonts?.ready || Promise.resolve();
    Promise.all([first.decode?.().catch(() => {}), fonts]).then(release);
    setTimeout(release, 2500); // never keep the doors shut on a slow connection
  }
  door.querySelector('.door__leaf--r').addEventListener('animationend', () => door.classList.add('is-open'), { once: true });
  $('#door-prev').addEventListener('click', () => showHero(hero.i - 1));
  $('#door-next').addEventListener('click', () => showHero(hero.i + 1));
  $('#door-arch').addEventListener('click', (e) => {
    const t = hero.list[hero.i];
    const i = t ? view.themes.findIndex((x) => x.slug === t.slug) : -1;
    if (i >= 0) openLightbox(i, e.currentTarget);
  });
  buildHero();
}

function buildHero(hidden = new Set()) {
  hero.list = HERO.filter(([s]) => !hidden.has(s) && BY_SLUG[s]).map(([slug, alt, pos]) => ({ ...BY_SLUG[slug], slug, alt, pos }));
  const box = $('#screens');
  const first = box.querySelector('img');
  // keep the first picture (it carries the doors' settle); drop any others and rebuild them on demand
  [...box.querySelectorAll('img')].forEach((img) => { if (img !== first) img.remove(); });
  hero.imgs = hero.list.map((t, i) => (i === 0 && first?.dataset.slug === t.slug ? first : null));
  if (!hero.imgs[0] && first) first.remove();
  $('#cap-total').textContent = String(hero.list.length);
  $('.door__nav').hidden = hero.list.length < 2;
  hero.i = -1;
  showHero(0, true);
}

function heroImg(i) {
  if (hero.imgs[i]) return hero.imgs[i];
  const t = hero.list[i];
  const img = el('img', {
    class: 'scr', src: `/site/phones/${t.slug}.webp`, width: 780, height: 1688,
    alt: `The ${t.name} design on a phone: ${t.alt}`, decoding: 'async', 'data-slug': t.slug,
  });
  img.style.setProperty('--pos', t.pos);
  $('#screens').append(img);
  hero.imgs[i] = img;
  return img;
}

function showHero(i, instant = false) {
  const n = hero.list.length;
  if (!n) return;
  i = (i + n) % n;
  if (i === hero.i) return;
  hero.i = i;
  const t = hero.list[i];
  const img = heroImg(i);
  const swap = () => {
    if (hero.i !== i) return;
    hero.imgs.forEach((m) => m?.classList.toggle('is-on', m === img));
  };
  if (instant || (img.complete && img.naturalWidth)) swap(); else img.addEventListener('load', swap, { once: true });
  $('#cap-i').textContent = String(i + 1);
  $('#cap-name').textContent = t.name;
  $('#cap-ne').textContent = t.ne;
  $('#door-arch').setAttribute('aria-label', `See the ${t.name} design larger`);
  // warm the next picture once the page has settled
  if (n > 1) (window.requestIdleCallback || setTimeout)(() => heroImg((i + 1) % n));
}

/* ---------------- site settings ---------------- */
function applyHero(site) {
  const t = str(site.hero?.title, 160);
  const s = str(site.hero?.subtitle, 300);
  if (t) $('[data-site="hero-title"]').textContent = t;
  if (s) $('[data-site="hero-subtitle"]').textContent = s;
}

const fmt = new Intl.NumberFormat('en-IN');
function renderPlans(site) {
  const list = $('#plans');
  const plans = Array.isArray(site.plans) && site.plans.length ? site.plans : FALLBACK_SITE.plans;
  list.replaceChildren();
  const planSel = $('#f-plan');
  planSel.replaceChildren(el('option', { value: '', text: 'Not sure yet' }));
  plans.slice(0, 8).forEach((p, i) => {
    const id = str(p.id, 32);
    const name = str(p.name, 60) || 'Plan';
    const priced = Number.isFinite(p.price) && p.price >= 0;
    const feats = Array.isArray(p.features) ? p.features.map((f) => str(f, 120)).filter(Boolean).slice(0, 20) : [];
    const note = str(p.note, 200);
    const li = el('li', { class: `plan${p.highlight ? ' plan--hi' : ''}` },
      el('p', { class: 'plan__n', 'aria-hidden': 'true', text: pad(i + 1) }),
      el('div', { class: 'plan__main' },
        el('h3', { class: 'plan__name' }, document.createTextNode(name), p.highlight ? el('span', { class: 'plan__flag', text: 'Most chosen' }) : null),
        note ? el('p', { class: 'plan__note', text: note }) : null,
        feats.length ? el('ul', { class: 'plan__feats' }, ...feats.map((f) => el('li', { text: f }))) : null),
      priced
        ? el('p', { class: 'plan__price' }, el('span', { class: 'plan__cur', text: 'NPR' }), document.createTextNode(fmt.format(p.price)))
        : el('p', { class: 'plan__price plan__price--ask', text: 'Ask for price' }),
      el('a', { class: `btn ${p.highlight ? 'btn--accent' : 'btn--line'} plan__cta`, href: '#order', 'data-plan': id, text: `Choose ${name}` }),
    );
    list.append(li);
    if (id) planSel.append(el('option', { value: id, text: priced ? `${name} · NPR ${fmt.format(p.price)}` : name }));
  });
  list.onclick = (e) => {
    const a = e.target.closest('[data-plan]');
    if (!a) return;
    setKind('order');
    planSel.value = a.dataset.plan;
  };
}

function waLink(v) {
  const s = str(v, 200);
  if (!s) return '';
  if (/^https:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//i.test(s)) return s;
  const digits = s.replace(/[^\d]/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : '';
}
function renderContact(site) {
  const c = site.contact || {};
  const list = $('#contact-list');
  list.replaceChildren();
  const add = (label, valueNode) => list.append(el('div', { class: 'contact__item' }, el('dt', { text: label }), el('dd', {}, valueNode)));
  const phone = str(c.phone, 30);
  if (phone) add('Phone', el('a', { href: `tel:${phone.replace(/[^\d+]/g, '')}`, text: phone }));
  const wa = waLink(c.whatsapp);
  if (wa) add('WhatsApp', el('a', { href: wa, target: '_blank', rel: 'noopener', text: /^\+?[\d\s()-]+$/.test(str(c.whatsapp)) ? str(c.whatsapp) : 'Message us' }));
  const email = str(c.email, 254);
  if (email && /^[^\s@<>()",;:]+@[^\s@<>]+\.[A-Za-z]{2,}$/.test(email)) add('Email', el('a', { href: `mailto:${email}`, text: email }));
  const addr = str(c.address, 300);
  if (addr) add('Address', document.createTextNode(addr));
  $('#contact-empty').hidden = list.childElementCount > 0;
  window.__nimttoWa = wa; // used by the form's error message
}

/* ---------------- designs ---------------- */
function normaliseThemes(api, site) {
  const hidden = new Set(Array.isArray(site.hiddenThemes) ? site.hiddenThemes : []);
  let list = Array.isArray(api) && api.length
    ? api.filter((t) => t && SLUG_RE.test(t.slug) && !hidden.has(t.slug)).map((t) => {
      const local = BY_SLUG[t.slug] || {};
      return {
        slug: t.slug,
        name: str(t.name, 60) || local.name || t.slug,
        ne: local.ne || NE_NAMES[t.slug] || '',
        concept: local.concept || str(t.concept, 240) || '',
        alt: local.alt || `${str(t.name, 60) || t.slug} design`,
        thumb: localPath(t.thumb, local.thumb || `/themes/${t.slug}/thumb.jpg`),
      };
    })
    : THEMES.filter((t) => !hidden.has(t.slug));
  const featured = (Array.isArray(site.featuredThemes) ? site.featuredThemes : []).filter((s) => list.some((t) => t.slug === s));
  if (featured.length) {
    const rank = (s) => { const i = featured.indexOf(s); return i < 0 ? Infinity : i; };
    list = list.map((t, i) => ({ t, i })).sort((a, b) => (rank(a.t.slug) - rank(b.t.slug)) || (a.i - b.i)).map(({ t }) => ({ ...t, featured: featured.includes(t.slug) }));
  } else {
    // no featured list set: open with the lightest, freshest designs, then the richer ones
    const lead = ['swayambar', 'gurans', 'sindoor', 'mala', 'dhaka', 'mahal', 'laali', 'rangoli', 'sayapatri', 'pardaa', 'hariyo', 'mangal', 'jhyal', 'nimantrana', 'agni', 'janti'];
    list = [...lead.map((s) => list.find((t) => t.slug === s)).filter(Boolean), ...list.filter((t) => !lead.includes(t.slug))];
  }
  return list;
}

const small = new Set(SMALL_THUMBS);
const srcsetFor = (t) => (small.has(t.slug) && t.thumb === `/themes/${t.slug}/thumb.jpg`
  ? `/site/thumbs/${t.slug}-480.webp 480w, /site/thumbs/${t.slug}-800.webp 800w, ${t.thumb} 1200w` : null);

const view = { themes: [] }; // the designs in gallery order (the lightbox walks this list)

function renderGallery(themes) {
  const ol = $('#gallery');
  const more = $('#gallery-more');
  ol.replaceChildren();
  ol.classList.remove('is-open');
  view.themes = themes;
  const word = countWord(themes.length);
  document.querySelectorAll('.js-count').forEach((n) => { n.textContent = n.dataset.cap ? word[0].toUpperCase() + word.slice(1) : word; });
  document.querySelectorAll('.js-num').forEach((n) => { n.textContent = String(themes.length); });
  themes.forEach((t, i) => {
    const wideCard = i % 5 === 0; // phones only: one wide card, then two pairs
    const img = el('img', {
      src: t.thumb, srcset: srcsetFor(t),
      sizes: `(min-width: 1040px) 30vw, (min-width: 600px) 46vw, ${wideCard ? 'calc(100vw - 40px)' : 'calc(50vw - 27px)'}`,
      alt: '', width: 1200, height: 900, loading: 'lazy', decoding: 'async',
    });
    img.addEventListener('error', () => img.replaceWith(el('span', { class: 'card__ph', 'aria-hidden': 'true', text: t.ne || t.name })), { once: true });
    const fold = themes.length > FIRST_WIDE;
    const li = el('li', { class: `card${wideCard ? ' card--wide' : ''}${fold && i >= FIRST_PHONE ? ' is-more' : ''}${fold && i >= FIRST_WIDE ? ' is-more-d' : ''}`, 'data-i': i },
      el('button', { type: 'button', class: 'card__btn', 'aria-haspopup': 'dialog' },
        el('span', { class: 'card__shot' }, img),
        el('span', { class: 'card__cap' },
          el('span', { class: 'card__name', text: t.name }),
          t.ne ? el('span', { class: 'card__ne', lang: 'ne', text: t.ne }) : null,
          t.featured ? el('span', { class: 'card__tag', text: 'Featured' }) : null),
        el('span', { class: 'vh', text: `: ${t.concept} View larger.` })),
      el('a', { class: 'card__pv', href: showcaseUrl(t.slug), 'data-preview': t.slug, 'aria-label': `Preview the ${t.name} design live` },
        el('span', { text: 'Preview' }), playIcon()),
    );
    ol.append(li);
  });
  more.hidden = themes.length <= FIRST_WIDE;
  more.textContent = `Show all ${themes.length} designs`;
  more.onclick = () => {
    ol.classList.add('is-open');
    more.hidden = true;
    ol.children[from600.matches ? FIRST_WIDE : FIRST_PHONE]?.querySelector('button')?.focus({ preventScroll: true });
  };
  ol.onclick = (e) => {
    const b = e.target.closest('.card__btn');
    if (b) openLightbox(Number(b.closest('.card').dataset.i), b);
  };

  const sel = $('#f-theme');
  const keep = sel.value;
  sel.replaceChildren(el('option', { value: '', text: 'Not sure yet' }), ...themes.map((t) => el('option', { value: t.slug, text: t.ne ? `${t.name} · ${t.ne}` : t.name })));
  if (keep && themes.some((t) => t.slug === keep)) sel.value = keep;
}

/* ---------------- showcase: the live design, demo couple only, watermarked (src/core/showcase.js) ---------------- */
const showcaseUrl = (slug) => `/${encodeURIComponent(slug)}/?showcase=1`;
function playIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M9 6.5v11l9-5.5z');
  svg.append(path);
  return svg;
}
const pv = $('#pv');
const pvFrame = $('#pv-frame');
const preview = { slug: '', opener: null, order: false };
// phone-sized screens and touch-first devices open the showcase full screen (it has its own close)
const framed = matchMedia('(min-width: 860px) and (min-height: 560px) and (hover: hover) and (pointer: fine)');
function openPreview(slug, from) {
  const t = view.themes.find((x) => x.slug === slug) || BY_SLUG[slug];
  if (!t || !SLUG_RE.test(slug)) return;
  if (!framed.matches) { location.assign(showcaseUrl(slug)); return; }
  preview.slug = slug;
  preview.opener = from;
  preview.order = false;
  $('#pv-name').textContent = t.name;
  $('#pv-ne').textContent = t.ne || '';
  $('#pv-ne').hidden = !t.ne;
  $('#pv-full').href = showcaseUrl(slug);
  $('#pv-order').setAttribute('aria-label', `Order the ${t.name} design`);
  pvFrame.title = `The ${t.name} design, live preview with the demo couple`;
  pvFrame.src = showcaseUrl(slug);
  pv.showModal();
  document.documentElement.style.overflow = 'hidden';
}
pv.addEventListener('close', () => {
  pvFrame.src = 'about:blank'; // stops the design's music
  if (!lb.open) document.documentElement.style.overflow = '';
  if (preview.order) {
    if (lb.open) { lightbox.order = true; lb.close(); return; }
    $('#order').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
    $('#f-name').focus({ preventScroll: true });
  } else {
    preview.opener?.focus?.({ preventScroll: true });
  }
});
pv.addEventListener('click', (e) => { if (e.target === pv) pv.close(); });
$('#pv-close').addEventListener('click', () => pv.close());
$('#pv-order').addEventListener('click', (e) => {
  e.preventDefault();
  chooseTheme(preview.slug);
  preview.order = true;
  pv.close();
});
document.addEventListener('click', (e) => {
  const a = e.target instanceof Element ? e.target.closest('a[data-preview]') : null;
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const slug = a.dataset.preview;
  if (!SLUG_RE.test(slug)) return;
  if (framed.matches) { e.preventDefault(); openPreview(slug, a); }
});

/* ---------------- lightbox: a larger still of one design ---------------- */
const lb = $('#lb');
const lbImg = $('#lb-img');
const lightbox = { i: -1, opener: null, order: false };
function showInLightbox(i) {
  const list = view.themes;
  if (!list.length) return;
  i = (i + list.length) % list.length;
  lightbox.i = i;
  const t = list[i];
  $('#lb-i').textContent = String(i + 1);
  $('#lb-total').textContent = String(list.length);
  $('#lb-name').textContent = t.name;
  $('#lb-ne').textContent = t.ne || '';
  $('#lb-ne').hidden = !t.ne;
  $('#lb-text').textContent = t.concept;
  $('#lb-order').setAttribute('aria-label', `Order the ${t.name} design`);
  const lbPv = $('#lb-preview');
  lbPv.href = showcaseUrl(t.slug);
  lbPv.dataset.preview = t.slug;
  lbPv.setAttribute('aria-label', `Preview the ${t.name} design live`);
  lbImg.alt = `The ${t.name} design: ${t.alt}`;
  const ss = srcsetFor(t);
  if (ss) { lbImg.srcset = ss; lbImg.sizes = '(min-width: 860px) 62vw, 100vw'; } else { lbImg.removeAttribute('srcset'); lbImg.removeAttribute('sizes'); }
  lbImg.src = t.thumb;
}
function openLightbox(i, from) {
  if (!view.themes[i]) return;
  lightbox.opener = from;
  lightbox.order = false;
  showInLightbox(i);
  lb.showModal();
  document.documentElement.style.overflow = 'hidden';
}
/** Preselects a design in the order form (the gallery fills the options; the hero may ask before it has). */
function chooseTheme(slug) {
  const sel = $('#f-theme');
  if (!SLUG_RE.test(slug)) return;
  if (![...sel.options].some((o) => o.value === slug)) {
    const t = BY_SLUG[slug];
    if (!t) return;
    sel.append(el('option', { value: slug, text: t.ne ? `${t.name} · ${t.ne}` : t.name }));
  }
  setKind('order');
  sel.value = slug;
}
lb.addEventListener('close', () => {
  document.documentElement.style.overflow = '';
  if (lightbox.order) {
    $('#order').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
    $('#f-name').focus({ preventScroll: true });
  } else {
    lightbox.opener?.focus?.({ preventScroll: true });
  }
});
lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
lb.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); showInLightbox(lightbox.i - 1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); showInLightbox(lightbox.i + 1); }
});
$('#lb-close').addEventListener('click', () => lb.close());
$('#lb-prev').addEventListener('click', () => showInLightbox(lightbox.i - 1));
$('#lb-next').addEventListener('click', () => showInLightbox(lightbox.i + 1));
$('#lb-order').addEventListener('click', (e) => {
  e.preventDefault();
  const t = view.themes[lightbox.i];
  if (t) chooseTheme(t.slug);
  lightbox.order = true;
  lb.close();
});

/** /?design=<slug>#order (the showcase's "Order this design"): preselect it in the form. */
function preselectFromUrl() {
  const q = new URLSearchParams(location.search);
  const slug = q.get('design');
  if (!slug) return;
  if (SLUG_RE.test(slug) && view.themes.some((t) => t.slug === slug)) {
    chooseTheme(slug);
    if (location.hash === '#order') $('#order').scrollIntoView({ block: 'start' });
  }
  q.delete('design');
  history.replaceState(history.state, '', `${location.pathname}${q.toString() ? `?${q}` : ''}${location.hash}`);
}

/* ---------------- order form ---------------- */
const form = $('#order-form');
const F = form.elements;
function setKind(k) {
  form.querySelector(`input[name="kind"][value="${k}"]`).checked = true;
  syncKind();
}
function syncKind() {
  const custom = F.kind.value === 'custom';
  $('#kind-hint').textContent = custom
    ? 'Describe the design you imagine: colours, a place, a tradition. We will call you to shape it together.'
    : 'Pick a design and a plan, or leave them for the call.';
  form.querySelectorAll('[data-for="order"]').forEach((f) => { f.hidden = custom; });
  const lab = $('#l-message');
  lab.replaceChildren(document.createTextNode(custom ? 'Your idea ' : 'Anything we should know? '),
    custom ? el('span', { class: 'req', 'aria-hidden': 'true', text: '*' }) : el('span', { class: 'opt', text: 'optional' }));
  $('#f-message').required = custom;
}
form.addEventListener('change', (e) => { if (e.target.name === 'kind') syncKind(); });
document.querySelectorAll('[data-kind]').forEach((a) => a.addEventListener('click', () => setKind(a.dataset.kind)));

function fieldError(id, show) {
  const input = $(`#f-${id}`);
  const err = $(`#e-${id}`);
  input.setAttribute('aria-invalid', String(!!show));
  if (show) input.setAttribute('aria-describedby', `e-${id}`); else input.removeAttribute('aria-describedby');
  err.hidden = !show;
  return !show;
}
function validate() {
  const name = F.name.value.trim();
  const phone = F.phone.value.trim();
  const email = F.email.value.trim();
  const custom = F.kind.value === 'custom';
  const ok = [
    fieldError('name', name.length < 2),
    fieldError('phone', !/^[0-9+()\-\s]{6,20}$/.test(phone) || phone.replace(/\D/g, '').length < 7),
    fieldError('email', email && !/^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/.test(email)),
    fieldError('message', custom && F.message.value.trim().length < 3),
  ];
  return ok.every(Boolean);
}
['name', 'phone', 'email', 'message'].forEach((id) => $(`#f-${id}`).addEventListener('input', () => {
  if ($(`#f-${id}`).getAttribute('aria-invalid') === 'true') validate();
}));

function showError(msg) {
  const box = $('#order-error');
  box.replaceChildren(document.createTextNode(msg));
  if (window.__nimttoWa) {
    box.append(document.createTextNode(' You can also '), el('a', { href: window.__nimttoWa, target: '_blank', rel: 'noopener', text: 'write to us on WhatsApp' }), document.createTextNode('.'));
  }
  box.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#order-error').hidden = true;
  if (!validate()) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
  const custom = F.kind.value === 'custom';
  const body = {
    kind: custom ? 'custom' : 'order',
    name: F.name.value.trim(),
    phone: F.phone.value.trim(),
    message: F.message.value.trim(),
    website: F.website.value,
  };
  if (F.email.value.trim()) body.email = F.email.value.trim();
  if (F.weddingDate.value) body.weddingDate = F.weddingDate.value;
  if (!custom && F.theme.value) body.theme = F.theme.value;
  if (!custom && F.plan.value) body.plan = F.plan.value;
  const btn = $('#order-submit');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    const r = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    let data = null;
    try { data = await r.json(); } catch { /* not JSON */ }
    if (r.ok && data?.ok !== false) {
      form.hidden = true;
      const done = $('#order-done');
      done.hidden = false;
      done.focus();
      return;
    }
    const bad = r.status === 400 && Array.isArray(data?.fields) ? data.fields.filter((f) => ['name', 'phone', 'email', 'message'].includes(f)) : [];
    if (r.status === 429) showError('Too many requests from this connection. Please wait a few minutes and try again.');
    else if (bad.length) {
      bad.forEach((f) => fieldError(f, true));
      form.querySelector('[aria-invalid="true"]')?.focus();
      showError('Please check the highlighted fields.');
    } else if (r.status === 400) showError('Please check the form and try again.');
    else showError('We could not send your request just now. Please try again in a moment.');
  } catch {
    showError('We could not reach the server. Check your connection and try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send request';
  }
});
$('#order-again').addEventListener('click', () => {
  form.reset();
  syncKind();
  $('#order-done').hidden = true;
  form.hidden = false;
  F.name.focus();
});

/* ---------------- boot ---------------- */
async function boot() {
  $('#year').textContent = String(new Date().getFullYear());
  initBar();
  view.themes = normaliseThemes(null, FALLBACK_SITE); // until the API answers, the hero can still open the lightbox
  initDoor();
  syncKind();

  // these sections sit below the fold: render once, from the API or (on 404 / timeout) from the static fallback,
  // so nodes are never swapped under a visitor's finger
  const [site, themes] = await Promise.all([getJson('/api/site', 4000), getJson('/api/themes', 4000)]);
  const s = site && typeof site === 'object' && !Array.isArray(site) ? { ...FALLBACK_SITE, ...site } : FALLBACK_SITE;
  applyHero(s);
  renderPlans(s);
  renderContact(s);
  renderGallery(normaliseThemes(Array.isArray(themes) ? themes : null, s));
  preselectFromUrl();
  const hidden = new Set(Array.isArray(s.hiddenThemes) ? s.hiddenThemes : []);
  if (HERO.some(([slug]) => hidden.has(slug))) buildHero(hidden);
}
boot();
