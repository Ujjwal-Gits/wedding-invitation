// Bagaicha's couple: realistic rigged figures in Nepali wedding dress.
// COPIED from src/core/mandap3d.js (owned by the mandap agent; read-only for this theme) per the
// theme contract ("copy it into your theme folder"): the CC0 MakeHuman bride/groom bodies
// (public/themes/mandap/*.glb), Quaternius Universal Animation Library walk/idle (CC0), and the
// code-built garments (sari, ghumto, pallu, tilhari, daura suruwal, istakot, Dhaka topi, malas).
// Only the figure/garment/IK code is copied; the mandap scene itself is not used.
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const ASSETS = `${import.meta.env?.BASE_URL ?? '/'}themes/mandap/`;
const PLAT = 0.222; // top of the raised platform (jagge)
const V2 = (x, y) => new T.Vector2(x, y);
const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const lathe = (pts, seg = 48, a0 = 0, len = Math.PI * 2) => new T.LatheGeometry(pts.map(([x, y]) => V2(x, y)), seg, a0, len);
const sstep = (x, a, b) => T.MathUtils.smoothstep(x, a, b);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = T.MathUtils.lerp;
const rand = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; })();

// ───────────── Canvas textures ─────────────
function canvasTex(w, h, draw, repeat, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  if (srgb) t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

/** Rangoli of marigold, rice and leaf colours on the jagge floor. */
const rangoliTex = () => canvasTex(1024, 1024, (g, w) => {
  const cx = w / 2;
  g.fillStyle = '#4a0a12';
  g.fillRect(0, 0, w, w);
  const ring = (r, n, len, wid, col, rot = 0) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rot;
      g.save();
      g.translate(cx + Math.cos(a) * r, cx + Math.sin(a) * r);
      g.rotate(a + Math.PI / 2);
      g.beginPath();
      g.ellipse(0, 0, wid, len, 0, 0, Math.PI * 2);
      g.fillStyle = col;
      g.fill();
      g.restore();
    }
  };
  const circle = (r, col, lw) => { g.beginPath(); g.arc(cx, cx, r, 0, Math.PI * 2); g.strokeStyle = col; g.lineWidth = lw; g.stroke(); };
  g.beginPath(); g.arc(cx, cx, 500, 0, Math.PI * 2); g.fillStyle = '#5c0e19'; g.fill();
  ring(470, 72, 22, 9, '#e88a1a');
  ring(470, 72, 11, 4, '#ffd36a', Math.PI / 72);
  circle(438, '#c9963f', 4);
  ring(400, 48, 30, 11, '#d8641a');
  ring(400, 48, 15, 5, '#f6c04a');
  circle(356, '#efe2c8', 3);
  ring(326, 36, 26, 9, '#3e6a2a');
  ring(326, 36, 10, 3, '#9cc263', Math.PI / 36);
  for (let i = 0; i < 360; i += 2.5) {
    const a = (i * Math.PI) / 180;
    g.fillStyle = (i / 2.5) % 2 ? '#ffd36a' : '#efe2c8';
    g.beginPath(); g.arc(cx + Math.cos(a) * 486, cx + Math.sin(a) * 486, 2.2, 0, Math.PI * 2); g.fill();
  }
  circle(292, '#c9963f', 5);
  // An eight-petal lotus around the fire, as drawn for the yagya.
  for (let i = 0; i < 8; i++) {
    g.save(); g.translate(cx, cx); g.rotate((i / 8) * Math.PI * 2);
    g.beginPath(); g.moveTo(0, -150); g.quadraticCurveTo(70, -230, 0, -282); g.quadraticCurveTo(-70, -230, 0, -150);
    g.fillStyle = i % 2 ? '#c9963f' : '#e0761c'; g.fill();
    g.restore();
  }
  circle(150, '#efe2c8', 4);
});

/** Nepali courtyard paving: dachi-appa bricks in a herringbone, near black at night. */
const brickTex = () => canvasTex(512, 512, (g, w) => {
  g.fillStyle = '#1b0f0d';
  g.fillRect(0, 0, w, w);
  const bw = 64;
  const bh = 22;
  for (let y = -bw; y < w + bw; y += bh) {
    for (let x = -bw; x < w + bw; x += bw * 2) {
      const off = ((y / bh) % 2) * bw;
      const v = 30 + rand() * 18;
      g.fillStyle = `rgb(${v + 30},${v * 0.55},${v * 0.42})`;
      g.fillRect(x + off + 2, y + 2, bw * 2 - 4, bh - 4);
    }
  }
}, [14, 14]);

/** Red silk with a woven gold border along v = 0 and gold buti. */
const sariTex = (base = '#a3132a', border = 0.1, buti = true) => canvasTex(512, 1024, (g, w, h) => {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  // Fine weave streaks for sheen.
  for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(0,0,0,${0.03 + rand() * 0.05})`; g.fillRect(x, 0, 1, h); }
  const bh = h * border;
  g.fillStyle = '#c99a45';
  g.fillRect(0, h - bh, w, bh);
  g.fillStyle = '#f0d488';
  for (let x = 0; x < w; x += 18) { g.beginPath(); g.moveTo(x, h - bh * 0.5); g.lineTo(x + 9, h - bh * 0.85); g.lineTo(x + 18, h - bh * 0.5); g.lineTo(x + 9, h - bh * 0.15); g.fill(); }
  g.fillStyle = '#6e0a18';
  g.fillRect(0, h - bh - 5, w, 3);
  g.fillStyle = '#d9b25e';
  g.fillRect(0, h - bh - 12, w, 2);
  if (buti) {
    g.fillStyle = 'rgba(240, 205, 120, 0.85)';
    for (let y = 24; y < h - bh - 30; y += 36) for (let x = ((y / 36) | 0) % 2 ? 0 : 18; x < w; x += 36) {
      g.beginPath(); g.ellipse(x, y, 2.2, 3.2, 0, 0, Math.PI * 2); g.fill();
    }
  }
}, [3, 1]);

/** Pallu silk: buti on red with gold borders along both long edges. */
const palluTex = () => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#a3132a';
  g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(0,0,0,${0.03 + rand() * 0.05})`; g.fillRect(x, 0, 1, h); }
  g.fillStyle = 'rgba(240, 205, 120, 0.85)';
  for (let y = 70; y < h - 70; y += 34) for (let x = ((y / 34) | 0) % 2 ? 0 : 17; x < w; x += 34) { g.beginPath(); g.ellipse(x, y, 3, 2.2, 0, 0, Math.PI * 2); g.fill(); }
  for (const y0 of [0, h - 46]) {
    g.fillStyle = '#c99a45'; g.fillRect(0, y0, w, 46);
    g.fillStyle = '#f0d488';
    for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, y0 + 23); g.lineTo(x + 8, y0 + 8); g.lineTo(x + 16, y0 + 23); g.lineTo(x + 8, y0 + 38); g.fill(); }
  }
}, [1, 1]);

/** Dhaka weave for the topi: small diamonds in red, black, white and gold. */
const dhakaTex = () => canvasTex(256, 256, (g, w) => {
  g.fillStyle = '#efe6d6';
  g.fillRect(0, 0, w, w);
  const cols = ['#a3132a', '#1a1414', '#c9963f', '#2b4a7a', '#a3132a', '#3d6b33'];
  const s = 32;
  for (let y = 0; y < w; y += s) for (let x = 0; x < w; x += s) {
    const k = ((x + y * 2) / s) | 0;
    g.fillStyle = cols[k % cols.length];
    g.beginPath(); g.moveTo(x + s / 2, y + 3); g.lineTo(x + s - 3, y + s / 2); g.lineTo(x + s / 2, y + s - 3); g.lineTo(x + 3, y + s / 2); g.fill();
    g.fillStyle = '#efe6d6';
    g.beginPath(); g.moveTo(x + s / 2, y + 10); g.lineTo(x + s - 10, y + s / 2); g.lineTo(x + s / 2, y + s - 10); g.lineTo(x + 10, y + s / 2); g.fill();
    g.fillStyle = cols[(k + 2) % cols.length];
    g.fillRect(x + s / 2 - 3, y + s / 2 - 3, 6, 6);
  }
}, [5, 1]);

/** Canopy: deep red silk with a gold border and an eight-petal centre. */
const canopyTex = () => canvasTex(1024, 1024, (g, w) => {
  g.fillStyle = '#6e0c1a';
  g.fillRect(0, 0, w, w);
  g.strokeStyle = '#c9963f'; g.lineWidth = 46; g.strokeRect(23, 23, w - 46, w - 46);
  g.strokeStyle = '#f2d27e'; g.lineWidth = 5; g.strokeRect(70, 70, w - 140, w - 140);
  const cx = w / 2;
  for (let i = 0; i < 16; i++) {
    g.save(); g.translate(cx, cx); g.rotate((i / 16) * Math.PI * 2);
    g.beginPath(); g.ellipse(0, -130, 34, 100, 0, 0, Math.PI * 2); g.fillStyle = i % 2 ? '#b8862f' : '#d8641a'; g.fill();
    g.restore();
  }
  g.beginPath(); g.arc(cx, cx, 56, 0, Math.PI * 2); g.fillStyle = '#f2d27e'; g.fill();
});

/** Soft round blob for contact shadows and glows. */
const blobTex = () => canvasTex(128, 128, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(0,0,0,0.75)');
  r.addColorStop(0.5, 'rgba(0,0,0,0.35)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, w, w);
}, null, false);

// ───────────── Shaders ─────────────
const billVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const fireFrag = /* glsl */ `
  uniform float uTime; uniform float uSeed; uniform float uGain; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+1.), f.x), f.y); }
  float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a*n(p); p *= 2.1; a *= .5; } return v; }
  void main(){
    vec2 uv = vUv;
    float t = uTime * 1.7 + uSeed * 10.0;
    float d = fbm(vec2(uv.x * 3.0 + uSeed, uv.y * 2.2 - t));
    float width = (1.0 - uv.y) * 0.42 + 0.04;
    float x = abs(uv.x - 0.5 + (d - 0.5) * 0.4 * uv.y);
    float shape = smoothstep(width, width * 0.2, x) * smoothstep(1.0, 0.2, uv.y + d * 0.5) * smoothstep(0.0, 0.1, uv.y);
    vec3 col = mix(vec3(1.0, 0.22, 0.02), vec3(1.0, 0.6, 0.16), shape);
    col = mix(col, vec3(1.0, 0.92, 0.7), pow(shape, 3.0));
    gl_FragColor = vec4(col * shape * 2.4 * uGain, shape);
  }`;
const glowFrag = /* glsl */ `
  uniform vec3 uColor; uniform float uStrength; varying vec2 vUv;
  void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 2.4) * uStrength; gl_FragColor = vec4(uColor * a, a); }`;
const emberVert = /* glsl */ `
  uniform float uTime, uPR; attribute vec4 aSeed; varying float vA;
  void main(){
    float life = fract(uTime * (0.22 + aSeed.x * 0.3) + aSeed.y);
    vec3 p = position;
    p.y += life * (1.2 + aSeed.z * 1.2);
    p.x += sin(uTime * 2.0 + aSeed.w * 6.28) * 0.1 * life;
    p.z += cos(uTime * 1.7 + aSeed.x * 6.28) * 0.1 * life;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vA = (1.0 - life) * smoothstep(0.0, 0.1, life);
    gl_PointSize = (1.6 + aSeed.z * 2.6) * uPR * (4.0 / -mv.z);
  }`;
const emberFrag = /* glsl */ `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(2.2, 1.0, .3, 1.0) * smoothstep(.5, 0., d) * vA; }`;
const bokehVert = /* glsl */ `uniform float uTime, uPR; attribute vec2 aSeed; varying float vA;
  void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
    vA = 0.55 + 0.45 * sin(uTime * (0.5 + aSeed.x) + aSeed.y * 6.28);
    gl_PointSize = (10.0 + aSeed.x * 22.0) * uPR * (10.0 / -mv.z); }`;
