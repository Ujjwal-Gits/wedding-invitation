// Theme · Swayambar (स्वयम्बर) — the jaimala: two families, two garlands, one moment.
// Gate: wine-red silk; two long marigold, rose and jasmine garlands hang from above and interlock in the middle like
// a closed curtain of flowers, Ganesh in an ivory medallion inside their loop. Tap: the garlands' hanging points draw
// apart and the garlands swing like heavy pendulums (they lag, overshoot, and settle), the silk falls away, and they
// come to rest at the sides of the ivory hero: the bride and groom raising their garlands to each other, the names
// beneath, the groom's on his side and the bride's on hers.
// The scroll journey: the groom's side (left, saffron silk) and the bride's side (right, rose silk) start far apart
// and turned away in 3D, and with every section they converge: the two families' panels, then two silk wings closing
// around the couple's photograph, then two half-moons that meet as one disc behind a medallion ringed by a garland
// (scratch it for the date). After the meeting: the ceremonies as gatefold cards that open on their spine, the
// photographs hanging on a silk cord, the ganthi bandhan with the card wording, the RSVP and the closing lamps.
// Engine: src/themes/_suite/suite.js (T.page, T.scroll, T.scratch).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mountSuite } from '../_suite/suite.js';
import manifest from './slots.js';
import { lamp, kalash as npKalash, ganthi, initNepali } from '../_suite/nepali.js';
import './swayambar.css';

// a reload mid-page must start at the gate, not at the restored scroll position behind it
// (ScrollTrigger owns history.scrollRestoration and resets it on every refresh, so set it through ScrollTrigger)
ScrollTrigger.clearScrollMemory('manual');

const A = '/themes/swayambar/art/';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const L = {
  knot: { en: 'Tied in one knot', ne: 'एउटै गाँठोमा' },
  ceremony: (i, neNum) => ({ en: `Ceremony ${ROMAN[i] || i + 1}`, ne: `कार्यक्रम ${neNum(String(i + 1))}` }),
};

/** a garland picture (the U hangs from above the frame) */
const garlandImg = (sizes, eager = false) => `<img src="${A}garland-sm.webp" srcset="${A}garland-sm.webp 421w, ${A}garland.webp 983w" sizes="${sizes}" width="983" height="1400" alt="" decoding="async"${eager ? ' fetchpriority="high"' : ''} />`;
const GW = '(max-width: 700px) 80vw, 420px';
const garlands = (cls, eager) => `<div class="sw-garls ${cls}" aria-hidden="true">
    <div class="sw-garl sw-garl--l"><div class="sw-garl__sway">${garlandImg(GW, eager)}</div></div>
    <div class="sw-garl sw-garl--r"><div class="sw-garl__sway">${garlandImg(GW, eager)}</div></div>
  </div>`;
const ring = (sizes) => `<img class="sw-ring" src="${A}ring-sm.webp" srcset="${A}ring-sm.webp 480w, ${A}ring.webp 1000w" sizes="${sizes}" width="1000" height="1000" alt="" loading="lazy" decoding="async" aria-hidden="true" />`;

/** a fine gold rule with a small marigold bud in the middle */
const rule = (cls = '') => `<svg class="sw-rule ${cls}" viewBox="0 0 220 14" aria-hidden="true" focusable="false">
  <path d="M0 7H92M128 7H220" /><circle cx="110" cy="7" r="4.2" class="sw-rule__bud" /><circle cx="110" cy="7" r="1.6" class="sw-rule__eye" />
  <circle cx="99" cy="7" r="1.5" class="sw-rule__dot" /><circle cx="121" cy="7" r="1.5" class="sw-rule__dot" /></svg>`;

