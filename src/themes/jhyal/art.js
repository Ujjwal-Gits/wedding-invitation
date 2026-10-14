// Jhyal (झ्याल) · the carved Newari window, drawn in SVG.
// Everything here is vector, built from one geometry (windowGeom) so the gate window, the photo frame and the
// closing window share their carving: a cusped torana with a half lotus and vine scrolls, an extended lintel and
// sill with scrolled wings, a frame of bead-and-reel, a gilt fillet and lotus petals, and lattice shutters.
// Colours: sal wood browns, antique gold, never black.
const r1 = (n) => Math.round(n * 10) / 10;

export const WOOD = {
  hi: '#9E6E46', lit: '#8A5C38', mid: '#6E4529', face: '#613C23', dk: '#4A2B18', deep: '#33200F', groove: '#2A170C',
};

/** Shared gradients and the lattice pattern (inserted once into the page). */
export const DEFS = `<svg class="jh-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
  <defs>
    <linearGradient id="jh-wv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#94643E"/><stop offset=".42" stop-color="#704629"/><stop offset="1" stop-color="#4B2C18"/></linearGradient>
    <linearGradient id="jh-wh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4E2E19"/><stop offset=".4" stop-color="#76492B"/><stop offset=".75" stop-color="#5E3920"/><stop offset="1" stop-color="#432716"/></linearGradient>
    <radialGradient id="jh-bead" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#B98B5C"/><stop offset=".5" stop-color="#7C4F2E"/><stop offset="1" stop-color="#3F2414"/></radialGradient>
    <radialGradient id="jh-petal" cx=".5" cy=".25" r=".85"><stop offset="0" stop-color="#A97A4E"/><stop offset=".55" stop-color="#6F4528"/><stop offset="1" stop-color="#3E2314"/></radialGradient>
    <linearGradient id="jh-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EBD59A"/><stop offset=".45" stop-color="#C6A15A"/><stop offset="1" stop-color="#8A672A"/></linearGradient>
    <radialGradient id="jh-goldr" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#F3E2B0"/><stop offset=".45" stop-color="#C9A45E"/><stop offset="1" stop-color="#7E5D24"/></radialGradient>
    <linearGradient id="jh-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6DE98"/><stop offset=".35" stop-color="#D2A650"/><stop offset=".7" stop-color="#A37630"/><stop offset="1" stop-color="#6E4A16"/></linearGradient>
    <radialGradient id="jh-fl-out" cx=".5" cy=".75" r=".7"><stop offset="0" stop-color="#FFE7A0"/><stop offset=".6" stop-color="#FFB347" stop-opacity=".85"/><stop offset="1" stop-color="#FF7A1A" stop-opacity="0"/></radialGradient>
    <radialGradient id="jh-fl-mid" cx=".5" cy=".75" r=".6"><stop offset="0" stop-color="#FFFBEA"/><stop offset=".7" stop-color="#FFD36B"/><stop offset="1" stop-color="#FFB040"/></radialGradient>
    <pattern id="jh-lat" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect x="0" y="0" width="24" height="6.6" fill="#5F3A21"/>
      <rect x="0" y="0" width="6.6" height="24" fill="#5F3A21"/>
      <rect x="6.6" y="0" width="17.4" height="1.5" fill="#A0704A"/>
      <rect x="6.6" y="5.2" width="17.4" height="1.4" fill="#2C180B" opacity=".75"/>
      <rect x="0" y="6.6" width="1.5" height="17.4" fill="#93643F"/>
      <rect x="5.2" y="6.6" width="1.4" height="17.4" fill="#2C180B" opacity=".75"/>
      <circle cx="3.3" cy="3.3" r="3.1" fill="url(#jh-bead)"/>
      <circle cx="2.8" cy="2.7" r=".9" fill="#E3C98C" opacity=".75"/>
    </pattern>
  </defs>
</svg>`;

/** The geometry of one window around an opening of ow × oh (viewBox units). */
export function windowGeom({ ow, oh, torana = true, apron = true }) {
  const B = 78; const WING = 92; const CORN = 10; const LH = 56; const SH = 48;
  const fw = ow + 2 * B;
  const TW = fw + 2 * WING;
  const tW = torana ? fw * 0.8 : 0;
  const TB = torana ? Math.round(tW * 0.33) : 0; // the arch itself
  const FIN = torana ? 34 : 0;                   // the gilt finial above it
  const TH = TB + FIN;
  const AH = apron ? 30 : 0;
  const yL = TH;
  const yF = yL + CORN + LH;
  const fh = oh + 2 * B;
  const yS = yF + fh;
  const H = yS + CORN + SH + AH;
  return { B, WING, CORN, LH, SH, AH, fw, fh, TW, tW, TB, FIN, TH, yL, yF, yS, H, fx: WING, ox: WING + B, oy: yF + B, ow, oh, torana };
}

