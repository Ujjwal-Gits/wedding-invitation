// Dhaka (ढाका): an heirloom stationery suite. A textured ivory envelope tied with a
// Palpali Dhaka band and sealed in wax opens on tap; the folded card rises and opens
// (the one signature motion). Then a calm, readable page: mounted prints of the couple,
// a clear programme, the families, and the reply card.
import '../../core/base.css';
import './dhaka.css';
import { gsap } from 'gsap';
import { loadInvitation } from '../../core/data.js';
import { bi, esc, dateOf, timeRange, mapUrl, neNum, biNodes, bsDateOf } from '../../core/i18n.js';
import { mountShell } from '../../core/shell.js';
import { createSmooth, reducedMotion, isMobile } from '../../core/smooth.js';
import { initRsvp } from '../../core/rsvp.js';
import { guestEvents } from '../../core/finale.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { openModal } from '../../core/modal.js';
import { useSlots } from '../../core/slots.js';
import { photoUrl, view } from '../../photos.js';
import credits from '../../generated/credits.json';
import manifest from './slots.js';
import { palpaliTile } from './weave.js';

const config = await loadInvitation();
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion();
const mobile = isMobile();
const used = new Set();

// ?debug&slots=demo applies a sample studio override (tests the slot plumbing without touching config.js).
if (DEBUG && params.get('slots') === 'demo') {
  config.themeContent = { ...(config.themeContent || {}), dhaka: {
    images: { 'prints.1': 'couple-7' },
    texts: { 'prog.title': { en: 'The days ahead', ne: 'आउँदा दिनहरू' }, 'card.with': { en: 'With joy and gratitude', ne: 'हर्ष र कृतज्ञतासहित' } },
  } };
}
const { img: slotImg, txt, alt: slotAlt } = useSlots(manifest);
const has = (o) => Boolean(o && (o.en || o.ne));

// ───────────────────────── helpers ─────────────────────────
const slugOf = (ref) => (typeof ref === 'string' && !ref.startsWith('/') && !ref.startsWith('https://') ? ref : null);
const keyOf = (ref) => slugOf(ref) || photoUrl(ref, 'sm');
const pos = (ref) => { const [x, y] = view(ref).focal || [0.5, 0.5]; return `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`; };
const img = (ref, alt, sizes, eager = false) => {
  if (!ref) return '';
  const s = slugOf(ref);
  if (s) used.add(s);
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  return `<img src="${esc(sm)}" srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w" sizes="${sizes}" alt="${esc(alt || '')}" style="object-position:${pos(ref)}" ${eager ? '' : 'loading="lazy"'} decoding="async" />`;
};
const dims = Object.fromEntries(credits.filter((k) => k.width && k.height).map((k) => [k.slot, k.width / k.height]));
const ratioOf = (ref) => {
  const s = slugOf(ref);
  if (s && dims[s]) return dims[s];
  if (ref && typeof ref === 'object' && ref.w && ref.h) return ref.w / ref.h;
  return 4 / 5;
};
const firstGrapheme = (s) => {
  const str = String(s || '').trim();
  if (!str) return '';
  if (window.Intl?.Segmenter) return [...new Intl.Segmenter('ne', { granularity: 'grapheme' }).segment(str)][0].segment;
  return str[0];
};

// B.S. dates come from the shared converter (an event's own dateBS wins).
function bsOf(e) {
  const d = bsDateOf(e.start, e.dateBS);
  return e.dateBS ? d : { en: `${d.short.en} B.S.`, ne: `वि.सं. ${d.short.ne}` };
}

