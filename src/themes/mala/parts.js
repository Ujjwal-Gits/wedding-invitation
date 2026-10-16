// Mala's pieces, shared by its own page (main.js) and by its gate and hero modules (gate.js, hero.js), which can
// run on another theme's page (docs/MIX.md). The markup builders take `own`: Mala's own page keeps its ids; a
// module gets none (the ids belong to the page it is on).
import { photos, photoUrl } from '../../photos.js';
import credits from '../../generated/credits.json';
import { bi, esc, dateOf, bsDateOf } from '../../core/i18n.js';

export const DECOR = '/themes/mala/decor/';

// ───────── photographs: true proportions, never cropped by their frame ─────────
const dims = Object.fromEntries(credits.map((k) => [String(k.file || k.slot).replace(/\.(jpe?g|png|webp)$/i, ''), [k.width, k.height]]));
export const isUrl = (s) => typeof s === 'string' && (s.startsWith('/') || s.startsWith('https://'));
export const keyOf = (ref) => (typeof ref === 'string' ? ref : ref && typeof ref === 'object' ? ref.lg || ref.sm || '' : '');
export const aspectOf = (ref) => {
  if (typeof ref === 'string' && dims[ref]?.[0]) return dims[ref][0] / dims[ref][1];
  if (ref && typeof ref === 'object' && ref.w && ref.h) return ref.w / ref.h;
  return 0;
};
export const focalOf = (ref) => (typeof ref === 'string' && photos[ref]?.focal) || (ref && typeof ref === 'object' && ref.focal) || [0.5, 0.5];

/** <img> with both sizes and the focal point; never cropped by its frame (frames take the photo's ratio). */
export const img = (ref, alt, sizes, { eager = false } = {}) => {
  const sm = photoUrl(ref, 'sm'); const lg = photoUrl(ref, 'lg');
  const [fx, fy] = focalOf(ref);
  return `<img src="${esc(sm)}" ${sm !== lg ? `srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w"` : ''} sizes="${sizes}" alt="${esc(alt || '')}"
    style="object-position:${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
};
export const plate = (ref, alt, sizes, cls = '', opts) => {
  const ar = aspectOf(ref);
  return `<span class="ml-plate ${cls}" data-ar="${ar ? '1' : 'auto'}" style="--ar:${(ar || 0.75).toFixed(4)}">${img(ref, alt, sizes, opts)}</span>`;
};

// ───────── decoration: the sindoor valance, brass kalash arrangements, fresh-flower photo corners ─────────
export const drape = (cls) => `<picture class="${cls}"><source media="(max-width: 760px)" srcset="${DECOR}drape-sm.webp" /><img src="${DECOR}drape.webp" alt="" decoding="async" /></picture>`;
const DIM = { 'kalash-a': [760, 926], 'kalash-b': [760, 915], 'corner-tl': [720, 611], 'corner-br': [720, 610], 'corner-tr': [720, 610], 'corner-bl': [720, 612] };
const wh = (n) => `width="${DIM[n][0]}" height="${DIM[n][1]}"`;
export const kalash = (v, cls, lazy = true) => `<img class="ml-kalash ${cls}" ${wh(`kalash-${v}`)} src="${DECOR}kalash-${v}.webp" srcset="${DECOR}kalash-${v}-sm.webp 380w, ${DECOR}kalash-${v}.webp 760w" sizes="(max-width: 760px) 30vw, 300px" alt="" aria-hidden="true" ${lazy ? 'loading="lazy" ' : ''}decoding="async" />`;
export const corner = (k, lazy = true) => `<img class="ml-corner ml-corner--${k}" ${wh(`corner-${k}`)} src="${DECOR}corner-${k}.webp" srcset="${DECOR}corner-${k}-sm.webp 400w, ${DECOR}corner-${k}.webp 720w" sizes="(max-width: 760px) 40vw, 260px" alt="" aria-hidden="true" ${lazy ? 'loading="lazy" ' : ''}decoding="async" />`;

const AND = { en: 'and', ne: 'र' };

