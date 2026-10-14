// Theme · Mala (माला) — "Garland".
// Real flower garlands are the living frame of the invitation: marigold swags and jasmine
// strands hang across the top of the page and sway with your scroll and your finger, the
// couple's photographs hang from a marigold rope like fresh prints, and at the Swayambar the
// two garlands are carried across and exchanged (the one signature motion, tied to scroll).
// Everything else is calm: lokta-paper white, one sindoor accent, a very clear programme.
import '../../core/base.css';
import './mala.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadInvitation } from '../../core/data.js';
import { bi, esc, dateOf, bsDateOf, timeLabel, mapUrl, neNum, dayNum } from '../../core/i18n.js';
import { mountShell } from '../../core/shell.js';
import { createSmooth, reducedMotion, isMobile, getLenis } from '../../core/smooth.js';
import { initRsvp } from '../../core/rsvp.js';
import { guestEvents } from '../../core/finale.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { photos, photoUrl } from '../../photos.js';
import credits from '../../generated/credits.json';
import { useSlots } from '../../core/slots.js';
import { openModal } from '../../core/modal.js';
import { GarlandScene, runScenes, preload } from './garland.js';
import manifest from './slots.js';

gsap.registerPlugin(ScrollTrigger);

const config = await loadInvitation();
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion() || params.has('still');
const mobile = isMobile();
const c = config.couple;
const events = guestEvents();

// ───────────────────────── Slots ─────────────────────────
// ?debug&img.<slot>=<slug>&txt.<slot>=<text> previews a studio override without touching config.js.
if (DEBUG) {
  const mine = ((config.themeContent ||= {})[manifest.theme] ||= {});
  for (const [k, v] of params) {
    if (k.startsWith('img.')) (mine.images ||= {})[k.slice(4)] = v;
    if (k.startsWith('txt.')) (mine.texts ||= {})[k.slice(4)] = { en: v, ne: v };
  }
}
const S = useSlots(manifest);
const txt = S.txt;

