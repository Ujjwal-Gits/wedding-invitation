// Chitra · articulated, faceless figures drawn in a Mithila (Janakpur) idiom:
// flat colour, black double-line edges, kachni hatching and patterned borders.
//
// Every figure is a small puppet rig: nested <g> joints that rotate about their
// own pivots. Animate by changing numbers in `fig.pose` (GSAP can tween it)
// and calling `fig.apply()`, or let `fig.reach()` (2-bone IK) place a hand.
// All figures face +x (right); `dir = -1` mirrors them.
//
//   import { createGroom, createBride, figureDefs } from './figures.js';
//   svgDefs.innerHTML += figureDefs();                 // patterns, once per document
//   const groom = createGroom();  svg.append(groom.el);  groom.place(800, 820, 1.2);
//   groom.reach('F', 40, -150);                        // hand to a point in body space
//   gsap.to(groom.pose, { lean: 6, onUpdate: () => groom.apply() });
//
// Builders: createGroom, createBride, createElder(kind), createGuest(variant),
// createMusician(instrument), createPriest; low-level createMan / createWoman.

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
const RAD = 180 / Math.PI;

export const INK = '#1c1611';
export const PAL = {
  ink: INK,
  skin: '#b67447', skinB: '#9c6038',
  ivory: '#f4ecd8', ivoryB: '#dcd0b4',
  red: '#b5231a', redB: '#8c1912', redD: '#741410',
  verm: '#d2401f',
  gold: '#dca63a', goldD: '#a97a22',
  green: '#2e7b3c', leaf: '#4c8a37',
  indigo: '#25345e', indigoB: '#1a2645',
  turmeric: '#e5a52a', turmericB: '#c08218',
  pink: '#cf5a82', pinkB: '#a7436a',
  marigold: '#ee8a1c', marigoldY: '#f4b72e',
  hair: '#17110d', grey: '#d2cbc0', greyB: '#a9a196',
  brown: '#6b3f22', brownB: '#55311a',
  saffron: '#e0751f', saffronB: '#b95a14',
  copper: '#c27a3c', copperD: '#93562a',
  waist: '#2a2b40', waistB: '#1d1e2f',
};

/* ───────────────────────── geometry helpers ───────────────────────── */
const f = (n) => Math.round(n * 10) / 10;

/** A tapered limb from (0,0) down to (0,len), rounded ends. */
const limb = (len, w0, w1, bulge = 0) => {
  const a = w0 / 2, b = w1 / 2;
  return `M${f(-a)},0 C${f(-a - bulge)},${f(len * 0.4)} ${f(-b)},${f(len * 0.72)} ${f(-b)},${f(len)} A${f(b)},${f(b)} 0 0 0 ${f(b)},${f(len)} C${f(b)},${f(len * 0.72)} ${f(a + bulge * 0.6)},${f(len * 0.4)} ${f(a)},0 A${f(a)},${f(a)} 0 0 0 ${f(-a)},0Z`;
};

const bez = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

const o = (w = 2) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const path = (d, fill, w = 2, extra = '') => `<path d="${d}" fill="${fill}" ${o(w)} ${extra}/>`;
const line = (d, color = INK, w = 1, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
/** Mithila "double line" band: an ink edge either side of a coloured stripe. */
const band = (d, color, w = 5) => `${line(d, INK, w + 2.6)}${line(d, color, w)}`;
const fold = 'rgba(28,22,17,.32)';
/** A fill-only disc over a joint so the two limbs read as one continuous silhouette. */
const knit = (r, fill) => `<circle r="${r}" fill="${fill}"/>`;

/* ───────────────────────── shared drawing parts ───────────────────────── */

const hand = (fill, henna = false, s = 1) => {
  const d = `M${-5 * s},0 C${-7 * s},${6 * s} ${-6.5 * s},${14 * s} ${-3 * s},${19 * s} C${-0.5 * s},${21.5 * s} ${4 * s},${20.5 * s} ${5.5 * s},${15 * s} L${6.5 * s},${6 * s} C${6.2 * s},${2 * s} ${3.5 * s},${-0.5 * s} 0,${-1 * s}Z`;
  const thumb = `M${5 * s},${4 * s} C${10 * s},${5 * s} ${11 * s},${10 * s} ${7.5 * s},${12.5 * s}`;
  return path(d, fill, 1.6) + line(thumb, INK, 1.4) +
    (henna ? line(`M${-2.6 * s},${9 * s} L${3 * s},${9 * s} M${-2.4 * s},${12.6 * s} L${2.6 * s},${12.6 * s} M${-1.2 * s},${16 * s} L${2 * s},${16 * s}`, '#7a2412', 1) + `<circle cx="0" cy="${4.5 * s}" r="${1.5 * s}" fill="#7a2412"/>` : '');
};

const shoe = (fill, trim = PAL.gold) =>
  path('M-7,-6 L-7,3 C-7,7 10,8 19,6 C24,5 27,1 23,-1 C18,-2 10,-3 6,-7Z', fill, 1.7) + line('M-5,1 C3,3 12,3 20,1', trim, 1.1);

const bareFoot = (fill) =>
  path('M-5,-5 L-5,3 C-5,6 8,6 17,5 C20,4.5 20,1.5 17,0.6 C12,-0.6 7,-2 4,-6Z', fill, 1.5) + line('M-4,5 C4,6.2 12,6 17,5', '#c0391c', 1.5) +
  `<circle cx="3" cy="-3" r="1.3" fill="${PAL.gold}" stroke="${INK}" stroke-width=".6"/>`; // alta + payal

/** Faceless profile head shape (unscaled, neck top at y = -12). */
const HEAD_D = 'M-11,-12 C-19,-22 -19.5,-44 -6,-52 C6,-58.5 22,-50 23,-36 C24,-26 21,-17 14,-11 C8,-6 -3,-5 -11,-12Z';

/** Wraps head-space art: a neck of the given length, then a scaled head group. */
const headGroup = (skin, s, lift, inner) =>
  path(`M-5.5,5 L-5,${f(-12 * s - lift)} L6.5,${f(-12 * s - lift)} L7,5Z`, skin, 1.7) +
  `<g transform="translate(0,${f(-lift - 12 * s + 12)}) scale(${s})">${path(HEAD_D, skin, 2 / s)}${inner}</g>`;

/* ───────────────────────── the rig ───────────────────────── */

const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};

