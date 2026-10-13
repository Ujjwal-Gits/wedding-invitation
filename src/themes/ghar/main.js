// Ghar · Lamplight Cinema. The invitation as a short film at night: a first-person
// walk through a lamplit Newar house, told with letterbox bars, chapter title cards
// and subtitles. Scroll is the projector: it drives the camera through the house.
import '../../core/base.css';
import './ghar.css';
import { loadInvitation } from '../../core/data.js';
import { bi, biNodes, esc, dateOf, timeRange, mapUrl, neNum, bsDateOf } from '../../core/i18n.js';
import { mountShell, ringBell, trackProgress } from '../../core/shell.js';
import { createSmooth, reducedMotion, isMobile } from '../../core/smooth.js';
import { guestEvents } from '../../core/finale.js';
import { initRsvp } from '../../core/rsvp.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { photoUrl } from '../../photos.js';
import { useSlots } from '../../core/slots.js';
import { openModal } from '../../core/modal.js';
import manifest from './slots.js';
import credits from '../../generated/credits.json';

const config = await loadInvitation();
const params0 = new URLSearchParams(location.search);
if (params0.has('debug') && params0.has('slottest')) {
  // Debug only: prove that studio overrides reach every slot (config.js is never edited).
  config.themeContent = { ...(config.themeContent || {}), ghar: {
    images: { 'courtyard.view': 'palace-courtyard', 'hall.frame1': config.couple.portraits?.[2]?.photo, 'rooftop.view': 'courtyard-dusk' },
    texts: { 'threshold.bow': { en: 'Mind your head, and welcome.', ne: 'शिर जोगाउनुहोस्, स्वागत छ।' }, 'ch2.title': { ne: 'आँगन', en: 'The yard' }, 'gate.present': { en: 'invite you', ne: 'निम्त्याउँछन्' } },
  } };
}
const S = useSlots(manifest);
const c = config.couple;
const events = guestEvents();
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
/** A title-card pair from a text slot: big Nepali word, small English line. */
const tpair = (id) => { const x = S.txt(id); return `<span class="tc__ne" lang="ne">${esc(x.ne)}</span><span class="tc__en l-en">${esc(x.en)}</span>`; };
const reduced = reducedMotion() || params.has('still');
const mobile = isMobile();
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
/**
 * The two date lines for a ceremony, from the shared converter (core/i18n.js, verified B.S.).
 * English leads with the AD date; Nepali leads with the B.S. date. An event's own dateBS wins.
 */
function datesOf(e) {
  const ad = dateOf(e.start);
  const bs = bsDateOf(e.start, e.dateBS);
  return {
    first: { en: ad.en, ne: bs.ne },
    second: { en: `${bs.short?.en || bs.en}${/B\.S\./.test(bs.short?.en || bs.en) ? '' : ' B.S.'}`, ne: ad.ne },
  };
}

/** Letterbox: about 2.15:1 on landscape screens, slim bars on phones. Bars animate on transform only. */
function letterbox() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const lb = w / h < 0.9 ? Math.round(h * 0.1) : Math.round(clamp((h - w / 2.15) / 2, 52, h * 0.13));
  const st = document.body.style;
  st.setProperty('--lb', `${lb}px`);
  st.setProperty('--half', `${Math.ceil(h / 2) + 1}px`);
  st.setProperty('--lbs', (lb / (Math.ceil(h / 2) + 1)).toFixed(4));
}
letterbox();
window.addEventListener('resize', letterbox);

document.title = `${c.bride.name.en} & ${c.groom.name.en} · ${config.share?.title ? config.share.title.split('·').pop().trim() : 'Shubha Bibaha'}`;

/* ───────────────────────── markup ───────────────────────── */
const names = (cls = '') => `<span class="pair ${cls}">${bi(c.bride.name)}<i class="pair__amp" aria-hidden="true">&amp;</i><span class="sr-only"> and </span>${bi(c.groom.name)}</span>`;
const longDate = dateOf(config.weddingDate);
const city = config.city || { en: 'Kathmandu', ne: 'काठमाडौं' };

