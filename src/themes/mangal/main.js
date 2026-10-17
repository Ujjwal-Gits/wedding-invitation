// Theme · Mangal (मंगल) — the red-and-gold Nepali wedding card, come alive.
// A carved Newar doorway (pillars, a lintel, a torana with Ganesh) dressed with a silk drape of marigold-and-rose
// rosettes and short marigold strings, two brass bells and a kalash at the foot of each pillar. Tap the latch and the heavy leaves swing open with warm light spilling through,
// and the camera walks in (the one signature motion). Inside, Shri Ganesh appears first, large and glowing, then
// settles softly behind ॥ श्री गणेशाय नमः ॥, शुभ विवाह, the names and one warm line. Then a calm scroll: the
// couple in a gold temple arch, a gold scratch card that reveals the date, the countdown, a strip of photographs,
// the families around a brass kalash, the card wording, the programme, the reply card and the blessing under a
// full-width marigold garland between two lit diyos, closed by a Dhaka band.
import '../../core/base.css';
import './mangal.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadInvitation } from '../../core/data.js';
import { bi, esc, dateOf, timeLabel, mapUrl, neNum, bsDateOf, timeZone } from '../../core/i18n.js';
import { mountShell, ringBell } from '../../core/shell.js';
import { madeWith } from '../../core/madewith.js';
import { createSmooth, reducedMotion } from '../../core/smooth.js';
import { initRsvp } from '../../core/rsvp.js';
import { guestEvents } from '../../core/finale.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { openModal } from '../../core/modal.js';
import { useSlots } from '../../core/slots.js';
import { photoUrl } from '../../photos.js';
import credits from '../../generated/credits.json';
import manifest from './slots.js';
import { createMix } from '../../core/mix.js';
import { DEFS, crownSVG, dividerSVG } from './art.js';
import {
  DECOR, paperVars, medalHTML, diyoHTML, namesHTML, gateHTML, doorwayHTML, doorRefs, computeLayout, layoutDoorway,
  fitGate, fallBox, maskFall as maskFallIn, dropPetals as dropPetalsIn, openDoors, depthOf,
} from './doorway.js';
import { WATERMARK, cardHTML, cardRefs, fitCard, cardIn as cardInP, cardStill } from './card.js';

gsap.registerPlugin(ScrollTrigger);

const config = await loadInvitation();
// Mix (docs/MIX.md): another theme's gate may open this page (Mangal's own doorway then never enters it), and another
// theme's first screen may replace the red card (Mangal's own doorway then runs as its module, gate.js).
const mix = await createMix({ host: 'mangal', manifest, config });
const ownHero = !mix.hero;
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion() || params.has('still');
const c = config.couple;
const events = guestEvents();

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
/** "-", "none" or "off" in a text slot turns that element off (religious marks are optional). */
const isOff = (v) => !v || /^\s*(-|–|none|off|no|hide)\s*$/i.test(v);
const on = (o) => !isOff(o.en) || !isOff(o.ne);

