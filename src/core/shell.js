// Shared page chrome: SVG ornaments, HUD (language + music + chapters), and a
// synthesized temple bell (ghanti) for the moment of entry.
import { config } from '../config.js';
import { bi, initLang } from './i18n.js';
import { createPlayer, playerMarkup } from './audio.js';
import { bundledTracks } from './data.js';

const SVG = `
<svg class="svg-defs" aria-hidden="true" focusable="false">
  <symbol id="i-divider" viewBox="0 0 240 24">
    <path d="M2 12h92M146 12h92" stroke="currentColor" stroke-width=".9"/>
    <circle cx="98" cy="12" r="1.8" fill="currentColor"/><circle cx="142" cy="12" r="1.8" fill="currentColor"/>
    <path d="M120 2c6 6 6 14 0 20-6-6-6-14 0-20Z" fill="none" stroke="currentColor" stroke-width=".9"/>
    <path d="M120 22c-9-2-15-7-17-14 8 2 13 7 17 14Zm0 0c9-2 15-7 17-14-8 2-13 7-17 14Z" fill="none" stroke="currentColor" stroke-width=".9"/>
  </symbol>
</svg>`;

export function mountShell({ chapters = [] } = {}) {
  document.body.insertAdjacentHTML('afterbegin', `${SVG}<a class="skip" href="#rsvp">Skip to RSVP</a>`);
  const hud = document.createElement('header');
  hud.className = 'hud';
  hud.setAttribute('aria-label', 'Invitation controls');
  hud.innerHTML = `
    <button class="hud__btn" id="lang-toggle" type="button" aria-pressed="false">
      <span class="l-en" aria-hidden="true">ने</span><span class="l-ne" aria-hidden="true">EN</span>
      <span class="sr-only">Switch language between English and Nepali</span>
    </button>
    ${playerMarkup()}`;
  document.body.append(hud);
  if (chapters.length) {
    const nav = document.createElement('nav');
    nav.className = 'chapters';
    nav.setAttribute('aria-label', 'Chapters');
    nav.innerHTML = `<ol>${chapters.map((c, i) => `<li><button type="button" data-chapter="${i}"><span class="sr-only">${bi(c)}</span><i aria-hidden="true"></i><b aria-hidden="true">${bi(c)}</b></button></li>`).join('')}</ol>`;
    document.body.append(nav);
  }
  initLang(document.getElementById('lang-toggle'));
  const player = createPlayer({ ...config.music, fallbackTracks: bundledTracks });
  return { player, setChapter };
}

function setChapter(i) {
  document.querySelectorAll('.chapters button').forEach((b, k) => {
    if (k === i) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
  });
}

/** A brass temple bell: inharmonic partials with long exponential decays. */
export function ringBell(ctx, { when = 0, gain = 0.32 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const out = ctx.createGain();
  out.gain.value = gain;
  out.connect(ctx.destination);
  const base = 523;
  [[1, 1, 4.5], [2.01, 0.55, 3.2], [2.76, 0.42, 2.6], [5.4, 0.22, 1.6], [8.93, 0.12, 0.9], [0.5, 0.25, 5]].forEach(([r, a, d]) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = base * r;
    o.detune.value = (Math.random() - 0.5) * 6;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(a, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + d + 0.1);
  });
}

/** Lightweight preload progress for a list of promises. */
export function trackProgress(promises, bar) {
  let done = 0;
  promises.forEach((p) => p.then(() => {
    done++;
    if (bar) bar.style.transform = `scaleX(${done / promises.length})`;
  }).catch(() => {}));
  return Promise.all(promises);
}
