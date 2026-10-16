// Music: several tracks, equal-power crossfades through Web Audio (iOS ignores
// element.volume), a pill in the HUD and a bottom sheet to pick a track.
// With `music.youtube.id` the song plays through YouTube's IFrame API instead, in a small
// visible player inside the sheet (YouTube's terms forbid hidden players and extracting the
// audio). If YouTube cannot load or refuses the video, the MP3 tracks take over.
import { bi, esc } from './i18n.js';
import { lockScroll, unlockScroll } from './modal.js';

// Remembered per invitation, so one invitation's choices never carry over to another.
const INV = (() => { try { return new URLSearchParams(location.search).get('id') || location.pathname; } catch { return ''; } })();
const KEY_MUTED = `nimtto-muted:${INV}`;
const KEY_TRACK = `nimtto-track:${INV}`;
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const YT_API_TIMEOUT = 10000;
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

/** Loads the YouTube IFrame API once; rejects on error or after 10 s. */
let ytApi = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApi) return ytApi;
  ytApi = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('YouTube API timed out')), YT_API_TIMEOUT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      try { prev?.(); } catch { /* someone else's hook */ }
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => { clearTimeout(timer); reject(new Error('YouTube API failed to load')); };
    document.head.append(s);
  });
  ytApi.catch(() => { ytApi = null; });
  return ytApi;
}

/** A valid `music.youtube` object, or null. */
function youtubeOf(yt) {
  if (!yt || typeof yt !== 'object' || !YT_ID.test(String(yt.id ?? ''))) return null;
  const start = Number.isInteger(yt.start) && yt.start >= 0 && yt.start <= 36000 ? yt.start : 0;
  const title = typeof yt.title === 'string' ? yt.title.slice(0, 120) : '';
  return { id: yt.id, start, title };
}

