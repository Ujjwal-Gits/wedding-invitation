// Procedural Newar architecture: pagoda tiers with carved struts and tiled
// roofs, the Nyatapola's five terraces and stair, the palace of 55 windows,
// the Golden Gate, Vatsala Durga's stone shikhara, Chyasilin Mandap,
// Bhairabnath, and the brick houses around the square. Every piece is added
// to a Builder by material, so the whole square is a few dozen draw calls.
import * as THREE from 'three';
import { box, cyl, lathe, place, rng, v3, TAU } from './geo.js';

const { Vector3, Matrix4, Quaternion } = THREE;
const UP = new Vector3(0, 1, 0);
const m4 = (x, y, z, ry = 0) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(UP, ry), new Vector3(1, 1, 1));
const xf = (g, m) => g.applyMatrix4(m);

// ───────────────────────── small parts ─────────────────────────
/** Plane with 0..1 UVs, facing +z, base-centred at the origin. */
function quad(w, h, z = 0, y0 = 0) {
  const g = new THREE.PlaneGeometry(w, h);
  g.translate(0, y0 + h / 2, z);
  return g;
}

/** A carved Newar window or door in a wall, local frame: base-centre, facing +z. */
export function newarWindow(B, m, { w = 1.1, h = 1.3, door = false, torana = false, ears = 0.3, depth = 0.2, lattice = !door } = {}) {
  const fw = door ? 0.2 : 0.13;
  // the dark opening behind
  // opening and lattice sit proud of the wall plane (never coplanar: no z-fighting at distance)
  B.add('window', xf(quad(w, h, 0.012), m), { uv: 'keep' });
  if (lattice) B.add('lattice', xf(quad(w, h, 0.05), m), { uv: 'keep' });
  else B.add('dark', xf(box(w, h, 0.03, 0, 0, 0.025), m), { color: '#3A2A20' });
  // jambs, sill and lintel with the characteristic projecting ears
  for (const s of [-1, 1]) B.add('wood', xf(box(fw, h, depth, s * (w / 2 + fw / 2), 0, -depth / 2 + 0.06), m));
  B.add('wood', xf(box(w + 2 * fw + 2 * ears, 0.15, depth + 0.04, 0, -0.15, -depth / 2 + 0.08), m));
  B.add('wood', xf(box(w + 2 * fw + 2 * ears, 0.16, depth + 0.04, 0, h, -depth / 2 + 0.08), m));
  B.add('wood', xf(box(w + 2 * fw + ears, 0.09, depth, 0, h + 0.16, -depth / 2 + 0.1), m));
  if (torana) {
    const r = w * 0.5 + fw;
    const g = new THREE.CylinderGeometry(r, r, 0.1, 20, 1, false, -Math.PI / 2, Math.PI);
    g.rotateX(Math.PI / 2);
    g.translate(0, h + 0.25, 0.02);
    B.add('woodPaint', xf(g, m), { color: '#B08A62' });
    // gilt finial point on the torana
    B.add('gilt', xf(cyl(0.0, 0.06, 0.22, 6, 0, h + 0.25 + r - 0.04, 0.03), m));
  }
}

/** A long carved wooden band (cornice), with a bead course below. */
function cornice(B, m, len, { h = 0.32, depth = 0.34, beads = true, key = 'wood' } = {}) {
  B.add(key, xf(box(len, h, depth, 0, 0, depth / 2 - 0.12), m));
  if (beads) {
    const n = Math.floor(len / 0.22);
    for (let i = 0; i < n; i++) B.add(key, xf(box(0.11, 0.1, 0.12, -len / 2 + (i + 0.5) * (len / n), -0.1, depth - 0.18), m));
  }
}

/** Struts (tunala) from a wall face up to the underside of a roof. */
function strut(B, p0, p1, w = 0.26, t = 0.16) {
  const d = p1.clone().sub(p0);
  const L = d.length();
  const g = new THREE.BoxGeometry(w, L, t);
  g.translate(0, L / 2, 0);
  const q = new Quaternion().setFromUnitVectors(UP, d.normalize());
  g.applyQuaternion(q);
  g.translate(p0.x, p0.y, p0.z);
  B.add('strut', g, { uv: 'keep' });
}

/** Gilt pinnacle (gajur): bell, stacked rings, spire. */
export function gajur(B, x, y, z, s = 1) {
  const P = [[0.0, 0], [0.75, 0], [0.8, 0.12], [0.55, 0.26], [0.62, 0.48], [0.4, 0.66], [0.5, 0.8], [0.28, 1.08], [0.36, 1.2], [0.17, 1.44], [0.24, 1.56], [0.1, 1.86], [0.16, 1.98], [0.04, 2.4], [0, 2.6]];
  B.add('gilt', lathe(P.map(([r, h]) => [r * s, h * s]), 14, x, y, z));
  // the little umbrella (chhatra)
  B.add('gilt', place(new THREE.ConeGeometry(0.42 * s, 0.22 * s, 12, 1, true), x, y + 1.66 * s, z));
}

