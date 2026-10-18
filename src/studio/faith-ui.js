// The couple's community (Hindu / Buddhist / Kirat / Muslim / Christian / Other) in the studio: the same choices as the
// New-invitation step. It sets `religion` (absent = Hindu). Designs, gates and first screens are filtered by
// suits() (src/core/faith.js); a change the current design does not suit offers a suitable design first.
import { h, icon, toast, openDialog } from './dom.js';
import { suits, religionOf } from '../core/faith.js';
import { resolveDesign, cleanDesign } from '../core/mix-rules.js';

export const FAITHS = [
  ['hindu', 'Hindu', 'Ganesh and ॥ श्री गणेशाय नमः ॥'],
  ['buddhist', 'Buddhist', 'A Dharma wheel and ॥ नमो बुद्धाय ॥'],
  ['kirat', 'Kirat', 'No Hindu symbols; ancestors and elders'],
  ['muslim', 'Muslim', 'Bismillah and a crescent'],
  ['christian', 'Christian', 'A verse, rings and a cross'],
  ['other', 'Other / none', 'No religious symbol'],
];
const MARK = {
  buddhist: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v6M12 14v6M4 12h6M14 12h6M6.3 6.3l4.3 4.3M13.4 13.4l4.3 4.3M17.7 6.3l-4.3 4.3M10.6 13.4l-4.3 4.3"/>',
  kirat: '<path d="M12 21V9M12 9c-3-1-5-3.5-5-6.5 3 0 5 2.5 5 6.5zM12 13c3-1 5-3.5 5-6.5-3 0-5 2.5-5 6.5z"/>',
  muslim: '<path d="M15.5 4.6a8 8 0 1 0 3.9 13.3A6.6 6.6 0 0 1 15.5 4.6z"/><path d="M17.6 7.2l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z"/>',
  christian: '<path d="M12 3v18M7 8.5h10"/>',
  other: '<circle cx="12" cy="12" r="2"/><path d="M12 10c-1.5-3-1.2-5.6 0-6.5 1.2.9 1.5 3.5 0 6.5zM14 12c3-1.5 5.6-1.2 6.5 0-.9 1.2-3.5 1.5-6.5 0zM12 14c1.5 3 1.2 5.6 0 6.5-1.2-.9-1.5-3.5 0-6.5zM10 12c-3 1.5-5.6 1.2-6.5 0 .9-1.2 3.5-1.5 6.5 0z"/>',
};
export function faithMark(k) {
  if (k === 'hindu') return h('span.nf-mark.nf-mark--om', { 'aria-hidden': 'true', lang: 'ne' }, 'ॐ');
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [a, v] of Object.entries({ viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) s.setAttribute(a, v);
  s.innerHTML = MARK[k]; // constant markup only
  return h('span.nf-mark', s);
}

/** The invitation's community. */
export const faithOf = (ctx) => religionOf(ctx.m.data);
/** Whether a theme (a /api/meta entry: `religions`) suits this invitation's community, or `religion`. */
export const suitsFaith = (ctx, t, religion = faithOf(ctx)) => suits(t || {}, religion);
const nameOf = (k) => FAITHS.find((f) => f[0] === k)?.[1] || k;
const forWhom = (k) => (k === 'other' ? 'a wedding without religious symbols' : `a ${nameOf(k)} wedding`);

function setFaith(ctx, k) {
  if (k === 'hindu') { if ('religion' in ctx.m.data) { delete ctx.m.data.religion; ctx.m.touch(['religion']); } } else ctx.m.set(['religion'], k);
}

/**
 * A community change. Designs that do not suit it are swapped first (the couple picks one), then the gate and first
 * screen are kept only if they suit too. The server checks it again; a refusal is shown and the change undone.
 */
async function change(ctx, k, { themes, pickDesign, redraw }) {
  const m = ctx.m;
  const before = { religion: m.data.religion, theme: m.data.theme, design: m.data.design ? { ...m.data.design } : null };
  const partsOf = (slug) => ctx.meta.themes.find((t) => t.slug === slug)?.parts || null;
  const byslug = (s) => ctx.meta.themes.find((t) => t.slug === s);
  let theme = m.data.theme;
  if (!suitsFaith(ctx, byslug(theme), k)) {
    const list = themes().filter((t) => suitsFaith(ctx, t, k));
    if (!ctx.isAdmin && !ctx.perms.canChangeTheme) { toast(`${byslug(theme)?.name || 'This design'} is not made for ${forWhom(k)}. Ask your planner to change the design first.`, 'error'); return false; }
    if (!list.length) { toast(`No design for ${forWhom(k)} is open to you yet. Ask your planner.`, 'error'); return false; }
    const t = await pickDesign(list, `${byslug(theme)?.name || 'This design'} is not made for ${forWhom(k)}. Choose one that is:`);
    if (!t) return false;
    theme = t.slug;
  }
  // The gate and first screen stay only if they suit the community and the (new) design can take them.
  const r = resolveDesign(m.data.design, m.data.theme, partsOf);
  const want = { gate: r.gate && suitsFaith(ctx, byslug(r.gate), k) ? r.gate : undefined, hero: r.hero && suitsFaith(ctx, byslug(r.hero), k) ? r.hero : undefined };
  const design = cleanDesign(want, theme, partsOf);
  if (theme !== m.data.theme) m.set(['theme'], theme);
  if (design) m.set(['design'], design); else if (m.data.design) { delete m.data.design; m.touch(['design']); }
  setFaith(ctx, k);
  await ctx.session.flush();
  if (ctx.session.state === 'error') {
    // Refused (403): put everything back as it was and save that.
    if (before.religion) m.data.religion = before.religion; else delete m.data.religion;
    m.data.theme = before.theme;
    if (before.design) m.data.design = before.design; else delete m.data.design;
    m.touch(['religion']);
    await ctx.session.flush();
    redraw?.();
    return false;
  }
  ctx.preview?.reload();
  toast(`Set to ${nameOf(k)}. The symbols and opening words follow.`, 'success');
  redraw?.();
  return true;
}

/**
 * The Community card. opts: { themes() -> allowed themes (any community), pickDesign(list, text) -> Promise<theme|null>,
 * redraw() }. Read-only (with a note) when the couple may not change the design.
 */
export function faithCard(ctx, opts) {
  const cur = faithOf(ctx);
  const can = ctx.isAdmin || ctx.perms.canChangeTheme;
  const box = h('div.nf-faiths.faithpick', { role: 'radiogroup', 'aria-label': 'Community' },
    FAITHS.map(([k, name, note]) => h('button.nf-faith', {
      type: 'button', role: 'radio', 'aria-checked': String(cur === k), disabled: !can && cur !== k ? true : null,
      onclick: async () => { if (k === cur || !can) return; await change(ctx, k, opts); },
    }, faithMark(k), h('span.nf-faith__t', h('b', name), h('small', note)))));
  return h('section.card.faithcard', { 'aria-label': 'Community' },
    h('header.card__head', h('h2.card__title', 'Community'), h('p.card__help', 'Sets the sacred symbol and the first words. Only designs made for it are offered.')),
    box,
    can ? null : h('p.mixlock', icon('lock', 15), h('span', h('b', 'Set by your planner. '), 'Ask your planner to change this.')));
}

/** A dialog listing suitable designs; resolves to the chosen theme or null. */
export function pickDesignDialog(ctx, list, text, thumb) {
  return new Promise((resolve) => {
    let chosen = null;
    const d = openDialog({
      title: 'Choose a design', wide: true,
      body: [h('p.dialog__text', text), h('ul.tgrid', list.map((t) => h('li', h('button.tcard', { type: 'button', onclick: () => { chosen = t; d.close(); } },
        h('span.tcard__img', thumb(t)), h('span.tcard__name', t.name), t.concept ? h('span.tcard__concept', t.concept) : null))))],
      onClose: () => resolve(chosen),
    });
  });
}
