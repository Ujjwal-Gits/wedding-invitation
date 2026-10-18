// Theme · Sanjhi (साँझी) — a hand-cut paper pop-up book at dusk (saanjh), in the stencil art of Vrindavan.
// Gate: the closed book, indigo cloth with a fine gold rule; on its cream paper plate lies a black Sanjhi stencil of two
// peacocks and lotuses. Tap: coloured powder sifts through the cut-outs and settles, the stencil lifts away, the
// coloured picture stays as the book's cover, and the cover opens on the first page, whose paper layers stand up.
// Signature (the one motion): every section is a spread of the book. Scrolling turns the page (rotateY about the spine
// on a wide screen, rotateX about the top spine on a phone) and 3-5 cut-paper layers rise out of the fold
// (rotateX 88deg to 0, staggered). Dusk deepens page by page: golden, rose, lilac, the moon, then the lamps of the mandap.
// Engine: src/themes/_suite/suite.js (T.gate, T.open, T.page, T.scroll, T.scratch, T.ready).
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import './sanjhi.css';

const ART = '/themes/sanjhi/art/';
const PHONE = '(max-width: 760px)';

// The spreads. Each layer: [file, wide { w: % of the page width, b: bottom % of the page height }, phone { w, b }].
// `hang` layers (the toran) hang from the top edge and drop down instead of standing up.
const SPREADS = {
  grove: [
    ['grove-kadamba', { w: 84, b: 11 }, { w: 112, b: 27 }],
    ['grove-mango', { w: 118, b: 5 }, { w: 104, b: 8.5 }],
    ['grove-cows', { w: 100, b: -1 }, { w: 150, b: 0 }],
    ['toran-band', { w: 101, t: -0.5, hang: true }, { w: 104, t: 5.5, hang: true }],
    ['garland-l', { w: 24, t: 8, l: 12, hang: true }, null],
    ['garland-r', { w: 24, t: 8, l: 88, hang: true }, null],
    ['ladi-rose', { w: 4.2, t: 30, l: 2.6, hang: true }, null, true],
    ['ladi-marigold', { w: 4.6, t: 30, l: 97.4, hang: true }, null, true],
  ],
  homes: [
    ['village', { w: 86, b: 24 }, { w: 124, b: 36 }],
    ['houses', { w: 108, b: 6 }, { w: 132, b: 13 }],
    ['fence', { w: 110, b: -1 }, { w: 160, b: 0 }],
  ],
  pond: [
    ['pavilion', { w: 84, b: 26 }, { w: 124, b: 38 }],
    ['lotus', { w: 104, b: 8 }, { w: 146, b: 11 }],
    ['pond-front', { w: 110, b: -1 }, { w: 160, b: 0 }],
  ],
  river: [
    ['ghat-skyline', { w: 88, b: 24 }, { w: 124, b: 34 }],
    ['river', { w: 78, b: 5 }, { w: 128, b: 9 }],
    ['reeds', { w: 108, b: -1 }, { w: 160, b: 0 }],
  ],
  mandap: [
    ['garden', { w: 96, b: 15 }, { w: 120, b: 22 }],
    ['mandap', { w: 62, b: 11 }, { w: 108, b: 13 }],
    ['kalash', { w: 82, b: -1 }, { w: 118, b: 0 }],
  ],
};

// The fresh flowers on every spread after page one, in paper: a marigold-and-rose garland (its two outer halves in the
// corners of a wide page, its centre across a phone's), and hanging strings of marigolds and of roses ending in a lotus.
// They hang below the corner buttons and beside the words, never behind them. `same`: one file for both widths.
const GARNISH = (flip) => [
  ['garland-l', { w: 27, t: 0, l: 13.5, hang: true }, null],
  ['garland-r', { w: 27, t: 0, l: 86.5, hang: true }, null],
  ['garland', null, { w: 98, t: 4.5, hang: true }, false, 'garland-m'],
  [flip ? 'ladi-rose' : 'ladi-marigold', { w: 4.2, t: 27, l: 2.6, hang: true }, { w: 11, t: 15, l: 7, hang: true }, true],
  [flip ? 'ladi-marigold' : 'ladi-rose', { w: 4.2, t: 27, l: 97.4, hang: true }, { w: 11, t: 15, l: 93, hang: true }, true],
];
['homes', 'pond', 'river', 'mandap'].forEach((k, i) => SPREADS[k].push(...GARNISH(i % 2 === 1)));

