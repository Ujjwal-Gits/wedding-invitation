// Shree's pieces, shared by its own page (main.js) and by its hero and gate modules (hero.js, gate.js), which can run
// on another theme's page (docs/MIX.md): the gold lotus, the hanging brass diyas, the hero (Ganesh in the lotus's halo
// between the diyas) and THE LOTUS OPENS, the one signature motion. The pothi and the rest belong to Shree's page.
import { flame } from '../_suite/nepali.js';

export const ART = {
  diya: { sm: '/themes/shree/art/diya-nf-sm.webp', lg: '/themes/shree/art/diya-nf.webp' }, // the painted flame removed: a live one burns on the wick
};

// ───────── the lotus (SVG, centred on 0,0 in a 400×400 view) ─────────
// Each petal is drawn with its base at its own origin and its tip pointing out (-y). Closed, it is flipped about
// its base (scale(sx, sy<0)) so it folds in over the centre; opening runs sy through 0, which reads as a hinge.
const RINGS = [
  { n: 16, r: 78, L: 100, W: 50, off: 0, sx: 0.7, sy: -0.68 },    // outer
  { n: 12, r: 56, L: 86, W: 50, off: 15, sx: 0.72, sy: -0.6 },     // middle
  { n: 8, r: 34, L: 66, W: 42, off: 22.5, sx: 0.76, sy: -0.5 },   // inner
];
const BUD_SCALE = 1.22; // the closed bud sits a little larger in the gate, and settles as it opens
const petalPath = (L, W) => `M0 0C${W * 0.62} ${-L * 0.18} ${W * 0.56} ${-L * 0.7} 0 ${-L}C${-W * 0.56} ${-L * 0.7} ${-W * 0.62} ${-L * 0.18} 0 0Z`;
const f = (n) => Math.round(n * 100) / 100;

export function lotusSVG(id, { closed = false, cls = '' } = {}) {
  const rays = Array.from({ length: 32 }, (_, i) => {
    const a = (i * 360) / 32 + 5.625;
    return `<line x1="0" y1="-92" x2="0" y2="${i % 2 ? -150 : -168}" transform="rotate(${a})"/>`;
  }).join('');
  const beads = Array.from({ length: 48 }, (_, i) => `<circle r="${i % 2 ? 1.1 : 1.9}" cy="-186" transform="rotate(${(i * 360) / 48})"/>`).join('');
  const ring = (R, k) => `<g class="sh-ring" data-ring="${k}"${closed ? ` transform="rotate(${k % 2 ? 14 : -14}) scale(${BUD_SCALE})"` : ''}>${Array.from({ length: R.n }, (_, i) => {
    const a = (i * 360) / R.n + R.off;
    const tr = closed ? ` transform="scale(${R.sx} ${R.sy})"` : '';
    const p = petalPath(R.L, R.W);
    const inner = petalPath(R.L * 0.66, R.W * 0.5);
    return `<g transform="rotate(${f(a)}) translate(0 ${-R.r})"><g class="sh-p"${tr}>
      <path class="sh-p__body" d="${p}" fill="url(#${id}-g${k})"/>
      <path class="sh-p__in" d="${inner}"/>
      <path class="sh-p__vein" d="M0 ${f(-R.L * 0.12)}V${f(-R.L * 0.6)}"/>
      <circle class="sh-p__dot" cy="${f(-R.L * 0.8)}" r="${k === 0 ? 2 : 1.6}"/>
    </g></g>`;
  }).join('')}</g>`;
  const seeds = [[0, 0], ...Array.from({ length: 6 }, (_, i) => [f(Math.sin((i * Math.PI) / 3) * 14), f(-Math.cos((i * Math.PI) / 3) * 14)])]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('');
  return `<svg class="sh-lotus ${cls}" viewBox="-200 -200 400 400" aria-hidden="true" focusable="false">
    <defs>
      ${RINGS.map((_, k) => `<linearGradient id="${id}-g${k}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#43183D"/><stop offset="0.5" stop-color="${['#6A3D44', '#714540', '#7A4D3E'][k]}"/><stop offset="1" stop-color="${['#A9844C', '#B48F52', '#BE9A5A'][k]}"/></linearGradient>`).join('')}
    </defs>
    <g class="sh-lotus__frame">
      <g class="sh-lotus__rays">${rays}</g>
      <circle class="sh-lotus__c1" r="178"/><circle class="sh-lotus__c2" r="194"/>
      <g class="sh-lotus__beads">${beads}</g>
    </g>
    ${ring(RINGS[0], 0)}${ring(RINGS[1], 1)}
    <g class="sh-lotus__pod"><circle class="sh-lotus__podc" r="30"/><g class="sh-lotus__seeds">${seeds}</g></g>
    ${ring(RINGS[2], 2)}
  </svg>`;
}

