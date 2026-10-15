// Pardaa's gate as a module (docs/MIX.md): a pair of closed deep-red velvet curtains with gold zari, Ganesh in an
// ivory medallion, शुभ विवाह and the names in gold, on any theme's page. Its own exit: the words lift away, the halves
// draw apart and gather to the sides, warm light rises behind and clears; the mix's neutral fade reveals the page.
import '../_suite/suite.css';
import './pardaa.css';
import './mix.css';
import manifest from './slots.js';
import { gateScene, gateExit } from './parts.js';

export default {
  id: 'pardaa',
  suite: true,
  manifest,
  fonts: ['Playfair+Display:ital,wght@0,400;0,500;1,400', 'Eczar:wght@400;500;600', 'Mukta:wght@400;500;600'],
  mount(scene, ctx, root) {
    scene.innerHTML = gateScene(ctx);
    const imgs = [...scene.querySelectorAll('img')];
    // the velvet is two CSS backgrounds: warm them before the buttons wake, so the curtains never paint in late
    const silk = ['silk-l', 'silk-r'].map((n) => { const im = new Image(); im.src = `/themes/pardaa/art/${n}.webp`; return im; });
    return {
      ready: Promise.all([...imgs, ...silk].map((im) => im.decode?.().catch(() => {}))),
      open(tl) {
        gateExit(tl, root);
        return 1.9;
      },
    };
  },
};
