// Theme · Zari (ज़री) — the bridal trousseau trunk.
// Gate: a closed sapphire-velvet trunk with zardozi borders and brass straps, an Aligarh brass padlock on the hasp and
// a small marigold garland on the lid. Tap: the key slides in and turns, the shackle jumps, the lock drops away and
// the lid swings back on its hinge (CSS 3D). The camera tilts to look into the trunk and a folded red odhni lifts
// out with the names worked in gold, revealed by a moving mask.
// Signature (scroll, pinned): the trays lift out of the trunk one by one, rise, turn to face the guest, show their
// part of the wedding and slide out of frame: a gold coin with the date, two bangle boxes for the families, the
// photographs, ceremony cards on velvet cushions, a venue map embroidered on silk, a brass dial counting down and a
// silk-tasselled tag for the reply. Then the lid closes, and a short blessing ends the page.
// Reduced motion / ?still: the trunk stands open and the trays are laid out one under the other.
// Engine: src/themes/_suite/suite.js (T.gate, T.page, T.ready, T.open, T.ambient, T.scroll).
import { gsap } from 'gsap';
import { mountSuite } from '../_suite/suite.js';
import manifest from './slots.js';
import { dateOf } from '../../core/i18n.js';
import { openModal } from '../../core/modal.js';
import './zari.css';

const A = '/themes/zari/art/';
const SZ = { coin: [520, 900], dial: [500, 820], tag: [500, 800], map: [720, 1200], roses: [520, 900], 'trunk-body': [760, 1400], 'trunk-lid': [760, 1400] };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
const L = {
  where: { en: 'Where', ne: 'कहाँ' }, open: { en: 'Open in Maps', ne: 'नक्सामा हेर्नुहोस्' },
  info: { en: 'Travel, stays and contacts', ne: 'यात्रा, बसाइ र सम्पर्क' }, more: { en: 'more photos', ne: 'थप तस्बिर' },
  tray: { en: 'Tray', ne: 'पेटी' }, of: { en: 'of', ne: 'मध्ये' }, days: { en: 'days', ne: 'दिन' },
  h: { en: 'hrs', ne: 'घण्टा' }, m: { en: 'min', ne: 'मिनेट' }, s: { en: 'sec', ne: 'सेकेन्ड' },
};
const rad = (d) => (d * Math.PI) / 180;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // cubic in-out
const easeOut = (t) => 1 - (1 - t) ** 3;
const art = (name, sizes, { cls = '', alt = '', eager = false } = {}) => {
  const w = SZ[name];
  const src = w ? `${A}${name}-sm.webp` : `${A}${name}.webp`;
  const set = w ? ` srcset="${A}${name}-sm.webp ${w[0]}w, ${A}${name}.webp ${w[1]}w" sizes="${sizes}"` : '';
  return `<img class="${cls}" src="${src}"${set} alt="${alt}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" draggable="false" />`;
};

