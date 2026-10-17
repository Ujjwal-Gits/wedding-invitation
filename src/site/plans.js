// Plan cards from GET /api/site (the static ones in the page are the build-time fallback), the "from Rs ..." next to
// each design tier, and every other place a page names a plan. Same markup as src/site/partials.mjs `plans`.
// The planner renames plans in the studio, so built pages carry the first names and these attributes, filled here:
//   data-plan-name="<id>"     the plan's name          data-plan-name-ne="<id>"  its Nepali name
//   data-plan-price="<id>"    "Rs 4,999" (or "Ask us") data-plan-usd="<id>"      "USD 99"
//   data-tier-name="<tier>"   the name of the plan a design tier is called after (also data-tier-tag)
//   data-tier-price="<tier>"  "from Rs 4,999"
import { $$, el, money } from './common.js';
import { PLAN_DESC, planForTier, tierName } from './themes.js';

/** A plan's price in the visitor's currency ("Rs 4,999" or "$99"); null when it has none. */
export const shownPrice = (p, site) => (site?.currency === 'USD'
  ? (p?.priceUsd != null ? `$${p.priceUsd}` : null)
  : (p?.price != null ? money(p.price) : null));

function card(p, site) {
  const shown = shownPrice(p, site);
  return el('li', { class: `plan${p.highlight ? ' plan--hi' : ''}`, 'data-plan-id': p.id },
    p.highlight ? el('p', { class: 'plan__flag', text: 'Most chosen' }) : null,
    el('div', { class: 'plan__top' }, el('h3', { class: 'plan__name', text: p.name }), p.nameNe ? el('span', { class: 'plan__ne', lang: 'ne', text: p.nameNe }) : null),
    shown
      ? el('p', { class: 'plan__price' }, p.from ? el('span', { class: 'plan__from', text: 'from' }) : null, el('span', { class: 'plan__num', text: shown }))
      : el('p', { class: 'plan__price' }, el('span', { class: 'plan__num', text: 'Ask us' })),
    site?.currency !== 'USD' && p.priceUsd != null ? el('p', { class: 'plan__usd', text: `or USD ${p.priceUsd} from abroad` }) : null,
    el('p', { class: 'plan__desc', text: p.note || PLAN_DESC[p.id] || '' }),
    el('a', { class: `btn ${p.highlight ? 'btn--accent' : 'btn--ghost'} plan__btn`, href: `/pricing/?plan=${encodeURIComponent(p.id)}#plans`, 'data-order': '', 'data-plan': p.id, text: `Choose ${p.name}` }),
    p.features.length ? el('ul', { class: 'plan__feats' }, p.features.map((f) => el('li', { text: f }))) : null);
}

export function renderPlans(box, site) {
  if (!site?.plans?.length) return;
  box.replaceChildren(...site.plans.map((p) => card(p, site)));
}

/** "from Rs 4,999" beside every design tier label */
export function applyTierPrices(site) {
  for (const n of $$('[data-tier-price]')) {
    const p = planForTier(site.plans, n.dataset.tierPrice);
    n.textContent = p && shownPrice(p, site) ? `from ${shownPrice(p, site)}` : '';
  }
}

/** Every plan name, Nepali name and price in the page, from the live plans (text only, never HTML). */
export function applyPlanNames(site, root = document) {
  const plans = site?.plans || [];
  const plan = (id) => plans.find((p) => p.id === id);
  const set = (n, v) => { if (v && n.textContent !== v) n.textContent = v; };
  for (const n of $$('[data-plan-name]', root)) set(n, plan(n.dataset.planName)?.name);
  for (const n of $$('[data-plan-name-ne]', root)) {
    const p = plan(n.dataset.planNameNe);
    if (!p) continue;
    n.textContent = p.nameNe || '';
    n.hidden = !p.nameNe;
  }
  for (const n of $$('[data-plan-price]', root)) {
    const p = plan(n.dataset.planPrice);
    if (p) set(n, shownPrice(p, site) || 'Ask us');
  }
  for (const n of $$('[data-plan-usd]', root)) {
    const p = plan(n.dataset.planUsd);
    if (p?.priceUsd != null) set(n, `USD ${p.priceUsd}`);
    if (site?.currency === 'USD') n.closest('.plan__usd')?.setAttribute('hidden', '');
  }
  for (const n of $$('[data-tier-name]', root)) set(n, tierName(plans, n.dataset.tierName));
  for (const n of $$('[data-tier-tag]', root)) set(n, tierName(plans, n.dataset.tierTag));
  applyTierPrices(site);
}
