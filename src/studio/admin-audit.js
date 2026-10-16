// Audit log (super admins only): every change made in the studio, newest first, 50 a page, filtered by person and by
// text. Server: lib/audit.js, GET /api/admin/audit (docs/API.md "Audit log").
import { h, icon, fmtRelative, fill, debounce } from './dom.js';
import { api } from './api.js';

const TZ = 'Asia/Kathmandu';
const whenText = (iso) => new Date(iso).toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const who = (e) => (e.actor === 'owner' ? 'Owner' : e.actorEmail || e.actor);
const result = (s) => (s == null ? h('span.pill.pill--muted', '—')
  : s < 400 ? h('span.pill.pill--ok', { title: `HTTP ${s}` }, 'Done')
    : s === 401 || s === 403 ? h('span.pill.pill--warn', { title: `HTTP ${s}` }, 'Refused')
      : h('span.pill.pill--warn', { title: `HTTP ${s}` }, s >= 500 ? 'Failed' : 'Not done'));

export function auditPage() {
  const st = { actor: '', q: '', page: 1 };
  const body = h('div.tablebox', h('div.rows-skel', { 'aria-hidden': 'true' }, h('div.rows-skel__row', h('span.skel__line', { style: { width: '50%' } }))));
  const person = h('select.input.input--sm', { id: 'au-who', 'aria-label': 'Person', onchange: () => { st.actor = person.value; st.page = 1; load(); } }, h('option', { value: '' }, 'Everyone'));
  const search = h('label.search', icon('search', 15), h('input.input.input--sm', {
    type: 'search', placeholder: 'Search what, target or IP', 'aria-label': 'Search the audit log',
    oninput: debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 250),
  }));
  const info = h('span.toolbar2__note', { 'aria-live': 'polite' });
  const prev = h('button.btn.btn--sm', { type: 'button', onclick: () => { st.page -= 1; load(); } }, icon('left', 14), 'Newer');
  const next = h('button.btn.btn--sm', { type: 'button', onclick: () => { st.page += 1; load(); } }, 'Older', icon('right', 14));
  const pager = h('div.row.audit-pager', info, h('span.audit-pager__gap'), prev, next);
  let seq = 0;

  async function load() {
    const mine = ++seq;
    const qs = new URLSearchParams({ page: String(st.page) });
    if (st.actor) qs.set('actor', st.actor);
    if (st.q) qs.set('q', st.q);
    let r;
    try { r = await api(`/admin/audit?${qs}`); } catch (err) {
      if (mine === seq) fill(body, h('p.notice.notice--error', icon('alert', 16), h('span', err.message)));
      return;
    }
    if (mine !== seq) return;
    const known = new Set([...person.options].map((o) => o.value));
    for (const a of r.actors || []) {
      if (known.has(a.actor)) continue;
      known.add(a.actor);
      person.append(h('option', { value: a.actor }, a.actor === 'owner' ? `Owner (${a.email || ''})` : a.email || a.actor));
    }
    const pages = Math.max(1, Math.ceil(r.total / r.pageSize));
    info.textContent = r.total ? `${r.total.toLocaleString('en-IN')} entr${r.total === 1 ? 'y' : 'ies'} · page ${r.page} of ${pages}` : '';
    prev.disabled = r.page <= 1;
    next.disabled = r.page >= pages;
    pager.hidden = r.total <= r.pageSize;
    if (!r.rows.length) {
      fill(body, h('div.qempty', h('span.qempty__icon', icon('history', 18)), h('div', h('p.qempty__title', st.q || st.actor ? 'Nothing matches' : 'Nothing yet'),
        h('p.qempty__text', st.q || st.actor ? 'Try another person or other words.' : 'Changes made in the studio show up here.'))));
      return;
    }
    fill(body, h('table.dtable.dtable--audit',
      h('caption.sr-only', 'Audit log, newest first'),
      h('thead', h('tr', ['When', 'Who', 'What', 'Result', 'From'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', r.rows.map((e) => h('tr',
        h('td', { 'data-label': 'When', title: whenText(e.at) }, h('span.cell-2', h('span', fmtRelative(e.at)), h('small.tnum', whenText(e.at)))),
        h('td', { 'data-label': 'Who' }, who(e)),
        h('td.audit-what', { 'data-label': 'What' }, h('span.cell-2',
          h('span', e.label || e.action),
          h('small.mono', [e.action, e.target ? ` · ${e.target}` : '', e.fields?.length ? ` · fields: ${e.fields.join(', ')}` : ''].join('')))),
        h('td', { 'data-label': 'Result' }, result(e.status)),
        h('td.tnum', { 'data-label': 'From' }, e.ip || '—'))))));
  }

  load();
  return [
    h('div.toolbar2', h('label.toolbar2__label', { for: 'au-who' }, 'Person'), person, h('div.toolbar2__end', search)),
    body,
    pager,
    h('p.hint', icon('info', 14), 'Kept for at least a year. Passwords and other typed values are never stored, only which fields were sent.'),
  ];
}
