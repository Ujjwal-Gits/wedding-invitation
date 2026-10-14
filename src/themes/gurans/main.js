// Theme · Phoolbari (फूलबारी), slug "gurans": a flower garden invitation.
// The guest arrives at a decorated wedding gate: a built ivory arch dressed asymmetrically
// with fresh roses, marigolds and green leaves, light marigold and jasmine ladis in the
// opening, a brass kalash at each foot and शुभ विवाह lettered on the crest. "Open" parts
// the ladis and the guest steps through (the one signature motion). After that it is a
// calm, normally scrolling invitation on soft paper: the couple in varied frames,
// families, a crystal-clear programme, photographs, guest notes, RSVP and a blessing.
import '../../core/base.css';
import './gurans.css';
import { loadInvitation } from '../../core/data.js';
import * as i18n from '../../core/i18n.js';
import { mountShell } from '../../core/shell.js';
import { madeWith } from '../../core/madewith.js';
import { reducedMotion } from '../../core/smooth.js';
import { initRsvp } from '../../core/rsvp.js';
import { guestEvents } from '../../core/finale.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { photos, photoUrl } from '../../photos.js';
import credits from '../../generated/credits.json';
import { useSlots } from '../../core/slots.js';
import { openModal } from '../../core/modal.js';
import manifest from './slots.js';
import GATE from './gate.json';

const { bi, esc, dateOf, mapUrl, neNum } = i18n;
const config = await loadInvitation();
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion();
const c = config.couple;
const events = guestEvents();
const FLORA = '/themes/gurans/flora/';

// ───────────────────────── Slots ─────────────────────────
// ?debug&img.<slot>=<slug>&txt.<slot>=<text> previews a studio override without touching config.js.
if (DEBUG) {
  const tc = (config.themeContent ||= {});
  const mine = (tc[manifest.theme] ||= {});
  for (const [k, v] of params) {
    if (k.startsWith('img.')) (mine.images ||= {})[k.slice(4)] = v;
    if (k.startsWith('txt.')) (mine.texts ||= {})[k.slice(4)] = { en: v, ne: v };
  }
}
const S = useSlots(manifest);
const txt = S.txt;
const has = (v) => !!(v && (typeof v === 'string' ? v.trim() : (v.en || v.ne || '').trim()));

// B.S. dates from the shared converter (contract §12); an event's own dateBS wins.
const bsOf = (iso, override) => { try { return i18n.bsDateOf(iso, has(override) ? override : undefined); } catch { return has(override) ? override : null; } };
// "11:00 AM onwards" for open-ended events (contract §12 / coordinator note).
const whenOf = (e) => (i18n.timeLabel ? i18n.timeLabel(e) : i18n.timeRange(e.start, e.end));

