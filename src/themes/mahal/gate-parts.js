// Mahal's gate (the golden painted palace gate, tied shut with a satin bow): its markup, its layout at the exact screen
// size and its opening motion. Shared by Mahal's own page (main.js, where the camera then walks onto the balcony) and
// its mix module (gate.js, where the gate opens onto another theme's page). Elements are passed in, never looked up
// by id, so the same code runs inside the mix wrapper on any page.
import { gsap } from 'gsap';
import { roundelRef } from '../../core/faith.js';
import { esc } from '../../core/i18n.js';
import { photoUrl } from '../../photos.js';
import { medalSVG } from './art.js';
import * as P from './palace.js';

export const DECOR = '/themes/mahal/decor/';
// The painted gate (decor/gate-frame, gate-leaf-l/-r and bow: Canva AI, the black keyed out and the two leaves cut
// along their arched tops): positions as fractions of the 1152 x 2048 painting.
export const GATE = { w: 1152, h: 2048, leaf: [0.2049, 0.1968, 0.5026, 0.9473, 0.8082], disc: [0.503, 0.11, 0.068], bowAr: 1.0871, knot: [0.498, 0.261] };

export const px = (v) => `${Math.round(v * 10) / 10}px`;
export const place = (el, x, y, w, h) => Object.assign(el.style, { left: px(x), top: px(y), width: px(w), height: px(h) });
export const rnd = (a, b) => a + Math.random() * (b - a);

// The medallion frames his head: a picture may say where the head's centre is (`face`, fractions) and how far to
// zoom (`zoom`, 1 = the picture just covers the circle; below 1 shows more of it, e.g. the whole head and crown).
function medalFit(ganeshRef) {
  const r = ganeshRef && typeof ganeshRef === 'object' ? ganeshRef : {};
  const z = Number(r.zoom) || 1;
  if (!Array.isArray(r.face) || !r.w || !r.h) return 'object-position:50% 4%';
  // contain in the square, then scale to `zoom` x cover and move the head's centre to the middle of the circle
  const ar = r.w / r.h;
  const s = z * Math.max(ar, 1 / ar);
  const fx = ar < 1 ? 0.5 + (r.face[0] - 0.5) * ar : r.face[0];
  const fy = ar < 1 ? r.face[1] : 0.5 + (r.face[1] - 0.5) / ar;
  const t = (p) => ((0.5 - 0.5 - s * (p - 0.5)) * 100).toFixed(2);
  return `object-fit:contain;transform:translate(${t(fx)}%, ${t(fy)}%) scale(${s.toFixed(3)})`;
}
/** Ganesh in the gold medallion of the crest (or ॐ when he is turned off). The ring's gold is #mhb-gold (art.js DEFS). */
// Another community (src/core/faith.js): the emblem, in deep red on a pale gold roundel that fills the painted disc,
// so the crest reads as one gilded medallion (Ganesh never shows).
const ROUNDEL = 'background:radial-gradient(circle at 50% 42%,#fff7df 0%,#f5dd9c 46%,#dcae55 82%,#b9852f 100%)';
export function crestHTML(ganeshRef) {
  const faith = Boolean(ganeshRef?.faith);
  if (faith) ganeshRef = roundelRef(ganeshRef);
  const medal = ganeshRef
    ? `<div class="mhb-medal ${faith ? 'mhb-medal--faith' : ''}" aria-hidden="true"><span class="mhb-medal__pic"${faith ? ` style="${ROUNDEL}"` : ''}><img style="${medalFit(ganeshRef)}" src="${esc(photoUrl(ganeshRef, 'sm'))}" srcset="${esc(photoUrl(ganeshRef, 'sm'))} 500w, ${esc(photoUrl(ganeshRef, 'lg'))} 1000w" sizes="240px" alt="" decoding="async" /></span>${medalSVG()}</div>`
    : '<div class="mh-om" lang="ne">ॐ</div>';
  return `<div class="mh-crest"><i class="mh-crest__halo"></i>${medal}</div>`;
}

