// Sarovar's living lake: the painted lake drawn through a small WebGL1 shader that moves only the water. Below the
// painted horizon, layered waves (compressed toward the horizon, like a real plane of water) displace the picture,
// so the pavilion's reflection and the lotus shadows shimmer; tap impulses send out perspective ripple rings; a
// faint glitter runs under the sun. Above the horizon nothing moves. One quad, one texture, DPR capped at 1.5.
// No WebGL (or a lost context) = the plain <img> underneath stays, which is also the reduced-motion picture.

const VS = `attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}`;
const FS = `precision mediump float;
varying vec2 v;
uniform sampler2D uTex;
uniform vec2 uScale;     // screen uv -> image uv (object-fit: cover)
uniform float uHz;       // the painted horizon (image uv y)
uniform float uAsp;      // image aspect w/h
uniform float uT;        // seconds
uniform float uFlow;     // forward travel (the glide)
uniform float uAmp;      // wave strength
uniform vec2 uSun;       // the sun's glitter column (image uv)
uniform vec4 uR0; uniform vec4 uR1; uniform vec4 uR2; uniform vec4 uR3; // ripples: xy image uv, z start, w strength
vec3 ripple(vec2 p, vec4 r){
  if (r.w <= 0.) return vec3(0.);
  float age = uT - r.z;
  if (age < 0. || age > 5.) return vec3(0.);
  float fl = clamp((r.y - uHz) * 2.6, .12, .85);           // the ring lies flat on the water: an ellipse
  vec2 q = vec2((p.x - r.x) * uAsp, (p.y - r.y) / fl);
  float dist = length(q);
  float rad = age * .16;
  float k = dist - rad;
  float env = exp(-k * k * 260.) * exp(-age * .75) * r.w;
  float w = sin(k * 110.) * env;
  vec2 dir = dist > .0001 ? q / dist : vec2(0.);
  return vec3(dir.x / uAsp * w * .006, dir.y * fl * w * .006, w);
}
void main(){
  vec2 p = (v - .5) * uScale + .5;
  float b = p.y - uHz;
  vec2 d = vec2(0.);
  float hl = 0.;
  if (b > 0.) {
    float persp = clamp(b / (1. - uHz), 0., 1.);
    float z = .045 / (b + .02);                                // depth: large near the horizon
    float x = (p.x - .5) * uAsp * z * 6.;
    float fz = z * 5. + uFlow;
    float w1 = sin(fz * 6.2 - uT * 1.25 + sin(x * 1.3 + uT * .35) * 1.1);
    float w2 = sin(fz * 11.5 + x * 2.1 - uT * 1.9);
    float w3 = sin(x * 4.3 - fz * 2.7 + uT * .8);
    float h = w1 * .55 + w2 * .3 + w3 * .15;
    float fade = smoothstep(0., .03, b) * (.2 + persp * .8) * uAmp;
    d = vec2((w3 * .6 + w2 * .4) * .0022, h * .0036) * fade;
    vec3 r = ripple(p, uR0) + ripple(p, uR1) + ripple(p, uR2) + ripple(p, uR3);
    d += r.xy;
    hl += r.z * .10;
    float col = exp(-pow((p.x - uSun.x) * 7., 2.)) * smoothstep(.0, .25, persp) * (1. - persp * .6);
    hl += smoothstep(.62, 1., h) * col * .22 * uAmp;
  }
  vec2 s = p + d;
  if (b > 0.) s.y = max(s.y, uHz + .003);
  vec3 c = texture2D(uTex, clamp(s, .001, .999)).rgb;
  c += hl * vec3(1., .88, .66);
  gl_FragColor = vec4(c, 1.);
}`;

/**
 * createWater(canvas, img, art) → null (no WebGL) or { ripple(sx, sy, strength), setFlow(f), setAmp(a), setArt(img, art),
 * resize(), play(), pause(), screenToImage(sx, sy) }. `art` = { hz, sunX, sunY } in image uv.
 */