// ───────────────────────── data ─────────────────────────
const c = config.couple;
const B = c.bride;
const G = c.groom;
const events = guestEvents();
const portraits = (c.portraits || []).filter((p) => p?.photo);
const altFor = (ref, fallback) => portraits.find((p) => keyOf(p.photo) === keyOf(ref))?.alt || fallback;
const prints = [];
{
  const seen = new Set();
  Object.keys(manifest.images).filter((id) => id.startsWith('prints.')).forEach((id) => {
    const ref = slotImg(id);
    if (!ref || seen.has(keyOf(ref))) return;
    seen.add(keyOf(ref));
    prints.push({ photo: ref, alt: altFor(ref, slotAlt(id)) });
  });
}
const storyList = config.story || [];
const printsLine = has(txt('prints.line')) ? txt('prints.line') : storyList[storyList.length - 1]?.text;
const closingLine = has(txt('closing.line')) ? txt('closing.line') : config.closing;
const brideP = (config.themeContent?.dhaka?.images?.['fam.bride'] || B.photo) ? slotImg('fam.bride') : null;
const groomP = (config.themeContent?.dhaka?.images?.['fam.groom'] || G.photo) ? slotImg('fam.groom') : null;
const liningRef = slotImg('envelope.lining');

// ───────────────────────── shell + textures ─────────────────────────
const { player } = mountShell({ chapters: [] });
const band = palpaliTile({ cell: 2.4 });
const lining = palpaliTile({ cell: mobile ? 3 : 3.5 });
const rootStyle = document.documentElement.style;
rootStyle.setProperty('--dhaka', `url(${band.url})`);
rootStyle.setProperty('--dhaka-ratio', String(band.width / band.height));
rootStyle.setProperty('--lining-weave', `url(${lining.url})`);
rootStyle.setProperty('--lining-size', `${lining.width}px ${lining.height}px`);
// Paper: fine fibre noise plus a soft mottle, generated as SVG so it stays crisp at any size.
const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
rootStyle.setProperty('--paper-grain', svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .40  0 0 0 0 .32  0 0 0 0 .22  0 0 0 .13 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`));
rootStyle.setProperty('--paper-mottle', svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='700' height='700'><filter id='m'><feTurbulence type='fractalNoise' baseFrequency='.008' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .55  0 0 0 0 .45  0 0 0 0 .32  0 0 0 .16 0'/></filter><rect width='100%' height='100%' filter='url(#m)'/></svg>`));
if (liningRef) {
  rootStyle.setProperty('--lining-weave', `url("${encodeURI(photoUrl(liningRef, 'sm'))}")`);
  rootStyle.setProperty('--lining-size', 'cover');
  if (slugOf(liningRef)) used.add(slugOf(liningRef));
}

// ───────────────────────── markup ─────────────────────────
const wDate = config.weddingDate;
const amp = '<span class="amp" aria-hidden="true">&amp;</span>';
const nameStack = `<span class="nm">${bi(B.name)}</span>${amp}<span class="nm">${bi(G.name)}</span>`;
const kicker = txt('card.kicker');

// The card: a top flap (inside + cover faces) hinged on a bottom half.
const cardMarkup = (id) => `
  <div class="card" ${id ? `id="${id}"` : 'aria-hidden="true"'}>
    <div class="card__half card__half--bottom">
      <div class="card__in card__in--bottom">
        <p class="card__invite">${bi(txt('card.invite'))}</p>
        <p class="card__date">${bi(dateOf(wDate))}</p>
        <p class="card__bs" lang="ne">${esc(config.weddingDateBS?.ne || '')}</p>
        <p class="card__city">${bi(config.city)}</p>
        <button type="button" class="btn-line" data-open-card ${id ? '' : 'tabindex="-1"'}>${bi(txt('card.button'))}</button>
      </div>
      <i class="card__band card__band--bottom" aria-hidden="true"></i>
    </div>
    <div class="card__flap">
      <div class="card__face card__face--in">
        <i class="card__band" aria-hidden="true"></i>
        <div class="card__in card__in--top">
          <p class="card__kicker" lang="ne">${esc(kicker.ne)}</p>
          <p class="card__with">${bi(txt('card.with'))}</p>
          <${id ? 'h1' : 'p'} class="card__names">${id ? `<span class="sr-only">${esc(B.name.en)} and ${esc(G.name.en)}</span><span class="card__stack" aria-hidden="true">${nameStack}</span>` : `<span class="card__stack">${nameStack}</span>`}</${id ? 'h1' : 'p'}>
        </div>
      </div>
      <div class="card__face card__face--out" aria-hidden="true">
        <i class="card__band card__band--wide"></i>
        <p class="card__cover-word" lang="ne">${esc(txt('card.cover').ne)}</p>
        <p class="card__cover-mono"><span>${esc(firstGrapheme(B.name.en).toUpperCase())}</span>${amp}<span>${esc(firstGrapheme(G.name.en).toUpperCase())}</span></p>
      </div>
    </div>
  </div>`;

