// The card suite: one engine behind five clean, Canva-card-like themes (Laali, Mehendi, Hariyo, Shree, Pardaa).
// The engine owns the data, the sections and their behaviour (date, countdown, families, programme, photos, the
// full card, RSVP, lightbox, music, the opening's lock and safety net). Each theme supplies only what makes it
// itself: its gate scene and opening motion, its hero, its ornaments, its fonts and palette (theme CSS).
import '../../core/base.css';
import './suite.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
import { initScratch } from './scratch.js';

gsap.registerPlugin(ScrollTrigger);
// a reload must start at the gate, not at a restored scroll position (ScrollTrigger re-enables 'auto' itself)
ScrollTrigger.clearScrollMemory('manual');

const UI = {
  map: { en: 'Map', ne: 'नक्सा' }, time: { en: 'Time', ne: 'समय' }, venue: { en: 'Venue', ne: 'स्थान' }, wear: { en: 'Wear', ne: 'पहिरन' },
  call: { en: 'Call', ne: 'फोन' }, calendar: { en: 'Add to calendar', ne: 'क्यालेन्डरमा थप्नुहोस्' }, shareIt: { en: 'Share', ne: 'पठाउनुहोस्' },
  close: { en: 'Close', ne: 'बन्द' }, scroll: { en: 'Scroll', ne: 'तल हेर्नुहोस्' }, days: { en: 'Days', ne: 'दिन' }, hours: { en: 'Hours', ne: 'घण्टा' },
  minutes: { en: 'Minutes', ne: 'मिनेट' }, seconds: { en: 'Seconds', ne: 'सेकेन्ड' }, today: { en: 'Today, our forever begins', ne: 'आज हाम्रो सदाको यात्रा सुरु हुन्छ' },
  married: { en: 'Married, with your blessings', ne: 'हजुरहरूको आशीर्वादसहित, विवाहित' }, stays: { en: 'Where to stay', ne: 'बसाइ' },
  travel: { en: 'Getting there', ne: 'आउने बाटो' }, contacts: { en: 'Questions', ne: 'सोधपुछ' }, more: { en: 'Travel, stays and contacts', ne: 'यात्रा, बसाइ र सम्पर्क' },
  order: { en: 'Order of the day', ne: 'दिनको क्रम' }, live: { en: 'Watch the ceremony live', ne: 'प्रत्यक्ष हेर्नुहोस्' },
  daughter: { en: 'Daughter of', ne: 'सुपुत्री' }, son: { en: 'Son of', ne: 'सुपुत्र' }, bride: { en: 'The bride', ne: 'दुलही' }, groom: { en: 'The groom', ne: 'दुलहा' },
  name: { en: 'Your name', ne: 'हजुरको नाम' }, coming: { en: 'Will you come?', ne: 'आउनुहुन्छ?' }, yes: { en: 'Joyfully, yes', ne: 'अवश्य आउँछौं' },
  no: { en: 'With love, from afar', ne: 'टाढैबाट शुभकामना' }, guests: { en: 'Guests', ne: 'पाहुना' }, phone: { en: 'Phone', ne: 'फोन' },
  events: { en: 'Which events?', ne: 'कुन कार्यक्रम?' }, meal: { en: 'Meal', ne: 'खाना' }, veg: { en: 'Vegetarian', ne: 'शाकाहारी' },
  nonveg: { en: 'Non-vegetarian', ne: 'मांसाहारी' }, message: { en: 'A note for the couple (optional)', ne: 'दम्पतीलाई सन्देश (ऐच्छिक)' },
  date: { en: 'Date', ne: 'मिति' }, place: { en: 'Place', ne: 'स्थान' },
};

const isOff = (v) => !v || /^\s*(-|–|none|off|no|hide)\s*$/i.test(v);
const on = (o) => !!o && (!isOff(o.en) || !isOff(o.ne));
const safeColor = (s) => (/^#[0-9a-f]{3,8}$/i.test(String(s)) ? s : null);
const safeHref = (u) => (/^https:\/\//i.test(String(u || '')) ? String(u) : '');
const tel = (p) => String(p).replace(/[^\d+]/g, '');
const keyOf = (ref) => (typeof ref === 'string' ? ref : ref && typeof ref === 'object' ? ref.lg || ref.sm || '' : '');

function adParts(iso) {
  const en = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(new Date(iso));
  const g = (t) => en.find((p) => p.type === t)?.value || '';
  const [wdNe, ...restNe] = dateOf(iso).ne.split(', ');
  const t = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)).replace(/\s?([ap])m$/i, (m, x) => ` ${x.toUpperCase()}M`);
  return { wd: { en: g('weekday'), ne: wdNe }, day: g('day'), month: { en: g('month'), ne: restNe.join(', ').split(' ')[0] || '' }, year: g('year'), monthYear: { en: `${g('month')} ${g('year')}`, ne: restNe.join(', ') }, full: dateOf(iso), time: t };
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
  return { full: b, day, month, year };
}
const npDay = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(new Date(iso));

