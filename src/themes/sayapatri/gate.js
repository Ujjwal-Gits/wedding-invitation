// Sayapatri's gate as a module (docs/MIX.md): a Nepali doorway dressed for a wedding, a mango-leaf toran on the lintel
// and strings of real marigold either side of a small printed card, on any theme's page. Its own exit: the card lifts
// away and the marigold strings rise into the lintel, inner strings first, like a curtain raised.
import './sayapatri.css';
import './mix.css';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import manifest from './slots.js';
import credits from './flora-credits.json'; // the art it shows (CC BY / BY-SA): mix lists it with the host's credits
import { guestEvents } from '../../core/finale.js';
import { gateHtml, gateArrive, gateLift, weddingDayOf } from './parts.js';

gsap.registerPlugin(CustomEase);
CustomEase.create('sp', '0.7,0,0.2,1');
CustomEase.create('spOut', '0.2,0.7,0.2,1');

export default {
  id: 'sayapatri',
  manifest,
  credits,
  fonts: ['Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500', 'DM+Sans:opsz,wght@9..40,400..600', 'Noto+Serif+Devanagari:wght@400..600', 'Mukta:wght@400;500;600'],
  ui: () => '', // the card carries the words and buttons (gateHtml marks them for mix)
  mount(scene, ctx) {
    scene.innerHTML = gateHtml({ ...ctx, weddingDay: weddingDayOf(ctx.config, guestEvents()) }, false);
    const gate = scene.firstElementChild;
    if (!ctx.reduced) gateArrive(gsap, gate);
    return {
      ready: Promise.all([...gate.querySelectorAll('img')].map((im) => im.decode?.().catch(() => {}))),
      open(tl) {
        gateLift(gsap, tl, gate, { card: false }); // (mix lifts the card away with the other words)
        return 0.8;
      },
    };
  },
};
