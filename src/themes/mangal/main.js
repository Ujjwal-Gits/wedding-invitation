// Theme · Mangal (मंगल) — the red-and-gold Nepali wedding card, come alive.
// A wide sindoor doorway hung with fresh garlands and brass bells. Tap the latch and the two carved
// leaves swing open in 3D (the one signature motion) onto the red arched card: शुभ विवाह in gold,
// the names and both dates. Then a calm, layered "paper-cut" scroll: the couple in gold arch frames,
// the families, the card wording beside a puja thaali, the programme, a few more photographs, the
// reply card and the blessing between two lit diyos, closed by a Dhaka band.
import '../../core/base.css';
import './mangal.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadInvitation } from '../../core/data.js';
import { bi, esc, dateOf, timeLabel, mapUrl, neNum, bsDateOf } from '../../core/i18n.js';
import { mountShell, ringBell } from '../../core/shell.js';
import { createSmooth, reducedMotion } from '../../core/smooth.js';
import { initRsvp } from '../../core/rsvp.js';
import { guestEvents } from '../../core/finale.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { openModal } from '../../core/modal.js';
import { useSlots } from '../../core/slots.js';
import { photoUrl } from '../../photos.js';
import credits from '../../generated/credits.json';
import floraCredits from './flora-credits.js';
import manifest from './slots.js';
import META from './decor-meta.js';
import {
  DEFS, archPath, frameSVG, panelBorderSVG, leafSVG, bellSVG, diyoSVG, dhakaTile, crownSVG, swastikaSVG, dividerSVG, petalSVG, rosette,
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
const isOff = (v) => !v || /^\s*(-|–|none|off)\s*$/i.test(v);
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

const CROWNS = { temple: crownSVG('temple'), round: crownSVG('round'), scallop: crownSVG('scallop') };
/** A gold arch frame: the crown sits above the photo, so the photo is always whole. */
const frame = (ref, alt, kind, sizes, { cls = '', button = '', eager = false } = {}) => {
  const cr = CROWNS[kind];
  const ar = aspectOf(ref);
  const inner = imgTag(ref, alt, sizes, { eager });
  return `<figure class="mg-frame mg-frame--${kind} ${cls}" data-orient="${ar ? (ar > 1.05 ? 'land' : ar < 0.95 ? 'port' : 'sq') : 'port'}" style="--crown:${(200 / cr.H).toFixed(4)}">
    <span class="mg-frame__crown" aria-hidden="true">${cr.svg}</span>
    <span class="mg-frame__body">${button ? `<button type="button" class="mg-frame__btn" ${button}>${inner}</button>` : inner}</span>
  </figure>`;
};

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
const album = [...galCouple, ...galMore].slice(0, 9);

// ───────────────────────── Dates ─────────────────────────
function adParts(iso) {
  const en = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(new Date(iso));
  const g = (t) => en.find((p) => p.type === t)?.value || '';
  const [wdNe, ...restNe] = dateOf(iso).ne.split(', ');
  return { wd: { en: g('weekday'), ne: wdNe }, day: g('day'), month: { en: `${g('month')} ${g('year')}`, ne: restNe.join(', ') }, full: dateOf(iso) };
}
function bsParts(iso, override) {
  const b = bsDateOf(iso, override);
  const m = String(b.short?.ne || '').match(/^(\S+)\s+([०-९]+),\s*([०-९]+)/);
  return { full: b, day: m ? m[2] : null, monthYear: m ? `${m[1]} ${m[3]}` : null };
}
const mainAD = dateOf(config.weddingDate);
const mainBS = bsDateOf(config.weddingDate, config.weddingDateBS);
const daysLeft = Math.ceil((new Date(config.weddingDate).getTime() - Date.now()) / 86400000);
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
  credits: { en: 'Photo, flower and music credits', ne: 'श्रेय' },
  close: { en: 'Close', ne: 'बन्द गर्नुहोस्' },
  scroll: { en: 'Scroll', ne: 'तल हेर्नुहोस्' },
  stays: { en: 'Where to stay', ne: 'बसाइ' },
  travel: { en: 'Getting there', ne: 'आउने बाटो' },
  contacts: { en: 'Questions', ne: 'सोधपुछ' },
  live: { en: 'Watch the ceremony live', ne: 'प्रत्यक्ष हेर्नुहोस्' },
  order: { en: 'Order of the day', ne: 'दिनको क्रम' },
};

