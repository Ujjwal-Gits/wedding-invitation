// Wax Seal: a letter on white linen, sealed in sage wax. The signature moment: the guest taps the real wax seal, it
// cracks in two, the envelope's flap swings open in depth, and the letter rises out and grows into the first screen.
// The page after is a correspondence collection: the story as a letter with a photo tucked in, small notes for the
// date, the verse and the trip, swipeable note cards for the schedule, and a reply card slipped into its own envelope.
import './wax-seal.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';

const CRACK = ['52% 0', '47% 17%', '55% 33%', '46% 51%', '54% 67%', '47% 83%', '51% 100%'];
const HALF_L = `polygon(0 0, ${CRACK.join(', ')}, 0 100%)`;
const HALF_R = `polygon(${CRACK.join(', ')}, 100% 100%, 100% 0)`;

const art = (ctx, id, cls, sizes, w = 640) => {
  const ref = ctx.S.img(id);
  if (!ref) return '';
  const sm = ctx.photoUrl(ref, 'sm'); const lg = ctx.photoUrl(ref, 'lg');
  return `<img class="${cls}" src="${ctx.esc(sm)}"${sm !== lg ? ` srcset="${ctx.esc(sm)} ${w}w, ${ctx.esc(lg)} ${w * 2}w" sizes="${sizes}"` : ''} alt="" decoding="async" />`;
};
/** the seal in two halves that fit exactly; the crack is a jagged line down the middle */
const seal = (ctx, cls = '') => {
  const ref = ctx.S.img('gate.seal');
  if (!ref) return '';
  const src = ctx.esc(ctx.photoUrl(ref, 'lg'));
  return `<span class="ws-seal ${cls}" aria-hidden="true"><img class="ws-seal__half ws-seal__half--l" src="${src}" alt="" style="clip-path:${HALF_L}" /><img class="ws-seal__half ws-seal__half--r" src="${src}" alt="" style="clip-path:${HALF_R}" /></span>`;
};
const linen = (ctx, cls) => art(ctx, 'gate.linen', cls, '100vw', 640);

/** The envelope, built in code: the inside, the letter, the front pocket and the flap (two faces, it opens in depth). */
const ENVELOPE = (ctx) => `
  <div class="ws-env" aria-hidden="true">
    <div class="ws-env__back"></div>
    <div class="ws-env__letter"><span class="ws-env__mono">${ctx.initials.map(ctx.esc).join('<i>&amp;</i>')}</span><i class="ws-env__rule"></i></div>
    <svg class="ws-env__front" viewBox="0 0 145 100" preserveAspectRatio="none" focusable="false">
      <defs><linearGradient id="ws-pocket" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBFAF7"/><stop offset="1" stop-color="#F2F1EC"/></linearGradient></defs>
      <path d="M0 0 L72.5 57 L145 0 V100 H0 Z" fill="url(#ws-pocket)"/>
      <path d="M0 100 L66 55.5 M145 100 L79 55.5 M0 0 L62 48.8 M145 0 L83 48.8" stroke="rgba(60,64,58,.10)" stroke-width=".35" fill="none" vector-effect="non-scaling-stroke"/>
    </svg>
    <div class="ws-env__flap">
      <svg class="ws-env__face ws-env__face--out" viewBox="0 0 145 64" preserveAspectRatio="none" focusable="false"><path d="M0 0 H145 L76 61.5 Q72.5 64.5 69 61.5 Z" fill="#FCFBF8"/><path d="M0 0 L69 61.5 Q72.5 64.5 76 61.5 L145 0" fill="none" stroke="rgba(60,64,58,.12)" stroke-width=".4" vector-effect="non-scaling-stroke"/></svg>
      <svg class="ws-env__face ws-env__face--in" viewBox="0 0 145 64" preserveAspectRatio="none" focusable="false"><path d="M0 0 H145 L76 61.5 Q72.5 64.5 69 61.5 Z" fill="#ECEAE3"/></svg>
    </div>
  </div>`;