// ───────── the page ─────────
function page(ctx) {
  const { bi, esc, txt, on, AD, BS, mainEv, placeLine, config, c, imgTag, parts: P, neNum } = ctx;
  const tray = (key, id, n, total, body, label) => `
    <article class="zr-tray zr-tray--${key}" id="${id}" data-tray="${key}" aria-labelledby="${id}-h">
      <i class="zr-tray__edge" aria-hidden="true"></i>
      <div class="zr-face"><div class="zr-face__in zr-fit">
        <p class="zr-no" aria-hidden="true">${bi({ en: `${ROMAN[n] || n + 1}`, ne: neNum(String(n + 1)) })}<i></i></p>
        ${label ? `<h2 class="zr-h" id="${id}-h">${bi(label)}</h2>` : ''}
        ${body}
      </div></div>
    </article>`;
  const bsShort = BS.full.short?.en ? (/B\.S\./.test(BS.full.short.en) ? BS.full.short.en : `${BS.full.short.en} B.S.`) : BS.full.en;
  const time = mainEv ? { en: AD.time, ne: ctx.timeLabel(mainEv).ne } : null;
  const inv = txt('hero.invocation');

  // odhni: the names, worked in gold
  const odhni = `
    <div class="zr-odhni" id="zodhni">
      <div class="zr-face zr-odhni__face"><div class="zr-face__in zr-fit">
        ${on(inv) ? `<p class="zr-o-inv zr-o-fade">${bi(inv)}</p>` : ''}
        <p class="zr-o-title zr-o-fade">${bi(txt('hero.title'))}</p>
        <h1 class="zr-names"><span class="zr-rev"><span class="zr-rev__in">${ctx.names('&amp;')}</span></span><i class="zr-glint" aria-hidden="true"></i></h1>
        ${on(txt('hero.line')) ? `<p class="zr-o-line zr-o-fade">${bi(txt('hero.line'))}</p>` : ''}
        <p class="zr-o-date zr-o-fade">${bi({ en: `${AD.wd.en}, ${AD.day} ${AD.monthYear.en}`, ne: BS.full.ne })}</p>
      </div></div>
    </div>`;

  // I. the gold coin: the date
  const coin = `
    <p class="zr-k">${bi(txt('date.kicker'))}</p>
    <div class="zr-coin">
      ${art('coin', '(max-width: 700px) 70vw, 340px', { cls: 'zr-coin__img' })}
      <div class="zr-coin__face"><div class="zr-fitin">
        <span class="zr-coin__wd">${bi(AD.wd)}</span>
        <span class="zr-coin__day">${bi({ en: AD.day, ne: BS.day || neNum(AD.day) })}</span>
        <span class="zr-coin__my">${bi({ en: AD.monthYear.en, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</span>
        ${time ? `<span class="zr-coin__t"><span class="l-en">${esc(time.en)}</span></span>` : ''}
      </div></div>
    </div>
    ${time ? `<p class="zr-alt zr-ne-time"><span class="l-ne" lang="ne">${esc(time.ne)}</span></p>` : ''}
    <p class="zr-alt">${bi({ en: bsShort, ne: AD.full.ne })}</p>
    ${placeLine?.en || placeLine?.ne ? `<p class="zr-place">${bi(placeLine)}</p>` : ''}
    <div class="zr-btns">${P.cardBtn('zr-btn zr-btn--line')}</div>`;

  // II. two bangle boxes: the families
  const fam = (f, i) => {
    const p = f.person;
    const pic = P.brideGroom && f.photo
      ? `<figure class="zr-fam__pic">${imgTag(f.photo, p.name.en, '160px')}</figure>`
      : `<figure class="zr-fam__box" aria-hidden="true"><img src="${A}bangles-${i ? 'green' : 'red'}.webp" alt="" loading="lazy" decoding="async" draggable="false" /></figure>`;
    return `<div class="zr-fam zr-fam--${f.key}">
      ${pic}
      <div class="zr-fam__t">
        <p class="zr-k">${bi(f.label)}</p>
        <h3 class="zr-fam__name">${bi(p.fullName)}</h3>
        ${p.parents?.en || p.parents?.ne ? `<p class="zr-fam__of">${bi(f.of)}</p><p class="zr-fam__par">${bi(p.parents)}</p>` : ''}
        ${p.home?.en || p.home?.ne ? `<p class="zr-fam__home">${bi(p.home)}</p>` : ''}
      </div>
    </div>`;
  };
  const families = `<div class="zr-fams">${fam(P.families[0], 0)}<p class="zr-fams__and" aria-hidden="true">&amp;</p>${fam(P.families[1], 1)}</div>`;

  // III. photographs, laid in velvet (only when there are any)
  const shown = P.photos.slice(0, 4);
  const photos = shown.length ? `<div class="zr-prints zr-prints--${shown.length}">${shown.map((g, i) => `<figure class="zr-print">${P.photoBtn(g, i, '(max-width: 700px) 44vw, 260px', 'zr-print__btn')}</figure>`).join('')}</div>
    ${P.photos.length > 4 ? `<button type="button" class="zr-more" data-lb-idx="4">+${P.photos.length - 4} ${bi(L.more)}</button>` : ''}` : '';

  // IV. ceremony cards on velvet cushions
  const card = (ev) => {
    const dress = ev.dress.colors.length || ev.dress.text?.en || ev.dress.text?.ne;
    return `<li class="zr-cush" id="ev-${esc(ev.id)}"><div class="zr-card"><div class="zr-card__in">
      <h3 class="zr-card__title">${bi(ev.title)}</h3>
      <p class="zr-card__when">${bi({ en: ev.ad.full.en, ne: ev.bs.full.ne })}</p>
      <p class="zr-card__alt">${bi({ en: ev.bs.full.short?.en ? `${ev.bs.full.short.en}${/B\.S\./.test(ev.bs.full.short.en) ? '' : ' B.S.'}` : ev.bs.full.en, ne: ev.ad.full.ne })}</p>
      <p class="zr-card__time">${bi(ev.time)}</p>
      <p class="zr-card__venue">${bi(ev.venue)} <a class="zr-link" href="${esc(ev.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></p>
      ${dress ? `<p class="zr-card__dress">${ev.dress.colors.length ? `<span class="zr-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : P.UI.wear)}</span></p>` : ''}
      ${ev.blurb ? `<p class="zr-card__blurb">${bi(ev.blurb)}</p>` : ''}
    </div></div></li>`;
  };
  const programme = `${on(txt('prog.kicker')) ? `<p class="zr-k">${bi(txt('prog.kicker'))}</p>` : ''}
    <div class="zr-slider"><ol class="zr-track">${P.events.map(card).join('')}</ol></div>
    ${P.events.length > 1 ? `<p class="zr-pager" aria-hidden="true"><span class="zr-pager__n">1</span> / ${P.events.length}</p>` : ''}
    <div class="zr-btns">${P.calendarBtn('zr-btn zr-btn--line')}</div>`;

  // V. the venue map, embroidered on silk
  const venues = [];
  for (const ev of P.events) {
    const k = `${ev.venue?.en || ''}|${ev.venue?.ne || ''}`;
    let v = venues.find((x) => x.k === k);
    if (!v) venues.push(v = { k, venue: ev.venue, map: ev.map, titles: [] });
    v.titles.push(ev.title);
  }
  const hasInfo = !!(config.info?.travel || config.info?.stays?.length || config.info?.contacts?.length || /^https:\/\//i.test(config.info?.livestream || ''));
  const venue = `<div class="zr-mapwrap">${art('map', '(max-width: 700px) 84vw, 560px', { cls: 'zr-map', alt: 'A map embroidered in gold thread on ivory silk' })}</div>
    <ul class="zr-venues">${venues.slice(0, 4).map((v) => `<li><b>${bi(v.venue)}</b><small>${v.titles.map((t) => bi(t)).join('<span aria-hidden="true"> · </span>')}<span aria-hidden="true"> · </span><a class="zr-link" href="${esc(v.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></small></li>`).join('')}</ul>
    ${hasInfo ? `<div class="zr-btns"><button class="su-btn zr-btn zr-btn--line" type="button" data-open-info>${bi(L.info)}</button></div>` : ''}`;

  // VI. the brass dial: the countdown
  const watch = `<div class="zr-watch" data-countdown>
      <div class="zr-dial">
        ${art('dial', '(max-width: 700px) 64vw, 300px', { cls: 'zr-dial__img' })}
        <div class="zr-dial__face"><div class="zr-fitin">
          <div class="zr-dial__grid su-count__grid" aria-label="${esc(txt('count.title').en)}">
            <p class="zr-dial__days">${P.countNum('d', 'zr-dial__dn')}<span>${bi(L.days)}</span></p>
            <p class="zr-dial__hms">${['h', 'm', 's'].map((u) => `<span class="zr-dial__u">${P.countNum(u, 'zr-dial__n')}<small>${bi(L[u])}</small></span>`).join('<i aria-hidden="true">:</i>')}</p>
          </div>
          <p class="zr-dial__done" data-count-done hidden></p>
        </div></div>
      </div>
      <p class="zr-alt">${bi(dateOf(mainEv?.start || config.weddingDate))}</p>
    </div>`;

  // VII. the silk tag: the reply
  const tag = `<div class="zr-tag">
      ${art('tag', '(max-width: 700px) 66vw, 320px', { cls: 'zr-tag__img' })}
      <div class="zr-tag__face"><div class="zr-fitin">
        <p class="zr-tag__title">${bi(txt('rsvp.title'))}</p>
        ${P.deadline?.en || P.deadline?.ne ? `<p class="zr-tag__dl">${bi(P.deadline)}</p>` : ''}
        <button class="su-btn zr-btn" type="button" data-open-rsvp>${bi(txt('rsvp.open'))}</button>
      </div></div>
    </div>
    <div class="zr-btns">${P.shareBtn('zr-btn zr-btn--line')}</div>`;

  const list = [
    ['date', 'date', coin, null],
    ['families', 'families', families, txt('families.title')],
    ...(photos ? [['photos', 'photos', photos, txt('gallery.title')]] : []),
    ...(P.events.length ? [['events', 'programme', programme, txt('prog.title')], ['venue', 'venue', venue, txt('venue.title')]] : []),
    ['countdown', 'countdown', watch, txt('count.title')],
    ['rsvp', 'rsvp', tag, null],
  ];
  const trays = list.map(([key, id, body, label], i) => tray(key, id, i, list.length, body, label)).join('');

  const lead = P.lead;
  const initials = `${(c.bride.name.en || c.bride.name.ne || '').trim().charAt(0)}${(c.groom.name.en || c.groom.name.ne || '').trim().charAt(0)}`;
  const lidPic = lead
    ? `<figure class="zr-lidpic" id="couple"><span class="zr-lidpic__mat">${imgTag(lead.photo, lead.alt, '(max-width: 700px) 40vw, 260px')}</span></figure>`
    : `<p class="zr-mono" aria-hidden="true">${esc(initials)}</p>`;

  return `
  <div class="zr-journey" id="journey">
  <section class="zr-scene" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    <div class="zr-room" aria-hidden="true"><i class="zr-room__warm"></i></div>
    <div class="zr-stage" id="zstage">
      <div class="zr-world" id="zworld">
        <i class="zr-ground" aria-hidden="true"></i>
        <i class="zr-wall zr-wall--back" aria-hidden="true"></i><i class="zr-wall zr-wall--l" aria-hidden="true"></i><i class="zr-wall zr-wall--r" aria-hidden="true"></i><i class="zr-floor" aria-hidden="true"></i>
        ${odhni}
        <div class="zr-trays" id="ztrays">${trays}</div>
        <div class="zr-front" aria-hidden="true">
          ${art('trunk-body', '(max-width: 700px) 92vw, 640px', { cls: 'zr-front__img', eager: true })}
          <div class="zr-lock" id="zlock">
            <img class="zr-lock__sh" src="${A}lock-shackle.webp" alt="" decoding="async" draggable="false" />
            <img class="zr-lock__body" src="${A}lock-body.webp" alt="" decoding="async" draggable="false" />
            <img class="zr-key" id="zkey" src="${A}key.webp" alt="" decoding="async" draggable="false" />
          </div>
        </div>
        ${art('roses', '(max-width: 700px) 36vw, 240px', { cls: 'zr-roses' })}
        <div class="zr-lid" id="zlid">
          <div class="zr-lid__front" aria-hidden="true">${art('trunk-lid', '(max-width: 700px) 92vw, 640px', { cls: 'zr-lid__img', eager: true })}<img class="zr-garland" src="${A}garland.webp" alt="" decoding="async" draggable="false" /></div>
          <i class="zr-lid__top" aria-hidden="true"></i>
          <div class="zr-lid__inner">${lidPic}</div>
        </div>
      </div>
    </div>
    <i class="su-in" aria-hidden="true"></i>
    <a class="su-cue zr-cue" id="cue" href="#zr-step"><span>${bi(P.UI.scroll)}</span><i aria-hidden="true"></i></a>
  </section>
  <i class="zr-step" id="zr-step" aria-hidden="true"></i>
  </div>
  <div class="zr-list" id="zlist"></div>

  <footer class="zr-close" aria-label="Blessing">
    <div class="zr-close__in su-rise">
      <p class="zr-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
      <p class="zr-close__en l-en">${esc(config.closing?.en || '')}</p>
      ${on(txt('close.line')) ? `<p class="zr-close__line">${bi(txt('close.line'))}</p>` : ''}
      <p class="zr-close__names">${ctx.names('&amp;')}</p>
      ${c.hashtag ? `<p class="zr-close__tag">${esc(c.hashtag)}</p>` : ''}
    </div>
    ${P.madeWith()}
  </footer>

  <div class="su-modal zr-modal" id="rsvpmodal" hidden role="dialog" aria-modal="true" aria-labelledby="rm-title" data-lenis-prevent>
    <div class="su-modal__panel zr-modal__panel">
      <button class="su-modal__x" type="button" data-close><span aria-hidden="true">×</span><span class="sr-only">${esc(P.UI.close.en)}</span></button>
      <h2 class="zr-modal__title" id="rm-title">${bi(txt('rsvp.title'))}</h2>
      ${P.deadline?.en || P.deadline?.ne ? `<p class="zr-modal__dl">${bi(P.deadline)}</p>` : ''}
      ${P.rsvpForm()}
    </div>
  </div>
  ${hasInfo ? `<div class="su-modal zr-modal" id="infomodal" hidden role="dialog" aria-modal="true" aria-labelledby="im-title" data-lenis-prevent>
    <div class="su-modal__panel zr-modal__panel">
      <button class="su-modal__x" type="button" data-close><span aria-hidden="true">×</span><span class="sr-only">${esc(P.UI.close.en)}</span></button>
      <h2 class="zr-modal__title" id="im-title">${bi(L.info)}</h2>
      ${P.moreInfo().replace('<details class="su-more">', '<details class="su-more" open>')}
    </div>
  </div>` : ''}`;
}

// ───────── geometry: one trunk, measured from the screen ─────────
const G = {};
function measure() {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const port = vw / vh < 0.9;
  const W = Math.round(Math.min(vw * (port ? 0.9 : 0.55), 640, vh * 0.9));
  const D = Math.round(W * 0.62);
  const Hl = (W * 285) / 1400;
  const Hb = (W * 451) / 1400;
  const Win = W * 0.9; const Din = D * 0.84; const asp = Win / Din;
  let Tw; let Td;
  // the tray as the guest reads it; in the trunk it is scaled to the trunk's own tray (a little non-uniformly)
  if (port) { Td = Math.min(vw * 0.92, (vh * 0.8) / 1.5); Tw = Math.min(vh * 0.8, Td * 2.05); } else { Tw = Math.min(vw * 0.84, 1180); Td = Math.min(vh * 0.8, Tw / 1.3); }
  void asp;
  const P = Math.round(Math.max(vw, vh) * 1.3);
  const oasp = 1322 / 958;
  let Ow; let Oh;
  if (port) { Oh = Math.min(vw * 0.9, (vh * 0.68) / oasp); Ow = Oh * oasp; } else { Ow = Math.min(vw * 0.6, vh * 0.72 * oasp, 960); Oh = Ow / oasp; }
  // the open trunk, seen from above (θ): its extent on screen, to fit and centre it
  const th = port ? 52 : 46; const s = Math.sin(rad(th)); const co = Math.cos(rad(th));
  const top = (0.259 * Hl - 0.966 * D) * co + (-D / 2 - 0.966 * Hl - 0.259 * D) * s;
  const bot = Hb * co + (D / 2) * s;
  const kr = Math.min(1, (vh * 0.84) / (bot - top), (vw * 0.94) / W);
  const read = { th, k: kr, y: vh * 0.04 - (kr * (top + bot)) / 2 };
  const persp = P / (P - D / 2); // the front stands half a depth nearer the guest
  const kg = Math.min(1, (vh * 0.42) / ((Hl + Hb) * persp), (vw * 0.88) / (W * persp));
  const gate = { th: port ? 7 : 6, k: kg, y: vh * (port ? 0.03 : 0.04) - (kg * (Hb - Hl)) / 2 };
  Object.assign(G, { vw, vh, port, W, D, Hl, Hb, Win, Din, Tw, Td, Ow, Oh, P, read, gate, cz: 220, rim: Math.round(Math.min(Tw, Td) * 0.07) });
}
/** a camera-space point (px from the screen centre; z toward the guest) → the trunk's own coordinates for a world pose */
function toLocal(cx, cy, cz, W) {
  const t = rad(W.th); const y = cy - W.y;
  return { x: cx / W.k, y: (y * Math.cos(t) - cz * Math.sin(t)) / W.k, z: (y * Math.sin(t) + cz * Math.cos(t)) / W.k };
}
const tf = (p, rx, rz, sx, sy) => `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, ${p.z.toFixed(2)}px) rotateX(${rx.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;

// ───────── state (each part's progress) and how it is drawn ─────────
const S = { world: { th: 7, k: 1, y: 0 }, lid: { a: 0 }, odhni: { lift: 0, exit: 0 }, trays: [] };
const E = {}; // elements

function rWorld() { E.world.style.transform = `translate3d(0, ${S.world.y.toFixed(2)}px, 0) rotateX(${(-S.world.th).toFixed(3)}deg) scale3d(${S.world.k}, ${S.world.k}, ${S.world.k})`; }
function rLid() { E.lid.style.transform = `translateZ(${(-G.D / 2).toFixed(2)}px) rotateX(${S.lid.a.toFixed(3)}deg)`; }
/** a lifted thing (tray or odhni): rest in the trunk → lifted above the rim → facing the guest → out of frame */
function pose(el, st, rest, size) {
  const R = G.read;
  const port = G.port;
  const rz1 = port ? -90 : 0;
  const shown = port ? size.h : size.h; // on screen: phones turn the tray upright (its depth becomes its width)
  const pres = toLocal(0, size.cy, G.cz, R);
  const sPres = (G.P - G.cz) / G.P / R.k;
  const up = { x: 0, y: -G.Hl * 0.6 - G.Hb * 0.4, z: -G.D * 0.05 };
  const l = clamp01(st.lift); const e = clamp01(st.exit);
  let p; let rx; let rz; let s; let sy;
  const rsy = rest.sy ?? rest.s;
  if (l < 0.38) {
    const t = easeOut(l / 0.38);
    p = { x: 0, y: mix(rest.y, up.y, t), z: mix(0, up.z, t) }; rx = mix(90, 78, t); rz = mix(0, rz1 * 0.15, t); s = mix(rest.s, rest.s * 1.04, t); sy = mix(rsy, rsy * 1.04, t);
  } else {
    const t = ease((l - 0.38) / 0.62);
    p = { x: 0, y: mix(up.y, pres.y, t), z: mix(up.z, pres.z, t) }; rx = mix(78, R.th, t); rz = mix(rz1 * 0.15, rz1, t); s = mix(rest.s * 1.04, sPres, t); sy = mix(rsy * 1.04, sPres, t);
  }
  if (e > 0) {
    const t = ease(e);
    const out = toLocal(0, size.cy - t * (G.vh * 0.5 + (port ? size.w : size.h) * 0.62 + 40), G.cz + t * 60, R);
    p = out; rx = R.th - t * 10;
  }
  el.style.transform = tf(p, rx, rz, s, sy);
  el.style.opacity = e > 0.86 ? String(1 - (e - 0.86) / 0.14) : '1';
  el.classList.toggle('is-up', l > 0.97 && e < 0.04);
  el.style.visibility = e >= 1 ? 'hidden' : '';
  void shown;
}
function rOdhni() { pose(E.odhni, S.odhni, { y: 1.5, s: (G.Win * 0.86) / G.Ow }, { w: G.port ? G.Oh : G.Ow, h: G.port ? G.Ow : G.Oh, cy: -G.vh * 0.015 }); }
function rTray(i) {
  const tr = E.trays[i]; const st = S.trays[i];
  pose(tr, st, { y: G.restY[i], s: G.Win / G.Tw, sy: G.Din / G.Td }, { w: G.port ? G.Td : G.Tw, h: G.port ? G.Tw : G.Td, cy: G.vh * 0.005 });
  const track = tr.querySelector('.zr-track');
  if (track && G.step) {
    track.style.transform = `translate3d(${(-st.slide * G.step).toFixed(2)}px, 0, 0)`;
    const n = tr.querySelector('.zr-pager__n');
    if (n) n.textContent = String(Math.min(E.cards.length, Math.round(st.slide) + 1));
  }
}
function renderAll() { rWorld(); rLid(); rOdhni(); E.trays.forEach((_, i) => rTray(i)); E.cue?.classList.toggle('is-off', S.odhni.exit > 0.04); }
// Scroll scenes draw from the state on every frame it changes (ScrollTrigger refreshes the timeline with its
// callbacks suppressed, so per-tween callbacks alone can leave a stale frame).
let lastKey = '';
const stateKey = () => [S.world.th, S.world.k, S.world.y, S.lid.a, S.odhni.lift, S.odhni.exit, ...S.trays.flatMap((t) => [t.lift, t.exit, t.slide])].map((v) => v.toFixed(4)).join(',');
function renderIfChanged(force) { const k = stateKey(); if (force !== true && k === lastKey) return; lastKey = k; renderAll(); }

function applySizes() {
  const r = document.body.style; // on body: the still list (outside the scene) uses the same sizes
  const px = (v) => `${v.toFixed(2)}px`;
  for (const [k, v] of Object.entries({ W: G.W, D: G.D, Hl: G.Hl, Hb: G.Hb, tw: G.Tw, td: G.Td, ow: G.Ow, oh: G.Oh, P: G.P, rim: G.rim })) r.setProperty(`--${k}`, px(v));
  E.scene.classList.toggle('zr-port', G.port);
  E.scene.classList.toggle('zr-land', !G.port);
  const n = E.trays.length;
  const gap = Math.min(12, (G.Hb - 16) / Math.max(1, n));
  G.restY = E.trays.map((_, i) => 6 + i * gap);
  // the stack: trays lower down are drawn first
  E.trays.forEach((t, i) => { t.style.zIndex = String(n - i); });
  layoutSlider();
}
function layoutSlider() {
  const tr = E.trays.find((t) => t.dataset.tray === 'events');
  G.step = 0; G.slides = 0;
  if (!tr) return;
  const slider = tr.querySelector('.zr-slider');
  const cards = [...tr.querySelectorAll('.zr-cush')];
  E.cards = cards;
  if (!cards.length || document.body.classList.contains('zr-still')) return;
  const sw = slider.clientWidth;
  const per = G.port ? 1 : Math.min(sw >= 980 ? 3 : sw >= 600 ? 2 : 1, cards.length);
  const gapPx = G.port ? 16 : 22;
  const cw = Math.min(G.port ? sw * 0.9 : (sw - gapPx * (per - 1)) / per, 420);
  slider.style.setProperty('--cw', `${cw}px`);
  slider.style.setProperty('--cg', `${gapPx}px`);
  const used = per * cw + (per - 1) * gapPx;
  slider.style.setProperty('--cpad', `${Math.max(0, (sw - used) / 2)}px`);
  G.step = cw + gapPx;
  G.slides = Math.max(0, cards.length - per);
}
/** words that do not fit their tray are set a little smaller (never cut) */
function fitAll() {
  if (document.body.classList.contains('zr-still')) { document.querySelectorAll('.zr-fit, .zr-card__in, .zr-fitin').forEach((el) => { el.style.transform = ''; }); return; }
  const fit = (el) => {
    el.style.transform = '';
    const box = el.parentElement;
    const s = Math.min(1, (box.clientHeight - 2) / el.scrollHeight, (box.clientWidth + 1) / el.scrollWidth);
    if (s < 0.999) el.style.transform = `scale(${Math.max(0.62, s).toFixed(4)})`;
  };
  document.querySelectorAll('.zr-card__in, .zr-fitin').forEach(fit);
  document.querySelectorAll('.zr-fit').forEach((el) => { if (el.closest('.zr-tray--events')) el.style.transform = ''; else fit(el); });
}

// ───────── the gate's own words (over the closed trunk) ─────────
function gateScene(ctx) {
  const { bi, txt, names } = ctx;
  return `<div class="zr-g">
      <p class="zr-g__title">${bi(txt('hero.title'))}</p>
      <i class="zr-g__rule"></i>
      <p class="zr-g__names">${names('&amp;')}</p>
    </div>`;
}

let scrollTl = null; let scrollSt = null;
const BEAT = 0.82; // screens of scroll per unit of the tray timeline

const T = {
  slug: 'zari',
  manifest,
  art: A,
  bell: false,
  gate: gateScene,
  page,

  ready(ctx) {
    E.scene = document.getElementById('top');
    E.world = document.getElementById('zworld');
    E.lid = document.getElementById('zlid');
    E.odhni = document.getElementById('zodhni');
    E.trays = [...document.querySelectorAll('.zr-tray')];
    E.lock = document.getElementById('zlock');
    E.key = document.getElementById('zkey');
    E.cue = document.getElementById('cue');
    S.trays = E.trays.map(() => ({ lift: 0, exit: 0, slide: 0 }));
    const ne = document.getElementById('f-name-err'); if (ne) { ne.hidden = false; ne.setAttribute('role', 'alert'); }
    measure(); applySizes();
    Object.assign(S.world, G.gate);
    renderAll();
    if (!ctx.reduced) gsap.set('.zr-o-fade', { opacity: 0, y: 8 });
    if (!ctx.reduced) gsap.set('.zr-rev', { xPercent: -101 });
    if (!ctx.reduced) gsap.set('.zr-rev__in', { xPercent: 101 });
    gsap.set(E.key, { opacity: 0, scaleX: -1, x: G.W * 0.14, rotationY: -28, transformPerspective: 500 });
    gsap.set('.zr-roses', { opacity: 0 });
    // the dialogs this theme adds (the reply form, travel and contacts)
    const dlg = (id, sel) => {
      const m = document.getElementById(id);
      if (!m) return;
      let close = null;
      const hide = () => { if (!close) return; const f = close; close = null; m.classList.remove('is-open'); setTimeout(() => { m.hidden = true; }, 260); f(); };
      document.querySelectorAll(sel).forEach((b) => b.addEventListener('click', () => {
        close = openModal(m, { scroller: m.querySelector('.su-modal__panel'), onClose: hide });
        requestAnimationFrame(() => m.classList.add('is-open'));
      }));
      m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) hide(); });
    };
    dlg('rsvpmodal', '[data-open-rsvp]'); dlg('infomodal', '[data-open-info]');
    // re-measure on a real size change (not the phone's address bar)
    let w0 = G.vw; let h0 = G.vh; let tmr = 0;
    window.addEventListener('resize', () => {
      const w = document.documentElement.clientWidth; const h = window.innerHeight;
      if (w === w0 && Math.abs(h - h0) < 140) return;
      w0 = w; h0 = h;
      clearTimeout(tmr);
      tmr = setTimeout(() => {
        const was = { ...S.world };
        const opened = document.body.classList.contains('is-open');
        measure(); applySizes();
        if (document.body.classList.contains('zr-still')) Object.assign(S.world, G.read);
        else if (!opened) Object.assign(S.world, G.gate);
        else if (scrollTl) { buildScroll(ctx, true); return; } else Object.assign(S.world, was.th > 20 ? G.read : G.gate);
        renderAll(); fitAll();
      }, 160);
    });
    document.fonts?.ready.then(() => { fitAll(); layoutSlider(); });
    new MutationObserver(() => requestAnimationFrame(fitAll)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });
  },

  gateTap(ctx, open) {
    document.getElementById('gscene')?.addEventListener('click', open);
  },

  open(ctx, tl) {
    const key = E.key;
    const lockParts = E.lock;
    tl.to('.zr-g', { autoAlpha: 0, y: -14, duration: 0.5, ease: 'power2.out' }, 0);
    // the key slides in and turns
    tl.to(key, { opacity: 1, x: 0, rotationY: -28, duration: 0.55, ease: 'power3.out' }, 0.15);
    tl.to(key, { rotationX: 80, duration: 0.42, ease: 'power2.inOut' }, 0.78);
    // the shackle jumps, the lock drops off the hasp
    tl.to('.zr-lock__sh', { yPercent: -16, duration: 0.2, ease: 'power2.out' }, 1.18);
    tl.to(lockParts, { y: G.Hb * 0.9, rotation: 16, opacity: 0, duration: 0.55, ease: 'power2.in' }, 1.42);
    // the lid swings back on its hinge, a touch past, and settles
    tl.to(S.lid, { a: 110, duration: 1.15, ease: 'power2.inOut', onUpdate: rLid }, 1.62);
    tl.to(S.lid, { a: 104, duration: 0.4, ease: 'sine.out', onUpdate: rLid }, 2.77);
    tl.to('.zr-room__warm', { opacity: 1, duration: 1.2, ease: 'power1.out' }, 1.9);
    tl.to('.zr-roses', { opacity: 1, duration: 0.6 }, 2.4);
    // the camera looks into the trunk
    tl.to(S.world, { th: G.read.th, k: G.read.k, y: G.read.y, duration: 1.45, ease: 'power2.inOut', onUpdate: rWorld }, 2.05);
    // the odhni lifts out and turns to us; the names are worked in gold
    tl.to(S.odhni, { lift: 1, duration: 1.25, ease: 'power1.inOut', onUpdate: rOdhni }, 2.95);
    tl.to('.zr-o-inv, .zr-o-title', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1 }, 3.95);
    tl.to('.zr-rev', { xPercent: 0, duration: 1.15, ease: 'power2.inOut' }, 4.1);
    tl.to('.zr-rev__in', { xPercent: 0, duration: 1.15, ease: 'power2.inOut' }, 4.1);
    tl.fromTo('.zr-glint', { xPercent: -50, left: '0%', opacity: 0 }, { left: '100%', opacity: 1, duration: 1.15, ease: 'power2.inOut' }, 4.1);
    tl.to('.zr-glint', { opacity: 0, duration: 0.35 }, 5.15);
    tl.to('.zr-o-line, .zr-o-date', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.12 }, 4.9);
    return 5.3;
  },

  ambient(ctx) {
    if (!ctx.reduced) return;
    // still: the trunk stands open; the odhni and the trays are laid out one under the other
    document.body.classList.add('zr-still');
    const listBox = document.getElementById('zlist');
    listBox.append(E.odhni, ...E.trays);
    E.lock.style.opacity = '0';
    S.lid.a = 104; Object.assign(S.world, G.read);
    rWorld(); rLid();
    for (const el of [E.odhni, ...E.trays]) { el.style.transform = ''; el.style.opacity = ''; el.style.visibility = ''; el.classList.add('is-up'); }
    gsap.set('.zr-roses, .zr-room__warm', { opacity: 1 });
    gsap.set('.zr-o-fade, .zr-rev, .zr-rev__in', { clearProps: 'all' });
    fitAll();
  },

  scroll(ctx) {
    if (ctx.reduced) return;
    buildScroll(ctx, false);
    settle(ctx);
    gsap.ticker.add(renderIfChanged);
    ctx.ScrollTrigger.addEventListener('refresh', () => renderIfChanged(true));
    // keyboard: a focused control inside a tray brings that tray up
    E.trays.forEach((t, i) => t.addEventListener('focusin', () => {
      if (t.classList.contains('is-up') || !scrollSt) return;
      const at = scrollTl.labels[`t${i}`];
      const y = scrollSt.start + (at / scrollTl.duration()) * (scrollSt.end - scrollSt.start);
      const l = ctx.lenis?.();
      if (l) l.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
    }));
  },
};

