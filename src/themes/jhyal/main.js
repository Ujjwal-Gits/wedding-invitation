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
import credits from '../../generated/credits.json';
import manifest from './slots.js';
import {
  DEFS, windowGeom, windowSVG, shutterSVG, shutterRows, diyoSVG, dhakaTile, pillarCapital, pillarBase, pillarShaftTile,
  beamDivider, dividerSVG, lotusNode, petalSVG,
} from './art.js';

const config = await loadInvitation();
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion() || params.has('still');
const c = config.couple;
const events = guestEvents();
const DECOR = '/themes/jhyal/decor/';
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
/** "-", "none" or "off" in a text slot turns that element off. */
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

const imgTag = (ref, alt, sizes, { eager = false, cls = '' } = {}) => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  const ar = aspectOf(ref);
  return `<img class="${cls}" src="${esc(sm)}" ${sm !== lg ? `srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w"` : ''} sizes="${sizes}" alt="${esc(alt || '')}" ${ar ? `width="${Math.round(ar * 1000)}" height="1000"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
};

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

const names = (cls = 'jh-n') => `<span class="${cls}">${bi(c.bride.name)}</span> <span class="${cls}"><span class="jh-amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span> ${bi(c.groom.name)}</span>`;
const symbol = txt('hero.symbol');
const invocation = txt('hero.invocation');
const title = txt('hero.title');
const blessing = txt('hero.blessing');

const DHAKA = dhakaTile(2);
root.style.setProperty('--jh-dhaka', DHAKA.url);
root.style.setProperty('--jh-dhaka-w', `${DHAKA.w}px`);
root.style.setProperty('--jh-dhaka-h', `${DHAKA.h}px`);
root.style.setProperty('--jh-shaft', pillarShaftTile());

const head = (kicker, h, id, cls = '') => `<header class="jh-head ${cls} jh-rise">${kicker ? `<p class="jh-kicker">${bi(kicker)}</p>` : ''}<h2 class="jh-h2" id="${id}">${bi(h)}</h2><span class="jh-head__div">${dividerSVG(160)}</span></header>`;

// ───────────────────────── The carved windows ─────────────────────────
const pct = (v, t) => `${((v / t) * 100).toFixed(3)}%`;
/** Absolute box (left/top/width/height, in % of the window) of a region in viewBox units. */
const boxOf = (G, x, y, w, h) => `left:${pct(x, G.TW)};top:${pct(y, G.H)};width:${pct(w, G.TW)};height:${pct(h, G.H)}`;

// The gate window: an opening of 544 × 594 behind two lattice shutters.
const GG = windowGeom({ ow: 544, oh: 594 });
const SW = GG.ow / 2;
const ROWS = shutterRows(GG.oh);
const toranBox = boxOf(GG, GG.WING * 0.28, GG.yL + 1, GG.TW - GG.WING * 0.56, (GG.TW - GG.WING * 0.56) * (235 / 1708));
const DIYO = 84; // diyo width in window units
const gateDiyo = (k) => `<div class="jh-gdiyo jh-gdiyo--${k}" style="${boxOf(GG, k === 'l' ? GG.WING * 0.5 - DIYO / 2 : GG.TW - GG.WING * 0.5 - DIYO / 2, GG.yS - DIYO * 1.1 + 2, DIYO, DIYO * 1.1)}"><i class="jh-halo"></i>${diyoSVG()}</div>`;

/** A carved window built around a photograph at its own shape: the photograph is never cropped. */
function photoWindow(ref, alt, sizes, { eager = false, cls = '' } = {}) {
  const ar = aspectOf(ref) || 0.75;
  const ow = 544; const oh = Math.round(ow / Math.min(1.9, Math.max(0.5, ar)));
  const G = windowGeom({ ow, oh, torana: true, apron: false });
  return `<figure class="jh-pwin ${cls}" style="--war:${(G.TW / G.H).toFixed(4)}" data-ar="${ar.toFixed(4)}">
    <span class="jh-pwin__ph" style="${boxOf(G, G.ox, G.oy, G.ow, G.oh)}">${imgTag(ref, alt, sizes, { eager })}</span>
    <span class="jh-pwin__art">${windowSVG(G)}</span>
  </figure>`;
}

