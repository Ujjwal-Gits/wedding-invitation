// Theme · Rangoli (रंगोली) — the morning of the wedding in a Newari courtyard (chowk).
// The courtyard has been swept and a flower rangoli is being laid on the herringbone bricks, brass diyos around it.
// Gate: we look across the courtyard from low down, the floor in perspective, Ganesh at the shrine ahead under a
// marigold toran, only the rangoli's outer ring laid. Tap (the one signature motion): the camera tilts down until it
// looks straight at the floor, the rangoli's rings turn into place one by one (each its own circular layer), the
// centre diyo catches its flame, and the names appear in the morning shade of the eave.
// Below, "the courtyard path": we stay looking down at the bricks; everything is set down on the floor (polaroids,
// brass thals, lime-washed tablets, a ring of diyos), rows of lit diyos line the way, and the page ends at the door.
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import { lamp, flame, kalash, toran, flowers, initNepali } from '../_suite/nepali.js';
import './rangoli.css'; // after the suite's CSS, so the theme wins ties

const ART = '/themes/rangoli/art/';
// the ring layers cut from the flower rangoli (made concentric): their square box and -sm width, in the 1600-px
// picture's units. 0 = the diyo and the rose core, 1 = jasmine and leaves, 2 = the marigold-and-diamond band, 3 = the rim
const RING = [{ box: 250, sm: 112 }, { box: 710, sm: 320 }, { box: 1362, sm: 613 }, { box: 1660, sm: 747 }];
const WICK = { x: 50, y: 48.1 }; // the centre diyo's wick, % of the rangoli's 1600-px square
const r2 = (n) => Math.round(n * 100) / 100;

/** the rangoli; `vw` is its width on phones and desktops (for sizes) */
function rangoli(cls, [phone, desk], { eager = false } = {}) {
  const rings = RING.map(({ box, sm }, i) => {
    const f = box / 1600;
    return `<img class="rg-ring rg-ring--${i}" style="--f:${r2(f)}" src="${ART}ring${i}-sm.webp" srcset="${ART}ring${i}-sm.webp ${sm}w, ${ART}ring${i}.webp ${box}w"
      sizes="(max-width: 719px) ${r2(phone * f)}vw, ${r2(desk * f)}vw" alt="" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} />`;
  }).reverse().join('');
  return `<div class="rg-rangoli ${cls}" aria-hidden="true">${rings}
    <span class="rg-halo"></span><span class="rg-wick" style="left:${WICK.x}%;top:${WICK.y}%">${flame('rg-cflame')}</span></div>`;
}

