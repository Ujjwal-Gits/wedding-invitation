// PhotoStage: real photographs rendered as depth-displaced meshes, so a camera
// can dolly *into* them with true parallax. Two views can be composited with a
// portal / bloom transition, finished with a filmic grade (warmth, vignette, grain).
import {
  Color, DataTexture, DoubleSide, LinearFilter, LinearSRGBColorSpace, Mesh, OrthographicCamera, PerspectiveCamera,
  PlaneGeometry, Scene, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2, WebGLRenderTarget, WebGLRenderer,
} from 'three';

const FOV = 42;
const TAN = Math.tan((FOV * Math.PI) / 360);
const loader = new TextureLoader();

const photoVert = /* glsl */ `
  uniform sampler2D uDepth;
  uniform float uScale;
  varying vec2 vUv;
  varying float vD;
  void main() {
    vUv = uv;
    float d = texture2D(uDepth, uv).r;
    vD = d;
    vec3 p = position;
    p.z += d * uScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;

const photoFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uNearFade;
  varying vec2 vUv;
  varying float vD;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    gl_FragColor = c;
    #include <colorspace_fragment>
  }`;

const quadVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const compositeFrag = /* glsl */ `
  uniform sampler2D tA;
  uniform sampler2D tB;
  uniform float uMix;
  uniform int uMode;          // 0 portal, 1 bloom-fade
  uniform vec2 uCenter;       // transition centre in 0..1 screen space
  uniform float uAspect;
  uniform float uTime;
  uniform float uGrain;
  uniform float uVignette;
  uniform float uFlash;
  uniform float uLift;
  uniform vec3 uTint;
  uniform float uTmA;
  uniform float uTmB;
  varying vec2 vUv;
  vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1, 0)), c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

  void main() {
    vec2 uv = vUv;
    vec3 col = texture2D(tA, uv).rgb;
    if (uTmA > 0.5) col = aces(col * 1.15);

    if (uMix > 0.0) {
      vec3 b = texture2D(tB, uv).rgb;
      if (uTmB > 0.5) b = aces(b * 1.15);
      if (uMode == 0) {
        // Portal: B opens from the centre with an organic, gilded edge.
        vec2 p = (uv - uCenter) * vec2(uAspect, 1.0);
        float r = length(p);
        float n = (fbm(uv * 5.0 + uTime * 0.15) - 0.5) * 0.22;
        float radius = uMix * (1.25 + 0.6 * max(uAspect, 1.0 / uAspect));
        float inside = 1.0 - smoothstep(radius - 0.08, radius, r + n);
        col = mix(col, b, inside);
        float ring = exp(-pow((r + n - radius + 0.04) * 26.0, 2.0)) * (1.0 - uMix) * step(0.001, uMix);
        col += vec3(1.0, 0.78, 0.42) * ring * 1.1;
      } else {
        float m = smoothstep(0.0, 1.0, uMix);
        col = mix(col, b, m);
      }
    }

    // Light flash used at the deepest point of a dolly.
    col += vec3(1.0, 0.86, 0.62) * uFlash;

    // Grade: gentle warmth and lifted blacks, like a printed photograph.
    col = mix(col, col * uTint, 0.35);
    col = col * (1.0 - uLift) + uLift * 0.45;
    vec2 q = uv - 0.5;
    col *= 1.0 - uVignette * dot(q * vec2(uAspect * 0.8, 1.0), q * vec2(uAspect * 0.8, 1.0)) * 1.6;
    col += (hash(uv * 1000.0 + uTime) - 0.5) * uGrain;
    gl_FragColor = vec4(max(col, 0.0), 1.0);
    #include <colorspace_fragment>
  }`;

/** One photograph with its own camera. `progress` 0..1 dollies toward the focal point. */
export class PhotoView {
  constructor({ id, src, depth, focal = [0.5, 0.5], scale = 0.45, travel = 0.78, sway = 0, mobileSrc }) {
    Object.assign(this, { id, src, depth, focal, scale, travel, sway, mobileSrc });
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(FOV, 1, 0.01, 50);
    this.progress = 0;
    this.pointer = new Vector2();
    this.ready = false;
    this.aspectImg = 16 / 9;
  }

