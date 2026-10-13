// Dhaka Modern (ढाका): a design-led invitation built on a Swiss grid and a
// generative Dhaka weave. Signature motion: the cloth is woven on scroll into the
// couple's initials, then unravels to reveal them.
import '../../core/base.css';
import './dhaka.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadInvitation } from '../../core/data.js';
import { bi, esc, dateOf, timeRange, mapUrl, neNum, biNodes } from '../../core/i18n.js';
import { mountShell } from '../../core/shell.js';
import { createSmooth, reducedMotion, isMobile } from '../../core/smooth.js';
import { initRsvp } from '../../core/rsvp.js';
import { guestEvents } from '../../core/finale.js';
import { downloadIcs, share } from '../../core/calendar.js';
import { photoUrl, view } from '../../photos.js';
import credits from '../../generated/credits.json';
import { Loom, bandTexture, wovenMonogram, C } from './weave.js';
import { useSlots } from '../../core/slots.js';
import manifest from './slots.js';
import { openModal } from '../../core/modal.js';

gsap.registerPlugin(ScrollTrigger);

const config = await loadInvitation();
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion();
const mobile = isMobile();
const used = new Set();
// ?debug&slots=demo: a sample studio override, to test the slot plumbing without touching config.js.
if (DEBUG && params.get('slots') === 'demo') {
  config.themeContent = { ...(config.themeContent || {}), dhaka: {
    images: { 'hero.photo': 'couple-6', 'us.1': 'couple-7' },
    texts: { 'reveal.title': { en: 'Soon, together', ne: 'छिट्टै, सँगै' }, 'hero.line': { en: 'One loom, two families.', ne: 'एउटै तान, दुई परिवार।' } },
  } };
}
const { img: slotImg, txt, alt: slotAlt } = useSlots(manifest);
const fill = (o, vars) => ({ en: o.en.replace(/\{(\w+)\}/g, (_, k) => vars[k]?.en ?? ''), ne: o.ne.replace(/\{(\w+)\}/g, (_, k) => vars[k]?.ne ?? vars[k]?.en ?? '') });

