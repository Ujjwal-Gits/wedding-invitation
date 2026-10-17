// The international home page's script (/intl-preview/): the public site's own script and scroll scenes
// (src/site/site.js, motion.js), the sage palette over it (intl.css), and the plans in US dollars from the live plans.
import './site.js';
import './intl.css';
import { $$ } from './common.js';
import { loadSite } from './api.js';
import { intlPlans, usdText } from './intl-plans.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** the plan cards and every "from $49", from GET /api/site (the built cards are the fallback) */
async function refreshPlans() {
  const site = await loadSite();
  const plans = intlPlans(site.plans);
  if (!plans.length) return;
  for (const box of $$('[data-plans-usd]')) {
    for (const p of plans) {
      const card = box.querySelector(`[data-plan-id="${p.id}"]`);
      if (!card) continue;
      const num = card.querySelector('.plan__num');
      if (num) num.textContent = usdText(p.usd);
      const feats = card.querySelector('.plan__feats');
      if (feats && p.features.length) feats.innerHTML = p.features.map((f) => `<li>${esc(f)}</li>`).join('');
    }
  }
  for (const n of $$('[data-usd-from]')) {
    const p = plans.find((x) => x.id === n.dataset.usdFrom);
    if (p) n.textContent = n.classList.contains('dcard__price') ? `from ${usdText(p.usd)}` : usdText(p.usd);
  }
}
refreshPlans().catch(() => {});

/** the designs rail: the style chips show only the designs in that style, then the rail measures itself again.
 *  While the rail is pinned we first go back to its start, so the shorter (or longer) row never jumps. */
function initGallery() {
  const sec = document.getElementById('designs');
  const chips = $$('.gal-chips [data-style]');
  const cards = $$('#gal > li');
  if (!sec || !chips.length || !cards.length) return;
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const style = chip.dataset.style;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      cards.forEach((card) => {
        const on = style === 'all' || card.dataset.style === style;
        card.hidden = !on;
        if (on) { card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in'); } // restart the fade
      });
      const view = sec.querySelector('.rail__view');
      if (view) view.scrollLeft = 0; // phones: the swipe row starts again at the first card
      if (!sec.classList.contains('js-rail')) return; // no pinned scene (phones, reduced motion)
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        const st = ScrollTrigger.getAll().find((t) => t.trigger === sec);
        if (st && window.scrollY > st.start) window.scrollTo({ top: st.start, behavior: 'instant' });
        ScrollTrigger.refresh();
      }).catch(() => {});
    });
  }
}
initGallery();
