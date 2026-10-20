// Palki (पाल्की): the doli procession, from the bride's home at misty dawn to the mandap on the night of lamps.
// Opening: the mist lies over the village at dawn and a rolled silk banner hangs on its carved pole. Tap: the mist
// parts, the banner unrolls into the first screen (the names), and the doli waits at the door.
// Signature (the one moment): the procession. Six painted scenes of Nepal stand behind the page (a fixed world). As
// the guest scrolls, two bearers carry the bride's doli and the groom rides beside her, out of each scene's distance
// and down its trail toward the camera, then past it; between scenes the camera pushes on through the mist into the
// next place: home at dawn, the hills at sunrise, the chautari, the river and the temple, the gate at dusk, the
// mandap at night. Every chapter's words hang on silk cloths that scroll over the scene. Transform and opacity only.
// Reduced motion / ?still: the same painted chapters, swapped with a fade; the procession stands still in each.
import './palki.css';
import manifest from './slots.js';
import { mountSuite } from '../_suite/suite.js';
import { lamp, kalash, saptapadi, ganthi, initNepali } from '../_suite/nepali.js';

const ART = '/themes/palki/art/';
const PORTRAIT_Q = '(max-aspect-ratio: 9/10)';
const DOLI_AR = 907 / 1100; // width / height of the cut-outs
const GROOM_AR = 480 / 1100;
const IMG = { L: [1680, 944], P: [944, 1680] };

// The six scenes. fx/fy: the focal point kept on screen. path: the trail, far to near, as [x, y of the feet, height of
// the doli] in fractions of the painting; the procession walks it with perspective. light: how the cut-outs are lit.
const SCENES = [
  { n: 's1', light: 'dawn', alt: 'A red-ochre village house at misty blue dawn, a tulsi math and lit diyos in its courtyard, Himalayan peaks beyond',
    L: { fx: 0.42, fy: 0.62, path: [[0.335, 0.70, 0.13], [0.39, 0.83, 0.3], [0.45, 1.0, 0.56]] },
    P: { fx: 0.5, fy: 0.62, path: [[0.5, 0.69, 0.085], [0.5, 0.81, 0.2], [0.5, 0.99, 0.36]] } },
  { n: 's2', light: 'sunrise', alt: 'A stone trail winding down terraced mustard and rice fields at sunrise, rhododendrons in bloom, the Annapurna range glowing pink',
    L: { fx: 0.45, fy: 0.62, path: [[0.44, 0.765, 0.075], [0.43, 0.87, 0.21], [0.46, 1.0, 0.5]] },
    P: { fx: 0.5, fy: 0.62, path: [[0.57, 0.74, 0.07], [0.47, 0.86, 0.18], [0.43, 1.0, 0.34]] } },
  { n: 's3', light: 'day', alt: 'A stone chautari built around a pipal and a bar tree tied with marigold garlands, green hills behind',
    L: { fx: 0.55, fy: 0.6, path: [[0.74, 0.785, 0.1], [0.64, 0.88, 0.25], [0.55, 1.0, 0.5]] },
    P: { fx: 0.5, fy: 0.6, path: [[0.5, 0.78, 0.08], [0.52, 0.88, 0.18], [0.55, 1.0, 0.34]] } },
  { n: 's4', light: 'day', alt: 'A suspension bridge hung with marigolds over a turquoise river, a pagoda temple on the far bank, a snow peak above',
    L: { fx: 0.45, fy: 0.6, path: [[0.47, 0.75, 0.08], [0.4, 0.86, 0.2], [0.34, 1.0, 0.48]] },
    P: { fx: 0.5, fy: 0.6, path: [[0.47, 0.74, 0.07], [0.47, 0.86, 0.17], [0.5, 1.0, 0.32]] } },
  { n: 's5', light: 'dusk', alt: 'A welcome gate of banana stems and marigold garlands at dusk, brass kalash, a petal rangoli and rows of lit diyos',
    // the procession has gone in under the gate: the lamps are lit and the gate waits for the guests
    L: { fx: 0.5, fy: 0.6, path: null },
    P: { fx: 0.5, fy: 0.6, path: null } },
  { n: 's6', light: 'night', alt: 'A mandap dressed in marigolds and roses under the night sky, the sacred fire lit, hundreds of diyos around it',
    L: { fx: 0.5, fy: 0.55, path: null },
    P: { fx: 0.5, fy: 0.6, path: null } },
];