// ───────── small carved parts ─────────
const petalPath = (w, h) => `M${r1(-w / 2)} ${r1(h / 2)}C${r1(-w / 2)} ${r1(-h / 6)} ${r1(-w / 6)} ${r1(-h / 2.6)} 0 ${r1(-h / 2)}C${r1(w / 6)} ${r1(-h / 2.6)} ${r1(w / 2)} ${r1(-h / 6)} ${r1(w / 2)} ${r1(h / 2)}Z`;
/** A carved petal pointing up from (0,0), rotated by deg about its base. */
function petal(x, y, w, h, deg, { fill = 'url(#jh-petal)', vein = true, gild = false, base = false } = {}) {
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(deg)})${base ? ` translate(0 ${r1(-h / 2)})` : ''}"><path d="${petalPath(w, h)}" fill="${fill}" stroke="${WOOD.groove}" stroke-width=".8"/>${vein ? `<path d="M0 ${r1(h * 0.36)}V${r1(-h * 0.28)}" stroke="${gild ? '#E9D29A' : '#B48858'}" stroke-opacity=".6" stroke-width=".9" fill="none"/>` : ''}</g>`;
}
/** A small carved rosette with a gilt centre. */
export function rosette(cx, cy, r, { petals = 8, gold = false } = {}) {
  let s = `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r * 1.08)}" fill="${WOOD.deep}"/>`;
  for (let i = 0; i < petals; i++) {
    const a = (360 / petals) * i;
    s += `<g transform="translate(${r1(cx)} ${r1(cy)}) rotate(${r1(a)})"><path d="${petalPath(r * 0.62, r * 0.92).replace(/^M/, 'M')}" transform="translate(0 ${r1(-r * 0.5)})" fill="${gold ? 'url(#jh-gold)' : 'url(#jh-petal)'}" stroke="${WOOD.groove}" stroke-width=".6"/></g>`;
  }
  s += `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r * 0.3)}" fill="url(#jh-goldr)" stroke="#5E431A" stroke-width=".5"/>`;
  return s;
}
/** Four bevelled sides of a rectangular ring (mitred like a real moulding). c = [top, right, bottom, left]. */
function bevel(x, y, w, h, t, c) {
  const X = x + w; const Y = y + h;
  return `<path d="M${r1(x)} ${r1(y)}H${r1(X)}L${r1(X - t)} ${r1(y + t)}H${r1(x + t)}Z" fill="${c[0]}"/>`
    + `<path d="M${r1(X)} ${r1(y)}V${r1(Y)}L${r1(X - t)} ${r1(Y - t)}V${r1(y + t)}Z" fill="${c[1]}"/>`
    + `<path d="M${r1(x)} ${r1(Y)}H${r1(X)}L${r1(X - t)} ${r1(Y - t)}H${r1(x + t)}Z" fill="${c[2]}"/>`
    + `<path d="M${r1(x)} ${r1(y)}V${r1(Y)}L${r1(x + t)} ${r1(Y - t)}V${r1(y + t)}Z" fill="${c[3]}"/>`;
}
const CONVEX = ['#956440', '#4F2F1A', '#3D2414', '#7A4E2E'];
const CONCAVE = ['#3B2213', '#7E5131', '#946542', '#4C2D19'];
const ring = (x, y, w, h, t, fill) => `<path d="M${r1(x)} ${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}Z M${r1(x + t)} ${r1(y + t)}v${r1(h - 2 * t)}h${r1(w - 2 * t)}v${r1(-(h - 2 * t))}Z" fill="${fill}" fill-rule="evenodd"/>`;

/** Items spaced evenly along a run, never crowding the ends. */
function along(len, gap) { const n = Math.max(1, Math.floor(len / gap)); const g = len / n; return Array.from({ length: n }, (_, i) => g * (i + 0.5)); }

