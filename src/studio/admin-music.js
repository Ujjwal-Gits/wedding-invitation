// The planner's Music library: the songs every couple can choose for their invitation. Upload an MP3 (with
// progress), listen, edit the title, artist, credit and mood, turn songs on or off, drag to reorder, delete uploads.
// Built-in songs (public/audio, src/core/music-library.js) can be turned off but not deleted.
import { h, icon, iconBtn, toast, openDialog, confirmDialog, fill, debounce } from './dom.js';
import { api, postFormProgress } from './api.js';
import { playBtn, stopListening } from './m-music.js';

const MAX_MB = 15;
const mmss = (s) => { const n = Math.round(Number(s) || 0); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };
const moodSelect = (moods, cur, id) => h('select.input', { id }, moods.map((m) => h('option', { value: m.id, selected: m.id === cur }, m.en)));

/** Title, Nepali title, artist, mood and credit fields; returns { el, read() }. */
function trackFields(moods, t, prefix) {
  const f = {
    title: h('input.input', { id: `${prefix}-title`, maxlength: 80, required: true, value: t.title || '', autocomplete: 'off' }),
    titleNe: h('input.input', { id: `${prefix}-ne`, maxlength: 80, lang: 'ne', value: t.titleNe || '', autocomplete: 'off', placeholder: 'Optional' }),
    artist: h('input.input', { id: `${prefix}-artist`, maxlength: 80, value: t.artist || '', autocomplete: 'off', placeholder: 'Optional' }),
    mood: moodSelect(moods, t.mood || 'instrumental', `${prefix}-mood`),
    credit: h('input.input', { id: `${prefix}-credit`, maxlength: 300, value: t.credit || '', autocomplete: 'off', placeholder: '“Song” by Artist, CC BY 4.0, link' }),
  };
  const field = (key, label, hint) => h('div.field', h('label.label', { for: f[key].id }, label), f[key], hint ? h('p.hint', hint) : null);
  return {
    el: h('div.mlib__fields',
      field('title', 'Title'), field('titleNe', 'Title in Nepali'), field('artist', 'Artist'), field('mood', 'Mood'),
      h('div.mlib__wide', field('credit', 'Credit', 'Shown with the song and on the credits page. Required for CC BY music.'))),
    read: () => ({ title: f.title.value.trim(), titleNe: f.titleNe.value.trim(), artist: f.artist.value.trim(), mood: f.mood.value, credit: f.credit.value.trim() }),
    focus: () => f.title.focus(),
  };
}