// ───────────────────────── Photo helpers ─────────────────────────
const dims = Object.fromEntries(credits.map((k) => [String(k.file || k.slot).replace(/\.(jpe?g|png|webp)$/i, ''), [k.width, k.height]]));
const isUrl = (s) => typeof s === 'string' && (s.startsWith('/') || s.startsWith('https://'));
const keyOf = (ref) => (typeof ref === 'string' ? ref : ref && typeof ref === 'object' ? ref.lg || ref.sm || '' : '');
const aspectOf = (ref) => {
  if (typeof ref === 'string' && dims[ref]?.[0]) return dims[ref][0] / dims[ref][1];
  if (ref && typeof ref === 'object' && ref.w && ref.h) return ref.w / ref.h;
  return 0;
};
const PEOPLE = /^(couple|wedding|mehendi-hands|bride|groom|portrait)/;
const isCouple = (ref) => !!ref && (typeof ref === 'object' || isUrl(ref) || PEOPLE.test(ref));
const safeColor = (s) => (/^#[0-9a-f]{3,8}$/i.test(String(s)) ? s : null);
const safeHref = (u) => (/^https:\/\//i.test(String(u || '')) ? String(u) : '');
const tel = (p) => String(p).replace(/[^\d+]/g, '');
const portraitAlt = Object.fromEntries((c.portraits || []).filter((p) => p?.photo).map((p) => [keyOf(p.photo), p.alt || '']));
const altFor = (ref, id) => portraitAlt[keyOf(ref)] || (ref && typeof ref === 'object' && ref.alt) || S.alt(id) || `${c.bride.name.en} and ${c.groom.name.en}`;

const imgTag = (ref, alt, sizes, { eager = false } = {}) => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  const ar = aspectOf(ref);
  return `<img src="${esc(sm)}" ${sm !== lg ? `srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w"` : ''} sizes="${sizes}" alt="${esc(alt || '')}" ${ar ? `style="aspect-ratio:${ar.toFixed(4)}"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
};

const TEMPLE = crownSVG('temple');
/** The gold temple-arch frame (the main photo only): the crown sits above the photo, so it is always whole. */
const archFrame = (ref, alt, sizes, { cls = '', eager = false } = {}) => `<figure class="mg-frame mg-frame--temple ${cls}" style="--crown:${(200 / TEMPLE.H).toFixed(4)}">
    <span class="mg-frame__crown" aria-hidden="true">${TEMPLE.svg}</span>
    <span class="mg-frame__body">${imgTag(ref, alt, sizes, { eager })}</span>
  </figure>`;
/** Every other photograph: a plain ivory mat and one thin gold line. */
const plainFrame = (ref, alt, sizes, cls = '') => `<figure class="mg-plain ${cls}">${imgTag(ref, alt, sizes)}</figure>`;

// ───────────────────────── Which photo goes where ─────────────────────────
const used = new Set();
const take = (ref) => { used.add(keyOf(ref)); return ref; };
const fromSlots = (prefix, nums) => {
  const out = [];
  for (const n of nums) {
    const id = `${prefix}.${n}`;
    const ref = S.img(id);
    if (!ref || used.has(keyOf(ref))) continue;
    take(ref);
    out.push({ photo: ref, alt: altFor(ref, id) });
  }
  return out;
};
const leadRef = S.img('couple.lead');
const lead = leadRef ? { photo: take(leadRef), alt: altFor(leadRef, 'couple.lead') } : null;
const pair = fromSlots('couple.pair', [1, 2]);
const row = fromSlots('couple.row', [1, 2, 3]);
const bridePh = S.img('families.bride');
const groomPh = S.img('families.groom');
const brideGroom = !!(bridePh && groomPh && keyOf(bridePh) !== keyOf(groomPh));
if (brideGroom) { take(bridePh); take(groomPh); }
const galCouple = fromSlots('gallery', [1, 2, 3, 4, 5, 6]);
const galMore = (config.gallery || [])
  .filter((g) => g?.photo && !used.has(keyOf(g.photo)) && !/^marigold/.test(keyOf(g.photo)))
  .filter((g, i, a) => a.findIndex((x) => keyOf(x.photo) === keyOf(g.photo)) === i)
  .sort((x, y) => Number(isCouple(y.photo)) - Number(isCouple(x.photo)))
  .map((g) => ({ photo: g.photo, alt: g.alt || '' }));
/** The photo strip: every photograph after the main one, in order. */
const album = [...pair, ...row, ...galCouple, ...galMore].slice(0, 14);

// Ganesh (optional): one cut-out picture. In the gold medallion on the torana, then inside: shown large first
// and softly behind the opening words after that.
const ganeshRef = on(txt('ganesh.show')) ? S.img('hero.ganesh') : null;
const closeGanesh = ganeshRef ? S.img('close.ganesh') : null; // a different Ganesh, seated, between the closing diyos
// The medallion frames his head (doorway.js medalFit).
const medal = (cls = '') => medalHTML(ganeshRef, cls);

// ───────────────────────── Dates ─────────────────────────
function adParts(iso) {
  const en = new Intl.DateTimeFormat('en-GB', { timeZone: timeZone(), weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(new Date(iso));
  const g = (t) => en.find((p) => p.type === t)?.value || '';
  const [wdNe, ...restNe] = dateOf(iso).ne.split(', ');
  return { wd: { en: g('weekday'), ne: wdNe }, day: g('day'), month: { en: `${g('month')} ${g('year')}`, ne: restNe.join(', ') }, full: dateOf(iso) };
}
function bsParts(iso, override) {
  const b = bsDateOf(iso, override);
  let day = null; let month = null; let year = null;
  const m = String(b.short?.ne || '').match(/^(\S+)\s+([०-९]+),\s*([०-९]+)/);
  if (m) [, month, day, year] = m;
  else {
    // a family's own wording, e.g. "वि.सं. २०८३ मंसिर १० गते, बिहिबार"
    const ne = String(b.ne || '');
    const md = ne.match(/([^\s,.०-९]+)\s+([०-९]{1,2})\s*गते/);
    const y = ne.match(/([०-९]{4})/);
    if (md && y) { [, month, day] = md; [, year] = y; }
  }
  const enShort = String(b.short?.en || b.en || '').replace(/^[A-Za-z]+,\s*/, '');
  return { full: b, day, month, year, monthYear: month ? `${month} ${year}` : null, enShort: /B\.S\./.test(enShort) ? enShort : `${enShort} B.S.` };
}
const npDay = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: timeZone() }).format(new Date(iso));
// The wedding ceremony itself: the event on the wedding day (else the wedding date).
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
  today: { en: 'Today, our forever begins', ne: 'आज हाम्रो सदाको यात्रा सुरु हुन्छ' },
  married: { en: 'Married, with your blessings', ne: 'हजुरहरूको आशीर्वादसहित, विवाहित' },
};

const names = () => namesHTML(bi, c);
const symbol = txt('hero.symbol');
const invocation = txt('hero.invocation');
const title = txt('hero.title');
const blessing = txt('hero.blessing');

for (const [k, v] of Object.entries(paperVars().vars)) document.documentElement.style.setProperty(k, v);

const diyo = diyoHTML;
const head = (kicker, h, id, cls = '') => `<header class="mg-head ${cls} mg-rise">${dividerSVG(200)}${kicker ? `<p class="mg-kicker">${bi(kicker)}</p>` : ''}<h2 class="mg-h2" id="${id}">${bi(h)}</h2></header>`;

// The date under the scratch foil: AD and B.S. (B.S. leads in Nepali), the time and the place.
const dateBig = { en: `${mainAD.day} ${mainAD.month.en}`, ne: mainBS.day ? `${mainBS.month} ${mainBS.day} गते` : mainBS.full.ne };
const adNoDay = mainAD.full.ne.split(', ').slice(1).join(', '); // "नोभेम्बर २६, २०२६"
const dateAlt = { en: mainBS.enShort, ne: mainBS.year ? `वि.सं. ${mainBS.year} · ${adNoDay}` : mainAD.full.ne };
const whenLine = mainEv ? timeLabel(mainEv) : null;
const placeLine = mainEv?.venue?.en || mainEv?.venue?.ne ? mainEv.venue : config.city;

const stripFig = (g, i, dup) => `<figure class="mg-ph"><button type="button" class="mg-ph__btn" data-idx="${i}" ${dup ? 'tabindex="-1"' : ''} aria-label="${esc(g.alt || 'Open photograph')}">${imgTag(g.photo, dup ? '' : g.alt, '(max-width: 700px) 70vw, 30vw')}</button></figure>`;
const countCell = (u, label) => `<li class="mg-count__cell"><b class="mg-count__n" data-u="${u}">${bi({ en: '00', ne: '००' })}</b><span class="mg-count__l">${bi(label)}</span></li>`;

