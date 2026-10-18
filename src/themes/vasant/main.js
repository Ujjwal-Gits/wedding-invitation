// Theme · Vasant (वसन्त) — the spring garden of butterflies: a botanical book come alive.
// Gate: a fresh marigold-and-rose garland hangs across cream paper; a dozen butterflies rest on it, breathing.
// Tap (signature moment one): they lift off on a stagger and scatter to the edges; three stay. The names appear on
// the paper under the garland, framed by its hanging strings like a doorway.
// Body (signature moment two, the sticky bloom window): each ceremony has its own flower, painted as a botanical
// plate. As its card scrolls by, the flower opens from bud to full bloom and two butterflies come to it. Desktop: the
// window is the sticky left half; phone: a sticky band above the cards. Everything else stays quiet (fade-ups).
// Then: the couple tipped onto a herbarium sheet, the date under a butterfly wing (scratch), the countdown as
// wingbeats, the two families as a plate of two pressed sprays, the photographs as herbarium plates, the card,
// the reply as a seed packet.
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import './vasant.css'; // after the suite's CSS, so the theme wins ties
import { ART, SPECIES, butterfly, garland, FLOWERS, flowersFor, ROMAN } from './parts.js';

const isPhone = () => window.matchMedia('(max-width: 899px)').matches;

// ───────── first screen ─────────
function hero(ctx) {
  const { bi, txt, on, c, AD, BS, placeLine, mainEv } = ctx;
  const bsLine = BS.full.short?.en ? (/B\.S\./.test(BS.full.short.en) ? BS.full.short.en : `${BS.full.short.en} B.S.`) : BS.full.en;
  return `
    ${garland()}
    <div class="va-hero__text">
      ${on(txt('hero.title')) ? `<p class="va-kicker su-in">${bi(txt('hero.title'))}</p>` : ''}
      <h1 class="va-names su-in"><span class="va-names__n">${bi(c.bride.name)}</span><span class="va-names__amp" aria-hidden="true">&amp;</span><span class="sr-only"> and </span><span class="va-names__n">${bi(c.groom.name)}</span></h1>
      ${on(txt('hero.line')) ? `<p class="va-hero__line su-in">${bi(txt('hero.line'))}</p>` : ''}
      <p class="va-hero__date su-in"><span class="va-hero__ad">${bi({ en: `${AD.wd.en}, ${AD.day} ${AD.monthYear.en}`, ne: BS.full.ne })}</span><span class="va-hero__bs">${bi({ en: bsLine, ne: AD.full.ne })}</span></p>
      ${placeLine?.en || placeLine?.ne ? `<p class="va-hero__place su-in">${bi(placeLine)}${mainEv ? ` <span class="va-dot" aria-hidden="true">·</span> ${bi({ en: AD.time, ne: String(ctx.timeLabel(mainEv).ne || '').split('–')[0].trim() })}` : ''}</p>` : ''}
    </div>`;
}

// ───────── gate: only the words; the garland and its butterflies are the first screen's, seen through it ─────────
function gate(ctx) {
  const { c, esc } = ctx;
  const ini = (n) => esc((n?.en || n?.ne || '').trim().charAt(0).toUpperCase());
  return `<div class="va-gate">
      <p class="va-gate__mono"><span>${ini(c.bride.name)}</span><i aria-hidden="true"></i><span>${ini(c.groom.name)}</span></p>
    </div>`;
}

// ───────── the lift-off ─────────
const rnd = (a, b) => a + Math.random() * (b - a);
/** heading (deg) for a butterfly whose head points up in its picture */
const heading = (dx, dy) => (Math.atan2(dy, dx) * 180) / Math.PI + 90;