// ───────── the hero: the courtyard floor, seen from above once the camera has tilted down ─────────
function hero(ctx) {
  const { bi, esc, c, AD, BS, txt, on, placeLine } = ctx;
  const bsDeva = BS.day && BS.month ? `${BS.month} ${BS.day} गते, ${BS.year}` : BS.full.ne;
  const invo = txt('hero.invocation'); const title = txt('hero.title'); const line = txt('hero.line');
  const bb = (html, cls) => `<div class="rg-bb ${cls}">${html}</div>`; // stands up on the floor while the camera is low
  return `
  <div class="rg-sky" aria-hidden="true"><div class="rg-sky__wall"></div>${toran('rg-sky__toran', '(max-width: 719px) 140vw, 90vw')}</div>
  <div class="rg-cam">
    <div class="rg-floor">
      <i class="rg-shade" aria-hidden="true"></i><i class="rg-sun" aria-hidden="true"></i>
      ${bb(`${ctx.ganesh('rg-gan', '(max-width: 719px) 90px, 130px')}`, 'rg-shrine')}
      ${bb(lamp('diyo', { cls: 'rg-hl', sizes: '90px' }), 'rg-hlamp rg-hlamp--sl')}${bb(lamp('diyo', { cls: 'rg-hl', sizes: '90px' }), 'rg-hlamp rg-hlamp--sr')}
      ${rangoli('rg-hero-r', [86, 46], { eager: true })}
      ${['a', 'b', 'c', 'd'].map((k) => bb(lamp('diyo', { cls: 'rg-hl', sizes: '80px' }), `rg-hlamp rg-hlamp--${k}`)).join('')}
    </div>
  </div>
  <div class="rg-words">
    ${on(invo) ? `<p class="rg-invo su-in">${bi(invo)}</p>` : ''}
    ${on(title) ? `<p class="rg-title su-in">${bi(title)}</p>` : ''}
    ${on(line) ? `<p class="rg-line su-in">${bi(line)}</p>` : ''}
    <h1 class="rg-names">
      <span class="rg-n su-in">${bi(c.bride.name)}</span>
      <span class="rg-and su-in" aria-hidden="true"><span class="l-en">&amp;</span><span class="l-ne" lang="ne">र</span></span><span class="sr-only">and</span>
      <span class="rg-n su-in">${bi(c.groom.name)}</span>
    </h1>
    <div class="rg-when su-in">
      <p class="rg-date">${bi({ en: `${AD.wd.en} · ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.full.ne })}</p>
      <p class="rg-alt"><span class="l-en" lang="ne">${esc(bsDeva)}</span><span class="l-ne" lang="ne">${esc(AD.full.ne)}</span></p>
      ${placeLine?.en || placeLine?.ne ? `<p class="rg-place">${bi(placeLine)}</p>` : ''}
    </div>
  </div>`;
}

function gate(ctx) {
  const t = ctx.txt('hero.title');
  return `<div class="rg-gate">
    <div class="rg-gate__gan">${ctx.ganesh('rg-gate__ganimg', '96px')}</div>
    ${ctx.on(t) ? `<p class="rg-gate__title" lang="ne">${ctx.esc(t.ne || t.en)}</p>` : ''}
    <i class="rg-gate__scrim"></i>
  </div>`;
}

/** the camera tilts down while the rings turn into place; the centre diyo lights */
function open(ctx, tl, gateEl) {
  const { gsap } = ctx;
  const hero = document.getElementById('top');
  const q = (s) => hero.querySelector(s);
  document.body.classList.add('rg-moving');
  tl.to(gateEl.querySelector('.rg-gate__title'), { opacity: 0, y: -14, duration: 0.55, ease: 'power2.in' }, 0);
  tl.to(gateEl.querySelector('.rg-gate__scrim'), { opacity: 0, duration: 1, ease: 'power1.out' }, 0.2);
  // the camera: one variable drives the floor's tilt and the counter-tilt of everything standing on it
  tl.fromTo(hero, { '--k': 1 }, { '--k': 0, duration: 2.3, ease: 'power3.inOut' }, 0.1);
  tl.to(q('.rg-sky'), { yPercent: -55, opacity: 0, duration: 1.2, ease: 'power2.in' }, 0.15);
  // the rings: the rim settles, then each ring turns in from the opposite side to the one before
  tl.fromTo(q('.rg-ring--3'), { rotation: -28 }, { rotation: 0, duration: 2.3, ease: 'power3.inOut' }, 0.1);
  tl.fromTo(q('.rg-ring--2'), { rotation: 70 }, { rotation: 0, duration: 2.0, ease: 'power3.inOut' }, 0.3);
  tl.fromTo(q('.rg-ring--1'), { rotation: -170, scale: 1.3, opacity: 0 }, { rotation: 0, scale: 1, opacity: 1, duration: 1.6, ease: 'expo.out' }, 0.95);
  tl.fromTo(q('.rg-ring--0'), { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, ease: 'back.out(1.5)' }, 1.45);
  // the centre diyo catches its flame
  tl.fromTo(q('.rg-wick'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(2.2)' }, 2.15);
  tl.fromTo(q('.rg-halo'), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'power2.out' }, 2.15);
  tl.set(gateEl, { autoAlpha: 0 }, 2.4);
  return 2.25;
}

// ───────── the scratch cover: the brass thal heaped with the flower rangoli ─────────
const COVER = new Image();
COVER.decoding = 'async';
COVER.onload = () => document.dispatchEvent(new Event('su-scratch-redraw'));
COVER.src = `${ART}whole-sm.webp`;

function petals(c, w, h, dpr, hint) {
  const R = Math.min(w, h) / 2; const cx = w / 2; const cy = h / 2;
  c.clearRect(0, 0, w, h);
  c.save();
  c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.clip();
  c.fillStyle = '#B4122A'; c.fillRect(0, 0, w, h); // rose petals while the picture loads
  if (COVER.complete && COVER.naturalWidth) { const s = R * 2 * 1.02; c.drawImage(COVER, cx - s / 2, cy - s / 2, s, s); }
  c.restore();
  // the hint, on a lime-washed ribbon (never straight on the flowers)
  let fs = Math.round(Math.min(R * 0.12, 17 * dpr));
  c.font = `600 ${fs}px Mukta, sans-serif`;
  let tw = c.measureText(hint).width;
  if (tw > w * 0.7) { fs = Math.floor((fs * w * 0.7) / tw); c.font = `600 ${fs}px Mukta, sans-serif`; tw = c.measureText(hint).width; }
  const bw = tw + fs * 2; const bh = fs * 2.3;
  c.fillStyle = 'rgba(255,247,232,0.97)';
  c.beginPath();
  if (c.roundRect) c.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, bh / 2); else c.rect(cx - bw / 2, cy - bh / 2, bw, bh);
  c.fill();
  c.strokeStyle = 'rgba(162,50,27,0.55)'; c.lineWidth = dpr; c.stroke();
  c.fillStyle = '#7E2412'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(hint, cx, cy + fs * 0.06);
}

/** The plate is round and its rim is hard to reach with a finger, so the date shows once about a third of the flower
 *  disc has been brushed aside (measured inside the circle only), instead of the engine's 60% of the card. */
function easyBrush() {
  const wrap = document.querySelector('.rg-scratch');
  const cv = wrap?.querySelector('canvas');
  const btn = wrap?.querySelector('.su-scratch__btn');
  if (!cv || !btn) return;
  const c = cv.getContext('2d', { willReadFrequently: true });
  const cleared = () => {
    const { width: w, height: h } = cv;
    if (!w || !h) return 0;
    const R = Math.min(w, h) / 2; const step = Math.max(6, Math.round(w / 60));
    const data = c.getImageData(0, 0, w, h).data;
    let n = 0; let z = 0;
    for (let y = step / 2; y < h; y += step) {
      for (let x = step / 2; x < w; x += step) {
        if ((x - w / 2) ** 2 + (y - h / 2) ** 2 > (R * 0.97) ** 2) continue;
        n++; if (data[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] < 40) z++;
      }
    }
    return n ? z / n : 0;
  };
  const check = () => { if (!wrap.classList.contains('is-revealed') && cleared() >= 0.36) btn.click(); };
  let moves = 0;
  cv.addEventListener('pointermove', (e) => { if ((e.buttons || e.pointerType === 'touch') && ++moves % 8 === 0) check(); });
  cv.addEventListener('pointerup', check);
  cv.addEventListener('pointercancel', check);
}

// ───────── the page: the courtyard path ─────────
const POL_TILT = [-3.5, 2.5, -1.5, 3.2, -2.4, 1.6, -2.8, 2.2, -1.2];
const ORBIT = 8; // diyos around the countdown

function page(ctx) {
  const { bi, esc, txt, on, AD, BS, c, config, placeLine, mainEv } = ctx;
  const P = ctx.parts;
  const hd = (id, t, kicker) => `<header class="rg-h rg-set">${kicker && on(kicker) ? `<p class="rg-kicker">${bi(kicker)}</p>` : ''}<h2 class="rg-h2" id="${id}">${bi(t)}</h2></header>`;
  const lamps = () => `<div class="rg-lamps" aria-hidden="true">${lamp('diyo', { cls: 'rg-pl', sizes: '64px' })}${lamp('diyo', { cls: 'rg-pl', sizes: '64px' })}</div>`;
  const bsDeva = BS.day && BS.month ? `${BS.month} ${BS.day} गते, ${BS.year}` : BS.full.ne;
  const timeNe = mainEv ? String(ctx.timeLabel(mainEv).ne || '').split('–')[0].trim() : '';

  const couple = P.lead ? `
  <section class="rg-sec rg-couple" id="couple" aria-labelledby="couple-title">
    ${lamps()}
    ${hd('couple-title', txt('couple.title'))}
    <figure class="rg-photo rg-set">
      ${flowers('tl', 'rg-photo__fl', '200px')}
      <div class="rg-photo__pic">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 719px) 80vw, 440px')}</div>
      ${on(txt('couple.line')) ? `<figcaption class="rg-photo__cap">${bi(txt('couple.line'))}</figcaption>` : ''}
    </figure>
  </section>` : '';

  const face = `<div class="rg-thal">
      <div class="rg-thal__in">
        <span class="rg-td__wd">${bi(AD.wd)}</span>
        <span class="rg-td__day">${bi({ en: AD.day, ne: BS.day || ctx.neNum(AD.day) })}</span>
        <span class="rg-td__my">${bi({ en: AD.monthYear.en, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</span>
        <span class="rg-td__alt"><span class="l-en" lang="ne">${esc(bsDeva)}</span><span class="l-ne" lang="ne">${esc(AD.full.ne)}</span></span>
        ${mainEv ? `<span class="rg-td__time">${bi({ en: AD.time, ne: timeNe })}</span>` : ''}
      </div>
    </div>`;
  const dateSec = `
  <section class="rg-sec rg-dates" id="date" aria-labelledby="date-title">
    ${lamps()}
    ${hd('date-title', txt('date.title'), txt('date.kicker'))}
    <div class="rg-set rg-set--plate">${P.scratch(face, 'rg-scratch')}</div>
    ${placeLine?.en || placeLine?.ne ? `<p class="rg-pill rg-set">${bi(placeLine)}</p>` : ''}
  </section>`;

  const countSec = `
  <section class="rg-sec rg-count" id="count" aria-labelledby="count-title">
    ${hd('count-title', txt('count.title'))}
    <div class="rg-dial rg-set" data-countdown>
      <div class="rg-orbit" aria-hidden="true">${Array.from({ length: ORBIT }, (_, i) => `<span class="rg-orbit__p" style="--a:${(360 / ORBIT) * i}deg">${lamp('diyo', { cls: 'rg-ol', sizes: '70px' })}</span>`).join('')}</div>
      <div class="rg-disc">
        <ol class="su-count__grid rg-cd" aria-label="${esc(txt('count.title').en)}">
          ${P.countUnits.map(({ u, label }) => `<li class="rg-cd__cell">${P.countNum(u, 'rg-cd__n')}<span class="rg-cd__l">${bi(label)}</span></li>`).join('')}
        </ol>
        <p class="rg-cd__done" data-count-done hidden></p>
      </div>
    </div>
  </section>`;

  const fam = (f) => `<article class="rg-slab rg-fam__side rg-set">
      ${P.brideGroom ? `<figure class="rg-fam__pic">${ctx.imgTag(f.photo, f.person.name.en, '160px')}</figure>` : ''}
      <p class="rg-kicker2">${bi(f.label)}</p>
      <p class="rg-fam__name">${bi(f.person.fullName)}</p>
      ${f.person.parents?.en || f.person.parents?.ne ? `<p class="rg-fam__of">${bi(f.of)}</p><p class="rg-fam__parents">${bi(f.person.parents)}</p>` : ''}
      ${f.person.home?.en || f.person.home?.ne ? `<p class="rg-fam__home">${bi(f.person.home)}</p>` : ''}
    </article>`;
  const famSec = `
  <section class="rg-sec rg-fams" id="families" aria-labelledby="fam-title">
    ${lamps()}
    ${hd('fam-title', txt('families.title'))}
    <div class="rg-fam">
      ${fam(P.families[0])}
      <div class="rg-fam__mid rg-set">${kalash('rg-kalash', '150px')}</div>
      ${fam(P.families[1])}
    </div>
  </section>`;

  const evs = P.events.map((v) => `
      <li class="rg-ev rg-set" id="ev-${esc(v.id)}">
        <div class="rg-ev__thal" aria-hidden="true"><b>${bi({ en: v.ad.day, ne: v.bs.day || ctx.neNum(v.ad.day) })}</b><span>${bi({ en: v.ad.month.en.slice(0, 3), ne: v.bs.month || v.ad.month.ne })}</span></div>
        <div class="rg-slab rg-ev__card">
          <h3 class="rg-ev__title">${bi(v.title)}</h3>
          <p class="rg-ev__when">${bi({ en: v.ad.full.en, ne: v.bs.full.ne })}</p>
          <p class="rg-ev__time">${bi(v.time)}</p>
          ${v.blurb ? `<p class="rg-ev__blurb">${bi(v.blurb)}</p>` : ''}
          <p class="rg-ev__venue">${bi(v.venue)} <a class="su-link" href="${esc(v.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
          ${v.dress.colors.length || v.dress.text?.en || v.dress.text?.ne ? `<p class="rg-ev__dress">${v.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${v.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(v.dress.text?.en || v.dress.text?.ne ? v.dress.text : P.UI.wear)}</span></p>` : ''}
          ${v.rituals.length ? `<details class="rg-order"><summary>${bi(P.UI.order)}</summary><ol>${v.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
        </div>
      </li>`).join('');
  const progSec = `
  <section class="rg-sec rg-prog" id="programme" aria-labelledby="prog-title">
    ${lamps()}
    ${hd('prog-title', txt('prog.title'), txt('prog.kicker'))}
    <ol class="rg-evs">${evs}</ol>
    <div class="rg-prog__foot rg-set">
      <div class="rg-btns">${P.calendarBtn()}${P.shareBtn()}</div>
      ${P.moreInfo()}
    </div>
  </section>`;

  const photoSec = P.photos.length ? `
  <section class="rg-sec rg-photos" id="photos" aria-labelledby="gal-title">
    ${lamps()}
    ${hd('gal-title', txt('gallery.title'))}
    <div class="rg-pols">${P.photos.map((g, i) => `<figure class="rg-pol" style="--r:${POL_TILT[i % POL_TILT.length]}deg">${P.photoBtn(g, i, '(max-width: 719px) 44vw, 320px', 'rg-pol__btn')}</figure>`).join('')}</div>
  </section>` : '';

  const doorSec = `
  <section class="rg-sec rg-door" id="rsvp" aria-labelledby="rsvp-title">
    ${lamps()}
    <div class="rg-slab rg-word rg-set" id="card">
      <p class="rg-word__line">${bi(txt('card.line'))}</p>
      <p class="rg-word__hosts">${bi(config.hosts)}</p>
      ${P.cardBtn()}
    </div>
    <div class="rg-sill rg-set">
      ${toran('rg-sill__toran', '(max-width: 719px) 100vw, 720px')}
      <div class="rg-slab rg-rsvp">
        ${hd('rsvp-title', txt('rsvp.title'))}
        ${P.deadline?.en || P.deadline?.ne ? `<p class="rg-rsvp__by">${bi(P.deadline)}</p>` : ''}
        ${P.rsvpForm()}
      </div>
    </div>
  </section>`;

  const closing = `
  <footer class="rg-close" aria-label="Blessing">
    <div class="rg-close__in">
      <div class="rg-close__r">${rangoli('rg-mini', [52, 22])}</div>
      <p class="rg-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
      <p class="rg-close__en l-en">${esc(config.closing?.en || '')}</p>
      <p class="rg-close__names"><span>${bi(c.bride.name)}</span><span class="rg-close__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span><span>${bi(c.groom.name)}</span></p>
      ${c.hashtag ? `<p class="rg-close__tag">${esc(c.hashtag)}</p>` : ''}
    </div>
    ${P.madeWith()}
  </footer>`;

  return `
  <section class="su-hero rg-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${hero(ctx)}
    ${P.cue(P.lead ? 'couple' : 'date')}
  </section>
  <div class="rg-path">${couple}${dateSec}${countSec}${famSec}${progSec}${photoSec}${doorSec}</div>
  ${closing}`;
}

/** after the opening: the floor lies flat for good, the rings turn as you scroll, things are set down on the bricks */
function scroll(ctx) {
  const { gsap } = ctx;
  document.body.classList.remove('rg-moving');
  document.body.classList.add('rg-landed');
  gsap.set('#top', { '--k': 0 });
  gsap.set('#top .rg-ring, #top .rg-wick, #top .rg-halo', { clearProps: 'opacity,scale' });
  if (ctx.reduced) return;
  const top = { trigger: '#top', start: 'top top', end: 'bottom top', scrub: 0.6 };
  // the rings turn against each other as the courtyard slides by
  [[3, 24], [2, -46], [1, 80]].forEach(([i, deg]) => gsap.fromTo(`#top .rg-ring--${i}`, { rotation: 0 }, { rotation: deg, ease: 'none', scrollTrigger: top }));
  gsap.fromTo('.rg-mini .rg-ring--2', { rotation: -40 }, { rotation: 40, ease: 'none', scrollTrigger: { trigger: '.rg-close', start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } });
  gsap.fromTo('.rg-mini .rg-ring--1', { rotation: 60 }, { rotation: -60, ease: 'none', scrollTrigger: { trigger: '.rg-close', start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } });

  // set down: each thing comes from just above the floor (larger, tipped) and settles on the bricks
  document.querySelectorAll('.rg-path .rg-set').forEach((el) => {
    gsap.from(el, { scale: 1.07, rotationX: 14, y: -18, opacity: 0, transformPerspective: 900, transformOrigin: '50% 100%', duration: 0.95, ease: 'power3.out', clearProps: 'transform,opacity',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  // the event thals spin onto their tablets
  document.querySelectorAll('.rg-ev__thal').forEach((el) => {
    gsap.fromTo(el, { rotation: -120 }, { rotation: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 60%', scrub: 0.5 } });
  });
  // polaroids dropped onto the bricks, one after another
  document.querySelectorAll('.rg-pol').forEach((el, i) => {
    const r = POL_TILT[i % POL_TILT.length];
    gsap.fromTo(el, { scale: 1.16, rotation: r * 3.2, y: -30, opacity: 0 }, { scale: 1, rotation: r, y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: (i % 3) * 0.08,
      scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });
  // the ring of diyos round the countdown turns with the scroll (each lamp stays upright)
  gsap.fromTo('.rg-orbit', { '--spin': '-30deg' }, { '--spin': '30deg', ease: 'none', scrollTrigger: { trigger: '.rg-dial', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
}

mountSuite({
  slug: 'rangoli',
  manifest,
  gate,
  hero,
  page,
  open,
  scroll,
  scratch: { paint: petals },
  ready() { initNepali(); easyBrush(); },
  gateTap(ctx, go) {
    document.querySelector('.rg-gate')?.addEventListener('click', go);
  },
});
