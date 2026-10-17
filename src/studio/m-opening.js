// Opening: three choices (docs/MIX.md): the design of the whole invitation, the gate guests open, and the first
// screen after it; then the words, pictures and colours of whatever is chosen. A gate or first screen borrowed from
// another theme keeps its own words and colours in themeContent[<that theme>] / themeColors[<that theme>].
import { h, icon, clear, card, openDialog, confirmDialog, skeleton, emptyState, fill, toast } from './dom.js';
import { loadAll, loadManifest } from './slotdata.js';
import { slotTools, OPENING_RE } from './slots-ui.js';
import { sectionOfSlot } from './preview-sync.js';
import { bridge } from './preview.js';
import { resolveDesign, cleanDesign } from '../core/mix-rules.js';
import { faithCard, suitsFaith, pickDesignDialog } from './faith-ui.js';
import { intlMe, fitsMarket } from './markets.js';

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const full = (hex) => (hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex).toLowerCase();

/** Themes this person may choose from: allowed by the planner and made for the couple's community (any: all communities). */
export function allowedThemes(ctx, { any = false } = {}) {
  const ready = ctx.meta.themes.filter((t) => t.ready !== false);
  const p = ctx.perms.themes;
  let mine = p === 'all' || !Array.isArray(p) ? ready : ready.filter((t) => p.includes(t.slug) || t.slug === ctx.m.data.theme);
  // International customers see the International designs (market 'intl' or 'both') first, in the same order otherwise
  if (intlMe(ctx.me)) mine = [...mine.filter((t) => fitsMarket(t.market, 'intl')), ...mine.filter((t) => !fitsMarket(t.market, 'intl'))];
  return any ? mine : mine.filter((t) => t.slug === ctx.m.data.theme || suitsFaith(ctx, t));
}

export const themeThumb = (t, cls = '', src = t.thumb) => (src
  ? h('img', { src, alt: '', loading: 'lazy', decoding: 'async', class: cls })
  : h('span.thumb-ph', { class: cls }, h('span', t.name)));

// ── The mix: which gate and first screen go with which design (rules shared with the page and the server) ──

/** A theme's `parts` as the server sanitised them (/api/meta), or null. */
const partsOf = (ctx) => (slug) => ctx.meta.themes.find((t) => t.slug === slug)?.parts || null;
const themeOf = (ctx, slug) => ctx.meta.themes.find((t) => t.slug === slug) || { slug, name: slug };

/**
 * Designs that are themselves a fixed mix (docs/MIX.md §6.1). Rajdwar is Mangal's page with Mahal's gate: it takes no
 * other gate or first screen itself, so its pickers are Mangal's, with Mahal's gate chosen. Choosing anything else
 * moves the invitation to Mangal with that choice and carries the couple's Rajdwar words, pictures and colours over.
 */
const ALIASES = {
  rajdwar: { host: 'mangal', design: { gate: 'mahal' }, colors: { '--rj-red': '--mg-red', '--rj-gold': '--mg-gold-lt' } },
};
/** Notes shown once after such a switch, per invitation. */
const switched = new Map();

/** The design `want` keeps on `host`: only what that page can show (null = all its own). */
export const designFor = (ctx, want, host) => cleanDesign(want, host, partsOf(ctx));

/** May this person pick `slug` (allowed by the planner and made for the couple's community)? */
const mayUse = (ctx, slug) => allowedThemes(ctx).some((t) => t.slug === slug);

/**
 * Leaves an alias design (Rajdwar) for its host page (Mangal) with `design`. The couple's words and pictures go to the
 * host where the ids are the same (Rajdwar's body is Mangal's), and to the chosen gate and first screen where their
 * manifests use those ids (Rajdwar's gate words and Ganesh to Mahal's gate). Colours follow the alias' map. Nothing is
 * deleted: Rajdwar keeps its own copy in case they come back.
 */
