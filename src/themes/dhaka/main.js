// Dhaka (ढाका): heirloom stationery among real flowers.
// A Dhaka-tied, wax-sealed envelope rests among roses and marigolds. Tapping the seal breaks it,
// the flap opens on a Dhaka lining, the couple's photo rises out of the envelope and the flowers
// gather into a floral welcome frame around it. Then a calm page: varied photo treatments
// (mounted print, framed pair, full-width feature, loose prints), a clear programme, families, RSVP.
import '../../core/base.css';
import './dhaka.css';
import { gsap } from 'gsap';
import { loadInvitation } from '../../core/data.js';
import { bi, esc, dateOf, timeLabel, mapUrl, neNum, biNodes, bsDateOf } from '../../core/i18n.js';
import { mountShell } from '../../core/shell.js';
import { madeWith } from '../../core/madewith.js';
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
import { FLOWER_LIBRARY_SLUGS, flowerUrl } from './flowers.js';

const config = await loadInvitation();
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const reduced = reducedMotion();
const mobile = isMobile();
const used = new Set(FLOWER_LIBRARY_SLUGS);

// ?debug&slots=demo applies a sample studio override (tests the slot plumbing without touching config.js).
if (DEBUG && params.get('slots') === 'demo') {
  config.themeContent = { ...(config.themeContent || {}), dhaka: {
    images: { 'feature.photo': 'couple-7' },
    texts: { 'prog.title': { en: 'The days ahead', ne: 'आउँदा दिनहरू' }, 'feature.line': { en: 'With joy and gratitude', ne: 'हर्ष र कृतज्ञतासहित' } },
  } };
}
const { img: slotImg, txt, alt: slotAlt } = useSlots(manifest);
const has = (o) => Boolean(o && (String(o.en || '').trim() || String(o.ne || '').trim()));

// ───────────────────────── helpers ─────────────────────────
const slugOf = (ref) => (typeof ref === 'string' && !ref.startsWith('/') && !ref.startsWith('https://') ? ref : null);
const keyOf = (ref) => slugOf(ref) || photoUrl(ref, 'sm');
const pos = (ref) => { const [x, y] = (ref && typeof ref === 'object' && ref.focal) || view(ref).focal || [0.5, 0.5]; return `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`; };
const img = (ref, alt, sizes, eager = false) => {
  if (!ref) return '';
  const s = slugOf(ref);
  if (s) used.add(s);
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  return `<img src="${esc(sm)}" srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w" sizes="${sizes}" alt="${esc(alt || '')}" style="object-position:${pos(ref)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" />`;
};
const dims = Object.fromEntries(credits.filter((k) => k.width && k.height).map((k) => [k.slot, k.width / k.height]));
const ratioOf = (ref) => {
  const s = slugOf(ref);
  if (s && dims[s]) return dims[s];
  if (ref && typeof ref === 'object' && ref.w && ref.h) return ref.w / ref.h;
  return 3 / 4;
};
const firstGrapheme = (s) => {
  const str = String(s || '').trim();
  if (!str) return '';
  if (window.Intl?.Segmenter) return [...new Intl.Segmenter('ne', { granularity: 'grapheme' }).segment(str)][0].segment;
  return str[0];
};
const bsOf = (e) => {
  const d = bsDateOf(e.start, e.dateBS);
  return e.dateBS ? d : { en: `${d.short.en} B.S.`, ne: `वि.सं. ${d.short.ne}` };
};
// Leaves are tagged so every spray stacks them behind every bloom (see .fl--leaf in dhaka.css).
const flower = (name, cls = '', style = '') => `<img class="fl${name.startsWith('leaf') ? ' fl--leaf' : ''} ${cls}" src="${flowerUrl(name)}" alt="" aria-hidden="true" decoding="async" style="${style}" />`;

