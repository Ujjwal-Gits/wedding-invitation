// Jhyal's pieces, shared by its own page (main.js) and by its gate and hero modules (gate.js, hero.js), which can run
// on another theme's page (docs/MIX.md). The markup builders take `own`: the theme's own page keeps its ids; a module
// gets none (the ids belong to the page it is on) and finds its parts by class.
import { bi, esc } from '../../core/i18n.js';
import { photoUrl } from '../../photos.js';
import credits from '../../generated/credits.json';
import { DEFS, windowGeom, windowSVG, shutterSVG, shutterRows, diyoSVG, dividerSVG, lotusNode, petalSVG } from './art.js';

export const DECOR = '/themes/jhyal/decor/';

/** The carved windows' gradients and lattice pattern (ids prefixed jh-), once per page. */
export function ensureDefs() {
  if (!document.getElementById('jh-wv')) document.body.insertAdjacentHTML('afterbegin', DEFS);
}

/** "-", "none" or "off" in a text slot turns that element off. */
export const isOff = (v) => !v || /^\s*(-|–|none|off|no|hide)\s*$/i.test(v);
export const on = (o) => !isOff(o.en) || !isOff(o.ne);

// ───────────────────────── Photo helpers ─────────────────────────
const dims = Object.fromEntries(credits.map((k) => [String(k.file || k.slot).replace(/\.(jpe?g|png|webp)$/i, ''), [k.width, k.height]]));
export const isUrl = (s) => typeof s === 'string' && (s.startsWith('/') || s.startsWith('https://'));
export const keyOf = (ref) => (typeof ref === 'string' ? ref : ref && typeof ref === 'object' ? ref.lg || ref.sm || '' : '');
export const aspectOf = (ref) => {
  if (typeof ref === 'string' && dims[ref]?.[0]) return dims[ref][0] / dims[ref][1];
  if (ref && typeof ref === 'object' && ref.w && ref.h) return ref.w / ref.h;
  return 0;
};
export const imgTag = (ref, alt, sizes, { eager = false, cls = '' } = {}) => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  const ar = aspectOf(ref);
  return `<img class="${cls}" src="${esc(sm)}" ${sm !== lg ? `srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w"` : ''} sizes="${sizes}" alt="${esc(alt || '')}" ${ar ? `width="${Math.round(ar * 1000)}" height="1000"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
};

export const names = (c, cls = 'jh-n') => `<span class="${cls}">${bi(c.bride.name)}</span> <span class="${cls}"><span class="jh-amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span> ${bi(c.groom.name)}</span>`;

// ───────────────────────── The carved windows ─────────────────────────
export const pct = (v, t) => `${((v / t) * 100).toFixed(3)}%`;
/** Absolute box (left/top/width/height, in % of the window) of a region in viewBox units. */
export const boxOf = (G, x, y, w, h) => `left:${pct(x, G.TW)};top:${pct(y, G.H)};width:${pct(w, G.TW)};height:${pct(h, G.H)}`;

// The gate window: an opening of 544 × 594 behind two lattice shutters.
export const GG = windowGeom({ ow: 544, oh: 594 });
const SW = GG.ow / 2;
const ROWS = shutterRows(GG.oh);
const toranBox = boxOf(GG, GG.WING * 0.28, GG.yL + 1, GG.TW - GG.WING * 0.56, (GG.TW - GG.WING * 0.56) * (235 / 1708));
export const DIYO = 84; // diyo width in window units
const gateDiyo = (k) => `<div class="jh-gdiyo jh-gdiyo--${k}" data-hindu style="${boxOf(GG, k === 'l' ? GG.WING * 0.5 - DIYO / 2 : GG.TW - GG.WING * 0.5 - DIYO / 2, GG.yS - DIYO * 1.1 + 2, DIYO, DIYO * 1.1)}"><i class="jh-halo"></i>${diyoSVG()}</div>`;