// ───────────────────────── Markup ─────────────────────────
// the red card inside the doorway (card.js)
const CARD = cardHTML({
  ganeshRef, symbol, invocation, title, blessing, names: names(),
  cue: `<a class="mg-cue" id="cue" href="#${lead ? 'portrait' : 'date'}"><span>${bi(T.scroll)}</span><i aria-hidden="true"></i></a>`,
}, { ids: true });
const main = document.getElementById('main');
document.body.insertAdjacentHTML('afterbegin', DEFS);
main.innerHTML = `
  <section class="mg-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${CARD.inside}
    ${mix.gate ? '' : doorwayHTML({
    ids: true,
    medal: medal('mg-medal--door'),
    gate: gateHTML({ bi, line: txt('gate.line'), names: names(), open: txt('gate.open'), quiet: txt('gate.quiet') }),
  })}
    ${CARD.content}
  </section>

  ${lead ? `
  <section class="mg-sec mg-portrait" id="portrait" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    <div class="mg-portrait__in mg-rise">${archFrame(lead.photo, lead.alt, '(max-width: 700px) 84vw, 480px')}</div>
  </section>` : ''}

  <section class="mg-sec mg-when" id="date" aria-labelledby="date-title">
    ${head(txt('date.kicker'), txt('date.title'), 'date-title')}
    <div class="mg-scratch mg-rise" id="scratch">
      <div class="mg-scratch__card">
        <div class="mg-scratch__date">
          <p class="mg-scratch__wd">${bi(mainAD.wd)}</p>
          <p class="mg-scratch__big">${bi(dateBig)}</p>
          <p class="mg-scratch__alt">${bi(dateAlt)}</p>
          ${whenLine ? `<p class="mg-scratch__time">${bi(whenLine)}</p>` : ''}
          ${placeLine?.en || placeLine?.ne ? `<p class="mg-scratch__place">${bi(placeLine)}</p>` : ''}
        </div>
        <canvas class="mg-scratch__foil" id="foil" aria-hidden="true"></canvas>
      </div>
      <button class="mg-btn mg-btn--line" type="button" id="reveal">${bi(txt('scratch.button'))}</button>
    </div>
    <div class="mg-count mg-rise" id="count">
      <h3 class="mg-count__title">${bi(txt('count.title'))}</h3>
      <ol class="mg-count__grid" id="countgrid" aria-label="${esc(txt('count.title').en)}">
        ${countCell('d', T.days)}${countCell('h', T.hours)}${countCell('m', T.minutes)}${countCell('s', T.seconds)}
      </ol>
      <p class="mg-count__done" id="countdone" hidden></p>
    </div>
  </section>

  ${album.length ? `
  <section class="mg-sec mg-strip" id="couple" aria-labelledby="couple-title">
    <div class="mg-strip__pin" id="strippin">
    ${head(null, txt('couple.title'), 'couple-title')}
    <p class="mg-lede mg-rise">${bi(txt('couple.line'))}</p>
    <div class="mg-strip__view" id="stripview">
      <div class="mg-strip__track" id="track">
        <div class="mg-strip__set">${album.map((g, i) => stripFig(g, i, false)).join('')}</div>
        <div class="mg-strip__set mg-strip__set--dup" aria-hidden="true">${album.map((g, i) => stripFig(g, i, true)).join('')}</div>
      </div>
    </div>
    </div>
  </section>` : ''}

  <section class="mg-sec mg-fam" id="families" aria-labelledby="fam-title">
    <div class="mg-fam__card mg-rise">
      <img class="mg-fam__toran" src="${DECOR}swag-sm.webp?v=5" srcset="${DECOR}swag-sm.webp?v=5 800w, ${DECOR}swag.webp?v=5 1708w" sizes="(max-width: 700px) 110vw, 1300px" alt="" aria-hidden="true" loading="lazy" decoding="async" />
      <img class="mg-fam__spray mg-fam__spray--tl" src="${DECOR}corner-br-sm.webp?v=5" srcset="${DECOR}corner-br-sm.webp?v=5 400w, ${DECOR}corner-br.webp?v=5 720w" sizes="200px" alt="" aria-hidden="true" loading="lazy" decoding="async" />
      <img class="mg-fam__spray mg-fam__spray--br" src="${DECOR}corner-br-sm.webp?v=5" srcset="${DECOR}corner-br-sm.webp?v=5 400w, ${DECOR}corner-br.webp?v=5 720w" sizes="200px" alt="" aria-hidden="true" loading="lazy" decoding="async" />
      <div class="mg-fam__body">
        ${dividerSVG(180)}
        <h2 class="mg-h2" id="fam-title">${bi(txt('families.title'))}</h2>
        <div class="mg-fam__grid">
          <div class="mg-fam__side">
            ${brideGroom ? plainFrame(bridePh, c.bride.name.en, '(max-width: 700px) 60vw, 240px', 'mg-fam__pic') : ''}
            <p class="mg-kicker">${bi(txt('families.bride'))}</p>
            <p class="mg-fam__name">${bi(c.bride.fullName)}</p>
            ${(c.bride.parents?.en || c.bride.parents?.ne) ? `<p class="mg-fam__of">${bi(txt('families.daughter'))}</p><p class="mg-fam__parents">${bi(c.bride.parents)}</p>` : ''}
            ${(c.bride.home?.en || c.bride.home?.ne) ? `<p class="mg-fam__home">${bi(c.bride.home)}</p>` : ''}
          </div>
          <div class="mg-fam__mid" aria-hidden="true">
            <img class="mg-fam__kalash" src="${DECOR}kalash-sm.webp?v=5" srcset="${DECOR}kalash-sm.webp?v=5 320w, ${DECOR}kalash.webp?v=5 640w" sizes="(max-width: 700px) 120px, 200px" alt="" loading="lazy" decoding="async" />
          </div>
          <div class="mg-fam__side">
            ${brideGroom ? plainFrame(groomPh, c.groom.name.en, '(max-width: 700px) 60vw, 240px', 'mg-fam__pic') : ''}
            <p class="mg-kicker">${bi(txt('families.groom'))}</p>
            <p class="mg-fam__name">${bi(c.groom.fullName)}</p>
            ${(c.groom.parents?.en || c.groom.parents?.ne) ? `<p class="mg-fam__of">${bi(txt('families.son'))}</p><p class="mg-fam__parents">${bi(c.groom.parents)}</p>` : ''}
            ${(c.groom.home?.en || c.groom.home?.ne) ? `<p class="mg-fam__home">${bi(c.groom.home)}</p>` : ''}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="mg-sec mg-card" id="card" aria-labelledby="card-title">
    <article class="mg-card__sheet mg-rise">
      <div class="mg-card__in">
        <p class="mg-kicker mg-kicker--gold">${bi(txt('card.kicker'))}</p>
        <p class="mg-card__shloka" lang="sa">${esc(config.invitation?.shloka?.sa || '')}</p>
        <h2 class="mg-card__line" id="card-title">${bi(txt('card.line'))}</h2>
        <p class="mg-card__hosts">${bi(config.hosts)}</p>
        <button class="mg-btn mg-btn--gold" type="button" data-open-card>${bi(txt('card.button'))}</button>
      </div>
    </article>
  </section>

  <section class="mg-sec mg-prog" id="programme" aria-labelledby="prog-title">
    ${head(txt('prog.kicker'), txt('prog.title'), 'prog-title')}
    <ol class="mg-events">
      ${events.map((e) => {
        const ad = adParts(e.start);
        const bs = bsParts(e.start, e.dateBS);
        const sw = (e.dress?.colors || []).map(safeColor).filter(Boolean);
        const hasDress = !!(e.dress?.text?.en || e.dress?.text?.ne || sw.length);
        return `
      <li class="mg-ev mg-rise" id="ev-${esc(e.id)}">
        <div class="mg-ev__tile" aria-hidden="true">
          <span class="mg-ev__wd">${bi(ad.wd)}</span>
          <span class="mg-ev__day">${bi({ en: ad.day, ne: bs.day || neNum(ad.day) })}</span>
          <span class="mg-ev__my">${bi({ en: ad.month.en, ne: bs.monthYear || ad.month.ne })}</span>
        </div>
        <div class="mg-ev__main">
          <h3 class="mg-ev__title">${bi(e.title)}</h3>
          <p class="mg-ev__when">${bi({ en: ad.full.en, ne: bs.full.ne })}<br />${bi({ en: bs.full.en, ne: ad.full.ne })}</p>
          ${e.blurb ? `<p class="mg-ev__blurb">${bi(e.blurb)}</p>` : ''}
          <dl class="mg-ev__facts">
            <div><dt>${bi(T.time)}</dt><dd>${bi(timeLabel(e))}</dd></div>
            <div><dt>${bi(T.venue)}</dt><dd>${bi(e.venue)} <a class="mg-map" href="${esc(mapUrl(e.mapQuery || e.venue?.en || ''))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (${esc(e.venue?.en || '')}, opens Google Maps)</span></a></dd></div>
            ${hasDress ? `<div><dt>${bi(T.wear)}</dt><dd class="mg-dress">${sw.length ? `<span class="mg-sw" aria-hidden="true">${sw.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(e.dress.text?.en || e.dress.text?.ne ? e.dress.text : T.wear)}</span></dd></div>` : ''}
          </dl>
          ${e.rituals?.length ? `<div class="mg-order"><p class="mg-order__label">${bi(T.order)}</p><ol>${e.rituals.map((r) => `<li><span class="mg-order__t">${bi(typeof r.time === 'string' ? { en: r.time, ne: neNum(r.time) } : r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></div>` : ''}
        </div>
      </li>`;
      }).join('')}
    </ol>
    <div class="mg-prog__foot mg-rise">
      <button class="mg-btn" type="button" id="add-calendar">${bi(T.calendar)}</button>
      ${(config.info?.travel || config.info?.stays?.length || config.info?.contacts?.length) ? `
      <details class="mg-more">
        <summary>${bi(txt('prog.more'))}</summary>
        <div class="mg-more__grid">
          ${config.info?.travel ? `<div><h3>${bi(T.travel)}</h3><p>${bi(config.info.travel)}</p></div>` : ''}
          ${config.info?.stays?.length ? `<div><h3>${bi(T.stays)}</h3><ul>${config.info.stays.map((s) => `<li><b>${bi(s.name)}</b><small>${bi(s.note)}</small><a class="mg-map" href="${esc(mapUrl(s.mapQuery || s.name.en))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span></a></li>`).join('')}</ul></div>` : ''}
          ${config.info?.contacts?.length ? `<div><h3>${bi(T.contacts)}</h3><ul>${config.info.contacts.map((p) => `<li><b>${bi(p.name)}</b><small>${bi(p.role)}</small><span class="mg-links"><a class="mg-map" href="tel:${esc(tel(p.phone))}">${bi(T.call)}</a><a class="mg-map" href="https://wa.me/${esc(tel(p.phone).replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span></li>`).join('')}</ul>
            ${safeHref(config.info.livestream) ? `<a class="mg-map" href="${esc(safeHref(config.info.livestream))}" target="_blank" rel="noopener">${bi(T.live)} ↗</a>` : ''}</div>` : ''}
        </div>
      </details>` : ''}
    </div>
  </section>

  <section class="mg-sec mg-rsvp" id="rsvp" aria-labelledby="rsvp-title">
    <div class="mg-rsvp__in">
      <div class="mg-rsvp__note mg-rise">
        ${dividerSVG(200)}
        <p class="mg-kicker mg-kicker--gold">${bi(countLine)}</p>
        <h2 class="mg-h2 mg-h2--gold" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
        ${(config.rsvp?.deadline?.en || config.rsvp?.deadline?.ne) ? `<p class="mg-lede mg-lede--light">${bi(config.rsvp.deadline)}</p>` : ''}
        <p><button class="mg-link" type="button" id="share">${bi(T.shareIt)}</button></p>
      </div>
      <div class="mg-rsvp__card mg-rise">
        <form class="rsvp mg-form" id="rsvp-form" novalidate>
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
            <div class="mg-form__row">
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
          <button class="mg-btn" type="submit" id="rsvp-submit">${bi(txt('rsvp.send'))}</button>
          <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
        </form>
      </div>
    </div>
  </section>

  <footer class="mg-close" aria-label="Blessing">
    <div class="mg-close__garland" aria-hidden="true"><img src="${DECOR}swag-sm.webp?v=5" srcset="${DECOR}swag-sm.webp?v=5 800w, ${DECOR}swag.webp?v=5 1708w" sizes="100vw" alt="" loading="lazy" decoding="async" /></div>
    <div class="mg-close__row">
      <div class="mg-close__lamp">${diyo('mg-diyo--close', 120)}</div>
      <div class="mg-close__text mg-rise">
        ${closeGanesh ? `<figure class="mg-close__gan" aria-hidden="true"><i class="mg-close__glow"></i><img src="${esc(photoUrl(closeGanesh, 'sm'))}" srcset="${esc(photoUrl(closeGanesh, 'sm'))} 500w, ${esc(photoUrl(closeGanesh, 'lg'))} 1000w" sizes="260px" alt="" loading="lazy" decoding="async" /></figure>` : ''}
        <p class="mg-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
        <p class="mg-close__en l-en">${esc(config.closing?.en || '')}</p>
        <p class="mg-close__names">${names()}</p>
        ${c.hashtag ? `<p class="mg-close__tag">${esc(c.hashtag)}</p>` : ''}
      </div>
      <div class="mg-close__lamp">${diyo('mg-diyo--close', 120)}</div>
    </div>
    <div class="mg-band" aria-hidden="true"></div>
    ${madeWith()}
  </footer>

  <div class="mg-modal" id="cardmodal" hidden role="dialog" aria-modal="true" aria-labelledby="cm-title" data-lenis-prevent>
    <div class="mg-modal__panel" id="cm-panel">
      <button class="mg-modal__x" type="button" data-close><span aria-hidden="true">×</span><span class="sr-only">${esc(T.close.en)}</span></button>
      ${on(symbol) ? `<p class="mg-modal__sym" lang="ne">${esc(symbol.ne || symbol.en)}</p>` : ''}
      <p class="mg-modal__shloka" lang="sa">${esc(config.invitation?.shloka?.sa || '')}</p>
      <p class="mg-modal__shloka-en l-en">${esc(config.invitation?.shloka?.en || '')}</p>
      <h2 class="mg-modal__title" id="cm-title"><span lang="ne">${esc(title.ne)}</span></h2>
      <p class="mg-modal__p">${bi(config.invitation?.salutation || '')}</p>
      <p class="mg-modal__p">${bi(config.invitation?.body || '')}</p>
      <p class="mg-modal__p">${bi(config.invitation?.request || '')}</p>
      <dl class="mg-modal__when">
        <div><dt>${bi({ en: 'Date', ne: 'मिति' })}</dt><dd>${bi(dateOf(mainIso))}<br />${bi({ en: mainBS.full.en, ne: mainBS.full.ne })}</dd></div>
        <div><dt>${bi({ en: 'Place', ne: 'स्थान' })}</dt><dd>${bi(config.city)}</dd></div>
      </dl>
      <p class="mg-modal__sign">${bi(config.invitation?.signoff || '')}<br /><b>${bi(config.hosts)}</b></p>
    </div>
  </div>

  <div class="mg-lb" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photograph" data-lenis-prevent>
    <button type="button" class="mg-lb__btn mg-lb__x" data-lb="close"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <button type="button" class="mg-lb__btn mg-lb__prev" data-lb="prev"><span aria-hidden="true">←</span><span class="sr-only">Previous</span></button>
    <figure class="mg-lb__fig"><img alt="" decoding="async" /></figure>
    <button type="button" class="mg-lb__btn mg-lb__next" data-lb="next"><span aria-hidden="true">→</span><span class="sr-only">Next</span></button>
  </div>`;


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
  document.getElementById('track')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-idx]');
    if (!b) return;
    show(Number(b.dataset.idx));
    release = openModal(lb, { onClose: close });
    requestAnimationFrame(() => lb.classList.add('is-open'));
  });
  lb.addEventListener('click', (e) => {
    const act = e.target.closest('[data-lb]')?.dataset.lb;
    if (act === 'close' || e.target === lb) close();
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

// ───────────────────────── The doorway: layout at the exact screen size ─────────────────────────
const hero = document.querySelector('.mg-hero');
// Another theme's first screen takes the red card's place; Mangal's calm scroll continues below it.
if (!ownHero) mix.mountHero(hero);
const C = ownHero ? cardRefs(hero) : {};
const { pcontent, pinner, htext, ganEl, ganImg, ganGlow } = C;
const inside = C.inside || null;
const root = document.documentElement;
// The doorway's elements (doorway.js); none when another theme's gate opens the page.
const D = mix.gate ? null : doorRefs(hero);
const gate = D?.gate || null;
const leafL = D?.leafL;
const leafR = D?.leafR;
const spillEl = D?.spill;
const openBtn = D ? document.getElementById('open') : null;
const quietBtn = D ? document.getElementById('quiet') : null;
let L = null;

/** The opening words inside: they shrink a little only when they must (card.js). */
const fitContent = () => { if (ownHero) fitCard(C); };

function applyLayout() {
  const W = root.clientWidth;
  const H = window.innerHeight;
  L = computeLayout(W, H, ganeshRef);
  if (!ownHero) return;
  hero.style.height = `${H}px`;
  root.style.setProperty('--mg-thr', `${L.thr}px`);
  if (D) layoutDoorway(D, L, root);
  Object.assign(pcontent.style, { top: `${L.ctop}px`, bottom: `${L.cbottom}px` });
  fallEl?.style.setProperty('--fall', `${H}px`);
  fitContent();
  maskFall();
}

// ───────────────────────── A light fall of petals over the doorway and the opening card ─────────────────────────
// A few rose and marigold petals and the odd leaf drift down from the top, slowly, swaying (CSS transforms only).
// Paused when the tab is hidden or the doorway is scrolled away; none at all under reduced motion.
const fallEl = (() => {
  if (reduced || !ownHero) return null;
  const box = fallBox(root.clientWidth < 700);
  hero.append(box);
  const sync = (off) => box.classList.toggle('is-off', off);
  let heroOff = false;
  new IntersectionObserver(([e]) => { heroOff = !e.isIntersecting; sync(heroOff || document.hidden); }).observe(hero);
  document.addEventListener('visibilitychange', () => sync(heroOff || document.hidden));
  return box;
})();
/** On the doorway the petals pass behind the plaque and the two buttons, never over their words. */
const maskFall = () => maskFallIn(fallEl, hero, gate);

// ───────────────────────── Opening: the doors swing open ─────────────────────────
document.body.classList.add('mg-locked');
window.scrollTo(0, 0);
// Another theme's gate covers the page: Mangal waits inside its doorway, the words hidden until the gate opens.
if (!D && ownHero) { hero.classList.add('is-inside'); gsap.set(inside, { autoAlpha: 1 }); }
applyLayout();
document.fonts?.ready.then(() => { if (gate) fitGate(gate); fitContent(); maskFall(); });
if (D) {
  openBtn.disabled = false;
  quietBtn.disabled = false;
  document.body.classList.add('is-ready');
}

let opened = false;
let finished = false;

function dropPetals() {
  if (reduced) return;
  dropPetalsIn(L);
}

function open(withMusic) {
  if (opened) return;
  opened = true;
  try {
    player.unlock();
    if (withMusic) ringBell(player.ctx, { when: 0.05, gain: 0.22 });
    player.start(withMusic);
  } catch { /* audio is optional */ }
  document.body.classList.add('is-opening');
  const tl = reduced ? crossfadeIn() : walkIn();
  // Never leave the page locked: if the timeline is starved (hidden tab, throttled device), finish it.
  setTimeout(() => { if (!finished) tl.progress(1); }, (tl.duration() + 2.5) * 1000);
}

// Walking in: a forward dolly through the gate (doorway.js openDoors; each layer at its own depth).
const DEPTH = D ? depthOf(D) : [];

/** Inside: Shri Ganesh first, large and glowing (from `at`), then softly behind the words, which settle in (card.js). */
const cardIn = (tl, at) => cardInP(tl, at, C, { phone: L.phone, cue: '#cue' });

function walkIn() {
  const tl = gsap.timeline({ onComplete: afterOpen });
  tl.to(gate, { autoAlpha: 0, y: -8, duration: 0.45, ease: 'power2.out' }, 0);
  const { DOLLY_AT, end } = openDoors(tl, D, L, { depth: DEPTH, petals: dropPetals });
  // as we step through, the glare settles to a warm glow for Ganesh
  tl.to('#gap', { opacity: 0, duration: 1.2, ease: 'power1.inOut' }, DOLLY_AT + 0.1)
    .to('#light', { opacity: 0.22, duration: 1.4, ease: 'power1.inOut' }, DOLLY_AT + 0.2)
    .to(spillEl, { opacity: 0, duration: 1, ease: 'power1.inOut' }, DOLLY_AT + 0.3)
    .fromTo(inside, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.55, ease: 'power1.inOut' }, end - 0.55)
    .add(() => hero.classList.add('is-inside'), end + 0.02);
  cardIn(tl, end - 0.3);
  return tl;
}

/** Reduced motion: no camera move; the doorway gives way to the card in a crossfade. */
function crossfadeIn() {
  const tl = gsap.timeline({ onComplete: afterOpen });
  tl.to(gate, { autoAlpha: 0, duration: 0.25 }, 0)
    .fromTo(inside, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power1.inOut' }, 0.1)
    .add(() => hero.classList.add('is-inside'), 0.62);
  cardStill(tl, 0.6, C, { cue: '#cue' });
  return tl;
}

openBtn?.addEventListener('click', () => open(true));
quietBtn?.addEventListener('click', () => open(false));

let lenis = null;
function afterOpen() {
  if (finished) return;
  finished = true;
  if (ownHero) hero.classList.add('is-inside');
  document.body.classList.remove('mg-locked', 'is-opening');
  document.body.classList.add('is-open');
  if (gate) gate.hidden = true;
  lenis = createSmooth();
  revealOnScroll();
  scrollStory();
  photoStrip();
  if (ownHero) document.getElementById('cue').addEventListener('click', (e) => {
    e.preventDefault();
    const y = document.getElementById(lead ? 'portrait' : 'date').getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  });
}

// ───────────────────────── Another theme's gate (mix) ─────────────────────────
// Its overlay covers the page until it has opened; the card then comes in as it does after the walk (Ganesh large
// and glowing, settling behind the words), and afterOpen() runs once the overlay is gone.
const mixRun = mix.gate ? mix.mountGate({
  start(withMusic) {
    opened = true;
    document.body.classList.add('is-opening');
    player.unlock();
    if (withMusic) ringBell(player.ctx, { when: 0.05, gain: 0.22 });
    player.start(withMusic);
  },
  intro(tl, at) {
    if (mix.heroInst) mix.heroEnter(tl, at);
    else if (reduced) cardStill(tl, at, C, { cue: '#cue' });
    else cardIn(tl, at);
  },
  finish: () => afterOpen(),
}) : null;

// ───────────────────────── Scratch to reveal the date ─────────────────────────
(function scratchCard() {
  const wrap = document.getElementById('scratch');
  const cv = document.getElementById('foil');
  const btn = document.getElementById('reveal');
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  let revealed = false; let drawn = false; let moves = 0; let last = null; let dpr = 1;
  const hint = txt('scratch.hint');
  const lang = () => (root.dataset.lang === 'ne' ? 'ne' : 'en');
  function paint() {
    if (revealed) return;
    const r = cv.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const w = cv.width; const h = cv.height;
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createLinearGradient(0, 0, w, h);
    [[0, '#B9862E'], [0.18, '#F3D58A'], [0.36, '#C9963F'], [0.52, '#FCEDB9'], [0.7, '#B57E22'], [0.86, '#E8C26B'], [1, '#9C6A1E']].forEach(([o, col]) => g.addColorStop(o, col));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // fine foil grain
    for (let i = 0; i < (w * h) / 900; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,248,220,.35)' : 'rgba(110,70,10,.18)';
      ctx.fillRect(Math.random() * w, Math.random() * h, dpr, dpr);
    }
    // a gold rule and the hint, embossed
    const m = 12 * dpr;
    ctx.strokeStyle = 'rgba(106,63,12,.55)'; ctx.lineWidth = 1.2 * dpr; ctx.strokeRect(m, m, w - 2 * m, h - 2 * m);
    ctx.strokeStyle = 'rgba(255,244,207,.6)'; ctx.strokeRect(m + 4 * dpr, m + 4 * dpr, w - 2 * m - 8 * dpr, h - 2 * m - 8 * dpr);
    const ne = lang() === 'ne';
    const size = Math.round(Math.min(w / (ne ? 11 : 14), 30 * dpr));
    ctx.font = ne ? `400 ${size}px 'Yatra One', Mukta, serif` : `600 ${size}px 'Cormorant Garamond', Georgia, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const line = ne ? (hint.ne || hint.en) : hint.en;
    ctx.fillStyle = 'rgba(255,246,214,.75)'; ctx.fillText(line, w / 2 + dpr, h / 2 + dpr * 1.5);
    ctx.fillStyle = '#5C3A08'; ctx.fillText(line, w / 2, h / 2);
    // a fine gold rule with a diamond above and below the hint
    ctx.strokeStyle = 'rgba(92,58,8,.55)'; ctx.fillStyle = 'rgba(92,58,8,.7)'; ctx.lineWidth = dpr;
    for (const dy of [-size * 1.15, size * 1.15]) {
      const y = h / 2 + dy; const hw = Math.min(w * 0.2, size * 3.2);
      ctx.beginPath(); ctx.moveTo(w / 2 - hw, y); ctx.lineTo(w / 2 - size * 0.4, y); ctx.moveTo(w / 2 + size * 0.4, y); ctx.lineTo(w / 2 + hw, y); ctx.stroke();
      const d = size * 0.18; ctx.beginPath(); ctx.moveTo(w / 2, y - d); ctx.lineTo(w / 2 + d, y); ctx.lineTo(w / 2, y + d); ctx.lineTo(w / 2 - d, y); ctx.closePath(); ctx.fill();
    }
    drawn = true; moves = 0;
  }
  function cleared() {
    const { width: w, height: h } = cv;
    const step = Math.max(4, Math.round(8 * dpr));
    const data = ctx.getImageData(0, 0, w, h).data;
    let n = 0; let z = 0;
    for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) { n++; if (data[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] < 40) z++; }
    return n ? z / n : 0;
  }
  function reveal() {
    if (revealed) return;
    revealed = true;
    wrap.classList.add('is-revealed');
    btn.hidden = true;
    if (!reduced) gsap.fromTo(wrap.querySelector('.mg-scratch__date'), { scale: 0.97 }, { scale: 1, duration: 0.6, ease: 'power3.out' });
    setTimeout(() => { cv.hidden = true; }, 700);
  }
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr]; };
  function scratch(e) {
    if (revealed || !drawn) return;
    const [x, y] = pos(e);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(34, Math.min(56, cv.width / dpr / 9)) * dpr;
    ctx.beginPath();
    if (last) ctx.moveTo(last[0], last[1]); else ctx.moveTo(x - 0.1, y);
    ctx.lineTo(x, y); ctx.stroke();
    last = [x, y];
    if (++moves % 6 === 0 && cleared() >= 0.6) reveal();
  }
  cv.addEventListener('pointerdown', (e) => { if (revealed) return; e.preventDefault(); cv.setPointerCapture?.(e.pointerId); last = null; wrap.classList.add('is-scratching'); scratch(e); });
  cv.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch' || e.pressure > 0) { if (cv.hasPointerCapture?.(e.pointerId) || e.buttons) scratch(e); } });
  const up = () => { last = null; if (!revealed && drawn && cleared() >= 0.6) reveal(); };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  btn.addEventListener('click', reveal);
  document.fonts?.ready.then(paint);
  paint();
  let rw = 0;
  new ResizeObserver(() => { const w = cv.getBoundingClientRect().width; if (w && Math.abs(w - rw) > 1) { rw = w; paint(); } }).observe(cv);
  document.addEventListener('langchange', () => { if (!revealed) paint(); });
  if (DEBUG) window.__mgScratch = { cleared, reveal, isRevealed: () => revealed };
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

