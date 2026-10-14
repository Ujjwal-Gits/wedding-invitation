// The theme's own renderer for MandapView: MSAA, HDR bloom for fire and lamps,
// ACES tone mapping, a night grade (vignette, grain), adaptive resolution.
import * as T from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { dprCap, createGovernor } from './perf.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: 1 }, uVignette: { value: 0.08 }, uGrain: { value: 0.035 }, uFade: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uAspect, uVignette, uGrain, uFade; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 q = (vUv - 0.5) * vec2(min(uAspect, 1.6), 1.0);
      c *= 1.0 - uVignette * dot(q, q) * 1.3;
      // Lift the deepest shadows toward night indigo; warm the highlights.
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c *= 1.0 - uFade;
      gl_FragColor = vec4(c, 1.0);
    }`,
};
/** Removes NaN/Inf and clamps rare specular spikes, so bloom cannot blow one pixel into a flare. */
const ClampShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv);
      vec3 v = c.rgb;
      if (!(v.r == v.r) || !(v.g == v.g) || !(v.b == v.b)) v = vec3(0.0);
      gl_FragColor = vec4(min(v, vec3(12.0)), 1.0); }`,
};
const GrainShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.015 } },
  vertexShader: GradeShader.vertexShader,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uGrain; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); c.rgb += (hash(vUv * 1000.0 + fract(uTime)) - 0.5) * uGrain; gl_FragColor = c; }`,
};

export class NightRenderer {
  constructor(canvas, view, { mobile = false, maxPR, tier } = {}) {
    this.view = view;
    this.mobile = mobile;
    this.low = tier?.tier === 'low';
    // pixel-ratio cap: desktop ≤ 1.5, phones ≤ 1.25, low tier 1
    this.maxPR = maxPR ?? dprCap({ tier: tier?.tier || 'mid', mobile: mobile || !!tier?.mobile });
    this.pr = this.maxPR;
    const r = (this.renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }));
    r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = !mobile;
    r.shadowMap.type = T.PCFSoftShadowMap;
    r.setPixelRatio(this.pr);
    const rt = new T.WebGLRenderTarget(2, 2, { type: T.HalfFloatType, samples: mobile ? 2 : 4 });
    this.composer = new EffectComposer(r, rt);
    this.composer.addPass(new RenderPass(view.scene, view.camera));
    this.composer.addPass(new ShaderPass(ClampShader));
    this.bloom = new UnrealBloomPass(new T.Vector2(256, 256), mobile ? 0.15 : 0.2, 0.4, 1.0);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.grain = new ShaderPass(GrainShader);
    this.composer.addPass(this.grain);
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.t0 = performance.now();
    this.active = true;
    this.frames = [];
    this.timeOverride = null;
    this.govern();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(this.pr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.pr);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w * this.pr * 0.5, h * this.pr * 0.5);
    this.aspect = w / h;
    this.grade.uniforms.uAspect.value = this.aspect;
    this.view.setPixelRatio?.(this.pr);
  }

  /**
   * Frame-time governor: steps resolution, shadow-map updates and bloom down when frames run
   * over ~20 ms for 2 s, and back up when there is headroom. Shadows are never switched off
   * (that recompiles every material); their map is redrawn less often instead.
   */
  govern() {
    const LEVELS = [
      { pr: 1, shadowEvery: 1, bloom: true }, { pr: 1, shadowEvery: 2, bloom: true },
      { pr: 1, shadowEvery: 3, bloom: false }, { pr: 0.85, shadowEvery: 4, bloom: false },
      { pr: 0.7, shadowEvery: 4, bloom: false },
    ];
    const r = this.renderer;
    this.shadowEvery = 1;
    this.governor = createGovernor({
      name: 'mandap', levels: LEVELS.length, start: this.low ? 3 : 0,
      apply: (l) => {
        const L = LEVELS[l];
        this.pr = Math.max(Math.min(1, this.maxPR), this.maxPR * L.pr); // never blurrier than the screen's own pixels
        this.shadowEvery = L.shadowEvery;
        if (r.shadowMap.enabled) r.shadowMap.autoUpdate = L.shadowEvery === 1;
        this.bloom.enabled = L.bloom;
        this.resize();
      },
    });
  }

  render() {
    const now = performance.now();
    const t = this.timeOverride ?? (now - this.t0) / 1000;
    this.last = now;
    this.frameNo = (this.frameNo || 0) + 1;
    if (this.shadowEvery > 1 && this.frameNo % this.shadowEvery === 0) this.renderer.shadowMap.needsUpdate = true;
    this.onFrame?.(t);
    this.view.update(this.aspect, t);
    this.grade.uniforms.uTime.value = t;
    this.grain.uniforms.uTime.value = t;
    this.composer.render();
  }

  start() {
    // Render on demand: once the camera has settled (no scroll, no camera travel) the ambient
    // motion is drawn at half rate (a third on low tier); any movement returns to every frame.
    let prev = 0, stillFor = 0, skip = 0, lastY = -1;
    const camPrev = new T.Vector3();
    const loop = (now) => {
      this.raf = requestAnimationFrame(loop);
      const dt = prev ? (now - prev) / 1000 : 0;
      prev = now;
      if (!this.active || document.hidden) { stillFor = 0; return; }
      this.governor.sample(dt);
      const cam = this.view.camera.position;
      const moving = window.scrollY !== lastY || camPrev.distanceToSquared(cam) > 1e-7 || this.timeOverride != null;
      lastY = window.scrollY; camPrev.copy(cam);
      stillFor = moving ? 0 : stillFor + dt;
      if (stillFor > 0.5 && ++skip % (this.low ? 3 : 2)) return;
      this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }
}
