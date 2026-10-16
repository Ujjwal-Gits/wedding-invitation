// Mangal's doorway, shared by the theme's own page (main.js) and its gate as a mix module (gate.js, docs/MIX.md):
// the markup, the layout at the exact screen size, the bells, the petals and the opening (the latch gives, the
// heavy leaves swing with warm light pouring through, the camera walks in). Everything works on element refs, so
// the module's copy carries no element ids; `X` rewrites the SVG paint-server ids for the module (see gate.js).
import { gsap } from 'gsap';
import { esc } from '../../core/i18n.js';
import { roundelRef } from '../../core/faith.js';
import { photoUrl } from '../../photos.js';
import {
  frameSVG, panelBorderSVG, leafSVG, bellSVG, diyoSVG, dhakaTile, petalSVG, rosette, beamSVG, medalSVG,
} from './art.js';

export const DECOR = '/themes/mangal/decor/';
const same = (s) => s;

// Geometry of the art in public/themes/mangal/decor (written by tools/gate.py): height / width, the side margin
// beyond the end rosettes (fraction of width), the top of the heading band (fraction of height); the kalash's
// ground line (fraction of its height, where the flower bed meets the floor).
export const DRAPE = { lg: { ar: 0.1451, mx: 0.0536, band: 0.0154 }, sm: { ar: 0.178, mx: 0.0763, band: 0.0212 } };
export const KALASH = { ar: 1.1085, ground: 0.9525 };

/** The paper's damask and the Dhaka band, as custom properties (on <html> for the page, on the module's wrapper). */
export function paperVars() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84" viewBox="0 0 84 84">${rosette(21, 21, 9, { petals: 8, fill: '#000', stroke: '#000', inner: '#000' })}${rosette(63, 63, 9, { petals: 8, fill: '#000', stroke: '#000', inner: '#000' })}<circle cx="63" cy="21" r="1.6" fill="#000"/><circle cx="21" cy="63" r="1.6" fill="#000"/></svg>`;
  const damask = `url("data:image/svg+xml,${encodeURIComponent(svg.replace('<svg ', '<svg opacity=".09" '))}")`;
  const DHAKA = dhakaTile(3);
  return { damask, vars: { '--mg-damask': damask, '--mg-dhaka': DHAKA.url, '--mg-dhaka-w': `${DHAKA.w}px`, '--mg-dhaka-h': `${DHAKA.h}px` } };
}

// The medallion frames Ganesh's head: a picture may say where the head's centre is (`face`, fractions) and how far
// to zoom (`zoom`, 1 = the picture just covers the circle; below 1 shows more of it, e.g. the whole head and crown).
export function medalFit(ganeshRef) {
  const r = ganeshRef && typeof ganeshRef === 'object' ? ganeshRef : {};
  const z = Number(r.zoom) || 1;
  if (!Array.isArray(r.face) || !r.w || !r.h) return 'object-position:50% 4%';
  // contain in the square, then scale to `zoom` x cover and move the head's centre to the middle of the circle
  const ar = r.w / r.h;
  const s = z * Math.max(ar, 1 / ar);
  const px = ar < 1 ? 0.5 + (r.face[0] - 0.5) * ar : r.face[0];
  const py = ar < 1 ? r.face[1] : 0.5 + (r.face[1] - 0.5) / ar;
  const t = (p) => ((0.5 - 0.5 - s * (p - 0.5)) * 100).toFixed(2);
  return `object-fit:contain;transform:translate(${t(px)}%, ${t(py)}%) scale(${s.toFixed(3)})`;
}
// Another community (src/core/faith.js; only when the planner forces this Hindu design): the emblem in deep red on
// a pale gold roundel, so the medallion never shows Ganesh and still reads as one gilded piece.
const ROUNDEL = 'background:radial-gradient(circle at 50% 42%,#fff7df 0%,#f5dd9c 46%,#dcae55 82%,#b9852f 100%)';
export const medalHTML = (ganeshRef, cls = '') => {
  if (!ganeshRef) return '';
  const faith = Boolean(ganeshRef.faith);
  const ref = faith ? roundelRef(ganeshRef) : ganeshRef;
  return `<div class="mg-medal ${cls}" aria-hidden="true"><span class="mg-medal__pic"${faith ? ` style="${ROUNDEL}"` : ''}><img style="${medalFit(ref)}" src="${esc(photoUrl(ref, 'sm'))}" srcset="${esc(photoUrl(ref, 'sm'))} 500w, ${esc(photoUrl(ref, 'lg'))} 1000w" sizes="240px" alt="" decoding="async" /></span>${medalSVG()}</div>`;
};
export const diyoHTML = (cls = '', w = 70) => `<div class="mg-diyo ${cls}" aria-hidden="true"><i class="mg-diyo__halo"></i>${diyoSVG(w, Math.round(w * 1.6))}</div>`;
export const namesHTML = (bi, c) => `<span class="mg-n">${bi(c.bride.name)}</span> <span class="mg-n"><span class="mg-amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span> ${bi(c.groom.name)}</span>`;

