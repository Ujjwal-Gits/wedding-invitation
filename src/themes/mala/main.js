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
import { bi, esc, dateOf, bsDateOf, timeLabel, mapUrl, neNum, dayNum, timeZone } from '../../core/i18n.js';
import { mountShell } from '../../core/shell.js';
import { madeWith } from '../../core/madewith.js';
import { createSmooth, reducedMotion, isMobile, getLenis } from '../../core/smooth.js';
import { initRsvp } from '../../core/rsvp.js';
import { guestEvents } from '../../core/finale.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { photoUrl } from '../../photos.js';
import { useSlots } from '../../core/slots.js';
import { openModal } from '../../core/modal.js';
import { GarlandScene, runScenes, preload } from './garland.js';
import { aspectOf, keyOf, isUrl, img, plate, kalash, corner, drape, local, hangStrings, buildGate as buildGateIn, gateHtml, heroHtml, heroEnter } from './parts.js';
import manifest from './slots.js';
import { createMix } from '../../core/mix.js';

gsap.registerPlugin(ScrollTrigger);

const config = await loadInvitation();
// another theme's gate and/or hero on this page (docs/MIX.md); without config.design nothing changes
const mix = await createMix({ host: 'mala', manifest, config });
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

const safeHref = (u) => (/^https:\/\//i.test(String(u || '')) ? String(u) : '');
const safeColor = (s) => (/^#[0-9a-f]{3,8}$/i.test(String(s)) ? s : null);
const tel = (p) => String(p).replace(/[^\d+]/g, '');
const PEOPLE = /^(couple|wedding|mehendi-hands|bride|groom)/;
const isCouple = (ref) => !!ref && (typeof ref === 'object' || isUrl(ref) || PEOPLE.test(ref));

const portraitAlt = Object.fromEntries((c.portraits || []).filter((p) => p?.photo).map((p) => [keyOf(p.photo), p.alt || '']));
const altFor = (ref, id) => portraitAlt[keyOf(ref)] || S.alt(id) || `${c.bride.name.en} and ${c.groom.name.en}`;


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
  close: { en: 'Close', ne: 'बन्द गर्नुहोस्' },
  and: { en: 'and', ne: 'र' },
  scroll: { en: 'Scroll', ne: 'तल जानुहोस्' },
};
const daysLeft = Math.ceil((new Date(config.weddingDate).getTime() - Date.now()) / 86400000);
const countLine = daysLeft > 1
  ? { en: `${daysLeft} days to go`, ne: `${neNum(daysLeft)} दिन बाँकी` }
  : daysLeft === 1 ? { en: 'Tomorrow', ne: 'भोलि' } : { en: 'With love', ne: 'मायासहित' };
const monthYear = (iso) => {
  const en = new Intl.DateTimeFormat('en-GB', { timeZone: timeZone(), month: 'short', year: 'numeric' }).format(new Date(iso));
  const m = /,\s*(\S+)\s+\S+,\s*(\S+)$/.exec(dateOf(iso).ne);
  return { en, ne: m ? `${m[1]} ${m[2]}` : dateOf(iso).ne };
};
const weekday = (iso) => ({
  en: new Intl.DateTimeFormat('en-GB', { timeZone: timeZone(), weekday: 'long' }).format(new Date(iso)),
  ne: dateOf(iso).ne.split(',')[0],
});

// ───────────────────────── Gate ─────────────────────────
const gate = document.getElementById('gate');
// Decoration, the way a Nepali decorator dresses a mandap for the wedding: a sindoor silk valance over ivory
// net with a cluster of marigolds, roses and hibiscus at every gather and a posy at the foot of every swag,
// full marigold strings hung from it, brass kalash arrangements standing in a bed of fresh flowers, and photos
// framed with full corners of fresh roses and marigolds. Text never sits on any of it.
gate.innerHTML = gateHtml({ c, config, txt });

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
  ${heroHtml({ c, config, txt, heroRef, heroAlt: altFor(heroRef, 'hero.photo') })}

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
    ${madeWith()}
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
if (mix.hero) mix.mountHero(document.getElementById('top'));
// another theme's gate covers the page instead of the garland arch: Mala's own gate never enters the page
if (mix.gate) gate.remove();

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
const scenes = [];
// another theme's gate replaced Mala's: no strands to hang (and no WebGL context spent on them)
const gateStrands = mix.gate ? null : gate.querySelector('#gate-strands');
const stageSet = document.getElementById('stage-set');
const swayStage = document.getElementById('sway-stage');
const lineStage = document.getElementById('line-stage');
const gateScene = gateStrands ? new GarlandScene(gateStrands, { reduced, shadow: { x: 4, y: 9, opacity: 0.18 } }) : null;
const stageScene = new GarlandScene(stageSet, { reduced, shadow: { x: 4, y: 9, opacity: 0.18 } });
const swayScene = new GarlandScene(swayStage, { reduced });
const lineScene = lineStage ? new GarlandScene(lineStage, { reduced, bleed: 0 }) : null;
if (gateScene) scenes.push(gateScene);
scenes.push(stageScene, swayScene); if (lineScene) scenes.push(lineScene);

function buildGate() { if (gateScene) buildGateIn(gateScene, gate, gateStrands); }
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
  if (enterBtn) { enterBtn.disabled = false; quietBtn.disabled = false; gate.classList.add('is-ready'); }
});

