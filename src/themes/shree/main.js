// Theme · Shree (श्री): deep plum and antique gold, a sacred gold Ganesh between two hanging brass diyas.
// The one signature motion: THE LOTUS OPENS. A gold lotus lies closed in the middle of the plum gate; on tap its
// three rings of petals unfold outward ring by ring (each petal hinges about its base), a soft gold light blooms in
// the centre, the lotus glides up to become the slow mandala behind Ganesh, Ganesh rises out of it and the two diyas
// come down on their chains and settle with a gentle swing. Everything after that is quiet.
import { gsap } from 'gsap';
import { mountSuite } from '../_suite/suite.js';
import manifest from './slots.js';
import { lamp, flame, kalash, toran, saptapadi, flowers, initNepali } from '../_suite/nepali.js';
import './shree.css';

const ART = {
  diya: { sm: '/themes/shree/art/diya-nf-sm.webp', lg: '/themes/shree/art/diya-nf.webp' }, // the painted flame removed: a live one burns on the wick
};

// ───────── the lotus (SVG, centred on 0,0 in a 400×400 view) ─────────
// Each petal is drawn with its base at its own origin and its tip pointing out (-y). Closed, it is flipped about
// its base (scale(sx, sy<0)) so it folds in over the centre; opening runs sy through 0, which reads as a hinge.
const RINGS = [
  { n: 16, r: 78, L: 100, W: 50, off: 0, sx: 0.7, sy: -0.68 },    // outer
  { n: 12, r: 56, L: 86, W: 50, off: 15, sx: 0.72, sy: -0.6 },     // middle
  { n: 8, r: 34, L: 66, W: 42, off: 22.5, sx: 0.76, sy: -0.5 },   // inner
];
const BUD_SCALE = 1.22; // the closed bud sits a little larger in the gate, and settles as it opens
const petalPath = (L, W) => `M0 0C${W * 0.62} ${-L * 0.18} ${W * 0.56} ${-L * 0.7} 0 ${-L}C${-W * 0.56} ${-L * 0.7} ${-W * 0.62} ${-L * 0.18} 0 0Z`;
const f = (n) => Math.round(n * 100) / 100;

function lotusSVG(id, { closed = false, cls = '' } = {}) {
  const rays = Array.from({ length: 32 }, (_, i) => {
    const a = (i * 360) / 32 + 5.625;
    return `<line x1="0" y1="-92" x2="0" y2="${i % 2 ? -150 : -168}" transform="rotate(${a})"/>`;
  }).join('');
  const beads = Array.from({ length: 48 }, (_, i) => `<circle r="${i % 2 ? 1.1 : 1.9}" cy="-186" transform="rotate(${(i * 360) / 48})"/>`).join('');
  const ring = (R, k) => `<g class="sh-ring" data-ring="${k}"${closed ? ` transform="rotate(${k % 2 ? 14 : -14}) scale(${BUD_SCALE})"` : ''}>${Array.from({ length: R.n }, (_, i) => {
    const a = (i * 360) / R.n + R.off;
    const tr = closed ? ` transform="scale(${R.sx} ${R.sy})"` : '';
    const p = petalPath(R.L, R.W);
    const inner = petalPath(R.L * 0.66, R.W * 0.5);
    return `<g transform="rotate(${f(a)}) translate(0 ${-R.r})"><g class="sh-p"${tr}>
      <path class="sh-p__body" d="${p}" fill="url(#${id}-g${k})"/>
      <path class="sh-p__in" d="${inner}"/>
      <path class="sh-p__vein" d="M0 ${f(-R.L * 0.12)}V${f(-R.L * 0.6)}"/>
      <circle class="sh-p__dot" cy="${f(-R.L * 0.8)}" r="${k === 0 ? 2 : 1.6}"/>
    </g></g>`;
  }).join('')}</g>`;
  const seeds = [[0, 0], ...Array.from({ length: 6 }, (_, i) => [f(Math.sin((i * Math.PI) / 3) * 14), f(-Math.cos((i * Math.PI) / 3) * 14)])]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('');
  return `<svg class="sh-lotus ${cls}" viewBox="-200 -200 400 400" aria-hidden="true" focusable="false">
    <defs>
      ${RINGS.map((_, k) => `<linearGradient id="${id}-g${k}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#43183D"/><stop offset="0.5" stop-color="${['#6A3D44', '#714540', '#7A4D3E'][k]}"/><stop offset="1" stop-color="${['#A9844C', '#B48F52', '#BE9A5A'][k]}"/></linearGradient>`).join('')}
    </defs>
    <g class="sh-lotus__frame">
      <g class="sh-lotus__rays">${rays}</g>
      <circle class="sh-lotus__c1" r="178"/><circle class="sh-lotus__c2" r="194"/>
      <g class="sh-lotus__beads">${beads}</g>
    </g>
    ${ring(RINGS[0], 0)}${ring(RINGS[1], 1)}
    <g class="sh-lotus__pod"><circle class="sh-lotus__podc" r="30"/><g class="sh-lotus__seeds">${seeds}</g></g>
    ${ring(RINGS[2], 2)}
  </svg>`;
}