const SPEC = {
  slug: 'wax-seal',
  manifest,
  ownButtons: true,
  demo: {
    bride: 'Hannah', brideLast: 'Park', groom: 'Noah', groomLast: 'Ellis', date: '2027-08-14', time: '17:00', tz: 'America/New_York',
    venue: 'The Hudson Loft', city: 'Hudson, NY', mapQuery: 'The Hudson Loft, Hudson, NY',
    dress: 'Cocktail attire', colors: ['#4C6150', '#A9BBA4', '#F1DCD3'], hashtag: '#HannahAndNoah', deadline: 'Kindly reply by July 10, 2027',
    welcomeVenue: 'The Maker Hotel', brunchVenue: 'The Maker Hotel',
  },

  // ───────── the gate: the envelope on linen; the seal is the button ─────────
  gate(ctx) {
    const { bi, esc, txt, on, D } = ctx;
    const open = txt('gate.open');
    return `<div class="ws-gate">
      ${linen(ctx, 'ws-linen')}
      <div class="ws-gate__words">
        ${on(txt('gate.line')) ? `<p class="ws-cap">${bi(txt('gate.line'))}</p>` : ''}
        <p class="ws-gate__names">${ctx.names({ amp: '<em>&amp;</em>' })}</p>
        ${D.month ? `<p class="ws-cap ws-gate__date">${esc(`${D.month} ${D.day} · ${D.year}`)}</p>` : ''}
      </div>
      <div class="ws-gate__desk">
        ${ENVELOPE(ctx)}
        ${art(ctx, 'gate.sprig', 'ws-gate__sprig', '(max-width: 699px) 50vw, 300px', 420)}
        <button class="ws-gate__seal" id="open" type="button" disabled aria-label="${esc(`${open.en || 'Open the invitation'}: open the invitation`)}">${seal(ctx)}</button>
      </div>
      <div class="ws-gate__ui">
        ${on(open) ? `<p class="ws-cap ws-gate__tap" aria-hidden="true">${bi(open)}</p>` : ''}
        <button class="vw-quiet ws-gate__quiet" id="quiet" type="button" disabled>${bi(txt('gate.quiet'))}</button>
      </div>
    </div>`;
  },
  open(ctx, tl, gate) {
    const { gsap } = ctx;
    const env = gate.querySelector('.ws-env');
    const letter = gate.querySelector('.ws-env__letter');
    const card = document.querySelector('#top .ws-card');
    const er = env.getBoundingClientRect();
    const lr = letter.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    const rise = er.height * 0.78;
    gsap.set(letter, { transformOrigin: '0 0' });
    gsap.set('.ws-env__flap', { transformOrigin: '50% 0', transformPerspective: 900 });
    // the seal is pressed, then cracks in two
    tl.to('.ws-gate__seal .ws-seal', { scale: 0.93, duration: 0.12, ease: 'power2.in' }, 0)
      .to('.ws-gate__seal .ws-seal', { scale: 1, duration: 0.2, ease: 'power2.out' }, 0.12)
      .to('.ws-gate__seal .ws-seal__half--l', { x: -22, y: 26, rotate: -24, duration: 0.7, ease: 'power3.out' }, 0.14)
      .to('.ws-gate__seal .ws-seal__half--r', { x: 24, y: 30, rotate: 21, duration: 0.7, ease: 'power3.out' }, 0.14)
      .to('.ws-gate__seal', { opacity: 0, duration: 0.35, ease: 'power1.in' }, 0.5)
      .to(['.ws-gate__ui', '.ws-gate__words'], { opacity: 0, y: -10, duration: 0.45, ease: 'power2.in' }, 0.2);
    // the flap swings open in depth and falls behind the letter
    tl.to('.ws-env__flap', { rotateX: 180, duration: 0.85, ease: 'power2.inOut' }, 0.42)
      .set('.ws-env__flap', { zIndex: 0 }, 0.85);
    // the letter rises out, the envelope settles away, the letter grows into the first screen
    tl.to(letter, { y: -rise, duration: 0.8, ease: 'power3.out' }, 1.1)
      .to(['.ws-env__back', '.ws-env__front', '.ws-env__flap', '.ws-gate__sprig'], { y: 70, opacity: 0, duration: 0.6, ease: 'power2.in' }, 1.75)
      .to('.ws-env__mono, .ws-env__rule', { opacity: 0, duration: 0.3 }, 1.8)
      .to(letter, { x: cr.left - lr.left, y: cr.top - lr.top, scaleX: cr.width / lr.width, scaleY: cr.height / lr.height, duration: 0.85, ease: 'power3.inOut' }, 1.9)
      .to('.ws-gate', { opacity: 0, duration: 0.4, ease: 'power1.out' }, 2.72);
    return 2.8;
  },

  // ───────── the page ─────────
  page(ctx) {
    const { bi, esc, txt, on, parts: P, D, venue, city, names } = ctx;
    const story = P.story;
    const head = (id, title, extra = '') => `<header class="ws-head vw-rise"><h2 class="ws-h2" id="${id}">${bi(title)}</h2>${extra}</header>`;

    const hero = `
    <section class="vw-hero ws-hero" id="top" aria-label="${esc(ctx.namesText)}">
      ${linen(ctx, 'ws-linen')}
      <div class="ws-card">
        <div class="ws-card__in">
          ${ctx.emblem('ws-card__emblem vw-in')}
          ${on(txt('hero.kicker')) ? `<p class="ws-cap vw-in">${bi(txt('hero.kicker'))}</p>` : ''}
          <h1 class="ws-names vw-in">${names({ amp: '<em>&amp;</em>' })}</h1>
          ${on(txt('hero.line')) ? `<p class="ws-card__line vw-in">${bi(txt('hero.line'))}</p>` : ''}
          <div class="ws-card__when vw-in">
            ${D.wd ? `<p class="ws-cap">${esc(D.wd)}</p>` : ''}
            <p class="ws-card__date">${esc(`${D.month} ${D.day}, ${D.year}`)}</p>
            ${D.time ? `<p class="ws-card__time">${esc(`${D.time}${D.zone ? ` ${D.zone}` : ''}`)}</p>` : ''}
          </div>
          ${venue || city ? `<div class="ws-card__where vw-in">${venue ? `<p class="ws-card__venue">${esc(venue)}</p>` : ''}${city ? `<p class="ws-cap">${esc(city)}</p>` : ''}</div>` : ''}
        </div>
        ${art(ctx, 'gate.sprig', 'ws-card__sprig vw-in', '(max-width: 699px) 40vw, 260px', 420)}
        ${seal(ctx, 'ws-card__seal vw-in')}
      </div>
      ${P.cue(P.lead || story.length ? 'couple' : 'date')}
    </section>`;

    // 1 · the story, written as a letter, a photo tucked in at the top
    const couple = (P.lead || story.length) ? `
    <section class="ws-sec ws-couple" id="couple" aria-labelledby="couple-h">
      ${head('couple-h', txt('couple.title'))}
      <article class="ws-sheet ws-letter">
        <div class="ws-sheet__in vw-rise">
          ${P.lead ? `<figure class="ws-print">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 699px) 80vw, 420px')}</figure>` : ''}
          ${story.length ? `<div class="ws-letter__body" id="story">
            ${on(txt('story.title')) ? `<p class="ws-letter__hi">${bi(txt('story.title'))}</p>` : ''}
            ${story.map((s) => `<p class="ws-letter__p"><span class="ws-letter__yr">${bi(s.year)}</span> ${bi(s.text)}</p>`).join('')}
            <p class="ws-letter__sign">${on(txt('story.sign')) ? `${bi(txt('story.sign'))}<br />` : ''}<span>${names({ amp: '<em>&amp;</em>' })}</span></p>
          </div>` : ''}
        </div>
      </article>
    </section>` : '';

    // 2 · a note: save the date, the countdown
    const date = `
    <section class="ws-sec ws-date" id="date" aria-labelledby="date-h">
      <div class="ws-sheet ws-note ws-note--date">
        <div class="ws-sheet__in vw-rise">
          <h2 class="ws-h2 ws-note__h" id="date-h">${bi(txt('count.title'))}</h2>
          <p class="ws-note__when">${esc(D.long)}${D.time ? `<br />${esc(`${D.time}${D.zone ? ` ${D.zone}` : ''}`)}` : ''}</p>
          ${P.countdown('ws-count')}
          <div class="ws-btns">${P.calendarBtn()}${P.shareBtn()}</div>
        </div>
      </div>
    </section>`;

    // 3 · the schedule: note cards that swipe on phones, three across on desktop
    const programme = P.events.length ? `
    <section class="ws-sec ws-prog" id="programme" aria-labelledby="prog-h">
      ${head('prog-h', txt('prog.title'), P.events.length > 1 && on(txt('prog.hint')) ? `<p class="ws-cap ws-prog__hint" aria-hidden="true">${bi(txt('prog.hint'))} <span>→</span></p>` : '')}
      <ol class="ws-cards${P.events.length === 1 ? ' ws-cards--one' : ''}" tabindex="0" aria-label="${esc(txt('prog.title').en)}">${P.events.map((ev, i) => `
        <li class="ws-sheet ws-ev" id="ev-${esc(ev.id)}">
          <div class="ws-sheet__in ws-ev__in">
            <p class="ws-ev__stamp" aria-hidden="true"><span>${esc(ev.d.wdShort)}</span><b>${esc(ev.d.day)}</b><span>${esc(ev.d.monthShort)}</span></p>
            <p class="ws-cap ws-ev__n" aria-hidden="true">${String(i + 1).padStart(2, '0')} / ${String(P.events.length).padStart(2, '0')}</p>
            <h3 class="ws-ev__title">${bi(ev.title)}</h3>
            <p class="sr-only">${esc(ev.d.long)}</p>
            <p class="ws-ev__time">${esc(ev.time)}</p>
            <p class="ws-ev__venue">${bi(ev.venue)}</p>
            ${P.mapLink(ev)}
            ${ev.blurb ? `<p class="ws-ev__blurb">${bi(ev.blurb)}</p>` : ''}
            ${ev.dress ? `<p class="ws-ev__dress">${P.swatches(ev)}<span>${bi(ev.dress.text)}</span></p>` : ''}
            ${P.orderList(ev)}
          </div>
        </li>`).join('')}
      </ol>
    </section>` : '';

    // 4 · the hosts and the full card; the verse as its own small note
    const verse = ctx.verse('ws-verse');
    const hosts = `
    <section class="ws-sec ws-hosts" id="card" aria-labelledby="hosts-h">
      <div class="ws-hosts__row${verse ? '' : ' ws-hosts__row--one'}">
        <div class="ws-sheet ws-note ws-note--hosts">
          <div class="ws-sheet__in vw-rise">
            <p class="ws-cap" id="hosts-h">${bi(txt('families.title'))}</p>
            ${P.hosts ? `<p class="ws-hosts__names">${bi(P.hosts)}</p>` : `<p class="ws-hosts__names">${names({ amp: '<em>&amp;</em>' })}</p>`}
            ${P.families.length ? `<ul class="ws-hosts__fam">${P.families.map((f) => (on(f.person.parents) ? `<li>${bi(f.person.parents)}</li>` : '')).join('')}</ul>` : ''}
            ${P.cardBtn('vw-btn--line')}
          </div>
        </div>
        ${verse ? `<div class="ws-sheet ws-note ws-note--verse"><div class="ws-sheet__in vw-rise">${ctx.emblem('ws-note__emblem')}${verse}</div></div>` : ''}
      </div>
    </section>`;

    // 5 · photographs: one column, then two, then three, all whole
    const photos = P.photos.length ? `
    <section class="ws-sec ws-photos" id="photos" aria-labelledby="ph-h">
      ${head('ph-h', txt('gallery.title'))}
      <div class="ws-album">${P.photos.map((g, i) => `<figure class="ws-album__it vw-rise">${P.photoBtn(g, i, '(max-width: 699px) 92vw, (max-width: 1099px) 46vw, 360px')}</figure>`).join('')}</div>
    </section>` : '';

    // 6 · notes for the trip
    const info = (P.hasInfo || P.live) ? `
    <section class="ws-sec ws-info" id="info" aria-labelledby="info-h">
      ${head('info-h', txt('info.title'))}
      ${P.hasInfo ? P.infoBlocks('ws-notes') : ''}
      ${P.liveBlock('ws-note ws-live vw-rise')}
    </section>` : '';

    // 7 · the reply card, slipped into its own small envelope
    const rsvp = `
    <section class="ws-sec ws-rsvp" id="rsvp" aria-labelledby="rsvp-title">
      ${head('rsvp-title', txt('rsvp.title'), P.deadline ? `<p class="ws-rsvp__by">${bi(P.deadline)}</p>` : '')}
      <div class="ws-reply">
        <div class="ws-reply__back" aria-hidden="true"><svg viewBox="0 0 100 40" preserveAspectRatio="none" focusable="false"><path d="M0 40 L50 2 L100 40 Z" fill="var(--ws-sage-deep)"/></svg></div>
        <div class="ws-sheet ws-reply__card"><div class="ws-sheet__in vw-rise">${P.rsvpForm()}</div></div>
        <svg class="ws-reply__pocket" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M0 0 L50 17 L100 0 V30 H0 Z" fill="var(--ws-sage)"/>
          <path d="M0 0 L50 17 L100 0 M0 30 L44 14.5 M100 30 L56 14.5" fill="none" stroke="rgba(40,60,44,.16)" stroke-width=".6" vector-effect="non-scaling-stroke"/>
        </svg>
      </div>
    </section>`;

    const close = `
    <footer class="ws-close" aria-label="Closing">
      ${seal(ctx, 'ws-close__seal')}
      ${ctx.closing ? `<p class="ws-close__line">${bi(ctx.closing)}</p>` : ''}
      <p class="ws-close__names">${names({ amp: '<em>&amp;</em>' })}</p>
      ${ctx.hashtag ? `<p class="ws-close__tag">${esc(ctx.hashtag)}</p>` : ''}
      ${P.madeWith()}
    </footer>`;

    return hero + couple + date + programme + hosts + photos + info + rsvp + close;
  },

  // desktop only: each letter and note tilts up off the table toward the reader as it arrives
  scroll(ctx) {
    if (ctx.reduced) return;
    const { gsap } = ctx;
    gsap.matchMedia().add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      document.querySelectorAll('.ws-sheet').forEach((el) => {
        gsap.fromTo(el, { rotateX: 24, y: 70, z: -60, transformPerspective: 1200, transformOrigin: '50% 100%' },
          { rotateX: 0, y: 0, z: 0, ease: 'power1.out', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 62%', scrub: 0.6 } });
      });
      const pocket = document.querySelector('.ws-reply__pocket');
      if (pocket) gsap.fromTo(pocket, { y: 40 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '.ws-reply', start: 'top 85%', end: 'center 60%', scrub: 0.6 } });
    });
  },
};

mountVow(SPEC);
