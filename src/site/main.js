// Nimtto public website. Everything that comes from the API is rendered with textContent / attributes only.
import './site.css';
import { THEMES, BY_SLUG, NE_NAMES, FALLBACK_SITE, countWord } from './themes.js';
import { enhance } from '../ui/enhance.js'; // Nimtto dropdowns and date picker on the order form
import SMALL_THUMBS from './thumbs.json'; // slugs with /site/thumbs/<slug>-480|800.webp (node src/site/make-thumbs.mjs)

const $ = (s, r = document) => r.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const wide = matchMedia('(min-width: 960px)');
const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/;
enhance(document.getElementById('order') || document);
const MOBILE_FIRST = 11; // cards shown on phones before "Show all"

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
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

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

/* ---------------- hero stage: the one signature motion ----------------
   A single phone stays pinned while real designs slide up into its screen, one per scroll step.
   Reduced motion (or no JS): no pinning; the buttons under the phone switch designs instantly. */
const STAGE = [
  ['mahal', 'a golden palace gate tied with an ivory satin bow'],
  ['swayambar', 'two marigold garlands around Ganesh, with Shubha Bibaha below'],
  ['sindoor', 'a red and gold sindoor box on white under a line-drawn Ganesh'],
  ['rangoli', 'a marigold rangoli on a brick courtyard floor under शुभ विवाह'],
  ['shree', 'a gold lotus mandala on deep plum'],
  ['nimantrana', 'a red and gold card reading शुभ विवाह'],
];
const stage = { list: [], imgs: [], idx: -1, motion: false };

function buildStage(hidden = new Set()) {
  stage.list = STAGE.filter(([s]) => !hidden.has(s)).map(([slug, alt]) => ({ ...BY_SLUG[slug], slug, alt }));
  const box = $('#screens');
  const ticks = $('#ticks');
  const first = box.querySelector('img');
  box.replaceChildren();
  ticks.replaceChildren();
  stage.imgs = stage.list.map((t, i) => {
    const img = i === 0 && first?.dataset.slug === t.slug ? first : el('img', {
      class: 'scr', src: `/site/phones/${t.slug}.webp`, width: 540, height: 1169,
      alt: `The ${t.name} design on a phone: ${t.alt}`, loading: i ? 'lazy' : null, decoding: 'async', 'data-slug': t.slug,
    });
    box.append(img);
    ticks.append(el('button', { type: 'button', class: 'tick', 'aria-label': `Show ${t.name}`, 'aria-pressed': 'false', 'data-i': i }));
    return img;
  });
  $('#cap-total').textContent = pad(stage.list.length);
  $('#stage').style.setProperty('--n', String(stage.list.length));
  stage.idx = -1;
  renderStage();
}

