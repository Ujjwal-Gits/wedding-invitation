// Toran (तोरण): the garland hung over a door to welcome guests. The guest walks deeper and deeper through seven
// dressed doorways of a haveli, each with its own real toran, to the mandap at the heart of the house.
//
// Opening: a doorway hung with full-length marigold ladis, each ending in a red rose. Tap, and the strings part from
// the centre outward, swinging as they go, onto the first door with the names on the lime-washed wall above it.
// Signature (the one big motion): the depth tunnel. The seven doorways stand one behind the other along one axis;
// scrolling dollies the camera through them. The door in front grows past you and fades, the next comes into
// focus, and each part of the wedding waits on a plaster plaque beside its door (never on the flowers).
// Everything else is quiet. Reduced motion: no dolly; each door crossfades in as its plaques arrive.
import './toran.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import { toran as kitToran, lamp, initNepali } from '../_suite/nepali.js';
import { A, DOORS, DOOR_AR, MANDAP, LADI, FLOORS } from './doors.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const NE_NUM = ['१', '२', '३', '४', '५', '६', '७'];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

// ═════════ the opening: the phool-ladi curtain ═════════
function gate(ctx) {
  return `<div class="to-gate">
    <div class="to-gate__back"></div>
    <div class="to-ladis" id="to-ladis"></div>
    <div class="to-gate__rail">${kitToran('to-gate__toran', '(min-width: 900px) 1400px, 160vw')}</div>
    <div class="to-gate__step"><i class="to-gate__rangoli"></i></div>
  </div>`;
}

/** hang the strings: as many as the width needs, each a little different (variant, flip, length, depth) */
function hangLadis(tie = false) {
  const box = document.getElementById('to-ladis');
  if (!box) return;
  const W = window.innerWidth; const H = window.innerHeight;
  const len = H * 0.74;
  const sw = len * (108 / 1617);
  const step = sw * 0.8;
  const n = Math.ceil(W / step) + 2;
  const x0 = (W - (n - 1) * step) / 2;
  let html = '';
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < n; i++) {
    const v = i % 5; const [lw, lh] = LADI[(v * 3 + i) % 5];
    const h = len * (0.93 + rnd() * 0.1);
    const w = h * (lw / lh);
    const x = x0 + i * step - w / 2 + (rnd() - 0.5) * sw * 0.12;
    const flip = rnd() > 0.5 ? ' is-flip' : '';
    const tied = tie && Math.abs(x + w / 2 - W / 2) < W * 0.3 ? ' is-tied' : '';
    html += `<span class="to-ladi${i % 2 ? ' is-back' : ''}${tied}" data-x="${(x + w / 2).toFixed(1)}" style="left:${x.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;top:${(-H * 0.02 - rnd() * H * 0.015).toFixed(1)}px">
      <img class="${flip}" src="${A}ladi-${((v * 3 + i) % 5) + 1}.webp" alt="" decoding="async" /></span>`;
  }
  box.innerHTML = html;
}

// ═════════ the tunnel ═════════
function doorLayer(d, i, eager) {
  const src = `${A}${d.file}.webp`; const sm = `${A}${d.file}-sm.webp`;
  const fl = FLOORS[d.floorArt];
  // the wall (painted plaster, tinted, darker away from the door) with the door's box cut out; the painted floor
  // from the door's ground line; a warm pool of light spilling from the opening onto that floor
  return `<div class="to-door" data-i="${i}" style="--wall:${d.wall};--fy:${(d.ground * 100).toFixed(2)}%;--floor:${fl.color};--fl:url('${A}${fl.file}.webp');--ox:${(((d.open[0] + d.open[2]) / 2) * 100).toFixed(2)}%;--ob:${(d.open[3] * 100).toFixed(2)}%;--ow:${((d.open[2] - d.open[0]) * 100).toFixed(2)}%">
      <i class="to-wallbg"></i>
      <i class="to-floor"></i>
      <img class="to-door__art" ${eager ? '' : 'data-'}src="${src}" ${eager ? '' : 'data-'}srcset="${sm} 640w, ${src} 1088w" sizes="(min-width: 900px) 560px, 100vw" alt="" decoding="async"${i === 0 ? ' fetchpriority="high"' : ''} />
      <i class="to-light"></i>
      <i class="to-shade"></i>
    </div>`;
}
function mandapLayer() {
  return `<div class="to-door to-door--mandap" data-i="6" style="--floor:${MANDAP.floor}">
      <i class="to-floor to-floor--mandap"></i>
      <picture>
        <source media="(orientation: landscape)" data-srcset="${A}${MANDAP.l.file}-sm.webp 1008w, ${A}${MANDAP.l.file}.webp 1680w" sizes="110vw" />
        <img class="to-door__art" data-src="${A}${MANDAP.p.file}.webp" data-srcset="${A}${MANDAP.p.file}-sm.webp 566w, ${A}${MANDAP.p.file}.webp 944w" sizes="(orientation: portrait) 125vw, 100vw" alt="" decoding="async" />
      </picture>
      <i class="to-shade"></i>
    </div>`;
}

