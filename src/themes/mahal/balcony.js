// Mahal's first screen, the palace balcony at night: a Canva AI painting (Jal Mahal lit on its lake, a full moon) with
// the pool glistening, the moon breathing and the lanterns flickering, velvet curtains tied back, Ganesh in the moon,
// ॥ श्री गणेशाय नमः ॥, शुभ विवाह and the names in gold foil, fireworks over the palace. Shared by Mahal's own page
// (main.js, where the camera arrives through the gate) and its hero module (hero.js, the first screen of another
// theme's page). Elements are passed in, never looked up by id.
import { gsap } from 'gsap';
import { esc, bi } from '../../core/i18n.js';
import { photoUrl } from '../../photos.js';
import * as P from './palace.js';
import { DECOR, gateBox, px, place, rnd } from './gate-parts.js';

/** "-", "none" or "off" in a text slot turns that element off (religious marks are optional). */
const isOff = (v) => !v || /^\s*(-|–|none|off|no|hide)\s*$/i.test(v);
const on = (o) => !!o && (!isOff(o.en) || !isOff(o.ne));

// The painted balcony (decor/scene-*.webp, made with Canva AI): where things sit in it, as fractions of the picture.
export const SCENE = {
  p: {
    w: 1152, h: 2048, moon: [0.5026, 0.0951, 0.0505], dome: 0.225, floor: 0.75,
    pool: [[0.415, 0.452], [0.59, 0.452], [0.85, 0.62], [0.16, 0.62]],
    lamps: [[0.249, 0.497, 0.03], [0.754, 0.496, 0.025], [0.832, 0.518, 0.035], [0.053, 0.55, 0.044], [0.942, 0.553, 0.048], [0.217, 0.6, 0.056], [0.78, 0.601, 0.064], [0.094, 0.73, 0.054], [0.908, 0.728, 0.058], [0.188, 0.946, 0.11], [0.82, 0.944, 0.09]],
  },
  l: {
    w: 2048, h: 1152, moon: [0.5043, 0.102, 0.0176], dome: 0.17, floor: 0.86,
    pool: [[0.37, 0.49], [0.63, 0.49], [0.8, 0.69], [0.2, 0.69]],
    lamps: [[0.07, 0.58, 0.04], [0.158, 0.56, 0.035], [0.233, 0.53, 0.03], [0.842, 0.56, 0.035], [0.925, 0.58, 0.04], [0.767, 0.53, 0.03]],
  },
};
/** cover-fit the painting to the screen (kept near the top on tall screens so the moon is never cut) */
export function sceneMap(W, H) {
  const k = W / H < 0.8 ? 'p' : 'l'; const S = SCENE[k];
  const s = Math.max(W / S.w, H / S.h);
  const iw = S.w * s; const ih = S.h * s;
  const ox = (W - iw) / 2; const oy = (H - ih) * (k === 'p' ? 0.12 : 0.3);
  return { k, S, iw, ih, ox, oy, at: (fx, fy) => [ox + fx * iw, oy + fy * ih] };
}

/**
 * The balcony's markup: { scene, words }. o = { ganeshRef, symbol, invocation, title, c (the couple) }.
 * `ids`: Mahal's own page keeps the element ids it has always had; the module's copy has none.
 */
export function balconyHTML(o, { ids = false } = {}) {
  const id = (v) => (ids ? ` id="${v}"` : '');
  const { ganeshRef, symbol, invocation, title, c } = o;
  return {
    scene: `<div class="mh-scene"${id('scene')} aria-hidden="true">
      <div class="mh-ly mh-ly--back"${id('lyBack')}></div>
      <div class="mh-ly"${id('lyFloor')}></div>
      <div class="mh-ly"${id('lyRail')}></div>
      <canvas class="mh-fw"${id('fw')}></canvas>
      <div class="mh-ly mh-ly--curt"${id('lyCurt')}></div>
      <div class="mh-dust"${id('dust')}></div>
      <i class="mh-pour"${id('pour')}></i>
    </div>`,
    words: `<div class="mh-ganwrap"${id('ganwrap')}>
        ${ganeshRef ? `<div class="mh-gan"${id('gan')} aria-hidden="true"><i class="mh-gan__rays"${id('ganrays')}></i><i class="mh-gan__glow"${id('ganglow')}></i><img class="mh-gan__img"${id('ganimg')} src="${esc(photoUrl(ganeshRef, 'sm'))}" srcset="${esc(photoUrl(ganeshRef, 'sm'))} 500w, ${esc(photoUrl(ganeshRef, 'lg'))} 1000w" sizes="160px" alt="" decoding="async" /></div>`
          : on(symbol) ? `<p class="mh-symbol mh-in" lang="ne">${esc(symbol.ne || symbol.en)}</p>` : ''}
    </div>
    <div class="mh-words"${id('pcontent')}>
      <div class="mh-words__in"${id('pinner')}>
        ${on(invocation) ? `<p class="mh-invoke mh-in" lang="ne">${esc(invocation.ne || invocation.en)}</p>` : ''}
        <p class="mh-title mh-in"><span lang="ne">${esc(title.ne)}</span><span class="sr-only l-en"> (${esc(title.en)})</span></p>
        <h1 class="mh-names"${id('names')}>
          <span class="mh-name">${bi(c.bride.name)}</span>
          <span class="mh-weds mh-in"><i aria-hidden="true"></i>${bi({ en: 'weds', ne: 'तथा' })}<i aria-hidden="true"></i></span>
          <span class="mh-name">${bi(c.groom.name)}</span>
        </h1>
      </div>
    </div>`,
  };
}

