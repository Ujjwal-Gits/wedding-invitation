// Music: our bundled songs (listen first), your own MP3, or a YouTube link that plays inside the
// invitation's music player. A YouTube link, when set, plays instead of the songs.
import { h, icon, iconBtn, clear, toast, card, fill } from './dom.js';
import { upload, api } from './api.js';
import { biField } from './fields.js';

const label = (v, f = '') => (v && (v.en || v.ne)) || f;
const blank = () => ({ en: '', ne: '' });

/** The 11-character video id from any youtube.com / youtu.be / shorts / embed link, or from a bare id. */
export function youtubeId(input) {
  const s = String(input || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.split('/')[1];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v');
    const p = u.pathname.split('/').filter(Boolean);
    if (!id && ['shorts', 'embed', 'live', 'v'].includes(p[0])) id = p[1];
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** "1:30", "90", "1m30s" or a link's ?t= into seconds. */
function seconds(v) {
  const s = String(v || '').trim();
  if (!s) return 0;
  if (/^\d+$/.test(s)) return Number(s);
  const mmss = /^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/.exec(s);
  if (mmss) return mmss[3] != null ? Number(mmss[1]) * 3600 + Number(mmss[2]) * 60 + Number(mmss[3]) : Number(mmss[1]) * 60 + Number(mmss[2]);
  const hms = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(s);
  if (hms && s) return Number(hms[1] || 0) * 3600 + Number(hms[2] || 0) * 60 + Number(hms[3] || 0);
  return null;
}
const MAX_SONGS = 8;
// The site's music library (GET /api/music), loaded once per page; the planner manages it in Music library.
let library = null;
let libraryLoad = null;
function loadLibrary() {
  libraryLoad ||= api('/music').then((out) => { library = out; return out; }).finally(() => { libraryLoad = null; });
  return libraryLoad;
}
/** A library song as an invitation track (what the invitation stores and audio.js plays). */
function asInvitationTrack(t) {
  const mood = library?.moods.find((x) => x.id === t.mood);
  return { title: { en: t.title, ne: t.titleNe || '' }, mood: { en: mood?.en || '', ne: mood?.ne || '' }, src: t.src, credit: t.credit || '' };
}
const mmss = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

let player = null; // one shared <audio> for listening (the couple's Music module and the planner's Music library)
/** Stops the listening player (a module's cleanup). */
export const stopListening = () => { player?.pause(); document.querySelectorAll('.playbtn.is-playing').forEach((b) => { b.classList.remove('is-playing'); b.replaceChildren(icon('play', 16)); }); };
function listen(src, btn) {
  if (!player) player = new Audio();
  const playing = player.dataset.src === src && !player.paused;
  document.querySelectorAll('.playbtn.is-playing').forEach((b) => { b.classList.remove('is-playing'); b.replaceChildren(icon('play', 16)); b.setAttribute('aria-label', b.dataset.label); });
  if (playing) { player.pause(); return; }
  player.src = src;
  player.dataset.src = src;
  player.play().catch(() => toast('This track could not be played here.', 'error'));
  btn.classList.add('is-playing');
  btn.replaceChildren(icon('pause', 16));
  btn.setAttribute('aria-label', `Pause ${btn.dataset.label.replace(/^Play /, '')}`);
  player.onended = () => { btn.classList.remove('is-playing'); btn.replaceChildren(icon('play', 16)); };
}
export const playBtn = (src, name) => h('button.playbtn', { type: 'button', 'aria-label': `Play ${name}`, 'data-label': `Play ${name}`, title: 'Listen', onclick: (e) => listen(src, e.currentTarget) }, icon('play', 16));

export function musicModule(ctx) {
  const m = ctx.m;
  const root = h('div.stack');
  let tab = m.get(['music', 'youtube', 'id']) ? 'youtube' : 'songs';
  ctx.cleanup(() => { player?.pause(); });
  // Fresh library on every visit (the planner may have changed it); the cached one shows meanwhile.
  if (library) loadLibrary().then(() => { if (tab === 'songs' && root.isConnected) draw(); }, () => {});

  const tracks = () => { if (!m.get(['music', 'tracks'])) m.data.music = { ...(m.data.music || {}), tracks: [] }; return m.get(['music', 'tracks']); };

  function nowPlaying() {
    const yt = m.get(['music', 'youtube']);
    const first = (m.get(['music', 'tracks']) || [])[0];
    return h('section.card.nowplay',
      h('span.nowplay__icon', icon(yt?.id ? 'youtube' : 'music', 22)),
      h('div.nowplay__body',
        h('p.eyebrow', 'Guests hear'),
        h('p.nowplay__title', yt?.id ? (yt.title || 'Your YouTube video') : first ? label(first.title, 'Your song') : 'No music'),
        h('p.nowplay__sub', yt?.id ? `YouTube${yt.start ? ` · from ${mmss(yt.start)}` : ''}` : first ? `${(m.get(['music', 'tracks']) || []).length} song${(m.get(['music', 'tracks']) || []).length === 1 ? '' : 's'} · guests can switch` : 'Pick a song below')),
      h('p.nowplay__note', 'Music starts only when a guest opens the invitation, and they can mute it any time.'));
  }

  function songs() {
    if (!library) {
      loadLibrary().then(draw, (err) => toast(err.message, 'error'));
      return [h('p.muted', 'Loading the music library…')];
    }
    const list = tracks();
    const has = (src) => list.some((t) => t.src === src);
    const own = (t) => t.src.startsWith(`/uploads/${ctx.slug}/`);
    const libBySrc = new Map(library.tracks.map((t) => [t.src, t]));
    const toggleTrack = (t, on) => {
      if (on && !has(t.src)) {
        if (list.length >= MAX_SONGS) { toast(`Up to ${MAX_SONGS} songs. Remove one first.`, 'error'); draw(); return; }
        list.push(asInvitationTrack(t));
      }
      if (!on) { const i = list.findIndex((x) => x.src === t.src); if (i >= 0) list.splice(i, 1); }
      m.touch(['music', 'tracks']);
      draw();
    };
    const first = (src) => { const i = list.findIndex((t) => t.src === src); if (i > 0) { const [t] = list.splice(i, 1); list.unshift(t); m.touch(['music', 'tracks']); draw(); } };
    const removeAt = (idx) => { list.splice(idx, 1); m.touch(['music', 'tracks']); draw(); };
    // A library song (lib), or a song already in the invitation (chosen, with its index) that is not in the library.
    const row = ({ lib, chosen, idx, sub }) => {
      const src = lib?.src || chosen.src;
      const on = has(src);
      const name = lib ? lib.title : label(chosen.title, 'Your song');
      const isFirst = list[0]?.src === src;
      return h('li.song', { class: on ? 'is-on' : '' },
        playBtn(src, name),
        h('div.song__text', h('b', name), h('small', sub)),
        isFirst ? h('span.pill.pill--accent', 'Plays first') : on ? h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: () => first(src) }, 'Play first') : null,
        lib
          ? h('label.check', h('input', { type: 'checkbox', checked: on, onchange: (e) => toggleTrack(lib, e.target.checked), 'aria-label': `Include ${name}` }), h('span', on ? 'Included' : 'Include'))
          : iconBtn('trash', `Remove ${name}`, () => removeAt(idx)));
    };
    const customs = list.map((t, i) => ({ t, i })).filter(({ t }) => own(t));
    const others = list.map((t, i) => ({ t, i })).filter(({ t }) => !own(t) && !libBySrc.has(t.src));
    const groups = library.moods.map((mood) => ({ mood, items: library.tracks.filter((t) => t.mood === mood.id) })).filter((g) => g.items.length);
    return [
      h('p.hint', icon('info', 14), `Listen, then include one or more songs (up to ${MAX_SONGS}). Guests hear the first one and can switch.`),
      ...groups.map((g) => h('div.songgroup', h('h3.subhead', g.mood.en), h('ul.songs', g.items.map((t) => row({ lib: t, sub: [t.artist, mmss(Math.round(t.duration || 0))].filter(Boolean).join(' · ') }))))),
      others.length ? h('div.songgroup', h('h3.subhead', 'Also in your invitation'), h('p.hint', 'No longer in the music library. It still plays; remove it to stop.'), h('ul.songs', others.map(({ t, i }) => row({ chosen: t, idx: i, sub: label(t.mood) || 'Song' })))) : null,
      customs.length ? h('div.songgroup', h('h3.subhead', 'Your songs'), h('ul.songs', customs.map(({ t, i }) => h('li.song-wrap', row({ chosen: t, idx: i, sub: 'Your upload' }), h('div.song__edit', biField(m, ['music', 'tracks', i, 'title'], { label: 'Song title', max: 80 })))))) : null,
    ];
  }

  function mp3() {
    const input = h('input', { type: 'file', accept: 'audio/mpeg,.mp3', hidden: true });
    const bar = h('span.queue__bar');
    const status = h('span.queue__status');
    const prog = h('div.queue__item.is-active', { hidden: true }, icon('music', 18), h('span.queue__name', 'Uploading'), status, h('span.queue__track', bar));
    input.onchange = async () => {
      const f = input.files[0];
      input.value = '';
      if (!f) return;
      if (f.size > 15 * 1024 * 1024) { toast('That file is larger than 15 MB.', 'error'); return; }
      prog.hidden = false;
      prog.querySelector('.queue__name').textContent = f.name;
      try {
        const out = await upload(ctx.slug, f, 'audio', (p) => { bar.style.transform = `scaleX(${p})`; status.textContent = `${Math.round(p * 100)}%`; });
        const list = tracks();
        list.unshift({ title: { en: f.name.replace(/\.mp3$/i, '').slice(0, 80), ne: '' }, mood: blank(), src: out.src, credit: '' });
        if (m.get(['music', 'youtube'])) delete m.data.music.youtube;
        m.touch(['music', 'tracks']);
        toast('Song uploaded. It plays first.', 'success');
        tab = 'songs';
        draw();
      } catch (err) { toast(err.message, 'error'); prog.hidden = true; }
    };
    return h('div.stack',
      h('button.droparea', { type: 'button', onclick: () => input.click(),
        ondragover: (e) => { e.preventDefault(); e.currentTarget.classList.add('is-drop'); }, ondragleave: (e) => e.currentTarget.classList.remove('is-drop'),
        ondrop: (e) => { e.preventDefault(); e.currentTarget.classList.remove('is-drop'); const f = e.dataTransfer.files[0]; if (f) { const dt = new DataTransfer(); dt.items.add(f); input.files = dt.files; input.onchange(); } } },
      h('span.droparea__icon', icon('music', 22)), h('span.droparea__title', 'Upload your own song'), h('span.droparea__sub', 'MP3 only · up to 15 MB · only music you have the right to use')),
      input, prog);
  }

  function youtube() {
    const cur = m.get(['music', 'youtube']) || {};
    const link = h('input.input', { id: 'yt-link', type: 'url', inputmode: 'url', placeholder: 'https://youtu.be/…  or  https://www.youtube.com/watch?v=…', value: cur.id ? `https://youtu.be/${cur.id}` : '', autocomplete: 'off' });
    const err = h('p.field__err', { hidden: true, role: 'alert' });
    const out = h('div');
    const showCard = (id, startFromLink) => {
      clear(out);
      if (!id) return;
      const using = m.get(['music', 'youtube', 'id']) === id;
      const y = using ? m.get(['music', 'youtube']) : { id, start: startFromLink || 0, title: '' };
      const title = h('input.input', { id: 'yt-title', maxlength: 120, value: y.title || '', placeholder: 'e.g. Our song', oninput: (e) => { if (using) m.set(['music', 'youtube', 'title'], e.target.value); else y.title = e.target.value; } });
      const start = h('input.input', { id: 'yt-start', inputmode: 'numeric', placeholder: '0:00', value: y.start ? mmss(y.start) : '', onchange: (e) => {
        const n = seconds(e.target.value);
        if (n == null || n > 36000) { e.target.setAttribute('aria-invalid', 'true'); return; }
        e.target.removeAttribute('aria-invalid');
        if (using) m.set(['music', 'youtube', 'start'], n); else y.start = n;
      } });
      out.append(h('div.ytcard',
        h('div.ytcard__thumb', h('img', { src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }), h('span.ytcard__play', icon('youtube', 28))),
        h('div.ytcard__body',
          h('p.ytcard__id', `Video ${id}`),
          h('div.field', h('label.label', { for: 'yt-title' }, 'Title shown to guests'), title),
          h('div.field.field--narrow', h('label.label', { for: 'yt-start' }, 'Start at (optional)'), start, h('p.hint', 'Minutes:seconds, e.g. 0:45, to skip an intro.')),
          using
            ? h('div.row', h('span.pill.pill--ok', icon('check', 13), 'Playing in your invitation'), h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: () => { delete m.data.music.youtube; m.touch(['music']); tab = 'songs'; draw(); } }, 'Stop using YouTube'))
            : h('button.btn.btn--primary', { type: 'button', onclick: () => {
              m.set(['music', 'youtube'], { id, ...(y.start ? { start: y.start } : {}), ...(y.title ? { title: y.title.trim() } : {}) });
              toast('YouTube music set', 'success');
              draw();
            } }, icon('check', 16), 'Use this video'))));
    };
    const parse = () => {
      const v = link.value.trim();
      if (!v) { err.hidden = true; clear(out); return; }
      const id = youtubeId(v);
      err.hidden = Boolean(id);
      err.textContent = id ? '' : 'That doesn’t look like a YouTube link. Copy it from the Share button on YouTube.';
      let t = 0;
      try { t = seconds(new URL(/^https?:/.test(v) ? v : `https://${v}`).searchParams.get('t') || '') || 0; } catch { /* no start */ }
      showCard(id, t);
    };
    link.addEventListener('input', parse);
    link.addEventListener('paste', () => setTimeout(parse));
    if (cur.id) showCard(cur.id);
    return h('div.stack',
      h('div.field', h('label.label', { for: 'yt-link' }, 'Paste a YouTube link'), link, err),
      out,
      h('p.tip', icon('info', 16), h('span', 'The video plays inside the invitation’s music player (a small player guests can see), starting when they open the invitation. Nothing is downloaded.')));
  }

  function draw() {
    const tabs = [['songs', 'Our music', 'music'], ['mp3', 'Your MP3', 'upload'], ['youtube', 'YouTube link', 'youtube']];
    const body = tab === 'songs' ? songs() : tab === 'mp3' ? mp3() : youtube();
    const yt = m.get(['music', 'youtube', 'id']);
    fill(root, 
      nowPlaying(),
      h('section.card',
        h('div.tabs', { role: 'tablist', 'aria-label': 'Music source' }, tabs.map(([id, t, ic]) => h('button.tabs__btn', { type: 'button', role: 'tab', 'aria-selected': String(tab === id), onclick: () => { tab = id; draw(); } }, icon(ic, 16), t))),
        yt && tab !== 'youtube' ? h('p.notice', icon('info', 16), h('span', 'A YouTube video plays instead of these songs. ', h('button.link', { type: 'button', onclick: () => { delete m.data.music.youtube; m.touch(['music']); draw(); } }, 'Use the songs instead'))) : null,
        h('div.tabs__panel', { role: 'tabpanel' }, body)),
      h('section.card', h('header.card__head', h('h2.card__title', 'Volume')), (() => {
        const v = Math.round((m.get(['music', 'volume']) ?? 0.75) * 100);
        const outEl = h('output.vol__out', { for: 'vol' }, `${v}%`);
        return h('div.vol', h('label.sr-only', { for: 'vol' }, 'Starting volume'), icon('music', 16), h('input.range', { type: 'range', id: 'vol', min: 10, max: 100, step: 5, value: v, oninput: (e) => { outEl.textContent = `${e.target.value}%`; m.set(['music', 'volume'], Number(e.target.value) / 100); } }), outEl);
      })()));
  }
  draw();
  return root;
}
