// Sandesh (सन्देश) · "the message". In the old way, birds carried word of a wedding.
// Opening: on an old-city rooftop at morning, two doves fly in carrying a folded letter tied with red-and-yellow mauli
// thread and set it down; tap the lac seal and it cracks in two, the thread falls, the letter unfolds in three panels
// to the names and a vermilion postmark is stamped with the date.
// Signature (the one moment that moves on scroll): the pair flies one path down the lime-washed wall and delivers the
// invitation as hand-stamped postcards, one by one; between deliveries they sit still on the last card.
// Body: postcards in a zig-zag down the wall (the couple's picture postcard, the families as two stamps, a stamp sheet
// that counts down, a postcard per ceremony with its own stamp and postmark), a postcard rack of photographs, the full
// letter, a reply postcard posted into a red pillar box, and the blessing under a garland.
import { gsap } from 'gsap';
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import './sandesh.css'; // after the suite's CSS, so the theme wins ties
import { timeZone } from '../../core/i18n.js';
import { view } from '../../photos.js';
import { ART, flyer, perched, createFlight } from './dove.js';

const params = new URLSearchParams(location.search);
const nepal = () => timeZone() === 'Asia/Kathmandu';
const pad2 = (n) => String(n).padStart(2, '0');

/** which painted stamp a ceremony carries (by its id or title, any language) */
function stampOf(e) {
  const s = `${e.id} ${e.title?.en || ''} ${e.title?.ne || ''}`.toLowerCase();
  if (/haldi|hald|हल्दी|बेसार/.test(s)) return 'stamp.haldi';
  if (/mehe?n?di|mehndi|मेहन्दी|henna/.test(s)) return 'stamp.mehendi';
  if (/engag|ring|maagni|magni|tika|sagai|सगाई|माग्नी|औंठी|औँठी/.test(s)) return 'stamp.engagement';
  if (/recep|walima|dinner|party|sangeet|प्रीतिभोज|भोज|वलीमा|reception/.test(s)) return 'stamp.reception';
  if (/wed|bibaha|vivah|biha|nikah|matrimon|ceremony|janti|विवाह|बिहे|निकाह|जन्ती/.test(s)) return 'stamp.wedding';
  return 'stamp.other';
}

// ───────── small printed things ─────────
const svgEl = (s) => s;
/** a round postmark: the city on the arc, the day in the middle (B.S. in Nepali), the year below */
function postmark(ctx, { id, iso, bs, ad, small = false, cls = '' }) {
  const { esc, config } = ctx;
  const first = (v) => String(v || '').split(/[,،]/)[0].trim();
  const city = { en: first(config.city?.en || config.city?.ne).toUpperCase(), ne: first(config.city?.ne || config.city?.en) };
  const fit = (t, base) => Math.max(7, Math.min(base, 150 / Math.max(6, [...t].length)));
  const mid = {
    en: [`${ad.day} ${ad.month.en.slice(0, 3).toUpperCase()}`, ad.year],
    ne: nepal() && bs.day ? [`${bs.day} ${bs.month}`, bs.year] : [`${ctx.neNum(ad.day)} ${ad.month.ne}`, ctx.neNum(ad.year)],
  };
  const face = (lang) => `<g class="l-${lang}"${lang === 'ne' ? ' lang="ne"' : ''}>
      <text class="sd-pm__arc" font-size="${fit(city[lang], 11).toFixed(1)}"><textPath href="#${id}-top" startOffset="50%" text-anchor="middle">${esc(city[lang])}</textPath></text>
      <text class="sd-pm__day" x="60" y="62" text-anchor="middle">${esc(mid[lang][0])}</text>
      <text class="sd-pm__yr" x="60" y="80" text-anchor="middle">${esc(mid[lang][1])}</text>
    </g>`;
  return svgEl(`<svg class="sd-pm ${small ? 'sd-pm--sm' : ''} ${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <defs><path id="${id}-top" d="M18 60a42 42 0 0 1 84 0" /></defs>
    <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" stroke-width="2.2" />
    <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" stroke-width="1.1" />
    <path d="M27 92h66" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" />
    ${face('en')}${face('ne')}
  </svg>`);
}
/** the wavy cancel lines that run off a postmark across the stamp */
const cancel = (cls = '') => `<svg class="sd-cancel ${cls}" viewBox="0 0 140 44" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.6">${[6, 16, 26, 36].map((y) => `<path d="M0 ${y}q8.75-6 17.5 0t17.5 0 17.5 0 17.5 0 17.5 0 17.5 0 17.5 0 17.5 0" />`).join('')}</g></svg>`;

