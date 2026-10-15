// Theme · Mehendi (मेहन्दी) — henna on ivory, hands joined.
// A plain ivory gate holds a large henna mandala, faint as a pencil guide. Tap, and the henna draws itself ring by
// ring from the centre outward, the way a cone lays a line (the one signature motion); the mandala then sinks back
// to a watermark and the joined hands glide down from the top edge while the henna Ganesh appears.
// Below, "the henna trail": one vine runs down the whole page and draws itself as you scroll; the sections sit
// alternately left and right of it like a story, each joined by a tendril and a bud that blooms as you reach it.
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import { lamp, kalash, toran, sindoorDaan, initNepali } from '../_suite/nepali.js';
import './mehendi.css'; // after the suite's CSS, so the theme wins ties

const ART = '/themes/mehendi/art/';
const r2 = (n) => Math.round(n * 100) / 100;
const pol = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [r2(r * Math.cos(a)), r2(r * Math.sin(a))]; };

// ───────── the mandala (viewBox -200 -200 400 400), built ring by ring ─────────
/** a lens petal pointing outward along +y, from r0 to r1, half-width w */
const lens = (r0, r1, w) => { const h = r1 - r0; return `M0 ${r0}C${w} ${r2(r0 + h * 0.28)} ${r2(w * 0.62)} ${r2(r1 - h * 0.18)} 0 ${r1}C${r2(-w * 0.62)} ${r2(r1 - h * 0.18)} ${-w} ${r2(r0 + h * 0.28)} 0 ${r0}Z`; };
/** a paisley (mango) whose bulb sits at r and tip curls clockwise, 36 units long */
const PAISLEY = 'M6 36C0 31-11 24-11 12C-11 3-5-1 0-1C6-1 11 4 11 11C11 20 4 22 4 28C4 32 6 34 6 36Z';
const PAISLEY_IN = 'M3 26C-2 23-6 18-6 12C-6 7-3 4 0 4C4 4 6 7 6 11C6 16 3 18 3 22';
const around = (n, fn, off = 0) => Array.from({ length: n }, (_, i) => fn((360 / n) * i + off, i)).join('');
const ln = (d, a, extra = '') => `<path d="${d}" transform="rotate(${r2(a + 180)})${extra}" pathLength="1"/>`; // +180: the cone starts at the top
const ring = (r) => `<circle r="${r}" transform="rotate(-90)" pathLength="1"/>`;
const dots = (n, r, s, off = 0) => around(n, (a) => { const [x, y] = pol(r, a); return `<circle class="d" cx="${x}" cy="${y}" r="${s}"/>`; }, off);
const scallops = (n, r0, r1) => {
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const a0 = (360 / n) * i; const a1 = a0 + 360 / n; const am = (a0 + a1) / 2;
    const [x0, y0] = pol(r0, a0); const [cx, cy] = pol(r1, am); const [x1, y1] = pol(r0, a1);
    d += `${i ? '' : `M${x0} ${y0}`}Q${cx} ${cy} ${x1} ${y1}`;
  }
  return `<path d="${d}" pathLength="1"/>`;
};
/** scallops along a quarter arc about the corner (0,0) */
const scallopArc = (r0, r1, n) => {
  const P = (r, f) => [r2(r * Math.cos(f * Math.PI / 180)), r2(r * Math.sin(f * Math.PI / 180))];
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const f0 = (90 / n) * i; const f1 = f0 + 90 / n;
    const [x0, y0] = P(r0, f0); const [cx, cy] = P(r1, (f0 + f1) / 2); const [x1, y1] = P(r0, f1);
    d += `${i ? '' : `M${x0} ${y0}`}Q${cx} ${cy} ${x1} ${y1}`;
  }
  return `<path d="${d}"/>`;
};
/** each ring: its markup, and how the cone lays it (bloom = petals draw together, sweep = one line around, dots = beads) */
const RINGS = [
  { k: 'bloom', h: `<circle class="d" r="4.2"/>${ring(9)}${around(8, (a) => ln(lens(11, 32, 8.5), a))}` },
  { k: 'sweep', h: ring(36) },
  { k: 'dots', h: dots(24, 41.5, 1.5, 7.5) },
  { k: 'bloom', h: around(12, (a) => ln(lens(47, 84, 14), a) + ln(lens(54, 76, 6), a)) + dots(12, 47, 1.3, 15) },
  { k: 'sweep', h: ring(90) + ring(94) },
  { k: 'bloom', h: around(16, (a) => `<g transform="rotate(${r2(a + 180)}) translate(0 98)">${ln(PAISLEY, -180)}${ln(PAISLEY_IN, -180)}<circle class="d" cy="11" r="1.6"/></g>`, 11.25) },
  { k: 'sweep', h: ring(139) + scallops(36, 139, 151) },
  { k: 'dots', h: dots(36, 156, 1.6, 5) },
  { k: 'bloom', h: around(24, (a) => ln(lens(161, 190, 9.5), a) + ln('M0 166Q1.6 175 0 184', a)) },
  { k: 'dots', h: dots(24, 196, 2) + dots(24, 172, 0.9, 7.5) },
];
const mandala = (cls, draw = false, only = null) => `<svg class="mh-mandala ${cls}" viewBox="${only ? '-104 -104 208 208' : '-200 -200 400 400'}" aria-hidden="true" focusable="false">
  ${RINGS.map((r, i) => (only && !only.includes(i) ? '' : `<g class="mh-r mh-r--${r.k}" data-ring="${i}">${r.h}</g>`)).join('')}
</svg>`.replace(/ pathLength="1"/g, draw ? ' pathLength="1"' : '');