/** The gate layer (no ids: it may run on another theme's page). `under` is painted beneath the gate, inside its layer. */
export function gateHTML(ganeshRef, { decor = DECOR, under = '' } = {}) {
  return `<div class="mh-gate" aria-hidden="true">
      <div class="mh-gatein">${under}
        <i class="mh-gatebg" aria-hidden="true"></i>
        <div class="mh-gbox">
          <div class="mh-leaves"><div class="mh-leaf mh-leaf--l"></div><div class="mh-leaf mh-leaf--r"></div></div>
          <i class="mh-seam"></i>
          <canvas class="mh-ribbon"></canvas>
          <div class="mh-frame"></div>
          ${crestHTML(ganeshRef)}
          <img class="mh-bowimg" src="${decor}bow-sm.webp" srcset="${decor}bow-sm.webp 480w, ${decor}bow.webp 900w" sizes="(max-width: 700px) 50vw, 300px" alt="" decoding="async" fetchpriority="high" />
          <i class="mh-hint"></i>
          <div class="mh-glints"></div>
        </div>
      </div>
    </div>`;
}

/** The gate's elements, by class, inside `box` (the hero on Mahal's page, the scene in the module). */
export function gateRefs(box) {
  const q = (s) => box.querySelector(s);
  return {
    gateLy: q('.mh-gate'), gateIn: q('.mh-gatein'), gbox: q('.mh-gbox'), leavesEl: q('.mh-leaves'),
    leafL: q('.mh-leaf--l'), leafR: q('.mh-leaf--r'), seam: q('.mh-seam'), ribbon: q('.mh-ribbon'), frameEl: q('.mh-frame'),
    crest: q('.mh-crest'), crestHalo: q('.mh-crest__halo'), bowImg: q('.mh-bowimg'), hint: q('.mh-hint'), glints: q('.mh-glints'),
  };
}

/** Where the painting sits at W x H (no DOM): phones are covered by it, wider screens get it full height, centred. */
export function gateBox(W, H) {
  const tall = W / H < 0.62;
  const s = tall ? Math.max(W / GATE.w, H / GATE.h) : H / GATE.h;
  const iw = GATE.w * s; const ih = GATE.h * s;
  const ox = (W - iw) / 2; const oy = tall ? (H - ih) * 0.2 : 0;
  const [lx0, ly0, , ly1, lx1] = GATE.leaf;
  return { W, H, full: tall, iw, ih, gx: ox, gy: oy, gw: iw, u: iw / 1000,
    door: { x0: ox + lx0 * iw, x1: ox + lx1 * iw, y0: oy + ly0 * ih, y1: oy + ly1 * ih } };
}

/**
 * Lay the painted gate out at W x H. r = gateRefs(...) plus { rib (createRibbon), ui (the line + buttons box), bowBtn,
 * bowOx, bowOy (where the bow button's parent sits relative to the gate layer; 0 when they share it) }.
 * `mask`: shade the swinging leaves with a dark wash cut to their shape (no filter on a moving piece; the module).
 * Returns G: the gate's box and its doorway, in screen pixels.
 */
