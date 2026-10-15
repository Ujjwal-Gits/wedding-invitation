// Rangoli's pieces, shared by its own page (main.js) and by its hero and gate modules (hero.js, gate.js), which can
// run on another theme's page (docs/MIX.md): the flower rangoli (four ring layers), the courtyard floor seen from
// low down (the hero, which the camera tilts down onto), the gate's words over it, and the camera's move.
import { lamp, flame, toran } from '../_suite/nepali.js';

export const ART = '/themes/rangoli/art/';
// the ring layers cut from the flower rangoli (made concentric): their square box and -sm width, in the 1600-px
// picture's units. 0 = the diyo and the rose core, 1 = jasmine and leaves, 2 = the marigold-and-diamond band, 3 = the rim
const RING = [{ box: 250, sm: 112 }, { box: 710, sm: 320 }, { box: 1362, sm: 613 }, { box: 1660, sm: 747 }];
const WICK = { x: 50, y: 48.1 }; // the centre diyo's wick, % of the rangoli's 1600-px square
const r2 = (n) => Math.round(n * 100) / 100;

/** the rangoli; `vw` is its width on phones and desktops (for sizes) */
export function rangoli(cls, [phone, desk], { eager = false } = {}) {
  const rings = RING.map(({ box, sm }, i) => {
    const f = box / 1600;
    return `<img class="rg-ring rg-ring--${i}" style="--f:${r2(f)}" src="${ART}ring${i}-sm.webp" srcset="${ART}ring${i}-sm.webp ${sm}w, ${ART}ring${i}.webp ${box}w"
      sizes="(max-width: 719px) ${r2(phone * f)}vw, ${r2(desk * f)}vw" alt="" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} />`;
  }).reverse().join('');
  return `<div class="rg-rangoli ${cls}" aria-hidden="true">${rings}
    <span class="rg-halo"></span><span class="rg-wick" style="left:${WICK.x}%;top:${WICK.y}%">${flame('rg-cflame')}</span></div>`;
}

