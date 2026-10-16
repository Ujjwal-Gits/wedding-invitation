// The one script of every public page (home, designs, occasions, how it works, features, pricing, contact, the
// design pages). body[data-page] says which page; its own code and the scroll scenes load on demand.
import './site.css';
import './pages.css';
import { $, $$, el, reduced, SLUG_RE, initHeader, initAuth, initReveal, initPreview, applyContact, setYear } from './common.js';
import { loadSite, loadThemes, normaliseThemes } from './api.js';
import { BY_SLUG, FALLBACK_SITE } from './themes.js';
import { renderPlans, applyPlanNames } from './plans.js';

const page = document.body.dataset.page || '';
const state = { site: null, themes: normaliseThemes(null, FALLBACK_SITE), me: undefined, wa: '' };
let order = null; // the order module, once loaded
const loadOrder = () => import('./order.js').then(async (m) => {
  if (!order) {
    const { enhance } = await import('../ui/enhance.js'); // Nimtto dropdowns in the form
    enhance($('#om'));
    order = m;
  }
  m.setOrderData(state);
  return m;
});

/** any [data-order] (with data-plan / data-design / data-occasion) opens the order form */
function initOrderLinks() {
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest('[data-order]') : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!state.site) return; // still loading: the link goes to the pricing page, which opens the form itself
    e.preventDefault();
    loadOrder().then((m) => m.openOrder({ plan: a.dataset.plan, design: a.dataset.design, occasion: a.dataset.occasion, opener: a }));
  });
  // warm the form once the visitor shows intent
  const warm = () => { loadOrder().catch(() => {}); };
  document.addEventListener('pointerover', (e) => { if (e.target instanceof Element && e.target.closest('[data-order]')) warm(); }, { passive: true, once: true });
  document.addEventListener('focusin', (e) => { if (e.target instanceof Element && e.target.closest('[data-order]')) warm(); }, { once: true });
}

/** ?design=<slug>, ?plan=<id>, ?occasion=<id> or #order open the form (the showcase's "Order this design" too) */
function orderFromUrl() {
  const q = new URLSearchParams(location.search);
  const design = q.get('design') || '';
  const plan = q.get('plan') || '';
  const occasion = q.get('occasion') || '';
  if (!design && !plan && !occasion && location.hash !== '#order') return;
  ['design', 'plan', 'occasion'].forEach((k) => q.delete(k));
  const hash = location.hash === '#order' ? '' : location.hash;
  history.replaceState(history.state, '', `${location.pathname}${q.toString() ? `?${q}` : ''}${hash}`);
  loadOrder().then((m) => m.openOrder({
    design: SLUG_RE.test(design) ? design : '',
    plan: /^[a-z0-9-]{1,32}$/.test(plan) ? plan : '',
    occasion: /^[a-z-]{2,20}$/.test(occasion) ? occasion : '',
  }));
}

/** how it works: the sticky phone shows the screen of the step in the middle of the view */
function initWalk() {
  const walk = $('[data-walk]');
  if (!walk) return;
  const screens = $$('.wscreen', walk);
  // narrow screens have no sticky phone: each step without a picture gets a small phone with its own screen
  // (a copy of the page's static markup; hidden on wide screens by CSS)
  for (const step of $$('[data-step]', walk)) {
    const s = screens[Number(step.dataset.step)];
    if (!s || $('.wstep__fig', step)) continue;
    const ph = el('span', { class: 'phone' });
    const copy = s.cloneNode(true);
    copy.classList.add('is-on');
    ph.append(copy);
    $('ul', step)?.after(el('div', { class: 'wstep__fig wstep__fig--screen', 'aria-hidden': 'true' }, ph));
  }
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      const i = Number(e.target.dataset.step);
      screens.forEach((s, k) => s.classList.toggle('is-on', k === i));
    }
  }, { rootMargin: '-45% 0px -45% 0px' });
  $$('[data-step]', walk).forEach((n) => io.observe(n));
}

/** a light first picture for a fast first paint; the sharp one follows at the visitor's first scroll or touch
 *  (swapping it earlier would count as a second, later largest paint) */
function sharpenLater() {
  const imgs = $$('img[data-sizes]');
  if (!imgs.length) return;
  const go = () => {
    imgs.forEach((i) => { i.sizes = i.dataset.sizes; });
    ['scroll', 'pointerdown', 'keydown'].forEach((t) => window.removeEventListener(t, go));
  };
  ['scroll', 'pointerdown', 'keydown'].forEach((t) => window.addEventListener(t, go, { passive: true, once: true }));
}

function updateCounts() { for (const c of $$('.js-count')) c.textContent = String(state.themes.length); }

async function boot() {
  setYear();
  initHeader();
  initReveal();
  initOrderLinks();
  initWalk();
  sharpenLater();
  initPreview({
    find: (slug) => state.themes.find((t) => t.slug === slug) || BY_SLUG[slug],
    onOrder: (slug) => loadOrder().then((m) => m.openOrder({ design: slug })),
  });
  // the scroll scenes: wide and narrow screens both, lighter on phones; nothing moves with reduced motion
  if (!reduced.matches && $('[data-scene]')) import('./motion.js').then((m) => m.initScenes()).catch(() => {});

  const pageMod = page === 'designs' ? import('./designs-page.js') : page === 'design' ? import('./design-page.js') : null;
  // signed in from the order's account step (src/site/order.js): that answer wins over a late initAuth
  document.addEventListener('nimtto:me', (e) => { state.me = e.detail; });
  initAuth().then((me) => { if (state.me === undefined) state.me = me; if (order) order.setOrderData(state); });
  const site = await loadSite();
  state.site = site;
  state.wa = applyContact(site.contact).wa;
  for (const box of $$('[data-plans]')) renderPlans(box, site);
  applyPlanNames(site); // the planner's plan names and prices everywhere the page names a plan
  const themes = await loadThemes(site);
  state.themes = themes;
  updateCounts();
  if (order) order.setOrderData(state);
  if (pageMod) (await pageMod).init?.(state);
  orderFromUrl();
}
boot();
