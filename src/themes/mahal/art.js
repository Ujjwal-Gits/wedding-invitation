// Mangal · ornaments drawn in code: the doorway, its carved leaves, brass bells and diyos,
// gold filigree, the Dhaka band, frame crowns and falling petals. Everything is generated at the
// exact pixel size it is shown at, so it stays crisp on any screen.
const r1 = (n) => Math.round(n * 10) / 10;

/** Shared gradients (one hidden <svg> per page; every ornament refers to these ids). */
export const DEFS = `
<svg class="svg-defs" aria-hidden="true" focusable="false" width="0" height="0">
  <defs>
    <linearGradient id="mhb-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F6E1A0"/><stop offset=".22" stop-color="#D7A443"/><stop offset=".46" stop-color="#FCEDB9"/>
      <stop offset=".7" stop-color="#B57E22"/><stop offset="1" stop-color="#E8C26B"/>
    </linearGradient>
    <linearGradient id="mhb-gold-v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBEAB0"/><stop offset=".45" stop-color="#D9A848"/><stop offset="1" stop-color="#A0701E"/>
    </linearGradient>
    <linearGradient id="mhb-brass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5E3D0B"/><stop offset=".18" stop-color="#C99436"/><stop offset=".3" stop-color="#FFF0C2"/>
      <stop offset=".42" stop-color="#D9A442"/><stop offset=".78" stop-color="#8A5E16"/><stop offset="1" stop-color="#4E3208"/>
    </linearGradient>
    <linearGradient id="mhb-lacquer" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" style="stop-color:var(--mg-lq-1)"/><stop offset=".55" style="stop-color:var(--mg-lq-2)"/><stop offset="1" style="stop-color:var(--mg-lq-3)"/>
    </linearGradient>
    <linearGradient id="mhb-lacquer-r" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" style="stop-color:var(--mg-lq-1)"/><stop offset=".55" style="stop-color:var(--mg-lq-2)"/><stop offset="1" style="stop-color:var(--mg-lq-3)"/>
    </linearGradient>
    <linearGradient id="mhb-ox" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" style="stop-color:var(--mg-ox-1)"/><stop offset="1" style="stop-color:var(--mg-ox-2)"/>
    </linearGradient>
    <linearGradient id="mhb-sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".16"/>
    </linearGradient>
    <radialGradient id="mhb-stud" cx=".38" cy=".34" r=".7">
      <stop offset="0" stop-color="#FFF4CF"/><stop offset=".35" stop-color="#E2B357"/><stop offset="1" stop-color="#7A5214"/>
    </radialGradient>
    <radialGradient id="mhb-flame" cx=".5" cy=".72" r=".62">
      <stop offset="0" stop-color="#FFFDF0"/><stop offset=".3" stop-color="#FFE7A0"/><stop offset=".62" stop-color="#FFB13B"/>
      <stop offset="1" stop-color="#F06A12" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mhb-fl-out" cx=".5" cy=".85" r=".75">
      <stop offset="0" stop-color="#FFE9A8"/><stop offset=".4" stop-color="#FFB236"/><stop offset=".75" stop-color="#F2711A" stop-opacity=".85"/>
      <stop offset="1" stop-color="#D9440C" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mhb-fl-mid" cx=".5" cy=".8" r=".7">
      <stop offset="0" stop-color="#FFFBE6"/><stop offset=".45" stop-color="#FFE07A"/><stop offset="1" stop-color="#FFB43C" stop-opacity=".2"/>
    </radialGradient>
    <radialGradient id="mhb-glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#FFC56A" stop-opacity=".55"/><stop offset=".45" stop-color="#FFB04A" stop-opacity=".18"/>
      <stop offset="1" stop-color="#FFB04A" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mhb-bbody" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3B2405"/><stop offset=".07" stop-color="#6E4810"/><stop offset=".17" stop-color="#B07C26"/>
      <stop offset=".26" stop-color="#EBC46A"/><stop offset=".33" stop-color="#FFF0BE"/><stop offset=".4" stop-color="#E4B652"/>
      <stop offset=".55" stop-color="#A9731C"/><stop offset=".7" stop-color="#6E470E"/><stop offset=".82" stop-color="#8E6216"/>
      <stop offset=".91" stop-color="#D7A851"/><stop offset=".96" stop-color="#9B6B1C"/><stop offset="1" stop-color="#4A2E07"/>
    </linearGradient>
    <linearGradient id="mhb-bshade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF4CF" stop-opacity=".22"/><stop offset=".25" stop-color="#FFF4CF" stop-opacity="0"/>
      <stop offset=".7" stop-color="#2A1500" stop-opacity="0"/><stop offset="1" stop-color="#2A1500" stop-opacity=".22"/>
    </linearGradient>
    <linearGradient id="mhb-blip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5A3809"/><stop offset=".15" stop-color="#C9963B"/><stop offset=".3" stop-color="#FFF2C6"/>
      <stop offset=".45" stop-color="#E0B154"/><stop offset=".7" stop-color="#93641A"/><stop offset=".9" stop-color="#E2B860"/><stop offset="1" stop-color="#5A3809"/>
    </linearGradient>
    <radialGradient id="mhb-bmouth" cx=".5" cy=".2" r=".75">
      <stop offset="0" stop-color="#120A01"/><stop offset=".6" stop-color="#2E1B04"/><stop offset="1" stop-color="#6A4510"/>
    </radialGradient>
    <radialGradient id="mhb-bball" cx=".36" cy=".32" r=".7">
      <stop offset="0" stop-color="#FFF1C4"/><stop offset=".35" stop-color="#C9963B"/><stop offset="1" stop-color="#4A2E07"/>
    </radialGradient>
    <linearGradient id="mhb-bchain" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FCE7A6"/><stop offset=".45" stop-color="#C08A30"/><stop offset="1" stop-color="#6E4810"/>
    </linearGradient>
    <radialGradient id="mhb-bell-in" cx=".5" cy=".3" r=".7">
      <stop offset="0" stop-color="#2A1804"/><stop offset="1" stop-color="#6B4710"/>
    </radialGradient>
  </defs>
</svg>`;

/** A cusped (multifoil) arch like the niches of the printed red card: lobes along a semi-ellipse and a small
 *  pointed finial at the apex. Box (x, y, w, h); `spring` is the height of the arched part. */
