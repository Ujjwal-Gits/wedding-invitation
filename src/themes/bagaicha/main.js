// Bagaicha (बगैंचा) · Garden Destination
// A 3D garden venue the guest walks through by scrolling: arrival over the
// reflecting pool, the couple's photographs on easels, each ceremony at its own
// corner of the garden, the vows at the white pavilion, and the reception under
// lanterns at night. The paper-cut couple walk the aisle as the guest scrolls,
// and the light turns from morning to golden hour to lantern night.
import '../../core/base.css';
import './bagaicha.css';
import { loadInvitation } from '../../core/data.js';
import { photoUrl } from '../../photos.js';
import { deviceTier } from './perf.js';
import { bi, biNodes, esc, dateOf, timeLabel, shortDate, mapUrl, neNum, bsDateOf } from '../../core/i18n.js';
import { mountShell, ringBell } from '../../core/shell.js';
import { createSmooth, reducedMotion, isMobile } from '../../core/smooth.js';
import { renderFinale, guestEvents } from '../../core/finale.js';
import { useSlots } from '../../core/slots.js';
import { openModal } from '../../core/modal.js';
import manifest from './slots.js';
import { createMix } from '../../core/mix.js';

// No top-level await: the build targets es2020.
// Another theme's gate may stand over the garden (docs/MIX.md); without config.design nothing changes.
loadInvitation().then((config) => createMix({ host: 'bagaicha', manifest, config }).then((mix) => run(config, mix)));

