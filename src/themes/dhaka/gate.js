// Dhaka's gate as a module (docs/MIX.md): the Dhaka-tied, wax-sealed envelope resting among roses and marigolds on
// textured paper, on any theme's page. Its own exit: the seal breaks, the Dhaka band falls away, the flap opens on
// the woven lining and the couple's photo rises out; the envelope drops away, the flowers drift off the table and the
// paper clears; then the mix's neutral fade reveals the page beneath. (On Dhaka's own page the photo flies into the
// welcome frame and the flowers gather around it instead; that hand-off needs Dhaka's own first screen.)
import './dhaka.css';
import './mix.css';
import { gsap } from 'gsap';
import manifest from './slots.js';
import credits from '../../generated/credits.json';
import { view } from '../../photos.js';
import { FRAME_WIDE, TABLE_WIDE, TABLE_TALL, tall, flower, firstGrapheme, sealSvg, paperVars } from './parts.js';

const FONTS = ['Libre+Caslon+Display', 'Libre+Caslon+Text:ital,wght@0,400;0,700;1,400', 'Martel:wght@400;600;700'];
const dims = Object.fromEntries(credits.filter((k) => k.width && k.height).map((k) => [k.slot, k.width / k.height]));
const ratioOf = (ref) => (typeof ref === 'string' && dims[ref]) || (ref && typeof ref === 'object' && ref.w && ref.h ? ref.w / ref.h : 3 / 4);
const focal = (ref) => { const [x, y] = (ref && typeof ref === 'object' && ref.focal) || view(ref).focal || [0.5, 0.5]; return `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`; };