export function createPlayer({ tracks: ownTracks = [], volume = 0.7, youtube = null, fallbackTracks = [] } = {}) {
  const tracks = ownTracks?.length ? ownTracks : fallbackTracks;
  const pill = document.getElementById('music-pill');
  const sheet = document.getElementById('music-sheet');
  const list = sheet.querySelector('.sheet__list');
  const ytBox = sheet.querySelector('.sheet__yt');
  const nameEl = pill.querySelector('.pill__name');
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  const chans = tracks.map((t) => ({ t, el: null, gain: null }));
  // The couple's first song always plays on the first open. A guest's own pick is kept only while the couple's
  // first song is unchanged (a new upload or "Play first" starts everyone on the new song again).
  const pickedIndex = () => {
    try {
      const p = JSON.parse(store.get(KEY_TRACK) || 'null');
      if (!p || p.first !== tracks[0]?.src) return 0;
      const i = tracks.findIndex((t) => t.src === p.src);
      return i >= 0 ? i : 0;
    } catch { return 0; }
  };
  let current = pickedIndex();
  let playing = false;

  // YouTube state. mode: 'yt' while YouTube is in charge, 'mp3' otherwise.
  const yt = youtubeOf(youtube);
  let mode = yt ? 'yt' : 'mp3';
  let ytp = null;          // YT.Player once ready
  let ytWant = false;      // the guest asked for music before the player was ready
  let ytDuck = 1;
  let ytFade = 0;

  const chan = (i) => {
    const c = chans[i];
    if (!c.el) {
      c.el = new Audio();
      c.el.src = c.t.src;
      c.el.loop = true;
      c.el.preload = 'auto';
      if (ctx) {
        c.gain = ctx.createGain();
        c.gain.gain.value = 0;
        ctx.createMediaElementSource(c.el).connect(c.gain).connect(master);
      }
    }
    return c;
  };

  const ramp = (c, to, secs) => {
    if (c.gain) {
      const g = c.gain.gain;
      const now = ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(to, now + secs);
    } else {
      c.el.volume = to; // desktop fallback without Web Audio
    }
  };

  const renderList = () => {
    list.innerHTML = tracks.map((t, i) => `
    <li><button type="button" role="menuitemradio" data-track="${i}" aria-checked="false">
      <span class="trk__eq" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="trk__text"><b>${bi(t.title)}</b><small>${bi(t.mood)}</small></span>
    </button></li>`).join('');
  };

  const render = () => {
    pill.setAttribute('aria-pressed', String(playing));
    if (mode === 'yt') {
      nameEl.innerHTML = yt.title ? `<span>${esc(yt.title)}</span>` : bi({ en: 'Our song', ne: 'हाम्रो गीत' });
    } else if (tracks.length) {
      nameEl.innerHTML = bi(tracks[current].title);
    }
    list.hidden = mode === 'yt';
    if (ytBox) ytBox.hidden = mode !== 'yt';
    list.querySelectorAll('button[data-track]').forEach((b) => {
      const on = Number(b.dataset.track) === current;
      b.setAttribute('aria-checked', String(on));
      b.classList.toggle('is-playing', on && playing);
    });
    sheet.querySelector('[data-act="toggle"]').innerHTML = playing
      ? bi({ en: 'Pause music', ne: 'संगीत रोक्नुहोस्' })
      : bi({ en: 'Play music', ne: 'संगीत बजाउनुहोस्' });
  };

  renderList();

  /** Must run inside a user gesture (the door tap / seal). */
  const unlock = () => {
    if (!ctx && AC) {
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 1;
        master.connect(ctx.destination);
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* unsupported */ }
      } catch { ctx = null; }
    }
    ctx?.resume?.();
  };

  // --- MP3 ------------------------------------------------------------------------------------
  const playMp3 = (i = current, fade = 2.2) => {
    if (!tracks.length) return;
    unlock();
    const prev = chans[current];
    const next = chan(i);
    if (i !== current && prev.el) {
      ramp(prev, 0, fade);
      setTimeout(() => prev.el.pause(), fade * 1000 + 120);
    }
    current = i;
    store.set(KEY_TRACK, JSON.stringify({ first: tracks[0]?.src, src: tracks[i]?.src }));
    next.el.play().then(() => {
      playing = true;
      ramp(next, volume, fade);
      store.set(KEY_MUTED, '0');
      render();
    }).catch(() => { playing = false; render(); });
  };

  const pauseMp3 = () => {
    const c = chans[current];
    playing = false;
    store.set(KEY_MUTED, '1');
    render();
    if (!c?.el) return;
    ramp(c, 0, 0.6);
    setTimeout(() => { if (!playing) c.el.pause(); }, 700);
  };

  // --- YouTube --------------------------------------------------------------------------------
  const ytVolume = () => Math.round(Math.max(0, Math.min(1, volume)) * 100 * ytDuck);
  /** Gentle fade-in through setVolume (YouTube has no gain node). */
  const ytFadeIn = (secs) => {
    clearInterval(ytFade);
    if (!ytp) return;
    const steps = Math.max(1, Math.round(secs * 10));
    let k = 0;
    ytp.setVolume(0);
    ytFade = setInterval(() => {
      k++;
      try { ytp.setVolume(Math.round(ytVolume() * Math.min(1, k / steps))); } catch { /* destroyed */ }
      if (k >= steps) clearInterval(ytFade);
    }, 100);
  };

  const playYt = (fade = 2) => {
    unlock();
    store.set(KEY_MUTED, '0');
    if (!ytp) { ytWant = true; return; }
    try {
      ytp.unMute();
      ytFadeIn(fade);
      ytp.playVideo();
    } catch { fallback(true); }
  };

  const pauseYt = () => {
    ytWant = false;
    playing = false;
    store.set(KEY_MUTED, '1');
    clearInterval(ytFade);
    try { ytp?.pauseVideo(); } catch { /* not ready */ }
    render();
  };

  /** YouTube failed: hand over to the MP3 tracks (keeping "play" if the guest wanted music). */
  function fallback(wantMusic = ytWant || playing) {
    if (mode !== 'yt') return;
    mode = 'mp3';
    clearInterval(ytFade);
    try { ytp?.destroy(); } catch { /* already gone */ }
    ytp = null;
    ytWant = false;
    playing = false;
    if (ytBox) ytBox.innerHTML = '';
    render();
    if (wantMusic && store.get(KEY_MUTED) !== '1') playMp3(current, 1.5);
  }

  function initYouTube() {
    const mount = ytBox?.querySelector('.sheet__yt-frame');
    if (!mount) { fallback(false); return; }
    const target = document.createElement('div');
    mount.append(target);
    loadYouTubeApi().then((YT) => {
      if (mode !== 'yt') return;
      // eslint-disable-next-line no-new
      new YT.Player(target, {
        host: 'https://www.youtube-nocookie.com',
        videoId: yt.id,
        width: '100%',
        height: '100%',
        playerVars: { start: yt.start, playsinline: 1, rel: 0, controls: 1, fs: 0, disablekb: 1, origin: location.origin },
        events: {
          onReady: (e) => {
            if (mode !== 'yt') return;
            ytp = e.target;
            const f = ytp.getIframe?.();
            if (f) f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0';
            ytp.setVolume(ytVolume());
            if (ytWant) playYt(2.5);
          },
          onStateChange: (e) => {
            if (mode !== 'yt') return;
            const S = YT.PlayerState;
            if (e.data === S.PLAYING) { playing = true; ytWant = false; render(); }
            else if (e.data === S.PAUSED) { playing = false; render(); }
            else if (e.data === S.ENDED) { try { ytp.seekTo(yt.start, true); ytp.playVideo(); } catch { /* gone */ } }
          },
          // 2 bad id, 5 HTML5 error, 100 removed/private, 101/150 embedding not allowed
          onError: () => fallback(),
        },
      });
    }).catch(() => fallback());
  }

  const play = (i, fade) => (mode === 'yt' ? playYt(fade) : playMp3(i, fade));
  const pause = () => (mode === 'yt' ? pauseYt() : pauseMp3());

  // Sheet
  const open = () => {
    sheet.hidden = false;
    lockScroll();
    requestAnimationFrame(() => sheet.classList.add('is-open'));
    pill.setAttribute('aria-expanded', 'true');
    (mode === 'yt' ? sheet.querySelector('[data-act="toggle"]') : sheet.querySelector('button[aria-checked="true"]'))?.focus();
  };
  const close = () => {
    if (sheet.hidden) return;
    unlockScroll();
    sheet.classList.remove('is-open');
    pill.setAttribute('aria-expanded', 'false');
    setTimeout(() => { sheet.hidden = true; }, 320);
    pill.focus();
  };
  pill.addEventListener('click', () => (sheet.hidden ? open() : close()));
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet || e.target.closest('[data-act="close"]')) return close();
    if (e.target.closest('[data-act="toggle"]')) return playing ? pause() : play(current, 1.2);
    const b = e.target.closest('button[data-track]');
    if (b) play(Number(b.dataset.track));
  });
  sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  let resumeYt = false;
  document.addEventListener('visibilitychange', () => {
    if (mode === 'yt') {
      if (!ytp) return;
      try {
        if (document.hidden) { resumeYt = playing; if (playing) ytp.pauseVideo(); }
        else if (resumeYt) ytp.playVideo();
      } catch { /* gone */ }
      return;
    }
    const c = chans[current];
    if (!c?.el) return;
    if (document.hidden) c.el.pause();
    else if (playing) c.el.play().catch(() => {});
  });

  render();
  if (mode === 'yt') initYouTube();
  return {
    get ctx() { return ctx; },
    unlock,
    /** Called from the entry gesture. `withMusic` false = "Enter quietly". */
    start: (withMusic = true) => {
      unlock();
      if (withMusic && store.get(KEY_MUTED) !== '1') play(current, 3);
      else render();
    },
    duck: (on) => {
      if (mode === 'yt') {
        ytDuck = on ? 0.3 : 1;
        clearInterval(ytFade);
        try { ytp?.setVolume(ytVolume()); } catch { /* not ready */ }
        return;
      }
      if (master) master.gain.setTargetAtTime(on ? 0.3 : 1, ctx.currentTime, 0.3);
    },
  };
}

/** Markup for the pill + sheet; inserted by the HUD. */
export const playerMarkup = () => `
  <button class="pill" id="music-pill" type="button" aria-pressed="false" aria-expanded="false" aria-controls="music-sheet">
    <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <span class="pill__name"></span>
    <span class="sr-only">Music: choose a track</span>
  </button>
  <div class="sheet" id="music-sheet" hidden role="dialog" aria-modal="true" aria-label="Music" data-lenis-prevent>
    <div class="sheet__panel">
      <div class="sheet__head">
        <p class="eyebrow">${bi({ en: 'Choose the music', ne: 'संगीत छान्नुहोस्' })}</p>
        <button type="button" class="sheet__close" data-act="close"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
      </div>
      <ul class="sheet__list" role="menu"></ul>
      <div class="sheet__yt" hidden style="margin:10px 0 16px">
        <div class="sheet__yt-frame" style="position:relative;width:100%;max-width:320px;aspect-ratio:16/9;margin:0 auto;border-radius:10px;overflow:hidden;background:#000"></div>
      </div>
      <button type="button" class="btn btn--ghost sheet__toggle" data-act="toggle"></button>
    </div>
  </div>`;