// ───────────────────────── The photo strip: moves right to left ─────────────────────────
function photoStrip() {
  const view = document.getElementById('stripview');
  const track = document.getElementById('track');
  if (!view || !track) return;
  const set0 = track.querySelector('.mg-strip__set');
  if (reduced) { view.classList.add('is-static'); return; }
  const mm = gsap.matchMedia();
  // Desktop: the strip is tied to the scroll (scrubbed), uncropped photographs in plain mounts.
  mm.add('(min-width: 900px) and (pointer: fine)', () => {
    view.classList.add('is-scroll');
    const dist = () => Math.max(0, set0.scrollWidth - view.clientWidth);
    const pin = document.getElementById('strippin');
    // The strip holds still in the middle of the screen while the photographs pass (when it fits the screen).
    const tw = pin.offsetHeight < window.innerHeight * 0.96
      ? gsap.fromTo(track, { x: 0 }, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: pin, start: 'center center', end: () => `+=${Math.round(dist() * 0.8)}`, pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true },
      })
      : gsap.fromTo(track, { x: () => Math.min(view.clientWidth * 0.12, dist() * 0.3) }, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: view, start: 'top 92%', end: 'bottom 8%', scrub: 0.7, invalidateOnRefresh: true },
      });
    return () => { view.classList.remove('is-scroll'); tw.scrollTrigger?.kill(); tw.kill(); gsap.set(track, { clearProps: 'transform' }); };
  });
  // Phones and tablets: a native horizontal scroller that drifts right to left on its own and can be
  // swiped by hand at any time (auto-drift pauses while touched and resumes a moment later). Two identical
  // sets make it endless: past the first set it jumps back by one set width, invisibly.
  mm.add('(max-width: 899px), (pointer: coarse), (pointer: none)', () => {
    view.classList.add('is-swipe');
    const PX_PER_S = 34;
    let raf = 0, last = 0, held = false, resumeAt = 0, visible = true, pos = view.scrollLeft;
    const wrap = () => { const w = set0.offsetWidth; if (w > 0) { if (view.scrollLeft >= w) view.scrollLeft -= w; else if (view.scrollLeft <= 0 && held) view.scrollLeft += w; } };
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (!visible || held || now < resumeAt) { pos = view.scrollLeft; return; }
      pos += PX_PER_S * dt; view.scrollLeft = pos; // sub-pixel accumulator: scrollLeft rounds on some phones
      if (view.scrollLeft >= set0.offsetWidth) { pos -= set0.offsetWidth; view.scrollLeft = pos; }
    };
    // A finger on the strip takes over; the drift comes back 1.2s after letting go, however the touch
    // ended (released outside the strip, cancelled by a page scroll, window blur): it never stays stopped.
    let holdTimer = 0;
    const release = () => { if (!held) return; held = false; clearTimeout(holdTimer); resumeAt = performance.now() + 1200; pos = view.scrollLeft; };
    const hold = () => { held = true; clearTimeout(holdTimer); holdTimer = setTimeout(release, 6000); };
    view.addEventListener('pointerdown', hold, { passive: true });
    view.addEventListener('touchstart', hold, { passive: true });
    for (const ev of ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'blur']) window.addEventListener(ev, release, { passive: true });
    document.addEventListener('visibilitychange', release);
    view.addEventListener('scroll', () => { if (held || performance.now() < resumeAt) wrap(); }, { passive: true });
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; last = 0; });
    io.observe(view);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); view.classList.remove('is-swipe'); };
  });
  let rt;
  track.querySelectorAll('img').forEach((im) => im.addEventListener('load', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);
  }, { once: true }));
}

