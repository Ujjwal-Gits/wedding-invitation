// The chosen theme's own pictures and words (its slots.js manifest), as simple cards.
// Data (THEME-CONTRACT §9–10): items marked `shared` save to data.content (they follow the couple to
// other themes); the rest to data.themeContent[theme]. Couple photos join couple.portraits.
import { h, icon, clear, append, toast, openDialog, fill, toggle } from './dom.js';
import { biField, uploadImage, checkImageFile, pickLibrary } from './fields.js';
import { photoUrl } from '../photos.js';
import { sharedKey, sharedTextMax } from './slotdata.js';
import { sectionOfSlot } from './preview-sync.js';

const isPortraitRef = (r) => r && typeof r === 'object' && !Array.isArray(r) && 'portrait' in r;
const COUPLE_KINDS = new Set(['couple', 'bride', 'groom']);

/** Ids that belong to the opening (gate / doors / hero). */
export const OPENING_RE = /^(gate|hero|intro|cover|threshold|welcome|door|doors|window|lattice|band|seal|curtain|torana|opening|ganesh|envelope|title)\b/;

/**
 * opts.theme: another theme's words and pictures (a borrowed gate or first screen, docs/MIX.md). They are stored in
 * themeContent[<that theme>]; every card and row carries data-theme so click-to-edit finds the right one.
 */
