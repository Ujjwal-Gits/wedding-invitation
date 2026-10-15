// Swayambar's pieces, shared by its own page (main.js) and by its gate and hero modules (gate.js, hero.js), which can
// run on another theme's page (docs/MIX.md). Markup builders take the same ctx the suite engine passes to T.gate/T.hero.
import { gsap } from 'gsap';

export const A = '/themes/swayambar/art/';

/** a garland picture (the U hangs from above the frame) */
export const garlandImg = (sizes, eager = false) => `<img src="${A}garland-sm.webp" srcset="${A}garland-sm.webp 421w, ${A}garland.webp 983w" sizes="${sizes}" width="983" height="1400" alt="" decoding="async"${eager ? ' fetchpriority="high"' : ''} />`;
export const GW = '(max-width: 700px) 80vw, 420px';
export const garlands = (cls, eager) => `<div class="sw-garls ${cls}" aria-hidden="true">
    <div class="sw-garl sw-garl--l"><div class="sw-garl__sway">${garlandImg(GW, eager)}</div></div>
    <div class="sw-garl sw-garl--r"><div class="sw-garl__sway">${garlandImg(GW, eager)}</div></div>
  </div>`;

/** a fine gold rule with a small marigold bud in the middle */
export const rule = (cls = '') => `<svg class="sw-rule ${cls}" viewBox="0 0 220 14" aria-hidden="true" focusable="false">
  <path d="M0 7H92M128 7H220" /><circle cx="110" cy="7" r="4.2" class="sw-rule__bud" /><circle cx="110" cy="7" r="1.6" class="sw-rule__eye" />
  <circle cx="99" cy="7" r="1.5" class="sw-rule__dot" /><circle cx="121" cy="7" r="1.5" class="sw-rule__dot" /></svg>`;