/** The plaque with the names, the brass latch and "open without music". `mx`: the mix module's copy (no ids;
 *  the mix finds its buttons by their data attributes). */
export function gateHTML({ bi, line, names, open, quiet, mx = false }) {
  const id = (v) => (mx ? '' : ` id="${v}"`);
  return `<div class="mg-gate"${id('gate')}${mx ? ' data-mx-ui' : ''}>
        <div class="mg-plaque">
          <p class="mg-plaque__line">${bi(line)}</p>
          <p class="mg-plaque__names">${names}</p>
        </div>
        <button class="mg-latch"${id('open')}${mx ? ' data-mx-open' : ''} type="button" disabled>
          <span class="mg-latch__disc" aria-hidden="true"><svg viewBox="0 0 80 80" width="80" height="80"><circle cx="40" cy="40" r="38" fill="url(#mg-brass)" stroke="#5A3A0A" stroke-width="1.2"/><circle cx="40" cy="40" r="31" fill="none" stroke="#FCEDB9" stroke-opacity=".7" stroke-width="1.2" stroke-dasharray="0 5.2" stroke-linecap="round"/>${rosette(40, 40, 22, { petals: 12 })}</svg></span>
          <span class="mg-latch__label">${bi(open)}</span>
        </button>
        <button class="mg-quiet"${id('quiet')}${mx ? ' data-mx-quiet' : ''} type="button" disabled>${bi(quiet)}</button>
      </div>`;
}

/** The doorway and everything around it (the layers the camera walks through). `ids`: the page's own copy keeps
 *  the element ids it has always had; the module's copy has none. */
export function doorwayHTML({ ids = false, medal = '', gate = '' }) {
  const id = (v) => (ids ? ` id="${v}"` : '');
  return `<div class="mg-door"${id('door')}>
      <div class="mg-panel"${id('panel')}>
        <div class="mg-panel__bg"></div>
        <div class="mg-light"${id('light')} aria-hidden="true"><i class="mg-light__gap"${id('gap')}></i></div>
        <div class="mg-panel__border"${id('pborder')}></div>
      </div>
      <div class="mg-leaves"${id('leaves')} aria-hidden="true">
        <div class="mg-leaf mg-leaf--l"${id('leafL')}><i class="mg-leaf__shade"></i></div>
        <div class="mg-leaf mg-leaf--r"${id('leafR')}><i class="mg-leaf__shade"></i></div>
      </div>
      <div class="mg-framewrap"${id('framewrap')} aria-hidden="true"></div>
      ${medal}
      <div class="mg-diyos"${id('diyos')} aria-hidden="true">${diyoHTML('mg-diyo--l')}${diyoHTML('mg-diyo--r')}</div>
      ${gate}
    </div>
    <div class="mg-spill"${id('spill')} aria-hidden="true"></div>
    <div class="mg-bells"${id('bells')} aria-hidden="true"></div>
    <div class="mg-garland"${id('garland')} aria-hidden="true"><img class="mg-drape"${id('drape')} src="${DECOR}drape-gate-md.webp?v=5" alt="" decoding="async" fetchpriority="high" /></div>
    <div class="mg-kalashes"${id('kalashes')} aria-hidden="true">${['l', 'r'].map((k) => `<div class="mg-gkalash mg-gkalash--${k}"><img src="${DECOR}kalash-gate-sm.webp?v=5" srcset="${DECOR}kalash-gate-sm.webp?v=5 280w, ${DECOR}kalash-gate.webp?v=5 560w" sizes="(max-width: 700px) 90px, 240px" alt="" decoding="async" /></div>`).join('')}${diyoHTML('mg-gdiyo mg-diyo--l')}${diyoHTML('mg-gdiyo mg-diyo--r')}</div>
    <div class="mg-beam"${id('beam')} aria-hidden="true"></div>
    <div class="mg-threshold"${id('threshold')} aria-hidden="true"></div>`;
}