// ───────────────────────── data ─────────────────────────
const c = config.couple;
const B = c.bride;
const G = c.groom;
const events = guestEvents();
const portraits = (c.portraits || []).filter((p) => p?.photo);
const altFor = (ref, fallback) => portraits.find((p) => keyOf(p.photo) === keyOf(ref))?.alt || fallback || `${B.name.en} and ${G.name.en}`;
const usedPhotos = new Set();
const take = (id) => {
  const ref = slotImg(id);
  if (!ref || usedPhotos.has(keyOf(ref))) return null;
  usedPhotos.add(keyOf(ref));
  return { photo: ref, alt: altFor(ref, slotAlt(id)), r: ratioOf(ref) };
};
const welcomeP = take('welcome.photo');
const printP = take('print.photo');
const pairA = take('pair.a');
const pairB = take('pair.b');
const featureP = take('feature.photo');
const moreP = Object.keys(manifest.images).filter((id) => id.startsWith('more.')).map(take).filter(Boolean);
// Couples with few photos still get every treatment that has a photo; empty treatments are skipped.
const allPhotos = [welcomeP, printP, pairA, pairB, featureP, ...moreP].filter(Boolean);
const storyList = config.story || [];
const usLine = has(txt('us.line')) ? txt('us.line') : storyList[storyList.length - 1]?.text;
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
rootStyle.setProperty('--lining-weave', `url(${lining.url})`);
rootStyle.setProperty('--lining-size', `${lining.width}px ${lining.height}px`);
const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
rootStyle.setProperty('--paper-grain', svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .40  0 0 0 0 .32  0 0 0 0 .22  0 0 0 .12 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`));
rootStyle.setProperty('--paper-mottle', svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='700' height='700'><filter id='m'><feTurbulence type='fractalNoise' baseFrequency='.008' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .55  0 0 0 0 .45  0 0 0 0 .32  0 0 0 .14 0'/></filter><rect width='100%' height='100%' filter='url(#m)'/></svg>`));
if (liningRef) {
  rootStyle.setProperty('--lining-weave', `url("${encodeURI(photoUrl(liningRef, 'sm'))}")`);
  rootStyle.setProperty('--lining-size', 'cover');
  if (slugOf(liningRef)) used.add(slugOf(liningRef));
}

// ───────────────────────── the floral frame ─────────────────────────
// Each flower has a place in the welcome frame (x, y as fractions of the hero; w in units of the
// hero's shorter side) and a place on the table around the envelope (x, y, w in envelope widths).
const FRAME_WIDE = [
  // Top left: the main bouquet.
  ['leaf-twig', 0.14, 0.02, 0.46, 122], ['leaf-twig', 0.02, 0.3, 0.42, 205], ['leaf-single', 0.21, 0.13, 0.2, 30],
  ['rose-red-a', 0.065, 0.1, 0.38, -8], ['rose-pink-garden', 0.18, 0.04, 0.27, 12], ['marigold-orange', 0.015, 0.31, 0.22, 0],
  ['rose-white', 0.235, 0.2, 0.16, 20], ['rose-pink-close', 0.11, 0.3, 0.17, -12],
  // Top right and bottom left: light accents.
  ['leaf-twig', 0.95, 0.05, 0.34, 250], ['rose-pink', 0.96, 0.08, 0.22, -10], ['marigold-yellow', 0.88, 0.03, 0.15, 8],
  ['leaf-twig', 0.04, 0.95, 0.34, 70], ['rose-papa', 0.04, 0.92, 0.22, 6], ['marigold-orange', 0.12, 0.98, 0.14, 0],
  // Bottom right: the answering bouquet.
  ['leaf-twig', 0.86, 0.98, 0.46, 302], ['leaf-twig', 0.98, 0.7, 0.42, 25], ['rose-chateau', 0.935, 0.89, 0.38, 6],
  ['rose-red-b', 0.82, 0.95, 0.27, -10], ['marigold-yellow', 0.985, 0.69, 0.2, 4], ['rose-pink-close', 0.765, 0.84, 0.16, 12],
  ['rose-red-stem', 0.88, 0.74, 0.22, -40],
];
const FRAME_TALL = [
  ['leaf-twig', 0.3, 0.014, 0.430, 122], ['leaf-twig', 0.02, 0.091, 0.378, 205], ['leaf-single', 0.4, 0.042, 0.189, 30],
  ['rose-red-a', 0.12, 0.032, 0.378, -8], ['rose-pink-garden', 0.36, 0.014, 0.258, 12], ['marigold-orange', 0, 0.084, 0.224, 0],
  ['rose-white', 0.48, 0.052, 0.155, 20], ['rose-pink-close', 0.2, 0.077, 0.172, -12],
  ['leaf-twig', 0.98, 0.028, 0.310, 250], ['rose-pink', 0.96, 0.035, 0.224, -10], ['marigold-yellow', 0.82, 0.014, 0.146, 8],
  ['leaf-twig', 0.04, 0.979, 0.310, 70], ['rose-papa', 0.06, 0.972, 0.224, 6], ['marigold-orange', 0.22, 0.993, 0.138, 0],
  ['leaf-twig', 0.86, 1.03, 0.430, 302], ['leaf-twig', 1.03, 0.88, 0.378, 25], ['rose-chateau', 0.95, 0.985, 0.378, 6],
  ['rose-red-b', 0.76, 1.0, 0.258, -10], ['marigold-yellow', 1, 0.902, 0.206, 4], ['rose-pink-close', 0.62, 1.01, 0.155, 12],
  ['rose-red-stem', 0.98, 0.93, 0.206, -40],
];
// Table: a full bouquet at the envelope's upper left, another at its lower right, a few loose blooms.
const TABLE_WIDE = [
  [-0.4, -0.66, 0.44, 140], [-0.7, -0.28, 0.4, 200], [-0.28, -0.5, 0.18, 20], [-0.5, -0.5, 0.36, -14],
  [-0.3, -0.66, 0.26, 10], [-0.74, -0.56, 0.2, 0], [-0.16, -0.6, 0.15, 30], [-0.62, -0.3, 0.16, -8],
  [0.62, -0.6, 0.3, 240], [0.6, -0.56, 0.18, -10], [0.42, -0.66, 0.13, 6],
  [-0.66, 0.6, 0.3, 60], [-0.6, 0.5, 0.18, 6], [-0.44, 0.66, 0.12, 0],
  [0.44, 0.7, 0.44, 300], [0.76, 0.36, 0.4, 20], [0.54, 0.52, 0.36, 6], [0.34, 0.62, 0.26, -10],
  [0.76, 0.24, 0.18, 4], [0.2, 0.6, 0.15, 12], [0.66, 0.72, 0.22, -40],
];
const TABLE_TALL = [
  [-0.2, -0.95, 0.5, 140], [-0.5, -0.7, 0.44, 200], [-0.02, -0.78, 0.2, 20], [-0.3, -0.78, 0.42, -14],
  [0.0, -0.92, 0.28, 10], [-0.55, -0.95, 0.22, 0], [0.18, -0.8, 0.16, 30], [-0.4, -0.52, 0.18, -8],
  [0.5, -0.85, 0.32, 240], [0.42, -0.78, 0.22, -10], [0.28, -0.96, 0.14, 6],
  [-0.48, 0.86, 0.32, 60], [-0.4, 0.78, 0.22, 6], [-0.22, 0.92, 0.13, 0],
  [0.2, 1.0, 0.5, 300], [0.52, 0.66, 0.44, 20], [0.3, 0.8, 0.42, 6], [0.04, 0.86, 0.28, -10],
  [0.5, 0.56, 0.2, 4], [-0.06, 0.76, 0.16, 12], [0.44, 1.02, 0.26, -40],
];
const tall = () => window.innerHeight > window.innerWidth * 1.15;
const FRAME = tall() ? FRAME_TALL : FRAME_WIDE;
const frameFlowers = FRAME.map(([name, x, y, w, rot], i) =>
  flower(name, 'wf', `left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%;width:calc(var(--fu) * ${w});z-index:${name.startsWith('leaf') ? 1 : 2 + (i % 3)};--rot:${rot}deg`)).join('');

