// Sayapatri · "Haldi Daylight"
// A bright, daytime scroll story about the marriage itself: the couple, their
// families, two hands joining (the signature), the four celebrations as a
// horizontal run of colour fields, the wedding-day rites in layered parallax,
// the seven steps around the fire, then gallery and RSVP. A few hand-made 3D
// marigold petals hang in the air and drift with the scroll; nothing else zooms.
import '../../core/base.css';
import './sayapatri.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadInvitation } from '../../core/data.js';
import { photoUrl, photos } from '../../photos.js';
import { bi, esc, dateOf, timeRange, timeOf, mapUrl, biNodes, neNum, bsDateOf } from '../../core/i18n.js';
import { mountShell, ringBell } from '../../core/shell.js';
import { createSmooth, reducedMotion, isMobile } from '../../core/smooth.js';
import { renderFinale, guestEvents } from '../../core/finale.js';
import credits from '../../generated/credits.json';
import { useSlots } from '../../core/slots.js';
import { openModal } from '../../core/modal.js';
import manifest from './slots.js';

gsap.registerPlugin(ScrollTrigger);

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');

// ───────────────────────── helpers ─────────────────────────
// Library photos whose stored focal point still shows clutter in tight frames.
const FOCAL_FIX = { 'marigold-garland-alt': [0.5, 0.14], 'sindoor': [0.5, 0.7], 'diyo-lamps-alt': [0.5, 0.4] };
const focalOf = (ref) => {
  const f = (typeof ref === 'string' && (FOCAL_FIX[ref] || photos[ref]?.focal)) || (ref && typeof ref === 'object' && Array.isArray(ref.focal) && ref.focal) || [0.5, 0.5];
  const n = (v) => Math.min(100, Math.max(0, Number(v) * 100 || 50)).toFixed(1);
  return `${n(f[0])}% ${n(f[1])}%`;
};
/** Responsive <img> for any photo reference, focal point as object-position. */
const pic = (ref, alt = '', sizes = '50vw', extra = '') => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  const set = sm && lg && sm !== lg ? ` srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w" sizes="${esc(sizes)}"` : '';
  return `<img src="${esc(sm || lg)}"${set} alt="${esc(alt)}" style="object-position:${focalOf(ref)}" decoding="async" ${extra} />`;
};
const TZ = 'Asia/Kathmandu';
const timeObj = (t) => (typeof t === 'string' ? { en: t, ne: neNum(t) } : t || { en: '', ne: '' });

// Small hand-drawn marigold (vector, built here): rings of ruffled petals.
const bloomSymbol = () => {
  // Fills live inside the symbol: outer CSS cannot reach a <use> shadow tree.
  const ring = (n, rx, ry, dist, fill, rot = 0) => Array.from({ length: n }, (_, i) =>
    `<ellipse cx="0" cy="${-dist}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${(360 / n) * i + rot})"/>`).join('');
  return `<svg class="svg-defs" aria-hidden="true" focusable="false"><symbol id="sp-bloom" viewBox="-50 -50 100 100">
    ${ring(18, 9, 16, 30, '#EE7F1B')}${ring(14, 8, 13, 21, '#F4B41A', 12)}${ring(10, 7, 10, 12, '#E8650C', 6)}<circle r="7" fill="#8A3A06"/>
  </symbol></svg>`;
};