  async load(mobile) {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const [map, depth] = await Promise.all([
        loader.loadAsync(mobile && this.mobileSrc ? this.mobileSrc : this.src),
        this.depth ? loader.loadAsync(this.depth).catch(() => flatDepth()) : flatDepth(),
      ]);
      map.colorSpace = SRGBColorSpace;
      map.minFilter = LinearFilter;
      map.generateMipmaps = false;
      depth.colorSpace = LinearSRGBColorSpace;
      this.aspectImg = map.image.width / map.image.height;
      this.depthAt = sampler(depth.image);
      const segX = mobile ? 160 : 260;
      const geo = new PlaneGeometry(2 * this.aspectImg, 2, segX, Math.round(segX / this.aspectImg));
      this.material = new ShaderMaterial({
        uniforms: { uMap: { value: map }, uDepth: { value: depth }, uScale: { value: this.scale }, uNearFade: { value: 0 } },
        vertexShader: photoVert,
        fragmentShader: photoFrag,
        side: DoubleSide,
      });
      this.mesh = new Mesh(geo, this.material);
      this.scene.add(this.mesh);
      this.ready = true;
    })();
    return this.loading;
  }

  /** Plane-space position of the focal point and the depth there. */
  focalPoint() {
    const [fx, fy] = this.focal;
    const x = (fx - 0.5) * 2 * this.aspectImg;
    const y = (0.5 - fy) * 2;
    const d = this.depthAt ? this.depthAt(fx, fy) : 0.2;
    return { x, y, z: d * this.scale };
  }

  /** Position the camera for the current viewport aspect and progress. */
  update(aspect, time) {
    const cam = this.camera;
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
    const planeW = 2 * this.aspectImg;
    const visH = Math.min(2, planeW / aspect) * 0.985;
    const d0 = visH / (2 * TAN);
    const f = this.focalPoint();
    const endZ = f.z + Math.max(0.09, d0 * (1 - this.travel) * 0.5);
    const e = easeInOut(this.progress);
    const z = d0 + (endZ - d0) * e;

    // Keep the focal subject on screen from the start, within the photo's edges.
    const visHz = 2 * z * TAN;
    const visWz = visHz * aspect;
    const maxX = Math.max(0, (planeW - visWz) / 2);
    const maxY = Math.max(0, (2 - visHz) / 2);
    const startX = clamp(f.x, -Math.max(0, (planeW - visH * aspect) / 2), Math.max(0, (planeW - visH * aspect) / 2));
    let x = startX + (f.x - startX) * e;
    let y = f.y * e * 0.9;
    // Living photo: pointer parallax and a slow breath.
    x += this.pointer.x * 0.035 * (0.4 + z * 0.3) + Math.sin(time * 0.21) * 0.006;
    y += this.pointer.y * 0.022 * (0.4 + z * 0.3) + Math.sin(time * 0.17 + 1) * 0.004;
    // Walking: a gentle bob tied to distance travelled.
    if (this.sway) y += Math.sin(this.progress * Math.PI * 2 * this.sway) * 0.006 * z;
    cam.position.set(clamp(x, -maxX, maxX), clamp(y, -maxY, maxY), z);
    cam.lookAt(cam.position.x, cam.position.y, -10);
  }
}

export class PhotoStage {
  constructor(canvas, { mobile = false, grade = {} } = {}) {
    this.mobile = mobile;
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(new Color(grade.clear ?? '#14040a'));
    this.renderer.shadowMap.enabled = !mobile;
    this.views = new Map();
    this.state = { a: null, b: null, mix: 0, mode: 0, center: [0.5, 0.5], flash: 0 };
    this.overlays = []; // extra render passes drawn after the composite (particles)
    this.pointerTarget = new Vector2();
    this.pointer = new Vector2();

    const rt = () => new WebGLRenderTarget(2, 2, { colorSpace: SRGBColorSpace, depthBuffer: true });
    this.rtA = rt();
    this.rtB = rt();
    this.quadScene = new Scene();
    this.quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.composite = new ShaderMaterial({
      uniforms: {
        tA: { value: this.rtA.texture }, tB: { value: this.rtB.texture }, uMix: { value: 0 }, uMode: { value: 0 },
        uCenter: { value: new Vector2(0.5, 0.5) }, uAspect: { value: 1 }, uTime: { value: 0 },
        uGrain: { value: grade.grain ?? (mobile ? 0.03 : 0.04) }, uVignette: { value: grade.vignette ?? 0.55 }, uFlash: { value: 0 },
        uTint: { value: new Color(...(grade.tint ?? [1.06, 0.98, 0.88])) }, uLift: { value: grade.lift ?? 0.04 },
        uTmA: { value: 0 }, uTmB: { value: 0 },
      },
      vertexShader: quadVert,
      fragmentShader: compositeFrag,
      depthTest: false,
      depthWrite: false,
    });
    this.quadScene.add(new Mesh(new PlaneGeometry(2, 2), this.composite));

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    if (!mobile) {
      window.addEventListener('pointermove', (e) => {
        this.pointerTarget.set(e.clientX / window.innerWidth - 0.5, 0.5 - e.clientY / window.innerHeight);
      }, { passive: true });
    }
    this.resize();
    this.clock = performance.now();
    this.active = true;
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (this.active && !document.hidden) this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }

