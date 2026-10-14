// Mandap · Sacred Fire (पवित्र अग्नि): a 3D night diorama. The camera cranes down from
// the sky through hanging marigolds to the lit mandap; scrolling walks the story:
// the couple's photographs on easels, the Janti along the lamp path past brass
// plaques for each ceremony, the Swayambar garlands, seven rounds of the fire, and
// sindoor. Then the shared finale (gallery, guest information, RSVP).
import '../../core/base.css';
import './mandap.css';
import * as T from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadInvitation } from '../../core/data.js';
import { photoUrl } from '../../photos.js';
import { deviceTier } from './perf.js';
import { bi, esc, dateOf, bsDateOf, timeLabel, mapUrl, biNodes } from '../../core/i18n.js';
import { mountShell, ringBell } from '../../core/shell.js';
import { createSmooth, reducedMotion, isMobile } from '../../core/smooth.js';
import { renderFinale, animateGallery, guestEvents } from '../../core/finale.js';
import { useSlots } from '../../core/slots.js';
import { openModal } from '../../core/modal.js';
import manifest from './slots.js';

gsap.registerPlugin(ScrollTrigger);
const config = await loadInvitation();
const q = new URLSearchParams(location.search);
const DEBUG = q.has('debug');
const reduced = reducedMotion() || q.has('still');
const mobile = isMobile();
const c = config.couple;
const events = guestEvents();
const story = config.story || [];
const vows = config.saptapadi || [];
const { img, txt, alt } = useSlots(manifest);

// ───────────────────────── Content ─────────────────────────
// Easels: the bride's and groom's own photos when they have them, then five couple slots.
// Captions are the couple's story lines (forward-looking or neutral), never descriptions of photos.
const frames = [];
const own = (k) => config.themeContent?.mandap?.images?.[k] || (k === 'us.bride' ? c.bride.photo : c.groom.photo);
if (own('us.bride')) frames.push({ photo: img('us.bride'), alt: alt('us.bride') || c.bride.fullName.en, kicker: { en: 'The bride', ne: 'दुलही' }, line: c.bride.fullName, sub: { en: `Daughter of ${c.bride.parents.en}`, ne: `${c.bride.parents.ne}की सुपुत्री` } });
if (own('us.groom')) frames.push({ photo: img('us.groom'), alt: alt('us.groom') || c.groom.fullName.en, kicker: { en: 'The groom', ne: 'दुलहा' }, line: c.groom.fullName, sub: { en: `Son of ${c.groom.parents.en}`, ne: `${c.groom.parents.ne}का सुपुत्र` } });
const portraitAlt = (ref) => (c.portraits || []).find((p) => p.photo === ref)?.alt;
[1, 2, 3, 4, 5].forEach((n, i) => {
  const ref = img(`us.photo${n}`);
  if (!ref || frames.some((f) => f.photo === ref)) return;
  const s = story[i];
  const soon = [{ en: plainNamesOf(), ne: `${c.bride.name.ne} र ${c.groom.name.ne}` }, { en: 'Two families, one sacred fire', ne: 'दुई परिवार, एउटै पवित्र अग्नि' }, { en: 'Soon, side by side for life', ne: 'चाँडै, जीवनभरका साथी' }, { en: 'With the blessings of our elders', ne: 'गुरुजनको आशीर्वादसहित' }, { en: 'We would love you there', ne: 'हजुरको साथ चाहन्छौं' }][i % 5];
  frames.push({ photo: ref, alt: portraitAlt(ref) || alt(`us.photo${n}`), kicker: s ? s.year : txt('us.kicker'), line: s ? s.text : soon });
});
frames.splice(5);
// Brighter stand-ins (other couple portraits) if a framed photo is too dark for the night scene.
const spare = (c.portraits || []).filter((p) => !frames.some((f) => f.photo === p.photo)).map((p) => ({ photo: p.photo, alt: p.alt }));
function plainNamesOf() { return `${c.bride.name.en} & ${c.groom.name.en}`; }

