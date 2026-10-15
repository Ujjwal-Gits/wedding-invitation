// Sindoor's gate as a module (docs/MIX.md). Sindoor's gate is its cover before the box is opened: only a hit area
// and the words, standing where the names will rise, so it travels as a pair with hero.js: Sindoor's opening scene
// (design.gate = design.hero = 'sindoor') on any theme's page. The hero's entrance (the lid lifts, the sindoor
// blooms, the names rise) is the whole opening.
// Without Sindoor's cover beneath it (not offered by the studio), it is plain paper with Ganesh in red line.
import '../_suite/suite.css';
import './sindoor.css';
import './mix.css';
import manifest from './slots.js';
import { placeUi } from './parts.js';

export default {
  id: 'sindoor',
  suite: true,
  pair: true, // the gate is its hero in a closed state: offered only together with Sindoor's first screen
  manifest,
  fonts: ['Gloock', 'Vesper+Libre:wght@400;500;700', 'Mukta:wght@200;300;400;500;600'],
  mount(scene, ctx, root) {
    const hero = ctx.hero || document.querySelector('.mx-hero--sindoor'); // its own first screen, beneath
    scene.innerHTML = hero ? '<div class="sd-gate"></div>' : `<div class="sd-gate sd-gate--alone">${ctx.ganesh('sd-gan', '64px')}</div>`;
    const ui = root.querySelector('.mx-ui');
    const place = () => { if (hero && !root.classList.contains('is-opening')) placeUi(hero, ui); };
    place();
    document.fonts?.ready.then(place);
    addEventListener('resize', place);
    return {
      taps: [scene.querySelector('.sd-gate')], // the cover itself is a tap target too (the buttons stay the accessible way in)
      open() { return hero ? 0 : 0.3; }, // the box starts to open 0.15 s later
      destroy() { removeEventListener('resize', place); },
    };
  },
};
