// Vasant · shared pieces: the rigged butterflies, the garland they rest on, the flower each ceremony gets.
// Butterflies are rigged, not videos: each is three cut-out parts (left wing, right wing, body) painted in Canva.
// The wings fold toward the body (a 2D scaleX), so a flap is a transform only, crisp and cheap on any phone.

export const ART = '/themes/vasant/art/';

/** the three species, with the height/width of their cut-out */
export const SPECIES = { lime: 744 / 900, crimson: 660 / 900, tiger: 653 / 900 };

/** One rigged butterfly. `style` places it (left/top/width/rotate custom properties). Decorative: aria-hidden. */
export function butterfly(sp, { cls = '', style = '', eager = false } = {}) {
  const ar = SPECIES[sp] || 0.75;
  const ld = eager ? '' : ' loading="lazy"';
  return `<span class="va-bf va-bf--${sp} ${cls}" style="--ar:${ar.toFixed(4)};${style}" aria-hidden="true"><span class="va-bf__rig">`
    + `<img class="va-bf__w va-bf__w--l" src="${ART}bf-${sp}-l.webp" alt="" decoding="async"${ld} />`
    + `<img class="va-bf__w va-bf__w--r" src="${ART}bf-${sp}-r.webp" alt="" decoding="async"${ld} />`
    + `<img class="va-bf__b" src="${ART}bf-${sp}-b.webp" alt="" decoding="async"${ld} />`
    + '</span></span>';
}

/** Where butterflies rest on the garland: x, y (fractions of the garland picture), width (fraction), turn, species.
 *  `stay` ones remain after the opening; the others lift off. */
export const PERCH = [
  { x: 0.105, y: 0.09, w: 0.12, r: -28, sp: 'tiger', stay: true },
  { x: 0.235, y: 0.22, w: 0.10, r: -14, sp: 'lime' },
  { x: 0.30, y: 0.40, w: 0.105, r: -36, sp: 'crimson' },
  { x: 0.415, y: 0.45, w: 0.095, r: 8, sp: 'tiger' },
  { x: 0.52, y: 0.50, w: 0.115, r: -6, sp: 'lime', stay: true },
  { x: 0.625, y: 0.43, w: 0.1, r: 18, sp: 'crimson' },
  { x: 0.74, y: 0.33, w: 0.11, r: 30, sp: 'tiger' },
  { x: 0.835, y: 0.21, w: 0.1, r: 22, sp: 'lime' },
  { x: 0.92, y: 0.08, w: 0.1, r: 34, sp: 'crimson' },
  { x: 0.05, y: 0.70, w: 0.09, r: -42, sp: 'crimson' },
  { x: 0.958, y: 0.71, w: 0.095, r: 40, sp: 'lime', stay: true },
];

export function garland({ eager = true } = {}) {
  const bfs = PERCH.map((p, i) => butterfly(p.sp, {
    cls: `va-perch${p.stay ? ' va-perch--stay' : ''}`, eager,
    style: `--x:${p.x * 100}%;--y:${p.y * 100}%;--w:${p.w * 100}%;--r:${p.r}deg;--d:${(-(i * 0.37) % 2.6).toFixed(2)}s`,
  })).join('');
  return `<div class="va-garland" aria-hidden="true">
      <img class="va-garland__img" src="${ART}garland-sm.webp" srcset="${ART}garland-sm.webp 1000w, ${ART}garland.webp 1800w" sizes="(max-width: 719px) 100vw, min(780px, 56vw)" width="1000" height="460" alt="" decoding="async" fetchpriority="high" />
      <div class="va-garland__bfs">${bfs}</div>
    </div>`;
}

/** The flowers of the bloom window, one per ceremony. land: where the two butterflies settle when it is open. */
export const FLOWERS = {
  marigold: { head: '50% 26%', name: { en: 'Marigold', ne: 'सयपत्री' }, sp: ['tiger', 'lime'], land: [[0.2, 0.58, -26, 0.21], [0.8, 0.64, 30, 0.19]] },
  lotus: { head: '52% 28%', name: { en: 'Pink lotus', ne: 'कमल' }, sp: ['lime', 'crimson'], land: [[0.25, 0.64, -18, 0.21], [0.79, 0.2, 26, 0.18]] },
  rose: { head: '48% 21%', name: { en: 'Red rose', ne: 'रातो गुलाफ' }, sp: ['lime', 'tiger'], land: [[0.22, 0.55, -24, 0.2], [0.78, 0.6, 28, 0.19]] },
  orchid: { head: '58% 40%', name: { en: 'Orchid', ne: 'सुनाखरी' }, sp: ['crimson', 'lime'], land: [[0.24, 0.74, -16, 0.2], [0.76, 0.14, 24, 0.18]] },
  blush: { head: '46% 24%', name: { en: 'Blush rose', ne: 'गुलाबी गुलाफ' }, sp: ['tiger', 'crimson'], land: [[0.19, 0.6, -28, 0.2], [0.79, 0.56, 26, 0.19]] },
};
const RULES = [
  [/haldi|hardi|besar|turmeric|pithi|tilak|tika/i, 'marigold'],
  [/meh?e?n?di|henna|sangeet|sangit|engage|sagai|ring/i, 'lotus'],
  [/wedd|bibaha|bivah|vivah|biha|swayam|ceremony|nikah|phera|lagan|lagna|kanyadan/i, 'rose'],
  [/recep|bhoj|party|dinner|banquet|lunch|ratri/i, 'orchid'],
];
const ORDER = ['blush', 'marigold', 'lotus', 'rose', 'orchid'];

