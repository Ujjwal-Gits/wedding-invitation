// Mahal (महल) · the art, drawn in code for the exact screen size (nothing is ever cropped):
// the golden gate (wrought-gold leaves, arch, transom and crest), the satin ribbon and bow that tie it shut,
// and, behind it, the palace balcony at night (sky, a lit palace over a long pool, a marble balustrade with
// lanterns, the marble floor with a lapis band, red velvet curtains and a crystal chandelier).
// Gate units: the gate is 1000 units wide; S is its spring line (where the arch meets the posts).
import { rosette } from './art.js';

const f = (v) => Math.round(v * 10) / 10;

/** seeded random, so a layout never shimmers between rebuilds */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export const MH_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
  <linearGradient id="mhGold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="150" y2="210" spreadMethod="reflect">
    <stop offset="0" stop-color="#7C4E0E"/><stop offset=".22" stop-color="#D9A43E"/><stop offset=".42" stop-color="#FFF1B4"/>
    <stop offset=".58" stop-color="#F0C458"/><stop offset=".8" stop-color="#A86F1A"/><stop offset="1" stop-color="#6A420B"/>
  </linearGradient>
  <linearGradient id="mhPost" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#5E3A08"/><stop offset=".18" stop-color="#C9922E"/><stop offset=".36" stop-color="#FFEFB0"/>
    <stop offset=".55" stop-color="#E3AE48"/><stop offset=".84" stop-color="#94600F"/><stop offset="1" stop-color="#553306"/>
  </linearGradient>
  <linearGradient id="mhCap" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="#FFF0B8"/><stop offset=".3" stop-color="#E6B24C"/><stop offset=".62" stop-color="#B07A20"/><stop offset="1" stop-color="#6A420B"/>
  </linearGradient>
  <linearGradient id="mhPanel" x1="0" x2="1" y1="0" y2="1">
    <stop offset="0" stop-color="#E9B954"/><stop offset=".45" stop-color="#C48A2A"/><stop offset="1" stop-color="#8A5812"/>
  </linearGradient>
  <linearGradient id="mhPanel2" x1="0" x2="1" y1="0" y2="1">
    <stop offset="0" stop-color="#FFF0B6"/><stop offset=".35" stop-color="#EDC060"/><stop offset=".7" stop-color="#C99030"/><stop offset="1" stop-color="#9C6716"/>
  </linearGradient>
  <radialGradient id="mhDisk" cx=".38" cy=".32" r=".8">
    <stop offset="0" stop-color="#FFF6CC"/><stop offset=".35" stop-color="#F0C35A"/><stop offset=".75" stop-color="#B57D22"/><stop offset="1" stop-color="#714609"/>
  </radialGradient>
  <linearGradient id="mhMarble" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#ECE6DB"/><stop offset="1" stop-color="#BEB2A0"/>
  </linearGradient>
  <linearGradient id="mhBaluster" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#A99C88"/><stop offset=".3" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#E6DFD3"/><stop offset="1" stop-color="#9C8F7B"/>
  </linearGradient>
  <linearGradient id="mhLapis" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="#2A54B5"/><stop offset=".5" stop-color="#173B8E"/><stop offset="1" stop-color="#0F2A6A"/>
  </linearGradient>
  <radialGradient id="mhGlass" cx=".5" cy=".55" r=".6">
    <stop offset="0" stop-color="#FFFBE6"/><stop offset=".45" stop-color="#FFD979"/><stop offset="1" stop-color="#E08F24"/>
  </radialGradient>
  <linearGradient id="mhVelvetV" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="#3A0207" stop-opacity=".7"/><stop offset=".3" stop-color="#3A0207" stop-opacity="0"/>
    <stop offset=".8" stop-color="#3A0207" stop-opacity=".05"/><stop offset="1" stop-color="#2A0105" stop-opacity=".55"/>
  </linearGradient>
  <radialGradient id="mhWarm" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#FFD58A" stop-opacity=".55"/><stop offset=".5" stop-color="#F7A947" stop-opacity=".16"/><stop offset="1" stop-color="#F7A947" stop-opacity="0"/>
  </radialGradient>
</defs></svg>`;

// ───────────────────────── metal: every gold stroke is drawn as a bevel (shadow, gold, highlight) ─────────────────────────
function strokes() {
  const by = {};
  return {
    add(w, d) { by[w] = (by[w] || '') + d; },
    svg() {
      let s = ''; let m = ''; let h = '';
      for (const [w, d] of Object.entries(by)) {
        const ww = +w;
        s += `<path d="${d}" stroke-width="${f(ww + 3)}"/>`;
        m += `<path d="${d}" stroke-width="${ww}"/>`;
        h += `<path d="${d}" stroke-width="${f(Math.max(1.4, ww * 0.24))}"/>`;
      }
      return `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#1C0E01" stroke-opacity=".55" transform="translate(3 4)">${s}</g><g stroke="url(#mhGold)">${m}</g><g stroke="#FFF7D6" stroke-opacity=".62" transform="translate(-1.6 -1.8)">${h}</g></g>`;
    },
  };
}