// ───────────────────────── helpers ─────────────────────────
const slugOf = (ref) => (typeof ref === 'string' && !ref.startsWith('/') && !ref.startsWith('https://') ? ref : null);
const focalOf = (ref) => view(ref).focal || [0.5, 0.5];
const pos = (ref) => { const [x, y] = focalOf(ref); return `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`; };
const img = (ref, alt, sizes, { cls = '', eager = false } = {}) => {
  if (!ref) return '';
  const s = slugOf(ref);
  if (s) used.add(s);
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  return `<img class="${cls}" src="${esc(sm)}" srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w" sizes="${sizes}" alt="${esc(alt || '')}" style="object-position:${pos(ref)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
};
const pad2 = (n) => String(n).padStart(2, '0');
const nptParts = (iso) => {
  const d = new Date(new Date(iso).getTime() + 345 * 60000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay() };
};
const numDate = (iso) => {
  const p = nptParts(iso);
  const en = `${pad2(p.d)}.${pad2(p.m)}.${p.y}`;
  return { en, ne: neNum(en) };
};
const WD = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ne: ['आइत', 'सोम', 'मङ्गल', 'बुध', 'बिही', 'शुक्र', 'शनि'] };
const weekday = (iso) => { const w = nptParts(iso).wd; return { en: WD.en[w], ne: WD.ne[w] }; };
const firstGrapheme = (s) => {
  const str = String(s || '').trim();
  if (!str) return '';
  if (window.Intl?.Segmenter) return [...new Intl.Segmenter('ne', { granularity: 'grapheme' }).segment(str)][0].segment;
  return str[0];
};
const lang = () => document.documentElement.dataset.lang || 'en';

// ───────────────────────── data ─────────────────────────
const c = config.couple;
const B = c.bride;
const G = c.groom;
const events = guestEvents();
const portraits = (c.portraits || []).filter((p) => p && p.photo);
const PLACE = /^(door|torana|chowk|window|courtyard|interior|diyo|lamps|marigold|kathmandu|boudha|himalaya|brass|ganesh|haldi|dhaka|mandap|fire|sindoor)/;
const isPeople = (ref) => !slugOf(ref) || !PLACE.test(slugOf(ref));
const keyOf = (ref) => slugOf(ref) || photoUrl(ref, 'sm');

// Couple photos come only from couple slots (defaults: the couple's own portraits).
const slotP = (id) => { const ref = slotImg(id); return ref ? { photo: ref, alt: slotAlt(id) } : null; };
const altFor = (ref, fallback) => portraits.find((p) => keyOf(p.photo) === keyOf(ref))?.alt || fallback;
const heroP = slotP('hero.photo');
if (heroP) heroP.alt = altFor(heroP.photo, heroP.alt);
const revealP = slotP('reveal.photo') || heroP;
if (revealP) revealP.alt = altFor(revealP.photo, revealP.alt);
const pool = [];
const seen = new Set([heroP, revealP].filter(Boolean).map((p) => keyOf(p.photo)));
const pushP = (p) => { if (!p) return; const k = keyOf(p.photo); if (!seen.has(k)) { seen.add(k); pool.push(p); } };
Object.keys(manifest.images).filter((id) => id.startsWith('us.')).forEach((id) => {
  const p = slotP(id);
  if (p) { p.alt = altFor(p.photo, p.alt); pushP(p); }
});
// Then the couple's own gallery (invitation data); ritual close-ups are accents, at most two.
const DETAIL = /^(mehendi|wedding-nepali-alt)/;
let details = 0;
(config.gallery || []).filter((g) => g.photo && isPeople(g.photo)).forEach((g) => {
  const d = DETAIL.test(slugOf(g.photo) || '');
  if (d && details >= 2) return;
  if (d) details++;
  pushP(g);
});
const collage = pool.slice(0, 10);

const initials = () => ({
  en: [firstGrapheme(B.name.en).toUpperCase(), firstGrapheme(G.name.en).toUpperCase()],
  ne: [firstGrapheme(B.name.ne || B.name.en), firstGrapheme(G.name.ne || G.name.en)],
});

// ───────────────────────── shell ─────────────────────────
const CHAPTERS = [
  { en: 'Invitation', ne: 'निम्तो' },
  { en: 'The weave', ne: 'बुनाइ' },
  { en: 'Us', ne: 'हामी' },
  { en: 'Ceremonies', ne: 'कार्यक्रम' },
  { en: 'Families', ne: 'परिवार' },
  { en: 'Reply', ne: 'जवाफ' },
];
const { player, setChapter } = mountShell({ chapters: CHAPTERS });

// Dhaka bands as CSS textures (generated, not images).
const bands = {
  dark: bandTexture({ rows: 14, cell: mobile ? 5 : 6, dark: true }),
  light: bandTexture({ rows: 14, cell: mobile ? 5 : 6, dark: false, offset: 20 }),
  border: bandTexture({ rows: 7, cell: mobile ? 5 : 6, kind: 'border' }),
};
const root = document.documentElement.style;
root.setProperty('--band-dark', `url(${bands.dark.url})`);
root.setProperty('--band-dark-w', `${bands.dark.width}px`);
root.setProperty('--band-dark-h', `${bands.dark.height}px`);
root.setProperty('--band-light', `url(${bands.light.url})`);
root.setProperty('--band-light-w', `${bands.light.width}px`);
root.setProperty('--band-border', `url(${bands.border.url})`);
root.setProperty('--band-border-w', `${bands.border.width}px`);
root.setProperty('--band-border-h', `${bands.border.height}px`);

// ───────────────────────── markup ─────────────────────────
const wDate = config.weddingDate;
const amp = '<span class="amp" aria-hidden="true">&amp;</span>';
const names = `${bi(B.name)} <span class="amp-r">&amp;</span> ${bi(G.name)}`;
const letters = (s) => [...String(s)].map((ch) => `<span class="ch"><span class="ch__in">${esc(ch)}</span></span>`).join('');
const nameLine = (n) => `<span class="l-en" aria-hidden="true">${letters(n.en)}</span><span class="l-ne" lang="ne" aria-hidden="true"><span class="ch"><span class="ch__in">${esc(n.ne || n.en)}</span></span></span>`;

// Gate
const gate = document.getElementById('gate');
gate.innerHTML = `
  <div class="dk-gate__band" aria-hidden="true"></div>
  <div class="dk-gate__inner">
    <p class="mono dk-gate__kicker">${bi(txt('gate.kicker'))}</p>
    <h1 class="dk-gate__names"><span class="sr-only">${esc(B.name.en)} &amp; ${esc(G.name.en)}</span>
      <span aria-hidden="true">${bi(B.name)}</span><span class="dk-gate__amp" aria-hidden="true">&amp;</span><span aria-hidden="true">${bi(G.name)}</span>
    </h1>
    <p class="mono dk-gate__date">${bi(numDate(wDate))} <span class="sep">/</span> ${bi(config.city)}</p>
    <div class="dk-gate__choices">
      <button class="dk-btn" type="button" data-enter="music">${bi(txt('gate.music'))}<span class="dk-btn__arrow" aria-hidden="true">→</span></button>
      <button class="dk-link" type="button" data-enter="quiet">${bi(txt('gate.quiet'))}</button>
    </div>
  </div>
  <div class="dk-gate__load" aria-hidden="true"><i></i></div>`;

const main = document.getElementById('main');
const ev = (e, i) => {
  const d = numDate(e.start);
  return `
  <article class="ev" aria-labelledby="ev-${esc(e.id)}">
    <header class="ev__head">
      <span class="ev__n mono" aria-hidden="true">${pad2(i + 1)}</span>
      <span class="ev__date mono">${bi(weekday(e.start))} ${bi(d)}</span>
    </header>
    <h3 class="ev__name" id="ev-${esc(e.id)}">${bi(e.title)}</h3>
    <figure class="ev__ph">${img(e.photo, '', '(max-width: 760px) 80vw, 34vw')}</figure>
    <dl class="ev__facts">
      <div><dt class="mono">${bi({ en: 'Time', ne: 'समय' })}</dt><dd>${bi(timeRange(e.start, e.end))}</dd></div>
      <div><dt class="mono">${bi({ en: 'Place', ne: 'स्थान' })}</dt><dd>${bi(e.venue)} <a class="ev__map mono" href="${esc(mapUrl(e.mapQuery || e.venue.en))}" target="_blank" rel="noopener">${bi({ en: 'Map', ne: 'नक्सा' })}<span aria-hidden="true"> ↗</span></a></dd></div>
    </dl>
    <div class="ev__foot">
      ${(e.dress?.colors || []).length ? `<span class="ev__dress"><span class="ev__sw" aria-hidden="true">${e.dress.colors.map((col) => `<i style="background:${esc(col)}"></i>`).join('')}</span><span class="mono">${bi(e.dress.text || { en: 'Dress', ne: 'पहिरन' })}</span></span>` : ''}
      ${e.rituals?.length ? `<details class="ev__prog"><summary class="mono">${bi({ en: 'Programme', ne: 'कार्यक्रम' })}<span aria-hidden="true">+</span></summary><ol>${e.rituals.map((r) => `<li><span class="mono">${bi(typeof r.time === 'string' ? { en: r.time, ne: neNum(r.time) } : r.time)}</span>${bi(r.title)}</li>`).join('')}</ol></details>` : ''}
    </div>
  </article>`;
};

const famPhoto = (id, p) => ((config.themeContent?.dhaka?.images?.[id] || p.photo) ? slotImg(id) : null);
const person = (p, role, side, photo) => `
  <figure class="fam__p fam__p--${side}">
    <div class="fam__frame">${photo ? img(photo, `${p.name.en}`, '(max-width: 760px) 44vw, 26vw') : `<canvas class="fam__weave" data-letter-en="${esc(firstGrapheme(p.name.en).toUpperCase())}" data-letter-ne="${esc(firstGrapheme(p.name.ne || p.name.en))}" role="img" aria-label="${esc(p.name.en)}"></canvas>`}</div>
    <figcaption>
      <span class="mono fam__role">${bi(role)}</span>
      <span class="fam__name">${bi(p.fullName || p.name)}</span>
      <span class="mono fam__home">${bi(p.home)}</span>
    </figcaption>
  </figure>`;

const shapeOf = (g, i) => g.shape || (i % 3 === 1 ? 'port' : 'land');
// Justified rows: photos in a row share one height, so nothing is cropped.
const dims = Object.fromEntries(credits.filter((k) => k.width && k.height).map((k) => [k.slot, k.width / k.height]));
const ratioOf = (g, i) => {
  const s = slugOf(g.photo);
  if (s && dims[s]) return dims[s];
  if (typeof g.photo === 'object' && g.photo?.w && g.photo?.h) return g.photo.w / g.photo.h;
  return { land: 1.5, port: 2 / 3, sq: 1 }[shapeOf(g, i)];
};
function collageRows() {
  // Greedy justified rows: close a row once its combined aspect reaches the target.
  const target = mobile ? 1.7 : 3.3;
  const rows = [];
  let cur = [];
  let sum = 0;
  collage.forEach((g, i) => {
    const r = ratioOf(g, i);
    cur.push({ g, i, r });
    sum += r;
    if (sum >= target) { rows.push({ items: cur, sum }); cur = []; sum = 0; }
  });
  if (cur.length) {
    // Fold a short tail into the previous row on desktop rather than leave it stranded.
    if (rows.length && !mobile && sum < target * 0.5) { const last = rows[rows.length - 1]; last.items.push(...cur); last.sum += sum; }
    else rows.push({ items: cur, sum });
  }
  const maxH = mobile ? 62 : 66; // svh
  return rows.map((row, r) => `
    <div class="us__row us__row--${r % 2 ? 'b' : 'a'}" style="max-width:calc(${row.sum.toFixed(3)} * ${maxH}svh + ${row.items.length - 1} * 20px)">${row.items.map(({ g, i: idx, r: ratio }) => `
      <figure class="us__item" style="flex-grow:${ratio.toFixed(4)}">
        <button type="button" class="us__btn" data-idx="${idx}" aria-label="${esc(g.alt || 'Photo')}">
          <span class="us__frame" style="aspect-ratio:${ratio.toFixed(4)}">${img(g.photo, g.alt, mobile ? '90vw' : '50vw')}</span>
        </button>
        <figcaption class="us__cap mono" aria-hidden="true"><b>${pad2(idx + 1)}</b></figcaption>
      </figure>`).join('')}</div>`).join('');
}
const storyList = config.story || [];
// The heading looks forward: the year they began, and the story's last (future-facing) line.
const story = storyList.length ? { year: storyList[0].year, text: storyList[storyList.length - 1].text } : null;

main.innerHTML = `
<section class="hero" id="top" data-ch="0" aria-labelledby="hero-title">
  <div class="hero__bar mono">
    <span>${bi(txt('hero.kicker'))}</span>
    <span>${bi(numDate(wDate))}</span>
    <span class="hero__city">${bi(config.city)}</span>
  </div>
  <h1 class="hero__title" id="hero-title">
    <span class="sr-only">${esc(B.name.en)} &amp; ${esc(G.name.en)}</span>
    <span class="hero__line hero__line--1" aria-hidden="true">${nameLine(B.name)}</span>
    <span class="hero__line hero__line--2" aria-hidden="true"><span class="hero__amp ch"><span class="ch__in">&amp;</span></span>${nameLine(G.name)}</span>
  </h1>
  <div class="hero__row">
    <figure class="hero__ph">${img(heroP?.photo, heroP?.alt, '(max-width: 760px) 92vw, 36vw', { eager: true })}</figure>
    <div class="hero__aside">
      <p class="hero__line-s">${bi(txt('hero.line'))}</p>
      <div class="hero__meta"><p class="mono hero__bs">${bi(config.weddingDateBS)}</p>
      <p class="mono hero__cue" aria-hidden="true">${bi(txt('hero.cue'))} <span>↓</span></p></div>
    </div>
  </div>
</section>

<section class="loom" id="weave" data-ch="1" aria-label="${esc(B.name.en)} and ${esc(G.name.en)}">
  <div class="loom__reveal">
    <div class="reveal__text">
      <p class="mono reveal__idx">(02) ${bi(txt('reveal.kicker'))}</p>
      <p class="reveal__big">${bi(txt('reveal.title'))}</p>
      <p class="reveal__names">${names}</p>
      <p class="mono reveal__date">${bi(dateOf(wDate))}</p>
    </div>
    <figure class="reveal__ph">${img(revealP?.photo, revealP?.alt, '(max-width: 760px) 92vw, 44vw')}</figure>
  </div>
  <canvas class="loom__canvas" aria-hidden="true"></canvas>
  <p class="loom__cap mono" aria-hidden="true"><span class="loom__count">000</span> / <span class="loom__rows">000</span> ${bi(txt('loom.count'))}</p>
  <p class="loom__hint mono" aria-hidden="true">${bi(txt('loom.hint'))}</p>
</section>

<section class="marq" aria-label="${esc(txt('marquee.1').en)}">
  <div class="marq__band" aria-hidden="true"></div>
  ${[0, 1].map((row) => `
  <div class="marq__row marq__row--${row}" aria-hidden="true"><div class="marq__track">
    ${[0, 1].map(() => `<span class="marq__set">
      ${row === 0
        ? `<span lang="ne">${esc(txt('marquee.1').ne)}</span><i></i><em>${esc(txt('marquee.1').en)}</em><i></i><span>${esc(B.name.en.toUpperCase())} ${esc('&')} ${esc(G.name.en.toUpperCase())}</span><i></i><span>${esc(numDate(wDate).en)}</span><i></i>`
        : `<em>${esc(txt('marquee.2').en)}</em><i></i><span lang="ne">${esc(txt('marquee.2').ne)}</span><i></i>${c.hashtag ? `<em>${esc(c.hashtag)}</em><i></i>` : ''}<span lang="ne">${esc(txt('marquee.3').ne)}</span><i></i><em>${esc(txt('marquee.3').en)}</em><i></i>`}
    </span>`).join('')}
  </div></div>`).join('')}
  <div class="marq__band marq__band--b" aria-hidden="true"></div>
</section>

<section class="us" id="us" data-ch="2" aria-labelledby="us-title">
  <header class="us__head">
    <p class="mono">(03)</p>
    <h2 class="us__title" id="us-title">${bi(txt('us.title'))}</h2>
    <div class="us__story">
      <p class="mono us__count">${bi(fill(txt('us.frames'), { n: { en: pad2(collage.length), ne: neNum(pad2(collage.length)) } }))}</p>
      ${story ? `<p class="us__year">${bi(fill(txt('us.since'), { year: story.year }))}</p><p class="us__line">${bi(story.text)}</p>` : ''}
    </div>
  </header>
  <div class="us__rows">${collageRows()}</div>
</section>

<section class="rib" id="ceremonies" data-ch="3" aria-labelledby="rib-title">
  <div class="rib__pin">
    <div class="rib__track">
      <div class="rib__intro">
        <p class="mono">(04)</p>
        <h2 class="rib__title" id="rib-title">${bi(txt('rib.title'))}</h2>
        <p class="mono rib__sub">${bi(fill(txt('rib.sub'), { n: { en: String(events.length), ne: neNum(events.length) } }))} <span aria-hidden="true">→</span></p>
      </div>
      ${events.map(ev).join('')}
      <div class="rib__end">
        <p class="rib__endline">${bi(txt('rib.end'))}</p>
        <a class="dk-btn dk-btn--light" href="#rsvp">${bi(txt('rib.cta'))}<span class="dk-btn__arrow" aria-hidden="true">→</span></a>
      </div>
    </div>
    <div class="rib__thread" aria-hidden="true"></div>
  </div>
</section>

<section class="fam" id="families" data-ch="4" aria-labelledby="fam-title">
  <header class="fam__head">
    <p class="mono">(05)</p>
    <h2 class="fam__title" id="fam-title">${bi(txt('fam.title'))}</h2>
  </header>
  <div class="fam__pair">
    ${person(B, txt('fam.bride'), 'b', famPhoto('fam.bride', B))}
    <span class="fam__amp" aria-hidden="true">&amp;</span>
    ${person(G, txt('fam.groom'), 'g', famPhoto('fam.groom', G))}
  </div>
  <div class="fam__cta">
    <p class="mono">${bi(config.hosts)}</p>
    <button type="button" class="dk-btn" id="open-card">${bi(txt('fam.card'))}<span class="dk-btn__arrow" aria-hidden="true">↗</span></button>
  </div>
</section>

<section class="reply" id="rsvp" data-ch="5" aria-labelledby="rsvp-title">
  <div class="reply__left">
    <p class="mono">(06)</p>
    <h2 class="reply__title" id="rsvp-title">${bi(txt('reply.title'))}</h2>
    <p class="mono reply__deadline">${bi(config.rsvp.deadline)}</p>
    <div class="count" id="countdown" role="timer" aria-label="Time until the wedding"></div>
  </div>
  <form class="rsvp dk-form" id="rsvp-form" novalidate>
    <div class="field">
      <label for="f-name">${bi({ en: 'Your name', ne: 'नाम' })}</label>
      <input id="f-name" name="name" type="text" autocomplete="name" required maxlength="80" />
      <p class="field__err" id="f-name-err" role="alert"></p>
    </div>
    <div class="field">
      <label for="f-phone">${bi({ en: 'Phone (optional)', ne: 'फोन (ऐच्छिक)' })}</label>
      <input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" />
    </div>
    <fieldset class="field field--seg">
      <legend>${bi({ en: 'Will you attend?', ne: 'उपस्थिति' })}</legend>
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
      <fieldset class="field field--chips">
        <legend>${bi({ en: 'Which ceremonies?', ne: 'कुन कार्यक्रम?' })}</legend>
        <div id="f-events" class="chips"></div>
      </fieldset>
      <fieldset class="field field--chips">
        <legend>${bi({ en: 'Meal', ne: 'खाना' })}</legend>
        <div class="chips">
          <label class="choice"><input type="radio" name="meal" value="veg" /><span>${bi({ en: 'Vegetarian', ne: 'शाकाहारी' })}</span></label>
          <label class="choice"><input type="radio" name="meal" value="nonveg" checked /><span>${bi({ en: 'Non-vegetarian', ne: 'मांसाहारी' })}</span></label>
        </div>
      </fieldset>
    </div>
    <div class="field">
      <label for="f-msg">${bi({ en: 'A line for the couple (optional)', ne: 'शुभकामना (ऐच्छिक)' })}</label>
      <textarea id="f-msg" name="message" rows="2" maxlength="500"></textarea>
    </div>
    <div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off" /></div>
    <div class="dk-form__send">
      <button class="dk-btn dk-btn--accent" type="submit" id="rsvp-submit">${bi(txt('reply.send'))}<span class="dk-btn__arrow" aria-hidden="true">→</span></button>
      <p class="rsvp__status" id="rsvp-status" role="status" aria-live="polite"></p>
    </div>
  </form>
</section>

<section class="guest" aria-labelledby="guest-title">
  <h2 class="sr-only" id="guest-title">${bi({ en: 'For our guests', ne: 'पाहुनाहरूका लागि' })}</h2>
  <div class="guest__col">
    <p class="mono guest__k">${bi({ en: 'Wear', ne: 'पहिरन' })}</p>
    <ul class="guest__dress">${events.map((e) => `<li><span class="ev__sw" aria-hidden="true">${(e.dress?.colors || []).map((col) => `<i style="background:${esc(col)}"></i>`).join('')}</span><span><b>${bi(e.title)}</b><small>${bi(e.dress?.text || { en: 'Festive', ne: 'उत्सव पहिरन' })}</small></span></li>`).join('')}</ul>
  </div>
  <div class="guest__col">
    <p class="mono guest__k">${bi({ en: 'Stay', ne: 'बसाइ' })}</p>
    <ul class="guest__list">${(config.info?.stays || []).map((s) => `<li><b>${bi(s.name)}</b><small>${bi(s.note)}</small><a class="mono" href="${esc(mapUrl(s.mapQuery))}" target="_blank" rel="noopener">${bi({ en: 'Map', ne: 'नक्सा' })} ↗</a></li>`).join('')}</ul>
    ${config.info?.travel ? `<details class="guest__more"><summary class="mono">${bi({ en: 'Getting there', ne: 'यात्रा' })} <span aria-hidden="true">+</span></summary><p>${bi(config.info.travel)}</p></details>` : ''}
  </div>
  <div class="guest__col">
    <p class="mono guest__k">${bi({ en: 'Questions', ne: 'सम्पर्क' })}</p>
    <ul class="guest__list">${(config.info?.contacts || []).map((p) => {
      const tel = String(p.phone).replace(/[^\d+]/g, '');
      return `<li><b>${bi(p.name)}</b><small>${bi(p.role)}</small><span class="guest__links"><a class="mono" href="tel:${esc(tel)}">${bi({ en: 'Call', ne: 'फोन' })}</a><a class="mono" href="https://wa.me/${esc(tel.replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span></li>`;
    }).join('')}</ul>
    ${config.info?.livestream ? `<a class="dk-link" href="${esc(config.info.livestream)}" target="_blank" rel="noopener">${bi({ en: 'Watch live', ne: 'प्रत्यक्ष हेर्नुहोस्' })} ↗</a>` : ''}
  </div>
</section>

<footer class="end">
  <div class="end__band" aria-hidden="true"></div>
  <p class="end__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
  <p class="end__en">${esc(config.closing?.en || '')}</p>
  <p class="end__names" aria-hidden="true">${bi(B.name)}<span class="amp">&amp;</span>${bi(G.name)}</p>
  <div class="end__actions">
    <button class="dk-btn dk-btn--light" type="button" id="add-calendar">${bi({ en: 'Add to calendar', ne: 'क्यालेन्डरमा थप्नुहोस्' })}</button>
    <button class="dk-link dk-link--light" type="button" id="share">${bi({ en: 'Share', ne: 'पठाउनुहोस्' })}</button>
  </div>
  <p class="mono end__tag">${esc(c.hashtag || '')}</p>
  <details class="end__credits">
    <summary class="mono">${bi({ en: 'Photo & music credits', ne: 'श्रेय' })}</summary>
    <ul id="credits-list"></ul>
  </details>
</footer>

<dialog class="card" id="card" aria-labelledby="card-title" data-lenis-prevent>
  <form method="dialog" class="card__close-f"><button class="card__close" type="submit"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button></form>
  <div class="card__band" aria-hidden="true"></div>
  <div class="card__body">
    <p class="card__shloka" lang="sa">${esc(config.invitation?.shloka?.sa || '')}</p>
    <p class="card__shloka-en l-en">${esc(config.invitation?.shloka?.en || '')}</p>
    <h2 class="card__title" id="card-title">${bi(txt('card.title'))}</h2>
    <p class="card__sal">${bi(config.invitation?.salutation || '')}</p>
    <p>${bi(config.invitation?.body || '')}</p>
    <p class="card__date">${bi(dateOf(wDate))}<br />${bi(config.weddingDateBS)}</p>
    <p>${bi(config.invitation?.request || '')}</p>
    <p class="card__sign">${bi(config.invitation?.signoff || '')}<br /><b>${bi(config.hosts)}</b></p>
    <div class="card__parents">
      <p><span class="mono">${bi({ en: 'Bride’s parents', ne: 'दुलहीका मातापिता' })}</span>${bi(B.parents)}</p>
      <p><span class="mono">${bi({ en: 'Groom’s parents', ne: 'दुलाहाका मातापिता' })}</span>${bi(G.parents)}</p>
    </div>
  </div>
</dialog>

<dialog class="lb" id="lb" aria-label="Photo" data-lenis-prevent>
  <form method="dialog"><button class="lb__close" type="submit"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button></form>
  <figure class="lb__fig"><figcaption class="mono"></figcaption></figure>
  <button type="button" class="lb__nav lb__nav--prev" data-lb="-1"><span aria-hidden="true">←</span><span class="sr-only">Previous</span></button>
  <button type="button" class="lb__nav lb__nav--next" data-lb="1"><span aria-hidden="true">→</span><span class="sr-only">Next</span></button>
</dialog>`;

// Credits for the photos actually shown, plus music.
const credList = document.getElementById('credits-list');
credList.innerHTML = credits.filter((k) => used.has(k.slot)).map((k) => `<li>${esc(k.title || k.slot)} by ${esc(k.creator || 'unknown')}, <a href="${esc(k.license_url || k.source_url)}" target="_blank" rel="noopener">${esc(k.license)}</a>, <a href="${esc(k.source_url)}" target="_blank" rel="noopener">source</a></li>`).join('')
  + (config.music?.tracks || []).map((t) => `<li>${esc(t.credit)}</li>`).join('')
  + '<li>Dhaka weave patterns are generated in code for this design.</li>';

// ───────────────────────── behaviours ─────────────────────────
initRsvp(events);
startCountdown(document.getElementById('countdown'));
document.getElementById('add-calendar').addEventListener('click', () => downloadIcs(events));
document.getElementById('share').addEventListener('click', (e) => share(e.currentTarget));
const card = document.getElementById('card');
// Dialogs: native <dialog> for the top layer, core openModal for scroll lock and focus.
const showDialog = (dlg) => {
  dlg.showModal();
  const release = openModal(dlg, { scroller: dlg, onClose: () => { if (dlg.open) dlg.close(); } });
  dlg.addEventListener('close', release, { once: true });
};
document.getElementById('open-card').addEventListener('click', () => showDialog(card));
card.addEventListener('click', (e) => { if (e.target === card) card.close(); });
initLightbox();

function startCountdown(el) {
  const target = new Date(wDate).getTime();
  const units = [['d', 86400000, { en: 'Days', ne: 'दिन' }], ['h', 3600000, { en: 'Hours', ne: 'घण्टा' }], ['m', 60000, { en: 'Min', ne: 'मिनेट' }], ['s', 1000, { en: 'Sec', ne: 'सेकेन्ड' }]];
  el.innerHTML = units.map(([k, , l]) => `<div class="count__u"><span class="count__n" data-u="${k}"></span><span class="count__l mono">${bi(l)}</span></div>`).join('');
  const cells = Object.fromEntries(units.map(([k]) => [k, el.querySelector(`[data-u="${k}"]`)]));
  const tick = () => {
    let left = target - Date.now();
    if (left <= 0) { el.innerHTML = `<p class="count__done">${bi({ en: 'Today is the day.', ne: 'आज शुभ दिन।' })}</p>`; return; }
    for (const [k, ms] of units) {
      const n = Math.floor(left / ms);
      left -= n * ms;
      const s = String(n).padStart(2, '0');
      cells[k].replaceChildren(...biNodes(s, neNum(s)));
    }
    setTimeout(tick, 1000 - (Date.now() % 1000));
  };
  tick();
}

function initLightbox() {
  const lb = document.getElementById('lb');
  const im = document.createElement('img');
  im.decoding = 'async';
  lb.querySelector('figcaption').before(im);
  const cap = lb.querySelector('figcaption');
  let i = 0;
  const show = (k) => {
    i = (k + collage.length) % collage.length;
    const g = collage[i];
    im.src = photoUrl(g.photo, 'lg');
    im.alt = g.alt || '';
    cap.textContent = `${pad2(i + 1)} / ${pad2(collage.length)}`;
  };
  document.querySelector('.us__rows').addEventListener('click', (e) => {
    const b = e.target.closest('.us__btn');
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
}

// Woven monograms for a bride/groom without a portrait.
const weaveMonos = () => document.querySelectorAll('.fam__weave').forEach((cv) => {
  const ne = lang() === 'ne';
  wovenMonogram(cv, ne ? cv.dataset.letterNe : cv.dataset.letterEn, { cell: mobile ? 5 : 7, deva: ne, fill: ne ? 0.68 : 0.8 });
});

// Hero names are fitted to the grid width (kinetic type needs exact measure).
function fitNames() {
  // Fit to the real rendered box: width of the widest line, and the title's total
  // height (Devanagari matras make lines much taller than Latin caps).
  const box = document.querySelector('.hero__title');
  const hero = document.querySelector('.hero');
  if (box && hero) {
    const width = box.clientWidth * 0.985;
    const lines = [...box.querySelectorAll('.hero__line')];
    lines.forEach((line) => {
      line.style.setProperty('--fs', '100px');
      const w = Math.max(line.scrollWidth, line.getBoundingClientRect().width);
      line.style.setProperty('--fs', `${Math.min(100 * (width / w), mobile ? 150 : 330).toFixed(1)}px`);
    });
    const budget = hero.clientHeight * (mobile ? 0.3 : 0.5);
    for (let k = 0; k < 3; k++) {
      const h = box.getBoundingClientRect().height;
      if (h <= budget) break;
      const f = budget / h;
      lines.forEach((line) => line.style.setProperty('--fs', `${(parseFloat(line.style.getPropertyValue('--fs')) * f).toFixed(1)}px`));
    }
  }
  // The gate names too.
  const gn = document.querySelector('.dk-gate__names');
  if (gn) {
    gn.style.setProperty('--fs', '100px');
    const cs = getComputedStyle(gn.parentElement);
    const gw = (gn.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * 0.985;
    let fs = Math.min(100 * (gw / gn.scrollWidth), mobile ? 96 : 168);
    gn.style.setProperty('--fs', `${fs.toFixed(1)}px`);
    const gb = window.innerHeight * (mobile ? 0.36 : 0.4);
    const gh = gn.getBoundingClientRect().height;
    if (gh > gb) { fs *= gb / gh; gn.style.setProperty('--fs', `${fs.toFixed(1)}px`); }
  }
}

// ───────────────────────── the loom ─────────────────────────
const loomCanvas = document.querySelector('.loom__canvas');
const loomParts = () => {
  const ini = initials();
  const ne = lang() === 'ne';
  const L = ne ? ini.ne : ini.en;
  const f = ne ? '800 100px "Noto Sans Devanagari", sans-serif' : '900 100px "Archivo", sans-serif';
  const st = 'normal';
  const amp = { text: '&', font: '900 100px "Archivo", sans-serif', stretch: 'normal' };
  return {
    parts: [{ text: L[0], font: f, stretch: st }, amp, { text: L[1], font: f, stretch: st }],
    stack: [{ text: L[0], font: f, stretch: st }, { text: L[1], font: f, stretch: st }],
  };
};
let loom = null;
const capCount = document.querySelector('.loom__count');
const capRows = document.querySelector('.loom__rows');
const capEl = document.querySelector('.loom__cap');
const hintEl = document.querySelector('.loom__hint');
const revealEl = document.querySelector('.loom__reveal');
const setLoom = (p) => {
  if (!loom) return;
  loom.set(p);
  const woven = Math.min(loom.rows, Math.floor(Math.min(1, p / loom.weaveEnd) * (loom.rows + 1.5)));
  capCount.textContent = String(woven).padStart(3, '0');
  capRows.textContent = String(loom.rows).padStart(3, '0');
  const fadeOut = Math.max(0, Math.min(1, (p - loom.holdEnd) / 0.06));
  capEl.style.opacity = String(1 - fadeOut);
  hintEl.style.opacity = String(Math.max(0, Math.min(1, (0.32 - p) / 0.08)));
  // The reveal underneath rises a touch as the threads leave.
  const u = Math.max(0, Math.min(1, (p - loom.holdEnd) / (1 - loom.holdEnd)));
  revealEl.style.transform = `translate3d(0, ${((1 - u) * 24).toFixed(1)}px, 0)`;
};

// ───────────────────────── entry ─────────────────────────
let lenis = null;
const loader = gate.querySelector('.dk-gate__load i');
const heroImg = document.querySelector('.hero__ph img');
const ready = Promise.all([
  document.fonts.ready,
  heroImg ? (heroImg.decode?.().catch(() => {}) ?? Promise.resolve()) : Promise.resolve(),
]);
ready.then(() => { loader.style.transform = 'scaleX(1)'; });
await document.fonts.ready;
fitNames();
window.addEventListener('resize', () => { fitNames(); });

function introGate() {
  if (reduced) return;
  const tl = gsap.timeline();
  tl.from('.dk-gate__band', { scaleX: mobile ? 1 : 0, scaleY: mobile ? 0 : 1, transformOrigin: mobile ? '50% 0' : '0 50%', duration: 0.9, ease: 'expo.out' })
    .from('.dk-gate__names > span', { yPercent: 40, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'expo.out' }, 0.15)
    .from('.dk-gate__kicker, .dk-gate__date, .dk-gate__choices', { opacity: 0, y: 12, duration: 0.5, stagger: 0.06, ease: 'power3.out' }, 0.4);
}
introGate();

let entered = false;
async function enter(withMusic) {
  if (entered) return;
  entered = true;
  if (withMusic) { player.unlock(); }
  player.start(withMusic);
  document.body.classList.remove('is-gated');
  window.scrollTo(0, 0);
  setupScroll();
  if (reduced) { gate.remove(); return; }
  const tl = gsap.timeline({ onComplete: () => gate.remove() });
  tl.to(gate, { yPercent: -100, duration: 0.85, ease: 'expo.inOut' })
    .from('.hero__line .ch__in', { yPercent: 110, duration: 0.9, stagger: 0.035, ease: 'expo.out' }, 0.45)
    .from('.hero__bar > *, .hero__aside > *', { opacity: 0, y: 10, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, 0.7)
    .from('.hero__ph', { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.out' }, 0.6);
}
gate.addEventListener('click', (e) => {
  const b = e.target.closest('[data-enter]');
  if (b) enter(b.dataset.enter === 'music');
});

function setupScroll() {
  fitNames();
  weaveMonos();
  loom = new Loom(loomCanvas, { parts: loomParts().parts, stackParts: loomParts().stack });
  document.addEventListener('langchange', () => {
    fitNames();
    weaveMonos();
    const lp = loomParts();
    loom.setParts(lp.parts, lp.stack);
    setLoom(loom.progress);
    ScrollTrigger.refresh();
  });
  let lw = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lw) return;
    lw = window.innerWidth;
    loom.resize();
    weaveMonos();
  });

  // Chapters
  document.querySelectorAll('[data-ch]').forEach((sec) => {
    ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 45%', onToggle: (s) => s.isActive && setChapter(Number(sec.dataset.ch)) });
  });
  setChapter(0);
  ['.marq', '.rib', '.end'].forEach((sel) => ScrollTrigger.create({ trigger: sel, start: 'top 50%', end: 'bottom 50%', toggleClass: { targets: document.body, className: 'on-dark' } }));
  document.querySelectorAll('.chapters button').forEach((b) => b.addEventListener('click', () => {
    const t = document.querySelector(`[data-ch="${b.dataset.chapter}"]`);
    if (lenis) lenis.scrollTo(t, { offset: 0 });
    else t.scrollIntoView();
  }));

  if (reduced) {
    document.body.classList.add('is-reduced');
    const rp = document.querySelector('.rib__pin');
    rp.tabIndex = 0;
    rp.setAttribute('aria-label', 'Ceremonies, scroll sideways');
    setLoom(1);
    loom.set(loom.weaveEnd + 0.01);
    return;
  }

  lenis = createSmooth();
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t && lenis) { e.preventDefault(); lenis.scrollTo(t); }
  }));

  // Hero: the two name lines slide apart as you leave.
  gsap.to('.hero__line--1', { xPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__line--2', { xPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // The loom: pinned, woven by scroll, then unravelled.
  setLoom(0);
  ScrollTrigger.create({
    trigger: '.loom', start: 'top top', end: () => `+=${window.innerHeight * (mobile ? 3.2 : 3.6)}`,
    pin: true, scrub: true, anticipatePin: 1,
    onUpdate: (s) => setLoom(s.progress),
  });

  // Marquee: scroll pushes the rows in opposite directions on top of their drift.
  gsap.fromTo('.marq__row--0', { xPercent: 0 }, { xPercent: -12, ease: 'none', scrollTrigger: { trigger: '.marq', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.marq__row--1', { xPercent: -12 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.marq', start: 'top bottom', end: 'bottom top', scrub: true } });

  // Collage: rows drift sideways in alternate directions, like picks of weft (desktop only).
  if (!mobile) {
    gsap.utils.toArray('.us__row').forEach((row, k) => {
      const d = k % 2 ? 1 : -1;
      gsap.fromTo(row, { xPercent: 2.5 * d }, { xPercent: -2.5 * d, ease: 'none', scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }
  gsap.utils.toArray('.us__frame').forEach((f) => {
    gsap.from(f, { clipPath: 'inset(12% 0 12% 0)', duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 88%' } });
  });
  gsap.from('.us__title .l-en, .us__title .l-ne', { yPercent: 100, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.us__head', start: 'top 80%' } });

  // Ceremonies: a horizontal ribbon driven by vertical scroll.
  const track = document.querySelector('.rib__track');
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '.rib', start: 'top top', end: () => `+=${dist()}`, pin: '.rib__pin', scrub: 0.4, invalidateOnRefresh: true, anticipatePin: 1,
      // Phones: one full ceremony on screen whenever scrolling stops.
      snap: mobile ? {
        snapTo: (v) => { const n = Math.max(1, track.children.length - 1); return Math.round(v * n) / n; },
        inertia: false, directional: false, duration: { min: 0.2, max: 0.5 }, delay: 0.1, ease: 'power2.out',
      } : false,
    },
  });
  gsap.to('.rib__thread', {
    backgroundPositionX: () => `-${dist() * 0.5}px`, ease: 'none',
    scrollTrigger: { trigger: '.rib', start: 'top top', end: () => `+=${dist()}`, scrub: 0.4, invalidateOnRefresh: true },
  });

  // Families and reply headings rise in.
  ['.fam__title', '.reply__title'].forEach((sel) => {
    gsap.from(`${sel} .l-en, ${sel} .l-ne`, { yPercent: 60, opacity: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: sel, start: 'top 85%' } });
  });
  gsap.from('.fam__p', { y: 40, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.fam__pair', start: 'top 80%' } });

  requestAnimationFrame(() => ScrollTrigger.refresh());
  // Late fonts or images can change the page height; keep pins and scrubs in step.
  let lastH = document.body.scrollHeight;
  let rt;
  new ResizeObserver(() => {
    const h = document.body.scrollHeight;
    if (Math.abs(h - lastH) < 4) return;
    lastH = h;
    clearTimeout(rt);
    rt = setTimeout(() => ScrollTrigger.refresh(), 200);
  }).observe(document.getElementById('main'));
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

// ───────────────────────── debug ─────────────────────────
if (DEBUG) {
  window.__dkAll = () => ScrollTrigger.getAll();
  window.__dk = {
    enter: () => enter(false),
    loom: (p) => setLoom(p),
    scrollTo: (y) => { if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); ScrollTrigger.update(); },
    top: (sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().top + window.scrollY : 0; },
    st: () => ScrollTrigger.getAll().map((s) => ({ trigger: s.trigger?.className, start: s.start, end: s.end })),
  };
}
