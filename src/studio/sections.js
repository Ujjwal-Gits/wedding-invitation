// The editor's sections. Each returns a DOM node bound to ctx.m (the invitation model).
import { h, icon, iconBtn, clear, toast } from './dom.js';
import { textField, biField, repeater, section, group, uploadImage, checkImageFile, pathStr } from './fields.js';
import { upload } from './api.js';
import { photoUrl } from '../photos.js';

const blank = () => ({ en: '', ne: '' });
const label = (v, fallback = '') => (v && (v.en || v.ne)) || fallback;
const openItems = new WeakSet();

// ── Couple & families ─────────────────────────────────────────────────────

/** Couple photos: multi-upload, reorder, alt text. Stored as couple.portraits = [{ photo, alt }]. */
export function portraitsEditor(ctx) {
  const m = ctx.m;
  const path = ['couple', 'portraits'];
  const root = h('div.media');
  const render = () => {
    clear(root);
    const arr = m.get(path) || [];
    const grid = h('ol.media__grid');
    arr.forEach((it, i) => grid.append(mediaTile(ctx, path, i, {
      onChange: render,
      badge: i === 0 ? 'Hero' : null,
      altPath: [...path, i, 'alt'],
      extra: null,
    })));
    root.append(arr.length ? grid : h('p.rep__empty', 'No couple photos yet.'), dropZone(ctx, {
      label: 'Add couple photos', max: 24 - arr.length,
      onPhoto: (photo) => { if (!m.get(path)) m.set(path, []); m.get(path).push({ photo, alt: '' }); m.touch(path); render(); },
    }));
  };
  render();
  return root;
}

/** A thumbnail tile in a photo grid, with move/remove and alt text. */
export function mediaTile(ctx, path, i, { onChange, badge, altPath, extra }) {
  const m = ctx.m;
  const arr = m.get(path);
  const item = arr[i];
  const ref = item.photo;
  const focal = ref && typeof ref === 'object' ? ref.focal : null;
  const move = (d) => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    m.touch(path);
    onChange();
    requestAnimationFrame(() => document.querySelector(`[data-tile="${pathStr([...path, j])}"] .media__tools > .btn:nth-of-type(${d < 0 ? 1 : 2})`)?.focus());
  };
  return h('li.media__tile', { 'data-tile': pathStr([...path, i]) },
    h('div.media__img', { class: `media__img--${item.shape || (ref?.h > ref?.w ? 'port' : 'land')}` },
      h('img', { src: photoUrl(ref, 'sm'), alt: '', loading: 'lazy', decoding: 'async', style: focal ? { objectPosition: `${focal[0] * 100}% ${focal[1] * 100}%` } : {} }),
      badge ? h('span.media__badge', badge) : null,
      h('span.media__num', String(i + 1)),
    ),
    h('div.media__tools',
      (() => {
        const input = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
          const f = input.files[0];
          input.value = '';
          if (!f) return;
          const photo = await uploadImage(ctx, f);
          if (!photo) return;
          item.photo = { lg: photo.lg, sm: photo.sm, focal: photo.focal, alt: '', w: photo.w, h: photo.h };
          if ('shape' in item) item.shape = photo.h > photo.w * 1.1 ? 'port' : photo.w > photo.h * 1.1 ? 'land' : 'sq';
          m.touch(path);
          onChange();
          toast('Photo replaced', 'success');
        } });
        return h('span', input, iconBtn('upload', `Replace photo ${i + 1}`, () => input.click()));
      })(),
      iconBtn('left', `Move photo ${i + 1} earlier`, () => move(-1), i === 0 ? 'is-disabled' : ''),
      iconBtn('right', `Move photo ${i + 1} later`, () => move(1), i === arr.length - 1 ? 'is-disabled' : ''),
      iconBtn('trash', `Remove photo ${i + 1}`, () => { arr.splice(i, 1); m.touch(path); onChange(); }),
    ),
    textField(m, altPath, { label: 'Alt text', max: 200, placeholder: 'What the photo shows', class: 'field--compact' }),
    extra,
  );
}