const names = () => `<span class="mg-n">${bi(c.bride.name)}</span> <span class="mg-n"><span class="mg-amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span> ${bi(c.groom.name)}</span>`;
const symbol = txt('hero.symbol');
const invocation = txt('hero.invocation');
const title = txt('hero.title');
const subtitle = txt('hero.subtitle');
const mark = txt('kalash.mark');

const damask = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84" viewBox="0 0 84 84">${rosette(21, 21, 9, { petals: 8, fill: '#000', stroke: '#000', inner: '#000' })}${rosette(63, 63, 9, { petals: 8, fill: '#000', stroke: '#000', inner: '#000' })}<circle cx="63" cy="21" r="1.6" fill="#000"/><circle cx="21" cy="63" r="1.6" fill="#000"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg.replace('<svg ', '<svg opacity=".09" '))}")`;
})();
const DHAKA = dhakaTile(3);
document.documentElement.style.setProperty('--mg-damask', damask);
document.documentElement.style.setProperty('--mg-dhaka', DHAKA.url);
document.documentElement.style.setProperty('--mg-dhaka-w', `${DHAKA.w}px`);
document.documentElement.style.setProperty('--mg-dhaka-h', `${DHAKA.h}px`);

const kalashMark = () => {
  if (isOff(mark.en)) return '';
  if (/^swastika$/i.test(mark.en.trim())) return `<span class="mg-kalash__mark" aria-hidden="true">${swastikaSVG(60)}</span>`;
  return `<span class="mg-kalash__mark mg-kalash__mark--text" aria-hidden="true" lang="ne">${esc(mark.ne || mark.en)}</span>`;
};
const kalash = (cls = '') => `<div class="mg-kalash ${cls}" aria-hidden="true"><img src="${DECOR}kalash-sm.webp" srcset="${DECOR}kalash-sm.webp 320w, ${DECOR}kalash.webp 640w" sizes="220px" alt="" decoding="async" />${kalashMark()}</div>`;
const thaali = (cls = '') => `<div class="mg-thaali ${cls}" aria-hidden="true"><img src="${DECOR}thaali-sm.webp" srcset="${DECOR}thaali-sm.webp 460w, ${DECOR}thaali.webp 900w" sizes="(max-width: 700px) 70vw, 340px" alt="" decoding="async" loading="lazy" /></div>`;
const diyo = (cls = '', w = 70) => `<div class="mg-diyo ${cls}" aria-hidden="true">${diyoSVG(w, Math.round(w * 1.6))}</div>`;
const swag = (cls = '') => `<div class="mg-swag ${cls}" aria-hidden="true"><img src="${DECOR}swag-sm.webp" srcset="${DECOR}swag-sm.webp 800w, ${DECOR}swag.webp 1600w" sizes="(max-width: 700px) 100vw, 1100px" alt="" decoding="async" /></div>`;
const head = (kicker, h, id, cls = '') => `<header class="mg-head ${cls} mg-rise">${dividerSVG(200)}${kicker ? `<p class="mg-kicker">${bi(kicker)}</p>` : ''}<h2 class="mg-h2" id="${id}">${bi(h)}</h2></header>`;

