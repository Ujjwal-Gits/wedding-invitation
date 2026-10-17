// Andalus: a Moorish courtyard invitation in deep teal, ivory and gold leaf. The signature moment: a paper scroll with
// zellige-tiled margins hangs rolled from its rod on a tiled courtyard floor; it unrolls down the screen (the roll
// travels, the paper stays put) and becomes the page itself: one long illuminated scroll with manuscript margins.
// The dates are laid as a tiled courtyard calendar with the day set in gold; the reply is a small sealed scroll.
// Desktop only: two layers of horseshoe arches drift at different depths in the courtyard beside the scroll.
import './andalus.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';
import { DEMO_PHOTOS as PH } from '../_vow/demo.js';

/** An eight-point star (two squares), centred on 0,0. */
const starPts = (R, r = R * 0.7654) => Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI) / 8 - Math.PI / 2;
  const d = i % 2 ? r : R;
  return `${(Math.cos(a) * d).toFixed(2)},${(Math.sin(a) * d).toFixed(2)}`;
}).join(' ');
const STAR = `<svg class="an-star" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false"><polygon points="${starPts(11)}" fill="none" stroke="currentColor" stroke-width="1.1"/><polygon points="${starPts(6.2)}" fill="currentColor"/></svg>`;
const RULE = `<span class="an-rule" aria-hidden="true"><i></i>${STAR}<i></i></span>`;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const art = (ctx, id, cls, sizes, lazy = false) => {
  const ref = ctx.S.img(id);
  if (!ref) return '';
  const alt = typeof ref === 'object' && ref.alt ? ref.alt : '';
  return `<img class="${cls}" src="${ctx.esc(ctx.photoUrl(ref, 'sm'))}" srcset="${ctx.esc(ctx.photoUrl(ref, 'sm'))} 640w, ${ctx.esc(ctx.photoUrl(ref, 'lg'))} 1200w" sizes="${sizes}" alt="${ctx.esc(alt)}" ${lazy ? 'loading="lazy"' : ''} decoding="async" />`;
};

/** The geometric wax seal: an eight-point star of wax with the initials pressed in. */
const seal = (ctx, cls = '') => `<span class="an-seal ${cls}" aria-hidden="true"><svg viewBox="-50 -50 100 100" focusable="false">
  <polygon points="${starPts(48, 40)}" class="an-seal__wax"/><polygon points="${starPts(37, 30)}" class="an-seal__ring"/><circle r="22" class="an-seal__ring"/></svg>
  <b>${ctx.initials.map(ctx.esc).join('<i>&amp;</i>')}</b></span>`;

