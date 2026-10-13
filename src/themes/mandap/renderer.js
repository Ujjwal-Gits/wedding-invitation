// The theme's own renderer for MandapView: MSAA, HDR bloom for fire and lamps,
// ACES tone mapping, a night grade (vignette, grain), adaptive resolution.
import * as T from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: 1 }, uVignette: { value: 0.5 }, uGrain: { value: 0.035 }, uFade: { value: 0 } },
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
      c = mix(c, c + vec3(0.004, 0.003, 0.012), 1.0 - smoothstep(0.0, 0.08, l));
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
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.03 } },
  vertexShader: GradeShader.vertexShader,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uGrain; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); c.rgb += (hash(vUv * 1000.0 + fract(uTime)) - 0.5) * uGrain; gl_FragColor = c; }`,
};

export class NightRenderer {
  constructor(canvas, view, { mobile = false, maxPR } = {}) {
    this.view = view;
    this.mobile = mobile;
    this.maxPR = maxPR ?? (mobile ? 1.5 : 1.75);
    this.pr = Math.min(window.devicePixelRatio || 1, this.maxPR);
    const r = (this.renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }));
    r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = !mobile;
    r.shadowMap.type = T.PCFSoftShadowMap;
    r.setPixelRatio(this.pr);
    const rt = new T.WebGLRenderTarget(2, 2, { type: T.HalfFloatType, samples: mobile ? 2 : 4 });
    this.composer = new EffectComposer(r, rt);
    this.composer.addPass(new RenderPass(view.scene, view.camera));
    this.composer.addPass(new ShaderPass(ClampShader));
    this.bloom = new UnrealBloomPass(new T.Vector2(256, 256), mobile ? 0.45 : 0.55, 0.5, 0.92);
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

  /** Lower the resolution when frames are slow (phones), never above the cap. */
  adapt(dt) {
    this.frames.push(dt);
    if (this.frames.length < 40) return;
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    this.frames.length = 0;
    const cap = Math.min(window.devicePixelRatio || 1, this.maxPR);
    let next = this.pr;
    if (avg > 1 / 40 && this.pr > 0.75) next = Math.max(0.75, this.pr - 0.25);
    else if (avg < 1 / 58 && this.pr < cap) next = Math.min(cap, this.pr + 0.25);
    if (next !== this.pr) { this.pr = next; this.resize(); }
  }

  render() {
    const now = performance.now();
    const t = this.timeOverride ?? (now - this.t0) / 1000;
    if (this.last && this.timeOverride == null) this.adapt((now - this.last) / 1000);
    this.last = now;
    this.onFrame?.(t);
    this.view.update(this.aspect, t);
    this.grade.uniforms.uTime.value = t;
    this.grain.uniforms.uTime.value = t;
    this.composer.render();
  }

  start() {
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (this.active && !document.hidden) this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }
}