// The closing window: open, with dawn light inside.
const GC = windowGeom({ ow: 460, oh: 380 });
const closeWindow = () => `<div class="jh-cwin" style="--war:${(GC.TW / GC.H).toFixed(4)}" aria-hidden="true">
    <span class="jh-cwin__sky" style="${boxOf(GC, GC.ox, GC.oy, GC.ow, GC.oh)}"><i class="jh-cwin__sun"></i></span>
    <span class="jh-cwin__art">${windowSVG(GC)}</span>
    <span class="jh-cwin__shut" style="${boxOf(GC, GC.ox, GC.oy, GC.ow, GC.oh)}">
      <span class="jh-cwin__leaf jh-cwin__leaf--l">${shutterSVG('l', GC.ow / 2, GC.oh)}</span>
      <span class="jh-cwin__leaf jh-cwin__leaf--r">${shutterSVG('r', GC.ow / 2, GC.oh)}</span>
    </span>
    ${['l', 'r'].map((k) => `<span class="jh-cdiyo" style="${boxOf(GC, k === 'l' ? GC.WING * 0.5 - DIYO / 2 : GC.TW - GC.WING * 0.5 - DIYO / 2, GC.yS - DIYO * 1.1 + 2, DIYO, DIYO * 1.1)}${k === 'r' ? ';transform:scaleX(-1)' : ''}"><i class="jh-halo"></i>${diyoSVG()}</span>`).join('')}
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
  <div class="jh-gate" id="gate" role="region" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}: an invitation`)}">
    <p class="jh-gate__line" id="gline">${bi(txt('gate.line'))}</p>
    <div class="jh-stage" id="stage">
      <div class="jh-room" id="room" style="${boxOf(GG, GG.ox, GG.oy, GG.ow, GG.oh)}">
        <i class="jh-room__light" id="light"></i>
        <p class="jh-room__names" id="rnames" style="top:${pct(ROWS.lt, GG.oh)};height:${pct(ROWS.lb - ROWS.lt, GG.oh)}">
          <span class="jh-rn">${bi(c.bride.name)}</span><span class="jh-rn jh-rn--amp" aria-hidden="true">&amp;</span><span class="jh-rn">${bi(c.groom.name)}</span>
        </p>
      </div>
      <div class="jh-win" id="win" aria-hidden="true">${windowSVG(GG)}</div>
      <div class="jh-shutters" id="shutters" style="${boxOf(GG, GG.ox, GG.oy, GG.ow, GG.oh)}" aria-hidden="true">
        <div class="jh-sh jh-sh--l" id="shL">${shutterSVG('l', SW, GG.oh)}<i class="jh-sh__shade"></i></div>
        <div class="jh-sh jh-sh--r" id="shR">${shutterSVG('r', SW, GG.oh)}<i class="jh-sh__shade"></i></div>
      </div>
      <img class="jh-toran" id="toran" style="${toranBox}" src="${DECOR}toran-sm.webp" srcset="${DECOR}toran-sm.webp 800w, ${DECOR}toran.webp 1708w" sizes="(max-width: 700px) 100vw, 760px" alt="" aria-hidden="true" decoding="async" fetchpriority="high" />
      <div class="jh-gdiyos" aria-hidden="true">${gateDiyo('l')}${gateDiyo('r')}</div>
    </div>
    <div class="jh-gate__ctl" id="gctl">
      <button class="jh-open" id="open" type="button" disabled><span class="jh-open__orn" aria-hidden="true">${lotusNode(18)}</span><span>${bi(txt('gate.open'))}</span></button>
      <button class="jh-quiet" id="quiet" type="button" disabled>${bi(txt('gate.quiet'))}</button>
    </div>
  </div>

  <section class="jh-hero" id="top" aria-labelledby="hero-title">
    <div class="jh-hero__text" id="htext">
      ${on(invocation) ? `<p class="jh-invoke jh-in" lang="ne">${esc(invocation.ne || invocation.en)}</p>` : ''}
      <h1 class="jh-title jh-in" id="hero-title"><span class="jh-title__ne" lang="ne">${esc(title.ne)}</span><span class="sr-only l-en"> (${esc(title.en)})</span></h1>
      <span class="jh-hero__div jh-in">${dividerSVG(150)}</span>
      <p class="jh-names jh-in">${names()}</p>
      ${on(blessing) ? `<p class="jh-bless jh-in">${bi(blessing)}</p>` : ''}
    </div>
    ${lead ? `<div class="jh-hero__photo jh-in">${photoWindow(lead.photo, lead.alt, '(max-width: 760px) 86vw, 520px', { eager: true, cls: 'jh-pwin--hero' })}</div>` : ''}
    <a class="jh-cue jh-in" id="cue" href="#date"><span>${bi(T.scroll)}</span><i aria-hidden="true"></i></a>
  </section>

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
        <img class="jh-pillar__kalash" src="${DECOR}kalash-sm.webp" srcset="${DECOR}kalash-sm.webp 320w, ${DECOR}kalash.webp 640w" sizes="110px" alt="" loading="lazy" decoding="async" />
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
document.querySelectorAll('.jh-pwin').forEach((fig) => {
  const im = fig.querySelector('img');
  const fix = () => {
    const ar = im.naturalWidth / im.naturalHeight;
    if (!ar || Math.abs(ar - Number(fig.dataset.ar)) < 0.01) return;
    const ow = 544; const oh = Math.round(ow / Math.min(1.9, Math.max(0.5, ar)));
    const G = windowGeom({ ow, oh, torana: true, apron: false });
    fig.dataset.ar = ar.toFixed(4);
    fig.style.setProperty('--war', (G.TW / G.H).toFixed(4));
    fig.querySelector('.jh-pwin__ph').style.cssText = boxOf(G, G.ox, G.oy, G.ow, G.oh);
    fig.querySelector('.jh-pwin__art').innerHTML = windowSVG(G);
  };
  if (im.complete) fix(); else im.addEventListener('load', fix, { once: true });
});

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
const gate = document.getElementById('gate');
const stage = document.getElementById('stage');
const shutters = document.getElementById('shutters');
const shL = document.getElementById('shL');
const shR = document.getElementById('shR');
const gline = document.getElementById('gline');
const gctl = document.getElementById('gctl');
const rnames = document.getElementById('rnames');
const light = document.getElementById('light');
const openBtn = document.getElementById('open');
const quietBtn = document.getElementById('quiet');
const hero = document.getElementById('top');
let L = null;

