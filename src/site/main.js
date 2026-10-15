// Nimtto public website. Everything that comes from the API is rendered with textContent / attributes only.
import './site.css';
import { lamp, initNepali } from '../themes/_suite/nepali.js';
import { THEMES, BY_SLUG, NE_NAMES, FALLBACK_SITE, countWord } from './themes.js';
import SMALL_THUMBS from './thumbs.json'; // slugs with /site/thumbs/<slug>-480|800.webp (node src/site/make-thumbs.mjs)

const $ = (s, r = document) => r.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/;
const PAGE_SIZE = 9;

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

async function getJson(url, ms = 6000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctl.signal, credentials: 'same-origin' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; } finally { clearTimeout(t); }
}

/* ---------------- hero: the phone fan (signature motion) ---------------- */
function initFan() {
  const fan = $('#fan');
  const bar = $('.bar');
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));
  let ticking = false;
  let active = !reduced.matches;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    bar.classList.toggle('is-scrolled', y > 8);
    if (!active) return;
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, y / (vh * 0.62)));
    // ease the scroll progress so the fan settles softly instead of tracking linearly
    const e = 1 - (1 - p) ** 3;
    fan.style.setProperty('--p', e.toFixed(4));
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  reduced.addEventListener?.('change', () => { active = !reduced.matches; fan.style.removeProperty('--p'); onScroll(); });
  update();
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
  list.style.setProperty('--n', String(Math.min(plans.length, 4)));
  const planSel = $('#f-plan');
  planSel.replaceChildren(el('option', { value: '', text: 'Not sure yet' }));
  for (const p of plans.slice(0, 8)) {
    const id = str(p.id, 32);
    const name = str(p.name, 60) || 'Plan';
    const priced = Number.isFinite(p.price) && p.price >= 0;
    const feats = Array.isArray(p.features) ? p.features.map((f) => str(f, 120)).filter(Boolean).slice(0, 20) : [];
    const li = el('li', { class: `plan${p.highlight ? ' plan--hi' : ''}` },
      p.highlight ? el('span', { class: 'plan__flag', text: 'Most chosen' }) : null,
      el('h3', { class: 'plan__name', text: name }),
      priced
        ? el('p', { class: 'plan__price' }, el('small', { text: 'NPR' }), document.createTextNode(fmt.format(p.price)))
        : el('p', { class: 'plan__price plan__price--ask' }, el('small', { text: 'Price' }), document.createTextNode('Ask for price')),
      str(p.note, 200) ? el('p', { class: 'plan__note', text: str(p.note, 200) }) : null,
      feats.length ? el('ul', { class: 'plan__feats' }, ...feats.map((f) => el('li', { text: f }))) : null,
      el('div', { class: 'plan__cta' },
        el('a', { class: `btn ${p.highlight ? 'btn--accent' : 'btn--line'}`, href: '#order', 'data-plan': id, text: `Choose ${name}` })),
    );
    list.append(li);
    if (id) planSel.append(el('option', { value: id, text: priced ? `${name} · NPR ${fmt.format(p.price)}` : name }));
  }
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
    ? api.filter((t) => t && SLUG_RE.test(t.slug)).map((t) => {
      const local = BY_SLUG[t.slug] || {};
      return {
        slug: t.slug,
        name: str(t.name, 60) || local.name || t.slug,
        ne: local.ne || NE_NAMES[t.slug] || '',
        concept: str(t.concept, 240) || local.concept || '',
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
    // no featured list set: open with the most striking designs
    const lead = ['mahal', 'mangal', 'nimantrana', 'jhyal'];
    list = [...lead.map((s) => list.find((t) => t.slug === s)).filter(Boolean), ...list.filter((t) => !lead.includes(t.slug))];
  }
  return list;
}

const small = new Set(SMALL_THUMBS);
function renderGallery(themes) {
  const ol = $('#gallery');
  const more = $('#gallery-more');
  ol.replaceChildren();
  const word = countWord(themes.length);
  document.querySelectorAll('.js-count').forEach((n) => { n.textContent = n.dataset.cap ? word[0].toUpperCase() + word.slice(1) : word; });
  themes.forEach((t, i) => {
    const title = el('h3', { class: 'd-name' }, document.createTextNode(t.name), t.ne ? el('span', { lang: 'ne', text: t.ne }) : null);
    const shot = el('button', { type: 'button', class: 'd-shot', 'aria-label': `Preview ${t.name}`, 'data-slug': t.slug },
      el('img', {
        src: t.thumb,
        // the 1200px JPEG only where it is really needed (the wide first card on dense screens)
        srcset: small.has(t.slug) && t.thumb === `/themes/${t.slug}/thumb.jpg` ? `/site/thumbs/${t.slug}-480.webp 480w, /site/thumbs/${t.slug}-800.webp 800w, ${t.thumb} 1200w` : null,
        sizes: i === 0 ? '(min-width: 900px) 740px, calc(100vw - 32px)' : '(min-width: 900px) 300px, 46vw',
        alt: `${t.name}: ${t.alt}`, width: 1200, height: 900, loading: i < 3 ? 'eager' : 'lazy', decoding: 'async',
      }),
      t.featured ? el('span', { class: 'd-tag', text: 'Featured' }) : null);
    shot.querySelector('img').addEventListener('error', (ev) => {
      ev.target.replaceWith(el('span', { class: 'd-ph', 'aria-hidden': 'true' }, document.createTextNode(t.name), t.ne ? el('span', { lang: 'ne', text: t.ne }) : null));
    }, { once: true });
    const li = el('li', { class: `d-card${i === 0 ? ' d-card--hero' : ''}`, hidden: i >= PAGE_SIZE },
      shot, title,
      t.concept ? el('p', { class: 'd-concept', text: t.concept }) : null,
      el('div', { class: 'd-actions' },
        el('button', { type: 'button', 'data-slug': t.slug, text: 'Preview' }),
        el('a', { href: t.demo, target: '_blank', rel: 'noopener', text: 'View live ↗', 'aria-label': `View ${t.name} live in a new tab` })));
    ol.append(li);
  });
  const rest = themes.length - PAGE_SIZE;
  more.hidden = rest <= 0;
  more.textContent = `Show all ${themes.length} designs`;
  more.onclick = () => {
    const first = ol.children[PAGE_SIZE];
    [...ol.children].forEach((c) => { c.hidden = false; });
    more.hidden = true;
    first?.querySelector('.d-shot')?.focus({ preventScroll: true });
  };
  const byslug = Object.fromEntries(themes.map((t) => [t.slug, t]));
  ol.onclick = (e) => {
    const b = e.target.closest('button[data-slug]');
    if (b && byslug[b.dataset.slug]) openViewer(byslug[b.dataset.slug], b);
  };

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
  opener?.focus({ preventScroll: true });
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
  initFan();
  syncKind();
  // one quiet touch: a brass diyo with a live flame beside the greeting
  $('#contact-lamp').innerHTML = lamp('diyo', { sizes: '140px' }); // static markup from our own helper, no user data
  initNepali($('#contact'));

  // these sections sit below the fold: render once, from the API or (on 404 / timeout) from the static fallback,
  // so nodes are never swapped under a visitor's finger
  const [site, themes] = await Promise.all([getJson('/api/site', 4000), getJson('/api/themes', 4000)]);
  const s = site && typeof site === 'object' && !Array.isArray(site) ? { ...FALLBACK_SITE, ...site } : FALLBACK_SITE;
  applyHero(s);
  renderPlans(s);
  renderContact(s);
  renderGallery(normaliseThemes(Array.isArray(themes) ? themes : null, s));
}
boot();
