// Sandesh's doves: a rigged painted dove (body + near wing + a darker far wing, cut from one Canva painting) and the
// signature flight. The pair flies one scroll-scrubbed path down the rooftop wall: at each postcard they swoop out
// past the edge, come back carrying it, set it down with a slight turn and settle on its top edge. Between deliveries
// they sit still. Transform and opacity only; one rAF loop that runs only while the wall is on screen.
export const ART = '/themes/sandesh/art/';

/** a flying dove: wings flap while the element has .is-flap (CSS), facing right */
export const flyer = (cls = '') => `<div class="sd-fly ${cls}" aria-hidden="true"><div class="sd-fly__in">
  <img class="sd-fly__far" src="${ART}dove-wing.webp" alt="" decoding="async" />
  <img class="sd-fly__body" src="${ART}dove-body.webp" alt="" decoding="async" />
  <img class="sd-fly__near" src="${ART}dove-wing.webp" alt="" decoding="async" />
</div></div>`;

/** the pair sitting side by side (feet on the bottom edge of the picture) */
export const perched = (cls = '', lazy = true) => `<img class="sd-perch ${cls}" src="${ART}doves-perched.webp" width="760" height="413" alt="" aria-hidden="true" decoding="async"${lazy ? ' loading="lazy"' : ''} />`;

