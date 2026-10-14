// Mangal · ornaments drawn in code: the doorway, its carved leaves, brass bells and diyos,
// gold filigree, the Dhaka band, frame crowns and falling petals. Everything is generated at the
// exact pixel size it is shown at, so it stays crisp on any screen.
const r1 = (n) => Math.round(n * 10) / 10;

/** Shared gradients (one hidden <svg> per page; every ornament refers to these ids). */
export const DEFS = `
<svg class="svg-defs" aria-hidden="true" focusable="false" width="0" height="0">
  <defs>
    <linearGradient id="mg-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F6E1A0"/><stop offset=".22" stop-color="#D7A443"/><stop offset=".46" stop-color="#FCEDB9"/>
      <stop offset=".7" stop-color="#B57E22"/><stop offset="1" stop-color="#E8C26B"/>
    </linearGradient>
    <linearGradient id="mg-gold-v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBEAB0"/><stop offset=".45" stop-color="#D9A848"/><stop offset="1" stop-color="#A0701E"/>
    </linearGradient>
    <linearGradient id="mg-brass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5E3D0B"/><stop offset=".18" stop-color="#C99436"/><stop offset=".3" stop-color="#FFF0C2"/>
      <stop offset=".42" stop-color="#D9A442"/><stop offset=".78" stop-color="#8A5E16"/><stop offset="1" stop-color="#4E3208"/>
    </linearGradient>
    <linearGradient id="mg-lacquer" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7E0E17"/><stop offset=".55" stop-color="#9C1620"/><stop offset="1" stop-color="#86101A"/>
    </linearGradient>
    <linearGradient id="mg-lacquer-r" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#7E0E17"/><stop offset=".55" stop-color="#9C1620"/><stop offset="1" stop-color="#86101A"/>
    </linearGradient>
    <linearGradient id="mg-ox" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5C0911"/><stop offset="1" stop-color="#43050B"/>
    </linearGradient>
    <linearGradient id="mg-sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".16"/>
    </linearGradient>
    <radialGradient id="mg-stud" cx=".38" cy=".34" r=".7">
      <stop offset="0" stop-color="#FFF4CF"/><stop offset=".35" stop-color="#E2B357"/><stop offset="1" stop-color="#7A5214"/>
    </radialGradient>
    <radialGradient id="mg-flame" cx=".5" cy=".72" r=".62">
      <stop offset="0" stop-color="#FFFDF0"/><stop offset=".3" stop-color="#FFE7A0"/><stop offset=".62" stop-color="#FFB13B"/>
      <stop offset="1" stop-color="#F06A12" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mg-glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#FFC56A" stop-opacity=".55"/><stop offset=".45" stop-color="#FFB04A" stop-opacity=".18"/>
      <stop offset="1" stop-color="#FFB04A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mg-bell-in" cx=".5" cy=".3" r=".7">
      <stop offset="0" stop-color="#2A1804"/><stop offset="1" stop-color="#6B4710"/>
    </radialGradient>
  </defs>
</svg>`;

/** A rectangle with a pointed (ogee) crown of height ch. */
export function archPath(x, y, w, h, ch) {
  return `M${r1(x)} ${r1(y + h)}L${r1(x)} ${r1(y + ch)}C${r1(x)} ${r1(y + ch * 0.42)} ${r1(x + w * 0.3)} ${r1(y + ch * 0.16)} ${r1(x + w / 2)} ${r1(y)}`
    + `C${r1(x + w * 0.7)} ${r1(y + ch * 0.16)} ${r1(x + w)} ${r1(y + ch * 0.42)} ${r1(x + w)} ${r1(y + ch)}L${r1(x + w)} ${r1(y + h)}Z`;
}
/** Only the curve and the sides (open at the bottom), for strokes. */
const archStroke = (x, y, w, h, ch) => archPath(x, y, w, h, ch).replace(/Z$/, '');
/** Half of the arch (the left or right door leaf), in the leaf's own box of width w (= half the opening). */
function halfArch(side, w, h, ch, i = 0) {
  // The full arch is 2w wide; the leaf keeps the half that touches its hinge.
  const W = 2 * w;
  if (side === 'l') {
    return `M${r1(i)} ${r1(h - i)}L${r1(i)} ${r1(ch + i * 0.2)}C${r1(i)} ${r1(ch * 0.42 + i * 0.6)} ${r1(W * 0.3 + i * 0.2)} ${r1(ch * 0.16 + i)} ${r1(w - i * 0.5)} ${r1(i * 1.3)}L${r1(w - i * 0.5)} ${r1(h - i)}Z`;
  }
  return `M${r1(w - i)} ${r1(h - i)}L${r1(w - i)} ${r1(ch + i * 0.2)}C${r1(w - i)} ${r1(ch * 0.42 + i * 0.6)} ${r1(w - W * 0.3 - i * 0.2)} ${r1(ch * 0.16 + i)} ${r1(i * 0.5)} ${r1(i * 1.3)}L${r1(i * 0.5)} ${r1(h - i)}Z`;
}