// ───────── small henna ornaments ─────────
/** a Dhaka (ढाका) line: the woven diamond chain, tapering at both ends */
const dhaka = (cls = '') => `<svg class="mh-dhaka ${cls}" viewBox="0 0 220 16" aria-hidden="true" focusable="false">
  <path d="M2 8H52M168 8H218" stroke-width=".8"/>
  ${[0, 1, 2, 3, 4, 5, 6].map((i) => { const x = 62 + i * 16; const s = i === 3 ? 7 : i % 2 ? 5 : 4; return `<path d="M${x} ${8 - s}L${x + s} 8L${x} ${8 + s}L${x - s} 8Z"/>${i < 6 ? `<circle class="d" cx="${x + 8}" cy="8" r="1"/>` : ''}`; }).join('')}
  <circle class="d" cx="56" cy="8" r="1.3"/><circle class="d" cx="164" cy="8" r="1.3"/>
</svg>`;
/** a henna corner: a quarter rosette in the corner, a scalloped band, a vine with leaves along both edges */
const cornerEdge = `<path d="M50 9C62 3 72 13 84 8S104 3 114 7"/>
  ${[[58, 5, -150], [70, 9, -30], [82, 7, -150], [95, 5, -30]].map(([x, y, a]) => `<path d="${lens(0, 9, 2.6)}" transform="translate(${x} ${y}) rotate(${a})"/>`).join('')}
  <circle class="d" cx="117" cy="7" r="1.5"/><circle class="d" cx="110" cy="12" r=".9"/><circle class="d" cx="104" cy="14" r=".7"/>`;
const corner = (pos) => `<svg class="mh-corner mh-corner--${pos}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
  <path d="M30 0A30 30 0 0 1 0 30M36 0A36 36 0 0 1 0 36"/>
  ${scallopArc(36, 44, 5)}
  ${[20, 45, 70].map((f) => `<path d="${lens(5, f === 45 ? 27 : 22, f === 45 ? 6 : 5)}" transform="rotate(${f - 90})"/>`).join('')}
  ${[12, 26, 40, 54, 68, 82].map((f) => { const r = 50; return `<circle class="d" cx="${r2(r * Math.cos(f * Math.PI / 180))}" cy="${r2(r * Math.sin(f * Math.PI / 180))}" r="1.1"/>`; }).join('')}
  ${cornerEdge}<g transform="matrix(0 1 1 0 0 0)">${cornerEdge}</g>
</svg>`;
/** a small henna flower between the two families */
const FLOWER = `<svg class="mh-flower" viewBox="-40 -40 80 80" aria-hidden="true" focusable="false">
  <circle class="d" r="2.6"/><circle r="6.5"/>${around(8, (a) => `<path d="${lens(8.5, 27, 6.5)}" transform="rotate(${a})"/><path d="${lens(12, 22, 2.4)}" transform="rotate(${a})"/>`)}
  ${dots(8, 31, 1.4, 22.5)}${dots(8, 34.5, 1.8)}
</svg>`;
/** a small henna lotus, sitting on the top edge of the couple's frame */
const LOTUS = `<svg class="mh-lotus" viewBox="0 0 120 40" aria-hidden="true" focusable="false">
  <path d="${lens(0, 30, 7)}" transform="translate(60 36) rotate(180)"/>
  <path d="${lens(0, 26, 6)}" transform="translate(60 36) rotate(140)"/><path d="${lens(0, 26, 6)}" transform="translate(60 36) rotate(220)"/>
  <path d="${lens(0, 20, 5)}" transform="translate(60 36) rotate(110)"/><path d="${lens(0, 20, 5)}" transform="translate(60 36) rotate(250)"/>
  <path d="M4 36H116"/><circle class="d" cx="22" cy="31" r="1.3"/><circle class="d" cx="98" cy="31" r="1.3"/><circle class="d" cx="12" cy="33" r="1"/><circle class="d" cx="108" cy="33" r="1"/>
</svg>`;