async function leaveAlias(ctx, alias, design) {
  const m = ctx.m;
  const from = m.data.theme;
  const own = m.data.themeContent?.[from] || {};
  const cols = m.data.themeColors?.[from] || {};
  const parts = [...new Set([design?.gate, design?.hero].filter(Boolean))];
  const [hostMan, ...partMans] = await Promise.all([loadManifest(alias.host), ...parts.map((p) => loadManifest(p))]);
  const P = partsOf(ctx);
  const targets = [
    { theme: alias.host, man: hostMan, has: () => true },
    ...parts.map((slug, i) => {
      const u = P(slug) || {};
      const uses = new Set([design.gate === slug ? u.gateUses : null, design.hero === slug ? u.heroUses : null]
        .filter(Boolean).flatMap((x) => [...(x.texts || []), ...(x.images || []), ...(x.colors || [])]));
      return { theme: slug, man: partMans[i], has: (id) => uses.has(id) };
    }),
  ];
  const copy = (v) => JSON.parse(JSON.stringify(v));
  for (const { theme, man, has } of targets) {
    if (!man) continue;
    for (const kind of ['texts', 'images']) {
      for (const [id, v] of Object.entries(own[kind] || {})) {
        if (v == null || !Object.hasOwn(man[kind] || {}, id) || !has(id)) continue;
        m.set(['themeContent', theme, kind, id], copy(v));
      }
    }
    for (const [token, v] of Object.entries(cols)) {
      const to = alias.colors?.[token];
      if (to && v && Object.hasOwn(man.colors || {}, to) && has(to)) m.set(['themeColors', theme, to], v);
    }
  }
  m.set(['theme'], alias.host);
  setDesign(ctx, design);
}

function setDesign(ctx, next) {
  const now = JSON.stringify(ctx.m.data.design || null);
  if (JSON.stringify(next || null) === now) return false;
  if (next) ctx.m.set(['design'], next);
  else { delete ctx.m.data.design; ctx.m.touch(['design']); }
  return true;
}

/** Full-screen live demo of `theme` filled with this couple's unsaved details. Resolves true to choose it. */
export function themeDemo(ctx, t, { choose = true } = {}) {
  return new Promise((resolve) => {
    let yes = false;
    const frame = h('iframe.demo__frame', { title: `${t.name} with your details`, src: `/${t.slug}/?id=${encodeURIComponent(ctx.slug)}&preview=1` });
    const off = bridge(frame, () => {
      const design = designFor(ctx, ctx.m.data.design, t.slug);
      const data = { ...ctx.m.data, theme: t.slug };
      if (design) data.design = design; else delete data.design;
      return data;
    });
    const d = openDialog({
      title: t.name, cls: 'dialog--demo', wide: true,
      body: h('div.demo', h('p.demo__concept', t.concept || ''), h('div.demo__stage', frame)),
      actions: [
        h('button.btn', { type: 'button', onclick: () => d.close() }, choose ? 'Back' : 'Close'),
        choose ? h('button.btn.btn--primary', { type: 'button', onclick: () => { yes = true; d.close(); } }, icon('check', 16), `Use ${t.name}`) : null,
      ].filter(Boolean),
      onClose: () => { off(); ctx.preview?.pause?.(false); resolve(yes); },
    });
    ctx.preview?.pause?.(true); // one live page at a time: the preview behind the demo holds still
  });
}

