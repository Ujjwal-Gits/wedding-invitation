// Janti's gate as a module (docs/MIX.md). Janti's gate is its first screen at dusk (a see-through wash over the
// painted street, warm light left in the window), so it travels as a pair with hero.js: Janti's opening scene
// (design.gate = design.hero = 'janti') on any theme's page. On tap the dusk lifts to golden hour; the hero's
// entrance (the band strikes up, the procession walks in, the doli curtain rolls up) does the rest.
// Without Janti's first screen beneath it (not offered by the studio), the dusk simply lifts off whatever is there.
import '../_suite/suite.css';
import './janti.css';
import './mix.css';
import manifest from './slots.js';

export default {
  id: 'janti',
  suite: true,
  pair: true, // the gate is its hero in a closed state: offered only together with Janti's first screen
  manifest,
  fonts: ['Yeseva+One', 'Sura:wght@400;700', 'Mukta:wght@400;500;600'],
  mount(scene) {
    scene.innerHTML = '<div class="jt-g"><div class="jt-g__dusk"></div></div>';
    return {
      open(tl) {
        // dusk lifts to golden hour while the band strikes up beneath
        tl.to(scene.querySelector('.jt-g__dusk'), { opacity: 0, duration: 1.6, ease: 'sine.inOut' }, 0.15);
        return 0.35;
      },
    };
  },
};
