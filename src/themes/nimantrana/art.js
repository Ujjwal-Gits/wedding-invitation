// Nimantrana: every ornament is drawn here as crisp vector art (no raster, no AI images).
// Gold arches, the Palpali Dhaka weave, the four red-outlined tiles (swastika, havan kunda),
// brass bells, the kalash with mango leaves and coconut, brass diyos and small gold motifs.
// Gradients live once in goldDefs() (inserted at the top of <body>) and are shared by id.

const r2 = (n) => Math.round(n * 100) / 100;

/** Shared gradients. Insert once. */
export const goldDefs = () => `
<svg class="nm-defs" aria-hidden="true" focusable="false" width="0" height="0">
  <defs>
    <linearGradient id="nm-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8A5A14"/><stop offset=".22" stop-color="#D4A443"/><stop offset=".42" stop-color="#F4DE9C"/>
      <stop offset=".58" stop-color="#BF8A2E"/><stop offset=".8" stop-color="#E5C268"/><stop offset="1" stop-color="#8A5A14"/>
    </linearGradient>
    <linearGradient id="nm-gold-h" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8A5A14"/><stop offset=".3" stop-color="#E2BC62"/><stop offset=".5" stop-color="#F6E2A6"/>
      <stop offset=".7" stop-color="#C8933A"/><stop offset="1" stop-color="#7E5212"/>
    </linearGradient>
    <linearGradient id="nm-brass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5A370A"/><stop offset=".18" stop-color="#9C6A1E"/><stop offset=".38" stop-color="#E7C473"/>
      <stop offset=".5" stop-color="#FFF1C4"/><stop offset=".62" stop-color="#D9AE52"/><stop offset=".85" stop-color="#8E5E18"/><stop offset="1" stop-color="#4E2F08"/>
    </linearGradient>
    <linearGradient id="nm-copper" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5B2410"/><stop offset=".2" stop-color="#A4502A"/><stop offset=".4" stop-color="#E39A62"/>
      <stop offset=".5" stop-color="#FFD0A4"/><stop offset=".62" stop-color="#D0814C"/><stop offset=".85" stop-color="#8A3C1C"/><stop offset="1" stop-color="#4A1C0C"/>
    </linearGradient>
    <linearGradient id="nm-leaf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3F8A2E"/><stop offset=".55" stop-color="#2D6E25"/><stop offset="1" stop-color="#1D4F1A"/>
    </linearGradient>
    <linearGradient id="nm-leaf2" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5CA03A"/><stop offset=".6" stop-color="#367A28"/><stop offset="1" stop-color="#22561C"/>
    </linearGradient>
    <radialGradient id="nm-coco" cx=".38" cy=".3" r=".8">
      <stop offset="0" stop-color="#B07A44"/><stop offset=".5" stop-color="#7A4B22"/><stop offset="1" stop-color="#3E2310"/>
    </radialGradient>
    <radialGradient id="nm-flame" cx=".5" cy=".72" r=".62">
      <stop offset="0" stop-color="#FFFBE8"/><stop offset=".3" stop-color="#FFE38A"/><stop offset=".62" stop-color="#FFA53A"/><stop offset="1" stop-color="#E2541C"/>
    </radialGradient>
    <radialGradient id="nm-glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#FFD98A" stop-opacity=".55"/><stop offset=".45" stop-color="#FFB347" stop-opacity=".18"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/>
    </radialGradient>
  </defs>
</svg>`;

// ───────────────────────── Arches ─────────────────────────
/**
 * A cusped (multifoil) arch, the shape of Nepali and Rajput temple niches: lobes along a
 * semi-ellipse, a small pointed finial at the apex, straight jambs down to the base.
 * Returns an SVG path for the box (x, y, w, h); `spring` is the height of the arch part.
 */
