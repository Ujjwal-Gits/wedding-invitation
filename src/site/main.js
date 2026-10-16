// Nimtto home page (the owner's canvas, Main.dc.html): the design stage and thumbnails, pricing from /api/site,
// the order form and the payment step that follows it. Everything from the API is written as text, never HTML.
import './site.css';
import './home.css';
import { enhance } from '../ui/enhance.js'; // Nimtto dropdowns and date picker on the order form
import { $, $$, el, reduced, SLUG_RE, str, npr, money, initHeader, initPreview, applyContact, showcaseUrl, setYear, waLink } from './common.js';
import { loadSite, loadThemes, normaliseThemes, createOrder, REF_RE } from './api.js';
import { THEMES, BY_SLUG, CATEGORIES, PLAN_NE, PLAN_DESC, FALLBACK_SITE } from './themes.js';
import SMALL_THUMBS from './thumbs.json';
import STILLS from './stills.json'; // { slug: ['gate', 'hero'] } phone-shaped stills (node src/site/make-thumbs.mjs)
import PAGES from './design-pages.json'; // slugs with a generated /designs/<slug>/ page (node src/site/make-design-pages.mjs)

// the payment step loads on demand (warmed when the visitor starts the form)
const loadPayment = () => import('./payment.js');

const small = new Set(SMALL_THUMBS);
const pages = new Set(PAGES);
const designUrl = (slug) => (pages.has(slug) ? `/designs/${slug}/` : showcaseUrl(slug));
/** the picture inside a phone frame: the opening still, else the invitation still, else the big-screen thumb */
const phoneSrc = (t) => {
  const s = STILLS[t.slug] || [];
  if (s.includes('gate')) return `/site/stills/${t.slug}-gate.webp`;
  if (s.includes('hero')) return `/site/stills/${t.slug}-hero.webp`;
  return small.has(t.slug) ? `/site/thumbs/${t.slug}-480.webp` : t.thumb;
};
const cat = (t) => CATEGORIES[t.cat] || CATEGORIES.cards;

const view = { site: null, wa: '', themes: normaliseThemes(null, FALLBACK_SITE), cat: 'all', list: [], i: 0, mode: 'ready' };
enhance($('#order') || document);

/* ---------------- promo bar ---------------- */
const PROMOS = [
  ['Order online, then pay by Khalti, eSewa, bank QR or PayPal.', 'See prices', '#pricing'],
  ['Every invitation works in English and Nepali, with both calendars.', 'See the designs', '#designs'],
  ['Want a design that is only yours? We make custom designs too.', 'Tell us your idea', '#order', 'custom'],
];
function initPromo() {
  let i = 0;
  const show = (n) => {
    i = (n + PROMOS.length) % PROMOS.length;
    const [text, link, href, kind] = PROMOS[i];
    $('#promo-msg').replaceChildren(document.createTextNode(`${text} `), el('a', { href, 'data-kind': kind || null, text: link }));
  };
  $('#promo-prev').addEventListener('click', () => show(i - 1));
  $('#promo-next').addEventListener('click', () => show(i + 1));
}

/* ---------------- designs: chips, the stage, the thumbnails ---------------- */
const inCat = (t, c) => c === 'all' || (c === 'faiths' ? ['muslim', 'christian'].every((r) => t.religions?.includes(r)) : t.cat === c);
const setCount = (n) => { for (const c of $$('.js-count')) c.textContent = String(n); };

function renderDesigns() {
  view.list = view.themes.filter((t) => inCat(t, view.cat));
  for (const b of $$('#chips .chip')) {
    b.setAttribute('aria-pressed', String(b.dataset.cat === view.cat));
    b.hidden = !view.themes.some((t) => inCat(t, b.dataset.cat));
  }
  const ul = $('#thumbs');
  ul.replaceChildren(...view.list.map((t, i) => el('li', {},
    el('button', { type: 'button', class: 'thumb', 'aria-pressed': 'false', 'aria-label': `Show ${t.name}`, 'data-i': i, style: `--tint:${cat(t).tint}` },
      el('span', { class: 'thumb__pic' }, el('span', { class: 'thumb__phone' },
        el('img', { src: phoneSrc(t), alt: '', width: 480, height: 720, loading: 'lazy', decoding: 'async' }))),
      el('span', { class: 'thumb__cap' }, el('span', { class: 'thumb__name', text: t.name }), el('span', { class: 'thumb__mood', text: cat(t).short }))))),
  el('li', {}, el('a', { class: 'thumb thumb--more', href: '#order', 'data-kind': 'custom' },
    el('span', { class: 'thumb__pic' }, el('span', { class: 'thumb__plus', 'aria-hidden': 'true', text: '+' }), el('span', { class: 'thumb__mood', text: 'your own idea' })),
    el('span', { class: 'thumb__cap' }, el('span', { class: 'thumb__name', text: 'Ask for a custom design' })))));
  showStage(0, true);
}

