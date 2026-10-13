// Realistic planting for Bagaicha: trees and shrubs built from real-leaf cards
// (CC0 Poly Haven leaf scans), instanced; a wind-blown lawn of grass blades
// that follows the camera; PBR surfaces (plaster, rock, gravel, bark) and an
// HDRI for soft environment light. Every asset is CC0 from polyhaven.com.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const TEX = '/themes/bagaicha/tex/';
const { Vector3 } = THREE;

export function rngF(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Loads every texture the planting needs. */
export async function loadFloraAssets(renderer, { hdr = true } = {}) {
  const tl = new THREE.TextureLoader();
  const load = (f, { srgb = true, repeat } = {}) => new Promise((res) => tl.load(TEX + f, (t) => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
    res(t);
  }, undefined, () => res(null)));
  const [fronds, leaves, lawn, gravel, rock, rockNor, plaster, plasterNor, bark] = await Promise.all([
    load('fronds.webp'), load('leaves.webp'), load('lawn.webp', { repeat: [1, 1] }), load('gravel.webp', { repeat: [1, 1] }),
    load('rock.webp', { repeat: [1, 1] }), load('rock_nor.webp', { srgb: false, repeat: [1, 1] }),
    load('plaster.webp', { repeat: [1, 1] }), load('plaster_nor.webp', { srgb: false, repeat: [1, 1] }), load('bark.webp', { repeat: [1, 1] }),
  ]);
  let env = null;
  if (hdr) {
    env = await new Promise((res) => new RGBELoader().load(TEX + 'sky.hdr', (t) => {
      const pm = new THREE.PMREMGenerator(renderer);
      const rt = pm.fromEquirectangular(t);
      t.dispose(); pm.dispose();
      res(rt.texture);
    }, undefined, () => res(null)));
  }
  return { fronds, leaves, lawn, gravel, rock, rockNor, plaster, plasterNor, bark, env };
}

// ───────────────────────── Leaf-card crowns ─────────────────────────
/**
 * A crown of leaf cards filling an ellipsoid (or a box for hedges). Each card
 * gets a normal pointing out of the crown, so the canopy shades like a soft
 * volume, and a vertex colour that darkens toward the heart and underside.
 */
