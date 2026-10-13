// Shared closing sections: gallery, guest information, countdown, RSVP, blessing, credits.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { config } from '../config.js';
import { bi, biNodes, esc, neNum, dateOf, timeRange, mapUrl } from './i18n.js';
import { initRsvp } from './rsvp.js';
import { photoUrl } from '../photos.js';
import { lockScroll, unlockScroll } from './modal.js';
import { downloadIcs, share } from './calendar.js';

gsap.registerPlugin(ScrollTrigger);

/** Events this guest is invited to: ?e=wedding,reception narrows the list. */
export function guestEvents() {
  const only = new URLSearchParams(location.search).get('e');
  if (!only) return config.events;
  const ids = only.split(',').map((s) => s.trim());
  const list = config.events.filter((e) => ids.includes(e.id));
  return list.length ? list : config.events;
}

const srcOf = (g, size) => (g.photo ? photoUrl(g.photo, size) : size === 'sm' ? g.srcSm || g.src : g.src);
const img = (g, sizes) =>
  `<img src="${esc(srcOf(g, 'sm'))}" srcset="${esc(srcOf(g, 'sm'))} 1280w, ${esc(srcOf(g, 'lg'))} 2560w" sizes="${sizes}" alt="${esc(g.alt)}" loading="lazy" decoding="async" />`;