export const QUALITY = { bellSpacing: 1 };
/** Small brass bells hanging along a roof edge. */
function eaveBells(B, pts, spacing = 0.7) {
  spacing *= QUALITY.bellSpacing;
  const bell = [[0, 0.16], [0.06, 0.14], [0.07, 0.05], [0.09, 0], [0, 0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const n = Math.max(1, Math.floor(a.distanceTo(b) / spacing));
    for (let k = 0; k < n; k++) {
      const p = a.clone().lerp(b, (k + 0.5) / n);
      B.add('gilt', lathe(bell, 5, p.x, p.y - 0.34, p.z));
      B.add('gilt', box(0.012, 0.18, 0.012, p.x, p.y - 0.2, p.z));
    }
  }
}

// ───────────────────────── roofs ─────────────────────────
/**
 * Hipped roof between an eave rectangle (w0×d0 at y) and a top rectangle (w1×d1 at y+h).
 * d1 = 0 gives a ridge, w1 = d1 = 0 a pyramid. Adds the tiled top, the wooden
 * underside, the fascia board and returns the eave corner points (for bells).
 */
export function hipRoof(B, { x = 0, z = 0, y, h, w0, d0, w1, d1, ry = 0, key = 'roof', seg = 5, flare = 0.22, fascia = 'wood', fasciaColor, under = true, tile = 1.8, mat = null }) {
  const m = mat ? mat.clone().multiply(m4(x, y, z, ry)) : m4(x, y, z, ry);
  const c0 = [[-w0 / 2, -d0 / 2], [w0 / 2, -d0 / 2], [w0 / 2, d0 / 2], [-w0 / 2, d0 / 2]];
  const c1 = [[-w1 / 2, -d1 / 2], [w1 / 2, -d1 / 2], [w1 / 2, d1 / 2], [-w1 / 2, d1 / 2]];
  const prof = (t) => h * (t * (1 - flare) + flare * t * t);
  const top = [], bot = [];
  const pos = [], uvs = [], posU = [];
  for (let s = 0; s < 4; s++) {
    const a0 = c0[s], b0 = c0[(s + 1) % 4], a1 = c1[s], b1 = c1[(s + 1) % 4];
    const edgeLen = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]);
    const mid0 = [(a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2], mid1 = [(a1[0] + b1[0]) / 2, (a1[1] + b1[1]) / 2];
    const slope = Math.hypot(Math.hypot(mid1[0] - mid0[0], mid1[1] - mid0[1]), h);
    const tx = (b0[0] - a0[0]) / edgeLen, tz = (b0[1] - a0[1]) / edgeLen;
    const P = (u, t) => {
      const ax = a0[0] + (a1[0] - a0[0]) * t, az = a0[1] + (a1[1] - a0[1]) * t;
      const bx = b0[0] + (b1[0] - b0[0]) * t, bz = b0[1] + (b1[1] - b0[1]) * t;
      const px = ax + (bx - ax) * u, pz = az + (bz - az) * u;
      return [px, prof(t), pz, ((px - mid0[0]) * tx + (pz - mid0[1]) * tz) / tile, (t * slope) / tile];
    };
    for (let r = 0; r < seg; r++) {
      const t0 = r / seg, t1 = (r + 1) / seg;
      const q = [P(0, t0), P(1, t0), P(1, t1), P(0, t1)];
      for (const [i, j, k] of [[0, 1, 2], [0, 2, 3]]) {
        for (const v of [q[i], q[k], q[j]]) { pos.push(v[0], v[1], v[2]); uvs.push(v[3], v[4]); }
        for (const v of [q[i], q[j], q[k]]) posU.push(v[0], v[1] - 0.16, v[2]);
      }
    }
    top.push(v3(a0[0], 0, a0[1]).applyMatrix4(m));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  // winding: make the tiled side face up
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) {
    const p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; }
    const u = g.attributes.uv.array;
    for (let i = 0; i < u.length; i += 6) for (let k = 0; k < 2; k++) { const t = u[i + 2 + k]; u[i + 2 + k] = u[i + 4 + k]; u[i + 4 + k] = t; }
    g.computeVertexNormals();
  }
  B.add(key, xf(g, m), { uv: 'keep' });
  if (under) {
    const gu = new THREE.BufferGeometry();
    gu.setAttribute('position', new THREE.Float32BufferAttribute(posU, 3));
    gu.computeVertexNormals();
    if (gu.attributes.normal.getY(0) > 0) {
      const p = gu.attributes.position.array;
      for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; }
      gu.computeVertexNormals();
    }
    B.add('wood', xf(gu, m), { color: '#7A6A60', uv: 1.2 });
  }
  // fascia board around the eave
  if (fascia) {
    for (let s = 0; s < 4; s++) {
      const a = c0[s], b = c0[(s + 1) % 4];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ang = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
      const fb = box(len + 0.12, 0.2, 0.08, 0, -0.14, 0);
      place(fb, (a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2, 0, ang, 0);
      // push the board outward a touch
      B.add(fascia, xf(fb, m), { color: fasciaColor });
    }
  }
  return top; // eave corners in world space
}

/** Regular n-gon roof (octagonal pavilions). */
export function polyRoof(B, { x, z, y, h, n = 8, r0, r1, key = 'roof', rot = Math.PI / 8 }) {
  const pos = [], uvs = [], posU = [];
  const tile = 1.8;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * TAU, a1 = rot + ((i + 1) / n) * TAU;
    const A = [Math.cos(a0), Math.sin(a0)], Bv = [Math.cos(a1), Math.sin(a1)];
    const P = (u, t) => {
      const r = r0 + (r1 - r0) * t;
      const px = (A[0] + (Bv[0] - A[0]) * u) * r, pz = (A[1] + (Bv[1] - A[1]) * u) * r;
      return [px, h * (t * 0.8 + 0.2 * t * t), pz, (u - 0.5) * 2 * r * Math.sin(Math.PI / n) / tile, t * Math.hypot(r0 - r1, h) / tile];
    };
    const seg = 4;
    for (let k = 0; k < seg; k++) {
      const q = [P(0, k / seg), P(1, k / seg), P(1, (k + 1) / seg), P(0, (k + 1) / seg)];
      for (const [i1, j1, k1] of [[0, 2, 1], [0, 3, 2]]) {
        for (const v of [q[i1], q[j1], q[k1]]) { pos.push(v[0] + x, v[1] + y, v[2] + z); uvs.push(v[3], v[4]); }
        for (const v of [q[i1], q[k1], q[j1]]) posU.push(v[0] + x, v[1] + y - 0.16, v[2] + z);
      }
    }
    pts.push(v3(A[0] * r0 + x, y, A[1] * r0 + z));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  B.add(key, g, { uv: 'keep' });
  const gu = new THREE.BufferGeometry();
  gu.setAttribute('position', new THREE.Float32BufferAttribute(posU, 3));
  gu.computeVertexNormals();
  B.add('wood', gu, { color: '#7A6A60', uv: 1.2 });
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const len = a.distanceTo(b);
    const fb = box(len + 0.06, 0.2, 0.08, 0, -0.14, 0);
    place(fb, (a.x + b.x) / 2, y, (a.z + b.z) / 2, 0, Math.atan2(-(b.z - a.z), b.x - a.x), 0);
    B.add('wood', fb);
  }
  pts.push(pts[0].clone());
  return pts;
}

// ───────────────────────── pagodas ─────────────────────────
/**
 * Square multi-roofed temple. tiers: [{ w, h, eave, struts, colonnade? }], from the bottom.
 * Returns the apex height. The front (doors) faces +z rotated by ry.
 */