function hero(ctx) {
  const { bi, esc, c, AD, BS, txt, on, placeLine } = ctx;
  const bsDeva = BS.day && BS.month ? `${BS.month} ${BS.day} गते, ${BS.year}` : BS.full.ne;
  const invo = txt('hero.invocation');
  const line = txt('hero.line');
  return `<div class="mh-card">
    ${mandala('mh-wm')}
    ${corner('tl')}${corner('tr')}${corner('bl')}${corner('br')}
    <div class="mh-hands"><img src="${ART}hands-sm.webp" srcset="${ART}hands-sm.webp 560w, ${ART}hands.webp 1100w" sizes="(max-width: 700px) 64vw, 300px" width="560" height="618" alt="" fetchpriority="high" decoding="async" /></div>
    <div class="mh-stack">
      <div class="mh-mark">${ctx.ganesh('mh-gan', '90px')}${on(invo) ? `<p class="mh-invo su-in">${bi(invo)}</p>` : ''}</div>
      ${on(line) ? `<p class="mh-line su-in">${bi(line)}</p>` : ''}
      <h1 class="mh-names">
        <span class="mh-n su-in">${bi(c.bride.name)}</span>
        <span class="mh-and su-in" aria-hidden="true"><span class="l-en">and</span><span class="l-ne" lang="ne">र</span></span><span class="sr-only">and</span>
        <span class="mh-n su-in">${bi(c.groom.name)}</span>
      </h1>
      <div class="mh-when su-in">
        ${dhaka('mh-when__rule')}
        <p class="mh-date">${bi({ en: `${AD.wd.en} · ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.full.ne })}</p>
        <p class="mh-alt"><span class="l-en" lang="ne">${esc(bsDeva)}</span><span class="l-ne" lang="ne">${esc(AD.full.ne)}</span></p>
        ${placeLine?.en || placeLine?.ne ? `<p class="mh-place">${bi(placeLine)}</p>` : ''}
      </div>
    </div>
  </div>`;
}

function gate(ctx) {
  const t = ctx.txt('hero.title');
  return `<div class="mh-gate"><div class="mh-gate__bg"></div>
    ${ctx.on(t) ? `<p class="mh-gate__title" lang="ne">${ctx.esc(t.ne || t.en)}</p>` : ''}
    ${dhaka('mh-gate__rule')}
    <div class="mh-gate__m">${mandala('mh-ghost')}${mandala('mh-ink', true)}</div>
  </div>`;
}

/** the cone lays each ring in turn, centre outward; then the henna sinks to a watermark and the hands arrive */
function open(ctx, tl, gateEl) {
  const ink = gateEl.querySelector('.mh-ink');
  const rings = [...ink.querySelectorAll('.mh-r')];
  let at = 0.15;
  rings.forEach((g, i) => {
    const lines = g.querySelectorAll('path, circle:not(.d)');
    const beads = g.querySelectorAll('.d');
    const k = g.classList.contains('mh-r--sweep') ? 'sweep' : g.classList.contains('mh-r--dots') ? 'dots' : 'bloom';
    const d = k === 'sweep' ? 0.55 : k === 'dots' ? 0.45 : 0.62;
    if (lines.length) tl.to(lines, { strokeDashoffset: 0, duration: d, ease: 'power1.inOut', stagger: k === 'bloom' ? { each: Math.min(0.03, 0.4 / lines.length) } : 0 }, at);
    if (beads.length) tl.fromTo(beads, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out', stagger: { each: Math.min(0.02, (k === 'dots' ? 0.4 : 0.3) / beads.length) } }, k === 'dots' ? at : at + d * 0.6);
    at += i < 3 ? 0.17 : 0.19;
  });
  const drawn = at + 0.4; // ≈ 2.4 s: the last ring has set
  tl.to(gateEl.querySelector('.mh-ghost'), { opacity: 0, duration: 0.6, ease: 'power1.out' }, drawn - 0.6);
  tl.to(gateEl.querySelectorAll('.mh-gate__title, .mh-gate__rule'), { opacity: 0, y: -8, duration: 0.6, ease: 'power2.out' }, 0.1);
  // the paper and the henna fade apart (two light layers rather than one full-screen layer full of SVG)
  tl.to(gateEl.querySelector('.mh-gate__m'), { opacity: 0, duration: 0.85, ease: 'power2.inOut' }, drawn);
  tl.to(gateEl.querySelector('.mh-gate__bg'), { opacity: 0, duration: 0.85, ease: 'power2.inOut' }, drawn);
  tl.set(gateEl, { autoAlpha: 0 }, drawn + 0.86);
  const hands = document.querySelector('.mh-hands');
  tl.fromTo(hands, { yPercent: -104 }, { yPercent: 0, duration: 1.4, ease: 'expo.out' }, drawn + 0.2);
  const gan = document.querySelector('.mh-gan');
  if (gan) tl.fromTo(gan, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power3.out' }, drawn + 0.7);
  const corners = document.querySelectorAll('.mh-card .mh-corner');
  tl.fromTo(corners, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power1.out' }, drawn + 0.6);
  return drawn + 0.65;
}

// ───────── the palm: a henna-drawn hand; its round palm mandala is the scratch cover ─────────
// the painted bridal hand (decor art/palm*.webp, Canva AI); its bare palm is an oval at PALM (fractions of the image)
const PALM = { ar: 2.5567, cx: 0.5583, cy: 0.5055, rx: 0.3433, ry: 0.1621 }; // the bare palm, an oval (rx of width, ry of height)
const HAND = `<img class="mh-handimg" src="${ART}palm-sm.webp" srcset="${ART}palm-sm.webp 480w, ${ART}palm.webp 900w" sizes="(max-width: 719px) 72vw, 330px" alt="" aria-hidden="true" decoding="async" loading="lazy" />`;
// the scratch cover: a real henna mandala laid over the bare palm
const MANDALA = new Image();
MANDALA.decoding = 'async';
MANDALA.onload = () => document.dispatchEvent(new Event('su-scratch-redraw'));
MANDALA.src = `${ART}mandala-sm.webp`;

/** the cover: dense henna on skin, a cream ribbon with the hint (never text straight on the pattern) */
function hennaPalm(c, w, h, dpr, hint) {
  // the bare palm is an oval: the cover fills it, edge to edge, up to the henna ring
  const R = Math.min(w, h) / 2; const cx = w / 2; const cy = h / 2;
  c.clearRect(0, 0, w, h);
  c.save();
  c.beginPath(); c.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); c.clip();
  const g = c.createRadialGradient(cx, cy * 0.85, R * 0.1, cx, cy, Math.max(w, h) / 2);
  g.addColorStop(0, '#F3D3B4'); g.addColorStop(1, '#E2B08C');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  if (MANDALA.complete && MANDALA.naturalWidth) c.drawImage(MANDALA, 0, 0, w, h);
  c.restore();
  // the hint, on a cream ribbon
  let fs = Math.round(Math.min(R * 0.15, 17 * dpr));
  c.font = `600 ${fs}px Mukta, sans-serif`;
  let tw = c.measureText(hint).width;
  if (tw > w * 0.78) { fs = Math.floor((fs * w * 0.78) / tw); c.font = `600 ${fs}px Mukta, sans-serif`; tw = c.measureText(hint).width; }
  const bw = Math.min(w * 0.9, tw + fs * 1.8); const bh = fs * 2.1;
  c.fillStyle = 'rgba(255,253,248,0.96)';
  c.beginPath();
  if (c.roundRect) c.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, bh / 2); else c.rect(cx - bw / 2, cy - bh / 2, bw, bh);
  c.fill();
  c.strokeStyle = 'rgba(122,46,27,0.5)'; c.lineWidth = dpr; c.stroke();
  c.fillStyle = '#7A2E1B'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(hint, cx, cy + fs * 0.06);
}

// ───────── the henna trail: one vine down the page, drawn by the scroll ─────────
function vine(ctx) {
  const { ScrollTrigger: ST } = ctx;
  const story = document.querySelector('.mh-story');
  if (!story) return;
  const NS = 'http://www.w3.org/2000/svg';
  const mq = matchMedia('(max-width: 719px)');
  let triggers = [];
  /** layout position inside the section, ignoring transforms (blocks may still be mid-reveal) */
  const box = (el, sec) => { let x = 0; let y = 0; let n = el; while (n && n !== sec) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };
  const build = () => {
    triggers.forEach((t) => t.kill()); triggers = [];
    const secs = [...story.querySelectorAll(':scope > .mh-sec')];
    const phone = mq.matches;
    secs.forEach((sec, i) => {
      sec.querySelector(':scope > .mh-seg')?.remove();
      const W = sec.clientWidth; const H = sec.offsetHeight;
      if (!W || !H) return;
      const cx = phone ? 22 : Math.round(W / 2);
      const last = i === secs.length - 1;
      const endEl = sec.querySelector('[data-vine-end]');
      const eb = endEl ? box(endEl, sec) : null;
      const y1 = eb ? Math.round(eb.y + eb.h / 2) : H;
      const x1 = eb ? Math.round(eb.x + eb.w / 2) : cx;
      const sw = (phone ? 7 : 28) * (i % 2 ? 1 : -1);
      const y = (f) => r2(y1 * f);
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'mh-seg'); svg.setAttribute('width', W); svg.setAttribute('height', H);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('aria-hidden', 'true');
      const main = document.createElementNS(NS, 'path');
      main.setAttribute('d', `M${cx} 0C${cx} ${y(0.22)} ${cx + sw} ${y(0.28)} ${cx + sw} ${y(0.5)}S${x1} ${y(0.78)} ${x1} ${r2(y1 - (endEl ? endEl.offsetHeight * 0.42 : 0))}`);
      main.setAttribute('class', 'mh-vine'); main.setAttribute('pathLength', '1');
      svg.append(main); sec.prepend(svg);
      sec.querySelectorAll(':scope > .mh-diyo').forEach((d) => d.remove());
      const sindoor = sec.hasAttribute('data-sindoor');
      const diyos = sec.hasAttribute('data-diyo');
      let red = null;
      if (sindoor) { // a sindoor trail laid beside the henna for this stretch
        red = main.cloneNode(); red.setAttribute('class', 'mh-sindoor'); red.setAttribute('transform', `translate(${phone ? 3 : 4} 2)`);
        svg.insertBefore(red, main);
      }
      const len = main.getTotalLength();
      const at = (L) => main.getPointAtLength(Math.max(0, Math.min(len, L)));
      let html = '';
      const step = phone ? 58 : 76;
      for (let L = step * 0.55, k = 0; L < len - 24; L += step, k += 1) {
        const p = at(L); const q = at(L + 2);
        const ang = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
        const side = k % 2 ? 1 : -1;
        const shape = k % 4 === 3
          ? `<path d="${PAISLEY}" transform="scale(${phone ? 0.34 : 0.42})"/>`
          : `<path d="${lens(1, phone ? 12 : 15, phone ? 3.4 : 4.2)}"/>`;
        html += `<g transform="translate(${r2(p.x)} ${r2(p.y)}) rotate(${r2(ang + side * 58 - 90)})"><g class="mh-lf" data-t="${r2(L / len)}">${shape}</g></g>`;
        if (sindoor) { const m = at(L + step / 2); html += `<g transform="translate(${r2(m.x + (k % 2 ? 7 : -2))} ${r2(m.y)})"><circle class="mh-lf mh-sd" data-t="${r2((L + step / 2) / len)}" r="${k % 3 ? 1.3 : 1.9}"/></g>`; }
      }
      sec.querySelectorAll('[data-bud]').forEach((el) => {
        const side = el.dataset.side;
        const head = el.querySelector('.mh-h') || el;
        const hr = box(head, sec); const r = box(el, sec);
        const by = Math.round(hr.y + Math.min(hr.h / 2, 34));
        let bx;
        if (phone) bx = 36;
        else if (side === 'l') bx = r.x + r.w + 38;
        else if (side === 'r') bx = r.x - 30;
        else return;
        let best = 0; let bd = 1e9;
        for (let L = 0; L <= len; L += 5) { const d = Math.abs(at(L).y - (by - (phone ? 22 : 34))); if (d < bd) { bd = d; best = L; } }
        const p = at(best); const t = r2(best / len);
        html += `<path class="mh-tendril" pathLength="1" data-t="${t}" d="M${r2(p.x)} ${r2(p.y)}C${r2(p.x)} ${r2(p.y + 14)} ${r2(bx + (p.x - bx) * 0.45)} ${by - 2} ${r2(bx)} ${by}"/>`;
        if (diyos) { // a brass diyo stands at the end of the tendril; its flame catches when the vine arrives
          sec.insertAdjacentHTML('beforeend', `<span class="mh-diyo" data-t="${t}" style="left:${r2(bx)}px;top:${by}px">${lamp('diyo', { sizes: '48px' })}</span>`);
          return;
        }
        html += `<g transform="translate(${r2(bx)} ${by})"><g class="mh-bud" data-t="${t}">${around(6, (a) => `<path d="${lens(2.5, 12, 4.4)}" transform="rotate(${a})"/>`)}<circle class="d" r="2.6"/></g></g>`;
      });
      svg.insertAdjacentHTML('beforeend', html);
      const leaves = [...svg.querySelectorAll('.mh-lf')].map((e) => ({ e, t: +e.dataset.t, on: false }));
      const tendrils = [...svg.querySelectorAll('.mh-tendril')].map((e) => ({ e, t: +e.dataset.t }));
      const buds = [...svg.querySelectorAll('.mh-bud'), ...sec.querySelectorAll(':scope > .mh-diyo')].map((e) => ({ e, t: +e.dataset.t + 0.09, on: false }));
      const flip = (o, on) => { if (on !== o.on) { o.on = on; o.e.classList.toggle('is-on', on); } };
      const paint = (pr) => {
        main.style.strokeDashoffset = String(1.0001 - pr);
        if (red) red.style.strokeDashoffset = String(1.0001 - Math.max(0, pr - 0.04) / 0.96);
        leaves.forEach((o) => flip(o, pr >= o.t));
        tendrils.forEach((o) => { o.e.style.strokeDashoffset = String(1 - Math.min(1, Math.max(0, (pr - o.t) / 0.09))); });
        buds.forEach((o) => flip(o, pr >= o.t));
      };
      if (ctx.reduced) { paint(1); return; }
      paint(0);
      triggers.push(ST.create({
        trigger: sec, start: 'top 82%', end: last ? 'bottom bottom' : 'bottom 82%', scrub: 0.6,
        onUpdate: (st) => paint(st.progress), onRefresh: (st) => paint(st.progress),
      }));
    });
  };
  build();
  initNepali(story);
  let w = innerWidth; let hgt = story.offsetHeight; let tm = 0;
  const again = () => { clearTimeout(tm); tm = setTimeout(() => { build(); initNepali(story); ST.refresh(); }, 200); };
  addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; again(); } });
  new ResizeObserver(() => { const nh = story.offsetHeight; if (Math.abs(nh - hgt) > 4) { hgt = nh; again(); } }).observe(story);
}

/** the countdown rings: each unit's circle shows how much of it is left */
function rings(ctx) {
  const target = new Date(ctx.mainEv?.start || ctx.config.weddingDate).getTime();
  const els = [...document.querySelectorAll('.mh-cd__ring')];
  const tick = () => {
    const s0 = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const f = { d: Math.min(1, Math.floor(s0 / 86400) / 365), h: Math.floor((s0 % 86400) / 3600) / 24, m: Math.floor((s0 % 3600) / 60) / 60, s: (s0 % 60) / 60 };
    els.forEach((el) => el.style.setProperty('--off', String(r2(1 - f[el.dataset.ru]))));
    return s0 > 0;
  };
  if (tick()) setInterval(tick, 1000);
}

// ───────── the page ─────────
const POL_TILT = [-3, 2.5, -1.5, 3, -2.5, 1.8, -2, 2.8, -1.2];

function page(ctx) {
  const { bi, esc, txt, on, AD, BS, c, config, placeLine, mainEv } = ctx;
  const P = ctx.parts;
  const hd = (id, t, kicker) => `<header class="mh-h">${kicker && on(kicker) ? `<p class="mh-kicker">${bi(kicker)}</p>` : ''}<h2 class="mh-h2" id="${id}">${bi(t)}</h2></header>`;
  const bsDeva = BS.day && BS.month ? `${BS.month} ${BS.day} गते, ${BS.year}` : BS.full.ne;
  const timeNe = mainEv ? String(ctx.timeLabel(mainEv).ne || '').split('–')[0].trim() : '';

  const couple = P.lead ? `
  <section class="mh-sec mh-couple" id="couple" aria-labelledby="couple-title">
    <div class="mh-sec__in">
      ${on(txt('couple.line')) ? `<div class="mh-blk mh-quote" data-side="l"><p>${bi(txt('couple.line'))}</p>${dhaka('mh-div')}</div>` : ''}
      <div class="mh-blk" data-side="r" data-bud>
        ${hd('couple-title', txt('couple.title'))}
        <figure class="mh-arch">${LOTUS}<div class="mh-arch__pic">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 719px) 78vw, 420px')}</div></figure>
      </div>
    </div>
  </section>` : '';

  const face = `<div class="mh-palm">${HAND}<div class="mh-palm__date">
      <span class="mh-pd__wd">${bi(AD.wd)}</span>
      <span class="mh-pd__day">${bi({ en: AD.day, ne: BS.day || ctx.neNum(AD.day) })}</span>
      <span class="mh-pd__my">${bi({ en: AD.monthYear.en, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</span>
      <span class="mh-pd__alt"><span class="l-en" lang="ne">${esc(bsDeva)}</span><span class="l-ne" lang="ne">${esc(AD.full.ne)}</span></span>
      ${mainEv ? `<span class="mh-pd__time">${bi({ en: AD.time, ne: timeNe })}</span>` : ''}
    </div></div>`;
  const dateSec = `
  <section class="mh-sec mh-dates" id="date" aria-labelledby="date-title">
    <div class="mh-sec__in">
      <div class="mh-blk mh-palmblk" data-side="l" data-bud>
        ${hd('date-title', txt('date.title'), txt('date.kicker'))}
        ${P.scratch(face, 'mh-scratch')}
        ${placeLine?.en || placeLine?.ne ? `<p class="mh-place2">${bi(placeLine)}</p>` : ''}
      </div>
      <div class="mh-blk mh-count su-rise" id="count" data-side="r" data-bud data-countdown>
        <header class="mh-h"><h3 class="mh-h3">${bi(txt('count.title'))}</h3></header>
        <ol class="mh-cd__grid su-count__grid" aria-label="${esc(txt('count.title').en)}">
          ${P.countUnits.map(({ u, label }) => `<li class="mh-cd">
            <svg class="mh-cd__svg" viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
              ${dots(24, 46.5, 0.9)}<circle class="mh-cd__track" r="40"/><circle class="mh-cd__ring" data-ru="${u}" r="40" pathLength="1" transform="rotate(-90)"/><circle class="mh-cd__in" r="34"/>
            </svg>
            <span class="mh-cd__n">${P.countNum(u)}</span><span class="mh-cd__l">${bi(label)}</span></li>`).join('')}
        </ol>
        <p class="mh-count__done" data-count-done hidden></p>
      </div>
    </div>
  </section>`;

  const fam = (f) => `<p class="mh-kicker">${bi(f.label)}</p>
    ${P.brideGroom ? `<figure class="mh-fam__pic">${ctx.imgTag(f.photo, f.person.name.en, '150px')}</figure>` : ''}
    <p class="mh-fam__name">${bi(f.person.fullName)}</p>
    ${f.person.parents?.en || f.person.parents?.ne ? `<p class="mh-fam__of">${bi(f.of)}</p><p class="mh-fam__parents">${bi(f.person.parents)}</p>` : ''}
    ${f.person.home?.en || f.person.home?.ne ? `<p class="mh-fam__home">${bi(f.person.home)}</p>` : ''}`;
  const famSec = `
  <section class="mh-sec mh-fams" id="families" aria-labelledby="fam-title" data-diyo>
    <div class="mh-sec__in">
      <div class="mh-blk" data-side="l" data-bud>${hd('fam-title', txt('families.title'))}</div>
      <div class="mh-blk mh-fam" data-side="c">
        <div class="mh-fam__side mh-fam__side--a">${fam(P.families[0])}</div>
        <div class="mh-fam__m" aria-hidden="true"><div class="mh-fam__half mh-fam__half--a">${mandala('mh-fm')}</div><div class="mh-fam__half mh-fam__half--b">${mandala('mh-fm')}</div>${kalash('mh-fam__kalash', '120px')}</div>
        <div class="mh-fam__side mh-fam__side--b">${fam(P.families[1])}</div>
      </div>
    </div>
  </section>`;


  const bondLine = txt('bond.line');
  const bondSec = `
  <section class="mh-sec mh-bond" id="bond" aria-labelledby="bond-title" data-sindoor data-diyo>
    <div class="mh-sec__in">
      <div class="mh-blk mh-bond__words" data-side="l" data-bud>
        <header class="mh-h"><p class="mh-kicker">${bi(txt('bond.kicker'))}</p></header>
        ${on(bondLine) ? `<p class="mh-bond__line" id="bond-title">${bi(bondLine)}</p>` : `<p class="sr-only" id="bond-title">${bi(txt('bond.kicker'))}</p>`}
        ${dhaka('mh-div')}
      </div>
      <div class="mh-blk mh-bond__art" data-side="r">
        <figure class="mh-bond__fig">${sindoorDaan('mh-bond__pic', '(max-width: 719px) 80vw, 440px', 'The groom places sindoor in the bride’s parting')}</figure>
      </div>
    </div>
  </section>`;

  const evs = P.events.map((v, k) => `
      <article class="mh-blk mh-ev" data-side="${k % 2 ? 'l' : 'r'}" data-bud id="ev-${esc(v.id)}">
        ${corner('tl')}${corner('br')}
        <div class="mh-ev__top mh-h">
          <p class="mh-ev__date" aria-hidden="true"><b>${bi({ en: v.ad.day, ne: v.bs.day || ctx.neNum(v.ad.day) })}</b><span>${bi({ en: v.ad.month.en.slice(0, 3), ne: v.bs.month || v.ad.month.ne })}</span></p>
          <h3 class="mh-ev__title">${bi(v.title)}</h3>
        </div>
        <p class="mh-ev__when">${bi({ en: v.ad.full.en, ne: v.bs.full.ne })}</p>
        <p class="mh-ev__time">${bi(v.time)}</p>
        ${v.blurb ? `<p class="mh-ev__blurb">${bi(v.blurb)}</p>` : ''}
        <p class="mh-ev__venue">${bi(v.venue)} <a class="su-link" href="${esc(v.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
        ${v.dress.colors.length || v.dress.text?.en || v.dress.text?.ne ? `<p class="mh-ev__dress">${v.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${v.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(v.dress.text?.en || v.dress.text?.ne ? v.dress.text : P.UI.wear)}</span></p>` : ''}
        ${v.rituals.length ? `<details class="mh-order"><summary>${bi(P.UI.order)}</summary><ol>${v.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
      </article>`).join('');
  const progSec = `
  <section class="mh-sec mh-prog" id="programme" aria-labelledby="prog-title" data-diyo>
    <div class="mh-sec__in">
      <div class="mh-blk" data-side="l" data-bud>${hd('prog-title', txt('prog.title'), txt('prog.kicker'))}</div>
      ${evs}
      <div class="mh-blk mh-prog__foot" data-side="${P.events.length % 2 ? 'l' : 'r'}">
        <div class="mh-btns">${P.calendarBtn()}${P.shareBtn()}</div>
        ${P.moreInfo()}
      </div>
    </div>
  </section>`;

  const photoSec = P.photos.length ? `
  <section class="mh-sec mh-photos" id="photos" aria-labelledby="gal-title">
    <div class="mh-sec__in">
      <div class="mh-blk" data-side="r" data-bud>${hd('gal-title', txt('gallery.title'))}</div>
      <div class="mh-blk mh-cloth" data-side="c">
        ${dhaka('mh-cloth__edge')}
        <div class="mh-pols">${P.photos.map((g, i) => `<figure class="mh-pol" style="--r:${POL_TILT[i % POL_TILT.length]}deg">${P.photoBtn(g, i, '(max-width: 719px) 42vw, 300px', 'mh-pol__btn')}</figure>`).join('')}</div>
        ${dhaka('mh-cloth__edge')}
      </div>
    </div>
  </section>` : '';

  const rsvpSec = `
  <section class="mh-sec mh-reply" id="rsvp" aria-labelledby="rsvp-title">
    <div class="mh-sec__in">
      <div class="mh-blk mh-word" id="card" data-side="l" data-bud>
        <div class="mh-h">${mandala('mh-crest', false, [0, 1, 2, 3, 4])}</div>
        <p class="mh-word__line">${bi(txt('card.line'))}</p>
        <p class="mh-word__hosts">${bi(config.hosts)}</p>
        ${P.cardBtn()}
      </div>
      <div class="mh-blk mh-rsvp" data-side="r" data-bud>
        ${toran('mh-rsvp__toran', '(max-width: 719px) 100vw, 560px')}
        ${corner('bl')}${corner('br')}
        ${hd('rsvp-title', txt('rsvp.title'))}
        ${P.deadline?.en || P.deadline?.ne ? `<p class="mh-rsvp__by">${bi(P.deadline)}</p>` : ''}
        ${P.rsvpForm()}
      </div>
    </div>
  </section>`;

  const closing = `
  <footer class="mh-sec mh-close" aria-label="Blessing">
    <div class="mh-sec__in">
      <div class="mh-blk mh-close__in" data-side="c">
        <div class="mh-close__flower" data-vine-end>${FLOWER}</div>
        <p class="mh-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
        <p class="mh-close__en l-en">${esc(config.closing?.en || '')}</p>
        <p class="mh-close__names"><span>${bi(c.bride.name)}</span><span class="mh-close__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span><span>${bi(c.groom.name)}</span></p>
        ${c.hashtag ? `<p class="mh-close__tag">${esc(c.hashtag)}</p>` : ''}
      </div>
    </div>
    <div class="mh-close__dhaka" aria-hidden="true"></div>
    ${P.madeWith()}
  </footer>`;

  return `
  <section class="su-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${hero(ctx)}
    ${P.cue(P.lead ? 'couple' : 'date')}
  </section>
  <div class="mh-story">${couple}${dateSec}${famSec}${bondSec}${progSec}${photoSec}${rsvpSec}${closing}</div>`;
}

/** the scroll: the vine draws, the hands tilt, the families' mandala closes, the polaroids lift */
function scroll(ctx) {
  vine(ctx);
  if (ctx.reduced) return;
  const { gsap } = ctx;
  const st = (trigger, extra = {}) => ({ trigger, start: 'top top', end: 'bottom top', scrub: 0.5, ...extra });
  gsap.to('.mh-hands', { rotationX: 18, rotationY: -10, z: -40, transformPerspective: 900, transformOrigin: '50% 0%', ease: 'none', scrollTrigger: st('#top') });
  if (document.querySelector('.mh-gan')) gsap.to('.mh-gan', { y: () => window.innerHeight * 0.1, ease: 'none', scrollTrigger: st('#top') });

  document.querySelectorAll('.mh-story .mh-blk:not(.mh-fam):not(.mh-cloth):not(.su-rise):not(.mh-bond__art)').forEach((el) => {
    const side = el.dataset.side;
    gsap.from(el, { x: side === 'l' ? -32 : side === 'r' ? 32 : 0, y: 26, opacity: 0, duration: 0.9, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  const mm = gsap.matchMedia();
  const fam = (axis, d) => {
    const prop = axis === 'x' ? 'xPercent' : 'yPercent';
    const t = { trigger: '.mh-fam', start: 'top 85%', end: 'center 55%', scrub: 0.6 };
    gsap.fromTo('.mh-fam__half--a', { [prop]: -d }, { [prop]: 0, ease: 'none', scrollTrigger: t });
    gsap.fromTo('.mh-fam__half--b', { [prop]: d }, { [prop]: 0, ease: 'none', scrollTrigger: t });
    gsap.fromTo('.mh-fam__side--a', { [axis]: axis === 'x' ? -50 : -24, opacity: 0.15 }, { [axis]: 0, opacity: 1, ease: 'none', scrollTrigger: t });
    gsap.fromTo('.mh-fam__kalash', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, ease: 'none', scrollTrigger: { ...t, start: 'top 70%' } });
    gsap.fromTo('.mh-fam__side--b', { [axis]: axis === 'x' ? 50 : 24, opacity: 0.15 }, { [axis]: 0, opacity: 1, ease: 'none', scrollTrigger: t });
  };
  mm.add('(min-width: 720px)', () => fam('x', 26));
  mm.add('(max-width: 719px)', () => fam('y', 22));

  // the sindoor daan rises, gently, in 3D as the vine reaches it
  gsap.fromTo('.mh-bond__fig', { rotationX: 26, rotationY: -8, y: 90, scale: 0.9, opacity: 0, transformPerspective: 1000, transformOrigin: '50% 100%' },
    { rotationX: 0, rotationY: 0, y: 0, scale: 1, opacity: 1, ease: 'power1.out', scrollTrigger: { trigger: '.mh-bond', start: 'top 82%', end: 'center 58%', scrub: 0.6 } });

  document.querySelectorAll('.mh-pol').forEach((el, i) => {
    const r = POL_TILT[i % POL_TILT.length];
    gsap.fromTo(el, { rotationX: 32, rotation: r * 3, y: 70, scale: 0.92, opacity: 0, transformPerspective: 800, transformOrigin: '50% 100%' },
      { rotationX: 0, rotation: r, y: 0, scale: 1, opacity: 1, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 100%', end: 'top 62%', scrub: 0.5 } });
  });
}

mountSuite({
  slug: 'mehendi',
  manifest,
  gate,
  hero,
  page,
  open,
  scroll,
  scratch: { paint: hennaPalm },
  ready(ctx) { rings(ctx); initNepali(); },
  gateTap(ctx, go) {
    document.querySelector('.mh-gate__m')?.addEventListener('click', go);
  },
  ambient(ctx) {
    // the watermark turns only while the hero is on screen: an endless transform loop at the top of the page
    // otherwise keeps everything below it in extra GPU layers
    const wm = document.querySelector('.mh-card .mh-wm');
    if (ctx.reduced || !wm) return;
    new IntersectionObserver(([e]) => wm.classList.toggle('is-turning', e.isIntersecting)).observe(document.getElementById('top'));
  },
});
