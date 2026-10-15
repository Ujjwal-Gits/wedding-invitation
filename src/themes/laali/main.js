// Laali (लाली): blush pink and gold. An arched card under two hanging lanterns.
// Signature: on tap, Ganesh rises from the closed card into the arch's crown while the gold arch draws itself,
// the lanterns drop in on their chains and swing to rest, and the peony corners bloom. Everything after is quiet.
import './laali.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import { lamp, flame, toran, ganthi, flowers, initNepali } from '../_suite/nepali.js';

const A = '/themes/laali/art/';
const art = {
  lantern: `${A}lantern-sm.webp`, lanternLg: `${A}lantern.webp`,
  flowers: `${A}flowers-sm.webp`, flowersLg: `${A}flowers.webp`,
  couple: `${A}couple-sm.webp`, coupleLg: `${A}couple.webp`,
};
const r1 = (n) => Math.round(n * 10) / 10;

// ───────── the arch: an ogee outer line and a cusped (multifoil) inner line, drawn from the crown down ─────────
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
}
/** the left half of an arch inset by m in a W×H box, as cubic segments from the crown to the shoulder */
function archCurve(W, H, m, k) {
  const cx = W / 2; const R = cx - m; const top = m; const ys = top + R * k;
  const segs = [
    [[cx, top], [cx - 0.03 * R, top + 0.1 * R], [cx - 0.1 * R, top + 0.2 * R], [cx - 0.26 * R, top + 0.3 * R]],
    [[cx - 0.26 * R, top + 0.3 * R], [cx - 0.62 * R, top + 0.52 * R], [m, ys - 0.62 * R * k], [m, ys]],
  ];
  return { cx, R, top, ys, segs };
}
const mirror = (d, W) => d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (s, x, y) => `${r1(W - Number(x))},${y}`);