// Wax seal: an irregular hand-poured disc with the couple's Devanagari initials pressed in.
const sealPath = (() => {
  const n = 22;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 52 + Math.sin(i * 2.7) * 2.6 + Math.cos(i * 1.3) * 2.2 + (i % 5 === 0 ? 3 : 0);
    return [60 + Math.cos(a) * r, 60 + Math.sin(a) * r];
  });
  let d = `M ${((pts[0][0] + pts[n - 1][0]) / 2).toFixed(1)} ${((pts[0][1] + pts[n - 1][1]) / 2).toFixed(1)}`;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % n];
    d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)} ${((p[1] + q[1]) / 2).toFixed(1)}`;
  });
  return `${d} Z`;
})();
const sealInitials = `${firstGrapheme(B.name.ne || B.name.en)}·${firstGrapheme(G.name.ne || G.name.en)}`;
const seal = `
  <svg class="seal__svg" viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <radialGradient id="wax" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#C73A43"/><stop offset=".55" stop-color="#9B1D27"/><stop offset="1" stop-color="#6B1119"/></radialGradient>
      <filter id="waxShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="2.6" flood-color="#40120f" flood-opacity=".42"/></filter>
    </defs>
    <path d="${sealPath}" fill="url(#wax)" filter="url(#waxShadow)"/>
    <circle cx="60" cy="60" r="38" fill="none" stroke="#6F1219" stroke-width="3.2" opacity=".55"/>
    <circle cx="60" cy="61.2" r="38" fill="none" stroke="#E07A7F" stroke-width="1" opacity=".45"/>
    <text x="60" y="71.6" text-anchor="middle" font-family="Martel, serif" font-weight="700" font-size="29" fill="#E58489" opacity=".5">${esc(sealInitials)}</text>
    <text x="60" y="70.4" text-anchor="middle" font-family="Martel, serif" font-weight="700" font-size="29" fill="#6E1119">${esc(sealInitials)}</text>
  </svg>`;

const gate = document.createElement('div');
gate.className = 'env-gate';
gate.id = 'gate';
gate.innerHTML = `
  <div class="env-gate__bg" aria-hidden="true"></div>
  <div class="env" id="env">
    <div class="env__back"><i class="env__lining" aria-hidden="true"></i></div>
    <div class="env__card" id="env-card">${cardMarkup()}</div>
    <div class="env__front">
      <svg class="env__folds" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 100 L50 52 L100 100" fill="none" stroke="rgba(90,70,45,.18)" stroke-width=".25" vector-effect="non-scaling-stroke"/></svg>
      <div class="env__text">
        <p class="env__kicker">${bi(txt('env.kicker'))}</p>
        <h1 class="env__names"><span class="sr-only">${esc(B.name.en)} and ${esc(G.name.en)}</span><span aria-hidden="true">${bi(B.name)} ${amp} ${bi(G.name)}</span></h1>
        <p class="env__line">${bi(txt('gate.line'))}</p>
        <p class="env__date">${bi(dateOf(wDate))}</p>
      </div>
    </div>
    <div class="env__flap"><div class="env__flap-face env__flap-face--front"></div><div class="env__flap-face env__flap-face--back"><i class="env__lining" aria-hidden="true"></i></div></div>
    <i class="env__band env__band--l" aria-hidden="true"></i><i class="env__band env__band--r" aria-hidden="true"></i>
    <button type="button" class="seal" id="seal" aria-label="${esc(txt('gate.open').en)}">${seal}</button>
  </div>
  <div class="env-gate__ctl">
    <p class="env-gate__tap">${bi(txt('gate.open'))}</p>
    <button type="button" class="link-quiet" id="open-quiet">${bi(txt('gate.quiet'))}</button>
  </div>`;
document.body.insertBefore(gate, document.getElementById('main'));
// Folded state: the card's top half lies folded over its bottom half inside the envelope.
gsap.set(gate.querySelector('.card__flap'), { rotationX: 180, transformPerspective: 1600 });
gsap.set(gate.querySelector('.env__flap'), { rotationX: 0, transformPerspective: 1400 });

// Prints in justified rows: each row shares a height, every photo keeps its proportions.
function printRows() {
  const target = mobile ? 1.5 : 2.6;
  const rows = [];
  let cur = [];
  let sum = 0;
  prints.forEach((p, i) => {
    const r = ratioOf(p.photo);
    cur.push({ p, i, r });
    sum += r;
    if (sum >= target || (i === 0 && !mobile)) { rows.push({ items: cur, sum }); cur = []; sum = 0; }
  });
  if (cur.length) rows.push({ items: cur, sum });
  const maxH = mobile ? 70 : 74;
  return rows.map((row) => `
    <div class="prints__row" style="max-width:calc(${row.sum.toFixed(3)} * ${maxH}svh + ${(row.items.length - 1) * 48}px)">${row.items.map(({ p, i, r }) => `
      <figure class="print reveal" style="flex-grow:${r.toFixed(4)}">
        <button type="button" class="print__btn" data-idx="${i}" aria-label="${esc(p.alt || 'Photo')}: enlarge">
          <span class="print__photo" style="aspect-ratio:${r.toFixed(4)}">${img(p.photo, p.alt, mobile ? '92vw' : '60vw')}</span>
        </button>
      </figure>`).join('')}</div>`).join('');
}

const swatches = (e) => (e.dress?.colors || []).map((col) => `<i style="background:${esc(col)}"></i>`).join('');
const ritualTime = (t) => (typeof t === 'string' ? { en: t, ne: neNum(t) } : t);
const programme = events.map((e) => {
  const bs = bsOf(e);
  return `
  <article class="pg reveal" aria-labelledby="pg-${esc(e.id)}">
    <div class="pg__head">
      <h3 class="pg__name" id="pg-${esc(e.id)}">${bi(e.title)}</h3>
      ${e.dress ? `<p class="pg__dress"><span class="pg__sw" aria-hidden="true">${swatches(e)}</span>${bi(e.dress.text || { en: '', ne: '' })}</p>` : ''}
    </div>
    <dl class="pg__facts">
      <div><dt>${bi({ en: 'Day', ne: 'बार र मिति' })}</dt><dd>${bi(dateOf(e.start))}${bs ? `<span class="pg__bs">${bi(bs)}</span>` : ''}</dd></div>
      <div><dt>${bi({ en: 'Time', ne: 'समय' })}</dt><dd>${bi(timeRange(e.start, e.end))}</dd></div>
      <div><dt>${bi({ en: 'Venue', ne: 'स्थान' })}</dt><dd>${bi(e.venue)}<a class="pg__map" href="${esc(mapUrl(e.mapQuery || e.venue.en))}" target="_blank" rel="noopener">${bi({ en: 'Open map', ne: 'नक्सा हेर्नुहोस्' })}<span aria-hidden="true"> ↗</span></a></dd></div>
    </dl>
    ${e.rituals?.length ? `<details class="pg__order"><summary>${bi({ en: 'Order of the day', ne: 'दिनभरको कार्यक्रम' })}</summary><ol>${e.rituals.map((r) => `<li><span>${bi(ritualTime(r.time))}</span>${bi(r.title)}</li>`).join('')}</ol></details>` : ''}
  </article>`;
}).join('');

const family = (p, role, photo, side) => `
  <article class="fam__card reveal">
    ${photo ? `<figure class="fam__photo print"><span class="print__photo" style="aspect-ratio:4/5">${img(photo, p.name.en, mobile ? '80vw' : '30vw')}</span></figure>` : ''}
    <p class="label">${bi(role)}</p>
    <h3 class="fam__name">${bi(p.fullName || p.name)}</h3>
    <p class="fam__parents">${bi(p.parents)}</p>
    <p class="fam__home">${bi(p.home)}</p>
  </article>`;

const main = document.getElementById('main');
main.innerHTML = `
<section class="hero" aria-label="${esc(B.name.en)} and ${esc(G.name.en)}">
  ${cardMarkup('card-hero')}
