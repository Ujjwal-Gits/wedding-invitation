// Shree's first screen as a module (docs/MIX.md): deep plum and antique gold, a gold Ganesh in the halo of a lotus
// between two hanging brass diyas, as the first screen of any theme's page. Its entrance is THE LOTUS OPENS: the
// petals unfold ring by ring, a gold light blooms, Ganesh rises out of the lotus and the diyas come down on their
// chains. With Shree's own gate (gate.js, its opening scene) the lotus starts large in the middle of the gate and
// glides home; after another theme's gate it opens where it rests, behind Ganesh.
import '../_suite/suite.css';
import '../_suite/nepali.css';
import './shree.css';
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { initNepali } from '../_suite/nepali.js';
import { heroHtml, heroClosed, heroEnter, isLifted } from './parts.js';

export default {
  id: 'shree',
  suite: true,
  manifest,
  fonts: ['Forum', 'Monsieur+La+Doulaise', 'Mukta:wght@400;500;600', 'Sahitya:wght@400;700', 'Martel:wght@400;600'],
  mount(sec, ctx) {
    sec.innerHTML = heroHtml(ctx, 'mxsh');
    initNepali(sec);
    if (!ctx.reduced) heroClosed(gsap, sec);
    const ins = [...sec.querySelectorAll('.su-in')];
    let io = null;
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          tl.fromTo(ins, { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        const lifted = isLifted(sec);
        const end = heroEnter(gsap, tl, at, sec);
        // in the opening scene the words wait for the lotus to settle; after another gate they come in as it opens
        const t = lifted ? end : at + 1.6;
        ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * 0.14));
        return t + ins.length * 0.14;
      },
      after() {
        if (ctx.reduced) return;
        // the halo turns and the diyas sway only while the first screen is on screen
        io = new IntersectionObserver(([e]) => sec.classList.toggle('sh-on', e.isIntersecting));
        io.observe(sec);
      },
      destroy() { io?.disconnect(); },
    };
  },
};
