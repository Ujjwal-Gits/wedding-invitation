// Theme · Kalapi (कलापी) — "the one with the jewelled tail": the peacock that dances when the first rain clouds come.
// A Rajput-miniature monsoon evening painted on one long Nathdwara pichwai cloth, and the guest walks along it sideways.
//
// Opening (the one signature moment, with the cloth): a dark teal cloth, one peacock seen from behind with its train
// folded. Tap: the train lifts and 21 feathers rotate out from the tail root (centre first, 60 ms apart each side) into
// the full fan; the fan's centre is plain teal cloth ringed in gold and the names write themselves in there in gold.
// Then the fan lifts and shrinks into the crest on the cloth's top border, the names settle into the first screen, and
// the bird walks away into the dark.
// Scroll: the painted cloth (#pichwai) pins and vertical scroll moves it sideways (GSAP ScrollTrigger, scrubbed). Five
// folios joined by brocade seams: I the palace terrace in the rain (the invitation on an ivory cartouche), II the lotus
// pond with cows (the couple under a cusped arch), III a register of Ragamala-style miniatures (one per ceremony),
// IV a moonlit terrace (the countdown in the full moon), V the rain-cloud band. On wide screens, feathers along the top
// and bottom borders drift at 0.9x and 1.1x. A gold thread on the lower border shows how far along the cloth you are.
// After the cloth, vertical: the families as two facing red-bordered miniature panels, the date under a peacock-feather
// eye you scratch, a monsoon diary of photos tipped onto the cloth, the reply on an ivory cloth cartouche, the blessing.
// Engine: src/themes/_suite/suite.js (T.gate/open/page/scroll/scratch). All art: Canva AI (public/themes/kalapi/art).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mountSuite } from '../_suite/suite.js';
import manifest from './slots.js';
import { lamp, initNepali } from '../_suite/nepali.js';
import './kalapi.css';

ScrollTrigger.clearScrollMemory('manual');

const A = '/themes/kalapi/art/';
const N = 21; // feathers in the fan
const SPREAD = 105; // degrees either side of upright: the fan wraps round its eye, open only below where the bird stands
const angle = (i) => -SPREAD + (2 * SPREAD * i) / (N - 1);
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const L = {
  folio: [
    { en: 'The palace in the rain', ne: 'वर्षामा दरबार' },
    { en: 'The lotus pond', ne: 'कमल पोखरी' },
    { en: 'The celebrations', ne: 'कार्यक्रम' },
    { en: 'The full moon', ne: 'पूर्णिमा' },
    { en: 'The first rain', ne: 'पहिलो वर्षा' },
  ],
  famOf: { bride: { en: 'The bride’s family', ne: 'बेहुली पक्ष' }, groom: { en: 'The groom’s family', ne: 'बेहुला पक्ष' } },
  hosts: { en: 'With love,', ne: 'सादर,' },
  walk: { en: 'Walk along the cloth', ne: 'कपडामा हिँड्नुहोस्' },
  more: { en: 'Keep scrolling', ne: 'तल हेर्नुहोस्' },
};

// ───────── pictures ─────────
const SIZES = { pano: [1100, 1920], feather: [129, 223], peacock: [185, 317], lotus: [600, 1200] };
const art = (name, kind, sizes, { cls = '', eager = false } = {}) => {
  const [s, l] = SIZES[kind];
  return `<img class="${cls}" src="${A}${name}-sm.webp" srcset="${A}${name}-sm.webp ${s}w, ${A}${name}.webp ${l}w" sizes="${sizes}" alt="" ${eager ? '' : 'loading="lazy" '}decoding="async" />`;
};

/** the peacock's fan: 21 feathers on their roots and the plain teal eye of cloth, ringed in gold */
const fan = (cls, sizes) => `<span class="kp-fan ${cls}" aria-hidden="true">${Array.from({ length: N }, (_, i) => `<span class="kp-f" style="--a:${angle(i).toFixed(2)}deg">${art('feather', 'feather', sizes, { eager: true })}</span>`).join('')}<span class="kp-disc"></span></span>`;

/** the cusped (multifoil) arch of a Rajput jharokha, as a shape: ivory, a red band, a gold line inside */
const CUSP = 'M0 130V46C0 36 5 31 11 30C11 20 18 14 27 15C30 6 39 1 50 0C61 1 70 6 73 15C82 14 89 20 89 30C95 31 100 36 100 46V130Z';
const cusp = (cls = '') => `<svg class="kp-cusp ${cls}" viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="kp-cusp__fill" d="${CUSP}" vector-effect="non-scaling-stroke" /><path class="kp-cusp__gold" d="${CUSP}" transform="translate(4 4.4) scale(.92 .935)" vector-effect="non-scaling-stroke" /></svg>`;

/** a gold rule with a small feather eye in the middle */
const rule = (cls = '') => `<span class="kp-rule ${cls}" aria-hidden="true"><i></i><b></b><i></i></span>`;

