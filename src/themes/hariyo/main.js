// Theme · Hariyo (हरियो) — a sage-green watercolour garden.
// The opening is a garden: watercolour greenery grows in from every corner and edge around an ivory arch that holds
// Shri Ganesh, शुभ विवाह and the couple's names. Tap, and the leaves part outward at their own speeds (the near
// sprigs fastest), the paper clears and a white garden pavilion with the couple and two peacocks rises into place.
// Everything after that stays quiet: one leaf drifting now and then, the pavilion breathing.
import { gsap } from 'gsap';
import { mountSuite } from '../_suite/suite.js';
import './hariyo.css';
import manifest from './slots.js';

const ART = '/themes/hariyo/art/';
const mobile = () => window.matchMedia('(max-width: 760px)').matches;
const green = () => `${ART}greenery${mobile() ? '-sm' : ''}.webp`;
const img = (src, cls = '', extra = '') => `<img class="${cls}" src="${src}" alt="" decoding="async" ${extra} />`;

/** A fine Dhaka-weave line: hairlines either side of a small row of diamonds. */
const dhaka = (cls = '') => `<svg class="hy-dhaka ${cls}" viewBox="0 0 168 12" aria-hidden="true" focusable="false">
  <path d="M0 6h56M112 6h56" stroke="currentColor" stroke-width=".7" opacity=".55"/>
  <g fill="none" stroke="currentColor" stroke-width=".8">
    <path d="M62 6l3-3 3 3-3 3z"/><path d="M100 6l3-3 3 3-3 3z"/>
  </g>
  <path d="M72 6l3.5-4 3.5 4-3.5 4zM89 6l3.5-4 3.5 4-3.5 4z" fill="currentColor" opacity=".8"/>
  <path d="M80 6l4-5 4 5-4 5z" fill="none" stroke="var(--hy-gold)" stroke-width=".9"/>
  <circle cx="84" cy="6" r="1.3" fill="var(--hy-gold)"/>
</svg>`;

// The gate's greenery: [class, exit {xPercent, yPercent, rotation}, start, duration]. Near sprigs part fastest.
const LEAVES = [
  ['l', { xPercent: -95, yPercent: 10, rotation: -10 }, 0.16, 1.75],
  ['r', { xPercent: 95, yPercent: -8, rotation: 10 }, 0.2, 1.8],
  ['tl', { xPercent: -78, yPercent: -82, rotation: -8 }, 0.1, 1.9],
  ['tr', { xPercent: 78, yPercent: -82, rotation: 8 }, 0.14, 1.85],
  ['bl', { xPercent: -78, yPercent: 84, rotation: 7 }, 0.12, 1.95],
  ['br', { xPercent: 78, yPercent: 84, rotation: -7 }, 0.18, 1.9],
  ['ft', { xPercent: 150, yPercent: -150, rotation: 14 }, 0.02, 1.35],
  ['fb', { xPercent: -150, yPercent: 150, rotation: -14 }, 0.04, 1.4],
];

let breathing = null;

