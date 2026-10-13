// Stone guardians for the Nyatapola stair and the square: sculpted as smooth
// implicit surfaces (marching cubes over a field of spheres), so they read as
// weathered carved stone rather than primitives. The elephants are Poly
// Haven's CC0 "Carved Wooden Elephant" scan, re-materialled as stone.
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const ISO = 80;

/** Build a sculpt from a list of balls [x, y, z, r, neg?] in metres inside a cube of size S centred at c. */
function sculpt(balls, { S = 2.4, c = [0, 1.1, 0], res = 64, sub = 70 } = {}) {
  const mat = new THREE.MeshBasicMaterial();
  const mc = new MarchingCubes(res, mat, false, false, 90000);
  mc.isolation = ISO;
  mc.reset();
  for (const [x, y, z, r, neg] of balls) {
    const nx = (x - c[0]) / S + 0.5, ny = (y - c[1]) / S + 0.5, nz = (z - c[2]) / S + 0.5;
    const rn = r / S;
    const strength = rn * rn * (ISO + sub);
    mc.addBall(nx, ny, nz, neg ? -strength : strength, sub);
  }
  mc.update();
  const n = mc.count;
  const pos = mc.positionArray.slice(0, n * 3);
  const nor = mc.normalArray.slice(0, n * 3);
  // marching-cubes space is [-1, 1]; map back to metres
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] = pos[i] * (S / 2) + c[0];
    pos[i + 1] = pos[i + 1] * (S / 2) + c[1];
    pos[i + 2] = pos[i + 2] * (S / 2) + c[2];
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  // weld + smooth normals so the surface reads as carved stone, then floor at y = 0
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.translate(0, -g.boundingBox.min.y, 0);
  mc.geometry.dispose();
  return g.toNonIndexed();
}

/** A chain of balls from a to b, radius r0 → r1. */
function chain(out, a, b, r0, r1 = r0, step = 0.45) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const n = Math.max(2, Math.ceil(d / (Math.min(r0, r1) * step)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, r0 + (r1 - r0) * t]);
  }
}
const sym = (out, f) => { f(1); f(-1); return out; };

/** Seated lion, chest up, mouth open (Nyatapola, Chyasilin, Golden Gate roof). */
function lionBalls(winged = false) {
  const b = [];
  sym(b, (s) => {
    b.push([s * 0.22, 0.36, -0.26, 0.3]); // haunch
    b.push([s * 0.3, 0.1, -0.02, 0.12]); // hind paw
    chain(b, [s * 0.16, 0.86, 0.3], [s * 0.17, 0.14, 0.36], 0.11, 0.1); // foreleg
    b.push([s * 0.17, 0.08, 0.44, 0.12]); // fore paw
    b.push([s * 0.2, 1.32, 0.12, 0.24]); // mane
    b.push([s * 0.12, 1.56, 0.42, 0.085]); // brow
    b.push([s * 0.19, 1.7, 0.24, 0.075]); // ear
    b.push([s * 0.1, 1.36, 0.58, 0.075]); // cheek
    if (winged) { chain(b, [s * 0.24, 1.0, -0.06], [s * 0.55, 1.62, -0.28], 0.11, 0.07); chain(b, [s * 0.5, 1.55, -0.26], [s * 0.6, 1.2, -0.35], 0.07, 0.05); }
  });
  chain(b, [0, 0.45, -0.18], [0, 0.95, 0.12], 0.28, 0.27);
  b.push([0, 0.9, 0.24, 0.3]); // chest
  b.push([0, 1.15, 0.2, 0.24]); // neck
  b.push([0, 1.36, 0.16, 0.33]); // mane mass
  b.push([0, 1.46, 0.33, 0.24]); // head
  b.push([0, 1.38, 0.55, 0.14]); // muzzle
  b.push([0, 1.31, 0.66, 0.06, true]); // open mouth
  b.push([0, 1.6, 0.18, 0.18]); // mane crown
  chain(b, [0, 0.3, -0.48], [0, 0.72, -0.58], 0.065, 0.06);
  chain(b, [0, 0.72, -0.58], [0, 0.98, -0.42], 0.06, 0.08); // tail curl
  if (winged) b.push([0, 1.82, 0.32, 0.08]); // horn crest
  return b;
}

