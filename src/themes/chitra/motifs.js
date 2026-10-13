// Chitra · Mithila motif library. Every function returns an SVG string in the
// scene's coordinate space. Drawn by hand in code: bold ink edges, flat
// vermilion / turmeric / indigo / leaf-green fills and kachni (line) fills.
import { INK, PAL } from './figures.js';

const f = (n) => Math.round(n * 10) / 10;
const S = (w = 2) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
export const P = (d, fill, w = 2, extra = '') => `<path d="${d}" fill="${fill}" ${S(w)} ${extra}/>`;
export const L = (d, c = INK, w = 1.2, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
export const C = (x, y, r, fill, w = 1.6, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" ${S(w)} ${extra}/>`;
export const G = (x, y, s, inner, extra = '') => `<g transform="translate(${f(x)},${f(y)})${s !== 1 ? ` scale(${s})` : ''}" ${extra}>${inner}</g>`;
const band = (d, color, w = 5) => `${L(d, INK, w + 2.6)}${L(d, color, w)}`;

/* ───────────── creatures ───────────── */

/** Mithila fish (machh): almond body, forked tail, scale rows, a ringed eye. Faces +x. */
export function fish(x, y, s = 1, rot = 0, body = PAL.verm, belly = PAL.turmeric) {
  const d = 'M40,0 C32,-17 8,-24 -16,-18 C-30,-14 -40,-7 -46,0 C-40,7 -30,14 -16,18 C8,24 32,17 40,0Z';
  let g = P('M-44,0 L-68,-20 C-62,-8 -62,8 -68,20Z', belly, 2) + P(d, body, 2.2);
  g += `<path d="${d}" fill="url(#ch-scales)" opacity=".9"/>`;
  g += P('M-8,-21 C-2,-34 12,-34 18,-20', belly, 1.8) + P('M-8,21 C-2,32 10,32 16,20', belly, 1.8);
  g += L('M18,-17 C10,-6 10,6 18,17', INK, 2) + L('M13,-15 C6,-5 6,5 13,15', INK, 1);
  g += C(28, -4, 5.2, PAL.ivory, 1.6) + C(29, -4, 2.2, INK, 0);
  g += L('M-44,0 L-62,-12 M-44,0 L-64,0 M-44,0 L-62,12', INK, 1);
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${rot}) scale(${s})">${g}</g>`;
}

/** Two fish circling each other — the Mithila emblem of a fruitful marriage. */
export function fishPair(x, y, s = 1, c1 = PAL.verm, c2 = PAL.indigo) {
  return G(x, y, s, fish(0, -34, 1, 180, c1, PAL.turmeric) + fish(0, 34, 1, 0, c2, PAL.turmeric) + lotusFlat(0, 0, 0.32));
}

/** Peacock facing +x with a long eyed tail sweeping behind. */
export function peacock(x, y, s = 1, flip = false, tone = PAL.indigo) {
  let g = '';
  // tail
  const tail = 'M-6,8 C-40,4 -90,10 -150,36 C-170,46 -176,62 -160,66 C-120,70 -60,52 -10,30Z';
  g += P(tail, PAL.leaf, 2.2) + `<path d="${tail}" fill="url(#ch-kachni)"/>`;
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const ex = -26 - t * 128, ey = 22 + t * 30 + Math.sin(t * 3) * 4;
    g += C(ex, ey, 6.4, PAL.turmeric, 1.4) + C(ex, ey, 3.3, tone, 1) + L(`M${f(ex + 7)},${f(ey - 4)} L${f(ex + 16)},${f(ey - 9)}`, INK, 1);
  }
  // body
  const body = 'M-12,16 C-22,2 -14,-22 4,-26 C10,-34 8,-52 12,-64 C14,-74 24,-78 30,-72 C34,-68 32,-60 26,-58 C20,-52 22,-38 24,-28 C34,-16 32,6 18,14 C8,20 -4,22 -12,16Z';
  g += P(body, tone, 2.2) + `<path d="M-6,8 C-10,-6 -2,-18 10,-20 C18,-10 18,4 8,10Z" fill="${PAL.turmeric}" opacity=".9"/>` + `<path d="${body}" fill="url(#ch-dots)"/>`;
  g += L('M-10,0 C-2,-10 8,-12 16,-8', INK, 1.1) + L('M-6,8 C2,0 12,-2 20,2', INK, 1.1);
  // wing
  g += P('M-8,2 C0,-14 18,-14 24,-2 C14,6 2,8 -8,2Z', PAL.verm, 1.6);
  // head, beak, eye, crest
  g += P('M30,-72 L40,-68 L30,-65Z', PAL.turmeric, 1.4) + C(25, -71, 2.6, PAL.ivory, 1) + C(25.5, -71, 1, INK, 0);
  g += L('M20,-76 L14,-92 M23,-77 L22,-94 M26,-76 L30,-92', INK, 1.2) + C(14, -93, 2.4, PAL.turmeric, 1) + C(22, -95, 2.4, PAL.turmeric, 1) + C(30, -93, 2.4, PAL.turmeric, 1);
  // legs
  g += L('M2,18 L-2,40 M-2,40 L-10,44 M-2,40 L6,44 M10,18 L12,40 M12,40 L4,44 M12,40 L20,44', INK, 1.8);
  return `<g transform="translate(${f(x)},${f(y)}) scale(${flip ? -s : s},${s})">${g}</g>`;
}

