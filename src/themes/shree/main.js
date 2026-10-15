// Theme · Shree (श्री): deep plum and antique gold, a sacred gold Ganesh between two hanging brass diyas.
// The one signature motion: THE LOTUS OPENS. A gold lotus lies closed in the middle of the plum gate; on tap its
// three rings of petals unfold outward ring by ring (each petal hinges about its base), a soft gold light blooms in
// the centre, the lotus glides up to become the slow mandala behind Ganesh, Ganesh rises out of it and the two diyas
// come down on their chains and settle with a gentle swing. Everything after that is quiet.
import { gsap } from 'gsap';
import { mountSuite } from '../_suite/suite.js';
import manifest from './slots.js';
import { initNepali } from '../_suite/nepali.js';
import './shree.css';
import { ART, lotusSVG, diyaImg, heroHtml, gateHtml, heroClosed, liftLotus, heroEnter } from './parts.js';

const f = (n) => Math.round(n * 100) / 100;

// small ornaments: a side-view lotus, used as the divider and above cards
const BUD = `<svg class="sh-bud" viewBox="0 0 64 34" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round">
  <path d="M32 3C26 10 26 21 32 28C38 21 38 10 32 3Z"/><path d="M32 28C27 23 21 16 15 14C16 21 22 27 32 28Z"/><path d="M32 28C37 23 43 16 49 14C48 21 42 27 32 28Z"/>
  <path d="M32 28C25 27 13 24 5 20C9 27 20 30 32 29C44 30 55 27 59 20C51 24 39 27 32 28Z"/><path d="M14 32H50"/></g><circle cx="32" cy="12" r="1.3" fill="currentColor"/></svg>`;
const DIVIDER = `<span class="sh-div" aria-hidden="true"><i></i>${BUD}<i></i></span>`;
const DIAMOND = `<svg class="sh-dia" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.2"><path d="M20 2 38 20 20 38 2 20Z"/><path d="M20 10 30 20 20 30 10 20Z"/></g><circle cx="20" cy="20" r="2.4" fill="currentColor"/></svg>`;
const hero = (ctx) => heroHtml(ctx);

mountSuite({
  slug: 'shree',
  manifest,
  art: ART,
  bell: true,

  gate: (ctx) => gateHtml(ctx, 'shSpot'),

  ready: (ctx) => {
    startDial(ctx);
    initNepali();
    { const ne = document.getElementById('f-name-err'); if (ne) { ne.hidden = false; ne.setAttribute('role', 'alert'); } } // engine leaves it [hidden]
    const gate = document.getElementById('gate'); // absent when another theme's gate opens this page
    const top = document.querySelector('.su-hero'); // absent when another theme's first screen stands in for it
    if (ctx.reduced) { gate?.classList.add('sh-still'); return; }
    gate?.classList.add('sh-live');
    if (!top || !heroClosed(gsap, top)) return;
    // the hero's own lotus sits in the gate's spot until the opening carries it home (after another theme's gate it
    // stays at home behind Ganesh and opens there)
    const spot = document.getElementById('shSpot');
    if (!spot) return;
    const place = () => liftLotus(gsap, top, spot);
    place();
    window.addEventListener('resize', place);
    document.fonts?.ready.then(place);
  },

  gateTap: (ctx, openFn) => {
    document.getElementById('gscene').addEventListener('click', () => openFn());
  },

  open: (ctx, tl, gate) => {
    tl.to(gate.querySelectorAll('.sh-gate__txt'), { autoAlpha: 0, y: -8, duration: 0.5, ease: 'power2.out' }, 0);
    return heroEnter(gsap, tl, 0, document.getElementById('top'));
  },

  // after another theme's gate: the lotus opens behind Ganesh as it clears (the words follow, from the engine)
  heroIntro: (ctx, tl, t) => {
    const top = document.querySelector('.su-hero');
    if (!ctx.reduced && top) heroEnter(gsap, tl, t, top);
  },

  ambient: (ctx) => {
    if (ctx.reduced) return;
    document.body.classList.add('sh-amb');
    // the loops run only while their part of the page is on screen
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('sh-on', e.isIntersecting)));
    [document.getElementById('top'), document.querySelector('.sh-closing'), document.getElementById('pothi'), document.getElementById('programme')].forEach((el) => el && io.observe(el));
  },

  page: (ctx) => page(ctx),
  scroll: (ctx) => scroll(ctx),
  scratch: { paint: paintCoin },
});

