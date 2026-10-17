// Form building blocks bound to the invitation model by path.
import { h, icon, iconBtn, clear, toast, openDialog } from './dom.js';
import { upload } from './api.js';
import { photoUrl } from '../photos.js';
import { sectionOfPath } from './preview-sync.js';
import { zoneOf, zonedIso, wallOf } from '../core/tz.js';

let uid = 0;
const nextId = (p = 'f') => `${p}-${++uid}`;

/** path array -> "events[0].title.en" (the server's error format). */
export const pathStr = (path) => path.reduce((s, k) => (typeof k === 'number' ? `${s}[${k}]` : s ? `${s}.${k}` : k), '');

/** The model: one mutable data object, change notifications by path. */
export function createModel(data, onChange) {
  return {
    data,
    get(path) { return path.reduce((o, k) => (o == null ? undefined : o[k]), data); },
    set(path, value) {
      let o = data;
      for (let i = 0; i < path.length - 1; i++) {
        if (o[path[i]] == null || typeof o[path[i]] !== 'object') o[path[i]] = typeof path[i + 1] === 'number' ? [] : {};
        o = o[path[i]];
      }
      o[path.at(-1)] = value;
      onChange(path);
    },
    touch(path) { onChange(path); },
  };
}

function control(m, path, { multiline, rows = 3, type = 'text', max, placeholder, lang, inputmode, autocomplete = 'off', id, describedBy }) {
  const v = m.get(path);
  const props = {
    id, name: pathStr(path), 'data-path': pathStr(path), maxlength: max, placeholder, lang, inputmode, autocomplete,
    'aria-describedby': describedBy, spellcheck: lang === 'ne' ? 'false' : undefined,
    value: v == null ? '' : String(v),
    oninput: (e) => {
      e.target.removeAttribute('aria-invalid');
      e.target.closest('.field, .bi__col')?.querySelector('.field__err')?.remove();
      m.set(path, type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value);
    },
  };
  return multiline
    ? h('textarea.input', { ...props, rows })
    : h('input.input', { ...props, type });
}

/** A single-language text field. */
export function textField(m, path, opts = {}) {
  const id = nextId();
  const hintId = opts.hint ? `${id}-hint` : undefined;
  return h('div.field', { class: opts.class },
    h('label.label', { for: id }, opts.label),
    opts.hint ? h('p.hint', { id: hintId }, opts.hint) : null,
    control(m, path, { ...opts, id, describedBy: hintId }),
  );
}

const LANG_NAME = { en: 'English', ne: 'नेपाली' };
const short = (v, n = 36) => (v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v);

/**
 * English | नेपाली: one question, two languages in one joined box (side by side when there is room, stacked on
 * phones). An empty language shows what the invitation will use instead ("Uses English: Binisha").
 * opts: { label, hint, max, multiline, rows, placeholderEn, placeholderNe, action (Node, top right, never shifts) }
 */
export function biField(m, path, opts = {}) {
  const id = nextId('bi');
  const hintId = opts.hint ? `${id}-hint` : undefined;
  const base = { en: opts.placeholderEn || '', ne: opts.placeholderNe || '' };
  const inputs = {};
  const col = (lang) => {
    const cid = `${id}-${lang}`;
    const input = control(m, [...path, lang], { ...opts, id: cid, lang: lang === 'ne' ? 'ne' : 'en', describedBy: hintId, placeholder: base[lang] });
    inputs[lang] = input;
    return h('div.bi__col', { class: `bi__col--${lang}` },
      input,
      h('label.bi__lang', { for: cid }, h('span.sr-only', `${opts.label}, `), LANG_NAME[lang]));
  };
  const row = h('div.bi__row', col('en'), col('ne'));
  // The fallback the invitation uses for an empty language, as the empty box's placeholder (an attribute: no reflow).
  const hintFor = (lang) => {
    const other = lang === 'en' ? 'ne' : 'en';
    const ov = inputs[other].value.trim().replace(/\s+/g, ' ');
    const text = ov ? `Uses ${LANG_NAME[other]}: ${short(ov)}` : base[lang];
    if (inputs[lang].placeholder !== text) inputs[lang].placeholder = text;
  };
  inputs.en.addEventListener('input', () => hintFor('ne'));
  inputs.ne.addEventListener('input', () => hintFor('en'));
  hintFor('en');
  hintFor('ne');
  const acts = [opts.action].flat().filter(Boolean).length;
  return h('fieldset.field.bi', { class: [opts.class, acts ? `bi--act bi--act${acts}` : ''].filter(Boolean).join(' ') },
    h('legend.label', opts.label),
    opts.action ? h('div.bi__act', opts.action) : null,
    opts.hint ? h('p.hint', { id: hintId }, opts.hint) : null,
    row,
  );
}