/** a perforated postage stamp around a painting; its value and name on a printed band (never over the picture) */
function stamp(ctx, ref, alt, { value = null, label = null, cls = '', sizes = '120px', pos = null } = {}) {
  const { esc, bi, photoUrl } = ctx;
  return `<span class="sd-stamp ${cls}"><span class="sd-stamp__in">
      <span class="sd-stamp__pic"><img src="${esc(photoUrl(ref, 'sm'))}" sizes="${sizes}" alt="${esc(alt)}" loading="lazy" decoding="async"${pos ? ` style="object-position:${pos}"` : ''} /></span>
      ${value || label ? `<span class="sd-stamp__band">${value ? `<b class="sd-stamp__val">${bi(value)}</b>` : ''}${label ? `<span class="sd-stamp__lab">${bi(label)}</span>` : ''}</span>` : ''}
    </span></span>`;
}

/** the mauli thread around the folded letter: red and yellow strands, crossing at the seal */
const thread = () => `<svg class="sd-thread" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <g fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke">
    <path d="M-2 49H102" stroke="#B3261E" stroke-width="3.2" vector-effect="non-scaling-stroke" />
    <path d="M-2 49H102" stroke="#E6A817" stroke-width="3.2" stroke-dasharray="5 7" vector-effect="non-scaling-stroke" />
    <path d="M-2 53H102" stroke="#C93A2C" stroke-width="2" vector-effect="non-scaling-stroke" />
    <path d="M50 -2V102" stroke="#B3261E" stroke-width="3.2" vector-effect="non-scaling-stroke" />
    <path d="M50 -2V102" stroke="#E6A817" stroke-width="3.2" stroke-dasharray="5 7" vector-effect="non-scaling-stroke" />
  </g></svg>`;

// ───────── the first screen: the rooftop and the letter ─────────
function hero(ctx) {
  const { S, bi, esc, txt, on, names, c, AD, BS, mainEv, config } = ctx;
  const ph = S.img('scene.phone'); const wd = S.img('scene.wide');
  const src = (ref, k) => esc(ctx.photoUrl(ref, k));
  const wedStamp = S.img('stamp.wedding');
  const when = {
    en: `${AD.wd.en}, ${AD.day} ${AD.month.en} ${AD.year}`,
    ne: nepal() && BS.full?.ne ? BS.full.ne : AD.full.ne,
  };
  const time = mainEv ? ctx.timeLabel(mainEv) : null;
  const place = ctx.placeLine;
  return `
  <picture class="sd-scene" aria-hidden="true">
    <source media="(min-aspect-ratio: 1/1)" srcset="${src(wd, 'sm')} 1280w, ${src(wd, 'lg')} 2048w" sizes="100vw" />
    <img src="${src(ph, 'sm')}" srcset="${src(ph, 'sm')} 720w, ${src(ph, 'lg')} 1080w" sizes="100vw" alt="" fetchpriority="high" decoding="async" />
  </picture>
  <div class="sd-stage" id="sd-stage">
    <div class="sd-post-in" id="sd-post-in">
      <div class="sd-letter" id="sd-letter">
        <div class="sd-pan sd-pan--top">
          <div class="sd-face sd-face--front">
            <p class="sd-kick">${bi(txt('hero.title'))}</p>
            ${on(txt('hero.line')) ? `<p class="sd-line">${bi(txt('hero.line'))}</p>` : ''}
          </div>
          <div class="sd-face sd-face--back"><span class="sd-back__stamp" style="background-image:url('${src(wedStamp, 'sm')}')"></span>${cancel('sd-cancel--back')}</div>
        </div>
        <div class="sd-pan sd-pan--mid">
          <div class="sd-face sd-face--front">
            <h1 class="sd-names" id="sd-names">${names('&amp;')}</h1>
          </div>
        </div>
        <div class="sd-pan sd-pan--bot">
          <div class="sd-face sd-face--front">
            <div class="sd-when">
              <p class="sd-when__d">${bi(when)}</p>
              ${time ? `<p class="sd-when__t">${bi(time)}</p>` : ''}
              ${nepal() && BS.full?.en ? `<p class="sd-when__bs l-en">${esc(/B\.S\./.test(BS.full.en) ? BS.full.en : `${BS.full.en} B.S.`)}</p>` : ''}
              ${place?.en || place?.ne ? `<p class="sd-when__p">${bi(place)}</p>` : ''}
            </div>
            <div class="sd-mark" id="sd-mark">${postmark(ctx, { id: 'pm-hero', iso: mainEv?.start || config.weddingDate, bs: BS, ad: AD })}</div>
          </div>
          <div class="sd-face sd-face--back"></div>
        </div>
        <div class="sd-tie" id="sd-tie" aria-hidden="true">
          ${thread()}
          <span class="sd-seal" id="sd-seal">
            <img class="sd-seal__h sd-seal__h--l" src="${ART}seal.webp" alt="" decoding="async" />
            <img class="sd-seal__h sd-seal__h--r" src="${ART}seal.webp" alt="" decoding="async" />
          </span>
        </div>
      </div>
      <div class="sd-carry" id="sd-carry" aria-hidden="true">
        <i class="sd-carry__th sd-carry__th--a"></i><i class="sd-carry__th sd-carry__th--b"></i>
        ${flyer('sd-carry__a')}${flyer('sd-carry__b')}
      </div>
      ${perched('sd-perch--hero', false)}
    </div>
  </div>
  <p class="sr-only su-in">${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}</p>`;
}

