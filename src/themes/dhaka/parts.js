// Dhaka's pieces, shared by its own page (main.js) and by its gate and hero modules (gate.js, hero.js), which can
// run on another theme's page (docs/MIX.md): the flower layouts, the wax seal, the paper textures and the welcome
// frame's entrance when no envelope opens onto it.
import { gsap } from 'gsap';
import { palpaliTile } from './weave.js';
import { flowerUrl } from './flowers.js';

// Each flower has a place in the welcome frame (x, y as fractions of the hero; w in units of the
// hero's shorter side) and a place on the table around the envelope (x, y, w in envelope widths).
export const FRAME_WIDE = [
  // Top left: the main bouquet.
  ['leaf-twig', 0.14, 0.02, 0.46, 122], ['leaf-twig', 0.02, 0.3, 0.42, 205], ['leaf-single', 0.21, 0.13, 0.2, 30],
  ['rose-red-a', 0.065, 0.1, 0.38, -8], ['rose-pink-garden', 0.18, 0.04, 0.27, 12], ['marigold-orange', 0.015, 0.31, 0.22, 0],
  ['rose-white', 0.235, 0.2, 0.16, 20], ['rose-pink-close', 0.11, 0.3, 0.17, -12],
  // Top right and bottom left: light accents.
  ['leaf-twig', 0.95, 0.05, 0.34, 250], ['rose-pink', 0.96, 0.08, 0.22, -10], ['marigold-yellow', 0.88, 0.03, 0.15, 8],
  ['leaf-twig', 0.04, 0.95, 0.34, 70], ['rose-papa', 0.04, 0.92, 0.22, 6], ['marigold-orange', 0.12, 0.98, 0.14, 0],
  // Bottom right: the answering bouquet.
  ['leaf-twig', 0.86, 0.98, 0.46, 302], ['leaf-twig', 0.98, 0.7, 0.42, 25], ['rose-chateau', 0.935, 0.89, 0.38, 6],
  ['rose-red-b', 0.82, 0.95, 0.27, -10], ['marigold-yellow', 0.985, 0.69, 0.2, 4], ['rose-pink-close', 0.765, 0.84, 0.16, 12],
  ['rose-red-stem', 0.88, 0.74, 0.22, -40],
];
export const FRAME_TALL = [
  ['leaf-twig', 0.3, 0.014, 0.430, 122], ['leaf-twig', 0.02, 0.091, 0.378, 205], ['leaf-single', 0.4, 0.042, 0.189, 30],
  ['rose-red-a', 0.12, 0.032, 0.378, -8], ['rose-pink-garden', 0.36, 0.014, 0.258, 12], ['marigold-orange', 0, 0.084, 0.224, 0],
  ['rose-white', 0.48, 0.052, 0.155, 20], ['rose-pink-close', 0.2, 0.077, 0.172, -12],
  ['leaf-twig', 0.98, 0.028, 0.310, 250], ['rose-pink', 0.96, 0.035, 0.224, -10], ['marigold-yellow', 0.82, 0.014, 0.146, 8],
  ['leaf-twig', 0.04, 0.979, 0.310, 70], ['rose-papa', 0.06, 0.972, 0.224, 6], ['marigold-orange', 0.22, 0.993, 0.138, 0],
  ['leaf-twig', 0.86, 1.03, 0.430, 302], ['leaf-twig', 1.03, 0.88, 0.378, 25], ['rose-chateau', 0.95, 0.985, 0.378, 6],
  ['rose-red-b', 0.76, 1.0, 0.258, -10], ['marigold-yellow', 1, 0.902, 0.206, 4], ['rose-pink-close', 0.62, 1.01, 0.155, 12],
  ['rose-red-stem', 0.98, 0.93, 0.206, -40],
];
// Table: a full bouquet at the envelope's upper left, another at its lower right, a few loose blooms.
export const TABLE_WIDE = [
  [-0.4, -0.66, 0.44, 140], [-0.7, -0.28, 0.4, 200], [-0.28, -0.5, 0.18, 20], [-0.5, -0.5, 0.36, -14],
  [-0.3, -0.66, 0.26, 10], [-0.74, -0.56, 0.2, 0], [-0.16, -0.6, 0.15, 30], [-0.62, -0.3, 0.16, -8],
  [0.62, -0.6, 0.3, 240], [0.6, -0.56, 0.18, -10], [0.42, -0.66, 0.13, 6],
  [-0.66, 0.6, 0.3, 60], [-0.6, 0.5, 0.18, 6], [-0.44, 0.66, 0.12, 0],
  [0.44, 0.7, 0.44, 300], [0.76, 0.36, 0.4, 20], [0.54, 0.52, 0.36, 6], [0.34, 0.62, 0.26, -10],
  [0.76, 0.24, 0.18, 4], [0.2, 0.6, 0.15, 12], [0.66, 0.72, 0.22, -40],
];
export const TABLE_TALL = [
  [-0.2, -0.95, 0.5, 140], [-0.5, -0.7, 0.44, 200], [-0.02, -0.78, 0.2, 20], [-0.3, -0.78, 0.42, -14],
  [0.0, -0.92, 0.28, 10], [-0.55, -0.95, 0.22, 0], [0.18, -0.8, 0.16, 30], [-0.4, -0.52, 0.18, -8],
  [0.5, -0.85, 0.32, 240], [0.42, -0.78, 0.22, -10], [0.28, -0.96, 0.14, 6],
  [-0.48, 0.86, 0.32, 60], [-0.4, 0.78, 0.22, 6], [-0.22, 0.92, 0.13, 0],
  [0.2, 1.0, 0.5, 300], [0.52, 0.66, 0.44, 20], [0.3, 0.8, 0.42, 6], [0.04, 0.86, 0.28, -10],
  [0.5, 0.56, 0.2, 4], [-0.06, 0.76, 0.16, 12], [0.44, 1.02, 0.26, -40],
];
export const tall = () => window.innerHeight > window.innerWidth * 1.15;

