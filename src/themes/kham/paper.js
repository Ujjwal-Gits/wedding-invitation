// Kham · paper made in code. No photographs, no AI: a tileable handmade-paper (lokta)
// texture built from periodic value noise. Four layers, each something you can see on
// real lokta: the toothy surface (a height field lit from the top left), the cloudy
// formation of hand-laid pulp, long fibres lying in every direction, and small bark flecks.
// Also: deckled-edge masks for cards and prints, generated for each element's exact size.

/** Small, fast, seedable PRNG (mulberry32). */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lattice = (n, r) => Float32Array.from({ length: n * n }, r);

/** Periodic value noise on an n×n lattice; x, y in lattice units. */
function vnoise(lat, n, x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % n) + n) % n;
  const y0 = ((yi % n) + n) % n;
  const x1 = (x0 + 1) % n;
  const y1 = (y0 + 1) % n;
  const a = lat[y0 * n + x0];
  const b = lat[y0 * n + x1];
  const c = lat[y1 * n + x0];
  const d = lat[y1 * n + x1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/**
 * Seamless paper tiles in several colours from one surface (the noise is computed once).
 * papers: [{ base: [r,g,b], fibreLight?, fibreDark?, fleck? }]. Returns Promise<string[]> of blob: URLs.
 */
export function paperTiles(papers, { size = 512, seed = 11, tooth = 1, mottle = 1, fibres = 1, flecks = 1 } = {}) {
  const r = rng(seed);
  // 1 · Tooth: five octaves of periodic noise, as a height field.
  const oct = [[8, 0.32], [17, 0.26], [37, 0.2], [79, 0.14], [157, 0.08]];
  const lats = oct.map(([f]) => lattice(f, r));
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let h = 0;
      for (let k = 0; k < oct.length; k++) {
        const f = oct[k][0];
        h += oct[k][1] * vnoise(lats[k], f, (x * f) / size, (y * f) / size);
      }
      H[y * size + x] = h;
    }
  }
  // 2 · Formation: low-frequency clouds of thicker and thinner pulp; light from the top left on the tooth.
  const m1 = lattice(4, r);
  const m2 = lattice(9, r);
  const F = new Float32Array(size * size);
  const G = new Float32Array(size * size);
  const K = 0.5 * tooth;
  for (let y = 0; y < size; y++) {
    const yu = (y + size - 1) % size;
    const yd = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xl = (x + size - 1) % size;
      const xr = (x + 1) % size;
      const gx = H[y * size + xr] - H[y * size + xl];
      const gy = H[yd * size + x] - H[yu * size + x];
      const m = mottle * ((vnoise(m1, 4, (x * 4) / size, (y * 4) / size) - 0.5) * 0.03
        + (vnoise(m2, 9, (x * 9) / size, (y * 9) / size) - 0.5) * 0.02);
      F[y * size + x] = 1 - (gx + gy) * K + m;
      G[y * size + x] = (r() - 0.5) * 3.5;
    }
  }
  return Promise.all(papers.map((p, idx) => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(size, size);
    const px = img.data;
    const [br, bg, bb] = p.base;
    for (let i = 0, n = size * size; i < n; i++) {
      const f = F[i];
      const g = G[i];
      px[i * 4] = Math.min(255, br * f + g);
      px[i * 4 + 1] = Math.min(255, bg * f + g);
      px[i * 4 + 2] = Math.min(255, bb * f + g * 0.9);
      px[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    drawFibres(ctx, size, rng(seed * 31 + idx * 7), {
      fibres, flecks,
      light: p.fibreLight || 'rgba(255,254,250,0.55)',
      dark: p.fibreDark || 'rgba(112,86,60,0.10)',
      fleck: p.fleck || 'rgba(96,66,42,0.30)',
    });
    return toUrl(cv);
  }));
}

/** 3 · Fibres (short curved strands) and 4 · bark flecks, wrapped at the edges so the tile stays seamless. */
function drawFibres(ctx, size, r, { fibres, flecks, light, dark, fleck }) {
  const wrap = (fn) => { for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) fn(dx, dy); };
  const nFib = Math.round(((size * size) / 260) * fibres);
  ctx.lineCap = 'round';
  for (let i = 0; i < nFib; i++) {
    const x = r() * size;
    const y = r() * size;
    const a = r() * Math.PI * 2;
    const len = 6 + r() * r() * 46;
    const bend = (r() - 0.5) * len * 0.5;
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len;
    const cx = (x + ex) / 2 - Math.sin(a) * bend;
    const cy = (y + ey) / 2 + Math.cos(a) * bend;
    const isLight = r() < 0.62;
    ctx.strokeStyle = isLight ? light : dark;
    ctx.globalAlpha = 0.35 + r() * 0.65;
    ctx.lineWidth = isLight ? 0.5 + r() * 1.1 : 0.4 + r() * 0.6;
    const near = x < len || y < len || x > size - len || y > size - len;
    const draw = (dx, dy) => { ctx.beginPath(); ctx.moveTo(x + dx, y + dy); ctx.quadraticCurveTo(cx + dx, cy + dy, ex + dx, ey + dy); ctx.stroke(); };
    if (near) wrap(draw); else draw(0, 0);
  }
  const nFl = Math.round(((size * size) / 9000) * flecks);
  ctx.fillStyle = fleck;
  for (let i = 0; i < nFl; i++) {
    const x = r() * size;
    const y = r() * size;
    const a = r() * Math.PI;
    const l = 0.6 + r() * 2.6;
    const w = 0.45 + r() * 0.5;
    ctx.globalAlpha = 0.4 + r() * 0.6;
    wrap((dx, dy) => { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, l, w, a, 0, Math.PI * 2); ctx.fill(); });
  }
  ctx.globalAlpha = 1;
}