export function pagoda(B, { x = 0, y = 0, z = 0, tiers, pitch = 30, topPitch = 36, gajurScale = 1, bells = true, ry = 0, roofKey = 'roof' }) {
  let yb = y;
  const tanP = Math.tan(THREE.MathUtils.degToRad(pitch));
  const center = v3(x, 0, z);
  const dir = (k) => { const a = ry + (k * Math.PI) / 2; return [v3(Math.sin(a), 0, Math.cos(a)), v3(Math.cos(a), 0, -Math.sin(a)), a]; };
  for (let i = 0; i < tiers.length; i++) {
    const T = tiers[i];
    const next = tiers[i + 1];
    const half = T.w / 2;
    // body
    if (T.colonnade) {
      const cella = T.w - 2 * T.colonnade;
      B.add('brick', box(cella, T.h, cella, x, yb, z, ry), { color: '#F2DCD0' });
      B.add('stone', box(T.w + 0.3, 0.22, T.w + 0.3, x, yb, z, ry));
      // pillars on all four sides
      const n = T.pillars || 5;
      for (let k = 0; k < 4; k++) {
        const [nrm, tan] = dir(k);
        for (let j = 0; j <= n; j++) {
          const s = -half + 0.2 + ((T.w - 0.4) * j) / n;
          const p = center.clone().addScaledVector(nrm, half - 0.25).addScaledVector(tan, s);
          B.add('wood', box(0.3, T.h - 0.5, 0.3, p.x, yb + 0.22, p.z, ry));
          B.add('wood', box(0.5, 0.18, 0.5, p.x, yb + 0.22, p.z, ry));
          B.add('wood', box(0.56, 0.2, 0.36, p.x, yb + T.h - 0.48, p.z, ry));
        }
        // doors in the cella
        const dm = m4(...center.clone().addScaledVector(nrm, cella / 2 + 0.02).toArray(), dir(k)[2]);
        dm.elements[13] = yb + 0.25;
        newarWindow(B, dm, { w: 1.3, h: 2.2, door: true, torana: true, ears: 0.25 });
      }
      // beam on the pillars
      for (let k = 0; k < 4; k++) {
        const [nrm, , a] = dir(k);
        const p = center.clone().addScaledVector(nrm, half - 0.25);
        const mm = m4(p.x, yb + T.h - 0.3, p.z, a);
        cornice(B, mm, T.w + 0.2, { h: 0.3, depth: 0.36 });
      }
    } else {
      if (T.wood) B.add('woodPaint', box(T.w, T.h, T.w, x, yb, z, ry), { color: '#5A3E2C', dark: { top: 0.5 } });
      else B.add('brick', box(T.w, T.h, T.w, x, yb, z, ry), { color: '#F2DCD0', dark: { top: 0.45 } });
      for (let k = 0; k < 4; k++) {
        const [nrm, tan, a] = dir(k);
        const p = center.clone().addScaledVector(nrm, half);
        cornice(B, m4(p.x, yb, p.z, a), T.w + 0.24, { h: 0.26, depth: 0.26, beads: false });
        cornice(B, m4(p.x, yb + T.h - 0.36, p.z, a), T.w + 0.24, { h: 0.36, depth: 0.3 });
        const wins = T.windows ?? 1;
        const ww = T.wood ? (T.w - 1.0) / wins - 0.3 : Math.min(0.95, (T.w - 1.2) / (wins * 1.7));
        for (let j = 0; j < wins; j++) {
          const s = (j - (wins - 1) / 2) * (T.w / (wins + 0.6));
          const q = p.clone().addScaledVector(tan, s);
          newarWindow(B, m4(q.x, yb + Math.max(0.42, T.h * 0.28), q.z, a), { w: ww, h: Math.min(1.05, T.h * (T.wood ? 0.46 : 0.42)), ears: T.wood ? 0.06 : 0.18 });
        }
      }
    }
    // roof
    const topW = next ? next.w : 0;
    const eaveY = yb + T.h - (T.drop ?? 0.4);
    const rise = next ? ((T.eave - topW) / 2) * tanP : (T.eave / 2) * Math.tan(THREE.MathUtils.degToRad(topPitch));
    const corners = hipRoof(B, { x, z, y: eaveY, h: rise, w0: T.eave, d0: T.eave, w1: topW, d1: topW, ry, key: roofKey });
    if (bells) eaveBells(B, [...corners, corners[0]], 0.62);
    // struts: wall (or beam) face → under the roof near the eave
    const a0 = T.eave / 2, a1 = topW / 2;
    const roofY = (s) => eaveY + ((a0 - s) / (a0 - a1)) * rise * 0.8 - 0.2;
    const ns = T.struts ?? 4;
    const sTop = a0 - 0.75;
    const dx = sTop - half;
    const dy = dx * Math.tan(THREE.MathUtils.degToRad(58));
    for (let k = 0; k < 4; k++) {
      const [nrm, tan] = dir(k);
      for (let j = 0; j < ns; j++) {
        const s = -half + 0.5 + ((T.w - 1.0) * j) / Math.max(1, ns - 1);
        const top = center.clone().addScaledVector(nrm, sTop).addScaledVector(tan, s * (sTop / half) * 0.94);
        top.y = roofY(sTop);
        const bot = center.clone().addScaledVector(nrm, half + 0.12).addScaledVector(tan, s);
        bot.y = top.y - dy;
        strut(B, bot, top);
      }
      // corner strut (winged griffin) on the diagonal
      const dg = nrm.clone().add(tan).normalize();
      const cb = center.clone().addScaledVector(dg, half * Math.SQRT2 + 0.1);
      const ct = center.clone().addScaledVector(dg, (sTop) * Math.SQRT2 * 0.98);
      ct.y = roofY(sTop) - 0.05; cb.y = ct.y - dy * 1.15;
      strut(B, cb, ct, 0.24, 0.18);
    }
    yb = next ? eaveY + rise : eaveY + rise;
  }
  gajur(B, x, yb - 0.05, z, gajurScale);
  return yb + 2.6 * gajurScale;
}