export function slotTools(ctx, { theme: forTheme, section: forSection } = {}) {
  const m = ctx.m;
  const theme = forTheme || m.get(['theme']);
  const themeBase = ['themeContent', theme];
  const portraits = () => m.get(['couple', 'portraits']) || [];
  const portrait = (n) => { const l = portraits(); return l[n]?.photo ?? l[n % Math.max(l.length, 1)]?.photo ?? null; };
  const bag = (path) => { if (!m.get(path)) m.set(path, {}); return m.get(path); };
  const where = (kind, id, spec) => { const key = sharedKey(spec, kind); return key ? ['content', kind, key] : [...themeBase, kind, id]; };
  const valueOf = (kind, id, spec) => m.get(where(kind, id, spec));
  const setValue = (kind, id, spec, v) => {
    const p = where(kind, id, spec);
    const b = bag(p.slice(0, -1));
    if (v == null) delete b[p.at(-1)]; else b[p.at(-1)] = v;
    m.touch(p);
  };
  // A theme-only copy of a shared item would hide the shared one: move it across once.
  const migrate = (kind, id, spec) => {
    const key = sharedKey(spec, kind);
    const own = m.get([...themeBase, kind, id]);
    if (!key || own == null) return;
    if (m.get(['content', kind, key]) == null) bag(['content', kind])[key] = own;
    delete m.get([...themeBase, kind])[id];
    m.touch(['content', kind, key]);
  };
  /** Same rules as useSlots() in src/core/slots.js, so the card shows what guests will see. */
  const effective = (spec, o) => {
    if (o) return isPortraitRef(o) ? portrait(o.portrait) : o;
    if (spec.kind === 'bride' && m.get(['couple', 'bride', 'photo'])) return m.get(['couple', 'bride', 'photo']);
    if (spec.kind === 'groom' && m.get(['couple', 'groom', 'photo'])) return m.get(['couple', 'groom', 'photo']);
    const d = spec.default;
    if (isPortraitRef(d)) return portrait(d.portrait);
    if (d) return d;
    if (spec.kind === 'bride') return m.get(['couple', 'bride', 'photo']) ?? portrait(0);
    if (spec.kind === 'groom') return m.get(['couple', 'groom', 'photo']) ?? portrait(0);
    return spec.kind === 'couple' ? portrait(0) : null;
  };

  function photoCard(id, spec, redraw) {
    const o = valueOf('images', id, spec);
    const ref = effective(spec, o);
    return h('button.scard', { type: 'button', 'data-item': id, 'data-theme': theme, onclick: () => photoDialog(id, spec, redraw), 'aria-label': `${spec.label}: change the photo` },
      h('span.scard__img', ref ? h('img', { src: photoUrl(ref, 'sm'), alt: '', loading: 'lazy', decoding: 'async' }) : h('span.scard__none', icon('image', 22)),
        h('span.scard__hover', icon('upload', 15), 'Change')),
      h('span.scard__label', spec.label),
      o ? h('span.scard__badge', 'Yours') : null);
  }

  function photoDialog(id, spec, redraw) {
    const isCouple = COUPLE_KINDS.has(spec.kind);
    const o = valueOf('images', id, spec);
    const ref = effective(spec, o);
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
    const bar = h('span.progress__bar');
    const progress = h('span.progress', { hidden: true }, bar);
    const done = () => {
      d.close();
      redraw();
      ctx.preview?.pointImage(effective(spec, valueOf('images', id, spec)), forSection || sectionOfSlot(id)); // show this photo in the preview
    };
    const useUpload = async (f) => {
      if (!f || !checkImageFile(f)) return;
      progress.hidden = false;
      drop.classList.add('is-busy');
      const photo = await uploadImage(ctx, f, bar);
      progress.hidden = true;
      drop.classList.remove('is-busy');
      if (!photo) return;
      const obj = { lg: photo.lg, sm: photo.sm, focal: photo.focal, w: photo.w, h: photo.h };
      if (isCouple) {
        if (!m.get(['couple', 'portraits'])) m.set(['couple', 'portraits'], []);
        const list = m.get(['couple', 'portraits']);
        list.push({ photo: obj, alt: '' });
        m.touch(['couple', 'portraits']);
        setValue('images', id, spec, { portrait: list.length - 1 });
        toast('Photo added to your couple photos', 'success');
      } else {
        setValue('images', id, spec, obj);
        toast('Photo changed', 'success');
      }
      done();
    };
    file.onchange = () => { useUpload(file.files[0]); file.value = ''; };
    const drop = h('button.droparea.droparea--sm', { type: 'button', onclick: () => file.click(),
      ondragover: (e) => { e.preventDefault(); drop.classList.add('is-drop'); }, ondragleave: () => drop.classList.remove('is-drop'),
      ondrop: (e) => { e.preventDefault(); drop.classList.remove('is-drop'); useUpload(e.dataTransfer.files[0]); } },
    h('span.droparea__icon', icon('upload', 20)), h('span.droparea__title', 'Upload a photo'), h('span.droparea__sub', 'or drop it here'), progress);
    const choices = isCouple && portraits().length
      ? h('div', h('p.label', 'Or use one of your couple photos'),
        h('ul.pick__grid', portraits().map((p, i) => h('li', h('button.pick__btn', {
          type: 'button', class: isPortraitRef(o) && o.portrait === i ? 'is-on' : '', 'aria-label': `Couple photo ${i + 1}`,
          onclick: () => { setValue('images', id, spec, { portrait: i }); done(); },
        }, h('img', { src: photoUrl(p.photo, 'sm'), alt: '', loading: 'lazy' }))))))
      : null;
    const d = openDialog({
      title: spec.label, wide: true,
      body: h('div.sdlg',
        h('div.sdlg__now', ref ? h('img', { src: photoUrl(ref, 'sm'), alt: '' }) : h('span.scard__none', icon('image', 28))),
        h('div.sdlg__side',
          spec.note ? h('p.hint', spec.note) : null,
          drop, file, choices,
          isCouple ? null : h('button.btn', { type: 'button', onclick: async () => { const s = await pickLibrary(ctx); if (s) { setValue('images', id, spec, s); done(); } } }, icon('image', 16), 'Choose from the photo library'),
          o ? h('button.link', { type: 'button', onclick: () => { setValue('images', id, spec, null); done(); } }, 'Use the theme’s original photo') : null)),
      actions: [h('button.btn', { type: 'button', onclick: () => done() }, 'Done')],
    });
  }

  /** Lines the theme lets the couple turn off ("type off" / "type - to remove"): a switch instead of a code word. */
  const OFF_WORD = /^\s*(-|–|none|off|no|hide)\s*$/i;
  const isHidden = (o) => Boolean(o && (o.en || o.ne) && (!o.en || OFF_WORD.test(o.en)) && (!o.ne || OFF_WORD.test(o.ne)));
  const switchOnly = (spec) => /type\s+[“"]?off[”"]?/i.test(spec.label) || spec.default?.en === 'on';
  const removable = (spec) => /type\s+-\s+to\s+remove/i.test(spec.label);
  const cleanLabel = (l) => l.replace(/\s*\(type[^)]*\)\s*$/i, '').trim();

  function switchRow(id, spec) {
    const box = h('div.trow', { 'data-item': id, 'data-theme': theme });
    const draw = () => {
      const shown = !isHidden(valueOf('texts', id, spec));
      fill(box, toggle({ label: cleanLabel(spec.label), hint: shown ? 'Shown on the invitation. Turn off to hide it.' : 'Hidden on the invitation.', checked: shown,
        onChange: (v) => { setValue('texts', id, spec, v ? null : { en: 'off', ne: 'off' }); draw(); box.querySelector('input')?.focus(); } }));
    };
    draw();
    return box;
  }

  function textRow(id, spec, all) {
    if (switchOnly(spec)) return switchRow(id, spec);
    const canHide = removable(spec);
    const key = sharedKey(spec, 'texts');
    const max = key ? Math.min(spec.max || 200, sharedTextMax(all, key, spec.max || 200)) : spec.max || 200;
    const box = h('div.trow', { 'data-item': id, 'data-theme': theme });
    const draw = () => {
      clear(box);
      const o = valueOf('texts', id, spec);
      if (canHide && isHidden(o)) {
        append(box, [h('p.label', cleanLabel(spec.label)),
          h('p.trow__off', h('span', 'Hidden on the invitation.'), h('button.link', { type: 'button', onclick: () => { setValue('texts', id, spec, null); draw(); } }, 'Show it again'))]);
        return;
      }
      const changed = o && (o.en || o.ne);
      append(box, [
        biField(m, where('texts', id, spec), { label: canHide ? cleanLabel(spec.label) : spec.label, max, multiline: spec.multiline, rows: 2, placeholderEn: spec.default?.en || '', placeholderNe: spec.default?.ne || '' }),
        canHide ? h('button.link.trow__reset', { type: 'button', onclick: () => { setValue('texts', id, spec, { en: '-', ne: '-' }); draw(); } }, icon('close', 13), 'Hide this line') : null,
        changed ? h('button.link.trow__reset', { type: 'button', onclick: () => { setValue('texts', id, spec, null); draw(); } }, icon('refresh', 13), 'Use the original words') : null]);
    };
    draw();
    // Show the reset link as soon as something is typed.
    box.addEventListener('input', () => { if (!box.querySelector('.trow__reset')) box.append(h('button.link.trow__reset', { type: 'button', onclick: () => { setValue('texts', id, spec, null); draw(); } }, icon('refresh', 13), 'Use the original words')); });
    return box;
  }

  /** Pictures and words of this theme matching `test(id)`. */
  function render(man, all, test = () => true) {
    const images = Object.entries(man.images || {}).filter(([id]) => test(id));
    const texts = Object.entries(man.texts || {}).filter(([id]) => test(id));
    images.forEach(([id, spec]) => migrate('images', id, spec));
    texts.forEach(([id, spec]) => migrate('texts', id, spec));
    const grid = h('div.sgrid');
    const drawPhotos = () => fill(grid, ...images.map(([id, spec]) => photoCard(id, spec, drawPhotos)));
    drawPhotos();
    return {
      images: images.length ? grid : null,
      texts: texts.length ? h('div.tlist', texts.map(([id, spec]) => textRow(id, spec, all))) : null,
      count: images.length + texts.length,
    };
  }

  return { render };
}