const gate = $('#gate');
gate.innerHTML = `
  <div class="gate__in">
    <p class="gate__to" id="gate-to" hidden></p>
    <p class="gate__present">${bi(config.hosts || { en: 'Our families', ne: 'हाम्रो परिवार' })}<br /><span>${bi(S.txt('gate.present'))}</span></p>
    <h1 class="gate__names">${names()}</h1>
    <p class="gate__date">${bi(longDate)} <span aria-hidden="true">·</span> ${bi(city)}</p>
    <div class="gate__choices">
      <button type="button" class="gate__go" id="enter-music" disabled><span class="gate__tri" aria-hidden="true"></span>${bi(S.txt('gate.open'))}</button>
      <button type="button" class="gate__quiet" id="enter-quiet" disabled>${bi(S.txt('gate.quiet'))}</button>
    </div>
    <div class="gate__load" aria-hidden="true"><i id="load-bar"></i></div>
  </div>`;
const to = params.get('to');
if (to) {
  const el = $('#gate-to');
  el.replaceChildren(...biNodes(`For ${to.slice(0, 60)}`, `${to.slice(0, 60)}ज्यूलाई`));
  el.hidden = false;
}

/* ───────────────────────── finale (stills, reply, credits) ───────────────────────── */
// Stills lead with the couple; supporting photos follow. No narrative captions (this is sent before the wedding).
const gallery = (() => {
  const seen = new Set();
  const out = [];
  const push = (g) => {
    const key = typeof g.photo === 'string' ? g.photo : JSON.stringify(g.photo);
    if (!g.photo || seen.has(key)) return;
    seen.add(key);
    out.push({ photo: g.photo, alt: g.alt || '' });
  };
  (c.portraits || []).forEach(push);
  [c.bride?.photo, c.groom?.photo].forEach((ph) => ph && push({ photo: ph, alt: '' }));
  const lead = out.length;
  (config.gallery || []).forEach((g) => g && push(g));
  return out.slice(0, Math.max(lead, Math.min(out.length, lead + 4, 12)));
})();
const roleLine = (p) => `<p class="cr__role">${bi(p)}</p>`;
const daysLeft = Math.ceil((new Date(config.weddingDate).getTime() - Date.now()) / 86400000);
const info = config.info || {};

const programme = `
  <section class="pg" id="programme" aria-labelledby="pg-title">
    <header class="pg__head">
      <p class="tc__num" aria-hidden="true">07</p>
      <h2 class="pg__title" id="pg-title">${tpair('events.title')}</h2>
    </header>
    <ol class="pg__list">
      ${events.map((e) => { const d = datesOf(e); return `
      <li class="pg__row">
        <h3 class="pg__name">${bi(e.title)}</h3>
        <div class="pg__when">
          <p class="pg__day">${bi(d.first)}</p>
          <p class="pg__bs">${bi(d.second)}</p>
          <p class="pg__time">${bi(timeRange(e.start, e.end))}</p>
        </div>
        <div class="pg__where">
          <p class="pg__venue">${bi(e.venue)}</p>
          <a class="pg__map" href="${esc(mapUrl(e.mapQuery))}" target="_blank" rel="noopener">${bi({ en: 'Open map', ne: 'नक्सा हेर्नुहोस्' })}<span aria-hidden="true"> ↗</span></a>
          ${e.dress?.text ? `<p class="pg__dress"><span class="pg__sw" aria-hidden="true">${(e.dress.colors || []).slice(0, 3).map((col) => `<i style="background:${esc(col)}"></i>`).join('')}</span><span>${bi(e.dress.text)}</span></p>` : ''}
        </div>
      </li>`; }).join('')}
    </ol>
  </section>`;

