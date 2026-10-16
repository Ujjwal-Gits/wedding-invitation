// Dhoka's pieces for other themes' pages (docs/MIX.md): the printed door plate as a gate, and the first plate (names,
// date, the couple's photo) as a first screen. Markup builders take the ctx mix gives a part (ctx.S = Dhoka's slots).
// On Dhoka's own page the door opens in WebGL (door.js); here it is a light 2D/CSS version that needs no canvas.
import { dateOf } from '../../core/i18n.js';
import { photos } from '../../photos.js';

const keyOf = (ref) => (typeof ref === 'string' && !ref.startsWith('/') && !ref.startsWith('http') ? ref : null);
const pct = (v) => `${(v * 100).toFixed(3)}%`;

/** The measured opening of a library door photo ({ x, y, w, h } as fractions, from the top left), or null. */
export function doorRectOf(ref) {
  return (keyOf(ref) && photos[keyOf(ref)]?.door) || (ref && typeof ref === 'object' && ref.door) || null;
}

/** The two leaves and the opening behind them, laid over the plate at the measured door. */
function doorLeaves(rect, doorUrl, courtUrl, esc) {
  const { x, y, w, h } = rect;
  const half = w / 2;
  const bgSize = `${pct(1 / half)} ${pct(1 / h)}`;
  const bgY = pct(y / (1 - h));
  const leaf = (side, left) => `<i class="dhg__leaf dhg__leaf--${side}" style="left:${pct(left)};top:${pct(y)};width:${pct(half)};height:${pct(h)};`
    + `background-image:url(&quot;${esc(doorUrl)}&quot;);background-size:${bgSize};background-position:${pct(left / (1 - half))} ${bgY}"><b></b></i>`;
  return `<span class="dhg__hole" style="left:${pct(x)};top:${pct(y)};width:${pct(w)};height:${pct(h)}">${courtUrl ? `<img class="dhg__court" src="${esc(courtUrl)}" alt="" decoding="async" />` : ''}<b></b></span>`
    + leaf('l', x) + leaf('r', x + half);
}

/** The gate: names on the left, the door plate in the middle, the date and the way in on the right (stacked on phones). */
export function gateScene(ctx) {
  const { c, S, txt, bi, esc, photoUrl, config } = ctx;
  const doorRef = S.img('gate.door');
  const courtRef = S.img('gate.courtyard');
  const rect = doorRectOf(doorRef);
  const doorUrl = photoUrl(doorRef, 'sm');
  const { x = 0.5, y = 0.5, w = 0, h = 0 } = rect || {};
  return `
    <div class="dhg">
      <div class="dhg__side dhg__side--l">
        <p class="dhg__ganesh">${bi(txt('gate.invocation'))}</p>
        <p class="dhg__names">${bi(c.bride.name)}<span class="dhg__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span>${bi(c.groom.name)}</p>
        <p class="dhg__line">${bi(txt('gate.line'))}</p>
      </div>
      <figure class="dhg__plate">
        <span class="dhg__door" style="perspective-origin:${pct(x + w / 2)} ${pct(y + h / 2)};transform-origin:${pct(x + w / 2)} ${pct(y + h / 2)}">
          <img class="dhg__img" src="${esc(doorUrl)}" alt="${esc(S.alt('gate.door'))}" decoding="async" />
          ${rect ? doorLeaves(rect, doorUrl, courtRef ? photoUrl(courtRef, 'sm') : '', esc) : ''}
        </span>
        <figcaption>${bi(txt('gate.caption'))}</figcaption>
      </figure>
      <div class="dhg__side dhg__side--r">
        <p class="dhg__date">${bi(dateOf(config.weddingDate))}<small>${bi(config.city)}</small></p>
        <div class="dhg__act" data-mx-ui>
          <button class="dhg__btn" data-mx-open type="button" disabled>${bi(txt('gate.open'))}</button>
          <button class="dhg__quiet" data-mx-quiet type="button" disabled>${bi(txt('gate.quiet'))}</button>
        </div>
      </div>
    </div>`;
}

/**
 * The gate's own exit, from 0 on `tl`: the words leave, the two leaves swing inward onto the courtyard, warm light
 * spills out and the guest walks up to the opening until it fills the screen. Returns when the neutral fade starts.
 */
export function gateExit(tl, root) {
  const q = (s) => root.querySelector(s);
  tl.to(root.querySelectorAll('.dhg__side, .dhg__plate figcaption'), { autoAlpha: 0, duration: 0.5, ease: 'power2.out' }, 0);
  const door = q('.dhg__door');
  const hole = q('.dhg__hole');
  if (!door) return 0.6;
  if (!hole) {
    // a photo without a measured opening: the plate comes a step closer and fades
    tl.to(door, { scale: 1.12, duration: 1.4, ease: 'power2.in' }, 0.2);
    return 1.0;
  }
  const [L, R] = [q('.dhg__leaf--l'), q('.dhg__leaf--r')];
  tl.to(L, { rotationY: 96, duration: 2.1, ease: 'power2.inOut' }, 0.3)
    .to(R, { rotationY: -96, duration: 2.1, ease: 'power2.inOut' }, 0.3)
    .to(root.querySelectorAll('.dhg__leaf b'), { opacity: 0.55, duration: 1.6, ease: 'power1.in' }, 0.4)
    .fromTo(hole.querySelector('b'), { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'power1.out' }, 0.5);
  // the walk: the opening comes to the middle of the screen and grows until it fills it (measured now: the plate
  // does not move before this point, and the leaves turn inside it)
  const r = hole.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const s = Math.min(14, Math.max(vw / Math.max(1, r.width), vh / Math.max(1, r.height)) * 1.08);
  tl.to(door, { x: vw / 2 - (r.left + r.width / 2), y: vh / 2 - (r.top + r.height / 2), scale: s, duration: 1.5, ease: 'power2.in' }, 1.55);
  return 2.75;
}

/** The first plate: the names, the date (A.D., B.S. and city) and the couple's first photo, uncropped. */
export function heroScene(ctx) {
  const { c, S, txt, bi, esc, photoUrl, config } = ctx;
  const ref = S.img('hero.photo');
  const alt = (c.portraits || []).find((p) => p?.photo === ref)?.alt || S.alt('hero.photo') || `${c.bride.name.en} and ${c.groom.name.en}`;
  const sm = ref ? photoUrl(ref, 'sm') : '';
  const lg = ref ? photoUrl(ref, 'lg') : '';
  const set = sm && lg && sm !== lg ? ` srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w" sizes="(max-width: 760px) 92vw, 50vw"` : '';
  return `
    <div class="dhh">
      <div class="dhh__text">
        <p class="dhh__folio"><span class="dhh__rule" aria-hidden="true"></span><span class="dhh__label">${bi(txt('hero.kicker'))}</span></p>
        <h1 class="dhh__names">
          <span class="dhh__one">${bi(c.bride.name)}</span>
          <span class="dhh__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span>
          <span class="dhh__two">${bi(c.groom.name)}</span>
        </h1>
        <p class="dhh__date">${bi(dateOf(config.weddingDate))}<small>${bi(config.weddingDateBS)} · ${bi(config.city)}</small></p>
      </div>
      ${ref ? `<figure class="dhh__plate"><img class="dhh__img" src="${esc(sm || lg)}"${set} alt="${esc(alt)}" decoding="async" /></figure>` : ''}
    </div>`;
}
