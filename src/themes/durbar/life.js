// Small life in the square: pigeons pecking on the paving and circling the
// Nyatapola, marigold strands on the gates and frames, and cloth bunting
// stirring in the morning air. All instanced.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, place, TAU } from './geo.js';

const sph = (r, sx, sy, sz, x, y, z, col) => {
  const g = new THREE.SphereGeometry(r, 10, 7);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  const c = new THREE.Color(col);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
};

/** A rock pigeon, 32 cm long, facing +z. */
function pigeonBody() {
  const parts = [
    sph(0.07, 1, 0.95, 1.9, 0, 0.12, 0, '#8E929B'), // body
    sph(0.05, 1, 1.1, 1.1, 0, 0.17, 0.1, '#6F7E7A'), // iridescent neck
    sph(0.034, 1, 1, 1.15, 0, 0.215, 0.14, '#7F848E'), // head
    sph(0.012, 1, 0.8, 2.2, 0, 0.21, 0.18, '#3A3A3A'), // beak
    sph(0.045, 1.25, 0.35, 2.4, 0, 0.12, -0.15, '#5E626B'), // tail
    sph(0.058, 1.12, 0.6, 1.8, 0, 0.14, -0.02, '#A2A6AE'), // folded wings
  ];
  parts.forEach((p) => { for (const k of Object.keys(p.attributes)) if (!['position', 'normal', 'color'].includes(k)) p.deleteAttribute(k); });
  const legs = new THREE.CylinderGeometry(0.006, 0.006, 0.06, 4);
  legs.translate(0, 0.03, 0.01);
  const l2 = legs.clone();
  legs.translate(0.025, 0, 0); l2.translate(-0.025, 0, 0);
  for (const l of [legs, l2]) {
    l.deleteAttribute('uv');
    const n = l.attributes.position.count;
    l.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(0.6).map((v, i) => (i % 3 === 0 ? 0.75 : 0.35)), 3));
  }
  return mergeGeometries([...parts, legs, l2].map((g) => (g.index ? g.toNonIndexed() : g)));
}

/** Spread wings for the flying birds, with a side attribute for the flap shader. */
function wingGeo() {
  const w = new THREE.BufferGeometry();
  const pos = [], side = [], col = [];
  for (const s of [-1, 1]) {
    const v = [[0, 0, 0.05], [s * 0.34, 0.0, -0.02], [s * 0.3, 0, -0.1], [0, 0, -0.06]];
    for (const [i, j, k] of [[0, 1, 2], [0, 2, 3]]) for (const q of [v[i], v[j], v[k]]) { pos.push(...q); side.push(s * Math.abs(q[0]) / 0.34); col.push(0.62, 0.64, 0.68); }
  }
  w.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  w.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  w.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  w.computeVertexNormals();
  return w;
}