// ── Dates (wall-clock time at the venue: the invitation's timeZone, absent = Nepal; src/core/tz.js) ──

export function dateTimeField(m, path, { label, hint, timeOnlyLabel } = {}) {
  const id = nextId('dt');
  const tz = zoneOf(m.data);
  const cur = wallOf(m.get(path), tz);
  const date = h('input.input', { type: 'date', id: `${id}-d`, value: cur.date, 'data-path': pathStr(path), min: '2020-01-01', max: '2099-12-31' });
  const time = h('input.input', { type: 'time', id: `${id}-t`, value: cur.time, step: 300 });
  const write = () => {
    date.removeAttribute('aria-invalid');
    if (date.value && time.value) m.set(path, zonedIso(date.value, time.value, zoneOf(m.data)));
    else if (!date.value) m.set(path, '');
  };
  date.addEventListener('change', write);
  time.addEventListener('change', write);
  return h('fieldset.field.dt',
    h('legend.label', label),
    hint ? h('p.hint', hint) : null,
    h('div.dt__row',
      h('div.dt__col', h('label.bi__lang', { for: date.id }, 'Date'), date),
      h('div.dt__col', h('label.bi__lang', { for: time.id }, timeOnlyLabel || 'Time (at the venue)'), time),
    ),
  );
}

// ── Photos ────────────────────────────────────────────────────────────────

const MAX_UPLOAD = 40 * 1024 * 1024; // photos are made smaller in the browser before they are sent

export function checkImageFile(file) {
  if (!file) return false;
  if (file.size > MAX_UPLOAD) { toast(`${file.name} is larger than 40 MB. Please choose a smaller photo.`, 'error'); return false; }
  if (file.type && !file.type.startsWith('image/')) { toast(`${file.name} is not an image.`, 'error'); return false; }
  return true;
}

/** Uploads one image and resolves to the server's photo object. Shows progress in `bar` if given. */
export async function uploadImage(ctx, file, bar) {
  if (!checkImageFile(file)) return null;
  try {
    const photo = await upload(ctx.slug, file, 'image', (p) => { if (bar) bar.style.transform = `scaleX(${p})`; });
    return photo;
  } catch (err) {
    toast(err.message, 'error');
    return null;
  }
}

/** Picker for the bundled photo library. Resolves to a slug or null. */
export function pickLibrary(ctx) {
  return new Promise((resolve) => {
    let picked = null;
    const grid = h('ul.libgrid');
    for (const p of ctx.meta.library) {
      grid.append(h('li', h('button.libgrid__btn', {
        type: 'button', title: p.title,
        onclick: () => { picked = p.slug; d.close(); },
      }, h('img', { src: `/photos/${p.slug}-sm.webp`, alt: p.title, loading: 'lazy', decoding: 'async' }))));
    }
    const d = openDialog({ title: 'Choose from the photo library', body: [h('p.hint', 'Real photographs of Nepal (credited on the Nimtto credits page).'), grid], wide: true, onClose: () => resolve(picked) });
  });
}

