// Shree's gate as a module (docs/MIX.md). Shree's gate is the plum with a closed gold lotus in the middle, the
// invocation over it and the names under it; the lotus is the hero's own halo, lifted into the gate, so the gate
// travels as a pair with hero.js: Shree's opening scene (design.gate = design.hero = 'shree') on any theme's page.
// On tap the words lift away and the hero's entrance opens the lotus and carries it home behind Ganesh.
// With reduced motion it is the still gate: the plum and a closed lotus of its own, which fades with the gate (mix
// cross-fades the wrapper and does not call open()). mix-rules only offers it with Shree's first screen beneath.
import '../_suite/suite.css';
import './shree.css';
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { gateHtml, liftLotus } from './parts.js';

export default {
  id: 'shree',
  suite: true,
  pair: true, // the gate is its hero in a closed state: offered only together with Shree's first screen
  manifest,
  fonts: ['Forum', 'Monsieur+La+Doulaise', 'Mukta:wght@400;500;600', 'Sahitya:wght@400;700', 'Martel:wght@400;600'],
  mount(scene, ctx, root) {
    const { hero } = ctx; // its own first screen, beneath
    const live = !ctx.reduced;
    scene.innerHTML = gateHtml(ctx);
    root.classList.add(live ? 'sh-live' : 'sh-still');
    const spot = scene.querySelector('.sh-gate__spot');
    const place = () => { if (live) liftLotus(gsap, hero, spot); };
    place();
    document.fonts?.ready.then(place);
    addEventListener('resize', place);
    return {
      taps: [scene], // the lotus itself is a tap target too (the buttons stay the accessible way in)
      open(tl) {
        tl.to(scene.querySelectorAll('.sh-gate__txt'), { autoAlpha: 0, y: -8, duration: 0.5, ease: 'power2.out' }, 0);
        return 0; // the lotus breathes and opens 0.15 s later
      },
      destroy() { removeEventListener('resize', place); },
    };
  },
};
