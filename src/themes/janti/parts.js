// Janti's pieces, shared by its own page (main.js) and by its hero module (hero.js), which can open another theme's
// page (docs/MIX.md): the carved window with Ganesh in its torana, the names behind the doli curtain, and the
// Naumati Baja procession that walks in when the band strikes up.
import { gsap } from 'gsap';
import { lamp, kalash as npKalash } from '../_suite/nepali.js';

export const A = '/themes/janti/art/';

// ───────── ornaments (inline SVG) ─────────
const pt = (r, deg, cx = 120, cy = 120) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)].map((v) => v.toFixed(1));
/** the carved semicircular torana over a Newari door or window; `inner` sits in its centre (Ganesh) */
export function torana(inner = '', cls = '') {
  const beads = []; for (let a = 4; a <= 176; a += 6) { const [x, y] = pt(104, a); beads.push(`<circle cx="${x}" cy="${y}" r="2.1" />`); }
  const petals = []; for (let a = 15; a <= 165; a += 15) petals.push(`<path d="M0 0C5-7 5-15 0-21C-5-15-5-7 0 0Z" transform="translate(${pt(70, a).join(' ')}) rotate(${90 - a})" />`);
  const rays = []; for (let a = 22.5; a <= 157.5; a += 15) { const [x1, y1] = pt(40, a); const [x2, y2] = pt(66, a); rays.push(`M${x1} ${y1}L${x2} ${y2}`); }
  return `<div class="jt-torana ${cls}">
    <svg class="jt-torana__svg" viewBox="0 0 240 122" aria-hidden="true" focusable="false">
      <path class="jt-wd" d="M0 122V120A120 120 0 0 1 240 120V122Z" />
      <path class="jt-ln" d="M8 120A112 112 0 0 1 232 120" /><path class="jt-ln" d="M18 120A102 102 0 0 1 222 120" />
      <g class="jt-fl">${beads.join('')}</g>
      <path class="jt-ln" d="M28 120A92 92 0 0 1 212 120" />
      <g class="jt-ln">${petals.join('')}</g>
      <path class="jt-ln jt-ln--thin" d="${rays.join('')}" />
      <path class="jt-ln" d="M2 120H238" />
    </svg>
    <div class="jt-torana__in">${inner}</div>
  </div>`;
}
/** the procession: two copies of the band, stepping out of phase */
export const jantiWalkers = (cls = '') => `<span class="jt-janti ${cls}" aria-hidden="true"><span class="jt-janti__m">
      <img class="jt-janti__a" src="${A}procession.webp" alt="" decoding="async" /><img class="jt-janti__b" src="${A}procession.webp" alt="" decoding="async" /></span></span>`;

