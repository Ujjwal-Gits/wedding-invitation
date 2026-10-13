// Kham · hand-built vector art (no images): the endless knot (श्रीवत्स), the sindoor wax seal
// lit with real SVG lighting, blind-embossed botanical sprigs and pearls.
import { rng } from './paper.js';

const f1 = (n) => Number(n.toFixed(2));

// ───────────────────────── Endless knot ─────────────────────────
// A 4×4 interlaced lattice turned 45°, its strand ends joined by ears at the corners and small
// loops on the sides; strands alternate over and under at every crossing.
function knotGeometry(s = 10) {
  const p = [-1.5, -0.5, 0.5, 1.5].map((k) => k * s);
  const e = 2 * s;
  const paths = [];
  p.forEach((y) => paths.push(`M${-e} ${y}H${e}`));
  p.forEach((x) => paths.push(`M${x} ${-e}V${e}`));
  const k = 1.45 * s;
  // Corner ears: each joins the outermost horizontal strand to the outermost vertical one.
  paths.push(`M${e} ${p[0]}C${e + k} ${p[0]} ${p[3]} ${-e - k} ${p[3]} ${-e}`);
  paths.push(`M${-e} ${p[0]}C${-e - k} ${p[0]} ${p[0]} ${-e - k} ${p[0]} ${-e}`);
  paths.push(`M${e} ${p[3]}C${e + k} ${p[3]} ${p[3]} ${e + k} ${p[3]} ${e}`);
  paths.push(`M${-e} ${p[3]}C${-e - k} ${p[3]} ${p[0]} ${e + k} ${p[0]} ${e}`);
  // Side loops between the two inner strands.
  const r = 0.5 * s;
  paths.push(`M${e} ${p[1]}A${r} ${r} 0 0 1 ${e} ${p[2]}`);
  paths.push(`M${-e} ${p[1]}A${r} ${r} 0 0 0 ${-e} ${p[2]}`);
  paths.push(`M${p[1]} ${-e}A${r} ${r} 0 0 1 ${p[2]} ${-e}`);
  paths.push(`M${p[1]} ${e}A${r} ${r} 0 0 0 ${p[2]} ${e}`);
  // Over-crossings: a short stretch of whichever strand passes over.
  const overs = [];
  const h = 0.42 * s;
  p.forEach((y, i) => p.forEach((x, j) => {
    overs.push((i + j) % 2 === 0 ? `M${x - h} ${y}H${x + h}` : `M${x} ${y - h}V${y + h}`);
  }));
  return { d: paths.join(''), overs: overs.join(''), extent: 3.9 * s };
}

/**
 * The knot as SVG markup. ink = band colour; gap = the colour of the thin gaps that show the weave
 * (the paper behind, or a lower height in the seal's height map).
 */
export function knotGroup({ s = 10, band = 0.5, gap = 0.12, ink = 'currentColor', gapColor = '#fff' } = {}) {
  const { d, overs } = knotGeometry(s);
  const w = band * s;
  const g = gap * s;
  return `<g transform="rotate(45)" fill="none" stroke-linecap="butt" stroke-linejoin="round">
    <path d="${d}" stroke="${gapColor}" stroke-width="${f1(w + 2 * g)}"/>
    <path d="${d}" stroke="${ink}" stroke-width="${f1(w)}"/>
    <path d="${overs}" stroke="${gapColor}" stroke-width="${f1(w + 2 * g)}"/>
    <path d="${overs}" stroke="${ink}" stroke-width="${f1(w)}"/>
  </g>`;
}

/** A standalone printed knot (for the card, the closing, ornaments). */
export function knotSVG({ cls = '', ink = 'currentColor', gapColor = 'var(--kh-card, #FBF8F2)', label = '' } = {}) {
  const ext = 3.9 * 10 * Math.SQRT2 * 0.82;
  return `<svg class="${cls}" viewBox="${-ext} ${-ext} ${ext * 2} ${ext * 2}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"'}>${knotGroup({ s: 10, ink, gapColor })}</svg>`;
}