function initDesigns() {
  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b || b.dataset.cat === view.cat) return;
    view.cat = b.dataset.cat;
    renderDesigns();
  });
  $('#thumbs').addEventListener('click', (e) => {
    const b = e.target.closest('button.thumb');
    if (!b) return;
    showStage(Number(b.dataset.i));
    // on a phone the stage sits above the strip: bring it into view
    const r = $('#stage').getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.5) $('#stage').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
  });
  $('#stage-prev').addEventListener('click', () => showStage(view.i - 1));
  $('#stage-next').addEventListener('click', () => showStage(view.i + 1));
  $('#stage').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') showStage(view.i - 1);
    if (e.key === 'ArrowRight') showStage(view.i + 1);
  });
  $('#stage-order').addEventListener('click', () => chooseTheme($('#stage-order').dataset.design));
}

function showStage(i, instant = false) {
  const list = view.list;
  if (!list.length) { $('#stage').hidden = true; return; }
  $('#stage').hidden = false;
  i = (i + list.length) % list.length;
  view.i = i;
  const t = list[i];
  const img = $('#stage-img');
  const stage = $('#stage');
  const src = phoneSrc(t);
  const apply = () => {
    img.src = src;
    img.alt = `The ${t.name} design on a phone: ${t.alt}`;
    stage.classList.remove('is-swapping');
  };
  if (instant || reduced.matches) apply();
  else {
    stage.classList.add('is-swapping');
    const pre = new Image();
    pre.onload = pre.onerror = apply;
    pre.src = src;
  }
  $('#stage-pic').style.setProperty('--tint', cat(t).tint);
  $('#stage-cat').textContent = cat(t).one;
  $('#stage-name').textContent = t.name;
  $('#stage-ne').textContent = t.ne || '';
  $('#stage-ne').hidden = !t.ne;
  $('#stage-text').textContent = t.concept;
  $('#stage-order').dataset.design = t.slug;
  $('#stage-order').setAttribute('aria-label', `Order the ${t.name} design`);
  $('#stage-more').href = designUrl(t.slug);
  $('#stage-more').setAttribute('aria-label', `View details of the ${t.name} design`);
  const pv = $('#stage-preview');
  pv.href = showcaseUrl(t.slug);
  pv.dataset.preview = t.slug;
  $('#stage-i').textContent = String(i + 1);
  $('#stage-total').textContent = String(list.length);
  $('.stage__nav').hidden = list.length < 2;
  for (const b of $$('#thumbs button.thumb')) b.setAttribute('aria-pressed', String(Number(b.dataset.i) === i));
}