// small ornaments: a side-view lotus, used as the divider and above cards
const BUD = `<svg class="sh-bud" viewBox="0 0 64 34" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round">
  <path d="M32 3C26 10 26 21 32 28C38 21 38 10 32 3Z"/><path d="M32 28C27 23 21 16 15 14C16 21 22 27 32 28Z"/><path d="M32 28C37 23 43 16 49 14C48 21 42 27 32 28Z"/>
  <path d="M32 28C25 27 13 24 5 20C9 27 20 30 32 29C44 30 55 27 59 20C51 24 39 27 32 28Z"/><path d="M14 32H50"/></g><circle cx="32" cy="12" r="1.3" fill="currentColor"/></svg>`;
const DIVIDER = `<span class="sh-div" aria-hidden="true"><i></i>${BUD}<i></i></span>`;
const DIAMOND = `<svg class="sh-dia" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.2"><path d="M20 2 38 20 20 38 2 20Z"/><path d="M20 10 30 20 20 30 10 20Z"/></g><circle cx="20" cy="20" r="2.4" fill="currentColor"/></svg>`;
const diyaImg = (cls, sizes, eager) => `<div class="sh-diya ${cls}" aria-hidden="true"><div class="sh-diya__swing">
  <img src="${ART.diya.sm}" srcset="${ART.diya.sm} 260w, ${ART.diya.lg} 520w" sizes="${sizes}" alt="" ${eager ? '' : 'loading="lazy"'} decoding="async" width="520" height="1132" />
  <span class="sh-wick">${flame('sh-dflame')}</span></div></div>`;

function hero({ bi, esc, txt, names, ganesh, AD, BS, on }) {
  const title = txt('hero.title');
  const bsLine = BS.full.ne || '';
  return `
  <div class="sh-hero">
    ${diyaImg('sh-diya--l', '(min-width: 900px) 170px, 24vw', true)}
    ${diyaImg('sh-diya--r', '(min-width: 900px) 170px, 24vw', true)}
    <span class="sh-panas sh-panas--l su-in">${lamp('panas', { sizes: '(min-width: 900px) 150px, 20vw' })}</span>
    <span class="sh-panas sh-panas--r su-in">${lamp('panas', { sizes: '(min-width: 900px) 150px, 20vw' })}</span>
    <div class="sh-hero__col">
      <div class="sh-gan">
        <div class="sh-halo" aria-hidden="true"><div class="sh-halo__spin">${lotusSVG('hl')}</div><i class="sh-bloom"></i></div>
        ${ganesh('sh-gan__img', '(min-width: 900px) 220px, 48vw')}
      </div>
      ${on(txt('hero.invocation')) ? `<p class="sh-inv su-in">${bi(txt('hero.invocation'))}</p>` : ''}
      <h1 class="sh-title su-in" lang="ne">${esc(title.ne || title.en)}</h1>
      ${on(txt('hero.line')) ? `<p class="sh-line su-in">${bi(txt('hero.line'))}</p>` : ''}
      <p class="su-names sh-names su-in">${names('&amp;')}</p>
      <div class="sh-when su-in">
        <i class="sh-band" aria-hidden="true"></i>
        <p class="sh-when__ad">${bi({ en: `${AD.wd.en} · ${AD.day} ${AD.month.en} ${AD.year}`, ne: AD.full.ne })}</p>
        ${bsLine ? `<p class="sh-when__bs" lang="ne">${esc(bsLine)}</p>` : ''}
      </div>
    </div>
  </div>`;
}

let lotusState = null; // proxies the opening tweens write into

