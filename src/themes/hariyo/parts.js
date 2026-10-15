// Hariyo's pieces, shared by its own page (main.js) and by its gate and hero modules (gate.js, hero.js), which can run
// on another theme's page (docs/MIX.md). Markup builders take the same ctx the suite engine passes to T.gate/T.hero.
import { gsap } from 'gsap';

export const ART = '/themes/hariyo/art/';
export const mobile = () => window.matchMedia('(max-width: 760px)').matches;
export const green = () => `${ART}greenery${mobile() ? '-sm' : ''}.webp`;
export const img = (src, cls = '', extra = '') => `<img class="${cls}" src="${src}" alt="" decoding="async" ${extra} />`;

/** A fine Dhaka-weave line: hairlines either side of a small row of diamonds. */
export const dhaka = (cls = '') => `<svg class="hy-dhaka ${cls}" viewBox="0 0 168 12" aria-hidden="true" focusable="false">
  <path d="M0 6h56M112 6h56" stroke="currentColor" stroke-width=".7" opacity=".55"/>
  <g fill="none" stroke="currentColor" stroke-width=".8">
    <path d="M62 6l3-3 3 3-3 3z"/><path d="M100 6l3-3 3 3-3 3z"/>
  </g>
  <path d="M72 6l3.5-4 3.5 4-3.5 4zM89 6l3.5-4 3.5 4-3.5 4z" fill="currentColor" opacity=".8"/>
  <path d="M80 6l4-5 4 5-4 5z" fill="none" stroke="var(--hy-gold)" stroke-width=".9"/>
  <circle cx="84" cy="6" r="1.3" fill="var(--hy-gold)"/>
</svg>`;

// The gate's greenery: [class, exit {xPercent, yPercent, rotation}, start, duration]. Near sprigs part fastest.
export const LEAVES = [
  ['l', { xPercent: -95, yPercent: 10, rotation: -10 }, 0.16, 1.75],
  ['r', { xPercent: 95, yPercent: -8, rotation: 10 }, 0.2, 1.8],
  ['tl', { xPercent: -78, yPercent: -82, rotation: -8 }, 0.1, 1.9],
  ['tr', { xPercent: 78, yPercent: -82, rotation: 8 }, 0.14, 1.85],
  ['bl', { xPercent: -78, yPercent: 84, rotation: 7 }, 0.12, 1.95],
  ['br', { xPercent: 78, yPercent: 84, rotation: -7 }, 0.18, 1.9],
  ['ft', { xPercent: 150, yPercent: -150, rotation: 14 }, 0.02, 1.35],
  ['fb', { xPercent: -150, yPercent: 150, rotation: -14 }, 0.04, 1.4],
];