// ───────────────────────── markup ─────────────────────────
const wDate = config.weddingDate;
const amp = '<span class="amp" aria-hidden="true">&amp;</span>';
const wedding = events.find((e) => e.id === 'wedding') || events[0];

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
const sealSvg = (id) => `
  <svg class="seal__svg" viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <radialGradient id="wax${id}" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#C73A43"/><stop offset=".55" stop-color="#9B1D27"/><stop offset="1" stop-color="#6B1119"/></radialGradient>
      <filter id="waxShadow${id}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="2.6" flood-color="#40120f" flood-opacity=".42"/></filter>
    </defs>
    <path d="${sealPath}" fill="url(#wax${id})" filter="url(#waxShadow${id})"/>
    <circle cx="60" cy="60" r="38" fill="none" stroke="#6F1219" stroke-width="3.2" opacity=".55"/>
    <circle cx="60" cy="61.2" r="38" fill="none" stroke="#E07A7F" stroke-width="1" opacity=".45"/>
    <text x="60" y="71.6" text-anchor="middle" font-family="Eczar, serif" font-weight="700" font-size="29" fill="#E58489" opacity=".5">${esc(sealInitials)}</text>
    <text x="60" y="70.4" text-anchor="middle" font-family="Eczar, serif" font-weight="700" font-size="29" fill="#6E1119">${esc(sealInitials)}</text>
  </svg>`;