export function crownGeometry({ n = 60, rx = 3, ry = 2.4, rz = rx, cy = 5, size = 2, seed = 1, shape = 'ellipsoid', flat = 0.25 }) {
  const R = rngF(seed);
  const pos = [], nor = [], uv = [], col = [], idx = [];
  const tmp = new Vector3(), t1 = new Vector3(), t2 = new Vector3(), up = new Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    let dir, c, depth;
    if (shape === 'box') {
      // hedges: cards on the faces of a box, normals out of each face
      const faces = [[1, 0, 0, ry * rz], [-1, 0, 0, ry * rz], [0, 0, 1, rx * ry], [0, 0, -1, rx * ry], [0, 1, 0, rx * rz * 1.4]];
      const tot = faces.reduce((a, f) => a + f[3], 0);
      let pick = R() * tot, f = faces[0];
      for (const ff of faces) { if ((pick -= ff[3]) <= 0) { f = ff; break; } }
      dir = new Vector3(f[0], f[1], f[2]);
      c = new Vector3(
        f[0] ? f[0] * rx * 0.9 : (R() * 2 - 1) * rx,
        f[1] ? ry * 0.9 : (R() * 2 - 1) * ry,
        f[2] ? f[2] * rz * 0.9 : (R() * 2 - 1) * rz,
      );
      c.y += cy;
      depth = 0.9 + R() * 0.1;
      dir.add(new Vector3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(0.6)).normalize();
    } else {
      dir = new Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1);
      if (dir.lengthSq() < 0.01) dir.set(0, 1, 0);
      dir.normalize();
      dir.y *= 1 - flat * 0.5;
      depth = 0.45 + Math.pow(R(), 0.55) * 0.55;
      c = new Vector3(dir.x * rx * depth, cy + dir.y * ry * depth, dir.z * rz * depth);
      dir.normalize();
    }
    // card plane: mostly facing outward, tilted at random
    const nrm = dir.clone().add(new Vector3(R() - 0.5, R() * 0.6, R() - 0.5).multiplyScalar(0.9)).normalize();
    t1.crossVectors(Math.abs(nrm.y) > 0.95 ? tmp.set(1, 0, 0) : up, nrm).normalize();
    t2.crossVectors(nrm, t1).normalize();
    const a = R() * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const ax = t1.clone().multiplyScalar(ca).addScaledVector(t2, sa);
    const ay = t1.clone().multiplyScalar(-sa).addScaledVector(t2, ca);
    const s = size * (0.75 + R() * 0.5) * 0.5;
    const base = pos.length / 3;
    [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]].forEach(([u, v, tu, tv]) => {
      const p = c.clone().addScaledVector(ax, u * s).addScaledVector(ay, v * s);
      pos.push(p.x, p.y, p.z);
      const on = dir.clone().multiplyScalar(0.8).addScaledVector(nrm, 0.2).normalize();
      nor.push(on.x, on.y, on.z);
      uv.push(tu, tv);
      const shade = (0.5 + 0.5 * depth) * (0.72 + 0.28 * (dir.y * 0.5 + 0.5));
      col.push(shade, shade, shade);
    });
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Leaf material with a gentle wind sway (per-instance phase) and cut-out shadows. */
export function leafMaterial(map, { color = '#ffffff', env = null } = {}) {
  const uniforms = { uTime: { value: 0 }, uWind: { value: 1 } };
  const m = new THREE.MeshStandardMaterial({
    map, color, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, roughness: 0.82, metalness: 0,
    envMap: env, envMapIntensity: 0.6,
  });
  const sway = /* glsl */`
    #ifdef USE_INSTANCING
      vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    #else
      vec3 ip = vec3(0.0);
    #endif
    float hgt = max(position.y - 1.5, 0.0);
    float ph = ip.x * 0.37 + ip.z * 0.23;
    transformed.x += sin(uTime * 1.1 + ph + position.y * 0.4) * 0.035 * hgt * uWind;
    transformed.z += cos(uTime * 0.9 + ph * 1.3 + position.x * 0.5) * 0.03 * hgt * uWind;`;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${sway}`);
  };
  m.userData.uniforms = uniforms;
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5, side: THREE.DoubleSide });
  depth.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${sway}`);
  };
  return { material: m, depth, uniforms };
}