// ───────── the page: a pothi of gold-edged plum leaves ─────────
const leaf = (id, inner, cls = '') => `
  <article class="sh-leaf ${cls}" id="${id}" aria-labelledby="${id}-t">
    <div class="sh-leaf__face"><i class="sh-leaf__hole sh-leaf__hole--l" aria-hidden="true"></i><i class="sh-leaf__hole sh-leaf__hole--r" aria-hidden="true"></i>
      <div class="sh-leaf__in">${inner}</div><i class="sh-leaf__shade" aria-hidden="true"></i></div>
    <div class="sh-leaf__back" aria-hidden="true"><i class="sh-leaf__hole sh-leaf__hole--l"></i><i class="sh-leaf__hole sh-leaf__hole--r"></i>${BUD}</div>
  </article>`;
const head = (bi, on, title, id, kicker) => `<header class="sh-head">${DIVIDER}${kicker && on(kicker) ? `<p class="sh-kicker">${bi(kicker)}</p>` : ''}<h2 class="sh-h2" id="${id}">${bi(title)}</h2></header>`;

function dial(ctx) {
  const { bi, parts } = ctx;
  const ring = (k, r, n, step, every, fmt) => {
    const ticks = Array.from({ length: n }, (_, i) => `<line y1="${-r - 9}" y2="${-r - (i % every === 0 ? 1 : 5)}" transform="rotate(${f((i * 360) / n)})"/>`).join('');
    const nums = (lang) => Array.from({ length: n / every }, (_, j) => {
      const v = fmt(j * every * step);
      return `<text y="${-r + 8}" transform="rotate(${f((j * every * 360) / n)})">${lang === 'ne' ? ctx.neNum(v) : v}</text>`;
    }).join('');
    return `<g class="sh-dial__ring" data-ring="${k}"><circle r="${r}" class="sh-dial__band"/><g class="sh-dial__ticks">${ticks}</g><g class="sh-dial__nums l-en">${nums('en')}</g><g class="sh-dial__nums l-ne">${nums('ne')}</g></g>`;
  };
  const pad = (v) => String(v).padStart(2, '0');
  const [, uh, um, us] = parts.countUnits;
  return `<div class="sh-dial" data-countdown>
    <div class="sh-dial__disc">
      <svg class="sh-dial__svg" viewBox="-200 -200 400 400" aria-hidden="true" focusable="false">
        <circle r="198" class="sh-dial__rim"/><circle r="192" class="sh-dial__rim2"/>
        ${ring('d', 172, 72, 5, 6, (v) => String(v))}
        ${ring('h', 136, 24, 1, 3, pad)}
        ${ring('m', 100, 60, 1, 10, pad)}
        ${ring('s', 64, 60, 1, 15, pad)}
        <rect class="sh-dial__window" x="-19" y="-196" width="38" height="152" rx="19"/>
        <path class="sh-dial__ptr" d="M0 -184 -9 -199H9Z"/>
      </svg>
      <div class="sh-dial__core"><span class="sh-dial__d">${parts.countNum('d')}</span><span class="sh-dial__dl">${bi(parts.UI.days)}</span><p class="sh-dial__done" data-count-done hidden></p></div>
      <ul class="sh-dial__chips su-count__grid">
        <li class="sh-chip sh-chip--h">${parts.countNum('h')}<span class="sr-only"> ${bi(uh.label)}</span></li>
        <li class="sh-chip sh-chip--m">${parts.countNum('m')}<span class="sr-only"> ${bi(um.label)}</span></li>
        <li class="sh-chip sh-chip--s">${parts.countNum('s')}<span class="sr-only"> ${bi(us.label)}</span></li>
      </ul>
    </div>
    <p class="sh-dial__legend" aria-hidden="true"><span>${bi(parts.UI.days)}</span><i></i><span>${bi(uh.label)}</span><i></i><span>${bi(um.label)}</span><i></i><span>${bi(us.label)}</span></p>
  </div>`;
}

