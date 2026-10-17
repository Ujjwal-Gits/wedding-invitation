// Olive Grove: a garden invitation in olive green on white. The signature moment: a folded linen card, tied with a
// band and a monogram seal, opens like a gatefold; behind it the watercolor olive wreath settles around the date.
// Everything after is quiet: an olive-branch story line, a calm schedule, whole photos, the reply card.
import './olive.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';

const LEAF = '<svg class="og-leaf" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 21C6 12 12 5 21 3c-1.5 8.5-8 15.5-18 18Z" fill="currentColor" opacity=".22"/><path d="M3 21C8 15 13 9.5 21 3" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
const SPRIG = `<svg class="og-sprig" viewBox="0 0 120 40" aria-hidden="true" focusable="false">
  <path d="M4 20H116" stroke="currentColor" stroke-width=".9"/>
  ${[18, 36, 54, 72, 90].map((x, i) => `<path d="M${x} 20c4-9 11-12 17-12-3 7-9 11-17 12Z" fill="currentColor" opacity="${0.55 - i * 0.04}"/><path d="M${x + 6} 20c4 9 11 12 17 12-3-7-9-11-17-12Z" fill="currentColor" opacity="${0.4 - i * 0.03}"/>`).join('')}
  <ellipse cx="60" cy="20" rx="3.6" ry="4.8" fill="currentColor"/>
</svg>`;

const art = (ctx, cls, sizes) => {
  const ref = ctx.S.img('hero.wreath');
  return ref ? `<img class="${cls}" src="${ctx.esc(ctx.photoUrl(ref, 'sm'))}" srcset="${ctx.esc(ctx.photoUrl(ref, 'sm'))} 640w, ${ctx.esc(ctx.photoUrl(ref, 'lg'))} 1200w" sizes="${sizes}" alt="" decoding="async" />` : '';
};

