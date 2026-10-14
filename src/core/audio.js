// Music: several tracks, equal-power crossfades through Web Audio (iOS ignores
// element.volume), a pill in the HUD and a bottom sheet to pick a track.
import { bi, esc } from './i18n.js';
import { lockScroll, unlockScroll } from './modal.js';

const KEY_MUTED = 'sayapatri-muted';
const KEY_TRACK = 'sayapatri-track';
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

export function createPlayer({ tracks, volume = 0.7 }) {
  const pill = document.getElementById('music-pill');
  const sheet = document.getElementById('music-sheet');
  const list = sheet.querySelector('.sheet__list');
  const nameEl = pill.querySelector('.pill__name');
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  const chans = tracks.map((t) => ({ t, el: null, gain: null }));
  let current = Math.min(Number(store.get(KEY_TRACK) ?? 0) || 0, tracks.length - 1);
  let playing = false;

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

  const render = () => {
    pill.setAttribute('aria-pressed', String(playing));
    nameEl.innerHTML = bi(tracks[current].title);
    list.querySelectorAll('button[data-track]').forEach((b) => {
      const on = Number(b.dataset.track) === current;
      b.setAttribute('aria-checked', String(on));
      b.classList.toggle('is-playing', on && playing);
    });
    sheet.querySelector('[data-act="toggle"]').innerHTML = playing
      ? bi({ en: 'Pause music', ne: 'संगीत रोक्नुहोस्' })
      : bi({ en: 'Play music', ne: 'संगीत बजाउनुहोस्' });
  };

  list.innerHTML = tracks.map((t, i) => `
    <li><button type="button" role="menuitemradio" data-track="${i}" aria-checked="false">
      <span class="trk__eq" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="trk__text"><b>${bi(t.title)}</b><small>${bi(t.mood)}</small></span>
    </button></li>`).join('');

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

  const play = (i = current, fade = 2.2) => {
    unlock();
    const prev = chans[current];
    const next = chan(i);
    if (i !== current && prev.el) {
      ramp(prev, 0, fade);
      setTimeout(() => prev.el.pause(), fade * 1000 + 120);
    }
    current = i;
    store.set(KEY_TRACK, String(i));
    next.el.play().then(() => {
      playing = true;
      ramp(next, volume, fade);
      store.set(KEY_MUTED, '0');
      render();
    }).catch(() => { playing = false; render(); });
  };

  const pause = () => {
    const c = chans[current];
    playing = false;
    store.set(KEY_MUTED, '1');
    render();
    if (!c.el) return;
    ramp(c, 0, 0.6);
    setTimeout(() => { if (!playing) c.el.pause(); }, 700);
  };

  // Sheet
  const open = () => {
    sheet.hidden = false;
    lockScroll();
    requestAnimationFrame(() => sheet.classList.add('is-open'));
    pill.setAttribute('aria-expanded', 'true');
    sheet.querySelector('button[aria-checked="true"]')?.focus();
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

  document.addEventListener('visibilitychange', () => {
    const c = chans[current];
    if (!c.el) return;
    if (document.hidden) c.el.pause();
    else if (playing) c.el.play().catch(() => {});
  });

  render();
  return {
    get ctx() { return ctx; },
    unlock,
    /** Called from the entry gesture. `withMusic` false = "Enter quietly". */
    start: (withMusic = true) => {
      unlock();
      if (withMusic && store.get(KEY_MUTED) !== '1') play(current, 3);
      else render();
    },
    duck: (on) => { if (master) master.gain.setTargetAtTime(on ? 0.3 : 1, ctx.currentTime, 0.3); },
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
      <button type="button" class="btn btn--ghost sheet__toggle" data-act="toggle"></button>
    </div>
  </div>`;