$('#finale-root').innerHTML = `
  ${programme}
  ${gallery.length ? `
  <section class="stills" id="stills" aria-labelledby="stills-title">
    <div class="stills__pin">
      <header class="stills__head">
        <p class="tc__num" aria-hidden="true">08</p>
        <h2 class="stills__title" id="stills-title">${tpair('stills.title')}</h2>
      </header>
      <div class="stills__vp"><ol class="stills__track">
        ${gallery.map((g, i) => `
          <li class="still still--${g.shape || 'land'}">
            <button type="button" class="still__btn" data-idx="${i}">
              <img src="${esc(photoUrl(g.photo, 'sm'))}" alt="${esc(g.alt || '')}" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async" />
            </button>
            <p class="still__cap" aria-hidden="true"><span class="still__n">${String(i + 1).padStart(2, '0')}</span></p>
          </li>`).join('')}
      </ol></div>
    </div>
  </section>` : ''}

  <section class="reply" id="rsvp" aria-labelledby="rsvp-title">
    <div class="reply__head">
      <p class="tc__num" aria-hidden="true">09</p>
      <h2 class="reply__title" id="rsvp-title">${tpair('reply.title')}</h2>
      <p class="reply__when">${bi(longDate)}${daysLeft > 0 ? ` <span aria-hidden="true">·</span> ${bi({ en: `in ${daysLeft} days`, ne: `${neNum(daysLeft)} दिनपछि` })}` : ''}</p>
      <p class="reply__deadline">${bi(config.rsvp?.deadline || { en: '', ne: '' })}</p>
    </div>
    <form class="rsvp" id="rsvp-form" novalidate>
      <div class="field">
        <label for="f-name">${bi({ en: 'Your name', ne: 'नाम' })}</label>
        <input id="f-name" name="name" type="text" autocomplete="name" required maxlength="80" />
        <p class="field__err" id="f-name-err" role="alert"></p>
      </div>
      <div class="field">
        <label for="f-phone">${bi({ en: 'Phone (optional)', ne: 'फोन (ऐच्छिक)' })}</label>
        <input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" />
      </div>
      <fieldset class="field field--choice">
        <legend>${bi({ en: 'Will you attend?', ne: 'उपस्थिति' })}</legend>
        <div class="choice-grid">
          <label class="choice"><input type="radio" name="attending" value="yes" checked /><span>${bi({ en: 'Joyfully, yes', ne: 'अवश्य आउँछौं' })}</span></label>
          <label class="choice"><input type="radio" name="attending" value="no" /><span>${bi({ en: 'Blessings from afar', ne: 'टाढैबाट शुभकामना' })}</span></label>
        </div>
      </fieldset>
      <div class="rsvp__when-yes">
        <div class="field field--short">
          <label for="f-guests">${bi({ en: 'Guests, including you', ne: 'पाहुना संख्या' })}</label>
          <select id="f-guests" name="guests"></select>
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
      <button class="reply__send" type="submit" id="rsvp-submit">${bi(S.txt('reply.send'))}</button>
      <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
    </form>
    <div class="reply__more">
      <button type="button" class="link" id="add-calendar">${bi({ en: 'Add to calendar', ne: 'क्यालेन्डरमा थप्नुहोस्' })}</button>
      <button type="button" class="link" id="share">${bi({ en: 'Share the invitation', ne: 'निमन्त्रणा पठाउनुहोस्' })}</button>
      <button type="button" class="link" data-open-card>${bi({ en: 'Read the invitation card', ne: 'निम्तो पत्र पढ्नुहोस्' })}</button>
    </div>
    <details class="guide">
      <summary>${bi({ en: 'Travel, stays and family contacts', ne: 'यात्रा, बसाइ र सम्पर्क' })}</summary>
      <div class="guide__body">
        ${info.travel ? `<p class="guide__p">${bi(info.travel)}</p>` : ''}
        ${(info.stays || []).length ? `<ul class="guide__list">${info.stays.map((s) => `<li><b>${bi(s.name)}</b> ${bi(s.note)} <a href="${esc(mapUrl(s.mapQuery))}" target="_blank" rel="noopener">${bi({ en: 'Map', ne: 'नक्सा' })}<span aria-hidden="true"> ↗</span></a></li>`).join('')}</ul>` : ''}
        ${(info.contacts || []).length ? `<ul class="guide__list">${info.contacts.map((p) => { const tel = String(p.phone || '').replace(/[^\d+]/g, ''); return `<li><b>${bi(p.name)}</b> ${bi(p.role)} <a href="tel:${esc(tel)}">${bi({ en: 'Call', ne: 'फोन' })}</a> <a href="https://wa.me/${esc(tel.replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></li>`; }).join('')}</ul>` : ''}
        ${info.livestream ? `<p class="guide__p"><a href="${esc(info.livestream)}" target="_blank" rel="noopener">${bi({ en: 'Watch the ceremony live', ne: 'प्रत्यक्ष हेर्नुहोस्' })}</a></p>` : ''}
      </div>
    </details>
  </section>

  <footer class="roll" aria-label="Credits">
    <p class="roll__k">${bi(S.txt('roll.of'))}</p>
    <p class="roll__name">${bi(c.bride.fullName || c.bride.name)}</p>
    ${c.bride.parents ? roleLine(c.bride.parents) : ''}
    <p class="roll__amp" aria-hidden="true">&amp;</p>
    <p class="roll__name">${bi(c.groom.fullName || c.groom.name)}</p>
    ${c.groom.parents ? roleLine(c.groom.parents) : ''}
    <p class="roll__k">${bi(S.txt('roll.blessings'))}</p>
    <p class="roll__v">${bi(config.hosts || { en: '', ne: '' })}</p>
    <p class="roll__bless" lang="ne">${esc(config.closing?.ne || '')}</p>
    <p class="roll__tag">${esc(c.hashtag || '')}</p>
    <details class="roll__credits">
      <summary>${bi({ en: 'Photographs and music', ne: 'तस्बिर र संगीतको श्रेय' })}</summary>
      <ul>
        ${credits.map((k) => `<li>${esc(k.title || k.slot)}, ${esc(k.creator || 'unknown')}, <a href="${esc(k.license_url || k.source_url)}" target="_blank" rel="noopener">${esc(k.license)}</a> (<a href="${esc(k.source_url)}" target="_blank" rel="noopener">source</a>)</li>`).join('')}
        <li>Brick and carved-post textures cut from “Wooden door with tympanum” by Suraj Belbase, CC BY-SA 4.0</li>
        ${(config.music?.tracks || []).map((t) => `<li>${esc(t.credit)}</li>`).join('')}
      </ul>
    </details>
  </footer>

  <div class="card" id="card" hidden role="dialog" aria-modal="true" aria-labelledby="card-title" data-lenis-prevent>
    <div class="card__in" data-lenis-prevent>
      <button type="button" class="card__x" data-close><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
      <p class="card__shloka" lang="sa">${esc(config.invitation?.shloka?.sa || '')}</p>
      <h2 class="card__title" id="card-title">${bi(config.invitation?.salutation || { en: 'Respected guest,', ne: 'मान्यवर,' })}</h2>
      <p class="card__p">${bi(config.invitation?.body || { en: '', ne: '' })}</p>
      <p class="card__p">${bi(config.invitation?.request || { en: '', ne: '' })}</p>
      <p class="card__sign">${bi(config.invitation?.signoff || { en: '', ne: '' })}<br /><b>${bi(config.hosts || { en: '', ne: '' })}</b></p>
      <ul class="card__ev">${events.map((e) => `<li><b>${bi(e.title)}</b> ${bi(dateOf(e.start))}, ${bi(timeRange(e.start, e.end))}<br />${bi(e.venue)}</li>`).join('')}</ul>
    </div>
  </div>

  <div class="lightbox" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photo" data-lenis-prevent>
    <button type="button" class="lightbox__close" data-lb="close"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <button type="button" class="lightbox__nav lightbox__nav--prev" data-lb="prev"><span aria-hidden="true">‹</span><span class="sr-only">Previous</span></button>
    <figure class="lightbox__fig"><figcaption></figcaption></figure>
    <button type="button" class="lightbox__nav lightbox__nav--next" data-lb="next"><span aria-hidden="true">›</span><span class="sr-only">Next</span></button>
  </div>`;

