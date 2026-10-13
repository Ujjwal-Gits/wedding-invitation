// Gurans · falling rhododendron petals. Real petal photographs (cut from a CC BY-SA
// close-up of Rhododendron arboreum) mapped onto cupped, curled 3D petal meshes that
// tumble slowly through the walk. Drawn as an overlay pass of the PhotoStage renderer.
import {
  AmbientLight, Color, DirectionalLight, DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D,
  PerspectiveCamera, Scene, Shape, ShapeGeometry, SRGBColorSpace, TextureLoader,
} from 'three';

const SPREAD_X = 9;
const SPREAD_Y = 7;
const DEPTH = 18;

function petalGeometry() {
  const s = new Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.62, 0.22, 0.7, 0.95, 0.18, 1.3);
  s.bezierCurveTo(0.08, 1.4, -0.08, 1.4, -0.18, 1.3);
  s.bezierCurveTo(-0.7, 0.95, -0.62, 0.22, 0, 0);
  const g = new ShapeGeometry(s, 18);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv.setXY(i, x / 1.5 + 0.5, y / 1.42);
    pos.setZ(i, x * x * 0.55 - y * y * 0.16 + Math.sin(y * 3) * 0.03); // cupped, curling back at the tip
  }
  g.translate(0, -0.65, 0);
  g.scale(0.34, 0.34, 0.34);
  g.computeVertexNormals();
  return g;
}

/** Returns { render, setAmount }. `amount` 0..1 sets how many petals are in the air. */
export function createPetals({ mobile = false, textures = [] } = {}) {
  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.1, 60);
  camera.position.set(0, 0, 6);
  scene.add(new AmbientLight(0xfff6ee, 1.9));
  const sun = new DirectionalLight(0xfff3e2, 2.4);
  sun.position.set(-3, 6, 7);
  scene.add(sun);

  const loader = new TextureLoader();
  const geo = petalGeometry();
  const per = Math.round((mobile ? 22 : 46) / Math.max(1, textures.length));
  const meshes = textures.map((src) => {
    const map = loader.load(src);
    map.colorSpace = SRGBColorSpace;
    const mat = new MeshStandardMaterial({ map, side: DoubleSide, roughness: 0.62, metalness: 0, color: new Color('#ffffff') });
    const m = new InstancedMesh(geo, mat, per);
    m.frustumCulled = false;
    scene.add(m);
    return m;
  });

  const dummy = new Object3D();
  const tint = new Color();
  const all = [];
  meshes.forEach((mesh, mi) => {
    for (let i = 0; i < per; i++) all.push(spawn({ mesh, i, rank: (i * meshes.length + mi) / (per * meshes.length) }, true));
  });

  function spawn(p, anywhere) {
    p.x = (Math.random() * 2 - 1) * SPREAD_X;
    p.y = anywhere ? (Math.random() * 2 - 1) * SPREAD_Y : SPREAD_Y + Math.random() * 2;
    p.z = -DEPTH + Math.random() * (DEPTH + 2.5);
    p.fall = 0.28 + Math.random() * 0.32;
    p.drift = 0.15 + Math.random() * 0.25;
    p.phase = Math.random() * 6.28;
    p.rx = Math.random() * 6.28; p.ry = Math.random() * 6.28; p.rz = Math.random() * 6.28;
    p.vx = (Math.random() - 0.5) * 1.1; p.vy = (Math.random() - 0.5) * 0.9; p.vz = (Math.random() - 0.5) * 0.7;
    p.size = 0.75 + Math.random() * 0.55;
    p.s = p.s ?? 0;
    tint.setHSL(0.99 + Math.random() * 0.02, 0.15, 0.82 + Math.random() * 0.18);
    p.mesh.setColorAt(p.i, tint);
    if (p.mesh.instanceColor) p.mesh.instanceColor.needsUpdate = true;
    return p;
  }

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = camera.aspect < 0.8 ? 64 : 50;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let amount = 0;
  let target = 0;
  let wind = 0;
  let last = performance.now();
  const lerp = (a, b, k) => a + (b - a) * k;

  const render = (renderer) => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    amount = lerp(amount, target, 1 - Math.pow(0.05, dt));
    if (amount < 0.003 && target === 0) return;
    const t = now / 1000;
    for (const p of all) {
      p.y -= p.fall * dt;
      p.x += (Math.sin(t * 0.6 + p.phase) * p.drift + wind * 0.6) * dt;
      p.rx += p.vx * dt; p.ry += p.vy * dt; p.rz += p.vz * dt;
      if (p.y < -SPREAD_Y - 1) spawn(p, false);
      const want = p.rank < amount ? p.size : 0;
      p.s = lerp(p.s, want, 1 - Math.pow(0.1, dt));
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      p.mesh.setMatrixAt(p.i, dummy.matrix);
    }
    meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
    renderer.clearDepth();
    renderer.render(scene, camera);
  };

  return {
    render,
    setAmount: (v) => { target = Math.max(0, Math.min(1, v)); },
    /** A breath of wind as the walk moves on (sideways drift). */
    setWind: (v) => { wind = v; },
  };
}
