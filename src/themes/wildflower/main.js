// Wildflower: a summer meadow of pink cosmos, ranunculus, lavender and daisies on white. The signature moment: the
// meadow grows up from below the screen in three depth layers (the front one first), two butterflies drift in on
// soft curves, then the names. The body is a little storybook: on desktop its pages turn left to right as you scroll
// (pinned, in depth); on phones the pages simply follow one another. The schedule is a soft vertical timeline with
// bloom bullets, the photos a loose collage, the reply a note card with a pressed flower; the meadow returns at the end.
import './wildflower.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';

const DESKTOP = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';

/** a slot's watercolor at its sizes; decorative unless asked */
const art = (ctx, id, cls, sizes = '', { eager = false } = {}) => {
  const ref = ctx.S.img(id);
  if (!ref) return '';
  const sm = ctx.photoUrl(ref, 'sm'); const lg = ctx.photoUrl(ref, 'lg');
  const set = sm !== lg && sizes ? ` srcset="${ctx.esc(sm)} 640w, ${ctx.esc(lg)} 1200w" sizes="${sizes}"` : '';
  return `<img class="${cls}" src="${ctx.esc(sizes ? sm : lg)}"${set} alt="" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} />`;
};
/** the meadow: three depth bands, twice (the second mirrored, shown on wide screens) */
const meadow = (ctx, cls, eager = false) => {
  const tile = (mirror) => `<div class="wf-tile${mirror ? ' wf-tile--mirror' : ''}">
      ${art(ctx, 'meadow.back', 'wf-band wf-band--back', '(max-width: 899px) 100vw, 50vw', { eager })}
      ${art(ctx, 'meadow.mid', 'wf-band wf-band--mid', '(max-width: 899px) 100vw, 50vw', { eager })}
      ${art(ctx, 'meadow.front', 'wf-band wf-band--front', '(max-width: 899px) 100vw, 50vw', { eager })}
    </div>`;
  return `<div class="wf-meadow ${cls}" aria-hidden="true">${tile(true)}${tile(false)}</div>`;
};

