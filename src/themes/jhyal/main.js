// Theme · Jhyal (झ्याल) — the carved Newari window.
// One carved sal-wood window on ivory lokta paper: a cusped torana with a half lotus, an extended lintel and sill,
// bead and lotus-petal bands, lattice shutters, a slim marigold toran and two brass diyos on the sill. Through the
// lattice the couple's names show faintly. Tap "Open the window": the shutters swing outward in 3D, soft morning
// light and a few marigold petals drift in, and the view moves through the window into the page (the one
// signature motion). Then a calm scroll: शुभ विवाह with the couple framed in a smaller carved window, a red lagan
// patra that unfolds to the date, a quiet countdown, the two families either side of a carved pillar, a calm
// grid of photographs, the card wording on handmade paper with a Dhaka strip, a sindoor-line programme, the
// reply card, and the window again, open, with the blessing.
import '../../core/base.css';
import './jhyal.css';
import { gsap } from 'gsap';
import { loadInvitation } from '../../core/data.js';
import { bi, esc, dateOf, timeLabel, mapUrl, neNum, bsDateOf } from '../../core/i18n.js';
import { mountShell, ringBell } from '../../core/shell.js';
import { madeWith } from '../../core/madewith.js';
import { createSmooth, reducedMotion } from '../../core/smooth.js';
import { initRsvp } from '../../core/rsvp.js';
import { guestEvents } from '../../core/finale.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { openModal } from '../../core/modal.js';
import { useSlots } from '../../core/slots.js';
import { photoUrl } from '../../photos.js';
import manifest from './slots.js';
import {
  DEFS, windowGeom, windowSVG, shutterSVG, diyoSVG, dhakaTile, pillarCapital, pillarBase, pillarShaftTile,
  beamDivider, dividerSVG, lotusNode,
} from './art.js';
import {
  DECOR, on, isUrl, keyOf, imgTag, names as namesOf, boxOf, DIYO, fixPhotoWindows, gateHtml, gateRefs, layoutGate as layoutWindow,
  petalFall, windowOpen, heroHtml, heroGroups as groupsOf,
} from './parts.js';
import { createMix } from '../../core/mix.js';

const config = await loadInvitation();
// another theme's gate and/or first screen on this page (docs/MIX.md); without config.design nothing changes
const mix = await createMix({ host: 'jhyal', manifest, config });
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion() || params.has('still');
const c = config.couple;
const events = guestEvents();
const root = document.documentElement;

// ───────────────────────── Slots ─────────────────────────
if (DEBUG) {
  const mine = ((config.themeContent ||= {})[manifest.theme] ||= {});
  for (const [k, v] of params) {
    if (k.startsWith('img.')) (mine.images ||= {})[k.slice(4)] = v;
    if (k.startsWith('txt.')) (mine.texts ||= {})[k.slice(4)] = { en: v, ne: v };
  }
}
const S = useSlots(manifest);
const txt = S.txt;

