// Noor: a Muslim wedding invitation in sage, ivory and gold. The signature moment: inside the painted sage mihrab
// arch, two carved jali doors (8-point star lattice) swing open in depth and the couple's names wait in the light.
// The body is a stack of arch-window panels on a sage field that rise toward you on large screens; each event wears
// an 8-point-star date medallion; the reply card sits in an envelope with an arch-shaped flap.
// Faith marks (emblem above the arch, the Bismillah and verse) come from the engine and switch off with ?v=neutral.
import './noor.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';
import { DEMO_PHOTOS as P } from '../_vow/demo.js';

const ART_DEFAULT = '/themes/noor/art/arch.webp';
// the arch's open window in the art's own pixels (1200 × 2400)
const OPEN = 'M600 352C680 450 860 540 905 690L948 760C1010 830 1040 930 1042 1085L1058 1100V2400H142V1100L158 1085C160 930 190 830 252 760L295 690C340 540 520 450 600 352Z';

/** an 8-point star (two squares) centred on cx, cy */
const starPts = (cx, cy, R) => {
  const r = R * Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8);
  const pts = [];
  for (let i = 0; i < 16; i += 1) {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const rad = i % 2 ? r : R;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return pts.join(' ');
};
// one lattice tile: a star, its octagonal ring, and the lines that join it to its neighbours
const TILE = (() => {
  const s = 120; const c = s / 2;
  const tips = [];
  for (let i = 0; i < 8; i += 1) { const a = (i * Math.PI) / 4; tips.push([c + Math.cos(a) * 40, c + Math.sin(a) * 40]); }
  const ends = [[s, c], [s, s], [c, s], [0, s], [0, c], [0, 0], [c, 0], [s, 0]];
  const lines = tips.map(([x, y], i) => `M${x.toFixed(1)} ${y.toFixed(1)}L${ends[i][0]} ${ends[i][1]}`).join('');
  return `<polygon points="${starPts(c, c, 40)}"/><path d="${lines}"/><circle cx="${c}" cy="${c}" r="9"/>`;
})();

/** one carved door leaf (l | r), cut to its half of the arch window */
const leaf = (side) => {
  const vb = side === 'l' ? '142 352 458 2048' : '600 352 458 2048';
  const id = `nr-${side}`;
  const ring = side === 'l' ? 566 : 634;
  return `<svg class="nr-leaf__svg" viewBox="${vb}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="${id}-c"><path d="${OPEN}"/></clipPath>
      <pattern id="${id}-p" width="120" height="120" patternUnits="userSpaceOnUse" x="540" y="352">
        <g fill="none" stroke="rgba(70,62,30,.28)" stroke-width="6" transform="translate(2 3)">${TILE}</g>
        <g fill="none" stroke="var(--nr-gold)" stroke-width="3.4">${TILE}</g>
      </pattern>
      <linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6F2E6"/><stop offset="1" stop-color="#ECE7D6"/></linearGradient>
      <linearGradient id="${id}-s" x1="${side === 'l' ? 1 : 0}" y1="0" x2="${side === 'l' ? 0 : 1}" y2="0"><stop offset="0" stop-color="rgba(60,50,20,.16)"/><stop offset=".12" stop-color="rgba(60,50,20,0)"/></linearGradient>
    </defs>
    <g clip-path="url(#${id}-c)">
      <rect x="0" y="0" width="1200" height="2400" fill="url(#${id}-g)"/>
      <rect x="0" y="0" width="1200" height="2400" fill="url(#${id}-p)"/>
      <rect x="${side === 'l' ? 142 : 600}" y="352" width="458" height="2048" fill="url(#${id}-s)"/>
      <path d="${OPEN}" fill="none" stroke="#EFEADB" stroke-width="40"/>
      <path d="${OPEN}" fill="none" stroke="var(--nr-gold)" stroke-width="3" transform="translate(600 1376) scale(.955) translate(-600 -1376)"/>
    </g>
    <line x1="600" y1="352" x2="600" y2="2400" stroke="var(--nr-gold)" stroke-width="4"/>
    <circle cx="${ring}" cy="1300" r="17" fill="none" stroke="var(--nr-gold)" stroke-width="5"/>
    <circle cx="${ring}" cy="1280" r="6" fill="var(--nr-gold)"/>
  </svg>`;
};