/** A lotus rosette: two rings of petals, a beaded ring and a boss. */
export function rosette(cx, cy, r, { petals = 12, fill = 'url(#mg-gold)', stroke = '#6A3F0C', inner = '#7A0E17', sw = 0.8 } = {}) {
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
  return `<g class="mg-ros"><path d="${petal(r, petals, 0, 0.9)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-opacity=".55"/>`
    + `<path d="${petal(r * 0.72, petals, Math.PI / petals, 0.85)}" fill="${inner}" stroke="${fill}" stroke-width="${sw}"/>`
    + `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r * 0.34)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-opacity=".6"/>`
    + `<g fill="${inner}">${dots}</g><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r * 0.16)}" fill="${inner}"/>`
    + `<circle cx="${r1(cx - r * 0.05)}" cy="${r1(cy - r * 0.05)}" r="${r1(r * 0.07)}" fill="#FFF3C8" opacity=".8"/></g>`;
}

const stud = (x, y, r) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="url(#mg-stud)" stroke="#5A3A0A" stroke-width=".6"/>`;

/** A row of studs along a line. */
function studs(x0, y0, x1, y1, r, gap) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.floor(L / gap));
  let s = '';
  for (let k = 0; k <= n; k++) { const t = k / n; s += stud(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r); }
  return s;
}

/** The doorway: a carved frame with a pointed opening (the panel and the leaves sit inside). */
export function frameSVG(L) {
  const { fw, fh, b, lh, ox, oy, ow, oh, ch } = L;
  const s = Math.max(0.7, Math.min(1.25, b / 30));
  const outer = `M0 0H${r1(fw)}V${r1(fh)}H0Z`;
  const hole = archPath(ox, oy, ow, oh + 2, ch);
  // carved lintel: a run of small rosettes between two rules
  let lintel = '';
  const lr = lh * 0.3;
  const n = Math.max(3, Math.round(fw / (lr * 3.2)));
  for (let k = 0; k < n; k++) lintel += rosette((k + 0.5) * fw / n, lh * 0.52, lr, { petals: 8, inner: '#5C0911', sw: 0.5 });
  // posts: a chain of lozenges
  let posts = '';
  const pr = b * 0.26;
  const top = oy + ch * 0.2;
  const m = Math.max(3, Math.floor((fh - top - b) / (pr * 3.4)));
  for (let k = 0; k <= m; k++) {
    const y = top + (k / m) * (fh - top - b * 0.9);
    for (const x of [b / 2, fw - b / 2]) {
      posts += `<path d="M${r1(x)} ${r1(y - pr * 1.3)}L${r1(x + pr)} ${r1(y)}L${r1(x)} ${r1(y + pr * 1.3)}L${r1(x - pr)} ${r1(y)}Z" fill="url(#mg-gold)" stroke="#5A3A0A" stroke-width=".5" stroke-opacity=".6"/>`;
      posts += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(pr * 0.36)}" fill="#5C0911"/>`;
    }
  }
  // spandrels: a rosette in each top corner between the arch and the frame
  const sr = Math.min(ch * 0.17, ow * 0.04, 34);
  const spandrels = ch > 40 ? rosette(ox + sr * 1.5, oy + sr * 1.4, sr, { petals: 12, inner: '#5C0911' }) + rosette(ox + ow - sr * 1.5, oy + sr * 1.4, sr, { petals: 12, inner: '#5C0911' }) : '';
  const rim = archStroke(ox - 2 * s, oy - 2 * s, ow + 4 * s, oh + 4, ch + 1.2 * s);
  const rim2 = archStroke(ox - 7 * s, oy - 8 * s, ow + 14 * s, oh + 12, ch + 4 * s);
  return `<svg class="mg-frame-svg" width="${r1(fw)}" height="${r1(fh)}" viewBox="0 0 ${r1(fw)} ${r1(fh)}" aria-hidden="true" focusable="false">
    <path d="${outer} ${hole}" fill-rule="evenodd" fill="url(#mg-ox)"/>
    <path d="${outer} ${hole}" fill-rule="evenodd" fill="url(#mg-sheen)"/>
    <rect x="${r1(1.5 * s)}" y="${r1(1.5 * s)}" width="${r1(fw - 3 * s)}" height="${r1(fh - 3 * s)}" fill="none" stroke="url(#mg-gold)" stroke-width="${r1(2.4 * s)}"/>
    <rect x="${r1(6 * s)}" y="${r1(6 * s)}" width="${r1(fw - 12 * s)}" height="${r1(fh - 12 * s)}" fill="none" stroke="#C99A48" stroke-opacity=".55" stroke-width="${r1(0.9 * s)}"/>
    <path d="M${r1(6 * s)} ${r1(lh)}H${r1(fw - 6 * s)}" stroke="url(#mg-gold)" stroke-width="${r1(1.4 * s)}"/>
    ${lintel}${posts}${spandrels}
    <path d="${rim2}" fill="none" stroke="#E8BF63" stroke-width="${r1(3.2 * s)}" stroke-dasharray="0 ${r1(9 * s)}" stroke-linecap="round"/>
    <path d="${rim}" fill="none" stroke="url(#mg-gold)" stroke-width="${r1(3 * s)}"/>
  </svg>`;
}

