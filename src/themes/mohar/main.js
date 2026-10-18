// Mohar (मोहर): the royal seal. A folded farman (decree) lies on an indigo cloth, tied with red silk and closed with
// a pool of red lac. Signature: press and hold, and a brass seal descends into the lac; let go and the couple's
// monogram is left in it; tap, and the lac cracks, the silk slips away and the decree unfolds in 3D. Below, the
// farman itself: a concertina of parchment pages that opens page by page in 3D as you scroll (sideways and pinned on
// a wide screen, downward on a phone). Then brass-framed portraits on the cloth, a red bahi-khata as the RSVP
// register, and the seal once more at the foot. Everything after the opening stays quiet.
import './mohar.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import { isOff } from '../_suite/kit.js';

const A = '/themes/mohar/art/';

// ───────── the monogram ─────────
const graphemes = (s) => {
  const t = String(s || '').replace(/[^\p{L}\p{M}]/gu, '');
  try { return [...new Intl.Segmenter('hi', { granularity: 'grapheme' }).segment(t)].map((x) => x.segment); } catch { return [...t]; }
};
/** the two letters on the seal: the client's own (seal.initials), else the first letter of each name */
function letters(ctx) {
  const o = ctx.txt('seal.initials'); const c = ctx.c;
  const own = (s) => { const g = graphemes(isOff(s) ? '' : s); return g.length ? [g[0], g[1] || ''].filter(Boolean) : null; };
  const auto = (k) => [graphemes(c.bride.name[k])[0] || '', graphemes(c.groom.name[k])[0] || ''].filter(Boolean);
  const en = (own(o.en) || auto('en')).map((x) => x.toUpperCase());
  const ne = own(o.ne) || auto('ne');
  return { en: en.length ? en : ['', ''], ne: ne.length ? ne : en };
}
let uid = 0;
/** two letters with a small diamond between them, centred in a 200×200 box */
function monoShape(ls, deva, fill = 'currentColor') {
  const [a, b] = ls;
  const fam = deva ? "'Tiro Devanagari Sanskrit', 'Laila', serif" : "'Linden Hill', 'Crimson Pro', serif";
  const size = deva ? 56 : 66; const y = deva ? 120 : 124;
  if (!b) return `<text x="100" y="${y}" text-anchor="middle" font-family="${fam}" font-size="${size + 10}" fill="${fill}">${esc(a)}</text>`;
  return `<text x="66" y="${y}" text-anchor="middle" font-family="${fam}" font-size="${size}" fill="${fill}">${esc(a)}</text>
    <path d="M100 92l7 10-7 10-7-10z" fill="${fill}"/>
    <text x="134" y="${y}" text-anchor="middle" font-family="${fam}" font-size="${size}" fill="${fill}">${esc(b)}</text>`;
}
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
/** the monogram pressed into the lac: debossed, lit from the top left */
function impression(L, cls = '') {
  const layer = (ls, deva) => {
    const ring = (stroke) => `<circle cx="100" cy="100" r="74" fill="none" stroke="${stroke}" stroke-width="3.2" stroke-dasharray="0 9.7" stroke-linecap="round"/><circle cx="100" cy="100" r="64" fill="none" stroke="${stroke}" stroke-width="1.3"/>`;
    return `<g transform="translate(1.8 2.2)" opacity="0.8">${ring('#FFB4A4')}${monoShape(ls, deva, '#FFB4A4')}</g>
      <g transform="translate(-1.4 -1.6)">${ring('#1E0102')}${monoShape(ls, deva, '#1E0102')}</g>
      <g>${ring('#5C0A0C')}${monoShape(ls, deva, '#5C0A0C')}</g>`;
  };
  return `<svg class="mo-imp ${cls}" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><g class="l-en">${layer(L.en, false)}</g><g class="l-ne">${layer(L.ne, true)}</g></svg>`;
}
/** the lal mohar: the red ink seal printed at the head of a royal decree (rough ink, the ring text fitted in JS) */
function lalmohar(L, ctx, cls = '') {
  const id = `mo-ring-${uid++}`;
  const t = ctx.txt('hero.title');
  const yr = { en: ctx.AD.year, ne: ctx.BS.year || ctx.neNum(ctx.AD.year) };
  const ring = (k) => `${esc((t[k] || '').toUpperCase())} ✦ ${esc(yr[k])} ✦ ${esc((t[k] || '').toUpperCase())} ✦ ${esc(yr[k])} ✦`;
  return `<svg class="mo-lal ${cls}" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <defs><path id="${id}" d="M100 100m-79 0a79 79 0 1 1 158 0a79 79 0 1 1-158 0"/></defs>
    <g filter="url(#mo-ink)" fill="currentColor" stroke="currentColor">
      <circle cx="100" cy="100" r="95" fill="none" stroke-width="4.5"/>
      <circle cx="100" cy="100" r="89" fill="none" stroke-width="1.2"/>
      <circle cx="100" cy="100" r="66" fill="none" stroke-width="2"/>
      <text class="mo-lal__ring l-en" font-family="'Linden Hill', serif" font-size="15" letter-spacing="1.5" stroke="none" dy="5"><textPath href="#${id}">${ring('en')}</textPath></text>
      <text class="mo-lal__ring l-ne" font-family="'Laila', serif" font-size="15" stroke="none" dy="5"><textPath href="#${id}">${ring('ne')}</textPath></text>
      <g class="l-en" stroke="none">${monoShape(L.en, false)}</g><g class="l-ne" stroke="none">${monoShape(L.ne, true)}</g>
    </g></svg>`;
}
const INK = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><filter id="mo-ink" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3" result="m"/>
  <feColorMatrix in="m" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.55" result="mask"/>
  <feComposite in="d" in2="mask" operator="in"/></filter></svg>`;

/** fit the ring text of every lal mohar to its circle (once the fonts are in) */
function fitRings() {
  document.querySelectorAll('.mo-lal__ring').forEach((t) => {
    if (!t.getClientRects().length) return;
    const tp = t.querySelector('textPath');
    const len = tp.getComputedTextLength?.() || 0;
    if (!len) return;
    const want = 2 * Math.PI * 79 * 0.97;
    const fs = parseFloat(t.getAttribute('font-size')) || 15;
    t.setAttribute('font-size', String(Math.max(9, Math.min(19, (fs * want) / len)).toFixed(2)));
  });
}

// ───────── the opening: the sealed packet ─────────
function gate(ctx) {
  const L = letters(ctx);
  const half = (side) => `<span class="mo-half mo-half--${side}"><img class="mo-lac__img" src="${A}lac.webp" alt="" decoding="async" />${impression(L)}</span>`;
  return `<img class="mo-spray" src="${A}spray.webp" alt="" decoding="async" />
    <div class="mo-pk" id="mo-pk">
      <span class="mo-silk mo-silk--l"></span><span class="mo-silk mo-silk--r"></span>
      <span class="mo-tail mo-tail--l"></span><span class="mo-tail mo-tail--r"></span>
      <div class="mo-press" id="mo-press">
        <span class="mo-shadow"></span>
        <span class="mo-lac">${half('l')}${half('r')}<i class="mo-sheen"><b></b></i></span>
        <span class="mo-seal"><img src="${A}seal.webp" alt="" decoding="async" /></span>
      </div>
    </div>
    <p class="mo-hint" id="mo-hint"><span class="mo-hint__a">${ctx.bi(ctx.txt('gate.hint'))}</span><span class="mo-hint__b">${ctx.bi(ctx.txt('gate.after'))}</span></p>`;
}

// ───────── the decree (the first screen) ─────────
function hero(ctx) {
  const { bi, esc: e, txt, on, c, AD, BS } = ctx;
  const L = letters(ctx);
  const inv = txt('hero.invocation');
  const place = ctx.placeLine;
  // the painted diya on the table is a Hindu lamp: a page whose symbols are not Hindu gets the same table with petals there
  const sym = document.documentElement.dataset.symbols;
  const tb = (o) => `${A}table-${o}${sym && sym !== 'hindu' ? '-plain' : ''}`;
  return `<div class="mo-table" aria-hidden="true"><picture>
      <source media="(orientation: landscape)" srcset="${tb('l')}-sm.webp 1280w, ${tb('l')}.webp 2048w" sizes="100vw" />
      <img src="${tb('p')}-sm.webp" srcset="${tb('p')}-sm.webp 720w, ${tb('p')}.webp 1152w" sizes="100vw" alt="" fetchpriority="high" decoding="async" />
    </picture></div>
    <div class="mo-sheet" id="mo-sheet">
      <div class="mo-fold mo-fold--top"><div class="mo-face">
        <div class="mo-fit">
          ${lalmohar(L, ctx, 'mo-lal--hero su-in')}
          ${on(inv) ? `<p class="mo-inv">${bi(inv)}</p>` : ''}
          <h1 class="mo-title">${bi(txt('hero.title'))}</h1>
        </div>
      </div><div class="mo-back"></div></div>
      <div class="mo-fold mo-fold--mid"><div class="mo-face">
        <div class="mo-fit">
          ${on(txt('hero.line')) ? `<p class="mo-line">${bi(txt('hero.line'))}</p>` : ''}
          <p class="mo-names"><span class="mo-n">${bi(c.bride.name)}</span><span class="mo-amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span><span class="mo-n">${bi(c.groom.name)}</span></p>
        </div>
      </div></div>
      <div class="mo-fold mo-fold--bot"><div class="mo-face">
        <div class="mo-fit">
          <p class="mo-when"><span class="mo-when__wd">${bi(AD.wd)}</span><span class="mo-when__d">${bi({ en: `${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.day ? `${BS.month} ${BS.day}, ${BS.year}` : AD.full.ne })}</span></p>
          <p class="mo-when__alt">${bi({ en: BS.full.short?.en ? (/B\.S\./.test(BS.full.short.en) ? BS.full.short.en : `${BS.full.short.en} B.S.`) : BS.full.en, ne: AD.full.ne })}</p>
          ${place?.en || place?.ne ? `<p class="mo-place">${bi(place)}</p>` : ''}
        </div>
      </div><div class="mo-back"></div></div>
    </div>
    <span class="sr-only">${e(`${c.bride.name.en} and ${c.groom.name.en}`)}</span>`;
}

// ───────── the farman pages ─────────
function pages(ctx) {
  const { bi, esc: e, txt, on, parts: P, config } = ctx;
  const out = [];
  // a small painted miniature under each page's title (a pair of peacocks replaces the couple when the symbols are not Hindu)
  const vig = (k) => (k ? `<figure class="mo-vig" aria-hidden="true">${k === 'couple' ? `<img class="mo-vig__h" src="${A}vig-couple.webp" alt="" loading="lazy" decoding="async" /><img class="mo-vig__n" src="${A}vig-peacocks.webp" alt="" loading="lazy" decoding="async" />` : `<img src="${A}vig-${k}.webp" alt="" loading="lazy" decoding="async" />`}</figure>` : '');
  const head = (kicker, title, id, k = null) => `<header class="mo-ph">${kicker && on(kicker) ? `<p class="mo-k">${bi(kicker)}</p>` : ''}<h2 class="mo-h" id="${id}">${bi(title)}</h2><span class="mo-rule" aria-hidden="true"></span>${vig(k)}</header>`;
  out.push({ id: 'pg-decree', title: txt('decree.title'), html: `${head(txt('decree.kicker'), txt('decree.title'), 'pg-decree-t', 'pavilion')}
    <p class="mo-lead">${bi(txt('card.line'))}</p>
    <p class="mo-hosts">${bi(config.hosts)}</p>
    ${P.cardBtn('mo-btn')}` });

  out.push({ id: 'pg-fam', title: txt('families.title'), html: `${head(null, txt('families.title'), 'pg-fam-t', 'couple')}
    <div class="mo-fam">${P.families.map((f, i) => `${i ? '<p class="mo-fam__and" aria-hidden="true">&amp;</p>' : ''}<div class="mo-fam__side">
      ${P.brideGroom ? `<figure class="mo-fam__pic">${ctx.imgTag(f.photo, f.person.name.en, '96px')}</figure>` : ''}
      <p class="mo-k">${bi(f.label)}</p>
      <p class="mo-fam__name">${bi(f.person.fullName)}</p>
      ${(f.person.parents?.en || f.person.parents?.ne) ? `<p class="mo-fam__of">${bi(f.of)}</p><p class="mo-fam__par">${bi(f.person.parents)}</p>` : ''}
      ${(f.person.home?.en || f.person.home?.ne) ? `<p class="mo-fam__home">${bi(f.person.home)}</p>` : ''}
    </div>`).join('')}</div>` });

  const evs = P.events;
  const per = 2;
  for (let k = 0; k < evs.length; k += per) {
    const part = evs.slice(k, k + per);
    const id = `pg-ev-${k / per}`;
    out.push({ id, title: txt('prog.title'), html: `${head(k ? null : txt('prog.kicker'), txt('prog.title'), `${id}-t`, k ? 'music' : 'canopy')}
      <ol class="mo-evs">${part.map((ev) => {
        const hasDress = !!(ev.dress.text?.en || ev.dress.text?.ne || ev.dress.colors.length);
        return `<li class="mo-ev" id="ev-${e(ev.id)}">
          <h3 class="mo-ev__t">${bi(ev.title)}</h3>
          <p class="mo-ev__d">${bi({ en: ev.ad.full.en, ne: ev.bs.full.ne })}</p>
          <p class="mo-ev__time">${bi(ev.time)}</p>
          ${ev.blurb ? `<p class="mo-ev__b">${bi(ev.blurb)}</p>` : ''}
          <p class="mo-ev__v">${bi(ev.venue)} <a class="su-link" href="${e(ev.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
          ${hasDress ? `<p class="mo-ev__dress">${ev.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : P.UI.wear)}</span></p>` : ''}
          ${ev.rituals.length ? `<details class="mo-order"><summary>${bi(P.UI.order)}</summary><ol>${ev.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
        </li>`;
      }).join('')}</ol>` });
  }

  const mainEv = ctx.mainEv;
  const venue = mainEv?.venue?.en || mainEv?.venue?.ne ? mainEv.venue : config.city;
  const mapQ = mainEv ? (mainEv.mapQuery || mainEv.venue?.en || '') : (config.city?.en || '');
  out.push({ id: 'pg-venue', title: txt('venue.title'), html: `${head(null, txt('venue.title'), 'pg-venue-t', 'gate')}
    <p class="mo-venue">${bi(venue || { en: '', ne: '' })}</p>
    ${mainEv && (config.city?.en || config.city?.ne) ? `<p class="mo-city">${bi(config.city)}</p>` : ''}
    ${mapQ ? `<a class="su-btn mo-btn mo-btn--line" href="${e(ctx.mapUrl(mapQ))}" target="_blank" rel="noopener">${bi({ en: 'Open the map', ne: 'नक्सा हेर्नुहोस्' })}<span class="sr-only"> (opens Google Maps)</span></a>` : ''}
    ${P.moreInfo()}` });

  out.push({ id: 'pg-date', title: txt('count.title'), html: `${head(txt('date.kicker'), txt('count.title'), 'pg-date-t', 'birds')}
    <div class="mo-strip">${ctx.dateStrip()}</div>
    <div class="mo-count" data-countdown>
      <ol class="su-count__grid mo-count__grid" aria-label="${e(txt('count.title').en)}">${P.countUnits.map((x) => `<li>${P.countNum(x.u, 'mo-count__n')}<span class="mo-count__l">${bi(x.label)}</span></li>`).join('')}</ol>
      <p class="mo-count__done" data-count-done hidden></p>
    </div>
    <div class="mo-btns">${P.calendarBtn('mo-btn')}${P.shareBtn('mo-btn mo-btn--line')}</div>` });

  out.push({ id: 'pg-bless', title: txt('bless.title'), html: `${head(null, txt('bless.title'), 'pg-bless-t')}
    ${P.lead ? `<figure class="mo-frame mo-frame--lead">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 700px) 60vw, 260px')}</figure>` : ''}
    ${on(txt('couple.line')) ? `<p class="mo-lead mo-lead--sm">${bi(txt('couple.line'))}</p>` : ''}
    <p class="mo-sign">${bi(config.hosts)}</p>` });
  return out;
}

/** the farman as nested pages: every page hangs from the right edge of the one before it (the concertina) */
function farman(ctx, list) {
  const roman = (i) => ({ en: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][i] || String(i + 1), ne: ctx.neNum(String(i + 1)) });
  const build = (i) => {
    if (i >= list.length) return '';
    const p = list[i];
    return `<div class="mo-pan" data-i="${i}">
      <div class="mo-leaf">
        <article class="mo-face" id="${p.id}" aria-labelledby="${p.id}-t">
          <span class="mo-shade" aria-hidden="true"></span>
          <div class="mo-fit">
            <span class="mo-folio" aria-hidden="true"><img src="${A}lac-sm.webp" alt="" loading="lazy" decoding="async" /><b>${ctx.bi(roman(i))}</b></span>
            ${p.html}
          </div>
        </article>
        <div class="mo-back" aria-hidden="true"></div>
      </div>
      ${build(i + 1)}
    </div>`;
  };
  return build(0);
}

function page(ctx) {
  const { bi, esc: e, txt, parts: P, c, config } = ctx;
  const list = pages(ctx);
  ctx.mo = { list };
  const L = letters(ctx);
  const photos = P.photos;
  const tilt = [-1.6, 1.2, -0.8, 1.7, -1.3, 0.9, -1.1, 1.4, -0.6];
  return `${INK}
  <section class="su-hero mo-hero" id="top" aria-label="${e(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${hero(ctx)}
    ${P.cue('farman')}
  </section>

  <section class="mo-farman" id="farman" aria-label="${e(txt('decree.kicker').en || 'The decree')}">
    <div class="mo-stage"><div class="mo-strip-3d">${farman(ctx, list)}</div></div>
    <img class="mo-tassel mo-tassel--l" src="${A}tassel.webp" alt="" loading="lazy" decoding="async" aria-hidden="true" />
    <img class="mo-tassel mo-tassel--r" src="${A}tassel.webp" alt="" loading="lazy" decoding="async" aria-hidden="true" />
    <p class="mo-folios" aria-hidden="true"><span class="mo-folios__n"></span></p>
  </section>

  ${photos.length ? `
  <section class="mo-gal" id="photos" aria-labelledby="gal-title">
    <header class="mo-gal__head su-rise"><h2 class="mo-h mo-h--cloth" id="gal-title">${bi(txt('gallery.title'))}</h2></header>
    <div class="mo-gal__grid">${photos.map((g, i) => `<figure class="mo-frame mo-por su-rise" style="--tilt:${tilt[i % tilt.length]}deg">${P.photoBtn(g, i, '(max-width: 700px) 42vw, 300px', 'mo-frame__btn')}</figure>`).join('')}</div>
  </section>` : ''}

  <section class="mo-rsvp" id="rsvp" aria-labelledby="rsvp-title">
    <div class="mo-khata">
      <div class="mo-khata__page">
        <header class="mo-khata__head">
          <p class="mo-k">${bi(txt('rsvp.kicker'))}</p>
          <h2 class="mo-h" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
          ${(P.deadline?.en || P.deadline?.ne) ? `<p class="mo-khata__by">${bi(P.deadline)}</p>` : ''}
        </header>
        <div class="mo-entry" aria-live="polite">
          <span class="mo-entry__l">${bi(txt('rsvp.entry'))}</span>
          <span class="mo-entry__ink"><span class="mo-entry__name" id="mo-ink-name"></span><i class="mo-entry__mask" aria-hidden="true"></i></span>
          ${lalmohar(L, ctx, 'mo-lal--entry')}
        </div>
        ${P.rsvpForm()}
      </div>
      <div class="mo-khata__cover" aria-hidden="true">
        <span class="mo-khata__plate">${bi(txt('rsvp.kicker'))}</span>
        <i class="mo-khata__tie"></i>
      </div>
    </div>
  </section>

  <footer class="mo-close" aria-label="Blessing">
    <span class="mo-close__seal" aria-hidden="true"><img src="${A}lac.webp" alt="" loading="lazy" decoding="async" />${impression(L)}</span>
    <p class="mo-close__ne" lang="ne">${e(config.closing?.ne || '')}</p>
    <p class="mo-close__en l-en">${e(config.closing?.en || '')}</p>
    <p class="mo-close__names">${ctx.names('&amp;')}</p>
    ${c.hashtag ? `<p class="mo-close__tag">${e(c.hashtag)}</p>` : ''}
    ${P.madeWith()}
  </footer>`;
}

// ═════════ motion ═════════
const S = { p: 0, stamped: false, lifted: false, busy: false, hover: null, hold: null, t0: 0, auto: false };
const $ = (s, r = document) => r.querySelector(s);

/** where the packet is: the middle third of the decree, measured; the opening's pieces sit on it */
function placeGate() {
  const g = document.getElementById('gate'); const mid = $('.mo-fold--mid');
  if (!g || !mid) return;
  const r = mid.getBoundingClientRect();
  g.style.setProperty('--px', `${r.left}px`); g.style.setProperty('--py', `${r.top}px`);
  g.style.setProperty('--pw', `${r.width}px`); g.style.setProperty('--ph', `${r.height}px`);
}
/** the press, 0 (hovering) → 1 (pressed into the lac) */
function renderPress(p) {
  const q = gsap.parseEase('power2.in')(p);
  gsap.set('.mo-seal', { scale: 1.42 - 0.42 * q, xPercent: 16 * (1 - q), yPercent: -26 * (1 - q) });
  gsap.set('.mo-shadow', { scale: 1.3 - 0.3 * q, xPercent: 30 * (1 - q), yPercent: 6 * (1 - q), opacity: 0.22 + 0.5 * q });
  gsap.set('.mo-lac', { scale: 0.5 + 0.5 * gsap.parseEase('power2.out')(Math.min(1, p * 1.15)) });
}
function thud() {
  try { navigator.vibrate?.(18); } catch { /* optional */ }
  gsap.fromTo('#mo-pk', { y: 0, scale: 1 }, { keyframes: [{ y: 2, scale: 0.996, duration: 0.07 }, { y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }] });
}
function lift(tl, at = 0) {
  const t = tl || gsap.timeline();
  t.to('.mo-seal', { scale: 1.3, xPercent: 24, yPercent: -70, opacity: 0, duration: 0.6, ease: 'power2.inOut' }, at)
    .to('.mo-shadow', { opacity: 0, scale: 1.4, xPercent: 50, duration: 0.5, ease: 'power2.in' }, at)
    .fromTo('.mo-pk .mo-imp', { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power1.out' }, at + 0.12)
    .fromTo('.mo-sheen b', { xPercent: -160, opacity: 0 }, { xPercent: 160, opacity: 1, duration: 0.9, ease: 'power2.inOut' }, at + 0.2)
    .to('.mo-sheen b', { opacity: 0, duration: 0.25 }, at + 0.95);
  S.lifted = true;
  document.getElementById('gate')?.classList.add('is-stamped');
  return t;
}

function readyGate(ctx, go) {
  const press = $('#mo-press');
  if (!press) return;
  placeGate();
  let raf = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(placeGate); });
  if (ctx.reduced) {
    // still: the seal is already pressed and lifted, the monogram in the lac
    S.p = 1; S.stamped = true; S.lifted = true;
    gsap.set('.mo-seal, .mo-shadow', { opacity: 0 });
    gsap.set('.mo-pk .mo-imp', { opacity: 1 });
    document.getElementById('gate')?.classList.add('is-stamped', 'is-still');
    press.addEventListener('click', go);
    return;
  }
  renderPress(0);
  gsap.set('.mo-pk .mo-imp', { opacity: 0 });
  // an invitation to touch: the seal floats a hair above the lac
  S.hover = gsap.to('.mo-seal img', { y: -3, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  const down = (e) => {
    if (S.busy) return;
    e.preventDefault();
    if (S.lifted) { go(); return; }
    press.setPointerCapture?.(e.pointerId);
    S.t0 = performance.now();
    S.hover?.pause(); gsap.to('.mo-seal img', { y: 0, duration: 0.2 });
    S.hold?.kill();
    S.hold = gsap.to(S, { p: 1, duration: 0.95 * (1 - S.p), ease: 'none', onUpdate: () => renderPress(S.p),
      onComplete: () => { S.stamped = true; thud(); if (S.auto || !press.classList.contains('is-down')) lift(); } });
    press.classList.add('is-down');
  };
  const up = () => {
    if (!press.classList.contains('is-down')) return;
    press.classList.remove('is-down');
    if (S.stamped && !S.lifted) { lift(); return; }
    if (!S.stamped && performance.now() - S.t0 < 260) {
      // a quick tap: the whole opening runs by itself (and the music may start in this very gesture)
      S.hold?.kill(); go();
    }
    // a hold let go early: the press finishes and the seal lifts (onComplete)
  };
  press.addEventListener('pointerdown', down);
  press.addEventListener('pointerup', up);
  press.addEventListener('pointercancel', up);
  press.addEventListener('lostpointercapture', up);
}

function openTimeline(tl, gateEl) {
  S.busy = true; S.auto = true;
  S.hover?.kill(); S.hold?.kill();
  let t = 0.05;
  if (!S.stamped) {
    const from = S.p;
    tl.to(S, { p: 1, duration: 0.55 * (1 - from) + 0.15, ease: 'none', onUpdate: () => renderPress(S.p) }, t);
    t += 0.55 * (1 - from) + 0.15;
    tl.call(() => { S.stamped = true; thud(); }, null, t);
    t += 0.18;
  }
  if (!S.lifted) { lift(tl, t); t += 0.75; } else t += 0.05;
  // the lac cracks along its line; the silk slips away to both sides
  tl.to('.mo-half--l', { rotation: -13, xPercent: -14, yPercent: 7, duration: 0.55, ease: 'power3.out' }, t)
    .to('.mo-half--r', { rotation: 11, xPercent: 13, yPercent: 10, duration: 0.55, ease: 'power3.out' }, t)
    .to('.mo-half', { opacity: 0, duration: 0.35, ease: 'power1.in' }, t + 0.35)
    .to('.mo-silk--l', { xPercent: -112, duration: 0.85, ease: 'power3.in' }, t + 0.18)
    .to('.mo-silk--r', { xPercent: 112, duration: 0.85, ease: 'power3.in' }, t + 0.18)
    .to('.mo-tail', { opacity: 0, duration: 0.3 }, t + 0.1)
    .to('#mo-hint', { autoAlpha: 0, duration: 0.25 }, 0)
    .to('.mo-spray', { autoAlpha: 0, y: -16, duration: 0.7, ease: 'power2.in' }, t + 0.2);
  t += 0.95;
  tl.set(gateEl, { autoAlpha: 0 }, t);
  // the decree unfolds: the top third swings up, then the bottom third down
  tl.to('.mo-fold--top', { rotationX: 0, duration: 1.15, ease: 'power3.inOut' }, t - 0.05)
    .to('.mo-fold--bot', { rotationX: 0, duration: 1.15, ease: 'power3.inOut' }, t + 0.22)
    .to('.mo-fold--top', { z: 0, duration: 0.2 }, t + 1.1)
    .to('.mo-fold--bot', { z: 0, duration: 0.2 }, t + 1.3);
  tl.call(() => document.getElementById('mo-sheet')?.classList.remove('is-folded'), null, t + 1.4);
  return t + 0.9;
}

// ───────── the concertina ─────────
function fitPages(root) {
  root.querySelectorAll('.mo-face').forEach((f) => {
    const fit = f.querySelector(':scope > .mo-fit');
    if (!fit) return;
    fit.style.transform = '';
    if (!root.classList.contains('is-h')) return;
    const cs = getComputedStyle(f);
    const room = f.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const s = Math.min(1, room / fit.scrollHeight);
    if (s < 0.995) fit.style.transform = `scale(${s.toFixed(3)})`;
  });
}

function concertina(ctx) {
  const sec = document.getElementById('farman');
  if (!sec) return;
  const pans = [...sec.querySelectorAll('.mo-pan')];
  const leaves = pans.map((p) => p.querySelector(':scope > .mo-leaf'));
  const shades = pans.map((p) => p.querySelector('.mo-shade'));
  const N = pans.length;
  const folio = sec.querySelector('.mo-folios__n');
  const strip = sec.querySelector('.mo-strip-3d');
  const mq = window.matchMedia('(min-width: 900px) and (min-aspect-ratio: 5/4)');
  let gctx = null; let st = null;
  const labelAt = (k) => { if (folio) folio.innerHTML = ctx.bi({ en: `${k + 1} / ${N}`, ne: `${ctx.neNum(String(k + 1))} / ${ctx.neNum(String(N))}` }); };

  const setup = () => {
    gctx?.revert(); st = null;
    sec.classList.toggle('is-h', mq.matches && !ctx.reduced);
    sec.classList.toggle('is-still', !!ctx.reduced);
    pans.forEach((p) => { p.style.transform = ''; });
    leaves.forEach((l) => { l.style.transform = ''; });
    strip.style.transform = '';
    fitPages(sec);
    if (ctx.reduced) return;
    gctx = gsap.context(() => {
      if (sec.classList.contains('is-h')) {
        // sideways: pinned; the closed farman opens like a concertina, then travels page by page
        const MAX = 176;
        const ease = gsap.parseEase('power2.inOut');
        let W = 0; let VW = 0;
        const size = () => {
          const H = Math.min(window.innerHeight * 0.8, 720);
          W = Math.round(Math.min(H * 0.68, 460));
          VW = sec.querySelector('.mo-stage').clientWidth;
          sec.style.setProperty('--W', `${W}px`); sec.style.setProperty('--H', `${Math.round(H)}px`);
          fitPages(sec);
        };
        size();
        const S0 = -0.8; const proxy = { s: S0 };
        let cur = -1;
        const render = () => {
          const s = proxy.s;
          for (let j = 1; j < N; j++) {
            const f = ease(Math.max(0, Math.min(1, s - j + 1.5)));
            const a = (j % 2 ? 1 : -1) * MAX * (1 - f);
            pans[j].style.transform = `rotateY(${a.toFixed(2)}deg)`;
            // a page turned away from the lamp darkens a little
            if (shades[j]) shades[j].style.opacity = (Math.abs(Math.sin((a * Math.PI) / 180)) * 0.5).toFixed(3);
          }
          const c = Math.max(0, Math.min(N - 1, s));
          strip.style.transform = `translate3d(${(VW / 2 - (c + 0.5) * W).toFixed(1)}px,-50%,0)`;
          const k = Math.round(c);
          if (k !== cur) { cur = k; labelAt(k); }
        };
        const span = N - 1 - S0;
        gsap.to(proxy, {
          s: N - 1, ease: 'none', onUpdate: render,
          scrollTrigger: {
            trigger: sec, start: 'top top', end: () => `+=${(N + 0.6) * window.innerHeight * 0.75}`, pin: true, scrub: 0.7, anticipatePin: 1,
            invalidateOnRefresh: true,
            snap: { snapTo: [0, ...pans.map((_, i) => (i - S0) / span)], duration: { min: 0.25, max: 0.7 }, delay: 0.1, ease: 'power2.inOut' },
            onRefresh: (self) => { st = self; size(); render(); },
            onUpdate: (self) => { st = self; },
          },
        });
        render();
        const goTo = (i) => {
          if (!st) return;
          const y = st.start + (st.end - st.start) * ((i - S0) / span);
          const l = ctx.lenis?.();
          if (l) l.scrollTo(y, { force: true }); else window.scrollTo({ top: y, behavior: 'smooth' });
        };
        pans.forEach((p, i) => p.querySelector(':scope > .mo-leaf > .mo-face').addEventListener('focusin', () => { if (cur !== i) goTo(i); }));
        sec.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', () => fitPages(sec)));
        if (new URLSearchParams(location.search).has('debug')) window.__mo = { go: (i) => goTo(i), N, at: (s) => { proxy.s = s; render(); } };
      } else {
        // downward: every page swings down from the fold above it as it arrives (scrubbed)
        leaves.forEach((leaf, i) => {
          const a = i % 2 ? -46 : 64;
          gsap.fromTo(leaf, { rotationX: a, transformPerspective: 1100, transformOrigin: '50% 0%' }, {
            rotationX: 0, ease: 'none',
            scrollTrigger: { trigger: pans[i], start: 'top 96%', end: 'top 48%', scrub: 0.5 },
          });
          if (shades[i]) gsap.fromTo(shades[i], { opacity: 0.55 }, { opacity: 0, ease: 'none', scrollTrigger: { trigger: pans[i], start: 'top 96%', end: 'top 50%', scrub: 0.5 } });
        });
      }
    }, sec);
  };
  setup();
  labelAt(0);
  let was = mq.matches;
  mq.addEventListener('change', () => { if (mq.matches !== was) { was = mq.matches; setup(); ctx.ScrollTrigger.refresh(); } });
  document.fonts?.ready.then(() => { fitPages(sec); ctx.ScrollTrigger.refresh(); });
}

// ───────── the register (RSVP): the cover lifts once; a reply is inked into the book ─────────
function register(ctx) {
  const book = $('.mo-khata');
  const form = document.getElementById('rsvp-form');
  const status = document.getElementById('rsvp-status');
  const ink = document.getElementById('mo-ink-name');
  if (!book) return;
  if (ctx.reduced) book.classList.add('is-open');
  else {
    gsap.set('.mo-khata__cover', { transformPerspective: 1400, transformOrigin: '50% 0%' });
    ctx.ScrollTrigger.create({
      trigger: book, start: 'top 62%', once: true,
      onEnter: () => gsap.timeline({ onComplete: () => book.classList.add('is-open') })
        .to('.mo-khata__cover', { rotationX: 104, duration: 1.05, ease: 'power3.inOut' })
        .set('.mo-khata__cover', { autoAlpha: 0 }),
    });
  }
  let name = '';
  form?.addEventListener('submit', () => { name = (form.querySelector('#f-name')?.value || '').trim(); }, true);
  if (status && ink) {
    new MutationObserver(() => {
      const en = status.querySelector('.l-en');
      if (!name || status.classList.contains('is-error') || !en || !/^Thank you/.test(en.textContent)) return;
      ink.textContent = name; name = '';
      const box = $('.mo-entry');
      box.classList.add('is-signed');
      if (ctx.reduced) return;
      gsap.fromTo('.mo-entry__mask', { scaleX: 1 }, { scaleX: 0, duration: 1.1, ease: 'power2.inOut' });
      gsap.fromTo('.mo-lal--entry', { scale: 1.35, opacity: 0, rotation: -14 }, { scale: 1, opacity: 0.92, rotation: -8, duration: 0.32, ease: 'power3.in', delay: 0.95 });
    }).observe(status, { childList: true });
  }
}

const SPEC = {
  slug: 'mohar',
  // the shared engine asks for 'ganesh.show'; Mohar has no Ganesh picture, so it is set here and never shown in the studio
  manifest: { ...manifest, texts: { ...manifest.texts, 'ganesh.show': { label: '', default: { en: 'off', ne: 'off' }, max: 8 } } },
  bell: false,
  gate: (ctx) => gate(ctx),
  hero: (ctx) => hero(ctx),
  page: (ctx) => page(ctx),
  ready: (ctx) => {
    document.body.classList.add('mo');
    const sheet = document.getElementById('mo-sheet');
    if (!ctx.reduced && sheet) {
      sheet.classList.add('is-folded');
      gsap.set('.mo-fold--top', { rotationX: -180, z: 2, transformOrigin: '50% 100%' });
      gsap.set('.mo-fold--bot', { rotationX: 180, z: 1, transformOrigin: '50% 0%' });
    }
    document.fonts?.ready.then(fitRings);
  },
  gateTap: (ctx, go) => readyGate(ctx, go),
  open: (ctx, tl, gateEl) => openTimeline(tl, gateEl),
  ambient: () => { fitRings(); },
  scroll: (ctx) => { concertina(ctx); register(ctx); fitRings(); },
};
mountSuite(SPEC);