/** the hero: the carved window with Ganesh in its torana, the doli curtain rolled up over the names */
export function heroHtml(ctx) {
  const { bi, esc, txt, on, AD, BS, placeLine } = ctx;
  const inv = txt('hero.invocation');
  const janti = jantiWalkers;
  return `
    <div class="jt-hero">
      <div class="jt-hero__street" aria-hidden="true"><img src="${A}street-sm.webp" srcset="${A}street-sm.webp 900w, ${A}street.webp 2048w" sizes="(max-aspect-ratio: 2/1) 200svh, 100vw" alt="" fetchpriority="high" decoding="async" /></div>
      <div class="jt-hero__toran jt-toranstrip" aria-hidden="true"></div>
      <div class="jt-arch">
        ${torana(ctx.ganeshRef ? ctx.ganesh('jt-arch__gan', '(max-width: 700px) 90px, 130px') : npKalash('jt-arch__kal', '90px'), 'jt-arch__torana')}
        <div class="jt-arch__lintel" aria-hidden="true"></div>
        <div class="jt-arch__win">
          <div class="jt-arch__text">
            ${on(inv) ? `<p class="jt-inv su-in" lang="ne">${esc(inv.ne || inv.en)}</p>` : ''}
            <p class="jt-title su-in" lang="ne">${esc(txt('hero.title').ne || 'शुभ विवाह')}</p>
            <h1 class="su-names jt-names su-in">${ctx.names('&amp;')}</h1>
            ${on(txt('hero.line')) ? `<p class="jt-hline su-in">${bi(txt('hero.line'))}</p>` : ''}
            <p class="jt-hdate su-in">${bi({ en: `${AD.wd.en}, ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.day && BS.month && BS.year ? `${AD.wd.ne}, ${BS.month} ${BS.day}, ${BS.year}` : (BS.full.ne || AD.full.ne) })}</p>
            ${placeLine?.en || placeLine?.ne ? `<p class="jt-hplace su-in">${bi(placeLine)}</p>` : ''}
          </div>
          <div class="jt-cur" aria-hidden="true"><span class="jt-cur__cloth"><span class="jt-cur__hem"><i></i></span></span><span class="jt-cur__val"></span></div>
        </div>
        <div class="jt-arch__sill" aria-hidden="true">${lamp('diyo', { cls: 'jt-arch__diyo', sizes: '64px' })}${lamp('diyo', { cls: 'jt-arch__diyo', sizes: '64px' })}</div>
      </div>
      ${janti('jt-hero__janti')}
    </div>`;
}

/** before the entrance: the curtain is drawn over the names, the procession waits past the left edge */
export function heroPrepare(ctx, root = document) {
  if (ctx.reduced) return;
  root.querySelector('.jt-cur')?.classList.add('is-closed');
  const jw = root.querySelector('.jt-hero__janti');
  if (jw) gsap.set(jw, { x: () => -(jw.getBoundingClientRect().right - innerWidth * 0.1) });
}

/** the band strikes up from `at`: the procession walks in, the toran swings, the doli curtain rolls up over the
 *  names. Returns when the words may settle in. (Janti's own opening calls it at 0.1, under its dusk lifting.) */
export function heroEnter(tl, at, root = document) {
  const q = (s) => root.querySelector(s);
  const cloth = q('.jt-cur__cloth'); const hem = q('.jt-cur__hem');
  const S = 0.04;
  // the band strikes up: the procession walks in, stepping
  tl.to(q('.jt-hero__janti'), { x: 0, duration: 2.6, ease: 'power1.out' }, at);
  tl.fromTo(q('.jt-hero__janti .jt-janti__a'), { y: 0 }, { y: -4, duration: 0.26, ease: 'sine.inOut', yoyo: true, repeat: 9 }, at);
  tl.fromTo(q('.jt-hero__janti .jt-janti__b'), { y: 0 }, { y: -3, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 7 }, at + 0.14);
  // the marigold toran swings with the music
  tl.to(q('.jt-hero__toran'), { keyframes: [{ skewX: 5, duration: 0.45, ease: 'sine.out' }, { skewX: -3.6, duration: 0.6, ease: 'sine.inOut' }, { skewX: 2, duration: 0.55, ease: 'sine.inOut' }, { skewX: -0.9, duration: 0.5, ease: 'sine.inOut' }, { skewX: 0, duration: 0.45, ease: 'sine.out' }], transformOrigin: '50% 0%' }, at + 0.1);
  // the doli curtain rolls up over the names (the hem stays its own size as the cloth gathers)
  if (cloth && hem) {
    const p = { s: 1 };
    tl.to(p, { s: S, duration: 1.25, ease: 'power3.inOut', onUpdate: () => { cloth.style.transform = `scaleY(${p.s})`; hem.style.transform = `scaleY(${1 / p.s})`; } }, at + 1.35);
    tl.call(() => { q('.jt-cur').classList.remove('is-closed'); cloth.style.transform = ''; hem.style.transform = ''; }, null, at + 2.62);
  }
  return at + 1.85;
}

/** the hero's procession walks on as you leave the hero */
export function heroScroll(trigger = '#top', root = document) {
  const jw = root.querySelector('.jt-hero__janti');
  if (jw) gsap.to(jw, { x: () => innerWidth * 0.35, ease: 'none', scrollTrigger: { trigger, start: 'top top', end: 'bottom top', scrub: true } });
}