/** The inner red panel's gold filigree border (follows the arch). */
export function panelBorderSVG(L) {
  const { ow, oh, ch } = L;
  const s = Math.max(0.7, Math.min(1.2, ow / 900));
  const i1 = 12 * s, i2 = 19 * s, i3 = 25 * s;
  const a1 = archStroke(i1, i1 * 1.3, ow - 2 * i1, oh - i1 * 1.3 - i1, ch - i1 * 0.3);
  const a2 = archStroke(i2, i2 * 1.3, ow - 2 * i2, oh - i2 * 1.3 - i2, ch - i2 * 0.3);
  const a3 = archStroke(i3, i3 * 1.3, ow - 2 * i3, oh - i3 * 1.3 - i3, ch - i3 * 0.3);
  const base = (i) => `M${r1(i)} ${r1(oh - i)}H${r1(ow - i)}`;
  return `<svg class="mg-panel-svg" width="${r1(ow)}" height="${r1(oh)}" viewBox="0 0 ${r1(ow)} ${r1(oh)}" aria-hidden="true" focusable="false">
    <path d="${a1}${base(i1)}" fill="none" stroke="url(#mg-gold)" stroke-width="${r1(2 * s)}"/>
    <path d="${a2}${base(i2)}" fill="none" stroke="#E2B65C" stroke-width="${r1(3 * s)}" stroke-dasharray="0 ${r1(8 * s)}" stroke-linecap="round"/>
    <path d="${a3}${base(i3)}" fill="none" stroke="#D9AA52" stroke-opacity=".75" stroke-width="${r1(1 * s)}"/>
    ${rosette(i2, oh - i2, 9 * s, { petals: 8 })}${rosette(ow - i2, oh - i2, 9 * s, { petals: 8 })}
  </svg>`;
}

