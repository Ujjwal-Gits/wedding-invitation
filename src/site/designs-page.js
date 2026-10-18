// /designs/: the grid is static HTML (src/site/partials.mjs: every design, Nepal's first, then the international
// ones). This puts it in the planner's order from /api/themes?market=np (a design new to the catalog gets a card,
// a hidden one leaves), brings the tiers and faiths up to date, and filters it by look, faith and plan.
import { $, $$, el } from './common.js';
import { TIER_RANK, CATEGORIES } from './themes.js';
import { designPage } from './intl-designs.js';
import { applyPlanNames } from './plans.js';
import STILLS from './stills.json';

const FAITHS = ['hindu', 'buddhist', 'kirat', 'christian', 'muslim', 'other'];

/** a card for a design the build did not know (same markup as partials.mjs designCard) */
function newCard(t) {
  const href = designPage(t.slug);
  const img = el('img', { src: STILLS[t.slug] ? `/site/stills/${t.slug}-480.webp` : t.thumb, width: 390, height: 844, alt: '', loading: 'lazy', decoding: 'async' });
  return el('li', { class: 'dcard', 'data-slug': t.slug, 'data-cat': t.cat, 'data-tier': t.tier, 'data-faiths': (t.religions || []).join(' ') },
    el('a', { class: 'dcard__pic', href, style: `--tint:${(CATEGORIES[t.cat] || CATEGORIES.cards).tint}`, tabindex: '-1', 'aria-hidden': 'true' }, el('span', { class: 'phone' }, img)),
    el('div', { class: 'dcard__body' },
      el('h3', { class: 'dcard__name' }, el('a', { href, text: t.name }), ' ', t.intl ? el('span', { class: 'dcard__ne', text: 'International' }) : el('span', { class: 'dcard__ne', lang: 'ne', text: t.ne || '' })),
      el('p', { class: 'dcard__meta' }, el('span', { class: `tier tier--${t.tier}`, 'data-tier-tag': t.tier }), el('span', { class: 'dcard__price', 'data-tier-price': t.tier })),
      el('p', { class: 'dcard__desc', text: t.concept || '' }),
      el('div', { class: 'dcard__acts' },
        el('a', { class: 'btn btn--accent btn--sm', href: `/pricing/?design=${t.slug}#plans`, 'data-order': '', 'data-design': t.slug, text: 'Order' }),
        el('a', { class: 'btn btn--ghost btn--sm', href: `/${t.slug}/?showcase=1`, 'data-preview': t.slug, text: 'Preview' }))));
}

export function init(state) {
  const grid = $('#dgrid');
  if (!grid) return;
  const built = new Map($$('.dcard[data-slug]', grid).map((li) => [li.dataset.slug, li]));
  const custom = $('.dcard--custom', grid);
  const cards = state.themes.map((t) => {
    const li = built.get(t.slug) || newCard(t);
    if (t.tier && t.tier !== li.dataset.tier) {
      li.dataset.tier = t.tier;
      const tag = $('[data-tier-tag]', li);
      if (tag) { tag.className = `tier tier--${t.tier}`; tag.dataset.tierTag = t.tier; }
      const price = $('[data-tier-price]', li);
      if (price) price.dataset.tierPrice = t.tier;
    }
    if (t.religions?.length) li.dataset.faiths = t.religions.join(' ');
    return li;
  });
  // the planner's order; a design hidden by the admin (or not ready) is not in the list and leaves the grid
  grid.replaceChildren(...cards, ...(custom ? [custom] : []));

  const f = { cat: 'all', tier: 'all', faith: 'all' };
  const q = new URLSearchParams(location.search);
  if (/^(flowers|doors|cards|film)$/.test(q.get('cat') || '')) f.cat = q.get('cat');
  if (FAITHS.includes(q.get('faith'))) f.faith = q.get('faith');
  if (TIER_RANK[q.get('tier')]) f.tier = q.get('tier');
  const apply = () => {
    let n = 0;
    for (const li of $$('.dcard[data-slug]', grid)) {
      const catOk = f.cat === 'all' || li.dataset.cat === f.cat;
      const faithOk = f.faith === 'all' || (li.dataset.faiths || '').split(' ').includes(f.faith);
      const tierOk = f.tier === 'all' || (TIER_RANK[li.dataset.tier] || 2) <= TIER_RANK[f.tier];
      li.hidden = !(catOk && faithOk && tierOk);
      if (!li.hidden) n += 1;
    }
    for (const b of $$('[data-f]')) b.setAttribute('aria-pressed', String(f[b.dataset.f] === b.dataset.v));
    $('#dcount').textContent = `${n} ${n === 1 ? 'design' : 'designs'}`;
    $('#dempty').hidden = n > 0;
  };
  document.addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest('[data-f]') : null;
    if (!b) return;
    f[b.dataset.f] = b.dataset.v;
    apply();
  });
  applyPlanNames(state.site); // re-run the tier names and prices now that tiers may have changed
  apply();
}
