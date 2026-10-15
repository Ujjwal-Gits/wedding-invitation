// Theme · Pardaa (पर्दा) — red velvet curtains open once on a Nepali mandap.
// Gate: a pair of closed deep-red velvet curtains with gold zari and a tasselled valance; Ganesh in an ivory medallion,
// शुभ विवाह and the names in gold. Tap: the halves draw apart and gather to the sides under the valance, warm light rises
// behind, a few marigold and rose petals fall, and the hero is revealed: the mandap, framed by the same curtains tied
// back with gold ropes. Then a calm ivory card in sindoor red and antique gold: the couple in a mandap arch, a red silk
// envelope sealed in gold wax (scratch to reveal the date), four diya columns counting down, the families either side
// of a kalash, one themed panel per ceremony, the photographs, the card wording, the RSVP and a marigold toran.
// Engine: src/themes/_suite/suite.js (T.page, T.scroll, T.scratch).
import { gsap } from 'gsap';
import { mountSuite } from '../_suite/suite.js';
import manifest from './slots.js';
import { kalash as npKalash, ganthi, initNepali } from '../_suite/nepali.js';
import './pardaa.css';
import { A, rule, lotus, archLines, heroHtml, gateScene, gateExit, heroEnter, fitRoom, heroAmbient, heroScroll } from './parts.js';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const L = {
  saveDate: { en: 'Save the date', ne: 'शुभ साइत' },
  knot: { en: 'Two families, tied in one knot', ne: 'दुई परिवार, एउटै गाँठोमा' },
};
/** which ceremony is this? → its look */
function kind(ev) {
  const s = `${ev.id} ${ev.title?.en || ''} ${ev.title?.ne || ''}`.toLowerCase();
  if (/mehe?ndi|मेहे?न्दी|henna/.test(s)) return 'mehendi';
  if (/haldi|hardi|हल्दी|besar|बेसार|tel|तेल/.test(s)) return 'haldi';
  if (/recep|bhoj|भोज|रिसेप्सन|party/.test(s)) return 'reception';
  if (/wedding|bibaha|vivah|विवाह|swayamb|स्वयम्ब|sindoor|सिन्दूर|janti|जन्ती|lagan/.test(s)) return 'wedding';
  return 'mandap';
}
const ART = { mehendi: 'mehendi', haldi: 'haldi', wedding: 'sindoor', reception: 'reception', mandap: 'mandap' };

// ───────── the foil: red silk with a gold wax seal ─────────
function paintSilk(c, w, h, dpr, hint) {
  const g = c.createLinearGradient(0, 0, w, h);
  [[0, '#6E0F14'], [0.3, '#9A1C22'], [0.5, '#7A1218'], [0.72, '#A3232A'], [1, '#650C11']].forEach(([o, col]) => g.addColorStop(o, col));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 11; i++) { // silk sheen
    const x = (i / 11) * w * 1.5 - w * 0.25; const bw = w * (0.02 + Math.random() * 0.06);
    c.fillStyle = `rgba(255,190,170,${0.03 + Math.random() * 0.06})`;
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x + bw, 0); c.lineTo(x + bw - h * 0.35, h); c.lineTo(x - h * 0.35, h); c.closePath(); c.fill();
  }
  for (let i = 0; i < (w * h) / 900; i++) { c.fillStyle = Math.random() > 0.5 ? 'rgba(255,220,200,.07)' : 'rgba(30,0,0,.12)'; c.fillRect(Math.random() * w, Math.random() * h, dpr, dpr); }
  const gold = (a = 1) => { const gg = c.createLinearGradient(0, 0, w, 0); gg.addColorStop(0, `rgba(190,140,60,${a})`); gg.addColorStop(0.5, `rgba(246,214,140,${a})`); gg.addColorStop(1, `rgba(190,140,60,${a})`); return gg; };
  // the envelope: a gold border and the flap
  c.strokeStyle = gold(0.9); c.lineWidth = 1.2 * dpr;
  c.strokeRect(9 * dpr, 9 * dpr, w - 18 * dpr, h - 18 * dpr);
  const fy = h * 0.5;
  c.beginPath(); c.moveTo(9 * dpr, 9 * dpr); c.lineTo(w / 2, fy); c.lineTo(w - 9 * dpr, 9 * dpr); c.stroke();
  c.strokeStyle = gold(0.35); c.beginPath(); c.moveTo(9 * dpr, h - 9 * dpr); c.lineTo(w / 2, fy + h * 0.08); c.lineTo(w - 9 * dpr, h - 9 * dpr); c.stroke();
  // the wax seal
  const r = Math.min(w, h) * 0.13;
  const sg = c.createRadialGradient(w / 2 - r * 0.3, fy - r * 0.35, r * 0.1, w / 2, fy, r);
  sg.addColorStop(0, '#FBE3A0'); sg.addColorStop(0.55, '#D9A84E'); sg.addColorStop(1, '#9C6B24');
  c.fillStyle = sg;
  c.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 18) { const rr = r * (1 + 0.05 * Math.sin(a * 7)); c.lineTo(w / 2 + Math.cos(a) * rr, fy + Math.sin(a) * rr); }
  c.fill();
  c.strokeStyle = 'rgba(110,70,20,.6)'; c.lineWidth = dpr; c.beginPath(); c.arc(w / 2, fy, r * 0.74, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#7A1218'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `600 ${Math.round(r * 0.62)}px Eczar, serif`; c.fillText('शुभ', w / 2, fy + r * 0.06);
  // the hint
  const deva = /[ऀ-ॿ]/.test(hint);
  const size = Math.round(Math.min(w / 17, 21 * dpr));
  c.font = deva ? `500 ${size}px Eczar, serif` : `italic 400 ${size}px 'Playfair Display', serif`;
  c.fillStyle = '#F3D9A0'; c.fillText(hint, w / 2, fy + r + size * 1.5);
}

