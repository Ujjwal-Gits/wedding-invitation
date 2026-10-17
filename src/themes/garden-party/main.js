// Garden Party: a sunny watercolor garden (a white rose arbor, white chairs, a lawn aisle, cypress trees) under a
// soft blue sky. The signature moment: a sheet of frosted vellum with the names printed on it lies over the painting;
// on Open it lifts and is peeled away to the side, and the garden comes through in full color.
// The body is a split screen on desktop: the garden stays fixed on the right (a slow camera push-in as you scroll)
// while the invitation scrolls beside it; on phones the garden is a band above the content. The schedule is a little
// party menu plus folded tent place cards (they stand up off the table on desktop); the reply is a guestbook page.
import './garden.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';

/** a slot's art at its two sizes (watercolor, never a photo of people) */
const art = (ctx, id, cls, sizes, { eager = false, alt = false } = {}) => {
  const ref = ctx.S.img(id);
  if (!ref) return '';
  const sm = ctx.photoUrl(ref, 'sm'); const lg = ctx.photoUrl(ref, 'lg');
  const text = alt && typeof ref === 'object' ? ref.alt || '' : '';
  return `<img class="${cls}" src="${ctx.esc(sm)}" srcset="${ctx.esc(sm)} 640w, ${ctx.esc(lg)} 1200w" sizes="${sizes}" alt="${ctx.esc(text)}" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} />`;
};
const AWNING = '<div class="gp-awning" aria-hidden="true"><i></i></div>';
const DESKTOP = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';