function heroHtml({ bi, txt, on, names, AD, BS, esc }) {
  const t = txt('hero.title');
  const inv = txt('hero.invocation');
  const line = txt('hero.line');
  return `
  <div class="hy-hc hy-hc--l" aria-hidden="true">${img(green())}</div>
  <div class="hy-hc hy-hc--r" aria-hidden="true">${img(green())}</div>
  <div class="hy-hero">
    <div class="hy-hero__text">
      ${on(inv) ? `<p class="hy-inv su-in">${bi(inv)}</p>` : ''}
      ${t.ne ? `<p class="hy-crest su-in" lang="ne">${esc(t.ne)}</p>` : `<p class="hy-crest su-in">${bi(t)}</p>`}
      <div class="su-in">${dhaka()}</div>
      ${on(line) ? `<p class="hy-line su-in">${bi(line)}</p>` : ''}
      <h1 class="hy-names su-names su-in">${names()}</h1>
      <p class="hy-date su-in">${bi({ en: `${AD.wd.en} · ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.full.ne || AD.full.ne })}</p>
      <p class="hy-date2 su-in">${bi({ en: `${String(BS.full.short?.en || BS.full.en || '').replace(/\s*B\.?S\.?\s*$/i, '')} B.S.`, ne: AD.full.ne })}</p>
    </div>
    <figure class="hy-pav" aria-hidden="true">
      <img class="hy-pav__img" src="${ART}pavilion-sm.webp" srcset="${ART}pavilion-sm.webp 600w, ${ART}pavilion.webp 1200w" sizes="(max-width: 760px) 92vw, 46vw" alt="" decoding="async" fetchpriority="high" />
      ${img(`${ART}leaf-b.webp`, 'hy-drift')}
    </figure>
  </div>`;
}

// ───────── the garden walk: scenes in depth, each framed by a trellis arch dressed in greenery ─────────
/** a trellis arch with greenery climbing it; `v` varies the dressing so no two arches match */
const gArch = (v = 0) => `<div class="hy-ga hy-ga--v${v % 3}" aria-hidden="true">
    <i class="hy-ga__trellis"></i>
    ${['tl', 'tr', 'bl', 'br', 'l', 'r'].map((k) => `<span class="hy-ga__g hy-ga__g--${k}">${img(green(), '', 'loading="lazy"')}</span>`).join('')}
  </div>`;
const scene = (id, v, body, label) => `<div class="hy-sc" id="${id}" data-scene role="group" aria-label="${label}">${gArch(v)}<div class="hy-sc__body">${body}</div></div>`;
const head = (bi, title, kicker, id) => `<header class="hy-head">${kicker ? `<p class="hy-kicker">${bi(kicker)}</p>` : ''}<h2 class="hy-h2" id="${id}">${bi(title)}</h2>${dhaka()}</header>`;
const stripBS = (s) => `${String(s || '').replace(/\s*B\.?S\.?\s*$/i, '')} B.S.`;

function pageHtml(ctx) {
  const { bi, esc, txt, on, names, parts: P, AD, BS, placeLine, c, config, imgTag, reduced, mainEv } = ctx;
  const UI = P.UI;
  const scenes = [];

  // 1 · the couple, in a living hedge arch
  if (P.lead) {
    scenes.push(scene('couple', 0, `
      ${head(bi, txt('couple.title'), null, 'couple-title')}
      <figure class="hy-hedge">
        <span class="hy-hedge__g hy-hedge__g--l">${img(`${ART}greenery-sm.webp`, '', 'loading="lazy"')}</span>
        <span class="hy-hedge__g hy-hedge__g--r">${img(`${ART}greenery-sm.webp`, '', 'loading="lazy"')}</span>
        <div class="hy-hedge__pic">${imgTag(P.lead.photo, P.lead.alt, '(max-width: 700px) 76vw, 380px')}</div>
      </figure>
      ${on(txt('couple.line')) ? `<p class="hy-lede">${bi(txt('couple.line'))}</p>` : ''}`, esc(txt('couple.title').en)));
  }

  // 2 · the date: a watercolour seed packet with a leafy cover to scratch away
  const face = `<div class="hy-pk__face">
      <p class="hy-pk__month">${bi({ en: AD.month.en, ne: BS.month || AD.month.ne })}</p>
      <p class="hy-pk__day">${bi({ en: AD.day, ne: BS.day || ctx.neNum(AD.day) })}</p>
      <p class="hy-pk__wd">${bi({ en: `${AD.wd.en}${mainEv ? ` · ${AD.time}` : ''}`, ne: `${AD.wd.ne}${mainEv ? ` · ${ctx.timeLabel(mainEv).ne}` : ''}` })}</p>
      <p class="hy-pk__yr">${bi({ en: AD.year, ne: BS.year || ctx.neNum(AD.year) })}</p>
      <p class="hy-pk__alt">${bi({ en: stripBS(BS.full.short?.en || BS.full.en), ne: AD.full.ne })}</p>
      ${placeLine?.en || placeLine?.ne ? `<p class="hy-pk__place">${bi(placeLine)}</p>` : ''}
    </div>`;
  scenes.push(scene('date', 1, `
      ${head(bi, txt('date.title'), txt('date.kicker'), 'date-title')}
      <div class="hy-pk">
        <div class="hy-pk__crimp" aria-hidden="true"></div>
        <div class="hy-pk__label" aria-hidden="true">${img(`${ART}leaf-c.webp`, 'hy-pk__sprig')}<span lang="ne">${esc(txt('hero.title').ne || '')}</span>${img(`${ART}leaf-c.webp`, 'hy-pk__sprig hy-pk__sprig--r')}</div>
        ${P.scratch(face, 'hy-pk__scratch')}
      </div>`, esc(txt('date.title').en)));

  // 3 · the countdown: four stepping stones in the grass, going into the garden
  scenes.push(scene('count', 2, `
      ${head(bi, txt('count.title'), null, 'count-title')}
      <div class="hy-lawn" data-countdown>
        <ol class="hy-stones su-count__grid" aria-label="${esc(txt('count.title').en)}">
          ${P.countUnits.map(({ u, label }, i) => `<li class="hy-stone hy-stone--${i}"><span class="hy-stone__rock">${P.countNum(u, 'hy-stone__n')}</span><span class="hy-stone__l">${bi(label)}</span></li>`).join('')}
        </ol>
        <p class="hy-lawn__done" data-count-done hidden></p>
      </div>`, esc(txt('count.title').en)));

  // 4 · the families: two arbours facing each other across the path
  scenes.push(scene('families', 0, `
      ${head(bi, txt('families.title'), null, 'fam-title')}
      <div class="hy-arbours">
        ${P.families.map((f, i) => `<div class="hy-arbour hy-arbour--${i ? 'r' : 'l'}">
          <span class="hy-arbour__g" aria-hidden="true">${img(`${ART}greenery-sm.webp`, '', 'loading="lazy"')}</span>
          <div class="hy-arbour__in">
            ${P.brideGroom && f.photo ? `<span class="hy-arbour__pic">${imgTag(f.photo, f.person.name.en, '120px')}</span>` : ''}
            <p class="hy-arbour__k">${bi(f.label)}</p>
            <p class="hy-arbour__name">${bi(f.person.fullName)}</p>
            ${(f.person.parents?.en || f.person.parents?.ne) ? `<p class="hy-arbour__of">${bi(f.of)}</p><p class="hy-arbour__par">${bi(f.person.parents)}</p>` : ''}
            ${(f.person.home?.en || f.person.home?.ne) ? `<p class="hy-arbour__home">${bi(f.person.home)}</p>` : ''}
          </div>
        </div>`).join('<span class="hy-arbours__and" aria-hidden="true">&amp;</span>')}
      </div>`, esc(txt('families.title').en)));

  // the programme: wooden signposts along the path (normal scroll; they turn to face you)
  const sign = (ev, i) => `<li class="hy-sign hy-sign--${i % 2 ? 'l' : 'r'}" id="ev-${esc(ev.id)}">
      <div class="hy-sign__board"><span class="hy-sign__day">${bi({ en: `${ev.ad.day} ${ev.ad.month.en.slice(0, 3)}`, ne: `${ev.bs.day || ctx.neNum(ev.ad.day)} ${ev.bs.month || ''}` })}</span><h3 class="hy-sign__t">${bi(ev.title)}</h3></div>
      <div class="hy-sign__note">
        <p class="hy-sign__when">${bi({ en: ev.ad.full.en, ne: ev.bs.full.ne })}</p>
        <p class="hy-sign__time">${bi(ev.time)}</p>
        ${ev.blurb ? `<p class="hy-sign__blurb">${bi(ev.blurb)}</p>` : ''}
        <p class="hy-sign__venue">${bi(ev.venue)} <a class="su-link" href="${esc(ev.map)}" target="_blank" rel="noopener">${bi(UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
        ${ev.dress.colors.length || ev.dress.text?.en || ev.dress.text?.ne ? `<p class="hy-sign__dress">${ev.dress.colors.length ? `<span class="hy-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : UI.wear)}</span></p>` : ''}
        ${ev.rituals.length ? `<details class="hy-sign__order"><summary>${bi(UI.order)}</summary><ol>${ev.rituals.map((r) => `<li><b>${bi(r.time)}</b><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
      </div>
    </li>`;

  // photographs hanging from vines, at three depths
  const rows = [];
  for (let i = 0; i < P.photos.length; i += 3) rows.push(P.photos.slice(i, i + 3).map((g, k) => [g, i + k]));
  const vine = `<svg class="hy-vine__line" viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true"><path d="M-4 6 C 60 34, 120 38, 150 30 S 250 4, 304 10" fill="none" stroke="#7C8B5C" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;

  return `
  <section class="su-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${heroHtml(ctx)}
    ${P.cue('walk')}
  </section>

  <section class="hy-walk${reduced ? ' is-still' : ''}" id="walk" aria-label="${esc(`${txt('date.title').en}, ${txt('families.title').en}`)}">
    <div class="hy-walk__stage">
      ${scenes.join('')}
      <div class="hy-walk__fg" aria-hidden="true">${['a', 'b', 'c', 'a'].map((k, i) => img(`${ART}leaf-${k}.webp`, `hy-fg hy-fg--${i}`)).join('')}</div>
    </div>
  </section>

  <section class="hy-path" id="programme" aria-labelledby="prog-title">
    ${head(bi, txt('prog.title'), txt('prog.kicker'), 'prog-title')}
    <ol class="hy-signs"><i class="hy-signs__post" aria-hidden="true"></i>${P.events.map(sign).join('')}</ol>
    <div class="hy-path__foot">${P.calendarBtn()}${P.shareBtn()}</div>
    <div class="hy-path__more">${P.moreInfo()}</div>
  </section>

  ${P.photos.length ? `
  <section class="hy-grove" id="photos" aria-labelledby="gal-title">
    <div class="hy-grove__gate" aria-hidden="true">${gArch(1)}</div>
    ${head(bi, txt('gallery.title'), null, 'gal-title')}
    <div class="hy-vines">
      ${rows.map((row, r) => `<div class="hy-vine hy-vine--${r % 2}">${vine}
        <span class="hy-vine__leaf hy-vine__leaf--a">${img(`${ART}leaf-a.webp`, '', 'loading="lazy"')}</span><span class="hy-vine__leaf hy-vine__leaf--b">${img(`${ART}leaf-b.webp`, '', 'loading="lazy"')}</span>
        ${row.map(([g, i], k) => `<figure class="hy-fr hy-fr--${k}" data-depth="${[0.6, 1.3, 0.9][k]}"><div class="hy-fr__sw"><i class="hy-fr__str" aria-hidden="true"></i><div class="hy-fr__mat">${P.photoBtn(g, i, '(max-width: 700px) 30vw, 260px')}</div></div></figure>`).join('')}
      </div>`).join('')}
    </div>
  </section>` : ''}

  <section class="hy-letter" id="card" aria-labelledby="card-title">
    <article class="hy-letter__sheet">
      ${ctx.ganesh('hy-letter__gan', '84px')}
      <h2 class="hy-letter__line" id="card-title">${bi(txt('card.line'))}</h2>
      <p class="hy-letter__hosts">${bi(config.hosts)}</p>
      ${P.cardBtn()}
    </article>
  </section>

  <section class="hy-reply" id="rsvp" aria-labelledby="rsvp-title">
    ${head(bi, txt('rsvp.title'), null, 'rsvp-title')}
    ${P.deadline?.en || P.deadline?.ne ? `<p class="hy-lede">${bi(P.deadline)}</p>` : ''}
    <div class="hy-reply__card"><span class="hy-reply__g" aria-hidden="true">${img(`${ART}greenery-sm.webp`, '', 'loading="lazy"')}</span>${P.rsvpForm()}</div>
  </section>

  <footer class="hy-close" aria-label="Blessing">
    <div class="hy-close-g" aria-hidden="true">${img(`${ART}greenery-sm.webp`, 'hy-close-g__l', 'loading="lazy"')}${img(`${ART}greenery-sm.webp`, 'hy-close-g__r', 'loading="lazy"')}</div>
    ${ctx.ganesh('hy-close-gan', '90px')}
    <p class="hy-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
    <p class="hy-close__en l-en">${esc(config.closing?.en || '')}</p>
    <p class="hy-close__names su-names">${names()}</p>
    ${c.hashtag ? `<p class="hy-close__tag">${esc(c.hashtag)}</p>` : ''}
    ${P.madeWith()}
  </footer>`;
}

/** the seed packet's cover: a watercolour bed of leaves with a cream label */
function leafCover(ctx, w, h, dpr, hint) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#6E8B60'); g.addColorStop(0.5, '#56744F'); g.addColorStop(1, '#45603F');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const greens = ['#7F9C6C', '#93AF7E', '#5D7B53', '#A7C08F', '#4B6845', '#86A374'];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const n = Math.round((w * h) / (520 * dpr * dpr));
  for (let i = 0; i < n; i++) {
    const x = rnd() * w; const y = rnd() * h; const L = (12 + rnd() * 20) * dpr; const a = rnd() * Math.PI * 2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.globalAlpha = 0.55 + rnd() * 0.4;
    ctx.fillStyle = greens[Math.floor(rnd() * greens.length)];
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.quadraticCurveTo(0, -L * 0.42, L, 0); ctx.quadraticCurveTo(0, L * 0.42, -L, 0); ctx.fill();
    ctx.globalAlpha *= 0.5; ctx.strokeStyle = '#DDE8CF'; ctx.lineWidth = 0.8 * dpr;
    ctx.beginPath(); ctx.moveTo(-L * 0.9, 0); ctx.lineTo(L * 0.85, 0); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  const size = Math.round(Math.min(w / 14, 19 * dpr));
  ctx.font = `500 ${size}px Mukta, sans-serif`;
  const tw = ctx.measureText(hint).width;
  const bw = tw + size * 2.2; const bh = size * 2.4;
  ctx.fillStyle = 'rgba(251, 250, 242, 0.94)';
  const x0 = (w - bw) / 2; const y0 = (h - bh) / 2; const r = bh / 2;
  ctx.beginPath(); ctx.moveTo(x0 + r, y0); ctx.arcTo(x0 + bw, y0, x0 + bw, y0 + bh, r); ctx.arcTo(x0 + bw, y0 + bh, x0, y0 + bh, r); ctx.arcTo(x0, y0 + bh, x0, y0, r); ctx.arcTo(x0, y0, x0 + bw, y0, r); ctx.fill();
  ctx.fillStyle = '#3F5A40'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(hint, w / 2, h / 2 + size * 0.06);
}

/** the scroll choreography: the pinned walk, the signposts turning, the grove */
function walkScroll(ctx) {
  const { gsap, ScrollTrigger } = ctx;
  if (ctx.reduced) return;
  const walk = document.getElementById('walk');
  const scenes = [...walk.querySelectorAll('[data-scene]')];
  const fg = [...walk.querySelectorAll('.hy-fg')];
  const W = () => window.innerWidth;
  scenes.forEach((s, i) => { if (i) gsap.set(s, { autoAlpha: 0 }); });
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  tl.to({}, { duration: 0.5 });
  scenes.forEach((s, i) => {
    const nx = scenes[i + 1];
    if (!nx) return;
    const at = tl.duration();
    const ga = s.querySelector('.hy-ga'); const body = s.querySelector('.hy-sc__body');
    const nga = nx.querySelector('.hy-ga'); const nbody = nx.querySelector('.hy-sc__body');
    // this arch walks past the camera; the next scene comes up out of the distance
    tl.to(body, { scale: 1.45, opacity: 0, duration: 0.42, ease: 'power1.in' }, at)
      .to(ga, { scale: 2.7, duration: 1, ease: 'power1.in' }, at)
      .to(ga, { opacity: 0, duration: 0.4 }, at + 0.55)
      .set(s, { autoAlpha: 0 }, at + 1)
      .set(nx, { autoAlpha: 1 }, at + 0.08)
      .fromTo(nga, { scale: 0.42, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.95, ease: 'power2.out' }, at + 0.08)
      .fromTo(nbody, { scale: 0.62, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'power2.out' }, at + 0.35);
    // two loose leaves fly past in the foreground, nearer than anything
    [fg[(i * 2) % 4], fg[(i * 2 + 1) % 4]].forEach((leaf, k) => {
      const dir = k ? 1 : -1;
      tl.fromTo(leaf, { x: W() * (0.5 + dir * 0.08), y: window.innerHeight * (0.42 + k * 0.12), scale: 0.5, rotation: dir * 20, opacity: 0 },
        { x: W() * (0.5 + dir * 0.75), y: window.innerHeight * (0.2 + k * 0.5), scale: 3.2, rotation: dir * 120, duration: 0.9, ease: 'power1.in' }, at + 0.05 + k * 0.1)
        .to(leaf, { opacity: 0.95, duration: 0.25 }, at + 0.05 + k * 0.1)
        .to(leaf, { opacity: 0, duration: 0.2 }, at + 0.75 + k * 0.1);
    });
    tl.to({}, { duration: 0.55 });
  });
  ScrollTrigger.create({
    id: 'hy-walk', trigger: walk, pin: true, start: 'top top', anticipatePin: 1,
    end: () => `+=${Math.round(window.innerHeight * 0.95 * (tl.duration()))}`,
    scrub: 0.6, animation: tl, invalidateOnRefresh: true,
    onToggle: (self) => walk.classList.toggle('is-walking', self.isActive),
  });

  // the signposts turn to face you as you come up the path
  document.querySelectorAll('.hy-sign').forEach((li) => {
    const side = li.classList.contains('hy-sign--l') ? -1 : 1;
    gsap.fromTo(li.querySelector('.hy-sign__board'), { rotationY: side * -72, opacity: 0.2 }, { rotationY: 0, opacity: 1, ease: 'power1.out',
      scrollTrigger: { trigger: li, start: 'top 92%', end: 'top 52%', scrub: 0.5 } });
    gsap.fromTo(li.querySelector('.hy-sign__note'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, ease: 'power1.out',
      scrollTrigger: { trigger: li, start: 'top 80%', end: 'top 50%', scrub: 0.5 } });
  });

  // the grove: you step through its arch; nearer frames drift faster; the frames sway on their vines
  const grove = document.getElementById('photos');
  if (grove) {
    gsap.fromTo(grove.querySelector('.hy-grove__gate .hy-ga'), { scale: 1, opacity: 1 }, { scale: 2.6, opacity: 0, ease: 'power1.in',
      scrollTrigger: { trigger: grove, start: 'top 70%', end: 'top -15%', scrub: 0.5 } });
    grove.querySelectorAll('.hy-fr').forEach((f) => {
      const d = Number(f.dataset.depth) || 1;
      gsap.fromTo(f, { y: 50 * d }, { y: -50 * d, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    const sway = gsap.timeline({ paused: true });
    grove.querySelectorAll('.hy-fr__sw').forEach((el, i) => {
      sway.fromTo(el, { rotation: -1.4 }, { rotation: 1.4, duration: 2.6 + (i % 3) * 0.5, ease: 'sine.inOut', repeat: -1, yoyo: true }, i * 0.3);
    });
    ScrollTrigger.create({ trigger: grove, start: 'top bottom', end: 'bottom top', onToggle: (self) => (self.isActive ? sway.play() : sway.pause()) });
  }
}

// keep the scratch cover drawn at full size: the packet's scene may be scaled while the language changes
function guardScratch() {
  document.addEventListener('langchange', () => {
    const b = document.querySelector('#date .hy-sc__body');
    if (!b) return;
    const t = b.style.transform;
    b.style.transform = 'none';
    requestAnimationFrame(() => { b.style.transform = t; });
  });
}

export default mountSuite({
  slug: 'hariyo',
  manifest,
  bell: false,

  gate: ({ ganesh, names, txt, esc }) => {
    const t = txt('hero.title');
    return `
    <div class="hy-gpaper"></div>
    ${LEAVES.map(([k]) => `<div class="hy-lf hy-lf--${k}">${img(green(), '', 'fetchpriority="high"')}</div>`).join('')}
    <div class="hy-arch">
      <div class="hy-arch__in">
        ${ganesh('hy-arch__gan', '150px')}
        ${t.ne ? `<p class="hy-crest" lang="ne">${esc(t.ne)}</p>` : ''}
        ${dhaka('hy-arch__rule')}
        <p class="hy-arch__names su-names">${names()}</p>
      </div>
    </div>
    <div class="hy-fall">${['a', 'b', 'c'].map((k) => img(`${ART}leaf-${k}.webp`, `hy-fall__l hy-fall__l--${k}`)).join('')}</div>`;
  },

  hero: (ctx) => heroHtml(ctx),

  gateTap: (ctx, openFn) => {
    document.getElementById('gscene')?.addEventListener('click', () => openFn());
  },

  open: (ctx, tl, gate) => {
    const q = (s) => gate.querySelector(s);
    const hero = document.getElementById('top');
    // the arch and its words go first, softly
    tl.to(q('.hy-arch'), { opacity: 0, scale: 1.035, duration: 0.7, ease: 'power2.out' }, 0.02);
    // the leaves part, each at its own pace
    LEAVES.forEach(([k, to, at, d]) => {
      tl.to(q(`.hy-lf--${k}`), { ...to, scale: 1.08, duration: d, ease: 'power3.inOut' }, at);
    });
    // a few leaves come loose and drift down through the clearing
    const fall = [...gate.querySelectorAll('.hy-fall__l')];
    const W = window.innerWidth; const H = window.innerHeight;
    fall.forEach((el, i) => {
      const x0 = W * [0.28, 0.66, 0.46][i]; const y0 = H * [0.22, 0.3, 0.12][i];
      tl.fromTo(el, { x: x0, y: y0, rotation: [-30, 20, 60][i], opacity: 0 },
        { x: x0 + W * [-0.12, 0.1, 0.05][i], y: y0 + H * [0.42, 0.36, 0.5][i], rotation: [40, -35, 140][i], duration: [2.6, 2.4, 2.9][i], ease: 'sine.inOut' }, 0.35 + i * 0.12);
      tl.to(el, { opacity: 1, duration: 0.5, ease: 'power1.out' }, 0.35 + i * 0.12);
      tl.to(el, { opacity: 0, duration: 0.9, ease: 'power1.in' }, 0.35 + i * 0.12 + [1.7, 1.5, 2].at(i));
    });
    // the paper clears; the pavilion rises into the garden
    tl.to(q('.hy-gpaper'), { opacity: 0, duration: 1, ease: 'power1.inOut' }, 0.4);
    tl.set(gate, { pointerEvents: 'none' }, 0.6);
    tl.fromTo(hero.querySelector('.hy-pav__img'), { opacity: 0, y: 46, scale: 0.965 }, { opacity: 1, y: 0, scale: 1, duration: 1.9, ease: 'power3.out' }, 0.5);
    tl.fromTo(hero.querySelectorAll('.hy-hc'), { opacity: 0, yPercent: -18 }, { opacity: 1, yPercent: 0, duration: 1.6, ease: 'power3.out', stagger: 0.08 }, 0.95);
    return 1.05;
  },

  ambient: (ctx) => {
    if (ctx.reduced) return;
    const pav = document.querySelector('.hy-pav__img');
    const leaf = document.querySelector('.hy-drift');
    // the scene breathes, barely; one leaf now and then. Both rest when the hero is off screen.
    breathing = gsap.timeline({ repeat: -1, paused: true })
      .to(pav, { scale: 1.012, duration: 5, ease: 'sine.inOut', transformOrigin: '50% 100%' })
      .to(pav, { scale: 1, duration: 5, ease: 'sine.inOut' });
    const drift = gsap.timeline({ repeat: -1, repeatDelay: 5, paused: true, delay: 2 })
      .fromTo(leaf, { xPercent: 0, yPercent: 0, rotation: -20, opacity: 0 }, { xPercent: -160, yPercent: 520, rotation: 70, duration: 9, ease: 'sine.inOut' })
      .to(leaf, { opacity: 0.95, duration: 1.6, ease: 'power1.out' }, 0)
      .to(leaf, { opacity: 0, duration: 2, ease: 'power1.in' }, 7);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { breathing.play(); drift.play(); } else { breathing.pause(); drift.pause(); }
    });
    io.observe(document.getElementById('top'));
  },

  page: (ctx) => { guardScratch(); return pageHtml(ctx); },
  scroll: (ctx) => walkScroll(ctx),
  scratch: { paint: leafCover },
});
