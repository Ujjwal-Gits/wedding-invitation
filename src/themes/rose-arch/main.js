// Rose Arch: a pale stone arch covered in climbing roses, deep rose on white with blush and garden-green rooms.
// The signature moment: the guest walks through the arch. The arch fills the screen with the names above it; on Open
// it grows around its green doorway (transform only, origin at the doorway) until the soft green fills the view, the
// green brightens, and the first screen arrives with the date standing in the same doorway.
// After that, "garden rooms": the body is a deck of room cards on a garden-green field that tilt up and lift into
// place as you scroll (desktop; phones fade). Each event is its own deck card with an arched date plaque, stacking on
// the one before; the reply card lifts toward you out of the rose arch.
import './rose-arch.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';
import { mapUrl } from '../../core/i18n.js';

/** where the doorway's centre sits in each art file (fractions of the image box) */
const GATE_DOOR = { x: 0.51, y: 0.6, w: 0.3, h: 0.34 }; // gate.webp, 1200×2400
const TINTS = ['white', 'blush', 'ivory', 'white'];

const ICON = '<svg class="ra-icon" viewBox="0 0 14 18" aria-hidden="true" focusable="false"><path d="M1.5 17V8.2C1.5 4.6 4 2.2 7 1c3 1.2 5.5 3.6 5.5 7.2V17" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 17v-7c0-1.8 1-3.2 2.5-4 1.5.8 2.5 2.2 2.5 4v7" fill="none" stroke="currentColor" stroke-width=".9" opacity=".6"/></svg>';
/** a pointed stone-arch silhouette stretched to its box (fill + an inset line drawn in the same space) */
const ARCH_PANEL = `<svg class="ra-panel__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <path class="ra-panel__fill" d="M0 100V36C0 17 20 5 50 0c30 5 50 17 50 36v64Z"/>
  <path class="ra-panel__line" d="M3.2 97.6V36.6C3.2 20 21 9.4 50 4.4c29 5 46.8 15.6 46.8 32.2v61Z" vector-effect="non-scaling-stroke"/>
</svg>`;
/** the top of the reply card: a pointed cap in the card's rose */
const CAP = '<svg class="ra-rsvp__cap" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 40V30C0 15 22 5 50 0c28 5 50 15 50 30v10Z"/></svg>';

const artImg = (ctx, id, cls, sizes, eager = false) => {
  const ref = ctx.S.img(id);
  if (!ref) return '';
  const sm = ctx.esc(ctx.photoUrl(ref, 'sm')); const lg = ctx.esc(ctx.photoUrl(ref, 'lg'));
  return `<img class="${cls}" src="${sm}" srcset="${sm} 640w, ${lg} 1200w" sizes="${sizes}" alt="" decoding="async"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} />`;
};

