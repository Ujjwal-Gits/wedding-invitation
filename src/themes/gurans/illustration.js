// Gurans · botanical line drawings of Rhododendron arboreum (लालीगुराँस), drawn in code.
// A truss of bell flowers (some seen from the side, some face-on), a whorl of
// leathery leaves with midribs and veins, and a woody stem. Everything is plain
// SVG markup from a seeded random, so each sprig is stable between visits.
// No imports: also used by a Node script to render the README preview.

const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const f = (n) => (Math.round(n * 10) / 10).toString();

/** Smooth closed/open path through points (Catmull-Rom → cubic Bézier). */
function smooth(pts, closed = false, k = 1) {
  const n = pts.length;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** A bell flower seen from the side, base at 0,0, opening towards -y. */
function bell(r, s = 1) {
  const w = 1 + (r() - 0.5) * 0.12;
  const body = `M-3 0C-5 -9 -10 -17 -16 -25C-20 -29 -15 -34 -10 -31C-7 -37 0 -38 3 -33C7 -38 14 -36 13 -30C18 -31 21 -27 17 -24C11 -17 6 -9 3 0Z`;
  const lip = 'M-16 -25C-11 -21 -5 -20 -0.5 -23C4 -20 11 -21 17 -24';
  const veins = 'M-6 -21C-6 -14 -4 -8 -2 -3M5 -21C5 -14 3 -8 2 -3';
  const sx = 2 * r() - 1;
  const stamens = [[-7, -41], [1 + sx, -44], [8, -40]].map(([x, y]) => `M0 -22C${f(x * 0.3)} -30 ${f(x * 0.8)} ${f(y + 6)} ${f(x)} ${f(y)}`).join('');
  const anthers = [[-7, -41], [1 + sx, -44], [8, -40]].map(([x, y]) => `<ellipse cx="${f(x)}" cy="${f(y - 1)}" rx="1.3" ry="1.9" />`).join('');
  return `<g transform="scale(${f(s * w)} ${f(s)})">
    <path class="g-fl" d="${body}" /><path class="g-fl-l" d="${lip}${veins}" /></g>`;
}

/** A flower seen face-on: five round lobes, spotted throat, stamens. */
function face(r, s = 1) {
  const pts = [];
  const a0 = r() * 1.2;
  for (let i = 0; i < 40; i++) {
    const a = a0 + (i / 40) * Math.PI * 2;
    const lobe = Math.abs(Math.cos((a - a0) * 2.5));
    const rr = 15 * (0.74 + 0.28 * Math.pow(lobe, 0.6)) * (1 + (r() - 0.5) * 0.05);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.92]);
  }
  let creases = '';
  for (let i = 0; i < 5; i++) {
    const a = a0 + Math.PI / 5 + (i * 2 * Math.PI) / 5;
    creases += `M${f(Math.cos(a) * 3)} ${f(Math.sin(a) * 3)}L${f(Math.cos(a) * 10.5)} ${f(Math.sin(a) * 10)}`;
  }
  let spots = '';
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 1.6;
    const d = 4 + r() * 5;
    spots += `<circle cx="${f(Math.cos(a) * d)}" cy="${f(Math.sin(a) * d)}" r="${f(0.5 + r() * 0.5)}" />`;
  }
  let st = '';
  let an = '';
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2;
    const d = 6 + r() * 4;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d - 3;
    st += `M0 0Q${f(x * 0.4)} ${f(y * 0.2 - 3)} ${f(x)} ${f(y)}`;
    an += `<circle cx="${f(x)}" cy="${f(y)}" r=".8" />`;
  }
  return `<g transform="scale(${f(s)})"><path class="g-fl" d="${smooth(pts, true)}" /><path class="g-fl-l" d="${creases}" />
    <g class="g-sp">${spots}</g><path class="g-st" d="${st}" /><g class="g-an">${an}</g></g>`;
}

/** A leathery, pointed leaf along +x from 0,0 with midrib and veins. */
function leaf(r, len, wid) {
  const bend = (r() - 0.5) * 0.35;
  const up = [];
  const dn = [];
  const mid = [];
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = t * len;
    const c = Math.sin(t * Math.PI) * bend * len * 0.5; // midrib curve
    const w = wid * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.9)), 0.8) * (1 - 0.1 * t);
    mid.push([x, c]);
    up.push([x, c - w / 2]);
    dn.push([x, c + w / 2]);
  }
  const outline = smooth([...up, ...[...dn].reverse().slice(1)], false);
  const light = smooth([...up, ...[...mid].reverse().slice(1)], false);
  let veins = '';
  for (let i = 2; i < N - 2; i += 2) {
    const [x, c] = mid[i];
    const t = i / N;
    const w = wid * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.9)), 0.8) * (1 - 0.1 * t) * 0.42;
    veins += `M${f(x)} ${f(c)}Q${f(x + w * 0.5)} ${f(c - w * 0.6)} ${f(x + w * 1.1)} ${f(c - w * 0.95)}`;
    veins += `M${f(x)} ${f(c)}Q${f(x + w * 0.5)} ${f(c + w * 0.6)} ${f(x + w * 1.1)} ${f(c + w * 0.95)}`;
  }
  return `<path class="g-lf" d="${outline}Z" /><path class="g-lf-hi" d="${light}Z" /><path class="g-lf-l" d="${smooth(mid)}${veins}" />`;
}

/**
 * A full sprig: truss + leaf whorl + stem. Returns an <svg> string.
 * opts: seed, flowers (8–16), leaves (5–10), stem (length), title (for a11y; empty = decorative)
 */