/** When the guest stops scrolling with a tray half-lifted, it glides on to the nearest resting tray (never while a
 *  finger is down, a dialog is open, or in the studio's preview and the screenshot hook). */
function settle(ctx) {
  const q = new URLSearchParams(location.search);
  if (q.has('debug') || q.has('preview')) return;
  let idle = 0; let touching = false;
  const moving = () => [S.odhni, ...S.trays].some((st) => (st.lift > 0.03 && st.lift < 0.97) || (st.exit > 0.03 && st.exit < 0.97));
  const check = () => {
    if (touching || !scrollSt?.isActive || document.body.style.position === 'fixed' || !moving()) return;
    const now = scrollSt.progress * scrollTl.duration();
    let best = null;
    for (const [name, at] of Object.entries(scrollTl.labels)) if (name !== 'end' && (best === null || Math.abs(at - now) < Math.abs(best - now))) best = at;
    if (best === null || Math.abs(best - now) > 0.75) return;
    const y = scrollSt.start + (best / scrollTl.duration()) * (scrollSt.end - scrollSt.start);
    const l = ctx.lenis?.();
    if (l) l.scrollTo(y, { duration: 0.7, easing: (t) => 1 - (1 - t) ** 3 }); else window.scrollTo({ top: y, behavior: 'smooth' });
  };
  window.addEventListener('scroll', () => { clearTimeout(idle); idle = setTimeout(check, 240); }, { passive: true });
  window.addEventListener('touchstart', () => { touching = true; clearTimeout(idle); }, { passive: true });
  window.addEventListener('touchend', () => { touching = false; clearTimeout(idle); idle = setTimeout(check, 420); }, { passive: true });
}