document.body.insertAdjacentHTML('beforeend', `
  <div class="lb lb--top" aria-hidden="true"></div><div class="lb lb--bottom" aria-hidden="true"></div>
  <button type="button" class="cardlink" data-open-card>${bi(S.txt('card.button'))}</button>`);

initRsvp(events);
$('#add-calendar').addEventListener('click', () => downloadIcs(events));
$('#share').addEventListener('click', (e) => share(e.currentTarget));

// overlays live at the top of the page, above the film and the letterbox
document.body.append($('#card'), $('#lightbox'));

// invitation card: only the card scrolls, the page behind stays put (core/modal.js)
const card = $('#card');
let closeCard = null;
const hideCard = () => {
  if (!closeCard) return;
  card.classList.remove('is-open');
  const done = closeCard;
  closeCard = null;
  setTimeout(() => { card.hidden = true; }, 220);
  done();
};
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-open-card]') && !closeCard) {
    closeCard = openModal(card, { scroller: card.querySelector('.card__in'), onClose: hideCard });
    requestAnimationFrame(() => card.classList.add('is-open'));
    return;
  }
  if (closeCard && (e.target.closest('[data-close]') || e.target === card)) hideCard();
});

// lightbox for stills
(function lightbox() {
  const lb = $('#lightbox');
  if (!lb || !gallery.length) return;
  const cap = lb.querySelector('figcaption');
  const im = document.createElement('img');
  im.decoding = 'async';
  cap.before(im);
  let i = 0;
  const show = (k) => {
    i = (k + gallery.length) % gallery.length;
    im.src = photoUrl(gallery[i].photo, 'lg');
    im.alt = gallery[i].alt || '';
    cap.textContent = '';
  };
  let release = null;
  const close = () => {
    if (!release) return;
    const r = release;
    release = null;
    lb.classList.remove('is-open');
    setTimeout(() => { lb.hidden = true; }, 250);
    r();
  };
  $('.stills__track').addEventListener('click', (e) => {
    const b = e.target.closest('.still__btn');
    if (!b) return;
    show(Number(b.dataset.idx));
    release = openModal(lb, { onClose: close });
    requestAnimationFrame(() => lb.classList.add('is-open'));
  });
  lb.addEventListener('click', (e) => {
    const a = e.target.closest('[data-lb]')?.dataset.lb;
    if (a === 'close' || e.target === lb) close();
    else if (a === 'prev') show(i - 1);
    else if (a === 'next') show(i + 1);
  });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
})();