async function pickTheme(ctx, redraw, { only = null, title = 'Choose a design', text = 'Tap a design to see it with your own names, dates and photos. Nothing changes until you choose it.' } = {}) {
  const cur = ctx.m.data.theme;
  const list = allowedThemes(ctx).filter((t) => !only || t.slug === cur || only(t));
  let chosen = null;
  const grid = h('ul.tgrid', list.map((t) => h('li', h('button.tcard', { type: 'button', class: t.slug === cur ? 'is-on' : '', 'aria-label': `${t.name}${t.slug === cur ? ' (current)' : ''}: see it with your details`, onclick: async () => {
    if (t.slug === cur) return;
    if (await themeDemo(ctx, t)) { chosen = t; d.close(); }
  } },
  h('span.tcard__img', themeThumb(t), t.slug === cur ? h('span.tcard__on', icon('check', 14), 'Current') : h('span.tcard__view', icon('eye', 15), 'See it')),
  h('span.tcard__name', t.name), t.concept ? h('span.tcard__concept', t.concept) : null))));
  const d = openDialog({
    title, wide: true,
    body: [h('p.dialog__text', text), grid],
    onClose: async () => {
      if (!chosen) return;
      const ok = await confirmDialog({ title: `Switch to ${chosen.name}?`, message: 'Your names, dates, ceremonies, photos and music move with you. Words you changed only for the old design are kept in case you switch back.', confirm: `Use ${chosen.name}` });
      if (!ok) return;
      // The gate and first screen stay if the new design can take them (and are dropped if they are its own).
      const design = designFor(ctx, ctx.m.data.design, chosen.slug);
      const alias = ALIASES[cur];
      if (alias?.host === chosen.slug) await leaveAlias(ctx, alias, design); // Rajdwar to Mangal: its words come along
      else {
        ctx.m.set(['theme'], chosen.slug);
        setDesign(ctx, design);
      }
      ctx.preview?.reload();
      redraw();
    },
  });
}

/**
 * What each picker offers on this design. ok: [{ t, pair? }]; no: [{ t, why }] (shown with the reason);
 * closed: the design cannot take another one at all (its reason); soon: designs not ready for mixing yet.
 */
function choicesOf(ctx, kind, r, host = ctx.m.data.theme) {
  const P = partsOf(ctx);
  const H = P(host) || {};
  const hostName = themeOf(ctx, host).name;
  const out = { ok: [], no: [], closed: '', soon: 0 };
  const list = allowedThemes(ctx).filter((t) => t.slug !== host && t.slug !== ctx.m.data.theme);
  if (kind === 'gate') {
    if (!H.hostGate) { out.closed = H.why?.hostGate || `${hostName}’s own opening can’t be swapped yet.`; return out; }
    for (const t of list) {
      const G = t.parts;
      if (G?.gate === true) out.ok.push({ t });
      else if (G?.gate === 'pair' && G.hero) {
        if (H.hostHero) out.ok.push({ t, pair: true });
        else out.no.push({ t, why: `Its gate comes with its own first screen, and ${hostName} keeps its own first screen.` });
      } else if (G?.why?.gate) out.no.push({ t, why: G.why.gate });
      else out.soon += 1;
    }
  } else {
    if (!H.hostHero) { out.closed = H.why?.hostHero || `${hostName} keeps its own first screen.`; return out; }
    for (const t of list) {
      const G = t.parts;
      if (G?.hero) {
        const test = resolveDesign({ gate: r.gate, hero: t.slug }, host, P);
        if (test.hero === t.slug) out.ok.push({ t });
        else out.no.push({ t, why: `${hostName}’s own gate opens into its own first screen. Choose another gate first.` });
      } else if (G?.why?.hero) out.no.push({ t, why: G.why.hero });
      else out.soon += 1;
    }
  }
  return out;
}

function option({ img, name, sub, on, disabled, onclick, label }) {
  return h('li', h('button.mixopt', { type: 'button', 'aria-pressed': String(Boolean(on)), disabled: disabled || null, 'aria-label': label, onclick },
    h('span.mixopt__img', img, on ? h('span.mixopt__on', { 'aria-hidden': 'true' }, icon('check', 13)) : null),
    h('span.mixopt__name', name),
    sub ? h('span.mixopt__sub', sub) : null));
}

const stillOf = (t, kind) => (kind === 'gate' ? t.stills?.gate : t.stills?.hero) || t.thumb;

