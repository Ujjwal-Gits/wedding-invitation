// Sawari (सवारी): the ride.
// Opening: the white horse stands dressed at the gate of the bride's home in the golden afternoon. Tap: the painting
// slips away and the procession walks in from the left (the bride riding, the groom ahead with the rope).
// Signature (the one moment): the journey. The page pins and every scroll carries the procession along one long
// painted road through Nepal, while the bride and groom stay in the middle of the screen: the sky and the Himalaya
// drift slowly (far), the places on the road pass at walking pace (middle), fresh flowers brush past in front (near).
// Seven places, seven stops: the family home, the mustard terraces, the suspension bridge, the chautari, the temple at
// sunset, the toran at dusk, the lamp-lit mandap. The horse only bobs while the road moves (its step is tied to the
// distance walked, not to a clock), and the light turns from golden afternoon to sunset to dusk as they go.
// After the mandap: the seven steps by lamplight, the arrival painting, the reply, the blessing.
// Without motion: every stop is a still painted postcard with its words, one under the other.
import './sawari.css';
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import { lamp, initNepali } from '../_suite/nepali.js';
import { goldFoil } from '../_suite/scratch.js';

const ART = '/themes/sawari/art/';
const PREVIEW = new URLSearchParams(location.search).get('preview') === '1';
const PANEL_AR = 1776 / 896;
const COUPLE_AR = 1100 / 737;
// the road, left to right: each painting, where its trail runs (fraction of its height, under the hooves), and the
// time of day at its middle (0 golden afternoon, 1 sunset, 2 dusk)
const PANELS = [
  { n: 'home', ground: 0.905, tod: 0, alt: 'A red-brick village home dressed with marigolds, the elders at the door' },
  { n: 'terraces', ground: 0.915, tod: 0.05, alt: 'Rice terraces and a mustard field in bloom' },
  { n: 'bridge', ground: 0.9, tod: 0.18, alt: 'A suspension bridge hung with prayer flags over a turquoise river' },
  { n: 'chautari', ground: 0.93, tod: 0.4, alt: 'A stone chautari round an old pipal tree' },
  { n: 'temple', ground: 0.95, tod: 1, alt: 'A three-tiered pagoda temple at sunset' },
  { n: 'toran', ground: 0.925, tod: 1.75, alt: 'A welcome gate hung with a marigold toran, lamps along the path, Panche Baja players' },
  { n: 'mandap', ground: 0.925, tod: 2, alt: 'The lamp-lit mandap hung with marigolds and roses' },
];
const OVERLAP = 0.16; // how much of a painting melts into the next
const FG = 1.32;      // the flowers in front travel faster than the road

