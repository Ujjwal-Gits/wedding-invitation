// Theme · Himal (हिमाल) — Himalayan minimal.
// A fine-art photo book in the mountains: the invitation opens before sunrise,
// the sun comes up behind Machhapuchhre (the one signature motion), valley mist
// carries you onto snow-white paper, and from there the couple's own photographs
// lead: a portrait plate, a pinned full-bleed essay, a quiet timeline with a
// sticky photo stack, a horizontal travel sequence, an album, and a short RSVP.
import '../../core/base.css';
import './himal.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadInvitation } from '../../core/data.js';
import { bi, esc, dateOf, dayNum, timeLabel, mapUrl, neNum, bsDateOf } from '../../core/i18n.js';
import { mountShell } from '../../core/shell.js';
import { madeWith } from '../../core/madewith.js';
import { createSmooth, reducedMotion, isMobile } from '../../core/smooth.js';
import { initRsvp } from '../../core/rsvp.js';
import { guestEvents } from '../../core/finale.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { photos, photoUrl, depthUrl } from '../../photos.js';
import credits from '../../generated/credits.json';
import { createDawn } from './dawn.js';
import { useSlots } from '../../core/slots.js';
import { openModal } from '../../core/modal.js';
import manifest from './slots.js';
import { createMix } from '../../core/mix.js';

gsap.registerPlugin(ScrollTrigger);

const config = await loadInvitation();
// another theme's gate over the dawn (docs/MIX.md); without config.design nothing changes
const mix = await createMix({ host: 'himal', manifest, config });
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion();
const mobile = isMobile();
const c = config.couple;
const events = guestEvents();

// ───────────────────────── Slots (every theme image and text, replaceable in the studio) ─────────────────────────
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
// Library photos that show people: used only to order the album (people first).
const PEOPLE = /^(couple|wedding|mehendi-hands|bride|groom|portrait)/;
// Light tuning for library dawn photos: where the sun rises (image coords from top-left).
const DAWN_TUNING = { 'himalaya-dawn': { focal: [0.46, 0.58], sun: [0.485, 0.645] } };

const dims = Object.fromEntries(credits.map((k) => [String(k.file || k.slot).replace(/\.(jpe?g|png|webp)$/i, ''), [k.width, k.height]]));
const isLibrary = (ref) => typeof ref === 'string' && !ref.startsWith('/') && !ref.startsWith('https://');
const isUrl = (s) => typeof s === 'string' && (s.startsWith('/') || s.startsWith('https://'));
const keyOf = (ref) => (typeof ref === 'string' ? ref : ref && typeof ref === 'object' ? ref.lg || ref.sm || '' : '');
const aspectOf = (ref) => {
  if (typeof ref === 'string' && dims[ref]?.[0]) return dims[ref][0] / dims[ref][1];
  if (ref && typeof ref === 'object' && ref.w && ref.h) return ref.w / ref.h;
  return 0; // unknown: measured on load
};
const focalOf = (ref) => (typeof ref === 'string' && photos[ref]?.focal) || (ref && typeof ref === 'object' && ref.focal) || [0.5, 0.5];
const isCouple = (ref) => !!ref && (typeof ref === 'object' || isUrl(ref) || PEOPLE.test(ref));
const safeHref = (u) => (/^https:\/\//i.test(String(u || '')) ? String(u) : '');
const safeColor = (s) => (/^#[0-9a-f]{3,8}$/i.test(String(s)) ? s : null);

/** <img> with both sizes, the focal point as object-position, and the aspect recorded. */
const img = (ref, alt, sizes, { eager = false } = {}) => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  const [fx, fy] = focalOf(ref);
  return `<img src="${esc(sm)}" ${sm !== lg ? `srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w"` : ''} sizes="${sizes}" alt="${esc(alt || '')}"
    style="object-position:${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
};
/** A frame that keeps the photo's own proportions (nothing cropped). */
const plate = (ref, alt, sizes, cls = '', opts) => {
  const ar = aspectOf(ref);
  const orient = ar ? (ar >= 1.05 ? 'land' : ar <= 0.95 ? 'port' : 'sq') : 'auto';
  return `<span class="hm-plate ${cls}" data-orient="${orient}" style="--ar:${ar ? ar.toFixed(4) : 1.5}">${img(ref, alt, sizes, opts)}</span>`;
};

// ───────────────────────── Which photo goes where ─────────────────────────
const dawnRef = S.img('hero.dawn');
const duskRef = S.img('close.photo');
const travelRefs = { arrive: S.img('travel.arrive'), stay: S.img('travel.stay'), ask: S.img('travel.ask') };
const portraitAlt = Object.fromEntries((c.portraits || []).filter((p) => p?.photo).map((p) => [keyOf(p.photo), p.alt || '']));
const altFor = (ref, id) => portraitAlt[keyOf(ref)] || S.alt(id) || `${c.bride.name.en} and ${c.groom.name.en}`;

const used = new Set();
const take = (ref) => { used.add(keyOf(ref)); return ref; };
const brideRef = S.img('intro.bridePhoto');
const groomRef = S.img('intro.groomPhoto');
const brideGroom = !!(brideRef && groomRef && keyOf(brideRef) !== keyOf(groomRef));
const introPhoto = brideGroom ? null : S.img('intro.photo');
if (brideGroom) { take(brideRef); take(groomRef); } else if (introPhoto) take(introPhoto);
const introAlt = introPhoto ? altFor(introPhoto, 'intro.photo') : '';

/** Couple slots in order, skipping empties and repeats of photos already shown. */
const fromSlots = (prefix, n) => {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const id = `${prefix}.${i}`;
    const ref = S.img(id);
    if (!ref || used.has(keyOf(ref))) continue;
    take(ref);
    out.push({ photo: ref, alt: altFor(ref, id) });
  }
  return out;
};
const essay = fromSlots('essay', 7);