</section>

<section class="sec prints" aria-labelledby="prints-title">
  <header class="sec__head reveal">
    <i class="sec__band" aria-hidden="true"></i>
    <h2 class="sec__title" id="prints-title">${bi(txt('prints.title'))}</h2>
    ${has(printsLine) ? `<p class="sec__line">${bi(printsLine)}</p>` : ''}
  </header>
  <div class="prints__rows">${printRows()}</div>
</section>

<section class="sec prog" id="programme" aria-labelledby="prog-title">
  <header class="sec__head reveal">
    <i class="sec__band" aria-hidden="true"></i>
    <h2 class="sec__title" id="prog-title">${bi(txt('prog.title'))}</h2>
    <p class="sec__line sec__line--small">${bi(txt('prog.note'))}</p>
  </header>
  <div class="prog__list">${programme}</div>
</section>

<section class="sec fam" aria-labelledby="fam-title">
  <header class="sec__head reveal">
    <i class="sec__band" aria-hidden="true"></i>
    <h2 class="sec__title" id="fam-title">${bi(txt('fam.title'))}</h2>
  </header>
  <div class="fam__pair">
    ${family(B, txt('fam.bride'), brideP, 'b')}
    ${family(G, txt('fam.groom'), groomP, 'g')}
  </div>
  <p class="fam__hosts reveal">${bi(config.hosts)}</p>
  <div class="fam__cta reveal"><button type="button" class="btn-line" data-open-card>${bi(txt('card.button'))}</button></div>