mountSuite({
  slug: 'shree',
  manifest,
  art: ART,
  bell: true,

  gate: ({ bi, txt, c, on }) => `
    <div class="sh-gate__bg"></div>
    <div class="sh-gate__still">${lotusSVG('gl', { closed: true })}</div>
    <div class="sh-gate__spot" id="shSpot"></div>
    ${on(txt('hero.invocation')) ? `<p class="sh-gate__inv sh-gate__txt">${bi(txt('hero.invocation'))}</p>` : ''}
    <p class="sh-gate__names sh-gate__txt"><span>${bi(c.bride.name)}</span><span class="sh-gate__amp">&amp;</span><span>${bi(c.groom.name)}</span></p>`,

  ready: (ctx) => {
    startDial(ctx);
    initNepali();
    { const ne = document.getElementById('f-name-err'); if (ne) { ne.hidden = false; ne.setAttribute('role', 'alert'); } } // engine leaves it [hidden]
    const gate = document.getElementById('gate');
    if (ctx.reduced) { gate.classList.add('sh-still'); return; }
    gate.classList.add('sh-live');
    const hero = document.getElementById('top');
    const halo = hero.querySelector('.sh-halo');
    const svg = halo.querySelector('.sh-lotus');
    const pets = [...svg.querySelectorAll('.sh-ring')].map((g) => [...g.querySelectorAll('.sh-p')]);
    lotusState = { halo, svg, pets, rings: [...svg.querySelectorAll('.sh-ring')], pod: svg.querySelector('.sh-lotus__pod') };
    // closed petals
    pets.forEach((ring, k) => ring.forEach((p) => p.setAttribute('transform', `scale(${RINGS[k].sx} ${RINGS[k].sy})`)));
    lotusState.rings.forEach((g, k) => g.setAttribute('transform', `rotate(${k % 2 ? 14 : -14}) scale(${BUD_SCALE})`));
    gsap.set(hero.querySelectorAll('.su-in, .sh-gan__img'), { opacity: 0 });
    gsap.set(hero.querySelectorAll('.sh-diya'), { yPercent: -140 });
    gsap.set(hero.querySelector('.sh-bloom'), { opacity: 0.4, scale: 0.42 });
    gsap.set(svg, { opacity: 1 });
    // the hero's own lotus sits in the gate's spot until the opening carries it home
    const place = () => {
      if (lotusState.moved) return;
      gsap.set(halo, { x: 0, y: 0, scale: 1 });
      const a = document.getElementById('shSpot').getBoundingClientRect();
      const b = halo.getBoundingClientRect();
      if (!b.width) return;
      lotusState.from = { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2), scale: a.width / b.width };
      gsap.set(halo, lotusState.from);
    };
    place();
    lotusState.place = place;
    window.addEventListener('resize', place);
    document.fonts?.ready.then(place);
  },

  gateTap: (ctx, openFn) => {
    document.getElementById('gscene').addEventListener('click', () => openFn());
  },

  open: (ctx, tl, gate) => {
    const S = lotusState;
    const hero = document.getElementById('top');
    S.place();
    S.moved = true;
    window.removeEventListener('resize', S.place);
    const from = S.from || { x: 0, y: 0, scale: 1 };
    tl.to(gate.querySelectorAll('.sh-gate__txt'), { autoAlpha: 0, y: -8, duration: 0.5, ease: 'power2.out' }, 0);
    // a small breath before the petals move
    tl.fromTo(S.halo, { scale: from.scale }, { scale: from.scale * 1.035, duration: 0.35, ease: 'sine.inOut' }, 0);
    // petals unfold, outer ring first, each ring spiralling round
    const starts = [0.3, 0.72, 1.12];
    S.pets.forEach((ring, k) => {
      const R = RINGS[k];
      ring.forEach((p, i) => {
        const o = { sx: R.sx, sy: R.sy };
        tl.fromTo(o, { sx: R.sx, sy: R.sy }, {
          sx: 1, sy: 1, duration: 1.25, ease: 'power3.out',
          onUpdate: () => p.setAttribute('transform', `scale(${f(o.sx)} ${f(o.sy)})`),
        }, starts[k] + i * (0.36 / ring.length));
      });
      const rot = { a: k % 2 ? 14 : -14, s: BUD_SCALE };
      const g = S.rings[k];
      tl.fromTo(rot, { a: k % 2 ? 14 : -14, s: BUD_SCALE }, { a: 0, s: 1, duration: 1.7, ease: 'power2.out', onUpdate: () => g.setAttribute('transform', `rotate(${f(rot.a)}) scale(${f(rot.s)})`) }, starts[k] - 0.05);
    });
    const pod = { s: 0.6 };
    tl.fromTo(pod, { s: 0.6 }, { s: 1, duration: 1.1, ease: 'back.out(2)', onUpdate: () => S.pod.setAttribute('transform', `scale(${f(pod.s)})`) }, 1.25);
    // the light blooms in the heart of the lotus, then rests as a soft aura
    const bloom = hero.querySelector('.sh-bloom');
    tl.fromTo(bloom, { opacity: 0.4, scale: 0.42 }, { opacity: 1, scale: 1.15, duration: 1.1, ease: 'power2.out' }, 1.15)
      .to(bloom, { opacity: 0.7, scale: 1, duration: 1.6, ease: 'sine.inOut' }, 2.3);
    // the opened lotus glides home behind Ganesh and quietens into a watermark
    tl.to(S.halo, { x: 0, y: 0, scale: 1, duration: 1.6, ease: 'power3.inOut' }, 2.0);
    tl.fromTo(S.svg, { opacity: 1 }, { opacity: 0.17, duration: 1.4, ease: 'sine.inOut' }, 2.4);
    // Ganesh rises out of it
    const gan = hero.querySelector('.sh-gan__img');
    if (gan) tl.fromTo(gan, { opacity: 0, y: 46, scale: 0.86 }, { opacity: 1, y: 0, scale: 1, duration: 1.5, ease: 'power3.out' }, 2.55);
    // the diyas come down on their chains and settle with a gentle swing
    hero.querySelectorAll('.sh-diya').forEach((d, i) => {
      tl.fromTo(d, { yPercent: -140 }, { yPercent: 0, duration: 1.7, ease: 'power3.out' }, 2.35 + i * 0.12);
      tl.fromTo(d.querySelector('.sh-diya__swing'), { rotation: i ? 5 : -5 }, { rotation: 0, duration: 2.6, ease: 'elastic.out(1, 0.32)' }, 2.75 + i * 0.12);
    });
    return 3.35;
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
  const vows = (config.saptapadi || []).filter((v) => v && (v.en || v.ne)).slice(0, 7);
  const fam = P.families.map((x) => `
    <div class="sh-niche sh-niche--${x.key === 'bride' ? 'l' : 'r'}"><div class="sh-niche__arch">
      ${P.brideGroom ? `<figure class="sh-niche__pic">${imgTag(x.photo, x.person.name.en, '(max-width: 700px) 30vw, 160px')}</figure>` : ''}
      <p class="sh-niche__k">${bi(x.label)}</p>
      <p class="sh-niche__name">${bi(x.person.fullName)}</p>
      ${(x.person.parents?.en || x.person.parents?.ne) ? `<p class="sh-niche__of">${bi(x.of)}</p><p class="sh-niche__par">${bi(x.person.parents)}</p>` : ''}
      ${(x.person.home?.en || x.person.home?.ne) ? `<p class="sh-niche__home">${bi(x.person.home)}</p>` : ''}
      ${kalash('sh-niche__kalash', '(min-width: 900px) 110px, 70px')}
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
    vows.length ? leaf('vows', `
      ${head(bi, on, txt('vows.title'), 'vows-t', txt('vows.kicker'))}
      <div class="sh-vows">
        ${saptapadi('sh-vows__feet', '(min-width: 900px) 190px, 26vw')}
        <ol class="sh-vows__list">${vows.map((v) => `<li>${bi(v)}</li>`).join('')}</ol>
      </div>`, 'sh-leaf--vows') : '',
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
        ${toran('sh-scroll__toran', '(min-width: 760px) 720px, 100vw')}
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
    ${flowers('tl', 'sh-plate__fl sh-plate__fl--tl', '(min-width: 900px) 220px, 34vw')}
    ${flowers('br', 'sh-plate__fl sh-plate__fl--br', '(min-width: 900px) 220px, 34vw')}
    <div class="sh-plate">
      ${BUD}
      <h2 class="sh-plate__line" id="card-t">${bi(txt('card.line'))}</h2>
      <p class="sh-plate__hosts">${bi(config.hosts)}</p>
      <button class="sh-seal" type="button" data-open-card><span class="sh-seal__disc" aria-hidden="true"><span lang="ne">श्री</span></span><span class="sh-seal__lbl">${bi(txt('card.button'))}</span></button>
    </div>
  </section>

  <section class="sh-sec sh-rsvp" id="rsvp" aria-labelledby="rsvp-t">
    <div class="sh-cream-edge"><div class="sh-cream">
      <header class="sh-head">${DIVIDER}<h2 class="sh-h2" id="rsvp-t">${bi(txt('rsvp.title'))}</h2>${P.deadline && (P.deadline.en || P.deadline.ne) ? `<p class="sh-cream__by">${bi(P.deadline)}</p>` : ''}</header>
      ${P.rsvpForm()}
    </div></div>
  </section>

  <footer class="sh-closing" aria-label="Blessing">
    <div class="sh-close" aria-hidden="true">
      ${diyaImg('sh-diya--cl', '120px', false)}
      ${diyaImg('sh-diya--cr', '120px', false)}
      <div class="sh-close__lotus">${lotusSVG('cl')}</div>
      <i class="sh-band sh-close__band"></i>
      ${lamp('panas', { cls: 'sh-cpanas sh-cpanas--l', sizes: '(min-width: 900px) 130px, 18vw' })}
      ${lamp('panas', { cls: 'sh-cpanas sh-cpanas--r', sizes: '(min-width: 900px) 130px, 18vw' })}
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
