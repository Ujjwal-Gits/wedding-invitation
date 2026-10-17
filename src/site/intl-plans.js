// The international site's view of the real plans (GET /api/site, or FALLBACK_SITE at build): the same plans and
// their US dollar prices (`priceUsd`), shown under international names. Plain module: the build (src/site/intl.mjs)
// and the page (src/site/intl.js) both use it, so the static cards and the live ones always match.
export const INTL_NAME = { saral: 'Standard', shubha: 'Pro', shahi: 'Pro Max', custom: 'Custom' };
export const INTL_DESC = {
  saral: 'Everything you need for a simple, lovely invitation.',
  shubha: 'Photos, maps and music for the whole wedding day.',
  shahi: 'Every design, plus a personal link for each guest.',
  custom: 'A brand-new design, made just for you.',
};
const ORDER = ['saral', 'shubha', 'shahi', 'custom'];

/** The plans to show, in order, each as { id, name, usd, from, highlight, desc, features }. Plans without a USD price are left out. */
export function intlPlans(plans) {
  // only the plans offered on the international site (a plan without `markets` is offered on both)
  const list = (plans || []).filter((p) => p && INTL_NAME[p.id] && p.priceUsd != null && (!Array.isArray(p.markets) || p.markets.includes('intl')));
  // the planner's names (Saral, Shubha ...) appear inside feature lines ("Everything in Saral"): use ours
  const rename = (s) => list.reduce((t, p) => (p.name ? t.split(p.name).join(INTL_NAME[p.id]) : t), String(s))
    .replace(/\bon WhatsApp\b/g, 'anywhere')
    .replace(/\bEvery ceremony\b/g, 'Every event')
    .replace(/\byour occasion\b/g, 'your event')
    .replace(/\bcolours\b/g, 'colors');
  return list
    .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id))
    .map((p) => ({
      id: p.id,
      name: INTL_NAME[p.id],
      usd: Number(p.priceUsd),
      from: Boolean(p.from),
      highlight: Boolean(p.highlight),
      desc: INTL_DESC[p.id],
      features: (p.features || []).map(rename),
    }));
}

export const usdText = (n) => `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)}`;