/** a flower key per ceremony: by its name, else the next flower not yet used (five, then they repeat) */
export function flowersFor(events) {
  const used = new Set();
  const want = events.map((v) => {
    const hay = `${v.id || ''} ${v.title?.en || ''}`;
    const hit = RULES.find(([re]) => re.test(hay));
    return hit ? hit[1] : null;
  });
  const out = want.map((k) => (k && !used.has(k) ? (used.add(k), k) : null));
  return out.map((k) => {
    if (k) return k;
    const free = ORDER.find((x) => !used.has(x));
    if (free) { used.add(free); return free; }
    used.clear(); const again = ORDER[0]; used.add(again); return again;
  });
}

/** A slim gold botanical rule: a hairline with leaf pairs and a bud in the middle (decoration, aria-hidden). */
export const RULE = `<svg class="va-rule" viewBox="0 0 240 24" aria-hidden="true" focusable="false"><path d="M10 12h88M142 12h88" fill="none" stroke="currentColor" stroke-width=".9" stroke-linecap="round"/><g fill="currentColor"><g transform="rotate(-30 70 12)"><path d="M70 12c4-6 10-8 15-7c-3 5 -8 7 -15 7z"/><path d="M70 12c4 6 10 8 15 7c-3-5 -8-7 -15-7z" opacity=".75"/></g><g transform="rotate(30 170 12)"><path d="M170 12c-4-6 -10-8 -15-7c3 5 8 7 15 7z"/><path d="M170 12c-4 6 -10 8 -15 7c3-5 8-7 15-7z" opacity=".75"/></g><g transform="rotate(-30 44 12)"><path d="M44 12c4-6 10-8 15-7c-3 5 -8 7 -15 7z"/><path d="M44 12c4 6 10 8 15 7c-3-5 -8-7 -15-7z" opacity=".75"/></g><g transform="rotate(30 196 12)"><path d="M196 12c-4-6 -10-8 -15-7c3 5 8 7 15 7z"/><path d="M196 12c-4 6 -10 8 -15 7c3-5 8-7 15-7z" opacity=".75"/></g><ellipse cx="120" cy="6.5" rx="2.6" ry="4.6"/><ellipse cx="120" cy="17.5" rx="2.6" ry="4.6"/><ellipse cx="114.5" cy="12" rx="4.6" ry="2.6"/><ellipse cx="125.5" cy="12" rx="4.6" ry="2.6"/><circle cx="120" cy="12" r="2.2" fill="#C2185B"/><circle cx="10" cy="12" r="1.5"/><circle cx="230" cy="12" r="1.5"/></g></svg>`;

/** loose petals and marigold heads, laid in a gap (never behind text) */
// the separate petals and marigold heads of one painted scatter (petal-<k>.webp, [width, height])
const PIECES = [[217, 220], [220, 211], [220, 214], [220, 210], [213, 220], [206, 220], [220, 209], [216, 220], [216, 220], [220, 213], [220, 216], [204, 196], [120, 192], [116, 192], [192, 132], [152, 172], [148, 164], [92, 196], [104, 188]];
const rng = (seed) => { let s = (seed * 7919 + 13) % 2147483647; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
/** An organic petal drift: a few loose pieces of varied size and turn, thinning out toward one edge and slipping
 *  past it (the container clips them). Deterministic per seed, so the page looks the same on every visit. */
export function scatter(seed, { n = 6, side = 'right', cls = '' } = {}) {
  const r = rng(seed);
  const pool = PIECES.map((_, k) => k);
  let html = '';
  for (let i = 0; i < n; i++) {
    const k = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const t = n > 1 ? i / (n - 1) : 0.5;
    const along = 26 + t * 80 + (r() - 0.5) * 8; // evenly drifting toward the edge, the last one past it
    const x = side === 'right' ? along : 100 - along;
    const y = (i % 2 ? 62 : 30) + (r() - 0.5) * 22; // alternate high and low so no two pieces touch
    const s = (0.5 + r() * 0.55) * (1.1 - 0.35 * t);
    const rot = Math.round((r() - 0.5) * 150);
    const [w, h] = PIECES[k];
    const f = w / Math.max(w, h); // size by the longer side, so a slim petal is not drawn huge
    html += `<img class="va-pc" src="${ART}petal-${k}.webp" width="${w}" height="${h}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--s:${s.toFixed(2)};--f:${f.toFixed(2)};rotate:${rot}deg" alt="" loading="lazy" decoding="async" />`;
  }
  return `<div class="va-scatter ${cls}" aria-hidden="true">${html}</div>`;
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
