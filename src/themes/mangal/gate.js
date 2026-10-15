// Mangal's gate as a module (docs/MIX.md): the carved red Newar doorway (pillars, lintel, a torana with Ganesh, a silk
// drape of marigold-and-rose rosettes, two brass bells, a kalash and a diyo at each pillar), the plaque with the
// names and the brass latch, on handmade paper, over any theme's page. Its own exit, as on Mangal's page: the bells
// sway, the latch gives, the heavy leaves swing open with warm light pouring through, petals fall from the drape and
// the camera walks in through the doors; the doorway fills the screen with warm light and fades onto the page.
import './mangal.css';
import './mix.css';
import manifest from './slots.js';
import { DEFS } from './art.js';
import {
  paperVars, medalHTML, namesHTML, gateHTML, doorwayHTML, doorRefs, computeLayout, layoutDoorway, fallBox, maskFall, dropPetals,
  openDoors, depthOf,
} from './doorway.js';

export default {
  id: 'mangal',
  manifest,
  fonts: ['Cormorant+Garamond:ital,wght@0,500;0,600;1,500', 'Yatra+One', 'Mukta:wght@400;500;600'],
  // the plaque, the latch and "open without music" live on the doors (in the scene); no standard line and buttons
  ui: () => '',
  mount(scene, ctx, root) {
    const { gsap, reduced, bi, txt, c } = ctx;
    for (const [k, v] of Object.entries(paperVars().vars)) root.style.setProperty(k, v);
    scene.innerHTML = `${DEFS}${doorwayHTML({
      medal: medalHTML(ctx.ganeshRef, 'mg-medal--door'),
      gate: gateHTML({ bi, line: txt('gate.line'), names: namesHTML(bi, c), open: txt('gate.open'), quiet: txt('gate.quiet'), mx: true }),
    })}`;
    const R = doorRefs(scene);
    const fall = reduced ? null : fallBox(root.clientWidth < 700);
    if (fall) scene.append(fall);

    let L = null; let opened = false;
    const layout = () => {
      if (opened) return;
      const W = root.clientWidth; const H = root.clientHeight;
      L = computeLayout(W, H, ctx.ganeshRef);
      root.style.setProperty('--mg-thr', `${L.thr}px`);
      layoutDoorway(R, L, root);
      fall?.style.setProperty('--fall', `${H}px`);
      maskFall(fall, scene, R.gate);
    };
    layout();
    document.fonts?.ready.then(layout);
    let rt = 0;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(layout, 120); };
    window.addEventListener('resize', onResize);
    const onVis = () => fall?.classList.toggle('is-off', document.hidden);
    document.addEventListener('visibilitychange', onVis);

    return {
      ready: Promise.all([...scene.querySelectorAll('img')].map((im) => im.decode?.().catch(() => {}))),
      open(tl) {
        opened = true;
        const { DOLLY_AT, end } = openDoors(tl, R, L, { depth: depthOf(R), petals: () => { if (tl.progress() < 0.9) dropPetals(L); } });
        // the glow on the step settles; the doorway, full of warm light, fills the screen
        tl.to(R.spill, { opacity: 0, duration: 1, ease: 'power1.inOut' }, DOLLY_AT + 0.3);
        return end - 0.5;
      },
      destroy() {
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVis);
        clearTimeout(rt);
        gsap.killTweensOf([R.leafL, R.leafR, R.gap, R.light, R.spill]);
      },
    };
  },
};