// ───────── the page after the gate ─────────
function page(ctx) {
  const { bi, esc, txt, on, AD, BS, mainEv, placeLine, config, c, imgTag, parts: P } = ctx;
  const head = (title, id, kick = null, cls = '') => `<header class="pd-head pd-up ${cls}">${lotus()}${kick && on(kick) ? `<p class="pd-kick">${bi(kick)}</p>` : ''}<h2 class="pd-h2" id="${id}">${bi(title)}</h2>${rule('pd-head__rule')}</header>`;
  const time = mainEv ? { en: AD.time, ne: ctx.timeLabel(mainEv).ne } : null;
  const bsShort = BS.full.short?.en ? (/B\.S\./.test(BS.full.short.en) ? BS.full.short.en : `${BS.full.short.en} B.S.`) : BS.full.en;
  const lead = P.lead;

  const envelope = `<div class="pd-env">
      <p class="pd-env__k">${bi(L.saveDate)}</p>
      <p class="pd-env__wd">${bi(AD.wd)}</p>
      <p class="pd-env__day">${bi({ en: AD.day, ne: BS.day || ctx.neNum(AD.day) })}</p>
      <p class="pd-env__my">${bi({ en: `${AD.month.en} ${AD.year}`, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</p>
      ${time ? `<p class="pd-env__t">${bi(time)}</p>` : ''}
      ${rule('pd-env__rule')}
      <p class="pd-env__alt">${bi({ en: bsShort, ne: AD.full.ne })}</p>
      ${placeLine?.en || placeLine?.ne ? `<p class="pd-env__place">${bi(placeLine)}</p>` : ''}
    </div>`;

  const diya = `<svg class="pd-diya" viewBox="0 0 40 30" aria-hidden="true" focusable="false">
      <path class="pd-diya__flame" d="M20 1c4 5 5 9 0 14-5-5-4-9 0-14z" />
      <path class="pd-diya__bowl" d="M4 18c4 7 28 7 32 0-6 2-26 2-32 0z" /><path class="pd-diya__lip" d="M4 18c6 2 26 2 32 0" /></svg>`;
  const countdown = `<div class="pd-count pd-up" data-countdown>
      <p class="pd-count__title">${bi(txt('count.title'))}</p>
      <ol class="pd-count__row su-count__grid" aria-label="${esc(txt('count.title').en)}">
        ${P.countUnits.map(({ u, label }) => `<li class="pd-col">${diya}<div class="pd-col__body">${archLines()}${P.countNum(u, 'pd-col__n')}<span class="pd-col__l">${bi(label)}</span></div></li>`).join('')}
      </ol>
      <p class="pd-count__done" data-count-done hidden></p>
    </div>`;

  const fam = (f) => {
    const p = f.person;
    return `<div class="pd-fam__side">
      ${P.brideGroom && f.photo ? `<figure class="pd-fam__pic">${imgTag(f.photo, p.name.en, '140px')}</figure>` : ''}
      <p class="pd-fam__k">${bi(f.label)}</p>
      <h3 class="pd-fam__name">${bi(p.fullName)}</h3>
      ${p.parents?.en || p.parents?.ne ? `<p class="pd-fam__of">${bi(f.of)}</p><p class="pd-fam__par">${bi(p.parents)}</p>` : ''}
      ${p.home?.en || p.home?.ne ? `<p class="pd-fam__home">${bi(p.home)}</p>` : ''}
    </div>`;
  };

  const ceremony = (ev, i) => {
    const k = kind(ev.e);
    const art = ART[k];
    const dress = ev.dress.colors.length || ev.dress.text?.en || ev.dress.text?.ne;
    return `<li class="pd-cer pd-cer--${k} ${i % 2 ? 'pd-cer--flip' : ''}" id="ev-${esc(ev.id)}">
      <figure class="pd-cer__art"><img src="${A}${art}-sm.webp" srcset="${A}${art}-sm.webp 360w, ${A}${art}.webp 720w" sizes="(max-width: 899px) 62vw, 340px" alt="" loading="lazy" decoding="async" /></figure>
      <div class="pd-cer__text pd-up">
        <p class="pd-cer__no">${bi({ en: `Ceremony ${ROMAN[i] || i + 1}`, ne: `कार्यक्रम ${ctx.neNum(String(i + 1))}` })}</p>
        <h3 class="pd-cer__title">${bi(ev.title)}</h3>
        ${rule('pd-cer__rule')}
        <p class="pd-cer__when">${bi({ en: ev.ad.full.en, ne: ev.bs.full.ne })}</p>
        <p class="pd-cer__alt">${bi({ en: ev.bs.full.short?.en ? `${ev.bs.full.short.en}${/B\.S\./.test(ev.bs.full.short.en) ? '' : ' B.S.'}` : ev.bs.full.en, ne: ev.ad.full.ne })}</p>
        <p class="pd-cer__time">${bi(ev.time)}</p>
        ${ev.blurb ? `<p class="pd-cer__blurb">${bi(ev.blurb)}</p>` : ''}
        <p class="pd-cer__venue">${bi(ev.venue)} <a class="pd-link" href="${esc(ev.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
        ${dress ? `<p class="pd-cer__dress">${ev.dress.colors.length ? `<span class="pd-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : P.UI.wear)}</span></p>` : ''}
        ${ev.rituals.length ? `<details class="pd-cer__order"><summary>${bi(P.UI.order)}</summary><ol>${ev.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
      </div>
    </li>`;
  };

  return `
  <section class="su-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${heroHtml(ctx)}
    ${P.cue(lead ? 'couple' : 'date')}
  </section>

  <div class="pd-page">
    ${lead ? `<section class="pd-sec pd-couple" id="couple" aria-labelledby="couple-title">
      ${head(txt('couple.title'), 'couple-title')}
      <figure class="pd-arch pd-up">${archLines()}${archLines()}<div class="pd-arch__pic">${imgTag(lead.photo, lead.alt, '(max-width: 700px) 80vw, 440px')}</div></figure>
      ${on(txt('couple.line')) ? `<p class="pd-lede pd-up">${bi(txt('couple.line'))}</p>` : ''}
    </section>` : ''}

    <section class="pd-sec pd-date" id="date" aria-labelledby="date-title">
      ${head(txt('date.title'), 'date-title', txt('date.kicker'))}
      <div class="pd-up pd-envwrap">${P.scratch(envelope, 'pd-scratch')}</div>
      ${countdown}
    </section>

    <section class="pd-sec pd-fam" id="families" aria-labelledby="fam-title">
      ${head(txt('families.title'), 'fam-title')}
      <div class="pd-fam__grid pd-up">${fam(P.families[0])}<div class="pd-fam__mid" aria-hidden="true"><i></i>${npKalash('pd-fam__kalash', '60px')}<i></i></div>${fam(P.families[1])}</div>
      <figure class="pd-knot">${ganthi('pd-knot__img', '100vw')}<figcaption class="pd-knot__line">${bi(L.knot)}</figcaption></figure>
    </section>

    <section class="pd-sec pd-prog" id="programme" aria-labelledby="prog-title">
      ${head(txt('prog.title'), 'prog-title', txt('prog.kicker'))}
      <ol class="pd-cers">${P.events.map(ceremony).join('')}</ol>
      <div class="pd-btns pd-up">${P.calendarBtn()}${P.shareBtn()}</div>
      ${P.moreInfo() ? `<div class="pd-more pd-up">${P.moreInfo()}</div>` : ''}
    </section>

    ${P.photos.length ? `<section class="pd-sec pd-gal" id="photos" aria-labelledby="gal-title">
      ${head(txt('gallery.title'), 'gal-title')}
      <div class="pd-gal__grid">${P.photos.map((g, i) => `<figure class="pd-gal__ph pd-up">${P.photoBtn(g, i, '(max-width: 700px) 46vw, 340px', 'pd-gal__btn')}</figure>`).join('')}</div>
    </section>` : ''}

    <section class="pd-sec pd-card" id="card" aria-labelledby="card-title">
      <div class="pd-card__in pd-up">
        ${ctx.ganesh('pd-card__gan', '88px')}
        ${rule()}
        <h2 class="pd-card__line" id="card-title">${bi(txt('card.line'))}</h2>
        <p class="pd-card__hosts">${bi(config.hosts)}</p>
        ${P.cardBtn()}
        ${rule()}
      </div>
    </section>

    <section class="pd-sec pd-rsvp" id="rsvp" aria-labelledby="rsvp-title">
      <div class="pd-rsvp__card pd-up">
        <header class="pd-rsvp__band">${lotus('pd-lotus--light')}<h2 class="pd-rsvp__title" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>${P.deadline?.en || P.deadline?.ne ? `<p class="pd-rsvp__dl">${bi(P.deadline)}</p>` : ''}</header>
        <div class="pd-rsvp__body">${P.rsvpForm()}</div>
      </div>
    </section>

    <footer class="pd-close" aria-label="Blessing">
      <div class="pd-close__toran" aria-hidden="true"></div>
      <div class="pd-close__text pd-up">
        <p class="pd-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
        <p class="pd-close__en l-en">${esc(config.closing?.en || '')}</p>
        ${rule()}
        <p class="pd-close__names">${ctx.names('&amp;')}</p>
        ${c.hashtag ? `<p class="pd-close__tag">${esc(c.hashtag)}</p>` : ''}
      </div>
      <div class="pd-dhaka" aria-hidden="true"></div>
      ${P.madeWith()}
    </footer>
  </div>`;
}

const T = {
  slug: 'pardaa',
  manifest,
  art: A,

  gate: gateScene,

  page,

  ready() {
    initNepali();
    const ne = document.getElementById('f-name-err'); if (ne) { ne.hidden = false; ne.setAttribute('role', 'alert'); } // engine leaves it [hidden]
    // the mandap takes whatever room the words leave, so the hero fits one screen (another theme's first screen: skipped)
    fitRoom(document, document.documentElement);
  },

  open(ctx, tl, gate) {
    // the curtains draw apart and the warm light clears; the hero comes in behind them
    gateExit(tl, gate);
    heroEnter(tl, 0.9, document.getElementById('top'));
    return 1.95;
  },

  ambient(ctx) {
    heroAmbient(document.getElementById('top'), ctx.reduced);
    if (ctx.reduced) return;
    // the diya flames flicker only while the countdown is on screen
    const count = document.querySelector('.pd-count');
    if (count) new IntersectionObserver(([e]) => count.classList.toggle('is-lit', e.isIntersecting)).observe(count);
  },

  scroll(ctx) {
    const { ScrollTrigger } = ctx;
    if (ctx.reduced) return;
    // slow parallax: the mandap sinks a little slower than the page, the tied curtains a touch faster
    heroScroll(document.getElementById('top'));
    // each section's pieces rise with a slight tilt that settles flat
    document.querySelectorAll('.pd-up').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 46, rotateX: -10, transformPerspective: 1000, transformOrigin: '50% 100%' }, {
        opacity: 1, y: 0, rotateX: 0, duration: 1.05, ease: 'power3.out', clearProps: 'transform',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });
    // the ganthi bandhan: the knotted shawls rise and turn toward us
    gsap.fromTo('.pd-knot__img', { opacity: 0, y: 80, rotateX: -38, scale: 0.88, transformPerspective: 900, transformOrigin: '50% 100%' }, {
      opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 1.4, ease: 'power3.out', clearProps: 'transform',
      scrollTrigger: { trigger: '.pd-knot', start: 'top 85%', once: true },
    });
    gsap.fromTo('.pd-knot__line', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.5, ease: 'power2.out', scrollTrigger: { trigger: '.pd-knot', start: 'top 85%', once: true } });
    // the ceremony vignettes lift in 3D as their panels enter
    document.querySelectorAll('.pd-cer__art img').forEach((im, i) => {
      const flip = im.closest('.pd-cer--flip');
      gsap.fromTo(im, { opacity: 0, y: 70, rotateX: -24, rotateY: flip ? 14 : -14, scale: 0.92, transformPerspective: 900, transformOrigin: '50% 100%' }, {
        opacity: 1, y: 0, rotateX: 0, rotateY: 0, scale: 1, duration: 1.3, ease: 'power3.out', clearProps: 'transform',
        scrollTrigger: { trigger: im.closest('.pd-cer'), start: 'top 82%', once: true },
      });
      void i;
    });
  },

  scratch: { paint: paintSilk },
};

mountSuite(T);