// ───────── the gate: a dressed mandap the guest walks into ─────────
/** p = { c, config, txt }. Own page: ids for main.js; a module: buttons for mix, the words marked [data-mx-ui]. */
export function gateHtml({ c, config, txt }, own = true) {
  return `
  <div class="ml-arch"${own ? ' id="gate-arch"' : ''} aria-hidden="true">
    <div class="ml-arch__strands"${own ? ' id="gate-strands"' : ''}></div>
    ${drape('ml-drape ml-arch__drape')}
    ${kalash('a', 'ml-arch__kl', false)}
    ${kalash('b', 'ml-arch__kr', false)}
  </div>
  <div class="ml-gate__inner"${own ? '' : ' data-mx-ui'}>
    <p class="ml-kicker">${bi(txt('gate.from'))}</p>
    <p class="ml-gate__names"><span class="ml-gate__n">${bi(c.bride.name)}</span><span class="ml-amp" aria-hidden="true">&amp;</span><span class="sr-only">${bi(AND)}</span><span class="ml-gate__n">${bi(c.groom.name)}</span></p>
    <p class="ml-gate__date">${bi(dateOf(config.weddingDate))}</p>
    <p class="ml-gate__hosts">${bi(config.hosts)}</p>
    <div class="ml-gate__actions">
      <button class="ml-btn" type="button" ${own ? 'id="enter"' : 'data-mx-open'} disabled>${bi(txt('gate.open'))}</button>
      <button class="ml-quiet" type="button" ${own ? 'id="enter-quiet"' : 'data-mx-quiet'} disabled>${bi(txt('gate.quiet'))}</button>
    </div>
  </div>`;
}

// ───────── the hero: the names beside one white-matted photograph with fresh-flower corners ─────────
/** p = { c, config, txt, heroRef, heroAlt }. Own page: the section with its ids and cue; a module: the inner block. */
export function heroHtml({ c, config, txt, heroRef, heroAlt }, own = true) {
  const tag = own ? 'section' : 'div';
  return `
  <${tag} class="ml-hero"${own ? ' id="top" aria-labelledby="hero-names"' : ''}>
    <div class="ml-hero__grid">
      <div class="ml-hero__text">
        <p class="ml-kicker ml-rv">${bi(txt('hero.kicker'))}</p>
        <h1 class="ml-names ml-rv"${own ? ' id="hero-names"' : ''}>
          <span class="ml-names__one">${bi(c.bride.name)}</span>
          <span class="ml-names__amp" aria-hidden="true">&amp;</span><span class="sr-only">${bi(AND)}</span>
          <span class="ml-names__two">${bi(c.groom.name)}</span>
        </h1>
        <p class="ml-hero__line ml-rv">${bi(txt('hero.line'))}</p>
        <p class="ml-hero__date ml-rv"><b>${bi(dateOf(config.weddingDate))}</b><span>${bi(bsDateOf(config.weddingDate, config.weddingDateBS?.en ? config.weddingDateBS : null))}</span><span>${bi(config.city)}</span></p>
      </div>
      <figure class="ml-hero__fig"${own ? ' id="hero-fig"' : ''} style="--ar:${(aspectOf(heroRef) || 0.75).toFixed(4)}">
        ${plate(heroRef, heroAlt, '(max-width: 760px) 74vw, 34vw', 'ml-hero__plate', { eager: true })}
        ${corner('tl', false)}
        ${corner('br', false)}
      </figure>
    </div>
    ${own ? `<span class="ml-cue" aria-hidden="true">${bi({ en: 'Scroll', ne: 'तल जानुहोस्' })}<i></i></span>` : ''}
  </${tag}>`;
}

/** The hero settles in from `at`: the grid comes forward a touch, the words rise in turn. */
export function heroEnter(tl, at, root = document) {
  tl.fromTo(root.querySelector('.ml-hero__grid'), { scale: 0.95 }, { scale: 1, duration: 1.5, ease: 'power2.out', clearProps: 'transform' }, at)
    .fromTo(root.querySelectorAll('.ml-hero .ml-rv'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 }, at + 0.55);
}

