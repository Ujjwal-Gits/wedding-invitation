// Ghar world: a small lamplit Newar house built in Three.js. Built surfaces
// (brick, lime plaster with a red-clay dado, carved posts, wooden joists) are lit
// by real point lamps in a custom shader; real photographs are placed as depth-
// displaced "vistas" seen through doorways and windows. A film pass adds bloom
// with warm halation, an ink-blue/amber grade, vignette, grain, fades and flashes.
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, Color, DataTexture, DoubleSide, Float32BufferAttribute,
  Group, HalfFloatType, LatheGeometry, LinearFilter, LinearSRGBColorSpace, Mesh, OrthographicCamera, PerspectiveCamera,
  PlaneGeometry, Points, RepeatWrapping, Scene, ShaderMaterial, Sprite, SpriteMaterial, SRGBColorSpace, TextureLoader,
  Vector2, Vector3, Vector4, WebGLRenderTarget, WebGLRenderer, LinearMipmapLinearFilter,
} from 'three';

const MAXL = 8;
const loader = new TextureLoader();
const DEG = Math.PI / 180;

/* ───────────────────────── shaders ───────────────────────── */
const NOISE = /* glsl */ `
  float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * n3(p); p *= 2.07; a *= 0.5; } return v; }`;

const archVert = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec2 vUv;
  void main(){
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const archFrag = /* glsl */ `
  #define MAXL ${MAXL}
  uniform vec3 uLampPos[MAXL];
  uniform vec3 uLampCol[MAXL];
  uniform vec3 uAmbient; uniform vec3 uFogColor; uniform float uFogDensity; uniform vec3 uCamPos;
  uniform sampler2D uMap; uniform vec2 uScale; uniform vec4 uUvRect; uniform vec3 uColor; uniform vec3 uEmissive;
  uniform float uSpec; uniform float uOpacity;
  varying vec3 vW; varying vec3 vN; varying vec2 vUv;
  ${NOISE}
  void main(){
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 alb;
    #if defined(K_MAP)
      alb = texture2D(uMap, uUvRect.xy + vUv * uUvRect.zw).rgb * uColor;
    #elif defined(K_BOX)
      vec3 an = abs(n);
      vec2 uv = an.x > an.y && an.x > an.z ? vW.zy : (an.y > an.z ? vW.xz : vW.xy);
      alb = texture2D(uMap, uv * uScale).rgb * uColor;
      alb *= 0.82 + 0.36 * fbm(vW * 0.9);
    #elif defined(K_PLASTER)
      float m = fbm(vW * vec3(2.2, 2.6, 2.2));
      float fine = n3(vW * 38.0);
      vec3 lime = vec3(0.075, 0.105, 0.20);   // indigo lime-wash above a red-clay dado
      vec3 clay = vec3(0.20, 0.055, 0.03);
      float edge = 0.92 + 0.025 * (fbm(vW * 6.0) - 0.5);
      float dado = 1.0 - smoothstep(edge - 0.008, edge + 0.008, vW.y);
      alb = mix(lime, clay, dado) * (0.80 + 0.32 * m) * (0.94 + 0.08 * fine) * uColor;
    #elif defined(K_WOOD)
      float g = fbm(vW * vec3(uScale.x, uScale.y, uScale.x));
      alb = uColor * (0.62 + 0.62 * g);
    #else
      alb = uColor;
    #endif
    vec3 col = alb * uAmbient * (0.65 + 0.35 * max(n.y, 0.0));
    vec3 V = normalize(uCamPos - vW);
    for (int i = 0; i < MAXL; i++) {
      vec3 L = uLampPos[i] - vW;
      float d2 = dot(L, L);
      vec3 l = L * inversesqrt(d2);
      float ndl = max(dot(n, l) * 0.8 + 0.2, 0.0);
      float att = 1.0 / (1.0 + d2 * 2.2);
      col += alb * uLampCol[i] * ndl * att;
      if (uSpec > 0.0) {
        float s = pow(max(dot(n, normalize(l + V)), 0.0), 40.0);
        col += uLampCol[i] * s * att * uSpec;
      }
    }
    col += uEmissive;
    float fog = 1.0 - exp(-length(vW - uCamPos) * uFogDensity);
    gl_FragColor = vec4(mix(col, uFogColor, fog), uOpacity);
  }`;

const photoVert = /* glsl */ `
  uniform sampler2D uDepth; uniform float uScale; uniform vec2 uStep;
  varying vec2 vUv; varying vec3 vW; varying float vD; varying float vTear;
  void main(){
    vUv = uv;
    vec3 p = position;
    vD = texture2D(uDepth, uv).r;
    // Depth cliffs (a roof edge against the sky) stretch triangles into torn sheets: find them.
    float t = 0.0;
    for (int k = 1; k <= 2; k++) {
      vec2 o = uStep * float(k);
      t = max(t, abs(texture2D(uDepth, uv + vec2(o.x, 0.0)).r - texture2D(uDepth, uv - vec2(o.x, 0.0)).r) / float(k));
      t = max(t, abs(texture2D(uDepth, uv + vec2(0.0, o.y)).r - texture2D(uDepth, uv - vec2(0.0, o.y)).r) / float(k));
    }
    vTear = uScale > 0.0 ? smoothstep(0.035, 0.14, t) : 0.0;
    p.z += vD * uScale;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const photoFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uNight; uniform float uExposure; uniform float uSat; uniform float uOpacity; uniform float uAspect;
  uniform vec4 uFeather; uniform vec4 uPools[3]; uniform vec4 uCut; uniform float uCutOn; uniform vec3 uTint;
  uniform vec3 uFogColor; uniform float uFogDensity; uniform vec3 uCamPos;
  varying vec2 vUv; varying vec3 vW; varying float vD; varying float vTear;
  void main(){
    if (uCutOn > 0.5 && vUv.x > uCut.x && vUv.x < uCut.z && vUv.y > uCut.y && vUv.y < uCut.w) discard;
    vec3 c = texture2D(uMap, vUv).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    // Day for night: underexposed, desaturated, cool; lamplight pools reveal warm colour.
    vec3 night = mix(vec3(pow(l, 1.25)), c, 0.22) * vec3(0.22, 0.30, 0.50) * 0.30;
    night *= mix(1.0, 0.32, 1.0 - smoothstep(0.03, 0.14, vD));   // the far sky sinks into night
    vec3 col = mix(c, night, uNight) * uExposure;
    float pool = 0.0;
    for (int i = 0; i < 3; i++) {
      vec2 d = (vUv - uPools[i].xy) * vec2(uAspect, 1.0);
      pool += uPools[i].w * exp(-dot(d, d) / max(1e-4, uPools[i].z * uPools[i].z));
    }
    col += c * vec3(1.0, 0.66, 0.36) * pool * uNight * uExposure * 0.8;
    col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, uSat) * uTint;
    vec4 f = max(uFeather, vec4(1e-4));
    float e = smoothstep(0.0, f.x, vUv.x) * smoothstep(0.0, f.y, 1.0 - vUv.x) * smoothstep(0.0, f.z, vUv.y) * smoothstep(0.0, f.w, 1.0 - vUv.y);
    float fog = 1.0 - exp(-length(vW - uCamPos) * uFogDensity);
    // torn (stretched) triangles fade into the night instead of smearing
    float keep = 1.0 - vTear;
    gl_FragColor = vec4(mix(col, uFogColor, fog) * keep, e * uOpacity * keep);
  }`;

const dustVert = /* glsl */ `
  #define MAXL ${MAXL}
  uniform vec3 uCam; uniform float uTime; uniform float uPR; uniform vec3 uLampPos[MAXL]; uniform vec3 uLampCol[MAXL];
  attribute vec3 aSeed; varying float vA;
  void main(){
    vec3 box = vec3(7.0, 3.2, 7.0);
    vec3 p = position + vec3(sin(uTime * 0.11 + aSeed.x * 6.3) * 0.25, uTime * 0.025 * (0.3 + aSeed.y), cos(uTime * 0.09 + aSeed.z * 6.3) * 0.25);
    p = mod(p - uCam + box * 0.5, box) - box * 0.5 + uCam;
    p.y = mod(p.y, box.y);
    float lit = 0.0;
    for (int i = 0; i < 3; i++) { vec3 d = p - uLampPos[i]; lit += dot(uLampCol[i], vec3(0.33)) / (1.0 + dot(d, d) * 5.0); }
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vA = min(lit, 1.2) * (0.35 + 0.65 * aSeed.z);
    gl_PointSize = (1.2 + aSeed.x * 2.2) * uPR * (2.2 / max(0.4, -mv.z));
  }`;
const dustFrag = /* glsl */ `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.78, 0.5) * vA * smoothstep(0.5, 0.0, d), 1.0); }`;

const quadVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const brightFrag = /* glsl */ `
  uniform sampler2D tSrc; uniform float uThr; varying vec2 vUv;
  void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uThr, uThr + 0.8, l), 1.0); }`;
const blurFrag = /* glsl */ `
  uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tSrc, vUv).rgb * 0.2270;
    c += (texture2D(tSrc, vUv + uDir * 1.385).rgb + texture2D(tSrc, vUv - uDir * 1.385).rgb) * 0.3162;
    c += (texture2D(tSrc, vUv + uDir * 3.231).rgb + texture2D(tSrc, vUv - uDir * 3.231).rgb) * 0.0703;
    gl_FragColor = vec4(c, 1.0);
  }`;
const compFrag = /* glsl */ `
  uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uBloom; uniform float uExposure;
  uniform float uTime; uniform float uGrain; uniform float uVignette; uniform float uFade; uniform float uFlash; uniform float uAspect;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
  void main(){
    vec3 c = texture2D(tScene, vUv).rgb;
    vec3 b = texture2D(tBloom, vUv).rgb;
    c += b * vec3(1.0, 0.62, 0.38) * uBloom;            // warm halation
    c = c * uExposure + vec3(1.0, 0.82, 0.6) * uFlash * 2.5;
    c = aces(c);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c += vec3(-0.010, 0.002, 0.020) * (1.0 - smoothstep(0.0, 0.35, l));   // ink-blue shadows
    c = mix(c, c * vec3(1.04, 0.98, 0.9), smoothstep(0.4, 1.0, l));       // amber highlights
    vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
    c *= 1.0 - uVignette * smoothstep(0.25, 1.15, length(q) / max(1.0, uAspect * 0.62));
    c += (hash(vUv * 1013.0 + fract(uTime * 7.13)) - 0.5) * uGrain * (0.45 + 0.55 * smoothstep(0.02, 0.35, l));
    c *= 1.0 - uFade;
    gl_FragColor = vec4(max(c, 0.0), 1.0);
    #include <colorspace_fragment>
  }`;

/* ───────────────────────── helpers ───────────────────────── */
function flatDepth() {
  const t = new DataTexture(new Uint8Array([60, 60, 60, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
}

function glowTexture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (kind === 'flame') {
    g.translate(64, 64);
    g.scale(0.5, 1);
    const r = g.createRadialGradient(0, 18, 0, 0, 10, 60);
    r.addColorStop(0, 'rgba(255,255,240,1)');
    r.addColorStop(0.25, 'rgba(255,220,150,0.9)');
    r.addColorStop(0.6, 'rgba(255,140,40,0.35)');
    r.addColorStop(1, 'rgba(255,90,10,0)');
    g.fillStyle = r;
    g.fillRect(-128, -64, 256, 128);
  } else {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.18, 'rgba(255,255,255,0.45)');
    r.addColorStop(0.5, 'rgba(255,255,255,0.10)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export const lookYaw = (from, to) => Math.atan2(-(to[0] - from[0]), -(to[2] - from[2])) / DEG;
export const lookPitch = (from, to) => Math.atan2(to[1] - from[1], Math.hypot(to[0] - from[0], to[2] - from[2])) / DEG;

/* ───────────────────────── World ───────────────────────── */
export class World {
  constructor(canvas, { mobile = false, pixelRatio } = {}) {
    this.mobile = mobile;
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(pixelRatio ?? Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.6));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(new Color(0x020306));
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(40, 1, 0.03, 140);
    this.camera.rotation.order = 'YXZ';
    this.sets = new Map();
    this.lamps = [];
    this.photoMats = [];
    this.anims = [];
    this.textures = new Map();
    this.time = 0;

    this.U = {
      uLampPos: { value: Array.from({ length: MAXL }, () => new Vector3(0, -100, 0)) },
      uLampCol: { value: Array.from({ length: MAXL }, () => new Vector3()) },
      uAmbient: { value: new Color(0.03, 0.034, 0.048) },
      uFogColor: { value: new Color(0.002, 0.003, 0.007) },
      uFogDensity: { value: 0.035 },
      uCamPos: { value: new Vector3() },
    };
    this.glow = glowTexture('glow');
    this.flameTex = glowTexture('flame');

    // Post
    const hf = { type: HalfFloatType, depthBuffer: true };
    this.rtScene = new WebGLRenderTarget(2, 2, hf);
    this.rtA = new WebGLRenderTarget(2, 2, { type: HalfFloatType, depthBuffer: false });
    this.rtB = new WebGLRenderTarget(2, 2, { type: HalfFloatType, depthBuffer: false });
    this.quad = new Mesh(new PlaneGeometry(2, 2));
    this.quadScene = new Scene();
    this.quadScene.add(this.quad);
    this.quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.mBright = new ShaderMaterial({ uniforms: { tSrc: { value: null }, uThr: { value: 0.85 } }, vertexShader: quadVert, fragmentShader: brightFrag, depthTest: false, depthWrite: false });
    this.mBlur = new ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new Vector2() } }, vertexShader: quadVert, fragmentShader: blurFrag, depthTest: false, depthWrite: false });
    this.mComp = new ShaderMaterial({
      uniforms: {
        tScene: { value: this.rtScene.texture }, tBloom: { value: this.rtA.texture }, uBloom: { value: 0.9 }, uExposure: { value: 1.25 },
        uTime: { value: 0 }, uGrain: { value: mobile ? 0.03 : 0.034 }, uVignette: { value: 0.55 }, uFade: { value: 0 }, uFlash: { value: 0 }, uAspect: { value: 1 },
      },
      vertexShader: quadVert, fragmentShader: compFrag, depthTest: false, depthWrite: false,
    });

    this.fx = { fade: 0, flash: 0 };
    this.cam = { p: new Vector3(0, 1.6, 8), yaw: 0, pitch: 0, roll: 0, fov: 40 };

    // Dust in lamplight
    const N = mobile ? 260 : 520;
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos.set([Math.random() * 7, Math.random() * 3.2, Math.random() * 7], i * 3);
      seed.set([Math.random(), Math.random(), Math.random()], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new Float32BufferAttribute(seed, 3));
    this.dust = new Points(g, new ShaderMaterial({
      uniforms: { uCam: { value: new Vector3() }, uTime: { value: 0 }, uPR: { value: this.renderer.getPixelRatio() }, uLampPos: this.U.uLampPos, uLampCol: this.U.uLampCol },
      vertexShader: dustVert, fragmentShader: dustFrag, transparent: true, depthWrite: false, blending: AdditiveBlending,
    }));
    this.dust.frustumCulled = false;
    this.dust.renderOrder = 5;
    this.scene.add(this.dust);

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.active = true;
    this.clock = performance.now();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (this.active && !document.hidden) this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }

  /* ── assets ── */
  tex(url, { repeat = false, srgb = true } = {}) {
    if (!url) return Promise.resolve(null);
    if (!this.textures.has(url)) {
      this.textures.set(url, loader.loadAsync(url).then((t) => {
        t.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace;
        t.minFilter = LinearFilter;
        t.generateMipmaps = false;
        if (repeat) { t.wrapS = t.wrapT = RepeatWrapping; t.generateMipmaps = true; t.minFilter = LinearMipmapLinearFilter; }
        t.anisotropy = 4;
        return t;
      }));
    }
    return this.textures.get(url);
  }

  set(id) {
    if (!this.sets.has(id)) {
      const g = new Group();
      g.name = id;
      this.scene.add(g);
      this.sets.set(id, g);
    }
    return this.sets.get(id);
  }

  showSets(ids) {
    for (const [id, g] of this.sets) g.visible = ids.includes(id);
    this.visibleSets = ids;
  }

  /* ── materials ── */
  arch(kind, { map = null, scale = [1, 1], uvRect = [0, 0, 1, 1], color = [1, 1, 1], emissive = [0, 0, 0], spec = 0, side = 0 } = {}) {
    const defines = { [`K_${kind.toUpperCase()}`]: 1 };
    return new ShaderMaterial({
      defines,
      uniforms: {
        ...this.U,
        uMap: { value: map }, uScale: { value: new Vector2(...scale) }, uUvRect: { value: uvRect }, uColor: { value: new Color(...color) },
        uEmissive: { value: new Color(...emissive) }, uSpec: { value: spec }, uOpacity: { value: 1 },
      },
      vertexShader: archVert, fragmentShader: archFrag, side,
    });
  }

  /** A box between two corners [x0,y0,z0]–[x1,y1,z1]. */
  box(setId, a, b, mat) {
    const w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]), d = Math.abs(b[2] - a[2]);
    const m = new Mesh(new BoxGeometry(w, h, d), mat);
    m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    this.set(setId).add(m);
    return m;
  }

  /**
   * A wall slab along x (axis 'x', at depth z0..z1) or along z (axis 'z', at x0..x1),
   * with rectangular openings [{ s0, s1, y0, y1 }] measured along the axis.
   */
  wall(setId, { axis = 'x', from, to, at, thick = 0.3, y0 = 0, y1 = 3, openings = [] }, mat) {
    const cuts = [...openings].sort((p, q) => p.s0 - q.s0);
    const seg = (s0, s1, ya, yb) => {
      if (s1 - s0 < 1e-3 || yb - ya < 1e-3) return;
      if (axis === 'x') this.box(setId, [s0, ya, at], [s1, yb, at - thick], mat);
      else this.box(setId, [at, ya, s0], [at + thick, yb, s1], mat);
    };
    let s = from;
    for (const o of cuts) {
      seg(s, o.s0, y0, y1);
      seg(o.s0, o.s1, y0, o.y0);
      seg(o.s0, o.s1, o.y1, y1);
      s = o.s1;
    }
    seg(s, to, y0, y1);
  }

  /* ── photographs ── */
  /**
   * A photograph standing in the world. `at` is the centre, `h` its height, `yaw` its facing.
   * night: day-for-night amount; pools: [[u, v, radius, strength]]; cut: [u0, v0, u1, v1] (v from bottom).
   */
  async photo(setId, { src, depth, h, at, yaw = 0, scale = 0.16, night = 0, exposure = 1, sat = 1, tint = [1, 1, 1], pools = [], feather = [0.06, 0.06, 0.06, 0.06], cut = null, seg }) {
    const [map, dtex] = await Promise.all([this.tex(src), depth ? this.tex(depth, { srgb: false }).catch(() => null) : null]);
    const ar = map.image.width / map.image.height;
    const n = seg ?? (this.mobile ? 150 : 230);
    const geo = new PlaneGeometry(h * ar, h, depth ? n : 1, depth ? Math.max(1, Math.round(n / ar)) : 1);
    const P = [0, 1, 2].map((i) => {
      const p = pools[i] || [0, 0, 0.1, 0];
      return new Vector4(p[0], 1 - p[1], p[2], p[3]);
    });
    const mat = new ShaderMaterial({
      uniforms: {
        uMap: { value: map }, uDepth: { value: dtex || flatDepth() }, uScale: { value: depth ? scale * h : 0 },
        uStep: { value: new Vector2(1 / n, ar / n) },
        uNight: { value: night }, uExposure: { value: exposure }, uSat: { value: sat }, uOpacity: { value: 1 }, uAspect: { value: ar },
        uFeather: { value: feather }, uPools: { value: P }, uTint: { value: new Color(...tint) },
        uCut: { value: cut ? [cut[0], 1 - cut[3], cut[2], 1 - cut[1]] : [0, 0, 0, 0] }, uCutOn: { value: cut ? 1 : 0 },
        uFogColor: this.U.uFogColor, uFogDensity: this.U.uFogDensity, uCamPos: this.U.uCamPos,
      },
      vertexShader: photoVert, fragmentShader: photoFrag, transparent: true, depthWrite: true,
    });
    const m = new Mesh(geo, mat);
    m.position.set(...at);
    m.rotation.y = yaw * DEG;
    m.renderOrder = 1;
    this.set(setId).add(m);
    this.photoMats.push(mat);
    return { mesh: m, mat, ar, w: h * ar, h };
  }

  /**
   * A framed picture hung on a wall. `at` = centre of the picture on the wall surface,
   * `yaw` = direction the picture faces. The frame follows the photo's own aspect (never crops).
   */
  async frame(setId, { src, at, yaw = 0, h = 1.2, maxW = 1.6, depth = 0.05 }) {
    const map = await this.tex(src);
    const ar = map.image.width / map.image.height;
    let ph = h;
    let pw = h * ar;
    if (pw > maxW) { pw = maxW; ph = maxW / ar; }
    const g = new Group();
    g.position.set(...at);
    g.rotation.y = yaw * DEG;
    const wood = this.arch('wood', { color: [0.16, 0.075, 0.035], scale: [3, 3] });
    const gilt = this.arch('flat', { color: [0.55, 0.36, 0.14], spec: 0.6 });
    const pic = new Mesh(new PlaneGeometry(pw, ph), this.arch('map', { map, color: [1.05, 1.0, 0.95] }));
    pic.position.z = 0.03;
    g.add(pic);
    const fw = Math.max(0.06, Math.min(pw, ph) * 0.06);
    const L = 0.012;
    const bar = (w, hh, x, y, mat, dz = depth, z = depth / 2) => {
      const b = new Mesh(new BoxGeometry(w, hh, dz), mat);
      b.position.set(x, y, z);
      g.add(b);
    };
    // moulding
    bar(pw + 2 * fw + 2 * L, fw, 0, ph / 2 + L + fw / 2, wood);
    bar(pw + 2 * fw + 2 * L, fw, 0, -ph / 2 - L - fw / 2, wood);
    bar(fw, ph + 2 * L, -pw / 2 - L - fw / 2, 0, wood);
    bar(fw, ph + 2 * L, pw / 2 + L + fw / 2, 0, wood);
    // gilt liner
    bar(pw + 2 * L, L, 0, ph / 2 + L / 2, gilt, 0.04, 0.03);
    bar(pw + 2 * L, L, 0, -ph / 2 - L / 2, gilt, 0.04, 0.03);
    bar(L, ph, -pw / 2 - L / 2, 0, gilt, 0.04, 0.03);
    bar(L, ph, pw / 2 + L / 2, 0, gilt, 0.04, 0.03);
    this.set(setId).add(g);
    return { group: g, w: pw + 2 * fw, h: ph + 2 * fw };
  }

  /* ── lamps ── */
  /** kind: 'diyo' (clay lamp with a flame), 'hang' (a glowing hanging lamp), 'sconce'. */
  lamp(setId, { at, kind = 'diyo', power = 1, color = [1.0, 0.56, 0.22], lit = 1 }) {
    const set = this.set(setId);
    const L = { pos: new Vector3(...at), color: new Color(...color), power, lit, setId, flick: Math.random() * 100, sprites: [] };
    const lightPos = L.pos.clone();
    if (kind === 'diyo') {
      if (!this._diyoGeo) {
        const pts = [[0, 0], [0.045, 0.004], [0.062, 0.022], [0.066, 0.034], [0.056, 0.036], [0.05, 0.026], [0.0, 0.02]].map(([x, y]) => new Vector2(x, y));
        this._diyoGeo = new LatheGeometry(pts, 20);
        this._clay = this.arch('flat', { color: [0.42, 0.16, 0.08] });
      }
      const dish = new Mesh(this._diyoGeo, this._clay);
      dish.position.copy(L.pos);
      set.add(dish);
      lightPos.y += 0.09;
      const flame = new Sprite(new SpriteMaterial({ map: this.flameTex, color: new Color(3.2, 2.4, 1.4), blending: AdditiveBlending, depthWrite: false, transparent: true }));
      flame.position.copy(L.pos).add(new Vector3(0, 0.062, 0));
      flame.scale.set(0.034, 0.07, 1);
      flame.renderOrder = 4;
      set.add(flame);
      L.sprites.push({ s: flame, base: [0.034, 0.07], kind: 'flame', y: flame.position.y });
      const halo = new Sprite(new SpriteMaterial({ map: this.glow, color: new Color(0.9, 0.45, 0.16).multiplyScalar(0.55), blending: AdditiveBlending, depthWrite: false, transparent: true }));
      halo.position.copy(flame.position);
      halo.scale.set(0.5, 0.5, 1);
      halo.renderOrder = 4;
      set.add(halo);
      L.sprites.push({ s: halo, base: [0.5, 0.5], kind: 'halo' });
    } else if (kind === 'fill') {
      // an unseen picture light: lights the frame, draws nothing
    } else {
      const core = new Sprite(new SpriteMaterial({ map: this.glow, color: new Color(...color).multiplyScalar(kind === 'hang' ? 2.2 : 2.6), blending: AdditiveBlending, depthWrite: false, transparent: true }));
      core.position.copy(L.pos);
      const s = kind === 'hang' ? 0.2 : 0.24;
      core.scale.set(s, s, 1);
      core.renderOrder = 4;
      set.add(core);
      L.sprites.push({ s: core, base: [s, s], kind: 'halo' });
      const halo = new Sprite(new SpriteMaterial({ map: this.glow, color: new Color(...color).multiplyScalar(0.5), blending: AdditiveBlending, depthWrite: false, transparent: true }));
      halo.position.copy(L.pos);
      halo.scale.set(1.6, 1.6, 1);
      halo.renderOrder = 4;
      set.add(halo);
      L.sprites.push({ s: halo, base: [1.6, 1.6], kind: 'halo' });
    }
    L.lightPos = lightPos;
    this.lamps.push(L);
    return L;
  }

  /** A carved wooden post (photo texture) with a simple capital. */
  async post(setId, { at, h = 2.5, w = 0.2, src }) {
    const map = await this.tex(src);
    const mat = this.arch('map', { map, color: [0.75, 0.62, 0.52] });
    const wood = this.arch('wood', { color: [0.13, 0.06, 0.03], scale: [2, 14] });
    const m = new Mesh(new BoxGeometry(w, h, w), mat);
    m.position.set(at[0], at[1] + h / 2, at[2]);
    this.set(setId).add(m);
    const cap = new Mesh(new BoxGeometry(w * 2.6, 0.12, w * 1.4), wood);
    cap.position.set(at[0], at[1] + h - 0.06, at[2]);
    this.set(setId).add(cap);
    return m;
  }

  /** A door leaf hinged at `hingeX`; `side` -1 = left leaf, 1 = right leaf. Swings inward (-z). */
  leaf(setId, { face, edge, w, h, hingeX, side, y0 = 0, thick = 0.05 }) {
    const pivot = new Group();
    pivot.position.set(hingeX, y0, 0);
    const m = new Mesh(new BoxGeometry(w, h, thick), [edge, edge, edge, edge, face, edge]);
    m.position.set(-side * w / 2, h / 2, -thick / 2 - 0.002);
    pivot.add(m);
    this.set(setId).add(pivot);
    return {
      pivot,
      /** f 0..1: a small crack first, then the full swing; the right leaf trails a touch. */
      open(f) {
        const k = f < 0.15 ? 0 : (f - 0.15) / 0.85;
        const deg = f < 0.15 ? (f / 0.15) * 5 : 5 + (1 - Math.pow(1 - k, 3)) * 82;
        pivot.rotation.y = -side * deg * (side > 0 ? 0.985 : 1) * DEG;
      },
    };
  }

  /* ── frame loop ── */
  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    const pr = this.renderer.getPixelRatio();
    this.rtScene.setSize(Math.round(w * pr), Math.round(h * pr));
    const qw = Math.max(2, Math.round((w * pr) / 4));
    const qh = Math.max(2, Math.round((h * pr) / 4));
    this.rtA.setSize(qw, qh);
    this.rtB.setSize(qw, qh);
    this.aspect = w / h;
    this.mComp.uniforms.uAspect.value = this.aspect;
    this.onResize?.(this.aspect);
  }

  pickLamps() {
    const cp = this.cam.p;
    const vis = this.visibleSets;
    const list = this.lamps.filter((l) => (!vis || vis.includes(l.setId)) && l.lit > 0.001);
    list.sort((a, b) => a.lightPos.distanceToSquared(cp) - b.lightPos.distanceToSquared(cp));
    const P = this.U.uLampPos.value;
    const C = this.U.uLampCol.value;
    for (let i = 0; i < MAXL; i++) {
      const l = list[i];
      if (!l) { P[i].set(0, -999, 0); C[i].set(0, 0, 0); continue; }
      P[i].copy(l.lightPos);
      const f = l.flickNow ?? 1;
      C[i].set(l.color.r, l.color.g, l.color.b).multiplyScalar(l.power * l.lit * f);
    }
  }

  render() {
    const t = (performance.now() - this.clock) / 1000;
    this.time = t;
    const r = this.renderer;
    // camera
    const c = this.cam;
    const cam = this.camera;
    cam.position.copy(c.p);
    cam.rotation.set(c.pitch * DEG, c.yaw * DEG, c.roll * DEG);
    cam.fov = c.fov;
    cam.aspect = this.aspect;
    cam.updateProjectionMatrix();
    this.U.uCamPos.value.copy(c.p);
    // lamps flicker
    for (const l of this.lamps) {
      const k = t * 7.0 + l.flick;
      l.flickNow = 0.88 + 0.07 * Math.sin(k) + 0.05 * Math.sin(k * 2.7 + 1.3);
      for (const sp of l.sprites) {
        const s = l.lit * (sp.kind === 'flame' ? (0.92 + 0.1 * Math.sin(k * 1.9)) : l.flickNow);
        sp.s.scale.set(sp.base[0] * s, sp.base[1] * s, 1);
        sp.s.visible = l.lit > 0.01;
      }
    }
    this.pickLamps();
    this.dust.material.uniforms.uCam.value.copy(c.p);
    this.dust.material.uniforms.uTime.value = t;
    for (const fn of this.anims) fn(t);

    r.setRenderTarget(this.rtScene);
    r.clear();
    r.render(this.scene, cam);
    // bloom
    this.quad.material = this.mBright;
    this.mBright.uniforms.tSrc.value = this.rtScene.texture;
    r.setRenderTarget(this.rtA);
    r.render(this.quadScene, this.quadCam);
    const iters = this.mobile ? 1 : 2;
    for (let i = 0; i < iters; i++) {
      this.quad.material = this.mBlur;
      this.mBlur.uniforms.tSrc.value = this.rtA.texture;
      this.mBlur.uniforms.uDir.value.set((1 + i) / this.rtA.width, 0);
      r.setRenderTarget(this.rtB);
      r.render(this.quadScene, this.quadCam);
      this.mBlur.uniforms.tSrc.value = this.rtB.texture;
      this.mBlur.uniforms.uDir.value.set(0, (1 + i) / this.rtA.height);
      r.setRenderTarget(this.rtA);
      r.render(this.quadScene, this.quadCam);
    }
    const u = this.mComp.uniforms;
    u.uTime.value = t;
    u.uFade.value = this.fx.fade;
    u.uFlash.value = this.fx.flash;
    this.quad.material = this.mComp;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }

  setActive(on) { this.active = on; }
}
