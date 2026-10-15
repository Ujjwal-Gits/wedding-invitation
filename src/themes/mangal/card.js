// Mangal's first screen, the red card inside the doorway: the red arch ruled in gold over a Dhaka band, Shri Ganesh
// large and glowing (then softly behind the words), ॥ श्री गणेशाय नमः ॥, शुभ विवाह, the names and one warm line.
// Shared by Mangal's own page (main.js, where it waits behind the doorway) and its hero module (hero.js, the first
// screen of another theme's page). Elements are passed in, never looked up by id.
import { gsap } from 'gsap';
import { esc, bi } from '../../core/i18n.js';
import { photoUrl } from '../../photos.js';
import { dividerSVG } from './art.js';

/** How strongly Ganesh stays behind the words once they are in. */
export const WATERMARK = 0.16;
/** "-", "none" or "off" in a text slot turns that element off (religious marks are optional). */
const isOff = (v) => !v || /^\s*(-|–|none|off|no|hide)\s*$/i.test(v);
const on = (o) => !!o && (!isOff(o.en) || !isOff(o.ne));

/**
 * The card's markup. o = { ganeshRef, symbol, invocation, title, blessing, names (html), cue (html, optional) };
 * `ids`: Mangal's own page keeps the element ids it has always had; the module's copy has none.
 */
export function cardHTML(o, { ids = false } = {}) {
  const id = (v) => (ids ? ` id="${v}"` : '');
  const { ganeshRef, symbol, invocation, title, blessing } = o;
  const gan = ganeshRef
    ? `<div class="mg-gan"${id('gan')} aria-hidden="true"><i class="mg-gan__glow"${id('ganglow')}></i><img class="mg-gan__img"${id('ganimg')} src="${esc(photoUrl(ganeshRef, 'sm'))}" srcset="${esc(photoUrl(ganeshRef, 'sm'))} 500w, ${esc(photoUrl(ganeshRef, 'lg'))} 1000w" sizes="(max-width: 700px) 80vw, 560px" alt="" decoding="async" /></div>`
    : '';
  return {
    inside: `<div class="mg-inside"${id('inside')} aria-hidden="true"><i class="mg-inside__rule"></i></div>`,
    content: `<div class="mg-panel__content"${id('pcontent')}>
      ${gan}
      <div class="mg-panel__inner"${id('pinner')}>
        <div class="mg-hero__text"${id('htext')}>
          ${!ganeshRef && on(symbol) ? `<p class="mg-symbol mg-in" lang="ne">${esc(symbol.ne || symbol.en)}</p>` : ''}
          ${on(invocation) ? `<p class="mg-invoke mg-in" lang="ne">${esc(invocation.ne || invocation.en)}</p>` : ''}
          <h1 class="mg-title mg-in"><span class="mg-title__ne" lang="ne">${esc(title.ne)}</span><span class="sr-only l-en"> (${esc(title.en)})</span></h1>
          <span class="mg-hero__div mg-in">${dividerSVG(180)}</span>
          <p class="mg-names mg-in"${id('names')}>${o.names}</p>
          ${on(blessing) ? `<p class="mg-bless mg-in">${bi(blessing)}</p>` : ''}
        </div>
      </div>
      ${o.cue || ''}
    </div>`,
  };
}

/** The card's elements, by class, inside `box`. */
export function cardRefs(box) {
  const q = (s) => box.querySelector(s);
  return {
    inside: q('.mg-inside'), pcontent: q('.mg-panel__content'), pinner: q('.mg-panel__inner'), htext: q('.mg-hero__text'),
    ganEl: q('.mg-gan'), ganImg: q('.mg-gan__img'), ganGlow: q('.mg-gan__glow'),
  };
}

/** The opening words inside: they shrink a little only when they must. */
export function fitCard({ pinner, pcontent, htext }) {
  pinner.style.setProperty('--fit', '1');
  const cs = getComputedStyle(pcontent);
  const availH = pcontent.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  let k = 1;
  for (let n = 0; n < 14; n++) {
    const tooTall = pinner.scrollHeight > availH + 1;
    const tooWide = [...pinner.querySelectorAll('.mg-n, .mg-title__ne')].some((el) => el.offsetWidth > htext.clientWidth + 1);
    if (!tooTall && !tooWide) break;
    k *= 0.94;
    pinner.style.setProperty('--fit', k.toFixed(3));
  }
}

/** The card's lines settle into place, a few at a time (headings and the photo, no body text). */
export function cardGroups(pinner) {
  const g = (sel) => [...pinner.querySelectorAll(sel)];
  return [g('.mg-symbol, .mg-invoke'), g('.mg-title'), g('.mg-hero__div, .mg-names'), g('.mg-bless')].filter((a) => a.length);
}

/** Inside: Shri Ganesh first, large and glowing (from `at`); after a moment he settles softly behind the words, then
 *  the card's lines settle into place, a few at a time; then the scroll cue. Returns when the words are in. */
export function cardIn(tl, at, { pinner, ganEl, ganImg, ganGlow }, { phone, cue }) {
  const groups = cardGroups(pinner);
  let t = at + 0.4;
  if (ganEl) {
    gsap.set([ganImg, ganGlow], { opacity: 0 });
    tl.fromTo(ganImg, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'power2.out' }, at)
      .fromTo(ganGlow, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 1.3, ease: 'power2.out' }, at)
      .to(ganImg, { opacity: WATERMARK, duration: 1.4, ease: 'power1.inOut' }, at + 2)
      .to(ganGlow, { opacity: 0.4, duration: 1.4, ease: 'power1.inOut' }, at + 2);
    t = at + 2.6;
  }
  gsap.set(groups.flat(), { opacity: 0 });
  gsap.set(pinner, { opacity: 1 });
  groups.forEach((g, i) => tl.fromTo(g, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * (phone ? 0.14 : 0.18)));
  if (cue) tl.fromTo(cue, { opacity: 0 }, { opacity: 1, duration: 0.5 }, t + 0.7);
  return t + groups.length * (phone ? 0.14 : 0.18);
}

/** Reduced motion: the card is simply there (Ganesh already soft behind the words). */
export function cardStill(tl, at, { pinner, ganEl, ganImg, ganGlow }, { cue }) {
  if (ganEl) { gsap.set(ganImg, { opacity: WATERMARK }); gsap.set(ganGlow, { opacity: 0.4 }); }
  tl.fromTo(pinner, { opacity: 0 }, { opacity: 1, duration: 0.45 }, at);
  if (cue) tl.fromTo(cue, { opacity: 0 }, { opacity: 1, duration: 0.4 }, at + 0.2);
  return at + 0.45;
}
