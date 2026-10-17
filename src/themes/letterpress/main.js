// Letterpress: a flat-lay of a cotton stationery suite on sage linen. The signature moment: the deckled card lying
// face down lifts off the linen, turns over in 3D and settles to show its pressed (debossed) face. The body is the
// rest of the suite laid on the linen at slight angles: a story card beside a print, a letterpress calendar page with
// the day circled, the schedule card, the families card, a few prints, the accommodations card and a reply card with
// a stamp in its corner. On desktop each card lifts and settles in depth as it arrives; phones keep quiet slides.
import './letterpress.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';
import { spelled } from '../_vow/kit.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const roman = (n) => {
  let s = ''; let v = Number(n) || 0;
  for (const [k, r] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (v >= k) { s += r; v -= k; }
  return s;
};
/** a hand-drawn ink loop round the day */
const CIRCLE = '<svg class="lp-cal__ring" viewBox="0 0 60 50" aria-hidden="true" focusable="false"><path d="M33 6C18 4 5 12 5 25s12 21 27 20 24-9 23-21C54 12 42 5 28 7 20 8 14 11 11 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

/** an image slot as a responsive <img> */
const art = (ctx, id, cls, sizes, extra = '') => {
  const ref = ctx.S.img(id);
  if (!ref) return '';
  const sm = ctx.esc(ctx.photoUrl(ref, 'sm')); const lg = ctx.esc(ctx.photoUrl(ref, 'lg'));
  return `<img class="${cls}" src="${sm}" srcset="${sm} 640w, ${lg} ${ref.w || 1100}w" sizes="${sizes}" alt="" decoding="async" ${extra} />`;
};

/** the flat-lay stage: linen, the sprig and ribbon tucked under the card, the card (back and/or front faces) */
function stage(ctx, { gate = false, front = '' } = {}) {
  const card = (cls) => art(ctx, 'hero.card', `lp-face__img ${cls}`, '(max-width: 899px) 90vw, 560px', gate ? 'fetchpriority="high"' : '');
  const { esc, initials } = ctx;
  const back = `<div class="lp-face lp-face--back">${card('lp-face__img--back')}
      <div class="lp-face__in lp-back">
        <span class="lp-back__mono" aria-hidden="true">${initials.map(esc).join('<i>&amp;</i>')}</span>
        ${gate ? `${ctx.on(ctx.txt('gate.line')) ? `<p class="lp-back__line">${ctx.bi(ctx.txt('gate.line'))}</p>` : ''}
        <button class="vw-btn lp-back__open" id="open" type="button" disabled>${ctx.bi(ctx.txt('gate.open'))}</button>
        <button class="vw-quiet lp-back__quiet" id="quiet" type="button" disabled>${ctx.bi(ctx.txt('gate.quiet'))}</button>` : ''}
      </div>
    </div>`;
  return `<div class="lp-stage${gate ? ' lp-stage--gate' : ''}">
    <div class="lp-group">
      <div class="lp-tuck" aria-hidden="true">${art(ctx, 'hero.card', 'lp-face__img', '360px')}</div>
      ${art(ctx, 'hero.sprig', 'lp-sprig', '(max-width: 899px) 60vw, 380px', 'aria-hidden="true"')}
      <div class="lp-lift-shadow" aria-hidden="true"></div>
      <div class="lp-flip">
        ${gate ? back : `${back}<div class="lp-face lp-face--front">${card('')}<div class="lp-face__in">${front}</div></div>`}
      </div>
    </div>
  </div>`;
}

