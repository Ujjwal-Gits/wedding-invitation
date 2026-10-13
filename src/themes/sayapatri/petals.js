// A handful of real-3D marigold petals hanging in the air above the page.
// They drift and tumble on their own and move with the scroll at their own depth,
// so the page feels layered without anything zooming. Sparse on purpose.
import {
  AmbientLight, Color, DirectionalLight, DoubleSide, HemisphereLight, InstancedMesh, MeshStandardMaterial,
  Object3D, PerspectiveCamera, Scene, Shape, ShapeGeometry, WebGLRenderer,
} from 'three';

// Rose and peony petals in the stage palette, with the odd marigold petal.
const PALETTE = ['#F4C9CF', '#EFB2BC', '#FBE3E4', '#E68A9A', '#F7D7D2', '#F08A12'];
const FOV = 38;
const CAM_Z = 12;

/** A ruffled, cupped marigold petal: frilled tip, narrow base. */
function petalGeometry() {
  const s = new Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.42, 0.18, 0.62, 0.62, 0.58, 1.02);
  // Frilled tip: five little scallops.
  const tip = [[0.5, 1.16], [0.3, 1.1], [0.14, 1.22], [-0.04, 1.12], [-0.22, 1.2], [-0.4, 1.08], [-0.56, 1.0]];
  let px = 0.58;
  let py = 1.02;
  for (const [x, y] of tip) {
    s.quadraticCurveTo((px + x) / 2, Math.max(py, y) + 0.08, x, y);
    px = x; py = y;
  }
  s.bezierCurveTo(-0.62, 0.6, -0.4, 0.18, 0, 0);
  const g = new ShapeGeometry(s, 10);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, x * x * 0.7 - y * y * 0.18 + Math.sin(x * 9) * 0.03 * y);
  }
  g.translate(0, -0.55, 0);
  g.computeVertexNormals();
  return g;
}

export function createPetals(canvas, { mobile = false } = {}) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power', premultipliedAlpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.set(0, 0, CAM_Z);

  scene.add(new HemisphereLight(0xfff6e0, 0xf2b45a, 1.4));
  scene.add(new AmbientLight(0xffffff, 0.5));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(-3, 6, 8);
  scene.add(key);

  const N = mobile ? 9 : 16;
  const mat = new MeshStandardMaterial({ side: DoubleSide, roughness: 0.62, metalness: 0, emissive: new Color('#7a2a00'), emissiveIntensity: 0.18 });
  const mesh = new InstancedMesh(petalGeometry(), mat, N);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const halfH = (z) => Math.tan((FOV * Math.PI) / 360) * (CAM_Z - z);
  const dummy = new Object3D();
  const tmp = new Color();
  const P = Array.from({ length: N }, (_, i) => {
    const z = -8 + Math.random() * 14; // -8 (far) .. 6 (near)
    const h = halfH(z);
    tmp.set(PALETTE[i % PALETTE.length]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.06);
    mesh.setColorAt(i, tmp);
    return {
      x: 0, y: (Math.random() * 2 - 1) * h, z,
      // Petals keep to the margins (mostly the right, where the photos are), never over the words.
      side: Math.random() < 0.5 ? 1 : -1,
      rx: Math.random() * 6.28, ry: Math.random() * 6.28, rz: Math.random() * 6.28,
      vx: (Math.random() - 0.5) * 0.9, vy: (Math.random() - 0.5) * 0.9, vz: (Math.random() - 0.5) * 0.7,
      fall: 0.12 + Math.random() * 0.22,
      sway: Math.random() * 6.28,
      size: (0.2 + Math.random() * 0.18) * (mobile ? 0.8 : 1),
      s: 0,
    };
  });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  let aspect = 1;
  const placeX = (p) => {
    const w = halfH(p.z) * aspect;
    p.x = p.side * w * (0.55 + Math.random() * 0.45);
  };
  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    P.forEach(placeX);
  };
  resize();
  window.addEventListener('resize', resize);

  let visible = 1;
  let vis = 0;
  let burst = 0;
  let lastY = window.scrollY;
  let last = performance.now();
  let t = 0;
  let cleared = false;

  const frame = () => {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const k = 1 - Math.pow(0.04, dt);
    vis += (visible - vis) * k;
    const dy = window.scrollY - lastY; // px scrolled since last frame
    lastY = window.scrollY;
    if (vis < 0.01) {
      if (!cleared) { renderer.clear(); cleared = true; }
      return;
    }
    cleared = false;
    t += dt;
    const spin = Math.min(3, Math.abs(dy) * 0.02) + burst * 2;
    for (let i = 0; i < N; i++) {
      const p = P[i];
      const h = halfH(p.z);
      // Scroll moves each petal like an object at its depth: near ones faster.
      const par = 0.55 + (p.z + 8) * 0.06;
      p.y += (dy / window.innerHeight) * 2 * h * par - p.fall * dt * (1 + burst * 2);
      p.x += Math.sin(t * 0.6 + p.sway) * dt * 0.25;
      p.rx += p.vx * dt * (1 + spin); p.ry += p.vy * dt * (1 + spin); p.rz += p.vz * dt;
      if (p.y < -h * 1.15) { p.y = h * 1.15; placeX(p); }
      if (p.y > h * 1.15) { p.y = -h * 1.15; placeX(p); }
      p.s += (p.size * vis - p.s) * k;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.setScalar(Math.max(p.s, 0.0001));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    burst *= 1 - k * 0.5;
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);

  return {
    setVisible: (v) => { visible = v; },
    burst: (on) => { if (on) burst = 1; },
  };
}