// the flyer's feet, as fractions of its box (the carried card and the perch line hang from here)
const FEET = [0.4, 0.86];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => 1 - (1 - t) ** 3;
const smooth = (a, b, t) => { const k = clamp((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const bez = (a, b, c, d, t) => { const m = 1 - t; return m * m * m * a + 3 * m * m * t * b + 3 * m * t * t * c + t * t * t * d; };
const bezD = (a, b, c, d, t) => { const m = 1 - t; return 3 * m * m * (b - a) + 6 * m * t * (c - b) + 3 * t * t * (d - c); };

/**
 * The flight down the wall. `wall`: the positioned section that holds the posts and a `.sd-flight` layer with two
 * `.sd-fly` doves and one `.sd-perch` pair. `posts`: the cards in delivery order (each `[data-side="l|r"]`).
 */
export function createFlight(wall, posts, { reduced = false, scrollY = () => window.scrollY } = {}) {
  const layer = wall.querySelector('.sd-flight');
  const flyers = [...layer.querySelectorAll('.sd-fly')];
  const pair = layer.querySelector('.sd-perch');
  const ins = flyers.map((f) => f.querySelector('.sd-fly__in'));
  let W = 0; let VH = 0; let wallTop = 0; let dw = 100; let dh = 126; let pw = 150; let ph = 82;
  let stops = []; // [{ x, y, el, ox, oy, side }]: the perch on each post's top edge (wall coordinates)
  let wins = []; // [{ a, b }]: the scroll range in which post i is delivered
  let sm = null; let raf = 0; let live = false; let face = [1, 1]; let flap = null; let current = -2;

  const offsetIn = (el) => {
    let x = 0; let y = 0; let n = el;
    while (n && n !== wall) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y };
  };
  function measure() {
    W = wall.clientWidth; VH = window.innerHeight;
    const r = wall.getBoundingClientRect();
    wallTop = r.top + scrollY();
    dw = flyers[0]?.offsetWidth || 100; dh = flyers[0]?.offsetHeight || 126;
    pw = pair.offsetWidth || 150; ph = pair.offsetHeight || 82;
    stops = posts.map((el) => {
      const { x, y } = offsetIn(el);
      const w = el.offsetWidth;
      const side = el.dataset.side === 'r' ? 'r' : 'l';
      const px = x + w * (side === 'l' ? 0.72 : 0.28);
      el.style.transformOrigin = `${(px - x).toFixed(1)}px 0px`;
      return { el, x: px, y, ox: x, side };
    });
    // a post is delivered while its top edge climbs from just below the screen to 62% of the way down
    let prevEnd = -Infinity;
    wins = stops.map((s) => {
      const b = wallTop + s.y - VH * 0.62;
      let a = b - VH * 0.6;
      a = Math.max(a, prevEnd + VH * 0.04);
      const out = { a, b: Math.max(b, a + VH * 0.2) };
      prevEnd = out.b;
      return out;
    });
  }
  /** the path into post i: from the last perch (or down from the letter), out past the edge, in to the perch */
  function seg(i) {
    const B = stops[i];
    const A = i ? stops[i - 1] : { x: W * 0.5, y: -VH * 0.35 };
    const sign = B.x > W / 2 ? 1 : -1;
    const reach = W < 700 ? 0.95 : 0.7;
    return { A, B, c1: { x: A.x + sign * W * reach, y: A.y + VH * 0.08 }, c2: { x: B.x + sign * W * reach, y: B.y - VH * 0.3 } };
  }
  const placeFlyers = (x, y, vx, vy, alpha) => {
    if (Math.abs(vx) > 0.5) face = [vx < 0 ? -1 : 1, face[1]];
    const tilt = clamp(Math.atan2(vy, Math.abs(vx) + 1e-3) * 57.3 * 0.45, -24, 24);
    flyers.forEach((f, k) => {
      const lag = k ? [-0.62 * dw * face[0], -0.3 * dh] : [0, 0];
      const s = k ? 0.88 : 1;
      f.style.transform = `translate3d(${(x - FEET[0] * dw + lag[0]).toFixed(1)}px,${(y - FEET[1] * dh + lag[1]).toFixed(1)}px,0) scale(${s})`;
      f.style.opacity = alpha.toFixed(3);
      ins[k].style.transform = `scaleX(${face[0]}) rotate(${(tilt * face[0]).toFixed(2)}deg)`;
    });
  };
  const placePair = (p, alpha) => {
    pair.style.transform = p ? `translate3d(${(p.x - pw * 0.5).toFixed(1)}px,${(p.y - ph * 0.97).toFixed(1)}px,0)` : 'translate3d(-999px,0,0)';
    pair.style.opacity = alpha.toFixed(3);
  };
  const setFlap = (on) => { if (on !== flap) { flap = on; flyers.forEach((f) => f.classList.toggle('is-flap', on)); } };
  const rest = (el) => { el.style.transform = ''; el.style.opacity = ''; el.classList.remove('is-carried'); };

  function render(s) {
    // which window are we in? (-1 before the first, i.5 between i and i+1)
    let i = 0;
    while (i < wins.length && s >= wins[i].b) i++;
    // every post before i is in place; every post after i waits off the wall
    stops.forEach((st, k) => {
      if (k < i) { if (st.el.dataset.state !== 'set') { rest(st.el); st.el.dataset.state = 'set'; } } else if (k > i) {
        if (st.el.dataset.state !== 'away') { st.el.style.opacity = '0'; st.el.style.transform = 'translate3d(0,40px,0) scale(.4)'; st.el.dataset.state = 'away'; }
      }
    });
    if (i >= wins.length) { setFlap(false); placeFlyers(stops.at(-1).x, stops.at(-1).y, 0, 0, 0); placePair(stops.at(-1), 1); return; }
    const w = wins[i];
    const u = clamp((s - w.a) / (w.b - w.a), 0, 1);
    const { A, B, c1, c2 } = seg(i);
    const x = bez(A.x, c1.x, c2.x, B.x, u); const y = bez(A.y, c1.y, c2.y, B.y, u);
    const vx = bezD(A.x, c1.x, c2.x, B.x, u); const vy = bezD(A.y, c1.y, c2.y, B.y, u);
    const el = B.el;
    if (u <= 0) {
      // waiting: the pair sits on the last post (or nowhere yet, before the first)
      setFlap(false); placeFlyers(x, y, vx, vy, 0); placePair(i ? A : null, i ? 1 : 0);
      el.style.opacity = '0'; el.dataset.state = 'away';
      return;
    }
    const fly = smooth(0, 0.05, u) * (1 - smooth(0.95, 1, u));
    setFlap(u > 0.005 && u < 0.985);
    placeFlyers(x, y, vx, vy, fly);
    placePair(u < 0.5 ? (i ? A : null) : B, (1 - fly) * (u < 0.5 && !i ? 0 : 1));
    // the post: fetched from beyond the edge, carried under the doves, then set down
    el.dataset.state = 'carried';
    el.classList.add('is-carried');
    const seen = smooth(0.36, 0.5, u);
    const k = ease(clamp((u - 0.8) / 0.2, 0, 1));
    const sc = 0.36 + (1 - 0.36) * k;
    const hang = 14 * (1 - k);
    el.style.opacity = seen.toFixed(3);
    el.style.transform = `translate3d(${(x - B.x).toFixed(1)}px,${(y - B.y + hang).toFixed(1)}px,0) rotate(${(-7 * (1 - k)).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
    current = i;
  }
  function tick() {
    raf = 0;
    if (!live) return;
    const t = scrollY();
    if (sm === null || Math.abs(t - sm) > VH * 1.5) sm = t; // a jump (a link, the studio) lands at once
    else sm += (t - sm) * 0.14;
    render(sm);
    if (Math.abs(t - sm) > 0.4 || flap) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (live && !raf) raf = requestAnimationFrame(tick); };

  function still() {
    // reduced motion: every post in place, the pair on the first one, no flight
    posts.forEach(rest);
    flyers.forEach((f) => { f.style.opacity = '0'; });
    placePair(stops[0], 1);
  }
  measure();
  if (reduced || !posts.length) { if (posts.length) still(); else placePair(null, 0); }
  else {
    sm = scrollY(); render(sm);
    new IntersectionObserver(([e]) => { live = e.isIntersecting; if (live) kick(); else setFlap(false); }, { rootMargin: '20% 0px' }).observe(wall);
    window.addEventListener('scroll', kick, { passive: true });
  }
  let rw = window.innerWidth; let rt = 0;
  const remeasure = () => { clearTimeout(rt); rt = setTimeout(() => { measure(); if (reduced) still(); else { sm = scrollY(); render(sm); } }, 120); };
  window.addEventListener('resize', () => { if (window.innerWidth !== rw || Math.abs(window.innerHeight - VH) > 120) { rw = window.innerWidth; remeasure(); } });
  new ResizeObserver(remeasure).observe(wall);
  return { measure: remeasure, get current() { return current; }, at: (s) => { sm = s; render(s); } };
}