export function buildGate(W, H, r, { reduced = false, decor = DECOR, mask = false } = {}) {
  const { gbox, frameEl, leavesEl, leafL, leafR, seam, crest, bowImg, hint, rib, ui, bowBtn } = r;
  const G = gateBox(W, H);
  const { full: tall, iw, ih, gx: ox, gy: oy } = G;
  const [lx0, ly0, lxc, ly1, lx1] = GATE.leaf;
  place(gbox, ox, oy, iw, ih);
  r.gateLy.classList.toggle('is-wide', !tall);
  const pic = (n, big, sm, w) => `src="${decor}${n}-sm.webp" srcset="${decor}${n}-sm.webp ${sm}w, ${decor}${n}.webp ${big}w" sizes="${Math.round(w)}px" alt="" decoding="async"`;
  frameEl.innerHTML = `<img class="mh-frame__img" style="width:${px(iw)};height:${px(ih)}" ${pic('gate-frame', 1152, 634, iw)} fetchpriority="high" />`;
  place(leavesEl, lx0 * iw, ly0 * ih, (lx1 - lx0) * iw, (ly1 - ly0) * ih);
  leavesEl.style.perspective = px(iw * 2.4);
  place(leafL, 0, 0, (lxc - lx0) * iw, (ly1 - ly0) * ih);
  place(leafR, (lxc - lx0) * iw, 0, (lx1 - lxc) * iw, (ly1 - ly0) * ih);
  const leaf = (side, big, sm, w) => `<img class="mh-leaf__img" ${pic(`gate-leaf-${side}`, big, sm, w)} />${mask
    ? `<i class="mh-leaf__dark mh-leaf__dark--mask" style="--m:url('${decor}gate-leaf-${side}-sm.webp')"></i>`
    : `<img class="mh-leaf__img mh-leaf__dark" ${pic(`gate-leaf-${side}`, big, sm, w)} />`}`;
  leafL.innerHTML = leaf('l', 343, 189, (lxc - lx0) * iw);
  leafR.innerHTML = leaf('r', 352, 194, (lx1 - lxc) * iw);
  place(seam, lxc * iw - 0.02 * iw, ly0 * ih, 0.04 * iw, (ly1 - ly0) * ih);
  const [dx, dy, dr] = GATE.disc; const md = 2 * dr * iw * 1.16;
  place(crest, dx * iw - md / 2, dy * ih - md / 2, md, md);
  // the bow sits below the door medallions and above the line and buttons; satin bands run to it from the pillars
  const uiTop = ui.getBoundingClientRect().top - oy;
  const bw = iw * 0.4; const bh = bw * GATE.bowAr;
  const kx = lxc * iw;
  const ky = Math.max(ih * 0.58, Math.min(ih * 0.69, uiTop - (1 - GATE.knot[1]) * bh - 8));
  place(bowImg, kx - GATE.knot[0] * bw, ky - GATE.knot[1] * bh, bw, bh);
  gsap.set(bowImg, { transformOrigin: `${GATE.knot[0] * 100}% ${GATE.knot[1] * 100}%`, x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 });
  const u = iw / 1000;
  rib.layout({ gw: iw, H: ih, u, K: [kx / u, ky / u], ax: 70, ay: (ky - ih * 0.09) / u, k: 0.75, bandsOnly: true });
  place(hint, kx - bw * 0.62, ky - bw * 0.62, bw * 1.24, bw * 1.24);
  place(bowBtn, ox + kx - bw * 0.7, oy + ky - bh * 0.35, bw * 1.4, bh * 1.1);
  // a few glints on the gold
  const gl = [[0.503, 0.075], [0.33, 0.585], [0.675, 0.585], [0.12, 0.42], [0.885, 0.42], [0.503, 0.24], [0.27, 0.86], [0.735, 0.86]];
  r.glints.innerHTML = reduced ? '' : gl.map(([x, y], i) => `<i class="mh-glint" style="left:${px(x * iw)};top:${px(y * ih)};--d:${(4 + i * 0.7).toFixed(1)}s;--dl:${(-i * 1.3).toFixed(1)}s"></i>`).join('');
  return G;
}

/** The smallest scale of the gate at which every corner of the screen lies inside its doorway. */
export function throughScale(G, vx, vy) {
  const { W, H } = G;
  const { x0, x1, y0, y1 } = G.door;
  const ok = (s) => [[0, 0], [W, 0], [0, H], [W, H]].every(([qx, qy]) => {
    const x = vx + (qx - vx) / s; const y = vy + (qy - vy) / s;
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  });
  let lo = 1; let hi = 10;
  for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; }
  return hi;
}
/** Where the camera aims (the doorway, a little above its middle) and how far it travels: the gate, at distance 1 - c
 *  from the camera at c, scales by 1 / (1 - c); at c = CAM the doorway just over-fills the screen. */