</section>

<section class="sec reply" id="rsvp" aria-labelledby="rsvp-title">
  <div class="reply__card reveal">
    <i class="sec__band" aria-hidden="true"></i>
    <h2 class="sec__title" id="rsvp-title">${bi(txt('reply.title'))}</h2>
    <p class="reply__deadline">${bi(config.rsvp.deadline)}</p>
    <p class="reply__count" id="countdown" role="timer"></p>
    <form class="rsvp dk-form" id="rsvp-form" novalidate>
      <div class="field">
        <label for="f-name">${bi({ en: 'Your name', ne: 'हजुरको नाम' })}</label>
        <input id="f-name" name="name" type="text" autocomplete="name" required maxlength="80" />
        <p class="field__err" id="f-name-err" role="alert"></p>
      </div>
      <div class="field">
        <label for="f-phone">${bi({ en: 'Phone (optional)', ne: 'फोन (ऐच्छिक)' })}</label>
        <input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" />
      </div>
      <fieldset class="field">
        <legend>${bi({ en: 'Will you attend?', ne: 'हजुर आउनुहुन्छ?' })}</legend>
        <div class="seg">
          <label class="seg__opt"><input type="radio" name="attending" value="yes" checked /><span>${bi({ en: 'Joyfully, yes', ne: 'अवश्य आउँछौं' })}</span></label>
          <label class="seg__opt"><input type="radio" name="attending" value="no" /><span>${bi({ en: 'With love, from afar', ne: 'टाढैबाट शुभकामना' })}</span></label>
        </div>
      </fieldset>
      <div class="rsvp__when-yes">
        <div class="field field--guests">
          <label for="f-guests">${bi({ en: 'Guests, including you', ne: 'पाहुना संख्या' })}</label>
          <select id="f-guests" name="guests"></select>
        </div>
        <fieldset class="field">
          <legend>${bi({ en: 'Which ceremonies?', ne: 'कुन कार्यक्रम?' })}</legend>
          <div id="f-events" class="chips"></div>
        </fieldset>
        <fieldset class="field">
          <legend>${bi({ en: 'Meal', ne: 'खाना' })}</legend>
          <div class="chips">
            <label class="choice"><input type="radio" name="meal" value="veg" /><span>${bi({ en: 'Vegetarian', ne: 'शाकाहारी' })}</span></label>
            <label class="choice"><input type="radio" name="meal" value="nonveg" checked /><span>${bi({ en: 'Non-vegetarian', ne: 'मांसाहारी' })}</span></label>
          </div>
        </fieldset>
      </div>
      <div class="field">
        <label for="f-msg">${bi({ en: 'A blessing for the couple (optional)', ne: 'शुभकामना (ऐच्छिक)' })}</label>
        <textarea id="f-msg" name="message" rows="3" maxlength="500"></textarea>
      </div>
      <div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>
      <button class="btn-solid" type="submit" id="rsvp-submit">${bi(txt('reply.send'))}</button>
      <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
    </form>
  </div>