function liftOff(ctx, tl, at, root) {
  const { gsap } = ctx;
  const box = root.querySelector('.va-garland');
  if (!box) return at;
  const bfs = [...box.querySelectorAll('.va-perch')];
  const vw = window.innerWidth; const vh = window.innerHeight;
  const b = box.getBoundingClientRect();
  const cx = b.left + b.width / 2;
  const flyers = bfs.filter((el) => !el.classList.contains('va-perch--stay'));
  // from the middle of the garland outwards, like a wave of startle
  flyers.sort((p, q) => Math.abs(p.getBoundingClientRect().left - cx) - Math.abs(q.getBoundingClientRect().left - cx));
  flyers.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const x0 = r.left + r.width / 2; const y0 = r.top + r.height / 2;
    const base = parseFloat(el.style.getPropertyValue('--r')) || 0;
    const side = x0 < cx ? -1 : 1;
    // an exit beyond the nearest edge (the top for the middle ones), with two loose curls on the way
    const up = Math.abs(x0 - cx) < b.width * 0.16;
    const ex = up ? x0 + side * rnd(60, 180) : (side < 0 ? -rnd(90, 160) : vw + rnd(90, 160));
    const ey = up ? -rnd(120, 200) : rnd(-0.15, 0.55) * vh;
    const p1 = { x: x0 + side * rnd(10, 40), y: y0 - rnd(40, 80) };
    const p2 = { x: x0 + (ex - x0) * 0.38 + rnd(-50, 50), y: y0 + (ey - y0) * 0.38 + rnd(-90, 40) };
    const p3 = { x: x0 + (ex - x0) * 0.72 + rnd(-40, 40), y: y0 + (ey - y0) * 0.72 + rnd(-60, 60) };
    const pts = [p1, p2, p3, { x: ex, y: ey }];
    const t0 = at + 0.12 + i * 0.075;
    const dur = rnd(2.1, 2.9);
    tl.call(() => el.classList.add('is-fly'), null, t0 - 0.12);
    let prev = { x: x0, y: y0 }; let t = t0;
    const seg = [0.2, 0.3, 0.27, 0.23];
    pts.forEach((p, k) => {
      const d = dur * seg[k];
      tl.to(el, { x: p.x - x0, y: p.y - y0, rotation: heading(p.x - prev.x, p.y - prev.y) - base, scale: 1 + 0.16 * (k + 1), duration: d, ease: k === 0 ? 'power2.out' : 'sine.inOut' }, t);
      prev = p; t += d;
    });
    tl.set(el, { autoAlpha: 0 }, t);
    // the small up-and-down of a fluttering flight, on the rig (the body keeps its path)
    tl.fromTo(el.querySelector('.va-bf__rig'), { y: 0 }, { y: -10, duration: 0.22, ease: 'sine.inOut', yoyo: true, repeat: Math.round(dur / 0.22) }, t0);
  });
  // the three that stay: a startled flutter, a small hop, then they settle again
  bfs.filter((el) => el.classList.contains('va-perch--stay')).forEach((el, i) => {
    const t0 = at + 0.25 + i * 0.18;
    tl.call(() => el.classList.add('is-fly'), null, t0);
    tl.to(el, { y: -22, x: (i - 1) * 8, duration: 0.45, ease: 'power2.out' }, t0);
    tl.to(el, { y: 0, x: 0, duration: 0.7, ease: 'power2.inOut' }, t0 + 0.5);
    tl.call(() => el.classList.remove('is-fly'), null, t0 + 1.25);
  });
  return at + 0.9;
}

function open(ctx, tl, gateEl) {
  const top = document.getElementById('top');
  tl.to(gateEl.querySelector('.va-gate'), { autoAlpha: 0, scale: 0.97, duration: 0.5, ease: 'power2.out' }, 0);
  const t = liftOff(ctx, tl, 0.15, top);
  tl.to(gateEl, { autoAlpha: 0, duration: 0.5, ease: 'power1.out' }, 0.35);
  tl.call(() => document.body.classList.add('va-flown'), null, 3.2);
  return t;
}

/** after another theme's gate: the butterflies still lift off as the first screen appears */
function heroIntro(ctx, tl, t) {
  const top = document.querySelector('.su-hero.va-hero');
  if (ctx.reduced || !top) return;
  liftOff(ctx, tl, t, top);
}

// ───────── the scratch cover: a butterfly's open wings ─────────
const COVER = new Image();
COVER.decoding = 'async';
COVER.onload = () => document.dispatchEvent(new Event('su-scratch-redraw'));
COVER.src = `${ART}bf-tiger-lg.webp`;