/** One picker: "Its own" first, then the other themes' gates (or first screens). A strip that scrolls sideways on phones. */
function picker(ctx, kind, r, redraw, alias = null) {
  const hostSlug = alias?.host || ctx.m.data.theme;
  const host = themeOf(ctx, hostSlug);
  const cur = kind === 'gate' ? r.gate : r.hero;
  const curT = cur ? themeOf(ctx, cur) : null;
  const pairGate = r.gate && partsOf(ctx)(r.gate)?.gate === 'pair' ? themeOf(ctx, r.gate) : null;
  const what = kind === 'gate' ? 'gate' : 'first screen';
  // An alias (Rajdwar) can only switch to its host when the planner allows the host design.
  const locked = alias && !mayUse(ctx, alias.host);
  const c = locked ? { ok: [], no: [], closed: '', soon: 0 } : choicesOf(ctx, kind, r, hostSlug);

  const choose = async (slug, pair) => {
    const d = alias ? alias.design : (ctx.m.data.design || {});
    let want;
    if (kind === 'gate') {
      want = pair ? { gate: slug, hero: slug } : { gate: slug || undefined, hero: d.hero };
      // Leaving an opening scene: its first screen goes with it.
      if (!pair && pairGate && d.hero === pairGate.slug) want.hero = undefined;
    } else {
      want = { gate: d.gate, hero: slug || undefined };
      // The alias' own gate stays only if this person may use that design (the server checks it too).
      if (alias && want.gate && !mayUse(ctx, want.gate)) want.gate = undefined;
    }
    const next = designFor(ctx, want, hostSlug);
    if (want.hero && !next?.hero) toast(`The first screen is ${host.name}’s own again: its own gate opens into it.`);
    if (alias) {
      if (JSON.stringify(next || null) === JSON.stringify(alias.design)) return; // what Rajdwar already shows
      const from = themeOf(ctx, ctx.m.data.theme).name;
      await leaveAlias(ctx, alias, next);
      switched.set(ctx.slug, `Switched to ${host.name} with your chosen ${what}; it looks the same inside.`);
      ctx.preview?.reload();
      toast(`${from} is now ${host.name} with your chosen ${what}.`);
      redraw();
      return;
    }
    if (setDesign(ctx, next)) redraw();
  };

  const notes = [];
  let opts = [];
  if (kind === 'hero' && pairGate) {
    opts = [option({ img: themeThumb(pairGate, '', stillOf(pairGate, 'hero')), name: pairGate.name, sub: 'Comes with the gate', on: true, disabled: true, label: `${pairGate.name}: comes with its opening scene` })];
    notes.push(h('p.hint.mixnote', icon('info', 14), h('span', `${pairGate.name}’s gate opens into its own first screen. Choose another gate to change it.`)));
  } else {
    opts.push(option({ img: themeThumb(host, '', stillOf(host, kind)), name: `${host.name}’s own`, sub: alias ? (cur ? `Switches to ${host.name}` : 'As now') : 'Same as the design', on: !cur, disabled: locked, label: `${host.name}’s own ${what}`, onclick: () => choose(null) }));
    const shown = new Set();
    for (const { t, pair } of c.ok) {
      shown.add(t.slug);
      opts.push(option({ img: themeThumb(t, '', stillOf(t, kind)), name: t.name, sub: pair ? 'With its first screen' : alias && cur === t.slug ? 'As now' : null, on: cur === t.slug, label: `${t.name}’s ${pair ? 'opening scene (gate and first screen)' : what}`, onclick: () => choose(t.slug, pair) }));
    }
    // Chosen by the planner from a design not on this person's list: still shown as chosen.
    if (cur && !shown.has(cur)) opts.push(option({ img: themeThumb(curT, '', stillOf(curT, kind)), name: curT.name, sub: alias ? `In ${themeOf(ctx, ctx.m.data.theme).name}` : null, on: true, label: curT.name, onclick: () => {} }));
    if (locked) {
      const me = themeOf(ctx, ctx.m.data.theme).name;
      notes.push(h('p.hint.mixnote', icon('lock', 14), h('span', `${me} is ${host.name}’s page with ${themeOf(ctx, alias.design.gate).name}’s gate. To change its ${what}, ask your planner to allow the ${host.name} design.`)));
    } else if (c.closed) {
      // Never a lone "same as the design" without a way forward: one click shows the designs that can.
      const can = (t) => (kind === 'gate' ? t.parts?.hostGate : t.parts?.hostHero);
      const others = allowedThemes(ctx).filter((t) => t.slug !== hostSlug && can(t));
      notes.push(h('div.mixnote.mixnote--act', h('p.hint', icon('info', 14), h('span', c.closed)),
        ctx.perms.canChangeTheme && others.length
          ? h('button.btn.btn--sm', { type: 'button', onclick: () => pickTheme(ctx, redraw, { only: can, title: `Designs that can change their ${what}`, text: `These designs can take another ${what}. Tap one to see it with your details; then pick the ${what} here.` }) }, icon('palette', 15), `Designs that can change their ${what}`)
          : h('p.hint', h('span', 'Ask your planner if you would like another design.'))));
    } else if (!c.ok.length && !pairGate) {
      const all = allowedThemes(ctx, { any: true }).length > allowedThemes(ctx).length;
      notes.push(h('p.hint.mixnote', icon('info', 14), h('span', all
        ? `The other ${what}s are not made for your community yet, so ${host.name}’s own is the one for now.`
        : `Your planner has not opened other designs for this invitation. Ask them if you would like another ${what}.`)));
    }
  }
  const why = c.no.length || c.soon ? h('details.mixwhy',
    h('summary', icon('info', 14), c.no.length ? `Why some designs aren’t here (${c.no.length + c.soon})` : `More ${what}s are on the way`),
    h('ul.mixwhy__list',
      c.no.map(({ t, why: w }) => h('li', h('b', t.name), h('span', w))),
      c.soon ? h('li', h('b', `${c.soon} more design${c.soon === 1 ? '' : 's'}`), h('span', `Being prepared so their ${what} can go on other designs.`)) : null)) : null;
  return [h('ul.mixopts', { role: 'list', 'aria-label': kind === 'gate' ? 'Gate' : 'First screen after the gate', 'data-kind': kind }, opts), ...notes, why];
}