// ───────────────────────── Nyatapola ─────────────────────────
export const NYATAPOLA = {
  sizes: [25, 21.4, 17.8, 14.2, 10.8],
  th: 1.95,
  stairW: 3.5,
};
/** Terraces + stair + temple. Front faces +z. Returns guardian placements and key heights. */
export function nyatapola(B, { x = 0, z = 0 }) {
  const { sizes, th, stairW } = NYATAPOLA;
  const top = th * sizes.length;
  sizes.forEach((s, k) => {
    const y = k * th;
    B.add('plinth', box(s, th - 0.16, s, x, y, z), { color: '#E9C2B4', dark: { base: 0.3 } });
    // stone coping on each terrace edge
    B.add('step', box(s + 0.12, 0.16, s + 0.12, x, y + th - 0.16, z));
    // a dark base course
    B.add('step', box(s + 0.08, 0.22, s + 0.08, x, y, z), { color: '#B9B0A2' });
  });
  // stair: a straight flight that meets every terrace at its front edge
  const run = (sizes[0] - sizes[1]) / 2;
  const r = run / th;
  const zs = z + sizes[0] / 2 + run;
  const nSteps = Math.round(top / 0.215);
  const rise = top / nSteps;
  for (let i = 0; i < nSteps; i++) {
    const zf = zs - i * rise * r;
    B.add('step', box(stairW, rise * (i + 1), rise * r + 0.02, x, 0, zf - (rise * r) / 2), { color: i % 2 ? '#C7BEB0' : '#CFC6B8' });
  }
  // side walls of the stair (stepped, brick with stone caps) and guardian pedestals
  const guards = [];
  for (let k = 0; k < sizes.length; k++) {
    const yk = (k + 1) * th; // top of terrace k
    const zf = z + sizes[k] / 2; // its front edge
    for (const s of [-1, 1]) {
      const px = x + s * (stairW / 2 + 0.85);
      // pedestal: brick block with stone cap, on the terrace below the guardian
      B.add('step', box(1.6, 0.9, 1.75, px, yk - th, zf + run / 2 + 0.05), { color: '#C4BBAD' });
      B.add('step', box(1.75, 0.14, 1.9, px, yk - th + 0.9, zf + run / 2 + 0.05));
      guards.push({ level: k, side: s, pos: v3(px + s * 0.05, yk - th + 1.04, zf + run / 2 + 0.05) });
    }
    // stair cheek walls along this flight segment
    for (const s of [-1, 1]) {
      const px = x + s * (stairW / 2 + 0.14);
      const g = new THREE.BoxGeometry(0.28, 0.5, Math.hypot(run, th) + 0.1);
      g.rotateX(Math.atan2(th, run));
      g.translate(px, yk - th / 2 + 0.25, zf + run / 2);
      B.add('step', g, { color: '#B8AFA1' });
    }
  }
  return { top, guards, stairFront: zs };
}

/** Tiers of the Nyatapola temple above the terraces. */
// proportions taken from frontal photographs: a deep first roof, short carved-wood storeys between
// shallow roofs, and a low top roof with a modest pinnacle
export const NYATAPOLA_TIERS = [
  { w: 9.4, h: 3.3, eave: 16.2, struts: 7, colonnade: 1.15, pillars: 6, drop: 0.25 },
  { w: 7.2, h: 1.7, eave: 13.2, struts: 6, windows: 5, wood: true },
  { w: 6.1, h: 1.5, eave: 11.2, struts: 5, windows: 5, wood: true },
  { w: 5.2, h: 1.4, eave: 9.4, struts: 4, windows: 3, wood: true },
  { w: 4.4, h: 1.3, eave: 7.8, struts: 4, windows: 3, wood: true },
];

// ───────────────────────── palace of 55 windows ─────────────────────────
/**
 * The palace façade runs along z (from z0 to z1) at x = fx, facing +x.
 * Returns the wall spots where the portrait frames hang and key heights.
 */
export function palace55(B, { fx, z0, z1, depth = 13 }) {
  const L = z0 - z1; // z0 > z1
  const zc = (z0 + z1) / 2;
  const a = Math.PI / 2; // facing +x
  const plinthH = 0.7, g0 = plinthH, g1 = g0 + 3.7, f1 = g1 + 0.36, f2 = f1 + 3.3, gal0 = f2 + 0.42, gal1 = gal0 + 2.75;
  const bx = fx - depth / 2;
  B.add('step', box(depth + 1.0, plinthH, L + 0.6, bx + 0.5, 0, zc));
  B.add('brick', box(depth, g1 - g0, L, bx, g0, zc), { dark: { top: 0.25, base: 0.3 } });
  B.add('brick', box(depth, f2 - f1, L, bx, f1, zc), { dark: { top: 0.4 } });
  B.add('wood', box(depth - 1.5, gal1 - f2 + 0.4, L - 0.2, bx - 0.5, f2, zc));
  // cornices
  cornice(B, m4(fx, g1, zc, a), L + 0.2, { h: 0.36, depth: 0.38 });
  cornice(B, m4(fx, f2, zc, a), L + 0.2, { h: 0.42, depth: 0.42 });
  cornice(B, m4(fx, g0 - 0.02, zc, a), L, { h: 0.18, depth: 0.2, beads: false });
  // ground floor: doors with a gap between, where the portraits hang
  const spots = [];
  const doorZ = [];
  const bays = 6;
  for (let i = 0; i <= bays; i++) doorZ.push(z0 - 0.6 - i * ((L - 1.2) / bays));
  doorZ.forEach((dz, i) => {
    const small = i % 2 === 1;
    newarWindow(B, m4(fx + 0.02, g0 + 0.1, dz, a), small ? { w: 0.9, h: 1.1, ears: 0.2 } : { w: 1.05, h: 2.15, door: true, ears: 0.2 });
  });
  for (let i = 0; i < bays; i++) spots.push((doorZ[i] + doorZ[i + 1]) / 2);
  // first floor: carved windows with their hoods, photographed from the real palace (alpha cut-outs)
  const nw = 11;
  for (let i = 0; i < nw; i++) {
    const wz = z0 - 1.6 - i * ((L - 3.2) / (nw - 1));
    const g = new THREE.PlaneGeometry(2.95, 2.2);
    g.rotateY(Math.PI / 2);
    g.translate(fx + 0.03, f1 + 0.2 + 1.1, wz);
    B.add('carved', g, { uv: 'keep' });
  }
  // the gallery of 55 windows: projecting floor on corbels, and the carved gallery face itself
  // (rectified from a photograph of the real gallery, repeated along the façade)
  const proj = 0.95;
  const gx = fx + proj;
  B.add('wood', box(proj + 0.4, 0.3, L + 0.4, fx + proj / 2, gal0 - 0.95, zc));
  for (let i = 0; i < 28; i++) {
    const cz = z0 - 0.5 - i * ((L - 1) / 27);
    const g = new THREE.BoxGeometry(proj + 0.2, 0.4, 0.18);
    g.translate(fx + (proj + 0.2) / 2 - 0.05, gal0 - 1.25, cz);
    B.add('wood', g);
  }
  {
    const gy0 = gal0 - 0.65, gh = gal1 - gy0;
    const rep = gh * (1792 / 640);
    const g = new THREE.PlaneGeometry(L + 0.4, gh);
    g.rotateY(Math.PI / 2);
    g.translate(gx + 0.02, gy0 + gh / 2, zc);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * ((L + 0.4) / rep));
    B.add('galleryFace', g, { uv: 'keep' });
    // dark returns at the gallery's two ends and its soffit
    B.add('wood', box(proj + 0.1, gh, 0.12, fx + proj / 2, gy0, z0 + 0.2));
    B.add('wood', box(proj + 0.1, gh, 0.12, fx + proj / 2, gy0, z1 - 0.2));
    B.add('dark', box(proj, 0.06, L + 0.3, fx + proj / 2, gal1 - 0.05, zc), { color: '#2A1E17' });
  }
  // roof over the whole building, deep eave with struts
  const eaveOut = 2.5;
  const eaveY = gal1 - 0.15;
  const ridgeY = eaveY + (depth / 2 + eaveOut) * Math.tan(THREE.MathUtils.degToRad(29));
  hipRoof(B, { x: bx, z: zc, y: eaveY, h: ridgeY - eaveY, w0: depth + 2 * eaveOut, d0: L + 2 * eaveOut, w1: 0.6, d1: L - 4, key: 'roofMoss', fascia: 'paint', fasciaColor: '#7E2A22', under: true });
  {
    // cloth fringe along the façade eave
    const len = L + 2 * eaveOut;
    const g = new THREE.PlaneGeometry(len, 0.5);
    g.rotateY(Math.PI / 2);
    g.translate(fx + eaveOut + 0.06, eaveY - 0.32, zc);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / 2));
    B.add('fringe', g, { uv: 'keep' });
  }
  for (let i = 0; i < 30; i++) {
    const sz = z0 - 0.8 - i * ((L - 1.6) / 29);
    strut(B, v3(gx + 0.1, gal1 - 0.9, sz), v3(fx + eaveOut - 0.65, eaveY + 0.08, sz), 0.15, 0.12);
  }
  return { spots, wallY: g0, groundTop: g1, gal0, gal1, eaveY, ridgeY };
}

