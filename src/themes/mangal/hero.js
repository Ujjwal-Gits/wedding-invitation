// Mangal's first screen as a module (docs/MIX.md): the red card inside the doorway (the red arch ruled in gold over a
// Dhaka band; Shri Ganesh; ॥ श्री गणेशाय नमः ॥, शुभ विवाह, the names and one warm line), as the first screen of any
// theme's page. Its entrance, as on Mangal's page once the doors are through: Ganesh appears large and glowing, then
// settles softly behind the words, which come in a few at a time.
import './mangal.css';
import './mix.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import manifest from './slots.js';
import credits from './flora-credits.js'; // the art it shows (CC BY / BY-SA): mix lists it with the host's credits
import { paperVars, namesHTML, computeLayout } from './doorway.js';
import { cardHTML, cardRefs, fitCard, cardIn, cardStill } from './card.js';

gsap.registerPlugin(ScrollTrigger);

export default {
  id: 'mangal',
  manifest,
  credits,
  fonts: ['Cormorant+Garamond:ital,wght@0,500;0,600;1,500', 'Yatra+One', 'Mukta:wght@400;500;600'],
  mount(sec, ctx) {
    const { txt, bi, c, reduced } = ctx;
    for (const [k, v] of Object.entries(paperVars().vars)) sec.style.setProperty(k, v);
    const card = cardHTML({
      ganeshRef: ctx.ganeshRef, symbol: txt('hero.symbol'), invocation: txt('hero.invocation'), title: txt('hero.title'),
      blessing: txt('hero.blessing'), names: namesHTML(bi, c),
    });
    sec.innerHTML = `<div class="mg-hero is-inside">${card.inside}${card.content}</div>`;
    const R = cardRefs(sec);
    let phone = false;
    const layout = () => {
      const L = computeLayout(sec.clientWidth, sec.clientHeight, ctx.ganeshRef);
      phone = L.phone;
      sec.style.setProperty('--mg-thr', `${L.thr}px`);
      Object.assign(R.pcontent.style, { top: `${L.ctop}px`, bottom: `${L.cbottom}px` });
      fitCard(R);
    };
    layout();
    document.fonts?.ready.then(layout);
    let rt = 0; let rw = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === rw) return; // the phone's address bar changes only the height
      rw = window.innerWidth;
      clearTimeout(rt); rt = setTimeout(layout, 150);
    };
    window.addEventListener('resize', onResize);
    let mm = null;
    return {
      enter(tl, at) {
        return reduced ? cardStill(tl, at, R, {}) : cardIn(tl, at, R, { phone });
      },
      after() {
        if (reduced) return;
        // larger screens with a fine pointer: the card sinks back a little as the page scrolls on (phones: none)
        mm = gsap.matchMedia();
        mm.add('(min-width: 900px) and (pointer: fine)', () => {
          const st = { trigger: sec, start: 'top top', end: 'bottom top', scrub: 0.6 };
          gsap.to(R.inside, { scale: 1.1, ease: 'none', scrollTrigger: st });
          gsap.to([R.pinner, R.ganEl].filter(Boolean), { scale: 1.05, opacity: 0.3, ease: 'none', scrollTrigger: st });
        });
      },
      destroy() { window.removeEventListener('resize', onResize); clearTimeout(rt); mm?.revert(); },
    };
  },
};
