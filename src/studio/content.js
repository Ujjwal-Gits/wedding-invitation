// "Theme content": every image and text slot the selected theme declares in
// src/themes/<slug>/slots.js (THEME-CONTRACT §9–10).
//   Shared slots (manifest `shared: key`) save to data.content.{images,texts}[key] and so follow the
//   couple into every theme that shows the same thing. Theme-only slots save to data.themeContent[theme].
//   Photos uploaded into couple/bride/groom slots join the shared couple photos, and the slot points at them.
import { h, icon, clear, toast } from './dom.js';
import { biField, textField, section, group, uploadImage, checkImageFile, pickLibrary } from './fields.js';
import { photoUrl } from '../photos.js';
import { loadAll, sharedKey, sharedTextMax, themesUsing } from './slotdata.js';

const isPortraitRef = (r) => r && typeof r === 'object' && !Array.isArray(r) && 'portrait' in r;
const COUPLE_KINDS = new Set(['couple', 'bride', 'groom']);
const KIND_LABEL = { couple: 'Couple', bride: 'Bride', groom: 'Groom', scene: 'Place', detail: 'Detail' };
const titleCase = (s) => s.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function contentSection(ctx) {
  const m = ctx.m;
  const theme = m.get(['theme']);
  const themeName = (t) => ctx.meta.themes.find((x) => x.slug === t)?.name || t;
  const body = h('div', h('p.boot', 'Loading this theme’s content…'));
  const root = section('Theme content', `Every photo and line of text the ${themeName(theme)} theme shows, beyond the invitation details in the other sections. Items marked “Shared” follow you to every theme that shows the same thing. Leave a text empty to keep the default.`, body);

  loadAll(ctx.meta.themes).then((all) => {
    const man = all[theme];
    if (!man) {
      clear(body).append(h('p.notice', `${themeName(theme)} has not published its list of editable content yet. Couple photos and every invitation detail already work; check back here once the theme is finished.`));
      return;
    }
    render(man, all);
  }).catch(() => clear(body).append(h('p.notice.notice--error', 'The theme’s content list could not be loaded. Reload the page to try again.')));

  const themeBase = ['themeContent', theme];
  const portraits = () => m.get(['couple', 'portraits']) || [];
  const portrait = (n) => { const l = portraits(); return l[n]?.photo ?? l[n % Math.max(l.length, 1)]?.photo ?? null; };
  const bag = (path) => { if (!m.get(path)) m.set(path, {}); return m.get(path); };

  /** Where a slot's value lives: the shared pool or this theme's own overrides. */
  const where = (kind, id, spec) => {
    const key = sharedKey(spec, kind);
    return key ? ['content', kind, key] : [...themeBase, kind, id];
  };
  const valueOf = (kind, id, spec) => m.get(where(kind, id, spec));
  const setValue = (kind, id, spec, v) => {
    const p = where(kind, id, spec);
    const b = bag(p.slice(0, -1));
    if (v == null) delete b[p.at(-1)]; else b[p.at(-1)] = v;
    m.touch(p);
  };

  /** A theme-specific override of a shared slot hides the shared value (useSlots reads it first): move it over. */
  function migrate(kind, id, spec) {
    const key = sharedKey(spec, kind);
    const own = m.get([...themeBase, kind, id]);
    if (!key || own == null) return;
    if (m.get(['content', kind, key]) == null) bag(['content', kind])[key] = own;
    delete m.get([...themeBase, kind])[id];
    m.touch(['content', kind, key]);
  }

  /** Mirrors useSlots().img in src/core/slots.js so the preview here matches the page. */
  function effective(spec, o) {
    if (o) return isPortraitRef(o) ? portrait(o.portrait) : o;
    if (spec.kind === 'bride' && m.get(['couple', 'bride', 'photo'])) return m.get(['couple', 'bride', 'photo']);
    if (spec.kind === 'groom' && m.get(['couple', 'groom', 'photo'])) return m.get(['couple', 'groom', 'photo']);
    const d = spec.default;
    if (isPortraitRef(d)) return portrait(d.portrait);
    if (d) return d;
    if (spec.kind === 'bride') return m.get(['couple', 'bride', 'photo']) ?? portrait(0);
    if (spec.kind === 'groom') return m.get(['couple', 'groom', 'photo']) ?? portrait(0);
    return spec.kind === 'couple' ? portrait(0) : null;
  }

  function sharedBadge(all, kind, spec) {
    const key = sharedKey(spec, kind);
    if (!key) return h('span.slot__kind', 'This theme only');
    const n = themesUsing(all, kind, key).length;
    return h('span.slot__shared', { title: `Saved once, shown by ${n} theme${n === 1 ? '' : 's'}` }, `Shared · ${n} theme${n === 1 ? '' : 's'}`);
  }

  function imageRow(id, spec, all) {
    const row = h('li.slot', { 'data-slot': id });
    migrate('images', id, spec);
    const draw = () => {
      clear(row);
      const o = valueOf('images', id, spec);
      const ref = effective(spec, o);
      const isUpload = o && typeof o === 'object' && !isPortraitRef(o);
      const isCouple = COUPLE_KINDS.has(spec.kind);
      const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
      const bar = h('span.progress__bar');
      const progress = h('span.progress', { hidden: true }, bar);
      file.onchange = async () => {
        const f = file.files[0];
        file.value = '';
        if (!f || !checkImageFile(f)) return;
        progress.hidden = false;
        const photo = await uploadImage(ctx, f, bar);
        progress.hidden = true;
        if (!photo) return;
        const obj = { lg: photo.lg, sm: photo.sm, focal: photo.focal, alt: '', w: photo.w, h: photo.h };
        if (isCouple) {
          // Couple photos are one shared pool: add it there and point the slot at it.
          if (!m.get(['couple', 'portraits'])) m.set(['couple', 'portraits'], []);
          const list = m.get(['couple', 'portraits']);
          list.push({ photo: obj, alt: '' });
          m.touch(['couple', 'portraits']);
          if (spec.kind === 'bride' && !m.get(['couple', 'bride', 'photo'])) m.set(['couple', 'bride', 'photo'], obj);
          if (spec.kind === 'groom' && !m.get(['couple', 'groom', 'photo'])) m.set(['couple', 'groom', 'photo'], obj);
          setValue('images', id, spec, { portrait: list.length - 1 });
          toast(`Added as couple photo #${list.length}; it is available in every theme`, 'success');
        } else {
          setValue('images', id, spec, obj);
          toast('Photo replaced', 'success');
        }
        draw();
      };
      const pickId = `slot-${theme}-${id}`.replace(/[^\w-]/g, '_');
      row.append(
        h('div.slot__img', ref ? h('img', { src: photoUrl(ref, 'sm'), alt: '', loading: 'lazy', decoding: 'async' }) : h('span.slot__none', icon('image', 20)), progress),
        h('div.slot__main',
          h('div.slot__head', h('b', spec.label), h('span.slot__kind', KIND_LABEL[spec.kind] || spec.kind), sharedBadge(all, 'images', spec), h('span.slot__state', { class: o ? 'is-custom' : '' }, o ? 'Custom' : 'Default')),
          spec.note ? h('p.hint', spec.note) : null,
          h('div.photo__actions',
            h('button.btn.btn--sm', { type: 'button', onclick: () => file.click() }, icon('upload', 16), isCouple ? 'Upload new' : 'Replace'),
            isCouple && portraits().length
              ? h('span.slot__pick',
                h('label.sr-only', { for: pickId }, `Use a couple photo for ${spec.label}`),
                h('select.input.input--sm', { id: pickId, onchange: (e) => { if (e.target.value !== '') { setValue('images', id, spec, { portrait: Number(e.target.value) }); draw(); } } },
                  h('option', { value: '' }, 'Use couple photo…'),
                  portraits().map((p, i) => h('option', { value: String(i), selected: isPortraitRef(o) && o.portrait === i }, `Couple photo #${i + 1}${p.alt ? ` · ${p.alt.slice(0, 32)}` : ''}`))))
              : null,
            isCouple ? null : h('button.btn.btn--sm', { type: 'button', onclick: async () => { const s = await pickLibrary(ctx); if (s) { setValue('images', id, spec, s); draw(); } } }, 'Library'),
            o ? h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: () => { setValue('images', id, spec, null); draw(); } }, 'Reset to default') : null,
          ),
          isUpload ? textField(m, [...where('images', id, spec), 'alt'], { label: 'Describe the photo', max: 200, class: 'field--compact', placeholder: spec.label }) : null,
          file,
        ),
      );
    };
    draw();
    return row;
  }

  function textRow(id, spec, all) {
    const wrap = h('div.slot-text', { 'data-slot': id });
    migrate('texts', id, spec);
    const key = sharedKey(spec, 'texts');
    const max = key ? Math.min(spec.max || 200, sharedTextMax(all, key, spec.max || 200)) : spec.max || 200;
    const draw = () => {
      clear(wrap);
      const o = valueOf('texts', id, spec);
      const f = biField(m, where('texts', id, spec), {
        label: spec.label, max, multiline: spec.multiline, rows: 2,
        placeholderEn: spec.default?.en || '', placeholderNe: spec.default?.ne || '',
        hint: `Up to ${max} characters${key ? ' (fits every theme that shows it)' : ''}. Empty keeps the default shown in grey.`,
      });
      const legend = f.querySelector('legend');
      legend.append(' ', sharedBadge(all, 'texts', spec));
      if (o && (o.en || o.ne)) legend.append(h('button.btn.btn--xs-text', { type: 'button', onclick: () => { setValue('texts', id, spec, null); draw(); } }, 'Reset'));
      wrap.append(f);
    };
    draw();
    return wrap;
  }

  function render(man, all) {
    const images = Object.entries(man.images || {});
    const texts = Object.entries(man.texts || {});
    const byPrefix = new Map();
    for (const [id, spec] of texts) {
      const k = id.split('.')[0];
      if (!byPrefix.has(k)) byPrefix.set(k, []);
      byPrefix.get(k).push([id, spec]);
    }
    clear(body).append(
      group(`Photos (${images.length})`,
        h('p.hint', 'Couple, bride and groom places always use the couple’s own photos (uploads here join the couple photos). Places and details can use the library or an upload.'),
        images.length ? h('ul.slots', images.map(([id, spec]) => imageRow(id, spec, all))) : h('p.rep__empty', 'This theme has no replaceable photos.')),
      group(`Text (${texts.length})`,
        texts.length
          ? [...byPrefix].map(([k, list]) => h('div.slot-group', h('h4.slot-group__title', titleCase(k)), list.map(([id, spec]) => textRow(id, spec, all))))
          : h('p.rep__empty', 'This theme has no replaceable text.')),
    );
  }

  return root;
}

/** For the Theme section: what of the couple's content shows up in `theme`. */
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
      (spec ? shown : notShown).push(spec?.label || key);
    }
  }
  const others = Object.entries(d.themeContent || {}).filter(([t, v]) => t !== theme && (Object.keys(v.images || {}).length || Object.keys(v.texts || {}).length)).map(([t]) => t);
  return { hasManifest: Boolean(man), portraits, bride: Boolean(d.couple?.bride?.photo), groom: Boolean(d.couple?.groom?.photo), shown, notShown, others };
}
