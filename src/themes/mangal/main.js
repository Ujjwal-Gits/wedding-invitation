// Theme · Mangal (मंगल) — the red-and-gold Nepali wedding card, come alive.
// A carved Newar doorway (pillars, a lintel, a torana with Ganesh) hung with one marigold toran and two brass
// bells. Tap the latch and the heavy leaves swing open with warm light spilling through, and the camera walks
// in (the one signature motion) onto the red card: Ganesh, ॥ श्री गणेशाय नमः ॥, शुभ विवाह, the names and the
// couple in a gold temple arch. Then a calm scroll: a gold scratch card that reveals the date, the countdown,
// a strip of photographs that moves sideways, the families, the card wording, the programme, the reply card
// and the blessing between two lit diyos, closed by a Dhaka band.
import '../../core/base.css';
import './mangal.css';
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
import credits from '../../generated/credits.json';
import manifest from './slots.js';
import {
  DEFS, frameSVG, panelBorderSVG, leafSVG, bellSVG, diyoSVG, dhakaTile, crownSVG, dividerSVG, petalSVG, rosette, beamSVG, medalSVG,
} from './art.js';

gsap.registerPlugin(ScrollTrigger);

const config = await loadInvitation();
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion() || params.has('still');
const c = config.couple;
const events = guestEvents();
const DECOR = '/themes/mangal/decor/';

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

// Ganesh (optional): one picture, shown in a round gold medallion above the door and inside.
const ganeshRef = on(txt('torana.show')) ? S.img('torana.ganesh') : null;
const medal = (cls = '') => (ganeshRef
  ? `<div class="mg-medal ${cls}" aria-hidden="true"><img src="${esc(photoUrl(ganeshRef, 'sm'))}" srcset="${esc(photoUrl(ganeshRef, 'sm'))} 320w, ${esc(photoUrl(ganeshRef, 'lg'))} 640w" sizes="200px" alt="" decoding="async" />${medalSVG()}</div>`
  : '');

// ───────────────────────── Dates ─────────────────────────
function adParts(iso) {
  const en = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(new Date(iso));
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
const npDay = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(new Date(iso));
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

const names = () => `<span class="mg-n">${bi(c.bride.name)}</span> <span class="mg-n"><span class="mg-amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span> ${bi(c.groom.name)}</span>`;
const symbol = txt('hero.symbol');
const invocation = txt('hero.invocation');
const title = txt('hero.title');
const welcome = txt('hero.welcome');

const damask = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84" viewBox="0 0 84 84">${rosette(21, 21, 9, { petals: 8, fill: '#000', stroke: '#000', inner: '#000' })}${rosette(63, 63, 9, { petals: 8, fill: '#000', stroke: '#000', inner: '#000' })}<circle cx="63" cy="21" r="1.6" fill="#000"/><circle cx="21" cy="63" r="1.6" fill="#000"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace('<svg ', '<svg opacity=".09" '))}")`;
})();
const DHAKA = dhakaTile(3);
document.documentElement.style.setProperty('--mg-damask', damask);
document.documentElement.style.setProperty('--mg-dhaka', DHAKA.url);
document.documentElement.style.setProperty('--mg-dhaka-w', `${DHAKA.w}px`);
document.documentElement.style.setProperty('--mg-dhaka-h', `${DHAKA.h}px`);

