// Mehendi's gate as a module (docs/MIX.md): plain ivory, the title, and a large henna mandala waiting as a faint
// pencil guide, on any theme's page. Its own exit is the signature: the cone lays the mandala ring by ring from the
// centre outward; then the paper and the henna fade apart and the mix's neutral fade reveals the page beneath.
import '../_suite/suite.css';
import './mehendi.css';
import './mix.css';
import manifest from './slots.js';
import { gateScene, gateExit } from './parts.js';

export default {
  id: 'mehendi',
  suite: true,
  manifest,
  fonts: ['Allura', 'Marcellus', 'Marcellus+SC', 'Tillana:wght@400;500;600', 'Mukta:wght@400;500;600'],
  mount(scene, ctx, root) {
    scene.innerHTML = gateScene(ctx);
    return {
      ready: document.fonts?.ready,
      // the mandala itself is a tap target too (the buttons stay the accessible way in)
      taps: [scene.querySelector('.md-gate__m')].filter(Boolean),
      open: (tl) => gateExit(tl, root),
    };
  },
};