const gate = document.createElement('div');
gate.className = 'env-gate';
gate.id = 'gate';
gate.innerHTML = `
  <div class="env" id="env">
    <div class="env__back"><i class="env__lining" aria-hidden="true"></i></div>
    <div class="env__front">
      <svg class="env__folds" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 100 L50 52 L100 100" fill="none" stroke="rgba(90,70,45,.18)" stroke-width=".25" vector-effect="non-scaling-stroke"/></svg>
      <div class="env__text">
        <p class="env__kicker">${bi(txt('env.kicker'))}</p>
        <h1 class="env__names"><span class="sr-only">${esc(B.name.en)} and ${esc(G.name.en)}</span><span aria-hidden="true">${bi(B.name)} ${amp} ${bi(G.name)}</span></h1>
        <p class="env__line">${bi(txt('gate.line'))}</p>
      </div>
    </div>
    <div class="env__flap"><div class="env__flap-face env__flap-face--front"></div><div class="env__flap-face env__flap-face--back"><i class="env__lining" aria-hidden="true"></i></div></div>
    <i class="env__band env__band--l" aria-hidden="true"></i><i class="env__band env__band--r" aria-hidden="true"></i>
    <button type="button" class="seal" id="seal" aria-label="${esc(txt('gate.open').en)}">
      <span class="seal__half seal__half--l">${sealSvg('l')}</span><span class="seal__half seal__half--r">${sealSvg('r')}</span>
    </button>
  </div>
  <div class="env-gate__ctl">
    <p class="env-gate__tap">${bi(txt('gate.open'))}</p>
    <button type="button" class="link-quiet" id="open-quiet">${bi(txt('gate.quiet'))}</button>
  </div>`;
document.body.insertBefore(gate, document.getElementById('main'));

const swatches = (e) => (e.dress?.colors || []).map((col) => `<i style="background:${esc(col)}"></i>`).join('');
const ritualTime = (t) => (typeof t === 'string' ? { en: t, ne: neNum(t) } : t);
const programme = events.map((e) => `
  <article class="pg reveal" aria-labelledby="pg-${esc(e.id)}">
    <div class="pg__head">
      <h3 class="pg__name" id="pg-${esc(e.id)}">${bi(e.title)}</h3>
      ${has(e.dress?.text) || e.dress?.colors?.length ? `<p class="pg__dress">${e.dress?.colors?.length ? `<span class="pg__sw" aria-hidden="true">${swatches(e)}</span>` : ''}${has(e.dress?.text) ? bi(e.dress.text) : ''}</p>` : ''}
    </div>
    <dl class="pg__facts">
      <div><dt>${bi({ en: 'Day', ne: 'बार र मिति' })}</dt><dd>${bi(dateOf(e.start))}<span class="pg__bs">${bi(bsOf(e))}</span></dd></div>
      <div><dt>${bi({ en: 'Time', ne: 'समय' })}</dt><dd>${bi(timeLabel(e))}</dd></div>
      <div><dt>${bi({ en: 'Venue', ne: 'स्थान' })}</dt><dd>${bi(e.venue)}<a class="pg__map" href="${esc(mapUrl(e.mapQuery || e.venue.en))}" target="_blank" rel="noopener">${bi({ en: 'Open map', ne: 'नक्सा हेर्नुहोस्' })}<span aria-hidden="true"> ↗</span></a></dd></div>
    </dl>
    ${e.rituals?.length ? `<details class="pg__order"><summary>${bi({ en: 'Order of the day', ne: 'दिनभरको कार्यक्रम' })}</summary><ol>${e.rituals.map((r) => `<li><span>${bi(ritualTime(r.time))}</span>${bi(r.title)}</li>`).join('')}</ol></details>` : ''}
  </article>`).join('');

const family = (p, role, photo) => `
  <article class="fam__card reveal">
    ${photo ? `<figure class="fam__photo"><span class="mat"><span class="mat__photo" style="aspect-ratio:4/5">${img(photo, p.name.en, mobile ? '70vw' : '24vw')}</span></span></figure>` : ''}
    <p class="label">${bi(role)}</p>
    <h3 class="fam__name">${bi(p.fullName || p.name)}</h3>
    ${has(p.parents) ? `<p class="fam__parents">${bi(p.parents)}</p>` : ''}
    ${has(p.home) ? `<p class="fam__home">${bi(p.home)}</p>` : ''}
  </article>`;

const photoBtn = (p, cls, sizes) => {
  const idx = allPhotos.indexOf(p);
  return `<button type="button" class="ph ${cls}" data-idx="${idx}" aria-label="${esc(p.alt)}: enlarge"><span class="ph__img" style="aspect-ratio:${p.r.toFixed(4)}">${img(p.photo, p.alt, sizes)}</span></button>`;
};

// Loose prints in justified rows, each with a slight hand-placed tilt.
function looseRows() {
  const target = mobile ? 1.5 : 2.6;
  const rows = [];
  let cur = [];
  let sum = 0;
  moreP.forEach((p) => { cur.push(p); sum += p.r; if (sum >= target) { rows.push({ items: cur, sum }); cur = []; sum = 0; } });
  if (cur.length) rows.push({ items: cur, sum });
  const tilts = [-1.6, 1.2, -0.6, 1.8, -1.1, 0.8];
  let k = 0;
  return rows.map((row) => `
    <div class="loose__row" style="max-width:calc(${row.sum.toFixed(3)} * ${mobile ? 62 : 64}svh + ${(row.items.length - 1) * 40}px)">${row.items.map((p) => `
      <figure class="loose__item reveal" style="flex-grow:${p.r.toFixed(4)};--tilt:${tilts[k++ % tilts.length]}deg">${photoBtn(p, 'mat', mobile ? '46vw' : '32vw')}</figure>`).join('')}</div>`).join('');
}

