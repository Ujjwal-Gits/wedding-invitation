// Music: our bundled songs (listen first), your own MP3, or a YouTube link that plays inside the
// invitation's music player. A YouTube link, when set, plays instead of the songs.
import { h, icon, iconBtn, clear, toast, card, fill } from './dom.js';
import { upload } from './api.js';
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
const mmss = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

let player = null; // one shared <audio> for listening
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
const playBtn = (src, name) => h('button.playbtn', { type: 'button', 'aria-label': `Play ${name}`, 'data-label': `Play ${name}`, title: 'Listen', onclick: (e) => listen(src, e.currentTarget) }, icon('play', 16));

export function musicModule(ctx) {
  const m = ctx.m;
  const root = h('div.stack');
  let tab = m.get(['music', 'youtube', 'id']) ? 'youtube' : 'songs';
  ctx.cleanup(() => { player?.pause(); });

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
    const list = tracks();
    const has = (src) => list.some((t) => t.src === src);
    const toggleTrack = (t, on) => {
      if (on && !has(t.src)) list.push(structuredClone(t));
      if (!on) { const i = list.findIndex((x) => x.src === t.src); if (i >= 0) list.splice(i, 1); }
      m.touch(['music', 'tracks']);
      draw();
    };
    const first = (src) => { const i = list.findIndex((t) => t.src === src); if (i > 0) { const [t] = list.splice(i, 1); list.unshift(t); m.touch(['music', 'tracks']); draw(); } };
    const row = (t, custom, idx) => {
      const on = has(t.src);
      const cur = list.find((x) => x.src === t.src) || t;
      const isFirst = list[0]?.src === t.src;
      return h('li.song', { class: on ? 'is-on' : '' },
        playBtn(t.src, label(cur.title, 'this song')),
        h('div.song__text', h('b', label(cur.title, 'Untitled song')), h('small', custom ? 'Your upload' : label(cur.mood))),
        isFirst ? h('span.pill.pill--accent', 'Plays first') : on ? h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: () => first(t.src) }, 'Play first') : null,
        custom
          ? iconBtn('trash', 'Remove this song', () => { list.splice(idx, 1); m.touch(['music', 'tracks']); draw(); })
          : h('label.check', h('input', { type: 'checkbox', checked: on, onchange: (e) => toggleTrack(t, e.target.checked), 'aria-label': `Include ${label(t.title)}` }), h('span', on ? 'Included' : 'Include')));
    };
    const customs = list.map((t, i) => ({ t, i })).filter(({ t }) => t.src.startsWith('/uploads/'));
    return [
      h('ul.songs', ctx.meta.tracks.map((t) => row(t, false))),
      customs.length ? h('div', h('h3.subhead', 'Your songs'), h('ul.songs', customs.map(({ t, i }) => h('li.song-wrap', row(t, true, i), h('div.song__edit', biField(m, ['music', 'tracks', i, 'title'], { label: 'Song title', max: 80 })))))) : null,
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
