// Vow: the engine behind the international designs (English, faith-neutral, any venue time zone, any occasion).
// It owns the data, the standard sections' content and behaviour (dates at the venue, countdown, schedule with maps,
// story, photos, travel and stays, the full card, RSVP, lightbox, music, livestream, the opening's lock and safety
// net). Each design supplies what makes it itself: its gate scene and opening motion, its page layout (every body is
// different), its scroll motion, its fonts and palette.
//
// T = { slug, manifest, demo, gate(ctx), open(ctx, tl, gate) → time hero intro starts, page(ctx), scroll?(ctx),
//       ready?(ctx), gateTap?(ctx, open), ownButtons?: true (the gate scene has #open/#quiet itself) }
// Standard ids (the studio's live preview finds sections by them): #gate #open #quiet #top #couple #story #date
// [data-countdown] #programme #ev-<id> #photos [data-lb-idx] #info [data-open-card] #rsvp #rsvp-form footer.
import '../../core/base.css';
import './vow.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadInvitation, config } from '../../core/data.js';
import { bi, esc, pair, mapUrl, setTimeZone } from '../../core/i18n.js';
import { mountShell } from '../../core/shell.js';
import { madeWith } from '../../core/madewith.js';
import { createSmooth, reducedMotion } from '../../core/smooth.js';
import { initRsvp } from '../../core/rsvp.js';
import { guestEvents } from '../../core/finale.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { openModal } from '../../core/modal.js';
import { useSlots } from '../../core/slots.js';
import { isCoupleOccasion } from '../../core/markets.js';
import { photoUrl } from '../../photos.js';
import { dateParts, timeText, spelled, sameDay } from './kit.js';
import { intlDemo } from './demo.js';
import { withOccasion } from './occasion.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.clearScrollMemory('manual');

const UI = {
  map: 'Map', directions: 'Directions', calendar: 'Add to calendar', shareIt: 'Share', close: 'Close', scroll: 'Scroll',
  days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds', past: 'Thank you for celebrating with us',
  stays: 'Where to stay', travel: 'Getting there', contacts: 'Questions?', call: 'Call', text: 'Text', order: 'Timeline',
  name: 'Your name', coming: 'Will you be there?', guests: 'Guests', phone: 'Phone (optional)', events: 'Which events?',
  meal: 'Any dietary needs?', veg: 'Vegetarian', nonveg: 'No preference', message: 'A note for us (optional)', wear: 'Attire',
  date: 'Date', place: 'Place', watch: 'Watch live',
};
const E = (en) => ({ en, ne: '' });