// Slides: a photo whose shape fights the screen (portrait on a wide screen, landscape on a
// phone) is paired with the next such photo, side by side or stacked, so nothing is cropped
// and nothing floats small in the dark.
const portraitScreen = window.innerHeight > window.innerWidth;
const fights = (p) => { const ar = aspectOf(p.photo); return ar ? (portraitScreen ? ar > 1.1 : ar < 0.9) : false; };
const slides = [];
{
  const rest = [...essay];
  while (rest.length) {
    const p = rest.shift();
    if (fights(p)) {
      const j = rest.findIndex(fights);
      if (j >= 0) { slides.push([p, rest.splice(j, 1)[0]]); continue; }
    }
    slides.push([p]);
  }
}
// Album: the couple's album slots first, then the invitation gallery (people before places).
const skip = new Set([keyOf(dawnRef), keyOf(duskRef)]);
const albumCouple = fromSlots('album', 6);
const albumGallery = (config.gallery || [])
  .filter((g) => g?.photo && !used.has(keyOf(g.photo)) && !skip.has(keyOf(g.photo)) && !/^marigold/.test(keyOf(g.photo)))
  .filter((g, i, a) => a.findIndex((x) => keyOf(x.photo) === keyOf(g.photo)) === i)
  .sort((x, y) => Number(isCouple(y.photo)) - Number(isCouple(x.photo)));
const album = [...albumCouple, ...albumGallery];

// ───────────────────────── UI chrome (not studio content) ─────────────────────────
const T = {
  map: { en: 'Map', ne: 'नक्सा' },
  wear: { en: 'Wear', ne: 'पहिरन' },
  when: { en: 'When', ne: 'कहिले' },
  where: { en: 'Where', ne: 'कहाँ' },
  openMap: { en: 'Open map', ne: 'नक्सा हेर्नुहोस्' },
  call: { en: 'Call', ne: 'फोन' },
  live: { en: 'Watch the ceremony live', ne: 'प्रत्यक्ष हेर्नुहोस्' },
  calendar: { en: 'Add to calendar', ne: 'क्यालेन्डरमा थप्नुहोस्' },
  shareIt: { en: 'Share', ne: 'पठाउनुहोस्' },
  close: { en: 'Close', ne: 'बन्द गर्नुहोस्' },
};

const daysLeft = Math.ceil((new Date(config.weddingDate).getTime() - Date.now()) / 86400000);
const countLine = daysLeft > 1
  ? { en: `${daysLeft} days to go`, ne: `${neNum(daysLeft)} दिन बाँकी` }
  : daysLeft === 1 ? { en: 'Tomorrow', ne: 'भोलि' } : { en: 'With love', ne: 'मायासहित' };

/** "Feb · Tue" / "फेब्रुअरी · मङ्गलबार" for the programme's date column. */
const monthDay = (iso) => {
  const en = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', month: 'short', weekday: 'short' }).formatToParts(new Date(iso));
  const get = (t) => en.find((x) => x.type === t)?.value || '';
  const ne = dateOf(iso).ne.split(', ');
  return { en: `${get('month')} · ${get('weekday')}`, ne: `${(ne[1] || '').split(' ')[0]} · ${ne[0] || ''}` };
};
const pad = (n) => String(n + 1).padStart(2, '0');
const tel = (p) => String(p).replace(/[^\d+]/g, '');

