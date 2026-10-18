// Theme · Shagun (शगुन / सगुन) — the brass thali, seen from above on a banana leaf, on a red clay floor.
// Gate: the thali covered with red silk with a gold zari border. Tap: the silk slides off with a slight turn, the diyo
// comes alight, the invitation card is laid down beside the plate and a sindoor thumb-tika is pressed beside the names.
// Signature: the thali stays on screen (sticky) and turns like a dial as you scroll, one stop for each of its eight
// things; the thing at 12 o'clock lifts a little and its card rises beside the plate, never over it:
//   supari and dubo (invocation) · sindoor box (the couple) · kalash (families) · akshata (ceremonies) ·
//   dahi and sagun (the blessing) · laddoo (countdown) · coconut (venue) · diyo (RSVP).
// After the dial: a row of the couple's photographs, the sindoor box to rub open (the auspicious hour), the blessing.
// Engine: src/themes/_suite/suite.js (T.page, T.open, T.scroll, T.scratch); live flame from the Nepali kit.
import { gsap } from 'gsap';
import { mountSuite } from '../_suite/suite.js';
import { flame, initNepali, flowers } from '../_suite/nepali.js';
import manifest from './slots.js';
import './shagun.css';

const A = '/themes/shagun/art/';
// the eight things on the thali, clockwise from 12 o'clock; `wick` = where the diyo's wick is (fractions of the picture)
const ITEMS = [
  { k: 'supari', ar: 594 / 440 },
  { k: 'sindoor', ar: 286 / 440 },
  { k: 'kalash', ar: 390 / 440 },
  { k: 'akshata', ar: 1 },
  { k: 'dahi', ar: 1 },
  { k: 'laddoo', ar: 1 },
  { k: 'coconut', ar: 1 },
  { k: 'diyo', ar: 1, wick: [0.13, 0.5] },
];
const STEP = 360 / ITEMS.length;
const angleOf = (stop) => (stop <= 0 ? STEP / 2 : -(stop - 1) * STEP); // the hero rests half a step turned
const pic = (k, cls, sizes, lazy = true) => `<img class="${cls}" src="${A}${k}-sm.webp" srcset="${A}${k}-sm.webp 240w, ${A}${k}.webp 440w" sizes="${sizes}" alt="" decoding="async"${lazy ? ' loading="lazy"' : ''} />`;

/** a faint white aripan drawn in rice paste on the clay round the thali: two dotted rings, a lotus-petal band */
function aripan() {
  const petals = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const p = (r) => `${(100 + Math.cos(a) * r).toFixed(1)} ${(100 + Math.sin(a) * r).toFixed(1)}`;
    const side = (r, d) => `${(100 + Math.cos(a + d) * r).toFixed(1)} ${(100 + Math.sin(a + d) * r).toFixed(1)}`;
    return `<path d="M${p(80)} Q${side(89, 0.13)} ${p(96)} Q${side(89, -0.13)} ${p(80)}Z" />`;
  }).join('');
  const dots = Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    return `<circle cx="${(100 + Math.cos(a) * 99).toFixed(1)}" cy="${(100 + Math.sin(a) * 99).toFixed(1)}" r="0.9" />`;
  }).join('');
  return `<svg class="sg-aripan" viewBox="-2 -2 204 204" focusable="false"><defs><filter id="sg-chalk" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="4" /><feDisplacementMap in="SourceGraphic" scale="1.4" /></filter></defs>
      <g filter="url(#sg-chalk)"><circle cx="100" cy="100" r="78.5" class="sg-aripan__line" /><g class="sg-aripan__petal">${petals}</g>${dots}</g></svg>`;
}