let li = 0;
const letters = (s) => [...String(s)].map((ch) => (ch === ' ' ? ' ' : `<i style="--d:${li++}">${esc(ch)}</i>`)).join('');
const nameSpan = (n) => `<span class="l-en" aria-hidden="true">${letters(n.en)}</span><span class="l-ne" lang="ne" aria-hidden="true">${esc(n.ne)}</span>`;
const plainNames = `${c.bride.name.en} and ${c.groom.name.en}`;
const ord = (i) => ({ en: ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'][i], ne: ['पहिलो', 'दोस्रो', 'तेस्रो', 'चौथो', 'पाँचौँ', 'छैटौँ', 'सातौँ'][i] });

const main = document.getElementById('main');
main.innerHTML = `
  <section class="m-sec m-hero" id="hero" data-sec="hero" style="--len:${reduced ? 100 : 170}" aria-labelledby="hero-names">
    <div class="m-pin">
      <div class="m-hero__text">
        <p class="m-eyebrow m-reveal">${bi(txt('hero.kicker'))}</p>
        <h1 class="m-names" id="hero-names" aria-label="${esc(plainNames)}">
          <span class="m-name">${nameSpan(c.bride.name)}</span>
          <span class="m-amp" aria-hidden="true">&amp;</span>
          <span class="m-name">${nameSpan(c.groom.name)}</span>
        </h1>
        <p class="m-date m-reveal">${bi(dateOf(config.weddingDate))}<span class="m-dot" aria-hidden="true"></span>${bi(config.city)}</p>
        <button type="button" class="m-link m-reveal" id="open-card">${bi(txt('hero.card'))}</button>
      </div>
      <p class="m-hint m-reveal" aria-hidden="true">${bi(txt('hero.hint'))}</p>
    </div>
  </section>

  <section class="m-sec m-us" id="us" data-sec="us" style="--len:${frames.length * 100}" aria-labelledby="us-title">
    <div class="m-pin">
      <h2 class="sr-only" id="us-title">${bi(txt('us.title'))}</h2>
      <div class="m-caps">
        ${frames.map((f, i) => `
          <figure class="m-cap" data-i="${i}">
            <img class="m-cap__img" src="${esc(photoUrl(f.photo, 'sm'))}" alt="${esc(f.alt)}" loading="lazy" decoding="async" />
            <figcaption>
              <p class="m-eyebrow">${bi(f.kicker)}</p>
              <p class="m-cap__line">${bi(f.line)}</p>
              ${f.sub ? `<p class="m-cap__sub">${bi(f.sub)}</p>` : ''}
            </figcaption>
          </figure>`).join('')}
      </div>
    </div>
  </section>

  <section class="m-sec m-days" id="days" data-sec="days" style="--len:${events.length * 90 + 110}" aria-labelledby="days-title">
    <div class="m-pin">
      <h2 class="sr-only" id="days-title">${bi(txt('days.title'))}</h2>
      <div class="m-caps">
        ${events.map((e, i) => `
          <article class="m-cap m-ev" data-i="${i}" aria-labelledby="ev-${esc(e.id)}">
            <h3 class="m-ev__title" id="ev-${esc(e.id)}">${bi(e.title)}</h3>
            <p class="m-ev__when">${bi(dateOf(e.start))}<br /><span class="m-bs">${bi(bsDateOf(e.start, e.dateBS))}</span><br />${bi(timeLabel(e))}</p>
            <p class="m-ev__where">${bi(e.venue)} <a class="m-map" href="${esc(mapUrl(e.mapQuery))}" target="_blank" rel="noopener">${bi({ en: 'Map', ne: 'नक्सा' })} <span aria-hidden="true">↗</span></a></p>
          </article>`).join('')}
        <div class="m-cap m-arrive" data-i="${events.length}">
          <p class="m-eyebrow">${bi(txt('days.arrive.kicker'))}</p>
          <p class="m-cap__line">${bi(txt('days.arrive.line'))}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="m-sec m-sway" id="swayambar" data-sec="sway" style="--len:220" aria-labelledby="sway-title">
    <div class="m-pin">
      <div class="m-caps">
        <div class="m-cap m-ritual" data-i="0">
          <p class="m-eyebrow">${bi(txt('rite.swayambar.kicker'))}</p>
          <h2 class="m-ritual__title" id="sway-title">${bi(txt('rite.swayambar.title'))}</h2>
          <p class="m-cap__line">${bi(txt('rite.swayambar.line'))}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="m-sec m-seven" id="saptapadi" data-sec="seven" style="--len:${reduced ? 280 : 420}" aria-labelledby="seven-title">
    <div class="m-pin">
      <h2 class="sr-only" id="seven-title">${bi(txt('rite.saptapadi.title'))}</h2>
      <div class="m-caps">
        ${vows.map((v, i) => `
          <div class="m-cap m-vow" data-i="${i}">
            <p class="m-vow__n" aria-hidden="true">${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][i]}</p>
            <p class="m-eyebrow">${bi({ en: `${ord(i).en} round`, ne: `${ord(i).ne} फेरा` })}</p>
            <p class="m-cap__line">${bi(v)}</p>
          </div>`).join('')}
      </div>
      <ol class="m-diyos" aria-hidden="true">${vows.map(() => '<li></li>').join('')}</ol>
    </div>
  </section>

  <section class="m-sec m-sindoor" id="sindoor" data-sec="sindoor" style="--len:220" aria-labelledby="sindoor-title">
    <div class="m-pin">
      <div class="m-caps">
        <div class="m-cap m-ritual" data-i="0">
          <p class="m-eyebrow">${bi(txt('rite.sindoor.kicker'))}</p>
          <h2 class="m-ritual__title" id="sindoor-title">${bi(txt('rite.sindoor.title'))}</h2>
          <p class="m-cap__line">${bi(txt('rite.sindoor.line'))}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="m-prog" id="programme" aria-labelledby="prog-title">
    <div class="m-prog__inner">
      <p class="m-eyebrow">${bi(txt('prog.kicker'))}</p>
      <h2 class="m-prog__title" id="prog-title">${bi(txt('prog.title'))}</h2>
      <ol class="m-prog__list">
        ${events.map((e) => `
          <li class="m-prog__ev">
            <h3 class="m-prog__name">${bi(e.title)}</h3>
            <dl class="m-prog__facts">
              <div><dt>${bi({ en: 'Date', ne: 'मिति' })}</dt><dd>${bi(dateOf(e.start))}<span class="m-prog__bs">${bi(bsDateOf(e.start, e.dateBS))}</span></dd></div>
              <div><dt>${bi({ en: 'Time', ne: 'समय' })}</dt><dd>${bi(timeLabel(e))}</dd></div>
              <div><dt>${bi({ en: 'Venue', ne: 'स्थान' })}</dt><dd>${bi(e.venue)} <a class="m-map" href="${esc(mapUrl(e.mapQuery))}" target="_blank" rel="noopener">${bi({ en: 'Open map', ne: 'नक्सा हेर्नुहोस्' })} <span aria-hidden="true">↗</span></a></dd></div>
              ${e.dress?.text?.en || e.dress?.text?.ne ? `<div><dt>${bi({ en: 'Wear', ne: 'पहिरन' })}</dt><dd><span class="m-prog__sw" aria-hidden="true">${(e.dress.colors || []).map((col) => `<i style="background:${esc(col)}"></i>`).join('')}</span>${bi(e.dress.text)}</dd></div>` : ''}
            </dl>
          </li>`).join('')}
      </ol>
    </div>
  </section>`;

// Gate
const gate = document.getElementById('gate');
gate.innerHTML = `
  <div class="m-gate__inner m-paper">
    <p class="m-gate__om">${bi(txt('gate.invocation'))}</p>
    <p class="m-eyebrow" id="gate-guest" hidden></p>
    <p class="m-gate__names">${bi(c.bride.name)} <span class="m-amp">&amp;</span> ${bi(c.groom.name)}</p>
    <p class="m-gate__line">${bi(txt('gate.line'))}</p>
    <div class="loading-bar" aria-hidden="true"><i id="load-bar"></i></div>
    <div class="gate__choices">
      <button type="button" class="btn m-btn" id="enter-music" disabled>${bi(txt('gate.open'))}</button>
      <button type="button" class="gate__quiet" id="enter-quiet" disabled>${bi(txt('gate.quiet'))}</button>
    </div>
  </div>`;
const to = q.get('to');
if (to) {
  const el = document.getElementById('gate-guest');
  el.replaceChildren(...biNodes(`Dear ${to.slice(0, 60)}`, `आदरणीय ${to.slice(0, 60)}`));
  el.hidden = false;
}

// The full card wording, on demand.
const inv = config.invitation;
document.body.insertAdjacentHTML('beforeend', `
  <div class="m-card-wrap" id="card-wrap" hidden data-lenis-prevent>
  <div class="m-card" id="card" role="dialog" aria-modal="true" aria-labelledby="card-title">
    <button type="button" class="m-card__close" data-close><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <p class="m-card__ganesh" lang="sa">॥ श्री गणेशाय नमः ॥</p>
    <p class="m-card__shloka" lang="sa">${esc(inv.shloka.sa)}</p>
    <h2 class="m-card__title" id="card-title">${bi({ en: 'Shubha Bibaha', ne: 'शुभ विवाह' })}</h2>
    <p class="m-card__salute">${bi(inv.salutation)}</p>
    <p>${bi(inv.body)}</p>
    <p>${bi(inv.request)}</p>
    <dl class="m-card__fam">
      <div><dt>${bi({ en: 'The bride', ne: 'दुलही' })}</dt><dd>${bi(c.bride.fullName)}<small>${bi(c.bride.parents)}</small></dd></div>
      <div><dt>${bi({ en: 'The groom', ne: 'दुलहा' })}</dt><dd>${bi(c.groom.fullName)}<small>${bi(c.groom.parents)}</small></dd></div>
    </dl>
    <p class="m-card__sign">${bi(inv.signoff)}<br /><b>${bi(config.hosts)}</b></p>
  </div>
  </div>`);
// Only the card scrolls while it is open; the page behind stays put (openModal locks it).
const cardWrap = document.getElementById('card-wrap');
const card = document.getElementById('card');
let closeCard = null;
const hideCard = () => { cardWrap.classList.remove('is-open'); setTimeout(() => { cardWrap.hidden = true; }, 260); };
document.getElementById('open-card').addEventListener('click', () => {
  closeCard = openModal(cardWrap, { scroller: card, onClose: hideCard });
  requestAnimationFrame(() => cardWrap.classList.add('is-open'));
});
cardWrap.addEventListener('click', (e) => { if (e.target === cardWrap || e.target.closest('[data-close]')) closeCard?.(); });
cardWrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCard?.(); });

