// A design page (/designs/<slug>/, generated): the static page is complete; this only reflects the live catalog:
// a design the admin hid or that is not ready cannot be ordered, and a changed tier updates its label and price.
import { $ } from './common.js';
import { TIER_LABEL } from './themes.js';
import { applyTierPrices } from './plans.js';

export function init(state) {
  const slug = document.body.dataset.slug;
  const t = state.themes.find((x) => x.slug === slug);
  if (!t) {
    $('#d-off').hidden = false;
    const btn = $('#d-order');
    btn.removeAttribute('data-order');
    btn.href = '/designs/';
    btn.textContent = 'See other designs';
    return;
  }
  const tag = $('.dp__tier [data-tier-tag]');
  if (tag && t.tier && tag.dataset.tierTag !== t.tier) {
    tag.dataset.tierTag = t.tier;
    tag.className = `tier tier--${t.tier}`;
    tag.textContent = TIER_LABEL[t.tier];
    $('.dp__tier [data-tier-price]').dataset.tierPrice = t.tier;
    $('.dp__per').textContent = `in the ${TIER_LABEL[t.tier]} plan and above · paid once`;
    applyTierPrices(state.site);
  }
}
