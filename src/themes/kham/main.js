// Theme · Kham (खाम) — the envelope.
// A luxury stationery suite on screen. A handmade-paper envelope sealed in sindoor wax fills the
// screen; tap the seal and it cracks, the flap lifts, the card slides out and unfolds (the one
// signature motion). Then a calm, readable scroll on paper: the couple as mounted prints, the
// programme as the hero of the page ("when is what" at a glance), the families, a few more
// photographs, a reply card and the blessing.
import '../../core/base.css';
import './kham.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadInvitation } from '../../core/data.js';
import { bi, esc, dateOf, timeLabel, mapUrl, neNum, bsDateOf } from '../../core/i18n.js';
import { mountShell } from '../../core/shell.js';
import { createSmooth, reducedMotion } from '../../core/smooth.js';
import { initRsvp } from '../../core/rsvp.js';
import { guestEvents } from '../../core/finale.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { openModal } from '../../core/modal.js';
import { useSlots } from '../../core/slots.js';
import { photoUrl } from '../../photos.js';
import credits from '../../generated/credits.json';
import manifest from './slots.js';
import { paperTiles, linerTile, deckle } from './paper.js';
import { knotSVG, sealSVG } from './art.js';
import { computeLayout, createEnvelope } from './envelope.js';

gsap.registerPlugin(ScrollTrigger);

const config = await loadInvitation();
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion() || params.has('still');
const c = config.couple;
const events = guestEvents();

// ───────────────────────── Slots ─────────────────────────
// ?debug&img.<slot>=<slug>&txt.<slot>=<text> previews a studio override.
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
const dims = Object.fromEntries(credits.map((k) => [String(k.file || k.slot).replace(/\.(jpe?g|png|webp)$/i, ''), [k.width, k.height]]));
const isUrl = (s) => typeof s === 'string' && (s.startsWith('/') || s.startsWith('https://'));
const isLibrary = (ref) => typeof ref === 'string' && !isUrl(ref);
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
const altFor = (ref, id) => portraitAlt[keyOf(ref)] || S.alt(id) || `${c.bride.name.en} and ${c.groom.name.en}`;

const imgTag = (ref, alt, sizes, { eager = false } = {}) => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  return `<img src="${esc(sm)}" ${sm !== lg ? `srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w"` : ''} sizes="${sizes}" alt="${esc(alt || '')}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
};
let seedN = 1;
/** A mounted print: the whole photo (never cropped) on a deckled card mount. */
const print = (ref, alt, sizes, { cls = '', rot = 0, eager = false, button = '' } = {}) => {
  const ar = aspectOf(ref);
  const inner = `<span class="kh-mount" data-deckle data-seed="${seedN++}" style="--ar:${ar ? ar.toFixed(4) : 'auto'}">${imgTag(ref, alt, sizes, { eager })}</span>`;
  return `<figure class="kh-print ${cls}" style="--rot:${rot}deg" data-orient="${ar ? (ar > 1.05 ? 'land' : ar < 0.95 ? 'port' : 'sq') : 'auto'}">${button ? `<button type="button" class="kh-print__btn" ${button}>${inner}</button>` : inner}</figure>`;
};

// ───────────────────────── Which photo goes where ─────────────────────────
const used = new Set();
const take = (ref) => { used.add(keyOf(ref)); return ref; };
const heroRef = S.img('hero.print');
const heroAr = aspectOf(heroRef) || 0.8;
const firstLayout = computeLayout(window.innerWidth, window.innerHeight, { printAr: heroRef ? (heroAr + 0.06) / 1.08 : 0 });
const heroInHero = !!(heroRef && firstLayout.print);
if (heroRef) take(heroRef);