// ───────────────────────── Golden Gate (Sun Dhoka) ─────────────────────────
/**
 * The gate's red wall with its gilded torana is a rectified photograph of the
 * real gate (CC0), cut around a real doorway; roof, crest and finials are modelled.
 * Faces +z rotated by ry. W×H are the wall's metres.
 */
export const GATE = { W: 6.3, H: 6.1, D: 2.6, door: { u0: 0.372, u1: 0.62, v1: 0.532 } };
export function goldenGate(B, { x, z, ry = 0 }) {
  const { W, H, D, door } = GATE;
  const m = m4(x, 0, z, ry);
  // the photographed face, as 4 pieces around the door opening
  const face = (u0, u1, v0, v1) => {
    const g = new THREE.PlaneGeometry((u1 - u0) * W, (v1 - v0) * H);
    g.translate(((u0 + u1) / 2 - 0.5) * W, ((v0 + v1) / 2) * H, D / 2 + 0.025);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    B.add('gateFace', xf(g, m), { uv: 'keep' });
  };
  face(0, door.u0, 0, 1);
  face(door.u1, 1, 0, 1);
  face(door.u0, door.u1, door.v1, 1);
  // wall body (painted red brick) and the passage through it
  const dw = (door.u1 - door.u0) * W, dh = door.v1 * H, dx = ((door.u0 + door.u1) / 2 - 0.5) * W;
  const lw = (dx - dw / 2) + W / 2, rw = W / 2 - (dx + dw / 2);
  B.add('brick', xf(box(lw, H, D, -W / 2 + lw / 2, 0, 0), m), { color: '#D88A74' });
  B.add('brick', xf(box(rw, H, D, W / 2 - rw / 2, 0, 0), m), { color: '#D88A74' });
  B.add('brick', xf(box(dw, H - dh, D, dx, dh, 0), m), { color: '#D88A74' });
  B.add('stone', xf(box(dw, 0.12, D, dx, 0, 0), m));
  // gilt reveal of the doorway
  for (const s of [-1, 1]) B.add('gilt', xf(box(0.08, dh, D - 0.1, dx + s * (dw / 2 - 0.04), 0, 0), m));
  B.add('gilt', xf(box(dw, 0.08, D - 0.1, dx, dh - 0.08, 0), m));
  // the courtyard glimpsed through the door: a sunlit white wall
  B.add('stucco', xf(box(dw + 2, dh + 1.5, 0.2, dx, 0, -D / 2 - 3.2), m));
  // cornice line on top (the photo carries the beaded band; this adds depth)
  B.add('gilt', xf(box(W + 0.5, 0.2, D + 0.5, 0, H - 0.02, 0), m));
  // gilt roof with ribs and dragon ends
  const ry0 = H + 0.16;
  hipRoof(B, { y: ry0, h: 1.0, w0: W + 1.5, d0: D + 1.2, w1: W - 0.6, d1: 0.3, key: 'gilt', fascia: 'gilt', under: true, flare: 0.35, mat: m });
  for (let i = -3; i <= 3; i++) B.add('gilt', xf(cyl(0.05, 0.05, 1.25, 6, i * 1.05, 0, 0), new Matrix4().multiplyMatrices(m, new Matrix4().makeRotationX(-1.0).premultiply(new Matrix4().makeTranslation(0, ry0 + 0.05, D / 2 + 0.55)))));
  // crest: three finials and the arched toran of the roof
  const cy = ry0 + 1.0;
  B.add('gilt', xf(lathe([[0, 0], [0.32, 0], [0.36, 0.2], [0.22, 0.45], [0.28, 0.62], [0.12, 0.95], [0.16, 1.05], [0.03, 1.45], [0, 1.6]], 12), m4(0, 0, 0).premultiply(m).multiply(new Matrix4().makeTranslation(0, cy, 0))));
  for (const s of [-1, 1]) B.add('gilt', xf(lathe([[0, 0], [0.22, 0], [0.25, 0.14], [0.15, 0.3], [0.19, 0.42], [0.08, 0.68], [0, 0.95]], 10), new Matrix4().multiplyMatrices(m, new Matrix4().makeTranslation(s * 1.0, cy, 0))));
  const arc = new THREE.TorusGeometry(1.55, 0.07, 6, 28, Math.PI);
  B.add('gilt', xf(arc, new Matrix4().multiplyMatrices(m, new Matrix4().makeTranslation(0, cy, 0))));
  for (const s of [-1, 1]) B.add('gilt', xf(box(0.06, 1.9, 0.06, s * 2.2, cy - 0.1, 0), m));
  return { faceZ: D / 2, roofY: ry0, crestY: cy + 1.6 };
}

