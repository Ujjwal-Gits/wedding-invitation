// Mahal's first screen as a module (docs/MIX.md): the palace balcony at night (Jal Mahal on its lake, a full moon,
// velvet curtains), as the first screen of any theme's page. Its entrance: the balcony settles from a touch close as
// the lanterns light, Ganesh appears in the moon, ॥ श्री गणेशाय नमः ॥ and शुभ विवाह rise, the names write themselves
// in gold, then fireworks over the palace. (On Mahal's own page the camera arrives here through the gate.)
import './mahal.css';
import './hero.css';
import './mix.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import manifest from './slots.js';
import credits from './flora-credits.js'; // the art it shows (CC BY / BY-SA): mix lists it with the host's credits
import * as P from './palace.js';
import { createFireworks } from './fireworks.js';
import { easeWalk, px } from './gate-parts.js';
import { balconyHTML, balconyRefs, buildScene, splitNames, fitWords, revealWords, depthOf, settle, aimOf } from './balcony.js';

gsap.registerPlugin(ScrollTrigger);

export default {
  id: 'mahal',
  manifest,
  credits,
  fonts: ['Great+Vibes', 'Amita:wght@400;700', 'Cinzel:wght@500', 'Yatra+One', 'Mukta:wght@400;500;600'],
  mount(sec, ctx) {
    const { txt, reduced } = ctx;
    const B = balconyHTML({ ganeshRef: ctx.ganeshRef, symbol: txt('hero.symbol'), invocation: txt('hero.invocation'), title: txt('hero.title'), c: ctx.c });
    sec.innerHTML = `${P.MH_DEFS}<div class="mhb-hero mh-hero">${B.scene}${B.words}</div>`;
    const hero = sec.querySelector('.mh-hero');
    const R = balconyRefs(sec);
    const depth = depthOf(R);
    const fw = reduced ? null : createFireworks(R.fwCanvas);
    splitNames(R.pinner);
    let SG = null; let entered = false;
    const layout = () => {
      const W = sec.clientWidth; const H = window.innerHeight;
      hero.style.height = `${H}px`;
      SG = buildScene(W, H, R, { reduced, fw });
      Object.assign(R.pcontent.style, { top: px(SG.wordsTop), bottom: px(SG.wordsBottom) });
      const [vx, vy] = aimOf(W, H);
      for (const [el] of depth) el.style.transformOrigin = `${px(vx)} ${px(vy)}`;
      if (!entered) settle(depth, 0);
      fitWords(R);
    };
    layout();
    document.fonts?.ready.then(() => fitWords(R));
    let rt = 0; let rw = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === rw) return; // the phone's address bar changes only the height
      rw = window.innerWidth;
      clearTimeout(rt); rt = setTimeout(layout, 150);
    };
    window.addEventListener('resize', onResize);
    let io = null; let mm = null;
    return {
      enter(tl, at) {
        entered = true;
        if (reduced) {
          settle(depth, 1);
          hero.classList.add('is-lit', 'is-inside');
          gsap.set(R.pinner.querySelectorAll('.mh-in, .mh-ch'), { opacity: 1 });
          tl.fromTo([R.pinner, R.ganImg, R.ganGlow, R.ganRays].filter(Boolean), { opacity: 0 }, { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        const rig = { p: 0 };
        // the moving layers are promoted only for the entrance (3x phones run out of GPU memory otherwise)
        tl.add(() => sec.classList.add('is-entering'), at)
          .add(() => hero.classList.add('is-lit'), at)
          .to(rig, { p: 1, duration: 1.8, ease: easeWalk, onUpdate: () => settle(depth, rig.p) }, at)
          .add(() => hero.classList.add('is-inside'), at + 1.4)
          .add(() => { fw?.salvo(SG.tall ? 3 : 5); fw?.play(); }, at + 2.6);
        const end = revealWords(tl, at + 0.3, R);
        tl.add(() => sec.classList.remove('is-entering'), end + 0.8);
        return end;
      },
      after() {
        hero.classList.add('is-lit', 'is-inside');
        if (fw) {
          let seen = true;
          const sync = () => fw.setVisible(seen && !document.hidden);
          io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); });
          io.observe(sec);
          document.addEventListener('visibilitychange', sync);
        }
        if (reduced) return;
        // larger screens with a fine pointer: the balcony drifts and the words fade as the page scrolls on (phones: none)
        mm = gsap.matchMedia();
        mm.add('(min-width: 900px) and (pointer: fine)', () => {
          const st = { trigger: sec, start: 'top top', end: 'bottom top', scrub: 0.6 };
          gsap.to(R.inside, { yPercent: 10, ease: 'none', scrollTrigger: st });
          gsap.to([R.pinner, R.ganEl].filter(Boolean), { scale: 1.05, opacity: 0.3, ease: 'none', scrollTrigger: st });
        });
      },
      destroy() { window.removeEventListener('resize', onResize); clearTimeout(rt); io?.disconnect(); mm?.revert(); fw?.setVisible(false); },
    };
  },
};