const bokehFrag = /* glsl */ `varying float vA;
  void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .4, d) * .35 + smoothstep(.5, 0., d) * .4; gl_FragColor = vec4(1.0, .7, .38, 1.0) * a * vA; }`;
const starVert = /* glsl */ `uniform float uTime, uPR; attribute vec2 aSeed; varying float vA;
  void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
    vA = (0.35 + 0.65 * aSeed.x) * (0.75 + 0.25 * sin(uTime * (0.7 + aSeed.y * 2.0) + aSeed.y * 40.0));
    gl_PointSize = (1.0 + aSeed.x * 1.8) * uPR; }`;
const starFrag = /* glsl */ `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(.85, .88, 1.0, 1.0) * smoothstep(.5, .1, d) * vA; }`;

const flameMat = (seed = Math.random(), gain = 1) => new T.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uGain: { value: gain } }, vertexShader: billVert, fragmentShader: fireFrag,
  transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
});
const glowMat = (color, strength) => new T.ShaderMaterial({
  uniforms: { uColor: { value: new T.Color(color) }, uStrength: { value: strength } }, vertexShader: billVert, fragmentShader: glowFrag,
  transparent: true, depthWrite: false, blending: T.AdditiveBlending,
});

// ───────────── Marigolds ─────────────
/** A marigold: a ruffled, slightly flattened ball. */
function marigoldGeometry(detail = 2) {
  // A UV sphere (smooth normals, seam-safe) with gently scalloped rows of petals;
  // the petal texture below does most of the work.
  const seg = detail >= 3 ? [22, 14] : detail === 2 ? [16, 10] : [9, 6];
  const g = new T.SphereGeometry(1, seg[0], seg[1]);
  const p = g.attributes.position;
  const v = V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const lat = Math.acos(Math.max(-1, Math.min(1, v.y)));
    const lon = Math.atan2(v.z, v.x);
    const f = Math.abs(Math.sin(lat * 7)) * (0.6 + 0.4 * Math.abs(Math.sin(lon * 6)));
    v.multiplyScalar(1 + (detail >= 2 ? 0.06 : 0.03) * f - 0.08 * Math.exp(-lat * lat * 8));
    v.y *= 0.8;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Rows of frilled petals radiating from the crown (grey, tinted per flower by instance colour). */
let petalMap = null;
function petalTexture() {
  if (petalMap) return petalMap;
  petalMap = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#9a9a9a';
    g.fillRect(0, 0, w, h);
    const rows = 9;
    for (let r = 0; r < rows; r++) {
      const y = (r + 0.6) * (h / rows);
      const n = 6 + Math.round(Math.sin(((r + 0.5) / rows) * Math.PI) * 16);
      const pw = w / n;
      for (let i = 0; i < n + 1; i++) {
        const x = (i + (r % 2) * 0.5) * pw;
        const lum = 200 + Math.floor(rand() * 55);
        g.fillStyle = `rgb(${lum},${lum},${lum})`;
        g.beginPath();
        g.moveTo(x - pw * 0.55, y);
        g.quadraticCurveTo(x - pw * 0.5, y - (h / rows) * 1.15, x, y - (h / rows) * 1.1);
        g.quadraticCurveTo(x + pw * 0.5, y - (h / rows) * 1.15, x + pw * 0.55, y);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(40,20,10,0.55)';
        g.lineWidth = 1.2;
        g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.35)';
        g.beginPath();
        for (let k = 0; k <= 6; k++) g.lineTo(x - pw * 0.45 + (k / 6) * pw * 0.9, y - (h / rows) * (1.0 + (k % 2) * 0.1));
        g.stroke();
      }
    }
    g.fillStyle = 'rgba(60,30,10,0.6)';
    g.fillRect(0, 0, w, 6);
  });
  petalMap.wrapS = T.RepeatWrapping;
  return petalMap;
}
const marigoldMaterial = (extra = {}) => new T.MeshStandardMaterial({ map: petalTexture(), bumpMap: petalTexture(), bumpScale: 1.5, roughness: 0.8, emissive: '#5a1c02', emissiveIntensity: 0.3, ...extra });

const MARIGOLD_COLS = ['#f08a14', '#f6a421', '#e2650f', '#ffb52a', '#f39318'].map((c) => new T.Color(c));

class Garlands {
  constructor(count, detail = 2) {
    this.mesh = new T.InstancedMesh(marigoldGeometry(detail), marigoldMaterial({ emissiveIntensity: 0.35 }), count);
    this.n = 0;
    this.dummy = new T.Object3D();
  }
  add(points, r = 0.055, spacing = 0.085, palette = MARIGOLD_COLS, closed = false) {
    const curve = new T.CatmullRomCurve3(points, closed);
    const n = Math.max(2, Math.floor(curve.getLength() / spacing));
    for (let i = 0; i <= n && this.n < this.mesh.count; i++) {
      this.dummy.position.copy(curve.getPointAt(i / n));
      this.dummy.rotation.set(rand() * 6, rand() * 6, rand() * 6);
      this.dummy.scale.setScalar(r * (0.85 + rand() * 0.3));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(this.n, this.dummy.matrix);
      this.mesh.setColorAt(this.n, palette[(i + (rand() > 0.75 ? 1 : 0)) % palette.length]);
      this.n++;
    }
  }
  finish() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; }
}

const catenary = (a, b, sag, n = 16) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n;
  return V3().lerpVectors(a, b, t).add(V3(0, -sag * 4 * t * (1 - t), 0));
});

/** A garland whose shape is recomputed every frame (the Swayambar malas). */
class Mala {
  constructor(n = 64, r = 0.03, palette = MARIGOLD_COLS) {
    this.n = n;
    this.r = r;
    this.mesh = new T.InstancedMesh(marigoldGeometry(3), marigoldMaterial({ emissiveIntensity: 0.22 }), n);
    this.mesh.frustumCulled = false;
    this.rot = Array.from({ length: n }, () => new T.Euler(rand() * 6, rand() * 6, rand() * 6));
    this.scl = Array.from({ length: n }, () => r * (0.85 + rand() * 0.3));
    for (let i = 0; i < n; i++) this.mesh.setColorAt(i, palette[(i + (i % 5 === 0 ? 1 : 0)) % palette.length]);
    this.mesh.instanceColor.needsUpdate = true;
    this.dummy = new T.Object3D();
    this.pts = Array.from({ length: n }, () => V3());
  }
  /**
   * A loop through hand points A and B: the front half (toward f) hangs by dropF, the back half by dropB.
   * `depth` is how far the loop bows forward/back from the A–B line (neck radius when worn).
   */
  shape(A, B, f, up, { depth = 0.1, dropF = 0.3, dropB = 0.05, bulge = 0.04 }) {
    const M = V3().addVectors(A, B).multiplyScalar(0.5);
    const h = V3().subVectors(A, B).multiplyScalar(0.5);
    for (let i = 0; i < this.n; i++) {
      const phi = (i / this.n) * Math.PI * 2;
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      const front = c > 0;
      const drop = (front ? dropF : dropB) * Math.pow(Math.abs(c), 1.25);
      const p = this.pts[i].copy(M).addScaledVector(h, s).addScaledVector(f, c * depth + (front ? bulge * Math.sqrt(c) * Math.sin(Math.PI * Math.min(1, drop / Math.max(dropF, 0.001))) : 0));
      p.addScaledVector(up, -drop);
    }
    return this;
  }
  commit() {
    for (let i = 0; i < this.n; i++) {
      this.dummy.position.copy(this.pts[i]);
      this.dummy.rotation.copy(this.rot[i]);
      this.dummy.scale.setScalar(this.scl[i]);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ───────────── Small props ─────────────
function leafGeo(len = 0.16, wid = 0.045, curl = 0.05) {
  const s = new T.Shape();
  s.moveTo(0, 0); s.quadraticCurveTo(wid, len * 0.45, 0, len); s.quadraticCurveTo(-wid, len * 0.45, 0, 0);
  const g = new T.ShapeGeometry(s, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.pow(p.getY(i) / len, 2) * curl + Math.abs(p.getX(i)) * -0.4 * (wid > 0.1 ? 1 : 0));
  g.computeVertexNormals();
  return g;
}

function kalash(brass) {
  const g = new T.Group();
  const pot = new T.Mesh(lathe([[0, 0], [0.09, 0.005], [0.14, 0.06], [0.16, 0.14], [0.13, 0.22], [0.07, 0.27], [0.065, 0.3], [0.095, 0.32], [0.09, 0.335]], 40), brass);
  g.add(pot);
  const coconut = new T.Mesh(new T.SphereGeometry(0.07, 20, 14), new T.MeshStandardMaterial({ color: '#5b3a1e', roughness: 0.9 }));
  coconut.scale.set(1, 1.2, 1);
  coconut.position.y = 0.39;
  g.add(coconut);
  const lm = new T.MeshStandardMaterial({ color: '#2f6a22', roughness: 0.6, side: T.DoubleSide });
  const lg = leafGeo();
  for (let i = 0; i < 7; i++) {
    const l = new T.Mesh(lg, lm);
    const a = (i / 7) * Math.PI * 2;
    l.position.set(Math.cos(a) * 0.06, 0.32, Math.sin(a) * 0.06);
    l.rotation.set(-0.9, -a + Math.PI / 2, 0, 'YXZ');
    g.add(l);
  }
  const thread = new T.Mesh(new T.TorusGeometry(0.155, 0.006, 6, 48), new T.MeshStandardMaterial({ color: '#c41e2e', roughness: 0.7 }));
  thread.rotation.x = Math.PI / 2;
  thread.position.y = 0.14;
  g.add(thread);
  return g;
}

/** Clay diyo with a flame that can be lit. */
function diyo() {
  const g = new T.Group();
  const bowl = new T.Mesh(lathe([[0, 0.02], [0.03, 0.0], [0.06, 0.02], [0.07, 0.045], [0.064, 0.05], [0.04, 0.035], [0, 0.03]], 24), new T.MeshStandardMaterial({ color: '#7a3e1c', roughness: 0.85 }));
  g.add(bowl);
  const flame = new T.Mesh(new T.PlaneGeometry(0.07, 0.14), flameMat());
  flame.position.y = 0.11;
  g.add(flame);
  const glow = new T.Mesh(new T.PlaneGeometry(0.7, 0.7), glowMat('#ff9a40', 0.5));
  glow.position.y = 0.09;
  g.add(glow);
  g.userData = { flame, glow };
  return g;
}

/** A panas: the tall brass oil lamp of Nepali ceremonies. */
function panas(brass) {
  const g = new T.Group();
  const body = new T.Mesh(lathe([[0, 0], [0.16, 0], [0.17, 0.03], [0.1, 0.07], [0.06, 0.12], [0.045, 0.3], [0.06, 0.34], [0.04, 0.38], [0.035, 0.7], [0.06, 0.74], [0.04, 0.78], [0.035, 1.0], [0.05, 1.04], [0.15, 1.08], [0.17, 1.12], [0.12, 1.12], [0.0, 1.1]], 28), brass);
  g.add(body);
  const flame = new T.Mesh(new T.PlaneGeometry(0.11, 0.22), flameMat(Math.random(), 1.1));
  flame.position.y = 1.2;
  g.add(flame);
  const glow = new T.Mesh(new T.PlaneGeometry(1.6, 1.6), glowMat('#ff9a3c', 0.45));
  glow.position.y = 1.18;
  g.add(glow);
  g.userData = { flame, glow };
  return g;
}

/** A banana plant at the mandap corner (kera ko bot), as Nepali mandaps are dressed. */
function bananaPlant(rot) {
  const g = new T.Group();
  const trunk = new T.Mesh(new T.CylinderGeometry(0.07, 0.1, 2.0, 12), new T.MeshStandardMaterial({ color: '#5f6b2c', roughness: 0.7 }));
  trunk.position.y = 1.0;
  g.add(trunk);
  const lm = new T.MeshStandardMaterial({ color: '#2f5a1f', roughness: 0.65, side: T.DoubleSide });
  const lg = leafGeo(1.25, 0.24, 0.35);
  for (let i = 0; i < 7; i++) {
    const l = new T.Mesh(lg, lm);
    const a = (i / 7) * Math.PI * 2 + rot;
    l.position.set(0, 1.85 + (i % 3) * 0.08, 0);
    l.rotation.set(-0.5 - (i % 2) * 0.35, a, 0, 'YXZ');
    g.add(l);
  }
  return g;
}

// ───────────── Rigged figures ─────────────
const B = {
  pelvis: 'pelvis', s1: 'spine_01', s2: 'spine_02', s3: 'spine_03', neck: 'neck_01', head: 'Head',
  clL: 'clavicle_l', clR: 'clavicle_r', uaL: 'upperarm_l', uaR: 'upperarm_r', laL: 'lowerarm_l', laR: 'lowerarm_r', haL: 'hand_l', haR: 'hand_r',
  thL: 'thigh_l', thR: 'thigh_r', caL: 'calf_l', caR: 'calf_r', ftL: 'foot_l', ftR: 'foot_r',
};
const FINGER = /^(index|middle|ring|pinky|thumb)_/;
let loaded = null;
function loadAssets() {
  if (!loaded) {
    const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    loaded = Promise.all(['bride', 'groom', 'anims'].map((n) => L.loadAsync(`${ASSETS}${n}.glb`)));
  }
  return loaded;
}

/** Spatial hash over a point set, for nearest-vertex queries. */
class Grid {
  constructor(pos, cell = 0.04) {
    this.pos = pos;
    this.cell = cell;
    this.map = new Map();
    for (let i = 0; i < pos.length / 3; i++) {
      const k = this.key(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      if (!this.map.has(k)) this.map.set(k, []);
      this.map.get(k).push(i);
    }
  }
  key(x, y, z) { const c = this.cell; return this.ik(Math.floor(x / c), Math.floor(y / c), Math.floor(z / c)); }
  ik(i, j, k) { return ((i + 512) * 1024 + (j + 512)) * 1024 + (k + 512); }
  nearest(x, y, z, filter, maxRing = 6) {
    const c = this.cell;
    const cx = Math.floor(x / c), cy = Math.floor(y / c), cz = Math.floor(z / c);
    let best = -1;
    let bd = Infinity;
    for (let r = 0; r <= maxRing; r++) {
      for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) {
        if (Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) !== r) continue;
        const list = this.map.get(this.ik(cx + i, cy + j, cz + k));
        if (!list) continue;
        for (const v of list) {
          if (filter && !filter(v)) continue;
          const dx = this.pos[v * 3] - x, dy = this.pos[v * 3 + 1] - y, dz = this.pos[v * 3 + 2] - z;
          const d = dx * dx + dy * dy + dz * dz;
          if (d < bd) { bd = d; best = v; }
        }
      }
      if (best >= 0 && Math.sqrt(bd) < r * c) break;
    }
    return best;
  }
}

/**
 * Re-bakes a skinned mesh into float geometry in world rest space (metres, y up),
 * so garments can be generated next to it and every part shares one skeleton.
 */
function bakeSkinned(mesh) {
  mesh.updateMatrixWorld(true);
  const sk = mesh.skeleton;
  const g = mesh.geometry;
  const P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, UV = g.attributes.uv;
  const n = P.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), uv = new Float32Array(n * 2);
  const boneMats = sk.bones.map((b, i) => new T.Matrix4().multiplyMatrices(b.matrixWorld, sk.boneInverses[i]));
  const acc = new T.Matrix4();
  const M = new T.Matrix4();
  const nm = new T.Matrix3();
  const v = V3();
  const e = acc.elements;
  for (let i = 0; i < n; i++) {
    e.fill(0);
    for (let k = 0; k < 4; k++) {
      const w = SW.getComponent(i, k);
      const b = SI.getComponent(i, k);
      si[i * 4 + k] = b;
      sw[i * 4 + k] = w;
      if (!w) continue;
      const be = boneMats[b].elements;
      for (let q = 0; q < 16; q++) e[q] += be[q] * w;
    }
    M.copy(mesh.matrixWorld).multiply(mesh.bindMatrixInverse).multiply(acc).multiply(mesh.bindMatrix);
    v.fromBufferAttribute(P, i).applyMatrix4(M);
    pos.set([v.x, v.y, v.z], i * 3);
    nm.getNormalMatrix(M);
    v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
    nor.set([v.x, v.y, v.z], i * 3);
    if (UV) { uv[i * 2] = UV.getX(i); uv[i * 2 + 1] = UV.getY(i); }
  }
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.BufferAttribute(pos, 3));
  out.setAttribute('normal', new T.BufferAttribute(nor, 3));
  out.setAttribute('uv', new T.BufferAttribute(uv, 2));
  out.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4));
  out.setAttribute('skinWeight', new T.BufferAttribute(sw, 4));
  if (g.index) out.setIndex(Array.from(g.index.array));
  return out;
}