/** A carved window built around a photograph at its own shape: the photograph is never cropped. */
export function photoWindow(ref, alt, sizes, { eager = false, cls = '' } = {}) {
  const ar = aspectOf(ref) || 0.75;
  const ow = 544; const oh = Math.round(ow / Math.min(1.9, Math.max(0.5, ar)));
  const G = windowGeom({ ow, oh, torana: true, apron: false });
  return `<figure class="jh-pwin ${cls}" style="--war:${(G.TW / G.H).toFixed(4)}" data-ar="${ar.toFixed(4)}">
    <span class="jh-pwin__ph" style="${boxOf(G, G.ox, G.oy, G.ow, G.oh)}">${imgTag(ref, alt, sizes, { eager })}</span>
    <span class="jh-pwin__art">${windowSVG(G)}</span>
  </figure>`;
}
/** Photo windows whose shape was unknown (no stored size): rebuild around the real shape once loaded. */
export function fixPhotoWindows(root = document) {
  root.querySelectorAll('.jh-pwin').forEach((fig) => {
    const im = fig.querySelector('img');
    const fix = () => {
      const ar = im.naturalWidth / im.naturalHeight;
      if (!ar || Math.abs(ar - Number(fig.dataset.ar)) < 0.01) return;
      const ow = 544; const oh = Math.round(ow / Math.min(1.9, Math.max(0.5, ar)));
      const G = windowGeom({ ow, oh, torana: true, apron: false });
      fig.dataset.ar = ar.toFixed(4);
      fig.style.setProperty('--war', (G.TW / G.H).toFixed(4));
      fig.querySelector('.jh-pwin__ph').style.cssText = boxOf(G, G.ox, G.oy, G.ow, G.oh);
      fig.querySelector('.jh-pwin__art').innerHTML = windowSVG(G);
    };
    if (im.complete) fix(); else im.addEventListener('load', fix, { once: true });
  });
}

