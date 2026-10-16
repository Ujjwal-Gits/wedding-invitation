// Dhoka's gate as a module (docs/MIX.md): the door printed as a plate on white paper, the names on one side and the
// date and the way in on the other, on any theme's page. Its own exit: the words leave, the two leaves swing inward
// onto the courtyard, warm light spills out and the guest walks up to the opening; then the mix's neutral fade shows
// the page beneath. (On Dhoka's own page the door opens in WebGL and settles onto its first plate; that needs Dhoka's
// own first screen, so it is not part of the module.)
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { gateScene, gateExit } from './parts.js';
import { FONTS } from './fonts.js';

export default {
  id: 'dhoka',
  manifest,
  fonts: FONTS,
  ui: () => '', // the line and the buttons sit inside the scene's right-hand column
  mount(scene, ctx, root) {
    scene.innerHTML = gateScene(ctx);
    const imgs = [...scene.querySelectorAll('img')];
    return {
      ready: Promise.all(imgs.map((im) => im.decode?.().catch(() => {}))),
      taps: [scene.querySelector('.dhg__door')].filter(Boolean), // the door itself opens too
      open(tl) { return gateExit(tl, root); },
      destroy() { gsap.killTweensOf(scene.querySelector('.dhg__door')); },
    };
  },
};
