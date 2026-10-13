// PBR materials for the square. Textures are CC0 from Poly Haven (see README);
// the Golden Gate's face is a rectified CC0 photograph of the real gate.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const TEX = '/themes/durbar/tex/';

// metres per texture tile, per material key (world-projected UVs)
export const TILES = { statue: 0.9, brick: 1.0, brickOld: 1.6, pave: 2.2, stone: 2.4, step: 1.6, wood: 1.4, woodPaint: 1.4, roof: 1.8, roofMoss: 1.8, stucco: 3, plinth: 1.0, house: 1.6, houseRoof: 1.8 };

export async function loadMaterials(renderer, { mobile, lowPower, onProgress = () => {} }) {
  const tl = new THREE.TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  let done = 0;
  const jobs = [];
  const load = (f, srgb = true) => {
    const p = new Promise((res) => tl.load(TEX + f, (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = aniso;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      res(t);
    }, undefined, () => res(null)));
    jobs.push(p);
    p.then(() => onProgress(++done / jobs.length));
    return p;
  };
  const small = mobile || lowPower;
  const set = (name, big) => Promise.all([
    load(`${name}_diff${big && !small ? '' : '_1k'}.webp`),
    load(`${name}_nor.webp`, false),
    load(`${name}_arm.webp`, false),
  ]);
  const env = new Promise((res) => new RGBELoader().load(TEX + 'sky.hdr', (t) => {
    const pm = new THREE.PMREMGenerator(renderer);
    const rt = pm.fromEquirectangular(t);
    t.dispose(); pm.dispose();
    res(rt.texture);
  }, undefined, () => res(null)));
  jobs.push(env);
  const skyP = load(small ? 'sky-2k.webp' : 'sky-4k.webp');
  const gateP = load('gate-face.webp');
  const eleNorP = load('elephant_nor.webp', false);
  const galP = load('palace_gallery.webp');
  const winP = load('palace_window.webp');

  const [brick, pave, brickOld, roof, wood, stone, stucco, envTex, sky, gate, eleNor, galTex, winTex] = await Promise.all([
    set('newar_brick', true), set('herringbone_brick', true), set('medieval_red_brick'), set('roof_tiles_14'),
    set('rough_wood'), set('large_sandstone_blocks_01'), set('white_stucco'), env, skyP, gateP, eleNorP, galP, winP,
  ]);

  const std = (maps, { ns, ...opts } = {}) => {
    const [map, normalMap, arm] = maps || [];
    const m = new THREE.MeshStandardMaterial({
      map, normalMap, roughnessMap: arm, aoMap: arm, aoMapIntensity: 0.7,
      roughness: 1, metalness: 0, vertexColors: true, ...opts,
    });
    if (normalMap) m.normalScale = new THREE.Vector2(...(ns || [1, 1]));
    return m;
  };

  const M = {
    brick: std(brick, { color: '#FFFFFF', ns: [1, 1] }),
    plinth: std(brick, { color: '#F1DDD6', ns: [1, 1] }),
    house: std(brick, { color: '#E2CEC6' }),
    brickOld: std(brickOld, { color: '#DDB4A0' }),
    pave: std(pave, { color: '#FFFFFF', ns: [0.8, 0.8] }),
    stone: std(stone, { color: '#C9C1B3', ns: [1.1, 1.1] }),
    step: std(stone, { color: '#E6DFD4' }),
    statue: std(stone, { color: '#AEA89C', ns: [1.3, 1.3] }),
    elephant: std([stone[0], eleNor || stone[1], stone[2]], { color: '#B3ADA1', ns: [1.2, 1.2] }),
    wood: std(wood, { color: '#6E4C36', ns: [1.2, 1.2] }),
    woodPaint: std(wood, { color: '#FFFFFF', ns: [1, 1] }),
    roof: std(roof, { color: '#B48C76', ns: [1.2, 1.2] }),
    roofMoss: std(roof, { color: '#98846E', ns: [1.2, 1.2] }),
    houseRoof: std(roof, { color: '#A88F75' }),
    stucco: std(stucco, { color: '#F6F2EA', ns: [0.6, 0.6] }),
    gilt: new THREE.MeshStandardMaterial({ color: '#E8B652', metalness: 1, roughness: 0.24, vertexColors: true }),
    bronze: new THREE.MeshStandardMaterial({ color: '#8C6A3E', metalness: 1, roughness: 0.42, vertexColors: true }),
    dark: new THREE.MeshStandardMaterial({ color: '#2A1E17', roughness: 1, vertexColors: true }),
    paper: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.92, vertexColors: true }),
    paint: new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.75, vertexColors: true }),
    gateFace: new THREE.MeshStandardMaterial({ map: gate, roughness: 0.62, metalness: 0.0, vertexColors: true }),
    // rectified from a CC BY-SA photograph of the real palace (Shadow Ayush): the carved gallery and window hoods
    galleryFace: new THREE.MeshStandardMaterial({ map: galTex, roughness: 0.82, vertexColors: true }),
    carved: new THREE.MeshStandardMaterial({ map: winTex, alphaTest: 0.5, alphaToCoverage: true, roughness: 0.8, vertexColors: true }),
    fringe: fringeMaterial(),
    lattice: latticeMaterial(),
    strut: strutMaterial(wood),
    window: new THREE.MeshStandardMaterial({ color: '#15100C', roughness: 0.55, vertexColors: true }),
  };
  M.gateFace.map && (M.gateFace.map.wrapS = M.gateFace.map.wrapT = THREE.ClampToEdgeWrapping);
  M.window.userData.noShadow = true;
  return { M, env: envTex, sky };
}

