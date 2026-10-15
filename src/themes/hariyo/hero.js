// Hariyo's hero as a module (docs/MIX.md): the white garden pavilion with the couple and two peacocks, the names in
// sage beside it, as the first screen of any theme's page. Its entrance: the pavilion rises into the garden, the
// corner greenery settles and the words follow; afterwards the scene breathes and a leaf drifts now and then.
import '../_suite/suite.css';
import './hariyo.css';
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { heroHtml, heroEnter, heroAmbient } from './parts.js';

export default {
  id: 'hariyo',
  suite: true,
  manifest,
  fonts: ['Bellefair', 'Corinthia', 'Gotu', 'Mukta:wght@400;500;600'],
  mount(sec, ctx) {
    sec.innerHTML = heroHtml(ctx);
    const ins = [...sec.querySelectorAll('.su-in')];
    let amb = null;
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          tl.fromTo(ins, { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        heroEnter(tl, at, sec);
        const t = at + 0.35;
        gsap.set(ins, { opacity: 0 });
        ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * 0.12));
        return t + ins.length * 0.12;
      },
      after() { amb = heroAmbient(sec, ctx.reduced); },
      destroy() { amb?.destroy(); },
    };
  },
};
