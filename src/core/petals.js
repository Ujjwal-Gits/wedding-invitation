// Ambient 3D layer: drifting dust / embers / bokeh (points) and tumbling flower
// petals (instanced meshes). Each chapter picks a preset; the warp value from
// the journey rushes everything toward the camera between chapters.
import {
  AdditiveBlending, AmbientLight, BufferGeometry, Color, DirectionalLight, DoubleSide,
  Float32BufferAttribute, InstancedMesh, MeshStandardMaterial, Object3D, PerspectiveCamera,
  PointLight, Points, Scene, Shape, ShapeGeometry, ShaderMaterial,
} from 'three';

const PRESETS = {
  incense: { dust: '#F3C77A', density: 0.5, rise: 0.35, size: 1.0, petals: 0, palette: ['#E7A13A'] },
  dust: { dust: '#F0D09A', density: 0.4, rise: 0.1, size: 1.0, petals: 0, palette: ['#E7A13A'] },
  rose: { dust: '#F6D9A0', density: 0.45, rise: 0.06, size: 1.0, petals: 0.3, palette: ['#8E1424', '#B5202F', '#D0303F'] },
  jasmine: { dust: '#FFF4DA', density: 0.3, rise: -0.04, size: 0.9, petals: 0.5, palette: ['#FFF8EA', '#F5EDD6', '#E4EBC4'] },
  marigold: { dust: '#FFD27A', density: 0.5, rise: -0.08, size: 1.1, petals: 1, palette: ['#F28C1B', '#F6A821', '#E26A10', '#FFC23D'] },
  embers: { dust: '#FF9440', density: 1, rise: 1.25, size: 1.3, petals: 0.35, palette: ['#F28C1B', '#B5202F', '#F6A821'] },
  bokeh: { dust: '#FFD99A', density: 0.85, rise: 0.04, size: 2.3, petals: 0.18, palette: ['#F6A821', '#FFF1D6', '#B5202F'] },
};

const DEPTH = 40;
const SPREAD_X = 15;
const SPREAD_Y = 12;

const dustVert = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime, uTravel, uRise, uSize, uDensity, uPR, uWarp;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y += uRise * uTime * (0.35 + aSeed.x);
    p.x += sin(uTime * 0.25 + aSeed.y * 6.2831) * 0.7;
    p.y = mod(p.y + ${SPREAD_Y.toFixed(1)}, ${(SPREAD_Y * 2).toFixed(1)}) - ${SPREAD_Y.toFixed(1)};
    float z = mod(p.z + uTravel * (0.6 + aSeed.z * 0.8), ${DEPTH.toFixed(1)});
    vec3 w = vec3(p.x, p.y, z - ${(DEPTH - 4).toFixed(1)});
    vec4 mv = modelViewMatrix * vec4(w, 1.0);
    gl_Position = projectionMatrix * mv;
    float on = step(aSeed.w, uDensity);
    float far = smoothstep(${(-DEPTH + 4).toFixed(1)}, ${(-DEPTH + 16).toFixed(1)}, w.z);
    float near = 1.0 - smoothstep(1.5, 4.0, w.z);
    float tw = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed.z * 2.6) + aSeed.x * 31.0);
    vAlpha = on * far * near * tw;
    gl_PointSize = uSize * (1.6 + aSeed.z * 3.4) * uPR * (64.0 / -mv.z) * (1.0 + uWarp * 1.4);
  }`;

const dustFrag = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 1.8);
    gl_FragColor = vec4(uColor, a * vAlpha);
  }`;

function petalGeometry() {
  const s = new Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.55, 0.28, 0.5, 1.0, 0.04, 1.32);
  s.bezierCurveTo(0.02, 1.38, -0.02, 1.38, -0.04, 1.32);
  s.bezierCurveTo(-0.5, 1.0, -0.55, 0.28, 0, 0);
  const g = new ShapeGeometry(s, 14);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, x * x * 0.9 - y * y * 0.12); // cupped, slightly curled petal
  }
  g.translate(0, -0.6, 0);
  g.scale(0.32, 0.32, 0.32);
  g.computeVertexNormals();
  return g;
}

