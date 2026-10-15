// Theme · Mehendi (मेहन्दी) — henna on ivory, hands joined.
// A plain ivory gate holds a large henna mandala, faint as a pencil guide. Tap, and the henna draws itself ring by
// ring from the centre outward, the way a cone lays a line (the one signature motion); the mandala then sinks back
// to a watermark and the joined hands glide down from the top edge while the henna Ganesh appears.
// Below, "the henna trail": one vine runs down the whole page and draws itself as you scroll; the sections sit
// alternately left and right of it like a story, each joined by a tendril and a bud that blooms as you reach it.
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import './mehendi.css'; // after the suite's CSS, so the theme wins ties
import {
  ART, r2, lens, PAISLEY, around, dots, mandala, dhaka, corner, FLOWER, LOTUS,
  heroHtml, gateScene, gateExit, heroEnter, heroScroll, heroAmbient,
} from './parts.js';

/** the cone lays each ring in turn, centre outward; then the henna sinks to a watermark and the hands arrive */
function open(ctx, tl, gateEl) {
  const drawn = gateExit(tl, gateEl);
  tl.set(gateEl, { autoAlpha: 0 }, drawn + 0.86);
  heroEnter(tl, drawn + 0.2, document.getElementById('top'));
  return drawn + 0.65;
}

// ───────── the palm: a henna-drawn hand; its round palm mandala is the scratch cover ─────────
// the painted bridal hand (decor art/palm*.webp, Canva AI); its bare palm is an oval at PALM (fractions of the image)
const PALM = { ar: 2.5567, cx: 0.5583, cy: 0.5055, rx: 0.3433, ry: 0.1621 }; // the bare palm, an oval (rx of width, ry of height)
const HAND = `<img class="md-handimg" src="${ART}palm-sm.webp" srcset="${ART}palm-sm.webp 480w, ${ART}palm.webp 900w" sizes="(max-width: 719px) 72vw, 330px" alt="" aria-hidden="true" decoding="async" loading="lazy" />`;
// the scratch cover: a real henna mandala laid over the bare palm
const MANDALA = new Image();
MANDALA.decoding = 'async';
MANDALA.onload = () => document.dispatchEvent(new Event('su-scratch-redraw'));
MANDALA.src = `${ART}mandala-sm.webp`;

/** the cover: dense henna on skin, a cream ribbon with the hint (never text straight on the pattern) */
function hennaPalm(c, w, h, dpr, hint) {
  // the bare palm is an oval: the cover fills it, edge to edge, up to the henna ring
  const R = Math.min(w, h) / 2; const cx = w / 2; const cy = h / 2;
  c.clearRect(0, 0, w, h);
  c.save();
  c.beginPath(); c.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); c.clip();
  const g = c.createRadialGradient(cx, cy * 0.85, R * 0.1, cx, cy, Math.max(w, h) / 2);
  g.addColorStop(0, '#F3D3B4'); g.addColorStop(1, '#E2B08C');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  if (MANDALA.complete && MANDALA.naturalWidth) c.drawImage(MANDALA, 0, 0, w, h);
  c.restore();
  // the hint, on a cream ribbon
  let fs = Math.round(Math.min(R * 0.15, 17 * dpr));
  c.font = `600 ${fs}px Mukta, sans-serif`;
  let tw = c.measureText(hint).width;
  if (tw > w * 0.78) { fs = Math.floor((fs * w * 0.78) / tw); c.font = `600 ${fs}px Mukta, sans-serif`; tw = c.measureText(hint).width; }
  const bw = Math.min(w * 0.9, tw + fs * 1.8); const bh = fs * 2.1;
  c.fillStyle = 'rgba(255,253,248,0.96)';
  c.beginPath();
  if (c.roundRect) c.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, bh / 2); else c.rect(cx - bw / 2, cy - bh / 2, bw, bh);
  c.fill();
  c.strokeStyle = 'rgba(122,46,27,0.5)'; c.lineWidth = dpr; c.stroke();
  c.fillStyle = '#7A2E1B'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(hint, cx, cy + fs * 0.06);
}