/* ───────────────────────── beats (title cards, subtitles, cards) ───────────────────────── */
function beatHTML(b) {
  switch (b.kind) {
    case 'title':
      return `<div class="tc"><span class="tc__num">${esc(b.num)}</span><span class="tc__ne" lang="ne">${esc(b.ne)}</span><span class="tc__en l-en">${esc(b.en)}</span></div>`;
    case 'sub':
      return `<p class="sub">${b.year ? `<span class="sub__k">${bi(b.year)}</span>` : ''}${bi(b.text)}</p>`;
    case 'vow':
      return `<p class="sub sub--vow"><span class="sub__k">${bi({ en: ROMAN[b.n - 1] || String(b.n), ne: neNum(b.n) })}</span>${bi(b.text)}</p>`;
    case 'names':
      return `<div class="nm"><p class="nm__pair">${names()}</p><p class="nm__date">${bi(longDate)}<span class="nm__bs">${bi(config.weddingDateBS || { en: '', ne: '' })}</span></p></div>`;
    case 'event': {
      const e = b.event;
      const d = datesOf(e);
      return `<div class="ev ev--${b.side}"><p class="ev__d">${bi(d.first)}</p><p class="ev__bs">${bi(d.second)}</p><h3 class="ev__t">${bi(e.title)}</h3><p class="ev__m">${bi(timeRange(e.start, e.end))}</p><p class="ev__m">${bi(e.venue)} <a class="ev__map" href="${esc(mapUrl(e.mapQuery))}" target="_blank" rel="noopener">${bi({ en: 'Map', ne: 'नक्सा' })}<span aria-hidden="true"> ↗</span></a></p></div>`;
    }
    case 'end':
      return `<div class="nm nm--end"><p class="nm__pair">${names()}</p><a class="nm__go" href="#rsvp">${bi(S.txt('end.ask'))}</a></div>`;
    default:
      return '';
  }
}

