// Durbar: Bhaktapur's royal square on a bright wedding morning, built in code.
// A lane leads to the whitewashed lion gate; through it the square opens on the
// Nyatapola. The palace of 55 windows carries the couple's portraits in gilt
// frames; each ceremony has its landmark (Chyasilin Mandap, Vatsala Durga with
// the Taleju bell, the Golden Gate, Bhairabnath). Scroll glides the camera
// between them. Soft daylight comes from a CC0 sky HDRI plus a shadowing sun
// that swings west and warms for the evening reception.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Builder, box, cyl, place, v3, rng, catenary, smoother, smooth, clamp01, TAU } from './geo.js';
import { loadMaterials, TILES } from './materials.js';
import { QUALITY, pagoda, nyatapola, NYATAPOLA_TIERS, NYATAPOLA, palace55, goldenGate, GATE, shikhara, bellPavilion, chyasilin, bhairabnath, stuccoWing, houseRow, hipRoof, gajur } from './architecture.js';
import { buildSculpts, loadElephant } from './statues.js';
import { createPigeons, createMarigolds, createBunting } from './life.js';

const { MathUtils } = THREE;

// Where things stand (metres; y up; north is -z, east is +x).
export const PLAN = {
  nyatapola: v3(16, 0, -4),
  gate: v3(14, 0, 60), // the lion gate the guest walks through, on the Nyatapola's axis
  palace: { fx: -34, z0: 2.5, z1: -34.5 },
  golden: v3(-34.3, 0, 6.6), // Sun Dhoka centre; its face looks east (+x)
  wing: v3(-39, 0, 17.6),
  vatsala: v3(-19, 0, 25),
  bell: v3(-26, 0, 12.5),
  column: v3(-27.5, 0, 34),
  mandap: v3(-10, 0, -24),
  bhairab: v3(48, 0, 6),
  shrine: v3(-7, 0, 41),
};

// The sun in the sky HDRI (kloofendal_48d_partly_cloudy): u 0.596, elevation 48°.
const SKY_U = 0.596;
const SUN_TEX_ANGLE = Math.atan2(Math.sin((SKY_U - 0.5) * TAU), Math.cos((SKY_U - 0.5) * TAU));
// light azimuth (atan2(z, x)) and elevation through the day: morning from the south-east, evening from the west
const SUN_MORNING = { az: 0.78, el: THREE.MathUtils.degToRad(46) };
const SUN_EVENING = { az: Math.PI - 0.62, el: THREE.MathUtils.degToRad(24) };