/** A run of beads (bead-and-reel) inside the band at (x,y,w,h,t). */
function beadBand(x, y, w, h, t) {
  let s = ring(x, y, w, h, t, WOOD.deep);
  const r = t * 0.32;
  const reel = (cx, cy, vert) => (vert
    ? `<rect x="${r1(cx - t * 0.18)}" y="${r1(cy - 1)}" width="${r1(t * 0.36)}" height="2" rx="1" fill="#7C4F2E"/>`
    : `<rect x="${r1(cx - 1)}" y="${r1(cy - t * 0.18)}" width="2" height="${r1(t * 0.36)}" rx="1" fill="#7C4F2E"/>`);
  const bead = (cx, cy) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="url(#jh-bead)"/>`;
  const gap = t * 0.95;
  for (const k of along(w - 2 * t, gap)) {
    s += bead(x + t + k, y + t / 2) + bead(x + t + k, y + h - t / 2);
    s += reel(x + t + k + gap / 2, y + t / 2, false) + reel(x + t + k + gap / 2, y + h - t / 2, false);
  }
  for (const k of along(h - 2 * t, gap)) {
    s += bead(x + t / 2, y + t + k) + bead(x + w - t / 2, y + t + k);
  }
  for (const [cx, cy] of [[x + t / 2, y + t / 2], [x + w - t / 2, y + t / 2], [x + t / 2, y + h - t / 2], [x + w - t / 2, y + h - t / 2]]) {
    s += `<rect x="${r1(cx - t / 2)}" y="${r1(cy - t / 2)}" width="${r1(t)}" height="${r1(t)}" fill="${WOOD.dk}"/>` + `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(t * 0.36)}" fill="url(#jh-goldr)"/>`;
  }
  return s;
}
/** A band of lotus petals pointing in toward the opening, with gilt-hearted rosettes at the corners. */
function petalBand(x, y, w, h, t) {
  let s = ring(x, y, w, h, t, WOOD.deep);
  const pw = t * 0.74; const ph = t * 0.84;
  const gap = t * 0.78;
  for (const k of along(w - 2 * t, gap)) {
    s += petal(x + t + k, y + t / 2, pw, ph, 180) + petal(x + t + k, y + h - t / 2, pw, ph, 0);
  }
  for (const k of along(h - 2 * t, gap)) {
    s += petal(x + t / 2, y + t + k, pw, ph, 90) + petal(x + w - t / 2, y + t + k, pw, ph, -90);
  }
  for (const [cx, cy] of [[x + t / 2, y + t / 2], [x + w - t / 2, y + t / 2], [x + t / 2, y + h - t / 2], [x + w - t / 2, y + h - t / 2]]) {
    s += rosette(cx, cy, t * 0.46, { petals: 8 });
  }
  return s;
}
/** The frame bands around an opening (outside in): moulding, beads, gilt fillet, lotus petals, inner reveal. */
export function frameBands(x, y, w, h) {
  let s = bevel(x, y, w, h, 14, CONVEX);
  s += beadBand(x + 14, y + 14, w - 28, h - 28, 20);
  s += ring(x + 34, y + 34, w - 68, h - 68, 4, 'url(#jh-gold)');
  s += petalBand(x + 38, y + 38, w - 76, h - 76, 30);
  s += bevel(x + 68, y + 68, w - 136, h - 136, 10, CONCAVE);
  return s;
}

/** A spiral scroll (the carved vine end), centred at (cx,cy), turning `dir` (1 clockwise, -1 counter). */
function spiral(cx, cy, R, dir = 1, turns = 1.7, start = 0) {
  const pts = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = start + dir * t * turns * Math.PI * 2;
    const r = R * (1 - 0.82 * t);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return `M${pts.map(([px, py]) => `${r1(px)} ${r1(py)}`).join('L')}`;
}

/** The extended beam (lintel above, sill below) with scrolled wing ends. */
function beam(G, y0, h, flip) {
  const { TW, fx, fw } = G;
  const inset = 4;
  const tip = h * 0.44;
  // flip=false: the lintel (its wings curve UP from below); flip=true: the sill (mirror)
  const Y = (v) => (flip ? y0 + h - (v - y0) : v);
  const yb = y0 + h;
  const d = `M${inset} ${r1(Y(y0))}H${r1(TW - inset)}V${r1(Y(y0 + tip))}`
    + `C${r1(TW - inset - G.WING * 0.4)} ${r1(Y(y0 + tip + 2))} ${r1(fx + fw + G.WING * 0.22)} ${r1(Y(yb))} ${r1(fx + fw)} ${r1(Y(yb))}`
    + `H${r1(fx)}C${r1(fx - G.WING * 0.22)} ${r1(Y(yb))} ${r1(inset + G.WING * 0.4)} ${r1(Y(y0 + tip + 2))} ${inset} ${r1(Y(y0 + tip))}Z`;
  let s = `<path d="${d}" fill="url(#jh-wv)" stroke="${WOOD.groove}" stroke-width="1"/>`;
  // a fascia groove and a highlight along the face
  const gy = flip ? y0 + h - 7 : y0 + 7;
  s += `<path d="M${inset + 6} ${r1(gy)}H${r1(TW - inset - 6)}" stroke="${WOOD.groove}" stroke-opacity=".7" stroke-width="1.4"/>`;
  s += `<path d="M${inset + 6} ${r1(gy + (flip ? -2 : 2))}H${r1(TW - inset - 6)}" stroke="#B88A5C" stroke-opacity=".45" stroke-width="1"/>`;
  // carved rosettes and flutes along the beam's middle
  const my = flip ? y0 + h * 0.44 : y0 + h * 0.56;
  const rr = h * 0.25;
  const xs = along(fw - 40, rr * 4.2).map((k) => fx + 20 + k);
  xs.forEach((cx, i) => {
    s += rosette(cx, my, rr, { petals: 8 });
    if (i < xs.length - 1) {
      const mx = (cx + xs[i + 1]) / 2;
      for (const dx of [-5, 0, 5]) s += `<path d="M${r1(mx + dx)} ${r1(my - rr * 0.9)}V${r1(my + rr * 0.9)}" stroke="${WOOD.groove}" stroke-width="2.2" stroke-linecap="round"/><path d="M${r1(mx + dx + 1.2)} ${r1(my - rr * 0.8)}V${r1(my + rr * 0.8)}" stroke="#A97B4F" stroke-opacity=".55" stroke-width=".9"/>`;
    }
  });
  // the wing scrolls
  const sy = flip ? y0 + h * 0.38 : y0 + h * 0.5;
  const sr = h * 0.27;
  for (const [cx, dir] of [[inset + G.WING * 0.42, -1], [TW - inset - G.WING * 0.42, 1]]) {
    s += `<path d="${spiral(cx, sy, sr, dir, 1.6, dir > 0 ? Math.PI : 0)}" fill="none" stroke="${WOOD.groove}" stroke-width="3.4" stroke-linecap="round"/>`;
    s += `<path d="${spiral(cx - 0.8, sy - 0.8, sr, dir, 1.6, dir > 0 ? Math.PI : 0)}" fill="none" stroke="#B48858" stroke-opacity=".6" stroke-width="1.1" stroke-linecap="round"/>`;
    s += `<circle cx="${r1(cx)}" cy="${r1(sy)}" r="2.6" fill="url(#jh-goldr)"/>`;
  }
  return s;
}