// ───────── the scratch cover: a wine silk disc inside the garland ─────────
function paintSeal(c, w, h, dpr, hint) {
  const cx = w / 2; const cy = h / 2;
  const R = Math.min(w, h) * 0.5 * 0.8; // tucked just under the garland ring, which lies on top
  c.save();
  c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.clip();
  const g = c.createRadialGradient(cx - R * 0.35, cy - R * 0.45, R * 0.05, cx, cy, R * 1.05);
  g.addColorStop(0, '#93203A'); g.addColorStop(0.55, '#6B1024'); g.addColorStop(1, '#470914');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) { // silk sheen
    const x = (i / 9) * w * 1.6 - w * 0.3; const bw = w * (0.015 + Math.random() * 0.05);
    c.fillStyle = `rgba(255,205,190,${0.025 + Math.random() * 0.05})`;
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x + bw, 0); c.lineTo(x + bw - h * 0.4, h); c.lineTo(x - h * 0.4, h); c.closePath(); c.fill();
  }
  for (let i = 0; i < (w * h) / 1000; i++) { c.fillStyle = Math.random() > 0.5 ? 'rgba(255,225,205,.06)' : 'rgba(25,0,5,.12)'; c.fillRect(Math.random() * w, Math.random() * h, dpr, dpr); }
  c.restore();
  // a gold hairline ring and a small marigold knot
  c.strokeStyle = 'rgba(236,196,120,.75)'; c.lineWidth = dpr;
  c.beginPath(); c.arc(cx, cy, R * 0.9, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = 'rgba(236,196,120,.35)';
  c.beginPath(); c.arc(cx, cy, R * 0.86, 0, Math.PI * 2); c.stroke();
  const k = R * 0.1;
  c.fillStyle = '#E7A33A';
  for (let a = 0; a < 8; a++) { const t = (a / 8) * Math.PI * 2; c.beginPath(); c.arc(cx + Math.cos(t) * k * 0.9, cy - R * 0.36 + Math.sin(t) * k * 0.9, k * 0.62, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#C8263A'; c.beginPath(); c.arc(cx, cy - R * 0.36, k * 0.55, 0, Math.PI * 2); c.fill();
  // the hint, in two lines when it is long
  const deva = /[ऀ-ॿ]/.test(hint);
  const size = Math.round(Math.min(R * 0.15, 21 * dpr));
  c.font = deva ? `500 ${size}px Halant, serif` : `400 ${size}px Prata, serif`;
  c.fillStyle = '#F7E7C9'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const words = hint.split(' ');
  const lines = c.measureText(hint).width > R * 1.5 && words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [hint];
  lines.forEach((ln, i) => c.fillText(ln, cx, cy + R * 0.08 + (i - (lines.length - 1) / 2) * size * 1.35));
  c.strokeStyle = 'rgba(236,196,120,.6)'; c.lineWidth = dpr;
  c.beginPath(); c.moveTo(cx - R * 0.22, cy + R * 0.42); c.lineTo(cx + R * 0.22, cy + R * 0.42); c.stroke();
  // the engine wipes with the current stroke: leave it opaque, or each pass only thins the seal
  c.strokeStyle = '#000'; c.fillStyle = '#000'; c.globalAlpha = 1;
}

// ───────── the page after the gate ─────────
function page(ctx) {
  const { bi, esc, txt, on, AD, BS, mainEv, placeLine, config, c, imgTag, parts: P, S, photoUrl } = ctx;
  const head = (title, id, kick = null, cls = '') => `<header class="sw-head ${cls}">${kick && on(kick) ? `<p class="sw-kick">${bi(kick)}</p>` : ''}<h2 class="sw-h2" id="${id}">${bi(title)}</h2>${rule('sw-head__rule')}</header>`;
  // the seal shows the start time only (as the English does): the whole range in Nepali spills onto the garland
  const time = mainEv ? { en: AD.time, ne: ctx.timeLabel(mainEv).ne.split(/\s+[–-]\s+/)[0] } : null;
  const bsShort = BS.full.short?.en ? (/B\.S\./.test(BS.full.short.en) ? BS.full.short.en : `${BS.full.short.en} B.S.`) : BS.full.en;
  const inv = txt('hero.invocation');
  const lead = P.lead;
  const coupleRef = S.img('hero.couple');
  const g = c.groom; const b = c.bride;

  const hero = `
    <div class="sw-hero">
      ${garlands('sw-hero__garls', false)}
      <div class="sw-hero__body">
        ${ctx.ganeshRef ? `<div class="sw-medal sw-hero__gan" aria-hidden="false">${ctx.ganesh('sw-medal__img', '96px')}</div>` : ''}
        ${on(inv) ? `<p class="sw-inv su-in" lang="ne">${esc(inv.ne || inv.en)}</p>` : ''}
        <p class="sw-title su-in">${bi(txt('hero.title'))}</p>
        ${coupleRef ? `<figure class="sw-couple su-in"><img src="${esc(photoUrl(coupleRef, 'sm'))}" srcset="${esc(photoUrl(coupleRef, 'sm'))} 600w, ${esc(photoUrl(coupleRef, 'lg'))} 1400w" sizes="(max-width: 700px) 74vw, 400px" alt="${esc(S.alt('hero.couple') || 'The bride and groom exchange garlands')}" fetchpriority="high" decoding="async" /></figure>` : ''}
        <h1 class="sw-names su-in">
          <span class="sw-names__g">${bi(g.name)}</span><span class="sw-names__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span><span class="sw-names__b">${bi(b.name)}</span>
        </h1>
        ${on(txt('hero.line')) ? `<p class="sw-hline su-in">${bi(txt('hero.line'))}</p>` : ''}
        <p class="sw-hdate su-in">${bi({ en: `${AD.wd.en} · ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.day && BS.month && BS.year ? `${AD.wd.ne} · ${BS.month} ${BS.day}, ${BS.year}` : (BS.full.ne || AD.full.ne) })}</p>
      </div>
    </div>`;

  // the two families' panels: the groom's side on the left (saffron silk, a Dhaka band), the bride's on the right
  // (rose silk, a string of green pote)
  const side = (f, k) => {
    const p = f.person;
    return `<article class="sw-side sw-side--${k}" aria-label="${esc(k === 'g' ? txt('families.groomSide').en : txt('families.brideSide').en)}">
      <div class="sw-side__in">
        <p class="sw-side__k">${bi(txt(k === 'g' ? 'families.groomSide' : 'families.brideSide'))}</p>
        ${P.brideGroom && f.photo ? `<figure class="sw-side__pic">${imgTag(f.photo, p.name.en, '160px')}</figure>` : ''}
        <p class="sw-side__first">${bi(p.name)}</p>
        <h3 class="sw-side__name">${bi(p.fullName)}</h3>
        ${p.parents?.en || p.parents?.ne ? `<p class="sw-side__of">${bi(f.of)}</p><p class="sw-side__par">${bi(p.parents)}</p>` : ''}
        ${p.home?.en || p.home?.ne ? `<p class="sw-side__home">${bi(p.home)}</p>` : ''}
      </div>
      <i class="sw-side__band" aria-hidden="true"></i>
    </article>`;
  };
  const fBride = P.families.find((f) => f.key === 'bride');
  const fGroom = P.families.find((f) => f.key === 'groom');

  const face = `<div class="sw-seal">
      <div class="sw-seal__date">
        <p class="sw-seal__wd">${bi(AD.wd)}</p>
        <p class="sw-seal__day">${bi({ en: AD.day, ne: BS.day || ctx.neNum(AD.day) })}</p>
        <p class="sw-seal__my">${bi({ en: `${AD.month.en} ${AD.year}`, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</p>
        ${time ? `<p class="sw-seal__t">${bi(time)}</p>` : ''}
      </div>
    </div>`;

  const countdown = `<div class="sw-count" data-countdown>
      <p class="sw-count__title">${bi(txt('count.title'))}</p>
      <ol class="sw-count__row su-count__grid" aria-label="${esc(txt('count.title').en)}">
        ${P.countUnits.map(({ u, label }) => `<li class="sw-count__cell">${P.countNum(u, 'sw-count__n')}<span class="sw-count__l">${bi(label)}</span></li>`).join('')}
      </ol>
      <p class="sw-count__done" data-count-done hidden></p>
    </div>`;

  const ceremony = (ev, i) => {
    const dress = ev.dress.colors.length || ev.dress.text?.en || ev.dress.text?.ne;
    return `<li class="sw-ev ${i % 2 ? 'sw-ev--flip' : ''}" id="ev-${esc(ev.id)}">
      <div class="sw-ev__leaf sw-ev__leaf--date">
        <p class="sw-ev__no">${bi(L.ceremony(i, ctx.neNum))}</p>
        <p class="sw-ev__wd">${bi(ev.ad.wd)}</p>
        <p class="sw-ev__day">${bi({ en: ev.ad.day, ne: ev.bs.day || ctx.neNum(ev.ad.day) })}</p>
        <p class="sw-ev__my">${bi({ en: ev.ad.monthYear.en, ne: ev.bs.month && ev.bs.year ? `${ev.bs.month} ${ev.bs.year}` : ev.ad.monthYear.ne })}</p>
        <p class="sw-ev__alt">${bi({ en: ev.bs.full.short?.en ? `${ev.bs.full.short.en}${/B\.S\./.test(ev.bs.full.short.en) ? '' : ' B.S.'}` : ev.bs.full.en, ne: ev.ad.full.ne })}</p>
        <p class="sw-ev__time">${bi(ev.time)}</p>
      </div>
      <div class="sw-ev__leaf sw-ev__leaf--text">
        <h3 class="sw-ev__title">${bi(ev.title)}</h3>
        ${rule('sw-ev__rule')}
        ${ev.blurb ? `<p class="sw-ev__blurb">${bi(ev.blurb)}</p>` : ''}
        <p class="sw-ev__venue">${bi(ev.venue)} <a class="sw-link" href="${esc(ev.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
        ${dress ? `<p class="sw-ev__dress">${ev.dress.colors.length ? `<span class="sw-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : P.UI.wear)}</span></p>` : ''}
        ${ev.rituals.length ? `<details class="sw-ev__order"><summary>${bi(P.UI.order)}</summary><ol>${ev.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
      </div>
    </li>`;
  };

  return `
  <section class="su-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${hero}
    ${P.cue('families')}
  </section>

  <div class="sw-page">
    <div class="sw-journey">
      <section class="sw-sec sw-fam" id="families" aria-labelledby="fam-title">
        ${head(txt('families.title'), 'fam-title', null, 'sw-up')}
        <div class="sw-fam__stage">
          ${side(fGroom, 'g')}
          <div class="sw-fam__mid" aria-hidden="true"><i></i>${npKalash('sw-fam__kalash', '84px')}<i></i></div>
          ${side(fBride, 'b')}
        </div>
      </section>

      ${lead ? `<section class="sw-sec sw-pair" id="couple" aria-labelledby="couple-title">
        ${head(txt('couple.title'), 'couple-title', null, 'sw-up')}
        <div class="sw-pair__stage">
          <i class="sw-wing sw-wing--g" aria-hidden="true"></i><i class="sw-wing sw-wing--b" aria-hidden="true"></i>
          <figure class="sw-pair__pic">${imgTag(lead.photo, lead.alt, '(max-width: 700px) 62vw, 340px')}</figure>
        </div>
        ${on(txt('couple.line')) ? `<p class="sw-lede sw-up">${bi(txt('couple.line'))}</p>` : ''}
      </section>` : ''}

      <section class="sw-sec sw-day" id="date" aria-labelledby="date-title">
        ${head(txt('date.title'), 'date-title', txt('date.kicker'), 'sw-up')}
        <div class="sw-meet">
          <i class="sw-moon sw-moon--g" aria-hidden="true"></i><i class="sw-moon sw-moon--b" aria-hidden="true"></i>
          ${lamp('diyo', { cls: 'sw-meet__diyo sw-meet__diyo--l', sizes: '90px' })}${lamp('diyo', { cls: 'sw-meet__diyo sw-meet__diyo--r', sizes: '90px' })}
          ${P.scratch(face, 'sw-scratch')}
          ${ring('(max-width: 700px) 76vw, 360px')}
        </div>
        <div class="sw-day__under sw-up">
          <p class="sw-day__alt">${bi({ en: bsShort, ne: AD.full.ne })}</p>
          ${placeLine?.en || placeLine?.ne ? `<p class="sw-day__place">${bi(placeLine)}</p>` : ''}
        </div>
        ${countdown}
      </section>
    </div>

    <section class="sw-sec sw-prog" id="programme" aria-labelledby="prog-title">
      ${head(txt('prog.title'), 'prog-title', txt('prog.kicker'), 'sw-up')}
      <ol class="sw-evs">${P.events.map(ceremony).join('')}</ol>
      <div class="sw-btns sw-up">${P.calendarBtn()}${P.shareBtn()}</div>
      ${P.moreInfo() ? `<div class="sw-more sw-up">${P.moreInfo()}</div>` : ''}
    </section>

    ${P.photos.length ? `<section class="sw-sec sw-gal" id="photos" aria-labelledby="gal-title">
      ${head(txt('gallery.title'), 'gal-title', null, 'sw-up')}
      <div class="sw-cord" id="sw-cord">${P.photos.map((ph, i) => `<figure class="sw-hang">${P.photoBtn(ph, i, '(max-width: 700px) 42vw, 250px', 'sw-hang__btn')}</figure>`).join('')}</div>
    </section>` : ''}

    <section class="sw-sec sw-card" id="card" aria-labelledby="card-title">
      <div class="sw-card__in">
        <figure class="sw-card__knot sw-up">${ganthi('sw-card__ganthi', '(max-width: 700px) 70vw, 380px')}<figcaption>${bi(L.knot)}</figcaption></figure>
        <div class="sw-card__text sw-up">
          ${ctx.ganesh('sw-card__gan', '72px')}
          <h2 class="sw-card__line" id="card-title">${bi(txt('card.line'))}</h2>
          ${rule()}
          <p class="sw-card__hosts">${bi(config.hosts)}</p>
          ${P.cardBtn()}
        </div>
      </div>
    </section>

    <section class="sw-sec sw-rsvp" id="rsvp" aria-labelledby="rsvp-title">
      <div class="sw-rsvp__card sw-up">
        <header class="sw-rsvp__head">
          <h2 class="sw-rsvp__title" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
          ${P.deadline?.en || P.deadline?.ne ? `<p class="sw-rsvp__dl">${bi(P.deadline)}</p>` : ''}
          ${rule('sw-rule--light')}
        </header>
        <div class="sw-rsvp__body">${P.rsvpForm()}</div>
      </div>
    </section>

    <footer class="sw-close" aria-label="Blessing">
      <div class="sw-close__row">
        ${lamp('diyo', { cls: 'sw-close__diyo', sizes: '80px' })}
        <div class="sw-close__text sw-up">
          <p class="sw-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
          <p class="sw-close__en l-en">${esc(config.closing?.en || '')}</p>
          <p class="sw-close__names"><span>${bi(g.name)}</span><span class="sw-close__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span><span>${bi(b.name)}</span></p>
          ${c.hashtag ? `<p class="sw-close__tag">${esc(c.hashtag)}</p>` : ''}
        </div>
        ${lamp('diyo', { cls: 'sw-close__diyo sw-close__diyo--r', sizes: '80px' })}
      </div>
      <div class="sw-dhaka" aria-hidden="true"></div>
      ${P.madeWith()}
    </footer>
  </div>`;
}

// ───────── the gate's closed pose: the two garlands interlocked in the middle ─────────
const CLOSED_TILT = 5.5;
function closedPose() {
  const els = [...document.querySelectorAll('.sw-g .sw-garl')];
  if (!els.length) return [];
  const gw = els[0].offsetWidth;
  const mid = document.querySelector('.sw-g').offsetWidth / 2;
  return els.map((el, i) => {
    const centre = el.offsetLeft + gw / 2;
    const target = mid + (i ? 1 : -1) * gw * 0.13;
    return { el, x: target - centre, r: (i ? 1 : -1) * CLOSED_TILT };
  });
}

/** photographs hang on silk cords: 2 a line on phones, 3 on wider screens; each sits a little lower toward the sag */
function hangPhotos() {
  const cord = document.getElementById('sw-cord');
  if (!cord) return;
  let cols = 0;
  const items = [...cord.querySelectorAll('.sw-hang')];
  const lay = () => {
    const n = innerWidth < 700 ? 2 : 3;
    if (n === cols) return;
    cols = n;
    cord.querySelectorAll('.sw-line').forEach((l) => l.remove());
    for (let i = 0; i < items.length; i += n) {
      const row = items.slice(i, i + n);
      const line = document.createElement('div');
      line.className = `sw-line sw-line--${row.length}`;
      line.innerHTML = '<svg class="sw-line__cord" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 2Q50 22 100 2" /></svg>';
      row.forEach((el, k) => {
        const f = (k + 1) / (row.length + 1);
        el.style.setProperty('--drop', (4 * f * (1 - f)).toFixed(3));
        line.appendChild(el);
      });
      cord.appendChild(line);
    }
  };
  lay();
  addEventListener('resize', lay);
}

const T = {
  slug: 'swayambar',
  manifest,
  art: A,

  gate: (ctx) => `
    <div class="sw-g">
      <div class="sw-g__bg sw-g__bg--l"></div><div class="sw-g__bg sw-g__bg--r"></div>
      <div class="sw-g__frame"></div>
      ${garlands('sw-g__garls', true)}
      <div class="sw-g__front">
        ${ctx.ganeshRef ? `<div class="sw-medal sw-g__gan">${ctx.ganesh('sw-medal__img', '96px')}</div>` : ''}
      </div>
      <div class="sw-g__words">
        <p class="sw-g__title">${ctx.bi(ctx.txt('hero.title'))}</p>
        <p class="sw-g__names"><span>${ctx.bi(ctx.c.groom.name)}</span><span class="sw-g__amp" aria-hidden="true">&amp;</span><span>${ctx.bi(ctx.c.bride.name)}</span></p>
      </div>
    </div>`,

  page,

  ready(ctx) {
    initNepali();
    const ne = document.getElementById('f-name-err'); if (ne) { ne.hidden = false; ne.setAttribute('role', 'alert'); }
    hangPhotos();
    // the garlands interlock in the gate; the Ganesh medallion sits in their shared loop
    const place = () => {
      if (document.body.classList.contains('is-opening') || document.body.classList.contains('is-open')) return;
      const pose = closedPose();
      pose.forEach(({ el, x, r }) => gsap.set(el, { x, rotation: r }));
      const gan = document.querySelector('.sw-g__gan');
      if (gan && pose.length) {
        const gw = pose[0].el.offsetWidth;
        gan.style.top = `${Math.round(gw * 1.4238 * 0.2)}px`;
      }
    };
    place();
    addEventListener('resize', place);
    if (ctx.reduced) document.body.classList.add('sw-still');
  },

  open(ctx, tl) {
    const q = (s) => document.querySelector(s);
    const [gl, gr] = [q('.sw-g .sw-garl--l'), q('.sw-g .sw-garl--r')];
    document.body.classList.add('sw-swing');
    // the medallion rises to its place in the hero (FLIP), the words fall quiet
    tl.to('.sw-g__words', { autoAlpha: 0, y: 12, duration: 0.5, ease: 'power2.in' }, 0.02);
    const from = q('.sw-g__gan'); const to = q('.sw-hero__gan');
    if (from && to) {
      const a = from.getBoundingClientRect(); const b = to.getBoundingClientRect();
      tl.to(from, { x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2), scale: b.width / a.width, duration: 1.5, ease: 'power3.inOut' }, 0.35);
    }
    // the hanging points draw apart; each garland lags behind, swings past, and settles: a heavy pendulum
    [gl, gr].forEach((el, i) => {
      if (!el) return;
      const s = i ? 1 : -1; // the way this garland travels
      const at = 0.18 + i * 0.07;
      tl.to(el, { x: 0, duration: 1.7, ease: 'power2.inOut' }, at);
      tl.to(el, { keyframes: [
        { rotation: s * 15, duration: 0.62, ease: 'power1.out' },  // the bottom lags toward the middle
        { rotation: -s * 10, duration: 0.82, ease: 'sine.inOut' }, // and swings out past the vertical
        { rotation: s * 4.6, duration: 0.72, ease: 'sine.inOut' },
        { rotation: -s * 1.8, duration: 0.62, ease: 'sine.inOut' },
        { rotation: 0, duration: 0.6, ease: 'sine.out' },
      ] }, at);
    });
    // the wine silk parts behind them like a curtain, from the middle out, onto the ivory hero
    tl.to('.sw-g__frame', { opacity: 0, duration: 0.5, ease: 'sine.in' }, 0.2);
    tl.to('.sw-g__bg--l', { xPercent: -101, duration: 1.45, ease: 'power3.inOut' }, 0.4);
    tl.to('.sw-g__bg--r', { xPercent: 101, duration: 1.45, ease: 'power3.inOut' }, 0.4);
    return 1.2;
  },

  // after another theme's gate (docs/MIX.md): the hero's garlands and medallion come down into place themselves
  heroIntro(ctx, tl, t) {
    const els = [...document.querySelectorAll('.sw-hero__garls, .sw-hero__gan')];
    if (ctx.reduced) { tl.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.5 }, t); return; }
    tl.fromTo('.sw-hero__garls', { opacity: 0, y: -36 }, { opacity: 1, y: 0, duration: 1.3, ease: 'power3.out' }, t)
      .fromTo('.sw-hero__gan', { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power3.out' }, t + 0.35);
  },

  scroll(ctx) {
    if (ctx.reduced) return;
    const phone = matchMedia('(max-width: 699px)').matches;
    // headings and small blocks rise once
    document.querySelectorAll('.sw-up').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.95, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    // as the hero leaves, its garlands lift a little and the picture sinks (wider screens only)
    if (!phone) {
      gsap.to('.sw-hero__garls', { y: -50, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true } });
    }
    const conv = (sel, trigger, from, end = 'center 58%') => {
      document.querySelectorAll(sel).forEach((el) => {
        gsap.fromTo(el, from(el), { x: 0, xPercent: 0, rotateY: 0, opacity: 1, ease: 'none',
          scrollTrigger: { trigger, start: 'top 92%', end, scrub: 0.6 } });
      });
    };
    // 1 · the two families: far apart and turned away, they swing in from the sides toward the kalash
    const far = phone ? 26 : 34;
    conv('.sw-side--g', '.sw-fam__stage', () => ({ xPercent: -far, rotateY: 58, opacity: 0.15, transformPerspective: 1200, transformOrigin: '0% 50%' }));
    conv('.sw-side--b', '.sw-fam__stage', () => ({ xPercent: far, rotateY: -58, opacity: 0.15, transformPerspective: 1200, transformOrigin: '100% 50%' }));
    gsap.fromTo('.sw-fam__kalash', { opacity: 0, y: 26, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.sw-fam__stage', start: 'top 70%', end: 'center 58%', scrub: 0.6 } });
    // 2 · the couple: two silk wings close around the photograph
    if (document.querySelector('.sw-pair')) {
      conv('.sw-wing--g', '.sw-pair__stage', () => ({ xPercent: -70, rotateY: 70, opacity: 0, transformPerspective: 1000, transformOrigin: '100% 50%' }));
      conv('.sw-wing--b', '.sw-pair__stage', () => ({ xPercent: 70, rotateY: -70, opacity: 0, transformPerspective: 1000, transformOrigin: '0% 50%' }));
      gsap.fromTo('.sw-pair__pic', { opacity: 0, scale: 0.9, y: 30 }, { opacity: 1, scale: 1, y: 0, ease: 'none', scrollTrigger: { trigger: '.sw-pair__stage', start: 'top 85%', end: 'center 62%', scrub: 0.6 } });
    }
    // 3 · the day: two half-moons meet as one disc behind the garlanded medallion
    conv('.sw-moon--g', '.sw-meet', () => ({ xPercent: -60, rotateY: 75, opacity: 0, transformPerspective: 1000, transformOrigin: '0% 50%' }), 'center 60%');
    conv('.sw-moon--b', '.sw-meet', () => ({ xPercent: 60, rotateY: -75, opacity: 0, transformPerspective: 1000, transformOrigin: '100% 50%' }), 'center 60%');
    gsap.fromTo('.sw-meet .sw-ring', { rotation: -50, scale: 0.86, opacity: 0 }, { rotation: 0, scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.sw-meet', start: 'top 85%', end: 'center 60%', scrub: 0.6 } });
    gsap.fromTo('.sw-meet__diyo', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out', stagger: 0.15, scrollTrigger: { trigger: '.sw-meet', start: 'center 70%', once: true } });
    gsap.fromTo('.sw-count__cell', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08, clearProps: 'transform', scrollTrigger: { trigger: '.sw-count', start: 'top 88%', once: true } });
    // the ceremonies: each gatefold opens on its spine as it arrives
    document.querySelectorAll('.sw-ev').forEach((ev) => {
      const flip = ev.classList.contains('sw-ev--flip');
      const [d, t] = [ev.querySelector('.sw-ev__leaf--date'), ev.querySelector('.sw-ev__leaf--text')];
      const tlv = gsap.timeline({ scrollTrigger: { trigger: ev, start: 'top 82%', once: true } });
      if (phone) {
        tlv.fromTo(d, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', clearProps: 'transform' }, 0)
          .fromTo(t, { opacity: 0, rotateX: -80, transformPerspective: 1100, transformOrigin: '50% 0%' }, { opacity: 1, rotateX: 0, duration: 1.1, ease: 'power3.out', clearProps: 'transform' }, 0.2);
      } else {
        const sD = flip ? -1 : 1; // the date leaf sits left (opens from the spine on its right) unless flipped
        tlv.fromTo(d, { opacity: 0, rotateY: sD * 70, transformPerspective: 1400, transformOrigin: flip ? '0% 50%' : '100% 50%' }, { opacity: 1, rotateY: 0, duration: 1.2, ease: 'power3.out', clearProps: 'transform' }, 0)
          .fromTo(t, { opacity: 0, rotateY: -sD * 80, transformPerspective: 1400, transformOrigin: flip ? '100% 50%' : '0% 50%' }, { opacity: 1, rotateY: 0, duration: 1.3, ease: 'power3.out', clearProps: 'transform' }, 0.12);
      }
    });
    // the photographs swing gently on their threads as their cord arrives
    document.querySelectorAll('.sw-line').forEach((line) => {
      const tlh = gsap.timeline({ scrollTrigger: { trigger: line, start: 'top 85%', once: true } });
      line.querySelectorAll('.sw-hang').forEach((h, i) => {
        const s = i % 2 ? 1 : -1;
        tlh.fromTo(h, { opacity: 0, y: -24, rotation: s * 7 }, { opacity: 1, y: 0, rotation: -s * 3.5, duration: 0.8, ease: 'sine.out' }, i * 0.12)
          .to(h, { rotation: s * 1.4, duration: 0.7, ease: 'sine.inOut' }, i * 0.12 + 0.8)
          .to(h, { rotation: 0, duration: 0.6, ease: 'sine.inOut', clearProps: 'transform' }, i * 0.12 + 1.5);
      });
    });
  },

  scratch: { paint: paintSeal },
};

mountSuite(T);
