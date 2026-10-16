// Public credits page (/credits/): every photo, flower and track with author, licence and source.
// Linked only from the showroom footer, never from an invitation.
import { CREDIT_GROUPS, uploadedMusicItem } from '../core/asset-credits.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const link = (href, text) => (href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text));

const row = (k) => `
  <li class="row">
    <span class="row__title">${link(k.sourceUrl, k.title)}</span>
    <span class="row__by">${k.author ? esc(k.author) : '&nbsp;'}</span>
    <span class="row__lic">${k.license || !k.note ? link(k.licenseUrl, k.license || 'See source') : '&nbsp;'}</span>
    ${k.usedIn?.length ? `<p class="row__used">Used in ${esc(k.usedIn.join(', '))}</p>` : ''}
    ${k.note && !k.license ? `<p class="row__used">${esc(k.note)}</p>` : ''}
  </li>`;

function render() {
  document.getElementById('toc').innerHTML = CREDIT_GROUPS
    .map((g) => `<a href="#${g.id}">${esc(g.title)} <span>${g.items.length}</span></a>`).join('');

  document.getElementById('groups').innerHTML = CREDIT_GROUPS.map((g) => `
    <section class="group" id="${g.id}" aria-labelledby="${g.id}-title">
      <div class="group__head">
        <h2 class="group__title" id="${g.id}-title">${esc(g.title)}</h2>
        <p class="group__count">${g.items.length} ${g.items.length === 1 ? 'item' : 'items'}</p>
      </div>
      <ol class="list">${g.items.map(row).join('')}</ol>
    </section>`).join('');
}
render();

// Songs the planner uploaded to the music library (only the ones offered now), with the credit they entered.
fetch('/api/music', { headers: { Accept: 'application/json' } })
  .then((r) => (r.ok ? r.json() : null))
  .then((out) => {
    const extra = (out?.tracks || []).filter((t) => !t.builtin && t.credit).map(uploadedMusicItem);
    const g = CREDIT_GROUPS.find((x) => x.id === 'music');
    if (!extra.length || !g) return;
    g.items = [...g.items, ...extra];
    render();
  })
  .catch(() => { /* the static list stays */ });
