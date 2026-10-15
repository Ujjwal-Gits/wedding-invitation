// Swayambar's hero as a module (docs/MIX.md): ivory silk, the jaimala, the bride and groom raising their garlands to
// each other, the groom's name on his side and the bride's on hers, as the first screen of any theme's page. Its
// entrance: the two garlands come down into place, the Ganesh medallion settles and the words follow.
import '../_suite/suite.css';
import './swayambar.css';
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { heroHtml, heroEnter, heroScroll } from './parts.js';

export default {
  id: 'swayambar',
  suite: true,
  manifest,
  fonts: ['Pinyon+Script', 'Prata', 'Halant:wght@400;500;600', 'Mukta:wght@400;500;600'],
  mount(sec, ctx) {
    sec.innerHTML = heroHtml(ctx);
    const ins = [...sec.querySelectorAll('.su-in')];
    return {
      enter(tl, at) {
        heroEnter(tl, at, sec, ctx.reduced);
        if (ctx.reduced) {
          tl.fromTo(ins, { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        const t = at + 0.6;
        gsap.set(ins, { opacity: 0 });
        ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * 0.14));
        return t + ins.length * 0.14;
      },
      after() { if (!ctx.reduced) heroScroll(sec); },
    };
  },
};