/** Welded neighbour lists (seams share positions) for smoothing. */
function neighbours(geo) {
  const P = geo.attributes.position.array;
  const n = P.length / 3;
  const weld = new Int32Array(n);
  const seen = new Map();
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(P[i * 3] * 1e4)},${Math.round(P[i * 3 + 1] * 1e4)},${Math.round(P[i * 3 + 2] * 1e4)}`;
    if (!seen.has(k)) seen.set(k, i);
    weld[i] = seen.get(k);
  }
  const nb = Array.from({ length: n }, () => new Set());
  const I = geo.index.array;
  for (let t = 0; t < I.length; t += 3) {
    for (let a = 0; a < 3; a++) {
      const p = weld[I[t + a]], q = weld[I[t + ((a + 1) % 3)]];
      nb[p].add(q); nb[q].add(p);
    }
  }
  return { weld, nb };
}

/** A collision surface from a garment (rest-space geometry). */
function colliderOf(mesh, clear) {
  const g = mesh.geometry;
  if (!g.attributes.normal) g.computeVertexNormals();
  return { P: g.attributes.position.array, N: g.attributes.normal.array, grid: new Grid(g.attributes.position.array, 0.035), clear };
}

/** Welded vertices on open borders (edges used by one triangle). */
function borderSet(g, weld) {
  const I = g.index.array;
  const count = new Map();
  for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = weld[I[t + k]], b = weld[I[t + ((k + 1) % 3)]];
    const kk = a < b ? `${a}_${b}` : `${b}_${a}`;
    count.set(kk, (count.get(kk) || 0) + 1);
  }
  const out = new Set();
  for (const [kk, c] of count) if (c === 1) kk.split('_').forEach((v) => out.add(Number(v)));
  return out;
}

/** Straightens the jagged triangle edges along a garment's open borders (hems, necklines). */
function smoothBorder(g, weld, iters = 8) {
  const P = g.attributes.position.array;
  const I = g.index.array;
  const count = new Map();
  const key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) {
    const a = weld[I[t + k]], b = weld[I[t + ((k + 1) % 3)]];
    const kk = key(a, b);
    count.set(kk, (count.get(kk) || 0) + 1);
  }
  const nb = new Map();
  for (const [kk, c] of count) {
    if (c !== 1) continue;
    const [a, b] = kk.split('_').map(Number);
    if (!nb.has(a)) nb.set(a, []);
    if (!nb.has(b)) nb.set(b, []);
    nb.get(a).push(b); nb.get(b).push(a);
  }
  for (let it = 0; it < iters; it++) {
    const next = new Map();
    for (const [v, list] of nb) {
      if (list.length !== 2) continue;
      const [a, b] = list;
      next.set(v, [0, 1, 2].map((q) => P[v * 3 + q] * 0.5 + (P[a * 3 + q] + P[b * 3 + q]) * 0.25));
    }
    for (const [v, p] of next) { P[v * 3] = p[0]; P[v * 3 + 1] = p[1]; P[v * 3 + 2] = p[2]; }
  }
  for (let i = 0; i < P.length / 3; i++) if (weld[i] !== i) { const w = weld[i]; P[i * 3] = P[w * 3]; P[i * 3 + 1] = P[w * 3 + 1]; P[i * 3 + 2] = P[w * 3 + 2]; }
}

/** Builds a skinned garment from a region of the body surface, pushed out along the normals. */
function shellFrom(body, offsetOf, material, keepTri) {
  const P = body.attributes.position.array, N = body.attributes.normal.array;
  const I = body.index.array;
  const SI = body.attributes.skinIndex.array, SW = body.attributes.skinWeight.array, UV = body.attributes.uv.array;
  const map = new Map();
  const pos = [], nor = [], si = [], sw = [], uv = [], idx = [];
  const vid = (i) => {
    if (map.has(i)) return map.get(i);
    const o = offsetOf(i);
    const k = pos.length / 3;
    pos.push(P[i * 3] + N[i * 3] * o, P[i * 3 + 1] + N[i * 3 + 1] * o, P[i * 3 + 2] + N[i * 3 + 2] * o);
    nor.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);
    si.push(SI[i * 4], SI[i * 4 + 1], SI[i * 4 + 2], SI[i * 4 + 3]);
    sw.push(SW[i * 4], SW[i * 4 + 1], SW[i * 4 + 2], SW[i * 4 + 3]);
    uv.push(UV[i * 2], UV[i * 2 + 1]);
    map.set(i, k);
    return k;
  };
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    if (offsetOf(a) < 0 || offsetOf(b) < 0 || offsetOf(c) < 0) continue;
    if (keepTri && !keepTri(a, b, c)) continue;
    idx.push(vid(a), vid(b), vid(c));
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new T.SkinnedMesh(g, material);
}

/** Keep the four largest influences and normalise. */
function top4(entries) {
  const list = [...entries].filter(([, w]) => w > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = list.reduce((s, [, w]) => s + w, 0) || 1;
  while (list.length < 4) list.push([0, 0]);
  return list.map(([b, w]) => [b, w / sum]);
}

/**
 * Retarget a clip from the animation library's skeleton onto a figure with different proportions
 * and rest pose. Each bone takes the source bone's change of world rotation from its rest pose;
 * limb bones are then swung so they point the same way as the source limb (this removes the
 * A-pose/T-pose difference). Sampled at 30 fps.
 */
function retargetClip(clip, srcScene, fig) {
  const src = srcScene.clone(true);
  const sb = new Map();
  src.traverse((o) => { if (o.name) sb.set(o.name.toLowerCase(), o); });
  src.updateMatrixWorld(true);
  const tb = fig.bones;
  const order = [];
  const visit = (b) => { if (tb.includes(b)) order.push(b); b.children.forEach(visit); };
  visit(tb[0].parent);
  const q = () => new T.Quaternion();
  const srcRest = new Map(), tgtRest = new Map();
  for (const [n, o] of sb) srcRest.set(n, o.getWorldQuaternion(q()));
  fig.root.updateMatrixWorld(true);
  for (const b of tb) tgtRest.set(b, b.getWorldQuaternion(q()));
  const parentRest = tb[0].parent.getWorldQuaternion(q());
  const chain = { clavicle_l: 'upperarm_l', clavicle_r: 'upperarm_r', upperarm_l: 'lowerarm_l', upperarm_r: 'lowerarm_r', lowerarm_l: 'hand_l', lowerarm_r: 'hand_r', thigh_l: 'calf_l', thigh_r: 'calf_r', calf_l: 'foot_l', calf_r: 'foot_r', foot_l: 'ball_l', foot_r: 'ball_r', hand_l: 'middle_01_l', hand_r: 'middle_01_r' };
  const childOf = (b, n) => b.children.find((c) => c.name.toLowerCase() === n);
  const mixer = new T.AnimationMixer(src);
  mixer.clipAction(clip).play();
  const fps = 30;
  const frames = Math.max(2, Math.round(clip.duration * fps) + 1);
  const times = new Float32Array(frames);
  const values = new Map(order.map((b) => [b, new Float32Array(frames * 4)]));
  const pelvisPos = new Float32Array(frames * 3);
  const sPel = sb.get('pelvis'), tPel = fig.bone.pelvis;
  const sPelRest = sPel.getWorldPosition(V3());
  const tPelRest = tPel.getWorldPosition(V3());
  const ratio = tPelRest.y / Math.max(0.01, sPelRest.y);
  const world = new Map();
  const wp = V3(), wc = V3(), dS = V3(), dT = V3();
  for (let f = 0; f < frames; f++) {
    const t = Math.min(clip.duration, f / fps);
    times[f] = t;
    mixer.setTime(t);
    src.updateMatrixWorld(true);
    world.clear();
    for (const b of order) {
      const n = b.name.toLowerCase();
      const s = sb.get(n);
      const parentW = world.get(b.parent) || parentRest;
      let qW;
      if (s) {
        qW = s.getWorldQuaternion(q()).multiply(srcRest.get(n).clone().invert()).multiply(tgtRest.get(b));
        const cn = chain[n];
        const sc = cn && sb.get(cn);
        const tc = cn && childOf(b, cn);
        if (sc && tc) {
          s.getWorldPosition(wp); sc.getWorldPosition(wc);
          dS.subVectors(wc, wp).normalize();
          dT.copy(tc.position).normalize().applyQuaternion(qW);
          qW = q().setFromUnitVectors(dT, dS).multiply(qW);
        }
      } else {
        qW = parentW.clone().multiply(fig.rest.get(b));
      }
      world.set(b, qW);
      const local = parentW.clone().invert().multiply(qW);
      values.get(b).set([local.x, local.y, local.z, local.w], f * 4);
    }
    // Pelvis: the source's travel from its rest, scaled to this body, in the pelvis parent's frame.
    const d = sPel.getWorldPosition(V3()).sub(sPelRest).multiplyScalar(ratio);
    const lp = tPel.parent.worldToLocal(tPelRest.clone().add(d));
    pelvisPos.set([lp.x, lp.y, lp.z], f * 3);
  }
  const tracks = order.map((b) => new T.QuaternionKeyframeTrack(`${b.name}.quaternion`, times, values.get(b)));
  tracks.push(new T.VectorKeyframeTrack(`${tPel.name}.position`, times, pelvisPos));
  return new T.AnimationClip(clip.name, clip.duration, tracks);
}

/** One of the couple: a rigged body, re-dressed in code, with walk/idle blending and arm IK. */
class Figure {
  constructor(gltf, anims, kind, mobile) {
    this.kind = kind;
    this.mobile = mobile;
    this.root = new T.Group();
    this.root.name = kind;
    const src = gltf.scene;
    src.updateMatrixWorld(true);
    const meshes = [];
    src.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
    // The body is the largest skinned mesh; the others are eyes, brows, lashes and hair.
    const bodyMesh = meshes.reduce((a, m) => (m.geometry.attributes.position.count > a.geometry.attributes.position.count ? m : a));
    this.bones = bodyMesh.skeleton.bones;
    // MakeHuman (MPFB) exports: realistic skin, eyes and hair. Older stylised bodies get smoothing.
    this.realistic = this.bones.some((b) => b.name === 'head');
    const armature = this.bones[0].parent;
    const find = (n) => this.bones.find((b) => b.name.toLowerCase() === n.toLowerCase());
    this.bone = Object.fromEntries(Object.entries(B).map(([k, n]) => [k, find(n)]));
    this.findBone = find;
    this.srcMats = Object.fromEntries(meshes.map((m) => [m.name, m.material]));
    // Bake every skinned part into rest-space geometry and share one fresh skeleton.
    const baked = Object.fromEntries(meshes.map((m) => [m.name, bakeSkinned(m)]));
    meshes.forEach((m) => m.removeFromParent());
    this.root.add(armature);
    this.root.updateMatrixWorld(true);
    this.rest = new Map(this.bones.map((b) => [b, b.quaternion.clone()]));
    this.body = baked[bodyMesh.name];
    this.prep();
    // The skeleton's bind pose is taken after prep(), which may move the shoulder joints.
    this.root.updateMatrixWorld(true);
    this.skeleton = new T.Skeleton(this.bones);
    this.mats = this.materials(bodyMesh.material);
    this.attach(this.body, this.mats.skin, 'body');
    const role = (m) => (m === bodyMesh ? 'body' : /eyebrow/i.test(m.name) ? 'brows' : /eyelash/i.test(m.name) ? 'lashes' : /high-poly|low-poly|eye/i.test(m.name) ? 'eyes' : 'hair');
    for (const m of meshes) {
      const r = role(m);
      if (r === 'body') continue;
      if (!this.realistic && r !== 'hair') continue; // stylised bodies: calm, featureless faces
      const mat = r === 'hair' ? this.mats.hair : this.cardMaterial(m.material, r);
      const mesh = this.attach(baked[m.name], mat, r);
      if (r === 'hair') this.hair = mesh;
    }
    if (this.hair && kind === 'bride' && !this.realistic) this.hair.visible = false;
    if (kind === 'bride') this.dressBride(); else this.dressGroom();
    this.buildMarkers();
    this.root.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = !mobile; } });

    // Animation: walk and idle, blended by speed; the walk phase follows distance travelled.
    this.mixer = new T.AnimationMixer(this.root);
    const clips = anims.animations;
    const clean = (c) => new T.AnimationClip(c.name, c.duration, c.tracks.filter((t) => /\.quaternion$/.test(t.name) || t.name === 'pelvis.position'));
    const get = (n) => (this.realistic ? retargetClip(clean(clips.find((c) => c.name === n)), anims.scene, this) : clean(clips.find((c) => c.name === n)));
    this.walk = this.mixer.clipAction(get('Walk_Formal_Loop'));
    this.idle = this.mixer.clipAction(get('Idle_Loop'));
    [this.walk, this.idle].forEach((a) => { a.play(); a.setEffectiveWeight(0); });
    this.walkW = 0;
    this.dist = 0;
    this.stride = kind === 'bride' ? 0.7 : 1.15; // metres per walk cycle at this scale
    this.last = null;
    this.scale = this.realistic ? (kind === 'bride' ? 1.0 : 1.0) : kind === 'bride' ? 0.9 : 0.94;
    this.root.scale.setScalar(this.scale);
    this.ik = { L: null, R: null };
    this.bow = 0;
    this.headDip = 0;
  }

  /** Measurements of the rest-space body used by the garment builders. */
  prep() {
    const g = this.body;
    const P = g.attributes.position.array;
    const SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array;
    const n = P.length / 3;
    const idx = (name) => this.bones.findIndex((b) => b.name.toLowerCase() === name.toLowerCase());
    const groups = {
      head: ['Head'], neck: ['neck_01'], torso: ['spine_01', 'spine_02', 'spine_03', 'clavicle_l', 'clavicle_r'], pelvis: ['pelvis'],
      ua: ['upperarm_l', 'upperarm_r'], la: ['lowerarm_l', 'lowerarm_r'], hand: this.bones.filter((b) => /hand_|index|middle|ring|pinky|thumb/.test(b.name)).map((b) => b.name),
      thigh: ['thigh_l', 'thigh_r'], calf: ['calf_l', 'calf_r'], foot: ['foot_l', 'foot_r', 'ball_l', 'ball_r', 'ball_leaf_l', 'ball_leaf_r'],
    };
    const gi = Object.fromEntries(Object.entries(groups).map(([k, names]) => [k, new Set(names.map(idx))]));
    this.W = {};
    for (const k of Object.keys(groups)) this.W[k] = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      for (let q = 0; q < 4; q++) {
        const b = SI[i * 4 + q], w = SW[i * 4 + q];
        for (const k in gi) if (gi[k].has(b)) this.W[k][i] += w;
      }
    }
    this.boneIndex = idx;
    const wp = (b) => b.getWorldPosition(V3());
    this.restPos = Object.fromEntries(Object.entries(this.bone).map(([k, b]) => [k, wp(b)]));
    if (this.kind === 'groom' && !this.realistic) {
      this.narrowShoulders(0.032);
      this.restPos = Object.fromEntries(Object.entries(this.bone).map(([k, b]) => [k, wp(b)]));
    }
    if (!this.realistic) this.slim();
    this.grid = new Grid(P, 0.035);
    // Head ellipsoid from head-weighted vertices.
    const box = new T.Box3();
    for (let i = 0; i < n; i++) if (this.W.head[i] > 0.9) box.expandByPoint(V3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]));
    this.headBox = box;
    this.height = 0;
    for (let i = 0; i < n; i++) this.height = Math.max(this.height, P[i * 3 + 1]);
    if (!this.realistic) this.softenFace();
  }

  /** Brings the shoulder joints and the arms in toward the spine (with the skin around them). */
  narrowShoulders(dx) {
    const P = this.body.attributes.position.array;
    const n = P.length / 3;
    const uaX = Math.abs(this.restPos.uaL.x);
    for (let i = 0; i < n; i++) {
      const x = P[i * 3];
      const arm = clamp01(this.W.ua[i] + this.W.la[i] + this.W.hand[i]);
      const shoulder = sstep(Math.abs(x), uaX * 0.45, uaX) * (1 - this.W.pelvis[i]) * sstep(P[i * 3 + 1], this.restPos.s1.y, this.restPos.s3.y);
      const k = Math.max(arm, shoulder * (this.W.torso[i] + this.W.neck[i] * 0.3));
      P[i * 3] -= Math.sign(x) * dx * Math.min(1, k);
    }
    for (const key of ['uaL', 'uaR']) {
      const b = this.bone[key];
      const w = b.getWorldPosition(V3());
      w.x -= Math.sign(w.x) * dx;
      b.position.copy(b.parent.worldToLocal(w));
      b.updateMatrixWorld(true);
    }
  }

  /** Eases the heroic proportions of the base meshes toward everyday ones: slimmer arms, neck and chest. */
  slim() {
    const P = this.body.attributes.position.array;
    const n = P.length / 3;
    const k = this.kind === 'groom' ? { ua: 0.7, la: 0.8, tx: 0.84, tz: 0.88, neck: 0.8 } : { ua: 0.88, la: 0.92, tx: 0.95, tz: 1, neck: 0.92 };
    const rp = this.restPos;
    const uaX = Math.abs(rp.uaL.x);
    const seg = (p, a, b) => { const ab = V3().subVectors(b, a); const t = clamp01(V3().subVectors(p, a).dot(ab) / ab.lengthSq()); return a.clone().addScaledVector(ab, t); };
    const lSide = Math.sign(rp.uaL.x);
    const p = V3();
    for (let i = 0; i < n; i++) {
      p.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      const L = p.x * lSide > 0;
      const ua = L ? [rp.uaL, rp.laL] : [rp.uaR, rp.laR];
      const la = L ? [rp.laL, rp.haL] : [rp.laR, rp.haR];
      if (this.W.ua[i] > 0) { const c = seg(p, ua[0], ua[1]); p.sub(c).multiplyScalar(lerp(1, k.ua, this.W.ua[i])).add(c); }
      if (this.W.la[i] > 0) { const c = seg(p, la[0], la[1]); p.sub(c).multiplyScalar(lerp(1, k.la, this.W.la[i])).add(c); }
      const wt = this.W.torso[i] * clamp01(1 - this.W.ua[i] - this.W.la[i] - this.W.hand[i]) * (1 - sstep(Math.abs(p.x), uaX * 0.65, uaX));
      if (wt > 0) { p.x = lerp(p.x, p.x * k.tx, wt); p.z = lerp(p.z, rp.s2.z + (p.z - rp.s2.z) * k.tz, wt); }
      if (this.W.neck[i] > 0) { const c = seg(p, rp.neck, rp.head); p.sub(c).multiplyScalar(lerp(1, k.neck, this.W.neck[i])).add(c); }
      P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z;
    }
  }

  /** Smooths the front of the head into a calm porcelain form: no eyes, brows or mouth. */
  softenFace() {
    const g = this.body;
    const P = g.attributes.position.array;
    const n = P.length / 3;
    const { weld, nb } = neighbours(g);
    const hb = this.headBox;
    const c = hb.getCenter(V3());
    const size = hb.getSize(V3());
    const wgt = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      if (weld[i] !== i || this.W.head[i] < 0.5) continue;
      const z = (P[i * 3 + 2] - c.z) / (size.z / 2);
      const y = (P[i * 3 + 1] - hb.min.y) / size.y;
      // Front of the face only, from chin to brow.
      wgt[i] = sstep(z, -0.1, 0.4) * sstep(y, 0.04, 0.18) * (1 - sstep(y, 0.7, 0.84)) * this.W.head[i];
    }
    const tmp = new Float32Array(P.length);
    const iters = 40;
    for (let it = 0; it < iters; it++) {
      const lam = it % 2 ? -0.53 : 0.5; // Taubin smoothing keeps the volume
      tmp.set(P);
      for (let i = 0; i < n; i++) {
        if (!wgt[i]) continue;
        let sx = 0, sy = 0, sz = 0, k = 0;
        for (const j of nb[i]) { sx += P[j * 3]; sy += P[j * 3 + 1]; sz += P[j * 3 + 2]; k++; }
        if (!k) continue;
        const f = lam * wgt[i];
        tmp[i * 3] += (sx / k - P[i * 3]) * f;
        tmp[i * 3 + 1] += (sy / k - P[i * 3 + 1]) * f;
        tmp[i * 3 + 2] += (sz / k - P[i * 3 + 2]) * f;
      }
      P.set(tmp);
    }
    // Plain smoothing passes to melt the features further.
    for (let it = 0; it < 22; it++) {
      tmp.set(P);
      for (let i = 0; i < n; i++) {
        if (!wgt[i]) continue;
        let sx = 0, sy = 0, sz = 0, k = 0;
        for (const j of nb[i]) { sx += P[j * 3]; sy += P[j * 3 + 1]; sz += P[j * 3 + 2]; k++; }
        const f = 0.45 * wgt[i];
        tmp[i * 3] += (sx / k - P[i * 3]) * f;
        tmp[i * 3 + 1] += (sy / k - P[i * 3 + 1]) * f;
        tmp[i * 3 + 2] += (sz / k - P[i * 3 + 2]) * f;
      }
      P.set(tmp);
    }
    for (let i = 0; i < n; i++) if (weld[i] !== i) { const w = weld[i]; P[i * 3] = P[w * 3]; P[i * 3 + 1] = P[w * 3 + 1]; P[i * 3 + 2] = P[w * 3 + 2]; wgt[i] = wgt[w]; }
    // Recompute normals only where the surface changed; keep the authored normals elsewhere.
    const old = g.attributes.normal.array.slice();
    g.computeVertexNormals();
    const Nn = g.attributes.normal.array;
    for (let i = 0; i < n; i++) if (wgt[i] < 0.02) { Nn[i * 3] = old[i * 3]; Nn[i * 3 + 1] = old[i * 3 + 1]; Nn[i * 3 + 2] = old[i * 3 + 2]; }
  }

  materials(src) {
    if (this.realistic && src?.map) {
      // The MakeHuman skin texture, with a soft sheen for living skin in daylight; the groom's is
      // warmed toward the bride's tone.
      const skin = new T.MeshPhysicalMaterial({ map: src.map, color: this.kind === 'groom' ? '#d8b49b' : '#ffffff', roughness: 0.55, sheen: 0.3, sheenColor: new T.Color('#ffc4a0'), sheenRoughness: 0.7 });
      const hairSrc = Object.values(this.srcMats).find((m) => m !== src && /braid|short|bob|long|pony|hair/i.test(m.name));
      const hair = new T.MeshStandardMaterial({ map: hairSrc?.map || null, color: '#2a1d18', roughness: 0.5, alphaTest: 0.45, transparent: false, side: T.DoubleSide });
      return { skin, hair };
    }
    const skin = new T.MeshPhysicalMaterial({ color: this.kind === 'bride' ? '#b27d5a' : '#9c6748', roughness: 0.5, sheen: 0.35, sheenColor: new T.Color('#ffb48a'), sheenRoughness: 0.6, clearcoat: 0.12, clearcoatRoughness: 0.5 });
    const hair = new T.MeshStandardMaterial({ color: '#16100e', roughness: 0.42 });
    return { skin, hair };
  }

  /** Eyes, brows and lashes keep their own textures; brows and lashes are cut-outs. */
  cardMaterial(m, role) {
    const mat = m.clone();
    if (role === 'brows' || role === 'lashes') { mat.alphaTest = 0.5; mat.transparent = false; mat.depthWrite = true; mat.side = T.DoubleSide; }
    if (role === 'eyes') { mat.transparent = false; mat.roughness = 0.2; }
    return mat;
  }

  /** A garment from a body region: offset shell, relaxed so it drapes over the muscles, kept off the skin. */
  garment(offsetOf, mat, name, { iters = 8, clear = 0.01, keepTri, over = [], overClear = 0.012 } = {}) {
    const m = shellFrom(this.body, offsetOf, mat, keepTri);
    const extra = over.map((o) => colliderOf(o, overClear));
    const g = m.geometry;
    const P = g.attributes.position.array;
    const { weld, nb } = neighbours(g);
    const border = borderSet(g, weld);
    const tmp = new Float32Array(P.length);
    for (let it = 0; it < iters; it++) {
      tmp.set(P);
      for (let i = 0; i < P.length / 3; i++) {
        if (weld[i] !== i || nb[i].size < 3 || border.has(i)) continue;
        let sx = 0, sy = 0, sz = 0;
        for (const j of nb[i]) { sx += P[j * 3]; sy += P[j * 3 + 1]; sz += P[j * 3 + 2]; }
        const k = nb[i].size;
        tmp[i * 3] += (sx / k - P[i * 3]) * 0.55;
        tmp[i * 3 + 1] += (sy / k - P[i * 3 + 1]) * 0.55;
        tmp[i * 3 + 2] += (sz / k - P[i * 3 + 2]) * 0.55;
      }
      P.set(tmp);
      for (let i = 0; i < P.length / 3; i++) if (weld[i] !== i) { const w = weld[i]; P[i * 3] = P[w * 3]; P[i * 3 + 1] = P[w * 3 + 1]; P[i * 3 + 2] = P[w * 3 + 2]; }
      if (it % 3 === 2 || it === iters - 1) this.collide(P, clear, extra);
    }
    smoothBorder(g, weld, 4);
    this.collide(P, clear, extra);
    g.computeVertexNormals();
    return this.attach(g, mat, name);
  }

  attach(geo, mat, name) {
    const m = geo.isBufferGeometry ? new T.SkinnedMesh(geo, mat) : geo;
    if (!geo.isBufferGeometry) m.material = mat;
    m.name = name;
    this.root.add(m);
    m.bind(this.skeleton, new T.Matrix4());
    return m;
  }

  /** Outward offset per vertex, or -1 to leave the vertex out. */
  region(test) {
    const n = this.body.attributes.position.count;
    const out = new Float32Array(n);
    const P = this.body.attributes.position.array;
    for (let i = 0; i < n; i++) out[i] = test(i, P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    return (i) => out[i];
  }

  /** Cross-section of the body (legs and hips, no arms) at height y: centre and half extents. */
  section(y, band = 0.025, skip = ['hand', 'la', 'ua']) {
    const P = this.body.attributes.position.array;
    const n = P.length / 3;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < n; i++) {
      if (Math.abs(P[i * 3 + 1] - y) > band) continue;
      if (skip.some((k) => this.W[k][i] > 0.2)) continue;
      x0 = Math.min(x0, P[i * 3]); x1 = Math.max(x1, P[i * 3]);
      z0 = Math.min(z0, P[i * 3 + 2]); z1 = Math.max(z1, P[i * 3 + 2]);
    }
    if (!isFinite(x0)) return null;
    return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, rx: (x1 - x0) / 2, rz: (z1 - z0) / 2 };
  }

  /** Push points out of the body (and optional extra colliders) to a minimum clearance. */
  collide(pos, clearance, extra = []) {
    const P = this.body.attributes.position.array, N = this.body.attributes.normal.array;
    const v = V3();
    const sources = [{ P, N, grid: this.grid }, ...extra];
    for (let i = 0; i < pos.length / 3; i++) {
      v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      for (const s of sources) {
        const j = s.grid.nearest(v.x, v.y, v.z);
        if (j < 0) continue;
        const c = s.clear ?? clearance;
        const d = (v.x - s.P[j * 3]) * s.N[j * 3] + (v.y - s.P[j * 3 + 1]) * s.N[j * 3 + 1] + (v.z - s.P[j * 3 + 2]) * s.N[j * 3 + 2];
        if (d < c && d > -0.08) v.set(v.x + s.N[j * 3] * (c - d), v.y + s.N[j * 3 + 1] * (c - d), v.z + s.N[j * 3 + 2] * (c - d));
      }
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    }
  }

  /** Copy skin weights from the nearest body vertex, without arm bones, blended with given extra weights. */
  weightsNear(x, y, z, extra = [], noArms = true) {
    const SI = this.body.attributes.skinIndex.array, SW = this.body.attributes.skinWeight.array;
    let j = this.grid.nearest(x, y, z, noArms ? (v) => this.W.ua[v] + this.W.la[v] + this.W.hand[v] < 0.3 : null, 14);
    if (j < 0) j = this.grid.nearest(x, y, z, null, 20);
    const m = new Map();
    let keep = 1;
    for (const [b, w] of extra) { m.set(b, (m.get(b) || 0) + w); keep -= w; }
    if (j >= 0) for (let q = 0; q < 4; q++) {
      const b = SI[j * 4 + q], w = SW[j * 4 + q] * Math.max(0, keep);
      if (w) m.set(b, (m.get(b) || 0) + w);
    }
    const out = top4(m.entries());
    if (out[0][1] < 0.5) return [[this.boneIndex('spine_02'), 1], [0, 0], [0, 0], [0, 0]];
    return out;
  }

  /** A skirt (sari or daura) as a lathe-like tube from yTop to yBot, conforming and weighted to hips/legs. */
  skirt({ yTop, yBot, margin = 0.03, flare = 0.05, pleats = 0, seg = 72, rows = 28, legInfluence = 0.45, material }) {
    const pos = [], uv = [], si = [], sw = [];
    const pel = this.boneIndex('pelvis'), tl = this.boneIndex('thigh_l'), tr = this.boneIndex('thigh_r'), cl = this.boneIndex('calf_l'), cr = this.boneIndex('calf_r');
    const lx = this.restPos.thL.x;
    let prev = null;
    const secs = [];
    for (let r = 0; r <= rows; r++) {
      const y = lerp(yTop, yBot, r / rows);
      let s = this.section(Math.max(y, 0.06), 0.03) || prev;
      s = { ...s };
      if (prev) { s.rx = Math.max(s.rx, prev.rx); s.rz = Math.max(s.rz, prev.rz); s.cx = lerp(prev.cx, s.cx, 0.3); s.cz = lerp(prev.cz, s.cz, 0.3); }
      secs.push(s);
      prev = s;
    }
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const y = lerp(yTop, yBot, t);
      const s = secs[r];
      const fl = flare * Math.pow(t, 1.6);
      for (let c = 0; c <= seg; c++) {
        const a = (c / seg) * Math.PI * 2;
        const front = Math.cos(a);
        let rx = s.rx + margin + fl, rz = s.rz + margin + fl;
        let ripple = 0;
        if (pleats) {
          const inFront = sstep(front, 0.55, 0.85);
          ripple = Math.sin(a * pleats) * 0.012 * inFront * (0.3 + t);
          rz += inFront * 0.02 * t;
        }
        const x = s.cx + Math.sin(a) * (rx + ripple);
        const z = s.cz + Math.cos(a) * (rz + ripple);
        pos.push(x, y, z);
        uv.push(c / seg, 1 - t);
        const legW = legInfluence * Math.pow(t, 1.2);
        const side = clamp01(0.5 + (x * Math.sign(lx)) / (2 * Math.abs(lx) + 0.02));
        const thW = legW * (1 - 0.35 * t), caW = legW * 0.35 * t;
        const ws = top4([[pel, 1 - legW], [tl, thW * side], [tr, thW * (1 - side)], [cl, caW * side], [cr, caW * (1 - side)]]);
        ws.forEach(([b, w]) => { si.push(b); sw.push(w); });
      }
    }
    this.collide(pos, margin * 0.7);
    const idx = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < seg; c++) {
      const a = r * (seg + 1) + c, b = a + 1, d = a + seg + 1, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4));
    g.setIndex(idx);
    g.computeVertexNormals();
    return new T.SkinnedMesh(g, material);
  }

  /** Bangles, beads and caps are rigid: parent them to a bone in rest pose. */
  toBone(boneKey, obj) {
    this.root.updateMatrixWorld(true);
    this.bone[boneKey].attach(obj);
    return obj;
  }

  dressGroom() {
    const W = this.W;
    const hipY = this.restPos.thL.y + 0.04;
    const ivory = new T.MeshPhysicalMaterial({ color: '#ddd0b6', roughness: 0.7, sheen: 0.6, sheenColor: new T.Color('#fff4dc'), sheenRoughness: 0.55, side: T.DoubleSide });
    const ivory2 = new T.MeshPhysicalMaterial({ color: '#d6c9ae', roughness: 0.75, sheen: 0.5, sheenColor: new T.Color('#fff4dc'), sheenRoughness: 0.6 });
    const coat = new T.MeshPhysicalMaterial({ color: '#23262e', roughness: 0.62, sheen: 0.7, sheenColor: new T.Color('#6a7088'), sheenRoughness: 0.45 });
    const shoe = new T.MeshPhysicalMaterial({ color: '#120d0b', roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.3 });
    // Suruwal: loose at the thigh, narrow at the calf.
    const legs = this.region((i, x, y) => (W.thigh[i] + W.calf[i] + W.pelvis[i] > 0.5 && W.foot[i] < 0.2 && y < hipY + 0.02 ? 0.006 + 0.016 * sstep(y, 0.35, 0.75) : -1));
    this.garment(legs, ivory2, 'suruwal', { iters: 8, clear: 0.01 });
    // Daura: long sleeves and a fitted body that continues as a skirt to the knee.
    const daura = this.region((i, x, y) => ((W.torso[i] + W.ua[i] + W.la[i] + W.pelvis[i] * (y > hipY ? 1 : 0) + W.neck[i] * 0.4 > 0.55) && W.hand[i] < 0.25 && y > hipY - 0.02 && y < this.restPos.neck.y + 0.02 ? 0.01 + W.la[i] * 0.006 : -1));
    const dauraM = this.garment(daura, ivory, 'daura', { iters: 20, clear: this.realistic ? 0.026 : 0.02 });
    const kneeY = this.restPos.caL.y + 0.05;
    const dSkirt = this.skirt({ yTop: hipY + 0.06, yBot: kneeY, margin: 0.032, flare: 0.05, rows: 14, seg: 56, legInfluence: 0.5, material: ivory });
    const dSkirtM = this.attach(dSkirt.geometry, ivory, 'daura-skirt');
    // Istakot (waistcoat) over the daura, with a V neck.
    const neckY = this.restPos.neck.y;
    const vest = this.region((i, x, y, z) => {
      if (W.torso[i] + W.pelvis[i] + W.neck[i] < 0.55 || W.ua[i] > 0.4 || W.thigh[i] > 0.25 || W.head[i] > 0.02 || y < hipY - 0.03) return -1;
      if (Math.abs(x) > Math.abs(this.restPos.uaL.x) - 0.03) return -1;
      if (y > neckY - 0.02 && Math.abs(x) < 0.075) return -1; // collar opening
      const vDepth = neckY - y;
      if (z > 0.02 && Math.abs(x) < 0.075 * clamp01(1 - vDepth / 0.3)) return -1;
      return 0.026;
    });
    this.garment(vest, coat, 'istakot', { iters: 14, clear: 0.035, over: [dauraM, dSkirtM], overClear: 0.012 });
    // Shoes.
    const feet = this.region((i) => (W.foot[i] + W.calf[i] * 0.2 > 0.5 ? 0.006 : -1));
    this.garment(feet, shoe, 'shoes', { iters: 12, clear: 0.012 });
    // Brass buttons down the istakot.
    const btn = new T.MeshStandardMaterial({ color: '#d9ae5f', metalness: 1, roughness: 0.3 });
    for (let k = 0; k < 4; k++) {
      const y = neckY - 0.25 - k * 0.07;
      const s = this.section(y, 0.02, ['hand', 'la', 'ua']);
      if (!s) continue;
      const b = new T.Mesh(new T.SphereGeometry(0.008, 10, 8), btn);
      b.position.set(0, y, s.cz + s.rz + 0.03);
      this.toBone(k < 2 ? 's3' : 's2', b);
    }
    this.buildTopi();
    this.sashLocal = this.toBone('pelvis', new T.Object3D());
    this.sashLocal.position.copy(this.bone.pelvis.worldToLocal(V3(0.17, hipY + 0.1, 0.02)));
  }

  /** Dhaka topi: a tall, slightly asymmetric cap that sits forward on the head. */
  buildTopi() {
    const hb = this.headBox;
    const yB = hb.max.y - (this.realistic ? 0.1 : 0.085);
    const s = this.section(yB, 0.012, []);
    const hairPos = this.hair?.geometry.attributes.position.array;
    let rx = s.rx, rz = s.rz;
    if (hairPos) {
      for (let i = 0; i < hairPos.length / 3; i++) if (hairPos[i * 3 + 1] > yB - 0.01) {
        rx = Math.max(rx, Math.abs(hairPos[i * 3] - s.cx)); rz = Math.max(rz, Math.abs(hairPos[i * 3 + 2] - s.cz));
      }
    }
    rx += this.realistic ? 0.012 : 0.008; rz += this.realistic ? 0.012 : 0.008;
    const seg = 48, rows = 6;
    const pos = [], uv = [], idx = [];
    const heightAt = (a) => (this.realistic ? 0.088 : 0.1) + 0.028 * Math.cos(a - 0.5); // taller toward the front-left
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      for (let c = 0; c <= seg; c++) {
        const a = (c / seg) * Math.PI * 2;
        const k = 1 - 0.1 * t;
        pos.push(s.cx + Math.sin(a) * rx * k, yB + heightAt(a) * t - 0.012 * Math.cos(a), s.cz + Math.cos(a) * rz * k);
        uv.push(c / seg, t);
      }
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < seg; c++) {
      const a = r * (seg + 1) + c;
      idx.push(a, a + 1, a + seg + 1, a + 1, a + seg + 2, a + seg + 1);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const wall = new T.Mesh(g, new T.MeshStandardMaterial({ map: dhakaTex(), roughness: 0.82, side: T.DoubleSide }));
    // The top: a slanted lid following the upper rim, with a soft crease.
    const top = [];
    const tIdx = [];
    const cy = yB + 0.1;
    top.push(s.cx, cy + 0.012, s.cz);
    for (let c = 0; c <= seg; c++) {
      const a = (c / seg) * Math.PI * 2;
      top.push(s.cx + Math.sin(a) * rx * 0.9, yB + heightAt(a) - 0.012 * Math.cos(a), s.cz + Math.cos(a) * rz * 0.9);
      if (c) tIdx.push(0, c, c + 1);
    }
    const tg = new T.BufferGeometry();
    tg.setAttribute('position', new T.Float32BufferAttribute(top, 3));
    tg.setIndex(tIdx);
    tg.computeVertexNormals();
    const lid = new T.Mesh(tg, new T.MeshStandardMaterial({ color: '#2a1c1a', roughness: 0.8, side: T.DoubleSide }));
    const topi = new T.Group();
    topi.add(wall, lid);
    this.toBone('head', topi);
    this.topi = topi;
  }

  dressBride() {
    const W = this.W;
    const hipY = this.restPos.thL.y + 0.04;
    const neckY = this.restPos.neck.y;
    const sari = new T.MeshPhysicalMaterial({ map: sariTex(), roughness: 0.42, sheen: 1, sheenColor: new T.Color('#ff9474'), sheenRoughness: 0.35, side: T.DoubleSide });
    const blouse = new T.MeshPhysicalMaterial({ color: '#7d0a1b', roughness: 0.5, sheen: 0.9, sheenColor: new T.Color('#ff7c62'), sheenRoughness: 0.45 });
    // Cholo: fitted blouse to the waist with elbow sleeves.
    const cholo = this.region((i, x, y, z) => {
      if (W.torso[i] + W.ua[i] + W.pelvis[i] * 0.5 < 0.6 || W.la[i] > 0.35 || W.head[i] > 0.02 || W.neck[i] > 0.2 || y < hipY + 0.12 || y > neckY - 0.035) return -1;
      if (y > neckY - 0.09 && z > 0.02 && Math.abs(x) < 0.085) return -1; // scoop neckline
      return 0.006;
    });
    this.cholo = this.garment(cholo, blouse, 'cholo', { iters: 8, clear: 0.007 });
    // The pleated sari skirt to the floor with its gold border.
    const sk = this.skirt({ yTop: hipY + 0.17, yBot: 0.012, margin: 0.028, flare: 0.1, pleats: 26, rows: 34, seg: 84, legInfluence: 0.55, material: sari });
    this.attach(sk.geometry, sari, 'sari');
    const lx = Math.sign(this.restPos.uaL.x);
    this.buildPallu(new T.MeshPhysicalMaterial({ map: palluTex(), roughness: 0.42, sheen: 1, sheenColor: new T.Color('#ff9474'), sheenRoughness: 0.35, side: T.DoubleSide }), hipY, neckY, lx);
    this.buildGhumto(this.pallu.material);
    this.buildJewels();
    this.sashLocal = this.toBone('pelvis', new T.Object3D());
    this.sashLocal.position.copy(this.bone.pelvis.worldToLocal(V3(-0.15 * lx, hipY + 0.06, -0.02)));
  }

  /** Pallu: a clean band of sari from the right hip, across the chest, over the left shoulder and down the back. */
  buildPallu(mat, hipY, neckY, lx) {
    const sec = (y) => this.section(y, 0.03, ['hand', 'la', 'ua']);
    const surf = (x, y, side) => {
      const s = sec(y);
      const k = Math.sqrt(Math.max(0.05, 1 - ((x - s.cx) / (s.rx + 0.001)) ** 2));
      return V3(x, y, s.cz + side * s.rz * k);
    };
    const pts = [
      surf(-0.13 * lx, hipY + 0.1, 1), surf(-0.05 * lx, hipY + 0.27, 1), surf(0.06 * lx, neckY - 0.13, 1), surf(0.11 * lx, neckY - 0.045, 1),
      V3(0.125 * lx, neckY - 0.01, sec(neckY - 0.03).cz), surf(0.11 * lx, neckY - 0.08, -1), surf(0.08 * lx, hipY + 0.2, -1),
      surf(0.07 * lx, hipY + 0.06, -1).add(V3(0, 0, -0.02)),
    ];
    const curve = new T.CatmullRomCurve3(pts);
    const L = curve.getLength();
    const n = 70, m = 6;
    const P = this.body.attributes.position.array, N = this.body.attributes.normal.array;
    const pos = [], uv = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u);
      const j = this.grid.nearest(p.x, p.y, p.z, (v) => this.W.ua[v] + this.W.la[v] + this.W.hand[v] < 0.3, 14);
      const nrm = j >= 0 ? V3(N[j * 3], N[j * 3 + 1], N[j * 3 + 2]) : V3(0, 0, 1);
      const b = V3().crossVectors(t, nrm).normalize();
      const w = lerp(0.2, 0.12, sstep(u, 0.25, 0.42)) * (1 - sstep(u, 0.5, 0.62)) + lerp(0, 0.26, sstep(u, 0.5, 0.75));
      for (let k = 0; k <= m; k++) {
        const o = (k / m - 0.5) * w;
        pos.push(p.x + b.x * o, p.y + b.y * o, p.z + b.z * o);
        uv.push((u * L) / 0.5, k / m);
      }
    }
    const over = [colliderOf(this.cholo, 0.014)];
    for (let it = 0; it < 3; it++) this.collide(pos, 0.024, over);
    const si = [], sw = [];
    for (let i = 0; i < pos.length / 3; i++) this.weightsNear(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).forEach(([b, w]) => { si.push(b); sw.push(w); });
    const idx = [];
    for (let i = 0; i < n; i++) for (let k = 0; k < m; k++) {
      const a = i * (m + 1) + k;
      idx.push(a, a + m + 1, a + 1, a + 1, a + m + 1, a + m + 2);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4));
    g.setIndex(idx);
    g.computeVertexNormals();
    this.pallu = this.attach(g, mat, 'pallu');
  }

  /** Ghumto: the sari drawn over the head, framing the face and falling down the back. */
  buildGhumto(material) {
    const hb = this.headBox;
    const hc = hb.getCenter(V3());
    const hs = hb.getSize(V3()).multiplyScalar(0.5);
    const neckY = this.restPos.neck.y;
    const backBottom = this.restPos.thL.y + 0.02;
    const seg = 56, rowsH = 14, rowsB = 22;
    const rows = rowsH + rowsB;
    const pos = [], uv = [];
    const headI = this.boneIndex('Head');
    const hairGeo = this.hair?.geometry;
    const extra = hairGeo ? [{ P: hairGeo.attributes.position.array, N: hairGeo.attributes.normal.array, grid: new Grid(hairGeo.attributes.position.array, 0.03) }] : [];
    if (this.cholo) extra.push(colliderOf(this.cholo, 0.014));
    if (this.pallu) extra.push(colliderOf(this.pallu, 0.012));
    const sh = this.section(neckY - 0.05, 0.02, ['hand', 'la', 'ua']) || { cx: 0, cz: hc.z, rx: 0.2, rz: 0.12 };
    for (let r = 0; r <= rows; r++) {
      // The opening widens from nothing at the crown to frame the face, then only the back continues down.
      const tB = (r - rowsH) / rowsB;
      const phiMin = r <= rowsH ? 1.15 * sstep(r / rowsH, 0.22, 0.55) : lerp(1.15, 2.15, sstep(tB, 0, 0.3));
      for (let c = 0; c <= seg; c++) {
        const phi = phiMin + (c / seg) * (Math.PI * 2 - 2 * phiMin); // 0 = front
        const fx = Math.sin(phi), fz = Math.cos(phi);
        let x, y, z;
        if (r <= rowsH) {
          const th = (r / rowsH) * Math.PI * 0.6; // from crown to below the ear
          x = hc.x + fx * Math.sin(th) * (hs.x + 0.03);
          z = hc.z - 0.01 + fz * Math.sin(th) * (hs.z + 0.035) - (fz < 0 ? 0.02 * Math.sin(th) : 0);
          y = hc.y + 0.015 + Math.cos(th) * (hs.y + 0.03);
        } else {
          const yEar = hc.y + 0.015 + Math.cos(Math.PI * 0.6) * (hs.y + 0.03);
          y = lerp(yEar, backBottom, tB);
          const sec = this.section(Math.min(y, neckY - 0.06), 0.03, ['hand', 'la', 'ua']) || sh;
          const k = sstep(y, neckY - 0.08, yEar);
          const rx = lerp(sec.rx + 0.04, hs.x + 0.03, k);
          const rz = lerp(sec.rz + 0.04, hs.z + 0.03, k);
          x = lerp(sec.cx, hc.x, k) + fx * rx;
          z = lerp(sec.cz, hc.z - 0.01, k) + fz * rz;
        }
        pos.push(x, y, z);
        uv.push((r / rows) * 3, c / seg);
      }
    }
    for (let it = 0; it < 2; it++) this.collide(pos, 0.016, extra);
    const si = [], sw = [];
    for (let i = 0; i < pos.length / 3; i++) {
      const r = Math.floor(i / (seg + 1));
      const hw = r <= rowsH ? 1 : 1 - sstep(r - rowsH, 0, 5);
      const ws = hw >= 1 ? [[headI, 1], [0, 0], [0, 0], [0, 0]] : this.weightsNear(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], [[headI, hw]]);
      ws.forEach(([b, w]) => { si.push(b); sw.push(w); });
    }
    const idx = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < seg; c++) {
      const a = r * (seg + 1) + c, b2 = a + 1, d = a + seg + 1, e = d + 1;
      idx.push(a, b2, d, b2, e, d);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4));
    g.setIndex(idx);
    g.computeVertexNormals();
    this.ghumto = this.attach(g, material, 'ghumto');
  }

  buildJewels() {
    const gold = new T.MeshStandardMaterial({ color: '#e0b25a', metalness: 1, roughness: 0.26 });
    const red = new T.MeshPhysicalMaterial({ color: '#b0102a', roughness: 0.18, clearcoat: 1 });
    const green = new T.MeshPhysicalMaterial({ color: '#1f8a3a', roughness: 0.2, clearcoat: 1 });
    // Chura: red and gold bangles on both wrists.
    for (const side of ['L', 'R']) {
      const la = this.restPos[`la${side}`], ha = this.restPos[`ha${side}`];
      const axis = V3().subVectors(ha, la).normalize();
      const q = new T.Quaternion().setFromUnitVectors(V3(0, 0, 1), axis);
      const ring = new T.TorusGeometry(0.043, 0.0055, 6, 22);
      const n = 9;
      const inst = [new T.InstancedMesh(ring, red, n), new T.InstancedMesh(ring, gold, n)];
      const d = new T.Object3D();
      const counts = [0, 0];
      for (let k = 0; k < n; k++) {
        const which = k % 3 === 2 ? 1 : 0;
        d.position.copy(ha).addScaledVector(axis, -0.03 - k * 0.012);
        d.quaternion.copy(q);
        d.scale.setScalar(1 + k * 0.035);
        d.updateMatrix();
        inst[which].setMatrixAt(counts[which]++, d.matrix);
      }
      inst.forEach((m, w) => { m.count = counts[w]; m.instanceMatrix.needsUpdate = true; this.toBone(`la${side}`, m); });
    }
    // Pote: strands of green glass beads with a gold tilhari (appear with the sindoor).
    const neck = this.restPos.neck;
    const potes = new T.Group();
    const strand = (drop, off) => {
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const c = Math.cos(a);
        const front = Math.max(0, c);
        pts.push(V3(neck.x + Math.sin(a) * (0.075 + off), neck.y - 0.03 - Math.pow(front, 1.4) * drop, neck.z - 0.005 + c * (0.07 + off)));
      }
      const flat = new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z]));
      this.collide(flat, 0.016);
      return Array.from({ length: pts.length }, (_, i) => V3(flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]));
    };
    const beads = new T.InstancedMesh(new T.SphereGeometry(1, 6, 5), green, 260);
    const d = new T.Object3D();
    let n = 0;
    for (const [drop, off] of [[0.17, 0.004], [0.2, 0.01], [0.23, 0.016]]) {
      const curve = new T.CatmullRomCurve3(strand(drop, off), true);
      const m = Math.floor(curve.getLength() / 0.0085);
      for (let i = 0; i < m && n < 260; i++) {
        d.position.copy(curve.getPointAt(i / m));
        d.scale.setScalar(0.0042);
        d.updateMatrix();
        beads.setMatrixAt(n++, d.matrix);
      }
    }
    beads.count = n;
    potes.add(beads);
    const low = strand(0.235, 0.016).reduce((a, p) => (p.y < a.y ? p : a));
    const til = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.075, 18), gold);
    til.position.copy(low).add(V3(0, -0.04, 0.012));
    potes.add(til);
    const cap = new T.Mesh(new T.SphereGeometry(0.016, 14, 10), gold);
    cap.position.copy(til.position).add(V3(0, -0.04, 0));
    potes.add(cap);
    this.toBone('s3', potes);
    this.pote = potes;
    // The sindoor line in the hair parting (shown after the sindoor is given).
    const hb = this.headBox;
    // Visible where the parting meets the forehead, just below the ghumto's edge.
    const y = hb.min.y + (hb.max.y - hb.min.y) * 0.86;
    const sec = this.section(y, 0.01, []) || { cx: 0, cz: hb.getCenter(V3()).z, rz: 0.09 };
    const line = new T.Mesh(new T.CapsuleGeometry(0.004, 0.032, 4, 8), new T.MeshStandardMaterial({ color: '#d0101e', emissive: '#6a0000', roughness: 0.6 }));
    line.position.set(hb.getCenter(V3()).x, y + 0.012, sec.cz + sec.rz - 0.012);
    line.rotation.x = -0.45;
    this.toBone('head', line);
    this.sindoorLine = line;
  }

  /** World position of a point in this figure's local frame. */
  local(x, y, z) { return this.root.localToWorld(V3(x, y, z)); }
  /** Like local(), but +x is always this figure's own left. */
  side(x, y, z) { return this.local(x * Math.sign(this.restPos.uaL.x), y, z); }

  /** Points that follow the body (head centre, shoulder tops, chest) for contacts and garlands. */
  buildMarkers() {
    const hb = this.headBox;
    const hs = hb.getSize(V3()).multiplyScalar(0.5);
    const mk = (bone, p) => { const o = new T.Object3D(); o.position.copy(p); this.toBone(bone, o); return o; };
    const n = this.restPos.neck;
    const lx = Math.sign(this.restPos.uaL.x);
    const chestY = (this.restPos.s3.y + n.y) / 2 - 0.05;
    const cs = this.section(chestY, 0.03, ['hand', 'la', 'ua']) || { cx: 0, cz: n.z + 0.02, rx: 0.16, rz: 0.12 };
    const cloth = this.kind === 'bride' ? 0.03 : 0.02; // ghumto/pallu or daura/istakot thickness
    this.mk = {
      head: mk('head', hb.getCenter(V3())),
      headR: Math.max(hs.x, hs.z) + (this.kind === 'bride' ? 0.03 : 0.0),
      shL: mk('s3', V3(n.x + 0.095 * lx, n.y - 0.03 + cloth * 0.5, n.z + 0.005)),
      shR: mk('s3', V3(n.x - 0.095 * lx, n.y - 0.03 + cloth * 0.5, n.z + 0.005)),
      chest: mk('s3', V3(cs.cx, chestY, cs.cz)),
      chestR: [cs.rx + cloth, 0.2, cs.rz + cloth],
    };
  }
  at(key) { return this.mk[key].getWorldPosition(V3()); }
  forward() { return V3(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y)); }

  /**
   * Place and animate. `pos` and `yaw` set the figure; the walk blends in with speed,
   * and the stepping follows distance travelled so feet do not slide.
   */
  pose(pos, yaw, dt, time, { hold = false, look = null } = {}) {
    const r = this.root;
    const moved = this.last ? Math.hypot(pos.x - this.last.x, pos.z - this.last.z) : 0;
    this.last = pos.clone();
    r.position.copy(pos);
    r.rotation.y = yaw;
    const speed = dt > 0 ? moved / dt : 0;
    const target = hold ? 1 : clamp01((speed - 0.08) / 0.3);
    // Cross-fade walk and idle over about a third of a second (a jump, e.g. a chapter link, snaps).
    if (moved > 0.6) this.walkW = target;
    else this.walkW += (target - this.walkW) * (1 - Math.exp(-dt * 7));
    if (moved < 0.6) this.dist += moved;
    const w = this.walkW;
    const wd = this.walk.getClip().duration;
    this.walk.time = ((this.dist / this.stride) % 1) * wd + (hold && !moved ? (time * 0.75) % wd : 0);
    this.idle.time = time % this.idle.getClip().duration;
    this.walk.setEffectiveWeight(w);
    this.idle.setEffectiveWeight(1 - w);
    this.mixer.update(0);
    // Calm the idle: relaxed hands, feet a little closer, softer shoulders.
    for (const b of this.bones) if (FINGER.test(b.name)) b.quaternion.slerp(this.rest.get(b), 0.78);
    const still = 1 - w;
    {
      // A calm, closed stance; the sari also keeps the bride's steps short.
      const k = this.kind === 'bride' ? lerp(0.92, 0.45, w) : lerp(0.7, 0, w);
      for (const key of ['thL', 'thR', 'caL', 'caR', 'ftL', 'ftR']) this.bone[key].quaternion.slerp(this.rest.get(this.bone[key]), k);
    }
    const nar = 0;
    this.addRot('thL', 'z', nar * still);
    this.addRot('thR', 'z', -nar * still);
    this.addRot('ftL', 'z', -nar * still);
    this.addRot('ftR', 'z', nar * still);
    // Life in the stillness: breathing, a slow weight shift from foot to foot, a drifting gaze.
    const ph = this.kind === 'bride' ? 1.7 : 0;
    const breath = Math.sin(time * 1.35 + ph);
    this.addRot('s2', 'x', breath * 0.012);
    this.addRot('s3', 'x', breath * 0.01);
    const shift = Math.sin(time * 0.29 + ph) * still;
    this.addRot('pelvis', 'z', shift * 0.03);
    this.addRot('s1', 'z', -shift * 0.022);
    this.addRot('s3', 'z', -shift * 0.01);
    if (this.bow) { this.addRot('s2', 'x', this.bow * 0.22); this.addRot('s3', 'x', this.bow * 0.18); this.addRot('neck', 'x', this.bow * 0.2); }
    if (this.headDip) this.addRot('head', 'x', this.headDip * 0.35);
    // Head turns toward whatever the figure attends to (eased), with a small idle drift.
    let yawTo = Math.sin(time * 0.21 + ph * 2) * 0.1 * still;
    let pitchTo = 0;
    if (look) {
      r.updateMatrixWorld(true);
      const h = this.bone.head.getWorldPosition(V3());
      const d = V3().subVectors(look, h);
      const f = this.forward();
      const side = V3(f.z, 0, -f.x);
      yawTo = Math.max(-0.75, Math.min(0.75, Math.atan2(d.dot(side), d.dot(f))));
      pitchTo = Math.max(-0.35, Math.min(0.3, -Math.atan2(d.y, Math.hypot(d.dot(side), d.dot(f)))));
    }
    const kk = moved > 0.6 || !dt ? 1 : 1 - Math.exp(-dt * 3);
    this.gazeYaw = (this.gazeYaw ?? yawTo) + (yawTo - (this.gazeYaw ?? yawTo)) * kk;
    this.gazePitch = (this.gazePitch ?? pitchTo) + (pitchTo - (this.gazePitch ?? pitchTo)) * kk;
    this.addRot('neck', 'y', this.gazeYaw * 0.35);
    this.addRot('head', 'y', this.gazeYaw * 0.55);
    this.addRot('head', 'x', this.gazePitch * 0.6);
    r.updateMatrixWorld(true);
    this.solveArms();
  }

  /** Rotate a bone about a world axis (character frame) by `a` radians. */
  addRot(key, axis, a) {
    if (!a) return;
    const b = this.bone[key];
    const ax = axis === 'x' ? V3(1, 0, 0) : axis === 'y' ? V3(0, 1, 0) : V3(0, 0, 1);
    ax.applyQuaternion(this.root.quaternion);
    const pq = b.parent.getWorldQuaternion(new T.Quaternion());
    const q = new T.Quaternion().setFromAxisAngle(ax, a);
    // local' = parent^-1 * q * parent * local
    b.quaternion.premultiply(pq.clone().invert().multiply(q).multiply(pq));
    b.updateMatrixWorld(true);
  }

  /** Arm IK toward world targets set in this.ik.L / this.ik.R ({ p, w, pole }). */
  solveArms() {
    for (const side of ['L', 'R']) {
      const t = this.ik[side];
      if (!t || t.w <= 0.001) continue;
      const up = this.bone[`ua${side}`], lo = this.bone[`la${side}`], ha = this.bone[`ha${side}`];
      const sgn = side === 'L' ? 1 : -1;
      const pole = t.pole || this.root.localToWorld(V3(0.55 * sgn * Math.sign(this.restPos.uaL.x), 0.6, -0.5));
      twoBoneIK(up, lo, ha, t.p, pole, t.w);
    }
  }

  handPos(side) {
    const h = this.bone[`ha${side}`];
    const p = h.getWorldPosition(V3());
    // Toward the palm centre.
    const kid = h.children.find((c) => /middle_01/.test(c.name));
    if (kid) p.lerp(kid.getWorldPosition(V3()), 0.7);
    return p;
  }
}

const _qa = new T.Quaternion(), _qb = new T.Quaternion();
function rotateWorld(bone, from, to) {
  const q = _qa.setFromUnitVectors(from, to);
  const pq = bone.parent.getWorldQuaternion(_qb);
  const inv = pq.clone().invert();
  bone.quaternion.premultiply(inv.multiply(q).multiply(pq));
  bone.updateMatrixWorld(true);
}

/** Analytic two-bone IK with a pole target, blended over the animated pose by w. */
function twoBoneIK(upper, lower, hand, target, pole, w) {
  const q0u = upper.quaternion.clone(), q0l = lower.quaternion.clone();
  const a = upper.getWorldPosition(V3()), b = lower.getWorldPosition(V3()), c = hand.getWorldPosition(V3());
  const l1 = a.distanceTo(b), l2 = b.distanceTo(c);
  const toT = V3().subVectors(target, a);
  const d = Math.min(Math.max(toT.length(), 0.02), (l1 + l2) * 0.995);
  const dir = toT.normalize();
  const cosA = Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const p = V3().subVectors(pole, a);
  p.addScaledVector(dir, -p.dot(dir));
  if (p.lengthSq() < 1e-8) p.set(0, -1, 0);
  p.normalize();
  const bNew = a.clone().addScaledVector(dir, l1 * cosA).addScaledVector(p, l1 * sinA);
  rotateWorld(upper, V3().subVectors(b, a).normalize(), V3().subVectors(bNew, a).normalize());
  const b2 = lower.getWorldPosition(V3()), c2 = hand.getWorldPosition(V3());
  const tClamped = a.clone().addScaledVector(dir, d);
  rotateWorld(lower, V3().subVectors(c2, b2).normalize(), V3().subVectors(tClamped, b2).normalize());
  if (w < 1) {
    upper.quaternion.copy(q0u.slerp(upper.quaternion, w));
    lower.quaternion.copy(q0l.slerp(lower.quaternion, w));
    upper.updateMatrixWorld(true);
  }
}

/** A cloth ribbon between two moving points (the ganthbandhan). */
class Ribbon {
  constructor(material, n = 26, width = 0.055) {
    this.n = n;
    this.w = width;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array((n + 1) * 2 * 3), 3));
    const idx = [];
    for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.mesh = new T.Mesh(g, material);
    this.mesh.frustumCulled = false;
  }
  update(a, b, sag, time) {
    const P = this.mesh.geometry.attributes.position;
    const side = V3().subVectors(b, a).cross(V3(0, 1, 0)).normalize();
    for (let i = 0; i <= this.n; i++) {
      const t = i / this.n;
      const p = V3().lerpVectors(a, b, t);
      p.y -= sag * 4 * t * (1 - t);
      const tw = Math.sin(t * Math.PI * 2 + time * 1.3) * 0.5 + 0.9;
      const s = side.clone().multiplyScalar(this.w * 0.5);
      s.applyAxisAngle(V3().subVectors(b, a).normalize(), tw);
      P.setXYZ(i * 2, p.x + s.x, p.y + s.y, p.z + s.z);
      P.setXYZ(i * 2 + 1, p.x - s.x, p.y - s.y, p.z - s.z);
    }
    P.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }
}

// ───────────── The view ─────────────

export function placeMala(mala, giver, receiver, state, t, up, dropF, fromHands = false) {
  const fR = receiver.forward();
  const sR = V3(fR.z, 0, -fR.x); // receiver's left
  const wornA = receiver.at('shR'); // the giver's left hand ends on the receiver's right shoulder
  const wornB = receiver.at('shL');
  const worn = { depth: 0.1, dropF, dropB: 0.03, bulge: 0.08 };
  if (state === 'worn') {
    if (fromHands) return;
    mala.shape(wornA, wornB, fR, up, worn);
    fitMala(mala, receiver);
    mala.commit();
    return;
  }
  const headC = receiver.at('head');
  const hr = receiver.mk.headR * receiver.scale;
  const over = headC.clone().addScaledVector(up, hr + 0.07);
  const heldA = giver.side(0.14, 1.0, 0.27), heldB = giver.side(-0.14, 1.0, 0.27);
  const liftA = giver.side(0.15, 1.3, 0.33), liftB = giver.side(-0.15, 1.3, 0.33);
  const overA = over.clone().addScaledVector(sR, -0.16), overB = over.clone().addScaledVector(sR, 0.16);
  const downA = wornA.clone().addScaledVector(up, 0.025).addScaledVector(fR, 0.01);
  const downB = wornB.clone().addScaledVector(up, 0.025).addScaledVector(fR, 0.01);
  let a, b, opt;
  if (state === 'held') {
    a = heldA; b = heldB;
    opt = { depth: 0.04, dropF: 0.27, dropB: 0.25, bulge: 0 };
  } else {
    const u = clamp01(t / 0.82);
    const path = (p0, p1, p2, p3) => new T.CatmullRomCurve3([p0, p1, p2, p3], false, 'centripetal').getPoint(ease(u));
    a = path(heldA, liftA, overA, downA);
    b = path(heldB, liftB, overB, downB);
    // Wide enough to pass over the head until the hands are below the chin, then it settles.
    const clear = hr + 0.05;
    const k1 = sstep(u, 0.15, 0.45), k2 = sstep(u, 0.8, 1);
    opt = {
      depth: lerp(lerp(0.04, clear, k1), worn.depth, k2),
      dropF: lerp(lerp(0.27, 0.24, k1), dropF, k2),
      dropB: lerp(lerp(0.25, 0.14, k1), worn.dropB, k2),
      bulge: worn.bulge * k2,
    };
  }
  // The hands stay on the garland until it rests on the shoulders, then let go.
  const grip = state === 'moving' ? 1 - sstep(t, 0.88, 1) : 1;
  if (!fromHands) {
    giver.ik.L = { p: a.clone(), w: grip, pole: giver.side(0.7, 0.55, -0.1) }; // elbows out and down, softly bent
    giver.ik.R = { p: b.clone(), w: grip, pole: giver.side(-0.7, 0.55, -0.1) };
    return;
  }
  // Shape from the real hands (they may fall a little short of the targets); as the grip
  // releases, the ends settle onto the shoulders.
  const settle = state === 'moving' ? sstep(t, 0.86, 1) : 0;
  const A = giver.handPos('L').lerp(downA, settle);
  const B = giver.handPos('R').lerp(downB, settle);
  mala.shape(A, B, fR, up, opt);
  if (state === 'moving') fitMala(mala, receiver);
  mala.commit();
}

/** Keep a garland on the surface of the receiver: outside the head and the chest. */
function fitMala(mala, R) {
  const s = R.scale;
  const hc = R.at('head');
  const hr = R.mk.headR * s + 0.035;
  const cc = R.at('chest');
  const [rx, ry, rz] = R.mk.chestR;
  const m = 0.03;
  const fR = R.forward();
  const sR = V3(fR.z, 0, -fR.x);
  const d = V3();
  for (const p of mala.pts) {
    d.subVectors(p, hc);
    if (d.length() < hr) p.copy(hc).addScaledVector(d.normalize(), hr);
    d.subVectors(p, cc);
    const ex = rx * s + m, ey = ry * s + m, ez = rz * s + m;
    const lx = d.dot(sR) / ex, ly = d.y / ey, lz = d.dot(fR) / ez;
    const len = Math.hypot(lx, ly, lz);
    if (len < 1 && len > 1e-4) {
      p.copy(cc).addScaledVector(sR, (lx / len) * ex).addScaledVector(fR, (lz / len) * ez);
      p.y = cc.y + (ly / len) * ey;
    }
  }
}


export { Figure, Mala, Ribbon, loadAssets, blobTex, PLAT, marigoldGeometry, marigoldMaterial, MARIGOLD_COLS };
