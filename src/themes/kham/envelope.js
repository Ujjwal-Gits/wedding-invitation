// Kham · the envelope. One signature motion: the guest taps the sindoor seal, it cracks along
// the flap, the camera pulls back from the paper, the flap lifts in 3D (its sindoor liner
// catching the light), the folded card slides out, the envelope drops away and the card unfolds
// in place, becoming the top of the page. CSS 3D (perspective + rotateX) driven by one GSAP
// timeline that can be seeked for screenshots (?debug).
import { gsap } from 'gsap';
import { sealSVG, paperDefs, sprigs } from './art.js';

const f1 = (n) => Number(n.toFixed(2));

/** Geometry for the current viewport. Everything is laid out at the pulled-back size. */
export function computeLayout(vw, vh, { printAr = 0 } = {}) {
  const portrait = vw < 700 || vw / vh < 0.9;
  let W;
  let H;
  let top;
  if (portrait) {
    const topPad = 64;
    const bottomPad = 96;
    W = Math.min(vw - 40, 460);
    H = Math.min(vh - topPad - bottomPad, W / 0.56);
    if (H < W / 0.8) W = Math.min(W, H * 0.72);
    top = topPad + (vh - topPad - bottomPad - H) / 2;
  } else {
    const topPad = 64;
    const bottomPad = 124;
    H = Math.min(vh - topPad - bottomPad, 880);
    W = Math.min(H * 0.7, vw - 48);
    top = topPad + (vh - topPad - bottomPad - H) / 2;
  }
  // The couple's print rests beside the card on wide screens.
  // It sits fully clear of the card (never tucked under it), so the photo is never cut.
  const gap = 34;
  const print = printAr && !portrait && vw >= 900 ? (() => {
    const ph = H * 0.62;
    const pw = Math.min(ph * printAr, W * 0.98, vw - 64 - W - gap);
    return pw > 120 ? { w: pw, h: pw / printAr } : null;
  })() : null;
  const shift = print ? print.w + gap : 0;
  const cx = vw / 2 - shift / 2;
  const card = { x: cx - W / 2, y: top, w: W, h: H };
  if (print) {
    print.x = card.x + W + gap;
    print.y = top + H * 0.5 - print.h / 2 + H * 0.05;
  }
  // Envelope: the folded card (W × H/2) fills 90% of its width (95% on phones, so it fits the screen).
  const Ew = W / (portrait ? 0.95 : 0.9);
  const Eh = H / 2 / 0.86;
  const fd = Eh * 0.56; // flap depth
  const envTop = Math.max(fd + 8, (vh - (Eh + fd)) / 2 + fd + 12);
  const ex = vw / 2; // the envelope opens centred; the card then moves to its place beside the print
  const env = { x: ex - Ew / 2, y: envTop, w: Ew, h: Eh, fd };
  // Camera at the gate: zoomed in until the envelope fills the screen, seal near the middle.
  const S = Math.max(vw / Ew, vh / Eh) * 1.04;
  const sx = ex;
  const sy = envTop + fd;
  const lo = vh - (Eh - fd) * S + 2;
  const hi = fd * S - 2;
  const ty = Math.min(hi, Math.max(lo, vh * (portrait ? 0.42 : 0.46)));
  const sealPx = Math.min(Ew * 0.22, Math.max(Ew * 0.12, 196 / S));
  const alpha = (Math.atan2(fd, Ew / 2) * 180) / Math.PI;
  return {
    portrait, vw, vh, card, print, env, S, seal: { x: sx, y: sy, size: sealPx, alpha },
    camera: { x: vw / 2 - sx, y: ty - sy, scale: S, origin: `${f1(sx)}px ${f1(sy)}px` },
    gateSealY: ty,
    // Where the folded card sits inside the envelope, relative to its final (unfolded) place.
    cardIn: { x: ex - cx, y: envTop + Eh * 0.1 - (top + H / 2) },
  };
}