const srcset = (name, w = [1100, 1776]) => `${ART}${name}-sm.webp ${w[0]}w, ${ART}${name}.webp ${w[1]}w`;
const pic = (name, { cls = '', sizes = '100vw', alt = '', lazy = true, w } = {}) => `<img class="${cls}" src="${ART}${name}-sm.webp" srcset="${srcset(name, w)}" sizes="${sizes}" alt="${alt}" decoding="async"${lazy ? ' loading="lazy"' : ''} />`;
const reducedNow = () => document.body.classList.contains('sw-still');
const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ───────── the opening: the horse waits at the gate ─────────
function gate(ctx) {
  const { bi, c, txt, AD, BS } = ctx;
  return `<div class="sw-g">
    <picture class="sw-g__art" id="sw-gart">
      <source media="(min-aspect-ratio: 1/1)" srcset="${srcset('gate-land', [1000, 1680])}" sizes="100vw" />
      <img src="${ART}gate-port-sm.webp" srcset="${srcset('gate-port', [560, 944])}" sizes="100vw" alt="" decoding="async" fetchpriority="high" />
    </picture>
    <div class="sw-g__veil"></div>
    <div class="sw-g__words" id="sw-gwords">
      <p class="sw-k">${bi(txt('hero.title'))}</p>
      <p class="sw-g__names"><span class="sw-g__n">${bi(c.bride.name)}</span><span class="sw-g__amp" aria-hidden="true">&amp;</span><span class="sw-g__n">${bi(c.groom.name)}</span></p>
      <p class="sw-g__date">${bi({ en: `${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.full.short?.ne || BS.full.ne })}</p>
    </div>
  </div>`;
}

// ───────── the stops along the road ─────────
function page(ctx) {
  const { bi, esc, txt, on, parts: P, c, config, AD, BS, placeLine } = ctx;
  const sign = (id) => `<p class="sw-sign"><i aria-hidden="true"></i>${bi(txt(id))}</p>`;
  // (the id goes on the words, which move, so the studio's "show me" lands on the stop)
  // a stop: its words (in the sky) and, for some, a thing that stands on the roadside ground (a prop: it moves with the
  // road, not with the words; it stands behind the procession on phones and beside it on wide screens)
  const stop = (key, anchor, side, inner, { id = '', extra = '', at = anchor, prop = '' } = {}) => `<article class="sw-stop sw-stop--${key}" data-side="${side}"${anchor ? ` data-anchor="${anchor}"` : ''}${extra}>
      ${still(at)}
      <div class="sw-card"${id ? ` id="${id}"` : ''}>${inner}</div>
      ${prop}
    </article>`;
  // the still postcard of a stop, shown only without motion
  const still = (anchor) => {
    if (!anchor) return '';
    const [n, f] = anchor.split(':');
    const p = PANELS.find((x) => x.n === n);
    const dusk = p.tod >= 1.5;
    return `<figure class="sw-pc sw-pc--${p.tod >= 1.5 ? 'dusk' : p.tod >= 0.8 ? 'sunset' : 'day'}" aria-hidden="true" style="--f:${Number(f).toFixed(3)};--g:${p.ground}">
      ${pic(n, { cls: 'sw-pc__pan', sizes: '(min-width: 900px) 1100px, 200vw' })}
      ${pic(dusk ? 'couple-dusk' : 'couple', { cls: 'sw-pc__ride', sizes: '(min-width: 900px) 360px, 70vw', w: [640, 1100] })}
    </figure>`;
  };
  const stops = [];
  const dateLong = { en: `${AD.wd.en}, ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.full.ne };
  const bsLine = (b) => (b.full.short?.en ? (/B\.S\./.test(b.full.short.en) ? b.full.short.en : `${b.full.short.en} B.S.`) : b.full.en);

  // 1 · the family home: the names
  stops.push(stop('hero', 'home:0.3', 'r', `
    <div class="sw-hero">
      ${ctx.ganeshRef ? `<span class="sw-hero__gan su-in">${ctx.ganesh('', '64px')}</span>` : ''}
      ${on(txt('hero.invocation')) ? `<p class="sw-hero__inv su-in">${bi(txt('hero.invocation'))}</p>` : ''}
      <p class="sw-k su-in">${bi(txt('hero.title'))}</p>
      <h1 class="sw-names su-in"><span class="sw-names__n">${bi(c.bride.name)}</span><span class="sw-names__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span><span class="sw-names__n">${bi(c.groom.name)}</span></h1>
      <p class="sw-hero__date su-in">${bi(dateLong)}<span class="sw-hero__bs">${bi({ en: bsLine(BS), ne: AD.full.ne })}</span></p>
      ${placeLine?.en || placeLine?.ne ? `<p class="sw-hero__place su-in">${bi(placeLine)}</p>` : ''}
    </div>`, { id: 'hero-card' }));

  // 2 · the elders' blessing at the door: the invitation and the full card
  stops.push(stop('bless', 'home:0.6', 'l', `
    <div class="sw-slip sw-slip--bless" id="card">
      ${sign('stop.home')}
      ${on(txt('hero.line')) ? `<p class="sw-h">${bi(txt('hero.line'))}</p>` : ''}
      <p class="sw-lede">${bi(txt('card.line'))}</p>
      ${(config.hosts?.en || config.hosts?.ne) ? `<p class="sw-hosts">${bi(config.hosts)}</p>` : ''}
      ${P.cardBtn('su-btn--line')}
    </div>`));

  // 3 · the terraces: the couple, framed and garlanded by the road
  if (P.lead) {
    stops.push(stop('couple', 'terraces:0.36', 'l', `
      <div class="sw-slip sw-slip--couple">${sign('stop.fields')}<h2 class="sw-h">${bi(txt('couple.title'))}</h2>${on(txt('couple.line')) ? `<p class="sw-lede">${bi(txt('couple.line'))}</p>` : ''}</div>`, {
      id: 'couple',
      // the carved frame on its easel, standing in the field by the road
      prop: `<figure class="sw-prop sw-frame" data-prop="frame">
        <div class="sw-frame__pic">${ctx.imgTag(P.lead.photo, P.lead.alt, '(min-width: 900px) 190px, 40vw', { cls: 'sw-frame__img' })}</div>
        ${pic('frame', { cls: 'sw-frame__wood', sizes: '(min-width: 900px) 300px, 56vw', w: [440, 760] })}
      </figure>`,
    }));
  }

  // 4 · our story: milestones already passed
  const story = (config.story || []).filter((s) => s?.text?.en || s?.text?.ne);
  if (story.length && on(txt('story.title'))) {
    const told = story.slice(0, 4);
    const yr = (s) => s.year?.en || s.year?.ne;
    stops.push(stop('story', 'terraces:0.6', 'r', `
      <div class="sw-slip sw-slip--story" id="story">
        <h2 class="sw-h">${bi(txt('story.title'))}</h2>
        <ol class="sw-story">${told.map((s) => `<li class="sw-story__i">${yr(s) ? `<span class="sw-story__y">${bi(s.year)}</span>` : ''}<p class="sw-story__t">${bi(s.text)}</p></li>`).join('')}</ol>
      </div>`, {
      // the years, carved on milestones already passed (the words above say the same, so these are pictures)
      prop: told.some(yr) ? `<div class="sw-prop sw-marks" data-prop="marks" aria-hidden="true">${told.filter(yr).map((s, i) => `<span class="sw-mark" style="--t:${[-1.6, 1.2, -0.6, 1.8][i]}deg">${pic('milestone', { cls: 'sw-mark__img', sizes: '96px', w: [380, 640] })}<b class="sw-mark__y">${bi(s.year)}</b></span>`).join('')}</div>` : '',
    }));
  }

  // 5 · the bridge: the two families, one on each bank, on their milestones
  const fam = (f) => `<div class="sw-prop sw-stone sw-stone--${f.key}" data-prop="stone">
      ${pic('milestone', { cls: 'sw-stone__img', sizes: '(min-width: 900px) 280px, 66vw', w: [380, 640] })}
      <div class="sw-stone__cap">${bi(f.label)}</div>
      <div class="sw-stone__face">
        ${P.brideGroom ? `<figure class="sw-stone__pic">${ctx.imgTag(f.photo, f.person.name.en, '84px')}</figure>` : ''}
        <p class="sw-stone__name">${bi(f.person.fullName)}</p>
        ${(f.person.parents?.en || f.person.parents?.ne) ? `<p class="sw-stone__of">${bi(f.of)}</p><p class="sw-stone__par">${bi(f.person.parents)}</p>` : ''}
        ${(f.person.home?.en || f.person.home?.ne) ? `<p class="sw-stone__home">${bi(f.person.home)}</p>` : ''}
      </div>
    </div>`;
  const groom = P.families.find((f) => f.key === 'groom'); const bride = P.families.find((f) => f.key === 'bride');
  // his family's stone on this bank of the river, hers across the bridge
  stops.push(stop('fam', 'bridge:0.14', 'l', `<div class="sw-slip sw-slip--fam">${sign('stop.bridge')}<h2 class="sw-h" id="fam-title">${bi(txt('families.title'))}</h2></div>`, { id: 'families', prop: fam(groom) }));
  stops.push(stop('fam2', 'bridge:0.9', 'r', '', { prop: fam(bride) }));

  // 6 · the chautari: a few photographs, propped up while they rest
  if (P.photos.length) {
    const show = P.photos.slice(0, 3);
    stops.push(stop('photos', 'chautari:0.42', 'r', `
      <div class="sw-slip sw-slip--photos">${sign('stop.chautari')}<h2 class="sw-h">${bi(txt('gallery.title'))}</h2></div>
      <ul class="sw-prints sw-prints--${show.length}">${show.map((g, i) => `<li class="sw-print" style="--r:${[-2.4, 1.8, -1.2][i]}deg">${P.photoBtn(g, i, '(min-width: 900px) 200px, 44vw', 'sw-print__btn')}</li>`).join('')}</ul>
      ${P.photos.length > 3 ? `<button class="su-btn su-btn--line sw-more" type="button" data-lb-idx="3">${bi({ en: `All ${P.photos.length} photographs`, ne: `सबै ${ctx.neNum(String(P.photos.length))} तस्बिर` })}</button>` : ''}`, { id: 'photos' }));
  }

  // 7 · the temple and the toran: one painted signboard per celebration
  const n = P.events.length;
  const A = ['temple', 0.18]; const B = n > 3 ? ['toran', 0.2] : ['temple', 0.86];
  P.events.forEach((ev, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    // spread the boards from the temple to the gate (anchors in road units: panel index + fraction)
    const ia = PANELS.findIndex((p) => p.n === A[0]) + A[1]; const ib = PANELS.findIndex((p) => p.n === B[0]) + B[1];
    const u = ia + (ib - ia) * t; const pi = Math.min(PANELS.length - 1, Math.floor(u));
    const anchor = `${PANELS[pi].n}:${(u - pi).toFixed(3)}`;
    const hasDress = !!(ev.dress.text?.en || ev.dress.text?.ne || ev.dress.colors.length);
    stops.push(stop('ev', anchor, i % 2 ? 'r' : 'l', `
      <div class="sw-board" id="ev-${esc(ev.id)}">
        ${i === 0 ? `<p class="sw-k sw-board__k">${bi(txt('prog.kicker'))} · ${bi(txt('prog.title'))}</p>` : ''}
        <p class="sw-board__no">${bi({ en: `${i + 1} of ${n}`, ne: `${ctx.neNum(String(i + 1))} / ${ctx.neNum(String(n))}` })}</p>
        <h3 class="sw-board__title">${bi(ev.title)}</h3>
        <p class="sw-board__date">${bi({ en: ev.ad.full.en, ne: ev.bs.full.ne })}</p>
        <p class="sw-board__alt">${bi({ en: bsLine(ev.bs), ne: ev.ad.full.ne })}</p>
        <dl class="sw-board__dl">
          <div><dt>${bi(P.UI.time)}</dt><dd>${bi(ev.time)}</dd></div>
          <div><dt>${bi(P.UI.venue)}</dt><dd>${bi(ev.venue)} <a class="su-link" href="${esc(ev.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></dd></div>
          ${hasDress ? `<div><dt>${bi(P.UI.wear)}</dt><dd class="sw-board__dress">${ev.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : P.UI.wear)}</span></dd></div>` : ''}
        </dl>
        ${ev.rituals.length ? `<details class="sw-board__order"><summary>${bi(P.UI.order)}</summary><ol>${ev.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}
      </div>`, { id: i === 0 ? 'programme' : '' }));
  });

  // 8 · under the toran: the milestone that counts the days to the mandap
  stops.push(stop('count', 'toran:0.6', 'r', `
    <div class="sw-slip sw-slip--count">${sign('stop.toran')}</div>
    <div class="sw-btns">${P.calendarBtn()}${P.shareBtn()}</div>`, { id: 'countdown', prop: `
    <div class="sw-prop sw-mile" data-prop="mile" data-countdown>
      ${pic('milestone', { cls: 'sw-mile__img', sizes: '(min-width: 900px) 280px, 62vw', w: [380, 640] })}
      <p class="sw-mile__cap">${bi({ en: 'Mandap', ne: 'मण्डप' })}</p>
      <div class="sw-mile__face">
        <p class="sw-mile__days">${P.countNum('d', 'sw-mile__n')}<span class="sw-mile__unit">${bi(P.UI.days)}</span></p>
        <p class="sw-mile__to">${bi(txt('count.title'))}</p>
        <ol class="sw-mile__hms" aria-label="${esc(txt('count.title').en)}">${[['h', { en: 'hrs', ne: 'घण्टा' }], ['m', { en: 'min', ne: 'मिनेट' }], ['s', { en: 'sec', ne: 'सेकेन्ड' }]].map(([u, l]) => `<li>${P.countNum(u, 'sw-mile__s')}<span>${bi(l)}</span></li>`).join('')}</ol>
        <p class="sw-mile__done" data-count-done hidden></p>
      </div>
    </div>` }));

  // 9 · the mandap: scratch for the day
  const face = `<div class="sw-day">
      <p class="sw-day__wd">${bi(AD.wd)}</p>
      <p class="sw-day__n">${bi({ en: AD.day, ne: BS.day || ctx.neNum(AD.day) })}</p>
      <p class="sw-day__my">${bi({ en: `${AD.month.en} ${AD.year}`, ne: `${BS.month || ''} ${BS.year || ''}`.trim() || AD.full.ne })}</p>
      <p class="sw-day__alt">${bi({ en: bsLine(BS), ne: AD.full.ne })}</p>
      ${ctx.mainEv ? `<p class="sw-day__t">${bi(ctx.timeLabel(ctx.mainEv))}</p>` : ''}
    </div>`;
  stops.push(stop('mandap', 'mandap:0.5', 'l', `
    <div class="sw-slip sw-slip--mandap">${sign('stop.mandap')}<h2 class="sw-h">${bi(txt('scratch.title'))}</h2></div>
    <div class="sw-scratch">${P.scratch(face, 'sw-scratch__card')}</div>`, { id: 'date' }));

  const vows = (config.saptapadi || []).filter((v) => v?.en || v?.ne).slice(0, 7);
  const finRef = ctx.S.img('finale.photo');
  const fin = finRef ? { photo: finRef, alt: ctx.S.alt('finale.photo') || `${c.bride.name.en} and ${c.groom.name.en}` } : (P.photos[3] || P.lead);
  return `
  <section class="sw-journey" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    <div class="sw-stage" id="sw-stage">
      <div class="sw-sky" id="sw-sky" aria-hidden="true">
        <img class="sw-sky__i sw-sky--day" src="${ART}sky-day-sm.webp" srcset="${srcset('sky-day', [1000, 1776])}" sizes="(min-width: 900px) 140vw, 210svh" alt="" decoding="async" />
        <img class="sw-sky__i sw-sky--sunset" src="${ART}sky-sunset-sm.webp" srcset="${srcset('sky-sunset', [1000, 1776])}" sizes="(min-width: 900px) 140vw, 210svh" alt="" decoding="async" loading="lazy" />
        <img class="sw-sky__i sw-sky--dusk" src="${ART}sky-dusk-sm.webp" srcset="${srcset('sky-dusk', [1000, 1776])}" sizes="(min-width: 900px) 140vw, 210svh" alt="" decoding="async" loading="lazy" />
        <i class="sw-sky__haze"></i>
      </div>
      <div class="sw-world" id="sw-world" role="img" aria-label="${esc(PANELS.map((p) => p.alt).join('; '))}">
        ${PANELS.map((p, i) => `<img class="sw-pan sw-pan--${p.n}" data-i="${i}" ${i < 2 ? `src="${ART}${p.n}-sm.webp" srcset="${srcset(p.n)}"` : `data-src="${ART}${p.n}-sm.webp" data-srcset="${srcset(p.n)}"`} sizes="(min-width: 900px) 100vw, 120svh" alt="" decoding="async" />`).join('')}
      </div>
      <div class="sw-ride" id="sw-ride" aria-hidden="true">
        <i class="sw-ride__shadow"></i>
        <div class="sw-ride__bob" id="sw-bob">
          <img class="sw-ride__day" src="${ART}couple-sm.webp" srcset="${srcset('couple', [640, 1100])}" sizes="(min-width: 900px) 34vw, 90vw" alt="" decoding="async" fetchpriority="high" />
          <img class="sw-ride__dusk" src="${ART}couple-dusk-sm.webp" srcset="${srcset('couple-dusk', [640, 1100])}" sizes="(min-width: 900px) 34vw, 90vw" alt="" decoding="async" />
        </div>
      </div>
      <div class="sw-fg" id="sw-fg" aria-hidden="true"></div>
      <div class="sw-flow" id="sw-flow">${stops.join('')}</div>
      <div class="sw-route" aria-hidden="true"><i class="sw-route__line"></i>${PANELS.map((p, i) => `<i class="sw-route__pip" style="left:${((i / (PANELS.length - 1)) * 100).toFixed(2)}%"></i>`).join('')}<i class="sw-route__me" id="sw-me"></i></div>
      <a class="su-cue sw-cue" id="cue" href="#couple"><span>${bi({ en: 'Scroll to ride', ne: 'तल सार्नुहोस्' })}</span><i aria-hidden="true"></i></a>
    </div>
  </section>

  ${vows.length ? `
  <section class="sw-vows" id="vows" aria-labelledby="vows-title">
    <div class="sw-vows__sky" aria-hidden="true">${pic('sky-dusk', { sizes: '100vw', w: [1000, 1776] })}</div>
    <header class="sw-vows__head">
      <h2 class="sw-h sw-h--night" id="vows-title">${bi(txt('vows.title'))}</h2>
      ${on(txt('vows.line')) ? `<p class="sw-lede sw-lede--night">${bi(txt('vows.line'))}</p>` : ''}
    </header>
    <ol class="sw-steps">${vows.map((v, i) => `<li class="sw-step" style="--i:${i}"><span class="sw-step__lamp">${lamp('diyo', { cls: 'sw-step__diyo', sizes: '64px' })}</span><span class="sw-step__no">${bi({ en: String(i + 1), ne: ctx.neNum(String(i + 1)) })}</span><p class="sw-step__t">${bi(v)}</p></li>`).join('')}</ol>
  </section>` : ''}

  <section class="sw-arrive" id="arrive" aria-labelledby="arrive-title">
    <picture class="sw-arrive__art">
      <source media="(min-aspect-ratio: 1/1)" srcset="${srcset('finale-land', [1000, 1680])}" sizes="100vw" />
      <img src="${ART}finale-port-sm.webp" srcset="${srcset('finale-port', [560, 944])}" sizes="100vw" alt="${esc('The bride and groom hand in hand before the lamp-lit mandap at dusk, the white horse resting behind them')}" loading="lazy" decoding="async" />
    </picture>
    <div class="sw-arrive__words">
      <h2 class="sw-h sw-h--night" id="arrive-title">${bi(txt('arrive.title'))}</h2>
      <p class="sw-arrive__names">${bi(c.bride.name)} <span aria-hidden="true">&amp;</span><span class="sr-only">and</span> ${bi(c.groom.name)}</p>
      <p class="sw-arrive__date">${bi(dateLong)}</p>
    </div>
  </section>

  <section class="sw-reply" id="rsvp" aria-labelledby="rsvp-title">
    <div class="sw-reply__grid">
      ${fin ? `<figure class="sw-reply__pic">${ctx.imgTag(fin.photo, fin.alt, '(min-width: 900px) 360px, 80vw')}</figure>` : ''}
      <div class="sw-letter">
        <h2 class="sw-h" id="rsvp-title">${bi(txt('rsvp.title'))}</h2>
        ${(P.deadline?.en || P.deadline?.ne) ? `<p class="sw-lede">${bi(P.deadline)}</p>` : ''}
        ${P.rsvpForm()}
      </div>
    </div>
    ${P.moreInfo() ? `<div class="sw-info">${P.moreInfo()}</div>` : ''}
  </section>

  <footer class="sw-close su-close" aria-label="Blessing">
    <p class="sw-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
    <p class="sw-close__en l-en">${esc(config.closing?.en || '')}</p>
    <p class="sw-close__names">${bi(c.bride.name)} <span aria-hidden="true">&amp;</span><span class="sr-only">and</span> ${bi(c.groom.name)}</p>
    ${c.hashtag ? `<p class="sw-close__tag">${esc(c.hashtag)}</p>` : ''}
    ${P.madeWith()}
  </footer>`;
}

// ───────── the journey's engine ─────────
function journey(ctx) {
  const stage = document.getElementById('sw-stage');
  const sec = document.getElementById('top');
  const sky = document.getElementById('sw-sky');
  const world = document.getElementById('sw-world');
  const fg = document.getElementById('sw-fg');
  const flow = document.getElementById('sw-flow');
  const ride = document.getElementById('sw-ride');
  const bob = document.getElementById('sw-bob');
  const me = document.getElementById('sw-me');
  const rideDusk = ride.querySelector('.sw-ride__dusk');
  const skySunset = sky.querySelector('.sw-sky--sunset');
  const skyDusk = sky.querySelector('.sw-sky--dusk');
  const pans = [...world.querySelectorAll('.sw-pan')];
  // the words ride with the scroll, one transform each (the flow itself stays put, so the things standing on the
  // ground can sit behind the procession while the words stay in front of it)
  const cards = [...flow.querySelectorAll('.sw-card')];
  const props = [...flow.querySelectorAll('.sw-prop')].map((el) => ({ el, stop: el.closest('.sw-stop'), kind: el.dataset.prop }));
  // focus must never scroll the stage itself (the road moves by transform only)
  stage.addEventListener('scroll', () => { stage.scrollLeft = 0; stage.scrollTop = 0; });
  let vw = 0; let vh = 0; let phone = false; let H = 0; let Wp = 0; let gy = 0; let ch = 0; let cw = 0;
  let geo = []; let worldW = 0; let D = 1; let keys = []; let skyTravel = 0; let todKeys = []; let plants = [];
  let enter = 0; let wx = 0; let anchors = []; let routeW = 0; let fgWas = '';
  const byName = (n) => geo.find((g) => g.n === n);
  const MS_AR = 640 / 871; const FR_AR = 760 / 1230;

  // the things by the road: sized and set on the ground for this screen, at their own stop
  function placeProps() {
    const procTop = gy - ch * 0.985; const procL = (vw - cw) / 2;
    const groundY = gy - H * 0.035; // the near verge, a step behind the hooves
    for (const pr of props) {
      const { el, stop, kind } = pr;
      pr.k = keys.find((k) => k.el === stop);
      pr.off = stop.offsetLeft;
      const card = stop.querySelector('.sw-card');
      const cb = card && card.children.length ? card.offsetTop + card.offsetHeight : 40;
      el.style.removeProperty('--pw');
      let w; let top; let left;
      if (kind === 'marks') {
        // a row of small stones, the years on their faces
        const n = el.children.length;
        w = phone ? Math.min(78, (vw - 48) / n - 10) : Math.min(92, (procL - 40) / n - 14);
        const S = w / MS_AR;
        el.style.setProperty('--pw', `${w.toFixed(1)}px`);
        const rowW = n * w + (n - 1) * (phone ? 12 : 16);
        if (phone) { top = procTop - 4 - S * 0.5; left = (vw - rowW) / 2; } else {
          top = groundY - S;
          left = stop.dataset.side === 'r' ? vw - procL / 2 - rowW / 2 : procL / 2 - rowW / 2;
        }
        Object.assign(el.style, { left: `${left.toFixed(1)}px`, top: `${top.toFixed(1)}px`, width: `${rowW.toFixed(1)}px`, height: `${S.toFixed(1)}px` });
      } else {
        const ar = kind === 'frame' ? FR_AR : MS_AR;
        const face = el.querySelector('.sw-stone__face, .sw-mile__face');
        // how much of it must show (the photo, or the words carved on the stone), as a share of its height
        const need = (S) => (kind === 'frame' ? 0.745 * S : face ? (face.offsetTop + face.getBoundingClientRect().height + 8) : 0.8 * S);
        // the carved words stay on the stone's face, clear of the grass and marigolds at its foot (Nepali runs taller;
        // on a phone the foot hides behind the procession, so the words end a little higher)
        const fr = phone ? 0.75 : 0.8;
        const roomy = (ww) => { set(ww); let g = ww; const top = phone ? Math.min(300, vw - 32) : lim[1] + 40; while (face && face.offsetTop + face.offsetHeight > fr * (g / ar) && g < top) { g += 8; set(g); } fitFace(el, fr); return g; };
        const lim = phone ? { frame: [150, 220], stone: [200, 250], mile: [190, 250] }[kind] : { frame: [170, 290], stone: [210, 280], mile: [220, 290] }[kind];
        const set = (ww) => { el.style.width = `${ww.toFixed(1)}px`; el.style.height = `${(ww / ar).toFixed(1)}px`; el.style.setProperty('--pw', `${ww.toFixed(1)}px`); };
        if (phone) {
          // behind the procession, on the far side of the road: what matters stays above the bride's head
          const room = procTop - 6 - (cb + 14);
          w = roomy(clamp(room / 0.8 * ar, lim[0], Math.min(lim[1], vw - 40)));
          top = Math.max(cb + 10, procTop - 6 - need(w / ar));
          left = (vw - w) / 2;
        } else {
          // beside the procession, standing on the verge with its feet in the grass
          const col = Math.max(lim[0], procL - 24);
          w = Math.min(lim[1], col, (groundY - (cb + 18)) * ar);
          w = roomy(Math.max(lim[0], w));
          top = groundY - w / ar;
          const cx = stop.dataset.side === 'r' ? vw - procL / 2 + 6 : procL / 2 - 6;
          left = clamp(cx - w / 2, 12, vw - w - 12);
        }
        el.style.left = `${left.toFixed(1)}px`; el.style.top = `${top.toFixed(1)}px`;
      }
      // the light where it stands
      const rx = (pr.k ? -pr.k.x : 0) + left + el.offsetWidth / 2;
      const tod = todAt(rx);
      el.classList.toggle('is-sunset', tod > 0.55 && tod <= 1.35);
      el.classList.toggle('is-dusk', tod > 1.35);
      pr.x0 = left; pr.x1 = left + el.offsetWidth;
    }
  }

  function layout() {
    vw = stage.clientWidth; vh = stage.clientHeight;
    phone = vw < 760 || vw / vh < 0.95;
    H = phone ? vh * 0.56 : Math.min(vh * 0.72, Math.max(vh * 0.6, (vw * 0.5) / PANEL_AR * 1.25));
    Wp = H * PANEL_AR;
    // the road runs to the bottom edge: the painting whose trail sits lowest just reaches it
    gy = vh - Math.min(...PANELS.map((p) => 1 - p.ground)) * H + 1;
    let x = 0;
    geo = PANELS.map((p, i) => {
      if (i) x -= OVERLAP * Wp;
      const g = { ...p, left: x, top: gy - p.ground * H, w: Wp, h: H, mid: x + Wp / 2 };
      x += Wp;
      return g;
    });
    worldW = x;
    pans.forEach((el, i) => {
      const g = geo[i];
      Object.assign(el.style, { left: `${g.left.toFixed(1)}px`, top: `${g.top.toFixed(1)}px`, width: `${g.w.toFixed(1)}px`, height: `${g.h.toFixed(1)}px` });
    });
    world.style.width = `${worldW}px`;
    stage.style.setProperty('--ov', `${(OVERLAP * 100).toFixed(2)}%`);
    // the procession
    ch = phone ? Math.min(vh * 0.27, (vw * 0.9) / COUPLE_AR) : Math.min(vh * 0.37, (vw * 0.34) / COUPLE_AR);
    cw = ch * COUPLE_AR;
    Object.assign(ride.style, { width: `${cw.toFixed(1)}px`, height: `${ch.toFixed(1)}px`, left: `${((vw - cw) / 2).toFixed(1)}px`, top: `${(gy - ch * 0.985).toFixed(1)}px` });
    routeW = me.parentElement.clientWidth;
    // the sky: wide enough to drift a little the whole way
    const skyW = Math.max(vw * 1.3, vh * 2.05);
    sky.style.width = `${skyW}px`;
    skyTravel = skyW - vw;
    // the cards: every [data-anchor] is a key frame where the road shows its own place behind the procession
    D = Math.max(1, flow.scrollWidth - vw);
    anchors = [...flow.querySelectorAll('[data-anchor]')];
    const minX = vw - worldW; const maxX = 0;
    keys = anchors.map((el) => {
      const c = el.offsetLeft + el.offsetWidth / 2;
      const [n, f] = el.dataset.anchor.split(':');
      const g = byName(n);
      return { p: clamp((c - vw / 2) / D, 0, 1), x: clamp(vw / 2 - (g.left + Number(f) * g.w), minX, maxX), el };
    }).sort((a, b) => a.p - b.p);
    for (let i = 1; i < keys.length; i++) keys[i].x = Math.min(keys[i].x, keys[i - 1].x); // the road only goes forward
    if (keys.length) { keys.unshift({ p: 0, x: keys[0].x }); keys.push({ p: 1, x: keys[keys.length - 1].x }); }
    // the light: a time of day at the middle of each painting
    todKeys = geo.map((g) => ({ at: g.mid, tod: g.tod }));
    placeProps();
    plantLayout();
  }

  // fresh flowers and grass in front, placed so none stands in front of the procession at a stop
  function plantLayout() {
    const span = (worldW - vw) * FG + vw * 2;
    const hgt = vh * (phone ? 0.11 : 0.15);
    const out = [];
    let x = -vw * 0.2; let k = 0;
    const holds = keys.map((kf) => kf.x * FG);
    const hx0 = (pr) => pr.k.x * FG;
    while (x < span) {
      const kind = k % 3 === 1 ? 'grass' : 'flowers';
      const ar = kind === 'grass' ? 1100 / 519 : 1100 / 497;
      const s = (0.78 + ((k * 37) % 23) / 60);
      const h = hgt * s; const w = h * ar;
      // its centre on screen at every stop
      const blocked = holds.some((hx) => Math.abs(hx + x + w / 2 - vw / 2) < cw * 0.3 + w * 0.25)
        // nor in front of the words carved on a roadside stone (wide screens: the stones stand beside the procession)
        || (!phone && props.some((pr) => pr.k && pr.x1 > pr.x0 && hx0(pr) + x + w * 0.78 > pr.x0 - 6 && hx0(pr) + x + w * 0.22 < pr.x1 + 6));
      if (!blocked) {
        // where on the road it is (for dusk colouring): screen centre ↔ road position at the moment it passes the middle
        const roadAt = (vw / 2 - (vw / 2 - (x + w / 2)) / FG);
        const tod = todAt(roadAt);
        out.push({ x, w, h, kind, dusk: tod > 1.35, flip: k % 2 === 1 });
        x += w * (0.55 + ((k * 13) % 7) / 10);
      } else x += w * 0.35;
      k++;
    }
    plants = out;
    // one size for every clump on this screen (mixing sizes would fetch both files of each painting)
    const big = Math.max(...out.map((p) => p.w), 0) * (window.devicePixelRatio || 1) > 900 && !phone;
    const html = out.map((p) => `<img class="sw-plant" src="${ART}${p.kind}${p.dusk ? '-dusk' : ''}${big ? '' : '-sm'}.webp" alt="" decoding="async" style="left:${p.x.toFixed(1)}px;width:${p.w.toFixed(1)}px;height:${p.h.toFixed(1)}px;${p.flip ? 'transform:scaleX(-1);' : ''}" />`).join('');
    if (html !== fgWas) { fg.innerHTML = html; fgWas = html; } // (unchanged: keep the decoded images)
  }

  function todAt(rx) {
    if (!todKeys.length) return 0;
    if (rx <= todKeys[0].at) return todKeys[0].tod;
    for (let i = 1; i < todKeys.length; i++) {
      const a = todKeys[i - 1]; const b = todKeys[i];
      if (rx <= b.at) return a.tod + (b.tod - a.tod) * smooth((rx - a.at) / (b.at - a.at));
    }
    return todKeys[todKeys.length - 1].tod;
  }

  // where the road and the words are for a scroll position: between two stops both glide together, and at each
  // stop they hold still for a moment (a short stretch of scroll), so the words can be read and a jump lands true
  const HOLD = 0.1;
  function worldAt(p) {
    if (keys.length < 2) return { x: 0, c: p };
    let i = 1; while (i < keys.length - 1 && keys[i].p < p) i++;
    const a = keys[i - 1]; const b = keys[i];
    const t = b.p > a.p ? clamp((p - a.p) / (b.p - a.p), 0, 1) : 1;
    const e = smooth(clamp((t - HOLD) / (1 - 2 * HOLD), 0, 1));
    return { x: a.x + (b.x - a.x) * e, c: a.p + (b.p - a.p) * e };
  }

  // load each painting a little before it comes into view
  function wake(x) {
    pans.forEach((el, i) => {
      if (!el.dataset.src) return;
      const g = geo[i];
      if (g.left + x < vw * 2.2) { el.srcset = el.dataset.srcset; el.src = el.dataset.src; delete el.dataset.src; }
    });
  }

  let lastP = -1;
  function render(p, force = false) {
    // a dialog locks the page (body fixed): keep the road where the guest left it
    if (document.body.style.position === 'fixed') return;
    if (!force && Math.abs(p - lastP) < 1e-6) return;
    lastP = p;
    const at = worldAt(p);
    wx = at.x;
    const fx = `translate3d(${(-D * at.c).toFixed(1)}px,0,0)`;
    for (const c of cards) c.style.transform = fx;
    // the roadside things move with the road
    // (each shows fully at its own stop and fades with its words as the guest rides on, so the next stop is never
    // crowded: gone halfway to the next stop)
    for (const pr of props) {
      if (!pr.k) continue;
      pr.el.style.transform = `translate3d(${(wx - pr.k.x - pr.off).toFixed(1)}px,0,0)`;
      const o = Math.round(clamp(1 - (Math.abs(at.c - pr.k.p) * D - vw * 0.14) / (vw * 0.34), 0, 1) * 100) / 100;
      if (o !== pr.o) { pr.o = o; pr.el.style.opacity = String(o); pr.el.style.visibility = o > 0 ? '' : 'hidden'; }
    }
    world.style.transform = `translate3d(${wx.toFixed(1)}px,0,0)`;
    fg.style.transform = `translate3d(${(wx * FG).toFixed(1)}px,0,0)`;
    const f = worldW > vw ? clamp(-wx / (worldW - vw), 0, 1) : 0;
    sky.style.transform = `translate3d(${(-skyTravel * f).toFixed(1)}px,0,0)`;
    me.style.transform = `translate3d(${(f * routeW).toFixed(1)}px,0,0)`;
    const tod = todAt(vw / 2 - wx);
    skySunset.style.opacity = clamp(tod, 0, 1).toFixed(3);
    skyDusk.style.opacity = clamp(tod - 1, 0, 1).toFixed(3);
    rideDusk.style.opacity = clamp((tod - 1) / 0.85, 0, 1).toFixed(3);
    document.body.classList.toggle('sw-journeying', p > 0.012);
    step();
    wake(wx);
    for (const k of keys) if (k.el) k.el.classList.toggle('is-here', Math.abs(k.p - p) * D < vw * 0.5);
  }
  // the walk: the bob follows the distance walked, so the horse stands still when the road stops
  function step() {
    const d = -wx - enter;
    const stride = Math.max(40, cw * 0.36);
    const ph = (d / stride) * Math.PI;
    const y = -Math.abs(Math.sin(ph)) * ch * 0.014;
    const r = Math.sin(ph * 2) * 0.45;
    bob.style.transform = `translate3d(0,${y.toFixed(2)}px,0) rotate(${r.toFixed(3)}deg)`;
    ride.style.transform = enter ? `translate3d(${enter.toFixed(1)}px,0,0)` : '';
  }
  return {
    layout, render,
    get D() { return D; }, get keys() { return keys; }, get vw() { return vw; },
    setEnter(x) { enter = x; step(); },
    stage, sec, flow,
  };
}

function startJourney(ctx, J) {
  const { ScrollTrigger } = ctx;
  let trig = null;
  const make = () => {
    trig = ScrollTrigger.create({
      trigger: J.sec, start: 'top top', end: () => `+=${Math.round(J.D)}`, pin: J.stage, pinSpacing: true, scrub: true, anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefreshInit: () => { J.layout(); },
      onRefresh: (self) => { trig = self; J.render(self.progress, true); },
      onUpdate: (self) => J.render(self.progress),
      // in the studio's preview the page is moved for the client ("show me this"): there it always comes to rest at a
      // stop, so words standing beside the procession on wide screens land where they belong
      ...(PREVIEW ? { snap: { snapTo: (v) => J.keys.filter((k) => k.el).reduce((m, k) => (Math.abs(k.p - v) < Math.abs(m - v) ? k.p : m), 0), duration: { min: 0.2, max: 0.6 }, delay: 0.12, ease: 'power2.inOut', directional: false } } : {}),
    });
    J.render(0, true);
  };
  make();
  // a refresh lifts the pinned road out of its spacer and back (a DOM move), which drops keyboard focus inside it:
  // give the focus back
  let held = null;
  ScrollTrigger.addEventListener('refreshInit', () => { const a = document.activeElement; held = a && a !== document.body && J.stage.contains(a) ? a : null; });
  ScrollTrigger.addEventListener('refresh', () => { if (held && held.isConnected && document.activeElement !== held) held.focus({ preventScroll: true }); held = null; });
  const relayout = () => { if (!trig) return; J.layout(); ScrollTrigger.refresh(); };
  document.fonts?.ready.then(relayout);
  J.flow.querySelectorAll('img').forEach((im) => { if (!im.complete) im.addEventListener('load', () => { clearTimeout(relayout.t); relayout.t = setTimeout(relayout, 160); }, { once: true }); });
  J.flow.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', () => { clearTimeout(relayout.t); relayout.t = setTimeout(relayout, 60); }));
  const goP = (p, immediate = false) => {
    if (!trig) return;
    const y = trig.start + (trig.end - trig.start) * p;
    const l = ctx.lenis?.();
    if (l) l.scrollTo(y, { immediate, force: true, duration: 1.6 }); else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
  };
  // keyboard: tabbing into a stop brings it to the middle of the road
  J.flow.querySelectorAll('.sw-stop').forEach((s) => s.addEventListener('focusin', () => {
    const k = J.keys.find((x) => x.el && (x.el === s || s.contains(x.el)));
    if (k && !s.classList.contains('is-here') && !k.el.classList.contains('is-here')) goP(k.p, true);
  }));
  // the scroll cue rides to the next stop
  document.addEventListener('click', (e) => {
    const cue = e.target.closest?.('#cue');
    if (!cue) return;
    e.preventDefault(); e.stopPropagation();
    const k = J.keys.filter((x) => x.el)[1];
    if (k) goP(k.p);
  }, true);
  if (new URLSearchParams(location.search).has('debug')) {
    const ks = () => J.keys.filter((x) => x.el);
    window.__sw = { n: () => ks().length, go: (i) => goP(ks()[i].p, true), at: (p) => goP(p, true), keys: ks };
  }
  return {
    // a phone turned on its side: the road is too low for the words, so the stops become still postcards (and back)
    stop: () => { trig?.kill(true); trig = null; },
    again: () => { if (trig) return; J.layout(); make(); ScrollTrigger.refresh(); },
  };
}

// ───────── the scratch cover: gold leaf with marigold petals ─────────
function paintCover(c2, w, h, dpr, hint) {
  goldFoil([[0, '#B4791F'], [0.22, '#F1CF7C'], [0.45, '#C58D2C'], [0.6, '#F8E2A6'], [0.8, '#B47A22'], [1, '#8F5C17']], '#4E2E06', "600 {s}px 'Brygada 1918', Georgia, serif")(c2, w, h, dpr, hint);
  // a scatter of marigold petals round the edge
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 26; i++) {
    const edge = Math.random();
    const x = edge < 0.5 ? rnd(0, w) : (Math.random() < 0.5 ? rnd(0, w * 0.12) : rnd(w * 0.88, w));
    const y = edge < 0.5 ? (Math.random() < 0.5 ? rnd(0, h * 0.16) : rnd(h * 0.84, h)) : rnd(0, h);
    c2.save(); c2.translate(x, y); c2.rotate(rnd(0, Math.PI));
    c2.fillStyle = Math.random() < 0.6 ? 'rgba(232,120,20,.9)' : 'rgba(250,180,30,.9)';
    c2.beginPath(); c2.ellipse(0, 0, 7 * dpr, 3.6 * dpr, 0, 0, Math.PI * 2); c2.fill(); c2.restore();
  }
}

// ───────── fitting the names ─────────
function fit(sel, part) {
  document.querySelectorAll(sel).forEach((h) => {
    h.style.fontSize = '';
    const max = h.parentElement.clientWidth;
    const row = getComputedStyle(h).flexDirection === 'row';
    const fs0 = parseFloat(getComputedStyle(h).fontSize);
    let fs = fs0;
    const over = () => [...h.querySelectorAll(part)].some((n) => n.scrollWidth > max) || (row && h.offsetHeight > fs * 1.75 && fs > fs0 * 0.68);
    for (let i = 0; i < 16 && over(); i++) { fs *= 0.94; h.style.fontSize = `${fs}px`; }
  });
}
const fitAll = () => { fit('.sw-names', '.sw-names__n'); fit('.sw-g__names', '.sw-g__n'); };

let J = null; let road = null; let opened = null;
// a stone's words never run down into the grass at its foot: shrink them a little if they must
function fitFace(el, fr = 0.8) {
  const face = el.querySelector('.sw-stone__face, .sw-mile__face');
  if (!face) return;
  face.style.transform = '';
  const room = el.offsetHeight * fr - face.offsetTop;
  if (room > 0 && face.offsetHeight > room) face.style.transform = `scale(${Math.max(0.8, room / face.offsetHeight).toFixed(3)})`;
}
const fitFaces = () => document.querySelectorAll('.sw-stone, .sw-mile').forEach(fitFace);
// too little height for the words above the road (a phone on its side): the still postcards instead
const tooLow = () => window.innerHeight < 500 && window.innerWidth > window.innerHeight * 1.2;
function setStill(on) {
  if (on === document.body.classList.contains('sw-still')) return;
  if (on) road?.stop();
  document.body.classList.toggle('sw-still', on);
  document.body.classList.toggle('sw-live', !on);
  if (!on) {
    J.layout(); J.render(0, true);
    if (road) road.again(); else if (opened) road = startJourney(opened, J);
  }
  opened?.ScrollTrigger.refresh();
}
const SPEC = {
  slug: 'sawari',
  manifest,
  gate: (ctx) => gate(ctx),
  hero: () => '',
  page: (ctx) => page(ctx),
  scratch: { paint: paintCover },

  ready: (ctx) => {
    if (ctx.reduced || tooLow()) document.body.classList.add('sw-still');
    initNepali();
    fitAll();
    document.fonts?.ready.then(() => { fitAll(); if (reducedNow()) fitFaces(); });
    if (reducedNow()) fitFaces();
    // the other language changes every height: fit again, and set the road again
    document.addEventListener('langchange', () => requestAnimationFrame(() => {
      fitAll();
      if (reducedNow() || !road) fitFaces();
      if (!reducedNow() && J) { J.layout(); if (road) opened.ScrollTrigger.refresh(); else J.render(0, true); }
    }));
    let rw = window.innerWidth;
    window.addEventListener('resize', () => {
      if (window.innerWidth === rw) return;
      rw = window.innerWidth;
      fitAll();
      if (J) setStill(tooLow());
    });
    if (!ctx.reduced) {
      J = journey(ctx);
      if (!reducedNow()) {
        document.body.classList.add('sw-live');
        J.layout();
        J.render(0, true);
      }
    }
  },

  // the painting itself is a tap target too (the buttons stay the accessible way in)
  gateTap: (ctx, go) => document.getElementById('sw-gart')?.addEventListener('click', go),

  open: (ctx, tl, gateEl) => {
    const { gsap } = ctx;
    const art = document.getElementById('sw-gart');
    const words = document.getElementById('sw-gwords');
    const veil = gateEl.querySelector('.sw-g__veil');
    // 1 · the names lift away
    tl.to(words, { opacity: 0, y: -24, duration: 0.7, ease: 'power2.in' }, 0.05);
    // 2 · the painting slips away as if the camera stepped back onto the road
    tl.to(art, { scale: 1.08, duration: 1.5, ease: 'power2.inOut' }, 0.1)
      .to([art, veil], { opacity: 0, duration: 0.9, ease: 'power1.inOut' }, 0.7);
    tl.set(gateEl, { pointerEvents: 'none' }, 0.7);
    // 3 · the procession walks in from the left and stops at the family home
    if (J && !reducedNow()) {
      const s = { x: -J.vw * 0.75 };
      J.setEnter(s.x);
      tl.to(s, { x: 0, duration: 2.4, ease: 'power2.out', onUpdate: () => J.setEnter(s.x) }, 0.9);
    }
    tl.set(gateEl, { autoAlpha: 0 }, 1.7);
    tl.to({}, { duration: 0.01 }, 3.3);
    return 1.5; // the words settle in as the road appears
  },

  ambient: () => {},
  scroll: (ctx) => {
    opened = ctx;
    if (J && !reducedNow()) { J.layout(); road = startJourney(ctx, J); }
  },
};
mountSuite(SPEC);