const guestCols = [];
if (config.info?.stays?.length) guestCols.push(`
  <div class="guest__col reveal"><p class="label">${bi({ en: 'Where to stay', ne: 'बस्ने ठाउँ' })}</p>
    <ul>${config.info.stays.map((s) => `<li><b>${bi(s.name)}</b>${has(s.note) ? `<span>${bi(s.note)}</span>` : ''}<a href="${esc(mapUrl(s.mapQuery || s.name.en))}" target="_blank" rel="noopener">${bi({ en: 'Open map', ne: 'नक्सा हेर्नुहोस्' })} ↗</a></li>`).join('')}</ul></div>`);
if (has(config.info?.travel)) guestCols.push(`
  <div class="guest__col reveal"><p class="label">${bi({ en: 'Getting there', ne: 'आउने बाटो' })}</p><p class="guest__p">${bi(config.info.travel)}</p></div>`);
if (config.info?.contacts?.length) guestCols.push(`
  <div class="guest__col reveal"><p class="label">${bi({ en: 'Questions? Call the family', ne: 'केही सोध्नु छ? परिवारलाई फोन गर्नुहोस्' })}</p>
    <ul>${config.info.contacts.map((p) => {
      const tel = String(p.phone || '').replace(/[^\d+]/g, '');
      return `<li><b>${bi(p.name)}</b>${has(p.role) ? `<span>${bi(p.role)}</span>` : ''}${tel ? `<span class="guest__links"><a href="tel:${esc(tel)}">${bi({ en: 'Call', ne: 'फोन' })}</a><a href="https://wa.me/${esc(tel.replace('+', ''))}" target="_blank" rel="noopener">WhatsApp</a></span>` : ''}</li>`;
    }).join('')}</ul></div>`);

const main = document.getElementById('main');
main.innerHTML = `
<section class="welcome" id="welcome" aria-labelledby="welcome-names">
  <div class="welcome__flowers" aria-hidden="true">${frameFlowers}</div>
  <div class="welcome__inner">
    <p class="welcome__kicker w-in" lang="ne">${esc(txt('welcome.kicker').ne)}</p>
    ${welcomeP ? `<figure class="welcome__photo" id="welcome-photo"><span class="mat mat--welcome">${photoBtn(welcomeP, '', mobile ? '70vw' : '30vw').replace('loading="lazy"', 'fetchpriority="high"')}</span></figure>` : ''}
    <h1 class="welcome__names w-in" id="welcome-names">${bi(B.name)} ${amp} ${bi(G.name)}</h1>
    <p class="welcome__line w-in">${bi(txt('welcome.line'))}</p>
    <p class="welcome__date w-in">${bi(dateOf(wDate))}<span class="welcome__bs">${bi(config.weddingDateBS || bsDateOf(wDate))}</span></p>
    <p class="welcome__city w-in">${bi(has(config.city) ? config.city : wedding?.venue)}</p>
    <div class="welcome__actions w-in"><button type="button" class="btn-line" data-open-card>${bi(txt('card.button'))}</button></div>
  </div>
</section>

${printP || pairA || featureP || moreP.length ? `
<section class="sec us" aria-labelledby="us-title">
  <header class="sec__head reveal">
    <i class="sec__band" aria-hidden="true"></i>
    <h2 class="sec__title" id="us-title">${bi(txt('us.title'))}</h2>
  </header>
  ${printP ? `
  <div class="print-row">
    <figure class="print reveal">
      ${photoBtn(printP, 'mat mat--print', mobile ? '84vw' : '40vw')}
      ${flower('rose-red-a', 'print__rose')}${flower('leaf-twig', 'print__leaf')}
    </figure>
    ${has(usLine) ? `<p class="print-row__line reveal">${bi(usLine)}</p>` : ''}
  </div>` : ''}
  ${pairA && pairB ? `
  <figure class="pair reveal">
    <div class="pair__frame">
      ${photoBtn(pairA, 'pair__win', mobile ? '42vw' : '26vw')}
      ${photoBtn(pairB, 'pair__win', mobile ? '42vw' : '26vw')}
    </div>
    <i class="pair__band" aria-hidden="true"></i>
  </figure>` : pairA ? `<figure class="print print--solo reveal">${photoBtn(pairA, 'mat mat--print', mobile ? '84vw' : '40vw')}</figure>` : ''}
