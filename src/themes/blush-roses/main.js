// Blush Roses: a classic stationery suite on warm white paper. The signature moment: a thin gold frame draws itself
// from two corners while garden roses bloom into them, then the names arrive in script. Everything after is quiet:
// one long gold frame runs down the page and holds the suite's printed inserts (the invitation, the order of the
// weekend, the accommodations card, the reply card); its side rules keep drawing as you read down.
import './blush.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';
import { spelled } from '../_vow/kit.js';
import { mapUrl } from '../../core/i18n.js';

const DIAMOND = '<span class="br-orn" aria-hidden="true"><i></i><b></b><i></i></span>';

/** an art slot as a responsive <img> (transparent watercolor corner) */
const art = (ctx, id, cls, sizes) => {
  const ref = ctx.S.img(id);
  if (!ref) return '';
  const sm = ctx.esc(ctx.photoUrl(ref, 'sm')); const lg = ctx.esc(ctx.photoUrl(ref, 'lg'));
  return `<img class="${cls}" src="${sm}" srcset="${sm} ${ref.w ? Math.round(ref.w * 0.6) : 480}w, ${lg} ${ref.w || 800}w" sizes="${sizes}" alt="" decoding="async" />`;
};

/** hyphenated number words never break at the hyphen ("twenty-second") */
const keep = (html) => html.replace(/(\S+-\S+)/g, '<span class="nw">$1</span>');

/** "half past four" from the formal "at half past four in the afternoon" */
const clockWords = (t) => String(t || '').replace(/^at /, '').replace(/ in the (morning|afternoon|evening)$/, '');