/** the thali on its banana leaf, inside its makhamali garland; `turn` rotates, the leaf and garland stay */
function thali({ eager = false } = {}) {
  const items = ITEMS.map((it, i) => `<span class="sg-item sg-item--${it.k}" data-item="${i + 1}" style="--a:${(i * STEP).toFixed(1)}deg">
      <span class="sg-item__in">${pic(it.k, 'sg-item__img', '(min-width: 900px) 130px, 80px', !eager)}
        ${it.wick ? `<span class="sg-wick" style="left:${it.wick[0] * 100}%;top:${it.wick[1] * 100}%">${flame('sg-flame')}</span>` : ''}</span></span>`).join('');
  return `<div class="sg-plate" aria-hidden="true">
      <i class="sg-plate__pool"></i>
      ${aripan()}
      <img class="sg-petals sg-petals--bl" src="${A}petals.webp" alt="" decoding="async" loading="lazy" />
      <img class="sg-petals sg-petals--tr" src="${A}petals.webp" alt="" decoding="async" loading="lazy" />
      <img class="sg-plate__leaf" src="${A}leaf-sm.webp" srcset="${A}leaf-sm.webp 800w, ${A}leaf.webp 1500w" sizes="(min-width: 900px) 64vw, 140vw" alt="" decoding="async" />
      <img class="sg-plate__ring" src="${A}garland-sm.webp" srcset="${A}garland-sm.webp 760w, ${A}garland.webp 1400w" sizes="(min-width: 900px) 52vw, 112vw" alt="" decoding="async" />
      <div class="sg-plate__turn">
        <img class="sg-plate__thali" src="${A}thali-sm.webp" srcset="${A}thali-sm.webp 760w, ${A}thali.webp 1400w" sizes="(min-width: 900px) 46vw, 96vw" alt="" decoding="async"${eager ? ' fetchpriority="high"' : ''} />
        ${items}
      </div>
      <i class="sg-plate__index"></i>
    </div>`;
}

// ───────── the gate: the covered thali (the plate behind it is the page's own, seen through the gate) ─────────
function gate(ctx) {
  const { bi, txt, c } = ctx;
  return `
    <div class="sg-gwords">
      <p class="sg-gwords__k">${bi(txt('hero.title'))}</p>
      <p class="sg-gwords__names"><span>${bi(c.bride.name)}</span><span class="sg-gwords__amp">&amp;</span><span>${bi(c.groom.name)}</span></p>
    </div>
    <img class="sg-silk" src="${A}silk-sm.webp" srcset="${A}silk-sm.webp 760w, ${A}silk.webp 1400w" sizes="(min-width: 900px) 48vw, 100vw" alt="" decoding="async" fetchpriority="high" />`;
}

// ───────── the sindoor box lid: the painted lacquer lid of the thali's sindoor-dani (the scratch cover) ─────────
let LID = null;
function lidPicture() {
  if (LID) return LID;
  LID = new Image();
  LID.decoding = 'async';
  LID.onload = () => document.dispatchEvent(new Event('su-scratch-redraw'));
  LID.src = `${A}lid.webp`;
  return LID;
}
function paintLid(g, w, h, dpr, hint) {
  const cx = w / 2; const cy = h / 2; const r = Math.min(w, h) / 2 - dpr;
  const pic = lidPicture();
  g.clearRect(0, 0, w, h);
  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  if (pic.complete && pic.naturalWidth) g.drawImage(pic, cx - r, cy - r, r * 2, r * 2);
  else {
    const base = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r);
    base.addColorStop(0, '#C42536'); base.addColorStop(0.6, '#8E1420'); base.addColorStop(1, '#5E0911');
    g.fillStyle = base; g.fillRect(0, 0, w, h);
  }
  // the hint on a small lacquer band near the rim, clear of the painted flowers
  const deva = /[ऀ-ॿ]/.test(hint);
  const size = Math.round(Math.min(r * 0.085, 15 * dpr));
  g.font = deva ? `500 ${Math.round(size * 1.15)}px Mukta, sans-serif` : `600 ${size}px Mukta, sans-serif`;
  const text = deva ? hint : hint.toUpperCase();
  if (!deva && 'letterSpacing' in g) g.letterSpacing = `${(0.16 * size).toFixed(1)}px`;
  const tw = g.measureText(text).width;
  const by = cy + r * 0.72; const bh = size * 2.2; const bw = tw + size * 2.4;
  g.fillStyle = 'rgba(70, 6, 12, 0.84)';
  g.beginPath();
  if (g.roundRect) g.roundRect(cx - bw / 2, by - bh / 2, bw, bh, bh / 2); else g.rect(cx - bw / 2, by - bh / 2, bw, bh);
  g.fill();
  g.strokeStyle = 'rgba(232, 190, 110, 0.75)'; g.lineWidth = dpr; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#F6DFA6';
  g.fillText(text, cx, by + size * 0.06);
  g.restore();
}

