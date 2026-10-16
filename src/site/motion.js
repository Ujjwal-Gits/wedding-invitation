// The website's scroll scenes (GSAP + ScrollTrigger), loaded only when the page has [data-scene] and the visitor
// allows motion. Transform and opacity only; scrubbed, so they follow the finger or wheel exactly. Phones get shorter
// scenes and no horizontal pin. The pages' CSS is the finished state, so without this file nothing is hidden.
//  - hero: the copy lifts away, the side phones part, and we go INTO the centre phone's invitation (zoom-through)
//  - lotus: THE LOTUS OPENS (after the Shree design's कार्यक्रम): a circle of light, petals unfold ring by ring,
//    then the flower rises to crown the heading
//  - rail: the designs slide past while the section holds still (wide screens)
//  - orbit: the features gather round one phone (wide screens)
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const navH = () => $('.nav')?.offsetHeight || 64;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const r2 = (n) => Math.round(n * 1000) / 1000;

/** A pinned scene without moving the DOM: the section grows by `dist` and its inner box sticks under the header
 *  (ScrollTrigger's pin would wrap the section in a spacer and repaint the hero image, a second LCP). */
function stick(sec, pin, dist) {
  const size = () => { sec.style.height = `${pin.offsetHeight + dist()}px`; };
  sec.classList.add('is-stuck');
  size();
  ScrollTrigger.addEventListener('refreshInit', size);
  return () => { ScrollTrigger.removeEventListener('refreshInit', size); sec.classList.remove('is-stuck'); sec.style.height = ''; };
}

function hero(mm) {
  const sec = $('[data-scene="hero"]');
  if (!sec) return;
  const pin = $('.hero__pin', sec);
  const stage = $('.hero__stage', sec);
  const c = $('.hero__ph--c', sec);
  const img = $('#hero-img');
  // where the centre phone must travel to sit in the middle, and how big it must grow for its screen to fill the view
  const rise = () => pin.clientHeight / 2 - (stage.offsetTop + c.offsetHeight / 2);
  // grow until the phone's screen fills the window HEIGHT (about 2x), never stretched past what the sharp still can show
  const fill = () => Math.min((pin.clientHeight * 0.96) / c.offsetHeight, (window.innerWidth * 0.92) / c.offsetWidth);
  let sharp = false;
  mm.add({ wide: '(min-width: 700px)', narrow: '(max-width: 699px)' }, (ctx) => {
    const { wide } = ctx.conditions;
    const dist = () => window.innerHeight * (wide ? 1.0 : 0.7);
    const unstick = stick(sec, pin, dist);
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: sec, start: () => `top ${navH()}px`, end: () => `+=${dist()}`,
        scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: (self) => {
          // the zoom needs the big still: ask for it the first time the scene moves
          if (!sharp && self.progress > 0.02 && img) { sharp = true; img.sizes = `${Math.round(c.offsetWidth * fill())}px`; }
        },
      },
    });
    tl.to('.hero__copy', { y: -70, autoAlpha: 0, duration: 0.26, ease: 'power1.in' }, 0)
      .to(stage, { y: rise, duration: 0.5, ease: 'power2.inOut' }, 0.02)
      .to('.hero__ph--l2', { x: () => -window.innerWidth * 0.4, rotation: -20, duration: 0.42, ease: 'power2.in' }, 0.08)
      .to('.hero__ph--r2', { x: () => window.innerWidth * 0.4, rotation: 20, duration: 0.42, ease: 'power2.in' }, 0.08)
      .to('.hero__ph--l1', { x: () => -window.innerWidth * (wide ? 0.42 : 0.6), rotation: -12, duration: 0.46, ease: 'power2.in' }, 0.18)
      .to('.hero__ph--r1', { x: () => window.innerWidth * (wide ? 0.42 : 0.6), rotation: 12, duration: 0.46, ease: 'power2.in' }, 0.18)
      .to(c, { scale: fill, duration: 0.56, ease: 'power2.inOut' }, 0.44);
    return unstick;
  });
}