function buildScroll(ctx, keep) {
  const { ScrollTrigger } = ctx;
  const prog = keep && scrollSt ? scrollSt.progress : 0;
  scrollSt?.kill(); scrollTl?.kill();
  Object.assign(S.world, G.read); S.lid.a = 104; S.odhni.lift = 1;
  layoutSlider(); fitAll();
  const tl = gsap.timeline({ paused: true });
  let t = 0;
  tl.addLabel('top', 0);
  S.odhni.exit = 0;
  tl.fromTo(S.odhni, { exit: 0 }, { exit: 1, duration: 0.8, ease: 'none', onUpdate: rOdhni }, t); t += 0.55;
  E.trays.forEach((tr, i) => {
    const st = S.trays[i];
    Object.assign(st, { lift: 0, exit: 0, slide: 0 });
    const r = () => rTray(i);
    tl.fromTo(st, { lift: 0 }, { lift: 1, duration: 1, ease: 'none', onUpdate: r }, t); t += 1;
    const slides = tr.dataset.tray === 'events' ? G.slides : 0;
    tl.addLabel(`t${i}`, t + 0.12);
    if (slides) {
      tl.fromTo(st, { slide: 0 }, { slide: slides, duration: slides * 0.7, ease: 'none', onUpdate: r }, t + 0.3);
      for (let k = 1; k <= slides; k++) tl.addLabel(`t${i}s${k}`, t + 0.3 + k * 0.7);
      t += 0.3 + slides * 0.7 + 0.3;
    } else t += 0.6;
    tl.fromTo(st, { exit: 0 }, { exit: 1, duration: 0.8, ease: 'none', onUpdate: r }, t); t += 0.55;
  });
  t += 0.35;
  tl.fromTo(S.lid, { a: 104 }, { a: 0, duration: 1, ease: 'power2.inOut', onUpdate: rLid }, t);
  tl.fromTo(S.world, { th: G.read.th, k: G.read.k, y: G.read.y }, { th: G.gate.th, k: G.gate.k, y: G.gate.y, duration: 1.1, ease: 'power2.inOut', onUpdate: rWorld }, t + 0.15);
  tl.to('.zr-roses', { opacity: 0, duration: 0.4 }, t);
  t += 1.45;
  tl.addLabel('end', t);
  tl.to({}, { duration: 0.25 }, t);
  scrollTl = tl;
  const step = document.getElementById('zr-step');
  step.style.top = `${Math.round(1.25 * BEAT * G.vh)}px`;
  scrollSt = ScrollTrigger.create({
    trigger: E.scene, pin: true, start: 'top top', end: () => `+=${Math.round(tl.duration() * BEAT * window.innerHeight)}`,
    animation: tl, scrub: 0.5, invalidateOnRefresh: false, anticipatePin: 1,
  });
  if (keep && prog) {
    const y = scrollSt.start + prog * (scrollSt.end - scrollSt.start);
    window.scrollTo(0, y);
  }
  tl.progress(scrollSt.progress);
  renderAll();
  ScrollTrigger.refresh();
  if (new URLSearchParams(location.search).has('debug')) {
    window.__zr = {
      G, S, tl, st: scrollSt,
      /** scroll so the timeline sits at a label or a time */
      seek(at) {
        const time = typeof at === 'string' ? tl.labels[at] : at;
        const y = scrollSt.start + (time / tl.duration()) * (scrollSt.end - scrollSt.start);
        const l = ctx.lenis?.();
        if (l) l.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
        ScrollTrigger.update(); scrollSt.getTween?.()?.progress(1); tl.progress(scrollSt.progress); renderAll();
        return y;
      },
    };
  }
}

mountSuite(T);
