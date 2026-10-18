// The international site's script (/international/ and its pages): the public site's own script and scroll scenes
// (src/site/site.js, motion.js), the sage palette over it (intl.css), the plans in US dollars from the live plans,
// and the style filter of the designs (the home page's rail and the designs page's grid).
import './site.js';
import './intl.css';
import { $, $$, reduced, money } from './common.js';
import { loadSite, getJson } from './api.js';
import { intlPlans, usdText, INTL_NAME } from './intl-plans.js';
import { intlCatalog, STYLE_LABEL, designPage } from './intl-designs.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** the plan cards and every "from $49", from GET /api/site (the built cards are the fallback); a plan the planner
 *  stopped offering on the international site leaves the page */
async function refreshPlans() {
  const site = await loadSite();
  const plans = intlPlans(site.plans);
  // prices follow where the visitor is: someone in Nepal sees rupees here too
  const priceText = (p) => (site.currency === 'NPR' && p.npr != null ? money(p.npr) : usdText(p.usd));
  if (!plans.length) return;
  for (const box of $$('[data-plans-usd]')) {
    for (const card of $$('[data-plan-id]', box)) if (!plans.some((p) => p.id === card.dataset.planId)) card.remove();
    for (const p of plans) {
      const card = box.querySelector(`[data-plan-id="${p.id}"]`);
      if (!card) continue;
      const num = card.querySelector('.plan__num');
      if (num) num.textContent = priceText(p);
      const feats = card.querySelector('.plan__feats');
      if (feats && p.features.length) feats.innerHTML = p.features.map((f) => `<li>${esc(f)}</li>`).join('');
    }
  }
  for (const n of $$('[data-usd-from]')) {
    const p = plans.find((x) => x.id === n.dataset.usdFrom);
    if (p) n.textContent = n.classList.contains('dcard__price') ? `from ${priceText(p)}` : priceText(p);
  }
}
refreshPlans().catch(() => {});

/** The style chips: show only the cards in that style. The home page's rail then measures itself again (while it is
 *  pinned we first go back to its start, so the shorter or longer row never jumps); the designs page counts them. */
let reapply = () => {};
function initStyles() {
  const chips = $$('.gal-chips [data-style]');
  const list = () => $$('#gal > li, #dgrid > li[data-slug]');
  if (!chips.length) return;
  const sec = document.getElementById('designs');
  const count = $('#dcount');
  const apply = (style, animate = true) => {
    let n = 0;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.style === style)));
    for (const card of list()) {
      const on = style === 'all' || card.dataset.style === style;
      card.hidden = !on;
      if (on) { n += 1; if (animate) { card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in'); } } // restart the fade
    }
    if (count) count.textContent = `${n} ${n === 1 ? 'design' : 'designs'}`;
    const empty = $('#dempty');
    if (empty) empty.hidden = n > 0;
    const view = sec?.querySelector('.rail__view');
    if (view) view.scrollLeft = 0; // phones: the swipe row starts again at the first card
    if (!sec?.classList.contains('js-rail')) return; // no pinned scene (phones, reduced motion, other pages)
    import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
      const st = ScrollTrigger.getAll().find((t) => t.trigger === sec);
      if (st && window.scrollY > st.start) window.scrollTo({ top: st.start, behavior: 'instant' });
      ScrollTrigger.refresh();
    }).catch(() => {});
  };
  for (const chip of chips) chip.addEventListener('click', () => apply(chip.dataset.style));
  reapply = () => apply(chips.find((c) => c.getAttribute('aria-pressed') === 'true')?.dataset.style || 'all');
  const q = new URLSearchParams(location.search).get('style');
  apply(STYLE_LABEL[q] ? q : 'all', false);
}

/** The designs page: the live list from GET /api/themes?market=intl (the planner's order, hidden designs gone)
 *  replaces the built cards (same markup). */
async function liveCatalog() {
  const grid = $('#dgrid[data-intl-grid]');
  if (!grid) return;
  const raw = await getJson('/api/themes?market=intl', 4000);
  if (!Array.isArray(raw) || !raw.length) return; // no live list: the built cards are right
  const list = intlCatalog(raw);
  const custom = grid.querySelector('.dcard--custom');
  const TINTS = ['#EAF1E7', '#F1F5EF', '#E6EFE3', '#EEF2EA']; // as the built cards (src/site/intl.mjs)
  const card = (d, i) => {
    const li = document.createElement('li');
    li.className = 'dcard';
    li.id = `d-${d.slug}`;
    Object.assign(li.dataset, { slug: d.slug, style: d.style, tier: d.tier });
    const href = designPage(d.slug, 'intl'); // the design's own page (Nepal designs: their /designs/ page)
    li.innerHTML = `<a class="dcard__pic" href="${href}" style="--tint:${TINTS[i % TINTS.length]}" tabindex="-1" aria-hidden="true"><span class="phone"><img src="${esc(d.mini)}" width="390" height="844" alt="" loading="lazy" decoding="async" /></span></a>
      <div class="dcard__body"><h3 class="dcard__name"><a href="${href}">${esc(d.name)}</a> <span class="dcard__ne">${esc(STYLE_LABEL[d.style])}</span></h3>
      <p class="dcard__meta"><span class="tier tier--${esc(d.tier)}">${esc(INTL_NAME[d.tier] || '')}</span><span class="dcard__price" data-usd-from="${esc(d.tier)}"></span></p>
      <p class="dcard__desc">${esc(d.line)}</p>
      <div class="dcard__acts"><a class="btn btn--accent btn--sm" href="/international/pricing/?design=${esc(d.slug)}#plans" data-order data-design="${esc(d.slug)}">Order</a>
      <a class="btn btn--ghost btn--sm" href="/${esc(d.slug)}/?showcase=1&amp;m=intl" data-preview="${esc(d.slug)}">Preview</a></div></div>`;
    return li;
  };
  grid.replaceChildren(...list.map(card), ...(custom ? [custom] : []));
  await refreshPlans().catch(() => {});
  reapply();
}

initStyles();
liveCatalog().catch(() => {});

// what guests see: the 3D phone whose screen changes step by step (a still list of steps with reduced motion)
if (!reduced.matches && document.querySelector('[data-scene="journey"]')) import('./intl-journey.js').then((m) => m.initJourney()).catch(() => {});
