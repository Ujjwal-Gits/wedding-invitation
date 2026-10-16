// Kham's pieces, shared by its own page (main.js) and by its first-screen module (hero.js), which can run on another
// theme's page (docs/MIX.md): the folded card's markup and its fold, shaded as the top panel turns.
import { gsap } from 'gsap';
import { knotSVG } from './art.js';

/** The card: a lower panel (names, dates, line, city) and a top panel that folds over it (inside: invocation, knot,
 *  शुभ विवाह, hosts; outside: the foil knot and the names). `ids` keeps the own page's ids (#card, #names). */
export function cardHtml({ bi, esc, txt, config, names, mainAD, mainBS, ids = false }) {
  return `<div class="kh-card"${ids ? ' id="card"' : ''}>
        <div class="kh-card__shadow" aria-hidden="true"></div>
        <div class="kh-card__shadow kh-card__shadow--t" aria-hidden="true"></div>
        <div class="kh-card__b kh-face" data-deckle data-edges="rbl" data-seed="41">
          <div class="kh-card__body">
            <h1 class="kh-names"${ids ? ' id="names"' : ''}>${names()}</h1>
            <p class="kh-card__date">${bi({ en: mainAD.en, ne: mainBS.ne })}</p>
            <p class="kh-card__bs">${bi({ en: mainBS.en, ne: mainAD.ne })}</p>
            <span class="kh-rule" aria-hidden="true"></span>
            <p class="kh-card__line">${bi(txt('card.line'))}</p>
            <p class="kh-card__city">${bi(config.city)}</p>
          </div>
          <i class="kh-shade" aria-hidden="true"></i>
        </div>
        <div class="kh-card__t">
          <div class="kh-card__face kh-card__in kh-face" data-deckle data-edges="trl" data-seed="42">
            <div class="kh-card__body kh-card__body--top">
              <p class="kh-card__invoke" lang="ne">${esc(txt('card.invocation').ne)}</p>
              ${knotSVG({ cls: 'kh-card__knot', ink: 'var(--kh-sindoor)', gapColor: 'var(--kh-card)' })}
              <p class="kh-card__title" lang="ne">${esc(txt('card.title').ne)}</p>
              <p class="kh-card__title-en l-en">${esc(txt('card.title').en)}</p>
              <p class="kh-card__hosts">${bi(config.hosts)}</p>
            </div>
            <i class="kh-shade" aria-hidden="true"></i>
          </div>
          <div class="kh-card__face kh-card__cover kh-face" data-deckle data-edges="rbl" data-seed="43" aria-hidden="true">
            <div class="kh-card__body kh-card__body--cover">
              ${knotSVG({ cls: 'kh-card__foil', ink: 'var(--kh-sindoor)', gapColor: 'var(--kh-card)' })}
              <p class="kh-card__cover-names">${names()}</p>
            </div>
            <i class="kh-shade"></i>
          </div>
        </div>
      </div>`;
}

/** The card's fold: `set(a)` turns the top panel (−180 folded … 0 open) and shades both faces and the lower panel
 *  with a Lambert term from a light above and in front (the same light as the envelope's). */