export function cuspPath(x, y, w, h, spring, lobes = 7) {
  const cx = x + w / 2; const rx = w / 2; const fin = spring * 0.16; const ry = spring - fin; const base = y + spring;
  const pts = [];
  for (let i = 0; i <= lobes; i++) { const t = Math.PI - (i / lobes) * Math.PI; pts.push([cx + rx * Math.cos(t), base - ry * Math.sin(t)]); }
  let d = `M${r1(x)} ${r1(y + h)}L${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < lobes; i++) {
    const [ax, ay] = pts[i]; const [bx, by] = pts[i + 1];
    const chord = Math.hypot(bx - ax, by - ay);
    if (i === Math.floor(lobes / 2) && lobes % 2) {
      const mx = (ax + bx) / 2; const lift = Math.min(ay, by) - y;
      d += `C${r1(ax + chord * 0.02)} ${r1(ay - lift * 0.75)} ${r1(mx - chord * 0.16)} ${r1(y + lift * 0.3)} ${r1(mx)} ${r1(y)}C${r1(mx + chord * 0.16)} ${r1(y + lift * 0.3)} ${r1(bx - chord * 0.02)} ${r1(by - lift * 0.75)} ${r1(bx)} ${r1(by)}`;
    } else d += `A${r1(chord * 0.56)} ${r1(chord * 0.56)} 0 0 1 ${r1(bx)} ${r1(by)}`;
  }
  return `${d}L${r1(x + w)} ${r1(y + h)}Z`;
}

/** A lotus rosette: two rings of petals, a beaded ring and a boss. */
export function rosette(cx, cy, r, { petals = 12, fill = 'url(#mhb-gold)', stroke = '#6A3F0C', inner = 'var(--mg-boss)', sw = 0.8 } = {}) {
  const petal = (rad, n, rot, wf) => {
    let d = '';
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rot;
      const w = (Math.PI / n) * wf;
      const p = (rr, aa) => `${r1(cx + Math.cos(aa) * rr)} ${r1(cy + Math.sin(aa) * rr)}`;
      d += `M${p(rad * 0.3, a - w * 0.6)}Q${p(rad * 0.86, a - w * 1.25)} ${p(rad, a)}Q${p(rad * 0.86, a + w * 1.25)} ${p(rad * 0.3, a + w * 0.6)}Z`;
    }
    return d;
  };
  let dots = '';
  const nd = Math.max(8, Math.round(petals * 1.5));
  for (let k = 0; k < nd; k++) {
    const a = (k / nd) * Math.PI * 2;
    dots += `<circle cx="${r1(cx + Math.cos(a) * r * 0.42)}" cy="${r1(cy + Math.sin(a) * r * 0.42)}" r="${r1(Math.max(0.6, r * 0.045))}"/>`;
  }
  return `<g class="mhb-ros"><path d="${petal(r, petals, 0, 0.9)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-opacity=".55"/>`
    + `<path d="${petal(r * 0.72, petals, Math.PI / petals, 0.85)}" style="fill:${inner}" stroke="${fill}" stroke-width="${sw}"/>`
    + `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r * 0.34)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-opacity=".6"/>`
    + `<g style="fill:${inner}">${dots}</g><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r * 0.16)}" style="fill:${inner}"/>`
    + `<circle cx="${r1(cx - r * 0.05)}" cy="${r1(cy - r * 0.05)}" r="${r1(r * 0.07)}" fill="#FFF3C8" opacity=".8"/></g>`;
}