/** A parrot (suga) on a perch. */
export function parrot(x, y, s = 1, flip = false) {
  const body = 'M0,0 C-8,-10 -6,-26 6,-30 C16,-33 22,-24 18,-14 C16,-6 10,2 0,0Z';
  const g = P('M-2,-2 C-12,8 -22,22 -30,40 C-20,34 -10,20 -2,8Z', PAL.leaf, 1.6) + P(body, PAL.green, 2) + `<path d="${body}" fill="url(#ch-kachni)"/>` +
    P('M18,-24 C26,-24 28,-16 22,-12 C22,-16 20,-20 16,-20Z', PAL.verm, 1.4) + C(12, -24, 2.2, PAL.ivory, 1) + C(12.4, -24, 0.9, INK, 0) +
    L('M4,-12 C8,-6 10,-4 14,-6', INK, 1);
  return `<g transform="translate(${f(x)},${f(y)}) scale(${flip ? -s : s},${s})">${g}</g>`;
}

/* ───────────── plants & sky ───────────── */

/** Lotus seen from the side: five pointed petals and a seed-pod centre. */
export function lotus(x, y, s = 1, c = PAL.pink, c2 = PAL.verm) {
  let g = '';
  g += P('M0,0 C-30,-2 -56,-14 -64,-30 C-44,-30 -20,-22 0,-6Z', c2, 1.8) + P('M0,0 C30,-2 56,-14 64,-30 C44,-30 20,-22 0,-6Z', c2, 1.8);
  g += P('M0,-2 C-22,-12 -36,-36 -34,-58 C-18,-48 -6,-28 0,-8Z', c, 1.8) + P('M0,-2 C22,-12 36,-36 34,-58 C18,-48 6,-28 0,-8Z', c, 1.8);
  g += P('M0,0 C-14,-20 -14,-52 0,-76 C14,-52 14,-20 0,0Z', c, 2);
  g += L('M0,-10 L0,-64 M-6,-12 C-14,-28 -18,-40 -24,-50 M6,-12 C14,-28 18,-40 24,-50', INK, 0.9);
  g += P('M-18,2 C-12,10 12,10 18,2 C12,-2 -12,-2 -18,2Z', PAL.turmeric, 1.6);
  return G(x, y, s, g);
}

/** A flat, front-on lotus rosette (for medallions and corners). */
export function lotusFlat(x, y, s = 1, c = PAL.pink, c2 = PAL.turmeric) {
  let g = '';
  for (let i = 0; i < 8; i++) g += `<g transform="rotate(${i * 45})">${P('M0,-8 C-12,-22 -10,-42 0,-54 C10,-42 12,-22 0,-8Z', i % 2 ? c : PAL.verm, 1.8)}${L('M0,-14 L0,-46', INK, 0.8)}</g>`;
  g += C(0, 0, 12, c2, 1.8) + C(0, 0, 5, PAL.verm, 1.2);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g += C(Math.cos(a) * 8.5, Math.sin(a) * 8.5, 1.4, INK, 0); }
  return G(x, y, s, g);
}