{
  // Couple first: the couple's own photos lead the gallery; library details follow, uncaptioned.
  const mine = new Set((c.portraits || []).map((p) => (typeof p.photo === 'string' ? p.photo : JSON.stringify(p.photo))));
  const key = (g) => (typeof g.photo === 'string' ? g.photo : JSON.stringify(g.photo));
  const isCouple = (g) => mine.has(key(g)) || /^(couple|bride|groom)/.test(String(g.photo));
  config.gallery = [...(config.gallery || [])].sort((a, b) => Number(isCouple(b)) - Number(isCouple(a))).map((g) => ({ ...g, caption: undefined }));
}
renderFinale(document.getElementById('finale-root'));
{
  const gk = document.querySelector('.gallery__head .eyebrow');
  const gt = document.querySelector('#gallery-title');
  const rt = document.querySelector('#rsvp-title');
  if (gk) gk.innerHTML = bi(txt('gallery.kicker'));
  if (gt) gt.innerHTML = bi(txt('gallery.title'));
  if (rt) rt.innerHTML = bi(txt('reply.title'));
}
const CHAPTERS = [
  { en: 'Welcome', ne: 'स्वागत' }, { en: 'The two of us', ne: 'हामी' }, { en: 'Ceremonies', ne: 'कार्यक्रम' },
  { en: 'Swayambar', ne: 'स्वयम्बर' }, { en: 'Seven rounds', ne: 'सप्तपदी' }, { en: 'Sindoor', ne: 'सिन्दूर' },
  { en: 'When & where', ne: 'कहिले, कहाँ' }, { en: 'RSVP', ne: 'जवाफ' },
];
const SEC_IDS = ['hero', 'us', 'days', 'sway', 'seven', 'sindoor', 'programme', 'finale'];
const { player, setChapter } = mountShell({ chapters: CHAPTERS });

