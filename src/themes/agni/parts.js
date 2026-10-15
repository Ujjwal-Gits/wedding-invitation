// Agni's pieces, shared by its own page (main.js) and by its hero and gate modules (hero.js, gate.js), which can run
// on another theme's page (docs/MIX.md): the brass havan kunda with its live fire, the hero (the names over the
// fire) and the lighting of the fire. The pinned seven rounds belong to Agni's own page and stay in main.js.
import { flame } from '../_suite/nepali.js';

export const A = '/themes/agni/art/';
const rnd = (a, b) => a + Math.random() * (b - a);

// where the fire sits on the logs of kunda.webp (fractions of the picture), each flame's height as a fraction of
// the picture's width, its lean and how much wider than a candle flame it is
const FIRE = [
  [0.432, 0.352, 0.2, -14, 1.3],
  [0.458, 0.322, 0.31, -8, 1.25],
  [0.487, 0.3, 0.44, -3, 1.35],
  [0.515, 0.284, 0.53, 1, 1.4],
  [0.545, 0.3, 0.43, 5, 1.35],
  [0.574, 0.326, 0.3, 10, 1.25],
  [0.6, 0.356, 0.19, 15, 1.3],
  [0.508, 0.338, 0.33, -1, 1.7],
];
export const KUNDA_AR = 1013 / 1400;

/** the brass havan kunda with a live fire on its logs */
export function kunda(cls = '', sizes = '300px', { alt = '', eager = false, embers = 12 } = {}) {
  // embers: start spread over the logs, drift and rise (units are % of the kunda's width, via cqw)
  const em = Array.from({ length: embers }, () => `<i style="--x:${rnd(-7, 7).toFixed(1)};--dx:${rnd(-14, 14).toFixed(1)};--h:${rnd(38, 78).toFixed(0)};--d:${rnd(2.6, 4.8).toFixed(2)}s;--dl:-${rnd(0, 4.8).toFixed(2)}s;--s:${rnd(0.6, 1.3).toFixed(2)}"></i>`).join('');
  return `<div class="ag-kunda ${cls}">
    <i class="ag-kunda__glow" aria-hidden="true"></i>
    <img class="ag-kunda__img" src="${A}kunda-sm.webp" srcset="${A}kunda-sm.webp 600w, ${A}kunda.webp 1400w" sizes="${sizes}" alt="${alt}"${alt ? '' : ' aria-hidden="true"'} decoding="async"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} />
    <i class="ag-kunda__cast" aria-hidden="true"></i>
    <span class="ag-fire" aria-hidden="true">${FIRE.map(([x, y, k, r, sx]) => `<span class="ag-w" style="left:${(x * 100).toFixed(1)}%;top:${(y * 100).toFixed(1)}%"><span class="ag-w__v" style="--k:${k};transform:rotate(${r}deg) scaleX(${sx})">${flame()}</span></span>`).join('')}</span>
    <i class="ag-fire__core" aria-hidden="true"></i>
    <span class="ag-embers" aria-hidden="true">${em}</span>
  </div>`;
}

/** the hero: Ganesh, the title and the names over the kunda; the line and the date under the names */
export function heroHtml(ctx) {
  const { bi, esc, txt, on, AD, BS } = ctx;
  const inv = txt('hero.invocation');
  return `
    <div class="ag-hero">
      <div class="ag-hero__warm" aria-hidden="true"></div>
      <div class="ag-hero__top">
        ${ctx.ganeshRef ? `<div class="ag-gan">${ctx.ganesh('ag-gan__img', '(max-width: 700px) 84px, 110px')}</div>` : ''}
        ${on(inv) ? `<p class="ag-inv su-in" lang="ne">${esc(inv.ne || inv.en)}</p>` : ''}
        <p class="ag-title ag-dim" lang="ne">${esc(txt('hero.title').ne || 'शुभ विवाह')}</p>
      </div>
      <h1 class="su-names ag-names ag-dim">${ctx.names('&amp;')}</h1>
      <div class="ag-hearth">${kunda('ag-kunda--hero', '(max-width: 700px) 92vw, 560px', { alt: 'A brass havan kunda on marigolds and mango leaves, its sacred fire burning', eager: true, embers: 14 })}</div>
      <div class="ag-hero__after">
        ${on(txt('hero.line')) ? `<p class="ag-line su-in">${bi(txt('hero.line'))}</p>` : ''}
        <p class="ag-hdate su-in">${bi({ en: `${AD.wd.en} · ${AD.day} ${AD.month.en} ${AD.year}`, ne: BS.day && BS.month && BS.year ? `${AD.wd.ne} · ${BS.month} ${BS.day}, ${BS.year}` : (BS.full.ne || AD.full.ne) })}</p>
      </div>
    </div>`;
}