/** Rotation (our convention: 0 = pointing down, + = clockwise) of a direction vector. */
const angOf = (dx, dy) => Math.atan2(-dx, dy) * RAD;

class Figure {
  constructor(spec) {
    this.kind = spec.kind;
    this.hipY = spec.hipY;
    this.dims = spec.dims;
    this.stride = spec.stride ?? 1;
    this.el = el('g', { class: `fig fig--${spec.kind}` });
    this.bodyEl = el('g', { class: 'fig__body' });
    this.el.append(this.bodyEl);
    this.j = { body: this.bodyEl };
    this.at = {};
    for (const [name, parent, x, y, svg] of spec.joints) {
      const g = el('g', { class: `j-${name}` }, svg || '');
      (this.j[parent] || this.bodyEl).append(g);
      this.j[name] = g;
      this.at[name] = [x, y];
    }
    this.rest = { lean: 0, bob: 0, head: 0, ...spec.rest };
    this.pose = { ...this.rest };
    this.x = 0; this.y = 0; this.s = 1; this.dir = 1; this.sx = 1; this.lift = 0;
    this.apply();
  }

  place(x, y, s = this.s, dir = this.dir) {
    this.x = x; this.y = y; this.s = s; this.dir = dir;
    return this.apply();
  }

  apply() {
    const p = this.pose;
    const sx = this.s * this.dir * this.sx;
    this.el.setAttribute('transform', `translate(${f(this.x)},${f(this.y)}) scale(${sx.toFixed(3)},${this.s.toFixed(3)})`);
    this.bodyEl.setAttribute('transform', `translate(0,${f(-this.hipY + (p.bob || 0) + this.lift)}) rotate(${f(p.lean || 0)})`);
    for (const name in this.at) {
      const [x, y] = this.at[name];
      const r = p[name] || 0;
      this.j[name].setAttribute('transform', r ? `translate(${x},${y}) rotate(${f(r)})` : `translate(${x},${y})`);
    }
    return this;
  }

  reset(over = {}) {
    for (const k in this.pose) if (!(k in this.rest)) this.pose[k] = 0;
    Object.assign(this.pose, this.rest, over);
    return this.apply();
  }

  /**
   * 2-bone IK: put hand `side` ('F' front / 'B' back) at body-space point (x, y).
   * Writes pose.armX / pose.foreX (and returns them). `bend` 1 = elbow down/back.
   */
  reach(side, x, y, bend = 0, into = this.pose) {
    const [sx, sy] = this.at[`arm${side}`];
    const L1 = this.dims.upper - 3, L2 = this.dims.fore - 2 + 9;
    let dx = x - sx, dy = y - sy;
    let d = Math.hypot(dx, dy);
    const max = (L1 + L2) * 0.985;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    const min = Math.abs(L1 - L2) + 8;
    if (d < min) { const k = min / (d || 1); dx *= k; dy *= k; d = min; }
    const base = angOf(dx, dy);
    const a = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)))) * RAD;
    const solve = (b) => {
      const up = base + a * b;
      const ex = sx - Math.sin(up / RAD) * L1, ey = sy + Math.cos(up / RAD) * L1;
      return { up, ey, fore: angOf(sx + dx - ex, sy + dy - ey) - up };
    };
    let r;
    if (bend) r = solve(bend);
    else { const r1 = solve(1), r2 = solve(-1); r = r1.ey >= r2.ey ? r1 : r2; } // elbow hangs low
    let fore = r.fore;
    while (fore > 180) fore -= 360;
    while (fore < -180) fore += 360;
    into[`arm${side}`] = r.up;
    into[`fore${side}`] = fore;
    return into;
  }

  /** Walk cycle. `t` = phase in cycles, `k` = stride 0–1. Arms swing unless `arms` is false. */
  walk(t, k = 1, arms = true) {
    const p = this.pose, r = this.rest;
    const a = t * TAU, s = Math.sin(a), c = Math.cos(a);
    const kl = k * this.stride;
    p.legF = (r.legF || 0) - 22 * s * kl;
    p.legB = (r.legB || 0) + 22 * s * kl;
    p.shinF = (r.shinF || 0) + (4 + 26 * Math.max(0, c)) * kl;
    p.shinB = (r.shinB || 0) + (4 + 26 * Math.max(0, -c)) * kl;
    p.footF = -8 * Math.max(0, c) * kl;
    p.footB = -8 * Math.max(0, -c) * kl;
    p.bob = (r.bob || 0) - 3.2 * (1 - Math.abs(s)) * k;
    p.lean = (r.lean || 0) + 1.6 * k;
    p.head = (r.head || 0) + 1.2 * Math.sin(a * 2) * k;
    if ('skirt' in r) p.skirt = (r.skirt || 0) + 2.6 * s * k;
    if ('fall' in r) p.fall = (r.fall || 0) - 2 * Math.abs(s) * k;
    if (arms) {
      p.armF = (r.armF || 0) + 12 * s * k;
      p.armB = (r.armB || 0) - 12 * s * k;
      p.foreF = (r.foreF || 0) - 8 * Math.max(0, s) * k;
      p.foreB = (r.foreB || 0) - 8 * Math.max(0, -s) * k;
    }
    if ('mala' in r) p.mala = (r.mala || 0) + 3 * s * k;
    return this.apply();
  }

  /** Breathing and a little weight shift for figures standing still. */
  idle(t, k = 1) {
    const p = this.pose, r = this.rest;
    p.bob = (r.bob || 0) + Math.sin(t * TAU * 0.25 + this.x) * 0.9 * k;
    p.head = (r.head || 0) + Math.sin(t * TAU * 0.11 + this.x * 0.1) * 1.8 * k;
    if ('skirt' in r) p.skirt = (r.skirt || 0) + Math.sin(t * TAU * 0.2) * 0.8 * k;
    return this.apply();
  }

  /** Converts a point in the parent's space to this figure's body space (ignores lean). */
  toBody(X, Y) {
    return [(X - this.x) / (this.dir * this.sx * this.s || 1e-3), (Y - this.y) / this.s + this.hipY - (this.pose.bob || 0) - this.lift];
  }

  /** Body-space point to the parent's space (ignores lean). */
  toScene(bx, by) {
    return [this.x + bx * this.dir * this.sx * this.s, this.y + (by - this.hipY + (this.pose.bob || 0) + this.lift) * this.s];
  }

  /** A joint-local point in the coordinate space of the figure's parent element. */
  point(name, lx = 0, ly = 0) {
    const m = this.j[name].getCTM();
    const pm = this.el.parentNode.getCTM();
    if (!m || !pm) return [this.x, this.y];
    const pt = new DOMPoint(lx, ly).matrixTransform(pm.inverse().multiply(m));
    return [pt.x, pt.y];
  }
}

