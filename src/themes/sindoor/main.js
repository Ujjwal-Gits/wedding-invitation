// Theme · Sindoor (सिन्दूर) — the sindoor daan, set as an editorial wedding issue.
// Warm white paper, deep black type and one colour: sindoor red. The opening IS the cover: Ganesh at the top, the
// closed sindoor dani (the red-and-gold enamelled box) waiting below. Tap: the lid lifts and tilts away, a plume of
// sindoor rises out of the box and blooms across the screen, and as the powder clears the couple's names have
// settled into the masthead in red (the one signature motion; transform and opacity only).
// Below, "the siundo": one fine red line (the parting a groom fills with sindoor) falls from the box and threads
// through the whole story as you scroll, turning at each section's rule like a pen, dipping behind the bride's
// veil to become the parting in the sindoor-daan painting, and ending in a red bindu over a lit diyo.
// Engine: src/themes/_suite/suite.js (T.page, T.scroll, T.scratch, T.ready).
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import { lamp, sindoorDaan, initNepali } from '../_suite/nepali.js';
import './sindoor.css';
import { ART, r2, mask, heroHtml, fitAll, placeUi, heroClosed, heroEnter, heroScroll, LID_UP } from './parts.js';

const L = {
  couple: { en: 'The couple', ne: 'जोडी' },
  bond: { en: 'Sindoor daan', ne: 'सिन्दूर दान' },
  count: { en: 'The countdown', ne: 'उल्टो गन्ती' },
  families: { en: 'The families', ne: 'परिवार' },
  photos: { en: 'The album', ne: 'एल्बम' },
  reply: { en: 'Your reply', ne: 'हजुरको जवाफ' },
  and: { en: 'and', ne: 'र' },
  fig: { en: 'Fig.', ne: 'चित्र' },
};
/** a section's opening rule: the thread turns here; the number and label hang under it */
const head = (n, label, x, xm) => `<header class="sd-hd">
    <i class="sd-k" data-x="${x}" data-xm="${xm}" aria-hidden="true"></i>
    <span class="sd-hd__no">${String(n).padStart(2, '0')}</span><span class="sd-hd__label">${label}</span>
  </header>`;

// ───────── the cover (hero), and the gate: the cover itself, before the box is opened ─────────
const hero = (ctx) => heroHtml(ctx);
// The scene is only a transparent hit area: the cover's own box opens, so the opening and the hero are one picture.
const gate = () => '<div class="sd-gate"></div>';

/** keep the gate's words where the names will appear */
function placeGateUi() {
  if (document.body.classList.contains('is-open')) return;
  placeUi(document.querySelector('.su-hero'), document.getElementById('gui'));
}

/** the lid lifts and tilts away; a plume of sindoor rises and blooms across the screen; the names settle in red */
function open(ctx, tl) {
  return heroEnter(tl, 0.15, document);
}

/** after another theme's gate: the box opens as it clears (the words follow, from the engine) */
function heroIntro(ctx, tl, t) {
  if (!ctx.reduced && document.querySelector('.su-hero .sd-cover')) heroEnter(tl, t, document);
}

// ───────── the scratch cover: sindoor powder ─────────
const POWDER = new Image();
POWDER.decoding = 'async';
POWDER.onload = () => document.dispatchEvent(new Event('su-scratch-redraw'));
POWDER.src = `${ART}burst-sm.webp`;