function run(config, mix) {
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion();
const mobile = isMobile();
const c = config.couple;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const NE_ORD = ['पहिलो', 'दोस्रो', 'तेस्रो', 'चौथो', 'पाँचौँ', 'छैटौँ', 'सातौँ'];

// ?debug&slots=test exercises the studio overrides without touching src/config.js.
if (DEBUG && params.get('slots') === 'test') {
  config.themeContent = { ...(config.themeContent || {}), bagaicha: {
    images: { 'scene.mountains': 'phewa-lake', 'easel.2': 'garden-pavilion' },
    texts: {
      'gate.line': { en: 'Join us by the waterfall this spring', ne: 'यस वसन्तमा झरनाछेउ हामीसँगै हुनुहोस्' },
      'vows.title': { en: 'Seven promises', ne: 'सात वचन' },
      'easel.line.1': { en: 'Walk the garden with us.', ne: 'बगैंचामा हामीसँगै हिँड्नुहोस्।' },
    },
  } };
}
const slots = useSlots(manifest);
const T = (id) => bi(slots.txt(id));

// ───────────────────────── Stations ─────────────────────────
// Easels: the couple's photos through slots easel.1–5 (defaults: their portraits 0–4),
// at least three, up to five; bride/groom easels only when they have their own portraits.
const overImg = config.themeContent?.bagaicha?.images || {};
const portraitN = (c.portraits || []).filter((p) => p?.photo).length;
const easelN = Math.max(3, Math.min(5, portraitN));
const easelPhotos = [];
for (let k = 1; k <= 5; k++) {
  const id = `easel.${k}`;
  if (k > easelN && !overImg[id]) continue;
  const ref = slots.img(id);
  if (!ref) continue;
  const alt = overImg[id] ? slots.alt(id) : (c.portraits?.[(k - 1) % Math.max(portraitN, 1)]?.alt || slots.alt(id));
  easelPhotos.push({ photo: ref, alt, line: `easel.line.${k}` });
}
for (const who of ['bride', 'groom']) {
  const id = `easel.${who}`;
  if (c[who]?.photo || overImg[id]) easelPhotos.push({ photo: slots.img(id), alt: c[who]?.name?.en || slots.alt(id), line: `easel.line.${who}` });
}

const events = guestEvents();
const KNOWN = { mehendi: 'swing', haldi: 'falls', wedding: 'aisle', reception: 'lanterns' };
const free = ['swing', 'falls', 'aisle', 'lanterns'].filter((s) => !events.some((e) => KNOWN[e.id] === s));
const spotOf = new Map();
events.forEach((e) => spotOf.set(e, KNOWN[e.id] || free.shift() || null));

const stations = [{ kind: 'arrival', id: 'arrival', hold: 0.75, travel: 1.0 }];
easelPhotos.forEach((e, i) => stations.push({ kind: 'easel', id: `easel-${i}`, index: i, hold: 0.45, travel: i === easelPhotos.length - 1 ? 1.2 : 0.65, photo: e }));
let side = 0;
let vowsAdded = false;
const addVows = () => { if (!vowsAdded) { stations.push({ kind: 'vows', id: 'vows', hold: 4.2, travel: 1.3, layout: 'left' }); vowsAdded = true; } };
events.forEach((e, k) => {
  const spot = spotOf.get(e);
  if (!spot) return;
  if (spot === 'lanterns') addVows();
  stations.push({ kind: 'spot', id: `ev-${e.id}`, spot, event: e, n: k, hold: 0.7, travel: spot === 'falls' ? 1.3 : 1.1, layout: side++ % 2 ? 'left' : 'right' });
  if (spot === 'aisle') addVows();
});
addVows();
stations.push({ kind: 'finale', id: 'finale', hold: 0, travel: 0 });

// ───────────────────────── Markup ─────────────────────────
const chapterDefs = [
  { label: { en: 'Arrival', ne: 'आगमन' }, at: 'arrival' },
  { label: { en: 'Portraits', ne: 'तस्बिर' }, at: 'easel-0' },
  { label: { en: 'Ceremonies', ne: 'कार्यक्रम' }, at: stations.find((s) => s.kind === 'spot')?.id },
  { label: { en: 'Vows', ne: 'सप्तपदी' }, at: 'vows' },
  { label: { en: 'Reception', ne: 'प्रीतिभोज' }, at: stations.find((s) => s.spot === 'lanterns')?.id },
  { label: { en: 'RSVP', ne: 'जवाफ' }, at: 'rsvp' },
].filter((d) => d.at && (d.at === 'rsvp' || stations.some((s) => s.id === d.at)));
const { player, setChapter } = mountShell({ chapters: chapterDefs.map((d) => d.label) });

const names = `${bi(c.bride.name)} <span class="b-amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span> ${bi(c.groom.name)}`;
const photoBtn = (i) => `<button type="button" class="b-link" data-photo="${i}">${bi({ en: 'View photograph', ne: 'तस्बिर हेर्नुहोस्' })}</button>`;

function eventCard(st) {
  const e = st.event;
  const night = st.spot === 'lanterns';
  const bs = bsDateOf(e.start, e.dateBS);
  const rituals = e.rituals?.length ? `
    <details class="b-more">
      <summary>${bi({ en: 'The programme', ne: 'कार्यक्रम तालिका' })}</summary>
      <ul>${e.rituals.map((r) => `<li><span>${bi(typeof r.time === 'string' ? { en: r.time, ne: r.time } : r.time)}</span>${bi(r.title)}</li>`).join('')}</ul>
    </details>` : '';
  const hasDress = e.dress && ((e.dress.text && (e.dress.text.en || e.dress.text.ne)) || e.dress.colors?.length);
  const dress = hasDress ? `<div><dt>${bi({ en: 'Wear', ne: 'पहिरन' })}</dt><dd class="b-dress">${e.dress.colors?.length ? `<span class="b-dress__sw" aria-hidden="true">${e.dress.colors.map((x) => `<i style="background:${esc(x)}"></i>`).join('')}</span>` : ''}${bi(e.dress.text || { en: '', ne: '' })}</dd></div>` : '';
  // One calm programme: name, weekday + date (AD and B.S.), time, venue with a map, what to wear.
  return `
    <article class="b-card ${night ? 'b-card--night' : ''}" aria-labelledby="t-${esc(e.id)}">
      <p class="b-eyebrow">${bi({ en: `Ceremony ${ROMAN[st.n] || st.n + 1}`, ne: `${NE_ORD[st.n] || ''} कार्यक्रम` })}</p>
      <h2 class="b-title" id="t-${esc(e.id)}">${bi(e.title)}</h2>
      <dl class="b-prog">
        <div><dt>${bi({ en: 'When', ne: 'कहिले' })}</dt><dd><b>${bi(dateOf(e.start))}</b><span class="b-bs">${bi({ en: `${bs.short.en} B.S.`, ne: `वि.सं. ${bs.short.ne}` })}</span><span>${bi(timeLabel(e))}</span></dd></div>
        <div><dt>${bi({ en: 'Where', ne: 'कहाँ' })}</dt><dd>${bi(e.venue)} <a class="b-link" href="${esc(mapUrl(e.mapQuery))}" target="_blank" rel="noopener">${bi({ en: 'Map', ne: 'नक्सा' })}<span aria-hidden="true"> ↗</span></a></dd></div>
        ${dress}
      </dl>
      ${rituals}
    </article>`;
}

function stationMarkup(st, i) {
  let inner = '';
  if (st.kind === 'arrival') {
    inner = `
      <div class="b-hero">
        <p class="b-eyebrow">${T('hero.eyebrow')}</p>
        <h1 class="b-names" id="hero-names">${names}</h1>
        <p class="b-hero__date">${bi(dateOf(config.weddingDate))}<span class="b-dot" aria-hidden="true"></span>${bi(config.city)}</p>
        <button type="button" class="b-btn b-btn--ghost" data-open="card">${T('card.button')}</button>
      </div>
      <p class="b-cue" aria-hidden="true">${T('hero.cue')}</p>`;
  } else if (st.kind === 'easel') {
    const first = st.index === 0;
    inner = `
      <figure class="b-card b-card--note">
        <p class="b-eyebrow">${first ? T('welcome.eyebrow') : T('easel.eyebrow')}</p>
        <figcaption class="b-note">${T(st.photo.line)}</figcaption>
        <p class="sr-only">${esc(st.photo.alt)}</p>
        ${photoBtn(st.index)}
      </figure>`;
  } else if (st.kind === 'spot') {
    inner = eventCard(st);
  } else if (st.kind === 'vows') {
    inner = `
      <article class="b-card b-card--dusk" aria-labelledby="vows-title">
        <p class="b-eyebrow">${T('vows.eyebrow')}</p>
        <h2 class="b-title" id="vows-title">${T('vows.title')}</h2>
        <ol class="b-vows" aria-label="The seven vows">
          ${config.saptapadi.map((v, k) => `<li class="b-vow" data-vow="${k}"><span class="b-vow__n" aria-hidden="true">${bi({ en: String(k + 1), ne: neNum(k + 1) })}</span><span class="b-vow__t">${bi(v)}</span></li>`).join('')}
        </ol>
        <p class="b-steps" aria-hidden="true">${config.saptapadi.map(() => '<i></i>').join('')}</p>
      </article>`;
  }
  if (!inner) return '';
  return `<section class="b-st b-st--${st.kind} is-${st.layout || (st.kind === 'arrival' ? 'top' : 'right')}" data-st="${i}" id="st-${esc(st.id)}" aria-hidden="true">${inner}</section>`;
}

const main = document.getElementById('main');
main.innerHTML = `
  <div class="b-veil" aria-hidden="true"></div>
  <div class="b-stations">${stations.map(stationMarkup).join('')}</div>
  <div class="b-journey" id="journey" aria-hidden="true"></div>
  <div class="b-modal" id="card-dialog" hidden role="dialog" aria-modal="true" aria-labelledby="card-title" data-lenis-prevent>
   <div class="b-modal__scroll">
    <div class="b-letter">
      <button type="button" class="b-dialog__close" data-close><span aria-hidden="true">×</span><span class="sr-only">${bi({ en: 'Close', ne: 'बन्द' })}</span></button>
      <p class="b-letter__ganesh" lang="sa">॥ श्री गणेशाय नमः ॥</p>
      <p class="b-letter__shloka" lang="sa">${esc(config.invitation.shloka.sa)}</p>
      <p class="b-letter__shloka-en">${esc(config.invitation.shloka.en)}</p>
      <h2 class="b-letter__title" id="card-title">${T('card.title')}</h2>
      <p>${bi(config.invitation.salutation)}</p>
      <p>${bi(config.invitation.body)}</p>
      <p>${bi(config.invitation.request)}</p>
      <dl class="b-letter__fam">
        <div><dt>${bi({ en: 'The bride', ne: 'दुलही' })}</dt><dd>${bi(c.bride.fullName)}<small>${bi(c.bride.parents)}</small></dd></div>
        <div><dt>${bi({ en: 'The groom', ne: 'दुलहा' })}</dt><dd>${bi(c.groom.fullName)}<small>${bi(c.groom.parents)}</small></dd></div>
      </dl>
      <p class="b-letter__sign">${bi(config.invitation.signoff)}<br /><b>${bi(config.hosts)}</b></p>
    </div>
   </div>
  </div>
  <div class="b-modal b-modal--photo" id="photo-dialog" hidden role="dialog" aria-modal="true" aria-label="Photograph" data-lenis-prevent>
   <div class="b-modal__scroll">
    <button type="button" class="b-dialog__close" data-close><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <img alt="" decoding="async" />
   </div>
  </div>`;

// Gate: names are already on the arrival overlay; the gate adds the guest's name and the way in.
// Another theme's gate replaces it (mounted below, with the hand-off to the garden's walk in).
const gate = document.getElementById('gate');
if (mix.gate) gate.remove();
else gate.classList.add('b-gate');
if (!mix.gate) gate.innerHTML = `
  <div class="b-gate__inner">
    <p class="b-eyebrow b-gate__guest" id="gate-guest" hidden></p>
    <p class="b-gate__line">${T('gate.line')}</p>
    <div class="loading-bar" aria-hidden="true"><i id="load-bar"></i></div>
    <div class="gate__choices">
      <button type="button" class="b-btn" id="enter-music" disabled>${T('gate.enter')}</button>
      <button type="button" class="gate__quiet" id="enter-quiet" disabled>${T('gate.quiet')}</button>
    </div>
  </div>`;
const to = params.get('to');
if (to && !mix.gate) {
  const el = document.getElementById('gate-guest');
  el.replaceChildren(...biNodes(`Dear ${to.slice(0, 60)}`, `आदरणीय ${to.slice(0, 60)}`));
  el.hidden = false;
}

// Gallery leads with the couple; mehendi and ritual close-ups follow as accents.
{
  const seen = new Set();
  const port = (c.portraits || []).filter((p) => p?.photo).map((p) => ({ photo: p.photo, alt: p.alt || '', shape: 'land' }));
  const accent = (g) => /mehendi|haldi|sindoor|marigold|diyo|lamps|knot|hands|feet/i.test(`${g.photo} ${g.alt}`);
  const rest = (config.gallery || []).filter((g) => !accent(g));
  const acc = (config.gallery || []).filter(accent);
  const lead = port.filter((g) => !accent(g));
  config.gallery = [...lead, ...rest, ...port.filter(accent), ...acc]
    .filter((g) => { const k = typeof g.photo === 'string' ? g.photo : JSON.stringify(g.photo); if (seen.has(k)) return false; seen.add(k); return true; })
    .map(({ caption, ...g }) => g); // library photos carry no narrative captions
}
renderFinale(document.getElementById('finale-root'));
document.getElementById('finale-root').insertAdjacentHTML('afterbegin', '<div class="b-finale-fade" aria-hidden="true"></div>');

// Gallery: a masonry of whole photos, filled in reading order (shortest column first), so the
// couple's photos lead across the top row on every screen.
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
      li.className = 'b-gcol';
      const ul = document.createElement('ul');
      ul.className = 'b-gcol__list';
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
// Overlays lock the page (openModal): only the card scrolls, the garden stays put.
let closeModal = null;
const showModal = (el) => {
  if (closeModal) closeModal();
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-open'));
  closeModal = openModal(el, { scroller: el.querySelector('.b-modal__scroll'), onClose: () => { el.classList.remove('is-open'); el.hidden = true; closeModal = null; } });
};
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-open="card"]')) showModal(cardDialog);
  const pb = e.target.closest('[data-photo]');
  if (pb) {
    const ph = easelPhotos[Number(pb.dataset.photo)];
    const im = photoDialog.querySelector('img');
    im.src = photoUrl(ph.photo, 'lg');
    im.alt = ph.alt;
    showModal(photoDialog);
  }
  if (e.target.closest('[data-close]')) closeModal?.();
});
for (const d of [cardDialog, photoDialog]) d.addEventListener('click', (e) => { if (e.target.classList.contains('b-modal__scroll')) closeModal?.(); });

