// Vasant · shared pieces: the rigged butterflies, the garland they rest on, the flower each ceremony gets.
// Butterflies are rigged, not videos: each is three cut-out parts (left wing, right wing, body) painted in Canva.
// The wings turn about the body (rotateY), so a flap is a transform only and costs nothing to the main thread.

export const ART = '/themes/vasant/art/';

/** the three species, with the height/width of their cut-out */
export const SPECIES = { lime: 463 / 560, crimson: 411 / 560, tiger: 406 / 560 };

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

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