// ───────────────────────── 3D ─────────────────────────
const lenis = reduced ? null : createSmooth();
lenis?.stop();
let view = null;
let night = null;
const V = (x, y, z) => new T.Vector3(x, y, z);
const cam = { pos: V(0.4, 15.5, 11.5), look: V(0, 1, 0), fov: 40, snap: true };
const st = { intro: reduced ? 1 : 0, secs: [], active: -1, frames3d: [], plaques: [], jKnots: [], lastUI: '' };

async function boot() {
  const bar = document.getElementById('load-bar');
  let fake = 0;
  const tick = setInterval(() => { fake = Math.min(0.85, fake + 0.04); bar.style.transform = `scaleX(${fake})`; }, 200);
  try {
    const [{ MandapView }, { NightRenderer }, props] = await Promise.all([import('../../core/mandap3d.js'), import('./renderer.js'), import('./props.js')]);
    // low tier (weak GPU, little memory, a cheap phone): the view's light build (fewer flowers, no shadow maps)
    const tier = deviceTier();
    view = new MandapView({ id: 'mandap3d', mobile: mobile || tier.tier === 'low' });
    night = new NightRenderer(document.getElementById('stage'), view, { mobile, tier });
    await Promise.all([view.load(), document.fonts.load('40px "Marcellus SC"'), document.fonts.load('40px "Marcellus"'), document.fonts.load('40px "Martel"').catch(() => {})]);
    buildProps(props);
    // upload the portrait textures and compile the hidden frames' shaders while the gate is up,
    // so the first scroll to the portraits does not stall on a 2560px upload
    for (const ms of [1200, 3500, 7000]) setTimeout(prewarm, ms);
    view.janti = 0;
    view.swayambar = 0;
    view.progress = 0;
    view.director = director;
    night.onFrame = onFrame;
    night.start();
    clearInterval(tick);
    bar.style.transform = 'scaleX(1)';
    if (DEBUG) exposeDebug(props);
  } catch (err) {
    clearInterval(tick);
    console.warn('WebGL unavailable, showing the still version.', err);
    document.body.classList.add('is-static');
    const bg = photoUrl(img('still.background'), 'sm');
    if (bg) document.body.style.setProperty('--still-bg', `url("${bg.replace(/"/g, '%22')}")`);
  }
  enableGate();
}