/* ───────────────────────── men ───────────────────────── */

const MAN = { hip: 166, thigh: 82, shin: 76, upper: 66, fore: 58, sh: -100, hs: 0.84 };

/**
 * A man in daura suruwal (or a musician's jama).
 * opts: daura, suruwal, top ('istakot'|'coat'|'jama'|'none'), topColor, topi ('dhaka'|'bhadgaunle'|'pagri'|'tuft'|'none'),
 *       hair, mala, sash, shoes, propF / propB (hand-space svg), headProp (head-space svg), body (body-space svg), rest
 */
export function createMan(opts = {}) {
  const P = PAL;
  const daura = opts.daura || P.ivory;
  const dauraB = opts.dauraB || P.ivoryB;
  const suru = opts.suruwal || daura;
  const suruB = opts.suruwalB || dauraB;
  const skin = opts.skin || P.skin, skinB = opts.skinB || P.skinB;
  const top = opts.top || 'none';
  const jama = top === 'jama';
  const shoeC = opts.shoes || '#2a1d14';

  // Legs: baggy suruwal thigh, fitted shin
  const thighF = path(limb(MAN.thigh - 3, 34, 19, 4), suru) + line('M-6,18 C-4,44 -2,62 0,76', fold, 1);
  const thighB = path(limb(MAN.thigh - 3, 33, 18, 4), suruB);
  const shinF = path(limb(MAN.shin, 17, 12), suru) + knit(7.4, suru) + line('M-6.5,62 L6.5,62', INK, 1.1);
  const shinB = path(limb(MAN.shin, 16, 11.5), suruB) + knit(7, suruB) + line('M-6,62 L6,62', INK, 1.1);

  let torso = '';
  if (jama) {
    const skirt = 'M-15,-8 C-28,30 -42,80 -48,122 Q2,134 50,120 C42,80 28,30 17,-8Z';
    torso += path(skirt, daura, 2.1) +
      `<path d="M-15,-8 C-28,30 -42,80 -48,122 Q-30,127 -18,128 C-16,80 -12,30 -6,-8Z" fill="${dauraB}" opacity=".7"/>` +
      line('M-4,0 C-10,40 -16,82 -20,126 M4,0 C4,42 4,84 4,130 M11,-2 C18,40 24,82 29,126', fold, 1) +
      band('M-47,116 Q2,128 49,114', opts.hem || P.verm, 3);
  } else {
    const skirt = 'M-15,-8 C-20,28 -26,60 -31,90 Q0,98 33,88 C27,60 23,28 17,-8Z';
    torso += path(skirt, daura, 2) +
      `<path d="M-15,-8 C-20,28 -26,60 -31,90 Q-22,93 -14,94 C-12,60 -10,28 -6,-8Z" fill="${dauraB}" opacity=".75"/>` +
      line('M-6,0 L-13,92 M3,0 L2,96 M11,-2 L17,92', fold, 1);
  }
  // upper body
  const chest = 'M-10,-110 C-18,-96 -18,-62 -16,-34 C-15,-20 -15,-10 -15,-6 L17,-6 C17,-22 22,-50 21,-78 C20,-96 14,-106 7,-111 Z';
  torso += path(chest, daura, 2.1);
  if (!jama) torso += line('M14,-86 L23,-82 M14,-86 L22,-88 M16,-60 L24,-56 M16,-60 L23,-62', INK, 1.1);
  if (opts.sash !== false) {
    const sashC = opts.sash || (jama ? P.verm : P.ivoryB);
    torso += path('M-16,-14 L18,-14 L18,-1 L-15,-1Z', sashC, 1.6);
    if (jama) torso += path('M-15,-6 C-20,4 -21,16 -19,26 L-13,25 C-14,16 -12,6 -9,-1Z', sashC, 1.4) + path('M-14,-4 C-24,2 -27,12 -26,20 L-21,19 C-21,12 -18,4 -11,-1Z', sashC, 1.4);
  }
  if (top === 'istakot' || top === 'coat') {
    const c = opts.topColor || P.waist;
    const len = top === 'coat' ? 30 : 8;
    const d = `M-11,-106 C-19,-88 -19,-52 -17,-22 L-17,${len} L18,${len} L18,-22 C21,-46 22,-70 20,-86 L12,-74 L8,-106 Z`;
    torso += path(d, c, 2.1) + `<path d="${d}" fill="url(#ch-hatch)" opacity=".6"/>` +
      line(`M12,-74 L17,${len}`, INK, 1.1) +
      [-62, -46, -30, -14].map((y) => `<circle cx="${f(14.6 + (y + 74) * 0.03)}" cy="${y}" r="1.8" fill="${P.gold}" stroke="${INK}" stroke-width=".7"/>`).join('') +
      line('M-4,-46 L5,-46', P.gold, 1.2) +
      (top === 'coat' ? line(`M-2,4 L10,4`, INK, 1) : '');
  }

  const sleeve = (fill, back) => path(limb(MAN.upper - 3, 18, 14, 1), fill) + (back ? '' : line('M-2,14 C-1,34 0,50 0,62', fold, 1));
  const fore = (fill) => path(limb(MAN.fore - 2, 14, 11), fill) + knit(5.8, fill) + line('M-6,52 L6,52', INK, 1.1);

  // Head (unscaled head space) + hair + topi
  let hd = '';
  const hairC = opts.hair || P.hair;
  hd += path('M-20,-38 C-23,-30 -20,-20 -14,-15 C-12,-22 -11,-30 -8,-38Z', hairC, 1.8);
  const topi = opts.topi ?? 'dhaka';
  if (topi === 'dhaka') {
    const d = 'M-21,-36 C-22,-50 -20,-64 -16,-76 C-2,-73 12,-68 20,-63 C22,-57 23,-50 23,-43 C10,-40 -6,-37 -21,-36Z';
    hd += path(d, '#9c2318', 2.3) + `<path d="${d}" fill="url(#ch-dhaka)"/>` + path(d, 'none', 2.3) + band('M-21,-38 C-6,-39 10,-42 23,-45', P.ink, 1.8);
  } else if (topi === 'bhadgaunle') {
    const d = 'M-21,-36 C-22,-46 -20,-56 -17,-65 C-2,-63 12,-59 20,-56 C22,-51 23,-47 23,-43 C10,-40 -6,-37 -21,-36Z';
    hd += path(d, '#221d22', 2.3) + line('M-17,-61 C-2,-59 10,-56 19,-53', '#4a4350', 1.2);
  } else if (topi === 'pagri') {
    const pc = opts.pagri || P.ivory;
    hd += path('M-25,-24 C-30,-36 -28,-56 -12,-64 C4,-71 22,-62 25,-44 C26,-40 25,-37 23,-36 C10,-40 -6,-36 -18,-26Z', pc, 2.3) +
      line('M-24,-34 C-10,-46 8,-50 24,-44 M-22,-46 C-8,-56 8,-60 21,-55 M-16,-58 C-6,-62 6,-64 14,-62', fold, 1.3) +
      path('M-24,-28 C-32,-26 -36,-16 -33,-6 L-27,-10 C-28,-16 -26,-22 -21,-25Z', pc, 1.8);
  } else if (topi === 'tuft') {
    hd += path('M-20,-38 C-21,-50 -12,-58 0,-58 C10,-58 19,-52 21,-44 C12,-48 -4,-46 -20,-38Z', 'none', 0) + line('M-10,-55 C-16,-62 -12,-70 -6,-66', hairC, 2.4);
  } else {
    hd += path('M-20,-38 C-21,-50 -12,-58 0,-58 C10,-58 19,-52 21,-44 C12,-48 -4,-46 -20,-38Z', hairC, 1.8);
  }
  if (opts.tilak) hd += path('M21.2,-42 L23.6,-42 L23.6,-30 L21.8,-30Z', P.verm, 0.6);
  hd += opts.headProp || '';

  let mala = '';
  if (opts.mala) mala = garland([[-1, -4], [26, 40], [30, 120], [20, 138]], [[17, 136], [21, 90], [13, 30], [11, -6]], 5);

  const joints = [
    ['armB', 'body', -4, MAN.sh, sleeve(dauraB, true)],
    ['foreB', 'armB', 0, MAN.upper - 3, fore(dauraB)],
    ['handB', 'foreB', 0, MAN.fore - 2, hand(skinB) + (opts.propB || '')],
    ['legB', 'body', -3, 0, thighB],
    ['shinB', 'legB', 0, MAN.thigh - 3, shinB],
    ['footB', 'shinB', 0, MAN.shin - 4, shoe(shoeC)],
    ['legF', 'body', 3, 0, thighF],
    ['shinF', 'legF', 0, MAN.thigh - 3, shinF],
    ['footF', 'shinF', 0, MAN.shin - 4, shoe(shoeC)],
    ['torso', 'body', 0, 0, torso + (opts.body || '')],
    ['head', 'body', 5, -110, headGroup(skin, MAN.hs, 3, hd)],
    ['mala', 'body', 4, -106, mala],
    ['armF', 'body', 5, MAN.sh + 2, sleeve(daura, false)],
    ['foreF', 'armF', 0, MAN.upper - 3, fore(daura)],
    ['handF', 'foreF', 0, MAN.fore - 2, hand(skin) + (opts.propF || '')],
    ['front', 'body', 0, 0, opts.front || ''],
  ];
  return new Figure({
    kind: opts.kind || 'man',
    hipY: MAN.hip,
    dims: MAN,
    joints,
    rest: { armF: -6, foreF: -14, armB: 7, foreB: -10, legF: 0, legB: 0, shinF: 0, shinB: 0, footF: 0, footB: 0, mala: 0, lean: opts.lean || 0, head: opts.headTilt || 0, ...(opts.rest || {}) },
  });
}

