// "What your guests see" on the international page: ONE phone, its screen changing step by step through a guest's
// journey (the features page's orbit, grown up). Loaded by src/site/intl.js only when the visitor allows motion.
//  - wide screens: the scene is pinned; scrolling moves through the steps. Each new step tilts the phone a little in
//    3D toward its caption and eases it back to flat, while the screen cross-fades and the caption slides in beside it
//    (left and right in turn). A thin progress line and dots show the step; a dot scrolls to its step.
//  - phones: no pinning. One phone above a swipe row of captions; the snapped caption sets the screen.
// Transform and opacity only. The page's markup is the still state (every step with its own small phone).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const navH = () => document.querySelector('.nav')?.offsetHeight || 64;

export function initJourney() {
  const box = document.querySelector('[data-scene="journey"] .journey');
  if (!box) return;
  const steps = [...box.querySelectorAll('.journey__step')];
  const scrs = [...box.querySelectorAll('.journey__scr')];
  const dots = [...box.querySelectorAll('.journey__dot')];
  const nav = box.querySelector('.journey__nav');
  const bar = box.querySelector('.journey__bar i');
  const float = box.querySelector('.journey__float');
  const list = box.querySelector('.journey__steps');
  const n = steps.length;
  let cur = 0;
  let pinned = false;

  /* The screens are solid layers. At any moment at most TWO show: `base` (solid, underneath) and the one sliding in
     over it. One step index drives everything; a change kills what is running, snaps the arriving screen in as the
     new base and hides every other screen at once, so a fast fling jumps straight to the latest step. */
  let base = 0;
  const off = (s) => gsap.set(s, { autoAlpha: 0, zIndex: 0, yPercent: 0 });
  const screenTo = (i, instant) => {
    gsap.killTweensOf(scrs);
    const out = base; // the screen that was showing, or arriving: it becomes the solid floor
    const dir = i > out ? 1 : -1;
    scrs.forEach((s, k) => { if (k !== i && k !== out) off(s); });
    base = i;
    if (instant || i === out) {
      if (i !== out) off(scrs[out]);
      gsap.set(scrs[i], { autoAlpha: 1, zIndex: 1, yPercent: 0 });
      return;
    }
    gsap.set(scrs[out], { autoAlpha: 1, zIndex: 1, yPercent: 0 });
    gsap.to(scrs[out], { yPercent: -12 * dir, duration: 0.6, ease: 'power3.inOut' });
    gsap.fromTo(scrs[i], { autoAlpha: 1, zIndex: 2, yPercent: 100 * dir }, {
      yPercent: 0, duration: 0.6, ease: 'power3.inOut',
      onComplete: () => { off(scrs[out]); gsap.set(scrs[i], { zIndex: 1 }); },
    });
  };

  /** step i arrives: its screen slides over the last one, the phone tilts toward its caption and settles flat; on wide
   *  screens only that step's caption shows */
  const show = (i, instant = false) => {
    if (i === cur && !instant) return;
    cur = i;
    dots.forEach((d, k) => (k === i ? d.setAttribute('aria-current', 'step') : d.removeAttribute('aria-current')));
    screenTo(i, instant);
    const side = i % 2 ? 1 : -1; // captions alternate: left (even steps), right (odd steps)
    if (!instant) gsap.fromTo(float, { rotationY: side * -14, rotationX: 6, scale: 0.97 }, { rotationY: 0, rotationX: 0, scale: 1, duration: 1, ease: 'power3.out', overwrite: true });
    if (pinned) {
      gsap.killTweensOf(steps);
      steps.forEach((s, k) => { if (k !== i) gsap.set(s, { autoAlpha: 0, x: 0 }); });
      if (instant) gsap.set(steps[i], { autoAlpha: 1, x: 0 });
      else gsap.fromTo(steps[i], { autoAlpha: 0, x: side * 32 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'power3.out' });
    }
  };

  const mm = gsap.matchMedia();
  mm.add({ wide: '(min-width: 1024px)', narrow: '(max-width: 1023px)' }, (ctx) => {
    nav.hidden = false;
    if (ctx.conditions.wide) {
      pinned = true;
      box.classList.add('is-pin');
      gsap.set(steps, { yPercent: -50 });
      show(0, true);
      const st = ScrollTrigger.create({
        trigger: box, start: () => `top ${navH()}px`, end: () => `+=${Math.round(window.innerHeight * 0.5 * n)}`,
        pin: true, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: -1, // measured after the scenes above it
        onUpdate: (self) => {
          show(Math.min(n - 1, Math.floor(self.progress * n)));
          gsap.set(bar, { scaleX: self.progress });
        },
      });
      const go = (e) => {
        const i = Number(e.currentTarget.dataset.i);
        window.scrollTo({ top: st.start + ((i + 0.5) / n) * (st.end - st.start), behavior: 'smooth' });
      };
      dots.forEach((d) => d.addEventListener('click', go));
      return () => {
        pinned = false;
        dots.forEach((d) => d.removeEventListener('click', go));
        box.classList.remove('is-pin');
        gsap.set([...steps, ...scrs, float, bar], { clearProps: 'all' });
      };
    }
    // phones: a swipe row of captions under one phone, no pinning
    box.classList.add('is-swipe');
    show(0, true);
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        const i = Number(e.target.dataset.i);
        show(i);
        gsap.set(bar, { scaleX: (i + 1) / n });
      }
    }, { root: list, threshold: 0.6 });
    steps.forEach((s) => io.observe(s));
    const go = (e) => {
      const s = steps[Number(e.currentTarget.dataset.i)];
      list.scrollTo({ left: s.offsetLeft - (list.clientWidth - s.offsetWidth) / 2, behavior: 'smooth' });
    };
    dots.forEach((d) => d.addEventListener('click', go));
    return () => {
      io.disconnect();
      dots.forEach((d) => d.removeEventListener('click', go));
      box.classList.remove('is-swipe');
      gsap.set([...scrs, float, bar], { clearProps: 'all' });
    };
  });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