// ───────── the body ─────────
function page(ctx) {
  const { bi, esc, txt, on, parts: P, c, S, config } = ctx;
  let side = 0;
  const nextSide = () => (side++ % 2 ? 'r' : 'l');
  const tilt = () => ((side % 3) - 1) * 1.1 + (side % 2 ? 0.6 : -0.6);
  let k = 0;
  const post = (id, cls, inner, extra = '') => {
    const sd = nextSide();
    const html = `<article class="sd-post ${cls}" id="${id}" data-post data-side="${sd}" style="--r:${tilt().toFixed(2)}deg"${extra}>${inner}</article>`;
    // the kinds by the room each card leaves beside it: tall cards get the niche or the marigold strings
    const kind = k === 0 ? 'both' : k === 1 ? 'niche' : k === 2 ? 'lota' : ['niche', 'strings', 'lota'][(k - 3) % 3];
    return html + deco(kind, k++ === 1);
  };
  const posts = [];
  // desktop only: a little of the rooftop in the empty margin beside a postcard (never under words)
  // a little of the rooftop in the pocket of wall beside a postcard (desktop; one niche between cards on phones).
  // Never under words: guardDecor() hides any piece that would touch a card.
  const deco = (kind, phone = false) => {
    const lazy = 'alt="" loading="lazy" decoding="async"';
    const inner = kind === 'lota' ? `<span class="sd-ledge"><img src="${ART}lota.webp" width="460" height="618" ${lazy} /></span>`
      : kind === 'niche' ? `<img class="sd-niche" src="${ART}niche.webp" width="520" height="693" ${lazy} />`
      : '';
    const strings = `<span class="sd-strings"><img src="${ART}marigold-string.webp" width="220" height="1106" ${lazy} /><img src="${ART}marigold-string.webp" width="220" height="1106" ${lazy} /></span>`;
    const body = kind === 'strings' ? strings : kind === 'both' ? `<span class="sd-pair"><img class="sd-niche" src="${ART}niche.webp" width="520" height="693" ${lazy} />${strings}</span>` : inner;
    return `<div class="sd-deco sd-deco--${kind}" data-side="${side % 2 ? 'r' : 'l'}"${phone ? ' data-phone' : ''} aria-hidden="true"><div class="sd-deco__in">${body}</div></div>`;
  };

  if (P.lead) {
    posts.push(post('couple', 'sd-pic', `
      <figure class="sd-pic__photo">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 700px) 84vw, 520px')}</figure>
      <div class="sd-pic__foot">
        <div><h2 class="sd-h3">${bi(txt('couple.title'))}</h2>${on(txt('couple.line')) ? `<p class="sd-pic__line">${bi(txt('couple.line'))}</p>` : ''}</div>
        ${perforatedDove()}
      </div>`));
  }

  // the families: two stamps side by side (their photos, or each one's initial), the names below
  const init = (p) => ({ en: [...(p.name.en || p.fullName.en || '?')][0].toUpperCase(), ne: [...(p.name.ne || p.fullName.ne || p.name.en || '?')][0] });
  posts.push(post('families', 'sd-fam', `
    <h2 class="sd-h3 sd-fam__t">${bi(txt('families.title'))}</h2>
    <div class="sd-fam__row">${P.families.map((f) => {
      const pic = P.brideGroom && f.photo;
      const fx = pic ? view(f.photo).focal : null;
      return `<div class="sd-fam__side">
        ${pic ? stamp(ctx, f.photo, f.person.name.en, { cls: 'sd-stamp--big', sizes: '160px', label: f.label, pos: `${(fx[0] * 100).toFixed(0)}% ${(fx[1] * 100).toFixed(0)}%` })
          : `<span class="sd-stamp sd-stamp--big sd-stamp--mono"><span class="sd-stamp__in"><span class="sd-stamp__mono">${bi(init(f.person))}</span><span class="sd-stamp__band"><span class="sd-stamp__lab">${bi(f.label)}</span></span></span></span>`}
        <p class="sd-fam__name">${bi(f.person.fullName)}</p>
        ${(f.person.parents?.en || f.person.parents?.ne) ? `<p class="sd-fam__of">${bi(f.of)}</p><p class="sd-fam__par">${bi(f.person.parents)}</p>` : ''}
        ${(f.person.home?.en || f.person.home?.ne) ? `<p class="sd-fam__home">${bi(f.person.home)}</p>` : ''}
      </div>`;
    }).join('<span class="sd-fam__and" aria-hidden="true">&amp;</span>')}</div>`));

  // the countdown: a sheet of four stamps, the numbers as their values
  posts.push(post('date', 'sd-sheet', `
    <h2 class="sd-h3">${bi(txt('count.title'))}</h2>
    <p class="sd-sheet__when">${bi({ en: `${ctx.AD.wd.en}, ${ctx.AD.day} ${ctx.AD.month.en} ${ctx.AD.year}`, ne: nepal() && ctx.BS.full?.ne ? ctx.BS.full.ne : ctx.AD.full.ne })}</p>
    <div class="sd-sheet__grid" data-countdown>
      <ol class="su-count__grid sd-sheet__ol" aria-label="${esc(txt('count.title').en)}">${P.countUnits.map((x, i) => `<li class="sd-cell sd-cell--${i}"><span class="sd-cell__in">${P.countNum(x.u, 'sd-cell__n')}<span class="sd-cell__l">${bi(x.label)}</span></span></li>`).join('')}</ol>
      <p class="sd-sheet__done" data-count-done hidden></p>
    </div>
    <div class="sd-btns">${P.calendarBtn('sd-btn')}${P.shareBtn('sd-btn sd-btn--line')}</div>`));


  // a postcard per ceremony: the message on the left, the stamp, postmark and address lines on the right
  const evPosts = P.events.map((ev, n) => {
    const key = stampOf(ev.e);
    const hasDress = !!(ev.dress.text?.en || ev.dress.text?.ne || ev.dress.colors.length);
    const dateLine = { en: `${ev.ad.wd.en}, ${ev.ad.day} ${ev.ad.month.en} ${ev.ad.year}`, ne: nepal() && ev.bs.full?.ne ? ev.bs.full.ne : ev.ad.full.ne };
    return post(`ev-${esc(ev.id)}`, 'sd-pc', `
      <div class="sd-pc__msg">
        <div class="sd-pc__corner">
          ${postmark(ctx, { id: `pm-${n}`, iso: ev.e.start, bs: ev.bs, ad: ev.ad, small: true, cls: 'sd-pc__pm' })}
          ${stamp(ctx, S.img(key), S.alt(key), { value: { en: ev.ad.day, ne: ev.bs.day && nepal() ? ev.bs.day : ctx.neNum(ev.ad.day) }, cls: 'sd-stamp--pc', sizes: '110px' })}
        </div>
        <p class="sd-pc__no">${bi({ en: `No. ${pad2(n + 1)}`, ne: `क्र. ${ctx.neNum(pad2(n + 1))}` })} · ${bi(txt('prog.title'))}</p>
        <h3 class="sd-pc__title">${bi(ev.title)}</h3>
        ${ev.blurb ? `<p class="sd-pc__blurb">${bi(ev.blurb)}</p>` : ''}
        ${hasDress ? `<p class="sd-pc__dress">${ev.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : P.UI.wear)}</span></p>` : ''}
        ${ev.rituals.length ? `<details class="sd-pc__order"><summary>${bi(P.UI.order)}</summary><ol>${ev.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
      </div>
      <div class="sd-pc__addr">
        <ul class="sd-pc__lines">
          <li><span class="sd-pc__k">${bi(P.UI.date)}</span><span>${bi(dateLine)}</span></li>
          ${nepal() && ev.bs.full?.en ? `<li class="l-en"><span class="sd-pc__k">B.S.</span><span>${esc(ev.bs.full.en.replace(/ ?B\.S\.$/, ''))}</span></li>` : ''}
          <li><span class="sd-pc__k">${bi(P.UI.time)}</span><span>${bi(ev.time)}</span></li>
          <li><span class="sd-pc__k">${bi(P.UI.venue)}</span><span>${bi(ev.venue)} <a class="su-link" href="${esc(ev.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></span></li>
        </ul>
      </div>`);
  });

  const rack = P.photos.length ? `
  <section class="su-sec sd-rack" id="photos" aria-labelledby="rack-title">
    <div class="sd-rack__pin">
      <header class="sd-head su-rise"><h2 class="sd-h2" id="rack-title">${bi(txt('gallery.title'))}</h2><p class="sd-rack__hint">${bi(txt('gallery.hint'))}</p></header>
      <div class="sd-rack__stage">
        <div class="sd-rack__deck">${P.photos.map((g, i) => `<figure class="sd-rc" data-i="${i}" style="--k:${i}">${P.photoBtn(g, i, '(max-width: 700px) 78vw, 420px', 'sd-rc__btn')}</figure>`).join('')}</div>
        <i class="sd-rack__rail" aria-hidden="true"></i>
      </div>
      <p class="sd-rack__n" aria-hidden="true"></p>
    </div>
  </section>` : '';

  return `
  <section class="su-hero sd-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${hero(ctx)}
    ${P.cue('wall')}
  </section>

  <section class="su-sec sd-wall" id="wall" aria-labelledby="wall-title">
    <div class="sd-flight" aria-hidden="true">${flyer('sd-fly--a')}${flyer('sd-fly--b')}${perched('sd-perch--wall', false)}</div>
    <img class="sd-bougain sd-bougain--l" src="${ART}bougainvillea.webp" width="720" height="960" alt="" aria-hidden="true" loading="lazy" decoding="async" />
    <img class="sd-bougain sd-bougain--r" src="${ART}bougainvillea-2.webp" width="720" height="1055" alt="" aria-hidden="true" loading="lazy" decoding="async" />
    <header class="sd-wall__head">
      <p class="sd-kicker">${bi(txt('wall.kicker'))}</p>
      <h2 class="sd-h2" id="wall-title">${bi(txt('wall.title'))}</h2>
    </header>
    ${posts.join('')}
    <div class="sd-prog" id="programme" aria-label="${esc(txt('prog.title').en)}">
      ${evPosts.join('')}
    </div>
  </section>
  ${rack}

  <section class="su-sec sd-full" id="card" aria-labelledby="card-title">
    <article class="sd-full__sheet su-rise">
      <span class="sd-full__seal" aria-hidden="true"><img src="${ART}seal.webp" alt="" loading="lazy" decoding="async" /></span>
      <h2 class="sd-full__line" id="card-title">${bi(txt('card.line'))}</h2>
      <p class="sd-full__hosts">${bi(config.hosts)}</p>
      ${P.cardBtn('sd-btn')}
    </article>
  </section>

  ${P.moreInfo() ? `<section class="su-sec sd-info su-rise">${P.moreInfo()}</section>` : ''}

  <section class="su-sec sd-reply" id="rsvp" aria-labelledby="rsvp-title">
    <div class="sd-reply__grid">
      <article class="sd-reply__card su-rise">
        <header class="sd-reply__head">
          <div><p class="sd-kicker">${bi({ en: 'Reply postcard', ne: 'जवाफी पोस्टकार्ड' })}</p><h2 class="sd-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
          ${(P.deadline?.en || P.deadline?.ne) ? `<p class="sd-reply__by">${bi(P.deadline)}</p>` : ''}</div>
          ${stamp(ctx, S.img('stamp.other'), S.alt('stamp.other'), { cls: 'sd-stamp--reply', sizes: '90px' })}
        </header>
        ${P.rsvpForm()}
      </article>
      <div class="sd-box" aria-hidden="true">
        <span class="sd-box__mini"><i></i></span>
        <img class="sd-box__img" src="${ART}postbox.webp" width="380" height="1421" alt="" loading="lazy" decoding="async" />
        ${flyer('sd-box__dove')}
        <p class="sd-box__sent">${bi(txt('rsvp.sent'))}</p>
      </div>
    </div>
  </section>

  <footer class="sd-close" aria-label="Blessing">
    <img class="sd-close__garland" src="${ART}garland.webp" width="1200" height="600" alt="" aria-hidden="true" loading="lazy" decoding="async" />
    <div class="sd-close__in su-rise">
      ${perched('sd-perch--close')}
      <p class="sd-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
      <p class="sd-close__en l-en">${esc(config.closing?.en || '')}</p>
      <p class="sd-close__names">${ctx.names('&amp;')}</p>
      ${c.hashtag ? `<p class="sd-close__tag">${esc(c.hashtag)}</p>` : ''}
    </div>
    <div class="sd-close__pots" aria-hidden="true"><img src="${ART}lota.webp" width="460" height="618" alt="" loading="lazy" decoding="async" /><img src="${ART}lota.webp" width="460" height="618" alt="" loading="lazy" decoding="async" /></div>
    ${P.madeWith()}
  </footer>`;
}
/** a small printed dove cancel for the picture postcard's corner */
function perforatedDove() {
  return `<span class="sd-pic__mark" aria-hidden="true"><img src="${ART}seal.webp" alt="" loading="lazy" decoding="async" /></span>`;
}

// ───────── fitting the letter (names and lines never overflow, in either script) ─────────
function fitLetter() {
  const letter = document.getElementById('sd-letter');
  if (!letter) return;
  letter.querySelectorAll('.sd-face--front').forEach((f) => {
    f.style.setProperty('--fit', '1');
    const room = f.clientHeight; const need = f.scrollHeight;
    const roomW = f.clientWidth; const needW = f.scrollWidth;
    const s = Math.min(1, room / need, roomW / needW);
    if (s < 0.999) f.style.setProperty('--fit', (s * 0.98).toFixed(3));
  });
  const names = document.getElementById('sd-names');
  if (names) {
    names.style.fontSize = '';
    const box = names.parentElement;
    let fs = parseFloat(getComputedStyle(names).fontSize);
    for (let k = 0; k < 24 && (names.scrollWidth > box.clientWidth * 0.96 || names.scrollHeight > box.clientHeight * 0.96); k++) { fs *= 0.94; names.style.fontSize = `${fs.toFixed(1)}px`; }
  }
}

// ───────── the opening ─────────
let arrival = null;
const S0 = { top: { rotationX: -180, z: 3 }, bot: { rotationX: 180, z: 1.5 } };
function foldState(fold) {
  const top = document.querySelector('.sd-pan--top'); const bot = document.querySelector('.sd-pan--bot');
  gsap.set(top, fold ? { ...S0.top, transformOrigin: '50% 100%' } : { rotationX: 0, z: 0, transformOrigin: '50% 100%' });
  gsap.set(bot, fold ? { ...S0.bot, transformOrigin: '50% 0%' } : { rotationX: 0, z: 0, transformOrigin: '50% 0%' });
  document.getElementById('sd-letter')?.classList.toggle('is-open', !fold);
}
/** where the perched pair sits: on the folded letter's top edge, or on the open letter's */
function perchAt(fold) {
  const L = document.getElementById('sd-letter');
  const p = document.querySelector('.sd-perch--hero');
  if (!L || !p) return { x: 0, y: 0 };
  const h = L.offsetHeight;
  return { x: L.offsetWidth * 0.2, y: fold ? h / 3 : 0 };
}
function placePerch(fold) {
  const { x, y } = perchAt(fold);
  gsap.set('.sd-perch--hero', { x, y, yPercent: -94 });
}
/** two doves bring the folded letter in from the top left and set it down; then they settle on it */
function arrive(ctx) {
  const stage = document.getElementById('sd-post-in');
  const carry = document.getElementById('sd-carry');
  const perch = document.querySelector('.sd-perch--hero');
  if (!stage) return;
  foldState(true);
  placePerch(true);
  if (ctx.reduced || (params.has('debug') && params.has('open'))) { gsap.set(carry, { autoAlpha: 0 }); gsap.set(perch, { autoAlpha: 1 }); return; }
  const vw = window.innerWidth; const vh = window.innerHeight;
  carry.querySelectorAll('.sd-fly').forEach((f) => f.classList.add('is-flap'));
  gsap.set(perch, { autoAlpha: 0 });
  arrival = gsap.timeline({ delay: 0.35 })
    .fromTo(stage, { x: -vw * 0.75, y: -vh * 0.62, rotation: -9 }, { x: 0, y: 0, duration: 2.3, ease: 'power2.out' }, 0)
    .to(stage, { keyframes: { rotation: [-9, 4, -2, 0], easeEach: 'sine.inOut' }, duration: 2.5 }, 0)
    .to(carry, { autoAlpha: 0, y: -16, duration: 0.45, ease: 'power1.in' }, 2.35)
    .fromTo(perch, { autoAlpha: 0, y: '-=10' }, { autoAlpha: 1, y: '+=10', duration: 0.5, ease: 'power2.out' }, 2.3)
    .add(() => carry.querySelectorAll('.sd-fly').forEach((f) => f.classList.remove('is-flap')));
}

/** tap: the seal cracks, the thread falls, the letter unfolds and the postmark is stamped */
function open(ctx, tl) {
  arrival?.progress(1).kill();
  const seal = document.getElementById('sd-seal');
  const tie = document.getElementById('sd-tie');
  const top = document.querySelector('.sd-pan--top'); const bot = document.querySelector('.sd-pan--bot');
  const perch = document.querySelector('.sd-perch--hero');
  const mark = document.getElementById('sd-mark');
  const end = perchAt(false);
  gsap.set('#sd-carry', { autoAlpha: 0 });
  tl.to('.sd-seal__h--l', { xPercent: -26, yPercent: 60, rotation: -24, autoAlpha: 0, duration: 0.75, ease: 'power2.in' }, 0.15)
    .to('.sd-seal__h--r', { xPercent: 26, yPercent: 70, rotation: 28, autoAlpha: 0, duration: 0.75, ease: 'power2.in' }, 0.15)
    .fromTo(seal, { scale: 1 }, { scale: 1.06, duration: 0.12, ease: 'power1.out', yoyo: true, repeat: 1 }, 0)
    .to(tie.querySelector('.sd-thread'), { yPercent: 18, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 0.35)
    // the pair lifts off the packet and resettles on the open letter's top edge
    .to(perch, { y: end.y - 26, x: end.x, duration: 0.55, ease: 'power2.out' }, 0.3)
    .to(perch, { y: end.y, duration: 0.5, ease: 'power2.inOut' }, 1.75)
    .to(top, { rotationX: 0, z: 0, duration: 1.05, ease: 'power3.inOut' }, 0.55)
    .to(bot, { rotationX: 0, z: 0, duration: 1.0, ease: 'power3.inOut' }, 1.05)
    .add(() => document.getElementById('sd-letter')?.classList.add('is-open'), 1.9)
    .set(tie, { autoAlpha: 0 }, 1.1)
    .fromTo(mark, { scale: 1.18, autoAlpha: 0, rotation: -14 }, { scale: 1, autoAlpha: 1, rotation: -8, duration: 0.32, ease: 'power3.in' }, 2.05)
    .fromTo('#sd-letter', { y: 0 }, { y: 2, duration: 0.08, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 2.36);
  return 2.35;
}
/** another theme's gate opened onto the letter: it is already unfolded and stamped */
function heroIntro(ctx, tl, t) {
  arrival?.progress(1).kill();
  foldState(false); placePerch(false);
  gsap.set(['#sd-tie', '#sd-carry'], { autoAlpha: 0 });
  gsap.set('#sd-mark', { autoAlpha: 1, rotation: -8 });
  tl.fromTo('#sd-letter', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t);
}

// ───────── scroll: the flight, the rack, the reply ─────────
function rackScroll(ctx) {
  const sec = document.getElementById('photos');
  if (!sec) return;
  const cards = [...sec.querySelectorAll('.sd-rc')];
  const N = cards.length; const num = sec.querySelector('.sd-rack__n');
  if (ctx.reduced || N < 2) { sec.classList.add('is-grid'); return; }
  sec.classList.add('is-pinned');
  const render = (p) => {
    cards.forEach((el, i) => {
      const d = i - p;
      if (d < -1.05) { el.style.visibility = 'hidden'; return; }
      el.style.visibility = '';
      if (d <= 0) {
        // the front card tips forward out of the rack and away
        const k = Math.min(1, -d);
        el.style.transform = `translate3d(0,${(k * 46).toFixed(1)}%,${(k * 120).toFixed(1)}px) rotateX(${(-k * 78).toFixed(2)}deg)`;
        el.style.opacity = String((1 - k * k).toFixed(3));
      } else {
        const k = Math.min(d, 3.2);
        el.style.transform = `translate3d(0,${(-k * 5.5).toFixed(2)}%,${(-k * 60).toFixed(1)}px) rotate(${(((i % 2) ? 1 : -1) * Math.min(k, 1) * 1.6).toFixed(2)}deg)`;
        el.style.opacity = d > 3.5 ? '0' : '1';
      }
      el.style.zIndex = String(100 - i);
      el.querySelector('button').tabIndex = Math.abs(d) < 0.5 ? 0 : -1;
    });
    if (num) num.textContent = `${Math.min(N, Math.round(p) + 1)} / ${N}`;
  };
  const proxy = { p: 0 };
  render(0);
  gsap.to(proxy, {
    p: N - 1, ease: 'none', onUpdate: () => render(proxy.p),
    scrollTrigger: { trigger: sec, start: 'top top', end: () => `+=${(N - 1) * window.innerHeight * 0.55}`, pin: '.sd-rack__pin', scrub: 0.5, invalidateOnRefresh: true, anticipatePin: 1 },
  });
}

function replyPost(ctx) {
  const status = document.getElementById('rsvp-status');
  const box = document.querySelector('.sd-box');
  if (!status || !box) return;
  const dove = box.querySelector('.sd-box__dove');
  const mini = box.querySelector('.sd-box__mini');
  const sent = box.querySelector('.sd-box__sent');
  let busy = false;
  new MutationObserver(() => {
    // only a reply that went through (rsvp.js writes its thanks; "Sending…" and errors do not count)
    if (busy || status.classList.contains('is-error') || !/^Thank you/.test(status.querySelector('.l-en')?.textContent || '')) return;
    busy = true;
    if (ctx.reduced) { gsap.set(sent, { autoAlpha: 1 }); busy = false; return; }
    dove.classList.add('is-flap');
    gsap.timeline({ onComplete: () => { busy = false; dove.classList.remove('is-flap'); } })
      // the reply card drops to the slot and slips in (it shortens from its lower edge, as if swallowed)
      .fromTo(mini, { autoAlpha: 0, y: -70, rotation: -8, scaleY: 1 }, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.55, ease: 'power2.out' }, 0)
      .to(mini, { scaleY: 0, duration: 0.45, ease: 'power2.in' }, 0.75)
      .set(mini, { autoAlpha: 0 }, 1.2)
      .fromTo(dove, { autoAlpha: 0, x: 0, y: 0, scale: 0.8 }, { autoAlpha: 1, duration: 0.2 }, 1.1)
      .to(dove, { x: () => Math.min(window.innerWidth * 0.5, 320), y: () => -window.innerHeight * 0.55, scale: 0.6, duration: 1.8, ease: 'power1.in' }, 1.2)
      .to(dove, { autoAlpha: 0, duration: 0.4 }, 2.6)
      .fromTo(sent, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1.6);
  }).observe(status, { childList: true });
}

/** hide any wall decoration that would touch a postcard (layout boxes, not the delivery transforms) */
function guardDecor(wall) {
  const box = (el) => { let x = 0; let y = 0; let n = el; while (n && n !== wall) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };
  const cards = [...wall.querySelectorAll('[data-post], .sd-wall__head')].map(box);
  wall.querySelectorAll('.sd-deco__in').forEach((d) => {
    d.style.visibility = '';
    if (!d.offsetWidth) return;
    const r = box(d);
    const hit = cards.some((c) => r.x < c.x + c.w + 12 && r.x + r.w > c.x - 12 && r.y < c.y + c.h + 12 && r.y + r.h > c.y - 12);
    if (hit) d.style.visibility = 'hidden';
  });
}

let flight = null;
function scroll(ctx) {
  const wall = document.getElementById('wall');
  const posts = [...wall.querySelectorAll('[data-post]')];
  const lenis = ctx.lenis?.();
  flight = createFlight(wall, posts, { reduced: ctx.reduced, scrollY: () => (lenis ? lenis.scroll : window.scrollY) });
  rackScroll(ctx);
  replyPost(ctx);
  guardDecor(wall);
  new ResizeObserver(() => guardDecor(wall)).observe(wall);
  // pictures and fonts that arrive later move the posts: measure again
  wall.querySelectorAll('img').forEach((im) => { if (!im.complete) im.addEventListener('load', () => flight.measure(), { once: true }); });
  document.fonts?.ready.then(() => flight.measure());
  if (params.has('debug')) window.__sd = { flight, at: (s) => flight.at(s) };
}

const SPEC = {
  slug: 'sandesh',
  manifest,
  art: {},
  bell: false,
  gate: () => '',
  hero: (ctx) => hero(ctx),
  page: (ctx) => page(ctx),
  ready: (ctx) => {
    fitLetter();
    document.fonts?.ready.then(fitLetter);
    document.addEventListener('langchange', () => requestAnimationFrame(() => { fitLetter(); flight?.measure(); }));
    if (ctx.reduced) {
      // still: the letter waits folded and sealed; the button opens it with a fade
      foldState(true); placePerch(true);
      gsap.set('#sd-carry', { autoAlpha: 0 });
      const show = () => { foldState(false); placePerch(false); gsap.set(['#sd-tie'], { autoAlpha: 0 }); gsap.set('#sd-mark', { autoAlpha: 1, rotation: -8 }); };
      // the suite marks the page as opening (a button, the seal, the studio's skip): unfold with it
      const mo = new MutationObserver(() => { if (document.body.classList.contains('is-opening') || document.body.classList.contains('is-open')) { mo.disconnect(); show(); } });
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    } else arrive(ctx);
    let raf = 0;
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { fitLetter(); placePerch(!document.getElementById('sd-letter')?.classList.contains('is-open')); }); });
  },
  // the seal itself is a tap target too (the buttons stay the accessible way in)
  gateTap: (ctx, go) => document.getElementById('sd-seal')?.addEventListener('click', go),
  open: (ctx, tl) => open(ctx, tl),
  heroIntro,
  scroll: (ctx) => scroll(ctx),
};
mountSuite(SPEC);