// ───────── the henna trail: one vine down the page, drawn by the scroll ─────────
function vine(ctx) {
  const { ScrollTrigger: ST } = ctx;
  const story = document.querySelector('.md-story');
  if (!story) return;
  const NS = 'http://www.w3.org/2000/svg';
  const mq = matchMedia('(max-width: 719px)');
  let triggers = [];
  /** layout position inside the section, ignoring transforms (blocks may still be mid-reveal) */
  const box = (el, sec) => { let x = 0; let y = 0; let n = el; while (n && n !== sec) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };
  const build = () => {
    triggers.forEach((t) => t.kill()); triggers = [];
    const secs = [...story.querySelectorAll(':scope > .md-sec')];
    const phone = mq.matches;
    secs.forEach((sec, i) => {
      sec.querySelector(':scope > .md-seg')?.remove();
      const W = sec.clientWidth; const H = sec.offsetHeight;
      if (!W || !H) return;
      const cx = phone ? 22 : Math.round(W / 2);
      const last = i === secs.length - 1;
      const endEl = sec.querySelector('[data-vine-end]');
      const eb = endEl ? box(endEl, sec) : null;
      const y1 = eb ? Math.round(eb.y + eb.h / 2) : H;
      const x1 = eb ? Math.round(eb.x + eb.w / 2) : cx;
      const sw = (phone ? 7 : 28) * (i % 2 ? 1 : -1);
      const y = (f) => r2(y1 * f);
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'md-seg'); svg.setAttribute('width', W); svg.setAttribute('height', H);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('aria-hidden', 'true');
      const main = document.createElementNS(NS, 'path');
      main.setAttribute('d', `M${cx} 0C${cx} ${y(0.22)} ${cx + sw} ${y(0.28)} ${cx + sw} ${y(0.5)}S${x1} ${y(0.78)} ${x1} ${r2(y1 - (endEl ? endEl.offsetHeight * 0.42 : 0))}`);
      main.setAttribute('class', 'md-vine'); main.setAttribute('pathLength', '1');
      svg.append(main); sec.prepend(svg);
      const len = main.getTotalLength();
      const at = (L) => main.getPointAtLength(Math.max(0, Math.min(len, L)));
      let html = '';
      const step = phone ? 58 : 76;
      for (let L = step * 0.55, k = 0; L < len - 24; L += step, k += 1) {
        const p = at(L); const q = at(L + 2);
        const ang = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
        const side = k % 2 ? 1 : -1;
        const shape = k % 4 === 3
          ? `<path d="${PAISLEY}" transform="scale(${phone ? 0.34 : 0.42})"/>`
          : `<path d="${lens(1, phone ? 12 : 15, phone ? 3.4 : 4.2)}"/>`;
        html += `<g transform="translate(${r2(p.x)} ${r2(p.y)}) rotate(${r2(ang + side * 58 - 90)})"><g class="md-lf" data-t="${r2(L / len)}">${shape}</g></g>`;
      }
      sec.querySelectorAll('[data-bud]').forEach((el) => {
        const side = el.dataset.side;
        const head = el.querySelector('.md-h') || el;
        const hr = box(head, sec); const r = box(el, sec);
        const by = Math.round(hr.y + Math.min(hr.h / 2, 34));
        let bx;
        if (phone) bx = 36;
        else if (side === 'l') bx = r.x + r.w + 38;
        else if (side === 'r') bx = r.x - 30;
        else return;
        let best = 0; let bd = 1e9;
        for (let L = 0; L <= len; L += 5) { const d = Math.abs(at(L).y - (by - (phone ? 22 : 34))); if (d < bd) { bd = d; best = L; } }
        const p = at(best); const t = r2(best / len);
        html += `<path class="md-tendril" pathLength="1" data-t="${t}" d="M${r2(p.x)} ${r2(p.y)}C${r2(p.x)} ${r2(p.y + 14)} ${r2(bx + (p.x - bx) * 0.45)} ${by - 2} ${r2(bx)} ${by}"/>`
          + `<g transform="translate(${r2(bx)} ${by})"><g class="md-bud" data-t="${t}">${around(6, (a) => `<path d="${lens(2.5, 12, 4.4)}" transform="rotate(${a})"/>`)}<circle class="d" r="2.6"/></g></g>`;
      });
      svg.insertAdjacentHTML('beforeend', html);
      const leaves = [...svg.querySelectorAll('.md-lf')].map((e) => ({ e, t: +e.dataset.t, on: false }));
      const tendrils = [...svg.querySelectorAll('.md-tendril')].map((e) => ({ e, t: +e.dataset.t }));
      const buds = [...svg.querySelectorAll('.md-bud')].map((e) => ({ e, t: +e.dataset.t + 0.09, on: false }));
      const flip = (o, on) => { if (on !== o.on) { o.on = on; o.e.classList.toggle('is-on', on); } };
      const paint = (pr) => {
        main.style.strokeDashoffset = String(1.0001 - pr);
        leaves.forEach((o) => flip(o, pr >= o.t));
        tendrils.forEach((o) => { o.e.style.strokeDashoffset = String(1 - Math.min(1, Math.max(0, (pr - o.t) / 0.09))); });
        buds.forEach((o) => flip(o, pr >= o.t));
      };
      if (ctx.reduced) { paint(1); return; }
      paint(0);
      triggers.push(ST.create({
        trigger: sec, start: 'top 82%', end: last ? 'bottom bottom' : 'bottom 82%', scrub: 0.6,
        onUpdate: (st) => paint(st.progress), onRefresh: (st) => paint(st.progress),
      }));
    });
  };
  build();
  let w = innerWidth; let hgt = story.offsetHeight; let tm = 0;
  const again = () => { clearTimeout(tm); tm = setTimeout(() => { build(); ST.refresh(); }, 200); };
  addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; again(); } });
  new ResizeObserver(() => { const nh = story.offsetHeight; if (Math.abs(nh - hgt) > 4) { hgt = nh; again(); } }).observe(story);
}

