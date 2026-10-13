// Dhoka's own copy of core/door.js. Differences:
//  - The closed door is framed onto a DOM "plate" rect (px), so the photograph sits on the
//    printed page exactly where CSS laid it out, uncropped at any viewport.
//  - Leaves are unlit (shaded by their angle), so the closed door is pixel-identical to the photo.
//  - The walk eases from that plate framing straight through the opening.
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, Color, ConeGeometry, DoubleSide, Float32BufferAttribute, Group,
  LinearFilter, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Points, Scene, ShaderMaterial,
  SRGBColorSpace, TextureLoader, Vector2, WebGLRenderTarget,
} from 'three';

const FOV = 42;
const TAN = Math.tan((FOV * Math.PI) / 360);
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

const simpleVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const wallFrag = /* glsl */ `
  uniform sampler2D uMap; uniform vec4 uRect; varying vec2 vUv;
  void main() {
    if (vUv.x > uRect.x && vUv.x < uRect.z && vUv.y > uRect.y && vUv.y < uRect.w) discard;
    gl_FragColor = texture2D(uMap, vUv);
    #include <colorspace_fragment>
  }`;
const surroundFrag = /* glsl */ `
  uniform vec3 uPaper; uniform vec4 uHole; varying vec2 vPos;
  void main() {
    if (vPos.x > uHole.x && vPos.x < uHole.z && vPos.y > uHole.y && vPos.y < uHole.w) discard;
    gl_FragColor = vec4(uPaper, 1.0);
    #include <colorspace_fragment>
  }`;
const posVert = /* glsl */ `varying vec2 vPos; void main(){ vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const portalFrag = /* glsl */ `
  uniform sampler2D uPortal; uniform vec2 uRes; uniform float uGlow;
  void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec3 c = texture2D(uPortal, uv).rgb;
    c = mix(c, vec3(1.0, 0.92, 0.78), uGlow * 0.28);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;
const beamVert = /* glsl */ `
  varying vec2 vUv; varying float vFacing;
  void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFacing = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv; }`;
const beamFrag = /* glsl */ `
  uniform float uIntensity, uTime; uniform vec3 uColor; varying vec2 vUv; varying float vFacing;
  void main(){
    float along = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
    float soft = pow(vFacing, 2.2);
    float flick = 0.94 + 0.06 * sin(uTime * 1.7 + vUv.y * 6.0);
    gl_FragColor = vec4(uColor * along * soft * flick * uIntensity, 1.0);
  }`;
const dustVert = /* glsl */ `
  uniform float uTime, uPR, uOpen; attribute vec3 aSeed; varying float vA;
  void main(){
    vec3 p = position;
    p.y += mod(uTime * 0.03 * (0.4 + aSeed.x) + aSeed.y, 1.0) * 0.9 - 0.45;
    p.x += sin(uTime * 0.4 + aSeed.z * 6.28) * 0.02;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vA = uOpen * (0.4 + 0.6 * aSeed.z);
    gl_PointSize = (1.5 + aSeed.x * 2.5) * uPR * (1.6 / -mv.z);
  }`;
const dustFrag = /* glsl */ `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 0.86, 0.62, smoothstep(0.5, 0.0, d) * vA); }`;

export class PlateDoor {
  /**
   * @param rect door opening in image fractions {x, y, w, h} (y from top)
   * @param behind id of the PhotoView seen through the door
   * @param plate () => DOMRect-like {left, top, width, height} where the photo must sit at progress 0
   */
  constructor({ id, src, rect, behind, plate, paper = '#FFFFFF', thickness = 0.045 }) {
    Object.assign(this, { id, src, rect, behind, plate, paper, thickness });
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(FOV, 1, 0.005, 50);
    this.progress = 0; // 0..0.45 leaves open, 0.3..1 walk through
    this.behindProgress = 0;
    this.pointer = new Vector2();
    this.ready = false;
    this.portalRT = new WebGLRenderTarget(2, 2, { colorSpace: SRGBColorSpace });
  }