function page(ctx) {
  const { bi, esc, txt, on, c, config, parts: P, AD, BS, placeLine, mainEv, imgTag, names } = ctx;
  const fam = P.families.map((x) => `
    <div class="sh-niche sh-niche--${x.key === 'bride' ? 'l' : 'r'}"><div class="sh-niche__arch">
      ${P.brideGroom ? `<figure class="sh-niche__pic">${imgTag(x.photo, x.person.name.en, '(max-width: 700px) 30vw, 160px')}</figure>` : `<span class="sh-niche__lamp" aria-hidden="true">${BUD}</span>`}
      <p class="sh-niche__k">${bi(x.label)}</p>
      <p class="sh-niche__name">${bi(x.person.fullName)}</p>
      ${(x.person.parents?.en || x.person.parents?.ne) ? `<p class="sh-niche__of">${bi(x.of)}</p><p class="sh-niche__par">${bi(x.person.parents)}</p>` : ''}
      ${(x.person.home?.en || x.person.home?.ne) ? `<p class="sh-niche__home">${bi(x.person.home)}</p>` : ''}
    </div></div>`);
  const tNe = mainEv ? String(ctx.timeLabel(mainEv).ne || '').split(/\s[–-]\s/)[0] : '';
  const coinFace = `<div class="sh-coin__face">
      <p class="sh-coin__m">${bi({ en: AD.month.en, ne: BS.month || AD.month.ne })}</p>
      <p class="sh-coin__day">${bi({ en: AD.day, ne: BS.day || ctx.neNum(AD.day) })}</p>
      <p class="sh-coin__y">${bi({ en: AD.year, ne: BS.year || ctx.neNum(AD.year) })}</p>
      <p class="sh-coin__wd">${bi({ en: mainEv ? `${AD.wd.en} · ${AD.time}` : AD.wd.en, ne: tNe ? `${AD.wd.ne} · ${tNe}` : AD.wd.ne })}</p>
    </div>`;
  const leaves = [
    P.lead ? leaf('couple', `
      ${head(bi, on, txt('couple.title'), 'couple-t')}
      <figure class="sh-arch"><div class="sh-arch__pic">${imgTag(P.lead.photo, P.lead.alt, '(max-width: 700px) 70vw, 340px')}</div></figure>
      ${on(txt('couple.line')) ? `<p class="sh-lede">${bi(txt('couple.line'))}</p>` : ''}`, 'sh-leaf--couple') : '',
    leaf('date', `
      ${head(bi, on, txt('date.title'), 'date-t', txt('date.kicker'))}
      ${P.scratch(coinFace, 'sh-coin')}
      <div class="sh-date__meta">
        <p class="sh-date__alt">${bi({ en: BS.full.en, ne: AD.full.ne })}</p>
        ${placeLine?.en || placeLine?.ne ? `<p class="sh-date__place">${bi(placeLine)}</p>` : ''}
      </div>`, 'sh-leaf--date'),
    leaf('countdown', `
      ${head(bi, on, txt('count.title'), 'countdown-t')}
      ${dial(ctx)}`, 'sh-leaf--count'),
    leaf('families', `
      ${head(bi, on, txt('families.title'), 'families-t')}
      <div class="sh-niches">${fam[0]}<div class="sh-niches__mid" aria-hidden="true">${DIAMOND}</div>${fam[1]}</div>`, 'sh-leaf--fam'),
  ].filter(Boolean).join('');

  const dress = (x) => {
    if (!(x.dress.text?.en || x.dress.text?.ne || x.dress.colors.length)) return '';
    const sw = x.dress.colors.length ? `<span class="sh-sw" aria-hidden="true">${x.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : '';
    return `<p class="sh-mu__dress">${sw}<span>${bi(x.dress.text?.en || x.dress.text?.ne ? x.dress.text : P.UI.wear)}</span></p>`;
  };
  const order = (x) => (x.rituals.length ? `<details class="sh-mu__order"><summary>${bi(P.UI.order)}</summary><ol>${x.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : '');
  const rows = P.events.map((x) => `
    <li class="sh-mu" id="ev-${esc(x.id)}">
      <div class="sh-mu__date" aria-hidden="true"><span class="sh-mu__day">${bi({ en: x.ad.day, ne: x.bs.day || ctx.neNum(x.ad.day) })}</span><span class="sh-mu__mon">${bi({ en: x.ad.month.en.slice(0, 3), ne: x.bs.month || x.ad.month.ne })}</span></div>
      <div class="sh-mu__main">
        <h3 class="sh-mu__t">${bi(x.title)}</h3>
        <p class="sh-mu__when">${bi({ en: x.ad.full.en, ne: x.bs.full.ne })}</p>
        <p class="sh-mu__time">${bi(x.time)}</p>
        ${x.blurb ? `<p class="sh-mu__blurb">${bi(x.blurb)}</p>` : ''}
        <p class="sh-mu__venue">${bi(x.venue)} <a class="sh-link" href="${esc(x.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
        ${dress(x)}
        ${order(x)}
      </div>
    </li>`).join('');

  const photos = P.photos.length ? `
  <section class="sh-sec sh-wins" id="photos" aria-labelledby="photos-t">
    ${head(bi, on, txt('gallery.title'), 'photos-t')}
    <div class="sh-wins__grid">${P.photos.map((g, i) => `<figure class="sh-win"><div class="sh-win__frame">${P.photoBtn(g, i, '(max-width: 700px) 46vw, 340px', 'sh-win__btn')}</div></figure>`).join('')}</div>
  </section>` : '';

  return `
  <section class="su-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${hero(ctx)}
    ${P.cue('pothi')}
  </section>

  <div class="sh-bgm" aria-hidden="true"><div class="sh-fx__mandala">${lotusSVG('bg')}</div></div>
  <div class="sh-fx" aria-hidden="true">
    ${diyaImg('sh-fx__diya sh-fx__diya--l', '(min-width: 900px) 150px, 18vw', false)}
    ${diyaImg('sh-fx__diya sh-fx__diya--r', '(min-width: 900px) 150px, 18vw', false)}
  </div>

  <section class="sh-book" id="pothi" aria-label="${esc(txt('date.title').en)}">
    <div class="sh-book__stage">${leaves}</div>
  </section>

  <section class="sh-sec sh-patra" id="programme" aria-labelledby="programme-t">
    ${head(bi, on, txt('prog.title'), 'programme-t', txt('prog.kicker'))}
    <div class="sh-scroll">
      <div class="sh-scroll__rod sh-scroll__rod--top" aria-hidden="true"><i></i></div>
      <div class="sh-scroll__paper">
        <p class="sh-scroll__head" lang="ne">॥ शुभ मुहूर्त ॥</p>
        <ol class="sh-mus">${rows}</ol>
        <div class="sh-scroll__acts">${P.calendarBtn('sh-btn')}${P.shareBtn('sh-btn sh-btn--line')}</div>
        ${P.moreInfo()}
      </div>
      <div class="sh-scroll__rod sh-scroll__rod--bot" aria-hidden="true"><i></i></div>
    </div>
  </section>

  ${photos}

  <section class="sh-sec sh-cardsec" id="card" aria-labelledby="card-t">
    <div class="sh-plate">
      ${BUD}
      <h2 class="sh-plate__line" id="card-t">${bi(txt('card.line'))}</h2>
      <p class="sh-plate__hosts">${bi(config.hosts)}</p>
      <button class="sh-seal" type="button" data-open-card><span class="sh-seal__disc" aria-hidden="true"><span lang="ne">श्री</span></span><span class="sh-seal__lbl">${bi(txt('card.button'))}</span></button>
    </div>
  </section>

  <section class="sh-sec sh-rsvp" id="rsvp" aria-labelledby="rsvp-t">
    <div class="sh-cream">
      <header class="sh-head">${DIVIDER}<h2 class="sh-h2" id="rsvp-t">${bi(txt('rsvp.title'))}</h2>${P.deadline && (P.deadline.en || P.deadline.ne) ? `<p class="sh-cream__by">${bi(P.deadline)}</p>` : ''}</header>
      ${P.rsvpForm()}
    </div>
  </section>

  <footer class="sh-closing" aria-label="Blessing">
    <div class="sh-close" aria-hidden="true">
      ${diyaImg('sh-diya--cl', '120px', false)}
      ${diyaImg('sh-diya--cr', '120px', false)}
      <div class="sh-close__lotus">${lotusSVG('cl')}</div>
      <i class="sh-band sh-close__band"></i>
    </div>
    <div class="sh-close__text">
      <p class="sh-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
      <p class="sh-close__en l-en">${esc(config.closing?.en || '')}</p>
      <p class="sh-close__names">${names()}</p>
      ${c.hashtag ? `<p class="sh-close__tag">${esc(c.hashtag)}</p>` : ''}
    </div>
    ${P.madeWith()}
  </footer>`;
}

// ───────── the countdown dial: each ring turns to its value ─────────
function startDial(ctx) {
  const el = document.querySelector('.sh-dial');
  if (!el) return;
  const target = new Date(ctx.mainEv?.start || ctx.config.weddingDate).getTime();
  const rings = Object.fromEntries([...el.querySelectorAll('.sh-dial__ring')].map((g) => [g.dataset.ring, g]));
  const per = { d: 5 / 6, h: 15, m: 6, s: 6 }; // degrees per unit (the day ring holds 432 days)
  const ang = { d: null, h: null, m: null, s: null };
  const tick = (first) => {
    const s0 = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const v = { d: Math.floor(s0 / 86400), h: Math.floor((s0 % 86400) / 3600), m: Math.floor((s0 % 3600) / 60), s: s0 % 60 };
    for (const k of Object.keys(rings)) {
      let a = -v[k] * per[k];
      if (ang[k] !== null) { const d = ((((a - ang[k]) % 360) + 540) % 360) - 180; a = ang[k] + d; } // the short way round
      if (a === ang[k]) continue;
      ang[k] = a;
      if (first || ctx.reduced) gsap.set(rings[k], { rotation: a, svgOrigin: '0 0' });
      else gsap.to(rings[k], { rotation: a, svgOrigin: '0 0', duration: k === 's' ? 0.45 : 0.9, ease: 'back.out(1.6)', overwrite: true });
    }
  };
  tick(true);
  setInterval(() => { if (!document.hidden) tick(false); }, 1000);
}

// ───────── the coin's gold leaf ─────────
function paintCoin(g, w, h, dpr, hint) {
  const cx = w / 2; const cy = h / 2; const r = Math.min(w, h) / 2 - dpr;
  g.clearRect(0, 0, w, h);
  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  const rg = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.05, cx, cy, r);
  rg.addColorStop(0, '#FBEAB4'); rg.addColorStop(0.35, '#E3BE6E'); rg.addColorStop(0.75, '#C0913F'); rg.addColorStop(1, '#8E6222');
  g.fillStyle = rg; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(92, 58, 8, 0.5)'; g.lineWidth = 1.2 * dpr;
  for (const k of [0.94, 0.86, 0.5, 0.42]) { g.beginPath(); g.arc(cx, cy, r * k, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = 'rgba(92, 58, 8, 0.55)';
  for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9, (i % 2 ? 1 : 1.8) * dpr, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = 'rgba(92, 58, 8, 0.42)'; g.lineWidth = 1 * dpr;
  for (let i = 0; i < 16; i++) { // engraved petals between the rings
    const a = (i / 16) * Math.PI * 2; const ca = Math.cos(a); const sa = Math.sin(a);
    const p = (rr, t) => [cx + ca * rr - sa * t, cy + sa * rr + ca * t];
    const [x0, y0] = p(r * 0.52, 0); const [x1, y1] = p(r * 0.84, 0);
    const [c1x, c1y] = p(r * 0.64, r * 0.13); const [c2x, c2y] = p(r * 0.64, -r * 0.13);
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(c1x, c1y, x1, y1); g.quadraticCurveTo(c2x, c2y, x0, y0); g.stroke();
  }
  const sh = g.createLinearGradient(0, 0, w, h);
  sh.addColorStop(0, 'rgba(255,255,255,0.28)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)'); sh.addColorStop(0.7, 'rgba(255,250,220,0.16)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 700; i++) { g.fillStyle = Math.random() > 0.5 ? 'rgba(255,248,220,.28)' : 'rgba(80,50,10,.12)'; g.fillRect(Math.random() * w, Math.random() * h, dpr, dpr); }
  // the hint, in two lines in the heart of the coin
  const deva = /[ऀ-ॿ]/.test(hint);
  const size = Math.round(r * (deva ? 0.115 : 0.1));
  g.font = deva ? `600 ${size}px Mukta, sans-serif` : `400 ${size}px Forum, Georgia, serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const words = String(hint).split(/\s+/);
  let lines = [String(hint)];
  if (words.length > 1) {
    let k = 1; let diff = Infinity;
    for (let j = 1; j < words.length; j++) { const d = Math.abs(g.measureText(words.slice(0, j).join(' ')).width - g.measureText(words.slice(j).join(' ')).width); if (d < diff) { diff = d; k = j; } }
    lines = [words.slice(0, k).join(' '), words.slice(k).join(' ')];
  }
  const lh = size * (deva ? 1.35 : 1.25);
  lines.forEach((line, i) => {
    const y = cy + (i - (lines.length - 1) / 2) * lh;
    g.fillStyle = 'rgba(255,246,214,.6)'; g.fillText(line, cx + dpr, y + dpr);
    g.fillStyle = '#4A2A06'; g.fillText(line, cx, y);
  });
  g.restore();
}

// ───────── fit every leaf to its screen (scale its contents down, never crop) ─────────
function fitLeaves() {
  document.querySelectorAll('.sh-book.is-3d .sh-leaf').forEach((lf) => {
    const box = lf.querySelector('.sh-leaf__face');
    const inner = lf.querySelector('.sh-leaf__in');
    inner.style.transform = '';
    const cs = getComputedStyle(box);
    const avail = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const need = inner.offsetHeight;
    const k = need > avail ? Math.max(0.55, avail / need) : 1;
    inner.style.transform = k < 1 ? `scale(${k.toFixed(3)})` : '';
  });
}

// ───────── the scroll: leaves turn, the mandala turns, the patra unrolls ─────────
function scroll(ctx) {
  const ST = ctx.ScrollTrigger;
  if (ctx.reduced) return;
  const book = document.getElementById('pothi');
  const fx = document.querySelector('.sh-fx');
  const leaves = [...book.querySelectorAll('.sh-leaf')];

  // the pothi: each leaf, hinged at its top, lifts and turns over to show its back and the leaf beneath
  book.classList.add('is-3d');
  fitLeaves();
  document.fonts?.ready.then(() => { fitLeaves(); ST.refresh(); });
  window.addEventListener('resize', fitLeaves);
  leaves.forEach((lf, i) => { lf.style.zIndex = String(leaves.length - i); });
  const shades = leaves.map((lf) => lf.querySelector('.sh-leaf__shade'));
  gsap.set(shades.slice(1), { opacity: 0.6 });
  // GPU memory: only the leaf on top and the one beneath it are drawn (each 3D leaf is several screen-sized layers,
  // and at 3x density a full stack of them runs a phone's GPU out of memory); a leaf's back shows only while it turns
  gsap.set(leaves.slice(2), { visibility: 'hidden' });
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  const HOLD = 0.6;
  leaves.slice(0, -1).forEach((lf, i) => {
    const at = i * (1 + HOLD) + HOLD;
    if (leaves[i + 2]) tl.set(leaves[i + 2], { visibility: 'visible' }, at);
    tl.set(lf.querySelector('.sh-leaf__back'), { visibility: 'visible' }, at)
      .fromTo(lf, { rotationX: 0 }, { rotationX: 178, duration: 1, ease: 'power1.inOut' }, at)
      .fromTo(shades[i], { opacity: 0 }, { opacity: 0.55, duration: 0.5, ease: 'power1.in' }, at)
      .to(shades[i + 1], { opacity: 0, duration: 0.75, ease: 'power1.out' }, at + 0.1)
      .to(lf, { autoAlpha: 0, duration: 0.16 }, at + 0.84)
      .set(lf.querySelector('.sh-leaf__back'), { visibility: 'hidden' }, at + 1);
  });
  tl.to({}, { duration: HOLD });
  const pinST = ST.create({
    trigger: book, start: 'top top', end: () => `+=${(leaves.length - 1) * window.innerHeight * 1.1}`,
    pin: true, scrub: 0.7, animation: tl, invalidateOnRefresh: true,
  });
  // never rest on a half-turned leaf: when the scroll comes to rest inside a turn, glide to the nearer flat leaf
  // (Lenis for wheel, the native scroll for touch, which keeps its own momentum until the finger lifts)
  let touching = false; let lastY = window.scrollY; let dir = 1; let snapping = false;
  window.addEventListener('touchstart', () => { touching = true; }, { passive: true });
  window.addEventListener('touchend', () => { touching = false; }, { passive: true });
  window.addEventListener('scroll', () => { const y = window.scrollY; if (y !== lastY) dir = y > lastY ? 1 : -1; lastY = y; }, { passive: true });
  ST.addEventListener('scrollEnd', () => {
    if (touching || snapping || !pinST.isActive) return;
    const span = pinST.end - pinST.start;
    const t = ((window.scrollY - pinST.start) / span) * tl.duration();
    for (let i = 0; i < leaves.length - 1; i++) {
      const a = i * (1 + HOLD) + HOLD;
      if (t > a + 0.01 && t < a + 0.99) {
        const p = t - a;
        const to = (dir > 0 ? p > 0.3 : p > 0.7) ? a + 1 + 0.02 : a - 0.02;
        const y = pinST.start + (span * to) / tl.duration();
        snapping = true;
        const done = () => { snapping = false; };
        const lenis = ctx.lenis?.();
        if (lenis) lenis.scrollTo(y, { duration: 0.55, easing: (x) => 1 - (1 - x) ** 3, onComplete: done });
        else { window.scrollTo({ top: y, behavior: 'smooth' }); setTimeout(done, 700); }
        setTimeout(done, 1200);
        return;
      }
    }
  });
  // phones: the foreground diyas step aside while a leaf fills the screen, so its corners stay clear
  if (matchMedia('(max-width: 899px)').matches) {
    ST.create({
      trigger: book, start: 'top 55%', end: () => pinST.end + window.innerHeight * 0.3,
      onToggle: (self) => gsap.to('.sh-fx .sh-diya__swing', { opacity: self.isActive ? 0 : 1, duration: 0.35, ease: 'power2.out', overwrite: 'auto' }),
    });
  }
  window.__shree = { leafY: (i) => { const s = ST.getAll().find((t) => t.pin === book); return s ? s.start + (s.end - s.start) * ((i * (1 + HOLD) + (i ? 0.05 : 0)) / tl.duration()) : 0; }, turnY: (i, p) => { const s = ST.getAll().find((t) => t.pin === book); return s.start + (s.end - s.start) * ((i * (1 + HOLD) + HOLD + p) / tl.duration()); } };

  // the big mandala turns with the whole page; the diyas come down once the hero has gone
  gsap.to('.sh-fx__mandala', { rotation: 200, ease: 'none', scrollTrigger: { trigger: document.body, start: 0, end: 'max', scrub: 0.6 } });
  gsap.fromTo(fx, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none', immediateRender: true, scrollTrigger: { trigger: '#top', start: 'bottom 85%', end: 'bottom 30%', scrub: true } });
  gsap.fromTo('.sh-fx__diya', { yPercent: -100 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '#top', start: 'bottom 85%', end: 'bottom 20%', scrub: true } });
  gsap.fromTo('.sh-fx__diya .sh-diya__swing', { y: 0 }, { y: () => window.innerHeight * 0.05, ease: 'none', scrollTrigger: { trigger: '#programme', start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
  gsap.to('.sh-fx__diya', { autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.sh-closing', start: 'top 95%', end: 'top 50%', scrub: true } });

  // the muhurta patra unrolls from its top rod
  const paper = document.querySelector('.sh-scroll__paper');
  const rod = document.querySelector('.sh-scroll__rod--bot');
  const inner = '.sh-scroll__head, .sh-mu, .sh-scroll__acts, .sh-scroll .su-more';
  gsap.set(paper, { scaleY: 0.02, transformOrigin: '50% 0%' });
  gsap.set(rod, { y: () => -paper.offsetHeight });
  gsap.set(inner, { opacity: 0 });
  ST.create({
    trigger: '.sh-scroll', start: 'top 75%', once: true,
    onEnter: () => {
      const d = Math.min(2, 0.9 + paper.offsetHeight / 1500);
      gsap.timeline({ onComplete: () => gsap.set([paper, rod], { clearProps: 'transform' }) })
        .fromTo(paper, { scaleY: 0.02 }, { scaleY: 1, duration: d, ease: 'power2.inOut' }, 0)
        .fromTo(rod, { y: -paper.offsetHeight }, { y: 0, duration: d, ease: 'power2.inOut' }, 0)
        .to(inner, { opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' }, d * 0.5);
    },
  });

  // temple windows: a slight 3D lean that follows the scroll (and the pointer on desktop)
  const wins = [...document.querySelectorAll('.sh-win__frame')];
  wins.forEach((w) => gsap.fromTo(w, { rotationX: 10 }, { rotationX: -10, ease: 'none', scrollTrigger: { trigger: w, start: 'top bottom', end: 'bottom top', scrub: 0.6 } }));
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const grid = document.querySelector('.sh-wins__grid');
    const qs = wins.map((w) => gsap.quickTo(w, 'rotationY', { duration: 0.7, ease: 'power3.out' }));
    grid?.addEventListener('pointermove', (e) => { const r = grid.getBoundingClientRect(); const nx = (e.clientX - r.left) / r.width - 0.5; qs.forEach((q) => q(nx * 14)); });
    grid?.addEventListener('pointerleave', () => qs.forEach((q) => q(0)));
  }

  // the seal turns into place; the champagne leaf rises
  gsap.from('.sh-seal__disc', { rotation: -50, scale: 0.6, opacity: 0, duration: 1.1, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.sh-plate', start: 'top 75%', once: true } });
  gsap.from('.sh-cream', { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.sh-cream', start: 'top 92%', once: true } });
}