function buildProps({ photoFrame, brassPlaque }) {
  const n = frames.length;
  const photoSize = deviceTier().tier === 'low' ? 'sm' : 'lg'; // weak devices take the 1280w photos
  frames.forEach((f, i) => {
    const a = Math.PI + (i - (n - 1) / 2) * 0.62;
    const normal = V(Math.sin(a), 0, Math.cos(a));
    const g = photoFrame(photoUrl(f.photo, photoSize), {
      height: 1.05,
      style: ['floral', 'gilt', 'ivory', 'carved', 'floral'][i % 5],
      flowers: view.flowers,
      fallback: () => { const s = spare.shift(); return s ? { url: photoUrl(s.photo, photoSize), alt: s.alt } : null; },
      onSwap: (next) => {
        const img = document.querySelector(`#us .m-cap[data-i="${i}"] .m-cap__img`);
        if (img) { img.src = next.url; img.alt = next.alt; }
      },
    });
    g.position.copy(normal.clone().multiplyScalar(4.3)).setY(g.userData.base());
    g.rotation.y = a;
    view.scene.add(g);
    st.frames3d.push({ g, normal, center: g.position.clone() });
  });
  // Plaques along the Janti path, alternating sides, from far to near.
  const N = events.length;
  const zs = events.map((_, k) => 11.95 - k * 2.1);
  events.forEach((e, k) => {
    const side = k % 2 ? 1 : -1;
    const p = brassPlaque();
    const [pw, ph] = p.userData.size;
    const normal = V(-side, 0, 0.45).normalize();
    p.position.set(side * 2.05, ph / 2 + 0.975, zs[k]);
    p.rotation.y = Math.atan2(normal.x, normal.z);
    view.scene.add(p);
    st.plaques.push({ p, normal, center: p.position.clone(), size: [pw, ph], z: zs[k], e });
  });
  drawPlaques();
  document.addEventListener('langchange', drawPlaques);
  // Groom's walk: find the walk parameter at which he passes each plaque.
  const table = [];
  for (let i = 0; i <= 200; i++) { const j = (i / 200) * 0.94; table.push([j, view.jantiPose(j).p.z]); }
  const jAt = (z) => { for (let i = 1; i < table.length; i++) if (table[i][1] <= z) { const [j0, z0] = table[i - 1]; const [j1, z1] = table[i]; return j0 + ((z0 - z) / (z0 - z1)) * (j1 - j0); } return 0.94; };
  st.jKnots = [[0, 0.0], ...st.plaques.map((pl, k) => [(k + 0.62) / (N + 1), jAt(pl.z + 0.4)]), [(N + 0.55) / (N + 1), 0.9], [1, 1]];
}

function prewarm() {
  const r = night?.renderer;
  if (!r) return;
  const was = st.frames3d.map((f) => f.g.visible);
  st.frames3d.forEach((f) => {
    f.g.visible = true;
    f.g.traverse((o) => { const m = o.material?.map; if (m?.image && !m.userData.warm) { r.initTexture(m); m.userData.warm = true; } });
  });
  r.compile(view.scene, view.camera);
  st.frames3d.forEach((f, i) => { f.g.visible = was[i]; });
}

