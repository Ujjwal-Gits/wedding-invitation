// Theme · Nimantrana (निमन्त्रणा) — the printed tri-fold card.
// A traditional Nepali wedding card on a green silk table: ivory card stock, a sindoor-and-gold border,
// a Palpali Dhaka band along the top and bottom edges and gold arched panels. Tap "Open the card" and
// the two flaps unfold in real 3D (the one signature motion; on phones the card unfolds downward).
// Then a quiet, scroll-driven journey moves panel by panel: Ganesh and the blessing, the two of us,
// the card wording and the programme (pinned and sideways on wide screens), then the album, the
// reply card and the closing blessing.
import '../../core/base.css';
import './nimantrana.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { loadInvitation } from '../../core/data.js';
import { bi, esc, dateOf, timeLabel, mapUrl, neNum, bsDateOf } from '../../core/i18n.js';
import { mountShell, ringBell } from '../../core/shell.js';
import { createSmooth, reducedMotion } from '../../core/smooth.js';
import { initRsvp } from '../../core/rsvp.js';
import { guestEvents } from '../../core/finale.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { openModal } from '../../core/modal.js';
import { useSlots } from '../../core/slots.js';
import { photoUrl } from '../../photos.js';
import credits from '../../generated/credits.json';
import flora from './flora-credits.json';
import manifest from './slots.js';
import {
  goldDefs, archPanelSVG, crestSVG, canopySVG, lotusSVG, dhakaTile, swastikaSVG, havanSVG,
  bellSVG, kalashSVG, diyoSVG, cornerSVG,
} from './art.js';

gsap.registerPlugin(ScrollTrigger, CustomEase);
CustomEase.create('nm-fold', 'M0,0 C0.32,0 0.18,0.86 0.52,0.97 0.7,1.02 0.84,1 1,1');
CustomEase.create('nm-cam', 'M0,0 C0.4,0 0.22,1 1,1');

const config = await loadInvitation();
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion() || params.has('still');
const c = config.couple;
const events = guestEvents();

// ───────────────────────── Slots ─────────────────────────
// ?debug&img.<slot>=<slug>&txt.<slot>=<text> previews a studio override.
if (DEBUG) {
  const mine = ((config.themeContent ||= {})[manifest.theme] ||= {});
  for (const [k, v] of params) {
    if (k.startsWith('img.')) (mine.images ||= {})[k.slice(4)] = v;
    if (k.startsWith('txt.')) (mine.texts ||= {})[k.slice(4)] = { en: v, ne: v };
  }
}
const S = useSlots(manifest);
const txt = S.txt;
const hidden = (t) => /^\s*[-–—]\s*$/.test(t.en || '') || /^\s*[-–—]\s*$/.test(t.ne || '');
const faith = !/^\s*(off|no|hide|none|बन्द)\s*$/i.test(txt('faith.show').en || '');
const deity = faith ? S.img('card.deity') : null;
const show = (id) => !hidden(txt(id));

