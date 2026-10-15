// Laali's pieces, shared by its own page (main.js) and by its gate and hero modules (gate.js, hero.js), which can run
// on another theme's page (docs/MIX.md). Markup builders take the same ctx the suite engine passes to T.gate/T.hero.
import { flame } from '../_suite/nepali.js';

export const A = '/themes/laali/art/';
export const art = {
  lantern: `${A}lantern-sm.webp`, lanternLg: `${A}lantern.webp`,
  flowers: `${A}flowers-sm.webp`, flowersLg: `${A}flowers.webp`,
  couple: `${A}couple-sm.webp`, coupleLg: `${A}couple.webp`,
};
export const r1 = (n) => Math.round(n * 10) / 10;

// ───────── the arch: an ogee outer line and a cusped (multifoil) inner line, drawn from the crown down ─────────
export function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
}
/** the left half of an arch inset by m in a W×H box, as cubic segments from the crown to the shoulder */
export function archCurve(W, H, m, k) {
  const cx = W / 2; const R = cx - m; const top = m; const ys = top + R * k;
  const segs = [
    [[cx, top], [cx - 0.03 * R, top + 0.1 * R], [cx - 0.1 * R, top + 0.2 * R], [cx - 0.26 * R, top + 0.3 * R]],
    [[cx - 0.26 * R, top + 0.3 * R], [cx - 0.62 * R, top + 0.52 * R], [m, ys - 0.62 * R * k], [m, ys]],
  ];
  return { cx, R, top, ys, segs };
}
export const mirror = (d, W) => d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (s, x, y) => `${r1(W - Number(x))},${y}`);

export function archPaths(W, H, { m1, m2, k, corner = 10, lobe = 20 }) {
  // outer: a smooth ogee
  const o = archCurve(W, H, m1, k);
  const [a, b] = o.segs;
  const outer = `M${r1(a[0][0])},${r1(a[0][1])} C${a.slice(1).map((p) => `${r1(p[0])},${r1(p[1])}`).join(' ')} C${b.slice(1).map((p) => `${r1(p[0])},${r1(p[1])}`).join(' ')}`
    + ` L${r1(m1)},${r1(H - m1 - corner)} Q${r1(m1)},${r1(H - m1)} ${r1(m1 + corner)},${r1(H - m1)} L${r1(o.cx)},${r1(H - m1)}`;
  // inner: the same curve, cusped into lobes that bulge outward
  const n = archCurve(W, H, m2, k);
  const pts = [];
  n.segs.forEach((s, i) => { for (let j = i ? 1 : 0; j <= 60; j++) pts.push(bez(...s, j / 60)); });
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1];
  const N = Math.max(5, Math.round(L / lobe));
  let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
  let prev = pts[0]; let k2 = 0;
  for (let q = 1; q <= N; q++) {
    const want = (L * q) / N;
    while (k2 < cum.length - 1 && cum[k2 + 1] < want) k2++;
    const f = (want - cum[k2]) / ((cum[k2 + 1] ?? cum[k2]) - cum[k2] || 1);
    const p = q === N ? pts[pts.length - 1] : [pts[k2][0] + (pts[k2 + 1][0] - pts[k2][0]) * f, pts[k2][1] + (pts[k2 + 1][1] - pts[k2][1]) * f];
    const r = Math.hypot(p[0] - prev[0], p[1] - prev[1]) * 0.6;
    d += ` A${r1(r)},${r1(r)} 0 0 0 ${r1(p[0])},${r1(p[1])}`;
    prev = p;
  }
  d += ` L${r1(m2)},${r1(H - m2 - corner * 0.6)} Q${r1(m2)},${r1(H - m2)} ${r1(m2 + corner * 0.6)},${r1(H - m2)} L${r1(n.cx)},${r1(H - m2)}`;
  // the crown finial: a small drop above the apex
  const fy = o.top; const fs = Math.max(4, m1 * 0.42);
  const finial = `M${r1(o.cx)},${r1(fy - fs * 1.9)} C${r1(o.cx + fs * 0.9)},${r1(fy - fs * 0.8)} ${r1(o.cx + fs * 0.5)},${r1(fy - fs * 0.1)} ${r1(o.cx)},${r1(fy)} C${r1(o.cx - fs * 0.5)},${r1(fy - fs * 0.1)} ${r1(o.cx - fs * 0.9)},${r1(fy - fs * 0.8)} ${r1(o.cx)},${r1(fy - fs * 1.9)}Z`;
  return { outer, outerR: mirror(outer, W), inner: d, innerR: mirror(d, W).replace(/ 0 0 0 /g, ' 0 0 1 '), finial, top: o.top, R: o.R, ys: o.ys };
}
// A-commands have flags; mirror() would mangle "r,r" pairs, so the radius pair is restored after mirroring
export function svgArch(W, H, opts) {
  const p = archPaths(W, H, opts);
  const fixR = (dR, dL) => {
    const radii = [...dL.matchAll(/A([\d.]+),([\d.]+)/g)].map((m) => `A${m[1]},${m[2]}`);
    let i = 0;
    return dR.replace(/A[\d.-]+,[\d.-]+/g, () => radii[i++]);
  };
  const innerR = fixR(p.innerR, p.inner);
  return { ...p, innerR, html: `
    <path class="la-ln la-ln--o" pathLength="1" stroke-dasharray="1 1" d="${p.outer}"/><path class="la-ln la-ln--o" pathLength="1" stroke-dasharray="1 1" d="${p.outerR}"/>
    <path class="la-ln la-ln--i" pathLength="1" stroke-dasharray="1 1" d="${p.inner}"/><path class="la-ln la-ln--i" pathLength="1" stroke-dasharray="1 1" d="${innerR}"/>
    <path class="la-fin" d="${p.finial}"/>` };
}

