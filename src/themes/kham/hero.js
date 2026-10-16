// Kham's first screen as a module (docs/MIX.md): the folded stationery card on handmade lokta paper (॥ श्री गणेशाय
// नमः ॥, the endless knot, शुभ विवाह, the hosts; then the names, both dates, one line and the city), with the couple's
// print beside it on wide screens, as the first screen of any theme's page. Its entrance: the card rises into place
// and unfolds on its crease, and the print slides out from behind it. (On Kham's own page the card comes out of the
// envelope first; the envelope is the card's own opening, so it does not travel on its own.)
import './kham.css';
import './mix.css';
import manifest from './slots.js';
import credits from '../../generated/credits.json';
import { dateOf, bsDateOf } from '../../core/i18n.js';
import { paperTiles, deckle } from './paper.js';
import { computeLayout } from './envelope.js';
import { cardHtml, cardFold, fitNames, layCard, cardClosed, cardEnter } from './parts.js';

const dims = Object.fromEntries(credits.map((k) => [String(k.file || k.slot).replace(/\.(jpe?g|png|webp)$/i, ''), [k.width, k.height]]));
const aspectOf = (ref) => {
  if (typeof ref === 'string' && dims[ref]?.[0]) return dims[ref][0] / dims[ref][1];
  if (ref && typeof ref === 'object' && ref.w && ref.h) return ref.w / ref.h;
  return 0;
};

export default {
  id: 'kham',
  manifest,
  fonts: ['Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500', 'Instrument+Sans:wght@400;500;600', 'Laila:wght@500;600', 'Noto+Serif+Devanagari:wght@400;500;600'],
  mount(sec, ctx) {
    const { c, config, bi, esc, txt, S } = ctx;
    const mainAD = dateOf(config.weddingDate);
    const mainBS = bsDateOf(config.weddingDate, config.weddingDateBS);
    const names = () => `<span class="kh-n">${bi(c.bride.name)}</span> <span class="kh-amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span> <span class="kh-n">${bi(c.groom.name)}</span>`;
    const ref = S.img('hero.print');
    const ar = aspectOf(ref) || 0.8;
    const printAr = ref ? (ar + 0.06) / 1.08 : 0;
    const sm = ref ? ctx.photoUrl(ref, 'sm') : '';
    const lg = ref ? ctx.photoUrl(ref, 'lg') : '';
    sec.innerHTML = `<div class="kh-scene">
        ${cardHtml({ bi, esc, txt, config, names, mainAD, mainBS })}
        ${ref ? `<div class="kh-heroprint"><figure class="kh-print" data-orient="${ar > 1.05 ? 'land' : ar < 0.95 ? 'port' : 'sq'}"><span class="kh-mount" data-deckle data-seed="7" style="--ar:${ar.toFixed(4)}"><img src="${esc(sm)}" ${sm !== lg ? `srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w"` : ''} sizes="(max-width: 1200px) 34vw, 420px" alt="${esc(S.alt('hero.print') || `${c.bride.name.en} and ${c.groom.name.en}`)}" fetchpriority="high" decoding="async" /></span></figure></div>` : ''}
      </div>`;
    const card = sec.querySelector('.kh-card');
    const print = sec.querySelector('.kh-heroprint');
    const fold = cardFold(card);
    const parts = { card, print, fold, reduced: ctx.reduced };
    // the card is laid out for the screen, as on Kham's own page (the section is one screen tall)
    const lay = () => {
      sec.style.height = `${window.innerHeight}px`;
      layCard(computeLayout(window.innerWidth, window.innerHeight, { printAr }), card, print, fold);
      fitNames(sec.querySelector('.kh-names'));
    };
    lay();
    document.fonts?.ready.then(() => fitNames(sec.querySelector('.kh-names')));
    sec.querySelectorAll('[data-deckle]').forEach((el) => deckle(el));
    cardClosed(parts);
    // the lokta papers are made in code (a moment's work): the card shows its plain colour until they are ready
    paperTiles([
      { base: [247, 243, 235] },
      { base: [252, 250, 245], fibreLight: 'rgba(255,255,255,0.7)', fibreDark: 'rgba(120,96,70,0.07)' },
    ]).then(([page, cardTex]) => {
      sec.style.setProperty('--kh-tex-page', `url("${page}")`);
      sec.style.setProperty('--kh-tex-card', `url("${cardTex}")`);
    }).catch(() => {});
    let w = window.innerWidth;
    const onResize = () => { if (window.innerWidth === w) return; w = window.innerWidth; lay(); };
    window.addEventListener('resize', onResize);
    return {
      enter: (tl, at) => cardEnter(tl, at, parts),
      destroy() { window.removeEventListener('resize', onResize); },
    };
  },
};