const SPEC = {
  slug: 'rose-arch',
  manifest,
  ownButtons: true,
  demo: {
    bride: 'Olivia', brideLast: 'Hayes', groom: 'Daniel', groomLast: 'Brooks', date: '2027-09-18', time: '17:00', tz: 'America/New_York',
    venue: 'Rosewood Estate', city: 'Savannah, GA', mapQuery: 'Rosewood Estate, Savannah, GA',
    dress: 'Black tie optional', colors: ['#7E2A40', '#E9B9B4', '#DCE6C4'], hashtag: '#OliviaAndDanielSayIDo', deadline: 'Kindly reply by August 1, 2027',
    welcomeVenue: 'The Rose Terrace', brunchVenue: 'The Rose Terrace',
  },

  // ───────── the gate: the rose arch, the names above it, the way in through the doorway ─────────
  gate(ctx) {
    const { bi, txt, on, names } = ctx;
    return `<div class="ra-gate">
      <div class="ra-stage">
        ${artImg(ctx, 'gate.arch', 'ra-stage__art', '(max-aspect-ratio: 1/2) 100vw, 50svh', true)}
        <div class="ra-gate__top">
          ${ctx.emblem('ra-gate__emblem')}
          ${on(txt('gate.line')) ? `<p class="ra-gate__line">${bi(txt('gate.line'))}</p>` : ''}
          <p class="ra-gate__names">${names({ amp: '&amp;' })}</p>
        </div>
        <div class="ra-gate__door">
          <button class="vw-btn ra-step" id="open" type="button" disabled>${bi(txt('gate.open'))}</button>
          <button class="vw-quiet" id="quiet" type="button" disabled>${bi(txt('gate.quiet'))}</button>
        </div>
      </div>
      <div class="ra-veil" aria-hidden="true"><i></i></div>
    </div>`;
  },
  open(ctx, tl) {
    const { gsap } = ctx;
    const art = document.querySelector('.ra-stage__art');
    const vw = window.innerWidth; const vh = window.innerHeight;
    const r = art?.getBoundingClientRect();
    tl.to('.ra-gate__top, .ra-gate__door', { autoAlpha: 0, y: -10, duration: 0.45, ease: 'power2.out', stagger: 0.06 }, 0);
    if (r && r.width) {
      const px = r.left + GATE_DOOR.x * r.width; const py = r.top + GATE_DOOR.y * r.height;
      const s = Math.max(vw / (GATE_DOOR.w * r.width), vh / (GATE_DOOR.h * r.height)) * 1.2;
      gsap.set(art, { transformOrigin: `${GATE_DOOR.x * 100}% ${GATE_DOOR.y * 100}%`, force3D: true });
      tl.to(art, { scale: s, x: vw / 2 - px, y: vh / 2 - py, duration: 2.1, ease: 'power3.inOut' }, 0.2);
    }
    tl.to('.ra-veil', { opacity: 1, duration: 0.85, ease: 'power1.inOut' }, 1.25)
      .to('.ra-veil i', { opacity: 1, duration: 0.6, ease: 'power1.inOut' }, 1.85)
      .to('#gate', { autoAlpha: 0, duration: 0.7, ease: 'power2.out' }, 2.3)
      .fromTo('.ra-hero__arch', { opacity: 0, scale: 1.07 }, { opacity: 1, scale: 1, duration: 1.5, ease: 'power3.out' }, 2.2);
    gsap.set('.ra-hero__arch', { transformOrigin: '51% 48%' });
    return 2.45;
  },

  // ───────── the page ─────────
  page(ctx) {
    const { bi, esc, txt, on, parts: P, D, venue, city, names, c } = ctx;
    const head = (id, title, kicker = '', cls = '') => `<header class="ra-head vw-rise ${cls}">${kicker ? `<p class="ra-eyebrow">${ICON}<span>${kicker}</span></p>` : `<p class="ra-eyebrow" aria-hidden="true">${ICON}</p>`}<h2 class="ra-h2" id="${id}">${bi(title)}</h2></header>`;
    const place = [venue, city].filter(Boolean);
    const story = P.story;
    const amp = '<span class="ra-amp">&amp;</span>';

    const hero = `
    <section class="vw-hero ra-hero" id="top" aria-label="${esc(ctx.namesText)}">
      <div class="ra-hero__words">
        ${on(txt('hero.kicker')) ? `<p class="ra-eyebrow ra-hero__kicker vw-in">${bi(txt('hero.kicker'))}</p>` : ''}
        <h1 class="ra-names vw-in">${names({ amp })}</h1>
        ${on(txt('hero.line')) ? `<p class="ra-hero__line vw-in">${bi(txt('hero.line'))}</p>` : ''}
      </div>
      <div class="ra-hero__arch">
        ${artImg(ctx, 'hero.arch', 'ra-hero__art', '(min-width: 1000px) 60svh, 100vw', true)}
        <div class="ra-hero__door vw-in">
          <p class="ra-hero__month">${esc(D.month)}</p>
          <p class="ra-hero__day">${esc(D.day)}</p>
          <p class="ra-hero__year">${esc(D.year)}</p>
          ${D.time ? `<p class="ra-hero__time">${esc(D.wd)} · ${esc(D.time)}</p>` : `<p class="ra-hero__time">${esc(D.wd)}</p>`}
          ${place.length ? `<p class="ra-hero__place">${venue ? `<b>${esc(venue)}</b>` : ''}${city ? `<span>${esc(city)}</span>` : ''}</p>` : ''}
        </div>
      </div>
      ${P.cue(P.lead || story.length ? 'couple' : 'date')}
    </section>`;

    const full = [c.bride, ctx.isPair ? c.groom : null].filter((p) => p && on(p.fullName)).map((p) => `<span>${bi(p.fullName)}</span>`);
    const couple = (P.lead || story.length) ? `
    <section class="ra-room ra-room--white ra-couple" id="couple" aria-labelledby="couple-h">
      <div class="ra-couple__top${P.lead ? '' : ' ra-couple__top--solo'}">
        <div class="ra-couple__words">
          ${head('couple-h', txt('couple.title'), on(txt('story.title')) && story.length ? esc(txt('story.title').en) : '')}
          ${full.length ? `<p class="ra-couple__names vw-rise">${full.join(full.length > 1 ? '<i aria-hidden="true">&amp;</i><span class="sr-only"> and </span>' : '')}</p>` : ''}
        </div>
        ${P.lead ? `<figure class="ra-portrait${(P.ratio(P.lead.photo) || 1.5) < 1 ? ' ra-portrait--tall' : ''} vw-rise">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 899px) 90vw, 520px')}</figure>` : ''}
      </div>
      ${story.length ? `<ol class="ra-story" id="story">${story.map((s, i) => `
        <li class="ra-story__it ra-story__it--${i % 2 ? 'r' : 'l'} vw-rise"><span class="ra-story__node" aria-hidden="true">${ICON}</span><p class="ra-story__year">${bi(s.year)}</p><p class="ra-story__text">${bi(s.text)}</p></li>`).join('')}
      </ol>` : ''}
    </section>` : '';

    const date = `
    <section class="ra-room ra-room--blush ra-date" id="date" aria-labelledby="date-h">
      <div class="ra-date__in">
        <div class="ra-date__words vw-rise">
          <p class="ra-eyebrow">${ICON}<span>${esc(D.wd)}</span></p>
          <h2 class="ra-h2" id="date-h">${bi(txt('count.title'))}</h2>
          <p class="ra-date__long">${esc(D.short)}${D.time ? `<span>${esc(`${D.time}${D.zone ? ` ${D.zone}` : ''}`)}</span>` : ''}</p>
          ${place.length ? `<p class="ra-date__place">${esc(place.join(', '))}</p>` : ''}
          <div class="ra-btns">${P.calendarBtn()}${P.shareBtn()}</div>
        </div>
        <div class="ra-window vw-rise">
          <svg class="ra-window__svg" viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M1 119V44C1 22 22 7 50 1c28 6 49 21 49 43v75Z" vector-effect="non-scaling-stroke"/>
            <path d="M5 115V45C5 26 24 13 50 7.5 76 13 95 26 95 45v70Z" vector-effect="non-scaling-stroke" opacity=".5"/>
          </svg>
          ${P.countdown('ra-count')}
        </div>
      </div>
    </section>`;

    /** the arched date plaque on each event card */
    const plaque = (ev) => `<div class="ra-plaque" aria-hidden="true">
        <svg class="ra-plaque__svg" viewBox="0 0 100 130" preserveAspectRatio="none" focusable="false"><path d="M2 128V48C2 25 22 9 50 2c28 7 48 23 48 46v80Z" vector-effect="non-scaling-stroke"/></svg>
        <span class="ra-plaque__wd">${esc(ev.d.wdShort)}</span><b class="ra-plaque__day">${esc(ev.d.day)}</b><span class="ra-plaque__mo">${esc(ev.d.monthShort)}</span>
      </div>`;
    const programme = P.events.length ? `
    <section class="ra-prog" id="programme" aria-labelledby="prog-h">
      <div class="ra-prog__in">
        <div class="ra-prog__side">
          ${head('prog-h', txt('prog.title'), span(ctx))}
          ${P.events.length > 1 ? `<ol class="ra-index vw-rise">${P.events.map((ev, i) => `<li><a href="#ev-${esc(ev.id)}"><span class="ra-index__n">${String(i + 1).padStart(2, '0')}</span><span class="ra-index__t">${bi(ev.title)}</span><span class="ra-index__d">${esc(ev.d.wdShort)}, ${esc(ev.d.monthShort)} ${esc(ev.d.day)}</span></a></li>`).join('')}</ol>` : ''}
        </div>
        <ol class="ra-cards">${P.events.map((ev, i) => `
          <li class="ra-card ra-card--${TINTS[i % TINTS.length]} vw-rise" id="ev-${esc(ev.id)}" style="--i:${i}">
            <div class="ra-card__lift"><div class="ra-card__in">
              ${plaque(ev)}
              <div class="ra-card__main">
                <p class="ra-card__no" aria-hidden="true">${String(i + 1).padStart(2, '0')} / ${String(P.events.length).padStart(2, '0')}</p>
                <h3 class="ra-card__title">${bi(ev.title)}</h3>
                <p class="sr-only">${esc(ev.d.long)}</p>
                <p class="ra-card__time">${esc(ev.time)}</p>
                <p class="ra-card__venue">${bi(ev.venue)} ${P.mapLink(ev)}</p>
                ${ev.blurb ? `<p class="ra-card__blurb">${bi(ev.blurb)}</p>` : ''}
              </div>
              ${ev.dress || ev.order.length ? `<div class="ra-card__aside">
                ${ev.dress ? `<p class="ra-card__dress"><span class="ra-card__label">${P.UI.wear}</span><span>${P.swatches(ev)}${bi(ev.dress.text)}</span></p>` : ''}
                ${P.orderList(ev)}
              </div>` : ''}
            </div></div>
          </li>`).join('')}
        </ol>
      </div>
    </section>` : '';

    const hosts = `
    <section class="ra-hosts" id="card" aria-labelledby="hosts-h">
      <div class="vw-rise"><div class="ra-panel">
        ${ARCH_PANEL}
        <div class="ra-panel__in">
          ${ctx.emblem('ra-panel__emblem') || ICON}
          ${ctx.verse('ra-panel__verse')}
          <p class="ra-eyebrow" id="hosts-h">${bi(txt('families.title'))}</p>
          ${P.hosts ? `<p class="ra-hosts__names">${bi(P.hosts)}</p>` : ''}
          ${P.families.length ? `<p class="ra-hosts__fam">${P.families.map((f) => (on(f.person.parents) ? `<span>${bi(f.person.parents)}</span>` : '')).filter(Boolean).join('')}</p>` : ''}
          ${P.cardBtn()}
        </div>
      </div></div>
    </section>`;

    const photos = P.photos.length ? `
    <section class="ra-room ra-room--blush ra-photos" id="photos" aria-labelledby="ph-h">
      ${head('ph-h', txt('gallery.title'), '', 'ra-head--center')}
      <div class="ra-wall">${P.photos.map((g, i) => {
        const r = Math.min(Math.max(P.ratio(g.photo) || 1, 0.5), 2.2);
        return `<figure class="ra-frame ra-frame--${i % 3} vw-rise" style="--r:${r.toFixed(3)}">${P.photoBtn(g, i, `(max-width: 699px) ${r > 1 ? 70 : 40}vw, ${Math.round(r * 300)}px`)}</figure>`;
      }).join('')}</div>
    </section>` : '';

    const stays = P.stays.map((st) => `<li><div><b>${bi(st.name)}</b>${on(st.note) ? `<small>${bi(st.note)}</small>` : ''}</div><a class="vw-link" href="${esc(mapUrl(st.mapQuery || P.pair(st.name).en || ''))}" target="_blank" rel="noopener">${P.UI.map}<span aria-hidden="true"> ↗</span></a></li>`).join('');
    const tel = (p) => String(p).replace(/[^\d+]/g, '');
    const contacts = P.contacts.map((pp) => `<li><div><b>${bi(pp.name)}</b>${on(pp.role) ? `<small>${bi(pp.role)}</small>` : ''}</div><span class="vw-links"><a class="vw-link" href="tel:${esc(tel(pp.phone))}">${P.UI.call}</a><a class="vw-link" href="sms:${esc(tel(pp.phone))}">${P.UI.text}</a></span></li>`).join('');
    const info = (P.hasInfo || P.live) ? `
    <section class="ra-room ra-room--white ra-info" id="info" aria-labelledby="info-h">
      <div class="ra-info__grid">
        <div class="ra-info__lead">
          ${head('info-h', txt('info.title'))}
          ${P.travel ? `<div class="vw-rise"><h3 class="ra-h3">${P.UI.travel}</h3><p class="ra-info__travel">${bi(P.travel)}</p></div>` : ''}
        </div>
        <div class="ra-info__lists">
          ${stays ? `<div class="ra-list vw-rise"><h3 class="ra-h3">${P.UI.stays}</h3><ul>${stays}</ul></div>` : ''}
          ${contacts ? `<div class="ra-list vw-rise"><h3 class="ra-h3">${P.UI.contacts}</h3><ul>${contacts}</ul></div>` : ''}
        </div>
      </div>
      ${P.liveBlock('ra-live vw-rise')}
    </section>` : '';

    const mono = ctx.initials.map(esc).join('<i>&amp;</i>');
    const rsvp = `
    <section class="ra-room ra-room--paper ra-rsvp" id="rsvp" aria-labelledby="rsvp-title">
      <div class="ra-rsvp__garden" aria-hidden="true">
        ${artImg(ctx, 'hero.arch', 'ra-rsvp__art', '(min-width: 1000px) 420px, 60vw')}
        <p class="ra-rsvp__mono">${mono}</p>
      </div>
      <div class="ra-rsvp__wrap vw-rise"><div class="ra-rsvp__card">
        <div class="ra-rsvp__shadow" aria-hidden="true"></div>
        ${CAP}
        <header class="ra-rsvp__head">
          ${ICON}
          <h2 class="ra-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
          ${P.deadline ? `<p class="ra-rsvp__by">${bi(P.deadline)}</p>` : ''}
        </header>
        <div class="ra-rsvp__paper">${P.rsvpForm()}</div>
      </div></div>
    </section>`;

    const close = `
    <footer class="ra-close" aria-label="Closing">
      <div class="ra-close__arch" aria-hidden="true">${artImg(ctx, 'hero.arch', 'ra-close__art', '200px')}</div>
      ${ctx.closing ? `<p class="ra-close__line">${bi(ctx.closing)}</p>` : ''}
      <p class="ra-close__names">${names({ amp })}</p>
      ${ctx.hashtag ? `<p class="ra-close__tag">${esc(ctx.hashtag)}</p>` : ''}
      ${P.madeWith()}
    </footer>`;

    return `${hero}<div class="ra-deck">${couple}${date}${programme}${hosts}${photos}${info}${rsvp}</div>${close}`;
  },

  // ───────── scroll: on wide screens the rooms tilt up and lift into place, event cards stack and sink back,
  // the reply card lifts toward you. Phones and reduced motion keep the engine's quiet fades. ─────────
  scroll(ctx) {
    if (ctx.reduced) return;
    const { gsap, ScrollTrigger } = ctx;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      // rooms: tilted back and a little low as they enter, flat by the time they are well in view
      gsap.utils.toArray('.ra-room:not(.ra-rsvp), .ra-hosts .ra-panel').forEach((room) => {
        gsap.fromTo(room, { rotateX: 9, y: 70, scale: 0.97, transformPerspective: 1600, transformOrigin: '50% 0%' }, {
          rotateX: 0, y: 0, scale: 1, ease: 'none',
          scrollTrigger: { trigger: room, start: 'top bottom', end: 'top 45%', scrub: 0.5 },
        });
      });
      // event cards: each one rises tilted, flattens as it settles on the stack; the one beneath sinks back
      const cards = gsap.utils.toArray('.ra-card');
      cards.forEach((card, i) => {
        gsap.fromTo(card.querySelector('.ra-card__lift'), { rotateX: 14, y: 40, transformPerspective: 1400, transformOrigin: '50% 100%' }, {
          rotateX: 0, y: 0, ease: 'none',
          scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 55%', scrub: 0.5 },
        });
        if (cards[i + 1]) {
          gsap.fromTo(card.querySelector('.ra-card__in'), { scale: 1, rotateX: 0, transformPerspective: 1400, transformOrigin: '50% 0%' }, {
            scale: 0.93, rotateX: -4, ease: 'none',
            scrollTrigger: { trigger: cards[i + 1], start: 'top 85%', end: 'top 30%', scrub: 0.5 },
          });
        }
      });
      // the reply card lifts toward you out of the garden
      const card = document.querySelector('.ra-rsvp__card');
      if (card) {
        const tl = gsap.timeline({ scrollTrigger: { trigger: '.ra-rsvp', start: 'top 90%', end: 'top 15%', scrub: 0.6 } });
        tl.fromTo(card, { rotateX: 16, y: 120, scale: 0.88, transformPerspective: 1500, transformOrigin: '50% 100%' }, { rotateX: 0, y: 0, scale: 1, ease: 'none' }, 0)
          .fromTo('.ra-rsvp__shadow', { opacity: 0.25 }, { opacity: 1, ease: 'none' }, 0);
      }
    });
    ScrollTrigger.refresh();
  },
};

/** "September 17 – 19" over a weekend, else nothing */
function span(ctx) {
  const s = ctx.span;
  if (!s) return '';
  return ctx.esc(s.from.month === s.to.month ? `${s.from.month} ${s.from.day} – ${s.to.day}` : `${s.from.monthShort} ${s.from.day} – ${s.to.monthShort} ${s.to.day}`);
}

mountVow(SPEC);