const pic = (s, eager) => {
  const a = (name, w) => `${ART}${name}.webp ${w}w`;
  const set = (o) => (o === 'p' ? `${a(`${s.n}-p-sm`, 600)}, ${a(`${s.n}-p`, 944)}` : `${a(`${s.n}-l-sm`, 1024)}, ${a(`${s.n}-l`, 1680)}`);
  const attr = eager ? 'srcset' : 'data-srcset';
  return `<picture><source media="${PORTRAIT_Q}" ${attr}="${set('p')}" sizes="100vw" /><img ${attr}="${set('l')}" sizes="100vw" ${eager ? `src="${ART}${s.n}-l-sm.webp"` : ''} alt="" decoding="async" ${eager ? 'fetchpriority="high"' : ''} /></picture>`;
};
const cut = (name, cls, { sizes = '40vw', w = [560, 1100], alt = '' } = {}) => `<img class="${cls}" src="${ART}${name}-sm.webp" srcset="${ART}${name}-sm.webp ${w[0]}w, ${ART}${name}.webp ${w[1]}w" sizes="${sizes}" alt="${alt}" decoding="async" />`;
const one = (name, cls, alt = '') => `<img class="${cls}" src="${ART}${name}.webp" alt="${alt}" decoding="async" loading="lazy" />`;
const still = () => document.body.classList.contains('pk-still');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// ───────── a silk cloth hanging from a carved doli pole ─────────
const cloth = (inner, { cls = '', night = false, id = '', label = '' } = {}) => `<div class="pk-cloth${night ? ' pk-cloth--night' : ''} ${cls}"${id ? ` id="${id}"` : ''}${label ? ` aria-labelledby="${label}"` : ''}>
    <img class="pk-cloth__rod" src="${ART}pole.webp" alt="" decoding="async" loading="lazy" />
    <div class="pk-cloth__body">${inner}</div>
  </div>`;

// ───────── the opening: mist over the village, a rolled banner on its pole ─────────
function gate(ctx) {
  const { c, bi } = ctx;
  const first = (t) => { const v = String(t || '').trim(); if (!v) return ''; try { return [...new Intl.Segmenter('ne', { granularity: 'grapheme' }).segment(v)][0].segment; } catch { return v.charAt(0); } };
  const ini = (p) => bi({ en: first(p.name?.en || p.name?.ne), ne: first(p.name?.ne || p.name?.en) });
  return `<div class="pk-g">
    <div class="pk-g__wash"></div>
    <img class="pk-g__mist pk-g__mist--a" src="${ART}mist.webp" alt="" decoding="async" />
    <img class="pk-g__mist pk-g__mist--b" src="${ART}mist.webp" alt="" decoding="async" />
    <div class="pk-g__roll" id="pk-roll">
      <img class="pk-g__rod" src="${ART}pole.webp" alt="" decoding="async" />
      <div class="pk-g__band"><p class="pk-g__mono"><span>${ini(c.bride)}</span><i aria-hidden="true"></i><span>${ini(c.groom)}</span></p></div>
    </div>
  </div>`;
}

