// Amalfi: a destination weekend on the coast, sea blue on white. The signature moment: a postcard lies on a white
// tabletop, its back written like an address (stamp, postmark, the names); it turns over to a painting of Positano and
// settles into the first screen. After that the page is a calm weekend guide: a route of the story, a departure
// board, boarding-pass tickets for each day, a swipeable photo strip, a travel guide with luggage-tag stays, and a
// reply postcard.
import './amalfi.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';

const E = (en) => ({ en, ne: '' });

/** A design image from a slot: srcset when the slot has two sizes. */
function artImg(ctx, id, cls, sizes, { eager = false } = {}) {
  const ref = ctx.S.img(id);
  if (!ref) return '';
  const { esc, photoUrl } = ctx;
  const sm = photoUrl(ref, 'sm'); const lg = photoUrl(ref, 'lg');
  const wh = ref && typeof ref === 'object' && ref.w && ref.h ? ` width="${Number(ref.w)}" height="${Number(ref.h)}"` : '';
  const set = sm && lg && sm !== lg ? ` srcset="${esc(sm)} 640w, ${esc(lg)} 1200w" sizes="${sizes}"` : '';
  return `<img class="${cls}" src="${esc(sm || lg)}"${set}${wh} alt="" decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} />`;
}

/** The postcard's painted side: landscape on wide screens, portrait on phones. */
function painting(ctx, cls = 'am-paint') {
  const { esc, photoUrl, S } = ctx;
  const land = S.img('postcard.front'); const tall = S.img('postcard.frontTall') || land;
  if (!land && !tall) return '';
  const u = (r, s) => esc(photoUrl(r, s));
  return `<picture class="${cls}">
    ${land ? `<source media="(min-width: 700px)" srcset="${u(land, 'sm')} 640w, ${u(land, 'lg')} 1200w" sizes="(min-width: 900px) 42vw, 640px" />` : ''}
    <img src="${u(tall, 'lg')}" srcset="${u(tall, 'sm')} 420w, ${u(tall, 'lg')} 620w" sizes="340px" alt="" decoding="async" />
  </picture>`;
}

/** A perforated stamp with a picture from the art. */
const stamp = (ctx, cls = '') => `<span class="am-stamp ${cls}" aria-hidden="true"><span class="am-stamp__in">${artImg(ctx, 'postcard.stamp', 'am-stamp__img', '90px')}</span></span>`;

/** A round postmark: the town on the ring, the date in the middle, wavy cancellation lines. */
function postmark(ctx, cls = '') {
  const { esc, D, city } = ctx;
  const town = (city || ctx.venue || '').split(',')[0].trim().toUpperCase().slice(0, 22);
  const id = `pm-${cls.replace(/\W/g, '') || 'a'}`;
  const waves = [0, 1, 2, 3].map((i) => `<path d="M-96 ${36 + i * 9}c10-6 20-6 30 0s20 6 30 0 20-6 30 0 20 6 30 0" />`).join('');
  return `<svg class="am-pm am-pm--${cls}" viewBox="-100 0 200 100" width="168" height="84" aria-hidden="true" focusable="false">
    <defs><path id="${id}" d="M50 50m-37 0a37 37 0 1 1 74 0a37 37 0 1 1-74 0" /></defs>
    <g fill="none" stroke="currentColor" stroke-width="1.6">${waves}<circle cx="50" cy="50" r="46" /><circle cx="50" cy="50" r="28" stroke-width="1.1" /></g>
    <text class="am-pm__ring"><textPath href="#${id}" startOffset="25%" text-anchor="middle">${esc(town)}</textPath></text>
    <text class="am-pm__d" x="50" y="49" text-anchor="middle">${esc(D.day2)} ${esc(D.monthShort.toUpperCase())}</text>
    <text class="am-pm__y" x="50" y="63" text-anchor="middle">${esc(D.year)}</text>
  </svg>`;
}

/** "June 4 – 6" over a weekend, else nothing */
function spanText(ctx) {
  const s = ctx.span;
  if (!s) return '';
  return s.from.month === s.to.month ? `${s.from.month} ${s.from.day} – ${s.to.day}` : `${s.from.monthShort} ${s.from.day} – ${s.to.monthShort} ${s.to.day}`;
}

