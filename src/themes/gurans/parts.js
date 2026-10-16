// Phoolbari's pieces (slug "gurans"), shared by its own page (main.js) and by its gate and hero modules (gate.js,
// hero.js), which can run on another theme's page (docs/MIX.md). The markup builders take `own`: the theme's own page
// keeps its ids; a module gets none (the ids belong to the page it is on).
import * as i18n from '../../core/i18n.js';
import { photos, photoUrl } from '../../photos.js';
import credits from '../../generated/credits.json';
import GATE from './gate.json';

const { bi, esc, dateOf } = i18n;
export const FLORA = '/themes/gurans/flora/';
export const has = (v) => !!(v && (typeof v === 'string' ? v.trim() : (v.en || v.ne || '').trim()));
// B.S. dates from the shared converter (contract §12); an event's own dateBS wins.
export const bsOf = (iso, override) => { try { return i18n.bsDateOf(iso, has(override) ? override : undefined); } catch { return has(override) ? override : null; } };

// ───────────────────────── Photos ─────────────────────────
const dims = Object.fromEntries(credits.map((k) => [String(k.file || k.slot).replace(/\.(jpe?g|png|webp)$/i, ''), [k.width, k.height]]));
export const isUrl = (s) => typeof s === 'string' && (s.startsWith('/') || s.startsWith('https://'));
export const keyOf = (ref) => (typeof ref === 'string' ? ref : ref && typeof ref === 'object' ? ref.lg || ref.sm || '' : '');
export const aspectOf = (ref) => {
  if (typeof ref === 'string' && dims[ref]?.[0]) return dims[ref][0] / dims[ref][1];
  if (ref && typeof ref === 'object' && ref.w && ref.h) return ref.w / ref.h;
  return 0;
};
const focalOf = (ref) => (typeof ref === 'string' && photos[ref]?.focal) || (ref && typeof ref === 'object' && ref.focal) || [0.5, 0.5];

const img = (ref, alt, sizes, { eager = false } = {}) => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  const [fx, fy] = focalOf(ref);
  return `<img src="${esc(sm)}" ${sm !== lg ? `srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w"` : ''} sizes="${sizes}" alt="${esc(alt || '')}"
    style="object-position:${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
};
/** Floral photo corners: four different arrangements (none mirrors another), each made for its own corner. */
const CORNERS = { tl: 'corner-a', br: 'corner-b', tr: 'corner-c', bl: 'corner-d' };
const cornerImg = (k) => `<img class="pb-fr__fl pb-fr__fl--${k}" src="${FLORA}${CORNERS[k]}-sm.webp" srcset="${FLORA}${CORNERS[k]}-sm.webp 1x, ${FLORA}${CORNERS[k]}.webp 2x" alt="" aria-hidden="true" loading="lazy" decoding="async" />`;
/**
 * A framed photograph that keeps the photo's own proportions (nothing cropped).
 * style: mat | floral | print | line | blush; fl: extra flower corners ('tl' | 'tr' | 'br' | 'bl').
 */