/** a wrought-iron scroll: an Archimedean spiral from its outer point inward */
function spiral(cx, cy, r, a0, turns, dir, steps = 44) {
  let d = '';
  const tot = turns * Math.PI * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + dir * t * tot;
    const rr = r * (1 - 0.8 * t);
    d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`;
  }
  return d;
}
const ell = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}`;

// ───────────────────────── The gate ─────────────────────────
export function gateGeo(W, H) {
  const full = W / H < 0.8;
  const gw = full ? W : Math.round(Math.min(W * 0.6, H * 0.74));
  const u = gw / 1000;
  const Hu = H / u;
  const S = 530;
  const F = Hu - 40;
  const leafTop = S + 26;
  const dh = F - leafTop;
  return { W, H, full, gw, u, gx: Math.round((W - gw) / 2), Hu, S, F, leafTop, dh, mR: 120, yc: S - 320, leaf: leafGeo(dh) };
}

export function leafGeo(h) {
  const t1 = Math.max(90, h * 0.085);
  const t2 = h * 0.74;
  const t3 = t2 - Math.min(h * 0.06, 70);
  const ry = Math.min(150, (t3 - t1) * 0.27);
  const rx = Math.min(132, ry * 0.9);
  const my = t1 + (t3 - t1) * 0.45;
  return { h, t1, t2, t3, rx, ry, my };
}

/** One gate leaf, 410 units wide (the left one; the right is its mirror). */
export function leafSVG(G, side, px) {
  const { h, t1, t2, t3, rx, ry, my } = G.leaf;
  const M = strokes();
  M.add(22, `M11 11H399V${f(h - 11)}H11Z`);
  M.add(30, `M398 11V${f(h - 11)}`);
  M.add(12, `M11 ${f(t1)}H399`);
  M.add(8, `M11 ${f(t3)}H399`);
  M.add(14, `M11 ${f(t2)}H399`);
  // an arcade under the top rail
  const aw = 388 / 5;
  let arc = '';
  for (let i = 0; i < 5; i++) arc += `M${f(11 + i * aw)} ${f(t1)}A${f(aw / 2)} ${f(aw / 2)} 0 0 1 ${f(11 + (i + 1) * aw)} ${f(t1)}`;
  M.add(6, arc);
  // the bars, with collars
  const xs = [1, 2, 3, 4, 5].map((i) => 11 + (388 * i) / 6);
  M.add(8, xs.map((x) => `M${f(x)} ${f(t1)}V${f(t3)}`).join(''));
  let fills = '';
  for (const x of xs) {
    for (const y of [t1 + (t3 - t1) * 0.09, t3 - (t3 - t1) * 0.09]) fills += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="12" ry="7"/>`;
  }
  // the medallion, ringed with beads and rays, and four scrolls around it
  M.add(14, ell(205, my, rx, ry));
  M.add(6, ell(205, my, rx - 28, ry - 28));
  let rays = '';
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    rays += `M${f(205 + Math.cos(a) * (rx - 26))} ${f(my + Math.sin(a) * (ry - 26))}L${f(205 + Math.cos(a) * (rx - 8))} ${f(my + Math.sin(a) * (ry - 8))}`;
  }
  M.add(5, rays);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const r = Math.min(44, rx * 0.36);
      const cx = 205 + sx * (rx + 26); const cy = my + sy * ry * 0.62;
      const dir = sx * (sy < 0 ? 1 : -1);
      const a0 = sy < 0 ? -Math.PI / 2 : Math.PI / 2;
      const p0 = [205 + sx * rx * 0.3, my + sy * ry * 0.96];
      const sp = spiral(cx, cy, r, a0, 1.3, dir).replace(/^M/, 'L');
      M.add(9, `M${f(p0[0])} ${f(p0[1])}C${f(p0[0] + sx * rx * 0.35)} ${f(p0[1] + sy * 40)} ${f(cx - sx * r * 0.2)} ${f(cy + sy * r * 1.25)} ${f(cx)} ${f(cy + sy * r)}${sp}`);
      // a smaller scroll curling back toward the bars
      M.add(6, spiral(205 + sx * rx * 0.62, my + sy * (ry + 34), 20, sy < 0 ? Math.PI / 2 : -Math.PI / 2, 1.2, -dir));
    }
  }
  // a band of lyre scrolls above the kick panel
  const edges = [11, ...xs, 399];
  let lyre = '';
  const lr = Math.min(15, (t2 - t3) * 0.3);
  for (let i = 0; i < 6; i++) {
    const c = (edges[i] + edges[i + 1]) / 2; const cy = (t2 + t3) / 2;
    lyre += spiral(c - lr * 1.05, cy, lr, -Math.PI / 2, 1.1, -1, 26) + spiral(c + lr * 1.05, cy, lr, -Math.PI / 2, 1.1, 1, 26);
  }
  M.add(5, lyre);
  // the handle on the meeting stile
  M.add(7, ell(372, h * 0.52, 22, 22));
  const kc = (t2 + h) / 2; const kr = Math.min(58, (h - t2) * 0.27);
  const panel = `<rect x="11" y="${f(t2)}" width="388" height="${f(h - 11 - t2)}" fill="url(#mhPanel)"/>
    <rect x="42" y="${f(t2 + 26)}" width="326" height="${f(Math.max(10, h - t2 - 64))}" rx="6" fill="url(#mhPanel2)"/>
    <path d="M44 ${f(h - 40)}V${f(t2 + 28)}H366" fill="none" stroke="#FFF4C8" stroke-opacity=".7" stroke-width="3"/>
    <path d="M366 ${f(t2 + 28)}V${f(h - 40)}H44" fill="none" stroke="#5A3606" stroke-opacity=".55" stroke-width="3"/>
    <ellipse cx="205" cy="${f(kc)}" rx="${f(kr * 1.9)}" ry="${f(kr)}" fill="url(#mhDisk)" stroke="#5A3606" stroke-width="2.5"/>`;
  const plate = `<rect x="360" y="${f(h * 0.52 - 70)}" width="24" height="56" rx="8" fill="url(#mhCap)" stroke="#5A3606" stroke-width="1.5"/>`;
  const disk = `<ellipse cx="205" cy="${f(my)}" rx="${f((rx - 28) * 0.62)}" ry="${f((ry - 28) * 0.62)}" fill="url(#mhDisk)" stroke="#5A3606" stroke-width="2"/>`;
  const beads = `<path d="${ell(205, my, rx - 17, ry - 17)}" fill="none" stroke="#FFF2C0" stroke-width="6" stroke-linecap="round" stroke-dasharray="0 15"/>`;
  const body = `${panel}${M.svg()}<g fill="url(#mhGold)" stroke="#5A3606" stroke-width="1.5">${fills}</g>${plate}${disk}${beads}
    ${rosette(205, my, Math.min(rx, ry) * 0.36, { petals: 12 })}${rosette(205, kc, kr * 0.72, { petals: 16 })}`;
  const g = side === 'r' ? `<g transform="translate(410 0) scale(-1 1)">${body}</g>` : body;
  return `<svg viewBox="-6 -6 422 ${f(h + 12)}" width="${f(px.w)}" height="${f(px.h)}" preserveAspectRatio="none" aria-hidden="true" focusable="false" style="overflow:visible">${g}</svg>`;
}

/** The posts, arch, transom, crest and sill (the parts that never move). */
export function frameSVG(G) {
  const { Hu, S, F, yc, mR, gw } = G;
  const M = strokes();
  // transom: rays, arcs and scrolls inside the arch
  let rays = '';
  for (let k = 1; k <= 11; k++) {
    const a = (k * 15 * Math.PI) / 180;
    rays += `M${f(500 - Math.cos(a) * 84)} ${f(S - Math.sin(a) * 84)}L${f(500 - Math.cos(a) * 410)} ${f(S - Math.sin(a) * 262)}`;
  }
  M.add(7, rays);
  M.add(8, `M190 ${S}A310 196 0 0 1 810 ${S}`);
  M.add(6, `M340 ${S}A160 104 0 0 1 660 ${S}`);
  let sc = '';
  for (let k = 0; k < 10; k++) {
    const a = ((22.5 + 15 * k) * Math.PI) / 180;
    sc += spiral(500 - Math.cos(a) * 362, S - Math.sin(a) * 230, 19, a + Math.PI, 1.15, k % 2 ? 1 : -1, 28);
  }
  M.add(5, sc);
  // crest: a sunburst behind the medallion, scroll wings, a lotus finial
  let sun = '';
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    const r2 = mR + (k % 2 ? 34 : 56);
    sun += `M${f(500 + Math.cos(a) * (mR + 4))} ${f(yc + Math.sin(a) * (mR + 4))}L${f(500 + Math.cos(a) * r2)} ${f(yc + Math.sin(a) * r2)}`;
  }
  M.add(6, sun);
  for (const sx of [-1, 1]) {
    M.add(10, `M${500 + sx * mR * 0.7} ${yc + mR * 0.72}C${500 + sx * (mR + 30)} ${yc + mR * 1.1} ${500 + sx * (mR + 110)} ${yc + 70} ${500 + sx * (mR + 70)} ${yc + 10}${spiral(500 + sx * (mR + 46), yc + 20, 30, sx < 0 ? Math.PI : 0, 1.2, sx < 0 ? 1 : -1, 30).replace(/^M/, 'L')}`);
    M.add(7, spiral(500 + sx * (mR + 30), yc - mR * 0.62, 26, Math.PI / 2, 1.2, sx, 30));
  }
  // posts (fluted), capitals, bases and the sill
  const post = (x) => `<rect x="${x}" y="${S - 40}" width="90" height="${f(Hu - S + 60)}" fill="url(#mhPost)"/>
    <path d="M${x + 24} ${S + 30}V${f(F - 80)}M${x + 45} ${S + 30}V${f(F - 80)}M${x + 66} ${S + 30}V${f(F - 80)}" stroke="#5E3A08" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>
    <path d="M${x + 27} ${S + 30}V${f(F - 80)}M${x + 48} ${S + 30}V${f(F - 80)}M${x + 69} ${S + 30}V${f(F - 80)}" stroke="#FFF1C2" stroke-opacity=".45" stroke-width="2"/>
    <rect x="${x - 14}" y="${S - 58}" width="118" height="58" fill="url(#mhCap)" stroke="#5A3606" stroke-width="2"/>
    <path d="M${x - 14} ${S - 40}h118M${x - 14} ${S - 16}h118" stroke="#5A3606" stroke-opacity=".6" stroke-width="2.5"/>
    <rect x="${x - 14}" y="${f(F - 78)}" width="118" height="${f(Hu - F + 90)}" fill="url(#mhCap)" stroke="#5A3606" stroke-width="2"/>
    <path d="M${x - 14} ${f(F - 58)}h118" stroke="#5A3606" stroke-opacity=".6" stroke-width="2.5"/>`;
  const arch = `<path d="M0 ${S}A500 330 0 0 1 1000 ${S}H910A410 262 0 0 0 90 ${S}Z" fill="url(#mhCap)" stroke="#5A3606" stroke-width="3"/>
    <path d="M45 ${S}A455 296 0 0 1 955 ${S}" fill="none" stroke="#4A2C04" stroke-opacity=".5" stroke-width="13" stroke-linecap="round" stroke-dasharray="0 24" transform="translate(1.5 2)"/>
    <path d="M45 ${S}A455 296 0 0 1 955 ${S}" fill="none" stroke="#FFF0BC" stroke-width="10" stroke-linecap="round" stroke-dasharray="0 24"/>`;
  const rail = `<rect x="90" y="${S - 4}" width="820" height="30" fill="url(#mhCap)" stroke="#5A3606" stroke-width="2"/>
    <path d="M422 ${S - 4}A78 78 0 0 1 578 ${S - 4}Z" fill="url(#mhDisk)" stroke="#5A3606" stroke-width="2.5"/>`;
  const finial = `<path d="M500 ${yc - mR - 70}C522 ${yc - mR - 44} 530 ${yc - mR - 20} 500 ${yc - mR - 2}C470 ${yc - mR - 20} 478 ${yc - mR - 44} 500 ${yc - mR - 70}Z" fill="url(#mhDisk)" stroke="#5A3606" stroke-width="2"/><circle cx="500" cy="${yc - mR - 80}" r="10" fill="url(#mhDisk)" stroke="#5A3606" stroke-width="2"/>`;
  const sill = `<rect x="-14" y="${f(F)}" width="1028" height="${f(Hu - F + 20)}" fill="url(#mhCap)" stroke="#5A3606" stroke-width="2"/><path d="M-14 ${f(F + 3)}H1014" stroke="#FFF4C8" stroke-opacity=".8" stroke-width="3"/>`;
  return `<svg viewBox="0 0 1000 ${f(Hu)}" width="${gw}" height="${f(Hu * G.u)}" aria-hidden="true" focusable="false" style="overflow:visible">
    ${M.svg()}${rail}${arch}${post(0)}${post(910)}${sill}${finial}</svg>`;
}

/** Beside the gate on wide screens: the palace wall at night, lit warm from the gate, with moulded panels. */
export function wallSVG(G) {
  const { W, H, gx, gw, u, S } = G;
  // the wall, with the gate's outline cut out of it so the balcony shows through the open gate
  const wall = `M0 0H${W}V${H}H0Z M${f(gx + 4 * u)} ${H}V${f(S * u)}A${f(496 * u)} ${f(326 * u)} 0 0 1 ${f(gx + gw - 4 * u)} ${f(S * u)}V${H}Z`;
  const side = (x0, x1) => {
    const w = x1 - x0; if (w < 40) return '';
    const n = w > 360 ? 2 : 1; let s = '';
    for (let i = 0; i < n; i++) {
      const a = x0 + (w / n) * i + w * 0.08; const b = x0 + (w / n) * (i + 1) - w * 0.08;
      s += `<rect x="${f(a)}" y="${f(H * 0.14)}" width="${f(b - a)}" height="${f(H * 0.62)}" rx="4" fill="none" stroke="#E2B963" stroke-opacity=".38" stroke-width="2"/>
        <rect x="${f(a + 12)}" y="${f(H * 0.14 + 12)}" width="${f(b - a - 24)}" height="${f(H * 0.62 - 24)}" rx="3" fill="#000" fill-opacity=".08" stroke="#E2B963" stroke-opacity=".22" stroke-width="1.2"/>`;
    }
    return s;
  };
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false">
    <defs><linearGradient id="mhWallG" x1="0" x2="1"><stop offset="0" stop-color="#1B120C"/><stop offset=".3" stop-color="#4A3424"/><stop offset=".5" stop-color="#8A6A48"/><stop offset=".7" stop-color="#4A3424"/><stop offset="1" stop-color="#1B120C"/></linearGradient>
    <linearGradient id="mhWallF" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset=".85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs>
    <path d="${wall}" fill-rule="evenodd" fill="url(#mhWallG)"/><path d="${wall}" fill-rule="evenodd" fill="url(#mhWallF)"/>
    <ellipse cx="${f(gx - W * 0.05)}" cy="${f(H * 0.62)}" rx="${f(W * 0.09)}" ry="${f(H * 0.3)}" fill="url(#mhWarm)"/><ellipse cx="${f(gx + gw + W * 0.05)}" cy="${f(H * 0.62)}" rx="${f(W * 0.09)}" ry="${f(H * 0.3)}" fill="url(#mhWarm)"/>
    ${side(0, gx - W * 0.1)}${side(gx + gw + W * 0.1, W)}
    <path d="M0 ${f(H * 0.93)}H${f(gx + 4 * u)}V${H}H0ZM${f(gx + gw - 4 * u)} ${f(H * 0.93)}H${W}V${H}H${f(gx + gw - 4 * u)}Z" fill="url(#mhMarble)" opacity=".85"/>
    <path d="M0 ${f(H * 0.93)}H${f(gx)}M${f(gx + gw)} ${f(H * 0.93)}H${W}" stroke="#D9A64A" stroke-width="3" opacity=".8"/></svg>`;
}

// ───────────────────────── The balcony behind the gate ─────────────────────────
// The palace photograph (decor/jalmahal*.webp, Jal Mahal at night, its sky keyed out): height / width, and where its
// dome tips, roofline and waterline sit (fractions of its height).
export const JAL = { ar: 0.7144, top: 0.1, roof: 0.271, water: 0.4556 };

export function sceneGeo(W, H) {
  const tall = W / H < 0.8;
  const ry = H * (tall ? 0.7 : 0.745);
  const rh = H * (tall ? 0.068 : 0.075);
  const fy = ry + rh;
  const cw = tall ? W * 0.2 : Math.min(W * 0.15, H * 0.3);
  const jw = tall ? Math.min(W * 1.5, H * 0.72) : Math.min(W * 0.62, H * 1.1);
  const jh = jw * JAL.ar;
  const wl = H * (tall ? 0.56 : 0.6);
  const jy = wl - jh * JAL.water;
  const mr = tall ? Math.min(W * 0.26, H * 0.125) : H * 0.125;
  const my = tall ? H * 0.175 : H * 0.18;
  return { W, H, tall, cx: W / 2, hy: wl, ry, rh, fy, cw, jw, jh, jx: W / 2 - jw / 2, jy, wl, palTop: jy + jh * JAL.top, mx: W / 2, my, mr,
    ty: H * (tall ? 0.6 : 0.62), bot: fy + (H - fy) * (tall ? 0.16 : 0.24) };
}

/** the night sky (stars, soft clouds about the moon) and the dark water of the pond, its marble edges and the warm
 *  lamps along them. Returns { svg, stars: [[x,y,s]], lamps: [[x,y,size]] } (px). */
export function backSVG(Sg) {
  const { W, H, cx, wl, ry, rh, tall, mx, my, mr } = Sg;
  const r = rng(7);
  let stars = '';
  for (let i = 0; i < (tall ? 80 : 150); i++) {
    const x = r() * W * 1.4 - W * 0.2; const y = r() * wl * 0.9 - H * 0.1;
    if (Math.hypot(x - mx, y - my) < mr * 1.5) continue;
    stars += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.5 + r() * 1.1)}" opacity="${f(0.25 + r() * 0.6)}"/>`;
  }
  const tw = Array.from({ length: tall ? 12 : 22 }, () => [r() * W, r() * wl * 0.7, 0.6 + r() * 0.8]).filter(([x, y]) => Math.hypot(x - mx, y - my) > mr * 1.6);
  const clouds = [[-2.3, 0.95, 1.9, 0.26], [2.1, 0.55, 1.7, 0.22], [-0.9, 1.45, 1.3, 0.16], [1.2, 1.6, 1.5, 0.18], [-3.2, 0.2, 1.4, 0.15]]
    .map(([dx, dy, rx, ry2]) => `<ellipse cx="${f(mx + dx * mr)}" cy="${f(my + dy * mr)}" rx="${f(rx * mr)}" ry="${f(ry2 * mr)}"/>`).join('');
  // the pond: its two marble edges run from beside the palace toward us; lamps stand along them
  const far = W * (tall ? 0.3 : 0.24); const near = W * (tall ? 0.56 : 0.44);
  const lamps = [];
  const n = tall ? 6 : 8;
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const t = (i + 0.6) / n; const e = t * t;
      lamps.push([cx + s * (far + (near - far) * e), wl + 4 + (ry - wl - 4) * e, 5 + 22 * e]);
    }
  }
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false" style="overflow:visible">
    <defs>
      <linearGradient id="mhSky" gradientUnits="userSpaceOnUse" x1="0" y1="${f(-H * 0.2)}" x2="0" y2="${f(wl)}"><stop offset="0" stop-color="#06123A"/><stop offset=".45" stop-color="#0F2A6E"/><stop offset=".85" stop-color="#1C3B86"/><stop offset="1" stop-color="#22407F"/></linearGradient>
      <linearGradient id="mhWater" gradientUnits="userSpaceOnUse" x1="0" y1="${f(wl)}" x2="0" y2="${f(ry + rh)}"><stop offset="0" stop-color="#0B1534"/><stop offset="1" stop-color="#050A1C"/></linearGradient>
      <filter id="mhCloud" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="${f(mr * 0.22)}"/></filter>
    </defs>
    <rect x="${f(-W * 0.4)}" y="${f(-H * 0.3)}" width="${f(W * 1.8)}" height="${f(wl + H * 0.3 + 4)}" fill="url(#mhSky)"/>
    <g fill="#FFF8E6">${stars}</g>
    <g fill="#C9D6F5" opacity=".2" filter="url(#mhCloud)">${clouds}</g>
    <rect x="${f(-W * 0.4)}" y="${f(wl)}" width="${f(W * 1.8)}" height="${f(ry + rh - wl + H * 0.2)}" fill="url(#mhWater)"/>
  </svg>`;
  return { svg, stars: tw, lamps };
}

function lantern(x, y, h) {
  // a Mughal lantern standing at (x, y = its foot), h tall
  const w = h * 0.46;
  return `<g transform="translate(${f(x)} ${f(y)})">
    <path d="M${f(-w * 0.32)} 0H${f(w * 0.32)}L${f(w * 0.22)} ${f(-h * 0.08)}H${f(-w * 0.22)}Z" fill="url(#mhCap)"/>
    <rect x="${f(-w / 2)}" y="${f(-h * 0.66)}" width="${f(w)}" height="${f(h * 0.58)}" rx="${f(w * 0.06)}" fill="url(#mhGlass)"/>
    <path d="M${f(-w / 2)} ${f(-h * 0.66)}V${f(-h * 0.08)}M${f(-w * 0.17)} ${f(-h * 0.66)}V${f(-h * 0.08)}M${f(w * 0.17)} ${f(-h * 0.66)}V${f(-h * 0.08)}M${f(w / 2)} ${f(-h * 0.66)}V${f(-h * 0.08)}M${f(-w / 2)} ${f(-h * 0.37)}H${f(w / 2)}" stroke="#8A5A14" stroke-width="${f(Math.max(1, w * 0.05))}"/>
    <path d="M${f(-w * 0.6)} ${f(-h * 0.66)}H${f(w * 0.6)}C${f(w * 0.5)} ${f(-h * 0.84)} ${f(w * 0.12)} ${f(-h * 0.9)} 0 ${f(-h)}C${f(-w * 0.12)} ${f(-h * 0.9)} ${f(-w * 0.5)} ${f(-h * 0.84)} ${f(-w * 0.6)} ${f(-h * 0.66)}Z" fill="url(#mhCap)"/>
    <circle cx="0" cy="${f(-h * 1.02)}" r="${f(w * 0.08)}" fill="#F2C35E"/></g>`;
}

/** the marble balustrade, its pedestals and lanterns, candles on the rail. Returns { svg, glows: [[x,y,r]] } */
export function railSVG(Sg) {
  const { W, H, ry, rh, tall } = Sg;
  const bh = rh * 0.66; const bw = bh * 0.34; const step = bw * 1.42;
  const prof = [[0, 0.5], [0.07, 0.5], [0.1, 0.27], [0.2, 0.21], [0.3, 0.3], [0.52, 0.47], [0.7, 0.42], [0.8, 0.24], [0.87, 0.3], [0.92, 0.5], [1, 0.5]];
  const pts = [...prof.map(([y, x]) => [bw / 2 - x * bw, y * bh]), ...prof.slice().reverse().map(([y, x]) => [bw / 2 + x * bw, y * bh])];
  const vase = `M${pts.map(([x, y]) => `${f(x + (step - bw) / 2)} ${f(y)}`).join('L')}Z`;
  const posts = [];
  const pw = rh * 0.62;
  let peds = ''; let lan = ''; const glows = [];
  for (const p of posts) {
    const x = W * p;
    peds += `<rect x="${f(x - pw / 2)}" y="${f(ry - rh * 0.06)}" width="${f(pw)}" height="${f(rh * 1.06)}" fill="url(#mhMarble)" stroke="#A89A84" stroke-width="1"/><rect x="${f(x - pw * 0.6)}" y="${f(ry - rh * 0.12)}" width="${f(pw * 1.2)}" height="${f(rh * 0.1)}" fill="url(#mhMarble)"/>`;
    const lh = rh * (tall ? 0.95 : 0.85);
    lan += lantern(x, ry - rh * 0.12, lh);
    glows.push([x, ry - rh * 0.12 - lh * 0.4, lh * 1.5]);
  }
  let candles = '';
  const cpos = tall ? [0.12, 0.38, 0.5, 0.62, 0.88] : [0.07, 0.25, 0.46, 0.54, 0.75, 0.93];
  for (const p of cpos) {
    for (const d of [-1, 0, 1]) {
      const x = W * p + d * rh * 0.11; const ch = rh * (d ? 0.18 : 0.26);
      candles += `<rect x="${f(x - rh * 0.035)}" y="${f(ry - ch)}" width="${f(rh * 0.07)}" height="${f(ch)}" rx="1" fill="#FFF6E6"/><ellipse cx="${f(x)}" cy="${f(ry - ch - rh * 0.05)}" rx="${f(rh * 0.025)}" ry="${f(rh * 0.06)}" fill="#FFE29A"/>`;
    }
    glows.push([W * p, ry - rh * 0.3, rh * 0.9]);
  }
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false" style="overflow:visible">
    <defs><pattern id="mhBal" patternUnits="userSpaceOnUse" width="${f(step)}" height="${f(bh)}" x="${f(W / 2 - step / 2)}" y="${f(ry + rh * 0.16)}"><path d="${vase}" fill="url(#mhBaluster)"/></pattern>
    <linearGradient id="mhRailShade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#06112E" stop-opacity=".55"/><stop offset="1" stop-color="#06112E" stop-opacity=".15"/></linearGradient></defs>
    <rect x="${f(-W * 0.4)}" y="${f(ry + rh * 0.12)}" width="${f(W * 1.8)}" height="${f(rh * 0.74)}" fill="url(#mhRailShade)"/>
    <rect x="${f(-W * 0.4)}" y="${f(ry + rh * 0.16)}" width="${f(W * 1.8)}" height="${f(bh)}" fill="url(#mhBal)"/>
    <rect x="${f(-W * 0.4)}" y="${f(ry)}" width="${f(W * 1.8)}" height="${f(rh * 0.16)}" fill="url(#mhMarble)"/>
    <rect x="${f(-W * 0.4)}" y="${f(ry + rh * 0.13)}" width="${f(W * 1.8)}" height="${f(Math.max(1.5, rh * 0.025))}" fill="#D9A64A"/>
    <rect x="${f(-W * 0.4)}" y="${f(ry + rh * 0.82)}" width="${f(W * 1.8)}" height="${f(rh * 0.18)}" fill="url(#mhMarble)"/>
    ${peds}${candles}${lan}</svg>`;
  return { svg, glows };
}