/** The doorway's elements, found by class inside `box`. */
export function doorRefs(box) {
  const q = (s) => box.querySelector(s);
  return {
    door: q('.mg-door'), panel: q('.mg-panel'), light: q('.mg-light'), gap: q('.mg-light__gap'), pborder: q('.mg-panel__border'),
    leaves: q('.mg-leaves'), leafL: q('.mg-leaf--l'), leafR: q('.mg-leaf--r'), framewrap: q('.mg-framewrap'), diyos: q('.mg-diyos'),
    gate: q('.mg-gate'), spill: q('.mg-spill'), bells: q('.mg-bells'), garland: q('.mg-garland'), drape: q('.mg-drape'),
    kalashes: q('.mg-kalashes'), beam: q('.mg-beam'), threshold: q('.mg-threshold'),
  };
}

/** The whole gate (torana, doorway, pillars, step and the two kalash) is sized from the width AND the height of
 *  the screen, as large as fits, so the plaque and both buttons are always in view. */
export function computeLayout(W, H, ganesh) {
  const phone = W < 700;
  const beam = phone ? 12 : 22;
  const drop = phone ? 7 : 14;
  const thr = phone ? 28 : Math.round(Math.min(46, Math.max(30, H * 0.045)));
  const top = phone ? 56 : Math.round(beam + drop + Math.max(12, H * 0.02));
  let fh = H - thr - top;
  let fw; let kh;
  if (phone) {
    fw = W - 24;
    kh = Math.round(Math.min(fh * 0.115, 96));
  } else {
    // a wide door on wide screens, a squarer one on squarer screens; a kalash on each side of it
    const a = Math.min(1.55, Math.max(1.0, (W / H) * 0.72));
    fw = (fh * a) / 1.09;
    kh = fh * 0.25;
    // (and, on the floor between each kalash and its pillar, a brass diyo)
    const comp = fw * 1.09 + ((2 * kh) / KALASH.ar) * 0.8 + 2 * Math.min(72, kh * 0.3);
    const maxW = W - 2 * Math.max(16, W * 0.025);
    if (comp > maxW) { const k = maxW / comp; fw *= k; fh *= k; kh *= k; }
    fw = Math.round(fw); fh = Math.round(fh); kh = Math.round(kh);
  }
  const pw = phone ? 16 : Math.round(Math.min(64, Math.max(34, fw * 0.058)));
  const ext = phone ? 4 : Math.round(pw * 0.8);
  const DW = fw + 2 * ext;
  const lh = phone ? 22 : Math.round(Math.min(48, Math.max(28, fw * 0.042)));
  const sill = phone ? 8 : 14;
  const tw = Math.round(fw * (phone ? 0.52 : 0.34));
  const th = Math.round(Math.min(tw * 0.5, phone ? Infinity : fh * 0.2));
  const fy = H - thr - fh;
  const fx = Math.round((W - DW) / 2);
  const ox = ext + pw; const oy = th + lh; const ow = fw - 2 * pw; const oh = fh - oy - sill;
  const medal = Math.round(Math.min(th * 0.74, tw * 0.4));
  const medalY = Math.round(th * 0.58);
  const diyoW = phone ? 30 : Math.round(Math.min(72, Math.max(44, kh * 0.28)));
  const bellW = phone ? 22 : Math.round(Math.min(50, Math.max(28, ext * 0.95)));
  // the silk drape, hung under the lintel: its end rosettes sit on the pillar capitals
  const D = phone ? DRAPE.sm : DRAPE.lg;
  const span = phone ? ow - 8 : fw - pw;
  const tW = span / (1 - 2 * D.mx);
  const tH = tW * D.ar;
  const tX = fx + DW / 2 - tW / 2;
  const tY = fy + th + lh - tH * D.band - Math.round(lh * 0.3);
  const gTop = Math.round(tY + tH - (fy + oy) + (phone ? 8 : 12));
  const gBottom = phone ? Math.round(diyoW * 1.6 + 6) : 12;
  // the kalash stand on the floor at the foot of the pillars (in front of them on phones)
  const kw = Math.round(kh / KALASH.ar);
  const ground = H - thr;
  const kY = Math.round(ground - kh * KALASH.ground);
  // desktop: a diyo stands on the floor against each pillar's foot, facing the door; the kalash just outside it
  const dH = Math.round(diyoW * 1.6);
  const dXL = Math.round(fx + ext - diyoW * 1.04);
  const dXR = W - dXL - diyoW;
  const dY = Math.round(ground - dH * 0.985);
  const kL = phone ? Math.max(2, fx - 2) : Math.max(8, Math.round(dXL + diyoW * 0.22 - kw));
  const kR = W - kL - kw;
  const ctop = phone ? 62 : Math.round(Math.max(72, H * 0.09));
  const cbottom = thr + (phone ? 6 : 10);
  return { W, H, phone, beam, drop, thr, fw, pw, ext, lh, sill, tw, th, fx, fy, DW, fh, ox, oy, ow, oh, medal, medalY, diyoW, bellW, tX, tW, tY, tH, gTop, gBottom, kh, kw, kY, kL, kR, dH, dXL, dXR, dY, ctop, cbottom, ganesh: !!ganesh };
}