const step = (n, title, help, ...body) => h('div.mixrow',
  h('div.mixrow__head', h('span.mixrow__n', { 'aria-hidden': 'true' }, n), h('div', h('h3.mixrow__title', title), h('p.mixrow__help', help))),
  h('div.mixrow__body', ...body));

/** What guests see now, when the couple may not change it: the gate, the first screen and the design, with a note. */
function lockedCard(ctx, r, alias = null) {
  const host = themeOf(ctx, ctx.m.data.theme);
  const base = alias ? themeOf(ctx, alias.host) : host;
  const gateT = r.gate ? themeOf(ctx, r.gate) : base;
  const heroT = r.hero ? themeOf(ctx, r.hero) : base;
  const tile = (kind, t, label, img) => h('li.mixsum__item',
    h('span.mixsum__img', img),
    h('span.mixsum__k', label),
    h('b.mixsum__v', t === host && kind !== 'design' ? `${host.name}’s own` : t.name));
  return h('section.card.mixcard.is-locked', { 'aria-label': 'Your opening' },
    h('header.card__head', h('h2.card__title', 'Your opening'), h('p.card__help', 'What guests see first. The words, pictures and colours below are yours to change.')),
    h('ul.mixsum', { role: 'list' },
      tile('gate', gateT, 'Gate', themeThumb(gateT, '', stillOf(gateT, 'gate'))),
      tile('hero', heroT, 'First screen', themeThumb(heroT, '', stillOf(heroT, 'hero'))),
      tile('design', host, 'Design', themeThumb(host))),
    h('p.mixlock', icon('lock', 15), h('span', h('b', 'Set by your planner. '), 'Ask your planner to change this.')));
}

