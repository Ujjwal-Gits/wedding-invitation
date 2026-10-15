// Sindoor's pieces, shared by its own page (main.js) and by its hero and gate modules (hero.js, gate.js), which can
// run on another theme's page (docs/MIX.md): the sindoor dani (one picture cut into lid and base), the cover (the
// hero: masthead, names, the box between the side columns) and the opening of the box. The red thread that runs
// through the story belongs to Sindoor's own page and stays in main.js.

export const ART = '/themes/sindoor/art/';
export const r2 = (n) => Math.round(n * 100) / 100;
const HL = {
  issue: { en: 'The wedding issue', ne: 'विवाह विशेषाङ्क' },
  and: { en: 'and', ne: 'र' },
};

// ───────── the sindoor dani: one picture, cut along the lid's rim into lid and base ─────────
// The rim is an arc (49.7% of the height at the sides, 52.2% in the middle); the base reaches 0.4% higher so no
// seam shows while the box is closed (the lid sits in front of it).
const RIM = Array.from({ length: 17 }, (_, i) => { const x = i / 16; return [x * 100, (0.497 + 0.025 * (1 - ((x - 0.5) / 0.5) ** 2)) * 100]; });
const pc = ([x, y], dy = 0) => `${r2(x)}% ${r2(y + dy)}%`;
const LID_CLIP = `polygon(0% 0%, 100% 0%, ${[...RIM].reverse().map((p) => pc(p)).join(', ')})`;
const BASE_CLIP = `polygon(${RIM.map((p) => pc(p, -0.4)).join(', ')}, 100% 100%, 0% 100%)`;
/** where the lid rests on the cover once the box is open (relative to its own size) */
export const LID_UP = { xPercent: 6, yPercent: -30, rotation: -9 };
const BOX = (sizes, clip) => `<img src="${ART}box-sm.webp" srcset="${ART}box-sm.webp 440w, ${ART}box.webp 1027w" sizes="${sizes}" style="clip-path:${clip}" alt="" decoding="async" fetchpriority="high" />`;

/** the still life; `thread` adds the mark the red thread starts from (Sindoor's own page only) */
function still(ctx, thread) {
  const sizes = '(max-width: 859px) 46vw, 300px';
  return `<div class="sd-still">
    <div class="sd-box" role="img" aria-label="${ctx.esc('A red and gold sindoor box, its lid lifted, sindoor rising from it')}">
      <img class="sd-plume" src="${ART}burst-sm.webp" srcset="${ART}burst-sm.webp 585w, ${ART}burst.webp 1366w" sizes="(max-width: 859px) 60vw, 380px" alt="" decoding="async" />
      <span class="sd-base">${BOX(sizes, BASE_CLIP)}</span>
      <span class="sd-lid"><span class="sd-lid__f">${BOX(sizes, LID_CLIP)}</span></span>
      <img class="sd-bloom sd-bloom--a" src="${ART}bloom-sm.webp" alt="" decoding="async" />
      <img class="sd-bloom sd-bloom--b" src="${ART}bloom-sm.webp" alt="" decoding="async" />
      <img class="sd-bloom sd-bloom--c" src="${ART}bloom-sm.webp" srcset="${ART}bloom-sm.webp 585w, ${ART}bloom.webp 1366w" sizes="(max-width: 859px) 70vw, 440px" alt="" decoding="async" />
    </div>
    ${thread ? '<i class="sd-k sd-k--start" data-x=".5" data-xm=".5" aria-hidden="true"></i>' : ''}
  </div>`;
}

/** a heading that rises out of a mask */
export const mask = (html, cls = '') => `<span class="sd-m ${cls}"><span class="sd-m__in">${html}</span></span>`;

// ───────── the cover (hero) ─────────
export function heroHtml(ctx, { thread = true } = {}) {
  const { bi, esc, c, AD, BS, txt, on, placeLine, mainEv } = ctx;
  const invo = txt('hero.invocation');
  const title = txt('hero.title');
  const line = txt('hero.line');
  const bsShort = BS.day && BS.month ? `${BS.month} ${BS.day} गते, ${BS.year}` : BS.full.ne;
  const timeNe = mainEv ? String(ctx.timeLabel(mainEv).ne || '').split('–')[0].trim() : '';
  const mm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', month: '2-digit' }).format(new Date(mainEv?.start || ctx.config.weddingDate));
  const dots = `${AD.day.padStart(2, '0')} · ${mm} · ${AD.year}`;
  return `<div class="sd-cover">
    <div class="sd-cover__top">
      ${ctx.ganesh('sd-gan', '64px')}
      ${on(invo) ? `<p class="sd-invo" lang="sa">${esc(invo.ne || invo.en)}</p>` : ''}
    </div>
    <div class="sd-cover__mast su-in">
      <span>${on(title) ? bi(title) : bi(HL.issue)}</span>
      <span class="sd-cover__dots">${bi({ en: dots, ne: ctx.neNum(dots) })}</span>
    </div>
    <i class="sd-cover__rule" aria-hidden="true"></i>
    <h1 class="sd-cover__names" data-fit>
      ${mask(bi(c.bride.name), 'sd-cover__n')}
      ${mask(`<span class="sd-cover__and">${bi(HL.and)}</span>`, 'sd-cover__amp')}<span class="sr-only">and</span>
      ${mask(bi(c.groom.name), 'sd-cover__n sd-cover__n--b')}
    </h1>
    <div class="sd-cover__body">
      <div class="sd-cover__side sd-cover__side--l su-in">
        ${on(line) ? `<p class="sd-cover__line">${bi(line)}</p>` : ''}
      </div>
      ${still(ctx, thread)}
      <div class="sd-cover__side sd-cover__side--r su-in">
        <p class="sd-cover__when">${bi({ en: `${AD.wd.en}, ${AD.day} ${AD.month.en} ${AD.year}`, ne: bsShort })}</p>
        <p class="sd-cover__alt"><span class="l-en" lang="ne">${esc(bsShort)}</span><span class="l-ne">${esc(AD.full.ne)}</span></p>
        ${mainEv ? `<p class="sd-cover__alt">${bi({ en: AD.time, ne: timeNe })}</p>` : ''}
        ${placeLine?.en || placeLine?.ne ? `<p class="sd-cover__where">${bi(placeLine)}</p>` : ''}
      </div>
    </div>
  </div>`;
}

