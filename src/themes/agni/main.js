// Theme · Agni (अग्नि) — the sacred fire at night; the couple walks the seven rounds around it.
// Gate: the night. A brass havan kunda sits unlit at the foot of the screen, brass Ganesh faint above, the names
// barely catching the dark. Tap: one ember drops into the logs, the fire catches (live flames spring up from the logs,
// the glow floods outward, embers rise) and everything warms into the hero, the names lit by the fire.
// Then the pheras: a pinned stage where the camera circles the fire on a real CSS 3D ring. The bride and groom walk
// round after round (a paper-theatre cut-out that turns as it goes behind the fire), a brass diyo on the ring catches
// as each round passes, and the seven vows (सात वचन) come one by one. After it, the page keeps circling: every block
// swings in on an arc around a far-off centre. Engine: src/themes/_suite/suite.js (T.page, T.scroll, T.scratch).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mountSuite } from '../_suite/suite.js';
import manifest from './slots.js';
import { lamp, initNepali } from '../_suite/nepali.js';
import './agni.css';
import { A, kunda, heroHtml, fitKunda, placeUi, sparkDrop, heroEnter } from './parts.js';

// a reload mid-page must start at the gate, not at the restored scroll position behind it
// (ScrollTrigger owns history.scrollRestoration and resets it on every refresh, so set it through ScrollTrigger)
ScrollTrigger.clearScrollMemory('manual');

const ORD = {
  en: ['The first round', 'The second round', 'The third round', 'The fourth round', 'The fifth round', 'The sixth round', 'The seventh round'],
  ne: ['पहिलो फेरा', 'दोस्रो फेरा', 'तेस्रो फेरा', 'चौथो फेरा', 'पाँचौं फेरा', 'छैटौं फेरा', 'सातौं फेरा'],
};
const L = {
  round: { en: 'Round', ne: 'फेरा' },
  of: { en: 'of 7', ne: '/ ७' },
  saveDate: { en: 'Save the date', ne: 'शुभ साइत' },
  witness: { en: 'With Agni as witness', ne: 'अग्नि साक्षी राखी' },
};
/** a heading ornament: hairlines either side of a stepped kunda seen from above */
const mark = (cls = '') => `<svg class="ag-mark ${cls}" viewBox="0 0 200 16" aria-hidden="true" focusable="false">
  <path d="M0 8H82M118 8H200" /><rect x="92" y="-2" width="16" height="16" transform="rotate(45 100 8) translate(0 2)" /><rect x="96" y="2" width="8" height="8" transform="rotate(45 100 6) translate(0 2)" class="ag-f" /></svg>`;