export function rigGate(G, { gateLy, gateIn }) {
  const VP = [G.W / 2, G.door.y0 + (G.door.y1 - G.door.y0) * 0.45];
  const CAM = 1 - 1 / Math.max(throughScale(G, ...VP) * 1.06, 1.35);
  const origin = `${px(VP[0])} ${px(VP[1])}`;
  gateLy.style.transformOrigin = origin;
  gateIn.style.transformOrigin = origin;
  return { VP, CAM, origin };
}
export const gateScale = (c) => `translate3d(0,0,0) scale(${(1 / (1 - c)).toFixed(4)})`;

/** A cubic-bezier easing (x1, y1, x2, y2), solved by bisection. */
export const bezier = (x1, y1, x2, y2) => {
  const bz = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    let lo = 0; let hi = 1; let t = x;
    for (let i = 0; i < 22; i++) { t = (lo + hi) / 2; if (bz(t, x1, x2) < x) lo = t; else hi = t; }
    return bz(t, y1, y2);
  };
};
// Heavy gold leaves: a moment to get going, then a glide and a soft settle.
export const easeDoor = bezier(0.55, 0.02, 0.18, 1);
// Walking in: a slow first step, a long glide, a soft stop.
export const easeWalk = bezier(0.45, 0, 0.22, 1);

/** The opening's beats (seconds). */
export function gateTiming(G) {
  const SWING_AT = 1.75;
  const SWING = G.full ? 2.1 : 2.4;
  const ZOOM_AT = SWING_AT + SWING * 0.55;
  const ZOOM = G.full ? 1.6 : 1.8;
  return { SWING_AT, SWING, ZOOM_AT, ZOOM, end: ZOOM_AT + ZOOM };
}

/**
 * The gate's own opening on `tl`, up to the moment the light pours through: `fade` (the line and buttons, the tap
 * hint) fades, the crest glows, the bow comes undone and the ribbon falls, the latch gives, the leaves swing open.
 */
export function gateUntie(tl, r, G, T, fade) {
  const { gateIn, leafL, leafR, seam, crestHalo, bowImg, leavesEl, rib } = r;
  const pull = { p: 0 };
  tl.to(fade, { autoAlpha: 0, duration: 0.4, ease: 'power2.out' }, 0)
    // Shri Ganesh first: the crest glows as the bell rings
    .fromTo(crestHalo, { opacity: 0.3, scale: 0.7 }, { opacity: 1, scale: 1.25, duration: 0.9, ease: 'power2.out' }, 0)
    .to(crestHalo, { opacity: 0.45, scale: 1.08, duration: 1.4, ease: 'sine.inOut' }, 0.9)
    // one tail is pulled and the loops slip through the knot; it gives, the bands swing down from the posts, then fall
    .to(pull, { p: 1, duration: 0.75, ease: 'power1.in', onUpdate: () => rib.pull(pull.p) }, 0.2)
    .to(bowImg, { scaleY: 0.93, scaleX: 1.05, y: -5, duration: 0.18, ease: 'power2.out' }, 0.2)
    .to(bowImg, { scaleY: 1, scaleX: 1, y: 0, duration: 0.25, ease: 'power2.inOut' }, 0.38)
    .to(bowImg, { keyframes: { rotation: [0, 6, -5, 4, -2, 0] }, duration: 0.42, ease: 'sine.inOut' }, 0.54)
    .add(() => rib.release(), 0.96)
    .to(bowImg, { y: G.H * 0.62, x: G.W * 0.05, rotation: 26, scale: 0.92, duration: 1.25, ease: 'power2.in' }, 0.96)
    .to(bowImg, { opacity: 0, duration: 0.45, ease: 'power1.in' }, 1.75)
    .add(() => rib.drop(), 2.3)
    // we lean in; the latch gives; light at the seam
    .to(gateIn, { scale: 1.03, duration: 1.1, ease: 'sine.inOut' }, 1.0)
    .to(leafL, { rotationY: 3, duration: 0.35, ease: 'power2.out' }, 1.4)
    .to(leafR, { rotationY: -3, duration: 0.35, ease: 'power2.out' }, 1.4)
    .fromTo(seam, { opacity: 0, scaleX: 0.25 }, { opacity: 1, scaleX: 1, duration: 0.4, ease: 'power1.out' }, 1.4)
    // the heavy swing
    .to(leafL, { rotationY: 104, duration: T.SWING, ease: easeDoor }, T.SWING_AT)
    .to(leafR, { rotationY: -104, duration: T.SWING, ease: easeDoor }, T.SWING_AT)
    .to(leavesEl.querySelectorAll('.mh-leaf__dark'), { opacity: 0.85, duration: T.SWING * 0.8, ease: 'power1.in' }, T.SWING_AT)
    .to(seam, { opacity: 0, scaleX: 4, duration: 0.9, ease: 'power1.in' }, T.SWING_AT + 0.1);
  return tl;
}