</section>

<section class="sec guest" aria-labelledby="guest-title">
  <h2 class="sr-only" id="guest-title">${bi({ en: 'For our guests', ne: 'पाहुनाहरूका लागि' })}</h2>
  <div class="guest__col reveal">
    <p class="label">${bi({ en: 'Where to stay', ne: 'बस्ने ठाउँ' })}</p>
    <ul>${(config.info?.stays || []).map((s) => `<li><b>${bi(s.name)}</b><span>${bi(s.note)}</span><a href="${esc(mapUrl(s.mapQuery))}" target="_blank" rel="noopener">${bi({ en: 'Open map', ne: 'नक्सा हेर्नुहोस्' })} ↗</a></li>`).join('')}</ul>
  </div>
  <div class="guest__col reveal">
    <p class="label">${bi({ en: 'Getting there', ne: 'आउने बाटो' })}</p>
    <p class="guest__p">${bi(config.info?.travel || '')}</p>
  </div>
  <div class="guest__col reveal">
    <p class="label">${bi({ en: 'Questions? Call the family', ne: 'केही सोध्नु छ? परिवारलाई फोन गर्नुहोस्' })}</p>
    <ul>${(config.info?.contacts || []).map((p) => {
      const tel = String(p.phone).replace(/[^\d+]/g, '');
      return `<li><b>${bi(p.name)}</b><span>${bi(p.role)}</span><span class="guest__links"><a href="tel:${esc(tel)}">${bi({ en: 'Call', ne: 'फोन' })}</a><a href="https://wa.me/${esc(tel.replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span></li>`;
    }).join('')}</ul>
  </div>
</section>

<footer class="end">
  <i class="end__band" aria-hidden="true"></i>
  ${has(closingLine) ? `<p class="end__line">${bi(closingLine)}</p>` : ''}
  <p class="end__names" aria-hidden="true">${bi(B.name)} ${amp} ${bi(G.name)}</p>
  <div class="end__actions">
    <button class="btn-line" type="button" id="add-calendar">${bi({ en: 'Add to calendar', ne: 'क्यालेन्डरमा थप्नुहोस्' })}</button>
    <button class="btn-line" type="button" id="share">${bi({ en: 'Share the invitation', ne: 'निम्तो पठाउनुहोस्' })}</button>
  </div>
  ${c.hashtag ? `<p class="end__tag">${esc(c.hashtag)}</p>` : ''}
  <details class="end__credits">
    <summary>${bi({ en: 'Photo and music credits', ne: 'तस्बिर र संगीतको श्रेय' })}</summary>
    <ul id="credits-list"></ul>
  </details>
