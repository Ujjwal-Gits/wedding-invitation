// The editor's sections. Each returns a DOM node bound to ctx.m (the invitation model).
import { h, icon, iconBtn, clear, toast, copyText, confirmDialog } from './dom.js';
import { textField, biField, dateTimeField, photoSlot, repeater, section, group, uploadImage, checkImageFile, pathStr } from './fields.js';
import { upload } from './api.js';
import { photoUrl } from '../photos.js';
import { contentSection, carryOver } from './content.js';

const blank = () => ({ en: '', ne: '' });
const label = (v, fallback = '') => (v && (v.en || v.ne)) || fallback;
const openItems = new WeakSet();

// ── Couple & families ─────────────────────────────────────────────────────

function personBlock(ctx, who, title) {
  const m = ctx.m;
  const p = ['couple', who];
  return group(title,
    photoSlot(m, [...p, 'photo'], ctx, { label: `${title}'s portrait`, hint: 'A single portrait, ideally upright (portrait orientation).', shape: 'port' }),
    biField(m, [...p, 'name'], { label: 'First name', max: 60, placeholderEn: who === 'bride' ? 'Aarati' : 'Sameer', placeholderNe: who === 'bride' ? 'आरती' : 'समीर' }),
    biField(m, [...p, 'fullName'], { label: 'Full name as printed on the card', hint: 'Nepali cards often prefix सौ.का. for the bride and चि. for the groom.', max: 120 }),
    biField(m, [...p, 'parents'], { label: 'Parents', max: 240, placeholderEn: 'Mr. … & Mrs. …', placeholderNe: 'श्री … तथा श्रीमती …' }),
    biField(m, [...p, 'home'], { label: 'Family home', max: 160, placeholderEn: 'Baluwatar, Kathmandu' }),
  );
}

export function coupleSection(ctx) {
  const m = ctx.m;
  return section('Couple & families', 'Names, families and the photos guests will see most.',
    h('div.split', personBlock(ctx, 'bride', 'Bride'), personBlock(ctx, 'groom', 'Groom')),
    group('Couple photos',
      h('p.hint', 'The first photo is the hero of the invitation. Themes show the couple in at least three places, so add three or more.'),
      portraitsEditor(ctx),
    ),
    group('Signing the card',
      biField(m, ['hosts'], { label: 'Hosts (who is inviting)', max: 200, placeholderEn: 'The Thapa & Shrestha families' }),
      textField(m, ['couple', 'hashtag'], { label: 'Hashtag', max: 60, placeholder: '#AaratiWedsSameer' }),
    ),
  );
}

