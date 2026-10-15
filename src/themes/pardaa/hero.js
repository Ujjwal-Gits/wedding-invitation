// Pardaa's hero as a module (docs/MIX.md): the mandap between the tied-back velvet curtains under a marigold toran,
// the sacred fire alive, the names above it, as the first screen of any theme's page. Its entrance: petals fall, the
// glow rises, the mandap lifts into place, the curtains come in from the sides and the words follow.
import '../_suite/suite.css';
import '../_suite/nepali.css'; // before pardaa.css, so the theme's lamp sizes win ties (as on its own page)
import './pardaa.css';
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { initNepali } from '../_suite/nepali.js';
import { heroHtml, heroEnter, fitRoom, heroAmbient, heroScroll } from './parts.js';

export default {
  id: 'pardaa',
  suite: true,
  manifest,
  fonts: ['Playfair+Display:ital,wght@0,400;0,500;1,400', 'Eczar:wght@400;500;600', 'Mukta:wght@400;500;600'],
  mount(sec, ctx) {
    sec.innerHTML = heroHtml(ctx);
    initNepali(sec);
    // the room for the mandap lives on this section, not on <html> as on Pardaa's own page
    const unfit = fitRoom(sec, sec);
    const ins = [...sec.querySelectorAll('.su-in')];
    let calm = () => {};
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          tl.fromTo(ins, { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        heroEnter(tl, at, sec);
        const t = at + 0.7;
        gsap.set(ins, { opacity: 0 });
        ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * 0.14));
        return t + ins.length * 0.14;
      },
      after() {
        calm = heroAmbient(sec, ctx.reduced);
        if (!ctx.reduced) heroScroll(sec);
      },
      destroy() { unfit(); calm(); },
    };
  },
};