function powder(c, w, h, dpr, hint) {
  const css = getComputedStyle(document.body);
  const red = css.getPropertyValue('--sd-red').trim() || '#C8141D';
  const ink = css.getPropertyValue('--sd-ink').trim() || '#141212';
  c.fillStyle = red; c.fillRect(0, 0, w, h);
  // the powder lies unevenly: soft darker hollows and lighter drifts
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * w; const y = Math.random() * h; const r = (0.12 + Math.random() * 0.3) * Math.max(w, h);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const dark = i % 3 !== 0;
    g.addColorStop(0, dark ? 'rgba(70,0,6,0.16)' : 'rgba(255,120,96,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
  if (POWDER.complete && POWDER.naturalWidth) {
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha = 0.55;
    for (const [x, y, s, a] of [[0.15, 0.95, 0.9, 0.3], [0.85, 1.05, 1.1, -0.4], [0.55, 0.4, 0.8, 3.1]]) {
      c.save(); c.translate(x * w, y * h); c.rotate(a); const sw = s * w; c.drawImage(POWDER, -sw / 2, -sw, sw, sw * 1.025); c.restore();
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  for (let i = 0; i < (w * h) / 420; i++) { // grain
    c.fillStyle = Math.random() > 0.55 ? 'rgba(255,190,170,0.22)' : 'rgba(40,0,4,0.2)';
    const s = dpr * (Math.random() > 0.9 ? 2 : 1);
    c.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
  // the hint on a white paper label (never text straight on the powder)
  let fs = Math.round(Math.min(w / 20, 13 * dpr));
  const font = (n) => `600 ${n}px Mukta, sans-serif`;
  const label = /[ऀ-ॿ]/.test(hint) ? hint : hint.toUpperCase();
  c.font = font(fs);
  if ('letterSpacing' in c) c.letterSpacing = /[ऀ-ॿ]/.test(hint) ? '0px' : `${Math.round(fs * 0.16)}px`;
  let tw = c.measureText(label).width;
  if (tw > w * 0.8) { fs = Math.floor((fs * w * 0.8) / tw); c.font = font(fs); tw = c.measureText(label).width; }
  const bw = tw + fs * 2.6; const bh = fs * 3;
  c.fillStyle = '#FFFFFF'; c.fillRect((w - bw) / 2, (h - bh) / 2, bw, bh);
  c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(label, w / 2 + (('letterSpacing' in c) ? fs * 0.08 : 0), h / 2 + fs * 0.08);
  if ('letterSpacing' in c) c.letterSpacing = '0px';
}

// ───────── the page ─────────
function page(ctx) {
  const { bi, esc, txt, on, AD, BS, c, config, placeLine, mainEv } = ctx;
  const P = ctx.parts;
  let n = 0;
  const no = () => { n += 1; return n; };
  const bsShort = BS.day && BS.month ? `${BS.month} ${BS.day} गते, ${BS.year}` : BS.full.ne;
  const timeNe = mainEv ? String(ctx.timeLabel(mainEv).ne || '').split('–')[0].trim() : '';

  const couple = P.lead ? `
  <section class="su-sec sd-sec sd-couple" id="couple" data-lane="l" aria-labelledby="couple-title">
    <div class="sd-wrap">
      ${head(no(), bi(L.couple), '.5', 'l')}
      <div class="sd-couple__text">
        <h2 class="sd-h" id="couple-title">${mask(bi(txt('couple.title')))}</h2>
        ${on(txt('couple.line')) ? `<p class="sd-pull sd-r">${bi(txt('couple.line'))}</p>` : ''}
      </div>
      <figure class="sd-ph sd-ph--tall sd-couple__pic sd-r">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 859px) 80vw, 460px')}</figure>
    </div>
  </section>` : '';

  const bond = on(txt('bond.title')) ? `
  <section class="su-sec sd-sec sd-bond" id="bond" data-lane="l" aria-labelledby="bond-title">
    <div class="sd-wrap">
      ${head(no(), bi(L.bond), '@.sd-bond__pic:.435', 'l')}
      <i class="sd-k" data-x="@.sd-bond__pic:.435" data-xm="@.sd-bond__pic:.435" aria-hidden="true"></i>
      <figure class="sd-bond__pic">${sindoorDaan('sd-bond__img', '(max-width: 859px) 86vw, 640px', 'The groom fills the parting of the bride’s hair with sindoor')}</figure>
      <i class="sd-k sd-bond__k" data-x="@.sd-bond__pic:.435" data-xm="l" aria-hidden="true"></i>
      <div class="sd-bond__text">
        <h2 class="sd-h sd-h--m" id="bond-title">${mask(bi(txt('bond.title')))}</h2>
        ${on(txt('bond.line')) ? `<p class="sd-body sd-r">${bi(txt('bond.line'))}</p>` : ''}
      </div>
    </div>
  </section>` : '';

  const face = `<div class="sd-dface">
      <p class="sd-dface__wd">${bi(AD.wd)}</p>
      <p class="sd-dface__day">${bi({ en: AD.day, ne: BS.day || ctx.neNum(AD.day) })}</p>
      <p class="sd-dface__my">${bi({ en: AD.monthYear.en, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</p>
      <p class="sd-dface__alt"><span class="l-en" lang="ne">${esc(bsShort)}</span><span class="l-ne">${esc(AD.full.ne)}</span></p>
      ${mainEv ? `<p class="sd-dface__time">${bi({ en: AD.time, ne: timeNe })}</p>` : ''}
    </div>`;
  const date = `
  <section class="su-sec sd-sec sd-date" id="date" data-lane="r" aria-labelledby="date-title">
    <div class="sd-wrap">
      ${head(no(), bi(txt('date.kicker')), '1.035', 'r')}
      <div class="sd-date__text">
        <h2 class="sd-h sd-h--m" id="date-title">${mask(bi(txt('date.title')))}</h2>
        ${placeLine?.en || placeLine?.ne ? `<p class="sd-date__place sd-r">${bi(placeLine)}</p>` : ''}
      </div>
      <div class="sd-date__card">${P.scratch(face, 'sd-scratch')}</div>
    </div>
  </section>`;

  const count = `
  <section class="su-sec sd-sec sd-count" id="count" data-lane="l" aria-labelledby="count-title">
    <div class="sd-wrap" data-countdown>
      ${head(no(), bi(L.count), '-.035', 'l')}
      <h2 class="sd-h sd-h--s" id="count-title">${mask(bi(txt('count.title')))}</h2>
      <ol class="su-count__grid sd-cd" aria-label="${esc(txt('count.title').en)}">
        ${P.countUnits.map(({ u, label }) => `<li class="sd-cd__cell sd-cd__cell--${u}">${P.countNum(u, 'sd-cd__n')}<span class="sd-cd__l">${bi(label)}</span></li>`).join('')}
      </ol>
      <p class="sd-cd__done" data-count-done hidden></p>
    </div>
  </section>`;

  const fam = (f) => `<div class="sd-fam__side sd-r">
      ${P.brideGroom ? `<figure class="sd-ph sd-ph--tall sd-fam__pic">${ctx.imgTag(f.photo, f.person.name.en, '(max-width: 859px) 60vw, 300px')}</figure>` : ''}
      <p class="sd-kick">${bi(f.label)}</p>
      <p class="sd-fam__name">${bi(f.person.fullName)}</p>
      ${f.person.parents?.en || f.person.parents?.ne ? `<p class="sd-fam__of">${bi(f.of)}</p><p class="sd-fam__parents">${bi(f.person.parents)}</p>` : ''}
      ${f.person.home?.en || f.person.home?.ne ? `<p class="sd-fam__home">${bi(f.person.home)}</p>` : ''}
    </div>`;
  const families = `
  <section class="su-sec sd-sec sd-fams" id="families" data-lane="r" aria-labelledby="fam-title">
    <div class="sd-wrap">
      ${head(no(), bi(L.families), '.5', 'r')}
      <h2 class="sd-h sd-h--m" id="fam-title">${mask(bi(txt('families.title')))}</h2>
      <div class="sd-fam">${fam(P.families[0])}${fam(P.families[1])}</div>
    </div>
  </section>`;

  const evs = P.events.map((v, k) => {
    const hasDress = v.dress.colors.length || v.dress.text?.en || v.dress.text?.ne;
    return `<li class="sd-ev sd-r" id="ev-${esc(v.id)}">
      <span class="sd-ev__no" aria-hidden="true">${String(k + 1).padStart(2, '0')}</span>
      <div class="sd-ev__head">
        <h3 class="sd-ev__title">${bi(v.title)}</h3>
        ${v.blurb ? `<p class="sd-ev__blurb">${bi(v.blurb)}</p>` : ''}
      </div>
      <div class="sd-ev__info">
        <p class="sd-ev__when">${bi({ en: v.ad.full.en, ne: v.bs.full.ne })}</p>
        <p class="sd-ev__alt"><span class="l-en" lang="ne">${esc(v.bs.full.ne)}</span><span class="l-ne">${esc(v.ad.full.ne)}</span></p>
        <p class="sd-ev__time">${bi(v.time)}</p>
        <p class="sd-ev__venue">${bi(v.venue)} <a class="su-link" href="${esc(v.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
        ${hasDress ? `<p class="sd-ev__dress">${v.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${v.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(v.dress.text?.en || v.dress.text?.ne ? v.dress.text : P.UI.wear)}</span></p>` : ''}
        ${v.rituals.length ? `<details class="sd-order"><summary>${bi(P.UI.order)}</summary><ol>${v.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
      </div>
    </li>`;
  }).join('');
  const prog = `
  <section class="su-sec sd-sec sd-prog" id="programme" data-lane="l" aria-labelledby="prog-title">
    <div class="sd-wrap">
      ${head(no(), bi(txt('prog.kicker')), '-.035', 'l')}
      <h2 class="sd-h" id="prog-title">${mask(bi(txt('prog.title')))}</h2>
      <ol class="sd-evs">${evs}</ol>
      <div class="sd-prog__foot sd-r">${P.calendarBtn()}${P.shareBtn()}</div>
      ${P.moreInfo()}
    </div>
  </section>`;

  const cols = [[], []];
  P.photos.forEach((g, i) => cols[i % 2].push(`<figure class="sd-ph sd-gal__ph sd-r">${P.photoBtn(g, i, '(max-width: 859px) 44vw, 520px', 'sd-gal__btn')}<figcaption>${bi(L.fig)} ${String(i + 1).padStart(2, '0')}</figcaption></figure>`));
  const photos = P.photos.length ? `
  <section class="su-sec sd-sec sd-photos" id="photos" data-lane="r" aria-labelledby="gal-title">
    <div class="sd-wrap">
      ${head(no(), bi(L.photos), '.5', 'r')}
      <h2 class="sd-h" id="gal-title">${mask(bi(txt('gallery.title')))}</h2>
      <div class="sd-gal">${cols.map((col, i) => `<div class="sd-gal__col sd-gal__col--${i ? 'b' : 'a'}">${col.join('')}</div>`).join('')}</div>
    </div>
  </section>` : '';

  const reply = `
  <section class="su-sec sd-sec sd-reply" id="rsvp" data-lane="l" aria-labelledby="rsvp-title">
    <div class="sd-wrap">
      ${head(no(), bi(L.reply), '@.sd-rsvp:0:-60', 'l')}
      <div class="sd-word sd-r" id="card">
        <span class="sd-word__q" aria-hidden="true">“</span>
        <p class="sd-word__line">${bi(txt('card.line'))}</p>
        <p class="sd-word__hosts">${bi(config.hosts)}</p>
        ${P.cardBtn('su-btn--line')}
      </div>
      <div class="sd-rsvp">
        <h2 class="sd-h sd-h--m" id="rsvp-title">${mask(bi(txt('rsvp.title')))}</h2>
        ${P.deadline?.en || P.deadline?.ne ? `<p class="sd-rsvp__by">${bi(P.deadline)}</p>` : ''}
        ${P.rsvpForm()}
      </div>
    </div>
  </section>`;

  const closing = `
  <footer class="su-close sd-close" aria-label="Blessing">
    <div class="sd-wrap">
      <i class="sd-k" data-x=".5" data-xm=".5" aria-hidden="true"></i>
      <div class="sd-close__drop" aria-hidden="true"></div>
      <i class="sd-k sd-k--end" data-x=".5" data-xm=".5" aria-hidden="true"></i>
      <i class="sd-bindu" aria-hidden="true"></i>
      ${lamp('diyo', { cls: 'sd-diyo', sizes: '96px' })}
      <p class="su-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
      <p class="su-close__en l-en">${esc(config.closing?.en || '')}</p>
      <p class="sd-close__names"><span>${bi(c.bride.name)}</span> <span class="sd-close__and">${bi(L.and)}</span><span class="sr-only">and</span> <span>${bi(c.groom.name)}</span></p>
      ${c.hashtag ? `<p class="su-close__tag">${esc(c.hashtag)}</p>` : ''}
    </div>
    ${P.madeWith()}
  </footer>`;

  return `
  <div class="sd-story">
    <div class="sd-thread" aria-hidden="true"><i class="sd-tip"></i></div>
    <section class="su-hero sd-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
      ${hero(ctx)}
      ${P.cue(P.lead ? 'couple' : 'date')}
    </section>
    ${couple}${bond}${date}${count}${families}${prog}${photos}${reply}${closing}
  </div>`;
}

// ───────── the siundo: one red line through the whole story, drawn by the scroll ─────────
function thread(ctx) {
  const story = document.querySelector('.sd-story');
  const layer = story.querySelector('.sd-thread');
  const tip = layer.querySelector('.sd-tip');
  const mq = matchMedia('(max-width: 859px)');
  let segs = []; let boost = 0;
  /** layout position inside the story, ignoring transforms (blocks may still be mid-reveal) */
  const box = (el) => { let x = 0; let y = 0; let k = el; while (k && k !== story) { x += k.offsetLeft; y += k.offsetTop; k = k.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };
  const xOf = (spec, k, W, phone) => {
    const rail = phone ? 22 : 34;
    if (spec === 'l') return rail;
    if (spec === 'r') return W - rail;
    if (spec.startsWith('@')) {
      const [sel, f, px = 0] = spec.slice(1).split(':');
      const a = k.closest('.sd-sec, .sd-close')?.querySelector(sel);
      if (a) { const b = box(a); return b.x + b.w * Number(f) + Number(px); }
    }
    const b = box(k);
    return b.x + b.w * Number(spec);
  };
  const build = () => {
    layer.querySelectorAll('.sd-seg').forEach((s) => s.remove());
    segs = [];
    const phone = mq.matches;
    const W = story.clientWidth;
    const pts = [...story.querySelectorAll('.sd-k')].map((k) => ({ x: Math.round(xOf((phone ? k.dataset.xm : k.dataset.x) || '.5', k, W, phone)), y: Math.round(box(k).y) }));
    let cur = pts[0];
    const add = (x0, y0, x1, y1) => {
      const v = x0 === x1; const len = v ? y1 - y0 : Math.abs(x1 - x0);
      if (len < 1) return;
      const el = document.createElement('i');
      el.className = `sd-seg sd-seg--${v ? 'v' : 'h'}`;
      if (v) Object.assign(el.style, { left: `${x0}px`, top: `${y0}px`, height: `${len}px` });
      else Object.assign(el.style, { left: `${Math.min(x0, x1)}px`, top: `${y0}px`, width: `${len}px`, transformOrigin: x1 > x0 ? '0 50%' : '100% 50%' });
      layer.append(el);
      // a vertical run draws as the tip passes down it; a turn draws over the next stretch of scroll
      segs.push({ el, v, x0, y0, x1, y1, len, a: y0, b: v ? y1 : y0 + Math.min(150, Math.max(60, len * 0.4)), f: -1 });
    };
    for (const p of pts.slice(1)) {
      if (p.y > cur.y) add(cur.x, cur.y, cur.x, p.y);
      if (p.x !== cur.x) add(cur.x, Math.max(cur.y, p.y), p.x, Math.max(cur.y, p.y));
      cur = { x: p.x, y: Math.max(cur.y, p.y) };
    }
    paint();
  };
  const paint = () => {
    const top = story.getBoundingClientRect().top;
    const at = ctx.reduced ? 1e9 : Math.max(innerHeight * 0.62 - top, boost);
    let tx = null; let ty = null;
    for (const s of segs) {
      let f = (at - s.a) / (s.b - s.a);
      f = f <= 0 ? 0 : f >= 1 ? 1 : f;
      if (Math.abs(f - s.f) > 0.0005) { s.f = f; s.el.style.transform = s.v ? `scaleY(${f})` : `scaleX(${f})`; }
      if (f > 0 && f < 1) { tx = s.v ? s.x0 : s.x0 + (s.x1 - s.x0) * f; ty = s.v ? s.y0 + (s.y1 - s.y0) * f : s.y0; }
    }
    if (tx === null) tip.style.opacity = '0';
    else { tip.style.opacity = '1'; tip.style.transform = `translate(${r2(tx)}px, ${r2(ty)}px)`; }
  };
  build();
  const k = story.querySelector('.sd-k--start'); // absent when another theme's first screen stands in for the cover
  if (!ctx.reduced && k) {
    // the line falls from the box to the foot of the cover as the powder settles
    const from = box(k).y;
    const o = { v: from };
    ctx.gsap.to(o, { v: document.getElementById('top').offsetHeight + 4, duration: 1.1, ease: 'power2.inOut', delay: 0.1, onUpdate: () => { boost = o.v; paint(); } });
  }
  ctx.ScrollTrigger.create({ trigger: story, start: 'top bottom', end: 'bottom top', onUpdate: paint, onRefresh: paint });
  let w = innerWidth; let hgt = story.offsetHeight; let tm = 0;
  const again = () => { clearTimeout(tm); tm = setTimeout(() => { build(); ctx.ScrollTrigger.refresh(); }, 180); };
  addEventListener('resize', () => { if (innerWidth !== w) { w = innerWidth; again(); } });
  new ResizeObserver(() => { const nh = story.offsetHeight; if (Math.abs(nh - hgt) > 4) { hgt = nh; again(); } }).observe(story);
  document.addEventListener('langchange', () => { fitAll(); again(); });
}

/** headings rise out of their masks, photos are uncovered, rows slide in: once, as each arrives */
function reveals(ctx) {
  const els = document.querySelectorAll('.sd-story .sd-m:not(.sd-cover .sd-m), .sd-r');
  if (ctx.reduced) { els.forEach((el) => el.classList.add('is-in')); return; }
  document.querySelector('.sd-story').classList.add('sd-anim');
  const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
}

/** the scroll: the thread, the reveals, the lid drifting off the cover, the painting rising, the numbers sliding */
function scroll(ctx) {
  thread(ctx);
  reveals(ctx);
  initNepali();
  if (ctx.reduced) return;
  const { gsap } = ctx;
  const own = document.querySelector('.su-hero .sd-cover'); // another theme's first screen may stand in for the cover
  if (own) heroScroll(gsap, document, '#top');
  // the sindoor-daan painting comes up out of the page in 3D as the thread reaches it
  if (document.querySelector('.sd-bond__img')) {
    gsap.fromTo('.sd-bond__img', { rotationX: 16, y: 60, scale: 0.94, transformPerspective: 1000, transformOrigin: '50% 100%' },
      { rotationX: 0, y: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.sd-bond__pic', start: 'top 95%', end: 'top 45%', scrub: 0.6 } });
  }
  // the countdown's big numerals slide along their rule
  gsap.utils.toArray('.sd-cd__cell').forEach((el, i) => {
    gsap.fromTo(el, { x: () => (i % 2 ? 1 : -1) * Math.min(80, innerWidth * 0.08) }, { x: 0, ease: 'none', scrollTrigger: { trigger: '.sd-cd', start: 'top 100%', end: 'top 45%', scrub: 0.6, invalidateOnRefresh: true } });
  });
  // desktop only: the album's second column drifts against the first; the couple's photo moves inside its frame
  gsap.matchMedia().add('(min-width: 860px)', () => {
    if (document.querySelector('.sd-gal__col--b')) gsap.fromTo('.sd-gal__col--b', { y: 90 }, { y: -40, ease: 'none', scrollTrigger: { trigger: '.sd-gal', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    const pic = document.querySelector('.sd-couple__pic img');
    if (pic) gsap.fromTo(pic, { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.sd-couple__pic', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  });
}

mountSuite({
  slug: 'sindoor',
  manifest,
  gate,
  hero,
  page,
  open,
  heroIntro,
  scroll,
  scratch: { paint: powder },
  ready(ctx) {
    const { gsap } = ctx;
    fitAll();
    document.fonts?.ready.then(() => { fitAll(); placeGateUi(); });
    addEventListener('resize', () => { fitAll(); placeGateUi(); });
    placeGateUi();
    // the cover waits closed (with reduced motion it simply shows the open box)
    if (!document.querySelector('.su-hero .sd-cover')) return; // another theme's first screen stands in for the cover
    if (ctx.reduced) { gsap.set('.sd-cover .sd-lid', LID_UP); document.body.classList.add('sd-calm'); return; }
    heroClosed(gsap, document);
  },
  gateTap(ctx, go) {
    document.getElementById('gscene')?.addEventListener('click', go);
  },
  ambient(ctx) {
    // the lid hovers while the cover is on screen (a CSS loop on its inner layer, off when out of view)
    const f = document.querySelector('.sd-cover .sd-lid__f');
    if (ctx.reduced || !f) return;
    new IntersectionObserver(([e]) => f.classList.toggle('is-floating', e.isIntersecting)).observe(document.getElementById('top'));
  },
});
