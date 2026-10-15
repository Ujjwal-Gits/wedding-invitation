// Theme · Janti (जन्ती) — walk with the groom's procession down an old Newari street to the bride's house.
// Gate: a painted Kathmandu street at dusk. Under a fresh marigold toran stands a carved Newari window with Ganesh in its
// torana and its red doli curtain drawn; the Naumati Baja band waits just past the left edge. Tap: the band strikes up,
// the procession walks into the street, the toran swings, dusk lifts to golden hour and the curtain rolls up to show the
// names. That is the one signature motion.
// Then vertical scroll walks you DOWN the street: the painting drifts slowly behind, the stops pass at walking pace, brass
// lamps and kalash in the foreground pass fastest, and the janti walks along the bottom of the screen with you. Each stop
// is a piece of the street: a signpost, a carved window (the couple), the doli whose curtain is the scratch card, a temple
// bell over the countdown, hanging shop signs (families, one per ceremony), a brick facade of carved windows (photos) and
// the bride's house. The street ends at her door: the invitation, the RSVP in the door frame, the blessing.
// Engine: src/themes/_suite/suite.js (T.page, T.scroll, T.scratch); kit: _suite/nepali.js.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mountSuite } from '../_suite/suite.js';
import manifest from './slots.js';
import { lamp, kalash as npKalash, toran as npToran, initNepali } from '../_suite/nepali.js';
import './janti.css';
import { A, torana, jantiWalkers, heroHtml, heroPrepare, heroEnter, heroScroll } from './parts.js';

// a reload mid-page must start at the gate, not at the restored scroll position behind it
// (ScrollTrigger owns history.scrollRestoration and resets it on every refresh, so set it through ScrollTrigger)
ScrollTrigger.clearScrollMemory('manual');

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const L = {
  couple: { en: 'The couple', ne: 'दुलहा दुलही' },
  day: { en: 'The day', ne: 'शुभ दिन' },
  families: { en: 'The families', ne: 'परिवार' },
  events: { en: 'Celebrations', ne: 'कार्यक्रम' },
  photos: { en: 'Photographs', ne: 'तस्बिर' },
  house: { en: 'The bride’s house', ne: 'बेहुलीको घर' },
  famOf: { bride: { en: 'The bride’s family', ne: 'बेहुली पक्ष' }, groom: { en: 'The groom’s family', ne: 'बेहुला पक्ष' } },
  toDoor: { en: 'Reply at the door', ne: 'ढोकामा जवाफ दिनुहोस्' },
  letter: { en: 'With folded hands', ne: 'सादर निमन्त्रणा' },
  bell: { en: 'Until the band plays at the door', ne: 'ढोकामा बाजा बज्न बाँकी' },
};

// ───────── ornaments (inline SVG) ─────────
/** the brass temple bell over the countdown */
const bell = () => `<svg class="jt-bell" viewBox="0 0 80 112" aria-hidden="true" focusable="false">
  <defs><linearGradient id="jtBrass" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#6E4A12" /><stop offset=".32" stop-color="#D9AE52" /><stop offset=".5" stop-color="#F6DE9C" /><stop offset=".7" stop-color="#C2923A" /><stop offset="1" stop-color="#6E4A12" /></linearGradient></defs>
  <path d="M40 0v12" stroke="#5A3A12" stroke-width="2.4" />
  <circle cx="40" cy="17" r="5.5" fill="none" stroke="url(#jtBrass)" stroke-width="3" />
  <path d="M40 22c-13 0-19.5 9-20.5 25-1 17-5.5 29-15.5 37h72c-10-8-14.5-20-15.5-37-1-16-7.5-25-20.5-25z" fill="url(#jtBrass)" />
  <path d="M27 40h26M24 60h32" stroke="#7A5216" stroke-opacity=".55" stroke-width="1.4" fill="none" />
  <rect x="1" y="83" width="78" height="6" rx="3" fill="url(#jtBrass)" />
  <circle cx="40" cy="98" r="6.5" fill="#7A5216" /><circle cx="38" cy="96" r="2" fill="#F6DE9C" opacity=".7" />
</svg>`;
/** the doli's pagoda roof: gilded finial, two tiers in sindoor red with gold edges, a scalloped trim */
function doliRoof() {
  const sc = []; for (let x = 34; x <= 266; x += 11.6) sc.push(`<circle cx="${x.toFixed(1)}" cy="88" r="5" />`);
  return `<svg class="jt-doli__roof" viewBox="0 0 300 96" aria-hidden="true" focusable="false">
    <path class="jt-gd" d="M150 1c5 7 5 12 0 17-5-5-5-10 0-17z" /><circle class="jt-gd" cx="150" cy="23" r="5.5" /><path class="jt-gd" d="M141 29h18l-3 7h-12z" />
    <path class="jt-rf" d="M150 34C122 39 98 50 70 60H230C202 50 178 39 150 34Z" /><path class="jt-gl" d="M70 60C98 50 122 39 150 34C178 39 202 50 230 60" />
    <path class="jt-rf" d="M58 58H242C262 66 282 71 298 68C291 77 276 81 262 81H38C24 81 9 77 2 68C18 71 38 66 58 58Z" />
    <path class="jt-gl" d="M2 68C18 71 38 66 58 58H242C262 66 282 71 298 68" /><path class="jt-gd" d="M30 80H270V85H30Z" />
    <g class="jt-gd">${sc.join('')}</g>
  </svg>`;
}