/** one cut-paper layer: a <picture> with the phone composition, standing on (or hanging from) the page.
 *  A layer without a phone spec is for wide pages only, one without a wide spec for phones only; `same` uses one file
 *  for both, `phoneFile` names the phone-only file. */
function layer([file, wide, ph, same, phoneFile], i, eager) {
  const pos = (o, s) => (o.hang ? `--t${s}:${o.t}%;` : `--b${s}:${o.b}%;`) + `--w${s}:${o.w}%;` + (o.l != null ? `--l${s}:${o.l}%;` : '');
  const any = wide || ph;
  const cls = `sj-l${any.hang ? ' sj-l--hang' : ''}${ph ? '' : ' sj-l--wide'}${wide ? '' : ' sj-l--phone'}`;
  const src = wide ? `${ART}${file}.webp` : `${ART}${phoneFile || `${file}-m`}.webp`;
  return `<picture class="${cls}" style="${wide ? pos(wide, '') : ''}${ph ? pos(ph, 'm') : ''}--z:${i}">
      ${wide && ph && !same ? `<source media="${PHONE}" srcset="${ART}${file}-m.webp" />` : ''}
      <img src="${src}" alt="" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" draggable="false" />
    </picture>`;
}

/** a page of the pop-up book: the dusk sky, the light, the lower page (floor), the layers and the words on the sky */
function stage(key, words, { eager = false, extra = '' } = {}) {
  const ls = SPREADS[key];
  return `<div class="sj-stage sj-stage--${key}">
      <div class="sj-sky" aria-hidden="true"></div>
      <div class="sj-glow" aria-hidden="true"></div>
      ${extra}
      <div class="sj-floor" aria-hidden="true"></div>
      <div class="sj-layers" aria-hidden="true">${ls.map((l, i) => layer(l, i, eager)).join('')}</div>
      <div class="sj-words">${words}</div>
    </div>`;
}

/** the coloured Sanjhi plate (the cover picture), small: the chapter pages and the back cover carry it */
const plate = () => ['warm', 'peacock', 'leaf'].map((k) => `<img src="${ART}powder-${k}.webp" alt="" loading="lazy" decoding="async" />`).join('');

/** the leaf that turns at the top of a spread: the chapter page in front, the back of the paper behind */
const leaf = (n, kicker, bi) => `<div class="sj-leaf" aria-hidden="true">
    <div class="sj-leaf__face sj-leaf__front">
      <picture class="sj-leaf__garland"><source media="${PHONE}" srcset="${ART}garland-m.webp" /><img src="${ART}garland.webp" alt="" loading="lazy" decoding="async" /></picture>
      <img class="sj-leaf__ladi sj-leaf__ladi--l" src="${ART}ladi-marigold.webp" alt="" loading="lazy" decoding="async" />
      <img class="sj-leaf__ladi sj-leaf__ladi--r" src="${ART}ladi-rose.webp" alt="" loading="lazy" decoding="async" />
      <div class="sj-leaf__pond"><picture><source media="${PHONE}" srcset="${ART}lotus-m.webp" /><img src="${ART}lotus.webp" alt="" loading="lazy" decoding="async" /></picture><picture><source media="${PHONE}" srcset="${ART}pond-front-m.webp" /><img src="${ART}pond-front.webp" alt="" loading="lazy" decoding="async" /></picture></div>
      <div class="sj-leaf__plate">${plate()}</div>
      <p class="sj-leaf__no">${bi({ en: `Page ${n}`, ne: `पाना ${'०१२३४५६७८९'[n]}` })}</p>
      <p class="sj-leaf__title">${bi(kicker)}</p>
      <i class="sj-leaf__shade"></i>
    </div>
    <div class="sj-leaf__face sj-leaf__back"><i class="sj-leaf__shade"></i></div>
  </div>`;