/** Particle + petal layer drawn on top of the PhotoStage composite (same renderer). */
export function createPetals({ mobile = false } = {}) {
  const pr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  const scene = new Scene();
  const camera = new PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  // ── Dust / embers / bokeh
  const DUST = mobile ? 520 : 1400;
  const pos = new Float32Array(DUST * 3);
  const seed = new Float32Array(DUST * 4);
  for (let i = 0; i < DUST; i++) {
    pos[i * 3] = (Math.random() * 2 - 1) * SPREAD_X;
    pos[i * 3 + 1] = (Math.random() * 2 - 1) * SPREAD_Y;
    pos[i * 3 + 2] = Math.random() * DEPTH;
    seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  dustGeo.setAttribute('aSeed', new Float32BufferAttribute(seed, 4));
  const uniforms = {
    uTime: { value: 0 }, uTravel: { value: 0 }, uRise: { value: 0.3 }, uSize: { value: 1 },
    uDensity: { value: 0.5 }, uPR: { value: pr }, uWarp: { value: 0 }, uColor: { value: new Color('#F3C77A') },
  };
  const dust = new Points(dustGeo, new ShaderMaterial({
    uniforms, vertexShader: dustVert, fragmentShader: dustFrag,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  }));
  dust.frustumCulled = false;
  scene.add(dust);

  // ── Petals
  const PETALS = mobile ? 48 : 140;
  const petalMat = new MeshStandardMaterial({ side: DoubleSide, roughness: 0.5, metalness: 0, emissive: new Color('#3a1404'), emissiveIntensity: 0.6 });
  const petals = new InstancedMesh(petalGeometry(), petalMat, PETALS);
  petals.frustumCulled = false;
  scene.add(petals);
  scene.add(new AmbientLight(0xffe2bd, 1.6));
  const key = new DirectionalLight(0xfff0d6, 3.2);
  key.position.set(2, 6, 8);
  scene.add(key);
  const warm = new PointLight(0xff9a3c, 40, 30);
  warm.position.set(0, -6, 2);
  scene.add(warm);

  const dummy = new Object3D();
  const tmpColor = new Color();
  let palette = PRESETS.incense.palette;
  const state = Array.from({ length: PETALS }, (_, i) => spawn({ i }, true));

  function spawn(p, anywhere) {
    p.x = (Math.random() * 2 - 1) * SPREAD_X * 0.8;
    p.y = anywhere ? (Math.random() * 2 - 1) * SPREAD_Y : SPREAD_Y + Math.random() * 3;
    p.z = -DEPTH + 6 + Math.random() * (DEPTH - 6);
    p.fall = 0.6 + Math.random() * 0.9;
    p.sway = Math.random() * Math.PI * 2;
    p.rx = Math.random() * 6.28; p.ry = Math.random() * 6.28; p.rz = Math.random() * 6.28;
    p.vx = (Math.random() - 0.5) * 1.6; p.vy = (Math.random() - 0.5) * 1.6; p.vz = (Math.random() - 0.5) * 1.2;
    p.size = 0.7 + Math.random() * 0.8;
    p.s = p.s ?? 0;
    p.rank = p.i / PETALS;
    tmpColor.set(palette[Math.floor(Math.random() * palette.length)]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
    petals.setColorAt(p.i, tmpColor);
    if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
    return p;
  }

  // ── Preset blending
  const target = { ...PRESETS.incense, color: new Color(PRESETS.incense.dust) };
  let petalAmount = 0;
  const setPreset = (name) => {
    const p = PRESETS[name] ?? PRESETS.dust;
    Object.assign(target, p);
    target.color = new Color(p.dust);
    palette = p.palette;
    // Recolour now: the change lands mid-transition, hidden by the flare.
    for (const st of state) {
      tmpColor.set(palette[Math.floor(Math.random() * palette.length)]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
      petals.setColorAt(st.i, tmpColor);
    }
    if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
  };

  // ── Size & pointer
  const resize = () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    camera.fov = aspect < 0.8 ? 68 : 55;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  const pointer = { x: 0, y: 0 };
  if (!mobile) {
    window.addEventListener('pointermove', (e) => {
      pointer.x = e.clientX / window.innerWidth - 0.5;
      pointer.y = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  // ── Per-frame, called by the stage after its composite pass
  let warp = 0;
  let last = performance.now();
  let visible = 1;
  const lerp = (a, b, k) => a + (b - a) * k;

  const render = (renderer) => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const k = 1 - Math.pow(0.02, dt);
    uniforms.uRise.value = lerp(uniforms.uRise.value, target.rise, k);
    uniforms.uSize.value = lerp(uniforms.uSize.value, target.size, k);
    uniforms.uDensity.value = lerp(uniforms.uDensity.value, target.density * visible, k);
    uniforms.uColor.value.lerp(target.color, k);
    petalAmount = lerp(petalAmount, target.petals * visible, k);
    if (petalAmount < 0.002 && uniforms.uDensity.value < 0.002) return;

    const travel = dt * (0.5 + warp * 26);
    uniforms.uTime.value += dt;
    uniforms.uTravel.value += travel;
    uniforms.uWarp.value = warp;

    for (const p of state) {
      p.y -= p.fall * dt;
      p.x += Math.sin(uniforms.uTime.value * 0.8 + p.sway) * dt * 0.5;
      p.z += travel * 0.9;
      p.rx += p.vx * dt; p.ry += p.vy * dt; p.rz += p.vz * dt;
      if (p.z > 5 || p.y < -SPREAD_Y - 2) spawn(p, p.z > 5);
      const want = p.rank < petalAmount ? p.size : 0;
      p.s = lerp(p.s, want, k * 1.5);
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      dummy.scale.setScalar(p.s * (1 + warp * 0.4));
      dummy.updateMatrix();
      petals.setMatrixAt(p.i, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;

    camera.position.x = lerp(camera.position.x, pointer.x * 0.8, 0.04);
    camera.position.y = lerp(camera.position.y, -pointer.y * 0.5, 0.04);
    camera.lookAt(0, 0, -10);
    renderer.clearDepth();
    renderer.render(scene, camera);
  };

  return {
    render,
    setPreset,
    setWarp: (v) => { warp = v; },
    /** 0..1 master visibility (fade the layer out over text-heavy sections). */
    setVisible: (v) => { visible = v; },
  };
}
