// Mala · real flower garlands that hang, sway and can be carried.
// Each garland is a verlet rope (gravity, damping, length constraints, a little bending
// stiffness) skinned with a photographic strand: real marigold / jasmine garlands cut out
// of CC-licensed photos (see README), straightened and made to tile along the rope.
// Ornaments (rose bands, the marigold tassel) are photographic sprites riding on the rope.
//
// One GarlandScene per section: its canvas sits inside the section, so it scrolls natively
// with the content (no fixed-canvas lag on phones). Coordinates are CSS px, local to the host.
import {
  BufferAttribute, BufferGeometry, DoubleSide, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, OrthographicCamera,
  PlaneGeometry, RepeatWrapping, Scene, ShaderMaterial, SRGBColorSpace, TextureLoader, WebGLRenderer,
} from 'three';

const TEX_BASE = '/themes/mala/tex/';
const G = 2200; // px/s² — garlands are heavy and slow, not springy
const DT = 1 / 60;

// ───────────────────────── Textures (shared loader, one image per name) ─────────────────────────
const imgCache = new Map();
export function loadImage(name) {
  if (!imgCache.has(name)) {
    imgCache.set(name, new Promise((res, rej) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = `${TEX_BASE}${name}.webp`;
    }));
  }
  return imgCache.get(name);
}
export const preload = (names) => Promise.all(names.map(loadImage));