// ───────── the first screen: the banner unrolled over the first scene ─────────
function hero(ctx) {
  const { bi, c, txt, on, AD, BS, placeLine } = ctx;
  const bsLine = BS.full.short?.en ? (/B\.S\./.test(BS.full.short.en) ? BS.full.short.en : `${BS.full.short.en} B.S.`) : BS.full.en;
  return `<div class="pk-banner" id="pk-banner">
      <img class="pk-banner__rod" src="${ART}pole.webp" alt="" decoding="async" />
      <div class="pk-banner__cloth" id="pk-bcloth">
        <div class="pk-banner__in">
          ${ctx.ganeshRef || on(txt('hero.invocation')) ? `<div class="pk-banner__inv su-in">${ctx.ganeshRef ? ctx.ganesh('pk-banner__gan', '64px') : ''}${on(txt('hero.invocation')) ? `<p>${bi(txt('hero.invocation'))}</p>` : ''}</div>` : ''}
          <p class="pk-k su-in">${bi(txt('hero.title'))}</p>
          <h1 class="pk-names su-in"><span class="pk-names__n">${bi(c.bride.name)}</span><span class="pk-names__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span><span class="pk-names__n">${bi(c.groom.name)}</span></h1>
          <p class="pk-banner__date su-in">${bi({ en: `${AD.wd.en}, ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.full.ne })}<span>${bi({ en: bsLine, ne: AD.full.ne })}</span></p>
          ${placeLine?.en || placeLine?.ne ? `<p class="pk-banner__place su-in">${bi(placeLine)}</p>` : ''}
          ${on(txt('hero.line')) ? `<p class="pk-banner__line su-in">${bi(txt('hero.line'))}</p>` : ''}
        </div>
      </div>
    </div>`;
}

// ───────── the page: the world behind, six chapters in front ─────────
function page(ctx) {
  const { bi, esc, txt, on, parts: P, c, config, neNum } = ctx;
  const hd = (title, id, tag = 'h2') => `<${tag} class="pk-h"${id ? ` id="${id}"` : ''}>${bi(title)}</${tag}>`;
  const tagOf = (k, n) => `<p class="pk-tag"><span class="pk-tag__n">${bi({ en: `${['One', 'Two', 'Three', 'Four', 'Five', 'Six'][n]}`, ne: `${['पहिलो', 'दोस्रो', 'तेस्रो', 'चौथो', 'पाँचौँ', 'छैटौँ'][n]} पडाव` })}</span><span class="pk-tag__t">${bi(txt(k))}</span></p>`;
  const beat = (i, k) => `<div class="pk-beat" data-beat="${i}">${k ? tagOf(k, i) : ''}</div>`;

  // the world: six paintings, the near flowers, the procession, the mist the camera passes through
  const world = `<div class="pk-world" id="pk-world" aria-hidden="true">
    ${SCENES.map((s, i) => `<div class="pk-scene pk-scene--${s.n}" data-i="${i}"><div class="pk-plate">${pic(s, i < 2)}</div></div>`).join('')}
    <div class="pk-proc" id="pk-proc">
      <span class="pk-proc__shadow"></span>
      ${cut('groom', 'pk-proc__groom', { sizes: '30vw' })}
      ${cut('doli', 'pk-proc__doli', { sizes: '50vw' })}
    </div>
    <div class="pk-near" id="pk-near">${cut('flowers', 'pk-near__l', { sizes: '40vw', w: [520, 1000] })}${cut('flowers', 'pk-near__r', { sizes: '40vw', w: [520, 1000] })}</div>
    <img class="pk-veil pk-veil--a" src="${ART}mist.webp" alt="" decoding="async" />
    <img class="pk-veil pk-veil--b" src="${ART}mist.webp" alt="" decoding="async" />
  </div>`;

  // chapter 1 · home at dawn: the elders' blessing and the card
  const ch0 = `
  <section class="pk-body pk-body--home" id="card" aria-labelledby="home-title">
    ${cloth(`
      <p class="pk-k">${bi(txt('home.kicker'))}</p>
      ${hd(txt('home.title'), 'home-title')}
      <p class="pk-lede">${bi(txt('card.line'))}</p>
      ${(config.hosts?.en || config.hosts?.ne) ? `<p class="pk-hosts">${bi(config.hosts)}</p>` : ''}
      <div class="pk-shrine" aria-hidden="true">${kalash('pk-shrine__kalash', '110px')}${lamp('diyo', { cls: 'pk-shrine__diyo', sizes: '90px' })}</div>
      ${P.cardBtn('su-btn--line')}`, { cls: 'pk-cloth--side' })}
  </section>`;

  // chapter 2 · the hills at sunrise: the couple behind the doli curtains, then the photographs
  const ch1 = `
  ${beat(1, 'hills.kicker')}
  <section class="pk-body pk-body--couple" id="couple" aria-labelledby="couple-title">
    ${P.lead ? `<figure class="pk-window" id="pk-window">
      <div class="pk-window__valance" aria-hidden="true"></div>
      <div class="pk-window__pic">${ctx.imgTag(P.lead.photo, P.lead.alt, '(min-width: 900px) 420px, 78vw', { cls: 'pk-window__img' })}</div>
      ${one('curtain', 'pk-window__cur pk-window__cur--l')}${one('curtain', 'pk-window__cur pk-window__cur--r')}
    </figure>` : ''}
    ${cloth(`${hd(txt('couple.title'), 'couple-title')}${on(txt('couple.line')) ? `<p class="pk-lede">${bi(txt('couple.line'))}</p>` : ''}`, { cls: 'pk-cloth--slip' })}
  </section>
  ${P.photos.length ? `
  <section class="pk-body pk-body--photos" id="photos" aria-labelledby="gal-title">
    ${cloth(hd(txt('gallery.title'), 'gal-title'), { cls: 'pk-cloth--slip pk-cloth--title' })}
    <ul class="pk-album">${P.photos.slice(0, 6).map((g, i) => `<li class="pk-album__ph">${P.photoBtn(g, i, '(min-width: 900px) 300px, 44vw', 'pk-album__btn')}</li>`).join('')}</ul>
    ${P.photos.length > 6 ? `<button class="su-btn pk-more" type="button" data-lb-idx="6">${bi({ en: `All ${P.photos.length} photographs`, ne: `सबै ${neNum(String(P.photos.length))} तस्बिर` })}</button>` : ''}
  </section>` : ''}`;

  // chapter 3 · the chautari: the two families, like the pipal and the bar side by side
  const fam = (f) => cloth(`
      ${P.brideGroom ? `<figure class="pk-fam__pic">${ctx.imgTag(f.photo, f.person.name.en, '120px')}</figure>` : ''}
      <p class="pk-k">${bi(f.label)}</p>
      <p class="pk-fam__name">${bi(f.person.fullName)}</p>
      ${(f.person.parents?.en || f.person.parents?.ne) ? `<p class="pk-fam__of">${bi(f.of)}</p><p class="pk-fam__par">${bi(f.person.parents)}</p>` : ''}
      ${(f.person.home?.en || f.person.home?.ne) ? `<p class="pk-fam__home">${bi(f.person.home)}</p>` : ''}`, { cls: `pk-cloth--fam pk-fam--${f.key}` });
  const groom = P.families.find((f) => f.key === 'groom'); const bride = P.families.find((f) => f.key === 'bride');
  const ch2 = `
  ${beat(2, 'chautari.kicker')}
  <section class="pk-body pk-body--fam" id="families" aria-labelledby="fam-title">
    ${cloth(`${hd(txt('families.title'), 'fam-title')}${on(txt('families.line')) ? `<p class="pk-lede">${bi(txt('families.line'))}</p>` : ''}`, { cls: 'pk-cloth--slip pk-cloth--title' })}
    <div class="pk-fams">${fam(bride)}<div class="pk-fams__knot">${ganthi('pk-fams__ganthi', '220px')}</div>${fam(groom)}</div>
  </section>`;

  // chapter 4 · across the river: the programme, one cloth per celebration
  const n = P.events.length;
  const ch3 = `
  ${beat(3, 'bridge.kicker')}
  <section class="pk-body pk-body--prog" id="programme" aria-labelledby="prog-title">
    ${cloth(hd(txt('prog.title'), 'prog-title'), { cls: 'pk-cloth--slip pk-cloth--title' })}
    <ol class="pk-evs">${P.events.map((ev, i) => {
      const hasDress = !!(ev.dress.text?.en || ev.dress.text?.ne || ev.dress.colors.length);
      const bsLine = ev.bs.full.short?.en ? (/B\.S\./.test(ev.bs.full.short.en) ? ev.bs.full.short.en : `${ev.bs.full.short.en} B.S.`) : ev.bs.full.en;
      return `<li class="pk-ev" id="ev-${esc(ev.id)}">${cloth(`
        <p class="pk-ev__no">${bi({ en: `${i + 1} of ${n}`, ne: `${neNum(String(i + 1))} / ${neNum(String(n))}` })}</p>
        <h3 class="pk-ev__title">${bi(ev.title)}</h3>
        <p class="pk-ev__date">${bi({ en: ev.ad.full.en, ne: ev.bs.full.ne })}</p>
        <p class="pk-ev__alt">${bi({ en: bsLine, ne: ev.ad.full.ne })}</p>
        <dl class="pk-ev__dl">
          <div><dt>${bi(P.UI.time)}</dt><dd>${bi(ev.time)}</dd></div>
          <div><dt>${bi(P.UI.venue)}</dt><dd>${bi(ev.venue)} <a class="su-link" href="${esc(ev.map)}" target="_blank" rel="noopener">${bi(P.UI.map)}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens Google Maps)</span></a></dd></div>
          ${hasDress ? `<div><dt>${bi(P.UI.wear)}</dt><dd class="pk-ev__dress">${ev.dress.colors.length ? `<span class="su-sw" aria-hidden="true">${ev.dress.colors.map((col) => `<i style="background:${col}"></i>`).join('')}</span>` : ''}<span>${bi(ev.dress.text?.en || ev.dress.text?.ne ? ev.dress.text : P.UI.wear)}</span></dd></div>` : ''}
        </dl>
        ${ev.blurb && (ev.blurb.en || ev.blurb.ne) ? `<p class="pk-ev__blurb">${bi(ev.blurb)}</p>` : ''}
        ${ev.rituals.length ? `<details class="pk-ev__order"><summary>${bi(P.UI.order)}</summary><ol>${ev.rituals.map((r) => `<li><span>${bi(r.time)}</span><span>${bi(r.title)}</span></li>`).join('')}</ol></details>` : ''}`, { cls: 'pk-cloth--ev' })}</li>`;
    }).join('')}</ol>
    <div class="pk-btns">${P.calendarBtn()}${P.shareBtn()}</div>
    ${P.moreInfo() ? `<div class="pk-info">${P.moreInfo()}</div>` : ''}
  </section>`;

  // chapter 5 · arriving at dusk: the day under the mist (scratch it away), the countdown
  const AD = ctx.AD; const BS = ctx.BS;
  const bsLine = BS.full.short?.en ? (/B\.S\./.test(BS.full.short.en) ? BS.full.short.en : `${BS.full.short.en} B.S.`) : BS.full.en;
  const face = `<div class="pk-day">
      <p class="pk-day__wd">${bi(AD.wd)}</p>
      <p class="pk-day__big">${bi({ en: AD.day, ne: BS.day || neNum(AD.day) })}</p>
      <p class="pk-day__my">${bi({ en: AD.monthYear.en, ne: BS.month && BS.year ? `${BS.month} ${BS.year}` : AD.monthYear.ne })}</p>
      <p class="pk-day__alt">${bi({ en: bsLine, ne: AD.full.ne })}</p>
      ${ctx.mainEv ? `<p class="pk-day__time">${bi(ctx.timeLabel(ctx.mainEv))}</p>` : ''}
      ${ctx.placeLine?.en || ctx.placeLine?.ne ? `<p class="pk-day__place">${bi(ctx.placeLine)}</p>` : ''}
    </div>`;
  const ch4 = `
  ${beat(4, 'arrive.kicker')}
  <section class="pk-body pk-body--date" id="date" aria-labelledby="date-title">
    ${cloth(`${hd(txt('date.title'), 'date-title')}${P.scratch(face, 'pk-scratch')}`, { cls: 'pk-cloth--date' })}
    ${cloth(`<div class="pk-count" data-countdown>
        <p class="pk-count__t">${bi(txt('count.title'))}</p>
        <ol class="pk-count__grid" aria-label="${esc(txt('count.title').en)}">${P.countUnits.map((x) => `<li>${P.countNum(x.u, 'pk-count__n')}<span class="pk-count__l">${bi(x.label)}</span></li>`).join('')}</ol>
        <p class="pk-count__done" data-count-done hidden></p>
      </div>`, { cls: 'pk-cloth--count' })}
  </section>`;

  // chapter 6 · the mandap on the night of lamps: the seven steps, the reply, the blessing
  const vows = (config.saptapadi || []).filter((v) => v && (v.en || v.ne)).slice(0, 7);
  const ch5 = `
  ${beat(5, 'mandap.kicker')}
  <section class="pk-body pk-body--vows" id="vows" aria-labelledby="vows-title">
    ${cloth(`
      <div class="pk-vows__art" aria-hidden="true">${saptapadi('pk-vows__steps', '200px')}</div>
      ${hd(txt('vows.title'), 'vows-title')}
      ${vows.length ? `<ol class="pk-vows">${vows.map((v, i) => `<li><span class="pk-vows__n" aria-hidden="true">${bi({ en: String(i + 1), ne: neNum(String(i + 1)) })}</span><span>${bi(v)}</span></li>`).join('')}</ol>` : ''}`, { night: true, cls: 'pk-cloth--vows' })}
  </section>
  <section class="pk-body pk-body--rsvp" id="rsvp" aria-labelledby="rsvp-title">
    ${cloth(`${hd(txt('rsvp.title'), 'rsvp-title')}${(P.deadline?.en || P.deadline?.ne) ? `<p class="pk-lede">${bi(P.deadline)}</p>` : ''}${P.rsvpForm()}`, { night: true, cls: 'pk-cloth--rsvp' })}
  </section>
  <footer class="pk-close" aria-label="Blessing">
    <div class="pk-close__lamps" aria-hidden="true">${lamp('diyo', { cls: 'pk-close__diyo', sizes: '80px' })}${lamp('diyo', { cls: 'pk-close__diyo', sizes: '80px' })}</div>
    <p class="pk-close__ne" lang="ne">${esc(config.closing?.ne || '')}</p>
    <p class="pk-close__en l-en">${esc(config.closing?.en || '')}</p>
    <p class="pk-close__names">${bi(c.bride.name)} <span aria-hidden="true">&amp;</span><span class="sr-only">and</span> ${bi(c.groom.name)}</p>
    ${c.hashtag ? `<p class="pk-close__tag">${esc(c.hashtag)}</p>` : ''}
    ${P.madeWith()}
  </footer>`;

  return `${world}
  <section class="su-hero pk-top" id="top" aria-label="${esc(`${c.bride.name.en} and ${c.groom.name.en}`)}">
    ${hero(ctx)}
    ${P.cue('card')}
  </section>
  <div class="pk-beat pk-beat--0" data-beat="0"></div>
  <div class="pk-flow">${ch0}${ch1}${ch2}${ch3}${ch4}${ch5}</div>`;
}

// ───────── the procession engine ─────────
function journey(ctx) {
  const world = document.getElementById('pk-world');
  const scenes = [...world.querySelectorAll('.pk-scene')];
  const plates = scenes.map((s) => s.querySelector('.pk-plate'));
  const proc = document.getElementById('pk-proc');
  const doli = proc.querySelector('.pk-proc__doli');
  const groom = proc.querySelector('.pk-proc__groom');
  const shadow = proc.querySelector('.pk-proc__shadow');
  const near = document.getElementById('pk-near');
  const veils = [...world.querySelectorAll('.pk-veil')];
  const beats = [...document.querySelectorAll('.pk-beat')].sort((a, b) => a.dataset.beat - b.dataset.beat);
  const reduced = still();

  const loaded = new Set();
  const load = (i) => {
    if (i < 0 || i >= scenes.length || loaded.has(i)) return;
    loaded.add(i);
    scenes[i].querySelectorAll('[data-srcset]').forEach((el) => { el.srcset = el.dataset.srcset; el.removeAttribute('data-srcset'); });
    const im = scenes[i].querySelector('img'); if (!im.getAttribute('src')) im.src = `${ART}${SCENES[i].n}-l-sm.webp`;
  };
  load(0); load(1);

  let vw = 0; let vh = 0; let ori = 'L'; let geo = []; let A = []; let base = 1000;
  function layout() {
    vw = window.innerWidth; vh = window.innerHeight;
    ori = window.matchMedia(PORTRAIT_Q).matches ? 'P' : 'L';
    const [iw, ih] = IMG[ori];
    const k = Math.max(vw / iw, vh / ih);
    geo = SCENES.map((s, i) => {
      const o = s[ori];
      const bw = iw * k; const bh = ih * k;
      const bx = clamp(vw / 2 - o.fx * bw, vw - bw, 0); const by = clamp(vh / 2 - o.fy * bh, vh - bh, 0);
      Object.assign(plates[i].style, { left: `${bx}px`, top: `${by}px`, width: `${bw}px`, height: `${bh}px` });
      // the camera pushes in toward the far end of the trail (or the middle of the scene)
      const f = o.path ? o.path[0] : [0.5, 0.55];
      const ox = bx + f[0] * bw; const oy = by + f[1] * bh;
      plates[i].style.transformOrigin = `${ox - bx}px ${oy - by}px`;
      return { bx, by, bw, bh, ox, oy, path: o.path };
    });
    // the cut-outs: laid out once at a base height and scaled
    base = Math.round(Math.min(1100, vh * 0.9));
    doli.style.height = `${base}px`; doli.style.width = `${base * DOLI_AR}px`;
    groom.style.height = `${base}px`; groom.style.width = `${base * GROOM_AR}px`;
    proc.dataset.ori = ori;
    // where each chapter's beat begins and ends on the page
    A = beats.map((b) => { const r = b.getBoundingClientRect(); const top = r.top + window.scrollY; return { a: top, b: top + b.offsetHeight }; });
  }

  // a scene point after the scene's push-in scale s
  const at = (g, s, u, v) => ({ x: g.ox + (g.bx + u * g.bw - g.ox) * s, y: g.oy + (g.by + v * g.bh - g.oy) * s });
  // the trail: a quadratic curve through far, mid and near; the doli grows with perspective (geometric)
  const trail = (p, q) => {
    const [f, m, nr] = p;
    const qq = Math.max(0, q);
    const t = Math.min(1, qq);
    const u = (1 - t) * (1 - t) * f[0] + 2 * (1 - t) * t * m[0] + t * t * nr[0];
    let v = (1 - t) * (1 - t) * f[1] + 2 * (1 - t) * t * m[1] + t * t * nr[1];
    let h = f[2] * (nr[2] / f[2]) ** t;
    if (qq > 1) { const e = qq - 1; v += e * 0.55; h *= 1 + e * 1.3; } // past the camera
    return { u, v, h };
  };

  let lastKey = '';
  let cur = -1;
  function setScene(i) {
    if (i === cur) return;
    cur = i;
    proc.dataset.light = SCENES[i].light;
    world.dataset.scene = String(i);
    load(i + 1); load(i + 2);
  }

  function place(i, q, s, alpha) {
    const g = geo[i];
    if (!g.path || alpha <= 0.001) { proc.style.opacity = '0'; return; }
    const { u, v, h } = trail(g.path, q);
    const H = h * g.bh * s;
    const p = at(g, s, u, v);
    // the steps: the bearers' shoulders rise and fall, the horse rocks (driven by the distance walked)
    const step = q * 26;
    const bob = Math.abs(Math.sin(step * Math.PI)) * H * 0.012;
    const rock = Math.sin(step * Math.PI * 0.5) * 0.7;
    const k = H / base;
    const P = ori === 'P';
    // the groom rides beside the doli: ahead and to the right on wide screens, just behind and to the left on phones
    const gk = k * (P ? 1.12 : 1.42);
    const gx = p.x + H * (P ? -0.46 : 0.62);
    const gy = p.y + H * (P ? -0.07 : 0.05);
    doli.style.transform = `translate3d(${(p.x - (base * DOLI_AR) / 2).toFixed(1)}px,${(p.y - base - bob).toFixed(1)}px,0) scale(${k.toFixed(4)})`;
    groom.style.transform = `translate3d(${(gx - (base * GROOM_AR) / 2).toFixed(1)}px,${(gy - base + bob * 0.6).toFixed(1)}px,0) scale(${gk.toFixed(4)}) rotate(${rock.toFixed(2)}deg)`;
    shadow.style.transform = `translate3d(${(p.x + (P ? -H * 0.2 : H * 0.2) - 100).toFixed(1)}px,${(p.y - 16).toFixed(1)}px,0) scale(${(H * (P ? 1.25 : 1.5) / 200).toFixed(3)}, ${(H * 0.12 / 32).toFixed(3)})`;
    proc.style.opacity = alpha.toFixed(3);
  }

  function render() {
    const y = window.scrollY;
    if (reduced) {
      // still: the chapter in view shows its painting (a fade), the procession stands half-way down its trail
      let i = 0; for (let k = 0; k < A.length; k++) if (y >= A[k].a - vh * 0.5) i = k;
      const key = `${i}|${ori}|${vw}x${vh}`;
      if (key === lastKey) return;
      lastKey = key;
      setScene(i);
      scenes.forEach((sc, k) => sc.classList.toggle('is-on', k === i));
      plates.forEach((pl) => { pl.style.transform = 'none'; });
      place(i, 0.72, 1, 1);
      return;
    }
    // which scenes are on screen: chapter i takes over as its beat comes up (the camera passes through the mist)
    let i = 0; for (let k = 1; k < A.length; k++) if (y >= A[k].a - vh * 0.55) i = k;
    setScene(i);
    const T0 = i > 0 ? A[i].a - vh * 0.55 : -1; const T1 = i > 0 ? A[i].a + vh * 0.15 : 0;
    const k = i > 0 ? clamp((y - T0) / (T1 - T0)) : 1;
    const ke = smooth(k);
    // the life of a scene: a slow walk forward (scale 1 to 1.05) from its beat to the next one
    const life = (j) => { const a = A[j].a; const b = A[j + 1] ? A[j + 1].a : a + vh * 3; return clamp((y - a) / (b - a)); };
    for (let j = 0; j < scenes.length; j++) {
      let o = 0; let s = 1;
      if (j === i) { o = ke; s = (1 + 0.07 * (1 - ke)) * (1 + 0.05 * life(j)); }
      else if (j === i - 1 && k < 1) { o = 1; s = (1 + 0.05) * (1 + 0.42 * k * k); } // pushed through
      const on = o > 0.001;
      if (scenes[j].classList.contains('is-on') !== on) scenes[j].classList.toggle('is-on', on);
      if (!on) continue;
      scenes[j].style.opacity = j === i ? o.toFixed(3) : '1';
      scenes[j].style.zIndex = j === i ? '2' : '1';
      plates[j].style.transform = `scale(${s.toFixed(4)})`;
    }
    // the mist the camera passes through between two places
    const mist = i > 0 ? Math.sin(Math.PI * clamp(k * 1.1 - 0.05)) : 0;
    veils[0].style.opacity = (mist * 0.9).toFixed(3);
    veils[1].style.opacity = (mist * 0.7).toFixed(3);
    veils[0].style.transform = `translate3d(${(-12 * k).toFixed(2)}vw,0,0) scale(${(1.1 + 0.5 * k).toFixed(3)})`;
    veils[1].style.transform = `translate3d(${(10 * k).toFixed(2)}vw,0,0) scale(${(1.3 + 0.6 * k).toFixed(3)}) scale(-1,-1)`;

    // the procession: down this scene's trail toward the camera, then past it
    const B = A[i];
    const W0 = i === 0 ? 0 : B.a - vh * 0.1; const W1 = B.b - vh * 1.0;
    const q = (y - W0) / Math.max(1, W1 - W0);
    const alpha = clamp((q + 0.12) / 0.12) * (1 - clamp((q - 1.04) / 0.22)) * (i > 0 ? clamp((k - 0.55) / 0.3) : 1);
    const s = (1 + 0.07 * (1 - ke)) * (1 + 0.05 * life(i));
    place(i, q, s, alpha);
    // the near flowers frame the walk on the day scenes, then step aside for the words
    const fl = SCENES[i].light === 'day' || SCENES[i].light === 'sunrise' ? clamp(q * 4 + 0.2) * (1 - clamp((q - 0.9) / 0.25)) * (i > 0 ? ke : 1) : 0;
    near.style.opacity = fl.toFixed(3);
    near.style.setProperty('--nk', (1 + 0.25 * clamp(q)).toFixed(3));
  }

  layout();
  render();
  if (reduced) world.classList.add('is-still');
  window.addEventListener('scroll', render, { passive: true });
  ctx.ScrollTrigger.addEventListener('refresh', () => { layout(); lastKey = ''; render(); });
  let rw = vw; let rh = vh;
  window.addEventListener('resize', () => {
    if (window.innerWidth === rw && Math.abs(window.innerHeight - rh) < 120) return; // the phone's address bar
    rw = window.innerWidth; rh = window.innerHeight;
    layout(); lastKey = ''; render();
  });
  document.fonts?.ready.then(() => { layout(); lastKey = ''; render(); });
  // photographs, fonts and opened details change the chapters' heights: keep the beats' offsets true
  if ('ResizeObserver' in window) {
    let raf = 0;
    const flow = document.querySelector('.pk-flow');
    if (flow) new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { layout(); lastKey = ''; render(); }); }).observe(flow);
  }
  window.addEventListener('load', () => { layout(); lastKey = ''; render(); });
  setTimeout(() => SCENES.forEach((_, i) => load(i)), 2500);
  return { layout, render, place, setScene };
}

// ───────── quiet reveals: the cloths settle, the doli curtains part ─────────
function reveals(ctx) {
  const els = [...document.querySelectorAll('.pk-cloth, .pk-window, .pk-album__ph, .pk-tag')];
  if (still() || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
  els.forEach((e) => e.classList.add('pk-rise'));
  const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -12% 0px' });
  els.forEach((e) => io.observe(e));
  void ctx;
}

// ───────── the scratch cover: the dawn mist over the day ─────────
const mistImg = typeof Image !== 'undefined' ? new Image() : null;
if (mistImg) mistImg.src = `${ART}mist.webp`;
function paintMist(c, w, h, dpr, hint) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9FB0C8'); g.addColorStop(0.55, '#C9C4D2'); g.addColorStop(1, '#E6D2D2');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  if (mistImg?.complete && mistImg.naturalWidth) {
    c.globalCompositeOperation = 'screen';
    c.globalAlpha = 0.95;
    const r = Math.max(w / mistImg.naturalWidth, h / mistImg.naturalHeight) * 1.25;
    c.drawImage(mistImg, (w - mistImg.naturalWidth * r) / 2, h - mistImg.naturalHeight * r * 0.92, mistImg.naturalWidth * r, mistImg.naturalHeight * r);
    c.globalAlpha = 0.6;
    c.save(); c.translate(w, 0); c.scale(-1, 1);
    c.drawImage(mistImg, (w - mistImg.naturalWidth * r) / 2, -mistImg.naturalHeight * r * 0.25, mistImg.naturalWidth * r, mistImg.naturalHeight * r);
    c.restore();
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  let size = Math.round(Math.min(w / 12, 26 * dpr));
  const font = (z) => `italic 500 ${z}px 'Brygada 1918', 'Mukta', Georgia, serif`;
  c.font = font(size);
  while (size > 10 * dpr && c.measureText(hint).width > w * 0.84) { size -= dpr; c.font = font(size); }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText(hint, w / 2 + dpr, h / 2 + dpr);
  c.fillStyle = '#26304D'; c.fillText(hint, w / 2, h / 2);
}

// fit the names on the banner (the Devanagari names are wider)
function fitNames() {
  const h = document.querySelector('.pk-names');
  if (!h) return;
  h.style.fontSize = '';
  const max = h.parentElement.clientWidth;
  let fs = parseFloat(getComputedStyle(h).fontSize);
  for (let i = 0; i < 14 && [...h.querySelectorAll('.pk-names__n')].some((n) => n.scrollWidth > max); i++) { fs *= 0.93; h.style.fontSize = `${fs}px`; }
}

let J = null;
const SPEC = {
  slug: 'palki',
  manifest,
  bell: false,
  gate: (ctx) => gate(ctx),
  hero: (ctx) => hero(ctx),
  page: (ctx) => page(ctx),

  ready: (ctx) => {
    if (ctx.reduced) document.body.classList.add('pk-still');
    initNepali();
    fitNames();
    document.fonts?.ready.then(fitNames);
    let rw = window.innerWidth;
    window.addEventListener('resize', () => { if (window.innerWidth === rw) return; rw = window.innerWidth; fitNames(); });
    J = journey(ctx);
    // under the closed gate: the banner is still rolled on its pole, its words hidden
    if (document.getElementById('gate')) {
      document.body.classList.add('pk-rolled');
      // reduced motion: no unrolling, the banner simply fades in with the first screen's words
      if (ctx.reduced) ['open', 'quiet'].forEach((id) => document.getElementById(id)?.addEventListener('click', () => document.body.classList.remove('pk-rolled')));
    }
    if (new URLSearchParams(location.search).has('debug')) window.__pk = { J, scenes: SCENES };
  },

  gateTap: (ctx, go) => document.getElementById('pk-roll')?.addEventListener('click', go),

  open: (ctx, tl, gateEl) => {
    const { gsap } = ctx;
    const cloth = document.getElementById('pk-bcloth');
    const roll = document.getElementById('pk-roll');
    const banner = document.getElementById('pk-banner');
    const proc = document.getElementById('pk-proc');
    // 1 · the mist parts, the dawn wash lifts
    tl.to(gateEl.querySelector('.pk-g__mist--a'), { xPercent: -38, opacity: 0, duration: 1.8, ease: 'power2.inOut' }, 0.1)
      .to(gateEl.querySelector('.pk-g__mist--b'), { xPercent: 38, opacity: 0, duration: 1.8, ease: 'power2.inOut' }, 0.1)
      .to(gateEl.querySelector('.pk-g__wash'), { opacity: 0, duration: 1.4, ease: 'power1.inOut' }, 0.3);
    // 2 · the banner unrolls from its pole: the gate's rolled cloth hands over to the first screen's banner
    const rolled = Math.max(0.06, (roll.querySelector('.pk-g__band').offsetHeight || 60) / Math.max(1, cloth.offsetHeight));
    tl.call(() => document.body.classList.remove('pk-rolled'), null, 0.55)
      .set(banner, { opacity: 1 }, 0.55)
      .fromTo(cloth, { scaleY: rolled }, { scaleY: 1, duration: 1.1, ease: 'expo.out' }, 0.55)
      .to(roll, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0.55)
      .fromTo(proc, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power1.out', clearProps: 'opacity' }, 1.1);
    tl.set(gateEl, { pointerEvents: 'none' }, 0.6);
    tl.set(gateEl, { autoAlpha: 0 }, 2.0);
    tl.to({}, { duration: 0.01 }, 2.05);
    return 0.95;
  },

  heroIntro: () => { document.body.classList.remove('pk-rolled'); },

  ambient: () => {},
  scroll: (ctx) => { document.body.classList.remove('pk-rolled'); reveals(ctx); J?.layout(); J?.render(); },
  scratch: { paint: paintMist },
};
mountSuite(SPEC);
