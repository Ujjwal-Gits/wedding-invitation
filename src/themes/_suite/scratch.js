// Scratch to reveal (canvas, pointer and touch; reveals at 60% cleared; a button for keyboard, screen readers and
// reduced motion). Markup comes from ctx.parts.scratch(face): <div data-scratch> .su-scratch__face, canvas, button.
// Each theme paints its own cover with `paint(ctx2d, w, h, dpr, hint)`; the default is gold foil.
import { gsap } from 'gsap';

export function goldFoil(stops = [[0, '#B9862E'], [0.18, '#F3D58A'], [0.36, '#C9963F'], [0.52, '#FCEDB9'], [0.7, '#B57E22'], [0.86, '#E8C26B'], [1, '#9C6A1E']], ink = '#5C3A08', font = "600 {s}px Georgia, serif") {
  return (ctx, w, h, dpr, hint) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < (w * h) / 900; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,248,220,.3)' : 'rgba(80,50,10,.14)';
      ctx.fillRect(Math.random() * w, Math.random() * h, dpr, dpr);
    }
    const size = Math.round(Math.min(w / 13, 28 * dpr));
    ctx.font = font.replace('{s}', size);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillText(hint, w / 2 + dpr, h / 2 + dpr);
    ctx.fillStyle = ink; ctx.fillText(hint, w / 2, h / 2);
  };
}

export function initScratch(wrap, { paint = goldFoil(), hint = () => 'Scratch to reveal', reduced = false, onReveal } = {}) {
  const cv = wrap.querySelector('canvas');
  const btn = wrap.querySelector('.su-scratch__btn');
  const face = wrap.querySelector('.su-scratch__face');
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  let revealed = false; let drawn = false; let moves = 0; let last = null; let dpr = 1; let base = 0;
  function draw() {
    if (revealed) return;
    // layout size, not the on-screen box: the card may sit in a panel turned or scaled in 3D
    const w = cv.offsetWidth; const h = cv.offsetHeight;
    if (!w) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.globalCompositeOperation = 'source-over';
    paint(ctx, cv.width, cv.height, dpr, hint());
    drawn = true; moves = 0;
    base = 0; base = cleared(); // a cover that is not a full rectangle (an oval, a coin) starts partly clear
  }
  function cleared() {
    const { width: w, height: h } = cv;
    const step = Math.max(4, Math.round(8 * dpr));
    const data = ctx.getImageData(0, 0, w, h).data;
    let n = 0; let z = 0;
    for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) { n++; if (data[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] < 40) z++; }
    return n ? z / n : 0;
  }
  /** how much of the painted cover has been scratched away (0..1) */
  const done = () => (base >= 1 ? 1 : (cleared() - base) / (1 - base));
  function reveal() {
    if (revealed) return;
    revealed = true;
    wrap.classList.add('is-revealed');
    if (btn) btn.hidden = true;
    gsap.to(cv, { opacity: 0, duration: reduced ? 0.01 : 0.6, ease: 'power1.out', onComplete: () => { cv.hidden = true; } });
    if (!reduced && face) gsap.fromTo(face, { scale: 0.97 }, { scale: 1, duration: 0.6, ease: 'power3.out' });
    onReveal?.(wrap);
  }
  // map the finger from the on-screen box (which may be scaled) to the canvas pixels
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (cv.width / (r.width || 1)), (e.clientY - r.top) * (cv.height / (r.height || 1))]; };
  function scratch(e) {
    if (revealed || !drawn) return;
    const [x, y] = pos(e);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // a cover painter may leave a translucent or shadowed stroke behind; the eraser must always be opaque
    ctx.strokeStyle = '#000'; ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.filter = 'none';
    ctx.lineWidth = Math.max(34, Math.min(56, cv.width / dpr / 9)) * dpr;
    ctx.beginPath();
    if (last) ctx.moveTo(last[0], last[1]); else ctx.moveTo(x - 0.1, y);
    ctx.lineTo(x, y); ctx.stroke();
    last = [x, y];
    if (++moves % 6 === 0 && done() >= 0.6) reveal();
  }
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', (e) => { if (revealed) return; e.preventDefault(); cv.setPointerCapture?.(e.pointerId); last = null; wrap.classList.add('is-scratching'); scratch(e); });
  cv.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch' || e.pressure > 0) { if (cv.hasPointerCapture?.(e.pointerId) || e.buttons) scratch(e); } });
  const up = () => { last = null; if (!revealed && drawn && done() >= 0.6) reveal(); };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  btn?.addEventListener('click', reveal);
  document.fonts?.ready.then(draw);
  draw();
  let rw = 0;
  new ResizeObserver(() => { const w = cv.offsetWidth; if (w && Math.abs(w - rw) > 1) { rw = w; draw(); } }).observe(cv);
  document.addEventListener('langchange', () => { if (!revealed) draw(); });
  // a theme whose cover uses a picture asks for a redraw once the picture has loaded
  document.addEventListener('su-scratch-redraw', () => { if (!revealed) draw(); });
  return { reveal, cleared: done, isRevealed: () => revealed, redraw: draw };
}