/** the hero: ivory silk, the jaimala; the groom's name on his side and the bride's on hers */
export function heroHtml(ctx) {
  const { bi, esc, txt, on, AD, BS, c, S, photoUrl } = ctx;
  const inv = txt('hero.invocation');
  const coupleRef = S.img('hero.couple');
  const g = c.groom; const b = c.bride;
  return `
    <div class="sw-hero">
      ${garlands('sw-hero__garls', false)}
      <div class="sw-hero__body">
        ${ctx.ganeshRef ? `<div class="sw-medal sw-hero__gan" aria-hidden="false">${ctx.ganesh('sw-medal__img', '96px')}</div>` : ''}
        ${on(inv) ? `<p class="sw-inv su-in" lang="ne">${esc(inv.ne || inv.en)}</p>` : ''}
        <p class="sw-title su-in">${bi(txt('hero.title'))}</p>
        ${coupleRef ? `<figure class="sw-couple su-in"><img src="${esc(photoUrl(coupleRef, 'sm'))}" srcset="${esc(photoUrl(coupleRef, 'sm'))} 600w, ${esc(photoUrl(coupleRef, 'lg'))} 1400w" sizes="(max-width: 700px) 74vw, 400px" alt="${esc(S.alt('hero.couple') || 'The bride and groom exchange garlands')}" fetchpriority="high" decoding="async" /></figure>` : ''}
        <h1 class="sw-names su-in">
          <span class="sw-names__g">${bi(g.name)}</span><span class="sw-names__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span><span class="sw-names__b">${bi(b.name)}</span>
        </h1>
        ${on(txt('hero.line')) ? `<p class="sw-hline su-in">${bi(txt('hero.line'))}</p>` : ''}
        <p class="sw-hdate su-in">${bi({ en: `${AD.wd.en} · ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.day && BS.month && BS.year ? `${AD.wd.ne} · ${BS.month} ${BS.day}, ${BS.year}` : (BS.full.ne || AD.full.ne) })}</p>
      </div>
    </div>`;
}

/** the gate: two garlands hang from above and interlock in the middle on wine silk, Ganesh inside their loop */
export const gateScene = (ctx) => `
    <div class="sw-g">
      <div class="sw-g__bg sw-g__bg--l"></div><div class="sw-g__bg sw-g__bg--r"></div>
      <div class="sw-g__frame"></div>
      ${garlands('sw-g__garls', true)}
      <div class="sw-g__front">
        ${ctx.ganeshRef ? `<div class="sw-medal sw-g__gan">${ctx.ganesh('sw-medal__img', '96px')}</div>` : ''}
      </div>
      <div class="sw-g__words">
        <p class="sw-g__title">${ctx.bi(ctx.txt('hero.title'))}</p>
        <p class="sw-g__names"><span>${ctx.bi(ctx.c.groom.name)}</span><span class="sw-g__amp" aria-hidden="true">&amp;</span><span>${ctx.bi(ctx.c.bride.name)}</span></p>
      </div>
    </div>`;

// ───────── the gate's closed pose: the two garlands interlocked in the middle ─────────
const CLOSED_TILT = 5.5;
function closedPose(root) {
  const els = [...root.querySelectorAll('.sw-g .sw-garl')];
  if (!els.length) return [];
  const gw = els[0].offsetWidth;
  const mid = root.querySelector('.sw-g').offsetWidth / 2;
  return els.map((el, i) => {
    const centre = el.offsetLeft + gw / 2;
    const target = mid + (i ? 1 : -1) * gw * 0.13;
    return { el, x: target - centre, r: (i ? 1 : -1) * CLOSED_TILT };
  });
}
/** put the garlands in their closed pose and the medallion in their shared loop (call again on resize) */
export function placeGate(root) {
  const pose = closedPose(root);
  pose.forEach(({ el, x, r }) => gsap.set(el, { x, rotation: r }));
  const gan = root.querySelector('.sw-g__gan');
  if (gan && pose.length) {
    const gw = pose[0].el.offsetWidth;
    gan.style.top = `${Math.round(gw * 1.4238 * 0.2)}px`;
  }
}

/** The jaimala parts: the words fall quiet, the hanging points draw apart and each garland swings like a heavy
 *  pendulum (it lags, overshoots and settles), the wine silk parts from the middle out. */
export function gateSwing(tl, root) {
  const q = (s) => root.querySelector(s);
  tl.to(q('.sw-g__words'), { autoAlpha: 0, y: 12, duration: 0.5, ease: 'power2.in' }, 0.02);
  // the hanging points draw apart; each garland lags behind, swings past, and settles: a heavy pendulum
  [q('.sw-g .sw-garl--l'), q('.sw-g .sw-garl--r')].forEach((el, i) => {
    if (!el) return;
    const s = i ? 1 : -1; // the way this garland travels
    const at = 0.18 + i * 0.07;
    tl.to(el, { x: 0, duration: 1.7, ease: 'power2.inOut' }, at);
    tl.to(el, { keyframes: [
      { rotation: s * 15, duration: 0.62, ease: 'power1.out' },  // the bottom lags toward the middle
      { rotation: -s * 10, duration: 0.82, ease: 'sine.inOut' }, // and swings out past the vertical
      { rotation: s * 4.6, duration: 0.72, ease: 'sine.inOut' },
      { rotation: -s * 1.8, duration: 0.62, ease: 'sine.inOut' },
      { rotation: 0, duration: 0.6, ease: 'sine.out' },
    ] }, at);
  });
  // the wine silk parts behind them like a curtain, from the middle out
  tl.to(q('.sw-g__frame'), { opacity: 0, duration: 0.5, ease: 'sine.in' }, 0.2);
  tl.to(q('.sw-g__bg--l'), { xPercent: -101, duration: 1.45, ease: 'power3.inOut' }, 0.4);
  tl.to(q('.sw-g__bg--r'), { xPercent: 101, duration: 1.45, ease: 'power3.inOut' }, 0.4);
}

/** The hero's garlands and medallion come down into place from `t` (after a gate that does not bring them, as
 *  Swayambar's own gate does) */
export function heroEnter(tl, t, root, reduced) {
  const garls = root?.querySelector('.sw-hero__garls');
  const gan = root?.querySelector('.sw-hero__gan');
  const els = [garls, gan].filter(Boolean);
  if (!els.length) return;
  if (reduced) { tl.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.5 }, t); return; }
  if (garls) tl.fromTo(garls, { opacity: 0, y: -36 }, { opacity: 1, y: 0, duration: 1.3, ease: 'power3.out' }, t);
  if (gan) tl.fromTo(gan, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power3.out' }, t + 0.35);
}

/** as the hero leaves, its garlands lift a little (wider screens only) */
export function heroScroll(root) {
  const garls = root?.querySelector('.sw-hero__garls');
  if (!garls || matchMedia('(max-width: 699px)').matches) return;
  gsap.to(garls, { y: -50, ease: 'none', scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true } });
}
