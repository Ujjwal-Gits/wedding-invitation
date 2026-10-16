// Phoolbari's welcome as a module (docs/MIX.md): a marigold-and-rose toran swag over the names, the date in fine gold
// rules and the couple in a white mat with fresh flower corners, on its soft paper, as the first screen of any
// theme's page. Its entrance: the swag settles, the words rise in turn, the photograph comes up last.
import './gurans.css';
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import credits from './flora-credits.js'; // the art it shows (CC BY / BY-SA): mix lists it with the host's credits
import { heroHtml, watchAspects, keyOf } from './parts.js';

export default {
  id: 'gurans',
  manifest,
  credits,
  fonts: ['Libre+Caslon+Display', 'Crimson+Pro:ital,wght@0,400;0,500;0,600;1,400;1,500', 'Manrope:wght@500;600;700', 'Noto+Serif+Devanagari:wght@400;500;600'],
  mount(sec, ctx) {
    const heroRef = ctx.S.img('hero.photo');
    const portrait = (ctx.c.portraits || []).find((p) => p?.photo && keyOf(p.photo) === keyOf(heroRef));
    const heroAlt = portrait?.alt || heroRef?.alt || ctx.S.alt('hero.photo') || `${ctx.c.bride.name.en} and ${ctx.c.groom.name.en}`;
    sec.innerHTML = heroHtml({ ...ctx, heroRef, heroAlt }, false);
    watchAspects(sec);
    const swag = sec.querySelector('.pb-orn--swag');
    const ins = [...sec.querySelectorAll('.pb-in')];
    gsap.set([swag, ...ins], { opacity: 0 }); // closed until its entrance
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          tl.to([swag, ...ins], { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        tl.fromTo(swag, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', clearProps: 'transform' }, at);
        ins.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', clearProps: 'transform' }, at + 0.3 + i * 0.12));
        return at + 0.3 + ins.length * 0.12;
      },
    };
  },
};
