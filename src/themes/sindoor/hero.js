// Sindoor's first screen as a module (docs/MIX.md): the cover of an editorial wedding issue on warm white, the
// closed sindoor dani between the side columns, as the first screen of any theme's page. Its entrance: the lid lifts
// and tilts away, a plume of sindoor rises and blooms across the screen, and as the powder clears the rule draws and
// the names rise into the masthead in red. (Sindoor's own gate is gate.js, a hit area over the closed cover: together
// they are Sindoor's opening scene. The red thread through the story is Sindoor's page and stays there.)
import '../_suite/suite.css';
import '../_suite/nepali.css';
import './sindoor.css';
import './mix.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import manifest from './slots.js';
import { initNepali } from '../_suite/nepali.js';
import { heroHtml, fitAll, heroClosed, heroEnter, heroScroll, LID_UP } from './parts.js';

gsap.registerPlugin(ScrollTrigger);

export default {
  id: 'sindoor',
  suite: true,
  manifest,
  fonts: ['Gloock', 'Vesper+Libre:wght@400;500;700', 'Mukta:wght@200;300;400;500;600'],
  mount(sec, ctx) {
    sec.innerHTML = heroHtml(ctx, { thread: false });
    initNepali(sec);
    const fit = () => fitAll(sec);
    fit();
    document.fonts?.ready.then(fit);
    addEventListener('resize', fit);
    document.addEventListener('langchange', fit);
    // the cover waits closed (with reduced motion it shows the open box, the words waiting to fade in)
    const names = sec.querySelector('.sd-cover__names');
    const ins = [...sec.querySelectorAll('.su-in')];
    if (ctx.reduced) { gsap.set(sec.querySelector('.sd-lid'), LID_UP); gsap.set([names, ...ins], { opacity: 0 }); } else heroClosed(gsap, sec);
    let io = null;
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          tl.fromTo([names, ...ins], { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        const t = heroEnter(tl, at, sec);
        ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * 0.14));
        return t + ins.length * 0.14;
      },
      after() {
        if (ctx.reduced) { gsap.set([names, ...ins], { opacity: 1 }); return; }
        heroScroll(gsap, sec, sec);
        // the lid hovers while the cover is on screen (a CSS loop on its inner layer, off when out of view)
        const f = sec.querySelector('.sd-lid__f');
        if (f) { io = new IntersectionObserver(([e]) => f.classList.toggle('is-floating', e.isIntersecting)); io.observe(sec); }
      },
      destroy() {
        removeEventListener('resize', fit);
        document.removeEventListener('langchange', fit);
        io?.disconnect();
      },
    };
  },
};