/** which ceremony is this? → a small painted motif on its sign */
function kind(ev) {
  const s = `${ev.id} ${ev.title?.en || ''} ${ev.title?.ne || ''}`.toLowerCase();
  if (/mehe?ndi|मेहे?न्दी|henna/.test(s)) return 'mehendi';
  if (/haldi|hardi|हल्दी|besar|बेसार/.test(s)) return 'haldi';
  if (/recep|bhoj|भोज|रिसेप्सन|party/.test(s)) return 'reception';
  return 'wedding';
}

// ───────── the doli curtain (scratch cover): sindoor velvet in folds, gold zari borders, a tassel ─────────
function paintCurtain(c, w, h, dpr, hint) {
  const cs = getComputedStyle(document.body);
  const red = cs.getPropertyValue('--jt-red').trim() || '#A3261B';
  const gold = cs.getPropertyValue('--jt-gold').trim() || '#D9A847';
  c.fillStyle = red; c.fillRect(0, 0, w, h);
  const folds = Math.max(6, Math.round(w / (34 * dpr)));
  for (let i = 0; i < folds; i++) { // velvet folds
    const x0 = (i * w) / folds; const fw = w / folds;
    const g = c.createLinearGradient(x0, 0, x0 + fw, 0);
    g.addColorStop(0, 'rgba(25,0,0,.34)'); g.addColorStop(0.42, 'rgba(255,214,190,.10)'); g.addColorStop(0.58, 'rgba(255,226,206,.16)'); g.addColorStop(1, 'rgba(25,0,0,.34)');
    c.fillStyle = g; c.fillRect(x0, 0, fw + 1, h);
  }
  const v = c.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(20,0,0,.4)'); v.addColorStop(0.3, 'rgba(20,0,0,0)'); v.addColorStop(0.8, 'rgba(20,0,0,0)'); v.addColorStop(1, 'rgba(20,0,0,.3)');
  c.fillStyle = v; c.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 700; i++) { c.fillStyle = Math.random() > 0.5 ? 'rgba(255,210,190,.06)' : 'rgba(20,0,0,.12)'; c.fillRect(Math.random() * w, Math.random() * h, dpr, dpr); }
  // zari butti: small gold diamonds on a lattice
  c.fillStyle = gold; c.globalAlpha = 0.55;
  const st = 30 * dpr; const d = 2.2 * dpr;
  for (let y = 54 * dpr; y < h - 40 * dpr; y += st) for (let x = ((y / st) % 2 ? st / 2 : 0) + 18 * dpr; x < w - 12 * dpr; x += st) { c.beginPath(); c.moveTo(x, y - d); c.lineTo(x + d, y); c.lineTo(x, y + d); c.lineTo(x - d, y); c.fill(); }
  c.globalAlpha = 1;
  // gold borders: the cabin's pillars and the valance
  const band = (x, y, bw, bh) => { const g = c.createLinearGradient(x, y, x + bw, y + bh); g.addColorStop(0, '#8A5E1C'); g.addColorStop(0.5, '#F3D58C'); g.addColorStop(1, '#8A5E1C'); c.fillStyle = g; c.fillRect(x, y, bw, bh); };
  band(0, 0, 7 * dpr, h); band(w - 7 * dpr, 0, 7 * dpr, h);
  const vh = 22 * dpr;
  c.fillStyle = 'rgba(40,0,0,.35)'; c.fillRect(0, 0, w, vh);
  band(0, vh - 4 * dpr, w, 4 * dpr);
  c.fillStyle = gold;
  for (let x = 6 * dpr; x < w; x += 12 * dpr) { c.beginPath(); c.arc(x, vh, 4.2 * dpr, 0, Math.PI); c.fill(); }
  // the tassel at the centre, hanging from the valance
  const cx = w / 2;
  c.strokeStyle = gold; c.lineWidth = 1.4 * dpr; c.beginPath(); c.moveTo(cx, vh); c.lineTo(cx, vh + 26 * dpr); c.stroke();
  const tg = c.createLinearGradient(cx - 7 * dpr, 0, cx + 7 * dpr, 0); tg.addColorStop(0, '#8A5E1C'); tg.addColorStop(0.5, '#F6DE9C'); tg.addColorStop(1, '#8A5E1C');
  c.fillStyle = tg; c.beginPath(); c.arc(cx, vh + 31 * dpr, 6 * dpr, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(cx - 5 * dpr, vh + 35 * dpr); c.lineTo(cx + 5 * dpr, vh + 35 * dpr); c.lineTo(cx + 8 * dpr, vh + 58 * dpr); c.lineTo(cx - 8 * dpr, vh + 58 * dpr); c.closePath(); c.fill();
  // the hint, on a small cream ribbon
  const deva = /[ऀ-ॿ]/.test(hint);
  const size = Math.round(Math.min(w / 16, 19 * dpr));
  c.font = deva ? `700 ${size}px Sura, Mukta, serif` : `400 ${size}px 'Yeseva One', Georgia, serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const tw = Math.min(w - 30 * dpr, c.measureText(hint).width + 34 * dpr); const ty = h * 0.62; const th = size * 2.1;
  c.fillStyle = 'rgba(251,244,230,.94)'; c.beginPath(); c.moveTo(cx - tw / 2, ty - th / 2); c.lineTo(cx + tw / 2, ty - th / 2); c.lineTo(cx + tw / 2 - 8 * dpr, ty); c.lineTo(cx + tw / 2, ty + th / 2); c.lineTo(cx - tw / 2, ty + th / 2); c.lineTo(cx - tw / 2 + 8 * dpr, ty); c.closePath(); c.fill();
  c.fillStyle = red; c.fillText(hint, cx, ty + (deva ? size * 0.06 : size * 0.04));
  c.strokeStyle = '#000'; c.fillStyle = '#000'; c.globalAlpha = 1; // the engine wipes with the current stroke: keep it opaque
}

// ───────── the page after the gate ─────────
function page(ctx) {
  const { bi, esc, txt, on, AD, BS, mainEv, placeLine, config, c, parts: P, neNum } = ctx;
  const time = mainEv ? { en: AD.time, ne: ctx.timeLabel(mainEv).ne } : null;
  const bsS = (b) => (b.full.short?.en ? (/B\.S\./.test(b.full.short.en) ? b.full.short.en : `${b.full.short.en} B.S.`) : b.full.en);
  const inv = txt('hero.invocation');
  const lead = P.lead;
  const janti = jantiWalkers;
  const plaque = (title, id = '', cls = '') => `<h2 class="jt-plaque ${cls}"${id ? ` id="${id}"` : ''}><span>${bi(title)}</span></h2>`;
  const hang = (inner, cls = '') => `<div class="jt-hang ${cls}"><span class="jt-hang__post" aria-hidden="true"></span><span class="jt-hang__arm" aria-hidden="true"></span><span class="jt-hang__chain" aria-hidden="true"></span>${inner}</div>`;
  const stop = (id, cls, inner, label = '') => `<article class="jt-stop jt-stop--${cls}"${id ? ` id="${id}"` : ''}${label ? ` aria-labelledby="${label}"` : ''}><div class="jt-stop__in">${inner}</div></article>`;

  // ── hero: the carved window with Ganesh in its torana, the doli curtain rolled up over the names ──
  const hero = heroHtml(ctx);

  // ── the street's stops ──
  const signs = [lead ? ['couple', L.couple] : null, ['date', L.day], ['families', L.families], P.events.length ? ['programme', L.events] : null, P.photos.length ? ['photos', L.photos] : null, ['arrive', L.house]].filter(Boolean);
  const post = stop('', 'post', `
    <div class="jt-post">
      <span class="jt-post__pole" aria-hidden="true"></span>
      <h2 class="jt-post__title" id="walk-title"><span>${bi(txt('walk.title'))}</span></h2>
      <ul class="jt-post__signs">${signs.map(([id, lab], i) => `<li style="--r:${[-2.2, 1.6, -1.2, 2, -1.8, 1.2][i % 6]}deg"><a class="jt-arrow" href="#${id}" data-go="${id}">${bi(lab)}<i aria-hidden="true"></i></a></li>`).join('')}</ul>
    </div>
    ${on(txt('walk.line')) ? `<p class="jt-post__line">${bi(txt('walk.line'))}</p>` : ''}`, 'walk-title');

  const couple = lead ? stop('couple', 'couple', `
    ${plaque(txt('couple.title'), 'couple-title')}
    <div class="jt-facade jt-facade--one">
      <figure class="jt-win jt-win--lead"><span class="jt-win__lintel" aria-hidden="true"></span><span class="jt-win__pic">${ctx.imgTag(lead.photo, lead.alt, '(max-width: 700px) 70vw, 360px')}</span><span class="jt-win__sill" aria-hidden="true"></span></figure>
    </div>
    ${on(txt('couple.line')) ? `<p class="jt-note">${bi(txt('couple.line'))}</p>` : ''}`, 'couple-title') : '';

  const face = `<div class="jt-dface">
      <p class="jt-dface__k">${bi(txt('date.kicker'))}</p>
      <p class="jt-dface__wd">${bi(AD.wd)}</p>
      <p class="jt-dface__day">${bi({ en: AD.day, ne: BS.day || neNum(AD.day) })}</p>
      <p class="jt-dface__my">${bi({ en: `${AD.month.en} ${AD.year}`, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</p>
      ${time ? `<p class="jt-dface__t">${bi(time)}</p>` : ''}
      <p class="jt-dface__alt">${bi({ en: bsS(BS), ne: AD.full.ne })}</p>
      ${placeLine?.en || placeLine?.ne ? `<p class="jt-dface__place">${bi(placeLine)}</p>` : ''}
    </div>`;
  const date = stop('date', 'date', `
    ${plaque(txt('date.title'), 'date-title')}
    <div class="jt-doli"><div class="jt-doli__top">${doliRoof()}<span class="jt-doli__pole" aria-hidden="true"></span></div>${P.scratch(face, 'jt-scratch')}</div>`, 'date-title');

  const count = stop('count', 'count', `
    ${hang(`${bell()}<div class="jt-board jt-countb" data-countdown>
        <p class="jt-countb__t">${bi(txt('count.title'))}</p>
        <ol class="su-count__grid jt-count" aria-label="${esc(txt('count.title').en)}">${P.countUnits.map(({ u, label }) => `<li class="jt-count__c">${P.countNum(u, 'jt-count__n')}<span class="jt-count__l">${bi(label)}</span></li>`).join('')}</ol>
        <p class="jt-count__done" data-count-done hidden></p>
      </div>`, 'jt-hang--bell')}`);

  const famBoard = (f) => {
    const p = f.person;
    return hang(`<div class="jt-board jt-famb">
      ${P.brideGroom && f.photo ? `<figure class="jt-famb__pic">${ctx.imgTag(f.photo, p.name.en, '120px')}</figure>` : ''}
      <p class="jt-kick">${bi(L.famOf[f.key])}</p>
      <h3 class="jt-famb__name">${bi(p.fullName)}</h3>
      ${p.parents?.en || p.parents?.ne ? `<p class="jt-famb__of">${bi(f.of)}</p><p class="jt-famb__par">${bi(p.parents)}</p>` : ''}
      ${p.home?.en || p.home?.ne ? `<p class="jt-famb__home">${bi(p.home)}</p>` : ''}
    </div>`);
  };
  const families = stop('families', 'fam', `
    ${plaque(txt('families.title'), 'fam-title')}
    <div class="jt-fam">${famBoard(P.families[0])}<div class="jt-fam__mid" aria-hidden="true">${npKalash('jt-fam__kalash', '110px')}</div>${famBoard(P.families[1])}</div>`, 'fam-title');

  const evs = P.events.map((ev, i) => {
    const dress = ev.dress.colors.length || ev.dress.text?.en || ev.dress.text?.ne;
    return stop(i ? `ev-${esc(ev.id)}` : 'programme', 'ev', `
      ${i ? '' : plaque(txt('prog.title'), 'prog-title')}
      ${hang(`<div class="jt-board jt-ev jt-ev--${kind(ev.e)}"${i ? '' : ` id="ev-${esc(ev.id)}"`}>
        <p class="jt-kick">${bi({ en: `Celebration ${ROMAN[i] || i + 1}`, ne: `कार्यक्रम ${neNum(String(i + 1))}` })}</p>
        <h3 class="jt-ev__title">${bi(ev.title)}</h3>
        <div class="jt-ev__when">
          <p class="jt-ev__day">${bi({ en: ev.ad.day, ne: ev.bs.day || neNum(ev.ad.day) })}</p>
          <div class="jt-ev__dt"><p class="jt-ev__my">${bi({ en: `${ev.ad.wd.en}, ${ev.ad.month.en} ${ev.ad.year}`, ne: ev.bs.month && ev.bs.year ? `${ev.ad.wd.ne}, ${ev.bs.month} ${ev.bs.year}` : ev.ad.full.ne })}</p>
          <p class="jt-ev__time">${bi(ev.time)}</p></div>
        </div>
        <p class="jt-ev__alt">${bi({ en: bsS(ev.bs), ne: ev.ad.full.ne })}</p>
        ${ev.blurb ? `<p class="jt-ev__blurb">${bi(ev.blurb)}</p>` : ''}
        <p class="jt-ev__venue">${bi(ev.venue)} <a class="su-link" href="${esc(ev.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
        ${dress ? `<p class="jt-ev__dress">${ev.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : P.UI.wear)}</span></p>` : ''}
        ${ev.rituals.length ? `<details class="jt-order"><summary>${bi(P.UI.order)}</summary><ol data-lenis-prevent>${ev.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
      </div>`)}`, i ? '' : 'prog-title');
  }).join('');

  const photos = P.photos.length ? stop('photos', 'gal', `
    ${plaque(txt('gallery.title'), 'gal-title')}
    <div class="jt-facade jt-facade--row">${P.photos.map((g, i) => `<figure class="jt-win ${i % 2 ? 'jt-win--lo' : ''}"><span class="jt-win__lintel" aria-hidden="true"></span><button type="button" class="jt-win__pic su-gal__btn" data-lb-idx="${i}" aria-label="${esc(g.alt || 'Open photograph')}"><img src="${esc(ctx.photoUrl(g.photo, 'sm'))}" srcset="${esc(ctx.photoUrl(g.photo, 'sm'))} 1280w, ${esc(ctx.photoUrl(g.photo, 'lg'))} 2560w" sizes="(max-width: 700px) 70vw, 360px" alt="${esc(g.alt || '')}" decoding="async" /></button><span class="jt-win__sill" aria-hidden="true"></span></figure>`).join('')}</div>`, 'gal-title') : '';

  const arrive = stop('arrive', 'arrive', `
    <div class="jt-gate2">
      ${npToran('jt-gate2__toran', '(max-width: 700px) 90vw, 560px')}
      <div class="jt-board jt-arriveb">
        <h2 class="jt-arriveb__t" id="arrive-title">${bi(txt('arrive.title'))}</h2>
        ${on(txt('arrive.line')) ? `<p class="jt-arriveb__l">${bi(txt('arrive.line'))}</p>` : ''}
        <a class="jt-arriveb__go" href="#rsvp" data-go="rsvp">${bi(L.toDoor)}<i aria-hidden="true"></i></a>
      </div>
      <div class="jt-gate2__step" aria-hidden="true">${npKalash('jt-gate2__kal', '120px')}${lamp('panas', { cls: 'jt-gate2__lamp', sizes: '60px' })}${lamp('panas', { cls: 'jt-gate2__lamp', sizes: '60px' })}${npKalash('jt-gate2__kal', '120px')}</div>
    </div>`, 'arrive-title');

  const nStops = 3 + (lead ? 1 : 0) + 1 + P.events.length + (P.photos.length ? 1 : 0) + 1;
  const props = Array.from({ length: nStops }, (_, i) => `<span class="jt-prop jt-prop--${i % 3 === 1 ? 'kalash' : 'lamp'}">${i % 3 === 1 ? npKalash('', '90px') : lamp('panas', { sizes: '60px' })}</span>`).join('');

  return `
  <section class="su-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${hero}
    ${P.cue('walk')}
  </section>

  <section class="jt-walk" id="walk" aria-label="${esc(txt('walk.title').en)}">
    <div class="jt-walk__far" aria-hidden="true"><img src="${A}street-sm.webp" srcset="${A}street-sm.webp 900w, ${A}street.webp 2048w" sizes="(max-width: 760px) 1700px, 2200px" alt="" decoding="async" /></div>
    <div class="jt-walk__track">${post}${couple}${date}${count}${families}${evs}${photos}${arrive}</div>
    ${janti('jt-walk__janti')}
    <div class="jt-walk__near" aria-hidden="true">${props}</div>
    <div class="jt-walk__bunt jt-toranstrip" aria-hidden="true"></div>
  </section>

  <div class="jt-house">
    <div class="jt-house__lintel" aria-hidden="true"></div>
    <div class="jt-house__toran jt-toranstrip" aria-hidden="true"></div>

    <section class="jt-sec jt-card" id="card" aria-labelledby="card-title">
      <div class="jt-card__in jt-up">
        <img class="jt-card__gan" src="/themes/_nepali/ganesh-ink-sm.webp" srcset="/themes/_nepali/ganesh-ink-sm.webp 456w, /themes/_nepali/ganesh-ink.webp 1064w" sizes="(max-width: 760px) 120px, 260px" alt="" loading="lazy" decoding="async" />
        <p class="jt-kick">${bi(L.letter)}</p>
        <h2 class="jt-card__line" id="card-title">${bi(txt('card.line'))}</h2>
        <p class="jt-card__hosts">${bi(config.hosts)}</p>
        <div class="jt-btns">${P.cardBtn()}${P.calendarBtn('su-btn--line')}${P.shareBtn()}</div>
        ${P.moreInfo()}
      </div>
    </section>

    <section class="jt-sec jt-rsvp" id="rsvp" aria-labelledby="rsvp-title">
      <div class="jt-door jt-up">
        ${torana(npKalash('jt-door__kal', '80px'), 'jt-door__torana')}
        <div class="jt-door__lintel"><h2 class="jt-door__title" id="rsvp-title">${bi(txt('rsvp.title'))}</h2></div>
        <div class="jt-door__frame">
          ${P.deadline?.en || P.deadline?.ne ? `<p class="jt-door__dl">${bi(P.deadline)}</p>` : ''}
          ${P.rsvpForm()}
        </div>
        <div class="jt-door__step" aria-hidden="true">${lamp('diyo', { cls: 'jt-door__diyo', sizes: '80px' })}${lamp('diyo', { cls: 'jt-door__diyo', sizes: '80px' })}</div>
      </div>
    </section>

    <footer class="jt-close" aria-label="Blessing">
      <div class="jt-close__toran jt-toranstrip" aria-hidden="true"></div>
      <div class="jt-close__text jt-up">
        <p class="jt-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
        <p class="jt-close__en l-en">${esc(config.closing?.en || '')}</p>
        <p class="jt-close__names">${ctx.names('&amp;')}</p>
        ${c.hashtag ? `<p class="jt-close__tag">${esc(c.hashtag)}</p>` : ''}
      </div>
      <div class="jt-close__lamps" aria-hidden="true">${lamp('panas', { cls: 'jt-close__lamp', sizes: '70px' })}${lamp('panas', { cls: 'jt-close__lamp', sizes: '70px' })}</div>
      ${P.madeWith()}
    </footer>
  </div>`;
}

// ───────── the walk: vertical scroll → a horizontal walk down the street ─────────
const NEAR = 1.3; // foreground speed (the stops move at 1)
const BUNT = 1.12; // the bunting overhead
function walk(ctx) {
  const { ScrollTrigger } = ctx;
  const W = document.getElementById('walk');
  const track = W.querySelector('.jt-walk__track');
  const far = W.querySelector('.jt-walk__far img');
  const near = W.querySelector('.jt-walk__near');
  const bunt = W.querySelector('.jt-walk__bunt');
  const jw = W.querySelector('.jt-walk__janti');
  const stops = () => [...track.querySelectorAll('.jt-stop')];
  const body = document.body;
  let gc = null; let st = null; let D = 0; let farD = 0; let tile = 1; let still = 0;

  // every stop must fit between the bunting and the procession; a little too tall is scaled down, much too tall → flat
  const fits = () => {
    const ins = stops().map((s) => s.querySelector('.jt-stop__in'));
    ins.forEach((i) => { i.style.scale = ''; });
    if (innerHeight < 500) return false;
    const room = track.clientHeight;
    let ok = true;
    ins.forEach((i) => { const hh = i.offsetHeight; if (hh > room) { const k = room / hh; if (k < 0.8) ok = false; else i.style.scale = k.toFixed(3); } });
    if (!ok) ins.forEach((i) => { i.style.scale = ''; });
    return ok;
  };
  const placeProps = () => {
    const ss = stops(); const vw = innerWidth;
    [...near.children].forEach((p, i) => {
      if (i >= ss.length - 1) { p.hidden = true; return; }
      p.hidden = false;
      const a = ss[i]; const b = ss[i + 1];
      const mid = (a.offsetLeft + a.offsetWidth + b.offsetLeft) / 2;
      p.style.left = `${Math.round(vw / 2 + NEAR * (mid - vw / 2))}px`;
    });
  };
  const measure = () => {
    D = Math.max(0, track.scrollWidth - innerWidth);
    farD = Math.max(0, far.offsetWidth - innerWidth);
    tile = Math.max(1, bunt.offsetHeight * (900 / 312));
    placeProps();
  };
  const walking = () => {
    jw.classList.add('is-walking');
    clearTimeout(still); still = setTimeout(() => jw.classList.remove('is-walking'), 220);
  };

  function build() {
    gc?.revert(); gc = null; st = null;
    body.classList.remove('jt-flat');
    if (ctx.reduced || !fits()) { body.classList.add('jt-flat'); ScrollTrigger.refresh(); return; }
    gc = gsap.context(() => {
      measure();
      const setFar = gsap.quickSetter(far, 'x', 'px');
      const setNear = gsap.quickSetter(near, 'x', 'px');
      const setBunt = gsap.quickSetter(bunt, 'x', 'px');
      let last = 0;
      const move = gsap.to(track, {
        x: () => -D, ease: 'none',
        scrollTrigger: {
          trigger: W, pin: true, start: 'top top', end: () => `+=${D}`, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
          onRefreshInit: measure,
          onUpdate(self) {
            const p = self.progress;
            setFar(-p * farD); setNear(-p * D * NEAR); setBunt(-((p * D * BUNT) % tile));
            if (Math.abs(p - last) > 0.0004) walking();
            last = p;
          },
        },
      });
      st = move.scrollTrigger;
      // the hanging signs swing a little as you reach them; the bell rings
      track.querySelectorAll('.jt-hang').forEach((h) => {
        const b = h.querySelector('.jt-board');
        gsap.fromTo(b, { rotation: 5 }, { rotation: 0, duration: 2.2, ease: 'elastic.out(1, 0.3)', scrollTrigger: { trigger: h, containerAnimation: move, start: 'left 88%', toggleActions: 'play none none reset' } });
      });
      const bl = track.querySelector('.jt-bell');
      if (bl) gsap.fromTo(bl, { rotation: 16 }, { rotation: 0, duration: 3.2, ease: 'elastic.out(1.1, 0.18)', scrollTrigger: { trigger: bl, containerAnimation: move, start: 'left 80%', toggleActions: 'play none none reset' } });
      // the doli is set down on its plinth as you arrive
      const dl = track.querySelector('.jt-doli');
      if (dl) gsap.fromTo(dl, { y: -18 }, { y: 0, duration: 0.9, ease: 'power2.out', scrollTrigger: { trigger: dl, containerAnimation: move, start: 'left 85%', toggleActions: 'play none none reset' } });
    });
    ScrollTrigger.refresh();
  }

  build();
  // rebuild when the language or the width changes what fits; refresh when the photographs know their size
  let raf = 0; let w0 = innerWidth;
  const again = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(build); };
  document.addEventListener('langchange', again);
  addEventListener('resize', () => { if (innerWidth !== w0) { w0 = innerWidth; again(); } });
  let t = 0;
  track.querySelectorAll('img').forEach((im) => { if (!im.complete) im.addEventListener('load', () => { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 120); }, { once: true }); });

  // the page position at which a stop stands in the middle of the screen
  const yOf = (el) => {
    if (st && track.contains(el)) { const s = el.closest('.jt-stop'); const x = s.offsetWidth > innerWidth * 0.9 ? s.offsetLeft - innerWidth * 0.05 : s.offsetLeft + s.offsetWidth / 2 - innerWidth / 2; return st.start + Math.min(D, Math.max(0, x)); }
    return el.getBoundingClientRect().top + scrollY;
  };
  // the signpost and the arrival sign: go to a stop along the street
  W.addEventListener('click', (e) => {
    const a = e.target.closest('[data-go]');
    const to = a && document.getElementById(a.dataset.go);
    if (!to) return;
    e.preventDefault();
    const lenis = ctx.lenis?.();
    const y = yOf(to);
    if (lenis) lenis.scrollTo(y, { duration: 1.6 }); else scrollTo({ top: y, behavior: ctx.reduced ? 'auto' : 'smooth' });
  });
  // keyboard: a focused link or button on a stop that is off to the side brings that stop to the middle
  track.addEventListener('focusin', (e) => {
    if (!st) return;
    const r = e.target.getBoundingClientRect();
    if (r.left >= 0 && r.right <= innerWidth) return;
    const lenis = ctx.lenis?.(); const y = yOf(e.target);
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y);
  });
}

