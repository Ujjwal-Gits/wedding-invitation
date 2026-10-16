// Chitra's gate as a module (docs/MIX.md): the indigo cloth cover of the Mithila picture book, with its fish-pair
// medallion, the names and the date, on any theme's page. Its own exit: the cover swings open from the spine like a
// book's, and the mix's neutral fade reveals the page beneath.
import './chitra.css';
import './mix.css';
import manifest from './slots.js';
import { coverHtml } from './parts.js';

export default {
  id: 'chitra',
  manifest,
  fonts: ['Rozha+One', 'Mukta:wght@400;500;600;700'],
  ui: (ctx) => coverHtml(ctx, `<div class="ch-choices" data-mx-ui>
      <button type="button" class="ch-open" data-mx-open disabled>${ctx.bi(ctx.txt('cover.open'))}</button>
      <button type="button" class="ch-quiet" data-mx-quiet disabled>${ctx.bi(ctx.txt('cover.quiet'))}</button>
    </div>`),
  mount(scene, ctx, root) {
    const cover = root.querySelector('.cover');
    return {
      ready: Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]),
      open(tl) {
        tl.to(cover, { rotateY: -96, duration: 1.15, ease: 'power3.inOut', transformOrigin: '0% 50%' }, 0.1);
        return 0.75;
      },
    };
  },
};