/** Markup for the envelope layers, sized for layout L. tex = { env, liner } blob URLs. */
function envelopeMarkup(L, tex) {
  const { w: Ew, h: Eh, fd } = L.env;
  const T = f1(420 / L.S); // paper tile size: 420px on screen at the gate, finer as the camera pulls back
  const LT = f1(300 / L.S);
  const rr = Ew * 0.035;
  const len = Math.hypot(Ew / 2, fd);
  const ux = (Ew / 2) / len;
  const uy = fd / len;
  // Flap (pointing down), with a softly rounded tip.
  const tip = [Ew / 2, fd];
  const a = [tip[0] + ux * rr, tip[1] - uy * rr];
  const b = [tip[0] - ux * rr, tip[1] - uy * rr];
  const flapD = `M0 0H${f1(Ew)}L${f1(a[0])} ${f1(a[1])}Q${f1(tip[0])} ${f1(tip[1] + rr * 0.35)} ${f1(b[0])} ${f1(b[1])}Z`;
  const flapUpD = `M0 ${f1(fd)}H${f1(Ew)}L${f1(a[0])} ${f1(fd - a[1])}Q${f1(tip[0])} ${f1(-rr * 0.35)} ${f1(b[0])} ${f1(fd - b[1])}Z`;
  // Liner inset inside the open flap.
  const ins = Ew * 0.045;
  const linerUpD = `M${f1(ins * 1.6)} ${f1(fd - ins * 0.5)}H${f1(Ew - ins * 1.6)}L${f1(Ew / 2 + ins * 0.9)} ${f1(ins * 1.25)}Q${f1(Ew / 2)} ${f1(ins * 0.7)} ${f1(Ew / 2 - ins * 0.9)} ${f1(ins * 1.25)}Z`;
  // Pocket: two side flaps under one bottom flap.
  const apex = Eh * 0.43;
  const sideL = `M0 0C${f1(Ew * 0.16)} ${f1(Eh * 0.1)} ${f1(Ew * 0.36)} ${f1(Eh * 0.33)} ${f1(Ew * 0.46)} ${f1(Eh * 0.47)}Q${f1(Ew * 0.49)} ${f1(Eh * 0.52)} ${f1(Ew * 0.45)} ${f1(Eh * 0.56)}C${f1(Ew * 0.32)} ${f1(Eh * 0.72)} ${f1(Ew * 0.14)} ${f1(Eh * 0.88)} 0 ${f1(Eh)}Z`;
  const sideR = `M${f1(Ew)} 0C${f1(Ew * 0.84)} ${f1(Eh * 0.1)} ${f1(Ew * 0.64)} ${f1(Eh * 0.33)} ${f1(Ew * 0.54)} ${f1(Eh * 0.47)}Q${f1(Ew * 0.51)} ${f1(Eh * 0.52)} ${f1(Ew * 0.55)} ${f1(Eh * 0.56)}C${f1(Ew * 0.68)} ${f1(Eh * 0.72)} ${f1(Ew * 0.86)} ${f1(Eh * 0.88)} ${f1(Ew)} ${f1(Eh)}Z`;
  const brr = Ew * 0.05;
  const bottom = `M0 ${f1(Eh)}L${f1(Ew / 2 - brr)} ${f1(apex + brr * (apex / (Ew / 2)) * 0.9)}Q${f1(Ew / 2)} ${f1(apex - brr * 0.15)} ${f1(Ew / 2 + brr)} ${f1(apex + brr * (apex / (Ew / 2)) * 0.9)}L${f1(Ew)} ${f1(Eh)}Z`;
  // Score lines (debossed) just inside the flap edges.
  const sIn = Ew * 0.05;
  const scoreD = `M${f1(sIn * 1.8)} ${f1(sIn * 0.55)}L${f1(Ew / 2)} ${f1(fd - sIn * 1.15)}L${f1(Ew - sIn * 1.8)} ${f1(sIn * 0.55)}`;

  const sw = Ew / 560; // sprig scale relative to a 560px envelope
  const flapArt = sprigs([
    { x: Ew / 2 - Ew * 0.085, y: fd * 0.74, rot: -62, len: 92 * sw, bend: 14 * sw, leaves: 7, blossoms: 1, seed: 21, stem: 1.3 * sw, flip: false },
    { x: Ew / 2 + Ew * 0.085, y: fd * 0.74, rot: 62, len: 92 * sw, bend: 14 * sw, leaves: 7, blossoms: 1, seed: 21, stem: 1.3 * sw, flip: true },
    { x: Ew * 0.17, y: fd * 0.1, rot: 118, len: 120 * sw, bend: -16 * sw, leaves: 9, blossoms: 2, seed: 7, stem: 1.4 * sw },
    { x: Ew * 0.83, y: fd * 0.1, rot: -118, len: 120 * sw, bend: 16 * sw, leaves: 9, blossoms: 2, seed: 7, stem: 1.4 * sw, flip: true },
  ], 'fl');
  const pocketArt = sprigs([
    { x: Ew * 0.05, y: Eh * 0.97, rot: 58, len: 150 * sw, bend: -22 * sw, leaves: 11, blossoms: 2, seed: 3, stem: 1.6 * sw },
    { x: Ew * 0.95, y: Eh * 0.97, rot: -58, len: 150 * sw, bend: 22 * sw, leaves: 11, blossoms: 2, seed: 3, stem: 1.6 * sw, flip: true },
    { x: Ew * 0.035, y: Eh * 0.62, rot: 28, len: 84 * sw, bend: -10 * sw, leaves: 7, blossoms: 1, seed: 12, stem: 1.2 * sw },
    { x: Ew * 0.965, y: Eh * 0.62, rot: -28, len: 84 * sw, bend: 10 * sw, leaves: 7, blossoms: 1, seed: 12, stem: 1.2 * sw, flip: true },
  ], 'pk');
  const embossOpts = { blur: Math.max(0.6, 1.1 * sw), scale: 2.6 };

  const pat = (id, url, size) => `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}"><image href="${url}" width="${size}" height="${size}" preserveAspectRatio="none"/></pattern>`;
  const blur = (id, sd) => `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${f1(sd)}"/></filter>`;
  const svg = (cls, vb, inner, extra = '') => `<svg class="${cls}" viewBox="${vb}" preserveAspectRatio="none" aria-hidden="true" focusable="false" ${extra}>${inner}</svg>`;

  const back = svg('kh-env__svg', `0 0 ${f1(Ew)} ${f1(Eh)}`, `
    <defs>${pat('bp', tex.env, T)}${pat('bl', tex.liner, LT)}
      <linearGradient id="bshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1810" stop-opacity="0.32"/><stop offset="0.12" stop-color="#2a1810" stop-opacity="0.08"/><stop offset="0.7" stop-color="#2a1810" stop-opacity="0.18"/><stop offset="1" stop-color="#2a1810" stop-opacity="0.3"/></linearGradient>
    </defs>
    <rect width="${f1(Ew)}" height="${f1(Eh)}" fill="url(#bp)"/>
    <rect x="${f1(ins * 1.6)}" y="0" width="${f1(Ew - ins * 3.2)}" height="${f1(Eh * 0.62)}" fill="url(#bl)"/>
    <rect width="${f1(Ew)}" height="${f1(Eh)}" fill="url(#bshade)"/>`);

  const pocket = svg('kh-env__svg', `0 0 ${f1(Ew)} ${f1(Eh)}`, `
    <defs>${pat('pp', tex.env, T)}${paperDefs('pk', embossOpts)}${blur('pkb', 4 * sw)}${blur('pkb2', 2.2 * sw)}
      <linearGradient id="plight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.12"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#3a2614" stop-opacity="0.07"/></linearGradient>
    </defs>
    <path d="${sideL}" transform="translate(${f1(5 * sw)} 0)" fill="#3a2614" opacity="0.26" filter="url(#pkb)"/>
    <path d="${sideR}" transform="translate(${f1(-5 * sw)} 0)" fill="#3a2614" opacity="0.26" filter="url(#pkb)"/>
    <path d="${sideL}" fill="url(#pp)"/><path d="${sideR}" fill="url(#pp)"/>
    <path d="${sideL}" fill="#4a3220" opacity="0.045"/><path d="${sideR}" fill="#4a3220" opacity="0.045"/>
    <path d="${bottom}" transform="translate(0 ${f1(-4 * sw)})" fill="#3a2614" opacity="0.3" filter="url(#pkb)"/>
    <path d="${bottom}" fill="url(#pp)"/>
    <path d="${bottom}" fill="url(#plight)"/>
    <path d="${bottom}" fill="none" stroke="#fffaf0" stroke-opacity="0.75" stroke-width="${f1(1.1 * sw)}"/>
    <path d="${sideL}" fill="none" stroke="#fffaf0" stroke-opacity="0.55" stroke-width="${f1(0.9 * sw)}"/>
    <path d="${sideR}" fill="none" stroke="#fffaf0" stroke-opacity="0.55" stroke-width="${f1(0.9 * sw)}"/>
    ${pocketArt.emboss}${pocketArt.pearls}`, 'overflow="visible"');

  const flapFront = svg('kh-flap__svg', `0 0 ${f1(Ew)} ${f1(fd)}`, `
    <defs>${pat('fp', tex.env, T)}${paperDefs('fl', embossOpts)}${blur('flb', 5 * sw)}
      <linearGradient id="fhinge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2614" stop-opacity="0.12"/><stop offset="0.16" stop-color="#3a2614" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.06"/></linearGradient>
    </defs>
    <path class="kh-flap__cast" d="${flapD}" transform="translate(0 ${f1(5 * sw)})" fill="#3a2614" opacity="0.34" filter="url(#flb)"/>
    <path d="${flapD}" fill="url(#fp)"/>
    <path d="${flapD}" fill="url(#fhinge)"/>
    <path d="${scoreD}" fill="none" stroke="#000" stroke-width="${f1(1.3 * sw)}" filter="url(#deb-fl)"/>
    ${flapArt.emboss}${flapArt.pearls}
    <path d="${flapD}" fill="none" stroke="#fffaf0" stroke-opacity="0.8" stroke-width="${f1(1.1 * sw)}"/>
    <path class="kh-flap__shade" d="${flapD}" fill="#1e120a" opacity="0"/>`, 'overflow="visible"');

  const flapBack = svg('kh-flap__svg', `0 0 ${f1(Ew)} ${f1(fd)}`, `
    <defs>${pat('fbp', tex.env, T)}${pat('fbl', tex.liner, LT)}</defs>
    <path d="${flapUpD}" fill="url(#fbp)"/>
    <path d="${linerUpD}" fill="url(#fbl)"/>
    <path d="${flapUpD}" fill="none" stroke="#fffaf0" stroke-opacity="0.6" stroke-width="${f1(1 * sw)}"/>
    <path class="kh-flap__shade" d="${flapUpD}" fill="#1e120a" opacity="0.5"/>`);

  return { back, pocket, flapFront, flapBack };
}