/** Click-to-set focus point on a large copy of the photo. Resolves to [x, y] or null. */
export function focalDialog(ref) {
  return new Promise((resolve) => {
    let focal = Array.isArray(ref?.focal) ? [...ref.focal] : [0.5, 0.5];
    let done = false;
    const dot = h('span.focal__dot', { 'aria-hidden': 'true' });
    const img = h('img', { src: photoUrl(ref, 'sm'), alt: '', draggable: 'false' });
    const place = () => { dot.style.left = `${focal[0] * 100}%`; dot.style.top = `${focal[1] * 100}%`; };
    const pad = h('button.focal__pad', {
      type: 'button', 'aria-label': 'Photo: click the most important point, or use the arrow keys',
      onclick: (e) => {
        if (!e.clientX && !e.clientY) return;
        const r = img.getBoundingClientRect();
        focal = [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))].map((v) => Math.round(v * 1000) / 1000);
        place();
      },
      onkeydown: (e) => {
        const step = e.shiftKey ? 0.1 : 0.03;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!d) return;
        e.preventDefault();
        focal = [Math.min(1, Math.max(0, focal[0] + d[0])), Math.min(1, Math.max(0, focal[1] + d[1]))].map((v) => Math.round(v * 1000) / 1000);
        place();
      },
    }, img, dot);
    place();
    const d = openDialog({
      title: 'Set the focus point',
      body: [h('p.dialog__text', 'Click the most important part (usually a face). Phones crop photos differently; this point always stays in view.'), h('div.focal', pad)],
      actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), h('button.btn.btn--primary', { type: 'button', onclick: () => { done = true; d.close(); } }, icon('check', 16), 'Use this point')],
      onClose: () => resolve(done ? focal : null),
    });
    pad.focus();
  });
}

/**
 * One photo slot: preview, drop or tap to upload, replace, focus point, remove. No alt text needed.
 * The value at `path` is a photo reference (null, library slug, or uploaded object).
 */
export function photoSlot(m, path, ctx, { label, hint, shape = 'port', library = false } = {}) {
  const root = h('div.pslot', { class: `pslot--${shape}`, 'data-path': pathStr(path) });
  const show = () => { const ref = m.get(path); if (ref) ctx.preview?.pointImage(ref, sectionOfPath(pathStr(path))); else ctx.preview?.point({ section: sectionOfPath(pathStr(path)) }, { now: false }); };
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true });

  const render = () => {
    clear(root);
    const ref = m.get(path);
    const isObj = ref && typeof ref === 'object';
    const bar = h('span.progress__bar');
    const progress = h('span.progress', { hidden: true }, bar);
    const focal = isObj && Array.isArray(ref.focal) ? ref.focal : [0.5, 0.5];
    const frame = ref
      ? h('button.pslot__frame', { type: 'button', onclick: () => file.click(), 'aria-label': `${label || 'Photo'}: replace` },
        h('img', { src: photoUrl(ref, 'sm'), alt: '', decoding: 'async', style: { objectPosition: `${focal[0] * 100}% ${focal[1] * 100}%` } }),
        h('span.pslot__hover', icon('upload', 16), 'Replace'), progress)
      : h('button.pslot__frame.pslot__frame--empty', { type: 'button', onclick: () => file.click() },
        icon('camera', 22), h('span', 'Drop or tap to add'), progress);

    const pick = async (f) => {
      progress.hidden = false;
      root.classList.add('is-busy');
      const photo = await uploadImage(ctx, f, bar);
      root.classList.remove('is-busy');
      progress.hidden = true;
      if (photo) {
        m.set(path, { lg: photo.lg, sm: photo.sm, focal: photo.focal, w: photo.w, h: photo.h });
        render();
        show();
        toast('Photo added', 'success');
      }
    };
    file.onchange = () => { if (file.files[0]) pick(file.files[0]); file.value = ''; };
    root.ondragover = (e) => { e.preventDefault(); root.classList.add('is-drop'); };
    root.ondragleave = () => root.classList.remove('is-drop');
    root.ondrop = (e) => { e.preventDefault(); root.classList.remove('is-drop'); const f = e.dataTransfer.files[0]; if (f) pick(f); };

    root.append(frame, h('div.pslot__side',
      label ? h('p.pslot__label', label) : null,
      hint ? h('p.hint', hint) : null,
      h('div.pslot__actions',
        h('button.btn.btn--sm', { type: 'button', class: ref ? '' : 'btn--primary', onclick: () => file.click() }, icon('upload', 15), ref ? 'Replace' : 'Add photo'),
        isObj ? h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: async () => { const f = await focalDialog(ref); if (f) { m.set([...path, 'focal'], f); render(); show(); } } }, icon('target', 15), 'Focus') : null,
        library ? h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: async () => { const s = await pickLibrary(ctx); if (s) { m.set(path, s); render(); show(); } } }, icon('image', 15), 'Library') : null,
        ref ? h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: () => { m.set(path, null); render(); show(); } }, 'Remove') : null),
      file));
  };
  render();
  return root;
}