/** Drop zone + multi-file picker. Uploads sequentially and reports each photo. */
export function dropZone(ctx, { label: text, onPhoto, max = 60, multiple = true }) {
  const input = h('input', { type: 'file', accept: 'image/*', multiple, hidden: true });
  const status = h('span.drop__status', { 'aria-live': 'polite' });
  const bar = h('span.progress__bar');
  const progress = h('span.progress', { hidden: true }, bar);
  const zone = h('div.drop',
    h('button.btn', { type: 'button', onclick: () => input.click() }, icon('upload', 16), text),
    h('span.drop__hint', 'or drop photos here · JPEG, PNG, WebP, HEIC · up to 15 MB each'),
    progress, status, input,
  );
  const run = async (files) => {
    const list = [...files].filter(checkImageFile).slice(0, Math.max(0, max));
    if (!list.length) return;
    zone.classList.add('is-busy');
    progress.hidden = false;
    let done = 0;
    for (const f of list) {
      status.textContent = `Uploading ${done + 1} of ${list.length}…`;
      bar.style.transform = 'scaleX(0)';
      const photo = await uploadImage(ctx, f, bar);
      if (photo) onPhoto(photo, f);
      done += 1;
    }
    zone.classList.remove('is-busy');
    progress.hidden = true;
    status.textContent = '';
    toast(`${done === 1 ? 'Photo' : `${done} photos`} uploaded`, 'success');
  };
  input.onchange = () => { run(input.files); input.value = ''; };
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-drop'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-drop'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('is-drop'); run(e.dataTransfer.files); });
  return zone;
}

// ── Date & place ──────────────────────────────────────────────────────────

// ── Ceremonies ────────────────────────────────────────────────────────────

export function colorsEditor(ctx, path) {
  const m = ctx.m;
  const root = h('div.colors');
  const render = () => {
    clear(root);
    const arr = m.get(path) || [];
    arr.forEach((c, i) => {
      const id = `${pathStr(path)}-${i}`.replace(/[^\w-]/g, '_');
      root.append(h('span.colors__item',
        h('label.sr-only', { for: id }, `Colour ${i + 1}`),
        h('input.colors__input', { type: 'color', id, value: c, oninput: (e) => { arr[i] = e.target.value; m.touch(path); } }),
        iconBtn('close', `Remove colour ${i + 1}`, () => { arr.splice(i, 1); m.touch(path); render(); }, 'btn--xs'),
      ));
    });
    if (arr.length < 6) {
      root.append(h('button.btn.btn--sm', { type: 'button', onclick: () => { if (!m.get(path)) m.set(path, []); m.get(path).push('#c9963f'); m.touch(path); render(); root.querySelector('.colors__item:last-of-type input')?.focus(); } }, icon('plus', 16), 'Colour'));
    }
  };
  render();
  return h('fieldset.field', h('legend.label', 'Dress code colours'), h('p.hint', 'Up to six swatches guests can match.'), root);
}

// ── Story ─────────────────────────────────────────────────────────────────

export function storySection(ctx) {
  const m = ctx.m;
  return section('Story', 'A few short moments. One sentence each reads best.',
    repeater(m, ['story'], {
      itemName: 'moment', addLabel: 'Add a moment', max: 12, empty: 'No story yet. Two or three moments are plenty.',
      title: (s) => label(s.year, 'New moment'),
      create: () => ({ year: blank(), text: blank() }),
      render: (i) => [
        biField(m, ['story', i, 'year'], { label: 'Year', max: 20, placeholderEn: '2019', placeholderNe: '२०७६' }),
        biField(m, ['story', i, 'text'], { label: 'What happened', max: 500, multiline: true, rows: 2 }),
      ],
    }),
  );
}