export function sprig({ seed = 7, flowers = 12, leaves = 8, stem = 150, cls = '', title = '' } = {}) {
  const r = rng(seed);
  const parts = [];
  // Stem: two strokes that taper, with a short side twig.
  const sx = (r() - 0.5) * 24;
  const stemPath = smooth([[0, 30], [sx * 0.3, 30 + stem * 0.35], [sx, 30 + stem * 0.7], [sx * 1.4, 30 + stem]]);
  const twig = smooth([[sx * 0.95, 30 + stem * 0.68], [sx + 20, 30 + stem * 0.6], [sx + 34, 30 + stem * 0.48]]);
  parts.push(`<path class="g-stem" d="${stemPath}" /><path class="g-stem g-stem--thin" d="${twig}" />`);
  // Leaf whorl under the truss: mostly hanging down and out, some foreshortened.
  const lv = [];
  for (let i = 0; i < leaves; i++) {
    const t = leaves === 1 ? 0.5 : i / (leaves - 1);
    const deg = 8 + 164 * t + (r() - 0.5) * 16; // 0 = right, 90 = straight down, 180 = left
    const fore = 0.62 + 0.38 * Math.abs(Math.sin(deg * Math.PI / 180 + r()));
    lv.push({ deg, len: (84 + r() * 26) * fore, wid: 22 + r() * 6, z: Math.sin(deg * Math.PI / 180) + r() * 0.3 });
  }
  lv.sort((x, y) => x.z - y.z);
  for (const L of lv) {
    const off = rot([7, 0], L.deg * Math.PI / 180);
    parts.push(`<g transform="translate(${f(off[0])} ${f(26 + off[1])}) rotate(${f(L.deg)})">${leaf(r, L.len, L.wid)}</g>`);
  }
  // Small leaves near the twig tip.
  parts.push(`<g transform="translate(${f(sx + 34)} ${f(30 + stem * 0.48)}) rotate(-62)">${leaf(r, 34, 11)}</g>`);
  parts.push(`<g transform="translate(${f(sx + 34)} ${f(30 + stem * 0.48)}) rotate(-12)">${leaf(r, 28, 10)}</g>`);
  parts.push('<ellipse class="g-lf" cx="0" cy="22" rx="15" ry="9" />');
  // Truss: a dense dome of bells, back row first, a few seen face-on in front.
  const fl = [];
  for (let i = 0; i < flowers; i++) {
    const t = i / (flowers - 1);
    const row = i % 3; // 0 back, 1 middle, 2 front
    const a = (-84 + 168 * t + (r() - 0.5) * 14) * (Math.PI / 180);
    const R = [30, 22, 12][row] + r() * 6;
    const faceOn = row === 2 && Math.abs(a) < 1.2;
    fl.push({ a, R, row, faceOn, s: [1.12, 1.22, 1.3][row] + r() * 0.1 });
  }
  fl.sort((x, y) => x.row - y.row);
  for (const F of fl) {
    const [x, y] = rot([0, -F.R], F.a);
    const g = F.row === 0 ? 'g-back' : '';
    if (F.faceOn) parts.push(`<g class="${g}" transform="translate(${f(x * 0.8)} ${f(y * 0.8 + 12)}) rotate(${f((F.a * 90) / Math.PI)})">${face(r, F.s * 1.12)}</g>`);
    else parts.push(`<g class="${g}" transform="translate(${f(x * 0.5)} ${f(y * 0.5 + 14)}) rotate(${f((F.a * 180) / Math.PI * 1.05)})">${bell(r, F.s)}</g>`);
  }
  const vb = `-150 -96 300 ${f(130 + stem)}`;
  const a11y = title ? `role="img" aria-label="${title.replace(/"/g, '&quot;')}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="g-sprig ${cls}" viewBox="${vb}" ${a11y}>${parts.join('')}</svg>`;
}

/** One small face-on flower, for dividers and list markers. */
export function bloom({ seed = 3, cls = '' } = {}) {
  const r = rng(seed);
  return `<svg class="g-bloom ${cls}" viewBox="-19 -19 38 38" aria-hidden="true" focusable="false">${face(r, 1.1)}</svg>`;
}

/** Shared stroke/fill styles for the drawings (inline so the SVG also renders standalone). */
export const SPRIG_CSS = `
.g-sprig, .g-bloom { overflow: visible; }
.g-fl { fill: var(--g-petal, #B3192F); stroke: var(--g-petal-line, #6A0D1C); stroke-width: .8; stroke-linejoin: round; }
.g-fl-l { fill: none; stroke: var(--g-petal-line, #6A0D1C); stroke-width: .55; stroke-linecap: round; opacity: .7; }
.g-back .g-fl { fill: var(--g-petal-back, #8E1225); }
.g-sp { fill: var(--g-petal-line, #6A0D1C); }
.g-st { fill: none; stroke: var(--g-stamen, #F3E6E0); stroke-width: .5; stroke-linecap: round; }
.g-an { fill: var(--g-anther, #3A1A14); }
.g-lf-hi { fill: var(--g-leaf-hi, #5E7C63); stroke: none; }
.g-lf { fill: var(--g-leaf, #2F4D3A); stroke: var(--g-leaf-line, #1C3326); stroke-width: .8; stroke-linejoin: round; }
.g-lf-l { fill: none; stroke: var(--g-vein, #A9BFA8); stroke-width: .55; stroke-linecap: round; opacity: .85; }
.g-stem { fill: none; stroke: var(--g-stem, #4A3A2C); stroke-width: 3.4; stroke-linecap: round; }
.g-stem--thin { stroke-width: 1.8; }
`;
