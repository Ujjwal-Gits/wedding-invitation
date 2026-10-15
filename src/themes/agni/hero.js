// Agni's first screen as a module (docs/MIX.md): the brass havan kunda at night, Ganesh and the names over it, as the
// first screen of any theme's page. It waits unlit (the kunda a dark shape, the names barely catching the dark); its
// entrance is the fire catching: the flames spring up off the logs, the glow floods out, the light reaches Ganesh and
// the names. (Agni's own gate, the ember that lights it, is gate.js: together they are Agni's opening scene. The
// pinned seven rounds are Agni's page, not its first screen, and stay there.)
import '../_suite/suite.css';
import '../_suite/nepali.css';
import './agni.css';
import './mix.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import manifest from './slots.js';
import { initNepali } from '../_suite/nepali.js';
import { heroHtml, fitKunda, heroEnter } from './parts.js';

gsap.registerPlugin(ScrollTrigger);

export default {
  id: 'agni',
  suite: true,
  manifest,
  fonts: ['Castoro+Titling', 'Castoro:ital@0;1', 'Kadwa:wght@400;700', 'Mukta:wght@400;500;600'],
  mount(sec, ctx) {
    sec.innerHTML = heroHtml(ctx);
    initNepali(sec);
    // unlit until its entrance (Agni's own page keys this to its body state; a part keys it to its own class)
    sec.classList.add('ag-unlit');
    if (ctx.reduced) sec.classList.add('ag-reduced');
    const fit = () => fitKunda(sec, sec);
    fit();
    document.fonts?.ready.then(fit);
    let raf = 0;
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
    addEventListener('resize', onResize);
    document.addEventListener('langchange', onResize);
    const ins = [...sec.querySelectorAll('.su-in')];
    let io = null;
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          // the still fire comes up with a cross-fade (agni.css transitions .ag-reduced)
          tl.call(() => sec.classList.remove('ag-unlit'), null, at);
          tl.fromTo(ins, { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        // every unlit piece gets its starting state from the tweens below, so the class can go now
        const t = heroEnter(tl, at, sec);
        gsap.set(ins, { opacity: 0 });
        sec.classList.remove('ag-unlit');
        ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, t + i * 0.14));
        return t + ins.length * 0.14;
      },
      after() {
        sec.classList.remove('ag-unlit'); // a host that opened without calling enter() still lights the fire
        if (ctx.reduced) return;
        // embers rise only while the fire is on screen
        const em = sec.querySelector('.ag-embers');
        const k = sec.querySelector('.ag-kunda--hero');
        if (em && k) {
          io = new IntersectionObserver(([e]) => em.classList.toggle('is-live', e.isIntersecting), { rootMargin: '60px' });
          io.observe(k);
        }
        // the words drift up and away as the page begins
        gsap.to(sec.querySelectorAll('.ag-hero__top, .ag-names, .ag-hero__after'), { y: -40, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom top', scrub: true } });
      },
      destroy() {
        removeEventListener('resize', onResize);
        document.removeEventListener('langchange', onResize);
        io?.disconnect();
      },
    };
  },
};
