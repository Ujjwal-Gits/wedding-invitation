// Sayapatri · floral wedding stage.
// The guest enters through a lush floral gate (real cut-out flower photography composed into
// layers); the gate parts as the camera walks through it. Inside, a light page where floral
// arrangements frame each section and the couple's photos sit in different premium frames
// (floral arch, framed pair, edge-to-edge photo row, polaroid prints), then a crystal-clear
// programme, photos and RSVP. Quiet motion everywhere else.
import '../../core/base.css';
import './sayapatri.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadInvitation } from '../../core/data.js';
import { photoUrl, photos } from '../../photos.js';
import { bi, esc, dateOf, timeLabel, mapUrl, biNodes, neNum, bsDateOf } from '../../core/i18n.js';
import { mountShell, ringBell } from '../../core/shell.js';
import { createSmooth, reducedMotion, isMobile } from '../../core/smooth.js';
import { renderFinale, guestEvents } from '../../core/finale.js';
import { useSlots } from '../../core/slots.js';
import { openModal } from '../../core/modal.js';
import credits from '../../generated/credits.json';
import floraCredits from './flora-credits.json';
import manifest from './slots.js';

gsap.registerPlugin(ScrollTrigger);

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const FLORA = '/themes/sayapatri/flora/';

// ───────────────────────── helpers ─────────────────────────
const focalOf = (ref) => {
  const f = (typeof ref === 'string' && photos[ref]?.focal) || (ref && typeof ref === 'object' && Array.isArray(ref.focal) && ref.focal) || [0.5, 0.5];
  const n = (v) => Math.min(100, Math.max(0, Number(v) * 100 || 50)).toFixed(1);
  return `${n(f[0])}% ${n(f[1])}%`;
};
/** Responsive <img> for any photo reference. Known pixel size is passed on so layout never jumps. */
const pic = (ref, alt = '', sizes = '50vw', extra = '') => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  const set = sm && lg && sm !== lg ? ` srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w" sizes="${esc(sizes)}"` : '';
  const wh = ref && typeof ref === 'object' && ref.w && ref.h ? ` width="${Number(ref.w)}" height="${Number(ref.h)}"` : '';
  return `<img src="${esc(sm || lg)}"${set}${wh} alt="${esc(alt)}" style="object-position:${focalOf(ref)}" decoding="async" ${extra} />`;
};
/** Floral layer (transparent WebP with a half-size twin for phones). Decorative. */
const flora = (name, cls, [w, sw, sizes]) => `<img class="fl ${cls}" src="${FLORA}${name}-sm.webp" srcset="${FLORA}${name}-sm.webp ${sw}w, ${FLORA}${name}.webp ${w}w" sizes="${sizes}" alt="" aria-hidden="true" decoding="async" />`;
// [full width, small width, sizes] for each floral layer.
const FW = {
  'gate-left': [900, 450, '(max-width: 760px) 90vw, 32vw'], 'gate-right': [900, 450, '(max-width: 760px) 90vw, 32vw'],
  'gate-top': [2000, 1200, '(max-width: 760px) 210vw, 118vw'], 'corner-l': [1100, 550, '(max-width: 760px) 62vw, 36vw'],
  'corner-r': [1100, 550, '(max-width: 760px) 58vw, 34vw'], spray: [1400, 700, '(max-width: 760px) 80vw, 36vw'],
  'frame-base': [1500, 750, '(max-width: 760px) 100vw, 46vw'],
};
const fl = (name, cls) => flora(name, cls, FW[name]);

const TZ = 'Asia/Kathmandu';
/** Pieces of the AD date for the programme's date block. */
const dateParts = (iso) => {
  const d = new Date(iso);
  const f = (o) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...o }).format(d);
  const ne = dateOf(iso).ne.split(', '); // [weekday, "month day", year]
  const [neMonth, neDay] = (ne[1] || '').split(' ');
  return {
    day: { en: f({ day: 'numeric' }), ne: neDay || '' },
    month: { en: `${f({ month: 'long' })} ${f({ year: 'numeric' })}`, ne: `${neMonth || ''} ${ne[2] || ''}` },
    weekday: { en: f({ weekday: 'long' }), ne: ne[0] || '' },
  };
};
const timeObj = (t) => (typeof t === 'string' ? { en: t, ne: neNum(t) } : t || { en: '', ne: '' });