const bridePh = S.img('families.bride');
const groomPh = S.img('families.groom');
const brideGroom = !!(bridePh && groomPh && keyOf(bridePh) !== keyOf(groomPh));

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
const prints = [...(heroRef && !heroInHero ? [{ photo: heroRef, alt: altFor(heroRef, 'hero.print') }] : []), ...fromSlots('prints', [1, 2, 3])];
if (brideGroom) { take(bridePh); take(groomPh); }
const albumCouple = fromSlots('album', [1, 2, 3, 4, 5, 6]);
const albumGallery = (config.gallery || [])
  .filter((g) => g?.photo && !used.has(keyOf(g.photo)) && !/^marigold/.test(keyOf(g.photo)))
  .filter((g, i, a) => a.findIndex((x) => keyOf(x.photo) === keyOf(g.photo)) === i)
  .sort((x, y) => Number(isCouple(y.photo)) - Number(isCouple(x.photo)));
const album = [...albumCouple, ...albumGallery].slice(0, 9);
// "The two of us": two staggered columns balanced by height (one column on phones).
const twoCols = [[], []];
{
  const hs = [0.35, 0];
  prints.forEach((p, i) => {
    const k = hs[0] <= hs[1] ? 0 : 1;
    twoCols[k].push({ p, i });
    hs[k] += 1 / (aspectOf(p.photo) || 0.8) + 0.12;
  });
}

// ───────────────────────── Dates ─────────────────────────
const NE_DIGIT = /[०-९]+/;
/** AD parts in Nepal time: { wd, day, monthYear } bilingual. */
function adParts(iso) {
  const en = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(new Date(iso));
  const g = (t) => en.find((p) => p.type === t)?.value || '';
  const [wdNe, ...restNe] = dateOf(iso).ne.split(', ');
  return { wd: { en: g('weekday'), ne: wdNe }, day: g('day'), month: { en: `${g('month')} ${g('year')}`, ne: restNe.join(', ') }, full: dateOf(iso) };
}
/** B.S. parts: from the shared converter (or the event's own override). */
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
  credits: { en: 'Photo and music credits', ne: 'श्रेय' },
  close: { en: 'Close', ne: 'बन्द गर्नुहोस्' },
  scroll: { en: 'The programme', ne: 'कार्यक्रम' },
  stays: { en: 'Where to stay', ne: 'बसाइ' },
  travel: { en: 'Getting there', ne: 'आउने बाटो' },
  contacts: { en: 'Questions', ne: 'सोधपुछ' },
  live: { en: 'Watch the ceremony live', ne: 'प्रत्यक्ष हेर्नुहोस्' },
};

const names = (cls = '') => `<span class="kh-n">${bi(c.bride.name)}</span> <span class="kh-amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span> <span class="kh-n">${bi(c.groom.name)}</span>`;
const knotLabel = 'Endless knot (shrivatsa)';