/** the kunda takes whatever room the words leave; its fire rises about a third of its width above the picture.
 *  `into` gets the --ag-kw size (Agni's own page: <html>; a module: its section). */
export function fitKunda(root, into) {
  const hearth = root.querySelector('.ag-hearth');
  if (!hearth) return;
  const w = Math.min(hearth.clientWidth * 0.96, hearth.clientHeight / (KUNDA_AR + 0.34), 600);
  into.style.setProperty('--ag-kw', `${Math.max(150, Math.round(w))}px`);
}

/** the gate's words sit where the hero's line and date will appear, over the dark */
export function placeUi(root, ui) {
  const after = root?.querySelector('.ag-hero__after');
  if (!after || !ui) return;
  const r = after.getBoundingClientRect();
  const top = Math.min(r.top, innerHeight - ui.offsetHeight - 16);
  ui.style.top = `${Math.max(16, Math.round(top))}px`;
  ui.style.bottom = 'auto';
}

/** one ember drops from where the guest tapped (`from`, a rect) into the logs of the hero's fire */
export function sparkDrop(tl, spark, from, root) {
  const fire = root?.querySelector('.ag-kunda--hero .ag-fire');
  if (!spark || !fire) return;
  const fr = fire.getBoundingClientRect();
  const fx = fr.left + fr.width * 0.515; const fy = fr.top + fr.height * 0.31;
  tl.set(spark, { x: from.left + from.width / 2, y: from.top + from.height / 2, opacity: 0, scale: 0.6 }, 0.1)
    .to(spark, { opacity: 1, scale: 1, duration: 0.18, ease: 'power1.out' }, 0.12)
    .to(spark, { x: fx, duration: 0.7, ease: 'sine.inOut' }, 0.22)
    .to(spark, { y: fy, duration: 0.7, ease: 'power2.in' }, 0.22)
    .to(spark, { opacity: 0, scale: 2.2, duration: 0.25, ease: 'power1.out' }, 0.9);
}

/** The fire catches from `at`: the flames spring up off the logs from the middle outward, the glow floods out, the
 *  night warms, then the light reaches Ganesh and the names. Returns when the words may settle in. (Agni's own
 *  opening calls it at 0.88, as the ember lands.) */
export function heroEnter(tl, at, root) {
  const q = (s) => root.querySelector(s);
  const ws = [...root.querySelectorAll('.ag-kunda--hero .ag-w')];
  const d = at - 0.88;
  const order = [3, 7, 2, 4, 1, 5, 0, 6];
  tl.fromTo(order.map((i) => ws[i]).filter(Boolean), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.75, ease: 'back.out(2.2)', stagger: 0.07 }, d + 0.88);
  tl.fromTo(q('.ag-kunda--hero .ag-fire__core'), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, d + 0.9);
  // the glow floods outward and the night warms
  tl.fromTo(q('.ag-kunda--hero .ag-kunda__glow'), { opacity: 0, scale: 0.25 }, { opacity: 1, scale: 1, duration: 1.5, ease: 'power3.out' }, d + 0.95);
  tl.fromTo(q('.ag-hero__warm'), { opacity: 0, scale: 0.55 }, { opacity: 1, scale: 1, duration: 1.9, ease: 'power2.out' }, d + 1.0);
  tl.fromTo(q('.ag-kunda--hero .ag-kunda__img'), { opacity: 0.2 }, { opacity: 1, duration: 1.2, ease: 'power2.out' }, d + 1.0);
  tl.fromTo(q('.ag-kunda--hero .ag-kunda__cast'), { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' }, d + 1.05);
  tl.call(() => q('.ag-kunda--hero .ag-embers')?.classList.add('is-live'), null, d + 1.0);
  // the light reaches Ganesh, then the names
  const gan = q('.ag-hero .ag-gan');
  if (gan) tl.fromTo(gan, { opacity: 0.3 }, { opacity: 1, duration: 1.3, ease: 'power2.out' }, d + 1.25);
  tl.fromTo(root.querySelectorAll('.ag-hero .ag-dim'), { opacity: 0.5 }, { opacity: 1, duration: 1.1, ease: 'power2.out', stagger: 0.12 }, d + 1.35);
  return d + 1.75;
}