// ───────────────────────── Scroll → stations ─────────────────────────
const journey = document.getElementById('journey');
const stEls = [...document.querySelectorAll('.b-st')];
const stByIdx = new Map(stEls.map((el) => [Number(el.dataset.st), el]));
const vowEls = [...document.querySelectorAll('.b-vow')];
const stepDots = [...document.querySelectorAll('.b-steps i')];
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
  journey.style.height = `${y + unit}px`;
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
let lastVow = -1;
function updateOverlays(r) {
  if (document.body.classList.contains('no-gl')) return;
  stEls.forEach((el) => {
    const k = Number(el.dataset.st);
    let v = 0;
    if (k === r.i) v = 1 - sstep(0, 0.32, r.f);
    else if (k === r.i + 1) v = sstep(0.68, 1, r.f);
    if (!started) v = k === 0 ? v : 0;
    el.style.opacity = v.toFixed(3);
    el.style.transform = `translate3d(0, ${((1 - v) * 18).toFixed(1)}px, 0)`;
    const on = v > 0.55;
    if (el.classList.contains('is-on') !== on) {
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-hidden', String(!on));
      el.inert = !on;
    }
    el.style.visibility = v < 0.01 ? 'hidden' : 'visible';
  });
  // vows: one promise at a time across the hold
  const vi = stations.findIndex((s) => s.kind === 'vows');
  if (vi >= 0 && vowEls.length) {
    const k = r.i === vi ? Math.min(vowEls.length - 1, Math.max(0, Math.floor(((r.hold - 0.06) / 0.86) * vowEls.length * 0.999))) : r.i < vi ? 0 : vowEls.length - 1;
    if (k !== lastVow) {
      vowEls.forEach((el, j) => el.classList.toggle('is-now', j === k));
      stepDots.forEach((el, j) => el.classList.toggle('is-done', j <= k));
      lastVow = k;
    }
  }
  // chapters
  const cur = stations[Math.min(stations.length - 1, r.f > 0.5 ? r.i + 1 : r.i)];
  let ch = 0;
  chapterDefs.forEach((d, k) => { const idx = stations.findIndex((s) => s.id === d.at); if (idx >= 0 && idx <= stations.indexOf(cur)) ch = k; });
  if (window.scrollY > journey.offsetTop + journey.offsetHeight - unit * 0.6) ch = chapterDefs.length - 1;
  if (ch !== lastChapter) { setChapter(ch); lastChapter = ch; }
}

