// Himal · the dawn plate. One real photograph (Machhapuchhre before sunrise)
// rendered in raw WebGL so the light can be painted *into* it:
//   rise   0 → 1  the sun comes up: blue-hour grade warms, crepuscular rays grow
//                 out from behind the peak and a band of first light sweeps across
//   scroll 0 → 1  the camera lifts: the depth map separates ridge, peak and sky
//   mist   0 → 1  valley mist rises and dissolves the photo into the snow page
// Transform/opacity-free by design: everything happens on one canvas, one draw call.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uImg;
uniform sampler2D uDepth;
uniform vec2 uRes;
uniform float uIA;
uniform vec2 uFocal;
uniform vec2 uSun;
uniform float uT;
uniform float uRise;
uniform float uScroll;
uniform float uMist;
uniform float uHasDepth;
uniform vec2 uPtr;
uniform vec3 uSnow;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  float ca = uRes.x / uRes.y;
  vec2 sc = ca > uIA ? vec2(1.0, uIA / ca) : vec2(ca / uIA, 1.0);
  sc *= 0.95;                                    // headroom for the parallax
  vec2 c = clamp(uFocal, sc * 0.5, 1.0 - sc * 0.5);
  vec2 uv = c + (vUv - 0.5) * sc;

  // Depth parallax: lifting the camera lowers the near ridge more than the peak.
  vec2 off = vec2(uPtr.x * 0.010, uPtr.y * 0.006 + uScroll * 0.055);
  float d = texture2D(uDepth, uv).r * uHasDepth;
  d = texture2D(uDepth, uv + off * d).r * uHasDepth;
  vec2 puv = uv + off * d;
  puv = c + (puv - c) * (1.0 - 0.025 * uRise * d);   // the faintest dolly toward the ridge
  vec3 col = texture2D(uImg, puv).rgb;

  // Blue hour: cool, low, half-desaturated.
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 night = mix(vec3(lum), col, 0.5) * vec3(0.52, 0.64, 0.96) * 0.46;

  // Sun geometry (image space, aspect-correct).
  vec2 v = (puv - uSun) * vec2(uIA, 1.0);
  float len = length(v);
  float ang = atan(v.y, v.x);
  float sky = uHasDepth > 0.5 ? 1.0 - smoothstep(0.05, 0.16, d) : smoothstep(uSun.y - 0.04, uSun.y + 0.06, puv.y);
  float above = smoothstep(-0.03, 0.06, v.y);

  // Soft crepuscular rays, low and wide, blended (screen) into the photo's own.
  float rays = 0.5 + 0.5 * sin(ang * 13.0 + sin(ang * 5.0 + uT * 0.07) * 2.2 + uT * 0.03);
  rays *= 0.6 + 0.4 * sin(ang * 29.0 - uT * 0.045 + 1.3);
  rays = smoothstep(0.15, 1.0, rays);
  float reach = 1.0 - smoothstep(uRise * 1.5 - 0.5, uRise * 1.5, len);
  float glow = exp(-len * 3.2);
  vec3 warm = vec3(1.0, 0.78, 0.55);
  float settle = 1.0 - 0.45 * smoothstep(0.75, 1.0, uRise);   // brightest mid-sunrise, then calmer

  vec3 lit = col * (0.94 + 0.08 * uRise);
  vec3 add = warm * (rays * 0.11 * exp(-len * 1.7) + glow * 0.2) * reach * above * sky * uRise * settle;
  lit = 1.0 - (1.0 - lit) * (1.0 - add);

  // First light: a soft band crossing the scene once, catching the far peaks.
  float sx = mix(-0.45, 1.45, smoothstep(0.08, 1.0, uRise));
  float band = exp(-pow((puv.x - sx) * 2.2, 2.0));
  float below = texture2D(uDepth, puv - vec2(0.0, 0.006)).r * uHasDepth;   // near ridge just under? then this is its edge
  float peaks = smoothstep(0.1, 0.22, d) * (1.0 - smoothstep(0.3, 0.42, d)) * (1.0 - smoothstep(0.42, 0.6, below));
  lit = 1.0 - (1.0 - lit) * (1.0 - warm * band * (0.08 * sky + 0.3 * peaks) * (1.0 - 0.8 * smoothstep(0.85, 1.0, uRise)));

  vec3 outc = mix(night, lit, smoothstep(0.0, 0.8, uRise));

  // Vignette (before the mist so the snow stays clean).
  vec2 q = (vUv - 0.5) * vec2(ca, 1.0);
  outc *= mix(0.86, 1.0, smoothstep(1.15, 0.3, length(q)));
  outc += (hash(vUv * uRes + fract(uT)) - 0.5) * 0.016;

  // Valley mist rising on scroll.
  float n = fbm(vec2(vUv.x * 2.2 + uT * 0.012, vUv.y * 3.4 - uT * 0.008));
  float m = uMist * 1.65 - 0.25 - vUv.y * 0.9 + (n - 0.5) * 0.42 + d * 0.12 * uMist;
  float fog = smoothstep(0.0, 0.25, m);
  outc = mix(outc, uSnow, fog);

  gl_FragColor = vec4(outc, 1.0);
}`;

const loadImage = (src) =>
  new Promise((res, rej) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{src:string, depth?:string, focal?:[number,number], sun?:[number,number], snow?:[number,number,number]}} opts
 *   focal/sun are in image coordinates from the top-left (0..1).
 */
export function createDawn(canvas, { src, depth = '', focal = [0.5, 0.5], sun = [0.48, 0.64], snow = [1, 1, 1] }) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  if (!gl) return null;

  const sh = (type, code) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, code);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.warn('[himal] dawn shader failed', err);
    return null;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uImg', 'uDepth', 'uRes', 'uIA', 'uFocal', 'uSun', 'uT', 'uRise', 'uScroll', 'uMist', 'uHasDepth', 'uPtr', 'uSnow'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  const texFrom = (unit, img) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    return t;
  };

  const state = { rise: 0, scroll: 0, mist: 0, px: 0, py: 0, tx: 0, ty: 0 };
  let ia = 1.5;
  let hasDepth = 0;
  let running = false;
  let raf = 0;
  let t0 = performance.now();
  let loaded = false;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.25 : 1.6);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const draw = (now = performance.now()) => {
    if (!loaded) return;
    resize();
    state.px += (state.tx - state.px) * 0.04;
    state.py += (state.ty - state.py) * 0.04;
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uIA, ia);
    gl.uniform2f(U.uFocal, focal[0], 1 - focal[1]);
    gl.uniform2f(U.uSun, sun[0], 1 - sun[1]);
    gl.uniform1f(U.uT, (now - t0) / 1000);
    gl.uniform1f(U.uRise, state.rise);
    gl.uniform1f(U.uScroll, state.scroll);
    gl.uniform1f(U.uMist, state.mist);
    gl.uniform1f(U.uHasDepth, hasDepth);
    gl.uniform2f(U.uPtr, state.px, state.py);
    gl.uniform3f(U.uSnow, snow[0], snow[1], snow[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const loop = (now) => {
    if (!running) return;
    draw(now);
    raf = requestAnimationFrame(loop);
  };

  const ready = Promise.all([loadImage(src), depth ? loadImage(depth).catch(() => null) : Promise.resolve(null)]).then(([img, dimg]) => {
    ia = img.naturalWidth / img.naturalHeight;
    gl.useProgram(prog);
    texFrom(0, img);
    gl.uniform1i(U.uImg, 0);
    if (dimg) { texFrom(1, dimg); hasDepth = 1; } else {
      // 1×1 black depth so the sampler is always bound.
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0]));
    }
    gl.uniform1i(U.uDepth, 1);
    loaded = true;
    draw();
  });

  return {
    state,
    ready,
    /** Pointer in -1..1 (desktop only). */
    pointer(x, y) { state.tx = x; state.ty = y; },
    set(patch) { Object.assign(state, patch); if (!running) draw(); },
    start() { if (running) return; running = true; t0 = t0 || performance.now(); raf = requestAnimationFrame(loop); },
    stop() { running = false; cancelAnimationFrame(raf); },
    draw,
    get running() { return running; },
  };
}