// ───────── the scratch cover: soot and ash over the brass plate ─────────
function paintSoot(c, w, h, dpr, hint) {
  const r = Math.min(w, h) / 2 - 2 * dpr;
  const cx = w / 2; const cy = h / 2;
  c.clearRect(0, 0, w, h);
  c.save();
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
  const g = c.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#2C2320'); g.addColorStop(0.6, '#1C1513'); g.addColorStop(1, '#0F0B0A');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // smudges of soot, wiped in arcs
  for (let i = 0; i < 26; i++) {
    c.strokeStyle = `rgba(${Math.random() > 0.5 ? '70,60,56' : '8,6,6'},${0.12 + Math.random() * 0.2})`;
    c.lineWidth = (10 + Math.random() * 40) * dpr;
    c.lineCap = 'round';
    c.beginPath();
    const a0 = Math.random() * Math.PI * 2; const rr = r * (0.2 + Math.random() * 0.8);
    c.arc(cx, cy, rr, a0, a0 + 0.3 + Math.random() * 0.9);
    c.stroke();
  }
  // ash flecks, and a few embers still warm
  for (let i = 0; i < (w * h) / 700; i++) {
    const t = Math.random();
    c.fillStyle = t > 0.985 ? `rgba(255,${120 + Math.random() * 70},50,${0.5 + Math.random() * 0.4})` : t > 0.55 ? 'rgba(190,178,166,.16)' : 'rgba(0,0,0,.25)';
    const s = (t > 0.985 ? 1.6 : 1) * dpr;
    c.fillRect(cx + (Math.random() * 2 - 1) * r, cy + (Math.random() * 2 - 1) * r, s, s);
  }
  // a thin brass edge still showing round the rim
  c.restore();
  c.strokeStyle = 'rgba(210,172,102,.55)'; c.lineWidth = 1.2 * dpr;
  c.beginPath(); c.arc(cx, cy, r - 0.6 * dpr, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = 'rgba(210,172,102,.22)';
  c.beginPath(); c.arc(cx, cy, r * 0.86, 0, Math.PI * 2); c.stroke();
  // the hint
  const deva = /[ऀ-ॿ]/.test(hint);
  const size = Math.round(Math.min(r / 7.2, 20 * dpr));
  c.font = deva ? `400 ${size}px Kadwa, serif` : `italic 400 ${size}px Castoro, Georgia, serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#E9CF96';
  const words = hint.split(' ');
  const mid = Math.ceil(words.length / 2);
  const lines = c.measureText(hint).width > r * 1.5 ? [words.slice(0, mid).join(' '), words.slice(mid).join(' ')] : [hint];
  lines.forEach((ln, i) => c.fillText(ln, cx, cy + (i - (lines.length - 1) / 2) * size * 1.5));
  // the engine wipes with the current stroke: leave it opaque, or each pass only thins the soot
  c.strokeStyle = '#000'; c.fillStyle = '#000'; c.globalAlpha = 1;
}

// ───────── the page ─────────
function page(ctx) {
  const { bi, esc, txt, on, AD, BS, mainEv, placeLine, config, c, imgTag, parts: P, neNum } = ctx;
  const head = (title, id, kick = null, cls = '') => `<header class="ag-head ag-orb ${cls}">${kick && on(kick) ? `<p class="ag-kick">${bi(kick)}</p>` : ''}<h2 class="ag-h2" id="${id}">${bi(title)}</h2>${mark()}</header>`;
  const time = mainEv ? { en: AD.time, ne: ctx.timeLabel(mainEv).ne } : null;
  const bsShort = BS.full.short?.en ? (/B\.S\./.test(BS.full.short.en) ? BS.full.short.en : `${BS.full.short.en} B.S.`) : BS.full.en;
  const lead = P.lead;

  const hero = heroHtml(ctx);

  const vows = [1, 2, 3, 4, 5, 6, 7].map((n) => txt(`vow.${n}`));
  const pheras = `
    <section class="ag-vows" id="vows" aria-labelledby="vows-title">
      <div class="ag-vows__pin">
        <header class="ag-vows__head">
          ${on(txt('vows.kicker')) ? `<p class="ag-kick">${bi(txt('vows.kicker'))}</p>` : ''}
          <h2 class="ag-h2" id="vows-title">${bi(txt('vows.title'))}</h2>
        </header>
        <div class="ag-stage" aria-hidden="true">
          <div class="ag-stage__light"></div>
          <div class="ag-ring">
            <div class="ag-floor"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="99" class="ag-floor__ring" />${[0, 1, 2, 3, 4, 5, 6].map((k) => { const a = ((STATION + frontAt(k) * TURN) * Math.PI) / 180; return `<circle cx="${(100 + Math.sin(a) * 99).toFixed(2)}" cy="${(100 + Math.cos(a) * 99).toFixed(2)}" r="2.6" class="ag-floor__dot" />`; }).join('')}<circle cx="100" cy="100" r="80" class="ag-floor__in" /></svg></div>
            <div class="ag-axis">${kunda('ag-kunda--stage', '(max-width: 700px) 46vw, 340px', { embers: 9 })}</div>
            ${[0, 1, 2, 3, 4, 5, 6].map((k) => `<div class="ag-st" data-st="${k}">${lamp('diyo', { cls: 'ag-st__lamp', sizes: '80px' })}</div>`).join('')}
            <div class="ag-walk"><img src="${A}pheras-sm.webp" srcset="${A}pheras-sm.webp 600w, ${A}pheras.webp 1547w" sizes="(max-width: 700px) 46vw, 380px" alt="" loading="lazy" decoding="async" /></div>
          </div>
        </div>
        <div class="ag-vows__text">
          <p class="ag-round"><span class="l-en">${L.round.en} <b data-round>1</b> ${L.of.en}</span><span class="l-ne" lang="ne">${L.round.ne} <b data-round-ne>१</b> ${L.of.ne}</span></p>
          <ol class="ag-vowlist">
            ${vows.map((v, i) => `<li class="ag-vow${i ? '' : ' is-on'}" data-vow="${i}">
              <p class="ag-vow__no">${bi({ en: ORD.en[i], ne: ORD.ne[i] })}</p>
              <p class="ag-vow__t">${bi(v)}</p>
            </li>`).join('')}
          </ol>
        </div>
      </div>
    </section>`;

  const plate = `<div class="ag-plate">
      <div class="ag-plate__in">
        <p class="ag-plate__k">${bi(L.saveDate)}</p>
        <p class="ag-plate__wd">${bi(AD.wd)}</p>
        <p class="ag-plate__day">${bi({ en: AD.day, ne: BS.day || neNum(AD.day) })}</p>
        <p class="ag-plate__my">${bi({ en: `${AD.month.en} ${AD.year}`, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</p>
        ${time ? `<p class="ag-plate__t">${bi(time)}</p>` : ''}
        <p class="ag-plate__alt">${bi({ en: bsShort, ne: AD.full.ne })}</p>
      </div>
    </div>`;

  const countdown = `<div class="ag-count ag-orb" data-countdown>
      <p class="ag-count__title">${bi(txt('count.title'))}</p>
      <ol class="ag-count__row su-count__grid" aria-label="${esc(txt('count.title').en)}">
        ${P.countUnits.map(({ u, label }) => `<li class="ag-count__cell">${P.countNum(u, 'ag-count__n')}<span class="ag-count__l">${bi(label)}</span></li>`).join('')}
      </ol>
      <p class="ag-count__done" data-count-done hidden></p>
    </div>`;

  const fam = (f, side) => {
    const p = f.person;
    return `<div class="ag-fam__side ag-fam__side--${side} ag-orb">
      ${P.brideGroom && f.photo ? `<figure class="ag-fam__pic">${imgTag(f.photo, p.name.en, '150px')}</figure>` : ''}
      <p class="ag-fam__k">${bi(f.label)}</p>
      <h3 class="ag-fam__name">${bi(p.fullName)}</h3>
      ${p.parents?.en || p.parents?.ne ? `<p class="ag-fam__of">${bi(f.of)}</p><p class="ag-fam__par">${bi(p.parents)}</p>` : ''}
      ${p.home?.en || p.home?.ne ? `<p class="ag-fam__home">${bi(p.home)}</p>` : ''}
    </div>`;
  };

  const ceremony = (ev, i) => {
    const dress = ev.dress.colors.length || ev.dress.text?.en || ev.dress.text?.ne;
    return `<li class="ag-ev ${i % 2 ? 'ag-ev--r' : 'ag-ev--l'}" id="ev-${esc(ev.id)}">
      <div class="ag-ev__node" aria-hidden="true">${lamp('diyo', { cls: 'ag-ev__lamp', sizes: '64px' })}</div>
      <div class="ag-ev__card ag-orb">
        <div class="ag-ev__date" aria-hidden="true"><span class="ag-ev__day">${bi({ en: ev.ad.day, ne: ev.bs.day || neNum(ev.ad.day) })}</span><span class="ag-ev__my">${bi({ en: `${ev.ad.month.en.slice(0, 3)} ${ev.ad.year}`, ne: ev.bs.month || ev.ad.month.ne })}</span></div>
        <div class="ag-ev__main">
          <h3 class="ag-ev__title">${bi(ev.title)}</h3>
          <p class="ag-ev__when">${bi({ en: ev.ad.full.en, ne: ev.bs.full.ne })}</p>
          <p class="ag-ev__alt">${bi({ en: ev.bs.full.short?.en ? `${ev.bs.full.short.en}${/B\.S\./.test(ev.bs.full.short.en) ? '' : ' B.S.'}` : ev.bs.full.en, ne: ev.ad.full.ne })}</p>
          <p class="ag-ev__time">${bi(ev.time)}</p>
          ${ev.blurb ? `<p class="ag-ev__blurb">${bi(ev.blurb)}</p>` : ''}
          <p class="ag-ev__venue">${bi(ev.venue)} <a class="ag-link" href="${esc(ev.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
          ${dress ? `<p class="ag-ev__dress">${ev.dress.colors.length ? `<span class="ag-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : P.UI.wear)}</span></p>` : ''}
          ${ev.rituals.length ? `<details class="ag-ev__order"><summary>${bi(P.UI.order)}</summary><ol>${ev.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
        </div>
      </div>
    </li>`;
  };

  return `
  <section class="su-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${hero}
    ${P.cue('vows')}
  </section>

  <div class="ag-page">
    ${pheras}

    ${lead ? `<section class="ag-sec ag-couple" id="couple" aria-labelledby="couple-title">
      <figure class="ag-couple__pic ag-orb">${imgTag(lead.photo, lead.alt, '(max-width: 700px) 84vw, 460px')}</figure>
      <div class="ag-couple__text">
        ${head(txt('couple.title'), 'couple-title', null, 'ag-head--left')}
        ${on(txt('couple.line')) ? `<p class="ag-lede ag-orb">${bi(txt('couple.line'))}</p>` : ''}
      </div>
    </section>` : ''}

    <section class="ag-sec ag-date" id="date" aria-labelledby="date-title">
      ${head(txt('date.title'), 'date-title', txt('date.kicker'))}
      <div class="ag-date__grid">
        <div class="ag-orb ag-platewrap">${P.scratch(plate, 'ag-scratch')}${placeLine?.en || placeLine?.ne ? `<p class="ag-date__place">${bi(placeLine)}</p>` : ''}</div>
        ${countdown}
      </div>
    </section>

    <section class="ag-sec ag-fam" id="families" aria-labelledby="fam-title">
      ${head(txt('families.title'), 'fam-title')}
      <div class="ag-fam__grid">${fam(P.families[0], 'l')}<div class="ag-fam__mid" aria-hidden="true">${lamp('panas', { cls: 'ag-fam__panas', sizes: '90px' })}</div>${fam(P.families[1], 'r')}</div>
    </section>

    <section class="ag-sec ag-prog" id="programme" aria-labelledby="prog-title">
      ${head(txt('prog.title'), 'prog-title', txt('prog.kicker'))}
      <ol class="ag-evs">${P.events.map(ceremony).join('')}</ol>
      <div class="ag-btns ag-orb">${P.calendarBtn()}${P.shareBtn()}</div>
      ${P.moreInfo() ? `<div class="ag-more ag-orb">${P.moreInfo()}</div>` : ''}
    </section>

    ${P.photos.length ? `<section class="ag-sec ag-gal" id="photos" aria-labelledby="gal-title">
      ${head(txt('gallery.title'), 'gal-title')}
      <div class="ag-gal__grid">${P.photos.map((g, i) => `<figure class="ag-gal__ph ag-orb">${P.photoBtn(g, i, '(max-width: 700px) 46vw, 340px', 'ag-gal__btn')}</figure>`).join('')}</div>
    </section>` : ''}

    <section class="ag-sec ag-card" id="card" aria-labelledby="card-title">
      <div class="ag-card__in ag-orb">
        ${ctx.ganesh('ag-card__gan', '72px')}
        <p class="ag-kick">${bi(L.witness)}</p>
        <h2 class="ag-card__line" id="card-title">${bi(txt('card.line'))}</h2>
        <p class="ag-card__hosts">${bi(config.hosts)}</p>
        ${P.cardBtn()}
      </div>
    </section>

    <section class="ag-sec ag-rsvp" id="rsvp" aria-labelledby="rsvp-title">
      <div class="ag-rsvp__card ag-orb">
        <header class="ag-rsvp__head">${mark()}<h2 class="ag-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>${P.deadline?.en || P.deadline?.ne ? `<p class="ag-rsvp__dl">${bi(P.deadline)}</p>` : ''}</header>
        ${P.rsvpForm()}
      </div>
    </section>

    <footer class="ag-close" aria-label="Blessing">
      <div class="ag-close__lamps" aria-hidden="true">${lamp('diyo', { cls: 'ag-close__diyo', sizes: '90px' })}${lamp('diyo', { cls: 'ag-close__diyo ag-close__diyo--r', sizes: '90px' })}</div>
      <div class="ag-close__text ag-orb">
        <p class="ag-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
        <p class="ag-close__en l-en">${esc(config.closing?.en || '')}</p>
        ${mark()}
        <p class="ag-close__names">${ctx.names('&amp;')}</p>
        ${c.hashtag ? `<p class="ag-close__tag">${esc(c.hashtag)}</p>` : ''}
      </div>
      ${P.madeWith()}
    </footer>
  </div>`;
}

// ───────── the pheras stage: a CSS 3D ring, driven by scroll ─────────
const TILT = 21;                 // the camera looks down on the floor by this much (deg)
const TRAVEL = 6 * 360 + 180;   // the couple's walk: from the left side, seven passes in front, to the right side
const TURN = 300;                // how far the camera circles over the whole walk (deg)
const W0 = -90;
const frontAt = (k) => (360 * k - W0) / TRAVEL;     // scroll progress when the couple passes in front for round k
const STATION = 34;              // a round's diyo stands this far right of the front when the couple passes it

function stage() {
  const st = document.querySelector('.ag-stage');
  const ring = st.querySelector('.ag-ring');
  const axis = st.querySelector('.ag-axis');
  const walk = st.querySelector('.ag-walk');
  const lamps = [...st.querySelectorAll('.ag-st')];
  const vows = [...document.querySelectorAll('.ag-vow')];
  const rEn = document.querySelector('[data-round]');
  const rNe = document.querySelector('[data-round-ne]');
  let R = 140;
  const size = () => {
    const w = st.clientWidth; const h = st.clientHeight;
    R = Math.max(70, Math.min(w * 0.37, h * 0.46, 300));
    st.style.setProperty('--R', `${R.toFixed(1)}px`);
  };
  let lastRound = -1;
  const render = (p) => {
    const W = W0 + p * TRAVEL;
    const Aa = -p * TURN;
    ring.style.transform = `rotateX(${-TILT}deg) rotateY(${Aa.toFixed(2)}deg)`;
    axis.style.transform = `rotateY(${(-Aa).toFixed(2)}deg) rotateX(${TILT}deg)`;
    const phi = W - Aa;
    walk.style.transform = `rotateY(${phi.toFixed(2)}deg) translateZ(${R.toFixed(1)}px) rotateY(${(-phi - Aa).toFixed(2)}deg) rotateX(${TILT}deg) rotateY(${W.toFixed(2)}deg)`;
    lamps.forEach((el, k) => {
      const th = STATION + frontAt(k) * TURN;
      el.style.transform = `rotateY(${th.toFixed(2)}deg) translateZ(${(R * 1.24).toFixed(1)}px) rotateY(${(-th - Aa).toFixed(2)}deg) rotateX(${TILT}deg)`;
      el.classList.toggle('is-lit', W >= 360 * k - 14);
    });
    vows.forEach((el, k) => {
      const o = Math.max(0, Math.min(1, 1 - (Math.abs(W - 360 * k) - 125) / 45));
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - o) * (W > 360 * k ? -14 : 14)).toFixed(1)}px, 0)`;
      el.classList.toggle('is-on', o > 0.5);
    });
    const round = Math.max(0, Math.min(6, Math.round(W / 360)));
    if (round !== lastRound) {
      lastRound = round;
      rEn.textContent = String(round + 1);
      rNe.textContent = '१२३४५६७'[round];
    }
  };
  size();
  return { size, render };
}

const T = {
  slug: 'agni',
  manifest,
  art: A,

  // the gate is see-through: the hero waits underneath in the dark, unlit
  gate: () => '<div class="ag-g"><i class="ag-spark"></i></div>',

  page,

  ready(ctx) {
    initNepali();
    if (ctx.reduced) document.body.classList.add('ag-reduced');
    const ne = document.getElementById('f-name-err'); if (ne) { ne.hidden = false; ne.setAttribute('role', 'alert'); }
    // another theme's first screen may stand in for the hero, and another theme's gate for the gate (docs/MIX.md)
    const top = document.querySelector('.su-hero');
    const ui = document.getElementById('gui');
    const root = document.documentElement;
    const fit = () => {
      if (top) fitKunda(top, root);
      if (ui && !document.body.classList.contains('is-open')) placeUi(top, ui);
    };
    fit();
    document.fonts?.ready.then(fit);
    let raf = 0;
    addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });
    document.addEventListener('langchange', () => requestAnimationFrame(fit));
    ctx.stage = stage();
    ctx.stage.render(0.02);
  },

  open(ctx, tl) {
    const top = document.getElementById('top');
    // one ember drops from where the guest tapped into the logs, and the fire catches as it lands
    sparkDrop(tl, document.querySelector('.ag-spark'), document.getElementById('open').getBoundingClientRect(), top);
    return heroEnter(tl, 0.88, top);
  },

  // after another theme's gate: the fire catches as the gate clears (its words follow, from the engine)
  heroIntro(ctx, tl, t) {
    const top = document.querySelector('.su-hero');
    if (!ctx.reduced && top?.querySelector('.ag-hero')) heroEnter(tl, t, top);
  },

  ambient(ctx) {
    if (ctx.reduced) return;
    // embers rise only while their fire is on screen
    document.querySelectorAll('.ag-embers').forEach((em) => {
      new IntersectionObserver(([e]) => em.classList.toggle('is-live', e.isIntersecting), { rootMargin: '60px' }).observe(em.closest('.ag-kunda'));
    });
  },

  scroll(ctx) {
    const { ScrollTrigger } = ctx;
    const S = ctx.stage;
    addEventListener('resize', () => S.size());
    if (ctx.reduced) { S.render(frontAt(0) - 0.012); document.querySelectorAll('.ag-st').forEach((el) => el.classList.add('is-lit')); return; }

    // the pheras: pin the stage and walk the seven rounds with the scroll
    ScrollTrigger.create({
      trigger: '#vows',
      pin: '.ag-vows__pin',
      start: 'top top',
      end: () => `+=${Math.round(innerHeight * 6.2)}`,
      onUpdate: (self) => S.render(self.progress),
      onRefresh: (self) => { S.size(); S.render(self.progress); },
    });

    // the hero's words drift up and away as the walk begins
    if (document.querySelector('.su-hero .ag-hero')) gsap.to('.su-hero :is(.ag-hero__top, .ag-names, .ag-hero__after)', { y: -40, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true } });

    // after the walk the page keeps circling: each block swings in on an arc round a far-off centre
    let side = 1;
    document.querySelectorAll('.ag-orb').forEach((el) => {
      const sec = el.closest('section, footer');
      if (sec && sec.dataset.side === undefined) { sec.dataset.side = String(side); side = -side; }
      const s = Number(sec?.dataset.side || 1);
      gsap.fromTo(el, { opacity: 0, rotateY: s * 26, transformPerspective: 1400, transformOrigin: `50% 50% -${Math.round(Math.min(innerWidth, 900) * 0.9)}` }, {
        opacity: 1, rotateY: 0, duration: 1.2, ease: 'power3.out', clearProps: 'transform',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
    // the diyos along the programme catch as they come up
    document.querySelectorAll('.ag-ev__node').forEach((n) => {
      ScrollTrigger.create({ trigger: n, start: 'top 75%', once: true, onEnter: () => n.classList.add('is-lit') });
    });
  },

  scratch: { paint: paintSoot },
};

mountSuite(T);
