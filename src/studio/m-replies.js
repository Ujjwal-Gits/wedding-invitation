// Replies for one invitation: who is coming, counts per ceremony, messages, the full list and CSV export.
// Also used by the owner's Replies module.
import { h, icon, iconBtn, clear, toast, confirmDialog, skeleton, emptyState, fill } from './dom.js';
import { api } from './api.js';

const label = (v, f = '') => (v && (v.en || v.ne)) || f;
export const when = (iso) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const stat = (k, v, sub, cls = '') => h('div.stat', { class: cls }, h('dt.stat__k', k), h('dd.stat__v', String(v)), sub ? h('dd.stat__sub', sub) : null);

export function repliesView(slug, { onLoad } = {}) {
  const root = h('div.stack', h('section.card', skeleton(5)));
  let state = null;
  let query = '';
  let filter = 'all';

  const load = async () => {
    try {
      state = await api(`/invitations/${slug}/rsvps`);
      onLoad?.(state);
      render();
    } catch (err) {
      fill(root, h('section.card', emptyState('alert', 'Replies could not be loaded', err.message, h('button.btn', { type: 'button', onclick: load }, icon('refresh', 16), 'Try again'))));
    }
  };

  const remove = async (r) => {
    if (!(await confirmDialog({ title: 'Delete this reply?', message: `The reply from ${r.name} will be removed permanently.`, confirm: 'Delete', danger: true }))) return;
    try {
      await api(`/invitations/${slug}/rsvps/${r.id}`, { method: 'DELETE' });
      toast('Reply deleted', 'success');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const render = () => {
    const t = state.totals;
    const replies = state.replies || [];
    if (!replies.length) {
      fill(root, h('section.card', emptyState('chat', 'No replies yet', 'Once you share the invitation, every reply shows up here: who is coming, how many, and their messages.')));
      return;
    }
    const titles = Object.fromEntries((t.events || []).map((e) => [e.id, label(e.title, e.id)]));
    const max = Math.max(1, ...(t.events || []).map((e) => e.guests));
    const rows = replies.filter((r) => {
      if (filter !== 'all' && r.attending !== filter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return r.name.toLowerCase().includes(q) || (r.phone || '').includes(q) || (r.message || '').toLowerCase().includes(q);
    });
    const list = h('ul.rlist', rows.map((r) => h('li.ritem',
      h('span.ritem__avatar', { class: r.attending === 'yes' ? 'is-yes' : '' }, (r.name || '?').trim().slice(0, 1).toUpperCase()),
      h('div.ritem__main',
        h('p.ritem__head', h('b', r.name), h('span.pill', { class: r.attending === 'yes' ? 'pill--ok' : 'pill--muted' }, r.attending === 'yes' ? `Coming · ${r.guests}` : 'Can’t come')),
        h('p.ritem__meta', r.phone ? h('a', { href: `tel:${r.phone.replace(/[^\d+]/g, '')}` }, r.phone) : null, r.events?.length ? h('span', r.events.map((id) => titles[id] || id).join(', ')) : null, r.meal ? h('span', r.meal === 'veg' ? 'Vegetarian' : label(r.meal, r.meal)) : null, h('span', when(r.at))),
        r.message ? h('p.ritem__msg', r.message) : null),
      iconBtn('trash', `Delete the reply from ${r.name}`, () => remove(r)))));
    const search = h('input.input', { type: 'search', placeholder: 'Search name, phone or message', 'aria-label': 'Search replies', value: query, oninput: (e) => { query = e.target.value; const pos = e.target.selectionStart; render(); const s = root.querySelector('input[type=search]'); s.focus(); s.setSelectionRange(pos, pos); } });
    fill(root, 
      h('dl.stats',
        stat('Guests coming', t.guests, `${t.attendingParties} famil${t.attendingParties === 1 ? 'y' : 'ies'}`, 'stat--accent'),
        stat('Replies', t.replies),
        stat('Can’t come', t.declined),
        stat('Vegetarian', t.veg ?? 0)),
      (t.events || []).length ? h('section.card',
        h('header.card__head', h('h2.card__title', 'Per ceremony')),
        h('ul.bars', t.events.map((e) => h('li.bars__row',
          h('span.bars__name', label(e.title, e.id)),
          h('span.bars__track', { 'aria-hidden': 'true' }, h('span.bars__fill', { style: { transform: `scaleX(${e.guests / max})` } })),
          h('span.bars__num', h('b', String(e.guests)), ` guest${e.guests === 1 ? '' : 's'} · ${e.parties} famil${e.parties === 1 ? 'y' : 'ies'}`))))) : null,
      h('section.card',
        h('div.toolbar',
          h('div.seg', { role: 'group', 'aria-label': 'Show' },
            [['all', 'Everyone'], ['yes', 'Coming'], ['no', 'Can’t come']].map(([v, txt]) => h('button.seg__btn', { type: 'button', 'aria-pressed': String(filter === v), onclick: () => { filter = v; render(); } }, txt))),
          h('label.search', icon('search', 16), search),
          h('div.toolbar__right',
            iconBtn('refresh', 'Refresh', load),
            h('a.btn.btn--sm', { href: `/api/invitations/${encodeURIComponent(slug)}/rsvps.csv`, download: `replies-${slug}.csv` }, icon('download', 15), 'Export CSV'))),
        rows.length ? list : h('p.muted.pad', 'No replies match.')));
  };
  load();
  return root;
}

export function repliesModule(ctx) { return repliesView(ctx.slug); }