/** a crop of one of the paintings, centred on (cx, cy) of the picture, `z` times the window's width */
const vignette = (n, cx, cy, z = 2.8, cls = '', flip = false) => `<span class="kp-vig ${cls}" aria-hidden="true" style="--cx:${cx};--cy:${cy};--z:${z}${flip ? ';--fx:-1' : ''}">${art(`pano-${n}`, 'pano', '(max-width: 760px) 900px, 1000px')}</span>`;
// a different painted detail for each ceremony's miniature (cycled)
const VIGS = [[1, 0.5, 0.6, 2.6], [2, 0.17, 0.66, 2.6], [5, 0.55, 0.64, 2.5], [4, 0.86, 0.52, 2.6], [1, 0.14, 0.52, 2.8], [2, 0.88, 0.36, 2.8], [4, 0.22, 0.86, 2.6], [5, 0.15, 0.3, 2.8]];

// ───────── the scratch cover: a peacock-feather eye ─────────
function paintEye(c, w, h, dpr, hint) {
  const cs = getComputedStyle(document.body);
  const teal = cs.getPropertyValue('--kp-teal').trim() || '#0F3D41';
  const cx = w / 2; const cy = h / 2; const R = Math.min(w, h) / 2;
  c.clearRect(0, 0, w, h);
  // the barbs: fine gold-green strands radiating from the eye
  c.save(); c.beginPath(); c.ellipse(cx, cy, R, R, 0, 0, Math.PI * 2); c.clip();
  const bg = c.createRadialGradient(cx, cy * 0.92, R * 0.2, cx, cy, R);
  bg.addColorStop(0, '#3E5A2A'); bg.addColorStop(0.6, '#2C4A2A'); bg.addColorStop(1, teal);
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 520; i++) {
    const a = Math.random() * Math.PI * 2; const r0 = R * (0.42 + Math.random() * 0.1); const r1 = R * (0.8 + Math.random() * 0.22);
    const bend = (Math.random() - 0.5) * 0.18;
    c.strokeStyle = Math.random() > 0.35 ? `rgba(${180 + Math.random() * 50},${170 + Math.random() * 40},${70 + Math.random() * 40},${0.25 + Math.random() * 0.35})` : 'rgba(40,90,60,.45)';
    c.lineWidth = (0.6 + Math.random() * 0.9) * dpr;
    c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 1.06);
    c.quadraticCurveTo(cx + Math.cos(a + bend) * (r0 + r1) / 2, cy + Math.sin(a + bend) * (r0 + r1) / 2 * 1.06, cx + Math.cos(a + bend * 2) * r1, cy + Math.sin(a + bend * 2) * r1 * 1.06);
    c.stroke();
  }
  // the eye: gold-green halo, bronze ring, teal ring, sapphire heart
  const ring = (rx, ry, oy, fill) => { c.fillStyle = fill; c.beginPath(); c.ellipse(cx, cy + oy, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
  const g1 = c.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 0.56); g1.addColorStop(0, '#C9A24A'); g1.addColorStop(1, '#8E8A3A');
  ring(R * 0.5, R * 0.58, 0, g1);
  const g2 = c.createRadialGradient(cx, cy - R * 0.05, R * 0.05, cx, cy, R * 0.44); g2.addColorStop(0, '#A8622A'); g2.addColorStop(1, '#6E3A18');
  ring(R * 0.4, R * 0.47, R * 0.02, g2);
  const g3 = c.createRadialGradient(cx, cy, R * 0.05, cx, cy, R * 0.32); g3.addColorStop(0, '#2FA39A'); g3.addColorStop(1, '#16706E');
  ring(R * 0.29, R * 0.34, R * 0.04, g3);
  const g4 = c.createRadialGradient(cx - R * 0.05, cy - R * 0.02, R * 0.02, cx, cy + R * 0.06, R * 0.24); g4.addColorStop(0, '#2A4FB8'); g4.addColorStop(1, '#0D1E5C');
  // the core: a deep sapphire kidney, its notch at the top, a soft sheen
  c.fillStyle = g4; c.beginPath();
  const hy = cy + R * 0.07; const rx = R * 0.165; const ry = R * 0.2;
  c.ellipse(cx, hy, rx * 0.92, ry * 0.95, 0, 0, Math.PI * 2);
  c.fill();
  const sh = c.createRadialGradient(cx - rx * 0.3, hy - ry * 0.25, 0, cx - rx * 0.3, hy - ry * 0.25, rx * 0.8); sh.addColorStop(0, 'rgba(120,160,255,.35)'); sh.addColorStop(1, 'rgba(120,160,255,0)');
  c.fillStyle = sh; c.fill();
  // grain
  for (let i = 0; i < (w * h) / 900; i++) { c.fillStyle = Math.random() > 0.5 ? 'rgba(255,240,200,.05)' : 'rgba(0,0,0,.08)'; c.fillRect(Math.random() * w, Math.random() * h, dpr, dpr); }
  c.restore();
  // a gold hairline round the cover
  c.strokeStyle = 'rgba(214,178,98,.85)'; c.lineWidth = 1.5 * dpr; c.beginPath(); c.ellipse(cx, cy, R - dpr, R - dpr, 0, 0, Math.PI * 2); c.stroke();
  // the hint, on a small ivory ribbon below the eye
  const deva = /[ऀ-ॿ]/.test(hint);
  const size = Math.round(Math.min(R / 7.5, 17 * dpr));
  c.font = deva ? `500 ${size}px Mukta, sans-serif` : `600 ${size}px 'Cormorant Upright', Georgia, serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const tw = c.measureText(hint).width + 30 * dpr; const th = size * 2; const ty = cy + R * 0.74;
  c.fillStyle = 'rgba(243,234,214,.96)';
  c.beginPath(); c.moveTo(cx - tw / 2, ty - th / 2); c.lineTo(cx + tw / 2, ty - th / 2); c.lineTo(cx + tw / 2 - 7 * dpr, ty); c.lineTo(cx + tw / 2, ty + th / 2); c.lineTo(cx - tw / 2, ty + th / 2); c.lineTo(cx - tw / 2 + 7 * dpr, ty); c.closePath(); c.fill();
  c.fillStyle = '#15201F'; c.fillText(hint, cx, ty + (deva ? size * 0.08 : size * 0.02));
  c.strokeStyle = '#000'; c.fillStyle = '#000'; c.globalAlpha = 1;
}

// ───────── the page ─────────
function page(ctx) {
  const { bi, esc, txt, on, AD, BS, mainEv, placeLine, config, c, parts: P, neNum } = ctx;
  const inv = txt('hero.invocation');
  const bsS = (b) => (b.full.short?.en ? (/B\.S\./.test(b.full.short.en) ? b.full.short.en : `${b.full.short.en} B.S.`) : b.full.en);
  const head = (title, id, kicker = null, cls = '') => `<header class="kp-head kp-up ${cls}">${kicker && on(kicker) ? `<p class="kp-kicker">${bi(kicker)}</p>` : ''}<h2 class="kp-h2" id="${id}">${bi(title)}</h2>${rule()}</header>`;
  const tag = (i) => `<p class="kp-tag" aria-hidden="true"><b>${ROMAN[i]}</b><span>${bi(L.folio[i])}</span></p>`;
  const seam = '<span class="kp-seam" aria-hidden="true"><i></i></span>';
  /** a painted folio: the painting, its tag, and what sits on it (positioned in the painting's own coordinates) */
  const folio = (i, n, f, over, { id = '', label = '', cls = '' } = {}) => `<article class="kp-folio kp-folio--paint ${cls}"${id ? ` id="${id}"` : ''}${label ? ` aria-labelledby="${label}"` : ''} style="--f:${f}">
      <div class="kp-paint">${art(`pano-${n}`, 'pano', '(max-width: 760px) 1500px, 1700px', { cls: 'kp-paint__img' })}${over}</div>
      ${tag(i)}
    </article>`;

  // ── first screen: the fan's crest on the cloth's border, the names ──
  const hero = `
  <section class="su-hero kp-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    <div class="kp-hero__cloth" aria-hidden="true"></div>
    <div class="kp-hem kp-hem--top" aria-hidden="true"></div>
    <div class="kp-crest" aria-hidden="true"><span class="kp-root kp-root--crest">${fan('kp-fan--crest', '24px')}<span class="kp-mono su-in">${esc((c.bride.name.en || '').charAt(0))}<i>·</i>${esc((c.groom.name.en || '').charAt(0))}</span></span></div>
    <div class="kp-hero__in">
      ${on(inv) ? `<p class="kp-inv su-in" lang="ne">${esc(inv.ne || inv.en)}</p>` : ''}
      <p class="kp-htitle su-in">${bi(txt('hero.title'))}</p>
      <h1 class="su-names kp-names">${ctx.names('&amp;')}</h1>
      ${on(txt('hero.line')) ? `<p class="kp-hline su-in">${bi(txt('hero.line'))}</p>` : ''}
      ${rule('su-in')}
      <p class="kp-hdate su-in">${bi({ en: `${AD.wd.en} · ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.day && BS.month && BS.year ? `${AD.wd.ne} · ${BS.month} ${BS.day}, ${BS.year}` : (BS.full.ne || AD.full.ne) })}</p>
      <p class="kp-hbs su-in">${bi({ en: bsS(BS), ne: AD.full.ne })}</p>
      ${placeLine?.en || placeLine?.ne ? `<p class="kp-hplace su-in">${bi(placeLine)}</p>` : ''}
    </div>
    <span class="kp-hero__lotus kp-hero__lotus--l" aria-hidden="true">${art('lotus', 'lotus', '(max-width: 760px) 50vw, 420px', { eager: true })}</span>
    <span class="kp-hero__lotus kp-hero__lotus--r" aria-hidden="true">${art('lotus', 'lotus', '(max-width: 760px) 50vw, 420px', { eager: true })}</span>
    <a class="su-cue kp-cue" id="cue" href="#pichwai"><span>${bi(L.walk)}</span><i aria-hidden="true"></i></a>
  </section>`;

  // ── I · the palace terrace in the rain: the invitation ──
  const f1 = folio(0, 1, 0.5, `
      <div class="kp-over kp-over--invite" style="--ox:.5;--oy:.31">
        <div class="kp-cart">
          ${ctx.ganeshRef ? ctx.ganesh('kp-cart__gan', '72px') : ''}
          ${on(txt('cloth.kicker')) ? `<p class="kp-kicker">${bi(txt('cloth.kicker'))}</p>` : ''}
          <h2 class="kp-cart__line" id="card-title">${bi(txt('card.line'))}</h2>
          <p class="kp-cart__hosts"><span>${bi(L.hosts)}</span> ${bi(config.hosts)}</p>
          ${P.cardBtn('kp-btn')}
        </div>
      </div>`, { id: 'card', label: 'card-title' });

  // ── II · the lotus pond: the couple under a cusped arch ──
  const lead = P.lead;
  const f2 = folio(1, 2, 0.47, `
      <div class="kp-over kp-over--couple${lead ? '' : ' is-text'}" style="--ox:.47;--oy:${lead ? '.37' : '.3'}">
        <figure class="kp-arch">${cusp()}
          ${lead ? `<span class="kp-arch__pic">${ctx.imgTag(lead.photo, lead.alt, '(max-width: 760px) 70vw, 340px')}</span>` : ''}
          <figcaption class="kp-arch__cap">
            <h2 class="kp-arch__t" id="couple-title">${bi(txt('couple.title'))}</h2>
            ${on(txt('couple.line')) ? `<p class="kp-arch__l">${bi(txt('couple.line'))}</p>` : ''}
          </figcaption>
        </figure>
      </div>`, { id: 'couple', label: 'couple-title' });

  // ── III · the register: one Ragamala-style miniature per ceremony ──
  const minis = P.events.map((ev, i) => {
    const [n, cx, cy, z] = VIGS[i % VIGS.length];
    const dress = ev.dress.colors.length || ev.dress.text?.en || ev.dress.text?.ne;
    return `<li class="kp-mini" id="ev-${esc(ev.id)}">
      <div class="kp-mini__in">
        ${vignette(n, cx, cy, z, 'kp-mini__vig')}
        <p class="kp-mini__no" aria-hidden="true">${ROMAN[i] || i + 1}</p>
        <h3 class="kp-mini__t">${bi(ev.title)}</h3>
        <p class="kp-mini__date">${bi({ en: `${ev.ad.wd.en}, ${ev.ad.day} ${ev.ad.month.en} ${ev.ad.year}`, ne: ev.bs.month && ev.bs.year ? `${ev.ad.wd.ne}, ${ev.bs.month} ${ev.bs.day}, ${ev.bs.year}` : ev.ad.full.ne })}</p>
        <p class="kp-mini__bs">${bi({ en: bsS(ev.bs), ne: ev.ad.full.ne })}</p>
        <p class="kp-mini__time">${bi(ev.time)}</p>
        ${ev.blurb ? `<p class="kp-mini__blurb">${bi(ev.blurb)}</p>` : ''}
        <p class="kp-mini__venue">${bi(ev.venue)} <a class="su-link" href="${esc(ev.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
        ${dress ? `<p class="kp-mini__dress">${ev.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : P.UI.wear)}</span></p>` : ''}
        ${ev.rituals.length ? `<details class="kp-order"><summary>${bi(P.UI.order)}</summary><ol data-lenis-prevent>${ev.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
      </div>
    </li>`;
  }).join('');
  const f3 = P.events.length ? `<article class="kp-folio kp-folio--reg" id="programme" aria-labelledby="prog-title">
      <div class="kp-reg">
        <header class="kp-reg__head">
          ${on(txt('prog.kicker')) ? `<p class="kp-kicker">${bi(txt('prog.kicker'))}</p>` : ''}
          <h2 class="kp-h2" id="prog-title">${bi(txt('prog.title'))}</h2>
          ${rule()}
          <div class="kp-btns">${P.calendarBtn('kp-btn')}${P.shareBtn('kp-btn kp-btn--line')}</div>
        </header>
        <ol class="kp-reg__list">${minis}</ol>
      </div>
      ${tag(2)}
    </article>` : '';

  // ── IV · the moonlit terrace: the countdown in the full moon ──
  const f4 = folio(3, 4, 0.24, `
      <div class="kp-over kp-over--moon" style="--ox:.22;--oy:.32">
        <div class="kp-moon" data-countdown>
          <p class="kp-moon__t">${bi(txt('count.title'))}</p>
          <ol class="su-count__grid kp-moon__grid" aria-label="${esc(txt('count.title').en)}">${P.countUnits.map(({ u, label }) => `<li>${P.countNum(u, 'kp-moon__n')}<span class="kp-moon__l">${bi(label)}</span></li>`).join('')}</ol>
          <p class="kp-moon__done" data-count-done hidden></p>
          <p class="kp-moon__d">${bi({ en: `${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.day && BS.month ? `${BS.month} ${BS.day}, ${BS.year}` : AD.full.ne })}</p>
        </div>
      </div>`, { id: 'count' });

  // ── V · the rain-cloud band ──
  const f5 = folio(4, 5, 0.53, on(txt('cloth.end')) ? `
      <div class="kp-over kp-over--end" style="--ox:.54;--oy:.31">
        <div class="kp-ribbon"><p>${bi(txt('cloth.end'))}</p><span class="kp-ribbon__go">${bi(L.more)} <i aria-hidden="true">↓</i></span></div>
      </div>` : '', { cls: 'kp-folio--end' });

  const folios = [f1, f2, f3, f4, f5].filter(Boolean).join(seam);
  const plume = (k) => `<span class="kp-pl" style="--k:${k}">${art('feather', 'feather', '60px')}</span>`;
  const plumes = (cls, n) => `<div class="kp-plumes ${cls}" aria-hidden="true">${Array.from({ length: n }, (_, i) => plume(i)).join('')}</div>`;

  const cloth = `
  <section class="kp-cloth" id="pichwai" aria-label="${esc(L.folio[0].en.replace(/^The /, 'A painted cloth: the '))}">
    <div class="kp-hem kp-hem--top" aria-hidden="true"></div>
    <div class="kp-cloth__view">
      <div class="kp-track">${folios}</div>
      ${plumes('kp-plumes--top', 9)}
      ${plumes('kp-plumes--bot', 9)}
    </div>
    <div class="kp-hem kp-hem--bot" aria-hidden="true"><span class="kp-thread"></span></div>
  </section>`;

  // ── the families: two facing miniature panels ──
  const panel = (f, side) => {
    const p = f.person;
    const pic = P.brideGroom && f.photo
      ? ctx.imgTag(f.photo, p.name.en, '(max-width: 760px) 44vw, 300px')
      : vignette(5, side === 'l' ? 0.455 : 0.6, 0.63, 5, 'kp-mp__vig');
    return `<figure class="kp-mp kp-mp--${side} kp-up">
      <div class="kp-mp__frame"><div class="kp-mp__arch">${pic}</div></div>
      <figcaption class="kp-mp__cap">
        <p class="kp-kicker">${bi(L.famOf[f.key])}</p>
        <h3 class="kp-mp__name">${bi(p.fullName)}</h3>
        ${p.parents?.en || p.parents?.ne ? `<p class="kp-mp__of">${bi(f.of)}</p><p class="kp-mp__par">${bi(p.parents)}</p>` : ''}
        ${p.home?.en || p.home?.ne ? `<p class="kp-mp__home">${bi(p.home)}</p>` : ''}
      </figcaption>
    </figure>`;
  };
  const families = `
  <section class="kp-sec kp-fam" id="families" aria-labelledby="fam-title">
    ${head(txt('families.title'), 'fam-title')}
    <div class="kp-fam__pair">${panel(P.families[0], 'l')}<span class="kp-fam__and" aria-hidden="true">&amp;</span>${panel(P.families[1], 'r')}</div>
  </section>`;

  // ── the date, under a peacock-feather eye ──
  const time = mainEv ? { en: AD.time, ne: ctx.timeLabel(mainEv).ne } : null;
  const face = `<div class="kp-medal">
      <p class="kp-medal__wd">${bi(AD.wd)}</p>
      <p class="kp-medal__day">${bi({ en: AD.day, ne: BS.day || neNum(AD.day) })}</p>
      <p class="kp-medal__my">${bi({ en: `${AD.month.en} ${AD.year}`, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</p>
      ${time ? `<p class="kp-medal__t">${bi(time)}</p>` : ''}
      <p class="kp-medal__alt">${bi({ en: bsS(BS), ne: AD.full.ne })}</p>
    </div>`;
  const date = `
  <section class="kp-sec kp-date" id="date" aria-labelledby="date-title">
    ${head(txt('date.title'), 'date-title', txt('date.kicker'))}
    <div class="kp-date__eye kp-up">${P.scratch(face, 'kp-scratch')}</div>
    ${placeLine?.en || placeLine?.ne ? `<p class="kp-date__place kp-up">${bi(placeLine)}</p>` : ''}
    <div class="kp-btns kp-up">${P.events.length ? '' : P.calendarBtn('kp-btn')}${P.events.length ? '' : P.shareBtn('kp-btn kp-btn--line')}</div>
    <div class="kp-more kp-up">${P.moreInfo()}</div>
  </section>`;

  // ── a monsoon diary: photographs tipped onto the cloth ──
  const tilt = [-2.2, 1.6, -1.1, 2.4, -1.8, 1.1, -2.6, 1.9, -0.9];
  const photos = P.photos.length ? `
  <section class="kp-sec kp-diary" id="photos" aria-labelledby="gal-title">
    ${head(txt('gallery.title'), 'gal-title')}
    <ul class="kp-diary__grid">${P.photos.map((g, i) => `<li class="kp-snap kp-up" style="--r:${tilt[i % tilt.length]}deg">${P.photoBtn(g, i, '(max-width: 760px) 44vw, 340px', 'kp-snap__btn')}</li>`).join('')}</ul>
  </section>` : '';

  // ── the reply, on an ivory cloth cartouche ──
  const rsvp = `
  <section class="kp-sec kp-rsvp" id="rsvp" aria-labelledby="rsvp-title">
    <div class="kp-cloth-cart kp-up">
      <div class="kp-cloth-cart__in">
        <h2 class="kp-h2 kp-h2--ink" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
        ${rule()}
        ${P.deadline?.en || P.deadline?.ne ? `<p class="kp-rsvp__dl">${bi(P.deadline)}</p>` : ''}
        ${P.rsvpForm()}
      </div>
    </div>
    <span class="kp-rsvp__lotus" aria-hidden="true">${art('lotus', 'lotus', '(max-width: 760px) 92vw, 640px')}</span>
  </section>`;

  const close = `
  <footer class="kp-close" aria-label="Blessing">
    <div class="kp-close__crest" aria-hidden="true"><span class="kp-root kp-root--close">${fan('kp-fan--close', '24px')}</span></div>
    <div class="kp-close__text kp-up">
      <p class="kp-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
      <p class="kp-close__en l-en">${esc(config.closing?.en || '')}</p>
      <p class="kp-close__names">${ctx.names('&amp;')}</p>
      ${c.hashtag ? `<p class="kp-close__tag">${esc(c.hashtag)}</p>` : ''}
    </div>
    <div class="kp-close__lamps" aria-hidden="true">${lamp('diyo', { cls: 'kp-close__diyo', sizes: '70px' })}${lamp('diyo', { cls: 'kp-close__diyo', sizes: '70px' })}</div>
    ${P.madeWith()}
    <div class="kp-hem kp-hem--foot" aria-hidden="true"></div>
  </footer>`;

  return `${hero}${cloth}<div class="kp-body">${families}${date}${photos}${rsvp}${close}</div>`;
}

// ───────── the opening: the peacock fans its tail ─────────
const GATE = (ctx) => `
  <div class="kp-g">
    <div class="kp-g__bg"></div>
    <div class="kp-g__frame"></div>
    <span class="kp-g__glow"></span>
    <span class="kp-root kp-root--gate">${fan('kp-fan--gate', '(max-width: 760px) 90px, 110px')}</span>
    <span class="kp-bird"><span class="kp-bird__in"><img class="kp-bird__train" src="${A}peacock.webp" alt="" decoding="async" /><img class="kp-bird__body" src="${A}peacock.webp" alt="" decoding="async" /></span></span>
    <div class="kp-gnames"><p class="su-names kp-names">${ctx.names('&amp;')}</p></div>
  </div>`;

/** the fan's size (--L, feather length) and its root (--ry) for this screen */
function sizeGate() {
  const g = document.querySelector('.kp-g');
  if (!g) return;
  const vw = innerWidth; const vh = innerHeight;
  // the fan's top stays on screen and the standing bird stays clear of the buttons (about 186px at the foot)
  let Lf = Math.min(vw * 0.7, vh * 0.42, 440);
  let ry = Math.min(Math.max(Lf + 36, vh * 0.46), vh - 186 - Lf * 0.815);
  if (ry < Lf + 30) { Lf = (vh - 216) / 1.815; ry = Lf + 30; }
  g.style.setProperty('--L', `${Math.round(Lf)}px`);
  g.style.setProperty('--ry', `${Math.round(ry)}px`);
}

// ───────── the cloth: vertical scroll → sideways along the pichwai ─────────
function cloth(ctx) {
  const C = document.getElementById('pichwai');
  if (!C) return;
  const view = C.querySelector('.kp-cloth__view');
  const track = C.querySelector('.kp-track');
  const thread = C.querySelector('.kp-thread');
  const top = C.querySelector('.kp-plumes--top');
  const bot = C.querySelector('.kp-plumes--bot');
  const body = document.body;
  let gc = null; let st = null; let D = 0;
  const wide = () => matchMedia('(min-width: 900px) and (pointer: fine)').matches;

  /** paintings: each one centred on its folio's focus, never leaving a gap */
  const place = () => {
    const H = view.clientHeight;
    C.style.setProperty('--ph', `${H}px`);
    C.style.setProperty('--pw', `${Math.round((H * 16) / 9)}px`);
    track.querySelectorAll('.kp-folio--paint').forEach((f) => {
      const p = f.querySelector('.kp-paint');
      const fw = f.offsetWidth; const pw = p.offsetWidth;
      const k = parseFloat(getComputedStyle(f).getPropertyValue('--f')) || 0.5;
      p.style.left = `${Math.round(Math.min(0, Math.max(fw - pw, fw / 2 - k * pw)))}px`;
    });
  };
  // every cartouche must sit inside the painting's height; a small overflow is scaled, more → the flat cloth
  const fits = () => {
    if (innerHeight < 540 || innerWidth < 320) return false;
    const H = view.clientHeight;
    let ok = true;
    track.querySelectorAll('.kp-over > *, .kp-reg').forEach((el) => { el.style.scale = ''; });
    track.querySelectorAll('.kp-over > *, .kp-reg').forEach((el) => {
      const h = el.offsetHeight; const room = H * (el.classList.contains('kp-reg') ? 0.98 : 0.94);
      if (h > room) { const k = room / h; if (k < 0.8) ok = false; else el.style.scale = k.toFixed(3); }
    });
    return ok;
  };
  const measure = () => { place(); D = Math.max(0, track.scrollWidth - innerWidth); };

  function build() {
    gc?.revert(); gc = null; st = null;
    body.classList.remove('kp-flat');
    C.style.removeProperty('--pw');
    if (ctx.reduced) { body.classList.add('kp-flat'); flatReveal(); ScrollTrigger.refresh(); return; }
    place();
    if (!fits()) { body.classList.add('kp-flat'); flatReveal(); ScrollTrigger.refresh(); return; }
    gc = gsap.context(() => {
      measure();
      const setThread = gsap.quickSetter(thread, 'scaleX');
      const par = wide();
      const setTop = par ? gsap.quickSetter(top, 'x', 'px') : null;
      const setBot = par ? gsap.quickSetter(bot, 'x', 'px') : null;
      const move = gsap.to(track, {
        x: () => -D, ease: 'none',
        scrollTrigger: {
          trigger: C, pin: true, start: 'top top', end: () => `+=${Math.round(D * 0.92)}`, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
          onRefreshInit: measure,
          onUpdate(self) {
            const p = self.progress;
            setThread(p);
            if (par) { setTop(-p * D * 0.9); setBot(-p * D * 1.1); }
          },
        },
      });
      st = move.scrollTrigger;
      // quiet arrivals: each cartouche settles as its folio comes into view; the moon rises a little
      track.querySelectorAll('.kp-over > *').forEach((el) => {
        if (el.getBoundingClientRect().left < innerWidth * 0.9) return; // already in view when the cloth arrives
        gsap.fromTo(el, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, containerAnimation: move, start: 'left 92%', toggleActions: 'play none none reverse' } });
      });
      track.querySelectorAll('.kp-mini').forEach((el) => {
        if (el.getBoundingClientRect().left < innerWidth * 0.9) return;
        gsap.fromTo(el, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', scrollTrigger: { trigger: el, containerAnimation: move, start: 'left 96%', toggleActions: 'play none none reverse' } });
      });
    });
    ScrollTrigger.refresh();
  }
  /** the flat cloth (reduced motion, short screens): the folios stacked, each fading in */
  function flatReveal() {
    const els = track.querySelectorAll('.kp-folio');
    if (ctx.reduced) { els.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
  }

  build();
  let raf = 0; let w0 = innerWidth; let h0 = innerHeight;
  const again = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(build); };
  document.addEventListener('langchange', again);
  addEventListener('resize', () => { if (innerWidth !== w0 || Math.abs(innerHeight - h0) > 120) { w0 = innerWidth; h0 = innerHeight; again(); } });
  let t = 0;
  track.querySelectorAll('img').forEach((im) => { if (!im.complete) im.addEventListener('load', () => { clearTimeout(t); t = setTimeout(() => { if (st) { place(); ScrollTrigger.refresh(); } }, 140); }, { once: true }); });

  // the page position at which a folio stands in the middle of the screen
  const yOf = (el) => {
    if (st && track.contains(el)) {
      const f = el.closest('.kp-folio, .kp-mini') || el;
      let x = 0; let n = f; while (n && n !== track) { x += n.offsetLeft; n = n.offsetParent; }
      const target = Math.min(D, Math.max(0, x + f.offsetWidth / 2 - innerWidth / 2));
      return st.start + (target / D) * (st.end - st.start);
    }
    return el.getBoundingClientRect().top + scrollY;
  };
  // keyboard: a focused link or button off to the side brings its folio to the middle
  track.addEventListener('focusin', (e) => {
    if (!st) return;
    const r = e.target.getBoundingClientRect();
    if (r.left >= 0 && r.right <= innerWidth) return;
    const lenis = ctx.lenis?.(); const y = yOf(e.target);
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y);
  });
}

// ───────── theme spec ─────────
const T = {
  slug: 'kalapi',
  manifest,
  art: A,
  bell: false, // the monsoon opens quietly: no temple bell under the fan

  gate: GATE,
  page,

  ready(ctx) {
    initNepali();
    const ne = document.getElementById('f-name-err'); if (ne) { ne.hidden = false; ne.setAttribute('role', 'alert'); }
    sizeGate();
    const g = document.querySelector('.kp-g');
    if (!g) return;
    let w0 = innerWidth;
    const onResize = () => { if (!document.body.classList.contains('is-opening') && Math.abs(innerWidth - w0) > 1) { w0 = innerWidth; sizeGate(); } else sizeGate(); };
    addEventListener('resize', onResize);
    if (ctx.reduced) { g.classList.add('is-fanned'); return; }
    // closed: the train hangs folded, the feathers wait behind the bird, the eye of cloth and the names are hidden
    const fs = [...g.querySelectorAll('.kp-fan--gate .kp-f')];
    fs.forEach((f) => { f.style.rotate = '0deg'; });
    gsap.set(fs, { rotation: 0, scale: 0.42, opacity: 0, transformOrigin: '50% 100%' });
    gsap.set(g.querySelector('.kp-fan--gate .kp-disc'), { scale: 0.4, opacity: 0 });
    gsap.set(g.querySelectorAll('.kp-gnames .su-n, .kp-gnames .su-amp'), { xPercent: -101, opacity: 0 });
    gsap.set(g.querySelectorAll('.kp-gnames .su-n > span'), { xPercent: 101 });
    gsap.set('.kp-hero .kp-names, .kp-hero .kp-crest', { opacity: 0 });
  },

  open(ctx, tl) {
    const g = document.querySelector('.kp-g');
    const q = (s) => g.querySelector(s);
    const fs = [...g.querySelectorAll('.kp-fan--gate .kp-f')];
    const root = q('.kp-root--gate');
    const names = q('.kp-gnames .kp-names');
    const t0 = 0.2;
    // the train lifts: the folded train gathers up into the tail root as the feathers rise out of it
    tl.to(q('.kp-bird__train'), { scaleY: 0.18, opacity: 0, duration: 0.75, ease: 'power2.in' }, t0);
    // 21 feathers rotate out from the tail root, centre first, 60 ms apart to each side
    const mid = (N - 1) / 2;
    const rise = () => parseFloat(getComputedStyle(g).getPropertyValue('--L')) * 0.45;
    fs.forEach((f, i) => tl.fromTo(f, { y: rise }, { y: 0, rotation: angle(i), scale: 1, opacity: 1, duration: 0.85, ease: 'back.out(1.2)' }, t0 + 0.1 + Math.abs(i - mid) * 0.06));
    // the train rattles once, as a dancing peacock's does
    tl.to(root, { keyframes: [{ rotation: 1.4, duration: 0.12, ease: 'sine.out' }, { rotation: -1.1, duration: 0.14, ease: 'sine.inOut' }, { rotation: 0.6, duration: 0.12, ease: 'sine.inOut' }, { rotation: 0, duration: 0.16, ease: 'sine.out' }] }, 1.3);
    tl.to(q('.kp-g__glow'), { opacity: 1, scale: 1, duration: 1.2, ease: 'power2.out' }, t0 + 0.2);
    // the eye of plain cloth opens in the centre, and the names write themselves in, in gold
    tl.to(q('.kp-fan--gate .kp-disc'), { scale: 1, opacity: 1, duration: 0.7, ease: 'power3.out' }, 0.75);
    const lines = [...g.querySelectorAll('.kp-gnames .su-n, .kp-gnames .su-amp')];
    lines.forEach((ln, i) => {
      const at = 1.2 + i * 0.3;
      tl.to(ln, { xPercent: 0, opacity: 1, duration: 0.75, ease: 'power2.inOut' }, at);
      const inner = ln.querySelectorAll(':scope > span');
      if (inner.length) tl.to(inner, { xPercent: 0, duration: 0.75, ease: 'power2.inOut' }, at);
    });
    // the fan lifts into the crest on the cloth's border; the names settle into the first screen; the bird walks away
    const tL = 2.75;
    const crest = document.querySelector('.kp-root--crest');
    const hn = document.querySelector('.kp-hero .kp-names');
    const lift = {};
    tl.call(() => {
      const a = root.getBoundingClientRect(); const b = crest.getBoundingClientRect();
      const fl = parseFloat(getComputedStyle(g).getPropertyValue('--L')) || 1;
      const cl = parseFloat(getComputedStyle(crest).getPropertyValue('--L')) || 1;
      lift.x = b.left - a.left; lift.y = b.top - a.top; lift.s = cl / fl;
      const n1 = names.getBoundingClientRect(); const n2 = hn.getBoundingClientRect();
      lift.nx = (n2.left + n2.width / 2) - (n1.left + n1.width / 2); lift.ny = (n2.top + n2.height / 2) - (n1.top + n1.height / 2); lift.ns = n2.height / (n1.height || 1);
    }, null, tL - 0.02);
    tl.to(root, { x: () => lift.x, y: () => lift.y, scale: () => lift.s, transformOrigin: '0 0', duration: 1.2, ease: 'power3.inOut' }, tL);
    tl.to(q('.kp-gnames'), { x: () => lift.nx, y: () => lift.ny, scale: () => lift.ns, duration: 1.2, ease: 'power3.inOut' }, tL);
    const bird = q('.kp-bird__in');
    tl.to(bird, { y: () => -innerHeight * 0.06, scale: 0.62, opacity: 0, duration: 1.5, ease: 'power1.in' }, tL - 0.05);
    tl.to(bird, { keyframes: [{ rotation: -3, duration: 0.18 }, { rotation: 3, duration: 0.3 }, { rotation: -3, duration: 0.3 }, { rotation: 2, duration: 0.3 }, { rotation: 0, duration: 0.2 }], ease: 'sine.inOut' }, tL - 0.05);
    tl.to([q('.kp-g__bg'), q('.kp-g__frame'), q('.kp-g__glow')], { opacity: 0, duration: 0.7, ease: 'power1.inOut' }, tL + 0.75);
    tl.set(['.kp-hero .kp-names', '.kp-hero .kp-crest'], { opacity: 1 }, tL + 1.2);
    tl.to([root, q('.kp-gnames')], { opacity: 0, duration: 0.25, ease: 'none' }, tL + 1.21);
    return tL + 1.0;
  },

  scroll(ctx) {
    gsap.set('.kp-hero .kp-names, .kp-hero .kp-crest', { opacity: 1 });
    if (!ctx.reduced) {
      document.querySelectorAll('.kp-up').forEach((el) => {
        gsap.fromTo(el, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
      });
      // the first screen's words settle back as you leave it
      gsap.to('.kp-hero__in', { y: () => -innerHeight * 0.08, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true } });
    }
    cloth(ctx);
  },

  scratch: { paint: paintEye },
};

mountSuite(T);
