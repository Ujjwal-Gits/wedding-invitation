// Mala's hero as a module (docs/MIX.md): the names beside one white-matted photograph with fresh rose-and-marigold
// corners, on Mala's lokta paper, as the first screen of any theme's page. Its entrance: the grid comes forward a
// touch and the words rise in turn.
import './mala.css';
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import credits from './flora-credits.js'; // the art it shows (CC BY / BY-SA): mix lists it with the host's credits
import { heroHtml, heroEnter, keyOf } from './parts.js';

export default {
  id: 'mala',
  manifest,
  credits,
  fonts: ['Young+Serif', 'Laila:wght@500;600', 'Hind:wght@400;500;600', 'Mukta:wght@400;500;600'],
  mount(sec, ctx) {
    const heroRef = ctx.S.img('hero.photo');
    const portrait = (ctx.c.portraits || []).find((p) => p?.photo && keyOf(p.photo) === keyOf(heroRef));
    const heroAlt = portrait?.alt || ctx.S.alt('hero.photo') || `${ctx.c.bride.name.en} and ${ctx.c.groom.name.en}`;
    sec.innerHTML = heroHtml({ ...ctx, heroRef, heroAlt }, false);
    // an upload without a stored size: the frame takes the photo's own shape once it is in
    const im = sec.querySelector('.ml-plate[data-ar="auto"] img');
    if (im) {
      const set = () => {
        const ar = im.naturalWidth / im.naturalHeight; if (!ar) return;
        const p = im.closest('.ml-plate'); p.style.setProperty('--ar', ar.toFixed(4)); p.dataset.ar = '1';
        p.parentElement.style.setProperty('--ar', ar.toFixed(4));
      };
      if (im.complete && im.naturalWidth) set(); else im.addEventListener('load', set, { once: true });
    }
    const rv = [...sec.querySelectorAll('.ml-rv')];
    gsap.set(rv, { opacity: 0 }); // closed until its entrance
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          tl.fromTo(rv, { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        heroEnter(tl, at, sec);
        return at + 0.55 + rv.length * 0.1;
      },
    };
  },
};
