// Responses: totals by ceremony, the replies table, CSV export, delete.
import { h, icon, iconBtn, clear, toast, confirmDialog } from './dom.js';
import { api } from './api.js';

const label = (v, f = '') => (v && (v.en || v.ne)) || f;
const when = (iso) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function responsesView(ctx) {
  const root = h('section.sec.responses', h('p.boot', 'Loading replies…'));
  let state = { replies: [], totals: null };
  let query = '';
  let filter = 'all';

  const load = async () => {
    try {
      state = await api(`/invitations/${ctx.slug}/rsvps`);
      render();
    } catch (err) {
      clear(root).append(h('p.notice.notice--error', err.message));
    }
  };

  const remove = async (r) => {
    const ok = await confirmDialog({ title: 'Delete this reply?', message: `The reply from ${r.name} will be removed permanently.`, confirm: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api(`/invitations/${ctx.slug}/rsvps/${r.id}`, { method: 'DELETE' });
      toast('Reply deleted', 'success');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const render = () => {
    const t = state.totals;
    const titles = Object.fromEntries(t.events.map((e) => [e.id, label(e.title, e.id)]));
    const max = Math.max(1, ...t.events.map((e) => e.guests));

    const rows = state.replies.filter((r) => {
      if (filter === 'yes' && r.attending !== 'yes') return false;
      if (filter === 'no' && r.attending !== 'no') return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.phone.includes(q) || (r.message || '').toLowerCase().includes(q);
    });

    const table = rows.length ? h('div.table-wrap', { tabindex: 0, role: 'region', 'aria-label': 'Replies' },
      h('table.table.table--replies',
        h('thead', h('tr', ['Name', 'Coming?', 'How many', 'Which ceremonies', 'Message', ''].map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', rows.map((r) => h('tr',
          h('td', { 'data-label': 'Name' }, h('b.table__name', r.name), r.phone ? h('a.table__sub', { href: `tel:${r.phone.replace(/[^\d+]/g, '')}` }, r.phone) : null, h('span.table__sub', `Replied ${when(r.at)}`)),
          h('td', { 'data-label': 'Coming?' }, h('span.pill', { class: r.attending === 'yes' ? 'pill--ok' : 'pill--muted' }, r.attending === 'yes' ? 'Yes' : 'No')),
          h('td.num', { 'data-label': 'How many' }, h('b', String(r.guests))),
          h('td', { 'data-label': 'Which ceremonies' }, r.events.length ? r.events.map((id) => titles[id] || id).join(', ') : '—'),
          h('td.table__msg', { 'data-label': 'Message' }, r.message || '—'),
          h('td.table__act', iconBtn('trash', `Delete reply from ${r.name}`, () => remove(r))),
        ))),
      ))
      : h('p.rep__empty', state.replies.length ? 'No replies match.' : 'No replies yet. Share the invitation link and they will appear here.');

    const search = h('input.input', { type: 'search', placeholder: 'Search name, phone, message', 'aria-label': 'Search replies', value: query, oninput: (e) => { query = e.target.value; const pos = e.target.selectionStart; render(); const s = root.querySelector('input[type=search]'); s.focus(); s.setSelectionRange(pos, pos); } });

    clear(root).append(
      h('header.sec__head.sec__head--row',
        h('div', h('h1.sec__title', 'Replies'), h('p.sec__intro', 'Everyone who has answered the invitation, newest first.')),
        h('div.sec__actions',
          iconBtn('refresh', 'Refresh replies', load),
          h('a.btn', { href: `/api/invitations/${encodeURIComponent(ctx.slug)}/rsvps.csv`, download: `rsvps-${ctx.slug}.csv` }, icon('download', 16), 'Export CSV'),
        ),
      ),
      h('dl.stats',
        h('div.stat', h('dt', 'Guests coming'), h('dd', String(t.guests))),
        h('div.stat', h('dt', 'Replies'), h('dd', String(t.replies))),
        h('div.stat', h('dt', 'Families coming'), h('dd', String(t.attendingParties))),
        h('div.stat', h('dt', 'Not coming'), h('dd', String(t.declined))),
        h('div.stat', h('dt', 'Vegetarian meals'), h('dd', String(t.veg))),
      ),
      h('div.group',
        h('h3.group__title', 'Who is coming to each ceremony'),
        t.events.length ? h('table.table.table--events',
          h('thead', h('tr', h('th', { scope: 'col' }, 'Ceremony'), h('th.num', { scope: 'col' }, 'Families'), h('th.num', { scope: 'col' }, 'Guests'), h('th', { scope: 'col', class: 'bars-col' }, h('span.sr-only', 'Share')))),
          h('tbody', t.events.map((e) => h('tr',
            h('th', { scope: 'row' }, label(e.title, e.id)),
            h('td.num', String(e.parties)),
            h('td.num', h('b', String(e.guests))),
            h('td.bars-col', h('span.bar', { 'aria-hidden': 'true' }, h('span.bar__fill', { style: { transform: `scaleX(${e.guests / max})` } }))),
          ))),
        ) : h('p.rep__empty', 'No ceremonies.'),
      ),
      (() => {
        const notes = state.replies.filter((r) => r.message);
        return notes.length ? h('div.group',
          h('h3.group__title', `Messages from guests (${notes.length})`),
          h('ul.notes', notes.map((r) => h('li.note',
            h('p.note__text', r.message),
            h('p.note__who', h('b', r.name), ' · ', r.attending === 'yes' ? `coming, ${r.guests} ${r.guests === 1 ? 'guest' : 'guests'}` : 'cannot come', ' · ', when(r.at)))))) : null;
      })(),
      h('div.group',
        h('div.toolbar',
          h('h3.group__title', 'Replies'),
          h('div.toolbar__right',
            h('div.seg', { role: 'group', 'aria-label': 'Filter' },
              [['all', 'Everyone'], ['yes', 'Coming'], ['no', 'Not coming']].map(([v, txt]) => h('button.seg__btn', { type: 'button', 'aria-pressed': String(filter === v), onclick: () => { filter = v; render(); } }, txt))),
            h('label.search', icon('search', 16), search),
          ),
        ),
        table,
      ),
    );
  };

  load();
  return root;
}
