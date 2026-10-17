// Dhoka (ढोका) · "Ivory Press"
// A luxury printed invitation experienced on screen. The real Golden Door of Patan is
// printed as a plate on white paper; it opens in 3D with a temple bell, light spills out,
// the camera walks through into the courtyard, and the view settles back onto the page
// as the couple's first plate. After that: a calm editorial scroll with sticky photo
// stacks, a horizontal sequence of the rites, numbered ceremony plates and a reply card.
import '../../core/base.css';
import './dhoka.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadInvitation } from '../../core/data.js';
import { photos, photoUrl, view } from '../../photos.js';
import { bi, esc, dateOf, timeLabel, mapUrl, biNodes, neNum, bsDateOf, venueParts } from '../../core/i18n.js';
import { mountShell, ringBell, trackProgress } from '../../core/shell.js';
import { madeWith } from '../../core/madewith.js';
import { createSmooth, reducedMotion, isMobile } from '../../core/smooth.js';
import { guestEvents } from '../../core/finale.js';
import { initRsvp } from '../../core/rsvp.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { useSlots } from '../../core/slots.js';
import { openModal } from '../../core/modal.js';
import manifest from './slots.js';
import { createMix } from '../../core/mix.js';

gsap.registerPlugin(ScrollTrigger);

const DOOR = 'door';
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const NE_DAYS = ['आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const NE_MONTHS = ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'];
/** Weekday, day and month of an ISO date-time at the venue, both languages. */
const dayParts = (iso) => {
  const { wd, day: d, m, y } = venueParts(iso);
  return { wd: { en: EN_DAYS[wd], ne: NE_DAYS[wd] }, d: { en: String(d), ne: neNum(d) }, my: { en: `${EN_MONTHS[m]} ${y}`, ne: `${NE_MONTHS[m]} ${neNum(y)}` } };
};
const NE_ORD = ['पहिलो', 'दोस्रो', 'तेस्रो', 'चौथो', 'पाँचौँ', 'छैटौँ', 'सातौँ', 'आठौँ'];

// ───────────────────────── Photo helpers ─────────────────────────
const keyOf = (ref) => (typeof ref === 'string' && !ref.startsWith('/') && !ref.startsWith('http') ? ref : null);
const focalOf = (ref) => (keyOf(ref) && photos[keyOf(ref)]?.focal) || (typeof ref === 'object' && ref?.focal) || [0.5, 0.5];
const pos = (ref) => { const [x, y] = focalOf(ref); return `${Math.round(x * 100)}% ${Math.round(y * 100)}%`; };
const refId = (ref) => (typeof ref === 'object' ? ref?.lg || ref?.sm : ref) || '';
/** <img> for a photo reference. `fit` keeps the photo's own proportions (never cropped). */
const pic = (ref, { alt = '', sizes = '50vw', cls = '', eager = false, lazy = !eager } = {}) => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  const set = sm && lg && sm !== lg ? ` srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w" sizes="${esc(sizes)}"` : '';
  return `<img class="${cls}" src="${esc(sm || lg)}"${set} alt="${esc(alt)}" style="object-position:${pos(ref)}" ${eager ? 'fetchpriority="high"' : ''} ${lazy ? 'loading="lazy"' : ''} decoding="async" />`;
};
const folio = (n, label) => `<p class="dh-folio"><span class="dh-folio__no">${bi({ en: `No. ${ROMAN[n - 1]}`, ne: `अङ्क ${neNum(n)}` })}</span><span class="dh-folio__rule" aria-hidden="true"></span><span class="dh-folio__label">${bi(label)}</span></p>`;

// The rites: the marriage itself, set as a horizontal sequence of plates (all slots).
const RITES = ['swayambar', 'kanyadan', 'sindoor', 'saptapadi'];