// ── Gallery ───────────────────────────────────────────────────────────────

export function gallerySection(ctx) {
  const m = ctx.m;
  const path = ['gallery'];
  const root = h('div.media');
  const render = () => {
    clear(root);
    const arr = m.get(path) || [];
    const grid = h('ol.media__grid.media__grid--gallery');
    arr.forEach((g, i) => {
      const shapeId = `gshape-${i}`;
      grid.append(mediaTile(ctx, path, i, {
        onChange: render,
        altPath: [...path, i, 'alt'],
        extra: h('div.media__more',
          h('div.field.field--compact',
            h('label.label', { for: shapeId }, 'Shape'),
            h('select.input', { id: shapeId, onchange: (e) => { g.shape = e.target.value; m.touch(path); render(); } },
              [['land', 'Landscape'], ['port', 'Portrait'], ['sq', 'Square']].map(([v, t]) => h('option', { value: v, selected: g.shape === v }, t))),
          ),
          h('details.media__cap', h('summary', 'Caption'), biField(m, [...path, i, 'caption'], { label: 'Caption', max: 120 })),
        ),
      }));
    });
    root.append(
      h('p.media__count', `${arr.length} of 60 photos`),
      arr.length ? grid : h('p.rep__empty', 'No photos yet.'),
      dropZone(ctx, {
        label: 'Add photos', max: 60 - arr.length,
        onPhoto: (photo) => {
          if (!m.get(path)) m.set(path, []);
          const shape = photo.h > photo.w * 1.1 ? 'port' : photo.w > photo.h * 1.1 ? 'land' : 'sq';
          m.get(path).push({ photo, shape, alt: '' });
          m.touch(path);
          render();
        },
      }),
    );
  };
  render();
  return section('Gallery', 'The couple’s own photos, in the order guests will see them. Portrait and landscape both work; shapes are detected for you.', root);
}

// ── Card wording ──────────────────────────────────────────────────────────

export function wordingSection(ctx) {
  const m = ctx.m;
  const sp = m.get(['saptapadi']) || [];
  while (sp.length < 7) sp.push(blank());
  if (!m.get(['saptapadi'])) m.set(['saptapadi'], sp);
  return section('Card wording', 'The full printed-card text. Themes keep it behind a “Read the invitation card” button, so it can be traditional and complete.',
    group('Invocation',
      textField(m, ['invitation', 'shloka', 'sa'], { label: 'Shloka (Sanskrit)', max: 400, multiline: true, rows: 2, lang: 'sa' }),
      textField(m, ['invitation', 'shloka', 'en'], { label: 'Shloka meaning (English)', max: 400, multiline: true, rows: 2 }),
    ),
    group('The card',
      biField(m, ['invitation', 'salutation'], { label: 'Salutation', max: 120, placeholderEn: 'Respected guest,', placeholderNe: 'मान्यवर,' }),
      biField(m, ['invitation', 'body'], { label: 'Main text', max: 2000, multiline: true, rows: 5 }),
      biField(m, ['invitation', 'request'], { label: 'Request', max: 1000, multiline: true, rows: 3 }),
      biField(m, ['invitation', 'signoff'], { label: 'Sign-off', max: 120, placeholderEn: 'With humble regards', placeholderNe: 'विनीत' }),
      biField(m, ['closing'], { label: 'Closing blessing', hint: 'The last line of the invitation.', max: 400, multiline: true, rows: 2 }),
    ),
    group('Saptapadi: the seven steps',
      ...Array.from({ length: 7 }, (_, i) => biField(m, ['saptapadi', i], { label: `Step ${i + 1}`, max: 160 })),
    ),
  );
}

// ── Music ─────────────────────────────────────────────────────────────────