// ───────────────────────── Garden ─────────────────────────
const canvas = document.getElementById('stage');
const bar = document.getElementById('load-bar');
const setBar = (v) => { if (bar) bar.style.transform = `scaleX(${v})`; };
let garden = null;
let started = false;
let lenis = null;

async function welcomeSign() {
  try { await Promise.all([document.fonts.load('60px Italiana'), document.fonts.load('20px Figtree'), document.fonts.load('600 40px Laila', 'आरती')]); } catch { /* fonts optional */ }
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = 'rgba(176,138,62,0.75)'; g.lineWidth = 3; g.strokeRect(16, 16, 992, 224);
  g.textAlign = 'center';
  g.fillStyle = '#7A5F2A';
  g.font = '500 26px Figtree, sans-serif';
  if ('letterSpacing' in g) g.letterSpacing = '8px';
  const ne = document.documentElement.dataset.lang === 'ne';
  const sign = slots.txt('welcome.sign');
  if (ne) { if ('letterSpacing' in g) g.letterSpacing = '0px'; g.font = '500 32px Laila, serif'; g.fillText(sign.ne, 512, 76); }
  else g.fillText(sign.en.toUpperCase(), 512, 70);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.fillStyle = '#2E3F33';
  g.font = ne ? '600 66px Laila, serif' : '86px Italiana, serif';
  g.fillText(ne ? `${c.bride.name.ne} र ${c.groom.name.ne}` : `${c.bride.name.en} & ${c.groom.name.en}`, 512, 168);
  g.fillStyle = '#6A6250';
  g.font = '500 24px Figtree, sans-serif';
  if (ne) g.font = '400 24px "Noto Sans Devanagari", sans-serif';
  g.fillText(dateOf(config.weddingDate)[ne ? 'ne' : 'en'], 512, 214);
  return cv;
}