// ───────────────────────── The scroll: panels rise, ornament layers settle ─────────────────────────
function revealOnScroll() {
  const els = document.querySelectorAll('.mg-rise');
  if (reduced) { els.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -6% 0px' });
  els.forEach((el) => io.observe(el));
}

function scrollStory() {
  if (reduced) return;
  const mm = gsap.matchMedia();
  // Depth only on larger screens with a fine pointer: phones get the plain reveals (no parallax).
  mm.add('(min-width: 900px) and (pointer: fine)', () => {
    if (ownHero) {
      const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 };
      gsap.to(inside, { scale: 1.1, ease: 'none', scrollTrigger: st });
      gsap.to([pinner, ganEl].filter(Boolean), { scale: 1.05, opacity: 0.3, ease: 'none', scrollTrigger: st });
      gsap.to('#cue', { opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '20% top', scrub: true } });
    }
    document.querySelectorAll('[data-depth]').forEach((el) => {
      const d = Number(el.dataset.depth) || 0.5;
      gsap.fromTo(el, { y: 90 * d }, { y: -50 * d, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
    });
    document.querySelectorAll('[data-settle]').forEach((el) => {
      const d = Number(el.dataset.settle) || 0.5;
      gsap.fromTo(el, { y: 60 * d, scale: 1 - 0.015 * d }, { y: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'top 35%', scrub: 0.8 } });
    });
  });
}

