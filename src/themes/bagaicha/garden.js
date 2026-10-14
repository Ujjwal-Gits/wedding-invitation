// Bagaicha: a hand-built 3D garden venue. A Rana-era white rotunda with a gilt
// gajur, an aisle of flower arches, a long reflecting pool, a waterfall on a
// rocky cliff, a chautari peepal hung with lanterns, and Machhapuchhre beyond.
// Everything is procedural; the only photographs are the mountain backplate and
// the couple's own portraits on easels. Time of day follows the scroll.
import * as THREE from 'three';
import { dprCap, createGovernor, onTabHidden } from './perf.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Figure, Mala, Ribbon, loadAssets as loadCoupleAssets, placeMala, marigoldGeometry, marigoldMaterial } from './couple3d.js';
import { roseGeometry, wisteriaGeometry, ROSE_MAT, WISTERIA_MAT, scatter, aroundCurve, faceEuler } from './florals.js';
import { loadFloraAssets, crownGeometry, leafMaterial, plantSpecies, trunkGeometry, grassField, lawnMask } from './flora.js';
import { loadImpostors, plantImpostors, impostorLight } from './impostor.js';
import { WATER_FALL, PLUNGE, POOL_REFLECT, SKY, BACKPLATE, GLOW, MIST, FLAME, PETALS } from './shaders.js';