async function boot() {
  const tier = deviceTier();
  const lowPower = (DEBUG && !params.has('hq')) || tier.tier === 'low';
  const small = mobile || lowPower; // phones and weak GPUs take the 1280w photos
  const { createGarden } = await import('./garden.js');
  garden = await createGarden(canvas, {
    mobile, lowPower, reduced, tier,
    grass: DEBUG && !params.has('hq') ? (mobile ? 12000 : 20000) : undefined,
    plateUrl: photoUrl(slots.img('scene.mountains'), small ? 'sm' : 'lg'),
    easels: easelPhotos.map((e) => ({ url: photoUrl(e.photo, small ? 'sm' : 'lg') })),
    welcome: await welcomeSign(),
    onProgress: setBar,
  });
  garden.setStations(stations);
  garden.setIntro(params.has('station') || reduced ? 0 : 1);
  garden.start();
  document.body.classList.add('is-ready');
  // gallery photos have unknown proportions: load them now so the grid never jumps or shows empty mats
  document.querySelectorAll('.gallery img').forEach((im) => { im.loading = 'eager'; });
  enableGate();
  gardenReady();
  if (params.has('station')) enter(false, true);
}

function frame() {
  const r = readScroll();
  if (garden) {
    let p = r.i + (reduced ? (r.f > 0.5 ? 1 : 0) : r.f);
    if (debugP !== null) p = debugP;
    garden.setProgress(p);
  }
  let ro = r;
  if (debugP !== null) ro = { i: Math.floor(debugP), f: debugP % 1, hold: debugHold };
  else if (reduced && r.f > 0) ro = r.f > 0.5 ? { i: r.i + 1, f: 0, hold: 0 } : { i: r.i, f: 0, hold: 1 };
  garden?.setHold(ro.hold ?? 1);
  updateOverlays(ro);
  requestAnimationFrame(frame);
}

