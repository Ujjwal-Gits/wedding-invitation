// Dhaka's first screen as a module (docs/MIX.md): the welcome among real flowers (a heavy bouquet top left and
// bottom right, light accents in the other corners) around शुभ विवाह, the couple's photo in a mat, the names, both
// dates and the place, as the first screen of any theme's page. Its entrance: the bouquets bloom outward into their
// corners, the photo settles and the words follow. (On Dhaka's own page the flowers gather from the envelope's table.)
import './dhaka.css';
import './mix.css';
import manifest from './slots.js';
import { FLOWER_CREDITS } from './flowers.js'; // the art it shows (CC BY / BY-SA): mix lists it with the host's credits
import credits from '../../generated/credits.json';
import { view } from '../../photos.js';
import { dateOf, bsDateOf } from '../../core/i18n.js';
import { FRAME_WIDE, FRAME_TALL, tall, frameFlowers, paperVars, welcomeClosed, welcomeEnter } from './parts.js';

const dims = Object.fromEntries(credits.filter((k) => k.width && k.height).map((k) => [k.slot, k.width / k.height]));
const ratioOf = (ref) => (typeof ref === 'string' && dims[ref]) || (ref && typeof ref === 'object' && ref.w && ref.h ? ref.w / ref.h : 3 / 4);
const focal = (ref) => { const [x, y] = (ref && typeof ref === 'object' && ref.focal) || view(ref).focal || [0.5, 0.5]; return `${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`; };
const has = (o) => Boolean(o && (String(o.en || '').trim() || String(o.ne || '').trim()));

export default {
  id: 'dhaka',
  manifest,
  credits: FLOWER_CREDITS,
  fonts: ['Libre+Caslon+Display', 'Libre+Caslon+Text:ital,wght@0,400;0,700;1,400', 'Martel:wght@400;600;700'],
  mount(sec, ctx) {
    const { c, config, esc, bi, txt, S } = ctx;
    const mobile = window.innerWidth < 760;
    paperVars(sec.style, { mobile });
    const FRAME = tall() ? FRAME_TALL : FRAME_WIDE;
    const ref = S.img('welcome.photo');
    const r = ratioOf(ref);
    const wDate = config.weddingDate;
    const place = has(config.city) ? config.city : ctx.mainEv?.venue;
    const sm = ref ? ctx.photoUrl(ref, 'sm') : '';
    const lg = ref ? ctx.photoUrl(ref, 'lg') : '';
    sec.innerHTML = `
      <div class="welcome">
        <div class="welcome__flowers" aria-hidden="true">${frameFlowers(FRAME)}</div>
        <div class="welcome__inner">
          <p class="welcome__kicker w-in" lang="ne">${esc(txt('welcome.kicker').ne)}</p>
          ${ref ? `<figure class="welcome__photo"><span class="mat mat--welcome"><span class="ph__img" style="aspect-ratio:${r.toFixed(4)}"><img src="${esc(sm)}" srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w" sizes="${mobile ? '70vw' : '30vw'}" alt="${esc(S.alt('welcome.photo') || `${c.bride.name.en} and ${c.groom.name.en}`)}" style="object-position:${focal(ref)}" fetchpriority="high" decoding="async" /></span></span></figure>` : ''}
          <h1 class="welcome__names w-in">${bi(c.bride.name)} <span class="amp" aria-hidden="true">&amp;</span> ${bi(c.groom.name)}</h1>
          <p class="welcome__line w-in">${bi(txt('welcome.line'))}</p>
          <p class="welcome__date w-in">${bi(dateOf(wDate))}<span class="welcome__bs">${bi(config.weddingDateBS || bsDateOf(wDate))}</span></p>
          ${has(place) ? `<p class="welcome__city w-in">${bi(place)}</p>` : ''}
        </div>
      </div>`;
    const welcome = sec.querySelector('.welcome');
    welcomeClosed(welcome, FRAME, ctx.reduced);
    return {
      enter: (tl, at) => welcomeEnter(tl, at, welcome, FRAME, ctx.reduced),
    };
  },
};