const safeColor = (s) => (/^#[0-9a-f]{3,8}$/i.test(String(s)) ? s : null);
const safeHref = (u) => (/^https:\/\//i.test(String(u || '')) ? String(u) : '');
const tel = (p) => String(p).replace(/[^\d+]/g, '');
const keyOf = (ref) => (typeof ref === 'string' ? ref : ref && typeof ref === 'object' ? ref.lg || ref.sm || '' : '');
const filled = (v) => Boolean(pair(v).en);

const params = new URLSearchParams(location.search);
const inFrame = (() => { try { return window.parent !== window; } catch { return true; } })();
/** The design page without an invitation (design browsing, thumbnails, the watermarked showcase). */
const isDemoPage = () => !params.has('id') && !(inFrame && params.get('preview') === '1');

/** Mount an international design. */
export async function mountVow(T) {
  await loadInvitation();
  // demo pages show this design's own American demo instead of the Nepali couple
  if (isDemoPage() && T.demo) {
    // ?debug&occasion=birthday: try the design with another occasion's words (one name unless the occasion is a couple's)
    const occ = params.has('debug') ? params.get('occasion') : null;
    const demo = occ ? { ...T.demo, occasion: occ, groom: isCoupleOccasion(occ) ? T.demo.groom : '', eventTitle: T.demo.eventTitle || 'The celebration' } : T.demo;
    const next = intlDemo(demo, config);
    for (const k of Object.keys(config)) delete config[k];
    Object.assign(config, next);
    setTimeZone(config.timeZone);
    document.title = `${config.share.title}`;
  }
  // a real invitation still on the Nepal starter song gets this design's music instead
  const tracks = config.music?.tracks || [];
  if (tracks.length && tracks.every((t) => /\/audio\/(shehnai|ceremony-shehnai|temple-shehnai)/.test(String(t?.src || '')))) {
    config.music.tracks = [{ title: E('Canon in D'), mood: E('Strings and harp'), src: '/audio/canon-in-d.mp3', credit: '' }];
  }

  const DEBUG = params.has('debug');
  const reduced = reducedMotion() || params.has('still');
  const root = document.documentElement;
  root.dataset.lang = 'en'; root.lang = 'en';
  const c = config.couple;
  const occasion = config.occasion || 'wedding';
  const isPair = isCoupleOccasion(occasion) && filled(c.groom?.name);
  const events = guestEvents();
  const manifest = withOccasion(T.manifest, occasion);
  const S = useSlots(manifest);
  const txt = S.txt;
  const on = (v) => filled(v);

  // ───────── photographs (never cropped by the engine; a design frames them) ─────────
  const portraitAlt = Object.fromEntries((c.portraits || []).filter((p) => p?.photo).map((p) => [keyOf(p.photo), p.alt || '']));
  const whoEn = isPair ? `${pair(c.bride.name).en} and ${pair(c.groom.name).en}` : pair(c.bride.name).en;
  const altFor = (ref, id) => portraitAlt[keyOf(ref)] || (ref && typeof ref === 'object' && ref.alt) || S.alt(id) || whoEn;
  const imgTag = (ref, alt, sizes, { eager = false, cls = '' } = {}) => (ref
    ? `<img class="${cls}" src="${esc(photoUrl(ref, 'sm'))}" srcset="${esc(photoUrl(ref, 'sm'))} 1000w, ${esc(photoUrl(ref, 'lg'))} 2000w" sizes="${sizes}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`
    : '');
  const used = new Set();
  const take = (ref) => { used.add(keyOf(ref)); return ref; };
  const leadRef = S.img('couple.lead');
  const lead = leadRef ? { photo: take(leadRef), alt: altFor(leadRef, 'couple.lead') } : null;
  const album = [];
  for (const n of [1, 2, 3, 4, 5, 6]) {
    if (!manifest.images?.[`gallery.${n}`]) continue;
    const ref = S.img(`gallery.${n}`);
    if (ref && !used.has(keyOf(ref))) album.push({ photo: take(ref), alt: altFor(ref, `gallery.${n}`) });
  }
  for (const g of config.gallery || []) if (g?.photo && !used.has(keyOf(g.photo))) album.push({ photo: take(g.photo), alt: g.alt || '' });
  const photos = album.slice(0, 9);
  const ratio = (ref) => (ref && typeof ref === 'object' && ref.w && ref.h ? ref.w / ref.h : null);

  // ───────── the day ─────────
  const mainEv = events.find((e) => e?.start && sameDay(e.start, config.weddingDate)) || null;
  const mainIso = mainEv?.start || config.weddingDate;
  const D = { ...dateParts(mainIso), spelled: spelled(mainIso), iso: mainIso };
  const target = new Date(mainIso).getTime();
  const venue = mainEv?.venue && filled(mainEv.venue) ? pair(mainEv.venue).en : '';
  const city = pair(config.city).en;
  const firstEv = events.filter((e) => e?.start).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const span = firstEv.length > 1 && !sameDay(firstEv[0].start, firstEv[firstEv.length - 1].start)
    ? { from: dateParts(firstEv[0].start), to: dateParts(firstEv[firstEv.length - 1].start) } : null;

  /** The names: two (a couple) or one (a birthday, a shower …). amp = the markup between them. */
  const names = ({ amp = '&amp;', cls = '' } = {}) => (isPair
    ? `<span class="vw-n ${cls}">${bi(c.bride.name)}</span><span class="vw-amp" aria-hidden="true">${amp}</span><span class="sr-only"> and </span><span class="vw-n ${cls}">${bi(c.groom.name)}</span>`
    : `<span class="vw-n ${cls}">${bi(c.bride.name)}</span>`);
  const namesText = isPair ? `${pair(c.bride.name).en} & ${pair(c.groom.name).en}` : pair(c.bride.name).en;
  const initials = isPair ? [pair(c.bride.name).en.charAt(0), pair(c.groom.name).en.charAt(0)] : [pair(c.bride.name).en.charAt(0)];

  // ───────── the parts a design composes its page from ─────────
  const countCell = (u, label) => `<li class="vw-count__cell"><b class="vw-count__n" data-u="${u}">00</b><span class="vw-count__l">${label}</span></li>`;
  const rsvpForm = () => `
      <form class="rsvp vw-form" id="rsvp-form" novalidate>
        <div class="vw-field"><label for="f-name">${UI.name}</label><input id="f-name" name="name" type="text" autocomplete="name" required maxlength="80" /><p class="vw-err" id="f-name-err" role="alert"></p></div>
        <fieldset class="vw-field"><legend>${UI.coming}</legend><div class="vw-choices">
          <label class="choice"><input type="radio" name="attending" value="yes" checked /><span>${bi(txt('rsvp.yes'))}</span></label>
          <label class="choice"><input type="radio" name="attending" value="no" /><span>${bi(txt('rsvp.no'))}</span></label></div></fieldset>
        <div class="rsvp__when-yes">
          <div class="vw-row">
            <div class="vw-field"><label for="f-guests">${UI.guests}</label><select id="f-guests" name="guests"></select></div>
            <div class="vw-field"><label for="f-phone">${UI.phone}</label><input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" /></div>
          </div>
          <fieldset class="vw-field${events.length > 1 ? '' : ' vw-field--hide'}"><legend>${UI.events}</legend><div class="vw-choices" id="f-events"></div></fieldset>
          <fieldset class="vw-field"><legend>${UI.meal}</legend><div class="vw-choices">
            <label class="choice"><input type="radio" name="meal" value="nonveg" checked /><span>${UI.nonveg}</span></label>
            <label class="choice"><input type="radio" name="meal" value="veg" /><span>${UI.veg}</span></label></div></fieldset>
        </div>
        <div class="vw-field"><label for="f-msg">${UI.message}</label><textarea id="f-msg" name="message" rows="3" maxlength="500"></textarea></div>
        <div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>
        <button class="vw-btn" type="submit" id="rsvp-submit">${bi(txt('rsvp.send'))}</button>
        <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
      </form>`;
  const evs = events.map((e) => {
    const d = dateParts(e.start);
    const colors = (e.dress?.colors || []).map(safeColor).filter(Boolean);
    return {
      e, id: e.id, title: e.title, blurb: filled(e.blurb) ? e.blurb : null, venue: e.venue, d, time: timeText(e),
      map: mapUrl(e.mapQuery || pair(e.venue).en || ''), dress: (filled(e.dress?.text) || colors.length) ? { colors, text: filled(e.dress?.text) ? e.dress.text : E(UI.wear) } : null,
      order: (e.rituals || []).filter((r) => filled(r.title)).map((r) => ({ time: typeof r.time === 'string' ? r.time : pair(r.time).en, title: r.title })),
    };
  });
  const info = config.info || {};
  const stays = (info.stays || []).filter((s) => filled(s.name));
  const contacts = (info.contacts || []).filter((p) => filled(p.name) && p.phone);
  const live = safeHref(info.livestream);
  const story = (config.story || []).filter((s) => filled(s.text));
  const hasInfo = filled(info.travel) || stays.length > 0 || contacts.length > 0;
  const P = {
    UI, E, bi, esc, pair,
    countUnits: [{ u: 'd', label: UI.days }, { u: 'h', label: UI.hours }, { u: 'm', label: UI.minutes }, { u: 's', label: UI.seconds }],
    /** a countdown; inside any [data-countdown], every [data-u="d|h|m|s"] is filled each second */
    countdown: (cls = '') => `<div class="vw-count ${cls}" data-countdown><ol class="vw-count__grid" aria-label="${esc(txt('count.title').en)}">${countCell('d', UI.days)}${countCell('h', UI.hours)}${countCell('m', UI.minutes)}${countCell('s', UI.seconds)}</ol><p class="vw-count__done" data-count-done hidden></p></div>`,
    photos, lead, ratio,
    photoBtn: (g, i, sizes = '(max-width: 700px) 46vw, 320px', cls = '') => `<button type="button" class="vw-ph ${cls}" data-lb-idx="${i}" aria-label="${esc(g.alt ? `Open photo: ${g.alt}` : 'Open photo')}">${imgTag(g.photo, g.alt, sizes)}</button>`,
    families: isPair ? ['bride', 'groom'].map((k) => ({ key: k, person: c[k], photo: S.img(`families.${k}`) })) : [],
    hosts: filled(config.hosts) ? config.hosts : null,
    events: evs, story, live, stays, contacts, hasInfo,
    travel: filled(info.travel) ? info.travel : null,
    rsvpForm,
    deadline: filled(config.rsvp?.deadline) ? config.rsvp.deadline : null,
    calendarBtn: (cls = '') => `<button class="vw-btn ${cls}" type="button" id="add-calendar">${UI.calendar}</button>`,
    shareBtn: (cls = 'vw-btn--line') => `<button class="vw-btn ${cls}" type="button" id="share">${UI.shareIt}</button>`,
    cardBtn: (cls = '') => `<button class="vw-btn ${cls}" type="button" data-open-card>${bi(txt('card.button'))}</button>`,
    mapLink: (ev, cls = 'vw-link') => `<a class="${cls}" href="${esc(ev.map)}" target="_blank" rel="noopener">${UI.directions}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a>`,
    swatches: (ev) => (ev.dress?.colors.length ? `<span class="vw-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''),
    orderList: (ev, cls = 'vw-order') => (ev.order.length ? `<details class="${cls}"><summary>${UI.order}</summary><ol>${ev.order.map((r) => `<li><span class="vw-order__t">${esc(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''),
    cue: (to) => `<a class="vw-cue" id="cue" href="#${to}"><span>${UI.scroll}</span><i aria-hidden="true"></i></a>`,
    /** travel, stays and questions as plain blocks (a design may lay them out itself from P.travel/stays/contacts) */
    infoBlocks: (cls = '') => `<div class="vw-info ${cls}">
        ${P.travel ? `<div class="vw-info__b"><h3>${UI.travel}</h3><p>${bi(P.travel)}</p></div>` : ''}
        ${stays.length ? `<div class="vw-info__b"><h3>${UI.stays}</h3><ul>${stays.map((st) => `<li><b>${bi(st.name)}</b>${filled(st.note) ? `<small>${bi(st.note)}</small>` : ''}<a class="vw-link" href="${esc(mapUrl(st.mapQuery || pair(st.name).en))}" target="_blank" rel="noopener">${UI.map}<span aria-hidden="true"> ↗</span></a></li>`).join('')}</ul></div>` : ''}
        ${contacts.length ? `<div class="vw-info__b"><h3>${UI.contacts}</h3><ul>${contacts.map((pp) => `<li><b>${bi(pp.name)}</b>${filled(pp.role) ? `<small>${bi(pp.role)}</small>` : ''}<span class="vw-links"><a class="vw-link" href="tel:${esc(tel(pp.phone))}">${UI.call}</a><a class="vw-link" href="sms:${esc(tel(pp.phone))}">${UI.text}</a></span></li>`).join('')}</ul></div>` : ''}
      </div>`,
    liveBlock: (cls = '') => (live ? `<div class="vw-live ${cls}"><p class="vw-live__line">${bi(txt('live.line'))}</p><a class="vw-btn vw-btn--line" href="${esc(live)}" target="_blank" rel="noopener">${UI.watch}<span aria-hidden="true"> ↗</span></a></div>` : ''),
    madeWith,
  };
  const ctx = {
    T, config, c, S, txt, bi, esc, pair, on, names, namesText, initials, isPair, occasion, D, span, venue, city, mainEv, lead, imgTag, photoUrl, reduced,
    parts: P, gsap, ScrollTrigger, closing: filled(config.closing) ? config.closing : null, hashtag: c.hashtag || '',
  };

  // ───────── markup ─────────
  document.body.classList.add('vw', `theme-${T.slug}`);
  document.body.dataset.occasion = occasion;
  if (!isPair) document.body.classList.add('vw-single');
  const main = document.getElementById('main');
  const GATE = `
  <div class="vw-gate" id="gate" role="dialog" aria-modal="true" aria-label="${esc(`${namesText}: ${txt('gate.line').en || 'invitation'}`)}">
    <div class="vw-gate__scene" id="gscene">${T.gate(ctx)}</div>
    ${T.ownButtons ? '' : `<div class="vw-gate__ui" id="gui">
      ${on(txt('gate.line')) ? `<p class="vw-gate__line">${bi(txt('gate.line'))}</p>` : ''}
      <button class="vw-btn vw-btn--open" id="open" type="button" disabled>${bi(txt('gate.open'))}</button>
      <button class="vw-quiet" id="quiet" type="button" disabled>${bi(txt('gate.quiet'))}</button>
    </div>`}
  </div>`;
  const inv = config.invitation || {};
  const DIALOGS = `
  <div class="vw-modal" id="cardmodal" hidden role="dialog" aria-modal="true" aria-labelledby="cm-title" data-lenis-prevent>
    <div class="vw-modal__panel">
      <button class="vw-modal__x" type="button" data-close><span aria-hidden="true">×</span><span class="sr-only">${UI.close}</span></button>
      ${filled(inv.salutation) ? `<p class="vw-modal__kicker">${bi(inv.salutation)}</p>` : ''}
      <h2 class="vw-modal__title" id="cm-title">${names()}</h2>
      ${filled(inv.body) ? `<p class="vw-modal__p">${bi(inv.body)}</p>` : ''}
      ${filled(inv.request) ? `<p class="vw-modal__p">${bi(inv.request)}</p>` : ''}
      <dl class="vw-modal__when">
        <div><dt>${UI.date}</dt><dd>${esc(D.long)}${D.time ? `<br />${esc(`${D.time}${D.zone ? ` ${D.zone}` : ''}`)}` : ''}</dd></div>
        ${venue || city ? `<div><dt>${UI.place}</dt><dd>${esc([venue, city].filter(Boolean).join(', '))}</dd></div>` : ''}
      </dl>
      ${filled(inv.signoff) || P.hosts ? `<p class="vw-modal__sign">${filled(inv.signoff) ? bi(inv.signoff) : ''}${P.hosts ? `<br /><b>${bi(P.hosts)}</b>` : ''}</p>` : ''}
    </div>
  </div>
  <div class="vw-lb" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photo" data-lenis-prevent>
    <button type="button" class="vw-lb__btn vw-lb__x" data-lb="close"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <button type="button" class="vw-lb__btn vw-lb__prev" data-lb="prev"><span aria-hidden="true">←</span><span class="sr-only">Previous</span></button>
    <figure class="vw-lb__fig"><img alt="" decoding="async" /></figure>
    <button type="button" class="vw-lb__btn vw-lb__next" data-lb="next"><span aria-hidden="true">→</span><span class="sr-only">Next</span></button>
  </div>`;
  main.innerHTML = GATE + T.page(ctx) + DIALOGS;

  // ───────── shell (music), RSVP, dialogs ─────────
  const { player } = mountShell({ chapters: [] });
  document.getElementById('lang-toggle')?.remove(); // English only
  root.dataset.lang = 'en'; root.lang = 'en';
  const skip = document.querySelector('a.skip');
  if (skip && !document.getElementById('rsvp')) skip.remove();
  if (document.getElementById('rsvp-form')) initRsvp(events);
  document.getElementById('add-calendar')?.addEventListener('click', () => downloadIcs(events));
  document.getElementById('share')?.addEventListener('click', (e) => share(e.currentTarget));

  const modal = document.getElementById('cardmodal');
  let closeModal = null;
  const hideModal = () => {
    if (!closeModal) return;
    const done = closeModal; closeModal = null;
    modal.classList.remove('is-open');
    setTimeout(() => { modal.hidden = true; }, 260);
    done();
  };
  document.querySelectorAll('[data-open-card]').forEach((b) => b.addEventListener('click', () => {
    closeModal = openModal(modal, { scroller: modal, onClose: hideModal });
    requestAnimationFrame(() => modal.classList.add('is-open'));
  }));
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) hideModal(); });

  (function lightbox() {
    const lb = document.getElementById('lightbox');
    const im = lb.querySelector('img');
    let i = 0; let release = null;
    const show = (k) => { i = (k + photos.length) % photos.length; im.src = photoUrl(photos[i].photo, 'lg'); im.alt = photos[i].alt || ''; };
    const close = () => {
      if (!release) return;
      const r = release; release = null;
      lb.classList.remove('is-open');
      setTimeout(() => { lb.hidden = true; }, 260);
      r();
    };
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lb-idx]');
      if (!b || !photos.length) return;
      show(Number(b.dataset.lbIdx));
      release = openModal(lb, { onClose: close });
      requestAnimationFrame(() => lb.classList.add('is-open'));
    });
    lb.addEventListener('click', (e) => {
      const act = e.target.closest('[data-lb]')?.dataset.lb;
      if (act === 'close' || e.target === lb) close();
      else if (act === 'prev') show(i - 1);
      else if (act === 'next') show(i + 1);
    });
    lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }());

  // ───────── countdown ─────────
  (function countdowns() {
    const boxes = [...document.querySelectorAll('[data-countdown]')];
    if (!boxes.length || !Number.isFinite(target)) return;
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const ms = target - Date.now();
      const s0 = Math.max(0, Math.floor(ms / 1000));
      const v = { d: Math.floor(s0 / 86400), h: Math.floor((s0 % 86400) / 3600), m: Math.floor((s0 % 3600) / 60), s: s0 % 60 };
      for (const box of boxes) {
        if (ms <= 0) {
          box.classList.add('is-done');
          const done = box.querySelector('[data-count-done]');
          if (done) { done.hidden = false; done.innerHTML = Date.now() - target < 86400000 ? bi(txt('count.done')) : esc(UI.past); }
          box.querySelectorAll('.vw-count__grid, [data-count-grid]').forEach((g) => { g.hidden = true; });
          continue;
        }
        box.querySelectorAll('[data-u]').forEach((el) => { el.textContent = el.dataset.u === 'd' ? String(v.d) : pad(v[el.dataset.u]); });
      }
      return ms > 0;
    };
    if (tick()) setInterval(tick, 1000);
  }());

  // ───────── the opening ─────────
  const gate = document.getElementById('gate');
  const openBtn = document.getElementById('open');
  const quietBtn = document.getElementById('quiet');
  const hero = document.getElementById('top');
  document.body.classList.add('vw-locked');
  window.scrollTo(0, 0);
  let opened = false; let finished = false; let lenis = null; let tl = null; let safety = 0;
  T.ready?.(ctx);
  if (openBtn) openBtn.disabled = false;
  if (quietBtn) quietBtn.disabled = false;
  document.body.classList.add('is-ready');

  function revealOnScroll() {
    const els = document.querySelectorAll('.vw-rise');
    if (reduced) { els.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => io.observe(el));
  }
  function afterOpen() {
    if (finished) return;
    finished = true;
    clearTimeout(safety);
    if (gate) gate.hidden = true;
    document.body.classList.remove('vw-locked', 'is-opening');
    document.body.classList.add('is-open');
    lenis = createSmooth();
    ctx.lenis = () => lenis;
    revealOnScroll();
    T.scroll?.(ctx);
    ScrollTrigger.refresh();
    document.getElementById('cue')?.addEventListener('click', (e) => {
      e.preventDefault();
      const to = document.querySelector(e.currentTarget.getAttribute('href')) || hero?.nextElementSibling;
      if (!to) return;
      const y = to.getBoundingClientRect().top + window.scrollY;
      if (lenis) lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    });
  }
  /** the hero's pieces (.vw-in) settle in, a few at a time; then the scroll cue */
  function heroIntro(t) {
    const ins = hero ? [...hero.querySelectorAll('.vw-in')] : [];
    if (reduced) {
      tl.fromTo(ins, { opacity: 0 }, { opacity: 1, duration: 0.5 }, t).fromTo('#cue', { opacity: 0 }, { opacity: 1, duration: 0.4 }, t + 0.2);
      return;
    }
    gsap.set(ins, { opacity: 0 });
    ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * 0.12));
    tl.fromTo('#cue', { opacity: 0 }, { opacity: 1, duration: 0.6 }, t + ins.length * 0.12 + 0.2);
  }
  function open(withMusic) {
    if (opened) return;
    opened = true;
    try { player.unlock(); player.start(withMusic); } catch { /* audio is optional */ }
    document.body.classList.add('is-opening');
    tl = gsap.timeline({ onComplete: afterOpen });
    if (reduced) {
      tl.to(gate, { autoAlpha: 0, duration: 0.5 }, 0);
      heroIntro(0.3);
    } else {
      if (document.getElementById('gui')) tl.to('#gui', { autoAlpha: 0, y: 10, duration: 0.4, ease: 'power2.out' }, 0);
      const t = T.open(ctx, tl, gate) ?? tl.duration();
      heroIntro(t);
    }
    safety = setTimeout(() => { if (!finished) tl.progress(1); }, (tl.duration() + 2.5) * 1000);
  }
  openBtn?.addEventListener('click', () => open(true));
  quietBtn?.addEventListener('click', () => open(false));
  T.gateTap?.(ctx, () => open(true));

  // ───────── debug hook (screenshots) and ?open (the studio skips the opening) ─────────
  const api = {
    gsap, ctx,
    open: () => open(false),
    at: (t) => { if (!opened) open(false); clearTimeout(safety); tl.pause(); tl.seek(t, false); return tl.duration(); },
    finish: () => { if (!opened) open(false); clearTimeout(safety); tl.progress(1); },
    to: (sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
      document.querySelectorAll('.vw-rise').forEach((n) => n.classList.add('is-in'));
      ScrollTrigger.update();
    },
  };
  if (DEBUG) { window.__vw = api; window.__su = api; }
  if (params.has('open')) api.finish();
}
