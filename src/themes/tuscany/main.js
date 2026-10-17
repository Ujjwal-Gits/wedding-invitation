// Tuscany: a destination invitation, a wine label over a watercolor vineyard. The signature moment: golden hour
// arrives. The gate is the painting in pale early light with a cream wine label holding the names over the empty sky;
// on Open the full-colour painting crossfades in, a warm sun rises from behind the hills and the label lifts into the
// first screen. Everything after is quiet and reads like an Italian menu and a wine list: label headings with double
// rules, the schedule as courses with Roman numerals and dotted leaders, a travel guide, a two-column list of stays,
// whole photos in a sliding strip, the countdown in large Roman-style numerals on a strip of the painted sky.
import './tuscany.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';

const ART = '/themes/tuscany/art/';
const ROMAN_TABLE = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
/** 2027 → MMXXVII */
export const roman = (n) => {
  let v = Math.floor(Number(n) || 0); let s = '';
  if (v <= 0 || v > 3999) return String(n);
  for (const [k, r] of ROMAN_TABLE) while (v >= k) { s += r; v -= k; }
  return s;
};
const keyOf = (ref) => (typeof ref === 'string' ? ref : ref && typeof ref === 'object' ? ref.lg || ref.sm || '' : '');

/** a design image (painting crops) at 640w / 1200w */
const artImg = (ctx, ref, cls, sizes, { eager = false, alt = '' } = {}) => {
  if (!ref) return '';
  const { esc, photoUrl } = ctx;
  const sm = photoUrl(ref, 'sm'); const lg = photoUrl(ref, 'lg');
  return `<img class="${cls}" src="${esc(sm)}" srcset="${esc(sm)} 640w, ${esc(lg)} 1200w" sizes="${sizes}" alt="${esc(alt)}" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} />`;
};
/** The painting is the shipped one (then its pale copy and the hills cut-out match it). */
const isDefaultArt = (ctx) => keyOf(ctx.S.img('hero.art')) === manifest.images['hero.art'].default.lg;
const ART_SIZES = '(min-aspect-ratio: 1/2) 100vw, 50vh';

/** The wine label: vintage, the line above, the names, the line under, the date. h = 'h1' in the hero, 'p' on the gate. */
function label(ctx, h) {
  const { bi, esc, txt, on, names, D, c, pair, isPair } = ctx;
  const longest = Math.max(...(isPair ? [c.bride.name, c.groom.name] : [c.bride.name]).map((n) => pair(n).en.length));
  const size = longest > 9 ? ' tu-names--xl' : longest > 7 ? ' tu-names--l' : '';
  const vintage = on(txt('label.vintage')) ? `${bi(txt('label.vintage'))} ` : '';
  return `<div class="tu-label__in">
      ${ctx.emblem('tu-label__emblem')}
      ${D.year ? `<p class="tu-label__vintage"><i aria-hidden="true"></i><span>${vintage}${esc(D.year)}</span><i aria-hidden="true"></i></p>` : ''}
      ${on(txt('hero.kicker')) ? `<p class="tu-label__kicker">${bi(txt('hero.kicker'))}</p>` : ''}
      <${h} class="tu-names${size}">${names({ amp: '<em>&amp;</em>' })}</${h}>
      ${on(txt('hero.line')) ? `<p class="tu-label__line">${bi(txt('hero.line'))}</p>` : ''}
      ${D.long ? `<p class="tu-label__date"><span>${esc(D.wd)}</span><span>${esc(`${D.month} ${D.day}`)}</span><span>${esc(D.year)}</span></p>` : ''}
    </div>`;
}

