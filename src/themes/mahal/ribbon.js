// Mahal · the satin ribbon on the gate, as cloth: chains of points (Verlet integration with length and bending
// constraints) drawn on a canvas as shaded satin strips. At rest it is drawn once; it only simulates while it
// comes undone: a tail is pulled, the loops slip through the knot, the bands swing down from the posts and fall.
// Coordinates are gate units (the gate is 1000 wide); the canvas reaches MARGIN units beyond each side.

const MARGIN = 220;
const G = 1700; // gravity, units / s²
const LIGHT = (-50 * Math.PI) / 180;
const DARK = [196, 172, 128];
const LITE = [255, 253, 246];

function bezierPts(segs, n) {
  // segs: [[x0,y0],[c1],[c2],[x1,y1]] cubic pieces; returns n points evenly by parameter
  const out = [];
  const per = Math.ceil(n / segs.length);
  segs.forEach((s, k) => {
    for (let i = 0; i < per; i++) {
      if (k && !i) continue;
      const t = i / (per - 1);
      const m = 1 - t;
      out.push([
        m * m * m * s[0][0] + 3 * m * m * t * s[1][0] + 3 * m * t * t * s[2][0] + t * t * t * s[3][0],
        m * m * m * s[0][1] + 3 * m * m * t * s[1][1] + 3 * m * t * t * s[2][1] + t * t * t * s[3][1],
      ]);
    }
  });
  return out;
}

function chain(pts, w, kind) {
  const p = pts.map(([x, y]) => ({ x, y, px: x, py: y, pin: null }));
  const len = []; const len2 = [];
  for (let i = 0; i < p.length - 1; i++) len.push(Math.hypot(p[i + 1].x - p[i].x, p[i + 1].y - p[i].y));
  for (let i = 0; i < p.length - 2; i++) len2.push(Math.hypot(p[i + 2].x - p[i].x, p[i + 2].y - p[i].y));
  return { p, len, len0: len.slice(), len2, w, kind };
}