  add(def) {
    const v = def instanceof PhotoView ? def : new PhotoView(def);
    this.views.set(v.id, v);
    return v;
  }

  /** Load views in order; the first ones resolve first so the intro can start. */
  preload(ids) {
    return Promise.all(ids.map((id) => this.views.get(id).load(this.mobile)));
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    const pr = this.renderer.getPixelRatio();
    this.rtA.setSize(Math.round(w * pr), Math.round(h * pr));
    this.rtB.setSize(Math.round(w * pr), Math.round(h * pr));
    this.aspect = w / h;
    this.composite.uniforms.uAspect.value = this.aspect;
  }

  /** Show view `a` at progress `pa`, optionally transitioning to `b` at `pb` by `mix`. */
  set({ a, pa = 0, b = null, pb = 0, mix = 0, mode = 0, center, flash = 0 }) {
    Object.assign(this.state, { a, b, mix, mode, flash });
    if (center) this.state.center = center;
    const va = this.views.get(a);
    if (va) va.progress = pa;
    const vb = b && this.views.get(b);
    if (vb) vb.progress = pb;
  }

  /** Screen position (0..1, y up) of a view's focal point with its camera at `progress`. */
  focalScreen(id) {
    const v = this.views.get(id);
    if (!v?.ready) return [0.5, 0.5];
    v.update(this.aspect, 0);
    const f = v.focalPoint();
    const p = new Vector2();
    const vec = v.camera.position.clone();
    vec.set(f.x, f.y, f.z).project(v.camera);
    p.set(vec.x * 0.5 + 0.5, vec.y * 0.5 + 0.5);
    return [p.x, p.y];
  }

  render() {
    const t = (performance.now() - this.clock) / 1000;
    this.pointer.lerp(this.pointerTarget, 0.05);
    const { a, b, mix, mode, center, flash } = this.state;
    const r = this.renderer;
    const draw = (id, target) => {
      const v = this.views.get(id);
      if (v?.ready) {
        v.pointer.copy(this.pointer);
        v.beforeRender?.(r, this, t);
      }
      r.setRenderTarget(target);
      r.clear();
      if (v?.ready) {
        v.update(this.aspect, t);
        r.render(v.scene, v.camera);
      }
    };
    draw(a, this.rtA);
    if (b && mix > 0) draw(b, this.rtB);
    const u = this.composite.uniforms;
    u.uMix.value = b ? mix : 0;
    u.uMode.value = mode;
    u.uCenter.value.set(center[0], center[1]);
    u.uTime.value = t;
    u.uFlash.value = flash;
    u.uTmA.value = this.views.get(a)?.toneMap ? 1 : 0;
    u.uTmB.value = b && this.views.get(b)?.toneMap ? 1 : 0;
    r.setRenderTarget(null);
    r.autoClear = true;
    r.render(this.quadScene, this.quadCam);
    r.autoClear = false;
    for (const o of this.overlays) o.render(r, t);
    r.autoClear = true;
  }

  setActive(on) { this.active = on; }
}

/** A uniform mid-grey depth map: photos without depth still dolly, just flat. */
function flatDepth() {
  const t = new DataTexture(new Uint8Array([90, 90, 90, 255]), 1, 1);
  t.needsUpdate = true;
  t.image.width = 1;
  return t;
}

/** Reads a depth image on the CPU so we know how far the focal point is. */
function sampler(img) {
  if (!img || !img.getContext && !(img instanceof HTMLImageElement || img instanceof ImageBitmap)) return () => 90 / 255;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = Math.max(1, Math.round((128 * img.height) / img.width));
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  return (fx, fy) => {
    // Use the farthest value in a small window: we aim *through* openings.
    let min = 1;
    const cx = Math.round(fx * (c.width - 1));
    const cy = Math.round(fy * (c.height - 1));
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
      const px = clamp(cx + x, 0, c.width - 1);
      const py = clamp(cy + y, 0, c.height - 1);
      min = Math.min(min, data[(py * c.width + px) * 4] / 255);
    }
    return min;
  };
}

export const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
