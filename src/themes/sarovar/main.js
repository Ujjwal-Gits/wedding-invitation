// Sarovar (सरोवर): the swan lake at dawn. One painted lotus lake lies under the whole page as living water (water.js).
// Opening: a closed lotus bud on still water; a touch sends a ripple ring across the lake, the bud opens, and two
// swans glide in from the edges until their bowed heads meet. The names rise on the empty sky above.
// Signature (the one big motion): the glide. A pinned scene where scrolling moves you forward across the water:
// a floating ring of diyas carries the countdown, then each ceremony rises out of the lake on a carved stone post,
// lotus clusters and diyas drift past at their own depths, two swans keep pace, and the marble pavilion grows
// until it fills the view. Everything after it is quiet: the families under a marble arch, the couple standing on
// the water with their reflections, the full card, an RSVP that sends a diya across the lake, and the lake again.
import './sarovar.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import { createWater, coverMap } from './water.js';
import { religionOf } from '../../core/faith.js';

const DIR = '/themes/sarovar/art';
const pic = (n, sw, lw) => ({ lg: `${DIR}/${n}.webp`, sm: `${DIR}/${n}-sm.webp`, sw, lw });
const art = {
  swan: pic('swan', 460, 900), bud: pic('bud', 360, 700), bloom: pic('bloom', 460, 900), lily: pic('lily', 600, 1200), diya: pic('diya', 280, 560), candle: pic('candle', 280, 560),
  pavilion: pic('pavilion', 680, 1300), chhatri: pic('chhatri', 520, 917),
  plaqueTop: `${DIR}/plaque-top.webp`, plaqueMid: `${DIR}/plaque-mid.webp`, plaqueBase: `${DIR}/plaque-base.webp`,
};
/** the painted lake, per orientation: horizon, pavilion and sun in image uv (measured on the paintings) */
const LAKE = {
  p: { hz: 0.505, cx: 0.5, cy: 0.515, top: 0.37, sunX: 0.72, sunY: 0.44 },
  l: { hz: 0.612, cx: 0.5, cy: 0.625, top: 0.365, sunX: 0.79, sunY: 0.53 },
};
const img = (src, cls, sizes, alt = '', extra = '') => `<img class="${cls}" src="${src.sm}" srcset="${src.sm} ${src.sw}w, ${src.lg} ${src.lw}w" sizes="${sizes}" alt="${alt}" decoding="async" ${extra}/>`;

// ───────── the swan pair (opening, closing) ─────────
const swan = (side) => `<div class="sv-swan sv-swan--${side}"><div class="sv-swan__flip"><div class="sv-swan__bob">
    ${img(art.swan, 'sv-swan__img', '(max-width: 700px) 40vw, 280px')}
    ${img(art.swan, 'sv-swan__refl', '(max-width: 700px) 40vw, 280px')}
  </div></div></div>`;
const pair = (cls = '') => `<div class="sv-pair ${cls}" aria-hidden="true">${swan('l')}${swan('r')}</div>`;