/** The Mithila sun: ringed disc, alternating petal rays. */
export function sun(x, y, r = 60) {
  let g = '';
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360;
    g += `<g transform="rotate(${a})">${P(`M${-r * 0.17},${-r * 0.92} L0,${-r * 1.42} L${r * 0.17},${-r * 0.92}Z`, i % 2 ? PAL.verm : PAL.turmeric, 1.8)}</g>`;
  }
  g += C(0, 0, r, PAL.turmeric, 2.4) + C(0, 0, r * 0.74, PAL.verm, 1.8) + C(0, 0, r * 0.5, PAL.turmeric, 1.6);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g += C(Math.cos(a) * r * 0.87, Math.sin(a) * r * 0.87, 1.6, INK, 0); }
  g += `<circle r="${r * 0.5}" fill="url(#ch-kachni)"/>`;
  return G(x, y, 1, g);
}

export function moon(x, y, r = 46) {
  const g = P(`M${r * 0.2},${-r} A${r},${r} 0 1 0 ${r * 0.2},${r} A${r * 0.78},${r * 0.78} 0 1 1 ${r * 0.2},${-r}Z`, '#f4e3b0', 2.2) +
    `<path d="M${r * 0.2},${-r} A${r},${r} 0 1 0 ${r * 0.2},${r} A${r * 0.78},${r * 0.78} 0 1 1 ${r * 0.2},${-r}Z" fill="url(#ch-dots-ink)" opacity=".5"/>`;
  return G(x, y, 1, g);
}

/** Tree of life: curling branches, almond leaves in fans, optional birds. */
export function tree(x, y, s = 1, opts = {}) {
  const leafC = opts.leaf || PAL.leaf;
  const trunk = 'M-14,0 C-10,-60 -18,-120 -8,-170 C-2,-200 0,-220 0,-240 C4,-220 8,-200 12,-170 C20,-120 12,-60 16,0Z';
  let g = '';
  const branches = [
    ['M-6,-150 C-40,-170 -70,-200 -90,-240', -90, -240],
    ['M6,-140 C40,-160 74,-186 96,-226', 96, -226],
    ['M-4,-200 C-30,-226 -46,-262 -50,-300', -50, -300],
    ['M4,-206 C28,-236 44,-268 50,-304', 50, -304],
    ['M0,-236 C-2,-270 0,-310 0,-340', 0, -340],
    ['M-8,-100 C-40,-110 -70,-130 -100,-150', -100, -150],
    ['M8,-96 C40,-104 70,-124 100,-146', 100, -146],
  ];
  let leaves = '';
  for (const [d, ex, ey] of branches) {
    g += L(d, INK, 9.5) + L(d, PAL.brown, 6.6);
    const base = Math.atan2(ey + 120, ex) * 180 / Math.PI;
    for (let k = -2; k <= 2; k++) {
      const a = base + 90 + k * 30;
      leaves += `<g transform="translate(${ex},${ey}) rotate(${f(a)})">${P('M0,0 C-11,-12 -11,-34 0,-48 C11,-34 11,-12 0,0Z', k % 2 ? leafC : PAL.green, 1.6)}${L('M0,-4 L0,-42', INK, 0.8)}${L('M0,-14 L-5,-20 M0,-24 L5,-30 M0,-30 L-4,-36', INK, 0.6)}</g>`;
    }
  }
  g = P(trunk, PAL.brown, 2.2) + `<path d="${trunk}" fill="url(#ch-kachni)"/>` + g + leaves;
  if (opts.bird) g += parrot(-60, -232, 1) + parrot(70, -220, 1, true);
  if (opts.fruit) for (const [fx, fy] of [[-70, -200], [60, -170], [-24, -290], [30, -270], [-80, -130]]) g += C(fx, fy, 6, PAL.verm, 1.4);
  return G(x, y, s, g);
}

/** Banana plant for the mandap posts. */
export function banana(x, y, s = 1, flip = false) {
  let g = P('M-8,0 C-8,-80 -6,-160 -2,-220 L6,-220 C8,-160 10,-80 10,0Z', PAL.leaf, 2) + L('M-2,-10 L-1,-210 M4,-10 L4,-212', INK, 0.8);
  const leaves = [[-2, -210, -60, 1.1], [4, -214, 40, 1], [0, -170, -95, 0.95], [6, -160, 80, 0.9], [-2, -120, -110, 0.8]];
  for (const [lx, ly, a, ls] of leaves) {
    g += `<g transform="translate(${lx},${ly}) rotate(${a}) scale(${ls})">${P('M0,0 C14,-30 16,-90 4,-140 C-4,-150 -16,-120 -18,-80 C-20,-40 -10,-10 0,0Z', PAL.green, 2)}${L('M0,-4 C4,-50 4,-100 2,-138', INK, 1)}${L('M2,-30 L14,-40 M3,-60 L15,-72 M3,-90 L13,-102 M1,-30 L-14,-38 M1,-60 L-16,-70 M1,-90 L-14,-100', INK, 0.7)}</g>`;
  }
  return `<g transform="translate(${f(x)},${f(y)}) scale(${flip ? -s : s},${s})">${g}</g>`;
}