async function main() {
  const config = await loadInvitation();
  // ?debug&slots={"images":{...},"texts":{...}} previews studio overrides without touching config.js.
  if (DEBUG && params.get('slots')) {
    try { config.themeContent = { ...(config.themeContent || {}), sayapatri: JSON.parse(params.get('slots')) }; } catch (err) { console.warn('bad ?slots JSON', err); }
  }
  const { img, txt, alt } = useSlots(manifest);
  /** Slot text with {placeholders} filled from plain or bilingual values (escaped later by bi). */
  const fill = (id, vars = {}) => {
    const t = txt(id);
    const sub = (str, lang) => String(str).replace(/\{(\w+)\}/g, (_, k) => {
      const v = vars[k];
      return (v && typeof v === 'object' ? v[lang] ?? v.en : v) ?? '';
    });
    return { en: sub(t.en, 'en'), ne: sub(t.ne, 'ne') };
  };
  /** Bikram Sambat date beside the AD date (shared converter, contract §12; event.dateBS override wins). */
  const bsOf = (e) => {
    if (!e?.start) return null;
    const b = bsDateOf(e.start, e.dateBS);
    if (e.dateBS && (e.dateBS.en || e.dateBS.ne)) return { en: e.dateBS.en || e.dateBS.ne, ne: e.dateBS.ne || e.dateBS.en };
    return { en: `${b.short.en} B.S.`, ne: `वि.सं. ${b.short.ne}` };
  };
  /** "Tue, 9 Feb" style short day for the programme overview. */
  const shortDay = (iso) => {
    const d = new Date(iso);
    const en = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', weekday: 'short', day: 'numeric', month: 'short' }).format(d);
    const ne = dateOf(iso).ne.split(', ').slice(0, 2).join(', ');
    return { en, ne };
  };
  const reduced = reducedMotion() || params.has('still');
  const mobile = isMobile();
  const c = config.couple;
  const events = guestEvents();
  const ev = Object.fromEntries(events.map((e) => [e.id, e]));

  // Every photo comes from a slot (slots.js); couple slots default to the couple's own portraits.
  const P = (c.portraits || []).filter((p) => p && p.photo);
  const keyOf = (ref) => (typeof ref === 'string' ? ref : ref?.lg);
  /** Alt for a slot photo: the portrait's own alt when it is one of the couple's photos. */
  const altOf = (id, ref) => P.find((p) => keyOf(p.photo) === keyOf(ref))?.alt || alt(id);
  const heroA = img('hero.photo');
  const heroB = img('hero.photo2');
  const joinPhoto = img('join.photo');

  // ───────────────────────── markup ─────────────────────────
  const bride = c.bride;
  const groom = c.groom;
  const namePair = (cls = '') => `
    <span class="sp-names__a ${cls}">${bi(bride.name)}</span>
    <span class="sp-names__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span>
    <span class="sp-names__b ${cls}">${bi(groom.name)}</span>`;

  const hero = `
  <section class="sp-hero" id="welcome" aria-labelledby="hero-names">
    <div class="sp-hero__field" aria-hidden="true"><i class="sp-sun"></i></div>
    <div class="sp-hero__art">
      ${heroA ? `<figure class="sp-photo sp-hero__a" data-par="-8">${pic(heroA, altOf('hero.photo', heroA), '(max-width: 760px) 56vw, 28vw')}</figure>` : ''}
      ${heroB && keyOf(heroB) !== keyOf(heroA) ? `<figure class="sp-photo sp-hero__b" data-par="-22">${pic(heroB, altOf('hero.photo2', heroB), '(max-width: 760px) 30vw, 15vw')}</figure>` : ''}
      <svg class="sp-bloom sp-hero__bloom" data-par="-40" aria-hidden="true"><use href="#sp-bloom"/></svg>
    </div>
    <div class="sp-hero__text" data-par="12">
      <p class="sp-kicker">${bi(txt('hero.kicker'))}</p>
      <h1 class="sp-names" id="hero-names">${namePair()}</h1>
      <p class="sp-hero__date">${bi(dateOf(config.weddingDate))}<span class="sp-dot" aria-hidden="true"></span>${bi(config.city)}</p>
    <div class="sp-gate" id="gate">
        <p class="sp-gate__guest" id="gate-guest" hidden></p>
        <div class="sp-gate__choices">
          <button type="button" class="sp-btn" id="enter-music">${bi(txt('gate.open'))}</button>
          <button type="button" class="sp-quiet" id="enter-quiet">${bi(txt('gate.quiet'))}</button>
        </div>
      </div>
    </div>
    <p class="sp-cue" aria-hidden="true"><i></i>${bi(txt('hero.cue'))}</p>
  </section>`;

  // The couple and their families: a sticky stack of prints (bride, groom, then the two of them).
  const deck = [
    { id: 'couple.bride', cap: 0 }, { id: 'couple.groom', cap: 1 }, { id: 'couple.together1', cap: 2 }, { id: 'couple.together2', cap: 2 },
  ].map((d) => ({ ...d, photo: img(d.id) })).filter((d) => d.photo);
  deck.forEach((d) => { d.alt = altOf(d.id, d.photo); });
  if (deck.length) deck[deck.length - 1].cap = 2;
  const caps = [
    { kicker: txt('couple.bride.kicker'), title: bride.fullName || bride.name, line: fill('couple.bride.line', { parents: bride.parents || '' }) },
    { kicker: txt('couple.groom.kicker'), title: groom.fullName || groom.name, line: fill('couple.groom.line', { parents: groom.parents || '' }) },
    { kicker: txt('couple.together.kicker'), title: txt('couple.together.title'), line: config.hosts, card: true },
  ];
  const capAt = (i) => deck[i].cap;
  const tilt = [-4, 3.5, -2, 5, -3, 2];
  const stack = `
  <section class="sp-stack" id="couple" aria-labelledby="couple-title">
    <h2 class="sr-only" id="couple-title">${bi({ en: 'The couple and their families', ne: 'जोडी र परिवार' })}</h2>
    <div class="sp-stack__pin">
      <div class="sp-stack__caps">
        ${caps.map((k, i) => `
          <div class="sp-cap" data-cap="${i}">
            <p class="sp-kicker">${bi(k.kicker)}</p>
            <p class="sp-cap__title">${bi(k.title)}</p>
            <p class="sp-cap__line">${bi(k.line)}</p>
            ${k.card ? `<button type="button" class="sp-link" data-open-card>${bi(txt('couple.card'))}</button>` : ''}
          </div>`).join('')}
      </div>
      <div class="sp-stack__deck">
        ${deck.map((d, i) => `<figure class="sp-print" data-card="${i}" data-cap-of="${capAt(i)}">${pic(d.photo, d.alt, '(max-width: 760px) 78vw, 34vw')}</figure>`).join('')}
      </div>
    </div>
  </section>`;

  // Signature: two halves of one photograph slide in and join.
  const join = `
  <section class="sp-join" id="join" aria-labelledby="join-title">
    <div class="sp-join__pin">
      <div class="sp-join__frame">
        <div class="sp-join__half sp-join__half--l">${pic(joinPhoto, '', '(max-width: 760px) 92vw, 64vw')}</div>
        <div class="sp-join__half sp-join__half--r">${pic(joinPhoto, '', '(max-width: 760px) 92vw, 64vw')}</div>
        <span class="sr-only" role="img" aria-label="${esc(altOf('join.photo', joinPhoto))}"></span>
      </div>
      <h2 class="sp-join__title" id="join-title">
        <span class="sp-join__w1">${bi(txt('join.line1'))}</span>
        <span class="sp-join__w2">${bi(txt('join.line2'))}</span>
      </h2>
      <i class="sp-join__thread" aria-hidden="true"></i>
    </div>
  </section>`;

  // The celebrations: horizontal run of colour fields.
  const TONE = { mehendi: 'leaf', haldi: 'haldi', wedding: 'cream', reception: 'saffron' };
  const TONES = ['leaf', 'haldi', 'cream', 'saffron'];
  const days = `
  <section class="sp-days" id="days" aria-labelledby="days-title">
    <div class="sp-days__pin">
      <div class="sp-days__track">
        <div class="sp-days__intro">
          <p class="sp-kicker">${bi(fill('days.kicker', { count: { en: ['One', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][events.length] || String(events.length), ne: neNum(events.length) } }))}</p>
          <h2 class="sp-days__title" id="days-title">${bi(txt('days.title'))}</h2>
          <ol class="sp-prog">
            ${events.map((e, i) => `
            <li><button type="button" class="sp-prog__row" data-panel="${i + 1}">
              <span class="sp-prog__name">${bi(e.title)}</span>
              <span class="sp-prog__day">${bi(shortDay(e.start))}</span>
              <span class="sp-prog__time">${bi(timeOf(e.start))}</span>
            </button></li>`).join('')}
          </ol>
        </div>
        ${events.map((e, i) => {
          const tone = TONE[e.id] || TONES[i % TONES.length];
          const main = e.photo;
          return `
        <article class="sp-day sp-day--${tone}" aria-labelledby="day-${esc(e.id)}">
          <div class="sp-day__media">
            ${main ? `<figure class="sp-photo sp-day__photo">${pic(main, '', '(max-width: 760px) 70vw, 36vw')}</figure>` : ''}
          </div>
          <div class="sp-day__text">
            <h3 class="sp-day__title" id="day-${esc(e.id)}">${bi(e.title)}</h3>
            <p class="sp-day__when"><b>${bi(dateOf(e.start))}</b>${bsOf(e) ? `<span>${bi(bsOf(e))}</span>` : ''}</p>
            <dl class="sp-day__facts">
              <div><dt>${bi({ en: 'Time', ne: 'समय' })}</dt><dd>${bi(timeRange(e.start, e.end))}</dd></div>
              <div><dt>${bi({ en: 'Venue', ne: 'स्थान' })}</dt><dd>${bi(e.venue)} <a class="sp-map" href="${esc(mapUrl(e.mapQuery || e.venue?.en || ''))}" target="_blank" rel="noopener">${bi({ en: 'Map', ne: 'नक्सा' })}<span aria-hidden="true"> ↗</span></a></dd></div>
              ${e.dress?.text ? `<div><dt>${bi({ en: 'Wear', ne: 'पहिरन' })}</dt><dd><span class="sp-sw" aria-hidden="true">${(e.dress.colors || []).slice(0, 3).map((col) => `<i style="background:${esc(col)}"></i>`).join('')}</span>${bi(e.dress.text)}</dd></div>` : ''}
            </dl>
          </div>
        </article>`;
        }).join('')}
      </div>
    </div>
  </section>`;

  // Wedding-day rites in layered parallax rows.
  const riteId = (i) => `rites.${(i % 6) + 1}.photo`;
  const W = ev.wedding;
  const rites = W?.rituals?.length ? `
  <section class="sp-rites" id="wedding-day" aria-labelledby="rites-title">
    <header class="sp-rites__head">
      <p class="sp-kicker">${bi(dateOf(W.start))}${bsOf(W) ? ` · ${bi(bsOf(W))}` : ''}</p>
      <h2 class="sp-rites__title" id="rites-title">${bi(txt('rites.title'))}</h2>
      <p class="sp-rites__venue">${bi(W.venue)} <a class="sp-map" href="${esc(mapUrl(W.mapQuery || W.venue?.en || ''))}" target="_blank" rel="noopener">${bi({ en: 'Map', ne: 'नक्सा' })}<span aria-hidden="true"> ↗</span></a></p>
    </header>
    <ol class="sp-rites__list">
      ${W.rituals.map((r, i) => `
      <li class="sp-rite sp-rite--${i % 2 ? 'r' : 'l'}">
        ${img(riteId(i)) ? `<figure class="sp-photo sp-rite__photo">${pic(img(riteId(i)), alt(riteId(i)), '(max-width: 760px) 86vw, 42vw', 'loading="lazy"')}</figure>` : ''}
        <div class="sp-rite__text">
          <p class="sp-rite__time">${bi(timeObj(r.time))}</p>
          <h3 class="sp-rite__name">${bi(r.title)}</h3>
        </div>
      </li>`).join('')}
    </ol>
  </section>` : '';

  // Saptapadi: seven steps around the fire.
  const vows = config.saptapadi || [];
  const seven = vows.length ? `
  <section class="sp-seven" id="seven" aria-labelledby="seven-title">
    <div class="sp-seven__pin">
      <div class="sp-seven__head">
        <p class="sp-kicker">${bi(txt('seven.kicker'))}</p>
        <h2 class="sp-seven__title" id="seven-title">${bi(txt('seven.title'))}</h2>
      </div>
      <div class="sp-seven__ring">
        <figure class="sp-seven__fire">${pic(img('seven.fire'), alt('seven.fire'), '(max-width: 760px) 50vw, 22vw', 'loading="lazy"')}</figure>
        <ol class="sp-seven__steps" aria-hidden="true">
          ${vows.map((_, i) => `<li style="--a:${(360 / vows.length) * i}deg"><span>${bi({ en: String(i + 1), ne: neNum(i + 1) })}</span><i>${bi({ en: String(i + 1), ne: neNum(i + 1) })}</i></li>`).join('')}
        </ol>
      </div>
      <ol class="sp-seven__vows">
        ${vows.map((v, i) => `<li data-vow="${i}">${bi(v)}</li>`).join('')}
      </ol>
    </div>
  </section>` : '';

  const inv = config.invitation || {};
  const cardDialog = `
  <div class="sp-card" id="inv-card" hidden role="dialog" aria-modal="true" aria-labelledby="inv-card-title" data-lenis-prevent>
    <div class="sp-card__paper">
      <button type="button" class="sp-card__close" data-close-card><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
      <svg class="sp-bloom sp-card__bloom" aria-hidden="true"><use href="#sp-bloom"/></svg>
      ${inv.shloka ? `<p class="sp-card__shloka" lang="sa">${esc(inv.shloka.sa)}</p><p class="sp-card__shloka-en">${esc(inv.shloka.en)}</p>` : ''}
      <h2 class="sp-card__title" id="inv-card-title">${namePair()}</h2>
      ${inv.salutation ? `<p class="sp-card__p sp-card__sal">${bi(inv.salutation)}</p>` : ''}
      ${inv.body ? `<p class="sp-card__p">${bi(inv.body)}</p>` : ''}
      ${inv.request ? `<p class="sp-card__p">${bi(inv.request)}</p>` : ''}
      <p class="sp-card__date">${bi(dateOf(config.weddingDate))}<br /><small>${bi(config.weddingDateBS)}</small></p>
      ${inv.signoff ? `<p class="sp-card__sign">${bi(inv.signoff)}<br /><b>${bi(config.hosts)}</b></p>` : ''}
    </div>
  </div>`;

  document.body.insertAdjacentHTML('afterbegin', bloomSymbol());
  document.getElementById('main').innerHTML = hero + stack + join + days + rites + seven + cardDialog;

  const to = params.get('to');
  if (to) {
    const el = document.getElementById('gate-guest');
    el.replaceChildren(...biNodes(`Dear ${to.slice(0, 60)},`, `आदरणीय ${to.slice(0, 60)},`));
    el.hidden = false;
  }

  renderFinale(document.getElementById('finale-root'), { credits });
  // Gallery: an invitation is sent before the wedding, so no "memories" wording; the couple's photos
  // lead, and library photos (not the couple's) carry no captions.
  const gTitle = document.getElementById('gallery-title');
  if (gTitle) gTitle.innerHTML = bi(txt('gallery.title'));
  const gEyebrow = document.querySelector('.gallery__head .eyebrow');
  if (gEyebrow) gEyebrow.innerHTML = `${bi(bride.name)} &amp; ${bi(groom.name)}`;
  const isLib = (ref) => typeof ref === 'string' && !ref.startsWith('/') && !ref.startsWith('https://');
  const coupleKeys = new Set([...P.map((p) => keyOf(p.photo)), ...deck.map((d) => keyOf(d.photo)), keyOf(heroA), keyOf(heroB)]);
  const isCouple = (ref) => coupleKeys.has(keyOf(ref)) || (isLib(ref) && /^(couple|bride|groom)-/.test(ref));
  const gTrack = document.querySelector('.gallery__track');
  if (gTrack) {
    const items = [...gTrack.children];
    const ref = (li) => config.gallery?.[Number(li.querySelector('.gallery__btn')?.dataset.idx)]?.photo;
    items.sort((x, y) => Number(!isCouple(ref(x))) - Number(!isCouple(ref(y)))).forEach((li) => gTrack.append(li));
    items.forEach((li) => { if (isLib(ref(li))) li.querySelector('.gallery__cap')?.remove(); });
  }
  // Light petal-shower canvas, mounted above the content but never interactive.
  const petalCanvas = Object.assign(document.createElement('canvas'), { className: 'sp-petals', ariaHidden: 'true' });
  petalCanvas.setAttribute('aria-hidden', 'true');
  document.body.append(petalCanvas);

  const CH = [
    { id: 'welcome', name: txt('nav.welcome') },
    { id: 'couple', name: txt('nav.couple') },
    { id: 'join', name: txt('nav.join') },
    { id: 'days', name: txt('nav.days') },
    rites && { id: 'wedding-day', name: txt('nav.rites') },
    seven && { id: 'seven', name: txt('nav.seven') },
    { id: 'gallery', name: txt('nav.gallery') },
    { id: 'rsvp', name: txt('nav.reply') },
  ].filter(Boolean);
  const { player, setChapter } = mountShell({ chapters: CH.map((x) => x.name) });

  // Invitation card: core openModal locks the page (Lenis stopped, body fixed) so only the card scrolls.
  const dlg = document.getElementById('inv-card');
  const paper = dlg.querySelector('.sp-card__paper');
  let closeCard = null;
  document.querySelectorAll('[data-open-card]').forEach((b) => b.addEventListener('click', () => {
    paper.scrollTop = 0;
    closeCard = openModal(dlg, { scroller: paper, onClose: () => { dlg.hidden = true; closeCard = null; } });
  }));
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close-card]')) closeCard?.();
  });

  // ───────────────────────── motion ─────────────────────────
  const lenis = DEBUG || reduced ? null : createSmooth();
  lenis?.stop();
  const scrub = DEBUG ? true : mobile ? 0.5 : 0.8;
  if (reduced) document.body.classList.add('is-still');

  // Quiet first impression: frames rise, names settle. Transform/opacity only.
  if (!reduced) {
    gsap.from('.sp-hero__art > *', { y: 40, autoAlpha: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out', delay: 0.1 });
    gsap.from('.sp-hero__text > *', { y: 18, autoAlpha: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out', delay: 0.3 });
  }

  let petals = null;
  const sts = {};
  const buildMotion = () => {
    if (reduced) return;
    // Hero: layered parallax (each layer has its own speed in data-par, % of its height).
    document.querySelectorAll(mobile ? '.sp-hero__art [data-par]' : '.sp-hero [data-par]').forEach((el) => {
      gsap.to(el, { yPercent: Number(el.dataset.par), ease: 'none', scrollTrigger: { trigger: '.sp-hero', start: 'top top', end: 'bottom top', scrub: true } });
    });
    gsap.to('.sp-sun', { scale: 1.25, ease: 'none', scrollTrigger: { trigger: '.sp-hero', start: 'top top', end: 'bottom top', scrub: true } });

    // Couple: prints are dealt onto the stack; captions follow.
    const prints = gsap.utils.toArray('.sp-print');
    const capsEl = gsap.utils.toArray('.sp-cap');
    const tlS = gsap.timeline({ defaults: { ease: 'none' } });
    // Phones deal from the side so an incoming print never crosses the caption.
    const from = mobile ? { xPercent: 190, yPercent: -6 } : { xPercent: 0, yPercent: 230 };
    gsap.set(prints[0], { rotate: tilt[0] });
    gsap.set(prints.slice(1), { ...from, rotate: (i) => tilt[(i + 1) % tilt.length] * 3, autoAlpha: 1 });
    gsap.set(capsEl, { autoAlpha: 0, y: 24 });
    gsap.set(capsEl[capAt(0)], { autoAlpha: 1, y: 0 });
    let shown = capAt(0);
    prints.slice(1).forEach((p, k) => {
      const i = k + 1;
      tlS.to(p, { xPercent: 0, yPercent: 0, rotate: tilt[i % tilt.length], duration: 1, ease: 'power2.out' }, i);
      tlS.to(prints.slice(0, i), { scale: '-=0.035', yPercent: '-=2.5', duration: 1 }, i);
      const ci = capAt(i);
      if (ci !== shown) {
        tlS.to(capsEl[shown], { autoAlpha: 0, y: -20, duration: 0.35 }, i + 0.15);
        tlS.to(capsEl[ci], { autoAlpha: 1, y: 0, duration: 0.45 }, i + 0.5);
        shown = ci;
      }
    });
    tlS.to({}, { duration: 0.6 });
    sts.couple = ScrollTrigger.create({ trigger: '.sp-stack', start: 'top top', end: () => `+=${prints.length * window.innerHeight * 0.75}`, pin: '.sp-stack__pin', scrub, animation: tlS, anticipatePin: 1 });

    // Signature: the two halves travel in from opposite sides and close the gap.
    const tlJ = gsap.timeline({ defaults: { ease: 'none' } });
    tlJ.fromTo('.sp-join__half--l', { xPercent: -88, rotate: -7, y: 30 }, { xPercent: 0, rotate: 0, y: 0, duration: 1, ease: 'power2.inOut' }, 0)
      .fromTo('.sp-join__half--r', { xPercent: 88, rotate: 7, y: -30 }, { xPercent: 0, rotate: 0, y: 0, duration: 1, ease: 'power2.inOut' }, 0)
      .fromTo('.sp-join__w1', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.35)
      .fromTo('.sp-join__w2', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.75)
      .fromTo('.sp-join__thread', { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: 'power2.out' }, 0.98)
      .fromTo('.sp-join__frame', { scale: 0.94 }, { scale: 1, duration: 0.4, ease: 'power1.out' }, 1)
      .to({}, { duration: 0.35 });
    sts.join = ScrollTrigger.create({ trigger: '.sp-join', start: 'top top', end: () => `+=${window.innerHeight * 1.9}`, pin: '.sp-join__pin', scrub, animation: tlJ, anticipatePin: 1 });

    // Celebrations: vertical scroll drives a horizontal run.
    const track = document.querySelector('.sp-days__track');
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, { x: () => -dist(), ease: 'none' });
    // Settle on whole panels when the guest stops scrolling.
    const stops = () => [...track.children].map((el) => Math.min(1, el.offsetLeft / (dist() || 1)));
    sts.days = ScrollTrigger.create({
      trigger: '.sp-days', start: 'top top', end: () => `+=${dist()}`, pin: '.sp-days__pin', scrub, animation: tween, invalidateOnRefresh: true, anticipatePin: 1,
      snap: DEBUG ? false : { snapTo: (v) => stops().reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a), 0), duration: { min: 0.25, max: 0.7 }, delay: 0.12, ease: 'power2.inOut' },
    });
    gsap.utils.toArray('.sp-day').forEach((day) => {
      const d = day.querySelector('.sp-day__drift');
      if (d) gsap.fromTo(d, { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: day, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      const a = day.querySelector('.sp-day__acc');
      if (a) gsap.fromTo(a, { x: 60, rotate: -12 }, { x: -60, rotate: 10, ease: 'none', scrollTrigger: { trigger: day, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });

    // Rites: each row's photo floats at its own speed; text settles in.
    gsap.utils.toArray('.sp-rite').forEach((row, i) => {
      const ph = row.querySelector('.sp-rite__photo');
      gsap.fromTo(ph, { y: 90 + (i % 3) * 30 }, { y: -(70 + (i % 3) * 30), ease: 'none', scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from(row.querySelector('.sp-rite__text'), { y: 40, autoAlpha: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 72%', toggleActions: 'play none none reverse' } });
    });
    gsap.from('.sp-rites__head > *', { y: 30, autoAlpha: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.sp-rites__head', start: 'top 78%', toggleActions: 'play none none reverse' } });

    // Saptapadi: steps light one by one around the fire.
    const steps = gsap.utils.toArray('.sp-seven__steps li');
    const vowEls = gsap.utils.toArray('.sp-seven__vows li');
    if (steps.length) {
      const tl7 = gsap.timeline({ defaults: { ease: 'none' } });
      gsap.set(vowEls, { autoAlpha: 0, y: 16 });
      tl7.to('.sp-seven__fire img', { rotate: 40, duration: steps.length + 1 }, 0);
      gsap.set('.sp-seven__steps i', { autoAlpha: 0, scale: 0.4 });
      steps.forEach((s, i) => {
        tl7.to(s.querySelector('i'), { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, i + 0.5);
        tl7.to(vowEls[i], { autoAlpha: 1, y: 0, duration: 0.3 }, i + 0.5);
        if (i < steps.length - 1) tl7.to(vowEls[i], { autoAlpha: 0, y: -16, duration: 0.3 }, i + 1.3);
      });
      tl7.to({}, { duration: 0.6 });
      sts.seven = ScrollTrigger.create({ trigger: '.sp-seven', start: 'top top', end: () => `+=${steps.length * window.innerHeight * 0.45}`, pin: '.sp-seven__pin', scrub, animation: tl7, anticipatePin: 1 });
    }

    // Gallery collage: three speeds.
    gsap.utils.toArray('.gallery__item').forEach((it, i) => {
      const sp = [40, -30, 70][i % 3] * (mobile ? 0.5 : 1);
      gsap.fromTo(it, { y: sp }, { y: -sp, ease: 'none', scrollTrigger: { trigger: it, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.utils.toArray('.sp-reveal, .gallery__head, .letter, .finale__count, .info__col, .blessing > *').forEach((el) => {
      gsap.from(el, { y: 30, autoAlpha: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' } });
    });
  };

  // Chapters + petals visibility follow the scroll.
  const chapterOf = () => {
    const y = window.scrollY + window.innerHeight * 0.45;
    let idx = 0;
    CH.forEach((ch, i) => {
      const st = sts[ch.id];
      const el = document.getElementById(ch.id);
      const top = st ? st.start : el ? el.getBoundingClientRect().top + window.scrollY : Infinity;
      if (y >= top) idx = i;
    });
    return idx;
  };
  let lastCh = -1;
  const onScroll = () => {
    const i = chapterOf();
    if (i !== lastCh) { lastCh = i; setChapter(i); }
    if (petals) {
      const heroH = document.querySelector('.sp-hero').offsetHeight;
      const blessing = document.querySelector('.blessing');
      const nearEnd = blessing && blessing.getBoundingClientRect().top < window.innerHeight * 0.9;
      petals.setVisible(window.scrollY < heroH * 0.85 || nearEnd ? 1 : 0);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  document.querySelector('.chapters')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-chapter]');
    if (!b) return;
    const ch = CH[Number(b.dataset.chapter)];
    const st = sts[ch.id];
    const el = document.getElementById(ch.id);
    const y = st ? st.start + 2 : el.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y, { duration: 1.6 }); else window.scrollTo(0, y);
  });

  document.querySelector('.sp-prog')?.addEventListener('click', (e) => {
    const row = e.target.closest('[data-panel]');
    const st = sts.days;
    if (!row || !st) return;
    const track = document.querySelector('.sp-days__track');
    const el = track.children[Number(row.dataset.panel)];
    const d = track.scrollWidth - window.innerWidth;
    const y = st.start + (st.end - st.start) * Math.min(1, el.offsetLeft / (d || 1));
    if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo(0, y);
  });

  const loadPetals = async () => {
    if (reduced || petals) return;
    try {
      const { createPetals } = await import('./petals.js');
      petals = createPetals(petalCanvas, { mobile });
      onScroll();
    } catch (err) {
      console.warn('Petals unavailable', err);
    }
  };

  let opened = false;
  const open = (withMusic) => {
    if (opened) return;
    opened = true;
    player.unlock();
    ringBell(player.ctx, { when: 0.05, gain: 0.16 });
    if (withMusic) setTimeout(() => player.start(true), 400);
    const done = () => {
      document.body.classList.remove('is-gated');
      document.getElementById('gate').hidden = true;
      buildMotion();
      ScrollTrigger.refresh();
      lenis?.start();
      onScroll();
      loadPetals();
    };
    if (reduced) return done();
    gsap.to('#gate', { autoAlpha: 0, y: 16, duration: 0.45, ease: 'power2.in', onComplete: done });
  };
  document.getElementById('enter-music').addEventListener('click', () => open(true));
  document.getElementById('enter-quiet').addEventListener('click', () => open(false));
  if (params.has('open')) open(false);

  // Frames take each photo's own proportions, so layout settles as images arrive.
  const joinFrame = document.querySelector('.sp-join__frame');
  const joinImg = joinFrame?.querySelector('img');
  const setAr = () => { if (joinImg?.naturalWidth) joinFrame.style.setProperty('--ar', (joinImg.naturalWidth / joinImg.naturalHeight).toFixed(4)); };
  if (joinImg?.complete) setAr(); else joinImg?.addEventListener('load', setAr);
  let refreshT;
  const refreshSoon = () => { clearTimeout(refreshT); refreshT = setTimeout(() => { if (opened && !reduced) ScrollTrigger.refresh(); }, 250); };
  document.querySelectorAll('#main img').forEach((im) => { if (!im.complete) im.addEventListener('load', refreshSoon, { once: true }); });

  // Images inside pinned sections can change heights after load; refresh once fonts settle.
  document.fonts?.ready.then(() => { if (opened) ScrollTrigger.refresh(); });
  window.addEventListener('load', () => { if (opened) ScrollTrigger.refresh(); });

  if (DEBUG) {
    window.__sp = {
      sts, ScrollTrigger, open,
      /** Scroll to a chapter id at progress p (0..1 within a pinned section). */
      panel(i) {
        const st = sts.days;
        const el = document.querySelector('.sp-days__track').children[i];
        const d = document.querySelector('.sp-days__track').scrollWidth - window.innerWidth;
        window.scrollTo(0, st.start + (st.end - st.start) * Math.min(1, el.offsetLeft / d));
        ScrollTrigger.update();
      },
      go(id, p = 0) {
        const st = sts[id];
        const el = document.getElementById(id) || document.querySelector(id);
        const y = st ? st.start + (st.end - st.start) * p : el.getBoundingClientRect().top + window.scrollY + (el.offsetHeight * p);
        window.scrollTo(0, y);
        ScrollTrigger.update();
        return y;
      },
    };
  }
}

main();