async function start() {
  const config = await loadInvitation();
  if (DEBUG) {
    // Studio preview in the browser: __dhokaSetContent({ images: {...}, texts: {...} }) reloads with overrides.
    window.__dhokaSetContent = (o) => { try { o ? sessionStorage.setItem('dhoka:themeContent', JSON.stringify(o)) : sessionStorage.removeItem('dhoka:themeContent'); } catch { /* ignore */ } location.reload(); };
    try {
      const o = JSON.parse(sessionStorage.getItem('dhoka:themeContent') || 'null');
      if (o) config.themeContent = { ...(config.themeContent || {}), dhoka: o };
    } catch { /* ignore */ }
  }
  // another theme's gate and/or first screen on this page (docs/MIX.md); without config.design nothing changes
  const mix = await createMix({ host: 'dhoka', manifest, config });
  const { img, txt, alt } = useSlots(manifest);
  const T = (id) => bi(txt(id));
  const c = config.couple;
  const reduced = reducedMotion();
  const mobile = isMobile();

  // ── Who appears where. Couple first; never show the same photo twice. ──
  const shown = new Set();
  const take = (ref) => { if (ref) shown.add(refId(ref)); return ref; };
  const portraits = (c.portraits || []).filter((p) => p?.photo);
  const portraitAlt = (ref, id) => portraits.find((p) => refId(p.photo) === refId(ref))?.alt || alt(id);
  const heroRef = img('hero.photo');
  const hero = heroRef ? { photo: take(heroRef), alt: portraitAlt(heroRef, 'hero.photo') } : null;
  // Rites are reserved before the stack so a couple photo used there is not repeated.
  const rites = RITES.map((k) => {
    const id = `rites.${k}.photo`;
    const photo = img(id);
    return photo && !shown.has(refId(photo)) ? { photo: take(photo), alt: portraitAlt(photo, id), t: txt(`rites.${k}.title`), l: txt(`rites.${k}.line`) } : null;
  }).filter(Boolean);
  const events = guestEvents();
  const eventPhotos = new Set(events.map((e) => refId(e.photo)));
  // The ceremonies show their own photos; the stack keeps to photos seen nowhere else.
  const unseen = portraits.filter((p) => !shown.has(refId(p.photo)));
  let rest = unseen.filter((p) => !eventPhotos.has(refId(p.photo)));
  if (rest.length < 3) rest = unseen;
  const stack = rest.map((p) => ({ photo: take(p.photo), alt: p.alt || '' }));
  // Bride and groom portraits join the stack only when they really exist (own upload or a studio override).
  const own = config.themeContent?.dhoka?.images || {};
  for (const [id, who] of [['couple.bride', c.bride], ['couple.groom', c.groom]]) {
    const ref = (own[id] || who.photo) ? img(id) : null;
    if (ref && !shown.has(refId(ref))) stack.push({ photo: take(ref), alt: who.name.en, who: who.name });
  }
  // Marigolds stay a small accent: library marigold close-ups are left out of the album.
  events.forEach((e) => take(e.photo));
  // Couple photos lead; library details follow without captions.
  const rank = (g) => { const k = keyOf(g.photo); return !k ? 0 : /^(couple|bride|groom|wedding-knot)/.test(k) ? 1 : /^(wedding-nepali|mehendi)/.test(k) ? 3 : 2; };
  const gallery = (config.gallery || []).filter((g) => g.photo && !shown.has(refId(g.photo)) && !(keyOf(g.photo) || '').startsWith('marigold'))
    .map((g, i) => ({ g, i })).sort((a, b) => rank(a.g) - rank(b.g) || a.i - b.i).map((x) => x.g);

  // ───────────────────────── Markup ─────────────────────────
  const doorRef = img('gate.door');
  const courtRef = img('gate.courtyard');
  const doorRect = (keyOf(doorRef) && photos[keyOf(doorRef)]?.door) || (typeof doorRef === 'object' && doorRef?.door) || null;
  const names = `${bi(c.bride.name)} <span class="amp">&amp;</span> ${bi(c.groom.name)}`;
  const date = dateOf(config.weddingDate);
  // English reads "daughter of <parents>", Nepali "<parents>की सुपुत्री".
  const rel = (parents, r) => bi({ en: `${r.en} ${parents.en}`, ne: `${parents.ne ?? parents.en} ${r.ne}` });

  // Another theme's gate (or Dhoka's own gate as a module, before another first screen) replaces the door plate.
  const gateEl = document.getElementById('gate');
  if (mix.gate) gateEl.remove();
  else gateEl.innerHTML = `
    <div class="dh-gate__side dh-gate__side--l">
      <p class="dh-gate__ganesh">${T('gate.invocation')}</p>
      <p class="dh-gate__guest" id="gate-guest" hidden></p>
      <p class="dh-gate__names">${bi(c.bride.name)}<span class="amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span>${bi(c.groom.name)}</p>
      <p class="dh-gate__line">${T('gate.line')}</p>
    </div>
    <figure class="dh-gate__plate">
      <img id="door-img" src="${esc(photoUrl(doorRef, 'sm'))}" alt="${esc(alt('gate.door'))}" fetchpriority="high" />
      <figcaption>${T('gate.caption')}</figcaption>
    </figure>
    <div class="dh-gate__side dh-gate__side--r">
      <p class="dh-gate__date">${bi(date)}<small>${bi(config.city)}</small></p>
      <div class="dh-gate__act">
        <div class="loading-bar" aria-hidden="true"><i id="load-bar"></i></div>
        <button type="button" class="btn dh-btn" id="enter-music" disabled>${T('gate.open')}</button>
        <button type="button" class="gate__quiet" id="enter-quiet" disabled>${T('gate.quiet')}</button>
      </div>
    </div>`;
  const to = params.get('to');
  if (to && !mix.gate) {
    const el = document.getElementById('gate-guest');
    el.replaceChildren(...biNodes(`For ${to.slice(0, 60)}`, `आदरणीय ${to.slice(0, 60)}`));
    el.hidden = false;
  }

  const main = document.getElementById('main');
  main.innerHTML = `
  <section class="dh-hero" id="hero" aria-labelledby="hero-names">
    <div class="dh-hero__text">
      ${folio(1, txt('hero.kicker'))}
      <h1 class="dh-hero__names" id="hero-names">
        <span class="dh-hero__one">${bi(c.bride.name)}</span>
        <span class="dh-hero__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span>
        <span class="dh-hero__two">${bi(c.groom.name)}</span>
      </h1>
      <p class="dh-hero__date">${bi(date)}<small>${bi(config.weddingDateBS)} · ${bi(config.city)}</small></p>
    </div>
    ${hero ? `<figure class="dh-hero__plate"><div class="dh-hero__frame" id="hero-frame">${pic(hero.photo, { alt: hero.alt, sizes: '(max-width: 760px) 92vw, 50vw', cls: 'dh-hero__img', eager: true })}</div></figure>` : ''}
  </section>

  ${stack.length ? `
  <section class="dh-stack" id="couple" aria-labelledby="couple-title" style="--n:${stack.length}">
    <div class="dh-stack__pin">
      <div class="dh-stack__text">
        ${folio(2, txt('couple.kicker'))}
        <h2 class="dh-h2" id="couple-title">${T('couple.title')}</h2>
        <dl class="dh-families">
          <div><dt>${bi(c.bride.fullName)}</dt><dd>${rel(c.bride.parents, txt('couple.daughterOf'))}</dd></div>
          <div><dt>${bi(c.groom.fullName)}</dt><dd>${rel(c.groom.parents, txt('couple.sonOf'))}</dd></div>
        </dl>
      </div>
      <div class="dh-stack__plates">
        ${stack.map((s, i) => `
          <figure class="dh-stack__plate" style="--i:${i}">
            ${pic(s.photo, { alt: s.alt, sizes: '(max-width: 760px) 90vw, 46vw' })}
            <figcaption><span>${ROMAN[1]}.${i + 1}</span>${s.who ? bi(s.who) : ''}</figcaption>
          </figure>`).join('')}
      </div>
    </div>
  </section>` : ''}

  ${rites.length ? `
  <section class="dh-rites" id="rites" aria-labelledby="rites-title" style="--n:${rites.length}">
    <div class="dh-rites__pin">
      <div class="dh-rites__track">
        <div class="dh-rites__intro">
          ${folio(3, txt('rites.kicker'))}
          <h2 class="dh-h2" id="rites-title">${T('rites.title')}</h2>
        </div>
        ${rites.map((r, i) => `
          <figure class="dh-rite">
            <div class="dh-rite__frame">${pic(r.photo, { alt: r.alt, sizes: '(max-width: 760px) 84vw, 44vw', lazy: false })}</div>
            <figcaption>
              <span class="dh-rite__n" aria-hidden="true">${['i', 'ii', 'iii', 'iv', 'v', 'vi'][i]}</span>
              <span class="dh-rite__t"><b lang="ne">${esc(r.t.ne)}</b><span class="l-en">${esc(r.t.en)}</span></span>
              <span class="dh-rite__l">${bi(r.l)}</span>
            </figcaption>
          </figure>`).join('')}
      </div>
    </div>
  </section>` : ''}

  <section class="dh-cardsec" id="card" aria-labelledby="card-title">
    ${folio(4, txt('card.kicker'))}
    <div class="dh-cover" aria-hidden="true">
      <p class="dh-cover__ganesh" lang="ne">${esc(txt('gate.invocation').ne)}</p>
      <p class="dh-cover__title" lang="ne">${esc(txt('card.heading').ne)}</p>
      <p class="dh-cover__names">${names}</p>
    </div>
    <h2 class="sr-only" id="card-title">${T('card.kicker')}</h2>
    <button type="button" class="btn dh-btn" id="open-card" aria-haspopup="dialog">${T('card.button')}</button>
  </section>

  <section class="dh-days" id="events" aria-labelledby="events-title">
    <header class="dh-days__head">
      ${folio(5, txt('events.kicker'))}
      <h2 class="dh-h2" id="events-title">${T('events.title')}</h2>
    </header>
    <ol class="dh-prog">
    ${events.map((e, i) => {
      const p = dayParts(e.start);
      // B.S. date from the shared converter; an event's own dateBS (the family's patro) wins.
      const bsd = bsDateOf(e.start, e.dateBS);
      const bs = e.dateBS ? bsd : { en: `${bsd.short.en} B.S.`, ne: `वि.सं. ${bsd.short.ne}` };
      const colors = (e.dress?.colors || []).slice(0, 4).map((col) => `<i style="background:${esc(col)}"></i>`).join('');
      return `
      <li class="dh-prog__row" aria-labelledby="ev-${esc(e.id)}">
        <p class="dh-prog__date">
          <span class="dh-prog__wd">${bi(p.wd)}</span>
          <span class="dh-prog__d">${bi(p.d)}</span>
          <span class="dh-prog__m">${bi(p.my)}</span>
          ${bs ? `<span class="dh-prog__bs">${bi(bs)}</span>` : ''}
        </p>
        <div class="dh-prog__main">
          <p class="dh-prog__k">${bi({ en: `${txt('events.label').en} ${ROMAN[i]}`, ne: `${NE_ORD[i] || neNum(i + 1)} ${txt('events.label').ne}` })}</p>
          <h3 class="dh-prog__t" id="ev-${esc(e.id)}">${bi(e.title)}</h3>
          <dl class="dh-prog__dl">
            <div><dt>${bi({ en: 'Time', ne: 'समय' })}</dt><dd>${bi(timeLabel(e))}</dd></div>
            <div><dt>${bi({ en: 'Venue', ne: 'स्थान' })}</dt><dd>${bi(e.venue)}<a class="dh-map" href="${esc(mapUrl(e.mapQuery))}" target="_blank" rel="noopener">${bi({ en: 'Map', ne: 'नक्सा' })}<span aria-hidden="true"> ↗</span></a></dd></div>
            ${e.dress?.text ? `<div><dt>${bi({ en: 'Dress', ne: 'पहिरन' })}</dt><dd>${colors ? `<span class="dh-prog__dress" aria-hidden="true">${colors}</span>` : ''}${bi(e.dress.text)}</dd></div>` : ''}
          </dl>
        </div>
        ${e.photo ? `<figure class="dh-prog__photo">${pic(e.photo, { sizes: '(max-width: 1100px) 40vw, 26vw' })}</figure>` : ''}
      </li>`;
    }).join('')}
    </ol>
  </section>

  ${gallery.length ? `
  <section class="dh-album" id="gallery" aria-labelledby="gallery-title">
    <header class="dh-album__head">
      ${folio(6, txt('album.kicker'))}
      <h2 class="dh-h2" id="gallery-title">${T('album.title')}</h2>
    </header>
    <div class="dh-album__cols">
      ${[0, 1, 2].map((col) => `<ul class="dh-album__col" data-col="${col}">${gallery.map((g, i) => (i % 3 === col ? `
        <li><button type="button" class="dh-album__btn" data-idx="${i}" aria-label="${esc(g.alt || 'Open photo')}">
          ${pic(g.photo, { alt: g.alt || '', sizes: '(max-width: 760px) 46vw, 30vw' })}
          ${g.caption && !keyOf(g.photo) ? `<span class="dh-album__cap"><span class="dh-album__fig">${i + 1}</span>${bi(g.caption)}</span>` : ''}
        </button></li>` : '')).join('')}</ul>`).join('')}
    </div>
  </section>` : ''}

  <section class="dh-reply" id="rsvp" aria-labelledby="rsvp-title">
    ${folio(7, txt('reply.kicker'))}
    <div class="dh-reply__card">
      <p class="dh-reply__mark" aria-hidden="true">${T('reply.mark')}</p>
      <h2 class="dh-reply__title" id="rsvp-title">${T('reply.title')}</h2>
      <p class="dh-reply__by">${bi(config.rsvp.deadline)}</p>
      <form class="rsvp" id="rsvp-form" novalidate>
        <div class="field">
          <label for="f-name">${bi({ en: 'Your name', ne: 'नाम' })}</label>
          <input id="f-name" name="name" type="text" autocomplete="name" required maxlength="80" />
          <p class="field__err" id="f-name-err" role="alert"></p>
        </div>
        <div class="field">
          <label for="f-phone">${bi({ en: 'Phone (optional)', ne: 'फोन (ऐच्छिक)' })}</label>
          <input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" />
        </div>
        <fieldset class="field field--choice">
          <legend>${bi({ en: 'Will you attend?', ne: 'उपस्थिति' })}</legend>
          <div class="choice-grid">
            <label class="choice"><input type="radio" name="attending" value="yes" checked /><span>${T('reply.yes')}</span></label>
            <label class="choice"><input type="radio" name="attending" value="no" /><span>${T('reply.no')}</span></label>
          </div>
        </fieldset>
        <div class="rsvp__when-yes">
          <div class="field">
            <label for="f-guests">${bi({ en: 'Guests, including you', ne: 'पाहुना संख्या' })}</label>
            <select id="f-guests" name="guests"></select>
          </div>
          <fieldset class="field field--choice">
            <legend>${bi({ en: 'Which ceremonies?', ne: 'कुन कार्यक्रम?' })}</legend>
            <div id="f-events" class="choice-grid"></div>
          </fieldset>
          <fieldset class="field field--choice">
            <legend>${bi({ en: 'Meal', ne: 'खाना' })}</legend>
            <div class="choice-grid">
              <label class="choice"><input type="radio" name="meal" value="veg" /><span>${bi({ en: 'Vegetarian', ne: 'शाकाहारी' })}</span></label>
              <label class="choice"><input type="radio" name="meal" value="nonveg" checked /><span>${bi({ en: 'Non-vegetarian', ne: 'मांसाहारी' })}</span></label>
            </div>
          </fieldset>
        </div>
        <div class="field">
          <label for="f-msg">${bi({ en: 'A blessing (optional)', ne: 'शुभकामना (ऐच्छिक)' })}</label>
          <textarea id="f-msg" name="message" rows="2" maxlength="500"></textarea>
        </div>
        <div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>
        <button class="btn dh-btn" type="submit" id="rsvp-submit">${T('reply.send')}</button>
        <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
      </form>
    </div>
    <div class="dh-reply__aside">
      <p class="dh-reply__count" id="countdown"></p>
      <div class="dh-reply__actions">
        <button class="dh-link" type="button" id="add-calendar">${bi({ en: 'Add to calendar', ne: 'क्यालेन्डरमा थप्नुहोस्' })}</button>
        <button class="dh-link" type="button" id="share">${bi({ en: 'Share', ne: 'पठाउनुहोस्' })}</button>
      </div>
      ${(config.info?.contacts || []).length ? `<ul class="dh-reply__contacts">${config.info.contacts.map((p) => {
        const tel = String(p.phone || '').replace(/[^\d+]/g, '');
        return `<li><b>${bi(p.name)}</b> <small>${bi(p.role)}</small> <a href="tel:${esc(tel)}">${bi({ en: 'Call', ne: 'फोन' })}</a></li>`;
      }).join('')}</ul>` : ''}
    </div>
  </section>

  <footer class="dh-colophon">
    <p class="dh-colophon__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
    <p class="dh-colophon__en">${esc(config.closing?.en || '')}</p>
    <p class="dh-colophon__names">${names}</p>
    ${c.hashtag ? `<p class="dh-colophon__tag">${esc(c.hashtag)}</p>` : ''}
    ${madeWith()}
  </footer>

  <dialog class="dh-sheet" id="card-dialog" aria-labelledby="card-dialog-title">
    <article class="dh-print">
      <form method="dialog"><button class="dh-sheet__close" type="submit"><span aria-hidden="true">×</span><span class="sr-only">Close the card</span></button></form>
      <header class="dh-print__head">
        <p class="dh-print__ganesh" lang="ne">${esc(txt('gate.invocation').ne)}</p>
        <p class="dh-print__shloka" lang="sa">${esc(config.invitation.shloka.sa)}</p>
        <h2 class="dh-print__title" id="card-dialog-title"><span lang="ne">${esc(txt('card.heading').ne)}</span><em>${esc(txt('card.heading').en)}</em></h2>
      </header>
      <div class="dh-print__cols">
        <div class="dh-print__col" lang="ne">
          <p class="dh-print__salute">${esc(config.invitation.salutation.ne)}</p>
          <p>${esc(config.invitation.body.ne)}</p>
          <p class="dh-print__when">${esc(config.weddingDateBS.ne)}</p>
          <p>${esc(config.invitation.request.ne)}</p>
          <p class="dh-print__sign">${esc(config.invitation.signoff.ne)}<b>${esc(config.hosts.ne)}</b></p>
        </div>
        <div class="dh-print__rule" aria-hidden="true"></div>
        <div class="dh-print__col" lang="en">
          <p class="dh-print__salute">${esc(config.invitation.salutation.en)}</p>
          <p>${esc(config.invitation.body.en)}</p>
          <p class="dh-print__when">${esc(date.en)}</p>
          <p>${esc(config.invitation.request.en)}</p>
          <p class="dh-print__sign">${esc(config.invitation.signoff.en)}<b>${esc(config.hosts.en)}</b></p>
        </div>
      </div>
    </article>
  </dialog>

  <dialog class="dh-lightbox" id="lightbox" aria-label="Photo">
    <form method="dialog"><button class="dh-lightbox__close" type="submit"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button></form>
    <button type="button" class="dh-lightbox__nav" data-lb="-1"><span aria-hidden="true">‹</span><span class="sr-only">Previous</span></button>
    <figure><figcaption></figcaption></figure>
    <button type="button" class="dh-lightbox__nav" data-lb="1"><span aria-hidden="true">›</span><span class="sr-only">Next</span></button>
  </dialog>`;

  if (mix.hero) mix.mountHero(document.getElementById('hero'));

  // Running head: names left, current folio right.
  const head = document.createElement('div');
  head.className = 'dh-runhead';
  head.setAttribute('aria-hidden', 'true');
  head.innerHTML = `<span class="dh-runhead__names">${names}</span><span class="dh-runhead__no" id="runhead-no"></span>`;
  document.body.append(head);

  const { player } = mountShell();
  initRsvp(events);
  initCard();
  initLightbox(gallery);
  initCountdown(config.weddingDate, txt('reply.daysToGo'));
  document.getElementById('add-calendar').addEventListener('click', () => downloadIcs(events));
  document.getElementById('share').addEventListener('click', (e) => share(e.currentTarget));
  document.querySelectorAll('img').forEach((im) => { if (!im.closest('.mx-part')) fitOnLoad(im); });

  // ───────────────────────── Intro: the door ─────────────────────────
  const lenis = createSmooth();
  lenis?.stop();
  const doorImg = document.getElementById('door-img');
  const plateRect = () => doorImg.getBoundingClientRect();
  let stage = null;
  let door = null;
  let COURT = null;
  let intro = null;

  async function boot() {
    if (mix.gate) return bootMix();
    if (reduced || params.has('static') || !doorRect || !courtRef) return bootStatic();
    try {
      const [{ PhotoStage }, { PlateDoor }] = await Promise.all([import('../../core/stage.js'), import('./door.js')]);
      stage = new PhotoStage(document.getElementById('stage'), {
        mobile, grade: { clear: '#FFFFFF', vignette: 0, lift: 0, tint: [1, 1, 1], grain: 0 },
      });
      const court = stage.add(view(courtRef, { sway: 1 }));
      COURT = court.id;
      door = new PlateDoor({ id: DOOR, src: photoUrl(doorRef, mobile ? 'sm' : 'lg'), rect: doorRect, behind: COURT, plate: plateRect, paper: '#FFFFFF' });
      stage.views.set(DOOR, door);
      stage.set({ a: DOOR, pa: 0 });
      governGpu(stage, door);
      const heroImg = document.querySelector('.dh-hero__img');
      await trackProgress([door.load(), stage.views.get(COURT).load(mobile), heroImg ? imgReady(heroImg) : Promise.resolve()], document.getElementById('load-bar'));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      document.body.classList.add('is-gl');
    } catch (err) {
      console.warn('WebGL unavailable, using the printed version.', err);
      return bootStatic();
    }
    if (DEBUG) {
      window.__dhoka = {
        stage, door,
        setDoor: (p) => { stage.set({ a: DOOR, pa: 0 }); door.progress = p; document.body.classList.toggle('is-opening', p > 0); },
        setCourt: (p) => stage.set({ a: COURT, pa: p }),
        settle: (t) => { document.body.classList.remove('is-gated'); document.body.classList.add('is-intro'); setLens(t); },
        finish: () => intro ? intro.progress(1) : openDoor(false, true),
      };
    }
    if (DEBUG && params.has('skip')) return openDoor(false, true);
    enableGate(openDoor);
  }

  // Smooth on any device: cap the pixel ratio (1.25 phones, 1.5 desktop), step it
  // down while frames keep taking over ~20ms, and stop drawing when the tab is
  // hidden or the canvas is not on screen.
  function governGpu(st, dr) {
    const maxPR = Math.min(window.devicePixelRatio || 1, mobile ? 2 : 1.75);
    const minPR = Math.min(maxPR, mobile ? 0.6 : 0.75);
    const setPR = (pr) => {
      const next = Math.max(minPR, Math.min(maxPR, Math.round(pr * 100) / 100));
      if (Math.abs(next - st.renderer.getPixelRatio()) < 0.01) return;
      st.renderer.setPixelRatio(next);
      st.resize();
      if (dr.dust) dr.dust.material.uniforms.uPR.value = next;
    };
    st.renderer.setPixelRatio(maxPR);
    st.resize();
    dr.load().then(() => { if (dr.dust) dr.dust.material.uniforms.uPR.value = st.renderer.getPixelRatio(); }).catch(() => {});
    let onScreen = true, wanted = true;
    const sync = () => { st.active = wanted && onScreen && !document.hidden; };
    const setActive = st.setActive.bind(st);
    st.setActive = (on) => { wanted = on; sync(); setActive(st.active); };
    if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; sync(); }).observe(st.renderer.domElement);
    document.addEventListener('visibilitychange', sync);
    let last = 0, ema = 16, slow = 0, fast = 0;
    const watch = (now) => {
      if (!wanted) return; // stage retired after the intro
      requestAnimationFrame(watch);
      if (!st.active) { last = 0; return; }
      if (last) {
        ema += (Math.min(100, now - last) - ema) * 0.1;
        slow = ema > 20 ? slow + 1 : 0;
        fast = ema < 12 ? fast + 1 : 0;
        if (slow > 40) { slow = 0; setPR(st.renderer.getPixelRatio() - 0.2); }
        else if (fast > 240) { fast = 0; setPR(st.renderer.getPixelRatio() + 0.1); }
      }
      last = now;
    };
    requestAnimationFrame(watch);
  }

  function enableGate(onOpen) {
    const b1 = document.getElementById('enter-music');
    const b2 = document.getElementById('enter-quiet');
    b1.disabled = b2.disabled = false;
    document.body.classList.add('is-ready');
    b1.focus({ preventScroll: true });
    b1.addEventListener('click', () => onOpen(true), { once: true });
    b2.addEventListener('click', () => onOpen(false), { once: true });
  }

  // The lens: the full-screen canvas clipped (by inverse scale, transforms only) down to the hero plate.
  const lens = document.getElementById('lens');
  const canvas = document.getElementById('stage');
  let lensTarget = null;
  function setLens(t) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    lensTarget ||= document.getElementById('hero-frame')?.getBoundingClientRect() || { left: vw * 0.1, top: vh * 0.1, width: vw * 0.8, height: vh * 0.8 };
    const r = lensTarget;
    const x = r.left * t;
    const y = r.top * t;
    const sx = 1 + (r.width / vw - 1) * t;
    const sy = 1 + (r.height / vh - 1) * t;
    const s = Math.max(sx, sy);
    const ox = (vw * sx - vw * s) / 2;
    const oy = (vh * sy - vh * s) / 2;
    lens.style.transform = `translate(${x}px, ${y}px) scale(${sx}, ${sy})`;
    canvas.style.transform = `translate(${ox / sx}px, ${oy / sy}px) scale(${s / sx}, ${s / sy})`;
  }

  function openDoor(withMusic, instant = false) {
    player.unlock();
    if (!instant) ringBell(player.ctx, { when: 0.05, gain: 0.28 });
    if (withMusic) setTimeout(() => player.start(true), 1500);
    document.body.classList.add('is-opening');
    const court = { p: 0.12 };
    const settle = { t: 0 };
    const tl = (intro = gsap.timeline({ onComplete: finish }));
    tl.to('.dh-gate__side, .dh-gate__plate figcaption', { autoAlpha: 0, duration: 0.5, ease: 'power2.out' }, 0)
      .to(door, { progress: 0.45, duration: 2.3, ease: 'power1.inOut' }, 0.25)
      .to(door, { progress: 1, duration: 2.0, ease: 'power2.in' }, 2.25)
      .call(() => stage.set({ a: COURT, pa: 0.12 }), null, 4.26)
      .to(court, { p: 0.3, duration: 2.6, ease: 'sine.out', onUpdate: () => stage.set({ a: COURT, pa: court.p }) }, 4.26)
      .call(showPage, null, 4.9)
      .to(settle, { t: 1, duration: 1.5, ease: 'expo.inOut', onUpdate: () => setLens(settle.t) }, 4.95)
      .to(canvas, { autoAlpha: 0, duration: 0.7, ease: 'power1.inOut' }, 5.95)
      .fromTo('.dh-hero__text > *', { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09, ease: 'expo.out' }, 5.6);
    if (instant) tl.progress(1);
    else {
      // Impatient guests: any scroll or key fast-forwards the walk.
      const hurry = () => tl.timeScale(3.2);
      ['wheel', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, hurry, { once: true, passive: true }));
    }
  }

  function showPage() {
    window.scrollTo(0, 0);
    gateEl.hidden = true;
    document.body.classList.remove('is-gated');
    document.body.classList.add('is-intro');
  }

  function finish() {
    if (document.body.classList.contains('is-gated')) showPage();
    document.body.classList.remove('is-intro', 'is-opening');
    document.body.classList.add('is-in');
    lens.hidden = true;
    if (stage) {
      // The page is paper from here on: free the GPU for smooth scrolling on phones.
      stage.setActive(false);
      cancelAnimationFrame(stage.raf);
      window.removeEventListener('resize', stage.resize);
      if (!DEBUG) { stage.renderer.dispose(); stage.renderer.forceContextLoss?.(); }
    }
    lenis?.start();
    buildScroll();
    document.dispatchEvent(new CustomEvent('dhoka:ready'));
  }

  function bootStatic() {
    document.body.classList.add('is-static', 'is-ready');
    const go = (m) => {
      player.unlock();
      if (m) player.start(true);
      finish();
      gsap.fromTo('#main', { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced ? 0 : 0.5 });
    };
    const b = document.getElementById('enter-music');
    const q = document.getElementById('enter-quiet');
    b.disabled = q.disabled = false;
    b.addEventListener('click', () => go(true), { once: true });
    q.addEventListener('click', () => go(false), { once: true });
    if (DEBUG && params.has('skip')) go(false);
  }

  // Another theme's gate over the page: no door, no lens. Its opening hands over to Dhoka's first plate (or to the
  // other theme's first screen), then the page is the same calm editorial scroll.
  function bootMix() {
    lens.hidden = true;
    if (reduced || params.has('static')) document.body.classList.add('is-static');
    const lines = mix.hero ? [] : [...document.querySelectorAll('.dh-hero__text > *')];
    const plate = mix.hero ? null : document.querySelector('.dh-hero__plate');
    const mixGate = mix.mountGate({
      start(withMusic) {
        player.unlock();
        ringBell(player.ctx, { when: 0.05, gain: 0.28 });
        if (withMusic) setTimeout(() => player.start(true), 1500);
        window.scrollTo(0, 0);
        document.body.classList.remove('is-gated');
      },
      // Dhoka's own first plate, as it settles after the door: the photo first, then the words line by line
      intro(tl, at) {
        if (reduced) { tl.fromTo([plate, ...lines].filter(Boolean), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, at); return; }
        if (plate) tl.fromTo(plate, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out' }, at);
        tl.fromTo(lines, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09, ease: 'expo.out' }, at + 0.25);
      },
      finish,
    });
    if (DEBUG) window.__dhoka = { finish: () => mixGate.finish() };
    if (DEBUG && (params.has('skip') || params.has('open'))) mixGate.finish();
  }

  // ───────────────────────── Scroll: calm editorial ─────────────────────────
  function buildScroll() {
    const runNo = document.getElementById('runhead-no');
    document.querySelectorAll('#main > section').forEach((sec, i) => {
      ScrollTrigger.create({
        trigger: sec, start: 'top 40%', end: 'bottom 40%',
        onToggle: (st) => { if (st.isActive) runNo.replaceChildren(...biNodes(`No. ${ROMAN[i]}`, `अङ्क ${neNum(i + 1)}`)); },
      });
    });
    // Another theme's first screen keeps the page's running head and paper grain off it until it has scrolled away.
    const mxHero = mix.heroInst?.el;
    ScrollTrigger.create({ start: mxHero ? () => Math.max(80, mxHero.offsetHeight - 64) : 80, end: 'max', onToggle: (st) => document.body.classList.toggle('is-scrolled', st.isActive) });
    if (mxHero) {
      const grain = document.querySelector('.dh-grain');
      const hide = (on) => { if (grain) grain.style.visibility = on ? 'hidden' : ''; };
      hide(true);
      ScrollTrigger.create({ trigger: mxHero, start: 'top bottom', end: 'bottom top', onToggle: (st) => hide(st.isActive) });
    }
    if (reduced || document.body.classList.contains('is-static')) return;

    // Hero: names drift up a touch slower than the plate (two layers).
    if (!mix.hero) gsap.to('.dh-hero__text', { y: () => -window.innerHeight * 0.08, ease: 'none', scrollTrigger: { trigger: '.dh-hero', start: 'top top', end: 'bottom top', scrub: true } });

    // No. II · Sticky stack: each print is laid over the last as you scroll.
    const plates = gsap.utils.toArray('.dh-stack__plate');
    if (plates.length > 1) {
      // Snap so that at rest one print is always whole.
      const stops = plates.map((_, k) => k / (plates.length - 0.6)).concat(1);
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.dh-stack', start: 'top top', end: 'bottom bottom', scrub: 0.6,
        snap: { snapTo: (v) => stops.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a)), duration: { min: 0.2, max: 0.5 }, delay: 0.12, ease: 'power2.inOut' } } });
      plates.forEach((p, i) => {
        if (i === 0) return;
        tl.fromTo(p, { yPercent: 115 }, { yPercent: 0, duration: 1, ease: 'power2.out' }, i - 1)
          .to(plates[i - 1], { scale: 0.93, yPercent: -3, duration: 1, ease: 'power2.out' }, i - 1)
          // The covered print's caption leaves first, so no text ever sits under a photo.
          .to(plates[i - 1].querySelector('figcaption'), { autoAlpha: 0, duration: 0.3, ease: 'none' }, i - 1);
        if (i > 1) tl.to(plates[i - 2], { autoAlpha: 0, duration: 0.5, ease: 'none' }, i - 1);
      });
      tl.to({}, { duration: 0.4 });
    }

    // No. III · The rites travel sideways while the page holds still.
    // Only when the whole plate (photo + caption) fits the screen height; short screens and
    // in-studio previews get a calm two-column layout that scrolls normally instead.
    const track = document.querySelector('.dh-rites__track');
    const pinRites = !window.matchMedia('(max-width: 760px), (max-height: 760px)').matches;
    if (track && !pinRites) document.querySelector('.dh-rites')?.classList.add('is-flat');
    if (track && pinRites) {
      const dist = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
      const sec = document.querySelector('.dh-rites');
      const setH = () => { sec.style.height = `${window.innerHeight + dist()}px`; };
      setH();
      ScrollTrigger.addEventListener('refreshInit', setH);
      const h = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true } });
      gsap.utils.toArray('.dh-rite__frame img').forEach((im) => {
        gsap.fromTo(im, { xPercent: 4 }, { xPercent: -4, ease: 'none', scrollTrigger: { trigger: im.closest('.dh-rite'), containerAnimation: h, start: 'left right', end: 'right left', scrub: true } });
      });
    }


    // No. VI · Album columns drift at three speeds.
    if (!mobile) {
      [-6, 6, -2].forEach((v, i) => {
        const col = document.querySelector(`.dh-album__col[data-col="${i}"]`);
        if (col) gsap.fromTo(col, { yPercent: -v }, { yPercent: v, ease: 'none', scrollTrigger: { trigger: '.dh-album', start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }

    // Plates arrive like ink settling: a short rise and fade, once.
    gsap.utils.toArray('.dh-prog__row, .dh-album__col li, .dh-cover, .dh-reply__card').forEach((el) => {
      gsap.from(el, { autoAlpha: 0, y: 28, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    ScrollTrigger.refresh();
    // The rites' width depends on each photo's proportions: measure again once they are in.
    Promise.all([...document.querySelectorAll('.dh-rite img')].map(imgReady)).then(() => ScrollTrigger.refresh());
  }

  boot();
}

// ───────────────────────── Small pieces ─────────────────────────
function imgReady(im) {
  return im.complete && im.naturalWidth ? Promise.resolve() : new Promise((r) => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); });
}

/** Frames that should follow the photo's own proportions get its aspect ratio once known. */
let refreshTimer;
function fitOnLoad(im) {
  const set = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { if (document.body.classList.contains('is-in')) ScrollTrigger.refresh(); }, 400); if (im.naturalWidth) im.style.setProperty('--ar', `${im.naturalWidth} / ${im.naturalHeight}`); im.closest('figure, li, .dh-hero__frame')?.style.setProperty('--ar', `${im.naturalWidth} / ${im.naturalHeight}`); };
  if (im.complete) set(); else im.addEventListener('load', set, { once: true });
}

function initCard() {
  const dlg = document.getElementById('card-dialog');
  const open = document.getElementById('open-card');
  let release = null;
  open.addEventListener('click', () => {
    dlg.showModal();
    dlg.scrollTop = 0;
    // Page locked, only the card scrolls (wheel and swipe), Esc closes, focus returns.
    release = openModal(dlg, { scroller: dlg, onClose: () => { if (dlg.open) dlg.close(); } });
  });
  dlg.addEventListener('close', () => { release?.(); release = null; });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
}

function initLightbox(items) {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  const im = document.createElement('img');
  im.decoding = 'async';
  lb.querySelector('figcaption').before(im);
  const cap = lb.querySelector('figcaption');
  let i = 0;
  let release = null;
  const show = (k) => {
    i = (k + items.length) % items.length;
    const g = items[i];
    im.src = photoUrl(g.photo, 'lg');
    im.alt = g.alt || '';
    cap.innerHTML = g.caption && !keyOf(g.photo) ? bi(g.caption) : '';
  };
  document.querySelector('.dh-album')?.addEventListener('click', (e) => {
    const b = e.target.closest('.dh-album__btn');
    if (!b) return;
    show(Number(b.dataset.idx));
    lb.showModal();
    release = openModal(lb, { onClose: () => { if (lb.open) lb.close(); } });
  });
  lb.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-lb]');
    if (nav) show(i + Number(nav.dataset.lb));
    else if (e.target === lb) lb.close();
  });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
  lb.addEventListener('close', () => { release?.(); release = null; });
  let x0 = null;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}

function initCountdown(iso, label) {
  const el = document.getElementById('countdown');
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days > 1) el.innerHTML = `<b>${bi({ en: String(days), ne: neNum(days) })}</b>${bi(label)}`;
  else if (days >= 0) el.innerHTML = bi({ en: 'The day is here.', ne: 'शुभ दिन आइपुग्यो।' });
}

start();