const SPEC = {
  slug: 'andalus',
  manifest,
  demo: {
    bride: 'Mariam', brideLast: 'Aziz', groom: 'Bilal', groomLast: 'Qureshi', date: '2027-10-23', time: '16:00', tz: 'America/Los_Angeles',
    venue: 'Villa del Sol', city: 'Santa Barbara, CA', dress: 'Formal; modest attire appreciated', colors: ['#0D5A50', '#E9DFC8', '#C2A05A'],
    deadline: 'Kindly reply by September 20, 2027', hashtag: '#MariamAndBilal',
    portraits: [PH.ringsBouquet, PH.handsBouquet, PH.brideBouquet], gallery: [PH.aisle, PH.bouquetHug],
  },

  // ───────── the gate: the scroll hangs rolled from its rod on the tiled courtyard ─────────
  gate(ctx) {
    const { esc, D, names } = ctx;
    return `<div class="an-gate" aria-hidden="true">
      <div class="an-gclip"><div class="an-gsheet"><div class="an-gsheet__in an-paper"></div></div></div>
      <div class="an-rod an-rod--gate"><i></i></div>
      <div class="an-groll"><div class="an-groll__body"></div>${seal(ctx, 'an-groll__seal')}</div>
      <div class="an-gwords">
        ${ctx.emblem('an-gwords__emblem', '--an-gold')}
        <p class="an-gwords__names">${names({ amp: '<em>&amp;</em>' })}</p>
        ${D.short ? `<p class="an-gwords__date">${esc(D.short)}${ctx.city ? `<span>${esc(ctx.city)}</span>` : ''}</p>` : ''}
      </div>
    </div>`;
  },
  ready(ctx) {
    // the paper starts wound on the roll: its window sits above the rod, its face counter-shifted to stay in place
    ctx.gsap.set('.an-gsheet', { yPercent: -100, visibility: 'visible' });
    ctx.gsap.set('.an-gsheet__in', { yPercent: 100 });
  },
  open(ctx, tl, gate) {
    const { gsap } = ctx;
    const roll = gate.querySelector('.an-groll');
    const clip = gate.querySelector('.an-gclip');
    const travel = () => Math.max(120, clip.getBoundingClientRect().height - 10);
    tl.to('.an-gwords', { autoAlpha: 0, y: 12, duration: 0.42, ease: 'power2.in' }, 0)
      .to('.an-groll__seal', { scale: 0.6, rotate: -24, autoAlpha: 0, duration: 0.45, ease: 'back.in(1.6)' }, 0.1)
      // the roll travels down; the paper it lets go of stays where it lies (a clip window that moves with the roll)
      .fromTo('.an-gsheet', { yPercent: -100 }, { yPercent: 0, duration: 1.65, ease: 'power2.inOut' }, 0.5)
      .fromTo('.an-gsheet__in', { yPercent: 100 }, { yPercent: 0, duration: 1.65, ease: 'power2.inOut' }, 0.5)
      .fromTo(roll, { y: 0 }, { y: travel, duration: 1.65, ease: 'power2.inOut' }, 0.5)
      .to(roll, { y: () => travel() + 90, autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, 2.05)
      .to(gate, { autoAlpha: 0, duration: 0.5, ease: 'power1.out' }, 2.15);
    return 2.25;
  },

  // ───────── the page: one long scroll ─────────
  page(ctx) {
    const { bi, esc, txt, on, parts: P, D, venue, city, names } = ctx;
    const head = (id, title, kicker = '') => `<header class="an-head vw-rise">${kicker ? `<p class="an-eyebrow">${kicker}</p>` : ''}<h2 class="an-h2" id="${id}">${bi(title)}</h2>${RULE}</header>`;
    const place = [venue, city].filter(Boolean);
    const story = P.story;
    const verse = ctx.verse('an-verse');

    const arcade = `<div class="an-arcade" aria-hidden="true">
      <div class="an-arcade__side an-arcade__side--l"><div class="an-arcade__far"></div><div class="an-arcade__near"></div></div>
      <div class="an-arcade__side an-arcade__side--r"><div class="an-arcade__far"></div><div class="an-arcade__near"></div></div>
    </div>`;

    const hero = `
    <section class="an-sec an-hero" id="top" aria-label="${esc(ctx.namesText)}">
      <div class="an-rod an-rod--top" aria-hidden="true"><i></i></div>
      <div class="an-hero__grid">
        <div class="an-hero__words">
          ${on(txt('hero.kicker')) ? `<p class="an-eyebrow vw-in">${bi(txt('hero.kicker'))}</p>` : ''}
          <h1 class="an-names vw-in">${names({ amp: '<em>&amp;</em>' })}</h1>
        </div>
        ${on(txt('hero.line')) ? `<div class="an-hero__side vw-in"><p class="an-hero__line">${bi(txt('hero.line'))}</p>${RULE}</div>` : ''}
        <figure class="an-hero__art vw-in">${ctx.emblem('an-hero__emblem')}${art(ctx, 'hero.court', 'an-hero__img', '(max-width: 899px) 62vw, 420px')}</figure>
        <div class="an-hero__when vw-in">
          ${D.wd ? `<p class="an-hero__wd">${esc(D.wd)}</p>` : ''}
          <p class="an-hero__date"><span class="an-hero__m">${esc(D.month)}</span> <span class="an-hero__d">${esc(D.day)}</span> <span class="an-hero__y">${esc(D.year)}</span></p>
          ${D.time ? `<p class="an-hero__time">${esc(D.spelled.time)}</p>` : ''}
          ${place.length ? `<p class="an-hero__place">${place.map((x, i) => (i ? `<span>${esc(x)}</span>` : `<b>${esc(x)}</b>`)).join('')}</p>` : ''}
        </div>
      </div>
      ${P.cue(verse ? 'blessing' : (P.lead || story.length ? 'couple' : 'date'))}
    </section>`;

    // the illumination: the Bismillah and the verse under a gold horseshoe arch (absent when faith marks are off)
    const blessing = verse ? `
    <section class="an-sec an-bless" id="blessing" aria-label="${esc(txt('verse.ref').en || 'Blessing')}">
      <div class="an-bless__frame vw-rise">
        <svg class="an-bless__arch" viewBox="0 -62 300 184" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
          <path d="M14 122V120A140 140 0 1 1 286 120V122" fill="none" stroke="currentColor" stroke-width="1.2"/>
          <path d="M24 122V118A130 130 0 1 1 276 118V122" fill="none" stroke="currentColor" stroke-width=".7" opacity=".7"/>
          <g transform="translate(150 -34)"><polygon points="${starPts(9)}" fill="none" stroke="currentColor" stroke-width="1"/><polygon points="${starPts(4.6)}" fill="currentColor"/></g>
        </svg>
        <div class="an-bless__body">${verse}</div>
      </div>
    </section>` : '';

    const couple = (P.lead || story.length) ? `
    <section class="an-sec an-couple" id="couple" aria-labelledby="couple-h">
      ${head('couple-h', txt('couple.title'), on(txt('story.title')) && story.length ? esc(txt('story.title').en) : '')}
      <div class="an-couple__grid${P.lead ? '' : ' an-couple__grid--solo'}">
        ${P.lead ? `<figure class="an-plate an-plate--lead vw-rise">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 899px) 80vw, 400px')}</figure>` : ''}
        ${story.length ? `<ol class="an-folio" id="story">${story.map((s) => `<li class="an-folio__e vw-rise"><p class="an-folio__gloss">${bi(s.year)}</p><p class="an-folio__t">${bi(s.text)}</p></li>`).join('')}</ol>` : ''}
      </div>
    </section>` : '';

    // ── the tiled courtyard calendar: every month an event falls in, the main day in gold ──
    const evByKey = new Map();
    for (const ev of P.events) {
      const m = MONTHS.indexOf(ev.d.month);
      if (m < 0 || !ev.d.year) continue;
      const k = `${ev.d.year}-${m}`;
      if (!evByKey.has(k)) evByKey.set(k, new Map());
      const days = evByKey.get(k);
      const n = Number(ev.d.day);
      if (!days.has(n)) days.set(n, []);
      days.get(n).push(ev);
    }
    const mainM = MONTHS.indexOf(D.month);
    const isMain = (y, m, n) => String(y) === String(D.year) && m === mainM && n === Number(D.day);
    if (mainM >= 0 && D.year && !evByKey.has(`${D.year}-${mainM}`)) evByKey.set(`${D.year}-${mainM}`, new Map());
    const months = [...evByKey.keys()].map((k) => k.split('-').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 2);
    const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const calendar = months.map(([y, m]) => {
      const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
      const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      const days = evByKey.get(`${y}-${m}`) || new Map();
      const cells = [];
      for (let i = 0; i < first; i++) cells.push('<li class="an-cal__x" aria-hidden="true"></li>');
      for (let n = 1; n <= count; n++) {
        const evs = days.get(n) || [];
        const main = isMain(y, m, n);
        const cls = main ? ' is-main' : evs.length ? ' is-ev' : '';
        const label = evs.length ? `<span class="sr-only">: ${evs.map((e) => esc(ctx.pair(e.title).en)).join(', ')}</span>` : '';
        cells.push(`<li class="an-cal__d${cls}"><span class="an-cal__n">${n}</span>${main ? STAR : ''}${label}</li>`);
      }
      while (cells.length % 7) cells.push('<li class="an-cal__x" aria-hidden="true"></li>');
      return `<div class="an-cal vw-rise" role="group" aria-label="${esc(`${MONTHS[m]} ${y}`)}">
        <p class="an-cal__m">${esc(MONTHS[m])}<span>${y}</span></p>
        <ol class="an-cal__grid">${WD.map((w) => `<li class="an-cal__wd" aria-hidden="true">${w}</li>`).join('')}${cells.join('')}</ol>
      </div>`;
    }).join('');
    const keyDays = [];
    for (const [k, days] of evByKey) {
      const [y, m] = k.split('-').map(Number);
      for (const [n, evs] of days) keyDays.push({ y, m, n, evs, main: isMain(y, m, n) });
    }
    keyDays.sort((a, b) => a.y - b.y || a.m - b.m || a.n - b.n);
    const key = keyDays.length ? `<ul class="an-cal__key vw-rise">${keyDays.map((k) => `<li><i class="${k.main ? 'is-main' : 'is-ev'}" aria-hidden="true"></i><span><b>${esc(k.evs[0].d.wd)}, ${esc(MONTHS[k.m])} ${k.n}</b> ${k.evs.map((e) => bi(e.title)).join('<em> · </em>')}</span></li>`).join('')}</ul>` : '';

    const date = `
    <section class="an-sec an-date" id="date" aria-labelledby="date-h">
      ${head('date-h', txt('cal.title'))}
      ${calendar}
      ${key}
      <div class="an-countbox vw-rise">
        <p class="an-countbox__h">${bi(txt('count.title'))}</p>
        ${P.countdown('an-count')}
      </div>
      <div class="an-btns vw-rise">${P.calendarBtn()}${P.shareBtn()}</div>
    </section>`;

    const programme = P.events.length ? `
    <section class="an-sec an-prog" id="programme" aria-labelledby="prog-h">
      ${head('prog-h', txt('prog.title'), span(ctx))}
      <ol class="an-events">${P.events.map((ev) => {
        const main = ev.d.short === D.short;
        return `
        <li class="an-ev vw-rise${main ? ' is-main' : ''}" id="ev-${esc(ev.id)}">
          <div class="an-ev__tile" aria-hidden="true"><span>${esc(ev.d.wdShort)}</span><b>${esc(ev.d.day)}</b><span>${esc(ev.d.monthShort)}</span></div>
          <div class="an-ev__body">
            <h3 class="an-ev__title">${bi(ev.title)}</h3>
            <p class="sr-only">${esc(ev.d.long)}</p>
            <dl class="an-ev__facts">
              <div><dt>Time</dt><dd>${esc(ev.time)}</dd></div>
              <div><dt>Place</dt><dd>${bi(ev.venue)} ${P.mapLink(ev)}</dd></div>
              ${ev.dress ? `<div><dt>${P.UI.wear}</dt><dd>${P.swatches(ev)}${bi(ev.dress.text)}</dd></div>` : ''}
            </dl>
            ${ev.blurb ? `<p class="an-ev__blurb">${bi(ev.blurb)}</p>` : ''}
            ${P.orderList(ev)}
          </div>
        </li>`;
      }).join('')}
      </ol>
    </section>` : '';

    const hasFam = P.hosts || P.families.some((f) => on(f.person.parents));
    const hosts = `
    <section class="an-sec an-hosts" id="card" aria-label="${esc(txt('card.button').en)}">
      <div class="an-cartouche vw-rise">
        ${hasFam ? `<p class="an-eyebrow">${bi(txt('families.title'))}</p>` : ''}
        ${P.hosts ? `<p class="an-hosts__names">${bi(P.hosts)}</p>` : ''}
        ${P.families.length ? `<p class="an-hosts__fam">${P.families.map((f) => (on(f.person.parents) ? `<span>${bi(f.person.parents)}</span>` : '')).filter(Boolean).join(`<i aria-hidden="true">${STAR}</i>`)}</p>` : ''}
        ${P.cardBtn('vw-btn--line')}
      </div>
    </section>`;

    const cols = [[], []];
    P.photos.forEach((g, i) => cols[i % 2].push(`<figure class="an-plate vw-rise">${P.photoBtn(g, i, '(max-width: 699px) 44vw, 400px')}<figcaption aria-hidden="true">${ROMAN[i] || i + 1}</figcaption></figure>`));
    const photos = P.photos.length ? `
    <section class="an-sec an-photos" id="photos" aria-labelledby="ph-h">
      ${head('ph-h', txt('gallery.title'))}
      <div class="an-folio-plates${P.photos.length === 1 ? ' is-one' : ''}"><div class="an-folio-plates__col">${cols[0].join('')}</div>${cols[1].length ? `<div class="an-folio-plates__col">${cols[1].join('')}</div>` : ''}</div>
    </section>` : '';

    const info = (P.hasInfo || P.live) ? `
    <section class="an-sec an-info" id="info" aria-labelledby="info-h">
      ${head('info-h', txt('info.title'))}
      ${P.hasInfo ? P.infoBlocks('an-gloss vw-rise') : ''}
      ${P.liveBlock('an-live vw-rise')}
    </section>` : '';

    const rsvp = `
    <section class="an-sec an-rsvp" id="rsvp" aria-labelledby="rsvp-title">
      <div class="an-reply vw-rise">
        ${art(ctx, 'rsvp.blossom', 'an-reply__blossom', '(max-width: 699px) 50vw, 300px', true)}
        <div class="an-rod an-rod--mini" aria-hidden="true"><i></i></div>
        <div class="an-reply__paper">
          ${seal(ctx, 'an-reply__seal')}
          <h2 class="an-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
          ${P.deadline ? `<p class="an-reply__by">${bi(P.deadline)}</p>` : ''}
          ${P.rsvpForm()}
        </div>
        <div class="an-rod an-rod--mini an-rod--mini-b" aria-hidden="true"><i></i></div>
      </div>
    </section>`;

    const close = `
    <footer class="an-sec an-close" aria-label="Closing">
      ${RULE}
      ${ctx.closing ? `<p class="an-close__line">${bi(ctx.closing)}</p>` : ''}
      <p class="an-close__names">${names({ amp: '<em>&amp;</em>' })}</p>
      ${ctx.hashtag ? `<p class="an-close__tag">${esc(ctx.hashtag)}</p>` : ''}
      ${P.madeWith()}
      <div class="an-rod an-rod--bottom" aria-hidden="true"><i></i></div>
    </footer>`;

    return arcade + hero + blessing + couple + `<div class="an-court">${date}${programme}</div>` + hosts + photos + info + rsvp + close;
  },

  // ───────── scroll: on big screens the courtyard arches beside the scroll drift at two depths ─────────
  scroll(ctx) {
    const { gsap } = ctx;
    if (ctx.reduced) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1100px) and (prefers-reduced-motion: no-preference)', () => {
      const st = { trigger: document.documentElement, start: 0, end: 'max', scrub: 0.8 };
      gsap.fromTo('.an-arcade__far', { yPercent: 0 }, { yPercent: -14, ease: 'none', scrollTrigger: st });
      gsap.fromTo('.an-arcade__near', { yPercent: 0 }, { yPercent: -34, ease: 'none', scrollTrigger: { ...st } });
    });
  },
};

/** "October 22 – 23" over a weekend, else nothing */
function span(ctx) {
  const s = ctx.span;
  if (!s) return '';
  return ctx.esc(s.from.month === s.to.month ? `${s.from.month} ${s.from.day} – ${s.to.day}` : `${s.from.monthShort} ${s.from.day} – ${s.to.monthShort} ${s.to.day}`);
}

mountVow(SPEC);