const stud = (x, y, r) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="url(#mhb-stud)" stroke="#5A3A0A" stroke-width=".6"/>`;

/** A row of studs along a line. */
function studs(x0, y0, x1, y1, r, gap) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.floor(L / gap));
  let s = '';
  for (let k = 0; k <= n; k++) { const t = k / n; s += stud(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r); }
  return s;
}

/** The full-width carved beam along the top of the screen, with a gold bead festoon hung in equal loops
 *  (an even number of loops across the width, so it is symmetric and ends cleanly at both edges). */
export function beamSVG(W, bh, drop) {
  const s = Math.max(0.6, Math.min(1, bh / 18));
  let n = Math.max(6, Math.round(W / (bh * 3.6)));
  if (n % 2) n += 1;
  const p = W / n;
  let loops = ''; let drops = '';
  for (let k = 0; k < n; k++) loops += `M${r1(k * p)} ${r1(bh)}Q${r1((k + 0.5) * p)} ${r1(bh + drop * 1.5)} ${r1((k + 1) * p)} ${r1(bh)}`;
  for (let k = 1; k < n; k++) {
    const x = k * p; const big = k === n / 2;
    const r = (big ? 3.2 : 2.2) * s; const y = bh + (big ? 5 : 3.5) * s;
    drops += `<path d="M${r1(x)} ${r1(bh)}L${r1(x)} ${r1(y)}" stroke="#B9862E" stroke-width="${r1(0.9 * s)}"/><circle cx="${r1(x)}" cy="${r1(y + r)}" r="${r1(r)}" fill="url(#mhb-stud)"/>`;
  }
  const H = bh + drop + 8 * s;
  return `<svg class="mhb-beam-svg" width="${r1(W)}" height="${r1(H)}" viewBox="0 0 ${r1(W)} ${r1(H)}" aria-hidden="true" focusable="false">
    <rect width="${r1(W)}" height="${r1(bh)}" fill="url(#mhb-ox)"/><rect width="${r1(W)}" height="${r1(bh)}" fill="url(#mhb-sheen)"/>
    <path d="M0 ${r1(3 * s)}H${r1(W)}" stroke="#D9AA52" stroke-opacity=".65" stroke-width="${r1(0.9 * s)}"/>
    <path d="M0 ${r1(bh / 2)}H${r1(W)}" stroke="#E2B65C" stroke-opacity=".8" stroke-width="${r1(2.2 * s)}" stroke-dasharray="0 ${r1(7 * s)}" stroke-linecap="round"/>
    <path d="M0 ${r1(bh - 1.2 * s)}H${r1(W)}" stroke="url(#mhb-gold)" stroke-width="${r1(2.4 * s)}"/>
    <path d="${loops}" fill="none" stroke="#D9A848" stroke-width="${r1(1.8 * s)}" stroke-dasharray="0 ${r1(4.2 * s)}" stroke-linecap="round"/>
    ${drops}
  </svg>`;
}

/** Gold ring for a round medallion (Ganesh), viewBox 100: a ring of lotus petals, a gold band and beads.
 *  The picture sits underneath, a circle of diameter 72 in the middle. */
export function medalSVG() {
  let pet = '';
  const n = 24;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2; const w = (Math.PI / n) * 0.9;
    const pt = (rr, aa) => `${r1(50 + Math.cos(aa) * rr)} ${r1(50 + Math.sin(aa) * rr)}`;
    pet += `M${pt(41, a - w)}Q${pt(47.5, a - w * 0.9)} ${pt(49.6, a)}Q${pt(47.5, a + w * 0.9)} ${pt(41, a + w)}Z`;
  }
  return `<svg class="mhb-medal__ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <path d="${pet}" fill="url(#mhb-gold)" stroke="#7A5214" stroke-width=".35" stroke-opacity=".6"/>
    <circle cx="50" cy="50" r="39.6" fill="none" style="stroke:var(--mg-red-dk)" stroke-width="3.4"/>
    <circle cx="50" cy="50" r="39.2" fill="none" stroke="url(#mhb-gold)" stroke-width="2.6"/>
    <circle cx="50" cy="50" r="37" fill="none" stroke="#F6DB92" stroke-width="1.5" stroke-dasharray="0 2.9" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="36.2" fill="none" stroke="#7A5214" stroke-width=".7"/>
  </svg>`;
}

/** One carved pillar of the doorway: a lotus base, a lacquer shaft with gold flutes, a chain of gold lozenges and
 *  a ring at mid-height, and a lotus bracket capital under the lintel. (x, y) is the top-left of the pillar box. */
function pillar(x, y, w, h, s) {
  const cx = x + w / 2;
  const capH = Math.max(14, w * 0.95); const baseH = Math.max(14, w * 1.05);
  const sx0 = x + w * 0.1; const sx1 = x + w * 0.9; const sw = sx1 - sx0;
  const y0 = y + capH; const y1 = y + h - baseH;
  const o = Math.max(2, w * 0.1);
  const np = Math.max(3, Math.round(w / (9 * s)));
  const petalRow = (py, len, up) => {
    let d = '';
    for (let k = 0; k < np; k++) {
      const px = x + (k + 0.5) * (w / np); const pw = (w / np) * 0.46; const sg = up ? -1 : 1;
      d += `M${r1(px - pw)} ${r1(py)}Q${r1(px - pw * 0.8)} ${r1(py + sg * len * 0.82)} ${r1(px)} ${r1(py + sg * len)}Q${r1(px + pw * 0.8)} ${r1(py + sg * len * 0.82)} ${r1(px + pw)} ${r1(py)}Z`;
    }
    return `<path d="${d}" fill="url(#mhb-gold)" stroke="#6A3F0C" stroke-width=".5" stroke-opacity=".6"/>`;
  };
  const gold = `stroke="url(#mhb-gold)" stroke-width="${r1(1.4 * s)}"`;
  // capital: abacus slab, a band of downward lotus petals on a flared bracket, a collar
  const bell = `M${r1(x - o * 0.4)} ${r1(y + capH * 0.24)}C${r1(x + w * 0.02)} ${r1(y + capH * 0.6)} ${r1(sx0)} ${r1(y + capH * 0.7)} ${r1(sx0)} ${r1(y0)}H${r1(sx1)}C${r1(sx1)} ${r1(y + capH * 0.7)} ${r1(x + w * 0.98)} ${r1(y + capH * 0.6)} ${r1(x + w + o * 0.4)} ${r1(y + capH * 0.24)}Z`;
  const vase = `M${r1(sx0)} ${r1(y1)}C${r1(sx0)} ${r1(y1 + baseH * 0.3)} ${r1(x + w * 0.02)} ${r1(y1 + baseH * 0.42)} ${r1(x - o * 0.4)} ${r1(y + h - baseH * 0.26)}H${r1(x + w + o * 0.4)}C${r1(x + w * 0.98)} ${r1(y1 + baseH * 0.42)} ${r1(sx1)} ${r1(y1 + baseH * 0.3)} ${r1(sx1)} ${r1(y1)}Z`;
  // shaft: lacquer, two gold flutes, a lozenge chain, a ring at mid-height
  const mid = (y0 + y1) / 2; const ringH = Math.max(6, w * 0.3);
  let chain = '';
  const pr = Math.max(2.2, sw * 0.17);
  const span = (a, b) => {
    const m = Math.max(1, Math.floor((b - a) / (pr * 3.6)));
    for (let k = 0; k <= m; k++) {
      const yy = a + pr * 1.6 + (k / m) * (b - a - pr * 3.2);
      chain += `<path d="M${r1(cx)} ${r1(yy - pr * 1.35)}L${r1(cx + pr)} ${r1(yy)}L${r1(cx)} ${r1(yy + pr * 1.35)}L${r1(cx - pr)} ${r1(yy)}Z" fill="url(#mhb-gold)" stroke="#5A3A0A" stroke-width=".5" stroke-opacity=".5"/><circle cx="${r1(cx)}" cy="${r1(yy)}" r="${r1(pr * 0.34)}" style="fill:var(--mg-ox-1)"/>`;
    }
  };
  span(y0 + 4 * s, mid - ringH / 2 - 4 * s);
  span(mid + ringH / 2 + 4 * s, y1 - 4 * s);
  const flute = Math.max(2, sw * 0.14);
  return `<g class="mhb-pillar">
    <rect x="${r1(sx0)}" y="${r1(y0)}" width="${r1(sw)}" height="${r1(y1 - y0)}" fill="url(#mhb-lacquer)"/>
    <rect x="${r1(sx0)}" y="${r1(y0)}" width="${r1(sw)}" height="${r1(y1 - y0)}" fill="url(#mhb-sheen)"/>
    <path d="M${r1(sx0 + flute)} ${r1(y0)}V${r1(y1)}M${r1(sx1 - flute)} ${r1(y0)}V${r1(y1)}" stroke="#E2B65C" stroke-opacity=".7" stroke-width="${r1(1.1 * s)}"/>
    <path d="M${r1(sx0)} ${r1(y0)}V${r1(y1)}M${r1(sx1)} ${r1(y0)}V${r1(y1)}" stroke="url(#mhb-gold-v)" stroke-width="${r1(1.8 * s)}"/>
    ${chain}
    <rect x="${r1(sx0 - o * 0.5)}" y="${r1(mid - ringH / 2)}" width="${r1(sw + o)}" height="${r1(ringH)}" fill="url(#mhb-ox)" ${gold}/>
    ${w > 30 ? rosette(cx, mid, ringH * 0.36, { petals: 8, inner: 'var(--mg-ox-1)', sw: 0.4 }) : ''}
    <path d="${bell}" fill="url(#mhb-lacquer)" ${gold}/>
    ${petalRow(y + capH * 0.26, capH * 0.44, false)}
    <rect x="${r1(x - o)}" y="${r1(y)}" width="${r1(w + 2 * o)}" height="${r1(capH * 0.24)}" fill="url(#mhb-ox)" ${gold}/>
    <rect x="${r1(sx0 - 1)}" y="${r1(y0 - capH * 0.12)}" width="${r1(sw + 2)}" height="${r1(capH * 0.12)}" fill="url(#mhb-gold)"/>
    <path d="${vase}" fill="url(#mhb-lacquer)" ${gold}/>
    ${petalRow(y + h - baseH * 0.27, baseH * 0.42, true)}
    <rect x="${r1(x - o)}" y="${r1(y + h - baseH * 0.26)}" width="${r1(w + 2 * o)}" height="${r1(baseH * 0.26)}" fill="url(#mhb-ox)" ${gold}/>
    <rect x="${r1(sx0 - 1)}" y="${r1(y1)}" width="${r1(sw + 2)}" height="${r1(baseH * 0.11)}" fill="url(#mhb-gold)"/>
  </g>`;
}

/** The doorway, Newar style: two carved pillars, a lintel that runs past them, a torana (cusped tympanum)
 *  above with a gold halo for Ganesh, and a step. The opening itself is a clean rectangle (the leaves sit in it). */
export function frameSVG(L) {
  const { DW, fh, ext, pw, lh, th, tw, sill, ox, oy, ow, oh, medal, medalY, ganesh } = L;
  const s = Math.max(0.55, Math.min(1.2, pw / 56));
  const cx = DW / 2;
  // torana
  const tx = cx - tw / 2; const fin = Math.max(6, th * 0.07);
  const tor = cuspPath(tx, fin, tw, th - fin + 2, th - fin, 7);
  const i1 = Math.max(4, 7 * s); const i2 = Math.max(6, 12 * s);
  const tor1 = cuspPath(tx + i1, fin + i1, tw - 2 * i1, th - fin - i1 + 2, th - fin - i1, 7);
  const tor2 = cuspPath(tx + i2, fin + i2, tw - 2 * i2, th - fin - i2 + 2, th - fin - i2, 7);
  let halo = '';
  const hr0 = medal * 0.52; const hr1 = Math.min(th * 0.8, tw * 0.42);
  for (let k = 0; k < 28; k++) {
    const a = Math.PI + (k / 27) * Math.PI;
    halo += `M${r1(cx + Math.cos(a) * hr0)} ${r1(medalY + Math.sin(a) * hr0)}L${r1(cx + Math.cos(a) * hr1)} ${r1(medalY + Math.sin(a) * hr1)}`;
  }
  const finial = `<path d="M${r1(cx)} 0C${r1(cx + fin * 0.7)} ${r1(fin * 0.6)} ${r1(cx + fin * 0.5)} ${r1(fin * 1.3)} ${r1(cx)} ${r1(fin * 1.5)}C${r1(cx - fin * 0.5)} ${r1(fin * 1.3)} ${r1(cx - fin * 0.7)} ${r1(fin * 0.6)} ${r1(cx)} 0Z" fill="url(#mhb-gold)"/>`;
  // lintel with a run of carved rosettes (odd count: one sits under the torana's centre)
  const ly = th; const rr = lh * 0.24;
  let n = Math.max(5, Math.round(DW / (lh * 1.9)));
  if (!(n % 2)) n += 1;
  let ros = '';
  for (let k = 0; k < n; k++) ros += rosette((k + 0.5) * DW / n, ly + lh / 2, rr, { petals: 8, inner: 'var(--mg-ox-1)', sw: 0.45 });
  const lintel = `<rect x="0" y="${r1(ly)}" width="${r1(DW)}" height="${r1(lh)}" fill="url(#mhb-ox)"/><rect x="0" y="${r1(ly)}" width="${r1(DW)}" height="${r1(lh)}" fill="url(#mhb-sheen)"/>
    <path d="M0 ${r1(ly + 1.2 * s)}H${r1(DW)}M0 ${r1(ly + lh - 1.2 * s)}H${r1(DW)}" stroke="url(#mhb-gold)" stroke-width="${r1(2.4 * s)}"/>
    <path d="M0 ${r1(ly + 5 * s)}H${r1(DW)}M0 ${r1(ly + lh - 5 * s)}H${r1(DW)}" stroke="#D9AA52" stroke-opacity=".6" stroke-width="${r1(0.8 * s)}"/>
    <path d="M${r1(1 * s)} ${r1(ly)}V${r1(ly + lh)}M${r1(DW - 1 * s)} ${r1(ly)}V${r1(ly + lh)}" stroke="url(#mhb-gold-v)" stroke-width="${r1(2 * s)}"/>
    ${lh > 26 ? ros : ''}`;
  // the step
  const sy = fh - sill;
  const step = `<rect x="0" y="${r1(sy)}" width="${r1(DW)}" height="${r1(sill)}" style="fill:var(--mg-ox)"/><path d="M0 ${r1(sy + 1)}H${r1(DW)}" stroke="url(#mhb-gold)" stroke-width="${r1(2 * s)}"/>`;
  const py = ly + lh; const ph = sy - py;
  const reveal = `<rect x="${r1(ox - 1)}" y="${r1(oy - 1)}" width="${r1(ow + 2)}" height="${r1(oh + 2)}" fill="none" stroke="url(#mhb-gold)" stroke-width="${r1(1.6 * s)}"/>`;
  return `<svg class="mhb-frame-svg" width="${r1(DW)}" height="${r1(fh)}" viewBox="0 0 ${r1(DW)} ${r1(fh)}" aria-hidden="true" focusable="false">
    <path d="${tor}" fill="url(#mhb-lacquer)"/>
    <path d="${tor}" fill="url(#mhb-sheen)"/>
    <clipPath id="mhb-tor-clip"><path d="${tor}"/></clipPath>
    <path d="${halo}" stroke="#E8BF63" stroke-opacity=".42" stroke-width="${r1(1 * s)}" clip-path="url(#mhb-tor-clip)"/>
    <path d="${tor}" fill="none" stroke="url(#mhb-gold)" stroke-width="${r1(3 * s)}"/>
    <path d="${tor1}" fill="none" stroke="#E2B65C" stroke-width="${r1(2.2 * s)}" stroke-dasharray="0 ${r1(6 * s)}" stroke-linecap="round"/>
    <path d="${tor2}" fill="none" stroke="#D9AA52" stroke-opacity=".7" stroke-width="${r1(0.9 * s)}"/>
    ${finial}
    ${ganesh ? '' : rosette(cx, medalY, medal * 0.36, { petals: 16 })}
    ${reveal}
    ${pillar(ext, py, pw, ph, s)}${pillar(DW - ext - pw, py, pw, ph, s)}
    ${lintel}${step}
  </svg>`;
}

/** The inner panel's gold border (seen as the doors open). */
export function panelBorderSVG(L) {
  const { ow, oh } = L;
  const s = Math.max(0.6, Math.min(1.2, ow / 900));
  const r = (i, extra) => `<rect x="${r1(i)}" y="${r1(i)}" width="${r1(ow - 2 * i)}" height="${r1(oh - 2 * i)}" fill="none" ${extra}/>`;
  return `<svg class="mhb-panel-svg" width="${r1(ow)}" height="${r1(oh)}" viewBox="0 0 ${r1(ow)} ${r1(oh)}" aria-hidden="true" focusable="false">
    ${r(12 * s, `stroke="url(#mhb-gold)" stroke-width="${r1(2 * s)}"`)}
    ${r(19 * s, `stroke="#E2B65C" stroke-width="${r1(3 * s)}" stroke-dasharray="0 ${r1(8 * s)}" stroke-linecap="round"`)}
  </svg>`;
}

/** One carved door leaf (a rectangle): red lacquer, a gold border, a small upper panel with a lotus, a tall
 *  lower panel with a fine lattice, rows of brass studs and a gold astragal at the meeting edge. */
export function leafSVG(side, w, h) {
  const s = Math.max(0.42, Math.min(1.2, w / 440));
  const seam = side === 'l' ? w : 0;
  const dir = side === 'l' ? 1 : -1;
  const m = Math.max(10, 26 * s);
  const px0 = m; const px1 = w - m;
  const uy0 = h * 0.07; const uy1 = h * 0.25;
  const ly0 = h * 0.3; const ly1 = h - h * 0.07;
  const panel = (y0, y1) => `<rect x="${r1(px0)}" y="${r1(y0)}" width="${r1(px1 - px0)}" height="${r1(y1 - y0)}" style="fill:var(--mg-leafpanel)"/>`
    + `<rect x="${r1(px0)}" y="${r1(y0)}" width="${r1(px1 - px0)}" height="${r1(y1 - y0)}" fill="none" stroke="url(#mhb-gold)" stroke-width="${r1(2.2 * s)}"/>`
    + `<rect x="${r1(px0 + 6 * s)}" y="${r1(y0 + 6 * s)}" width="${r1(px1 - px0 - 12 * s)}" height="${r1(y1 - y0 - 12 * s)}" fill="none" stroke="#D9AA52" stroke-opacity=".6" stroke-width="${r1(0.8 * s)}"/>`;
  let lat = '';
  const step = 30 * Math.max(0.7, s);
  const H = ly1 - ly0;
  for (let k = -Math.ceil(H / step); k < Math.ceil((px1 - px0) / step) + 2; k++) {
    const x = px0 + k * step;
    lat += `M${r1(x)} ${r1(ly0)}L${r1(x + H)} ${r1(ly1)}M${r1(x)} ${r1(ly1)}L${r1(x + H)} ${r1(ly0)}`;
  }
  const id = `mhb-lat-${side}`;
  const lotusR = Math.min((px1 - px0) * 0.2, (uy1 - uy0) * 0.3);
  const lotusX = (px0 + px1) / 2;
  return `<svg class="mhb-leaf-svg" width="${r1(w)}" height="${r1(h)}" viewBox="0 0 ${r1(w)} ${r1(h)}" aria-hidden="true" focusable="false">
    <defs><clipPath id="${id}"><rect x="${r1(px0)}" y="${r1(ly0)}" width="${r1(px1 - px0)}" height="${r1(H)}"/></clipPath></defs>
    <rect width="${r1(w)}" height="${r1(h)}" fill="url(#mhb-lacquer${side === 'r' ? '-r' : ''})"/>
    ${panel(uy0, uy1)}${panel(ly0, ly1)}
    <path d="${lat}" stroke="#D7A84E" stroke-opacity=".2" stroke-width="${r1(0.9 * s)}" clip-path="url(#${id})"/>
    ${rosette(lotusX, (uy0 + uy1) / 2, lotusR, { petals: 16 })}
    ${studs(px0, (uy1 + ly0) / 2, px1, (uy1 + ly0) / 2, 3.4 * s, 24 * s)}
    ${studs(px0, h * 0.035, px1, h * 0.035, 3.4 * s, 24 * s)}
    ${studs(px0, h - h * 0.035, px1, h - h * 0.035, 3.4 * s, 24 * s)}
    <rect x="${r1(5 * s)}" y="${r1(5 * s)}" width="${r1(w - 10 * s)}" height="${r1(h - 10 * s)}" fill="none" stroke="url(#mhb-gold)" stroke-width="${r1(1.6 * s)}"/>
    <path d="M${r1(seam - dir * 4 * s)} 0V${r1(h)}" stroke="url(#mhb-gold-v)" stroke-width="${r1(7 * s)}"/>
    <path d="M${r1(seam - dir * 9.5 * s)} 0V${r1(h)}" style="stroke:var(--mg-ox)" stroke-opacity=".5" stroke-width="${r1(1.2 * s)}"/>
    <rect width="${r1(w)}" height="${r1(h)}" fill="url(#mhb-sheen)"/>
    <rect x=".75" y=".75" width="${r1(w - 1.5)}" height="${r1(h - 1.5)}" fill="none" style="stroke:var(--mg-edge)" stroke-width="1.5"/>
  </svg>`;
}

/** A cast-brass temple bell (ghanti) on a chain, seen from a little below: a domed crown with a hanging loop,
 *  a waisted body that flares to a thick rolled lip, the dark mouth with the clapper hanging in it, incised rings,
 *  a polished highlight down the left and a warm rim light on the right. Drawn at w × h pixels. */
export function bellSVG(w, h, { links = 4 } = {}) {
  const cx = w / 2;
  const B = w * 0.47;                  // half-width at the lip
  const chainH = h * 0.27;
  const loopH = h * 0.06;
  const y0 = chainH + loopH;           // top of the crown
  const yl = h * 0.84;                 // the lip line
  const Hb = yl - y0;
  const ry = B * 0.2;                  // the mouth ellipse
  const sw = Math.max(0.6, w * 0.022);
  const P = (fx, fy) => `${r1(cx + fx * B)} ${r1(y0 + fy * Hb)}`;
  // chain: alternating face-on and edge-on links, each a dark under-stroke and a brass stroke
  let chain = '';
  const lk = chainH / links;
  for (let k = 0; k < links; k++) {
    const y = k * lk + lk / 2;
    const face = k % 2 === 0;
    const rx = face ? w * 0.075 : w * 0.026 + 0.5; const ryk = lk * 0.62;
    chain += `<ellipse cx="${r1(cx)}" cy="${r1(y)}" rx="${r1(rx)}" ry="${r1(ryk)}" fill="none" stroke="#3A2406" stroke-width="${r1(sw * 2.3)}"/>`
      + `<ellipse cx="${r1(cx)}" cy="${r1(y)}" rx="${r1(rx)}" ry="${r1(ryk)}" fill="none" stroke="url(#mhb-bchain)" stroke-width="${r1(sw * 1.5)}"/>`;
  }
  // hanging loop on the crown
  const loop = `<ellipse cx="${r1(cx)}" cy="${r1(chainH + loopH * 0.35)}" rx="${r1(w * 0.09)}" ry="${r1(loopH * 0.75)}" fill="none" stroke="#3A2406" stroke-width="${r1(sw * 2.6)}"/>`
    + `<ellipse cx="${r1(cx)}" cy="${r1(chainH + loopH * 0.35)}" rx="${r1(w * 0.09)}" ry="${r1(loopH * 0.75)}" fill="none" stroke="url(#mhb-bchain)" stroke-width="${r1(sw * 1.7)}"/>`;
  // body silhouette: dome, shoulder, waist, flare, then the front of the lip
  // classic temple-bell silhouette: rounded crown, gently widening waist, short flare at the lip
  const body = `M${P(-0.5, 0.14)}`
    + `C${P(-0.52, -0.04)} ${P(-0.16, -0.06)} ${P(0, -0.06)}`
    + `C${P(0.16, -0.06)} ${P(0.52, -0.04)} ${P(0.5, 0.14)}`
    + `C${P(0.54, 0.4)} ${P(0.6, 0.62)} ${P(0.72, 0.8)}`
    + `C${P(0.8, 0.92)} ${P(0.92, 0.96)} ${P(1, 0.99)}`
    + `L${P(1, 1)}`
    + `A${r1(B)} ${r1(ry)} 0 0 0 ${P(-1, 1)}`
    + `L${P(-1, 0.99)}`
    + `C${P(-0.92, 0.96)} ${P(-0.8, 0.92)} ${P(-0.72, 0.8)}`
    + `C${P(-0.6, 0.62)} ${P(-0.54, 0.4)} ${P(-0.5, 0.14)}Z`;
  // incised rings (bowed down a touch: we look up at the bell)
  const ring = (fy, half, dy = 0.035) => {
    const yy = y0 + fy * Hb;
    return `<path d="M${r1(cx - half * B)} ${r1(yy)}Q${r1(cx)} ${r1(yy + dy * Hb * 2)} ${r1(cx + half * B)} ${r1(yy)}" fill="none" stroke="#4A2C06" stroke-opacity=".75" stroke-width="${r1(sw)}"/>`
      + `<path d="M${r1(cx - half * B)} ${r1(yy + sw * 1.3)}Q${r1(cx)} ${r1(yy + sw * 1.3 + dy * Hb * 2)} ${r1(cx + half * B)} ${r1(yy + sw * 1.3)}" fill="none" stroke="#FFE9A8" stroke-opacity=".55" stroke-width="${r1(sw * 0.8)}"/>`;
  };
  const neckW = B * 0.16;
  const mouthY = yl + ry * 0.15;
  const lipT = Math.max(1.4, Hb * 0.055);
  const ballR = B * 0.17;
  const ballY = mouthY + ry * 0.55;
  return `<svg class="mhb-bell-svg" width="${r1(w)}" height="${r1(h)}" viewBox="0 0 ${r1(w)} ${r1(h)}" aria-hidden="true" focusable="false" overflow="visible">
    <defs><filter id="mhb-bsoft" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="${r1(Math.max(0.6, w * 0.035))}"/></filter></defs>
    ${chain}${loop}
    <rect x="${r1(cx - neckW)}" y="${r1(y0 - Hb * 0.09)}" width="${r1(neckW * 2)}" height="${r1(Hb * 0.1)}" rx="${r1(neckW * 0.4)}" fill="url(#mhb-bbody)" stroke="#3A2406" stroke-width="${r1(sw * 0.6)}"/>
    <path d="${body}" fill="url(#mhb-bbody)" stroke="#3A2406" stroke-width="${r1(sw * 0.7)}" stroke-linejoin="round"/>
    <path d="${body}" fill="url(#mhb-bshade)"/>
    ${ring(0.14, 0.31, 0.02)}${ring(0.5, 0.41)}${ring(0.8, 0.62, 0.04)}
    <ellipse cx="${r1(cx)}" cy="${r1(yl)}" rx="${r1(B * 0.99)}" ry="${r1(ry)}" fill="url(#mhb-bmouth)"/>
    <line x1="${r1(cx)}" y1="${r1(mouthY - ry * 0.6)}" x2="${r1(cx)}" y2="${r1(ballY)}" stroke="#2A1803" stroke-width="${r1(Math.max(1, w * 0.04))}"/>
    <circle cx="${r1(cx)}" cy="${r1(ballY)}" r="${r1(ballR)}" fill="url(#mhb-bball)" stroke="#3A2406" stroke-width="${r1(sw * 0.5)}"/>
    <path d="M${r1(cx - B)} ${r1(yl - lipT * 0.4)}A${r1(B)} ${r1(ry)} 0 0 0 ${r1(cx + B)} ${r1(yl - lipT * 0.4)}L${r1(cx + B)} ${r1(yl + lipT * 0.6)}A${r1(B)} ${r1(ry)} 0 0 1 ${r1(cx - B)} ${r1(yl + lipT * 0.6)}Z" fill="url(#mhb-blip)" stroke="#3A2406" stroke-width="${r1(sw * 0.6)}"/>
    <path d="M${r1(cx - B * 0.98)} ${r1(yl - lipT * 0.1)}A${r1(B)} ${r1(ry)} 0 0 0 ${r1(cx + B * 0.2)} ${r1(yl + ry * 0.98)}" fill="none" stroke="#FFF6DA" stroke-opacity=".7" stroke-width="${r1(sw * 0.8)}"/>
    <path d="M${P(-0.2, 0.05)}C${P(-0.26, 0.3)} ${P(-0.3, 0.55)} ${P(-0.42, 0.74)}C${P(-0.52, 0.86)} ${P(-0.66, 0.92)} ${P(-0.74, 0.94)}" fill="none" stroke="#FFFBEA" stroke-opacity=".85" stroke-linecap="round" stroke-width="${r1(Math.max(1.2, w * 0.07))}" filter="url(#mhb-bsoft)"/>
    <ellipse cx="${r1(cx - B * 0.12)}" cy="${r1(y0 + Hb * 0.04)}" rx="${r1(B * 0.12)}" ry="${r1(Hb * 0.03)}" fill="#FFF8E0" opacity=".75" filter="url(#mhb-bsoft)"/>
  </svg>`;
}

/** A brass standing diyo with a lit wick. w × h; the flame is its own group for a gentle flicker. */
export function diyoSVG(w, h) {
  const cx = w / 2;
  const by = h * 0.98;
  const p = (fx, fy) => `${r1(cx + fx * w)} ${r1(fy * h)}`;
  const foot = `M${p(-0.34, 0.98)}Q${p(-0.34, 0.9)} ${p(-0.12, 0.88)}L${p(-0.06, 0.84)}L${p(0.06, 0.84)}L${p(0.12, 0.88)}Q${p(0.34, 0.9)} ${p(0.34, 0.98)}Z`;
  const stem = `M${p(-0.05, 0.84)}L${p(-0.045, 0.64)}L${p(0.045, 0.64)}L${p(0.05, 0.84)}Z`;
  const bowl2 = `M${p(-0.46, 0.5)}Q${p(-0.4, 0.66)} ${p(0, 0.67)}Q${p(0.38, 0.66)} ${p(0.44, 0.53)}Q${p(0.5, 0.5)} ${p(0.54, 0.47)}Q${p(0.46, 0.5)} ${p(0.4, 0.5)}Z`;
  // the flame sits on the wick at the spout: a warm outer flame, a golden body, a white-hot core and a blue root
  const fx = 0.37; const fb = 0.475;
  const tear = (hw, tip, base = fb) => `M${p(fx, base)}C${p(fx - hw * 1.25, base - 0.02)} ${p(fx - hw * 0.9, base - (base - tip) * 0.55)} ${p(fx, tip)}C${p(fx + hw * 0.9, base - (base - tip) * 0.55)} ${p(fx + hw * 1.25, base - 0.02)} ${p(fx, base)}Z`;
  return `<svg class="mhb-diyo-svg" width="${r1(w)}" height="${r1(h)}" viewBox="0 0 ${r1(w)} ${r1(h)}" aria-hidden="true" focusable="false" overflow="visible">
    <ellipse cx="${r1(cx + w * 0.04)}" cy="${r1(by)}" rx="${r1(w * 0.42)}" ry="${r1(h * 0.022)}" fill="#2E1004" opacity=".25"/>
    <path d="${foot}" fill="url(#mhb-brass)"/>
    <path d="${stem}" fill="url(#mhb-brass)"/>
    <ellipse cx="${r1(cx)}" cy="${r1(h * 0.74)}" rx="${r1(w * 0.085)}" ry="${r1(h * 0.025)}" fill="url(#mhb-brass)"/>
    <ellipse cx="${r1(cx)}" cy="${r1(h * 0.665)}" rx="${r1(w * 0.12)}" ry="${r1(h * 0.022)}" fill="url(#mhb-brass)"/>
    <path d="${bowl2}" fill="url(#mhb-brass)"/>
    <ellipse cx="${r1(cx - w * 0.02)}" cy="${r1(h * 0.505)}" rx="${r1(w * 0.42)}" ry="${r1(h * 0.035)}" fill="#6A4410"/>
    <ellipse cx="${r1(cx - w * 0.02)}" cy="${r1(h * 0.508)}" rx="${r1(w * 0.36)}" ry="${r1(h * 0.024)}" fill="#E0A848" opacity=".7"/>
    <ellipse cx="${r1(cx + w * 0.2)}" cy="${r1(h * 0.5)}" rx="${r1(w * 0.2)}" ry="${r1(h * 0.016)}" fill="#FFE2A0" opacity=".55"/>
    <path d="M${p(fx - 0.02, 0.5)}L${p(fx, 0.47)}" stroke="#2A1804" stroke-width="${r1(Math.max(1.2, w * 0.024))}" stroke-linecap="round"/>
    <g class="mhb-flame">
      <path d="${tear(0.1, 0.04)}" fill="url(#mhb-fl-out)"/>
      <path d="${tear(0.068, 0.15)}" fill="url(#mhb-fl-mid)"/>
      <path d="${tear(0.034, 0.28, fb - 0.01)}" fill="#FFFDF2"/>
      <ellipse cx="${r1(cx + fx * w)}" cy="${r1(h * (fb - 0.012))}" rx="${r1(w * 0.03)}" ry="${r1(h * 0.016)}" fill="#3E6FE0" opacity=".55"/>
    </g>
  </svg>`;
}

/** A Palpali Dhaka band, woven pixel by pixel: black-edged diamonds with cream and orange hearts on red. */
export function dhakaTile(p = 3) {
  const cols = 32, rows = 16;
  const C = { r: '#A3141C', k: '#1C1210', w: '#F3E7D3', o: '#E8812B', g: '#2F6B3A', y: '#E6B62C', m: '#7A0C14' };
  let rects = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let col = 'r';
      if (r === 0 || r === rows - 1) col = 'k';
      else if (r === 1 || r === rows - 2) col = (c % 4 < 2) ? 'w' : 'o';
      else {
        const cy = 7.5;
        const d = Math.min(Math.abs(c + 0.5 - 8), Math.abs(c + 0.5 - 24)) + Math.abs(r + 0.0 - cy);
        if (d < 1.6) col = 'o';
        else if (d < 2.6) col = 'w';
        else if (d < 3.6) col = 'k';
        else if (d < 4.6) col = 'r';
        else if (d < 5.6) col = 'k';
        const e = Math.min(Math.abs(c + 0.5 - 16), Math.abs(c + 0.5), Math.abs(c + 0.5 - 32));
        if (r >= 2 && r <= 4 && e <= 4.2 - (r - 2) * 1.6) col = 'g';
        if (r >= 11 && r <= 13 && e <= 4.2 - (13 - r) * 1.6) col = 'y';
      }
      if (col !== 'r') rects += `<rect x="${c * p}" y="${r * p}" width="${p}" height="${p}" fill="${C[col]}"/>`;
    }
  }
  // weave: faint warp and weft lines
  let weave = '';
  for (let c = 0; c < cols; c++) weave += `<rect x="${c * p}" y="0" width="${Math.max(0.5, p * 0.18)}" height="${rows * p}" fill="#000" opacity=".10"/>`;
  for (let r = 0; r < rows; r++) weave += `<rect x="0" y="${r * p + p * 0.82}" width="${cols * p}" height="${Math.max(0.5, p * 0.18)}" fill="#000" opacity=".08"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * p}" height="${rows * p}" viewBox="0 0 ${cols * p} ${rows * p}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${C.r}"/>${rects}${weave}</svg>`;
  return { url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, w: cols * p, h: rows * p };
}