// ───────────────────────── Rope physics ─────────────────────────
class Rope {
  constructor(o) {
    Object.assign(this, { width: 30, loop: false, z: 1, stiff: 0.35, damping: 0.986, weight: null, ornaments: [], vOffset: Math.random() * 10 }, o);
    const segLen = Math.max(this.width * 0.5, 8, this.length / 52);
    this.n = Math.max(6, Math.min(64, Math.round(this.length / segLen) + (this.loop ? 0 : 1)));
    this.seg = this.length / (this.loop ? this.n : this.n - 1);
    this.x = new Float32Array(this.n); this.y = new Float32Array(this.n);
    this.px = new Float32Array(this.n); this.py = new Float32Array(this.n);
    this.inv = new Float32Array(this.n).fill(1);
    this.reset();
  }
  pinIndex(i) { return i === 'end' ? this.n - 1 : i < 0 ? this.n + i : i; }
  /** Lay the rope out between its first two pins (or as a circle for loops) before settling. */
  reset() {
    const P = this.pins.map((p) => ({ i: this.pinIndex(p.i), at: p.at() }));
    if (this.loop && P[1] && P[1].i > 0) {
      // Held garland: a short top run between the hands, the rest hanging as a U below them.
      const [a, b] = [P[0].at, P[1].at]; const k1 = P[1].i; const n = this.n;
      for (let k = 0; k <= k1; k++) { const t = k / k1; this.x[k] = a[0] + (b[0] - a[0]) * t; this.y[k] = a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * 4; }
      const hw = Math.max(4, Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
      const cx = (a[0] + b[0]) / 2; const cy = (a[1] + b[1]) / 2;
      const rem = (n - k1) * this.seg;
      const drop = Math.max(0, (rem - Math.PI * hw) / 2);
      const pathLen = 2 * drop + Math.PI * hw;
      for (let j = 1; j < n - k1; j++) {
        const s = (j / (n - k1)) * pathLen; let X; let Y;
        if (s < drop) { X = cx + hw; Y = cy + s; }
        else if (s < drop + Math.PI * hw) { const th = (s - drop) / hw; X = cx + hw * Math.cos(th); Y = cy + drop + hw * Math.sin(th); }
        else { X = cx - hw; Y = cy + drop - (s - drop - Math.PI * hw); }
        this.x[k1 + j] = X; this.y[k1 + j] = Y;
      }
    } else if (this.loop) {
      const [a, b] = [P[0].at, (P[1] || P[0]).at];
      const cx = (a[0] + b[0]) / 2; const cy = (a[1] + b[1]) / 2;
      const r = this.length / (2 * Math.PI);
      for (let k = 0; k < this.n; k++) {
        const t = (k / this.n) * Math.PI * 2 - Math.PI / 2;
        this.x[k] = cx + Math.cos(t) * r * 0.9; this.y[k] = cy + r + Math.sin(t) * r;
      }
    } else {
      const a = P[0].at; const b = P[1] ? P[1].at : [a[0], a[1] + this.length];
      for (let k = 0; k < this.n; k++) {
        const t = k / (this.n - 1);
        this.x[k] = a[0] + (b[0] - a[0]) * t;
        this.y[k] = a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * this.length * 0.25 * (P[1] ? 1 : 0);
      }
    }
    this.px.set(this.x); this.py.set(this.y);
    this.inv.fill(1);
    for (const p of P) this.inv[p.i] = 0;
  }
  step(t, wind) {
    const { x, y, px, py, inv, n, damping } = this;
    const g = G * DT * DT;
    for (let k = 0; k < n; k++) {
      if (!inv[k]) continue;
      const w = this.weight?.[k] ?? 1;
      const vx = (x[k] - px[k]) * damping; const vy = (y[k] - py[k]) * damping;
      px[k] = x[k]; py[k] = y[k];
      const [ax, ay] = wind ? wind(x[k], y[k], t) : [0, 0];
      x[k] += vx + ax * DT * DT; y[k] += vy + g * w + ay * DT * DT;
    }
    for (const p of this.pins) {
      const i = this.pinIndex(p.i); const [ax, ay] = p.at(); x[i] = ax; y[i] = ay;
    }
    const segs = this.loop ? n : n - 1;
    for (let it = 0; it < 26; it++) {
      for (let k = 0; k < segs; k++) {
        const j = (k + 1) % n; this.solve(k, j, this.seg, 1);
      }
      if (this.stiff) for (let k = 0; k < (this.loop ? n : n - 2); k++) this.solve(k, (k + 2) % n, this.seg * 1.86, this.stiff, true);
      if (this.colliders) this.collide();
    }
  }
  solve(a, b, rest, k, pushOnly = false) {
    const { x, y, inv } = this;
    const dx = x[b] - x[a]; const dy = y[b] - y[a];
    const d = Math.hypot(dx, dy) || 1e-6;
    if (pushOnly && d >= rest) return;
    const wsum = inv[a] + inv[b]; if (!wsum) return;
    const diff = ((d - rest) / d) * k / wsum;
    x[a] += dx * diff * inv[a]; y[a] += dy * diff * inv[a];
    x[b] -= dx * diff * inv[b]; y[b] -= dy * diff * inv[b];
  }
  collide() {
    const r = this.width * 0.45;
    for (const c of this.colliders()) {
      for (let k = 0; k < this.n; k++) {
        if (!this.inv[k]) continue;
        const X = this.x[k]; const Y = this.y[k];
        if (X < c.x - r || X > c.x + c.w + r || Y < c.y - r || Y > c.y + c.h + r) continue;
        const dl = X - (c.x - r); const dr = c.x + c.w + r - X; const dt = Y - (c.y - r); const db = c.y + c.h + r - Y;
        const m = Math.min(dl, dr, dt, db);
        if (m === dl) this.x[k] = c.x - r; else if (m === dr) this.x[k] = c.x + c.w + r;
        else if (m === dt) this.y[k] = c.y - r; else this.y[k] = c.y + c.h + r;
      }
    }
  }
  /** Fraction along the rope (0..1) → point, tangent angle. */
  sample(f) {
    const segs = this.loop ? this.n : this.n - 1;
    const u = Math.max(0, Math.min(0.99999, f)) * segs;
    const k = Math.floor(u); const t = u - k; const j = (k + 1) % this.n;
    const X = this.x[k] + (this.x[j] - this.x[k]) * t; const Y = this.y[k] + (this.y[j] - this.y[k]) * t;
    return { x: X, y: Y, a: Math.atan2(this.y[j] - this.y[k], this.x[j] - this.x[k]), k };
  }
  energy() {
    let e = 0;
    for (let k = 0; k < this.n; k++) e = Math.max(e, Math.abs(this.x[k] - this.px[k]) + Math.abs(this.y[k] - this.py[k]));
    return e;
  }
}

// ───────────────────────── Rendering ─────────────────────────
const SHADOW_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SHADOW_FS = `uniform sampler2D map; uniform float opacity; uniform vec3 tint; varying vec2 vUv;
  void main(){ float a = texture2D(map, vUv, 2.5).a; gl_FragColor = vec4(tint, a * opacity); }`;

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t; const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export class GarlandScene {
  /**
   * @param host element the canvas is placed in (position: relative/absolute/sticky)
   * @param opts.reduced  no wind/pointer/breeze; ropes settle once
   * @param opts.bleed    extra px of canvas around the host (garlands may hang outside a little)
   */
  constructor(host, { reduced = false, bleed = 0, dprCap = 2, shadow = { x: 5, y: 11, opacity: 0.22 } } = {}) {
    this.host = host; this.reduced = reduced; this.bleed = bleed; this.shadow = shadow;
    this.ropes = []; this.sprites = []; this.onStep = []; this.t = 0; this.wake = 1; this.active = true;
    this.pointer = null; this.scrollV = 0;
    const c = (this.canvas = document.createElement('canvas'));
    c.className = 'ml-gl';
    c.setAttribute('aria-hidden', 'true');
    Object.assign(c.style, { position: 'absolute', left: `${-bleed}px`, top: `${-bleed}px`, pointerEvents: 'none' });
    host.prepend(c);
    try {
      this.gl = new WebGLRenderer({ canvas: c, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
      this.gl.outputColorSpace = SRGBColorSpace;
      this.gl.setClearColor(0x000000, 0);
      this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    } catch (err) {
      console.warn('[mala] WebGL unavailable, using 2D garlands', err);
      this.gl = null; this.ctx = c.getContext('2d'); this.dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    }
    this.scene = new Scene();
    this.camera = new OrthographicCamera(0, 1, 0, -1, -10, 10);
    this.textures = new Map();
    this.resize();
    if (!reduced) {
      host.addEventListener('pointermove', (e) => this.onPointer(e), { passive: true });
      host.addEventListener('pointerleave', () => { this.pointer = null; }, { passive: true });
    }
    this.io = new IntersectionObserver(([en]) => { this.visible = en.isIntersecting; if (en.isIntersecting) this.kick(); }, { rootMargin: '25% 0px' });
    this.io.observe(host);
  }

  texture(name) {
    if (!this.textures.has(name)) {
      const tex = new TextureLoader().load(`${TEX_BASE}${name}.webp`, (t) => {
        const im = t.image; tex.userData.aspect = im.height / im.width; this.layoutDirty = true; this.kick();
      });
      tex.colorSpace = SRGBColorSpace; tex.wrapS = RepeatWrapping; tex.wrapT = RepeatWrapping;
      tex.minFilter = LinearMipmapLinearFilter; tex.anisotropy = 4; tex.userData.aspect = 6;
      this.textures.set(name, tex);
    }
    return this.textures.get(name);
  }

  resize() {
    const r = this.host.getBoundingClientRect();
    this.w = Math.ceil(r.width + this.bleed * 2); this.h = Math.ceil(r.height + this.bleed * 2);
    this.canvas.style.width = `${this.w}px`; this.canvas.style.height = `${this.h}px`;
    if (this.gl) {
      this.gl.setSize(this.w, this.h, false);
      Object.assign(this.camera, { left: -this.bleed, right: this.w - this.bleed, top: this.bleed, bottom: -(this.h - this.bleed) });
      this.camera.updateProjectionMatrix();
    } else if (this.ctx) {
      this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr);
    }
    this.kick();
  }

  /** Add a rope. pins: [{ i: 0|'end'|n, at: () => [x, y] }]; ornaments: [{ tex, f, w, mode: 'hang'|'center', flip }] */
  add(opts) {
    const rope = new Rope(opts);
    if (this.gl) {
      const tex = this.texture(opts.tex);
      const maxPts = (rope.n + 2) * 4;
      const geo = new BufferGeometry();
      geo.setAttribute('position', new BufferAttribute(new Float32Array(maxPts * 2 * 3), 3));
      geo.setAttribute('uv', new BufferAttribute(new Float32Array(maxPts * 2 * 2), 2));
      const idx = [];
      for (let k = 0; k < maxPts - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      geo.setIndex(idx);
      rope.geo = geo; rope.maxPts = maxPts;
      rope.mesh = new Mesh(geo, new MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, side: DoubleSide }));
      rope.mesh.renderOrder = rope.z * 10 + 5; rope.mesh.frustumCulled = false;
      rope.shadowMesh = new Mesh(geo, this.shadowMaterial(tex));
      rope.shadowMesh.renderOrder = rope.z * 10; rope.shadowMesh.frustumCulled = false;
      rope.shadowMesh.position.set(this.shadow.x * (rope.width / 34), -this.shadow.y * (rope.width / 34), 0);
      this.scene.add(rope.shadowMesh, rope.mesh);
      rope.orn = rope.ornaments.map((o) => this.ornament(o, rope.z));
    } else {
      loadImage(opts.tex).then((im) => { rope.img = im; this.kick(); });
      rope.orn = rope.ornaments.map((o) => { const s = { ...o }; loadImage(o.tex).then((im) => { s.img = im; this.kick(); }); return s; });
    }
    this.ropes.push(rope);
    return rope;
  }

  shadowMaterial(tex) {
    return new ShaderMaterial({
      uniforms: { map: { value: tex }, opacity: { value: this.shadow.opacity }, tint: { value: [0.23, 0.15, 0.05] } },
      vertexShader: SHADOW_VS, fragmentShader: SHADOW_FS, transparent: true, depthTest: false, depthWrite: false, side: DoubleSide,
    });
  }

  ornament(o, z) {
    const tex = this.texture(o.tex);
    const geo = new PlaneGeometry(1, 1);
    const mesh = new Mesh(geo, new MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, side: DoubleSide }));
    mesh.renderOrder = z * 10 + 7 + (o.zAdd || 0); mesh.frustumCulled = false;
    const sh = new Mesh(geo, this.shadowMaterial(tex)); sh.renderOrder = z * 10 + 1; sh.frustumCulled = false;
    this.scene.add(sh, mesh);
    return { ...o, mesh, sh, tex };
  }

  remove(rope) {
    this.ropes = this.ropes.filter((r) => r !== rope);
    if (rope.mesh) { this.scene.remove(rope.mesh, rope.shadowMesh); rope.geo.dispose(); for (const o of rope.orn) this.scene.remove(o.mesh, o.sh); }
  }

  clear() { [...this.ropes].forEach((r) => this.remove(r)); }

  onPointer(e) {
    const r = this.host.getBoundingClientRect();
    const x = e.clientX - r.left; const y = e.clientY - r.top;
    const p = this.pointer;
    const now = performance.now();
    if (p) {
      const dt = Math.max(8, now - p.t);
      this.pointer = { x, y, vx: ((x - p.x) / dt) * 1000, vy: ((y - p.y) / dt) * 1000, t: now };
    } else this.pointer = { x, y, vx: 0, vy: 0, t: now };
    this.kick();
  }

  kick() { this.wake = 1; this.idle = 0; this.calmFactor = 1; }

  /** Run the simulation quietly until the ropes rest (used at layout time and for reduced motion). */
  settle(steps = 360) { for (let s = 0; s < steps; s++) this.ropes.forEach((r) => r.step(this.t, null)); this.onStep.forEach((f) => f(true)); this.layoutDirty = true; }

  wind() {
    if (this.reduced) return null;
    const t = this.t; const pt = this.pointer;
    // Scroll gives a sway, never a gale: at most ~8° of swing on a fast fling.
    const sv = Math.max(-1, Math.min(1, this.scrollV / 1600)) * 340;
    const breeze = (this.breeze ?? 1) * this.calmFactor;
    return (x, y) => {
      // A slow breeze across the room, a sway that follows the scroll, and a push from a finger.
      let ax = (Math.sin(t * 0.55 + x * 0.0042) * 34 + Math.sin(t * 1.3 + x * 0.011 + y * 0.004) * 12) * breeze;
      let ay = 0;
      ax += sv * Math.sin(x * 0.0035 + t * 0.6 + 1.2);
      ay -= Math.abs(sv) * 0.1;
      if (pt) {
        const dx = x - pt.x; const dy = y - pt.y; const d2 = dx * dx + dy * dy;
        if (d2 < 110 * 110) {
          const f = 1 - Math.sqrt(d2) / 110;
          ax += Math.max(-900, Math.min(900, pt.vx * 2.4)) * f; ay += Math.max(-900, Math.min(900, pt.vy * 2.4)) * f;
        }
      }
      return [ax, ay];
    };
  }

  /** Advance physics by one display frame. Returns false when nothing needs drawing. */
  tick(frameDt) {
    if (!this.active || (!this.visible && !this.forceRender)) return false;
    if (this.reduced) {
      if (this.layoutDirty || this.forceRender) { this.render(); this.layoutDirty = false; this.forceRender = false; }
      return true;
    }
    // Calm down when nobody scrolls or touches: the breeze fades and still garlands stop drawing.
    if (Math.abs(this.scrollV) > 8) this.kick();
    this.idle = (this.idle || 0) + frameDt / 1000;
    this.calmFactor = this.idle < 6 ? 1 : Math.max(0, 1 - (this.idle - 6) / 5);
    if (this.idle > 14 && !this.forceRender && !this.layoutDirty && this.ropes.every((r) => r.energy() < 0.02)) return false;
    this.forceRender = false; this.layoutDirty = false;
    const steps = Math.min(3, Math.max(1, Math.round(frameDt / (DT * 1000))));
    const wind = this.wind();
    for (let s = 0; s < steps; s++) {
      this.t += DT;
      this.ropes.forEach((r) => r.step(this.t, wind));
    }
    this.onStep.forEach((f) => f(false));
    if (this.pointer && performance.now() - this.pointer.t > 120) { this.pointer.vx *= 0.8; this.pointer.vy *= 0.8; }
    this.render();
    return true;
  }

  render() {
    if (this.gl) {
      for (const r of this.ropes) { this.skin(r); r.orn.forEach((o) => this.place(r, o)); }
      this.gl.render(this.scene, this.camera);
    } else this.render2d();
  }

  /** Build the ribbon: smooth the rope, offset by its half width, run the strand texture along it. */
  skin(r) {
    const tex = r.mesh.material.map; const aspect = tex.userData.aspect || 6;
    const n = r.n; const sub = 4;
    const pts = [];
    const get = (k) => {
      if (r.loop) k = ((k % n) + n) % n; else k = Math.max(0, Math.min(n - 1, k));
      return [r.x[k], r.y[k]];
    };
    const segs = r.loop ? n : n - 1;
    for (let k = 0; k < segs; k++) {
      const p0 = get(k - 1); const p1 = get(k); const p2 = get(k + 1); const p3 = get(k + 2);
      for (let s = 0; s < sub; s++) { const t = s / sub; pts.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)]); }
    }
    pts.push(r.loop ? pts[0] : get(n - 1));
    if (!r.loop) { // extend open ends a touch so the cut ends sit under ornaments or off-canvas
      const a = pts[0]; const b = pts[1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      pts.unshift([a[0] - ((b[0] - a[0]) / L) * r.width * 0.2, a[1] - ((b[1] - a[1]) / L) * r.width * 0.2]);
    }
    const m = Math.min(pts.length, r.maxPts);
    const pos = r.geo.attributes.position.array; const uv = r.geo.attributes.uv.array;
    const sc = r.scaleAt ? r.scaleAt() : 1;
    const hw = (r.width * sc) / 2;
    const arcs = new Float32Array(m);
    for (let k = 1; k < m; k++) arcs[k] = arcs[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    let repeat = r.width * sc * aspect;
    // A closed garland must meet itself: fit a whole number of strand repeats around it.
    if (r.loop) repeat = arcs[m - 1] / Math.max(1, Math.round(arcs[m - 1] / repeat));
    for (let k = 0; k < m; k++) {
      let a = pts[Math.max(0, k - 1)]; let b = pts[Math.min(m - 1, k + 1)];
      if (r.loop && (k === 0 || k === m - 1)) { a = pts[m - 2]; b = pts[1]; }
      let tx = b[0] - a[0]; let ty = b[1] - a[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
      const nx = -ty * hw; const ny = tx * hw;
      const v = arcs[k] / repeat + r.vOffset;
      const i6 = k * 6; const i4 = k * 4;
      pos[i6] = pts[k][0] + nx; pos[i6 + 1] = -(pts[k][1] + ny); pos[i6 + 2] = 0;
      pos[i6 + 3] = pts[k][0] - nx; pos[i6 + 4] = -(pts[k][1] - ny); pos[i6 + 5] = 0;
      uv[i4] = 0; uv[i4 + 1] = v; uv[i4 + 2] = 1; uv[i4 + 3] = v;
    }
    r.geo.setDrawRange(0, Math.max(0, (m - 1) * 6));
    r.geo.attributes.position.needsUpdate = true; r.geo.attributes.uv.needsUpdate = true;
  }

  place(r, o) {
    const s = r.sample(o.f);
    const aspect = o.tex.userData.aspect || 1;
    const w = o.w * (r.scaleAt ? r.scaleAt() : 1); const h = w * aspect;
    // 'hang': the sprite's top sits on the rope and it hangs along the rope direction (tassels).
    // 'center': centred on the rope, across it (rose bands).
    let ang = s.a - Math.PI / 2;
    if (o.dir === 'down') { // hangs under gravity from a loop's lowest point, tilting a little with the rope
      let t = s.a; while (t > Math.PI / 2) t -= Math.PI; while (t < -Math.PI / 2) t += Math.PI;
      ang = t * 0.5;
    }
    if (o.flip) ang += Math.PI;
    const off = o.mode === 'hang' ? h / 2 - (o.overlap ?? h * 0.2) : 0;
    const cx = s.x - Math.sin(ang) * off; const cy = s.y + Math.cos(ang) * off;
    o.mesh.position.set(cx, -cy, 0); o.mesh.rotation.z = -ang; o.mesh.scale.set(w, h, 1);
    o.sh.position.set(cx + this.shadow.x, -cy - this.shadow.y, 0); o.sh.rotation.z = -ang; o.sh.scale.set(w * 1.02, h * 1.02, 1);
  }

  /** Fallback: slices of the strand drawn along the rope with 2D canvas transforms. */
  render2d() {
    const ctx = this.ctx; if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, this.bleed * this.dpr, this.bleed * this.dpr);
    ctx.clearRect(-this.bleed, -this.bleed, this.w, this.h);
    for (const r of [...this.ropes].sort((a, b) => a.z - b.z)) {
      const im = r.img; if (!im) continue;
      const aspect = im.height / im.width; const repeat = r.width * aspect;
      const segs = r.loop ? r.n : r.n - 1; let arc = 0;
      for (let k = 0; k < segs; k++) {
        const j = (k + 1) % r.n; const dx = r.x[j] - r.x[k]; const dy = r.y[j] - r.y[k]; const L = Math.hypot(dx, dy);
        const v0 = ((arc / repeat + r.vOffset) % 1) * im.height; arc += L;
        const sh = Math.min(im.height - v0, (L * 1.5 / r.width) * im.width);
        ctx.save(); ctx.translate(r.x[k], r.y[k]); ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
        ctx.drawImage(im, 0, v0, im.width, Math.max(1, sh), -r.width / 2, -L * 0.25, r.width, L * 1.5);
        ctx.restore();
      }
      for (const o of r.orn) {
        if (!o.img) continue; const s = r.sample(o.f); const h = o.w * (o.img.height / o.img.width);
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a - Math.PI / 2 + (o.flip ? Math.PI : 0));
        ctx.drawImage(o.img, -o.w / 2, o.mode === 'hang' ? -h * 0.2 : -h / 2, o.w, h); ctx.restore();
      }
    }
  }

  destroy() { this.io.disconnect(); this.gl?.dispose(); this.canvas.remove(); }
}

/** One clock for every scene: physics at 60 Hz, sleeps scenes that are off-screen. */
export function runScenes(scenes, gsap, { getScrollV }) {
  let last = performance.now();
  gsap.ticker.add(() => {
    const now = performance.now(); const dt = Math.min(64, now - last); last = now;
    const sv = getScrollV();
    for (const s of scenes) { s.scrollV = sv; s.tick(dt); }
  });
}