// ───────────────────────── stone shikhara (Vatsala Durga) ─────────────────────────
export function shikhara(B, { x, z, ry = 0, s = 1 }) {
  const steps = [[11.5, 0.7], [9.8, 0.7], [8.2, 0.7]];
  let y = 0;
  steps.forEach(([w, h]) => { B.add('stone', box(w * s, h * s, w * s, x, y, z, ry)); y += h * s; });
  // front stair
  const m = m4(x, 0, z, ry);
  for (let i = 0; i < 9; i++) B.add('step', xf(box(2.4 * s, (i + 1) * 0.233 * s, 0.32 * s, 0, 0, (8.2 / 2 + 1.6 - i * 0.3) * s), m));
  // shrine cube with a stone colonnade
  const cw = 5.6 * s, ch = 3.0 * s;
  B.add('stone', box(cw - 1.4 * s, ch, cw - 1.4 * s, x, y, z, ry), { color: '#D8D0C4' });
  for (let k = 0; k < 4; k++) {
    const a = ry + (k * Math.PI) / 2;
    const n = v3(Math.sin(a), 0, Math.cos(a)), t = v3(Math.cos(a), 0, -Math.sin(a));
    for (let j = 0; j < 4; j++) {
      const p = v3(x, 0, z).addScaledVector(n, cw / 2 - 0.25 * s).addScaledVector(t, (-1.5 + j) * (cw - 0.6 * s) / 3);
      B.add('stone', box(0.36 * s, ch, 0.36 * s, p.x, y, p.z, ry));
    }
  }
  B.add('stone', box(cw + 0.4 * s, 0.5 * s, cw + 0.4 * s, x, y + ch, z, ry));
  B.add('stone', box(cw - 0.2 * s, 0.4 * s, cw - 0.2 * s, x, y + ch + 0.5 * s, z, ry));
  const ty = y + ch + 0.9 * s;
  // the curvilinear tower (square section: a 4-sided lathe turned 45°)
  const prof = [[0, 0], [2.3, 0], [2.42, 0.6], [2.38, 1.8], [2.2, 3.2], [1.85, 4.6], [1.4, 5.8], [0.95, 6.7], [0.7, 7.1]].map(([r, h]) => [r * s * Math.SQRT2, h * s]);
  B.add('stone', lathe(prof, 4, x, ty, z, ry + Math.PI / 4), { color: '#DCD5CA', uv: 1.1, flat: true });
  // horizontal courses on the tower
  for (let i = 1; i < 8; i++) {
    const h = i * 0.85;
    let r = 0;
    for (let k = 1; k < prof.length; k++) if (prof[k][1] >= h * s) { const [r0, h0] = prof[k - 1], [r1, h1] = prof[k]; r = r0 + (r1 - r0) * ((h * s - h0) / (h1 - h0)); break; }
    B.add('stone', lathe([[0, 0], [r + 0.06 * s, 0], [r + 0.06 * s, 0.14 * s], [0, 0.14 * s]], 4, x, ty + h * s, z, ry + Math.PI / 4), { color: '#BDB4A6', flat: true });
  }
  // corner turrets
  for (let k = 0; k < 4; k++) {
    const a = ry + Math.PI / 4 + (k * Math.PI) / 2;
    const px = x + Math.sin(a) * (cw / 2) * Math.SQRT2 * 0.82, pz = z + Math.cos(a) * (cw / 2) * Math.SQRT2 * 0.82;
    B.add('stone', lathe(prof.map(([r, h]) => [r * 0.24, h * 0.32]), 4, px, ty, pz, ry + Math.PI / 4), { color: '#DCD5CA', uv: 1.1, flat: true });
    gajur(B, px, ty + 7.1 * s * 0.32, pz, 0.25 * s);
  }
  // amalaka and finial
  const ay = ty + 7.1 * s;
  B.add('stone', lathe([[0, 0], [0.9 * s, 0], [1.05 * s, 0.18 * s], [0.95 * s, 0.38 * s], [0.4 * s, 0.46 * s], [0, 0.46 * s]], 16, x, ay, z));
  gajur(B, x, ay + 0.45 * s, z, 0.8 * s);
  return { top: ay + 2.6 * s, base: y };
}

/** Taleju bell: two stone pillars, a small tiled roof and a bronze bell. */
export function bellPavilion(B, { x, z, ry = 0 }) {
  B.add('stone', box(4.2, 0.8, 2.4, x, 0, z, ry));
  const m = m4(x, 0, z, ry);
  for (const s of [-1, 1]) B.add('stone', xf(box(0.6, 3.6, 0.6, s * 1.4, 0.8, 0), m));
  B.add('wood', xf(box(3.6, 0.32, 0.5, 0, 4.4, 0), m));
  hipRoof(B, { x, z, y: 4.55, h: 1.0, w0: 4.6, d0: 2.6, w1: 1.2, d1: 0, ry, key: 'roof' });
  const bell = [[0, 0], [0.62, 0], [0.6, 0.12], [0.5, 0.5], [0.42, 1.0], [0.3, 1.25], [0.12, 1.32], [0, 1.32]];
  B.add('bronze', xf(lathe(bell, 20), new Matrix4().multiplyMatrices(m, new Matrix4().makeTranslation(0, 2.95, 0))));
  B.add('bronze', xf(box(0.1, 0.25, 0.1, 0, 4.25, 0), m));
}