/** Mount a suite theme. `T` is the theme's spec (see any of the five themes' main.js). */
export async function mountSuite(T) {
  const config = await loadInvitation();
  const params = new URLSearchParams(location.search);
  const DEBUG = params.has('debug');
  const reduced = reducedMotion() || params.has('still');
  const c = config.couple;
  const events = guestEvents();
  const S = useSlots(T.manifest);
  const txt = S.txt;
  const root = document.documentElement;

  // ───────── photographs (the couple, never cropped) ─────────
  const portraitAlt = Object.fromEntries((c.portraits || []).filter((p) => p?.photo).map((p) => [keyOf(p.photo), p.alt || '']));
  const altFor = (ref, id) => portraitAlt[keyOf(ref)] || (ref && typeof ref === 'object' && ref.alt) || S.alt(id) || `${c.bride.name.en} and ${c.groom.name.en}`;
  const imgTag = (ref, alt, sizes, { eager = false, cls = '' } = {}) => `<img class="${cls}" src="${esc(photoUrl(ref, 'sm'))}" srcset="${esc(photoUrl(ref, 'sm'))} 1280w, ${esc(photoUrl(ref, 'lg'))} 2560w" sizes="${sizes}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
  const used = new Set();
  const take = (ref) => { used.add(keyOf(ref)); return ref; };
  const leadRef = S.img('couple.lead');
  const lead = leadRef ? { photo: take(leadRef), alt: altFor(leadRef, 'couple.lead') } : null;
  const album = [];
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const ref = S.img(`gallery.${n}`);
    if (ref && !used.has(keyOf(ref))) album.push({ photo: take(ref), alt: altFor(ref, `gallery.${n}`) });
  }
  for (const g of config.gallery || []) if (g?.photo && !used.has(keyOf(g.photo))) album.push({ photo: take(g.photo), alt: g.alt || '' });
  const photos = album.slice(0, 9);
  const bridePh = S.img('families.bride');
  const groomPh = S.img('families.groom');
  const brideGroom = !!(bridePh && groomPh && keyOf(bridePh) !== keyOf(groomPh));

  // ───────── Ganesh (optional, this theme's own picture) ─────────
  const ganeshRef = on(txt('ganesh.show')) ? S.img('hero.ganesh') : null;
  const ganesh = (cls = '', sizes = '200px') => (ganeshRef
    ? `<img class="su-ganesh ${cls}" src="${esc(photoUrl(ganeshRef, 'sm'))}" srcset="${esc(photoUrl(ganeshRef, 'sm'))} 400w, ${esc(photoUrl(ganeshRef, 'lg'))} 1000w" sizes="${sizes}" alt="${esc(S.alt('hero.ganesh') || 'Shri Ganesh')}" decoding="async" />`
    : '');

  // ───────── the day ─────────
  const mainEv = events.find((e) => e?.start && npDay(e.start) === npDay(config.weddingDate)) || null;
  const mainIso = mainEv?.start || config.weddingDate;
  const AD = adParts(mainIso);
  const BS = bsParts(mainIso, mainEv?.dateBS || config.weddingDateBS);
  const target = new Date(mainIso).getTime();
  const placeLine = mainEv?.venue?.en || mainEv?.venue?.ne ? mainEv.venue : config.city;

  const names = (amp = '&amp;') => `<span class="su-n">${bi(c.bride.name)}</span><span class="su-amp" aria-hidden="true">${amp}</span><span class="sr-only">and</span><span class="su-n">${bi(c.groom.name)}</span>`;
  /** the date as Canva cards print it: weekday | DAY | time, the month and year above, the B.S. date below */
  const dateStrip = () => `<div class="su-strip">
      <p class="su-strip__month">${bi({ en: AD.month.en, ne: BS.month || AD.month.ne })}</p>
      <div class="su-strip__row">
        <span class="su-strip__side">${bi(AD.wd)}</span>
        <span class="su-strip__day">${bi({ en: AD.day, ne: BS.day || neNum(AD.day) })}</span>
        <span class="su-strip__side">${bi({ en: mainEv ? AD.time : AD.year, ne: mainEv ? timeLabel(mainEv).ne : (BS.year || neNum(AD.year)) })}</span>
      </div>
      <p class="su-strip__year">${bi({ en: AD.year, ne: BS.year || neNum(AD.year) })}</p>
      <p class="su-strip__alt">${bi({ en: BS.full.short?.en ? (/B\.S\./.test(BS.full.short.en) ? BS.full.short.en : `${BS.full.short.en} B.S.`) : BS.full.en, ne: AD.full.ne })}</p>
    </div>`;
  const ctx = { config, c, S, txt, bi, esc, names, ganesh, ganeshRef, dateStrip, AD, BS, placeLine, mainEv, lead, imgTag, photoUrl, reduced, art: T.art, on };
  const D = T.deco || {};
  const head = (h, id, kicker) => `<header class="su-head su-rise">${D.divider || ''}${kicker && on(kicker) ? `<p class="su-kicker">${bi(kicker)}</p>` : ''}<h2 class="su-h2" id="${id}">${bi(h)}</h2></header>`;
  const countCell = (u, label) => `<li class="su-count__cell"><b class="su-count__n" data-u="${u}">${bi({ en: '00', ne: '००' })}</b><span class="su-count__l">${bi(label)}</span></li>`;

  // ───────── the toolkit a theme composes its own page from (T.page) ─────────
  const rsvpForm = () => `
      <form class="rsvp su-form" id="rsvp-form" novalidate>
        <div class="su-field"><label for="f-name">${bi(UI.name)}</label><input id="f-name" name="name" type="text" autocomplete="name" required maxlength="80" /><p class="su-err" id="f-name-err" role="alert"></p></div>
        <fieldset class="su-field"><legend>${bi(UI.coming)}</legend><div class="su-choices">
          <label class="choice"><input type="radio" name="attending" value="yes" checked /><span>${bi(UI.yes)}</span></label>
          <label class="choice"><input type="radio" name="attending" value="no" /><span>${bi(UI.no)}</span></label></div></fieldset>
        <div class="rsvp__when-yes">
          <div class="su-row">
            <div class="su-field"><label for="f-guests">${bi(UI.guests)}</label><select id="f-guests" name="guests"></select></div>
            <div class="su-field"><label for="f-phone">${bi(UI.phone)}</label><input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" /></div>
          </div>
          <fieldset class="su-field"><legend>${bi(UI.events)}</legend><div class="su-choices" id="f-events"></div></fieldset>
          <fieldset class="su-field"><legend>${bi(UI.meal)}</legend><div class="su-choices">
            <label class="choice"><input type="radio" name="meal" value="veg" /><span>${bi(UI.veg)}</span></label>
            <label class="choice"><input type="radio" name="meal" value="nonveg" checked /><span>${bi(UI.nonveg)}</span></label></div></fieldset>
        </div>
        <div class="su-field"><label for="f-msg">${bi(UI.message)}</label><textarea id="f-msg" name="message" rows="2" maxlength="500"></textarea></div>
        <div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>
        <button class="su-btn" type="submit" id="rsvp-submit">${bi(txt('rsvp.send'))}</button>
        <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
      </form>`;
  const P = {
    UI,
    /** the countdown units; inside any [data-countdown], every element with data-u="d|h|m|s" is filled each second */
    countUnits: [{ u: 'd', label: UI.days }, { u: 'h', label: UI.hours }, { u: 'm', label: UI.minutes }, { u: 's', label: UI.seconds }],
    countdown: (cls = '') => `<div class="su-count ${cls}" data-countdown><p class="su-count__title">${bi(txt('count.title'))}</p><ol class="su-count__grid" aria-label="${esc(txt('count.title').en)}">${countCell('d', UI.days)}${countCell('h', UI.hours)}${countCell('m', UI.minutes)}${countCell('s', UI.seconds)}</ol><p class="su-count__done" data-count-done hidden></p></div>`,
    countNum: (u, cls = '') => `<b class="su-count__n ${cls}" data-u="${u}">${bi({ en: '00', ne: '००' })}</b>`,
    /** a scratch card over any face markup; the theme paints the cover with T.scratch.paint (see scratch.js) */
    scratch: (face, cls = '') => `<div class="su-scratch ${cls}" data-scratch><div class="su-scratch__face">${face}</div><canvas class="su-scratch__foil" aria-hidden="true"></canvas><button type="button" class="su-scratch__btn su-btn su-btn--line">${bi(txt('scratch.button'))}</button></div>`,
    photos, lead, brideGroom,
    photoBtn: (g, i, sizes = '(max-width: 700px) 46vw, 300px', cls = '') => `<button type="button" class="su-gal__btn ${cls}" data-lb-idx="${i}" aria-label="${esc(g.alt || 'Open photograph')}">${imgTag(g.photo, g.alt, sizes)}</button>`,
    families: ['bride', 'groom'].map((k) => ({ key: k, person: c[k], photo: k === 'bride' ? bridePh : groomPh, label: UI[k], of: k === 'bride' ? UI.daughter : UI.son })),
    events: events.map((e) => {
      const ad = adParts(e.start); const bs = bsParts(e.start, e.dateBS);
      return { e, id: e.id, title: e.title, blurb: e.blurb, venue: e.venue, ad, bs, time: timeLabel(e), map: mapUrl(e.mapQuery || e.venue?.en || ''),
        dress: { colors: (e.dress?.colors || []).map(safeColor).filter(Boolean), text: e.dress?.text },
        rituals: (e.rituals || []).map((r) => ({ time: typeof r.time === 'string' ? { en: r.time, ne: neNum(r.time) } : r.time, title: r.title })) };
    }),
    rsvpForm,
    calendarBtn: (cls = '') => `<button class="su-btn ${cls}" type="button" id="add-calendar">${bi(UI.calendar)}</button>`,
    shareBtn: (cls = 'su-btn--line') => `<button class="su-btn ${cls}" type="button" id="share">${bi(UI.shareIt)}</button>`,
    cardBtn: (cls = '') => `<button class="su-btn ${cls}" type="button" data-open-card>${bi(txt('card.button'))}</button>`,
    cue: (to) => `<a class="su-cue" id="cue" href="#${to}"><span>${bi(UI.scroll)}</span><i aria-hidden="true"></i></a>`,
    moreInfo: () => ((config.info?.travel || config.info?.stays?.length || config.info?.contacts?.length) ? `<details class="su-more"><summary>${bi(UI.more)}</summary><div class="su-more__grid">
        ${config.info?.travel ? `<div><h3>${bi(UI.travel)}</h3><p>${bi(config.info.travel)}</p></div>` : ''}
        ${config.info?.stays?.length ? `<div><h3>${bi(UI.stays)}</h3><ul>${config.info.stays.map((st) => `<li><b>${bi(st.name)}</b><small>${bi(st.note)}</small><a class="su-link" href="${esc(mapUrl(st.mapQuery || st.name.en))}" target="_blank" rel="noopener">${bi(UI.map)} ↗</a></li>`).join('')}</ul></div>` : ''}
        ${config.info?.contacts?.length ? `<div><h3>${bi(UI.contacts)}</h3><ul>${config.info.contacts.map((pp) => `<li><b>${bi(pp.name)}</b><small>${bi(pp.role)}</small><span class="su-links"><a class="su-link" href="tel:${esc(tel(pp.phone))}">${bi(UI.call)}</a><a class="su-link" href="https://wa.me/${esc(tel(pp.phone).replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span></li>`).join('')}</ul>${safeHref(config.info.livestream) ? `<a class="su-link" href="${esc(safeHref(config.info.livestream))}" target="_blank" rel="noopener">${bi(UI.live)} ↗</a>` : ''}</div>` : ''}
      </div></details>` : ''),
    madeWith,
    deadline: config.rsvp?.deadline,
  };
  ctx.parts = P;
  ctx.gsap = gsap; ctx.ScrollTrigger = ScrollTrigger; ctx.timeLabel = timeLabel; ctx.mapUrl = mapUrl; ctx.neNum = neNum;

  // ───────── markup ─────────
  document.body.classList.add('su', `theme-${T.slug}`);
  const main = document.getElementById('main');
  const GATE = `
  <div class="su-gate" id="gate" role="dialog" aria-modal="true" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    <div class="su-gate__scene" id="gscene" aria-hidden="true">${T.gate(ctx)}</div>
    <div class="su-gate__ui" id="gui">
      <p class="su-gate__line">${bi(txt('gate.line'))}</p>
      <button class="su-btn su-btn--open" id="open" type="button" disabled>${bi(txt('gate.open'))}</button>
      <button class="su-quiet" id="quiet" type="button" disabled>${bi(txt('gate.quiet'))}</button>
    </div>
  </div>

`;
  const PAGE_DEFAULT = () => `
  <section class="su-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${T.hero(ctx)}
    <a class="su-cue" id="cue" href="#${lead ? 'couple' : 'date'}"><span>${bi(UI.scroll)}</span><i aria-hidden="true"></i></a>
  </section>

  ${lead ? `
  <section class="su-sec su-couple" id="couple" aria-labelledby="couple-title">
    ${head(txt('couple.title'), 'couple-title')}
    <figure class="su-frame su-rise">${D.frameTop || ''}<div class="su-frame__pic">${imgTag(lead.photo, lead.alt, '(max-width: 700px) 86vw, 460px')}</div></figure>
    ${on(txt('couple.line')) ? `<p class="su-lede su-rise">${bi(txt('couple.line'))}</p>` : ''}
  </section>` : ''}

  <section class="su-sec su-date" id="date" aria-labelledby="date-title">
    ${head(txt('date.title'), 'date-title', txt('date.kicker'))}
    <div class="su-date__card su-rise">
      ${dateStrip()}
      ${placeLine?.en || placeLine?.ne ? `<p class="su-date__place">${bi(placeLine)}</p>` : ''}
    </div>
    <div class="su-count su-rise" data-countdown>
      <p class="su-count__title">${bi(txt('count.title'))}</p>
      <ol class="su-count__grid" aria-label="${esc(txt('count.title').en)}">${countCell('d', UI.days)}${countCell('h', UI.hours)}${countCell('m', UI.minutes)}${countCell('s', UI.seconds)}</ol>
      <p class="su-count__done" data-count-done hidden></p>
    </div>
  </section>

  <section class="su-sec su-fam" id="families" aria-labelledby="fam-title">
    ${head(txt('families.title'), 'fam-title')}
    <div class="su-fam__grid su-rise">
      ${['bride', 'groom'].map((k) => {
        const p = c[k];
        const ph = k === 'bride' ? bridePh : groomPh;
        return `<div class="su-fam__side">
          ${brideGroom ? `<figure class="su-fam__pic">${imgTag(ph, p.name.en, '(max-width: 700px) 46vw, 220px')}</figure>` : ''}
          <p class="su-kicker">${bi(UI[k])}</p>
          <p class="su-fam__name">${bi(p.fullName)}</p>
          ${(p.parents?.en || p.parents?.ne) ? `<p class="su-fam__of">${bi(k === 'bride' ? UI.daughter : UI.son)}</p><p class="su-fam__parents">${bi(p.parents)}</p>` : ''}
          ${(p.home?.en || p.home?.ne) ? `<p class="su-fam__home">${bi(p.home)}</p>` : ''}
        </div>`;
      }).join(`<div class="su-fam__mid" aria-hidden="true">${D.familiesMid || '<span class="su-fam__and">&amp;</span>'}</div>`)}
    </div>
  </section>

  <section class="su-sec su-prog" id="programme" aria-labelledby="prog-title">
    ${head(txt('prog.title'), 'prog-title', txt('prog.kicker'))}
    <ol class="su-events">
      ${events.map((e) => {
        const ad = adParts(e.start);
        const bs = bsParts(e.start, e.dateBS);
        const sw = (e.dress?.colors || []).map(safeColor).filter(Boolean);
        const hasDress = !!(e.dress?.text?.en || e.dress?.text?.ne || sw.length);
        return `<li class="su-ev su-rise" id="ev-${esc(e.id)}">
          <div class="su-ev__date" aria-hidden="true"><span class="su-ev__day">${bi({ en: ad.day, ne: bs.day || neNum(ad.day) })}</span><span class="su-ev__my">${bi({ en: ad.month.en.slice(0, 3), ne: bs.month || ad.month.ne })}</span></div>
          <div class="su-ev__main">
            <h3 class="su-ev__title">${bi(e.title)}</h3>
            <p class="su-ev__when">${bi({ en: ad.full.en, ne: bs.full.ne })}</p>
            <p class="su-ev__time">${bi(timeLabel(e))}</p>
            ${e.blurb ? `<p class="su-ev__blurb">${bi(e.blurb)}</p>` : ''}
            <p class="su-ev__venue">${bi(e.venue)} <a class="su-link" href="${esc(mapUrl(e.mapQuery || e.venue?.en || ''))}" target="_blank" rel="noopener">${bi(UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
            ${hasDress ? `<p class="su-ev__dress">${sw.length ? `<span class="su-sw" aria-hidden="true">${sw.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(e.dress.text?.en || e.dress.text?.ne ? e.dress.text : UI.wear)}</span></p>` : ''}
            ${e.rituals?.length ? `<details class="su-order"><summary>${bi(UI.order)}</summary><ol>${e.rituals.map((r) => `<li><span class="su-order__t">${bi(typeof r.time === 'string' ? { en: r.time, ne: neNum(r.time) } : r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
          </div>
        </li>`;
      }).join('')}
    </ol>
    <div class="su-prog__foot su-rise">
      <button class="su-btn" type="button" id="add-calendar">${bi(UI.calendar)}</button>
      <button class="su-btn su-btn--line" type="button" id="share">${bi(UI.shareIt)}</button>
    </div>
    ${(config.info?.travel || config.info?.stays?.length || config.info?.contacts?.length) ? `
    <details class="su-more su-rise">
      <summary>${bi(UI.more)}</summary>
      <div class="su-more__grid">
        ${config.info?.travel ? `<div><h3>${bi(UI.travel)}</h3><p>${bi(config.info.travel)}</p></div>` : ''}
        ${config.info?.stays?.length ? `<div><h3>${bi(UI.stays)}</h3><ul>${config.info.stays.map((s) => `<li><b>${bi(s.name)}</b><small>${bi(s.note)}</small><a class="su-link" href="${esc(mapUrl(s.mapQuery || s.name.en))}" target="_blank" rel="noopener">${bi(UI.map)} ↗</a></li>`).join('')}</ul></div>` : ''}
        ${config.info?.contacts?.length ? `<div><h3>${bi(UI.contacts)}</h3><ul>${config.info.contacts.map((p) => `<li><b>${bi(p.name)}</b><small>${bi(p.role)}</small><span class="su-links"><a class="su-link" href="tel:${esc(tel(p.phone))}">${bi(UI.call)}</a><a class="su-link" href="https://wa.me/${esc(tel(p.phone).replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span></li>`).join('')}</ul>
          ${safeHref(config.info.livestream) ? `<a class="su-link" href="${esc(safeHref(config.info.livestream))}" target="_blank" rel="noopener">${bi(UI.live)} ↗</a>` : ''}</div>` : ''}
      </div>
    </details>` : ''}
  </section>

  ${photos.length ? `
  <section class="su-sec su-gal" id="photos" aria-labelledby="gal-title">
    ${head(txt('gallery.title'), 'gal-title')}
    <div class="su-gal__grid" id="galgrid">${photos.map((g, i) => `<figure class="su-gal__ph su-rise"><button type="button" class="su-gal__btn" data-lb-idx="${i}" aria-label="${esc(g.alt || 'Open photograph')}">${imgTag(g.photo, g.alt, '(max-width: 700px) 46vw, 300px')}</button></figure>`).join('')}</div>
  </section>` : ''}

  <section class="su-sec su-card" id="card" aria-labelledby="card-title">
    <article class="su-card__sheet su-rise">
      ${D.cardTop || ''}
      <h2 class="su-card__line" id="card-title">${bi(txt('card.line'))}</h2>
      <p class="su-card__hosts">${bi(config.hosts)}</p>
      <button class="su-btn" type="button" data-open-card>${bi(txt('card.button'))}</button>
    </article>
  </section>

  <section class="su-sec su-rsvp" id="rsvp" aria-labelledby="rsvp-title">
    ${head(txt('rsvp.title'), 'rsvp-title')}
    ${(config.rsvp?.deadline?.en || config.rsvp?.deadline?.ne) ? `<p class="su-lede su-rise">${bi(config.rsvp.deadline)}</p>` : ''}
    <div class="su-rsvp__card su-rise">
      ${rsvpForm()}
    </div>
  </section>

  <footer class="su-close" aria-label="Blessing">
    ${D.closing ? D.closing(ctx) : ''}
    <div class="su-close__text su-rise">
      <p class="su-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
      <p class="su-close__en l-en">${esc(config.closing?.en || '')}</p>
      <p class="su-close__names">${names()}</p>
      ${c.hashtag ? `<p class="su-close__tag">${esc(c.hashtag)}</p>` : ''}
    </div>
    ${madeWith()}
  </footer>

`;
  const DIALOGS = `
  <div class="su-modal" id="cardmodal" hidden role="dialog" aria-modal="true" aria-labelledby="cm-title" data-lenis-prevent>
    <div class="su-modal__panel">
      <button class="su-modal__x" type="button" data-close><span aria-hidden="true">×</span><span class="sr-only">${esc(UI.close.en)}</span></button>
      ${ganesh('su-modal__gan', '120px')}
      <p class="su-modal__shloka" lang="sa">${esc(config.invitation?.shloka?.sa || '')}</p>
      <p class="su-modal__shloka-en l-en">${esc(config.invitation?.shloka?.en || '')}</p>
      <h2 class="su-modal__title" id="cm-title">${bi(txt('hero.title'))}</h2>
      <p class="su-modal__p">${bi(config.invitation?.salutation || '')}</p>
      <p class="su-modal__p">${bi(config.invitation?.body || '')}</p>
      <p class="su-modal__p">${bi(config.invitation?.request || '')}</p>
      <dl class="su-modal__when">
        <div><dt>${bi(UI.date)}</dt><dd>${bi(dateOf(mainIso))}<br />${bi({ en: BS.full.en, ne: BS.full.ne })}</dd></div>
        <div><dt>${bi(UI.place)}</dt><dd>${bi(config.city)}</dd></div>
      </dl>
      <p class="su-modal__sign">${bi(config.invitation?.signoff || '')}<br /><b>${bi(config.hosts)}</b></p>
    </div>
  </div>

  <div class="su-lb" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photograph" data-lenis-prevent>
    <button type="button" class="su-lb__btn su-lb__x" data-lb="close"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <button type="button" class="su-lb__btn su-lb__prev" data-lb="prev"><span aria-hidden="true">←</span><span class="sr-only">Previous</span></button>
    <figure class="su-lb__fig"><img alt="" decoding="async" /></figure>
    <button type="button" class="su-lb__btn su-lb__next" data-lb="next"><span aria-hidden="true">→</span><span class="sr-only">Next</span></button>
  </div>`;
  main.innerHTML = GATE + (T.page ? T.page(ctx) : PAGE_DEFAULT()) + DIALOGS;

  // ───────── shell, RSVP, dialogs ─────────
  const { player } = mountShell({ chapters: [] });
  if (document.getElementById('rsvp-form')) initRsvp(events);
  document.getElementById('add-calendar')?.addEventListener('click', () => downloadIcs(events));
  document.getElementById('share')?.addEventListener('click', (e) => share(e.currentTarget));

  const modal = document.getElementById('cardmodal');
  let closeModal = null;
  const hideModal = () => {
    if (!closeModal) return;
    const done = closeModal; closeModal = null;
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
    let i = 0; let release = null;
    const show = (k) => { i = (k + photos.length) % photos.length; im.src = photoUrl(photos[i].photo, 'lg'); im.alt = photos[i].alt || ''; };
    const close = () => {
      if (!release) return;
      const r = release; release = null;
      lb.classList.remove('is-open');
      setTimeout(() => { lb.hidden = true; }, 260);
      r();
    };
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lb-idx]');
      if (!b || !photos.length) return;
      show(Number(b.dataset.lbIdx));
      release = openModal(lb, { onClose: close });
      requestAnimationFrame(() => lb.classList.add('is-open'));
    });
    lb.addEventListener('click', (e) => {
      const act = e.target.closest('[data-lb]')?.dataset.lb;
      if (act === 'close' || e.target === lb) close();
      else if (act === 'prev') show(i - 1);
      else if (act === 'next') show(i + 1);
    });
    lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }());

  // ───────── countdown ─────────
  (function countdowns() {
    const boxes = [...document.querySelectorAll('[data-countdown]')];
    if (!boxes.length) return;
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const ms = target - Date.now();
      const s0 = Math.max(0, Math.floor(ms / 1000));
      const v = { d: Math.floor(s0 / 86400), h: Math.floor((s0 % 86400) / 3600), m: Math.floor((s0 % 3600) / 60), s: s0 % 60 };
      for (const box of boxes) {
        if (ms <= 0) {
          box.classList.add('is-done');
          const done = box.querySelector('[data-count-done]');
          if (done) { done.hidden = false; done.innerHTML = bi(Date.now() - target < 86400000 ? UI.today : UI.married); }
          box.querySelectorAll('.su-count__grid').forEach((g) => { g.hidden = true; });
          continue;
        }
        box.querySelectorAll('[data-u]').forEach((el) => { const t = el.dataset.u === 'd' ? String(v.d) : pad(v[el.dataset.u]); el.innerHTML = bi({ en: t, ne: neNum(t) }); });
      }
      return ms > 0;
    };
    if (tick()) setInterval(tick, 1000);
  }());

  // ───────── scratch cards ─────────
  const scratches = [...document.querySelectorAll('[data-scratch]')].map((w) => initScratch(w, {
    reduced, paint: T.scratch?.paint, onReveal: T.scratch?.onReveal,
    hint: () => { const h = txt('scratch.hint'); return root.dataset.lang === 'ne' ? (h.ne || h.en) : h.en; },
  }));

  // ───────── the opening ─────────
  const gate = document.getElementById('gate');
  const openBtn = document.getElementById('open');
  const quietBtn = document.getElementById('quiet');
  const hero = document.getElementById('top');
  document.body.classList.add('su-locked');
  window.scrollTo(0, 0);
  let opened = false; let finished = false; let lenis = null; let tl = null; let safety = 0;
  T.ready?.(ctx);
  openBtn.disabled = false; quietBtn.disabled = false;
  document.body.classList.add('is-ready');

  function revealOnScroll() {
    const els = document.querySelectorAll('.su-rise');
    if (reduced) { els.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => io.observe(el));
  }
  function afterOpen() {
    if (finished) return;
    finished = true;
    clearTimeout(safety);
    gate.hidden = true;
    document.body.classList.remove('su-locked', 'is-opening');
    document.body.classList.add('is-open');
    lenis = createSmooth();
    revealOnScroll();
    ctx.lenis = () => lenis;
    T.ambient?.(ctx);
    T.scroll?.(ctx);
    ScrollTrigger.refresh();
    document.getElementById('cue').addEventListener('click', (e) => {
      e.preventDefault();
      const to = document.querySelector(e.currentTarget.getAttribute('href')) || hero.nextElementSibling;
      const y = to.getBoundingClientRect().top + window.scrollY;
      if (lenis) lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    });
  }
  function open(withMusic) {
    if (opened) return;
    opened = true;
    try { player.unlock(); if (withMusic && T.bell !== false) ringBell(player.ctx, { when: 0.05, gain: 0.2 }); player.start(withMusic); } catch { /* audio is optional */ }
    document.body.classList.add('is-opening');
    tl = gsap.timeline({ onComplete: afterOpen });
    if (reduced) {
      tl.to(gate, { autoAlpha: 0, duration: 0.5 }, 0).fromTo(hero.querySelectorAll('.su-in'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3).fromTo('#cue', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.5);
    } else {
      tl.to('#gui', { autoAlpha: 0, y: 10, duration: 0.4, ease: 'power2.out' }, 0);
      const t = T.open(ctx, tl, gate) ?? tl.duration();
      // the hero's lines settle in, a few at a time; then the scroll cue
      const ins = [...hero.querySelectorAll('.su-in')];
      gsap.set(ins, { opacity: 0 });
      ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * 0.14));
      tl.fromTo('#cue', { opacity: 0 }, { opacity: 1, duration: 0.6 }, t + ins.length * 0.14 + 0.2);
    }
    safety = setTimeout(() => { if (!finished) tl.progress(1); }, (tl.duration() + 2.5) * 1000);
  }
  openBtn.addEventListener('click', () => open(true));
  quietBtn.addEventListener('click', () => open(false));
  T.gateTap?.(ctx, () => open(true));

  // ───────── debug hook (screenshots) ─────────
  if (DEBUG) {
    window.__su = {
      gsap, ctx, scratches,
      open: () => open(false),
      at: (t) => { if (!opened) open(false); clearTimeout(safety); tl.pause(); tl.seek(t, false); return tl.duration(); },
      finish: () => { if (!opened) open(false); clearTimeout(safety); tl.progress(1); },
      to: (sel) => {
        const el = document.querySelector(sel);
        const y = el.getBoundingClientRect().top + window.scrollY;
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
        document.querySelectorAll('.su-rise').forEach((n) => n.classList.add('is-in'));
        ScrollTrigger.update();
      },
    };
    if (params.has('open')) window.__su.finish();
  }
  void root;
}