export function musicSection(ctx) {
  const m = ctx.m;
  const path = ['music', 'tracks'];
  const root = h('div');
  const bundled = ctx.meta.tracks;

  const render = () => {
    clear(root);
    const tracks = m.get(path) || [];
    const first = tracks[0]?.src;
    const has = (src) => tracks.some((t) => t.src === src);
    const setFirst = (src) => {
      const i = tracks.findIndex((t) => t.src === src);
      if (i > 0) { const [t] = tracks.splice(i, 1); tracks.unshift(t); }
      m.touch(path);
      render();
    };
    const toggle = (t, on) => {
      if (on && !has(t.src)) tracks.push(structuredClone(t));
      if (!on) { const i = tracks.findIndex((x) => x.src === t.src); if (i >= 0) tracks.splice(i, 1); }
      m.touch(path);
      render();
    };

    const row = (t, { custom = false, idx } = {}) => {
      const on = has(t.src);
      const cid = `trk-${t.src.replace(/\W/g, '')}`;
      return h('li.track', { class: on ? 'is-on' : '' },
        h('div.track__main',
          custom ? null : h('input.check', { type: 'checkbox', id: cid, checked: on, onchange: (e) => toggle(t, e.target.checked) }),
          h('label.track__name', { for: custom ? undefined : cid }, h('b', label((tracks.find((x) => x.src === t.src) || t).title, 'Untitled track')), h('small', label((tracks.find((x) => x.src === t.src) || t).mood))),
          h('label.track__first',
            h('input', { type: 'radio', name: 'first-track', checked: first === t.src, disabled: !on, onchange: () => setFirst(t.src) }),
            'Plays first'),
          custom ? iconBtn('trash', 'Remove this track', () => { tracks.splice(idx, 1); m.touch(path); render(); }) : null,
        ),
        h('audio.track__audio', { controls: true, preload: 'none', src: t.src }),
        on ? (() => {
          const k = custom ? idx : tracks.findIndex((x) => x.src === t.src);
          return h('details.track__edit', { open: custom },
            h('summary', 'Edit title and mood'),
            h('div.track__meta',
              biField(m, [...path, k, 'title'], { label: 'Title', max: 80 }),
              biField(m, [...path, k, 'mood'], { label: 'Mood', max: 80 }),
              custom ? textField(m, [...path, k, 'credit'], { label: 'Credit', hint: 'Artist and licence. Only upload music you have the right to use.', max: 300 }) : null,
            ));
        })() : null,
      );
    };

    const customs = tracks.map((t, idx) => ({ t, idx })).filter(({ t }) => t.src.startsWith('/uploads/'));
    root.append(
      group('Choose from our music', h('p.hint', 'Tick the songs to include. Guests can switch between them; music only starts when a guest opens the invitation.'),
        h('ul.tracks', bundled.map((t) => row(t)))),
      group('Your own music',
        customs.length ? h('ul.tracks', customs.map(({ t, idx }) => row(t, { custom: true, idx }))) : h('p.rep__empty', 'No uploaded music.'),
        mp3Upload(ctx, (src) => { tracks.push({ title: { en: 'Our song', ne: '' }, mood: blank(), src, credit: '' }); m.touch(path); render(); }),
      ),
      group('Volume', (() => {
        const v = Math.round((m.get(['music', 'volume']) ?? 0.75) * 100);
        const out = h('output', { for: 'vol' }, `${v}%`);
        return h('div.field.vol', h('label.label', { for: 'vol' }, 'Starting volume'),
          h('div.vol__row', h('input', { type: 'range', id: 'vol', min: 10, max: 100, step: 5, value: v, oninput: (e) => { out.textContent = `${e.target.value}%`; m.set(['music', 'volume'], Number(e.target.value) / 100); } }), out));
      })()),
    );
  };
  render();
  return section('Music', 'Choose what plays while guests scroll.', root);
}