function wing(c, w, h, dpr, hint) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#F2E4C4'; c.fillRect(0, 0, w, h);
  if (COVER.complete && COVER.naturalWidth) {
    // the wings fill the card (cover), the body down the middle
    const s = Math.max(w / COVER.naturalWidth, h / (COVER.naturalHeight * 0.86));
    const dw = COVER.naturalWidth * s; const dh = COVER.naturalHeight * s;
    c.drawImage(COVER, (w - dw) / 2, (h - dh) / 2 - dh * 0.03, dw, dh);
  } else {
    c.fillStyle = '#E08A2A'; c.fillRect(0, 0, w, h);
  }
  // the hint on a paper ribbon, never on the painting itself
  let fs = Math.round(Math.min(h * 0.075, 17 * dpr));
  c.font = `600 ${fs}px Hind, Mukta, sans-serif`;
  let tw = c.measureText(hint).width;
  if (tw > w * 0.74) { fs = Math.floor((fs * w * 0.74) / tw); c.font = `600 ${fs}px Hind, Mukta, sans-serif`; tw = c.measureText(hint).width; }
  const bw = tw + fs * 2.2; const bh = fs * 2.4; const by = h - bh - fs * 1.1;
  c.fillStyle = 'rgba(255, 249, 236, 0.97)';
  c.beginPath();
  if (c.roundRect) c.roundRect((w - bw) / 2, by, bw, bh, bh / 2); else c.rect((w - bw) / 2, by, bw, bh);
  c.fill();
  c.strokeStyle = 'rgba(59, 107, 53, 0.55)'; c.lineWidth = dpr; c.stroke();
  c.fillStyle = '#2A2415'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(hint, w / 2, by + bh / 2 + fs * 0.06);
}

