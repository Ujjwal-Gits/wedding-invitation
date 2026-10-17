// Gold Arch: a Muslim wedding in black, white and gold. The signature moment: one fine gold line draws a tall pointed
// mihrab arch (up the left side, over the left arc to the apex, where an eight-point star rosette opens, down the right
// arc and side, back along the base), a blush rose with eucalyptus slides in at its foot, and the names settle inside.
// The page after is editorial: numbered sticky labels, a huge-numeral time ribbon, whole photos in two offset columns,
// restrained eight-point-star (khatam) line work, and a "Kindly reply" spread with the deadline set huge.
import './gold-arch.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';
import { DEMO_PHOTOS as PH } from '../_vow/demo.js';

/** An eight-point star (two squares turned 45°) with a small ring at its heart: the rosette at the arch's apex. */
const STAR = (cls = '') => `<svg class="${cls}" viewBox="-20 -20 40 40" aria-hidden="true" focusable="false">
  <g fill="var(--vw-bg)" stroke="currentColor" stroke-width="1.1" stroke-linejoin="miter">
    <rect x="-12" y="-12" width="24" height="24"/><rect x="-12" y="-12" width="24" height="24" transform="rotate(45)"/>
  </g>
  <g fill="none" stroke="currentColor" stroke-width=".9"><rect x="-6.4" y="-6.4" width="12.8" height="12.8" transform="rotate(22.5)"/><circle r="2.4"/></g>
</svg>`;

/**
 * The pointed (mihrab) arch: two arcs of radius 0.8 × width meeting at the apex, two sides and a base. Each arc is a
 * ring clipped to its half of the crown and revealed by a half-disc cover turning about the ring's centre, so the whole
 * drawing animates by transform only.
 */
const ARCH = (cls = '', star = true) => `<div class="ga-arch ${cls}" aria-hidden="true">
  <div class="ga-arch__crown">
    <div class="ga-arch__half ga-arch__half--l"><i class="ga-arch__ring"></i><i class="ga-arch__cover"></i></div>
    <div class="ga-arch__half ga-arch__half--r"><i class="ga-arch__ring"></i><i class="ga-arch__cover"></i></div>
    ${star ? STAR('ga-arch__star') : ''}
  </div>
  <div class="ga-arch__body"><i class="ga-arch__side ga-arch__side--l"></i><i class="ga-arch__side ga-arch__side--r"></i><i class="ga-arch__base"></i></div>
</div>`;

const rose = (ctx, cls, sizes) => {
  const ref = ctx.S.img('hero.rose');
  return ref ? `<img class="${cls}" src="${ctx.esc(ctx.photoUrl(ref, 'sm'))}" srcset="${ctx.esc(ctx.photoUrl(ref, 'sm'))} 380w, ${ctx.esc(ctx.photoUrl(ref, 'lg'))} 682w" sizes="${sizes}" alt="" decoding="async" />` : '';
};