/** Into the garden: music from the guest's tap, the page unlocked, smooth scroll on. */
function startEnter(withMusic) {
  if (started) return false;
  started = true;
  try { player.unlock(); ringBell(player.ctx, { gain: 0.16 }); player.start(withMusic); } catch { /* audio optional */ }
  document.body.classList.remove('is-gated');
  document.body.classList.add('is-in');
  lenis = createSmooth();
  return true;
}
function enter(withMusic, instant = false) {
  if (mixGate) { if (instant) mixGate.finish(); else mixGate.open(withMusic); return; }
  if (!startEnter(withMusic)) return;
  gate.classList.add('is-leaving');
  setTimeout(() => { gate.hidden = true; }, instant ? 0 : 1100);
  flyIn(instant);
}
/** The camera's walk in, from above the reflecting pool down to the arrival (3.6 s). */
function flyIn(instant = false) {
  if (!instant && !reduced) {
    const t0 = performance.now();
    const D = 3600;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / D);
      garden?.setIntro(1 - (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  } else garden?.setIntro(0);
  document.getElementById('hero-names')?.closest('.b-st')?.focus?.();
}
function enableGate() {
  if (mix.gate) return;
  document.getElementById('enter-music').disabled = false;
  document.getElementById('enter-quiet').disabled = false;
}
if (!mix.gate) {
  document.getElementById('enter-music').addEventListener('click', () => enter(true));
  document.getElementById('enter-quiet').addEventListener('click', () => enter(false));
}

// Another theme's gate: its own exit plays over the garden, which waits beneath it (held there until the 3D has
// loaded); as the gate fades, the camera starts its walk in, exactly as after Bagaicha's own gate.
let gardenReady = () => {};
const gardenLoaded = new Promise((r) => { gardenReady = r; });
const mixGate = mix.gate ? mix.mountGate({
  start: (withMusic) => { startEnter(withMusic); },
  intro(tl, at) {
    tl.call(() => {
      const skip = tl.progress() === 1; // finished at once (?station, ?debug&open, the studio): no walk
      let held = false;
      if (!skip && !garden && !document.body.classList.contains('no-gl') && !tl.paused()) { held = true; tl.pause(); }
      gardenLoaded.then(() => { flyIn(reduced || skip); if (held) tl.resume(); });
    }, null, Math.max(0, at - 0.15)); // the moment the gate starts to fade
  },
}) : null;

// Chapter buttons scroll to their station.
const scrollToY = (y) => (lenis ? lenis.scrollTo(y, { duration: 1.6 }) : window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' }));
document.querySelector('.chapters')?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-chapter]');
  if (!b) return;
  const d = chapterDefs[Number(b.dataset.chapter)];
  if (d.at === 'rsvp') { scrollToY(document.getElementById('rsvp').getBoundingClientRect().top + window.scrollY); return; }
  const i = stations.findIndex((s) => s.id === d.at);
  scrollToY(journey.offsetTop + segs[i].y0 + segs[i].hold * 0.3);
});
// Keyboard users tabbing into a card are scrolled to its station.
document.querySelector('.b-stations').addEventListener('focusin', (e) => {
  const el = e.target.closest('.b-st');
  if (!el || el.classList.contains('is-on')) return;
  const i = Number(el.dataset.st);
  window.scrollTo(0, journey.offsetTop + segs[i].y0 + segs[i].hold * 0.3);
});