const SPEC = {
  slug: 'amalfi',
  manifest,
  demo: {
    bride: 'Mia', brideLast: 'Russo', groom: 'Lucas', groomLast: 'Bennett', date: '2027-06-05', time: '17:30', tz: 'Europe/Rome',
    venue: 'Villa Lumière', city: 'Positano, Italy', mapQuery: 'Positano, Amalfi Coast, Italy',
    dress: 'Summer formal, flat shoes for the steps', colors: ['#1C5880', '#F2E3A0', '#F7F5EF'], hashtag: '#MiaAndLucasInPositano',
    deadline: 'Kindly reply by March 1, 2027',
    welcomeVenue: 'Terrazza sul Mare', welcomeMap: 'Positano harbor, Italy', brunchVenue: 'Spiaggia Grande', brunchMap: 'Spiaggia Grande, Positano, Italy',
    travel: 'Fly into Naples. The airport (NAP) is about ninety minutes from Positano by road.\n'
      + 'Take the shuttle or the ferry. We will share a shuttle schedule in the spring; ferries run from Naples and Salerno.\n'
      + 'Mind the steps. Positano is a town of stairs, so pack flat shoes and travel light.',
    stays: [
      { name: E('Casa dei Limoni'), note: E('Room block under Russo–Bennett until March 1'), mapQuery: 'hotels in Positano, Italy' },
      { name: E('Hotel Belvedere'), note: E('A ten-minute walk to the villa'), mapQuery: 'hotels near Spiaggia Grande, Positano' },
    ],
    contacts: [
      { name: E('Giulia Esposito'), role: E('Wedding planner'), phone: '+39 089 555 0142' },
      { name: E('Ben Russo'), role: E('Brother of the bride'), phone: '+1 646 555 0178' },
    ],
  },

  // ───────── the gate: the back of a postcard on a white tabletop ─────────
  gate(ctx) {
    const { bi, esc, txt, on, names, venue, city } = ctx;
    const when = [spanText(ctx) ? `${spanText(ctx)}, ${ctx.D.year}` : ctx.D.short, city].filter(Boolean).join(' · ');
    return `<div class="am-gate" aria-hidden="true">
      <div class="am-table"></div>
      <div class="am-stage">
        <div class="am-shadow"></div>
        <div class="am-card" id="am-card"><div class="am-flip">
          <div class="am-side am-side--msg">
            ${on(txt('postcard.print')) ? `<p class="am-print">${bi(txt('postcard.print'))}</p>` : ''}
            <div class="am-post">${postmark(ctx, 'gate')}${stamp(ctx)}</div>
            <div class="am-msg">
              ${on(txt('postcard.note')) ? `<p class="am-note">${bi(txt('postcard.note'))}</p>` : ''}
              ${ctx.verse('am-gverse')}
              <p class="am-caption">${esc(when)}</p>
            </div>
            <div class="am-addr">
              <p class="am-addr__l am-addr__names">${names({ amp: '&amp;' })}</p>
              ${venue ? `<p class="am-addr__l">${esc(venue)}</p>` : ''}
              ${city ? `<p class="am-addr__l">${esc(city)}</p>` : ''}
            </div>
          </div>
          <div class="am-side am-side--art">${painting(ctx)}</div>
        </div></div>
      </div>
    </div>`;
  },
  gateTap(ctx, open) {
    document.getElementById('am-card')?.addEventListener('click', open);
  },
  open(ctx, tl, gate) {
    const { gsap } = ctx;
    const card = gate.querySelector('.am-card');
    const flip = gate.querySelector('.am-flip'); // turns over in its own 3D context (the card around it may fade)
    const shadow = gate.querySelector('.am-shadow');
    const target = [...document.querySelectorAll('[data-settle]')].find((el) => el.getClientRects().length);
    const lemons = document.querySelector('.am-hero__lemons');
    const coast = document.querySelector('.am-hero__coast');
    const cr = card.getBoundingClientRect();

    // lift, turn over (the shadow narrows as the card stands on its edge), hold the painting a moment
    tl.to(card, { y: -12, scale: 1.025, duration: 0.42, ease: 'power2.out' }, 0.05)
      .to(shadow, { opacity: 0.75, scale: 1.05, duration: 0.42, ease: 'power2.out' }, 0.05)
      .fromTo(flip, { rotationY: 0, transformPerspective: 1700 }, { rotationY: 180, duration: 1.3, ease: 'power3.inOut' }, 0.4)
      .to(shadow, { scaleX: 0.12, duration: 0.65, ease: 'power2.in' }, 0.4)
      .to(shadow, { scaleX: 1.05, duration: 0.65, ease: 'power2.out' }, 1.05);

    const T0 = 2.15;
    if (target && target.classList.contains('am-hero__card')) {
      // wide screens: the postcard lands where the first screen keeps it
      const tr = target.getBoundingClientRect();
      const s = target.offsetWidth / card.offsetWidth;
      const dx = (tr.left + tr.width / 2) - (cr.left + cr.width / 2);
      const dy = (tr.top + tr.height / 2) - (cr.top + cr.height / 2);
      gsap.set(target, { opacity: 0 });
      tl.to(card, { x: dx, y: dy, scale: s, rotation: -2, duration: 1.05, ease: 'power3.inOut' }, T0)
        .to(shadow, { opacity: 0, duration: 0.5, ease: 'power1.out' }, T0)
        .set(target, { opacity: 1 }, T0 + 1.05)
        .set(card, { opacity: 0 }, T0 + 1.06);
    } else {
      // phones: the card dissolves into the coast at the foot of the page
      const toY = coast ? Math.min(coast.getBoundingClientRect().top - cr.top, window.innerHeight * 0.3) * 0.5 : 40;
      tl.to(card, { y: toY, scale: 1.08, duration: 1, ease: 'power2.inOut' }, T0)
        .to(card, { opacity: 0, duration: 0.45, ease: 'power1.in' }, T0 + 0.2)
        .to(shadow, { opacity: 0, duration: 0.4 }, T0);
      if (coast) {
        gsap.set(coast, { opacity: 0, y: 30 });
        tl.to(coast, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' }, T0 + 0.4);
      }
    }
    tl.to(gate.querySelector('.am-table'), { opacity: 0, duration: 0.8, ease: 'power1.inOut' }, T0 + 0.15);
    if (lemons) {
      gsap.set(lemons, { opacity: 0, y: -26 });
      tl.to(lemons, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }, T0 + 0.3);
    }
    return T0 + 0.7;
  },

  // ───────── the page ─────────
  page(ctx) {
    const { bi, esc, txt, on, parts: P, D, venue, city, names } = ctx;
    const place = [venue, city].filter(Boolean);
    const story = P.story;
    const sp = spanText(ctx);
    const head = (id, title, kicker = '', cls = '') => `<header class="am-head vw-rise ${cls}">${kicker ? `<p class="am-eyebrow">${kicker}</p>` : ''}<h2 class="am-h2" id="${id}">${bi(title)}</h2></header>`;
    const crown = (id, side) => `<div class="am-crown am-crown--${side}" aria-hidden="true">${artImg(ctx, id, 'am-crown__img', '(max-width: 699px) 40vw, 260px')}</div>`;

    const hero = `
    <section class="vw-hero am-hero" id="top" aria-label="${esc(ctx.namesText)}">
      <div class="am-hero__lemons" aria-hidden="true">${artImg(ctx, 'hero.lemons', 'am-hero__lemons-img', '(max-width: 899px) 100vw, 48vw', { eager: true })}</div>
      <div class="am-hero__words">
        ${ctx.emblem('am-emblem vw-in')}
        ${on(txt('hero.kicker')) ? `<p class="am-eyebrow vw-in">${bi(txt('hero.kicker'))}</p>` : ''}
        <h1 class="am-names vw-in">${names({ amp: '<em>&amp;</em>' })}</h1>
        ${on(txt('hero.line')) ? `<p class="am-hero__line vw-in">${bi(txt('hero.line'))}</p>` : ''}
        <p class="am-hero__date vw-in">${esc(sp ? `${sp} · ${D.year}` : `${D.month} ${D.day} · ${D.year}`)}</p>
        ${place.length ? `<p class="am-hero__place vw-in">${esc(place.join(', '))}</p>` : ''}
        ${P.cue(P.lead || story.length ? 'couple' : 'date')}
      </div>
      <div class="am-hero__card" data-settle aria-hidden="true">${painting(ctx)}</div>
      <div class="am-hero__coast" data-settle aria-hidden="true">${artImg(ctx, 'hero.coast', 'am-hero__coast-img', '100vw', { eager: true })}</div>
    </section>`;

    const couple = (P.lead || story.length) ? `
    <section class="am-sec am-couple" id="couple" aria-labelledby="couple-h">
      ${crown('crown.a', 'l')}
      <div class="am-couple__top${P.lead ? '' : ' am-couple__top--solo'}">
        ${P.lead ? `<figure class="am-snap vw-rise">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 899px) 86vw, 440px')}</figure>` : ''}
        ${head('couple-h', txt('couple.title'), on(txt('story.title')) && story.length ? esc(txt('story.title').en) : '', 'am-head--left')}
      </div>
      ${story.length ? `<ol class="am-route" id="story" style="--n:${story.length}">${story.map((s) => `
        <li class="am-route__stop vw-rise"><i class="am-route__dot" aria-hidden="true"></i><p class="am-route__year">${bi(s.year)}</p><p class="am-route__text">${bi(s.text)}</p></li>`).join('')}
      </ol>` : ''}
    </section>` : '';

    const dest = (city || venue || '').split(',')[0].trim();
    const date = `
    <section class="am-sec am-date" id="date" aria-labelledby="date-h">
      ${head('date-h', txt('count.title'))}
      <div class="am-board vw-rise">
        <dl class="am-board__head">
          ${dest ? `<div><dt>${bi(txt('board.to'))}</dt><dd>${esc(dest)}</dd></div>` : ''}
          <div><dt>${bi(txt('board.date'))}</dt><dd>${esc(`${D.day2} ${D.monthShort} ${D.year}`.toUpperCase())}</dd></div>
          ${D.time ? `<div><dt>${bi(txt('board.time'))}</dt><dd>${esc(D.time)}</dd></div>` : ''}
        </dl>
        ${P.countdown('am-count')}
      </div>
      <p class="am-date__when vw-rise">${esc(D.long)}${D.time ? ` · ${esc(`${D.time}${D.zone ? ` ${D.zone}` : ''}`)}` : ''}${place.length ? `<br />${esc(place.join(', '))}` : ''}</p>
      <div class="am-btns vw-rise">${P.calendarBtn()}${P.shareBtn()}</div>
    </section>`;

    // the itinerary: one boarding pass per day; each event of that day is a leg on the pass
    const days = [...new Set(P.events.map((ev) => ev.d.short))];
    const multiDay = days.length > 1;
    const dayWord = on(txt('prog.day')) ? esc(txt('prog.day').en) : '';
    const leg = (ev) => `
            <article class="am-leg" id="ev-${esc(ev.id)}">
              <h3 class="am-leg__title">${bi(ev.title)}</h3>
              <p class="sr-only">${esc(ev.d.long)}</p>
              <dl class="am-leg__grid">
                <div><dt>Time</dt><dd>${esc(ev.time)}</dd></div>
                <div><dt>${P.UI.place}</dt><dd>${bi(ev.venue)}<br />${P.mapLink(ev)}</dd></div>
                ${ev.dress ? `<div><dt>${P.UI.wear}</dt><dd>${P.swatches(ev)}${bi(ev.dress.text)}</dd></div>` : ''}
              </dl>
              ${ev.blurb ? `<p class="am-leg__blurb">${bi(ev.blurb)}</p>` : ''}
              ${P.orderList(ev)}
            </article>`;
    const programme = P.events.length ? `
    <section class="am-sec am-prog" id="programme" aria-labelledby="prog-h">
      ${head('prog-h', txt('prog.title'), esc(sp))}
      <ol class="am-tickets">${days.map((dk, i) => {
        const list = P.events.filter((ev) => ev.d.short === dk);
        const d = list[0].d;
        const dayLabel = multiDay && dayWord ? `${dayWord} ${i + 1}` : '';
        return `
        <li class="am-day vw-rise">
          <div class="am-ticket">
            <div class="am-ticket__stub" aria-hidden="true">
              ${dayLabel ? `<span class="am-ticket__no">${dayLabel}</span>` : ''}
              <span class="am-ticket__wd">${esc(d.wdShort)}</span><b>${esc(d.day2)}</b><span class="am-ticket__mo">${esc(d.monthShort)}</span>
            </div>
            <div class="am-ticket__main">${list.map(leg).join('')}</div>
          </div>
        </li>`;
      }).join('')}
      </ol>
    </section>` : '';

    const hosts = `
    <section class="am-sec am-hosts" id="card" aria-labelledby="hosts-h">
      <div class="am-hosts__in vw-rise">
        <div class="am-hosts__a">
          <p class="am-eyebrow" id="hosts-h">${bi(txt('families.title'))}</p>
          ${P.hosts ? `<p class="am-hosts__names">${bi(P.hosts)}</p>` : ''}
        </div>
        <div class="am-hosts__b">
          ${P.families.length ? `<ul class="am-hosts__fam">${P.families.map((f) => (on(f.person.parents) ? `<li>${bi(f.person.parents)}</li>` : '')).join('')}</ul>` : ''}
          ${P.cardBtn('vw-btn--line')}
        </div>
      </div>
    </section>`;

    const photos = P.photos.length ? `
    <section class="am-sec am-photos" id="photos" aria-labelledby="ph-h">
      ${head('ph-h', txt('gallery.title'))}
      <div class="am-strip" role="list">${P.photos.map((g, i) => {
        const r = P.ratio(g.photo) || 1.5;
        return `<figure class="am-strip__it" role="listitem" style="--r:${r.toFixed(4)}">${P.photoBtn(g, i, '(max-width: 699px) 86vw, 520px')}</figure>`;
      }).join('')}</div>
      ${P.photos.length > 1 ? `<p class="am-strip__count" aria-hidden="true"><b data-strip-i>1</b> / ${P.photos.length}</p>` : ''}
    </section>` : '';

    // travel: each line of the couple's travel note becomes a numbered step (first sentence = the step's title)
    const steps = P.travel ? ctx.pair(P.travel).en.split(/\n+/).map((s) => s.trim()).filter(Boolean).map((s) => {
      const m = s.match(/^(.{3,80}?[.!?])\s+(.+)$/);
      return m ? { t: m[1], b: m[2] } : { t: '', b: s };
    }) : [];
    const tel = (p) => String(p).replace(/[^\d+]/g, '');
    const info = (P.hasInfo || P.live) ? `
    <section class="am-sec am-info" id="info" aria-labelledby="info-h">
      ${crown('crown.b', 'r')}
      ${head('info-h', txt('info.title'), on(txt('info.kicker')) ? esc(txt('info.kicker').en) : '', 'am-head--left')}
      ${steps.length ? `<ol class="am-steps${steps.length === 1 ? ' am-steps--one' : ''}">${steps.map((s, i) => `
        <li class="am-step vw-rise"><span class="am-step__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>${s.t ? `<h3 class="am-step__t">${esc(s.t)}</h3>` : ''}<p class="am-step__b">${esc(s.b)}</p></li>`).join('')}
      </ol>` : ''}
      ${P.stays.length ? `<div class="am-stays">
        <h3 class="am-sub vw-rise">${P.UI.stays}</h3>
        <ul class="am-tags">${P.stays.map((st) => `
          <li class="am-tag vw-rise"><svg class="am-tag__string" viewBox="0 0 60 40" aria-hidden="true" focusable="false"><path d="M58 22C40 22 30 6 14 10S2 30 0 36" /></svg><span class="am-tag__hole" aria-hidden="true"></span>
            <div class="am-tag__body"><p class="am-tag__name">${bi(st.name)}</p>${on(st.note) ? `<p class="am-tag__note">${bi(st.note)}</p>` : ''}
            <a class="vw-link" href="${esc(mapHref(st, ctx))}" target="_blank" rel="noopener">${P.UI.map}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></div></li>`).join('')}
        </ul></div>` : ''}
      ${P.contacts.length ? `<div class="am-contacts vw-rise">
        <h3 class="am-sub">${P.UI.contacts}</h3>
        <ul>${P.contacts.map((pp) => `<li><p class="am-contacts__n">${bi(pp.name)}${on(pp.role) ? `<small>${bi(pp.role)}</small>` : ''}</p><span class="vw-links"><a class="vw-link" href="tel:${esc(tel(pp.phone))}">${P.UI.call}</a><a class="vw-link" href="sms:${esc(tel(pp.phone))}">${P.UI.text}</a></span></li>`).join('')}</ul>
      </div>` : ''}
      ${P.liveBlock('am-live vw-rise')}
    </section>` : '';

    // the verse (Christian couples; gone for everyone else): a quiet journal page before the reply
    const vtxt = ctx.verse('am-verse__fig');
    const verse = vtxt ? `<section class="am-sec am-verse" aria-label="Verse"><div class="am-verse__in vw-rise">${vtxt}</div></section>` : '';

    // the reply: a ticket with a tear-off stub
    const rsvp = `
    <section class="am-sec am-rsvp" id="rsvp" aria-labelledby="rsvp-title">
      <div class="am-reply vw-rise">
        <div class="am-reply__stub">
          <i class="am-reply__n am-reply__n--a" aria-hidden="true"></i><i class="am-reply__n am-reply__n--b" aria-hidden="true"></i>
          <div class="am-post am-post--reply" aria-hidden="true">${postmark(ctx, 'reply')}${stamp(ctx)}</div>
          <h2 class="am-reply__h" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
          ${P.deadline ? `<p class="am-reply__by">${bi(P.deadline)}</p>` : ''}
          ${on(txt('rsvp.note')) ? `<p class="am-note am-reply__note">${bi(txt('rsvp.note'))}</p>` : ''}
          <p class="am-reply__meta" aria-hidden="true">${esc(`${D.day2} ${D.monthShort} ${D.year}`.toUpperCase())}${dest ? ` · ${esc(dest.toUpperCase())}` : ''}</p>
        </div>
        <div class="am-reply__main">${P.rsvpForm()}</div>
      </div>
    </section>`;

    const close = `
    <footer class="am-close" aria-label="Closing">
      <div class="am-close__words">
        ${ctx.closing ? `<p class="am-close__line">${bi(ctx.closing)}</p>` : ''}
        <p class="am-close__names">${names({ amp: '<em>&amp;</em>' })}</p>
        ${ctx.hashtag ? `<p class="am-close__tag">${esc(ctx.hashtag)}</p>` : ''}
      </div>
      <div class="am-close__coast" aria-hidden="true">${artImg(ctx, 'hero.coast', 'am-close__img', '100vw')}</div>
      <div class="am-close__made">${P.madeWith()}</div>
    </footer>`;

    return hero + couple + date + programme + hosts + photos + info + verse + rsvp + close;
  },

  // a sent reply tears its stub off a little
  ready() {
    const status = document.getElementById('rsvp-status');
    const reply = document.querySelector('.am-reply');
    if (!status || !reply) return;
    new MutationObserver(() => {
      if (status.textContent.trim() && !status.classList.contains('is-error')) reply.classList.add('is-torn');
    }).observe(status, { childList: true, characterData: true, subtree: true, attributes: true });
  },

  // desktop only: the first screen comes apart in layers as you leave it, and each boarding pass tilts up off the
  // table as it arrives. Phones keep the engine's quiet fades; reduced motion keeps everything still.
  scroll(ctx) {
    stripCount();
    if (ctx.reduced) return;
    const { gsap } = ctx;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const hero = document.getElementById('top');
      const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.5 };
      const card = hero?.querySelector('.am-hero__card');
      const lemons = hero?.querySelector('.am-hero__lemons');
      const words = hero?.querySelector('.am-hero__words');
      if (card) gsap.fromTo(card, { y: 0, rotation: -2 }, { y: -170, rotation: -5, ease: 'none', scrollTrigger: st });
      if (lemons) gsap.fromTo(lemons, { y: 0 }, { y: -60, ease: 'none', scrollTrigger: { ...st } });
      if (words) gsap.fromTo(words, { y: 0 }, { y: -100, ease: 'none', scrollTrigger: { ...st } });
      document.querySelectorAll('.am-ticket').forEach((t) => {
        gsap.fromTo(t, { rotationX: 34, y: 60, transformOrigin: '50% 100%' }, {
          rotationX: 0, y: 0, ease: 'none',
          scrollTrigger: { trigger: t.parentElement, start: 'top 98%', end: 'top 58%', scrub: 0.6 },
        });
      });
    });
  },
};

// the phone photo strip's "2 / 6" follows the swipe
function stripCount() {
  const strip = document.querySelector('.am-strip');
  const out = document.querySelector('[data-strip-i]');
  if (!strip || !out) return;
  const items = [...strip.children];
  let raf = 0;
  strip.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const mid = strip.scrollLeft + strip.clientWidth / 2;
      let best = 0; let d = Infinity;
      items.forEach((el, i) => { const c = el.offsetLeft + el.offsetWidth / 2; if (Math.abs(c - mid) < d) { d = Math.abs(c - mid); best = i; } });
      out.textContent = String(best + 1);
    });
  }, { passive: true });
}

function mapHref(st, ctx) {
  const q = st.mapQuery || ctx.pair(st.name).en;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

mountVow(SPEC);
