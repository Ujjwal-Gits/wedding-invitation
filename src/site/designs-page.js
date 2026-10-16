// /designs/: the grid is static HTML (src/site/partials.mjs); this filters it by look and by plan, and brings the
// tiers and the hidden designs up to date from /api/themes.
import { $, $$ } from './common.js';
import { TIER_LABEL, TIER_RANK } from './themes.js';

export function init(state) {
  const grid = $('#dgrid');
  if (!grid) return;
  const live = new Map(state.themes.map((t) => [t.slug, t]));
  for (const li of $$('.dcard[data-slug]', grid)) {
    const t = live.get(li.dataset.slug);
    if (!t) { li.remove(); continue; } // hidden by the admin, or not ready
    if (t.tier && t.tier !== li.dataset.tier) {
      li.dataset.tier = t.tier;
      const tag = $('[data-tier-tag]', li);
      tag.className = `tier tier--${t.tier}`;
      tag.textContent = TIER_LABEL[t.tier];
      $('[data-tier-price]', li).dataset.tierPrice = t.tier;
    }
  }
  const f = { cat: 'all', tier: 'all' };
  const q = new URLSearchParams(location.search);
  if (/^(flowers|doors|cards|film|faiths)$/.test(q.get('cat') || '')) f.cat = q.get('cat');
  if (TIER_RANK[q.get('tier')]) f.tier = q.get('tier');
  const apply = () => {
    let n = 0;
    for (const li of $$('.dcard[data-slug]', grid)) {
      const catOk = f.cat === 'all' || (f.cat === 'faiths' ? /muslim/.test(li.dataset.faiths) : li.dataset.cat === f.cat);
      const tierOk = f.tier === 'all' || (TIER_RANK[li.dataset.tier] || 2) <= TIER_RANK[f.tier];
      li.hidden = !(catOk && tierOk);
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
  // re-run the tier prices now that tiers may have changed
  for (const n of $$('[data-tier-price]', grid)) {
    const p = state.site.plans.filter((x) => !x.from && x.id !== 'custom' && (TIER_RANK[x.includes] || 3) >= TIER_RANK[n.dataset.tierPrice]).sort((a, b) => a.price - b.price)[0];
    if (p) n.textContent = `from Rs ${new Intl.NumberFormat('en-IN').format(p.price)}`;
  }
  apply();
}