export function bamboo(x, y, h = 300, s = 1) {
  let g = '';
  for (const [dx, hh] of [[-10, h], [10, h * 0.86]]) {
    g += P(`M${dx - 5},0 L${dx - 4},${-hh} L${dx + 4},${-hh} L${dx + 5},0Z`, '#7c9a3a', 1.8);
    for (let yy = -40; yy > -hh; yy -= 46) g += L(`M${dx - 5},${yy} L${dx + 5},${yy}`, INK, 1.4);
    for (let yy = -80; yy > -hh; yy -= 92) g += `<g transform="translate(${dx},${yy}) rotate(${dx < 0 ? -50 : 50})">${P('M0,0 C8,-8 8,-26 0,-36 C-8,-26 -8,-8 0,0Z', PAL.leaf, 1.4)}</g>`;
  }
  return G(x, y, s, g);
}

export function grassTuft(x, y, s = 1) {
  return G(x, y, s, L('M0,0 C-2,-10 -6,-16 -10,-20 M2,0 C2,-12 2,-18 4,-24 M4,0 C6,-8 10,-14 14,-16', INK, 1.6));
}

/* ───────────── ritual objects ───────────── */

export function kalash(x, y, s = 1) {
  let g = '';
  for (let i = -2; i <= 2; i++) g += `<g transform="translate(0,-58) rotate(${i * 26})">${P('M0,0 C-8,-10 -8,-30 0,-42 C8,-30 8,-10 0,0Z', i % 2 ? PAL.leaf : PAL.green, 1.5)}${L('M0,-4 L0,-38', INK, 0.7)}</g>`;
  g += P('M-15,-60 C-16,-80 16,-80 15,-60Z', PAL.brown, 1.8) + `<path d="M-15,-60 C-16,-80 16,-80 15,-60Z" fill="url(#ch-kachni)"/>`;
  g += P('M-14,-56 L14,-56 L11,-46 C26,-40 32,-24 28,-12 C24,0 -24,0 -28,-12 C-32,-24 -26,-40 -11,-46Z', PAL.copper, 2);
  g += band('M-27,-22 C-10,-16 10,-16 27,-22', PAL.verm, 3) + L('M-24,-30 L-20,-26 M-10,-32 L-6,-28 M6,-32 L10,-28 M20,-30 L24,-26', INK, 1);
  g += L('M-8,-38 L8,-38 M0,-44 L0,-32', PAL.verm, 2);
  return G(x, y, s, g);
}

/** Clay diyo. The flame group carries class "flame" (+ "is-lit" to show). */
export function diyo(x, y, s = 1, lit = true, i = 0) {
  const g = `<g class="glow${lit ? ' is-lit' : ''}" data-i="${i}"><circle cx="0" cy="-22" r="26" fill="url(#ch-glow)"/></g>` +
    P('M-20,-6 C-14,6 14,6 22,-6 C26,-8 28,-10 30,-12 L18,-10 C8,-12 -8,-12 -20,-6Z', '#9a4b22', 1.8) + L('M-14,-4 C-4,0 8,0 18,-4', PAL.turmeric, 1.2) +
    `<g class="flame${lit ? ' is-lit' : ''}" data-i="${i}"><g class="flame__in">${P('M0,-10 C-7,-16 -6,-28 0,-38 C6,-28 7,-16 0,-10Z', PAL.turmeric, 1.4)}${P('M0,-12 C-3,-16 -3,-22 0,-27 C3,-22 3,-16 0,-12Z', PAL.verm, 0.8)}</g></g>`;
  return G(x, y, s, g);
}