</section>` : ''}

${featureP ? `
<section class="feature" aria-label="${esc(featureP.alt)}">
  <div class="feature__blur" aria-hidden="true" style="background-image:url('${esc(encodeURI(photoUrl(featureP.photo, 'sm')))}')"></div>
  <div class="feature__flowers feature__flowers--l" aria-hidden="true">${flower('leaf-twig', 'ff ff1')}${flower('rose-chateau', 'ff ff2')}${flower('rose-pink-garden', 'ff ff3')}${flower('marigold-orange', 'ff ff4')}${flower('rose-white', 'ff ff5')}</div>
  <div class="feature__flowers feature__flowers--r" aria-hidden="true">${flower('leaf-twig', 'ff ff1')}${flower('rose-red-b', 'ff ff2')}${flower('rose-pink', 'ff ff3')}${flower('marigold-yellow', 'ff ff4')}${flower('rose-pink-close', 'ff ff5')}</div>
  <figure class="feature__photo reveal">${photoBtn(featureP, 'feature__btn', mobile ? '80vw' : '40vw')}</figure>
  ${has(txt('feature.line')) ? `<p class="feature__line reveal">${bi(txt('feature.line'))}</p>` : ''}
</section>` : ''}

${moreP.length ? `<section class="sec loose" aria-label="${esc(txt('us.title').en)}"><div class="loose__rows">${looseRows()}</div></section>` : ''}

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
    ${family(B, txt('fam.bride'), brideP)}
    ${family(G, txt('fam.groom'), groomP)}
  </div>
  ${has(config.hosts) ? `<p class="fam__hosts reveal">${bi(config.hosts)}</p>` : ''}
  <div class="fam__cta reveal"><button type="button" class="btn-line" data-open-card>${bi(txt('card.button'))}</button></div>
</section>

<section class="sec reply" id="rsvp" aria-labelledby="rsvp-title">
  <div class="reply__card reveal">
    <div class="reply__flowers" aria-hidden="true">${flower('leaf-twig', 'rf rf1')}${flower('rose-red-a', 'rf rf2')}${flower('rose-pink-garden', 'rf rf3')}${flower('marigold-orange', 'rf rf4')}</div>
    <i class="sec__band" aria-hidden="true"></i>
    <h2 class="sec__title" id="rsvp-title">${bi(txt('reply.title'))}</h2>
    ${has(config.rsvp?.deadline) ? `<p class="reply__deadline">${bi(config.rsvp.deadline)}</p>` : ''}
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

${guestCols.length ? `<section class="sec guest guest--${guestCols.length}" aria-labelledby="guest-title"><h2 class="sr-only" id="guest-title">${bi({ en: 'For our guests', ne: 'पाहुनाहरूका लागि' })}</h2>${guestCols.join('')}</section>` : ''}

<footer class="end">
  <div class="end__flowers" aria-hidden="true">${flower('leaf-twig', 'ef ef1')}${flower('rose-pink-garden', 'ef ef2')}${flower('rose-red-a', 'ef ef3')}${flower('marigold-orange', 'ef ef4')}${flower('rose-white', 'ef ef5')}${flower('rose-chateau', 'ef ef6')}${flower('leaf-twig', 'ef ef7')}</div>
  ${has(closingLine) ? `<p class="end__line">${bi(closingLine)}</p>` : ''}
  <p class="end__names" aria-hidden="true">${bi(B.name)} ${amp} ${bi(G.name)}</p>
  <div class="end__actions">
    <button class="btn-line" type="button" id="add-calendar">${bi({ en: 'Add to calendar', ne: 'क्यालेन्डरमा थप्नुहोस्' })}</button>
    <button class="btn-line" type="button" id="share">${bi({ en: 'Share the invitation', ne: 'निम्तो पठाउनुहोस्' })}</button>
  </div>
  ${c.hashtag ? `<p class="end__tag">${esc(c.hashtag)}</p>` : ''}
  ${madeWith()}
</footer>

<dialog class="letter" id="letter" aria-labelledby="letter-title" data-lenis-prevent>
  <form method="dialog" class="letter__close-f"><button class="letter__close" type="submit"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button></form>
  <i class="sec__band" aria-hidden="true"></i>
  <div class="letter__body">
    ${has(config.invitation?.shloka) ? `<p class="letter__shloka" lang="sa">${esc(config.invitation.shloka.sa || '')}</p><p class="letter__shloka-en l-en">${esc(config.invitation.shloka.en || '')}</p>` : ''}
    <h2 class="letter__title" id="letter-title" lang="ne">${esc(txt('welcome.kicker').ne)}</h2>
    ${has(config.invitation?.salutation) ? `<p class="letter__sal">${bi(config.invitation.salutation)}</p>` : ''}
    ${has(config.invitation?.body) ? `<p>${bi(config.invitation.body)}</p>` : ''}
    <p class="letter__when">${bi(dateOf(wDate))}<br />${bi(config.weddingDateBS || bsDateOf(wDate))}</p>
    ${has(config.invitation?.request) ? `<p>${bi(config.invitation.request)}</p>` : ''}
    <p class="letter__sign">${has(config.invitation?.signoff) ? `${bi(config.invitation.signoff)}<br />` : ''}<b>${bi(config.hosts)}</b></p>
  </div>
</dialog>

<dialog class="lb" id="lb" aria-label="Photo" data-lenis-prevent>
  <form method="dialog"><button class="lb__close" type="submit"><span aria-hidden="true">×</span><span class="sr-only">Close</span></button></form>
  <figure class="lb__fig"><figcaption></figcaption></figure>
  <button type="button" class="lb__nav lb__nav--prev" data-lb="-1"><span aria-hidden="true">←</span><span class="sr-only">Previous</span></button>
  <button type="button" class="lb__nav lb__nav--next" data-lb="1"><span aria-hidden="true">→</span><span class="sr-only">Next</span></button>
</dialog>`;