// Leaves are tagged so every spray stacks them behind every bloom (see .fl--leaf in dhaka.css).
export const flower = (name, cls = '', style = '') => `<img class="fl${name.startsWith('leaf') ? ' fl--leaf' : ''} ${cls}" src="${flowerUrl(name)}" alt="" aria-hidden="true" decoding="async" style="${style}" />`;
/** The welcome frame's flowers (class .wf), each at its frame spot. */
export const frameFlowers = (FRAME) => FRAME.map(([name, x, y, w, rot], i) =>
  flower(name, 'wf', `left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%;width:calc(var(--fu) * ${w});z-index:${name.startsWith('leaf') ? 1 : 2 + (i % 3)};--rot:${rot}deg`)).join('');

export const firstGrapheme = (s) => {
  const str = String(s || '').trim();
  if (!str) return '';
  if (window.Intl?.Segmenter) return [...new Intl.Segmenter('ne', { granularity: 'grapheme' }).segment(str)][0].segment;
  return str[0];
};

// Wax seal: an irregular hand-poured disc with the couple's Devanagari initials pressed in.
const sealPath = (() => {
  const n = 22;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 52 + Math.sin(i * 2.7) * 2.6 + Math.cos(i * 1.3) * 2.2 + (i % 5 === 0 ? 3 : 0);
    return [60 + Math.cos(a) * r, 60 + Math.sin(a) * r];
  });
  let d = `M ${((pts[0][0] + pts[n - 1][0]) / 2).toFixed(1)} ${((pts[0][1] + pts[n - 1][1]) / 2).toFixed(1)}`;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % n];
    d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)} ${((p[1] + q[1]) / 2).toFixed(1)}`;
  });
  return `${d} Z`;
})();
export const sealSvg = (id, initials, esc) => `
  <svg class="seal__svg" viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <radialGradient id="wax${id}" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#C73A43"/><stop offset=".55" stop-color="#9B1D27"/><stop offset="1" stop-color="#6B1119"/></radialGradient>
      <filter id="waxShadow${id}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="2.6" flood-color="#40120f" flood-opacity=".42"/></filter>
    </defs>
    <path d="${sealPath}" fill="url(#wax${id})" filter="url(#waxShadow${id})"/>
    <circle cx="60" cy="60" r="38" fill="none" stroke="#6F1219" stroke-width="3.2" opacity=".55"/>
    <circle cx="60" cy="61.2" r="38" fill="none" stroke="#E07A7F" stroke-width="1" opacity=".45"/>
    <text x="60" y="71.6" text-anchor="middle" font-family="Eczar, serif" font-weight="700" font-size="29" fill="#E58489" opacity=".5">${esc(initials)}</text>
    <text x="60" y="70.4" text-anchor="middle" font-family="Eczar, serif" font-weight="700" font-size="29" fill="#6E1119">${esc(initials)}</text>
  </svg>`;

const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
/** The paper grain, mottle and Palpali Dhaka weave as custom properties on `style` (the page root, or a part's
 *  wrapper on another theme's page). `liningUrl` replaces the woven lining with the couple's own cloth photo. */
export function paperVars(style, { mobile = false, liningUrl = '' } = {}) {
  const band = palpaliTile({ cell: 2.4 });
  const lining = palpaliTile({ cell: mobile ? 3 : 3.5 });
  style.setProperty('--dhaka', `url(${band.url})`);
  style.setProperty('--lining-weave', `url(${lining.url})`);
  style.setProperty('--lining-size', `${lining.width}px ${lining.height}px`);
  style.setProperty('--paper-grain', svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .40  0 0 0 0 .32  0 0 0 0 .22  0 0 0 .12 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`));
  style.setProperty('--paper-mottle', svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='700' height='700'><filter id='m'><feTurbulence type='fractalNoise' baseFrequency='.008' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .55  0 0 0 0 .45  0 0 0 0 .32  0 0 0 .14 0'/></filter><rect width='100%' height='100%' filter='url(#m)'/></svg>`));
  if (liningUrl) {
    style.setProperty('--lining-weave', `url("${encodeURI(liningUrl)}")`);
    style.setProperty('--lining-size', 'cover');
  }
}

/** The welcome frame waits for its entrance: flowers just outside their corners, photo and words hidden. (On Dhaka's
 *  own page the envelope's table does this instead.) */
export function welcomeClosed(root, FRAME, reduced) {
  const fl = [...root.querySelectorAll('.wf')];
  const fig = root.querySelector('.welcome__photo');
  const ins = root.querySelectorAll('.w-in');
  if (reduced) {
    fl.forEach((el, i) => gsap.set(el, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1, rotation: FRAME[i][4] }));
    gsap.set([...ins, fig].filter(Boolean), { opacity: 0 });
    gsap.set(fl, { opacity: 0 });
    return;
  }
  const W = root.clientWidth || window.innerWidth;
  const H = root.clientHeight || window.innerHeight;
  fl.forEach((el, i) => {
    const [, x, y, , rot] = FRAME[i];
    // each bloom waits just outside its corner (the section clips it), so the frame gathers inward into place;
    // flowers never fade (a half-transparent bloom looks wilted)
    const dx = x - 0.5; const dy = y - 0.5; const k = 0.62 / Math.max(0.2, Math.hypot(dx, dy));
    gsap.set(el, { xPercent: -50, yPercent: -50, x: dx * k * W, y: dy * k * H, scale: 0.9, rotation: rot + (x < 0.5 ? -18 : 18), opacity: 1 });
  });
  gsap.set(ins, { opacity: 0, y: 14 });
  if (fig) gsap.set(fig, { opacity: 0, y: 22, scale: 0.96 });
}

/** The welcome frame comes in from `at`: the bouquets slide into their corners, the photo settles, the words
 *  follow. Returns when the words are in. */
export function welcomeEnter(tl, at, root, FRAME, reduced) {
  const fl = [...root.querySelectorAll('.wf')];
  const fig = root.querySelector('.welcome__photo');
  const ins = [...root.querySelectorAll('.w-in')];
  if (reduced) {
    tl.to([...fl, fig, ...ins].filter(Boolean), { opacity: 1, duration: 0.5 }, at);
    return at + 0.5;
  }
  tl.set(fl, { willChange: 'transform' }, at)
    .to(fl, {
      x: 0, y: 0, scale: 1, rotation: (i) => FRAME[i][4], duration: 1.6, ease: 'power3.out',
      stagger: { each: 0.035, from: 'edges' },
    }, at)
    .set(fl, { willChange: '' }, at + 2.4); // own page: dhaka.css keeps its own rule
  if (fig) tl.to(fig, { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power3.out', clearProps: 'transform' }, at + 0.25);
  const t = at + 0.75;
  tl.to(ins, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out' }, t);
  return t + ins.length * 0.08;
}