let opened = false;
/** Into the page: music from the guest's tap, scrolling on, the garland scenes laid out. */
function startOpen(withMusic) {
  if (opened) return false;
  opened = true;
  player.unlock(); player.start(withMusic);
  document.body.classList.remove('is-gated');
  window.scrollTo(0, 0);
  relayout();
  setupScroll();
  return true;
}
/** The hero settles in from `at` (another theme's hero brings its own entrance). */
function heroIntro(tl, at) {
  if (mix.heroInst) { mix.heroEnter(tl, at); return; }
  heroEnter(tl, at);
}
// a borrowed first screen has settled (and made its own ScrollTriggers): re-measure Mala's pinned Swayambar after it
const afterHero = () => { if (mix.heroInst) requestAnimationFrame(() => ScrollTrigger.refresh()); };
const mixGate = mix.gate ? mix.mountGate({ start: startOpen, intro: heroIntro, finish: afterHero }) : null;
function open(withMusic) {
  if (mixGate) { mixGate.open(withMusic); return; }
  if (!startOpen(withMusic)) return;
  const done = () => { gate.remove(); if (gateScene) gateScene.active = false; mix.afterOpen?.(); afterHero(); };
  if (reduced) { gsap.to(gate, { opacity: 0, duration: 0.4, onComplete: done }); return; }
  // The entrance: the camera walks forward through the floral arch into the page.
  gate.classList.add('is-entering');
  const tl = gsap.timeline({ onComplete: done });
  tl.to('.ml-gate__inner', { opacity: 0, y: -8, duration: 0.4, ease: 'power2.in' }, 0)
    .to('#gate-arch', { scale: 2.6, duration: 1.8, ease: 'power2.inOut' }, 0.1)
    .to(gate, { backgroundColor: 'rgba(251, 248, 241, 0)', duration: 0.8, ease: 'power1.inOut' }, 0.45)
    .to('#gate-arch', { opacity: 0, duration: 0.55, ease: 'power1.in' }, 1.3);
  heroIntro(tl, 0.45);
}
enterBtn?.addEventListener('click', () => open(true));
quietBtn?.addEventListener('click', () => open(false));

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
const initGate = () => { if (!gateScene) return; buildGate(); gateScene.forceRender = true; };
if (!gateDrape) { /* another theme's gate */ } else if (gateDrape.complete) requestAnimationFrame(initGate); else gateDrape.addEventListener('load', initGate, { once: true });
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
  if (params.has('open')) { if (mixGate) mixGate.finish(); else open(false); }
}