export function heroHtml({ bi, txt, on, names, AD, BS, esc }) {
  const t = txt('hero.title');
  const inv = txt('hero.invocation');
  const line = txt('hero.line');
  return `
  <div class="hy-hc hy-hc--l" aria-hidden="true">${img(green())}</div>
  <div class="hy-hc hy-hc--r" aria-hidden="true">${img(green())}</div>
  <div class="hy-hero">
    <div class="hy-hero__text">
      ${on(inv) ? `<p class="hy-inv su-in">${bi(inv)}</p>` : ''}
      ${t.ne ? `<p class="hy-crest su-in" lang="ne">${esc(t.ne)}</p>` : `<p class="hy-crest su-in">${bi(t)}</p>`}
      <div class="su-in">${dhaka()}</div>
      ${on(line) ? `<p class="hy-line su-in">${bi(line)}</p>` : ''}
      <h1 class="hy-names su-names su-in">${names()}</h1>
      <p class="hy-date su-in">${bi({ en: `${AD.wd.en} · ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.full.ne || AD.full.ne })}</p>
      <p class="hy-date2 su-in">${bi({ en: `${String(BS.full.short?.en || BS.full.en || '').replace(/\s*B\.?S\.?\s*$/i, '')} B.S.`, ne: AD.full.ne })}</p>
    </div>
    <figure class="hy-pav" aria-hidden="true">
      <img class="hy-pav__img" src="${ART}pavilion-sm.webp" srcset="${ART}pavilion-sm.webp 600w, ${ART}pavilion.webp 1200w" sizes="(max-width: 760px) 92vw, 46vw" alt="" decoding="async" fetchpriority="high" />
      ${img(`${ART}leaf-b.webp`, 'hy-drift')}
    </figure>
  </div>`;
}

/** the gate: watercolour greenery from every corner and edge around an ivory arch with Ganesh, the title and names */
export function gateScene({ ganesh, names, txt, esc }) {
  const t = txt('hero.title');
  return `
    <div class="hy-gpaper"></div>
    ${LEAVES.map(([k]) => `<div class="hy-lf hy-lf--${k}">${img(green(), '', 'fetchpriority="high"')}</div>`).join('')}
    <div class="hy-arch">
      <div class="hy-arch__in">
        ${ganesh('hy-arch__gan', '150px')}
        ${t.ne ? `<p class="hy-crest" lang="ne">${esc(t.ne)}</p>` : ''}
        ${dhaka('hy-arch__rule')}
        <p class="hy-arch__names su-names">${names()}</p>
      </div>
    </div>
    <div class="hy-fall">${['a', 'b', 'c'].map((k) => img(`${ART}leaf-${k}.webp`, `hy-fall__l hy-fall__l--${k}`)).join('')}</div>`;
}

/** The garden parts: the arch and its words go first, the leaves part outward at their own speeds (the near sprigs
 *  fastest), a few leaves come loose and drift down, the paper clears. */
export function gateExit(tl, gate) {
  const q = (s) => gate.querySelector(s);
  // the arch and its words go first, softly
  tl.to(q('.hy-arch'), { opacity: 0, scale: 1.035, duration: 0.7, ease: 'power2.out' }, 0.02);
  // the leaves part, each at its own pace
  LEAVES.forEach(([k, to, at, d]) => {
    tl.to(q(`.hy-lf--${k}`), { ...to, scale: 1.08, duration: d, ease: 'power3.inOut' }, at);
  });
  // a few leaves come loose and drift down through the clearing
  const fall = [...gate.querySelectorAll('.hy-fall__l')];
  const W = window.innerWidth; const H = window.innerHeight;
  fall.forEach((el, i) => {
    const x0 = W * [0.28, 0.66, 0.46][i]; const y0 = H * [0.22, 0.3, 0.12][i];
    tl.fromTo(el, { x: x0, y: y0, rotation: [-30, 20, 60][i], opacity: 0 },
      { x: x0 + W * [-0.12, 0.1, 0.05][i], y: y0 + H * [0.42, 0.36, 0.5][i], rotation: [40, -35, 140][i], duration: [2.6, 2.4, 2.9][i], ease: 'sine.inOut' }, 0.35 + i * 0.12);
    tl.to(el, { opacity: 1, duration: 0.5, ease: 'power1.out' }, 0.35 + i * 0.12);
    tl.to(el, { opacity: 0, duration: 0.9, ease: 'power1.in' }, 0.35 + i * 0.12 + [1.7, 1.5, 2].at(i));
  });
  // the paper clears
  tl.to(q('.hy-gpaper'), { opacity: 0, duration: 1, ease: 'power1.inOut' }, 0.4);
  tl.set(gate, { pointerEvents: 'none' }, 0.6);
}

/** The pavilion rises into the garden from `at` and the corner greenery settles in. (Hariyo's own opening calls it
 *  at 0.5, while the leaves are still parting.) */
export function heroEnter(tl, at, root) {
  const pav = root?.querySelector('.hy-pav__img');
  if (pav) tl.fromTo(pav, { opacity: 0, y: 46, scale: 0.965 }, { opacity: 1, y: 0, scale: 1, duration: 1.9, ease: 'power3.out' }, at);
  const hc = root ? root.querySelectorAll('.hy-hc') : [];
  if (hc.length) tl.fromTo(hc, { opacity: 0, yPercent: -18 }, { opacity: 1, yPercent: 0, duration: 1.6, ease: 'power3.out', stagger: 0.08 }, at + 0.45);
}

/** The scene breathes, barely; one leaf now and then. Both rest when the hero is off screen. */
export function heroAmbient(root, reduced) {
  const pav = root?.querySelector('.hy-pav__img');
  const leaf = root?.querySelector('.hy-drift');
  if (reduced || !pav || !leaf) return null;
  const breathing = gsap.timeline({ repeat: -1, paused: true })
    .to(pav, { scale: 1.012, duration: 5, ease: 'sine.inOut', transformOrigin: '50% 100%' })
    .to(pav, { scale: 1, duration: 5, ease: 'sine.inOut' });
  const drift = gsap.timeline({ repeat: -1, repeatDelay: 5, paused: true, delay: 2 })
    .fromTo(leaf, { xPercent: 0, yPercent: 0, rotation: -20, opacity: 0 }, { xPercent: -160, yPercent: 520, rotation: 70, duration: 9, ease: 'sine.inOut' })
    .to(leaf, { opacity: 0.95, duration: 1.6, ease: 'power1.out' }, 0)
    .to(leaf, { opacity: 0, duration: 2, ease: 'power1.in' }, 7);
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { breathing.play(); drift.play(); } else { breathing.pause(); drift.pause(); }
  });
  io.observe(root);
  return { destroy() { io.disconnect(); breathing.kill(); drift.kill(); } };
}