// ───────────────────────── Photo helpers ─────────────────────────
const PEOPLE = /^(couple|wedding|mehendi-hands|bride|groom|portrait)/;
const isCouple = (ref) => !!ref && (typeof ref === 'object' || isUrl(ref) || PEOPLE.test(ref));
const safeColor = (s) => (/^#[0-9a-f]{3,8}$/i.test(String(s)) ? s : null);
const safeHref = (u) => (/^https:\/\//i.test(String(u || '')) ? String(u) : '');
const tel = (p) => String(p).replace(/[^\d+]/g, '');
const portraitAlt = Object.fromEntries((c.portraits || []).filter((p) => p?.photo).map((p) => [keyOf(p.photo), p.alt || '']));
const altFor = (ref, id) => portraitAlt[keyOf(ref)] || (ref && typeof ref === 'object' && ref.alt) || S.alt(id) || `${c.bride.name.en} and ${c.groom.name.en}`;


// ───────────────────────── Which photo goes where ─────────────────────────
const used = new Set();
const take = (ref) => { used.add(keyOf(ref)); return ref; };
const leadRef = S.img('couple.lead');
const lead = leadRef ? { photo: take(leadRef), alt: altFor(leadRef, 'couple.lead') } : null;
const bridePh = S.img('families.bride');
const groomPh = S.img('families.groom');
const brideGroom = !!(bridePh && groomPh && keyOf(bridePh) !== keyOf(groomPh));
if (brideGroom) { take(bridePh); take(groomPh); }
const gridCouple = [];
for (let n = 1; n <= 8; n++) {
  const id = `photos.${n}`;
  const ref = S.img(id);
  if (!ref || used.has(keyOf(ref))) continue;
  take(ref);
  gridCouple.push({ photo: ref, alt: altFor(ref, id) });
}
const gridMore = (config.gallery || [])
  .filter((g) => g?.photo && !used.has(keyOf(g.photo)) && !/^marigold/.test(keyOf(g.photo)))
  .filter((g, i, a) => a.findIndex((x) => keyOf(x.photo) === keyOf(g.photo)) === i)
  .sort((x, y) => Number(isCouple(y.photo)) - Number(isCouple(x.photo)))
  .map((g) => ({ photo: g.photo, alt: g.alt || '' }));
/** The calm grid: the couple first, then the invitation's own gallery. */
const album = [...gridCouple, ...gridMore].slice(0, 12);

// ───────────────────────── Dates ─────────────────────────
function adParts(iso) {
  const en = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(new Date(iso));
  const g = (t) => en.find((p) => p.type === t)?.value || '';
  const [wdNe, ...restNe] = dateOf(iso).ne.split(', ');
  return { wd: { en: g('weekday'), ne: wdNe }, day: g('day'), month: { en: g('month'), ne: restNe.join(', ') }, year: g('year'), full: dateOf(iso) };
}
function bsParts(iso, override) {
  const b = bsDateOf(iso, override);
  let day = null; let month = null; let year = null;
  const m = String(b.short?.ne || '').match(/^(\S+)\s+([०-९]+),\s*([०-९]+)/);
  if (m) [, month, day, year] = m;
  else {
    const ne = String(b.ne || '');
    const md = ne.match(/([^\s,.०-९]+)\s+([०-९]{1,2})\s*गते/);
    const y = ne.match(/([०-९]{4})/);
    if (md && y) { [, month, day] = md; [, year] = y; }
  }
  const enShort = String(b.short?.en || b.en || '').replace(/^[A-Za-z]+,\s*/, '');
  return { full: b, day, month, year, enShort: /B\.S\./.test(enShort) ? enShort : `${enShort} B.S.` };
}
const npDay = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(new Date(iso));
const mainEv = events.find((e) => e?.start && npDay(e.start) === npDay(config.weddingDate)) || null;
const mainIso = mainEv?.start || config.weddingDate;
const mainAD = adParts(mainIso);
const mainBS = bsParts(mainIso, mainEv?.dateBS || config.weddingDateBS);
const target = new Date(mainIso).getTime();
const daysLeft = Math.ceil((target - Date.now()) / 86400000);
const countLine = daysLeft > 1
  ? { en: `${daysLeft} days to go`, ne: `${neNum(daysLeft)} दिन बाँकी` }
  : daysLeft === 1 ? { en: 'Tomorrow', ne: 'भोलि' } : { en: 'With love', ne: 'मायासहित' };

// UI chrome (not studio content).
const T = {
  map: { en: 'Map', ne: 'नक्सा' },
  time: { en: 'Time', ne: 'समय' },
  venue: { en: 'Venue', ne: 'स्थान' },
  wear: { en: 'Wear', ne: 'पहिरन' },
  call: { en: 'Call', ne: 'फोन' },
  calendar: { en: 'Add the dates to your calendar', ne: 'क्यालेन्डरमा थप्नुहोस्' },
  shareIt: { en: 'Share the invitation', ne: 'निम्तो पठाउनुहोस्' },
  close: { en: 'Close', ne: 'बन्द गर्नुहोस्' },
  scroll: { en: 'Scroll', ne: 'तल हेर्नुहोस्' },
  stays: { en: 'Where to stay', ne: 'बसाइ' },
  travel: { en: 'Getting there', ne: 'आउने बाटो' },
  contacts: { en: 'Questions', ne: 'सोधपुछ' },
  live: { en: 'Watch the ceremony live', ne: 'प्रत्यक्ष हेर्नुहोस्' },
  order: { en: 'Order of the day', ne: 'दिनको क्रम' },
  days: { en: 'Days', ne: 'दिन' },
  hours: { en: 'Hours', ne: 'घण्टा' },
  minutes: { en: 'Minutes', ne: 'मिनेट' },
  seconds: { en: 'Seconds', ne: 'सेकेन्ड' },
  today: { en: 'Today is the day', ne: 'आज शुभ दिन' },
  married: { en: 'Married, with your blessings', ne: 'हजुरहरूको आशीर्वादसहित, विवाहित' },
};

const names = (cls = 'jh-n') => namesOf(c, cls);
const symbol = txt('hero.symbol');
const title = txt('hero.title');

const DHAKA = dhakaTile(2);
root.style.setProperty('--jh-dhaka', DHAKA.url);
root.style.setProperty('--jh-dhaka-w', `${DHAKA.w}px`);
root.style.setProperty('--jh-dhaka-h', `${DHAKA.h}px`);
root.style.setProperty('--jh-shaft', pillarShaftTile());

const head = (kicker, h, id, cls = '') => `<header class="jh-head ${cls} jh-rise">${kicker ? `<p class="jh-kicker">${bi(kicker)}</p>` : ''}<h2 class="jh-h2" id="${id}">${bi(h)}</h2><span class="jh-head__div">${dividerSVG(160)}</span></header>`;

// ───────────────────────── The carved windows ─────────────────────────

// The closing window: open, with dawn light inside.
const GC = windowGeom({ ow: 460, oh: 380 });
const closeWindow = () => `<div class="jh-cwin" style="--war:${(GC.TW / GC.H).toFixed(4)}" aria-hidden="true">
    <span class="jh-cwin__sky" style="${boxOf(GC, GC.ox, GC.oy, GC.ow, GC.oh)}"><i class="jh-cwin__sun"></i></span>
    <span class="jh-cwin__art">${windowSVG(GC)}</span>
    <span class="jh-cwin__shut" style="${boxOf(GC, GC.ox, GC.oy, GC.ow, GC.oh)}">
      <span class="jh-cwin__leaf jh-cwin__leaf--l">${shutterSVG('l', GC.ow / 2, GC.oh)}</span>
      <span class="jh-cwin__leaf jh-cwin__leaf--r">${shutterSVG('r', GC.ow / 2, GC.oh)}</span>
    </span>
    ${['l', 'r'].map((k) => `<span class="jh-cdiyo" data-hindu style="${boxOf(GC, k === 'l' ? GC.WING * 0.5 - DIYO / 2 : GC.TW - GC.WING * 0.5 - DIYO / 2, GC.yS - DIYO * 1.1 + 2, DIYO, DIYO * 1.1)}${k === 'r' ? ';transform:scaleX(-1)' : ''}"><i class="jh-halo"></i>${diyoSVG()}</span>`).join('')}
  </div>`;

// ───────────────────────── The date: a folded red lagan patra ─────────────────────────
const dateBig = { en: `${mainAD.day} ${mainAD.month.en} ${mainAD.year}`, ne: mainBS.day ? `${mainBS.month} ${mainBS.day} गते` : mainBS.full.ne };
const adNoDay = mainAD.full.ne.split(', ').slice(1).join(', ');
const dateAlt = { en: mainBS.enShort, ne: mainBS.year ? `वि.सं. ${mainBS.year} · ${adNoDay}` : mainAD.full.ne };
const whenLine = mainEv ? timeLabel(mainEv) : null;
const placeLine = mainEv?.venue?.en || mainEv?.venue?.ne ? mainEv.venue : config.city;
const seal = txt('date.seal');

const countCell = (u, label) => `<li class="jh-count__cell"><b class="jh-count__n" data-u="${u}">${bi({ en: '00', ne: '००' })}</b><span class="jh-count__l">${bi(label)}</span></li>`;

// ───────────────────────── Markup ─────────────────────────
const main = document.getElementById('main');
document.body.insertAdjacentHTML('afterbegin', DEFS);
main.innerHTML = `
  ${gateHtml({ c, txt })}

  ${heroHtml({ c, txt, lead })}

  <section class="jh-sec jh-when" id="date" aria-labelledby="date-title">
    ${head(txt('date.kicker'), txt('date.title'), 'date-title')}
    <div class="jh-patra jh-rise" id="patra">
      <div class="jh-patra__sheet" id="sheet">
        <div class="jh-patra__panel jh-patra__mid">
          <p class="jh-patra__big">${bi(dateBig)}</p>
          <p class="jh-patra__alt">${bi(dateAlt)}</p>
        </div>
        <div class="jh-patra__flap jh-patra__flap--top" id="flapT">
          <div class="jh-patra__face jh-patra__face--in"><span class="jh-patra__orn" aria-hidden="true">${dividerSVG(120)}</span><p class="jh-patra__wd">${bi(mainAD.wd)}</p></div>
          <div class="jh-patra__face jh-patra__face--out"></div>
        </div>
        <div class="jh-patra__flap jh-patra__flap--bot" id="flapB">
          <div class="jh-patra__face jh-patra__face--in">
            ${whenLine ? `<p class="jh-patra__time">${bi(whenLine)}</p>` : ''}
            ${placeLine?.en || placeLine?.ne ? `<p class="jh-patra__place">${bi(placeLine)}</p>` : ''}
          </div>
          <div class="jh-patra__face jh-patra__face--out"><span class="jh-patra__thread" aria-hidden="true"></span><span class="jh-patra__seal">${bi(seal)}</span></div>
        </div>
      </div>
      <button class="jh-btn jh-btn--line" type="button" id="unfold">${bi(txt('date.button'))}</button>
    </div>
    <div class="jh-count jh-rise" id="count">
      <h3 class="jh-count__title">${bi(txt('count.title'))}</h3>
      <ol class="jh-count__grid" id="countgrid" aria-label="${esc(txt('count.title').en)}">
        ${countCell('d', T.days)}${countCell('h', T.hours)}${countCell('m', T.minutes)}${countCell('s', T.seconds)}
      </ol>
      <p class="jh-count__done" id="countdone" hidden></p>
    </div>
  </section>

  <section class="jh-sec jh-fam" id="families" aria-labelledby="fam-title">
    ${head(null, txt('families.title'), 'fam-title')}
    <div class="jh-fam__grid jh-rise">
      <div class="jh-fam__side">
        ${brideGroom ? `<figure class="jh-mount jh-fam__pic">${imgTag(bridePh, c.bride.name.en, '(max-width: 760px) 56vw, 240px')}</figure>` : ''}
        <p class="jh-kicker">${bi(txt('families.bride'))}</p>
        <p class="jh-fam__name">${bi(c.bride.fullName)}</p>
        ${(c.bride.parents?.en || c.bride.parents?.ne) ? `<p class="jh-fam__of">${bi(txt('families.daughter'))}</p><p class="jh-fam__parents">${bi(c.bride.parents)}</p>` : ''}
        ${(c.bride.home?.en || c.bride.home?.ne) ? `<p class="jh-fam__home">${bi(c.bride.home)}</p>` : ''}
      </div>
      <div class="jh-pillar" aria-hidden="true">
        <img class="jh-pillar__kalash" data-hindu src="${DECOR}kalash-sm.webp" srcset="${DECOR}kalash-sm.webp 320w, ${DECOR}kalash.webp 640w" sizes="110px" alt="" loading="lazy" decoding="async" />
        <span class="jh-pillar__cap">${pillarCapital()}</span>
        <span class="jh-pillar__shaft"></span>
        <span class="jh-pillar__base">${pillarBase()}</span>
        <span class="jh-pillar__beam">${beamDivider(320)}</span>
      </div>
      <div class="jh-fam__side">
        ${brideGroom ? `<figure class="jh-mount jh-fam__pic">${imgTag(groomPh, c.groom.name.en, '(max-width: 760px) 56vw, 240px')}</figure>` : ''}
        <p class="jh-kicker">${bi(txt('families.groom'))}</p>
        <p class="jh-fam__name">${bi(c.groom.fullName)}</p>
        ${(c.groom.parents?.en || c.groom.parents?.ne) ? `<p class="jh-fam__of">${bi(txt('families.son'))}</p><p class="jh-fam__parents">${bi(c.groom.parents)}</p>` : ''}
        ${(c.groom.home?.en || c.groom.home?.ne) ? `<p class="jh-fam__home">${bi(c.groom.home)}</p>` : ''}
      </div>
    </div>
  </section>

  ${album.length ? `
  <section class="jh-sec jh-photos" id="photos" aria-labelledby="photos-title">
    ${head(null, txt('photos.title'), 'photos-title')}
    <p class="jh-lede jh-rise">${bi(txt('photos.line'))}</p>
    <ul class="jh-grid" id="grid">
      ${album.map((g, i) => `<li class="jh-grid__item jh-rise${i === 0 ? ' jh-grid__item--flower' : ''}">
        ${i === 0 ? `<img class="jh-grid__flower" src="${DECOR}corner-sm.webp" srcset="${DECOR}corner-sm.webp 400w, ${DECOR}corner.webp 720w" sizes="190px" alt="" aria-hidden="true" loading="lazy" decoding="async" />` : ''}
        <button type="button" class="jh-mount" data-idx="${i}" aria-label="${esc(g.alt || 'Open photograph')}">${imgTag(g.photo, g.alt, '(max-width: 760px) 46vw, 30vw')}</button>
      </li>`).join('')}
    </ul>
  </section>` : ''}

  <div class="jh-sprig jh-rise" aria-hidden="true"><img src="${DECOR}sprig.webp" alt="" loading="lazy" decoding="async" /></div>

  <section class="jh-sec jh-card" id="card" aria-labelledby="card-title">
    <article class="jh-card__sheet jh-rise">
      <p class="jh-kicker">${bi(txt('card.kicker'))}</p>
      ${config.invitation?.shloka?.sa ? `<p class="jh-card__shloka" lang="sa">${esc(config.invitation.shloka.sa)}</p>` : ''}
      <h2 class="jh-card__line" id="card-title">${bi(txt('card.line'))}</h2>
      <p class="jh-card__hosts">${bi(config.hosts)}</p>
      <button class="jh-btn" type="button" data-open-card>${bi(txt('card.button'))}</button>
    </article>
  </section>

  <section class="jh-sec jh-prog" id="programme" aria-labelledby="prog-title">
    ${head(txt('prog.kicker'), txt('prog.title'), 'prog-title')}
    <ol class="jh-tl">
      ${events.map((e) => {
        const ad = adParts(e.start);
        const bs = bsParts(e.start, e.dateBS);
        const sw = (e.dress?.colors || []).map(safeColor).filter(Boolean);
        const hasDress = !!(e.dress?.text?.en || e.dress?.text?.ne || sw.length);
        return `
      <li class="jh-ev jh-rise" id="ev-${esc(e.id)}">
        <div class="jh-ev__date" aria-hidden="true">
          <span class="jh-ev__day">${bi({ en: ad.day, ne: bs.day || neNum(ad.day) })}</span>
          <span class="jh-ev__my">${bi({ en: `${ad.month.en} ${ad.year}`, ne: bs.month ? `${bs.month} ${bs.year}` : ad.month.ne })}</span>
          <span class="jh-ev__wd">${bi(ad.wd)}</span>
        </div>
        <span class="jh-ev__node" aria-hidden="true">${lotusNode(24)}</span>
        <div class="jh-ev__main">
          <h3 class="jh-ev__title">${bi(e.title)}</h3>
          <p class="jh-ev__when">${bi({ en: ad.full.en, ne: bs.full.ne })}<br /><span class="jh-ev__alt">${bi({ en: bs.full.en, ne: ad.full.ne })}</span></p>
          <dl class="jh-ev__facts">
            <div><dt>${bi(T.time)}</dt><dd>${bi(timeLabel(e))}</dd></div>
            <div><dt>${bi(T.venue)}</dt><dd>${bi(e.venue)} <a class="jh-map" href="${esc(mapUrl(e.mapQuery || e.venue?.en || ''))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (${esc(e.venue?.en || '')}, opens Google Maps)</span></a></dd></div>
            ${hasDress ? `<div><dt>${bi(T.wear)}</dt><dd class="jh-dress">${sw.length ? `<span class="jh-sw" aria-hidden="true">${sw.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(e.dress.text?.en || e.dress.text?.ne ? e.dress.text : T.wear)}</span></dd></div>` : ''}
          </dl>
          ${e.rituals?.length ? `<div class="jh-order"><p class="jh-order__label">${bi(T.order)}</p><ol>${e.rituals.map((r) => `<li><span class="jh-order__t">${bi(typeof r.time === 'string' ? { en: r.time, ne: neNum(r.time) } : r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></div>` : ''}
        </div>
      </li>`;
      }).join('')}
    </ol>
    <div class="jh-prog__foot jh-rise">
      <button class="jh-btn jh-btn--line" type="button" id="add-calendar">${bi(T.calendar)}</button>
      ${(config.info?.travel || config.info?.stays?.length || config.info?.contacts?.length) ? `
      <details class="jh-more">
        <summary>${bi(txt('prog.more'))}</summary>
        <div class="jh-more__grid">
          ${config.info?.travel ? `<div><h3>${bi(T.travel)}</h3><p>${bi(config.info.travel)}</p></div>` : ''}
          ${config.info?.stays?.length ? `<div><h3>${bi(T.stays)}</h3><ul>${config.info.stays.map((s) => `<li><b>${bi(s.name)}</b><small>${bi(s.note)}</small><a class="jh-map" href="${esc(mapUrl(s.mapQuery || s.name.en))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span></a></li>`).join('')}</ul></div>` : ''}
          ${config.info?.contacts?.length ? `<div><h3>${bi(T.contacts)}</h3><ul>${config.info.contacts.map((p) => `<li><b>${bi(p.name)}</b><small>${bi(p.role)}</small><span class="jh-links"><a class="jh-map" href="tel:${esc(tel(p.phone))}">${bi(T.call)}</a><a class="jh-map" href="https://wa.me/${esc(tel(p.phone).replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span></li>`).join('')}</ul>
            ${safeHref(config.info.livestream) ? `<a class="jh-map" href="${esc(safeHref(config.info.livestream))}" target="_blank" rel="noopener">${bi(T.live)} ↗</a>` : ''}</div>` : ''}
        </div>
      </details>` : ''}
    </div>
  </section>

  <section class="jh-sec jh-rsvp" id="rsvp" aria-labelledby="rsvp-title">
    <div class="jh-rsvp__in">
      <div class="jh-rsvp__note jh-rise">
        <p class="jh-kicker">${bi(countLine)}</p>
        <h2 class="jh-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
        <span class="jh-head__div jh-head__div--left">${dividerSVG(160)}</span>
        ${(config.rsvp?.deadline?.en || config.rsvp?.deadline?.ne) ? `<p class="jh-lede jh-lede--left">${bi(config.rsvp.deadline)}</p>` : ''}
        <p><button class="jh-link" type="button" id="share">${bi(T.shareIt)}</button></p>
      </div>
      <div class="jh-rsvp__card jh-rise">
        <form class="rsvp jh-form" id="rsvp-form" novalidate>
          <div class="field">
            <label for="f-name">${bi({ en: 'Your name', ne: 'नाम' })}</label>
            <input id="f-name" name="name" type="text" autocomplete="name" required maxlength="80" />
            <p class="field__err" id="f-name-err" role="alert"></p>
          </div>
          <fieldset class="field field--choice">
            <legend>${bi({ en: 'Will you attend?', ne: 'उपस्थिति' })}</legend>
            <div class="choice-grid">
              <label class="choice"><input type="radio" name="attending" value="yes" checked /><span>${bi({ en: 'Joyfully, yes', ne: 'अवश्य आउँछौं' })}</span></label>
              <label class="choice"><input type="radio" name="attending" value="no" /><span>${bi({ en: 'With love, from afar', ne: 'टाढैबाट शुभकामना' })}</span></label>
            </div>
          </fieldset>
          <div class="rsvp__when-yes">
            <div class="jh-form__row">
              <div class="field">
                <label for="f-guests">${bi({ en: 'Guests, including you', ne: 'पाहुना संख्या' })}</label>
                <select id="f-guests" name="guests"></select>
              </div>
              <div class="field">
                <label for="f-phone">${bi({ en: 'Phone (optional)', ne: 'फोन (ऐच्छिक)' })}</label>
                <input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" />
              </div>
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
            <label for="f-msg">${bi({ en: 'A blessing for the couple (optional)', ne: 'शुभकामना (ऐच्छिक)' })}</label>
            <textarea id="f-msg" name="message" rows="2" maxlength="500"></textarea>
          </div>
          <div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>
          <button class="jh-btn" type="submit" id="rsvp-submit">${bi(txt('rsvp.send'))}</button>
          <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
        </form>
      </div>
    </div>
  </section>

  <footer class="jh-close" aria-label="Blessing">
    <div class="jh-close__win jh-rise">${closeWindow()}</div>
    <div class="jh-close__text jh-rise">
      <p class="jh-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
      <p class="jh-close__en l-en">${esc(config.closing?.en || '')}</p>
      <p class="jh-close__names">${names()}</p>
      ${c.hashtag ? `<p class="jh-close__tag">${esc(c.hashtag)}</p>` : ''}
    </div>
    ${madeWith()}
  </footer>

  <div class="jh-modal" id="cardmodal" hidden role="dialog" aria-modal="true" aria-labelledby="cm-title" data-lenis-prevent>
    <div class="jh-modal__panel" id="cm-panel">
      <button class="jh-modal__x" type="button" data-close><span aria-hidden="true">×</span><span class="sr-only">${esc(T.close.en)}</span></button>
      ${on(symbol) ? `<p class="jh-modal__sym" lang="ne">${esc(symbol.ne || symbol.en)}</p>` : ''}
      <p class="jh-modal__shloka" lang="sa">${esc(config.invitation?.shloka?.sa || '')}</p>
      <p class="jh-modal__shloka-en l-en">${esc(config.invitation?.shloka?.en || '')}</p>
      <h2 class="jh-modal__title" id="cm-title"><span lang="ne">${esc(title.ne)}</span></h2>
      <p class="jh-modal__p">${bi(config.invitation?.salutation || '')}</p>
      <p class="jh-modal__p">${bi(config.invitation?.body || '')}</p>
      <p class="jh-modal__p">${bi(config.invitation?.request || '')}</p>
      <dl class="jh-modal__when">
        <div><dt>${bi({ en: 'Date', ne: 'मिति' })}</dt><dd>${bi(dateOf(mainIso))}<br />${bi({ en: mainBS.full.en, ne: mainBS.full.ne })}</dd></div>
        <div><dt>${bi({ en: 'Place', ne: 'स्थान' })}</dt><dd>${bi(config.city)}</dd></div>
      </dl>
      <p class="jh-modal__sign">${bi(config.invitation?.signoff || '')}<br /><b>${bi(config.hosts)}</b></p>
    </div>
  </div>

  <div class="jh-lb" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photograph" data-lenis-prevent>
    <button type="button" class="jh-lb__btn jh-lb__x" data-lb="close"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <button type="button" class="jh-lb__btn jh-lb__prev" data-lb="prev"><span aria-hidden="true">←</span><span class="sr-only">Previous</span></button>
    <figure class="jh-lb__fig"><img alt="" decoding="async" /></figure>
    <button type="button" class="jh-lb__btn jh-lb__next" data-lb="next"><span aria-hidden="true">→</span><span class="sr-only">Next</span></button>
  </div>`;

// Photo windows whose shape was unknown (no stored size): rebuild around the real shape once loaded.
fixPhotoWindows();
// another theme's first screen replaces the opening one; another theme's gate replaces the window (docs/MIX.md)
if (mix.hero) mix.mountHero(document.getElementById('top'));
if (mix.gate) document.getElementById('gate').remove();

// ───────────────────────── Shell, RSVP, dialogs ─────────────────────────
const { player } = mountShell({ chapters: [] });
initRsvp(events);
document.getElementById('add-calendar').addEventListener('click', () => downloadIcs(events));
document.getElementById('share').addEventListener('click', (e) => share(e.currentTarget));

const modal = document.getElementById('cardmodal');
let closeModal = null;
const hideModal = () => {
  if (!closeModal) return;
  const done = closeModal;
  closeModal = null;
  modal.classList.remove('is-open');
  setTimeout(() => { modal.hidden = true; }, 260);
  done();
};
document.querySelectorAll('[data-open-card]').forEach((b) => b.addEventListener('click', () => {
  closeModal = openModal(modal, { scroller: modal, onClose: hideModal });
  requestAnimationFrame(() => modal.classList.add('is-open'));
}));
modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) hideModal(); });

(function lightbox() {
  const lb = document.getElementById('lightbox');
  const im = lb.querySelector('img');
  let i = 0;
  let release = null;
  const show = (k) => {
    i = (k + album.length) % album.length;
    im.src = photoUrl(album[i].photo, 'lg');
    im.alt = album[i].alt || '';
  };
  const close = () => {
    if (!release) return;
    const r = release;
    release = null;
    lb.classList.remove('is-open');
    setTimeout(() => { lb.hidden = true; }, 260);
    r();
  };
  document.getElementById('grid')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-idx]');
    if (!b) return;
    show(Number(b.dataset.idx));
    release = openModal(lb, { onClose: close });
    requestAnimationFrame(() => lb.classList.add('is-open'));
  });
  lb.addEventListener('click', (e) => {
    const act = e.target.closest('[data-lb]')?.dataset.lb;
    if (act === 'close' || e.target === lb || e.target.classList.contains('jh-lb__fig')) close();
    else if (act === 'prev') show(i - 1);
    else if (act === 'next') show(i + 1);
  });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
  let x0 = null;
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}());

// ───────────────────────── The window: sized from the width AND the height of the screen ─────────────────────────
// (another theme's gate replaced the window: none of this runs, see mixGate below)
const gate = mix.gate ? null : document.getElementById('gate');
const R = gate ? gateRefs(gate) : null;
const openBtn = document.getElementById('open');
const quietBtn = document.getElementById('quiet');
const hero = document.getElementById('top');
let L = null;
const layoutGate = () => { if (R) L = layoutWindow(R); };

// A light morning drift of petals over the closed window
const fallEl = reduced || !gate ? null : petalFall(gate);
if (R) R.fall = fallEl;

document.body.classList.add('jh-locked');
window.scrollTo(0, 0);
layoutGate();
document.fonts?.ready.then(layoutGate);
if (openBtn && !mix.gate) { openBtn.disabled = false; quietBtn.disabled = false; }
document.body.classList.add('is-ready');

let opened = false;
let finished = false;

/** Inside the guest's tap: the bell and the music. */
function startOpen(withMusic) {
  if (opened) return false;
  opened = true;
  try {
    player.unlock();
    if (withMusic) ringBell(player.ctx, { when: 0.05, gain: 0.16 });
    player.start(withMusic);
  } catch { /* audio is optional */ }
  document.body.classList.add('is-opening');
  return true;
}
/** The first screen comes in from `at`, group by group (another theme's first screen brings its own entrance). */
function heroIntro(tl, at, { step = L?.phone ? 0.12 : 0.15 } = {}) {
  if (mix.heroInst) { mix.heroEnter(tl, at); return; }
  const groups = groupsOf(hero);
  groups.forEach((g, i) => tl.fromTo(g, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, at + i * step));
  tl.add(() => gsap.set(groups.flat(), { clearProps: 'opacity,transform' }));
}
// another theme's gate: its exit shows the page beneath (the first screen is not locked away), then the first screen
const mixGate = mix.gate ? mix.mountGate({
  start: (withMusic) => { startOpen(withMusic); window.scrollTo(0, 0); },
  intro: (tl, at) => heroIntro(tl, at, { step: document.documentElement.clientWidth < 700 ? 0.12 : 0.15 }),
  finish: () => afterOpen(),
}) : null;

function open(withMusic) {
  if (mixGate) { mixGate.open(withMusic); return; }
  if (!startOpen(withMusic)) return;
  const tl = reduced ? crossfadeIn() : throughWindow();
  setTimeout(() => { if (!finished) tl.progress(1); }, (tl.duration() + 2.5) * 1000);
}

function throughWindow() {
  const groups = groupsOf(hero); // (none when another theme's first screen is mounted)
  const flat = groups.flat();
  if (flat.length) gsap.set(flat, { opacity: 0, y: 14 });
  // the page is usable the moment the view is through; the last lines finish settling after that
  const tl = gsap.timeline({ onComplete: () => { afterOpen(); if (flat.length) gsap.set(flat, { clearProps: 'opacity,transform' }); } });
  tl.to([R.gline, R.gctl], { autoAlpha: 0, y: 6, duration: 0.32, ease: 'power2.out' }, 0);
  const { end } = windowOpen(gsap, tl, R, L);
  const t = end - 0.6;
  groups.forEach((g, i) => tl.to(g, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * (L.phone ? 0.12 : 0.15)));
  if (mix.heroInst) mix.heroEnter(tl, t);
  tl.add(afterOpen, end + 0.02);
  return tl;
}

/** Reduced motion: no swing or camera move; the window gives way to the page in a crossfade. */
function crossfadeIn() {
  const flat = groupsOf(hero).flat();
  if (flat.length) gsap.set(flat, { clearProps: 'opacity,transform' });
  const tl = gsap.timeline({ onComplete: afterOpen });
  tl.to(gate, { autoAlpha: 0, duration: 0.5, ease: 'power1.inOut' }, 0);
  if (mix.heroInst) mix.heroEnter(tl, 0);
  return tl;
}

openBtn?.addEventListener('click', () => open(true));
quietBtn?.addEventListener('click', () => open(false));

let lenis = null;
function afterOpen() {
  if (finished) return;
  finished = true;
  if (gate) gate.hidden = true;
  fallEl?.stop?.();
  fallEl?.remove();
  document.body.classList.remove('jh-locked', 'is-opening');
  document.body.classList.add('is-open');
  lenis = createSmooth();
  revealOnScroll();
  // (a borrowed first screen's own cue scrolls on by itself)
  if (!mix.heroInst) {
    document.getElementById('cue').addEventListener('click', (e) => {
      e.preventDefault();
      const y = document.getElementById('date').getBoundingClientRect().top + window.scrollY;
      if (lenis) lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    });
  }
  mix.afterOpen?.();
}

// ───────────────────────── The lagan patra unfolds ─────────────────────────
(function laganPatra() {
  const wrap = document.getElementById('patra');
  const btn = document.getElementById('unfold');
  let open = false;
  const unfold = () => {
    if (open) return;
    open = true;
    wrap.classList.add('is-open');
    btn.style.opacity = '0';
    setTimeout(() => { btn.hidden = true; }, 320);
  };
  if (reduced) { wrap.classList.add('is-open', 'is-still'); btn.hidden = true; open = true; }
  btn.addEventListener('click', unfold);
  document.getElementById('sheet').addEventListener('click', unfold);
  // it also opens by itself once it is well inside the screen
  const io = new IntersectionObserver(([en]) => {
    if (en.isIntersecting && document.body.classList.contains('is-open')) { setTimeout(unfold, 380); io.disconnect(); }
  }, { threshold: 0.75 });
  io.observe(document.getElementById('sheet'));
  if (DEBUG) window.__jhPatra = { unfold, isOpen: () => open };
}());

// ───────────────────────── Countdown to the ceremony ─────────────────────────
(function countdown() {
  const cells = Object.fromEntries([...document.querySelectorAll('#countgrid [data-u]')].map((b) => [b.dataset.u, b]));
  const done = document.getElementById('countdone');
  const grid = document.getElementById('countgrid');
  const set = (el, n) => {
    const s = String(n).padStart(2, '0');
    const en = el.querySelector('.l-en'); const ne = el.querySelector('.l-ne');
    if (en.textContent !== s) { en.textContent = s; ne.textContent = neNum(s); }
  };
  let timer = null;
  const tick = () => {
    const ms = target - Date.now();
    if (!(ms > 0)) {
      const after = ms < -86400000;
      grid.hidden = true; done.hidden = false;
      done.innerHTML = bi(after ? T.married : T.today);
      clearInterval(timer);
      return;
    }
    const s = Math.floor(ms / 1000);
    set(cells.d, Math.floor(s / 86400)); set(cells.h, Math.floor((s % 86400) / 3600));
    set(cells.m, Math.floor((s % 3600) / 60)); set(cells.s, s % 60);
  };
  tick();
  setTimeout(() => { tick(); timer = setInterval(tick, 1000); }, 1000 - (Date.now() % 1000));
}());

// ───────────────────────── The scroll: quiet fades and rises ─────────────────────────
function revealOnScroll() {
  const els = document.querySelectorAll('.jh-rise');
  if (reduced) { els.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
}

// Keep the window right when the width changes (the phone address bar only changes the height).
let rw = root.clientWidth;
let rh = window.innerHeight;
let rt;
window.addEventListener('resize', () => {
  if (finished || !gate) return;
  const w = root.clientWidth; const h = window.innerHeight;
  if (w === rw && Math.abs(h - rh) < 80) return;
  rw = w; rh = h;
  clearTimeout(rt);
  rt = setTimeout(layoutGate, 120);
});

// ───────────────────────── Debug hook (screenshots) ─────────────────────────
if (DEBUG) {
  window.__jh = {
    gsap,
    layout: () => L,
    lenis: () => lenis,
    open: () => open(false),
    seek: (deg) => { if (!R) return; gsap.set(R.shL, { rotationY: -deg }); gsap.set(R.shR, { rotationY: deg }); gsap.set(R.light, { opacity: Math.min(1, deg / 60) }); },
    finish: () => {
      if (mixGate) { mixGate.finish(); return; }
      opened = true;
      gsap.set(gate, { autoAlpha: 0 });
      if (mix.heroInst) { const tl = gsap.timeline(); mix.heroEnter(tl, 0); tl.progress(1); } // a borrowed first screen, settled
      afterOpen();
    },
    to: (sel, offset = 0) => {
      const el = document.querySelector(sel);
      const y = el.getBoundingClientRect().top + window.scrollY + offset;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
      document.querySelectorAll('.jh-rise').forEach((n) => n.classList.add('is-in'));
    },
  };
  if (params.has('open')) window.__jh.finish();
}