/** Havan kunda: stepped brick fire altar seen from the front, with a living fire. */
export function havan(x, y, s = 1) {
  let g = '';
  g += `<circle cx="0" cy="-70" r="140" fill="url(#ch-glow)" class="havan__glow"/>`;
  const tier = (w, h, yy, c) => P(`M${-w},${yy} L${w},${yy} L${w - 8},${yy - h} L${-w + 8},${yy - h}Z`, c, 2.2) + `<path d="M${-w},${yy} L${w},${yy} L${w - 8},${yy - h} L${-w + 8},${yy - h}Z" fill="url(#ch-brick)"/>`;
  // fire (behind the top tier lip)
  let fire = '';
  const tongues = [[-34, 0.8, PAL.verm], [34, 0.85, PAL.verm], [-16, 1.1, PAL.turmeric], [18, 1.05, PAL.turmeric], [0, 1.35, PAL.verm], [0, 0.9, PAL.marigoldY]];
  tongues.forEach(([fx, fs, c], i) => {
    fire += `<g transform="translate(${fx},-66) scale(${fs})"><g class="tongue" style="--d:${(i * 0.17).toFixed(2)}s">${P('M0,0 C-20,-8 -22,-34 -8,-56 C-4,-66 2,-78 0,-92 C14,-74 24,-50 20,-26 C18,-12 10,-2 0,0Z', c, 1.8)}</g></g>`;
  });
  g += `<g class="havan__fire">${fire}</g>`;
  g += tier(80, 26, -40, PAL.verm) + tier(98, 22, -18, '#c4542a') + tier(116, 18, 0, PAL.verm);
  g += band('M-72,-66 L72,-66', PAL.turmeric, 3);
  g += L('M-60,-53 L-50,-53 M-30,-53 L-20,-53 M0,-53 L10,-53 M30,-53 L40,-53', INK, 1);
  return G(x, y, s, g);
}

/** A marigold string hanging straight down. */
export function marigoldString(x, y, len = 160, r = 6) {
  let g = L(`M0,0 L0,${len}`, INK, 1);
  for (let yy = r; yy < len; yy += r * 1.7) g += C(0, yy, r, Math.round(yy / (r * 1.7)) % 3 ? PAL.marigold : PAL.marigoldY, 1.1);
  g += `<path d="M-4,${len + 2} l4,14 l4,-14z" fill="${PAL.leaf}" ${S(1)}/>`;
  return G(x, y, 1, g);
}

/** A toran of mango leaves between two points (sagging). */
export function toran(x1, x2, y, sag = 26, n = 16) {
  let g = L(`M${x1},${y} Q${(x1 + x2) / 2},${y + sag * 2} ${x2},${y}`, INK, 1.6);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x1 + (x2 - x1) * t;
    const py = y + sag * 4 * t * (1 - t);
    g += `<g transform="translate(${f(px)},${f(py)})">${P('M0,0 C-7,8 -7,24 0,34 C7,24 7,8 0,0Z', i % 2 ? PAL.leaf : PAL.green, 1.4)}${L('M0,3 L0,30', INK, 0.6)}</g>`;
    if (i % 2 === 0) g += C(px, py, 3.4, PAL.marigold, 1);
  }
  return g;
}

/** Triangular bunting fringe (canopy edge). */
export function fringe(x1, x2, y, size = 22) {
  let g = '';
  const n = Math.floor((x2 - x1) / size);
  for (let i = 0; i < n; i++) {
    const a = x1 + i * size;
    g += P(`M${a},${y} L${a + size},${y} L${a + size / 2},${y + size * 1.1}Z`, i % 2 ? PAL.turmeric : PAL.verm, 1.6);
    g += C(a + size / 2, y + size * 0.42, 2.1, i % 2 ? PAL.verm : PAL.turmeric, 0.8);
  }
  return g;
}

/** A repeating border band (rect filled with a named pattern, inked edges). */
export function borderBand(x, y, w, h, pat = 'ch-tri') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${pat})" ${S(2)}/>`;
}

/* ───────────── architecture ───────────── */