// ───────────────────────── Photo helpers ─────────────────────────
const dims = Object.fromEntries(credits.map((k) => [String(k.file || k.slot).replace(/\.(jpe?g|png|webp)$/i, ''), [k.width, k.height]]));
const isUrl = (s) => typeof s === 'string' && (s.startsWith('/') || s.startsWith('https://'));
const keyOf = (ref) => (typeof ref === 'string' ? ref : ref && typeof ref === 'object' ? ref.lg || ref.sm || '' : '');
const aspectOf = (ref) => {
  if (typeof ref === 'string' && dims[ref]?.[0]) return dims[ref][0] / dims[ref][1];
  if (ref && typeof ref === 'object' && ref.w && ref.h) return ref.w / ref.h;
  return 0;
};
const PEOPLE = /^(couple|wedding|mehendi-hands|bride|groom|portrait)/;
const isCouple = (ref) => !!ref && (typeof ref === 'object' || isUrl(ref) || PEOPLE.test(ref));
const safeColor = (s) => (/^#[0-9a-f]{3,8}$/i.test(String(s)) ? s : null);
const safeHref = (u) => (/^https:\/\//i.test(String(u || '')) ? String(u) : '');
const tel = (p) => String(p).replace(/[^\d+]/g, '');
const portraitAlt = Object.fromEntries((c.portraits || []).filter((p) => p?.photo).map((p) => [keyOf(p.photo), p.alt || '']));
const altFor = (ref, id) => portraitAlt[keyOf(ref)] || (ref && typeof ref === 'object' && ref.alt) || S.alt(id) || `${c.bride.name.en} and ${c.groom.name.en}`;

const imgTag = (ref, alt, sizes, { eager = false, cls = '' } = {}) => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  const ar = aspectOf(ref);
  return `<img class="${cls}" src="${esc(sm)}" ${sm !== lg ? `srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w"` : ''} sizes="${sizes}" alt="${esc(alt || '')}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" ${ar ? `data-ar="${ar.toFixed(4)}"` : ''} />`;
};
const FL = (f) => `/themes/nimantrana/flora/${f}`;

// ───────────────────────── Which photo goes where ─────────────────────────
const used = new Set();
const take = (ref) => { if (ref) used.add(keyOf(ref)); return ref; };
const cardPhoto = take(S.img('card.photo'));
let bridePh = S.img('couple.bride');
let groomPh = S.img('couple.groom');
if (bridePh && keyOf(bridePh) === keyOf(cardPhoto)) bridePh = null;
if (groomPh && (keyOf(groomPh) === keyOf(cardPhoto) || keyOf(groomPh) === keyOf(bridePh))) groomPh = null;
take(bridePh); take(groomPh);
const albumCouple = [];
for (let n = 1; n <= 6; n++) {
  const ref = S.img(`album.${n}`);
  if (!ref || used.has(keyOf(ref))) continue;
  take(ref);
  albumCouple.push({ photo: ref, alt: altFor(ref, `album.${n}`) });
}
const albumGallery = (config.gallery || [])
  .filter((g) => g?.photo && !used.has(keyOf(g.photo)) && !/^marigold/.test(keyOf(g.photo)))
  .filter((g, i, a) => a.findIndex((x) => keyOf(x.photo) === keyOf(g.photo)) === i)
  .sort((x, y) => Number(isCouple(y.photo)) - Number(isCouple(x.photo)));
const album = [...albumCouple, ...albumGallery].slice(0, 12);

// ───────────────────────── Dates ─────────────────────────
const mainAD = dateOf(config.weddingDate);
const mainBS = bsDateOf(config.weddingDate, config.weddingDateBS);
const fmtParts = (iso, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', ...opts }).format(new Date(iso));
const shortAD = (iso) => {
  const ne = dateOf(iso).ne.split(', ');
  return { en: fmtParts(iso, { weekday: 'short', day: 'numeric', month: 'short' }), ne: `${ne[0]}, ${ne[1]}` };
};
const daysLeft = Math.ceil((new Date(config.weddingDate).getTime() - Date.now()) / 86400000);
const countLine = daysLeft > 1
  ? { en: `${daysLeft} days to go`, ne: `${neNum(daysLeft)} दिन बाँकी` }
  : daysLeft === 1 ? { en: 'Tomorrow', ne: 'भोलि' } : { en: 'With love', ne: 'मायासहित' };

// UI chrome (not studio content).
const T = {
  map: { en: 'Map', ne: 'नक्सा' },
  time: { en: 'Time', ne: 'समय' },
  venue: { en: 'Venue', ne: 'स्थान' },
  wear: { en: 'Wear', ne: 'पहिरन' },
  call: { en: 'Call', ne: 'फोन' },
  calendar: { en: 'Add the dates to your calendar', ne: 'क्यालेन्डरमा थप्नुहोस्' },
  shareIt: { en: 'Share the invitation', ne: 'निम्तो पठाउनुहोस्' },
  credits: { en: 'Art, photo and music credits', ne: 'श्रेय' },
  close: { en: 'Close', ne: 'बन्द गर्नुहोस्' },
  full: { en: 'The full programme', ne: 'पूरा कार्यक्रम' },
  more: (n) => ({ en: `and ${n} more`, ne: `थप ${neNum(n)} कार्यक्रम` }),
  stays: { en: 'Where to stay', ne: 'बसाइ' },
  travel: { en: 'Getting there', ne: 'आउने बाटो' },
  contacts: { en: 'Questions', ne: 'सोधपुछ' },
  live: { en: 'Watch the ceremony live', ne: 'प्रत्यक्ष हेर्नुहोस्' },
  date: { en: 'Date', ne: 'मिति' },
  place: { en: 'Place', ne: 'स्थान' },
  scroll: { en: 'Scroll through the card', ne: 'तल सर्नुहोस्' },
};

const names = () => `<span class="nm-n">${bi(c.bride.name)}</span> <span class="nm-amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span> <span class="nm-n">${bi(c.groom.name)}</span>`;
const dateBi = { en: mainAD.en, ne: mainBS.ne };
const dateAlt = { en: mainBS.en, ne: mainAD.ne };
const title = txt('card.title');
const subtitle = txt('card.subtitle');
const shloka = txt('card.shloka');
const invocation = txt('card.invocation');

// ───────────────────────── The card panels (400 × 580 design units) ─────────────────────────
const PW = 400;
const PH = 580;
const AR = PH / PW;
const sheet = (inner, cls = '') => `<div class="nm-sheet ${cls}"><div class="nm-sheet__arch">${archPanelSVG(PW - 36, PH - 64, { spring: 100 })}</div>${inner}</div>`;

const tileGlyph = (n) => {
  const t = txt(`tile.${n}`);
  const d = manifest.texts[`tile.${n}`].default;
  if (n === 3 && t.en === d.en && t.ne === d.ne) return `<span class="nm-tile__svg" role="img" aria-label="Swastika">${swastikaSVG()}</span>`;
  if (n === 4 && t.en === d.en && t.ne === d.ne) return `<span class="nm-tile__svg" role="img" aria-label="Havan kunda, the sacred fire">${havanSVG()}</span>`;
  return `<span class="nm-tile__g">${bi(t)}</span>`;
};
const tiles = (cls = '') => (faith ? `<ul class="nm-tiles ${cls}" aria-label="Sacred symbols">${[1, 2, 3, 4].filter((n) => show(`tile.${n}`)).map((n) => `<li class="nm-tile">${tileGlyph(n)}</li>`).join('')}</ul>` : '');

const coverHTML = `
  <div class="nm-face nm-face--out nm-cover" aria-hidden="true">
    ${sheet(`
      <img class="nm-fl nm-fl--tl" src="${FL('corner-tl.webp')}" alt="" decoding="async" />
      <img class="nm-fl nm-fl--br" src="${FL('corner-br.webp')}" alt="" decoding="async" />
      <div class="nm-pbody nm-cover__body">
        ${lotusSVG('nm-cover__lotus')}
        <p class="nm-title" lang="ne">${esc(title.ne)}</p>
        <p class="nm-sub">${bi(subtitle)}</p>
        <span class="nm-rule" aria-hidden="true"></span>
        <p class="nm-cover__line">${bi(txt('gate.line'))}</p>
        <p class="nm-cover__names nm-fit">${names()}</p>
        <p class="nm-cover__date">${bi(dateBi)}</p>
        <p class="nm-cover__alt">${bi(dateAlt)}</p>
        <p class="nm-cover__city">${bi(config.city)}</p>
      </div>`)}
    <i class="nm-shade"></i>
  </div>`;

const backHTML = `
  <div class="nm-face nm-face--out nm-back" aria-hidden="true">
    ${sheet(`<div class="nm-pbody nm-back__body">${lotusSVG('nm-back__lotus')}<p class="nm-back__hosts">${bi(config.hosts)}</p>${c.hashtag ? `<p class="nm-back__tag">${esc(c.hashtag)}</p>` : ''}</div>`)}
    <i class="nm-shade"></i>
  </div>`;

const p1Inner = faith && deity ? `
  <div class="nm-pbody nm-p1__body">
    ${show('card.invocation') ? `<p class="nm-invoke" lang="ne">${esc(invocation.ne)}</p>` : ''}
    <div class="nm-fitbox nm-p1__box" data-fit="deity">
      <figure class="nm-deity" data-frame>
        <span class="nm-deity__img">${imgTag(deity, deity?.alt || S.alt('card.deity'), '(max-width: 760px) 60vw, 220px', { eager: true })}</span>
        <span class="nm-diyo nm-diyo--l">${diyoSVG()}</span><span class="nm-diyo nm-diyo--r">${diyoSVG()}</span>
      </figure>
    </div>
    ${show('card.shloka') ? `<p class="nm-shloka" lang="sa">${esc(shloka.ne)}</p>` : ''}
  </div>` : `
  <div class="nm-pbody nm-p1__body nm-p1__body--plain">
    ${lotusSVG('nm-p1__lotus')}
    <p class="nm-p1__sal">${bi(config.invitation.salutation)}</p>
    <p class="nm-p1__req">${bi(config.invitation.request)}</p>
    <span class="nm-rule" aria-hidden="true"></span>
    <p class="nm-p1__sign">${bi(config.invitation.signoff)}<b>${bi(config.hosts)}</b></p>
  </div>`;

const p2Inner = `
  <div class="nm-pbody nm-p2__body">
    <p class="nm-title" lang="ne">${esc(title.ne)}</p>
    <p class="nm-sub">${bi(subtitle)}</p>
    ${cardPhoto ? `
    <div class="nm-fitbox nm-p2__box" data-fit="photo">
      <figure class="nm-frame nm-frame--crest" data-frame>
        ${crestSVG('lotus')}
        <span class="nm-frame__img">${imgTag(cardPhoto, altFor(cardPhoto, 'card.photo'), '(max-width: 760px) 70vw, 280px', { eager: true })}</span>
      </figure>
    </div>` : '<div class="nm-fitbox"></div>'}
    <h1 class="nm-names nm-fit" id="names">${names()}</h1>
    <p class="nm-date">${bi(dateBi)}<span class="nm-date__alt">${bi(dateAlt)}</span></p>
  </div>`;

const MINI_MAX = 4;
const p3Inner = `
  <div class="nm-pbody nm-p3__body">
    ${tiles()}
    <p class="nm-p3__title">${bi(txt('prog.title'))}</p>
    <ol class="nm-mini">
      ${events.slice(0, MINI_MAX).map((e) => {
        const bs = bsDateOf(e.start, e.dateBS);
        const wdNe = dateOf(e.start).ne.split(', ')[0];
        const bsS = (bs.short?.ne || '').replace(/,\s*[०-९]+$/, '');
        const bsE = (bs.short?.en || '').replace(/\s+\d{4}$/, '');
        return `<li><b>${bi(e.title)}</b><span>${bi({ en: `${shortAD(e.start).en}${bsE ? ` · ${bsE}` : ''}`, ne: bsS ? `${wdNe}, ${bsS} गते` : shortAD(e.start).ne })}</span><span class="nm-mini__t">${bi(timeLabel(e))}</span></li>`;
      }).join('')}
    </ol>
    <p class="nm-mini__extra" ${events.length > MINI_MAX ? '' : 'hidden'}>${bi(T.more(Math.max(0, events.length - MINI_MAX)))}</p>
    <a class="nm-mini__more" href="#programme" data-go="#programme">${bi(T.full)}<span aria-hidden="true"> →</span></a>
  </div>`;

const panel = (n, inner, out = '') => `
  <article class="nm-pnl nm-pnl--${n}" id="p${n}" data-p="${n}">
    <div class="nm-face nm-face--in">${sheet(inner)}<i class="nm-shade"></i><i class="nm-cast"></i></div>
    ${out}
  </article>`;

// ───────────────────────── Journey leaves ─────────────────────────
const deityLeaf = faith && deity ? `
  <article class="nm-leaf nm-leaf--bless" id="blessing" aria-labelledby="bless-title">
    <div class="nm-leaf__in">
      <div class="nm-bless__art" data-fit="deity">
        <figure class="nm-deity nm-deity--big" data-frame>
          <span class="nm-deity__img">${imgTag(deity, deity?.alt || S.alt('card.deity'), '(max-width: 760px) 80vw, 420px')}</span>
          <span class="nm-diyo nm-diyo--l">${diyoSVG()}</span><span class="nm-diyo nm-diyo--r">${diyoSVG()}</span>
        </figure>
      </div>
      <div class="nm-bless__text">
        ${show('card.invocation') ? `<p class="nm-invoke nm-invoke--big" lang="ne">${esc(invocation.ne)}</p>` : ''}
        <h2 class="nm-h2" id="bless-title">${bi(txt('blessing.title'))}</h2>
        ${show('card.shloka') ? `<p class="nm-shloka nm-shloka--big" lang="sa">${esc(shloka.ne)}</p>
        <p class="nm-meaning">${esc(shloka.en)}</p>` : ''}
        ${lotusSVG('nm-bless__lotus')}
      </div>
    </div>
  </article>` : '';

const archPhoto = (ref, alt, cls) => `
  <figure class="nm-frame nm-frame--canopy ${cls}" data-frame>
    ${canopySVG()}
    <span class="nm-frame__img">${imgTag(ref, alt, '(max-width: 760px) 44vw, 340px')}</span>
  </figure>`;

const coupleLeaf = `
  <article class="nm-leaf nm-leaf--couple" id="couple" aria-labelledby="couple-title">
    <div class="nm-leaf__in">
      ${bridePh ? `<div class="nm-couple__ph nm-couple__ph--l" data-fit="photo">${archPhoto(bridePh, altFor(bridePh, 'couple.bride'), '')}</div>` : ''}
      <div class="nm-couple__mid">
        <p class="nm-kicker">${bi(txt('couple.title'))}</p>
        <h2 class="nm-couple__names nm-fit" id="couple-title">${names()}</h2>
        <p class="nm-couple__line">${bi(txt('couple.line'))}</p>
        <div class="nm-fam">
          <div class="nm-fam__side">
            <p class="nm-fam__name">${bi(c.bride.fullName)}</p>
            <p class="nm-fam__of">${bi(txt('families.daughter'))}</p>
            <p class="nm-fam__parents">${bi(c.bride.parents)}</p>
            ${c.bride.home?.en || c.bride.home?.ne ? `<p class="nm-fam__home">${bi(c.bride.home)}</p>` : ''}
          </div>
          <span class="nm-fam__knot" aria-hidden="true">${lotusSVG()}</span>
          <div class="nm-fam__side">
            <p class="nm-fam__name">${bi(c.groom.fullName)}</p>
            <p class="nm-fam__of">${bi(txt('families.son'))}</p>
            <p class="nm-fam__parents">${bi(c.groom.parents)}</p>
            ${c.groom.home?.en || c.groom.home?.ne ? `<p class="nm-fam__home">${bi(c.groom.home)}</p>` : ''}
          </div>
        </div>
      </div>
      ${groomPh ? `<div class="nm-couple__ph nm-couple__ph--r" data-fit="photo">${archPhoto(groomPh, altFor(groomPh, 'couple.groom'), '')}</div>` : ''}
    </div>
  </article>`;

const inv = config.invitation || {};
const wordsLeaf = `
  <article class="nm-leaf nm-leaf--words" id="words" aria-labelledby="words-title">
    <div class="nm-leaf__in">
      <header class="nm-words__head">
        ${faith && inv.shloka?.sa ? `<p class="nm-words__shloka" lang="sa">${esc(inv.shloka.sa)}</p>` : ''}
        <h2 class="nm-h2" id="words-title">${bi(txt('words.title'))}</h2>
      </header>
      <div class="nm-words__cols">
        <div class="nm-words__col">
          <p class="nm-words__sal">${bi(inv.salutation)}</p>
          <p class="nm-words__p">${bi(inv.body)}</p>
        </div>
        <div class="nm-words__col">
          <p class="nm-words__p">${bi(inv.request)}</p>
          <dl class="nm-words__when">
            <div><dt>${bi(T.date)}</dt><dd>${bi(mainAD)}<br />${bi(mainBS)}</dd></div>
            <div><dt>${bi(T.place)}</dt><dd>${bi(config.city)}</dd></div>
          </dl>
          <p class="nm-words__sign">${bi(inv.signoff)}<b>${bi(config.hosts)}</b></p>
        </div>
      </div>
    </div>
  </article>`;

const eventCard = (e) => {
  const bs = bsDateOf(e.start, e.dateBS);
  const ad = dateOf(e.start);
  const sw = (e.dress?.colors || []).map(safeColor).filter(Boolean);
  const dressText = e.dress?.text && (e.dress.text.en || e.dress.text.ne) ? e.dress.text : null;
  return `
    <li class="nm-ev" id="ev-${esc(e.id)}">
      <h3 class="nm-ev__title">${bi(e.title)}</h3>
      <p class="nm-ev__ad">${bi({ en: ad.en, ne: bs.ne })}</p>
      <p class="nm-ev__bs">${bi({ en: bs.en, ne: ad.ne })}</p>
      <dl class="nm-ev__facts">
        <div><dt>${bi(T.time)}</dt><dd>${bi(timeLabel(e))}</dd></div>
        <div><dt>${bi(T.venue)}</dt><dd>${bi(e.venue)} <a class="nm-map" href="${esc(mapUrl(e.mapQuery || e.venue?.en || ''))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (${esc(e.venue?.en || '')}, opens Google Maps)</span></a></dd></div>
        ${dressText || sw.length ? `<div><dt>${bi(T.wear)}</dt><dd class="nm-dress">${sw.length ? `<span class="nm-sw" aria-hidden="true">${sw.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}${dressText ? `<span>${bi(dressText)}</span>` : ''}</dd></div>` : ''}
      </dl>
    </li>`;
};

const progLeaf = `
  <article class="nm-leaf nm-leaf--prog" id="programme" aria-labelledby="prog-title" style="--n:${Math.min(events.length, 4)}">
    <div class="nm-leaf__in">
      <header class="nm-prog__head">
        ${tiles('nm-tiles--small')}
        <h2 class="nm-h2" id="prog-title">${bi(txt('prog.title'))}</h2>
      </header>
      <ol class="nm-evs">${events.map(eventCard).join('')}</ol>
      <p class="nm-prog__foot"><button class="nm-btn nm-btn--ghost" type="button" id="add-calendar">${bi(T.calendar)}</button></p>
    </div>
  </article>`;

const gap = (kind) => `<div class="nm-gap nm-gap--${kind}" aria-hidden="true"><div class="nm-gap__h">${{
  strands: `<img class="nm-gap__strands" src="${FL('strands-l.webp')}" alt="" loading="lazy" decoding="async" /><span class="nm-gap__posy"><img src="${FL('hibiscus.webp')}" alt="" loading="lazy" /><img src="${FL('rose-red.webp')}" alt="" loading="lazy" /><img src="${FL('marigold-orange.webp')}" alt="" loading="lazy" /></span>`,
  bell: `<span class="nm-gap__bell"><img src="${FL('marigold-strand.webp')}" alt="" loading="lazy" decoding="async" />${bellSVG()}</span><img class="nm-gap__floor" src="${FL('posy.webp')}" alt="" loading="lazy" decoding="async" />`,
  kalash: `<img class="nm-gap__strands nm-gap__strands--r" src="${FL('strands-r.webp')}" alt="" loading="lazy" decoding="async" /><span class="nm-gap__kalash">${kalashSVG()}</span>`,
}[kind]}</div><div class="nm-gap__v"><img src="${FL({ strands: 'sprig.webp', bell: 'posy.webp', kalash: 'marigold-cluster.webp' }[kind])}" alt="" loading="lazy" decoding="async" /></div></div>`;

// ───────────────────────── Markup ─────────────────────────
document.body.insertAdjacentHTML('afterbegin', goldDefs());
document.documentElement.style.setProperty('--nm-dhaka', dhakaTile());
const main = document.getElementById('main');
main.innerHTML = `
  <section class="nm-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    <div class="nm-hero__decor" aria-hidden="true">
      <img class="nm-swag" src="${FL('swag.webp')}" srcset="${FL('swag-sm.webp')} 1200w, ${FL('swag.webp')} 2383w" sizes="100vw" alt="" decoding="async" />
      <span class="nm-hang nm-hang--l"><img src="${FL('marigold-strand.webp')}" alt="" decoding="async" />${bellSVG()}</span>
      <span class="nm-hang nm-hang--r"><img src="${FL('marigold-strand.webp')}" alt="" decoding="async" />${bellSVG()}</span>
      <span class="nm-hero__kalash">${kalashSVG()}<img class="nm-hero__posy" src="${FL('posy.webp')}" alt="" decoding="async" /></span>
      <span class="nm-hero__diyos">${diyoSVG()}${diyoSVG()}<img src="${FL('hibiscus.webp')}" alt="" decoding="async" /></span>
    </div>
    <div class="nm-stage" id="stage">
      <div class="nm-cam" id="cam">
        <div class="nm-spread" id="spread">
          <i class="nm-ground nm-ground--1"></i><i class="nm-ground nm-ground--2"></i><i class="nm-ground nm-ground--3"></i>
          ${panel(1, p1Inner, '<div class="nm-slot-out"></div>')}
          ${panel(2, p2Inner, '<div class="nm-slot-out"></div>')}
          ${panel(3, p3Inner, backHTML)}
        </div>
      </div>
    </div>
    <div class="nm-gate" id="gate">
      <button class="nm-btn nm-btn--open" type="button" id="open" disabled>${bi(txt('gate.open'))}</button>
      <button class="nm-quiet" type="button" id="quiet" disabled>${bi(txt('gate.quiet'))}</button>
    </div>
    <div class="nm-after" id="after">
      <a class="nm-btn nm-btn--ghost" href="#words" data-go="#words">${bi(txt('card.button'))}</a>
      <a class="nm-cue" href="#journey" data-go="#journey"><span>${bi(T.scroll)}</span><i aria-hidden="true"></i></a>
    </div>
  </section>

  <section class="nm-journey" id="journey" aria-label="The card, panel by panel">
    <div class="nm-track" id="track">
      ${deityLeaf}
      ${deityLeaf ? gap('strands') : ''}
      ${coupleLeaf}
      ${gap('bell')}
      ${wordsLeaf}
      ${gap('kalash')}
      ${progLeaf}
    </div>
  </section>

  ${album.length ? `
  <section class="nm-sec nm-album" id="album" aria-labelledby="album-title">
    <div class="nm-leaf nm-leaf--album"><div class="nm-leaf__in">
      <h2 class="nm-h2 nm-rv" id="album-title">${bi(txt('gallery.title'))}</h2>
      <ul class="nm-album__grid">
        ${album.map((g, i) => `<li class="nm-print nm-rv"><button type="button" class="nm-print__btn" data-idx="${i}" aria-label="${esc(g.alt || 'Open photograph')}">${imgTag(g.photo, g.alt, '(max-width: 760px) 46vw, 30vw')}</button></li>`).join('')}
      </ul>
    </div></div>
  </section>` : ''}

  <section class="nm-sec nm-reply" id="rsvp" aria-labelledby="rsvp-title">
    <div class="nm-leaf nm-leaf--reply"><div class="nm-leaf__in">
      <div class="nm-reply__note">
        <p class="nm-kicker">${bi(countLine)}</p>
        <h2 class="nm-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
        <p class="nm-lede">${bi(config.rsvp.deadline)}</p>
        <p><button class="nm-link" type="button" id="share">${bi(T.shareIt)}</button></p>
        ${config.info?.travel || config.info?.stays?.length || config.info?.contacts?.length ? `
        <details class="nm-more">
          <summary>${bi(txt('prog.more'))}</summary>
          <div class="nm-more__in">
            ${config.info?.travel ? `<div><h3>${bi(T.travel)}</h3><p>${bi(config.info.travel)}</p></div>` : ''}
            ${config.info?.stays?.length ? `<div><h3>${bi(T.stays)}</h3><ul>${config.info.stays.map((s) => `<li><b>${bi(s.name)}</b><small>${bi(s.note)}</small><a class="nm-map" href="${esc(mapUrl(s.mapQuery || s.name.en))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span></a></li>`).join('')}</ul></div>` : ''}
            ${config.info?.contacts?.length ? `<div><h3>${bi(T.contacts)}</h3><ul>${config.info.contacts.map((p) => `<li><b>${bi(p.name)}</b><small>${bi(p.role)}</small><span class="nm-links"><a class="nm-map" href="tel:${esc(tel(p.phone))}">${bi(T.call)}</a><a class="nm-map" href="https://wa.me/${esc(tel(p.phone).replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span></li>`).join('')}</ul>
              ${safeHref(config.info.livestream) ? `<a class="nm-map" href="${esc(safeHref(config.info.livestream))}" target="_blank" rel="noopener">${bi(T.live)} ↗</a>` : ''}</div>` : ''}
          </div>
        </details>` : ''}
      </div>
      <form class="rsvp nm-form" id="rsvp-form" novalidate>
        <div class="field">
          <label for="f-name">${bi({ en: 'Your name', ne: 'नाम' })}</label>
          <input id="f-name" name="name" type="text" autocomplete="name" required maxlength="80" />
          <p class="field__err" id="f-name-err" role="alert"></p>
        </div>
        <fieldset class="field field--choice">
          <legend>${bi({ en: 'Will you attend?', ne: 'उपस्थिति' })}</legend>
          <div class="choice-grid">
            <label class="choice"><input type="radio" name="attending" value="yes" checked /><span>${bi({ en: 'Joyfully, yes', ne: 'अवश्य आउँछौं' })}</span></label>
            <label class="choice"><input type="radio" name="attending" value="no" /><span>${bi({ en: 'With love, from afar', ne: 'टाढैबाट शुभकामना' })}</span></label>
          </div>
        </fieldset>
        <div class="rsvp__when-yes">
          <div class="nm-form__row">
            <div class="field">
              <label for="f-guests">${bi({ en: 'Guests, including you', ne: 'पाहुना संख्या' })}</label>
              <select id="f-guests" name="guests"></select>
            </div>
            <div class="field">
              <label for="f-phone">${bi({ en: 'Phone (optional)', ne: 'फोन (ऐच्छिक)' })}</label>
              <input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" />
            </div>
          </div>
          <fieldset class="field field--choice">
            <legend>${bi({ en: 'Which ceremonies?', ne: 'कुन कार्यक्रम?' })}</legend>
            <div id="f-events" class="choice-grid"></div>
          </fieldset>
          <fieldset class="field field--choice">
            <legend>${bi({ en: 'Meal', ne: 'खाना' })}</legend>
            <div class="choice-grid">
              <label class="choice"><input type="radio" name="meal" value="veg" /><span>${bi({ en: 'Vegetarian', ne: 'शाकाहारी' })}</span></label>
              <label class="choice"><input type="radio" name="meal" value="nonveg" checked /><span>${bi({ en: 'Non-vegetarian', ne: 'मांसाहारी' })}</span></label>
            </div>
          </fieldset>
        </div>
        <div class="field">
          <label for="f-msg">${bi({ en: 'A blessing for the couple (optional)', ne: 'शुभकामना (ऐच्छिक)' })}</label>
          <textarea id="f-msg" name="message" rows="2" maxlength="500"></textarea>
        </div>
        <div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>
        <button class="nm-btn" type="submit" id="rsvp-submit">${bi(txt('rsvp.send'))}</button>
        <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
      </form>
    </div></div>
  </section>

  <footer class="nm-close" aria-label="Blessing">
    <div class="nm-close__art" aria-hidden="true">
      <img class="nm-close__fl nm-close__fl--l" src="${FL('corner-b.webp')}" alt="" loading="lazy" decoding="async" />
      <span class="nm-close__kalash">${kalashSVG()}</span>
      <img class="nm-close__fl nm-close__fl--r" src="${FL('corner-b.webp')}" alt="" loading="lazy" decoding="async" />
    </div>
    <p class="nm-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
    <p class="nm-close__en">${esc(config.closing?.en || '')}</p>
    <p class="nm-close__names">${names()}</p>
    ${c.hashtag ? `<p class="nm-close__tag">${esc(c.hashtag)}</p>` : ''}
    <details class="nm-credits">
      <summary>${bi(T.credits)}</summary>
      <ul>
        ${flora.filter((k) => k.slot !== 'deity' || (faith && deity && !config.themeContent?.nimantrana?.images?.['card.deity'])).map((k) => `<li>${esc(k.title)}${k.creator ? ` by ${esc(k.creator)}` : ''}${k.license ? `, ${k.license_url ? `<a href="${esc(k.license_url)}" target="_blank" rel="noopener">${esc(k.license)}</a>` : esc(k.license)}` : ''}${k.source_url ? `, <a href="${esc(k.source_url)}" target="_blank" rel="noopener">source</a>` : ''}</li>`).join('')}
        ${credits.filter((k) => used.has(k.slot) || album.some((g) => keyOf(g.photo) === k.slot) || /^marigold-macro/.test(k.slot)).map((k) => `<li>${esc(k.title || k.slot)} by ${esc(k.creator || 'unknown')}, <a href="${esc(k.license_url || k.source_url)}" target="_blank" rel="noopener">${esc(k.license)}</a>, <a href="${esc(k.source_url)}" target="_blank" rel="noopener">source</a></li>`).join('')}
        ${(config.music?.tracks || []).map((t) => `<li>${esc(t.credit)}</li>`).join('')}
        <li>Card, border, Dhaka weave, arches, tiles, bells, kalash and diyos drawn in code for this invitation.</li>
      </ul>
    </details>
  </footer>

  <div class="nm-lb" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photograph" data-lenis-prevent>
    <button type="button" class="nm-lb__btn nm-lb__x" data-lb="close"><span aria-hidden="true">×</span><span class="sr-only">${esc(T.close.en)}</span></button>
    <button type="button" class="nm-lb__btn nm-lb__prev" data-lb="prev"><span aria-hidden="true">←</span><span class="sr-only">Previous</span></button>
    <figure class="nm-lb__fig"><img alt="" decoding="async" /></figure>
    <button type="button" class="nm-lb__btn nm-lb__next" data-lb="next"><span aria-hidden="true">→</span><span class="sr-only">Next</span></button>
  </div>`;

// ───────────────────────── Shell, RSVP, dialogs ─────────────────────────
const { player } = mountShell({ chapters: [] });
initRsvp(events);
document.getElementById('add-calendar')?.addEventListener('click', () => downloadIcs(events));
document.getElementById('share')?.addEventListener('click', (e) => share(e.currentTarget));

(function lightbox() {
  const lb = document.getElementById('lightbox');
  const im = lb.querySelector('img');
  let i = 0;
  let release = null;
  const showAt = (k) => {
    i = (k + album.length) % album.length;
    im.src = photoUrl(album[i].photo, 'lg');
    im.alt = album[i].alt || '';
  };
  const close = () => {
    if (!release) return;
    const r = release;
    release = null;
    lb.classList.remove('is-open');
    setTimeout(() => { lb.hidden = true; }, 260);
    r();
  };
  document.querySelector('.nm-album__grid')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-idx]');
    if (!b) return;
    showAt(Number(b.dataset.idx));
    release = openModal(lb, { onClose: close });
    requestAnimationFrame(() => lb.classList.add('is-open'));
  });
  lb.addEventListener('click', (e) => {
    const act = e.target.closest('[data-lb]')?.dataset.lb;
    if (act === 'close' || e.target === lb || e.target.classList.contains('nm-lb__fig')) close();
    else if (act === 'prev') showAt(i - 1);
    else if (act === 'next') showAt(i + 1);
  });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') showAt(i - 1);
    if (e.key === 'ArrowRight') showAt(i + 1);
  });
  let x0 = null;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) showAt(i + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}());

// ───────────────────────── Layout: tri-fold across (wide) or unfolding down (phones) ─────────────────────────
const root = document.documentElement;
const hero = document.querySelector('.nm-hero');
const cam = document.getElementById('cam');
const spread = document.getElementById('spread');
const P = [1, 2, 3].map((n) => document.getElementById(`p${n}`));
const coverEl = document.createRange().createContextualFragment(coverHTML).firstElementChild;
const gate = document.getElementById('gate');
const after = document.getElementById('after');

function computeLayout() {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const top = 84;
  const bottom = 112;
  const side = Math.min(140, Math.max(28, vw * 0.075));
  const Wrow = Math.floor(Math.min(420, (vw - side * 2) / 3, (vh - top - bottom) / AR));
  if (vw >= 900 && Wrow >= 330) return { mode: 'row', W: Wrow, H: Math.round(Wrow * AR), ar: AR, vw, vh, top, bottom };
  // phones: a slightly taller card, so the couple's photo gets more room
  const W = Math.floor(Math.min(440, vw - 24));
  const ar = Math.max(AR, Math.min(1.62, (vh - 150) / W));
  return { mode: 'col', W, H: Math.round(W * ar), ar, vw, vh, top: 72, bottom: 0 };
}
let L = computeLayout();

const arch = { ar: AR };
function applyLayout() {
  spread.dataset.mode = L.mode;
  hero.dataset.mode = L.mode;
  root.style.setProperty('--u', `${(L.W / PW).toFixed(4)}px`);
  root.style.setProperty('--pw', `${L.W}px`);
  root.style.setProperty('--ph', `${L.H}px`);
  root.style.setProperty('--vh', `${L.vh}px`);
  // The cover is the outside of the left flap (across) or of the middle panel (down).
  const host = L.mode === 'row' ? P[0] : P[1];
  host.querySelector('.nm-slot-out').append(coverEl);
  if (arch.ar !== L.ar) {
    arch.ar = L.ar;
    const svg = archPanelSVG(PW - 36, PW * L.ar - 64, { spring: 100 });
    document.querySelectorAll('.nm-spread .nm-sheet__arch').forEach((a) => { a.innerHTML = svg; });
  }
}
applyLayout();

// ───────────────────────── Fitting: photos whole, names on at most two lines, nothing overflowing ─────────────────────────
/** Size a framed image to the largest box of its own aspect ratio that fits its container (never cropped). */
function fitFrames(scope = document) {
  scope.querySelectorAll('[data-fit]').forEach((box) => {
    const fig = box.querySelector('[data-frame]');
    const img = fig?.querySelector('img');
    const wrap = fig?.querySelector('.nm-frame__img, .nm-deity__img');
    if (!fig || !img || !wrap) return;
    const ar = Number(img.dataset.ar) || (img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0.75);
    const crest = fig.querySelector('.nm-crest, .nm-canopy');
    const k = crest ? (crest.classList.contains('nm-canopy') ? 120 / 300 : 96 / 300) : 0; // crest height per unit of frame width
    const p = parseFloat(getComputedStyle(wrap).paddingLeft) || 0;
    const cs = getComputedStyle(box);
    const bw = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const bh = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (bw <= 0 || bh <= 0) return;
    // frame width fw = iw + 2p; frame height = k*fw + iw/ar + 2p
    const iw = Math.max(40, Math.min(bw - 2 * p, (bh - 2 * p * (1 + k)) / (k + 1 / ar)));
    fig.style.width = `${Math.floor(iw + 2 * p)}px`;
    wrap.style.height = `${Math.floor(iw / ar + 2 * p)}px`;
  });
}

function fitText(el, maxLines = 2) {
  if (!el) return;
  el.style.fontSize = '';
  const max = parseFloat(getComputedStyle(el).fontSize);
  let size = max;
  const box = el.clientWidth;
  for (let k = 0; k < 24; k++) {
    const vis = [...el.querySelectorAll('.nm-n')].filter((n) => n.offsetParent);
    const lineH = parseFloat(getComputedStyle(el).lineHeight) || size * 1.15;
    const tooWide = vis.some((n) => n.scrollWidth > box + 1) || el.scrollWidth > box + 1;
    const tooTall = el.offsetHeight > lineH * (maxLines + 0.3);
    if (!tooWide && !tooTall) break;
    size *= 0.94;
    el.style.fontSize = `${size}px`;
  }
}

/** Shrink a panel's type a little if a long name or Nepali text would overflow its arch. */
function fitPanels() {
  document.querySelectorAll('.nm-pnl .nm-sheet, .nm-cover .nm-sheet').forEach((sh) => {
    const body = sh.querySelector('.nm-pbody');
    if (!body) return;
    const over = () => body.scrollHeight > body.clientHeight + 1;
    const items = [...body.querySelectorAll('.nm-mini > li')];
    items.forEach((li) => { li.hidden = false; });
    sh.style.setProperty('--t', '1');
    let t = 1;
    for (let k = 0; k < (items.length ? 2 : 6) && over(); k++) {
      t -= 0.03;
      sh.style.setProperty('--t', t.toFixed(3));
    }
    // the programme in brief: drop the last ceremonies (still listed in full below) rather than shrink further
    const extra = body.querySelector('.nm-mini__extra');
    let shown = items.length;
    while (over() && shown > 1) {
      items[--shown].hidden = true;
      const more = events.length - shown;
      extra.hidden = false;
      extra.innerHTML = bi(T.more(more));
    }
    if (extra && shown === items.length) extra.hidden = events.length <= MINI_MAX;
  });
}

function fitAll() {
  document.querySelectorAll('.nm-fit').forEach((el) => fitText(el, 2));
  fitPanels();
  fitFrames();
}

// ───────────────────────── The fold model ─────────────────────────
// a1/a3: how folded the side flaps are across (1 = closed, 0 = open); down: a2 (middle onto top), a3 (bottom onto middle).
const st = { a1: 1, a2: 1, a3: 1, cs: 1, cy: 0 };
const DEG = Math.PI / 180;
const shadeOf = (el) => el.querySelector(':scope > .nm-face--in > .nm-shade');
const outShade = (el) => el.querySelector(':scope .nm-face--out > .nm-shade');
const castOf = (el) => el.querySelector(':scope > .nm-face--in > .nm-cast');
const grounds = [...spread.querySelectorAll('.nm-ground')];

function render() {
  const H = L.H;
  if (L.mode === 'row') {
    const t1 = st.a1 * 180;
    const t3 = st.a3 * 180;
    P[0].style.transform = st.a1 > 0 ? `translateZ(${(2 * Math.min(1, st.a1 * 6)).toFixed(2)}px) rotateY(${t1.toFixed(3)}deg)` : 'none';
    P[2].style.transform = st.a3 > 0 ? `translateZ(${(1 * Math.min(1, st.a3 * 6)).toFixed(2)}px) rotateY(${(-t3).toFixed(3)}deg)` : 'none';
    P[1].style.transform = 'none';
    // Lambert-ish shading on the faces that point at us, and the shadow each flap sweeps across the middle.
    shadeOf(P[0]).style.opacity = (t1 < 90 ? Math.sin(t1 * DEG) * 0.42 : 0).toFixed(3);
    outShade(P[0]).style.opacity = (t1 > 90 ? Math.sin(t1 * DEG) * 0.5 : 0).toFixed(3);
    shadeOf(P[2]).style.opacity = (t3 < 90 ? Math.sin(t3 * DEG) * 0.32 : 0).toFixed(3);
    outShade(P[2]).style.opacity = (t3 > 90 ? Math.sin(t3 * DEG) * 0.4 : 0).toFixed(3);
    const castL = castOf(P[1]);
    castL.style.transformOrigin = 'left center';
    castL.style.transform = `scaleX(${Math.max(0.001, -Math.cos(t1 * DEG) * 0.9).toFixed(3)})`;
    castL.style.opacity = (t1 > 90 && t1 < 179.5 ? 0.5 * Math.sin(t1 * DEG) + 0.12 : 0).toFixed(3);
    const castR = castOf(P[2]);
    castR.style.opacity = '0';
    castOf(P[0]).style.opacity = '0';
    // the inside of the middle panel under the right flap gets the right flap's shadow
    const castR2 = P[1].querySelector('.nm-cast--r');
    castR2.style.transform = `scaleX(${Math.max(0.001, -Math.cos(t3 * DEG) * 0.9).toFixed(3)})`;
    castR2.style.opacity = (t3 > 90 && t3 < 179.5 && st.a1 < 0.5 ? 0.45 * Math.sin(t3 * DEG) + 0.1 : 0).toFixed(3);
    grounds[0].style.opacity = (1 - st.a1) ** 2;
    grounds[2].style.opacity = (1 - st.a3) ** 2;
    grounds[1].style.opacity = 1;
  } else {
    const t2 = st.a2 * 180;
    const t3 = st.a3 * 180;
    const l2 = 2 * Math.min(1, st.a2 * 6);
    const l3 = 1 * Math.min(1, st.a3 * 6);
    P[0].style.transform = 'none';
    P[1].style.transform = st.a2 > 0 ? `translateZ(${l2.toFixed(2)}px) rotateX(${t2.toFixed(3)}deg)` : 'none';
    P[2].style.transform = st.a2 > 0 || st.a3 > 0
      ? `translateY(${-H}px) translateZ(${l2.toFixed(2)}px) rotateX(${t2.toFixed(3)}deg) translateY(${H}px) translateZ(${l3.toFixed(2)}px) rotateX(${t3.toFixed(3)}deg)`
      : 'none';
    shadeOf(P[1]).style.opacity = (t2 < 90 ? Math.sin(t2 * DEG) * 0.4 : 0).toFixed(3);
    outShade(P[1]).style.opacity = (t2 > 90 ? Math.sin(t2 * DEG) * 0.45 : 0).toFixed(3);
    shadeOf(P[2]).style.opacity = (t3 < 90 ? Math.sin(t3 * DEG) * 0.32 : 0).toFixed(3);
    outShade(P[2]).style.opacity = (t3 > 90 ? Math.sin(t3 * DEG) * 0.36 : 0).toFixed(3);
    const c1 = castOf(P[0]);
    c1.style.transform = `scaleY(${Math.max(0.001, -Math.cos(t2 * DEG) * 0.9).toFixed(3)})`;
    c1.style.opacity = (t2 > 90 && t2 < 179.5 ? 0.5 * Math.sin(t2 * DEG) + 0.12 : 0).toFixed(3);
    const c2 = castOf(P[1]);
    c2.style.transform = `scaleY(${Math.max(0.001, -Math.cos(t3 * DEG) * 0.9).toFixed(3)})`;
    c2.style.opacity = (t3 > 90 && t3 < 179.5 && st.a2 < 0.5 ? 0.45 * Math.sin(t3 * DEG) + 0.1 : 0).toFixed(3);
    castOf(P[2]).style.opacity = '0';
    P[1].querySelector('.nm-cast--r').style.opacity = '0';
    grounds[1].style.opacity = (1 - st.a2) ** 2;
    grounds[2].style.opacity = (1 - Math.max(st.a2, st.a3)) ** 2;
    grounds[0].style.opacity = 1;
  }
  cam.style.transform = st.cs === 1 && st.cy === 0 ? 'none' : `translate3d(0, ${st.cy.toFixed(2)}px, 0) scale(${st.cs.toFixed(4)})`;
}
// a second cast element on the middle panel for the right flap (across)
P[1].querySelector('.nm-face--in').insertAdjacentHTML('beforeend', '<i class="nm-cast nm-cast--r"></i>');

/** Camera for the down-unfolding phone card: where the closed card sits, and how far to pull back to see it all. */
function camFor(phase) {
  if (L.mode === 'row') return { cs: 1, cy: 0 };
  const camTop = cam.parentElement.getBoundingClientRect().top + window.scrollY; // the stage is never transformed
  const vh = L.vh;
  const avail = vh - 150; // leave room for the buttons below
  if (phase === 'closed') {
    const s = Math.min(1, avail / L.H);
    const centre = (vh - 110) / 2 + 8;
    return { cs: s, cy: centre - camTop - (s * L.H) / 2 };
  }
  if (phase === 'all') {
    const s = Math.min(1, (vh - 40) / (L.H * 3));
    return { cs: s, cy: vh / 2 - camTop - (s * L.H * 3) / 2 };
  }
  return { cs: 1, cy: 0 };
}

function setClosed() {
  st.a1 = L.mode === 'row' ? 1 : 0;
  st.a2 = L.mode === 'row' ? 0 : 1;
  st.a3 = 1;
  Object.assign(st, camFor('closed'));
  render();
}

// ───────────────────────── Opening ─────────────────────────
document.body.classList.add('nm-locked');
window.scrollTo(0, 0);
fitAll();
setClosed();
document.fonts?.ready.then(() => { fitAll(); if (!opened) setClosed(); });
window.addEventListener('load', () => { fitFrames(); });
document.querySelectorAll('[data-frame] img').forEach((im) => { if (!im.complete) im.addEventListener('load', () => fitFrames(), { once: true }); });
document.addEventListener('langchange', () => requestAnimationFrame(() => { fitAll(); if (!opened) setClosed(); if (journeyReady) ScrollTrigger.refresh(); }));

const openBtn = document.getElementById('open');
const quietBtn = document.getElementById('quiet');
openBtn.disabled = false;
quietBtn.disabled = false;
document.body.classList.add('is-ready');

let opened = false;
let tl = null;
const bells = [...document.querySelectorAll('.nm-hang')];

function buildTimeline() {
  const t = gsap.timeline({ paused: true, onUpdate: render, onComplete: finishOpen });
  if (L.mode === 'row') {
    t.to(st, { a1: 0, duration: 1.25, ease: 'nm-fold' }, 0);
    t.to(st, { a3: 0, duration: 1.2, ease: 'nm-fold' }, 0.5);
  } else {
    const all = camFor('all');
    t.to(st, { a2: 0, duration: 1.15, ease: 'nm-fold' }, 0);
    t.to(st, { a3: 0, duration: 1.1, ease: 'nm-fold' }, 0.55);
    t.to(st, { cs: all.cs, cy: all.cy, duration: 1.2, ease: 'nm-cam' }, 0);
    t.to(st, { cs: 1, cy: 0, duration: 0.8, ease: 'nm-cam' }, 1.75);
  }
  // bells swing once as the card opens (transform only), then settle
  bells.forEach((b, i) => {
    t.fromTo(b, { rotate: 0 }, { rotate: i ? -5 : 5, duration: 0.45, ease: 'sine.out' }, 0.05 + i * 0.08)
      .to(b, { rotate: i ? 3 : -3, duration: 0.6, ease: 'sine.inOut' }, '>')
      .to(b, { rotate: 0, duration: 0.8, ease: 'sine.inOut' }, '>');
  });
  return t;
}

function open(withMusic) {
  if (opened) return;
  opened = true;
  player.unlock();
  player.start(withMusic);
  if (withMusic) { try { ringBell(player.ctx, { gain: 0.2 }); } catch { /* audio optional */ } }
  document.body.classList.add('is-opening');
  if (reduced) { finishOpen(); return; }
  spread.classList.add('is-moving');
  tl = buildTimeline();
  tl.play();
}
openBtn.addEventListener('click', () => open(true));
quietBtn.addEventListener('click', () => open(false));

let lenis = null;
let journeyReady = false;
function finishOpen() {
  st.a1 = 0; st.a2 = 0; st.a3 = 0; st.cs = 1; st.cy = 0;
  render();
  spread.classList.remove('is-moving');
  spread.classList.add('is-open');
  P.forEach((p) => { p.style.transform = ''; });
  cam.style.transform = '';
  document.body.classList.remove('nm-locked', 'is-opening');
  document.body.classList.add('is-open');
  lenis = createSmooth();
  requestAnimationFrame(() => {
    fitAll();
    setupJourney();
    // fonts or the scrollbar can still settle; try the sideways journey once more if it was refused
    setTimeout(() => { if (canGoSideways() && !journey.classList.contains('is-h')) setupJourney(); }, 450);
  });
}

// ───────────────────────── After opening: the journey ─────────────────────────
const journey = document.getElementById('journey');
const track = document.getElementById('track');
let hTween = null;
let mm = null;

function canGoSideways() {
  return L.mode === 'row' && !reduced && window.innerHeight >= 620;
}

function leavesFit() {
  return [...track.querySelectorAll('.nm-leaf')].every((leaf) => {
    const inner = leaf.querySelector('.nm-leaf__in');
    const ok = inner.scrollHeight <= inner.clientHeight + 2;
    if (!ok && DEBUG) console.info('[nimantrana] leaf too tall for the sideways journey:', leaf.id, inner.scrollHeight, inner.clientHeight);
    return ok;
  });
}

function setupJourney() {
  journeyReady = true;
  mm?.revert();
  mm = gsap.matchMedia();
  journey.classList.remove('is-h');
  if (canGoSideways()) {
    journey.classList.add('is-h');
    fitAll();
    fitFrames(journey);
    if (!leavesFit()) journey.classList.remove('is-h');
  }
  fitFrames(journey);
  fitAll();
  track.style.paddingLeft = '';
  track.style.paddingRight = '';
  if (journey.classList.contains('is-h')) {
    // the first and last panels come to rest centred
    const leaves = [...track.querySelectorAll('.nm-leaf')];
    const vw = window.innerWidth;
    track.style.paddingLeft = `${Math.max(24, (vw - leaves[0].offsetWidth) / 2)}px`;
    track.style.paddingRight = `${Math.max(24, (vw - leaves.at(-1).offsetWidth) / 2)}px`;
    mm.add('(min-width: 900px)', () => {
      const dist = () => track.scrollWidth - window.innerWidth;
      hTween = gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: journey,
          start: 'top top',
          end: () => `+=${dist()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          snap: {
            snapTo: (v) => {
              const pts = leafStops();
              return pts.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), pts[0]);
            },
            duration: { min: 0.25, max: 0.7 },
            delay: 0.12,
            inertia: false,
            ease: 'power2.inOut',
          },
        },
      });
      // the bell, strands and kalash between panels drift a little slower than the card (desktop only)
      track.querySelectorAll('.nm-gap__h > *').forEach((el, i) => {
        gsap.fromTo(el, { x: 36 + (i % 2) * 14 }, {
          x: -36 - (i % 2) * 14,
          ease: 'none',
          scrollTrigger: { trigger: el.closest('.nm-gap'), containerAnimation: hTween, start: 'left right', end: 'right left', scrub: true },
        });
      });
      return () => { hTween = null; gsap.set(track, { x: 0 }); };
    });
  }
  // headings and photographs settle in once (never body text)
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.nm-rv').forEach((el) => io.observe(el));
  ScrollTrigger.refresh();
}