function lotus(mm) {
  const sec = $('[data-scene="lotus"]');
  if (!sec) return;
  const pin = $('.lotus__pin', sec);
  const slot = $('.lotus__slot', sec);
  const flower = $('.lotus__flower', sec);
  const svg = $('.lo', sec);
  const rings = $$('.lo-ring', svg);
  const pets = rings.map((g) => $$('.lo-p', g));
  const pod = $('.lo-pod', svg);
  const k = () => parseFloat(getComputedStyle(pin).getPropertyValue('--k')) || 0.3;
  // closed: each petal folded over its base, each ring turned and a little larger
  const CLOSED = [{ sx: 0.7, sy: -0.68 }, { sx: 0.72, sy: -0.6 }, { sx: 0.76, sy: -0.5 }];
  const STARTS = [0, 0.22, 0.42];
  const ease = gsap.parseEase('power3.out');
  const draw = (p) => {
    pets.forEach((ring, ri) => {
      const C = CLOSED[ri];
      const n = ring.length;
      const local = clamp01((p - STARTS[ri]) / 0.58);
      const rot = (ri % 2 ? 14 : -14) * (1 - ease(local));
      const sc = 1 + 0.22 * (1 - ease(local));
      rings[ri].setAttribute('transform', `rotate(${r2(rot)}) scale(${r2(sc)})`);
      ring.forEach((pet, i) => {
        const e = ease(clamp01((local - (i / n) * 0.3) / 0.7));
        pet.setAttribute('transform', `scale(${r2(C.sx + (1 - C.sx) * e)} ${r2(C.sy + (1 - C.sy) * e)})`);
      });
    });
    const ps = 0.6 + 0.4 * ease(clamp01((p - 0.55) / 0.45));
    pod.setAttribute('transform', `scale(${r2(ps)})`);
  };
  const fromY = () => pin.clientHeight / 2 - (slot.offsetTop + slot.offsetHeight / 2);
  // at the top of a page (Occasions): the lotus opens by itself in its place, and the heading never waits
  if (sec.hasAttribute('data-play')) {
    const petals = { p: 0 };
    gsap.timeline({ delay: 0.15 })
      .fromTo('.lotus__disc', { scale: 0.1 }, { scale: 1, duration: 1.4, ease: 'power2.out' }, 0)
      .fromTo(flower, { rotation: -36, scale: () => k() * 0.9 }, { rotation: 0, scale: k, duration: 2.6, ease: 'power2.out' }, 0)
      .fromTo(petals, { p: 0 }, { p: 1, duration: 2.4, ease: 'none', onUpdate: () => draw(petals.p) }, 0.1)
      .fromTo('.lo-frame', { autoAlpha: 0, scale: 0.9, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, 1.6);
    return;
  }
  mm.add({ wide: '(min-width: 700px)', narrow: '(max-width: 699px)' }, (ctx) => {
    const { wide } = ctx.conditions;
    const petals = { p: 0 };
    const dist = () => window.innerHeight * (wide ? 1.15 : 0.8);
    const unstick = stick(sec, pin, dist);
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: sec, start: () => `top ${navH()}px`, end: () => `+=${dist()}`, scrub: 0.7, invalidateOnRefresh: true },
    });
    tl.fromTo('.lotus__disc', { scale: 0.5 }, { scale: 1, duration: 0.24, ease: 'power2.out' }, 0)
      .fromTo(flower, { y: fromY, scale: 1, rotation: -36 }, { y: fromY, scale: 1, rotation: -36, duration: 0.01 }, 0)
      .fromTo(petals, { p: 0 }, { p: 1, duration: 0.52, onUpdate: () => draw(petals.p) }, 0.08)
      .to(flower, { rotation: 0, duration: 0.52, ease: 'power1.out' }, 0.08)
      .fromTo('.lo-frame', { autoAlpha: 0, scale: 0.9, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.14, ease: 'power2.out' }, 0.44)
      .to(flower, { y: 0, scale: k, duration: 0.24, ease: 'power2.inOut' }, 0.62)
      .fromTo('.lotus__text', { y: 32, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.22, ease: 'power2.out' }, 0.66)
      .to({}, { duration: 0.06 });
    return () => { draw(1); unstick(); }; // leaving this media query: back to the open, still lotus
  });
}

function rail(mm) {
  const sec = $('[data-scene="rail"]');
  if (!sec) return;
  const view = $('.rail__view', sec);
  const track = $('.rail__track', sec);
  // size the cards so the heading AND the whole cards fit on screen before the row starts moving sideways
  const head = $('.rail__head', sec);
  const fit = () => {
    const cs = getComputedStyle(sec);
    const avail = window.innerHeight - navH() - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      - head.offsetHeight - parseFloat(getComputedStyle(head).marginBottom) - 84; // 84 = name + price under each card
    sec.style.setProperty('--rail-w', `${Math.round(Math.max(150, Math.min(236, avail / 1.6)))}px`);
  };
  mm.add('(min-width: 1024px)', () => {
    sec.classList.add('js-rail');
    fit();
    ScrollTrigger.addEventListener('refreshInit', fit);
    const dist = () => Math.max(0, track.scrollWidth - (view.clientWidth - 2 * parseFloat(getComputedStyle(view).paddingLeft)));
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: sec, start: () => `top ${navH()}px`, end: () => `+=${dist()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    return () => { ScrollTrigger.removeEventListener('refreshInit', fit); sec.classList.remove('js-rail'); sec.style.removeProperty('--rail-w'); };
  });
}

function orbit(mm) {
  const sec = $('[data-scene="orbit"]');
  if (!sec) return;
  mm.add('(min-width: 1100px)', () => {
    const items = $$('.orbit__item', sec);
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' }, scrollTrigger: { trigger: sec, start: () => `top ${navH()}px`, end: () => `+=${window.innerHeight * 1.2}`, pin: true, scrub: 0.6, anticipatePin: 1 } });
    tl.fromTo('.orbit__phone', { scale: 1.08, y: 24 }, { scale: 1, y: 0, duration: 0.3 }, 0); // small: the phone fills the height
    items.forEach((it, i) => tl.fromTo(it, { autoAlpha: 0, x: i < 3 ? 60 : -60, y: 20 }, { autoAlpha: 1, x: 0, y: 0, duration: 0.18 }, 0.22 + i * 0.1));
    tl.to({}, { duration: 0.1 });
  });
}

export function initScenes() {
  const mm = gsap.matchMedia();
  hero(mm);
  lotus(mm);
  rail(mm);
  orbit(mm);
  // fonts and late images change heights: measure again
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}