export const diyaImg = (cls, sizes, eager) => `<div class="sh-diya ${cls}" aria-hidden="true"><div class="sh-diya__swing">
  <img src="${ART.diya.sm}" srcset="${ART.diya.sm} 260w, ${ART.diya.lg} 520w" sizes="${sizes}" alt="" ${eager ? '' : 'loading="lazy"'} decoding="async" width="520" height="1132" />
  <span class="sh-wick">${flame('sh-dflame')}</span></div></div>`;

// ───────── the hero ─────────
/** `uid` keeps the lotus's gradient ids unique on the page (Shree's own hero: 'hl') */
export function heroHtml({ bi, esc, txt, names, ganesh, AD, BS, on }, uid = 'hl') {
  const title = txt('hero.title');
  const bsLine = BS.full.ne || '';
  return `
  <div class="sh-hero">
    ${diyaImg('sh-diya--l', '(min-width: 900px) 170px, 24vw', true)}
    ${diyaImg('sh-diya--r', '(min-width: 900px) 170px, 24vw', true)}
    <div class="sh-hero__col">
      <div class="sh-gan">
        <div class="sh-halo" aria-hidden="true"><div class="sh-halo__spin">${lotusSVG(uid)}</div><i class="sh-bloom"></i></div>
        ${ganesh('sh-gan__img', '(min-width: 900px) 220px, 48vw')}
      </div>
      ${on(txt('hero.invocation')) ? `<p class="sh-inv su-in">${bi(txt('hero.invocation'))}</p>` : ''}
      <h1 class="sh-title su-in" lang="ne">${esc(title.ne || title.en)}</h1>
      ${on(txt('hero.line')) ? `<p class="sh-line su-in">${bi(txt('hero.line'))}</p>` : ''}
      <p class="su-names sh-names su-in">${names('&amp;')}</p>
      <div class="sh-when su-in">
        <i class="sh-band" aria-hidden="true"></i>
        <p class="sh-when__ad">${bi({ en: `${AD.wd.en} · ${AD.day} ${AD.month.en} ${AD.year}`, ne: AD.full.ne })}</p>
        ${bsLine ? `<p class="sh-when__bs" lang="ne">${esc(bsLine)}</p>` : ''}
      </div>
    </div>
  </div>`;
}

// ───────── the gate: the closed lotus in the middle of the plum, the invocation over it, the names under it ─────────
/** `spotId`: Shree's own gate keeps its #shSpot; a module passes nothing (no ids inside modules) */
export function gateHtml({ bi, txt, c, on }, spotId = '') {
  return `
    <div class="sh-gate__bg"></div>
    <div class="sh-gate__still">${lotusSVG(spotId ? 'gl' : 'mgl', { closed: true })}</div>
    <div class="sh-gate__spot"${spotId ? ` id="${spotId}"` : ''}></div>
    ${on(txt('hero.invocation')) ? `<p class="sh-gate__inv sh-gate__txt">${bi(txt('hero.invocation'))}</p>` : ''}
    <p class="sh-gate__names sh-gate__txt"><span>${bi(c.bride.name)}</span><span class="sh-gate__amp">&amp;</span><span>${bi(c.groom.name)}</span></p>`;
}

// ───────── the lotus's state, between the closed bud and the open halo ─────────
const lotus = new WeakMap(); // hero element → { halo, svg, pets, rings, pod, from, moved, spot }

/** close the hero's lotus and hide what the opening brings in (Ganesh, the words, the diyas up on their chains) */
export function heroClosed(gsap, hero) {
  const halo = hero.querySelector('.sh-halo');
  if (!halo) return null;
  const svg = halo.querySelector('.sh-lotus');
  const pets = [...svg.querySelectorAll('.sh-ring')].map((g) => [...g.querySelectorAll('.sh-p')]);
  const S = { halo, svg, pets, rings: [...svg.querySelectorAll('.sh-ring')], pod: svg.querySelector('.sh-lotus__pod'), from: null, moved: false, spot: null };
  lotus.set(hero, S);
  // closed petals
  pets.forEach((ring, k) => ring.forEach((p) => p.setAttribute('transform', `scale(${RINGS[k].sx} ${RINGS[k].sy})`)));
  S.rings.forEach((g, k) => g.setAttribute('transform', `rotate(${k % 2 ? 14 : -14}) scale(${BUD_SCALE})`));
  gsap.set(hero.querySelectorAll('.su-in, .sh-gan__img'), { opacity: 0 });
  gsap.set(hero.querySelectorAll('.sh-diya'), { yPercent: -140 });
  gsap.set(hero.querySelector('.sh-bloom'), { opacity: 0.4, scale: 0.42 });
  gsap.set(svg, { opacity: 1 });
  return S;
}

