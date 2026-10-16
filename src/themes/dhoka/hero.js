// Dhoka's first screen as a module (docs/MIX.md): the first plate of the printed book (names, date and the couple's
// photo at its own proportions) on any theme's page. Its entrance: the photo settles, then the words, line by line.
// After it: the names drift up a little slower than the photo as the guest scrolls.
import './mix.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import manifest from './slots.js';
import { heroScene } from './parts.js';
import { FONTS } from './fonts.js';

gsap.registerPlugin(ScrollTrigger);

export default {
  id: 'dhoka',
  manifest,
  fonts: FONTS,
  mount(sec, ctx) {
    sec.innerHTML = heroScene(ctx);
    const text = sec.querySelector('.dhh__text');
    const lines = [...sec.querySelectorAll('.dhh__text > *')];
    const plate = sec.querySelector('.dhh__plate');
    // closed until the entrance (the gate covers it, but nothing may show through a see-through exit)
    gsap.set([...lines, plate].filter(Boolean), { autoAlpha: 0 });
    let st = null;
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          tl.to([...lines, plate].filter(Boolean), { autoAlpha: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        if (plate) tl.fromTo(plate, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out' }, at);
        tl.fromTo(lines, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09, ease: 'expo.out' }, at + 0.25);
        return at + 0.25 + lines.length * 0.09 + 0.4;
      },
      after() {
        if (ctx.reduced || !text) return;
        st = gsap.to(text, { y: () => -window.innerHeight * 0.08, ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom top', scrub: true } });
      },
      destroy() { st?.scrollTrigger?.kill(); st?.kill(); },
    };
  },
};
