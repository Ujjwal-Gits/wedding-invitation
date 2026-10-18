// A design page (/designs/<slug>/ and /international/designs/<slug>/, generated): the static page is complete; this
// only reflects the live catalog: a design the admin hid or that is not ready cannot be ordered, and a changed tier
// updates its label and price (rupees on the Nepal site; US dollars, or rupees for a visitor in Nepal, on the
// international site, whose tag is [data-itier] so the Nepal plan names never land on it).
import { $, MARKET, money } from './common.js';
import { applyPlanNames } from './plans.js';
import { intlPlans, usdText } from './intl-plans.js';

export function init(state) {
  const slug = document.body.dataset.slug;
  const t = state.themes.find((x) => x.slug === slug);
  const intl = MARKET === 'intl';
  if (!t) {
    $('#d-off').hidden = false;
    const btn = $('#d-order');
    btn.removeAttribute('data-order');
    btn.href = intl ? '/international/designs/' : '/designs/';
    btn.textContent = 'See other designs';
    return;
  }
  if (intl) {
    const tag = $('.dp__tier [data-itier]');
    const p = intlPlans(state.site?.plans).find((x) => x.id === t.tier);
    if (!tag || !p || tag.dataset.itier === t.tier) return;
    tag.dataset.itier = t.tier;
    tag.className = `tier tier--${t.tier}`;
    tag.textContent = p.name;
    const price = $('.dp__tier [data-usd-from]');
    if (price) { price.dataset.usdFrom = t.tier; price.textContent = state.site?.currency === 'NPR' && p.npr != null ? money(p.npr) : usdText(p.usd); }
    const per = $('.dp__per [data-itier-name]');
    if (per) per.textContent = p.name;
    return;
  }
  const tag = $('.dp__tier [data-tier-tag]');
  if (tag && t.tier && tag.dataset.tierTag !== t.tier) {
    tag.dataset.tierTag = t.tier;
    tag.className = `tier tier--${t.tier}`;
    $('.dp__tier [data-tier-price]').dataset.tierPrice = t.tier;
    const per = $('.dp__per [data-tier-name]');
    if (per) per.dataset.tierName = t.tier;
    applyPlanNames(state.site); // names and prices for the new tier
  }
}