// ═════════ the page ═════════
function page(ctx) {
  const { bi, esc, txt, on, parts: P, c, config } = ctx;
  const num = (k) => `<p class="to-num" aria-hidden="true"><i></i>${bi({ en: ROMAN[k], ne: NE_NUM[k] })}<i></i></p>`;
  const head = (k, title, id, kicker) => `<header class="to-head">${num(k)}${kicker && on(kicker) ? `<p class="to-kicker">${bi(kicker)}</p>` : ''}<h2 class="to-h2" id="${id}">${bi(title)}</h2></header>`;
  const plaque = (cls, inner, attrs = '') => `<article class="to-plaque su-rise ${cls}"${attrs}><div class="to-plaque__in">${inner}</div></article>`;
  const gap = '<div class="to-gap" aria-hidden="true"></div>';

  const fam = P.families.map((f) => `<div class="to-fam__side">
      ${P.brideGroom ? `<figure class="to-fam__pic">${ctx.imgTag(f.photo, f.person.name.en, '(max-width: 700px) 38vw, 180px')}</figure>` : ''}
      <p class="to-kicker">${bi(f.label)}</p>
      <p class="to-fam__name">${bi(f.person.fullName)}</p>
      ${(f.person.parents?.en || f.person.parents?.ne) ? `<p class="to-fam__of">${bi(f.of)}</p><p class="to-fam__par">${bi(f.person.parents)}</p>` : ''}
      ${(f.person.home?.en || f.person.home?.ne) ? `<p class="to-fam__home">${bi(f.person.home)}</p>` : ''}
    </div>`).join('<p class="to-fam__and" aria-hidden="true">&amp;</p>');

  const ev = P.events.map((e) => {
    const hasDress = !!(e.dress.text?.en || e.dress.text?.ne || e.dress.colors.length);
    return plaque('to-ev', `
      <div class="to-ev__date" aria-hidden="true"><span class="to-ev__day">${bi({ en: e.ad.day, ne: e.bs.day || ctx.neNum(e.ad.day) })}</span><span class="to-ev__my">${bi({ en: e.ad.month.en.slice(0, 3), ne: e.bs.month || e.ad.month.ne })}</span></div>
      <div class="to-ev__main">
        <h3 class="to-ev__title">${bi(e.title)}</h3>
        <p class="to-ev__when">${bi({ en: e.ad.full.en, ne: e.bs.full.ne })}</p>
        <p class="to-ev__time">${bi(e.time)}</p>
        ${e.blurb ? `<p class="to-ev__blurb">${bi(e.blurb)}</p>` : ''}
        <p class="to-ev__venue">${bi(e.venue)} <a class="su-link" href="${esc(e.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
        ${hasDress ? `<p class="to-ev__dress">${e.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${e.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(e.dress.text?.en || e.dress.text?.ne ? e.dress.text : P.UI.wear)}</span></p>` : ''}
        ${e.rituals.length ? `<details class="su-order"><summary>${bi(P.UI.order)}</summary><ol>${e.rituals.map((r) => `<li><span class="su-order__t">${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
      </div>`, ` id="ev-${esc(e.id)}"`);
  }).join('');

  const ganesh = ctx.ganesh('to-ganesh su-in', '64px');
  const invocation = on(txt('hero.invocation')) ? `<p class="to-invoc su-in">${bi(txt('hero.invocation'))}</p>` : '';
  const heroLine = on(txt('hero.line')) ? `<p class="to-hero__line su-in">${bi(txt('hero.line'))}</p>` : '';
  const countCell = (u) => `<li class="to-count__cell">${P.countNum(u.u, 'to-count__n')}<span class="to-count__l">${bi(u.label)}</span></li>`;

  return `
  <div class="to-tunnel" id="tunnel">
    <div class="to-stage" id="to-stage" aria-hidden="true">
      <div class="to-world" id="to-world">${mandapLayer()}${DOORS.map((d, i) => doorLayer(d, i, i < 2)).reverse().join('')}</div>
      <i class="to-floorfade"></i>
      <i class="to-vignette"></i>
    </div>

    <div class="to-flow">
      <section class="su-hero to-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
        <div class="to-hero__wall">
          ${ganesh}
          ${invocation}
          <p class="to-hero__title su-in">${bi(txt('hero.title'))}</p>
          <h1 class="to-names su-in" id="to-names">${ctx.names('&amp;')}</h1>
          <p class="to-hero__date su-in">${bi({ en: `${ctx.AD.wd.en}, ${ctx.AD.day} ${ctx.AD.month.en} ${ctx.AD.year}`, ne: ctx.BS.full.ne || ctx.AD.full.ne })}</p>
          ${ctx.placeLine?.en || ctx.placeLine?.ne ? `<p class="to-hero__place su-in">${bi(ctx.placeLine)}</p>` : ''}
          ${heroLine}
        </div>
        ${P.cue(P.lead ? 'couple' : 'families')}
      </section>

      <section class="to-room" data-door="1" aria-label="${esc(txt('families.title').en)}">
        ${gap}
        ${P.lead ? plaque('to-couple', `${head(1, txt('couple.title'), 'couple-title')}
          <figure class="to-photo">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 700px) 80vw, 400px')}</figure>
          ${on(txt('couple.line')) ? `<p class="to-lede">${bi(txt('couple.line'))}</p>` : ''}`, ' id="couple"') : ''}
        ${plaque('to-fam', `${P.lead ? '' : num(1)}<h2 class="to-h2" id="fam-title">${bi(txt('families.title'))}</h2><div class="to-fam__grid">${fam}</div>`, ' id="families" aria-labelledby="fam-title"')}
      </section>

      <section class="to-room" data-door="2" id="programme" aria-labelledby="prog-title">
        ${gap}
        ${plaque('to-plaque--head', head(2, txt('prog.title'), 'prog-title', txt('prog.kicker')))}
        <div class="to-evs">${ev}</div>
        ${plaque('to-plaque--foot', `<div class="to-btns">${P.calendarBtn()}${P.shareBtn()}</div>${P.moreInfo()}`)}
      </section>

      <section class="to-room" data-door="3" id="date" aria-labelledby="date-title">
        ${gap}
        ${plaque('to-date', `${head(3, txt('date.title'), 'date-title', txt('date.kicker'))}
          ${P.scratch(`<div class="to-date__face">${ctx.dateStrip()}${ctx.placeLine?.en || ctx.placeLine?.ne ? `<p class="to-date__place">${bi(ctx.placeLine)}</p>` : ''}</div>`, 'to-scratch')}`)}
      </section>

      ${P.photos.length ? `
      <section class="to-room" data-door="4" id="photos" aria-labelledby="gal-title">
        ${gap}
        ${plaque('to-gal', `${head(4, txt('gallery.title'), 'gal-title')}
          <div class="to-gal__grid" id="galgrid">${P.photos.map((g, i) => `<figure class="to-gal__ph">${P.photoBtn(g, i, '(max-width: 700px) 42vw, 220px')}</figure>`).join('')}</div>`)}
      </section>` : ''}

      <section class="to-room" data-door="5" id="countdown" aria-labelledby="count-title">
        ${gap}
        ${plaque('to-count', `<div class="to-count__lamps" aria-hidden="true">${lamp('diyo', { cls: 'to-lamp', sizes: '90px' })}${lamp('diyo', { cls: 'to-lamp to-lamp--r', sizes: '90px' })}</div>
          ${head(5, txt('count.title'), 'count-title')}
          <div class="to-count__box" data-countdown>
            <ol class="to-count__grid su-count__grid" aria-label="${esc(txt('count.title').en)}">${P.countUnits.map(countCell).join('')}</ol>
            <p class="su-count__done to-count__done" data-count-done hidden></p>
          </div>`)}
      </section>

      <section class="to-room to-room--last" data-door="6" id="rsvp" aria-labelledby="rsvp-title">
        ${gap}
        ${plaque('to-card su-card', `${num(6)}<p class="to-card__line">${bi(txt('card.line'))}</p><p class="to-card__hosts">${bi(config.hosts)}</p>${P.cardBtn()}`)}
        ${plaque('to-rsvp', `<header class="to-head"><h2 class="to-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>${(P.deadline?.en || P.deadline?.ne) ? `<p class="to-lede">${bi(P.deadline)}</p>` : ''}</header>${P.rsvpForm()}`)}
        <footer class="to-plaque to-close su-close su-rise" aria-label="Blessing"><div class="to-plaque__in">
          <p class="to-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
          <p class="to-close__en l-en">${esc(config.closing?.en || '')}</p>
          <p class="to-close__names">${ctx.names('&amp;')}</p>
          ${c.hashtag ? `<p class="to-close__tag">${esc(c.hashtag)}</p>` : ''}
        </div></footer>
        <div class="to-made">${P.madeWith()}</div>
      </section>
    </div>
  </div>`;
}

// ═════════ the camera ═════════
// The doors stand along one axis at depths Z[i]; the camera position c runs 0..6 (door index in focus).
// A door at distance d from the camera (d = 1 is "in focus") is drawn at scale 1/d around the axis point, so each
// door sits inside the opening of the one in front. Transforms and opacity only.
const GAPS = [1.4, 1.4, 1.4, 1.4, 1.4, 0.85];
const Z = GAPS.reduce((acc, g) => [...acc, acc[acc.length - 1] + g], [0]);
const zAt = (c) => { const k = Math.min(Math.floor(c), 5); return lerp(Z[k], Z[k + 1], c - k); };

function tunnel(ctx) {
  const stage = document.getElementById('to-stage');
  const layers = [...stage.querySelectorAll('.to-door')].sort((a, b) => a.dataset.i - b.dataset.i);
  const shades = layers.map((l) => l.querySelector('.to-shade'));
  const floorFade = stage.querySelector('.to-floorfade');
  const S = { vw: 0, vh: 0, wide: false, W: 0, hero: null, room: null, mandap: null, cam: 0, target: 0, pan: 0, keys: [[0, 0]], holds: [], raf: 0, reduced: ctx.reduced, shown: -1 };

  function measure() {
    S.vw = window.innerWidth; S.vh = window.innerHeight;
    S.wide = S.vw >= 900;
    const { vw, vh, wide } = S;
    // the frames: where the door in focus stands (width, axis x, top) on the first screen and in the rooms
    // on a phone the door is a little wider than the screen: its plain wall margins run off the sides
    const roomH = wide ? Math.min(vh * 0.8, vw * 0.52 * DOOR_AR) : Math.min(vh * 0.66, vw * 1.04 * DOOR_AR);
    const heroH = wide ? vh * 0.58 : Math.min(vh * 0.5, vw * 0.8 * DOOR_AR);
    S.W = roomH / DOOR_AR; // the layer's own size; the hero frame is a scale of it
    S.room = { w: S.W, x: wide ? vw * 0.33 : vw / 2, top: wide ? (vh - roomH) / 2 : vh * 0.03 };
    S.hero = { w: heroH / DOOR_AR, x: vw / 2, top: vh - heroH - (wide ? vh * 0.02 : vh * 0.025) };
    // how far each door's painted wall and floor reach (% of the door): just enough to fill the screen whenever that
    // door is the one you see (asymmetric on wide screens, where the door stands left of centre)
    const E = wide ? { xl: 140, xr: 290, yt: 80, yb: 230 } : { xl: 55, xr: 55, yt: 120, yb: 290 };
    // the painted floor: under the door on a phone; on a wide screen it also runs on under the plaques' column
    const tot = E.xl + 100 + E.xr; const fw = wide ? 3.8 / (tot / 100) : 2.6 / (tot / 100);
    const cx = (E.xl + 50) / tot;
    const fcx = wide ? (E.xl + 50 + 85) / tot : cx;
    const v = { '--xl': E.xl, '--xr': E.xr, '--yt': E.yt, '--yb': E.yb,
      '--mw': `${(10000 / tot).toFixed(3)}%`, '--mh': `${(10000 / (E.yt + 100)).toFixed(3)}%`, '--mx': `${((E.xl / (E.xl + E.xr)) * 100).toFixed(3)}%`,
      '--cx': `${(cx * 100).toFixed(2)}%`, '--cy': `${(((E.yt + 50) / (E.yt + 100)) * 100).toFixed(2)}%`,
      '--rx': `${(30000 / tot).toFixed(2)}%`, '--ry': `${(22000 / (E.yt + 100)).toFixed(2)}%`,
      '--fw': `${(fw * 100).toFixed(2)}%`, '--fx': `${(fw >= 1 ? 50 : ((fcx - fw / 2) / (1 - fw)) * 100).toFixed(2)}%` };
    const world = stage.querySelector('.to-world');
    Object.entries(v).forEach(([k, x]) => world.style.setProperty(k, String(x)));
    // the hero text must end above the first door's lintel
    const topDoor = S.hero.top + heroH * 0.04;
    document.documentElement.style.setProperty('--to-hero-room', `${Math.max(180, topDoor).toFixed(0)}px`);
    layers.forEach((l, i) => {
      if (i < 6) {
        l.style.width = `${S.W.toFixed(1)}px`; l.style.height = `${(S.W * DOOR_AR).toFixed(1)}px`;
        // the wall's hole: the door's opening (a hair wider; the frame covers the edge)
        const [o0, o1, o2, o3] = DOORS[i].open; const ow = (o2 - o0 + 0.016) * 100; const oh = (o3 - o1 + 0.016) * 100;
        const hy = E.yt + 100;
        l.style.setProperty('--mw', `${((ow / tot) * 100).toFixed(3)}%`);
        l.style.setProperty('--mh', `${((oh / hy) * 100).toFixed(3)}%`);
        l.style.setProperty('--mx', `${(((E.xl + (o0 - 0.008) * 100) / (tot - ow)) * 100).toFixed(3)}%`);
        l.style.setProperty('--my', `${(((E.yt + (o1 - 0.008) * 100) / (hy - oh)) * 100).toFixed(3)}%`);
        return;
      }
      const M = vw / vh >= 1 ? MANDAP.l : MANDAP.p;
      // a little larger than the screen, so seen through the sixth door it still fills the whole opening
      const k = Math.max(vw / M.w, vh / M.h) * 1.12;
      const mw = M.w * k; const mh = M.h * k;
      l.style.width = `${mw.toFixed(1)}px`; l.style.height = `${mh.toFixed(1)}px`;
      const roomAy = S.room.top + ocy(5) * S.W * DOOR_AR;
      S.mandap = { ax: S.room.x + (mw - vw) / 2, ay: roomAy + (mh - vh) / 2, bottom: (vh + mh) / 2, petals: mw * (944 / 1680) * 0.3 };
    });
  }
  const ocx = (i) => (DOORS[i].open[0] + DOORS[i].open[2]) / 2;
  const ocy = (i) => (DOORS[i].open[1] + DOORS[i].open[3]) / 2;

  function render(c) {
    const f = smooth(c); // 0..1 over the first move: from the hero frame into the rooms
    const w = lerp(S.hero.w, S.room.w, f);
    const k0 = Math.min(Math.floor(c), 5); const k1 = Math.min(k0 + 1, 5); const t = c - Math.floor(c);
    const oy = lerp(ocy(k0), ocy(k1), t);
    const top = lerp(S.hero.top, S.room.top, f);
    const ax = lerp(S.hero.x, S.room.x, f);
    const ay = top + oy * w * DOOR_AR - S.pan; // while plaques are read the view tilts down to the floor
    const unit = w / S.W; // the hero frame is a smaller copy of the room frame
    const zc = zAt(c);
    // how deep the drawn doors go: beyond that the house is dark (fewer layers on a phone)
    const far = S.wide ? 4.2 : 3.6;
    floorFade.style.opacity = (f * (1 - smooth((c - 5) * 1.2))).toFixed(3); // the floor in shade, except at the sunlit mandap
    layers.forEach((l, i) => {
      const d = Z[i] - zc + 1;
      if (d < 0.42 || d > far) { if (l.style.visibility !== 'hidden') l.style.visibility = 'hidden'; return; }
      if (l.style.visibility) l.style.visibility = '';
      const s = unit / d;
      const anc = i < 6 ? [ocx(i) * S.W, ocy(i) * S.W * DOOR_AR] : [S.mandap.ax, S.mandap.ay];
      l.style.transform = `translate3d(${ax.toFixed(2)}px,${ay.toFixed(2)}px,0) scale(${s.toFixed(4)}) translate3d(${(-anc[0]).toFixed(2)}px,${(-anc[1]).toFixed(2)}px,0)`;
      l.style.opacity = d < 0.8 ? smooth((d - 0.42) / 0.38).toFixed(3) : '1';
      shades[i].style.opacity = clamp((d - 1) * 0.16, 0, 0.5).toFixed(3);
    });
  }

  /**
   * scroll y -> camera: a move per room (its gap scrolls through), then a hold while its plaques are read.
   * Where the plaques would cross the door's flowers (every room on a phone; the mandap everywhere), the first plaque
   * arrives just below the door's floor art and the view then tilts down with the reading (pan, 1:1 with the scroll,
   * up to PMAX), so plaques only ever lie on the floor; the next move tilts back up.
   */
  function buildKeys() {
    const y0 = window.scrollY;
    const abs = (el) => el.getBoundingClientRect().top + y0;
    const keys = [[0, 0]];
    const holds = [];
    let last = 0; let prev = 0;
    document.querySelectorAll('.to-room').forEach((room, n) => {
      const k = Number(room.dataset.door);
      const g = room.querySelector('.to-gap');
      const plaqueTop = abs(g) + g.offsetHeight;
      const tilt = k === 6 || !S.wide;
      // where the first plaque's top sits when the door is reached (fraction of the screen)
      const at = k === 6 ? (S.mandap.bottom + S.mandap.petals) / S.vh : S.wide ? 0.9 : (S.room.top + S.W * DOOR_AR * DOORS[k].ground) / S.vh + 0.19;
      const start = n === 0 ? 0 : Math.max(last, abs(room) - S.vh * 0.6);
      const end = Math.max(start + 1, plaqueTop - S.vh * at);
      keys.push([start, prev], [end, k]);
      if (holds.length) holds[holds.length - 1].next = [start, end];
      holds.push({ end, max: tilt ? S.vh * 1.1 : 0, next: null });
      last = end; prev = k;
    });
    S.keys = keys; S.holds = holds;
  }
  function panAt(y) {
    for (let i = S.holds.length - 1; i >= 0; i--) {
      const h = S.holds[i];
      if (y < h.end) continue;
      if (!h.next || y < h.next[0]) return Math.min(y - h.end, h.max);
      const P = Math.min(h.next[0] - h.end, h.max);
      return P * (1 - smooth((y - h.next[0]) / (0.55 * (h.next[1] - h.next[0]) || 1))); // the view tilts back up first, then walks on
    }
    return 0;
  }
  function camAt(y) {
    const K = S.keys;
    if (y <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) {
      const [ya, ca] = K[i - 1]; const [yb, cb] = K[i];
      if (y <= yb) return ca === cb ? ca : lerp(ca, cb, smooth((y - ya) / (yb - ya || 1)));
    }
    return K[K.length - 1][1];
  }

  // the deeper doors' pictures load once the guest is in (the first two come with the page)
  const loadAll = () => stage.querySelectorAll('[data-src], [data-srcset]').forEach((el) => {
    if (el.dataset.srcset) { el.srcset = el.dataset.srcset; delete el.dataset.srcset; }
    if (el.dataset.src) { el.src = el.dataset.src; delete el.dataset.src; }
  });

  function tick() {
    S.raf = 0;
    const diff = S.target - S.cam;
    S.cam = Math.abs(diff) < 0.0008 ? S.target : S.cam + diff * 0.16;
    S.pan = panAt(window.scrollY);
    render(S.cam);
    if (S.cam !== S.target) S.raf = requestAnimationFrame(tick);
  }
  function onScroll() {
    const t = camAt(window.scrollY);
    document.body.classList.toggle('to-moved', window.scrollY > 24);
    if (S.reduced) {
      // stills: the door whose plaques are in view, crossfaded in
      const k = Math.round(t);
      if (k === S.shown) { S.pan = panAt(window.scrollY); render(S.cam); return; }
      S.shown = k;
      gsap.to(stage, { opacity: 0, duration: 0.18, ease: 'power1.in', overwrite: true, onComplete: () => { S.cam = k; S.pan = panAt(window.scrollY); render(k); gsap.to(stage, { opacity: 1, duration: 0.32, ease: 'power1.out' }); } });
      return;
    }
    S.target = t;
    if (!S.raf) S.raf = requestAnimationFrame(tick);
  }

  measure();
  render(0);
  return {
    start() {
      loadAll();
      buildKeys();
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      let rw = window.innerWidth; let rh = window.innerHeight;
      const re = () => {
        // phones change height as the address bar hides: re-measure only on real changes
        if (window.innerWidth === rw && Math.abs(window.innerHeight - rh) < 120) { buildKeys(); onScroll(); return; }
        rw = window.innerWidth; rh = window.innerHeight;
        measure(); buildKeys(); S.cam = camAt(window.scrollY); render(S.cam); onScroll();
      };
      let tm = 0;
      window.addEventListener('resize', () => { clearTimeout(tm); tm = setTimeout(re, 120); });
      // late pictures and fonts move the plaques: the keys follow
      new ResizeObserver(() => { buildKeys(); onScroll(); }).observe(document.querySelector('.to-flow'));
    },
    set: (c) => { S.cam = c; S.target = c; render(c); },
    keys: () => S.keys,
  };
}

/** names that fit: shrink the hero names until the longest line fits the wall (never crop) */
function fitNames() {
  const h = document.getElementById('to-names');
  if (!h) return;
  h.style.fontSize = '';
  const max = h.parentElement.clientWidth;
  const ns = [...h.querySelectorAll('.su-n')];
  let fs = parseFloat(getComputedStyle(h).fontSize);
  for (let i = 0; i < 14 && (h.scrollWidth > max + 1 || ns.some((n) => n.offsetWidth > max)); i++) { fs *= 0.93; h.style.fontSize = `${fs.toFixed(1)}px`; }
}

// the scratch cover: sindoor-red lac with a fine gold rangoli lattice
function paintLac(c2, w, h, dpr, hint) {
  const g = c2.createLinearGradient(0, 0, w, h);
  [[0, '#7E1F17'], [0.45, '#9B2B1D'], [1, '#6A1812']].forEach(([o, col]) => g.addColorStop(o, col));
  c2.fillStyle = g; c2.fillRect(0, 0, w, h);
  c2.strokeStyle = 'rgba(236,182,96,.28)'; c2.lineWidth = dpr;
  const t = 26 * dpr;
  for (let y = 0; y < h + t; y += t) for (let x = (Math.round(y / t) % 2) * (t / 2); x < w + t; x += t) {
    c2.beginPath(); c2.arc(x, y, t * 0.32, 0, Math.PI * 2); c2.stroke();
  }
  for (let i = 0; i < (w * h) / 800; i++) { c2.fillStyle = Math.random() > 0.5 ? 'rgba(255,220,180,.12)' : 'rgba(40,0,0,.14)'; c2.fillRect(Math.random() * w, Math.random() * h, dpr, dpr); }
  const m = 10 * dpr;
  c2.strokeStyle = 'rgba(236,182,96,.75)'; c2.lineWidth = 1.2 * dpr; c2.strokeRect(m, m, w - 2 * m, h - 2 * m);
  const deva = /[ऀ-ॿ]/.test(hint);
  let size = Math.round(Math.min(w / 14, 24 * dpr));
  const setFont = () => { c2.font = deva ? `500 ${size}px "Palanquin Dark", Mukta, sans-serif` : `500 ${size}px Kalnia, Georgia, serif`; };
  setFont();
  c2.textAlign = 'center'; c2.textBaseline = 'middle';
  let tw = c2.measureText(hint).width;
  if (tw > w * 0.74) { size = Math.floor(size * ((w * 0.74) / tw)); setFont(); tw = c2.measureText(hint).width; }
  const pad = Math.round(size * 0.9);
  c2.fillStyle = 'rgba(80,14,10,.85)';
  c2.fillRect(w / 2 - tw / 2 - pad, h / 2 - size * 1.1, tw + pad * 2, size * 2.2);
  c2.fillStyle = '#FBE7C2'; c2.fillText(hint, w / 2, h / 2 + dpr);
}

let cam = null;
const SPEC = {
  slug: 'toran',
  manifest,
  bell: true,
  gate: (ctx) => gate(ctx),
  hero: () => '',
  page: (ctx) => page(ctx),

  ready: (ctx) => {
    initNepali();
    hangLadis(ctx.reduced);
    if (ctx.reduced) document.body.classList.add('to-still');
    cam = tunnel(ctx);
    fitNames();
    document.fonts?.ready.then(fitNames);
    let rw = window.innerWidth;
    window.addEventListener('resize', () => { if (window.innerWidth !== rw) { rw = window.innerWidth; fitNames(); if (!document.body.classList.contains('is-open')) hangLadis(ctx.reduced); } });
    if (new URLSearchParams(location.search).has('debug')) window.__to = { cam: (c) => cam.set(c), keys: () => cam.keys() };
  },

  gateTap: (ctx, go) => document.getElementById('to-ladis')?.addEventListener('click', go),

  open: (ctx, tl, gateEl) => {
    const W = window.innerWidth; const mid = W / 2;
    const strands = [...gateEl.querySelectorAll('.to-ladi')];
    strands.forEach((s) => {
      const x = Number(s.dataset.x); const dir = x < mid ? -1 : 1;
      const out = dir < 0 ? x + s.offsetWidth + 40 : W - x + s.offsetWidth + 40;
      const delay = (Math.abs(x - mid) / mid) * 0.42;
      tl.to(s, { x: dir * out, duration: 1.25, ease: 'power3.inOut' }, 0.15 + delay)
        .fromTo(s, { rotation: 0 }, { keyframes: [{ rotation: -dir * 7, duration: 0.5, ease: 'power2.out' }, { rotation: dir * 3, duration: 0.45, ease: 'sine.inOut' }, { rotation: 0, duration: 0.4, ease: 'sine.inOut' }] }, 0.15 + delay);
    });
    tl.to(gateEl.querySelector('.to-gate__step'), { yPercent: 100, duration: 0.9, ease: 'power3.in' }, 0.2)
      .to(gateEl.querySelector('.to-gate__rail'), { yPercent: -120, duration: 1.0, ease: 'power3.in' }, 0.95)
      .to(gateEl.querySelector('.to-gate__back'), { opacity: 0, duration: 0.9, ease: 'power1.inOut' }, 0.7)
      .set(gateEl, { autoAlpha: 0 }, 2.1);
    return 1.15;
  },

  scroll: (ctx) => {
    cam.start();
  },
  scratch: { paint: paintLac },
};
mountSuite(SPEC);