// ───────── the page ─────────
function page(ctx) {
  const { bi, esc, txt, on, AD, BS, mainEv, placeLine, config, c, imgTag, parts: P, neNum } = ctx;
  const item = (n) => `<span class="sg-kick__icon" aria-hidden="true">${pic(ITEMS[n - 1].k, '', '64px')}</span>`;
  const kick = (n, extra) => `<p class="sg-kick">${item(n)}<span>${bi(txt(`item.${n}`))}</span>${extra && on(extra) ? `<span class="sg-kick__sep" aria-hidden="true">·</span><span>${bi(extra)}</span>` : ''}</p>`;
  const stop = (n, id, title, body, cls = '') => `
    <section class="sg-stop ${cls}" id="${id}" data-stop="${n}" aria-labelledby="${id}-title">
      <article class="sg-card su-rise">${kick(n, n === 4 ? txt('prog.kicker') : null)}<h2 class="sg-h2" id="${id}-title">${bi(title)}</h2>${body}</article>
    </section>`;
  const rule = '<i class="sg-rule" aria-hidden="true"></i>';
  const bsShort = (b) => (b.full.short?.en ? (/B\.S\./.test(b.full.short.en) ? b.full.short.en : `${b.full.short.en} B.S.`) : b.full.en);
  const time = mainEv ? { en: AD.time, ne: String(ctx.timeLabel(mainEv).ne || '').split(/\s[–-]\s/)[0] } : null; // the start only: the auspicious hour
  const dayLine = { en: `${AD.wd.en}, ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.day && BS.month && BS.year ? `${AD.wd.ne}, ${BS.month} ${BS.day}, ${BS.year}` : (BS.full.ne || AD.full.ne) };
  const inv = txt('hero.invocation');
  const lead = P.lead;

  const fam = (f) => {
    const p = f.person;
    return `<div class="sg-fam__side">
      ${P.brideGroom && f.photo ? `<figure class="sg-fam__pic">${imgTag(f.photo, p.name.en, '120px')}</figure>` : ''}
      <p class="sg-label">${bi(f.label)}</p>
      <h3 class="sg-fam__name">${bi(p.fullName)}</h3>
      ${p.parents?.en || p.parents?.ne ? `<p class="sg-fam__of">${bi(f.of)}</p><p class="sg-fam__par">${bi(p.parents)}</p>` : ''}
      ${p.home?.en || p.home?.ne ? `<p class="sg-fam__home">${bi(p.home)}</p>` : ''}
    </div>`;
  };
  const ev = (e) => {
    const dress = e.dress.colors.length || e.dress.text?.en || e.dress.text?.ne;
    return `<li class="sg-ev" id="ev-${esc(e.id)}">
      <p class="sg-ev__date" aria-hidden="true"><b>${bi({ en: e.ad.day, ne: e.bs.day || neNum(e.ad.day) })}</b><span>${bi({ en: e.ad.month.en.slice(0, 3), ne: e.bs.month || e.ad.month.ne })}</span></p>
      <div class="sg-ev__main">
        <h3 class="sg-ev__title">${bi(e.title)}</h3>
        <p class="sg-ev__when">${bi({ en: e.ad.full.en, ne: e.bs.full.ne })}</p>
        <p class="sg-ev__alt">${bi({ en: bsShort(e.bs), ne: e.ad.full.ne })}</p>
        <p class="sg-ev__time">${bi(e.time)}</p>
        ${e.blurb ? `<p class="sg-ev__blurb">${bi(e.blurb)}</p>` : ''}
        <p class="sg-ev__venue">${bi(e.venue)} <a class="su-link" href="${esc(e.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
        ${dress ? `<p class="sg-ev__dress">${e.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${e.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(e.dress.text?.en || e.dress.text?.ne ? e.dress.text : P.UI.wear)}</span></p>` : ''}
        ${e.rituals.length ? `<details class="su-order"><summary>${bi(P.UI.order)}</summary><ol>${e.rituals.map((r) => `<li><span class="su-order__t">${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
      </div>
    </li>`;
  };
  const venueMap = ctx.mapUrl(mainEv?.mapQuery || mainEv?.venue?.en || config.city?.en || '');

  const lidFace = `<div class="sg-lid__face">
      <p class="sg-label">${bi(txt('date.kicker'))}</p>
      <p class="sg-lid__wd">${bi(AD.wd)}</p>
      <p class="sg-lid__day">${bi({ en: AD.day, ne: BS.day || neNum(AD.day) })}</p>
      <p class="sg-lid__my">${bi({ en: `${AD.month.en} ${AD.year}`, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</p>
      ${time ? `<p class="sg-lid__t">${bi(time)}</p>` : ''}
      <p class="sg-lid__alt">${bi({ en: bsShort(BS), ne: AD.full.ne })}</p>
    </div>`;

  return `
  <div class="sg-dial" id="dial">
    <div class="sg-stagewrap"><div class="sg-stage" id="stage"><div class="sg-band" aria-hidden="true"></div>${thali({ eager: true })}</div></div>
    <div class="sg-track">
      <section class="su-hero sg-hero" id="top" data-stop="0" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
        <article class="sg-card sg-hcard">
          ${on(inv) ? `<p class="sg-inv su-in" lang="ne">${esc(inv.ne || inv.en)}</p>` : ''}
          <p class="sg-title su-in">${bi(txt('hero.title'))}</p>
          <div class="sg-namewrap su-in">
            <h1 class="su-names sg-names">${ctx.names('&amp;')}</h1>
            <span class="sg-stamp" aria-hidden="true"><i class="sg-stamp__dust"></i><img src="${A}thumb.webp" alt="" decoding="async" /></span>
          </div>
          ${on(txt('hero.seal')) ? `<p class="sg-seal su-in">${bi(txt('hero.seal'))}</p>` : ''}
          ${rule}
          <p class="sg-hdate su-in">${bi(dayLine)}</p>
          ${time || placeLine?.en || placeLine?.ne ? `<p class="sg-hplace su-in">${time ? bi(time) : ''}${time && (placeLine?.en || placeLine?.ne) ? '<span aria-hidden="true"> · </span>' : ''}${placeLine?.en || placeLine?.ne ? bi(placeLine) : ''}</p>` : ''}
          ${on(txt('hero.line')) ? `<p class="sg-hline su-in">${bi(txt('hero.line'))}</p>` : ''}
        </article>
        ${P.cue('invoke')}
      </section>

      ${stop(1, 'invoke', txt('invoke.title'), `
        ${ctx.ganesh('sg-ganesh', '96px')}
        <p class="sg-lede">${bi(txt('card.line'))}</p>
        <p class="sg-hosts">${bi(config.hosts)}</p>
        ${P.cardBtn('sg-btn')}`)}

      ${stop(2, 'couple', txt('couple.title'), `
        ${lead ? `<figure class="sg-print">${imgTag(lead.photo, lead.alt, '(max-width: 899px) 78vw, 420px')}</figure>` : `<p class="sg-coupnames">${ctx.names('&amp;')}</p>`}
        ${on(txt('couple.line')) ? `<p class="sg-lede">${bi(txt('couple.line'))}</p>` : ''}`)}

      ${stop(3, 'families', txt('families.title'), `
        <div class="sg-fam">${fam(P.families[0])}<div class="sg-fam__mid" aria-hidden="true">${pic('kalash', 'sg-fam__kalash', '56px')}</div>${fam(P.families[1])}</div>`)}

      ${P.events.length ? stop(4, 'programme', txt('prog.title'), `
        <ol class="sg-evs">${P.events.map(ev).join('')}</ol>
        <div class="sg-btns">${P.calendarBtn('sg-btn')}${P.shareBtn('su-btn--line sg-btn')}</div>`, 'sg-stop--long') : ''}

      ${stop(5, 'blessing', txt('bless.title'), `${on(txt('bless.line')) ? `<p class="sg-lede">${bi(txt('bless.line'))}</p>` : ''}`)}

      ${stop(6, 'date', txt('count.title'), `
        <div class="sg-count" data-countdown>
          <ol class="sg-count__row su-count__grid" aria-label="${esc(txt('count.title').en)}">
            ${P.countUnits.map(({ u, label }) => `<li class="sg-count__cell">${P.countNum(u, 'sg-count__n')}<span class="sg-count__l">${bi(label)}</span></li>`).join('')}
          </ol>
          <p class="sg-count__done" data-count-done hidden></p>
        </div>
        ${rule}
        <p class="sg-hdate">${bi(dayLine)}</p>
        <p class="sg-alt">${bi({ en: bsShort(BS), ne: AD.full.ne })}</p>`)}

      ${stop(7, 'venue', txt('venue.title'), `
        ${placeLine?.en || placeLine?.ne ? `<p class="sg-venue">${bi(placeLine)}</p>` : ''}
        ${(config.city?.en || config.city?.ne) && placeLine !== config.city ? `<p class="sg-alt">${bi(config.city)}</p>` : ''}
        <div class="sg-btns"><a class="su-btn sg-btn" href="${esc(venueMap)}" target="_blank" rel="noopener">${bi({ en: 'Open the map', ne: 'नक्सा खोल्नुहोस्' })}<span class="sr-only"> (opens Google Maps)</span></a>${P.events.length ? '' : P.calendarBtn('su-btn--line sg-btn')}</div>
        ${P.moreInfo()}`)}

      ${stop(8, 'rsvp', txt('rsvp.title'), `
        ${P.deadline?.en || P.deadline?.ne ? `<p class="sg-alt">${bi(P.deadline)}</p>` : ''}
        ${P.rsvpForm()}`, 'sg-stop--long')}
    </div>
  </div>

  ${P.photos.length ? `<section class="sg-sec sg-photos" id="photos" aria-labelledby="photos-title">
    <h2 class="sg-floorh su-rise" id="photos-title">${bi(txt('gallery.title'))}</h2>
    <div class="sg-row" id="photorow" tabindex="0" aria-label="${esc(txt('gallery.title').en)}">${P.photos.map((g, i) => `<figure class="sg-row__ph">${P.photoBtn(g, i, '(max-width: 899px) 80vw, 380px', 'sg-row__btn')}</figure>`).join('')}</div>
    ${P.photos.length > 1 ? `<div class="sg-row__nav"><button type="button" class="sg-row__b" data-row="-1" aria-label="Previous photograph">←</button><button type="button" class="sg-row__b" data-row="1" aria-label="Next photograph">→</button></div>` : ''}
  </section>` : ''}

  <section class="sg-sec sg-box" id="sindoor" aria-labelledby="box-title">
    <h2 class="sg-floorh su-rise" id="box-title">${bi(txt('scratch.title'))}</h2>
    <div class="sg-boxstage su-rise" id="boxstage">
      <img class="sg-petals sg-boxstage__petals" src="${A}petals.webp" alt="" decoding="async" loading="lazy" />
      <img class="sg-boxstage__box" src="${A}box.webp" alt="" decoding="async" loading="lazy" />
      <img class="sg-boxstage__ring" src="${A}garland-sm.webp" srcset="${A}garland-sm.webp 760w, ${A}garland.webp 1400w" sizes="(min-width: 900px) 540px, 96vw" alt="" decoding="async" loading="lazy" />
      <div class="sg-boxstage__hole">${P.scratch(lidFace, 'sg-lid__scratch')}</div>
      <img class="sg-boxstage__lid" src="${A}lid.webp" alt="" decoding="async" loading="lazy" />
    </div>
  </section>

  <footer class="sg-close" aria-label="Blessing">
    ${flowers('tl', 'sg-close__fl sg-close__fl--l', '220px')}${flowers('tr', 'sg-close__fl sg-close__fl--r', '220px')}
    <div class="sg-card sg-close__card su-rise">
      <p class="sg-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
      <p class="sg-close__en l-en">${esc(config.closing?.en || '')}</p>
      ${rule}
      <p class="sg-close__names">${ctx.names('&amp;')}</p>
      ${c.hashtag ? `<p class="sg-close__tag">${esc(c.hashtag)}</p>` : ''}
    </div>
    ${P.madeWith()}
  </footer>`;
}

// ───────── the dial: where the plate sits, and how far it has turned ─────────
const wide = () => window.matchMedia('(min-width: 900px)').matches;
function layout() {
  const root = document.documentElement;
  const vw = window.innerWidth; const vh = window.innerHeight;
  let d; let x; let y; let shift;
  if (wide()) {
    d = Math.min(vh * 0.8, vw * 0.4, 780); x = vw * 0.73; y = vh * 0.52; shift = 0;
  } else {
    d = Math.min(vw * 0.98, vh * 0.52, 540); x = vw / 2;
    // the plate sits just under the card (its garland clear of the words), never higher than a third sunk
    const card = document.querySelector('.sg-hcard');
    const cb = card ? card.getBoundingClientRect().bottom + window.scrollY : 0;
    y = Math.min(vh - d * 0.2, Math.max(vh - d * 0.33, cb + 14 + d * 0.61));
    shift = vh + d * 0.12 - y;
  }
  root.style.setProperty('--sg-pd', `${d.toFixed(1)}px`);
  root.style.setProperty('--sg-px', `${x.toFixed(1)}px`);
  root.style.setProperty('--sg-py', `${y.toFixed(1)}px`);
  root.style.setProperty('--sg-shift', `${shift.toFixed(1)}px`);
  return { d, x, y, shift };
}

function dial(ctx) {
  const { ScrollTrigger } = ctx;
  const turn = document.querySelector('#stage .sg-plate__turn');
  const plate = document.querySelector('#stage .sg-plate');
  const items = [...document.querySelectorAll('#stage .sg-item')];
  const stops = [...document.querySelectorAll('.sg-track [data-stop]')];
  let marks = []; // [{ top, stop }] in document px
  const measure = () => { marks = stops.map((el) => ({ top: el.getBoundingClientRect().top + window.scrollY, stop: Number(el.dataset.stop) })); };
  const smooth = (t) => t * t * (3 - 2 * t);
  let cur = angleOf(0); let target = cur; let active = -1;
  // the diyo's flame stands upright however far the plate has turned
  const wicks = [...document.querySelectorAll('#stage .sg-wick')].map((w) => ({ w, a: parseFloat(w.closest('.sg-item').style.getPropertyValue('--a')) || 0 }));
  const setRot = (r) => {
    turn.style.transform = `rotate(${r.toFixed(2)}deg)`;
    for (const { w, a } of wicks) w.style.transform = `rotate(${(-(r + a)).toFixed(2)}deg)`;
  };
  setRot(cur);
  function aim() {
    const vh = window.innerHeight;
    const line = window.scrollY + vh * (wide() ? 0.5 : 0.42);
    const zone = vh * 0.32;
    let j = 0;
    for (let i = 0; i < marks.length; i++) if (marks[i].top <= line) j = i;
    let a = angleOf(marks[j]?.stop ?? 0);
    const next = marks[j + 1];
    if (next) {
      const t = (line - (next.top - zone)) / zone;
      if (t > 0) a += (angleOf(next.stop) - a) * smooth(Math.min(1, t));
    }
    target = a;
  }
  function tick() {
    const diff = target - cur;
    if (Math.abs(diff) < 0.02) { if (cur !== target) { cur = target; setRot(cur); } } else { cur += diff * 0.14; setRot(cur); }
    // the thing at 12 o'clock lifts
    let on = -1;
    for (let i = 0; i < ITEMS.length; i++) if (Math.abs(cur + i * STEP) < STEP * 0.28) on = i;
    if (on !== active) { items[active]?.classList.remove('is-on'); items[on]?.classList.add('is-on'); active = on; }
  }
  // the phone: the plate sinks from the first screen to the foot of the screen, a dial you hold
  const band = document.querySelector('#stage .sg-band');
  const mm = gsap.matchMedia();
  mm.add('(max-width: 899px)', () => {
    gsap.fromTo(plate, { y: 0 }, { y: () => layout().shift, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom 30%', scrub: 0.4, invalidateOnRefresh: true } });
    gsap.fromTo(band, { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: '#top', start: 'center top', end: 'bottom 30%', scrub: 0.4 } });
  });
  ScrollTrigger.addEventListener('refresh', () => { layout(); measure(); aim(); });
  measure(); aim();
  window.addEventListener('scroll', aim, { passive: true });
  gsap.ticker.add(tick);
  return { measure, aim };
}

const T = {
  slug: 'shagun',
  manifest,
  art: A,
  gate,
  page,

  ready(ctx) {
    lidPicture();
    document.body.classList.toggle('sg-still', !!ctx.reduced);
    layout();
    window.addEventListener('resize', () => { if (!document.body.classList.contains('is-open')) layout(); });
    // the other language sets the card longer or shorter: the plate follows it
    document.addEventListener('langchange', () => requestAnimationFrame(() => { layout(); ctx.ScrollTrigger.refresh(); }));
    document.fonts?.ready.then(() => layout());
    initNepali();
    const ne = document.getElementById('f-name-err'); if (ne) { ne.hidden = false; ne.setAttribute('role', 'alert'); }
    // the diyo waits unlit under the silk
    if (!ctx.reduced) gsap.set('#stage .sg-wick', { opacity: 0, scale: 0.4 });
  },

  open(ctx, tl, gateEl) {
    const silk = gateEl.querySelector('.sg-silk');
    const vw = window.innerWidth; const vh = window.innerHeight;
    tl.to(gateEl.querySelector('.sg-gwords'), { autoAlpha: 0, y: -12, duration: 0.45, ease: 'power2.out' }, 0);
    // the silk is lifted at one edge, then drawn off the plate with a slight turn
    tl.to(silk, { scale: 1.035, rotation: -3, duration: 0.32, ease: 'power2.out' }, 0.15)
      .to(silk, { x: vw * 0.95, y: -vh * 0.22, rotation: 26, duration: 1.15, ease: 'power3.inOut' }, 0.42)
      .to(silk, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 1.25);
    // the diyo comes alight
    tl.to('#stage .sg-wick', { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, 1.05);
    tl.set(gateEl, { autoAlpha: 0 }, 1.6);
    // the card is laid down beside the plate
    tl.fromTo('.sg-hcard', { opacity: 0, y: 34, rotation: wide() ? -2.5 : -1.5 }, { opacity: 1, y: 0, rotation: 0, duration: 0.95, ease: 'power3.out' }, 1.15);
    const ins = document.querySelectorAll('#top .su-in').length;
    // the thumb is pressed into sindoor and onto the card, beside the names
    const at = 1.45 + ins * 0.14 + 0.25;
    tl.fromTo('.sg-stamp img', { opacity: 0, scale: 1.2, rotation: -16 }, { opacity: 1, scale: 1, rotation: -10, duration: 0.32, ease: 'power3.in' }, at)
      .fromTo('.sg-stamp__dust', { opacity: 0, scale: 0.6 }, { opacity: 0.55, scale: 1.25, duration: 0.25, ease: 'power2.out' }, at + 0.3)
      .to('.sg-stamp__dust', { opacity: 0, duration: 0.7, ease: 'power1.out' }, at + 0.55);
    return 1.45;
  },

  ambient() {
    // flames burn only on screen (the kit pauses them off-screen)
  },

  scroll(ctx) {
    // the row of prints: buttons step one photograph at a time
    const row = document.getElementById('photorow');
    document.querySelectorAll('[data-row]').forEach((b) => b.addEventListener('click', () => {
      const ph = row.querySelector('.sg-row__ph');
      row.scrollBy({ left: Number(b.dataset.row) * ((ph?.offsetWidth || 300) + 24), behavior: ctx.reduced ? 'auto' : 'smooth' });
    }));
    if (ctx.reduced) return;
    const d = dial(ctx);
    // late images change the track's height: measure the stops again
    window.addEventListener('load', () => { ctx.ScrollTrigger.refresh(); d.measure(); d.aim(); });
  },

  // rubbed open: the painted lid lifts off the date and is set down tilted beside the open box
  scratch: { paint: paintLid, onReveal: () => document.getElementById('boxstage')?.classList.add('is-open') },
};

mountSuite(T);
