// Dhaka weave, rebuilt as a generative system.
//
// Dhaka cloth (Palpa, Tehrathum) is a supplementary-weft inlay weave: coloured
// threads float over a plain ground in stepped geometric figures, laid down band by
// band. Here every "pixel" is one weft float on a square grid, so the stepped
// diamonds, chevrons and checks come out of the same arithmetic the loom uses.

export const C = {
  ground: '#FFFFFF',
  groundTick: null,
  warp: 'rgba(18, 18, 18, 0.07)',
  ink: '#121212',
  crimson: '#C21F2E',
  mustard: '#E0A526',
  teal: '#16726C',
  orange: '#E5622B',
  white: '#FFFFFF',
};

// Each band changes its colours, as weavers do between bands.
const SETS = [
  [C.crimson, C.mustard, C.white, C.teal],
  [C.teal, C.orange, C.white, C.crimson],
  [C.mustard, C.crimson, C.white, C.teal],
  [C.orange, C.teal, C.white, C.mustard],
];

const DIA = 14; // diamond band height in cells
const CHV = 6; // chevron band height
const PERIOD = DIA + CHV;
const W = 12; // horizontal repeat

/**
 * Colour of the inlay at a cell, or null for plain ground.
 * `dark` = the figure sits on a black ground (letters), so outlines become white.
 */
export function dhakaCell(x, y, { dark = true } = {}) {
  const yy = ((y % PERIOD) + PERIOD) % PERIOD;
  const band = Math.floor(y / PERIOD);
  const set = SETS[((band % SETS.length) + SETS.length) % SETS.length];
  const line = dark ? C.white : C.ink;
  if (yy < DIA) {
    // Stepped diamond band, half-drop every other band.
    const shift = band % 2 ? W / 2 : 0;
    const lx = (((x + shift) % W) + W) % W;
    if (yy === 0 || yy === DIA - 1) return (lx % 2 === 0) ? set[1] : null;
    const dx = Math.abs(lx - 5.5);
    const dy = Math.abs(yy - 6.5);
    const d = dx + dy;
    if (d <= 1) return set[1];
    if (d <= 3) return set[0];
    if (d <= 4) return line;
    if (d >= 6 && d <= 7 && (dx < 1 || dy < 1)) return set[3];
    if (d >= 8 && (lx + yy) % 2 === 0) return set[0];
    return null;
  }
  // Chevron band.
  const cy = yy - DIA;
  const lx = ((x % 8) + 8) % 8;
  const z = Math.abs(lx - 3.5) - 0.5; // 0..3
  if (cy === Math.round(z) + 1 || cy === Math.round(z) + 2) return cy === Math.round(z) + 1 ? set[2] : set[0];
  return null;
}

/** Simple chevron border used on the cloth's top and bottom selvedge bands. */
export function borderCell(x, y, h) {
  if (y === 0 || y === h - 1) return C.ink;
  const lx = ((x % 6) + 6) % 6;
  const z = Math.abs(lx - 2.5) - 0.5;
  const mid = (h - 2) / 2;
  if (Math.abs(y - 1 - (mid - 1 + z * 0.66)) < 0.75) return C.crimson;
  if ((x + y) % 2 === 0 && (y === 1 || y === h - 2)) return C.mustard;
  return null;
}

/** Draws one weft float (a run of same-coloured cells) as a thread. */
export function stitch(ctx, x, y, len, cell, color) {
  const h = cell * 0.86;
  const top = y + (cell - h) / 2;
  const inset = Math.max(0.5, cell * 0.05);
  const w = len * cell - inset * 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x + inset, top, w, h, Math.min(h / 2, cell * 0.22));
  else ctx.rect(x + inset, top, w, h);
  ctx.fill();
  if (cell >= 5) {
    // A faint sheen along the top of the float reads as twisted cotton.
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillRect(x + inset + cell * 0.2, top + h * 0.12, w - cell * 0.4, Math.max(0.6, h * 0.16));
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x + inset + cell * 0.2, top + h * 0.8, w - cell * 0.4, Math.max(0.6, h * 0.1));
  }
}

/** Paints a row of colours (array, null = skip) as floats, tied down every 3 cells. */
export function paintRow(ctx, colors, y, cell, x0 = 0, tie = 3) {
  let i = 0;
  while (i < colors.length) {
    const col = colors[i];
    if (!col) { i++; continue; }
    let j = i + 1;
    while (j < colors.length && colors[j] === col && j - i < tie) j++;
    stitch(ctx, x0 + i * cell, y, j - i, cell, col);
    i = j;
  }
}