// ───────── the page ─────────
function page(ctx) {
  const { bi, esc, txt, on, AD, BS, c, config, placeLine, mainEv } = ctx;
  const P = ctx.parts;
  const hd = (id, t, kicker, cls = '') => `<header class="va-head su-rise ${cls}">${kicker && on(kicker) ? `<p class="va-kicker">${bi(kicker)}</p>` : ''}<h2 class="va-h2" id="${id}">${bi(t)}</h2></header>`;
  const spray = (k, cls = '', sizes = '160px') => `<img class="va-spray ${cls}" src="${ART}spray-${k}-sm.webp" srcset="${ART}spray-${k}-sm.webp 480w, ${ART}spray-${k}.webp 900w" sizes="${sizes}" alt="" loading="lazy" decoding="async" />`;
  const corners = '<i class="va-corner va-corner--tl"></i><i class="va-corner va-corner--tr"></i><i class="va-corner va-corner--bl"></i><i class="va-corner va-corner--br"></i>';
  const bsDeva = BS.day && BS.month ? `${BS.month} ${BS.day} गते, ${BS.year}` : BS.full.ne;
  const timeNe = mainEv ? String(ctx.timeLabel(mainEv).ne || '').split('–')[0].trim() : '';

  // the couple, tipped onto a herbarium sheet beside a pressed spray
  const couple = P.lead ? `
  <section class="su-sec va-sec va-couple" id="couple" aria-labelledby="couple-title">
    ${hd('couple-title', txt('couple.title'))}
    <figure class="va-tip su-rise">
      <div class="va-sheet va-tip__sheet">
        <div class="va-tip__photo">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 719px) 78vw, 440px')}${corners}</div>
        ${spray('blush', 'va-tip__spray', '(max-width: 719px) 30vw, 200px')}
      </div>
      ${on(txt('couple.line')) ? `<figcaption class="va-tip__cap">${bi(txt('couple.line'))}</figcaption>` : ''}
    </figure>
  </section>` : '';

  // the date under a butterfly wing, then the wingbeat countdown
  const face = `<div class="va-datecard">
      <span class="va-datecard__wd">${bi(AD.wd)}</span>
      <span class="va-datecard__day">${bi({ en: AD.day, ne: BS.day || ctx.neNum(AD.day) })}</span>
      <span class="va-datecard__my">${bi({ en: AD.monthYear.en, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</span>
      <span class="va-datecard__alt"><span class="l-en" lang="ne">${esc(bsDeva)}</span><span class="l-ne" lang="ne">${esc(AD.full.ne)}</span></span>
      ${mainEv ? `<span class="va-datecard__time">${bi({ en: AD.time, ne: timeNe })}</span>` : ''}
    </div>`;
  const cell = (u, label) => `<li class="va-cd__cell">${P.countNum(u, 'va-cd__n')}<span class="va-cd__l">${bi(label)}</span></li>`;
  const [d, h, m, s] = P.countUnits;
  const dateSec = `
  <section class="su-sec va-sec va-date" id="date" aria-labelledby="date-title">
    ${hd('date-title', txt('date.title'), txt('date.kicker'))}
    <div class="va-date__card su-rise">${P.scratch(face, 'va-scratch')}</div>
    ${placeLine?.en || placeLine?.ne ? `<p class="va-date__place su-rise">${bi(placeLine)}</p>` : ''}
    <div class="va-count su-rise" data-countdown>
      <p class="va-count__title">${bi(txt('count.title'))}</p>
      <div class="va-count__row">
        <ol class="su-count__grid va-cd va-cd--l" aria-label="${esc(txt('count.title').en)}">${cell(d.u, d.label)}${cell(h.u, h.label)}</ol>
        <span class="va-count__bf">${butterfly('lime', { cls: 'va-beat' })}</span>
        <ol class="su-count__grid va-cd va-cd--r" aria-hidden="false">${cell(m.u, m.label)}${cell(s.u, s.label)}</ol>
      </div>
      <p class="va-count__done" data-count-done hidden></p>
    </div>
  </section>`;

  // two families: a plate of two pressed sprays with their herbarium labels
  const fam = (f, k, sprayKey) => `<div class="va-fam__col va-fam__col--${k}">
      ${P.brideGroom ? `<figure class="va-fam__pic">${ctx.imgTag(f.photo, f.person.name.en, '150px')}${corners}</figure>` : spray(sprayKey, `va-fam__spray va-fam__spray--${k}`, '(max-width: 719px) 30vw, 180px')}
      <div class="va-label">
        <p class="va-label__k">${bi(f.label)}</p>
        <p class="va-label__name">${bi(f.person.fullName)}</p>
        ${f.person.parents?.en || f.person.parents?.ne ? `<p class="va-label__of">${bi(f.of)}</p><p class="va-label__parents">${bi(f.person.parents)}</p>` : ''}
        ${f.person.home?.en || f.person.home?.ne ? `<p class="va-label__home">${bi(f.person.home)}</p>` : ''}
      </div>
    </div>`;
  const famSec = `
  <section class="su-sec va-sec va-fams" id="families" aria-labelledby="fam-title">
    ${hd('fam-title', txt('families.title'))}
    <div class="va-sheet va-fam su-rise">
      ${fam(P.families[0], 'bride', 'rose')}
      <span class="va-fam__amp" aria-hidden="true">&amp;</span>
      ${fam(P.families[1], 'groom', 'marigold')}
    </div>
  </section>`;

  // the ceremonies: the sticky bloom window and the cards that scroll past it
  const keys = flowersFor(P.events);
  ctx.flowerKeys = keys;
  const plate = (k, i) => {
    const F = FLOWERS[k];
    return `<div class="va-plate${i === 0 ? ' is-on' : ''}" data-i="${i}" data-fl="${k}" style="--head:${F.head}">
        <div class="va-plate__art">${[0, 1, 2, 3].map((st) => `<img class="va-plate__s" data-s="${st}" src="${ART}${k}-${st}-sm.webp" srcset="${ART}${k}-${st}-sm.webp 600w, ${ART}${k}-${st}.webp 900w" sizes="(max-width: 899px) 30vh, 40vw" width="900" height="1200" alt="" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async" />`).join('')}</div>
        ${F.land.map(([x, y, r, w], j) => butterfly(F.sp[j], { cls: 'va-lander', style: `--x:${x * 100}%;--y:${y * 100}%;--w:${w * 100}%;--r:${r}deg;--d:${(-j * 1.1).toFixed(1)}s` })).join('')}
      </div>`;
  };
  const caps = keys.map((k, i) => `<p class="va-win__cap${i === 0 ? ' is-on' : ''}" data-i="${i}"><span class="va-win__no">${bi({ en: `Plate ${ROMAN[i] || i + 1}`, ne: `चित्र ${ctx.neNum(String(i + 1))}` })}</span><span class="va-win__fl">${bi(FLOWERS[k].name)}</span></p>`).join('');
  const evs = P.events.map((v, i) => `
      <li class="va-ev" id="ev-${esc(v.id)}" data-i="${i}">
        <article class="va-ev__card">
          <p class="va-ev__no">${bi({ en: `Plate ${ROMAN[i] || i + 1} · ${FLOWERS[keys[i]].name.en}`, ne: `चित्र ${ctx.neNum(String(i + 1))} · ${FLOWERS[keys[i]].name.ne}` })}</p>
          <h3 class="va-ev__title">${bi(v.title)}</h3>
          <p class="va-ev__when"><span class="va-ev__ad">${bi({ en: v.ad.full.en, ne: v.bs.full.ne })}</span><span class="va-ev__bs">${bi({ en: v.bs.full.en, ne: v.ad.full.ne })}</span></p>
          <p class="va-ev__time">${bi(v.time)}</p>
          ${v.blurb ? `<p class="va-ev__blurb">${bi(v.blurb)}</p>` : ''}
          <p class="va-ev__venue">${bi(v.venue)} <a class="su-link" href="${esc(v.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
          ${v.dress.colors.length || v.dress.text?.en || v.dress.text?.ne ? `<p class="va-ev__dress">${v.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${v.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(v.dress.text?.en || v.dress.text?.ne ? v.dress.text : P.UI.wear)}</span></p>` : ''}
          ${v.rituals.length ? `<details class="va-order"><summary>${bi(P.UI.order)}</summary><ol>${v.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
        </article>
      </li>`).join('');
  const progSec = `
  <section class="su-sec va-sec va-bloom" id="programme" aria-labelledby="prog-title">
    ${hd('prog-title', txt('prog.title'), txt('prog.kicker'))}
    <div class="va-bloom__grid">
      <div class="va-win" aria-hidden="true">
        <div class="va-win__in">
          <div class="va-win__frame">${keys.map(plate).join('')}</div>
          <div class="va-win__caps">${caps}</div>
        </div>
      </div>
      <ol class="va-evs">${evs}</ol>
    </div>
    <div class="va-prog__foot su-rise">
      <div class="va-btns">${P.calendarBtn()}${P.shareBtn()}</div>
      ${P.moreInfo()}
    </div>
  </section>`;

  // the photographs, each tipped onto its own herbarium plate with a spray beside it
  const SPR = ['marigold', 'rose', 'orchid', 'blush'];
  const photoSec = P.photos.length ? `
  <section class="su-sec va-sec va-herb" id="photos" aria-labelledby="gal-title">
    ${hd('gal-title', txt('gallery.title'))}
    <div class="va-herb__list">${P.photos.map((g, i) => `
      <figure class="va-herb__plate va-sheet su-rise${i % 2 ? ' is-alt' : ''}">
        <div class="va-herb__photo">${P.photoBtn(g, i, '(max-width: 719px) 64vw, 380px', 'va-herb__btn')}${corners}</div>
        <div class="va-herb__side" aria-hidden="true">${spray(SPR[i % SPR.length], 'va-herb__spray', '(max-width: 719px) 22vw, 150px')}<span class="va-herb__no">${esc(`Pl. ${ROMAN[i] || i + 1}`)}</span></div>
      </figure>`).join('')}
    </div>
  </section>` : '';

  const cardSec = `
  <section class="su-sec va-sec va-card" id="card" aria-labelledby="card-title">
    <article class="va-slip su-rise">
      ${butterfly('crimson', { cls: 'va-slip__bf' })}
      <h2 class="va-slip__line" id="card-title">${bi(txt('card.line'))}</h2>
      <p class="va-slip__hosts">${bi(config.hosts)}</p>
      ${P.cardBtn()}
    </article>
  </section>`;

  const rsvpSec = `
  <section class="su-sec va-sec va-rsvp" id="rsvp" aria-labelledby="rsvp-title">
    <div class="va-packet su-rise">
      <div class="va-packet__top" aria-hidden="true">
        <div class="va-packet__window"><img src="${ART}marigold-3-sm.webp" alt="" loading="lazy" decoding="async" /></div>
      </div>
      <div class="va-packet__body">
        ${on(txt('rsvp.kicker')) ? `<p class="va-kicker">${bi(txt('rsvp.kicker'))}</p>` : ''}
        <h2 class="va-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
        ${P.deadline?.en || P.deadline?.ne ? `<p class="va-packet__by">${bi(P.deadline)}</p>` : ''}
        ${P.rsvpForm()}
      </div>
    </div>
  </section>`;

  const closing = `
  <footer class="va-close" aria-label="Blessing">
    <div class="va-close__in su-rise">
      ${butterfly('tiger', { cls: 'va-close__bf' })}
      <p class="va-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
      <p class="va-close__en l-en">${esc(config.closing?.en || '')}</p>
      <p class="va-close__names"><span>${bi(c.bride.name)}</span><span class="va-close__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span><span>${bi(c.groom.name)}</span></p>
      ${c.hashtag ? `<p class="va-close__tag">${esc(c.hashtag)}</p>` : ''}
    </div>
    ${P.madeWith()}
  </footer>`;

  return `
  <section class="su-hero va-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${hero(ctx)}
    ${P.cue(P.lead ? 'couple' : 'date')}
  </section>
  <div class="va-book">${couple}${dateSec}${famSec}${progSec}${photoSec}${cardSec}${rsvpSec}</div>
  ${closing}`;
}

// ───────── the bloom window ─────────
function bloomWindow(ctx) {
  const { gsap, ScrollTrigger, reduced } = ctx;
  const win = document.querySelector('.va-win');
  const cards = [...document.querySelectorAll('.va-ev')];
  if (!win || !cards.length) return;
  const plates = [...win.querySelectorAll('.va-plate')];
  const caps = [...win.querySelectorAll('.va-win__cap')];
  const stages = plates.map((p) => [...p.querySelectorAll('.va-plate__s')]);
  const landed = plates.map(() => false);
  const landTl = plates.map(() => null);
  let active = 0;

  const setActive = (i) => {
    if (i === active) return;
    active = i;
    plates.forEach((p, k) => p.classList.toggle('is-on', k === i));
    caps.forEach((p, k) => p.classList.toggle('is-on', k === i));
  };
  /** bloom 0..1: bud → opening → half → full. Each stage holds, then the next grows out of it: the incoming
   *  picture fades in from slightly smaller while the outgoing one swells a little, both about the flower head, so the
   *  change reads as growth rather than a double image. */
  const bloom = (i, b) => {
    const raw = Math.max(0, Math.min(3, b * 3));
    const n = Math.min(2, Math.floor(raw)); const f = raw - n;
    const t = Math.max(0, Math.min(1, (f - 0.4) / 0.3));
    const e = t * t * (3 - 2 * t);
    const g = 0.965 + 0.035 * b;
    stages[i].forEach((im, k) => {
      let o = 0; let sc = 1;
      if (k < n) o = 1;
      else if (k === n) { o = e >= 1 ? 0 : 1; sc = 1 + 0.07 * e; }
      else if (k === n + 1) { o = e; sc = 0.9 + 0.1 * e; }
      im.style.opacity = o.toFixed(3);
      im.style.transform = `scale(${(g * sc).toFixed(4)})`;
    });
  };
  // the two butterflies come in from outside the window and settle; they leave again if you scroll back
  const lander = (i) => {
    if (landTl[i]) return landTl[i];
    const t = gsap.timeline({ paused: true });
    [...plates[i].querySelectorAll('.va-lander')].forEach((el, j) => {
      const fromX = j === 0 ? -1 : 1;
      const base = parseFloat(el.style.getPropertyValue('--r')) || 0;
      const dx = fromX * plates[i].offsetWidth * 0.75; const dy = -plates[i].offsetHeight * (j === 0 ? 0.35 : 0.5);
      t.fromTo(el, { autoAlpha: 0, x: dx, y: dy, rotation: heading(-dx, -dy) - base, scale: 1.25 },
        { keyframes: [
          { autoAlpha: 1, x: dx * 0.45, y: dy * 0.2 - 20, rotation: heading(-dx * 0.55, -dy * 0.8 - 20) - base, scale: 1.12, duration: 0.55, ease: 'sine.out' },
          { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.65, ease: 'power2.out' },
        ] }, j * 0.25);
      t.call(() => el.classList.add('is-fly'), null, j * 0.25);
      t.call(() => el.classList.remove('is-fly'), null, j * 0.25 + 1.15);
    });
    landTl[i] = t;
    return t;
  };

  if (reduced) {
    // every flower is shown open with its butterflies resting on it; the window changes plate as cards pass
    plates.forEach((_, i) => { bloom(i, 1); });
    win.classList.add('is-still');
    cards.forEach((card, i) => ScrollTrigger.create({ trigger: card, start: 'top 60%', end: 'bottom 60%', onToggle: (self) => { if (self.isActive) setActive(i); } }));
    return;
  }
  plates.forEach((_, i) => bloom(i, 0));
  cards.forEach((card, i) => {
    // the flower opens as its card rises to the middle of the screen, and stays open (with its butterflies) after
    ScrollTrigger.create({
      trigger: card,
      start: () => (isPhone() ? 'top 96%' : 'top 82%'),
      end: () => (isPhone() ? 'top 54%' : 'center 52%'),
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        bloom(i, Math.min(1, self.progress / 0.86));
        const want = self.progress > 0.92;
        if (want !== landed[i]) { landed[i] = want; const t = lander(i); if (want) t.timeScale(1).play(); else t.timeScale(1.8).reverse(); }
      },
    });
    // the window shows the plate of the card that holds the middle of the screen
    ScrollTrigger.create({
      trigger: card,
      start: () => (isPhone() ? 'top 70%' : 'top 58%'),
      end: () => (isPhone() ? 'bottom 70%' : 'bottom 58%'),
      invalidateOnRefresh: true,
      onToggle: (self) => { if (self.isActive) setActive(i); },
    });
  });
  // butterflies only flap while their part of the page is on screen
}