export function placeBells(bellsEl, L, X = same) {
  const list = [];
  const bw = L.bellW; const bh = Math.round(bw * 2.75);
  if (L.phone) {
    // phones: under the end rosettes of the drape, in front of the pillars
    const y = Math.round(L.tY + L.tH * 0.3);
    list.push({ x: L.fx + L.ext + L.pw / 2 - bw / 2, y });
    list.push({ x: L.fx + L.DW - L.ext - L.pw / 2 - bw / 2, y });
  } else {
    // from the ends of the lintel, outside the pillars
    const y = L.fy + L.th + L.lh - 2;
    list.push({ x: L.fx + L.ext / 2 - bw / 2, y });
    list.push({ x: L.fx + L.DW - L.ext / 2 - bw / 2, y });
  }
  bellsEl.innerHTML = X(list.map((b, i) => `<div class="mg-bell" style="left:${Math.round(b.x)}px;top:${Math.round(b.y)}px;width:${bw}px;height:${bh}px" data-i="${i}">${bellSVG(bw, bh, { links: 4 })}</div>`).join(''));
}

/** The plaque and the two buttons scale down together only when the doorway is short. */
export function fitGate(gate) {
  gate.style.setProperty('--gk', '1');
  const avail = gate.clientHeight;
  const kids = [...gate.children];
  const need = () => {
    const gap = parseFloat(getComputedStyle(gate).rowGap) || 0;
    return kids.reduce((n, el) => n + el.offsetHeight, 0) + gap * (kids.length - 1);
  };
  let k = 1;
  for (let i = 0; i < 14 && need() > avail && k > 0.6; i++) { k *= 0.95; gate.style.setProperty('--gk', k.toFixed(3)); }
}

