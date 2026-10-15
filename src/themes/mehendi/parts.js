// Mehendi's pieces, shared by its own page (main.js) and by its gate and hero modules (gate.js, hero.js), which can run
// on another theme's page (docs/MIX.md). Markup builders take the same ctx the suite engine passes to T.gate/T.hero.
// The class prefix is md- (Mahal owns mh-), so a Mehendi part and a Mahal part can share a page.
import { gsap } from 'gsap';

export const ART = '/themes/mehendi/art/';
export const r2 = (n) => Math.round(n * 100) / 100;
export const pol = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [r2(r * Math.cos(a)), r2(r * Math.sin(a))]; };

// ───────── the mandala (viewBox -200 -200 400 400), built ring by ring ─────────
/** a lens petal pointing outward along +y, from r0 to r1, half-width w */
export const lens = (r0, r1, w) => { const h = r1 - r0; return `M0 ${r0}C${w} ${r2(r0 + h * 0.28)} ${r2(w * 0.62)} ${r2(r1 - h * 0.18)} 0 ${r1}C${r2(-w * 0.62)} ${r2(r1 - h * 0.18)} ${-w} ${r2(r0 + h * 0.28)} 0 ${r0}Z`; };
/** a paisley (mango) whose bulb sits at r and tip curls clockwise, 36 units long */
export const PAISLEY = 'M6 36C0 31-11 24-11 12C-11 3-5-1 0-1C6-1 11 4 11 11C11 20 4 22 4 28C4 32 6 34 6 36Z';
export const PAISLEY_IN = 'M3 26C-2 23-6 18-6 12C-6 7-3 4 0 4C4 4 6 7 6 11C6 16 3 18 3 22';
export const around = (n, fn, off = 0) => Array.from({ length: n }, (_, i) => fn((360 / n) * i + off, i)).join('');
export const ln = (d, a, extra = '') => `<path d="${d}" transform="rotate(${r2(a + 180)})${extra}" pathLength="1"/>`; // +180: the cone starts at the top
export const ring = (r) => `<circle r="${r}" transform="rotate(-90)" pathLength="1"/>`;
export const dots = (n, r, s, off = 0) => around(n, (a) => { const [x, y] = pol(r, a); return `<circle class="d" cx="${x}" cy="${y}" r="${s}"/>`; }, off);
export const scallops = (n, r0, r1) => {
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const a0 = (360 / n) * i; const a1 = a0 + 360 / n; const am = (a0 + a1) / 2;
    const [x0, y0] = pol(r0, a0); const [cx, cy] = pol(r1, am); const [x1, y1] = pol(r0, a1);
    d += `${i ? '' : `M${x0} ${y0}`}Q${cx} ${cy} ${x1} ${y1}`;
  }
  return `<path d="${d}" pathLength="1"/>`;
};
/** scallops along a quarter arc about the corner (0,0) */
export const scallopArc = (r0, r1, n) => {
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
export const RINGS = [
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
export const mandala = (cls, draw = false, only = null) => `<svg class="md-mandala ${cls}" viewBox="${only ? '-104 -104 208 208' : '-200 -200 400 400'}" aria-hidden="true" focusable="false">
  ${RINGS.map((r, i) => (only && !only.includes(i) ? '' : `<g class="md-r md-r--${r.k}" data-ring="${i}">${r.h}</g>`)).join('')}
</svg>`.replace(/ pathLength="1"/g, draw ? ' pathLength="1"' : '');

// ───────── small henna ornaments ─────────
/** a Dhaka (ढाका) line: the woven diamond chain, tapering at both ends */
export const dhaka = (cls = '') => `<svg class="md-dhaka ${cls}" viewBox="0 0 220 16" aria-hidden="true" focusable="false">
  <path d="M2 8H52M168 8H218" stroke-width=".8"/>
  ${[0, 1, 2, 3, 4, 5, 6].map((i) => { const x = 62 + i * 16; const s = i === 3 ? 7 : i % 2 ? 5 : 4; return `<path d="M${x} ${8 - s}L${x + s} 8L${x} ${8 + s}L${x - s} 8Z"/>${i < 6 ? `<circle class="d" cx="${x + 8}" cy="8" r="1"/>` : ''}`; }).join('')}
  <circle class="d" cx="56" cy="8" r="1.3"/><circle class="d" cx="164" cy="8" r="1.3"/>
</svg>`;
/** a henna corner: a quarter rosette in the corner, a scalloped band, a vine with leaves along both edges */
export const cornerEdge = `<path d="M50 9C62 3 72 13 84 8S104 3 114 7"/>
  ${[[58, 5, -150], [70, 9, -30], [82, 7, -150], [95, 5, -30]].map(([x, y, a]) => `<path d="${lens(0, 9, 2.6)}" transform="translate(${x} ${y}) rotate(${a})"/>`).join('')}
  <circle class="d" cx="117" cy="7" r="1.5"/><circle class="d" cx="110" cy="12" r=".9"/><circle class="d" cx="104" cy="14" r=".7"/>`;
export const corner = (pos) => `<svg class="md-corner md-corner--${pos}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
  <path d="M30 0A30 30 0 0 1 0 30M36 0A36 36 0 0 1 0 36"/>
  ${scallopArc(36, 44, 5)}
  ${[20, 45, 70].map((f) => `<path d="${lens(5, f === 45 ? 27 : 22, f === 45 ? 6 : 5)}" transform="rotate(${f - 90})"/>`).join('')}
  ${[12, 26, 40, 54, 68, 82].map((f) => { const r = 50; return `<circle class="d" cx="${r2(r * Math.cos(f * Math.PI / 180))}" cy="${r2(r * Math.sin(f * Math.PI / 180))}" r="1.1"/>`; }).join('')}
  ${cornerEdge}<g transform="matrix(0 1 1 0 0 0)">${cornerEdge}</g>
</svg>`;
/** a small henna flower between the two families */
export const FLOWER = `<svg class="md-flower" viewBox="-40 -40 80 80" aria-hidden="true" focusable="false">
  <circle class="d" r="2.6"/><circle r="6.5"/>${around(8, (a) => `<path d="${lens(8.5, 27, 6.5)}" transform="rotate(${a})"/><path d="${lens(12, 22, 2.4)}" transform="rotate(${a})"/>`)}
  ${dots(8, 31, 1.4, 22.5)}${dots(8, 34.5, 1.8)}
</svg>`;
/** a small henna lotus, sitting on the top edge of the couple's frame */
export const LOTUS = `<svg class="md-lotus" viewBox="0 0 120 40" aria-hidden="true" focusable="false">
  <path d="${lens(0, 30, 7)}" transform="translate(60 36) rotate(180)"/>
  <path d="${lens(0, 26, 6)}" transform="translate(60 36) rotate(140)"/><path d="${lens(0, 26, 6)}" transform="translate(60 36) rotate(220)"/>
  <path d="${lens(0, 20, 5)}" transform="translate(60 36) rotate(110)"/><path d="${lens(0, 20, 5)}" transform="translate(60 36) rotate(250)"/>
  <path d="M4 36H116"/><circle class="d" cx="22" cy="31" r="1.3"/><circle class="d" cx="98" cy="31" r="1.3"/><circle class="d" cx="12" cy="33" r="1"/><circle class="d" cx="108" cy="33" r="1"/>
</svg>`;

/** the hero: the henna card, joined hands at the top, the names in the middle */
export function heroHtml(ctx) {
  const { bi, esc, c, AD, BS, txt, on, placeLine } = ctx;
  const bsDeva = BS.day && BS.month ? `${BS.month} ${BS.day} गते, ${BS.year}` : BS.full.ne;
  const invo = txt('hero.invocation');
  const line = txt('hero.line');
  return `<div class="md-card">
    ${mandala('md-wm')}
    ${corner('tl')}${corner('tr')}${corner('bl')}${corner('br')}
    <div class="md-hands"><img src="${ART}hands-sm.webp" srcset="${ART}hands-sm.webp 560w, ${ART}hands.webp 1100w" sizes="(max-width: 700px) 64vw, 300px" width="560" height="618" alt="" fetchpriority="high" decoding="async" /></div>
    <div class="md-stack">
      <div class="md-mark">${ctx.ganesh('md-gan', '90px')}${on(invo) ? `<p class="md-invo su-in">${bi(invo)}</p>` : ''}</div>
      ${on(line) ? `<p class="md-line su-in">${bi(line)}</p>` : ''}
      <h1 class="md-names">
        <span class="md-n su-in">${bi(c.bride.name)}</span>
        <span class="md-and su-in" aria-hidden="true"><span class="l-en">and</span><span class="l-ne" lang="ne">र</span></span><span class="sr-only">and</span>
        <span class="md-n su-in">${bi(c.groom.name)}</span>
      </h1>
      <div class="md-when su-in">
        ${dhaka('md-when__rule')}
        <p class="md-date">${bi({ en: `${AD.wd.en} · ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.full.ne })}</p>
        <p class="md-alt"><span class="l-en" lang="ne">${esc(bsDeva)}</span><span class="l-ne" lang="ne">${esc(AD.full.ne)}</span></p>
        ${placeLine?.en || placeLine?.ne ? `<p class="md-place">${bi(placeLine)}</p>` : ''}
      </div>
    </div>
  </div>`;
}

/** the gate: plain ivory, the title, and the henna mandala waiting as a faint pencil guide */
export function gateScene(ctx) {
  const t = ctx.txt('hero.title');
  return `<div class="md-gate"><div class="md-gate__bg"></div>
    ${ctx.on(t) ? `<p class="md-gate__title" lang="ne">${ctx.esc(t.ne || t.en)}</p>` : ''}
    ${dhaka('md-gate__rule')}
    <div class="md-gate__m">${mandala('md-ghost')}${mandala('md-ink', true)}</div>
  </div>`;
}

/** The cone lays each ring in turn, centre outward; then the paper and the henna fade apart. Returns when the
 *  last ring has set (≈ 2.4 s), which is when the paper starts to clear. */
export function gateExit(tl, gateEl) {
  const ink = gateEl.querySelector('.md-ink');
  const rings = [...ink.querySelectorAll('.md-r')];
  let at = 0.15;
  rings.forEach((g, i) => {
    const lines = g.querySelectorAll('path, circle:not(.d)');
    const beads = g.querySelectorAll('.d');
    const k = g.classList.contains('md-r--sweep') ? 'sweep' : g.classList.contains('md-r--dots') ? 'dots' : 'bloom';
    const d = k === 'sweep' ? 0.55 : k === 'dots' ? 0.45 : 0.62;
    if (lines.length) tl.to(lines, { strokeDashoffset: 0, duration: d, ease: 'power1.inOut', stagger: k === 'bloom' ? { each: Math.min(0.03, 0.4 / lines.length) } : 0 }, at);
    if (beads.length) tl.fromTo(beads, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power1.out', stagger: { each: Math.min(0.02, (k === 'dots' ? 0.4 : 0.3) / beads.length) } }, k === 'dots' ? at : at + d * 0.6);
    at += i < 3 ? 0.17 : 0.19;
  });
  const drawn = at + 0.4; // ≈ 2.4 s: the last ring has set
  tl.to(gateEl.querySelector('.md-ghost'), { opacity: 0, duration: 0.6, ease: 'power1.out' }, drawn - 0.6);
  tl.to(gateEl.querySelectorAll('.md-gate__title, .md-gate__rule'), { opacity: 0, y: -8, duration: 0.6, ease: 'power2.out' }, 0.1);
  // the paper and the henna fade apart (two light layers rather than one full-screen layer full of SVG)
  tl.to(gateEl.querySelector('.md-gate__m'), { opacity: 0, duration: 0.85, ease: 'power2.inOut' }, drawn);
  tl.to(gateEl.querySelector('.md-gate__bg'), { opacity: 0, duration: 0.85, ease: 'power2.inOut' }, drawn);
  return drawn;
}

/** The card comes alive from `at`: the joined hands glide down from the top edge, the corners ink in, Ganesh appears.
 *  (Mehendi's own opening calls it 0.2 s after the mandala has set.) */
export function heroEnter(tl, at, root) {
  if (!root) return;
  const hands = root.querySelector('.md-hands');
  if (hands) tl.fromTo(hands, { yPercent: -104 }, { yPercent: 0, duration: 1.4, ease: 'expo.out' }, at);
  const gan = root.querySelector('.md-gan');
  if (gan) tl.fromTo(gan, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power3.out' }, at + 0.5);
  const corners = root.querySelectorAll('.md-card .md-corner');
  if (corners.length) tl.fromTo(corners, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power1.out' }, at + 0.4);
}

/** as the card leaves the screen the hands tilt back and Ganesh drifts a little (scrubbed to the scroll) */
export function heroScroll(root) {
  const hands = root?.querySelector('.md-hands');
  if (!hands) return;
  const st = { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.5 };
  gsap.to(hands, { rotationX: 18, rotationY: -10, z: -40, transformPerspective: 900, transformOrigin: '50% 0%', ease: 'none', scrollTrigger: st });
  const gan = root.querySelector('.md-gan');
  if (gan) gsap.to(gan, { y: () => window.innerHeight * 0.1, ease: 'none', scrollTrigger: { ...st } });
}

/** the watermark turns only while the card is on screen: an endless transform loop at the top of the page otherwise
 *  keeps everything below it in extra GPU layers */
export function heroAmbient(root, reduced) {
  const wm = root?.querySelector('.md-card .md-wm');
  if (reduced || !wm) return;
  new IntersectionObserver(([e]) => wm.classList.toggle('is-turning', e.isIntersecting)).observe(root);
}
