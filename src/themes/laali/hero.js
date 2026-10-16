// Laali's hero as a module (docs/MIX.md): the arched blush card under two hanging lanterns, as the first screen of
// any theme's page. Its entrance: the gold arch draws itself, the lanterns drop and swing to rest, the peony corners
// bloom, Ganesh settles into the crown and the words follow.
import '../_suite/suite.css';
import '../_suite/nepali.css';
import './laali.css';
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { initNepali } from '../_suite/nepali.js';
import { heroCard, heroEnter, layoutArch, fitNames } from './parts.js';

export default {
  id: 'laali',
  suite: true,
  manifest,
  fonts: ['Alex+Brush', 'Gilda+Display', 'Kurale', 'Mukta:wght@400;500;600'],
  mount(sec, ctx) {
    sec.innerHTML = heroCard(ctx);
    initNepali(sec);
    const card = sec.querySelector('.la-card');
    const svg = sec.querySelector('.la-arch');
    const names = sec.querySelector('.la-names');
    const lay = () => { layoutArch(card, svg); fitNames(names); };
    lay();
    document.fonts?.ready.then(lay);
    let raf = 0;
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(lay); };
    window.addEventListener('resize', onResize);
    const gan = sec.querySelector('.la-gan--hero');
    const ins = [...sec.querySelectorAll('.su-in')];
    // closed until the entrance: a see-through gate (Mahal's bars) must not show the words, or Ganesh, early
    gsap.set(ins, { opacity: 0 });
    if (gan && !ctx.reduced) gsap.set(gan, { opacity: 0 });
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          tl.fromTo(ins, { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        heroEnter(tl, at, sec);
        if (gan) tl.fromTo(gan, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, at + 0.5);
        const t = at + 0.9;
        gsap.set(ins, { opacity: 0 });
        ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * 0.14));
        return t + ins.length * 0.14;
      },
      after() {
        if (ctx.reduced) return;
        const shine = sec.querySelector('.la-shine');
        if (gan && shine) {
          const src = JSON.stringify(gan.currentSrc || gan.src);
          shine.style.setProperty('-webkit-mask-image', `url(${src})`);
          shine.style.setProperty('mask-image', `url(${src})`);
        }
        // the loops (lantern sway, glow, Ganesh's glint) run only while the card is on screen
        new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-live', e.isIntersecting))).observe(card);
      },
      destroy() { window.removeEventListener('resize', onResize); },
    };
  },
};