const SPEC = {
  slug: 'garden-party',
  manifest,
  ownButtons: true,
  demo: {
    bride: 'Grace', brideLast: 'Lee', groom: 'Michael', groomLast: 'Turner', date: '2027-06-26', time: '17:00', tz: 'America/Los_Angeles',
    venue: 'Magnolia Gardens', city: 'Pasadena, CA', mapQuery: 'Huntington Library Botanical Gardens, San Marino, CA',
    dress: 'Garden party attire', colors: ['#2D6A3E', '#F2C4C0', '#FFFFFF'], hashtag: '#GraceAndMichaelInBloom', deadline: 'Kindly reply by May 26, 2027',
    welcomeVenue: 'The Rose Terrace', brunchVenue: 'The Rose Terrace',
  },

  // ───────── the gate: frosted vellum over the garden, the names printed on it ─────────
  gate(ctx) {
    const { bi, esc, txt, on, D, names } = ctx;
    return `<div class="gp-gate">
      <div class="gp-vellum" id="vellum">
        <div class="gp-vellum__shadow" aria-hidden="true"></div>
        <div class="gp-vellum__sheet">
          <div class="gp-vellum__print">
            ${ctx.emblem('gp-vellum__emblem')}
            ${on(txt('gate.line')) ? `<p class="gp-vellum__line">${bi(txt('gate.line'))}</p>` : ''}
            <p class="gp-vellum__names">${names({ amp: '&amp;' })}</p>
            <p class="gp-vellum__date">${esc(D.short)}</p>
            <div class="gp-vellum__ui" id="gui">
              <button class="vw-btn" id="open" type="button" disabled>${bi(txt('gate.open'))}</button>
              <button class="vw-quiet" id="quiet" type="button" disabled>${bi(txt('gate.quiet'))}</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },
  open(ctx, tl, gate) {
    const { gsap } = ctx;
    const phone = window.matchMedia('(max-width: 699px)').matches;
    gsap.set('#vellum', { transformOrigin: '0% 100%' });
    gsap.set('.gp-hero__garden', { transformOrigin: '50% 100%' });
    tl.to('#gui', { autoAlpha: 0, y: 8, duration: 0.3, ease: 'power2.out' }, 0)
      // the sheet is picked up: a hair larger, its shadow grows under it
      .to('#vellum', { scale: 1.018, y: -8, duration: 0.5, ease: 'power2.out' }, 0.05)
      .to('.gp-vellum__shadow', { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.05)
      // and peeled away to the upper right
      .to('#vellum', { xPercent: phone ? 118 : 108, yPercent: -22, rotation: -9, duration: 1.3, ease: 'power2.in' }, 0.5)
      .to('#vellum', { opacity: 0, duration: 0.35, ease: 'power1.in' }, 1.4)
      // the garden settles as it comes through
      .fromTo('.gp-hero__garden', { scale: 1.045 }, { scale: 1, duration: 1.9, ease: 'power3.out' }, 0.55)
      .fromTo('.gp-hero__sky', { y: -14 }, { y: 0, duration: 1.6, ease: 'power3.out' }, 0.55)
      .set(gate, { pointerEvents: 'none' }, 0.6);
    return 1.3;
  },

  // the guestbook asks for a signature, not a form field
  ready(ctx) {
    const label = document.querySelector('.gp-book label[for="f-name"]');
    const sign = ctx.txt('rsvp.sign');
    if (label && ctx.on(sign)) label.textContent = sign.en;
  },

  // desktop only: the fixed garden pushes in slowly as the page scrolls; the tent cards stand up off the table
  scroll(ctx) {
    const { gsap, reduced } = ctx;
    if (reduced) return;
    gsap.matchMedia().add(DESKTOP, () => {
      gsap.fromTo('.gp-hero__art', { scale: 1 }, {
        scale: 1.12, ease: 'none', transformOrigin: '50% 78%',
        scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      });
      gsap.utils.toArray('.gp-card__face').forEach((face, i) => {
        gsap.fromTo(face, { rotateX: -64, y: 26, opacity: 0.2 }, {
          rotateX: 0, y: 0, opacity: 1, duration: 0.95, delay: (i % 2) * 0.1, ease: 'power3.out', transformOrigin: '50% 100%',
          scrollTrigger: { trigger: face, start: 'top 88%', once: true },
        });
      });
    });
  },

  // ───────── the page ─────────
  page(ctx) {
    const { bi, esc, txt, on, parts: P, D, venue, city, names } = ctx;
    const place = [venue, city].filter(Boolean);
    const story = P.story;
    const h2 = (id, title, kicker = '', cls = '') => `<header class="gp-head ${cls} vw-rise">${kicker ? `<p class="gp-eyebrow">${kicker}</p>` : ''}<h2 class="gp-h2" id="${id}">${bi(title)}</h2></header>`;

    const hero = `
    <section class="vw-hero gp-hero" id="top" aria-label="${esc(ctx.namesText)}">
      ${art(ctx, 'hero.sky', 'gp-hero__sky', '100vw', { eager: true })}
      <div class="gp-hero__words">
        ${on(txt('hero.kicker')) ? `<p class="gp-eyebrow gp-hero__kicker vw-in">${bi(txt('hero.kicker'))}</p>` : ''}
        <h1 class="gp-names vw-in">${names({ amp: '&amp;' })}</h1>
        ${on(txt('hero.line')) ? `<p class="gp-hero__line vw-in">${bi(txt('hero.line'))}</p>` : ''}
        <p class="gp-hero__date vw-in"><span>${esc(D.wd)}</span><i aria-hidden="true"></i><span>${esc(`${D.month} ${D.day}`)}</span><i aria-hidden="true"></i><span>${esc(D.year)}</span></p>
        ${place.length || D.time ? `<p class="gp-hero__place vw-in">${place.length ? `<b>${esc(place[0])}</b>` : ''}${D.time ? `<span>${esc(D.spelled.time)}</span>` : ''}</p>` : ''}
      </div>
      <div class="gp-hero__garden">${art(ctx, 'hero.garden', 'gp-hero__art', '(max-width: 899px) 100vw, 50vw', { eager: true, alt: true })}</div>
      ${P.cue(P.lead || story.length ? 'couple' : 'date')}
    </section>`;

    const couple = (P.lead || story.length) ? `
    <section class="gp-sec gp-couple" id="couple" aria-labelledby="couple-h">
      <div class="gp-couple__in${P.lead ? '' : ' gp-couple__in--solo'}">
        ${h2('couple-h', txt('couple.title'), on(txt('story.title')) && story.length ? esc(txt('story.title').en) : '', 'gp-head--left')}
        ${P.lead ? `<figure class="gp-portrait vw-rise">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 899px) 90vw, 46vw')}</figure>` : ''}
        ${story.length ? `<ol class="gp-chapters" id="story">${story.map((s) => `<li class="gp-chapter vw-rise"><p class="gp-chapter__year">${bi(s.year)}</p><p class="gp-chapter__text">${bi(s.text)}</p></li>`).join('')}</ol>` : ''}
      </div>
    </section>` : '';

    const date = `
    <section class="gp-sec gp-date" id="date" aria-labelledby="date-h">
      <div class="gp-date__in vw-rise">
        <p class="gp-eyebrow" id="date-h">${bi(txt('count.title'))}</p>
        <p class="gp-date__day"><span>${esc(`${D.wd},`)}</span> <span>${esc(`${D.month} ${D.day}`)}</span></p>
        <p class="gp-date__sub">${esc([D.year, D.time ? `${D.time}${D.zone ? ` ${D.zone}` : ''}` : '', place.join(', ')].filter(Boolean).join(' · '))}</p>
        ${P.countdown('gp-count')}
        <div class="gp-btns">${P.calendarBtn()}${P.shareBtn()}</div>
      </div>
    </section>`;

    // the schedule: a little party menu (every event at a glance), then a folded tent place card for each
    const days = [];
    for (const ev of P.events) {
      const last = days[days.length - 1];
      if (last && last.key === ev.d.short) last.evs.push(ev); else days.push({ key: ev.d.short, label: `${ev.d.wd}, ${ev.d.month} ${ev.d.day}`, evs: [ev] });
    }
    const programme = P.events.length ? `
    ${AWNING}
    <section class="gp-sec gp-prog" id="programme" aria-labelledby="prog-h">
      ${h2('prog-h', txt('prog.title'), span(ctx), 'gp-head--left')}
      ${P.events.length > 1 ? `<nav class="gp-menu vw-rise" aria-label="${esc(txt('prog.menu').en || txt('prog.title').en)}">
        ${on(txt('prog.menu')) ? `<p class="gp-menu__h">${bi(txt('prog.menu'))}</p>` : ''}
        <div class="gp-menu__days">${days.map((d) => `<div class="gp-menu__d"><p class="gp-menu__day">${esc(d.label)}</p><ul class="gp-menu__list">${d.evs.map((ev) => `<li><a href="#ev-${esc(ev.id)}"><span>${bi(ev.title)}</span><i aria-hidden="true"></i><span class="gp-menu__t">${esc(ev.d.time)}</span></a></li>`).join('')}</ul></div>`).join('')}</div>
      </nav>` : ''}
      <ol class="gp-cards${P.events.length > 1 ? '' : ' gp-cards--one'}">${P.events.map((ev) => `
        <li class="gp-card vw-rise" id="ev-${esc(ev.id)}">
          <div class="gp-card__face">
            <p class="gp-card__day">${esc(`${ev.d.wd}, ${ev.d.month} ${ev.d.day}`)}</p>
            <h3 class="gp-card__title">${bi(ev.title)}</h3>
            <p class="gp-card__time">${esc(ev.time)}</p>
            <p class="gp-card__venue"><span>${bi(ev.venue)}</span>${P.mapLink(ev)}</p>
            ${ev.blurb ? `<p class="gp-card__blurb">${bi(ev.blurb)}</p>` : ''}
            ${ev.dress ? `<p class="gp-card__dress">${P.swatches(ev)}<span>${bi(ev.dress.text)}</span></p>` : ''}
            ${ev.order.length ? `<ol class="gp-card__menu">${ev.order.map((r) => `<li><span>${bi(r.title)}</span><i aria-hidden="true"></i><span class="gp-menu__t">${esc(r.time)}</span></li>`).join('')}</ol>` : ''}
          </div>
        </li>`).join('')}
      </ol>
    </section>` : '';

    const fam = P.families.map((f) => (on(f.person.parents) ? `<li>${bi(f.person.parents)}</li>` : '')).filter(Boolean);
    const hosts = `
    <section class="gp-sec gp-hosts" id="card" aria-labelledby="hosts-h">
      <div class="gp-hosts__in vw-rise">
        <p class="gp-eyebrow" id="hosts-h">${bi(txt('families.title'))}</p>
        ${P.hosts ? `<p class="gp-hosts__names">${bi(P.hosts)}</p>` : `<p class="gp-hosts__names">${names({ amp: '&amp;' })}</p>`}
        ${fam.length ? `<ul class="gp-hosts__fam">${fam.join('')}</ul>` : ''}
        ${P.cardBtn('vw-btn--line')}
      </div>
    </section>`;

    const photos = P.photos.length ? `
    <section class="gp-sec gp-photos" id="photos" aria-labelledby="ph-h">
      ${h2('ph-h', txt('gallery.title'), '', 'gp-head--left')}
      <div class="gp-rows">${P.photos.map((g, i) => {
        const r = Math.min(Math.max(P.ratio(g.photo) || 1.33, 0.5), 2.2);
        return `<figure class="gp-rows__it vw-rise" style="--r:${r.toFixed(3)}">${P.photoBtn(g, i, '(max-width: 699px) 60vw, (max-width: 1100px) 40vw, 420px')}</figure>`;
      }).join('')}<i class="gp-rows__fill" aria-hidden="true"></i></div>
    </section>` : '';

    const info = (P.hasInfo || P.live) ? `
    <section class="gp-sec gp-info" id="info" aria-labelledby="info-h">
      ${h2('info-h', txt('info.title'), '', 'gp-head--left')}
      ${P.hasInfo ? P.infoBlocks('gp-info__grid vw-rise') : ''}
      ${P.liveBlock('gp-live vw-rise')}
    </section>` : '';

    // the reply: a page of the guestbook, lined, to sign
    const rsvp = `
    <section class="gp-sec gp-rsvp" id="rsvp" aria-labelledby="rsvp-title">
      <div class="gp-book vw-rise">
        <i class="gp-book__ribbon" aria-hidden="true"></i>
        <div class="gp-book__page">
          <header class="gp-book__head">
            ${on(txt('rsvp.kicker')) ? `<p class="gp-eyebrow">${bi(txt('rsvp.kicker'))}</p>` : ''}
            <h2 class="gp-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
            ${P.deadline ? `<p class="gp-rsvp__by">${bi(P.deadline)}</p>` : ''}
          </header>
          ${P.rsvpForm()}
        </div>
      </div>
    </section>`;

    const close = `
    ${AWNING}
    <footer class="gp-close" aria-label="Closing">
      <div class="gp-close__window">${art(ctx, 'close.arbor', 'gp-close__art', '(max-width: 699px) 240px, 300px', { alt: true })}</div>
      ${ctx.verse('gp-close__verse')}
      ${ctx.closing ? `<p class="gp-close__line">${bi(ctx.closing)}</p>` : ''}
      <p class="gp-close__names">${names({ amp: '&amp;' })}</p>
      ${ctx.hashtag ? `<p class="gp-close__tag">${esc(ctx.hashtag)}</p>` : ''}
      ${P.madeWith()}
    </footer>`;

    return hero + couple + date + programme + hosts + photos + info + rsvp + close;
  },
};

/** "June 25 – 27" over a weekend, else nothing */
function span(ctx) {
  const s = ctx.span;
  if (!s) return '';
  return ctx.esc(s.from.month === s.to.month ? `${s.from.month} ${s.from.day} – ${s.to.day}` : `${s.from.monthShort} ${s.from.day} – ${s.to.monthShort} ${s.to.day}`);
}

mountVow(SPEC);
