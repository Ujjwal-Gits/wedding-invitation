// Theme · Gurans (गुराँस) — "Rhododendron", natural Nepal.
// A fine nature journal and a hill resort in spring. The invitation opens as a
// herbarium sheet with a hand-drawn (vector) lali gurans; lifting it reveals the
// one signature motion: a scroll-driven walk up a flowering forest path, out into a
// clearing below the snow peaks and on to a view of the lake, built from real
// photographs with depth (true parallax) while real petals drift down. From there
// everything is quiet textured paper: the couple as pressed prints, the families,
// a very clear programme, travel notes, an album, the RSVP and a blessing.
import '../../core/base.css';
import './gurans.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadInvitation } from '../../core/data.js';
import * as i18n from '../../core/i18n.js';
import { mountShell } from '../../core/shell.js';
import { createSmooth, reducedMotion, isMobile } from '../../core/smooth.js';
import { initRsvp } from '../../core/rsvp.js';
import { guestEvents } from '../../core/finale.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { PhotoStage } from '../../core/stage.js';
import { photos, photoUrl, view } from '../../photos.js';
import credits from '../../generated/credits.json';
import { useSlots } from '../../core/slots.js';
import { openModal } from '../../core/modal.js';
import { sprig, bloom, SPRIG_CSS } from './illustration.js';
import { createPetals } from './petals.js';
import manifest from './slots.js';

const { bi, esc, dateOf, timeRange, mapUrl, neNum } = i18n;
gsap.registerPlugin(ScrollTrigger);

const config = await loadInvitation();
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion();
const mobile = isMobile();
const c = config.couple;
const events = guestEvents();

// ───────────────────────── Slots ─────────────────────────
// ?debug&img.<slot>=<slug>&txt.<slot>=<text> previews a studio override without touching config.js.
if (DEBUG) {
  const tc = (config.themeContent ||= {});
  const mine = (tc[manifest.theme] ||= {});
  for (const [k, v] of params) {
    if (k.startsWith('img.')) (mine.images ||= {})[k.slice(4)] = v;
    if (k.startsWith('txt.')) (mine.texts ||= {})[k.slice(4)] = { en: v, ne: v };
  }
}
const S = useSlots(manifest);
const txt = S.txt;

// B.S. dates come from the shared converter (contract §12); an event's own dateBS wins.
const bsOf = (iso, override) => {
  try { return i18n.bsDateOf ? i18n.bsDateOf(iso, override) : override || null; } catch { return override || null; }
};