function mixCard(ctx, r, redraw, alias = null) {
  if (!ctx.perms.canChangeTheme) return lockedCard(ctx, r, alias);
  const host = themeOf(ctx, ctx.m.data.theme);
  const list = allowedThemes(ctx);
  const note = switched.get(ctx.slug);
  return h('section.card.mixcard', { 'aria-label': 'Your opening' },
    h('header.card__head', h('h2.card__title', 'Your opening'), h('p.card__help', 'Pick the gate guests tap and the first screen they see. The preview shows your choice straight away.')),
    note ? h('p.mixdone', { role: 'status' }, icon('check', 14), h('span', note)) : null,
    step('1', 'Gate', alias && mayUse(ctx, alias.host)
      ? `What guests tap to open the invitation. ${host.name} uses ${themeOf(ctx, alias.design.gate).name}’s gate; another one moves you to ${themeOf(ctx, alias.host).name}, which looks the same inside.`
      : 'What guests tap to open the invitation.', ...picker(ctx, 'gate', r, redraw, alias)),
    step('2', 'First screen', 'What they see as the gate opens.', ...picker(ctx, 'hero', r, redraw, alias)),
    step('3', 'Design', 'Everything after the first screen.',
      h('div.mixdesign',
        h('div.mixdesign__thumb', themeThumb(host)),
        h('div.mixdesign__text',
          h('b.mixdesign__name', host.name),
          host.concept ? h('span.mixdesign__concept', host.concept) : null,
          alias ? h('span.mixdesign__concept', `${host.name} is ${themeOf(ctx, alias.host).name}’s page with ${themeOf(ctx, alias.design.gate).name}’s gate.`) : null,
          list.length > 1 ? h('button.btn.btn--sm', { type: 'button', onclick: () => pickTheme(ctx, redraw) }, icon('palette', 15), 'Change design') : null))));
}

/** Brings the chosen tile of a sideways strip into view, without moving the page. */
function centreChosen(ul) {
  const on = ul.querySelector('[aria-pressed="true"]')?.parentElement;
  if (!on || ul.scrollWidth <= ul.clientWidth) return;
  ul.scrollLeft = Math.max(0, on.offsetLeft - (ul.clientWidth - on.offsetWidth) / 2);
}

// ── Colours ───────────────────────────────────────────────────────────────

/** Colour rows for `theme` (themeColors[theme]); `spec` = the tokens to show (a part shows only those it uses). */
function colorRows(ctx, theme, spec) {
  if (!ctx.perms.canChangeColors) {
    return [h('div.swatches', Object.entries(spec).map(([, c]) => h('span.swatch', { title: c.label }, h('span.swatch__chip', { style: { background: c.default } }), h('span', c.label)))),
      h('p.hint', icon('lock', 14), ' Your planner keeps the colours as designed.')];
  }
  const path = (name) => ['themeColors', theme, name];
  const root = h('div.colorlist');
  const draw = () => {
    clear(root);
    const own = ctx.m.get(['themeColors', theme]) || {};
    for (const [name, c] of Object.entries(spec)) {
      const value = HEX.test(own[name] || '') ? full(own[name]) : full(c.default || '#000000');
      const id = `col-${theme}-${name.replace(/[^a-z0-9]/gi, '')}`;
      const text = h('input.input.input--hex', { id: `${id}-hex`, value, maxlength: 7, spellcheck: 'false', 'aria-label': `${c.label}, hex code`, onchange: (e) => {
        const v = e.target.value.trim();
        if (!HEX.test(v)) { e.target.value = value; return; }
        ctx.m.set(path(name), full(v));
        draw();
      } });
      const pick = h('input.colorpick', { type: 'color', id, value, oninput: (e) => { text.value = e.target.value; ctx.m.set(path(name), e.target.value); }, onchange: () => draw() });
      const changed = Boolean(own[name]);
      root.append(h('div.colorrow',
        h('label.colorrow__chip', { for: id, style: { background: value } }, pick),
        h('div.colorrow__text', h('label.colorrow__label', { for: id }, c.label), c.note ? h('span.colorrow__note', c.note) : null),
        text,
        changed ? h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: () => { delete ctx.m.get(['themeColors', theme])[name]; ctx.m.touch(['themeColors', theme]); draw(); } }, 'Reset') : h('span.colorrow__orig', 'Original')));
    }
    const mine = Object.keys(ctx.m.get(['themeColors', theme]) || {}).filter((k) => k in spec);
    if (mine.length) {
      root.append(h('button.link', { type: 'button', onclick: () => {
        const bag = ctx.m.get(['themeColors', theme]) || {};
        for (const k of mine) delete bag[k];
        ctx.m.touch(['themeColors', theme]);
        draw();
      } }, icon('refresh', 13), 'Reset these colours'));
    }
  };
  draw();
  return [root];
}