// ───────────────────────── Photos ─────────────────────────
const dims = Object.fromEntries(credits.map((k) => [String(k.file || k.slot).replace(/\.(jpe?g|png|webp)$/i, ''), [k.width, k.height]]));
const isUrl = (s) => typeof s === 'string' && (s.startsWith('/') || s.startsWith('https://'));
const isLibrary = (ref) => typeof ref === 'string' && !isUrl(ref);
const keyOf = (ref) => (typeof ref === 'string' ? ref : ref && typeof ref === 'object' ? ref.lg || ref.sm || '' : '');
const aspectOf = (ref) => {
  if (typeof ref === 'string' && dims[ref]?.[0]) return dims[ref][0] / dims[ref][1];
  if (ref && typeof ref === 'object' && ref.w && ref.h) return ref.w / ref.h;
  return 0;
};
const focalOf = (ref) => (typeof ref === 'string' && photos[ref]?.focal) || (ref && typeof ref === 'object' && ref.focal) || [0.5, 0.5];
const PEOPLE = /^(couple|wedding|mehendi-hands|bride|groom|portrait)/;
const isCouple = (ref) => !!ref && (typeof ref === 'object' || isUrl(ref) || PEOPLE.test(ref));
const safeHref = (u) => (/^https:\/\//i.test(String(u || '')) ? String(u) : '');
const safeColor = (s) => (/^#[0-9a-f]{3,8}$/i.test(String(s)) ? s : null);
const tel = (p) => String(p).replace(/[^\d+]/g, '');

const img = (ref, alt, sizes, { eager = false } = {}) => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  const [fx, fy] = focalOf(ref);
  return `<img src="${esc(sm)}" ${sm !== lg ? `srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w"` : ''} sizes="${sizes}" alt="${esc(alt || '')}"
    style="object-position:${(fx * 100).toFixed(1)}% ${(fy * 100).toFixed(1)}%" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
};
/** Floral photo corners: four different arrangements (none mirrors another), each made for its own corner. */
const CORNERS = { tl: 'corner-a', br: 'corner-b', tr: 'corner-c', bl: 'corner-d' };
const cornerImg = (k) => `<img class="pb-fr__fl pb-fr__fl--${k}" src="${FLORA}${CORNERS[k]}-sm.webp" srcset="${FLORA}${CORNERS[k]}-sm.webp 1x, ${FLORA}${CORNERS[k]}.webp 2x" alt="" aria-hidden="true" loading="lazy" decoding="async" />`;
/**
 * A framed photograph that keeps the photo's own proportions (nothing cropped).
 * style: mat | floral | print | line | blush; fl: extra flower corners ('tl' | 'tr' | 'br' | 'bl').
 */
const frame = (ref, alt, sizes, { style = 'mat', cap = '', cls = '', eager = false, fl = [] } = {}) => {
  if (!ref) return '';
  const ar = aspectOf(ref);
  const orient = ar ? (ar >= 1.05 ? 'land' : ar <= 0.95 ? 'port' : 'sq') : 'auto';
  const corners = style === 'floral' ? ['tl', 'br'] : fl;
  return `<figure class="pb-fr pb-fr--${style} ${corners.length ? 'pb-fr--fl' : ''} ${cls}" data-orient="${orient}" style="--ar:${ar ? ar.toFixed(4) : 0.75}">
    <span class="pb-fr__mat"><span class="pb-fr__img">${img(ref, alt, sizes, { eager })}</span>${corners.map(cornerImg).join('')}</span>
    ${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
};

const portraitAlt = Object.fromEntries((c.portraits || []).filter((p) => p?.photo).map((p) => [keyOf(p.photo), p.alt || '']));
const altFor = (ref, id) => portraitAlt[keyOf(ref)] || ref?.alt || S.alt(id) || `${c.bride.name.en} and ${c.groom.name.en}`;
const used = new Set();
const take = (ref) => { if (ref) used.add(keyOf(ref)); return ref; };
const fresh = (id) => { const r = S.img(id); return r && !used.has(keyOf(r)) ? take(r) : null; };

const heroRef = fresh('hero.photo');
const pairMode = !!(c.bride?.photo && c.groom?.photo);
const coupleA = pairMode ? take(S.img('couple.bride')) : fresh('couple.first');
const coupleB = pairMode ? take(S.img('couple.groom')) : fresh('couple.second');
const progRef = fresh('programme.photo');
const closeRef = fresh('close.photo');
const albumCouple = [];
for (let i = 1; i <= 8; i++) {
  const id = `album.${i}`;
  const ref = fresh(id);
  if (ref) albumCouple.push({ photo: ref, alt: altFor(ref, id) });
}
const albumGallery = (config.gallery || [])
  .filter((g) => g?.photo && !used.has(keyOf(g.photo)) && !/^marigold/.test(keyOf(g.photo)))
  .filter((g, i, a) => a.findIndex((x) => keyOf(x.photo) === keyOf(g.photo)) === i)
  .sort((x, y) => Number(isCouple(y.photo)) - Number(isCouple(x.photo)));
const album = [...albumCouple, ...albumGallery].slice(0, 12);

// ───────────────────────── UI chrome (not studio content) ─────────────────────────
const T = {
  time: { en: 'Time', ne: 'समय' },
  venue: { en: 'Venue', ne: 'स्थान' },
  wear: { en: 'Dress', ne: 'पहिरन' },
  map: { en: 'Open map', ne: 'नक्सा हेर्नुहोस्' },
  call: { en: 'Call', ne: 'फोन गर्नुहोस्' },
  live: { en: 'Watch the ceremony live', ne: 'प्रत्यक्ष हेर्नुहोस्' },
  calendar: { en: 'Add to calendar', ne: 'क्यालेन्डरमा राख्नुहोस्' },
  shareIt: { en: 'Share the invitation', ne: 'निम्तो सेयर गर्नुहोस्' },
  close: { en: 'Close', ne: 'बन्द गर्नुहोस्' },
  and: { en: '&', ne: 'र' },
};
const daysLeft = Math.ceil((new Date(config.weddingDate).getTime() - Date.now()) / 86400000);
const countLine = daysLeft > 1
  ? { en: `${daysLeft} days to go`, ne: `${neNum(daysLeft)} दिन बाँकी` }
  : daysLeft === 1 ? { en: 'Tomorrow', ne: 'भोलि' } : { en: 'With love', ne: 'मायासहित' };

/** Weekday, day number and month + year for a programme date block. */
const dateParts = (iso) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  const [wdNe, mdNe = '', yNe = ''] = dateOf(iso).ne.split(', ');
  const [mNe = '', dNe = ''] = mdNe.split(' ');
  return { wd: { en: p.weekday, ne: wdNe }, day: { en: p.day, ne: dNe }, my: { en: `${p.month} ${p.year}`, ne: `${mNe} ${yNe}` } };
};

const names = (cls = '') => `<span class="pb-names ${cls}">
  <span class="pb-names__one">${bi(c.bride.name)}</span>
  <span class="pb-names__amp" aria-hidden="true">${bi(T.and)}</span><span class="sr-only">and</span>
  <span class="pb-names__two">${bi(c.groom.name)}</span></span>`;
const weddingBS = bsOf(config.weddingDate, config.weddingDateBS);
// The welcome board is small: the B.S. date without the weekday (the AD line above already carries it).
const boardBS = (bs) => (bs.short && !has(config.weddingDateBS) ? { en: `${bs.short.en} B.S.`, ne: `वि.सं. ${bs.short.ne}` } : bs);

// ───────────────────────── The gate ─────────────────────────
const gate = document.getElementById('gate');
const crest = txt('gate.crest');
const pct = (o) => `left:${o.x}%;top:${o.y}%;width:${o.w}%;height:${o.h}%`;
// Only the visible stage's images load (lazy + display:none), each at the width the stage is drawn.
const gateStage = (v) => {
  const g = GATE[v];
  const p = g.plaque;
  const o = g.opening;
  const ar = g.W / g.H;
  const stageW = `min(100vw, calc((100vh - 12px) * ${ar.toFixed(4)}))`;
  const set = (name, wPct) => {
    const lg = Math.round((g.W * wPct) / 100 * g.sc);
    return `src="${FLORA}${name}-sm.webp" srcset="${FLORA}${name}-sm.webp ${Math.round(lg * 0.6)}w, ${FLORA}${name}.webp ${lg}w" sizes="calc(${stageW} * ${(wPct / 100).toFixed(4)})"`;
  };
  return `
  <div class="pb-gate__stage pb-gate__stage--${v}" style="--gar:${ar};--floor:${o.floor};--open:${(o.x1 - o.x0).toFixed(3)};--pw:${p.w}">
    <img class="pb-gate__curtain pb-gate__curtain--l" ${set(`curtain-l-${v}`, g.curtain_l.w)} alt="" loading="lazy" style="${pct(g.curtain_l)}" />
    <img class="pb-gate__curtain pb-gate__curtain--r" ${set(`curtain-r-${v}`, g.curtain_r.w)} alt="" loading="lazy" style="${pct(g.curtain_r)}" />
    <img class="pb-gate__arch" ${set(`gate-${v}`, 100)} alt="" loading="lazy" fetchpriority="high" />
    <div class="pb-gate__crest" style="left:${p.x}%;top:${p.y}%">
      <span class="pb-crest" lang="ne">${esc(crest.ne || crest.en)}</span>
    </div>
  </div>`;
};
gate.innerHTML = `
  <div class="pb-gate__bg" aria-hidden="true"></div>
  <div class="pb-gate__scene" aria-hidden="true">${gateStage('wide')}${gateStage('tall')}</div>
  <div class="pb-gate__board" role="group" aria-labelledby="gate-names">
    <p class="pb-board__welcome">${bi(txt('gate.welcome'))}</p>
    <h1 class="pb-board__names" id="gate-names">${names()}</h1>
    <p class="pb-board__line">${bi(txt('gate.line'))}</p>
    <p class="pb-board__date">${bi(dateOf(config.weddingDate))}</p>
    ${weddingBS ? `<p class="pb-board__bs">${bi(boardBS(weddingBS))}</p>` : ''}
    <div class="pb-board__actions">
      <button class="pb-btn" type="button" id="enter" disabled>${bi(txt('gate.open'))}</button>
      <button class="pb-quiet" type="button" id="enter-quiet" disabled>${bi(txt('gate.quiet'))}</button>
    </div>
  </div>`;

// ───────────────────────── Main markup ─────────────────────────
const programme = events.map((e, i) => {
  const d = dateParts(e.start);
  const bs = bsOf(e.start, e.dateBS);
  const bsShort = bs ? (has(e.dateBS) ? bs : { en: `${bs.short?.en || bs.en} B.S.`, ne: `वि.सं. ${bs.short?.ne || bs.ne}` }) : null;
  const swatches = (e.dress?.colors || []).map(safeColor).filter(Boolean);
  const dress = has(e.dress?.text) ? e.dress.text : null;
  return `
  <li class="pb-ev pb-rise" data-i="${i}">
    <div class="pb-ev__when">
      <p class="pb-ev__wd">${bi(d.wd)}</p>
      <p class="pb-ev__day">${bi(d.day)}</p>
      <p class="pb-ev__my">${bi(d.my)}</p>
      ${bsShort ? `<p class="pb-ev__bs">${bi(bsShort)}</p>` : ''}
    </div>
    <div class="pb-ev__what">
      <h3 class="pb-ev__title">${bi(e.title)}</h3>
      ${has(e.blurb) ? `<p class="pb-ev__blurb">${bi(e.blurb)}</p>` : ''}
      <dl class="pb-ev__facts">
        <div><dt>${bi(T.time)}</dt><dd class="pb-ev__time">${bi(whenOf(e))}</dd></div>
        <div><dt>${bi(T.venue)}</dt><dd>${bi(e.venue)}<a class="pb-map" href="${esc(mapUrl(e.mapQuery || e.venue?.en || ''))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span></a></dd></div>
        ${dress || swatches.length ? `<div><dt>${bi(T.wear)}</dt><dd>${swatches.length ? `<span class="pb-sw" aria-hidden="true">${swatches.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}${dress ? bi(dress) : ''}</dd></div>` : ''}
      </dl>
      ${e.rituals?.length ? `
      <details class="pb-rituals">
        <summary>${bi(txt('programme.order'))}</summary>
        <ol>${e.rituals.map((r) => `<li><span>${bi(r.time)}</span>${bi(r.title)}</li>`).join('')}</ol>
      </details>` : ''}
    </div>
  </li>`;
}).join('');

const info = config.info || {};
const infoBlocks = [
  has(info.travel) ? `<div class="pb-note pb-rise"><h3>${bi(txt('info.travel'))}</h3><p>${bi(info.travel)}</p></div>` : '',
  info.stays?.length ? `<div class="pb-note pb-rise"><h3>${bi(txt('info.stay'))}</h3><ul>${info.stays.map((s) => `<li><b>${bi(s.name)}</b>${has(s.note) ? `<small>${bi(s.note)}</small>` : ''}<a class="pb-map" href="${esc(mapUrl(s.mapQuery || s.name.en))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span></a></li>`).join('')}</ul></div>` : '',
  info.contacts?.length ? `<div class="pb-note pb-rise"><h3>${bi(txt('info.ask'))}</h3><ul>${info.contacts.map((p) => `<li><b>${bi(p.name)}</b>${has(p.role) ? `<small>${bi(p.role)}</small>` : ''}
    <span class="pb-links"><a class="pb-map" href="tel:${esc(tel(p.phone))}">${bi(T.call)} <span class="pb-nowrap">${esc(p.phone)}</span></a><a class="pb-map" href="https://wa.me/${esc(tel(p.phone).replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span></li>`).join('')}</ul>
    ${safeHref(info.livestream) ? `<a class="pb-link" href="${esc(safeHref(info.livestream))}" target="_blank" rel="noopener">${bi(T.live)}<span aria-hidden="true"> ↗</span></a>` : ''}</div>` : '',
].filter(Boolean);
const rsvpOn = config.rsvp && config.rsvp.enabled !== false;

const families = `
  <dl class="pb-families pb-rise">
    <div><dt class="pb-kicker">${bi(txt('couple.brideLabel'))}</dt><dd><b>${bi(c.bride.fullName)}</b>${has(c.bride.parents) ? `<small>${bi(txt('couple.daughter'))} ${bi(c.bride.parents)}</small>` : ''}${has(c.bride.home) ? `<small>${bi(c.bride.home)}</small>` : ''}</dd></div>
    <div><dt class="pb-kicker">${bi(txt('couple.groomLabel'))}</dt><dd><b>${bi(c.groom.fullName)}</b>${has(c.groom.parents) ? `<small>${bi(txt('couple.son'))} ${bi(c.groom.parents)}</small>` : ''}${has(c.groom.home) ? `<small>${bi(c.groom.home)}</small>` : ''}</dd></div>
  </dl>`;

const flower = (name, cls, { eager = false } = {}) => `<img class="pb-orn ${cls}" src="${FLORA}${name}-sm.webp" srcset="${FLORA}${name}-sm.webp 1x, ${FLORA}${name}.webp 2x" alt="" aria-hidden="true" ${eager ? '' : 'loading="lazy"'} decoding="async" />`;

const main = document.getElementById('main');
main.innerHTML = `
  <section class="pb-hero pb-sec" id="top" aria-labelledby="hero-names">
    ${flower('swag', 'pb-orn--swag', { eager: true })}
    <div class="pb-hero__text">
      <p class="pb-kicker pb-rise">${bi(txt('hero.kicker'))}</p>
      <h2 class="pb-hero__names pb-rise" id="hero-names">${names()}</h2>
      <p class="pb-hero__line pb-rise">${bi(txt('hero.line'))}</p>
      <div class="pb-hero__date pb-rise">
        <p class="pb-hero__ad">${bi(dateOf(config.weddingDate))}</p>
        ${weddingBS ? `<p class="pb-hero__bs">${bi(weddingBS)}</p>` : ''}
        <p class="pb-hero__city">${bi(config.city)}</p>
      </div>
      <a class="pb-link pb-rise" href="#programme">${bi({ en: 'See the programme', ne: 'कार्यक्रम हेर्नुहोस्' })}<span aria-hidden="true"> ↓</span></a>
    </div>
    <div class="pb-hero__photo pb-rise">${frame(heroRef, heroRef ? altFor(heroRef, 'hero.photo') : '', '(max-width: 760px) 86vw, 40vw', { style: 'floral', eager: true })}</div>
  </section>

  <section class="pb-couple pb-sec pb-sec--blush" id="couple" aria-labelledby="couple-title">
    <div class="pb-couple__photos">
      ${frame(coupleA, pairMode ? c.bride.name.en : altFor(coupleA, 'couple.first'), '(max-width: 760px) 58vw, 26vw', { style: 'mat', cls: 'pb-couple__a pb-rise', cap: pairMode ? bi(c.bride.name) : '', fl: ['bl'] })}
      ${frame(coupleB, pairMode ? c.groom.name.en : altFor(coupleB, 'couple.second'), '(max-width: 760px) 52vw, 22vw', { style: 'print', cls: 'pb-couple__b pb-rise', cap: pairMode ? bi(c.groom.name) : '', fl: ['tr'] })}
    </div>
    <div class="pb-couple__text">
      <p class="pb-kicker pb-rise">${bi(txt('couple.title'))}</p>
      <h2 class="pb-h2 pb-rise" id="couple-title">${bi(txt('couple.line'))}</h2>
      ${families}
      <button class="pb-btn pb-btn--ghost pb-rise" type="button" id="open-card">${bi(txt('card.button'))}</button>
    </div>
  </section>

  <section class="pb-prog pb-sec" id="programme" aria-labelledby="prog-title">
    ${flower('divider', 'pb-orn--divider')}
    <header class="pb-prog__head">
      <p class="pb-kicker pb-rise">${bi(txt('programme.kicker'))}</p>
      <h2 class="pb-h2 pb-h2--xl pb-rise" id="prog-title">${bi(txt('programme.title'))}</h2>
    </header>
    <div class="pb-prog__body">
      <ol class="pb-prog__list">${programme}</ol>
      ${progRef ? `<div class="pb-prog__photo">${frame(progRef, altFor(progRef, 'programme.photo'), '(max-width: 1100px) 0px, 26vw', { style: 'blush', fl: ['tr'] })}</div>` : ''}
    </div>
    <p class="pb-prog__actions"><button class="pb-btn pb-btn--ghost" type="button" id="add-calendar">${bi(T.calendar)}</button></p>
  </section>

  ${album.length ? `
  <section class="pb-album pb-sec pb-sec--blush" id="album" aria-labelledby="album-title">
    <header class="pb-album__head">
      ${flower('divider', 'pb-orn--rule')}
      <p class="pb-kicker pb-rise">${bi(txt('album.kicker'))}</p>
      <h2 class="pb-h2 pb-rise" id="album-title">${bi(txt('album.title'))}</h2>
    </header>
    <div class="pb-album__grid" id="album-grid"></div>
  </section>` : ''}

  ${infoBlocks.length ? `
  <section class="pb-info pb-sec" id="info" aria-labelledby="info-title">
    <header>
      ${flower('divider', 'pb-orn--rule')}
      <p class="pb-kicker pb-rise">${bi(txt('info.kicker'))}</p>
      <h2 class="pb-h2 pb-rise" id="info-title">${bi(config.city)}</h2>
    </header>
    <div class="pb-info__grid pb-info__grid--${infoBlocks.length}">${infoBlocks.join('')}</div>
  </section>` : ''}

  ${rsvpOn ? `
  <section class="pb-rsvp pb-sec pb-sec--blush" id="rsvp" aria-labelledby="rsvp-title">
    <div class="pb-rsvp__card">
      ${flower('posy', 'pb-orn--posy')}
      <p class="pb-kicker">${bi(countLine)}</p>
      <h2 class="pb-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
      ${has(config.rsvp?.deadline) ? `<p class="pb-small">${bi(config.rsvp.deadline)}</p>` : ''}
      <form class="rsvp pb-form" id="rsvp-form" novalidate>
        <div class="field">
          <label for="f-name">${bi({ en: 'Your name', ne: 'हजुरको नाम' })}</label>
          <input id="f-name" name="name" type="text" autocomplete="name" required maxlength="80" />
          <p class="field__err" id="f-name-err" role="alert"></p>
        </div>
        <fieldset class="field field--choice pb-attend">
          <legend>${bi({ en: 'Will you attend?', ne: 'उपस्थिति' })}</legend>
          <label class="choice"><input type="radio" name="attending" value="yes" checked /><span>${bi({ en: 'Joyfully, yes', ne: 'अवश्य आउँछौं' })}</span></label>
          <label class="choice"><input type="radio" name="attending" value="no" /><span>${bi({ en: 'With love, from afar', ne: 'टाढैबाट शुभकामना' })}</span></label>
        </fieldset>
        <div class="rsvp__when-yes">
          <div class="pb-form__row">
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
        <button class="pb-btn" type="submit" id="rsvp-submit">${bi(txt('rsvp.send'))}</button>
        <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
      </form>
    </div>
  </section>` : ''}

  <footer class="pb-close pb-sec" aria-label="Blessing">
    ${closeRef ? `<div class="pb-close__photo pb-rise">${frame(closeRef, altFor(closeRef, 'close.photo'), '(max-width: 760px) 70vw, 28vw', { style: 'line', fl: ['tl', 'br'] })}</div>` : ''}
    <div class="pb-close__text">
      ${flower('divider', 'pb-orn--rule')}
      <p class="pb-kicker pb-rise">${bi(txt('close.kicker'))}</p>
      ${has(config.closing) ? `<p class="pb-close__words pb-rise">${bi(config.closing)}</p>` : ''}
      <p class="pb-close__names pb-rise">${names('pb-names--small')}</p>
      ${c.hashtag ? `<p class="pb-small">${esc(c.hashtag)}</p>` : ''}
      <p class="pb-close__actions"><button class="pb-link" type="button" id="share">${bi(T.shareIt)}</button></p>
      <p class="pb-close__hosts">${bi(config.hosts)}</p>
    </div>
    ${madeWith()}
  </footer>

  <div class="pb-card-wrap" id="card" hidden role="dialog" aria-modal="true" aria-labelledby="card-title" data-lenis-prevent>
    <div class="pb-card" id="card-panel">
      <button class="pb-card__x" type="button" data-card-close><span aria-hidden="true">×</span><span class="sr-only">${esc(T.close.en)}</span></button>
      <img class="pb-card__orn" src="${FLORA}sprig.webp" alt="" aria-hidden="true" />
      ${has(config.invitation?.shloka?.sa) ? `<p class="pb-card__shloka" lang="sa">${esc(config.invitation.shloka.sa)}</p>` : ''}
      ${has(config.invitation?.shloka?.en) ? `<p class="pb-card__shloka-en l-en">${esc(config.invitation.shloka.en)}</p>` : ''}
      <h2 class="pb-card__title" id="card-title">${bi(txt('card.title'))}</h2>
      <p class="pb-card__p">${bi(config.invitation?.salutation || '')}</p>
      <p class="pb-card__p">${bi(config.invitation?.body || '')}</p>
      <p class="pb-card__p">${bi(config.invitation?.request || '')}</p>
      <p class="pb-card__sign">${bi(config.invitation?.signoff || '')}<br /><b>${bi(config.hosts)}</b></p>
    </div>
  </div>

  <div class="pb-lb" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photograph" data-lenis-prevent>
    <button type="button" class="pb-lb__btn pb-lb__x" data-lb="close"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <button type="button" class="pb-lb__btn pb-lb__prev" data-lb="prev"><span aria-hidden="true">←</span><span class="sr-only">Previous</span></button>
    <figure class="pb-lb__fig"></figure>
    <button type="button" class="pb-lb__btn pb-lb__next" data-lb="next"><span aria-hidden="true">→</span><span class="sr-only">Next</span></button>
  </div>`;

// ───────────────────────── Album: balanced columns, varied frames ─────────────────────────
const grid = document.getElementById('album-grid');
const STYLES = ['mat', 'floral', 'print', 'line', 'blush', 'mat', 'print', 'floral'];
const layoutAlbum = () => {
  if (!grid) return;
  const cols = window.innerWidth < 640 ? 2 : 3;
  if (grid.dataset.cols === String(cols)) return;
  grid.dataset.cols = String(cols);
  const heights = new Array(cols).fill(0);
  const buckets = Array.from({ length: cols }, () => []);
  album.forEach((g, i) => {
    const ar = aspectOf(g.photo) || (g.shape === 'land' ? 1.5 : g.shape === 'sq' ? 1 : 0.75);
    const k = heights.indexOf(Math.min(...heights));
    const cap = g.caption && !isLibrary(g.photo) ? bi(g.caption) : '';
    const style = STYLES[i % STYLES.length];
    buckets[k].push(`<button type="button" class="pb-album__btn pb-rise" data-idx="${i}" aria-label="${esc(g.alt || 'Open photograph')}">${frame(g.photo, g.alt, cols === 2 ? '46vw' : '(max-width: 1100px) 31vw, 28vw', { style, cap })}</button>`);
    heights[k] += 1 / ar + 0.25;
  });
  grid.innerHTML = buckets.map((b, i) => `<div class="pb-album__col" data-col="${i}">${b.join('')}</div>`).join('');
  watchAspects(grid);
  observe(grid);
};

/** Unknown aspect (uploads without w/h): measure once loaded. */
function watchAspects(root = document) {
  root.querySelectorAll('.pb-fr[data-orient="auto"] .pb-fr__img img').forEach((im) => {
    const set = () => {
      const ar = im.naturalWidth / im.naturalHeight;
      if (!ar) return;
      const p = im.closest('.pb-fr');
      p.style.setProperty('--ar', ar.toFixed(4));
      p.dataset.orient = ar >= 1.05 ? 'land' : ar <= 0.95 ? 'port' : 'sq';
    };
    if (im.complete && im.naturalWidth) set(); else im.addEventListener('load', set, { once: true });
  });
}

// Quiet reveals (opacity + transform only), never on body text.
const io = 'IntersectionObserver' in window && !reduced
  ? new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' })
  : null;
function observe(root = document) {
  root.querySelectorAll('.pb-rise:not(.is-in)').forEach((el) => (io ? io.observe(el) : el.classList.add('is-in')));
}

// ───────────────────────── Shell, RSVP, dialogs ─────────────────────────
const { player } = mountShell({ chapters: [] });
if (rsvpOn) initRsvp(events);
document.getElementById('add-calendar').addEventListener('click', () => downloadIcs(events));
document.getElementById('share').addEventListener('click', (e) => share(e.currentTarget));

const card = document.getElementById('card');
let closeCard = null;
const hideCard = () => {
  if (!closeCard) return;
  const done = closeCard; closeCard = null;
  card.classList.remove('is-open');
  setTimeout(() => { card.hidden = true; }, 320);
  done();
};
document.getElementById('open-card').addEventListener('click', () => {
  closeCard = openModal(card, { scroller: card, onClose: hideCard });
  card.scrollTop = 0;
  requestAnimationFrame(() => card.classList.add('is-open'));
});
card.addEventListener('click', (e) => { if (e.target === card || e.target.closest('[data-card-close]')) hideCard(); });

function initLightbox() {
  const lb = document.getElementById('lightbox');
  const fig = lb.querySelector('figure');
  const im = document.createElement('img');
  im.decoding = 'async';
  const cap = document.createElement('figcaption');
  fig.append(im, cap);
  let i = 0;
  const show = (k) => {
    i = (k + album.length) % album.length;
    const g = album[i];
    im.src = photoUrl(g.photo, 'lg');
    im.alt = g.alt || '';
    cap.innerHTML = g.caption && !isLibrary(g.photo) ? bi(g.caption) : '';
  };
  let release = null;
  const close = () => {
    if (!release) return;
    const r = release; release = null;
    lb.classList.remove('is-open');
    setTimeout(() => { lb.hidden = true; }, 300);
    r();
  };
  grid?.addEventListener('click', (e) => {
    const b = e.target.closest('.pb-album__btn');
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
}
layoutAlbum();
initLightbox();
watchAspects();
// In-page links glide (unless reduced motion); the page itself keeps native scrolling.
main.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  const t = a && document.querySelector(a.getAttribute('href'));
  if (!t) return;
  e.preventDefault();
  t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
});
let rw = window.innerWidth;
window.addEventListener('resize', () => { if (window.innerWidth !== rw) { rw = window.innerWidth; layoutAlbum(); } });

// ───────────────────────── Opening the gate ─────────────────────────
const enterBtn = document.getElementById('enter');
const quietBtn = document.getElementById('enter-quiet');
const visibleStage = () => [...gate.querySelectorAll('.pb-gate__stage')].find((s) => s.offsetParent !== null) || gate;
// The welcome board stands inside the arch opening; on short landscape screens it stands beside the arch.
const board = gate.querySelector('.pb-gate__board');
const placeBoard = () => {
  if (!board.isConnected) return;
  const side = window.innerWidth > window.innerHeight * 1.25 && window.innerHeight < 600;
  gate.classList.toggle('is-side', side);
  const home = side ? gate : visibleStage();
  if (board.parentNode !== home) home.append(board);
};
placeBoard();
window.addEventListener('resize', placeBoard);

const gateImgs = () => [...visibleStage().querySelectorAll('img')];
const timeout = (ms) => new Promise((r) => setTimeout(r, ms));
Promise.race([Promise.all(gateImgs().map((im) => im.decode?.().catch(() => {}))), timeout(8000)]).finally(() => {
  enterBtn.disabled = false;
  quietBtn.disabled = false;
  gate.classList.add('is-ready');
});

let opened = false;
function open(withMusic, { instant = false } = {}) {
  if (opened) return;
  opened = true;
  player.unlock();
  player.start(withMusic);
  window.scrollTo(0, 0);
  const done = () => {
    gate.remove();
    document.body.classList.remove('is-gated');
    document.getElementById('top')?.focus?.({ preventScroll: true });
    observe();
  };
  if (reduced || instant) {
    gate.classList.add('is-gone');
    setTimeout(done, instant ? 0 : 260);
    return;
  }
  // The signature motion: the board lifts away, the ladis part, and we step through.
  gate.classList.add('is-opening');
  setTimeout(() => document.body.classList.remove('is-gated'), 900);
  setTimeout(() => { observe(); }, 1100);
  setTimeout(done, 2300);
}
enterBtn.addEventListener('click', () => open(true));
quietBtn.addEventListener('click', () => open(false));

// ───────────────────────── Debug hook (screenshots) ─────────────────────────
if (DEBUG) {
  window.__pb = {
    open: (instant = true) => open(false, { instant }),
    to: (sel, offset = 0) => {
      const el = document.querySelector(sel);
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + offset);
    },
    revealAll: () => document.querySelectorAll('.pb-rise').forEach((el) => el.classList.add('is-in')),
    album: album.map((p) => keyOf(p.photo)),
  };
  if (params.has('open')) open(false, { instant: true });
}