export async function createSquare(canvas, opts) {
  const { mobile, lowPower, reduced, frames = [], onProgress = () => {}, debug = false, ao = !mobile && !lowPower } = opts;
  const dprCap = lowPower ? 1 : mobile ? 1.5 : 1.75;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower && !ao, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !lowPower || debug;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.25, 2600);
  const { M, env, sky } = await loadMaterials(renderer, { mobile, lowPower, onProgress: (k) => onProgress(k * 0.6) });

  if (sky) { sky.mapping = THREE.EquirectangularReflectionMapping; scene.background = sky; }
  else scene.background = new THREE.Color('#BFD3E6');
  if (env) { scene.environment = env; scene.environmentIntensity = 0.8; }
  scene.fog = new THREE.Fog('#CFDCE6', 180, 2300);

  const hemi = new THREE.HemisphereLight('#DDE8F2', '#B08A70', 0.3);
  const sun = new THREE.DirectionalLight('#FFF3E2', 3.0);
  sun.castShadow = renderer.shadowMap.enabled;
  const SM = mobile || lowPower ? 2048 : 4096;
  sun.shadow.mapSize.set(SM, SM);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 420;
  scene.add(hemi, sun, sun.target);
  const sunDir = v3(0, 1, 0);

  // ───────────────────────── Build the square ─────────────────────────
  QUALITY.bellSpacing = mobile || lowPower ? 1.6 : 1;
  const B = new Builder(TILES);
  const LOD = lowPower ? 0.75 : mobile ? 0.8 : 1;
  // paving: herringbone brick over the square, the lane and the streets around
  const ground = new THREE.PlaneGeometry(300, 330);
  ground.rotateX(-Math.PI / 2);
  ground.translate(10, 0, 20);
  B.add('pave', ground);

  // stone-slab walks across the brick paving, as in the old squares
  for (const [a, b] of [[[PLAN.gate.x, 57], [PLAN.nyatapola.x, 12]], [[-31, 6.6], [PLAN.nyatapola.x - 13, 6.6]], [[-31, -10], [-10, -10]], [[29, 6], [41, 6]], [[-12, 25], [PLAN.gate.x - 3, 50]]]) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const g = new THREE.BoxGeometry(1.7, 0.03, len);
    g.rotateY(Math.atan2(dx, dz));
    g.translate((a[0] + b[0]) / 2, 0.015, (a[1] + b[1]) / 2);
    B.add('step', g, { color: '#D8D0C3', uv: 1.6 });
  }

  // Nyatapola
  const N = PLAN.nyatapola;
  const ny = nyatapola(B, { x: N.x, z: N.z });
  const nyTop = pagoda(B, { x: N.x, y: ny.top, z: N.z, tiers: NYATAPOLA_TIERS, pitch: 31, topPitch: 40, gajurScale: 1.15 });
  onProgress(0.64);

  // the palace of 55 windows, the Golden Gate and the white wing
  const P = PLAN.palace;
  const pal = palace55(B, { fx: P.fx, z0: P.z0, z1: P.z1, depth: 13 });
  const gg = goldenGate(B, { x: PLAN.golden.x, z: PLAN.golden.z, ry: Math.PI / 2 });
  stuccoWing(B, { x: PLAN.wing.x, z: PLAN.wing.z, ry: Math.PI / 2, w: 17, d: 10, h: 11.6 });
  B.add('brick', box(4, 6.2, 1.5, P.fx - 2, 0, P.z0 + 0.6));

  // Vatsala Durga, the Taleju bell, King Bhupatindra's column
  const vat = shikhara(B, { x: PLAN.vatsala.x, z: PLAN.vatsala.z, ry: Math.PI / 2, s: 1 });
  bellPavilion(B, { x: PLAN.bell.x, z: PLAN.bell.z, ry: Math.PI / 2 });
  {
    const c = PLAN.column;
    B.add('step', box(3.2, 0.5, 3.2, c.x, 0, c.z));
    B.add('step', box(2.2, 0.6, 2.2, c.x, 0.5, c.z));
    B.add('stone', cyl(0.32, 0.38, 6.6, 12, c.x, 1.1, c.z));
    B.add('stone', cyl(0.75, 0.5, 0.5, 12, c.x, 7.7, c.z));
  }
  const cm = chyasilin(B, { x: PLAN.mandap.x, z: PLAN.mandap.z });
  const bh = bhairabnath(B, { x: PLAN.bhairab.x, z: PLAN.bhairab.z, ry: -Math.PI / 2 });
  // a small two-roofed shrine in the south-west of the square
  B.add('plinth', box(7.5, 1.2, 7.5, PLAN.shrine.x, 0, PLAN.shrine.z), { color: '#EAC8B6' });
  B.add('step', box(7.7, 0.14, 7.7, PLAN.shrine.x, 1.2, PLAN.shrine.z));
  pagoda(B, { x: PLAN.shrine.x, y: 1.34, z: PLAN.shrine.z, ry: 0, tiers: [{ w: 4.4, h: 2.6, eave: 7.6, struts: 3, windows: 1 }, { w: 3.2, h: 1.6, eave: 5.4, struts: 2, windows: 1 }], gajurScale: 0.6 });

  // low brick platforms (dabali), small stone chaityas and lamp pillars: the square's furniture
  const R = rng(77);
  for (const [x, z, w, d] of [[-4, 10, 7, 5], [30, 26, 6, 6], [-26, 32, 5, 4], [36, -26, 8, 5], [2, -30, 6, 6]]) {
    B.add('plinth', box(w, 0.75, d, x, 0, z), { color: '#E6C3B1' });
    B.add('step', box(w + 0.16, 0.12, d + 0.16, x, 0.75, z));
  }
  for (const [x, z] of [[-9, 22], [24, 30], [33, 14], [-27, -14], [6, 20], [-11, -6]]) {
    const s = 0.7 + R() * 0.5;
    B.add('step', box(1.6 * s, 0.4 * s, 1.6 * s, x, 0, z));
    B.add('stone', box(1.0 * s, 1.3 * s, 1.0 * s, x, 0.4 * s, z), { color: '#CFC7B9' });
    B.add('stone', cyl(0.05, 0.62 * s, 1.0 * s, 4, x, 1.7 * s, z), { color: '#CFC7B9' });
    gajur(B, x, 2.65 * s, z, 0.18 * s);
  }

  // the lion gate (Simha Dhoka): whitewashed, arched, under a tiled roof
  const G = PLAN.gate;
  {
    const W = 11, H = 7.4, D = 3.4, ow = 3.9, oh = 4.6;
    const sh = new THREE.Shape();
    sh.moveTo(-W / 2, 0); sh.lineTo(W / 2, 0); sh.lineTo(W / 2, H); sh.lineTo(-W / 2, H); sh.lineTo(-W / 2, 0);
    const hole = new THREE.Path();
    hole.moveTo(-ow / 2, 0); hole.lineTo(-ow / 2, oh); hole.absarc(0, oh, ow / 2, Math.PI, 0, true); hole.lineTo(ow / 2, 0); hole.lineTo(-ow / 2, 0);
    sh.holes.push(hole);
    const eg = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 18 });
    eg.translate(0, 0, -D / 2);
    B.add('stucco', place(eg, G.x, 0, G.z), { color: '#F7F3EC' });
    B.add('plinth', box(W + 0.3, 0.9, D + 0.3, G.x, 0, G.z), { color: '#E7C2B0' });
    B.add('stucco', box(W + 0.6, 0.45, D + 0.6, G.x, H, G.z), { color: '#EEE8DE' });
    const ring = new THREE.TorusGeometry(ow / 2 + 0.18, 0.13, 6, 20, Math.PI);
    for (const s of [-1, 1]) B.add('stucco', place(ring.clone(), G.x, oh, G.z + s * (D / 2 + 0.02)), { color: '#E6DFD3' });
    hipRoof(B, { x: G.x, z: G.z, y: H + 0.4, h: 2.2, w0: W + 2.6, d0: D + 3.0, w1: W - 3, d1: 0, key: 'houseRoof' });
    gajur(B, G.x, H + 2.55, G.z, 0.5);
    B.add('step', box(ow, 0.08, D + 0.2, G.x, 0, G.z));
  }
  onProgress(0.7);

  // houses around the square and along the approach lane
  const RW = (a, b, ry, seed, extra = {}) => houseRow(B, { a, b, ry, seed, lod: LOD, ...extra });
  RW(v3(-62, 0, 58), v3(G.x - 5.6, 0, 58), Math.PI, 11);
  RW(v3(G.x + 5.6, 0, 58), v3(72, 0, 58), Math.PI, 12);
  RW(v3(68, 0, 52), v3(68, 0, -50), -Math.PI / 2, 13);
  RW(v3(-14, 0, -50), v3(68, 0, -50), 0, 14);
  RW(v3(-48, 0, -42), v3(-14, 0, -50), 0, 15, { floorsMax: 3 });
  RW(v3(-34, 0, 23), v3(-34, 0, 58), Math.PI / 2, 16);
  RW(v3(G.x - 6.4, 0, 69), v3(G.x - 6.4, 0, 118), Math.PI / 2, 17, { depth: 8, floorsMax: 4 });
  RW(v3(G.x + 6.4, 0, 118), v3(G.x + 6.4, 0, 69), -Math.PI / 2, 18, { depth: 8, floorsMax: 4 });
  onProgress(0.76);

  // the old town beyond: blocks of brick houses and tiled roofs to the horizon, then the valley rim
  {
    const C = rng(5);
    const inSquare = (x, z) => (x > -50 && x < 80 && z > -62 && z < 70) || (Math.abs(x - G.x) < 22 && z > 60 && z < 130);
    for (let x = -170; x <= 200; x += 13) {
      for (let z = -190; z <= 230; z += 13) {
        const px = x + (C() - 0.5) * 5, pz = z + (C() - 0.5) * 5;
        if (inSquare(px, pz) || C() < 0.08) continue;
        const w = 8 + C() * 5, d = 8 + C() * 5, h = 7 + C() * 7;
        const ry = (C() < 0.5 ? 0 : Math.PI / 2) + (C() - 0.5) * 0.1;
        B.add(C() < 0.8 ? 'house' : 'stucco', box(w, h, d, px, 0, pz, ry), { color: C() < 0.5 ? '#E8C9B9' : '#F0D6C8' });
        hipRoof(B, { x: px, z: pz, y: h, h: 1.6 + C() * 0.8, w0: w + 1.4, d0: d + 1.4, w1: w * 0.5, d1: 0, ry, key: 'houseRoof', fascia: null, under: false, seg: 1 });
      }
    }
  }
  const hills = new THREE.Mesh(hillsGeometry(), new THREE.MeshStandardMaterial({ color: '#5F7385', roughness: 1, side: THREE.DoubleSide }));
  const earth = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2).translate(0, -0.05, 0), new THREE.MeshStandardMaterial({ color: '#A69680', roughness: 1 }));
  scene.add(hills, earth);

  // statues
  const sculpt = buildSculpts({ res: mobile || lowPower ? 50 : 68 });
  const ele = await loadElephant();
  const addStatue = (g, p, ry = 0, s = 1, key = 'statue') => { if (g) B.add(key, place(g.clone(), p.x, p.y, p.z, 0, ry, 0, s), key === 'elephant' ? { uv: 'keep' } : {}); };
  const order = ['guardian', 'elephant', 'lion', 'griffin', 'goddess'];
  const scale = { guardian: 1.0, elephant: 1.0, lion: 0.98, griffin: 0.95, goddess: 0.92 };
  for (const g of ny.guards) {
    const kind = order[g.level];
    if (kind === 'elephant') addStatue(ele, g.pos, 0, 0.95, 'elephant');
    else addStatue(sculpt[kind], g.pos, 0, scale[kind]);
  }
  for (const s of [-1, 1]) {
    const p = v3(PLAN.vatsala.x + 7.4, 0, PLAN.vatsala.z + s * 2.2);
    B.add('step', box(1.6, 0.9, 1.1, p.x, 0, p.z));
    addStatue(ele, v3(p.x, 0.9, p.z), Math.PI / 2, 0.8, 'elephant');
    const q = v3(G.x + s * 3.6, 0, G.z + 3.6);
    B.add('step', box(1.5, 1.1, 1.8, q.x, 0, q.z));
    B.add('stone', box(1.6, 0.14, 1.9, q.x, 1.1, q.z));
    addStatue(sculpt.lion, v3(q.x, 1.24, q.z), 0, 1.25);
    const m = v3(PLAN.mandap.x + s * 1.9, 0, PLAN.mandap.z + 8.0);
    B.add('step', box(1.1, 0.8, 1.0, m.x, 0, m.z));
    addStatue(sculpt.lion, v3(m.x, 0.8, m.z), 0, 0.72);
  }
  for (const s of [-1, 1]) addStatue(sculpt.griffin, v3(PLAN.golden.x + 0.2, gg.roofY + 0.85, PLAN.golden.z + s * 2.6), Math.PI / 2, 0.42, 'gilt');
  addStatue(sculpt.guardian, v3(PLAN.column.x, 8.2, PLAN.column.z), Math.PI / 2, 0.62, 'gilt');
  B.add('gilt', place(new THREE.ConeGeometry(0.7, 0.4, 12, 1, true), PLAN.column.x, 9.85, PLAN.column.z));
  onProgress(0.84);

  const world = B.build(M, { shadows: renderer.shadowMap.enabled });
  scene.add(world);

  // ───────────────────────── Portraits on the palace wall ─────────────────────────
  const loader = new THREE.TextureLoader();
  const loadImg = (url) => new Promise((res) => {
    if (!url) { res(null); return; }
    loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null));
  });
  const texs = await Promise.all(frames.map((f) => loadImg(f.url)));
  onProgress(0.94);
  const frameInfo = [];
  const FB = new Builder(TILES);
  const spots = pal.spots;
  const marigoldCurves = [];
  texs.forEach((t, i) => {
    const z = spots[Math.min(i, spots.length - 1)];
    const asp = t?.image ? t.image.width / t.image.height : 0.8;
    let h = 2.2, w = h * asp;
    if (w > 3.3) { w = 3.3; h = w / asp; }
    const mat = 0.13, rim = 0.11;
    const cy = pal.wallY + 0.35 + 3.05 / 2 + 0.05;
    const fx = P.fx + 0.06;
    const W = w + 2 * (mat + rim), H = h + 2 * (mat + rim);
    FB.add('gilt', box(0.09, H, W, fx + 0.045, cy - H / 2, z));
    FB.add('woodPaint', box(0.1, H - 2 * rim + 0.02, W - 2 * rim + 0.02, fx + 0.06, cy - H / 2 + rim - 0.01, z), { color: '#3C2A1E' });
    FB.add('paper', box(0.02, h + 2 * mat, w + 2 * mat, fx + 0.115, cy - h / 2 - mat, z));
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, color: t ? '#FFFFFF' : '#DDD', envMapIntensity: 0.4 }));
    ph.position.set(fx + 0.128, cy, z);
    ph.rotation.y = Math.PI / 2;
    ph.receiveShadow = true;
    scene.add(ph);
    FB.add('bronze', box(0.05, 0.08, 0.08, fx + 0.06, pal.groundTop - 0.25, z));
    for (const s of [-1, 1]) {
      const g = new THREE.CylinderGeometry(0.008, 0.008, 1, 4);
      const a = v3(fx + 0.07, cy + H / 2 - 0.04, z + s * (W / 2 - 0.25)), b = v3(fx + 0.07, pal.groundTop - 0.22, z);
      const d = b.clone().sub(a);
      g.translate(0, 0.5, 0); g.scale(1, d.length(), 1);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d.clone().normalize()));
      g.translate(a.x, a.y, a.z);
      FB.add('dark', g);
    }
    marigoldCurves.push(catenary(v3(fx + 0.16, cy + H / 2 + 0.02, z - W / 2 - 0.05), v3(fx + 0.16, cy + H / 2 + 0.02, z + W / 2 + 0.05), 0.3, 24));
    for (const s of [-1, 1]) marigoldCurves.push([v3(fx + 0.16, cy + H / 2 + 0.02, z + s * (W / 2 + 0.05)), v3(fx + 0.18, cy + H / 2 - 0.55, z + s * (W / 2 + 0.07))]);
    frameInfo.push({ center: v3(fx + 0.13, cy, z), w: W, h: H });
  });
  scene.add(FB.build(M, { shadows: renderer.shadowMap.enabled }));

  // ───────────────────────── Life ─────────────────────────
  {
    const gx = PLAN.golden.x + GATE.D / 2 + 0.2, gz = PLAN.golden.z;
    const top = GATE.H - 0.25;
    marigoldCurves.push(catenary(v3(gx, top, gz - 3.1), v3(gx, top, gz), 0.7, 30), catenary(v3(gx, top, gz), v3(gx, top, gz + 3.1), 0.7, 30));
    for (const dz of [-3.1, -1.6, 1.6, 3.1]) marigoldCurves.push([v3(gx, top, gz + dz), v3(gx + 0.02, top - 2.4, gz + dz)]);
    for (const s of [-1, 1]) {
      const pts = [];
      for (let k = 0; k <= 5; k++) pts.push(v3(N.x + s * (NYATAPOLA.stairW / 2 + 0.16), k * NYATAPOLA.th + 0.6, ny.stairFront - k * ((NYATAPOLA.sizes[0] - NYATAPOLA.sizes[1]) / 2) - 0.2));
      marigoldCurves.push(pts);
    }
    const mc = PLAN.mandap;
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * TAU + Math.PI / 8, a1 = ((i + 1) / 8) * TAU + Math.PI / 8;
      marigoldCurves.push(catenary(v3(mc.x + Math.cos(a0) * 5.15, 3.9, mc.z + Math.sin(a0) * 5.15), v3(mc.x + Math.cos(a1) * 5.15, 3.9, mc.z + Math.sin(a1) * 5.15), 0.45, 22));
    }
    // the lion gate: strands hanging beside the arch on both faces (the passage stays clear)
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) for (const k of [0, 1]) {
      const x = G.x + sx * (2.6 + k * 0.35), z = G.z + sz * 1.75;
      marigoldCurves.push([v3(x, 7.25, z), v3(x, 4.2 - k * 0.5, z)]);
    }
    marigoldCurves.push(catenary(bh.door.clone().add(v3(-0.6, 3.2, -1.2)), bh.door.clone().add(v3(-0.6, 3.2, 1.2)), 0.45, 24));
  }
  createMarigolds(scene, marigoldCurves, { detail: mobile || lowPower ? 0 : 1 });
  const bunting = createBunting(scene, [
    catenary(v3(G.x - 6.2, 7.6, 76), v3(G.x + 6.2, 7.4, 79), 1.1, 18),
    catenary(v3(G.x - 6.2, 7.2, 90), v3(G.x + 6.2, 7.6, 88), 1.0, 18),
    catenary(v3(G.x - 6.2, 7.5, 103), v3(G.x + 6.2, 7.2, 105), 1.1, 18),
    catenary(v3(-34, 8.5, 34), v3(-22, 6.8, 47), 1.4, 24),
    catenary(v3(44, 6.8, 57), v3(66, 7.6, 40), 1.4, 24),
  ], { reduced });
  const pigeons = createPigeons(scene, {
    spots: [{ x: N.x, z: 15, r: 5 }, { x: N.x - 7, z: 24, r: 5 }, { x: N.x + 6, z: 13, r: 2.5 }, { x: -22, z: 4, r: 4 }, { x: 2, z: 46, r: 6 }, { x: 34, z: 20, r: 5 }, { x: -20, z: -4, r: 3 }],
    flockCenter: v3(N.x, 0, N.z), count: lowPower ? 40 : 70, flyers: lowPower ? 10 : 16, reduced,
  });
  onProgress(1);

  // ───────────────────────── Camera stations ─────────────────────────
  let stations = [];
  let p = 0;
  let intro = 0;
  const clock = new THREE.Clock();
  let paused = false;
  const frameAt = (i) => frameInfo[Math.min(i, frameInfo.length - 1)];

  // The camera orbits a target: yaw is measured from +z toward +x; pitch > 0 looks down.
  const POSES = {
    arrival: { target: v3(G.x, 8.5, 40), yaw: 0, pitch: -0.13, dist: 52, distNarrow: 52, fov: [62, 50, 44], layout: 'bottom' },
    names: { target: v3(N.x, 14.2, N.z), yaw: -0.26, yawNarrow: -0.03, pitch: -0.2, dist: 47, distNarrow: 56, fov: [58, 48, 44], layout: 'left' },
    mandap: { target: v3(PLAN.mandap.x, 4.6, PLAN.mandap.z), yaw: 0.2, pitch: 0.05, dist: 26, distNarrow: 34, fov: [56, 46, 42] },
    shikhara: { target: v3(PLAN.vatsala.x - 2, 7.2, PLAN.vatsala.z - 4), yaw: 1.2, pitch: 0.0, dist: 31, distNarrow: 42, fov: [56, 46, 42] },
    gate: { target: v3(PLAN.golden.x + 1.3, 4.7, PLAN.golden.z), yaw: Math.PI / 2 + 0.16, pitch: 0.0, dist: 16.5, distNarrow: 23, fov: [56, 46, 42] },
    bhairab: { target: v3(PLAN.bhairab.x - 3, 7.5, PLAN.bhairab.z), yaw: -1.2, pitch: -0.02, dist: 34, distNarrow: 46, fov: [56, 46, 42] },
    finale: { target: v3(8, 4, 4), yaw: 0.5, pitch: 0.5, dist: 118, distNarrow: 150, fov: [56, 46, 42], layout: 'none' },
  };
  // Waypoints so long moves go round the temples (and over the roofs), never through them.
  const VIA = {
    'arrival>names': { at: 0.45, target: v3(N.x, 9.5, 8), yaw: -0.05, pitch: -0.11, dist: 49 },
    'names>frame': { at: 0.5, target: v3(-20, 4, 6), yaw: 0.9, pitch: 0.08, dist: 22 },
    'frame>mandap': { at: 0.5, target: v3(-14, 4, -20), yaw: 0.3, pitch: 0.55, dist: 20 },
    'gate>bhairab': { at: 0.5, target: v3(N.x, 12, 8), yaw: 0.25, pitch: 0.26, dist: 40 },
    'shikhara>bhairab': { at: 0.5, target: v3(N.x, 12, 8), yaw: 0.25, pitch: 0.26, dist: 40 },
  };
  const SPOT_TOD = { mandap: 0.12, shikhara: 0.2, gate: 0.3, bhairab: 0.9 };

  function setStations(list) {
    stations = list.map((s) => {
      if (s.kind === 'frame') {
        const f = frameAt(s.index);
        const t = f.center.clone(); t.y += 1.9;
        const tN = f.center.clone(); tN.y += 0.9;
        return { ...s, pose: { target: t, targetNarrow: tN, yaw: Math.PI / 2 - 0.42, pitch: -0.1, fit: [f.w + 3.2, f.h + 6.4], fitNarrow: [f.w + 0.5, f.h + 1.6], fov: [52, 46, 42] }, family: 'frame', tod: 0.08 };
      }
      if (s.kind === 'spot') return { ...s, pose: POSES[s.spot], family: s.spot, tod: SPOT_TOD[s.spot] ?? 0.2 };
      return { ...s, pose: POSES[s.kind], family: s.kind, tod: s.kind === 'finale' ? 1 : 0 };
    });
  }

  function layoutOf(layout, aspect) {
    const narrow = aspect < 0.9;
    if (layout === 'none') return { sx: 0, sy: 0, wf: 0.9, hf: 0.9 };
    if (layout === 'bottom') return narrow ? { sx: 0, sy: 0.1, wf: 0.95, hf: 0.6 } : { sx: 0, sy: 0.06, wf: 0.9, hf: 0.7 };
    if (narrow && layout === 'tall') return { sx: 0, sy: 0.44, wf: 0.92, hf: 0.3 };
    if (layout === 'tall') layout = 'right';
    if (layout === 'tall-left') layout = narrow ? 'tall' : 'left';
    if (narrow && layout === 'tall') return { sx: 0, sy: 0.44, wf: 0.92, hf: 0.3 };
    if (narrow) return { sx: 0, sy: aspect < 0.5 ? 0.36 : 0.3, wf: 0.92, hf: aspect < 0.5 ? 0.42 : 0.48 };
    const side = layout === 'left' ? 1 : -1; // card on the left → subject to the right
    return { sx: 0.3 * side, sy: 0, wf: 0.56, hf: 0.86 };
  }
  function resolve(st, aspect) {
    const P0 = st.pose;
    const F = P0.fov || [56, 46, 42];
    const fov = aspect < 0.9 ? F[0] : aspect < 1.4 ? F[1] : F[2];
    const L = layoutOf(st.wed ? (st.layout === 'left' ? 'tall-left' : 'tall') : (st.layout || P0.layout || 'left'), aspect);
    const t = Math.tan(MathUtils.degToRad(fov / 2));
    let dist = P0.dist;
    if (P0.fit) {
      const [w, h] = aspect < 0.9 && P0.fitNarrow ? P0.fitNarrow : P0.fit;
      dist = Math.max(h / 2 / t / L.hf, w / 2 / (t * aspect) / L.wf);
    } else if (aspect < 0.9 && P0.distNarrow) dist = P0.distNarrow;
    else if (aspect < 1.4 && P0.distNarrow) dist = P0.dist + (P0.distNarrow - P0.dist) * 0.3;
    return { target: aspect < 0.9 && P0.targetNarrow ? P0.targetNarrow : P0.target, yaw: aspect < 0.9 && P0.yawNarrow != null ? P0.yawNarrow : P0.yaw, pitch: P0.pitch, dist, sx: L.sx, sy: L.sy, fov };
  }
  const angLerp = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
  const lerpPose = (A, Bp, e) => ({
    target: A.target.clone().lerp(Bp.target, e),
    yaw: angLerp(A.yaw, Bp.yaw, e),
    pitch: MathUtils.lerp(A.pitch, Bp.pitch, e),
    dist: Math.exp(MathUtils.lerp(Math.log(A.dist), Math.log(Bp.dist), e)),
    sx: MathUtils.lerp(A.sx ?? 0, Bp.sx ?? 0, e), sy: MathUtils.lerp(A.sy ?? 0, Bp.sy ?? 0, e),
    fov: MathUtils.lerp(A.fov ?? 45, Bp.fov ?? 45, e),
  });
  // Quadratic Bézier through a waypoint: one continuous glide, no stop at the waypoint.
  const bez = (A, V, Bq, e) => {
    const a = lerpPose(A, V, e), b = lerpPose(V, Bq, e);
    return lerpPose(a, b, e);
  };

  function poseAt(pp, aspect) {
    const n = stations.length;
    const pc = Math.min(Math.max(pp, 0), n - 1);
    const i = Math.min(Math.floor(pc), n - 2);
    const f = pc - i;
    const SA = stations[i], SB = stations[i + 1] || stations[i];
    const A = resolve(SA, aspect), Bq = resolve(SB, aspect);
    const e = smoother(f);
    const via = SA === SB ? null : VIA[`${SA.family}>${SB.family}`];
    let out;
    if (via) {
      const V = { ...via, sx: (A.sx + Bq.sx) / 2, sy: (A.sy + Bq.sy) / 2, fov: (A.fov + Bq.fov) / 2, dist: via.dist * (aspect < 0.9 ? 1.2 : 1) };
      // pull the control point so the curve passes the waypoint at its midpoint
      const C = lerpPose(lerpPose(A, Bq, 0.5), V, 2);
      out = bez(A, C, Bq, e);
    } else out = lerpPose(A, Bq, e);
    out.tod = MathUtils.lerp(SA.tod, SB.tod, smooth(f));
    if (intro > 0) {
      const k = smoother(intro);
      out.dist *= 1 + 0.5 * k;
      out.target = out.target.clone();
      out.target.y += 2 * k;
      out.pitch = MathUtils.lerp(out.pitch, -0.05, k);
    }
    return out;
  }
  const camFrom = (pose) => {
    const cp = Math.cos(pose.pitch);
    return pose.target.clone().add(v3(Math.sin(pose.yaw) * cp, Math.sin(pose.pitch), Math.cos(pose.yaw) * cp).multiplyScalar(pose.dist));
  };

  // ───────────────────────── Light over the day ─────────────────────────
  const warm = new THREE.Color('#FFCF9A'), white = new THREE.Color('#FFF4E4');
  const hemiSky = new THREE.Color('#DDE8F2'), hemiWarm = new THREE.Color('#F4D9BC');
  let lastTod = -1;
  function applyLight(tod) {
    const k = smooth(clamp01(tod));
    if (Math.abs(k - lastTod) < 1e-4) return;
    lastTod = k;
    const az = MathUtils.lerp(SUN_MORNING.az, SUN_EVENING.az, k);
    const el = MathUtils.lerp(SUN_MORNING.el, SUN_EVENING.el, k);
    sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    // turn sky and image light with the sun: the shader samples R(yaw)·d
    const yaw = SUN_TEX_ANGLE - az;
    scene.backgroundRotation.set(0, yaw, 0);
    scene.environmentRotation.set(0, yaw, 0);
    sun.color.copy(white).lerp(warm, k * 0.9);
    sun.intensity = 3.0 - k * 0.5;
    hemi.color.copy(hemiSky).lerp(hemiWarm, k);
    renderer.toneMappingExposure = 1.0 + k * 0.05;
    scene.environmentIntensity = 0.8 - k * 0.12;
    scene.backgroundIntensity = 1.0 - k * 0.08;
  }

  // ───────────────────────── Ambient occlusion (desktop) ─────────────────────────
  let composer = null;
  if (ao) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const gtao = new GTAOPass(scene, camera, 1, 1);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 1.1, distanceExponent: 1.4, thickness: 2.5, scale: 1.0, samples: 12, distanceFallOff: 1.0 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(gtao);
    composer.addPass(new OutputPass());
  }

  // ───────────────────────── Frame loop ─────────────────────────
  const smoothCam = { pos: v3(), target: v3(), sx: 0, sy: 0, fov: 45 };
  let firstFrame = true;
  let time = 0;
  let debugPose = null;
  const shadowCenter = v3();
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
  }
  function tick() {
    if (paused) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    time += dt;
    const aspect = camera.aspect;
    const pose = debugPose ? { ...debugPose, sx: 0, sy: 0, fov: debugPose.fov || 40, tod: debugPose.tod || 0 } : poseAt(p, aspect);
    applyLight(pose.tod);
    const pos = camFrom(pose);
    pos.y = Math.max(pos.y, 1.2);
    if (!reduced) { pos.x += Math.sin(time * 0.21) * 0.05; pos.y += Math.sin(time * 0.17 + 1) * 0.035; }
    const k = firstFrame ? 1 : 1 - Math.exp(-dt * 6);
    firstFrame = false;
    smoothCam.pos.lerp(pos, k); smoothCam.target.lerp(pose.target, k);
    smoothCam.sx += (pose.sx - smoothCam.sx) * k; smoothCam.sy += (pose.sy - smoothCam.sy) * k;
    smoothCam.fov += (pose.fov - smoothCam.fov) * k;
    camera.position.copy(smoothCam.pos);
    camera.lookAt(smoothCam.target);
    camera.fov = smoothCam.fov;
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] = -smoothCam.sx;
    camera.projectionMatrix.elements[9] = -smoothCam.sy;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    // shadows follow what the camera looks at, snapped to texels so edges never crawl
    const dist = smoothCam.pos.distanceTo(smoothCam.target);
    const half = MathUtils.clamp(dist * 1.05, 28, 120);
    const sc = sun.shadow.camera;
    if (Math.abs(sc.right - half) > 0.5) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.updateProjectionMatrix(); }
    const texel = (2 * sc.right) / SM;
    shadowCenter.copy(smoothCam.target).lerp(smoothCam.pos, 0.35);
    shadowCenter.x = Math.round(shadowCenter.x / texel) * texel;
    shadowCenter.z = Math.round(shadowCenter.z / texel) * texel;
    shadowCenter.y = 0;
    sun.target.position.copy(shadowCenter);
    sun.position.copy(shadowCenter).addScaledVector(sunDir, 200);
    sun.target.updateMatrixWorld();
    pigeons.update(time, dist < 90);
    bunting.update(time);
    if (composer) composer.render(); else renderer.render(scene, camera);
  }

  resize();
  return {
    renderer, scene, camera,
    setStations,
    get stations() { return stations; },
    setProgress(v) { p = v; },
    get progress() { return p; },
    setIntro(v) { intro = v; },
    snap() { firstFrame = true; },
    /** Debug: look at target from yaw/pitch/dist (null to release). */
    look(t) { debugPose = t ? { target: v3(...t.target), yaw: t.yaw, pitch: t.pitch, dist: t.dist, fov: t.fov, tod: t.tod } : null; firstFrame = true; },
    resize, tick,
    start() { renderer.setAnimationLoop(tick); },
    pause(v) { paused = v; if (!v) clock.getDelta(); },
    project(v) { const q = v.clone().project(camera); return [(q.x + 1) / 2, (1 - q.y) / 2]; },
    samplePath(aspect, step = 0.05) { const out = []; for (let x = 0; x <= stations.length - 1 + 1e-6; x += step) out.push([+x.toFixed(2), ...camFrom(poseAt(x, aspect)).toArray().map((q) => +q.toFixed(1))]); return out; },
    info() { const i = renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures }; },
    heights: { nyTop, cm: cm.top, bh: bh.top, vat: vat.top },
  };
}

/** A ring of low hills (the valley rim) far out, hazed by the fog. */
function hillsGeometry() {
  const seg = 160, rows = 6;
  const pos = [], idx = [];
  const R0 = 820, R1 = 1150;
  for (let r = 0; r <= rows; r++) {
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * TAU;
      const t = r / rows;
      const rad = R0 + (R1 - R0) * t;
      const n = Math.sin(a * 3 + 1.3) * 0.45 + Math.sin(a * 7.1) * 0.25 + Math.sin(a * 17.3 + 2) * 0.12 + Math.sin(a * 41 + t * 3) * 0.06 + Math.sin(a * 89) * 0.03 + 0.55;
      const h = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.8) * (35 + 85 * n);
      pos.push(Math.cos(a) * rad, h - 4, Math.sin(a) * rad);
    }
  }
  for (let r = 0; r < rows; r++) for (let i = 0; i < seg; i++) {
    const a = r * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