/* ---------------- pricing (the canvas cards; plans from /api/site) ---------------- */
const planById = new Map();
const SVGNS = 'http://www.w3.org/2000/svg';
function circleCheck(filled) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const c = document.createElementNS(SVGNS, 'circle');
  c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', filled ? '10' : '9.5');
  c.setAttribute('fill', filled ? '#9A1829' : 'none');
  if (!filled) { c.setAttribute('stroke', '#9A1829'); c.setAttribute('stroke-width', '1.6'); }
  const p = document.createElementNS(SVGNS, 'path');
  p.setAttribute('d', 'M8 12.5l2.7 2.7L16.5 9');
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', filled ? '#FFFFFF' : '#9A1829');
  p.setAttribute('stroke-width', filled ? '1.8' : '1.6');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  svg.append(c, p);
  return svg;
}
function planCard(p) {
  const hi = p.highlight;
  const ne = PLAN_NE[p.id] || PLAN_NE[p.name.toLowerCase()] || '';
  const card = el('div', { class: 'plan' },
    el('div', { class: 'plan__top' }, el('h3', { class: 'plan__name', text: p.name }), ne ? el('span', { class: 'plan__ne', lang: 'ne', text: ne }) : null),
    el('div', { class: 'plan__cost' },
      p.price != null
        ? el('p', { class: 'plan__price' }, p.from ? el('span', { class: 'plan__from', text: 'From' }) : null,
          el('span', { class: 'plan__cur', text: 'Rs.' }), el('span', { class: 'plan__num', text: npr.format(p.price) }), el('span', { class: 'vh', text: ' Nepali rupees' }))
        : el('p', { class: 'plan__ask', text: 'Ask for price' }),
      el('span', { class: 'plan__per', text: ['per wedding', p.priceUsd != null ? `or USD ${p.priceUsd} from abroad` : ''].filter(Boolean).join(' · ') })),
    el('p', { class: 'plan__desc', text: p.note || PLAN_DESC[p.id] || '' }),
    el('a', { class: `btn ${hi ? 'btn--accent' : 'btn--soft'} btn--md`, href: '#order', 'data-plan': p.id, text: `Choose ${p.name}` }),
    p.features.length ? el('ul', { class: 'plan__feats' }, p.features.map((f) => el('li', {}, circleCheck(hi), el('span', { text: f })))) : null);
  if (!hi) return el('li', {}, card);
  return el('li', { class: 'plan-hi' },
    el('div', { class: 'plan-hi__band' },
      el('span', { class: 'mdots', 'aria-hidden': 'true' }, Array.from({ length: 11 }, () => el('i'))),
      el('span', { class: 'plan-hi__label', text: 'Most chosen' })),
    card);
}
function renderPlans() {
  const site = view.site;
  const ready = site.plans.filter((p) => !p.from && p.id !== 'custom');
  const custom = site.plans.filter((p) => p.from || p.id === 'custom');
  const modes = $('#price-mode');
  modes.hidden = !custom.length || !ready.length;
  const list = view.mode === 'custom' && custom.length ? custom : ready.length ? ready : custom;
  const ol = $('#plans');
  ol.removeAttribute('aria-busy');
  ol.classList.toggle('plans--one', list.length === 1);
  ol.replaceChildren(...list.map(planCard));
  for (const b of $$('button', modes)) {
    const on = b.dataset.mode === view.mode;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  }
}
function initPricing() {
  const modes = $('#price-mode');
  const pick = (mode, focus) => {
    view.mode = mode;
    renderPlans();
    if (focus) modes.querySelector(`[data-mode="${mode}"]`).focus();
  };
  modes.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) pick(b.dataset.mode); });
  modes.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    pick(view.mode === 'ready' ? 'custom' : 'ready', true);
  });
  $('#plans').addEventListener('click', (e) => { const a = e.target.closest('[data-plan]'); if (a) choosePlan(a.dataset.plan); });
}
function fillPlanOptions() {
  const site = view.site;
  for (const p of site.plans) planById.set(p.id, p);
  const sel = $('#f-plan');
  const keep = sel.value;
  sel.replaceChildren(el('option', { value: '', text: 'Choose a plan' }),
    ...site.plans.map((p) => el('option', { value: p.id, text: p.price != null ? `${p.name} · ${p.from ? 'from ' : ''}${money(p.price)}` : p.name })));
  if (keep && planById.has(keep)) sel.value = keep;
  syncTotal();
}

/* ---------------- order form ---------------- */
const form = $('#order-form');
const F = form.elements;
const isCustomPlan = (id) => id === 'custom' || Boolean(planById.get(id)?.from);

function setKind(k) {
  form.querySelector(`input[name="kind"][value="${k}"]`).checked = true;
  syncKind();
}
function syncKind() {
  const custom = F.kind.value === 'custom';
  for (const f of $$('[data-for="order"]', form)) f.hidden = custom;
  $('#l-message').replaceChildren(document.createTextNode(custom ? 'Describe the design you have in mind ' : 'Anything we should know?'),
    custom ? el('span', { class: 'req', 'aria-hidden': 'true', text: '*' }) : '');
  F.message.required = custom;
  if (custom && planById.has('custom')) F.plan.value = 'custom';
  else if (!custom && isCustomPlan(F.plan.value)) F.plan.value = '';
  syncTotal();
}
function chosenPlan() {
  if (F.kind.value === 'custom') return planById.get('custom') || [...planById.values()].find((p) => p.from) || null;
  return planById.get(F.plan.value) || null;
}
function syncTotal() {
  const p = chosenPlan();
  const box = $('#order-total');
  const payable = p && p.price != null;
  box.hidden = !payable;
  if (payable) box.replaceChildren(el('span', { text: `${p.name} plan${p.from ? ', starting price' : ''}` }), el('b', { text: money(p.price) }));
  const btn = $('#order-submit');
  if (!btn.disabled) btn.textContent = payable ? 'Continue to payment' : 'Send request';
}
function choosePlan(id) {
  if (!planById.has(id)) return;
  setKind(isCustomPlan(id) ? 'custom' : 'order');
  F.plan.value = id;
  F.plan.dispatchEvent(new Event('change', { bubbles: true }));
  syncTotal();
}
/** Preselects a design in the order form. */
function chooseTheme(slug) {
  if (!SLUG_RE.test(slug || '')) return;
  const sel = $('#f-theme');
  if (![...sel.options].some((o) => o.value === slug)) {
    const t = BY_SLUG[slug];
    if (!t) return;
    sel.append(el('option', { value: slug, text: t.ne ? `${t.name} · ${t.ne}` : t.name }));
  }
  setKind('order');
  sel.value = slug;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
}
function fillThemeOptions() {
  const sel = $('#f-theme');
  const keep = sel.value;
  sel.replaceChildren(el('option', { value: '', text: 'Not chosen yet' }),
    ...view.themes.map((t) => el('option', { value: t.slug, text: t.ne ? `${t.name} · ${t.ne}` : t.name })));
  if (keep && view.themes.some((t) => t.slug === keep)) sel.value = keep;
}