/* ───────────────────────── boot ───────────────────────── */
const { player } = mountShell({ chapters: [] });
const lenis = reduced ? null : createSmooth();
lenis?.stop();
let film = null;
let world = null;
let tCur = 0;
let tTarget = 0;
let entered = false;

function enter(withMusic) {
  if (entered) return;
  entered = true;
  try {
    player.unlock();
    ringBell(player.ctx, { when: 0.05, gain: 0.22 });
    if (withMusic) player.start(true);
  } catch { /* audio is optional */ }
  document.body.classList.remove('is-gated');
  document.body.classList.add('is-open');
  gate.classList.add('is-out');
  setTimeout(() => { gate.hidden = true; }, 1300);
  lenis?.start();
  window.scrollTo(0, 0);
}

async function boot() {
  const main = $('#main');
  if (reduced) return bootStill(main);
  let World, buildFilm;
  try {
    ({ World } = await import('./world.js'));
    ({ buildFilm } = await import('./film.js'));
    world = new World($('#stage'), { mobile, pixelRatio: DEBUG ? 1 : undefined });
  } catch (err) {
    console.warn('WebGL unavailable; showing the stills version.', err);
    return bootStill(main);
  }
  film = buildFilm(world, { config, events, mobile, S });

  main.innerHTML = `
    <section class="film" id="film" aria-label="${esc('A short film: a walk through the house')}">
      <div class="film__frame">
        <div class="film__beats">${film.beats.map((b, i) => `<div class="beat beat--${b.kind}" data-b="${i}" aria-hidden="true">${beatHTML(b)}</div>`).join('')}</div>
        <p class="film__cue" aria-hidden="true">${bi(S.txt('film.cue'))}</p>
      </div>
    </section>
    <div class="sr-only" aria-live="polite" id="film-live"></div>`;
  // Chapters (HUD): built now that we know their times.
  const nav = document.createElement('nav');
  nav.className = 'reel';
  nav.setAttribute('aria-label', 'Chapters');
  nav.innerHTML = `<ol>${film.chapters.map((ch, i) => `<li><button type="button" data-ch="${i}"><span class="reel__tick" aria-hidden="true"></span><span class="reel__label"><span lang="ne">${esc(ch.ne)}</span></span><span class="sr-only">${esc(ch.en)}</span></button></li>`).join('')}</ol>`;
  document.body.append(nav);
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ch]');
    if (!b) return;
    const ch = film.chapters[Number(b.dataset.ch)];
    if (ch.en === 'Reply') return $('#rsvp').scrollIntoView({ behavior: 'smooth' });
    const y = scrollFor(ch.t + 0.6);
    lenis ? lenis.scrollTo(y, { duration: 2 }) : window.scrollTo({ top: y, behavior: 'smooth' });
  });

  const filmEl = $('#film');
  const UNIT = mobile ? 0.55 : 0.6;
  const size = () => { filmEl.style.height = `${Math.round((film.total * UNIT + 1) * window.innerHeight)}px`; };
  size();
  window.addEventListener('resize', size);
  const scrollFor = (t) => filmEl.offsetTop + (t / film.total) * (filmEl.offsetHeight - window.innerHeight);
  const timeAt = () => clamp((window.scrollY - filmEl.offsetTop) / Math.max(1, filmEl.offsetHeight - window.innerHeight), 0, 1) * film.total;

  const beatEls = [...document.querySelectorAll('.beat')];
  const live = $('#film-live');
  let lastLive = '';
  const chTicks = [...nav.querySelectorAll('button')];
  let lastCh = -1;
  const updateBeats = (t) => {
    let say = '';
    film.beats.forEach((b, i) => {
      const el = beatEls[i];
      const ramp = b.kind === 'title' ? 0.3 : 0.22;
      const o = smooth(b.t0, b.t0 + ramp, t) * (1 - smooth(b.t1 - ramp, b.t1, t));
      if (el._o === o) return;
      el._o = o;
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o > 0.01 ? 'visible' : 'hidden';
      el.style.transform = b.kind === 'title' ? `scale(${(0.985 + 0.015 * o).toFixed(4)})` : `translate3d(0, ${((1 - o) * 10).toFixed(2)}px, 0)`;
      el.classList.toggle('is-on', o > 0.5);
      if (o > 0.5) say = el.textContent.trim();
    });
    if (say && say !== lastLive) { lastLive = say; live.textContent = say; }
    const idx = Math.max(0, film.chapters.filter((ch) => t >= ch.t - 0.1).length - 1);
    if (idx !== lastCh) {
      lastCh = idx;
      chTicks.forEach((b, k) => (k === idx ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    }
    document.body.classList.toggle('is-moving', t > 0.15);
  };

  const portrait = () => window.innerWidth / window.innerHeight < 0.9;
  const tick = () => {
    requestAnimationFrame(tick);
    if (!entered && !DEBUG) return;
    const locked = document.body.style.position === 'fixed'; // a modal holds the page still
    if (!world.debugHold && !locked) tTarget = timeAt();
    const k = mobile ? 0.16 : 0.2;
    tCur += (tTarget - tCur) * k;
    if (Math.abs(tTarget - tCur) < 0.0005) tCur = tTarget;
    film.apply(tCur, { portrait: portrait() });
    updateBeats(tCur);
    const past = window.scrollY > filmEl.offsetTop + filmEl.offsetHeight - window.innerHeight * 0.98;
    document.body.classList.toggle('is-after', past);
    world.setActive(!past || window.scrollY < filmEl.offsetTop + filmEl.offsetHeight + 40);
  };
  film.apply(0, { portrait: portrait() });
  updateBeats(0);
  requestAnimationFrame(tick);

  // Load the first room, then open the gate; the rest stream in behind.
  await trackProgress([film.first], $('#load-bar')).catch((e) => console.warn(e));
  film.all().catch((e) => console.warn('Some photographs failed to load', e));
  initStills();
  const b1 = $('#enter-music');
  const b2 = $('#enter-quiet');
  b1.disabled = b2.disabled = false;
  b1.addEventListener('click', () => enter(true), { once: true });
  b2.addEventListener('click', () => enter(false), { once: true });
  document.body.classList.add('is-ready');

  if (DEBUG) {
    window.__ghar = {
      film, world,
      enter: () => enter(false),
      go(t) {
        world.debugHold = true;
        tTarget = tCur = t;
        window.scrollTo(0, scrollFor(t));
        film.apply(t, { portrait: portrait() });
        updateBeats(t);
        world.render();
        return true;
      },
      ready: () => film.all().then(() => true),
      release() { world.debugHold = false; },
    };
  }
}

/* ───────────────────────── stills (horizontal pan) ───────────────────────── */
function initStills() {
  const sec = $('#stills');
  if (!sec) return;
  const track = $('.stills__track');
  const vp = $('.stills__vp');
  if (reduced || mobile) return; // phones swipe natively
  sec.classList.add('is-pinned');
  const dist = () => Math.max(0, track.scrollWidth - vp.clientWidth);
  const size = () => { sec.style.height = `${window.innerHeight + dist()}px`; };
  size();
  window.addEventListener('resize', size);
  const loop = () => {
    requestAnimationFrame(loop);
    const r = sec.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, sec.offsetHeight - window.innerHeight), 0, 1);
    track.style.transform = `translate3d(${(-p * dist()).toFixed(1)}px, 0, 0)`;
  };
  requestAnimationFrame(loop);
}