export function createWater(canvas, img, art, { onReady } = {}) {
  let gl;
  try { gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' }); } catch { gl = null; }
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = sh(gl.VERTEX_SHADER, VS); const fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;
  const pr = gl.createProgram();
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['uTex', 'uScale', 'uHz', 'uAsp', 'uT', 'uFlow', 'uAmp', 'uSun', 'uR0', 'uR1', 'uR2', 'uR3'].forEach((n) => { U[n] = gl.getUniformLocation(pr, n); });
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let A = art; let ready = false; let raf = 0; let running = false; let lost = false;
  let flow = 0; let amp = 1; const t0 = performance.now();
  const rip = [[0, 0, -99, 0], [0, 0, -99, 0], [0, 0, -99, 0], [0, 0, -99, 0]]; let ri = 0;
  let scale = [1, 1]; let W = 1; let H = 1;
  const now = () => (performance.now() - t0) / 1000;

  function upload(im) {
    try {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      ready = true;
      resize();
      draw();
      onReady?.();
    } catch { ready = false; }
  }
  function setArt(im, a) {
    A = a;
    if (im.complete && im.naturalWidth) upload(im);
    else im.addEventListener('load', () => upload(im), { once: true });
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = canvas.clientWidth || window.innerWidth; H = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    const im = img; const ia = (im.naturalWidth || 16) / (im.naturalHeight || 9); const sa = W / H;
    scale = sa > ia ? [1, ia / sa] : [sa / ia, 1];
  }
  function draw() {
    if (!ready || lost) return;
    const ia = (img.naturalWidth || 16) / (img.naturalHeight || 9);
    gl.uniform1i(U.uTex, 0);
    gl.uniform2f(U.uScale, scale[0], scale[1]);
    gl.uniform1f(U.uHz, A.hz);
    gl.uniform1f(U.uAsp, ia);
    gl.uniform1f(U.uT, now());
    gl.uniform1f(U.uFlow, flow);
    gl.uniform1f(U.uAmp, amp);
    gl.uniform2f(U.uSun, A.sunX, A.sunY);
    rip.forEach((r, i) => gl.uniform4f(U[`uR${i}`], r[0], r[1], r[2], r[3]));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  const loop = () => { if (!running) return; draw(); raf = requestAnimationFrame(loop); };
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; running = false; cancelAnimationFrame(raf); canvas.dispatchEvent(new CustomEvent('sv-lost')); });

  /** a point on screen (px) → image uv */
  const screenToImage = (sx, sy) => [(sx / W - 0.5) * scale[0] + 0.5, (sy / H - 0.5) * scale[1] + 0.5];
  /** image uv → a point on screen (px) */
  const imageToScreen = (u, vv) => [((u - 0.5) / scale[0] + 0.5) * W, ((vv - 0.5) / scale[1] + 0.5) * H];

  setArt(img, art);
  return {
    get ok() { return ready && !lost; },
    ripple(sx, sy, strength = 1) {
      const [u, vv] = screenToImage(sx, sy);
      rip[ri] = [u, vv, now(), strength]; ri = (ri + 1) % 4;
      if (!running) draw();
    },
    setFlow(f) { flow = f; },
    setAmp(a) { amp = a; },
    setArt,
    resize() { resize(); draw(); },
    play() { if (running || lost) return; running = true; raf = requestAnimationFrame(loop); },
    pause() { running = false; cancelAnimationFrame(raf); },
    screenToImage, imageToScreen,
  };
}

/** the same cover mapping without WebGL (the fallback still needs to place the swans on the painted water) */
export function coverMap(img, W, H) {
  const ia = (img.naturalWidth || 9) / (img.naturalHeight || 16); const sa = W / H;
  const scale = sa > ia ? [1, ia / sa] : [sa / ia, 1];
  return {
    toScreen: (u, v) => [((u - 0.5) / scale[0] + 0.5) * W, ((v - 0.5) / scale[1] + 0.5) * H],
    toImage: (x, y) => [(x / W - 0.5) * scale[0] + 0.5, (y / H - 0.5) * scale[1] + 0.5],
  };
}
