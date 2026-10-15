// Mahal (महल) · the parts drawn in code: the shared gold and velvet gradients, the red velvet curtains that frame the
// painted balcony (sized to the screen), and the falling petals. The gate, the bow and the balcony itself are
// paintings (decor/gate-*, bow, scene-*: Canva AI); main.js places them.

const f = (v) => Math.round(v * 10) / 10;

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
  const mr = tall ? Math.min(W * 0.25, H * 0.12) : H * 0.105;
  const my = tall ? H * 0.165 : H * 0.135;
  return { W, H, tall, cx: W / 2, hy: wl, ry, rh, fy, cw, jw, jh, jx: W / 2 - jw / 2, jy, wl, palTop: jy + jh * JAL.top, mx: W / 2, my, mr,
    ty: H * (tall ? 0.6 : 0.62), bot: fy + (H - fy) * (tall ? 0.16 : 0.24) };
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