/** Lays the doorway out for layout L. `vars`: where the doorway's custom properties go. */
export function layoutDoorway(R, L, vars, X = same) {
  Object.assign(R.door.style, { left: `${L.fx}px`, top: `${L.fy}px`, width: `${L.DW}px`, height: `${L.fh}px` });
  const box = { left: `${L.ox}px`, top: `${L.oy}px`, width: `${L.ow}px`, height: `${L.oh}px` };
  Object.assign(R.panel.style, box);
  Object.assign(R.leaves.style, box);
  if (R.gate) Object.assign(R.gate.style, { left: `${L.ox}px`, top: `${L.oy + L.gTop}px`, width: `${L.ow}px`, height: `${L.oh - L.gTop - L.gBottom}px` });
  Object.assign(R.diyos.style, { left: `${L.ox}px`, width: `${L.ow}px`, bottom: `${L.sill}px` });
  const dm = R.door.querySelector('.mg-medal--door');
  if (dm) Object.assign(dm.style, { width: `${L.medal}px`, left: `${Math.round(L.DW / 2 - L.medal / 2)}px`, top: `${Math.round(L.medalY - L.medal / 2)}px` });
  R.pborder.innerHTML = X(panelBorderSVG(L));
  R.framewrap.innerHTML = X(frameSVG(L));
  R.beam.innerHTML = X(beamSVG(L.W, L.beam, L.drop));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const drapeSrc = `${DECOR}${L.phone ? 'drape-gate-sm' : L.tW * dpr > 1250 ? 'drape-gate' : 'drape-gate-md'}.webp`;
  if (!R.drape.src.endsWith(drapeSrc)) R.drape.src = drapeSrc;
  Object.assign(R.drape.style, { left: `${Math.round(L.tX)}px`, top: `${Math.round(L.tY)}px`, width: `${Math.round(L.tW)}px`, height: `${Math.round(L.tH)}px` });
  const [kl, kr] = R.kalashes.children;
  Object.assign(kl.style, { left: `${L.kL}px`, top: `${L.kY}px`, width: `${L.kw}px`, height: `${L.kh}px` });
  Object.assign(kr.style, { left: `${L.kR}px`, top: `${L.kY}px`, width: `${L.kw}px`, height: `${L.kh}px` });
  Object.assign(R.spill.style, { left: `${L.fx + L.ox - L.ow * 0.1}px`, width: `${L.ow * 1.2}px`, bottom: `${L.thr}px`, height: `${Math.round(L.oh * 0.5)}px` });
  const lw = L.ow / 2;
  R.leafL.querySelector('svg')?.remove(); R.leafR.querySelector('svg')?.remove();
  R.leafL.insertAdjacentHTML('afterbegin', X(leafSVG('l', lw, L.oh)));
  R.leafR.insertAdjacentHTML('afterbegin', X(leafSVG('r', lw, L.oh)));
  vars.style.setProperty('--mg-diyo-w', `${L.diyoW}px`);
  // on phones the kalash stand in front of the pillars, so the lamps move in beside them
  vars.style.setProperty('--mg-diyo-in', `${L.phone ? Math.max(Math.round(L.diyoW * 0.7), L.kL + L.kw + 2 - (L.fx + L.ox)) : Math.round(L.diyoW * 0.7)}px`);
  R.door.querySelectorAll('.mg-diyos .mg-diyo').forEach((d) => { d.innerHTML = X(diyoSVG(L.diyoW, Math.round(L.diyoW * 1.6))); });
  // the diyos stand inside the doorway on phones, on the floor outside it beside the pillars elsewhere
  R.diyos.hidden = !L.phone;
  R.kalashes.querySelectorAll('.mg-gdiyo').forEach((d, i) => {
    d.hidden = L.phone;
    if (L.phone) return;
    Object.assign(d.style, { left: `${i ? L.dXR : L.dXL}px`, top: `${L.dY}px`, width: `${L.diyoW}px`, height: `${L.dH}px` });
    d.querySelector('svg')?.remove();
    d.insertAdjacentHTML('beforeend', X(diyoSVG(L.diyoW, L.dH)));
  });
  placeBells(R.bells, L, X);
  if (R.gate) fitGate(R.gate);
}

// ───────────────────────── A light fall of petals over the doorway ─────────────────────────
/** A few rose and marigold petals and the odd leaf drift down from the top, slowly, swaying (CSS transforms only). */
export function fallBox(phone, X = same) {
  const box = document.createElement('div');
  box.className = 'mg-fall';
  box.setAttribute('aria-hidden', 'true');
  const n = phone ? 5 : 9;
  const kinds = ['marigold', 'rose', 'marigold', 'pink', 'marigold', 'rose', 'leaf', 'marigold', 'rose'];
  const r = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < n; i++) {
    const kind = kinds[i % kinds.length];
    const size = Math.round((phone ? 14 : 19) * r(0.8, 1.25) * (kind === 'leaf' ? 1.15 : 1));
    const fall = r(phone ? 13 : 15, phone ? 19 : 23);
    const sway = r(3.2, 5.2);
    const p = document.createElement('i');
    p.className = 'mg-fall__p';
    // spread across the width in lanes, so they never bunch up
    p.style.cssText = `left:${(((i + r(0.15, 0.85)) / n) * 100).toFixed(1)}%;--dur:${fall.toFixed(1)}s;--del:${(-r(0, fall)).toFixed(1)}s;--dx:${Math.round(r(-60, 60))}px;--sdur:${sway.toFixed(1)}s;--sdel:${(-r(0, sway)).toFixed(1)}s;--sw:${Math.round(r(10, 26))}px;--r0:${Math.round(r(-40, 40))}deg`;
    p.innerHTML = X(`<span>${petalSVG(kind, size)}</span>`);
    box.append(p);
  }
  return box;
}
/** On the doorway the petals pass behind the plaque and the two buttons, never over their words. */
export function maskFall(fallEl, frame, gate) {
  if (!fallEl || !gate) return;
  const h = frame.getBoundingClientRect();
  const rs = [...gate.children].map((k) => k.getBoundingClientRect()).filter((r) => r.width);
  if (!rs.length) return;
  const l = Math.min(...rs.map((r) => r.left)) - 8; const t = Math.min(...rs.map((r) => r.top)) - 8;
  const r = Math.max(...rs.map((x) => x.right)) + 8; const b = Math.max(...rs.map((x) => x.bottom)) + 8;
  Object.entries({ '--mx': l - h.left, '--my': t - h.top, '--mw': r - l, '--mh': b - t })
    .forEach(([k, v]) => fallEl.style.setProperty(k, `${Math.round(v)}px`));
}

