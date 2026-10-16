// Team & access (super admins only): who can sign in to the studio and what each person can open.
// The owner (server .env) is shown but locked. A "Super admin" can do everything, manage the team and read the audit
// log; an "Admin" opens only the areas ticked for them. Server: lib/team.js (docs/API.md "Team and permissions").
import { h, icon, toast, confirmDialog, fmtDate, fmtRelative, fill, iconBtn } from './dom.js';
import { api } from './api.js';
import { pwInput, formDialog, showPassword } from './admin-customers.js';

const PW_MIN = 10;
const roleLabel = (m) => (m.role === 'super' ? 'Super admin' : 'Admin');
const errText = (ex) => ex.body?.errors?.map((x) => `${x.path} ${x.message}`).join(', ') || ex.message;

/** Role (Super admin / Admin) and the checklist of areas; returns { el, value() }. */
function accessFields(perms, cur = { role: 'admin', perms: [] }, { lockRole = false } = {}) {
  const st = { role: cur.role, perms: new Set(cur.perms) };
  const checks = h('fieldset.permgrid', h('legend.label', 'What they can open'),
    perms.map((p) => h('label.permgrid__item',
      h('input', { type: 'checkbox', value: p.key, checked: st.perms.has(p.key), onchange: (e) => { if (e.target.checked) st.perms.add(p.key); else st.perms.delete(p.key); } }),
      h('span', h('b', p.label), h('small', p.help)))));
  const seg = h('div.seg.seg--wide', { role: 'group', 'aria-label': 'Role' });
  const draw = () => {
    fill(seg, [['admin', 'Admin', 'Only the areas you tick'], ['super', 'Super admin', 'Everything, the team and the audit log']].map(([v, t, title]) => h('button.seg__btn', {
      type: 'button', title, disabled: lockRole, 'aria-pressed': String(st.role === v), onclick: () => { st.role = v; draw(); },
    }, t)));
    checks.hidden = st.role === 'super';
  };
  draw();
  return {
    el: h('div.stack', h('div.field', h('span.label', 'Role'), seg,
      lockRole ? h('p.hint', 'You cannot change your own role.') : null), checks),
    value: () => ({ role: st.role, perms: st.role === 'super' ? [] : perms.map((p) => p.key).filter((k) => st.perms.has(k)) }),
  };
}

function addDialog(perms) {
  const email = h('input.input', { id: 'tm-email', type: 'email', maxlength: 254, autocomplete: 'off', required: true });
  const name = h('input.input', { id: 'tm-name', maxlength: 80, autocomplete: 'off', required: true });
  const pw = pwInput('tm-pw', 'Password', 'Send it to them separately. They sign in at /studio/ with their email.', PW_MIN);
  const access = accessFields(perms);
  return formDialog({
    title: 'Add a team member', submitText: 'Add to the team', wide: true,
    fields: [h('div.field', h('label.label', { for: 'tm-name' }, 'Name'), name), h('div.field', h('label.label', { for: 'tm-email' }, 'Email'), email), pw.el, access.el],
    submit: async () => {
      const password = pw.input.value.trim();
      if (password.length < PW_MIN) throw new Error(`The password needs at least ${PW_MIN} characters.`);
      const a = access.value();
      if (a.role === 'admin' && !a.perms.length) throw new Error('Tick at least one area, or make them a Super admin.');
      const out = await api('/admin/team', { method: 'POST', body: { email: email.value, name: name.value, password, ...a } }).catch((ex) => { throw new Error(errText(ex)); });
      return { member: out.member, password };
    },
  });
}

function editDialog(perms, m, self) {
  const name = h('input.input', { id: `te-name-${m.id}`, maxlength: 80, value: m.name, autocomplete: 'off' });
  const access = accessFields(perms, m, { lockRole: self });
  return formDialog({
    title: `Access · ${m.name || m.email}`, submitText: 'Save', wide: true,
    fields: [h('div.field', h('label.label', { for: name.id }, 'Name'), name), self ? h('p.hint', 'This is you: ask another super admin to change your access.') : access.el,
      self ? null : h('p.hint', icon('info', 14), 'Saving a new role or new areas signs them out; they sign in again to see the change.')],
    submit: async () => {
      const body = { name: name.value };
      if (!self) {
        const a = access.value();
        if (a.role === 'admin' && !a.perms.length) throw new Error('Tick at least one area, or make them a Super admin.');
        Object.assign(body, a);
      }
      return (await api(`/admin/team/${m.id}`, { method: 'PATCH', body }).catch((ex) => { throw new Error(errText(ex)); })).member;
    },
  });
}

function resetDialog(m) {
  const pw = pwInput(`tr-${m.id}`, 'New password', 'They are signed out everywhere. Send it to them separately.', PW_MIN);
  return formDialog({
    title: `Reset password · ${m.email}`, fields: [pw.el], submitText: 'Reset password',
    submit: async () => {
      const p = pw.input.value.trim();
      if (p.length < PW_MIN) throw new Error(`The password needs at least ${PW_MIN} characters.`);
      const out = await api(`/admin/team/${m.id}`, { method: 'PATCH', body: { password: p } }).catch((ex) => { throw new Error(errText(ex)); });
      return { member: out.member, password: p };
    },
  });
}