// ───────────────────────── Photo helpers ─────────────────────────
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
const PEOPLE = /^(couple|wedding|mehendi-hands|bride|groom|portrait)/;
const isCouple = (ref) => !!ref && (typeof ref === 'object' || isUrl(ref) || PEOPLE.test(ref));
const safeHref = (u) => (/^https:\/\//i.test(String(u || '')) ? String(u) : '');
const safeColor = (s) => (/^#[0-9a-f]{3,8}$/i.test(String(s)) ? s : null);
const tel = (p) => String(p).replace(/[^\d+]/g, '');

const img = (ref, alt, sizes, { eager = false } = {}) => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  const [fx, fy] = focalOf(ref);
  return `<img src="${esc(sm)}" ${sm !== lg ? `srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w"` : ''} sizes="${sizes}" alt="${esc(alt || '')}"
    style="object-position:${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
};
/** A pressed print: white mat, photo corners, the photo's own proportions (never cropped). */
const print = (ref, alt, sizes, { cls = '', cap = '', tilt = 0, eager = false } = {}) => {
  if (!ref) return '';
  const ar = aspectOf(ref);
  const orient = ar ? (ar >= 1.05 ? 'land' : ar <= 0.95 ? 'port' : 'sq') : 'auto';
  return `<figure class="gw-print ${cls}" data-orient="${orient}" style="--ar:${ar ? ar.toFixed(4) : 1.5};--tilt:${tilt}deg">
    <span class="gw-print__mat"><span class="gw-print__img">${img(ref, alt, sizes, { eager })}</span></span>
    ${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
};

// ───────────────────────── Which photo goes where ─────────────────────────
const portraitAlt = Object.fromEntries((c.portraits || []).filter((p) => p?.photo).map((p) => [keyOf(p.photo), p.alt || '']));
const altFor = (ref, id) => portraitAlt[keyOf(ref)] || S.alt(id) || `${c.bride.name.en} and ${c.groom.name.en}`;
const portraitScreen = window.innerHeight > window.innerWidth * 1.05;
const walkRefs = [
  portraitScreen ? S.img('walk.pathTall') || S.img('walk.path') : S.img('walk.path') || S.img('walk.pathTall'),
  S.img('walk.clearing'),
  S.img('walk.lake'),
];
const used = new Set();
const take = (ref) => { if (ref) used.add(keyOf(ref)); return ref; };
const walkCouple = take(S.img('walk.couple'));
const mainPrint = (() => { const r = S.img('couple.photo'); return r && !used.has(keyOf(r)) ? take(r) : null; })();
const brideRef = S.img('couple.bride');
const groomRef = S.img('couple.groom');
const pair = !!(c.bride?.photo && c.groom?.photo && brideRef && groomRef && keyOf(brideRef) !== keyOf(groomRef));
const smallPrints = pair
  ? [{ ref: take(brideRef), cap: bi(c.bride.name), alt: c.bride.name.en }, { ref: take(groomRef), cap: bi(c.groom.name), alt: c.groom.name.en }]
  : ['couple.second', 'couple.third'].map((id) => S.img(id)).filter((r) => r && !used.has(keyOf(r))).map((r, i) => ({ ref: take(r), cap: '', alt: altFor(r, i ? 'couple.third' : 'couple.second') }));
const albumCouple = [];
for (let i = 1; i <= 6; i++) {
  const id = `album.${i}`;
  const ref = S.img(id);
  if (!ref || used.has(keyOf(ref))) continue;
  take(ref);
  albumCouple.push({ photo: ref, alt: altFor(ref, id) });
}
const skip = new Set([...walkRefs.map(keyOf), keyOf(S.img('close.photo')), keyOf(S.img('travel.photo'))]);
const albumGallery = (config.gallery || [])
  .filter((g) => g?.photo && !used.has(keyOf(g.photo)) && !skip.has(keyOf(g.photo)) && !/^marigold/.test(keyOf(g.photo)))
  .filter((g, i, a) => a.findIndex((x) => keyOf(x.photo) === keyOf(g.photo)) === i)
  .sort((x, y) => Number(isCouple(y.photo)) - Number(isCouple(x.photo)));
const album = [...albumCouple, ...albumGallery];

// ───────────────────────── UI chrome (not studio content) ─────────────────────────
const T = {
  time: { en: 'Time', ne: 'समय' },
  venue: { en: 'Venue', ne: 'स्थान' },
  wear: { en: 'Wear', ne: 'पहिरन' },
  map: { en: 'Open map', ne: 'नक्सा हेर्नुहोस्' },
  call: { en: 'Call', ne: 'फोन' },
  live: { en: 'Watch the ceremony live', ne: 'प्रत्यक्ष हेर्नुहोस्' },
  calendar: { en: 'Add to calendar', ne: 'क्यालेन्डरमा राख्नुहोस्' },
  shareIt: { en: 'Share', ne: 'सेयर गर्नुहोस्' },
  credits: { en: 'Photo & music credits', ne: 'तस्बिर तथा संगीत श्रेय' },
  close: { en: 'Close', ne: 'बन्द गर्नुहोस्' },
  and: { en: '&', ne: 'र' },
  scroll: { en: 'Scroll to walk', ne: 'तल सर्नुहोस्' },
};

const daysLeft = Math.ceil((new Date(config.weddingDate).getTime() - Date.now()) / 86400000);
const countLine = daysLeft > 1
  ? { en: `${daysLeft} days to go`, ne: `${neNum(daysLeft)} दिन बाँकी` }
  : daysLeft === 1 ? { en: 'Tomorrow', ne: 'भोलि' } : { en: 'With love', ne: 'मायासहित' };

/** Weekday, day number and month-year for a programme date block. */
const dateParts = (iso) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  const [wdNe, mdNe = '', yNe = ''] = dateOf(iso).ne.split(', ');
  const [mNe = '', dNe = ''] = mdNe.split(' ');
  return {
    wd: { en: parts.weekday, ne: wdNe },
    day: { en: parts.day, ne: dNe },
    my: { en: `${parts.month} ${parts.year}`, ne: `${mNe} ${yNe}` },
  };
};

const names = (cls = '') => `<span class="gw-names ${cls}">
  <span class="gw-names__one">${bi(c.bride.name)}</span>
  <span class="gw-names__amp" aria-hidden="true">${bi(T.and)}</span><span class="sr-only">and</span>
  <span class="gw-names__two">${bi(c.groom.name)}</span></span>`;

// ───────────────────────── Gate: a herbarium sheet ─────────────────────────
const gate = document.getElementById('gate');
const weddingBS = bsOf(config.weddingDate, config.weddingDateBS?.en ? config.weddingDateBS : null);
gate.innerHTML = `
  <style>${SPRIG_CSS}</style>
  <div class="gw-gate__sheet">
    <div class="gw-gate__art">${sprig({ seed: 21, flowers: 14, leaves: 9, stem: 170 })}</div>
    <div class="gw-gate__label">
      <p class="gw-kicker">${bi(txt('gate.kicker'))}</p>
      <h1 class="gw-gate__names">${names()}</h1>
      <p class="gw-gate__line">${bi(txt('gate.line'))}</p>
      <dl class="gw-gate__meta">
        <div><dt class="sr-only">Date</dt><dd>${bi(dateOf(config.weddingDate))}</dd></div>
        ${weddingBS ? `<div><dt class="sr-only">B.S.</dt><dd>${bi(weddingBS)}</dd></div>` : ''}
        <div><dt class="sr-only">Place</dt><dd>${bi(config.city)}</dd></div>
      </dl>
      <div class="gw-gate__actions">
        <button class="gw-btn" type="button" id="enter" disabled>${bi(txt('gate.open'))}</button>
        <button class="gw-quiet" type="button" id="enter-quiet" disabled>${bi(txt('gate.quiet'))}</button>
      </div>
      <span class="gw-gate__load" aria-hidden="true"><i id="gate-bar"></i></span>
    </div>
  </div>`;

// ───────────────────────── Main markup ─────────────────────────
const families = `
  <dl class="gw-families">
    <div><dt class="gw-kicker">${bi(txt('couple.brideLabel'))}</dt><dd><b>${bi(c.bride.fullName)}</b><small>${bi(txt('couple.daughter'))} ${bi(c.bride.parents)}</small>${c.bride.home ? `<small>${bi(c.bride.home)}</small>` : ''}</dd></div>
    <div><dt class="gw-kicker">${bi(txt('couple.groomLabel'))}</dt><dd><b>${bi(c.groom.fullName)}</b><small>${bi(txt('couple.son'))} ${bi(c.groom.parents)}</small>${c.groom.home ? `<small>${bi(c.groom.home)}</small>` : ''}</dd></div>
  </dl>`;

const programme = events.map((e, i) => {
  const d = dateParts(e.start);
  const bs = bsOf(e.start, e.dateBS);
  const swatches = (e.dress?.colors || []).map(safeColor).filter(Boolean);
  return `
  <li class="gw-ev" data-i="${i}">
    <div class="gw-ev__when">
      <p class="gw-ev__wd">${bi(d.wd)}</p>
      <p class="gw-ev__day">${bi(d.day)}</p>
      <p class="gw-ev__my">${bi(d.my)}</p>
      ${bs ? `<p class="gw-ev__bs">${bi(e.dateBS ? bs : { en: `${bs.short?.en || bs.en} B.S.`, ne: `वि.सं. ${bs.short?.ne || bs.ne}` })}</p>` : ''}
    </div>
    <div class="gw-ev__what">
      <h3 class="gw-ev__title">${bi(e.title)}</h3>
      ${e.blurb ? `<p class="gw-ev__blurb">${bi(e.blurb)}</p>` : ''}
      <dl class="gw-ev__facts">
        <div><dt>${bi(T.time)}</dt><dd>${bi(timeRange(e.start, e.end))}</dd></div>
        <div><dt>${bi(T.venue)}</dt><dd>${bi(e.venue)}<a class="gw-map" href="${esc(mapUrl(e.mapQuery || e.venue?.en || ''))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span></a></dd></div>
        ${e.dress ? `<div><dt>${bi(T.wear)}</dt><dd>${swatches.length ? `<span class="gw-sw" aria-hidden="true">${swatches.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}${bi(e.dress.text || T.wear)}</dd></div>` : ''}
      </dl>
      ${e.rituals?.length ? `
      <details class="gw-rituals">
        <summary>${bi(txt('programme.order'))}</summary>
        <ol>${e.rituals.map((r) => `<li><span>${bi(r.time)}</span>${bi(r.title)}</li>`).join('')}</ol>
      </details>` : ''}
    </div>
  </li>`;
}).join('');

const travelRef = S.img('travel.photo');
const closeRef = S.img('close.photo');
const detailRef = S.img('programme.detail');
const W = (i) => `<span class="gw-walk__step" aria-hidden="true"><span class="l-en">0${i} / 03</span><span class="l-ne">${neNum(`0${i}`)} / ०३</span></span>`;

const main = document.getElementById('main');
main.innerHTML = `
  <style>${SPRIG_CSS}</style>
  <section class="gw-walk" id="top" aria-labelledby="walk-names">
    <div class="gw-walk__pin">
      <div class="gw-walk__static" aria-hidden="true">
        ${walkRefs.map((r, i) => `<div class="gw-walk__still" data-i="${i}">${img(r, '', '100vw')}</div>`).join('')}
      </div>
      <div class="gw-tag gw-tag--names" data-step="0">
        ${W(1)}
        <p class="gw-kicker">${bi(txt('hero.kicker'))}</p>
        <h1 class="gw-tag__names" id="walk-names">${names()}</h1>
        <p class="gw-tag__line">${bi(txt('hero.line'))}</p>
      </div>
      <div class="gw-tag gw-tag--date" data-step="1">
        ${W(2)}
        <p class="gw-kicker">${bi(txt('walk.date'))}</p>
        <p class="gw-tag__date">${bi(dateOf(config.weddingDate))}</p>
        ${weddingBS ? `<p class="gw-tag__bs">${bi(weddingBS)}</p>` : ''}
        <p class="gw-tag__place">${bi(config.city)}</p>
      </div>
      ${walkCouple ? `<div class="gw-walk__print" data-step="2">${print(walkCouple, altFor(walkCouple, 'walk.couple'), '(max-width: 760px) 80vw, 34vw', { tilt: -1.2, eager: true })}</div>` : ''}
      <div class="gw-tag gw-tag--lake" data-step="2">
        ${W(3)}
        <p class="gw-tag__line gw-tag__line--big">${bi(txt('walk.lake'))}</p>
        <a class="gw-link" href="#programme">${bi(txt('walk.cue'))}<span aria-hidden="true">↓</span></a>
      </div>
      <p class="gw-walk__cue" aria-hidden="true"><span>${bi(T.scroll)}</span><i></i></p>
    </div>
  </section>

  <section class="gw-paper gw-couple" id="couple" aria-labelledby="couple-title">
    <div class="gw-couple__main">${print(mainPrint, mainPrint ? altFor(mainPrint, 'couple.photo') : '', '(max-width: 760px) 92vw, 44vw', { tilt: -0.8, cls: 'gw-print--main' })}</div>
    <div class="gw-couple__text">
      <p class="gw-kicker gw-in">${bloom({ seed: 5, cls: 'gw-kicker__bloom' })}${bi(txt('couple.title'))}</p>
      <h2 class="gw-h2 gw-in" id="couple-title">${bi(txt('couple.line'))}</h2>
      ${families}
      <button class="gw-link gw-in" type="button" id="open-card">${bi(txt('card.button'))}<span aria-hidden="true">→</span></button>
    </div>
    ${smallPrints.length ? `<div class="gw-couple__small">${smallPrints.map((p, i) => print(p.ref, p.alt, '(max-width: 760px) 44vw, 22vw', { tilt: i ? 1.4 : -0.6, cap: p.cap })).join('')}</div>` : ''}
  </section>

  <section class="gw-paper gw-prog" id="programme" aria-labelledby="prog-title">
    <header class="gw-prog__head">
      <div>
        <p class="gw-kicker gw-in">${bi(txt('programme.kicker'))}</p>
        <h2 class="gw-h2 gw-h2--xl gw-in" id="prog-title">${bi(txt('programme.title'))}</h2>
      </div>
      ${detailRef ? print(detailRef, S.alt('programme.detail'), '(max-width: 760px) 40vw, 18vw', { tilt: 1.6, cls: 'gw-print--detail' }) : ''}
    </header>
    <ol class="gw-prog__list">${programme}</ol>
    <p class="gw-prog__actions">
      <button class="gw-btn gw-btn--ghost" type="button" id="add-calendar">${bi(T.calendar)}</button>
    </p>
  </section>

  <section class="gw-paper gw-travel" id="travel" aria-labelledby="travel-title">
    <div class="gw-travel__media">${print(travelRef, S.alt('travel.photo'), '(max-width: 760px) 80vw, 34vw', { tilt: -1 })}</div>
    <div class="gw-travel__text">
      <p class="gw-kicker gw-in">${bi(txt('travel.kicker'))}</p>
      <h2 class="gw-h2 gw-in" id="travel-title">${bi(config.city)}</h2>
      <div class="gw-note">
        <h3>${bi(txt('travel.arrive'))}</h3>
        <p>${bi(config.info?.travel || '')}</p>
      </div>
      ${config.info?.stays?.length ? `<div class="gw-note">
        <h3>${bi(txt('travel.stay'))}</h3>
        <ul>${config.info.stays.map((s) => `<li><b>${bi(s.name)}</b>${s.note ? `<small>${bi(s.note)}</small>` : ''}<a class="gw-map" href="${esc(mapUrl(s.mapQuery || s.name.en))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span></a></li>`).join('')}</ul>
      </div>` : ''}
      ${config.info?.contacts?.length ? `<div class="gw-note">
        <h3>${bi(txt('travel.ask'))}</h3>
        <ul>${config.info.contacts.map((p) => `<li><b>${bi(p.name)}</b><small>${bi(p.role)}</small>
          <span class="gw-links"><a class="gw-map" href="tel:${esc(tel(p.phone))}">${bi(T.call)} ${esc(p.phone)}</a><a class="gw-map" href="https://wa.me/${esc(tel(p.phone).replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span></li>`).join('')}</ul>
      </div>` : ''}
      ${safeHref(config.info?.livestream) ? `<a class="gw-link" href="${esc(safeHref(config.info.livestream))}" target="_blank" rel="noopener">${bi(T.live)}<span aria-hidden="true">↗</span></a>` : ''}
    </div>
  </section>

  ${album.length ? `
  <section class="gw-paper gw-album" id="album" aria-labelledby="album-title">
    <header class="gw-album__head">
      <p class="gw-kicker gw-in">${bi(txt('album.kicker'))}</p>
      <h2 class="gw-h2 gw-in" id="album-title">${bi(txt('album.title'))}</h2>
    </header>
    <div class="gw-album__grid" id="album-grid"></div>
  </section>` : ''}

  <section class="gw-paper gw-rsvp" id="rsvp" aria-labelledby="rsvp-title">
    <div class="gw-rsvp__card">
      <div class="gw-rsvp__art" aria-hidden="true">${sprig({ seed: 4, flowers: 10, leaves: 7, stem: 90 })}</div>
      <p class="gw-kicker">${bi(countLine)}</p>
      <h2 class="gw-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
      <p class="gw-small">${bi(config.rsvp?.deadline || '')}</p>
      <form class="rsvp gw-form" id="rsvp-form" novalidate>
        <div class="field">
          <label for="f-name">${bi({ en: 'Your name', ne: 'हजुरको नाम' })}</label>
          <input id="f-name" name="name" type="text" autocomplete="name" required maxlength="80" />
          <p class="field__err" id="f-name-err" role="alert"></p>
        </div>
        <fieldset class="field field--choice gw-attend">
          <legend>${bi({ en: 'Will you attend?', ne: 'उपस्थिति' })}</legend>
          <label class="choice"><input type="radio" name="attending" value="yes" checked /><span>${bi({ en: 'Joyfully, yes', ne: 'अवश्य आउँछौं' })}</span></label>
          <label class="choice"><input type="radio" name="attending" value="no" /><span>${bi({ en: 'With love, from afar', ne: 'टाढैबाट शुभकामना' })}</span></label>
        </fieldset>
        <div class="rsvp__when-yes">
          <div class="gw-form__row">
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
        <button class="gw-btn" type="submit" id="rsvp-submit">${bi(txt('rsvp.send'))}</button>
        <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
      </form>
      <p class="gw-rsvp__actions"><button class="gw-link" type="button" id="share">${bi(T.shareIt)}</button></p>
    </div>
  </section>

  <footer class="gw-paper gw-close" aria-label="Blessing">
    <div class="gw-close__media">${print(closeRef, S.alt('close.photo'), '(max-width: 760px) 80vw, 30vw', { tilt: 0.8 })}</div>
    <div class="gw-close__text">
      ${bloom({ seed: 9, cls: 'gw-close__bloom' })}
      <p class="gw-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
      <p class="gw-close__en">${esc(config.closing?.en || '')}</p>
      <p class="gw-close__names">${names('gw-names--small')}</p>
      ${c.hashtag ? `<p class="gw-small">${esc(c.hashtag)}</p>` : ''}
      <details class="gw-credits">
        <summary>${bi(T.credits)}</summary>
        <ul>${credits.map((k) => `<li>${esc(k.title || k.slot)} by ${esc(k.creator || 'unknown')}, <a href="${esc(k.license_url || k.source_url)}" target="_blank" rel="noopener">${esc(k.license)}</a>, <a href="${esc(k.source_url)}" target="_blank" rel="noopener">source</a></li>`).join('')}
        <li>Botanical drawings of the lali gurans: drawn in code for this theme.</li>
        ${(config.music?.tracks || []).map((t) => `<li>${esc(t.credit)}</li>`).join('')}</ul>
      </details>
    </div>
  </footer>

  <div class="gw-card-wrap" id="card" hidden role="dialog" aria-modal="true" aria-labelledby="card-title" data-lenis-prevent>
    <div class="gw-card" id="card-panel">
      <button class="gw-card__x" type="button" data-card-close><span aria-hidden="true">×</span><span class="sr-only">${esc(T.close.en)}</span></button>
      <div class="gw-card__art" aria-hidden="true">${sprig({ seed: 7, flowers: 12, leaves: 8, stem: 60 })}</div>
      <p class="gw-card__shloka" lang="sa">${esc(config.invitation?.shloka?.sa || '')}</p>
      <p class="gw-card__shloka-en l-en">${esc(config.invitation?.shloka?.en || '')}</p>
      <h2 class="gw-card__title" id="card-title">${bi(txt('card.title'))}</h2>
      <p class="gw-card__p">${bi(config.invitation?.salutation || '')}</p>
      <p class="gw-card__p">${bi(config.invitation?.body || '')}</p>
      <p class="gw-card__p">${bi(config.invitation?.request || '')}</p>
      <p class="gw-card__sign">${bi(config.invitation?.signoff || '')}<br /><b>${bi(config.hosts)}</b></p>
    </div>
  </div>

  <div class="gw-lb" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photograph" data-lenis-prevent>
    <button type="button" class="gw-lb__btn gw-lb__x" data-lb="close"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <button type="button" class="gw-lb__btn gw-lb__prev" data-lb="prev"><span aria-hidden="true">←</span><span class="sr-only">Previous</span></button>
    <figure class="gw-lb__fig"></figure>
    <button type="button" class="gw-lb__btn gw-lb__next" data-lb="next"><span aria-hidden="true">→</span><span class="sr-only">Next</span></button>
  </div>`;

// ───────────────────────── Album: balanced columns, true proportions ─────────────────────────
const grid = document.getElementById('album-grid');
const tilts = [-1.1, 0.7, -0.4, 1.2, -0.8, 0.5];
const layoutAlbum = () => {
  if (!grid) return;
  const cols = window.innerWidth < 640 ? 2 : 3;
  if (grid.dataset.cols === String(cols)) return;
  grid.dataset.cols = String(cols);
  const heights = new Array(cols).fill(0);
  const buckets = Array.from({ length: cols }, () => []);
  album.forEach((g, i) => {
    const ar = aspectOf(g.photo) || (g.shape === 'port' ? 0.75 : g.shape === 'sq' ? 1 : 1.5);
    const k = heights.indexOf(Math.min(...heights));
    const cap = g.caption && !isLibrary(g.photo) ? bi(g.caption) : '';
    buckets[k].push(`<button type="button" class="gw-album__btn" data-idx="${i}" aria-label="${esc(g.alt || 'Open photograph')}">${print(g.photo, g.alt, '(max-width: 640px) 46vw, 30vw', { tilt: tilts[i % tilts.length], cap })}</button>`);
    heights[k] += 1 / ar + 0.2;
  });
  grid.innerHTML = buckets.map((b, i) => `<div class="gw-album__col" data-col="${i}">${b.join('')}</div>`).join('');
  watchAspects(grid);
};

/** Unknown aspect (uploads without w/h): measure once loaded. */
function watchAspects(root = document) {
  root.querySelectorAll('.gw-print[data-orient="auto"] img').forEach((im) => {
    const set = () => {
      const ar = im.naturalWidth / im.naturalHeight;
      if (!ar) return;
      const p = im.closest('.gw-print');
      p.style.setProperty('--ar', ar.toFixed(4));
      p.dataset.orient = ar >= 1.05 ? 'land' : ar <= 0.95 ? 'port' : 'sq';
      ScrollTrigger.refresh();
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
  setTimeout(() => { card.hidden = true; }, 320);
  done();
};
document.getElementById('open-card').addEventListener('click', () => {
  closeCard = openModal(card, { scroller: card, onClose: hideCard });
  card.scrollTop = 0;
  requestAnimationFrame(() => card.classList.add('is-open'));
});
card.addEventListener('click', (e) => { if (e.target === card || e.target.closest('[data-card-close]')) hideCard(); });

function initLightbox() {
  const lb = document.getElementById('lightbox');
  const fig = lb.querySelector('figure');
  const im = document.createElement('img');
  im.decoding = 'async';
  const cap = document.createElement('figcaption');
  fig.append(im, cap);
  let i = 0;
  const show = (k) => {
    i = (k + album.length) % album.length;
    const g = album[i];
    im.src = photoUrl(g.photo, 'lg');
    im.alt = g.alt || '';
    cap.innerHTML = g.caption && !isLibrary(g.photo) ? bi(g.caption) : '';
  };
  let release = null;
  const close = () => {
    if (!release) return;
    const r = release; release = null;
    lb.classList.remove('is-open');
    setTimeout(() => { lb.hidden = true; }, 300);
    r();
  };
  grid?.addEventListener('click', (e) => {
    const b = e.target.closest('.gw-album__btn');
    if (!b) return;
    show(Number(b.dataset.idx));
    release = openModal(lb, { onClose: close });
    requestAnimationFrame(() => lb.classList.add('is-open'));
  });
  lb.addEventListener('click', (e) => {
    const act = e.target.closest('[data-lb]')?.dataset.lb;
    if (act === 'close' || e.target === lb) close();
    else if (act === 'prev') show(i - 1);
    else if (act === 'next') show(i + 1);
  });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
  let x0 = null;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}
layoutAlbum();
initLightbox();
watchAspects();

// ───────────────────────── The walk: depth photographs + petals ─────────────────────────
const canvas = document.getElementById('gw-canvas');
const walk = document.querySelector('.gw-walk');
const hasGL = (() => { try { const t = document.createElement('canvas'); return !!(t.getContext('webgl2') || t.getContext('webgl')); } catch { return false; } })();
const useStage = hasGL && !reduced;
let stage = null;
let petals = null;
const SCENES = ['s0', 's1', 's2'];
// Each scene: how far the camera walks in (PhotoView progress), and the photo's depth strength.
const TUNE = [
  { travel: 0.6, scale: 0.36, sway: 2.5 },
  { travel: 0.5, scale: 0.34, sway: 1.5 },
  { travel: 0.22, scale: 0.4, sway: 0 },
];
if (useStage) {
  try {
    stage = new PhotoStage(canvas, { mobile, grade: { clear: '#EDEAE2', grain: mobile ? 0.018 : 0.022, vignette: 0.14, tint: [1.0, 0.995, 0.985], lift: 0.015 } });
    walkRefs.forEach((r, i) => stage.add(view(r, { id: SCENES[i], ...TUNE[i] })));
    petals = createPetals({ mobile, textures: ['/themes/gurans/petal.webp', '/themes/gurans/petal-2.webp'] });
    stage.overlays.push(petals);
    stage.set({ a: 's0', pa: 0 });
  } catch (err) {
    console.warn('[gurans] WebGL stage unavailable', err);
    stage = null;
  }
}
if (!stage) {
  document.body.classList.add('no-stage');
  canvas.remove();
}

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const span = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));
/** Walk progress p (0..1) → what the stage shows. Cross-dissolves are where one place opens onto the next. */
function setWalk(p) {
  if (!stage) return;
  const t1 = [0.27, 0.39];
  const t2 = [0.6, 0.72];
  const p0 = span(0, 0.39, p);
  const p1 = span(0.27, 0.72, p);
  const p2 = span(0.6, 1, p);
  if (p < t1[0]) stage.set({ a: 's0', pa: p0 });
  else if (p < t1[1]) stage.set({ a: 's0', pa: p0, b: 's1', pb: p1, mix: smoothstep(t1[0], t1[1], p), mode: 1 });
  else if (p < t2[0]) stage.set({ a: 's1', pa: p1 });
  else if (p < t2[1]) stage.set({ a: 's1', pa: p1, b: 's2', pb: p2, mix: smoothstep(t2[0], t2[1], p), mode: 1 });
  else stage.set({ a: 's2', pa: p2 });
  petals?.setAmount(p < 0.33 ? 0.45 : p < 0.66 ? 0.85 : 0.5);
  petals?.setWind(Math.sin(p * Math.PI * 3) * 0.4);
}

const enterBtn = document.getElementById('enter');
const quietBtn = document.getElementById('enter-quiet');
const bar = document.getElementById('gate-bar');
const firstImg = document.querySelector('.gw-walk__still img');
const timeout = (ms) => new Promise((r) => setTimeout(r, ms));
const firstLoad = stage ? stage.preload(['s0']) : (firstImg?.decode?.() ?? Promise.resolve());
Promise.race([firstLoad.catch(() => {}), timeout(9000)]).finally(() => {
  bar.style.transform = 'scaleX(1)';
  enterBtn.disabled = false;
  quietBtn.disabled = false;
  gate.classList.add('is-ready');
  if (stage) stage.preload(['s1', 's2']).catch(() => {});
});

let opened = false;
function open(withMusic) {
  if (opened) return;
  opened = true;
  player.unlock();
  player.start(withMusic);
  document.body.classList.remove('is-gated');
  gate.classList.add('is-leaving');
  setTimeout(() => gate.remove(), reduced ? 50 : 1200);
  window.scrollTo(0, 0);
  arrive();
  setupScroll();
}
enterBtn.addEventListener('click', () => open(true));
quietBtn.addEventListener('click', () => open(false));

/** After the sheet lifts: the first label settles, petals begin. */
function arrive() {
  const first = document.querySelector('.gw-tag--names');
  if (reduced || !stage) { gsap.set(first, { opacity: 1 }); return; }
  setWalk(0);
  petals?.setAmount(0.45);
  gsap.fromTo(first, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.7 });
  gsap.fromTo('.gw-walk__cue', { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 1.6 });
}

// ───────────────────────── Scroll ─────────────────────────
let lenis = null;
let walkST = null;
function setupScroll() {
  lenis = createSmooth();
  if (stage) walkScroll();
  else document.querySelector('.gw-walk').classList.add('is-static');

  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.gw-paper .gw-in, .gw-paper .gw-print, .gw-families, .gw-ev').forEach((el) => io.observe(el));
  if (!reduced && !mobile && grid) {
    const speeds = [-3, 5, -1];
    grid.querySelectorAll('.gw-album__col').forEach((col, i) => {
      gsap.fromTo(col, { yPercent: -speeds[i] }, { yPercent: speeds[i], ease: 'none', scrollTrigger: { trigger: grid, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }
  ScrollTrigger.refresh();
}

/** The signature motion: three places, one continuous walk, scrubbed by scroll. */
function walkScroll() {
  const tags = gsap.utils.toArray('.gw-walk [data-step]');
  const step = (n) => tags.filter((t) => t.dataset.step === String(n));
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  tl.to(step(0), { opacity: 0, y: -24, duration: 0.06 }, 0.2)
    .fromTo(step(1), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.07 }, 0.36)
    .to(step(1), { opacity: 0, y: -24, duration: 0.06 }, 0.58)
    .fromTo(step(2), { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.08, stagger: 0.03 }, 0.74)
    .to('.gw-walk__cue', { opacity: 0, duration: 0.04 }, 0.02)
    .to({}, { duration: 0.1 }, 0.9);
  walkST = ScrollTrigger.create({
    trigger: walk, start: 'top top', end: () => `+=${window.innerHeight * (mobile ? 3.4 : 3.8)}`,
    pin: '.gw-walk__pin', scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true, animation: tl,
    onUpdate: (self) => setWalk(self.progress),
    onLeave: () => { stage.setActive(false); canvas.style.visibility = 'hidden'; },
    onEnterBack: () => { canvas.style.visibility = ''; stage.setActive(true); },
  });
}

let rw = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === rw) return;
  rw = window.innerWidth;
  layoutAlbum();
});

// ───────────────────────── Debug hook (screenshots) ─────────────────────────
if (DEBUG) {
  window.__gw = {
    stage, petals, ScrollTrigger, gsap,
    open: () => open(false),
    walk: (p) => {
      const y = walkST ? walkST.start + (walkST.end - walkST.start) * p : 0;
      lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
      ScrollTrigger.update();
      walkST?.animation?.progress(p);
      setWalk(p);
    },
    to: (sel, offset = 0) => {
      const el = document.querySelector(sel);
      const y = el.getBoundingClientRect().top + window.scrollY + offset;
      lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
      ScrollTrigger.update();
    },
    ready: () => !!(stage ? [...stage.views.values()].every((v) => v.ready) : true),
    album: album.map((p) => keyOf(p.photo)),
  };
  if (params.has('open')) open(false);
}
