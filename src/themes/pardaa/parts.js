// Pardaa's pieces, shared by its own page (main.js) and by its gate and hero modules (gate.js, hero.js), which can run
// on another theme's page (docs/MIX.md). Markup builders take the same ctx the suite engine passes to T.gate/T.hero.
import { gsap } from 'gsap';
import { lamp, flame } from '../_suite/nepali.js';

export const A = '/themes/pardaa/art/';
export const rnd = (a, b) => a + Math.random() * (b - a);

// ───────── ornaments (inline SVG, gold line art) ─────────
/** a fine Dhaka-diamond rule */
export const rule = (cls = '') => `<svg class="pd-rule ${cls}" viewBox="0 0 240 14" aria-hidden="true" focusable="false">
  <path d="M0 7H96M144 7H240" /><path d="M120 1l6 6-6 6-6-6z" /><path d="M120 4l3 3-3 3-3-3z" class="pd-f" />
  <path d="M106 4l3 3-3 3-3-3zM134 4l3 3-3 3-3-3z" class="pd-f" /></svg>`;
/** a small lotus-mandala crown for section heads */
export const lotus = (cls = '') => `<svg class="pd-lotus ${cls}" viewBox="0 0 64 30" aria-hidden="true" focusable="false">
  <path d="M32 3c5 6 6 14 0 22-6-8-5-16 0-22z" /><path d="M32 25c-3-7-10-11-18-11 2 7 9 11 18 11zM32 25c3-7 10-11 18-11-2 7-9 11-18 11z" />
  <path d="M32 25c-6-3-14-3-22 0M32 25c6-3 14-3 22 0" /><path d="M2 27h60" /><circle cx="32" cy="27" r="1.6" class="pd-f" /></svg>`;
/** the mandap-arch (ogee) outline used by frames and the diya columns; drawn in a 100x100 box, stretched */
export const OGEE = 'M0 100V24C0 14 22 12 34 8C42 5 47 3 50 0C53 3 58 5 66 8C78 12 100 14 100 24V100Z';
export const archLines = () => `<svg class="pd-archline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="${OGEE}" /></svg>`;
export const PETALS = ['#F29A1F', '#E9781A', '#C8263A', '#F4B63A', '#B3122A'];
export const petal = (i) => `<svg class="pd-petal" viewBox="0 0 20 24" aria-hidden="true"><path d="M10 .5C15.5 4 19.6 10.6 15.4 18.6 13.4 22.4 6.6 22.4 4.6 18.6.4 10.6 4.5 4 10 .5Z" fill="${PETALS[i % PETALS.length]}" /></svg>`;


/** one petal drifting down; inside the opening timeline when `tl` is given */
export function fall(el, tl, at, { x0, drift, dur, rot }) {
  const set = { x: x0, y: -30, rotation: rot, opacity: 0, scale: rnd(0.6, 1.05) };
  const to = { x: x0 + drift, y: `${rnd(50, 80)}vh`, rotation: rot + rnd(-200, 200), duration: dur, ease: 'sine.in' };
  if (tl) {
    tl.set(el, set, at).to(el, to, at).to(el, { opacity: 0.95, duration: 0.4 }, at).to(el, { opacity: 0, duration: 0.8 }, at + dur - 0.8);
  } else {
    gsap.set(el, set); gsap.to(el, to); gsap.to(el, { opacity: 0.9, duration: 0.6 });
    gsap.to(el, { opacity: 0, duration: 1, delay: dur - 1, onComplete: () => el.remove() });
  }
}