// ───────── Dhaka: a fine band of stepped diamonds (Palpali Dhaka weave), in gold ─────────
export const dhakaBand = (cls = '') => `<svg class="la-dhaka ${cls}" viewBox="0 0 168 16" aria-hidden="true" focusable="false">
  <path d="M0 2.5H168M0 13.5H168" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <g fill="none" stroke="currentColor" stroke-width="0.9">${Array.from({ length: 7 }, (_, i) => {
    const x = 12 + i * 24;
    return `<path d="M${x} 4.5L${x + 3.5} 8L${x} 11.5L${x - 3.5} 8Z"/>${i < 6 ? `<path d="M${x + 12} 6L${x + 14} 8L${x + 12} 10L${x + 10} 8Z" fill="currentColor" stroke="none"/>` : ''}`;
  }).join('')}</g></svg>`;
export const archMark = `<svg class="la-mark" viewBox="0 0 64 78" aria-hidden="true" focusable="false"><path d="M32 4C38 13 49 18 56 28C60 34 60 40 60 46V74H4V46C4 40 4 34 8 28C15 18 26 13 32 4Z" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M32 12C37 19 45 23 50 31C53 36 53 40 53 45V67H11V45C11 40 11 36 14 31C19 23 27 19 32 12Z" fill="none" stroke="currentColor" stroke-width="0.7"/><path d="M32 30L36 38L32 46L28 38Z" fill="currentColor"/></svg>`;

export const lantern = (side) => `<div class="la-lantern la-lantern--${side}" aria-hidden="true"><div class="la-lantern__drop"><img src="${art.lantern}" srcset="${art.lantern} 260w, ${art.lanternLg} 520w" sizes="90px" alt="" decoding="async" /><span class="la-wick">${flame()}</span></div></div>`;
export const flower = (side) => `<span class="la-flower la-flower--${side}" aria-hidden="true"><img src="${art.flowers}" srcset="${art.flowers} 480w, ${art.flowersLg} 1000w" sizes="(max-width: 700px) 44vw, 260px" alt="" decoding="async" /></span>`;