// ───────────────────────── Gate ─────────────────────────
// Another theme's gate replaces it (mounted below, with the hand-off to the sunrise).
const gate = document.getElementById('gate');
if (mix.gate) gate.remove();
if (!mix.gate) gate.innerHTML = `
  <div class="hm-gate__inner">
    <p class="hm-gate__from">${bi(txt('gate.from'))}</p>
    <p class="hm-gate__hosts">${bi(config.hosts)}</p>
    <div class="hm-gate__actions">
      <button class="hm-btn hm-btn--snow" type="button" id="enter" disabled>${bi(txt('gate.open'))}</button>
      <button class="hm-quiet" type="button" id="enter-quiet" disabled>${bi(txt('gate.quiet'))}</button>
    </div>
    <span class="hm-gate__load" aria-hidden="true"><i id="gate-bar"></i></span>
  </div>`;

// ───────────────────────── Main markup ─────────────────────────
const families = `
  <dl class="hm-families">
    <div><dt>${bi(txt('intro.bride'))}</dt><dd><b>${bi(c.bride.fullName)}</b><small>${bi(txt('intro.daughter'))} ${bi(c.bride.parents)}</small></dd></div>
    <div><dt>${bi(txt('intro.groom'))}</dt><dd><b>${bi(c.groom.fullName)}</b><small>${bi(txt('intro.son'))} ${bi(c.groom.parents)}</small></dd></div>
  </dl>`;

const introMedia = brideGroom
  ? `<div class="hm-intro__pair">
       <figure>${plate(brideRef, c.bride.name.en, '(max-width: 760px) 44vw, 24vw')}<figcaption>${bi(c.bride.name)}</figcaption></figure>
       <figure>${plate(groomRef, c.groom.name.en, '(max-width: 760px) 44vw, 24vw')}<figcaption>${bi(c.groom.name)}</figcaption></figure>
     </div>`
  : introPhoto ? `<figure class="hm-intro__fig">${plate(introPhoto, introAlt, '(max-width: 760px) 92vw, 56vw', 'hm-intro__plate', { eager: true })}</figure>` : '';

const essayCaption = (p, i) => {
  if (isLibrary(p.photo)) return ''; // stock/library photos get no narrative captions
  const s = config.story?.[i];
  if (s) return `<span class="hm-cap__year">${bi(s.year)}</span><span class="hm-cap__text">${bi(s.text)}</span>`;
  return p.caption ? `<span class="hm-cap__text">${bi(p.caption)}</span>` : '';
};

const eventPic = (e) => (e.photo ? plate(e.photo, '', '(max-width: 760px) 92vw, 40vw') : '');