// ───────────────────────── Shared SVG filters / gradients ─────────────────────────
let uid = 0;
/** Blind emboss (raised) and deboss (pressed) filters, pearl gradient. Ids are suffixed so several SVGs can coexist. */
export function paperDefs(sfx, { blur = 1.3, scale = 2.4, hi = 1.7, sh = 0.62 } = {}) {
  const flat = Math.SQRT1_2;
  const emb = (id, az) => `
    <filter id="${id}-${sfx}" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${blur}" result="b"/>
      <feDiffuseLighting in="b" surfaceScale="${scale}" diffuseConstant="1" lighting-color="#fff" result="d"><feDistantLight azimuth="${az}" elevation="45"/></feDiffuseLighting>
      <feColorMatrix in="d" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 0.98  ${hi} 0 0 0 ${f1(-hi * flat)}" result="hi"/>
      <feColorMatrix in="d" type="matrix" values="0 0 0 0 0.31  0 0 0 0 0.22  0 0 0 0 0.14  ${-sh} 0 0 0 ${f1(sh * flat)}" result="sh"/>
      <feFlood flood-color="#fffdf8" flood-opacity="${id === 'emb' ? 0.22 : 0}" result="t"/>
      <feComposite in="t" in2="SourceAlpha" operator="in" result="face"/>
      <feMerge><feMergeNode in="face"/><feMergeNode in="sh"/><feMergeNode in="hi"/></feMerge>
    </filter>`;
  return `
    ${emb('emb', 225)}
    ${emb('deb', 45)}
    <radialGradient id="pearl-${sfx}" cx="50%" cy="50%" r="50%" fx="34%" fy="30%">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.28" stop-color="#FBF6EC"/>
      <stop offset="0.7" stop-color="#E7DCC8"/>
      <stop offset="1" stop-color="#BFAF94"/>
    </radialGradient>
    <filter id="psh-${sfx}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="0.9"/></filter>`;
}

/** A pearl: a soft contact shadow, the body, and a faint warm rim light. */
export function pearl(x, y, r, sfx) {
  return `<circle cx="${f1(x + r * 0.32)}" cy="${f1(y + r * 0.42)}" r="${f1(r * 0.95)}" fill="#5a4330" opacity="0.28" filter="url(#psh-${sfx})"/>
    <circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="url(#pearl-${sfx})"/>
    <circle cx="${f1(x - r * 0.3)}" cy="${f1(y - r * 0.34)}" r="${f1(r * 0.22)}" fill="#fff" opacity="0.85"/>`;
}

// ───────────────────────── Botanical sprig ─────────────────────────
/**
 * A sprig growing from (0,0) towards -y: a tapering stem, alternate leaves, a few five-petal blossoms.
 * Returns { shapes, pearls } — shapes are flat fills meant for the emboss filter; pearls sit on the blossoms.
 */
