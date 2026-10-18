// Kalpataru (कल्पतरु): the wish-fulfilling tree.
// Opening: one peepal-leaf card hangs from a mauli thread. Tap: the knot unties, the leaf turns over to show the
// names, then the view pulls back: it was one leaf of a great old tree, and a flock of parakeets lifts off its crown.
// Signature (the one moment): the climb. The page pins and every scroll lifts the guest up the tree, from the roots
// to the crown: the painted tree slides down behind (far), the paper tags, the carved frame, the wooden name boards,
// the lanterns and the nest come down past on their threads (near). After the crown: the sky, the RSVP tied with a
// wish-ribbon, and the guests' wishes tied on a thread. Without motion the tree is three still crops between the parts.
import './kalpataru.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import { lamp, kalash, initNepali } from '../_suite/nepali.js';

const ART = '/themes/kalpataru/art/';
const R = 2048 / 1152; // the tree panels' height / width
// the climb's paintings, bottom to top: scale and left edge in tree widths (W), how much each overlaps the one below,
// and where its trunk is (its own width) so the camera can follow the trunk as it leans
const PANELS = [
  { n: 'roots', s: 1, x: 0, ov: 0, c: 0.58 },
  { n: 'trunk', s: 0.86, x: 0.08, ov: 0.3, c: 0.52 },
  { n: 'fork', s: 0.92, x: 0.08, ov: 0.3, c: 0.46 },
  { n: 'branches', s: 1.02, x: -0.01, ov: 0.42, c: 0.5 },
  { n: 'crown', s: 1.04, x: -0.02, ov: 0.48, c: 0.5 },
];
// fresh wedding decoration on the tree: [panel, x (panel width), top (panel height), width (tree widths), kind, hindu?]
const DECOR = [
  ['roots', 0.5, 0.79, 0.96, 'petals'],
  ['roots', 0.1, 0.04, 0.052, 'strand'], ['roots', 0.9, 0.08, 0.05, 'strand'],
  ['trunk', 0.52, 0.12, 0.66, 'toran', false, 'desk'],
  ['trunk', 0.08, 0.3, 0.05, 'strand'], ['trunk', 0.93, 0.26, 0.05, 'strand'],
  ['fork', 0.47, 0.64, 0.5, 'toran', false, 'desk'],
  ['fork', 0.53, 0.212, 0.6, 'toran', false, 'phone'], // strung between the two boughs, just above the families' boards
  ['fork', 0.3, 0.2, 0.06, 'diya', true],
  ['branches', 0.14, 0.5, 0.055, 'strand'], ['branches', 0.86, 0.44, 0.055, 'strand'], ['branches', 0.32, 0.16, 0.05, 'strand'],
  ['branches', 0.72, 0.24, 0.06, 'diya', true], ['branches', 0.22, 0.74, 0.06, 'diya', true],
  ['crown', 0.18, 0.62, 0.05, 'strand'], ['crown', 0.82, 0.58, 0.05, 'strand'],
];
const DECOR_AR = { strand: 5.844, diya: 3.352, petals: 0.456, toran: 0.347 };
const decoImg = (d, i) => {
  const [, , , , kind, hindu, only] = d;
  const set = { toran: '/themes/_nepali/toran-sm.webp 900w, /themes/_nepali/toran.webp 1800w', petals: `${ART}petals-sm.webp 520w, ${ART}petals.webp 900w` }[kind];
  const src = kind === 'toran' ? '/themes/_nepali/toran-sm.webp' : `${ART}${kind}${kind === 'petals' ? '-sm' : ''}.webp`;
  return `<img class="kt-deco kt-deco--${kind}${only ? ` kt-deco--${only}` : ''}" data-i="${i}" src="${src}"${set ? ` srcset="${set}" sizes="(min-width: 900px) 900px, 100vw"` : ''} alt="" decoding="async"${hindu ? ' data-hindu' : ''} />`;
};
const pic = (name, { cls = '', sizes = '100vw', alt = '', lazy = true, w = [640, 1152] } = {}) => `<img class="${cls}" src="${ART}${name}-sm.webp" srcset="${ART}${name}-sm.webp ${w[0]}w, ${ART}${name}.webp ${w[1]}w" sizes="${sizes}" alt="${alt}" decoding="async"${lazy ? ' loading="lazy"' : ''} />`;
const one = (name, { cls = '', alt = '', lazy = true } = {}) => `<img class="${cls}" src="${ART}${name}.webp" alt="${alt}" decoding="async"${lazy ? ' loading="lazy"' : ''} />`;
const reducedNow = () => document.body.classList.contains('kt-still');

