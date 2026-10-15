// Hariyo's gate as a module (docs/MIX.md): a watercolour garden grown in from every corner and edge around an ivory
// arch that holds Ganesh, शुभ विवाह and the names, on any theme's page. Its own exit: the arch fades, the leaves part
// outward at their own speeds, a few drift down, the paper clears; then the mix's neutral fade reveals the page.
import '../_suite/suite.css';
import './hariyo.css';
import './mix.css';
import manifest from './slots.js';
import { gateScene, gateExit } from './parts.js';

export default {
  id: 'hariyo',
  suite: true,
  manifest,
  fonts: ['Bellefair', 'Corinthia', 'Gotu', 'Mukta:wght@400;500;600'],
  mount(scene, ctx, root) {
    scene.innerHTML = gateScene(ctx);
    const imgs = [...scene.querySelectorAll('.hy-lf img, .hy-arch img')];
    return {
      ready: Promise.all(imgs.map((im) => im.decode?.().catch(() => {}))),
      // the whole garden is a tap target, as on Hariyo's own page (the buttons stay the accessible way in)
      taps: [scene],
      open(tl) {
        gateExit(tl, root);
        return 1.0;
      },
    };
  },
};