function setCaption(i) {
  if (i === stage.idx) return;
  stage.idx = i;
  const t = stage.list[i];
  $('#cap-i').textContent = pad(i + 1);
  $('#cap-name').textContent = t.name;
  $('#cap-ne').textContent = t.ne;
  $('#cap-text').textContent = t.concept;
  $('#cap-link').href = t.demo;
  $('#ticks').querySelectorAll('.tick').forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
  // a short fade on the words that changed (transform + opacity only)
  for (const n of [$('#cap')]) {
    n.classList.remove('is-swap');
    void n.offsetWidth;
    n.classList.add('is-swap');
  }
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
let stageTicking = false;
function renderStage() {
  stageTicking = false;
  const n = stage.list.length;
  if (!n) return;
  if (!stage.motion) {
    const i = clamp(stage.idx < 0 ? 0 : stage.idx, 0, n - 1);
    stage.imgs.forEach((img, k) => { img.style.transform = ''; img.style.opacity = k === i ? '1' : '0'; });
    stage.idx = -1;
    setCaption(i);
    return;
  }
  const { top, travel, stick } = stageGeom();
  const p = clamp((stick - top) / travel, 0, 1) * (n - 1);
  let active = 0;
  stage.imgs.forEach((img, k) => {
    // each step: a short hold, then the next screen slides up over the last one
    const t = k === 0 ? 1 : easeInOut(clamp((p - (k - 1) - 0.2) / 0.62, 0, 1));
    const next = k + 1 < n ? easeInOut(clamp((p - k - 0.2) / 0.62, 0, 1)) : 0;
    if (t > 0.5) active = k;
    img.style.opacity = next >= 1 ? '0' : String(1 - next * 0.55);
    img.style.transform = `translate3d(0, ${((1 - t) * 100).toFixed(3)}%, 0) scale(${(1 - next * 0.08).toFixed(4)})`;
  });
  setCaption(active);
}
function stageGeom() {
  const box = $('#stage');
  const pin = box.firstElementChild;
  return { top: box.getBoundingClientRect().top, stick: parseFloat(getComputedStyle(pin).top) || 0, travel: Math.max(1, box.offsetHeight - pin.offsetHeight) };
}
function onStageScroll() { if (!stageTicking) { stageTicking = true; requestAnimationFrame(renderStage); } }

function initStage() {
  const root = document.documentElement;
  const apply = () => {
    stage.motion = !reduced.matches;
    root.classList.toggle('js-motion', stage.motion);
    stage.idx = -1;
    renderStage();
  };
  $('#ticks').addEventListener('click', (e) => {
    const b = e.target.closest('.tick');
    if (!b) return;
    const i = Number(b.dataset.i);
    if (!stage.motion) { stage.idx = -1; stage.imgs.forEach((img, k) => { img.style.opacity = k === i ? '1' : '0'; }); setCaption(i); return; }
    const { top, travel, stick } = stageGeom();
    const y = window.scrollY + top - stick + travel * (i / Math.max(1, stage.list.length - 1));
    window.scrollTo({ top: Math.round(y), behavior: 'smooth' });
  });
  window.addEventListener('scroll', onStageScroll, { passive: true });
  window.addEventListener('resize', onStageScroll, { passive: true });
  reduced.addEventListener?.('change', apply);
  buildStage();
  apply();
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
        demo: localPath(t.demo, `/${t.slug}/`),
      };
    })
    : THEMES.filter((t) => !hidden.has(t.slug));
  const featured = (Array.isArray(site.featuredThemes) ? site.featuredThemes : []).filter((s) => list.some((t) => t.slug === s));
  if (featured.length) {
    const rank = (s) => { const i = featured.indexOf(s); return i < 0 ? Infinity : i; };
    list = list.map((t, i) => ({ t, i })).sort((a, b) => (rank(a.t.slug) - rank(b.t.slug)) || (a.i - b.i)).map(({ t }) => ({ ...t, featured: featured.includes(t.slug) }));
  } else {
    // no featured list set: open with the most striking designs, newest first after them
    const lead = ['mahal', 'swayambar', 'sindoor', 'rangoli', 'agni', 'janti', 'mangal', 'nimantrana', 'jhyal'];
    list = [...lead.map((s) => list.find((t) => t.slug === s)).filter(Boolean), ...list.filter((t) => !lead.includes(t.slug))];
  }
  return list;
}

const small = new Set(SMALL_THUMBS);
const srcsetFor = (t) => (small.has(t.slug) && t.thumb === `/themes/${t.slug}/thumb.jpg`
  ? `/site/thumbs/${t.slug}-480.webp 480w, /site/thumbs/${t.slug}-800.webp 800w, ${t.thumb} 1200w` : null);