/** A projecting cornice strip (lit top face). */
function cornice(G, y, h, up) {
  return `<rect x="0" y="${r1(y)}" width="${G.TW}" height="${h}" fill="${up ? '#A0714A' : '#5A361F'}"/>`
    + `<rect x="0" y="${r1(up ? y + h - 3 : y)}" width="${G.TW}" height="3" fill="${up ? '#5A361F' : '#2F1A0D'}" opacity=".9"/>`
    + `<rect x="0" y="${r1(up ? y : y + h - 1.5)}" width="${G.TW}" height="1.5" fill="${up ? '#C9A06E' : '#7E5333'}" opacity=".8"/>`;
}

/** The hanging dentils under the sill. */
function apron(G) {
  const y = G.yS + G.CORN + G.SH;
  let s = `<rect x="${r1(G.fx + 8)}" y="${r1(y - 2)}" width="${r1(G.fw - 16)}" height="6" fill="${WOOD.dk}"/>`;
  const xs = along(G.fw - 30, 19).map((k) => G.fx + 15 + k);
  for (const x of xs) s += `<path d="M${r1(x - 6)} ${r1(y + 3)}V${r1(y + G.AH - 9)}Q${r1(x - 6)} ${r1(y + G.AH - 1)} ${r1(x)} ${r1(y + G.AH - 1)}Q${r1(x + 6)} ${r1(y + G.AH - 1)} ${r1(x + 6)} ${r1(y + G.AH - 9)}V${r1(y + 3)}Z" fill="url(#jh-wh)" stroke="${WOOD.groove}" stroke-width=".8"/><circle cx="${r1(x)}" cy="${r1(y + G.AH - 7)}" r="1.6" fill="url(#jh-goldr)"/>`;
  return s;
}

/** Points on the upper half-ellipse (a, b) about (cx, cy), from left to right. */
const arcPts = (cx, cy, a, b, n) => Array.from({ length: n + 1 }, (_, i) => { const t = Math.PI - (Math.PI * i) / n; return [cx + Math.cos(t) * a, cy - Math.sin(t) * b]; });
const halfEllipse = (cx, cy, a, b) => `M${r1(cx - a)} ${r1(cy)}A${r1(a)} ${r1(b)} 0 0 1 ${r1(cx + a)} ${r1(cy)}Z`;