export function teamPage(ctx) {
  let data = null;
  const body = h('div.tablebox', h('div.rows-skel', { 'aria-hidden': 'true' }, h('div.rows-skel__row', h('span.skel__line', { style: { width: '44%' } }))));
  const count = h('span.sect__count');
  const labelOf = (k) => data.perms.find((p) => p.key === k)?.label || k;
  const replace = (m) => { data.staff = data.staff.map((x) => (x.id === m.id ? m : x)); draw(); };
  const addBtn = h('button.btn.btn--primary.btn--sm', { type: 'button', disabled: true, onclick: async () => {
    const out = await addDialog(data.perms);
    if (out) { data.staff = [...data.staff, out.member]; draw(); showPassword(out, 'Added to the team'); }
  } }, icon('plus', 14), 'Add a team member');

  function draw() {
    count.textContent = String(data.staff.length + 1);
    const ownerRow = h('tr.is-locked',
      h('td.cell-couple', h('span.cell-main__t', h('b', 'Owner'), h('small', data.owner.email))),
      h('td', { 'data-label': 'Role' }, h('span.pill.pill--accent', 'Owner')),
      h('td', { 'data-label': 'Can open' }, 'Everything'),
      h('td', { 'data-label': 'Status' }, h('span.pill.pill--ok', 'Active')),
      h('td', { 'data-label': 'Last sign-in' }, h('small', 'Set in the server settings')),
      h('td.cell-act', h('div.cell-act__in', h('span.team-lock', { title: 'The owner is set in the server settings (.env) and cannot be changed here.' }, icon('lock', 15), h('span.sr-only', 'Locked')))));
    const rows = data.staff.map((m) => {
      const self = m.id === data.me;
      return h('tr', { class: m.disabled ? 'is-off' : '' },
        h('td.cell-couple', h('span.cell-main__t', h('b', m.name || '—', self ? h('span.tag', 'You') : null), h('small', m.email))),
        h('td', { 'data-label': 'Role' }, h('span.pill', { class: m.role === 'super' ? 'pill--accent' : 'pill--muted' }, roleLabel(m))),
        h('td.team-perms', { 'data-label': 'Can open' }, m.role === 'super' ? 'Everything' : m.perms.length ? m.perms.map(labelOf).join(', ') : h('span.muted', 'Nothing yet')),
        h('td', { 'data-label': 'Status' }, m.disabled ? h('span.pill.pill--warn', 'Off') : h('span.pill.pill--ok', 'Active')),
        h('td', { 'data-label': 'Last sign-in', title: m.lastLoginAt ? fmtDate(m.lastLoginAt) : '' }, m.lastLoginAt ? fmtRelative(m.lastLoginAt) : h('small', `Added ${fmtDate(m.createdAt)}`)),
        h('td.cell-act', h('div.cell-act__in',
          iconBtn('edit', 'Change access', async () => { const n = await editDialog(data.perms, m, self); if (n) { replace(n); toast('Saved', 'success'); } }, 'btn--ghost'),
          iconBtn('key', 'Reset password', async () => { const out = await resetDialog(m); if (out) { replace(out.member); showPassword(out, 'Password reset'); } }, 'btn--ghost'),
          self ? null : h('button.btn.btn--sm', { type: 'button', class: m.disabled ? '' : 'btn--danger-ghost', onclick: async () => {
            const off = !m.disabled;
            if (off && !(await confirmDialog({ title: `Turn off ${m.name || m.email}?`, message: 'They are signed out at once and cannot sign in until you turn them on again.', confirm: 'Turn off', danger: true }))) return;
            try { replace((await api(`/admin/team/${m.id}`, { method: 'PATCH', body: { disabled: off } })).member); toast(off ? 'Turned off' : 'Turned on', 'success'); } catch (ex) { toast(ex.message, 'error'); }
          } }, m.disabled ? 'Turn on' : 'Turn off'),
          self ? null : iconBtn('trash', 'Remove from the team', async () => {
            if (!(await confirmDialog({ title: `Remove ${m.name || m.email}?`, message: 'They are signed out at once and their account is deleted. The audit log keeps what they did.', confirm: 'Remove', danger: true }))) return;
            try { await api(`/admin/team/${m.id}`, { method: 'DELETE' }); data.staff = data.staff.filter((x) => x.id !== m.id); draw(); toast('Removed', 'success'); } catch (ex) { toast(ex.message, 'error'); }
          }, 'btn--ghost'))));
    });
    fill(body, h('table.dtable.dtable--team',
      h('caption.sr-only', 'Team members'),
      h('thead', h('tr', ['Person', 'Role', 'Can open', 'Status', 'Last sign-in'].map((t) => h('th', { scope: 'col' }, t)), h('th', { scope: 'col', class: 'cell-act' }, h('span.sr-only', 'Actions')))),
      h('tbody', ownerRow, rows)),
    data.staff.length ? null : h('p.hint.team-empty', 'Only you so far. Add a team member to share the work; tick only what they need.'));
  }

  api('/admin/team').then((r) => { data = r; addBtn.disabled = false; draw(); })
    .catch((err) => fill(body, h('p.notice.notice--error', icon('alert', 16), h('span', err.message))));
  return h('section.sect', { 'aria-labelledby': 'team-h' },
    h('header.sect__head', h('h2.sect__title#team-h', 'People', count), addBtn),
    h('p.hint.team-hint', h('span', 'Everyone signs in at /studio/ with their own email and password. Every change they make goes into the ', h('a', { href: '#/audit' }, 'Audit log'), '.')),
    body);
}