/** the open book's binding and page edges around a stage (the turning leaf lies on the page, outside its clip) */
const book = (inner, cls = '', over = '') => `<div class="sj-book ${cls}"><div class="sj-book__spine" aria-hidden="true"></div><div class="sj-book__edges" aria-hidden="true"></div><div class="sj-book__page">${inner}</div>${over}</div>`;

// ───────── the first grapheme of each name, for the stencil's empty centre ─────────
const first = (s) => {
  const t = String(s || '').trim();
  if (!t) return '';
  try { return [...new Intl.Segmenter('ne', { granularity: 'grapheme' }).segment(t)][0].segment; } catch { return t[0]; }
};

// ───────── the gate: the closed book with the stencil on its plate ─────────
const DUST = 34;
function gate(ctx) {
  const { c, bi, txt, esc } = ctx;
  const ini = { en: `${first(c.bride.name.en)}${first(c.groom.name.en)}`, ne: `${first(c.bride.name.ne || c.bride.name.en)}${first(c.groom.name.ne || c.groom.name.en)}` };
  const dust = Array.from({ length: DUST }, (_, i) => {
    const x = 8 + ((i * 37) % 84); const y = 10 + ((i * 53) % 80);
    const col = ['#E7882A', '#F2B33D', '#E5A2B2', '#C9405F', '#2C9A86', '#1F7A8A', '#5C8A48'][i % 7];
    return `<i style="left:${x}%;top:${y}%;--c:${col};--s:${0.6 + ((i * 7) % 5) / 6}"></i>`;
  }).join('');
  return `<div class="sj-gate">
    <div class="sj-desk"></div>
    <div class="sj-cover">
      <div class="sj-cover__inside"></div>
      <div class="sj-cover__front">
      <div class="sj-cover__cloth"></div>
      <div class="sj-cover__rule"></div>
      <p class="sj-cover__title">${bi(txt('hero.title'))}</p>
      <div class="sj-plate">
        <div class="sj-plate__paper"></div>
        <img class="sj-powder sj-powder--warm" src="${ART}powder-warm.webp" alt="" decoding="async" />
        <img class="sj-powder sj-powder--peacock" src="${ART}powder-peacock.webp" alt="" decoding="async" />
        <img class="sj-powder sj-powder--leaf" src="${ART}powder-leaf.webp" alt="" decoding="async" />
        <p class="sj-plate__ini"><span class="l-en">${esc(ini.en)}</span><span class="l-ne" lang="ne">${esc(ini.ne)}</span></p>
        <div class="sj-dust">${dust}</div>
        <div class="sj-stencil"><img src="${ART}stencil.webp" alt="" decoding="async" fetchpriority="high" /></div>
      </div>
      <p class="sj-cover__names">${ctx.names('&amp;')}</p>
      <p class="sj-cover__date">${bi({ en: `${ctx.AD.day} ${ctx.AD.month.en} ${ctx.AD.year}`, ne: ctx.BS.day ? `${ctx.BS.month} ${ctx.BS.day}, ${ctx.BS.year}` : ctx.AD.full.ne })}</p>
      <div class="sj-cover__pond"><img class="sj-cover__lotus" src="${ART}lotus.webp" alt="" decoding="async" /><img class="sj-cover__leaves" src="${ART}pond-front.webp" alt="" decoding="async" /></div>
      </div>
    </div>
  </div>`;
}

