// Rangoli's first screen as a module (docs/MIX.md): a Newari courtyard on the wedding morning, seen first from low
// down across the herringbone bricks (Ganesh at the shrine under a marigold toran, only the rangoli's rim laid), as
// the first screen of any theme's page. Its entrance is the camera tilting down until it looks straight at the floor
// while the rangoli's rings turn into place and the centre diyo catches; then the names appear in the eave's shade.
// (Rangoli's own gate, शुभ विवाह over the low view, is gate.js: together they are Rangoli's opening scene.)
import '../_suite/suite.css';
import '../_suite/nepali.css';
import './rangoli.css';
import './mix.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import manifest from './slots.js';
import { initNepali } from '../_suite/nepali.js';
import { heroHtml, heroEnter, ringScroll } from './parts.js';

gsap.registerPlugin(ScrollTrigger);

export default {
  id: 'rangoli',
  suite: true,
  manifest,
  fonts: ['DM+Serif+Display', 'Karma:wght@500;600', 'Mukta:wght@400;500;600'],
  mount(sec, ctx) {
    sec.innerHTML = `<div class="rg-hero">${heroHtml(ctx)}</div>`;
    initNepali(sec);
    const hero = sec.querySelector('.rg-hero');
    if (!ctx.reduced) hero.classList.add('rg-closed'); // the low view, only the rim laid (rangoli.css)
    const ins = [...hero.querySelectorAll('.su-in')];
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          tl.fromTo(ins, { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        hero.classList.add('rg-moving');
        // every closed piece gets its starting state from the tweens below, so the class can go now
        const t = heroEnter(tl, at, hero);
        gsap.set(ins, { opacity: 0 });
        hero.classList.remove('rg-closed');
        ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * 0.14));
        return t + ins.length * 0.14;
      },
      after() {
        // landed: the floor lies flat for good, a plain picture again (no 3D layer kept alive)
        hero.classList.remove('rg-moving', 'rg-closed');
        hero.classList.add('rg-landed');
        gsap.set(hero, { '--k': 0 });
        gsap.set(hero.querySelectorAll('.rg-ring, .rg-wick, .rg-halo'), { clearProps: 'opacity,scale' });
        if (!ctx.reduced) ringScroll(gsap, hero, sec);
      },
    };
  },
};
