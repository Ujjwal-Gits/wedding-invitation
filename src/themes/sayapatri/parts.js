// Sayapatri's pieces, shared by its own page (main.js) and by its gate and hero modules (gate.js, hero.js), which can
// run on another theme's page (docs/MIX.md). The markup builders take `own`: the theme's own page keeps its ids; a
// module gets none (the ids belong to the page it is on).
import { photoUrl, photos } from '../../photos.js';
import { bi, esc, dateOf, bsDateOf } from '../../core/i18n.js';

export const FLORA = '/themes/sayapatri/flora/';

const focalOf = (ref) => {
  const f = (typeof ref === 'string' && photos[ref]?.focal) || (ref && typeof ref === 'object' && Array.isArray(ref.focal) && ref.focal) || [0.5, 0.5];
  const n = (v) => Math.min(100, Math.max(0, Number(v) * 100 || 50)).toFixed(1);
  return `${n(f[0])}% ${n(f[1])}%`;
};
/** Responsive <img> for any photo reference. Known pixel size is passed on so layout never jumps. */
export const pic = (ref, alt = '', sizes = '50vw', extra = '') => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  const set = sm && lg && sm !== lg ? ` srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w" sizes="${esc(sizes)}"` : '';
  const wh = ref && typeof ref === 'object' && ref.w && ref.h ? ` width="${Number(ref.w)}" height="${Number(ref.h)}"` : '';
  return `<img src="${esc(sm || lg)}"${set}${wh} alt="${esc(alt)}" style="object-position:${focalOf(ref)}" decoding="async" ${extra} />`;
};
/** Decorative floral layer (real marigolds and mango leaves, cut out, transparent WebP). `base` is the shared class:
 *  `fl` on the theme's own page, `sp-fl` in a module (Dhaka uses `.fl` for its own flowers). */
export const fl = (name, cls, extra = '', base = 'fl') => `<img class="${base} ${cls}" src="${FLORA}${name}.webp" alt="" aria-hidden="true" decoding="async" ${extra} />`;

export const namesHtml = (c, tag = 'span') => `
    <${tag} class="sp-names__a">${bi(c.bride.name)}</${tag}>
    <span class="sp-names__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span>
    <${tag} class="sp-names__b">${bi(c.groom.name)}</${tag}>`;
/** The B.S. date line: the event's own, or the shared converter's short form. */
export const bsLine = (e) => {
  const b = bsDateOf(e.start, e.dateBS);
  return e.dateBS && (e.dateBS.en || e.dateBS.ne) ? { en: e.dateBS.en || e.dateBS.ne, ne: e.dateBS.ne || e.dateBS.en } : { en: `${b.short.en} B.S.`, ne: `वि.सं. ${b.short.ne}` };
};
export const weddingDayOf = (config, events) => ({ start: config.weddingDate, dateBS: events.find((e) => e.id === 'wedding')?.dateBS });