/** The torana: a cusped arch over the lintel, a half lotus rising from its base, vine scrolls, a gilt finial. */
function torana(G) {
  const cx = G.TW / 2; const by = G.yL + 2; const a = G.tW / 2; const b = G.TB;
  // cusped outer edge: lobes bulge outward between points on the ellipse
  const pts = arcPts(cx, by, a, b, 11);
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
    const ch = Math.hypot(x1 - x0, y1 - y0);
    d += `A${r1(ch * 0.6)} ${r1(ch * 0.6)} 0 0 1 ${r1(x1)} ${r1(y1)}`;
  }
  d += 'Z';
  let s = `<path d="${d}" fill="url(#jh-wv)" stroke="${WOOD.groove}" stroke-width="1.2"/>`;
  // beads along the band, then the gilt edge and the recessed field
  const ia = a * 0.87; const ib = b * 0.84;
  for (const [x, y] of arcPts(cx, by, a * 0.935, b * 0.915, 26).slice(1, -1)) s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(b * 0.028)}" fill="url(#jh-bead)"/>`;
  s += `<path d="${halfEllipse(cx, by, ia + 3, ib + 3)}" fill="url(#jh-gold)"/>`;
  s += `<path d="${halfEllipse(cx, by, ia, ib)}" fill="#3E2414"/>`;
  s += `<path d="${halfEllipse(cx, by, ia - 6, ib - 6)}" fill="none" stroke="#2A170C" stroke-width="3" opacity=".6"/>`;
  // vine scrolls on either side, rising from the lotus and curling inward
  const L = ib * 0.62; // lotus petal length
  for (const sd of [-1, 1]) {
    const sx = cx + sd * ia * 0.58; const sy = by - ib * 0.44; const R = ib * 0.24;
    const vine = `M${r1(cx + sd * L * 0.5)} ${r1(by - 4)}C${r1(cx + sd * ia * 0.3)} ${r1(by - 2)} ${r1(sx + sd * R * 1.1)} ${r1(by - ib * 0.08)} ${r1(sx + sd * R)} ${r1(sy)}`;
    const curl = spiral(sx, sy, R, sd > 0 ? -1 : 1, 1.45, sd > 0 ? 0 : Math.PI);
    for (const [col, w, o] of [[WOOD.groove, 7, 1], ['#8A5C38', 4.4, 1], ['#C29766', 1.4, 0.7]]) {
      s += `<path d="${vine}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/><path d="${curl}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;
    }
    // three leaves along the vine
    for (const [t, ang, k] of [[0.35, -60, 1], [0.62, -25, 0.9], [0.84, 20, 0.75]]) {
      const lx = cx + sd * (L * 0.5 + (ia * 0.58 + R - L * 0.5) * t); const ly = by - 4 - ib * 0.36 * t * t;
      s += petal(lx, ly, b * 0.075 * k, b * 0.16 * k, sd * (ang + 10), { vein: true, base: true });
    }
    s += `<circle cx="${r1(sx)}" cy="${r1(sy)}" r="${r1(b * 0.03)}" fill="url(#jh-goldr)"/>`;
  }
  // the half lotus: a back row of seven petals, a front row of five, a gilt seed-pod
  for (let i = 0; i < 7; i++) {
    const ang = -78 + (156 / 6) * i;
    s += petal(cx, by - 3, L * 0.34, L, ang, { gild: true, base: true });
  }
  for (let i = 0; i < 5; i++) {
    const ang = -64 + (128 / 4) * i;
    s += petal(cx, by - 3, L * 0.3, L * 0.72, ang, { fill: 'url(#jh-bead)', gild: true, base: true });
  }
  s += `<path d="M${r1(cx - L * 0.26)} ${r1(by - 2)}A${r1(L * 0.26)} ${r1(L * 0.24)} 0 0 1 ${r1(cx + L * 0.26)} ${r1(by - 2)}Z" fill="url(#jh-goldr)" stroke="#5E431A" stroke-width=".8"/>`;
  for (const k of [-0.13, 0, 0.13]) s += `<circle cx="${r1(cx + k * L)}" cy="${r1(by - L * 0.1 - (k ? 0 : L * 0.05))}" r="${r1(L * 0.03)}" fill="#7E5D24"/>`;
  // a small gilt sun disc above the lotus
  s += `<circle cx="${r1(cx)}" cy="${r1(by - ib * 0.78)}" r="${r1(b * 0.06)}" fill="url(#jh-goldr)" stroke="#5E431A" stroke-width=".8"/><circle cx="${r1(cx)}" cy="${r1(by - ib * 0.78)}" r="${r1(b * 0.035)}" fill="none" stroke="#F3E2B0" stroke-opacity=".7" stroke-width="1"/>`;
  // the finial: a gilt lotus bud on a little stepped plinth at the crown
  const fy = by - b; const fh = G.FIN;
  s += `<rect x="${r1(cx - 14)}" y="${r1(fy - 6)}" width="28" height="8" rx="2" fill="url(#jh-gold)" stroke="#5E431A" stroke-width=".6"/>`;
  s += `<path d="M${r1(cx)} ${r1(fy - fh + 2)}C${r1(cx + 13)} ${r1(fy - fh * 0.55)} ${r1(cx + 12)} ${r1(fy - 9)} ${r1(cx)} ${r1(fy - 6)}C${r1(cx - 12)} ${r1(fy - 9)} ${r1(cx - 13)} ${r1(fy - fh * 0.55)} ${r1(cx)} ${r1(fy - fh + 2)}Z" fill="url(#jh-goldr)" stroke="#5E431A" stroke-width=".8"/>`;
  s += `<path d="M${r1(cx)} ${r1(fy - fh + 6)}V${r1(fy - 9)}" stroke="#F3E2B0" stroke-opacity=".6" stroke-width="1"/>`;
  return s;
}

/** The whole window (no shutters): torana, lintel, frame, sill, apron. The opening is left clear. */
export function windowSVG(G, { cls = '' } = {}) {
  let s = '';
  if (G.torana) s += torana(G);
  s += cornice(G, G.yL, G.CORN, true);
  s += beam(G, G.yL + G.CORN, G.LH, false);
  s += frameBands(G.fx, G.yF, G.fw, G.fh);
  s += cornice(G, G.yS, G.CORN, true);
  s += beam(G, G.yS + G.CORN, G.SH, true);
  if (G.AH) s += apron(G);
  return `<svg class="${cls}" viewBox="0 0 ${G.TW} ${r1(G.H)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${s}</svg>`;
}

/** Four mitred sides with their own thicknesses (tt top, tr right, tb bottom, tl left). c = [top, right, bottom, left]. */
function bevel4(x, y, w, h, [tt, tr, tb, tl], c) {
  const X = x + w; const Y = y + h;
  return `<path d="M${r1(x)} ${r1(y)}H${r1(X)}L${r1(X - tr)} ${r1(y + tt)}H${r1(x + tl)}Z" fill="${c[0]}"/>`
    + `<path d="M${r1(X)} ${r1(y)}V${r1(Y)}L${r1(X - tr)} ${r1(Y - tb)}V${r1(y + tt)}Z" fill="${c[1]}"/>`
    + `<path d="M${r1(x)} ${r1(Y)}H${r1(X)}L${r1(X - tr)} ${r1(Y - tb)}H${r1(x + tl)}Z" fill="${c[2]}"/>`
    + `<path d="M${r1(x)} ${r1(y)}V${r1(Y)}L${r1(x + tl)} ${r1(Y - tb)}V${r1(y + tt)}Z" fill="${c[3]}"/>`;
}

/** Where the lattice sits inside a shutter of height h (for placing the names behind it). */
export function shutterRows(h) {
  const st = 14; const tp = Math.round(h * 0.2); const bp = Math.round(h * 0.14); const rail = 10;
  return { st, tp, bp, rail, lt: st + tp + rail, lb: h - st - bp - rail };
}

/** One lattice shutter, w × h. side 'l' or 'r'. The meeting edge is slim, so the lattice of the two shutters
 *  runs almost to the centre and the names behind stay legible. */
export function shutterSVG(side, w, h) {
  const R = shutterRows(h);
  const { st, tp } = R;
  const meet = 4; // the slim meeting stile
  const tl = side === 'l' ? st : meet; const tr = side === 'l' ? meet : st;
  const lx0 = tl; const lx1 = w - tr;
  // solid wood everywhere except the lattice field, so the room behind shows through the lattice holes
  let s = `<path d="M0 0H${w}V${h}H0Z M${lx0} ${R.lt}V${R.lb}H${lx1}V${R.lt}Z" fill="${WOOD.face}" fill-rule="evenodd"/>`;
  // the outer stiles and rails (the meeting side is drawn as a thin bead below)
  s += bevel4(0, 0, w, h, [st, tr, st, tl], CONVEX);
  // top panel: a recessed arch with a gilt-hearted lotus
  const px = lx0 + 8; const pw = lx1 - lx0 - 16; const py = st + 8; const ph = tp - 8;
  s += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="${WOOD.dk}"/>` + bevel(px, py, pw, ph, 5, CONCAVE);
  const ax = px + pw / 2; const ab = py + ph - 8;
  s += `<path d="M${r1(px + 12)} ${r1(ab)}V${r1(py + ph * 0.5)}Q${r1(px + 12)} ${r1(py + 12)} ${r1(ax)} ${r1(py + 12)}Q${r1(px + pw - 12)} ${r1(py + 12)} ${r1(px + pw - 12)} ${r1(py + ph * 0.5)}V${r1(ab)}Z" fill="${WOOD.deep}" stroke="#B08356" stroke-opacity=".45" stroke-width="1.2"/>`;
  s += rosette(ax, py + ph * 0.52, Math.min(pw, ph) * 0.24, { petals: 12 });
  // the lattice field between two rails
  const ly = R.lt; const lh = R.lb - R.lt;
  s += `<rect x="${lx0}" y="${st + tp}" width="${lx1 - lx0}" height="${R.rail}" fill="url(#jh-wv)"/>`;
  s += `<rect x="${lx0}" y="${R.lb}" width="${lx1 - lx0}" height="${R.rail}" fill="url(#jh-wv)"/>`;
  s += `<rect x="${lx0}" y="${ly}" width="${lx1 - lx0}" height="${lh}" fill="url(#jh-lat)"/>`;
  s += `<rect x="${lx0 + 0.5}" y="${ly + 0.5}" width="${lx1 - lx0 - 1}" height="${lh - 1}" fill="none" stroke="${WOOD.groove}" stroke-width="2.4"/>`;
  // bottom panel: a recessed diamond with a gilt boss
  const by = R.lb + R.rail; const bh = h - st - by;
  s += `<rect x="${px}" y="${by + 2}" width="${pw}" height="${bh - 6}" fill="${WOOD.dk}"/>` + bevel(px, by + 2, pw, bh - 6, 5, CONCAVE);
  const dcx = px + pw / 2; const dcy = by + 2 + (bh - 6) / 2; const dw = pw * 0.3; const dh = (bh - 6) * 0.34;
  s += `<path d="M${r1(dcx - dw)} ${r1(dcy)}L${r1(dcx)} ${r1(dcy - dh)}L${r1(dcx + dw)} ${r1(dcy)}L${r1(dcx)} ${r1(dcy + dh)}Z" fill="url(#jh-petal)" stroke="${WOOD.groove}" stroke-width=".8"/>`;
  s += `<circle cx="${r1(dcx)}" cy="${r1(dcy)}" r="${r1(dh * 0.36)}" fill="url(#jh-goldr)"/>`;
  for (const k of [-1, 1]) s += `<circle cx="${r1(dcx + k * dw * 1.55)}" cy="${r1(dcy)}" r="${r1(dh * 0.16)}" fill="url(#jh-goldr)"/>`;
  // the meeting edge: a thin beaded astragal
  const mx = side === 'l' ? w - 2.5 : 2.5;
  s += `<rect x="${r1(mx - 2.5)}" y="0" width="5" height="${h}" fill="url(#jh-wh)"/>`;
  for (const k of along(h - 20, 14)) s += `<circle cx="${r1(mx)}" cy="${r1(10 + k)}" r="1.9" fill="url(#jh-bead)"/>`;
  // a little brass ring pull near the meeting edge, on the lower rail
  const rx = side === 'l' ? w - 18 : 18;
  s += `<circle cx="${rx}" cy="${r1(R.lb + R.rail / 2)}" r="4" fill="url(#jh-goldr)"/><circle cx="${rx}" cy="${r1(R.lb + R.rail / 2 + 9)}" r="6.5" fill="none" stroke="url(#jh-gold)" stroke-width="2.2"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${s}</svg>`;
}

/** A small brass diyo (open lamp on a low foot) with a lit wick. The flame is its own group for a gentle flicker. */
export function diyoSVG() {
  const W = 100; const H = 110;
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false" overflow="visible">
    <ellipse cx="50" cy="107" rx="34" ry="3" fill="#2E1606" opacity=".28"/>
    <path d="M30 106Q30 96 42 94L45 88H55L58 94Q70 96 70 106Z" fill="url(#jh-brass)"/>
    <path d="M8 66Q14 90 50 90Q80 90 90 70Q96 66 99 60Q90 64 84 66Z" fill="url(#jh-brass)"/>
    <ellipse cx="46" cy="66" rx="38" ry="6.5" fill="#6A4410"/>
    <ellipse cx="46" cy="66.6" rx="32" ry="4.2" fill="#E2AC4C" opacity=".75"/>
    <ellipse cx="62" cy="65.6" rx="16" ry="2.2" fill="#FFE6A8" opacity=".6"/>
    <path d="M18 74Q34 84 58 82" stroke="#FCEBB8" stroke-opacity=".55" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M84 66L90 61" stroke="#2A1804" stroke-width="2.4" stroke-linecap="round"/>
    <g class="jh-flame">
      <path d="M90 61C76 58 80 30 90 6C100 30 104 58 90 61Z" fill="url(#jh-fl-out)"/>
      <path d="M90 60C82 56 84 38 90 22C96 38 98 56 90 60Z" fill="url(#jh-fl-mid)"/>
      <path d="M90 59C87 56 87 46 90 38C93 46 93 56 90 59Z" fill="#FFFDF4"/>
      <ellipse cx="90" cy="58" rx="2.6" ry="2" fill="#3E6FE0" opacity=".55"/>
    </g>
  </svg>`;
}

/** A Palpali Dhaka strip, woven cell by cell: diamonds of sindoor, ivory, mustard and green between dark rules. */
export function dhakaTile(p = 2) {
  const cols = 24; const rows = 9;
  const C = { r: '#B5202B', k: '#3A2213', w: '#F7F1E5', y: '#D9A33A', g: '#3F6B3A', o: '#E2742A' };
  let rects = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let col = 'w';
      if (r === 0 || r === rows - 1) col = 'k';
      else {
        const d1 = Math.abs(c + 0.5 - 6) + Math.abs(r - 4);
        const d2 = Math.abs(c + 0.5 - 18) + Math.abs(r - 4);
        const d = Math.min(d1, d2);
        const near1 = d1 < d2;
        if (d < 1.2) col = near1 ? 'y' : 'g';
        else if (d < 2.2) col = 'r';
        else if (d < 3.2) col = 'k';
        else if (d < 4.2) col = near1 ? 'o' : 'r';
        else col = 'w';
      }
      if (col !== 'w') rects += `<rect x="${c * p}" y="${r * p}" width="${p}" height="${p}" fill="${C[col]}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * p}" height="${rows * p}" viewBox="0 0 ${cols * p} ${rows * p}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${C.w}"/>${rects}</svg>`;
  return { url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, w: cols * p, h: rows * p };
}

/** A carved wooden pillar: lotus capital (with a flat abacus for the kalash), beaded shaft (a repeating tile), lotus base. */
export function pillarCapital() {
  const W = 120; const H = 96;
  let s = `<rect x="6" y="0" width="108" height="12" fill="#A0714A"/><rect x="6" y="10" width="108" height="3" fill="#4A2B18"/>`;
  s += `<path d="M14 13H106L96 36H24Z" fill="url(#jh-wv)" stroke="${WOOD.groove}" stroke-width=".8"/>`;
  for (let i = 0; i < 7; i++) s += petal(28 + i * 10.7, 40, 11, 26, 180, { fill: 'url(#jh-petal)' });
  s += `<rect x="30" y="52" width="60" height="8" fill="url(#jh-gold)"/>`;
  for (const k of along(56, 9)) s += `<circle cx="${r1(32 + k)}" cy="68" r="3.6" fill="url(#jh-bead)"/>`;
  s += `<rect x="30" y="62" width="60" height="1" fill="${WOOD.groove}"/><rect x="34" y="74" width="52" height="22" fill="url(#jh-wh)"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${s}</svg>`;
}
export function pillarBase() {
  const W = 120; const H = 70;
  let s = `<rect x="34" y="0" width="52" height="10" fill="url(#jh-wh)"/>`;
  for (let i = 0; i < 6; i++) s += petal(36.5 + i * 9.4, 22, 10, 22, 0, { fill: 'url(#jh-petal)' });
  s += `<rect x="28" y="32" width="64" height="7" fill="url(#jh-gold)"/>`;
  s += `<path d="M22 39H98L108 58H12Z" fill="url(#jh-wv)" stroke="${WOOD.groove}" stroke-width=".8"/><rect x="6" y="58" width="108" height="12" fill="#5A361F"/><rect x="6" y="58" width="108" height="2" fill="#A0714A"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">${s}</svg>`;
}
/** The shaft tile (52 × 120): fluted, with a band of beads at the top of each tile. */
export function pillarShaftTile() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="120" viewBox="0 0 52 120">
    <defs><linearGradient id="s" x1="0" x2="1"><stop offset="0" stop-color="#4E2E19"/><stop offset=".4" stop-color="#7A4D2E"/><stop offset=".72" stop-color="#5E3920"/><stop offset="1" stop-color="#40251A"/></linearGradient>
    <radialGradient id="b" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#B98B5C"/><stop offset=".5" stop-color="#7C4F2E"/><stop offset="1" stop-color="#3F2414"/></radialGradient></defs>
    <rect width="52" height="120" fill="url(#s)"/>
    ${[13, 26, 39].map((x) => `<path d="M${x} 20V116" stroke="#2A170C" stroke-opacity=".55" stroke-width="2"/><path d="M${x + 1.4} 22V114" stroke="#B48858" stroke-opacity=".35" stroke-width=".8"/>`).join('')}
    <rect y="0" width="52" height="16" fill="#3A2213"/>
    ${[6.5, 19.5, 32.5, 45.5].map((x) => `<circle cx="${x}" cy="8" r="5.2" fill="url(#b)"/>`).join('')}
    <rect y="16" width="52" height="1.6" fill="#C6A15A"/>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** A flat carved beam for phones (the pillar laid down between the two families). */
export function beamDivider(w = 320) {
  const H = 26; const W = w;
  let s = `<rect x="0" y="4" width="${W}" height="18" fill="url(#jh-wv)" stroke="${WOOD.groove}" stroke-width=".8"/><rect x="0" y="4" width="${W}" height="2" fill="#A0714A"/>`;
  for (const k of along(W - 24, 18)) s += `<circle cx="${r1(12 + k)}" cy="13" r="4.2" fill="url(#jh-bead)"/>`;
  s += `<rect x="0" y="20.5" width="${W}" height="1.5" fill="#C6A15A"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${s}</svg>`;
}

/** A fine sindoor divider: two hairlines and a small lotus. */
export function dividerSVG(w = 200) {
  const c = w / 2;
  return `<svg class="jh-div" width="${w}" height="20" viewBox="0 0 ${w} 20" aria-hidden="true" focusable="false">
    <path d="M0 10H${c - 22}M${c + 22} 10H${w}" stroke="currentColor" stroke-width="1"/>
    <path d="M${c} 3C${c + 4} 7 ${c + 4} 12 ${c} 16C${c - 4} 12 ${c - 4} 7 ${c} 3Z" fill="currentColor"/>
    <path d="M${c - 2} 16C${c - 9} 15 ${c - 14} 11 ${c - 15} 7C${c - 9} 8 ${c - 5} 11 ${c - 2} 16ZM${c + 2} 16C${c + 9} 15 ${c + 14} 11 ${c + 15} 7C${c + 9} 8 ${c + 5} 11 ${c + 2} 16Z" fill="currentColor" opacity=".75"/>
  </svg>`;
}

/** A small lotus node for the programme line. */
export function lotusNode(size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="11" fill="#F7F1E5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M12 5C14.5 8 14.5 12 12 16C9.5 12 9.5 8 12 5Z" fill="currentColor"/>
    <path d="M11 16.5C7.5 16 5.5 13.5 5 11C8 11.5 10 13.5 11 16.5ZM13 16.5C16.5 16 18.5 13.5 19 11C16 11.5 14 13.5 13 16.5Z" fill="currentColor" opacity=".7"/>
  </svg>`;
}

/** Drifting petals (marigold and rose). */
export function petalSVG(kind, size) {
  if (kind === 'rose') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5C15 4 18 9 16 14C14 18 6 18 4 14C2 9 5 4 10 1.5Z" fill="#C42032"/><path d="M10 1.5C15 4 18 9 16 14" fill="none" stroke="#8E0D1C" stroke-width=".8"/><path d="M10 4C9 8 9 12 10 16" stroke="#8E0D1C" stroke-opacity=".4" stroke-width=".6" fill="none"/></svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2C12 2 13 3.4 14.4 3.6C15.6 4.4 16.4 6 17.6 7.2C17.8 9 16.6 10.8 17 12.6C16 14.6 14 15.8 12.2 17.4C10.4 17 8.6 18 6.8 17C5 15.8 3.6 14 3 12C3.4 10.2 2.4 8.4 3 6.8C4.4 5.6 5.6 4 7.4 3.4C8.4 2.6 9 2 10 2Z" fill="#F39A1E"/><path d="M10 4.5C9.4 8 9.6 12 10.4 15.6M6.6 6.6C8 9 8.6 11.6 8.4 14.6M13.4 6.6C12.2 9 11.6 11.8 12 14.6" stroke="#C9620C" stroke-opacity=".6" stroke-width=".7" fill="none"/></svg>`;
}
