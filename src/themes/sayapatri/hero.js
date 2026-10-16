// Sayapatri's welcome as a module (docs/MIX.md): the names large in Cormorant beside one feature photograph of the
// couple, whole, in a white mat with a single marigold cluster at its corner, on white, as the first screen of any
// theme's page. Its entrance: the words and the photograph rise in turn.
import './sayapatri.css';
import './mix.css';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import manifest from './slots.js';
import credits from './flora-credits.json'; // the art it shows (CC BY / BY-SA): mix lists it with the host's credits
import { guestEvents } from '../../core/finale.js';
import { heroHtml, weddingDayOf } from './parts.js';

gsap.registerPlugin(CustomEase);
CustomEase.create('spOut', '0.2,0.7,0.2,1');

const keyOf = (ref) => (typeof ref === 'string' ? ref : ref?.lg);

export default {
  id: 'sayapatri',
  manifest,
  credits,
  fonts: ['Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500', 'DM+Sans:opsz,wght@9..40,400..600', 'Noto+Serif+Devanagari:wght@400..600', 'Mukta:wght@400;500;600'],
  mount(sec, ctx) {
    const heroRef = ctx.S.img('hero.photo');
    const portrait = (ctx.c.portraits || []).find((p) => p?.photo && keyOf(p.photo) === keyOf(heroRef));
    const heroAlt = portrait?.alt || ctx.S.alt('hero.photo') || '';
    sec.innerHTML = heroHtml({ ...ctx, weddingDay: weddingDayOf(ctx.config, guestEvents()), heroRef, heroAlt }, false);
    const ins = [...sec.querySelectorAll('[data-sp-in]')];
    gsap.set(ins, { autoAlpha: 0 }); // closed until its entrance
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          tl.to(ins, { autoAlpha: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        tl.fromTo(ins, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'spOut', stagger: 0.06, clearProps: 'transform' }, at);
        return at + ins.length * 0.06;
      },
    };
  },
};