/** Couple photos: multi-upload, reorder, alt text. Stored as couple.portraits = [{ photo, alt }]. */
function portraitsEditor(ctx) {
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
function mediaTile(ctx, path, i, { onChange, badge, altPath, extra }) {
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
function dropZone(ctx, { label: text, onPhoto, max = 60, multiple = true }) {
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

export function dateSection(ctx) {
  const m = ctx.m;
  return section('Date & place', 'The main wedding day. Each ceremony has its own times in Ceremonies.',
    group(null,
      dateTimeField(m, ['weddingDate'], { label: 'Wedding day and auspicious time', hint: 'Used for the countdown. Nepal time.' }),
      biField(m, ['weddingDateBS'], { label: 'Date in Bikram Sambat', hint: 'Please have the family purohit check this date.', max: 120, placeholderEn: '29 Magh 2083 B.S.', placeholderNe: 'वि.सं. २०८३ साल माघ २९ गते, शुक्रबार' }),
      biField(m, ['city'], { label: 'City', max: 120, placeholderEn: 'Kathmandu, Nepal', placeholderNe: 'काठमाडौं, नेपाल' }),
    ),
  );
}

// ── Ceremonies ────────────────────────────────────────────────────────────

const eventId = (title, taken) => {
  const base = (title || 'ceremony').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'ceremony';
  let id = base.length >= 2 ? base : `${base}-1`;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
};

function colorsEditor(ctx, path) {
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

function eventBody(ctx, i) {
  const m = ctx.m;
  const p = ['events', i];
  const ev = m.get(p);
  return [
    h('div.split.split--photo',
      photoSlot(m, [...p, 'photo'], ctx, { label: 'Venue or ceremony photo', hint: 'Landscape works best. Use the library if you have none yet.', shape: 'land', library: true }),
      h('div',
        biField(m, [...p, 'title'], { label: 'Ceremony name', max: 80, placeholderEn: 'Mehendi', placeholderNe: 'मेहन्दी' }),
        biField(m, [...p, 'blurb'], { label: 'One line about it', max: 240 }),
      ),
    ),
    h('div.split',
      dateTimeField(m, [...p, 'start'], { label: 'Starts' }),
      dateTimeField(m, [...p, 'end'], { label: 'Ends' }),
    ),
    biField(m, [...p, 'venue'], { label: 'Venue', max: 200, placeholderEn: 'Shanti Banquet, Jawalakhel, Lalitpur' }),
    textField(m, [...p, 'mapQuery'], { label: 'Map search', hint: 'What to search in Google Maps, e.g. the venue name and area.', max: 200 }),
    h('div.split',
      colorsEditor(ctx, [...p, 'dress', 'colors']),
      biField(m, [...p, 'dress', 'text'], { label: 'Dress code', max: 120, placeholderEn: 'Shades of green' }),
    ),
    group('Programme (optional)',
      repeater(m, [...p, 'rituals'], {
        itemName: 'programme item', addLabel: 'Add programme item', max: 12, empty: 'No programme items.',
        title: (r) => `${typeof r.time === 'object' ? label(r.time) : r.time || ''} ${label(r.title)}`.trim(),
        create: () => ({ time: '', title: blank() }),
        render: (j) => {
          const r = ev.rituals[j];
          return h('div.ritual',
            typeof r.time === 'object'
              ? biField(m, [...p, 'rituals', j, 'time'], { label: 'Time', max: 40 })
              : textField(m, [...p, 'rituals', j, 'time'], { label: 'Time', max: 40, placeholder: '10:30' }),
            biField(m, [...p, 'rituals', j, 'title'], { label: 'What happens', max: 120 }),
          );
        },
      }),
    ),
  ];
}

export function ceremoniesSection(ctx) {
  const m = ctx.m;
  return section('Ceremonies', 'Every event guests are invited to, in order. Personalised links can show a guest only some of them.',
    repeater(m, ['events'], {
      itemName: 'ceremony', addLabel: 'Add ceremony', max: 12, collapsible: true, open: openItems,
      title: (e) => [label(e.title, 'New ceremony'), e.start ? new Date(e.start).toLocaleDateString('en-GB', { timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short' }) : ''].filter(Boolean).join(' · '),
      confirmRemove: (e) => confirmDialog({ title: 'Remove this ceremony?', message: `“${label(e.title, 'This ceremony')}” and its details will be removed. Replies already received keep their answers.`, confirm: 'Remove', danger: true }),
      create: () => {
        const taken = (m.get(['events']) || []).map((e) => e.id);
        const last = (m.get(['events']) || []).at(-1);
        const day = (last?.start || m.get(['weddingDate']) || '').slice(0, 10);
        return {
          id: eventId('ceremony', taken), title: blank(), blurb: blank(),
          start: day ? `${day}T10:00:00+05:45` : '', end: day ? `${day}T13:00:00+05:45` : '',
          venue: blank(), mapQuery: '', dress: { colors: [], text: blank() }, photo: null,
        };
      },
      render: (i) => eventBody(ctx, i),
    }),
  );
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
      group('Bundled tracks', h('p.hint', 'Guests can switch between the tracks you include. Music never plays until a guest taps to open the invitation.'),
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

// ── Theme ─────────────────────────────────────────────────────────────────

export function themeSection(ctx) {
  const m = ctx.m;
  const list = h('div.themes', { role: 'radiogroup', 'aria-label': 'Theme' });
  const render = () => {
    clear(list);
    const cur = m.get(['theme']);
    ctx.meta.themes.forEach((t, i) => {
      const id = `theme-${t.slug}`;
      const thumb = h('span.theme__thumb', h('span.theme__ph', { 'aria-hidden': 'true' }, t.name));
      const img = h('img', { src: `/themes/${t.slug}/thumb.jpg`, alt: '', loading: 'lazy', decoding: 'async', onerror: (e) => e.target.remove(), onload: (e) => e.target.classList.add('is-loaded') });
      thumb.prepend(img);
      list.append(h('label.theme', { for: id, class: cur === t.slug ? 'is-on' : '' },
        h('input.sr-only', { type: 'radio', name: 'theme', id, value: t.slug, checked: cur === t.slug, onchange: () => { m.set(['theme'], t.slug); ctx.onTheme?.(t.slug); render(); showCarry(); list.querySelector(`#${id}`)?.focus(); } }),
        thumb,
        h('span.theme__text', h('b', t.name, cur === t.slug ? h('span.theme__on', icon('check', 14), 'Selected') : null), h('small', t.concept)),
      ));
      void i;
    });
  };
  const carry = h('div.carry', { 'aria-live': 'polite' });
  const name = (t) => ctx.meta.themes.find((x) => x.slug === t)?.name || t;
  const showCarry = async () => {
    const t = m.get(['theme']);
    const c = await carryOver(ctx, t);
    if (m.get(['theme']) !== t) return;
    const li = (ok, text) => h('li', { class: ok ? 'is-yes' : 'is-no' }, h('span.carry__mark', { 'aria-hidden': 'true' }, ok ? '✓' : '–'), text);
    clear(carry).append(
      h('h3.group__title', `What carries over to ${name(t)}`),
      h('ul.carry__list',
        li(true, 'Names, families, dates, ceremonies, story, card wording, gallery, guest info, music and RSVP settings'),
        li(c.portraits > 0, `${c.portraits} couple photo${c.portraits === 1 ? '' : 's'}${c.bride || c.groom ? ', plus the bride and groom portraits' : ''}: used wherever ${name(t)} shows the couple`),
        c.shown.length ? li(true, `Shared content shown here: ${c.shown.join(', ')}`) : null,
        c.notShown.length ? li(false, `Kept but not shown by ${name(t)}: ${c.notShown.join(', ')}`) : null,
        c.others.length ? li(false, `Changes made only for ${c.others.map(name).join(', ')} stay saved and return if you switch back`) : null,
        c.hasManifest ? null : li(false, `${name(t)} has not published its editable content list yet, so its own photos and lines use the theme defaults for now`),
      ),
      h('a.btn.btn--sm', { href: `#/i/${ctx.slug}/content` }, `Edit ${name(t)} content`),
    );
  };
  render();
  showCarry();
  return section('Theme', 'Eight designs. Switching keeps every word and photo; the preview updates straight away.', carry, list);
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

// ── Sharing ───────────────────────────────────────────────────────────────

export function shareSection(ctx) {
  const m = ctx.m;
  const live = ctx.doc.status === 'published';
  const events = m.get(['events']) || [];
  const linkOut = h('input.input.link__out', { type: 'text', readonly: true, 'aria-label': 'Personalised link', onfocus: (e) => e.target.select() });
  const nameIn = h('input.input', { type: 'text', id: 'to-name', maxlength: 60, placeholder: 'e.g. Maiju & family', autocomplete: 'off' });
  const picks = events.map((e) => h('input', { type: 'checkbox', value: e.id, checked: true }));
  const update = () => {
    const u = new URL(ctx.shareUrl());
    const name = nameIn.value.trim();
    if (name) u.searchParams.set('to', name);
    const chosen = picks.filter((p) => p.checked).map((p) => p.value);
    if (chosen.length && chosen.length < events.length) u.searchParams.set('e', chosen.join(','));
    linkOut.value = u.href;
  };
  nameIn.addEventListener('input', update);
  picks.forEach((p) => p.addEventListener('change', update));
  update();
  const main = ctx.shareUrl();
  return section('Sharing', 'The link guests open, and how it looks when pasted into WhatsApp or Viber.',
    live ? null : h('p.notice', 'This invitation is not published yet. Links will show “not found” to guests until you publish.'),
    group('Invitation link',
      h('div.link', h('input.input.link__out', { type: 'text', readonly: true, value: main, 'aria-label': 'Invitation link', onfocus: (e) => e.target.select() }),
        h('button.btn', { type: 'button', onclick: () => copyText(main) }, icon('copy', 16), 'Copy'),
        h('a.btn', { href: main, target: '_blank', rel: 'noopener' }, icon('external', 16), 'Open')),
    ),
    group('Personalised link',
      h('p.hint', 'Greets one guest by name, and can show them only the ceremonies they are invited to.'),
      h('div.field', h('label.label', { for: 'to-name' }, 'Guest name'), nameIn),
      events.length > 1 ? h('fieldset.field', h('legend.label', 'Ceremonies shown'),
        h('div.chips', events.map((e, i) => h('label.chip', picks[i], h('span', label(e.title, e.id)))))) : null,
      h('div.link', linkOut, h('button.btn.btn--primary', { type: 'button', onclick: () => copyText(linkOut.value) }, icon('copy', 16), 'Copy link')),
    ),
    group('Link preview',
      textField(m, ['share', 'title'], { label: 'Preview title', max: 140, placeholder: 'Aarati & Sameer · Shubha Bibaha' }),
      textField(m, ['share', 'description'], { label: 'Preview text', max: 300, multiline: true, rows: 2 }),
      h('p.hint', 'The first couple photo is used as the preview image.'),
    ),
  );
}

export const SECTIONS = [
  { id: 'couple', name: 'Couple & families', render: coupleSection },
  { id: 'date', name: 'Date & place', render: dateSection },
  { id: 'ceremonies', name: 'Ceremonies', render: ceremoniesSection },
  { id: 'story', name: 'Story', render: storySection },
  { id: 'gallery', name: 'Gallery', render: gallerySection },
  { id: 'wording', name: 'Card wording', render: wordingSection },
  { id: 'music', name: 'Music', render: musicSection },
  { id: 'theme', name: 'Theme', render: themeSection },
  { id: 'content', name: 'Theme content', render: contentSection },
  { id: 'info', name: 'Guest info', render: infoSection },
  { id: 'rsvp', name: 'RSVP settings', render: rsvpSection },
  { id: 'share', name: 'Sharing', render: shareSection },
];