/** Plain-weave ground texture for a woven row. */
export function paintGround(ctx, cols, y, cell, x0 = 0, row = 0) {
  ctx.fillStyle = C.ground;
  ctx.fillRect(x0, y, cols * cell, cell);
  if (!C.groundTick) return;
  ctx.fillStyle = C.groundTick;
  const s = Math.max(1, cell * 0.28);
  for (let i = (row % 2); i < cols; i += 2) ctx.fillRect(x0 + i * cell + (cell - s) / 2, y + (cell - s) / 2, s, s);
}

/**
 * A repeating horizontal Dhaka band as a data URL, for CSS backgrounds.
 * Returns { url, width, height } in CSS pixels.
 */
export function bandTexture({ rows = DIA, cell = 6, dark = true, kind = 'diamond', offset = 0 } = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cols = kind === 'border' ? 12 : W * 2;
  const cv = document.createElement('canvas');
  cv.width = Math.round(cols * cell * dpr);
  cv.height = Math.round(rows * cell * dpr);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.fillStyle = dark ? C.ink : C.ground;
  ctx.fillRect(0, 0, cols * cell, rows * cell);
  for (let y = 0; y < rows; y++) {
    const colors = [];
    for (let x = 0; x < cols; x++) colors.push(kind === 'border' ? borderCell(x, y, rows) : dhakaCell(x, y + offset, { dark }));
    paintRow(ctx, colors, y * cell, cell);
  }
  return { url: cv.toDataURL('image/png'), width: cols * cell, height: rows * cell };
}

/**
 * A woven monogram tile (used when the bride or groom has no portrait yet).
 * Draws the letter as Dhaka cloth on a black ground, inside a plain-weave field.
 */
export function wovenMonogram(canvas, letter, { cell = 8, font = '"Archivo", sans-serif', deva = false, fill = 0.8 } = {}) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(10, rect.width);
  const h = Math.max(10, rect.height);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const cols = Math.floor(w / cell);
  const rows = Math.floor(h / cell);
  const ox = (w - cols * cell) / 2;
  const oy = (h - rows * cell) / 2;
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, w, h);
  const mask = textMask(cols, rows, [{ text: letter, font: deva ? `800 100px "Noto Sans Devanagari", sans-serif` : `900 100px ${font}` }], { fill, gap: 0 });
  for (let y = 0; y < rows; y++) {
    paintGround(ctx, cols, oy + y * cell, cell, ox, y);
    const colors = [];
    for (let x = 0; x < cols; x++) colors.push(mask[y * cols + x] ? (dhakaCell(x, y) || C.ink) : null);
    ctx.fillStyle = C.ink;
    for (let x = 0; x < cols; x++) if (colors[x]) ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    paintRow(ctx, colors, oy + y * cell, cell, ox, 4);
  }
}

/**
 * Rasterises text parts onto a cols×rows grid, centred, scaled to fit.
 * parts: [{ text, font }] laid out horizontally (or stacked when `stack`).
 * Returns a Uint8Array mask.
 */
export function textMask(cols, rows, parts, { fill = 0.8, stack = false, gap = 0.08, maxRows = 1 } = {}) {
  const S = 4; // supersample
  const cv = document.createElement('canvas');
  cv.width = cols * S;
  cv.height = rows * S;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  // Measure at 100px.
  const metrics = parts.map((p) => {
    ctx.font = p.font;
    if ('fontStretch' in ctx) ctx.fontStretch = p.stretch || 'normal';
    const m = ctx.measureText(p.text);
    const asc = m.actualBoundingBoxAscent;
    const desc = m.actualBoundingBoxDescent;
    return { ...p, w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, left: m.actualBoundingBoxLeft, asc, desc, h: asc + desc };
  });
  const gapPx = gap * 100;
  let totalW;
  let totalH;
  if (stack) {
    totalW = Math.max(...metrics.map((m) => m.w));
    totalH = metrics.reduce((a, m) => a + m.h, 0) + gapPx * (metrics.length - 1);
  } else {
    totalW = metrics.reduce((a, m) => a + m.w, 0) + gapPx * (metrics.length - 1);
    totalH = Math.max(...metrics.map((m) => m.h));
  }
  const scale = Math.min((cv.width * fill) / totalW, (cv.height * Math.min(fill, maxRows)) / totalH);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'alphabetic';
  if (stack) {
    let y = (cv.height - totalH * scale) / 2;
    for (const m of metrics) {
      ctx.save();
      ctx.translate((cv.width - m.w * scale) / 2 + m.left * scale, y + m.asc * scale);
      ctx.scale(scale, scale);
      ctx.font = m.font;
      if ('fontStretch' in ctx) ctx.fontStretch = m.stretch || 'normal';
      ctx.fillText(m.text, 0, 0);
      ctx.restore();
      y += (m.h + gapPx) * scale;
    }
  } else {
    let x = (cv.width - totalW * scale) / 2;
    const maxAsc = Math.max(...metrics.map((m) => m.asc));
    const base = (cv.height - totalH * scale) / 2 + maxAsc * scale;
    for (const m of metrics) {
      ctx.save();
      ctx.translate(x + m.left * scale, base);
      ctx.scale(scale, scale);
      ctx.font = m.font;
      if ('fontStretch' in ctx) ctx.fontStretch = m.stretch || 'normal';
      ctx.fillText(m.text, 0, 0);
      ctx.restore();
      x += (m.w + gapPx) * scale;
    }
  }
  const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const mask = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let a = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) a += data[((y * S + sy) * cv.width + (x * S + sx)) * 4 + 3];
      mask[y * cols + x] = a / (S * S) > 110 ? 1 : 0;
    }
  }
  return mask;
}

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * The loom: a full-screen canvas whose cloth is woven row by row as `progress`
 * goes 0 → WEAVE_END, then unravels sideways from WEAVE_HOLD → 1.
 */