/** One carved door leaf: lacquered red with gold rails, studs, a lattice panel and a lotus. */
export function leafSVG(side, w, h, ch) {
  const s = Math.max(0.6, Math.min(1.2, w / 420));
  const id = `mg-clip-${side}`;
  const shape = halfArch(side, w, h, ch);
  const inner1 = halfArch(side, w, h, ch, 11 * s);
  const inner2 = halfArch(side, w, h, ch, 17 * s);
  const hinge = side === 'l' ? 0 : w;
  const seam = side === 'l' ? w : 0;
  const dir = side === 'l' ? 1 : -1;
  const px0 = Math.min(hinge, seam) + 24 * s;
  const px1 = Math.max(hinge, seam) - 24 * s;
  const railY = ch + 18 * s;
  const panTop = railY + 16 * s;
  const panBot = h - 38 * s;
  const midY = panTop + (panBot - panTop) * 0.5;
  // lattice inside the main panel
  let lat = '';
  const step = 26 * s;
  for (let k = -Math.ceil((panBot - panTop) / step); k < Math.ceil((px1 - px0) / step) + 2; k++) {
    const x = px0 + k * step;
    lat += `M${r1(x)} ${r1(panTop)}L${r1(x + (panBot - panTop))} ${r1(panBot)}M${r1(x)} ${r1(panBot)}L${r1(x + (panBot - panTop))} ${r1(panTop)}`;
  }
  // a fan of rays in the crown, from the seam
  let rays = '';
  const fx = seam, fy = railY;
  for (let k = 1; k < 9; k++) {
    const a = (k / 9) * (Math.PI / 2);
    const x = fx - dir * Math.cos(a) * w * 1.2;
    const y = fy - Math.sin(a) * w * 1.2;
    rays += `M${r1(fx)} ${r1(fy)}L${r1(x)} ${r1(y)}`;
  }
  const lotusR = Math.min((px1 - px0) * 0.26, (panBot - panTop) * 0.12);
  const lotusX = (px0 + px1) / 2 - dir * (px1 - px0) * 0.06;
  return `<svg class="mg-leaf-svg" width="${r1(w)}" height="${r1(h)}" viewBox="0 0 ${r1(w)} ${r1(h)}" aria-hidden="true" focusable="false">
    <defs><clipPath id="${id}"><path d="${shape}"/></clipPath><clipPath id="${id}-p"><rect x="${r1(px0)}" y="${r1(panTop)}" width="${r1(px1 - px0)}" height="${r1(panBot - panTop)}"/></clipPath></defs>
    <g clip-path="url(#${id})">
      <path d="${shape}" fill="url(#mg-lacquer${side === 'r' ? '-r' : ''})"/>
      <path d="${rays}" stroke="#E2B65C" stroke-opacity=".5" stroke-width="${r1(1.1 * s)}"/>
      <rect x="${r1(px0)}" y="${r1(panTop)}" width="${r1(px1 - px0)}" height="${r1(panBot - panTop)}" fill="#6E0A13"/>
      <path d="${lat}" stroke="#D7A84E" stroke-opacity=".32" stroke-width="${r1(1 * s)}" clip-path="url(#${id}-p)"/>
      <rect x="${r1(px0)}" y="${r1(panTop)}" width="${r1(px1 - px0)}" height="${r1(panBot - panTop)}" fill="none" stroke="url(#mg-gold)" stroke-width="${r1(2.4 * s)}"/>
      <rect x="${r1(px0 + 6 * s)}" y="${r1(panTop + 6 * s)}" width="${r1(px1 - px0 - 12 * s)}" height="${r1(panBot - panTop - 12 * s)}" fill="none" stroke="#D9AA52" stroke-opacity=".7" stroke-width="${r1(0.9 * s)}"/>
      ${rosette(lotusX, panTop + (panBot - panTop) * 0.2, lotusR, { petals: 16 })}
      ${rosette(lotusX, panBot - (panBot - panTop) * 0.16, lotusR * 0.8, { petals: 12 })}
      ${studs(px0, railY, px1, railY, 3.6 * s, 22 * s)}
      ${studs(px0, h - 20 * s, px1, h - 20 * s, 3.6 * s, 22 * s)}
      <path d="M${r1(seam - dir * 4 * s)} 0V${r1(h)}" stroke="url(#mg-gold-v)" stroke-width="${r1(7 * s)}"/>
      <path d="M${r1(seam - dir * 9 * s)} 0V${r1(h)}" stroke="#4E070D" stroke-opacity=".5" stroke-width="${r1(1.2 * s)}"/>
      <path d="${shape}" fill="url(#mg-sheen)"/>
    </g>
    <path d="${inner1}" fill="none" stroke="url(#mg-gold)" stroke-width="${r1(2.4 * s)}"/>
    <path d="${inner2}" fill="none" stroke="#E2B65C" stroke-width="${r1(2.6 * s)}" stroke-dasharray="0 ${r1(8 * s)}" stroke-linecap="round"/>
    <path d="${shape}" fill="none" stroke="#3E0409" stroke-width="${r1(1.5 * s)}"/>
  </svg>`;
}