/** Wedding mandap: four wrapped posts, a canopy with fringe, toran and marigolds. */
export function mandap(cx, ground, w = 560, h = 470) {
  const x1 = cx - w / 2, x2 = cx + w / 2, top = ground - h;
  const post = (px, py, ph, thick = 14) =>
    P(`M${px - thick / 2},${py} L${px - thick / 2},${py - ph} L${px + thick / 2},${py - ph} L${px + thick / 2},${py}Z`, PAL.turmeric, 2) +
    `<path d="M${px - thick / 2},${py} L${px - thick / 2},${py - ph} L${px + thick / 2},${py - ph} L${px + thick / 2},${py}Z" fill="url(#ch-wrap)"/>`;
  let back = '';
  // back posts (shorter, set back)
  back += post(x1 + 70, ground - 70, h - 70, 10) + post(x2 - 70, ground - 70, h - 70, 10);
  let front = '';
  front += post(x1, ground, h + 6, 16) + post(x2, ground, h + 6, 16);
  // canopy: roof triangle + beam + fringe
  front += P(`M${x1 - 40},${top} L${cx},${top - 120} L${x2 + 40},${top}Z`, PAL.verm, 2.4) + `<path d="M${x1 - 40},${top} L${cx},${top - 120} L${x2 + 40},${top}Z" fill="url(#ch-tri-sm)" opacity=".85"/>`;
  front += P(`M${cx - 60},${top - 10} L${cx},${top - 84} L${cx + 60},${top - 10}Z`, PAL.turmeric, 2) + lotusFlat(cx, top - 38, 0.42);
  front += `<rect x="${x1 - 46}" y="${top - 4}" width="${w + 92}" height="26" fill="${PAL.indigo}" ${S(2.2)}/>` + `<rect x="${x1 - 46}" y="${top - 4}" width="${w + 92}" height="26" fill="url(#ch-dots)"/>`;
  front += fringe(x1 - 44, x2 + 46, top + 22, 23);
  front += C(cx, top - 128, 9, PAL.turmeric, 2) + L(`M${cx},${top - 136} L${cx},${top - 152}`, INK, 2);
  return { back, front, x1, x2, top };
}

/** A Janakpur mud house with a painted wall, door, kalash and toran. */
export function house(x, ground, w = 360, h = 300) {
  const x1 = x, x2 = x + w, top = ground - h;
  let g = '';
  g += P(`M${x1 - 30},${top + 20} L${x1 + w * 0.5},${top - 110} L${x2 + 30},${top + 20}Z`, '#a5562d', 2.4) + `<path d="M${x1 - 30},${top + 20} L${x1 + w * 0.5},${top - 110} L${x2 + 30},${top + 20}Z" fill="url(#ch-thatch)"/>`;
  g += `<rect x="${x1}" y="${top + 20}" width="${w}" height="${h - 20}" fill="#ffffff" ${S(2.4)}/>`;
  g += `<rect x="${x1}" y="${top + 20}" width="${w}" height="22" fill="url(#ch-tri)" ${S(1.8)}/>`;
  g += `<rect x="${x1}" y="${ground - 26}" width="${w}" height="26" fill="${PAL.verm}" ${S(2)}/><rect x="${x1}" y="${ground - 26}" width="${w}" height="26" fill="url(#ch-dots)"/>`;
  // door
  const dx = x1 + w * 0.5 - 52, dw = 104, dt = ground - 200;
  g += `<rect x="${dx - 16}" y="${dt - 16}" width="${dw + 32}" height="${200 + 16 - 26}" fill="${PAL.verm}" ${S(2.2)}/><rect x="${dx - 16}" y="${dt - 16}" width="${dw + 32}" height="${200 - 10}" fill="url(#ch-tri-sm)" opacity=".7"/>`;
  g += `<rect x="${dx}" y="${dt}" width="${dw}" height="${200 - 26}" fill="#3a2418" ${S(2)}/>`;
  g += L(`M${dx + dw / 2},${dt} L${dx + dw / 2},${ground - 26}`, '#6b4a33', 2);
  g += toran(dx - 22, dx + dw + 22, dt - 10, 12, 9);
  // wall paintings: fish pair and peacocks on either side of the door
  g += fishPair(x1 + 70, top + 130, 0.55);
  g += fishPair(x2 - 70, top + 130, 0.55, PAL.indigo, PAL.verm);
  return g;
}