export const frame = (ref, alt, sizes, { style = 'mat', cap = '', cls = '', eager = false, fl = [] } = {}) => {
  if (!ref) return '';
  const ar = aspectOf(ref);
  const orient = ar ? (ar >= 1.05 ? 'land' : ar <= 0.95 ? 'port' : 'sq') : 'auto';
  const corners = style === 'floral' ? ['tl', 'br'] : fl;
  return `<figure class="pb-fr pb-fr--${style} ${corners.length ? 'pb-fr--fl' : ''} ${cls}" data-orient="${orient}" style="--ar:${ar ? ar.toFixed(4) : 0.75}">
    <span class="pb-fr__mat"><span class="pb-fr__img">${img(ref, alt, sizes, { eager })}</span>${corners.map(cornerImg).join('')}</span>
    ${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
};
/** Unknown aspect (uploads without w/h): measure once loaded. */
export function watchAspects(root = document) {
  root.querySelectorAll('.pb-fr[data-orient="auto"] .pb-fr__img img').forEach((im) => {
    const set = () => {
      const ar = im.naturalWidth / im.naturalHeight;
      if (!ar) return;
      const p = im.closest('.pb-fr');
      p.style.setProperty('--ar', ar.toFixed(4));
      p.dataset.orient = ar >= 1.05 ? 'land' : ar <= 0.95 ? 'port' : 'sq';
    };
    if (im.complete && im.naturalWidth) set(); else im.addEventListener('load', set, { once: true });
  });
}

export const flower = (name, cls, { eager = false } = {}) => `<img class="pb-orn ${cls}" src="${FLORA}${name}-sm.webp" srcset="${FLORA}${name}-sm.webp 1x, ${FLORA}${name}.webp 2x" alt="" aria-hidden="true" ${eager ? '' : 'loading="lazy"'} decoding="async" />`;
export const names = (c, cls = '') => `<span class="pb-names ${cls}">
  <span class="pb-names__one">${bi(c.bride.name)}</span>
  <span class="pb-names__amp" aria-hidden="true">${bi({ en: '&', ne: 'र' })}</span><span class="sr-only">and</span>
  <span class="pb-names__two">${bi(c.groom.name)}</span></span>`;

// ───────────────────────── The gate: the flower arch, its ladis and the welcome board ─────────────────────────
const pct = (o) => `left:${o.x}%;top:${o.y}%;width:${o.w}%;height:${o.h}%`;
/** One drawing of the arch ('wide' or 'tall'). Only the visible stage's images load (lazy + display:none). */
export const gateStage = (v, crest) => {
  const g = GATE[v];
  const p = g.plaque;
  const o = g.opening;
  const ar = g.W / g.H;
  const stageW = `min(100vw, calc((100vh - 12px) * ${ar.toFixed(4)}))`;
  const set = (name, wPct) => {
    const lg = Math.round((g.W * wPct) / 100 * g.sc);
    return `src="${FLORA}${name}-sm.webp" srcset="${FLORA}${name}-sm.webp ${Math.round(lg * 0.6)}w, ${FLORA}${name}.webp ${lg}w" sizes="calc(${stageW} * ${(wPct / 100).toFixed(4)})"`;
  };
  return `
  <div class="pb-gate__stage pb-gate__stage--${v}" style="--gar:${ar};--floor:${o.floor};--open:${(o.x1 - o.x0).toFixed(3)};--pw:${p.w}">
    <img class="pb-gate__curtain pb-gate__curtain--l" ${set(`curtain-l-${v}`, g.curtain_l.w)} alt="" loading="lazy" style="${pct(g.curtain_l)}" />
    <img class="pb-gate__curtain pb-gate__curtain--r" ${set(`curtain-r-${v}`, g.curtain_r.w)} alt="" loading="lazy" style="${pct(g.curtain_r)}" />
    <img class="pb-gate__arch" ${set(`gate-${v}`, 100)} alt="" loading="lazy" fetchpriority="high" />
    <div class="pb-gate__crest" style="left:${p.x}%;top:${p.y}%">
      <span class="pb-crest" lang="ne">${esc(crest.ne || crest.en)}</span>
    </div>
  </div>`;
};
/** p = { c, config, txt }. Own page: ids for main.js; a module: buttons for mix, the board marked [data-mx-ui]. */
export function gateHtml({ c, config, txt }, own = true) {
  const weddingBS = bsOf(config.weddingDate, config.weddingDateBS);
  // The welcome board is small: the B.S. date without the weekday (the AD line above already carries it).
  const boardBS = (bs) => (bs.short && !has(config.weddingDateBS) ? { en: `${bs.short.en} B.S.`, ne: `वि.सं. ${bs.short.ne}` } : bs);
  const crest = txt('gate.crest');
  return `
  <div class="pb-gate__bg" aria-hidden="true"></div>
  <div class="pb-gate__scene" aria-hidden="true">${gateStage('wide', crest)}${gateStage('tall', crest)}</div>
  <div class="pb-gate__board" role="group"${own ? ' aria-labelledby="gate-names"' : ' data-mx-ui'}>
    <p class="pb-board__welcome">${bi(txt('gate.welcome'))}</p>
    <${own ? 'h1' : 'p'} class="pb-board__names"${own ? ' id="gate-names"' : ''}>${names(c)}</${own ? 'h1' : 'p'}>
    <p class="pb-board__line">${bi(txt('gate.line'))}</p>
    <p class="pb-board__date">${bi(dateOf(config.weddingDate))}</p>
    ${weddingBS ? `<p class="pb-board__bs">${bi(boardBS(weddingBS))}</p>` : ''}
    <div class="pb-board__actions">
      <button class="pb-btn" type="button" ${own ? 'id="enter"' : 'data-mx-open'} disabled>${bi(txt('gate.open'))}</button>
      <button class="pb-quiet" type="button" ${own ? 'id="enter-quiet"' : 'data-mx-quiet'} disabled>${bi(txt('gate.quiet'))}</button>
    </div>
  </div>`;
}
/** The welcome board stands inside the arch opening; on short landscape screens it stands beside the arch. */
export function boardPlacer(gate) {
  const board = gate.querySelector('.pb-gate__board');
  const visibleStage = () => [...gate.querySelectorAll('.pb-gate__stage')].find((s) => s.offsetParent !== null) || gate;
  const place = () => {
    if (!board.isConnected) return;
    const side = window.innerWidth > window.innerHeight * 1.25 && window.innerHeight < 600;
    gate.classList.toggle('is-side', side);
    const home = side ? gate : visibleStage();
    if (board.parentNode !== home) home.append(board);
  };
  return { place, visibleStage };
}

// ───────────────────────── The welcome (first screen) ─────────────────────────
/** p = { c, config, txt, heroRef, heroAlt }. Own page: the section with its ids; a module: the inner block. */
export function heroHtml({ c, config, txt, heroRef, heroAlt }, own = true) {
  const weddingBS = bsOf(config.weddingDate, config.weddingDateBS);
  const rise = own ? 'pb-rise' : 'pb-in';
  const tag = own ? 'section' : 'div';
  return `
  <${tag} class="pb-hero pb-sec"${own ? ' id="top" aria-labelledby="hero-names"' : ''}>
    ${flower('swag', 'pb-orn--swag', { eager: true })}
    <div class="pb-hero__text">
      <p class="pb-kicker ${rise}">${bi(txt('hero.kicker'))}</p>
      <h2 class="pb-hero__names ${rise}"${own ? ' id="hero-names"' : ''}>${names(c)}</h2>
      <p class="pb-hero__line ${rise}">${bi(txt('hero.line'))}</p>
      <div class="pb-hero__date ${rise}">
        <p class="pb-hero__ad">${bi(dateOf(config.weddingDate))}</p>
        ${weddingBS ? `<p class="pb-hero__bs">${bi(weddingBS)}</p>` : ''}
        <p class="pb-hero__city">${bi(config.city)}</p>
      </div>
      ${own ? `<a class="pb-link ${rise}" href="#programme">${bi({ en: 'See the programme', ne: 'कार्यक्रम हेर्नुहोस्' })}<span aria-hidden="true"> ↓</span></a>` : ''}
    </div>
    <div class="pb-hero__photo ${rise}">${frame(heroRef, heroRef ? heroAlt : '', '(max-width: 760px) 86vw, 40vw', { style: 'floral', eager: true })}</div>
  </${tag}>`;
}
