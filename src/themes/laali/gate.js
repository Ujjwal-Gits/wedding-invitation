// Laali's gate as a module (docs/MIX.md): the closed blush card with Ganesh in a small gold arch, on any theme's page.
// Its own exit: the names and title lift away, the arch swells and fades, Ganesh rises and fades, the blush paper
// thins; then the mix's neutral fade reveals the page beneath. (On Laali's own page Ganesh flies into the hero's
// crown instead; that hand-off needs Laali's hero, so it is not part of the module.)
import '../_suite/suite.css';
import './laali.css';
import './mix.css';
import manifest from './slots.js';
import { initNepali } from '../_suite/nepali.js';
import { gateScene, gateExit } from './parts.js';

export default {
  id: 'laali',
  suite: true,
  manifest,
  fonts: ['Alex+Brush', 'Gilda+Display', 'Kurale', 'Mukta:wght@400;500;600'],
  mount(scene, ctx, root) {
    scene.innerHTML = gateScene(ctx);
    initNepali(scene);
    const imgs = [...scene.querySelectorAll('img')];
    return {
      ready: Promise.all(imgs.map((im) => im.decode?.().catch(() => {}))),
      // the card itself is a tap target too (the buttons stay the accessible way in)
      taps: [scene.querySelector('.la-seal')].filter(Boolean),
      open(tl) {
        gateExit(tl, root);
        const gan = scene.querySelector('.la-gan--gate');
        if (gan) tl.to(gan, { y: -28, scale: 0.86, autoAlpha: 0, duration: 1, ease: 'power2.inOut' }, 0.1);
        return 0.95;
      },
    };
  },
};