/** draw the card's arch at its exact size (keeps the drawn state of a line that is mid-animation) */
export function layoutArch(cardEl, archSvg) {
  if (!cardEl) return;
  const W = cardEl.clientWidth; const H = cardEl.clientHeight;
  if (!W || !H) return;
  const m1 = Math.max(11, Math.min(18, W * 0.03));
  const k = Math.min(1.2, Math.max(0.86, (H / W) * 0.55));
  const a = svgArch(W, H, { m1, m2: m1 + Math.max(9, W * 0.022), k, lobe: Math.max(16, W * 0.048) });
  // keep the drawn state of any line that is mid-animation
  const old = [...archSvg.querySelectorAll('path')].map((p) => p.getAttribute('stroke-dashoffset'));
  archSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  archSvg.innerHTML = a.html;
  archSvg.querySelectorAll('path').forEach((p, i) => { if (old[i] != null) p.setAttribute('stroke-dashoffset', old[i]); });
  cardEl.style.setProperty('--cw', `${W}px`);
  cardEl.style.setProperty('--ch', `${H}px`);
  cardEl.style.setProperty('--la-top', `${Math.round(a.top + a.R * 0.17)}px`);
  cardEl.style.setProperty('--la-side', `${Math.round(m1 + Math.max(9, W * 0.022) + 10)}px`);
}
/** shrink the script names until the longest one fits the card */
export function fitNames(box = document.querySelector('.la-names')) {
  if (!box) return;
  box.style.removeProperty('--la-nfit');
  const room = box.clientWidth;
  let worst = 1;
  box.querySelectorAll('.su-n').forEach((n) => { if (n.offsetParent && n.scrollWidth > room) worst = Math.min(worst, room / n.scrollWidth); });
  if (worst < 1) box.style.setProperty('--la-nfit', String(Math.floor(worst * 100) / 100));
}


// ───────── the gate: a closed blush card, Ganesh inside a small gold arch ─────────
export function gateScene(ctx) {
  const s = svgArch(220, 300, { m1: 10, m2: 19, k: 0.92, corner: 8, lobe: 15 });
  const title = ctx.txt('hero.title');
  return `<div class="la-gate">
      <div class="la-gate__bg"></div>
      <div class="la-seal">
        <svg class="la-seal__arch" viewBox="0 0 220 300" aria-hidden="true">${s.html}</svg>
        <div class="la-seal__in">
          ${ctx.ganesh('la-gan la-gan--gate', '160px')}
          ${ctx.on(title) ? `<p class="la-seal__title" lang="ne">${ctx.esc(title.ne || title.en)}</p>` : ''}
        </div>
        <p class="la-seal__names">${ctx.names('&amp;')}</p>
      </div>
    </div>`;
}

// ───────── the hero: the arched card under two lanterns ─────────
export function heroCard(ctx) {
  const inv = ctx.txt('hero.invocation');
  const title = ctx.txt('hero.title');
  const line = ctx.txt('hero.line');
  return `<div class="la-stage">
      <div class="la-card" id="la-card">
        <svg class="la-arch" id="la-arch" aria-hidden="true" focusable="false"></svg>
        ${lantern('l')}${lantern('r')}
        ${flower('l')}${flower('r')}
        <div class="la-body">
          ${ctx.ganeshRef ? `<div class="la-crown">${ctx.ganesh('la-gan la-gan--hero', '80px')}<i class="la-shine" aria-hidden="true"></i></div>` : ''}
          ${ctx.on(inv) ? `<p class="la-inv su-in">${ctx.bi(inv)}</p>` : ''}
          ${ctx.on(title) ? `<p class="la-title su-in"><span lang="ne">${ctx.esc(title.ne || title.en)}</span>${title.en && title.en !== title.ne ? `<span class="la-title__en l-en">${ctx.esc(title.en)}</span>` : ''}</p>` : ''}
          ${ctx.on(line) ? `<p class="la-line su-in">${ctx.bi(line)}</p>` : ''}
          <h1 class="su-names la-names su-in">${ctx.names('&amp;')}</h1>
          <div class="la-when su-in">${dhakaBand('la-dhaka--hero')}${ctx.placeLine?.en || ctx.placeLine?.ne ? `<p class="la-place">${ctx.bi(ctx.config.city || ctx.placeLine)}</p>` : ''}</div>
          <div class="la-couple su-in"><img src="${art.couple}" srcset="${art.couple} 560w, ${art.coupleLg} 973w" sizes="(max-width: 700px) 60vw, 300px" alt="" aria-hidden="true" fetchpriority="high" decoding="async" /></div>
        </div>
      </div>
    </div>`;
}

