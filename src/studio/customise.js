// Step 4 "Customise": the chosen theme's own photos and words as visual cards.
// Click a photo to replace it, click a line to edit it in place.
// Data (THEME-CONTRACT §9–10): items the theme marks `shared` save to data.content (they follow the couple
// to other themes); the rest to data.themeContent[theme]. Photos added for the couple join couple.portraits.
import { h, icon, clear, toast, openDialog } from './dom.js';
import { biField, textField, uploadImage, checkImageFile, pickLibrary } from './fields.js';
import { photoUrl } from '../photos.js';
import { loadAll, sharedKey, sharedTextMax } from './slotdata.js';

const isPortraitRef = (r) => r && typeof r === 'object' && !Array.isArray(r) && 'portrait' in r;
const COUPLE_KINDS = new Set(['couple', 'bride', 'groom']);

export function customiseStep(ctx) {
  const m = ctx.m;
  const theme = m.get(['theme']);
  const themeName = ctx.meta.themes.find((x) => x.slug === theme)?.name || theme;
  const root = h('div.custom', h('p.boot', 'Loading the theme…'));

  loadAll(ctx.meta.themes).then((all) => {
    const man = all[theme];
    if (!man) {
      clear(root).append(h('section.card', h('p.card__help', `${themeName} is still being finished. Its own photos and words will appear here soon; everything else already works.`)));
      return;
    }
    render(man, all);
  }).catch(() => clear(root).append(h('p.notice.notice--error', 'The theme could not be loaded. Reload the page to try again.')));

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

  // ── Photos
  function photoCard(id, spec, redraw) {
    const o = valueOf('images', id, spec);
    const ref = effective(spec, o);
    return h('button.pcard', { type: 'button', 'data-item': id, onclick: () => photoDialog(id, spec, redraw), 'aria-label': `${spec.label}: change photo` },
      h('span.pcard__img', ref ? h('img', { src: photoUrl(ref, 'sm'), alt: '', loading: 'lazy', decoding: 'async' }) : h('span.pcard__none', icon('image', 22)),
        h('span.pcard__hover', icon('upload', 16), 'Change')),
      h('span.pcard__label', spec.label),
      o ? h('span.pcard__badge', 'Changed') : null,
    );
  }

  function photoDialog(id, spec, redraw) {
    const isCouple = COUPLE_KINDS.has(spec.kind);
    const o = valueOf('images', id, spec);
    const ref = effective(spec, o);
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
    const bar = h('span.progress__bar');
    const progress = h('span.progress', { hidden: true }, bar);
    const done = () => { d.close(); redraw(); };
    const useUpload = async (f) => {
      if (!f || !checkImageFile(f)) return;
      progress.hidden = false;
      drop.classList.add('is-busy');
      const photo = await uploadImage(ctx, f, bar);
      progress.hidden = true;
      drop.classList.remove('is-busy');
      if (!photo) return;
      const obj = { lg: photo.lg, sm: photo.sm, focal: photo.focal, alt: '', w: photo.w, h: photo.h };
      if (isCouple) {
        // Couple photos are one pool: the new photo joins it, so every theme can use it.
        if (!m.get(['couple', 'portraits'])) m.set(['couple', 'portraits'], []);
        const list = m.get(['couple', 'portraits']);
        list.push({ photo: obj, alt: '' });
        m.touch(['couple', 'portraits']);
        if (spec.kind === 'bride' && !m.get(['couple', 'bride', 'photo'])) m.set(['couple', 'bride', 'photo'], obj);
        if (spec.kind === 'groom' && !m.get(['couple', 'groom', 'photo'])) m.set(['couple', 'groom', 'photo'], obj);
        setValue('images', id, spec, { portrait: list.length - 1 });
        toast('Photo added to your couple photos', 'success');
      } else {
        setValue('images', id, spec, obj);
        toast('Photo changed', 'success');
      }
      done();
    };
    file.onchange = () => { useUpload(file.files[0]); file.value = ''; };
    const drop = h('div.pdrop',
      { ondragover: (e) => { e.preventDefault(); drop.classList.add('is-drop'); }, ondragleave: () => drop.classList.remove('is-drop'), ondrop: (e) => { e.preventDefault(); drop.classList.remove('is-drop'); useUpload(e.dataTransfer.files[0]); } },
      h('button.btn.btn--primary', { type: 'button', onclick: () => file.click() }, icon('upload', 16), 'Upload a photo'),
      h('span.muted', 'or drop it here'), progress, file);
    const choices = isCouple && portraits().length
      ? h('div',
        h('p.label', 'Or use one of your couple photos'),
        h('ul.pchoose', portraits().map((p, i) => h('li', h('button.pchoose__btn', {
          type: 'button', class: isPortraitRef(o) && o.portrait === i ? 'is-on' : '', 'aria-label': `Couple photo ${i + 1}`,
          onclick: () => { setValue('images', id, spec, { portrait: i }); done(); },
        }, h('img', { src: photoUrl(p.photo, 'sm'), alt: p.alt || '', loading: 'lazy' }))))))
      : null;
    const d = openDialog({
      title: spec.label,
      wide: true,
      body: h('div.pdlg',
        h('div.pdlg__now', ref ? h('img', { src: photoUrl(ref, 'sm'), alt: '' }) : h('span.pcard__none', icon('image', 28))),
        h('div.pdlg__side',
          spec.note ? h('p.card__help', spec.note) : null,
          drop,
          choices,
          isCouple ? null : h('button.btn', { type: 'button', onclick: async () => { const s = await pickLibrary(ctx); if (s) { setValue('images', id, spec, s); done(); } } }, icon('image', 16), 'Choose from the photo library'),
          o && typeof o === 'object' && !isPortraitRef(o) ? textField(m, [...where('images', id, spec), 'alt'], { label: 'Describe the photo (for screen readers)', max: 200 }) : null,
          o ? h('button.link', { type: 'button', onclick: () => { setValue('images', id, spec, null); done(); } }, 'Go back to the theme’s original photo') : null,
        ),
      ),
      actions: [h('button.btn', { type: 'button', onclick: () => done() }, 'Done')],
    });
  }

  // ── Words
  function textCard(id, spec, all) {
    const key = sharedKey(spec, 'texts');
    const max = key ? Math.min(spec.max || 200, sharedTextMax(all, key, spec.max || 200)) : spec.max || 200;
    const box = h('div.tcard', { 'data-item': id });
    const show = () => {
      clear(box);
      const o = valueOf('texts', id, spec) || {};
      const en = o.en || spec.default?.en || '';
      const ne = o.ne || spec.default?.ne || '';
      box.classList.remove('is-editing');
      box.append(h('button.tcard__view', { type: 'button', onclick: edit, 'aria-label': `${spec.label}: edit` },
        h('span.tcard__label', spec.label, (o.en || o.ne) ? h('span.pcard__badge', 'Changed') : null),
        h('span.tcard__en', en || '—'),
        ne ? h('span.tcard__ne', { lang: 'ne' }, ne) : null,
        h('span.tcard__pen', icon('edit', 16)),
      ));
    };
    const edit = () => {
      clear(box);
      box.classList.add('is-editing');
      const o = valueOf('texts', id, spec);
      box.append(
        biField(m, where('texts', id, spec), { label: spec.label, max, multiline: spec.multiline, rows: 2, placeholderEn: spec.default?.en || '', placeholderNe: spec.default?.ne || '', hint: `Up to ${max} letters. Leave empty to keep the original, shown in grey.` }),
        h('div.tcard__actions',
          h('button.btn.btn--primary.btn--sm', { type: 'button', onclick: show }, 'Done'),
          o && (o.en || o.ne) ? h('button.link', { type: 'button', onclick: () => { setValue('texts', id, spec, null); show(); } }, 'Use the original words') : null,
        ),
      );
      box.querySelector('input, textarea')?.focus();
    };
    show();
    return box;
  }

  function render(man, all) {
    const images = Object.entries(man.images || {});
    const texts = Object.entries(man.texts || {});
    images.forEach(([id, spec]) => migrate('images', id, spec));
    texts.forEach(([id, spec]) => migrate('texts', id, spec));
    const photos = h('div.pgrid');
    const drawPhotos = () => clear(photos).append(...images.map(([id, spec]) => photoCard(id, spec, drawPhotos)));
    drawPhotos();
    clear(root).append(
      h('section.card',
        h('h2.card__title', `Photos in ${themeName}`),
        h('p.card__help', 'Click a photo to change it. Places of the couple always use your own photos.'),
        images.length ? photos : h('p.muted', 'This theme has no photos to change.')),
      h('section.card',
        h('h2.card__title', `Words in ${themeName}`),
        h('p.card__help', 'Click a line to change it. Type in English and Nepali side by side.'),
        texts.length ? h('div.tgrid', texts.map(([id, spec]) => textCard(id, spec, all))) : h('p.muted', 'This theme has no extra words to change.')),
    );
  }

  return root;
}

/** For the theme step: what of the couple's content shows up in `theme`. */
export async function carryOver(ctx, theme) {
  const all = await loadAll(ctx.meta.themes);
  const man = all[theme];
  const d = ctx.m.data;
  const portraits = (d.couple?.portraits || []).length;
  const shared = { images: Object.keys(d.content?.images || {}), texts: Object.keys(d.content?.texts || {}).filter((k) => d.content.texts[k]?.en || d.content.texts[k]?.ne) };
  const shown = [];
  const notShown = [];
  for (const kind of ['images', 'texts']) {
    for (const key of shared[kind]) {
      const spec = man && Object.values(man[kind] || {}).find((s) => s.shared === key);
      (spec ? shown : notShown).push((spec?.label || key).toLowerCase());
    }
  }
  const others = Object.entries(d.themeContent || {}).filter(([t, v]) => t !== theme && (Object.keys(v.images || {}).length || Object.keys(v.texts || {}).length)).map(([t]) => t);
  return { hasManifest: Boolean(man), portraits, shown, notShown, others };
}