const SPEC = {
  slug: 'gold-arch',
  manifest,
  demo: {
    bride: 'Sara', brideLast: 'Malik', groom: 'Adam', groomLast: 'Hussain', date: '2027-04-30', time: '18:00', tz: 'America/Chicago',
    venue: 'The Glasshouse', city: 'Chicago, IL', mapQuery: 'The Glasshouse, Chicago, IL',
    dress: 'Formal; modest attire appreciated', colors: ['#161513', '#B08D57', '#F2E6E1'], hashtag: '#SaraAndAdam', deadline: 'Kindly reply by April 1, 2027',
    welcomeVenue: 'The Rooftop at The Langham', brideParents: 'Mr. and Mrs. Tariq Malik', groomParents: 'Mr. and Mrs. Yusuf Hussain',
    // modest photographs only (no kissing): hands, rings, flowers, the aisle
    portraits: [PH.ringsBouquet, PH.handsBouquet, PH.brideBouquet], gallery: [PH.aisle, PH.bouquetHug],
  },

  // ───────── the gate: the Bismillah (when shown), a small gold mihrab with the initials, on white ─────────
  gate(ctx) {
    const { esc, initials, D } = ctx;
    return `<div class="ga-gate" aria-hidden="true">
      ${ctx.verse('ga-verse--gate')}
      <div class="ga-gate__mark">
        ${ARCH('ga-arch--mini')}
        <span class="ga-gate__mono">${initials.map(esc).join('<i>&amp;</i>')}</span>
      </div>
      <p class="ga-gate__names">${ctx.names({ amp: '<em>&amp;</em>' })}</p>
      ${D.numeric ? `<p class="ga-gate__date">${esc(D.numeric.replace(/\./g, ' · '))}</p>` : ''}
    </div>`;
  },
  open(ctx, tl) {
    const { gsap } = ctx;
    const H = '#top .ga-arch';
    // the gate lifts away
    tl.to('.ga-gate__mark', { y: -18, scale: 0.96, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0)
      .to(['.ga-gate__names', '.ga-gate__date', '.ga-verse--gate'], { opacity: 0, duration: 0.35, ease: 'power1.in' }, 0)
      .to('.ga-gate', { opacity: 0, duration: 0.45, ease: 'power1.inOut' }, 0.35);
    // the pen: up the left side, over the left arc to the apex (the rosette opens), down the right arc and side, along the base
    tl.fromTo(`${H} .ga-arch__side--l`, { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: 'power1.in' }, 0.55)
      .fromTo(`${H} .ga-arch__half--l .ga-arch__cover`, { rotate: 0 }, { rotate: 75, duration: 0.6, ease: 'none' }, 1.05)
      .fromTo(`${H} .ga-arch__star`, { scale: 0, rotate: -90, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.7, ease: 'back.out(1.6)' }, 1.55)
      .fromTo(`${H} .ga-arch__half--r .ga-arch__cover`, { rotate: 108 }, { rotate: 180, duration: 0.6, ease: 'none' }, 1.62)
      .fromTo(`${H} .ga-arch__side--r`, { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: 'none' }, 2.2)
      .fromTo(`${H} .ga-arch__base`, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power2.out' }, 2.7);
    // the rose slides in at the arch's foot
    tl.fromTo('#top .ga-rose', { opacity: 0, x: 70, y: 46, rotate: 5 }, { opacity: 1, x: 0, y: 0, rotate: 0, duration: 1.5, ease: 'power3.out' }, 2.25);
    gsap.set('#top .ga-rose', { transformOrigin: '90% 90%' });
    return 2.45;
  },

  // ───────── the page ─────────
  page(ctx) {
    const { bi, esc, txt, on, parts: P, D, venue, city, names } = ctx;
    const place = [venue, city].filter(Boolean);
    const mainEv = P.events.find((e) => e.e === ctx.mainEv) || P.events[0] || null;
    const dress = mainEv?.dress && on(mainEv.dress.text) && mainEv.dress.text.en !== P.UI.wear ? mainEv.dress.text : null;
    const [hh, ampm] = String(D.time || '').split(' ');
    const story = P.story;

    // numbered sections, in the order they appear
    let n = 0;
    const label = (id, title) => { n += 1; return `<header class="ga-label vw-rise"><p class="ga-label__n"><span>${String(n).padStart(2, '0')}</span><i aria-hidden="true"></i></p><h2 class="ga-h2" id="${id}">${bi(title)}</h2></header>`; };

    const hero = `
    <section class="vw-hero ga-hero" id="top" aria-label="${esc(ctx.namesText)}">
      <div class="ga-flank ga-flank--l">
        ${D.wd ? `<p class="ga-cap vw-in">${esc(D.wd)}</p>` : ''}
        <p class="ga-flank__num vw-in">${esc(D.day)}</p>
        <p class="ga-cap vw-in">${esc(D.month)} ${esc(D.year)}</p>
        ${hh ? `<p class="ga-flank__time vw-in"><b>${esc(hh)}</b> <span>${esc(ampm || '')}${D.zone ? ` ${esc(D.zone)}` : ''}</span></p>` : ''}
      </div>
      <div class="ga-stage">
        ${ARCH()}
        <div class="ga-words">
          ${ctx.verse('ga-verse--hero vw-in')}
          ${on(txt('hero.kicker')) ? `<p class="ga-cap ga-words__kick vw-in">${bi(txt('hero.kicker'))}</p>` : ''}
          <h1 class="ga-names vw-in">${names({ amp: '<em>&amp;</em>' })}</h1>
          ${on(txt('hero.line')) ? `<p class="ga-words__line vw-in">${bi(txt('hero.line'))}</p>` : ''}
          <div class="ga-words__when vw-in">
            <i class="ga-rule" aria-hidden="true"></i>
            <p class="ga-cap ga-words__date">${esc([D.wd, `${D.month} ${D.day}`, D.year].filter(Boolean).join(' · '))}</p>
            ${venue ? `<p class="ga-words__place">${esc(venue)}</p>` : ''}
            ${city ? `<p class="ga-cap">${esc(city)}</p>` : ''}
            ${dress ? `<p class="ga-words__dress">${bi(dress)}</p>` : ''}
          </div>
        </div>
        <div class="ga-rose-w">${rose(ctx, 'ga-rose', '(max-width: 899px) 66vw, 360px')}</div>
      </div>
      <div class="ga-flank ga-flank--r">
        ${venue ? `<p class="ga-flank__venue vw-in">${esc(venue)}</p>` : ''}
        ${city ? `<p class="ga-cap vw-in">${esc(city)}</p>` : ''}
        ${dress ? `<p class="ga-flank__dress vw-in">${bi(dress)}</p>` : ''}
      </div>
      ${P.cue(P.lead || story.length ? 'couple' : 'date')}
    </section>`;

    const couple = (P.lead || story.length) ? `
    <section class="ga-sec ga-couple" id="couple" aria-labelledby="couple-h">
      ${label('couple-h', txt('couple.title'))}
      <div class="ga-body">
        ${P.lead ? `<figure class="ga-lead vw-rise">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 899px) 92vw, 620px')}</figure>` : ''}
        ${story.length ? `<div class="ga-story" id="story">
          ${on(txt('story.title')) ? `<p class="ga-cap ga-story__h vw-rise">${bi(txt('story.title'))}</p>` : ''}
          <ol class="ga-story__list">${story.map((s) => `<li class="ga-story__it vw-rise"><p class="ga-story__year">${bi(s.year)}</p><p class="ga-story__text">${bi(s.text)}</p></li>`).join('')}</ol>
        </div>` : ''}
      </div>
    </section>` : '';

    const date = `
    <section class="ga-sec ga-date" id="date" aria-labelledby="date-h">
      <i class="ga-date__lattice ga-khatam" aria-hidden="true"></i>
      ${label('date-h', txt('count.title'))}
      <div class="ga-body">
        <div class="vw-count ga-count vw-rise" data-countdown>
          <div data-count-grid class="ga-count__grid" role="group" aria-label="${esc(txt('count.title').en)}">
            <p class="ga-count__days"><b data-u="d">0</b><span>${bi(txt('count.left'))}</span></p>
            <ol class="ga-count__rest">${P.countUnits.slice(1).map((u) => `<li><b data-u="${u.u}">00</b><span>${u.label}</span></li>`).join('')}</ol>
          </div>
          <p class="vw-count__done ga-count__done" data-count-done hidden></p>
        </div>
        <dl class="ga-facts vw-rise">
          <div><dt class="ga-cap">${P.UI.date}</dt><dd>${esc(D.long)}</dd></div>
          ${D.time ? `<div><dt class="ga-cap">Time</dt><dd>${esc(`${D.time}${D.zone ? ` ${D.zone}` : ''}`)}</dd></div>` : ''}
          ${place.length ? `<div><dt class="ga-cap">${P.UI.place}</dt><dd>${esc(place.join(', '))}</dd></div>` : ''}
        </dl>
        <div class="ga-btns vw-rise">${P.calendarBtn()}${P.shareBtn()}</div>
      </div>
    </section>`;

    const programme = P.events.length ? `
    <section class="ga-sec ga-prog" id="programme" aria-labelledby="prog-h">
      ${label('prog-h', txt('prog.title'))}
      <div class="ga-body">
        <ol class="ga-rib">${(() => {
          let last = '';
          return P.events.map((ev) => {
            const [t, ap] = String(ev.d.time || '').split(' ');
            const head = ev.d.short !== last ? `<li class="ga-rib__day vw-rise" aria-hidden="true"><span class="ga-cap">${esc(ev.d.wd)}</span><b>${esc(`${ev.d.month} ${ev.d.day}`)}</b></li>` : '';
            last = ev.d.short;
            return `${head}
          <li class="ga-ev vw-rise" id="ev-${esc(ev.id)}">
            <p class="ga-ev__clock" aria-hidden="true"><b>${esc(t || '')}</b><span>${esc(ap || '')}</span></p>
            <div class="ga-ev__body">
              <p class="sr-only">${esc(ev.d.long)}</p>
              <h3 class="ga-ev__title">${bi(ev.title)}</h3>
              <p class="ga-ev__time">${esc(ev.time)}</p>
              <p class="ga-ev__venue"><span>${bi(ev.venue)}</span> ${P.mapLink(ev)}</p>
              ${ev.blurb ? `<p class="ga-ev__blurb">${bi(ev.blurb)}</p>` : ''}
              ${ev.dress ? `<p class="ga-ev__dress">${P.swatches(ev)}<span>${bi(ev.dress.text)}</span></p>` : ''}
              ${P.orderList(ev)}
            </div>
          </li>`;
          }).join('');
        })()}
        </ol>
      </div>
    </section>` : '';

    const hosts = `
    <section class="ga-sec ga-hosts" id="card" aria-labelledby="hosts-h">
      ${label('hosts-h', txt('families.title'))}
      <div class="ga-body ga-hosts__grid">
        <div class="ga-panel vw-rise">
          ${ARCH('ga-arch--frame')}
          <div class="ga-panel__in">
            <div class="ga-panel__crown">${ctx.emblem('ga-panel__emblem')}<p class="ga-panel__mono" aria-hidden="true">${ctx.initials.map(esc).join('<i>&amp;</i>')}</p></div>
            ${P.hosts ? `<p class="ga-hosts__names">${bi(P.hosts)}</p>` : `<p class="ga-hosts__names">${names({ amp: '<em>&amp;</em>' })}</p>`}
            ${P.families.length ? `<ul class="ga-hosts__fam">${P.families.map((f) => (on(f.person.parents) ? `<li>${bi(f.person.parents)}</li>` : '')).join('')}</ul>` : ''}
            ${P.cardBtn('vw-btn--line')}
          </div>
        </div>
        ${ctx.verse('ga-verse vw-rise')}
      </div>
    </section>`;

    const cols = [[], []];
    P.photos.forEach((g, i) => cols[i % 2].push(`<figure class="ga-album__it vw-rise">${P.photoBtn(g, i, '(max-width: 899px) 46vw, 380px')}</figure>`));
    const photos = P.photos.length ? `
    <section class="ga-sec ga-photos" id="photos" aria-labelledby="ph-h">
      ${label('ph-h', txt('gallery.title'))}
      <div class="ga-body">
        <div class="ga-album${P.photos.length === 1 ? ' ga-album--one' : ''}"><div class="ga-album__col">${cols[0].join('')}</div><div class="ga-album__col ga-album__col--b">${cols[1].join('')}</div></div>
      </div>
    </section>` : '';

    const info = (P.hasInfo || P.live) ? `
    <section class="ga-sec ga-info" id="info" aria-labelledby="info-h">
      ${label('info-h', txt('info.title'))}
      <div class="ga-body">
        ${P.hasInfo ? P.infoBlocks('ga-info__list vw-rise') : ''}
        ${P.liveBlock('ga-live vw-rise')}
      </div>
    </section>` : '';

    const rsvp = `
    <section class="ga-sec ga-rsvp" id="rsvp" aria-labelledby="rsvp-title">
      ${label('rsvp-title', txt('rsvp.title'))}
      <div class="ga-body">
        <div class="ga-reply">
          ${P.deadline ? `<p class="ga-reply__by vw-rise">${deadlineBig(ctx, P.deadline)}</p>` : ''}
          <div class="ga-reply__form vw-rise">${P.rsvpForm()}</div>
        </div>
      </div>
    </section>`;

    const close = `
    <footer class="ga-close" aria-label="Closing">
      <i class="ga-close__band ga-khatam" aria-hidden="true"></i>
      <div class="ga-close__stage">
        ${ARCH('ga-arch--close')}
        <div class="ga-close__in">
          ${ctx.closing ? `<p class="ga-close__line">${bi(ctx.closing)}</p>` : ''}
          <p class="ga-close__names">${names({ amp: '<em>&amp;</em>' })}</p>
          ${D.numeric ? `<p class="ga-cap">${esc(D.numeric.replace(/\./g, ' · '))}</p>` : ''}
          ${ctx.hashtag ? `<p class="ga-close__tag">${esc(ctx.hashtag)}</p>` : ''}
        </div>
        <div class="ga-rose-w ga-rose-w--close">${rose(ctx, 'ga-rose ga-rose--close', '(max-width: 899px) 50vw, 240px')}</div>
      </div>
      ${P.madeWith()}
    </footer>`;

    return hero + couple + date + programme + hosts + photos + info + rsvp + close;
  },

  // desktop only: editorial spreads in layered depth. Phones and reduced motion keep the engine's quiet reveals.
  scroll(ctx) {
    if (ctx.reduced) return;
    const { gsap } = ctx;
    gsap.matchMedia().add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const along = (trigger, start = 'top bottom', end = 'bottom top') => ({ trigger, start, end, scrub: 0.6 });
      // the first screen leaves in three planes: the rose (front) fastest, the arch (middle), the date and place (back)
      gsap.to('#top .ga-rose-w', { y: -150, ease: 'none', scrollTrigger: along('#top', 'top top') });
      gsap.to('#top .ga-stage', { y: -70, scale: 0.97, ease: 'none', scrollTrigger: along('#top', 'top top') });
      gsap.to('#top .ga-flank', { y: -26, opacity: 0.35, ease: 'none', scrollTrigger: along('#top', 'top top') });
      // the lead photo sits a plane behind the story
      const lead = document.querySelector('.ga-lead img');
      if (lead) gsap.fromTo(lead, { y: 44 }, { y: -44, ease: 'none', scrollTrigger: along('.ga-couple') });
      // the ribbon's numerals tip up off the page as they arrive
      document.querySelectorAll('.ga-ev__clock b').forEach((el) => {
        gsap.fromTo(el, { rotateX: 52, y: 24, opacity: 0.25, transformPerspective: 700, transformOrigin: '50% 100%' },
          { rotateX: 0, y: 0, opacity: 1, ease: 'power1.out', scrollTrigger: along(el, 'top 95%', 'top 62%') });
      });
      // the photographs in two planes
      const cols = document.querySelectorAll('.ga-album__col');
      if (cols.length === 2) {
        gsap.fromTo(cols[0], { y: 24 }, { y: -24, ease: 'none', scrollTrigger: along('.ga-album') });
        gsap.fromTo(cols[1], { y: 70 }, { y: -70, ease: 'none', scrollTrigger: along('.ga-album') });
      }
    });
  },
};

/** The deadline set huge: "Kindly reply by April 1, 2027" under the title "Kindly reply" reads "by April 1, 2027". */
function deadlineBig(ctx, d) {
  const en = ctx.pair(d).en.trim();
  const rest = en.replace(/^(kindly\s+|please\s+)?(reply|respond|rsvp)\s+(?=by\b)/i, '');
  return rest !== en ? `<span class="sr-only">${ctx.esc(en.slice(0, en.length - rest.length))}</span>${ctx.esc(rest)}` : ctx.esc(en);
}

mountVow(SPEC);
