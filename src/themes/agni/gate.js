// Agni's gate as a module (docs/MIX.md). Agni's gate is its first screen at night, before the fire is lit, so it
// travels as a pair with hero.js: Agni's opening scene (design.gate = design.hero = 'agni') on any theme's page.
// The gate itself is see-through: its words sit where the hero's line and date will appear, and on tap one ember
// drops from the button into the logs; the hero's entrance lights the fire as it lands. (mix-rules only offers it
// with Agni's first screen, which mix mounts before the gate: ctx.hero is always there.)
import '../_suite/suite.css';
import './agni.css';
import './mix.css';
import manifest from './slots.js';
import { initNepali } from '../_suite/nepali.js';
import { placeUi, sparkDrop } from './parts.js';

export default {
  id: 'agni',
  suite: true,
  pair: true, // the gate is its hero in a closed state: offered only together with Agni's first screen
  manifest,
  fonts: ['Castoro+Titling', 'Castoro:ital@0;1', 'Kadwa:wght@400;700', 'Mukta:wght@400;500;600'],
  mount(scene, ctx, root) {
    const { hero } = ctx; // its own first screen, beneath
    scene.innerHTML = '<div class="ag-g"><i class="ag-spark"></i></div>';
    initNepali(scene);
    const ui = root.querySelector('.mx-ui');
    const place = () => { if (!root.classList.contains('is-opening')) placeUi(hero, ui); };
    place();
    document.fonts?.ready.then(place);
    let raf = 0;
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
    addEventListener('resize', onResize);
    document.addEventListener('langchange', onResize);
    return {
      open(tl) {
        sparkDrop(tl, scene.querySelector('.ag-spark'), root.querySelector('[data-mx-open]').getBoundingClientRect(), hero);
        return 0.75; // the hero's entrance (the fire catching) starts 0.15 s later, as the ember lands
      },
      destroy() {
        removeEventListener('resize', onResize);
        document.removeEventListener('langchange', onResize);
      },
    };
  },
};