/** Janaki Mandir, Janakpur — a pale silhouette on the horizon. */
export function janakiMandir(cx, ground, s = 1) {
  const c = '#ffffff';
  let g = '';
  g += `<rect x="-300" y="-120" width="600" height="120" fill="${c}" ${S(1.8)}/>`;
  for (let i = -5; i <= 5; i++) g += P(`M${i * 52 - 16},0 L${i * 52 - 16},-58 C${i * 52 - 16},-80 ${i * 52 + 16},-80 ${i * 52 + 16},-58 L${i * 52 + 16},0`, PAL.indigo, 1.4);
  g += `<rect x="-300" y="-132" width="600" height="14" fill="${PAL.turmeric}" ${S(1.6)}/>`;
  const dome = (dx, dy, r, h) => P(`M${dx - r},${dy} C${dx - r * 1.2},${dy - h * 0.6} ${dx - r * 0.3},${dy - h * 0.85} ${dx},${dy - h} C${dx + r * 0.3},${dy - h * 0.85} ${dx + r * 1.2},${dy - h * 0.6} ${dx + r},${dy}Z`, c, 1.8) + L(`M${dx},${dy - h} L${dx},${dy - h - 16}`, INK, 1.6) + C(dx, dy - h - 18, 3, PAL.turmeric, 1);
  g += `<rect x="-90" y="-210" width="180" height="80" fill="${c}" ${S(1.8)}/>` + dome(0, -210, 70, 120);
  for (const dx of [-250, -150, 150, 250]) g += `<rect x="${dx - 22}" y="-180" width="44" height="50" fill="${c}" ${S(1.6)}/>` + dome(dx, -180, 26, 54);
  for (const dx of [-290, 290]) g += `<rect x="${dx - 14}" y="-260" width="28" height="130" fill="${c}" ${S(1.6)}/>` + dome(dx, -260, 20, 44);
  g += L('M-60,-170 L60,-170 M-60,-150 L60,-150', INK, 1);
  return G(cx, ground, s, g);
}

