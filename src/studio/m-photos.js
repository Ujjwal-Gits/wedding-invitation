// Photos: the couple's photos and the album. Drop or tap to add many at once (a queue with progress),
// drag to reorder (or use the arrow buttons), set a focus point, replace, remove. No alt text required.
import { h, icon, iconBtn, clear, append, toast, card, confirmDialog, openDialog } from './dom.js';
import { upload } from './api.js';
import { checkImageFile, focalDialog, pickLibrary } from './fields.js';
import { photoUrl } from '../photos.js';

const shapeOf = (p) => (p.h > p.w * 1.1 ? 'port' : p.w > p.h * 1.1 ? 'land' : 'sq');
const photoObj = (p) => ({ lg: p.lg, sm: p.sm, focal: p.focal, w: p.w, h: p.h });

/** Uploads many files, two at a time, showing each in a queue. onPhoto(photo) runs per success. */
export function uploadQueue(ctx, { onPhoto, onDone }) {
  const list = h('ul.queue', { 'aria-live': 'polite' });
  const run = async (files, max = 60) => {
    const chosen = [...files].filter(checkImageFile).slice(0, Math.max(0, max));
    if (!chosen.length) return;
    const jobs = chosen.map((f) => {
      const bar = h('span.queue__bar');
      const status = h('span.queue__status', 'Waiting');
      const url = URL.createObjectURL(f);
      const thumb = h('img.queue__thumb', { src: url, alt: '', onerror: () => thumb.replaceWith(h('span.queue__thumb.queue__thumb--none', icon('image', 18))) });
      const row = h('li.queue__item', thumb, h('span.queue__name', f.name), status, h('span.queue__track', bar));
      list.append(row);
      return { f, bar, status, row, url };
    });
    let ok = 0;
    const work = async (job) => {
      job.status.textContent = 'Preparing…';
      job.row.classList.add('is-active');
      try {
        const photo = await upload(ctx.slug, job.f, 'image', (p) => { job.bar.style.transform = `scaleX(${p})`; job.status.textContent = p < 1 ? `Uploading… ${Math.round(p * 100)}%` : 'Finishing…'; },
          (st) => { job.status.textContent = st === 'preparing' ? 'Preparing…' : 'Uploading…'; });
        job.bar.style.transform = 'scaleX(1)';
        job.status.textContent = 'Done';
        job.row.classList.add('is-done');
        ok += 1;
        onPhoto(photo);
      } catch (err) {
        job.status.textContent = err.message || 'Failed';
        job.row.classList.add('is-error');
        job.row.append(iconBtn('close', `Dismiss ${job.f.name}`, () => { job.row.remove(); URL.revokeObjectURL(job.url); }));
      }
      job.row.classList.remove('is-active');
      setTimeout(() => { if (job.row.classList.contains('is-done')) { job.row.classList.add('is-out'); setTimeout(() => { job.row.remove(); URL.revokeObjectURL(job.url); }, 250); } }, 1400);
    };
    const queue = [...jobs];
    await Promise.all([0, 1].map(async () => { while (queue.length) await work(queue.shift()); }));
    if (ok) toast(ok === 1 ? 'Photo added' : `${ok} photos added`, 'success');
    onDone?.();
  };
  return { list, run };
}

/** A drop zone that accepts many photos. */
export function dropArea(ctx, { title = 'Drop photos here', sub = 'or tap to choose · JPEG, PNG or WebP · big photos are made smaller for you', multiple = true, onFiles }) {
  const input = h('input', { type: 'file', accept: 'image/*', multiple, hidden: true, onchange: () => { onFiles(input.files); input.value = ''; } });
  const zone = h('button.droparea', { type: 'button', onclick: () => input.click() },
    h('span.droparea__icon', icon('upload', 22)), h('span.droparea__title', title), h('span.droparea__sub', sub));
  const wrap = h('div.droparea__wrap', zone, input);
  wrap.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-drop'); });
  wrap.addEventListener('dragleave', (e) => { if (!wrap.contains(e.relatedTarget)) zone.classList.remove('is-drop'); });
  wrap.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('is-drop'); onFiles(e.dataTransfer.files); });
  return wrap;
}

/**
 * A reorderable grid of photos at `path` (items are { photo, ... }).
 * opts: { max, make(photo) -> item, badge(i) -> text|null, empty }
 */