/** Crowns above uncropped photos: three shapes so the frames vary. viewBox 200 × H. */
export function crownSVG(kind) {
  const red = 'var(--mg-red)';
  if (kind === 'temple') {
    const H = 78;
    const d = `M0 ${H}V54C0 38 40 26 70 18C86 13 96 8 100 0C104 8 114 13 130 18C160 26 200 38 200 54V${H}Z`;
    const d2 = `M8 ${H}V56C8 43 44 32 72 25C87 21 96 16 100 9C104 16 113 21 128 25C156 32 192 43 192 56V${H}`;
    return { H, svg: `<svg viewBox="0 0 200 ${H}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><path d="${d}" style="fill:${red}"/><path d="${d}" fill="none" stroke="url(#mhb-gold)" stroke-width="3"/><path d="${d2}" fill="none" stroke="#E2B65C" stroke-width="2.2" stroke-dasharray="0 6" stroke-linecap="round"/>${rosette(100, 52, 15, { petals: 12 })}<circle cx="100" cy="2.5" r="3.2" fill="url(#mhb-stud)"/></svg>` };
  }
  if (kind === 'round') {
    const H = 62;
    const d = `M0 ${H}V60A100 58 0 0 1 200 60V${H}Z`;
    let rays = '';
    for (let k = 1; k < 12; k++) { const a = Math.PI - (k / 12) * Math.PI; rays += `M100 ${H}L${r1(100 + Math.cos(a) * 80)} ${r1(H - Math.sin(a) * 50)}`; }
    return { H, svg: `<svg viewBox="0 0 200 ${H}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><path d="${d}" style="fill:${red}"/><path d="${rays}" stroke="#E2B65C" stroke-opacity=".6" stroke-width="1.2"/><path d="M8 ${H}V60A92 50 0 0 1 192 60V${H}" fill="none" stroke="#E2B65C" stroke-width="2.2" stroke-dasharray="0 6" stroke-linecap="round"/><path d="${d}" fill="none" stroke="url(#mhb-gold)" stroke-width="3"/>${rosette(100, H - 2, 13, { petals: 10 })}</svg>` };
  }
  // scalloped (multifoil) arch
  const H = 66;
  const pts = [[0, 62], [22, 40], [52, 22], [100, 8], [148, 22], [178, 40], [200, 62]];
  let d = `M0 ${H}V62`;
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1]; const [x1, y1] = pts[k];
    const mx = (x0 + x1) / 2 - (y1 - y0) * 0.35; const my = (y0 + y1) / 2 - (x1 - x0) * 0.35;
    d += `Q${r1(mx)} ${r1(my)} ${x1} ${y1}`;
  }
  d += `V${H}Z`;
  return { H, svg: `<svg viewBox="0 0 200 ${H}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><path d="${d}" style="fill:${red}"/><path d="${d}" fill="none" stroke="url(#mhb-gold)" stroke-width="3"/>${rosette(100, 42, 12, { petals: 8 })}<circle cx="60" cy="48" r="3" fill="url(#mhb-stud)"/><circle cx="140" cy="48" r="3" fill="url(#mhb-stud)"/></svg>` };
}

