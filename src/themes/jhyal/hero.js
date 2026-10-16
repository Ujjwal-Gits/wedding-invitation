// Jhyal's first screen as a module (docs/MIX.md): शुभ विवाह in Tiro Devanagari, the names and one warm line, beside
// the couple framed in a smaller carved window built around their photograph's own shape, on ivory lokta paper, as the
// first screen of any theme's page. Its entrance: the invocation, the title, the names, the line and the window rise
// in turn.
import './jhyal.css';
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import { ensureDefs, heroHtml, heroGroups, fixPhotoWindows, keyOf } from './parts.js';

export default {
  id: 'jhyal',
  manifest,
  fonts: ['Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,400', 'Noto+Serif+Devanagari:wght@300;400;500;600', 'Tiro+Devanagari+Hindi', 'Mukta:wght@400;500;600'],
  mount(sec, ctx) {
    ensureDefs();
    const ref = ctx.S.img('couple.lead');
    const portrait = (ctx.c.portraits || []).find((p) => p?.photo && keyOf(p.photo) === keyOf(ref));
    const alt = portrait?.alt || (ref && typeof ref === 'object' && ref.alt) || ctx.S.alt('couple.lead') || `${ctx.c.bride.name.en} and ${ctx.c.groom.name.en}`;
    sec.innerHTML = heroHtml({ ...ctx, lead: ref ? { photo: ref, alt } : null }, false);
    fixPhotoWindows(sec);
    const groups = heroGroups(sec);
    gsap.set(groups.flat(), { opacity: 0 }); // closed until its entrance
    return {
      enter(tl, at) {
        if (ctx.reduced) {
          tl.to(groups.flat(), { opacity: 1, duration: 0.5 }, at);
          return at + 0.5;
        }
        const step = document.documentElement.clientWidth < 700 ? 0.12 : 0.15;
        groups.forEach((g, i) => tl.fromTo(g, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', clearProps: 'transform' }, at + i * step));
        return at + groups.length * step;
      },
    };
  },
};