// ───────────────────────── Chyasilin Mandap ─────────────────────────
export function chyasilin(B, { x, z }) {
  const R = 6.6;
  // octagonal brick plinth with stone coping and steps on four sides
  B.add('plinth', cyl(R, R, 1.05, 8, x, 0, z), { color: '#EAC8B6' });
  B.add('step', cyl(R + 0.12, R + 0.12, 0.14, 8, x, 1.05, z));
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    for (let i = 0; i < 4; i++) {
      const d = R + 0.9 - i * 0.3;
      B.add('step', box(2.4, (i + 1) * 0.27, 0.34, x + Math.sin(a) * d, 0, z + Math.cos(a) * d, a));
    }
  }
  const y0 = 1.19;
  // outer and inner colonnades
  const ring = (r, n, h, w) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.PI / 8;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      B.add('wood', box(w, h, w, px, y0, pz, -a));
      B.add('wood', box(w + 0.18, 0.2, w + 0.18, px, y0, pz, -a));
      B.add('wood', box(w + 0.3, 0.22, w + 0.1, px, y0 + h - 0.22, pz, -a));
    }
  };
  ring(5.0, 16, 3.0, 0.24);
  ring(3.0, 8, 3.0, 0.28);
  // beam ring
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * TAU + Math.PI / 8, a1 = ((i + 1) / 8) * TAU + Math.PI / 8;
    const p0 = v3(x + Math.cos(a0) * 5.0, 0, z + Math.sin(a0) * 5.0), p1 = v3(x + Math.cos(a1) * 5.0, 0, z + Math.sin(a1) * 5.0);
    const len = p0.distanceTo(p1);
    B.add('wood', box(len + 0.3, 0.36, 0.3, (p0.x + p1.x) / 2, y0 + 3.0, (p0.z + p1.z) / 2, Math.atan2(-(p1.z - p0.z), p1.x - p0.x)));
  }
  B.add('wood', cyl(3.15, 3.15, 0.3, 8, x, y0 + 3.0, z));
  // first roof
  const e1 = y0 + 3.2;
  const pts1 = polyRoof(B, { x, z, y: e1, h: 1.55, r0: 6.7, r1: 3.4, key: 'roofMoss', rot: 0 });
  eaveBells(B, pts1, 0.7);
  // upper storey: wooden octagon with lattice windows
  const y1 = e1 + 1.45;
  B.add('wood', cyl(3.3, 3.3, 2.3, 8, x, y1, z), { color: '#B8957A' });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8;
    const r = 3.3 * Math.cos(Math.PI / 8) + 0.01;
    newarWindow(B, m4(x + Math.sin(a) * r, y1 + 0.55, z + Math.cos(a) * r, a), { w: 1.25, h: 1.1, ears: 0.14 });
  }
  // struts for the first roof
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + Math.PI / 16;
    strut(B, v3(x + Math.cos(a) * 3.3, y1 - 1.1, z + Math.sin(a) * 3.3), v3(x + Math.cos(a) * 5.7, e1 + 0.12, z + Math.sin(a) * 5.7), 0.15, 0.12);
  }
  const e2 = y1 + 2.1;
  const pts2 = polyRoof(B, { x, z, y: e2, h: 1.8, r0: 4.6, r1: 0.25, key: 'roofMoss', rot: 0 });
  eaveBells(B, pts2, 0.7);
  gajur(B, x, e2 + 1.75, z, 0.6);
  return { top: e2 + 3.4 };
}

// ───────────────────────── Bhairabnath ─────────────────────────
export function bhairabnath(B, { x, z, ry = 0 }) {
  const m = m4(x, 0, z, ry);
  const P = (px, py, pz) => v3(px, py, pz).applyMatrix4(m);
  B.add('plinth', xf(box(19, 1.3, 12.5, 0, 0, 0), m), { color: '#EAC8B6' });
  B.add('step', xf(box(19.2, 0.14, 12.7, 0, 1.3, 0), m));
  for (let i = 0; i < 5; i++) B.add('step', xf(box(4, (i + 1) * 0.26, 0.4, 0, 0, 6.25 + 1.8 - i * 0.4), m));
  const y0 = 1.44;
  B.add('brick', xf(box(15.5, 4.0, 8.6, 0, y0, 0), m), { color: '#F2DCD0' });
  cornice(B, new Matrix4().multiplyMatrices(m, m4(0, y0 + 3.6, 4.3)), 15.8, { h: 0.4, depth: 0.36 });
  for (let i = -2; i <= 2; i++) newarWindow(B, new Matrix4().multiplyMatrices(m, m4(i * 2.9, y0 + 0.2, 4.31)), i === 0 ? { w: 1.4, h: 2.4, door: true, torana: true } : { w: 1.0, h: 1.6, door: true, ears: 0.2 });
  // the gilded tympanum/porch accent over the central door
  B.add('gilt', xf(box(1.9, 0.15, 0.25, 0, y0 + 2.62, 4.45), m));
  const e1 = y0 + 3.7;
  const c1 = hipRoof(B, { x, z, y: e1, h: 1.9, w0: 19.5, d0: 12.6, w1: 10.4, d1: 5.6, ry, key: 'roof' });
  eaveBells(B, [...c1, c1[0]], 0.65);
  const y1 = e1 + 1.9;
  B.add('brick', xf(box(10.4, 2.7, 5.6, 0, y1, 0), m), { color: '#F2DCD0' });
  cornice(B, new Matrix4().multiplyMatrices(m, m4(0, y1 + 2.3, 2.8)), 10.6, { h: 0.36, depth: 0.3 });
  for (let i = -3; i <= 3; i++) newarWindow(B, new Matrix4().multiplyMatrices(m, m4(i * 1.35, y1 + 0.7, 2.81)), { w: 0.9, h: 1.15, ears: 0.12 });
  for (let i = -1; i <= 1; i++) newarWindow(B, new Matrix4().multiplyMatrices(m, m4(i * 1.35, y1 + 0.7, -2.81)).multiply(new Matrix4().makeRotationY(Math.PI)), { w: 0.9, h: 1.15, ears: 0.12 });
  const e2 = y1 + 2.4;
  const c2 = hipRoof(B, { x, z, y: e2, h: 1.6, w0: 14.0, d0: 9.0, w1: 6.6, d1: 3.6, ry, key: 'roof' });
  eaveBells(B, [...c2, c2[0]], 0.65);
  const y2 = e2 + 1.6;
  B.add('brick', xf(box(6.6, 1.9, 3.6, 0, y2, 0), m), { color: '#F2DCD0' });
  for (let i = -1; i <= 1; i++) newarWindow(B, new Matrix4().multiplyMatrices(m, m4(i * 1.6, y2 + 0.45, 1.81)), { w: 0.8, h: 0.9, ears: 0.1 });
  const e3 = y2 + 1.6;
  const c3 = hipRoof(B, { x, z, y: e3, h: 2.0, w0: 9.8, d0: 6.6, w1: 6.0, d1: 0, ry, key: 'roof' });
  eaveBells(B, [...c3, c3[0]], 0.65);
  // a row of gilt pinnacles along the ridge
  for (let i = -3; i <= 3; i++) { const p = P(i * 1.0, e3 + 1.95, 0); gajur(B, p.x, p.y, p.z, i === 0 ? 0.55 : 0.36); }
  // struts on the long faces
  const sideStruts = (yWall, yRoof, halfD, halfW, out, n) => {
    for (const sd of [-1, 1]) for (let i = 0; i < n; i++) {
      const px = -halfW + 0.6 + (i * (2 * halfW - 1.2)) / (n - 1);
      strut(B, P(px, yWall, sd * (halfD + 0.12)), P(px * 1.05, yRoof, sd * (halfD + out)));
    }
  };
  sideStruts(y0 + 2.1, e1 + 0.02, 4.3, 7.75, 1.4, 11);
  sideStruts(y1 + 0.6, e2 - 0.02, 2.8, 5.2, 1.3, 7);
  sideStruts(y2 + 0.1, e3 - 0.02, 1.8, 3.3, 1.1, 5);
  return { top: e3 + 3.2, door: P(0, y0, 4.4) };
}