const SPEC = {
  slug: 'tuscany',
  manifest,
  ownButtons: true,
  demo: {
    bride: 'Sophia', brideLast: 'Romano', groom: 'Luca', groomLast: 'Marino', date: '2027-10-09', time: '16:30', tz: 'Europe/Rome',
    venue: 'Tenuta San Lorenzo', city: 'Montepulciano, Tuscany', mapQuery: 'Montepulciano, Tuscany, Italy',
    dress: 'Black tie optional', colors: ['#7A2434', '#C9A27A', '#3F4A2E'], hashtag: '#SophiaAndLucaInTuscany',
    deadline: 'Kindly reply by June 1, 2027',
    welcomeVenue: 'Piazza Grande, Montepulciano', welcomeMap: 'Piazza Grande, Montepulciano, Italy',
    brunchVenue: 'The olive terrace, Tenuta San Lorenzo',
    travel: 'By air: Fly into Florence (FLR) or Rome (FCO). Both have easy connections from the US and the rest of Europe.\n'
      + 'By car: Pick up a rental car and drive south through the hills, about 1 hour 30 minutes from Florence or 2 hours from Rome. The last mile is a white gravel lane lined with cypress trees.\n'
      + 'The shuttle: On Saturday a shuttle leaves Piazza Grande at 3:45 PM and brings everyone back to town after midnight. No need to drive after the party.',
    stays: [
      { name: { en: 'Casa delle Vigne', ne: '' }, note: { en: 'Our room block until June 1. A short walk to the venue.', ne: '' }, mapQuery: 'hotels near Montepulciano, Italy' },
      { name: { en: 'Albergo Piazza Grande', ne: '' }, note: { en: 'In the old town, ten minutes by car', ne: '' }, mapQuery: 'hotels Piazza Grande, Montepulciano' },
      { name: { en: 'Agriturismo Le Crete', ne: '' }, note: { en: 'A farm stay with a pool, fifteen minutes away', ne: '' }, mapQuery: 'agriturismo near Montepulciano' },
      { name: { en: 'Villa Rentals in Val d’Orcia', ne: '' }, note: { en: 'For families and groups, twenty minutes away', ne: '' }, mapQuery: 'villa rentals Val d’Orcia' },
    ],
    contacts: [
      { name: { en: 'Giulia Ferri', ne: '' }, role: { en: 'Wedding planner', ne: '' }, phone: '+39 333 555 0142' },
      { name: { en: 'Marco Bellini', ne: '' }, role: { en: 'Best man', ne: '' }, phone: '+39 347 555 0178' },
    ],
  },

  // ───────── the gate: the painting in pale early light, the wine label over the empty sky ─────────
  gate(ctx) {
    const { bi, txt, on, S } = ctx;
    const def = isDefaultArt(ctx);
    const dawn = def
      ? artImg(ctx, { sm: `${ART}vineyard-dawn-sm.webp`, lg: `${ART}vineyard-dawn.webp` }, 'tu-art__img', ART_SIZES, { eager: true })
      : artImg(ctx, S.img('hero.art'), 'tu-art__img tu-art__img--pale', ART_SIZES, { eager: true });
    return `<div class="tu-gate">
      <div class="tu-stage" aria-hidden="true"><div class="tu-art tu-art--dawn">${dawn}</div></div>
      <div class="tu-top tu-top--gate">
        <div class="tu-label tu-label--gate" aria-hidden="true">${label(ctx, 'p')}</div>
        <div class="tu-gate__ui" id="tgui">
          ${on(txt('gate.line')) ? `<p class="tu-gate__line">${bi(txt('gate.line'))}</p>` : ''}
          <button class="vw-btn vw-btn--open" id="open" type="button" disabled>${bi(txt('gate.open'))}</button>
          <button class="vw-quiet" id="quiet" type="button" disabled>${bi(txt('gate.quiet'))}</button>
        </div>
      </div>
    </div>`;
  },
  // golden hour arrives: colour crossfades in, the sun rises behind the hills, the label lifts into place
  open(ctx, tl, gate) {
    const { gsap } = ctx;
    const gl = gate.querySelector('.tu-label--gate');
    const hl = document.querySelector('#top .tu-label');
    const lift = gl && hl ? hl.getBoundingClientRect().top - gl.getBoundingClientRect().top : -48;
    if (hl) gsap.set(hl, { opacity: 0 });
    tl.to('#tgui', { autoAlpha: 0, y: 8, duration: 0.35, ease: 'power2.out' }, 0)
      .to('.tu-art--dawn', { opacity: 0, duration: 1.5, ease: 'sine.inOut' }, 0.15)
      .fromTo('.tu-sun', { yPercent: 30, opacity: 0, scale: 0.86 }, { yPercent: 0, opacity: 1, scale: 1, duration: 2.3, ease: 'power2.out' }, 0.3)
      .fromTo('.tu-warmth', { opacity: 0 }, { opacity: 1, duration: 1.8, ease: 'sine.out' }, 0.5);
    if (gl) tl.to(gl, { y: lift, duration: 1.2, ease: 'power3.inOut' }, 0.35).set(gl, { opacity: 0 }, 1.56);
    if (hl) tl.set(hl, { opacity: 1 }, 1.56);
    return 1.4;
  },

  ready(ctx) { strip(ctx); dial(ctx); },

  // desktop only: a slow camera push-in on the vineyard with the label and the sun on their own layers, and the reply
  // card's cover swinging open on its fold. Phones keep the engine's gentle rises; reduced motion stays still.
  scroll(ctx) {
    const { gsap } = ctx;
    if (ctx.reduced) return;
    gsap.matchMedia().add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const st = (trigger, start, end, scrub = 0.6) => ({ trigger, start, end, scrub });
      gsap.set('#top .tu-art', { transformOrigin: '64% 74%' });
      gsap.to('#top .tu-art', { scale: 1.1, ease: 'none', scrollTrigger: st('#top', 'top top', 'bottom top') });
      gsap.to('#top .tu-sun', { yPercent: 16, ease: 'none', scrollTrigger: st('#top', 'top top', 'bottom top') });
      gsap.to('#top .tu-top', { y: -150, opacity: 0.35, ease: 'none', scrollTrigger: st('#top', 'top top', 'bottom top') });
      if (document.querySelector('.tu-leaf')) {
        gsap.fromTo('.tu-leaf', { rotationY: 180 }, { rotationY: 0, ease: 'power1.inOut', scrollTrigger: st('.tu-reply', 'top 92%', 'top 30%', 0.8) });
      }
    });
  },

  // ───────── the page ─────────
  page(ctx) {
    const { bi, esc, txt, on, parts: P, D, venue, city, names, S } = ctx;
    const def = isDefaultArt(ctx);
    const head = (id, title, kicker = '', cls = '') => `<header class="tu-head vw-rise ${cls}">${kicker ? `<p class="tu-kicker">${kicker}</p>` : ''}<h2 class="tu-h2" id="${id}">${title}</h2></header>`;
    const story = P.story;
    const monthNo = Number(String(D.numeric).split('.')[0]);
    const romanDate = D.day && monthNo ? `${roman(D.day)} · ${roman(monthNo)} · ${roman(D.year)}` : '';

    const hero = `
    <section class="vw-hero tu-hero" id="top" aria-label="${esc(ctx.namesText)}">
      <div class="tu-stage" aria-hidden="true">
        <div class="tu-art">
          ${artImg(ctx, S.img('hero.art'), 'tu-art__img', ART_SIZES, { eager: true })}
          <i class="tu-warmth"></i><i class="tu-sun"></i>
          ${def ? artImg(ctx, { sm: `${ART}vineyard-hills-sm.webp`, lg: `${ART}vineyard-hills.webp` }, 'tu-art__hills', ART_SIZES, { eager: true }) : ''}
        </div>
      </div>
      <div class="tu-top">
        <div class="tu-label">${label(ctx, 'h1')}</div>
        ${venue || city ? `<p class="tu-hero__place vw-in">${venue ? `<b>${esc(venue)}</b>` : ''}${city ? `<span>${esc(city)}</span>` : ''}</p>` : ''}
        ${P.cue(P.lead || story.length ? 'couple' : 'programme')}
      </div>
    </section>`;

    const couple = (P.lead || story.length) ? `
    <section class="tu-sec tu-couple" id="couple" aria-labelledby="couple-h">
      ${head('couple-h', bi(txt('couple.title')), on(txt('story.title')) && story.length ? bi(txt('story.title')) : '')}
      ${P.lead ? `<figure class="tu-frame${(P.ratio(P.lead.photo) || 0) > 1.1 ? ' tu-frame--land' : ''} vw-rise">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 699px) 86vw, 680px')}</figure>` : ''}
      ${story.length ? `<ol class="tu-vintages tu-vintages--${Math.min(story.length, 4)}" id="story">${story.map((s) => `
        <li class="tu-vint vw-rise"><p class="tu-vint__y">${bi(s.year)}</p><p class="tu-vint__t">${bi(s.text)}</p></li>`).join('')}
      </ol>` : ''}
    </section>` : '';

    const programme = P.events.length ? `
    <section class="tu-sec tu-prog" id="programme" aria-labelledby="prog-h">
      ${head('prog-h', bi(txt('prog.title')), span(ctx))}
      <div class="tu-menu vw-rise"><ol class="tu-courses">${P.events.map((ev, i) => `
        <li class="tu-course" id="ev-${esc(ev.id)}">
          <p class="tu-course__n" aria-hidden="true"><span>${roman(i + 1)}</span></p>
          <h3 class="tu-course__line"><span class="tu-course__t">${bi(ev.title)}</span><i class="tu-dots" aria-hidden="true"></i><span class="tu-course__at">${esc(ev.d.time)}</span></h3>
          <p class="tu-course__when"><b>${esc(`${ev.d.wd}, ${ev.d.month} ${ev.d.day}`)}</b><span>${esc(ev.time)}</span></p>
          <p class="tu-course__venue"><span>${bi(ev.venue)}</span> ${P.mapLink(ev)}</p>
          ${ev.blurb ? `<p class="tu-course__blurb">${bi(ev.blurb)}</p>` : ''}
          ${ev.dress ? `<p class="tu-course__dress">${P.swatches(ev)}<span>${bi(ev.dress.text)}</span></p>` : ''}
          ${P.orderList(ev, 'vw-order tu-order')}
        </li>`).join('')}
      </ol></div>
    </section>` : '';

    const pad2 = (u, l) => `<li><b data-u="${u}">00</b><span><i class="tu-key tu-key--${u}" aria-hidden="true"></i>${l}</span></li>`;
    const date = `
    <section class="tu-date" id="date" aria-labelledby="date-h">
      <div class="tu-date__sky" aria-hidden="true">${artImg(ctx, S.img('date.sky'), 'tu-date__img', '100vw')}</div>
      <div class="tu-date__in">
        <div class="tu-count vw-rise" data-countdown>
          <div class="tu-count__grid" data-count-grid role="group" aria-label="${esc(txt('count.title').en)}">
            <div class="tu-dial">${DIAL}<p class="tu-dial__days"><b data-u="d">0</b><span>${P.UI.days}</span></p></div>
            <ol class="tu-count__hms">${pad2('h', P.UI.hours)}${pad2('m', P.UI.minutes)}${pad2('s', P.UI.seconds)}</ol>
          </div>
          <p class="tu-count__done" data-count-done hidden></p>
        </div>
        <div class="tu-date__side vw-rise">
          <h2 class="tu-date__h" id="date-h">${bi(txt('count.title'))}</h2>
          ${romanDate ? `<p class="tu-date__roman" aria-hidden="true">${esc(romanDate)}</p>` : ''}
          <p class="tu-date__when">${esc(D.long)}${D.time ? `<br />${esc(`${D.time}${D.zone ? ` ${D.zone}` : ''}`)}` : ''}</p>
          <div class="tu-btns">${P.calendarBtn()}${P.shareBtn()}</div>
        </div>
      </div>
    </section>`;

    const photos = P.photos.length ? `
    <section class="tu-sec tu-photos" id="photos" aria-labelledby="ph-h">
      ${head('ph-h', bi(txt('gallery.title')))}
      <div class="tu-strip vw-rise" data-count="${P.photos.length}">
        <div class="tu-strip__track" tabindex="0" role="group" aria-label="${esc(txt('gallery.title').en || 'Photos')}" data-lenis-prevent-wheel>
          ${P.photos.map((g, i) => {
            const r = P.ratio(g.photo);
            return `<figure class="tu-slide"${r ? ` style="--r:${r.toFixed(4)}"` : ''}>${P.photoBtn(g, i, '(max-width: 699px) 92vw, 640px')}</figure>`;
          }).join('')}
        </div>
        <div class="tu-strip__nav">
          <button type="button" class="tu-arrow" data-strip="prev"><span aria-hidden="true">←</span><span class="sr-only">Previous photo</span></button>
          <p class="tu-strip__count" aria-hidden="true"><b data-strip-i>I</b><span>/</span><span>${roman(P.photos.length)}</span></p>
          <button type="button" class="tu-arrow" data-strip="next"><span aria-hidden="true">→</span><span class="sr-only">Next photo</span></button>
        </div>
      </div>
    </section>` : '';

    const hosts = `
    <section class="tu-hosts" id="card" aria-labelledby="hosts-h">
      <div class="tu-hosts__in vw-rise">
        <div class="tu-hosts__who">
          <p class="tu-kicker" id="hosts-h">${bi(txt('families.title'))}</p>
          ${P.hosts ? `<p class="tu-hosts__names">${bi(P.hosts)}</p>` : ''}
          ${P.families.length ? `<p class="tu-hosts__fam">${P.families.map((f) => (on(f.person.parents) ? `<span>${bi(f.person.parents)}</span>` : '')).filter(Boolean).join('<i aria-hidden="true">·</i>')}</p>` : ''}
        </div>
        ${P.cardBtn('vw-btn--line')}
      </div>
    </section>`;

    const town = city.split(',')[0].trim();
    const legs = P.travel ? ctx.pair(P.travel).en.split(/\n+/).map((s) => s.trim()).filter(Boolean).map((line) => {
      const m = /^([^:]{2,28}):\s+(.+)$/.exec(line);
      return m ? { h: m[1], t: m[2] } : { h: '', t: line };
    }) : [];
    const travelTitle = P.travel && on(txt('travel.title')) ? `${bi(txt('travel.title'))}${town ? ` ${esc(town)}` : ''}` : bi(txt('info.title'));
    const info = (P.hasInfo || P.live) ? `
    <section class="tu-sec tu-info" id="info" aria-labelledby="info-h">
      ${head('info-h', travelTitle, P.travel && on(txt('travel.title')) ? bi(txt('info.title')) : '')}
      ${legs.length ? `<ol class="tu-legs tu-legs--${Math.min(legs.length, 4)}">${legs.map((l, i) => `
        <li class="tu-leg vw-rise"><span class="tu-leg__n" aria-hidden="true">${roman(i + 1)}</span>${l.h ? `<h3 class="tu-leg__h">${esc(l.h)}</h3>` : ''}<p class="tu-leg__t">${esc(l.t)}</p></li>`).join('')}
      </ol>` : ''}
      ${P.stays.length ? `<div class="tu-stays vw-rise">
        <h3 class="tu-h3">${bi(txt('stays.title'))}</h3>
        <ul class="tu-stays__list">${P.stays.map((st) => `
          <li class="tu-stay"><p class="tu-stay__name">${bi(st.name)}</p>${on(st.note) ? `<p class="tu-stay__note">${bi(st.note)}</p>` : ''}<a class="vw-link" href="${esc(mapHref(st, ctx))}" target="_blank" rel="noopener">${P.UI.map}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></li>`).join('')}
        </ul>
      </div>` : ''}
      ${P.contacts.length || P.live ? `<div class="tu-info__foot vw-rise">
        ${P.contacts.length ? `<div class="tu-ask"><h3 class="tu-h3">${bi(txt('contacts.title'))}</h3><ul>${P.contacts.map((pp) => `
          <li><p class="tu-ask__name">${bi(pp.name)}</p>${on(pp.role) ? `<p class="tu-ask__role">${bi(pp.role)}</p>` : ''}<span class="vw-links"><a class="vw-link" href="tel:${esc(tel(pp.phone))}">${P.UI.call}</a><a class="vw-link" href="sms:${esc(tel(pp.phone))}">${P.UI.text}</a></span></li>`).join('')}</ul></div>` : ''}
        ${P.liveBlock('tu-live')}
      </div>` : ''}
    </section>` : '';

    const rsvp = `
    <section class="tu-sec tu-rsvp" id="rsvp" aria-labelledby="rsvp-title">
      <div class="tu-reply vw-rise">
        <div class="tu-leaf">
          <div class="tu-reply__head">
            ${romanDate ? `<p class="tu-kicker" aria-hidden="true">${esc(romanDate)}</p>` : ''}
            <h2 class="tu-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
            ${P.deadline ? `<p class="tu-reply__by">${bi(P.deadline)}</p>` : ''}
            ${P.events.length > 1 ? `<ol class="tu-reply__menu" aria-hidden="true">${P.events.map((ev, i) => `<li><span class="tu-reply__n">${roman(i + 1)}</span><b>${bi(ev.title)}</b><i class="tu-dots"></i><span>${esc(`${ev.d.wdShort} ${ev.d.day}`)}</span></li>`).join('')}</ol>` : ''}
          </div>
          <div class="tu-leaf__cover" aria-hidden="true">
            ${D.year ? `<p class="tu-label__vintage"><i></i><span>${on(txt('label.vintage')) ? `${bi(txt('label.vintage'))} ` : ''}${esc(D.year)}</span><i></i></p>` : ''}
            <p class="tu-leaf__mono">${ctx.initials.map(esc).join('<em>&amp;</em>')}</p>
            ${on(txt('rsvp.cover')) ? `<p class="tu-leaf__rsvp">${bi(txt('rsvp.cover'))}</p>` : ''}
            ${romanDate ? `<p class="tu-leaf__date">${esc(romanDate)}</p>` : ''}
          </div>
        </div>
        <div class="tu-reply__page">${P.rsvpForm()}</div>
      </div>
    </section>`;

    const close = `
    <footer class="tu-close" aria-label="Closing">
      <div class="tu-close__in">
        ${ctx.verse('tu-verse')}
        ${ctx.closing ? `<p class="tu-close__line">${bi(ctx.closing)}</p>` : ''}
        <p class="tu-close__names">${names({ amp: '<em>&amp;</em>' })}</p>
        ${ctx.hashtag ? `<p class="tu-close__tag">${esc(ctx.hashtag)}</p>` : ''}
        ${P.madeWith()}
      </div>
      <div class="tu-close__vines" aria-hidden="true">${artImg(ctx, S.img('close.vines'), 'tu-close__img', '100vw')}</div>
    </footer>`;

    return hero + couple + programme + date + photos + hosts + info + rsvp + close;
  },
};

/** The countdown dial: sixty second ticks, a minutes ring, twenty-four hour dots; three markers turn by transform. */
const DIAL = (() => {
  let t = '';
  for (let i = 0; i < 60; i += 1) t += `<line x1="200" y1="12" x2="200" y2="${i % 5 ? 21 : 30}" transform="rotate(${i * 6} 200 200)" class="${i % 5 ? '' : 'is-5'}"/>`;
  let h = '';
  for (let i = 0; i < 24; i += 1) h += `<circle cx="200" cy="62" r="${i % 6 ? 1.6 : 2.5}" transform="rotate(${i * 15} 200 200)"/>`;
  return `<svg class="tu-dial__svg" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
    <g class="tu-dial__ticks">${t}</g>
    <circle class="tu-dial__ring" cx="200" cy="200" r="158"/>
    <g class="tu-dial__dots">${h}</g>
    <g class="tu-dial__hand" data-hand="s"><circle cx="200" cy="2" r="6.5"/></g>
    <g class="tu-dial__hand" data-hand="m"><path d="M200 32l8 10-8 10-8-10z"/></g>
    <g class="tu-dial__hand" data-hand="h"><rect x="196.5" y="52" width="7" height="20" rx="3.5"/></g>
  </svg>`;
})();

/** turn the dial's markers once a second (cumulative angles, so a wrap never spins backwards round the face) */
function dial(ctx) {
  const svg = document.querySelector('.tu-dial__svg');
  const target = Date.parse(ctx.D.iso);
  if (!svg || !Number.isFinite(target)) return;
  const hands = { s: svg.querySelector('[data-hand="s"]'), m: svg.querySelector('[data-hand="m"]'), h: svg.querySelector('[data-hand="h"]') };
  const days = document.querySelector('.tu-dial__days');
  const tick = () => {
    const s = Math.max(0, Math.floor((target - Date.now()) / 1000));
    hands.s.style.transform = `rotate(${s * 6}deg)`;
    hands.m.style.transform = `rotate(${Math.floor(s / 60) * 6}deg)`;
    hands.h.style.transform = `rotate(${Math.floor(s / 3600) * 15}deg)`;
    days?.classList.toggle('is-long', Math.floor(s / 86400) > 999);
    return s > 0;
  };
  tick();
  requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('is-live')));
  const id = setInterval(() => { if (!tick()) clearInterval(id); }, 1000);
}

const tel = (p) => String(p).replace(/[^\d+]/g, '');
const mapHref = (st, ctx) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(st.mapQuery || ctx.pair(st.name).en)}`;