/** The balcony's elements, by class, inside `box`. */
export function balconyRefs(box) {
  const q = (s) => box.querySelector(s);
  return {
    inside: q('.mh-scene'), lyBack: q('.mh-ly--back'), lyCurt: q('.mh-ly--curt'), fwCanvas: q('.mh-fw'), dustEl: q('.mh-dust'), pour: q('.mh-pour'),
    ganWrap: q('.mh-ganwrap'), ganEl: q('.mh-gan'), ganImg: q('.mh-gan__img'), ganGlow: q('.mh-gan__glow'), ganRays: q('.mh-gan__rays'),
    pcontent: q('.mh-words'), pinner: q('.mh-words__in'),
  };
}

/** Lay the balcony out at W x H; returns SG (palace.js geometry plus where the words go). */
export function buildScene(W, H, R, { reduced = false, fw = null } = {}) {
  const { lyBack, lyCurt, ganWrap, dustEl } = R;
  const SG = P.sceneGeo(W, H);
  const M = sceneMap(W, H);
  const src = M.k === 'p' ? 'scene-portrait' : 'scene-landscape';
  const scene = `<img class="mh-paint" style="left:${px(M.ox)};top:${px(M.oy)};width:${px(M.iw)};height:${px(M.ih)}" src="${DECOR}${src}-sm.webp" srcset="${DECOR}${src}-sm.webp ${M.k === 'p' ? 720 : 1280}w, ${DECOR}${src}.webp ${M.S.w}w" sizes="${Math.round(M.iw)}px" alt="" decoding="async" fetchpriority="high" />`;
  // the pool glistens: slow broken streaks of light drifting over the water
  const pool = M.S.pool.map(([x, y]) => M.at(x, y));
  const xs = pool.map((q) => q[0]); const ys = pool.map((q) => q[1]);
  const bx = Math.min(...xs); const by = Math.min(...ys);
  const water = `<div class="mh-water" style="left:${px(bx)};top:${px(by)};width:${px(Math.max(...xs) - bx)};height:${px(Math.max(...ys) - by)};clip-path:polygon(${pool.map(([x, y]) => `${px(x - bx)} ${px(y - by)}`).join(',')})"><i></i><i></i></div>`;
  const [mx, my] = M.at(M.S.moon[0], M.S.moon[1]);
  const moonGlow = `<i class="mh-moonglow" style="left:${px(mx)};top:${px(my)};--r:${px(Math.max(18, M.S.moon[2] * M.iw))}"></i>`;
  const lamps = M.S.lamps.map(([x, y, z]) => { const [lx, ly] = M.at(x, y); return `<i class="mh-lamp mh-lamp--glow" style="left:${px(lx)};top:${px(ly)};--s:${px(z * M.iw * 2.4)};--d:${rnd(2.4, 4).toFixed(2)}s;--dl:${(-rnd(0, 3)).toFixed(2)}s"></i>`; }).join('');
  lyBack.innerHTML = scene + water + moonGlow + lamps;
  // velvet curtains frame it, tied back above the painted floor
  if (SG.tall) SG.cw = W * 0.17;
  SG.bot = Math.min(H + 20, M.at(0, M.S.floor)[1] + H * 0.03);
  SG.ty = SG.bot * 0.74;
  const cur = P.curtainSVG(SG);
  const sw = cur.swag;
  const swag = (r) => `<img class="mh-swag${r ? ' mh-swag--r' : ''}" style="left:${px(r ? W - sw.x - sw.w : sw.x)};top:${px(sw.y)};width:${px(sw.w)}" src="${DECOR}swag-curtain-sm.webp" srcset="${DECOR}swag-curtain-sm.webp 340w, ${DECOR}swag-curtain.webp 640w" sizes="${Math.round(sw.w)}px" alt="" decoding="async" />`;
  lyCurt.innerHTML = cur.svg + swag(false) + swag(true);
  // Ganesh, with the painted moon as the halo behind his head; the words below him, down to the pool
  const gh = Math.min(H * 0.17, 160); const gw = gh * 0.62;
  const gTop = Math.max(6, my - gh * 0.3);
  place(ganWrap, mx - gw / 2, gTop, gw, gh);
  SG.wordsTop = gTop + gh + 2;
  SG.wordsBottom = H - (M.at(0, M.k === 'p' ? M.S.pool[0][1] : 0.6)[1] + H * 0.02);
  const domeY = M.at(0, M.S.dome)[1];
  if (fw) fw.size(W, H, { x0: SG.cw * 1.05, x1: W - SG.cw * 1.05, y0: H * 0.04, y1: Math.max(H * 0.12, domeY - 10), base: M.at(0, M.S.pool[0][1])[1], avoid: [mx, gw] });
  dustEl.innerHTML = reduced ? '' : Array.from({ length: SG.tall ? 12 : 22 }, () => `<i style="left:${rnd(4, 96).toFixed(1)}%;top:${rnd(45, 95).toFixed(1)}%;--dx:${Math.round(rnd(-40, 40))}px;--d:${rnd(7, 12).toFixed(1)}s;--dl:${(-rnd(0, 12)).toFixed(1)}s"></i>`).join('');
  return SG;
}

