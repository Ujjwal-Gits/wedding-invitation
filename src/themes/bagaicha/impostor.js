// Billboard impostors of real high-poly plants (CC0 Poly Haven models baked offline
// by tools/bake.js from 8 directions: albedo with sky occlusion + world normals).
// At runtime each plant is one camera-facing quad per instance that picks and blends
// the two nearest baked views, relit with the scene's sun, sky and leaf translucency.
import * as THREE from 'three';

const DIR = '/themes/bagaicha/imp/';

export async function loadImpostors(names) {
  const manifest = await fetch(DIR + 'manifest.json').then((r) => r.json()).catch(() => ({}));
  const tl = new THREE.TextureLoader();
  const load = (f, srgb) => new Promise((res) => tl.load(DIR + f, (t) => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4;
    res(t);
  }, undefined, () => res(null)));
  const out = {};
  await Promise.all(names.map(async (n) => {
    if (!manifest[n]) return;
    const [color, normal] = await Promise.all([load(`${n}.webp`, true), load(`${n}_n.webp`, false)]);
    if (color && normal) out[n] = { ...manifest[n], color, normal };
  }));
  return out;
}

// shared lighting, updated by the garden each frame
export const impostorLight = {
  sunDir: { value: new THREE.Vector3(0.5, 0.7, 0.3) },
  sunColor: { value: new THREE.Color('#ffffff') },
  skyColor: { value: new THREE.Color('#dfe8ee') },
  groundColor: { value: new THREE.Color('#5d6a45') },
  ambient: { value: 1.0 },
  sunK: { value: 1.0 },
  time: { value: 0 },
};

const BILLBOARD = /* glsl */`
  uniform float uSize, uViews, uCols, uRows, time;
  varying vec2 vUv0, vUv1;
  varying float vBlend, vYaw;
  varying vec3 vWorld;
  vec2 cellUv(float k, vec2 uv) {
    float col = mod(k, uCols), row = floor(k / uCols);
    return vec2((col + uv.x) / uCols, 1.0 - (row + 1.0 - uv.y) / uRows);
  }
  vec4 billboard() {
    vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    vec3 c0 = vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]);
    float sx = length(c0);
    float sy = length(vec3(instanceMatrix[1][0], instanceMatrix[1][1], instanceMatrix[1][2]));
    float yaw = atan(-c0.z, c0.x);
    vYaw = yaw;
    vec3 toCam = cameraPosition - ip;
    vec2 d = normalize(toCam.xz + vec2(1e-5));
    vec3 right = vec3(d.y, 0.0, -d.x);
    // a gentle sway, stronger toward the top
    float sway = sin(time * 0.9 + ip.x * 0.31 + ip.z * 0.17) * 0.012 * position.y;
    vec3 wp = ip + right * ((position.x + sway) * uSize * sx) + vec3(0.0, position.y * uSize * sy, 0.0);
    vWorld = wp;
    float a = atan(d.x, d.y) - yaw;
    float f = a / (6.2831853 / uViews);
    f = mod(f, uViews);
    float k0 = floor(f), k1 = mod(k0 + 1.0, uViews);
    vBlend = f - k0;
    vUv0 = cellUv(k0, uv);
    vUv1 = cellUv(k1, uv);
    return vec4(wp, 1.0);
  }`;

export function impostorMaterial(imp, { tint = '#ffffff', translucency = 0.55 } = {}) {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    colorMap: { value: imp.color }, normalMap: { value: imp.normal },
    uSize: { value: imp.size }, uViews: { value: imp.views }, uCols: { value: imp.cols }, uRows: { value: imp.rows },
    tint: { value: new THREE.Color(tint) }, translucency: { value: translucency },
  }]);
  Object.assign(uniforms, impostorLight);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      ${BILLBOARD}
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = billboard();
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D colorMap, normalMap;
      uniform vec3 sunDir, sunColor, skyColor, groundColor, tint;
      uniform float ambient, sunK, translucency;
      varying vec2 vUv0, vUv1;
      varying float vBlend, vYaw;
      varying vec3 vWorld;
      #include <fog_pars_fragment>
      void main() {
        vec4 c0 = texture2D(colorMap, vUv0), c1 = texture2D(colorMap, vUv1);
        vec4 c = mix(c0, c1, vBlend);
        if (c.a < 0.5) discard;
        vec3 n = normalize(mix(texture2D(normalMap, vUv0).xyz, texture2D(normalMap, vUv1).xyz, vBlend) * 2.0 - 1.0);
        float cy = cos(vYaw), sy = sin(vYaw);
        n = vec3(cy * n.x + sy * n.z, n.y, -sy * n.x + cy * n.z);
        vec3 L = normalize(sunDir);
        vec3 V = normalize(cameraPosition - vWorld);
        float ndl = dot(n, L);
        float wrap = max((ndl + 0.35) / 1.35, 0.0);
        vec3 sky = mix(groundColor, skyColor, n.y * 0.5 + 0.5);
        // the bake carries its own self-shadowing; lift it a little so canopies read sunlit, not black
        vec3 alb = pow(c.rgb, vec3(0.85)) * tint * 1.35;
        vec3 lit = alb * (sky * ambient + sunColor * wrap * sunK);
        // light through the leaves when the sun is behind them
        float through = pow(max(dot(-V, L), 0.0), 3.0) * (1.0 - max(ndl, 0.0));
        lit += alb * vec3(1.0, 1.05, 0.6) * sunColor * through * translucency * sunK;
        gl_FragColor = vec4(lit, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const depth = new THREE.ShaderMaterial({
    uniforms: { colorMap: uniforms.colorMap, uSize: uniforms.uSize, uViews: uniforms.uViews, uCols: uniforms.uCols, uRows: uniforms.uRows, time: impostorLight.time },
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      ${BILLBOARD}
      void main() { gl_Position = projectionMatrix * viewMatrix * billboard(); }`,
    fragmentShader: /* glsl */`
      #include <packing>
      uniform sampler2D colorMap;
      varying vec2 vUv0, vUv1;
      varying float vBlend;
      void main() {
        float a = mix(texture2D(colorMap, vUv0).a, texture2D(colorMap, vUv1).a, vBlend);
        if (a < 0.5) discard;
        gl_FragColor = packDepthToRGBA(gl_FragCoord.z);
      }`,
  });
  return { material: mat, depth };
}

/** Plants impostors. items: [x, y, z, yaw, scale, scaleY?]; `height` targets a real-world height in metres. */
export function plantImpostors(scene, imp, items, { height, tint, translucency, shadow = true } = {}) {
  if (!imp || !items.length) return null;
  const { material, depth } = impostorMaterial(imp, { tint, translucency });
  const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, material, items.length);
  const k = height ? height / imp.height : 1;
  const o = new THREE.Object3D();
  items.forEach(([x, y, z, yaw = 0, s = 1, sy = s], i) => {
    o.position.set(x, y - 0.05 * k * s, z);
    o.rotation.set(0, yaw, 0);
    o.scale.set(s * k, sy * k, s * k);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  });
  mesh.frustumCulled = false;
  mesh.castShadow = shadow;
  mesh.customDepthMaterial = depth;
  scene.add(mesh);
  return mesh;
}