export function archPath(x, y, w, h, spring, lobes = 7) {
  const cx = x + w / 2;
  const rx = w / 2;
  const fin = spring * 0.16; // headroom for the pointed finial
  const ry = spring - fin;
  const base = y + spring;
  const pts = [];
  for (let i = 0; i <= lobes; i++) {
    const t = Math.PI - (i / lobes) * Math.PI; // left (π) → right (0)
    pts.push([cx + rx * Math.cos(t), base - ry * Math.sin(t)]);
  }
  let d = `M${r2(x)} ${r2(y + h)}L${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 0; i < lobes; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const chord = Math.hypot(bx - ax, by - ay);
    const rad = chord * 0.56;
    if (i === Math.floor(lobes / 2) && lobes % 2) {
      // the apex lobe rises to a small point (ogee finial)
      const mx = (ax + bx) / 2;
      const top = y;
      const lift = Math.min(ay, by) - top;
      d += `C${r2(ax + chord * 0.02)} ${r2(ay - lift * 0.75)} ${r2(mx - chord * 0.16)} ${r2(top + lift * 0.3)} ${r2(mx)} ${r2(top)}C${r2(mx + chord * 0.16)} ${r2(top + lift * 0.3)} ${r2(bx - chord * 0.02)} ${r2(by - lift * 0.75)} ${r2(bx)} ${r2(by)}`;
    } else {
      d += `A${r2(rad)} ${r2(rad)} 0 0 1 ${r2(bx)} ${r2(by)}`;
    }
  }
  d += `L${r2(x + w)} ${r2(y + h)}Z`;
  return d;
}

/**
 * The gold arched panel drawn inside every card panel and journey leaf: an outer cusped arch
 * (gold foil), an inner hairline, and small gold dots in the spandrels.
 */
export function archPanelSVG(w, h, { spring = Math.min(w * 0.42, h * 0.3), inset = 0, lobes = 7, cls = '' } = {}) {
  const o = archPath(inset, inset, w - inset * 2, h - inset * 2, spring, lobes);
  const i = archPath(inset + 7, inset + 7, w - inset * 2 - 14, h - inset * 2 - 14, spring - 4, lobes);
  const dots = [];
  // spandrel ornaments: a lotus bud in each upper corner
  const s = Math.min(w, h) * 0.05;
  [[inset + s * 1.4, inset + s * 1.4], [w - inset - s * 1.4, inset + s * 1.4]].forEach(([x, y]) => {
    dots.push(`<g transform="translate(${r2(x)} ${r2(y)})">${budPath(s)}</g>`);
  });
  return `<svg class="nm-arch ${cls}" viewBox="0 0 ${r2(w)} ${r2(h)}" width="${r2(w)}" height="${r2(h)}" aria-hidden="true" focusable="false">
    <path d="${o}" fill="none" stroke="url(#nm-gold)" stroke-width="2.6"/>
    <path d="${i}" fill="none" stroke="#B88A2E" stroke-width=".9" opacity=".75"/>
    ${dots.join('')}
  </svg>`;
}

/** A small gold lotus bud (centred at 0,0, size ~s). */
function budPath(s) {
  return `<path d="M0 ${r2(-s)}C${r2(s * 0.55)} ${r2(-s * 0.45)} ${r2(s * 0.5)} ${r2(s * 0.3)} 0 ${r2(s * 0.62)}C${r2(-s * 0.5)} ${r2(s * 0.3)} ${r2(-s * 0.55)} ${r2(-s * 0.45)} 0 ${r2(-s)}Z" fill="url(#nm-gold)"/>
    <path d="M0 ${r2(s * 0.62)}C${r2(s * 0.9)} ${r2(s * 0.5)} ${r2(s * 1.1)} ${r2(-s * 0.1)} ${r2(s * 0.95)} ${r2(-s * 0.35)}M0 ${r2(s * 0.62)}C${r2(-s * 0.9)} ${r2(s * 0.5)} ${r2(-s * 1.1)} ${r2(-s * 0.1)} ${r2(-s * 0.95)} ${r2(-s * 0.35)}" fill="none" stroke="#B88A2E" stroke-width="1"/>`;
}

/**
 * The crest above a photo: a cusped arch tympanum filled with a gold lattice and a lotus,
 * sitting on the photo's top edge. The photo itself is never masked.
 */
export function crestSVG(kind = 'lotus') {
  const W = 300;
  const H = 96;
  const outer = archPath(4, 10, W - 8, H - 10, H - 12, 9);
  const inner = archPath(18, 26, W - 36, H - 26, H - 28, 9);
  const lotus = kind === 'lotus' ? lotusSVGInner(W / 2, H - 6, 34) : '';
  return `<svg class="nm-crest" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
    <g>
      <path d="${outer}" fill="#8E1420"/>
      <path d="${outer}" fill="none" stroke="url(#nm-gold)" stroke-width="5"/>
      <path d="${inner}" fill="#FBF3E2"/>
      <path d="${inner}" fill="none" stroke="url(#nm-gold)" stroke-width="2.2"/>
      ${lotus}
    </g>
  </svg>`;
}

/** A pointed onion arch canopy (jharokha) for the second photo treatment. */
export function canopySVG() {
  const W = 300;
  const H = 120;
  const d = `M8 ${H}L8 ${H - 30}C8 ${H - 58} 60 ${H - 62} 98 ${H - 78}C128 ${H - 90} 142 ${H - 104} 150 6C158 ${H - 104} 172 ${H - 90} 202 ${H - 78}C240 ${H - 62} 292 ${H - 58} 292 ${H - 30}L292 ${H}Z`;
  const d2 = `M24 ${H}L24 ${H - 26}C24 ${H - 48} 70 ${H - 52} 104 ${H - 66}C130 ${H - 77} 143 ${H - 90} 150 26C157 ${H - 90} 170 ${H - 77} 196 ${H - 66}C230 ${H - 52} 276 ${H - 48} 276 ${H - 26}L276 ${H}Z`;
  return `<svg class="nm-canopy" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
    <path d="${d}" fill="#8E1420"/><path d="${d}" fill="none" stroke="url(#nm-gold)" stroke-width="4.5"/>
    <path d="${d2}" fill="#FBF3E2"/><path d="${d2}" fill="none" stroke="url(#nm-gold)" stroke-width="2"/>
    ${lotusSVGInner(150, H - 4, 30)}
    <circle cx="150" cy="4" r="4" fill="url(#nm-gold)"/>
  </svg>`;
}

/** A gold lotus, base centred at (cx, by), width ~2*s. */
function lotusSVGInner(cx, by, s) {
  const petal = (ang, len, wid, fill) => `<path transform="translate(${r2(cx)} ${r2(by)}) rotate(${ang})" d="M0 0C${r2(wid)} ${r2(-len * 0.35)} ${r2(wid * 0.6)} ${r2(-len * 0.85)} 0 ${r2(-len)}C${r2(-wid * 0.6)} ${r2(-len * 0.85)} ${r2(-wid)} ${r2(-len * 0.35)} 0 0Z" fill="${fill}" stroke="#8A5A14" stroke-width=".8"/>`;
  return [
    petal(-62, s * 0.8, s * 0.26, 'url(#nm-gold)'), petal(62, s * 0.8, s * 0.26, 'url(#nm-gold)'),
    petal(-32, s * 0.95, s * 0.3, 'url(#nm-gold)'), petal(32, s * 0.95, s * 0.3, 'url(#nm-gold)'),
    petal(0, s * 1.05, s * 0.32, 'url(#nm-gold)'),
    `<path d="M${r2(cx - s)} ${r2(by)}Q${r2(cx)} ${r2(by + s * 0.22)} ${r2(cx + s)} ${r2(by)}" fill="none" stroke="#8A5A14" stroke-width="1.4"/>`,
  ].join('');
}

/** A standalone gold lotus ornament (section marks). */
export const lotusSVG = (cls = '') => `<svg class="nm-lotus ${cls}" viewBox="0 0 120 64" aria-hidden="true" focusable="false">
  <path d="M4 56H44M76 56H116" stroke="#B88A2E" stroke-width="1.2"/>
  <circle cx="48" cy="56" r="1.8" fill="#B88A2E"/><circle cx="72" cy="56" r="1.8" fill="#B88A2E"/>
  ${lotusSVGInner(60, 54, 30)}
</svg>`;

// ───────────────────────── Palpali Dhaka weave ─────────────────────────
/**
 * One repeat of a Palpali Dhaka border (as a data URI for background-image, repeat-x):
 * black and saffron selvedge threads, a sindoor ground with ivory diamonds outlined in black,
 * small black-and-saffron lozenges between, and a green thread along the bottom.
 */
export function dhakaTile() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="24" viewBox="0 0 48 24" shape-rendering="crispEdges">
  <rect width="48" height="24" fill="#A3161F"/>
  <rect y="0" width="48" height="1.5" fill="#1B1210"/><rect y="1.5" width="48" height="1.5" fill="#E58A1F"/><rect y="3" width="48" height="1" fill="#1B1210"/>
  <rect y="20" width="48" height="1" fill="#1B1210"/><rect y="21" width="48" height="1.5" fill="#2F7A3B"/><rect y="22.5" width="48" height="1.5" fill="#1B1210"/>
  <g shape-rendering="geometricPrecision">
    <path d="M12 5L19 12L12 19L5 12Z" fill="#1B1210"/>
    <path d="M12 7L17 12L12 17L7 12Z" fill="#F6EEDC"/>
    <path d="M12 9.5L14.5 12L12 14.5L9.5 12Z" fill="#A3161F"/>
    <path d="M36 7L41 12L36 17L31 12Z" fill="#1B1210"/>
    <path d="M36 9.2L38.8 12L36 14.8L33.2 12Z" fill="#E58A1F"/>
    <path d="M24 4L27 7L24 10L21 7Z M24 14L27 17L24 20L21 17Z" fill="#F6EEDC"/>
    <path d="M0 4L3 7L0 10Z M48 4L45 7L48 10Z M0 14L3 17L0 20Z M48 14L45 17L48 20Z" fill="#1B1210"/>
    <circle cx="24" cy="12" r="1.4" fill="#2F7A3B"/>
  </g>
</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// ───────────────────────── The four sacred tiles ─────────────────────────
/** Swastika (स्वस्तिक) in sindoor with the four dots, as printed on Nepali wedding cards. */
export const swastikaSVG = () => `<svg class="nm-glyph-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
  <path d="M50 18V82M18 50H82M50 18H80M82 50V80M50 82H20M18 50V20" fill="none" stroke="#A3161F" stroke-width="8" stroke-linecap="square"/>
  <g fill="#A3161F"><circle cx="34" cy="34" r="5"/><circle cx="66" cy="34" r="5"/><circle cx="34" cy="66" r="5"/><circle cx="66" cy="66" r="5"/></g>
</svg>`;

/** Havan kunda: the stepped fire altar with three tongues of flame. */
export const havanSVG = () => `<svg class="nm-glyph-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
  <path d="M50 14C58 26 60 34 56 44C64 38 66 30 64 24C72 34 72 46 64 54H36C28 46 28 34 36 26C35 33 38 38 43 42C40 32 42 22 50 14Z" fill="#E58A1F" stroke="#A3161F" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M50 30C54 37 54 43 50 50C46 43 46 37 50 30Z" fill="#FFD35A"/>
  <path d="M14 56H86L80 64H20Z M22 66H78L72 74H28Z M30 76H70L64 86H36Z" fill="none" stroke="#A3161F" stroke-width="3.2" stroke-linejoin="round"/>
</svg>`;

// ───────────────────────── Brass bell (ghanti) ─────────────────────────
export const bellSVG = () => `<svg class="nm-bell__svg" viewBox="0 0 100 150" aria-hidden="true" focusable="false">
  <ellipse cx="50" cy="8" rx="7" ry="7" fill="none" stroke="url(#nm-brass)" stroke-width="3.4"/>
  <rect x="45" y="14" width="10" height="16" rx="3" fill="url(#nm-brass)"/>
  <ellipse cx="50" cy="31" rx="12" ry="4.5" fill="url(#nm-brass)"/>
  <path d="M50 30C36 30 31 40 30 56C29 76 26 98 16 112C14 116 16 120 22 121H78C84 120 86 116 84 112C74 98 71 76 70 56C69 40 64 30 50 30Z" fill="url(#nm-brass)"/>
  <path d="M38 40C35 52 34 76 30 100" fill="none" stroke="#FFF4CF" stroke-width="3" stroke-linecap="round" opacity=".55"/>
  <path d="M30 56H70" stroke="#6B430E" stroke-width="1.6" opacity=".7"/><path d="M29.5 61H70.5" stroke="#FFF1C4" stroke-width="1" opacity=".5"/>
  <path d="M19 108H81" stroke="#6B430E" stroke-width="1.6" opacity=".6"/>
  <ellipse cx="50" cy="121" rx="34" ry="5.5" fill="#5A370A"/>
  <ellipse cx="50" cy="120" rx="32" ry="3.8" fill="url(#nm-brass)"/>
  <path d="M50 121V134" stroke="#6B430E" stroke-width="2.4"/>
  <circle cx="50" cy="138" r="6.5" fill="url(#nm-brass)"/>
</svg>`;

// ───────────────────────── Kalash ─────────────────────────
/** A brass kalash with mango leaves, a coconut in red cloth, the sacred thread and a sindoor swastika. */
export const kalashSVG = (cls = '') => `<svg class="nm-kalash-svg ${cls}" viewBox="0 0 220 300" role="img" aria-label="Kalash" focusable="false">
  <!-- mango leaves, fanned behind the coconut -->
  <g stroke="#1E4A18" stroke-width="1">
    <path d="M110 92C86 78 54 70 22 74C44 90 78 98 110 96Z" fill="url(#nm-leaf)"/>
    <path d="M110 92C92 70 70 50 40 38C52 62 80 84 110 96Z" fill="url(#nm-leaf2)"/>
    <path d="M110 92C106 66 104 40 110 10C116 40 114 66 110 92Z" fill="url(#nm-leaf)"/>
    <path d="M110 92C128 70 150 50 180 38C168 62 140 84 110 96Z" fill="url(#nm-leaf2)"/>
    <path d="M110 92C134 78 166 70 198 74C176 90 142 98 110 96Z" fill="url(#nm-leaf)"/>
  </g>
  <g fill="none" stroke="#A9D37C" stroke-width=".9" opacity=".7">
    <path d="M108 94C80 84 52 78 30 76"/><path d="M108 94C90 76 70 58 46 44"/><path d="M110 90V18"/><path d="M112 94C130 76 150 58 174 44"/><path d="M112 94C140 84 168 78 190 76"/>
  </g>
  <!-- coconut in red cloth -->
  <path d="M110 34C128 34 138 52 138 70C138 84 126 92 110 92C94 92 82 84 82 70C82 52 92 34 110 34Z" fill="url(#nm-coco)"/>
  <path d="M100 42C96 52 94 62 95 74M110 38V84M120 42C124 52 126 62 125 74" fill="none" stroke="#3E2310" stroke-width="1.1" opacity=".55"/>
  <path d="M110 34C108 30 108 26 110 22C112 26 112 30 110 34Z" fill="#5A3416"/>
  <path d="M80 74C92 66 128 66 140 74L146 98H74Z" fill="#B3151F"/>
  <path d="M80 74C92 66 128 66 140 74" fill="none" stroke="url(#nm-gold-h)" stroke-width="3"/>
  <path d="M74 98L82 78M146 98L138 78" stroke="#7E0E16" stroke-width="1.4"/>
  <!-- rim and neck -->
  <ellipse cx="110" cy="100" rx="46" ry="9" fill="url(#nm-brass)"/>
  <ellipse cx="110" cy="98" rx="40" ry="5.5" fill="#6B430E"/>
  <path d="M84 106C84 116 88 122 90 128H130C132 122 136 116 136 106Z" fill="url(#nm-brass)"/>
  <path d="M86 112H134M87 116H133M88 120H132" stroke-width="2.2" fill="none" stroke="#C8151F"/>
  <path d="M86.5 114H133.5M87.5 118H132.5" stroke-width="1.2" fill="none" stroke="#F2C230"/>
  <!-- body -->
  <path d="M90 128C58 134 40 160 40 190C40 228 70 254 110 254C150 254 180 228 180 190C180 160 162 134 130 128Z" fill="url(#nm-brass)"/>
  <path d="M62 160C54 176 54 204 64 222" fill="none" stroke="#FFF4CF" stroke-width="5" stroke-linecap="round" opacity=".45"/>
  <path d="M44 172C80 182 140 182 176 172" fill="none" stroke="#6B430E" stroke-width="1.6" opacity=".55"/>
  <path d="M42 208C80 220 140 220 178 208" fill="none" stroke="#6B430E" stroke-width="1.6" opacity=".45"/>
  <!-- sindoor swastika on the belly -->
  <g transform="translate(110 194) scale(.34)" fill="none" stroke="#B3151F" stroke-width="9" stroke-linecap="square">
    <path d="M0 -40V40M-40 0H40M0 -40H34M40 0V34M0 40H-34M-40 0V-34"/>
  </g>
  <g transform="translate(110 194) scale(.34)" fill="#B3151F"><circle cx="-18" cy="-18" r="6"/><circle cx="18" cy="-18" r="6"/><circle cx="-18" cy="18" r="6"/><circle cx="18" cy="18" r="6"/></g>
  <!-- foot -->
  <path d="M86 252C86 262 80 270 74 274H146C140 270 134 262 134 252Z" fill="url(#nm-brass)"/>
  <ellipse cx="110" cy="276" rx="44" ry="7" fill="url(#nm-brass)"/>
  <ellipse cx="110" cy="283" rx="58" ry="6" fill="#000" opacity=".22"/>
</svg>`;

// ───────────────────────── Diyo ─────────────────────────
/** A brass oil lamp (diyo) on a short stand, with a living flame. */
export const diyoSVG = (cls = '') => `<svg class="nm-diyo-svg ${cls}" viewBox="0 0 120 150" aria-hidden="true" focusable="false">
  <circle class="nm-diyo__glow" cx="60" cy="40" r="40" fill="url(#nm-glow)"/>
  <g class="nm-diyo__flame"><path d="M60 14C67 28 72 40 70 50C68 58 64 62 60 62C56 62 52 58 50 50C48 40 53 28 60 14Z" fill="url(#nm-flame)"/>
  <path d="M60 36C63 44 64 50 62 56C61 59 59 59 58 56C56 50 57 44 60 36Z" fill="#FFFDF2" opacity=".9"/></g>
  <path d="M58 62H62V68H58Z" fill="#3E2310"/>
  <path d="M14 66C18 64 30 66 40 68H80C92 66 104 62 108 60C106 72 96 84 78 88H42C26 86 16 78 14 66Z" fill="url(#nm-brass)"/>
  <path d="M28 70H92C88 76 80 80 72 80H46C38 80 32 76 28 70Z" fill="#5A370A" opacity=".55"/>
  <path d="M54 88H66L68 104H52Z" fill="url(#nm-brass)"/>
  <ellipse cx="60" cy="106" rx="14" ry="4" fill="url(#nm-brass)"/>
  <path d="M50 108C50 118 44 126 34 130H86C76 126 70 118 70 108Z" fill="url(#nm-brass)"/>
  <ellipse cx="60" cy="131" rx="28" ry="5.5" fill="url(#nm-brass)"/>
  <ellipse cx="60" cy="138" rx="36" ry="4" fill="#000" opacity=".2"/>
</svg>`;

/** Gold corner flourish for panel borders (top-left; rotate for the others). */
export const cornerSVG = (cls = '') => `<svg class="nm-corner ${cls}" viewBox="0 0 60 60" aria-hidden="true" focusable="false">
  <path d="M4 56V18C4 10 10 4 18 4H56" fill="none" stroke="url(#nm-gold)" stroke-width="2"/>
  <path d="M10 56V22C10 15 15 10 22 10H56" fill="none" stroke="#B88A2E" stroke-width=".8"/>
  <path d="M18 18C26 14 32 18 30 26C28 32 20 30 22 24C23 21 27 21 27 24" fill="none" stroke="url(#nm-gold)" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="18" cy="18" r="2.4" fill="url(#nm-gold)"/>
</svg>`;