</footer>

<dialog class="letter" id="letter" aria-labelledby="letter-title" data-lenis-prevent>
  <form method="dialog" class="letter__close-f"><button class="letter__close" type="submit"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button></form>
  <i class="sec__band" aria-hidden="true"></i>
  <div class="letter__body">
    <p class="letter__shloka" lang="sa">${esc(config.invitation?.shloka?.sa || '')}</p>
    <p class="letter__shloka-en l-en">${esc(config.invitation?.shloka?.en || '')}</p>
    <h2 class="letter__title" id="letter-title" lang="ne">${esc(kicker.ne)}</h2>
    <p class="letter__sal">${bi(config.invitation?.salutation || '')}</p>
    <p>${bi(config.invitation?.body || '')}</p>
    <p class="letter__when">${bi(dateOf(wDate))}<br />${bi(config.weddingDateBS)}</p>
    <p>${bi(config.invitation?.request || '')}</p>
    <p class="letter__sign">${bi(config.invitation?.signoff || '')}<br /><b>${bi(config.hosts)}</b></p>
  </div>
</dialog>

<dialog class="lb" id="lb" aria-label="Photo" data-lenis-prevent>
  <form method="dialog"><button class="lb__close" type="submit"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button></form>
  <figure class="lb__fig"><figcaption></figcaption></figure>
  <button type="button" class="lb__nav lb__nav--prev" data-lb="-1"><span aria-hidden="true">←</span><span class="sr-only">Previous</span></button>
  <button type="button" class="lb__nav lb__nav--next" data-lb="1"><span aria-hidden="true">→</span><span class="sr-only">Next</span></button>