export function sprig({ len = 120, bend = 18, leaves = 9, leaf = 0.2, blossoms = 2, seed = 4, stem = 1.5 } = {}) {
  const r = rng(seed);
  const P = (t) => [2 * (1 - t) * t * bend, -len * t];
  const T = (t) => { const dx = 2 * (1 - 2 * t) * bend; const dy = -len; const m = Math.hypot(dx, dy); return [dx / m, dy / m]; };
  const out = [];
  // Stem as a tapered ribbon.
  const L = [];
  const R = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const [x, y] = P(t);
    const [tx, ty] = T(t);
    const w = stem * (1 - t * 0.75);
    L.push([x - ty * w, y + tx * w]);
    R.push([x + ty * w, y - tx * w]);
  }
  out.push(`<path d="M${L.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}L${R.reverse().map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z"/>`);
  const leafPath = (l, w) => `M0 0C${f1(l * 0.28)} ${f1(-w)} ${f1(l * 0.72)} ${f1(-w * 0.9)} ${f1(l)} 0C${f1(l * 0.72)} ${f1(w * 0.8)} ${f1(l * 0.28)} ${f1(w * 0.9)} 0 0Z`;
  const pearls = [];
  const blossomAt = new Set();
  for (let b = 0; b < blossoms; b++) blossomAt.add(Math.round(((b + 1) / (blossoms + 1)) * (leaves - 1)) + 1);
  for (let k = 0; k < leaves; k++) {
    const t = 0.12 + (k / leaves) * 0.84;
    const [x, y] = P(t);
    const [tx, ty] = T(t);
    const side = k % 2 ? 1 : -1;
    const base = Math.atan2(ty, tx) * (180 / Math.PI);
    const ang = base + side * (38 + r() * 18);
    const l = len * leaf * (1 - t * 0.45) * (0.85 + r() * 0.3);
    if (blossomAt.has(k)) {
      // A short twig with a blossom instead of a leaf.
      const a = (ang * Math.PI) / 180;
      const tl = l * 0.7;
      const bx = x + Math.cos(a) * tl;
      const by = y + Math.sin(a) * tl;
      out.push(`<path d="M${f1(x)} ${f1(y)}L${f1(bx)} ${f1(by)}" stroke="#000" stroke-width="${f1(stem * 0.7)}" fill="none"/>`);
      const pr = l * 0.3;
      for (let q = 0; q < 5; q++) {
        const pa = q * 72 + r() * 10;
        out.push(`<ellipse cx="0" cy="${f1(-pr * 0.62)}" rx="${f1(pr * 0.42)}" ry="${f1(pr * 0.62)}" transform="translate(${f1(bx)} ${f1(by)}) rotate(${f1(pa)})"/>`);
      }
      pearls.push([bx, by, pr * 0.34]);
      continue;
    }
    out.push(`<path d="${leafPath(l, l * 0.26)}" transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(ang)})"/>`);
  }
  // A bud at the tip.
  const [tx0, ty0] = P(1);
  out.push(`<ellipse cx="${f1(tx0)}" cy="${f1(ty0 - len * 0.025)}" rx="${f1(len * 0.018)}" ry="${f1(len * 0.032)}"/>`);
  pearls.push([tx0, ty0 - len * 0.07, len * 0.016]);
  return { shapes: out.join(''), pearls };
}

/**
 * Place sprigs: [{ x, y, rot, scale, flip, ...sprigOpts }] → { emboss: markup, pearls: markup }.
 * flip mirrors the sprig horizontally.
 */
export function sprigs(list, sfx, { pearlScale = 1 } = {}) {
  let emboss = '';
  let pearls = '';
  for (const s of list) {
    const { shapes, pearls: ps } = sprig(s);
    const tf = `translate(${f1(s.x)} ${f1(s.y)}) rotate(${f1(s.rot || 0)}) scale(${s.flip ? -1 : 1} 1) scale(${s.scale || 1})`;
    emboss += `<g transform="${tf}">${shapes}</g>`;
    pearls += `<g transform="${tf}">${ps.map(([x, y, pr]) => pearl(x, y, pr * pearlScale, sfx)).join('')}</g>`;
  }
  return { emboss: `<g filter="url(#emb-${sfx})" fill="#000">${emboss}</g>`, pearls };
}

// ───────────────────────── Wax seal ─────────────────────────
/**
 * The sindoor wax seal, stamped with the endless knot. Drawn as a height map and lit with
 * feDiffuseLighting + feSpecularLighting, so the rim, the pressed disc and the raised knot
 * catch the light like wax. part: 'full' | 'upper' | 'lower' (the two halves after it cracks,
 * split along the flap edges, which leave the tip at angle ±alpha from the horizontal).
 */