// ───────────────────────── The gate: one carved window, shutters closed ─────────────────────────
/** p = { c, txt }. Own page: its ids; a module: buttons for mix, the line and buttons marked [data-mx-ui]. */
export function gateHtml({ c, txt }, own = true) {
  const id = (v) => (own ? ` id="${v}"` : '');
  return `
  <div class="jh-gate${own ? '' : ' jh-gate--mx'}"${id('gate')} role="region" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}: an invitation`)}">
    <p class="jh-gate__line"${id('gline')}${own ? '' : ' data-mx-ui'}>${bi(txt('gate.line'))}</p>
    <div class="jh-stage"${id('stage')}>
      <div class="jh-room"${id('room')} style="${boxOf(GG, GG.ox, GG.oy, GG.ow, GG.oh)}">
        <i class="jh-room__light"${id('light')}></i>
        <p class="jh-room__names"${id('rnames')} style="top:${pct(ROWS.lt, GG.oh)};height:${pct(ROWS.lb - ROWS.lt, GG.oh)}">
          <span class="jh-rn">${bi(c.bride.name)}</span><span class="jh-rn jh-rn--amp" aria-hidden="true">&amp;</span><span class="jh-rn">${bi(c.groom.name)}</span>
        </p>
      </div>
      <div class="jh-win"${id('win')} aria-hidden="true">${windowSVG(GG)}</div>
      <div class="jh-shutters"${id('shutters')} style="${boxOf(GG, GG.ox, GG.oy, GG.ow, GG.oh)}" aria-hidden="true">
        <div class="jh-sh jh-sh--l"${id('shL')}>${shutterSVG('l', SW, GG.oh)}<i class="jh-sh__shade"></i></div>
        <div class="jh-sh jh-sh--r"${id('shR')}>${shutterSVG('r', SW, GG.oh)}<i class="jh-sh__shade"></i></div>
      </div>
      <img class="jh-toran"${id('toran')} style="${toranBox}" src="${DECOR}toran-sm.webp" srcset="${DECOR}toran-sm.webp 800w, ${DECOR}toran.webp 1708w" sizes="(max-width: 700px) 100vw, 760px" alt="" aria-hidden="true" decoding="async" fetchpriority="high" />
      <div class="jh-gdiyos" aria-hidden="true">${gateDiyo('l')}${gateDiyo('r')}</div>
    </div>
    <div class="jh-gate__ctl"${id('gctl')}${own ? '' : ' data-mx-ui'}>
      <button class="jh-open" ${own ? 'id="open"' : 'data-mx-open'} type="button" disabled><span class="jh-open__orn" aria-hidden="true">${lotusNode(18)}</span><span>${bi(txt('gate.open'))}</span></button>
      <button class="jh-quiet" ${own ? 'id="quiet"' : 'data-mx-quiet'} type="button" disabled>${bi(txt('gate.quiet'))}</button>
    </div>
  </div>`;
}
/** The gate's moving parts, found by class (the same on the theme's page and in a module). */
export const gateRefs = (gate) => {
  const q = (s) => gate.querySelector(s);
  return { gate, stage: q('.jh-stage'), shutters: q('.jh-shutters'), shL: q('.jh-sh--l'), shR: q('.jh-sh--r'), gline: q('.jh-gate__line'), gctl: q('.jh-gate__ctl'), rnames: q('.jh-room__names'), light: q('.jh-room__light'), fall: null };
};

/** The window: sized from the width AND the height of the screen. Returns the layout. */
export function layoutGate(R) {
  const W = document.documentElement.clientWidth;
  const H = window.innerHeight;
  const phone = W < 700;
  const cs = getComputedStyle(R.gate);
  const padT = parseFloat(cs.paddingTop) || 0;
  const padB = parseFloat(cs.paddingBottom) || 0;
  const gap = parseFloat(cs.rowGap) || 0;
  const availH = H - padT - padB - R.gline.offsetHeight - R.gctl.offsetHeight - gap * 2;
  const availW = W - (phone ? 14 : 64);
  const s = Math.max(0.12, Math.min(availW / GG.TW, availH / GG.H, 1.02));
  const w = Math.round(GG.TW * s);
  const h = Math.round(GG.H * s);
  Object.assign(R.stage.style, { width: `${w}px`, height: `${h}px` });
  R.stage.style.setProperty('--s', s.toFixed(4));
  R.shutters.style.perspective = `${Math.round(w * 2.4)}px`;
  // the names behind the lattice: as large as the lattice allows
  R.rnames.style.setProperty('--rn', '1');
  const lw = GG.ow * s * 0.84;
  let k = 1;
  for (let n = 0; n < 12; n++) {
    const wide = [...R.rnames.querySelectorAll('.jh-rn')].some((el) => el.scrollWidth > lw);
    const tall = R.rnames.scrollHeight > R.rnames.clientHeight + 1;
    if (!wide && !tall) break;
    k *= 0.92;
    R.rnames.style.setProperty('--rn', k.toFixed(3));
  }
  return { W, H, s, w, h, phone };
}

/** A light morning drift of petals over the closed window (CSS loops, paused while the tab is hidden). */
export function petalFall(gate) {
  const box = document.createElement('div');
  box.className = 'jh-fall';
  box.setAttribute('aria-hidden', 'true');
  const phone = document.documentElement.clientWidth < 700;
  const n = phone ? 4 : 7;
  const r = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < n; i++) {
    const kind = i % 3 === 2 ? 'rose' : 'marigold';
    const size = Math.round((phone ? 13 : 17) * r(0.8, 1.2));
    const fall = r(phone ? 15 : 17, phone ? 21 : 26);
    const sway = r(3.4, 5.4);
    const p = document.createElement('i');
    p.className = 'jh-fall__p';
    p.style.cssText = `left:${(((i + r(0.15, 0.85)) / n) * 100).toFixed(1)}%;--dur:${fall.toFixed(1)}s;--del:${(-r(0, fall)).toFixed(1)}s;--dx:${Math.round(r(-50, 50))}px;--sdur:${sway.toFixed(1)}s;--sdel:${(-r(0, sway)).toFixed(1)}s;--sw:${Math.round(r(10, 24))}px;--r0:${Math.round(r(-40, 40))}deg`;
    p.innerHTML = `<span>${petalSVG(kind, size)}</span>`;
    box.append(p);
  }
  gate.append(box);
  const vis = () => box.classList.toggle('is-off', document.hidden);
  document.addEventListener('visibilitychange', vis);
  box.stop = () => document.removeEventListener('visibilitychange', vis);
  return box;
}

/** A cubic-bezier easing (x1, y1, x2, y2), solved by bisection. */
const bezier = (x1, y1, x2, y2) => {
  const bz = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    let lo = 0; let hi = 1; let t = x;
    for (let i = 0; i < 22; i++) { t = (lo + hi) / 2; if (bz(t, x1, x2) < x) lo = t; else hi = t; }
    return bz(t, y1, y2);
  };
};
// The shutters: a small give, then a smooth swing that settles softly (no bounce).
const easeSwing = bezier(0.55, 0.05, 0.18, 1);
// Moving through: an unhurried start, a long glide.
const easeThrough = bezier(0.5, 0, 0.2, 1);

/** Petals carried in on the morning light: from the opening toward the guest, drifting down. */
function petalsIn(gsap, stage, L) {
  const box = document.createElement('div');
  box.className = 'jh-petals';
  box.setAttribute('aria-hidden', 'true');
  const r = stage.getBoundingClientRect();
  const ox = r.left + (GG.ox / GG.TW) * r.width; const oy = r.top + (GG.oy / GG.H) * r.height;
  const ow = (GG.ow / GG.TW) * r.width; const oh = (GG.oh / GG.H) * r.height;
  const n = L.phone ? 7 : 11;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    const size = Math.round((L.phone ? 20 : 26) * (0.8 + Math.random() * 0.45));
    p.innerHTML = petalSVG(i % 4 === 3 ? 'rose' : 'marigold', size);
    p.style.left = `${Math.round(ox + ow * (0.18 + Math.random() * 0.64))}px`;
    p.style.top = `${Math.round(oy + oh * (0.15 + Math.random() * 0.4))}px`;
    box.append(p);
    gsap.fromTo(p, { scale: 0.45, x: 0, y: 0, rotation: Math.random() * 180, opacity: 0 }, {
      keyframes: { opacity: [0, 1, 1, 0] },
      scale: 1.5 + Math.random() * 0.7,
      x: (Math.random() - 0.5) * L.W * 0.5, y: L.H * (0.28 + Math.random() * 0.3), rotation: `+=${140 + Math.random() * 200}`,
      duration: 2.6 + Math.random() * 1, delay: 0.1 + Math.random() * 0.7, ease: 'sine.inOut',
    });
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 5200);
}

/** The scale (about the opening's centre) at which the opening covers the whole screen. */
function throughScale(stage, L) {
  const r = stage.getBoundingClientRect();
  const x0 = r.left + (GG.ox / GG.TW) * r.width; const y0 = r.top + (GG.oy / GG.H) * r.height;
  const x1 = x0 + (GG.ow / GG.TW) * r.width; const y1 = y0 + (GG.oh / GG.H) * r.height;
  const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2;
  const sx = Math.max(cx / (cx - x0), (L.W - cx) / (x1 - cx));
  const sy = Math.max(cy / (cy - y0), (L.H - cy) / (y1 - cy));
  return { s: Math.max(sx, sy) * 1.06, ox: cx - r.left, oy: cy - r.top };
}

/**
 * The signature: the latch gives, the two shutters swing outward toward the guest, morning light fills the opening,
 * petals drift in, and the view moves gently through the window as the paper veil lifts. Returns { end }.
 */
export function windowOpen(gsap, tl, R, L) {
  const SWING = 1.2;
  const THROUGH_AT = SWING + 0.05;
  const THROUGH = L.phone ? 1.35 : 1.45;
  const end = THROUGH_AT + THROUGH;
  const T0 = throughScale(R.stage, L);
  R.stage.style.transformOrigin = `${T0.ox.toFixed(1)}px ${T0.oy.toFixed(1)}px`;
  tl.to(R.fall, { autoAlpha: 0, duration: 0.4 }, 0)
    // the latch gives, then the two shutters swing outward toward the guest
    .to(R.shL, { rotationY: -5, duration: 0.22, ease: 'power2.out' }, 0.08)
    .to(R.shR, { rotationY: 5, duration: 0.22, ease: 'power2.out' }, 0.08)
    .to(R.shL, { rotationY: -104, duration: SWING - 0.2, ease: easeSwing }, 0.3)
    .to(R.shR, { rotationY: 104, duration: SWING - 0.2, ease: easeSwing }, 0.3)
    .to(R.gate.querySelectorAll('.jh-sh__shade'), { opacity: 0.55, duration: SWING - 0.2, ease: 'power1.in' }, 0.3)
    // morning light fills the opening; the names come clear, then give way to the page
    .to(R.light, { opacity: 1, duration: 0.9, ease: 'power1.out' }, 0.35)
    .to(R.rnames, { opacity: 0, duration: 0.5, ease: 'power1.inOut' }, THROUGH_AT - 0.2)
    .add(() => petalsIn(gsap, R.stage, L), 0.5)
    // and the view moves gently through the window
    .fromTo(R.stage, { scale: 1 }, { scale: T0.s, duration: THROUGH, ease: easeThrough }, THROUGH_AT)
    .to(R.stage, { opacity: 0, duration: 0.5, ease: 'power1.in' }, end - 0.55)
    .to(R.gate, { '--veil': 0, duration: 0.6, ease: 'power1.inOut' }, end - 0.75);
  return { end };
}

// ───────────────────────── The first screen: शुभ विवाह and the couple in a carved window ─────────────────────────
/** p = { c, txt, lead }. Own page: the section with its ids and cue; a module: the inner block. */
export function heroHtml({ c, txt, lead }, own = true) {
  const invocation = txt('hero.invocation');
  const title = txt('hero.title');
  const blessing = txt('hero.blessing');
  const tag = own ? 'section' : 'div';
  return `
  <${tag} class="jh-hero"${own ? ' id="top" aria-labelledby="hero-title"' : ''}>
    <div class="jh-hero__text"${own ? ' id="htext"' : ''}>
      ${on(invocation) ? `<p class="jh-invoke jh-in" lang="ne">${esc(invocation.ne || invocation.en)}</p>` : ''}
      <h1 class="jh-title jh-in"${own ? ' id="hero-title"' : ''}><span class="jh-title__ne" lang="ne">${esc(title.ne)}</span><span class="sr-only l-en"> (${esc(title.en)})</span></h1>
      <span class="jh-hero__div jh-in">${dividerSVG(150)}</span>
      <p class="jh-names jh-in">${names(c)}</p>
      ${on(blessing) ? `<p class="jh-bless jh-in">${bi(blessing)}</p>` : ''}
    </div>
    ${lead ? `<div class="jh-hero__photo jh-in">${photoWindow(lead.photo, lead.alt, '(max-width: 760px) 86vw, 520px', { eager: true, cls: 'jh-pwin--hero' })}</div>` : ''}
    ${own ? `<a class="jh-cue jh-in" id="cue" href="#date"><span>${bi({ en: 'Scroll', ne: 'तल हेर्नुहोस्' })}</span><i aria-hidden="true"></i></a>` : ''}
  </${tag}>`;
}
/** The first screen's words and window, in the order they come in. */
export const heroGroups = (hero) => {
  const g = (sel) => [...hero.querySelectorAll(sel)];
  return [g('.jh-invoke'), g('.jh-title'), g('.jh-hero__div, .jh-names'), g('.jh-bless'), g('.jh-hero__photo'), g('.jh-cue')].filter((a) => a.length);
};