// ───────── the hero: the courtyard floor, seen from above once the camera has tilted down ─────────
export function heroHtml(ctx) {
  const { bi, esc, c, AD, BS, txt, on, placeLine } = ctx;
  const bsDeva = BS.day && BS.month ? `${BS.month} ${BS.day} गते, ${BS.year}` : BS.full.ne;
  const invo = txt('hero.invocation'); const title = txt('hero.title'); const line = txt('hero.line');
  const bb = (html, cls) => `<div class="rg-bb ${cls}">${html}</div>`; // stands up on the floor while the camera is low
  return `
  <div class="rg-sky" aria-hidden="true"><div class="rg-sky__wall"></div>${toran('rg-sky__toran', '(max-width: 719px) 140vw, 90vw')}</div>
  <div class="rg-cam">
    <div class="rg-floor">
      <i class="rg-shade" aria-hidden="true"></i><i class="rg-sun" aria-hidden="true"></i>
      ${bb(`${ctx.ganesh('rg-gan', '(max-width: 719px) 90px, 130px')}`, 'rg-shrine')}
      ${bb(lamp('diyo', { cls: 'rg-hl', sizes: '90px' }), 'rg-hlamp rg-hlamp--sl')}${bb(lamp('diyo', { cls: 'rg-hl', sizes: '90px' }), 'rg-hlamp rg-hlamp--sr')}
      ${rangoli('rg-hero-r', [86, 46], { eager: true })}
      ${['a', 'b', 'c', 'd'].map((k) => bb(lamp('diyo', { cls: 'rg-hl', sizes: '80px' }), `rg-hlamp rg-hlamp--${k}`)).join('')}
    </div>
  </div>
  <div class="rg-words">
    ${on(invo) ? `<p class="rg-invo su-in">${bi(invo)}</p>` : ''}
    ${on(title) ? `<p class="rg-title su-in">${bi(title)}</p>` : ''}
    ${on(line) ? `<p class="rg-line su-in">${bi(line)}</p>` : ''}
    <h1 class="rg-names">
      <span class="rg-n su-in">${bi(c.bride.name)}</span>
      <span class="rg-and su-in" aria-hidden="true"><span class="l-en">&amp;</span><span class="l-ne" lang="ne">र</span></span><span class="sr-only">and</span>
      <span class="rg-n su-in">${bi(c.groom.name)}</span>
    </h1>
    <div class="rg-when su-in">
      <p class="rg-date">${bi({ en: `${AD.wd.en} · ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.full.ne })}</p>
      <p class="rg-alt"><span class="l-en" lang="ne">${esc(bsDeva)}</span><span class="l-ne" lang="ne">${esc(AD.full.ne)}</span></p>
      ${placeLine?.en || placeLine?.ne ? `<p class="rg-place">${bi(placeLine)}</p>` : ''}
    </div>
  </div>`;
}

// ───────── the gate: शुभ विवाह over the low view, a shade rising from the floor under the line and buttons ─────────
export function gateHtml(ctx, cls = '') {
  const t = ctx.txt('hero.title');
  return `<div class="rg-gate ${cls}">
    <div class="rg-gate__gan">${ctx.ganesh('rg-gate__ganimg', '96px')}</div>
    ${ctx.on(t) ? `<p class="rg-gate__title" lang="ne">${ctx.esc(t.ne || t.en)}</p>` : ''}
    <i class="rg-gate__scrim"></i>
  </div>`;
}

/** the gate's own exit: the title lifts away, the shade over the floor clears */
export function gateExit(tl, gateEl) {
  tl.to(gateEl.querySelector('.rg-gate__title'), { opacity: 0, y: -14, duration: 0.55, ease: 'power2.in' }, 0);
  tl.to(gateEl.querySelector('.rg-gate__scrim'), { opacity: 0, duration: 1, ease: 'power1.out' }, 0.2);
}

/** The camera tilts down from `at` while the rings turn into place; the centre diyo lights. `hero` is the element
 *  that carries --k (Rangoli's own #top, or the module's .rg-hero). Returns when the words may settle in.
 *  (Rangoli's own opening calls it at 0.1.) */
export function heroEnter(tl, at, hero) {
  const q = (s) => hero.querySelector(s);
  const d = at - 0.1;
  // the camera: one variable drives the floor's tilt and the counter-tilt of everything standing on it
  tl.fromTo(hero, { '--k': 1 }, { '--k': 0, duration: 2.3, ease: 'power3.inOut' }, d + 0.1);
  tl.to(q('.rg-sky'), { yPercent: -55, opacity: 0, duration: 1.2, ease: 'power2.in' }, d + 0.15);
  // the rings: the rim settles, then each ring turns in from the opposite side to the one before
  tl.fromTo(q('.rg-ring--3'), { rotation: -28 }, { rotation: 0, duration: 2.3, ease: 'power3.inOut' }, d + 0.1);
  tl.fromTo(q('.rg-ring--2'), { rotation: 70 }, { rotation: 0, duration: 2.0, ease: 'power3.inOut' }, d + 0.3);
  tl.fromTo(q('.rg-ring--1'), { rotation: -170, scale: 1.3, opacity: 0 }, { rotation: 0, scale: 1, opacity: 1, duration: 1.6, ease: 'expo.out' }, d + 0.95);
  tl.fromTo(q('.rg-ring--0'), { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, ease: 'back.out(1.5)' }, d + 1.45);
  // the centre diyo catches its flame
  tl.fromTo(q('.rg-wick'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(2.2)' }, d + 2.15);
  tl.fromTo(q('.rg-halo'), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'power2.out' }, d + 2.15);
  return d + 2.25;
}

/** after the opening: the rings turn against each other as the courtyard slides by */
export function ringScroll(gsap, hero, trigger) {
  const top = { trigger, start: 'top top', end: 'bottom top', scrub: 0.6 };
  [[3, 24], [2, -46], [1, 80]].forEach(([i, deg]) => {
    const r = hero.querySelector(`.rg-hero-r .rg-ring--${i}`);
    if (r) gsap.fromTo(r, { rotation: 0 }, { rotation: deg, ease: 'none', scrollTrigger: top });
  });
}