export function createPigeons(scene, { spots, flockCenter, count = 70, flyers = 16, reduced = false }) {
  const R = rng(9);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const body = pigeonBody();
  const ground = new THREE.InstancedMesh(body, mat, count);
  ground.castShadow = false;
  const birds = [];
  for (let i = 0; i < count; i++) {
    const s = spots[Math.floor(R() * spots.length)];
    const a = R() * TAU, r = Math.sqrt(R()) * s.r;
    birds.push({ x: s.x + Math.cos(a) * r, y: s.y ?? 0, z: s.z + Math.sin(a) * r, yaw: R() * TAU, phase: R() * 10, rate: 0.6 + R() * 0.8, sc: 0.9 + R() * 0.25 });
  }
  scene.add(ground);

  const flyMat = mat;
  const flyBody = new THREE.InstancedMesh(body, flyMat, flyers);
  const wings = new THREE.InstancedMesh(wingGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), flyers);
  const phase = new Float32Array(flyers);
  const fl = [];
  for (let i = 0; i < flyers; i++) {
    phase[i] = R() * 10;
    fl.push({ r: 14 + R() * 12, h: 17 + R() * 9, sp: 0.16 + R() * 0.08, a0: R() * TAU, bob: R() * 3 });
  }
  wings.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
  const uTime = { value: 0 };
  wings.material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSide; attribute float aPhase; uniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float flap = sin(uTime * 13.0 + aPhase * 6.0) * 0.9;
        transformed.y += abs(aSide) * 0.34 * sin(flap) ;
        transformed.x *= mix(1.0, cos(flap), abs(aSide));`);
  };
  scene.add(flyBody, wings);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  function update(t, near = true) {
    ground.visible = near;
    if (near) {
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i];
        const k = reduced ? 0 : t * b.rate + b.phase;
        // peck: a quick dip every couple of seconds; small shuffles of heading
        const peck = Math.max(0, Math.sin(k * 2.2)) ** 6;
        e.set(peck * 0.55, b.yaw + (reduced ? 0 : Math.sin(k * 0.3) * 0.4), 0);
        p.set(b.x, b.y, b.z);
        m.compose(p, q.setFromEuler(e), s.setScalar(b.sc));
        ground.setMatrixAt(i, m);
      }
      ground.instanceMatrix.needsUpdate = true;
    }
    uTime.value = t;
    for (let i = 0; i < fl.length; i++) {
      const f = fl[i];
      const a = f.a0 + (reduced ? 0 : t * f.sp);
      p.set(flockCenter.x + Math.cos(a) * f.r, f.h + Math.sin(t * 0.5 + f.bob) * 0.8, flockCenter.z + Math.sin(a) * f.r);
      e.set(0, -a, -0.35);
      m.compose(p, q.setFromEuler(e), s.setScalar(1.1));
      flyBody.setMatrixAt(i, m);
      wings.setMatrixAt(i, m);
    }
    flyBody.instanceMatrix.needsUpdate = true;
    wings.instanceMatrix.needsUpdate = true;
  }
  return { update };
}

/** Marigold strands along polylines (swags and hanging strings): instanced flower heads. */
export function createMarigolds(scene, curves, { spacing = 0.07, detail = 1 } = {}) {
  const pts = [];
  for (const c of curves) {
    for (let i = 0; i < c.length - 1; i++) {
      const a = c[i], b = c[i + 1];
      const n = Math.max(1, Math.round(a.distanceTo(b) / spacing));
      for (let k = 0; k < n; k++) pts.push(a.clone().lerp(b, k / n));
    }
  }
  const geo = new THREE.IcosahedronGeometry(0.038, detail);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, color: '#FFFFFF' });
  const im = new THREE.InstancedMesh(geo, mat, pts.length);
  const R = rng(3);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const cA = new THREE.Color('#F08A0C'), cB = new THREE.Color('#F6B31C'), cC = new THREE.Color('#D9480F');
  pts.forEach((p, i) => {
    q.setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3));
    m.compose(p, q, s.setScalar(0.85 + R() * 0.35));
    im.setMatrixAt(i, m);
    const r = R();
    im.setColorAt(i, r < 0.55 ? cA : r < 0.9 ? cB : cC);
  });
  im.castShadow = true;
  scene.add(im);
  return im;
}

/** Strings of triangular cloth flags that stir in the breeze. */
export function createBunting(scene, strings, { reduced = false } = {}) {
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.17, 0, 0, 0.17, 0, 0, 0, -0.42, 0], 3));
  tri.setAttribute('aTip', new THREE.Float32BufferAttribute([0, 0, 1], 1));
  tri.computeVertexNormals();
  const cols = ['#B3261E', '#F2B01E', '#FFFFFF', '#2F6E4E', '#C2491D'].map((c) => new THREE.Color(c));
  const items = [];
  const lines = [];
  for (const s of strings) {
    for (let i = 0; i < s.length - 1; i++) {
      const a = s[i], b = s[i + 1];
      lines.push(a.x, a.y, a.z, b.x, b.y, b.z);
      const n = Math.max(1, Math.round(a.distanceTo(b) / 0.45));
      for (let k = 0; k < n; k++) items.push({ p: a.clone().lerp(b, (k + 0.5) / n), yaw: Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2 });
    }
  }
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9 });
  const uTime = { value: 0 };
  const ph = new Float32Array(items.length);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTip; attribute float aPh; uniform float uTime;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.z += aTip * (sin(uTime * 2.1 + aPh) * 0.12 + 0.06);\n transformed.x += aTip * sin(uTime * 1.3 + aPh * 1.7) * 0.03;');
  };
  const im = new THREE.InstancedMesh(tri, mat, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
  items.forEach((it, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.yaw);
    m.compose(it.p, q, s);
    im.setMatrixAt(i, m);
    im.setColorAt(i, cols[i % cols.length]);
    ph[i] = i * 0.7;
  });
  tri.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1));
  im.castShadow = false;
  // cords as thin lit tubes (1-px lines shimmer as the camera moves)
  const tubes = [];
  for (let i = 0; i < lines.length; i += 6) {
    const a = new THREE.Vector3(lines[i], lines[i + 1], lines[i + 2]), b = new THREE.Vector3(lines[i + 3], lines[i + 4], lines[i + 5]);
    const g = new THREE.CylinderGeometry(0.012, 0.012, 1, 4, 1, true);
    g.translate(0, 0.5, 0); g.scale(1, a.distanceTo(b), 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    g.translate(a.x, a.y, a.z);
    g.deleteAttribute('uv');
    tubes.push(g.index ? g.toNonIndexed() : g);
  }
  const cord = new THREE.Mesh(mergeGeometries(tubes), new THREE.MeshStandardMaterial({ color: '#6A5848', roughness: 0.9 }));
  scene.add(im, cord);
  return { update: (t) => { uTime.value = reduced ? 0 : t; } };
}

export { place };