export function cardFold(card) {
  const LIGHT_Z = 0.835;
  const T = card.querySelector('.kh-card__t');
  const tShadow = card.querySelector('.kh-card__shadow--t');
  const coverShade = card.querySelector('.kh-card__cover .kh-shade');
  const innerShade = card.querySelector('.kh-card__in .kh-shade');
  const bShade = card.querySelector('.kh-card__b .kh-shade');
  const r2 = (n) => Number(n.toFixed(2));
  const state = { a: -180 };
  const apply = () => {
    const a = state.a;
    gsap.set(T, { rotationX: a });
    const t = (-a * Math.PI) / 180;
    const inner = Math.max(0, Math.cos(t) * LIGHT_Z + Math.sin(t) * 0.55);
    const cover = Math.max(0, -Math.cos(t) * LIGHT_Z + Math.sin(t) * 0.55);
    if (innerShade) innerShade.style.opacity = r2(Math.max(0, Math.min(0.55, (LIGHT_Z - inner) * 0.8)));
    if (coverShade) coverShade.style.opacity = r2(Math.max(0, Math.min(0.55, (LIGHT_Z - cover) * 0.8)));
    if (bShade) bShade.style.opacity = r2(0.08 * Math.sin(t) * (a > -90 ? 1 : 0.3));
    if (tShadow) tShadow.style.opacity = r2(Math.max(0, Math.cos(t / 2)) ** 3);
  };
  return {
    state,
    apply,
    set(a) { state.a = a; apply(); },
    /** perspective for the card's width (as the envelope sets it) */
    perspective(w) { gsap.set(T, { transformOrigin: '50% 100%', transformPerspective: Math.max(1600, w * 3.2) }); },
  };
}

/** Shrink the names until the longest word fits the card and they take at most two lines. */
export function fitNames(h) {
  if (!h) return;
  h.style.fontSize = '';
  const max = parseFloat(getComputedStyle(h).fontSize);
  const ps = getComputedStyle(h.parentElement);
  const box = h.parentElement.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight);
  let size = max;
  const lineH = () => parseFloat(getComputedStyle(h).lineHeight) || size * 1.1;
  for (let k = 0; k < 24; k++) {
    const tooWide = [...h.querySelectorAll('.kh-n')].some((n) => n.offsetWidth > box + 1) || h.scrollWidth > box + 1;
    const tooTall = h.offsetHeight > lineH() * 2.2;
    if (!tooWide && !tooTall) break;
    size *= 0.94;
    h.style.fontSize = `${size}px`;
  }
}

const f1 = (n) => Number(n.toFixed(2));
const box = (n, r) => n && r && Object.assign(n.style, { left: `${f1(r.x)}px`, top: `${f1(r.y)}px`, width: `${f1(r.w)}px`, height: `${f1(r.h)}px` });
/** Place the open card (and the couple's print beside it on wide screens) at layout L, without the envelope. */
export function layCard(L, card, print, fold) {
  box(card, L.card);
  if (print) { print.hidden = !L.print; box(print, L.print); }
  fold?.perspective(L.card.w);
}

/** Without the envelope: the folded card waits unseen, the print tucked behind it. */
export function cardClosed({ card, print, fold, reduced }) {
  gsap.set(card, { zIndex: 5 });
  if (print) gsap.set(print, { zIndex: 4 });
  fold.set(reduced ? 0 : -180);
  gsap.set(card, { autoAlpha: 0, y: reduced ? 0 : 40 });
  if (print) gsap.set(print, { autoAlpha: 0 });
}
/** ...then from `at` the card rises into place and unfolds, and the print slides out from behind it. */
export function cardEnter(tl, at, { card, print, fold, reduced }) {
  const showPrint = print && !print.hidden;
  if (reduced) {
    tl.to(showPrint ? [card, print] : card, { autoAlpha: 1, duration: 0.5 }, at);
    if (showPrint) tl.set(print, { rotation: 3.2 }, at);
    return at + 0.5;
  }
  tl.to(card, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out' }, at)
    .to(fold.state, { a: 0, duration: 1.2, ease: 'power2.inOut', onUpdate: fold.apply }, at + 0.55)
    .set(card, { clearProps: 'transform,opacity,visibility' }, at + 1.8);
  if (showPrint) {
    const c = card.getBoundingClientRect(); const p = print.getBoundingClientRect();
    tl.fromTo(print, { x: c.left + c.width / 2 - (p.left + p.width / 2), y: c.height * 0.2, scale: 0.8, rotation: 0, autoAlpha: 0 },
      { x: 0, y: 0, scale: 1, rotation: 3.2, autoAlpha: 1, duration: 1.3, ease: 'power3.inOut' }, at + 0.7);
  }
  return at + 1.75;
}