/** an 8-point star medallion with the day inside (events, the desktop hero side) */
const medallion = (d, esc, cls = '') => `<div class="nr-medal ${cls}">
  <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><polygon points="${starPts(50, 50, 48)}" fill="var(--nr-ivory)" stroke="var(--nr-gold)" stroke-width="1.4"/><polygon points="${starPts(50, 50, 43)}" fill="none" stroke="var(--nr-gold)" stroke-width=".7" opacity=".7"/></svg>
  <span class="nr-medal__wd">${esc(d.wdShort)}</span><b class="nr-medal__day">${esc(d.day)}</b><span class="nr-medal__m">${esc(d.monthShort)}</span>
</div>`;

/** the pointed-arch cap of every panel */
const CAP = '<svg class="nr-panel__cap" viewBox="0 0 600 200" aria-hidden="true" focusable="false"><path d="M0 201V150C0 70 230 60 300 0C370 60 600 70 600 150V201Z" fill="var(--nr-ivory)"/><path d="M12 201V152C12 82 238 72 300 16C362 72 588 82 588 152V201" fill="none" stroke="var(--nr-gold)" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>';
const panel = (inner, cls = '') => `<div class="nr-panel ${cls}">${CAP}<div class="nr-panel__body">${inner}</div></div>`;

const SPEC = {
  slug: 'noor',
  manifest,
  ownButtons: true,
  demo: {
    bride: 'Aisha', brideLast: 'Rahman', groom: 'Omar', groomLast: 'Siddiqui', date: '2027-04-16', time: '15:00', tz: 'America/Chicago',
    venue: 'The Grand Ballroom at The Driskill', city: 'Austin, TX', mapQuery: 'The Driskill, 604 Brazos St, Austin, TX',
    welcomeVenue: 'The Rahman family home', walimaVenue: 'The Grand Ballroom at The Driskill',
    brideParents: 'Dr. and Mrs. Tariq Rahman', groomParents: 'Mr. and Mrs. Imran Siddiqui',
    dress: 'Formal; modest attire appreciated', colors: ['#3D5A44', '#E9DCC0', '#F3D9D3'], deadline: 'Kindly reply by March 15, 2027',
    hosts: 'The Rahman and Siddiqui families',
    portraits: [P.ringsBouquet, P.handsBouquet, P.brideBouquet], gallery: [P.aisle, P.bouquetHug],
    travel: 'Austin–Bergstrom Airport is about 20 minutes from The Driskill. Valet parking is available at the hotel entrance on Brazos Street.',
    stays: [
      { name: { en: 'The Driskill', ne: '' }, note: { en: 'Room block under Rahman–Siddiqui until March 15', ne: '' }, mapQuery: 'The Driskill, Austin, TX' },
      { name: { en: 'Hotel Van Zandt', ne: '' }, note: { en: 'A ten-minute drive, on Rainey Street', ne: '' }, mapQuery: 'Hotel Van Zandt, Austin, TX' },
    ],
    contacts: [
      { name: { en: 'Sara Rahman', ne: '' }, role: { en: 'Sister of the bride', ne: '' }, phone: '+1 512 555 0142' },
      { name: { en: 'Bilal Siddiqui', ne: '' }, role: { en: 'Brother of the groom', ne: '' }, phone: '+1 512 555 0178' },
    ],
    story: [
      { year: { en: '2019', ne: '' }, text: { en: 'Introduced by our mothers over chai, and we talked until the pot went cold.', ne: '' } },
      { year: { en: '2023', ne: '' }, text: { en: 'Two families, many dinners, and one very long list of favorite places in Austin.', ne: '' } },
      { year: { en: '2026', ne: '' }, text: { en: 'Our families met for the proposal, and the answer was yes, alhamdulillah.', ne: '' } },
    ],
  },

  // ───────── the gate: carved doors closed inside the arch ─────────
  gate(ctx) {
    const { bi, esc, txt, on, D, names } = ctx;
    const own = !isDefaultArt(ctx);
    return `<div class="nr-gate">
      <div class="nr-stage nr-stage--gate">
        <div class="nr-leaf nr-leaf--l" aria-hidden="true">${leaf('l')}</div>
        <div class="nr-leaf nr-leaf--r" aria-hidden="true">${leaf('r')}</div>
        ${own ? '' : '<img class="nr-flora" src="/themes/noor/art/flora-sm.webp" srcset="/themes/noor/art/flora-sm.webp 640w, /themes/noor/art/flora.webp 1200w" sizes="(max-width: 899px) 110vw, 50vh" alt="" aria-hidden="true" decoding="async" />'}
        <div class="nr-plaque">
          ${on(txt('gate.line')) ? `<p class="nr-plaque__line">${bi(txt('gate.line'))}</p>` : ''}
          <p class="nr-plaque__names">${names({ amp: '<em>&amp;</em>' })}</p>
          <p class="nr-plaque__date">${esc(`${D.month} ${D.day}, ${D.year}`)}</p>
          <button class="vw-btn nr-plaque__btn" id="open" type="button" disabled>${bi(txt('gate.open'))}</button>
          <button class="vw-quiet nr-plaque__quiet" id="quiet" type="button" disabled>${bi(txt('gate.quiet'))}</button>
        </div>
      </div>
    </div>`;
  },
  open(ctx, tl) {
    const { gsap } = ctx;
    gsap.set('.nr-leaf--l', { transformOrigin: '0% 50%' });
    gsap.set('.nr-leaf--r', { transformOrigin: '100% 50%' });
    gsap.set('.nr-stage', { transformOrigin: '50% 46%' });
    tl.to('.nr-plaque', { opacity: 0, scale: 0.96, duration: 0.45, ease: 'power2.in' }, 0)
      .to('.nr-leaf--l', { rotationY: -104, duration: 1.7, ease: 'power3.inOut' }, 0.35)
      .to('.nr-leaf--r', { rotationY: 104, duration: 1.7, ease: 'power3.inOut' }, 0.42)
      .to('.nr-leaf', { opacity: 0, duration: 0.5, ease: 'power1.in' }, 1.45)
      .fromTo('.nr-stage', { scale: 1 }, { scale: 1.03, duration: 2.2, ease: 'power2.inOut' }, 0.3);
    return 1.15;
  },
  scroll(ctx) {
    // desktop only: each arch-window panel rises out of the sage field toward you, a little deeper each time
    if (ctx.reduced) return;
    const { gsap } = ctx;
    gsap.matchMedia().add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      document.querySelectorAll('.nr-rise3d').forEach((el, i) => {
        gsap.fromTo(el, { y: 150, z: -260 - (i % 3) * 60, rotationX: 10, transformPerspective: 1400, transformOrigin: '50% 100%' }, {
          y: 0, z: 0, rotationX: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 40%', scrub: 0.7 },
        });
      });
    });
  },

  // ───────── the page ─────────
  page(ctx) {
    const { bi, esc, txt, on, parts: Pt, D, venue, city, names } = ctx;
    const place = [venue, city].filter(Boolean);
    const art = ctx.S.img('hero.arch');
    const artImg = art ? `<img class="nr-stage__art" src="${esc(ctx.photoUrl(art, 'sm'))}" srcset="${esc(ctx.photoUrl(art, 'sm'))} 640w, ${esc(ctx.photoUrl(art, 'lg'))} 1200w" sizes="(max-width: 899px) 110vw, 50vh" alt="" fetchpriority="high" decoding="async" />` : '';
    const head = (id, title, kicker = '') => `<header class="nr-head">${kicker ? `<p class="nr-eyebrow">${kicker}</p>` : ''}<h2 class="nr-h2" id="${id}">${bi(title)}</h2><span class="nr-rule" aria-hidden="true"><i></i></span></header>`;
    const story = Pt.story;
    const verse = ctx.verse('nr-verse');

    const hero = `
    <section class="vw-hero nr-hero" id="top" aria-label="${esc(ctx.namesText)}">
      <div class="nr-stage">
        ${artImg}
        ${ctx.emblem('nr-emblem')}
        <div class="nr-words">
          ${on(txt('hero.kicker')) ? `<p class="nr-kicker vw-in">${bi(txt('hero.kicker'))}</p>` : ''}
          <h1 class="nr-names vw-in">${names({ amp: '<em>&amp;</em>' })}</h1>
          ${on(txt('hero.line')) ? `<p class="nr-line vw-in">${bi(txt('hero.line'))}</p>` : ''}
          <p class="nr-when nr-ph vw-in"><b>${esc(D.long)}</b>${D.time ? `<span>${esc(D.spelled.time)}</span>` : ''}</p>
          ${place.length ? `<p class="nr-place nr-ph vw-in">${place.map(esc).join('<br />')}</p>` : ''}
        </div>
      </div>
      <div class="nr-side nr-side--l nr-dk vw-in">${medallion(D, esc, 'nr-medal--hero')}<p class="nr-side__t">${esc(D.wd)}<br />${esc(`${D.month} ${D.day}, ${D.year}`)}</p></div>
      <div class="nr-side nr-side--r nr-dk vw-in">${place.length ? `<p class="nr-side__v">${esc(place[0])}</p>${place[1] ? `<p class="nr-side__t">${esc(place[1])}</p>` : ''}` : ''}${D.time ? `<p class="nr-side__t">${esc(D.spelled.time)}</p>` : ''}</div>
      ${Pt.cue(verse ? 'blessing' : Pt.lead || story.length ? 'couple' : 'date')}
    </section>`;

    const blessing = verse ? `<section class="nr-sec nr-blessing" id="blessing" aria-label="Blessing"><div class="nr-rise3d"><div class="vw-rise">${panel(verse, 'nr-panel--slim')}</div></div></section>` : '';

    const couple = (Pt.lead || story.length) ? `
    <section class="nr-sec nr-couple" id="couple" aria-labelledby="couple-h"><div class="nr-rise3d"><div class="vw-rise">${panel(`
      ${head('couple-h', txt('couple.title'), on(txt('story.title')) && story.length ? esc(txt('story.title').en) : '')}
      ${Pt.lead ? `<figure class="nr-window">${ctx.imgTag(Pt.lead.photo, Pt.lead.alt, '(max-width: 699px) 80vw, 460px')}</figure>` : ''}
      ${story.length ? `<ol class="nr-story" id="story">${story.map((s) => `<li><span class="nr-story__star" aria-hidden="true"><svg viewBox="0 0 20 20"><polygon points="${starPts(10, 10, 9)}"/></svg></span><p class="nr-story__y">${bi(s.year)}</p><p class="nr-story__t">${bi(s.text)}</p></li>`).join('')}</ol>` : ''}`)}
    </div></div></section>` : '';

    const date = `
    <section class="nr-sec nr-date" id="date" aria-labelledby="date-h"><div class="nr-rise3d"><div class="vw-rise">${panel(`
      ${head('date-h', txt('count.title'))}
      ${Pt.countdown('nr-count')}
      <p class="nr-date__when">${esc(D.long)}${place.length ? `<br />${esc(place.join(', '))}` : ''}</p>
      <div class="nr-btns">${Pt.calendarBtn()}${Pt.shareBtn()}</div>`)}
    </div></div></section>`;

    const programme = Pt.events.length ? `
    <section class="nr-sec nr-prog" id="programme" aria-labelledby="prog-h"><div class="nr-rise3d"><div class="vw-rise">${panel(`
      ${head('prog-h', txt('prog.title'))}
      <ol class="nr-events">${Pt.events.map((ev) => `
        <li class="nr-ev" id="ev-${esc(ev.id)}">
          ${medallion(ev.d, esc)}
          <div class="nr-ev__body">
            <h3 class="nr-ev__title">${bi(ev.title)}</h3>
            <p class="nr-ev__date">${esc(ev.d.long)}</p>
            <p class="nr-ev__time">${esc(ev.time)}</p>
            <p class="nr-ev__venue">${bi(ev.venue)} ${Pt.mapLink(ev)}</p>
            ${ev.blurb ? `<p class="nr-ev__blurb">${bi(ev.blurb)}</p>` : ''}
            ${ev.dress ? `<p class="nr-ev__dress">${Pt.swatches(ev)}<span>${bi(ev.dress.text)}</span></p>` : ''}
            ${Pt.orderList(ev)}
          </div>
        </li>`).join('')}
      </ol>`, 'nr-panel--wide')}
    </div></div></section>` : '';

    const hosts = `
    <section class="nr-sec nr-hosts" id="card" aria-labelledby="hosts-h"><div class="nr-rise3d"><div class="vw-rise">${panel(`
      <p class="nr-eyebrow" id="hosts-h">${bi(txt('families.title'))}</p>
      ${Pt.hosts ? `<p class="nr-hosts__names">${bi(Pt.hosts)}</p>` : ''}
      ${Pt.families.length ? `<div class="nr-hosts__fam">${Pt.families.map((f) => (on(f.person.parents) ? `<p><span>${bi(f.person.parents)}</span></p>` : '')).join('')}</div>` : ''}
      ${Pt.cardBtn('vw-btn--line')}`, 'nr-panel--slim')}
    </div></div></section>`;

    const photos = Pt.photos.length ? `
    <section class="nr-sec nr-photos" id="photos" aria-labelledby="ph-h"><div class="nr-rise3d"><div class="vw-rise">${panel(`
      ${head('ph-h', txt('gallery.title'))}
      <div class="nr-album">${Pt.photos.map((g, i) => `<figure class="nr-album__it">${Pt.photoBtn(g, i, '(max-width: 699px) 40vw, 300px')}</figure>`).join('')}</div>`, 'nr-panel--wide')}
    </div></div></section>` : '';

    const info = (Pt.hasInfo || Pt.live) ? `
    <section class="nr-sec nr-info" id="info" aria-labelledby="info-h"><div class="nr-rise3d"><div class="vw-rise">${panel(`
      ${head('info-h', txt('info.title'))}
      ${Pt.hasInfo ? Pt.infoBlocks('nr-info__grid') : ''}
      ${Pt.liveBlock('nr-live')}`, 'nr-panel--wide')}
    </div></div></section>` : '';

    const rsvp = `
    <section class="nr-sec nr-rsvp" id="rsvp" aria-labelledby="rsvp-title"><div class="nr-rise3d"><div class="nr-env vw-rise">
      <svg class="nr-env__flap" viewBox="0 0 600 260" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 260V170C0 90 220 70 300 0C380 70 600 90 600 170V260Z" fill="var(--nr-env)"/><path d="M14 260V174C14 100 230 84 300 22C370 84 586 100 586 174V260" fill="none" stroke="var(--nr-gold)" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>
      <div class="nr-env__back" aria-hidden="true"></div>
      <div class="nr-card">
        <span class="nr-card__seal" aria-hidden="true"><svg viewBox="0 0 100 100"><polygon points="${starPts(50, 50, 48)}" fill="var(--nr-gold)"/><polygon points="${starPts(50, 50, 36)}" fill="none" stroke="var(--nr-ivory)" stroke-width="2"/></svg></span>
        <h2 class="nr-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
        ${Pt.deadline ? `<p class="nr-rsvp__by">${bi(Pt.deadline)}</p>` : ''}
        ${Pt.rsvpForm()}
      </div>
      <svg class="nr-env__pocket" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 120V40L240 40C270 40 285 20 300 0C315 20 330 40 360 40L600 40V120Z" fill="var(--nr-env)"/><path d="M0 52H236C268 52 286 32 300 14C314 32 332 52 364 52H600" fill="none" stroke="var(--nr-gold)" stroke-width="1.2" vector-effect="non-scaling-stroke"/></svg>
    </div></div></section>`;

    const close = `
    <footer class="nr-close" aria-label="Closing">
      ${ctx.emblem('nr-close__emblem')}
      ${ctx.closing ? `<p class="nr-close__line">${bi(ctx.closing)}</p>` : ''}
      <p class="nr-close__names">${names({ amp: '<em>&amp;</em>' })}</p>
      ${ctx.hashtag ? `<p class="nr-close__tag">${esc(ctx.hashtag)}</p>` : ''}
      ${Pt.madeWith()}
    </footer>`;

    return `${hero}<div class="nr-field">${blessing + couple + date + programme + hosts + photos + info + rsvp + close}</div>`;
  },
};

function isDefaultArt(ctx) {
  const ref = ctx.S.img('hero.arch');
  const key = typeof ref === 'string' ? ref : ref?.lg || '';
  return key === ART_DEFAULT;
}

mountVow(SPEC);
