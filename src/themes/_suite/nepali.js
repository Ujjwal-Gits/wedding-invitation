// Nepali wedding decor for the card suite: real brass diyo and Panas lamps with a LIVE flame, a brass kalash,
// a fresh marigold toran, the ganthi bandhan (the couple's knotted shawls), the saptapadi footprints, the sindoor
// daan, fresh marigold-and-rose corners and a Dhaka weave. All pictures are Canva AI paintings made for the suite
// (public/themes/_nepali/). Each helper returns markup; call initNepali() once after the page is in the DOM.
//
// The flame: two photographed flames cross-fade while the whole flame sways, stretches and leans from its wick
// (transform only, randomised timing per flame), over a warm glow that breathes. Flames pause off-screen and stand
// still under reduced motion.
import './nepali.css';

export const NP = '/themes/_nepali/';
// where the wicks are in each lamp picture (fractions of its width/height) and the picture's height/width
export const LAMP = {
  diyo: { ar: 1.1789, wicks: [[0.925, 0.195]] },
  panas: { ar: 2.6042, wicks: [[0.045, 0.152], [0.19, 0.122], [0.81, 0.122], [0.955, 0.152]] },
};

const img = (name, cls, sizes, alt = '', lazy = true) => `<img class="${cls}" src="${NP}${name}-sm.webp" srcset="${NP}${name}-sm.webp 480w, ${NP}${name}.webp 1000w" sizes="${sizes}" alt="${alt}" decoding="async"${lazy ? ' loading="lazy"' : ''} />`;

/** a live flame; size it with the --np-flame CSS variable (its height) or by its container */
export function flame(cls = '') {
  const r = (a, b) => (a + Math.random() * (b - a)).toFixed(2);
  return `<span class="np-flame ${cls}" aria-hidden="true" style="--d1:${r(1.6, 2.4)}s;--d2:${r(0.9, 1.5)}s;--d3:${r(3, 4.6)}s;--dl:-${r(0, 3)}s">
    <i class="np-flame__glow"></i><span class="np-flame__body"><img class="np-flame__a" src="${NP}flame-a.webp" alt="" decoding="async" /><img class="np-flame__b" src="${NP}flame-b.webp" alt="" decoding="async" /></span></span>`;
}

/** a brass lamp (diyo | panas) with live flames on its wicks; width via CSS on .np-lamp or `w` (px) */
export function lamp(kind = 'diyo', { cls = '', w = null, sizes = '120px' } = {}) {
  const L = LAMP[kind];
  return `<span class="np-lamp np-lamp--${kind} ${cls}" data-hindu style="${w ? `width:${w}px;` : ''}--ar:${L.ar}" aria-hidden="true">
    ${img(kind, 'np-lamp__img', sizes)}
    ${L.wicks.map(([x, y]) => `<span class="np-lamp__wick" style="left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%">${flame()}</span>`).join('')}
  </span>`;
}

// Faith (src/core/faith.js): the brass lamps, the kalash and the rites are Hindu; they leave the page when its
// symbols are not Hindu ([data-hindu]) or its community is not ([data-hindu-rite]). The toran and the flowers stay.
export const kalash = (cls = '', sizes = '160px') => `<span class="np-pic np-kalash ${cls}" data-hindu aria-hidden="true">${img('kalash', '', sizes)}</span>`;
export const toran = (cls = '', sizes = '100vw') => `<span class="np-pic np-toran ${cls}" aria-hidden="true">${img('toran', '', sizes)}</span>`;
export const ganthi = (cls = '', sizes = '300px', alt = '') => `<span class="np-pic np-ganthi ${cls}" data-hindu-rite${alt ? '' : ' aria-hidden="true"'}>${img('ganthi', '', sizes, alt)}</span>`;
export const saptapadi = (cls = '', sizes = '200px', alt = '') => `<span class="np-pic np-saptapadi ${cls}" data-hindu-rite${alt ? '' : ' aria-hidden="true"'}>${img('saptapadi', '', sizes, alt)}</span>`;
export const sindoorDaan = (cls = '', sizes = '300px', alt = '') => `<span class="np-pic np-sindoor ${cls}" data-hindu-rite${alt ? '' : ' aria-hidden="true"'}>${img('sindoor-daan', '', sizes, alt)}</span>`;
/** fresh marigolds, roses and jasmine as a corner spray; corner: tl | tr | bl | br */
export const flowers = (corner = 'tl', cls = '', sizes = '200px') => `<span class="np-pic np-flowers np-flowers--${corner} ${cls}" aria-hidden="true">${img('flowers', '', sizes)}</span>`;
/** the Palpali Dhaka weave as a CSS background url (a tile) */
export const DHAKA = `url("${NP}dhaka-sm.webp")`;

/** Start the flames (pause off-screen). Safe to call more than once. */
export function initNepali(root = document) {
  const flames = [...root.querySelectorAll('.np-flame:not([data-np])')];
  flames.forEach((f) => { f.dataset.np = '1'; });
  if (!('IntersectionObserver' in window)) { flames.forEach((f) => f.classList.add('is-live')); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-live', e.isIntersecting)), { rootMargin: '80px' });
  flames.forEach((f) => io.observe(f));
}