// ───────── petals ─────────
/** A light, continuous fall of blush, ivory and rose-pink petals (CSS transforms only). */
export function petalFall(phone) {
  const box = document.createElement('div');
  box.className = 'mhb-fall';
  box.setAttribute('aria-hidden', 'true');
  const n = phone ? 6 : 10;
  const kinds = ['blush', 'ivory', 'pink', 'blush', 'ivory'];
  const r = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < n; i++) {
    const size = Math.round((phone ? 13 : 17) * r(0.8, 1.25));
    const fall = r(phone ? 13 : 15, phone ? 19 : 23);
    const sway = r(3.2, 5.2);
    const p = document.createElement('i');
    p.className = 'mhb-fall__p';
    p.style.cssText = `left:${(((i + r(0.15, 0.85)) / n) * 100).toFixed(1)}%;--dur:${fall.toFixed(1)}s;--del:${(-r(0, fall)).toFixed(1)}s;--dx:${Math.round(r(-60, 60))}px;--sdur:${sway.toFixed(1)}s;--sdel:${(-r(0, sway)).toFixed(1)}s;--sw:${Math.round(r(10, 26))}px;--r0:${Math.round(r(-40, 40))}deg`;
    p.innerHTML = `<span>${P.petal(kinds[i % kinds.length], size)}</span>`;
    box.append(p);
  }
  return box;
}
/** On the gate the petals pass behind the line and the two buttons, never over their words. */
export function maskFall(box, over, ui) {
  if (!box) return;
  const h = over.getBoundingClientRect();
  const r = ui.getBoundingClientRect();
  if (!r.width) return;
  Object.entries({ '--mx': r.left - 8 - h.left, '--my': r.top - 8 - h.top, '--mw': r.width + 16, '--mh': r.height + 16 })
    .forEach(([k, v]) => box.style.setProperty(k, `${Math.round(v)}px`));
}
/** A shower of petals as the leaves swing open (a fixed layer over everything, gone after 8.5 s). */
export function dropPetals(G, { cls = 'mhb-petals', parent = document.body } = {}) {
  const box = document.createElement('div');
  box.className = cls;
  box.setAttribute('aria-hidden', 'true');
  const n = G.full ? 16 : 28;
  const kinds = ['blush', 'ivory', 'pink', 'blush', 'ivory'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.innerHTML = P.petal(kinds[i % 5], Math.round((G.full ? 13 : 17) * rnd(0.8, 1.35)));
    p.style.left = `${((i + rnd(0.1, 0.9)) / n) * 100}%`;
    p.style.top = `${-rnd(20, 90)}px`;
    box.append(p);
    gsap.fromTo(p, { y: 0, x: 0, rotation: rnd(0, 180), opacity: 0 }, {
      keyframes: { opacity: [0, 1, 1, 1, 0] },
      y: G.H * rnd(0.75, 1.15), x: rnd(-90, 90), rotation: `+=${Math.round(rnd(200, 480))}`,
      duration: rnd(4, 6), delay: rnd(0, 1.6), ease: 'sine.in',
    });
  }
  parent.append(box);
  setTimeout(() => box.remove(), 8500);
  return box;
}