function colorsCard(ctx, man, help) {
  const spec = man?.colors && Object.keys(man.colors).length ? man.colors : null;
  if (!spec) return card('Colours', null, h('p.muted', 'This design’s colours are fixed for now.'));
  return card('Colours', help, ...colorRows(ctx, ctx.m.data.theme, spec));
}

// ── A borrowed gate or first screen: its own words, pictures and colours ──────────────────────────

function partCard(ctx, slug, kinds, man, all) {
  const t = themeOf(ctx, slug);
  const P = partsOf(ctx)(slug) || {};
  const uses = { texts: new Set(), images: new Set(), colors: new Set() };
  for (const k of kinds) for (const x of ['texts', 'images', 'colors']) (P[`${k}Uses`]?.[x] || []).forEach((id) => uses[x].add(id));
  const title = kinds.length > 1 ? `Gate and first screen · ${t.name}` : kinds[0] === 'gate' ? `Gate · ${t.name}` : `First screen · ${t.name}`;
  const box = h('section.card.partcard', { 'data-mx-theme': slug, ...(kinds.length === 1 ? { 'data-mx-part': kinds[0] } : {}) },
    h('header.card__head',
      h('p.partcard__tag', h('span.partcard__thumb', themeThumb(t, '', (kinds[0] === 'gate' ? t.stills?.gate : t.stills?.hero) || t.thumb)), `From ${t.name}`),
      h('h2.card__title', title),
      h('p.card__help', `Its own words, pictures and colours. They are kept for ${t.name}, so your other choices stay as they are.`)));
  if (!man) { box.append(h('p.muted', `${t.name} is still being finished.`)); return box; }
  const tools = slotTools(ctx, { theme: slug, section: kinds.length === 1 ? kinds[0] : null });
  const got = tools.render(man, all, (id) => uses.texts.has(id) || uses.images.has(id));
  const colors = Object.fromEntries(Object.entries(man.colors || {}).filter(([k]) => uses.colors.has(k)));
  if (got.texts) box.append(h('div.partcard__sec', h('h3.subhead', 'Words'), got.texts));
  if (got.images) box.append(h('div.partcard__sec', h('h3.subhead', 'Pictures'), got.images));
  if (Object.keys(colors).length) box.append(h('div.partcard__sec', h('h3.subhead', 'Colours'), ...colorRows(ctx, slug, colors)));
  if (!got.count && !Object.keys(colors).length) box.append(h('p.muted', 'Nothing to change here: it uses your names and date.'));
  return box;
}

/** Which of the design's own opening words and pictures are on the page with this gate and first screen. */
function ownOpening(hostParts, r) {
  const gateOwn = !r.gate;
  const heroOwn = !r.hero;
  const set = (k) => new Set([...(hostParts?.[k]?.texts || []), ...(hostParts?.[k]?.images || [])]);
  const g = set('gateUses');
  const hh = set('heroUses');
  const inGate = (id) => (g.size ? g.has(id) : sectionOfSlot(id) === 'gate');
  const inHero = (id) => (hh.size ? hh.has(id) : sectionOfSlot(id) !== 'gate');
  return (id) => {
    if (!OPENING_RE.test(id)) return false;
    if (gateOwn && heroOwn) return true;
    return (gateOwn && inGate(id)) || (heroOwn && inHero(id)) || (!inGate(id) && !inHero(id));
  };
}

