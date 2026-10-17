// Jali: a Muslim wedding invitation in emerald, gold and ivory, drawn entirely in code. The signature moment: two
// emerald mashrabiya screens (8-point star-and-cross lattice in gold) slide apart under three glowing brass lanterns.
// The body is a bento of geometric tiles; each event is a tile with a star seal; the countdown sits inside an
// 8-point star; the reply is a tile that turns over in 3D. Faith marks come from the engine (?v=neutral removes them).
import './jali.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';
import { DEMO_PHOTOS as P } from '../_vow/demo.js';

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
const star = (cls, inner = '', R = 48) => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><polygon points="${starPts(50, 50, R)}"/>${inner}</svg>`;

/** a brass lantern: chain, dome, pierced body glowing from inside */
const lantern = (cls, chain) => `<div class="jl-lantern ${cls}" aria-hidden="true">
  <span class="jl-lantern__glow"></span>
  <svg viewBox="0 0 80 ${170 + chain}" focusable="false">
    <line x1="40" y1="0" x2="40" y2="${chain}" stroke="#B8924A" stroke-width="1.6" stroke-dasharray="5 3"/>
    <g transform="translate(0 ${chain})">
      <circle cx="40" cy="4" r="4" fill="none" stroke="#C9A45C" stroke-width="1.6"/>
      <path d="M40 8 L44 18 H36 Z" fill="#B8924A"/>
      <path d="M22 40 C22 26 32 18 40 18 C48 18 58 26 58 40 Z" fill="#8C6A2C"/>
      <path d="M24 40 C24 29 32 22 40 22" fill="none" stroke="#E2C27A" stroke-width="1.2" opacity=".6"/>
      <rect x="18" y="40" width="44" height="6" rx="2" fill="#B8924A"/>
      <path d="M20 46 H60 L66 70 L60 118 H20 L14 70 Z" fill="#FFD27A" opacity=".95"/>
      <path d="M20 46 H60 L66 70 L60 118 H20 L14 70 Z" fill="url(#jl-lg)"/>
      <g fill="#7A5A22">
        <path d="M20 46 H60 L66 70 L60 118 H20 L14 70 Z M40 56 l4 8 9 1 -7 6 2 9 -8-5 -8 5 2-9 -7-6 9-1Z M24 92 h6 v14 h-6Z M50 92 h6 v14 h-6Z M37 90 h6 v18 h-6Z" fill-rule="evenodd"/>
      </g>
      <path d="M40 46 V118 M14 70 H66" stroke="#7A5A22" stroke-width="1.2" opacity=".5"/>
      <rect x="18" y="118" width="44" height="6" rx="2" fill="#B8924A"/>
      <path d="M26 124 H54 L46 140 H34 Z" fill="#8C6A2C"/>
      <path d="M40 140 V158" stroke="#B8924A" stroke-width="1.6"/>
      <circle cx="40" cy="161" r="3" fill="#C9A45C"/>
    </g>
    <defs><radialGradient id="jl-lg" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#FFF4D0"/><stop offset="1" stop-color="#F2A93B" stop-opacity=".2"/></radialGradient></defs>
  </svg>
