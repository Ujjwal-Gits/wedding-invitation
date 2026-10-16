// Rangoli's gate as a module (docs/MIX.md). Rangoli's gate is its first screen seen from low down across the
// courtyard, with शुभ विवाह over it and the eave's shade under the line and buttons, so it travels as a pair with
// hero.js: Rangoli's opening scene (design.gate = design.hero = 'rangoli') on any theme's page. On tap the title lifts
// away and the shade clears; the hero's entrance (the camera tilting down onto the rangoli) does the rest.
// mix-rules only offers it with Rangoli's first screen, which mix mounts beneath it before the gate.
import '../_suite/suite.css';
import './rangoli.css';
import './mix.css';
import manifest from './slots.js';
import { gateHtml, gateExit } from './parts.js';

export default {
  id: 'rangoli',
  suite: true,
  pair: true, // the gate is its hero in a closed state: offered only together with Rangoli's first screen
  manifest,
  fonts: ['DM+Serif+Display', 'Karma:wght@500;600', 'Mukta:wght@400;500;600'],
  mount(scene, ctx) {
    scene.innerHTML = gateHtml(ctx);
    const g = scene.querySelector('.rg-gate');
    return {
      ready: Promise.all([...scene.querySelectorAll('img')].map((im) => im.decode?.().catch(() => {}))),
      taps: [g], // the courtyard itself is a tap target too (the buttons stay the accessible way in)
      open(tl) {
        gateExit(tl, g);
        return 0; // the camera starts down 0.15 s later, as the title lifts
      },
    };
  },
};