export function renderFinale(root, { credits = [] } = {}) {
  const c = config.couple;
  const events = guestEvents();
  const info = config.info;

  root.innerHTML = `
  <section class="gallery" id="gallery" aria-labelledby="gallery-title">
    <div class="gallery__head">
      <p class="eyebrow">${bi({ en: 'Before the big day', ne: 'शुभ दिन अघि' })}</p>
      <h2 class="display" id="gallery-title">${bi({ en: 'The two of us', ne: 'हामी दुई' })}</h2>
    </div>
    <div class="gallery__viewport">
      <ul class="gallery__track">
        ${config.gallery.map((g, i) => `
          <li class="gallery__item gallery__item--${g.shape || 'land'}">
            <button type="button" class="gallery__btn" data-idx="${i}">
              <span class="gallery__frame">${img(g, '(max-width: 760px) 80vw, 40vw')}</span>
              ${g.caption ? `<span class="gallery__cap">${bi(g.caption)}</span>` : ''}
            </button>
          </li>`).join('')}
      </ul>
    </div>
  </section>

  <section class="info" aria-labelledby="info-title">
    <h2 class="sr-only" id="info-title">${bi({ en: 'For our guests', ne: 'पाहुनाहरूका लागि' })}</h2>
    <div class="info__col">
      <p class="eyebrow">${bi({ en: 'What to wear', ne: 'पहिरन' })}</p>
      <ul class="dress">
        ${events.filter((e) => e.dress?.colors?.length || e.dress?.text?.en || e.dress?.text?.ne).map((e) => `
          <li>
            <span class="dress__sw" aria-hidden="true">${(e.dress?.colors || []).map((col) => `<i style="background:${esc(col)}"></i>`).join('')}</span>
            <span><b>${bi(e.title)}</b><small>${bi(e.dress?.text || { en: 'Festive traditional', ne: 'परम्परागत पहिरन' })}</small></span>
          </li>`).join('')}
      </ul>
    </div>
    <div class="info__col">
      <p class="eyebrow">${bi({ en: 'Getting there & staying', ne: 'यात्रा तथा बसाइ' })}</p>
      <p class="info__p">${bi(info.travel)}</p>
      <ul class="stay">
        ${info.stays.map((s) => `<li><b>${bi(s.name)}</b><small>${bi(s.note)}</small><a class="map-link" href="${esc(mapUrl(s.mapQuery))}" target="_blank" rel="noopener">${bi({ en: 'Map', ne: 'नक्सा' })} ↗</a></li>`).join('')}
      </ul>
    </div>
    <div class="info__col">
      <p class="eyebrow">${bi({ en: 'Questions? Call the family', ne: 'सम्पर्क' })}</p>
      <ul class="contacts">
        ${info.contacts.map((p) => {
          const tel = String(p.phone).replace(/[^\d+]/g, '');
          return `<li><b>${bi(p.name)}</b><small>${bi(p.role)}</small>
            <span class="contacts__links"><a href="tel:${esc(tel)}">${bi({ en: 'Call', ne: 'फोन' })}</a><a href="https://wa.me/${esc(tel.replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span></li>`;
        }).join('')}
      </ul>
      ${info.livestream ? `<a class="btn btn--ghost info__live" href="${esc(info.livestream)}" target="_blank" rel="noopener">${bi({ en: 'Watch the ceremony live', ne: 'प्रत्यक्ष हेर्नुहोस्' })}</a>` : ''}
    </div>
  </section>

  <section class="finale" id="rsvp" aria-labelledby="rsvp-title">
    <div class="finale__count">
      <p class="eyebrow">${bi({ en: 'Until the sacred fire is lit', ne: 'शुभ लगनसम्म' })}</p>
      <div class="count" id="countdown" role="timer" aria-label="Time until the wedding"></div>
      <p class="finale__date">${bi(dateOf(config.weddingDate))}<br /><small>${bi(config.weddingDateBS)}</small></p>
    </div>

    <div class="letter">
      <div class="letter__frame" aria-hidden="true"></div>
      <h2 class="letter__title" id="rsvp-title">${bi({ en: 'Will you join us?', ne: 'हजुर आउनुहुन्छ?' })}</h2>
      <p class="letter__deadline">${bi(config.rsvp.deadline)}</p>
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
          <label class="choice"><input type="radio" name="attending" value="yes" checked /><span>${bi({ en: 'Joyfully, yes', ne: 'अवश्य आउँछौं' })}</span></label>
          <label class="choice"><input type="radio" name="attending" value="no" /><span>${bi({ en: 'Sending blessings from afar', ne: 'टाढैबाट शुभकामना' })}</span></label>
        </fieldset>
        <div class="rsvp__when-yes">
          <div class="field">
            <label for="f-guests">${bi({ en: 'Guests, including you', ne: 'पाहुना संख्या' })}</label>
            <select id="f-guests" name="guests"></select>
          </div>
          <fieldset class="field field--choice">
            <legend>${bi({ en: 'Which ceremonies?', ne: 'कुन कार्यक्रम?' })}</legend>
            <div id="f-events" class="choice-grid"></div>
          </fieldset>
          <fieldset class="field field--choice">
            <legend>${bi({ en: 'Meal preference', ne: 'खाना' })}</legend>
            <div class="choice-grid">
              <label class="choice"><input type="radio" name="meal" value="veg" /><span>${bi({ en: 'Vegetarian', ne: 'शाकाहारी' })}</span></label>
              <label class="choice"><input type="radio" name="meal" value="nonveg" checked /><span>${bi({ en: 'Non-vegetarian', ne: 'मांसाहारी' })}</span></label>
            </div>
          </fieldset>
        </div>
        <div class="field">
          <label for="f-msg">${bi({ en: 'A blessing for the couple (optional)', ne: 'शुभकामना (ऐच्छिक)' })}</label>
          <textarea id="f-msg" name="message" rows="3" maxlength="500"></textarea>
        </div>
        <div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>
        <button class="btn" type="submit" id="rsvp-submit">${bi({ en: 'Send your reply', ne: 'जवाफ पठाउनुहोस्' })}</button>
        <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
      </form>
    </div>

    <div class="finale__actions">
      <button class="btn btn--ghost" type="button" id="add-calendar">${bi({ en: 'Add to calendar', ne: 'क्यालेन्डरमा थप्नुहोस्' })}</button>
      <button class="btn btn--ghost" type="button" id="share">${bi({ en: 'Share the invitation', ne: 'निमन्त्रणा पठाउनुहोस्' })}</button>
    </div>
  </section>

  <footer class="blessing">
    <svg class="blessing__div" aria-hidden="true"><use href="#i-divider" /></svg>
    <p class="blessing__ne" lang="ne">${esc(config.closing.ne)}</p>
    <p class="blessing__en">${esc(config.closing.en)}</p>
    <p class="blessing__names">${bi(c.bride.name)} <span class="amp">&amp;</span> ${bi(c.groom.name)}</p>
    <p class="blessing__tag">${esc(c.hashtag)}</p>
    ${credits.length ? `
    <details class="credits">
      <summary>${bi({ en: 'Photo & music credits', ne: 'श्रेय' })}</summary>
      <ul>${credits.map((k) => `<li>${esc(k.title || k.slot)} by ${esc(k.creator || 'unknown')}, <a href="${esc(k.license_url || k.source_url)}" target="_blank" rel="noopener">${esc(k.license)}</a>, <a href="${esc(k.source_url)}" target="_blank" rel="noopener">source</a></li>`).join('')}
      ${config.music.tracks.map((t) => `<li>${esc(t.credit)}</li>`).join('')}</ul>
    </details>` : ''}
  </footer>

  <div class="lightbox" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photo" data-lenis-prevent>
    <button type="button" class="lightbox__close" data-lb="close"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <button type="button" class="lightbox__nav lightbox__nav--prev" data-lb="prev"><span aria-hidden="true">‹</span><span class="sr-only">Previous</span></button>
    <figure class="lightbox__fig"><figcaption></figcaption></figure>
    <button type="button" class="lightbox__nav lightbox__nav--next" data-lb="next"><span aria-hidden="true">›</span><span class="sr-only">Next</span></button>
  </div>`;

  initRsvp(events);
  startCountdown(document.getElementById('countdown'));
  document.getElementById('add-calendar').addEventListener('click', () => downloadIcs(events));
  document.getElementById('share').addEventListener('click', (e) => share(e.currentTarget));
  initLightbox();
}

/** Desktop: pinned horizontal filmstrip scrubbed by vertical scroll. Phones: native swipe. */
export function animateGallery({ reduced, mobile }) {
  if (reduced || mobile) return;
  const track = document.querySelector('.gallery__track');
  const vp = document.querySelector('.gallery__viewport');
  const dist = () => Math.max(0, track.scrollWidth - vp.clientWidth);
  gsap.to(track, {
    x: () => -dist(),
    ease: 'none',
    scrollTrigger: { trigger: '.gallery', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 },
  });
  // Each photo drifts inside its frame for depth.
  document.querySelectorAll('.gallery__frame img').forEach((im) => {
    gsap.fromTo(im, { xPercent: -6 }, {
      xPercent: 6, ease: 'none',
      scrollTrigger: { trigger: '.gallery', start: 'top top', end: () => `+=${dist()}`, scrub: true, invalidateOnRefresh: true },
    });
  });
}

function initLightbox() {
  const lb = document.getElementById('lightbox');
  const cap = lb.querySelector('figcaption');
  const im = document.createElement('img');
  im.decoding = 'async';
  cap.before(im);
  let i = 0;
  let opener = null;
  const show = (k) => {
    i = (k + config.gallery.length) % config.gallery.length;
    const g = config.gallery[i];
    im.src = srcOf(g, 'lg');
    im.alt = g.alt;
    cap.innerHTML = g.caption ? bi(g.caption) : '';
  };
  const close = () => { if (lb.hidden) return; lb.classList.remove('is-open'); unlockScroll(); setTimeout(() => { lb.hidden = true; }, 300); opener?.focus(); };
  document.querySelector('.gallery__track').addEventListener('click', (e) => {
    const b = e.target.closest('.gallery__btn');
    if (!b) return;
    opener = b;
    show(Number(b.dataset.idx));
    lb.hidden = false;
    lockScroll();
    requestAnimationFrame(() => lb.classList.add('is-open'));
    lb.querySelector('.lightbox__close').focus();
  });
  lb.addEventListener('click', (e) => {
    const act = e.target.closest('[data-lb]')?.dataset.lb;
    if (act === 'close' || e.target === lb) close();
    else if (act === 'prev') show(i - 1);
    else if (act === 'next') show(i + 1);
  });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
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

function startCountdown(el) {
  const target = new Date(config.weddingDate).getTime();
  const units = [
    ['d', 86400000, { en: 'Days', ne: 'दिन' }],
    ['h', 3600000, { en: 'Hours', ne: 'घण्टा' }],
    ['m', 60000, { en: 'Minutes', ne: 'मिनेट' }],
    ['s', 1000, { en: 'Seconds', ne: 'सेकेन्ड' }],
  ];
  el.innerHTML = units.map(([k, , l]) => `<div class="count__unit"><span class="count__n" data-u="${k}"></span><span class="count__l">${bi(l)}</span></div>`).join('');
  const cells = Object.fromEntries(units.map(([k]) => [k, el.querySelector(`[data-u="${k}"]`)]));
  const tick = () => {
    let left = target - Date.now();
    if (left <= 0) { el.innerHTML = `<p class="count__done">${bi({ en: 'Today is the day.', ne: 'आज शुभ दिन।' })}</p>`; return; }
    for (const [k, ms] of units) {
      const n = Math.floor(left / ms);
      left -= n * ms;
      const s = String(n).padStart(2, '0');
      cells[k].replaceChildren(...biNodes(s, neNum(s)));
    }
    setTimeout(tick, 1000 - (Date.now() % 1000));
  };
  tick();
}

export { timeRange };