const SPEC = {
  slug: 'blush-roses',
  manifest,
  demo: {
    bride: 'Sarah', brideLast: 'Mitchell', groom: 'Matthew', groomLast: 'Lane', date: '2027-05-22', time: '16:30', tz: 'America/Chicago',
    venue: 'Willow Creek Farm', city: 'Nashville, TN', mapQuery: 'Willow Creek Farm, Nashville, TN',
    dress: 'Garden formal', colors: ['#2F5640', '#F2D4C8', '#FBF8F4'], hashtag: '#SarahAndMatthew', deadline: 'Kindly reply by April 20, 2027',
    welcomeVenue: 'Husk Nashville', welcomeMap: 'Husk, Nashville, TN', brunchVenue: 'The Hermitage Hotel', brunchMap: 'The Hermitage Hotel, Nashville, TN',
    stays: [
      { name: { en: 'The Hermitage Hotel', ne: '' }, note: { en: 'Room block under Mitchell–Lane until April 20', ne: '' }, mapQuery: 'The Hermitage Hotel, Nashville, TN' },
      { name: { en: 'Union Station Hotel', ne: '' }, note: { en: 'Fifteen minutes from the farm', ne: '' }, mapQuery: 'Union Station Hotel, Nashville, TN' },
    ],
  },

  // ───────── the gate: a small monogram card on warm paper ─────────
  gate(ctx) {
    const { esc, initials, D } = ctx;
    return `<div class="br-gate" aria-hidden="true">
      <div class="br-gate__card">
        <span class="br-gate__mono">${initials.map(esc).join('<i>&amp;</i>')}</span>
        ${DIAMOND}
        <span class="br-gate__date">${esc([D.monthShort, D.day, D.year].filter(Boolean).join(' · '))}</span>
      </div>
    </div>`;
  },
  open(ctx, tl, gate) {
    const { gsap } = ctx;
    const ease = 'power2.inOut';
    gsap.set('.br-hero__l--t, .br-hero__l--b', { scaleX: 0 });
    gsap.set('.br-hero__l--l, .br-hero__l--r', { scaleY: 0 });
    gsap.set('.br-hero__rose', { opacity: 0, scale: 0.8 });
    tl.to('.br-gate__card', { opacity: 0, scale: 0.97, duration: 0.38, ease: 'power2.in' }, 0)
      .to(gate, { opacity: 0, duration: 0.42, ease: 'power1.out' }, 0.22)
      .set(gate, { visibility: 'hidden' }, 0.64)
      // the frame draws out of the two rose corners: top + left from the top-left, bottom + right from the bottom-right
      .to('.br-hero__l--t, .br-hero__l--b', { scaleX: 1, duration: 1.15, ease }, 0.4)
      .to('.br-hero__l--l, .br-hero__l--r', { scaleY: 1, duration: 1.15, ease }, 0.46)
      .to('.br-hero__rose--tl', { opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out' }, 0.5)
      .to('.br-hero__rose--br', { opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out' }, 0.64);
    return 1.05;
  },

  // ───────── the page ─────────
  page(ctx) {
    const { bi, esc, txt, on, parts: P, D, venue, city, names, isPair } = ctx;
    const place = [venue, city].filter(Boolean);
    const story = P.story;
    const label = (id, t) => `<h2 class="br-label" id="${id}">${bi(t)}</h2>`;
    const ampScript = '<em>&amp;</em>';

    const hero = `
    <section class="vw-hero br-hero" id="top" aria-label="${esc(ctx.namesText)}">
      <div class="br-hero__frame" aria-hidden="true">
        <i class="br-hero__l br-hero__l--t"></i><i class="br-hero__l br-hero__l--l"></i>
        <i class="br-hero__l br-hero__l--b"></i><i class="br-hero__l br-hero__l--r"></i>
      </div>
      <div class="br-hero__rose br-hero__rose--tl" aria-hidden="true">${art(ctx, 'hero.roses', 'br-hero__img', '(max-width: 699px) 64vw, 46vh')}</div>
      <div class="br-hero__rose br-hero__rose--br" aria-hidden="true">${art(ctx, 'hero.roses2', 'br-hero__img', '(max-width: 699px) 54vw, 38vh')}</div>
      <div class="br-hero__words">
        ${ctx.emblem('br-emblem vw-in')}
        ${on(txt('hero.kicker')) ? `<p class="br-kicker vw-in">${bi(txt('hero.kicker'))}</p>` : ''}
        <h1 class="br-names br-hero__names vw-in">${names({ amp: ampScript })}</h1>
        ${on(txt('hero.line')) ? `<p class="br-hero__line vw-in">${bi(txt('hero.line'))}</p>` : ''}
        <p class="br-hero__when vw-in"><span class="br-hero__rule" aria-hidden="true"></span>
          <b>${esc([D.wd, `${D.month} ${D.day}`, D.year].filter(Boolean).join(' · '))}</b>
          ${place.length ? `<span>${esc(place.join(', '))}</span>` : ''}</p>
      </div>
      ${P.cue('card')}
    </section>`;

    // the next event on the main day ("Cocktails, dinner and dancing to follow")
    const mainId = ctx.mainEv?.id;
    const iMain = P.events.findIndex((e) => e.id === mainId);
    const next = iMain >= 0 ? P.events[iMain + 1] : null;
    const follow = next && next.d.short === D.short && on(txt('invite.follow')) ? `${esc(next.title.en)} ${esc(txt('invite.follow').en)}` : '';
    const parents = P.families.map((f) => (on(f.person.parents) ? `<span>${bi(f.person.parents)}</span>` : '')).filter(Boolean);

    const invitation = `
    <section class="br-insert br-invite vw-rise" id="card" aria-labelledby="hosts-h">
      <div class="br-insert__rose br-insert__rose--tl" aria-hidden="true">${art(ctx, 'hero.roses', 'br-hero__img', '200px')}</div>
      <div class="br-paper">
        ${label('hosts-h', txt('families.title'))}
        ${P.hosts ? `<p class="br-invite__hosts">${bi(P.hosts)}</p>` : ''}
        ${parents.length ? `<p class="br-invite__parents">${parents.join('<i aria-hidden="true">·</i>')}</p>` : ''}
        ${on(txt('invite.request')) ? `<p class="br-invite__req">${bi(txt('invite.request'))}</p>` : ''}
        <p class="br-names br-invite__names">${names({ amp: ampScript })}</p>
        <p class="br-formal">${keep(esc(D.spelled.day))}<br />${keep(esc(D.spelled.year))}${D.time ? `<br />${keep(esc(D.spelled.time))}` : ''}</p>
        ${place.length ? `<p class="br-invite__place">${venue ? `<b>${esc(venue)}</b>` : ''}${city ? `<span>${esc(city)}</span>` : ''}</p>` : ''}
        ${follow ? `<p class="br-invite__follow">${follow}</p>` : ''}
        <div class="br-btns">${P.cardBtn('vw-btn--line')}</div>
      </div>
    </section>`;

    const couple = (P.lead || story.length) ? `
    <section class="br-sec br-couple" id="couple" aria-labelledby="couple-h">
      <header class="br-head vw-rise">${on(txt('story.title')) && story.length ? `<p class="br-kicker">${bi(txt('story.title'))}</p>` : ''}<h2 class="br-h2" id="couple-h">${bi(txt('couple.title'))}</h2>${DIAMOND}</header>
      ${P.lead ? `<figure class="br-portrait vw-rise"><div class="br-portrait__mat">${ctx.imgTag(P.lead.photo, P.lead.alt, '(max-width: 699px) 80vw, 420px')}</div></figure>` : ''}
      ${story.length ? `<ol class="br-story" id="story">${story.map((s) => `<li class="br-story__it vw-rise"><p class="br-story__year">${bi(s.year)}</p><p class="br-story__text">${bi(s.text)}</p></li>`).join('')}</ol>` : ''}
    </section>` : '';

    const date = `
    <section class="br-insert br-date vw-rise" id="date" aria-labelledby="date-h">
      <div class="br-paper br-paper--blush">
        <h2 class="br-label" id="date-h">${bi(txt('count.title'))}</h2>
        ${P.countdown('br-count')}
        <p class="br-date__when">${esc(D.long)}${D.time ? ` · ${esc(D.time)}` : ''}</p>
        <div class="br-btns">${P.calendarBtn()}${P.shareBtn()}</div>
      </div>
    </section>`;

    const programme = P.events.length ? `
    <section class="br-insert br-prog vw-rise" id="programme" aria-labelledby="prog-h">
      <div class="br-paper">
        <header class="br-head"><p class="br-kicker">${span(ctx)}</p><h2 class="br-h2" id="prog-h">${bi(txt('prog.title'))}</h2>${DIAMOND}</header>
        <ol class="br-events${P.events.length > 1 ? '' : ' br-events--one'}">${P.events.map((ev) => {
          const sp = spelled(ev.e.start);
          const when = `<span>${keep(esc(sp.day))}</span>${sp.time ? `<span class="br-ev__sep" aria-hidden="true"> · </span><span class="br-ev__clock">${keep(esc(clockWords(sp.time)))}</span>` : ''}`;
          return `
          <li class="br-ev" id="ev-${esc(ev.id)}">
            <h3 class="br-ev__title">${bi(ev.title)}</h3>
            <p class="br-ev__when">${when}</p>
            <p class="br-ev__time">${esc(ev.time)}</p>
            <p class="br-ev__venue">${bi(ev.venue)}<br />${P.mapLink(ev)}</p>
            ${ev.blurb ? `<p class="br-ev__blurb">${bi(ev.blurb)}</p>` : ''}
            ${ev.dress ? `<p class="br-ev__dress">${P.swatches(ev)}<span>${bi(ev.dress.text)}</span></p>` : ''}
            ${P.orderList(ev, 'vw-order br-order')}
          </li>`;
        }).join('')}
        </ol>
      </div>
    </section>` : '';

    const four = P.photos.slice(0, 4);
    const photos = four.length ? `
    <section class="br-sec br-photos" id="photos" aria-labelledby="ph-h">
      <header class="br-head vw-rise"><h2 class="br-h2" id="ph-h">${bi(txt('gallery.title'))}</h2>${DIAMOND}</header>
      <div class="br-grid br-grid--${four.length}">${four.map((g, i) => `<figure class="br-grid__it vw-rise">${P.photoBtn(g, i, '(max-width: 699px) 44vw, 380px')}</figure>`).join('')}</div>
    </section>` : '';

    const contacts = P.contacts;
    const info = (P.hasInfo || P.live) ? `
    <section class="br-insert br-info vw-rise" id="info" aria-labelledby="info-h">
      <div class="br-paper">
        <header class="br-head"><h2 class="br-h2" id="info-h">${bi(txt('info.title'))}</h2>${DIAMOND}</header>
        <div class="br-info__cols">
          ${P.travel ? `<div class="br-info__b"><h3 class="br-label">${P.UI.travel}</h3><p>${bi(P.travel)}</p></div>` : ''}
          ${P.stays.length ? `<div class="br-info__b"><h3 class="br-label">${P.UI.stays}</h3><ul>${P.stays.map((st) => `<li><b>${bi(st.name)}</b>${on(st.note) ? `<span>${bi(st.note)}</span>` : ''}<a class="vw-link" href="${esc(mapHref(st))}" target="_blank" rel="noopener">${P.UI.map}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></li>`).join('')}</ul></div>` : ''}
          ${contacts.length ? `<div class="br-info__b"><h3 class="br-label">${P.UI.contacts}</h3><ul>${contacts.map((pp) => `<li><b>${bi(pp.name)}</b>${on(pp.role) ? `<span>${bi(pp.role)}</span>` : ''}<span class="vw-links br-info__links"><a class="vw-link" href="tel:${esc(tel(pp.phone))}">${P.UI.call}</a><a class="vw-link" href="sms:${esc(tel(pp.phone))}">${P.UI.text}</a></span></li>`).join('')}</ul></div>` : ''}
        </div>
        ${P.liveBlock('br-live')}
      </div>
    </section>` : '';

    // the verse, printed on its own small enclosure card (absent when the faith marks are off)
    const verseCard = ctx.verse('br-verse__v') ? `
    <section class="br-insert br-verse vw-rise" aria-label="Verse">
      <div class="br-paper br-paper--blush">${ctx.verse('br-verse__v')}</div>
    </section>` : '';

    const rsvp = `
    <section class="br-insert br-reply vw-rise" id="rsvp" aria-labelledby="rsvp-title">
      <div class="br-insert__rose br-insert__rose--br" aria-hidden="true">${art(ctx, 'hero.roses2', 'br-hero__img', '180px')}</div>
      <div class="br-paper">
        <h2 class="br-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
        ${P.deadline ? `<p class="br-reply__by">${bi(P.deadline)}</p>` : ''}
        ${DIAMOND}
        ${P.rsvpForm()}
      </div>
    </section>`;

    const suite = `
    <div class="br-suite">
      <div class="br-suite__rails" aria-hidden="true"><i class="br-rail br-rail--l"></i><i class="br-rail br-rail--r"></i></div>
      ${invitation}${couple}${date}${programme}${photos}${info}${verseCard}${rsvp}
    </div>`;

    const close = `
    <footer class="br-close" aria-label="Closing">
      ${ctx.closing ? `<p class="br-close__line">${bi(ctx.closing)}</p>` : ''}
      <p class="br-names br-close__names">${names({ amp: ampScript })}</p>
      ${ctx.hashtag ? `<p class="br-close__tag">${esc(ctx.hashtag)}</p>` : ''}
      ${P.madeWith()}
    </footer>`;

    void isPair;
    return hero + suite + close;
  },

  // Desktop only (owner rule: no depth or parallax on phones): the printed inserts lift off the page in perspective as
  // they arrive, the rose corners drift on their own nearer layer, the long frame's gold rules draw down with the
  // reader. Every final state is the plain readable layout; phones keep the engine's quiet fades.
  scroll(ctx) {
    if (ctx.reduced) return;
    const { gsap } = ctx;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      document.body.classList.add('br-depth');
      gsap.fromTo('.br-rail', { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: '.br-suite', start: 'top 85%', end: 'bottom 85%', scrub: 0.6 },
      });
      // the hero's roses part on two layers as the first screen leaves
      const away = { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.br-hero__rose--tl', { yPercent: -14, ease: 'none', scrollTrigger: away });
      gsap.to('.br-hero__rose--br', { yPercent: 12, ease: 'none', scrollTrigger: { ...away } });
      // each insert (and the framed portrait, the prints) lifts off the page: tilted back and sunk, then flat and level
      gsap.utils.toArray('.br-insert > .br-paper, .br-portrait, .br-grid__it').forEach((el, i) => {
        gsap.fromTo(el, { rotateX: 14, z: -110, y: 60, transformPerspective: 1500, transformOrigin: '50% 100%' }, {
          rotateX: 0, z: 0, y: 0, ease: 'none',
          scrollTrigger: { trigger: el, start: `top ${102 - (i % 2) * 4}%`, end: 'top 52%', scrub: 0.5 },
        });
      });
      // the insert roses sit on a nearer layer than the card under them
      gsap.utils.toArray('.br-insert__rose').forEach((el) => {
        gsap.fromTo(el, { y: 70 }, { y: -50, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      return () => document.body.classList.remove('br-depth');
    });
  },
};

const tel = (p) => String(p).replace(/[^\d+]/g, '');
const mapHref = (st) => mapUrl(st.mapQuery || st.name?.en || '');

/** "May 21 – 23" over a weekend, else nothing */
function span(ctx) {
  const s = ctx.span;
  if (!s) return '';
  return ctx.esc(s.from.month === s.to.month ? `${s.from.month} ${s.from.day} – ${s.to.day}` : `${s.from.monthShort} ${s.from.day} – ${s.to.monthShort} ${s.to.day}`);
}

mountVow(SPEC);