/** Instanced trees: trunk + crown share instance transforms. items: [x,y,z,yaw,scale,colorHex?]. */
export function plantSpecies(scene, { trunk, crown, trunkMat, leaf, items, shadow = true, tints }) {
  const make = (geo, mat, isLeaf) => {
    const m = new THREE.InstancedMesh(geo, mat, items.length);
    const o = new THREE.Object3D();
    items.forEach(([x, y, z, yaw = 0, s = 1, sy = s], i) => {
      o.position.set(x, y, z);
      o.rotation.set(0, yaw, 0);
      o.scale.set(s, sy, s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      if (isLeaf && tints) m.setColorAt(i, new THREE.Color(tints[i % tints.length]));
    });
    m.castShadow = shadow;
    m.receiveShadow = true;
    if (isLeaf) m.customDepthMaterial = leaf.depth;
    scene.add(m);
    return m;
  };
  if (trunk) make(trunk, trunkMat, false);
  return make(crown, leaf.material, true);
}

/** A trunk with a few limbs reaching into the crown. */
export function trunkGeometry({ h = 4.5, r = 0.22, limbs = 4, seed = 3, spread = 1 }) {
  const R = rngF(seed);
  const parts = [new THREE.CylinderGeometry(r * 0.7, r, h, 9, 3).translate(0, h / 2, 0)];
  for (let i = 0; i < limbs; i++) {
    const L = h * (0.45 + R() * 0.35);
    const g = new THREE.CylinderGeometry(r * 0.25, r * 0.45, L, 6).translate(0, L / 2, 0);
    g.rotateZ((0.5 + R() * 0.45) * spread);
    g.rotateY(R() * Math.PI * 2);
    g.translate(0, h * (0.55 + R() * 0.3), 0);
    parts.push(g);
  }
  // keep only shared attributes for merging
  parts.forEach((p) => { p.deleteAttribute('uv'); });
  const merged = mergeAll(parts);
  // simple cylindrical UVs for the bark
  const p = merged.attributes.position, uvs = [];
  for (let i = 0; i < p.count; i++) uvs.push(Math.atan2(p.getZ(i), p.getX(i)) / Math.PI + 1, p.getY(i) * 0.6);
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return merged;
}

function mergeAll(list) {
  const geos = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  geos.forEach((g) => { n += g.attributes.position.count; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  geos.forEach((g) => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

// ───────────────────────── Lawn ─────────────────────────
/**
 * A field of grass blades that wraps around the camera (fixed count), masked
 * to the lawns, fading at the field's edge, bending in the wind.
 */
export function grassField({ count, field, mask, maskRect, colorBase = '#4C6A2E', colorTip = '#93AC5C', seed = 9 }) {
  const R = rngF(seed);
  const blade = new THREE.PlaneGeometry(1, 1, 1, 3).translate(0, 0.5, 0);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = blade.index;
  geo.setAttribute('position', blade.attributes.position);
  geo.setAttribute('uv', blade.attributes.uv);
  geo.setAttribute('normal', blade.attributes.normal);
  const off = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    off[i * 4] = (R() - 0.5) * field;
    off[i * 4 + 1] = (R() - 0.5) * field;
    off[i * 4 + 2] = 0.09 + R() * R() * 0.12; // height (a kept lawn)
    off[i * 4 + 3] = R() * Math.PI * 2; // facing
  }
  geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
  geo.instanceCount = count;
  const uniforms = {
    uTime: { value: 0 }, uField: { value: field }, uMask: { value: mask }, uMaskRect: { value: new THREE.Vector4(...maskRect) },
    uBase: { value: new THREE.Color(colorBase) }, uTip: { value: new THREE.Color(colorTip) },
  };
  const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aOff;
        uniform float uTime, uField;
        uniform sampler2D uMask;
        uniform vec4 uMaskRect;
        varying float vT;
        varying float vVar;`)
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
      .replace('#include <begin_vertex>', `
        vec2 cam = cameraPosition.xz;
        vec2 wpos = aOff.xy + floor((cam - aOff.xy) / uField + 0.5) * uField;
        vec2 muv = (wpos - uMaskRect.xy) / uMaskRect.zw;
        float m = texture2D(uMask, muv).r;
        float d = length(wpos - cam);
        float fade = 1.0 - smoothstep(uField * 0.3, uField * 0.5, d);
        float hh = aOff.z * m * fade;
        float t = position.y;
        vT = t;
        vVar = fract(sin(dot(aOff.xy, vec2(12.9898, 78.233))) * 43758.5453);
        float w = 0.02 * (1.0 - t * 0.9);
        vec3 p = vec3(position.x * w * 2.0, t * hh, 0.0);
        float wind = sin(uTime * 1.7 + wpos.x * 0.45 + wpos.y * 0.3) * 0.6 + sin(uTime * 3.1 + wpos.x * 1.7 + wpos.y * 0.9) * 0.25;
        p.z += wind * t * t * hh * 0.55;
        p.x += (vVar - 0.5) * t * t * hh * 1.1;
        p.z += (fract(vVar * 7.31) - 0.5) * t * t * hh * 1.1;
        float ca = cos(aOff.w), sa = sin(aOff.w);
        vec3 transformed = vec3(wpos.x + p.x * ca - p.z * sa, p.y, wpos.y + p.x * sa + p.z * ca);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uBase, uTip;
        varying float vT;
        varying float vVar;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = mix(uBase, uTip, vT * (0.75 + vVar * 0.5)) * (0.82 + vVar * 0.3);`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  mesh.userData.uniforms = uniforms;
  return mesh;
}

/** Paints where the lawn is (white) for the grass mask. draw(ctx, toPx) adds the exclusions in black. */
export function lawnMask(rect, draw, size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, size, size);
  const k = size / rect[2];
  g.save();
  g.scale(k, k);
  g.translate(-rect[0], -rect[1]);
  g.fillStyle = '#000';
  draw(g);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = false;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  return t;
}