function archPaths(W, H, { m1, m2, k, corner = 10, lobe = 20 }) {
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
function svgArch(W, H, opts) {
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
const dhakaBand = (cls = '') => `<svg class="la-dhaka ${cls}" viewBox="0 0 168 16" aria-hidden="true" focusable="false">
  <path d="M0 2.5H168M0 13.5H168" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <g fill="none" stroke="currentColor" stroke-width="0.9">${Array.from({ length: 7 }, (_, i) => {
    const x = 12 + i * 24;
    return `<path d="M${x} 4.5L${x + 3.5} 8L${x} 11.5L${x - 3.5} 8Z"/>${i < 6 ? `<path d="M${x + 12} 6L${x + 14} 8L${x + 12} 10L${x + 10} 8Z" fill="currentColor" stroke="none"/>` : ''}`;
  }).join('')}</g></svg>`;
const archMark = `<svg class="la-mark" viewBox="0 0 64 78" aria-hidden="true" focusable="false"><path d="M32 4C38 13 49 18 56 28C60 34 60 40 60 46V74H4V46C4 40 4 34 8 28C15 18 26 13 32 4Z" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M32 12C37 19 45 23 50 31C53 36 53 40 53 45V67H11V45C11 40 11 36 14 31C19 23 27 19 32 12Z" fill="none" stroke="currentColor" stroke-width="0.7"/><path d="M32 30L36 38L32 46L28 38Z" fill="currentColor"/></svg>`;

const lantern = (side) => `<div class="la-lantern la-lantern--${side}" aria-hidden="true"><div class="la-lantern__drop"><img src="${art.lantern}" srcset="${art.lantern} 260w, ${art.lanternLg} 520w" sizes="90px" alt="" decoding="async" /><span class="la-wick">${flame()}</span></div></div>`;
const flower = (side) => `<span class="la-flower la-flower--${side}" aria-hidden="true"><img src="${art.flowers}" srcset="${art.flowers} 480w, ${art.flowersLg} 1000w" sizes="(max-width: 700px) 44vw, 260px" alt="" decoding="async" /></span>`;

let cardEl = null; let archSvg = null;
function layoutArch() {
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
function fitNames() {
  const box = document.querySelector('.la-names');
  if (!box) return;
  box.style.removeProperty('--la-nfit');
  const room = box.clientWidth;
  let worst = 1;
  box.querySelectorAll('.su-n').forEach((n) => { if (n.offsetParent && n.scrollWidth > room) worst = Math.min(worst, room / n.scrollWidth); });
  if (worst < 1) box.style.setProperty('--la-nfit', String(Math.floor(worst * 100) / 100));
}

// ═════════ the page ═════════
// ═════════ the page after the hero: "the lantern gallery" ═════════
// A pinned, sideways walk through blush arch panels in a 3D coverflow (scroll down, move along), gold lanterns
// hanging in the foreground. Then vertical again: a blush envelope with the RSVP letter, and the blessing.
// Without motion (or before the opening) the same panels simply stack.

/** an ogee arch as a clip-path polygon, in px, for a w×h box */
function archPoly(w, h, k) {
  const { segs } = archCurve(w, h, 0, k);
  const left = [];
  segs.forEach((sg, i) => { for (let j = i ? 1 : 0; j <= 14; j++) left.push(bez(...sg, j / 14)); });
  const right = left.map(([x, y]) => [w - x, y]).reverse();
  const pts = [...left, [0, h], [w, h], ...right];
  return `polygon(${pts.map(([x, y]) => `${r1(x)}px ${r1(y)}px`).join(',')})`;
}
/** give every [data-arch] element its arch: the clip on its .la-shape (or itself) and a fine gold double line */
function shapeArch(el) {
  const w = el.offsetWidth; const h = el.offsetHeight;
  if (!w || !h) return;
  const k = Number(el.dataset.arch) || 0.8;
  const target = el.querySelector(':scope > .la-shape') || el;
  target.style.clipPath = archPoly(w, h, k);
  el.style.setProperty('--crown', `${Math.round((w / 2) * k)}px`);
  if (el.dataset.line === 'off') return;
  let svg = el.querySelector(':scope > .la-outline');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'la-outline'); svg.setAttribute('aria-hidden', 'true');
    el.insertBefore(svg, target.nextSibling);
  }
  const m1 = Math.max(6, Math.min(11, w * 0.026));
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = svgArch(w, h, { m1, m2: m1 + Math.max(6, w * 0.02), k, corner: 6, lobe: Math.max(13, w * 0.045) }).html;
}
const shapeAll = (root = document) => root.querySelectorAll('[data-arch]').forEach(shapeArch);

// the scratch card's cover: rose-gold foil cut to the arch, a fine Dhaka lattice, the hint in the card's own type
const SCRATCH_K = 0.78;
function paintFoil(c2, w, h, dpr, hint) {
  const { segs } = archCurve(w, h, 0, SCRATCH_K);
  const path = new Path2D();
  path.moveTo(...segs[0][0]);
  segs.forEach((sg) => path.bezierCurveTo(...sg[1], ...sg[2], ...sg[3]));
  path.lineTo(0, h); path.lineTo(w, h);
  [...segs].reverse().forEach((sg) => path.bezierCurveTo(w - sg[2][0], sg[2][1], w - sg[1][0], sg[1][1], w - sg[0][0], sg[0][1]));
  path.closePath();
  c2.clearRect(0, 0, w, h);
  c2.save();
  c2.clip(path);
  const g = c2.createLinearGradient(0, 0, w, h);
  [[0, '#C79A4E'], [0.2, '#F4D9A0'], [0.4, '#D2A35A'], [0.55, '#FBEBC4'], [0.72, '#C08A3E'], [0.88, '#EBC985'], [1, '#B07C34']].forEach(([o, c]) => g.addColorStop(o, c));
  c2.fillStyle = g; c2.fillRect(0, 0, w, h);
  // a blush breath over the gold
  const b = c2.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.8);
  b.addColorStop(0, 'rgba(247,214,220,.35)'); b.addColorStop(1, 'rgba(247,214,220,0)');
  c2.fillStyle = b; c2.fillRect(0, 0, w, h);
  // Dhaka lattice
  c2.strokeStyle = 'rgba(122,82,22,.16)'; c2.lineWidth = dpr;
  const t = 22 * dpr;
  for (let y = 0; y < h + t; y += t) for (let x = (Math.round(y / t) % 2) * (t / 2); x < w + t; x += t) {
    c2.beginPath(); c2.moveTo(x, y - t * 0.32); c2.lineTo(x + t * 0.32, y); c2.lineTo(x, y + t * 0.32); c2.lineTo(x - t * 0.32, y); c2.closePath(); c2.stroke();
  }
  for (let i = 0; i < (w * h) / 700; i++) {
    c2.fillStyle = Math.random() > 0.5 ? 'rgba(255,250,232,.35)' : 'rgba(110,70,20,.12)';
    c2.fillRect(Math.random() * w, Math.random() * h, dpr, dpr);
  }
  // an inner arch line, like the card's
  const m = 9 * dpr; const inner = archCurve(w, h, m, SCRATCH_K).segs;
  c2.beginPath(); c2.moveTo(...inner[0][0]);
  inner.forEach((sg) => c2.bezierCurveTo(...sg[1], ...sg[2], ...sg[3]));
  c2.lineTo(m, h - m); c2.lineTo(w - m, h - m); c2.lineTo(w - m, inner[1][3][1]);
  [...inner].reverse().forEach((sg) => c2.bezierCurveTo(w - sg[2][0], sg[2][1], w - sg[1][0], sg[1][1], w - sg[0][0], sg[0][1]));
  c2.strokeStyle = 'rgba(255,246,222,.85)'; c2.lineWidth = 1.2 * dpr; c2.stroke();
  // the hint, wrapped to fit the arch's waist
  const deva = /[ऀ-ॿ]/.test(hint);
  const size = Math.round(Math.min(w / 12, 22 * dpr));
  c2.font = deva ? `400 ${size}px Kurale, Mukta, serif` : `400 ${size}px "Gilda Display", Georgia, serif`;
  c2.textAlign = 'center'; c2.textBaseline = 'middle';
  const words = String(hint).split(/\s+/); const lines = []; let cur = '';
  words.forEach((wd) => { const tr = cur ? `${cur} ${wd}` : wd; if (c2.measureText(tr).width > w * 0.7 && cur) { lines.push(cur); cur = wd; } else cur = tr; });
  if (cur) lines.push(cur);
  const lh = size * 1.35; const y0 = h * 0.56 - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => {
    c2.fillStyle = 'rgba(255,250,236,.6)'; c2.fillText(ln, w / 2 + dpr, y0 + i * lh + dpr);
    c2.fillStyle = '#5A3A0C'; c2.fillText(ln, w / 2, y0 + i * lh);
  });
  // a small lotus diamond above the hint
  c2.fillStyle = 'rgba(90,58,12,.75)';
  const dy = y0 - lh * 1.1; const ds = 5 * dpr;
  c2.beginPath(); c2.moveTo(w / 2, dy - ds); c2.lineTo(w / 2 + ds, dy); c2.lineTo(w / 2, dy + ds); c2.lineTo(w / 2 - ds, dy); c2.closePath(); c2.fill();
  c2.restore();
}