/** Sindoor swastika painted on the kalash (only when the studio leaves it on). */
export function swastikaSVG(size) {
  const s = size;
  const u = s / 10;
  const d = `M${5 * u} ${1 * u}V${9 * u}M${1 * u} ${5 * u}H${9 * u}M${5 * u} ${1 * u}H${8.4 * u}M${9 * u} ${5 * u}V${8.4 * u}M${5 * u} ${9 * u}H${1.6 * u}M${1 * u} ${5 * u}V${1.6 * u}`;
  let dots = '';
  for (const [x, y] of [[3, 3], [7, 3], [3, 7], [7, 7]]) dots += `<circle cx="${x * u}" cy="${y * u}" r="${u * 0.55}"/>`;
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true" focusable="false"><g fill="none" stroke="#C3121C" stroke-width="${r1(u * 0.9)}" stroke-linecap="round" stroke-linejoin="round" opacity=".92"><path d="${d}"/></g><g fill="#C3121C" opacity=".92">${dots}</g></svg>`;
}

/** A gold ornament for section heads: a rosette between tapering rules. */
export function dividerSVG(w = 220) {
  const h = 26; const c = w / 2;
  return `<svg class="mhb-div" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">
    <path d="M4 ${h / 2}L${c - 24} ${h / 2 - 1}L${c - 24} ${h / 2 + 1}Z M${w - 4} ${h / 2}L${c + 24} ${h / 2 - 1}L${c + 24} ${h / 2 + 1}Z" fill="url(#mhb-gold)"/>
    <circle cx="${c - 32}" cy="${h / 2}" r="2.2" fill="#C8963C"/><circle cx="${c + 32}" cy="${h / 2}" r="2.2" fill="#C8963C"/>
    ${rosette(c, h / 2, 11, { petals: 10 })}
  </svg>`;
}

/** Falling petal shapes (marigold and rose). */
export function petalSVG(kind, size) {
  if (kind === 'leaf') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1C14.5 5 15.5 11 10 19C4.5 11 5.5 5 10 1Z" fill="#4F8A3C" stroke="#2F5E24" stroke-width=".7"/><path d="M10 3V17" stroke="#C9E0A4" stroke-opacity=".6" stroke-width=".6" fill="none"/></svg>`;
  }
  const fill = kind === 'rose' ? '#C3172A' : kind === 'pink' ? '#E35A7E' : '#F29A1F';
  const edge = kind === 'rose' ? '#8E0D1C' : kind === 'pink' ? '#B8355A' : '#D9700F';
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1C15 4 18 9 16 14C14 18 6 18 4 14C2 9 5 4 10 1Z" fill="${fill}" stroke="${edge}" stroke-width=".8"/><path d="M10 3C9 8 9 12 10 17" stroke="${edge}" stroke-opacity=".45" stroke-width=".6" fill="none"/></svg>`;
}