// ───────────────────────── Opening: the doors swing open ─────────────────────────
/** A cubic-bezier easing (x1, y1, x2, y2), solved by bisection. */
export const bezier = (x1, y1, x2, y2) => {
  const bz = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    let lo = 0; let hi = 1; let t = x;
    for (let i = 0; i < 22; i++) { t = (lo + hi) / 2; if (bz(t, x1, x2) < x) lo = t; else hi = t; }
    return bz(t, y1, y2);
  };
};
// Heavy leaves: they take a moment to get going, then glide and settle softly.
export const easeDoor = bezier(0.52, 0.02, 0.16, 1);
// Walking in: a slow first step, a long glide, a soft stop.
export const easeWalk = bezier(0.45, 0, 0.25, 1);

/** Rose and marigold petals shaken loose from the drape as the doors open (into `parent`, removed after 6 s). */
export function dropPetals(L, parent = document.body, X = same) {
  const box = document.createElement('div');
  box.className = 'mg-petals';
  box.setAttribute('aria-hidden', 'true');
  const n = L.phone ? 7 : 10;
  const kinds = ['marigold', 'rose', 'marigold', 'marigold'];
  for (let i = 0; i < n; i++) {
    const s = Math.round((L.phone ? 12 : 15) * (0.8 + Math.random() * 0.5));
    const p = document.createElement('i');
    p.innerHTML = X(petalSVG(kinds[i % 4], s));
    p.style.left = `${Math.round(L.tX + L.tW * (0.12 + Math.random() * 0.76))}px`;
    p.style.top = `${Math.round(L.tY + L.tH * (0.4 + Math.random() * 0.4))}px`;
    box.append(p);
    gsap.fromTo(p, { y: -6, x: 0, rotation: Math.random() * 180, opacity: 0 }, {
      keyframes: { opacity: [0, 1, 1, 0] },
      y: L.H * (0.35 + Math.random() * 0.3), x: (Math.random() - 0.5) * 90, rotation: `+=${160 + Math.random() * 200}`,
      duration: 3 + Math.random() * 1.2, delay: 0.3 + Math.random() * 1, ease: 'sine.in',
    });
  }
  parent.append(box);
  setTimeout(() => box.remove(), 6000);
  return box;
}

export function swayBells(bellsEl, strength = 1) {
  bellsEl.querySelectorAll('.mg-bell').forEach((b, i) => {
    const a = (i % 2 ? -1 : 1) * 8 * strength;
    gsap.fromTo(b, { rotation: 0 }, { keyframes: { rotation: [a, -a * 0.7, a * 0.45, -a * 0.25, a * 0.1, 0] }, duration: 2.8 + i * 0.15, ease: 'sine.inOut', delay: i * 0.08 });
  });
}

/** The smallest scale of the doorway at which every corner of the screen lies inside its opening. */
export function throughScale(L, vx, vy) {
  const { W, H, ow, oh } = L;
  const x0 = L.fx + L.ox; const y0 = L.fy + L.oy;
  const inside = (s) => [[0, 0], [W, 0], [0, H], [W, H]].every(([px, py]) => {
    const x = vx + (px - vx) / s - x0; const y = vy + (py - vy) / s - y0;
    return x >= 0 && x <= ow && y >= 0 && y <= oh;
  });
  let lo = 1; let hi = 8;
  if (inside(lo)) return lo;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (inside(m)) hi = m; else lo = m; }
  return hi;
}

// Walking in: a forward dolly through the gate. Each layer sits at its own distance from the camera (the toran
// nearest, then the beam and bells, the threshold, the doorway itself); moving the camera forward by c scales a
// layer at distance D by D / (D - c) about the vanishing point, so near things leave the frame first.
export const depthOf = (R) => [[R.garland, 2.7], [R.beam, 2.8], [R.bells, 2.9], [R.kalashes, 3.3], [R.spill, 3.4], [R.threshold, 3.5], [R.door, 4]];