/** a gold line lantern that holds one countdown number */
const countLantern = (P, u, label, drop) => `<li class="la-cl" style="--drop:${drop}px">
  <div class="la-cl__swing">
    <svg class="la-cl__art" viewBox="0 0 60 124" aria-hidden="true" focusable="false">
      <circle cx="30" cy="5" r="3.4" fill="none" stroke="currentColor" stroke-width="1.2"/>
      <path d="M17 23Q30 7 43 23Z" fill="#F6E3B8" stroke="currentColor" stroke-width="1.1"/>
      <rect x="13" y="23" width="34" height="5" rx="1.5" fill="#E9C985" stroke="currentColor" stroke-width="0.9"/>
      <path d="M13 28H47L51 37V79L47 88H13L9 79V37Z" fill="#FFF7F2" stroke="currentColor" stroke-width="1.2"/>
      <path d="M16 82V45Q16 35 30 32.5Q44 35 44 45V82Z" fill="rgba(255,214,140,.22)" stroke="currentColor" stroke-width="0.7"/>
      <path d="M19 88L30 101L41 88Z" fill="#E9C985" stroke="currentColor" stroke-width="0.9"/>
      <circle cx="30" cy="105" r="2.2" fill="currentColor"/><path d="M30 107V121" stroke="currentColor" stroke-width="1"/>
    </svg>
    ${P.countNum(u, 'la-cl__n')}
  </div>
  <span class="la-cl__l">${P.bi(label)}</span>
</li>`;