const T = {
  slug: 'janti',
  manifest,
  art: A,

  // the gate is the hero itself at dusk: a dusk wash over the street, warm light left in the window
  gate: () => '<div class="jt-g"><div class="jt-g__dusk"></div></div>',

  page,

  ready(ctx) {
    initNepali();
    const ne = document.getElementById('f-name-err'); if (ne) { ne.hidden = false; ne.setAttribute('role', 'alert'); }
    heroPrepare(ctx);
  },

  open(ctx, tl) {
    // dusk lifts to golden hour
    tl.to('.jt-g__dusk', { opacity: 0, duration: 1.6, ease: 'sine.inOut' }, 0.15);
    // the band strikes up: the procession walks in, the toran swings, the doli curtain rolls up over the names
    return heroEnter(tl, 0.1);
  },

  // after another theme's gate: the band strikes up as it clears (the words follow, from the engine)
  heroIntro(ctx, tl, t) {
    if (!ctx.reduced && document.querySelector('.su-hero .jt-hero')) heroEnter(tl, t);
  },

  scroll(ctx) {
    if (!ctx.reduced) {
      // the hero's procession walks on as you leave the hero
      heroScroll('#top');
      document.querySelectorAll('.jt-up').forEach((el) => {
        gsap.fromTo(el, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      });
    }
    walk(ctx);
  },

  scratch: { paint: paintCurtain },
};

mountSuite(T);