export function createRibbon(canvas) {
  const ctx = canvas.getContext('2d');
  let C = []; let geo = null; let raf = 0; let last = 0; let acc = 0;
  let pullP = 0; let knotA = 1; let alpha = 1; let phase = 'rest'; let t0 = 0;
  const S = {};

  function layout(o) {
    // o: { gw, H, u, K: [x, y] (units), ax, ay, k (bow scale) }
    geo = o;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const wu = 1000 + 2 * MARGIN;
    canvas.style.left = `${-MARGIN * o.u}px`;
    canvas.style.width = `${wu * o.u}px`;
    canvas.style.height = `${o.H}px`;
    canvas.width = Math.round(wu * o.u * dpr);
    canvas.height = Math.round(o.H * dpr);
    S.scale = o.u * dpr;
    const [kx, ky] = o.K; const k = o.k;
    const B = (x, y) => [kx + (x - 300) * k, ky + (y - 200) * k];
    const line = (a, b, n) => Array.from({ length: n }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / (n - 1), a[1] + ((b[1] - a[1]) * i) / (n - 1)]);
    const loopL = [[B(300, 200), B(246, 118), B(128, 52), B(64, 104)], [B(64, 104), B(14, 146), B(34, 246), B(106, 262)], [B(106, 262), B(178, 280), B(252, 236), B(300, 200)]];
    const mirror = (segs) => segs.map((s) => s.map(([x, y]) => [2 * kx - x, y]));
    const tailL = [[B(292, 214), B(268, 290), B(232, 372), B(196, 476)]];
    C = [
      chain(line([o.ax, o.ay], [kx - 6, ky], 30), 52 * k / 0.8, 'band'),
      chain(line([1000 - o.ax, o.ay], [kx + 6, ky], 30), 52 * k / 0.8, 'band'),
      chain(bezierPts(tailL, 22), 46 * k / 0.8, 'tail'),
      chain(bezierPts(mirror(tailL), 22), 46 * k / 0.8, 'tail'),
      chain(bezierPts(loopL, 60), 78 * k / 0.8, 'loop'),
      chain(bezierPts(mirror(loopL), 60), 78 * k / 0.8, 'loop'),
    ];
    // pins: posts and the knot hold everything at rest (with a painted bow, only the two bands are cloth)
    const pinAt = (c, i) => { c.p[i].pin = [c.p[i].x, c.p[i].y]; };
    pinAt(C[0], 0); pinAt(C[0], 29); pinAt(C[1], 0); pinAt(C[1], 29);
    if (o.bandsOnly) C = C.slice(0, 2);
    else {
      pinAt(C[2], 0); pinAt(C[3], 0);
      pinAt(C[4], 0); pinAt(C[4], C[4].p.length - 1); pinAt(C[5], 0); pinAt(C[5], C[5].p.length - 1);
      S.tailEnd = { x: C[3].p.at(-1).x, y: C[3].p.at(-1).y };
    }
    phase = 'rest'; pullP = 0; knotA = 1; alpha = 1;
    draw();
  }

  // ───────── simulation ─────────
  function step(dt) {
    const g = G * dt * dt;
    for (const c of C) {
      for (const q of c.p) {
        if (q.pin) continue;
        const vx = (q.x - q.px) * 0.985; const vy = (q.y - q.py) * 0.985;
        q.px = q.x; q.py = q.y;
        q.x += vx + Math.sin(t0 * 1.7 + q.y * 0.01) * 0.04; q.y += vy + g;
      }
    }
    for (let it = 0; it < 10; it++) {
      for (const c of C) {
        const P = c.p;
        for (let i = 0; i < P.length - 1; i++) solve(P[i], P[i + 1], c.len[i], 1);
        for (let i = 0; i < P.length - 2; i++) solve(P[i], P[i + 2], c.len2[i] * (c.len[i] / c.len0[i]), c.kind === 'band' ? 0.12 : 0.22);
        for (const q of P) if (q.pin) { q.x = q.pin[0]; q.y = q.pin[1]; }
      }
    }
  }
  function solve(a, b, rest, k) {
    const dx = b.x - a.x; const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    const diff = ((d - rest) / d) * 0.5 * k;
    const ax = a.pin ? 0 : b.pin ? 2 : 1; const bx = b.pin ? 0 : a.pin ? 2 : 1;
    a.x += dx * diff * ax; a.y += dy * diff * ax;
    b.x -= dx * diff * bx; b.y -= dy * diff * bx;
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now; acc += dt; t0 += dt;
    while (acc >= 1 / 120) { step(1 / 120); acc -= 1 / 120; }
    if (phase === 'released' || phase === 'dropped') knotA = Math.max(0, knotA - dt * 7);
    if (phase === 'dropped') alpha = Math.max(0, alpha - dt * 0.7);
    draw();
    const gone = alpha <= 0 || C.every((c) => c.p.every((q) => q.y > geo.H / geo.u + 80));
    if (gone) { stop(); ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (raf || !geo) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  /** p 0..1: the right tail is pulled down and out; the loops shorten through the knot. */
  function pull(p) {
    start();
    if (geo.bandsOnly) return;
    phase = 'pull'; pullP = p;
    const lt = C[3];
    const e = lt.p.at(-1);
    e.pin = [S.tailEnd.x + p * 150, S.tailEnd.y + p * 120];
    for (const c of [C[4], C[5]]) c.len = c.len0.map((l) => l * (1 - 0.92 * p));
    lt.len = lt.len0.map((l) => l * (1 + 0.5 * p));
  }
  /** the knot gives: everything held there comes loose; the bands keep hanging from the posts */
  function release() {
    start();
    phase = 'released';
    for (const c of C) {
      for (let i = 0; i < c.p.length; i++) {
        const q = c.p[i];
        const post = c.kind === 'band' && i === 0;
        if (!post) q.pin = null;
      }
    }
    // a little kick: the freed ends spring apart and down
    const kick = (q, vx, vy) => { q.px = q.x - vx; q.py = q.y - vy; };
    kick(C[0].p.at(-1), -3, 1); kick(C[1].p.at(-1), 3, 1);
    if (C[3]) kick(C[3].p.at(-1), 4, 2);
  }
  /** the bands slip off the posts and everything falls away */
  function drop() {
    start();
    phase = 'dropped';
    for (const c of C) for (const q of c.p) q.pin = null;
  }

  // ───────── drawing: shaded satin strips ─────────
  function strip(c, shadow) {
    const P = c.p; const n = P.length; const hw = c.w / 2;
    const L = []; const R = []; const ang = []; const HW = [];
    // gathered where it meets the knot: loops pinch at both ends, tails at the top, bands at their inner end
    const prof = (t) => {
      if (c.kind === 'loop') return 0.32 + 0.68 * Math.sin(Math.PI * t) ** 0.55;
      if (c.kind === 'tail') return 0.42 + 0.58 * Math.min(1, t / 0.28) ** 0.7;
      const e = Math.min(1, Math.max(0, (t - 0.82) / 0.18));
      return 1 - 0.5 * e * e * (3 - 2 * e);
    };
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 2)]; const b = P[Math.min(n - 1, i + 2)];
      let dx = b.x - a.x; let dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      ang.push(Math.atan2(dy, dx));
      const h2 = hw * prof(i / (n - 1)); HW.push(h2);
      L.push([P[i].x - dy * h2, P[i].y + dx * h2]);
      R.push([P[i].x + dy * h2, P[i].y - dx * h2]);
    }
    // the outline (a V-cut at the end of a tail)
    const outline = () => {
      ctx.beginPath();
      L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (c.kind === 'tail') { const q = P[n - 1]; const a = ang[n - 1]; ctx.lineTo(q.x - Math.cos(a) * hw * 0.8, q.y - Math.sin(a) * hw * 0.8); }
      for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
      ctx.closePath();
    };
    if (shadow) { ctx.save(); ctx.translate(6, 11); outline(); ctx.fill(); ctx.restore(); return; }
    if (c.kind === 'loop' && phase !== 'released' && phase !== 'dropped') {
      // the inside of the loop: the back of the satin, in soft shadow, so the loop reads full and puffy
      ctx.beginPath(); P.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath();
      const [x0, y0] = [P[0].x, P[0].y]; const m = P[Math.floor(n / 2)];
      const gi = ctx.createLinearGradient(x0, y0, m.x, m.y);
      gi.addColorStop(0, 'rgba(176,150,108,0.95)'); gi.addColorStop(1, 'rgba(226,210,180,0.9)');
      ctx.fillStyle = gi; ctx.fill();
    }
    outline();
    ctx.fillStyle = '#EEE3CC';
    ctx.fill();
    ctx.save();
    ctx.clip();
    // light and shade along the length (the fabric turning toward and away from the light); smooth, no seams
    ctx.lineCap = 'round';
    ctx.lineWidth = c.w * 1.1;
    for (let i = 0; i < n - 1; i++) {
      let s = 0.5 + 0.5 * Math.cos(ang[i] - LIGHT);
      const da = Math.abs(Math.atan2(Math.sin(ang[Math.min(n - 1, i + 1)] - ang[i]), Math.cos(ang[Math.min(n - 1, i + 1)] - ang[i])));
      s = Math.max(0.2, Math.min(1, s - da * 1.4));
      ctx.strokeStyle = s > 0.5 ? `rgba(255,255,252,${((s - 0.5) * 1.5).toFixed(3)})` : `rgba(122,92,48,${((0.5 - s) * 0.55).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(P[i].x, P[i].y); ctx.lineTo(P[i + 1].x, P[i + 1].y); ctx.stroke();
    }
    // across the width: soft shade at both edges, a satin sheen just off the centre
    const line = (pts, off) => { ctx.beginPath(); pts.forEach((q, i) => { const o = off * HW[i]; const x = q.x + Math.cos(ang[i] - Math.PI / 2) * o; const y = q.y + Math.sin(ang[i] - Math.PI / 2) * o; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); };
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(120,90,46,0.16)'; ctx.lineWidth = c.w * 0.26;
    line(P, 1); ctx.stroke(); line(P, -1); ctx.stroke();
    // soft folds running along the satin, and the sheen between them
    ctx.strokeStyle = 'rgba(120,90,46,0.14)'; ctx.lineWidth = c.w * 0.06;
    line(P, -0.42); ctx.stroke(); line(P, 0.62); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = c.w * 0.2;
    line(P, 0.25); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = c.w * 0.06;
    line(P, 0.25); ctx.stroke();
    ctx.restore();
    outline();
    ctx.strokeStyle = 'rgba(150,120,80,0.32)'; ctx.lineWidth = 1; ctx.stroke();
  }

  function draw() {
    if (!geo) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(S.scale, 0, 0, S.scale, MARGIN * S.scale, 0);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(30,14,0,0.2)';
    for (const c of C) strip(c, true);
    // (each quad is also stroked in its own colour, so neighbouring quads never show a hairline seam)
    for (const c of C) strip(c, false);
    if (knotA > 0 && !geo.bandsOnly) {
      // the knot: a wrap of the same satin, gathered, with two soft creases
      const [kx, ky] = geo.K; const k = geo.k * (1 - pullP * 0.2);
      ctx.globalAlpha = alpha * knotA;
      const w = 64 * k; const h = 78 * k;
      const gr = ctx.createLinearGradient(kx - w / 2, 0, kx + w / 2, 0);
      gr.addColorStop(0, '#C9B088'); gr.addColorStop(0.3, '#FFFDF7'); gr.addColorStop(0.62, '#EDE0C6'); gr.addColorStop(1, '#B89C70');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(kx - w / 2, ky - h / 2 + 8 * k);
      ctx.quadraticCurveTo(kx, ky - h / 2 - 6 * k, kx + w / 2, ky - h / 2 + 8 * k);
      ctx.quadraticCurveTo(kx + w / 2 + 6 * k, ky, kx + w / 2, ky + h / 2 - 8 * k);
      ctx.quadraticCurveTo(kx, ky + h / 2 + 6 * k, kx - w / 2, ky + h / 2 - 8 * k);
      ctx.quadraticCurveTo(kx - w / 2 - 6 * k, ky, kx - w / 2, ky - h / 2 + 8 * k);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(140,108,64,0.7)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.strokeStyle = 'rgba(130,98,54,0.35)'; ctx.lineWidth = 3 * k;
      ctx.beginPath(); ctx.moveTo(kx - w * 0.22, ky - h * 0.36); ctx.quadraticCurveTo(kx - w * 0.3, ky, kx - w * 0.18, ky + h * 0.38);
      ctx.moveTo(kx + w * 0.2, ky - h * 0.36); ctx.quadraticCurveTo(kx + w * 0.28, ky, kx + w * 0.16, ky + h * 0.38); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  return { layout, pull, release, drop, stop, draw, get running() { return !!raf; } };
}