export function openingModule(ctx) {
  // Two parts that update on their own: the choices (strips keep their sideways scroll) and the words, pictures and
  // colours below (redrawn when the choice changes, holding their height meanwhile so nothing jumps).
  const top = h('div.stack');
  const below = h('div.stack', h('section.card', skeleton(4)));
  const root = h('div.stack', top, below);
  let run = 0;
  const draw = async () => {
    const me = ++run;
    const theme = ctx.m.data.theme;
    const alias = ALIASES[theme] && ctx.meta.themes.some((t) => t.slug === ALIASES[theme].host) ? ALIASES[theme] : null;
    const r = resolveDesign(ctx.m.data.design, theme, partsOf(ctx));
    const shownR = alias ? resolveDesign(alias.design, alias.host, partsOf(ctx)) : r;
    const scrolls = new Map([...top.querySelectorAll('.mixopts')].map((ul) => [ul.dataset.kind, ul.scrollLeft]));
    fill(top, mixCard(ctx, shownR, draw, alias), faithCard(ctx, { themes: () => allowedThemes(ctx, { any: true }), pickDesign: (list, text) => pickDesignDialog(ctx, list, text, (t) => themeThumb(t)), redraw: draw }));
    requestAnimationFrame(() => {
      for (const ul of top.querySelectorAll('.mixopts')) {
        if (scrolls.has(ul.dataset.kind)) ul.scrollLeft = scrolls.get(ul.dataset.kind);
        else centreChosen(ul);
      }
    });
    if (below.offsetHeight) below.style.minHeight = `${below.offsetHeight}px`;
    const borrowed = new Map(); // slug -> ['gate', 'hero']
    if (r.gate) borrowed.set(r.gate, ['gate']);
    if (r.hero) borrowed.set(r.hero, [...(borrowed.get(r.hero) || []), 'hero']);
    const [all, man, ...parts] = await Promise.all([loadAll(ctx.meta.themes), loadManifest(theme), ...[...borrowed.keys()].map((s) => loadManifest(s))]);
    if (me !== run) return;
    const tools = slotTools(ctx);
    const out = [];
    const partCards = [...borrowed.entries()].map(([slug, kinds], i) => partCard(ctx, slug, kinds, parts[i], all));
    if (!man) {
      out.push(...partCards, h('section.card', emptyState('door', 'Nothing to change here yet', `${ctx.session.themeName()} is still being finished. Its opening words will appear here soon.`)));
    } else {
      const shows = ownOpening(partsOf(ctx)(theme), r);
      const open = tools.render(man, all, shows);
      const rest = tools.render(man, all, (id) => !OPENING_RE.test(id));
      const own = r.gate && r.hero ? null : r.gate ? 'first screen' : r.hero ? 'gate' : null;
      out.push(
        open.texts ? card(own ? `Words on ${themeOf(ctx, theme).name}’s ${own}` : 'First words', 'Leave a line empty to keep the design’s own words (shown in grey).', open.texts) : null,
        open.images ? card(own ? `Pictures on ${themeOf(ctx, theme).name}’s ${own}` : 'First pictures', 'Tap a picture to change it.', open.images) : null,
        ...partCards,
        colorsCard(ctx, man, borrowed.size ? `The main colours of ${themeOf(ctx, theme).name}.` : 'The main colours of the opening. The preview changes as you pick.'),
        rest.count ? h('details.fold',
          h('summary.fold__sum', h('span', h('b', 'More words and pictures'), h('small', `${rest.count} more, further down the invitation`)), icon('down', 18)),
          h('div.fold__body', rest.images ? h('div.fold__part', h('h3.subhead', 'Pictures'), rest.images) : null, rest.texts ? h('div.fold__part', h('h3.subhead', 'Words'), rest.texts) : null)) : null);
    }
    fill(below, ...out.filter(Boolean));
    requestAnimationFrame(() => { below.style.minHeight = ''; });
  };
  draw();
  return root;
}