/** A brass temple bell (ghanti) on a short chain. The box is w × h; the chain hangs from the top centre. */
export function bellSVG(w, h, { links = 4 } = {}) {
  const cx = w / 2;
  const chainH = h * 0.36;
  let chain = '';
  const lh = chainH / links;
  for (let k = 0; k < links; k++) {
    const y = k * lh + lh / 2;
    chain += k % 2
      ? `<ellipse cx="${r1(cx)}" cy="${r1(y)}" rx="${r1(w * 0.025 + 0.6)}" ry="${r1(lh * 0.55)}" fill="none" stroke="#9C6F22" stroke-width="${r1(Math.max(1, w * 0.035))}"/>`
      : `<ellipse cx="${r1(cx)}" cy="${r1(y)}" rx="${r1(w * 0.07)}" ry="${r1(lh * 0.58)}" fill="none" stroke="url(#mg-gold)" stroke-width="${r1(Math.max(1.1, w * 0.04))}"/>`;
  }
  const y0 = chainH;
  const Hb = h * 0.56;
  const B = w * 0.92;
  const p = (fx, fy) => `${r1(cx + fx * B)} ${r1(y0 + fy * Hb)}`;
  const body = `M${p(-0.13, 0.06)}C${p(-0.2, 0.08)} ${p(-0.28, 0.2)} ${p(-0.3, 0.42)}C${p(-0.32, 0.7)} ${p(-0.4, 0.84)} ${p(-0.5, 0.94)}`
    + `Q${p(0, 1.06)} ${p(0.5, 0.94)}C${p(0.4, 0.84)} ${p(0.32, 0.7)} ${p(0.3, 0.42)}C${p(0.28, 0.2)} ${p(0.2, 0.08)} ${p(0.13, 0.06)}Z`;
  const band = (fy, k) => `<path d="M${p(-0.31 - k, fy)}Q${p(0, fy + 0.07)} ${p(0.31 + k, fy)}" fill="none" stroke="#7A5214" stroke-width="${r1(Math.max(0.8, w * 0.025))}" stroke-opacity=".7"/>`;
  return `<svg class="mg-bell-svg" width="${r1(w)}" height="${r1(h)}" viewBox="0 0 ${r1(w)} ${r1(h)}" aria-hidden="true" focusable="false">
    ${chain}
    <ellipse cx="${r1(cx)}" cy="${r1(y0 + Hb * 0.02)}" rx="${r1(B * 0.13)}" ry="${r1(Hb * 0.07)}" fill="url(#mg-brass)"/>
    <ellipse cx="${r1(cx)}" cy="${r1(y0 + Hb * 1.08)}" rx="${r1(B * 0.09)}" ry="${r1(B * 0.09)}" fill="url(#mg-stud)"/>
    <path d="${body}" fill="url(#mg-brass)"/>
    ${band(0.36, 0)}${band(0.76, 0.06)}
    <ellipse cx="${r1(cx)}" cy="${r1(y0 + Hb * 0.95)}" rx="${r1(B * 0.5)}" ry="${r1(Hb * 0.06)}" fill="url(#mg-bell-in)"/>
    <path d="M${p(-0.5, 0.94)}Q${p(0, 1.06)} ${p(0.5, 0.94)}" fill="none" stroke="#F3D58A" stroke-width="${r1(Math.max(0.8, w * 0.03))}"/>
  </svg>`;
}