// ───────────────────────── Markup ─────────────────────────
const main = document.getElementById('main');
document.body.insertAdjacentHTML('afterbegin', DEFS);
main.innerHTML = `
  <section class="mg-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    <div class="mg-sidedecor" id="sidedecor" aria-hidden="true">
      <div class="mg-side mg-side--l" data-part="-1">${kalash('mg-kalash--hero')}</div>
      <div class="mg-side mg-side--r" data-part="1">${thaali('mg-thaali--hero')}</div>
    </div>
    <div class="mg-door" id="door">
      <div class="mg-panel" id="panel">
        <div class="mg-panel__bg" id="panelbg"></div>
        <div class="mg-panel__border" id="pborder"></div>
        <div class="mg-panel__content" id="pcontent">
          <div class="mg-panel__inner" id="pinner">
            ${on(symbol) ? `<p class="mg-symbol" lang="ne">${esc(symbol.ne || symbol.en)}</p>` : ''}
            ${on(invocation) ? `<p class="mg-invoke" lang="ne">${esc(invocation.ne || invocation.en)}</p>` : ''}
            <h1 class="mg-title"><span class="mg-title__ne" lang="ne">${esc(title.ne)}</span><span class="sr-only l-en"> (${esc(title.en)})</span></h1>
            <p class="mg-sub"><span lang="ne">${esc(subtitle.ne)}</span></p>
            <p class="mg-sub-en l-en">${esc(subtitle.en)}</p>
            <span class="mg-hero__div">${dividerSVG(180)}</span>
            <p class="mg-names" id="names">${names()}</p>
            <p class="mg-date">${bi({ en: mainAD.en, ne: mainBS.ne })}</p>
            <p class="mg-date mg-date--alt">${bi({ en: mainBS.en, ne: mainAD.ne })}</p>
            <p class="mg-city">${bi(config.city)}</p>
          </div>
          <a class="mg-cue" id="cue" href="#couple"><span>${bi(T.scroll)}</span><i aria-hidden="true"></i></a>
        </div>
      </div>
      <div class="mg-leaves" id="leaves" aria-hidden="true">
        <div class="mg-leaf mg-leaf--l" id="leafL"><i class="mg-leaf__shade"></i></div>
        <div class="mg-leaf mg-leaf--r" id="leafR"><i class="mg-leaf__shade"></i></div>
      </div>
      <div class="mg-framewrap" id="framewrap" aria-hidden="true"></div>
      <div class="mg-diyos" aria-hidden="true">${diyo('mg-diyo--l')}${diyo('mg-diyo--r')}</div>
      <div class="mg-gate" id="gate">
        <div class="mg-plaque">
          <p class="mg-plaque__line">${bi(txt('gate.line'))}</p>
          <p class="mg-plaque__names">${names()}</p>
          <p class="mg-plaque__date">${bi({ en: mainAD.en, ne: mainBS.ne })}</p>
        </div>
        <button class="mg-latch" id="open" type="button" disabled>
          <span class="mg-latch__disc" aria-hidden="true"><svg viewBox="0 0 80 80" width="80" height="80"><circle cx="40" cy="40" r="38" fill="url(#mg-brass)" stroke="#5A3A0A" stroke-width="1.2"/><circle cx="40" cy="40" r="31" fill="none" stroke="#FCEDB9" stroke-opacity=".7" stroke-width="1.2" stroke-dasharray="0 5.2" stroke-linecap="round"/>${rosette(40, 40, 22, { petals: 12 })}</svg></span>
          <span class="mg-latch__label">${bi(txt('gate.open'))}</span>
        </button>
        <button class="mg-quiet" id="quiet" type="button" disabled>${bi(txt('gate.quiet'))}</button>
      </div>
    </div>
    <div class="mg-bells" id="bells" aria-hidden="true"></div>
    <div class="mg-garland" id="garland" aria-hidden="true">
      <picture class="mg-garland__half mg-garland__half--l"><source media="(max-width: 699px)" srcset="${DECOR}garland-narrow.webp" /><img src="${DECOR}garland-wide.webp" alt="" decoding="async" fetchpriority="high" /></picture>
      <picture class="mg-garland__half mg-garland__half--r"><source media="(max-width: 699px)" srcset="${DECOR}garland-narrow.webp" /><img src="${DECOR}garland-wide.webp" alt="" decoding="async" fetchpriority="high" /></picture>
    </div>
    <div class="mg-threshold" aria-hidden="true"></div>
  </section>

  ${lead ? `
  <section class="mg-sec mg-couple" id="couple" aria-labelledby="couple-title">
    ${head(null, txt('couple.title'), 'couple-title')}
    <p class="mg-lede mg-rise">${bi(txt('couple.line'))}</p>
    <div class="mg-couple__lead">
      <div class="mg-orn mg-orn--l" data-depth="0.6">${kalash('mg-kalash--couple')}</div>
      ${frame(lead.photo, lead.alt, 'temple', '(max-width: 700px) 88vw, 460px', { cls: 'mg-rise mg-frame--lead', eager: false })}
      <div class="mg-orn mg-orn--r" data-depth="0.9">${diyo('mg-diyo--couple', 84)}</div>
    </div>
    ${pair.length ? `<div class="mg-couple__pair mg-couple__pair--${pair.length}">${pair.map((p, i) => frame(p.photo, p.alt, 'round', '(max-width: 700px) 46vw, 360px', { cls: `mg-rise mg-pair__${i + 1}` })).join('')}</div>` : ''}
    ${row.length ? `<div class="mg-couple__row mg-couple__row--${row.length}">${row.map((p, i) => frame(p.photo, p.alt, 'scallop', '(max-width: 700px) 46vw, 300px', { cls: `mg-rise mg-row__${i + 1}` })).join('')}</div>` : ''}
  </section>` : ''}

  <section class="mg-sec mg-fam" id="families" aria-labelledby="fam-title">
    <div class="mg-cut mg-cut--fam">
      <div class="mg-cut__layer mg-cut__layer--gold" data-settle="1"></div>
      <div class="mg-cut__layer mg-cut__layer--red" data-settle="0.5"></div>
      ${swag('mg-swag--fam')}
      <div class="mg-cut__body">
        <h2 class="mg-h2 mg-h2--gold mg-rise" id="fam-title">${bi(txt('families.title'))}</h2>
        <div class="mg-fam__grid">
          <div class="mg-fam__side mg-rise">
            ${brideGroom ? frame(bridePh, c.bride.name.en, 'round', '(max-width: 700px) 60vw, 260px', { cls: 'mg-fam__pic' }) : ''}
            <p class="mg-kicker mg-kicker--gold">${bi(txt('families.bride'))}</p>
            <p class="mg-fam__name">${bi(c.bride.fullName)}</p>
            ${(c.bride.parents?.en || c.bride.parents?.ne) ? `<p class="mg-fam__of">${bi(txt('families.daughter'))}</p><p class="mg-fam__parents">${bi(c.bride.parents)}</p>` : ''}
            ${(c.bride.home?.en || c.bride.home?.ne) ? `<p class="mg-fam__home">${bi(c.bride.home)}</p>` : ''}
          </div>
          <div class="mg-fam__mid" aria-hidden="true"><div class="mg-fam__bell" id="fambell"></div></div>
          <div class="mg-fam__side mg-rise">
            ${brideGroom ? frame(groomPh, c.groom.name.en, 'round', '(max-width: 700px) 60vw, 260px', { cls: 'mg-fam__pic' }) : ''}
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
    <div class="mg-card__grid">
      <div class="mg-card__thaali" data-depth="0.7">${thaali('mg-thaali--card')}</div>
      <article class="mg-card__sheet mg-rise">
        <img class="mg-card__corner mg-card__corner--tl" src="${DECOR}corner-tl-sm.webp" srcset="${DECOR}corner-tl-sm.webp 400w, ${DECOR}corner-tl.webp 720w" sizes="220px" alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <img class="mg-card__corner mg-card__corner--br" src="${DECOR}corner-br-sm.webp" srcset="${DECOR}corner-br-sm.webp 400w, ${DECOR}corner-br.webp 720w" sizes="220px" alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <div class="mg-card__in">
          <p class="mg-kicker mg-kicker--gold">${bi(txt('card.kicker'))}</p>
          <p class="mg-card__shloka" lang="sa">${esc(config.invitation?.shloka?.sa || '')}</p>
          <h2 class="mg-card__line" id="card-title">${bi(txt('card.line'))}</h2>
          <p class="mg-card__hosts">${bi(config.hosts)}</p>
          <button class="mg-btn mg-btn--gold" type="button" data-open-card>${bi(txt('card.button'))}</button>
        </div>
      </article>
    </div>
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

  ${album.length ? `
  <section class="mg-sec mg-gal" id="gallery" aria-labelledby="gal-title">
    ${head(null, txt('gallery.title'), 'gal-title')}
    <div class="mg-gal__grid">
      ${album.map((g, i) => `<figure class="mg-gphoto mg-rise"><button type="button" class="mg-gphoto__btn" data-idx="${i}" aria-label="${esc(g.alt || 'Open photograph')}">${imgTag(g.photo, g.alt, '(max-width: 700px) 46vw, 30vw')}</button></figure>`).join('')}
    </div>
  </section>` : ''}

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
    <details class="mg-credits">
      <summary>${bi(T.credits)}</summary>
      <ul>${[...credits, ...floraCredits].map((k) => `<li>${esc(k.title || k.slot)} by ${esc(k.creator || 'unknown')}, <a href="${esc(k.license_url || k.source_url)}" target="_blank" rel="noopener">${esc(k.license)}</a>, <a href="${esc(k.source_url)}" target="_blank" rel="noopener">source</a></li>`).join('')}
      ${(config.music?.tracks || []).map((t) => `<li>${esc(t.credit)}</li>`).join('')}
      <li>Doorway, doors, bells, diyos, filigree, Dhaka weave, kalash brass, coconut, thaali, hibiscus and jasmine drawn in code for this invitation.</li></ul>
    </details>
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
        <div><dt>${bi({ en: 'Date', ne: 'मिति' })}</dt><dd>${bi(mainAD)}<br />${bi(mainBS)}</dd></div>
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
  document.querySelector('.mg-gal__grid')?.addEventListener('click', (e) => {
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
const leafL = document.getElementById('leafL');
const leafR = document.getElementById('leafR');
const gate = document.getElementById('gate');
const bellsEl = document.getElementById('bells');
const openBtn = document.getElementById('open');
const quietBtn = document.getElementById('quiet');
const root = document.documentElement;
let L = null;

function computeLayout(W, H) {
  const phone = W < 700;
  const G = META[phone ? 'garland-narrow' : 'garland-wide'];
  const gh = (W / G.w) * G.h;
  const prof = G.profile;
  const mid = prof.slice(Math.floor(prof.length * 0.1), Math.ceil(prof.length * 0.9));
  const swagB = Math.max(...mid) * gh;
  const thr = phone ? 28 : Math.round(Math.min(48, Math.max(34, H * 0.05)));
  const fw = phone ? W - 16 : Math.min(Math.round(W * (W < 1000 ? 0.86 : 0.76)), 1240);
  const fx = Math.round((W - fw) / 2);
  const fy = Math.round(gh * (phone ? 0.26 : 0.22));
  const fh = H - thr - fy + 2;
  const b = phone ? 12 : Math.round(Math.min(40, Math.max(24, fw * 0.03)));
  const lh = Math.round(b * (phone ? 1.5 : 1.6));
  const ox = b; const oy = lh; const ow = fw - 2 * b; const oh = fh - lh - Math.round(b * 0.5);
  const ch = Math.round(phone ? Math.min(ow * 0.34, oh * 0.2) : Math.min(ow * 0.2, oh * 0.3));
  const diyoW = phone ? 34 : Math.round(Math.min(66, Math.max(48, ow * 0.055)));
  const top = Math.round(Math.max(swagB - (fy + oy) + (phone ? 10 : 14), ch * 0.42));
  const bottom = Math.round(phone ? diyoW * 1.6 + 8 : 30);
  const side = fx;
  return { W, H, phone, gh, swagB, thr, fx, fy, fw, fh, b, lh, ox, oy, ow, oh, ch, top, bottom, diyoW, side };
}

function placeBells(L) {
  const list = [];
  if (L.phone) {
    const bw = 24; const bh = 62;
    list.push({ x: L.fx + L.ox + 10, y: L.fy + L.oy - 2, w: bw, h: bh, links: 3 });
    list.push({ x: L.fx + L.ox + L.ow - 10 - bw, y: L.fy + L.oy - 2, w: bw, h: bh, links: 3 });
  } else if (L.side > 70) {
    const bw = Math.round(Math.min(54, Math.max(36, L.side * 0.24)));
    const bh = Math.round(bw * 2.5);
    const y = L.fy + L.lh * 0.7;
    list.push({ x: L.fx - bw - 14, y, w: bw, h: bh, links: 4, arm: true });
    list.push({ x: L.fx + L.fw + 14, y, w: bw, h: bh, links: 4, arm: true });
    list.push({ x: L.fx - bw * 0.7 - 14 - bw * 1.25, y: y - 2, w: Math.round(bw * 0.72), h: Math.round(bh * 1.25), links: 7, arm: true, far: true });
    list.push({ x: L.fx + L.fw + 14 + bw * 1.35, y: y - 2, w: Math.round(bw * 0.72), h: Math.round(bh * 1.25), links: 7, arm: true, far: true });
  }
  bellsEl.innerHTML = list.map((b, i) => `<div class="mg-bell${b.far ? ' mg-bell--far' : ''}" style="left:${Math.round(b.x)}px;top:${Math.round(b.y)}px;width:${b.w}px;height:${b.h}px" data-i="${i}">${bellSVG(b.w, b.h, { links: b.links })}</div>`).join('')
    + (list.length && !L.phone ? `<i class="mg-arm" style="left:${Math.round(list[2].x + list[2].w / 2 - 4)}px;top:${Math.round(L.fy + L.lh * 0.7 - 4)}px;width:${Math.round(L.fx - (list[2].x + list[2].w / 2) + 6)}px"></i><i class="mg-arm" style="left:${Math.round(L.fx + L.fw - 2)}px;top:${Math.round(L.fy + L.lh * 0.7 - 4)}px;width:${Math.round(list[3].x + list[3].w / 2 - (L.fx + L.fw) + 6)}px"></i>` : '');
}

function fitContent() {
  pinner.style.setProperty('--fit', '1');
  const cs = getComputedStyle(pcontent);
  const avail = pcontent.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  let k = 1;
  for (let n = 0; n < 16; n++) {
    const tooTall = pinner.scrollHeight > avail;
    const tooWide = [...pinner.querySelectorAll('.mg-n, .mg-title__ne')].some((el) => el.offsetWidth > pinner.clientWidth + 1);
    if (!tooTall && !tooWide) break;
    k *= 0.94;
    pinner.style.setProperty('--fit', k.toFixed(3));
  }
}

function applyLayout() {
  const W = root.clientWidth;
  const H = window.innerHeight;
  L = computeLayout(W, H);
  hero.style.height = `${H}px`;
  root.style.setProperty('--mg-thr', `${L.thr}px`);
  root.style.setProperty('--mg-gh', `${Math.round(L.gh)}px`);
  Object.assign(door.style, { left: `${L.fx}px`, top: `${L.fy}px`, width: `${L.fw}px`, height: `${L.fh}px` });
  const box = { left: `${L.ox}px`, top: `${L.oy}px`, width: `${L.ow}px`, height: `${L.oh}px` };
  Object.assign(panel.style, box);
  Object.assign(document.getElementById('leaves').style, box);
  Object.assign(gate.style, { left: `${L.ox}px`, top: `${L.oy + L.top}px`, width: `${L.ow}px`, height: `${L.oh - L.top - L.bottom}px` });
  document.getElementById('panelbg').style.clipPath = `path('${archPath(0, 0, L.ow, L.oh, L.ch)}')`;
  document.getElementById('pborder').innerHTML = panelBorderSVG(L);
  document.getElementById('framewrap').innerHTML = frameSVG(L);
  Object.assign(pcontent.style, { top: `${L.top}px`, bottom: `${L.bottom}px` });
  const lw = L.ow / 2;
  leafL.querySelector('svg')?.remove(); leafR.querySelector('svg')?.remove();
  leafL.insertAdjacentHTML('afterbegin', leafSVG('l', lw, L.oh, L.ch));
  leafR.insertAdjacentHTML('afterbegin', leafSVG('r', lw, L.oh, L.ch));
  root.style.setProperty('--mg-diyo-w', `${L.diyoW}px`);
  root.style.setProperty('--mg-side', `${L.side}px`);
  door.querySelectorAll('.mg-diyos .mg-diyo').forEach((d) => { d.innerHTML = diyoSVG(L.diyoW, Math.round(L.diyoW * 1.6)); });
  hero.classList.toggle('has-sides', !L.phone && L.side >= 120);
  placeBells(L);
  fitContent();
}

// ───────────────────────── Opening: the doors swing open ─────────────────────────
document.body.classList.add('mg-locked');
window.scrollTo(0, 0);
applyLayout();
document.fonts?.ready.then(fitContent);
openBtn.disabled = false;
quietBtn.disabled = false;
document.body.classList.add('is-ready');

let opened = false;
let finished = false;
const EASE_DOOR = 'power3.inOut';

function dropPetals() {
  if (reduced) return;
  const box = document.createElement('div');
  box.className = 'mg-petals';
  box.setAttribute('aria-hidden', 'true');
  const n = L.phone ? 12 : 18;
  const kinds = ['marigold', 'rose', 'marigold', 'pink'];
  for (let i = 0; i < n; i++) {
    const s = Math.round((L.phone ? 12 : 16) * (0.8 + Math.random() * 0.5));
    const p = document.createElement('i');
    p.innerHTML = petalSVG(kinds[i % 4], s);
    p.style.left = `${Math.round(L.fx + L.fw * (0.08 + Math.random() * 0.84))}px`;
    p.style.top = `${Math.round(L.swagB * (0.4 + Math.random() * 0.5))}px`;
    box.append(p);
    gsap.fromTo(p, { y: -10, x: 0, rotation: Math.random() * 180, opacity: 0 }, {
      keyframes: { opacity: [0, 1, 1, 0] },
      y: L.H * (0.45 + Math.random() * 0.4), x: (Math.random() - 0.5) * 120, rotation: `+=${200 + Math.random() * 260}`,
      duration: 2.6 + Math.random() * 1.4, delay: 0.25 + Math.random() * 0.9, ease: 'sine.in',
    });
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 5200);
}

function swayBells(strength = 1) {
  bellsEl.querySelectorAll('.mg-bell').forEach((b, i) => {
    const a = (i % 2 ? -1 : 1) * (b.classList.contains('mg-bell--far') ? 7 : 9) * strength;
    gsap.fromTo(b, { rotation: 0 }, { keyframes: { rotation: [a, -a * 0.7, a * 0.45, -a * 0.25, a * 0.1, 0] }, duration: 2.6 + i * 0.15, ease: 'sine.inOut', delay: i * 0.06 });
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
  if (reduced) {
    gsap.set(gate, { autoAlpha: 0 });
    gsap.to([leafL, leafR], { opacity: 0, duration: 0.25, onComplete: afterOpen });
    gsap.set(pinner, { opacity: 1 });
    gsap.set('#cue', { opacity: 1 });
    return;
  }
  const tl = gsap.timeline({ onComplete: afterOpen });
  tl.to(gate, { autoAlpha: 0, y: -10, duration: 0.32, ease: 'power2.out' }, 0)
    .add(() => swayBells(1), 0.05)
    .to(leafL, { rotationY: 3, duration: 0.2, ease: 'power2.out' }, 0.18)
    .to(leafR, { rotationY: -3, duration: 0.2, ease: 'power2.out' }, 0.18)
    .to(leafL, { rotationY: 84, duration: 1.3, ease: EASE_DOOR }, 0.38)
    .to(leafR, { rotationY: -84, duration: 1.3, ease: EASE_DOOR }, 0.38)
    .to('.mg-leaf__shade', { opacity: 0.62, duration: 1.3, ease: 'power2.in' }, 0.38)
    .fromTo(pinner, { opacity: 0, scale: 0.965 }, { opacity: 1, scale: 1, duration: 1.0, ease: 'power2.out' }, 0.75)
    .fromTo('#cue', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.5)
    .add(dropPetals, 0.3);
}

openBtn.addEventListener('click', () => open(true));
quietBtn.addEventListener('click', () => open(false));

let lenis = null;
function afterOpen() {
  if (finished) return;
  finished = true;
  document.body.classList.remove('mg-locked', 'is-opening');
  document.body.classList.add('is-open');
  gate.hidden = true;
  lenis = createSmooth();
  revealOnScroll();
  scrollStory();
  document.getElementById('cue').addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector('#couple') || document.querySelector('#families');
    const y = target.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  });
}

// ───────────────────────── The scroll: panels rise, ornament layers part and settle ─────────────────────────
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
    // Leaving the doorway: the garland parts to both sides, bells and the brass lift away.
    const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 };
    gsap.to('.mg-garland__half--l', { xPercent: -7, y: -40, ease: 'none', scrollTrigger: st });
    gsap.to('.mg-garland__half--r', { xPercent: 7, y: -40, ease: 'none', scrollTrigger: st });
    gsap.to('.mg-bell', { y: -60, ease: 'none', scrollTrigger: st });
    gsap.to('.mg-side--l', { x: -50, y: 70, ease: 'none', scrollTrigger: st });
    gsap.to('.mg-side--r', { x: 50, y: 70, ease: 'none', scrollTrigger: st });
    // Ornaments beside the content drift at their own depth.
    document.querySelectorAll('[data-depth]').forEach((el) => {
      const d = Number(el.dataset.depth) || 0.5;
      gsap.fromTo(el, { y: 90 * d }, { y: -50 * d, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
    });
    // Paper-cut layers: each sheet settles into place a little after the one above it.
    document.querySelectorAll('[data-settle]').forEach((el) => {
      const d = Number(el.dataset.settle) || 0.5;
      gsap.fromTo(el, { y: 60 * d, scale: 1 - 0.015 * d }, { y: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'top 35%', scrub: 0.8 } });
    });
    document.querySelectorAll('.mg-swag').forEach((el) => {
      gsap.fromTo(el, { y: -30 }, { y: 0, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'top 40%', scrub: 0.8 } });
    });
  });
  // Bells answer once when the families come into view (all screens; tiny and slow).
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
    open: () => open(false),
    finish: () => {
      opened = true;
      gsap.set(gate, { autoAlpha: 0 });
      gsap.set(leafL, { rotationY: 84 }); gsap.set(leafR, { rotationY: -84 });
      gsap.set('.mg-leaf__shade', { opacity: 0.62 });
      gsap.set([pinner, '#cue'], { opacity: 1, scale: 1 });
      afterOpen();
    },
    seek: (deg) => { gsap.set(leafL, { rotationY: deg }); gsap.set(leafR, { rotationY: -deg }); gsap.set(pinner, { opacity: deg / 84 }); },
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
