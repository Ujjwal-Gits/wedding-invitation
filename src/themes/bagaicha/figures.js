// Paper-cut couple: hand-drawn vector silhouettes in Nepali wedding dress,
// layered like cut card with soft shadows between layers. Faceless by design.
// Groom: daura suruwal, waistcoat, Dhaka topi, marigold mala, red tika.
// Bride: red sari with gold zari border, ghumto over the head, tilhari, chura.
// The couple hold hands. Drawn once per walk frame, front and back, then
// rasterised to canvas textures for billboards in the garden.

const C = {
  sari: '#A11D30', sariDeep: '#861626', sariLight: '#B42638', blouse: '#741222',
  gold: '#C9A04E', goldLight: '#E6C67C', goldDeep: '#A47E36',
  skin: '#A06947', skinDeep: '#8A573A', henna: '#8E4A2E', hair: '#211715',
  daura: '#F1E8D6', dauraShade: '#DCCFB6', dauraDeep: '#C9BB9E',
  coat: '#26303E', coatDeep: '#1C2430', blush: '#E2B3A8',
  mari: '#E79A27', mariLight: '#F4C24F', mariDeep: '#C9721A',
  green: '#3E6E3B', greenLight: '#6E9C55', shoe: '#1B1716', tika: '#C3122B',
};