const dims = Object.fromEntries(credits.map((k) => [String(k.file || k.slot).replace(/\.(jpe?g|png|webp)$/i, ''), [k.width, k.height]]));
const isUrl = (s) => typeof s === 'string' && (s.startsWith('/') || s.startsWith('https://'));
const isLibrary = (ref) => typeof ref === 'string' && !isUrl(ref);
const keyOf = (ref) => (typeof ref === 'string' ? ref : ref && typeof ref === 'object' ? ref.lg || ref.sm || '' : '');
const aspectOf = (ref) => {
  if (typeof ref === 'string' && dims[ref]?.[0]) return dims[ref][0] / dims[ref][1];
  if (ref && typeof ref === 'object' && ref.w && ref.h) return ref.w / ref.h;
  return 0;
};
const focalOf = (ref) => (typeof ref === 'string' && photos[ref]?.focal) || (ref && typeof ref === 'object' && ref.focal) || [0.5, 0.5];
const safeHref = (u) => (/^https:\/\//i.test(String(u || '')) ? String(u) : '');
const safeColor = (s) => (/^#[0-9a-f]{3,8}$/i.test(String(s)) ? s : null);
const tel = (p) => String(p).replace(/[^\d+]/g, '');
const PEOPLE = /^(couple|wedding|mehendi-hands|bride|groom)/;
const isCouple = (ref) => !!ref && (typeof ref === 'object' || isUrl(ref) || PEOPLE.test(ref));

const portraitAlt = Object.fromEntries((c.portraits || []).filter((p) => p?.photo).map((p) => [keyOf(p.photo), p.alt || '']));
const altFor = (ref, id) => portraitAlt[keyOf(ref)] || S.alt(id) || `${c.bride.name.en} and ${c.groom.name.en}`;

/** <img> with both sizes and the focal point; never cropped by its frame (frames take the photo's ratio). */
const img = (ref, alt, sizes, { eager = false } = {}) => {
  const sm = photoUrl(ref, 'sm'); const lg = photoUrl(ref, 'lg');
  const [fx, fy] = focalOf(ref);
  return `<img src="${esc(sm)}" ${sm !== lg ? `srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w"` : ''} sizes="${sizes}" alt="${esc(alt || '')}"
    style="object-position:${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
};
const plate = (ref, alt, sizes, cls = '', opts) => {
  const ar = aspectOf(ref);
  return `<span class="ml-plate ${cls}" data-ar="${ar ? '1' : 'auto'}" style="--ar:${(ar || 0.75).toFixed(4)}">${img(ref, alt, sizes, opts)}</span>`;
};

// ───────────────────────── Which photo goes where ─────────────────────────
const used = new Set();
const take = (ref) => { if (ref) used.add(keyOf(ref)); return ref; };
const heroRef = take(S.img('hero.photo'));
const stageRef = take(S.img('stage.photo'));
const brideRef = take(S.img('swayambar.bride'));
const groomRef = take(S.img('swayambar.groom'));
const fromSlots = (prefix, n) => {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const id = `${prefix}.${i}`; const ref = S.img(id);
    if (!ref || used.has(keyOf(ref))) continue;
    take(ref); out.push({ photo: ref, alt: altFor(ref, id) });
  }
  return out;
};
const linePhotos = fromSlots('line', 3);
const albumCouple = fromSlots('album', 6);
const travelRef = S.img('travel.photo');
const albumGallery = (config.gallery || [])
  .filter((g) => g?.photo && !used.has(keyOf(g.photo)) && keyOf(g.photo) !== keyOf(travelRef) && !/^marigold/.test(keyOf(g.photo)))
  .filter((g, i, a) => a.findIndex((x) => keyOf(x.photo) === keyOf(g.photo)) === i)
  .sort((x, y) => Number(isCouple(y.photo)) - Number(isCouple(x.photo)));
const album = [...albumCouple, ...albumGallery];

// ───────────────────────── UI chrome ─────────────────────────
const T = {
  map: { en: 'Open map', ne: 'नक्सा हेर्नुहोस्' },
  date: { en: 'Date', ne: 'मिति' },
  bs: { en: 'Bikram Sambat', ne: 'विक्रम संवत्' },
  time: { en: 'Time', ne: 'समय' },
  venue: { en: 'Venue', ne: 'स्थान' },
  wear: { en: 'Dress', ne: 'पहिरन' },
  call: { en: 'Call', ne: 'फोन' },
  live: { en: 'Watch the ceremony live', ne: 'प्रत्यक्ष हेर्नुहोस्' },
  calendar: { en: 'Add to calendar', ne: 'क्यालेन्डरमा थप्नुहोस्' },
  shareIt: { en: 'Share', ne: 'पठाउनुहोस्' },
  credits: { en: 'Photo, garland & music credits', ne: 'श्रेय' },
  close: { en: 'Close', ne: 'बन्द गर्नुहोस्' },
  and: { en: 'and', ne: 'र' },
  scroll: { en: 'Scroll', ne: 'तल जानुहोस्' },
};
const daysLeft = Math.ceil((new Date(config.weddingDate).getTime() - Date.now()) / 86400000);
const countLine = daysLeft > 1
  ? { en: `${daysLeft} days to go`, ne: `${neNum(daysLeft)} दिन बाँकी` }
  : daysLeft === 1 ? { en: 'Tomorrow', ne: 'भोलि' } : { en: 'With love', ne: 'मायासहित' };
const monthYear = (iso) => {
  const en = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', month: 'short', year: 'numeric' }).format(new Date(iso));
  const m = /,\s*(\S+)\s+\S+,\s*(\S+)$/.exec(dateOf(iso).ne);
  return { en, ne: m ? `${m[1]} ${m[2]}` : dateOf(iso).ne };
};
const weekday = (iso) => ({
  en: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', weekday: 'long' }).format(new Date(iso)),
  ne: dateOf(iso).ne.split(',')[0],
});

// ───────────────────────── Gate ─────────────────────────
const gate = document.getElementById('gate');
// Decoration, the way a Nepali decorator dresses a mandap for the wedding: a sindoor silk valance over ivory
// net with a cluster of marigolds, roses and hibiscus at every gather and a posy at the foot of every swag,
// full marigold strings hung from it, brass kalash arrangements standing in a bed of fresh flowers, and photos
// framed with full corners of fresh roses and marigolds. Text never sits on any of it.
const DECOR = '/themes/mala/decor/';
const drape = (cls) => `<picture class="${cls}"><source media="(max-width: 760px)" srcset="${DECOR}drape-sm.webp" /><img src="${DECOR}drape.webp" alt="" decoding="async" /></picture>`;
const DIM = { 'kalash-a': [760, 926], 'kalash-b': [760, 915], 'corner-tl': [720, 611], 'corner-br': [720, 610], 'corner-tr': [720, 610], 'corner-bl': [720, 612] };
const wh = (n) => `width="${DIM[n][0]}" height="${DIM[n][1]}"`;
const kalash = (v, cls, lazy = true) => `<img class="ml-kalash ${cls}" ${wh(`kalash-${v}`)} src="${DECOR}kalash-${v}.webp" srcset="${DECOR}kalash-${v}-sm.webp 380w, ${DECOR}kalash-${v}.webp 760w" sizes="(max-width: 760px) 30vw, 300px" alt="" aria-hidden="true" ${lazy ? 'loading="lazy" ' : ''}decoding="async" />`;
const corner = (k, lazy = true) => `<img class="ml-corner ml-corner--${k}" ${wh(`corner-${k}`)} src="${DECOR}corner-${k}.webp" srcset="${DECOR}corner-${k}-sm.webp 400w, ${DECOR}corner-${k}.webp 720w" sizes="(max-width: 760px) 40vw, 260px" alt="" aria-hidden="true" ${lazy ? 'loading="lazy" ' : ''}decoding="async" />`;
gate.innerHTML = `
  <div class="ml-arch" id="gate-arch" aria-hidden="true">
    <div class="ml-arch__strands" id="gate-strands"></div>
    ${drape('ml-drape ml-arch__drape')}
    ${kalash('a', 'ml-arch__kl', false)}
    ${kalash('b', 'ml-arch__kr', false)}
  </div>
  <div class="ml-gate__inner">
    <p class="ml-kicker">${bi(txt('gate.from'))}</p>
    <p class="ml-gate__names"><span class="ml-gate__n">${bi(c.bride.name)}</span><span class="ml-amp" aria-hidden="true">&amp;</span><span class="sr-only">${bi(T.and)}</span><span class="ml-gate__n">${bi(c.groom.name)}</span></p>
    <p class="ml-gate__date">${bi(dateOf(config.weddingDate))}</p>
    <p class="ml-gate__hosts">${bi(config.hosts)}</p>
    <div class="ml-gate__actions">
      <button class="ml-btn" type="button" id="enter" disabled>${bi(txt('gate.open'))}</button>
      <button class="ml-quiet" type="button" id="enter-quiet" disabled>${bi(txt('gate.quiet'))}</button>
    </div>
  </div>`;

const DECOR_CREDITS = [
  { title: 'Red rose with black background', creator: 'Laitche', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Red_rose_with_black_background.jpg' },
  { title: 'Red rose with black background II', creator: 'Laitche', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Red_rose_with_black_background_II.jpg' },
  { title: 'Rosa Red Chateau on black background', creator: "Filo gèn'", license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Rosa_Red_Chateau_on_black_background.jpg' },
  { title: 'Rose on black background', creator: "Filo gèn'", license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Rose_on_black_background.jpg' },
  { title: 'Rose black background', creator: "Filo gèn'", license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Rose_black_background.jpg' },
  { title: 'Pink Rose Closeup With Black Background', creator: 'AsaQuathern', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Pink_Rose_Closeup_With_Black_Background.jpg' },
  { title: 'Leaves of Hopea odorata (one leaf cut out)', creator: 'Silviculture at Vietnamese Wikipedia', license: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Leaves_of_Hopea_odorata.jpg' },
  { title: 'A red hibiscus flower with green leaves around it', creator: 'Pooja Derashri', license: 'CC0', url: 'https://wordpress.org/photos/photo/31065c08a4/' },
];

// ───────────────────────── Main markup ─────────────────────────
const eventRows = events.map((e, i) => {
  const bs = bsDateOf(e.start, e.dateBS);
  const sw = (e.dress?.colors || []).map(safeColor).filter(Boolean);
  return `
  <article class="ml-ev" data-i="${i}">
    <div class="ml-ev__cal" aria-hidden="true">
      <span class="ml-ev__wd">${bi(weekday(e.start))}</span>
      <span class="ml-ev__num">${bi(dayNum(e.start))}</span>
      <span class="ml-ev__my">${bi(monthYear(e.start))}</span>
    </div>
    <div class="ml-ev__main">
      <h3 class="ml-ev__title">${bi(e.title)}</h3>
      <dl class="ml-ev__facts">
        <div><dt>${bi(T.date)}</dt><dd>${bi(dateOf(e.start))}<small>${bi(bs)}</small></dd></div>
        <div><dt>${bi(T.time)}</dt><dd>${bi(timeLabel(e))}</dd></div>
        <div><dt>${bi(T.venue)}</dt><dd>${bi(e.venue)}<a class="ml-map" href="${esc(mapUrl(e.mapQuery || e.venue?.en || ''))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span></a></dd></div>
        ${e.dress && (e.dress.text?.en || e.dress.text?.ne || sw.length) ? `<div><dt>${bi(T.wear)}</dt><dd class="ml-ev__dress">${sw.length ? `<span class="ml-sw" aria-hidden="true">${sw.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(e.dress.text || {})}</span></dd></div>` : ''}
      </dl>
      ${e.rituals?.length ? `
      <details class="ml-rituals">
        <summary>${bi(txt('days.order'))}</summary>
        <ol>${e.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol>
      </details>` : ''}
    </div>
  </article>`;
}).join('');

const mainEvent = events.find((e) => e.id === 'wedding') || events[0];
const main = document.getElementById('main');
main.innerHTML = `
  <section class="ml-hero" id="top" aria-labelledby="hero-names">
    <div class="ml-hero__grid">
      <div class="ml-hero__text">
        <p class="ml-kicker ml-rv">${bi(txt('hero.kicker'))}</p>
        <h1 class="ml-names ml-rv" id="hero-names">
          <span class="ml-names__one">${bi(c.bride.name)}</span>
          <span class="ml-names__amp" aria-hidden="true">&amp;</span><span class="sr-only">${bi(T.and)}</span>
          <span class="ml-names__two">${bi(c.groom.name)}</span>
        </h1>
        <p class="ml-hero__line ml-rv">${bi(txt('hero.line'))}</p>
        <p class="ml-hero__date ml-rv"><b>${bi(dateOf(config.weddingDate))}</b><span>${bi(bsDateOf(config.weddingDate, config.weddingDateBS?.en ? config.weddingDateBS : null))}</span><span>${bi(config.city)}</span></p>
      </div>
      <figure class="ml-hero__fig" id="hero-fig" style="--ar:${(aspectOf(heroRef) || 0.75).toFixed(4)}">
        ${plate(heroRef, altFor(heroRef, 'hero.photo'), '(max-width: 760px) 74vw, 34vw', 'ml-hero__plate', { eager: true })}
        ${corner('tl', false)}
        ${corner('br', false)}
      </figure>
    </div>
    <span class="ml-cue" aria-hidden="true">${bi(T.scroll)}<i></i></span>
  </section>

  <section class="ml-fam" id="families" aria-labelledby="fam-title">
    <h2 class="ml-h2 ml-in" id="fam-title">${bi(txt('intro.line'))}</h2>
    <div class="ml-fam__grid">
      <div class="ml-fam__side ml-in">
        <p class="ml-label">${bi(txt('intro.bride'))}</p>
        <p class="ml-fam__name">${bi(c.bride.fullName)}</p>
        <p class="ml-fam__of">${bi(txt('intro.daughter'))} ${bi(c.bride.parents)}</p>
        <p class="ml-fam__home">${bi(c.bride.home)}</p>
      </div>
      <span class="ml-fam__rule" aria-hidden="true"></span>
      <div class="ml-fam__side ml-in">
        <p class="ml-label">${bi(txt('intro.groom'))}</p>
        <p class="ml-fam__name">${bi(c.groom.fullName)}</p>
        <p class="ml-fam__of">${bi(txt('intro.son'))} ${bi(c.groom.parents)}</p>
        <p class="ml-fam__home">${bi(c.groom.home)}</p>
      </div>
    </div>
    <button class="ml-btn ml-btn--ghost ml-in" type="button" id="open-card">${bi(txt('intro.card'))}</button>
  </section>

  <section class="ml-stage" id="stage" aria-labelledby="stage-title">
    <div class="ml-stage__set" id="stage-set">
      ${drape('ml-drape ml-stage__drape')}
      <div class="ml-stage__row">
        ${kalash('b', 'ml-stage__kl')}
        <figure class="ml-stage__fig" id="stage-fig" style="--fig-ar:${(aspectOf(stageRef) || 0.8).toFixed(4)}">${plate(stageRef, altFor(stageRef, 'stage.photo'), '(max-width: 760px) 64vw, 36vw', 'ml-stage__plate')}${corner('tl')}${corner('br')}</figure>
        ${kalash('a', 'ml-stage__kr')}
      </div>
    </div>
    <div class="ml-stage__cap">
      <p class="ml-kicker ml-in">${bi(txt('stage.kicker'))}</p>
      <h2 class="ml-h2 ml-in" id="stage-title">${bi(mainEvent?.title || txt('hero.kicker'))}</h2>
      ${mainEvent ? `<p class="ml-stage__when ml-in">${bi(dateOf(mainEvent.start))}<br />${bi(mainEvent.venue)}</p>` : ''}
    </div>
  </section>

  <section class="ml-sway" id="swayambar" aria-labelledby="sway-title">
    <div class="ml-sway__stage" id="sway-stage">
      <header class="ml-sway__head">
        <h2 class="ml-h2" id="sway-title">${bi(txt('sway.title'))}</h2>
      </header>
      <div class="ml-sway__pair">
        <figure class="ml-sway__fig" id="sway-bride">${plate(brideRef, altFor(brideRef, 'swayambar.bride'), '(max-width: 760px) 46vw, 24vw', 'ml-sway__plate')}<figcaption>${bi(c.bride.name)}</figcaption></figure>
        <figure class="ml-sway__fig" id="sway-groom">${plate(groomRef, altFor(groomRef, 'swayambar.groom'), '(max-width: 760px) 46vw, 24vw', 'ml-sway__plate')}<figcaption>${bi(c.groom.name)}</figcaption></figure>
      </div>
      <p class="ml-sway__line">${bi(txt('sway.line'))}</p>
    </div>
  </section>

  <section class="ml-days" id="ceremonies" aria-labelledby="days-title">
    <header class="ml-days__head">
      <p class="ml-kicker ml-in">${bi(txt('days.kicker'))}</p>
      <h2 class="ml-h2 ml-in" id="days-title">${bi(txt('days.title'))}</h2>
    </header>
    <div class="ml-days__list">${eventRows}</div>
  </section>

  ${linePhotos.length ? `
  <section class="ml-line" id="us" aria-labelledby="line-title">
    <h2 class="ml-h2 ml-in" id="line-title">${bi(txt('line.title'))}</h2>
    <div class="ml-line__stage" id="line-stage">
      ${linePhotos.map((p, i) => `<figure class="ml-print" data-i="${i}">${plate(p.photo, p.alt, '(max-width: 760px) 46vw, 26vw', 'ml-print__plate')}</figure>`).join('')}
    </div>
  </section>` : ''}

  <section class="ml-travel" id="travel" aria-labelledby="travel-title">
    <figure class="ml-travel__fig ml-in">${plate(travelRef, S.alt('travel.photo'), '(max-width: 760px) 100vw, 58vw', 'ml-travel__plate')}${corner('tl')}${corner('bl')}</figure>
    <div class="ml-travel__text">
      <h2 class="ml-h2 ml-in" id="travel-title">${bi(txt('travel.title'))}</h2>
      <p class="ml-p ml-in">${bi(config.info.travel)}</p>
      ${(config.info.stays || []).length ? `<p class="ml-label">${bi(txt('travel.stay'))}</p>
      <ul class="ml-list">${config.info.stays.map((s) => `
        <li><b>${bi(s.name)}</b><small>${bi(s.note)}</small><a class="ml-map" href="${esc(mapUrl(s.mapQuery || s.name.en))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span></a></li>`).join('')}
      </ul>` : ''}
      ${(config.info.contacts || []).length ? `<p class="ml-label">${bi(txt('travel.ask'))}</p>
      <ul class="ml-list">${config.info.contacts.map((p) => `
        <li><b>${bi(p.name)}</b><small>${bi(p.role)}</small>
          <span class="ml-links"><a class="ml-map" href="tel:${esc(tel(p.phone))}">${bi(T.call)}</a><a class="ml-map" href="https://wa.me/${esc(tel(p.phone).replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span></li>`).join('')}
      </ul>` : ''}
      ${safeHref(config.info.livestream) ? `<a class="ml-map" href="${esc(safeHref(config.info.livestream))}" target="_blank" rel="noopener">${bi(T.live)}<span aria-hidden="true"> ↗</span></a>` : ''}
    </div>
  </section>

  ${album.length ? `
  <section class="ml-album" id="album" aria-labelledby="album-title">
    <header class="ml-album__head">
      <p class="ml-kicker ml-in">${bi(txt('album.kicker'))}</p>
      <h2 class="ml-h2 ml-in" id="album-title">${bi(txt('album.title'))}</h2>
    </header>
    <div class="ml-album__grid" id="album-grid"></div>
  </section>` : ''}

  <section class="ml-rsvp" id="rsvp" aria-labelledby="rsvp-title">
    <div class="ml-rsvp__col">
      ${corner('tr')}
      ${corner('bl')}
      <p class="ml-kicker ml-in">${bi(countLine)}</p>
      <h2 class="ml-h2 ml-in" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
      <p class="ml-small ml-in">${bi(config.rsvp.deadline)}</p>
      <form class="rsvp ml-form" id="rsvp-form" novalidate>
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
          <div class="ml-form__row">
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
        <button class="ml-btn" type="submit" id="rsvp-submit">${bi(txt('rsvp.send'))}</button>
        <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
      </form>
      <p class="ml-rsvp__actions">
        <button class="ml-link" type="button" id="add-calendar">${bi(T.calendar)}</button>
        <button class="ml-link" type="button" id="share">${bi(T.shareIt)}</button>
      </p>
    </div>
  </section>

  <footer class="ml-close" id="close" aria-label="Blessing">
    <p class="ml-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
    <p class="ml-close__en">${esc(config.closing?.en || '')}</p>
    <p class="ml-close__names">${bi(c.bride.name)} <span class="ml-amp" aria-hidden="true">&amp;</span><span class="sr-only">${bi(T.and)}</span> ${bi(c.groom.name)}</p>
    ${c.hashtag ? `<p class="ml-small">${esc(c.hashtag)}</p>` : ''}
    <details class="ml-credits">
      <summary>${bi(T.credits)}</summary>
      <ul>${credits.map((k) => `<li>${esc(k.title || k.slot)} by ${esc(k.creator || 'unknown')}, <a href="${esc(k.license_url || k.source_url)}" target="_blank" rel="noopener">${esc(k.license)}</a>, <a href="${esc(k.source_url)}" target="_blank" rel="noopener">source</a></li>`).join('')}
      <li>The garlands are cut out of three of the photographs above: marigold strands from “Marigold garlands, Pak Khlong Talat flower market Bangkok” (Gzzz, CC BY-SA 4.0), rose bands from “Garlands in Indian flower market” (Elvina Goves, CC0), the varmala from “A garland made of yellow-orange marigold (Jamanthi) flowers” (Balu B, CC0). The kalash arrangements, rosettes and photo corners are composed from these cut-outs (Wikimedia Commons and the WordPress Photo Directory): ${DECOR_CREDITS.map((k) => `“${esc(k.title)}” by ${esc(k.creator)}, <a href="${esc(k.url)}" target="_blank" rel="noopener">${esc(k.license)}</a>`).join('; ')}; marigolds from the library photo “marigold-macro”. Silk drape, brass kalash and paper are rendered for this theme.</li>
      ${(config.music?.tracks || []).map((t) => `<li>${esc(t.credit)}</li>`).join('')}</ul>
    </details>
  </footer>

  <div class="ml-card-wrap" id="card" hidden role="dialog" aria-modal="true" aria-labelledby="card-title" data-lenis-prevent>
    <div class="ml-card" id="card-panel">
      <button class="ml-card__x" type="button" data-card-close><span aria-hidden="true">×</span><span class="sr-only">${esc(T.close.en)}</span></button>
      <p class="ml-card__shloka" lang="sa">${esc(config.invitation.shloka.sa)}</p>
      <p class="ml-card__shloka-en l-en">${esc(config.invitation.shloka.en)}</p>
      <h2 class="ml-card__title" id="card-title">${bi(txt('card.title'))}</h2>
      <p class="ml-card__p">${bi(config.invitation.salutation)}</p>
      <p class="ml-card__p">${bi(config.invitation.body)}</p>
      <p class="ml-card__p">${bi(config.invitation.request)}</p>
      <p class="ml-card__sign">${bi(config.invitation.signoff)}<br /><b>${bi(config.hosts)}</b></p>
    </div>
  </div>

  <div class="ml-lb" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photograph" data-lenis-prevent>
    <button type="button" class="ml-lb__btn ml-lb__x" data-lb="close"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <button type="button" class="ml-lb__btn ml-lb__prev" data-lb="prev"><span aria-hidden="true">←</span><span class="sr-only">Previous</span></button>
    <figure class="ml-lb__fig"></figure>
    <button type="button" class="ml-lb__btn ml-lb__next" data-lb="next"><span aria-hidden="true">→</span><span class="sr-only">Next</span></button>
  </div>`;

// ───────────────────────── Album: balanced columns, true proportions ─────────────────────────
const grid = document.getElementById('album-grid');
function layoutAlbum() {
  if (!grid) return;
  const cols = window.innerWidth < 760 ? 2 : 3;
  if (grid.dataset.cols === String(cols)) return;
  grid.dataset.cols = String(cols);
  const heights = new Array(cols).fill(0);
  const buckets = Array.from({ length: cols }, () => []);
  album.forEach((g, i) => {
    const ar = aspectOf(g.photo) || (g.shape === 'port' ? 0.75 : g.shape === 'sq' ? 1 : 1.5);
    const k = heights.indexOf(Math.min(...heights));
    buckets[k].push(`<button type="button" class="ml-pic" data-idx="${i}" aria-label="${esc(g.alt || 'Open photograph')}">${plate(g.photo, g.alt, '(max-width: 760px) 46vw, 30vw')}</button>`);
    heights[k] += 1 / ar + 0.08;
  });
  grid.innerHTML = buckets.map((b) => `<div class="ml-album__col">${b.join('')}</div>`).join('');
  watchAspects(grid);
}
/** Uploads without known size: measure once loaded so frames keep the photo's own ratio. */
function watchAspects(root = document) {
  root.querySelectorAll('.ml-plate[data-ar="auto"] img').forEach((im) => {
    const set = () => {
      const ar = im.naturalWidth / im.naturalHeight; if (!ar) return;
      const p = im.closest('.ml-plate'); p.style.setProperty('--ar', ar.toFixed(4)); p.dataset.ar = '1';
      const fig = p.parentElement;
      if (fig?.matches('.ml-hero__fig, .ml-stage__fig')) { fig.style.setProperty('--ar', ar.toFixed(4)); fig.style.setProperty('--fig-ar', ar.toFixed(4)); }
      relayout();
    };
    if (im.complete && im.naturalWidth) set(); else im.addEventListener('load', set, { once: true });
  });
}

// ───────────────────────── Shell, RSVP, dialogs ─────────────────────────
const { player } = mountShell({ chapters: [] });
initRsvp(events);
document.getElementById('add-calendar').addEventListener('click', () => downloadIcs(events));
document.getElementById('share').addEventListener('click', (e) => share(e.currentTarget));

const card = document.getElementById('card');
let closeCard = null;
const hideCard = () => {
  if (!closeCard) return;
  const done = closeCard; closeCard = null;
  card.classList.remove('is-open');
  setTimeout(() => { card.hidden = true; }, 300);
  done();
};
document.getElementById('open-card').addEventListener('click', () => {
  closeCard = openModal(card, { scroller: card, onClose: hideCard });
  requestAnimationFrame(() => card.classList.add('is-open'));
});
card.addEventListener('click', (e) => { if (e.target === card || e.target.closest('[data-card-close]')) hideCard(); });

function initLightbox() {
  const lb = document.getElementById('lightbox');
  const im = document.createElement('img');
  im.decoding = 'async';
  lb.querySelector('figure').append(im);
  let i = 0; let release = null;
  const show = (k) => { i = (k + album.length) % album.length; im.src = photoUrl(album[i].photo, 'lg'); im.alt = album[i].alt || ''; };
  const close = () => {
    if (!release) return;
    const r = release; release = null;
    lb.classList.remove('is-open'); setTimeout(() => { lb.hidden = true; }, 280); r();
  };
  grid?.addEventListener('click', (e) => {
    const b = e.target.closest('.ml-pic'); if (!b) return;
    show(Number(b.dataset.idx));
    release = openModal(lb, { onClose: close });
    requestAnimationFrame(() => lb.classList.add('is-open'));
  });
  lb.addEventListener('click', (e) => {
    const act = e.target.closest('[data-lb]')?.dataset.lb;
    if (act === 'close' || e.target === lb) close(); else if (act === 'prev') show(i - 1); else if (act === 'next') show(i + 1);
  });
  lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
  let x0 = null;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
}
layoutAlbum();
initLightbox();
watchAspects();

// ───────────────────────── Garlands ─────────────────────────
const local = (el, host) => {
  const a = el.getBoundingClientRect(); const b = host.getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height, cx: a.left - b.left + a.width / 2 };
};
const scenes = [];
const gateStrands = document.getElementById('gate-strands');
const stageSet = document.getElementById('stage-set');
const swayStage = document.getElementById('sway-stage');
const lineStage = document.getElementById('line-stage');
const gateScene = new GarlandScene(gateStrands, { reduced, shadow: { x: 4, y: 9, opacity: 0.18 } });
const stageScene = new GarlandScene(stageSet, { reduced, shadow: { x: 4, y: 9, opacity: 0.18 } });
const swayScene = new GarlandScene(swayStage, { reduced });
const lineScene = lineStage ? new GarlandScene(lineStage, { reduced, bleed: 0 }) : null;
scenes.push(gateScene, stageScene, swayScene); if (lineScene) scenes.push(lineScene);

/** Marigold strings hung from the valance, each finished with one small marigold. They hang at the
 *  sides and under the rosettes, and are cut short wherever they would reach text, a photo or a kalash. */
const box = (r, pad = 0) => ({ l: r.x - pad, r: r.x + r.w + pad, t: r.y - pad, b: r.y + r.h + pad });
function hangStrings(scene, host, drapeImg, obstacles) {
  scene.clear(); scene.resize();
  const d = local(drapeImg, host);
  if (!d.w) return;
  const small = /drape-sm/.test(drapeImg.currentSrc || '') || d.w < 761;
  const n = small ? 3 : 5;
  const W = d.w; const H = scene.h;
  const jy = d.y + W * (small ? 0.034 : 0.021);
  const by = d.y + W * (small ? 0.03 : 0.018);
  const rw = small ? 16 : Math.max(18, Math.min(26, W / 80));
  const drop = rw * 1.75;
  const pad = small ? 10 : 30;
  const tex = ['rope-alt2', 'rope-orange', 'rope-alt'];
  const plan = [];
  const side = small ? [[0.026, 0.52], [0.062, 0.42], [0.098, 0.34]] : [[0.012, 0.52], [0.03, 0.44], [0.048, 0.37], [0.066, 0.3]];
  side.forEach(([f, len], i) => {
    plan.push([d.x + W * f, by, H * len, tex[i % 3]]);
    plan.push([d.x + W * (1 - f), by, H * len * 0.95, tex[(i + 1) % 3]]);
  });
  for (let k = 1; k < n; k++) plan.push([d.x + (W * k) / n, jy, H * (k === 1 || k === n - 1 ? 0.3 : 0.22), tex[(k + 2) % 3]]);
  // a short string from the posy at the foot of every swag (dropped wherever it would only be a stub)
  const fy = d.y + W * (small ? 0.205 : 0.092);
  for (let k = 0; k < n; k++) plan.push([d.x + (W * (k + 0.5)) / n, fy, H * (k === 0 || k === n - 1 ? 0.24 : 0.16), tex[k % 3]]);
  const obs = obstacles.filter(Boolean).map((r) => box(r, pad));
  plan.forEach(([x, y0, len, t], i) => {
    let end = y0 + len;
    for (const o of obs) {
      if (x + rw / 2 > o.l && x - rw / 2 < o.r && end + drop > o.t && y0 < o.b) end = Math.min(end, o.t - drop);
    }
    // a string must show a real length below the valance, never just a stub with a flower
    if (end < d.y + d.h + (small ? 44 : 70)) return;
    scene.add({
      tex: t, width: rw, length: end - y0, z: 2 + (i % 2), stiff: 0.5, vOffset: i * 0.37,
      pins: [{ i: 0, at: () => [x, y0] }],
      ornaments: [{ tex: 'drop', f: 1, w: drop * 1.36, mode: 'hang', overlap: drop * 1.36 * 0.125 + rw * 0.3 }],
    });
  });
  scene.settle(360);
}
function buildGate() {
  if (!gateStrands.isConnected) return;
  const inner = [...gate.querySelectorAll('.ml-gate__inner > *')].map((el) => local(el, gateStrands)).filter((r) => r.w);
  const text = inner.length ? (() => {
    const l = Math.min(...inner.map((r) => r.x)); const t = Math.min(...inner.map((r) => r.y));
    const r = Math.max(...inner.map((q) => q.x + q.w)); const b = Math.max(...inner.map((q) => q.y + q.h));
    return { x: l, y: t, w: r - l, h: b - t };
  })() : null;
  const kal = [...gate.querySelectorAll('.ml-kalash')].map((el) => local(el, gateStrands));
  hangStrings(gateScene, gateStrands, gate.querySelector('.ml-arch__drape img'), [text, ...kal]);
}
function buildStage() {
  const fig = document.getElementById('stage-fig');
  const obs = [fig, ...fig.querySelectorAll('.ml-corner'), ...stageSet.querySelectorAll('.ml-kalash')].filter(Boolean).map((el) => local(el, stageSet));
  hangStrings(stageScene, stageSet, stageSet.querySelector('.ml-stage__drape img'), obs);
}

// ───────────────────────── The Swayambar: two garlands exchanged (signature) ─────────────────────────
const sway = { p: reduced ? 1 : 0, A: null, B: null };
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function buildSway() {
  const s = swayScene; s.clear(); s.resize();
  const fL = local(document.getElementById('sway-bride').querySelector('.ml-plate'), swayStage);
  const fR = local(document.getElementById('sway-groom').querySelector('.ml-plate'), swayStage);
  const head = local(swayStage.querySelector('.ml-sway__head'), swayStage);
  const fw = Math.min(fL.w, fR.w);
  const rw = Math.max(15, Math.min(32, fw * 0.105));
  const room = Math.min(fL.y, fR.y) - (head.y + head.h);
  const D = Math.max(60, Math.min(fw * 0.85, room - rw * 4.4));
  const d = Math.min(fw * 0.6, D * 0.78);
  const top = d * 1.12;
  const L = top + 2 * D + d * 0.55;
  const hookY = Math.min(fL.y, fR.y) - D - rw * 2.4;
  const hooks = { L: [fL.cx, hookY], R: [fR.cx, hookY] };
  const arcH = Math.max(0, Math.min(D * 0.7, hookY - (head.y + head.h) - rw * 1.2));
  const travel = (from, to, t, lift, tiltDir) => {
    const e = smooth(t);
    const cx = from[0] + (to[0] - from[0]) * e;
    const cy = from[1] + (to[1] - from[1]) * e - lift * Math.sin(Math.PI * e);
    const tilt = tiltDir * 0.3 * Math.sin(Math.PI * e);
    return [cx, cy, tilt, Math.sin(Math.PI * e)];
  };
  const make = (tex, from, to, window, lift, dir, z) => {
    const get = () => travel(from, to, clamp01((sway.p - window[0]) / (window[1] - window[0])), lift, dir);
    const rope = s.add({
      scaleAt: () => 1 + get()[3] * (z > 2 ? 0.16 : -0.08),
      tex, width: rw, length: L, loop: true, z, stiff: 0.3, damping: 0.982,
      pins: [
        { i: 0, at: () => { const [cx, cy, a] = get(); return [cx - (Math.cos(a) * d) / 2, cy - (Math.sin(a) * d) / 2]; } },
        { i: 0, at: () => { const [cx, cy, a] = get(); return [cx + (Math.cos(a) * d) / 2, cy + (Math.sin(a) * d) / 2]; } },
      ],
      ornaments: [
        { tex: 'band-rose', f: 0.5 + (top / L) / 2, w: rw * 1.7, mode: 'center' },
        { tex: 'drop', f: 0.5 + (top / L) / 2, w: rw * 2.6, mode: 'hang', dir: 'down', overlap: rw * 2.6 * 0.125 + rw * 0.5 },
      ],
    });
    // The hands hold the garland a short way apart; the rest of the loop hangs.
    rope.pins[1].i = Math.max(2, Math.round(rope.n * (top / L)));
    rope.reset();
    return rope;
  };
  sway.A = make('rope-alt', hooks.L, hooks.R, [0.08, 0.7], arcH, 1, 3);
  sway.B = make('rope-orange', hooks.R, hooks.L, [0.22, 0.86], arcH * 0.3, -1, 2);
  s.settle(420);
}

// ───────────────────────── The photo line: prints hanging from a marigold rope ─────────────────────────
const prints = [];
function buildLine() {
  if (!lineScene) return;
  const s = lineScene; s.clear(); prints.length = 0;
  const els = [...lineStage.querySelectorAll('.ml-print')];
  els.forEach((el) => { const im = el.querySelector('img'); if (im) im.loading = 'eager'; });
  const W = lineStage.clientWidth;
  const small = W < 700;
  const perRow = small ? 2 : 3;
  const rw = small ? 22 : 30;
  const thread = small ? 22 : 30;
  const rows = [];
  for (let i = 0; i < els.length; i += perRow) rows.push(els.slice(i, i + perRow));
  let y = 40;
  const rowsMeta = rows.map((row) => {
    const n = row.length;
    const cw = small ? Math.min(W * 0.42, 220) : Math.min(W * 0.25, 330);
    const heights = row.map((el) => cw / (parseFloat(el.querySelector('.ml-plate').style.getPropertyValue('--ar')) || 0.75));
    const top = y; const sag = small ? 38 : 56;
    y += sag * 1.6 + thread + Math.max(...heights) + 24 + (small ? 60 : 90);
    return { row, n, cw, heights, top, sag };
  });
  lineStage.style.height = `${y}px`;
  s.resize();
  rowsMeta.forEach(({ row, n, cw, top, sag }, r) => {
    const a = [-rw, top]; const b = [W + rw, top];
    const span = W + rw * 2;
    const L = span + (8 * sag * sag) / (3 * span);
    const rope = s.add({ tex: r % 2 ? 'rope-orange' : 'rope-alt', width: rw, length: L, z: 2, pins: [{ i: 0, at: () => a }, { i: 'end', at: () => b }] });
    rope.weight = new Float32Array(rope.n).fill(1);
    row.forEach((el, k) => {
      const f = n === 1 ? 0.5 : 0.5 + (k - (n - 1) / 2) * (small ? 0.42 : 0.3);
      const idx = Math.round(f * (rope.n - 1));
      rope.weight[idx] = 1.8;
      el.style.width = `${cw}px`;
      el.style.setProperty('--thread', `${thread}px`);
      prints.push({ el, rope, f, cw, ch: el.offsetHeight, thread, th: 0, w: 0, lastX: null, lastV: 0 });
    });
  });
  s.settle(420);
}
function stepPrints(settled) {
  for (const p of prints) {
    const at = p.rope.sample(p.f);
    if (reduced || settled) { p.th = 0; p.w = 0; p.lastX = at.x; p.lastV = 0; }
    else {
      const v = p.lastX == null ? 0 : (at.x - p.lastX) * 60; const acc = (v - p.lastV) * 60;
      p.lastX = at.x; p.lastV = v;
      const Lp = p.thread + p.ch * 0.5;
      const alpha = -(2200 / Lp) * Math.sin(p.th) - 2.6 * p.w - (acc / Lp) * Math.cos(p.th);
      p.w += alpha / 60; p.th += p.w / 60; p.th = Math.max(-0.35, Math.min(0.35, p.th));
    }
    p.el.style.transform = `translate3d(${(at.x - p.cw / 2).toFixed(2)}px, ${(at.y + p.thread - 2).toFixed(2)}px, 0) rotate(${p.th.toFixed(4)}rad)`;
  }
}
lineScene?.onStep.push(stepPrints);

function relayout() {
  buildGate();
  buildStage();
  buildSway();
  buildLine();
  scenes.forEach((s) => { s.forceRender = true; });
  ScrollTrigger.refresh();
}

// ───────────────────────── Gate & opening ─────────────────────────
const enterBtn = document.getElementById('enter');
const quietBtn = document.getElementById('enter-quiet');
const heroImg = document.querySelector('.ml-arch__drape img');
Promise.all([
  preload(['rope-orange', 'rope-alt', 'rope-alt2', 'band-rose', 'drop']),
  heroImg?.decode?.().catch(() => {}),
  document.fonts?.ready,
]).catch(() => {}).finally(() => {
  enterBtn.disabled = false; quietBtn.disabled = false; gate.classList.add('is-ready');
});

let opened = false;
function open(withMusic) {
  if (opened) return;
  opened = true;
  player.unlock(); player.start(withMusic);
  document.body.classList.remove('is-gated');
  window.scrollTo(0, 0);
  relayout();
  setupScroll();
  const done = () => { gate.remove(); gateScene.active = false; };
  if (reduced) { gsap.to(gate, { opacity: 0, duration: 0.4, onComplete: done }); return; }
  // The entrance: the camera walks forward through the floral arch into the page.
  gate.classList.add('is-entering');
  const tl = gsap.timeline({ onComplete: done });
  tl.to('.ml-gate__inner', { opacity: 0, y: -8, duration: 0.4, ease: 'power2.in' }, 0)
    .to('#gate-arch', { scale: 2.6, duration: 1.8, ease: 'power2.inOut' }, 0.1)
    .to(gate, { backgroundColor: 'rgba(251, 248, 241, 0)', duration: 0.8, ease: 'power1.inOut' }, 0.45)
    .to('#gate-arch', { opacity: 0, duration: 0.55, ease: 'power1.in' }, 1.3)
    .fromTo('.ml-hero__grid', { scale: 0.95 }, { scale: 1, duration: 1.5, ease: 'power2.out', clearProps: 'transform' }, 0.45)
    .fromTo('.ml-hero .ml-rv', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 }, 1.0);
}
enterBtn.addEventListener('click', () => open(true));
quietBtn.addEventListener('click', () => open(false));

// ───────────────────────── Scroll ─────────────────────────
let lenis = null;
let lastY = 0; let scrollV = 0;
runScenes(scenes, gsap, {
  getScrollV: () => {
    const y = window.scrollY; const v = (y - lastY) * 60; lastY = y;
    scrollV += (Math.max(-2400, Math.min(2400, v)) - scrollV) * 0.12;
    return scrollV;
  },
});
// The gate's strands hang and breathe while the guest decides to come in.
const gateDrape = document.querySelector('.ml-arch__drape img');
const initGate = () => { buildGate(); gateScene.forceRender = true; };
if (gateDrape.complete) requestAnimationFrame(initGate); else gateDrape.addEventListener('load', initGate, { once: true });
// Fonts and the kalash images change the measured boxes; rebuild once they are in.
Promise.all([document.fonts?.ready, ...[...gate.querySelectorAll('.ml-kalash')].map((im) => im.decode?.().catch(() => {}))]).then(() => { if (!opened) initGate(); });
window.addEventListener('resize', () => { if (!opened) { clearTimeout(window.__mlG); window.__mlG = setTimeout(initGate, 150); } });
function setupScroll() {
  lenis = createSmooth();

  // The exchange: the stage pins while the two garlands cross.
  if (!reduced) {
    ScrollTrigger.create({
      trigger: '.ml-sway', start: 'top top', end: () => `+=${window.innerHeight * 1.6}`,
      pin: swayStage, pinSpacing: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: (self) => { sway.p = self.progress; swayScene.kick(); },
      onRefresh: () => { swayScene.resize(); },
    });
  } else { sway.p = 1; swayScene.settle(200); swayScene.forceRender = true; }

  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.ml-in, .ml-pic, .ml-ev').forEach((el) => io.observe(el));
  ScrollTrigger.refresh();
}

let rw = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === rw || !opened) return;
  rw = window.innerWidth;
  layoutAlbum();
  clearTimeout(window.__mlT);
  window.__mlT = setTimeout(relayout, 200);
});

// ───────────────────────── Debug hook (screenshots) ─────────────────────────
if (DEBUG) {
  window.__ml = {
    gsap, ScrollTrigger, scenes, sway, open: () => open(false),
    to: (sel, offset = 0) => {
      const el = document.querySelector(sel);
      const y = el.getBoundingClientRect().top + window.scrollY + offset;
      (getLenis() || lenis) ? (getLenis() || lenis).scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
      ScrollTrigger.update();
    },
    /** Jump the exchange to progress p and let the garlands settle there. */
    swayAt: (p) => { sway.p = p; swayScene.settle(240); swayScene.forceRender = true; swayScene.render(); },
    toY: (y) => { const l = getLenis() || lenis; if (l) l.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); ScrollTrigger.update(); },
    settle: () => scenes.forEach((s) => { s.settle(300); s.render(); }),
  };
  if (params.has('open')) open(false);
}