// ───────────────────────── white palace wing (beside the Golden Gate) ─────────────────────────
export function stuccoWing(B, { x, z, ry = 0, w = 16, d = 10, h = 11.5 }) {
  const m = m4(x, 0, z, ry);
  B.add('stone', xf(box(w + 0.4, 0.6, d + 0.4, 0, 0, 0), m));
  B.add('stucco', xf(box(w, h, d, 0, 0.6, 0), m));
  // pilasters and floor bands
  for (let i = 0; i <= 5; i++) B.add('stucco', xf(box(0.5, h - 0.6, 0.25, -w / 2 + 0.25 + (i * (w - 0.5)) / 5, 0.6, d / 2 + 0.12), m), { color: '#E4DED4' });
  for (const yy of [4.1, 7.8]) B.add('stucco', xf(box(w + 0.2, 0.3, 0.4, 0, yy, d / 2 + 0.1), m), { color: '#E9E4DB' });
  B.add('stucco', xf(box(w + 0.6, 0.55, d + 0.6, 0, h + 0.3, 0), m), { color: '#E9E4DB' });
  // tall shuttered windows
  for (let f = 0; f < 3; f++) for (let i = 0; i < 5; i++) {
    const px = -w / 2 + (i + 0.5) * (w / 5);
    const mm = new Matrix4().multiplyMatrices(m, m4(px, 1.3 + f * 3.7, d / 2 + 0.01));
    B.add('window', xf(quad(1.1, 2.0, 0.035), mm), { uv: 'keep' });
    for (const s of [-1, 1]) B.add('woodPaint', xf(box(0.52, 2.0, 0.06, s * 0.82, 0, 0.06), mm), { color: '#4E3B2C' });
    B.add('stucco', xf(box(1.6, 0.18, 0.2, 0, 2.05, 0.08), mm), { color: '#DCD5C9' });
  }
  hipRoof(B, { x, z, y: h + 0.75, h: 2.3, w0: w + 1.6, d0: d + 1.6, w1: w - 6, d1: 0, ry, key: 'houseRoof' });
}

// ───────────────────────── Newar houses ─────────────────────────
/** A row of brick houses along a line (from a to b), fronts facing ry. */
export function houseRow(B, { a, b, ry, seed = 1, depth = 9, minW = 5.5, maxW = 9, floorsMin = 3, floorsMax = 4, lod = 1 }) {
  const R = rng(seed);
  const dir = b.clone().sub(a);
  const L = dir.length();
  dir.normalize();
  let s = 0;
  while (s < L - 3) {
    const w = Math.min(L - s, minW + R() * (maxW - minW));
    const c = a.clone().addScaledVector(dir, s + w / 2);
    newarHouse(B, { x: c.x, z: c.z, ry, w: w - 0.04, d: depth + R() * 2, floors: floorsMin + Math.floor(R() * (floorsMax - floorsMin + 1)), R, lod });
    s += w;
  }
}

export function newarHouse(B, { x, z, ry, w, d, floors, R, lod = 1 }) {
  const m = m4(x, 0, z, ry);
  const g = 2.7, f = 2.45;
  const H = g + f * (floors - 1);
  const style = R();
  const wall = style < 0.68 ? 'house' : 'stucco';
  const color = wall === 'stucco' ? (style < 0.84 ? '#F1E7D6' : '#E9D2B3') : (R() < 0.5 ? '#FFFFFF' : '#F0D6C8');
  B.add(wall, xf(box(w, H, d, 0, 0, -d / 2), m), { color, dark: { top: 0.35, base: 0.25 } });
  // ground floor: shop fronts with wooden shutters
  const shops = Math.max(1, Math.round(w / 2.6));
  for (let i = 0; i < shops; i++) {
    const px = -w / 2 + (i + 0.5) * (w / shops);
    const sw = w / shops - 0.7;
    B.add('dark', xf(box(sw, 2.1, 0.03, px, 0.15, 0.02), m), { color: '#3A2C22' });
    B.add('woodPaint', xf(box(sw + 0.3, 0.16, 0.14, px, 2.25, 0.04), m), { color: '#5C4433' });
    if (R() < 0.6) for (let k = 0; k < 4; k++) B.add('woodPaint', xf(box(sw / 4 - 0.04, 2.1, 0.04, px - sw / 2 + (k + 0.5) * (sw / 4), 0.15, 0.06), m), { color: R() < 0.5 ? '#6B4B35' : '#57402F' });
  }
  cornice(B, new Matrix4().multiplyMatrices(m, m4(0, g - 0.1, 0)), w, { h: 0.22, depth: 0.22, beads: lod > 0.7 });
  // upper floors: carved windows, the top floor a wider window (tikijhyal)
  for (let fl = 1; fl < floors; fl++) {
    const y = g + (fl - 1) * f;
    const nwin = Math.max(1, Math.round(w / 2.4));
    const top = fl === floors - 1;
    for (let i = 0; i < nwin; i++) {
      const px = -w / 2 + (i + 0.5) * (w / nwin);
      const mm = new Matrix4().multiplyMatrices(m, m4(px, y + 0.55, 0.02));
      if (lod < 0.7) {
        B.add('window', xf(quad(0.9, 1.15, 0.03), mm), { uv: 'keep' });
        B.add('wood', xf(box(1.5, 0.12, 0.16, 0, -0.12, 0), mm));
        B.add('wood', xf(box(1.5, 0.12, 0.16, 0, 1.15, 0), mm));
      } else newarWindow(B, mm, { w: top ? 1.2 : 0.85, h: top ? 1.0 : 1.15, ears: 0.22, torana: !top && R() < 0.25 });
    }
    if (fl < floors - 1) B.add('wood', xf(box(w, 0.14, 0.12, 0, y + f - 0.05, 0.04), m));
  }
  // tiled roof, eave over the street
  const eave = 1.15;
  hipRoof(B, { z: -d / 2, y: H - 0.2, h: 1.0, w0: w + 0.15, d0: d + 2 * eave, w1: w + 0.15, d1: 0.2, key: 'houseRoof', fascia: 'wood', under: true, mat: m });
  // struts under the eave
  if (lod > 0.7) for (let i = 0; i < Math.max(2, Math.round(w / 1.8)); i++) {
    const px = -w / 2 + 0.5 + (i * (w - 1)) / Math.max(1, Math.round(w / 1.8) - 1);
    const p0 = v3(px, H - 1.3, 0.1).applyMatrix4(m), p1 = v3(px, H - 0.25, eave - 0.3).applyMatrix4(m);
    strut(B, p0, p1, 0.12, 0.1);
  }
  return H;
}
