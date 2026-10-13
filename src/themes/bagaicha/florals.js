// Floral decor for Bagaicha: garden roses and hanging wisteria, built as real 3D flowers
// (layered, cupped petals with colour gradients), instanced so thousands stay cheap.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;

/** A garden rose: a tight bud, then three rings of cupped petals opening outward. Radius ≈ 0.1. */
export function roseGeometry() {
  const parts = [];
  const rings = [
    { n: 3, r: 0.05, tilt: 0.12, w: 0.62, h: 0.6, curl: 0.05 },
    { n: 5, r: 0.2, tilt: 0.38, w: 0.78, h: 0.72, curl: 0.12 },
    { n: 6, r: 0.42, tilt: 0.72, w: 0.9, h: 0.78, curl: 0.22 },
    { n: 7, r: 0.6, tilt: 1.05, w: 0.95, h: 0.72, curl: 0.3 },
  ];
  rings.forEach((ring, ri) => {
    for (let k = 0; k < ring.n; k++) {
      const g = new THREE.PlaneGeometry(ring.w, ring.h, 4, 4).translate(0, ring.h / 2, 0);
      const P = g.attributes.position, col = [];
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i);
        const u = x / (ring.w / 2), v = y / ring.h;
        // cup across the petal, rolled-back lip at the top
        let z = -u * u * 0.2 * ring.w + v * v * ring.curl;
        // round the petal's outline: pull the top corners in
        const nx = x * (1 - 0.45 * v * v);
        P.setXYZ(i, nx, y, z);
        const shade = 0.55 + 0.45 * Math.pow(v, 0.7) - ri * 0.02 + (1 - Math.abs(u)) * 0.06;
        col.push(shade, shade * 0.97, shade * 0.97);
      }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.rotateX(-ring.tilt);
      const a = (k / ring.n) * TAU + ri * 0.7;
      g.translate(0, 0, ring.r * 0.35);
      g.rotateY(a);
      parts.push(g);
    }
  });
  const bud = new THREE.SphereGeometry(0.16, 10, 8).scale(1, 1.3, 1).translate(0, 0.28, 0);
  bud.setAttribute('color', new THREE.Float32BufferAttribute(new Array(bud.attributes.position.count * 3).fill(0.6), 3));
  parts.push(bud);
  parts.forEach((p) => p.deleteAttribute('uv'));
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false);
  g.computeVertexNormals();
  g.scale(0.115, 0.115, 0.115);
  return g;
}

/** A hanging raceme of wisteria: lavender florets tapering to pale tips. Length ≈ 0.55. */
export function wisteriaGeometry(len = 0.55, rows = 16) {
  const parts = [];
  const top = new THREE.Color('#8f6fc6'), tip = new THREE.Color('#ece4f7');
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1);
    const y = -t * len;
    const r = 0.065 * (1 - t * 0.75);
    const per = t > 0.85 ? 2 : 3;
    for (let k = 0; k < per; k++) {
      const a = (k / per) * TAU + i * 1.1;
      const s = 0.024 * (1 - t * 0.5);
      const f = new THREE.OctahedronGeometry(s, 0).scale(1, 0.75, 1.15);
      f.rotateY(a).translate(Math.cos(a) * r, y + Math.sin(i * 2.3) * 0.006, Math.sin(a) * r);
      const c = top.clone().lerp(tip, Math.pow(t, 1.2));
      const shade = 0.85 + 0.15 * Math.sin(a * 3 + i);
      f.setAttribute('color', new THREE.Float32BufferAttribute(new Array(f.attributes.position.count).fill(0).flatMap(() => [c.r * shade, c.g * shade, c.b * shade]), 3));
      parts.push(f);
    }
  }
  // a slender green stalk
  const stalk = new THREE.CylinderGeometry(0.004, 0.006, len * 0.9, 4).translate(0, -len * 0.45, 0);
  stalk.setAttribute('color', new THREE.Float32BufferAttribute(new Array(stalk.attributes.position.count).fill(0).flatMap(() => [0.36, 0.48, 0.28]), 3));
  parts.push(stalk);
  parts.forEach((p) => p.deleteAttribute('uv'));
  return mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false);
}

export const ROSE_MAT = () => new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.62, metalness: 0 });
export const WISTERIA_MAT = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0 });

/** Instances `geo` at items [x,y,z, rx,ry,rz, scale] with optional per-instance colours. */
export function scatter(scene, geo, mat, items, colors, { shadow = false } = {}) {
  if (!items.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  items.forEach(([x, y, z, rx = 0, ry = 0, rz = 0, s = 1], i) => {
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
    o.scale.setScalar(s);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    if (colors) m.setColorAt(i, c.set(colors[i]));
  });
  m.castShadow = shadow;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

/** Points that fill a tube of radius `r` around a curve (for flower-covered arches and garlands). */
export function aroundCurve(curve, count, r, R, faceOut = true) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = R();
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const a = R() * TAU;
    const n1 = new THREE.Vector3(0, 0, 1).cross(tan);
    if (n1.lengthSq() < 1e-4) n1.set(1, 0, 0);
    n1.normalize();
    const n2 = tan.clone().cross(n1).normalize();
    const dir = n1.multiplyScalar(Math.cos(a)).addScaledVector(n2, Math.sin(a));
    const pos = p.clone().addScaledVector(dir, r * (0.7 + R() * 0.3));
    out.push({ pos, dir: faceOut ? dir : new THREE.Vector3(0, 1, 0) });
  }
  return out;
}

/** Euler angles that turn a flower's +y axis to face along `dir`. */
export function faceEuler(dir, spin = 0) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
  const e = new THREE.Euler().setFromQuaternion(q);
  return [e.x, e.y, e.z];
}