export function musicLibrary(ctx) {
  const root = h('div.mlib', h('p.muted', 'Loading the library…'));
  ctx.cleanup(stopListening);
  let moods = [];
  let tracks = [];
  const moodName = (id) => moods.find((m) => m.id === id)?.en || id;

  // ── Upload ──
  const input = h('input', { type: 'file', accept: 'audio/mpeg,.mp3', hidden: true });
  const uploadBox = h('div.mlib__upload');
  const pick = () => input.click();
  input.onchange = () => { const f = input.files[0]; input.value = ''; if (f) prepare(f); };
  function dropArea() {
    return h('button.droparea.droparea--sm', { type: 'button', onclick: pick,
      ondragover: (e) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); e.currentTarget.classList.add('is-drop'); } },
      ondragleave: (e) => e.currentTarget.classList.remove('is-drop'),
      ondrop: (e) => { e.preventDefault(); e.currentTarget.classList.remove('is-drop'); const f = e.dataTransfer.files[0]; if (f) prepare(f); } },
    h('span.droparea__icon', icon('music', 22)), h('span.droparea__title', 'Add a song'),
    h('span.droparea__sub', `MP3 · up to ${MAX_MB} MB · only music you may share commercially (your own, CC0 or CC BY)`));
  }
  function prepare(file) {
    if (file.size > MAX_MB * 1024 * 1024) { toast(`That file is larger than ${MAX_MB} MB.`, 'error'); return; }
    if (!/\.mp3$/i.test(file.name) && file.type !== 'audio/mpeg') { toast('Please choose an MP3 file.', 'error'); return; }
    const fields = trackFields(moods, { title: file.name.replace(/\.mp3$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 80), mood: 'instrumental' }, 'up');
    const bar = h('span.queue__bar');
    const pct = h('span.queue__status', '0%');
    const prog = h('div.queue__item.is-active', { hidden: true }, icon('music', 18), h('span.queue__name', file.name), pct, h('span.queue__track', bar));
    const go = h('button.btn.btn--primary', { type: 'submit' }, icon('upload', 16), 'Upload');
    const cancel = h('button.btn.btn--quiet', { type: 'button', onclick: () => fill(uploadBox, dropArea()) }, 'Cancel');
    const form = h('form.mlib__form', { onsubmit: async (e) => {
      e.preventDefault();
      const v = fields.read();
      if (!v.title) { toast('Give the song a title.', 'error'); fields.focus(); return; }
      const fd = new FormData();
      for (const [k, x] of Object.entries(v)) fd.append(k, x);
      fd.append('file', file);
      go.disabled = true; cancel.disabled = true; prog.hidden = false;
      try {
        const out = await postFormProgress('/admin/music', fd, (p) => { bar.style.transform = `scaleX(${p})`; pct.textContent = `${Math.round(p * 100)}%`; });
        tracks.push(out.track);
        toast(`“${out.track.title}” added (${mmss(out.track.duration)})`, 'success');
        fill(uploadBox, dropArea());
        draw();
      } catch (err) {
        toast(err.message, 'error');
        go.disabled = false; cancel.disabled = false; prog.hidden = true;
      }
    } },
    h('p.mlib__file', icon('music', 16), h('b', file.name), h('span.muted', `${(file.size / 2 ** 20).toFixed(1)} MB`)),
    fields.el, prog, h('div.row', go, cancel));
    fill(uploadBox, form);
    fields.focus();
  }

  // ── List ──
  const list = h('ul.mlib__list', { 'aria-label': 'Songs, in the order couples see them' });
  const summary = h('p.toolbar2__note');
  const saveOrder = debounce(async () => {
    try { const out = await api('/admin/music', { method: 'PATCH', body: { order: tracks.map((t) => t.id) } }); tracks = out.tracks; } catch (err) { toast(err.message, 'error'); load(); }
  }, 400);
  const move = (id, by) => {
    const i = tracks.findIndex((t) => t.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= tracks.length) return;
    const [t] = tracks.splice(i, 1);
    tracks.splice(j, 0, t);
    draw();
    list.querySelector(`[data-id="${CSS.escape(id)}"] .mrow__grip`)?.focus();
    saveOrder();
  };
  async function patch(t, body, okMsg) {
    try {
      const out = await api(`/admin/music/${encodeURIComponent(t.id)}`, { method: 'PATCH', body });
      Object.assign(t, out.track);
      if (okMsg) toast(okMsg, 'success');
    } catch (err) { toast(err.message, 'error'); }
    draw();
  }
  function edit(t) {
    const fields = trackFields(moods, t, 'ed');
    const d = openDialog({
      title: 'Edit song',
      body: h('div.stack', fields.el, t.builtin ? h('p.hint', icon('info', 14), 'A built-in song: you can change how it is listed, or turn it off. Its file stays.') : null),
      actions: [
        h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'),
        h('button.btn.btn--primary', { type: 'button', onclick: async () => {
          const v = fields.read();
          if (!v.title) { toast('Give the song a title.', 'error'); fields.focus(); return; }
          d.close();
          await patch(t, v, 'Song updated');
        } }, 'Save'),
      ],
    });
  }
  async function remove(t) {
    const ok = await confirmDialog({ title: 'Delete this song?', message: `“${t.title}” leaves the library. Invitations that already play it keep it; nobody else can choose it.`, confirm: 'Delete', danger: true });
    if (!ok) return;
    try {
      const out = await api(`/admin/music/${encodeURIComponent(t.id)}`, { method: 'DELETE' });
      tracks = tracks.filter((x) => x.id !== t.id);
      toast(out.inUse ? `Deleted. ${out.inUse} invitation${out.inUse === 1 ? '' : 's'} still play${out.inUse === 1 ? 's' : ''} it.` : 'Song deleted', 'success');
      draw();
    } catch (err) { toast(err.message, 'error'); }
  }

  let dragId = null;
  function row(t, i) {
    const li = h('li.mrow', { class: t.enabled ? '' : 'is-off', 'data-id': t.id, draggable: 'true',
      ondragstart: (e) => { dragId = t.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); li.classList.add('is-drag'); },
      ondragend: () => {
        li.classList.remove('is-drag');
        if (!dragId) return;
        dragId = null;
        const ids = [...list.children].map((x) => x.dataset.id);
        if (ids.join() === tracks.map((x) => x.id).join()) return;
        tracks.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
        draw();
        saveOrder();
      },
      ondragover: (e) => {
        if (!dragId || dragId === t.id) return;
        e.preventDefault();
        const from = list.querySelector(`[data-id="${CSS.escape(dragId)}"]`);
        const r = li.getBoundingClientRect();
        li.parentNode.insertBefore(from, e.clientY > r.top + r.height / 2 ? li.nextSibling : li);
      },
      ondrop: (e) => e.preventDefault() },
    h('button.mrow__grip', { type: 'button', 'aria-label': `Move ${t.title}: arrow keys up or down`, title: 'Drag to reorder (or use the arrow keys)',
      onkeydown: (e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); move(t.id, e.key === 'ArrowUp' ? -1 : 1); } } }, icon('drag', 16)),
    playBtn(t.src, t.title),
    h('div.mrow__text',
      h('b', t.title, t.titleNe ? h('span.mrow__ne', { lang: 'ne' }, ` · ${t.titleNe}`) : null),
      h('small', [t.artist, moodName(t.mood), mmss(t.duration)].filter(Boolean).join(' · ')),
      t.credit ? h('small.mrow__credit', t.credit) : h('small.mrow__credit.is-missing', 'No credit yet')),
    t.builtin ? h('span.pill.pill--muted', 'Built-in') : h('span.pill.pill--accent', 'Uploaded'),
    h('label.check.mrow__on', h('input', { type: 'checkbox', checked: t.enabled, 'aria-label': `Offer ${t.title} to couples`, onchange: (e) => patch(t, { enabled: e.target.checked }, e.target.checked ? 'Song turned on' : 'Song turned off') }), h('span', t.enabled ? 'On' : 'Off')),
    h('div.mrow__acts',
      iconBtn('up', 'Move up', () => move(t.id, -1), 'mrow__step'),
      iconBtn('down', 'Move down', () => move(t.id, 1), 'mrow__step'),
      iconBtn('edit', `Edit ${t.title}`, () => edit(t)),
      t.builtin ? null : iconBtn('trash', `Delete ${t.title}`, () => remove(t))));
    if (i === 0) li.querySelector('.mrow__step')?.setAttribute('disabled', '');
    if (i === tracks.length - 1) li.querySelectorAll('.mrow__step')[1]?.setAttribute('disabled', '');
    return li;
  }

  function draw() {
    const on = tracks.filter((t) => t.enabled).length;
    summary.textContent = `${tracks.length} songs · ${on} offered to couples · ${tracks.filter((t) => !t.builtin).length} uploaded`;
    fill(list, tracks.map(row));
  }

  async function load() {
    try {
      const out = await api('/admin/music');
      moods = out.moods; tracks = out.tracks;
      fill(root,
        h('section.card', h('header.card__head', h('h2.card__title', 'Add music')), uploadBox, input),
        h('section.mlib__songs',
          h('div.toolbar2', summary),
          h('p.hint', icon('info', 14), 'Couples see the songs that are on, grouped by mood, in this order. Drag a song (or use its arrows) to move it.'),
          list));
      fill(uploadBox, dropArea());
      draw();
    } catch (err) {
      fill(root, h('p.notice.notice--error', err.message));
    }
  }
  load();
  return root;
}