form.addEventListener('focusin', () => { loadPayment().catch(() => {}); }, { once: true });
form.addEventListener('change', (e) => {
  if (e.target.name === 'kind') syncKind();
  if (e.target.name === 'plan') {
    if (isCustomPlan(F.plan.value) && F.kind.value !== 'custom') setKind('custom');
    syncTotal();
    if (F.plan.value) fieldError('plan', false);
  }
});
document.addEventListener('click', (e) => {
  const a = e.target instanceof Element ? e.target.closest('[data-kind]') : null;
  if (a) setKind(a.dataset.kind);
});

function fieldError(id, show) {
  const input = $(`#f-${id}`);
  const err = $(`#e-${id}`);
  input.setAttribute('aria-invalid', String(Boolean(show)));
  if (show) input.setAttribute('aria-describedby', `e-${id}`); else input.removeAttribute('aria-describedby');
  err.hidden = !show;
  return !show;
}
function validate() {
  const custom = F.kind.value === 'custom';
  const phone = F.phone.value.trim();
  const email = F.email.value.trim();
  const ok = [
    fieldError('name', F.name.value.trim().length < 2),
    fieldError('phone', !/^[0-9+()\-\s]{6,20}$/.test(phone) || phone.replace(/\D/g, '').length < 7),
    fieldError('email', Boolean(email) && !/^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/.test(email)),
    fieldError('plan', !custom && !F.plan.value),
    fieldError('message', custom && F.message.value.trim().length < 3),
  ];
  return ok.every(Boolean);
}
for (const id of ['name', 'phone', 'email', 'message']) {
  $(`#f-${id}`).addEventListener('input', () => { if ($(`#f-${id}`).getAttribute('aria-invalid') === 'true') validate(); });
}

function showError(msg) {
  const box = $('#order-error');
  box.replaceChildren(document.createTextNode(msg));
  if (view.wa) box.append(document.createTextNode(' You can also '), el('a', { href: waLink(view.wa, 'Hi Nimtto, I want to order a wedding invitation.'), target: '_blank', rel: 'noopener', text: 'order on WhatsApp' }), document.createTextNode('.'));
  box.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#order-error').hidden = true;
  if (!validate()) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
  const custom = F.kind.value === 'custom';
  const plan = chosenPlan();
  const body = { kind: custom ? 'custom' : 'order', name: F.name.value.trim(), phone: F.phone.value.trim(), message: F.message.value.trim(), website: F.website.value };
  if (F.email.value.trim()) body.email = F.email.value.trim();
  if (F.weddingDate.value) body.weddingDate = F.weddingDate.value;
  if (!custom && F.theme.value) body.theme = F.theme.value;
  if (plan) body.plan = plan.id;
  const btn = $('#order-submit');
  btn.disabled = true;
  btn.textContent = 'Saving your order…';
  const r = await createOrder(body, view.site);
  btn.disabled = false;
  syncTotal();
  if (r.ok) {
    const ref = typeof r.data.ref === 'string' && REF_RE.test(r.data.ref) ? r.data.ref : '';
    const token = typeof r.data.payToken === 'string' && /^[A-Za-z0-9_-]{8,200}$/.test(r.data.payToken) ? r.data.payToken : '';
    const amount = r.data.amount?.npr ?? r.data.amount;
    if (ref && token && (amount == null || Number(amount) > 0)) {
      form.hidden = true;
      const box = $('#order-pay');
      box.hidden = false;
      history.replaceState(history.state, '', `${location.pathname}#order`);
      try {
        const { mountPayment } = await loadPayment();
        await mountPayment(box, { ref, token, wa: view.wa });
      } catch {
        location.assign(`/pay/${encodeURIComponent(ref)}?t=${encodeURIComponent(token)}`); // the order is saved: pay there
      }
      return;
    }
    showDone(ref, plan);
    return;
  }
  const bad = r.status === 400 && Array.isArray(r.data.fields) ? r.data.fields.filter((f) => ['name', 'phone', 'email', 'message', 'plan'].includes(f)) : [];
  if (r.status === 429) showError('Too many orders from this connection. Please wait a few minutes and try again.');
  else if (bad.length) {
    bad.forEach((f) => fieldError(f, true));
    form.querySelector('[aria-invalid="true"]')?.focus();
    showError('Please check the fields in red.');
  } else if (r.status === 400) showError('Please check the form and try again.');
  else if (r.status === 0) showError('We could not reach the server. Check your connection and try again.');
  else showError('We could not save your order just now. Please try again in a moment.');
});