/** the marble floor: perspective seams, veins, a lapis band with gold, warm reflections */
export function floorSVG(Sg) {
  const { W, H, cx, hy, fy, tall, ry } = Sg;
  const r = rng(11);
  const Y = H * 1.6;
  let seams = '';
  const seg = W * (tall ? 0.16 : 0.09);
  for (let k = -12; k <= 12; k++) {
    const x0 = cx + k * seg; const xb = cx + (x0 - cx) * ((Y - hy) / (fy - hy));
    seams += `M${f(x0)} ${f(fy)}L${f(xb)} ${f(Y)}`;
  }
  for (let j = 1; j < 6; j++) { const y = hy + (fy - hy) / (1 - j * 0.17); if (y < Y) seams += `M${f(-W)} ${f(y)}H${f(2 * W)}`; }
  let veins = '';
  for (let i = 0; i < 14; i++) {
    const x = r() * W; const y = fy + r() * (H - fy);
    veins += `M${f(x)} ${f(y)}c${f(r() * 60 - 30)} ${f(r() * 20)} ${f(r() * 90 - 20)} ${f(r() * 30 - 10)} ${f(r() * 140 - 40)} ${f(r() * 24 - 6)}`;
  }
  const by = fy + (H - fy) * (tall ? 0.6 : 0.56); const bh = (H - fy) * 0.1;
  let dia = '';
  for (let x = (W / 2) % (bh * 2.4); x < W; x += bh * 2.4) dia += `M${f(x)} ${f(by + bh * 0.22)}l${f(bh * 0.3)} ${f(bh * 0.28)}l${f(-bh * 0.3)} ${f(bh * 0.28)}l${f(-bh * 0.3)} ${f(-bh * 0.28)}Z`;
  const posts = [];
  const refl = posts.map((p) => `<ellipse cx="${f(W * p)}" cy="${f(fy + (H - fy) * 0.16)}" rx="${f(W * (tall ? 0.04 : 0.02))}" ry="${f((H - fy) * 0.2)}" fill="url(#mhFloorR)"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false" style="overflow:visible">
    <defs><linearGradient id="mhFloor" gradientUnits="userSpaceOnUse" x1="0" y1="${f(fy)}" x2="0" y2="${f(H)}"><stop offset="0" stop-color="#CFC4B2"/><stop offset=".25" stop-color="#F3EEE4"/><stop offset=".7" stop-color="#FBF8F2"/><stop offset="1" stop-color="#E4DACA"/></linearGradient>
    <radialGradient id="mhFloorR"><stop offset="0" stop-color="#FFC970" stop-opacity=".55"/><stop offset="1" stop-color="#FFC970" stop-opacity="0"/></radialGradient>
    <linearGradient id="mhFloorS" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3A2A14" stop-opacity=".35"/><stop offset="1" stop-color="#3A2A14" stop-opacity="0"/></linearGradient></defs>
    <rect x="${f(-W * 0.5)}" y="${f(fy)}" width="${f(W * 2)}" height="${f(Y - fy)}" fill="url(#mhFloor)"/>
    <path d="${seams}" stroke="#A69A86" stroke-opacity=".35" stroke-width="1" fill="none"/>
    <path d="${veins}" stroke="#9C9282" stroke-opacity=".22" stroke-width="1.2" fill="none"/>
    ${refl}
    <rect x="${f(-W * 0.5)}" y="${f(by)}" width="${f(W * 2)}" height="${f(bh)}" fill="url(#mhLapis)"/>
    <path d="M${f(-W * 0.5)} ${f(by)}H${f(W * 1.5)}M${f(-W * 0.5)} ${f(by + bh)}H${f(W * 1.5)}" stroke="#E3B04A" stroke-width="${f(Math.max(2, bh * 0.08))}"/>
    <path d="${dia}" fill="#E3B04A" opacity=".9"/>
    <rect x="${f(-W * 0.5)}" y="${f(fy)}" width="${f(W * 2)}" height="${f((H - fy) * 0.08)}" fill="url(#mhFloorS)"/>
  </svg>`;
  void ry;
}

/** red velvet curtains tied back on both sides, with a valance, gold trim, tiebacks and a floor lantern */
export function curtainSVG(Sg) {
  const { W, H, cw, ty, bot, rh, tall } = Sg;
  const X0 = -W * 0.12;
  const inner = `M${f(cw)} -20C${f(cw)} ${f(ty * 0.45)} ${f(cw * 0.66)} ${f(ty * 0.86)} ${f(cw * 0.5)} ${f(ty)}C${f(cw * 0.42)} ${f(ty + (bot - ty) * 0.4)} ${f(cw * 0.86)} ${f(bot - 40)} ${f(cw * 1.14)} ${f(bot)}`;
  const shape = `${inner}L${f(X0)} ${f(bot)}L${f(X0)} -20Z`;
  let folds = ''; let lights = '';
  for (let i = 0; i < 7; i++) {
    const t = (i + 0.5) / 7;
    const x0 = X0 + (cw - X0) * t; const xt = X0 * 0.2 + (cw * 0.5 - X0 * 0.2) * t; const xb = X0 + (cw * 1.12 - X0) * t;
    const d = `M${f(x0)} -20C${f(x0)} ${f(ty * 0.5)} ${f(xt)} ${f(ty * 0.8)} ${f(xt)} ${f(ty)}C${f(xt)} ${f(ty + (bot - ty) * 0.3)} ${f(xb)} ${f(bot - 30)} ${f(xb)} ${f(bot)}`;
    folds += `<path d="${d}"/>`;
    lights += `<path d="${d}" transform="translate(${f(cw * 0.05)} 0)"/>`;
  }
  const vH = cw * (tall ? 0.42 : 0.36);
  const val = `M${f(X0)} -20H${f(cw * 1.25)}V${f(vH * 0.55)}C${f(cw * 1.05)} ${f(vH * 1.25)} ${f(cw * 0.62)} ${f(vH * 1.25)} ${f(cw * 0.45)} ${f(vH * 0.7)}C${f(cw * 0.3)} ${f(vH * 1.3)} ${f(X0 * 0.4)} ${f(vH * 1.3)} ${f(X0)} ${f(vH * 0.8)}Z`;
  const fringe = `M${f(cw * 1.25)} ${f(vH * 0.62)}C${f(cw * 1.05)} ${f(vH * 1.32)} ${f(cw * 0.62)} ${f(vH * 1.32)} ${f(cw * 0.45)} ${f(vH * 0.77)}C${f(cw * 0.3)} ${f(vH * 1.37)} ${f(X0 * 0.4)} ${f(vH * 1.37)} ${f(X0)} ${f(vH * 0.87)}`;
  const tx = cw * 0.5; const tr = cw * 0.06;
  const tie = `<path d="M${f(X0)} ${f(ty - cw * 0.04)}Q${f(tx * 0.5)} ${f(ty + cw * 0.1)} ${f(tx + cw * 0.06)} ${f(ty)}" fill="none" stroke="#5A3606" stroke-width="${f(cw * 0.085)}" stroke-linecap="round"/>
    <path d="M${f(X0)} ${f(ty - cw * 0.04)}Q${f(tx * 0.5)} ${f(ty + cw * 0.1)} ${f(tx + cw * 0.06)} ${f(ty)}" fill="none" stroke="url(#mhGold)" stroke-width="${f(cw * 0.06)}" stroke-linecap="round" stroke-dasharray="${f(cw * 0.04)} ${f(cw * 0.012)}"/>
    <circle cx="${f(tx + cw * 0.06)}" cy="${f(ty + tr)}" r="${f(tr)}" fill="url(#mhDisk)"/>
    <path d="M${f(tx + cw * 0.06 - tr)} ${f(ty + tr * 1.6)}L${f(tx + cw * 0.06 - tr * 1.8)} ${f(ty + cw * 0.36)}H${f(tx + cw * 0.06 + tr * 1.8)}L${f(tx + cw * 0.06 + tr)} ${f(ty + tr * 1.6)}Z" fill="url(#mhCap)"/>
    <path d="M${f(tx + cw * 0.06 - tr * 1.5)} ${f(ty + cw * 0.2)}V${f(ty + cw * 0.35)}M${f(tx + cw * 0.06)} ${f(ty + cw * 0.2)}V${f(ty + cw * 0.35)}M${f(tx + cw * 0.06 + tr * 1.5)} ${f(ty + cw * 0.2)}V${f(ty + cw * 0.35)}" stroke="#7A4E0E" stroke-width="1.2"/>`;
  const side = `<g clip-path="url(#mhCurC)"><path d="${shape}" fill="url(#mhVelvet)"/>
      <g fill="none" stroke="#24010A" stroke-opacity=".5" stroke-width="${f(cw * 0.06)}" filter="url(#mhSoft)">${folds}</g>
      <g fill="none" stroke="#E8505E" stroke-opacity=".22" stroke-width="${f(cw * 0.022)}" filter="url(#mhSoft)">${lights}</g>
      <path d="${shape}" fill="url(#mhVelvetV)"/></g>
    <path d="${inner}" fill="none" stroke="#3A0207" stroke-width="${f(Math.max(3, cw * 0.05))}"/>
    <path d="${inner}" fill="none" stroke="url(#mhGold)" stroke-width="${f(Math.max(2.4, cw * 0.032))}"/>
    ${tie}
    <path d="${val}" fill="url(#mhVelvet)"/><path d="${val}" fill="url(#mhVelvetV)"/>
    <path d="${fringe}" fill="none" stroke="#D9A43E" stroke-width="${f(vH * 0.14)}" stroke-dasharray="1.6 2.4"/>
    <path d="${fringe}" fill="none" stroke="url(#mhGold)" stroke-width="${f(Math.max(2, vH * 0.04))}" transform="translate(0 ${f(-vH * 0.06)})"/>
`;
  return {
    svg: `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false" style="overflow:visible">
    <defs><linearGradient id="mhVelvet" gradientUnits="userSpaceOnUse" x1="${f(X0)}" x2="${f(cw * 1.2)}" y1="0" y2="0">
      <stop offset="0" stop-color="#3E0309"/><stop offset=".12" stop-color="#8E0F1D"/><stop offset=".22" stop-color="#B71C2C"/><stop offset=".34" stop-color="#6C0A15"/>
      <stop offset=".48" stop-color="#A3172A"/><stop offset=".6" stop-color="#C62A3A"/><stop offset=".72" stop-color="#7A0B17"/><stop offset=".86" stop-color="#A51A2B"/><stop offset="1" stop-color="#5A0610"/></linearGradient>
      <clipPath id="mhCurC"><path d="${shape}"/></clipPath>
      <filter id="mhSoft" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="${f(Math.max(1.5, cw * 0.014))}"/></filter></defs>
    <g>${side}</g><g transform="translate(${W} 0) scale(-1 1)">${side}</g></svg>`,
    swag: { x: X0 * 0.2, y: vH * 0.32, w: cw * 1.7 },
  };
}

/** a falling petal: ivory, blush or rose-pink */
export function petal(kind, size) {
  const c = { ivory: ['#FFF8EE', '#E9D9C2'], blush: ['#FAD3D2', '#E3A2A6'], pink: ['#EE7D9A', '#C24D6F'] }[kind] || ['#FAD3D2', '#E3A2A6'];
  const id = `mhp${kind}`;
  return `<svg viewBox="0 0 20 24" width="${size}" height="${Math.round(size * 1.2)}" aria-hidden="true" focusable="false"><defs><radialGradient id="${id}" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></radialGradient></defs><path d="M10 23C3 18 0 11 2 6C4 1 9 0 10 4C11 0 16 1 18 6C20 11 17 18 10 23Z" fill="url(#${id})"/></svg>`;
}
