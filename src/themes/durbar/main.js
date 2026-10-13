// Durbar (दरबार) · Bhaktapur Durbar Square
// A 3D walk through Bhaktapur's royal square on a bright wedding morning. Scroll
// glides the camera from the lane outside the lion gate into the square, up to
// the Nyatapola's stair (names and date), along the palace of 55 windows where
// the couple's portraits hang in gilt frames, and to a landmark for each
// ceremony; then a crane up over the roofs into the RSVP on white.
// Reduced motion and devices without WebGL get the same invitation as calm
// sections with real photographs of the square.
import '../../core/base.css';
import './durbar.css';
import { loadInvitation } from '../../core/data.js';
import { photoUrl } from '../../photos.js';
import { bi, biNodes, esc, dateOf, timeRange, mapUrl, neNum, bsDateOf } from '../../core/i18n.js';
import { mountShell, ringBell } from '../../core/shell.js';
import { createSmooth, reducedMotion, isMobile } from '../../core/smooth.js';
import { renderFinale, guestEvents } from '../../core/finale.js';
import credits from '../../generated/credits.json';
import { useSlots } from '../../core/slots.js';
import { openModal } from '../../core/modal.js';
import manifest from './slots.js';

loadInvitation().then((config) => run(config));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

function run(config) {
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion() || params.has('still');
const mobile = isMobile();
let STILL = reduced || !hasWebGL();
const c = config.couple;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const NE_ORD = ['पहिलो', 'दोस्रो', 'तेस्रो', 'चौथो', 'पाँचौँ', 'छैटौँ', 'सातौँ'];

if (DEBUG && params.get('slots') === 'test') {
  config.themeContent = { ...(config.themeContent || {}), durbar: {
    images: { 'frame.2': 'garden-pavilion', 'still.names': 'bhaktapur-square' },
    texts: { 'gate.line': { en: 'Join us under the five roofs', ne: 'पाँचतले मन्दिरमुनि हामीसँगै हुनुहोस्' }, 'frame.line.1': { en: 'Hello from Bhaktapur.', ne: 'भक्तपुरबाट नमस्ते।' } },
  } };
}
const slots = useSlots(manifest);
const T = (id) => bi(slots.txt(id));
document.body.classList.toggle('is-still', STILL);

// ───────────────────────── Content ─────────────────────────
// Portraits: frame.1–5 (the couple's photos, at least three, up to five), then bride and groom.
const overImg = config.themeContent?.durbar?.images || {};
const portraitN = (c.portraits || []).filter((p) => p?.photo).length;
const frameN = Math.max(3, Math.min(5, portraitN));
const framePhotos = [];
for (let k = 1; k <= 5; k++) {
  const id = `frame.${k}`;
  if (k > frameN && !overImg[id]) continue;
  const ref = slots.img(id);
  if (!ref) continue;
  const alt = overImg[id] ? slots.alt(id) : (c.portraits?.[(k - 1) % Math.max(portraitN, 1)]?.alt || slots.alt(id));
  framePhotos.push({ photo: ref, alt, line: `frame.line.${k}` });
}
for (const who of ['bride', 'groom']) {
  const id = `frame.${who}`;
  if (c[who]?.photo || overImg[id]) framePhotos.push({ photo: slots.img(id), alt: c[who]?.name?.en || slots.alt(id), line: `frame.line.${who}` });
}
framePhotos.splice(7);

const events = guestEvents();
const KNOWN = { mehendi: 'mandap', haldi: 'shikhara', wedding: 'gate', reception: 'bhairab' };
const SPOTS = ['mandap', 'shikhara', 'gate', 'bhairab'];
const used = new Set(events.map((e) => KNOWN[e.id]).filter(Boolean));
const free = SPOTS.filter((s) => !used.has(s));
const spotOf = new Map();
events.forEach((e) => { const s = KNOWN[e.id] || free.shift(); if (s) spotOf.set(e, s); });
const STILL_SLOT = { mandap: 'still.mandap', shikhara: 'still.shikhara', gate: 'still.gate', bhairab: 'still.bhairab' };

const stations = [
  { kind: 'arrival', id: 'arrival', hold: 0.55, travel: 1.5, layout: 'bottom', still: 'still.arrival' },
  { kind: 'names', id: 'names', hold: 1.0, travel: 1.3, layout: 'left', still: 'still.names' },
];
framePhotos.forEach((f, i) => stations.push({ kind: 'frame', id: `frame-${i}`, index: i, hold: 0.5, travel: i === framePhotos.length - 1 ? 1.3 : 0.6, layout: i % 2 ? 'right' : 'left', photo: f }));
let side = 0;
events.forEach((e, n) => {
  const spot = spotOf.get(e);
  if (!spot) return;
  const wed = e.id === 'wedding' || spot === 'gate';
  stations.push({ kind: 'spot', id: `ev-${e.id}`, spot, event: e, n, wed, hold: wed ? 1.0 : 0.75, travel: 1.3, layout: side++ % 2 ? 'left' : 'right', still: STILL_SLOT[spot] });
});
stations.push({ kind: 'finale', id: 'finale', hold: 0, travel: 0, layout: 'none' });

// ───────────────────────── Markup ─────────────────────────
const firstSpot = stations.find((s) => s.kind === 'spot');
const wedSt = stations.find((s) => s.wed);
const chapterDefs = [
  { label: { en: 'Arrival', ne: 'आगमन' }, at: 'arrival' },
  { label: { en: 'The two of us', ne: 'हामी दुई' }, at: 'names' },
  { label: { en: 'Portraits', ne: 'तस्बिर' }, at: 'frame-0' },
  { label: { en: 'Ceremonies', ne: 'कार्यक्रम' }, at: firstSpot?.id },
  { label: { en: 'Wedding day', ne: 'विवाह' }, at: wedSt?.id },
  { label: { en: 'RSVP', ne: 'जवाफ' }, at: 'rsvp' },
].filter((d, i, a) => d.at && (d.at === 'rsvp' || stations.some((s) => s.id === d.at)) && a.findIndex((x) => x.at === d.at) === i);
const { player, setChapter } = mountShell({ chapters: chapterDefs.map((d) => d.label) });

const names = `<span class="d-name">${bi(c.bride.name)}</span> <span class="d-amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span> <span class="d-name">${bi(c.groom.name)}</span>`;
const bsMain = bsDateOf(config.weddingDate, config.weddingDateBS);
const stillFig = (id, extra = '') => {
  const ref = slots.img(id);
  if (!ref) return '';
  return `<figure class="d-still ${extra}"><img src="${esc(photoUrl(ref, 'sm'))}" srcset="${esc(photoUrl(ref, 'sm'))} 1280w, ${esc(photoUrl(ref, 'lg'))} 2560w" sizes="(max-width: 760px) 100vw, 60vw" alt="${esc(slots.alt(id))}" loading="${STILL ? 'eager' : 'lazy'}" decoding="async" /></figure>`;
};
const coupleFig = (f) => `<figure class="d-still d-still--couple"><img src="${esc(photoUrl(f.photo, 'sm'))}" srcset="${esc(photoUrl(f.photo, 'sm'))} 1280w, ${esc(photoUrl(f.photo, 'lg'))} 2560w" sizes="(max-width: 760px) 100vw, 50vw" alt="${esc(f.alt)}" loading="${STILL ? 'eager' : 'lazy'}" decoding="async" /></figure>`;

function eventCard(st) {
  const e = st.event;
  const bs = bsDateOf(e.start, e.dateBS);
  const label = st.wed ? T('wedding.kicker') : `${bi({ en: `${slots.txt('events.kicker').en} ${ROMAN[st.n] || st.n + 1}`, ne: `${NE_ORD[st.n] || ''} ${slots.txt('events.kicker').ne}` })}`;
  const rituals = st.wed && e.rituals?.length ? `
    <details class="d-prog-wrap" ${mobile ? '' : 'open'}>
      <summary>${bi({ en: 'Programme of the day', ne: 'दिनभरको कार्यक्रम' })}</summary>
      <ol class="d-prog" aria-label="Programme">
        ${e.rituals.map((r) => `<li><span class="d-prog__t">${bi(typeof r.time === 'string' ? { en: r.time, ne: neNum(r.time) } : r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}
      </ol>
    </details>` : '';
  const dress = e.dress?.colors?.length ? `<div class="d-row"><dt>${bi({ en: 'Wear', ne: 'पहिरन' })}</dt><dd class="d-dress"><span class="d-dress__sw" aria-hidden="true">${e.dress.colors.map((x) => `<i style="background:${esc(x)}"></i>`).join('')}</span>${bi(e.dress.text || { en: '', ne: '' })}</dd></div>` : '';
  return `
    <article class="d-card ${st.wed ? 'd-card--wed' : ''}" aria-labelledby="t-${esc(e.id)}">
      <p class="d-eyebrow">${label}</p>
      <h2 class="d-title" id="t-${esc(e.id)}">${bi(e.title)}</h2>
      <dl class="d-facts">
        <div class="d-row"><dt>${bi({ en: 'Date', ne: 'मिति' })}</dt><dd><b>${bi(dateOf(e.start))}</b><span class="d-bs">${bi(bs)}</span></dd></div>
        <div class="d-row"><dt>${bi({ en: 'Time', ne: 'समय' })}</dt><dd>${bi(timeRange(e.start, e.end))}</dd></div>
        <div class="d-row"><dt>${bi({ en: 'Venue', ne: 'स्थान' })}</dt><dd>${bi(e.venue)}<a class="d-map" href="${esc(mapUrl(e.mapQuery))}" target="_blank" rel="noopener">${bi({ en: 'Open map', ne: 'नक्सा हेर्नुहोस्' })}<span aria-hidden="true"> ↗</span></a></dd></div>
        ${dress}
      </dl>
      ${rituals}
    </article>`;
}

function stationMarkup(st, i) {
  let inner = '';
  let still = st.still ? stillFig(st.still) : '';
  if (st.kind === 'arrival') {
    inner = `
      <div class="d-arrive">
        <p class="d-arrive__line">${T('arrival.line')}</p>
        <p class="d-cue" aria-hidden="true"><span>${T('arrival.cue')}</span><i></i></p>
      </div>`;
  } else if (st.kind === 'names') {
    inner = `
      <div class="d-card d-card--hero">
        <p class="d-eyebrow">${T('hero.kicker')}</p>
        <h1 class="d-names" id="hero-names">${names}</h1>
        <p class="d-hero__date"><b>${bi(dateOf(config.weddingDate))}</b><span>${bi(bsMain)}</span><span>${bi(config.city)}</span></p>
        <button type="button" class="d-btn d-btn--ghost" data-open="card">${T('card.button')}</button>
      </div>`;
  } else if (st.kind === 'frame') {
    still = coupleFig(st.photo);
    inner = `
      <figure class="d-card d-card--note">
        <p class="d-eyebrow">${T('frame.title')}</p>
        <figcaption class="d-note">${T(st.photo.line)}</figcaption>
        <p class="sr-only">${esc(st.photo.alt)}</p>
        <button type="button" class="d-link" data-photo="${st.index}">${bi({ en: 'View photograph', ne: 'तस्बिर हेर्नुहोस्' })}</button>
      </figure>`;
  } else if (st.kind === 'spot') {
    inner = eventCard(st);
  }
  if (!inner) return '';
  return `<section class="d-st d-st--${st.kind} is-${st.layout}" data-st="${i}" id="st-${esc(st.id)}" aria-hidden="true">${still}<div class="d-st__inner">${inner}</div></section>`;
}

const main = document.getElementById('main');
main.innerHTML = `
  <div class="d-stations">${stations.map(stationMarkup).join('')}</div>
  <div class="d-journey" id="journey" aria-hidden="true"></div>
  <div class="d-modal" id="card-dialog" hidden role="dialog" aria-modal="true" aria-labelledby="card-title" data-lenis-prevent>
   <div class="d-modal__scroll">
    <div class="d-letter">
      <button type="button" class="d-close" data-close><span aria-hidden="true">×</span><span class="sr-only">${bi({ en: 'Close', ne: 'बन्द' })}</span></button>
      <p class="d-letter__ganesh" lang="sa">॥ श्री गणेशाय नमः ॥</p>
      <p class="d-letter__shloka" lang="sa">${esc(config.invitation.shloka.sa)}</p>
      <p class="d-letter__shloka-en">${esc(config.invitation.shloka.en)}</p>
      <h2 class="d-letter__title" id="card-title">${T('card.title')}</h2>
      <p>${bi(config.invitation.salutation)}</p>
      <p>${bi(config.invitation.body)}</p>
      <p>${bi(config.invitation.request)}</p>
      <dl class="d-letter__fam">
        <div><dt>${bi({ en: 'The bride', ne: 'दुलही' })}</dt><dd>${bi(c.bride.fullName)}<small>${bi(c.bride.parents)}</small></dd></div>
        <div><dt>${bi({ en: 'The groom', ne: 'दुलहा' })}</dt><dd>${bi(c.groom.fullName)}<small>${bi(c.groom.parents)}</small></dd></div>
      </dl>
      <p class="d-letter__sign">${bi(config.invitation.signoff)}<br /><b>${bi(config.hosts)}</b></p>
    </div>
   </div>
  </div>
  <div class="d-modal d-modal--photo" id="photo-dialog" hidden role="dialog" aria-modal="true" aria-label="Photograph" data-lenis-prevent>
   <div class="d-modal__scroll">
    <button type="button" class="d-close" data-close><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <img alt="" decoding="async" />
   </div>
  </div>`;

// Gate: guest name, names, date and the way in, over the lane outside the lion gate.
const gate = document.getElementById('gate');
gate.classList.add('d-gate');
gate.innerHTML = `
  <div class="d-gate__card">
    <p class="d-eyebrow d-gate__guest" id="gate-guest" hidden></p>
    <p class="d-eyebrow">${T('gate.kicker')}</p>
    <p class="d-gate__names">${names}</p>
    <p class="d-gate__date">${bi(dateOf(config.weddingDate))}</p>
    <p class="d-gate__line">${T('gate.line')}</p>
    <div class="loading-bar" aria-hidden="true"><i id="load-bar"></i></div>
    <div class="gate__choices">
      <button type="button" class="d-btn" id="enter-music" disabled>${T('gate.enter')}</button>
      <button type="button" class="gate__quiet" id="enter-quiet" disabled>${T('gate.quiet')}</button>
    </div>
  </div>`;
const to = params.get('to');
if (to) {
  const el = document.getElementById('gate-guest');
  el.replaceChildren(...biNodes(`Dear ${to.slice(0, 60)}`, `आदरणीय ${to.slice(0, 60)}`));
  el.hidden = false;
}

// Gallery leads with the couple; ritual close-ups follow as accents; no narrative captions.
{
  const seen = new Set();
  const port = (c.portraits || []).filter((p) => p?.photo).map((p) => ({ photo: p.photo, alt: p.alt || '', shape: 'land' }));
  const accent = (g) => /mehendi|haldi|sindoor|marigold|diyo|lamps|knot|hands|feet/i.test(`${g.photo} ${g.alt}`);
  const rest = (config.gallery || []).filter((g) => !accent(g));
  const acc = (config.gallery || []).filter(accent);
  config.gallery = [...port.filter((g) => !accent(g)), ...rest, ...port.filter(accent), ...acc]
    .filter((g) => { const k = typeof g.photo === 'string' ? g.photo : JSON.stringify(g.photo); if (seen.has(k)) return false; seen.add(k); return true; })
    .map(({ caption, ...g }) => g);
}
renderFinale(document.getElementById('finale-root'), { credits });
{
  const gt = document.getElementById('gallery-title');
  if (gt) gt.innerHTML = T('gallery.title');
  const rt = document.getElementById('rsvp-title');
  if (rt) rt.innerHTML = T('reply.title');
}
// Gallery: an uncropped masonry of whole photos, filled shortest-column first.
{
  const track = document.querySelector('.gallery__track');
  const items = track ? [...track.querySelectorAll('.gallery__item')] : [];
  let lastCols = 0;
  const ratio = (li) => { const im = li.querySelector('img'); return im && im.naturalWidth ? im.naturalHeight / im.naturalWidth : 1; };
  const lay = (force) => {
    if (!track) return;
    const cols = window.innerWidth <= 760 ? 2 : 3;
    if (!force && cols === lastCols) return;
    lastCols = cols;
    const lists = [], heights = [];
    track.replaceChildren();
    for (let k = 0; k < cols; k++) {
      const li = document.createElement('li');
      li.className = 'd-gcol';
      const ul = document.createElement('ul');
      ul.className = 'd-gcol__list';
      li.append(ul);
      track.append(li);
      lists.push(ul); heights.push(0);
    }
    items.forEach((it) => { const k = heights.indexOf(Math.min(...heights)); lists[k].append(it); heights[k] += ratio(it) + 0.08; });
  };
  lay(true);
  let t;
  items.forEach((it) => it.querySelector('img')?.addEventListener('load', () => { clearTimeout(t); t = setTimeout(() => lay(true), 120); }, { once: true }));
  window.addEventListener('resize', () => lay(false));
}

// ───────────────────────── Dialogs ─────────────────────────
const cardDialog = document.getElementById('card-dialog');
const photoDialog = document.getElementById('photo-dialog');
let closeModal = null;
const showModal = (el) => {
  if (closeModal) closeModal();
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-open'));
  closeModal = openModal(el, { scroller: el.querySelector('.d-modal__scroll'), onClose: () => { el.classList.remove('is-open'); el.hidden = true; closeModal = null; } });
};
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-open="card"]')) showModal(cardDialog);
  const pb = e.target.closest('[data-photo]');
  if (pb) {
    const ph = framePhotos[Number(pb.dataset.photo)];
    const im = photoDialog.querySelector('img');
    im.src = photoUrl(ph.photo, 'lg');
    im.alt = ph.alt;
    showModal(photoDialog);
  }
  if (e.target.closest('[data-close]')) closeModal?.();
});
for (const d of [cardDialog, photoDialog]) d.addEventListener('click', (e) => { if (e.target.classList.contains('d-modal__scroll')) closeModal?.(); });

// ───────────────────────── Scroll → stations ─────────────────────────
const journey = document.getElementById('journey');
const stEls = [...document.querySelectorAll('.d-st')];
let unit = Math.max(560, window.innerHeight);
let segs = [];
function layoutJourney() {
  unit = Math.max(560, window.innerHeight);
  let y = 0;
  segs = stations.map((s) => {
    const seg = { y0: y, hold: s.hold * unit, travel: s.travel * unit };
    y += seg.hold + seg.travel;
    return seg;
  });
  journey.style.height = STILL ? '0px' : `${y + unit * 0.4}px`;
}
layoutJourney();

function readScroll() {
  const y = (window.scrollY || 0) - journey.offsetTop;
  let i = 0;
  while (i < segs.length - 1 && y >= segs[i + 1].y0) i++;
  const s = segs[i];
  const local = y - s.y0;
  if (local <= s.hold || !s.travel) return { i, hold: s.hold ? Math.min(1, Math.max(0, local / s.hold)) : 1, f: 0 };
  return { i, hold: 1, f: Math.min(1, (local - s.hold) / s.travel) };
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

let lastChapter = -1;
function updateOverlays(r) {
  if (STILL) return;
  stEls.forEach((el) => {
    const k = Number(el.dataset.st);
    let v = 0;
    if (k === r.i) v = 1 - sstep(0, 0.3, r.f);
    else if (k === r.i + 1) v = sstep(0.72, 1, r.f);
    if (!started) v = 0;
    el.style.opacity = v.toFixed(3);
    el.style.transform = `translate3d(0, ${((1 - v) * 14).toFixed(1)}px, 0)`;
    const on = v > 0.55;
    if (el.classList.contains('is-on') !== on) {
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-hidden', String(!on));
      el.inert = !on;
    }
    el.style.visibility = v < 0.01 ? 'hidden' : 'visible';
  });
  const cur = stations[Math.min(stations.length - 1, r.f > 0.5 ? r.i + 1 : r.i)];
  let ch = 0;
  chapterDefs.forEach((d, k) => { const idx = stations.findIndex((s) => s.id === d.at); if (idx >= 0 && idx <= stations.indexOf(cur)) ch = k; });
  if (window.scrollY > journey.offsetTop + journey.offsetHeight - unit * 0.6) ch = chapterDefs.length - 1;
  if (ch !== lastChapter) { setChapter(ch); lastChapter = ch; }
}

// ───────────────────────── 3D square ─────────────────────────
const canvas = document.getElementById('stage');
const bar = document.getElementById('load-bar');
const setBar = (v) => { if (bar) bar.style.transform = `scaleX(${v})`; };
let square = null;
let started = false;
let lenis = null;

async function boot() {
  if (STILL) throw new Error('still mode');
  const lowPower = (DEBUG && !params.has('hq')) || (navigator.hardwareConcurrency || 8) <= 4;
  const { createSquare } = await import('./square.js');
  square = await createSquare(canvas, {
    mobile, lowPower, reduced, debug: DEBUG,
    frames: framePhotos.map((f) => ({ url: photoUrl(f.photo, mobile ? 'sm' : 'lg') })),
    onProgress: setBar,
  });
  square.setStations(stations);
  square.setIntro(params.has('station') ? 0 : 1);
  square.start();
  document.body.classList.add('is-ready');
  document.querySelectorAll('.gallery img').forEach((im) => { im.loading = 'eager'; });
  document.getElementById('enter-music').disabled = false;
  document.getElementById('enter-quiet').disabled = false;
  if (params.has('station')) enter(false, true);
}

function frame() {
  const r = readScroll();
  if (square) {
    let p = r.i + r.f;
    if (debugP !== null) p = debugP;
    square.setProgress(p);
  }
  let ro = r;
  if (debugP !== null) ro = { i: Math.floor(debugP), f: debugP % 1, hold: 1 };
  updateOverlays(ro);
  requestAnimationFrame(frame);
}

function enter(withMusic, instant = false) {
  if (started) return;
  started = true;
  try { player.unlock(); ringBell(player.ctx, { gain: 0.16 }); player.start(withMusic); } catch { /* audio optional */ }
  document.body.classList.remove('is-gated');
  document.body.classList.add('is-in');
  gate.classList.add('is-leaving');
  setTimeout(() => { gate.hidden = true; }, instant ? 0 : 900);
  lenis = createSmooth();
  if (square && !instant && !reduced) {
    const t0 = performance.now();
    const D = 3200;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / D);
      square?.setIntro(Math.pow(1 - k, 3));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  } else square?.setIntro(0);
}
document.getElementById('enter-music').addEventListener('click', () => enter(true));
document.getElementById('enter-quiet').addEventListener('click', () => enter(false));

const scrollToY = (y) => (lenis ? lenis.scrollTo(y, { duration: 1.6 }) : window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' }));
document.querySelector('.chapters')?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-chapter]');
  if (!b) return;
  const d = chapterDefs[Number(b.dataset.chapter)];
  if (d.at === 'rsvp') { scrollToY(document.getElementById('rsvp').getBoundingClientRect().top + window.scrollY); return; }
  const i = stations.findIndex((s) => s.id === d.at);
  if (STILL) { const el = document.getElementById(`st-${d.at}`); if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY - 40); return; }
  scrollToY(journey.offsetTop + segs[i].y0 + segs[i].hold * 0.4);
});
document.querySelector('.d-stations').addEventListener('focusin', (e) => {
  if (STILL) return;
  const el = e.target.closest('.d-st');
  if (!el || el.classList.contains('is-on')) return;
  const i = Number(el.dataset.st);
  window.scrollTo(0, journey.offsetTop + segs[i].y0 + segs[i].hold * 0.4);
});

let w0 = window.innerWidth;
window.addEventListener('resize', () => {
  square?.resize();
  if (window.innerWidth !== w0) { w0 = window.innerWidth; layoutJourney(); }
});
new IntersectionObserver(([en]) => square?.pause(!en.isIntersecting)).observe(journey);

// ───────────────────────── Debug hook ─────────────────────────
let debugP = null;
if (DEBUG) {
  window.__durbar = {
    stations: stations.map((s) => s.id),
    go(i, f = 0) { const s = segs[i]; window.scrollTo(0, journey.offsetTop + s.y0 + (f ? s.hold + s.travel * f : s.hold * 0.5)); square?.snap?.(); },
    setP(p) { debugP = p; square?.snap?.(); },
    get square() { return square; },
    info: () => square?.info(),
    path: (aspect = innerWidth / innerHeight) => square?.samplePath(aspect),
    enter: () => enter(false, true),
  };
}
const stParam = params.get('station');
if (stParam !== null && !STILL) {
  const i = Math.max(0, Math.min(stations.length - 1, Number(stParam) || 0));
  requestAnimationFrame(() => window.scrollTo(0, journey.offsetTop + segs[i].y0 + segs[i].hold * 0.5));
}

requestAnimationFrame(frame);
boot().catch((err) => {
  if (!STILL) console.error('[durbar] 3D square failed; showing the photographs.', err);
  STILL = true;
  document.body.classList.add('is-still', 'is-ready');
  journey.style.height = '0px';
  document.querySelectorAll('.d-still img').forEach((im) => { im.loading = 'eager'; });
  gate.style.setProperty('--gate-photo', `url("${photoUrl(slots.img('still.arrival'), mobile ? 'sm' : 'lg')}")`);
  stEls.forEach((el) => { el.style.opacity = ''; el.style.visibility = ''; el.style.transform = ''; el.inert = false; el.setAttribute('aria-hidden', 'false'); el.classList.add('is-on'); });
  document.getElementById('enter-music').disabled = false;
  document.getElementById('enter-quiet').disabled = false;
  if (params.has('station')) enter(false, true);
});
}