function showDone(ref, plan) {
  form.hidden = true;
  $('#done-title').textContent = 'Thank you. We have your request.';
  $('#done-text').textContent = 'We will call or message you within a day to agree the price and how to pay.';
  const rows = [ref ? ['Order number', ref] : null, plan ? ['Plan', plan.name] : null].filter(Boolean);
  const dl = $('#done-facts');
  dl.replaceChildren(...rows.map(([k, v]) => el('div', {}, el('dt', { text: k }), el('dd', { text: v }))));
  dl.hidden = !rows.length;
  const done = $('#order-done');
  done.hidden = false;
  done.focus();
}
$('#order-again').addEventListener('click', () => {
  form.reset();
  syncKind();
  $('#order-done').hidden = true;
  form.hidden = false;
  F.name.focus();
});

/** /?design=<slug>#order (design pages and the showcase's "Order this design"), /?plan=<id>#order */
function preselectFromUrl() {
  const q = new URLSearchParams(location.search);
  const slug = q.get('design');
  const plan = q.get('plan');
  const c = q.get('cat');
  if (c && (c === 'faiths' || CATEGORIES[c]) && c !== view.cat) { view.cat = c; renderDesigns(); }
  if (slug && SLUG_RE.test(slug)) chooseTheme(slug);
  if (plan && /^[a-z0-9-]{1,32}$/.test(plan)) choosePlan(plan);
  if (!slug && !plan && !c) return;
  q.delete('design');
  q.delete('plan');
  q.delete('cat');
  history.replaceState(history.state, '', `${location.pathname}${q.toString() ? `?${q}` : ''}${location.hash}`);
  const target = location.hash === '#order' || location.hash === '#designs' ? $(location.hash) : null;
  if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
}

function applyHero(site) {
  const t = str(site.hero?.title, 160);
  const s = str(site.hero?.subtitle, 300);
  if (t) $('[data-site="hero-title"]').textContent = t;
  if (s) $('[data-site="hero-subtitle"]').textContent = s;
}

/* ---------------- boot ---------------- */
async function boot() {
  setYear();
  initHeader();
  initPromo();
  initDesigns();
  initPricing();
  initPreview({
    find: (slug) => view.themes.find((t) => t.slug === slug) || BY_SLUG[slug],
    onOrder: (slug) => {
      chooseTheme(slug);
      $('#order').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      F.name.focus({ preventScroll: true });
    },
  });
  // the logo on the home page: back to the top without a reload
  for (const a of $$('a[data-home]')) {
    a.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      history.pushState(null, '', '/');
      window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
    });
  }
  renderDesigns();
  fillThemeOptions();
  syncKind();

  const site = await loadSite();
  view.site = site;
  view.wa = applyContact(site.contact).wa;
  applyHero(site);
  fillPlanOptions();
  renderPlans();
  preselectFromUrl();
  const themes = await loadThemes(site);
  const same = themes.length === view.themes.length && themes.every((t, i) => t.slug === view.themes[i].slug);
  view.themes = themes;
  setCount(themes.length);
  if (!same) { const keep = view.cat; renderDesigns(); view.cat = keep; }
  fillThemeOptions();
}
setCount(THEMES.length);
boot();
