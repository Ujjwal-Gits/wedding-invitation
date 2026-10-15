// Opening: the theme (if allowed), the opening's words and pictures, and its colours (if allowed).
import { h, icon, clear, card, openDialog, confirmDialog, skeleton, emptyState, fill } from './dom.js';
import { loadAll, loadManifest } from './slotdata.js';
import { slotTools, OPENING_RE } from './slots-ui.js';
import { bridge } from './preview.js';

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const full = (hex) => (hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex).toLowerCase();

/** Themes this person may choose from. */
export function allowedThemes(ctx) {
  const ready = ctx.meta.themes.filter((t) => t.ready !== false);
  const p = ctx.perms.themes;
  return p === 'all' || !Array.isArray(p) ? ready : ready.filter((t) => p.includes(t.slug) || t.slug === ctx.m.data.theme);
}

export const themeThumb = (t, cls = '') => (t.thumb
  ? h('img', { src: t.thumb, alt: '', loading: 'lazy', decoding: 'async', class: cls })
  : h('span.thumb-ph', { class: cls }, h('span', t.name)));

/** Full-screen live demo of `theme` filled with this couple's unsaved details. Resolves true to choose it. */
export function themeDemo(ctx, t, { choose = true } = {}) {
  return new Promise((resolve) => {
    let yes = false;
    const frame = h('iframe.demo__frame', { title: `${t.name} with your details`, src: `/${t.slug}/?id=${encodeURIComponent(ctx.slug)}&preview=1` });
    const off = bridge(frame, () => ({ ...ctx.m.data, theme: t.slug }));
    const d = openDialog({
      title: t.name, cls: 'dialog--demo', wide: true,
      body: h('div.demo', h('p.demo__concept', t.concept || ''), h('div.demo__stage', frame)),
      actions: [
        h('button.btn', { type: 'button', onclick: () => d.close() }, choose ? 'Back' : 'Close'),
        choose ? h('button.btn.btn--primary', { type: 'button', onclick: () => { yes = true; d.close(); } }, icon('check', 16), `Use ${t.name}`) : null,
      ].filter(Boolean),
      onClose: () => { off(); resolve(yes); },
    });
  });
}

function themeCard(ctx, redraw) {
  const t = ctx.meta.themes.find((x) => x.slug === ctx.m.data.theme) || { slug: ctx.m.data.theme, name: ctx.m.data.theme };
  const can = ctx.perms.canChangeTheme;
  const list = allowedThemes(ctx);
  return h('section.card.themecard',
    h('div.themecard__thumb', themeThumb(t)),
    h('div.themecard__body',
      h('p.eyebrow', 'Your design'),
      h('h2.themecard__name', t.name),
      t.concept ? h('p.themecard__concept', t.concept) : null,
      h('div.themecard__acts',
        can && list.length > 1 ? h('button.btn.btn--primary', { type: 'button', onclick: () => pickTheme(ctx, redraw) }, icon('palette', 16), 'Change the design') : null,
        !can ? h('p.hint.themecard__lock', icon('lock', 14), 'Your planner set the design. Ask them if you would like a different one.') : null)));
}

async function pickTheme(ctx, redraw) {
  const list = allowedThemes(ctx);
  const cur = ctx.m.data.theme;
  let chosen = null;
  const grid = h('ul.tgrid', list.map((t) => h('li', h('button.tcard', { type: 'button', class: t.slug === cur ? 'is-on' : '', 'aria-label': `${t.name}${t.slug === cur ? ' (current)' : ''}: see it with your details`, onclick: async () => {
    if (t.slug === cur) return;
    if (await themeDemo(ctx, t)) { chosen = t; d.close(); }
  } },
  h('span.tcard__img', themeThumb(t), t.slug === cur ? h('span.tcard__on', icon('check', 14), 'Current') : h('span.tcard__view', icon('eye', 15), 'See it')),
  h('span.tcard__name', t.name), t.concept ? h('span.tcard__concept', t.concept) : null))));
  const d = openDialog({
    title: 'Choose a design', wide: true,
    body: [h('p.dialog__text', 'Tap a design to see it with your own names, dates and photos. Nothing changes until you choose it.'), grid],
    onClose: async () => {
      if (!chosen) return;
      const ok = await confirmDialog({ title: `Switch to ${chosen.name}?`, message: 'Your names, dates, ceremonies, photos and music move with you. Words you changed only for the old design are kept in case you switch back.', confirm: `Use ${chosen.name}` });
      if (!ok) return;
      ctx.m.set(['theme'], chosen.slug);
      ctx.preview?.reload();
      redraw();
    },
  });
}

function colorsCard(ctx, man) {
  const theme = ctx.m.data.theme;
  const spec = man?.colors && Object.keys(man.colors).length ? man.colors : null;
  if (!spec) return card('Colours', null, h('p.muted', 'This design’s colours are fixed for now.'));
  if (!ctx.perms.canChangeColors) {
    return card('Colours', null, h('div.swatches', Object.entries(spec).map(([, c]) => h('span.swatch', { title: c.label }, h('span.swatch__chip', { style: { background: c.default } }), h('span', c.label)))),
      h('p.hint', icon('lock', 14), ' Your planner keeps the colours as designed.'));
  }
  const path = (name) => ['themeColors', theme, name];
  const root = h('div.colorlist');
  const draw = () => {
    clear(root);
    const own = ctx.m.get(['themeColors', theme]) || {};
    for (const [name, c] of Object.entries(spec)) {
      const value = HEX.test(own[name] || '') ? full(own[name]) : full(c.default || '#000000');
      const id = `col-${name.replace(/[^a-z0-9]/gi, '')}`;
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
    const any = Object.keys(ctx.m.get(['themeColors', theme]) || {}).length;
    if (any) root.append(h('button.link', { type: 'button', onclick: () => { ctx.m.set(['themeColors', theme], {}); draw(); } }, icon('refresh', 13), 'Reset all colours'));
  };
  draw();
  return card('Colours', 'The main colours of the opening. Changes show in the preview straight away.', root);
}

export function openingModule(ctx) {
  const root = h('div.stack');
  const draw = async () => {
    fill(root, themeCard(ctx, draw), h('section.card', skeleton(4)));
    const theme = ctx.m.data.theme;
    const [all, man] = await Promise.all([loadAll(ctx.meta.themes), loadManifest(theme)]);
    if (ctx.m.data.theme !== theme) return;
    const tools = slotTools(ctx);
    const parts = [themeCard(ctx, draw)];
    if (!man) {
      parts.push(h('section.card', emptyState('door', 'Nothing to change here yet', `${ctx.session.themeName()} is still being finished. Its opening words will appear here soon.`)));
    } else {
      const open = tools.render(man, all, (id) => OPENING_RE.test(id));
      const rest = tools.render(man, all, (id) => !OPENING_RE.test(id));
      parts.push(
        open.texts ? card('Opening words', 'What guests read first. Leave a line empty to keep the original (shown in grey).', open.texts) : null,
        open.images ? card('Opening pictures', 'Tap a picture to change it.', open.images) : null,
        colorsCard(ctx, man),
        rest.count ? h('details.fold',
          h('summary.fold__sum', h('span', h('b', 'Other words and pictures in this design'), h('small', `${rest.count} items, further down the invitation`)), icon('down', 18)),
          h('div.fold__body', rest.images ? h('div.fold__part', h('h3.subhead', 'Pictures'), rest.images) : null, rest.texts ? h('div.fold__part', h('h3.subhead', 'Words'), rest.texts) : null)) : null);
    }
    fill(root, ...parts.filter(Boolean));
  };
  draw();
  return root;
}