export function photoGrid(ctx, path, opts) {
  const m = ctx.m;
  // Show the photo in the preview, exactly where it appears (the album, or the couple's photos).
  const where = path[0] === 'gallery' ? 'gallery' : 'couple';
  const show = (ref) => ctx.preview?.pointImage(ref, where);
  const root = h('div.pgrid-wrap');
  const items = () => m.get(path) || [];
  const queue = uploadQueue(ctx, {
    // New photos go in front of the sample photos, so the couple's own pictures lead.
    onPhoto: (photo) => {
      if (!m.get(path)) m.set(path, []);
      const arr = m.get(path);
      const at = arr.findIndex((x) => typeof x.photo === 'string');
      const item = opts.make(photo);
      arr.splice(at < 0 ? arr.length : at, 0, item);
      m.touch(path);
      render();
      show(item.photo);
    },
  });
  let dragFrom = null;

  const move = (from, to, focusTool) => {
    const arr = items();
    if (to < 0 || to >= arr.length || from === to) return;
    const [it] = arr.splice(from, 1);
    arr.splice(to, 0, it);
    m.touch(path);
    render();
    show(it.photo);
    if (focusTool) requestAnimationFrame(() => root.querySelectorAll('.ptile')[to]?.querySelector(`[data-tool="${focusTool}"]`)?.focus());
  };

  function tile(it, i, n) {
    const ref = it.photo;
    const focal = ref && typeof ref === 'object' && Array.isArray(ref.focal) ? ref.focal : [0.5, 0.5];
    const replace = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
      const f = replace.files[0];
      replace.value = '';
      if (!f || !checkImageFile(f)) return;
      el.classList.add('is-busy');
      try {
        const p = await upload(ctx.slug, f, 'image');
        it.photo = photoObj(p);
        if ('shape' in it) it.shape = shapeOf(p);
        m.touch(path);
        render();
        show(it.photo);
        toast('Photo replaced', 'success');
      } catch (err) { toast(err.message, 'error'); el.classList.remove('is-busy'); }
    } });
    const badge = opts.badge?.(i);
    const sample = typeof ref === 'string';
    const canFocus = ref && typeof ref === 'object';
    const setFocus = async () => { const f = await focalDialog(ref); if (f) { ref.focal = f; m.touch(path); render(); show(ref); } };
    const remove = async () => {
      if (!(await confirmDialog({ title: 'Remove this photo?', message: 'It disappears from the invitation. You can add it again any time.', confirm: 'Remove', danger: true }))) return;
      items().splice(i, 1); m.touch(path); render();
      ctx.preview?.point({ section: where }, { now: false });
    };
    // Tap a photo: every action with words (the small icon row is a shortcut on bigger screens).
    const actions = () => {
      const act = (ic, text, fn, cls = '') => h('button.btn.btn--block.pact__btn', { type: 'button', class: cls, onclick: () => { d.close(); fn(); } }, icon(ic, 17), text);
      const d = openDialog({
        title: `Photo ${i + 1}${badge ? ` · ${badge}` : ''}`,
        body: h('div.pact',
          h('img.pact__img', { src: photoUrl(ref, 'sm'), alt: '', style: { objectPosition: `${focal[0] * 100}% ${focal[1] * 100}%` } }),
          h('div.pact__list',
            i > 0 ? act('up', opts.firstLabel || 'Move to the front', () => move(i, 0)) : null,
            i > 0 ? act('left', 'Move one earlier', () => move(i, i - 1)) : null,
            i < n - 1 ? act('right', 'Move one later', () => move(i, i + 1)) : null,
            canFocus ? act('target', 'Set the focus point', setFocus) : null,
            act('upload', sample ? 'Replace with my photo' : 'Replace this photo', () => replace.click()),
            act('trash', 'Remove', remove, 'btn--danger-ghost'))),
        actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Close')],
      });
    };
    const el = h('li.ptile', {
      draggable: 'true',
      ondragstart: (e) => { dragFrom = i; el.classList.add('is-dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); },
      ondragend: () => { el.classList.remove('is-dragging'); root.querySelectorAll('.is-over').forEach((x) => x.classList.remove('is-over')); },
      ondragover: (e) => { if (dragFrom == null) return; e.preventDefault(); el.classList.add('is-over'); },
      ondragleave: () => el.classList.remove('is-over'),
      ondrop: (e) => { if (dragFrom == null) return; e.preventDefault(); e.stopPropagation(); const f = dragFrom; dragFrom = null; move(f, i); },
    },
      h('button.ptile__img', { type: 'button', 'aria-label': `Photo ${i + 1}${sample ? ' (sample)' : ''}: options`, onclick: actions },
        h('img', { src: photoUrl(ref, 'sm'), alt: '', loading: 'lazy', decoding: 'async', draggable: 'false', style: { objectPosition: `${focal[0] * 100}% ${focal[1] * 100}%` } }),
        h('span.ptile__num', String(i + 1)),
        badge ? h('span.ptile__badge', badge) : null,
        sample ? h('span.ptile__sample', 'Sample') : null,
        h('span.ptile__grip', { 'aria-hidden': 'true' }, icon('drag', 16))),
      h('div.ptile__tools',
        iconBtn('left', `Move photo ${i + 1} earlier`, () => move(i, i - 1, 'left'), i === 0 ? 'is-disabled' : ''),
        iconBtn('right', `Move photo ${i + 1} later`, () => move(i, i + 1, 'right'), i === n - 1 ? 'is-disabled' : ''),
        canFocus ? iconBtn('target', `Focus point of photo ${i + 1}`, setFocus) : null,
        iconBtn('upload', `Replace photo ${i + 1}`, () => replace.click()),
        iconBtn('trash', `Remove photo ${i + 1}`, remove),
        replace));
    const [l, r] = el.querySelectorAll('.ptile__tools .btn');
    l.dataset.tool = 'left';
    r.dataset.tool = 'right';
    return el;
  }

  function render() {
    clear(root);
    const arr = items();
    const left = (opts.max || 60) - arr.length;
    append(root, [
      arr.length ? h('ol.pgrid', arr.map((it, i) => tile(it, i, arr.length))) : h('p.pgrid__empty', opts.empty || 'No photos yet.'),
      left > 0 ? dropArea(ctx, { onFiles: (files) => queue.run(files, left) }) : h('p.hint', `That is the most this section can hold (${opts.max}).`),
      queue.list]);
  }
  render();
  root.refresh = render;
  return root;
}