</div>`;
const LANTERNS = () => `<div class="jl-lanterns" aria-hidden="true">${lantern('jl-lantern--l', 60)}${lantern('jl-lantern--c', 22)}${lantern('jl-lantern--r', 96)}</div>`;

const SPEC = {
  slug: 'jali',
  manifest,
  ownButtons: true,
  demo: {
    bride: 'Layla', brideLast: 'Haddad', groom: 'Yusuf', groomLast: 'Karim', date: '2027-05-29', time: '16:00', tz: 'America/Detroit',
    venue: 'The Ritz-Carlton', city: 'Dearborn, MI', mapQuery: 'The Ritz-Carlton, Dearborn, MI',
    welcomeVenue: 'The Haddad family home', brideParents: 'Mr. and Mrs. Sami Haddad', groomParents: 'Dr. and Mrs. Nabil Karim',
    dress: 'Formal', colors: ['#0E3B31', '#CDA959', '#F7F1E3'], deadline: 'Kindly reply by May 1, 2027',
    hosts: 'The Haddad and Karim families',
    portraits: [P.ringsBouquet, P.handsBouquet, P.brideBouquet], gallery: [P.aisle, P.bouquetHug],
    travel: 'Detroit Metro Airport is about 20 minutes away. Complimentary valet parking at the hotel for all wedding guests.',
    stays: [
      { name: { en: 'The Ritz-Carlton', ne: '' }, note: { en: 'Room block under Haddad–Karim until May 1', ne: '' }, mapQuery: 'The Ritz-Carlton, Dearborn, MI' },
      { name: { en: 'The Henry', ne: '' }, note: { en: 'Five minutes away, on Michigan Avenue', ne: '' }, mapQuery: 'The Henry hotel, Dearborn, MI' },
    ],
    contacts: [
      { name: { en: 'Nour Haddad', ne: '' }, role: { en: 'Sister of the bride', ne: '' }, phone: '+1 313 555 0142' },
      { name: { en: 'Adam Karim', ne: '' }, role: { en: 'Brother of the groom', ne: '' }, phone: '+1 313 555 0178' },
    ],
    story: [
      { year: { en: '2018', ne: '' }, text: { en: 'Two families at the same Eid dinner, and one long conversation about books.', ne: '' } },
      { year: { en: '2022', ne: '' }, text: { en: 'Graduations, road trips to Lake Michigan, and a lot of mint tea.', ne: '' } },
      { year: { en: '2026', ne: '' }, text: { en: 'He asked her father first. Then he asked her. Alhamdulillah.', ne: '' } },
    ],
  },

  // ───────── the gate: lattice screens under lanterns ─────────
  gate(ctx) {
    const { bi, esc, txt, on, D, names, initials } = ctx;
    return `<div class="jl-gate">
      <div class="jl-screen jl-screen--l" aria-hidden="true"></div>
      <div class="jl-screen jl-screen--r" aria-hidden="true"></div>
      ${LANTERNS()}
      <div class="jl-plate">
        <div class="jl-plate__seal">${star('jl-seal')}<span>${initials.map(esc).join('<i>&amp;</i>')}</span></div>
        ${on(txt('gate.line')) ? `<p class="jl-plate__line">${bi(txt('gate.line'))}</p>` : ''}
        <p class="jl-plate__names">${names({ amp: '<em>&amp;</em>' })}</p>
        <p class="jl-plate__date">${esc(`${D.wd}, ${D.month} ${D.day}, ${D.year}`)}</p>
        <button class="vw-btn" id="open" type="button" disabled>${bi(txt('gate.open'))}</button>
        <button class="vw-quiet jl-plate__quiet" id="quiet" type="button" disabled>${bi(txt('gate.quiet'))}</button>
      </div>
    </div>`;
  },
  open(ctx, tl) {
    tl.to('.jl-plate', { opacity: 0, y: 12, duration: 0.45, ease: 'power2.in' }, 0)
      .to('.jl-screen--l', { xPercent: -100, duration: 1.6, ease: 'power3.inOut' }, 0.35)
      .to('.jl-screen--r', { xPercent: 100, duration: 1.6, ease: 'power3.inOut' }, 0.35)
      .fromTo('.jl-gate .jl-lantern__glow', { opacity: 0.55 }, { opacity: 1, duration: 1.2, ease: 'sine.inOut' }, 0.3);
    return 1.2;
  },
  ready() {
    // the reply tile turns over: by its button, or by itself the first time it comes into view
    const tile = document.querySelector('.jl-flip');
    if (!tile) return;
    const turn = () => tile.classList.add('is-turned');
    tile.querySelector('.jl-flip__back')?.addEventListener('focusin', turn);
    document.getElementById('jl-turn')?.addEventListener('click', () => { turn(); setTimeout(() => document.getElementById('f-name')?.focus({ preventScroll: true }), 650); });
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let inFrame = false; try { inFrame = window.parent !== window; } catch { inFrame = true; }
    if (reduce || inFrame) { turn(); return; }
    const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { setTimeout(turn, 500); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(tile);
  },
  scroll(ctx) {
    // desktop only: the tiles arrive from different depths, column by column, like tiles set into a wall
    if (ctx.reduced) return;
    const { gsap } = ctx;
    gsap.matchMedia().add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      document.querySelectorAll('.jl-tile3d').forEach((el, i) => {
        const left = el.getBoundingClientRect().left + el.offsetWidth / 2 < window.innerWidth / 2;
        gsap.fromTo(el, { y: 110, z: -200 - (i % 3) * 70, rotationY: left ? 8 : -8, rotationX: 6, transformPerspective: 1500, transformOrigin: '50% 100%' }, {
          y: 0, z: 0, rotationY: 0, rotationX: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 55%', scrub: 0.6 },
        });
      });
    });
  },

  // ───────── the page ─────────
  page(ctx) {
    const { bi, esc, txt, on, parts: Pt, D, venue, city, names } = ctx;
    const place = [venue, city].filter(Boolean);
    const story = Pt.story;
    const verse = ctx.verse('jl-verse');
    const h2 = (id, title, kicker = '') => `<header class="jl-head">${kicker ? `<p class="jl-eyebrow">${kicker}</p>` : ''}<h2 class="jl-h2" id="${id}">${bi(title)}</h2></header>`;

    const hero = `
    <section class="vw-hero jl-hero" id="top" aria-label="${esc(ctx.namesText)}">
      ${LANTERNS()}
      <div class="jl-hero__in">
        ${ctx.emblem('jl-emblem vw-in')}
        ${on(txt('hero.kicker')) ? `<p class="jl-kicker vw-in">${bi(txt('hero.kicker'))}</p>` : ''}
        <h1 class="jl-names vw-in">${names({ amp: '<em>&amp;</em>' })}</h1>
        ${on(txt('hero.line')) ? `<p class="jl-line vw-in">${bi(txt('hero.line'))}</p>` : ''}
        <div class="jl-hero__when vw-in">
          <span>${esc(D.wd)}</span>${star('jl-hero__star', `<text x="50" y="58" text-anchor="middle">${esc(D.day)}</text>`)}<span>${esc(`${D.month} ${D.year}`)}</span>
        </div>
        ${D.time ? `<p class="jl-hero__time vw-in">${esc(D.spelled.time)}</p>` : ''}
        ${place.length ? `<p class="jl-hero__place vw-in">${place.map(esc).join(' · ')}</p>` : ''}
      </div>
      ${Pt.cue('couple')}
    </section>`;

    const tiles = [];
    if (Pt.lead || story.length) {
      tiles.push(`<section class="jl-tile jl-tile3d jl-t-story" id="couple" aria-labelledby="couple-h"><div class="jl-tile__in vw-rise">
        ${h2('couple-h', txt('couple.title'), on(txt('story.title')) && story.length ? esc(txt('story.title').en) : '')}
        <div class="jl-story${Pt.lead ? '' : ' is-solo'}">
          ${Pt.lead ? `<figure class="jl-photo">${ctx.imgTag(Pt.lead.photo, Pt.lead.alt, '(max-width: 899px) 86vw, 380px')}</figure>` : ''}
          ${story.length ? `<ol class="jl-steps" id="story">${story.map((s) => `<li><p class="jl-steps__y">${bi(s.year)}</p><p class="jl-steps__t">${bi(s.text)}</p></li>`).join('')}</ol>` : ''}
        </div>
      </div></section>`);
    }
    tiles.push(`<section class="jl-tile jl-tile3d jl-t-date" id="date" aria-labelledby="date-h"><div class="jl-tile__in vw-rise">
        ${h2('date-h', txt('count.title'))}
        <div class="jl-starcount">
          ${star('jl-starcount__bg', `<polygon points="${starPts(50, 50, 44)}" class="jl-starcount__in"/>`)}
          ${Pt.countdown('jl-count')}
        </div>
        <p class="jl-date__when">${esc(D.long)}</p>
        <div class="jl-btns">${Pt.calendarBtn()}${Pt.shareBtn()}</div>
      </div></section>`);
    if (Pt.events.length) {
      tiles.push(`<section class="jl-tile jl-t-prog" id="programme" aria-labelledby="prog-h">
        <div class="jl-prog__head">${h2('prog-h', txt('prog.title'))}</div>
        <ol class="jl-events">${Pt.events.map((ev) => `
          <li class="jl-ev jl-tile3d" id="ev-${esc(ev.id)}"><div class="jl-ev__in vw-rise">
            <div class="jl-ev__seal">${star('jl-seal')}<span><b>${esc(ev.d.day)}</b>${esc(ev.d.monthShort)}</span></div>
            <h3 class="jl-ev__title">${bi(ev.title)}</h3>
            <p class="jl-ev__date">${esc(ev.d.long)}</p>
            <p class="jl-ev__time">${esc(ev.time)}</p>
            <p class="jl-ev__venue">${bi(ev.venue)}<br />${Pt.mapLink(ev)}</p>
            ${ev.blurb ? `<p class="jl-ev__blurb">${bi(ev.blurb)}</p>` : ''}
            ${ev.dress ? `<p class="jl-ev__dress">${Pt.swatches(ev)}<span>${bi(ev.dress.text)}</span></p>` : ''}
            ${Pt.orderList(ev)}
          </div></li>`).join('')}
        </ol>
      </section>`);
    }
    if (verse) tiles.push(`<section class="jl-tile jl-tile3d jl-t-verse" id="blessing" aria-label="Blessing"><div class="jl-tile__in vw-rise">${verse}</div></section>`);
    tiles.push(`<section class="jl-tile jl-tile3d jl-t-hosts${verse ? '' : ' is-full'}" id="card" aria-labelledby="hosts-h"><div class="jl-tile__in vw-rise">
        <p class="jl-eyebrow" id="hosts-h">${bi(txt('families.title'))}</p>
        ${Pt.hosts ? `<p class="jl-hosts__names">${bi(Pt.hosts)}</p>` : ''}
        ${Pt.families.length ? `<div class="jl-hosts__fam">${Pt.families.map((f) => (on(f.person.parents) ? `<p>${bi(f.person.parents)}</p>` : '')).join('')}</div>` : ''}
        ${Pt.cardBtn('vw-btn--line')}
      </div></section>`);
    if (Pt.photos.length) {
      tiles.push(`<section class="jl-tile jl-tile3d jl-t-photos" id="photos" aria-labelledby="ph-h"><div class="jl-tile__in vw-rise">
        ${h2('ph-h', txt('gallery.title'))}
        <div class="jl-album">${Pt.photos.map((g, i) => `<figure class="jl-album__it">${Pt.photoBtn(g, i, '(max-width: 699px) 42vw, 300px')}</figure>`).join('')}</div>
      </div></section>`);
    }
    if (Pt.hasInfo || Pt.live) {
      tiles.push(`<section class="jl-tile jl-tile3d jl-t-info${Pt.live ? '' : ' is-full'}" id="info" aria-labelledby="info-h"><div class="jl-tile__in vw-rise">
        ${h2('info-h', txt('info.title'))}
        ${Pt.hasInfo ? Pt.infoBlocks('jl-info') : ''}
      </div></section>`);
      if (Pt.live) tiles.push(`<div class="jl-tile jl-tile3d jl-t-live"><div class="jl-tile__in vw-rise">${star('jl-live__star')}${Pt.liveBlock('jl-live')}</div></div>`);
    }
    tiles.push(`<section class="jl-tile jl-t-rsvp" id="rsvp" aria-labelledby="rsvp-title">
        <div class="jl-flip">
          <div class="jl-flip__face jl-flip__front">
            <div class="jl-plate jl-plate--tile">
              <div class="jl-plate__seal">${star('jl-seal')}<span>${ctx.initials.map(esc).join('<i>&amp;</i>')}</span></div>
              <p class="jl-plate__line">${bi(txt('rsvp.title'))}</p>
              ${Pt.deadline ? `<p class="jl-plate__date">${bi(Pt.deadline)}</p>` : ''}
              <button class="vw-btn" type="button" id="jl-turn">${bi(txt('rsvp.turn'))}</button>
            </div>
          </div>
          <div class="jl-flip__face jl-flip__back">
            <h2 class="jl-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
            ${Pt.deadline ? `<p class="jl-rsvp__by">${bi(Pt.deadline)}</p>` : ''}
            ${Pt.rsvpForm()}
          </div>
        </div>
      </section>`);

    const close = `
    <footer class="jl-close" aria-label="Closing">
      ${star('jl-close__star')}
      ${ctx.closing ? `<p class="jl-close__line">${bi(ctx.closing)}</p>` : ''}
      <p class="jl-close__names">${names({ amp: '<em>&amp;</em>' })}</p>
      ${ctx.hashtag ? `<p class="jl-close__tag">${esc(ctx.hashtag)}</p>` : ''}
      ${Pt.madeWith()}
    </footer>`;

    return `${hero}<div class="jl-bento">${tiles.join('')}</div>${close}`;
  },
};

mountVow(SPEC);