const { Vector3, Color, MathUtils } = THREE;
const TAU = Math.PI * 2;
const v3 = (x, y, z) => new Vector3(x, y, z);
const col = (h) => new Color(h);
const smooth = (t) => t * t * (3 - 2 * t);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// Deterministic randomness so the garden is the same for every guest.
function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash3 = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = smooth(xf), v = smooth(yf);
  const h = (a, b) => hash3(a, b, 0.5);
  return MathUtils.lerp(MathUtils.lerp(h(xi, yi), h(xi + 1, yi), u), MathUtils.lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15;

/** Moves each vertex by a hash of its position, so shared corners stay welded. */
/** Jitter, then weld and smooth the normals: organic shapes read soft instead of faceted. */
function soft(geo, amt, seed = 0) {
  jitter(geo, amt, seed);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const g = mergeVertices(geo, 1e-3);
  g.computeVertexNormals();
  return g;
}
function jitter(geo, amt, seed = 0) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = Math.round(x * 97) + seed, l = Math.round(y * 97), m = Math.round(z * 97);
    p.setXYZ(i, x + (hash3(k, l, m) - 0.5) * amt, y + (hash3(l, m, k) - 0.5) * amt, z + (hash3(m, k, l) - 0.5) * amt);
  }
  geo.computeVertexNormals();
  return geo;
}
const ni = (g) => (g.index ? g.toNonIndexed() : g);
function paint(geo, hex) {
  const c = col(hex);
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
const place = (g, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => {
  const m = new THREE.Matrix4().compose(v3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new Vector3(s, s, s).set(...(Array.isArray(s) ? s : [s, s, s])));
  return g.applyMatrix4(m);
};
const merge = (list) => {
  const keepUv = list.every((g) => g.attributes.uv);
  return mergeGeometries(list.map((g) => { const n = ni(g); if (!keepUv) n.deleteAttribute('uv'); return n; }), false);
};

function canvasTex(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

// ───────────────────────── Time of day ─────────────────────────
// 0 morning, 1 golden hour, 1.5 dusk, 2 night with lanterns.
const KEYS = [
  { t: 0, top: '#93B9D6', hor: '#F2EBDD', sun: '#FFF1DA', sunI: 2.3, dir: [0.62, 0.7, 0.36], hemS: '#E3ECEF', hemG: '#8C9A6C', hemI: 1.25, fog: '#E6E4D8', fogN: 70, fogF: 420, exp: 1.0, lan: 0, haze: 0.22, plate: '#E9EEF2', plateAmt: 0.22, plateB: 1.1, night: 0, couple: '#FFFFFF', water: '#6E9EA3', stars: 0 },
  { t: 1, top: '#6C8DB6', hor: '#F5C089', sun: '#FFB062', sunI: 2.9, dir: [0.3, 0.2, -1], hemS: '#F2D3A8', hemG: '#6E6A3E', hemI: 1.08, fog: '#EEC394', fogN: 60, fogF: 400, exp: 1.12, lan: 0.35, haze: 0.12, plate: '#FFD7A6', plateAmt: 0.0, plateB: 1.0, night: 0, couple: '#FFE7CE', water: '#C9A47C', stars: 0 },
  { t: 1.5, top: '#35477A', hor: '#E39A78', sun: '#FF9A66', sunI: 1.1, dir: [0.4, 0.08, -1], hemS: '#9C8EAA', hemG: '#4A4236', hemI: 0.9, fog: '#7A6478', fogN: 50, fogF: 340, exp: 1.12, lan: 0.8, haze: 0.2, plate: '#C88A84', plateAmt: 0.3, plateB: 0.62, night: 0.35, couple: '#E4B996', water: '#6A5A70', stars: 0.25 },
  { t: 2, top: '#11214A', hor: '#3A4F7A', sun: '#AFC2EC', sunI: 0.8, dir: [-0.35, 0.62, 0.3], hemS: '#6479A8', hemG: '#2A3040', hemI: 1.2, fog: '#26365A', fogN: 45, fogF: 300, exp: 1.32, lan: 1, haze: 0.35, plate: '#3A4C78', plateAmt: 0.92, plateB: 0.5, night: 1, couple: '#D9B08C', water: '#1A2848', stars: 1 },
];
const COLOR_KEYS = ['top', 'hor', 'sun', 'hemS', 'hemG', 'fog', 'plate', 'couple', 'water'];
function lightAt(tod) {
  let i = 0;
  while (i < KEYS.length - 2 && tod > KEYS[i + 1].t) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const f = smooth(clamp01((tod - a.t) / (b.t - a.t)));
  const o = {};
  for (const k of Object.keys(a)) {
    if (k === 't') continue;
    if (COLOR_KEYS.includes(k)) o[k] = col(a[k]).lerp(col(b[k]), f);
    else if (k === 'dir') o.dir = v3(...a.dir).lerp(v3(...b.dir), f).normalize();
    else o[k] = MathUtils.lerp(a[k], b[k], f);
  }
  return o;
}

// ───────────────────────── Layout ─────────────────────────
export const LAYOUT = {
  pool: { x0: -3, x1: 3, z0: 8, z1: 38 },
  pavilion: v3(0, 0, -32),
  entrance: 80,
  platformY: 0.75,
  arches: [5, -4, -13],
  cliff: { pos: v3(-34, 0, -58), rot: 0.5 },
  swing: v3(16, 0, 13),
  chautari: v3(24, 0, -36),
  easelX: -11,
  easelZ: [33, 26.5, 20, 13.5, 7],
};
// The couple's path: aisle → pavilion → down the side steps → the chautari.
const COUPLE_PATH = [v3(0, 0, 7.5), v3(0, 0, -24.4), v3(0, 0, -30.2), v3(4.2, 0, -27.2), v3(9, 0, -23.5), v3(20.5, 0, -27.5), v3(22.2, 0, -30.4)];

function groundY(x, z) {
  const r = Math.hypot(x - LAYOUT.pavilion.x, z - LAYOUT.pavilion.z);
  // the steps as a gentle ramp, so the figures never pop up a riser
  if (r < 6.6) return 0.75;
  if (r < 7.55) return 0.75 * (1 - (r - 6.6) / 0.95);
  return 0;
}
function pathPoint(s) {
  let rest = Math.max(0, s);
  for (let i = 0; i < COUPLE_PATH.length - 1; i++) {
    const a = COUPLE_PATH[i], b = COUPLE_PATH[i + 1];
    const len = a.distanceTo(b);
    if (rest <= len || i === COUPLE_PATH.length - 2) {
      const f = Math.min(1, rest / len);
      const p = a.clone().lerp(b, f);
      return { p, dir: b.clone().sub(a).normalize() };
    }
    rest -= len;
  }
  return { p: COUPLE_PATH[0].clone(), dir: v3(0, 0, -1) };
}
const pathLen = (upto) => {
  let s = 0;
  for (let i = 0; i < Math.min(upto, COUPLE_PATH.length - 1); i++) s += COUPLE_PATH[i].distanceTo(COUPLE_PATH[i + 1]);
  return s;
};
const cliffToWorld = (x, y, z) => {
  const { pos, rot } = LAYOUT.cliff;
  const c = Math.cos(rot), s = Math.sin(rot);
  return v3(pos.x + x * c + z * s, pos.y + y, pos.z - x * s + z * c);
};

/** Adds a world-space leaf speckle to a Lambert material (hedges, crowns). */
function leafy(mat, scale = 9, amt = 0.32) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWp;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp4 = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4;
        #endif
        vWp = (modelMatrix * wp4).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWp;
        float lh0(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        float lh(vec3 p) {
          vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(lh0(i), lh0(i + vec3(1, 0, 0)), f.x), mix(lh0(i + vec3(0, 1, 0)), lh0(i + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(lh0(i + vec3(0, 0, 1)), lh0(i + vec3(1, 0, 1)), f.x), mix(lh0(i + vec3(0, 1, 1)), lh0(i + vec3(1, 1, 1)), f.x), f.y), f.z);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float ln = lh(vWp * ${scale.toFixed(1)}) * 0.6 + lh(vWp * ${(scale * 2.3).toFixed(1)} + 3.1) * 0.4;
        diffuseColor.rgb *= ${(1 - amt).toFixed(2)} + ${(amt * 1.6).toFixed(2)} * ln;`);
  };
  return mat;
}

// ───────────────────────── Materials ─────────────────────────
function materials() {
  const L = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
  return {
    stone: L('#F3F2EF'),
    stoneWarm: L('#E4E1DB'),
    coping: L('#EEEDEA'),
    frame: L('#C9A65C', { emissive: '#4A3510', emissiveIntensity: 0.5 }),
    gold: new THREE.MeshStandardMaterial({ color: '#D2A754', metalness: 0.55, roughness: 0.38, emissive: '#3A2808', emissiveIntensity: 0.6 }),
    brass: L('#B98C3E', { emissive: '#2a1a06' }),
    wood: L('#8D6B4B'),
    woodLight: L('#B48B62'),
    bark: L('#6A5442'),
    foliage: leafy(L('#FFFFFF', { vertexColors: true }), 7, 0.2),
    hedge: leafy(L('#56734B'), 11, 0.34),
    gravel: null,
    runner: L('#FAFAF8'),
    chair: L('#F7F6F3'),
    cushion: L('#E8C3B9'),
    fabric: L('#FBFBFA', { side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
    haldi: L('#E2AA2C', { side: THREE.DoubleSide }),
    rock: L('#FFFFFF', { vertexColors: true, flatShading: true }),
    cliffRock: L('#FFFFFF', { vertexColors: true }),
    flowers: L('#FFFFFF', { flatShading: true, vertexColors: true }),
    lantern: L('#C9A766', { emissive: '#FFB55A', emissiveIntensity: 0 }),
    paperLantern: L('#F3D8B0', { emissive: '#FFA040', emissiveIntensity: 0 }),
    brick: L('#B7735A'),
    cloth: L('#F8F8F6'),
    green: L('#5F7E52'),
    rug: null,
  };
}

// ───────────────────────── Builders ─────────────────────────
function lawnTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8FA36C';
    g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, 'rgba(255,255,230,0.06)'); grd.addColorStop(0.46, 'rgba(255,255,230,0.06)');
    grd.addColorStop(0.54, 'rgba(30,50,10,0.045)'); grd.addColorStop(1, 'rgba(30,50,10,0.045)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 9000; i++) {
      const v = r();
      g.fillStyle = v < 0.5 ? `rgba(60,85,40,${0.12 + r() * 0.15})` : `rgba(200,215,150,${0.08 + r() * 0.12})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 2 + r() * 4);
    }
  }, { repeat: [60, 60] });
}
function gravelTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#E3E2DD';
    g.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let i = 0; i < 3500; i++) {
      const l = 200 + r() * 50;
      g.fillStyle = `rgba(${l},${l - 3},${l - 8},${0.25 + r() * 0.4})`;
      g.beginPath(); g.arc(r() * w, r() * h, 0.6 + r() * 1.6, 0, TAU); g.fill();
    }
  }, { repeat: [8, 20] });
}
function mandalaTexture() {
  return canvasTex(1024, 1024, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#F6F6F3'; g.fillRect(0, 0, w, w);
    const ring = (r, n, len, wid, color, rot = 0) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rot;
        g.save(); g.translate(c + Math.cos(a) * r, c + Math.sin(a) * r); g.rotate(a + Math.PI / 2);
        g.beginPath(); g.ellipse(0, 0, wid, len, 0, 0, TAU); g.fillStyle = color; g.fill(); g.restore();
      }
    };
    g.strokeStyle = '#C9A04E'; g.lineWidth = 4;
    [470, 300, 140].forEach((r) => { g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); });
    ring(430, 48, 30, 12, '#E7BDB2'); ring(430, 48, 14, 5, '#F7E3DC', Math.PI / 48);
    ring(370, 36, 26, 10, '#A9B992'); ring(250, 24, 40, 15, '#E1A9A0'); ring(250, 24, 18, 6, '#F8E8E1');
    ring(190, 16, 28, 10, '#C9A04E'); ring(95, 12, 34, 14, '#D98E87');
    g.beginPath(); g.arc(c, c, 40, 0, TAU); g.fillStyle = '#C9A04E'; g.fill();
  });
}
function rugTexture() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#5E7A4E'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#D8B76A'; g.lineWidth = 10; g.strokeRect(22, 22, w - 44, h - 44);
    g.lineWidth = 3; g.strokeRect(48, 48, w - 96, h - 96);
    g.fillStyle = '#E8DCC0';
    for (let y = 90; y < h - 80; y += 56) for (let x = 90; x < w - 80; x += 56) {
      g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-8, -8, 16, 16); g.restore();
    }
  });
}
function blobTexture() {
  return canvasTex(128, 128, (g, w) => {
    const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grd.addColorStop(0, 'rgba(20,24,12,0.55)'); grd.addColorStop(1, 'rgba(20,24,12,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, w);
  });
}

/** A round broadleaf tree: trunk + a clump of faceted crowns, vertex-coloured. */
function broadleafGeo(seed, crown = '#5E7D50', detail = 1) {
  const r = rng(seed);
  const parts = [paint(place(new THREE.CylinderGeometry(0.16, 0.26, 2.4, 7), 0, 1.2, 0), '#6A5442')];
  const base = col(crown);
  for (let i = 0; i < 6; i++) {
    const s = 1.1 + r() * 0.9;
    const g = soft(new THREE.IcosahedronGeometry(s, detail), detail > 1 ? 0.16 : 0.26, seed * 7 + i);
    const c = base.clone().offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.08, (r() - 0.4) * 0.09);
    parts.push(paint(place(g, (r() - 0.5) * 2, 2.9 + r() * 1.8, (r() - 0.5) * 2), '#' + c.getHexString()));
  }
  return merge(parts);
}
function cypressGeo() {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector2(Math.sin(Math.pow(t, 0.75) * Math.PI) * 0.95 * (1 - t * 0.25) + 0.02, t * 8.5));
  }
  const g = soft(new THREE.LatheGeometry(pts, 16), 0.12, 3);
  return merge([paint(place(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 6), 0, 0.3, 0), '#5A4636'), paint(place(g, 0, 0.3, 0), '#4A6849')]);
}
function instanced(geo, mat, items, { shadow = true, colors } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const o = new THREE.Object3D();
  items.forEach((it, i) => {
    o.position.set(it[0], it[1], it[2]);
    o.rotation.set(it[4] || 0, it[3] || 0, it[5] || 0);
    const s = it[6] ?? 1;
    if (Array.isArray(s)) o.scale.set(...s); else o.scale.setScalar(s);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    if (colors) m.setColorAt(i, col(colors[i % colors.length]));
  });
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

/** A catenary between two points, `n` samples. */
function catenary(a, b, sag, n = 16) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= sag * 4 * t * (1 - t);
    out.push(p);
  }
  return out;
}
/** A flat ribbon along points, facing up-ish (for fabric swags). */
function ribbon(points, width) {
  const pos = [];
  const idx = [];
  points.forEach((p, i) => {
    const next = points[Math.min(i + 1, points.length - 1)];
    const prev = points[Math.max(i - 1, 0)];
    const t = next.clone().sub(prev).normalize();
    const side = v3(0, 1, 0).cross(t).normalize();
    const n = t.clone().cross(side).normalize();
    const a = p.clone().addScaledVector(n, width / 2);
    const b = p.clone().addScaledVector(n, -width / 2);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    if (i < points.length - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ───────────────────────── The garden ─────────────────────────
export async function createGarden(canvas, opts) {
  const { mobile, lowPower, plateUrl, easels = [], welcome, onProgress = () => {}, reduced } = opts;
  // pixel-ratio cap: desktop ≤ 1.5, phones ≤ 1.25, low tier 1; the governor below steps it down further when frames run long
  const prCap = dprCap({ tier: lowPower ? 'low' : opts.tier?.tier || 'mid', mobile: mobile || !!opts.tier?.mobile });
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile && !lowPower, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(prCap);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#E6E4D8', 70, 420);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 2400);
  const M = materials();
  const R = rng(42);
  const LOD = lowPower ? 0.5 : mobile ? 0.6 : 1;
  const FL = await loadFloraAssets(renderer);
  onProgress(0.15);
  if (FL.env) { scene.environment = FL.env; scene.environmentIntensity = 0.55; }
  const tile = (t, x, y) => { if (!t) return null; const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); return c; };
  // white Rana-era stucco for the pavilion and the pool's coping
  M.stone = new THREE.MeshStandardMaterial({ map: tile(FL.plaster, 1.5, 1.5), normalMap: tile(FL.plasterNor, 1.5, 1.5), normalScale: new THREE.Vector2(0.6, 0.6), color: '#FFFFFF', roughness: 0.78 });
  M.coping = M.stone;
  M.stoneWarm = new THREE.MeshStandardMaterial({ map: tile(FL.plaster, 2, 2), normalMap: tile(FL.plasterNor, 2, 2), color: '#E7E4DE', roughness: 0.85 });
  M.bark = new THREE.MeshStandardMaterial({ map: tile(FL.bark, 2, 3), color: '#8C7D6E', roughness: 0.95 });
  const rockMat = new THREE.MeshStandardMaterial({ map: tile(FL.rock, 7, 3.5), normalMap: tile(FL.rockNor, 7, 3.5), vertexColors: true, roughness: 0.92 });
  const boulderMat = new THREE.MeshStandardMaterial({ map: tile(FL.rock, 1, 1), normalMap: tile(FL.rockNor, 1, 1), roughness: 0.9 });
  const leafA = leafMaterial(FL.leaves);
  const leafB = leafMaterial(FL.fronds);
  const leafMats = [leafA, leafB];
  // Real CC0 plants (Poly Haven island_tree_01/02, tree_small_02, periwinkle, gazania) baked to impostors.
  const IMP = await loadImpostors(['tree_a', 'tree_b', 'tree_c', 'bush_a', 'bush_b', 'flower_pink', 'flower_orange']);
  onProgress(0.3);
  const aoSpots = []; // [x, z, radius] soft contact shade under canopies
  const plant = (name, items, opts = {}) => {
    const m = plantImpostors(scene, IMP[name], items, opts);
    if (opts.ao && m) items.forEach(([x, , z, , sc = 1]) => aoSpots.push([x, z, opts.ao * sc]));
    return m;
  };
  const anim = []; // per-frame updaters (time, light)

  // Lights
  const hemi = new THREE.HemisphereLight('#E3ECEF', '#8C9A6C', 1.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFF1DA', 2.3);
  sun.castShadow = !lowPower;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  sun.target.position.set(0, 0, -8);
  scene.add(sun, sun.target);
  const fireLight = new THREE.PointLight('#FF9A45', 0, 16, 1.6);
  fireLight.position.set(0, 1.8, -32);
  const treeLight = new THREE.PointLight('#FFB060', 0, 34, 1.3);
  treeLight.position.set(24, 4.5, -33);
  const aisleLight = new THREE.PointLight('#FFC27A', 0, 22, 1.5);
  aisleLight.position.set(0, 3.4, -9);
  scene.add(fireLight, treeLight, aisleLight);

  // Sky + mountain backplate
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({ ...SKY(), side: THREE.BackSide, depthWrite: false, fog: false }));
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  const loader = new THREE.TextureLoader();
  const loadTex = (url) => new Promise((res) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, () => res(null)));

  const plateTex = await loadTex(plateUrl);
  onProgress(0.25);
  const plateMat = new THREE.ShaderMaterial({ ...BACKPLATE(), transparent: true, depthWrite: false, fog: false });
  plateMat.uniforms.map.value = plateTex;
  const PH = 500, PW = 750;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), plateMat);
  plate.position.set(0, -100 + PH / 2, -640);
  plate.renderOrder = -9;
  plate.visible = !!plateTex;
  scene.add(plate);

  // Distant ridges (two rings, fog does the aerial perspective)
  function ridge(R0, h0, h1, color, seed, skipArc) {
    const N = 200, pos = [], colors = [], c = col(color);
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU;
      let h = h0 + (h1 - h0) * fbm(Math.cos(a) * 3 + seed, Math.sin(a) * 3 + seed);
      // keep the view to Machhapuchhre open behind the pavilion
      const d = Math.abs(Math.atan2(Math.sin(a - skipArc[0]), Math.cos(a - skipArc[0])));
      if (d < skipArc[1]) h *= 0.55 + 0.45 * smooth(d / skipArc[1]);
      const x = Math.cos(a), z = Math.sin(a);
      pos.push(x * (R0 - 40), -2, z * (R0 - 40), x * R0, h, z * R0);
      colors.push(c.r * 0.9, c.g * 0.9, c.b * 0.9, c.r, c.g, c.b);
    }
    const idx = [];
    for (let i = 0; i < N; i++) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }));
    scene.add(m);
    return m;
  }
  ridge(320, 12, 46, '#6F8378', 3.1, [-Math.PI / 2, 0.42]);
  ridge(200, 6, 22, '#5B7356', 7.7, [-Math.PI / 2, 0.3]);

  // Ground
  const lawnMat = new THREE.MeshStandardMaterial({ color: '#D2DCC2', roughness: 0.95, metalness: 0 });
  {
    const tl = new THREE.TextureLoader();
    const lt = (f, srgb) => { const t = tl.load('/themes/bagaicha/tex/' + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
    const lawnA = lt('lawn_a.webp', true), lawnB = lt('lawn_b.webp', true), lawnN = lt('lawn_a_n.webp', false);
    lawnMat.normalMap = lawnN; lawnN.repeat.set(360, 360); lawnMat.normalScale.set(0.7, 0.7);
    lawnMat.onBeforeCompile = (sh) => {
      sh.uniforms.lawnA = { value: lawnA }; sh.uniforms.lawnB = { value: lawnB };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWXZ;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWXZ = (modelMatrix * vec4(position, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        uniform sampler2D lawnA, lawnB;
        varying vec2 vWXZ;
        float lh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float ln(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(lh(i), lh(i + vec2(1, 0)), f.x), mix(lh(i + vec2(0, 1)), lh(i + vec2(1, 1)), f.x), f.y); }`)
        .replace('#include <map_fragment>', `
        vec2 w = vWXZ;
        vec3 a1 = texture2D(lawnA, w / 2.5).rgb;
        vec3 a2 = texture2D(lawnA, mat2(0.8, -0.6, 0.6, 0.8) * w / 3.3 + 0.37).rgb;
        vec3 g = mix(a1, a2, smoothstep(0.3, 0.7, ln(w * 0.09)));
        vec3 b = texture2D(lawnB, w / 7.0).rgb;
        g = mix(g, b * 1.05, smoothstep(0.45, 0.8, ln(w * 0.035 + 7.0)) * 0.45);
        g *= 0.9 + 0.2 * ln(w * 0.22 + 3.0);
        // the faintest mowing stripes along the garden's axis
        g *= 0.97 + 0.04 * smoothstep(-0.2, 0.2, sin(w.x * 0.9));
        diffuseColor.rgb *= g;`);
    };
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), lawnMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const gravelMat = new THREE.MeshLambertMaterial({ map: gravelTexture() });
  const gravelFor = (w, d) => (FL.gravel ? new THREE.MeshLambertMaterial({ map: tile(FL.gravel, w / 3, d / 3), color: '#F2F1EC' }) : gravelMat);
  const flat = (w, d, x, z, mat, y = 0.02) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat === gravelMat ? gravelFor(w, d) : mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  flat(14, 38, 0, 23.5, gravelMat);           // around the pool
  flat(4, 46, LAYOUT.easelX + 1.2, 22, gravelMat, 0.025); // easel walk
  const circ = new THREE.Mesh(new THREE.CircleGeometry(10.5, 64), gravelFor(21, 21));
  circ.rotation.x = -Math.PI / 2; circ.position.set(0, 0.03, -32); circ.receiveShadow = true; scene.add(circ);

  // ── Reflecting pool ──
  const { pool } = LAYOUT;
  const pw = pool.x1 - pool.x0, pl = pool.z1 - pool.z0, pcz = (pool.z0 + pool.z1) / 2;
  const copingParts = [
    place(new RoundedBoxGeometry(pw + 1.2, 0.3, 0.6, 2, 0.05), 0, 0.15, pool.z0 - 0.3),
    place(new RoundedBoxGeometry(pw + 1.2, 0.3, 0.6, 2, 0.05), 0, 0.15, pool.z1 + 0.3),
    place(new RoundedBoxGeometry(0.6, 0.3, pl, 2, 0.05), pool.x0 - 0.3, 0.15, pcz),
    place(new RoundedBoxGeometry(0.6, 0.3, pl, 2, 0.05), pool.x1 + 0.3, 0.15, pcz),
  ];
  const coping = new THREE.Mesh(merge(copingParts), M.coping);
  coping.receiveShadow = true; coping.castShadow = true;
  scene.add(coping);
  const rScale = lowPower ? 0.3 : mobile ? 0.4 : 0.5;
  const reflector = new Reflector(new THREE.PlaneGeometry(pw, pl), {
    textureWidth: 512, textureHeight: 512, clipBias: 0.003, shader: POOL_REFLECT, multisample: mobile ? 0 : 4,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(0, 0.12, pcz);
  scene.add(reflector);
  const poolU = reflector.material.uniforms;

  // ── Cypress avenue, topiary and planters along the pool ──
  const cyp = [];
  for (let z = 9; z <= 37; z += 5.3) { cyp.push([-7.6, 0, z, R() * TAU, 0, 0, 0.92 + R() * 0.16]); cyp.push([7.6, 0, z, R() * TAU, 0, 0, 0.92 + R() * 0.16]); }
  // flanking the pavilion
  [[-11, -27], [11, -27], [-12.5, -36], [12.5, -36], [-9, -43], [9, -43]].forEach(([x, z]) => cyp.push([x, 0, z, R() * TAU, 0, 0, 1.15 + R() * 0.15]));
  // an avenue of real trees along the pool walks
  plant('tree_b', cyp.map(([x, y, z, yaw, , , s]) => [x, y, z, yaw, s, s * (0.95 + hash3(x, z, 2) * 0.12)]), { height: 7.4, ao: 2.6 });

  const topiary = [];
  for (let z = 11.6; z <= 38; z += 5.3) { topiary.push([-7.6, 0.55, z, 0, 0, 0, 0.62]); topiary.push([7.6, 0.55, z, 0, 0, 0, 0.62]); }
  plant('bush_a', topiary.map(([x, , z]) => [x, 0, z, R() * TAU, 0.95 + R() * 0.15]), { height: 0.75, ao: 0.9 });

  // Hedges framing the lawns (rounded boxes, deep sage).
  const hedgeGeo = new RoundedBoxGeometry(1, 1, 1, 5, 0.35);
  const hedges = [
    [9.6, 0.45, 26, 0, 0, 0, [0.9, 0.9, 30]], [-15.2, 1.35, 22, 0, 0, 0, [1.3, 2.7, 34]], [-12.4, 1.1, 39.6, 0, 0, 0, [6.6, 2.2, 1.2]],
    [-9.6, 0.45, -2, 0, 0, 0, [0.9, 0.9, 16]], [9.6, 0.45, -2, 0, 0, 0, [0.9, 0.9, 16]],
    [-6.5, 0.4, 42.5, 0, 0, 0, [7, 0.8, 0.9]], [6.5, 0.4, 42.5, 0, 0, 0, [7, 0.8, 0.9]],
  ];
  // hedges are rows of real shrubs, not boxes
  {
    const rows = [];
    hedges.forEach(([x, y, z, , , , [sx, sy, sz]]) => {
      const alongX = sx > sz, len = alongX ? sx : sz, n = Math.max(2, Math.round(len / 1.15));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n - 0.5;
        const sc = Math.max(0.9, (sy * 1.1 + 0.25) / 1.2) * (0.9 + R() * 0.2);
        rows.push([x + (alongX ? t * len : (R() - 0.5) * 0.3), 0, z + (alongX ? (R() - 0.5) * 0.3 : t * len), R() * TAU, sc]);
      }
    });
    plant('bush_a', rows.filter((_, i) => i % 2 === 0), { height: 1.2 });
    plant('bush_b', rows.filter((_, i) => i % 2 === 1), { height: 1.2 });
  }

  // Flowers: one instanced mesh for every bloom in the garden.
  const bloomGeo = jitter(new THREE.IcosahedronGeometry(0.1, 1), 0.025, 2).scale(1, 0.78, 1);
  {
    // petals darken toward the heart and underside, so each bloom reads as a flower, not a ball
    const bp = bloomGeo.attributes.position, bc = [];
    for (let i = 0; i < bp.count; i++) { const y = bp.getY(i) / 0.078; const k = 0.62 + 0.38 * smooth(clamp01(y * 0.5 + 0.5)); bc.push(k, k * 0.97, k * 0.97); }
    bloomGeo.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
  }
  const blooms = [];
  const bloomCols = [];
  const BLUSH = ['#F4CFC7', '#E9AFA6', '#FBEAE4', '#FFFFFF', '#E39A95', '#F7DCCB', '#C9475A', '#FFFFFF'];
  const marigolds = [], marigoldCols = [];
  const isMarigold = (hex) => { const c = col(hex); const hsl = {}; c.getHSL(hsl); return hsl.s > 0.55 && hsl.h > 0.06 && hsl.h < 0.16; };
  const addBloom = (x, y, z, s = 1, palette = BLUSH) => {
    const c = palette[Math.floor(R() * palette.length)];
    if (isMarigold(c)) { marigolds.push([x, y, z, R() * TAU, R() * TAU, R() * TAU, s * (0.8 + R() * 0.4)]); marigoldCols.push(c); return; }
    // roses turn their faces outward and a little up
    const dir = v3(R() - 0.5, 0.7 + R() * 0.6, R() - 0.5).normalize();
    blooms.push([x, y, z, ...faceEuler(dir, R() * TAU), s * (0.75 + R() * 0.5)]);
    bloomCols.push(c);
  };
  const wisteria = []; // [x, y, z, ry, scale]
  const addWisteria = (x, y, z, s = 1) => wisteria.push([x, y, z, (R() - 0.5) * 0.25, R() * TAU, (R() - 0.5) * 0.25, s * (0.75 + R() * 0.5)]);
  const leaves = [];
  const addLeaf = (x, y, z, s = 1) => leaves.push([x, y, z, R() * TAU, R() * TAU, R() * TAU, s * (0.7 + R() * 0.6)]);
  // planters at the pool corners
  [[-4.6, 7], [4.6, 7]].forEach(([x, z]) => {
    for (let i = 0; i < 40; i++) addBloom(x + (R() - 0.5) * 1.2, 0.95 + R() * 0.5, z + (R() - 0.5) * 1.2, 1.3);
  });
  const urnGeo = new THREE.LatheGeometry([[0, 0], [0.32, 0], [0.36, 0.08], [0.22, 0.2], [0.26, 0.5], [0.5, 0.82], [0.56, 0.9], [0, 0.9]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
  scene.add(instanced(urnGeo, M.stone, [[-4.6, 0, 7], [4.6, 0, 7]]));

  // ── Aisle: runner, chairs, flower arches ──
  const runner = flat(1.7, 31.5, 0, -9.3, M.runner, 0.04);
  runner.material = M.runner;
  const petals = [];
  for (let i = 0; i < 260; i++) petals.push([(R() - 0.5) * 1.6, 0.05, 6 - R() * 31, 0, -Math.PI / 2, 0, 0.6 + R() * 0.6]);
  const petalGeo = new THREE.CircleGeometry(0.05, 6);
  scene.add(instanced(petalGeo, new THREE.MeshLambertMaterial({ color: '#FFFFFF', side: THREE.DoubleSide }), petals, { shadow: false, colors: ['#E9A9A0', '#F3CFC6', '#D98A86', '#FBEDE6'] }));

  const chairParts = [
    place(new THREE.BoxGeometry(0.46, 0.05, 0.44), 0, 0.46, 0),
    ...[[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]].map(([x, z]) => place(new THREE.CylinderGeometry(0.018, 0.016, 0.46, 6), x, 0.23, z)),
    ...[-0.2, -0.07, 0.07, 0.2].map((x) => place(new THREE.CylinderGeometry(0.014, 0.014, 0.48, 6), x, 0.72, 0.2)),
    place(new THREE.BoxGeometry(0.48, 0.05, 0.04), 0, 0.96, 0.2),
    place(new THREE.BoxGeometry(0.44, 0.03, 0.04), 0, 0.6, 0.2),
  ];
  const chairGeo = merge(chairParts);
  const chairs = [];
  const rows = [2.4, 0.6, -1.2, -6.6, -8.4, -10.2, -15.6, -17.4, -19.2];
  rows.forEach((z) => [1.45, 2.1, 2.75, 3.4].forEach((x) => { chairs.push([x, 0, z, 0]); chairs.push([-x, 0, z, 0]); }));
  scene.add(instanced(chairGeo, M.chair, chairs));
  // blush seat cushions
  scene.add(instanced(new RoundedBoxGeometry(0.42, 0.06, 0.4, 2, 0.02), M.cushion, chairs.map(([x, y, z]) => [x, 0.5, z]), { shadow: false }));

  // Arches: a slim ivory-and-gold hoop with asymmetric florals.
  const archCurve = new THREE.CurvePath();
  const AW = 1.25, AH = 2.35;
  archCurve.add(new THREE.LineCurve3(v3(-AW, 0, 0), v3(-AW, AH, 0)));
  archCurve.add(new THREE.CatmullRomCurve3(new THREE.EllipseCurve(0, AH, AW, AW * 0.95, Math.PI, 0, true).getPoints(24).map((q) => v3(q.x, q.y, 0))));
  archCurve.add(new THREE.LineCurve3(v3(AW, AH, 0), v3(AW, 0, 0)));
  const archGeo = new THREE.TubeGeometry(archCurve, 120, 0.055, 8, false);
  const archMesh = instanced(archGeo, M.gold, LAYOUT.arches.map((z) => [0, 0, z]));
  scene.add(archMesh);
  const archFloral = (z, flip) => {
    const s = flip ? -1 : 1;
    // cluster sweeping over the top-left shoulder and down one post
    for (let i = 0; i < 70; i++) {
      const t = R();
      const a = Math.PI * (0.55 + t * 0.4);
      const x = Math.cos(a) * AW * s + (R() - 0.5) * 0.25;
      const y = AH + Math.sin(a) * AW * 0.95 + (R() - 0.5) * 0.25;
      addBloom(x, y, z + (R() - 0.5) * 0.3, 1.25);
      if (i % 2) addLeaf(x + (R() - 0.5) * 0.4, y + (R() - 0.5) * 0.4, z + (R() - 0.5) * 0.35);
    }
    for (let i = 0; i < 26; i++) {
      const y = R() * 1.6;
      addBloom(-AW * s + (R() - 0.5) * 0.25, y, z + (R() - 0.5) * 0.3, 1.1);
      addLeaf(-AW * s + (R() - 0.5) * 0.4, y + 0.2, z + (R() - 0.5) * 0.35);
    }
    for (let i = 0; i < 18; i++) addBloom(AW * s * Math.cos(0.4 + R() * 0.3) + (R() - 0.5) * 0.2, AH + 0.6 + R() * 0.3, z, 0.9);
    for (let i = 0; i < 12; i++) { const a = Math.PI * (0.15 + R() * 0.7); addWisteria(Math.cos(a) * AW * 0.95, AH + Math.sin(a) * AW * 0.9 - 0.04, z + (R() - 0.5) * 0.25, 1.1); }
  };
  LAYOUT.arches.forEach((z, i) => archFloral(z, i % 2 === 1));

  // ── Pavilion: a white rotunda with a gilt gajur (Rana-era garden style) ──
  const P = LAYOUT.pavilion;
  const pav = new THREE.Group();
  pav.position.copy(P);
  scene.add(pav);
  const steps = merge([
    place(new THREE.CylinderGeometry(7.5, 7.5, 0.25, 64), 0, 0.125, 0),
    place(new THREE.CylinderGeometry(7.05, 7.05, 0.25, 64), 0, 0.375, 0),
    place(new THREE.CylinderGeometry(6.6, 6.6, 0.25, 64), 0, 0.625, 0),
  ]);
  const stepsMesh = new THREE.Mesh(steps, M.stone);
  stepsMesh.receiveShadow = true; stepsMesh.castShadow = true;
  pav.add(stepsMesh);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.9, 64), new THREE.MeshLambertMaterial({ map: mandalaTexture() }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.756; floor.receiveShadow = true;
  pav.add(floor);
  const colParts = [
    place(new THREE.BoxGeometry(0.86, 0.22, 0.86), 0, 0.11, 0),
    place(new THREE.CylinderGeometry(0.4, 0.44, 0.24, 24), 0, 0.34, 0),
    place(new THREE.CylinderGeometry(0.27, 0.31, 4.5, 20), 0, 2.71, 0),
    place(new THREE.TorusGeometry(0.31, 0.04, 6, 24), 0, 0.5, 0, Math.PI / 2),
    place(new THREE.CylinderGeometry(0.4, 0.28, 0.32, 24), 0, 5.12, 0),
    place(new THREE.BoxGeometry(0.9, 0.14, 0.9), 0, 5.35, 0),
  ];
  const colGeo = merge(colParts);
  const N_COL = 8, COL_R = 5.3;
  const cols = [];
  for (let i = 0; i < N_COL; i++) { const a = (i / N_COL) * TAU + Math.PI / N_COL; cols.push([Math.cos(a) * COL_R, 0.75, Math.sin(a) * COL_R, -a]); }
  pav.add(instanced(colGeo, M.stone, cols));
  const lathe = (pts, seg = 64) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  const ent = new THREE.Mesh(lathe([[4.7, 0], [5.95, 0], [5.95, 0.55], [6.25, 0.62], [6.3, 0.78], [6.05, 0.82], [5.6, 0.95], [5.6, 1.25], [4.7, 1.25]]), M.stone);
  ent.position.y = 6.17; ent.castShadow = true; ent.receiveShadow = true;
  pav.add(ent);
  const domePts = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * (Math.PI / 2); domePts.push([Math.cos(a) * 5.6, Math.sin(a) * 3.3]); }
  const dome = new THREE.Mesh(lathe(domePts), M.stone);
  dome.position.y = 7.42; dome.castShadow = true;
  pav.add(dome);
  const ribs = [];
  for (let i = 0; i < 16; i++) ribs.push([0, 7.42, 0, (i / 16) * TAU]);
  const ribCurve = new THREE.CatmullRomCurve3(domePts.map(([r, y]) => v3(r + 0.03, y, 0)));
  pav.add(instanced(new THREE.TubeGeometry(ribCurve, 24, 0.035, 5), M.gold, ribs, { shadow: false }));
  // gajur: stacked gilt bells and a slender spire
  const gajur = new THREE.Mesh(lathe([[0, 0], [0.7, 0], [0.75, 0.12], [0.45, 0.22], [0.55, 0.5], [0.3, 0.8], [0.42, 1.0], [0.18, 1.2], [0.28, 1.45], [0.1, 1.7], [0.16, 1.9], [0.04, 2.6], [0, 2.7]], 24), M.gold);
  gajur.position.y = 10.68; gajur.castShadow = true;
  pav.add(gajur);
  // chiffon swags between the columns
  const swagMat = M.fabric;
  for (let i = 0; i < N_COL; i++) {
    const a0 = (i / N_COL) * TAU + Math.PI / N_COL, a1 = ((i + 1) / N_COL) * TAU + Math.PI / N_COL;
    const p0 = v3(Math.cos(a0) * 5.55, 6.05, Math.sin(a0) * 5.55), p1 = v3(Math.cos(a1) * 5.55, 6.05, Math.sin(a1) * 5.55);
    pav.add(new THREE.Mesh(ribbon(catenary(p0, p1, 0.75, 20), 0.55), swagMat));
    // marigold strands under the swag
    catenary(p0.clone().setY(5.95), p1.clone().setY(5.95), 1.1, 22).forEach((p, k) => { if (k % 1 === 0) addBloom(P.x + p.x, P.y + p.y, P.z + p.z, 1.15, ['#E89A26', '#F2BF45', '#D9741C']); });
  }
  // floral canopy: wisteria hanging all round under the entablature (inside and out), roses along
  // the cornice and clustered on every capital
  for (let k = 0; k < (mobile ? 130 : 240); k++) {
    const a = R() * TAU, r = 4.85 + R() * 1.3;
    addWisteria(P.x + Math.cos(a) * r, P.y + 6.15, P.z + Math.sin(a) * r, 1.15 + R() * 0.6);
  }
  for (let k = 0; k < (mobile ? 260 : 460); k++) {
    const a = R() * TAU;
    addBloom(P.x + Math.cos(a) * (6.2 + R() * 0.25), P.y + 6.25 + R() * 0.75, P.z + Math.sin(a) * (6.2 + R() * 0.25), 1.6);
    if (k % 3 === 0) addLeaf(P.x + Math.cos(a) * 6.3, P.y + 6.3 + R() * 0.6, P.z + Math.sin(a) * 6.3, 1.4);
  }
  cols.forEach(([cx, , cz]) => {
    for (let k = 0; k < 34; k++) {
      const a = R() * TAU, h = R();
      addBloom(P.x + cx + Math.cos(a) * 0.42, P.y + 0.75 + 4.7 + h * 0.8, P.z + cz + Math.sin(a) * 0.42, 1.5);
      if (k % 2) addLeaf(P.x + cx + Math.cos(a) * 0.48, P.y + 5.3 + h * 0.6, P.z + cz + Math.sin(a) * 0.48, 1.5);
    }
    // a spiral of roses and greenery down each column
    for (let k = 0; k < 26; k++) {
      const t = k / 26, a = t * TAU * 2.2;
      addBloom(P.x + cx + Math.cos(a) * 0.36, P.y + 0.9 + (1 - t) * 4.2, P.z + cz + Math.sin(a) * 0.36, 1.05);
      if (k % 2) addLeaf(P.x + cx + Math.cos(a + 0.3) * 0.38, P.y + 0.95 + (1 - t) * 4.2, P.z + cz + Math.sin(a + 0.3) * 0.38, 1.2);
    }
  });

  // ── The entrance: a deep floral arch the guest passes through at the start ──
  {
    const EZ = LAYOUT.entrance, EW = 3.3, EH = 4.0, depth = 1.4;
    const frame = new THREE.CurvePath();
    frame.add(new THREE.LineCurve3(v3(-EW, 0, 0), v3(-EW, EH, 0)));
    frame.add(new THREE.CatmullRomCurve3(new THREE.EllipseCurve(0, EH, EW, EW * 0.62, Math.PI, 0, true).getPoints(28).map((q) => v3(q.x, q.y, 0))));
    frame.add(new THREE.LineCurve3(v3(EW, EH, 0), v3(EW, 0, 0)));
    const tubeGeo = new THREE.TubeGeometry(frame, 140, 0.07, 8, false);
    scene.add(instanced(tubeGeo, M.gold, [[0, 0, EZ - depth / 2], [0, 0, EZ + depth / 2]]));
    // dense roses over the whole frame, both faces and the soffit
    const RE = rng(77);
    for (let layer = 0; layer < 5; layer++) {
      const zz = EZ - depth / 2 + (layer / 4) * depth;
      const curve = frame.getPoints(200);
      const cr = new THREE.CatmullRomCurve3(curve.map((q) => v3(q.x, q.y, zz)));
      aroundCurve(cr, mobile ? 150 : 300, 0.34, RE).forEach(({ pos, dir }) => {
        const c = BLUSH[Math.floor(RE() * BLUSH.length)];
        blooms.push([pos.x, pos.y, pos.z, ...faceEuler(dir, RE() * TAU), 1.25 + RE() * 0.7]);
        bloomCols.push(c);
        if (RE() < 0.22) addLeaf(pos.x, pos.y, pos.z, 1.7);
      });
    }
    // wisteria cascading from the crown of the arch, inside the passage
    for (let k = 0; k < (mobile ? 50 : 90); k++) {
      const a = Math.PI * (0.18 + RE() * 0.64);
      addWisteria(Math.cos(a) * EW * 0.92, EH + Math.sin(a) * EW * 0.58 - 0.1, EZ + (RE() - 0.5) * depth, 1.3 + RE() * 0.6);
    }
    // two urns of roses either side of the entrance
    [-EW - 1.1, EW + 1.1].forEach((x) => {
      const urn = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.34, 0], [0.38, 0.1], [0.24, 0.24], [0.3, 0.6], [0.56, 0.98], [0.6, 1.06], [0, 1.06]].map(([a, b]) => new THREE.Vector2(a, b)), 28), M.stone);
      urn.position.set(x, 0, EZ); urn.castShadow = true; scene.add(urn);
      for (let k = 0; k < 70; k++) { const a = RE() * TAU, r = RE() * 0.55; addBloom(x + Math.cos(a) * r, 1.1 + RE() * 0.45 + (0.55 - r) * 0.5, EZ + Math.sin(a) * r, 1.5); if (k % 2) addLeaf(x + Math.cos(a) * r, 1.2, EZ + Math.sin(a) * r, 1.6); }
    });
    flat(3.4, 64, 0, EZ - 14, gravelMat, 0.02); // the approach
  }

  // havan kunda + fire at the centre
  const kunda = new THREE.Mesh(merge([place(new THREE.BoxGeometry(1.3, 0.22, 1.3), 0, 0.11, 0), place(new THREE.BoxGeometry(0.95, 0.2, 0.95), 0, 0.32, 0)]), M.brick);
  kunda.position.y = 0.75; kunda.castShadow = true;
  pav.add(kunda);
  const flameMat = new THREE.ShaderMaterial({ ...FLAME(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3), flameMat);
  flame.position.set(P.x, P.y + 1.5, P.z);
  scene.add(flame);
  // flower beds around the pavilion steps: periwinkle and gazania, densely planted
  {
    const pink = [], orange = [];
    for (let i = 0; i < (mobile ? 260 : 520); i++) {
      const a = R() * TAU;
      if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.35) continue; // keep the front steps clear
      const r = 7.8 + R() * 1.2;
      const it = [P.x + Math.cos(a) * r, 0, P.z + Math.sin(a) * r, R() * TAU, 0.8 + R() * 0.5];
      (hash3(Math.cos(a) * 3, Math.sin(a) * 3, 1) > 0.45 ? pink : orange).push(it);
    }
    plant('flower_pink', pink, { height: 0.42, shadow: false });
    plant('flower_orange', orange, { height: 0.28, shadow: false });
  }

  // ── Waterfall on a rocky cliff ──
  const cliff = new THREE.Group();
  cliff.position.copy(LAYOUT.cliff.pos);
  cliff.rotation.y = LAYOUT.cliff.rot;
  scene.add(cliff);
  const W = 56, H = 28;
  const notchAt = (x) => Math.exp(-Math.pow(x / 2.6, 2));
  const cliffTop = (x) => 17.5 + fbm(x * 0.08 + 3, 1.3) * 5 - Math.pow(Math.abs(x) / (W / 2), 2) * 11 - notchAt(x) * 1.2;
  const FALL_TOP = cliffTop(0);
  {
    const g = new THREE.PlaneGeometry(W, H, 44, 24);
    const p = g.attributes.position;
    const colors = [];
    for (let i = 0; i < p.count; i++) {
      const gx = p.getX(i), gy = p.getY(i);
      const inner = Math.abs(gx) < W / 2 - 0.1 && Math.abs(gy) < H / 2 - 0.1;
      // break the grid so the facets read as rock, not tiles
      const x = gx + (inner ? (hash3(gx, gy, 1) - 0.5) * 0.95 : 0);
      const y = gy + H / 2 + (inner ? (hash3(gy, gx, 2) - 0.5) * 0.85 : 0);
      const edge = Math.abs(x) / (W / 2);
      const top = cliffTop(x); // ragged skyline, lower at the ends
      const notch = notchAt(x); // where the water leaves the lip
      const over = Math.max(0, y - top);
      const yy = Math.min(y, top) + over * 0.04;
      let z = (fbm(x * 0.1, yy * 0.1) - 0.5) * 6 + (fbm(x * 0.3 + 9, yy * 0.3) - 0.5) * 2.2;
      z += Math.floor(yy / 3.2) * 0.22 * (0.5 + fbm(x * 0.1, yy * 0.05)); // layered ledges
      z = z * (1 - notch * 0.85) - notch * 2.6;
      z += Math.pow(edge, 2) * 9; // curve the ends forward like an amphitheatre
      p.setXYZ(i, x, Math.max(0, yy), z - over * 0.9);
    }
    g.computeVertexNormals();
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const up = n.getY(i);
      const yy = p.getY(i);
      const strata = 0.5 + 0.5 * Math.sin(yy * 1.1 + fbm(p.getX(i) * 0.05, yy * 0.1) * 4);
      const rock = col('#F2EFE8').lerp(col('#C9C4B8'), strata * 0.55 + fbm(p.getX(i) * 0.08, yy * 0.08) * 0.45);
      const moss = col('#8FA472').lerp(col('#A7B884'), fbm(p.getX(i) * 0.2 + 4, yy * 0.2));
      const c = rock.lerp(moss, clamp01((up - 0.35) * 2.4) * 0.85 + (yy < 1.0 ? 0.25 : 0));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const face = new THREE.Mesh(g, rockMat);
    face.castShadow = true; face.receiveShadow = true;
    cliff.add(face);
    // shrubs and ferns clinging to the ledges
    const shrubs = [];
    for (let i = 0; i < 46; i++) {
      const x = (R() - 0.5) * 44;
      if (Math.abs(x) < 3.2) continue;
      const yy = 1 + R() * (cliffTop(x) - 2);
      if (x > 5 && yy < 4) continue; // keep shrubs off the haldi deck
      const edge = Math.abs(x) / (W / 2);
      const notch = notchAt(x);
      let z = (fbm(x * 0.1, yy * 0.1) - 0.5) * 6 + (fbm(x * 0.3 + 9, yy * 0.3) - 0.5) * 2.2;
      z += Math.floor(yy / 3.2) * 0.22 * (0.5 + fbm(x * 0.1, yy * 0.05));
      z = z * (1 - notch * 0.85) - notch * 2.6 + Math.pow(edge, 2) * 9;
      shrubs.push([x, yy, z + 0.5, R() * TAU, 0, 0, 0.45 + R() * 0.5]);
    }
    cliff.updateMatrixWorld(true);
    plant('bush_b', shrubs.map(([x, y, z, yaw, , , s]) => { const w = cliffToWorld(x, y - 0.2, z); return [w.x, w.y, w.z, yaw, s * 1.6]; }), { height: 1.2 });
    // trees along the top
    const tops = [];
    for (let i = 0; i < 30; i++) {
      const x = (R() - 0.5) * 50;
      if (Math.abs(x) < 2.5) continue;
      tops.push([x, cliffTop(x) - 0.6, -1.5 - R() * 2.5 + Math.pow(Math.abs(x) / 28, 2) * 8, R() * TAU, 0, 0, 1.0 + R() * 0.7]);
    }
    const topItems = tops.map(([x, y, z, yaw, , , s]) => { const w = cliffToWorld(x, y, z); return [w.x, w.y, w.z, yaw, s]; });
    plant('tree_a', topItems.filter((_, i) => i % 2 === 0), { height: 6.5 });
    plant('tree_c', topItems.filter((_, i) => i % 2 === 1), { height: 7.5 });
    // boulders in and around the plunge pool
    const bould = [];
    for (let i = 0; i < 26; i++) {
      const a = R() * Math.PI + Math.PI * 0.02;
      const r = 6.2 + R() * 2.2;
      bould.push([Math.cos(a) * r * 1.15, 0.1, 5.6 + Math.sin(a) * r * 0.7, R() * TAU, R(), R(), 0.5 + R() * 1.1]);
    }
    for (let i = 0; i < 8; i++) bould.push([(R() - 0.5) * 9, 0.2, 1.5 + R() * 2.5, R() * TAU, R(), R(), 0.6 + R() * 0.9]);
    const bg = soft(new THREE.IcosahedronGeometry(1, 3), 0.28, 4).scale(1.2, 0.62, 1);
    {
      // spherical UVs for the rock scan
      const bp = bg.attributes.position, buv = [];
      for (let i = 0; i < bp.count; i++) buv.push(Math.atan2(bp.getZ(i), bp.getX(i)) / Math.PI * 0.5 + 0.5, bp.getY(i) * 0.5 + 0.5);
      bg.setAttribute('uv', new THREE.Float32BufferAttribute(buv, 2));
    }
    cliff.add(instanced(bg, boulderMat, bould, { colors: ['#FFFFFF', '#E9E6DF', '#D9D6CE', '#E2E6D6'] }));
    // ferns/leafy fringe at the base
    for (let i = 0; i < 60; i++) {
      const x = (R() - 0.5) * 34;
      const wp = cliffToWorld(x, 0.2 + R() * 0.6, 1.2 + R() * 2 + Math.pow(Math.abs(x) / 28, 2) * 9);
      addLeaf(wp.x, wp.y, wp.z, 2.2);
    }
  }
  // Water sheet: a ribbon that leaves the lip and falls into the pool.
  const fallMat = new THREE.ShaderMaterial({ ...WATER_FALL(), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true });
  {
    const FH = FALL_TOP - 0.1;
    const g = new THREE.PlaneGeometry(4.2, FH, 10, 40);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i) + FH / 2;
      const t = y / FH; // 0 bottom, 1 top
      const z = 0.2 + Math.pow(t, 3) * 1.4 + (t > 0.95 ? (t - 0.95) * -30 : 0);
      p.setXYZ(i, x * (1 - 0.2 * t), y, z);
    }
    g.computeVertexNormals();
    const fall = new THREE.Mesh(g, fallMat);
    fall.position.set(0, 0.2, 0.1);
    fall.renderOrder = 2;
    cliff.add(fall);
  }
  const plungeMat = new THREE.ShaderMaterial({ ...PLUNGE(), transparent: true, depthWrite: false, fog: true });
  const plunge = new THREE.Mesh(new THREE.CircleGeometry(1, 64), plungeMat);
  plunge.scale.set(8.4, 5.6, 1);
  plunge.rotation.x = -Math.PI / 2;
  plunge.position.set(0, 0.16, 5.6);
  cliff.add(plunge);
  const mistMat = new THREE.ShaderMaterial({ ...MIST(), transparent: true, depthWrite: false, fog: true });
  {
    const n = mobile ? 90 : 180;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos[i * 3] = (R() - 0.5) * 5; pos[i * 3 + 1] = 0.3; pos[i * 3 + 2] = 1.2 + R() * 3; seed[i] = R(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const mist = new THREE.Points(g, mistMat);
    mist.frustumCulled = false;
    mist.renderOrder = 3;
    cliff.add(mist);
  }
  // Haldi: a turmeric-yellow canopy on a stone deck beside the plunge pool, set for the ceremony:
  // low wooden chaukis, cushions in a ring, brass bowls of haldi paste, a kalash, marigolds everywhere.
  const HALDI = { x: 11.5, z: 11 };
  {
    const H0 = 0.3; // deck top
    const deck = new THREE.Mesh(new RoundedBoxGeometry(9, 0.3, 7.6, 2, 0.08), M.stoneWarm);
    deck.position.set(HALDI.x, 0.15, HALDI.z); deck.receiveShadow = true; deck.castShadow = true;
    cliff.add(deck);
    const poles = [[-3.6, -3.0], [3.6, -3.0], [-3.6, 3.0], [3.6, 3.0]];
    poles.forEach(([x, z]) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 3.6, 10), M.woodLight);
      m.position.set(HALDI.x + x, H0 + 1.8, HALDI.z + z); m.castShadow = true;
      cliff.add(m);
    });
    const cg = new THREE.PlaneGeometry(7.6, 6.4, 18, 18);
    const cp = cg.attributes.position;
    for (let k = 0; k < cp.count; k++) {
      const x = cp.getX(k) / 3.8, y = cp.getY(k) / 3.2;
      cp.setZ(k, -(1 - x * x) * (1 - y * y) * 0.55);
    }
    cg.computeVertexNormals();
    const canopy = new THREE.Mesh(cg, M.haldi);
    canopy.rotation.x = -Math.PI / 2; canopy.position.set(HALDI.x, H0 + 3.55, HALDI.z); canopy.castShadow = true;
    cliff.add(canopy);
    const rugTex = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#E6A21F'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#B5321F'; g.lineWidth = 16; g.strokeRect(14, 14, w - 28, h - 28);
      g.strokeStyle = '#F6D36A'; g.lineWidth = 4; g.strokeRect(40, 40, w - 80, h - 80);
      g.fillStyle = '#C8541B';
      for (let y = 80; y < h - 60; y += 46) for (let x = 80; x < w - 60; x += 46) { g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); }
    });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 4.4), new THREE.MeshLambertMaterial({ map: rugTex }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(HALDI.x, H0 + 0.012, HALDI.z); rug.receiveShadow = true;
    cliff.add(rug);
    // two low chaukis (wooden stools) where bride and groom sit for the haldi
    const chauki = merge([
      place(new THREE.BoxGeometry(1.1, 0.08, 0.75), 0, 0.3, 0),
      ...[[-0.48, -0.3], [0.48, -0.3], [-0.48, 0.3], [0.48, 0.3]].map(([x, z]) => place(new THREE.BoxGeometry(0.08, 0.28, 0.08), x, 0.14, z)),
    ]);
    cliff.add(instanced(chauki, M.wood, [[HALDI.x - 0.9, H0, HALDI.z - 0.3, 0.15], [HALDI.x + 0.9, H0, HALDI.z - 0.3, -0.15]]));
    cliff.add(instanced(new RoundedBoxGeometry(0.95, 0.1, 0.65, 2, 0.04), new THREE.MeshLambertMaterial({ color: '#D9481E' }),
      [[HALDI.x - 0.9, H0 + 0.39, HALDI.z - 0.3, 0.15], [HALDI.x + 0.9, H0 + 0.39, HALDI.z - 0.3, -0.15]], { shadow: false }));
    const ring = [];
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (0.15 + (k / 8) * 0.7) + Math.PI;
      ring.push([HALDI.x + Math.cos(a) * 2.3, H0 + 0.11, HALDI.z + 0.9 - Math.sin(a) * 1.8, -a]);
    }
    cliff.add(instanced(new RoundedBoxGeometry(0.75, 0.22, 0.75, 2, 0.08), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), ring, { shadow: false, colors: ['#F2C232', '#E9862A', '#F6D86A'] }));
    // brass: a tray of katoras with haldi paste, an urli of floating marigolds, a kalash with mango leaves
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.04, 40), M.brass);
    tray.position.set(HALDI.x, H0 + 0.03, HALDI.z + 0.7); tray.castShadow = true; cliff.add(tray);
    const katora = lathe([[0, 0], [0.06, 0], [0.11, 0.035], [0.13, 0.08], [0.125, 0.085], [0, 0.085]], 24);
    const kItems = [[0, 0], [0.25, 0.12], [-0.25, 0.12], [0.18, -0.22], [-0.18, -0.22]].map(([x, z]) => [HALDI.x + x, H0 + 0.05, HALDI.z + 0.7 + z]);
    cliff.add(instanced(katora, M.brass, kItems));
    cliff.add(instanced(new THREE.CircleGeometry(0.11, 20).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#E7B21B' }), kItems.map(([x, y, z]) => [x, y + 0.07, z]), { shadow: false }));
    const urli = new THREE.Mesh(lathe([[0, 0], [0.5, 0], [0.75, 0.12], [0.85, 0.24], [0.8, 0.26], [0, 0.26]], 40), M.brass);
    urli.position.set(HALDI.x + 2.6, H0, HALDI.z + 2.2); urli.castShadow = true; cliff.add(urli);
    for (let k = 0; k < 22; k++) { const a = R() * TAU, r = R() * 0.62; const w = cliffToWorld(HALDI.x + 2.6 + Math.cos(a) * r, H0 + 0.25, HALDI.z + 2.2 + Math.sin(a) * r); addBloom(w.x, w.y, w.z, 1.25, ['#F2BF45', '#E89A26', '#D9741C']); }
    const kalash = new THREE.Mesh(lathe([[0, 0], [0.12, 0], [0.2, 0.08], [0.24, 0.2], [0.2, 0.33], [0.1, 0.4], [0.12, 0.46], [0, 0.46]], 28), M.brass);
    kalash.position.set(HALDI.x - 2.5, H0, HALDI.z + 2.1); kalash.castShadow = true; cliff.add(kalash);
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12).scale(1, 1.15, 1), new THREE.MeshLambertMaterial({ color: '#8A5A2E' }));
    coco.position.set(HALDI.x - 2.5, H0 + 0.6, HALDI.z + 2.1); cliff.add(coco);
    for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; const w = cliffToWorld(HALDI.x - 2.5 + Math.cos(a) * 0.17, H0 + 0.5, HALDI.z + 2.1 + Math.sin(a) * 0.17); addLeaf(w.x, w.y, w.z, 1.6); }
    const fringe = (a, b) => catenary(a, b, 0.3, 26).forEach((p) => {
      const w = cliffToWorld(p.x, p.y, p.z);
      addBloom(w.x, w.y, w.z, 1.2, ['#E89A26', '#F2BF45', '#D9741C']);
    });
    const c4 = poles.map(([x, z]) => v3(HALDI.x + x, H0 + 3.5, HALDI.z + z));
    fringe(c4[0], c4[1]); fringe(c4[2], c4[3]); fringe(c4[0], c4[2]); fringe(c4[1], c4[3]);
    poles.forEach(([x, z], k) => {
      for (let y = 0; y < 3.2; y += 0.09) { const w = cliffToWorld(HALDI.x + x + 0.1, H0 + 3.4 - y, HALDI.z + z + 0.1); addBloom(w.x, w.y, w.z, 0.85, k % 2 ? ['#F2BF45', '#E89A26'] : ['#E89A26', '#D9741C']); }
    });
    const petalsH = [];
    for (let k = 0; k < 160; k++) petalsH.push([HALDI.x + (R() - 0.5) * 5, H0 + 0.02, HALDI.z + (R() - 0.5) * 4.2, 0, -Math.PI / 2, 0, 0.7 + R() * 0.6]);
    cliff.add(instanced(new THREE.CircleGeometry(0.04, 6), new THREE.MeshLambertMaterial({ color: '#FFFFFF', side: THREE.DoubleSide }), petalsH, { shadow: false, colors: ['#F2A51E', '#E46F15', '#F6CC3D'] }));
    cliff.updateMatrixWorld(true);
    const edgePots = [];
    for (let k = 0; k < 26; k++) { const t = k / 25; const w = cliffToWorld(HALDI.x - 4.2 + t * 8.4, 0, HALDI.z + 3.95); edgePots.push([w.x, 0.3, w.z, R() * TAU, 0.9 + R() * 0.4]); }
    for (let k = 0; k < 18; k++) { const t = k / 17; const w = cliffToWorld(HALDI.x + 4.6, 0, HALDI.z - 3.4 + t * 6.8); edgePots.push([w.x, 0, w.z, R() * TAU, 1 + R() * 0.4]); }
    plant('flower_orange', edgePots, { height: 0.32, shadow: false });
  }

  // ── Mehendi swing (jhulā) on the east lawn ──
  const S = LAYOUT.swing;
  {
    const g = new THREE.Group();
    g.position.copy(S);
    g.rotation.y = -0.6;
    scene.add(g);
    const post = (x, z, rx, rz) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.8, 8), M.woodLight); m.position.set(x, 1.82, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); };
    post(-1.7, -0.45, 0.24, 0.0); post(-1.7, 0.45, -0.24, 0); post(1.7, -0.45, 0.24, 0); post(1.7, 0.45, -0.24, 0);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.8, 8), M.woodLight);
    bar.rotation.z = Math.PI / 2; bar.position.y = 3.62; bar.castShadow = true; g.add(bar);
    const seat = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.12, 0.7, 2, 0.04), M.wood);
    seat.position.y = 0.72; seat.castShadow = true; g.add(seat);
    const cush = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.14, 0.62, 2, 0.06), new THREE.MeshLambertMaterial({ color: '#8FA872' }));
    cush.position.y = 0.84; g.add(cush);
    [-0.85, 0.85].forEach((x) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.8, 4), M.woodLight); r.position.set(x, 2.2, 0); g.add(r); });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.MeshLambertMaterial({ map: rugTexture() }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.03, 0.9); rug.receiveShadow = true; g.add(rug);
    const floorCush = [[-1.7, 2.2], [-0.6, 2.5], [0.6, 2.5], [1.7, 2.2]].map(([x, z]) => [x, 0.13, z, R() * 0.4]);
    g.add(instanced(new RoundedBoxGeometry(0.8, 0.22, 0.8, 2, 0.08), new THREE.MeshLambertMaterial({ color: '#B9C79A' }), floorCush, { shadow: false }));
    // greenery and blooms wound up the posts and along the bar
    g.updateMatrixWorld(true);
    const wp = (x, y, z) => v3(x, y, z).applyMatrix4(g.matrixWorld);
    for (let i = 0; i < 90; i++) {
      const x = (R() - 0.5) * 3.8;
      const p = wp(x, 3.62 + (R() - 0.5) * 0.25, (R() - 0.5) * 0.25);
      addLeaf(p.x, p.y, p.z, 1.3);
      if (i % 2) { const q = wp(x, 3.6 + (R() - 0.3) * 0.3, (R() - 0.5) * 0.3); addBloom(q.x, q.y, q.z, 1.2, ['#FFFFFF', '#F2CFC6', '#E8C14E']); }
    }
    for (let k = 0; k < 9; k++) {
      const x = -1.5 + k * 0.375, len = 0.7 + R() * 0.35;
      for (let y = 0; y < len; y += 0.085) {
        const q = wp(x + (R() - 0.5) * 0.02, 3.52 - y, 0);
        addBloom(q.x, q.y, q.z, 0.8, k % 2 ? ['#F2BF45', '#E89A26'] : ['#FFFFFF', '#F2CFC6']);
      }
    }
    for (let i = 0; i < 50; i++) {
      const sx = R() > 0.5 ? 1.7 : -1.7, y = R() * 3.5;
      const p = wp(sx * (1 - 0) , y, (R() - 0.5) * 0.9 * (1 - y / 3.8));
      addLeaf(p.x, p.y, p.z, 1.1);
    }
  }

  // ── Chautari: a peepal on a two-tier stone platform, hung with lanterns ──
  const T = LAYOUT.chautari;
  const lanternGlow = []; // [x,y,z,size,r,g,b]
  const lanternStrings = [];
  const paperLanterns = [];
  {
    const plat = new THREE.Mesh(merge([place(new RoundedBoxGeometry(6.4, 0.55, 6.4, 2, 0.06), 0, 0.27, 0), place(new RoundedBoxGeometry(4.6, 0.5, 4.6, 2, 0.06), 0, 0.8, 0)]), M.stoneWarm);
    plat.position.copy(T); plat.castShadow = true; plat.receiveShadow = true;
    scene.add(plat);
    plant('tree_c', [[T.x, 1.0, T.z, 0.4, 1]], { height: 12.5, ao: 7 });
    // lanterns hanging from the canopy
    for (let i = 0; i < 34; i++) {
      const a = R() * TAU, r = 2.2 + R() * 5;
      const x = T.x + Math.cos(a) * r, z = T.z + Math.sin(a) * r;
      const y = 2.9 + R() * 1.9;
      lanternStrings.push(v3(x, y + 0.25, z), v3(x, 6.2 - r * 0.15, z));
      paperLanterns.push([x, y, z, R() * TAU, 0, 0, 0.75 + R() * 0.5]);
      lanternGlow.push([x, y, z, 2.6, 1, 0.66, 0.32]);
    }
    // round tables with ivory cloths and candles
    const tables = [];
    const tcol = [];
    [[-5.5, 6.5], [1, 8.5], [7, 5], [8.5, -2.5], [-7.5, -1], [-4, 12.5], [3.5, 14], [10.5, 10]].forEach(([dx, dz]) => {
      tables.push([T.x + dx, 0, T.z + dz]);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; tcol.push([T.x + dx + Math.cos(a) * 1.25, 0, T.z + dz + Math.sin(a) * 1.25, -a + Math.PI / 2]); }
      lanternGlow.push([T.x + dx, 1.05, T.z + dz, 0.9, 1, 0.72, 0.4]);
    });
    const tableGeo = merge([place(new THREE.CylinderGeometry(0.95, 1.05, 0.74, 28, 1, true), 0, 0.37, 0), place(new THREE.CylinderGeometry(0.95, 0.95, 0.03, 28), 0, 0.75, 0)]);
    scene.add(instanced(tableGeo, M.cloth, tables));
    scene.add(instanced(chairGeo, M.chair, tcol));
    // string lights radiating from the tree to poles around the lawn
    const poles = [];
    const strands = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + 0.2;
      const px = T.x + Math.cos(a + 0.35) * 15, pz = T.z + Math.sin(a + 0.35) * 15;
      poles.push([px, 0, pz]);
      strands.push([v3(T.x + Math.cos(a + 0.35) * 2.5, 6.4, T.z + Math.sin(a + 0.35) * 2.5), v3(px, 4.2, pz)]);
    }
    scene.add(instanced(merge([place(new THREE.CylinderGeometry(0.05, 0.06, 4.4, 6), 0, 2.2, 0)]), M.wood, poles));
    opts._strands = strands;
  }
  scene.add(instanced(new THREE.SphereGeometry(0.28, 12, 8).scale(1, 0.85, 1), M.paperLantern, paperLanterns, { shadow: false }));

  // ── Easels with the couple's photographs ──
  const easelGroups = [];
  let welcomeTex = null;
  if (welcome) { welcomeTex = new THREE.CanvasTexture(welcome); welcomeTex.colorSpace = THREE.SRGBColorSpace; welcomeTex.anisotropy = 8; }
  const photoTextures = await Promise.all(easels.map((e) => loadTex(e.url)));
  onProgress(0.55);
  easels.forEach((e, i) => {
    const tex = photoTextures[i];
    if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; tex.needsUpdate = true; } // three clamps to the GPU maximum: sharp at an angle
    const img = tex?.image;
    const aspect = img ? img.width / img.height : 0.8;
    const big = i === 0;
    const H = big ? 1.55 : 1.25;
    let ph = H, pw2 = H * aspect;
    const maxW = big ? 1.75 : 1.6;
    if (pw2 > maxW) { pw2 = maxW; ph = pw2 / aspect; }
    const mat = 0.09, fr = 0.06;
    const g = new THREE.Group();
    const z = LAYOUT.easelZ[i] ?? 13.5 - (i - 3) * 6.5;
    g.position.set(LAYOUT.easelX, 0, z);
    g.rotation.y = Math.PI / 2 - 0.28;
    scene.add(g);
    const bottom = 0.9;
    const cy = bottom + ph / 2 + mat;
    // easel legs (A-frame) and a ledge
    const legH = cy + ph / 2 + 0.45;
    const leg = (x, rz, zoff, rx) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, legH, 0.04), M.wood); m.position.set(x, legH / 2, zoff); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); };
    leg(-pw2 * 0.3, 0.05, -0.16, -0.07); leg(pw2 * 0.3, -0.05, -0.16, -0.07); leg(0, 0, -0.62, 0.3);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(pw2 + 0.35, 0.05, 0.14), M.wood);
    ledge.position.set(0, bottom - 0.02, 0.0); ledge.castShadow = true; g.add(ledge);
    const back = new THREE.Mesh(new THREE.BoxGeometry(pw2 + mat * 2 + fr * 2, ph + mat * 2 + fr * 2, 0.05), M.frame);
    back.position.set(0, cy, -0.06); back.castShadow = true; g.add(back);
    // the mat and the photo are unlit, untoned and unfogged: true colour, never greyed by haze or ACES
    const matte = new THREE.Mesh(new THREE.PlaneGeometry(pw2 + mat * 2, ph + mat * 2), new THREE.MeshBasicMaterial({ color: '#FBFAF7', toneMapped: false, fog: false }));
    matte.position.set(0, cy, -0.02); g.add(matte);
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(pw2, ph), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }));
    photo.position.set(0, cy, -0.012); g.add(photo);
    // a welcome sign below the hero portrait
    if (big && welcomeTex) {
      const signW = pw2 + 0.25, signH = 0.42;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), new THREE.MeshBasicMaterial({ map: welcomeTex, toneMapped: false, transparent: true }));
      sign.position.set(0, bottom - 0.32, 0.03); g.add(sign);
      const board = new THREE.Mesh(new THREE.BoxGeometry(signW + 0.06, signH + 0.06, 0.03), M.gold);
      board.position.set(0, bottom - 0.32, 0.005); g.add(board);
    }
    // a tiny bouquet at the foot
    for (let k = 0; k < 18; k++) {
      const w = v3((R() - 0.5) * 0.45 + pw2 / 2 + 0.55, 0.12 + R() * 0.28, 0.1 + R() * 0.25).applyMatrix4(g.updateMatrixWorld(true) || g.matrixWorld);
      addBloom(w.x, w.y, w.z, 0.8);
      if (k % 2) addLeaf(w.x, w.y - 0.1, w.z, 0.9);
    }
    easelGroups.push({ group: g, center: v3(0, cy, 0).applyMatrix4(g.matrixWorld), w: pw2 + 0.4, h: ph + 0.4 + (big ? 0.6 : 0), frameW: pw2 + 0.34, frameH: ph + 0.34 + (big ? 0.5 : 0), normal: v3(0, 0, 1).applyQuaternion(g.quaternion) });
    lanternGlow.push(...[[0.8 + pw2 / 2, 0.25, 0.4]].map(([x, y, zz]) => { const w = v3(x, y, zz).applyMatrix4(g.matrixWorld); return [w.x, w.y, w.z, 0.9, 1, 0.7, 0.38]; }));
  });

  // ── Lanterns along the pool and the aisle ──
  const lanternItems = [];
  for (let z = 9.5; z <= 37; z += 3.4) { lanternItems.push([-3.75, 0.3, z]); lanternItems.push([3.75, 0.3, z]); }
  for (let z = 4; z >= -21; z -= 3) { lanternItems.push([-1.0, 0.04, z]); lanternItems.push([1.0, 0.04, z]); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + 0.26; lanternItems.push([Math.cos(a) * 7.25, 0.5, -32 + Math.sin(a) * 7.25]); }
  const lanternGeo = merge([
    place(new THREE.CylinderGeometry(0.09, 0.11, 0.04, 12), 0, 0.02, 0),
    place(new THREE.CylinderGeometry(0.075, 0.075, 0.22, 12), 0, 0.15, 0),
    place(new THREE.SphereGeometry(0.09, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.26, 0),
    place(new THREE.TorusGeometry(0.035, 0.008, 4, 10), 0, 0.37, 0),
  ]);
  scene.add(instanced(lanternGeo, M.lantern, lanternItems, { shadow: false }));
  lanternItems.forEach(([x, y, z]) => lanternGlow.push([x, y + 0.22, z, 1.0, 1, 0.68, 0.34]));
  // floating diyas on the pool
  for (let i = 0; i < 28; i++) lanternGlow.push([(R() - 0.5) * 4.6, 0.2, pool.z0 + 1 + R() * (pl - 2), 0.75, 1, 0.62, 0.28]);

  // Fairy lights: strands over the aisle and around the chautari.
  const fairy = [];
  LAYOUT.arches.forEach((z, i) => {
    const nz = LAYOUT.arches[i + 1];
    if (nz === undefined) return;
    for (const x of [-1.15, 1.15]) catenary(v3(x, 3.3, z), v3(x, 3.3, nz), 0.55, 26).forEach((p) => fairy.push(p));
    catenary(v3(-AW, 3.0, z), v3(AW * 3.2, 3.0, (z + nz) / 2), 0.5, 16).forEach((p) => fairy.push(p));
    catenary(v3(AW, 3.0, z), v3(-AW * 3.2, 3.0, (z + nz) / 2), 0.5, 16).forEach((p) => fairy.push(p));
  });
  catenary(v3(-1.15, 3.3, LAYOUT.arches.at(-1)), v3(-4.5, 6.0, -26.5), 0.4, 20).forEach((p) => fairy.push(p));
  catenary(v3(1.15, 3.3, LAYOUT.arches.at(-1)), v3(4.5, 6.0, -26.5), 0.4, 20).forEach((p) => fairy.push(p));
  (opts._strands || []).forEach(([a, b]) => catenary(a, b, 0.9, 30).forEach((p) => fairy.push(p)));
  // Cypress fairy wraps along the pool
  cyp.slice(0, 14).forEach(([x, , z]) => { for (let k = 0; k < 12; k++) { const t = k / 12, a = t * 9; fairy.push(v3(x + Math.cos(a) * 0.32, 0.5 + t * 2.4, z + Math.sin(a) * 0.32)); } });
  fairy.forEach((p) => lanternGlow.push([p.x, p.y, p.z, 0.32, 1, 0.82, 0.55]));
  const fairyLines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#4C4438', transparent: true, opacity: 0.28 }));
  scene.add(fairyLines);

  // All flowers and leaves in two instanced draws.
  const flowerMeshes = [];
  // low tier: every other bloom (index-aligned colours), so the planting thins evenly
  const thin = (a) => (lowPower && a ? a.filter((_, k) => k % 2 === 0) : a);
  flowerMeshes.push(scatter(scene, roseGeometry(), ROSE_MAT(), thin(blooms), thin(bloomCols)));
  {
    const mg = marigoldGeometry(mobile ? 1 : 2);
    mg.scale(0.068, 0.068, 0.068);
    flowerMeshes.push(scatter(scene, mg, marigoldMaterial({ emissiveIntensity: 0.25 }), thin(marigolds), thin(marigoldCols)));
    flowerMeshes.push(scatter(scene, wisteriaGeometry(), WISTERIA_MAT(), thin(wisteria), null));
  }
  const leafGeo = new THREE.BufferGeometry();
  leafGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.065, 0.025, 0.11, 0, 0.01, 0.26, 0, 0, 0, 0, 0.01, 0.26, -0.065, 0.025, 0.11], 3));
  leafGeo.computeVertexNormals();
  // greenery in the florals: little sprays of real leaves (cards), not geometric leaves
  plantSpecies(scene, {
    crown: crownGeometry({ n: 6, rx: 0.2, ry: 0.16, cy: 0, size: 0.36, seed: 71 }), leaf: leafA,
    items: leaves.map(([x, y, z, yaw, , , s]) => [x, y, z, yaw, s * 1.2, s * 1.2]), tints: ['#8FA878', '#7E9A68', '#9BB283'], shadow: false,
  });

  // ── Trees: garden specimens and the forest ring ──
  const trees = [];
  const nearTrees = [[19.6, 8.4], [-22, 34], [-24, 16], [-21, 2], [-24, -6], [19, 30], [23, 20], [27, 4], [31, -12], [35, -30], [15, -48], [-12, -52], [3, -55], [24, 40], [-28, 30], [-30, 14], [32, 26]];
  nearTrees.forEach(([x, z]) => trees.push([x, 0, z, R() * TAU, 0, 0, 1 + R() * 0.5]));
  const inApproach = (x, z) => z > 40 && Math.abs(x) < 13;
  for (let i = 0; i < (mobile ? 90 : 160); i++) {
    const a = R() * TAU, r = 58 + R() * 70;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9;
    if (z < -40 && Math.abs(x + 34) < 30 && z > -80) continue; // behind the cliff
    if (inApproach(x, z)) continue;
    trees.push([x, 0, z, R() * TAU, 0, 0, 1.2 + R() * 1.1]);
  }
  // extra groves so the edges have layered depth instead of a ring
  [[-26, 24, 5], [-30, -14, 4], [28, 12, 4], [36, -18, 4], [-18, -48, 3], [20, -54, 3], [6, 52, 3], [-34, 42, 3]].forEach(([gx, gz, k]) => {
    for (let i = 0; i < k; i++) trees.push([gx + (R() - 0.5) * 9, 0, gz + (R() - 0.5) * 9, R() * TAU, 0, 0, 0.75 + R() * 0.6]);
  });
  const nearN = nearTrees.length;
  const kinds = ['tree_a', 'tree_c', 'tree_b'];
  const byKind = { tree_a: [], tree_b: [], tree_c: [] }, farByKind = { tree_a: [], tree_b: [], tree_c: [] };
  const haldiW = cliffToWorld(11.5, 0, 11);
  trees.forEach(([x, y, z, yaw, , , s], i) => {
    if (Math.hypot(x - haldiW.x, z - haldiW.z) < 13) return; // keep the haldi view open
    const kind = kinds[i < nearN ? i % 3 : Math.floor(hash3(x, z, 3) * 3)];
    const it = [x, y, z, yaw, s, s * (0.88 + hash3(z, x, 1) * 0.3)];
    (Math.hypot(x, z + 5) > 70 ? farByKind : byKind)[kind].push(it);
  });
  const TREE_H = { tree_a: 8.5, tree_b: 9, tree_c: 9.5 };
  for (const k of kinds) {
    plant(k, byKind[k], { height: TREE_H[k], ao: 3.2 });
    plant(k, farByKind[k], { height: TREE_H[k] * 1.1, shadow: false });
  }
  // understory: shrubs at the feet of the specimen trees and in front of the easel wall
  const under = [];
  trees.slice(0, nearN).forEach(([x, , z]) => { if (Math.hypot(x - haldiW.x, z - haldiW.z) < 13) return; for (let k = 0; k < 3; k++) { const a = R() * TAU, r = 1.8 + R() * 2.4; under.push([x + Math.cos(a) * r, 0, z + Math.sin(a) * r, R() * TAU, 0.8 + R() * 0.6]); } });
  for (let z = -16; z < 44; z += 2.2) under.push([-16.6 - R() * 1.2, 0, z + R(), R() * TAU, 1.3 + R() * 0.6]);
  plant('bush_b', under.filter((_, i) => i % 2 === 0), { height: 1.5, ao: 1.2 });
  plant('bush_a', under.filter((_, i) => i % 2 === 1), { height: 1.4, ao: 1.2 });
  // soft contact shade under every canopy (ambient occlusion on the lawn)
  if (aoSpots.length) {
    const ao = instanced(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.75, color: '#ffffff' }),
      aoSpots.map(([x, z, r]) => [x, 0.045, z, 0, 0, 0, [r * 2, 1, r * 2]]), { shadow: false });
    ao.receiveShadow = false;
    scene.add(ao);
  }

  // ── Glow sprites (lanterns, diyas, fairy lights, candles) ──
  let glowPoints = null, fireflies = null, petalPoints = null;
  const glowMat = new THREE.ShaderMaterial({ ...GLOW(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  {
    const n = lanternGlow.length;
    const pos = new Float32Array(n * 3), size = new Float32Array(n), color = new Float32Array(n * 3), phase = new Float32Array(n);
    lanternGlow.forEach(([x, y, z, s, r, g, b], i) => { pos.set([x, y, z], i * 3); size[i] = s; color.set([r, g, b], i * 3); phase[i] = R(); });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1));
    g.setAttribute('color', new THREE.BufferAttribute(color, 3));
    g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    const pts = new THREE.Points(g, glowMat);
    glowPoints = pts;
    pts.frustumCulled = false;
    pts.renderOrder = 5;
    scene.add(pts);
  }
  // Fireflies over the lawns at night, petals drifting at the vows.
  const fireflyMat = new THREE.ShaderMaterial({ ...GLOW(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  fireflyMat.defines = { DRIFT: 1 };
  {
    const n = mobile ? 70 : 140, pos = new Float32Array(n * 3), size = new Float32Array(n), color = new Float32Array(n * 3), phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, r = 6 + R() * 26;
      pos.set([Math.cos(a) * r + 6, 0.5 + R() * 3, Math.sin(a) * r - 18], i * 3);
      size[i] = 0.18; color.set([0.95, 0.9, 0.5], i * 3); phase[i] = R();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1));
    g.setAttribute('color', new THREE.BufferAttribute(color, 3));
    g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    const ff = new THREE.Points(g, fireflyMat);
    fireflies = ff;
    ff.frustumCulled = false;
    scene.add(ff);
  }
  const petalMat = new THREE.ShaderMaterial({ ...PETALS(), transparent: true, depthWrite: false });
  {
    const n = mobile ? 60 : 110, pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos.set([(R() - 0.5) * 8, 0, -30 + (R() - 0.5) * 7], i * 3); seed[i] = R(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const pp = new THREE.Points(g, petalMat);
    petalPoints = pp;
    pp.frustumCulled = false;
    scene.add(pp);
  }

  // ── Lawn grass ──
  const MASK = [-70, -90, 160, 160];
  const maskTex = lawnMask(MASK, (g) => {
    g.fillRect(-7.1, 4.4, 14.2, 38.4); // pool + gravel surround
    g.fillRect(LAYOUT.easelX - 0.8, -1.2, 4.2, 46.4); // easel walk
    g.beginPath(); g.arc(0, -32, 10.7, 0, TAU); g.fill(); // pavilion
    g.fillRect(-0.9, -25.6, 1.8, 31.8); // aisle runner
    g.fillRect(-1.8, 42, 3.6, 66); // approach to the entrance
    g.fillRect(T.x - 3.3, T.z - 3.3, 6.6, 6.6); // chautari platform
    hedges.forEach(([x, , z, , , , [sx, , sz]]) => g.fillRect(x - sx / 2, z - sz / 2, sx, sz));
    g.save(); g.translate(S.x, S.z); g.rotate(0.6); g.fillRect(-2.6, -1.2, 5.2, 4.3); g.restore(); // swing rug
    g.save(); g.translate(LAYOUT.cliff.pos.x, LAYOUT.cliff.pos.z); g.rotate(-LAYOUT.cliff.rot);
    g.fillRect(-29, -14, 58, 15.5); g.beginPath(); g.ellipse(0, 5.6, 9, 6.2, 0, 0, TAU); g.fill(); g.fillRect(6.9, 7.1, 9.2, 7.8);
    g.restore();
  });
  const grassN = opts.grass ?? (lowPower ? 0 : mobile ? 24000 : 70000);
  const grass = grassField({ count: Math.max(grassN, 1), field: mobile || lowPower ? 18 : 28, mask: maskTex, maskRect: MASK });
  grass.visible = grassN > 0;
  if (mobile || lowPower) scene.traverse((o) => { if (o.isInstancedMesh && o.customDepthMaterial) o.castShadow = false; });
  scene.add(grass);
  // the pool's reflection pass skips the grass (cheaper, and it would be hidden by the coping anyway)
  {
    const orig = reflector.onBeforeRender;
    reflector.onBeforeRender = function (...a) {
      // grass and the small flowers stay out of the mirror pass (cheaper; mirrored double-sided petals shade dark)
      const hide = [grass, ...flowerMeshes].filter(Boolean), was = hide.map((m) => m.visible);
      hide.forEach((m) => { m.visible = false; });
      orig.apply(this, a);
      hide.forEach((m, k) => { m.visible = was[k]; });
    };
  }

  // ── The couple: rigged, dressed figures (CC0 MakeHuman bodies + Quaternius animations) ──
  onProgress(0.7);
  const [brideGltf, groomGltf, animsGltf] = await loadCoupleAssets();
  const bride = new Figure(brideGltf, animsGltf, 'bride', mobile || lowPower);
  const groom = new Figure(groomGltf, animsGltf, 'groom', mobile || lowPower);
  scene.add(bride.root, groom.root);
  const malaA = new Mala(70, 0.032); // the bride's garland, worn by the groom
  const malaB = new Mala(64, 0.03, [new Color('#f6e7c8'), new Color('#f39318'), new Color('#e2650f'), new Color('#ffb52a')]);
  scene.add(malaA.mesh, malaB.mesh);
  const tie = new Ribbon(new THREE.MeshPhysicalMaterial({ color: '#d9a441', roughness: 0.55, sheen: 1, sheenColor: new Color('#fff2c0'), side: THREE.DoubleSide }), 26, 0.035);
  scene.add(tie.mesh);
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.9 });
  const blobs = [bride, groom].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), blobMat); m.rotation.x = -Math.PI / 2; scene.add(m); return m; });
  // Seven diyos around the havan kunda, one lit for each round walked.
  const diyos = [];
  {
    const dg = new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.075, 0.02], [0.08, 0.04], [0.07, 0.042], [0, 0.03]].map(([x, y]) => new THREE.Vector2(x, y)), 18);
    const clay = new THREE.MeshStandardMaterial({ color: '#9a4a24', roughness: 0.85 });
    const diyoFlame = new THREE.ShaderMaterial({ ...FLAME(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    diyoFlame.uniforms.intensity.value = 1.1;
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + (k / 7) * TAU;
      const d = new THREE.Mesh(dg, clay);
      d.position.set(LAYOUT.pavilion.x + Math.sin(a) * 2.45, 0.755, LAYOUT.pavilion.z + Math.cos(a) * 2.45);
      d.castShadow = true;
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.17).translate(0, 0.085, 0), diyoFlame);
      f.position.copy(d.position).add(v3(0, 0.035, 0));
      f.visible = false;
      scene.add(d, f);
      diyos.push({ d, f });
    }
    diyos.mat = diyoFlame;
  }
  onProgress(0.9);

  // ───────────────────────── Stations ─────────────────────────
  const spots = {
    swing: { target: S.clone().add(v3(0, 1.5, 0)), yaw: -0.25, pitch: 0.07, fit: [7.2, 4.6], fitNarrow: [5.6, 5.4] },
    falls: (() => {
      // the haldi setting in the middle, the waterfall behind it a little to one side
      const c = cliffToWorld(11.5, 1.3, 11), w = cliffToWorld(0, 0, 0.4);
      const yaw = Math.atan2(c.x - w.x, c.z - w.z) - 0.32;
      return { target: c, yaw, pitch: 0.2, fit: [11, 7], fitNarrow: [7.4, 7.6], fov: [50, 44, 40] };
    })(),
    aisle: { target: v3(0, 4.4, -24), yaw: 0, pitch: -0.105, dist: 19.2, fov: [52, 46, 42] },
    lanterns: { target: T.clone().add(v3(-2.5, 3.0, 4.5)), yaw: 0.14, pitch: 0.08, fit: [17, 10], fitNarrow: [8.5, 10] },
  };
  const RR = 1.55; // radius of the seven rounds around the fire
  const ROUND_LEN = 7 * TAU * RR;
  const coupleAt = {
    start: pathLen(0) + 0.0,
    aisleMid: 22,
    aisleEnd: pathLen(1),
    altar: pathLen(2),
    chautari: pathLen(6),
  };

  // ───────────────────────── Runtime ─────────────────────────
  const clock = new THREE.Clock();
  let stations = [];
  let p = 0; // continuous station index
  let intro = 0; // 1 = crane-high gate view
  let paused = false;
  let hold = 0; // 0..1 through the current station's resting zone (drives the seven rounds)
  let story = null; // smoothed choreography distance
  const cam = { target: v3(), yaw: 0, pitch: 0, dist: 10, shiftX: 0, shiftY: 0, fov: 40 };
  const smoothCam = { pos: v3(), target: v3(), shiftX: 0, shiftY: 0, fov: 40, init: false };

  function layoutOf(st, aspect) {
    const narrow = aspect < 0.9;
    // phones: the portrait fills the screen between the top bar and the note card, face-on
    if (narrow && st.kind === 'easel') return { sx: 0, sy: aspect < 0.5 ? 0.17 : 0.12, wf: 0.97, hf: 0.6 };
    if (st.layout === 'top') return narrow ? { sx: 0, sy: -0.22, wf: 0.95, hf: 0.5 } : { sx: 0, sy: -0.16, wf: 0.9, hf: 0.62 };
    if (narrow) return { sx: 0, sy: aspect < 0.5 ? 0.47 : 0.4, wf: 0.94, hf: aspect < 0.5 ? 0.38 : 0.44 };
    const side = st.layout === 'left' ? 1 : -1; // card on the left → subject to the right
    return { sx: 0.3 * side, sy: 0, wf: 0.58, hf: 0.84 };
  }
  function resolve(st, aspect) {
    const F = st.fov || [52, 44, 38];
    const fov = aspect < 0.9 ? F[0] : aspect < 1.4 ? F[1] : F[2];
    const L = layoutOf(st, aspect);
    const t = Math.tan(MathUtils.degToRad(fov / 2));
    let dist = st.dist;
    if (st.fit) {
      const [w, h] = aspect < 0.9 && st.fitNarrow ? st.fitNarrow : st.fit;
      dist = Math.max(h / 2 / t / L.hf, w / 2 / (t * aspect) / L.wf);
    } else if (aspect < 0.9 && st.distNarrow) dist = st.distNarrow;
    return { target: st.target, yaw: aspect < 0.9 && st.yawNarrow != null ? st.yawNarrow : st.yaw, pitch: st.pitch, dist, sx: L.sx, sy: L.sy, fov };
  }

  function setStations(list) {
    stations = list.map((s) => {
      if (s.kind === 'arrival') return { ...s, target: v3(0, 3.6, -22), yaw: 0, pitch: -0.012, dist: 70, distNarrow: 74, layout: 'top', tod: 0, couple: { s: coupleAt.start, face: Math.PI } };
      if (s.kind === 'easel') {
        const e = easelGroups[s.index];
        const yaw = Math.atan2(e.normal.x, e.normal.z) + 0.12;
        return { ...s, target: e.center.clone(), yaw, pitch: 0.03, fit: [e.w, e.h], fitNarrow: [e.frameW, e.frameH], yawNarrow: yaw - 0.1, layout: 'right', tod: 0.04 + s.index * 0.03, couple: { s: coupleAt.start, face: Math.PI } };
      }
      if (s.kind === 'spot') {
        const sp = spots[s.spot];
        const tod = { swing: 0.3, falls: 0.42, aisle: 0.9, lanterns: 1.82 }[s.spot];
        const cs = { swing: 3, falls: 7, aisle: coupleAt.aisleMid, lanterns: coupleAt.chautari }[s.spot];
        const face = s.spot === 'lanterns' ? 0.3 : Math.PI;
        return { ...s, ...sp, layout: s.layout, tod, couple: { s: cs, face } };
      }
      if (s.kind === 'vows') return { ...s, target: v3(0, 1.0, -31.8), yaw: 0.0, pitch: 0.5, dist: 8.4, distNarrow: 9.6, fov: [54, 46, 42], layout: s.layout, tod: 1.08, couple: { s: coupleAt.altar, face: 0 } };
      if (s.kind === 'finale') return { ...s, target: v3(10, 1, -26), yaw: -0.5, pitch: 0.42, dist: 62, distNarrow: 80, layout: 'top', tod: 2, couple: { s: coupleAt.chautari, face: 0.3 } };
      return s;
    });
  }

  const angLerp = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

  function frameState(aspect) {
    const n = stations.length;
    const pc = Math.min(Math.max(p, 0), n - 1);
    const i = Math.min(Math.floor(pc), n - 2);
    const f = pc - i;
    const A = resolve(stations[i], aspect), B = resolve(stations[i + 1] || stations[i], aspect);
    const e = smoother(f);
    const out = {
      target: A.target.clone().lerp(B.target, e),
      yaw: angLerp(A.yaw, B.yaw, e),
      pitch: MathUtils.lerp(A.pitch, B.pitch, e),
      dist: Math.exp(MathUtils.lerp(Math.log(A.dist), Math.log(B.dist), e)),
      sx: MathUtils.lerp(A.sx, B.sx, e), sy: MathUtils.lerp(A.sy, B.sy, e),
      fov: MathUtils.lerp(A.fov, B.fov, e),
      tod: MathUtils.lerp(stations[i].tod, (stations[i + 1] || stations[i]).tod, smooth(f)),
      cs: MathUtils.lerp(stations[i].couple.s, (stations[i + 1] || stations[i]).couple.s, smooth(f)),
      face: angLerp(stations[i].couple.face, (stations[i + 1] || stations[i]).couple.face, smooth(clamp01((f - 0.55) / 0.45))),
      lift: Math.sin(Math.PI * f) * (stations[i].lift ?? 0.12),
    };
    // a gentle crane up during long moves so the camera never skims the hedges
    out.pitch += out.lift * 0.35;
    out.dist *= 1 + out.lift * 0.35;
    if (intro > 0) {
      const k = smoother(intro);
      out.pitch = MathUtils.lerp(out.pitch, 0.012, k);
      out.dist *= 1 + 0.78 * k;
      out.target.y += 0.2 * k;
      out.sy = MathUtils.lerp(out.sy, aspect < 0.9 ? 0.16 : -0.26, k);
    }
    return out;
  }

  let light = lightAt(0);
  function applyLight(tod) {
    light = lightAt(tod);
    hemi.color.copy(light.hemS); hemi.groundColor.copy(light.hemG); hemi.intensity = light.hemI;
    sun.color.copy(light.sun); sun.intensity = light.sunI;
    sun.position.copy(sun.target.position).addScaledVector(light.dir, 160);
    scene.fog.color.copy(light.fog); scene.fog.near = light.fogN; scene.fog.far = light.fogF;
    renderer.toneMappingExposure = light.exp;
    impostorLight.sunDir.value.copy(light.dir);
    impostorLight.sunColor.value.copy(light.sun).multiplyScalar(light.sunI * 0.62);
    impostorLight.skyColor.value.copy(light.hemS);
    impostorLight.groundColor.value.copy(light.hemG);
    impostorLight.ambient.value = light.hemI * 0.95;
    scene.environmentIntensity = 0.55 * (1 - light.night * 0.85) * (tod > 1 ? 0.75 : 1);
    grass.userData.uniforms.uTip.value.set(tod > 1.2 ? '#86A05A' : '#93AC5C');
    const su = sky.material.uniforms;
    su.top.value.copy(light.top); su.hor.value.copy(light.hor); su.sunDir.value.copy(light.dir); su.sunCol.value.copy(light.sun); su.stars.value = light.stars;
    const pu = plateMat.uniforms;
    pu.grade.value.copy(light.plate); pu.gradeAmt.value = light.plateAmt; pu.bright.value = light.plateB; pu.night.value = light.night;
    pu.haze.value = light.haze; pu.hazeCol.value.copy(light.hor);
    poolU.tint.value.copy(light.water);
    const lan = light.lan;
    M.lantern.emissiveIntensity = lan * 2.2;
    M.paperLantern.emissiveIntensity = 0.2 + lan * 1.6;
    glowMat.uniforms.intensity.value = lan;
    if (glowPoints) glowPoints.visible = lan > 0.01;
    if (fireflies) fireflies.visible = tod > 1.52;
    fireflyMat.uniforms.intensity.value = clamp01((tod - 1.5) * 2) * 0.9;
    fireLight.intensity = 6 + lan * 30;
    treeLight.intensity = lan * 120;
    aisleLight.intensity = lan * 28;
    fallMat.uniforms.tint.value.copy(light.water); fallMat.uniforms.night.value = light.night;
    plungeMat.uniforms.tint.value.copy(light.water);
    mistMat.uniforms.tint.value.copy(light.hor).lerp(col('#FFFFFF'), 0.6);
    mistMat.uniforms.alpha.value = 0.26 - light.night * 0.14;
    flameMat.uniforms.intensity.value = 0.55 + lan * 0.6;
  }

  // The whole choreography as one distance walked: along the aisle to the fire, seven rounds
  // around it (the fire on their right, the groom leading, tied by the ganthbandhan), then on to
  // the chautari. Scroll sets where the story should be; the couple walk there at a natural pace,
  // and the walk cycle follows distance travelled, so the feet never slide.
  const altarS = () => coupleAt.altar;
  function storyTarget(st) {
    const vi = stations.findIndex((x) => x.kind === 'vows');
    const pc = Math.min(Math.max(p, 0), stations.length - 1);
    const rounds = vi < 0 ? 1 : pc < vi ? 0 : pc > vi ? 1 : clamp01((hold - 0.06) / 0.86);
    const cs = st.cs;
    if (cs <= altarS()) return rounds > 0 ? altarS() + rounds * ROUND_LEN : cs;
    return altarS() + rounds * ROUND_LEN + (rounds >= 1 ? cs - altarS() : 0);
  }
  function decode(D) {
    const A = altarS();
    if (D <= A) return { mode: 'path', d: D };
    if (D <= A + ROUND_LEN) return { mode: 'rounds', s: D - A };
    return { mode: 'path', d: D - ROUND_LEN };
  }
  const sideBySide = (d, faceOverride) => {
    const { p: c, dir } = pathPoint(d);
    const f = faceOverride != null ? v3(Math.sin(faceOverride), 0, Math.cos(faceOverride)) : dir;
    const left = v3(f.z, 0, -f.x);
    return { b: c.clone().addScaledVector(left, 0.31), g: c.clone().addScaledVector(left, -0.31), yaw: Math.atan2(f.x, f.z) };
  };
  const onCircle = (th) => v3(LAYOUT.pavilion.x + Math.sin(th) * RR, 0, LAYOUT.pavilion.z + Math.cos(th) * RR);
  const yawB = { v: Math.PI }, yawG = { v: Math.PI };
  function updateCouple(st, dt) {
    const want = storyTarget(st);
    if (!story || reduced || !dt) story = want;
    else {
      const lag = want - story;
      if (Math.abs(lag) > 26) story = want; // a chapter jump: cut, don't run
      else {
        const rate = 1.25 * (1 + 2.2 * clamp01(Math.abs(lag) / 10));
        story += Math.sign(lag) * Math.min(Math.abs(lag), rate * dt);
      }
    }
    const S = decode(story);
    const atRest = Math.abs(want - story) < 0.02;
    let pb, pg, yb, yg;
    let roundsDone = 0;
    if (S.mode === 'path') {
      const resting = atRest && st.face != null;
      const sb = sideBySide(S.d, resting ? st.face : null);
      pb = sb.b; pg = sb.g; yb = yg = sb.yaw;
      roundsDone = story > altarS() ? 7 : 0;
    } else {
      // single file on the circle, blending in from (and back out to) standing side by side
      const s0 = S.s;
      const th = -(s0 / RR);
      const gap = 0.95 / RR;
      const cb = onCircle(th + gap / 2), cg = onCircle(th - gap / 2);
      const tang = (t) => Math.atan2(-Math.cos(t), Math.sin(t));
      const entry = sideBySide(altarS(), Math.PI), exit = sideBySide(altarS(), 0);
      const kIn = smooth(clamp01(s0 / 1.6)), kOut = smooth(clamp01((ROUND_LEN - s0) / 1.6));
      const k = Math.min(kIn, kOut);
      const from = s0 < ROUND_LEN / 2 ? entry : exit;
      pb = from.b.clone().lerp(cb, k); pg = from.g.clone().lerp(cg, k);
      yb = angLerp(from.yaw, tang(th + gap / 2), k);
      yg = angLerp(from.yaw, tang(th - gap / 2), k);
      roundsDone = Math.min(7, Math.floor((s0 + 0.4) / (TAU * RR)));
    }
    pb.y = groundY(pb.x, pb.z); pg.y = groundY(pg.x, pg.z);
    // turn smoothly (people turn in a beat, not a frame)
    const kt = !dt || reduced ? 1 : 1 - Math.exp(-dt * 6);
    yawB.v = angLerp(yawB.v, yb, kt); yawG.v = angLerp(yawG.v, yg, kt);
    const walking = !atRest;
    bride.ik.L = bride.ik.R = groom.ik.L = groom.ik.R = null;
    bride.pose(pb, yawB.v, dt, time, { look: walking ? null : groom.bone.head.getWorldPosition(v3()) });
    groom.pose(pg, yawG.v, dt, time, { look: walking ? null : bride.bone.head.getWorldPosition(v3()) });
    // the bride walks with her hands joined in front
    if (walking) {
      const fB = bride.forward(), sB = v3(fB.z, 0, -fB.x), hands = bride.local(0, 1.02, 0.26);
      bride.ik.L = { p: hands.clone().addScaledVector(sB, 0.05), w: 0.8 };
      bride.ik.R = { p: hands.clone().addScaledVector(sB, -0.05), w: 0.8 };
      bride.solveArms();
    }
    const up = v3(0, 1, 0);
    placeMala(malaA, bride, groom, 'worn', 1, up, 0.34);
    placeMala(malaB, groom, bride, 'worn', 1, up, 0.3);
    // ganthbandhan from the aisle's end onwards
    const tied = story > altarS() - 1.2;
    tie.mesh.visible = tied;
    if (tied) {
      const a = groom.sashLocal.getWorldPosition(v3()), b = bride.sashLocal.getWorldPosition(v3());
      tie.update(a, b, 0.2 + 0.12 * Math.max(0, 0.9 - a.distanceTo(b)), time);
    }
    blobs[0].position.set(pb.x, pb.y + 0.03, pb.z);
    blobs[1].position.set(pg.x, pg.y + 0.03, pg.z);
    // one diyo lit per completed round
    diyos.forEach(({ f }, k) => { f.visible = k < roundsDone; if (f.visible) f.lookAt(camera.position.x, f.position.y, camera.position.z); });
    diyos.mat.uniforms.time.value = time;
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const pr = renderer.getPixelRatio();
    reflector.getRenderTarget().setSize(Math.round(w * pr * rScale), Math.round(h * pr * rScale));
    glowMat.uniforms.scale.value = h * pr;
    fireflyMat.uniforms.scale.value = h * pr;
    petalMat.uniforms.scale.value = h * pr;
    mistMat.uniforms.scale.value = h * pr;
  }

  // ── Adaptive quality: a frame-time governor steps resolution, shadow updates, the pool
  // mirror and grass density down when frames run over ~20 ms for 2 s, and back up with headroom.
  const shadowsOn = sun.castShadow;
  const grassFull = grass.geometry.instanceCount;
  let reflectEvery = 1, shadowEvery = 1, frameNo = 0;
  const LEVELS = [
    { pr: 1, shadowEvery: 1, reflectEvery: 1, grass: 1 },
    { pr: 1, shadowEvery: 2, reflectEvery: 2, grass: 0.75 },
    { pr: 1, shadowEvery: 3, reflectEvery: 3, grass: 0.5 },
    { pr: 0.85, shadowEvery: 4, reflectEvery: 4, grass: 0.35 },
    { pr: 0.7, shadowEvery: 4, reflectEvery: 4, grass: 0.25 },
  ];
  const governor = createGovernor({
    name: 'bagaicha', levels: LEVELS.length, start: lowPower ? 2 : 0,
    apply(l) {
      const L = LEVELS[l];
      renderer.setPixelRatio(Math.max(Math.min(1, prCap), prCap * L.pr)); // never blurrier than the screen's own pixels
      shadowEvery = L.shadowEvery; reflectEvery = L.reflectEvery;
      // shadows are not switched off (that would recompile every material): the map is redrawn less often
      if (shadowsOn) renderer.shadowMap.autoUpdate = shadowEvery === 1;
      grass.geometry.instanceCount = Math.max(1, Math.round(grassFull * L.grass));
      if (typeof resize === 'function' && camera.aspect) resize();
    },
  });
  {
    const orig = reflector.onBeforeRender;
    reflector.onBeforeRender = function (...a) { if (frameNo % reflectEvery === 0) orig.apply(this, a); };
  }
  let hidden = document.hidden;
  onTabHidden((h) => { hidden = h; clock.getDelta(); });

  let time = 0;
  let firstFrame = true;
  // Render on demand: once the camera has settled, ambient motion (water, grass, the couple) is drawn
  // at half rate (a third on low tier); any scroll or camera movement returns to every frame.
  let stillFor = 0, skip = 0, acc = 0, lastP = -1, lastIntro = -1;
  const camPrev = v3();
  function tick() {
    if (paused || hidden) return;
    const raw = clock.getDelta();
    governor.sample(raw);
    acc += raw;
    const moving = p !== lastP || intro !== lastIntro || firstFrame;
    lastP = p; lastIntro = intro;
    stillFor = moving ? 0 : stillFor + raw;
    if (stillFor > 0.5 && ++skip % (lowPower ? 3 : 2)) return;
    const dt = Math.min(acc, 0.1);
    acc = 0;
    frameNo++;
    if (shadowsOn && shadowEvery > 1 && frameNo % shadowEvery === 0) renderer.shadowMap.needsUpdate = true;
    time += dt * (reduced ? 0.4 : 1);
    const aspect = camera.aspect;
    const st = frameState(aspect);
    applyLight(st.tod);
    // camera from the station spec
    const cp = Math.cos(st.pitch);
    const pos = st.target.clone().add(v3(Math.sin(st.yaw) * cp, Math.sin(st.pitch), Math.cos(st.yaw) * cp).multiplyScalar(st.dist));
    pos.y = Math.max(pos.y, 0.9);
    const k = firstFrame || reduced ? 1 : 1 - Math.exp(-dt * 7);
    firstFrame = false;
    smoothCam.pos.lerp(pos, k); smoothCam.target.lerp(st.target, k);
    smoothCam.shiftX += (st.sx - smoothCam.shiftX) * k; smoothCam.shiftY += (st.sy - smoothCam.shiftY) * k;
    smoothCam.fov += (st.fov - smoothCam.fov) * k;
    camera.position.copy(smoothCam.pos);
    camera.lookAt(smoothCam.target);
    camera.fov = smoothCam.fov;
    camera.updateProjectionMatrix();
    // lens shift so the subject sits beside the card instead of under it
    camera.projectionMatrix.elements[8] = -smoothCam.shiftX;
    camera.projectionMatrix.elements[9] = -smoothCam.shiftY;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    sky.position.copy(camera.position);
    updateCouple(st, dt);
    flame.lookAt(camera.position.x, flame.position.y, camera.position.z);
    // petals fall only around the vows
    const vowIdx = stations.findIndex((s) => s.kind === 'vows');
    petalMat.uniforms.alpha.value = vowIdx < 0 ? 0 : clamp01(1 - Math.abs(p - vowIdx) * 1.4);
    petalPoints.visible = petalMat.uniforms.alpha.value > 0.01;
    for (const m of [fallMat, plungeMat, mistMat, glowMat, fireflyMat, petalMat, flameMat]) m.uniforms.time.value = time;
    poolU.time.value = time;
    for (const L of leafMats) L.uniforms.uTime.value = time;
    impostorLight.time.value = time;
    grass.userData.uniforms.uTime.value = time;
    // still means the eased camera has actually arrived, not only that the scroll stopped
    if (camPrev.distanceToSquared(camera.position) > 1e-6) stillFor = 0;
    camPrev.copy(camera.position);
    renderer.render(scene, camera);
  }

  // fairy strand wires
  {
    const segs = [];
    for (let i = 0; i < fairy.length - 1; i++) if (fairy[i].distanceTo(fairy[i + 1]) < 1.2) segs.push(fairy[i].x, fairy[i].y, fairy[i].z, fairy[i + 1].x, fairy[i + 1].y, fairy[i + 1].z);
    for (let i = 0; i < lanternStrings.length; i += 2) segs.push(...lanternStrings[i].toArray(), ...lanternStrings[i + 1].toArray());
    fairyLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
  }

  resize();
  onProgress(1);

  return {
    renderer, scene, camera,
    setStations,
    get stations() { return stations; },
    setProgress(v) { p = v; },
    setHold(v) { hold = v; },
    get couple() { return { bride, groom, story, altar: coupleAt.altar, roundLen: ROUND_LEN }; },
    get progress() { return p; },
    setIntro(v) { intro = v; },
    snap() { firstFrame = true; },
    resize,
    tick,
    start() { renderer.setAnimationLoop(tick); },
    pause(v) { paused = v; if (!v) clock.getDelta(); },
    /** Screen position of a world point (for debugging and cards). */
    project(v) { const q = v.clone().project(camera); return [(q.x + 1) / 2, (1 - q.y) / 2]; },
  };
}