function layoutGate() {
  const W = root.clientWidth;
  const H = window.innerHeight;
  const phone = W < 700;
  const cs = getComputedStyle(gate);
  const padT = parseFloat(cs.paddingTop) || 0;
  const padB = parseFloat(cs.paddingBottom) || 0;
  const gap = parseFloat(cs.rowGap) || 0;
  const availH = H - padT - padB - gline.offsetHeight - gctl.offsetHeight - gap * 2;
  const availW = W - (phone ? 14 : 64);
  const s = Math.max(0.12, Math.min(availW / GG.TW, availH / GG.H, 1.02));
  const w = Math.round(GG.TW * s);
  const h = Math.round(GG.H * s);
  Object.assign(stage.style, { width: `${w}px`, height: `${h}px` });
  stage.style.setProperty('--s', s.toFixed(4));
  shutters.style.perspective = `${Math.round(w * 2.4)}px`;
  // the names behind the lattice: as large as the lattice allows
  rnames.style.setProperty('--rn', '1');
  const lw = GG.ow * s * 0.84;
  let k = 1;
  for (let n = 0; n < 12; n++) {
    const wide = [...rnames.querySelectorAll('.jh-rn')].some((el) => el.scrollWidth > lw);
    const tall = rnames.scrollHeight > rnames.clientHeight + 1;
    if (!wide && !tall) break;
    k *= 0.92;
    rnames.style.setProperty('--rn', k.toFixed(3));
  }
  L = { W, H, s, w, h, phone };
}