/**
 * Build the envelope inside `scene` around the existing `card` (and optional `print`) elements.
 * Returns a controller: { layout(), timeline, open(), skip(), destroy() }.
 */
export function createEnvelope({ scene, card, print, gateText, sealButton, tex, getLayout, reduced, onOpenStart, onDone }) {
  let L = getLayout();
  const el = (cls, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; };
  const shadow = el('kh-env-shadow');
  const back = el('kh-env kh-env--back');
  const flapWrap = el('kh-flapwrap');
  const flap = el('kh-flap');
  const flapFront = el('kh-flap__face kh-flap__front');
  const flapBack = el('kh-flap__face kh-flap__back');
  const sealUp = el('kh-sealhalf kh-sealhalf--up');
  const pocket = el('kh-env kh-env--pocket');
  const sealLow = el('kh-sealhalf kh-sealhalf--low');
  flap.append(flapFront, flapBack, sealUp);
  flapWrap.append(flap);
  pocket.append(sealLow);
  const pocketSvgHost = el('kh-env__host');
  pocket.prepend(pocketSvgHost);
  scene.prepend(shadow, flapWrap, back);
  if (print) scene.append(print);
  scene.append(card, pocket, sealButton);
  // Paint order (back to front): table shadow, (open flap), back wall, print, card, pocket, (closed flap), seal.
  const Z = { shadow: 1, flapOpen: 2, back: 3, print: 4, card: 5, pocket: 6, flapClosed: 7, seal: 8 };
  gsap.set(shadow, { zIndex: Z.shadow });
  gsap.set(back, { zIndex: Z.back });
  if (print) gsap.set(print, { zIndex: Z.print });
  gsap.set(card, { zIndex: Z.card });
  gsap.set(pocket, { zIndex: Z.pocket });
  gsap.set(flapWrap, { zIndex: Z.flapClosed });
  gsap.set(sealButton, { zIndex: Z.seal });

  const T = card.querySelector('.kh-card__t');
  const cardShadow = card.querySelector('.kh-card__shadow');
  const tShadow = card.querySelector('.kh-card__shadow--t');
  const coverShade = card.querySelector('.kh-card__cover .kh-shade');
  const innerShade = card.querySelector('.kh-card__in .kh-shade');
  const bShade = card.querySelector('.kh-card__b .kh-shade');

  function paint() {
    const m = envelopeMarkup(L, tex);
    back.innerHTML = m.back;
    pocketSvgHost.innerHTML = m.pocket;
    flapFront.innerHTML = m.flapFront;
    flapBack.innerHTML = m.flapBack;
    const sealOpts = { alpha: L.seal.alpha };
    sealButton.querySelector('.kh-seal__art').innerHTML = sealSVG({ ...sealOpts, part: 'full' });
    sealUp.innerHTML = sealSVG({ ...sealOpts, part: 'upper' });
    sealLow.innerHTML = sealSVG({ ...sealOpts, part: 'lower' });
  }

  function place() {
    const { env, seal, card: c, print: p } = L;
    const box = (n, x, y, w, h) => Object.assign(n.style, { left: `${f1(x)}px`, top: `${f1(y)}px`, width: `${f1(w)}px`, height: `${f1(h)}px` });
    box(shadow, env.x, env.y, env.w, env.h);
    box(back, env.x, env.y, env.w, env.h);
    box(pocket, env.x, env.y, env.w, env.h);
    box(flapWrap, env.x, env.y, env.w, env.fd);
    box(card, c.x, c.y, c.w, c.h);
    if (print && p) box(print, p.x, p.y, p.w, p.h);
    if (print) print.hidden = !p;
    const s = seal.size;
    box(sealButton, seal.x - s / 2, seal.y - s / 2, s, s);
    box(sealUp, env.w / 2 - s / 2, env.fd - s / 2, s, s);
    box(sealLow, env.w / 2 - s / 2, env.fd - s / 2, s, s);
    gsap.set(flap, { transformOrigin: '50% 0%', transformPerspective: Math.max(1400, env.w * 2.6) });
    gsap.set(T, { transformOrigin: '50% 100%', transformPerspective: Math.max(1600, c.w * 3.2) });
    // Gate text sits on the bottom flap, below the seal, in screen space.
    const top = L.gateSealY + (s * L.S) / 2 + 18;
    Object.assign(gateText.style, { top: `${f1(top)}px` });
  }

  paint();
  place();

  // ── Shading: a Lambert term from a light above and in front of the table.
  const LIGHT = [0, -0.55, 0.835];
  const lambert = (deg, inner) => {
    const t = (deg * Math.PI) / 180;
    // Outer normal of the flap after rotating about its hinge: (0, -sin t, cos t); the liner faces the other way.
    const n = inner ? [0, Math.sin(t), -Math.cos(t)] : [0, -Math.sin(t), Math.cos(t)];
    return Math.max(0, n[1] * LIGHT[1] + n[2] * LIGHT[2]);
  };
  const flat = LIGHT[2];
  const shadeFor = (v) => Math.max(0, Math.min(0.62, (flat - v) * 0.75));
  const flapState = { a: 0 };
  const frontShade = () => flapFront.querySelector('.kh-flap__shade');
  const backShade = () => flapBack.querySelector('.kh-flap__shade');
  const cast = () => flapFront.querySelector('.kh-flap__cast');
  function applyFlap() {
    const a = flapState.a;
    gsap.set(flap, { rotationX: a });
    gsap.set(flapWrap, { zIndex: a > 90 ? Z.flapOpen : Z.flapClosed });
    const fs = frontShade();
    const bs = backShade();
    if (fs) fs.setAttribute('opacity', f1(shadeFor(lambert(a, false))));
    if (bs) bs.setAttribute('opacity', f1(shadeFor(lambert(a, true)) + (a < 100 ? 0.1 : 0)));
    const c = cast();
    if (c) c.setAttribute('opacity', f1(0.34 * Math.max(0, 1 - a / 35)));
  }
  const foldState = { a: -180 };
  function applyFold() {
    const a = foldState.a; // -180 folded … 0 open
    gsap.set(T, { rotationX: a });
    const t = (-a * Math.PI) / 180; // 0 open … π folded
    // Inner face normal (0, -sin t·…): open = facing the viewer; cover visible past 90°.
    const inner = Math.max(0, Math.cos(t) * LIGHT[2] + Math.sin(t) * 0.55);
    const cover = Math.max(0, -Math.cos(t) * LIGHT[2] + Math.sin(t) * 0.55);
    if (innerShade) innerShade.style.opacity = f1(Math.max(0, Math.min(0.55, (flat - inner) * 0.8)));
    if (coverShade) coverShade.style.opacity = f1(Math.max(0, Math.min(0.55, (flat - cover) * 0.8)));
    // The lifting panel shades the lower half near the fold.
    if (bShade) bShade.style.opacity = f1(0.08 * Math.sin(t) * (a > -90 ? 1 : 0.3));
    if (tShadow) tShadow.style.opacity = f1(Math.max(0, Math.cos(t / 2)) ** 3);
  }

  // ── The timeline (paused; played on tap, or seeked in debug).
  const tl = gsap.timeline({ paused: true, onComplete: () => finish() });
  function build() {
    tl.clear();
    const { camera, cardIn, env } = L;
    gsap.set(scene, { x: camera.x, y: camera.y, scale: camera.scale, transformOrigin: camera.origin });
    gsap.set(card, { y: cardIn.y, x: cardIn.x });
    gsap.set(sealUp, { autoAlpha: 0, x: 0, y: 0, rotation: 0, z: 1 });
    gsap.set(sealLow, { autoAlpha: 0 });
    gsap.set(sealButton, { autoAlpha: 1, scale: 1 });
    gsap.set([shadow], { autoAlpha: 0, y: 0 });
    gsap.set([back, pocket, flapWrap], { autoAlpha: 1, y: 0 });
    gsap.set(cardShadow, { opacity: 0 });
    gsap.set(gateText, { autoAlpha: 1, y: 0 });
    // The print travels hidden behind the folded card, then slides out to the right.
    let pOff = null;
    if (print && L.print) {
      const p = L.print;
      const c = L.card;
      pOff = { x: c.x + c.w / 2 - (p.x + p.w / 2), y: c.y + c.h * 0.75 - (p.y + p.h / 2), s: Math.min(1, (c.w * 0.86) / p.w, (c.h * 0.44) / p.h) };
      gsap.set(print, { x: pOff.x + cardIn.x, y: pOff.y + cardIn.y, rotation: 0, scale: pOff.s, autoAlpha: 0 });
    }
    flapState.a = 0; applyFlap();
    foldState.a = -180; applyFold();

    // 0 · Press and crack.
    tl.to(sealButton, { scale: 0.94, duration: 0.12, ease: 'power2.out' }, 0);
    tl.to(sealButton, { scale: 1, duration: 0.16, ease: 'back.out(3)' }, 0.12);
    tl.set(sealButton, { autoAlpha: 0 }, 0.26);
    tl.set([sealUp, sealLow], { autoAlpha: 1 }, 0.26);
    tl.fromTo(sealUp, { x: 0, y: 0, rotation: 0 }, { x: -1.5, y: -3, rotation: -3, duration: 0.25, ease: 'power3.out' }, 0.26);
    tl.to(gateText, { autoAlpha: 0, y: 12, duration: 0.4, ease: 'power2.in' }, 0.2);
    // 1 · Camera pulls back while the flap lifts.
    tl.to(scene, { x: 0, y: 0, scale: 1, duration: 1.7, ease: 'power3.inOut' }, 0.34);
    tl.to(shadow, { autoAlpha: 1, duration: 1.2, ease: 'power1.inOut' }, 0.6);
    tl.to(flapState, { a: 180, duration: 1.35, ease: 'power2.inOut', onUpdate: applyFlap }, 0.62);
    // 2 · The card is drawn out upward, clear of the pocket; the envelope dissolves into the page.
    const rise = env.h * 0.97;
    tl.to(card, { y: L.cardIn.y - rise, duration: 1.05, ease: 'power2.inOut' }, 1.85);
    if (pOff) tl.to(print, { y: pOff.y + L.cardIn.y - rise, duration: 1.05, ease: 'power2.inOut' }, 1.85);
    tl.to([back, pocket, flapWrap], { y: env.h * 0.1, autoAlpha: 0, duration: 0.85, ease: 'power1.inOut' }, 2.75);
    tl.to(shadow, { autoAlpha: 0, duration: 0.7, ease: 'power1.inOut' }, 2.75);
    tl.to(card, { x: 0, y: 0, duration: 0.95, ease: 'power3.inOut' }, 3.45);
    if (pOff) tl.to(print, { x: pOff.x, y: pOff.y, duration: 0.95, ease: 'power3.inOut' }, 3.45);
    tl.to(cardShadow, { opacity: 1, duration: 0.8, ease: 'power1.out' }, 3.0);
    // 3 · The card unfolds; the print slides out from behind it.
    tl.to(foldState, { a: 0, duration: 1.2, ease: 'power2.inOut', onUpdate: applyFold }, 4.05);
    if (pOff) {
      tl.set(print, { autoAlpha: 1 }, 3.3);
      tl.to(print, { x: 0, y: 0, scale: 1, rotation: 3.2, duration: 1.3, ease: 'power3.inOut' }, 4.15);
    }
    tl.add(() => onOpenStart?.('reveal'), 4.9);
  }

  let opened = false;
  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    // The card and print stay; the envelope leaves the page.
    gsap.set(scene, { clearProps: 'transform,willChange' });
    gsap.set(card, { clearProps: 'transform' });
    if (print) gsap.set(print, { x: 0, y: 0, scale: 1, rotation: 3.2, autoAlpha: L.print ? 1 : 0 });
    foldState.a = 0; applyFold();
    gsap.set(cardShadow, { opacity: 1 });
    [shadow, back, flapWrap, pocket, sealButton].forEach((n) => n.remove());
    gateText.remove();
    onDone?.();
  }

  build();

  return {
    get layout() { return L; },
    timeline: tl,
    open() {
      if (opened) return;
      opened = true;
      onOpenStart?.('start');
      if (reduced) {
        // Reduced motion: no camera move, no 3D. The envelope fades and the open card is there.
        tl.progress(1, true);
        finish();
        return;
      }
      gsap.set(scene, { willChange: 'transform' });
      tl.play(0);
    },
    /** Jump to the end (debug, or a guest who has opened it before). */
    skip() { opened = true; tl.progress(1, true); finish(); },
    /** Debug: jump to time t (seconds). */
    seek(t) { opened = true; gsap.set(scene, { willChange: 'transform' }); tl.pause(); tl.seek(t, false); },
    relayout() {
      if (finished || opened) return;
      L = getLayout();
      paint();
      place();
      build();
    },
    get finished() { return finished; },
  };
}