const SPEC = {
  slug: 'wildflower',
  manifest,
  demo: {
    bride: 'Lily', brideLast: 'Morgan', groom: 'Ben', groomLast: 'Carter', date: '2027-07-17', time: '16:00', tz: 'America/New_York',
    venue: 'Meadow Hill Farm', city: 'Asheville, NC', mapQuery: 'Asheville, NC',
    dress: 'Summer garden', colors: ['#A3245E', '#F4C6D7', '#B9C7A5'], hashtag: '#LilyAndBenInBloom', deadline: 'Kindly reply by June 15, 2027',
    welcomeVenue: 'The Farmhouse Porch', brunchVenue: 'The Farmhouse Porch',
  },

  // ───────── the gate: a white page, a pressed bloom, the initials ─────────
  gate(ctx) {
    const { esc, initials, D } = ctx;
    return `<div class="wf-gate" aria-hidden="true">
      ${ctx.emblem('wf-gate__emblem')}
      ${art(ctx, 'bloom.2', 'wf-gate__bloom')}
      <p class="wf-gate__mono">${initials.map(esc).join('<i>&amp;</i>')}</p>
      <p class="wf-gate__date">${esc(D.short)}</p>
    </div>`;
  },
  open(ctx, tl, gate) {
    const { gsap } = ctx;
    const vh = window.innerHeight;
    // the white page lifts away
    tl.to('.wf-gate', { autoAlpha: 0, y: -18, duration: 0.5, ease: 'power2.in' }, 0)
      .to(gate, { autoAlpha: 0, duration: 0.3, ease: 'power1.out' }, 0.42);
    // the meadow grows: every band starts just below the screen; the front one is quickest
    const below = (i, el) => Math.max(40, vh - el.getBoundingClientRect().top + 24);
    tl.fromTo('#top .wf-band--front', { y: below }, { y: 0, duration: 1.35, ease: 'power2.out' }, 0.45)
      .fromTo('#top .wf-band--mid', { y: below }, { y: 0, duration: 1.7, ease: 'power2.out' }, 0.55)
      .fromTo('#top .wf-band--back', { y: below }, { y: 0, duration: 2.05, ease: 'power2.out' }, 0.65);
    // two butterflies drift in on soft curves (x and y on different eases), wings beating as they come
    const fly = (sel, fromX, fromY, at, rot) => {
      tl.set(sel, { x: fromX, y: fromY, rotation: rot, autoAlpha: 0 }, 0)
        .to(sel, { x: 0, duration: 2.1, ease: 'sine.out' }, at)
        .to(sel, { autoAlpha: 1, duration: 0.5, ease: 'power1.out' }, at)
        .to(sel, { y: 0, duration: 2.1, ease: 'back.out(1.1)' }, at)
        .to(sel, { rotation: 0, duration: 2.1, ease: 'sine.inOut' }, at)
        .fromTo(`${sel} img`, { scaleX: 1 }, { scaleX: 0.42, duration: 0.15, repeat: 13, yoyo: true, ease: 'sine.inOut' }, at);
    };
    fly('.wf-bfly--1', () => -0.42 * window.innerWidth, () => 0.34 * vh, 1.05, -24);
    fly('.wf-bfly--2', () => 0.42 * window.innerWidth, () => 0.22 * vh, 1.3, 22);
    return 1.9;
  },

  // desktop: the storybook turns its pages as you scroll (pinned), and the closing meadow rises in depth
  scroll(ctx) {
    const { gsap, reduced } = ctx;
    if (reduced) return;
    gsap.matchMedia().add(DESKTOP, () => {
      const book = document.querySelector('.wf-book');
      const leaves = [...document.querySelectorAll('.wf-leaf')];
      if (book && leaves.length > 1) {
        book.classList.add('wf-book--3d');
        const flips = leaves.length - 1;
        leaves.forEach((lf, k) => gsap.set(lf, { zIndex: 20 - k, rotateY: 0 }));
        const tl = gsap.timeline({
          defaults: { ease: 'power1.inOut' },
          scrollTrigger: { trigger: book, start: 'top top', end: () => `+=${flips * window.innerHeight * 0.95}`, pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true },
        });
        tl.to({}, { duration: 0.25 });
        leaves.slice(0, flips).forEach((lf, k) => {
          const at = 0.25 + k;
          tl.to(lf, { rotateY: -180, duration: 1 }, at)
            .set(lf, { zIndex: 40 + k }, at + 0.5)
            .fromTo(lf.querySelector('.wf-face--front .wf-shade'), { opacity: 0 }, { opacity: 0.5, duration: 0.5, ease: 'power1.in' }, at)
            .fromTo(lf.querySelector('.wf-face--back .wf-shade'), { opacity: 0.5 }, { opacity: 0, duration: 0.5, ease: 'power1.out' }, at + 0.5);
        });
        tl.to({}, { duration: 0.25 });
      }
      gsap.utils.toArray('.wf-close .wf-band').forEach((band, i) => {
        gsap.fromTo(band, { y: 70 - i * 20 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '.wf-close', start: 'top bottom', end: 'bottom bottom', scrub: 0.5 } });
      });
      return () => book?.classList.remove('wf-book--3d');
    });
  },

  // ───────── the page ─────────
  page(ctx) {
    const { bi, esc, txt, on, parts: P, D, venue, city, names } = ctx;
    const place = [venue, city].filter(Boolean);
    const story = P.story;
    const bloom = (id = 'bloom.2', cls = 'wf-h-bloom') => art(ctx, id, cls);
    const h2 = (id, title, kicker = '') => `<header class="wf-head vw-rise">${bloom()}${kicker ? `<p class="wf-eyebrow">${kicker}</p>` : ''}<h2 class="wf-h2" id="${id}">${bi(title)}</h2></header>`;

    const hero = `
    <section class="vw-hero wf-hero" id="top" aria-label="${esc(ctx.namesText)}">
      <div class="wf-hero__words">
        ${on(txt('hero.kicker')) ? `<p class="wf-eyebrow vw-in">${bi(txt('hero.kicker'))}</p>` : ''}
        <h1 class="wf-names vw-in">${names({ amp: '&amp;' })}</h1>
        ${on(txt('hero.line')) ? `<p class="wf-hero__line vw-in">${bi(txt('hero.line'))}</p>` : ''}
        <i class="wf-rule vw-in" aria-hidden="true"></i>
        <p class="wf-hero__date vw-in">${esc([D.wd, `${D.month} ${D.day}`, D.year].join(' · '))}</p>
        ${place.length ? `<p class="wf-hero__place vw-in">${esc(place.join(', '))}</p>` : ''}
      </div>
      ${meadow(ctx, 'wf-hero__meadow', true)}
      <span class="wf-bfly wf-bfly--1" aria-hidden="true">${art(ctx, 'butterfly.1', '')}</span>
      <span class="wf-bfly wf-bfly--2" aria-hidden="true">${art(ctx, 'butterfly.2', '')}</span>
    </section>`;

    // ───── the storybook: pages in reading order; on desktop they are bound as turning leaves ─────
    const pages = [];
    pages.push(`<div class="wf-pg wf-pg--title">
        ${art(ctx, 'bloom.1', 'wf-pg__bloom')}
        ${on(txt('story.title')) ? `<p class="wf-eyebrow">${bi(txt('story.title'))}</p>` : ''}
        <h2 class="wf-h2 wf-pg__title" id="couple-h">${bi(txt('couple.title'))}</h2>
        <p class="wf-pg__names">${names({ amp: '&amp;' })}</p>
        ${on(txt('book.hint')) ? `<p class="wf-pg__hint">${bi(txt('book.hint'))}<i aria-hidden="true">→</i></p>` : ''}
      </div>`);
    if (P.lead) {
      pages.push(`<div class="wf-pg wf-pg--photo">
        <figure class="wf-mount">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 899px) 90vw, 460px')}${art(ctx, 'bloom.3', 'wf-mount__bud')}</figure>
      </div>`);
    }
    if (story.length) {
      pages.push(`<div class="wf-pg wf-pg--story">
        <ol class="wf-notes" id="story">${story.map((s) => `<li class="wf-note"><p class="wf-note__date">${bi(s.year)}</p><p class="wf-note__text">${bi(s.text)}</p></li>`).join('')}</ol>
      </div>`);
    }
    pages.push(`<div class="wf-pg wf-pg--date" id="date">
        <p class="wf-eyebrow" id="date-h">${bi(txt('count.title'))}</p>
        <p class="wf-date__day">${esc(D.day)}</p>
        <p class="wf-date__my">${esc(`${D.wd} · ${D.month} ${D.year}`)}</p>
        ${D.time ? `<p class="wf-date__time">${esc(`${D.time}${D.zone ? ` ${D.zone}` : ''}`)}${place.length ? ` · ${esc(place[0])}` : ''}</p>` : ''}
        ${P.countdown('wf-count')}
        <div class="wf-btns">${P.calendarBtn()}${P.shareBtn()}</div>
      </div>`);
    const fam = P.families.map((f) => (on(f.person.parents) ? `<li>${bi(f.person.parents)}</li>` : '')).filter(Boolean);
    pages.push(`<div class="wf-pg wf-pg--hosts" id="card">
        ${art(ctx, 'bloom.3', 'wf-pg__bud')}
        <p class="wf-eyebrow" id="hosts-h">${bi(txt('families.title'))}</p>
        <p class="wf-hosts__names">${P.hosts ? bi(P.hosts) : names({ amp: '&amp;' })}</p>
        ${fam.length ? `<ul class="wf-hosts__fam">${fam.join('')}</ul>` : ''}
        ${P.cardBtn('vw-btn--line')}
      </div>`);
    pages.push(`<div class="wf-pg wf-pg--end">
        ${art(ctx, 'bloom.1', 'wf-pg__bloom wf-pg__bloom--end')}
        ${ctx.verse('wf-verse')}
        ${on(txt('book.end')) ? `<p class="wf-pg__end">${bi(txt('book.end'))}</p>` : ''}
      </div>`);
    if (pages.length % 2) pages.splice(pages.length - 1, 0, `<div class="wf-pg wf-pg--blank">${art(ctx, 'bloom.2', 'wf-pg__bloom')}</div>`);
    const face = (html, side, n) => `<div class="wf-face wf-face--${side}" data-pg="${n}">${html}<i class="wf-shade" aria-hidden="true"></i></div>`;
    let leaves = '';
    for (let k = 1; k < pages.length; k += 2) {
      leaves += `<div class="wf-leaf">${face(pages[k], 'front', k)}${pages[k + 1] ? face(pages[k + 1], 'back', k + 1) : ''}</div>`;
    }
    const book = `
    <section class="wf-book" id="couple" aria-labelledby="couple-h">
      <div class="wf-book__stage">
        <div class="wf-book__book">
          <div class="wf-base">${face(pages[0], 'base', 0)}</div>
          ${leaves}
        </div>
      </div>
    </section>`;

    const programme = P.events.length ? `
    <section class="wf-sec wf-prog" id="programme" aria-labelledby="prog-h">
      ${h2('prog-h', txt('prog.title'), span(ctx))}
      <ol class="wf-line">${P.events.map((ev) => `
        <li class="wf-ev vw-rise" id="ev-${esc(ev.id)}">
          <span class="wf-ev__dot" aria-hidden="true">${art(ctx, 'bloom.3', '')}</span>
          <div class="wf-ev__card">
            <p class="wf-ev__when"><b>${esc(ev.d.time)}</b><span>${esc(`${ev.d.wd}, ${ev.d.month} ${ev.d.day}`)}</span></p>
            <h3 class="wf-ev__title">${bi(ev.title)}</h3>
            <p class="wf-ev__time">${esc(ev.time)}</p>
            <p class="wf-ev__venue"><span>${bi(ev.venue)}</span>${P.mapLink(ev)}</p>
            ${ev.blurb ? `<p class="wf-ev__blurb">${bi(ev.blurb)}</p>` : ''}
            ${ev.dress ? `<p class="wf-ev__dress">${P.swatches(ev)}<span>${bi(ev.dress.text)}</span></p>` : ''}
            ${P.orderList(ev)}
          </div>
        </li>`).join('')}
      </ol>
    </section>` : '';

    const photos = P.photos.length ? `
    <section class="wf-sec wf-photos" id="photos" aria-labelledby="ph-h">
      ${h2('ph-h', txt('gallery.title'))}
      <div class="wf-collage">${P.photos.map((g, i) => `<figure class="wf-collage__it vw-rise">${P.photoBtn(g, i, '(max-width: 699px) 46vw, 380px')}</figure>`).join('')}</div>
    </section>` : '';

    const info = (P.hasInfo || P.live) ? `
    <section class="wf-sec wf-info" id="info" aria-labelledby="info-h">
      ${h2('info-h', txt('info.title'))}
      ${P.hasInfo ? P.infoBlocks('wf-info__grid vw-rise') : ''}
      ${P.liveBlock('wf-live vw-rise')}
    </section>` : '';

    // the reply: a note card with a pressed flower taped to its corner
    const rsvp = `
    <section class="wf-sec wf-rsvp" id="rsvp" aria-labelledby="rsvp-title">
      <div class="wf-notecard vw-rise">
        <div class="wf-notecard__press" aria-hidden="true">${art(ctx, 'bloom.1', 'wf-notecard__bloom')}<i class="wf-notecard__tape"></i></div>
        <h2 class="wf-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
        ${P.deadline ? `<p class="wf-rsvp__by">${bi(P.deadline)}</p>` : ''}
        ${P.rsvpForm()}
      </div>
    </section>`;

    const close = `
    <footer class="wf-close" aria-label="Closing">
      <div class="wf-close__words">
        ${ctx.closing ? `<p class="wf-close__line">${bi(ctx.closing)}</p>` : ''}
        <p class="wf-close__names">${names({ amp: '&amp;' })}</p>
        ${ctx.hashtag ? `<p class="wf-close__tag">${esc(ctx.hashtag)}</p>` : ''}
        ${P.madeWith()}
      </div>
      ${meadow(ctx, 'wf-close__meadow')}
    </footer>`;

    return hero + book + programme + photos + info + rsvp + close;
  },
};

/** "July 16 – 18" over a weekend, else nothing */
function span(ctx) {
  const s = ctx.span;
  if (!s) return '';
  return ctx.esc(s.from.month === s.to.month ? `${s.from.month} ${s.from.day} – ${s.to.day}` : `${s.from.monthShort} ${s.from.day} – ${s.to.monthShort} ${s.to.day}`);
}

mountVow(SPEC);