// Keep the doorway right when the width changes (the iOS address bar only changes the height).
let rw = root.clientWidth;
let rt;
window.addEventListener('resize', () => {
  const w = root.clientWidth;
  if (w === rw && finished) return;
  rw = w;
  clearTimeout(rt);
  rt = setTimeout(() => { applyLayout(); if (finished) ScrollTrigger.refresh(); }, 120);
});

// ───────────────────────── Debug hook (screenshots) ─────────────────────────
if (DEBUG) {
  window.__mg = {
    gsap, ScrollTrigger,
    layout: () => L,
    lenis: () => lenis,
    open: () => (mixRun ? mixRun.open(false) : open(false)),
    at: (t) => (mixRun ? mixRun.at(t) : -1),
    finish: () => {
      if (mixRun) { mixRun.finish(); return; }
      opened = true;
      gsap.set(gate, { autoAlpha: 0 });
      gsap.set(leafL, { rotationY: 80 }); gsap.set(leafR, { rotationY: -80 });
      gsap.set('.mg-leaf__shade', { opacity: 0.5 });
      gsap.set(inside, { autoAlpha: 1 });
      if (ganEl) { gsap.set(ganImg, { opacity: WATERMARK }); gsap.set(ganGlow, { opacity: 0.4 }); }
      gsap.set([pinner, '#cue'], { opacity: 1, scale: 1 });
      afterOpen();
    },
    seek: (deg) => { if (!D) return; gsap.set(leafL, { rotationY: deg }); gsap.set(leafR, { rotationY: -deg }); },
    to: (sel, offset = 0) => {
      const el = document.querySelector(sel);
      const y = el.getBoundingClientRect().top + window.scrollY + offset;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
      document.querySelectorAll('.mg-rise').forEach((n) => n.classList.add('is-in'));
      ScrollTrigger.update();
    },
  };
  if (params.has('open')) window.__mg.finish();
}