const diyo = (cls = '', w = 70) => `<div class="mg-diyo ${cls}" aria-hidden="true">${diyoSVG(w, Math.round(w * 1.6))}</div>`;
const swag = (cls = '') => `<div class="mg-swag ${cls}" aria-hidden="true"><img src="${DECOR}swag-sm.webp" srcset="${DECOR}swag-sm.webp 800w, ${DECOR}swag.webp 1600w" sizes="(max-width: 700px) 100vw, 1100px" alt="" decoding="async" /></div>`;
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
const main = document.getElementById('main');
document.body.insertAdjacentHTML('afterbegin', DEFS);
main.innerHTML = `
  <section class="mg-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    <div class="mg-inside" id="inside" aria-hidden="true"><i class="mg-inside__rule"></i></div>
    <div class="mg-door" id="door">
      <div class="mg-panel" id="panel">
        <div class="mg-panel__bg"></div>
        <div class="mg-light" id="light" aria-hidden="true"><i class="mg-light__gap" id="gap"></i></div>
        <div class="mg-panel__border" id="pborder"></div>
      </div>
      <div class="mg-leaves" id="leaves" aria-hidden="true">
        <div class="mg-leaf mg-leaf--l" id="leafL"><i class="mg-leaf__shade"></i></div>
        <div class="mg-leaf mg-leaf--r" id="leafR"><i class="mg-leaf__shade"></i></div>
      </div>
      <div class="mg-framewrap" id="framewrap" aria-hidden="true"></div>
      ${medal('mg-medal--door')}
      <div class="mg-diyos" id="diyos" aria-hidden="true">${diyo('mg-diyo--l')}${diyo('mg-diyo--r')}</div>
      <div class="mg-gate" id="gate">
        <div class="mg-plaque">
          <p class="mg-plaque__line">${bi(txt('gate.line'))}</p>
          <p class="mg-plaque__names">${names()}</p>
        </div>
        <button class="mg-latch" id="open" type="button" disabled>
          <span class="mg-latch__disc" aria-hidden="true"><svg viewBox="0 0 80 80" width="80" height="80"><circle cx="40" cy="40" r="38" fill="url(#mg-brass)" stroke="#5A3A0A" stroke-width="1.2"/><circle cx="40" cy="40" r="31" fill="none" stroke="#FCEDB9" stroke-opacity=".7" stroke-width="1.2" stroke-dasharray="0 5.2" stroke-linecap="round"/>${rosette(40, 40, 22, { petals: 12 })}</svg></span>
          <span class="mg-latch__label">${bi(txt('gate.open'))}</span>
        </button>
        <button class="mg-quiet" id="quiet" type="button" disabled>${bi(txt('gate.quiet'))}</button>
      </div>
    </div>
    <div class="mg-spill" id="spill" aria-hidden="true"></div>
    <div class="mg-bells" id="bells" aria-hidden="true"></div>
    <div class="mg-garland" id="garland" aria-hidden="true"><img class="mg-toran" id="toran" src="${DECOR}swag-sm.webp" srcset="${DECOR}swag-sm.webp 800w, ${DECOR}swag.webp 1600w" sizes="(max-width: 700px) 100vw, 1120px" alt="" decoding="async" fetchpriority="high" /></div>
    <div class="mg-beam" id="beam" aria-hidden="true"></div>
    <div class="mg-threshold" id="threshold" aria-hidden="true"></div>
    <div class="mg-panel__content" id="pcontent">
      ${on(welcome) ? `<div class="mg-welcome" id="welcome" aria-hidden="true">
        ${welcome.ne ? `<p class="mg-welcome__ne" lang="ne">${esc(welcome.ne)}</p>` : ''}
        ${welcome.en && welcome.en !== welcome.ne ? `<p class="mg-welcome__en" lang="en">${esc(welcome.en)}</p>` : ''}
      </div>` : ''}
      <div class="mg-panel__inner${lead ? ' has-photo' : ''}" id="pinner">
        <div class="mg-hero__text" id="htext">
          ${ganeshRef ? `<div class="mg-hero__medal mg-in">${medal('mg-medal--hero')}</div>` : on(symbol) ? `<p class="mg-symbol mg-in" lang="ne">${esc(symbol.ne || symbol.en)}</p>` : ''}
          ${on(invocation) ? `<p class="mg-invoke mg-in" lang="ne">${esc(invocation.ne || invocation.en)}</p>` : ''}
          <h1 class="mg-title mg-in"><span class="mg-title__ne" lang="ne">${esc(title.ne)}</span><span class="sr-only l-en"> (${esc(title.en)})</span></h1>
          <span class="mg-hero__div mg-in">${dividerSVG(180)}</span>
          <p class="mg-names mg-in" id="names">${names()}</p>
        </div>
        ${lead ? `<div class="mg-hero__photo mg-in" id="hphoto">${archFrame(lead.photo, lead.alt, '(max-width: 700px) 80vw, 520px', { eager: true })}</div>` : ''}
      </div>
      <a class="mg-cue" id="cue" href="#date"><span>${bi(T.scroll)}</span><i aria-hidden="true"></i></a>
    </div>
  </section>

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
    <div class="mg-cut mg-cut--fam">
      <div class="mg-cut__layer mg-cut__layer--gold" data-settle="1"></div>
      <div class="mg-cut__layer mg-cut__layer--red" data-settle="0.5"></div>
      <div class="mg-cut__body">
        ${dividerSVG(180)}
        <h2 class="mg-h2 mg-h2--gold mg-rise" id="fam-title">${bi(txt('families.title'))}</h2>
        <div class="mg-fam__grid">
          <div class="mg-fam__side mg-rise">
            ${brideGroom ? plainFrame(bridePh, c.bride.name.en, '(max-width: 700px) 60vw, 260px', 'mg-fam__pic') : ''}
            <p class="mg-kicker mg-kicker--gold">${bi(txt('families.bride'))}</p>
            <p class="mg-fam__name">${bi(c.bride.fullName)}</p>
            ${(c.bride.parents?.en || c.bride.parents?.ne) ? `<p class="mg-fam__of">${bi(txt('families.daughter'))}</p><p class="mg-fam__parents">${bi(c.bride.parents)}</p>` : ''}
            ${(c.bride.home?.en || c.bride.home?.ne) ? `<p class="mg-fam__home">${bi(c.bride.home)}</p>` : ''}
          </div>
          <div class="mg-fam__mid" aria-hidden="true"><div class="mg-fam__bell" id="fambell"></div></div>
          <div class="mg-fam__side mg-rise">
            ${brideGroom ? plainFrame(groomPh, c.groom.name.en, '(max-width: 700px) 60vw, 260px', 'mg-fam__pic') : ''}
            <p class="mg-kicker mg-kicker--gold">${bi(txt('families.groom'))}</p>
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
    ${swag('mg-swag--close')}
    <div class="mg-close__row">
      <div class="mg-close__lamp" data-depth="0.5">${diyo('mg-diyo--close', 96)}</div>
      <div class="mg-close__text mg-rise">
        <p class="mg-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
        <p class="mg-close__en l-en">${esc(config.closing?.en || '')}</p>
        <p class="mg-close__names">${names()}</p>
        ${c.hashtag ? `<p class="mg-close__tag">${esc(c.hashtag)}</p>` : ''}
      </div>
      <div class="mg-close__lamp" data-depth="0.5">${diyo('mg-diyo--close', 96)}</div>
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

document.getElementById('fambell').innerHTML = bellSVG(40, 104, { links: 5 });

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
const door = document.getElementById('door');
const panel = document.getElementById('panel');
const pcontent = document.getElementById('pcontent');
const pinner = document.getElementById('pinner');
const htext = document.getElementById('htext');
const hphoto = document.getElementById('hphoto');
const leafL = document.getElementById('leafL');
const leafR = document.getElementById('leafR');
const gate = document.getElementById('gate');
const bellsEl = document.getElementById('bells');
const openBtn = document.getElementById('open');
const quietBtn = document.getElementById('quiet');
const inside = document.getElementById('inside');
const welcomeEl = document.getElementById('welcome');
const garlandEl = document.getElementById('garland');
const toranEl = document.getElementById('toran');
const beamEl = document.getElementById('beam');
const spillEl = document.getElementById('spill');
const thresholdEl = document.getElementById('threshold');
const root = document.documentElement;
const TORAN_AR = 235 / 1600;
let L = null;

function computeLayout(W, H) {
  const phone = W < 700;
  const beam = phone ? 12 : 22;
  const drop = phone ? 7 : 14;
  const thr = phone ? 28 : Math.round(Math.min(48, Math.max(34, H * 0.05)));
  const fw = phone ? W - 20 : Math.min(Math.round(W * (W < 1000 ? 0.8 : 0.6)), 1120);
  const pw = phone ? 16 : Math.round(Math.min(64, Math.max(40, fw * 0.058)));
  const ext = phone ? 4 : Math.round(pw * 0.8);
  const lh = phone ? 22 : Math.round(Math.min(48, Math.max(32, fw * 0.042)));
  const sill = phone ? 8 : 14;
  const tw = Math.round(fw * (phone ? 0.52 : 0.34));
  const th = Math.round(tw * 0.5);
  const fy = phone ? 62 : Math.round(beam + drop + Math.max(22, H * 0.035));
  const DW = fw + 2 * ext;
  const fx = Math.round((W - DW) / 2);
  const fh = H - thr - fy;
  const ox = ext + pw; const oy = th + lh; const ow = fw - 2 * pw; const oh = fh - oy - sill;
  const medal = Math.round(Math.min(th * 0.74, tw * 0.4));
  const medalY = Math.round(th * 0.58);
  const diyoW = phone ? 30 : Math.round(Math.min(58, Math.max(42, ow * 0.05)));
  // the toran: across the opening, its flower knots just inside the pillars
  const bellW = phone ? 22 : Math.round(Math.min(40, Math.max(26, ext * 0.78)));
  const tX = phone ? fx + ox + 4 : fx + ox - Math.round(pw * 0.2);
  const tW = phone ? ow - 8 : ow + Math.round(pw * 0.4);
  const tY = fy + th + Math.round(lh * (phone ? 0.55 : 0.62));
  const tH = tW * TORAN_AR;
  const gTop = Math.round(tY + tH * 0.9 - (fy + oy) + (phone ? 8 : 14));
  const gBottom = Math.round(diyoW * 1.6 + (phone ? 6 : 14));
  const ctop = phone ? 62 : Math.round(Math.max(72, H * 0.09));
  const cbottom = thr + (phone ? 6 : 10);
  return { W, H, phone, beam, drop, thr, fw, pw, ext, lh, sill, tw, th, fx, fy, DW, fh, ox, oy, ow, oh, medal, medalY, diyoW, bellW, tX, tW, tY, tH, gTop, gBottom, ctop, cbottom, ganesh: !!ganeshRef };
}

function placeBells(L) {
  const list = [];
  if (L.phone) {
    // phones: the bells hang in front of the pillars, just under the lintel
    const bw = L.bellW; const bh = Math.round(bw * 2.9);
    const y = L.fy + L.oy - 2;
    list.push({ x: L.fx + L.ext + L.pw / 2 - bw / 2, y, w: bw, h: bh, links: 4 });
    list.push({ x: L.fx + L.DW - L.ext - L.pw / 2 - bw / 2, y, w: bw, h: bh, links: 4 });
  } else {
    const bw = L.bellW; const bh = Math.round(bw * 2.7);
    const y = L.fy + L.th + L.lh - 2;
    list.push({ x: L.fx + L.ext / 2 - bw / 2, y, w: bw, h: bh, links: 4 });
    list.push({ x: L.fx + L.DW - L.ext / 2 - bw / 2, y, w: bw, h: bh, links: 4 });
  }
  bellsEl.innerHTML = list.map((b, i) => `<div class="mg-bell" style="left:${Math.round(b.x)}px;top:${Math.round(b.y)}px;width:${b.w}px;height:${b.h}px" data-i="${i}">${bellSVG(b.w, b.h, { links: b.links })}</div>`).join('');
}

/** The card inside: text and the main photo. Side by side on wide screens, stacked on tall ones; the photo
 *  takes the room the words leave, and the words shrink a little only when they must. */
function fitContent() {
  pinner.style.setProperty('--fit', '1');
  const cs = getComputedStyle(pcontent);
  const availH = pcontent.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const availW = pcontent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const side = !!hphoto && availW >= 760 && availW / availH > 1.05;
  pinner.classList.toggle('is-side', side);
  const ar = lead ? (aspectOf(lead.photo) || hphoto?.querySelector('img')?.naturalWidth / hphoto?.querySelector('img')?.naturalHeight || 0.8) : 0.8;
  const perW = 1 / TEMPLE_AR + 1 / ar; // crown + photo height per unit of width
  const sizePhoto = () => {
    if (!hphoto) return;
    const pad = 22;
    let w;
    if (side) w = Math.min(availW * 0.44, (availH - pad - 8) / perW, 560);
    else w = Math.min(availW * 0.86, (availH - htext.offsetHeight - pad - 14) / perW, 440);
    hphoto.style.width = `${Math.max(L?.phone ? 150 : 200, Math.round(w))}px`;
  };
  let k = 1;
  for (let n = 0; n < 18; n++) {
    sizePhoto();
    const tooTall = pinner.scrollHeight > availH + 1;
    const tooWide = [...pinner.querySelectorAll('.mg-n, .mg-title__ne')].some((el) => el.offsetWidth > htext.clientWidth + 1);
    if (!tooTall && !tooWide) break;
    k *= 0.94;
    pinner.style.setProperty('--fit', k.toFixed(3));
  }
}
const TEMPLE_AR = 200 / TEMPLE.H;

function applyLayout() {
  const W = root.clientWidth;
  const H = window.innerHeight;
  L = computeLayout(W, H);
  hero.style.height = `${H}px`;
  root.style.setProperty('--mg-thr', `${L.thr}px`);
  Object.assign(door.style, { left: `${L.fx}px`, top: `${L.fy}px`, width: `${L.DW}px`, height: `${L.fh}px` });
  const box = { left: `${L.ox}px`, top: `${L.oy}px`, width: `${L.ow}px`, height: `${L.oh}px` };
  Object.assign(panel.style, box);
  Object.assign(document.getElementById('leaves').style, box);
  Object.assign(gate.style, { left: `${L.ox}px`, top: `${L.oy + L.gTop}px`, width: `${L.ow}px`, height: `${L.oh - L.gTop - L.gBottom}px` });
  Object.assign(document.getElementById('diyos').style, { left: `${L.ox}px`, width: `${L.ow}px`, bottom: `${L.sill}px` });
  const dm = door.querySelector('.mg-medal--door');
  if (dm) Object.assign(dm.style, { width: `${L.medal}px`, left: `${Math.round(L.DW / 2 - L.medal / 2)}px`, top: `${Math.round(L.medalY - L.medal / 2)}px` });
  document.getElementById('pborder').innerHTML = panelBorderSVG(L);
  document.getElementById('framewrap').innerHTML = frameSVG(L);
  beamEl.innerHTML = beamSVG(L.W, L.beam, L.drop);
  Object.assign(toranEl.style, { left: `${Math.round(L.tX)}px`, top: `${Math.round(L.tY)}px`, width: `${Math.round(L.tW)}px` });
  Object.assign(spillEl.style, { left: `${L.fx + L.ox - L.ow * 0.1}px`, width: `${L.ow * 1.2}px`, bottom: `${L.thr}px`, height: `${Math.round(L.oh * 0.5)}px` });
  Object.assign(pcontent.style, { top: `${L.ctop}px`, bottom: `${L.cbottom}px` });
  const lw = L.ow / 2;
  leafL.querySelector('svg')?.remove(); leafR.querySelector('svg')?.remove();
  leafL.insertAdjacentHTML('afterbegin', leafSVG('l', lw, L.oh));
  leafR.insertAdjacentHTML('afterbegin', leafSVG('r', lw, L.oh));
  root.style.setProperty('--mg-diyo-w', `${L.diyoW}px`);
  door.querySelectorAll('.mg-diyos .mg-diyo').forEach((d) => { d.innerHTML = diyoSVG(L.diyoW, Math.round(L.diyoW * 1.6)); });
  placeBells(L);
  fitContent();
}

// ───────────────────────── Opening: the doors swing open ─────────────────────────
document.body.classList.add('mg-locked');
window.scrollTo(0, 0);
applyLayout();
document.fonts?.ready.then(fitContent);
hphoto?.querySelector('img')?.addEventListener('load', fitContent, { once: true });
openBtn.disabled = false;
quietBtn.disabled = false;
document.body.classList.add('is-ready');

let opened = false;
let finished = false;

/** A cubic-bezier easing (x1, y1, x2, y2), solved by bisection. */
const bezier = (x1, y1, x2, y2) => {
  const bz = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    let lo = 0; let hi = 1; let t = x;
    for (let i = 0; i < 22; i++) { t = (lo + hi) / 2; if (bz(t, x1, x2) < x) lo = t; else hi = t; }
    return bz(t, y1, y2);
  };
};
// Heavy leaves: they take a moment to get going, then glide and settle softly.
const easeDoor = bezier(0.52, 0.02, 0.16, 1);
// Walking in: a slow first step, a long glide, a soft stop.
const easeWalk = bezier(0.45, 0, 0.25, 1);

function dropPetals() {
  if (reduced) return;
  const box = document.createElement('div');
  box.className = 'mg-petals';
  box.setAttribute('aria-hidden', 'true');
  const n = L.phone ? 7 : 10;
  const kinds = ['marigold', 'rose', 'marigold', 'marigold'];
  for (let i = 0; i < n; i++) {
    const s = Math.round((L.phone ? 12 : 15) * (0.8 + Math.random() * 0.5));
    const p = document.createElement('i');
    p.innerHTML = petalSVG(kinds[i % 4], s);
    p.style.left = `${Math.round(L.tX + L.tW * (0.12 + Math.random() * 0.76))}px`;
    p.style.top = `${Math.round(L.tY + L.tH * (0.4 + Math.random() * 0.4))}px`;
    box.append(p);
    gsap.fromTo(p, { y: -6, x: 0, rotation: Math.random() * 180, opacity: 0 }, {
      keyframes: { opacity: [0, 1, 1, 0] },
      y: L.H * (0.35 + Math.random() * 0.3), x: (Math.random() - 0.5) * 90, rotation: `+=${160 + Math.random() * 200}`,
      duration: 3 + Math.random() * 1.2, delay: 0.3 + Math.random() * 1, ease: 'sine.in',
    });
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 6000);
}

function swayBells(strength = 1) {
  bellsEl.querySelectorAll('.mg-bell').forEach((b, i) => {
    const a = (i % 2 ? -1 : 1) * 8 * strength;
    gsap.fromTo(b, { rotation: 0 }, { keyframes: { rotation: [a, -a * 0.7, a * 0.45, -a * 0.25, a * 0.1, 0] }, duration: 2.8 + i * 0.15, ease: 'sine.inOut', delay: i * 0.08 });
  });
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

/** The card's lines settle into place, a few at a time (headings and the photo, no body text). */
const cardGroups = () => {
  const g = (sel) => [...pinner.querySelectorAll(sel)];
  return [g('.mg-hero__medal, .mg-symbol, .mg-invoke'), g('.mg-title'), g('.mg-hero__div, .mg-names'), g('.mg-hero__photo')].filter((a) => a.length);
};

// Walking in: a forward dolly through the gate. Each layer sits at its own distance from the camera (the
// toran nearest, then the beam and bells, the threshold, the doorway itself); moving the camera forward by c
// scales a layer at distance D by D / (D - c) about the vanishing point, so near things leave the frame first.
const DEPTH = [[garlandEl, 2.7], [beamEl, 2.8], [bellsEl, 2.9], [spillEl, 3.4], [thresholdEl, 3.5], [door, 4]];

/** The smallest scale of the doorway at which every corner of the screen lies inside its opening. */
function throughScale(vx, vy) {
  const { W, H, ow, oh } = L;
  const x0 = L.fx + L.ox; const y0 = L.fy + L.oy;
  const inside = (s) => [[0, 0], [W, 0], [0, H], [W, H]].every(([px, py]) => {
    const x = vx + (px - vx) / s - x0; const y = vy + (py - vy) / s - y0;
    return x >= 0 && x <= ow && y >= 0 && y <= oh;
  });
  let lo = 1; let hi = 8;
  if (inside(lo)) return lo;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (inside(m)) hi = m; else lo = m; }
  return hi;
}

function dollyRig() {
  const W = L.W; const H = L.H;
  const vx = W / 2;
  const vy = L.fy + L.oy + L.oh * 0.42;
  const doorEnd = Math.max(throughScale(vx, vy) * 1.05, 1.6);
  const C = 4 - 4 / doorEnd;
  const layers = DEPTH.filter(([el]) => el && getComputedStyle(el).display !== 'none').map(([el, D]) => {
    const kids = el.children.length ? [...el.children] : [el];
    const rs = kids.map((k) => k.getBoundingClientRect()).filter((r) => r.width && r.height);
    const box = rs.length ? { l: Math.min(...rs.map((r) => r.left)), t: Math.min(...rs.map((r) => r.top)), r: Math.max(...rs.map((r) => r.right)), b: Math.max(...rs.map((r) => r.bottom)) } : null;
    el.style.transformOrigin = `${(vx - el.offsetLeft).toFixed(1)}px ${(vy - el.offsetTop).toFixed(1)}px`;
    return { el, D, box, gone: false };
  });
  const set = (p) => {
    const cc = C * p;
    for (const ly of layers) {
      if (ly.gone) continue;
      const s = ly.D / (ly.D - cc);
      if (ly.box) {
        const l = vx + (ly.box.l - vx) * s; const r = vx + (ly.box.r - vx) * s;
        const t = vy + (ly.box.t - vy) * s; const b = vy + (ly.box.b - vy) * s;
        if (r < 0 || l > W || b < 0 || t > H) { ly.gone = true; ly.el.style.visibility = 'hidden'; continue; }
      }
      ly.el.style.transform = `translate3d(0,0,0) scale(${s.toFixed(4)})`;
    }
  };
  return { set };
}

function walkIn() {
  const phone = L.phone;
  const SWING_AT = 0.55;
  const SWING = phone ? 2.1 : 2.4;
  const DOLLY_AT = SWING_AT + SWING * 0.6;
  const DOLLY = phone ? 2.5 : 2.9;
  const end = DOLLY_AT + DOLLY;
  const rig = { p: 0 };
  let cam = null;
  const groups = cardGroups();
  const tl = gsap.timeline({ onComplete: afterOpen });
  tl.to(gate, { autoAlpha: 0, y: -8, duration: 0.45, ease: 'power2.out' }, 0)
    .add(() => swayBells(0.8), 0.1)
    // the latch gives: the leaves ease off the frame by a hair
    .to(leafL, { rotationY: 2.5, duration: 0.4, ease: 'power2.out' }, 0.2)
    .to(leafR, { rotationY: -2.5, duration: 0.4, ease: 'power2.out' }, 0.2)
    .fromTo('#gap', { opacity: 0, scaleX: 0.03 }, { opacity: 0.85, scaleX: 0.08, duration: 0.4, ease: 'power1.out' }, 0.2)
    // then the heavy swing, with warm light pouring through the widening gap
    .to(leafL, { rotationY: 80, duration: SWING, ease: easeDoor }, SWING_AT)
    .to(leafR, { rotationY: -80, duration: SWING, ease: easeDoor }, SWING_AT)
    .to('.mg-leaf__shade', { opacity: 0.5, duration: SWING, ease: 'power1.in' }, SWING_AT)
    .to('#gap', { opacity: 1, scaleX: 1, duration: SWING * 0.8, ease: easeDoor }, SWING_AT)
    .fromTo('#light', { opacity: 0 }, { opacity: 1, duration: SWING * 0.7, ease: 'power1.out' }, SWING_AT + 0.15)
    .fromTo(spillEl, { opacity: 0, scaleX: 0.25 }, { opacity: 1, scaleX: 1, duration: SWING * 0.75, ease: 'power2.out' }, SWING_AT + 0.25)
    .add(dropPetals, SWING_AT)
    // as we step through, the glare settles to a warm glow so the welcome reads clearly
    .to('#gap', { opacity: 0, duration: 1.2, ease: 'power1.inOut' }, DOLLY_AT + 0.1)
    .to('#light', { opacity: 0.22, duration: 1.4, ease: 'power1.inOut' }, DOLLY_AT + 0.2)
    .to(spillEl, { opacity: 0, duration: 1, ease: 'power1.inOut' }, DOLLY_AT + 0.3)
    // the camera walks in through the open doors
    .add(() => { cam = dollyRig(); }, DOLLY_AT - 0.02)
    .to(rig, { p: 1, duration: DOLLY, ease: easeWalk, onUpdate: () => cam?.set(rig.p) }, DOLLY_AT)
    .fromTo(inside, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.55, ease: 'power1.inOut' }, end - 0.55)
    .add(() => hero.classList.add('is-inside'), end + 0.02);
  let t = end;
  if (welcomeEl) {
    tl.fromTo(welcomeEl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'power1.out' }, DOLLY_AT + 0.45)
      .fromTo(welcomeEl, { scale: 0.86, y: 14 }, { scale: 1, y: 0, duration: end - DOLLY_AT - 0.45, ease: 'power2.out' }, DOLLY_AT + 0.45)
      .to(welcomeEl, { autoAlpha: 0, y: -16, scale: 1.03, duration: 0.42, ease: 'power2.in' }, end - 0.05);
    t = end + 0.42;
  }
  gsap.set(groups.flat(), { opacity: 0 });
  gsap.set(pinner, { opacity: 1 });
  groups.forEach((g, i) => tl.fromTo(g, { opacity: 0, y: 22, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' }, t + i * (phone ? 0.09 : 0.12)));
  tl.fromTo('#cue', { opacity: 0 }, { opacity: 1, duration: 0.5 }, t + 0.7);
  return tl;
}

/** Reduced motion: no camera move; the doorway gives way to the card in a crossfade. */
function crossfadeIn() {
  const tl = gsap.timeline({ onComplete: afterOpen });
  tl.to(gate, { autoAlpha: 0, duration: 0.25 }, 0)
    .fromTo(inside, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power1.inOut' }, 0.1)
    .add(() => hero.classList.add('is-inside'), 0.62);
  let t = 0.6;
  if (welcomeEl) {
    tl.fromTo(welcomeEl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.5)
      .to(welcomeEl, { autoAlpha: 0, duration: 0.3 }, 1.9);
    t = 2.25;
  }
  tl.fromTo(pinner, { opacity: 0 }, { opacity: 1, duration: 0.45 }, t)
    .fromTo('#cue', { opacity: 0 }, { opacity: 1, duration: 0.4 }, t + 0.2);
  return tl;
}

openBtn.addEventListener('click', () => open(true));
quietBtn.addEventListener('click', () => open(false));

let lenis = null;
function afterOpen() {
  if (finished) return;
  finished = true;
  hero.classList.add('is-inside');
  document.body.classList.remove('mg-locked', 'is-opening');
  document.body.classList.add('is-open');
  gate.hidden = true;
  lenis = createSmooth();
  revealOnScroll();
  scrollStory();
  photoStrip();
  document.getElementById('cue').addEventListener('click', (e) => {
    e.preventDefault();
    const y = document.getElementById('date').getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  });
}

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
    ctx.font = ne ? `600 ${size}px Laila, Mukta, serif` : `400 ${size}px Gloock, Georgia, serif`;
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
  // Phones and tablets: an endless, gentle marquee (two identical sets; pauses off screen).
  mm.add('(max-width: 899px), (pointer: coarse), (pointer: none)', () => {
    view.classList.add('is-marquee');
    const speed = () => track.style.setProperty('--mg-dur', `${Math.max(20, set0.scrollWidth / 34).toFixed(1)}s`);
    speed();
    const io = new IntersectionObserver(([en]) => view.classList.toggle('is-paused', !en.isIntersecting));
    io.observe(view);
    return () => { view.classList.remove('is-marquee', 'is-paused'); io.disconnect(); };
  });
  let rt;
  track.querySelectorAll('img').forEach((im) => im.addEventListener('load', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      ScrollTrigger.refresh();
      if (view.classList.contains('is-marquee')) track.style.setProperty('--mg-dur', `${Math.max(20, set0.scrollWidth / 34).toFixed(1)}s`);
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
    const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 };
    gsap.to(inside, { scale: 1.1, ease: 'none', scrollTrigger: st });
    gsap.to(pinner, { scale: 1.05, opacity: 0.3, ease: 'none', scrollTrigger: st });
    gsap.to('#cue', { opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '20% top', scrub: true } });
    document.querySelectorAll('[data-depth]').forEach((el) => {
      const d = Number(el.dataset.depth) || 0.5;
      gsap.fromTo(el, { y: 90 * d }, { y: -50 * d, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
    });
    document.querySelectorAll('[data-settle]').forEach((el) => {
      const d = Number(el.dataset.settle) || 0.5;
      gsap.fromTo(el, { y: 60 * d, scale: 1 - 0.015 * d }, { y: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'top 35%', scrub: 0.8 } });
    });
    document.querySelectorAll('.mg-swag').forEach((el) => {
      gsap.fromTo(el, { y: -30 }, { y: 0, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'top 40%', scrub: 0.8 } });
    });
  });
  ScrollTrigger.create({
    trigger: '#families', start: 'top 70%', once: true,
    onEnter: () => {
      const b = document.getElementById('fambell');
      gsap.fromTo(b, { rotation: 0 }, { keyframes: { rotation: [6, -4, 2.5, -1, 0] }, duration: 2.4, ease: 'sine.inOut' });
    },
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
    open: () => open(false),
    finish: () => {
      opened = true;
      gsap.set(gate, { autoAlpha: 0 });
      gsap.set(leafL, { rotationY: 80 }); gsap.set(leafR, { rotationY: -80 });
      gsap.set('.mg-leaf__shade', { opacity: 0.5 });
      gsap.set(inside, { autoAlpha: 1 });
      if (welcomeEl) gsap.set(welcomeEl, { autoAlpha: 0 });
      gsap.set([pinner, '#cue'], { opacity: 1, scale: 1 });
      afterOpen();
    },
    seek: (deg) => { gsap.set(leafL, { rotationY: deg }); gsap.set(leafR, { rotationY: -deg }); },
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
