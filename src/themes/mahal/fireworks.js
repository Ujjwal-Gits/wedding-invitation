// Mahal · fireworks over the palace. A canvas of additive sparks with fading trails: rockets rise with a
// spark trail and burst (peony rings, gold willows, glittering crossettes) in gold, rose and ivory.
// It only runs while the balcony is on screen and the tab is visible; nothing at all under reduced motion.

const COLS = [[255, 214, 120], [255, 236, 190], [255, 150, 170], [255, 190, 90], [250, 120, 150], [255, 250, 235]];

export function createFireworks(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0; let H = 0; let dpr = 1; let k = 1;
  let parts = []; let rockets = []; let raf = 0; let last = 0;
  let auto = false; let visible = true; let nextAt = 0; let zone = null;
  const R = (a, b) => a + Math.random() * (b - a);

  function size(w, h, z) {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = w; H = h; zone = z; k = Math.min(w, h) / 800;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  }

  function burst(x, y, kind) {
    const col = COLS[Math.floor(R(0, COLS.length))];
    const alt = COLS[Math.floor(R(0, COLS.length))];
    const n = kind === 'willow' ? 70 : 90;
    const sp = (kind === 'willow' ? 160 : 220) * k + 80;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R(-0.04, 0.04);
      const v = sp * (kind === 'ring' ? 1 : R(0.45, 1));
      parts.push({
        x, y, px: x, py: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0, max: kind === 'willow' ? R(2.2, 3) : R(1.3, 2), col: kind === 'willow' ? [255, 200, 110] : (i % 3 ? col : alt),
        g: kind === 'willow' ? 70 : 55, drag: kind === 'willow' ? 0.975 : 0.965, glit: kind === 'glitter' || Math.random() < 0.15,
        w: kind === 'willow' ? 1.6 : 2.1,
      });
    }
    // the flash at the centre
    parts.push({ x, y, px: x, py: y, vx: 0, vy: 0, life: 0, max: 0.25, col: [255, 250, 230], g: 0, drag: 1, flash: 60 * k + 30, w: 0 });
  }

  function launch(x, y, kind) {
    const sx = x + R(-30, 30) * k; const sy = zone.base;
    const t = R(0.9, 1.25);
    rockets.push({ x: sx, y: sy, px: sx, py: sy, tx: x, ty: y, t: 0, dur: t, kind });
    start();
  }

  function pick() {
    const { x0, x1, y0, y1, avoid } = zone;
    let x;
    for (let i = 0; i < 8; i++) { x = R(x0, x1); if (!avoid || Math.abs(x - avoid[0]) > avoid[1]) break; }
    return [x, R(y0, y1)];
  }
  const kinds = ['peony', 'willow', 'peony', 'ring', 'glitter'];
  function salvo(n = 4) {
    for (let i = 0; i < n; i++) setTimeout(() => { const [x, y] = pick(); launch(x, y, kinds[i % kinds.length]); }, i * R(260, 420));
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // fade what was drawn: trails
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.t += dt;
      const p = Math.min(1, r.t / r.dur); const e = 1 - (1 - p) ** 2.4;
      r.px = r.x; r.py = r.y;
      r.x = r.x + (r.tx - r.x) * 0.12; r.y = zone.base + (r.ty - zone.base) * e;
      ctx.strokeStyle = 'rgba(255,220,150,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(r.px, r.py); ctx.lineTo(r.x, r.y); ctx.stroke();
      if (Math.random() < 0.6) parts.push({ x: r.x, y: r.y, px: r.x, py: r.y, vx: R(-15, 15), vy: R(10, 40), life: 0, max: R(0.3, 0.6), col: [255, 200, 120], g: 40, drag: 0.95, w: 1.2 });
      if (p >= 1) { burst(r.tx, r.ty, r.kind); rockets.splice(i, 1); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.life += dt;
      if (q.life >= q.max) { parts.splice(i, 1); continue; }
      const f = 1 - q.life / q.max;
      if (q.flash) {
        const gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.flash);
        gr.addColorStop(0, `rgba(255,248,225,${0.55 * f})`); gr.addColorStop(1, 'rgba(255,220,160,0)');
        ctx.fillStyle = gr; ctx.fillRect(q.x - q.flash, q.y - q.flash, q.flash * 2, q.flash * 2);
        continue;
      }
      q.px = q.x; q.py = q.y;
      q.vx *= q.drag; q.vy = q.vy * q.drag + q.g * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      let a = Math.min(1, f * 1.4);
      if (q.glit && Math.random() < 0.35) a *= 0.2;
      ctx.strokeStyle = `rgba(${q.col[0]},${q.col[1]},${q.col[2]},${a})`;
      ctx.lineWidth = q.w;
      ctx.beginPath(); ctx.moveTo(q.px, q.py); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    if (auto && visible && now > nextAt) {
      nextAt = now + R(1600, 3400);
      const [x, y] = pick(); launch(x, y, kinds[Math.floor(R(0, kinds.length))]);
    }
    if (!parts.length && !rockets.length && !(auto && visible)) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      raf = 0; return;
    }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (raf) return; last = performance.now(); raf = requestAnimationFrame(frame); }

  return {
    size,
    salvo,
    /** keep launching every couple of seconds (only while visible) */
    play() { auto = true; nextAt = performance.now() + 2600; start(); },
    setVisible(v) { visible = v; if (v && auto) start(); },
  };
}