// ───────── the hero: page one, the mango grove with peacocks ─────────
function hero(ctx) {
  const { bi, txt, on, AD, BS } = ctx;
  const inv = txt('hero.invocation');
  const words = `
      ${on(inv) ? `<p class="sj-inv su-in" lang="ne">${bi(inv)}</p>` : ''}
      <p class="sj-hero__title su-in">${bi(txt('hero.title'))}</p>
      ${on(txt('hero.line')) ? `<p class="sj-hero__line su-in">${bi(txt('hero.line'))}</p>` : ''}
      <h1 class="sj-names su-in">${ctx.names('&amp;')}</h1>
      <p class="sj-hero__date su-in">${bi({ en: `${AD.wd.en} · ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.day ? `${AD.wd.ne}, ${BS.month} ${BS.day} गते, ${BS.year}` : AD.full.ne })}</p>
      ${BS.day ? `<p class="sj-hero__bs su-in l-en" lang="ne">${ctx.esc(`${BS.month} ${BS.day} गते, ${BS.year}`)}</p>` : ''}`;
  return book(stage('grove', words, { eager: true }), 'sj-book--hero');
}

/** the leaf turns, the layers rise (scrubbed with the scroll, inside a pinned spread) */
function spread(id, n, key, kicker, words, page, ctx, labelled) {
  return `<section class="sj-spread sj-spread--${key}" id="${id}" aria-labelledby="${labelled}">
    <div class="sj-spread__pin">${book(stage(key, words), '', leaf(n, kicker, ctx.bi))}</div>
    <div class="sj-sheet"><div class="sj-paper">${page}</div></div>
  </section>`;
}

// ───────── the scratch cover: the coloured Sanjhi plate itself ─────────
const PLATE = ['warm', 'peacock', 'leaf'].map((k) => { const im = new Image(); im.decoding = 'async'; im.onload = () => document.dispatchEvent(new Event('su-scratch-redraw')); im.src = `${ART}powder-${k}.webp`; return im; });
function powderCover(c, w, h, dpr, hint) {
  c.fillStyle = '#FBF2E2'; c.fillRect(0, 0, w, h);
  const s = Math.max(w, h) * 1.02;
  for (const im of PLATE) if (im.complete && im.naturalWidth) c.drawImage(im, (w - s) / 2, (h - s) / 2, s, s);
  // the hint on a cream paper tag (never straight on the colour)
  let fs = Math.round(Math.min(w * 0.05, 17 * dpr));
  c.font = `600 ${fs}px Mukta, sans-serif`;
  let tw = c.measureText(hint).width;
  if (tw > w * 0.72) { fs = Math.floor((fs * w * 0.72) / tw); c.font = `600 ${fs}px Mukta, sans-serif`; tw = c.measureText(hint).width; }
  const bw = tw + fs * 2.2; const bh = fs * 2.4;
  c.fillStyle = 'rgba(251,242,226,0.97)';
  c.beginPath();
  if (c.roundRect) c.roundRect((w - bw) / 2, (h - bh) / 2, bw, bh, 4 * dpr); else c.rect((w - bw) / 2, (h - bh) / 2, bw, bh);
  c.fill();
  c.strokeStyle = 'rgba(22,20,20,0.85)'; c.lineWidth = 1.2 * dpr; c.stroke();
  c.fillStyle = '#161414'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(hint, w / 2, h / 2 + fs * 0.06);
}

// ───────── the page ─────────
const TILT = [-2.2, 1.6, -1.1, 2.4, -1.8, 1.2, -2.6, 1.9, -0.8];
function page(ctx) {
  const { bi, esc, txt, on, AD, BS, c, config, placeLine, mainEv } = ctx;
  const P = ctx.parts;
  const hd = (id, t, cls = '') => `<h2 class="sj-h2 ${cls}" id="${id}">${bi(t)}</h2>`;
  const bsDeva = BS.day && BS.month ? `${BS.month} ${BS.day} गते, ${BS.year}` : BS.full.ne;
  const timeNe = mainEv ? String(ctx.timeLabel(mainEv).ne || '').split('–')[0].trim() : '';

  // page one (under the grove): the photograph tipped in, and the date under coloured powder
  const couple = P.lead ? `
    <section class="sj-part sj-couple" id="couple" aria-labelledby="couple-title">
      ${hd('couple-title', txt('couple.title'), 'su-rise')}
      <figure class="sj-tipped su-rise">
        <div class="sj-tipped__pic">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 760px) 78vw, 400px')}</div>
        <i class="sj-corner sj-corner--tl"></i><i class="sj-corner sj-corner--tr"></i><i class="sj-corner sj-corner--bl"></i><i class="sj-corner sj-corner--br"></i>
      </figure>
      ${on(txt('couple.line')) ? `<p class="sj-lede su-rise">${bi(txt('couple.line'))}</p>` : ''}
    </section>` : '';
  const face = `<div class="sj-dateface">
      <span class="sj-df__wd">${bi(AD.wd)}</span>
      <span class="sj-df__day">${bi({ en: AD.day, ne: BS.day || ctx.neNum(AD.day) })}</span>
      <span class="sj-df__my">${bi({ en: AD.monthYear.en, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</span>
      <span class="sj-df__alt"><span class="l-en" lang="ne">${esc(bsDeva)}</span><span class="l-ne" lang="ne">${esc(AD.full.ne)}</span></span>
      ${mainEv ? `<span class="sj-df__time">${bi({ en: AD.time, ne: timeNe })}</span>` : ''}
    </div>`;
  const dateSec = `
    <section class="sj-part sj-date" id="date" aria-labelledby="date-title">
      ${on(txt('date.kicker')) ? `<p class="sj-kicker su-rise">${bi(txt('date.kicker'))}</p>` : ''}
      ${hd('date-title', txt('date.title'), 'su-rise')}
      <div class="sj-plate2 su-rise">${P.scratch(face, 'sj-scratch')}</div>
      ${placeLine?.en || placeLine?.ne ? `<p class="sj-place su-rise">${bi(placeLine)}</p>` : ''}
    </section>`;
  const one = `<div class="sj-after sj-one"><div class="sj-sheet sj-sheet--one"><div class="sj-paper">${couple}${dateSec}</div></div></div>`;

  // page two: two homes facing each other
  const fam = (f, side) => `<article class="sj-home sj-home--${side} su-rise">
      ${P.brideGroom ? `<figure class="sj-home__pic">${ctx.imgTag(f.photo, f.person.name.en, '150px')}</figure>` : ''}
      <p class="sj-kicker">${bi(f.label)}</p>
      <p class="sj-home__name">${bi(f.person.fullName)}</p>
      ${f.person.parents?.en || f.person.parents?.ne ? `<p class="sj-home__of">${bi(f.of)}</p><p class="sj-home__parents">${bi(f.person.parents)}</p>` : ''}
      ${f.person.home?.en || f.person.home?.ne ? `<p class="sj-home__place">${bi(f.person.home)}</p>` : ''}
    </article>`;
  const famSec = spread('families', 2, 'homes', txt('families.kicker'),
    `<p class="sj-kick">${bi(txt('families.kicker'))}</p>${hd('fam-title', txt('families.title'), 'sj-h2--sky')}`,
    `<div class="sj-homes">${fam(P.families[0], 'l')}<span class="sj-homes__knot" aria-hidden="true"></span>${fam(P.families[1], 'r')}</div>`, ctx, 'fam-title');

  // page three: the lotus pond, each ceremony on its own paper tag
  const evs = P.events.map((v, i) => `
      <li class="sj-tag su-rise" id="ev-${esc(v.id)}" style="--r:${i % 2 ? 0.8 : -0.8}deg">
        <span class="sj-tag__hole" aria-hidden="true"></span>
        <div class="sj-tag__date" aria-hidden="true"><b>${bi({ en: v.ad.day, ne: v.bs.day || ctx.neNum(v.ad.day) })}</b><span>${bi({ en: v.ad.month.en.slice(0, 3), ne: v.bs.month || v.ad.month.ne })}</span></div>
        <div class="sj-tag__body">
          <h3 class="sj-tag__title">${bi(v.title)}</h3>
          <p class="sj-tag__when">${bi({ en: v.ad.full.en, ne: v.bs.full.ne })}</p>
          <p class="sj-tag__time">${bi(v.time)}</p>
          ${v.blurb ? `<p class="sj-tag__blurb">${bi(v.blurb)}</p>` : ''}
          <p class="sj-tag__venue">${bi(v.venue)} <a class="su-link" href="${esc(v.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
          ${v.dress.colors.length || v.dress.text?.en || v.dress.text?.ne ? `<p class="sj-tag__dress">${v.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${v.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(v.dress.text?.en || v.dress.text?.ne ? v.dress.text : P.UI.wear)}</span></p>` : ''}
          ${v.rituals.length ? `<details class="sj-order"><summary>${bi(P.UI.order)}</summary><ol>${v.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
        </div>
      </li>`).join('');
  const progSec = spread('programme', 3, 'pond', txt('prog.kicker'),
    `<p class="sj-kick">${bi(txt('prog.kicker'))}</p>${hd('prog-title', txt('prog.title'), 'sj-h2--sky')}`,
    `<ol class="sj-tags">${evs}</ol>
     <div class="sj-foot su-rise"><div class="sj-btns">${P.calendarBtn()}${P.shareBtn()}</div>${P.moreInfo()}</div>`, ctx, 'prog-title');

  // page four: the moon over the river; the countdown on the sky, the photographs on the page
  const moon = '<div class="sj-moon" aria-hidden="true"><i></i></div><div class="sj-stars" aria-hidden="true"></div>';
  const count = `<p class="sj-kick">${bi(txt('count.kicker'))}</p>
    <div class="sj-count" data-countdown>
      ${hd('count-title', txt('count.title'), 'sj-h2--sky sj-h2--small')}
      <ol class="su-count__grid sj-cd" aria-label="${esc(txt('count.title').en)}">${P.countUnits.map(({ u, label }) => `<li class="sj-cd__cell">${P.countNum(u, 'sj-cd__n')}<span class="sj-cd__l">${bi(label)}</span></li>`).join('')}</ol>
      <p class="sj-cd__done" data-count-done hidden></p>
    </div>`;
  const photos = P.photos.length ? `
    <div class="sj-part sj-photos" id="photos" aria-labelledby="gal-title">
      ${hd('gal-title', txt('gallery.title'), 'su-rise')}
      <div class="sj-album">${P.photos.map((g, i) => `<figure class="sj-plateph su-rise" style="--r:${TILT[i % TILT.length]}deg">${P.photoBtn(g, i, '(max-width: 760px) 44vw, 300px', 'sj-plateph__btn')}<i class="sj-corner sj-corner--tl"></i><i class="sj-corner sj-corner--br"></i></figure>`).join('')}</div>
    </div>` : '<p class="sj-lede sj-lede--moon su-rise">' + bi({ en: 'Counting the evenings until the lamps are lit.', ne: 'दियो बल्ने साँझ गन्दै।' }) + '</p>';
  const countSec = `<section class="sj-spread sj-spread--river" id="count" aria-labelledby="count-title">
    <div class="sj-spread__pin">${book(stage('river', count, { extra: moon }), '', leaf(4, txt('count.kicker'), bi))}</div>
    <div class="sj-sheet"><div class="sj-paper">${photos}</div></div>
  </section>`;

  // page five: under the mandap, the card wording and the reply
  const rsvpSec = spread('rsvp', 5, 'mandap', txt('rsvp.kicker'),
    `<p class="sj-kick">${bi(txt('rsvp.kicker'))}</p>${hd('rsvp-title', txt('rsvp.title'), 'sj-h2--sky')}`,
    `<div class="sj-word su-rise" id="card">
       <p class="sj-word__line">${bi(txt('card.line'))}</p>
       <p class="sj-word__hosts">${bi(config.hosts)}</p>
       ${P.cardBtn('su-btn--line')}
     </div>
     <div class="sj-reply su-rise">
       ${P.deadline?.en || P.deadline?.ne ? `<p class="sj-reply__by">${bi(P.deadline)}</p>` : ''}
       ${P.rsvpForm()}
     </div>`, ctx, 'rsvp-title');

  // the back cover: the book closes on the blessing
  const track = (config.music?.tracks || []).find((t) => t?.title?.en || t?.title?.ne);
  const back = `
  <footer class="su-close sj-back sj-after" aria-label="Blessing">
    <div class="sj-back__cloth">
      <div class="sj-back__rule" aria-hidden="true"></div>
      <div class="sj-back__in">
        <div class="sj-back__plate" aria-hidden="true">${plate()}</div>
        ${on(txt('back.line')) ? `<p class="sj-back__line">${bi(txt('back.line'))}</p>` : ''}
        <p class="sj-back__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
        <p class="sj-back__en l-en">${esc(config.closing?.en || '')}</p>
        <p class="sj-back__names">${ctx.names('&amp;')}</p>
        ${c.hashtag ? `<p class="sj-back__tag">${esc(c.hashtag)}</p>` : ''}
        ${track ? `<p class="sj-back__music">${bi({ en: 'Music', ne: 'संगीत' })} · ${bi(track.title)}</p>` : ''}
      </div>
    </div>
    ${P.madeWith()}
  </footer>`;

  return `
  <section class="su-hero sj-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${hero(ctx)}
    ${P.cue(P.lead ? 'couple' : 'date')}
  </section>
  ${one}
  <div class="sj-after sj-spreads">${famSec}${progSec}${countSec}${rsvpSec}</div>
  ${back}`;
}

// ───────── motion ─────────
const isPhone = () => window.matchMedia(PHONE).matches;
const LIE = 88; // a layer lying flat on the page, before it stands up

/** the layers of a stage stand up out of the fold, back first (tl positions in seconds or timeline units) */
function rise(gsap, tl, st, at, span = 1.1) {
  const ls = [...st.querySelectorAll('.sj-l')].filter((l) => l.offsetParent !== null);
  ls.forEach((l, i) => {
    const hang = l.classList.contains('sj-l--hang');
    const t = at + i * (span * 0.22);
    tl.fromTo(l, { rotationX: hang ? -LIE : LIE }, { rotationX: 0, duration: span * 0.8, ease: 'back.out(1.15)' }, t);
    tl.fromTo(l, { opacity: 0 }, { opacity: 1, duration: span * 0.12, ease: 'none' }, t);
  });
  tl.fromTo(st.querySelector('.sj-glow'), { opacity: 0.25 }, { opacity: 1, duration: span * 1.2, ease: 'power1.out' }, at);
  return at + (ls.length - 1) * span * 0.22 + span * 0.8;
}

/** the gate: powder sifts through the stencil, the stencil lifts, the cover opens; page one pops up */
function open(ctx, tl, gateEl) {
  const { gsap } = ctx;
  const g = gateEl.querySelector('.sj-gate');
  const phone = isPhone();
  document.body.classList.add('sj-moving');
  // 1 · colour powder falls through the cut-outs and settles
  const dust = [...g.querySelectorAll('.sj-dust i')];
  dust.forEach((d, i) => {
    const t = 0.1 + (i % 12) * 0.07 + Math.floor(i / 12) * 0.12;
    tl.fromTo(d, { y: -70 - (i % 5) * 18, opacity: 0, scale: 1.4 }, { y: 0, opacity: 0.95, scale: 1, duration: 0.55, ease: 'power2.in' }, t);
    tl.to(d, { opacity: 0, scale: 0.4, duration: 0.35, ease: 'power1.out' }, t + 0.55);
  });
  tl.fromTo(g.querySelector('.sj-powder--warm'), { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.inOut' }, 0.35);
  tl.fromTo(g.querySelector('.sj-powder--peacock'), { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.inOut' }, 0.6);
  tl.fromTo(g.querySelector('.sj-powder--leaf'), { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.inOut' }, 0.85);
  // 2 · the stencil lifts away, tipping back, and the coloured picture stays
  const sten = g.querySelector('.sj-stencil');
  tl.to(sten, { rotationX: -32, rotationZ: -4, yPercent: -128, z: 80, opacity: 0, duration: 1.0, ease: 'power3.in', transformPerspective: 900, transformOrigin: '50% 0%' }, 1.55);
  tl.fromTo(g.querySelector('.sj-plate__ini'), { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, 2.15);
  // 3 · the cover opens (about the spine: the left edge on a wide screen, the top on a phone); page one stands up
  const cover = g.querySelector('.sj-cover');
  const T0 = 2.75;
  tl.to(cover, phone
    ? { rotationX: -150, duration: 1.2, ease: 'power2.inOut', transformPerspective: 1500, transformOrigin: '50% 0%' }
    : { rotationY: -118, duration: 1.1, ease: 'power2.inOut', transformPerspective: 3200, transformOrigin: '0% 50%' }, T0);
  // past the edge-on moment the inside of the cover (the endpaper) faces us (no reliance on backface culling)
  tl.set(g.querySelector('.sj-cover__front'), { autoAlpha: 0 }, T0 + 0.62);
  tl.set(g.querySelector('.sj-cover__inside'), { autoAlpha: 1 }, T0 + 0.62);
  tl.to(cover, { opacity: 0, duration: phone ? 0.35 : 0.5, ease: 'none' }, T0 + (phone ? 0.6 : 0.5));
  tl.to(g.querySelector('.sj-desk'), { opacity: 0, duration: 0.9, ease: 'power1.inOut' }, T0 + 0.25);
  const st = document.querySelector('.sj-hero .sj-stage');
  const end = st ? rise(ctx.gsap, tl, st, T0 + 0.55) : T0 + 1.4;
  tl.set(gateEl, { autoAlpha: 0 }, T0 + 1.3);
  tl.call(() => document.body.classList.remove('sj-moving'), null, end);
  return T0 + 1.2;
}

/** after another theme's gate: page one pops up as it clears (the words follow, from the engine) */
function heroIntro(ctx, tl, t) {
  const st = document.querySelector('.sj-hero .sj-stage');
  if (ctx.reduced || !st) return;
  rise(ctx.gsap, tl, st, t);
}

/** the signature: each spread pins, its leaf turns and its layers rise, scrubbed with the scroll */
function scroll(ctx) {
  const { gsap, ScrollTrigger } = ctx;
  document.body.classList.add('sj-landed');
  document.querySelectorAll('.sj-hero .sj-l').forEach((l) => gsap.set(l, { clearProps: 'transform,opacity' }));
  if (ctx.reduced) return;
  const mm = gsap.matchMedia();
  mm.add({ phone: PHONE, wide: '(min-width: 761px)' }, (m) => {
    const phone = m.conditions.phone;
    document.querySelectorAll('.sj-spread').forEach((sec) => {
      const pin = sec.querySelector('.sj-spread__pin');
      const st = sec.querySelector('.sj-stage');
      const lf = sec.querySelector('.sj-leaf');
      const words = st.querySelectorAll('.sj-words > *');
      const tl = gsap.timeline({ defaults: { ease: 'none' },
        scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${Math.round(window.innerHeight * (phone ? 1.15 : 1.3))}`, pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true } });
      // the leaf: the chapter page lifts and turns over the spine, its shading deepening as it turns
      tl.fromTo(lf, phone ? { rotationX: 0 } : { rotationY: 0 }, { ...(phone ? { rotationX: 176 } : { rotationY: -176 }), duration: 1, ease: 'power1.inOut' }, 0);
      tl.fromTo(lf.querySelectorAll('.sj-leaf__shade'), { opacity: 0 }, { opacity: 0.55, duration: 0.5 }, 0.2);
      // past edge-on, the back of the paper faces us
      tl.fromTo(lf.querySelector('.sj-leaf__front'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.001 }, 0.5);
      tl.fromTo(lf.querySelector('.sj-leaf__back'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001 }, 0.5);
      tl.to(lf, { opacity: 0, duration: 0.15 }, 0.85);
      const end = rise(gsap, tl, st, 0.42, 0.95);
      tl.fromTo(words, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' }, Math.max(0.9, end - 0.6));
      tl.to({}, { duration: 0.25 }); // a beat at rest before the page scrolls on
    });
  });
  // the moon brightens as the countdown page opens (opacity only)
  ScrollTrigger.refresh();
}

mountSuite({
  slug: 'sanjhi',
  manifest,
  gate,
  hero,
  page,
  open,
  heroIntro,
  scroll,
  scratch: { paint: powderCover },
  ready(ctx) { if (ctx.reduced) document.body.classList.add('sj-still'); },
  gateTap(ctx, go) {
    document.querySelector('.sj-plate')?.addEventListener('click', go);
  },
});