  async load() {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const map = await new TextureLoader().loadAsync(this.src);
      map.colorSpace = SRGBColorSpace;
      map.minFilter = LinearFilter;
      map.generateMipmaps = false;
      map.anisotropy = 4;
      const ar = (this.aspectImg = map.image.width / map.image.height);
      const W = 2 * ar;
      const { x, y, w, h } = this.rect;

      this.wall = new Mesh(new PlaneGeometry(W, 2), new ShaderMaterial({
        uniforms: { uMap: { value: map }, uRect: { value: [x, 1 - y - h, x + w, 1 - y] } },
        vertexShader: simpleVert, fragmentShader: wallFrag,
      }));
      this.scene.add(this.wall);

      this.portal = new Mesh(new PlaneGeometry(40, 40), new ShaderMaterial({
        uniforms: { uPortal: { value: this.portalRT.texture }, uRes: { value: new Vector2(1, 1) }, uGlow: { value: 0 } },
        vertexShader: simpleVert, fragmentShader: portalFrag, depthWrite: false,
      }));
      this.portal.position.z = -2.5;
      this.scene.add(this.portal);

      const ox = (x - 0.5) * W;
      const oy = (0.5 - y) * 2;
      const lw = (w * W) / 2;
      const lh = h * 2;
      // The printed page around the photograph, with a hole where the doorway is.
      this.surround = new Mesh(new PlaneGeometry(60, 60), new ShaderMaterial({
        uniforms: { uPaper: { value: new Color(this.paper) }, uHole: { value: [ox, oy - lh, ox + 2 * lw, oy] } },
        vertexShader: posVert, fragmentShader: surroundFrag,
      }));
      this.surround.position.z = -0.06;
      this.scene.add(this.surround);
      this.doorCenter = { x: ox + lw, y: oy - lh / 2 };
      this.leafW = lw;
      this.leafH = lh;
      const edge = new MeshBasicMaterial({ color: '#3a2410' });
      const back = new MeshBasicMaterial({ color: '#2a1a0c' });
      this.faces = [];
      const leaf = (side) => {
        const t = map.clone();
        t.needsUpdate = true;
        t.repeat.set(w / 2, h);
        t.offset.set(x + (side < 0 ? 0 : w / 2), 1 - y - h);
        const face = new MeshBasicMaterial({ map: t });
        this.faces.push(face);
        const m = new Mesh(new BoxGeometry(lw, lh, this.thickness), [edge, edge, edge, edge, face, back]);
        m.position.set((side < 0 ? 1 : -1) * lw / 2, 0, -this.thickness / 2);
        const pivot = new Group();
        pivot.position.set(side < 0 ? ox : ox + 2 * lw, oy - lh / 2, 0.001);
        pivot.add(m);
        this.scene.add(pivot);
        return pivot;
      };
      this.left = leaf(-1);
      this.right = leaf(1);

      // Light spilling out of the doorway toward the viewer.
      const beam = new Mesh(new ConeGeometry(lw * 1.1, 1.6, 32, 1, true), new ShaderMaterial({
        uniforms: { uIntensity: { value: 0 }, uTime: { value: 0 }, uColor: { value: new Color(1.0, 0.8, 0.52) } },
        vertexShader: beamVert, fragmentShader: beamFrag, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
      }));
      beam.rotation.x = -Math.PI / 2;
      beam.position.set(this.doorCenter.x, this.doorCenter.y, 0.8);
      this.beam = beam;
      this.scene.add(beam);

      const N = 220;
      const pos = new Float32Array(N * 3);
      const seed = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        pos.set([this.doorCenter.x + (Math.random() - 0.5) * lw * 2, this.doorCenter.y + (Math.random() - 0.5) * lh, Math.random() * 0.8], i * 3);
        seed.set([Math.random(), Math.random(), Math.random()], i * 3);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      g.setAttribute('aSeed', new Float32BufferAttribute(seed, 3));
      this.dust = new Points(g, new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPR: { value: Math.min(window.devicePixelRatio, 2) }, uOpen: { value: 0 } },
        vertexShader: dustVert, fragmentShader: dustFrag, transparent: true, depthWrite: false, blending: AdditiveBlending,
      }));
      this.dust.frustumCulled = false;
      this.scene.add(this.dust);
      this.ready = true;
    })();
    return this.loading;
  }

  beforeRender(renderer, stage, t) {
    const v = stage.views.get(this.behind);
    if (!v?.ready || this.progress <= 0.001) return;
    const size = renderer.getDrawingBufferSize(new Vector2());
    if (this.portalRT.width !== size.x || this.portalRT.height !== size.y) this.portalRT.setSize(size.x, size.y);
    this.portal.material.uniforms.uRes.value.copy(size);
    v.progress = this.behindProgress;
    v.pointer.set(0, 0);
    v.update(stage.aspect, t);
    renderer.setRenderTarget(this.portalRT);
    renderer.clear();
    renderer.render(v.scene, v.camera);
  }

  /** Camera that puts the whole photo exactly on the plate rect. */
  plateCamera() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const r = this.plate?.();
    if (!r || !r.height) {
      const visH = Math.min(2, (2 * this.aspectImg) / (vw / vh));
      return { x: 0, y: 0, z: visH / (2 * TAN) };
    }
    const z = vh / (r.height * TAN);
    const k = (2 * z * TAN) / vh; // world units per px at the wall
    return { x: -(r.left + r.width / 2 - vw / 2) * k, y: -(vh / 2 - (r.top + r.height / 2)) * k, z };
  }

  update(aspect, time) {
    if (!this.ready) return;
    const cam = this.camera;
    cam.aspect = aspect;
    cam.updateProjectionMatrix();

    const p = this.progress;
    const open = clamp(p / 0.45, 0, 1);
    const walk = clamp((p - 0.3) / 0.7, 0, 1);
    // A hesitant crack first, then the full swing; the right leaf trails a touch.
    const k = open < 0.16 ? 0 : (open - 0.16) / 0.84;
    const deg = open < 0.16 ? (open / 0.16) * 5 : 5 + (1 - Math.pow(1 - k, 3)) * 82;
    const rl = (deg * Math.PI) / 180;
    const rr = (deg * 0.975 * Math.PI) / 180;
    this.left.rotation.y = rl;
    this.right.rotation.y = -rr;
    // Leaves darken as they turn away from the light outside.
    this.faces[0].color.setScalar(1 - 0.55 * Math.sin(rl));
    this.faces[1].color.setScalar(1 - 0.55 * Math.sin(rr));

    const glow = Math.min(1, open * 1.25);
    this.beam.material.uniforms.uIntensity.value = glow * 0.22 * (1 - walk);
    this.beam.material.uniforms.uTime.value = time;
    this.dust.material.uniforms.uTime.value = time;
    this.dust.material.uniforms.uOpen.value = glow * (1 - walk * 0.8);
    this.portal.material.uniforms.uGlow.value = glow * (1 - walk) * (1 - walk);
    this.behindProgress = walk * 0.12;

    // Walk: from the plate framing, through the door (ease in like a first step, then glide).
    const s = this.plateCamera();
    const e = walk * walk * (3 - 2 * walk);
    const c = this.doorCenter;
    const z = s.z + (-0.25 - s.z) * e;
    const x = s.x + (c.x - s.x) * e;
    const y = s.y + (c.y - s.y) * Math.min(1, e * 1.4) + Math.sin(walk * Math.PI * 4) * 0.003 * walk;
    cam.position.set(x, y, z);
    cam.lookAt(x, y, z - 5);
  }

  get through() { return this.progress >= 0.999; }
}