/** the countdown's butterfly beats its wings once with every second */
function wingbeat(ctx) {
  const el = document.querySelector('.va-beat');
  if (!el || ctx.reduced) return;
  let seen = false;
  new IntersectionObserver((en) => { seen = en[0].isIntersecting; }).observe(el);
  setInterval(() => {
    if (!seen || document.hidden) return;
    el.classList.remove('is-beat'); void el.offsetWidth; el.classList.add('is-beat');
  }, 1000);
}

/** resting butterflies breathe only while on screen (no endless animations off-screen) */
function idle() {
  const io = new IntersectionObserver((en) => en.forEach((x) => x.target.classList.toggle('is-seen', x.isIntersecting)), { rootMargin: '80px' });
  document.querySelectorAll('.va-bf').forEach((el) => io.observe(el));
}

function scroll(ctx) {
  document.body.classList.add('va-flown');
  bloomWindow(ctx);
  wingbeat(ctx);
}

mountSuite({
  slug: 'vasant',
  manifest,
  gate,
  hero,
  page,
  open,
  heroIntro,
  scroll,
  bell: false,
  scratch: { paint: wing },
  ready(ctx) {
    idle();
    if (ctx.reduced) document.body.classList.add('va-still');
    void SPECIES;
  },
  gateTap(ctx, go) {
    document.querySelector('.va-gate')?.addEventListener('click', go);
  },
});