function drawPlaques() {
  const lang = document.documentElement.dataset.lang === 'ne' ? 'ne' : 'en';
  st.plaques.forEach(({ p, e }) => {
    const d = new Date(new Date(e.start).getTime() + 345 * 60000);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const NE = '०१२३४५६७८९';
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthsNe = ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'];
    p.userData.draw({
      lang,
      title: lang === 'ne' ? e.title.ne : e.title.en,
      num: lang === 'ne' ? day.replace(/\d/g, (x) => NE[x]) : day,
      kicker: lang === 'ne' ? monthsNe[d.getUTCMonth()] : `${monthsEn[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
    });
  });
}

// ───────────────────────── Story (scroll → state) ─────────────────────────
function measure() {
  const vh = window.innerHeight;
  st.vh = vh;
  st.secs = [...document.querySelectorAll('.m-sec')].map((el) => ({ id: el.dataset.sec, el, top: el.offsetTop, h: el.offsetHeight }));
  // The 3D stops rendering once the opaque programme covers the screen.
  st.finaleTop = document.getElementById('programme').offsetTop;
}

const sstep = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const piece = (knots, s) => {
  for (let i = 1; i < knots.length; i++) if (s <= knots[i][0]) { const [s0, v0] = knots[i - 1]; const [s1, v1] = knots[i]; return v0 + (v1 - v0) * ((s - s0) / (s1 - s0 || 1)); }
  return knots[knots.length - 1][1];
};

/** Where the scroll is: the section, its local progress, and a blend toward the next one. */
function where() {
  const y = window.scrollY;
  const vh = st.vh || window.innerHeight;
  let idx = 0;
  for (let i = 0; i < st.secs.length; i++) if (y >= st.secs[i].top - 1) idx = i;
  const s = st.secs[idx];
  if (!s) return { idx: 0, id: 'hero', t: 0, k: 0 };
  const span = Math.max(1, s.h - vh);
  const t = clamp01((y - s.top) / span);
  const k = idx < st.secs.length - 1 ? clamp01((y - s.top - span) / vh) : 0;
  return { idx, id: s.id, t, k };
}

const portrait = () => night.aspect < 0.85;
const FOV = (land, port) => (portrait() ? port : land);

/** Camera and ritual state for a section at local progress t. */
function shotFor(id, t) {
  const pr = portrait();
  const out = { janti: 0, swayambar: 0, progress: 0, lantern: null };
  switch (id) {
    case 'hero': {
      const back = pr ? 3.2 : 0;
      out.pos = V(0, 2.3, 9.6 + back).lerp(V(1.1, 2.1, 7.6 + back * 0.8), t);
      out.look = pr ? V(0, 0.5, 0).lerp(V(0, 0.55, 0.6), t) : V(0, 0.95, 0).lerp(V(0, 0.9, 0.6), t);
      out.fov = FOV(34, 50);
      break;
    }
    case 'us': {
      const n = st.frames3d.length;
      const s = t * n;
      const i = Math.min(n - 1, Math.floor(s));
      const u = s - i;
      const shot = (k, uu) => {
        const f = st.frames3d[k];
        const { w, h } = f.g.userData.state;
        return frameOf(f.center, f.normal, w, h, { yaw: (uu - 0.5) * 0.22 + (pr ? 0 : -0.12), shift: pr ? 0 : -0.2, fillW: pr ? 0.84 : 0.5, fillH: pr ? 0.5 : 0.7 });
      };
      const a = shot(i, u);
      const nextK = sstep(u, 0.78, 1) * (i < n - 1 ? 1 : 0);
      if (nextK > 0) { const b = shot(i + 1, 0); a.pos.lerp(b.pos, nextK); a.look.lerp(b.look, nextK); }
      Object.assign(out, a);
      const f = st.frames3d[Math.min(n - 1, Math.round(s - 0.3))];
      out.lantern = f.center.clone().addScaledVector(f.normal, 1.0).add(V(0, 0.7, 0));
      out.capIndex = i;
      break;
    }
    case 'days': {
      out.janti = piece(st.jKnots, t);
      const N = st.plaques.length;
      const seg = t * (N + 1) - 0.62;
      const k = Math.max(0, Math.min(N - 1, Math.round(seg)));
      const shot = (kk) => {
        const pl = st.plaques[kk];
        const side = Math.sign(pl.center.x);
        return frameOf(pl.center, pl.normal, pl.size[0], pl.size[1], { yaw: side * (pr ? 0.25 : 0.42), shift: pr ? 0 : 0.22 * side, fillW: pr ? 0.88 : 0.42, fillH: pr ? 0.36 : 0.55, lift: 0.25 });
      };
      // At each plaque the camera reads it; between plaques it walks with the groom.
      let a = shot(k);
      const g = view.jantiPose(out.janti).p;
      const nextSide = Math.sign(st.plaques[Math.min(N - 1, Math.max(0, Math.ceil(seg)))].center.x);
      const track = {
        pos: g.clone().add(V(-nextSide * (pr ? 0.7 : 1.2), pr ? 1.75 : 1.6, pr ? 3.4 : 2.6)),
        look: g.clone().add(V(nextSide * 0.5, 1.05, -1.6)),
        fov: FOV(36, 50),
      };
      const off = Math.abs(seg - Math.round(seg));
      const tw = seg < -0.15 ? 1 : sstep(off, 0.12, 0.38);
      a = { pos: a.pos.lerp(track.pos, tw), look: a.look.lerp(track.look, tw), fov: a.fov + (track.fov - a.fov) * tw };
      // The arrival: behind the groom, toward the bride.
      const arrive = sstep(t, (N + 0.1) / (N + 1), 1);
      if (arrive > 0) {
        const z = arriveShot();
        a.pos.lerp(z.pos, arrive);
        a.look.lerp(z.look, arrive);
        a.fov = a.fov + (z.fov - a.fov) * arrive;
      }
      Object.assign(out, a);
      const pl = st.plaques[k];
      out.lantern = pl.center.clone().addScaledVector(pl.normal, 0.9).add(V(0, 0.6, 0));
      out.capIndex = t > (N + 0.25) / (N + 1) ? N : k;
      break;
    }
    case 'sway': {
      out.janti = 1;
      out.swayambar = sstep(t, 0.04, 0.96);
      const z = arriveShot();
      const b = pr ? { pos: V(0.25, 1.5, 5.6), look: V(0, 1.22, 1.55), fov: 40 } : { pos: V(1.35, 1.52, 3.75), look: V(-0.15, 1.28, 1.55), fov: 30 };
      const m = sstep(t, 0, 0.25);
      out.pos = z.pos.clone().lerp(b.pos, m);
      out.look = z.look.clone().lerp(b.look, m);
      out.fov = z.fov + (b.fov - z.fov) * m;
      out.capIndex = t > 0.02 && t < 0.98 ? 0 : -1;
      break;
    }
    case 'seven': {
      out.janti = 1;
      out.swayambar = 1;
      out.progress = 0.86 * sstep(t, 0.02, 0.98);
      const a = 0.35 - t * 0.7;
      const r = pr ? 7.6 : 5.6;
      out.pos = V(Math.sin(a) * r, pr ? 3.6 : 3.0, Math.cos(a) * r);
      out.look = V(0, pr ? 0.75 : 0.85, 0.15);
      out.fov = FOV(38, 54);
      // The vow follows the couple's actual round (they walk at their own pace behind the scroll).
      out.capIndex = view.sm && !st.manual ? Math.min(6, Math.floor(clamp01(view.sm.p / 0.86) * 7)) : Math.min(6, Math.floor(clamp01((t - 0.02) / 0.96) * 7));
      break;
    }
    case 'sindoor': {
      out.janti = 1;
      out.swayambar = 1;
      out.progress = 0.86 + 0.14 * sstep(t, 0.05, 0.95);
      const a = pr ? { pos: V(0.1, 1.6, 4.9), look: V(0, 1.3, 1.32), fov: 40 } : { pos: V(0.25, 1.65, 4.2), look: V(0.32, 1.38, 1.32), fov: 30 };
      const b = pr ? { pos: V(0.05, 1.62, 4.5), look: V(0, 1.34, 1.32), fov: 38 } : { pos: V(0.2, 1.65, 3.9), look: V(0.3, 1.42, 1.32), fov: 28 };
      out.pos = a.pos.lerp(b.pos, t);
      out.look = a.look.lerp(b.look, t);
      out.fov = a.fov + (b.fov - a.fov) * t;
      out.capIndex = t > 0.1 ? 0 : -1;
      break;
    }
    default: {
      // Finale: last frame of the sindoor.
      return shotFor('sindoor', 1);
    }
  }
  return out;
}

function arriveShot() {
  return portrait() ? { pos: V(0.9, 1.75, 6.4), look: V(0, 1.15, 1.55), fov: 44 } : { pos: V(1.9, 1.8, 5.3), look: V(-0.2, 1.2, 1.55), fov: 32 };
}

function frameOf(center, normal, w, h, o) {
  const fov = FOV(32, 46);
  const tanV = Math.tan((fov * Math.PI) / 360);
  const aspect = night.aspect;
  const d = Math.max(h / 2 / (tanV * o.fillH), w / 2 / (tanV * aspect * o.fillW));
  const dir = normal.clone().applyAxisAngle(V(0, 1, 0), o.yaw || 0).normalize();
  const pos = center.clone().addScaledVector(dir, d).add(V(0, o.lift ?? 0.08, 0));
  const right = new T.Vector3().crossVectors(V(0, 1, 0), dir).normalize();
  const look = center.clone().addScaledVector(right, -(o.shift || 0) * d * tanV * aspect * 2);
  return { pos, look, fov };
}

/** The crane from the night sky to the hero shot. */
function crane(t, hero) {
  const pr = portrait();
  // Daylight: a gentle descent from above the lamp path to the hero view.
  // Through the floral gate: start outside it, glide under the rose arch, settle on the mandap.
  const pts = [V(0.2, 1.75, 22 + (pr ? 2 : 0)), V(0.15, 2.45, 18.2), V(0.05, 2.35, 15.2), V(0.05, 2.1, 12.6 + (pr ? 1 : 0)), hero.pos];
  const looks = [V(0, 1.75, 12), V(0, 1.7, 8), V(0, 1.55, 6), V(0, 1.2, 1), hero.look];
  const curve = new T.CatmullRomCurve3(pts);
  const lc = new T.CatmullRomCurve3(looks);
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in and out: a calm glide through the gate
  return { pos: curve.getPoint(e), look: lc.getPoint(e), fov: 40 + (hero.fov - 40) * e };
}

function onFrame() {
  if (!st.secs.length) measure();
  const w = where();
  let shot = shotFor(w.id, w.t);
  if (w.k > 0) {
    const nextId = st.secs[w.idx + 1]?.id;
    if (nextId) {
      const nx = shotFor(nextId, 0);
      const m = sstep(w.k, 0, 1);
      // Long moves arc up and over the mandap instead of passing through it.
      const dist = shot.pos.distanceTo(nx.pos);
      shot.pos.lerp(nx.pos, m);
      if (dist > 4) shot.pos.y += Math.sin(Math.PI * m) * Math.min(5, dist * 0.28);
      shot.look.lerp(nx.look, m);
      shot.fov += (nx.fov - shot.fov) * m;
      for (const key of ['janti', 'swayambar', 'progress']) shot[key] += (nx[key] - shot[key]) * m;
    }
  }
  if (st.intro < 1) {
    const cr = crane(st.intro, shotFor('hero', 0));
    shot = { ...shot, ...cr };
  }
  if (st.override) Object.assign(shot, { pos: V(...st.override[0]), look: V(...st.override[1]), fov: st.override[2] });
  view.janti = shot.janti;
  view.swayambar = shot.swayambar;
  view.progress = shot.progress;
  st.target = shot;
  // Lantern: a warm light that follows the active frame or plaque.
  const L = view.lantern;
  if (shot.lantern) { L.position.lerp(shot.lantern, cam.snap ? 1 : 0.08); L.intensity += (1.5 - L.intensity) * (cam.snap ? 1 : 0.08); } else L.intensity *= 0.92;
  const showFrames = w.id === 'hero' || w.id === 'us' || (w.id === 'days' && w.t < 0.05);
  for (const f of st.frames3d) f.g.visible = showFrames;
  // Render only while the 3D story is on screen.
  if (!st.manual) night.active = window.scrollY < st.finaleTop - st.vh * 0.05 || st.intro < 1;
  ui(w);
}

function director(v, aspect, time, dt) {
  const t = st.target;
  if (!t) return false;
  const k = cam.snap || reduced ? 1 : 1 - Math.exp(-dt * 3.4);
  cam.snap = false;
  cam.pos.lerp(t.pos, k);
  cam.look.lerp(t.look, k);
  cam.fov += (t.fov - cam.fov) * k;
  v.camera.fov = cam.fov;
  v.camera.position.copy(cam.pos);
  v.camera.lookAt(cam.look);
  // Never let a figure fill the lens when the camera passes close by on a narrow screen.
  for (const f of [v.bride, v.groom]) {
    const p = f.root.position;
    const d = Math.hypot(cam.pos.x - p.x, cam.pos.z - p.z);
    f.root.visible = !(d < 0.75 && cam.pos.y < p.y + 2.2);
  }
  return true;
}

function ui(w) {
  const s = st.secs[w.idx];
  if (!s) return;
  const shot = st.target;
  const key = `${w.id}:${shot.capIndex}:${w.k > 0.35 ? 'out' : 'in'}`;
  if (key === st.lastUI) return;
  st.lastUI = key;
  document.querySelectorAll('.m-cap.is-on').forEach((el) => el.classList.remove('is-on'));
  if (w.k <= 0.35 && shot.capIndex != null && shot.capIndex >= 0) s.el.querySelector(`.m-cap[data-i="${shot.capIndex}"]`)?.classList.add('is-on');
  if (w.id === 'seven') s.el.querySelectorAll('.m-diyos li').forEach((li, i) => li.classList.toggle('is-lit', i <= shot.capIndex));
  const ci = SEC_IDS.indexOf(w.id);
  if (ci !== st.active) { st.active = ci; setChapter(ci); }
}

// ───────────────────────── Entry ─────────────────────────
function enableGate() {
  const b1 = document.getElementById('enter-music');
  const b2 = document.getElementById('enter-quiet');
  b1.disabled = b2.disabled = false;
  b1.focus({ preventScroll: true });
  b1.addEventListener('click', () => enter(true), { once: true });
  b2.addEventListener('click', () => enter(false), { once: true });
  if (DEBUG && q.has('skip')) enter(false, true);
}

function enter(withMusic, instant = false) {
  player.unlock();
  if (!instant) ringBell(player.ctx, { when: 0.05 });
  if (withMusic) player.start(true);
  else player.start(false);
  const finish = () => {
    gate.hidden = true;
    document.body.classList.remove('is-gated');
    window.scrollTo(0, 0);
    measure();
    lenis?.start();
    document.body.classList.add('is-in');
    animateGallery({ reduced, mobile });
    ScrollTrigger.refresh();
    measure();
  };
  if (instant || reduced || !view) {
    st.intro = 1;
    cam.snap = true;
    document.body.classList.add('is-landed');
    finish();
    return;
  }
  // The crane: about five seconds from the sky to the mandap; the names arrive in light.
  gsap.to('#gate .m-gate__inner', { autoAlpha: 0, y: -12, duration: 0.7, ease: 'power2.in' });
  gsap.to(st, { intro: 1, duration: mobile ? 5 : 5.6, ease: 'none', delay: 0.4, onComplete: () => { document.body.classList.add('is-landed'); } });
  setTimeout(finish, 1200);
}

addEventListener('resize', () => { measure(); });
// Chapters below the 3D story (the programme and the reply) follow the plain scroll.
addEventListener('scroll', () => {
  if (!st.vh) return;
  const y = window.scrollY + st.vh * 0.5;
  const rsvp = document.getElementById('rsvp');
  const ci = rsvp && y >= rsvp.getBoundingClientRect().top + window.scrollY ? 7 : y >= st.finaleTop ? 6 : -1;
  if (ci >= 0 && ci !== st.active) { st.active = ci; setChapter(ci); }
}, { passive: true });
document.querySelectorAll('.chapters button').forEach((b) => b.addEventListener('click', () => {
  const i = Number(b.dataset.chapter);
  const id = SEC_IDS[i];
  const el = id === 'finale' ? document.getElementById('rsvp') : id === 'programme' ? document.getElementById('programme') : document.querySelector(`.m-sec[data-sec="${id}"]`);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.6 }); else el.scrollIntoView();
}));

// ───────────────────────── Debug hooks (?debug) ─────────────────────────
function exposeDebug() {
  if (q.has('manual')) { st.manual = true; night.active = false; }
  window.__m = {
    view, night, st, cam,
    /** Jump to a section at local progress t and render a settled frame. */
    go(id, t = 0, { walk = false } = {}) {
      st.intro = 1;
      measure();
      const s = st.secs.find((x) => x.id === id);
      const y = id === 'finale' ? st.finaleTop : id === 'rsvp' ? document.getElementById('rsvp').getBoundingClientRect().top + window.scrollY : s.top + t * Math.max(1, s.h - st.vh);
      lenis?.scrollTo(y, { immediate: true });
      window.scrollTo(0, y);
      cam.snap = true;
      view.snapNext = true;
      view.walkHold = walk;
      night.timeOverride = (night.timeOverride ?? 3) + 0.05;
      onFrame();
      night.render();
      night.timeOverride += 0.05;
      onFrame();
      cam.snap = true;
      night.render();
      return { y, id, t, round: view.round };
    },
    /** Hold a custom camera (pos, look, fov) over the current state; null releases it. */
    look(pos, look, fov = 30) { st.override = pos ? [pos, look, fov] : null; cam.snap = true; night.timeOverride += 0.05; onFrame(); night.render(); },
    intro(v) { st.intro = v; cam.snap = true; night.timeOverride = (night.timeOverride ?? 3) + 0.05; onFrame(); night.render(); },
  };
  window.__ready = true;
}

boot();
