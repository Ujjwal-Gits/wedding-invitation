// Swayambar's gate as a module (docs/MIX.md): wine-red silk, two long marigold, rose and jasmine garlands hanging from
// above and interlocked in the middle, Ganesh in an ivory medallion inside their loop, on any theme's page. Its own
// exit: the garlands' hanging points draw apart and they swing like heavy pendulums, the silk parts from the middle,
// the medallion floats up and fades (on Swayambar's own page it flies into the hero instead; that FLIP needs
// Swayambar's hero, so it is not part of the module); then the mix's neutral fade reveals the page beneath.
import '../_suite/suite.css';
import './swayambar.css';
import './mix.css';
import manifest from './slots.js';
import { gateScene, placeGate, gateSwing } from './parts.js';

export default {
  id: 'swayambar',
  suite: true,
  manifest,
  fonts: ['Pinyon+Script', 'Prata', 'Halant:wght@400;500;600', 'Mukta:wght@400;500;600'],
  mount(scene, ctx, root) {
    scene.innerHTML = gateScene(ctx);
    const place = () => { if (!root.classList.contains('is-opening')) placeGate(scene); };
    place();
    addEventListener('resize', place);
    const imgs = [...scene.querySelectorAll('img')];
    return {
      ready: Promise.all(imgs.map((im) => im.decode?.().catch(() => {}))).then(place),
      open(tl) {
        gateSwing(tl, scene);
        const gan = scene.querySelector('.sw-g__gan');
        if (gan) tl.to(gan, { y: -34, scale: 0.88, autoAlpha: 0, duration: 1.1, ease: 'power2.inOut' }, 0.3);
        return 1.6;
      },
      destroy() { removeEventListener('resize', place); },
    };
  },
};
