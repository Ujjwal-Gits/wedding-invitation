// Phoolbari's gate as a module (docs/MIX.md): the ivory flower arch dressed with roses and marigolds, light ladis in
// its opening, शुभ विवाह on the crest and the welcome board on its brass easel, on any theme's page. Its own exit:
// the board lifts away, the ladis draw apart, the paper clears and the arch comes forward as the guest steps through.
import './gurans.css';
import './mix.css';
import manifest from './slots.js';
import { gateHtml, boardPlacer } from './parts.js';

export default {
  id: 'gurans',
  manifest,
  fonts: ['Libre+Caslon+Display', 'Crimson+Pro:ital,wght@0,400;0,500;0,600;1,400;1,500', 'Manrope:wght@500;600;700', 'Tiro+Devanagari+Hindi', 'Noto+Serif+Devanagari:wght@400;500;600'],
  ui: () => '', // the welcome board carries the words and buttons (gateHtml marks them for mix)
  mount(scene, ctx) {
    scene.innerHTML = `<div class="pb-gate pb-gate--mx">${gateHtml(ctx, false)}</div>`;
    const gate = scene.firstElementChild;
    const { place, visibleStage } = boardPlacer(gate);
    place();
    window.addEventListener('resize', place);
    const imgs = [...visibleStage().querySelectorAll('img')];
    const ready = Promise.race([
      Promise.all(imgs.map((im) => im.decode?.().catch(() => {}))),
      new Promise((r) => setTimeout(r, 8000)),
    ]).then(() => gate.classList.add('is-ready'));
    return {
      ready,
      open(tl) {
        const q = (s) => [...gate.querySelectorAll(s)];
        const ease = 'power3.inOut';
        tl.to(q('.pb-gate__curtain--l'), { xPercent: -58, scaleX: 0.42, duration: 1.25, ease }, 0.26)
          .to(q('.pb-gate__curtain--r'), { xPercent: 58, scaleX: 0.42, duration: 1.25, ease }, 0.26)
          .to(q('.pb-gate__curtain'), { opacity: 0, duration: 0.9, ease: 'power1.inOut' }, 0.7)
          .to(gate.querySelector('.pb-gate__bg'), { opacity: 0, duration: 0.9, ease: 'power1.inOut' }, 0.65)
          .to(gate.querySelector('.pb-gate__scene'), { scale: 1.7, duration: 1.3, ease: 'power2.in' }, 0.9);
        return 1.05;
      },
      destroy() { window.removeEventListener('resize', place); },
    };
  },
};