/** A brass standing diyo with a lit wick. w × h; the flame is its own group for a gentle flicker. */
export function diyoSVG(w, h) {
  const cx = w / 2;
  const by = h * 0.98;
  const p = (fx, fy) => `${r1(cx + fx * w)} ${r1(fy * h)}`;
  const foot = `M${p(-0.34, 0.98)}Q${p(-0.34, 0.9)} ${p(-0.12, 0.88)}L${p(-0.06, 0.84)}L${p(0.06, 0.84)}L${p(0.12, 0.88)}Q${p(0.34, 0.9)} ${p(0.34, 0.98)}Z`;
  const stem = `M${p(-0.05, 0.84)}L${p(-0.045, 0.64)}L${p(0.045, 0.64)}L${p(0.05, 0.84)}Z`;
  const bowl = `M${p(-0.44, 0.52)}Q${p(-0.42, 0.64)} ${p(0, 0.66)}Q${p(0.42, 0.64)} ${p(0.44, 0.52)}Q${p(0.46, 0.5)} ${p(0.5, 0.49)}L${p(0.3, 0.55)}Z`;
  const bowl2 = `M${p(-0.46, 0.5)}Q${p(-0.4, 0.66)} ${p(0, 0.67)}Q${p(0.38, 0.66)} ${p(0.44, 0.53)}Q${p(0.5, 0.5)} ${p(0.54, 0.47)}Q${p(0.46, 0.5)} ${p(0.4, 0.5)}Z`;
  const flame = `M${p(0.36, 0.48)}C${p(0.28, 0.42)} ${p(0.3, 0.34)} ${p(0.36, 0.16)}C${p(0.42, 0.34)} ${p(0.46, 0.42)} ${p(0.36, 0.48)}Z`;
  const core = `M${p(0.36, 0.475)}C${p(0.32, 0.44)} ${p(0.33, 0.39)} ${p(0.36, 0.3)}C${p(0.39, 0.39)} ${p(0.41, 0.44)} ${p(0.36, 0.475)}Z`;
  return `<svg class="mg-diyo-svg" width="${r1(w)}" height="${r1(h)}" viewBox="0 0 ${r1(w)} ${r1(h)}" aria-hidden="true" focusable="false">
    <ellipse cx="${r1(cx + w * 0.36)}" cy="${r1(h * 0.33)}" rx="${r1(w * 0.42)}" ry="${r1(w * 0.42)}" fill="url(#mg-glow)" class="mg-glow"/>
    <ellipse cx="${r1(cx + w * 0.04)}" cy="${r1(by)}" rx="${r1(w * 0.42)}" ry="${r1(h * 0.022)}" fill="#2E1004" opacity=".25"/>
    <path d="${foot}" fill="url(#mg-brass)"/>
    <path d="${stem}" fill="url(#mg-brass)"/>
    <ellipse cx="${r1(cx)}" cy="${r1(h * 0.74)}" rx="${r1(w * 0.085)}" ry="${r1(h * 0.025)}" fill="url(#mg-brass)"/>
    <ellipse cx="${r1(cx)}" cy="${r1(h * 0.665)}" rx="${r1(w * 0.12)}" ry="${r1(h * 0.022)}" fill="url(#mg-brass)"/>
    <path d="${bowl2}" fill="url(#mg-brass)"/>
    <ellipse cx="${r1(cx - w * 0.02)}" cy="${r1(h * 0.505)}" rx="${r1(w * 0.42)}" ry="${r1(h * 0.035)}" fill="#6A4410"/>
    <ellipse cx="${r1(cx - w * 0.02)}" cy="${r1(h * 0.508)}" rx="${r1(w * 0.36)}" ry="${r1(h * 0.024)}" fill="#C79A3A" opacity=".55"/>
    <path d="M${p(0.33, 0.5)}L${p(0.36, 0.47)}" stroke="#3A2408" stroke-width="${r1(Math.max(1, w * 0.02))}"/>
    <g class="mg-flame"><path d="${flame}" fill="url(#mg-flame)"/><path d="${core}" fill="#FFFBEA" opacity=".9"/></g>
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
  const red = '#8C1018';
  if (kind === 'temple') {
    const H = 78;
    const d = `M0 ${H}V54C0 38 40 26 70 18C86 13 96 8 100 0C104 8 114 13 130 18C160 26 200 38 200 54V${H}Z`;
    const d2 = `M8 ${H}V56C8 43 44 32 72 25C87 21 96 16 100 9C104 16 113 21 128 25C156 32 192 43 192 56V${H}`;
    return { H, svg: `<svg viewBox="0 0 200 ${H}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><path d="${d}" fill="${red}"/><path d="${d}" fill="none" stroke="url(#mg-gold)" stroke-width="3"/><path d="${d2}" fill="none" stroke="#E2B65C" stroke-width="2.2" stroke-dasharray="0 6" stroke-linecap="round"/>${rosette(100, 52, 15, { petals: 12 })}<circle cx="100" cy="2.5" r="3.2" fill="url(#mg-stud)"/></svg>` };
  }
  if (kind === 'round') {
    const H = 62;
    const d = `M0 ${H}V60A100 58 0 0 1 200 60V${H}Z`;
    let rays = '';
    for (let k = 1; k < 12; k++) { const a = Math.PI - (k / 12) * Math.PI; rays += `M100 ${H}L${r1(100 + Math.cos(a) * 80)} ${r1(H - Math.sin(a) * 50)}`; }
    return { H, svg: `<svg viewBox="0 0 200 ${H}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><path d="${d}" fill="${red}"/><path d="${rays}" stroke="#E2B65C" stroke-opacity=".6" stroke-width="1.2"/><path d="M8 ${H}V60A92 50 0 0 1 192 60V${H}" fill="none" stroke="#E2B65C" stroke-width="2.2" stroke-dasharray="0 6" stroke-linecap="round"/><path d="${d}" fill="none" stroke="url(#mg-gold)" stroke-width="3"/>${rosette(100, H - 2, 13, { petals: 10 })}</svg>` };
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
  return { H, svg: `<svg viewBox="0 0 200 ${H}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><path d="${d}" fill="${red}"/><path d="${d}" fill="none" stroke="url(#mg-gold)" stroke-width="3"/>${rosette(100, 42, 12, { petals: 8 })}<circle cx="60" cy="48" r="3" fill="url(#mg-stud)"/><circle cx="140" cy="48" r="3" fill="url(#mg-stud)"/></svg>` };
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
  return `<svg class="mg-div" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">
    <path d="M4 ${h / 2}L${c - 24} ${h / 2 - 1}L${c - 24} ${h / 2 + 1}Z M${w - 4} ${h / 2}L${c + 24} ${h / 2 - 1}L${c + 24} ${h / 2 + 1}Z" fill="url(#mg-gold)"/>
    <circle cx="${c - 32}" cy="${h / 2}" r="2.2" fill="#C8963C"/><circle cx="${c + 32}" cy="${h / 2}" r="2.2" fill="#C8963C"/>
    ${rosette(c, h / 2, 11, { petals: 10 })}
  </svg>`;
}

/** Falling petal shapes (marigold and rose). */
export function petalSVG(kind, size) {
  const fill = kind === 'rose' ? '#C3172A' : kind === 'pink' ? '#E35A7E' : '#F29A1F';
  const edge = kind === 'rose' ? '#8E0D1C' : kind === 'pink' ? '#B8355A' : '#D9700F';
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1C15 4 18 9 16 14C14 18 6 18 4 14C2 9 5 4 10 1Z" fill="${fill}" stroke="${edge}" stroke-width=".8"/><path d="M10 3C9 8 9 12 10 17" stroke="${edge}" stroke-opacity=".45" stroke-width=".6" fill="none"/></svg>`;
}