// ── Repeating lists ───────────────────────────────────────────────────────

/**
 * A list of items with add / remove / reorder.
 * opts: { title(item, i), render(i) -> Node, create() -> item, addLabel, max, open (Set of open items), collapsible }
 */
export function repeater(m, path, opts) {
  const root = h('div.rep');
  const open = opts.open || new WeakSet();
  const items = () => m.get(path) || [];

  const move = (i, d) => {
    const arr = items();
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    m.touch(path);
    render(j, d < 0 ? 'up' : 'down');
  };

  const render = (focusIdx, focusDir) => {
    clear(root);
    const arr = items();
    const list = h('ol.rep__list');
    arr.forEach((item, i) => {
      const head = h('div.rep__head',
        h('span.rep__num', String(i + 1)),
        h('span.rep__title', opts.title(item, i) || `${opts.itemName || 'Item'} ${i + 1}`),
        h('span.rep__tools',
          iconBtn('up', `Move ${opts.itemName || 'item'} ${i + 1} up`, (e) => { e.preventDefault(); move(i, -1); }, i === 0 ? 'is-disabled' : ''),
          iconBtn('down', `Move ${opts.itemName || 'item'} ${i + 1} down`, (e) => { e.preventDefault(); move(i, 1); }, i === arr.length - 1 ? 'is-disabled' : ''),
          iconBtn('trash', `Remove ${opts.itemName || 'item'} ${i + 1}`, async (e) => {
            e.preventDefault();
            if (opts.confirmRemove && !(await opts.confirmRemove(item, i))) return;
            arr.splice(i, 1);
            m.touch(path);
            render();
          }),
        ),
      );
      let body;
      if (opts.collapsible) {
        const det = h('details.rep__item', { open: open.has(item) },
          h('summary', head),
          h('div.rep__body', opts.render(i)),
        );
        det.addEventListener('toggle', () => { if (det.open) open.add(item); else open.delete(item); });
        body = det;
      } else {
        body = h('div.rep__item.is-flat', head, h('div.rep__body', opts.render(i)));
      }
      list.append(h('li', body));
    });
    root.append(arr.length ? list : h('p.rep__empty', opts.empty || 'Nothing here yet.'));
    if (!opts.max || arr.length < opts.max) {
      root.append(h('button.btn.rep__add', {
        type: 'button',
        onclick: () => {
          const item = opts.create();
          const list2 = items();
          if (!m.get(path)) m.set(path, []);
          (m.get(path) || list2).push(item);
          open.add(item);
          m.touch(path);
          render(m.get(path).length - 1, 'new');
        },
      }, icon('plus', 16), opts.addLabel || 'Add'));
    }
    if (focusIdx != null) {
      const li = root.querySelectorAll('.rep__list > li')[focusIdx];
      const target = focusDir === 'new' ? li?.querySelector('input, textarea') : li?.querySelector(`.rep__tools .btn:nth-child(${focusDir === 'up' ? 1 : 2})`);
      target?.focus();
    }
  };
  render();
  root.refresh = render;
  return root;
}

export function section(title, intro, ...children) {
  return h('section.sec',
    h('header.sec__head', h('h2.sec__title', title), intro ? h('p.sec__intro', intro) : null),
    ...children,
  );
}

export const group = (title, ...children) => h('div.group', title ? h('h3.group__title', title) : null, ...children);