// ───────────────────────── Markup ─────────────────────────
const main = document.getElementById('main');
main.innerHTML = `
  <section class="kh-hero" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    <div class="kh-scene" id="scene">
      <div class="kh-card" id="card">
        <div class="kh-card__shadow" aria-hidden="true"></div>
        <div class="kh-card__shadow kh-card__shadow--t" aria-hidden="true"></div>
        <div class="kh-card__b kh-face" data-deckle data-edges="rbl" data-seed="41">
          <div class="kh-card__body">
            <h1 class="kh-names" id="names">${names()}</h1>
            <p class="kh-card__date">${bi({ en: mainAD.en, ne: mainBS.ne })}</p>
            <p class="kh-card__bs">${bi({ en: mainBS.en, ne: mainAD.ne })}</p>
            <span class="kh-rule" aria-hidden="true"></span>
            <p class="kh-card__line">${bi(txt('card.line'))}</p>
            <p class="kh-card__city">${bi(config.city)}</p>
          </div>
          <i class="kh-shade" aria-hidden="true"></i>
        </div>
        <div class="kh-card__t">
          <div class="kh-card__face kh-card__in kh-face" data-deckle data-edges="trl" data-seed="42">
            <div class="kh-card__body kh-card__body--top">
              <p class="kh-card__invoke" lang="ne">${esc(txt('card.invocation').ne)}</p>
              ${knotSVG({ cls: 'kh-card__knot', ink: 'var(--kh-sindoor)', gapColor: 'var(--kh-card)' })}
              <p class="kh-card__title" lang="ne">${esc(txt('card.title').ne)}</p>
              <p class="kh-card__title-en l-en">${esc(txt('card.title').en)}</p>
              <p class="kh-card__hosts">${bi(config.hosts)}</p>
            </div>
            <i class="kh-shade" aria-hidden="true"></i>
          </div>
          <div class="kh-card__face kh-card__cover kh-face" data-deckle data-edges="rbl" data-seed="43" aria-hidden="true">
            <div class="kh-card__body kh-card__body--cover">
              ${knotSVG({ cls: 'kh-card__foil', ink: 'var(--kh-sindoor)', gapColor: 'var(--kh-card)' })}
              <p class="kh-card__cover-names">${names()}</p>
            </div>
            <i class="kh-shade"></i>
          </div>
        </div>
      </div>
      ${heroInHero ? `<div class="kh-heroprint" id="heroprint">${print(heroRef, altFor(heroRef, 'hero.print'), '(max-width: 1200px) 34vw, 420px', { eager: true })}</div>` : ''}
      <button class="kh-seal" id="seal" type="button" aria-label="Open the invitation" disabled><span class="kh-seal__art"></span></button>
    </div>
    <div class="kh-gatetext" id="gatetext">
      <p class="kh-gatetext__line">${bi(txt('gate.line'))}</p>
      <p class="kh-gatetext__names">${names()}</p>
      <p class="kh-gatetext__date">${bi({ en: mainAD.en, ne: mainBS.ne })}</p>
      <p class="kh-gatetext__hint"><span class="kh-gatetext__hint-en">${esc(txt('gate.open').en)}</span><span class="kh-gatetext__hint-ne" lang="ne">${esc(txt('gate.open').ne)}</span></p>
      <button class="kh-quiet" type="button" id="quiet" disabled>${bi(txt('gate.quiet'))}</button>
    </div>
    <div class="kh-hero__after" id="after">
      <button class="kh-btn kh-btn--ghost" type="button" data-open-card>${bi(txt('card.button'))}</button>
      <a class="kh-cue" href="#programme"><span>${bi(T.scroll)}</span><i aria-hidden="true"></i></a>
    </div>
  </section>

  ${prints.length ? `
  <section class="kh-sec kh-two" id="two" aria-labelledby="two-title">
    <header class="kh-two__head kh-rv">
      <h2 class="kh-h2" id="two-title">${bi(txt('prints.title'))}</h2>
      <p class="kh-lede">${bi(txt('prints.line'))}</p>
    </header>
    <div class="kh-two__prints">
      ${twoCols.map((col, k) => `<div class="kh-two__col kh-two__col--${k + 1}">${col.map(({ p, i }) => print(p.photo, p.alt, '(max-width: 760px) 86vw, 30vw', { cls: `kh-rv kh-two__p kh-two__p--${i + 1}`, rot: [-1.6, 2.1, -0.8, 1.4][i % 4] })).join('')}</div>`).join('')}
    </div>
  </section>` : ''}

  <section class="kh-sec kh-prog" id="programme" aria-labelledby="prog-title">
    <header class="kh-prog__head kh-rv">
      ${knotSVG({ cls: 'kh-orn', ink: 'var(--kh-sindoor)', gapColor: 'var(--kh-page)' })}
      <p class="kh-kicker">${bi(txt('prog.kicker'))}</p>
      <h2 class="kh-h2" id="prog-title">${bi(txt('prog.title'))}</h2>
    </header>
    <div class="kh-sheetwrap"><div class="kh-sheet kh-prog__sheet" data-deckle data-seed="51">
      <ol class="kh-events">
        ${events.map((e, i) => {
          const ad = adParts(e.start);
          const bs = bsParts(e.start, e.dateBS);
          const sw = (e.dress?.colors || []).map(safeColor).filter(Boolean);
          return `
        <li class="kh-event" id="ev-${esc(e.id)}">
          <div class="kh-event__date" aria-hidden="true">
            <span class="kh-event__wd">${bi(ad.wd)}</span>
            <span class="kh-event__day">${bi({ en: ad.day, ne: bs.day || neNum(ad.day) })}</span>
            <span class="kh-event__my">${bi({ en: ad.month.en, ne: bs.monthYear || ad.month.ne })}</span>
            <span class="kh-event__alt">${bi({ en: `${bs.full.short?.en || bs.full.en}${bs.full.short?.en ? ' B.S.' : ''}`, ne: bs.day ? ad.month.ne : bs.full.ne })}</span>
          </div>
          <div class="kh-event__main">
            <h3 class="kh-event__title">${bi(e.title)}</h3>
            <p class="sr-only">${bi(ad.full)}. ${bi(bs.full)}</p>
            ${e.blurb ? `<p class="kh-event__blurb">${bi(e.blurb)}</p>` : ''}
            <dl class="kh-event__facts">
              <div><dt>${bi(T.time)}</dt><dd>${bi(timeLabel(e))}</dd></div>
              <div><dt>${bi(T.venue)}</dt><dd>${bi(e.venue)}<a class="kh-map" href="${esc(mapUrl(e.mapQuery || e.venue?.en || ''))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (${esc(e.venue?.en || '')}, opens Google Maps)</span></a></dd></div>
              ${(e.dress?.text?.en || e.dress?.text?.ne || sw.length) ? `<div><dt>${bi(T.wear)}</dt><dd class="kh-dress">${sw.length ? `<span class="kh-sw" aria-hidden="true">${sw.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(e.dress.text || T.wear)}</span></dd></div>` : ''}
            </dl>
            ${e.rituals?.length ? `
            <div class="kh-order">
              <p class="kh-order__label">${bi(txt('prog.order'))}</p>
              <ol>${e.rituals.map((r) => `<li><span class="kh-order__t">${bi(typeof r.time === 'string' ? { en: r.time, ne: neNum(r.time) } : r.time)}</span><span class="kh-order__n">${bi(r.title)}</span></li>`).join('')}</ol>
            </div>` : ''}
          </div>
          <span class="kh-event__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        </li>`;
        }).join('')}
      </ol>
      <div class="kh-prog__foot">
        <button class="kh-btn" type="button" id="add-calendar">${bi(T.calendar)}</button>
        <details class="kh-more">
          <summary>${bi(txt('prog.more'))}</summary>
          <div class="kh-more__grid">
            ${config.info?.travel ? `<div><h3>${bi(T.travel)}</h3><p>${bi(config.info.travel)}</p></div>` : ''}
            ${config.info?.stays?.length ? `<div><h3>${bi(T.stays)}</h3><ul>${config.info.stays.map((s) => `<li><b>${bi(s.name)}</b><small>${bi(s.note)}</small><a class="kh-map" href="${esc(mapUrl(s.mapQuery || s.name.en))}" target="_blank" rel="noopener">${bi(T.map)}<span aria-hidden="true"> ↗</span></a></li>`).join('')}</ul></div>` : ''}
            ${config.info?.contacts?.length ? `<div><h3>${bi(T.contacts)}</h3><ul>${config.info.contacts.map((p) => `<li><b>${bi(p.name)}</b><small>${bi(p.role)}</small><span class="kh-links"><a class="kh-map" href="tel:${esc(tel(p.phone))}">${bi(T.call)}</a><a class="kh-map" href="https://wa.me/${esc(tel(p.phone).replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span></li>`).join('')}</ul>
              ${safeHref(config.info.livestream) ? `<a class="kh-map" href="${esc(safeHref(config.info.livestream))}" target="_blank" rel="noopener">${bi(T.live)} ↗</a>` : ''}</div>` : ''}
          </div>
        </details>
      </div>
    </div></div>
  </section>

  <section class="kh-sec kh-fam" id="families" aria-labelledby="fam-title">
    <h2 class="kh-h2 kh-fam__title kh-rv" id="fam-title">${bi(txt('families.title'))}</h2>
    <div class="kh-fam__grid">
      <div class="kh-fam__side">
        ${brideGroom ? print(bridePh, c.bride.name.en, '(max-width: 760px) 60vw, 22vw', { cls: 'kh-fam__pic', rot: -1.2 }) : ''}
        <p class="kh-kicker">${bi(txt('families.bride'))}</p>
        <p class="kh-fam__name">${bi(c.bride.fullName)}</p>
        <p class="kh-fam__of">${bi(txt('families.daughter'))}</p>
        <p class="kh-fam__parents">${bi(c.bride.parents)}</p>
        <p class="kh-fam__home">${bi(c.bride.home)}</p>
      </div>
      <div class="kh-fam__mid" aria-hidden="true">${knotSVG({ cls: 'kh-fam__knot', ink: 'var(--kh-sindoor)', gapColor: 'var(--kh-page)' })}</div>
      <div class="kh-fam__side">
        ${brideGroom ? print(groomPh, c.groom.name.en, '(max-width: 760px) 60vw, 22vw', { cls: 'kh-fam__pic', rot: 1.2 }) : ''}
        <p class="kh-kicker">${bi(txt('families.groom'))}</p>
        <p class="kh-fam__name">${bi(c.groom.fullName)}</p>
        <p class="kh-fam__of">${bi(txt('families.son'))}</p>
        <p class="kh-fam__parents">${bi(c.groom.parents)}</p>
        <p class="kh-fam__home">${bi(c.groom.home)}</p>
      </div>
    </div>
    <p class="kh-fam__cta kh-rv"><button class="kh-btn kh-btn--ghost" type="button" data-open-card>${bi(txt('card.button'))}</button></p>
  </section>

  ${album.length ? `
  <section class="kh-sec kh-album" id="album" aria-labelledby="album-title">
    <h2 class="kh-h2 kh-rv" id="album-title">${bi(txt('album.title'))}</h2>
    <div class="kh-album__grid">
      ${album.map((g, i) => print(g.photo, g.alt, '(max-width: 760px) 46vw, 30vw', { cls: 'kh-rv', rot: [0.6, -0.5, 0.3, -0.7, 0.5][i % 5], button: `data-idx="${i}" aria-label="${esc(g.alt || 'Open photograph')}"` })).join('')}
    </div>
  </section>` : ''}

  <section class="kh-sec kh-reply" id="rsvp" aria-labelledby="rsvp-title">
    <div class="kh-reply__note">
      <p class="kh-kicker">${bi(countLine)}</p>
      <h2 class="kh-h2" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
      <p class="kh-lede">${bi(config.rsvp.deadline)}</p>
      <p class="kh-reply__actions">
        <button class="kh-link" type="button" id="share">${bi(T.shareIt)}</button>
      </p>
    </div>
    <div class="kh-sheetwrap kh-reply__wrap"><div class="kh-sheet kh-reply__card" data-deckle data-seed="61">
      <form class="rsvp kh-form" id="rsvp-form" novalidate>
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
          <div class="kh-form__row">
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
        <button class="kh-btn" type="submit" id="rsvp-submit">${bi(txt('rsvp.send'))}</button>
        <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
      </form>
    </div></div>
  </section>

  <footer class="kh-close" aria-label="Blessing">
    ${knotSVG({ cls: 'kh-close__knot', ink: 'var(--kh-sindoor)', gapColor: 'var(--kh-page)' })}
    <p class="kh-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
    <p class="kh-close__en">${esc(config.closing?.en || '')}</p>
    <p class="kh-close__names">${names()}</p>
    ${c.hashtag ? `<p class="kh-close__tag">${esc(c.hashtag)}</p>` : ''}
    <details class="kh-credits">
      <summary>${bi(T.credits)}</summary>
      <ul>${credits.map((k) => `<li>${esc(k.title || k.slot)} by ${esc(k.creator || 'unknown')}, <a href="${esc(k.license_url || k.source_url)}" target="_blank" rel="noopener">${esc(k.license)}</a>, <a href="${esc(k.source_url)}" target="_blank" rel="noopener">source</a></li>`).join('')}
      ${(config.music?.tracks || []).map((t) => `<li>${esc(t.credit)}</li>`).join('')}
      <li>Paper, envelope, seal and botanicals drawn in code for this invitation.</li></ul>
    </details>
  </footer>

  <div class="kh-modal" id="cardmodal" hidden role="dialog" aria-modal="true" aria-labelledby="cm-title" data-lenis-prevent>
    <div class="kh-modal__panel kh-sheet" id="cm-panel">
      <button class="kh-modal__x" type="button" data-close><span aria-hidden="true">×</span><span class="sr-only">${esc(T.close.en)}</span></button>
      ${knotSVG({ cls: 'kh-modal__knot', ink: 'var(--kh-sindoor)', gapColor: 'var(--kh-card)' })}
      <p class="kh-modal__shloka" lang="sa">${esc(config.invitation.shloka.sa)}</p>
      <p class="kh-modal__shloka-en l-en">${esc(config.invitation.shloka.en)}</p>
      <h2 class="kh-modal__title" id="cm-title"><span lang="ne">${esc(txt('card.title').ne)}</span></h2>
      <p class="kh-modal__p">${bi(config.invitation.salutation)}</p>
      <p class="kh-modal__p">${bi(config.invitation.body)}</p>
      <p class="kh-modal__p">${bi(config.invitation.request)}</p>
      <dl class="kh-modal__when">
        <div><dt>${bi({ en: 'Date', ne: 'मिति' })}</dt><dd>${bi(mainAD)}<br />${bi(mainBS)}</dd></div>
        <div><dt>${bi({ en: 'Place', ne: 'स्थान' })}</dt><dd>${bi(config.city)}</dd></div>
      </dl>
      <p class="kh-modal__sign">${bi(config.invitation.signoff)}<br /><b>${bi(config.hosts)}</b></p>
    </div>
  </div>

  <div class="kh-lb" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Photograph" data-lenis-prevent>
    <button type="button" class="kh-lb__btn kh-lb__x" data-lb="close"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
    <button type="button" class="kh-lb__btn kh-lb__prev" data-lb="prev"><span aria-hidden="true">←</span><span class="sr-only">Previous</span></button>
    <figure class="kh-lb__fig"><img alt="" decoding="async" /></figure>
    <button type="button" class="kh-lb__btn kh-lb__next" data-lb="next"><span aria-hidden="true">→</span><span class="sr-only">Next</span></button>
  </div>`;

document.querySelectorAll('[data-deckle]').forEach((el) => deckle(el));

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
  closeModal = openModal(modal, { onClose: hideModal });
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
  document.querySelector('.kh-album__grid')?.addEventListener('click', (e) => {
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

// ───────────────────────── Names that always fit the card ─────────────────────────
function fitNames() {
  const h = document.getElementById('names');
  if (!h) return;
  h.style.fontSize = '';
  const max = parseFloat(getComputedStyle(h).fontSize);
  const ps = getComputedStyle(h.parentElement);
  const box = h.parentElement.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight);
  let size = max;
  const lineH = () => parseFloat(getComputedStyle(h).lineHeight) || size * 1.1;
  // Shrink until the longest word fits and the names take at most two lines.
  for (let k = 0; k < 24; k++) {
    const tooWide = [...h.querySelectorAll('.kh-n')].some((n) => n.offsetWidth > box + 1) || h.scrollWidth > box + 1;
    const tooTall = h.offsetHeight > lineH() * 2.2;
    if (!tooWide && !tooTall) break;
    size *= 0.94;
    h.style.fontSize = `${size}px`;
  }
}

// ───────────────────────── Paper, then the envelope ─────────────────────────
const root = document.documentElement;
const hero = document.querySelector('.kh-hero');
const scene = document.getElementById('scene');
const sealBtn = document.getElementById('seal');
const quietBtn = document.getElementById('quiet');
const gateText = document.getElementById('gatetext');
const heroPrintEl = document.getElementById('heroprint');
document.body.classList.add('kh-locked');
window.scrollTo(0, 0);
let vh = window.innerHeight;
const setHeroH = () => { hero.style.height = `${vh}px`; };
setHeroH();

const [texPage, texEnv, texCard] = await paperTiles([
  { base: [247, 243, 235] },
  { base: [240, 232, 218], fibreDark: 'rgba(112,86,60,0.12)' },
  { base: [252, 250, 245], fibreLight: 'rgba(255,255,255,0.7)', fibreDark: 'rgba(120,96,70,0.07)' },
]);
const texLiner = await linerTile();
root.style.setProperty('--kh-tex-page', `url("${texPage}")`);
root.style.setProperty('--kh-tex-env', `url("${texEnv}")`);
root.style.setProperty('--kh-tex-card', `url("${texCard}")`);

const layoutNow = () => computeLayout(window.innerWidth, vh, { printAr: heroInHero ? (heroAr + 0.06) / 1.08 : 0 });
fitNames();
document.fonts?.ready.then(fitNames);

const env = createEnvelope({
  scene, card: document.getElementById('card'), print: heroPrintEl, gateText, sealButton: sealBtn,
  tex: { env: texEnv, liner: texLiner }, getLayout: layoutNow, reduced,
  onOpenStart: (phase) => {
    if (phase === 'start') {
      document.body.classList.add('is-opening');
    }
  },
  onDone: () => afterOpen(),
});
placeAfter(env.layout);
document.body.classList.add('is-ready');
sealBtn.disabled = false;
quietBtn.disabled = false;

function placeAfter(L) {
  const after = document.getElementById('after');
  after.style.top = `${Math.round(L.card.y + L.card.h + 22)}px`;
}

let opened = false;
function open(withMusic) {
  if (opened) return;
  opened = true;
  player.unlock();
  player.start(withMusic);
  env.open();
}
sealBtn.addEventListener('click', () => open(true));
quietBtn.addEventListener('click', () => open(false));

let lenis = null;
function afterOpen() {
  document.body.classList.remove('kh-locked', 'is-opening');
  document.body.classList.add('is-open');
  lenis = createSmooth();
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.kh-rv').forEach((el) => io.observe(el));
  document.querySelector('.kh-cue')?.addEventListener('click', (e) => {
    e.preventDefault();
    const y = document.getElementById('programme').getBoundingClientRect().top + window.scrollY - 24;
    if (lenis) lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  });
}

// Keep the scene right when the width changes (the iOS address bar only changes the height).
let rw = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === rw && env.finished) return;
  rw = window.innerWidth;
  vh = window.innerHeight;
  setHeroH();
  fitNames();
  if (!env.finished) { env.relayout(); placeAfter(env.layout); return; }
  const L = layoutNow();
  const box = (n, r) => n && r && Object.assign(n.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  box(document.getElementById('card'), L.card);
  if (heroPrintEl) { heroPrintEl.hidden = !L.print; box(heroPrintEl, L.print); }
  placeAfter(L);
});

// ───────────────────────── Debug hook (screenshots) ─────────────────────────
if (DEBUG) {
  window.__kh = {
    gsap, ScrollTrigger, env,
    open: () => open(false),
    seek: (t) => env.seek(t),
    finish: () => { opened = true; env.skip(); },
    to: (sel, offset = 0) => {
      const el = document.querySelector(sel);
      const y = el.getBoundingClientRect().top + window.scrollY + offset;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
      document.querySelectorAll('.kh-rv').forEach((n) => n.classList.add('is-in'));
    },
    sealSVG,
  };
  if (params.has('open')) window.__kh.finish();
}