// ───────── marigold strings hung from the valance ─────────
export const local = (el, host) => {
  const a = el.getBoundingClientRect(); const b = host.getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height, cx: a.left - b.left + a.width / 2 };
};
const box = (r, pad = 0) => ({ l: r.x - pad, r: r.x + r.w + pad, t: r.y - pad, b: r.y + r.h + pad });
/** Marigold strings hung from the valance, each finished with one small marigold. They hang at the
 *  sides and under the rosettes, and are cut short wherever they would reach text, a photo or a kalash. */
export function hangStrings(scene, host, drapeImg, obstacles) {
  scene.clear(); scene.resize();
  const d = local(drapeImg, host);
  if (!d.w) return;
  const small = /drape-sm/.test(drapeImg.currentSrc || '') || d.w < 761;
  const n = small ? 3 : 5;
  const W = d.w; const H = scene.h;
  const jy = d.y + W * (small ? 0.034 : 0.021);
  const by = d.y + W * (small ? 0.03 : 0.018);
  const rw = small ? 16 : Math.max(18, Math.min(26, W / 80));
  const drop = rw * 1.75;
  const pad = small ? 10 : 30;
  const tex = ['rope-alt2', 'rope-orange', 'rope-alt'];
  const plan = [];
  const side = small ? [[0.026, 0.52], [0.062, 0.42], [0.098, 0.34]] : [[0.012, 0.52], [0.03, 0.44], [0.048, 0.37], [0.066, 0.3]];
  side.forEach(([f, len], i) => {
    plan.push([d.x + W * f, by, H * len, tex[i % 3]]);
    plan.push([d.x + W * (1 - f), by, H * len * 0.95, tex[(i + 1) % 3]]);
  });
  for (let k = 1; k < n; k++) plan.push([d.x + (W * k) / n, jy, H * (k === 1 || k === n - 1 ? 0.3 : 0.22), tex[(k + 2) % 3]]);
  // a short string from the posy at the foot of every swag (dropped wherever it would only be a stub)
  const fy = d.y + W * (small ? 0.205 : 0.092);
  for (let k = 0; k < n; k++) plan.push([d.x + (W * (k + 0.5)) / n, fy, H * (k === 0 || k === n - 1 ? 0.24 : 0.16), tex[k % 3]]);
  const obs = obstacles.filter(Boolean).map((r) => box(r, pad));
  plan.forEach(([x, y0, len, t], i) => {
    let end = y0 + len;
    for (const o of obs) {
      if (x + rw / 2 > o.l && x - rw / 2 < o.r && end + drop > o.t && y0 < o.b) end = Math.min(end, o.t - drop);
    }
    // a string must show a real length below the valance, never just a stub with a flower
    if (end < d.y + d.h + (small ? 44 : 70)) return;
    scene.add({
      tex: t, width: rw, length: end - y0, z: 2 + (i % 2), stiff: 0.5, vOffset: i * 0.37,
      pins: [{ i: 0, at: () => [x, y0] }],
      ornaments: [{ tex: 'drop', f: 1, w: drop * 1.36, mode: 'hang', overlap: drop * 1.36 * 0.125 + rw * 0.3 }],
    });
  });
  scene.settle(360);
}
/** The gate's strings, cut short above the words and the two kalash. */
export function buildGate(scene, gateEl, strandsEl) {
  if (!strandsEl.isConnected) return;
  const inner = [...gateEl.querySelectorAll('.ml-gate__inner > *')].map((el) => local(el, strandsEl)).filter((r) => r.w);
  const text = inner.length ? (() => {
    const l = Math.min(...inner.map((r) => r.x)); const t = Math.min(...inner.map((r) => r.y));
    const r = Math.max(...inner.map((q) => q.x + q.w)); const b = Math.max(...inner.map((q) => q.y + q.h));
    return { x: l, y: t, w: r - l, h: b - t };
  })() : null;
  const kal = [...gateEl.querySelectorAll('.ml-kalash')].map((el) => local(el, strandsEl));
  hangStrings(scene, strandsEl, gateEl.querySelector('.ml-arch__drape img'), [text, ...kal]);
}