const main = document.getElementById('main');
main.innerHTML = `
  <section class="hm-hero" id="top" aria-labelledby="hero-names">
    <div class="hm-hero__pin">
      <div class="hm-hero__fallback" aria-hidden="true">${img(dawnRef, '', '100vw', { eager: true })}<i class="hm-hero__night"></i><i class="hm-hero__mist"></i></div>
      <div class="hm-hero__names">
        <p class="hm-eyebrow hm-eyebrow--snow hm-rv">${bi(txt('hero.eyebrow'))}</p>
        <h1 class="hm-names hm-rv" id="hero-names">
          <span class="hm-names__one">${bi(c.bride.name)}</span>
          <span class="hm-names__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span>
          <span class="hm-names__two">${bi(c.groom.name)}</span>
        </h1>
        <p class="hm-hero__meta hm-rv"><span>${bi(dateOf(config.weddingDate))}</span><span class="hm-dot" aria-hidden="true"></span><span>${bi(config.city)}</span></p>
      </div>
      <span class="hm-hero__cue" aria-hidden="true"><i></i></span>
    </div>
  </section>

  <section class="hm-intro hm-paper" id="intro" aria-labelledby="intro-title">
    ${introMedia}
    <div class="hm-intro__text">
      <p class="hm-eyebrow hm-in">${bi(config.weddingDateBS)}</p>
      <h2 class="hm-h2 hm-in" id="intro-title">${bi(txt('intro.line'))}</h2>
      ${families}
      <button class="hm-link hm-in" type="button" id="open-card">${bi(txt('intro.card'))}<span aria-hidden="true">→</span></button>
    </div>
  </section>

  ${essay.length ? `
  <section class="hm-essay" id="essay" aria-label="${esc(txt('essay.title').en)}">
    <div class="hm-essay__pin">
      <p class="hm-essay__label hm-eyebrow">${bi(txt('essay.title'))}</p>
      ${slides.map((g, i) => `
        <figure class="hm-slide${g.length > 1 ? ' hm-slide--pair' : ''}" data-i="${i}">
          <div class="hm-slide__stage">${g.map((p) => plate(p.photo, p.alt, g.length > 1 ? '(orientation: portrait) 100vw, 50vw' : '100vw', 'hm-slide__plate')).join('')}</div>
          <figcaption class="hm-cap"><span class="hm-cap__n">${pad(i)}</span>${essayCaption(g[0], i)}</figcaption>
        </figure>`).join('')}
      <p class="hm-essay__count" aria-hidden="true"><span id="essay-n">01</span><i></i>${pad(slides.length - 1)}</p>
    </div>
  </section>` : ''}

  <section class="hm-days hm-paper" id="ceremonies" aria-labelledby="days-title">
    <div class="hm-days__media" aria-hidden="true">
      ${events.map((e, i) => `<figure class="hm-days__fig" data-i="${i}">${eventPic(e)}</figure>`).join('')}
    </div>
    <div class="hm-days__list">
      <header class="hm-days__head">
        <p class="hm-eyebrow hm-in">${bi(txt('days.eyebrow'))}</p>
        <h2 class="hm-h2 hm-in" id="days-title">${bi(txt('days.title'))}</h2>
      </header>
      <ol class="hm-programme">
        ${events.map((e, i) => {
          const full = dateOf(e.start);
          const b = bsDateOf(e.start, e.dateBS).short;
          const bs = { en: /B\.?S/.test(b.en) ? b.en : `${b.en} B.S.`, ne: /वि\.?सं/.test(b.ne) ? b.ne : `वि.सं. ${b.ne}` };
          const sw = (e.dress?.colors || []).map(safeColor).filter(Boolean);
          return `
        <li class="hm-event" data-i="${i}">
          <p class="hm-event__day" aria-hidden="true"><b>${bi(dayNum(e.start))}</b><span>${bi(monthDay(e.start))}</span></p>
          <div class="hm-event__body">
            <h3 class="hm-event__title">${bi(e.title)}</h3>
            <dl class="hm-facts">
              <div><dt>${bi(T.when)}</dt><dd><b>${bi(timeLabel(e))}</b><span>${bi(full)}</span>${bs ? `<span>${bi(bs)}</span>` : ''}</dd></div>
              <div><dt>${bi(T.where)}</dt><dd><b>${bi(e.venue)}</b><a class="hm-map" href="${esc(mapUrl(e.mapQuery || e.venue?.en || ''))}" target="_blank" rel="noopener">${bi(T.openMap)}<span aria-hidden="true"> ↗</span></a></dd></div>
              ${e.dress ? `<div><dt>${bi(T.wear)}</dt><dd class="hm-facts__wear">${sw.length ? `<span class="hm-sw" aria-hidden="true">${sw.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(e.dress.text || T.wear)}</span></dd></div>` : ''}
            </dl>
            ${e.rituals?.length ? `
            <details class="hm-rituals">
              <summary>${bi(txt('days.order'))}</summary>
              <ol>${e.rituals.map((r) => `<li><span>${bi(r.time)}</span>${bi(r.title)}</li>`).join('')}</ol>
            </details>` : ''}
          </div>
        </li>`;
        }).join('')}
      </ol>
    </div>
  </section>

  <section class="hm-journey" id="travel" aria-labelledby="travel-title">
    <div class="hm-journey__pin">
      <div class="hm-journey__track">
        <header class="hm-journey__head">
          <p class="hm-eyebrow">${bi(txt('travel.eyebrow'))}</p>
          <h2 class="hm-h2" id="travel-title">${bi(config.city)}</h2>
        </header>
        <article class="hm-leg">
          ${plate(travelRefs.arrive, S.alt('travel.arrive'), '(max-width: 760px) 92vw, 40vw', 'hm-leg__plate')}
          <p class="hm-leg__n">01</p>
          <h3 class="hm-leg__title">${bi(txt('travel.arrive'))}</h3>
          <p class="hm-leg__p">${bi(config.info.travel)}</p>
        </article>
        <article class="hm-leg">
          ${plate(travelRefs.stay, S.alt('travel.stay'), '(max-width: 760px) 92vw, 40vw', 'hm-leg__plate')}
          <p class="hm-leg__n">02</p>
          <h3 class="hm-leg__title">${bi(txt('travel.stay'))}</h3>
          <ul class="hm-leg__list">${(config.info.stays || []).map((s) => `
            <li><b>${bi(s.name)}</b><small>${bi(s.note)}</small><a class="hm-map" href="${esc(mapUrl(s.mapQuery || s.name.en))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span></a></li>`).join('')}
          </ul>
        </article>
        <article class="hm-leg">
          ${plate(travelRefs.ask, S.alt('travel.ask'), '(max-width: 760px) 92vw, 40vw', 'hm-leg__plate')}
          <p class="hm-leg__n">03</p>
          <h3 class="hm-leg__title">${bi(txt('travel.ask'))}</h3>
          <ul class="hm-leg__list">${(config.info.contacts || []).map((p) => `
            <li><b>${bi(p.name)}</b><small>${bi(p.role)}</small>
              <span class="hm-leg__links"><a class="hm-map" href="tel:${esc(tel(p.phone))}">${bi(T.call)}</a><a class="hm-map" href="https://wa.me/${esc(tel(p.phone).replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span></li>`).join('')}
          </ul>
          ${safeHref(config.info.livestream) ? `<a class="hm-link" href="${esc(safeHref(config.info.livestream))}" target="_blank" rel="noopener">${bi(T.live)}<span aria-hidden="true">↗</span></a>` : ''}
        </article>
      </div>
    </div>
  </section>

  ${album.length ? `
  <section class="hm-album hm-paper" id="album" aria-labelledby="album-title">
    <header class="hm-album__head">
      <p class="hm-eyebrow hm-in">${bi(txt('album.eyebrow'))}</p>
      <h2 class="hm-h2 hm-in" id="album-title">${bi(txt('album.title'))}</h2>
    </header>
    <div class="hm-album__grid" id="album-grid"></div>
  </section>` : ''}

  <section class="hm-rsvp hm-paper" id="rsvp" aria-labelledby="rsvp-title">
    <div class="hm-rsvp__col">
      <p class="hm-eyebrow hm-in">${bi(countLine)}</p>
      <h2 class="hm-h2 hm-in" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
      <p class="hm-small hm-in">${bi(config.rsvp.deadline)}</p>
      <form class="rsvp hm-form" id="rsvp-form" novalidate>
        <div class="field">
          <label for="f-name">${bi({ en: 'Your name', ne: 'नाम' })}</label>
          <input id="f-name" name="name" type="text" autocomplete="name" required maxlength="80" />
          <p class="field__err" id="f-name-err" role="alert"></p>
        </div>
        <fieldset class="field field--choice hm-attend">
          <legend>${bi({ en: 'Will you attend?', ne: 'उपस्थिति' })}</legend>
          <label class="choice"><input type="radio" name="attending" value="yes" checked /><span>${bi({ en: 'Joyfully, yes', ne: 'अवश्य आउँछौं' })}</span></label>
          <label class="choice"><input type="radio" name="attending" value="no" /><span>${bi({ en: 'With love, from afar', ne: 'टाढैबाट शुभकामना' })}</span></label>
        </fieldset>
        <div class="rsvp__when-yes">
          <div class="hm-form__row">
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
        <button class="hm-btn" type="submit" id="rsvp-submit">${bi(txt('rsvp.send'))}</button>
        <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
      </form>
      <p class="hm-rsvp__actions">
        <button class="hm-link" type="button" id="add-calendar">${bi(T.calendar)}</button>
        <button class="hm-link" type="button" id="share">${bi(T.shareIt)}</button>
      </p>
    </div>
  </section>

  <footer class="hm-close" aria-label="Blessing">
    <figure class="hm-close__fig">${plate(duskRef, S.alt('close.photo'), '(max-width: 760px) 100vw, 86vw', 'hm-close__plate')}</figure>
    <div class="hm-close__text">
      <p class="hm-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
      <p class="hm-close__en">${esc(config.closing?.en || '')}</p>
      <p class="hm-close__names">${bi(c.bride.name)} <span aria-hidden="true">&amp;</span><span class="sr-only">and</span> ${bi(c.groom.name)}</p>
      ${c.hashtag ? `<p class="hm-small">${esc(c.hashtag)}</p>` : ''}
    </div>
    ${madeWith()}
  </footer>

  <div class="hm-card-wrap" id="card" hidden role="dialog" aria-modal="true" aria-labelledby="card-title" data-lenis-prevent>
    <button class="hm-card__x" type="button" data-card-close><span aria-hidden="true">×</span><span class="sr-only">${esc(T.close.en)}</span></button>
    <div class="hm-card" id="card-panel">
      <p class="hm-card__shloka" lang="sa">${esc(config.invitation.shloka.sa)}</p>
      <p class="hm-card__shloka-en l-en">${esc(config.invitation.shloka.en)}</p>
      <h2 class="hm-card__title" id="card-title">${bi(txt('card.title'))}</h2>
      <p class="hm-card__p">${bi(config.invitation.salutation)}</p>
      <p class="hm-card__p">${bi(config.invitation.body)}</p>
      <p class="hm-card__p">${bi(config.invitation.request)}</p>
      <p class="hm-card__sign">${bi(config.invitation.signoff)}<br /><b>${bi(config.hosts)}</b></p>
    </div>
  </div>

  <div class="hm-lb" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photograph" data-lenis-prevent>
    <button type="button" class="hm-lb__btn hm-lb__x" data-lb="close"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <button type="button" class="hm-lb__btn hm-lb__prev" data-lb="prev"><span aria-hidden="true">←</span><span class="sr-only">Previous</span></button>
    <figure class="hm-lb__fig"><figcaption></figcaption></figure>
    <button type="button" class="hm-lb__btn hm-lb__next" data-lb="next"><span aria-hidden="true">→</span><span class="sr-only">Next</span></button>
  </div>`;

// ───────────────────────── Album: balanced columns, true proportions ─────────────────────────
const grid = document.getElementById('album-grid');
const layoutAlbum = () => {
  if (!grid) return;
  const cols = window.innerWidth < 760 ? 2 : 3;
  if (grid.dataset.cols === String(cols)) return;
  grid.dataset.cols = String(cols);
  const heights = new Array(cols).fill(0);
  const buckets = Array.from({ length: cols }, () => []);
  album.forEach((g, i) => {
    const ar = aspectOf(g.photo) || (g.shape === 'port' ? 0.75 : g.shape === 'sq' ? 1 : 1.5);
    const k = heights.indexOf(Math.min(...heights));
    buckets[k].push(`
      <figure class="hm-pic">
        <button type="button" class="hm-pic__btn" data-idx="${i}" aria-label="${esc(g.alt || 'Open photograph')}">${plate(g.photo, g.alt, `(max-width: 760px) 46vw, 28vw`)}</button>
        ${g.caption && !isLibrary(g.photo) ? `<figcaption><span>${pad(i)}</span>${bi(g.caption)}</figcaption>` : `<figcaption><span>${pad(i)}</span></figcaption>`}
      </figure>`);
    heights[k] += 1 / ar + 0.18;
  });
  grid.innerHTML = buckets.map((b, i) => `<div class="hm-album__col" data-col="${i}">${b.join('')}</div>`).join('');
  watchAspects(grid);
};

/** Unknown aspect (uploads without w/h): measure once loaded. */
function watchAspects(root = document) {
  root.querySelectorAll('.hm-plate[data-orient="auto"] img').forEach((im) => {
    const set = () => {
      const ar = im.naturalWidth / im.naturalHeight;
      if (!ar) return;
      const p = im.closest('.hm-plate');
      p.style.setProperty('--ar', ar.toFixed(4));
      p.dataset.orient = ar >= 1.05 ? 'land' : ar <= 0.95 ? 'port' : 'sq';
      fitSlides();
      ScrollTrigger.refresh();
    };
    if (im.complete && im.naturalWidth) set(); else im.addEventListener('load', set, { once: true });
  });
}

// ───────────────────────── Essay slides: fill when the shapes agree, frame when they don't ─────────────────────────
function fitSlides() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  document.querySelectorAll('.hm-slide:not(.hm-slide--pair)').forEach((s) => {
    const p = s.querySelector('.hm-plate');
    const ar = parseFloat(p.style.getPropertyValue('--ar')) || 1.5;
    const cap = vw < 760 ? 132 : 96;
    const areaAr = vw / (vh - cap);
    const ratio = ar > areaAr ? ar / areaAr : areaAr / ar;
    s.classList.toggle('is-fill', false && ratio < 1.32); // never crop: every photo keeps its frame
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
  closeCard = openModal(card, { scroller: document.getElementById('card-panel'), onClose: hideCard });
  requestAnimationFrame(() => card.classList.add('is-open'));
});
card.addEventListener('click', (e) => { if (e.target === card || e.target.closest('[data-card-close]')) hideCard(); });

function initLightbox() {
  const lb = document.getElementById('lightbox');
  const cap = lb.querySelector('figcaption');
  const im = document.createElement('img');
  im.decoding = 'async';
  cap.before(im);
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
    const b = e.target.closest('.hm-pic__btn');
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
fitSlides();
watchAspects();

// ───────────────────────── The dawn ─────────────────────────
const canvas = document.getElementById('hm-sky');
const tune = DAWN_TUNING[keyOf(dawnRef)] || { focal: focalOf(dawnRef), sun: [focalOf(dawnRef)[0], 0.62] };
const dawn = createDawn(canvas, {
  src: photoUrl(dawnRef, mobile ? 'sm' : 'lg'),
  depth: depthUrl(dawnRef),
  focal: tune.focal,
  sun: tune.sun,
});
if (!dawn) document.body.classList.add('no-gl');

const enterBtn = document.getElementById('enter');
const quietBtn = document.getElementById('enter-quiet');
const bar = document.getElementById('gate-bar');
const fallbackImg = document.querySelector('.hm-hero__fallback img');
const firstLoad = dawn ? dawn.ready : (fallbackImg.decode?.() ?? Promise.resolve());
firstLoad.catch(() => {}).finally(() => {
  if (mix.gate) return;
  bar.style.transform = 'scaleX(1)';
  enterBtn.disabled = false;
  quietBtn.disabled = false;
  gate.classList.add('is-ready');
});
if (dawn) { dawn.set({ rise: 0.04 }); dawn.start(); }

let opened = false;
/** Into the page: music from the guest's tap, scrolling on (the sunrise is separate). */
function startOpen(withMusic) {
  if (opened) return false;
  opened = true;
  player.unlock();
  player.start(withMusic);
  document.body.classList.remove('is-gated');
  window.scrollTo(0, 0);
  return true;
}
function open(withMusic) {
  if (mixGate) { mixGate.open(withMusic); return; }
  if (!startOpen(withMusic)) return;
  gate.classList.add('is-leaving');
  setTimeout(() => gate.remove(), 1300);
  sunrise();
  setupScroll();
}
if (!mix.gate) {
  enterBtn.addEventListener('click', () => open(true));
  quietBtn.addEventListener('click', () => open(false));
}
// Another theme's gate: its own exit plays over the night mountain (held there until the dawn has loaded); as it
// fades, the sun starts to rise behind the peak, exactly as after Himal's own gate.
let dawnReady = false;
firstLoad.catch(() => {}).finally(() => { dawnReady = true; });
const mixGate = mix.gate ? mix.mountGate({
  start(withMusic) { if (startOpen(withMusic)) setupScroll(); },
  intro(tl, at) {
    tl.call(() => {
      const skip = tl.progress() === 1; // finished at once (?debug&open, the studio)
      let held = false;
      if (!skip && !dawnReady && !tl.paused()) { held = true; tl.pause(); }
      firstLoad.catch(() => {}).finally(() => { sunrise(); if (held) tl.resume(); });
    }, null, Math.max(0, at - 0.15)); // the moment the gate starts to fade
  },
}) : null;

/** The one signature moment: the sun comes up behind the peak. */
let introTweens = [];
function sunrise() {
  const names = gsap.utils.toArray('.hm-hero__names .hm-rv');
  if (reduced) {
    dawn?.set({ rise: 1 });
    document.body.classList.add('is-risen');
    gsap.set(names, { opacity: 1 });
    return;
  }
  if (dawn) gsap.to(dawn.state, { rise: 1, duration: 7.2, ease: 'power1.inOut' });
  else document.body.classList.add('is-risen');
  introTweens = [
    gsap.fromTo(names, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.6, ease: 'power3.out', stagger: 0.35, delay: 2.6 }),
    gsap.fromTo('.hm-hero__cue', { opacity: 0 }, { opacity: 1, duration: 1, delay: 5 }),
  ];
}

// ───────────────────────── Scroll ─────────────────────────
let lenis = null;
function setupScroll() {
  lenis = createSmooth();

  // Hero: camera lifts, names drift away, mist rises into the page.
  const hero = document.querySelector('.hm-hero');
  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: 'bottom bottom', scrub: reduced ? false : 0.4,
    onUpdate: (self) => {
      const p = self.progress;
      const mist = gsap.utils.clamp(0, 1, (p - 0.28) / 0.66);
      if (dawn) dawn.set({ scroll: reduced ? 0 : Math.min(1, p / 0.8), mist });
      else document.querySelector('.hm-hero__mist').style.opacity = String(mist);
    },
    onLeave: () => { dawn?.stop(); canvas.style.visibility = 'hidden'; },
    onEnterBack: () => { canvas.style.visibility = ''; dawn?.start(); },
  });
  gsap.to('.hm-hero__names', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '30% top', scrub: true } });
  gsap.to('.hm-hero__cue', { opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '8% top', scrub: true } });

  if (dawn && !mobile && !reduced) {
    window.addEventListener('pointermove', (e) => dawn.pointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1), { passive: true });
  }

  // Quiet reveals for headings and short lines (never body copy).
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.hm-in, .hm-families, .hm-intro__fig, .hm-intro__pair, .hm-pic, .hm-close__fig').forEach((el) => io.observe(el));

  essayScroll();
  daysScroll();
  journeyScroll();
  albumScroll();
  ScrollTrigger.refresh();
}

/** Pinned full-bleed essay: slow crossfades, gentle Ken Burns, a counter. */
function essayScroll() {
  const slides = gsap.utils.toArray('.hm-slide');
  if (!slides.length) return;
  const counter = document.getElementById('essay-n');
  if (reduced) { document.querySelector('.hm-essay').classList.add('is-static'); return; }
  gsap.set(slides, { opacity: 0 });
  gsap.set(slides[0], { opacity: 1 });
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.hm-essay', start: 'top top', end: () => `+=${slides.length * window.innerHeight * 0.95}`,
      pin: '.hm-essay__pin', scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: (self) => {
        const k = Math.min(slides.length - 1, Math.floor(self.progress * slides.length * 0.999 + 0.12));
        const s = pad(k);
        if (counter.textContent !== s) counter.textContent = s;
      },
    },
  });
  slides.forEach((s, i) => {
    const pic = s.querySelectorAll('img');
    const cap = s.querySelector('.hm-cap');
    // Ken Burns over this slide's whole stay (in, hold, out).
    tl.fromTo(pic, { scale: 1.0 }, { scale: 1.035, duration: 1.6 }, i === 0 ? 0 : i - 0.35);
    if (i > 0) {
      tl.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.45 }, i - 0.35);
      tl.to(slides[i - 1], { opacity: 0, duration: 0.3 }, i - 0.15);
      tl.fromTo(cap, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3 }, i - 0.1);
    }
  });
  tl.to({}, { duration: 0.4 }); // a breath on the last photo before releasing the pin
}

/** Ceremonies: the sticky photo beside the programme follows the ceremony you are reading. */
function daysScroll() {
  const items = gsap.utils.toArray('.hm-event');
  const figs = gsap.utils.toArray('.hm-days__fig');
  const setActive = (i) => {
    items.forEach((el, k) => el.classList.toggle('is-active', k === i));
    figs.forEach((el, k) => { el.classList.toggle('is-on', k === i); el.classList.toggle('is-past', k < i); });
  };
  setActive(0);
  items.forEach((el, i) => ScrollTrigger.create({
    trigger: el, start: 'top 60%', end: 'bottom 60%',
    onEnter: () => setActive(i), onEnterBack: () => setActive(i),
  }));
}

/** Travel & stay: three plates that rise in turn on wide screens, a calm stack on phones. */
function journeyScroll() {
  const wide = window.matchMedia('(min-width: 900px) and (min-aspect-ratio: 1/1)').matches;
  // Round 2: no half-cut panels at rest, so the legs stay a three-column grid and rise in turn.
  if (!wide || reduced) return;
  gsap.utils.toArray('.hm-leg').forEach((el, i) => gsap.fromTo(el, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: i * 0.14, scrollTrigger: { trigger: '.hm-journey__track', start: 'top 78%' } }));
}

/** Album: three columns at slightly different speeds (desktop only). */
function albumScroll() {
  if (mobile || reduced || !grid) return;
  const speeds = [-4, 6, -1];
  grid.querySelectorAll('.hm-album__col').forEach((col, i) => {
    gsap.fromTo(col, { yPercent: -speeds[i] }, { yPercent: speeds[i], ease: 'none', scrollTrigger: { trigger: grid, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

let rw = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === rw) return;
  rw = window.innerWidth;
  const before = grid?.dataset.cols;
  layoutAlbum();
  fitSlides();
  if (grid && before !== grid.dataset.cols && !mobile && !reduced) albumScroll();
});

// ───────────────────────── Debug hook (screenshots) ─────────────────────────
if (DEBUG) {
  window.__hm = {
    dawn, ScrollTrigger, gsap,
    open: () => open(false),
    rise: (v = 1) => { gsap.killTweensOf(dawn?.state); introTweens.forEach((t) => t.kill()); dawn?.set({ rise: v }); gsap.set('.hm-hero__names .hm-rv, .hm-hero__cue', { opacity: 1, y: 0 }); },
    to: (sel, offset = 0) => {
      const el = document.querySelector(sel);
      const y = el.getBoundingClientRect().top + window.scrollY + offset;
      lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
      ScrollTrigger.update();
    },
    essay: essay.map((p) => keyOf(p.photo)),
    album: album.map((p) => keyOf(p.photo)),
  };
  if (params.has('open')) { if (mixGate) mixGate.finish(); else open(false); }
}