/** A picture frame with a Mithila border. The photo slot is <g class="photo-slot"> filled by JS. */
export function frame(id, x, y, w, h, opts = {}) {
  const b = opts.border ?? 20;
  const shape = opts.arch ? `M${x},${y + h} L${x},${y + w * 0.5} A${w / 2},${w / 2} 0 0 1 ${x + w},${y + w * 0.5} L${x + w},${y + h}Z` : null;
  const clip = shape ? `<path d="${shape}"/>` : `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  const outer = opts.arch
    ? `M${x - b},${y + h + b} L${x - b},${y + w * 0.5} A${w / 2 + b},${w / 2 + b} 0 0 1 ${x + w + b},${y + w * 0.5} L${x + w + b},${y + h + b}Z`
    : `M${x - b},${y - b} L${x + w + b},${y - b} L${x + w + b},${y + h + b} L${x - b},${y + h + b}Z`;
  let g = '';
  if (opts.hang) g += L(`M${x + w * 0.2},${y - b} L${x + w / 2},${y - b - 44} L${x + w * 0.8},${y - b}`, INK, 1.6) + C(x + w / 2, y - b - 46, 4, PAL.turmeric, 1.4);
  g += `<path d="${outer}" fill="${opts.color || PAL.verm}" ${S(2.4)}/><path d="${outer}" fill="url(#${opts.pattern || 'ch-tri-sm'})"/>`;
  g += `<clipPath id="${id}-clip">${clip}</clipPath>`;
  g += `<g clip-path="url(#${id}-clip)"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3a2a20"/><g class="photo-slot" data-slot="${id}" data-x="${x}" data-y="${y}" data-w="${w}" data-h="${h}"></g></g>`;
  g += shape ? `<path d="${shape}" fill="none" ${S(2.4)}/>` : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${S(2.4)}/>`;
  if (!opts.arch) for (const [cx, cy] of [[x - b / 2, y - b / 2], [x + w + b / 2, y - b / 2], [x - b / 2, y + h + b / 2], [x + w + b / 2, y + h + b / 2]]) g += C(cx, cy, b * 0.42, PAL.turmeric, 1.6) + C(cx, cy, b * 0.16, PAL.verm, 1);
  return `<g class="frame">${g}</g>`;
}

/**
 * A placeholder for a studio photo slot. main.js fits the photo inside the box at its
 * own aspect ratio (nothing cropped) and draws a Mithila frame around it.
 * align: 'center' | 'top' (hangs from the top edge) | 'bottom' (stands on the bottom edge).
 */
export function photoBox(slot, x, y, w, h, opts = {}) {
  return `<g class="photo-box" data-slot="${slot}" data-box="${x},${y},${w},${h}" data-opts='${JSON.stringify(opts)}'></g>`;
}

/** Small star / sparkle for the night sky. */
export const star = (x, y, r = 4) => `<path d="M${x},${y - r} L${x + r * 0.3},${y - r * 0.3} L${x + r},${y} L${x + r * 0.3},${y + r * 0.3} L${x},${y + r} L${x - r * 0.3},${y + r * 0.3} L${x - r},${y} L${x - r * 0.3},${y - r * 0.3}Z" fill="#f4dfa4"/>`;

/** String of lights between two points; bulbs carry class "bulb". */
export function lights(x1, x2, y, sag = 40, n = 14) {
  let g = L(`M${x1},${y} Q${(x1 + x2) / 2},${y + sag * 2} ${x2},${y}`, INK, 1.4);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const px = x1 + (x2 - x1) * t, py = y + sag * 4 * t * (1 - t);
    g += `<g transform="translate(${f(px)},${f(py + 8)})"><circle class="bulb" r="13" fill="url(#ch-glow)" style="--d:${((i * 0.37) % 2).toFixed(2)}s"/>${C(0, 0, 5, i % 3 ? PAL.marigoldY : PAL.turmeric, 1.2)}</g>`;
  }
  return g;
}

/* ───────────── pattern defs ───────────── */

export function motifDefs() {
  return `
  <pattern id="ch-scales" width="10" height="8" patternUnits="userSpaceOnUse">
    <path d="M0,8 A5,5 0 0 1 10,8" fill="none" stroke="#1c1611" stroke-width=".9"/>
    <path d="M-5,4 A5,5 0 0 1 5,4 M5,4 A5,5 0 0 1 15,4" fill="none" stroke="#1c1611" stroke-width=".9"/>
  </pattern>
  <pattern id="ch-kachni" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
    <path d="M0,0 L0,5" stroke="#1c1611" stroke-width=".7" opacity=".45"/>
  </pattern>
  <pattern id="ch-dots" width="9" height="9" patternUnits="userSpaceOnUse">
    <circle cx="2.5" cy="2.5" r="1.2" fill="#f2dfae"/><circle cx="7" cy="7" r="1.2" fill="#f2dfae"/>
  </pattern>
  <pattern id="ch-dots-ink" width="7" height="7" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="2" r=".9" fill="#1c1611"/>
  </pattern>
  <pattern id="ch-tri" width="24" height="22" patternUnits="userSpaceOnUse">
    <rect width="24" height="22" fill="#e5a52a"/>
    <path d="M0,22 L12,2 L24,22Z" fill="#d2401f" stroke="#1c1611" stroke-width="1.2" stroke-linejoin="round"/>
    <circle cx="12" cy="15" r="2" fill="#1c1611"/>
  </pattern>
  <pattern id="ch-tri-sm" width="14" height="13" patternUnits="userSpaceOnUse">
    <path d="M0,13 L7,1 L14,13Z" fill="#e5a52a" stroke="#1c1611" stroke-width=".9" stroke-linejoin="round"/>
  </pattern>
  <pattern id="ch-brick" width="20" height="12" patternUnits="userSpaceOnUse">
    <path d="M0,0 L20,0 M0,6 L20,6 M5,0 L5,6 M15,6 L15,12" stroke="#1c1611" stroke-width=".8" opacity=".5"/>
  </pattern>
  <pattern id="ch-wrap" width="16" height="26" patternUnits="userSpaceOnUse" patternTransform="skewY(-30)">
    <rect width="16" height="11" fill="#d2401f"/>
    <path d="M0,0 L16,0 M0,11 L16,11" stroke="#1c1611" stroke-width="1"/>
  </pattern>
  <pattern id="ch-thatch" width="12" height="10" patternUnits="userSpaceOnUse">
    <path d="M0,10 L6,0 M6,10 L12,0" stroke="#1c1611" stroke-width=".8" opacity=".55"/>
  </pattern>
  <pattern id="ch-floor" width="60" height="60" patternUnits="userSpaceOnUse">
    <path d="M30,6 L54,30 L30,54 L6,30Z" fill="none" stroke="#1c1611" stroke-width="1" opacity=".35"/>
    <circle cx="30" cy="30" r="3" fill="#d2401f" opacity=".6"/>
  </pattern>
  <radialGradient id="ch-glow">
    <stop offset="0" stop-color="#ffd27a" stop-opacity=".85"/>
    <stop offset=".45" stop-color="#f5a63a" stop-opacity=".35"/>
    <stop offset="1" stop-color="#f5a63a" stop-opacity="0"/>
  </radialGradient>`;
}