export function dollyRig(L, depth) {
  const W = L.W; const H = L.H;
  const vx = W / 2;
  const vy = L.fy + L.oy + L.oh * 0.42;
  const doorEnd = Math.max(throughScale(L, vx, vy) * 1.05, 1.6);
  const C = 4 - 4 / doorEnd;
  const layers = depth.filter(([el]) => el && getComputedStyle(el).display !== 'none').map(([el, D]) => {
    const kids = el.children.length ? [...el.children] : [el];
    const rs = kids.map((k) => k.getBoundingClientRect()).filter((r) => r.width && r.height);
    const box = rs.length ? { l: Math.min(...rs.map((r) => r.left)), t: Math.min(...rs.map((r) => r.top)), r: Math.max(...rs.map((r) => r.right)), b: Math.max(...rs.map((r) => r.bottom)) } : null;
    el.style.transformOrigin = `${(vx - el.offsetLeft).toFixed(1)}px ${(vy - el.offsetTop).toFixed(1)}px`;
    return { el, D, box, gone: false };
  });
  const set = (p) => {
    const cc = C * p;
    for (const ly of layers) {
      if (ly.gone) continue;
      const s = ly.D / (ly.D - cc);
      if (ly.box) {
        const l = vx + (ly.box.l - vx) * s; const r = vx + (ly.box.r - vx) * s;
        const t = vy + (ly.box.t - vy) * s; const b = vy + (ly.box.b - vy) * s;
        if (r < 0 || l > W || b < 0 || t > H) { ly.gone = true; ly.el.style.visibility = 'hidden'; continue; }
      }
      ly.el.style.transform = `translate3d(0,0,0) scale(${s.toFixed(4)})`;
    }
  };
  return { set };
}

/** The doors open and the camera walks through, added to `tl` from 0: the bells sway, the latch gives, the heavy
 *  leaves swing with warm light pouring through the widening gap and spilling onto the step, petals fall from the
 *  drape, then the dolly. Returns the timings (the caller settles the light and continues from `end`). */
export function openDoors(tl, R, L, { depth, petals }) {
  const phone = L.phone;
  const SWING_AT = 0.55;
  const SWING = phone ? 2.1 : 2.4;
  const DOLLY_AT = SWING_AT + SWING * 0.6;
  const DOLLY = phone ? 2.5 : 2.9;
  const end = DOLLY_AT + DOLLY;
  const rig = { p: 0 };
  let cam = null;
  tl.add(() => swayBells(R.bells, 0.8), 0.1)
    // the latch gives: the leaves ease off the frame by a hair
    .to(R.leafL, { rotationY: 2.5, duration: 0.4, ease: 'power2.out' }, 0.2)
    .to(R.leafR, { rotationY: -2.5, duration: 0.4, ease: 'power2.out' }, 0.2)
    .fromTo(R.gap, { opacity: 0, scaleX: 0.03 }, { opacity: 0.85, scaleX: 0.08, duration: 0.4, ease: 'power1.out' }, 0.2)
    // then the heavy swing, with warm light pouring through the widening gap
    .to(R.leafL, { rotationY: 80, duration: SWING, ease: easeDoor }, SWING_AT)
    .to(R.leafR, { rotationY: -80, duration: SWING, ease: easeDoor }, SWING_AT)
    .to(R.leaves.querySelectorAll('.mg-leaf__shade'), { opacity: 0.5, duration: SWING, ease: 'power1.in' }, SWING_AT)
    .to(R.gap, { opacity: 1, scaleX: 1, duration: SWING * 0.8, ease: easeDoor }, SWING_AT)
    .fromTo(R.light, { opacity: 0 }, { opacity: 1, duration: SWING * 0.7, ease: 'power1.out' }, SWING_AT + 0.15)
    .fromTo(R.spill, { opacity: 0, scaleX: 0.25 }, { opacity: 1, scaleX: 1, duration: SWING * 0.75, ease: 'power2.out' }, SWING_AT + 0.25)
    .add(petals, SWING_AT)
    // the camera walks in through the open doors
    .add(() => { cam = dollyRig(L, depth); }, DOLLY_AT - 0.02)
    .to(rig, { p: 1, duration: DOLLY, ease: easeWalk, onUpdate: () => cam?.set(rig.p) }, DOLLY_AT);
  return { SWING_AT, SWING, DOLLY_AT, DOLLY, end };
}