/* ───────────────────────── still version (reduced motion / no WebGL) ───────────────────────── */
async function bootStill(main) {
  document.body.classList.add('is-still');
  const { roomsFor, hallPictures, fill } = await import('./film.js');
  const R = roomsFor(config, events);
  const hall = hallPictures(c, S, config);
  const tc = (num, id) => { const x = S.txt(id); return `<div class="tc"><span class="tc__num">${num}</span><span class="tc__ne" lang="ne">${esc(x.ne)}</span><span class="tc__en l-en">${esc(x.en)}</span></div>`; };
  const fig = (ref, alt = '', cls = '') => `<figure class="sv__fig ${cls}"><img src="${esc(photoUrl(ref, 'sm'))}" alt="${esc(alt)}" loading="lazy" decoding="async" /></figure>`;
  const evc = (e) => beatHTML({ kind: 'event', event: e, side: 'left' });
  main.innerHTML = `
    <div class="sv">
      <section class="sv__s">${tc('01', 'ch1.title')}${fig(S.img('threshold.door'), S.alt('threshold.door'))}<p class="sub">${bi(fill(S.txt('threshold.welcome'), config))}</p></section>
      <section class="sv__s">${tc('02', 'ch2.title')}${fig(S.img('courtyard.view'), S.alt('courtyard.view'))}${beatHTML({ kind: 'names' })}</section>
      <section class="sv__s">${tc('03', 'ch3.title')}<div class="sv__row">${hall.map((p, i) => `<div>${fig(p.photo, p.alt, 'sv__fig--frame')}${config.story?.[i] ? `<p class="sub"><span class="sub__k">${bi(config.story[i].year)}</span>${bi(config.story[i].text)}</p>` : ''}</div>`).join('')}</div></section>
      <section class="sv__s">${tc('04', 'ch4.title')}<div class="sv__row">${R.pre.map((e) => `<div>${fig(e.photo, '', 'sv__fig--frame')}${evc(e)}</div>`).join('')}</div></section>
      <section class="sv__s">${tc('05', 'ch5.title')}${fig(S.img('window.view'), S.alt('window.view'))}${R.wedding ? evc(R.wedding) : ''}<ol class="sv__vows">${(config.saptapadi || []).map((v) => `<li>${bi(v)}</li>`).join('')}</ol></section>
      <section class="sv__s">${tc('06', 'ch6.title')}${fig(S.img('rooftop.view'), S.alt('rooftop.view'))}${R.post.map(evc).join('')}<p class="sub">${bi(config.closing || { en: '', ne: '' })}</p></section>
    </div>`;
  const b1 = $('#enter-music');
  const b2 = $('#enter-quiet');
  $('#load-bar').style.transform = 'scaleX(1)';
  b1.disabled = b2.disabled = false;
  b1.addEventListener('click', () => enter(true), { once: true });
  b2.addEventListener('click', () => enter(false), { once: true });
  document.body.classList.add('is-ready');
  initStills();
  if (DEBUG) window.__ghar = { enter: () => enter(false), go: () => true, ready: () => Promise.resolve(true) };
}

boot();