/** The envelope liner: sindoor paper with a tone-on-tone lattice of tiny endless-knot lozenges. */
export function linerTile({ size = 480, seed = 5 } = {}) {
  const tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const ctx = tile.getContext('2d');
  // Paper first (drawn into a temporary canvas through an Image is async; draw noise directly instead).
  const r = rng(seed);
  const lat = lattice(17, r);
  const lat2 = lattice(53, r);
  const img = ctx.createImageData(size, size);
  const base = [134, 24, 30];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = vnoise(lat, 17, (x * 17) / size, (y * 17) / size) * 0.6 + vnoise(lat2, 53, (x * 53) / size, (y * 53) / size) * 0.4;
      const f = 0.94 + n * 0.1 + (r() - 0.5) * 0.03;
      const i = (y * size + x) * 4;
      img.data[i] = base[0] * f;
      img.data[i + 1] = base[1] * f;
      img.data[i + 2] = base[2] * f;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // Pattern: a diamond lattice; at every node a small four-lobed knot, between them a dot.
  const step = size / 6;
  ctx.strokeStyle = 'rgba(244, 196, 160, 0.22)';
  ctx.fillStyle = 'rgba(244, 196, 160, 0.22)';
  ctx.lineWidth = 1.1;
  for (let j = -1; j <= 6; j++) {
    for (let i = -1; i <= 6; i++) {
      const cx = i * step + (j % 2 ? step / 2 : 0);
      const cy = j * step;
      const s = step * 0.16;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-s, -s, s * 2, s * 2);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        ctx.beginPath();
        ctx.arc(dx * s * 1.45, dy * s * 1.45, s * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx + step / 2, cy + step / 2, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return toUrl(tile);
}

function toUrl(cv) {
  return new Promise((res) => {
    cv.toBlob((b) => res(b ? URL.createObjectURL(b) : cv.toDataURL('image/png')), 'image/webp', 0.9);
  });
}

/**
 * A deckled-edge mask (SVG data URL) for an element of w×h CSS px.
 * edges: which sides are deckled ('trbl'); straight sides stay crisp (a fold, for instance).
 */
export function deckleMask(w, h, { edges = 'trbl', amp = 3.2, seed = 3 } = {}) {
  const r = rng(seed + Math.round(w * 7 + h * 13));
  const W = Math.max(8, Math.round(w));
  const Hh = Math.max(8, Math.round(h));
  const lat = lattice(64, r);
  // Torn depth along the perimeter: two scales of noise, never deeper than amp.
  const depth = (t, side) => {
    const n = vnoise(lat, 64, t * 0.09 + side * 13.7, side * 3.1) * 0.65 + vnoise(lat, 64, t * 0.41 + side * 7.3, side * 5.9) * 0.35;
    return amp * (0.15 + n * 0.85);
  };
  const pts = [];
  const step = 2.4;
  const side = (k, len, fn) => {
    const on = edges.includes('trbl'[k]);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i < n; i++) {
      const t = (i / n) * len;
      fn(t, on ? depth(t, k) : 0);
    }
  };
  side(0, W, (t, d) => pts.push([t, d]));
  side(1, Hh, (t, d) => pts.push([W - d, t]));
  side(2, W, (t, d) => pts.push([W - t, Hh - d]));
  side(3, Hh, (t, d) => pts.push([d, Hh - t]));
  const path = `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}"><filter id="s"><feGaussianBlur stdDeviation="0.45"/></filter><path d="${path}" fill="#000" filter="url(#s)"/></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

/** Keep a deckled mask fitted to an element as it resizes. */
const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((entries) => {
  for (const e of entries) {
    const el = e.target;
    const { width, height } = e.contentRect;
    if (!width || !height) continue;
    const key = `${Math.round(width)}x${Math.round(height)}`;
    if (el.dataset.deckle === key) continue;
    el.dataset.deckle = key;
    const box = el.getBoundingClientRect();
    // contentRect excludes padding; the mask must cover the border box.
    const w = el.offsetWidth || box.width;
    const h = el.offsetHeight || box.height;
    const m = deckleMask(w, h, { edges: el.dataset.edges || 'trbl', amp: Number(el.dataset.amp || 3.2), seed: Number(el.dataset.seed || 3) });
    el.style.maskImage = m;
    el.style.webkitMaskImage = m;
    el.style.maskSize = '100% 100%';
    el.style.webkitMaskSize = '100% 100%';
  }
}) : null;

export function deckle(el, opts = {}) {
  if (opts.edges) el.dataset.edges = opts.edges;
  if (opts.amp) el.dataset.amp = String(opts.amp);
  if (opts.seed) el.dataset.seed = String(opts.seed);
  ro?.observe(el);
}