// ───────── the page ─────────
function page(ctx) {
  const { bi, esc, txt, on, parts: P, c, config } = ctx;
  const NP = !config.timeZone || config.timeZone === 'Asia/Kathmandu'; // B.S. dates only for a wedding in Nepal
  const N = P.events.length;
  // a clay diya on a banana leaf for Hindu and Buddhist weddings; a floating candle on a lily pad for every other
  const lamp = ['hindu', 'buddhist'].includes(religionOf(config)) ? art.diya : art.candle;
  const lampCls = lamp === art.candle ? ' is-candle' : '';
  const nn = (i) => ({ en: String(i), ne: ctx.neNum(String(i)) });

  const plaque = (ev, i) => {
    const hasDress = !!(ev.dress.text?.en || ev.dress.text?.ne || ev.dress.colors.length);
    return `<li class="sv-plq" id="ev-${esc(ev.id)}" data-z="${i + 1}">
      <div class="sv-plq__body">
        <img class="sv-plq__top" src="${art.plaqueTop}" alt="" width="600" height="346" decoding="async" />
        <div class="sv-plq__face">
          <p class="sv-plq__k">${bi(txt('prog.title'))} <span class="sv-plq__n">· ${bi(nn(i + 1))} / ${bi(nn(N))}</span></p>
          <h3 class="sv-plq__t">${bi(ev.title)}</h3>
          <p class="sv-plq__date">${bi({ en: ev.ad.full.en, ne: NP ? ev.bs.full.ne : ev.ad.full.ne })}</p>
          ${NP ? `<p class="sv-plq__alt">${bi({ en: ev.bs.full.en, ne: ev.ad.full.ne })}</p>` : ''}
          <p class="sv-plq__time">${bi(ev.time)}</p>
          ${ev.blurb && (ev.blurb.en || ev.blurb.ne) ? `<p class="sv-plq__blurb">${bi(ev.blurb)}</p>` : ''}
          <p class="sv-plq__venue">${bi(ev.venue)}</p>
          <a class="su-link sv-plq__map" href="${esc(ev.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a>
          ${hasDress ? `<p class="sv-plq__dress">${ev.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : P.UI.wear)}</span></p>` : ''}
          ${ev.rituals.length ? `<details class="sv-plq__order"><summary>${bi(P.UI.order)}</summary><ol>${ev.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
        </div>
        <img class="sv-plq__base" src="${art.plaqueBase}" alt="" width="600" height="290" decoding="async" />
      </div>
    </li>`;
  };

  const AD = ctx.AD; const BS = ctx.BS;

  // decor that drifts past during the glide: [kind, z, x (lateral, ±1 = the screen edge at rest), size]
  const deco = [];
  const sides = [-1, 1];
  for (let k = 0; k <= N + 1; k++) {
    sides.forEach((sd, j) => {
      const z = k + 0.32 + j * 0.42;
      if (z > N + 0.9) return;
      const lily = (k + j) % 3 !== 1;
      deco.push(lily ? ['lily', z, sd * (1.05 + ((k * 7 + j * 3) % 5) * 0.06), 1] : ['diya', z, sd * (0.92 + ((k + j) % 3) * 0.08), 1]);
    });
  }
  const decoHtml = deco.map(([kind, z, x], i) => `<div class="sv-obj sv-obj--${kind}${kind === 'diya' ? lampCls : ''}" data-z="${z.toFixed(2)}" data-x="${x.toFixed(2)}" style="--i:${i}">${kind === 'lily'
    ? img(art.lily, 'sv-obj__img', '(max-width: 700px) 70vw, 520px')
    : img(lamp, 'sv-obj__img', '(max-width: 700px) 30vw, 200px')}</div>`).join('');

  const families = P.families.map((f) => `<div class="sv-fam__side sv-fam__side--${f.key}">
      ${P.brideGroom ? `<figure class="sv-fam__pic">${ctx.imgTag(f.photo, f.person.name.en, '(max-width: 700px) 38vw, 200px')}</figure>` : ''}
      <p class="sv-k">${bi(f.label)}</p>
      <p class="sv-fam__name">${bi(f.person.fullName)}</p>
      ${(f.person.parents?.en || f.person.parents?.ne) ? `<p class="sv-fam__of">${bi(f.of)}</p><p class="sv-fam__par">${bi(f.person.parents)}</p>` : ''}
      ${(f.person.home?.en || f.person.home?.ne) ? `<p class="sv-fam__home">${bi(f.person.home)}</p>` : ''}
    </div>`).join('<span class="sv-fam__and" aria-hidden="true">&amp;</span>');

  const lead = P.lead;
  return `
  <div class="sv-world" id="sv-world" aria-hidden="true">
    <div class="sv-world__cam" id="sv-cam">
      <picture class="sv-lake">
        <source media="(min-aspect-ratio: 1/1)" srcset="${DIR}/lake-l-sm.webp 960w, ${DIR}/lake-l.webp 1680w" sizes="100vw" />
        <img class="sv-lake__img" id="sv-lake" src="${DIR}/lake-p.webp" srcset="${DIR}/lake-p-sm.webp 560w, ${DIR}/lake-p.webp 944w" sizes="100vw" alt="" fetchpriority="high" decoding="async" />
      </picture>
      <canvas class="sv-water" id="sv-water"></canvas>
      <div class="sv-shimmer"></div>
    </div>
    <div class="sv-veil" id="sv-veil"></div>
  </div>

  <section class="su-hero sv-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    <div class="sv-sky">
      ${on(txt('hero.kicker')) ? `<p class="sv-kicker su-in">${bi(txt('hero.kicker'))}</p>` : ''}
      <h1 class="sv-names su-in" id="sv-names">${ctx.names('&amp;')}</h1>
      ${on(txt('hero.line')) ? `<p class="sv-line su-in">${bi(txt('hero.line'))}</p>` : ''}
      <p class="sv-when su-in">${bi({ en: `${AD.wd.en}, ${AD.day} ${AD.month.en} ${AD.year}`, ne: NP ? (BS.full.ne || AD.full.ne) : AD.full.ne })}</p>
      ${(ctx.placeLine?.en || ctx.placeLine?.ne) ? `<p class="sv-where su-in">${bi(ctx.placeLine)}</p>` : ''}
    </div>
    ${pair('sv-pair--hero')}
    <div class="sv-bloom" aria-hidden="true">${img(art.bloom, 'sv-bloom__img', '(max-width: 700px) 44vw, 300px')}</div>
    ${P.cue('programme')}
  </section>

  <section class="sv-glide su-sec" id="programme" aria-labelledby="prog-h">
    <h2 class="sr-only" id="prog-h">${bi(txt('prog.title'))}</h2>
    <div class="sv-glide__stage" id="sv-stage">
      <div class="sv-deco" aria-hidden="true">${decoHtml}</div>
      <div class="sv-mates" aria-hidden="true">${swan('l')}${swan('r')}</div>
      <div class="sv-stop sv-count" id="date" data-z="0">
        <div class="sv-count__sky">
          ${on(txt('glide.kicker')) ? `<p class="sv-k">${bi(txt('glide.kicker'))}</p>` : ''}
          <p class="sv-day">
            <span class="sv-day__wd">${bi(AD.wd)}</span>
            <span class="sv-day__n">${bi({ en: AD.day, ne: BS.day || ctx.neNum(AD.day) })}</span>
            <span class="sv-day__my">${bi({ en: `${AD.month.en} ${AD.year}`, ne: NP && BS.month ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</span>
          </p>
          ${NP ? `<p class="sv-day__alt">${bi({ en: BS.full.short?.en ? (/B\.S\./.test(BS.full.short.en) ? BS.full.short.en : `${BS.full.short.en} B.S.`) : BS.full.en, ne: AD.full.ne })}</p>` : ''}
        </div>
        <div class="sv-ring" data-countdown>
          <div class="sv-ring__glow"></div>
          <p class="sv-ring__title">${bi(txt('count.title'))}</p>
          <ol class="su-count__grid sv-ring__grid" aria-label="${esc(txt('count.title').en)}">${P.countUnits.map((x, i) => `<li class="sv-ring__cell" style="--k:${i}">${P.countNum(x.u, 'sv-ring__n')}<span class="sv-ring__l">${bi(x.label)}</span><span class="sv-ring__d${lampCls}" aria-hidden="true">${img(lamp, 'sv-ring__img', '90px')}</span></li>`).join('')}</ol>
          <p class="sv-ring__done" data-count-done hidden></p>
          <div class="sv-btns">${P.calendarBtn('sv-btn--pearl')}${P.shareBtn('su-btn--line sv-btn--pearl-line')}</div>
        </div>
      </div>
      <ol class="sv-plaques">${P.events.map(plaque).join('')}</ol>
      <div class="sv-end" data-z="${N + 1}">${on(txt('glide.end')) ? `<p class="sv-end__line">${bi(txt('glide.end'))}</p>` : ''}</div>
    </div>
  </section>

  <section class="sv-fam su-sec" id="families" aria-labelledby="fam-h">
    <div class="sv-arch">
      ${img(art.pavilion, 'sv-arch__img', '(max-width: 700px) 100vw, 1100px')}
      <h2 class="sv-h sv-arch__h" id="fam-h">${bi(txt('families.title'))}</h2>
    </div>
    <div class="sv-fam__grid su-rise">${families}</div>
  </section>

  ${lead ? `
  <section class="sv-couple su-sec" id="couple" aria-labelledby="couple-h">
    <div class="sv-shore">
      <h2 class="sv-h su-rise" id="couple-h">${bi(txt('couple.title'))}</h2>
      <figure class="sv-lead">${ctx.imgTag(lead.photo, lead.alt, '(max-width: 700px) 80vw, 440px', { cls: 'sv-lead__img' })}</figure>
    </div>
    <div class="sv-waterband">
      <div class="sv-lead__refl sv-mirror__refl" aria-hidden="true">${ctx.imgTag(lead.photo, '', '(max-width: 700px) 80vw, 440px', { cls: 'sv-mirror__img' })}</div>
      ${on(txt('couple.line')) ? `<p class="sv-lede su-rise">${bi(txt('couple.line'))}</p>` : ''}
    </div>
  </section>` : ''}

  ${P.photos.length ? `
  <section class="sv-gal su-sec" id="photos" aria-labelledby="gal-h">
    <h2 class="sv-h su-rise" id="gal-h">${bi(txt('gallery.title'))}</h2>
    <div class="sv-ledge" id="galgrid">${P.photos.map((g, i) => `<figure class="sv-mirror sv-mirror--g su-rise" style="--d:${(i % 3) * 90}ms">
        <div class="sv-mirror__pic">${P.photoBtn(g, i, '(max-width: 700px) 44vw, 320px')}</div>
        <div class="sv-mirror__refl" aria-hidden="true">${ctx.imgTag(g.photo, '', '(max-width: 700px) 44vw, 320px', { cls: 'sv-mirror__img' })}</div>
      </figure>`).join('')}</div>
  </section>` : ''}

  <section class="sv-card su-sec" id="card" aria-labelledby="card-h">
    <div class="sv-card__sheet su-rise">
      ${img(art.bud, 'sv-card__bud', '72px')}
      <h2 class="sv-card__line" id="card-h">${bi(txt('card.line'))}</h2>
      <p class="sv-card__hosts">${bi(config.hosts)}</p>
      ${P.cardBtn()}
    </div>
    ${P.moreInfo() ? `<div class="sv-info su-rise">${P.moreInfo()}</div>` : ''}
  </section>

  <section class="sv-rsvp su-sec" id="rsvp" aria-labelledby="rsvp-title">
    <div class="sv-rsvp__card su-rise">
      <h2 class="sv-h" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
      ${on(txt('rsvp.line')) ? `<p class="sv-rsvp__line">${bi(txt('rsvp.line'))}</p>` : ''}
      ${(P.deadline?.en || P.deadline?.ne) ? `<p class="sv-rsvp__by">${bi(P.deadline)}</p>` : ''}
      ${P.rsvpForm()}
    </div>
    <div class="sv-rsvp__water" aria-hidden="true">
      <div class="sv-float${lampCls}" id="sv-float">${img(lamp, 'sv-float__img', '140px')}</div>
    </div>
  </section>

  <footer class="su-close sv-close" aria-label="Blessing">
    <div class="sv-close__sky">
      <p class="sv-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
      <p class="sv-close__en l-en">${esc(config.closing?.en || '')}</p>
      <p class="sv-close__names">${ctx.names('&amp;')}</p>
      ${c.hashtag ? `<p class="sv-close__tag">${esc(c.hashtag)}</p>` : ''}
    </div>
    ${pair('sv-pair--close')}
    <div class="sv-close__made">${P.madeWith()}</div>
  </footer>`;
}

// ───────── the lake: water, anchors (CSS vars from the painting's horizon) ─────────
let water = null; let lakeImg = null; let lakeArt = LAKE.p;
function anchors() {
  if (!lakeImg) return;
  const W = window.innerWidth; const H = window.innerHeight;
  lakeArt = (lakeImg.naturalWidth || 9) > (lakeImg.naturalHeight || 16) ? LAKE.l : LAKE.p;
  const m = coverMap(lakeImg, W, H);
  const [, hz] = m.toScreen(lakeArt.cx, lakeArt.hz);
  const [cx, cy] = m.toScreen(lakeArt.cx, lakeArt.cy);
  const [, top] = m.toScreen(lakeArt.cx, lakeArt.top);
  const r = document.documentElement.style;
  r.setProperty('--sv-hz', `${Math.round(hz)}px`);
  r.setProperty('--sv-cx', `${Math.round(cx)}px`);
  r.setProperty('--sv-cy', `${Math.round(cy)}px`);
  r.setProperty('--sv-top', `${Math.round(top)}px`);
  r.setProperty('--sv-vh', `${H}px`);
  document.body.classList.toggle('sv-wide', lakeArt === LAKE.l);
}

function initWater(ctx) {
  lakeImg = document.getElementById('sv-lake');
  const canvas = document.getElementById('sv-water');
  const go = () => {
    anchors();
    if (ctx.reduced || water) { water?.setArt(lakeImg, lakeArt); return; }
    water = createWater(canvas, lakeImg, lakeArt, { onReady: () => document.body.classList.add('sv-gl') });
    if (!water) { document.body.classList.add('sv-nogl'); return; }
    canvas.addEventListener('sv-lost', () => { document.body.classList.remove('sv-gl'); document.body.classList.add('sv-nogl'); });
    water.play();
  };
  if (lakeImg.complete && lakeImg.naturalWidth) go(); else lakeImg.addEventListener('load', go, { once: true });
  // orientation change: the <picture> swaps paintings; re-anchor and re-upload
  lakeImg.addEventListener('load', () => { anchors(); water?.setArt(lakeImg, lakeArt); });
  let raf = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { anchors(); water?.resize(); fitNames(); }); });
  // the water only moves while the lake can be seen (hero, glide, closing) and the tab is visible
  const seen = new Set();
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
    if (!water) return;
    if (seen.size && !document.hidden) water.play(); else water.pause();
  });
  ['top', 'programme'].forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  const close = document.querySelector('.sv-close'); if (close) io.observe(close);
  document.addEventListener('visibilitychange', () => { if (!water) return; if (document.hidden) water.pause(); else if (seen.size) water.play(); });
}

/** the names on one line when they fit the sky, else stacked; never cropped (both scripts) */
function fitNames() {
  document.querySelectorAll('.sv-names, .sv-close__names').forEach((h) => {
    h.classList.remove('is-stack');
    h.style.removeProperty('--fit');
    const room = h.parentElement.clientWidth * 0.94;
    if (h.scrollWidth > room) h.classList.add('is-stack');
    const need = h.scrollWidth;
    if (need > room) h.style.setProperty('--fit', (room / need).toFixed(3));
  });
}

// ───────── the glide (pinned; transform and opacity only) ─────────
const K = 1.55; // perspective: scale = 1 / (1 + K·depth)
function glide(ctx) {
  const sec = document.getElementById('programme');
  const stage = document.getElementById('sv-stage');
  const plaques = [...sec.querySelectorAll('.sv-plq')];
  const N = plaques.length;
  const objs = [...sec.querySelectorAll('.sv-obj')].map((el) => ({ el, z: Number(el.dataset.z), x: Number(el.dataset.x), w: 0, h: 0 }));
  const count = sec.querySelector('.sv-count');
  const countSky = sec.querySelector('.sv-count__sky');
  const ring = sec.querySelector('.sv-ring');
  const end = sec.querySelector('.sv-end');
  const mates = [...sec.querySelectorAll('.sv-mates .sv-swan')];
  const cam = document.getElementById('sv-cam');
  const veil = document.getElementById('sv-veil');
  const close = document.querySelector('.sv-close');
  sec.classList.add('is-glide');
  let W = 0; let H = 0; let HZ = 0; let plq = []; let mw = []; let mh = [];
  const size = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    HZ = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sv-hz')) || H * 0.5;
    const T0 = Math.max(64, H * 0.075);
    plq = plaques.map((li) => {
      const face = li.querySelector('.sv-plq__face'); const top = li.querySelector('.sv-plq__top');
      const need = top.offsetHeight + face.offsetHeight + 10;
      const fit = Math.min(1, (H - 14 - T0) / need);
      return { li, w: li.offsetWidth, h: li.offsetHeight, fit, y0: T0 + li.offsetHeight * fit };
    });
    mw = mates.map((m) => m.offsetWidth); mh = mates.map((m) => m.offsetHeight);
    objs.forEach((o) => { o.w = o.el.offsetWidth; o.h = o.el.offsetHeight; });
  };
  // depth → screen: s, and the y of a point that sits at y0 when the depth is 0
  const proj = (d) => (d >= 0 ? 1 / (1 + K * d) : 1 - d * 2.2);
  const yAt = (y0, s) => HZ + (y0 - HZ) * s;
  const fadeOf = (d) => (d > 3.4 ? 0 : d > 2.4 ? 3.4 - d : d < -0.42 ? 0 : d < 0 ? 1 + d / 0.42 : 1);
  let camZ = 0; let flow = 0;
  const render = () => {
    // decor
    objs.forEach((o) => {
      const d = o.z - camZ; const a = fadeOf(d);
      if (a <= 0) { o.el.style.visibility = 'hidden'; return; }
      const s = proj(d);
      const x = W / 2 + o.x * (W / 2) * s; const y = yAt(H * 1.04, s);
      o.el.style.visibility = 'visible';
      o.el.style.opacity = a.toFixed(3);
      o.el.style.zIndex = String(Math.round(100 - d * 20));
      o.el.style.transform = `translate3d(${(x - o.w / 2).toFixed(1)}px,${(y - o.h).toFixed(1)}px,0) scale(${s.toFixed(4)})`;
    });
    // plaques
    plq.forEach((p, i) => {
      // a post rises into view only as it nears (a stronger perspective than the decor, so the stop before stays clear)
      const d = i + 1 - camZ; const a = d > 0.8 ? 0 : d > 0.42 ? (0.8 - d) / 0.38 : fadeOf(d);
      if (a <= 0) { p.li.style.visibility = 'hidden'; p.li.inert = true; return; }
      const pd = d >= 0 ? 1 / (1 + 2.3 * d) : proj(d);
      const s = pd * p.fit;
      const y = yAt(p.y0, pd);
      p.li.style.visibility = 'visible';
      p.li.style.opacity = a.toFixed(3);
      p.li.style.zIndex = String(Math.round(100 - d * 20) + 1);
      p.li.style.transform = `translate3d(${(W / 2 - p.w / 2).toFixed(1)}px,${(y - p.h * s).toFixed(1)}px,0) scale(${s.toFixed(4)})`;
      p.li.inert = Math.abs(d) > 0.45;
    });
    // the countdown stop: its sky text lifts away, the ring floats toward you and passes
    const d0 = -camZ;
    const sky = Math.max(0, 1 - camZ * 2.4);
    countSky.style.opacity = sky.toFixed(3);
    countSky.style.transform = `translate3d(0,${(-camZ * 60).toFixed(1)}px,0)`;
    const rs = proj(d0); const ra = fadeOf(d0);
    ring.style.opacity = ra.toFixed(3);
    ring.style.transform = `translate3d(0,${((rs - 1) * (H - HZ) * 0.9).toFixed(1)}px,0) scale(${rs.toFixed(4)})`;
    count.inert = camZ > 0.4;
    count.style.visibility = ra <= 0 && sky <= 0 ? 'hidden' : '';
    // the swans keep pace beside you, in the near water at the two lower corners (never over the words)
    mates.forEach((m, i) => {
      // wide screens: in the near water beside the post; phones (the post fills the width): far out, near the horizon
      const wide = W > 700; const side = i ? 1 : -1;
      const s = proj(wide ? 0.14 : 1.05);
      const x = wide ? W / 2 + side * W * 0.3 : W / 2 + side * 1.5 * (W / 2) * s; const y = yAt(H * 1.03, s);
      m.parentElement.style.zIndex = wide ? '300' : '40';
      const show = Math.min(1, Math.max(0, (camZ - 0.25) * 2.5), Math.max(0, (N + 0.6 - camZ) * 2));
      m.style.opacity = show.toFixed(3);
      m.style.transform = `translate3d(${(x - mw[i] / 2).toFixed(1)}px,${(y - mh[i]).toFixed(1)}px,0) scale(${s.toFixed(3)})`;
    });
    // the end: the pavilion grows until it fills the view, then dawn pearl
    const e = camZ - N; // 0..1
    const zoom = e > 0.2 ? 1 + Math.pow((e - 0.2) / 0.8, 1.6) * 1.7 : 1;
    cam.style.transform = zoom > 1.0001 ? `scale(${zoom.toFixed(4)})` : '';
    veil.style.opacity = String(Math.max(0, Math.min(1, (e - 0.55) / 0.42)).toFixed(3));
    end.style.opacity = String(Math.max(0, Math.min(1, e < 0.6 ? (e - 0.15) / 0.3 : (0.95 - e) / 0.3)).toFixed(3));
    water?.setFlow(flow);
  };
  const setOrigin = () => {
    const cx = getComputedStyle(document.documentElement).getPropertyValue('--sv-cx');
    const cy = getComputedStyle(document.documentElement).getPropertyValue('--sv-cy');
    cam.style.transformOrigin = `${cx} calc(${cy} - 4%)`;
  };
  size(); setOrigin();
  const proxy = { z: 0 };
  let st = null;
  ctx.gsap.to(proxy, {
    z: N + 1, ease: 'none',
    onUpdate: () => { flow += (proxy.z - camZ) * 2.2; camZ = proxy.z; render(); },
    scrollTrigger: {
      trigger: sec, start: 'top top', end: () => `+=${(N + 1) * window.innerHeight * 0.95}`, pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
      // rest at each stop; the last stretch (the pavilion) is never a resting place
      snap: new URLSearchParams(location.search).has('nosnap') ? false : { snapTo: (v) => { const z = v * (N + 1); return z > N + 0.3 ? v : Math.round(z) / (N + 1); }, inertia: false, duration: { min: 0.3, max: 0.7 }, delay: 0.1, ease: 'power2.inOut' },
      onRefresh: (self) => { st = self; },
      onRefreshInit: () => { size(); setOrigin(); },
    },
  });
  render();
  // the closing shows the lake again as it was (the glide left it zoomed in and veiled)
  if (close) {
    ctx.ScrollTrigger.create({
      trigger: close, start: 'top bottom',
      onEnter: () => { cam.style.transform = ''; veil.style.opacity = '0'; },
      onLeaveBack: () => render(),
    });
  }
  // keyboard: tabbing into a plaque glides to it
  plaques.forEach((li, i) => li.addEventListener('focusin', () => {
    if (!st || Math.abs(camZ - (i + 1)) < 0.2) return;
    const y = st.start + (st.end - st.start) * ((i + 1) / (N + 1));
    const l = ctx.lenis?.(); if (l) l.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
  }));
  sec.querySelectorAll('.sv-plq__order').forEach((d) => d.addEventListener('toggle', () => { size(); render(); }));
  let rw = window.innerWidth;
  window.addEventListener('resize', () => { if (window.innerWidth !== rw) { rw = window.innerWidth; size(); setOrigin(); render(); } });
  if (new URLSearchParams(location.search).has('debug')) {
    window.__sv = {
      go: (z) => { if (!st) return; const y = st.start + (st.end - st.start) * (z / (N + 1)); const l = ctx.lenis?.(); if (l) l.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); ctx.ScrollTrigger.update(); },
      N, water: () => water,
    };
  }
}

// the diyas under the countdown bob on the water while they can be seen (CSS, transform only)
function diyaRing(ctx) {
  const ring = document.querySelector('.sv-ring');
  if (!ring || ctx.reduced) return;
  new IntersectionObserver(([e]) => ring.classList.toggle('is-live', e.isIntersecting)).observe(ring);
}

// RSVP: a yes sends the diya across the water, and a new one is lit in its place
function rsvpDiya(ctx) {
  const form = document.getElementById('rsvp-form');
  const status = document.getElementById('rsvp-status');
  const float = document.getElementById('sv-float');
  if (!form || !status || !float) return;
  let yes = false;
  form.addEventListener('submit', () => { yes = form.querySelector('input[name="attending"]:checked')?.value === 'yes'; }, true);
  new MutationObserver(() => {
    if (!yes || !status.querySelector('.l-en') || status.classList.contains('is-error')) return;
    yes = false;
    const w = float.parentElement.clientWidth;
    if (ctx.reduced) { gsap.fromTo(float, { opacity: 0.4 }, { opacity: 1, duration: 0.6 }); return; }
    const ghost = float.cloneNode(true);
    ghost.removeAttribute('id'); ghost.classList.add('is-away');
    float.parentElement.appendChild(ghost);
    gsap.timeline({ onComplete: () => ghost.remove() })
      .to(ghost, { x: w * 0.34, y: -150, scale: 0.42, duration: 5.5, ease: 'sine.inOut' }, 0)
      .to(ghost, { rotation: 4, duration: 1.3, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0)
      .to(ghost, { opacity: 0, duration: 1.6, ease: 'power1.in' }, 3.9);
    gsap.fromTo(float, { opacity: 0, y: 14, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 1.2, delay: 1.2, ease: 'power2.out' });
  }).observe(status, { childList: true, subtree: true });
}

const SPEC = {
  slug: 'sarovar',
  // the engine asks whether to show a Ganesh picture; this design has none (no studio field for it)
  manifest: { ...manifest, texts: { ...manifest.texts, 'ganesh.show': { label: '', default: { en: 'off', ne: 'off' } } } },
  art,
  bell: false,

  // the closed bud on still water (the lake itself is the page's fixed world, under the gate)
  gate: (ctx) => `<div class="sv-gbud">${img(art.bud, 'sv-gbud__img', '(max-width: 700px) 30vw, 200px', '', 'fetchpriority="high"')}</div>
    ${ctx.on(ctx.txt('gate.hint')) ? `<p class="sv-ghint">${ctx.bi(ctx.txt('gate.hint'))}</p>` : ''}`,

  hero: () => '',

  ready: (ctx) => {
    if (ctx.reduced) document.body.classList.add('sv-still');
    initWater(ctx);
    // the photo rows: each picture's own shape decides its width, so a row shares one waterline
    document.querySelectorAll('.sv-mirror--g').forEach((fig) => {
      const im = fig.querySelector('.su-gal__btn img');
      const set = () => { if (im.naturalWidth) fig.style.setProperty('--ar', (im.naturalWidth / im.naturalHeight).toFixed(4)); };
      if (im.complete) set(); else im.addEventListener('load', set, { once: true });
    });
    fitNames();
    document.fonts?.ready.then(fitNames);
    // before the opening the first screen's living parts wait under the gate
    gsap.set('.sv-pair--hero .sv-swan, .sv-bloom', { autoAlpha: 0 });
    gsap.set('.sv-hero .su-in', { opacity: 0 });
    // the closed bud is a tap target too (the buttons stay the accessible way in); the gate itself lets taps through
    const gate = document.getElementById('gate');
    gate?.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      water?.ripple(e.clientX, e.clientY, 0.6);
    });
    if (ctx.reduced) {
      // the plain fade: the pair and the bloom simply appear with the names
      new MutationObserver((ms, ob) => {
        if (!document.body.classList.contains('is-opening') && !document.body.classList.contains('is-open')) return;
        ob.disconnect();
        gsap.to('.sv-pair--hero .sv-swan, .sv-bloom', { autoAlpha: 1, duration: 0.6, delay: 0.3 });
      }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  },

  gateTap: (ctx, go) => document.querySelector('.sv-gbud')?.addEventListener('click', go),

  open: (ctx, tl, gateEl) => {
    const bud = gateEl.querySelector('.sv-gbud');
    const hint = gateEl.querySelector('.sv-ghint');
    const bloom = document.querySelector('.sv-bloom');
    const [sl, sr] = document.querySelectorAll('.sv-pair--hero .sv-swan');
    const W = window.innerWidth;
    // the touch: a ring spreads from the bud across the lake
    tl.call(() => {
      const r = bud.getBoundingClientRect();
      water?.ripple(r.left + r.width / 2, r.bottom - r.height * 0.1, 1);
    }, null, 0.02);
    if (hint) tl.to(hint, { autoAlpha: 0, duration: 0.3 }, 0);
    // the bud swells and gives way to the open bloom (the same pad, the same place)
    tl.to(bud, { scale: 1.06, y: -4, duration: 0.55, ease: 'sine.inOut', transformOrigin: '50% 92%' }, 0.08)
      .to(bud, { autoAlpha: 0, scale: 1.12, duration: 0.6, ease: 'power1.in' }, 0.5)
      .fromTo(bloom, { autoAlpha: 0, scale: 0.62, rotation: -2, transformOrigin: '50% 86%' }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 1.6, ease: 'expo.out' }, 0.48)
      .call(() => { const r = bloom.getBoundingClientRect(); water?.ripple(r.left + r.width / 2, r.bottom - r.height * 0.18, 0.55); }, null, 0.75)
      .set(gateEl, { autoAlpha: 0 }, 1.25);
    // two swans glide in from the edges; their heads lift as they come, then bow until they meet
    if (sl && sr) {
      const off = W * 0.62;
      const il = sl.querySelector('.sv-swan__bob'); const ir = sr.querySelector('.sv-swan__bob');
      tl.fromTo(sl, { autoAlpha: 0, x: -off }, { autoAlpha: 1, x: 0, duration: 2.8, ease: 'power2.out' }, 0.7)
        .fromTo(sr, { autoAlpha: 0, x: off }, { autoAlpha: 1, x: 0, duration: 2.8, ease: 'power2.out' }, 0.78)
        .fromTo([il, ir], { rotation: -5 }, { rotation: 0, duration: 1.3, ease: 'sine.inOut' }, 2.6);
    }
    return 1.55; // the names rise on the sky while the swans are still gliding
  },

  ambient: (ctx) => {
    if (ctx.reduced) return;
    // the swans ride the water (a slow breath), only while they are on screen
    const bobs = [...document.querySelectorAll('.sv-pair .sv-swan__bob')];
    const tws = bobs.map((b, i) => gsap.to(b, { y: 3, rotation: i % 2 ? 0.7 : -0.7, duration: 2.6 + i * 0.25, yoyo: true, repeat: -1, ease: 'sine.inOut', paused: true, delay: i * 0.3 }));
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      bobs.forEach((b, i) => { if (e.target.contains(b)) (e.isIntersecting ? tws[i].play() : tws[i].pause()); });
    }));
    document.querySelectorAll('.sv-pair').forEach((p) => io.observe(p));
    // touch the water anywhere on the first screen or the closing: a ripple
    ['top'].forEach((id) => document.getElementById(id)?.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a, button')) return;
      water?.ripple(e.clientX, e.clientY, 0.7);
    }));
    document.querySelector('.sv-close')?.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a, button')) return;
      water?.ripple(e.clientX, e.clientY, 0.7);
    });
  },

  page: (ctx) => page(ctx),
  scroll: (ctx) => {
    diyaRing(ctx);
    rsvpDiya(ctx);
    // the reflections breathe a little when they are on screen
    if (!ctx.reduced) {
      const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-live', e.isIntersecting)));
      document.querySelectorAll('.sv-mirror__refl').forEach((r) => io.observe(r));
      glide(ctx);
    }
  },
};
mountSuite(SPEC);
