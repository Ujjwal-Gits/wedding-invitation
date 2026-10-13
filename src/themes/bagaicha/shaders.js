// Shaders for the garden. Each export is a factory so materials never share uniforms.
import { UniformsLib, UniformsUtils, Color, Vector3 } from 'three';

const NOISE = /* glsl */`
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}`;

const withFog = (u) => UniformsUtils.merge([UniformsLib.fog, u]);

/** Gradient sky with a soft sun and stars at night. */
export const SKY = () => ({
  uniforms: {
    top: { value: new Color('#93B9D6') }, hor: { value: new Color('#F2EBDD') },
    sunDir: { value: new Vector3(0, 1, 0) }, sunCol: { value: new Color('#fff') }, stars: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 top, hor, sunDir, sunCol;
    uniform float stars;
    varying vec3 vDir;
    float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    void main() {
      vec3 d = normalize(vDir);
      float e = d.y;
      vec3 c = mix(hor, top, pow(smoothstep(-0.02, 0.6, e), 0.75));
      c = mix(c, hor * 0.9, smoothstep(0.0, -0.25, e));
      float s = max(dot(d, normalize(sunDir)), 0.0);
      c += sunCol * (pow(s, 90.0) * 0.5 + pow(s, 7.0) * 0.14) * (1.0 - stars * 0.85);
      if (stars > 0.0) {
        vec3 g = d * 380.0;
        vec3 cell = floor(g);
        float h = h3(cell);
        float r = length(fract(g) - 0.5);
        float st = step(0.993, h) * smoothstep(0.42, 0.0, r) * smoothstep(0.03, 0.3, e);
        c += vec3(0.92, 0.94, 1.0) * st * stars * (0.35 + 0.65 * h3(cell + 7.0));
      }
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});

/** The Himalaya photograph, graded for the time of day and feathered into the sky. */
export const BACKPLATE = () => ({
  uniforms: {
    map: { value: null }, grade: { value: new Color('#fff') }, gradeAmt: { value: 0 }, bright: { value: 1 },
    night: { value: 0 }, haze: { value: 0 }, hazeCol: { value: new Color('#fff') },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D map;
    uniform vec3 grade, hazeCol;
    uniform float gradeAmt, bright, night, haze;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(map, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      vec3 g = mix(c, grade * (l * 1.5 + 0.06), gradeAmt);
      g = mix(g, hazeCol, clamp(haze * (1.25 - smoothstep(0.2, 0.62, vUv.y)), 0.0, 1.0));
      g *= bright;
      float a = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x) * smoothstep(1.0, 0.62, vUv.y);
      gl_FragColor = vec4(g, a);
      #include <colorspace_fragment>
    }`,
});

/** Reflecting pool: the mirrored garden, rippled, mixed with the water tint by a fresnel term. */
export const POOL_REFLECT = {
  name: 'PoolReflect',
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    time: { value: 0 }, tint: { value: new Color('#9DB7BD') },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec3 tint;
    uniform float time;
    varying vec4 vUv;
    varying vec3 vWorld;
    void main() {
      vec2 w = vWorld.xz;
      vec2 rip = vec2(sin(w.y * 2.3 + time * 1.1) + sin(w.x * 3.1 + w.y * 1.3 + time * 0.7),
                      cos(w.y * 1.7 - time * 0.9) + cos(w.x * 2.7 - time * 1.3)) * 0.0008;
      vec4 uvp = vUv;
      uvp.xy += rip * uvp.w;
      vec3 refl = texture2DProj(tDiffuse, uvp).rgb;
      vec3 v = normalize(cameraPosition - vWorld);
      float fres = 0.55 + 0.45 * pow(1.0 - max(v.y, 0.0), 3.0);
      vec3 c = mix(tint * 0.42, refl * 0.96, fres);
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

/** The falling sheet: two scrolling noise layers, foam at the lip and the base. */
export const WATER_FALL = () => ({
  uniforms: withFog({ time: { value: 0 }, night: { value: 0 }, tint: { value: new Color('#9DB7BD') } }),
  vertexShader: /* glsl */`
    #include <fog_pars_vertex>
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader: /* glsl */`
    uniform float time, night;
    uniform vec3 tint;
    varying vec2 vUv;
    #include <fog_pars_fragment>
    ${NOISE}
    void main() {
      float x = vUv.x, y = vUv.y;
      float n1 = noise(vec2(x * 13.0, y * 2.6 + time * 2.1));
      float n2 = noise(vec2(x * 34.0, y * 6.5 + time * 3.6));
      float n3 = noise(vec2(x * 70.0, y * 14.0 + time * 5.0));
      float streak = smoothstep(0.3, 0.95, n1 * 0.55 + n2 * 0.35 + n3 * 0.2);
      float foamTop = smoothstep(0.88, 1.0, y) * (0.7 + 0.3 * n2);
      float foamBot = smoothstep(0.16, 0.0, y) * (0.55 + 0.45 * noise(vec2(x * 22.0, time * 3.0)));
      vec3 deep = mix(tint * 0.75, vec3(0.62, 0.74, 0.78), 0.55) * (1.0 - night * 0.65);
      vec3 white = mix(vec3(0.97, 0.98, 0.99), vec3(0.42, 0.48, 0.62), night);
      vec3 c = mix(deep, white, clamp(streak * 0.8 + foamTop + foamBot, 0.0, 1.0));
      float edge = smoothstep(0.0, 0.16, x) * smoothstep(1.0, 0.84, x);
      float a = edge * (0.55 + streak * 0.45);
      gl_FragColor = vec4(c, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`,
});

/** Plunge pool: rings spreading from the impact, foam where the water lands. */
export const PLUNGE = () => ({
  uniforms: withFog({ time: { value: 0 }, tint: { value: new Color('#9DB7BD') } }),
  vertexShader: WATER_FALL().vertexShader,
  fragmentShader: /* glsl */`
    uniform float time;
    uniform vec3 tint;
    varying vec2 vUv;
    #include <fog_pars_fragment>
    ${NOISE}
    void main() {
      vec2 p = vUv - vec2(0.5, 0.93);
      p.x *= 1.5;
      float d = length(p);
      float rings = (sin(d * 70.0 - time * 4.0) * 0.5 + 0.5) * smoothstep(0.75, 0.05, d);
      float foam = smoothstep(0.26, 0.0, d) * (0.55 + 0.45 * noise(vUv * 34.0 + time * 1.5));
      vec3 base = tint * 0.62 + vec3(0.02, 0.05, 0.05);
      vec3 c = base + rings * 0.05 + foam * 0.55;
      float edge = smoothstep(0.5, 0.42, length(vUv - 0.5));
      gl_FragColor = vec4(c, edge * 0.94);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`,
});

/** Mist rising off the plunge pool. */
export const MIST = () => ({
  uniforms: withFog({ time: { value: 0 }, scale: { value: 800 }, alpha: { value: 0.5 }, tint: { value: new Color('#fff') } }),
  vertexShader: /* glsl */`
    attribute float seed;
    uniform float time, scale, alpha;
    varying float vA;
    #include <fog_pars_vertex>
    void main() {
      float life = fract(time * 0.11 + seed);
      vec3 p = position + vec3(sin(seed * 40.0 + time * 0.3) * 1.6 * life, life * 5.5, life * 3.8);
      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = (1.0 + life * 3.0) * projectionMatrix[1][1] * scale * 0.5 / -mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;
      vA = sin(life * 3.14159) * alpha;
      #include <fog_vertex>
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 tint;
    varying float vA;
    #include <fog_pars_fragment>
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float a = pow(max(0.0, 1.0 - d), 2.0) * vA;
      if (a < 0.004) discard;
      gl_FragColor = vec4(tint, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`,
});

/** Lantern, diya and fairy-light glows (additive). DRIFT makes fireflies. */
export const GLOW = () => ({
  uniforms: { time: { value: 0 }, scale: { value: 800 }, intensity: { value: 0 } },
  vertexShader: /* glsl */`
    attribute float size;
    attribute vec3 color;
    attribute float phase;
    uniform float time, scale, intensity;
    varying vec3 vCol;
    varying float vA;
    void main() {
      vec3 p = position;
      #ifdef DRIFT
        p += vec3(sin(time * 0.4 + phase * 30.0) * 1.4, sin(time * 0.7 + phase * 17.0) * 0.5, cos(time * 0.33 + phase * 23.0) * 1.4);
      #endif
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = clamp(size * projectionMatrix[1][1] * scale * 0.5 / -mv.z, 0.0, 256.0);
      gl_Position = projectionMatrix * mv;
      vCol = color;
      float tw = 0.86 + 0.14 * sin(time * (2.0 + phase * 3.0) + phase * 40.0);
      #ifdef DRIFT
        tw = smoothstep(0.25, 1.0, sin(time * 1.2 + phase * 50.0) * 0.5 + 0.5);
      #endif
      vA = intensity * tw;
    }`,
  fragmentShader: /* glsl */`
    varying vec3 vCol;
    varying float vA;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float core = smoothstep(0.2, 0.0, d);
      float halo = pow(max(0.0, 1.0 - d), 2.4) * 0.6;
      float a = (core + halo) * vA;
      if (a < 0.003) discard;
      gl_FragColor = vec4(mix(vCol, vec3(1.0, 0.96, 0.88), core * 0.7), a);
    }`,
});

/** Blush petals drifting down through the pavilion at the vows. */
export const PETALS = () => ({
  uniforms: { time: { value: 0 }, scale: { value: 800 }, alpha: { value: 0 } },
  vertexShader: /* glsl */`
    attribute float seed;
    uniform float time, scale, alpha;
    varying float vA;
    varying float vSeed;
    varying float vRot;
    void main() {
      float life = fract(time * 0.05 + seed);
      vec3 p = position + vec3(sin(time * 0.8 + seed * 30.0) * 0.7, 9.0 - life * 9.0, cos(time * 0.6 + seed * 20.0) * 0.7);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = 0.11 * projectionMatrix[1][1] * scale * 0.5 / -mv.z;
      gl_Position = projectionMatrix * mv;
      vA = 0.75 * alpha * smoothstep(0.0, 0.08, life) * smoothstep(1.0, 0.9, life);
      vSeed = seed;
      vRot = time * (1.0 + seed * 2.0) + seed * 10.0;
    }`,
  fragmentShader: /* glsl */`
    varying float vA;
    varying float vSeed;
    varying float vRot;
    void main() {
      vec2 p = gl_PointCoord - 0.5;
      float c = cos(vRot), s = sin(vRot);
      p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
      float d = length(p * vec2(1.0, 1.8 + 0.8 * sin(vRot * 0.7))) * 2.0;
      float a = smoothstep(1.0, 0.7, d) * vA;
      if (a < 0.01) discard;
      vec3 col = mix(vec3(0.95, 0.72, 0.68), vec3(0.99, 0.92, 0.88), fract(vSeed * 7.0));
      gl_FragColor = vec4(col * 0.72, a * 0.8);
      #include <colorspace_fragment>
    }`,
});

/** The havan fire, a camera-facing flame. */
export const FLAME = () => ({
  uniforms: { time: { value: 0 }, intensity: { value: 0.6 } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform float time, intensity;
    varying vec2 vUv;
    ${NOISE}
    void main() {
      vec2 uv = vUv;
      float n = noise(vec2(uv.x * 5.0, uv.y * 3.0 - time * 3.2)) * 0.6 + noise(vec2(uv.x * 11.0, uv.y * 6.0 - time * 5.0)) * 0.4;
      float w = 1.0 - uv.y * 0.75;
      float d = length(vec2((uv.x - 0.5) * 2.4 / max(w, 0.05), (uv.y - 0.28) * 1.5));
      float f = smoothstep(1.0, 0.25, d + (n - 0.5) * 0.7 * uv.y);
      vec3 c = mix(vec3(1.0, 0.36, 0.08), vec3(1.0, 0.86, 0.45), smoothstep(0.3, 1.0, f));
      gl_FragColor = vec4(c, f * intensity);
    }`,
});
