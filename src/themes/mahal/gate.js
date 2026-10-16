// Mahal's gate as a module (docs/MIX.md): the golden painted palace gate under its arch of roses and wisteria, Shri
// Ganesh in the crest, tied shut with an ivory satin bow, over any theme's page (which glows through the bars). Its
// own exit, as on Mahal's page: the crest glows, the bow comes undone and the ribbon falls, the heavy leaves swing open
// with warm light pouring through and petals falling, and the camera walks through the doorway; the gate passes and
// fades onto the page beneath. (On Mahal's own page the camera arrives on the palace balcony; that is Mahal's hero.)
import './mahal.css';
import './hero.css';
import './mix.css';
import manifest from './slots.js';
import credits from './flora-credits.js'; // the art it shows (CC BY / BY-SA): mix lists it with the host's credits
import { DEFS } from './art.js';
import { createRibbon } from './ribbon.js';
import {
  DECOR, place, gateHTML, gateRefs, buildGate, rigGate, gateScale, gateTiming, gateUntie, easeWalk, petalFall, maskFall, dropPetals,
} from './gate-parts.js';

export default {
  id: 'mahal',
  manifest,
  credits,
  fonts: ['Cormorant+Garamond:ital,wght@0,500;1,500', 'Yatra+One', 'Mukta:wght@400;500;600'],
  // the line and two buttons on a dark glass card at the foot of the gate, as on Mahal's own page
  ui: ({ bi, txt }) => `<div class="mh-ui" data-mx-ui>
      <p class="mh-ui__line">${bi(txt('gate.line'))}</p>
      <button class="mh-open" data-mx-open type="button" disabled>${bi(txt('gate.open'))}</button>
      <button class="mh-quiet" data-mx-quiet type="button" disabled>${bi(txt('gate.quiet'))}</button>
    </div>`,
  mount(scene, ctx, root) {
    const { gsap, reduced, esc, txt } = ctx;
    // the light that pours through sits beneath the gate; the bow is a button too (the line's buttons stay the way in)
    // round the doorway, the forecourt is night (it travels with the gate, so the doorway grows to fill the screen)
    scene.innerHTML = `${DEFS}<i class="mh-pour"></i>${gateHTML(ctx.ganeshRef, { under: '<i class="mh-court"></i>' })}
      <button class="mh-bowbtn" type="button" aria-label="${esc(txt('gate.open').en)}" disabled></button>`;
    // the host may offer its own dusk for a foreign gate's surroundings (--mx-dusk on its <body>)
    if (getComputedStyle(root).getPropertyValue('--mx-dusk').trim()) scene.classList.add('is-dusk');
    const R = gateRefs(scene);
    const pour = scene.querySelector('.mh-pour');
    const court = scene.querySelector('.mh-court');
    const bowBtn = scene.querySelector('.mh-bowbtn');
    const rib = createRibbon(R.ribbon);
    rib.setTexture(`${DECOR}ribbon.webp`);
    Object.assign(R, { rib, bowBtn, ui: root.querySelector('.mh-ui') });
    const fall = reduced ? null : petalFall(root.clientWidth < 700);
    if (fall) scene.append(fall);

    let G = null; let CAM = 0.45; let opened = false;
    const layout = () => {
      if (opened) return;
      G = buildGate(root.clientWidth, root.clientHeight, R, { reduced, mask: true });
      const { x0, x1, y0, y1 } = G.door;
      place(court, x0, y0, x1 - x0, y1 - y0);
      ({ CAM } = rigGate(G, R));
      maskFall(fall, scene, R.ui);
    };
    layout();
    document.fonts?.ready.then(layout);
    let rt = 0;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(layout, 120); };
    window.addEventListener('resize', onResize);
    const onVis = () => fall?.classList.toggle('is-off', document.hidden);
    document.addEventListener('visibilitychange', onVis);

    const ready = Promise.all([...scene.querySelectorAll('img')].map((im) => im.decode?.().catch(() => {})));
    ready.then(() => { bowBtn.disabled = false; });

    return {
      ready,
      taps: [bowBtn],
      open(tl) {
        opened = true;
        bowBtn.hidden = true;
        const T = gateTiming(G);
        const { SWING_AT, SWING, ZOOM_AT, ZOOM, end } = T;
        const rig = { p: 0 };
        gateUntie(tl, R, G, T, [R.hint]);
        tl.fromTo(pour, { opacity: 0 }, { opacity: 1, duration: SWING * 0.45, ease: 'power1.out' }, SWING_AT + 0.05)
          .to(pour, { opacity: 0, duration: 1.4, ease: 'power1.inOut' }, SWING_AT + SWING * 0.5)
          .add(() => { if (tl.progress() < 0.9) dropPetals(G); }, SWING_AT + 0.4) // (not when the opening is skipped)
          // through the gateway: a short soft zoom; the gate passes and fades onto the page
          .to(rig, { p: 1, duration: ZOOM, ease: easeWalk, onUpdate: () => { R.gateLy.style.transform = gateScale(CAM * rig.p); } }, ZOOM_AT)
          .to(R.gateIn, { scale: 1, duration: ZOOM, ease: easeWalk }, ZOOM_AT)
          .to(R.gateLy, { opacity: 0, duration: ZOOM * 0.45, ease: 'power1.in' }, ZOOM_AT + ZOOM * 0.55);
        // the page's own first screen comes in as the doorway fills the screen (Rajdwar's beat: end - 0.3)
        return end - 0.45;
      },
      destroy() {
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVis);
        clearTimeout(rt);
        rib.stop();
        gsap.killTweensOf([R.bowImg, R.crestHalo, R.leafL, R.leafR, R.seam, R.gateIn, R.gateLy, pour]);
      },
    };
  },
};
