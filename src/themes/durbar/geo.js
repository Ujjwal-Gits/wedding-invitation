// Geometry helpers for the square: boxes placed in world space, world-projected
// UVs (so brick and stone tile at their real size on every face), and a Builder
// that collects geometry per material and merges it into a handful of meshes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const { Vector3, Matrix4, Quaternion, Euler } = THREE;
export const TAU = Math.PI * 2;
export const v3 = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);
export const clamp01 = (t) => Math.min(1, Math.max(0, t));
export const smooth = (t) => t * t * (3 - 2 * t);
export const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/** Deterministic random numbers so the square is the same for every guest. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const M = new Matrix4();
const Q = new Quaternion();
const E = new Euler();
/** Apply position / rotation (Euler XYZ) / scale to a geometry in place. */
export function place(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  const sc = Array.isArray(s) ? new Vector3(...s) : new Vector3(s, s, s);
  M.compose(new Vector3(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), sc);
  g.applyMatrix4(M);
  return g;
}
/** Box with its base at y (not its centre), optionally turned about Y. */
export function box(w, h, d, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return place(g, x, y, z, 0, ry, 0);
}
export function cyl(rt, rb, h, seg, x = 0, y = 0, z = 0, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  g.translate(0, h / 2, 0);
  return place(g, x, y, z);
}
export function lathe(profile, seg, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), seg);
  return place(g, x, y, z, 0, ry, 0);
}

/**
 * Re-project UVs from world position by the dominant axis of each face, in
 * metres / tile. Works on non-indexed geometry (three vertices per face).
 */
export function worldUV(g, tile = 1) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), n = new Vector3(), e1 = new Vector3(), e2 = new Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? a : k === 1 ? b : c;
      let u, w;
      if (ay >= ax && ay >= az) { u = v.x; w = v.z; }
      else if (ax >= az) { u = v.z * Math.sign(n.x || 1); w = v.y; }
      else { u = -v.x * Math.sign(n.z || 1); w = v.y; }
      uv[(i + k) * 2] = u / tile;
      uv[(i + k) * 2 + 1] = w / tile;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Vertex colour (used as a multiplier: paint, soot, baked occlusion). */
export function tint(g, hex, dark = null) {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  const p = g.attributes.position;
  let y0 = Infinity, y1 = -Infinity;
  if (dark) for (let i = 0; i < n; i++) { const y = p.getY(i); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let i = 0; i < n; i++) {
    let k = 1;
    // simple baked occlusion: darker toward the base or the top of the piece
    if (dark) {
      const t = (p.getY(i) - y0) / Math.max(1e-3, y1 - y0);
      k = dark.top ? 1 - dark.top * Math.pow(t, 3) : 1;
      if (dark.base) k *= 1 - dark.base * Math.pow(1 - t, 4);
    }
    a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

const ni = (g) => (g.index ? g.toNonIndexed() : g);

/**
 * Collects geometry per material key. `add(key, geo, { uv: 'keep' | tile, color })`.
 * World UVs are applied at add time; vertex colours default to white.
 */
export class Builder {
  constructor(tiles = {}) {
    this.lists = new Map();
    this.tiles = tiles;
  }
  add(key, geo, { uv, color, flat, dark } = {}) {
    let g = ni(geo);
    if (flat) g.computeVertexNormals();
    if (uv !== 'keep') worldUV(g, typeof uv === 'number' ? uv : this.tiles[key] ?? 1);
    if (!g.attributes.uv) worldUV(g, 1);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.color) tint(g, color ?? '#ffffff', dark);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!this.lists.has(key)) this.lists.set(key, []);
    this.lists.get(key).push(g);
    return g;
  }
  merge(key) {
    const list = this.lists.get(key);
    if (!list?.length) return null;
    return mergeGeometries(list, false);
  }
  /** One mesh per material key. */
  build(materials, { shadows = true } = {}) {
    const group = new THREE.Group();
    for (const key of this.lists.keys()) {
      const mat = materials[key];
      if (!mat) { console.warn('[durbar] no material', key); continue; }
      const g = this.merge(key);
      const mesh = new THREE.Mesh(g, mat);
      mesh.name = key;
      mesh.castShadow = shadows && !mat.userData.noShadow;
      mesh.receiveShadow = shadows;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
    }
    this.lists.clear();
    return group;
  }
}

/** Points of a hanging string between a and b (sag in metres). */
export function catenary(a, b, sag, n = 20) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= sag * 4 * t * (1 - t);
    out.push(p);
  }
  return out;
}