let w0 = window.innerWidth;
window.addEventListener('resize', () => {
  garden?.resize();
  if (window.innerWidth !== w0) { w0 = window.innerWidth; layoutJourney(); }
});
// Stop drawing once the finale covers the garden.
new IntersectionObserver(([en]) => garden?.pause(!en.isIntersecting), { rootMargin: '0px 0px 0px 0px' }).observe(journey);

// ───────────────────────── Debug hook ─────────────────────────
let debugP = null;
let debugHold = 1;
if (DEBUG) {
  window.__bagaicha = {
    stations: stations.map((s) => s.id),
    go(i, f = 0, hold = 0.5) {
      const s = segs[i];
      window.scrollTo(0, journey.offsetTop + s.y0 + (f ? s.hold + s.travel * f : s.hold * hold));
      garden?.snap?.();
    },
    setP(p, hold = 0.5) { debugP = p; debugHold = hold; garden?.snap?.(); },
    get garden() { return garden; },
    info: () => { const i = garden.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures }; },
    enter: () => enter(false, true),
  };
  if (mixGate && params.has('open')) mixGate.finish();
}
const stParam = params.get('station');
if (stParam !== null) {
  const i = Math.max(0, Math.min(stations.length - 1, Number(stParam) || 0));
  requestAnimationFrame(() => window.scrollTo(0, journey.offsetTop + segs[i].y0 + segs[i].hold * 0.5));
}

requestAnimationFrame(frame);
boot().catch((err) => {
  console.error('[bagaicha] 3D garden failed; showing the still version.', err);
  document.body.classList.add('no-gl', 'is-ready');
  canvas.style.backgroundImage = `url("${photoUrl(slots.img('still.backdrop'), 'sm')}")`;
  enableGate();
  gardenReady();
});
}