// ───────── the opening: a leaf on a thread ─────────
function gate(ctx) {
  const { bi, c, txt } = ctx;
  // the first letter as a reader sees it (Devanagari: the whole cluster, बि not ब)
  const first = (t) => { const v = String(t || '').trim(); if (!v) return ''; try { return [...new Intl.Segmenter('ne', { granularity: 'grapheme' }).segment(v)][0].segment; } catch { return v.charAt(0); } };
  const ini = (p) => bi({ en: first(p.name?.en || p.name?.ne), ne: first(p.name?.ne || p.name?.en) });
  return `<div class="kt-g">
    <div class="kt-g__paper"></div>
    <div class="kt-g__canopy">${pic('crown', { sizes: '100vw', lazy: false })}</div>
    <div class="kt-g__hang" id="kt-hang">
      <span class="kt-g__thread" aria-hidden="true"></span>
      <svg class="kt-g__knot" viewBox="0 0 60 46" aria-hidden="true" focusable="false">
        <g class="kt-end kt-end--l"><path d="M30 20 C 22 26, 18 34, 14 44" /><path class="y" d="M30 20 C 23 27, 19 35, 16 45" /></g>
        <g class="kt-end kt-end--r"><path d="M30 20 C 38 26, 42 34, 46 44" /><path class="y" d="M30 20 C 37 27, 41 35, 44 45" /></g>
        <ellipse cx="30" cy="18" rx="7.5" ry="6" />
        <ellipse class="y" cx="28" cy="16.5" rx="3" ry="2.2" />
      </svg>
      <div class="kt-leaf" id="kt-leaf">
        <div class="kt-leaf__face kt-leaf__front">
          ${pic('leaf', { sizes: '300px', lazy: false, w: [400, 760] })}
          <p class="kt-leaf__mono"><span>${ini(c.bride)}</span><i aria-hidden="true"></i><span>${ini(c.groom)}</span></p>
        </div>
        <div class="kt-leaf__face kt-leaf__back">
          ${pic('leaf', { sizes: '300px', lazy: false, w: [400, 760] })}
          <div class="kt-leaf__text" id="kt-leaf-text">
            <p class="kt-leaf__k">${bi(txt('hero.title'))}</p>
            <p class="kt-leaf__names"><span class="kt-leaf__n">${bi(c.bride.name)}</span><span class="kt-leaf__amp" aria-hidden="true">&amp;</span><span class="kt-leaf__n">${bi(c.groom.name)}</span></p>
            <p class="kt-leaf__d">${bi({ en: `${ctx.AD.day} ${ctx.AD.month.en} ${ctx.AD.year}`, ne: ctx.BS.full.short?.ne || ctx.BS.full.ne })}</p>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ───────── the first screen: the whole tree ─────────
const BIRDS = [ // perched spots in the crown (fractions of the tree box), flight to (vw, vh fractions), size, delay
  { x: 0.3, y: 0.14, tx: -0.25, ty: -0.42, s: 0.95, d: 0 },
  { x: 0.62, y: 0.1, tx: 1.18, ty: -0.5, s: 1, d: 0.08 },
  { x: 0.47, y: 0.22, tx: 1.25, ty: -0.12, s: 0.8, d: 0.2 },
  { x: 0.2, y: 0.3, tx: -0.3, ty: -0.05, s: 0.72, d: 0.28 },
  { x: 0.78, y: 0.26, tx: 1.3, ty: -0.3, s: 0.68, d: 0.12 },
  { x: 0.55, y: 0.06, tx: 0.7, ty: -0.62, s: 0.62, d: 0.34 },
];
function hero(ctx) {
  const { bi, c, txt, on, AD, BS, placeLine, esc } = ctx;
  return `<div class="kt-hero">
    <div class="kt-hero__copy">
      ${on(txt('hero.invocation')) ? `<p class="kt-hero__inv su-in">${bi(txt('hero.invocation'))}</p>` : ''}
      <p class="kt-k su-in">${bi(txt('hero.title'))}</p>
      <h1 class="kt-hero__names su-in"><span class="kt-hero__n">${bi(c.bride.name)}</span><span class="kt-hero__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span><span class="kt-hero__n">${bi(c.groom.name)}</span></h1>
      <p class="kt-hero__date su-in">${bi({ en: `${AD.wd.en}, ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.full.ne })}<span class="kt-hero__bs">${bi({ en: BS.full.short?.en ? (/B\.S\./.test(BS.full.short.en) ? BS.full.short.en : `${BS.full.short.en} B.S.`) : BS.full.en, ne: AD.full.ne })}</span></p>
      ${placeLine?.en || placeLine?.ne ? `<p class="kt-hero__place su-in">${bi(placeLine)}</p>` : ''}
      ${on(txt('hero.line')) ? `<p class="kt-hero__line su-in">${bi(txt('hero.line'))}</p>` : ''}
    </div>
    <div class="kt-hero__tree" id="kt-htree">
      ${pic('tree', { sizes: '(min-width: 900px) 46vh, 75vw', lazy: false, w: [560, 1024], alt: esc('A great old peepal tree wound with red and yellow threads and marigold garlands') })}
      <span class="kt-hero__mark" id="kt-mark" aria-hidden="true"></span>
    </div>
    <div class="kt-flock" id="kt-flock" aria-hidden="true">${BIRDS.map((b, i) => `<span class="kt-bird" data-i="${i}">${one('bird-up', { cls: 'kt-bird__a', lazy: false })}${one('bird-down', { cls: 'kt-bird__b', lazy: false })}</span>`).join('')}</div>
  </div>`;
}

// ───────── the climb ─────────
function page(ctx) {
  const { bi, esc, txt, on, parts: P, c, config } = ctx;
  const hd = (title, kicker, id) => `<header class="kt-head">${kicker && on(kicker) ? `<p class="kt-k">${bi(kicker)}</p>` : ''}<h2 class="kt-h"${id ? ` id="${id}"` : ''}>${bi(title)}</h2></header>`;
  const st = (key, side, anchor, inner, extra = '') => `<article class="kt-st kt-st--${key}" data-side="${side}" data-anchor="${anchor}"${extra}>${inner}</article>`;
  const crop = (n) => `<figure class="kt-crop kt-crop--${n}" aria-hidden="true">${pic(n, { sizes: '(min-width: 900px) 760px, 100vw' })}</figure>`;
  const stations = [];

  // the roots: the elders' blessing, Ganesh, the kalash and the diyo at the shrine
  stations.push(crop('roots'));
  stations.push(st('roots', 'c', 'roots:0.7:0.8', `
    <div class="kt-shrine" aria-hidden="true">${kalash('kt-shrine__kalash', '120px')}${ctx.ganeshRef ? `<span class="kt-shrine__gan">${ctx.ganesh('', '110px')}</span>` : ''}${lamp('diyo', { cls: 'kt-shrine__diyo', sizes: '90px' })}</div>
    <div class="kt-paper kt-paper--roots">
      ${hd(txt('roots.title'), txt('roots.kicker'))}
      <p class="kt-lede">${bi(txt('card.line'))}</p>
      ${(config.hosts?.en || config.hosts?.ne) ? `<p class="kt-hosts">${bi(config.hosts)}</p>` : ''}
      ${P.cardBtn('su-btn--line')}
    </div>`));

  // the trunk: the couple in a carved frame tied with mauli
  if (P.lead) {
    stations.push(st('trunk', 'l', 'trunk:0.5:0.42', `
      <figure class="kt-carved">
        <div class="kt-carved__pic">${ctx.imgTag(P.lead.photo, P.lead.alt, '(min-width: 900px) 300px, 64vw', { cls: 'kt-carved__img' })}</div>
        ${one('frame', { cls: 'kt-carved__frame', lazy: true })}
      </figure>
      <div class="kt-slip">${hd(txt('couple.title'), null)}${on(txt('couple.line')) ? `<p class="kt-lede">${bi(txt('couple.line'))}</p>` : ''}</div>`));
  }

  // the fork: the two families on the two boughs (left the groom's, right the bride's)
  stations.push(crop('fork'));
  const fam = (f) => `<div class="kt-board kt-board--${f.key}">
      <span class="kt-board__cords" aria-hidden="true"></span>
      <div class="kt-board__plank">
        ${P.brideGroom ? `<figure class="kt-board__pic">${ctx.imgTag(f.photo, f.person.name.en, '96px')}</figure>` : ''}
        <p class="kt-board__label">${bi(f.label)}</p>
        <p class="kt-board__name">${bi(f.person.fullName)}</p>
        ${(f.person.parents?.en || f.person.parents?.ne) ? `<p class="kt-board__of">${bi(f.of)}</p><p class="kt-board__par">${bi(f.person.parents)}</p>` : ''}
        ${(f.person.home?.en || f.person.home?.ne) ? `<p class="kt-board__home">${bi(f.person.home)}</p>` : ''}
      </div>
    </div>`;
  const groom = P.families.find((f) => f.key === 'groom'); const bride = P.families.find((f) => f.key === 'bride');
  stations.push(st('fork', 'c', 'fork:0.42:0.5', `<div class="kt-slip">${hd(txt('families.title'), null)}</div><div class="kt-boards">${fam(groom)}${fam(bride)}</div>`));

  // a few photographs, hung on threads
  if (P.photos.length) {
    const show = P.photos.slice(0, 4);
    stations.push(st('photos', 'r', 'fork:0.1:0.5', `<div class="kt-slip">${hd(txt('gallery.title'), null)}</div>
      <ul class="kt-prints kt-prints--${show.length}">${show.map((g, i) => `<li class="kt-print" style="--r:${[-2.2, 1.6, 1.2, -1.4][i]}deg">${P.photoBtn(g, i, '(min-width: 900px) 190px, 42vw', 'kt-print__btn')}</li>`).join('')}</ul>
      ${P.photos.length > 4 ? `<button class="su-btn su-btn--line kt-more" type="button" data-lb-idx="4">${bi({ en: `All ${P.photos.length} photographs`, ne: `सबै ${ctx.neNum(String(P.photos.length))} तस्बिर` })}</button>` : ''}`));
  }

  // the upper branches: one lantern per celebration
  const n = P.events.length;
  P.events.forEach((ev, i) => {
    const f = n > 1 ? 0.88 - (0.7 * i) / (n - 1) : 0.5;
    const hasDress = !!(ev.dress.text?.en || ev.dress.text?.ne || ev.dress.colors.length);
    const bsLine = ev.bs.full.short?.en ? (/B\.S\./.test(ev.bs.full.short.en) ? ev.bs.full.short.en : `${ev.bs.full.short.en} B.S.`) : ev.bs.full.en;
    stations.push(st('ev', i % 2 ? 'r' : 'l', `branches:${f.toFixed(3)}:0.5`, `
      <div class="kt-lantern" aria-hidden="true">${one('lantern', { cls: 'kt-lantern__img' })}<i class="kt-lantern__glow"></i></div>
      <div class="kt-paper kt-paper--ev" id="ev-${esc(ev.id)}">
        ${i === 0 ? `<p class="kt-k">${bi(txt('prog.kicker'))}</p><p class="kt-ev__group">${bi(txt('prog.title'))}</p>` : ''}
        <p class="kt-ev__no">${bi({ en: `${i + 1} of ${n}`, ne: `${ctx.neNum(String(i + 1))} / ${ctx.neNum(String(n))}` })}</p>
        <h3 class="kt-ev__title">${bi(ev.title)}</h3>
        <p class="kt-ev__date">${bi({ en: ev.ad.full.en, ne: ev.bs.full.ne })}</p>
        <p class="kt-ev__alt">${bi({ en: bsLine, ne: ev.ad.full.ne })}</p>
        <dl class="kt-ev__dl">
          <div><dt>${bi(P.UI.time)}</dt><dd>${bi(ev.time)}</dd></div>
          <div><dt>${bi(P.UI.venue)}</dt><dd>${bi(ev.venue)} <a class="su-link" href="${esc(ev.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></dd></div>
          ${hasDress ? `<div><dt>${bi(P.UI.wear)}</dt><dd class="kt-ev__dress">${ev.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : P.UI.wear)}</span></dd></div>` : ''}
        </dl>
        ${ev.blurb && (ev.blurb.en || ev.blurb.ne) ? `<p class="kt-ev__blurb">${bi(ev.blurb)}</p>` : ''}
        ${ev.rituals.length ? `<details class="kt-ev__order"><summary>${bi(P.UI.order)}</summary><ol>${ev.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
      </div>`));
  });

  // the nest: two parakeets keep the countdown
  stations.push(st('nest', 'c', 'branches:0.06:0.36', `
    <figure class="kt-nest" aria-hidden="true">${pic('nest', { sizes: '(min-width: 900px) 380px, 78vw', w: [480, 900] })}</figure>
    <div class="kt-paper kt-paper--count">
      <div class="kt-count" data-countdown>
        <p class="kt-h kt-count__t">${bi(txt('count.title'))}</p>
        <ol class="kt-count__grid" aria-label="${esc(txt('count.title').en)}">${P.countUnits.map((x) => `<li>${P.countNum(x.u, 'kt-count__n')}<span class="kt-count__l">${bi(x.label)}</span></li>`).join('')}</ol>
        <p class="kt-count__done" data-count-done hidden></p>
      </div>
      <p class="kt-count__when">${bi({ en: ctx.AD.full.en, ne: ctx.BS.full.ne })}</p>
      <div class="kt-btns">${P.calendarBtn()}${P.shareBtn()}</div>
    </div>`));

  // the crown
  stations.push(crop('crown'));
  stations.push(st('crown', 'c', 'crown:0.4:0.5', `
    <div class="kt-paper kt-paper--crown">
      ${hd(txt('crown.title'), null)}
      <p class="kt-lede">${bi(txt('crown.line'))}</p>
      <p class="kt-crown__names">${bi(c.bride.name)} <span aria-hidden="true">&amp;</span><span class="sr-only">and</span> ${bi(c.groom.name)}</p>
      <a class="su-btn kt-tie" href="#rsvp">${bi(txt('rsvp.title'))}</a>
    </div>`));

  const wishes = [1, 2, 3, 4, 5, 6].map((k) => txt(`wish.${k}`)).filter(on);
  const RIB = ['#C42B28', '#E3A21A', '#D9547A', '#C42B28', '#7DB14A', '#E3A21A'];
  return `
  <section class="su-hero kt-top" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${hero(ctx)}
    ${P.cue('kt-climb')}
  </section>

  <section class="kt-climb" id="kt-climb" aria-label="${esc(txt('hero.line').en || 'The invitation')}">
    <div class="kt-stage" id="kt-stage">
      <div class="kt-tree" id="kt-tree" aria-hidden="true">${PANELS.map((p) => `<div class="kt-p kt-p--${p.n}" data-n="${p.n}">${pic(p.n, { sizes: '(min-width: 900px) 1000px, 112vw', lazy: p.n !== 'roots' })}</div>`).join('')}${DECOR.map(decoImg).join('')}</div>
      <div class="kt-side kt-side--l" aria-hidden="true"></div><div class="kt-side kt-side--r" aria-hidden="true"></div>
      <i class="kt-corner" aria-hidden="true"></i>
      <div class="kt-flow" id="kt-flow">${stations.join('')}</div>
      <div class="kt-gauge" aria-hidden="true"><i class="kt-gauge__knot"></i></div>
    </div>
  </section>

  <section class="kt-sky" id="rsvp" aria-labelledby="rsvp-title">
    <div class="kt-reply">
      <span class="kt-reply__tie" aria-hidden="true"><svg viewBox="0 0 120 70" focusable="false"><path class="r" d="M60 34 C 40 6, 10 8, 14 30 C 18 50, 44 40, 60 34 Z"/><path class="r" d="M60 34 C 80 6, 110 8, 106 30 C 102 50, 76 40, 60 34 Z"/><path class="t" d="M58 36 C 50 50, 44 60, 36 70"/><path class="t" d="M62 36 C 70 50, 76 60, 84 70"/><circle class="k" cx="60" cy="34" r="7"/></svg></span>
      ${hd(txt('rsvp.title'), null, 'rsvp-title')}
      ${(P.deadline?.en || P.deadline?.ne) ? `<p class="kt-lede">${bi(P.deadline)}</p>` : ''}
      ${P.rsvpForm()}
    </div>
    <div class="kt-wishes" aria-labelledby="wish-title">
      <h2 class="kt-h kt-wishes__t" id="wish-title">${bi(txt('wish.title'))}</h2>
      <div class="kt-wishes__thread" aria-hidden="true">
        <svg class="kt-wishes__line" viewBox="0 0 1000 60" preserveAspectRatio="none" focusable="false"><path d="M0 8 Q 500 70 1000 8" /></svg>
        ${[0.08, 0.2, 0.33, 0.67, 0.8, 0.92].map((x, i) => `<i class="kt-wishes__strip" style="left:${x * 100}%;top:${(8 + 62 * 4 * x * (1 - x)) * 0.56}px;--rib:${RIB[(i + 1) % RIB.length]};--h:${[34, 46, 28, 40, 30, 44][i]}px;--r:${[-4, 3, -2, 2, -3, 4][i]}deg"></i>`).join('')}
      </div>
      <ul class="kt-ribbons" id="kt-ribbons">${wishes.map((w, i) => `<li class="kt-rib" style="--rib:${RIB[i % RIB.length]};--r:${[-3, 2, -1.5, 3, -2, 1.5][i]}deg"><span class="kt-rib__tie" aria-hidden="true"></span><p class="kt-rib__note">${bi(w)}</p></li>`).join('')}</ul>
      <p class="kt-wishes__empty"${wishes.length ? ' hidden' : ''}>${bi(txt('wish.empty'))}</p>
    </div>
    ${P.moreInfo() ? `<div class="kt-info">${P.moreInfo()}</div>` : ''}
  </section>

  <footer class="kt-close" aria-label="Blessing">
    <p class="kt-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
    <p class="kt-close__en l-en">${esc(config.closing?.en || '')}</p>
    <p class="kt-close__names">${bi(c.bride.name)} <span aria-hidden="true">&amp;</span><span class="sr-only">and</span> ${bi(c.groom.name)}</p>
    ${c.hashtag ? `<p class="kt-close__tag">${esc(c.hashtag)}</p>` : ''}
    ${P.madeWith()}
  </footer>`;
}

// ───────── the climb's engine ─────────
function climb(ctx) {
  const { ScrollTrigger } = ctx;
  const sec = document.getElementById('kt-climb');
  const stage = document.getElementById('kt-stage');
  const tree = document.getElementById('kt-tree');
  const flow = document.getElementById('kt-flow');
  const knot = sec.querySelector('.kt-gauge__knot');
  const gaugeH = () => sec.querySelector('.kt-gauge').clientHeight;
  const els = Object.fromEntries([...tree.querySelectorAll('.kt-p')].map((e) => [e.dataset.n, e]));
  const sts = [...flow.querySelectorAll('.kt-st')];
  // everything on the climb loads now: a picture arriving late would change a station's height mid-climb
  flow.querySelectorAll('img[loading="lazy"]').forEach((im) => { im.loading = 'eager'; });
  if (reducedNow()) { sec.classList.add('is-static'); sts.forEach((s) => s.classList.add('is-here')); return; }
  sec.classList.add('is-live');

  const DEPTH = 1.22;
  const sideL = stage.querySelector('.kt-side--l'); const sideR = stage.querySelector('.kt-side--r');
  let sidesOn = false; let sideBase = 0;
  let vw = 0; let vh = 0; let W = 0; let Ht = 0; let D = 1; let keys = []; let geo = {}; let centres = []; let gh = 0;
  function layout() {
    vw = stage.clientWidth; vh = stage.clientHeight;
    const wide = vw >= 900;
    W = wide ? Math.min(1000, vh * 1.1, vw * 0.72) : Math.max(vw * 1.12, 400);
    // stack the paintings from the roots up
    let bottom = 0; geo = {};
    PANELS.forEach((p, i) => {
      const h = p.s * W * R;
      if (i) bottom -= p.ov * W;
      geo[p.n] = { bottom, h, left: p.x * W, w: p.s * W, c: (p.x + p.s * p.c) * W };
      bottom += h;
    });
    Ht = bottom;
    PANELS.forEach((p) => {
      const g = geo[p.n]; const e = els[p.n];
      g.top = Ht - g.bottom - g.h;
      Object.assign(e.style, { left: `${g.left}px`, top: `${g.top}px`, width: `${g.w}px`, height: `${g.h}px` });
      e.style.setProperty('--fade', `${Math.min(60, ((p.ov * W) / g.h) * 100 + 2).toFixed(1)}%`);
    });
    tree.style.height = `${Ht}px`; tree.style.width = `${W}px`;
    // the decoration hangs from its painting's branches
    tree.querySelectorAll('.kt-deco').forEach((el) => {
      const [n, x, y, w, kind] = DECOR[Number(el.dataset.i)];
      const g = geo[n]; const ww = w * W;
      Object.assign(el.style, { left: `${g.left + x * g.w - ww / 2}px`, top: `${g.top + y * g.h}px`, width: `${ww}px`, height: `${ww * DECOR_AR[kind]}px` });
    });
    sidesOn = wide;
    if (wide) {
      // desktop: painted canopy fills the sides, a nearer layer that moves a little faster than the tree
      const sw = Math.round((vw - W) / 2 + W * 0.2); const th = sw * (1778 / 640); const step = th * 0.8;
      const travel = (Ht - vh) * DEPTH + vh; const n = Math.ceil(travel / step) + 1;
      [sideL, sideR].forEach((side, k) => {
        if (side.childElementCount !== n) side.innerHTML = Array.from({ length: n }, (_, i) => `<img src="${ART}side-${(i + k) % 2 ? 'b' : 'a'}.webp" alt="" decoding="async" style="top:${(i * step).toFixed(1)}px" />`).join('');
        else [...side.children].forEach((im, i) => { im.style.top = `${(i * step).toFixed(1)}px`; });
        Object.assign(side.style, { width: `${sw}px`, height: `${(n - 1) * step + th}px` });
        side.style.setProperty('--th', `${th}px`);
      });
      sideBase = -((n - 1) * step + th - vh);
    }
    // the paper side: the first and last station sit in the middle of the screen at the two ends
    const first = sts[0]; const last = sts[sts.length - 1];
    flow.style.paddingBottom = `${Math.max(24, (vh - first.offsetHeight) / 2)}px`;
    flow.style.paddingTop = `${Math.max(24, (vh - last.offsetHeight) / 2)}px`;
    const Hc = flow.offsetHeight;
    D = Math.max(1, Hc - vh);
    // key frames: when each station is centred, the tree shows its own part of the tree behind it
    // the camera follows the trunk, but never shows the edge of a painting (phone: the fork sits flush right, so its
    // painted garlands hang whole)
    const camAt = (n) => {
      const g = geo[n]; const lo = vw - (g.left + g.w); const hi = -g.left;
      const want = !wide && n === 'fork' ? lo : vw / 2 - g.c;
      return lo <= hi ? Math.min(hi, Math.max(lo, want)) : vw / 2 - g.c;
    };
    centres = sts.map((s) => s.offsetTop + s.offsetHeight / 2);
    const k = [{ p: 0, y: -(Ht - vh), x: camAt('roots') }];
    sts.forEach((s, i) => {
      const [n, fy, at] = s.dataset.anchor.split(':');
      const g = geo[n]; if (!g) return;
      const p = Math.min(1, Math.max(0, 1 - (centres[i] - vh / 2) / D));
      const y = Math.min(0, Math.max(-(Ht - vh), vh * Number(at) - (g.top + Number(fy) * g.h)));
      k.push({ p, y, x: camAt(n) });
    });
    k.push({ p: 1, y: 0, x: camAt('crown') });
    k.sort((a, b) => a.p - b.p);
    for (let i = 1; i < k.length; i++) k[i].y = Math.max(k[i].y, k[i - 1].y); // the tree only ever comes down
    keys = k;
    gh = gaugeH();
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  function at(p) {
    let i = 1; while (i < keys.length - 1 && keys[i].p < p) i++;
    const a = keys[i - 1]; const b = keys[i];
    const t = b.p > a.p ? Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p))) : 1;
    const e = t * t * (3 - 2 * t); // ease between key frames: the tree lingers at each station
    return { y: lerp(a.y, b.y, e), x: lerp(a.x, b.x, e) };
  }
  let last = -1;
  function render(p) {
    if (Math.abs(p - last) < 1e-5) return;
    last = p;
    const yc = -D * (1 - p);
    const t = at(p);
    flow.style.transform = `translate3d(0,${yc.toFixed(1)}px,0)`;
    tree.style.transform = `translate3d(${t.x.toFixed(1)}px,${t.y.toFixed(1)}px,0)`;
    knot.style.transform = `translate3d(0,${((1 - p) * gh).toFixed(1)}px,0)`;
    if (sidesOn) {
      // nearer than the tree: it travels DEPTH times as far, from its bottom (the roots) to its top (the crown)
      const f = (Ht - vh) > 0 ? (t.y + (Ht - vh)) / (Ht - vh) : 1;
      const y = sideBase * (1 - f);
      sideL.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`;
      sideR.style.transform = `translate3d(0,${y.toFixed(1)}px,0) scaleX(-1)`;
    }
    for (let i = 0; i < sts.length; i++) {
      const s = centres[i] + yc;
      const near = Math.abs(s - vh / 2) < vh * 0.46;
      if (near !== sts[i].classList.contains('is-here')) sts[i].classList.toggle('is-here', near);
    }
  }
  layout();
  let trig = null;
  const st = ScrollTrigger.create({
    trigger: sec, start: 'top top', end: () => `+=${D}`, pin: stage, pinSpacing: true, scrub: true, anticipatePin: 1,
    invalidateOnRefresh: true,
    onRefreshInit: () => { last = -1; },
    onRefresh: (self) => { trig = self; layout(); last = -1; render(self.progress); },
    onUpdate: (self) => render(self.progress),
  });
  trig = st;
  render(0);
  // pictures and fonts that arrive later change the paper heights
  const relayout = () => { layout(); ScrollTrigger.refresh(); };
  document.fonts?.ready.then(relayout);
  flow.querySelectorAll('img').forEach((im) => { if (!im.complete) im.addEventListener('load', () => { clearTimeout(relayout.t); relayout.t = setTimeout(relayout, 120); }, { once: true }); });
  flow.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', relayout));
  // keyboard: tabbing into a station brings it to the middle of the screen
  const goTo = (i, immediate = false) => {
    const p = Math.min(1, Math.max(0, 1 - (centres[i] - vh / 2) / D));
    const y = trig.start + (trig.end - trig.start) * p;
    const l = ctx.lenis?.();
    if (l) l.scrollTo(y, { immediate, force: true }); else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
  };
  sts.forEach((s, i) => s.addEventListener('focusin', () => { if (!s.classList.contains('is-here')) goTo(i, true); }));
  if (new URLSearchParams(location.search).has('debug')) window.__kt = { go: (i) => goTo(i, true), n: sts.length, keys: () => keys, at: (p) => { const y = trig.start + (trig.end - trig.start) * p; const l = ctx.lenis?.(); if (l) l.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); } };
}

// ───────── the wish wall: the guest's own note is tied after their reply ─────────
function wishes(ctx) {
  const form = document.getElementById('rsvp-form');
  const list = document.getElementById('kt-ribbons');
  const empty = document.querySelector('.kt-wishes__empty');
  const status = document.getElementById('rsvp-status');
  if (!form || !list) return;
  const KEY = `kt-wish:${location.pathname}${new URLSearchParams(location.search).get('id') || ''}`;
  const tie = (note, name, fresh) => {
    const li = document.createElement('li');
    li.className = 'kt-rib kt-rib--mine';
    li.style.setProperty('--rib', '#C42B28'); li.style.setProperty('--r', '-2deg');
    const t = document.createElement('span'); t.className = 'kt-rib__tie'; t.setAttribute('aria-hidden', 'true');
    const p = document.createElement('p'); p.className = 'kt-rib__note';
    if (/[ऀ-ॿ]/.test(note)) p.classList.add('is-deva');
    p.textContent = note;
    const by = document.createElement('span'); by.className = 'kt-rib__by'; by.textContent = name;
    p.append(by);
    li.append(t, p);
    list.prepend(li);
    if (empty) empty.hidden = true;
    if (fresh && !ctx.reduced) gsap.fromTo(li, { y: -40, opacity: 0, rotation: -8 }, { y: 0, opacity: 1, rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
  };
  try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved?.note) tie(saved.note, saved.name, false); } catch { /* storage off */ }
  let pending = null;
  form.addEventListener('submit', () => {
    const note = String(form.elements.message?.value || '').trim().slice(0, 160);
    const name = String(form.elements.name?.value || '').trim().split(/\s+/)[0].slice(0, 40);
    pending = note && name ? { note, name } : null;
  }, true);
  new MutationObserver(() => {
    if (!pending || status.classList.contains('is-error') || !status.querySelector('.l-en')) return;
    const w = pending; pending = null;
    tie(w.note, w.name, true);
    try { localStorage.setItem(KEY, JSON.stringify(w)); } catch { /* storage off */ }
  }).observe(status, { childList: true });
}

// ───────── the opening's timeline pieces ─────────
function fitLeaf() {
  const box = document.getElementById('kt-leaf-text');
  if (!box) return;
  const names = box.querySelector('.kt-leaf__names');
  names.style.fontSize = '';
  const max = box.clientWidth;
  let fs = parseFloat(getComputedStyle(names).fontSize);
  for (let i = 0; i < 12 && [...names.querySelectorAll('.kt-leaf__n')].some((n) => n.scrollWidth > max); i++) { fs *= 0.92; names.style.fontSize = `${fs}px`; }
}
function fitHero() {
  const h = document.querySelector('.kt-hero__names');
  if (!h) return;
  h.style.fontSize = '';
  const max = h.parentElement.clientWidth;
  let fs = parseFloat(getComputedStyle(h).fontSize);
  for (let i = 0; i < 14 && [...h.querySelectorAll('.kt-hero__n')].some((n) => n.scrollWidth > max); i++) { fs *= 0.93; h.style.fontSize = `${fs}px`; }
}

function flock(tl, t) {
  const box = document.getElementById('kt-htree');
  const birds = [...document.querySelectorAll('.kt-bird')];
  tl.call(() => {
    const r = box.getBoundingClientRect();
    const host = document.getElementById('kt-flock').getBoundingClientRect();
    birds.forEach((b, i) => {
      const B = BIRDS[i];
      const w = Math.max(60, Math.min(150, r.width * 0.26)) * B.s;
      const x0 = r.left - host.left + B.x * r.width - w / 2; const y0 = r.top - host.top + B.y * r.height - w / 2;
      gsap.set(b, { width: w, x: x0, y: y0, opacity: 0, scale: 0.6, rotation: B.tx < 0.5 ? 8 : -8, scaleX: B.tx < 0.5 ? -1 : 1 });
      b.classList.add('is-flying');
      const g = gsap.timeline({ delay: B.d, onComplete: () => { b.classList.remove('is-flying'); gsap.set(b, { opacity: 0 }); } });
      g.to(b, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' }, 0)
        .to(b, { x: B.tx * host.width - w / 2, duration: 2.2, ease: 'power1.in' }, 0)
        .to(b, { y: B.ty * host.height, duration: 2.2, ease: 'power2.in' }, 0)
        .to(b, { rotation: B.tx < 0.5 ? 14 : -14, duration: 2.2, ease: 'none' }, 0);
    });
  }, null, t);
}

const SPEC = {
  slug: 'kalpataru',
  manifest,
  bell: false,
  gate: (ctx) => gate(ctx),
  hero: (ctx) => hero(ctx),
  page: (ctx) => page(ctx),

  ready: (ctx) => {
    if (ctx.reduced) document.body.classList.add('kt-still');
    initNepali();
    fitLeaf(); fitHero();
    document.fonts?.ready.then(() => { fitLeaf(); fitHero(); });
    let rw = window.innerWidth;
    window.addEventListener('resize', () => { if (window.innerWidth === rw) return; rw = window.innerWidth; fitLeaf(); fitHero(); });
  },

  // the leaf itself is a tap target too (the buttons stay the accessible way in)
  gateTap: (ctx, go) => document.getElementById('kt-leaf')?.addEventListener('click', go),

  open: (ctx, tl, gateEl) => {
    const leaf = document.getElementById('kt-leaf');
    const hang = document.getElementById('kt-hang');
    const box = document.getElementById('kt-htree');
    const mark = document.getElementById('kt-mark');
    const canopy = gateEl.querySelector('.kt-g__canopy');
    // 1 · the knot lets go: its two ends swing free, the thread lifts away
    tl.to(gateEl.querySelector('.kt-end--l'), { rotation: -38, x: -6, duration: 0.6, ease: 'back.out(2)', svgOrigin: '30 20' }, 0.05)
      .to(gateEl.querySelector('.kt-end--r'), { rotation: 38, x: 6, duration: 0.6, ease: 'back.out(2)', svgOrigin: '30 20' }, 0.05)
      .to([gateEl.querySelector('.kt-g__thread'), gateEl.querySelector('.kt-g__knot')], { yPercent: -60, opacity: 0, duration: 0.7, ease: 'power2.in' }, 0.45);
    // 2 · the leaf turns over: the names on its back
    tl.to(leaf, { rotationY: 180, duration: 1.0, ease: 'power3.inOut' }, 0.35)
      .to(leaf, { y: -8, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.35);
    // 3 · the pull back: it was one leaf of a great tree (the tree and the leaf move as one)
    const T0 = 2.15; const DUR = 1.7;
    tl.call(() => {
      const L = leaf.getBoundingClientRect(); const M = mark.getBoundingClientRect(); const Bx = box.getBoundingClientRect();
      const lx = L.left + L.width / 2; const ly = L.top + L.height / 2;
      const mx = M.left + M.width / 2; const my = M.top + M.height / 2;
      const S = Math.min(7, L.width / M.width);
      const ox = mx - Bx.left; const oy = my - Bx.top;
      gsap.set(box, { transformOrigin: `${ox}px ${oy}px`, x: lx - mx, y: ly - my, scale: S, opacity: 1 });
      gsap.timeline()
        .to(box, { x: 0, y: 0, scale: 1, duration: DUR, ease: 'expo.inOut' }, 0)
        .to(leaf, { x: mx - lx, y: my - ly, scale: 1 / S, duration: DUR, ease: 'expo.inOut' }, 0)
        .to(leaf, { opacity: 0, duration: 0.45, ease: 'power1.out' }, DUR - 0.35);
    }, null, T0);
    tl.set(box, { opacity: 0 }, 0).set(box, { opacity: 1 }, T0);
    tl.to(canopy, { opacity: 0, duration: 0.6, ease: 'power1.out' }, T0 + 0.05);
    tl.to(gateEl.querySelector('.kt-g__paper'), { opacity: 0, duration: 0.7, ease: 'power1.out' }, T0 + 0.05);
    tl.set(gateEl, { pointerEvents: 'none' }, T0);
    // 4 · the parakeets lift off the crown
    flock(tl, T0 + DUR - 0.25);
    tl.set(gateEl, { autoAlpha: 0 }, T0 + DUR + 0.1);
    tl.to({}, { duration: 0.01 }, T0 + DUR + 0.15);
    return T0 + DUR * 0.5; // the words settle in as the tree lands
  },

  ambient: () => {},
  scroll: (ctx) => { climb(ctx); wishes(ctx); },
};
mountSuite(SPEC);