function page(ctx) {
  const { bi, esc, txt, on, parts: P, c } = ctx;
  P.bi = bi;
  const ch = []; // [id, title, html]
  const head = (title, kicker) => `<header class="la-ph">${kicker && on(kicker) ? `<p class="la-k">${bi(kicker)}</p>` : ''}<h2 class="la-h">${bi(title)}</h2><i class="la-weave" aria-hidden="true"></i></header>`;
  const panel = (id, cls, k, inner, after = '') => `<article class="la-pan ${cls}" id="${id}" data-arch="${k}">
      <div class="la-shape"></div>
      <div class="la-pan__in"><div class="la-pan__fit">${inner}</div></div>${after}
    </article>`;

  if (P.lead) {
    ch.push(['ch-couple', txt('couple.title'), panel('ch-couple', 'la-pan--couple', 0.74, `${head(txt('couple.title'))}
      <figure class="la-portrait" data-arch="0.9" data-line="off">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 700px) 64vw, 300px', { cls: 'la-portrait__img' })}</figure>
      ${on(txt('couple.line')) ? `<p class="la-lede">${bi(txt('couple.line'))}</p>` : ''}`)]);
  }
  ch.push(['ch-date', txt('date.title'), panel('ch-date', 'la-pan--date', 0.74, `${head(txt('date.title'), txt('date.kicker'))}
    ${P.scratch(`<div class="la-sface" data-arch="${SCRATCH_K}"><div class="la-shape"></div><div class="la-sface__in">${ctx.dateStrip()}${ctx.placeLine?.en || ctx.placeLine?.ne ? `<p class="la-sface__place">${bi(ctx.placeLine)}</p>` : ''}</div></div>`, 'la-scratch')}`)]);
  const drops = [18, 46, 30, 56];
  ch.push(['ch-count', txt('count.title'), panel('ch-count', 'la-pan--count', 0.74, `${head(txt('count.title'))}
    <div class="la-count" data-countdown>
      <ol class="su-count__grid la-cls" aria-label="${esc(txt('count.title').en)}">${P.countUnits.map((x, i) => countLantern(P, x.u, x.label, drops[i])).join('')}</ol>
      <p class="la-count__done" data-count-done hidden></p>
    </div>
    <div class="la-btns">${P.calendarBtn()}${P.shareBtn()}</div>`)]);
  ch.push(['ch-fam', txt('families.title'), panel('ch-fam', 'la-pan--fam', 0.74, `${head(txt('families.title'))}
    <div class="la-fam">${P.families.map((f) => `<div class="la-fam__arch la-fam__arch--${f.key}" data-arch="0.95">
        <div class="la-shape"></div>
        <div class="la-fam__in">
          ${P.brideGroom ? `<figure class="la-fam__pic">${ctx.imgTag(f.photo, f.person.name.en, '120px')}</figure>` : ''}
          <p class="la-k">${bi(f.label)}</p>
          <p class="la-fam__name">${bi(f.person.fullName)}</p>
          ${(f.person.parents?.en || f.person.parents?.ne) ? `<p class="la-fam__of">${bi(f.of)}</p><p class="la-fam__par">${bi(f.person.parents)}</p>` : ''}
          ${(f.person.home?.en || f.person.home?.ne) ? `<p class="la-fam__home">${bi(f.person.home)}</p>` : ''}
        </div>
      </div>`).join('')}${ganthi('la-knot', '(max-width: 700px) 50vw, 240px')}</div>`)]);
  P.events.forEach((ev, n) => {
    const stub = `<div class="la-tk__stub" aria-hidden="true">
        <span class="la-tk__day">${bi({ en: ev.ad.day, ne: ev.bs.day || ctx.neNum(ev.ad.day) })}</span>
        <span class="la-tk__my"><b>${bi({ en: ev.ad.month.en, ne: ev.bs.month || ev.ad.month.ne })}</b><small>${bi({ en: `${ev.ad.wd.en} · ${ev.ad.year}`, ne: `${ev.ad.wd.ne} · ${ev.bs.year || ctx.neNum(ev.ad.year)}` })}</small></span>
      </div>`;
    const hasDress = !!(ev.dress.text?.en || ev.dress.text?.ne || ev.dress.colors.length);
    ch.push([`ch-ev-${n}`, ev.title, panel(`ch-ev-${n}`, 'la-pan--tk', 0.6, `<header class="la-ph"><p class="la-k">${bi(txt('prog.title'))}</p><h2 class="la-h la-tk__title">${bi(ev.title)}</h2><i class="la-weave" aria-hidden="true"></i></header>
      <p class="sr-only">${bi(ev.ad.full)}</p>
      <p class="la-tk__time">${bi(ev.time)}</p>
      ${ev.blurb ? `<p class="la-tk__blurb">${bi(ev.blurb)}</p>` : ''}
      <p class="la-tk__venue">${bi(ev.venue)}<br /><a class="su-link" href="${esc(ev.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
      ${hasDress ? `<p class="la-tk__dress">${ev.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : P.UI.wear)}</span></p>` : ''}
      ${ev.rituals.length ? `<details class="la-tk__order"><summary>${bi(P.UI.order)}</summary><ol>${ev.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}`, stub)]);
  });
  if (P.photos.length) {
    ch.push(['ch-photos', txt('gallery.title'), panel('ch-photos', 'la-pan--ph', 0.74, `${head(txt('gallery.title'))}
      <div class="la-cf">
        <div class="la-cf__deck">${P.photos.map((g, i) => `<figure class="la-cf__it" data-i="${i}">${P.photoBtn(g, i, '(max-width: 700px) 60vw, 300px')}</figure>`).join('')}</div>
      </div>
      <div class="la-cf__nav"><button type="button" class="la-cf__b" data-cf="-1"><span aria-hidden="true">‹</span><span class="sr-only">Previous photograph</span></button><span class="la-cf__n" aria-live="polite"></span><button type="button" class="la-cf__b" data-cf="1"><span aria-hidden="true">›</span><span class="sr-only">Next photograph</span></button></div>`)]);
  }
  if (ch.length) ch[0][2] = ch[0][2].replace('class="la-pan ', 'class="la-pan la-pan--first ').replace('<div class="la-shape"></div>', `<div class="la-shape"></div>${toran('la-toran', '(max-width: 700px) 90vw, 440px')}`);
  const nums = (i) => bi({ en: String(i + 1).padStart(2, '0'), ne: ctx.neNum(String(i + 1).padStart(2, '0')) });

  return `
  <section class="su-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${SPEC.hero(ctx)}
    ${P.cue('chapters')}
  </section>

  <section class="la-chap" id="chapters" aria-label="${esc(txt('hero.title').en || 'The invitation')}">
    <div class="la-chap__stage">
      <div class="la-deck">${ch.map((x) => x[2]).join('')}</div>
      <div class="la-fg" aria-hidden="true">${[0, 1, 2].map((i) => `<div class="la-fg__l la-fg__l--${i}"><div class="la-fg__sw"><img src="${art.lantern}" srcset="${art.lantern} 260w, ${art.lanternLg} 520w" sizes="120px" alt="" decoding="async" /><span class="la-wick">${flame()}</span></div></div>`).join('')}</div>
      <nav class="la-nav" aria-label="Chapters">
        <p class="la-nav__t">${ch.map((x, i) => `<span class="la-nav__lab${i ? '' : ' is-on'}" data-i="${i}"><b>${nums(i)}</b> ${bi(x[1])}</span>`).join('')}</p>
        <ol class="la-nav__dots">${ch.map((x, i) => `<li><button type="button" data-go="${i}"${i ? '' : ' aria-current="step"'}><span class="sr-only">${bi(x[1])}</span></button></li>`).join('')}</ol>
      </nav>
    </div>
  </section>

  ${P.moreInfo() ? `<section class="la-info">${P.moreInfo()}</section>` : ''}

  <section class="la-env" id="rsvp" aria-labelledby="rsvp-title">
    <div class="la-env__wrap">
      <div class="la-env__back" aria-hidden="true"><i class="la-env__flap"></i></div>
      <article class="la-env__letter" data-arch="0.5">
        <div class="la-shape"></div>
        <div class="la-env__in">
          ${dhakaBand('la-dhaka--ph')}
          <h2 class="la-h" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
          ${(P.deadline?.en || P.deadline?.ne) ? `<p class="la-lede">${bi(P.deadline)}</p>` : ''}
          ${P.rsvpForm()}
        </div>
      </article>
      <div class="la-env__pocket">
        <div class="la-env__pocket-in">
          ${archMark}
          <p class="la-env__line">${bi(txt('card.line'))}</p>
          <p class="la-env__hosts">${bi(ctx.config.hosts)}</p>
          ${P.cardBtn()}
        </div>
      </div>
    </div>
  </section>

  <footer class="la-close" aria-label="Blessing">
    <div class="la-close-deco" aria-hidden="true">${lantern('l')}${lantern('r')}</div>
    ${dhakaBand('la-dhaka--close')}
    <p class="la-close__ne" lang="ne">${esc(ctx.config.closing?.ne || '')}</p>
    <p class="la-close__en l-en">${esc(ctx.config.closing?.en || '')}</p>
    <p class="la-close__names">${ctx.names('&amp;')}</p>
    ${c.hashtag ? `<p class="la-close__tag">${esc(c.hashtag)}</p>` : ''}
    ${P.madeWith()}
  </footer>`;
}

// ───────── the photo coverflow (drag, swipe, arrows; tap opens the lightbox) ─────────
function coverflow(ctx) {
  const box = document.querySelector('.la-cf');
  if (!box) return;
  const items = [...box.querySelectorAll('.la-cf__it')];
  const n = items.length; const num = document.querySelector('.la-cf__n');
  items.forEach((it) => { const im = it.querySelector('img'); if (im) im.loading = 'eager'; });
  let pos = 0; let target = 0; let drag = null; let moved = false; let tw = null;
  const render = () => {
    items.forEach((it, i) => {
      const d = i - pos; const a = Math.abs(d);
      if (a > 2.6) { it.style.visibility = 'hidden'; it.style.transform = 'none'; return; }
      it.style.visibility = '';
      const s = Math.sign(d) * Math.min(a, 1);
      it.style.transform = `translate3d(${(s * 46 + (a > 1 ? Math.sign(d) * (a - 1) * 16 : 0)).toFixed(2)}%,0,${(-a * 110).toFixed(1)}px) rotateY(${(-s * 48).toFixed(2)}deg)`;
      it.style.zIndex = String(20 - Math.round(a * 4));
      it.style.opacity = String(Math.max(0, 1 - Math.max(0, a - 1) * 0.6));
      it.querySelector('button').tabIndex = a < 0.5 ? 0 : -1;
    });
    const k = Math.round(pos);
    if (num) num.innerHTML = ctx.bi({ en: `${k + 1} / ${n}`, ne: `${ctx.neNum(String(k + 1))} / ${ctx.neNum(String(n))}` });
  };
  const go = (t) => {
    target = Math.max(0, Math.min(n - 1, t));
    if (ctx.reduced) { pos = target; render(); return; }
    tw?.kill();
    tw = gsap.to({ v: pos }, { v: target, duration: 0.55, ease: 'power3.out', onUpdate() { pos = this.targets()[0].v; render(); } });
  };
  document.querySelectorAll('[data-cf]').forEach((b) => b.addEventListener('click', () => go(Math.round(target) + Number(b.dataset.cf))));
  box.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, p: pos, w: box.offsetWidth * 0.5 }; moved = false; });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!moved && Math.abs(dx) < 8) return;
    if (!moved && Math.abs(e.clientY - drag.y) > Math.abs(dx)) { drag = null; return; }
    moved = true;
    tw?.kill();
    pos = Math.max(-0.3, Math.min(n - 0.7, drag.p - dx / drag.w)); render();
  });
  window.addEventListener('pointerup', () => { if (!drag) return; drag = null; if (moved) go(Math.round(pos)); });
  // a drag is not a tap: keep it from opening the lightbox
  box.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  box.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(Math.round(target) + 1); if (e.key === 'ArrowLeft') go(Math.round(target) - 1); });
  render();
}

// ───────── countdown lanterns: each tick nudges its lantern ─────────
function lanternTicks(ctx) {
  if (ctx.reduced) return;
  document.querySelectorAll('.la-cl').forEach((li) => {
    const n = li.querySelector('[data-u]'); const sw = li.querySelector('.la-cl__swing');
    let last = n.textContent;
    new MutationObserver(() => {
      if (n.textContent === last) return;
      last = n.textContent;
      if (!document.body.classList.contains('la-count-live')) return;
      gsap.fromTo(sw, { rotation: n.dataset.u === 's' ? 2.4 : 4 }, { rotation: 0, duration: 1.4, ease: 'elastic.out(1, 0.35)', overwrite: true });
    }).observe(n, { childList: true, subtree: true, characterData: true });
  });
}

/** fit each panel's content inside its arch (scale down, never crop) */
function fitPanels() {
  document.querySelectorAll('.la-pan').forEach((p) => {
    const box = p.querySelector('.la-pan__in'); const fit = p.querySelector('.la-pan__fit');
    fit.style.transform = '';
    const cs = getComputedStyle(box);
    const room = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom); const need = fit.scrollHeight;
    const roomW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); const needW = fit.scrollWidth;
    const s = Math.min(1, room / need, roomW / needW);
    if (s < 0.995) fit.style.transform = `scale(${s.toFixed(3)})`;
  });
}

function scroll(ctx) {
  const sec = document.getElementById('chapters');
  coverflow(ctx);
  lanternTicks(ctx);
  // the countdown nudges and the foreground lanterns only move while they are on screen
  initNepali();
  if (ctx.reduced) { shapeAll(); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => document.body.classList.toggle('la-count-live', e.isIntersecting)));
  io.observe(document.getElementById('ch-count'));

  sec.classList.add('is-h');
  const panels = [...sec.querySelectorAll('.la-pan')];
  const N = panels.length;
  const labs = [...sec.querySelectorAll('.la-nav__lab')];
  const dots = [...sec.querySelectorAll('[data-go]')];
  const fg = [...sec.querySelectorAll('.la-fg__l')];
  const fgSw = fg.map((l) => l.querySelector('.la-fg__sw'));
  let fgW = fg.map(() => 50);
  let W = 0; let PW = 0; let wide = false;
  const size = () => {
    W = sec.clientWidth; const H = sec.clientHeight;
    wide = W >= 700;
    const ph = Math.round(H * (wide ? 0.76 : 0.72));
    PW = Math.round(Math.min(wide ? 440 : W * 0.84, ph * (wide ? 0.68 : 0.62), 440));
    sec.style.setProperty('--pw', `${PW}px`); sec.style.setProperty('--ph', `${ph}px`);
    shapeAll();
    fitPanels();
    fgW = fg.map((l) => l.offsetWidth || 50);
  };
  size();
  // pictures that arrive later change a panel's height: fit again
  sec.querySelectorAll('.la-pan img').forEach((im) => { if (!im.complete) im.addEventListener('load', () => { shapeAll(sec); fitPanels(); }, { once: true }); });
  document.fonts?.ready.then(fitPanels);
  let cur = -1;
  const proxy = { p: 0 };
  const famI = panels.findIndex((p) => p.id === 'ch-fam');
  const famB = sec.querySelector('.la-fam__arch--bride'); const famG = sec.querySelector('.la-fam__arch--groom'); const knot = sec.querySelector('.la-knot');
  let famLast = -1;
  const bond = (pos) => {
    const t = Math.max(0, Math.min(1, 1 - Math.abs(famI - pos) * 1.15));
    const e = 1 - (1 - t) ** 3;
    if (Math.abs(e - famLast) < 0.002) return;
    famLast = e;
    const off = (1 - e) * 46; const z = (1 - e) * -90; const r = 16 + (1 - e) * 24;
    famB.style.transform = `translate3d(${(-off).toFixed(1)}px,0,${z.toFixed(1)}px) rotateY(${r.toFixed(1)}deg)`;
    famG.style.transform = `translate3d(${off.toFixed(1)}px,0,${z.toFixed(1)}px) rotateY(${(-r).toFixed(1)}deg)`;
    knot.style.transform = `translateX(-50%) scale(${(0.7 + 0.3 * e).toFixed(3)})`;
    knot.style.opacity = (0.15 + 0.85 * e).toFixed(3);
  };
  const render = () => {
    const pos = proxy.p * (N - 1);
    panels.forEach((el, i) => {
      const d = i - pos; const a = Math.abs(d);
      if (a > (wide ? 2.6 : 1.6)) { el.style.visibility = 'hidden'; el.style.transform = 'none'; return; }
      el.style.visibility = '';
      const s = Math.sign(d) * Math.min(a, 1);
      const x = s * PW * (wide ? 0.98 : 0.93) + (a > 1 ? Math.sign(d) * (a - 1) * PW * 0.52 : 0);
      el.style.transform = `translate3d(${x.toFixed(1)}px,0,${(-a * (wide ? 220 : 170)).toFixed(1)}px) rotateY(${(-s * 40).toFixed(2)}deg)`;
      el.style.opacity = a <= 1 ? '1' : String(Math.max(0, 1 - (a - 1) * 0.75).toFixed(3));
      el.style.zIndex = String(50 - Math.round(a * 10));
    });
    // foreground lanterns drift at their own depths and wrap around
    const span = W + 240;
    fg.forEach((l, i) => {
      const speed = [1.15, 0.7, 1.45][i]; const base = [0.12, 0.62, 0.9][i] * span;
      const x = ((((base - pos * PW * speed) % span) + span) % span) - 120;
      l.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      // they fade as they pass under the language and music buttons (top right), so the two never pile up
      fgSw[i].style.opacity = String(Math.max(0, Math.min(1, (W - 116 - x - fgW[i] * 0.15) / 90)).toFixed(2));
    });
    if (famI >= 0 && famB && famG && knot) bond(pos);
    const k = Math.round(pos);
    if (k !== cur) {
      cur = k;
      labs.forEach((el, i) => el.classList.toggle('is-on', i === k));
      dots.forEach((el, i) => (i === k ? el.setAttribute('aria-current', 'step') : el.removeAttribute('aria-current')));
    }
  };
  const swayTo = fgSw.map((el) => gsap.quickTo(el, 'rotation', { duration: 0.9, ease: 'power3.out' }));
  let st = null;
  gsap.to(proxy, {
    p: 1, ease: 'none', onUpdate: render,
    scrollTrigger: {
      trigger: sec, start: 'top top', end: () => `+=${(N - 1) * window.innerHeight * 0.85}`, pin: true, scrub: 0.6, anticipatePin: 1,
      invalidateOnRefresh: true,
      snap: { snapTo: 1 / (N - 1), inertia: false, duration: { min: 0.25, max: 0.6 }, delay: 0.08, ease: 'power2.inOut' },
      onRefresh: (self) => { st = self; },
      onUpdate: (self) => { st = self; const v = Math.max(-1, Math.min(1, self.getVelocity() / 2500)); swayTo.forEach((f, i) => f(-v * [9, 6, 11][i])); },
      onToggle: (self) => sec.classList.toggle('is-live', self.isActive),
    },
  });
  render();
  const goTo = (i, immediate = false) => {
    if (!st) return;
    const y = st.start + (st.end - st.start) * (i / (N - 1));
    const l = ctx.lenis?.();
    if (l) l.scrollTo(y, { immediate, force: true }); else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
  };
  dots.forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.go))));
  // keyboard: tabbing into a side panel brings it to the centre
  panels.forEach((p, i) => p.addEventListener('focusin', () => { if (cur !== i) goTo(i); }));
  sec.querySelectorAll('.la-tk__order').forEach((d) => d.addEventListener('toggle', fitPanels));
  let rw = window.innerWidth;
  window.addEventListener('resize', () => { if (window.innerWidth !== rw) { rw = window.innerWidth; size(); render(); } });
  // the envelope: the letter rises out of its pocket as you arrive
  const letter = document.querySelector('.la-env__letter');
  gsap.fromTo(letter, { yPercent: 14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.la-env', start: 'top 92%', end: 'top 20%', scrub: 0.5 } });
  if (new URLSearchParams(location.search).has('debug')) window.__la = { go: (i) => goTo(i, true), N };
}

const SPEC = {
  slug: 'laali',
  manifest,
  art,
  bell: true,

  gate: (ctx) => {
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
  },

  hero: (ctx) => {
    const inv = ctx.txt('hero.invocation');
    const title = ctx.txt('hero.title');
    const line = ctx.txt('hero.line');
    return `<div class="la-stage">
      <div class="la-card" id="la-card">
        <svg class="la-arch" id="la-arch" aria-hidden="true" focusable="false"></svg>
        ${lantern('l')}${lantern('r')}
        ${flower('l')}${flower('r')}
        ${flowers('bl', 'la-mari la-mari--l', '220px')}${flowers('br', 'la-mari la-mari--r', '220px')}
        ${lamp('panas', { cls: 'la-panas la-panas--l', sizes: '70px' })}${lamp('panas', { cls: 'la-panas la-panas--r', sizes: '70px' })}
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
  },

  ready: () => {
    initNepali();
    cardEl = document.getElementById('la-card');
    archSvg = document.getElementById('la-arch');
    layoutArch();
    fitNames();
    document.fonts?.ready.then(() => { fitNames(); shapeAll(); });
    shapeAll();
    document.querySelectorAll('[data-arch] img').forEach((im) => im.addEventListener('load', () => shapeArch(im.closest('[data-arch]')), { once: true }));
    let raf = 0;
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { layoutArch(); fitNames(); if (!document.querySelector('.la-chap.is-h')) shapeAll(); }); });
  },

  // the card itself is a tap target too (the buttons stay the accessible way in)
  gateTap: (ctx, go) => document.querySelector('.la-seal')?.addEventListener('click', go),

  open: (ctx, tl, gateEl) => {
    const q = (s) => gateEl.querySelector(s);
    const gGan = q('.la-gan--gate');
    const hGan = document.querySelector('.la-gan--hero');
    const lines = [...archSvg.querySelectorAll('.la-ln')];
    const fin = archSvg.querySelector('.la-fin');

    // the seal lets go: its title and arch lift away, the paper thins to the card beneath
    tl.to(q('.la-seal__names'), { autoAlpha: 0, y: 8, duration: 0.45, ease: 'power2.out' }, 0)
      .to(q('.la-seal__title'), { autoAlpha: 0, y: -6, duration: 0.4, ease: 'power2.out' }, 0.05)
      .to(q('.la-seal__arch'), { autoAlpha: 0, scale: 1.12, duration: 0.7, ease: 'power2.inOut', transformOrigin: '50% 40%' }, 0.1)
      .to(q('.la-gate__bg'), { autoAlpha: 0, duration: 0.9, ease: 'power1.inOut' }, 0.3);

    // Ganesh rises into the crown of the arch
    if (gGan && hGan) {
      const g = gGan.getBoundingClientRect(); const h = hGan.getBoundingClientRect();
      gsap.set(hGan, { opacity: 0 });
      tl.to(gGan, { x: h.left + h.width / 2 - (g.left + g.width / 2), y: h.top + h.height / 2 - (g.top + g.height / 2), scale: h.width / g.width,
        duration: 1.15, ease: 'power3.inOut' }, 0.1)
        .set(hGan, { opacity: 1 }, 1.25)
        .set(gGan, { opacity: 0 }, 1.25);
    } else if (gGan) tl.to(gGan, { autoAlpha: 0, duration: 0.5 }, 0.1);
    tl.set(gateEl, { autoAlpha: 0 }, 1.3);

    // the gold arch draws itself from the crown down both sides
    tl.fromTo(lines.filter((l) => l.classList.contains('la-ln--o')), { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.7, ease: 'power2.inOut' }, 0.35)
      .fromTo(lines.filter((l) => l.classList.contains('la-ln--i')), { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.7, ease: 'power2.inOut' }, 0.5)
      .fromTo(fin, { opacity: 0, scale: 0.4, transformOrigin: '50% 100%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, 1.15);

    // the lanterns drop on their chains and swing to rest
    document.querySelectorAll('.la-card .la-lantern__drop').forEach((el, i) => {
      const dir = i ? -1 : 1; const at = 0.75 + i * 0.16;
      tl.fromTo(el, { yPercent: -112 }, { yPercent: 0, duration: 0.95, ease: 'back.out(1.15)' }, at)
        .fromTo(el, { rotation: 0 }, { keyframes: [
          { rotation: 7 * dir, duration: 0.5, ease: 'sine.out' }, { rotation: -4.5 * dir, duration: 0.7, ease: 'sine.inOut' },
          { rotation: 2.2 * dir, duration: 0.65, ease: 'sine.inOut' }, { rotation: -0.8 * dir, duration: 0.6, ease: 'sine.inOut' },
          { rotation: 0, duration: 0.55, ease: 'sine.out' }] }, at + 0.55);
    });

    // the peony corners bloom from their corners
    document.querySelectorAll('.la-flower').forEach((el, i) => {
      tl.fromTo(el, { opacity: 0, scale: 0.55, rotation: i ? 8 : -8 }, { opacity: 1, scale: 1, rotation: 0, duration: 1.3, ease: 'power3.out' }, 1.15 + i * 0.08);
    });
    document.querySelectorAll('.la-mari').forEach((el, i) => {
      tl.fromTo(el, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.3, ease: 'power3.out' }, 1.3 + i * 0.08);
    });
    tl.fromTo('.la-panas', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 }, 1.45);
    // hand the settled pieces back to plain CSS, so no compositor layers linger
    tl.set('.la-card .la-lantern__drop, .la-flower, .la-mari, .la-panas', { clearProps: 'transform' }, 4.5);
    return 1.25;
  },

  ambient: (ctx) => {
    if (ctx.reduced) return;
    const g = document.querySelector('.la-gan--hero');
    const shine = document.querySelector('.la-shine');
    if (g && shine) {
      const src = JSON.stringify(g.currentSrc || g.src);
      shine.style.setProperty('-webkit-mask-image', `url(${src})`);
      shine.style.setProperty('mask-image', `url(${src})`);
    }
    // the loops (lantern sway, glow, Ganesh's glint) run only while their part of the page is on screen
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-live', e.isIntersecting)));
    [document.getElementById('la-card'), document.querySelector('.la-close')].forEach((el) => el && io.observe(el));
  },

  page: (ctx) => page(ctx),
  scroll: (ctx) => scroll(ctx),
  scratch: { paint: paintFoil },
};
mountSuite(SPEC);