/** A marigold garland drawn as beads along two bezier strands (local coords). */
export function garland(a, b, r = 4.4, n = 18) {
  let s = '';
  const strand = (pts, count, off) => {
    for (let i = 0; i <= count; i++) {
      const [x, y] = bez(pts[0], pts[1], pts[2], pts[3], i / count);
      const col = (i + off) % 3 === 0 ? PAL.marigoldY : PAL.marigold;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${col}" stroke="${INK}" stroke-width="1"/>`;
      s += `<path d="M${f(x - r * 0.5)},${f(y)} L${f(x + r * 0.5)},${f(y)}" stroke="${INK}" stroke-width=".6" opacity=".5"/>`;
    }
  };
  if (b) strand(b, Math.round(n * 0.9), 1);
  strand(a, n, 0);
  const end = a[3];
  s += `<path d="M${end[0] - 4},${end[1] + 3} l-3,14 l7,-4 l6,5 l-2,-15z" fill="${PAL.leaf}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
  return s;
}

/** A closed garland loop (for carrying in the hands before the Swayambar). */
export function garlandLoop(cx, cy, rx, ry, r = 4.2) {
  let s = '';
  const n = Math.round((Math.PI * (rx + ry)) / (r * 1.7));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    s += `<circle cx="${f(cx + Math.cos(a) * rx)}" cy="${f(cy + Math.sin(a) * ry)}" r="${r}" fill="${i % 3 ? PAL.marigold : PAL.marigoldY}" stroke="${INK}" stroke-width="1"/>`;
  }
  return s;
}

/* ───────────────────────── women ───────────────────────── */

const WOM = { hip: 152, thigh: 74, shin: 70, upper: 60, fore: 52, sh: -92, hs: 0.78 };

/**
 * A woman in a sari.
 * opts: sari, sariB, border, blouse, veil (ghumto), pote, chura, bangles, hair, flower, sindoor, shawl, henna, butti, rest
 */
export function createWoman(opts = {}) {
  const P = PAL;
  const sari = opts.sari || P.red, sariB = opts.sariB || P.redB;
  const border = opts.border || P.gold;
  const blouse = opts.blouse || sari;
  const skin = opts.skin || P.skin, skinB = opts.skinB || P.skinB;
  const hairC = opts.hair || P.hair;
  const pleatC = opts.pleat || 'rgba(28,22,17,.36)';
  const butti = opts.butti !== false;

  // Sari skirt: A-line, Nivi pleats in front, gold border at the hem.
  const skirtD = 'M-14,-20 C-19,14 -31,74 -41,140 Q2,150 43,138 C35,92 27,40 18,-20Z';
  let skirt = path(skirtD, sari, 2.2);
  if (butti) skirt += `<path d="${skirtD}" fill="url(#ch-butti)"/>`;
  skirt += `<path d="M-14,-20 C-19,14 -31,74 -41,140 Q-30,143 -20,144 C-18,80 -12,20 -6,-20Z" fill="${sariB}" opacity=".55"/>`;
  skirt += line('M5,-8 C8,40 12,98 14,146 M10,-10 C15,40 21,96 25,144 M14,-12 C20,34 28,90 34,141 M17,-14 C25,26 33,84 41,138', pleatC, 1.1);
  skirt += band('M-40,130 Q2,141 42,128', border, 5.6);
  skirt += line('M-39,135.5 Q2,146 42,133.5', INK, 1.8, 'stroke-dasharray="0.1 3.6"');
  skirt += band('M-14,-14 C-2,-8 8,-6 18,-10', border, 3);

  // Upper body: blouse, the pallu over the chest, the back fall.
  let torso = path('M-9,-100 C-15,-84 -15,-60 -13,-40 L-14,-18 L17,-18 C17,-28 15,-38 17,-50 C22,-60 21,-76 15,-88 C12,-96 7,-101 1,-103Z', blouse, 2);
  const palluFront = 'M-10,-101 C2,-99 12,-91 17,-81 C22,-69 21,-57 18,-49 C15,-41 16,-29 18,-17 C8,-21 -2,-23 -13,-21 C-15,-47 -15,-75 -10,-101Z';
  torso += path(palluFront, sari, 2);
  if (butti) torso += `<path d="${palluFront}" fill="url(#ch-butti)"/>`;
  torso += line('M-4,-96 C0,-74 6,-54 12,-28', pleatC, 1);
  torso += band('M-10,-101 C-3,-75 7,-50 17,-19', border, 4.6);
  let fall = '';
  if (opts.veil) {
    const fallD = 'M-6,-106 C-24,-86 -32,-42 -40,26 C-36,30 -30,32 -24,32 C-20,-18 -14,-62 2,-98Z';
    fall = path(fallD, sariB, 2) + (butti ? `<path d="${fallD}" fill="url(#ch-butti)" opacity=".8"/>` : '') +
      band('M-7,-104 C-24,-82 -32,-40 -39,26', border, 5) + band('M-39,27 C-34,31 -29,32 -24,32', border, 3.4);
  }
  if (opts.shawl) {
    const d = 'M-12,-100 C-24,-74 -26,-40 -24,-8 L-11,-4 C-12,-40 -6,-74 4,-102Z';
    torso += path(d, opts.shawl, 1.8) + `<path d="${d}" fill="url(#ch-hatch)" opacity=".55"/>`;
  }
  if (opts.pote) {
    torso += line('M-4,-102 C-2,-87 6,-75 15,-67', INK, 5) + line('M-4,-102 C-2,-87 6,-75 15,-67', P.green, 3.4, 'stroke-dasharray="0.1 3.3"') +
      line('M-1,-103 C2,-92 8,-82 16,-74', INK, 4.2) + line('M-1,-103 C2,-92 8,-82 16,-74', P.green, 2.8, 'stroke-dasharray="0.1 3"') +
      `<g transform="translate(15.6,-67) rotate(-16)">${path('M-2.8,0 L2.8,0 L2.8,15 Q0,18.5 -2.8,15Z', P.gold, 1.1)}${line('M-2.8,4 L2.8,4 M-2.8,8.5 L2.8,8.5 M-2.8,12 L2.8,12', INK, 0.7)}<circle cx="0" cy="-1.6" r="2.1" fill="${P.gold}" stroke="${INK}" stroke-width="1"/></g>`;
  }
  if (opts.necklace) torso += line('M-3,-102 C0,-92 6,-86 14,-84', P.gold, 2.4, 'stroke-dasharray="0.1 2.8"');

  const upper = (fill, sl) => path(limb(WOM.upper - 3, 13.5, 10.5), fill, 1.8) + path('M-8,-3 C-8.5,8 -8,16 -7.5,23 L7.5,23 C7.5,15 8,7 7.5,-3 C4,-6 -4,-6 -8,-3Z', sl, 1.6) + band('M-7.5,22 L7.5,22', border, 2);
  const chura = () => {
    let s = '';
    for (let i = 0; i < 10; i++) {
      const y = 27 + i * 2.5;
      const c = i === 0 || i === 9 || i === 5 ? P.gold : P.red;
      s += `<rect x="-6.4" y="${f(y)}" width="12.8" height="2.5" rx="1.2" fill="${c}" stroke="${INK}" stroke-width=".65"/>`;
    }
    return s;
  };
  const fore = (fill) => path(limb(WOM.fore - 1, 10.5, 8), fill, 1.8) + knit(4.2, fill) + (opts.chura ? chura() : opts.bangles ? `<rect x="-6" y="40" width="12" height="3" rx="1.4" fill="${P.gold}" stroke="${INK}" stroke-width=".8"/><rect x="-6" y="43.5" width="12" height="3" rx="1.4" fill="${opts.bangles}" stroke="${INK}" stroke-width=".8"/>` : '');

  // Head-space art (unscaled)
  let hd = '';
  if (!opts.veil) {
    hd += path('M-19,-36 C-20,-48 -10,-57 2,-56 C12,-56 19,-50 21,-43 C14,-47 6,-49 0,-47 C-6,-41 -10,-31 -14,-21 C-18,-25 -19,-30 -19,-36Z', hairC, 2) +
      path('M-27,-23 C-32,-14 -27,-5 -18,-6 C-11,-7 -11,-18 -17,-23 C-20,-25 -24,-25 -27,-23Z', hairC, 2) +
      (opts.flower ? `<circle cx="-24" cy="-25" r="3.4" fill="${P.ivory}" stroke="${INK}" stroke-width="1"/><circle cx="-19" cy="-28" r="3" fill="${P.ivory}" stroke="${INK}" stroke-width="1"/><circle cx="-28" cy="-21" r="2.6" fill="${P.ivory}" stroke="${INK}" stroke-width="1"/>` : '');
  } else {
    hd += path('M-14,-36 C-13,-46 -4,-53 6,-53 C13,-53 18,-49 20,-44 C13,-47 5,-47 -1,-45 C-6,-41 -9,-32 -10,-24Z', hairC, 1.8);
  }
  hd += `<g transform="translate(-2,-16)">${line('M0,0 L0,4', P.goldD, 1.2)}${path('M-3.4,4 L3.4,4 L4.4,10 Q0,12.4 -4.4,10Z', P.gold, 1.2)}</g>`;
  if (opts.veil) {
    // The ghumto sits back on the crown so the hair parting (and the sindoor) shows.
    const veilD = 'M10,-54 C2,-62 -14,-62 -24,-52 C-32,-42 -34,-24 -31,-6 C-29,4 -22,12 -15,14 L-7,6 C-12,-6 -13,-22 -10,-33 C-7,-43 0,-50 10,-51Z';
    hd += path(veilD, sari, 2.2) + (butti ? `<path d="${veilD}" fill="url(#ch-butti)"/>` : '') +
      band('M10,-52.5 C0,-50 -7,-43 -10,-33 C-13,-21 -12,-6 -7,6', border, 4.8);
  }
  hd += `<path class="sindoor" d="M19,-44.5 C15,-49 10,-51.5 4,-52.5" fill="none" stroke="${P.verm}" stroke-width="3.4" stroke-linecap="round" opacity="${opts.sindoor ? 1 : 0}"/>`;
  hd += `<circle class="tika" cx="18.6" cy="-38" r="2" fill="${P.verm}" stroke="${INK}" stroke-width=".6" opacity="${opts.sindoor ? 1 : 0}"/>`;
  hd += opts.headProp || '';

  const joints = [
    ['armB', 'body', -3, WOM.sh, upper(skinB, opts.blouseB || sariB)],
    ['foreB', 'armB', 0, WOM.upper - 3, fore(skinB)],
    ['handB', 'foreB', 0, WOM.fore - 1, hand(skinB, opts.henna, 0.9) + (opts.propB || '')],
    ['fall', 'body', -4, -100, `<g transform="translate(4,100)">${fall}</g>`],
    // legs are hidden under the sari; only the feet show below the hem
    ['legB', 'body', -2, 0, ''],
    ['shinB', 'legB', 0, WOM.thigh - 2, ''],
    ['footB', 'shinB', 0, WOM.shin + 4, bareFoot(skinB)],
    ['legF', 'body', 2, 0, ''],
    ['shinF', 'legF', 0, WOM.thigh - 2, ''],
    ['footF', 'shinF', 0, WOM.shin + 4, bareFoot(skin)],
    ['skirt', 'body', 0, -18, `<g transform="translate(0,18)">${skirt}</g>`],
    ['torso', 'body', 0, 0, torso + (opts.body || '')],
    ['head', 'body', 4, -102, headGroup(skin, WOM.hs, 5, hd)],
    ['mala', 'body', 3, -100, opts.mala ? garland([[-1, -2], [20, 34], [24, 92], [16, 104]], [[14, 102], [18, 64], [12, 20], [10, -4]], 4.2, 16) : ''],
    ['armF', 'body', 4, WOM.sh + 2, upper(skin, blouse)],
    ['foreF', 'armF', 0, WOM.upper - 3, fore(skin)],
    ['handF', 'foreF', 0, WOM.fore - 1, hand(skin, opts.henna, 0.9) + (opts.propF || '')],
    ['front', 'body', 0, 0, opts.front || ''],
  ];
  const fig = new Figure({
    kind: opts.kind || 'woman',
    hipY: WOM.hip,
    dims: WOM,
    stride: 0.42,
    joints,
    rest: { armF: -8, foreF: -40, armB: 8, foreB: -16, legF: 0, legB: 0, shinF: 0, shinB: 0, footF: 0, footB: 0, skirt: 0, fall: 0, mala: 0, lean: opts.lean || 0, head: opts.headTilt || 0, ...(opts.rest || {}) },
  });
  fig.sindoor = fig.el.querySelector('.sindoor');
  fig.tika = fig.el.querySelector('.tika');
  return fig;
}

/* ───────────────────────── cast ───────────────────────── */

export function createGroom(opts = {}) {
  return createMan({ kind: 'groom', top: 'istakot', topi: 'dhaka', mala: true, shoes: '#3a2416', ...opts });
}

export function createBride(opts = {}) {
  return createWoman({ kind: 'bride', sari: PAL.red, sariB: PAL.redB, border: PAL.gold, veil: true, pote: true, chura: true, henna: true, necklace: true, ...opts });
}

/** Family elders. kind: 'father' | 'mother' | 'grandfather' | 'grandmother' */
export function createElder(kind = 'father', opts = {}) {
  if (kind === 'father') return createMan({ kind: 'elder', top: 'coat', topColor: PAL.brown, topi: 'bhadgaunle', daura: '#ebe1c8', dauraB: '#d3c6a8', hair: PAL.grey, lean: 3, headTilt: 3, ...opts });
  if (kind === 'grandfather') {
    const g = createMan({ kind: 'elder', top: 'coat', topColor: '#3c3a46', topi: 'dhaka', daura: '#ece4cf', hair: PAL.grey, lean: 6, headTilt: 6, propF: `<g transform="translate(1,12) rotate(-8)">${line('M0,-6 L0,118', INK, 5)}${line('M0,-6 L0,118', '#7a5230', 3)}</g>`, ...opts });
    g.reach('F', 32, -10, 1, g.rest); g.reset();
    return g;
  }
  if (kind === 'grandmother') return createWoman({ kind: 'elder', sari: '#ebe2cc', sariB: '#d4c8aa', border: PAL.verm, blouse: PAL.redD, blouseB: PAL.redD, hair: PAL.grey, shawl: PAL.indigo, pote: true, bangles: PAL.green, lean: 5, headTilt: 7, butti: false, sindoor: true, ...opts });
  return createWoman({ kind: 'elder', sari: PAL.green, sariB: '#215a2b', border: PAL.gold, blouse: PAL.redD, blouseB: PAL.redD, hair: '#3a332e', pote: true, bangles: PAL.red, sindoor: true, lean: 2, headTilt: 3, ...opts });
}

/** Guests for the procession and the reception. variant: 0..5 */
export function createGuest(variant = 0, opts = {}) {
  const v = ((variant % 6) + 6) % 6;
  if (v === 0) return createWoman({ kind: 'guest', sari: PAL.pink, sariB: PAL.pinkB, border: PAL.gold, blouse: PAL.indigo, blouseB: PAL.indigoB, flower: true, bangles: PAL.gold, necklace: true, ...opts });
  if (v === 1) return createMan({ kind: 'guest', top: 'coat', topColor: PAL.indigo, topi: 'dhaka', daura: '#efe6d0', ...opts });
  if (v === 2) return createWoman({ kind: 'guest', sari: PAL.turmeric, sariB: PAL.turmericB, border: PAL.verm, blouse: PAL.green, blouseB: '#225d2d', bangles: PAL.green, ...opts });
  if (v === 3) return createMan({ kind: 'guest', top: 'istakot', topColor: '#5b2a24', topi: 'bhadgaunle', daura: '#f0e8d4', ...opts });
  if (v === 4) return createWoman({ kind: 'guest', sari: PAL.indigo, sariB: PAL.indigoB, border: PAL.gold, blouse: PAL.verm, blouseB: PAL.redB, flower: true, bangles: PAL.red, pleat: 'rgba(240,220,170,.28)', ...opts });
  return createMan({ kind: 'guest', top: 'none', topi: 'dhaka', daura: '#e8e0ca', ...opts });
}

/** The purohit: saffron dhoti, white shawl, shaved head with a tuft, tilak. */
export function createPriest(opts = {}) {
  return createMan({ kind: 'priest', top: 'none', topi: 'tuft', daura: '#f3ead2', dauraB: '#dacfb2', suruwal: PAL.saffron, suruwalB: PAL.saffronB, sash: PAL.saffron, tilak: true, hair: PAL.hair,
    front: path('M-12,-104 C-20,-80 -22,-50 -20,-20 L-8,-16 C-10,-50 -4,-82 6,-106Z', PAL.saffron, 1.8), ...opts });
}

/* ───────────────────────── panche baja ───────────────────────── */

const stick = (len = 34, a = -40) => `<g transform="translate(2,13) rotate(${a})">${line(`M0,0 L0,${-len}`, INK, 4.6)}${line(`M0,0 L0,${-len}`, '#7a4a24', 2.6)}<circle cx="0" cy="${-len}" r="2.8" fill="#7a4a24" stroke="${INK}" stroke-width="1"/></g>`;
const cymbal = (a) => `<g transform="translate(1,15) rotate(${a})">${path('M-20,0 C-15,-8 15,-8 20,0 C15,4 -15,4 -20,0Z', PAL.gold, 1.7)}<circle cx="0" cy="-5" r="3.2" fill="${PAL.goldD}" stroke="${INK}" stroke-width="1"/></g>`;

// Wind instruments hang from the head (head space, unscaled): mouth ≈ (22,-24).
// Wind instruments are drawn in body space (mouth ≈ (23,-129)) and painted over the hands.
const SHEHNAI = `<g transform="translate(23,-128) rotate(-52)">${line('M0,0 L0,56', INK, 7)}${line('M0,0 L0,56', '#6d3f1d', 4.6)}${line('M-2.4,16 L2.4,16 M-2.4,27 L2.4,27 M-2.4,38 L2.4,38', PAL.gold, 1.6)}${path('M-7,54 L7,54 L13,70 C4,74 -4,74 -13,70Z', PAL.gold, 1.6)}</g>`;
const NARSINGHA = `<g>${line('M22,-129 C54,-121 86,-143 92,-187 C98,-231 76,-265 42,-275', INK, 9.4)}${line('M22,-129 C54,-121 86,-143 92,-187 C98,-231 76,-265 42,-275', PAL.copper, 6.4)}${line('M52,-124 L54,-131 M88,-167 L95,-167 M84,-237 L91,-241', INK, 2.6)}${path('M46,-267 C38,-283 20,-287 10,-279 C20,-275 30,-269 38,-259Z', PAL.copper, 2)}</g>`;

const INSTR = {
  narsingha: { front: NARSINGHA, reachF: [66, -138], reachB: [40, -127], rest: { head: -6 } },
  shehnai: { front: SHEHNAI, reachF: [58, -104], reachB: [42, -116], rest: { head: 4, lean: 2 } },
  damaha: {
    propF: stick(38, -60), reachF: [34, -64], reachB: [10, 6],
    body: `<g transform="translate(28,-26)">${line('M-24,-4 L-38,-82', '#6b2f1e', 2.4)}${path('M-28,0 C-28,34 28,34 28,0Z', PAL.copper, 2.2)}${line('M-20,12 C-6,22 6,22 20,12', INK, 1)}${path('M-30,-3 L30,-3 L30,4 L-30,4Z', PAL.ivoryB, 1.7)}</g>`,
    rest: { lean: 4 },
  },
  tyamko: {
    propF: stick(26, -96), propB: stick(26, -70), reachF: [40, -76], reachB: [30, -72],
    body: `<g transform="translate(26,-48)">${line('M-12,-2 L-24,-56', '#6b2f1e', 2)}${path('M-15,0 C-15,20 15,20 15,0Z', PAL.copper, 1.9)}${path('M-16,-2 L16,-2 L16,2.5 L-16,2.5Z', PAL.ivoryB, 1.4)}</g>`,
  },
  dholaki: {
    reachF: [50, -30], reachB: [14, -34],
    front: `<g transform="translate(20,-28) rotate(4)">${path('M-28,-13 C-32,-4 -32,4 -28,13 L28,13 C32,4 32,-4 28,-13Z', '#8a3b1f', 2)}${line('M-26,-12 L26,12 M-26,12 L26,-12 M-9,-12 L9,12 M-9,12 L9,-12', PAL.ivoryB, 1.1)}${path('M-32,-14 L-25,-14 L-25,14 L-32,14Z', PAL.ivoryB, 1.6)}${path('M25,-14 L32,-14 L32,14 L25,14Z', PAL.ivoryB, 1.6)}</g>`,
  },
  jhyali: { propF: cymbal(-70), propB: cymbal(70), reachF: [50, -84], reachB: [30, -88] },
};

/** A panche baja musician (Damai) in white jama, red patuka and pagri. */
export function createMusician(instrument = 'damaha', opts = {}) {
  const I = INSTR[instrument] || INSTR.damaha;
  const fig = createMan({
    kind: 'musician', top: 'jama', topi: 'pagri', daura: '#f3ede1', dauraB: '#dcd3c0', sash: PAL.verm, shoes: '#3b2a1c',
    propF: I.propF, propB: I.propB, headProp: I.headProp, body: I.body, front: I.front, rest: I.rest, ...opts,
  });
  if (I.reachF) fig.reach('F', ...I.reachF, 1, fig.rest);
  if (I.reachB) fig.reach('B', ...I.reachB, 1, fig.rest);
  fig.instrument = instrument;
  fig.reachF = I.reachF; fig.reachB = I.reachB;
  fig.reset();
  return fig;
}

/** Playing motion for a musician at time t (seconds). Call after walk(…, arms=false). */
export function play(fig, t) {
  const p = fig.pose;
  const a = t * TAU;
  const [fx, fy] = fig.reachF || [0, 0];
  const [bx, by] = fig.reachB || [0, 0];
  switch (fig.instrument) {
    case 'damaha': fig.reach('F', fx, fy - 14 * Math.max(0, Math.sin(a * 1.5))); fig.reach('B', bx, by); break;
    case 'tyamko': fig.reach('F', fx, fy - 9 * Math.max(0, Math.sin(a * 3))); fig.reach('B', bx, by - 9 * Math.max(0, -Math.sin(a * 3))); break;
    case 'dholaki': fig.reach('F', fx + 3 * Math.sin(a * 2.4), fy - 5 * Math.max(0, Math.sin(a * 2.4))); fig.reach('B', bx, by - 5 * Math.max(0, Math.sin(a * 2.4 + 2))); break;
    case 'jhyali': { const c = (1 - Math.cos(a * 1.5)) * 0.5; fig.reach('F', fx + 7 * c, fy + 2 * c); fig.reach('B', bx - 4 * c, by - 2 * c); break; }
    default: fig.reach('F', fx, fy); fig.reach('B', bx, by);
  }
  if (fig.instrument === 'shehnai' || fig.instrument === 'narsingha') p.lean = (fig.rest.lean || 0) + 1.5 * Math.sin(a * 0.5);
  fig.apply();
}

/**
 * A Nepali couple dance (one figure). Arms trade places in a slow wave: one rises
 * in a soft curve while the other opens to the side; wrists turn, the body sways.
 * Targets are relative to each shoulder and scaled to the arm, so no joint ever
 * over-stretches or separates. `ph` offsets partners; `k` is the intensity.
 */
export function dance(fig, t, ph = 0, k = 1) {
  const w = t * TAU * 0.32 + ph;          // one slow phrase every ~3 s
  const s = Math.sin(w), c = Math.cos(w);
  const m = 0.5 - 0.5 * Math.cos(w);      // eased 0→1→0 (rests at both ends)
  const R = fig.dims.upper - 3 + fig.dims.fore + 7;
  const at = (side, ox, oy) => { const [x, y] = fig.at[`arm${side}`]; fig.reach(side, x + ox * R, y + oy * R); };
  // weight shifts from foot to foot with a small step, hips sway
  fig.walk(w / TAU, 0.22 * k, false);
  fig.pose.bob = -2.2 * Math.abs(s) * k;
  fig.pose.lean = (fig.rest.lean || 0) + 2.6 * s * k;
  // arms: front hand travels from chest height up to eye level in an arc; back hand answers behind
  at('F', 0.6 + 0.04 * m, 0.04 - 0.46 * m);
  at('B', -0.5 - 0.1 * (1 - m), 0.3 - 0.4 * (1 - m));
  // wrists turn (the hasta flourish), head follows the front hand
  fig.pose.handF = -30 + 40 * m;
  fig.pose.handB = 20 - 30 * (1 - m);
  fig.pose.head = (fig.rest.head || 0) - 4 * m * k + 2;
  return fig.apply();
}

/* ───────────────────────── defs (patterns) ───────────────────────── */

/** SVG <defs> content the figures need. Insert once per document. */
export function figureDefs() {
  return `
  <pattern id="ch-dhaka" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-6)">
    <rect width="9" height="9" fill="#9c2318"/>
    <path d="M4.5,0 L9,4.5 L4.5,9 L0,4.5Z" fill="#1c1611"/>
    <path d="M4.5,1.9 L7.1,4.5 L4.5,7.1 L1.9,4.5Z" fill="#f1e6cc"/>
    <path d="M4.5,3.3 L5.7,4.5 L4.5,5.7 L3.3,4.5Z" fill="#e5a52a"/>
    <path d="M0,0 L1.6,0 L0,1.6Z M9,0 L7.4,0 L9,1.6Z M0,9 L1.6,9 L0,7.4Z M9,9 L7.4,9 L9,7.4Z" fill="#2e7b3c"/>
  </pattern>
  <pattern id="ch-butti" width="13" height="15" patternUnits="userSpaceOnUse">
    <circle cx="3" cy="4" r="1.15" fill="#e8b84a"/>
    <circle cx="9.5" cy="11.5" r="1.15" fill="#e8b84a"/>
    <path d="M3,1.6 L3,2.4 M3,5.6 L3,6.4 M1.4,4 L2.2,4 M3.8,4 L4.6,4" stroke="#e8b84a" stroke-width=".5"/>
  </pattern>
  <pattern id="ch-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
    <path d="M0,0 L0,4" stroke="#f1e6cc" stroke-width=".55" opacity=".5"/>
  </pattern>`;
}