export function photosModule(ctx) {
  const portraits = photoGrid(ctx, ['couple', 'portraits'], {
    max: 24,
    make: (p) => ({ photo: photoObj(p), alt: '' }),
    badge: (i) => (i === 0 ? 'Main photo' : null),
    firstLabel: 'Make it the main photo',
    empty: 'No couple photos yet. Add a few you love; the first one is the main photo.',
  });
  const gallery = photoGrid(ctx, ['gallery'], {
    max: 60,
    make: (p) => ({ photo: photoObj(p), shape: shapeOf(p), alt: '' }),
    empty: 'No album photos yet. Engagement, family, the two of you: anything goes.',
  });
  const d = ctx.m.data;
  const samples = [...(d.couple?.portraits || []), ...(d.gallery || [])].filter((p) => typeof p.photo === 'string').length;
  return [
    samples ? h('div.notice.notice--row', icon('info', 16),
      h('span', h('b', `${samples} sample photo${samples === 1 ? '' : 's'}. `), 'Photos marked “Sample” are placeholders. Your own photos go in front of them; remove the samples when you are ready.'),
      h('button.btn.btn--sm', { type: 'button', onclick: async (e) => {
        if (!(await confirmDialog({ title: 'Remove all sample photos?', message: 'Only the sample photos go. Your own photos stay.', confirm: 'Remove samples', danger: true }))) return;
        for (const p of [['couple', 'portraits'], ['gallery']]) { const arr = ctx.m.get(p); if (Array.isArray(arr)) { ctx.m.set(p, arr.filter((x) => typeof x.photo !== 'string')); } }
        portraits.refresh(); gallery.refresh();
        e.target.closest('.notice')?.remove();
        toast('Sample photos removed', 'success');
      } }, 'Remove samples')) : null,
    card('Photos of the two of you', 'The first photo is the main one guests see. Drag to change the order, or tap a photo for every option.', portraits),
    card('Album', 'A gallery near the end of the invitation, in this order. Portrait and landscape both work.', gallery),
    h('p.tip', icon('info', 16), h('span', 'Tip: tap one of your photos and choose ', h('b', 'Set the focus point'), ', then tap a face, so phones never crop it out.')),
  ];
}

/** A dialog to pick one photo for a purpose (e.g. the share image): couple photos, upload, or library. */
export function pickPhoto(ctx, { title = 'Choose a photo', current } = {}) {
  return new Promise((resolve) => {
    let picked;
    const portraits = (ctx.m.get(['couple', 'portraits']) || []).filter((p) => p.photo);
    const input = h('input', { type: 'file', accept: 'image/*', hidden: true });
    const status = h('p.hint', { 'aria-live': 'polite' });
    input.onchange = async () => {
      const f = input.files[0];
      input.value = '';
      if (!f || !checkImageFile(f)) return;
      status.textContent = 'Uploading…';
      try { const p = await upload(ctx.slug, f, 'image', (x) => { status.textContent = `Uploading… ${Math.round(x * 100)}%`; }, (st) => { status.textContent = st === 'preparing' ? 'Preparing the photo…' : 'Uploading…'; }); picked = photoObj(p); d.close(); } catch (err) { status.textContent = err.message; }
    };
    const same = (a, b) => a && b && (a === b || (typeof a === 'object' && typeof b === 'object' && a.lg === b.lg));
    const d = openDialog({
      title, wide: true,
      body: h('div.pick',
        h('div.pick__row',
          h('button.btn.btn--primary', { type: 'button', onclick: () => input.click() }, icon('upload', 16), 'Upload a photo'),
          h('button.btn', { type: 'button', onclick: async () => { const s = await pickLibrary(ctx); if (s) { picked = s; d.close(); } } }, icon('image', 16), 'Photo library'),
          input),
        status,
        portraits.length ? h('p.label', 'Or one of your couple photos') : null,
        portraits.length ? h('ul.pick__grid', portraits.map((p) => h('li', h('button.pick__btn', { type: 'button', class: same(p.photo, current) ? 'is-on' : '', onclick: () => { picked = p.photo; d.close(); } },
          h('img', { src: photoUrl(p.photo, 'sm'), alt: '', loading: 'lazy' }))))) : null),
      onClose: () => resolve(picked),
    });
  });
}
