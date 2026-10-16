// Chitra's pieces, shared by its own page (main.js) and by its gate module (gate.js), which can run on another theme's
// page (docs/MIX.md): the indigo book cover with its fish-pair medallion.
import * as motifs from './motifs.js';
import { PAL } from './figures.js';
import { dateOf } from '../../core/i18n.js';

/** The cover medallion: rings of Mithila borders around the fish pair and a lotus. */
export function coverArt(M, PAL) {
  let ring = '';
  for (let i = 0; i < 36; i++) ring += `<g transform="rotate(${i * 10} 300 300)">${M.P('M291,62 L300,36 L309,62Z', i % 2 ? PAL.verm : PAL.turmeric, 1.6)}</g>`;
  let petals = '';
  for (let i = 0; i < 24; i++) petals += `<g transform="rotate(${i * 15} 300 300)">${M.P('M300,92 C290,80 292,66 300,58 C308,66 310,80 300,92Z', i % 2 ? PAL.pink : PAL.turmeric, 1.4)}</g>`;
  return `${ring}<circle cx="300" cy="300" r="240" fill="#ffffff" stroke="#1c1611" stroke-width="3"/>
    <circle cx="300" cy="300" r="226" fill="none" stroke="#1c1611" stroke-width="1.4"/>${petals}
    <circle cx="300" cy="300" r="196" fill="${PAL.indigo}" stroke="#1c1611" stroke-width="2.4"/>
    <circle cx="300" cy="300" r="196" fill="url(#ch-dots)" opacity=".5"/>
    ${M.fishPair(300, 300, 1.75, PAL.verm, PAL.turmeric)}`;
}

/** The book's cover (closed): medallion, kicker, names and date; `buttons` is the open / without-music row. */
export function coverHtml(ctx, buttons) {
  const { c, bi, txt, config } = ctx;
  return `<div class="cover">
      <svg class="cover__art" viewBox="0 0 600 600" aria-hidden="true"><defs>${motifs.motifDefs()}</defs>${coverArt(motifs, PAL)}</svg>
      <div class="cover__text">
        <p class="cover__kicker">${bi(txt('cover.kicker'))}</p>
        <p class="cover__names">${bi(c.bride.name)} <span class="amp">&amp;</span> ${bi(c.groom.name)}</p>
        <p class="cover__date">${bi(dateOf(config.weddingDate))}</p>
        ${buttons}
      </div>
    </div>`;
}