/** The pleated red-and-white cloth fringe that hangs from palace and temple eaves. */
function fringeMaterial() {
  const W = 256, H = 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  const n = 16, pw = W / n;
  for (let i = 0; i < n; i++) {
    const x = i * pw;
    const grd = g.createLinearGradient(x, 0, x + pw, 0);
    grd.addColorStop(0, '#6E1A16'); grd.addColorStop(0.5, '#B7362B'); grd.addColorStop(1, '#6E1A16');
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + pw, 0); g.lineTo(x + pw, H * 0.72); g.quadraticCurveTo(x + pw / 2, H * 1.0, x, H * 0.72); g.closePath(); g.fill();
  }
  g.fillStyle = '#EDE3D2'; g.fillRect(0, 0, W, 7);
  g.fillStyle = '#C9A040'; g.fillRect(0, 7, W, 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.9, vertexColors: true });
}

/** Newar sanjhyal: a carved frame around a fine diagonal lattice (alpha cut-out). */
function latticeMaterial() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  // holes are painted as the dark room behind (opaque, mip-mapped): an alpha-tested fine lattice shimmers in motion
  g.fillStyle = '#17110D'; g.fillRect(0, 0, S, S);
  const wood = '#4A3324';
  g.fillStyle = wood;
  // outer carved frame
  const F = 34;
  g.fillRect(0, 0, S, F); g.fillRect(0, S - F, S, F); g.fillRect(0, 0, F, S); g.fillRect(S - F, 0, F, S);
  // lattice: diagonal bars both ways, with small square holes between
  g.save();
  g.beginPath(); g.rect(F, F, S - 2 * F, S - 2 * F); g.clip();
  g.strokeStyle = wood; g.lineWidth = 9;
  const step = 26;
  for (let k = -S; k < 2 * S; k += step) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S, S); g.stroke();
    g.beginPath(); g.moveTo(k, S); g.lineTo(k + S, 0); g.stroke();
  }
  // a central rosette, as on many palace windows
  g.fillStyle = wood;
  g.beginPath(); g.arc(S / 2, S / 2, 46, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#6B4A33';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.beginPath(); g.ellipse(S / 2 + Math.cos(a) * 26, S / 2 + Math.sin(a) * 26, 12, 6, a, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  // frame bead line
  g.strokeStyle = '#7A563C'; g.lineWidth = 4;
  g.strokeRect(F - 8, F - 8, S - 2 * F + 16, S - 2 * F + 16);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide, vertexColors: true });
  return m;
}

/** Painted carved struts (tunala): a deity relief, coloured as on Bhaktapur temples. */
function strutMaterial(wood) {
  const W = 128, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, W, 0);
  grd.addColorStop(0, '#3A281C'); grd.addColorStop(0.5, '#5A3E2B'); grd.addColorStop(1, '#3A281C');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // figure: halo, head, body, arms, lotus base; painted in muted temple colours
  const col = ['#5E2B20', '#33463D', '#7D6638'];
  g.fillStyle = col[1]; g.beginPath(); g.ellipse(W / 2, 92, 46, 56, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#8E6E4C'; g.beginPath(); g.ellipse(W / 2, 96, 18, 22, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = col[2]; g.fillRect(W / 2 - 14, 52, 28, 22);
  g.fillStyle = col[0]; g.beginPath(); g.moveTo(W / 2 - 30, 128); g.lineTo(W / 2 + 30, 128); g.lineTo(W / 2 + 22, 330); g.lineTo(W / 2 - 22, 330); g.closePath(); g.fill();
  g.strokeStyle = '#8E6E4C'; g.lineWidth = 9; g.lineCap = 'round';
  [[-30, 150, -48, 230], [30, 150, 48, 230], [-30, 160, -20, 250], [30, 160, 20, 250]].forEach(([x0, y0, x1, y1]) => { g.beginPath(); g.moveTo(W / 2 + x0, y0); g.lineTo(W / 2 + x1, y1); g.stroke(); });
  g.fillStyle = col[2];
  for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(W / 2 + (i - 2) * 16, 352, 10, 18, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#2B1D14'; g.fillRect(0, 400, W, 112);
  g.fillStyle = col[0]; g.beginPath(); g.ellipse(W / 2, 450, 30, 26, 0, 0, Math.PI * 2); g.fill();
  // soft grain over all
  g.globalAlpha = 0.18;
  for (let i = 0; i < 400; i++) { g.fillStyle = i % 2 ? '#000' : '#fff'; g.fillRect(Math.random() * W, Math.random() * H, 1, 6 + Math.random() * 18); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: t, normalMap: wood?.[1] || null, roughness: 0.8, vertexColors: true });
}