// ───────────────────────── A light morning drift of petals over the closed window ─────────────────────────
const fallEl = (() => {
  if (reduced) return null;
  const box = document.createElement('div');
  box.className = 'jh-fall';
  box.setAttribute('aria-hidden', 'true');
  const phone = root.clientWidth < 700;
  const n = phone ? 4 : 7;
  const r = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < n; i++) {
    const kind = i % 3 === 2 ? 'rose' : 'marigold';
    const size = Math.round((phone ? 13 : 17) * r(0.8, 1.2));
    const fall = r(phone ? 15 : 17, phone ? 21 : 26);
    const sway = r(3.4, 5.4);
    const p = document.createElement('i');
    p.className = 'jh-fall__p';
    p.style.cssText = `left:${(((i + r(0.15, 0.85)) / n) * 100).toFixed(1)}%;--dur:${fall.toFixed(1)}s;--del:${(-r(0, fall)).toFixed(1)}s;--dx:${Math.round(r(-50, 50))}px;--sdur:${sway.toFixed(1)}s;--sdel:${(-r(0, sway)).toFixed(1)}s;--sw:${Math.round(r(10, 24))}px;--r0:${Math.round(r(-40, 40))}deg`;
    p.innerHTML = `<span>${petalSVG(kind, size)}</span>`;
    box.append(p);
  }
  gate.append(box);
  document.addEventListener('visibilitychange', () => box.classList.toggle('is-off', document.hidden));
  return box;
})();

document.body.classList.add('jh-locked');
window.scrollTo(0, 0);
layoutGate();
document.fonts?.ready.then(layoutGate);
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
// The shutters: a small give, then a smooth swing that settles softly (no bounce).
const easeSwing = bezier(0.55, 0.05, 0.18, 1);
// Moving through: an unhurried start, a long glide.
const easeThrough = bezier(0.5, 0, 0.2, 1);

/** Petals carried in on the morning light: from the opening toward the guest, drifting down. */
function petalsIn() {
  if (reduced) return;
  const box = document.createElement('div');
  box.className = 'jh-petals';
  box.setAttribute('aria-hidden', 'true');
  const r = stage.getBoundingClientRect();
  const ox = r.left + (GG.ox / GG.TW) * r.width; const oy = r.top + (GG.oy / GG.H) * r.height;
  const ow = (GG.ow / GG.TW) * r.width; const oh = (GG.oh / GG.H) * r.height;
  const n = L.phone ? 7 : 11;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    const size = Math.round((L.phone ? 20 : 26) * (0.8 + Math.random() * 0.45));
    p.innerHTML = petalSVG(i % 4 === 3 ? 'rose' : 'marigold', size);
    p.style.left = `${Math.round(ox + ow * (0.18 + Math.random() * 0.64))}px`;
    p.style.top = `${Math.round(oy + oh * (0.15 + Math.random() * 0.4))}px`;
    box.append(p);
    gsap.fromTo(p, { scale: 0.45, x: 0, y: 0, rotation: Math.random() * 180, opacity: 0 }, {
      keyframes: { opacity: [0, 1, 1, 0] },
      scale: 1.5 + Math.random() * 0.7,
      x: (Math.random() - 0.5) * L.W * 0.5, y: L.H * (0.28 + Math.random() * 0.3), rotation: `+=${140 + Math.random() * 200}`,
      duration: 2.6 + Math.random() * 1, delay: 0.1 + Math.random() * 0.7, ease: 'sine.inOut',
    });
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 5200);
}

/** The scale (about the opening's centre) at which the opening covers the whole screen. */
function throughScale() {
  const r = stage.getBoundingClientRect();
  const x0 = r.left + (GG.ox / GG.TW) * r.width; const y0 = r.top + (GG.oy / GG.H) * r.height;
  const x1 = x0 + (GG.ow / GG.TW) * r.width; const y1 = y0 + (GG.oh / GG.H) * r.height;
  const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2;
  const sx = Math.max(cx / (cx - x0), (L.W - cx) / (x1 - cx));
  const sy = Math.max(cy / (cy - y0), (L.H - cy) / (y1 - cy));
  return { s: Math.max(sx, sy) * 1.06, ox: cx - r.left, oy: cy - r.top };
}

const heroGroups = () => {
  const g = (sel) => [...hero.querySelectorAll(sel)];
  return [g('.jh-invoke'), g('.jh-title'), g('.jh-hero__div, .jh-names'), g('.jh-bless'), g('.jh-hero__photo'), g('.jh-cue')].filter((a) => a.length);
};

function open(withMusic) {
  if (opened) return;
  opened = true;
  try {
    player.unlock();
    if (withMusic) ringBell(player.ctx, { when: 0.05, gain: 0.16 });
    player.start(withMusic);
  } catch { /* audio is optional */ }
  document.body.classList.add('is-opening');
  const tl = reduced ? crossfadeIn() : throughWindow();
  setTimeout(() => { if (!finished) tl.progress(1); }, (tl.duration() + 2.5) * 1000);
}