export class Loom {
  constructor(canvas, { parts, stackParts }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.parts = parts;
    this.stackParts = stackParts;
    this.progress = 0;
    this.weaveEnd = 0.6;
    this.holdEnd = 0.74;
    this.cloth = document.createElement('canvas');
    this.resize();
  }

  setParts(parts, stackParts) {
    this.parts = parts;
    this.stackParts = stackParts;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.w = Math.max(10, rect.width);
    this.h = Math.max(10, rect.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    const portrait = this.h > this.w * 1.1;
    // Fine threads: ~180 warp ends on desktop, ~95 on phones.
    const cell = portrait ? Math.max(4, Math.min(6, Math.round(this.w / 92))) : Math.max(6, Math.min(9, Math.round(this.w / 180)));
    this.cell = cell;
    this.cols = Math.ceil(this.w / cell);
    this.rows = Math.ceil(this.h / cell);
    this.ox = (this.w - this.cols * cell) / 2;
    this.oy = (this.h - this.rows * cell) / 2;
    this.build(portrait);
    this.draw();
  }

  build(portrait) {
    const { cols, rows, cell, dpr } = this;
    // A woven strip: Dhaka diamond selvedge bands above and below the initials.
    const bandH = 14;
    const span = portrait ? 0.74 : 0.8;
    const figTop = Math.round(rows * (1 - span) / 2);
    const figBot = rows - figTop;
    const pad = portrait ? 6 : 5;
    const figRows = figBot - figTop - bandH * 2 - pad * 2;
    const figCols = cols - (portrait ? 8 : 16);
    const mask = textMask(figCols, figRows, portrait ? this.stackParts : this.parts, {
      fill: portrait ? 1 : 0.94, stack: portrait, gap: portrait ? 0.08 : 0.1,
    });
    this.figure = { top: figTop, bot: figBot, bandH };
    const cv = this.cloth;
    cv.width = Math.round(cols * cell * dpr);
    cv.height = Math.round(rows * cell * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mx0 = Math.floor((cols - figCols) / 2);
    const my0 = figTop + bandH + pad;
    for (let y = 0; y < rows; y++) {
      paintGround(ctx, cols, y * cell, cell, 0, y);
      const colors = new Array(cols).fill(null);
      const inTopBand = y >= figTop && y < figTop + bandH;
      const inBotBand = y >= figBot - bandH && y < figBot;
      if (inTopBand || inBotBand) {
        const by = inTopBand ? y - figTop : y - (figBot - bandH) + PERIOD;
        for (let x = 0; x < cols; x++) colors[x] = dhakaCell(x, by) || C.ink;
      } else if (y === figTop - 2 || y === figBot + 1) {
        for (let x = 0; x < cols; x++) colors[x] = x % 2 ? C.crimson : null;
      } else {
        const my = y - my0;
        if (my >= 0 && my < figRows) {
          for (let x = 0; x < cols; x++) {
            const mx = x - mx0;
            if (mx >= 0 && mx < figCols && mask[my * figCols + mx]) colors[x] = dhakaCell(x, y + 3) || C.ink;
          }
        }
      }
      // Figure cells sit on a dark ground so the letters read as solid cloth.
      ctx.fillStyle = C.ink;
      if (y !== figTop - 2 && y !== figBot + 1) for (let x = 0; x < cols; x++) if (colors[x]) ctx.fillRect(x * cell, y * cell, cell, cell);
      paintRow(ctx, colors, y * cell, cell, 0, 4);
    }
  }

  set(p) {
    this.progress = p;
    this.draw();
  }

  draw() {
    const { ctx, dpr, cols, rows, cell, w, h, ox, oy } = this;
    const p = this.progress;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const unravel = clamp01((p - this.holdEnd) / (1 - this.holdEnd));
    // Bare warp (only visible before the cloth covers it); gone once unravelling starts.
    if (unravel === 0) {
      ctx.fillStyle = C.ground;
      ctx.fillRect(0, 0, w, h);
    }
    const weave = clamp01(p / this.weaveEnd);
    const cur = weave * (rows + 1.5);
    const srcW = cols * cell * dpr;
    let shuttle = null;
    for (let k = 0; k < rows; k++) {
      const y = rows - 1 - k; // woven from the weaver's side, bottom up
      const f = clamp01(cur - k);
      if (f <= 0) break;
      const ltr = k % 2 === 0;
      const fw = f * cols * cell;
      let dx = 0;
      if (unravel > 0) {
        // Each pick is pulled back out sideways, top of the cloth first, in a ragged wave.
        const order = y / rows;
        const jitter = (((y * 7919) % 17) / 17) * 0.1;
        const local = clamp01((unravel - order * 0.6 - jitter) / 0.3);
        if (local >= 1) continue;
        dx = (ltr ? 1 : -1) * easeIn(local) * (w + 60);
      }
      const sx = ltr ? 0 : (1 - f) * srcW;
      const dxx = ox + (ltr ? 0 : (1 - f) * cols * cell) + dx;
      ctx.drawImage(this.cloth, sx, y * cell * dpr, f * srcW, cell * dpr, dxx, oy + y * cell, fw, cell);
      if (f < 1 && unravel === 0) shuttle = { x: ox + (ltr ? fw : (1 - f) * cols * cell), y: oy + y * cell, ltr };
    }
    if (shuttle) {
      // The shuttle: a dark spindle with a mustard bobbin, leading the weft.
      const len = Math.max(36, cell * 7);
      const sh = Math.max(6, cell * 1.4);
      const sx = shuttle.ltr ? shuttle.x - cell * 0.5 : shuttle.x - len + cell * 0.5;
      const sy = shuttle.y + cell / 2 - sh / 2;
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(sx, sy, len, sh, sh / 2);
      else ctx.rect(sx, sy, len, sh);
      ctx.fill();
      ctx.fillStyle = C.mustard;
      ctx.fillRect(sx + len * 0.3, sy + sh * 0.3, len * 0.4, sh * 0.4);
    }
  }
}

export const loomEase = { easeOut, easeIn, clamp01 };

// ───────────────────────── Palpali Dhaka ─────────────────────────
// The Palpali topi palette: white cotton ground with black sawtooth borders,
// rose and salmon stepped diamonds and small green accents.
export const PAL = {
  black: '#2B2522',
  rose: '#C0395A',
  salmon: '#EC8667',
  green: '#3B9262',
  thread: '#FAF5EA',
};
const BAND = 22;

/** One Palpali band (22 rows, repeat 16 cells). Returns a colour or null (white ground). */
export function palpaliCell(x, y) {
  const yy = ((y % BAND) + BAND) % BAND;
  const band = Math.floor(y / BAND);
  const lx = (((x + (band % 2 ? 8 : 0)) % 16) + 16) % 16;
  if (yy === 0 || yy === BAND - 1) return PAL.black;
  if (yy === 1 || yy === BAND - 2) return null;
  // Black sawtooth teeth along both edges, as on the topi.
  if (yy >= 2 && yy <= 4) return (lx % 4) <= 2 - (yy - 2) ? PAL.black : null;
  if (yy >= BAND - 5 && yy <= BAND - 3) return (lx % 4) <= 2 - (BAND - 3 - yy) ? PAL.black : null;
  const dx = Math.abs(lx - 7.5);
  const dy = Math.abs(yy - 10.5);
  const d = dx + dy;
  if (d <= 1) return PAL.black;
  if (d <= 3) return PAL.salmon;
  if (d <= 4) return null;
  if (d <= 5) return PAL.rose;
  if (d <= 6) return null;
  if (dy < 1 && dx >= 7) return PAL.green;
  if (d >= 7 && (lx + yy) % 2 === 0 && dy >= 3) return PAL.green;
  return null;
}

/** A repeating tile of Palpali cloth (both directions) as a data URL. */
export function palpaliTile({ cell = 4, bands = 1 } = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cols = 32;
  const rows = BAND * bands;
  const cv = document.createElement('canvas');
  cv.width = Math.round(cols * cell * dpr);
  cv.height = Math.round(rows * cell * dpr);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.fillStyle = PAL.thread;
  ctx.fillRect(0, 0, cols * cell, rows * cell);
  // Fine plain-weave texture on the white ground.
  ctx.fillStyle = 'rgba(120, 100, 80, 0.07)';
  for (let y = 0; y < rows; y++) for (let x = (y % 2); x < cols; x += 2) ctx.fillRect(x * cell, y * cell, cell, cell);
  for (let y = 0; y < rows; y++) {
    const colors = [];
    for (let x = 0; x < cols; x++) colors.push(palpaliCell(x, y));
    paintRow(ctx, colors, y * cell, cell, 0, 3);
  }
  return { url: cv.toDataURL('image/png'), width: cols * cell, height: rows * cell };
}
