// Mala's gate as a module (docs/MIX.md): the dressed mandap (a sindoor silk valance, marigold strings swaying in the
// breeze, two brass kalash arrangements) with the names and the two buttons, on any theme's page. Its own exit: the
// words lift away and the guest walks forward through the floral arch while the mix's neutral fade shows the page.
import './mala.css';
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { GarlandScene, preload } from './garland.js';
import { gateHtml, buildGate } from './parts.js';

export default {
  id: 'mala',
  manifest,
  fonts: ['Young+Serif', 'Laila:wght@500;600', 'Hind:wght@400;500;600', 'Mukta:wght@400;500;600'],
  ui: () => '', // its own words and buttons, inside the scene (gateHtml marks them for mix)
  mount(scene, ctx) {
    scene.innerHTML = `<div class="ml-gate ml-gate--mx">${gateHtml(ctx, false)}</div>`;
    const gate = scene.firstElementChild;
    const arch = gate.querySelector('.ml-arch');
    const strands = gate.querySelector('.ml-arch__strands');
    const drapeImg = gate.querySelector('.ml-arch__drape img');
    // the strings: one WebGL (or 2D) canvas, ticked only while this gate is up
    const garland = new GarlandScene(strands, { reduced: ctx.reduced, shadow: { x: 4, y: 9, opacity: 0.18 } });
    let last = performance.now();
    const tick = () => { const now = performance.now(); garland.tick(Math.min(64, now - last)); last = now; };
    gsap.ticker.add(tick);
    const hang = () => { buildGate(garland, gate, strands); garland.forceRender = true; };
    let rt = 0;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(hang, 150); };
    window.addEventListener('resize', onResize);
    const imgs = [...gate.querySelectorAll('img')];
    const ready = Promise.all([
      preload(['rope-orange', 'rope-alt', 'rope-alt2', 'band-rose', 'drop']),
      ...imgs.map((im) => im.decode?.().catch(() => {})),
      document.fonts?.ready,
    ]).catch(() => {}).then(() => requestAnimationFrame(hang));
    return {
      ready,
      open(tl) {
        // the camera walks forward through the arch (the paper fades with the mix's neutral reveal)
        tl.to(arch, { scale: 2.6, duration: 1.8, ease: 'power2.inOut' }, 0.1);
        return 0.55;
      },
      destroy() {
        gsap.ticker.remove(tick);
        window.removeEventListener('resize', onResize);
        clearTimeout(rt);
        garland.active = false;
        garland.destroy?.();
      },
    };
  },
};