/** the hero's own lotus sits in the gate's spot (an element) until the opening carries it home */
export function liftLotus(gsap, hero, spot) {
  const S = lotus.get(hero);
  if (!S || !spot) return;
  S.spot = spot;
  if (S.moved) return;
  gsap.set(S.halo, { x: 0, y: 0, scale: 1 });
  const a = spot.getBoundingClientRect();
  const b = S.halo.getBoundingClientRect();
  if (!b.width) return;
  S.from = { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2), scale: a.width / b.width };
  gsap.set(S.halo, S.from);
}

/** whether the gate has lifted the hero's lotus into its spot (Shree's opening scene) */
export const isLifted = (hero) => Boolean(lotus.get(hero)?.spot);

/** THE LOTUS OPENS, from `at`: petals unfold ring by ring, the light blooms, the lotus glides home behind Ganesh (from
 *  the gate's spot, if it was lifted there; otherwise it opens where it is), Ganesh rises out of it and the diyas come
 *  down on their chains. Returns when it has settled. (Shree's own opening calls it at 0.) */
export function heroEnter(gsap, tl, at, hero) {
  const S = lotus.get(hero);
  if (!S) return at;
  if (S.spot) liftLotus(gsap, hero, S.spot);
  S.moved = true;
  const from = S.from || { x: 0, y: 0, scale: 1 };
  // a small breath before the petals move
  tl.fromTo(S.halo, { scale: from.scale }, { scale: from.scale * 1.035, duration: 0.35, ease: 'sine.inOut' }, at);
  // petals unfold, outer ring first, each ring spiralling round
  const starts = [0.3, 0.72, 1.12];
  S.pets.forEach((ring, k) => {
    const R = RINGS[k];
    ring.forEach((p, i) => {
      const o = { sx: R.sx, sy: R.sy };
      tl.fromTo(o, { sx: R.sx, sy: R.sy }, {
        sx: 1, sy: 1, duration: 1.25, ease: 'power3.out',
        onUpdate: () => p.setAttribute('transform', `scale(${f(o.sx)} ${f(o.sy)})`),
      }, at + starts[k] + i * (0.36 / ring.length));
    });
    const rot = { a: k % 2 ? 14 : -14, s: BUD_SCALE };
    const g = S.rings[k];
    tl.fromTo(rot, { a: k % 2 ? 14 : -14, s: BUD_SCALE }, { a: 0, s: 1, duration: 1.7, ease: 'power2.out', onUpdate: () => g.setAttribute('transform', `rotate(${f(rot.a)}) scale(${f(rot.s)})`) }, at + starts[k] - 0.05);
  });
  const pod = { s: 0.6 };
  tl.fromTo(pod, { s: 0.6 }, { s: 1, duration: 1.1, ease: 'back.out(2)', onUpdate: () => S.pod.setAttribute('transform', `scale(${f(pod.s)})`) }, at + 1.25);
  // the light blooms in the heart of the lotus, then rests as a soft aura
  const bloom = hero.querySelector('.sh-bloom');
  tl.fromTo(bloom, { opacity: 0.4, scale: 0.42 }, { opacity: 1, scale: 1.15, duration: 1.1, ease: 'power2.out' }, at + 1.15)
    .to(bloom, { opacity: 0.7, scale: 1, duration: 1.6, ease: 'sine.inOut' }, at + 2.3);
  // the opened lotus glides home behind Ganesh and quietens into a watermark
  tl.to(S.halo, { x: 0, y: 0, scale: 1, duration: 1.6, ease: 'power3.inOut' }, at + 2.0);
  tl.fromTo(S.svg, { opacity: 1 }, { opacity: 0.17, duration: 1.4, ease: 'sine.inOut' }, at + 2.4);
  // Ganesh rises out of it
  const gan = hero.querySelector('.sh-gan__img');
  if (gan) tl.fromTo(gan, { opacity: 0, y: 46, scale: 0.86 }, { opacity: 1, y: 0, scale: 1, duration: 1.5, ease: 'power3.out' }, at + 2.55);
  // the diyas come down on their chains and settle with a gentle swing
  hero.querySelectorAll('.sh-diya').forEach((d, i) => {
    tl.fromTo(d, { yPercent: -140 }, { yPercent: 0, duration: 1.7, ease: 'power3.out' }, at + 2.35 + i * 0.12);
    tl.fromTo(d.querySelector('.sh-diya__swing'), { rotation: i ? 5 : -5 }, { rotation: 0, duration: 2.6, ease: 'elastic.out(1, 0.32)' }, at + 2.75 + i * 0.12);
  });
  return at + 3.35;
}
