// Wedding flowers for the square: real 3D roses (layered, cupped petals with
// soft occlusion toward the heart), leaves, and hanging wisteria/jasmine
// strands. Arches, swags, flower balls and frame wreaths are all placements
// into three instanced meshes, so the whole decoration is three draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, TAU } from './geo.js';

const { Vector3, Quaternion, Matrix4, Color } = THREE;
const UP = new Vector3(0, 1, 0);

/** One rose head, about 1 unit across, opening toward +y. */
function roseGeometry() {
  const parts = [];
  const rings = [[4, 0.3, 0.36, 0.3], [6, 0.5, 0.5, 0.95]];
  let k = 0;
  for (const [n, w, l, tilt] of rings) {
    for (let i = 0; i < n; i++) {
      const pos = [], col = [];
      const cols = 2, rows = 2;
      for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
        const u = c / cols - 0.5, v = r / rows;
        // a cupped petal: curls inward across its width and a little back at the tip
        const x = u * w;
        const z = -Math.abs(u) * u * w * 0.0 - (u * u) * w * 0.9 + v * v * 0.06;
        const y = v * l;
        pos.push(x, y, z);
        const shade = 0.55 + 0.45 * Math.min(1, v * 1.2 + k * 0.08);
        col.push(shade, shade, shade);
      }
      const idx = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const a = r * (cols + 1) + c, b = a + 1, d = a + cols + 1, e = d + 1;
        idx.push(a, b, d, b, e, d);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      // lean the petal outward, then place it around the centre
      g.rotateX(-tilt);
      g.translate(0, 0, 0.04 + k * 0.03);
      g.rotateY((i / n) * TAU + k * 0.7);
      parts.push(g.toNonIndexed());
    }
    k++;
  }
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  g.scale(1.7, 1.3, 1.7);
  return g;
}

