// Mehendi's hero as a module (docs/MIX.md): the henna card with the joined hands at its top edge, Ganesh, the names
// and the date, over a slowly turning mandala watermark, as the first screen of any theme's page. Its entrance: the
// hands glide down from the top edge, the corners ink in, Ganesh appears and the words follow.
import '../_suite/suite.css';
import './mehendi.css';
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { heroHtml, heroEnter, heroScroll, heroAmbient } from './parts.js';

export default {
  id: 'mehendi',
  suite: true,
  manifest,
  fonts: ['Allura', 'Marcellus', 'Marcellus+SC', 'Tillana:wght@400;500;600', 'Mukta:wght@400;500;600'],
  mount(sec, ctx) {
    sec.innerHTML = heroHtml(ctx);
    const ins = [...sec.querySelectorAll('.su-in')];
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          tl.fromTo(ins, { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        heroEnter(tl, at, sec);
        const t = at + 0.55;
        gsap.set(ins, { opacity: 0 });
        ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * 0.12));
        return t + ins.length * 0.12;
      },
      after() {
        heroAmbient(sec, ctx.reduced);
        if (!ctx.reduced) heroScroll(sec);
      },
    };
  },
};