// ───────────────────────── behaviours ─────────────────────────
initRsvp(events);
startCountdown(document.getElementById('countdown'));
document.getElementById('add-calendar').addEventListener('click', () => downloadIcs(events));
document.getElementById('share').addEventListener('click', (e) => share(e.currentTarget));

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
    i = (k + allPhotos.length) % allPhotos.length;
    im.src = photoUrl(allPhotos[i].photo, 'lg');
    im.alt = allPhotos[i].alt || '';
    cap.textContent = `${i + 1} / ${allPhotos.length}`;
  };
  main.addEventListener('click', (e) => {
    const b = e.target.closest('button.ph[data-idx]');
    if (!b || Number(b.dataset.idx) < 0) return;
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

// Sections arrive quietly: prints settle onto the page, flowers bloom in beside them.
function initReveals() {
  const items = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  items.forEach((el) => io.observe(el));
}

// ───────────────────────── the opening (signature motion) ─────────────────────────
const welcome = document.getElementById('welcome');
const wflowers = [...welcome.querySelectorAll('.wf')];
const env = document.getElementById('env');
const photoFig = document.getElementById('welcome-photo');
let lenis = null;
let opened = false;
let card = null;
// GSAP owns every flower transform (centred on its point, turned to its frame angle).
const homeFlowers = () => wflowers.forEach((el, i) => gsap.set(el, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1, rotation: FRAME[i][4] }));
homeFlowers();

// Place every frame flower on the table around the envelope (as a transform from its frame spot).
function layTable() {
  const er = env.getBoundingClientRect();
  const ecx = er.left + er.width / 2;
  const ecy = er.top + er.height / 2;
  const T = tall() ? TABLE_TALL : TABLE_WIDE;
  homeFlowers();
  wflowers.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const t = T[i % T.length];
    const fw = el.offsetWidth || 1;
    gsap.set(el, { x: ecx + t[0] * er.width - (r.left + r.width / 2), y: ecy + t[1] * er.width - (r.top + r.height / 2), scale: (t[2] * er.width) / fw, rotation: t[3] });
  });
}

// The photo card that rides out of the envelope: a clone of the welcome photo, mapped into the envelope.
function makeCard() {
  if (!photoFig) return null;
  const target = photoFig.getBoundingClientRect();
  const er = env.getBoundingClientRect();
  const el = photoFig.firstElementChild.cloneNode(true);
  el.classList.add('env-card');
  el.removeAttribute('id');
  el.querySelectorAll('button').forEach((b) => { b.tabIndex = -1; b.removeAttribute('data-idx'); });
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, { left: `${target.left}px`, top: `${target.top}px`, width: `${target.width}px`, height: `${target.height}px` });
  env.insertBefore(el, env.querySelector('.env__front'));
  // Inside the envelope: centred, a little below the flap line, scaled to fit the pocket.
  const s = Math.min((er.height * 0.86) / target.height, (er.width * 0.8) / target.width);
  const inX = er.left + er.width / 2 - (target.left + target.width / 2);
  const inY = er.top + er.height * 0.52 - (target.top + target.height / 2);
  gsap.set(el, { x: inX, y: inY, scale: s, transformOrigin: '50% 50%' });
  return { el, s, inX, inY, er, target };
}