/** Standing guardian figure with a mace (the wrestlers Jayamel and Phattu); faceless. */
function guardianBalls(slim = false) {
  const b = [];
  const k = slim ? 0.86 : 1;
  sym(b, (s) => {
    b.push([s * 0.14, 0.06, 0.08, 0.1]);
    chain(b, [s * 0.14, 0.12, 0], [s * 0.13, 0.82, 0], 0.12 * k, 0.15 * k);
    b.push([s * 0.26 * k, 1.46, 0, 0.13 * k]); // shoulder
  });
  b.push([0, 0.9, 0, 0.23 * k]);
  chain(b, [0, 0.95, 0], [0, 1.38, 0.02], 0.22 * k, 0.21 * k);
  b.push([0, 1.34, 0.05, 0.23 * k]);
  // skirt / dhoti flare
  b.push([0, 0.74, 0, slim ? 0.34 : 0.27]);
  if (slim) b.push([0, 0.48, 0, 0.3]);
  // right arm raised with mace, left arm to the hip
  chain(b, [0.28 * k, 1.42, 0], [0.4, 1.12, 0.12], 0.085, 0.08);
  chain(b, [0.4, 1.12, 0.12], [0.36, 1.0, 0.28], 0.08, 0.075);
  chain(b, [0.36, 0.86, 0.3], [0.36, 1.62, 0.3], 0.045, 0.05);
  b.push([0.36, 1.68, 0.3, 0.11]);
  chain(b, [-0.28 * k, 1.42, 0], [-0.38, 1.06, 0.06], 0.085, 0.075);
  b.push([-0.36, 1.0, 0.1, 0.08]);
  b.push([0, 1.56, 0, 0.09]); // neck
  b.push([0, 1.72, 0.02, 0.14]); // head
  b.push([0, 1.88, 0, 0.1]); // crown
  b.push([0, 1.98, -0.01, 0.06]);
  return b;
}

let elephantGeo = null;
export async function loadElephant() {
  if (elephantGeo) return elephantGeo;
  try {
    const gltf = await new GLTFLoader().loadAsync('/themes/durbar/tex/elephant.gltf');
    let g = null;
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => { if (o.isMesh && !g) { g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); } });
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const sx = bb.max.x - bb.min.x, sz = bb.max.z - bb.min.z;
    // long axis to z (trunk toward +z), base on the ground, 1.55 m tall
    if (sx > sz) g.rotateY(Math.PI / 2);
    g.computeBoundingBox();
    const b2 = g.boundingBox;
    const h = b2.max.y - b2.min.y;
    g.translate(-(b2.min.x + b2.max.x) / 2, -b2.min.y, -(b2.min.z + b2.max.z) / 2);
    g.scale(1.55 / h, 1.55 / h, 1.55 / h);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    elephantGeo = g.index ? g.toNonIndexed() : g;
  } catch (err) {
    console.warn('[durbar] elephant model unavailable', err);
    elephantGeo = null;
  }
  return elephantGeo;
}

/** All sculpts, built once. res is lower on phones. */
export function buildSculpts({ res = 64 } = {}) {
  return {
    lion: sculpt(lionBalls(false), { res }),
    griffin: sculpt(lionBalls(true), { res, c: [0, 1.15, 0] }),
    guardian: sculpt(guardianBalls(false), { res, c: [0, 1.05, 0], S: 2.3 }),
    goddess: sculpt(guardianBalls(true), { res, c: [0, 1.05, 0], S: 2.3 }),
  };
}