/** the hero: the mandap between the tied-back curtains, the names above it */
export function heroHtml(ctx) {
  const { bi, esc, txt, on, AD, BS } = ctx;
  const inv = txt('hero.invocation');
  return `
    <div class="pd-hero">
      <div class="pd-hero__glow" aria-hidden="true"></div>
      <div class="pd-band pd-band--l" aria-hidden="true"><i></i></div><div class="pd-band pd-band--r" aria-hidden="true"><i></i></div>
      <div class="pd-tied pd-tied--l" aria-hidden="true"><i></i></div><div class="pd-tied pd-tied--r" aria-hidden="true"><i></i></div>
      <div class="pd-htoran" aria-hidden="true"></div>
      <div class="pd-hero__body">
        <div class="pd-hero__text">
          ${on(inv) ? `<p class="pd-inv su-in" lang="ne">${esc(inv.ne || inv.en)}</p>` : ''}
          <p class="pd-title su-in" lang="ne">${esc(txt('hero.title').ne || 'शुभ विवाह')}</p>
          <h1 class="su-names pd-names su-in">${ctx.names('&amp;')}</h1>
          ${on(txt('hero.line')) ? `<p class="pd-line su-in">${bi(txt('hero.line'))}</p>` : ''}
          <p class="pd-hdate su-in">${bi({ en: `${AD.wd.en}, ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.day && BS.month && BS.year ? `${AD.wd.ne}, ${BS.month} ${BS.day}, ${BS.year}` : (BS.full.ne || AD.full.ne) })}</p>
        </div>
        <figure class="pd-mandap"><img src="${A}mandap-sm.webp" srcset="${A}mandap-sm.webp 560w, ${A}mandap.webp 1120w" sizes="(max-width: 700px) 80vw, 46vw" alt="A red and gold Nepali mandap with marigold garlands and a sacred fire; the bride in red and the groom in daura suruwal and Dhaka topi sit before it" fetchpriority="high" decoding="async" />
          <span class="pd-fire" aria-hidden="true">${[[46.6, 0.78], [48.9, 1], [51.2, 0.92], [53.4, 0.74]].map(([x, k]) => `<span class="pd-fire__w" style="left:${x}%;--k:${k}">${flame()}</span>`).join('')}</span>
          ${lamp('panas', { cls: 'pd-panas pd-panas--l', sizes: '70px' })}${lamp('panas', { cls: 'pd-panas pd-panas--r', sizes: '70px' })}
        </figure>
      </div>
      <div class="pd-petals" aria-hidden="true">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(petal).join('')}</div>
    </div>`;
}

/** the gate: a pair of closed deep-red velvet curtains; Ganesh in an ivory medallion, शुभ विवाह and the names in gold */
export const gateScene = (ctx) => `
    <div class="pd-g">
      <div class="pd-g__bg"></div>
      <div class="pd-g__light"></div>
      <div class="pd-g__half pd-g__half--l"></div><div class="pd-g__half pd-g__half--r"></div>
      <div class="pd-g__front">
        <div class="pd-g__vig"></div>
        ${ctx.ganeshRef ? `<div class="pd-g__medal">${ctx.ganesh('pd-g__gan', '(max-width: 700px) 120px, 150px')}</div>` : ''}
        <p class="pd-g__title" lang="ne">${ctx.esc(ctx.txt('hero.title').ne || 'शुभ विवाह')}</p>
        ${rule('pd-g__rule')}
        <p class="pd-g__names">${ctx.names('&amp;')}</p>
      </div>
    </div>`;

/** The curtains open: the words in front lift away, the halves draw apart under the valance and gather toward the
 *  outer edges with a slight sway, warm light rises behind and then clears. */
export function gateExit(tl, root) {
  const q = (s) => root.querySelector(s);
  const halves = [q('.pd-g__half--l'), q('.pd-g__half--r')];
  // in front: Ganesh, the title and the names lift away
  tl.to(q('.pd-g__front'), { autoAlpha: 0, y: -16, scale: 0.97, duration: 0.6, ease: 'power2.in' }, 0.05);
  // the halves draw apart under the valance, gathering toward the outer edges; a slight sway as they settle
  halves.forEach((el, i) => {
    const s = i ? 1 : -1;
    tl.fromTo(el, { xPercent: 0, scaleX: 1, skewY: 0 }, { xPercent: s * 78, scaleX: 0.55, skewY: s * -0.6, transformOrigin: i ? '100% 0%' : '0% 0%', duration: 2.1, ease: 'power2.inOut' }, 0.3 + i * 0.06);
    tl.to(el, { skewY: 0, duration: 0.6, ease: 'sine.out' }, 2.4);
  });
  // warm light rises behind, then the scene takes its place
  tl.fromTo(q('.pd-g__light'), { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1.2, ease: 'sine.out' }, 0.45);
  tl.to(q('.pd-g__bg'), { opacity: 0, duration: 0.9, ease: 'sine.inOut' }, 0.9);
  tl.to(q('.pd-g__light'), { opacity: 0, duration: 1.0, ease: 'sine.inOut' }, 1.6);
  tl.to(halves, { opacity: 0, duration: 0.8, ease: 'sine.in' }, 2.0);
}

/** The hero comes in from `at`: petals fall, the glow rises, the mandap lifts into place, the tied-back curtains come
 *  in from the sides. (Pardaa's own opening calls it at 0.9, while its curtains are still parting.) */
export function heroEnter(tl, at, root) {
  if (!root?.querySelector('.pd-hero')) return;
  const q = (s) => root.querySelector(s);
  tl.fromTo(q('.pd-tied--l'), { opacity: 0, xPercent: -18 }, { opacity: 1, xPercent: 0, duration: 1.3, ease: 'power2.out' }, at + 0.6);
  tl.fromTo(q('.pd-tied--r'), { opacity: 0, xPercent: 18 }, { opacity: 1, xPercent: 0, duration: 1.3, ease: 'power2.out' }, at + 0.6);
  tl.fromTo(root.querySelectorAll('.pd-band'), { opacity: 0 }, { opacity: 1, duration: 1.0 }, at + 0.8);
  tl.fromTo(q('.pd-hero__glow'), { opacity: 0 }, { opacity: 1, duration: 1.2 }, at + 0.1);
  tl.fromTo(q('.pd-mandap'), { opacity: 0, y: 70, rotateX: -14, transformPerspective: 900, transformOrigin: '50% 100%' }, { opacity: 1, y: 0, rotateX: 0, duration: 1.6, ease: 'power3.out', clearProps: 'transform' }, at + 0.25);
  root.querySelectorAll('.pd-petals .pd-petal').forEach((p, i) => {
    fall(p, tl, at + i * 0.14 + rnd(0, 0.1), { x0: rnd(0.1, 0.9) * innerWidth, drift: rnd(-60, 60), dur: rnd(3.0, 3.9), rot: rnd(0, 360) });
  });
}

/** the mandap takes whatever room the words leave, so the hero fits one screen: --pd-room on `target` */
export function fitRoom(root, target) {
  const hero = root.querySelector('.pd-hero');
  const body = root.querySelector('.pd-hero__body');
  const text = root.querySelector('.pd-hero__text');
  if (!hero || !body || !text) return () => {};
  const fit = () => {
    const cs = getComputedStyle(body);
    const room = hero.offsetHeight - text.offsetHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.rowGap || 0);
    target.style.setProperty('--pd-room', `${Math.round(room)}px`);
  };
  fit();
  document.fonts?.ready.then(fit);
  let raf = 0;
  const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
  const onLang = () => requestAnimationFrame(fit);
  addEventListener('resize', onResize);
  document.addEventListener('langchange', onLang);
  return () => { removeEventListener('resize', onResize); document.removeEventListener('langchange', onLang); };
}

/** an occasional petal over the mandap, only while the hero is in view */
export function heroAmbient(root, reduced) {
  const hero = root?.querySelector('.pd-hero');
  const box = root?.querySelector('.pd-petals');
  if (reduced || !hero || !box) return () => {};
  let inView = true; let n = 0; let timer = 0;
  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; });
  io.observe(hero);
  const drop = () => {
    if (inView && !document.hidden) {
      box.insertAdjacentHTML('beforeend', petal(n++));
      fall(box.lastElementChild, null, 0, { x0: rnd(0.2, 0.8) * innerWidth, drift: rnd(-50, 50), dur: rnd(5.5, 7), rot: rnd(0, 360) });
    }
    timer = setTimeout(drop, rnd(7000, 11000));
  };
  timer = setTimeout(drop, 5000);
  return () => { clearTimeout(timer); io.disconnect(); };
}

/** slow parallax as the hero leaves: the mandap sinks a little slower than the page, the tied curtains a touch faster */
export function heroScroll(root) {
  const mandap = root?.querySelector('.pd-mandap');
  if (!mandap) return;
  const st = () => ({ trigger: root, start: 'top top', end: 'bottom top', scrub: true });
  gsap.to(mandap, { y: 60, ease: 'none', scrollTrigger: st() });
  gsap.to(root.querySelectorAll('.pd-tied, .pd-band'), { y: -40, ease: 'none', scrollTrigger: st() });
}