/** The names write themselves in, a letter at a time (Latin) or a word at a time (Devanagari, never split). */
export function splitNames(pinner) {
  pinner.querySelectorAll('.mh-name .l-en, .mh-name .l-ne').forEach((el) => {
    const ne = el.classList.contains('l-ne');
    const parts = ne ? el.textContent.split(/(\s+)/) : [...el.textContent];
    el.textContent = '';
    el.setAttribute('aria-label', parts.join(''));
    for (const t of parts) {
      if (/^\s+$/.test(t)) { el.append(t); continue; }
      const s = document.createElement('span');
      s.className = 'mh-ch';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = t;
      el.append(s);
    }
  });
}

/** The opening words fit between the moon and the waterline; they shrink a little only when they must. */
export function fitWords({ pinner, pcontent }) {
  pinner.style.setProperty('--fit', '1');
  const avail = pcontent.clientHeight;
  let k = 1;
  for (let n = 0; n < 16; n++) {
    const tooTall = pinner.scrollHeight > avail + 1;
    const tooWide = [...pinner.querySelectorAll('.mh-name')].some((el) => el.scrollWidth > pcontent.clientWidth - 24);
    if (!tooTall && !tooWide) break;
    k *= 0.94;
    pinner.style.setProperty('--fit', k.toFixed(3));
  }
}

/** The words on the balcony, in order: Ganesh, the invocation and title, the names, a letter at a time; then the
 *  scroll cue (`cue`, a selector or element, optional). Returns when they are in. */
export function revealWords(tl, t, { pinner, ganEl, ganImg, ganGlow, ganRays }, { cue } = {}) {
  const g = (sel) => [...pinner.querySelectorAll(sel)];
  gsap.set(pinner, { opacity: 1 });
  gsap.set([...g('.mh-in'), ...g('.mh-ch')], { opacity: 0 });
  if (ganEl) {
    gsap.set([ganImg, ganGlow, ganRays], { opacity: 0 });
    tl.fromTo(ganGlow, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 1.4, ease: 'power2.out' }, t)
      .fromTo(ganRays, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.8, ease: 'power2.out' }, t + 0.1)
      .fromTo(ganImg, { opacity: 0, scale: 0.86, y: 12 }, { opacity: 1, scale: 1, y: 0, duration: 1.1, ease: 'power3.out' }, t + 0.15);
    t += 0.9;
  }
  const lines = g('.mh-symbol, .mh-invoke, .mh-title');
  if (lines.length) { tl.fromTo(lines, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.16 }, t); t += 0.5; }
  const [n1, n2] = g('.mh-name');
  const chars = (el) => [...el.querySelectorAll('.mh-ch')];
  tl.fromTo(chars(n1), { opacity: 0, y: 20, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out', stagger: 0.045 }, t)
    .fromTo(g('.mh-weds'), { opacity: 0, letterSpacing: '0.9em' }, { opacity: 1, letterSpacing: '0.5em', duration: 0.9, ease: 'power2.out' }, t + 0.55)
    .fromTo(chars(n2), { opacity: 0, y: 20, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out', stagger: 0.045 }, t + 0.8);
  if (cue) tl.fromTo(cue, { opacity: 0 }, { opacity: 1, duration: 0.6 }, t + 1.6);
  return t + 1.6;
}

/** How far each layer of the balcony is from the camera once it has arrived (the gate starts at distance 1). */
export const depthOf = (R) => [[R.lyBack, 4], [R.lyCurt, 1.6]];
/** The balcony at camera progress p (0: a touch close, before the gate has passed; 1: settled). Never leaves a gap. */
export function settle(depth, p) {
  for (const [el, D] of depth) el.style.transform = `translate3d(0,0,0) scale(${(1 + (1 - p) * (0.16 / D)).toFixed(4)})`;
}
/** Where the camera aims: the gate's doorway, a little above its middle (gate-parts.js geometry). */
export function aimOf(W, H) {
  const { door } = gateBox(W, H);
  return [W / 2, door.y0 + (door.y1 - door.y0) * 0.45];
}
