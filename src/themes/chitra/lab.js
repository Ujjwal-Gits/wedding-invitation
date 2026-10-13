// ?lab — character sheet for checking the figures up close.
import { createGroom, createBride, createMusician, createElder, createGuest, createPriest, figureDefs, play, dance } from './figures.js';

export function lab() {
  document.body.className = 'lab';
  document.body.innerHTML = `<svg width="0" height="0" style="position:absolute"><defs>${figureDefs()}</defs></svg>
  <svg id="sheet" viewBox="0 0 1600 900" style="width:100vw;height:100vh;background:#f2e6cc;display:block"></svg>`;
  const svg = document.getElementById('sheet');
  const q = new URLSearchParams(location.search);
  const set = q.get('lab') || 'couple';
  const cast = {
    couple: () => [createGroom(), createBride(), createBride({ sindoor: true }), createGroom()],
    family: () => [createElder('father'), createElder('mother'), createElder('grandfather'), createElder('grandmother'), createPriest(), createGuest(0), createGuest(1), createGuest(2), createGuest(3), createGuest(4), createGuest(5)],
    dance: () => Array.from({ length: Number(q.get('n') || 12) }, () => [createGroom(), createBride({ mala: true })]).flat(),
    band: () => ['narsingha', 'shehnai', 'damaha', 'tyamko', 'dholaki', 'jhyali'].map((k) => createMusician(k)),
  }[set]();
  const n = cast.length;
  const s = Number(q.get('s') || (n <= 4 ? 2.1 : n <= 6 ? 1.5 : 1.1));
  const ox = Number(q.get('x') || 0), oy = Number(q.get('y') || 0);
  cast.forEach((fig, i) => {
    svg.append(fig.el);
    fig.place(((i + 0.5) / n) * 1600 + ox, 860 + oy, s, i === 3 && set === 'couple' ? -1 : 1);
    const ph = q.get('walk');
    if (ph !== null) fig.walk(Number(ph) + i * 0.13, 1, fig.kind !== 'musician');
    if (fig.instrument) play(fig, Number(q.get('t') || 0));
    if (set === 'dance') {
      const nn = Number(q.get('n') || 12), from = Number(q.get('from') || 0), f = Math.floor(i / 2);
      const T = 1 / 0.32;                          // one full phrase
      fig.place(((f + 0.5) / nn) * 1600, i % 2 ? 880 : 430, 1.1, i % 2 ? -1 : 1);
      dance(fig, ((from + f) / 24) * T, i % 2 ? Math.PI * 0.85 : 0);
    }
  });
  window.cast = cast;
}