function mp3Upload(ctx, onDone) {
  const input = h('input', { type: 'file', accept: 'audio/mpeg,.mp3', hidden: true });
  const bar = h('span.progress__bar');
  const progress = h('span.progress', { hidden: true }, bar);
  input.onchange = async () => {
    const f = input.files[0];
    input.value = '';
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) { toast('That file is larger than 15 MB.', 'error'); return; }
    progress.hidden = false;
    try {
      const out = await upload(ctx.slug, f, 'audio', (p) => { bar.style.transform = `scaleX(${p})`; });
      onDone(out.src);
      toast('Music uploaded', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      progress.hidden = true;
    }
  };
  return h('div.drop', h('button.btn', { type: 'button', onclick: () => input.click() }, icon('music', 16), 'Upload an MP3'), h('span.drop__hint', 'MP3 only · up to 15 MB'), progress, input);
}

// ── Guest info ────────────────────────────────────────────────────────────

export function infoSection(ctx) {
  const m = ctx.m;
  return section('Guest info', 'Practical details for guests travelling in.',
    group('Getting there', biField(m, ['info', 'travel'], { label: 'Travel and parking', max: 1000, multiline: true, rows: 3 })),
    group('Places to stay', repeater(m, ['info', 'stays'], {
      itemName: 'stay', addLabel: 'Add a place to stay', max: 8, empty: 'No suggestions yet.',
      title: (s) => label(s.name, 'New place'),
      create: () => ({ name: blank(), note: blank(), mapQuery: '' }),
      render: (i) => [
        biField(m, ['info', 'stays', i, 'name'], { label: 'Name', max: 120 }),
        biField(m, ['info', 'stays', i, 'note'], { label: 'Note', max: 240 }),
        textField(m, ['info', 'stays', i, 'mapQuery'], { label: 'Map search', max: 200 }),
      ],
    })),
    group('Family contacts', repeater(m, ['info', 'contacts'], {
      itemName: 'contact', addLabel: 'Add a contact', max: 8, empty: 'No contacts yet.',
      title: (k) => [label(k.name, 'New contact'), label(k.role)].filter(Boolean).join(' · '),
      create: () => ({ name: blank(), role: blank(), phone: '' }),
      render: (i) => [
        biField(m, ['info', 'contacts', i, 'name'], { label: 'Name', max: 80 }),
        biField(m, ['info', 'contacts', i, 'role'], { label: 'Relation', max: 80, placeholderEn: 'Bride’s brother', placeholderNe: 'दुलहीको दाजु' }),
        textField(m, ['info', 'contacts', i, 'phone'], { label: 'Phone', max: 20, type: 'tel', inputmode: 'tel', placeholder: '+977 98…' }),
      ],
    })),
    group('Livestream', textField(m, ['info', 'livestream'], { label: 'Livestream link (optional)', hint: 'For relatives abroad. Must start with https://', max: 500, type: 'url', placeholder: 'https://youtube.com/…' })),
  );
}

// ── RSVP settings ─────────────────────────────────────────────────────────

export function rsvpSection(ctx) {
  const m = ctx.m;
  const enabled = m.get(['rsvp', 'enabled']) !== false;
  return section('RSVP settings', 'Replies arrive in Responses. Guests never need an account.',
    group(null,
      h('label.switch',
        h('input', { type: 'checkbox', role: 'switch', checked: enabled, onchange: (e) => m.set(['rsvp', 'enabled'], e.target.checked) }),
        h('span.switch__track', { 'aria-hidden': 'true' }),
        h('span', h('b', 'Accept replies'), h('small', 'Turn off after the deadline to close the form.')),
      ),
      biField(m, ['rsvp', 'deadline'], { label: 'Reply-by line', max: 200, placeholderEn: 'Kindly reply by 25 January 2027' }),
      textField(m, ['rsvp', 'maxGuests'], { label: 'Most guests per reply', hint: 'Including the person replying. 1 to 20.', type: 'number', max: 2, inputmode: 'numeric', class: 'field--narrow' }),
    ),
  );
}

