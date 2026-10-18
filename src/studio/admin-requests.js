// Change requests (staff with 'orders' or 'invitations'): couples asking to change a locked name or the wedding date
// (the event lock, src/core/event-lock.js). Approve puts the new value on the invitation (draft, live version and
// lock); Decline sends the couple a note. Both are in the audit log. Server: lib/change-requests.js.
import { h, icon, toast, openDialog, fmtRelative, fmtDate, fill } from './dom.js';
import { api } from './api.js';
import { requestPill } from './lock-ui.js';

const show = (r, v) => (r.field === 'weddingDate' && /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? fmtDate(`${v}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' }) : v || '(empty)');

export function changeRequestsPage(ctx) {
  let filter = 'open';
  let all = [];
  const body = h('div.tablebox', h('div.rows-skel', { 'aria-hidden': 'true' }, h('div.rows-skel__row', h('span.skel__line', { style: { width: '50%' } }))));
  const tabs = h('div.seg.seg--sm', { role: 'group', 'aria-label': 'Show' },
    [['open', 'Waiting'], ['done', 'Answered'], ['all', 'All']].map(([v, t]) => h('button.seg__btn', { type: 'button', 'aria-pressed': String(v === filter), onclick: (e) => {
      filter = v;
      for (const b of tabs.children) b.setAttribute('aria-pressed', String(b === e.currentTarget));
      draw();
    } }, t)));

  async function load() {
    try {
      const r = await api('/admin/change-requests');
      all = r.requests || [];
      ctx.shell?.setBadge('requests', r.open ? String(r.open) : '');
      draw();
    } catch (err) { fill(body, h('p.notice.notice--error', icon('alert', 16), h('span', err.message))); }
  }

  async function act(r, kind) {
    let note = '';
    if (kind === 'decline') {
      const text = h('textarea.input', { id: 'crq-note', rows: 3, maxlength: 500, placeholder: 'Optional: why, or what they can do instead. The couple sees this.' });
      const ok = await new Promise((resolve) => {
        let yes = false;
        const d = openDialog({
          title: 'Decline this request?',
          body: [h('p.dialog__text', `${r.label} on ${r.slug}: “${show(r, r.old)}” to “${show(r, r.value)}”.`), h('div.field', h('label.label', { for: 'crq-note' }, 'Note to the couple'), text)],
          actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), h('button.btn.btn--danger', { type: 'button', onclick: () => { yes = true; d.close(); } }, 'Decline')],
          onClose: () => resolve(yes),
        });
      });
      if (!ok) return;
      note = text.value.trim();
    }
    try {
      await api(`/admin/change-requests/${r.id}/${kind}`, { method: 'POST', ...(kind === 'decline' ? { body: { note } } : {}) });
      toast(kind === 'approve' ? 'Changed on the invitation. The couple gets an email.' : 'Declined. The couple gets an email.', 'success');
    } catch (err) { toast(err.message, 'error'); }
    load();
  }

  function draw() {
    const list = all.filter((r) => (filter === 'all' ? true : filter === 'open' ? r.status === 'open' : r.status !== 'open'));
    if (!list.length) {
      fill(body, h('div.qempty', h('span.qempty__icon', icon('lock', 18)), h('div', h('p.qempty__title', filter === 'open' ? 'Nothing waiting' : 'Nothing yet'),
        h('p.qempty__text', 'After a couple publishes, their names and wedding date are locked to that wedding. Requests to change them show up here.'))));
      return;
    }
    fill(body, h('table.dtable',
      h('caption.sr-only', 'Change requests, waiting first'),
      h('thead', h('tr', ['Invitation', 'Customer', 'Change', 'Reason', 'Status', ''].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', list.map((r) => h('tr',
        h('td', { 'data-label': 'Invitation' }, h('span.cell-2', h('a', { href: `#/i/${r.slug}/couple` }, r.slug), h('small', fmtRelative(r.createdAt)))),
        h('td', { 'data-label': 'Customer' }, r.customerEmail ? h('span.cell-2', h('span', r.customerName || r.customerEmail), h('small', r.customerEmail)) : h('span.muted', 'Couple link')),
        h('td', { 'data-label': 'Change' }, h('div.crq__row', h('small', r.label), h('span.crq__change', `${show(r, r.old)} → ${show(r, r.value)}`))),
        h('td', { 'data-label': 'Reason', style: { whiteSpace: 'normal', maxWidth: '280px' } }, r.reason, r.note ? h('small', { style: { display: 'block' } }, `Note: ${r.note}`) : null),
        h('td', { 'data-label': 'Status' }, requestPill(r), r.decidedBy ? h('small', { style: { display: 'block' } }, `${r.decidedBy} · ${fmtRelative(r.decidedAt)}`) : null),
        h('td', { 'data-label': '' }, r.status === 'open' ? h('div.crq__acts',
          h('button.btn.btn--sm.btn--primary', { type: 'button', onclick: () => act(r, 'approve') }, icon('check', 14), 'Approve'),
          h('button.btn.btn--sm', { type: 'button', onclick: () => act(r, 'decline') }, 'Decline')) : null))))));
  }

  load();
  return [
    h('div.toolbar2', tabs),
    body,
    h('p.hint', icon('info', 14), 'Approve changes the draft, the live invitation and the lock at once, and uses none of the couple’s 3 spelling fixes. To unlock an invitation completely, use “Reset name lock” on it.'),
  ];
}