/** fit the names to their measure (long names shrink, short ones stay big) */
export function fitAll(root = document) {
  root.querySelectorAll('[data-fit]').forEach((el) => {
    el.style.removeProperty('--fit');
    const kids = [...el.querySelectorAll('.sd-m, :scope > span')];
    const over = Math.max(1, ...kids.map((k) => (k.scrollWidth || 0) / (el.clientWidth || 1)), el.scrollWidth / (el.clientWidth || 1));
    if (over > 1.001) el.style.setProperty('--fit', String(r2(1 / over - 0.01)));
  });
}

/** keep the gate's words where the names will appear */
export function placeUi(root, ui) {
  const names = root?.querySelector('.sd-cover__names');
  if (!ui || !names) return;
  const r = names.getBoundingClientRect();
  ui.style.top = `${Math.round(r.top + r.height / 2)}px`;
}

/** the cover waits closed: the lid down, no plume, the names under their masks, the rule undrawn, the words out */
export function heroClosed(gsap, root) {
  const q = (s) => root.querySelectorAll(s);
  gsap.set(q('.sd-cover .sd-lid'), { x: 0, y: 0, xPercent: 0, yPercent: 0, rotation: 0 });
  gsap.set(q('.sd-cover .sd-plume'), { opacity: 0 });
  gsap.set(q('.sd-cover__names .sd-m__in'), { yPercent: 112 });
  gsap.set(q('.sd-cover__rule'), { scaleX: 0 });
  gsap.set(q('.sd-cover .su-in'), { opacity: 0 });
}

/** The box opens from `at`: the lid lifts and tilts away, a plume of sindoor rises and blooms across the screen, and
 *  as the powder clears the rule draws and the names rise in red. Returns when the words may settle in.
 *  (Sindoor's own opening calls it at 0.15.) */
export function heroEnter(tl, at, root) {
  const q = (s) => root.querySelector(s);
  const d = at - 0.15;
  const lid = q('.sd-cover .sd-lid');
  const plume = q('.sd-cover .sd-plume');
  const [ba, bb, bc] = root.querySelectorAll('.sd-cover .sd-bloom');
  // the lid: a small press, then up and away
  tl.to(lid, { yPercent: 1.4, duration: 0.16, ease: 'power2.in' }, d + 0.22)
    .to(lid, { ...LID_UP, duration: 1.6, ease: 'expo.out' }, d + 0.38);
  // the plume that stays: it rises out of the box behind the lid
  tl.fromTo(plume, { scale: 0.16, yPercent: 26, opacity: 0 }, { scale: 1, yPercent: 0, opacity: 1, duration: 1.7, ease: 'power3.out' }, d + 0.46);
  // the bloom: three clouds of powder, each larger, billow over the page and clear
  const bloom = (el, t, s, peak, hold, flip = 1, rot = 0) => {
    tl.fromTo(el, { scaleX: 0.22 * flip, scaleY: 0.22, yPercent: 18, rotation: -rot, opacity: 0 },
      { scaleX: s * flip, scaleY: s, yPercent: -26, rotation: rot, duration: 2.3, ease: 'power2.out' }, t);
    tl.to(el, { opacity: peak, duration: 0.42, ease: 'power1.out' }, t);
    tl.to(el, { opacity: 0, duration: 1.0, ease: 'power1.inOut' }, t + hold);
  };
  bloom(ba, d + 0.5, 2.5, 0.92, 0.75, 1, 5);
  bloom(bb, d + 0.62, 3.3, 0.88, 0.8, -1, -7);
  bloom(bc, d + 0.78, 4.4, 0.8, 0.82, 1, 3);
  // the masthead: the rule draws, the names rise out of their masks in red
  tl.fromTo(q('.sd-cover__rule'), { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'expo.inOut' }, d + 1.35);
  tl.fromTo(root.querySelectorAll('.sd-cover__names .sd-m__in'), { yPercent: 112 }, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.13 }, d + 1.6);
  return d + 1.95;
}

/** as the cover scrolls away, the lid drifts off it and the plume thins (`trigger`: the cover's section) */
export function heroScroll(gsap, root, trigger) {
  const away = { trigger, start: 'top top', end: 'bottom top', scrub: 0.6 };
  gsap.to(root.querySelector('.sd-cover .sd-lid'), { xPercent: LID_UP.xPercent + 10, yPercent: LID_UP.yPercent - 40, rotation: LID_UP.rotation - 12, ease: 'none', scrollTrigger: away });
  gsap.to(root.querySelector('.sd-cover .sd-plume'), { scale: 1.35, yPercent: -14, opacity: 0.15, ease: 'none', scrollTrigger: away });
}
