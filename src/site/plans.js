// Plan cards from GET /api/site (the static ones in the page are the build-time fallback), and the
// "from Rs ..." next to each design tier. Same markup as src/site/partials.mjs `plans`.
import { $$, el, money } from './common.js';
import { PLAN_DESC, PLAN_NE, planForTier } from './themes.js';

function card(p) {
  return el('li', { class: `plan${p.highlight ? ' plan--hi' : ''}`, 'data-plan-id': p.id },
    p.highlight ? el('p', { class: 'plan__flag', text: 'Most chosen' }) : null,
    el('div', { class: 'plan__top' }, el('h3', { class: 'plan__name', text: p.name }), PLAN_NE[p.id] ? el('span', { class: 'plan__ne', lang: 'ne', text: PLAN_NE[p.id] }) : null),
    p.price != null
      ? el('p', { class: 'plan__price' }, p.from ? el('span', { class: 'plan__from', text: 'from' }) : null, el('span', { class: 'plan__num', text: money(p.price) }))
      : el('p', { class: 'plan__price' }, el('span', { class: 'plan__num', text: 'Ask us' })),
    p.priceUsd != null ? el('p', { class: 'plan__usd', text: `or USD ${p.priceUsd} from abroad` }) : null,
    el('p', { class: 'plan__desc', text: p.note || PLAN_DESC[p.id] || '' }),
    el('a', { class: `btn ${p.highlight ? 'btn--accent' : 'btn--ghost'} plan__btn`, href: `/pricing/?plan=${encodeURIComponent(p.id)}#plans`, 'data-order': '', 'data-plan': p.id, text: `Choose ${p.name}` }),
    p.features.length ? el('ul', { class: 'plan__feats' }, p.features.map((f) => el('li', { text: f }))) : null);
}

export function renderPlans(box, site) {
  if (!site?.plans?.length) return;
  box.replaceChildren(...site.plans.map(card));
}

/** "from Rs 4,999" beside every Saral / Shubha / Shahi label */
export function applyTierPrices(site) {
  for (const n of $$('[data-tier-price]')) {
    const p = planForTier(site.plans, n.dataset.tierPrice);
    n.textContent = p ? `from ${money(p.price)}` : '';
  }
}