const dots = (d, color, w, gap, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="0 ${gap}" ${extra}/>`;

const defs = `
<defs>
  <filter id="ds" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="2.2" stdDeviation="2" flood-color="#2a120a" flood-opacity="0.38"/>
  </filter>
  <filter id="ds2" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="3.5" stdDeviation="3.2" flood-color="#2a120a" flood-opacity="0.42"/>
  </filter>
  <filter id="paper" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n"/>
    <feColorMatrix in="n" type="saturate" values="0" result="g"/>
    <feComponentTransfer in="g" result="g2"><feFuncR type="linear" slope="0.16" intercept="0.86"/><feFuncG type="linear" slope="0.16" intercept="0.86"/><feFuncB type="linear" slope="0.16" intercept="0.86"/></feComponentTransfer>
    <feBlend in="SourceGraphic" in2="g2" mode="multiply" result="m"/>
    <feComposite in="m" in2="SourceGraphic" operator="in"/>
  </filter>
  <pattern id="dhaka" width="16" height="12" patternUnits="userSpaceOnUse">
    <rect width="16" height="12" fill="#1E1A20"/>
    <path d="M8 1 L13 6 L8 11 L3 6Z" fill="#B3263A"/>
    <path d="M8 3.6 L10.4 6 L8 8.4 L5.6 6Z" fill="#F1E6CF"/>
    <path d="M0 0 L2 0 L0 2Z M16 0 L14 0 L16 2Z M0 12 L2 12 L0 10Z M16 12 L14 12 L16 10Z" fill="#E09A2D"/>
    <rect x="0" y="5.4" width="1.4" height="1.2" fill="#2E6B4A"/><rect x="14.6" y="5.4" width="1.4" height="1.2" fill="#2E6B4A"/>
  </pattern>
  <pattern id="butta" width="26" height="30" patternUnits="userSpaceOnUse">
    <circle cx="6" cy="7" r="1.7" fill="${C.goldLight}" opacity="0.8"/>
    <circle cx="19" cy="22" r="1.7" fill="${C.goldLight}" opacity="0.8"/>
  </pattern>
  <pattern id="henna" width="7" height="7" patternUnits="userSpaceOnUse">
    <rect width="7" height="7" fill="${C.henna}"/><circle cx="3.5" cy="3.5" r="1.1" fill="#6B2F1C"/>
  </pattern>
</defs>`;

// ───────────────────────── Groom ─────────────────────────
// Local coordinates: x = 0 is his centre line, the hand that holds hers is on +x.
function groom(view, frame) {
  const back = view === 'back';
  const lift = [0, 1, 0, -1][frame]; // +1 left leg lifted, -1 right leg lifted
  const leg = (side, up) => {
    const s = side; // -1 left (viewer), +1 right
    const dy = up ? -15 : 0;
    const k = up ? 5 * s : 0; // knee forward = inward shift
    return `<g transform="translate(0 ${dy})">
      <path d="M${s * 3} 690 C${s * 3} 772 ${s * 9 + k} 862 ${s * 11} 944 L${s * 29} 944 C${s * 33} 862 ${s * 41 + k} 772 ${s * 43} 690 Z" fill="${C.dauraShade}"/>
      <path d="M${s * 9} 900 L${s * 29} 900" stroke="${C.dauraDeep}" stroke-width="1.4"/>
      <path d="M${s * 8} 942 C${s * 5} 958 ${s * 6} ${up ? 966 : 972} ${s * 14} ${up ? 970 : 976} L${s * 33} ${up ? 970 : 976} C${s * 40} ${up ? 966 : 970} ${s * 36} 952 ${s * 30} 942 Z" fill="${C.shoe}"/>
    </g>`;
  };
  const legs = leg(-1, lift === 1) + leg(1, lift === -1);

  // Arms: the far (hanging) arm on -x, the holding arm reaching to +x.
  const armHang = `
    <path d="M-80 232 C-96 252 -102 300 -102 352 C-102 400 -98 452 -95 500 C-94 514 -93 526 -93 534 L-71 536 C-71 520 -73 500 -75 470 C-77 420 -76 370 -72 320 C-70 290 -66 262 -60 250 Z" fill="${C.daura}"/>
    <path d="M-94 520 L-71 522 L-71 540 L-93 538 Z" fill="${C.dauraDeep}"/>
    <ellipse cx="-82" cy="557" rx="11" ry="17" fill="${C.skin}"/>`;
  const armHold = `
    <path d="M70 236 C92 252 104 296 108 350 C112 404 120 458 134 512 L112 524 C99 474 90 420 84 372 C80 336 74 300 62 262 Z" fill="${C.daura}"/>
    <path d="M111 510 L133 501 L138 518 L115 528 Z" fill="${C.dauraDeep}"/>
    <ellipse cx="138" cy="544" rx="11" ry="17" transform="rotate(-26 138 544)" fill="${C.skin}"/>`;

  const skirt = `
    <path d="M-66 436 C-71 520 -79 620 -86 718 Q0 732 86 718 C79 620 71 520 66 436 Z" fill="${C.daura}"/>
    <path d="M32 436 L66 436 C71 520 79 620 86 718 Q66 724 48 726 Z" fill="${C.dauraShade}" opacity="0.8"/>`;
  const torso = `<path d="M-22 194 C-46 200 -70 206 -82 226 C-88 240 -86 260 -84 280 L-76 446 L76 446 L84 280 C86 260 88 240 82 226 C70 206 46 200 22 194 Z" fill="${C.daura}"/>`;
  const neck = `<path d="M-14 176 L14 176 L15 212 L-15 212 Z" fill="${C.skinDeep}"/>`;
  const collar = `<path d="M-19 196 Q0 205 19 196 L19 208 Q0 217 -19 208 Z" fill="${C.dauraShade}"/>`;

  const coatFront = `
    <path d="M-15 204 L-66 216 C-80 228 -82 254 -78 286 C-74 330 -68 380 -70 420 L-74 478 Q0 492 74 478 L70 420 C68 380 74 330 78 286 C82 254 80 228 66 216 L15 204 L2 306 L-2 306 Z" fill="${C.coat}"/>
    <path d="M2 306 L4 482" stroke="${C.coatDeep}" stroke-width="2"/>
    ${[328, 366, 404, 442].map((y) => `<circle cx="-4" cy="${y}" r="3.6" fill="${C.gold}"/>`).join('')}
    <path d="M-62 418 L-34 414 M34 414 L62 418" stroke="${C.coatDeep}" stroke-width="3" stroke-linecap="round"/>
    <path d="M38 268 L60 262 L56 276 Z" fill="${C.blush}"/>
    <path d="M36 276 L62 270" stroke="${C.coatDeep}" stroke-width="3" stroke-linecap="round"/>`;
  const coatBack = `
    <path d="M-24 200 L-66 216 C-80 228 -82 254 -78 286 C-74 330 -68 380 -70 420 L-74 478 Q0 492 74 478 L70 420 C68 380 74 330 78 286 C82 254 80 228 66 216 L24 200 Q0 208 -24 200 Z" fill="${C.coat}"/>
    <path d="M0 214 L0 482" stroke="${C.coatDeep}" stroke-width="2"/>
    <path d="M-52 430 L52 430" stroke="${C.coatDeep}" stroke-width="5"/>`;

  // Daura front: the diagonal overlap and its tie strings (the eight ties are its signature).
  const dauraDetail = back ? '' : `
    <path d="M-60 444 C-40 520 28 560 52 716" fill="none" stroke="${C.dauraDeep}" stroke-width="2"/>
    ${[[28, 590], [42, 650]].map(([x, y]) => `<path d="M${x} ${y} l14 4 m-14 -4 l12 10" stroke="${C.dauraDeep}" stroke-width="2" stroke-linecap="round"/>`).join('')}`;

  const head = back
    ? `<ellipse cx="0" cy="140" rx="38" ry="48" fill="${C.hair}"/>
       <ellipse cx="-38" cy="146" rx="6" ry="12" fill="${C.skinDeep}"/><ellipse cx="38" cy="146" rx="6" ry="12" fill="${C.skinDeep}"/>`
    : `<ellipse cx="-38" cy="146" rx="6" ry="12" fill="${C.skinDeep}"/><ellipse cx="38" cy="146" rx="6" ry="12" fill="${C.skinDeep}"/>
       <ellipse cx="0" cy="140" rx="37" ry="48" fill="${C.skin}"/>
       <path d="M-37 110 C-38 124 -36 134 -33 140 L-30 112 Z M37 110 C38 124 36 134 33 140 L30 112 Z" fill="${C.hair}"/>
       <ellipse cx="0" cy="114" rx="4.2" ry="8" fill="${C.tika}"/>`;
  // Dhaka topi: brimless, the crown slanting up to one side.
  const topi = `
    <path d="M-41 104 L-39 56 C-30 47 24 36 41 38 L43 104 Q0 110 -41 104 Z" fill="url(#dhaka)"/>
    <path d="M-41 98 Q0 104 43 98 L43 104 Q0 110 -41 104 Z" fill="#141114"/>
    <path d="M-39 56 C-30 47 24 36 41 38" fill="none" stroke="#141114" stroke-width="2.5"/>`;

  // Marigold mala (jaimala) with a gold tassel.
  const mala = back
    ? dots('M-30 200 Q0 214 30 200', C.mari, 14, 11) + dots('M-30 200 Q0 214 30 200', C.mariLight, 7, 11)
    : `${dots('M-28 204 C-46 300 -34 420 0 474 C34 420 46 300 28 204', C.mariDeep, 15, 11)}
       ${dots('M-28 204 C-46 300 -34 420 0 474 C34 420 46 300 28 204', C.mari, 12, 11)}
       ${dots('M-27 206 C-44 300 -33 418 0 470 C33 418 44 300 27 206', C.mariLight, 5, 11)}
       <path d="M-6 474 L6 474 L9 506 L-9 506 Z" fill="${C.gold}"/>
       <path d="M-9 506 L-12 524 M-3 506 L-4 528 M3 506 L4 528 M9 506 L12 524" stroke="${C.goldLight}" stroke-width="2"/>`;

  return `
  <g filter="url(#ds)">${legs}</g>
  <g filter="url(#ds)">${skirt}</g>
  <g filter="url(#ds)">${torso}${neck}${collar}</g>
  <g filter="url(#ds)">${armHang}</g>
  <g filter="url(#ds)">${dauraDetail}</g>
  <g filter="url(#ds2)">${back ? coatBack : coatFront}</g>
  <g filter="url(#ds)">${armHold}</g>
  <g filter="url(#ds)">${head}</g>
  <g filter="url(#ds2)">${topi}</g>
  <g filter="url(#ds)">${mala}</g>`;
}

// ───────────────────────── Bride ─────────────────────────
// Local coordinates: x = 0 her centre line, the hand that holds his on -x.
function bride(view, frame) {
  const back = view === 'back';
  const sw = [0, 7, 0, -7][frame]; // hem sway while walking
  const hemL = -100 + sw;
  const hemR = 100 + sw;

  const BACKDRAPE = 'M0 98 C52 98 84 136 86 196 C90 290 98 400 106 548 C70 566 30 572 0 572 C-30 572 -70 566 -106 548 C-98 400 -90 290 -86 196 C-84 136 -52 98 0 98 Z';
  // Ghumto drape falling behind the shoulders (in back view it is the whole back).
  const drape = back
    ? `<path d="${BACKDRAPE}" fill="${C.sari}"/>
       <path d="${BACKDRAPE}" fill="url(#butta)"/>
       <path d="M-106 548 C-70 566 -30 572 0 572 C30 572 70 566 106 548" fill="none" stroke="${C.gold}" stroke-width="14"/>
       <path d="M-105 536 C-70 554 -30 560 0 560 C30 560 70 554 105 536" fill="none" stroke="${C.goldDeep}" stroke-width="1.6"/>
       ${dots('M-106 549 C-70 567 -30 573 0 573 C30 573 70 567 106 549', C.goldLight, 4, 9)}
       <path d="M92 200 C96 290 100 400 106 548" fill="none" stroke="${C.gold}" stroke-width="7"/>
       <path d="M-92 200 C-96 290 -100 400 -106 548" fill="none" stroke="${C.gold}" stroke-width="7"/>`
    : `<path d="M0 100 C52 100 80 140 84 200 C90 290 104 392 114 512 C88 526 66 522 50 514 L-50 514 C-66 522 -88 526 -114 512 C-104 392 -90 290 -84 200 C-80 140 -52 100 0 100 Z" fill="${C.sariDeep}"/>
       <path d="M84 200 C90 290 104 392 114 512" fill="none" stroke="${C.gold}" stroke-width="7"/>
       <path d="M-84 200 C-90 290 -104 392 -114 512" fill="none" stroke="${C.gold}" stroke-width="7"/>`;

  const skirt = `
    <path d="M-40 424 C-60 456 -68 494 -66 528 C-74 680 ${hemL + 6} 850 ${hemL} 972 Q${sw} 988 ${hemR} 972 C${hemR - 6} 850 74 680 66 528 C68 494 60 456 40 424 Z" fill="${C.sari}"/>
    <path d="M28 432 C54 520 ${72 + sw * 0.6} 760 ${hemR - 14} 974 L${hemR} 972 C${hemR - 6} 850 74 680 66 528 C68 494 60 456 40 424 Z" fill="${C.sariDeep}" opacity="0.9"/>
    <path d="M${hemL + 2} 946 Q${sw} 962 ${hemR - 2} 946 L${hemR} 972 Q${sw} 988 ${hemL} 972 Z" fill="${C.gold}"/>
    ${dots(`M${hemL + 4} 958 Q${sw} 974 ${hemR - 4} 958`, C.goldLight, 4, 10)}
    <path d="M${hemL + 2} 940 Q${sw} 956 ${hemR - 2} 940" fill="none" stroke="${C.goldDeep}" stroke-width="1.6"/>`;

  const pleats = back ? '' : `
    <path d="M-14 432 L14 432 L${42 + sw} 976 Q${sw} 984 ${-42 + sw} 976 Z" fill="${C.sariLight}"/>
    ${[-28, -14, 0, 14, 28].map((x) => `<path d="M${x * 0.3} 440 L${x + sw} 972" stroke="${C.sariDeep}" stroke-width="1.4"/>`).join('')}
    <path d="M${-42 + sw} 954 Q${sw} 962 ${42 + sw} 954 L${42 + sw} 976 Q${sw} 984 ${-42 + sw} 976 Z" fill="${C.goldLight}"/>`;

  const blouse = `<path d="M-18 236 C-36 242 -56 248 -64 264 C-70 288 -68 330 -64 360 L-44 434 L44 434 L64 360 C68 330 70 288 64 264 C56 248 36 242 18 236 Z" fill="${C.blouse}"/>`;

  // Arms: holding arm toward -x, the other relaxed on +x.
  const armHold = `
    <path d="M-57 262 C-75 280 -85 320 -87 372 L-70 378 C-67 334 -61 302 -49 282 Z" fill="${C.blouse}"/>
    <path d="M-86 366 C-94 426 -106 486 -121 538 L-105 546 C-92 490 -81 430 -70 374 Z" fill="${C.skin}"/>
    <path d="M-113 500 L-97 505 L-104 541 L-120 535 Z" fill="${C.tika}"/>
    <path d="M-113 512 L-98 517 M-116 524 L-101 529" stroke="${C.goldLight}" stroke-width="2"/>
    <ellipse cx="-126" cy="557" rx="10" ry="16" transform="rotate(24 -126 557)" fill="url(#henna)"/>`;
  const armRest = `
    <path d="M57 262 C75 280 84 320 86 372 L69 378 C66 334 60 302 49 282 Z" fill="${C.blouse}"/>
    <path d="M85 368 C90 428 94 486 96 536 L80 538 C78 490 74 432 69 376 Z" fill="${C.skin}"/>
    <path d="M80 502 L95 501 L96 534 L80 536 Z" fill="${C.tika}"/>
    <path d="M80 512 L95 511 M80 524 L96 523" stroke="${C.goldLight}" stroke-width="2"/>
    <ellipse cx="88" cy="554" rx="10" ry="16" fill="url(#henna)"/>`;

  // Pallu across the body from the waist to the shoulder, zari on both edges.
  const pallu = back ? '' : `
    <path d="M-58 432 C-24 380 26 316 56 250 L92 270 C80 336 40 424 -4 480 L-58 480 Z" fill="${C.sari}"/>
    <path d="M-58 432 C-24 380 26 316 56 250 L92 270 C80 336 40 424 -4 480 L-58 480 Z" fill="url(#butta)"/>
    <path d="M-58 432 C-24 380 26 316 56 250" fill="none" stroke="${C.gold}" stroke-width="7"/>
    <path d="M92 270 C80 336 40 424 -4 480" fill="none" stroke="${C.gold}" stroke-width="7"/>`;

  const neck = back ? '' : `<path d="M-12 206 L12 206 L13 246 L-13 246 Z" fill="${C.skinDeep}"/>`;
  const face = back ? '' : `<ellipse cx="0" cy="170" rx="32" ry="42" fill="${C.skin}"/><circle cx="0" cy="148" r="3.6" fill="${C.tika}"/>`;
  // Ghumto: the sari's end drawn over the head, framing the face.
  const hood = back
    ? `<path d="M-34 250 C-40 330 -44 430 -50 556 M30 244 C38 330 46 440 56 560 M-4 268 C-4 360 -2 460 2 570" fill="none" stroke="${C.sariDeep}" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
       <path d="M-60 120 C-30 104 30 104 60 120" fill="none" stroke="${C.sariLight}" stroke-width="5" stroke-linecap="round" opacity="0.6"/>`
    : `<path d="M-70 282 C-82 250 -84 214 -80 184 C-74 128 -42 100 0 100 C42 100 74 128 80 184 C84 214 82 250 70 282 L50 266 C42 252 37 236 35 214 C37 194 35 168 30 150 C24 132 12 124 0 124 C-12 124 -24 132 -30 150 C-35 168 -37 194 -35 214 C-37 236 -42 252 -50 266 Z" fill="${C.sari}"/>
       <path d="M-70 282 C-82 250 -84 214 -80 184 C-74 128 -42 100 0 100 C42 100 74 128 80 184 C84 214 82 250 70 282 L50 266 C42 252 37 236 35 214 C37 194 35 168 30 150 C24 132 12 124 0 124 C-12 124 -24 132 -30 150 C-35 168 -37 194 -35 214 C-37 236 -42 252 -50 266 Z" fill="url(#butta)"/>
       <path d="M50 266 C42 252 37 236 35 214 C37 194 35 168 30 150 C24 132 12 124 0 124 C-12 124 -24 132 -30 150 C-35 168 -37 194 -35 214 C-37 236 -42 252 -50 266" fill="none" stroke="${C.gold}" stroke-width="7"/>
       ${dots('M44 262 C38 248 33 232 31 214 C33 194 31 170 26 154 C20 138 10 131 0 131 C-10 131 -20 138 -26 154 C-31 170 -33 194 -31 214 C-33 232 -38 248 -44 262', C.goldLight, 3.4, 8)}
       <path d="M0 124 L0 136" stroke="${C.gold}" stroke-width="2.4"/><path d="M-5 136 L5 136 L0 146 Z" fill="${C.gold}"/>`;

  // Jewellery: gold choker, long rani haar and the green-bead tilhari with its gold pendant.
  const jewels = back ? '' : `
    ${dots('M-22 236 Q0 258 22 236', C.gold, 7, 7)}
    <path d="M-30 240 C-36 290 -16 316 0 318 C16 316 36 290 30 240" fill="none" stroke="${C.goldDeep}" stroke-width="3"/>
    ${dots('M-25 240 C-32 300 -14 344 0 352 C14 344 32 300 25 240', C.green, 6, 6.5)}
    ${dots('M-20 240 C-26 296 -10 338 0 346 C10 338 26 296 20 240', C.greenLight, 4.5, 6.5)}
    <rect x="-7.5" y="352" width="15" height="36" rx="7" fill="${C.gold}"/>
    <path d="M-7 362 L7 362 M-7 372 L7 372 M-7 380 L7 380" stroke="${C.goldDeep}" stroke-width="1.4"/>`;

  const tilt = 'rotate(-4 0 250)';
  if (back) {
    return `
  <g filter="url(#ds)">${skirt}</g>
  <g filter="url(#ds)">${blouse}</g>
  <g filter="url(#ds2)" transform="${tilt}">${drape}${hood}</g>
  <g filter="url(#ds)">${armRest}</g>
  <g filter="url(#ds)">${armHold}</g>`;
  }
  return `
  <g filter="url(#ds)" transform="${tilt}">${drape}</g>
  <g filter="url(#ds)">${skirt}</g>
  <g filter="url(#ds)">${pleats}</g>
  <g filter="url(#ds)">${neck}${blouse}</g>
  <g filter="url(#ds)">${armRest}</g>
  <g filter="url(#ds2)">${pallu}</g>
  <g filter="url(#ds)">${jewels}</g>
  <g filter="url(#ds)" transform="${tilt}">${face}</g>
  <g filter="url(#ds2)" transform="${tilt}">${hood}</g>
  <g filter="url(#ds)">${armHold}</g>`;
}

export const COUPLE_W = 800;
export const COUPLE_H = 1000;

/**
 * The couple holding hands. Front: groom on the viewer's left, bride on his
 * left (vamangi). Back: mirrored, as the guests see them walk to the pavilion.
 */
export function coupleSVG(view = 'front', frame = 0) {
  const back = view === 'back';
  const g = groom(view, frame);
  const b = bride(view, frame);
  // In the back view the couple are mirrored: the groom on the right, reaching left.
  const G = back ? `<g transform="translate(534 0) scale(-1 1)">${g}</g>` : `<g transform="translate(266 0)">${g}</g>`;
  const B = back ? `<g transform="translate(270 0) scale(-1 1)">${b}</g>` : `<g transform="translate(530 0)">${b}</g>`;
  // The hand-holding overlaps, so the bride's hand sits on top of his in both views.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${COUPLE_W}" height="${COUPLE_H}" viewBox="0 0 ${COUPLE_W} ${COUPLE_H}">${defs}
  <g filter="url(#paper)">${G}${B}</g></svg>`;
}

/** Rasterises every frame to canvases (front 0-3, back 0-3). */
export async function coupleCanvases(height = 960) {
  const w = Math.round((height * COUPLE_W) / COUPLE_H);
  const out = { front: [], back: [] };
  const jobs = [];
  for (const view of ['front', 'back']) {
    for (let f = 0; f < 4; f++) {
      const svg = coupleSVG(view, f);
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      jobs.push(new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = height;
          c.getContext('2d').drawImage(img, 0, 0, w, height);
          URL.revokeObjectURL(url);
          out[view][f] = c;
          resolve();
        };
        img.onerror = () => { URL.revokeObjectURL(url); out[view][f] = null; resolve(); };
        img.src = url;
      }));
    }
  }
  await Promise.all(jobs);
  return out;
}