function throughWindow() {
  const SWING = 1.2;
  const THROUGH_AT = SWING + 0.05;
  const THROUGH = L.phone ? 1.35 : 1.45;
  const end = THROUGH_AT + THROUGH;
  const T0 = throughScale();
  stage.style.transformOrigin = `${T0.ox.toFixed(1)}px ${T0.oy.toFixed(1)}px`;
  const groups = heroGroups();
  gsap.set(groups.flat(), { opacity: 0, y: 14 });
  // the page is usable the moment the view is through; the last lines finish settling after that
  const tl = gsap.timeline({ onComplete: () => { afterOpen(); gsap.set(groups.flat(), { clearProps: 'opacity,transform' }); } });
  tl.to([gline, gctl], { autoAlpha: 0, y: 6, duration: 0.32, ease: 'power2.out' }, 0)
    .to(fallEl, { autoAlpha: 0, duration: 0.4 }, 0)
    // the latch gives, then the two shutters swing outward toward the guest
    .to(shL, { rotationY: -5, duration: 0.22, ease: 'power2.out' }, 0.08)
    .to(shR, { rotationY: 5, duration: 0.22, ease: 'power2.out' }, 0.08)
    .to(shL, { rotationY: -104, duration: SWING - 0.2, ease: easeSwing }, 0.3)
    .to(shR, { rotationY: 104, duration: SWING - 0.2, ease: easeSwing }, 0.3)
    .to('.jh-sh__shade', { opacity: 0.55, duration: SWING - 0.2, ease: 'power1.in' }, 0.3)
    // morning light fills the opening; the names come clear, then give way to the page
    .to(light, { opacity: 1, duration: 0.9, ease: 'power1.out' }, 0.35)
    .to(rnames, { opacity: 0, duration: 0.5, ease: 'power1.inOut' }, THROUGH_AT - 0.2)
    .add(petalsIn, 0.5)
    // and the view moves gently through the window
    .fromTo(stage, { scale: 1 }, { scale: T0.s, duration: THROUGH, ease: easeThrough }, THROUGH_AT)
    .to(stage, { opacity: 0, duration: 0.5, ease: 'power1.in' }, end - 0.55)
    .to(gate, { '--veil': 0, duration: 0.6, ease: 'power1.inOut' }, end - 0.75);
  const t = end - 0.6;
  groups.forEach((g, i) => tl.to(g, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * (L.phone ? 0.12 : 0.15)));
  tl.add(afterOpen, end + 0.02);
  return tl;
}

/** Reduced motion: no swing or camera move; the window gives way to the page in a crossfade. */
function crossfadeIn() {
  gsap.set(heroGroups().flat(), { clearProps: 'opacity,transform' });
  const tl = gsap.timeline({ onComplete: afterOpen });
  tl.to(gate, { autoAlpha: 0, duration: 0.5, ease: 'power1.inOut' }, 0);
  return tl;
}

openBtn.addEventListener('click', () => open(true));
quietBtn.addEventListener('click', () => open(false));

let lenis = null;
function afterOpen() {
  if (finished) return;
  finished = true;
  gate.hidden = true;
  fallEl?.remove();
  document.body.classList.remove('jh-locked', 'is-opening');
  document.body.classList.add('is-open');
  lenis = createSmooth();
  revealOnScroll();
  document.getElementById('cue').addEventListener('click', (e) => {
    e.preventDefault();
    const y = document.getElementById('date').getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  });
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
  if (finished) return;
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
    seek: (deg) => { gsap.set(shL, { rotationY: -deg }); gsap.set(shR, { rotationY: deg }); gsap.set(light, { opacity: Math.min(1, deg / 60) }); },
    finish: () => { opened = true; gsap.set(gate, { autoAlpha: 0 }); afterOpen(); },
    to: (sel, offset = 0) => {
      const el = document.querySelector(sel);
      const y = el.getBoundingClientRect().top + window.scrollY + offset;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
      document.querySelectorAll('.jh-rise').forEach((n) => n.classList.add('is-in'));
    },
  };
  if (params.has('open')) window.__jh.finish();
}