function leafStops() {
  const max = track.scrollWidth - window.innerWidth;
  if (max <= 0) return [0];
  return [...track.querySelectorAll('.nm-leaf')].map((leaf) => {
    const centre = leaf.offsetLeft + leaf.offsetWidth / 2 - window.innerWidth / 2;
    return Math.min(1, Math.max(0, centre / max));
  });
}

// In-page links (also inside the pinned track): scroll to the panel.
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-go]');
  if (!a) return;
  e.preventDefault();
  const el = document.querySelector(a.dataset.go);
  if (!el) return;
  scrollToEl(el);
});

function scrollToEl(el) {
  let y;
  if (hTween && journey.contains(el) && el !== journey) {
    const st2 = hTween.scrollTrigger;
    const max = track.scrollWidth - window.innerWidth;
    const leaf = el.closest('.nm-leaf') || el;
    const x = Math.min(max, Math.max(0, leaf.offsetLeft + leaf.offsetWidth / 2 - window.innerWidth / 2));
    y = st2.start + (max ? (x / max) * (st2.end - st2.start) : 0);
  } else {
    y = el.getBoundingClientRect().top + window.scrollY - (el === journey ? 0 : 24);
  }
  if (lenis) lenis.scrollTo(y, { duration: 1.4 }); else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
}