export default {
  id: 'dhaka',
  manifest,
  fonts: FONTS,
  ui: (ctx) => `<div class="env-gate__ctl" data-mx-ui>
      <button type="button" class="env-gate__tap" data-mx-open disabled>${ctx.bi(ctx.txt('gate.open'))}</button>
      <button type="button" class="link-quiet" data-mx-quiet disabled>${ctx.bi(ctx.txt('gate.quiet'))}</button>
    </div>`,
  mount(scene, ctx, root) {
    const { c, esc, bi, txt } = ctx;
    paperVars(root.style, { mobile: window.innerWidth < 760, liningUrl: ctx.S.img('envelope.lining') ? ctx.photoUrl(ctx.S.img('envelope.lining'), 'sm') : '' });
    const ref = ctx.S.img('welcome.photo');
    const r = ratioOf(ref);
    const initials = `${firstGrapheme(c.bride.name.ne || c.bride.name.en)}·${firstGrapheme(c.groom.name.ne || c.groom.name.en)}`;
    const amp = '<span class="amp" aria-hidden="true">&amp;</span>';
    scene.innerHTML = `
      <div class="dk-gate__paper"></div>
      <div class="dk-table">${FRAME_WIDE.map(([name]) => flower(name, 'tf')).join('')}</div>
      <div class="env-gate">
        <div class="env">
          <div class="env__back"><i class="env__lining" aria-hidden="true"></i></div>
          ${ref ? `<div class="dk-card"><span class="mat"><span class="ph__img" style="aspect-ratio:${r.toFixed(4)}"><img src="${esc(ctx.photoUrl(ref, 'sm'))}" alt="" style="object-position:${focal(ref)}" decoding="async" /></span></span></div>` : ''}
          <div class="env__front">
            <svg class="env__folds" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 100 L50 52 L100 100" fill="none" stroke="rgba(90,70,45,.18)" stroke-width=".25" vector-effect="non-scaling-stroke"/></svg>
            <div class="env__text">
              <p class="env__kicker">${bi(txt('env.kicker'))}</p>
              <p class="env__names"><span class="sr-only">${esc(c.bride.name.en)} and ${esc(c.groom.name.en)}</span><span aria-hidden="true">${bi(c.bride.name)} ${amp} ${bi(c.groom.name)}</span></p>
              <p class="env__line">${bi(txt('gate.line'))}</p>
            </div>
          </div>
          <div class="env__flap"><div class="env__flap-face env__flap-face--front"></div><div class="env__flap-face env__flap-face--back"><i class="env__lining" aria-hidden="true"></i></div></div>
          <i class="env__band env__band--l" aria-hidden="true"></i><i class="env__band env__band--r" aria-hidden="true"></i>
          <button type="button" class="seal" aria-label="${esc(txt('gate.open').en)}">
            <span class="seal__half seal__half--l">${sealSvg('mxl', initials, esc)}</span><span class="seal__half seal__half--r">${sealSvg('mxr', initials, esc)}</span>
          </button>
        </div>
      </div>`;
    const q = (s) => scene.querySelector(s);
    const env = q('.env');
    const card = q('.dk-card');
    const flowers = [...scene.querySelectorAll('.tf')];
    gsap.set(q('.env__flap'), { rotationX: 0, transformPerspective: 1400 });

    // the photo fills the envelope's pocket at its own proportions; the flowers lie on the table around it
    let opened = false;
    const layout = () => {
      if (opened) return;
      const er = env.getBoundingClientRect();
      if (card) {
        const pad = Math.min(15, Math.max(8, window.innerWidth * 0.011));
        const h = Math.min(er.height * 0.86 - 2 * pad, (er.width * 0.8 - 2 * pad) / r);
        Object.assign(card.querySelector('.ph__img').style, { height: `${h.toFixed(1)}px`, width: `${(h * r).toFixed(1)}px` });
      }
      const T = tall() ? TABLE_TALL : TABLE_WIDE;
      const cx = er.left + er.width / 2;
      const cy = er.top + er.height / 2;
      flowers.forEach((el, i) => {
        const [tx, ty, tw, rot] = T[i % T.length];
        Object.assign(el.style, { left: `${(cx + tx * er.width).toFixed(1)}px`, top: `${(cy + ty * er.width).toFixed(1)}px`, width: `${(tw * er.width).toFixed(1)}px`, zIndex: el.classList.contains('fl--leaf') ? '1' : String(2 + (i % 3)) });
        gsap.set(el, { xPercent: -50, yPercent: -50, x: 0, y: 0, rotation: rot });
      });
    };
    layout();
    let raf = 0;
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); };
    window.addEventListener('resize', onResize);
    const imgs = [...scene.querySelectorAll('img')];
    return {
      ready: Promise.all(imgs.map((im) => im.decode?.().catch(() => {}))),
      taps: [q('.seal')],
      open(tl) {
        opened = true;
        gsap.set(flowers, { willChange: 'transform' }); // only while they move (the gate is removed after)
        const flap = q('.env__flap');
        const vh = window.innerHeight;
        tl.to(q('.seal'), { scale: 0.93, duration: 0.12, ease: 'power2.out' }, 0)
          // the seal breaks in two, the Dhaka band falls away to both sides
          .to(q('.seal__half--l'), { x: -34, y: 70, rotation: -28, opacity: 0, duration: 0.7, ease: 'power2.in' }, 0.14)
          .to(q('.seal__half--r'), { x: 34, y: 76, rotation: 24, opacity: 0, duration: 0.7, ease: 'power2.in' }, 0.14)
          .to(q('.env__band--l'), { xPercent: -18, y: 26, rotation: -4, opacity: 0, duration: 0.7, ease: 'power2.in' }, 0.24)
          .to(q('.env__band--r'), { xPercent: 18, y: 26, rotation: 4, opacity: 0, duration: 0.7, ease: 'power2.in' }, 0.24)
          // the flap opens on the woven lining
          .to(flap, { rotationX: 180, duration: 0.8, ease: 'power2.inOut' }, 0.5)
          .set(flap, { zIndex: 0 }, 0.92)
          // the envelope drops away below the photo
          .to([q('.env__back'), q('.env__front'), flap], { y: vh * 0.7, rotation: 3, opacity: 0, duration: 0.9, ease: 'power2.in' }, card ? 1.6 : 1.2);
        if (card) {
          const ch = card.offsetHeight;
          // the couple's photo rises out of the envelope and lifts toward the guest as the paper clears
          tl.to(card, { y: -ch * 0.62, duration: 0.8, ease: 'power2.out' }, 1.0)
            .to(card, { y: -ch * 0.62 - 26, scale: 1.05, duration: 1.3, ease: 'sine.out' }, 1.8);
        }
        // the flowers are carried off the table, outward past the edges, bouquet by bouquet (never faded: a
        // half-transparent bloom looks wilted)
        const er = env.getBoundingClientRect();
        const cx = er.left + er.width / 2;
        const cy = er.top + er.height / 2;
        const far = Math.max(window.innerWidth, vh) * 0.85;
        const away = (el) => {
          const b = el.getBoundingClientRect();
          const dx = b.left + b.width / 2 - cx; const dy = b.top + b.height / 2 - cy; const d = Math.hypot(dx, dy) || 1;
          return [(dx / d) * far, (dy / d) * far];
        };
        tl.to(flowers, {
          x: (i, el) => away(el)[0], y: (i, el) => away(el)[1], rotation: '+=14',
          duration: 1.2, ease: 'power2.in', stagger: { each: 0.02, from: 'center' },
        }, 1.2)
          .to(q('.dk-gate__paper'), { opacity: 0, duration: 0.9, ease: 'power1.inOut' }, 1.9);
        return card ? 2.3 : 2.0;
      },
      destroy() { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf); },
    };
  },
};