</dialog>`;

document.getElementById('credits-list').innerHTML = credits.filter((k) => used.has(k.slot)).map((k) => `<li>${esc(k.title || k.slot)} by ${esc(k.creator || 'unknown')}, <a href="${esc(k.license_url || k.source_url)}" target="_blank" rel="noopener">${esc(k.license)}</a>, <a href="${esc(k.source_url)}" target="_blank" rel="noopener">source</a></li>`).join('')
  + (config.music?.tracks || []).map((t) => `<li>${esc(t.credit)}</li>`).join('')
  + '<li>The Palpali Dhaka pattern is woven in code for this design.</li>';

// ───────────────────────── behaviours ─────────────────────────
initRsvp(events);
startCountdown(document.getElementById('countdown'));
document.getElementById('add-calendar').addEventListener('click', () => downloadIcs(events));
document.getElementById('share').addEventListener('click', (e) => share(e.currentTarget));

// Dialogs: native <dialog> for the top layer; core openModal for scroll lock and focus.
const showDialog = (dlg) => {
  dlg.showModal();
  const release = openModal(dlg, { scroller: dlg, onClose: () => { if (dlg.open) dlg.close(); } });
  dlg.addEventListener('close', release, { once: true });
};
const letter = document.getElementById('letter');
document.querySelectorAll('#main [data-open-card]').forEach((b) => b.addEventListener('click', () => showDialog(letter)));
letter.addEventListener('click', (e) => { if (e.target === letter) letter.close(); });

(function initLightbox() {
  const lb = document.getElementById('lb');
  const im = document.createElement('img');
  im.decoding = 'async';
  const cap = lb.querySelector('figcaption');
  cap.before(im);
  let i = 0;
  const show = (k) => {
    i = (k + prints.length) % prints.length;
    im.src = photoUrl(prints[i].photo, 'lg');
    im.alt = prints[i].alt || '';
    cap.textContent = `${i + 1} / ${prints.length}`;
  };
  document.querySelector('.prints__rows').addEventListener('click', (e) => {
    const b = e.target.closest('.print__btn');
    if (!b) return;
    show(Number(b.dataset.idx));
    showDialog(lb);
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
})();

function startCountdown(el) {
  const target = new Date(wDate).getTime();
  const tick = () => {
    const days = Math.ceil((target - Date.now()) / 86400000);
    el.replaceChildren();
    if (days <= 0) el.append(...biNodes('Today is the day.', 'आज शुभ दिन।'));
    else el.append(...biNodes(`${days} ${days === 1 ? 'day' : 'days'} to go`, `अब ${neNum(days)} दिन बाँकी`));
  };
  tick();
  setInterval(tick, 60 * 60 * 1000);
}

// Quiet reveals: a short fade as sections arrive (no scroll-scrubbed motion).
function initReveals() {
  const items = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));
}

// ───────────────────────── the envelope (signature motion) ─────────────────────────
let lenis = null;
let opened = false;
function finishOpen() {
  document.body.classList.remove('is-gated');
  gate.remove();
  initReveals();
  if (!reduced) lenis = createSmooth();
}
function open(withMusic) {
  if (opened) return;
  opened = true;
  if (withMusic) player.unlock();
  player.start(withMusic);
  window.scrollTo(0, 0);
  if (reduced) {
    gsap.to(gate, { opacity: 0, duration: 0.4, onComplete: finishOpen });
    return;
  }
  // Where the card must land: exactly over the hero card underneath.
  const hero = document.getElementById('card-hero').getBoundingClientRect();
  const envCard = document.getElementById('env-card');
  const startRect = envCard.getBoundingClientRect();
  const dx = hero.left - startRect.left;
  const dy = hero.top - startRect.top;
  const env = document.getElementById('env');
  const flap = env.querySelector('.env__flap');
  const cardFlap = envCard.querySelector('.card__flap');
  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, onComplete: finishOpen });
  tl.to('.env-gate__ctl, .env__text', { opacity: 0, duration: 0.3, ease: 'power1.out' }, 0)
    .to('#seal', { scale: 1.12, duration: 0.18, ease: 'power2.out' }, 0)
    .to('#seal', { y: -40, scale: 0.7, opacity: 0, duration: 0.45, ease: 'power2.in' }, 0.18)
    .to('.env__band--l', { xPercent: -16, opacity: 0, duration: 0.6 }, 0.2)
    .to('.env__band--r', { xPercent: 16, opacity: 0, duration: 0.6 }, 0.2)
    .to(flap, { rotationX: 180, duration: 0.85, ease: 'power2.inOut' }, 0.45)
    .set(flap, { zIndex: 0 }, 0.88)
    .to(envCard, { y: () => -(startRect.height * 0.62), duration: 0.8, ease: 'power2.out' }, 1.15)
    .to('.env__back, .env__front, .env__flap', { y: () => window.innerHeight, opacity: 0, duration: 0.85, ease: 'power2.in' }, 1.75)
    .to(envCard, { x: dx, y: dy, duration: 0.9, ease: 'power3.inOut' }, 1.85)
    .to(cardFlap, { rotationX: 0, duration: 0.9, ease: 'power2.inOut' }, 2.5)
    .call(() => document.body.classList.remove('is-gated'), null, 3.1)
    .to('.env-gate__bg', { opacity: 0, duration: 0.6, ease: 'power1.out' }, 3.1);
}
document.getElementById('seal').addEventListener('click', () => open(true));
document.getElementById('open-quiet').addEventListener('click', () => open(false));

// ───────────────────────── debug ─────────────────────────
if (DEBUG) {
  window.__dk = {
    enter: () => open(false),
    instant: () => { opened = true; player.start(false); finishOpen(); },
    scrollTo: (y) => { lenis?.resize(); window.scrollTo(0, y); lenis?.scrollTo(y, { immediate: true, force: true }); },
  };
}