async function main() {
  const config = await loadInvitation();
  if (DEBUG && params.get('slots')) {
    try { config.themeContent = { ...(config.themeContent || {}), sayapatri: JSON.parse(params.get('slots')) }; } catch (err) { console.warn('bad ?slots JSON', err); }
  }
  const { img, txt, alt } = useSlots(manifest);
  const fill = (id, vars = {}) => {
    const t = txt(id);
    const sub = (str, lang) => String(str).replace(/\{(\w+)\}/g, (_, k) => {
      const v = vars[k];
      return (v && typeof v === 'object' ? v[lang] ?? v.en : v) ?? '';
    });
    return { en: sub(t.en, 'en'), ne: sub(t.ne, 'ne') };
  };
  const reduced = reducedMotion() || params.has('still');
  const mobile = isMobile();
  const c = config.couple;
  const bride = c.bride;
  const groom = c.groom;
  const events = guestEvents();
  const P = (c.portraits || []).filter((p) => p && p.photo);
  const keyOf = (ref) => (typeof ref === 'string' ? ref : ref?.lg);
  const altOf = (id, ref) => P.find((p) => keyOf(p.photo) === keyOf(ref))?.alt || alt(id);
  const used = new Set();
  /** Slot photo, skipping one already shown elsewhere on the page when the couple has enough photos. */
  const slot = (id) => {
    let ref = img(id);
    if (ref && used.has(keyOf(ref))) {
      const spare = P.find((p) => !used.has(keyOf(p.photo)));
      if (spare) ref = spare.photo;
    }
    if (ref) used.add(keyOf(ref));
    return ref;
  };
  const bs = (e) => {
    const b = bsDateOf(e.start, e.dateBS);
    // Short form: the weekday is already on the AD line above it.
    return e.dateBS && (e.dateBS.en || e.dateBS.ne) ? { en: e.dateBS.en || e.dateBS.ne, ne: e.dateBS.ne || e.dateBS.en } : { en: `${b.short.en} B.S.`, ne: `वि.सं. ${b.short.ne}` };
  };

  const namePair = (tag = 'span') => `
    <${tag} class="fl-names__a">${bi(bride.name)}</${tag}>
    <span class="fl-names__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span>
    <${tag} class="fl-names__b">${bi(groom.name)}</${tag}>`;
  const weddingDay = { start: config.weddingDate, dateBS: events.find((e) => e.id === 'wedding')?.dateBS };

  // ───────────────────────── gate ─────────────────────────
  const gate = `
  <div class="fl-gate" id="gate">
    <div class="fl-gate__bloom fl-gate__bloom--l" aria-hidden="true">${fl('gate-left', 'fl-gate__col')}</div>
    <div class="fl-gate__bloom fl-gate__bloom--r" aria-hidden="true">${fl('gate-right', 'fl-gate__col')}</div>
    <div class="fl-gate__bloom fl-gate__bloom--t" aria-hidden="true">${fl('gate-top', 'fl-gate__canopy')}</div>
    <div class="fl-gate__card">
      <p class="fl-kicker">${bi(txt('gate.kicker'))}</p>
      <p class="fl-names fl-names--gate">${namePair()}</p>
      <p class="fl-gate__date">${bi(dateOf(config.weddingDate))}<br /><span>${bi(bs(weddingDay))}</span></p>
      <p class="fl-gate__line">${bi(txt('gate.line'))}</p>
      <p class="fl-gate__guest" id="gate-guest" hidden></p>
      <div class="fl-gate__choices">
        <button type="button" class="fl-btn" id="enter-music">${bi(txt('gate.open'))}</button>
        <button type="button" class="fl-quiet" id="enter-quiet">${bi(txt('gate.quiet'))}</button>
      </div>
    </div>
  </div>`;

  // ───────────────────────── welcome: floral arch ─────────────────────────
  const heroRef = slot('hero.photo');
  const hero = `
  <section class="fl-hero" id="welcome" aria-labelledby="hero-names">
    ${fl('corner-l', 'fl-hero__corner')}
    <div class="fl-hero__text">
      <p class="fl-kicker">${bi(txt('hero.kicker'))}</p>
      <h1 class="fl-names" id="hero-names">${namePair()}</h1>
      <p class="fl-hero__date">${bi(dateOf(config.weddingDate))}<span class="fl-dot" aria-hidden="true"></span>${bi(config.city)}</p>
      <p class="fl-hero__line">${bi(txt('hero.line'))}</p>
    </div>
    ${heroRef ? `
    <figure class="fl-arch" data-reveal>
      <div class="fl-arch__photo">${pic(heroRef, altOf('hero.photo', heroRef), '(max-width: 760px) 84vw, 36vw')}</div>
      ${fl('frame-base', 'fl-arch__flowers')}
    </figure>` : ''}
  </section>`;

  // ───────────────────────── couple: framed pair ─────────────────────────
  const pairL = slot('pair.left');
  const pairR = slot('pair.right');
  const framed = (ref, id) => (ref ? `<figure class="fl-frame" data-reveal><span class="fl-frame__mat">${pic(ref, altOf(id, ref), '(max-width: 760px) 44vw, 26vw', 'loading="lazy"')}</span></figure>` : '');
  const pair = `
  <section class="fl-pair" id="couple" aria-labelledby="pair-title">
    ${fl('spray', 'fl-pair__spray')}
    <h2 class="fl-title" id="pair-title" data-reveal>${bi(txt('pair.title'))}</h2>
    <div class="fl-pair__frames">${framed(pairL, 'pair.left')}${framed(pairR, 'pair.right')}</div>
    <div class="fl-pair__families" data-reveal>
      <div><p class="fl-pair__name">${bi(bride.fullName || bride.name)}</p><p class="fl-pair__line">${bi(fill('pair.bride.line', { parents: bride.parents || '' }))}</p></div>
      <span class="fl-pair__amp" aria-hidden="true">&amp;</span>
      <div><p class="fl-pair__name">${bi(groom.fullName || groom.name)}</p><p class="fl-pair__line">${bi(fill('pair.groom.line', { parents: groom.parents || '' }))}</p></div>
    </div>
    <p class="fl-pair__hosts" data-reveal>${bi(config.hosts)}</p>
    <button type="button" class="fl-link" data-open-card>${bi(txt('pair.card'))}</button>
  </section>`;

  // ───────────────────────── photo row (edge to edge, no crop) ─────────────────────────
  const band = ['band.1', 'band.2', 'band.3'].map((id) => ({ id, ref: slot(id) })).filter((b) => b.ref);
  const bandHtml = band.length ? `
  <section class="fl-band" aria-label="${esc('Photos of the couple')}">
    <div class="fl-band__row">${band.map((b) => `<figure class="fl-band__item">${pic(b.ref, altOf(b.id, b.ref), '(max-width: 760px) 50vw, 34vw', 'loading="lazy"')}</figure>`).join('')}</div>
  </section>` : '';

  // ───────────────────────── polaroid prints ─────────────────────────
  const prints = ['prints.1', 'prints.2', 'prints.3'].map((id) => ({ id, ref: slot(id) })).filter((b) => b.ref);
  const printsHtml = prints.length ? `
  <section class="fl-prints" aria-labelledby="prints-title">
    ${fl('corner-r', 'fl-prints__corner')}
    <h2 class="fl-title" id="prints-title" data-reveal>${bi(txt('prints.title'))}</h2>
    <div class="fl-prints__row">
      ${prints.map((p, i) => `<figure class="fl-print" style="--tilt:${[-4, 2.5, -1.5][i]}deg">${pic(p.ref, altOf(p.id, p.ref), '(max-width: 760px) 70vw, 26vw', 'loading="lazy"')}</figure>`).join('')}
    </div>
  </section>` : '';

  // ───────────────────────── programme ─────────────────────────
  const prog = `
  <section class="fl-prog" id="programme" aria-labelledby="prog-title">
    <header class="fl-prog__head" data-reveal>
      <p class="fl-kicker">${bi(txt('prog.kicker'))}</p>
      <h2 class="fl-title" id="prog-title">${bi(txt('prog.title'))}</h2>
    </header>
    <ol class="fl-events">
      ${events.map((e) => {
        const d = dateParts(e.start);
        return `
      <li class="fl-ev" data-reveal>
        <div class="fl-ev__date" aria-hidden="true">
          <span class="fl-ev__wd">${bi(d.weekday)}</span>
          <span class="fl-ev__day">${bi(d.day)}</span>
          <span class="fl-ev__mon">${bi(d.month)}</span>
        </div>
        <div class="fl-ev__body">
          <h3 class="fl-ev__title">${bi(e.title)}</h3>
          <p class="fl-ev__when"><b>${bi(dateOf(e.start))}</b><span>${bi(bs(e))}</span></p>
          <dl class="fl-ev__facts">
            <div><dt>${bi({ en: 'Time', ne: 'समय' })}</dt><dd>${bi(timeLabel(e))}</dd></div>
            <div><dt>${bi({ en: 'Venue', ne: 'स्थान' })}</dt><dd>${bi(e.venue)} <a class="fl-map" href="${esc(mapUrl(e.mapQuery || e.venue?.en || ''))}" target="_blank" rel="noopener">${bi({ en: 'Map', ne: 'नक्सा' })}<span aria-hidden="true"> ↗</span></a></dd></div>
            ${e.dress?.text?.en || e.dress?.text?.ne ? `<div><dt>${bi({ en: 'Wear', ne: 'पहिरन' })}</dt><dd><span class="fl-sw" aria-hidden="true">${(e.dress.colors || []).slice(0, 3).map((col) => `<i style="background:${esc(col)}"></i>`).join('')}</span>${bi(e.dress.text)}</dd></div>` : ''}
          </dl>
          ${e.rituals?.length ? `<ol class="fl-ev__rites">${e.rituals.map((r) => `<li><span>${bi(timeObj(r.time))}</span>${bi(r.title)}</li>`).join('')}</ol>` : ''}
        </div>
      </li>`;
      }).join('')}
    </ol>
  </section>`;

  const inv = config.invitation || {};
  const cardDialog = `
  <div class="fl-card" id="inv-card" hidden role="dialog" aria-modal="true" aria-labelledby="inv-card-title" data-lenis-prevent>
    <div class="fl-card__paper">
      <button type="button" class="fl-card__close" data-close-card><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
      ${fl('spray', 'fl-card__spray')}
      ${inv.shloka ? `<p class="fl-card__shloka" lang="sa">${esc(inv.shloka.sa)}</p><p class="fl-card__shloka-en">${esc(inv.shloka.en)}</p>` : ''}
      <h2 class="fl-card__title" id="inv-card-title">${namePair()}</h2>
      ${inv.salutation ? `<p class="fl-card__p fl-card__sal">${bi(inv.salutation)}</p>` : ''}
      ${inv.body ? `<p class="fl-card__p">${bi(inv.body)}</p>` : ''}
      ${inv.request ? `<p class="fl-card__p">${bi(inv.request)}</p>` : ''}
      <p class="fl-card__date">${bi(dateOf(config.weddingDate))}<br /><small>${bi(bs(weddingDay))}</small></p>
      ${inv.signoff ? `<p class="fl-card__sign">${bi(inv.signoff)}<br /><b>${bi(config.hosts)}</b></p>` : ''}
    </div>
  </div>`;

  document.getElementById('main').innerHTML = hero + pair + bandHtml + printsHtml + prog + cardDialog;
  document.body.insertAdjacentHTML('afterbegin', gate);

  const to = params.get('to');
  if (to) {
    const el = document.getElementById('gate-guest');
    el.replaceChildren(...biNodes(`Dear ${to.slice(0, 60)},`, `आदरणीय ${to.slice(0, 60)},`));
    el.hidden = false;
  }

  renderFinale(document.getElementById('finale-root'), { credits: [...credits, ...floraCredits] });
  // Gallery: neutral, forward-looking title; couple photos first; library photos uncaptioned.
  const gTitle = document.getElementById('gallery-title');
  if (gTitle) gTitle.innerHTML = bi(txt('gallery.title'));
  const gEyebrow = document.querySelector('.gallery__head .eyebrow');
  if (gEyebrow) gEyebrow.innerHTML = `${bi(bride.name)} &amp; ${bi(groom.name)}`;
  const isLib = (ref) => typeof ref === 'string' && !ref.startsWith('/') && !ref.startsWith('https://');
  const coupleKeys = new Set([...P.map((p) => keyOf(p.photo)), ...used]);
  const isCouple = (ref) => coupleKeys.has(keyOf(ref)) || (isLib(ref) && /^(couple|bride|groom)-/.test(ref)) || !isLib(ref);
  const gTrack = document.querySelector('.gallery__track');
  if (gTrack) {
    const items = [...gTrack.children];
    const ref = (li) => config.gallery?.[Number(li.querySelector('.gallery__btn')?.dataset.idx)]?.photo;
    items.sort((x, y) => Number(!isCouple(ref(x))) - Number(!isCouple(ref(y)))).forEach((li) => gTrack.append(li));
    items.forEach((li) => { if (isLib(ref(li))) li.querySelector('.gallery__cap')?.remove(); });
  }
  // Hide guest-info columns the couple left empty (no dress notes, no travel text).
  document.querySelectorAll('.info__col').forEach((col) => {
    const text = [...col.querySelectorAll('li, .info__p')].map((n) => n.textContent.trim()).join('');
    if (!text) col.hidden = true;
  });
  const dressItems = [...document.querySelectorAll('.dress li')];
  dressItems.forEach((li) => { if (!li.querySelector('small')?.textContent.trim()) li.hidden = true; });
  if (dressItems.length && dressItems.every((li) => li.hidden)) dressItems[0].closest('.info__col').hidden = true;
  // Floral frame on the reply letter and a round photo above the blessing.
  document.querySelector('.letter')?.insertAdjacentHTML('afterbegin', fl('corner-l', 'fl-letter__corner'));
  const closing = slot('closing.photo');
  const blessing = document.querySelector('.blessing');
  if (blessing) {
    blessing.insertAdjacentHTML('afterbegin', `${closing ? `<figure class="fl-closing"><span>${pic(closing, altOf('closing.photo', closing), '200px', 'loading="lazy"')}</span></figure>` : ''}${fl('spray', 'fl-blessing__spray')}`);
  }

  const petalCanvas = document.createElement('canvas');
  petalCanvas.className = 'sp-petals';
  petalCanvas.setAttribute('aria-hidden', 'true');
  document.body.append(petalCanvas);

  const CH = [
    { id: 'welcome', name: txt('nav.welcome') },
    { id: 'couple', name: txt('nav.couple') },
    { id: 'programme', name: txt('nav.prog') },
    { id: 'gallery', name: txt('nav.gallery') },
    { id: 'rsvp', name: txt('nav.reply') },
  ];
  const { player, setChapter } = mountShell({ chapters: CH.map((x) => x.name) });

  // Invitation card: core openModal locks the page so only the card scrolls.
  const dlg = document.getElementById('inv-card');
  const paper = dlg.querySelector('.fl-card__paper');
  let closeCard = null;
  document.querySelectorAll('[data-open-card]').forEach((b) => b.addEventListener('click', () => {
    paper.scrollTop = 0;
    closeCard = openModal(dlg, { scroller: paper, onClose: () => { dlg.hidden = true; closeCard = null; } });
  }));
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close-card]')) closeCard?.();
  });

  // Arch frame: landscape photos get a soft rectangle instead of an arch (never crop a wide photo).
  const archImg = document.querySelector('.fl-arch__photo img');
  const markShape = () => { if (archImg?.naturalWidth) document.querySelector('.fl-arch').classList.toggle('is-land', archImg.naturalWidth > archImg.naturalHeight * 1.05); };
  if (archImg?.complete) markShape(); else archImg?.addEventListener('load', markShape);

  // Photo row: justified rows that fill the width exactly with every photo whole.
  const row = document.querySelector('.fl-band__row');
  const layoutBand = () => {
    if (!row) return;
    const figs = [...row.children];
    const ratios = figs.map((f) => { const i = f.querySelector('img'); return i.naturalWidth ? i.naturalWidth / i.naturalHeight : (Number(i.getAttribute('width')) / Number(i.getAttribute('height'))) || 0.75; });
    const per = window.innerWidth <= 760 ? 2 : 3;
    const gap = window.innerWidth <= 760 ? 8 : 14;
    const W = row.clientWidth;
    for (let s = 0; s < figs.length; s += per) {
      const grp = figs.slice(s, s + per);
      const rs = ratios.slice(s, s + per);
      const sum = rs.reduce((a, b) => a + b, 0);
      let h = (W - gap * (grp.length - 1)) / sum;
      h = Math.min(h, window.innerHeight * (grp.length === 1 ? 0.8 : 0.78));
      grp.forEach((f, k) => { f.style.width = `${Math.floor(rs[k] * h)}px`; f.style.height = `${Math.floor(h)}px`; });
    }
  };
  row?.querySelectorAll('img').forEach((i) => { if (!i.complete) i.addEventListener('load', () => { layoutBand(); ScrollTrigger.refresh(); }, { once: true }); });
  layoutBand();
  window.addEventListener('resize', layoutBand);

  // ───────────────────────── motion ─────────────────────────
  const lenis = DEBUG || reduced ? null : createSmooth();
  lenis?.stop();
  if (reduced) document.body.classList.add('is-still');

  if (!reduced) {
    gsap.from('.fl-gate__bloom--t', { yPercent: -18, autoAlpha: 0, duration: 1.1, ease: 'power3.out' });
    gsap.from('.fl-gate__bloom--l', { xPercent: -14, autoAlpha: 0, duration: 1.1, ease: 'power3.out', delay: 0.05 });
    gsap.from('.fl-gate__bloom--r', { xPercent: 14, autoAlpha: 0, duration: 1.1, ease: 'power3.out', delay: 0.05 });
    gsap.from('.fl-gate__card > *', { y: 14, autoAlpha: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out', delay: 0.35 });
  }

  let petals = null;
  const buildMotion = () => {
    if (reduced) return;
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      gsap.from(el, { y: 28, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' } });
    });
    // Florals drift a little slower than the page: layered depth, not zoom.
    gsap.utils.toArray('.fl-hero__corner, .fl-pair__spray, .fl-prints__corner, .fl-arch__flowers').forEach((el) => {
      gsap.fromTo(el, { y: 30 }, { y: -30, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // Prints are dealt onto the table as they arrive.
    gsap.utils.toArray('.fl-print').forEach((p, i) => {
      gsap.from(p, { y: 80, rotate: (i - 1) * 9, autoAlpha: 0, duration: 0.9, ease: 'power3.out', delay: i * 0.12, scrollTrigger: { trigger: '.fl-prints__row', start: 'top 80%' } });
    });
    gsap.from('.fl-band__item', { y: 40, autoAlpha: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.fl-band', start: 'top 82%' } });
    gsap.utils.toArray('.letter, .finale__count, .info__col, .blessing > *').forEach((el) => {
      gsap.from(el, { y: 26, autoAlpha: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });
  };

  const chapterOf = () => {
    const y = window.scrollY + window.innerHeight * 0.45;
    let idx = 0;
    CH.forEach((ch, i) => { const el = document.getElementById(ch.id); if (el && y >= el.getBoundingClientRect().top + window.scrollY) idx = i; });
    return idx;
  };
  let lastCh = -1;
  const onScroll = () => {
    const i = chapterOf();
    if (i !== lastCh) { lastCh = i; setChapter(i); }
    if (petals) {
      const heroH = document.querySelector('.fl-hero').offsetHeight;
      const end = document.querySelector('.blessing');
      const nearEnd = end && end.getBoundingClientRect().top < window.innerHeight * 0.85;
      petals.setVisible(window.scrollY < heroH * 0.7 || nearEnd ? 1 : 0);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  document.querySelector('.chapters')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-chapter]');
    if (!b) return;
    const el = document.getElementById(CH[Number(b.dataset.chapter)].id);
    const y = el.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y, { duration: 1.4 }); else window.scrollTo(0, y);
  });

  const loadPetals = async () => {
    if (reduced || petals) return;
    try {
      const { createPetals } = await import('./petals.js');
      petals = createPetals(petalCanvas, { mobile });
      petals.burst(true);
      onScroll();
    } catch (err) { console.warn('Petals unavailable', err); }
  };

  let opened = false;
  const gateEl = document.getElementById('gate');
  const open = (withMusic) => {
    if (opened) return;
    opened = true;
    player.unlock();
    ringBell(player.ctx, { when: 0.05, gain: 0.14 });
    if (withMusic) setTimeout(() => player.start(true), 400);
    window.scrollTo(0, 0);
    const done = () => {
      gateEl.hidden = true;
      document.body.classList.remove('is-opening');
      document.body.classList.remove('is-gated');
      buildMotion();
      ScrollTrigger.refresh();
      lenis?.start();
      onScroll();
      document.getElementById('hero-names')?.focus?.({ preventScroll: true });
    };
    if (reduced) return done();
    loadPetals();
    document.body.classList.add('is-opening');
    // Signature: the gate parts and the camera walks through it into the page.
    gsap.timeline({ onComplete: done })
      .to('.fl-gate__card', { autoAlpha: 0, scale: 0.96, duration: 0.45, ease: 'power2.in' }, 0)
      .to('.fl-gate__bloom--l', { xPercent: -95, scale: 1.35, duration: 1.5, ease: 'power3.inOut' }, 0.2)
      .to('.fl-gate__bloom--r', { xPercent: 95, scale: 1.35, duration: 1.5, ease: 'power3.inOut' }, 0.2)
      .to('.fl-gate__bloom--t', { yPercent: -85, scale: 1.3, duration: 1.5, ease: 'power3.inOut' }, 0.2)
      .to(gateEl, { '--veil': 0, duration: 0.9, ease: 'power2.out' }, 0.7)
      .fromTo('.fl-hero', { scale: 0.94, transformOrigin: '50% 40%' }, { scale: 1, duration: 1.5, ease: 'power3.out', clearProps: 'transform' }, 0.25);
  };
  document.getElementById('enter-music').addEventListener('click', () => open(true));
  document.getElementById('enter-quiet').addEventListener('click', () => open(false));
  if (params.has('open')) open(false);

  document.fonts?.ready.then(() => { if (opened) ScrollTrigger.refresh(); });
  window.addEventListener('load', () => { layoutBand(); if (opened) ScrollTrigger.refresh(); });

  if (DEBUG) {
    window.__sp = {
      ScrollTrigger, open,
      go(id, p = 0) {
        const el = document.getElementById(id) || document.querySelector(id);
        const y = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * p;
        window.scrollTo(0, y);
        ScrollTrigger.update();
        return y;
      },
    };
  }
}

main();
