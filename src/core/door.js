// A real carved door (from a photograph) whose two leaves are hinged 3D panels.
// Behind them, a "portal" shows the next PhotoView in screen space, so walking
// through the doorway hands over seamlessly to that scene.
import {
  AdditiveBlending, AmbientLight, BoxGeometry, BufferGeometry, Color, ConeGeometry, DirectionalLight, DoubleSide,
  Float32BufferAttribute, Group, LinearFilter, Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry,
  PointLight, Points, Scene, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2, WebGLRenderTarget,
} from 'three';
import { clamp } from './stage.js';

const FOV = 42;
const TAN = Math.tan((FOV * Math.PI) / 360);

const wallFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec4 uRect;      // door opening in uv: x0, y0, x1, y1
  varying vec2 vUv;
  void main() {
    if (vUv.x > uRect.x && vUv.x < uRect.z && vUv.y > uRect.y && vUv.y < uRect.w) discard;
    gl_FragColor = texture2D(uMap, vUv);
    #include <colorspace_fragment>
  }`;
const portalFrag = /* glsl */ `
  uniform sampler2D uPortal;
  uniform vec2 uRes;
  uniform float uGlow;
  void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec3 c = texture2D(uPortal, uv).rgb;
    c += vec3(1.0, 0.8, 0.5) * uGlow * 0.12;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;
const simpleVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
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
    float flick = 0.92 + 0.08 * sin(uTime * 1.7 + vUv.y * 6.0);
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
    vA = uOpen * (0.4 + 0.6 * aSeed.z) * (1.0 - smoothstep(0.0, 0.5, abs(p.x) * 2.0));
    gl_PointSize = (1.5 + aSeed.x * 2.5) * uPR * (1.6 / -mv.z);
  }`;
const dustFrag = /* glsl */ `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 0.85, 0.6, smoothstep(0.5, 0.0, d) * vA); }`;

export class DoorView {
  /**
   * @param rect door opening in image fractions {x, y, w, h} (y from top)
   * @param behind id of the PhotoView seen through the door
   */
  constructor({ id, src, rect, behind, thickness = 0.05 }) {
    Object.assign(this, { id, src, rect, behind, thickness });
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(FOV, 1, 0.005, 50);
    this.progress = 0;   // 0..0.45 leaves open, 0.45..1 walk through
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
      const rectUv = [x, 1 - y - h, x + w, 1 - y];

      // Wall (photo with the opening cut out)
      this.wall = new Mesh(new PlaneGeometry(W, 2), new ShaderMaterial({
        uniforms: { uMap: { value: map }, uRect: { value: rectUv } },
        vertexShader: simpleVert, fragmentShader: wallFrag,
      }));
      this.scene.add(this.wall);

      // Portal behind the opening, sampling the next scene in screen space.
      this.portal = new Mesh(new PlaneGeometry(40, 40), new ShaderMaterial({
        uniforms: { uPortal: { value: this.portalRT.texture }, uRes: { value: new Vector2(1, 1) }, uGlow: { value: 0 } },
        vertexShader: simpleVert, fragmentShader: portalFrag, depthWrite: false,
      }));
      this.portal.position.z = -2.5;
      this.scene.add(this.portal);

      // Leaves
      const ox = (x - 0.5) * W;
      const oy = (0.5 - y) * 2;
      const lw = (w * W) / 2;
      const lh = h * 2;
      this.doorCenter = { x: ox + lw, y: oy - lh / 2 };
      this.leafH = lh;
      const edge = new MeshStandardMaterial({ color: '#2b160a', roughness: 0.85 });
      const back = new MeshStandardMaterial({ color: '#24120a', roughness: 0.85 });
      const leaf = (side) => {
        const t = map.clone();
        t.needsUpdate = true;
        t.repeat.set(w / 2, h);
        t.offset.set(x + (side < 0 ? 0 : w / 2), 1 - y - h);
        const face = new MeshStandardMaterial({ map: t, roughness: 0.62, metalness: 0.05 });
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

      // Light from inside the house
      this.scene.add(new AmbientLight(0xfff0dc, 1.15));
      const key = new DirectionalLight(0xffe8c8, 1.2);
      key.position.set(0.3, 0.6, 2);
      this.scene.add(key);
      this.warm = new PointLight(0xffb060, 0, 3, 1.4);
      this.warm.position.set(this.doorCenter.x, this.doorCenter.y + 0.1, -0.35);
      this.scene.add(this.warm);

      const beam = new Mesh(new ConeGeometry(lw * 1.15, 1.8, 32, 1, true), new ShaderMaterial({
        uniforms: { uIntensity: { value: 0 }, uTime: { value: 0 }, uColor: { value: new Color(1.0, 0.78, 0.48) } },
        vertexShader: beamVert, fragmentShader: beamFrag, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
      }));
      beam.rotation.x = -Math.PI / 2; // apex points into the house
      beam.position.set(this.doorCenter.x, this.doorCenter.y, 0.9);
      this.beam = beam;
      this.scene.add(beam);

      const N = 260;
      const pos = new Float32Array(N * 3);
      const seed = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        pos.set([this.doorCenter.x + (Math.random() - 0.5) * lw * 2.2, this.doorCenter.y + (Math.random() - 0.5) * lh, Math.random() * 0.9], i * 3);
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

  /** Draw the scene behind the door into the portal texture first. */
  beforeRender(renderer, stage, t) {
    const v = stage.views.get(this.behind);
    if (!v?.ready) return;
    const size = renderer.getDrawingBufferSize(new Vector2());
    if (this.portalRT.width !== size.x || this.portalRT.height !== size.y) this.portalRT.setSize(size.x, size.y);
    this.portal.material.uniforms.uRes.value.copy(size);
    v.progress = this.behindProgress;
    v.pointer.copy(this.pointer);
    v.update(stage.aspect, t);
    renderer.setRenderTarget(this.portalRT);
    renderer.clear();
    renderer.render(v.scene, v.camera);
  }

  update(aspect, time) {
    if (!this.ready) return;
    const cam = this.camera;
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
    const W = 2 * this.aspectImg;
    const visH = Math.min(2, W / aspect) * 0.985;
    const d0 = visH / (2 * TAN);

    const p = this.progress;
    const open = clamp(p / 0.45, 0, 1);
    const walk = clamp((p - 0.3) / 0.7, 0, 1);
    // A small "crack" first, then the full swing (the right leaf trails a touch: hand-made, not robotic).
    const k = open < 0.15 ? 0 : (open - 0.15) / 0.85;
    const deg = open < 0.15 ? (open / 0.15) * 6 : 6 + (1 - Math.pow(1 - k, 3)) * 80;
    this.left.rotation.y = (deg * Math.PI) / 180;
    this.right.rotation.y = -((deg * 0.985) * Math.PI) / 180;

    const glow = Math.min(1, open * 1.3);
    this.warm.intensity = glow * 2.2;
    this.beam.material.uniforms.uIntensity.value = glow * 0.16 * (1 - walk);
    this.beam.material.uniforms.uTime.value = time;
    this.dust.material.uniforms.uTime.value = time;
    this.dust.material.uniforms.uOpen.value = glow * (1 - walk * 0.7);
    this.portal.material.uniforms.uGlow.value = glow * (1 - walk);
    this.behindProgress = walk * 0.12;

    // Camera: frame the door, then walk through it (ease in, as if stepping).
    const e = walk * walk * (3 - 2 * walk);
    const c = this.doorCenter;
    const startX = clamp(c.x, -(W - visH * aspect) / 2, (W - visH * aspect) / 2);
    const z = d0 + (-0.25 - d0) * e;
    const x = startX + (c.x - startX) * e + this.pointer.x * 0.03 * (1 - e);
    // Portrait door photos on wide screens: start framed on the door and its torana.
    const visHz = 2 * z * TAN;
    const maxY = Math.max(0, (2 - visHz) / 2);
    const startY = clamp(c.y + this.leafH * 0.28, -Math.max(0, (2 - visH) / 2), Math.max(0, (2 - visH) / 2));
    const y = clamp(startY + (c.y - startY) * e, -maxY - 1, maxY + 1) + this.pointer.y * 0.02 * (1 - e) + Math.sin(walk * Math.PI * 4) * 0.004;
    cam.position.set(x, y, z);
    cam.lookAt(x, y, z - 5);
  }

  /** True once the portal fills the view and the next scene can take over. */
  get through() { return this.progress >= 0.999; }
}