/** "October 8 – 10" over a weekend, else nothing */
function span(ctx) {
  const s = ctx.span;
  if (!s) return '';
  return ctx.esc(s.from.month === s.to.month ? `${s.from.month} ${s.from.day} – ${s.to.day}` : `${s.from.monthShort} ${s.from.day} – ${s.to.monthShort} ${s.to.day}`);
}

/** the photo strip: arrows, swipe (native), a Roman counter */
function strip(ctx) {
  const box = document.querySelector('.tu-strip');
  if (!box) return;
  const track = box.querySelector('.tu-strip__track');
  const slides = [...track.querySelectorAll('.tu-slide')];
  const prev = box.querySelector('[data-strip="prev"]');
  const next = box.querySelector('[data-strip="next"]');
  const out = box.querySelector('[data-strip-i]');
  const current = () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0; let d = Infinity;
    slides.forEach((s, i) => { const c = s.offsetLeft + s.offsetWidth / 2; const k = Math.abs(c - mid); if (k < d) { d = k; best = i; } });
    return best;
  };
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    box.classList.toggle('is-static', max < 4);
    prev.disabled = track.scrollLeft < 4;
    next.disabled = track.scrollLeft > max - 4;
    const i = prev.disabled ? 0 : next.disabled ? slides.length - 1 : current();
    out.textContent = roman(i + 1);
  };
  const go = (dir) => {
    const i = Math.max(0, Math.min(slides.length - 1, current() + dir));
    const s = slides[i];
    const left = s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2;
    track.scrollTo({ left, behavior: ctx.reduced ? 'auto' : 'smooth' });
  };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  track.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } });
  let raf = 0;
  track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', update);
  track.querySelectorAll('img').forEach((im) => im.addEventListener('load', update, { once: true }));
  update();
}

mountVow(SPEC);