const SPEC = {
  slug: 'olive-grove',
  manifest,
  demo: {
    bride: 'Emily', brideLast: 'Carter', groom: 'James', groomLast: 'Whitman', date: '2027-06-12', time: '16:00', tz: 'America/New_York',
    venue: 'The Magnolia House', city: 'Charleston, SC', mapQuery: 'Magnolia Plantation and Gardens, Charleston, SC',
    dress: 'Garden formal', colors: ['#4A6136', '#C9D4B8', '#F1E4E0'], hashtag: '#EmilyAndJamesSayIDo', deadline: 'Kindly reply by May 1, 2027',
  },

  // ───────── the gate: a folded linen card with a band and a monogram seal ─────────
  gate(ctx) {
    const { esc, initials } = ctx;
    return `<div class="og-gate" aria-hidden="true">
      <div class="og-fold og-fold--l"><div class="og-fold__face"></div></div>
      <div class="og-fold og-fold--r"><div class="og-fold__face"></div></div>
      <div class="og-band"><div class="og-band__seal"><span class="og-mono">${initials.map(esc).join('<i>&amp;</i>')}</span>${SPRIG}</div></div>
    </div>`;
  },
  open(ctx, tl) {
    const { gsap } = ctx;
    tl.to('.og-band__seal', { scale: 0.86, opacity: 0, duration: 0.45, ease: 'power2.in' }, 0.05)
      .to('.og-band', { scaleX: 0, opacity: 0, duration: 0.55, ease: 'power3.in' }, 0.2)
      .to('.og-fold--l', { rotateY: -112, duration: 1.5, ease: 'power3.inOut' }, 0.62)
      .to('.og-fold--r', { rotateY: 112, duration: 1.5, ease: 'power3.inOut' }, 0.7)
      .to('.og-fold', { opacity: 0, duration: 0.5, ease: 'power1.in' }, 1.55)
      .fromTo('.og-hero__wreath', { opacity: 0, scale: 0.94, y: 16 }, { opacity: 1, scale: 1, y: 0, duration: 1.6, ease: 'power3.out' }, 0.9);
    gsap.set('.og-hero__wreath', { transformOrigin: '50% 80%' });
    return 1.25;
  },

  // ───────── the page ─────────
  page(ctx) {
    const { bi, esc, txt, on, parts: P, D, venue, city, names } = ctx;
    const head = (id, title, kicker = '') => `<header class="og-head vw-rise">${kicker ? `<p class="og-eyebrow">${kicker}</p>` : ''}<h2 class="og-h2" id="${id}">${bi(title)}</h2>${SPRIG}</header>`;
    const place = [venue, city].filter(Boolean);
    const story = P.story;

    const hero = `
    <section class="vw-hero og-hero" id="top" aria-label="${esc(ctx.namesText)}">
      <div class="og-hero__words">
        ${ctx.emblem('og-emblem vw-in')}
        ${on(txt('hero.kicker')) ? `<p class="og-eyebrow vw-in">${bi(txt('hero.kicker'))}</p>` : ''}
        <h1 class="og-names vw-in">${names({ amp: '<em>&amp;</em>' })}</h1>
        ${on(txt('hero.line')) ? `<p class="og-hero__line vw-in">${bi(txt('hero.line'))}</p>` : ''}
        ${place.length ? `<p class="og-hero__place vw-in">${place.map((x, i) => (i ? `<span>${esc(x)}</span>` : `<b>${esc(x)}</b>`)).join('')}</p>` : ''}
      </div>
      <div class="og-hero__wreath">
        ${art(ctx, 'og-hero__art', '(max-width: 899px) 100vw, 46vw')}
        <div class="og-hero__date">
          <p class="og-hero__wd">${esc(D.wd)}</p>
          <p class="og-hero__day">${esc(D.day)}</p>
          <p class="og-hero__my">${esc(D.month)} · ${esc(D.year)}</p>
          ${D.time ? `<p class="og-hero__time">${esc(D.spelled.time)}</p>` : ''}
        </div>
      </div>
      ${P.cue(P.lead || story.length ? 'couple' : 'date')}
    </section>`;

    const couple = (P.lead || story.length) ? `
    <section class="og-sec og-couple" id="couple" aria-labelledby="couple-h">
      ${head('couple-h', txt('couple.title'), on(txt('story.title')) && story.length ? esc(txt('story.title').en) : '')}
      <div class="og-couple__grid${P.lead ? '' : ' og-couple__grid--solo'}">
        ${P.lead ? `<figure class="og-portrait vw-rise">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 899px) 88vw, 440px')}</figure>` : ''}
        ${story.length ? `<ol class="og-branch" id="story">${story.map((s) => `<li class="og-branch__node vw-rise">${LEAF}<p class="og-branch__year">${bi(s.year)}</p><p class="og-branch__text">${bi(s.text)}</p></li>`).join('')}</ol>` : ''}
      </div>
    </section>` : '';

    const date = `
    <section class="og-sec og-date" id="date" aria-labelledby="date-h">
      <h2 class="og-date__h vw-rise" id="date-h">${bi(txt('count.title'))}</h2>
      ${P.countdown('og-count vw-rise')}
      <p class="og-date__when vw-rise">${esc(D.long)}${place.length ? `<br />${esc(place.join(', '))}` : ''}</p>
      <div class="og-btns vw-rise">${P.calendarBtn()}${P.shareBtn()}</div>
    </section>`;

    const programme = P.events.length ? `
    <section class="og-sec og-prog" id="programme" aria-labelledby="prog-h">
      ${head('prog-h', txt('prog.title'), span(ctx))}
      <ol class="og-events">${P.events.map((ev) => `
        <li class="og-ev vw-rise" id="ev-${esc(ev.id)}">
          <div class="og-ev__date" aria-hidden="true"><span>${esc(ev.d.wdShort)}</span><b>${esc(ev.d.day)}</b><span>${esc(ev.d.monthShort)}</span></div>
          <div class="og-ev__body">
            <h3 class="og-ev__title">${bi(ev.title)}</h3>
            <p class="sr-only">${esc(ev.d.long)}</p>
            <p class="og-ev__time">${esc(ev.time)}</p>
            <p class="og-ev__venue">${bi(ev.venue)} ${P.mapLink(ev)}</p>
            ${ev.blurb ? `<p class="og-ev__blurb">${bi(ev.blurb)}</p>` : ''}
            ${ev.dress ? `<p class="og-ev__dress">${P.swatches(ev)}<span>${bi(ev.dress.text)}</span></p>` : ''}
            ${P.orderList(ev)}
          </div>
        </li>`).join('')}
      </ol>
    </section>` : '';

    const hosts = `
    <section class="og-sec og-hosts" id="card" aria-label="${esc(txt('card.button').en)}">
      ${ctx.verse('og-verse vw-rise')}
      <div class="og-hosts__in vw-rise">
        ${P.hosts || P.families.some((f) => on(f.person.parents)) ? `<p class="og-eyebrow">${bi(txt('families.title'))}</p>` : ''}
        ${P.hosts ? `<p class="og-hosts__names">${bi(P.hosts)}</p>` : ''}
        ${P.families.length ? `<p class="og-hosts__fam">${P.families.map((f) => (on(f.person.parents) ? `<span>${bi(f.person.parents)}</span>` : '')).filter(Boolean).join('<i aria-hidden="true">·</i>')}</p>` : ''}
        ${P.cardBtn('vw-btn--line')}
      </div>
    </section>`;

    const photos = P.photos.length ? `
    <section class="og-sec og-photos" id="photos" aria-labelledby="ph-h">
      ${head('ph-h', txt('gallery.title'))}
      <div class="og-album">${P.photos.map((g, i) => `<figure class="og-album__it vw-rise">${P.photoBtn(g, i, '(max-width: 699px) 46vw, (max-width: 1100px) 30vw, 340px')}</figure>`).join('')}</div>
    </section>` : '';

    const info = (P.hasInfo || P.live) ? `
    <section class="og-sec og-info" id="info" aria-labelledby="info-h">
      ${head('info-h', txt('info.title'))}
      ${P.hasInfo ? P.infoBlocks('og-info__grid vw-rise') : ''}
      ${P.liveBlock('og-live vw-rise')}
    </section>` : '';

    const rsvp = `
    <section class="og-sec og-rsvp" id="rsvp" aria-labelledby="rsvp-title">
      <div class="og-rsvp__card vw-rise">
        <div class="og-rsvp__crown" aria-hidden="true">${art(ctx, 'og-rsvp__art', '420px')}</div>
        <h2 class="og-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
        ${P.deadline ? `<p class="og-rsvp__by">${bi(P.deadline)}</p>` : ''}
        ${P.rsvpForm()}
      </div>
    </section>`;

    const close = `
    <footer class="og-close" aria-label="Closing">
      ${SPRIG}
      ${ctx.closing ? `<p class="og-close__line">${bi(ctx.closing)}</p>` : ''}
      <p class="og-close__names">${names({ amp: '<em>&amp;</em>' })}</p>
      ${ctx.hashtag ? `<p class="og-close__tag">${esc(ctx.hashtag)}</p>` : ''}
      ${P.madeWith()}
    </footer>`;

    return hero + couple + date + programme + hosts + photos + info + rsvp + close;
  },

  // ───────── scroll: depth on big screens only (phones keep the calm .vw-rise fades; reduced motion: none) ─────────
  scroll(ctx) {
    const { gsap } = ctx;
    if (ctx.reduced) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      // the hero: a slow camera push-in on the wreath while the words drift ahead of it (two depths)
      const st = { trigger: '.og-hero', start: 'top top', end: 'bottom top', scrub: 0.6 };
      gsap.to('.og-hero__wreath', { scale: 1.08, yPercent: 6, ease: 'none', scrollTrigger: st });
      gsap.to('.og-hero__words', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { ...st } });
      // the portrait sits deeper than the story and comes forward as you read
      if (document.querySelector('.og-portrait')) {
        gsap.fromTo('.og-portrait', { z: -140, rotateY: 8, transformPerspective: 1400 }, { z: 0, rotateY: 0, ease: 'none',
          scrollTrigger: { trigger: '.og-couple', start: 'top 85%', end: 'top 25%', scrub: 0.8 } });
      }
      // the schedule rows rise from the table toward you, one after another
      const rows = gsap.utils.toArray('.og-ev');
      rows.forEach((row) => {
        row.classList.remove('vw-rise');
        gsap.fromTo(row, { rotateX: 22, z: -90, y: 40, opacity: 0, transformPerspective: 1100, transformOrigin: '50% 100%' },
          { rotateX: 0, z: 0, y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 88%', once: true } });
      });
      // the album prints settle at different depths
      gsap.utils.toArray('.og-album__it').forEach((it, i) => {
        it.classList.remove('vw-rise');
        gsap.fromTo(it, { z: -60 - (i % 3) * 50, y: 60, opacity: 0, transformPerspective: 1200 },
          { z: 0, y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: (i % 3) * 0.08, scrollTrigger: { trigger: it, start: 'top 92%', once: true } });
      });
      return () => { rows.forEach((r) => r.classList.add('vw-rise', 'is-in')); };
    });
  },
};

/** "June 11 – 13" over a weekend, else nothing */
function span(ctx) {
  const s = ctx.span;
  if (!s) return '';
  return ctx.esc(s.from.month === s.to.month ? `${s.from.month} ${s.from.day} – ${s.to.day}` : `${s.from.monthShort} ${s.from.day} – ${s.to.monthShort} ${s.to.day}`);
}

mountVow(SPEC);