/** the countdown rings: each unit's circle shows how much of it is left */
function rings(ctx) {
  const target = new Date(ctx.mainEv?.start || ctx.config.weddingDate).getTime();
  const els = [...document.querySelectorAll('.md-cd__ring')];
  const tick = () => {
    const s0 = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const f = { d: Math.min(1, Math.floor(s0 / 86400) / 365), h: Math.floor((s0 % 86400) / 3600) / 24, m: Math.floor((s0 % 3600) / 60) / 60, s: (s0 % 60) / 60 };
    els.forEach((el) => el.style.setProperty('--off', String(r2(1 - f[el.dataset.ru]))));
    return s0 > 0;
  };
  if (tick()) setInterval(tick, 1000);
}

// ───────── the page ─────────
const POL_TILT = [-3, 2.5, -1.5, 3, -2.5, 1.8, -2, 2.8, -1.2];

function page(ctx) {
  const { bi, esc, txt, on, AD, BS, c, config, placeLine, mainEv } = ctx;
  const P = ctx.parts;
  const hd = (id, t, kicker) => `<header class="md-h">${kicker && on(kicker) ? `<p class="md-kicker">${bi(kicker)}</p>` : ''}<h2 class="md-h2" id="${id}">${bi(t)}</h2></header>`;
  const bsDeva = BS.day && BS.month ? `${BS.month} ${BS.day} गते, ${BS.year}` : BS.full.ne;
  const timeNe = mainEv ? String(ctx.timeLabel(mainEv).ne || '').split('–')[0].trim() : '';

  const couple = P.lead ? `
  <section class="md-sec md-couple" id="couple" aria-labelledby="couple-title">
    <div class="md-sec__in">
      ${on(txt('couple.line')) ? `<div class="md-blk md-quote" data-side="l"><p>${bi(txt('couple.line'))}</p>${dhaka('md-div')}</div>` : ''}
      <div class="md-blk" data-side="r" data-bud>
        ${hd('couple-title', txt('couple.title'))}
        <figure class="md-arch">${LOTUS}<div class="md-arch__pic">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 719px) 78vw, 420px')}</div></figure>
      </div>
    </div>
  </section>` : '';

  const face = `<div class="md-palm">${HAND}<div class="md-palm__date">
      <span class="md-pd__wd">${bi(AD.wd)}</span>
      <span class="md-pd__day">${bi({ en: AD.day, ne: BS.day || ctx.neNum(AD.day) })}</span>
      <span class="md-pd__my">${bi({ en: AD.monthYear.en, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</span>
      <span class="md-pd__alt"><span class="l-en" lang="ne">${esc(bsDeva)}</span><span class="l-ne" lang="ne">${esc(AD.full.ne)}</span></span>
      ${mainEv ? `<span class="md-pd__time">${bi({ en: AD.time, ne: timeNe })}</span>` : ''}
    </div></div>`;
  const dateSec = `
  <section class="md-sec md-dates" id="date" aria-labelledby="date-title">
    <div class="md-sec__in">
      <div class="md-blk md-palmblk" data-side="l" data-bud>
        ${hd('date-title', txt('date.title'), txt('date.kicker'))}
        ${P.scratch(face, 'md-scratch')}
        ${placeLine?.en || placeLine?.ne ? `<p class="md-place2">${bi(placeLine)}</p>` : ''}
      </div>
      <div class="md-blk md-count su-rise" id="count" data-side="r" data-bud data-countdown>
        <header class="md-h"><h3 class="md-h3">${bi(txt('count.title'))}</h3></header>
        <ol class="md-cd__grid su-count__grid" aria-label="${esc(txt('count.title').en)}">
          ${P.countUnits.map(({ u, label }) => `<li class="md-cd">
            <svg class="md-cd__svg" viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
              ${dots(24, 46.5, 0.9)}<circle class="md-cd__track" r="40"/><circle class="md-cd__ring" data-ru="${u}" r="40" pathLength="1" transform="rotate(-90)"/><circle class="md-cd__in" r="34"/>
            </svg>
            <span class="md-cd__n">${P.countNum(u)}</span><span class="md-cd__l">${bi(label)}</span></li>`).join('')}
        </ol>
        <p class="md-count__done" data-count-done hidden></p>
      </div>
    </div>
  </section>`;

  const fam = (f) => `<p class="md-kicker">${bi(f.label)}</p>
    ${P.brideGroom ? `<figure class="md-fam__pic">${ctx.imgTag(f.photo, f.person.name.en, '150px')}</figure>` : ''}
    <p class="md-fam__name">${bi(f.person.fullName)}</p>
    ${f.person.parents?.en || f.person.parents?.ne ? `<p class="md-fam__of">${bi(f.of)}</p><p class="md-fam__parents">${bi(f.person.parents)}</p>` : ''}
    ${f.person.home?.en || f.person.home?.ne ? `<p class="md-fam__home">${bi(f.person.home)}</p>` : ''}`;
  const famSec = `
  <section class="md-sec md-fams" id="families" aria-labelledby="fam-title">
    <div class="md-sec__in">
      <div class="md-blk" data-side="l" data-bud>${hd('fam-title', txt('families.title'))}</div>
      <div class="md-blk md-fam" data-side="c">
        <div class="md-fam__side md-fam__side--a">${fam(P.families[0])}</div>
        <div class="md-fam__m" aria-hidden="true"><div class="md-fam__half md-fam__half--a">${mandala('md-fm')}</div><div class="md-fam__half md-fam__half--b">${mandala('md-fm')}</div></div>
        <div class="md-fam__side md-fam__side--b">${fam(P.families[1])}</div>
      </div>
    </div>
  </section>`;


  const evs = P.events.map((v, k) => `
      <article class="md-blk md-ev" data-side="${k % 2 ? 'l' : 'r'}" data-bud id="ev-${esc(v.id)}">
        ${corner('tl')}${corner('br')}
        <div class="md-ev__top md-h">
          <p class="md-ev__date" aria-hidden="true"><b>${bi({ en: v.ad.day, ne: v.bs.day || ctx.neNum(v.ad.day) })}</b><span>${bi({ en: v.ad.month.en.slice(0, 3), ne: v.bs.month || v.ad.month.ne })}</span></p>
          <h3 class="md-ev__title">${bi(v.title)}</h3>
        </div>
        <p class="md-ev__when">${bi({ en: v.ad.full.en, ne: v.bs.full.ne })}</p>
        <p class="md-ev__time">${bi(v.time)}</p>
        ${v.blurb ? `<p class="md-ev__blurb">${bi(v.blurb)}</p>` : ''}
        <p class="md-ev__venue">${bi(v.venue)} <a class="su-link" href="${esc(v.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
        ${v.dress.colors.length || v.dress.text?.en || v.dress.text?.ne ? `<p class="md-ev__dress">${v.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${v.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(v.dress.text?.en || v.dress.text?.ne ? v.dress.text : P.UI.wear)}</span></p>` : ''}
        ${v.rituals.length ? `<details class="md-order"><summary>${bi(P.UI.order)}</summary><ol>${v.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
      </article>`).join('');
  const progSec = `
  <section class="md-sec md-prog" id="programme" aria-labelledby="prog-title">
    <div class="md-sec__in">
      <div class="md-blk" data-side="l" data-bud>${hd('prog-title', txt('prog.title'), txt('prog.kicker'))}</div>
      ${evs}
      <div class="md-blk md-prog__foot" data-side="${P.events.length % 2 ? 'l' : 'r'}">
        <div class="md-btns">${P.calendarBtn()}${P.shareBtn()}</div>
        ${P.moreInfo()}
      </div>
    </div>
  </section>`;

  const photoSec = P.photos.length ? `
  <section class="md-sec md-photos" id="photos" aria-labelledby="gal-title">
    <div class="md-sec__in">
      <div class="md-blk" data-side="r" data-bud>${hd('gal-title', txt('gallery.title'))}</div>
      <div class="md-blk md-cloth" data-side="c">
        ${dhaka('md-cloth__edge')}
        <div class="md-pols">${P.photos.map((g, i) => `<figure class="md-pol" style="--r:${POL_TILT[i % POL_TILT.length]}deg">${P.photoBtn(g, i, '(max-width: 719px) 42vw, 300px', 'md-pol__btn')}</figure>`).join('')}</div>
        ${dhaka('md-cloth__edge')}
      </div>
    </div>
  </section>` : '';

  const rsvpSec = `
  <section class="md-sec md-reply" id="rsvp" aria-labelledby="rsvp-title">
    <div class="md-sec__in">
      <div class="md-blk md-word" id="card" data-side="l" data-bud>
        <div class="md-h">${mandala('md-crest', false, [0, 1, 2, 3, 4])}</div>
        <p class="md-word__line">${bi(txt('card.line'))}</p>
        <p class="md-word__hosts">${bi(config.hosts)}</p>
        ${P.cardBtn()}
      </div>
      <div class="md-blk md-rsvp" data-side="r" data-bud>
        ${corner('tl')}${corner('tr')}${corner('bl')}${corner('br')}
        ${hd('rsvp-title', txt('rsvp.title'))}
        ${P.deadline?.en || P.deadline?.ne ? `<p class="md-rsvp__by">${bi(P.deadline)}</p>` : ''}
        ${P.rsvpForm()}
      </div>
    </div>
  </section>`;

  const closing = `
  <footer class="md-sec md-close" aria-label="Blessing">
    <div class="md-sec__in">
      <div class="md-blk md-close__in" data-side="c">
        <div class="md-close__flower" data-vine-end>${FLOWER}</div>
        <p class="md-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
        <p class="md-close__en l-en">${esc(config.closing?.en || '')}</p>
        <p class="md-close__names"><span>${bi(c.bride.name)}</span><span class="md-close__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span><span>${bi(c.groom.name)}</span></p>
        ${c.hashtag ? `<p class="md-close__tag">${esc(c.hashtag)}</p>` : ''}
      </div>
    </div>
    ${P.madeWith()}
  </footer>`;

  return `
  <section class="su-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${heroHtml(ctx)}
    ${P.cue(P.lead ? 'couple' : 'date')}
  </section>
  <div class="md-story">${couple}${dateSec}${famSec}${progSec}${photoSec}${rsvpSec}${closing}</div>`;
}

/** the scroll: the vine draws, the hands tilt, the families' mandala closes, the polaroids lift */
function scroll(ctx) {
  vine(ctx);
  if (ctx.reduced) return;
  const { gsap } = ctx;
  heroScroll(document.getElementById('top')); // another theme's first screen (docs/MIX.md) has no hands: skipped

  document.querySelectorAll('.md-story .md-blk:not(.md-fam):not(.md-cloth):not(.su-rise)').forEach((el) => {
    const side = el.dataset.side;
    gsap.from(el, { x: side === 'l' ? -32 : side === 'r' ? 32 : 0, y: 26, opacity: 0, duration: 0.9, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  const mm = gsap.matchMedia();
  const fam = (axis, d) => {
    const prop = axis === 'x' ? 'xPercent' : 'yPercent';
    const t = { trigger: '.md-fam', start: 'top 85%', end: 'center 55%', scrub: 0.6 };
    gsap.fromTo('.md-fam__half--a', { [prop]: -d }, { [prop]: 0, ease: 'none', scrollTrigger: t });
    gsap.fromTo('.md-fam__half--b', { [prop]: d }, { [prop]: 0, ease: 'none', scrollTrigger: t });
    gsap.fromTo('.md-fam__side--a', { [axis]: axis === 'x' ? -50 : -24, opacity: 0.15 }, { [axis]: 0, opacity: 1, ease: 'none', scrollTrigger: t });
    gsap.fromTo('.md-fam__side--b', { [axis]: axis === 'x' ? 50 : 24, opacity: 0.15 }, { [axis]: 0, opacity: 1, ease: 'none', scrollTrigger: t });
  };
  mm.add('(min-width: 720px)', () => fam('x', 26));
  mm.add('(max-width: 719px)', () => fam('y', 22));

  document.querySelectorAll('.md-pol').forEach((el, i) => {
    const r = POL_TILT[i % POL_TILT.length];
    gsap.fromTo(el, { rotationX: 32, rotation: r * 3, y: 70, scale: 0.92, opacity: 0, transformPerspective: 800, transformOrigin: '50% 100%' },
      { rotationX: 0, rotation: r, y: 0, scale: 1, opacity: 1, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 100%', end: 'top 62%', scrub: 0.5 } });
  });
}

mountSuite({
  slug: 'mehendi',
  manifest,
  gate: gateScene,
  hero: heroHtml,
  page,
  open,
  scroll,
  scratch: { paint: hennaPalm },
  ready: rings,
  gateTap(ctx, go) {
    document.querySelector('.md-gate__m')?.addEventListener('click', go);
  },
  ambient(ctx) {
    heroAmbient(document.getElementById('top'), ctx.reduced);
  },
});