// ───────────────────────── gate: the marigold doorway ─────────────────────────
/** p = { c, config, txt, weddingDay }. Own page: ids for main.js; a module: buttons for mix, the card marked [data-mx-ui]. */
export function gateHtml({ c, config, txt, weddingDay }, own = true) {
  const base = own ? 'fl' : 'sp-fl';
  // Strands are listed outer → inner; lengths come from the art itself, so each side differs a little.
  const strands = (side, list) => `<div class="sp-strands sp-strands--${side}" aria-hidden="true">${list.map((n, i) => fl(`strand-${n}`, `sp-strand sp-strand--${i}`, '', base)).join('')}</div>`;
  return `
  <div class="sp-gate${own ? '' : ' sp-gate--mx'}"${own ? ' id="gate"' : ''}>
    <div class="sp-door" aria-hidden="true">
      <span class="sp-door__frame"></span>
      ${strands('l', [1, 2, 3])}
      ${strands('r', [4, 5, 6])}
      <span class="sp-door__lintel"></span>
      <picture class="sp-toran">
        <source media="(max-width: 760px)" srcset="${FLORA}toran-sm.webp" />
        <img src="${FLORA}toran-lg.webp" alt="" decoding="async" fetchpriority="high" />
      </picture>
    </div>
    <div class="sp-gate__card"${own ? '' : ' data-mx-ui'}><div class="sp-gate__panel">
      <p class="sp-kicker">${bi(txt('gate.kicker'))}</p>
      <p class="sp-names sp-names--gate">${namesHtml(c)}</p>
      <p class="sp-gate__date">${bi(dateOf(config.weddingDate))}<span>${bi(bsLine(weddingDay))}</span></p>
      <p class="sp-gate__line">${bi(txt('gate.line'))}</p>
      ${own ? '<p class="sp-gate__guest" id="gate-guest" hidden></p>' : ''}
      <div class="sp-gate__choices">
        <button type="button" class="sp-btn" ${own ? 'id="enter-music"' : 'data-mx-open disabled'}>${bi(txt('gate.open'))}</button>
        <button type="button" class="sp-quiet" ${own ? 'id="enter-quiet"' : 'data-mx-quiet disabled'}>${bi(txt('gate.quiet'))}</button>
      </div>
    </div></div>
  </div>`;
}
/** Arrival: the toran settles, the strings drop into place, the card appears. Quiet. */
export function gateArrive(gsap, root = document) {
  const q = (s) => root.querySelectorAll(s);
  gsap.from(q('.sp-toran'), { yPercent: -40, autoAlpha: 0, duration: 0.7, ease: 'spOut' });
  gsap.from(q('.sp-strand'), { yPercent: -14, autoAlpha: 0, duration: 0.8, ease: 'spOut', stagger: 0.04, delay: 0.1 });
  gsap.from(q('.sp-gate__card'), { y: 14, autoAlpha: 0, duration: 0.7, ease: 'spOut', delay: 0.3 });
}
/** Signature: the marigold strings lift into the lintel, inner strings first, like a curtain raised. */
export function gateLift(gsap, tl, root = document, { card = true } = {}) {
  const byDepth = (side) => [...root.querySelectorAll(`.sp-strands--${side} .sp-strand`)].reverse();
  const strandsInOut = [0, 1, 2].flatMap((i) => [byDepth('l')[i], byDepth('r')[i]]).filter(Boolean);
  if (card) tl.to(root.querySelectorAll('.sp-gate__card'), { autoAlpha: 0, y: -12, duration: 0.32, ease: 'sp' }, 0);
  tl.to(strandsInOut, { yPercent: -112, duration: 0.85, ease: 'sp', stagger: 0.05 }, 0.1)
    .to(root.querySelectorAll('.sp-strands--l'), { x: -24, duration: 0.85, ease: 'sp' }, 0.1)
    .to(root.querySelectorAll('.sp-strands--r'), { x: 24, duration: 0.85, ease: 'sp' }, 0.1)
    .to(root.querySelectorAll('.sp-toran'), { yPercent: -130, duration: 0.6, ease: 'sp' }, 0.5)
    .to(root.querySelectorAll('.sp-door__frame, .sp-door__lintel'), { autoAlpha: 0, duration: 0.4, ease: 'sp' }, 0.45);
}

// ───────────────────────── welcome: names + one feature photo ─────────────────────────
/** p = { c, config, txt, weddingDay, heroRef, heroAlt }. Own page: the section with its ids; a module: the inner block. */
export function heroHtml({ c, config, txt, weddingDay, heroRef, heroAlt }, own = true) {
  const tag = own ? 'section' : 'div';
  const inn = own ? 'data-in' : 'data-sp-in';
  return `
  <${tag} class="sp-hero"${own ? ' id="welcome" aria-labelledby="hero-names"' : ''}>
    <div class="sp-hero__text">
      <p class="sp-kicker" ${inn}>${bi(txt('hero.kicker'))}</p>
      <h1 class="sp-names"${own ? ' id="hero-names" tabindex="-1"' : ''} ${inn}>${namesHtml(c)}</h1>
      <p class="sp-hero__date" ${inn}>
        <span class="sp-hero__ad">${bi(dateOf(config.weddingDate))}</span>
        <span class="sp-hero__bs">${bi(bsLine(weddingDay))}</span>
        <span class="sp-hero__city">${bi(config.city)}</span>
      </p>
      <p class="sp-hero__line" ${inn}>${bi(txt('hero.line'))}</p>
    </div>
    ${heroRef ? `
    <figure class="sp-feature" ${inn}>
      <span class="sp-feature__frame">${pic(heroRef, heroAlt, '(max-width: 760px) 92vw, 44vw', 'fetchpriority="high"')}</span>
      ${fl('cluster', 'sp-feature__cluster', '', own ? 'fl' : 'sp-fl')}
    </figure>` : ''}
  </${tag}>`;
}