/** A pointed leaf card, bent along its rib. */
function leafGeometry() {
  const pos = [0, 0, 0, 0.18, 0.35, 0.05, 0, 1, 0, -0.18, 0.35, 0.05, 0, 0.35, -0.03];
  const col = [0.6, 0.6, 0.6, 0.9, 0.9, 0.9, 1, 1, 1, 0.9, 0.9, 0.9, 0.8, 0.8, 0.8];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

const ROSE_COLS = {
  blush: ['#F2C4CC', '#EBB1BD', '#F6D6D8', '#E59AAE'],
  pink: ['#D96C8C', '#E58BA3', '#C9557A', '#F0A9BC'],
  white: ['#F7F2EA', '#FBF7F1', '#EFE6DA', '#F3ECE4'],
  red: ['#A3122A', '#B81D35', '#8E0F24', '#C42E43'],
  peach: ['#F4B99A', '#F1A98A', '#F7CDB2'],
  marigold: ['#F08A0C', '#F6A21C', '#F7B731', '#E9730C', '#D9480F', '#F59E0B'],
};

export class Flowers {
  constructor({ seed = 21, density = 1 } = {}) {
    this.R = rng(seed);
    this.roses = [];
    this.leaves = [];
    this.florets = [];
    this.density = density;
  }
  palette(names) {
    return names.flatMap((n) => ROSE_COLS[n]);
  }
  rose(p, n, size, cols) {
    this.roses.push({ p: p.clone(), n: n.clone().normalize(), s: size * (0.85 + this.R() * 0.3), c: cols[Math.floor(this.R() * cols.length)] });
  }
  leaf(p, n, size, dark = false) {
    const R = this.R;
    this.leaves.push({ p: p.clone(), n: n.clone().add(new Vector3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(1.2)).normalize(), s: size * (0.8 + R() * 0.5), c: dark ? '#2F4A2A' : R() < 0.5 ? '#3E5E35' : '#4E7140' });
  }
  /** Fill a box-shaped "cushion" (centre c, half sizes h, rotation ry) with outward-facing roses and leaves. */
  cushion(c, h, ry, { cols, rose = 0.075, perM2 = 120, leafRatio = 0.35, faces = ['+x', '-x', '+y', '-y', '+z', '-z'] }) {
    const R = this.R;
    const q = new Quaternion().setFromAxisAngle(UP, ry);
    const F = { '+x': [new Vector3(1, 0, 0), h.z, h.y], '-x': [new Vector3(-1, 0, 0), h.z, h.y], '+y': [new Vector3(0, 1, 0), h.x, h.z], '-y': [new Vector3(0, -1, 0), h.x, h.z], '+z': [new Vector3(0, 0, 1), h.x, h.y], '-z': [new Vector3(0, 0, -1), h.x, h.y] };
    for (const f of faces) {
      const [n, a, b] = F[f];
      const area = 4 * a * b;
      const count = Math.round(area * perM2 * this.density);
      for (let i = 0; i < count; i++) {
        const u = (R() * 2 - 1), v = (R() * 2 - 1);
        const p = new Vector3();
        if (n.x) p.set(n.x * h.x, v * h.y, u * h.z);
        else if (n.y) p.set(u * h.x, n.y * h.y, v * h.z);
        else p.set(u * h.x, v * h.y, n.z * h.z);
        // round the cushion: push points near edges inward and tilt their normals
        const nn = n.clone();
        const ex = Math.abs(p.x) / h.x, ey = Math.abs(p.y) / h.y, ez = Math.abs(p.z) / h.z;
        if (!n.x && ex > 0.75) nn.x += Math.sign(p.x) * (ex - 0.75) * 2.4;
        if (!n.y && ey > 0.75) nn.y += Math.sign(p.y) * (ey - 0.75) * 2.4;
        if (!n.z && ez > 0.75) nn.z += Math.sign(p.z) * (ez - 0.75) * 2.4;
        nn.normalize();
        p.addScaledVector(nn, (R() - 0.3) * rose * 0.6);
        p.applyQuaternion(q).add(c);
        nn.applyQuaternion(q);
        if (R() < leafRatio) this.leaf(p, nn, rose * 1.7, R() < 0.3);
        else this.rose(p, nn, rose, cols);
      }
    }
  }
  /** A rope of roses along a polyline (swags, frame wreaths). */
  rope(points, { cols, rose = 0.07, thick = 0.12, per = 0.07, leafRatio = 0.25 }) {
    const R = this.R;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const d = b.clone().sub(a);
      const len = d.length();
      d.normalize();
      const side = new Vector3().crossVectors(d, Math.abs(d.y) > 0.9 ? new Vector3(1, 0, 0) : UP).normalize();
      const up = new Vector3().crossVectors(side, d).normalize();
      const n = Math.max(1, Math.round((len / per) * this.density));
      for (let k = 0; k < n; k++) {
        const t = (k + R()) / n;
        const ang = R() * TAU;
        const nn = side.clone().multiplyScalar(Math.cos(ang)).addScaledVector(up, Math.sin(ang));
        const p = a.clone().lerp(b, t).addScaledVector(nn, thick * (0.6 + R() * 0.4));
        if (R() < leafRatio) this.leaf(p, nn, rose * 1.6);
        else this.rose(p, nn, rose, cols);
      }
    }
  }
  /** Hanging strands of small florets (wisteria, jasmine). */
  strands(top, { count, spread, len = [0.8, 1.8], cols = ['#C7B2E0', '#B49ACF', '#F3EEF7', '#E2D6EE'], size = 0.028, axis = new Vector3(1, 0, 0), ry = 0 }) {
    const R = this.R;
    const q = new Quaternion().setFromAxisAngle(UP, ry);
    for (let i = 0; i < count; i++) {
      const base = top.clone().add(new Vector3((R() * 2 - 1) * spread.x, 0, (R() * 2 - 1) * spread.z).applyQuaternion(q));
      const L = len[0] + R() * (len[1] - len[0]);
      const c = cols[Math.floor(R() * cols.length)];
      const n = Math.round(L / (size * 1.25));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const w = (1 - t) * 0.05;
        this.florets.push({ p: base.clone().add(new Vector3((R() - 0.5) * w, -t * L, (R() - 0.5) * w)), s: size * (1.25 - t * 0.6), c });
      }
    }
    void axis;
  }
  /** A ball of roses (topiary on a brass urn). */
  ball(c, r, { cols, rose = 0.07, perM2 = 140 }) {
    const R = this.R;
    const count = Math.round(4 * Math.PI * r * r * perM2 * this.density);
    for (let i = 0; i < count; i++) {
      const z = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - z * z);
      const n = new Vector3(Math.cos(a) * s, z, Math.sin(a) * s);
      const p = c.clone().addScaledVector(n, r);
      if (R() < 0.22) this.leaf(p, n, rose * 1.6, true); else this.rose(p, n, rose, cols);
    }
  }
  build(scene, { shadows = true, receive = shadows } = {}) {
    const m = new Matrix4(), q = new Quaternion(), s = new Vector3(), col = new Color();
    const group = new THREE.Group();
    if (this.roses.length) {
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, side: THREE.DoubleSide });
      const im = new THREE.InstancedMesh(roseGeometry(), mat, this.roses.length);
      this.roses.forEach((r, i) => {
        q.setFromUnitVectors(UP, r.n);
        q.multiply(new Quaternion().setFromAxisAngle(UP, this.R() * TAU));
        m.compose(r.p, q, s.setScalar(r.s));
        im.setMatrixAt(i, m);
        im.setColorAt(i, col.set(r.c));
      });
      im.castShadow = shadows;
      im.receiveShadow = receive;
      group.add(im);
    }
    if (this.leaves.length) {
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
      const im = new THREE.InstancedMesh(leafGeometry(), mat, this.leaves.length);
      this.leaves.forEach((l, i) => {
        q.setFromUnitVectors(UP, l.n);
        q.multiply(new Quaternion().setFromAxisAngle(UP, this.R() * TAU));
        m.compose(l.p, q, s.setScalar(l.s));
        im.setMatrixAt(i, m);
        im.setColorAt(i, col.set(l.c));
      });
      im.castShadow = shadows;
      group.add(im);
    }
    if (this.florets.length) {
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.75 });
      const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat, this.florets.length);
      this.florets.forEach((f, i) => {
        m.compose(f.p, q.identity(), s.setScalar(f.s));
        im.setMatrixAt(i, m);
        im.setColorAt(i, col.set(f.c));
      });
      im.castShadow = shadows;
      group.add(im);
    }
    scene.add(group);
    return { roses: this.roses.length, leaves: this.leaves.length, florets: this.florets.length };
  }
}