export function sealSVG({ part = 'full', alpha = 32, seed = 9, cls = '' } = {}) {
  const id = `s${++uid}`;
  const r = rng(seed);
  // Irregular wax outline: a circle pushed out in a few soft lobes where the wax spread.
  const lobes = Array.from({ length: 7 }, () => [r() * Math.PI * 2, 2 + r() * 5, 0.5 + r() * 0.6]);
  const pts = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    let rad = 86;
    for (const [la, amp, wid] of lobes) {
      const d = Math.atan2(Math.sin(a - la), Math.cos(a - la));
      rad += amp * Math.exp(-(d * d) / (wid * wid * 0.18));
    }
    rad += Math.sin(a * 9 + 1.3) * 0.9 + Math.sin(a * 17) * 0.5;
    pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
  }
  const blob = `M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z`;

  // Crack line: along the two flap edges through the centre, slightly jagged.
  const al = (alpha * Math.PI) / 180;
  const crack = [];
  const jit = rng(seed + 3);
  for (let i = 0; i <= 14; i++) {
    const t = 1 - i / 14;
    crack.push([-Math.cos(al) * 130 * t, -Math.sin(al) * 130 * t]);
  }
  for (let i = 1; i <= 14; i++) {
    const t = i / 14;
    crack.push([Math.cos(al) * 130 * t, -Math.sin(al) * 130 * t]);
  }
  const jag = crack.map(([x, y], i) => (i === 0 || i === crack.length - 1 ? [x, y] : [x + (jit() - 0.5) * 6, y + (jit() - 0.5) * 6]));
  const jagD = jag.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L');
  const upper = `M${jagD}L130 -140L-130 -140Z`;
  const lower = `M${jagD}L130 140L-130 140Z`;

  // Beaded ring inside the stamp.
  const beads = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    return `<circle cx="${f1(Math.cos(a) * 54)}" cy="${f1(Math.sin(a) * 54)}" r="1.9"/>`;
  }).join('');

  const height = `
    <g filter="url(#soft-${id})"><path d="${blob}" fill="#8f8f8f"/></g>
    <circle r="66" fill="none" stroke="#c4c4c4" stroke-width="9" filter="url(#rim-${id})"/>
    <circle r="61" fill="#6c6c6c"/>
    <g fill="#9a9a9a">${beads}</g>
    <g transform="scale(1.02)">${knotGroup({ s: 10, band: 0.52, gap: 0.13, ink: '#b8b8b8', gapColor: '#6c6c6c' })}</g>`;

  const clip = part === 'upper' ? upper : part === 'lower' ? lower : null;
  return `<svg class="${cls}" viewBox="-120 -120 240 240" aria-hidden="true" focusable="false">
  <defs>
    <filter id="soft-${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="rim-${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="cast-${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="wax-${id}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="hA"/>
      <feGaussianBlur in="hA" stdDeviation="0.9" result="h"/>
      <feDiffuseLighting in="h" surfaceScale="11" diffuseConstant="1.05" lighting-color="#ffffff" result="d"><feDistantLight azimuth="228" elevation="52"/></feDiffuseLighting>
      <feSpecularLighting in="h" surfaceScale="11" specularConstant="0.95" specularExponent="24" lighting-color="#ffe8dc" result="sp"><feDistantLight azimuth="228" elevation="60"/></feSpecularLighting>
      <feFlood flood-color="#A5161C" result="c"/>
      <feComposite in="c" in2="d" operator="arithmetic" k1="1.22" k2="0" k3="0" k4="0" result="lit"/>
      <feComposite in="sp" in2="lit" operator="arithmetic" k1="0" k2="0.42" k3="1" k4="0"/>
    </filter>
    <clipPath id="blob-${id}"><path d="${blob}"/></clipPath>
    ${clip ? `<clipPath id="part-${id}"><path d="${clip}"/></clipPath>` : ''}
  </defs>
  <g ${clip ? `clip-path="url(#part-${id})"` : ''}>
    <path d="${blob}" transform="translate(4 7)" fill="#2a0c08" opacity="0.42" filter="url(#cast-${id})"/>
    <g clip-path="url(#blob-${id})"><g filter="url(#wax-${id})">${height}</g></g>
  </g>
  ${part !== 'full' ? `<path d="M${jagD}" fill="none" stroke="#4a0a0c" stroke-width="1.4" opacity="0.55" clip-path="url(#blob-${id})"/>` : ''}
</svg>`;
}