/** The seal lets go: its names and title lift away, the arch swells and fades, the paper thins to what is beneath. */
export function gateExit(tl, gateEl) {
  const q = (s) => gateEl.querySelector(s);
  tl.to(q('.la-seal__names'), { autoAlpha: 0, y: 8, duration: 0.45, ease: 'power2.out' }, 0)
    .to(q('.la-seal__title'), { autoAlpha: 0, y: -6, duration: 0.4, ease: 'power2.out' }, 0.05)
    .to(q('.la-seal__arch'), { autoAlpha: 0, scale: 1.12, duration: 0.7, ease: 'power2.inOut', transformOrigin: '50% 40%' }, 0.1)
    .to(q('.la-gate__bg'), { autoAlpha: 0, duration: 0.9, ease: 'power1.inOut' }, 0.3);
}

/** The card comes alive from `at`: the gold arch draws itself from the crown down both sides, the lanterns drop on
 *  their chains and swing to rest, the peony corners bloom. (Laali's own opening calls it at 0.35.) */
export function heroEnter(tl, at, root = document) {
  const archSvg = root.querySelector('.la-arch');
  if (!archSvg) return;
  const lines = [...archSvg.querySelectorAll('.la-ln')];
  const fin = archSvg.querySelector('.la-fin');
  tl.fromTo(lines.filter((l) => l.classList.contains('la-ln--o')), { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.7, ease: 'power2.inOut' }, at)
    .fromTo(lines.filter((l) => l.classList.contains('la-ln--i')), { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.7, ease: 'power2.inOut' }, at + 0.15)
    .fromTo(fin, { opacity: 0, scale: 0.4, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, at + 0.8);
  root.querySelectorAll('.la-card .la-lantern__drop').forEach((el, i) => {
    const dir = i ? -1 : 1; const t = at + 0.4 + i * 0.16;
    tl.fromTo(el, { yPercent: -112 }, { yPercent: 0, duration: 0.95, ease: 'back.out(1.15)' }, t)
      .fromTo(el, { rotation: 0 }, { keyframes: [
        { rotation: 7 * dir, duration: 0.5, ease: 'sine.out' }, { rotation: -4.5 * dir, duration: 0.7, ease: 'sine.inOut' },
        { rotation: 2.2 * dir, duration: 0.65, ease: 'sine.inOut' }, { rotation: -0.8 * dir, duration: 0.6, ease: 'sine.inOut' },
        { rotation: 0, duration: 0.55, ease: 'sine.out' }] }, t + 0.55);
  });
  root.querySelectorAll('.la-flower').forEach((el, i) => {
    tl.fromTo(el, { opacity: 0, scale: 0.55, rotation: i ? 8 : -8 }, { opacity: 1, scale: 1, rotation: 0, duration: 1.3, ease: 'power3.out' }, at + 0.8 + i * 0.08);
  });
  // hand the settled pieces back to plain CSS, so no compositor layers linger
  tl.set(root.querySelectorAll('.la-card .la-lantern__drop, .la-flower'), { clearProps: 'transform' }, at + 4.15);
}