// ───────────────────────── Resize ─────────────────────────
let rw = window.innerWidth;
let rh = window.innerHeight;
let rtimer;
window.addEventListener('resize', () => {
  if (window.innerWidth === rw && Math.abs(window.innerHeight - rh) < 120 && opened) return;
  rw = window.innerWidth;
  rh = window.innerHeight;
  clearTimeout(rtimer);
  rtimer = setTimeout(() => {
    const was = L.mode;
    L = computeLayout();
    applyLayout();
    fitAll();
    if (!opened) setClosed();
    else if (journeyReady && (was !== L.mode || true)) setupJourney();
  }, 120);
});

// ───────────────────────── Debug hook (screenshots) ─────────────────────────
if (DEBUG) {
  window.__nm = {
    gsap, ScrollTrigger, st, L: () => L,
    open: () => open(false),
    seek: (t) => {
      if (!tl) { opened = true; document.body.classList.add('is-opening'); spread.classList.add('is-moving'); tl = buildTimeline(); }
      tl.pause(); tl.seek(t); render();
    },
    finish: () => { opened = true; tl?.kill(); finishOpen(); },
    to: (sel, offset = 0) => {
      const el = document.querySelector(sel);
      if (!el) return;
      let y;
      if (hTween && journey.contains(el) && el !== journey) {
        const s2 = hTween.scrollTrigger;
        const max = track.scrollWidth - window.innerWidth;
        const leaf = el.closest('.nm-leaf') || el;
        const x = Math.min(max, Math.max(0, leaf.offsetLeft + leaf.offsetWidth / 2 - window.innerWidth / 2));
        y = s2.start + (max ? (x / max) * (s2.end - s2.start) : 0);
      } else y = el.getBoundingClientRect().top + window.scrollY + offset;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
      ScrollTrigger.update();
      document.querySelectorAll('.nm-rv').forEach((n) => n.classList.add('is-in'));
    },
    fitAll,
  };
  if (params.has('open')) window.__nm.finish();
}