function prepareGate() {
  if (reduced) return;
  document.body.classList.add('is-opening');
  layTable();
  card = makeCard();
  gsap.set(welcome.querySelectorAll('.w-in'), { opacity: 0, y: 14 });
  if (photoFig) gsap.set(photoFig, { opacity: 0 });
  gsap.set(env.querySelector('.env__flap'), { rotationX: 0, transformPerspective: 1400 });
}

function finishOpen() {
  document.body.classList.remove('is-gated', 'is-opening');
  gate.remove();
  card?.el.remove();
  homeFlowers();
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
  const flap = env.querySelector('.env__flap');
  const rise = card ? -(card.target.height * card.s * 0.62) : 0;
  const tl = gsap.timeline({ onComplete: finishOpen });
  tl.to('.env-gate__ctl', { opacity: 0, duration: 0.3, ease: 'power1.out' }, 0)
    // The seal is pressed, then breaks in two.
    .to('#seal', { scale: 0.93, duration: 0.12, ease: 'power2.out' }, 0)
    .to('.seal__half--l', { x: -34, y: 70, rotation: -28, opacity: 0, duration: 0.7, ease: 'power2.in' }, 0.14)
    .to('.seal__half--r', { x: 34, y: 76, rotation: 24, opacity: 0, duration: 0.7, ease: 'power2.in' }, 0.14)
    // The Dhaka band falls away to both sides.
    .to('.env__band--l', { xPercent: -18, y: 26, rotation: -4, opacity: 0, duration: 0.7, ease: 'power2.in' }, 0.24)
    .to('.env__band--r', { xPercent: 18, y: 26, rotation: 4, opacity: 0, duration: 0.7, ease: 'power2.in' }, 0.24)
    // The flap opens on the Dhaka lining.
    .to(flap, { rotationX: 180, duration: 0.8, ease: 'power2.inOut' }, 0.5)
    .set(flap, { zIndex: 0 }, 0.92);
  if (card) {
    // The couple's photo rises out of the envelope…
    tl.to(card.el, { y: card.inY + rise, duration: 0.8, ease: 'power2.out' }, 1.0)
      // …the envelope drops away below it…
      .to('.env__back, .env__front, .env__flap', { y: () => window.innerHeight * 0.7, rotation: 3, opacity: 0, duration: 0.9, ease: 'power2.in' }, 1.6)
      // …and the photo travels to its place in the floral frame.
      .to(card.el, { x: 0, y: 0, scale: 1, duration: 1.15, ease: 'power3.inOut' }, 1.75)
      .set(photoFig, { opacity: 1 }, 2.9)
      .set(card.el, { opacity: 0 }, 2.92);
  } else {
    tl.to('.env__back, .env__front, .env__flap', { y: () => window.innerHeight * 0.7, opacity: 0, duration: 0.9, ease: 'power2.in' }, 1.2);
  }
  // The flowers on the table gather into the welcome frame, bouquet by bouquet.
  tl.to(wflowers, {
    x: 0, y: 0, scale: 1, rotation: (i) => FRAME[i][4], duration: 1.5, ease: 'power3.inOut',
    stagger: { each: 0.035, from: 'edges' },
  }, card ? 1.55 : 1.1)
    // The names and the date settle in under the photo.
    .to(welcome.querySelectorAll('.w-in'), { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out' }, card ? 2.55 : 2.1);
}

document.getElementById('seal').addEventListener('click', () => open(true));
document.getElementById('open-quiet').addEventListener('click', () => open(false));

// Lay out once fonts and the welcome photo are ready, so the card lands exactly on it.
await document.fonts.ready;
const wImg = photoFig?.querySelector('img');
if (wImg && !wImg.complete) await new Promise((r) => { wImg.addEventListener('load', r, { once: true }); wImg.addEventListener('error', r, { once: true }); setTimeout(r, 4000); });
// Flowers must have their real heights before they are laid on the table.
await Promise.all(wflowers.map((el) => (el.complete ? null : new Promise((r) => { el.addEventListener('load', r, { once: true }); el.addEventListener('error', r, { once: true }); setTimeout(r, 4000); }))));
homeFlowers();
prepareGate();
let lastW = window.innerWidth;
window.addEventListener('resize', () => {
  if (opened || window.innerWidth === lastW) return;
  lastW = window.innerWidth;
  card?.el.remove();
  layTable();
  card = makeCard();
});

// ───────────────────────── debug ─────────────────────────
if (DEBUG) {
  window.__dk = {
    enter: () => open(false),
    instant: () => { opened = true; player.start(false); gsap.set(welcome.querySelectorAll('.w-in'), { opacity: 1, y: 0 }); if (photoFig) gsap.set(photoFig, { opacity: 1 }); finishOpen(); },
    scrollTo: (y) => { lenis?.resize(); window.scrollTo(0, y); lenis?.scrollTo(y, { immediate: true, force: true }); },
  };
}
