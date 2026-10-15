// Janti's hero as a module (docs/MIX.md): the carved Newari window on a painted street, Ganesh in its torana, the
// names behind the red doli curtain, as the first screen of any theme's page. Its entrance: the Naumati Baja
// procession walks in, the marigold toran swings, the curtain rolls up over the names. (Janti's own dusk wash is its
// gate; another gate can open onto this hero.)
import '../_suite/suite.css';
import '../_suite/nepali.css';
import './janti.css';
import './mix.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import manifest from './slots.js';
import { initNepali } from '../_suite/nepali.js';
import { heroHtml, heroPrepare, heroEnter, heroScroll } from './parts.js';

gsap.registerPlugin(ScrollTrigger);

export default {
  id: 'janti',
  suite: true,
  manifest,
  fonts: ['Yeseva+One', 'Sura:wght@400;700', 'Mukta:wght@400;500;600'],
  mount(sec, ctx) {
    sec.innerHTML = heroHtml(ctx);
    initNepali(sec);
    heroPrepare(ctx, sec);
    const ins = [...sec.querySelectorAll('.su-in')];
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          tl.fromTo(ins, { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        const t = heroEnter(tl, at, sec);
        gsap.set(ins, { opacity: 0 });
        ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * 0.14));
        return t + ins.length * 0.14;
      },
      after() { if (!ctx.reduced) heroScroll(sec, sec); },
    };
  },
};
