// Jhyal's gate as a module (docs/MIX.md): one carved Newari window on ivory lokta paper (a cusped torana, lattice
// shutters with the names faint behind them, a slim marigold toran, two brass diyos on the sill), on any theme's
// page. Its own exit: the shutters swing outward in 3D, morning light and a few marigold petals drift in, and the view
// moves through the window as the paper lifts onto the page beneath.
import './jhyal.css';
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import credits from './flora-credits.js'; // the art it shows (CC BY / BY-SA): mix lists it with the host's credits
import { ensureDefs, gateHtml, gateRefs, layoutGate, petalFall, windowOpen } from './parts.js';

export default {
  id: 'jhyal',
  manifest,
  credits,
  fonts: ['Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,400', 'Noto+Serif+Devanagari:wght@300;400;500;600', 'Tiro+Devanagari+Hindi', 'Mukta:wght@400;500;600'],
  ui: () => '', // the line above the window and the buttons below it are its own (gateHtml marks them for mix)
  mount(scene, ctx) {
    ensureDefs();
    scene.innerHTML = gateHtml(ctx, false);
    const R = gateRefs(scene.firstElementChild);
    R.fall = ctx.reduced ? null : petalFall(R.gate);
    let L = layoutGate(R);
    const relayout = () => { L = layoutGate(R); };
    document.fonts?.ready.then(relayout);
    let rt = 0;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(relayout, 120); };
    window.addEventListener('resize', onResize);
    return {
      ready: Promise.all([...R.gate.querySelectorAll('img')].map((im) => im.decode?.().catch(() => {}))),
      open(tl) {
        window.removeEventListener('resize', onResize);
        const { end } = windowOpen(gsap, tl, R, L);
        return end - 0.75; // as the paper veil starts to lift, the mix fades the rest onto the page
      },
      destroy() {
        window.removeEventListener('resize', onResize);
        clearTimeout(rt);
        R.fall?.stop?.();
      },
    };
  },
};