/* desktop: a sticky picture beside the index; two layered images crossfade when a row is hovered or focused */
const view = { i: -1, themes: [], front: null, back: null };
function initView() {
  const shot = $('#view-shot');
  view.front = $('#view-img');
  view.front.classList.add('is-on');
  view.back = el('img', { alt: '', width: 1200, height: 900, decoding: 'async' });
  shot.append(view.back);
  shot.addEventListener('click', () => { const t = view.themes[view.i]; if (t) openViewer(t, document.activeElement); });
}
function setView(i) {
  if (i === view.i || !view.themes[i]) return;
  view.i = i;
  const t = view.themes[i];
  $('#view-text').textContent = t.concept;
  const img = view.back;
  img.onload = () => {
    img.onload = null;
    if (view.themes[view.i] !== t) return;
    img.classList.add('is-on');
    view.front.classList.remove('is-on');
    [view.front, view.back] = [img, view.front];
  };
  const ss = srcsetFor(t);
  if (ss) { img.srcset = ss; img.sizes = '(min-width: 960px) 58vw, 100vw'; } else { img.removeAttribute('srcset'); }
  img.src = t.thumb;
  if (img.complete && img.naturalWidth) img.onload?.();
}

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
    const img = el('img', {
      src: t.thumb, srcset: srcsetFor(t),
      sizes: i % 5 === 0 ? '(min-width: 600px) 92vw, calc(100vw - 32px)' : '(min-width: 600px) 46vw, calc(50vw - 22px)',
      alt: '', width: 1200, height: 900, loading: 'lazy', decoding: 'async',
    });
    img.addEventListener('error', () => img.replaceWith(el('span', { class: 'item__ph', 'aria-hidden': 'true', text: t.ne || t.name })), { once: true });
    const li = el('li', { class: `item${i % 5 === 0 ? ' item--wide' : ''}${i >= MOBILE_FIRST ? ' is-more' : ''}`, 'data-i': i },
      el('a', { class: 'item__link', href: t.demo, target: '_blank', rel: 'noopener' },
        el('span', { class: 'item__shot' }, img),
        el('span', { class: 'item__n', 'aria-hidden': 'true', text: pad(i + 1) }),
        el('span', { class: 'item__name' }, document.createTextNode(t.name), t.ne ? el('span', { class: 'item__ne', lang: 'ne', text: t.ne }) : null),
        t.featured ? el('span', { class: 'item__tag', text: 'Featured' }) : null,
        el('span', { class: 'item__go', 'aria-hidden': 'true', text: '↗' }),
        el('span', { class: 'vh', text: `: ${t.concept} Opens the live design in a new tab.` })),
      el('button', { type: 'button', class: 'item__pv', 'data-slug': t.slug, 'aria-label': `Preview ${t.name} on a phone`, text: 'Preview' }),
    );
    ol.append(li);
  });
  const rest = themes.length - MOBILE_FIRST;
  more.hidden = rest <= 0;
  more.textContent = `Show all ${themes.length} designs`;
  more.onclick = () => {
    ol.classList.add('is-open');
    more.hidden = true;
    ol.children[MOBILE_FIRST]?.querySelector('a')?.focus({ preventScroll: true });
  };
  const byslug = Object.fromEntries(themes.map((t) => [t.slug, t]));
  ol.onclick = (e) => {
    const b = e.target.closest('button[data-slug]');
    if (b && byslug[b.dataset.slug]) openViewer(byslug[b.dataset.slug], b);
  };
  const pick = (e) => { const li = e.target.closest?.('.item'); if (li && wide.matches) setView(Number(li.dataset.i)); };
  ol.onmouseover = pick;
  ol.onfocusin = pick;
  view.i = -1;
  setView(0);

  const sel = $('#f-theme');
  sel.replaceChildren(el('option', { value: '', text: 'Not sure yet' }), ...themes.map((t) => el('option', { value: t.slug, text: t.ne ? `${t.name} · ${t.ne}` : t.name })));
}

/* ---------------- preview dialog ---------------- */
const viewer = $('#viewer');
const frame = $('#viewer-frame');
const iframe = $('#viewer-iframe');
let mode = 'phone';
let opener = null;
function fitViewer() {
  if (!viewer.open) return;
  const st = $('#viewer-stage').getBoundingClientRect();
  const [w, h] = mode === 'phone' ? [410, 864] : [1440, 900];
  const s = Math.min(1, (st.width - 24) / w, (st.height - 24) / h);
  frame.style.transform = `translate(-50%, -50%) scale(${s.toFixed(4)})`;
}
function setMode(m) {
  mode = m;
  frame.classList.toggle('is-phone', m === 'phone');
  frame.classList.toggle('is-desktop', m === 'desktop');
  viewer.querySelectorAll('.seg__btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  fitViewer();
}
function openViewer(t, from) {
  opener = from;
  const title = $('#viewer-title');
  title.replaceChildren(document.createTextNode(t.name), t.ne ? el('span', { lang: 'ne', text: t.ne }) : null);
  $('#viewer-open').href = t.demo;
  iframe.title = `${t.name} design, live preview`;
  iframe.src = t.demo;
  setMode(mode);
  viewer.showModal();
  document.documentElement.style.overflow = 'hidden';
  fitViewer();
}
function closeViewer() { viewer.close(); }
viewer.addEventListener('close', () => {
  iframe.src = 'about:blank';
  document.documentElement.style.overflow = '';
  opener?.focus?.({ preventScroll: true });
});
viewer.addEventListener('click', (e) => { if (e.target === viewer) closeViewer(); });
$('#viewer-close').addEventListener('click', closeViewer);
viewer.querySelectorAll('.seg__btn').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
window.addEventListener('resize', fitViewer, { passive: true });

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
  initStage();
  initView();
  syncKind();

  // these sections sit below the fold: render once, from the API or (on 404 / timeout) from the static fallback,
  // so nodes are never swapped under a visitor's finger
  const [site, themes] = await Promise.all([getJson('/api/site', 4000), getJson('/api/themes', 4000)]);
  const s = site && typeof site === 'object' && !Array.isArray(site) ? { ...FALLBACK_SITE, ...site } : FALLBACK_SITE;
  applyHero(s);
  renderPlans(s);
  renderContact(s);
  renderGallery(normaliseThemes(Array.isArray(themes) ? themes : null, s));
  const hidden = new Set(Array.isArray(s.hiddenThemes) ? s.hiddenThemes : []);
  if (STAGE.some(([slug]) => hidden.has(slug))) buildStage(hidden);
}
boot();