const SPEC = {
  slug: 'letterpress',
  manifest,
  ownButtons: true,
  demo: {
    bride: 'Claire', brideLast: 'Bennett', groom: 'Thomas', groomLast: 'Reed', date: '2027-10-02', time: '16:00', tz: 'America/New_York',
    venue: 'The Boston Public Garden', city: 'Boston, MA', mapQuery: 'Boston Public Garden, Boston, MA',
    dress: 'Black tie optional', colors: ['#33472F', '#C9CBB5', '#ECEBE7'], hashtag: '#ClaireAndThomas', deadline: 'Kindly reply by September 1, 2027',
    welcomeVenue: 'The Langham, Boston', welcomeMap: 'The Langham, Boston, MA', brunchVenue: 'Taj Boston', brunchMap: 'Taj Boston, MA',
    stays: [
      { name: { en: 'Taj Boston', ne: '' }, note: { en: 'Room block under Bennett–Reed until September 1', ne: '' }, mapQuery: 'Taj Boston, MA' },
      { name: { en: 'The Newbury Boston', ne: '' }, note: { en: 'Across the street from the Garden', ne: '' }, mapQuery: 'The Newbury Boston, MA' },
    ],
  },

  gate(ctx) { return stage(ctx, { gate: true }); },
  ready(ctx) {
    // the linen and the card art come from their slots (the studio may replace them)
    const url = (id) => { const ref = ctx.S.img(id); return ref ? `url("${ctx.photoUrl(ref, 'lg').replace(/["\\]/g, '')}")` : ''; };
    if (url('hero.linen')) document.body.style.setProperty('--lp-linen-img', url('hero.linen'));
    if (url('hero.card')) document.body.style.setProperty('--lp-card-img', url('hero.card'));
    // tapping the card back opens too
    document.querySelector('.lp-stage--gate .lp-flip')?.addEventListener('click', (e) => { if (!e.target.closest('button')) document.getElementById('open')?.click(); });
    void ctx;
  },
  open(ctx, tl, gate) {
    const { gsap } = ctx;
    const flip = '#top .lp-flip';
    gsap.set(flip, { rotationY: 180, transformPerspective: 1600 });
    gsap.set('#top .lp-lift-shadow', { opacity: 0.25 });
    tl.to('.lp-stage--gate .lp-back__line, .lp-stage--gate .vw-btn, .lp-stage--gate .vw-quiet', { opacity: 0, duration: 0.3, ease: 'power2.out' }, 0)
      .set(gate, { autoAlpha: 0 }, 0.32)
      // the card lifts off the linen (its shadow spreads and softens) …
      .to(flip, { z: 150, y: -14, rotationX: 7, duration: 0.7, ease: 'power2.out' }, 0.34)
      .to('#top .lp-lift-shadow', { opacity: 0.75, scale: 1.08, y: 26, duration: 0.7, ease: 'power2.out' }, 0.34)
      // … turns over …
      .to(flip, { rotationY: 0, duration: 1.0, ease: 'power3.inOut' }, 0.62)
      // … and settles back down
      .to(flip, { z: 0, y: 0, rotationX: 0, duration: 0.6, ease: 'power2.inOut' }, 1.5)
      .to('#top .lp-lift-shadow', { opacity: 0.25, scale: 1, y: 0, duration: 0.6, ease: 'power2.inOut' }, 1.5);
    return 1.75;
  },

  // ───────── the page ─────────
  page(ctx) {
    const { bi, esc, txt, on, parts: P, D, venue, city, isPair, c } = ctx;
    const place = [venue, city].filter(Boolean);
    const story = P.story;
    const full = (p) => bi(on(p?.fullName) ? p.fullName : p?.name);
    const namesFull = isPair
      ? `<span class="lp-n">${full(c.bride)}</span><span class="lp-and" aria-hidden="true">and</span><span class="sr-only"> and </span><span class="lp-n">${full(c.groom)}</span>`
      : `<span class="lp-n">${full(c.bride)}</span>`;
    const lay = (id, cls, inner, r, label = '') => `
    <section class="lp-sec ${cls}"${id ? ` id="${id}"` : ''}${label}>
      <div class="lp-lay vw-rise" style="--r:${r}deg"><div class="lp-sh" aria-hidden="true"></div><div class="lp-card">${inner}</div></div>
    </section>`;
    const head = (id, title, kicker = '') => `<header class="lp-head">${kicker ? `<p class="lp-kicker">${kicker}</p>` : ''}<h2 class="lp-h2" id="${id}">${bi(title)}</h2><i class="lp-rule" aria-hidden="true"></i></header>`;

    // the pressed face of the card
    const front = `
        ${ctx.emblem('lp-emblem vw-in')}
        ${on(txt('hero.kicker')) ? `<p class="lp-front__kicker vw-in">${bi(txt('hero.kicker'))}</p>` : ''}
        <h1 class="lp-front__names vw-in">${namesFull}</h1>
        ${on(txt('hero.line')) ? `<p class="lp-front__line vw-in">${bi(txt('hero.line'))}</p>` : ''}
        <i class="lp-front__rule vw-in" aria-hidden="true"></i>
        <p class="lp-front__date vw-in">${esc(D.spelled.day)}<br />${esc(D.spelled.year)}${D.time ? `<br />${esc(D.spelled.time)}` : ''}</p>
        ${place.length ? `<p class="lp-front__place vw-in">${venue ? `<b>${esc(venue)}</b>` : ''}${city ? `<span>${esc(city)}</span>` : ''}</p>` : ''}`;
    const hero = `
    <section class="vw-hero lp-hero" id="top" aria-label="${esc(ctx.namesText)}">
      ${stage(ctx, { front })}
      ${P.cue(P.lead || story.length ? 'couple' : 'date')}
    </section>`;

    // a print beside the story card
    const couple = (P.lead || story.length) ? `
    <section class="lp-sec lp-couple" id="couple" aria-labelledby="couple-h">
      ${P.lead ? `<div class="lp-lay lp-lay--print vw-rise" style="--r:-3deg"><div class="lp-sh" aria-hidden="true"></div><figure class="lp-print lp-card--print">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 899px) 82vw, 440px')}</figure></div>` : ''}
      <div class="lp-lay vw-rise" style="--r:1.4deg"><div class="lp-sh" aria-hidden="true"></div><div class="lp-card lp-story">
        ${head('couple-h', txt('couple.title'), on(txt('story.title')) && story.length ? esc(txt('story.title').en) : '')}
        ${story.length ? `<ol class="lp-story__list" id="story">${story.map((s) => `<li><p class="lp-story__year">${bi(s.year)}</p><p class="lp-story__text">${bi(s.text)}</p></li>`).join('')}</ol>` : ''}
      </div></div>
    </section>` : '';

    // the letterpress calendar page, the day circled
    const mi = MONTHS.indexOf(D.month); const yy = Number(D.year); const dd = Number(D.day);
    let cal = '';
    if (mi >= 0 && yy) {
      const first = new Date(Date.UTC(yy, mi, 1)).getUTCDay();
      const days = new Date(Date.UTC(yy, mi + 1, 0)).getUTCDate();
      const cells = [...Array(first).fill(''), ...Array.from({ length: days }, (_, i) => i + 1)];
      cal = `<div class="lp-cal__page" aria-hidden="true">
          <p class="lp-cal__month">${esc(D.month)}</p><p class="lp-cal__year">${esc(D.year)}</p>
          <ol class="lp-cal__grid">${WD.map((w) => `<li class="lp-cal__wd">${w}</li>`).join('')}${cells.map((n) => (n === dd ? `<li class="lp-cal__d is-day"><span>${n}</span>${CIRCLE}</li>` : `<li class="lp-cal__d">${n}</li>`)).join('')}</ol>
        </div>`;
    }
    const date = lay('date', 'lp-date', `
        <p class="lp-kicker" id="date-h">${bi(txt('count.title'))}</p>
        ${cal}
        <p class="lp-cal__when">${esc(D.long)}${D.time ? ` · ${esc(D.time)}` : ''}</p>
        ${P.countdown('lp-count')}
        <div class="lp-btns">${P.calendarBtn()}${P.shareBtn()}</div>`, -1.2, ' aria-labelledby="date-h"');

    const programme = P.events.length ? lay('programme', 'lp-prog', `
        ${head('prog-h', txt('prog.title'), span(ctx))}
        <ol class="lp-events${P.events.length > 1 ? '' : ' lp-events--one'}">${P.events.map((ev) => `
          <li class="lp-ev" id="ev-${esc(ev.id)}">
            <p class="lp-ev__day"><span>${esc(ev.d.wd)}</span> ${esc(ev.d.month)} ${esc(ev.d.day)}</p>
            <h3 class="lp-ev__title">${bi(ev.title)}</h3>
            <p class="lp-ev__time">${esc(ev.time)}</p>
            <p class="lp-ev__venue">${bi(ev.venue)} · ${P.mapLink(ev)}</p>
            ${ev.blurb ? `<p class="lp-ev__blurb">${bi(ev.blurb)}</p>` : ''}
            ${ev.dress ? `<p class="lp-ev__dress">${P.swatches(ev)}<span>${bi(ev.dress.text)}</span></p>` : ''}
            ${P.orderList(ev, 'vw-order lp-order')}
          </li>`).join('')}
        </ol>`, 0.7, ' aria-labelledby="prog-h"') : '';

    const parents = P.families.map((f) => (on(f.person.parents) ? `<span>${bi(f.person.parents)}</span>` : '')).filter(Boolean);
    const hosts = lay('card', 'lp-hosts', `
        <p class="lp-kicker" id="hosts-h">${bi(txt('families.title'))}</p>
        ${P.hosts ? `<p class="lp-hosts__names">${bi(P.hosts)}</p>` : ''}
        ${parents.length ? `<p class="lp-hosts__fam">${parents.join('<i aria-hidden="true">·</i>')}</p>` : ''}
        ${ctx.verse('lp-verse')}
        <div class="lp-btns">${P.cardBtn('vw-btn--line')}</div>`, -2, ' aria-labelledby="hosts-h"');

    const prints = P.photos.slice(0, 4);
    const ROT = [-4, 2.6, -1.6, 3.4];
    const photos = prints.length ? `
    <section class="lp-sec lp-photos" id="photos" aria-labelledby="ph-h">
      <div class="lp-lay lp-lay--label vw-rise" style="--r:-2deg"><div class="lp-card lp-label"><h2 class="lp-h2" id="ph-h">${bi(txt('gallery.title'))}</h2></div></div>
      <div class="lp-prints lp-prints--${prints.length}">${prints.map((g, i) => `<div class="lp-lay lp-lay--print vw-rise" style="--r:${ROT[i]}deg"><div class="lp-sh" aria-hidden="true"></div><figure class="lp-print lp-card--print">${P.photoBtn(g, i, '(max-width: 699px) 44vw, 300px')}</figure></div>`).join('')}</div>
    </section>` : '';

    const info = (P.hasInfo || P.live) ? lay('info', 'lp-info', `
        ${head('info-h', txt('info.title'))}
        <div class="lp-info__cols">
          ${P.travel ? `<div class="lp-info__b"><h3 class="lp-kicker">${P.UI.travel}</h3><p>${bi(P.travel)}</p></div>` : ''}
          ${P.stays.length ? `<div class="lp-info__b"><h3 class="lp-kicker">${P.UI.stays}</h3><ul>${P.stays.map((st) => `<li><b>${bi(st.name)}</b>${on(st.note) ? `<span>${bi(st.note)}</span>` : ''}<a class="vw-link" href="${esc(mapUrl(st.mapQuery || st.name?.en || ''))}" target="_blank" rel="noopener">${P.UI.map}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></li>`).join('')}</ul></div>` : ''}
          ${P.contacts.length ? `<div class="lp-info__b"><h3 class="lp-kicker">${P.UI.contacts}</h3><ul>${P.contacts.map((pp) => `<li><b>${bi(pp.name)}</b>${on(pp.role) ? `<span>${bi(pp.role)}</span>` : ''}<span class="vw-links"><a class="vw-link" href="tel:${esc(tel(pp.phone))}">${P.UI.call}</a><a class="vw-link" href="sms:${esc(tel(pp.phone))}">${P.UI.text}</a></span></li>`).join('')}</ul></div>` : ''}
        </div>
        ${P.liveBlock('lp-live')}`, 1, ' aria-labelledby="info-h"') : '';

    const stamp = `<div class="lp-stamp" aria-hidden="true"><div class="lp-stamp__in"><b>${ctx.initials.map(esc).join('<i>&amp;</i>')}</b><span>${esc(roman(D.year))}</span></div></div>
      <svg class="lp-postmark" viewBox="0 0 150 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="32" cy="32" r="21" fill="none" stroke="currentColor" stroke-width=".8"/><text x="32" y="30" text-anchor="middle" font-size="12">${esc(D.monthShort.toUpperCase())} ${esc(D.day)}</text><text x="32" y="43" text-anchor="middle" font-size="12">${esc(D.year)}</text>${[18, 28, 38, 48].map((y) => `<path d="M64 ${y}c8-5 14-5 21 0s14 5 21 0 14-5 21 0 14 5 21 0" fill="none" stroke="currentColor" stroke-width="1.2"/>`).join('')}</svg>`;
    const rsvp = lay('rsvp', 'lp-reply', `
        ${stamp}
        <h2 class="lp-h2 lp-reply__title" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
        ${P.deadline ? `<p class="lp-reply__by">${bi(P.deadline)}</p>` : ''}
        ${P.rsvpForm()}`, -0.8, ' aria-labelledby="rsvp-title"');

    const close = `
    <footer class="lp-close" aria-label="Closing">
      <div class="lp-lay vw-rise" style="--r:1.2deg"><div class="lp-card lp-close__card">
        ${ctx.closing ? `<p class="lp-close__line">${bi(ctx.closing)}</p>` : ''}
        <p class="lp-close__names">${ctx.names({ amp: '<em>&amp;</em>' })}</p>
        ${ctx.hashtag ? `<p class="lp-close__tag">${esc(ctx.hashtag)}</p>` : ''}
      </div></div>
      ${P.madeWith()}
    </footer>`;

    void spelled;
    return `${hero}${couple}<div class="lp-row">${date}${hosts}</div>${programme}${photos}${info}${rsvp}${close}`;
  },

  // Desktop only (owner rule: no depth or parallax on phones): every card of the suite arrives lifted and settles
  // onto the linen (perspective tilt and a shadow that tightens); the sprig and ribbon sit on a deeper layer than the
  // card as the first screen leaves. Final states are the plain readable layout; phones keep the engine's slides.
  scroll(ctx) {
    if (ctx.reduced) return;
    const { gsap } = ctx;
    gsap.matchMedia().add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      document.body.classList.add('lp-depth');
      const away = { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('#top .lp-flip', { yPercent: -8, ease: 'none', scrollTrigger: away });
      gsap.to('#top .lp-sprig', { yPercent: 6, ease: 'none', scrollTrigger: { ...away } });
      gsap.utils.toArray('.lp-sec .lp-lay').forEach((lay, i) => {
        const card = lay.querySelector('.lp-card, .lp-print');
        const sh = lay.querySelector('.lp-sh');
        const st = { trigger: lay, start: 'top 100%', end: 'top 50%', scrub: 0.6 };
        gsap.fromTo(card, { y: 70, z: 120, rotationX: 10, rotation: i % 2 ? 2.5 : -2.5, transformPerspective: 1400, transformOrigin: '50% 100%' },
          { y: 0, z: 0, rotationX: 0, rotation: 0, ease: 'none', scrollTrigger: st });
        if (sh) gsap.fromTo(sh, { opacity: 0.9, y: 60, scale: 1.08 }, { opacity: 0.45, y: 12, scale: 1, ease: 'none', scrollTrigger: { ...st } });
      });
      return () => document.body.classList.remove('lp-depth');
    });
  },
};

const tel = (p) => String(p).replace(/[^\d+]/g, '');
const mapUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

/** "October 1 – 3" over a weekend, else nothing */
function span(ctx) {
  const s = ctx.span;
  if (!s) return '';
  return ctx.esc(s.from.month === s.to.month ? `${s.from.month} ${s.from.day} – ${s.to.day}` : `${s.from.monthShort} ${s.from.day} – ${s.to.monthShort} ${s.to.day}`);
}

mountVow(SPEC);
