// Clients & access › Customer accounts: the accounts customers made when ordering (email + password), and the
// owner's tools for them: link an invitation (with the same permissions as a client link), reset the password
// (no email is sent, so customers ask on WhatsApp), turn an account off, or make one for an older couple.
import { h, icon, toast, openDialog, confirmDialog, fmtDate, fmtRelative, toggle, fill, debounce, iconBtn } from './dom.js';
import { api } from './api.js';
import { themePicker, permsText } from './admin-access.js';
import { customerHome } from './customer.js';
import { pendingActs } from './admin.js'; // Link now / Dismiss (a function: the import cycle is safe)

const genPassword = () => {
  const words = ['marigold', 'lotus', 'saffron', 'diyo', 'tika', 'mala', 'kalash', 'shehnai', 'gurans', 'himal'];
  const a = new Uint32Array(3);
  crypto.getRandomValues(a);
  return `${words[a[0] % words.length]}-${words[a[1] % words.length]}-${1000 + (a[2] % 9000)}`;
};
const coupleOf = (i) => [i.bride, i.groom].filter(Boolean).join(' & ') || i.slug;

/** A password input with "Suggest one" (shown as text: the owner passes it on). */
function pwInput(id, label, hint) {
  const input = h('input.input', { id, type: 'text', minlength: 8, maxlength: 128, autocomplete: 'new-password', spellcheck: 'false', placeholder: 'At least 8 characters' });
  return { input, el: h('div.field', h('label.label', { for: id }, label),
    h('div.inputrow', input, h('button.btn', { type: 'button', onclick: () => { input.value = genPassword(); input.focus(); } }, icon('wand', 15), 'Suggest one')),
    hint ? h('p.hint', hint) : null) };
}

/** A small form dialog; submit(values) resolves to a result (closes) or throws (shows the message). */
function formDialog({ title, fields, submitText, submit, wide = false }) {
  return new Promise((resolve) => {
    let result = null;
    const err = h('p.form-error', { role: 'alert' });
    const id = `fd-${Math.random().toString(36).slice(2, 8)}`;
    const save = h('button.btn.btn--primary', { type: 'submit', form: id }, submitText);
    const form = h('form.stack', { id, novalidate: true }, ...fields, err);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      save.disabled = true;
      try { result = await submit(); d.close(); } catch (ex) { err.textContent = ex.message; save.disabled = false; }
    });
    const d = openDialog({ title, body: form, wide, actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), save], onClose: () => resolve(result) });
    form.querySelector('input, select')?.focus();
  });
}

/** Everything about one account: details, sign-ins, then their dashboard (orders, payments, invitations) read-only. */
function detailsDialog(ctx, c) {
  const facts = [
    ['Name', c.name || '—'], ['Email', `${c.email}${c.emailVerified ? ' (confirmed)' : ' (not confirmed)'}`], ['Phone', c.phone || '—'],
    ['Joined', c.createdAt ? fmtDate(c.createdAt) : '—'],
    ['Last sign-in', c.lastLoginAt ? `${fmtDate(c.lastLoginAt)} (${fmtRelative(c.lastLoginAt)})` : 'Never'],
    ['Sign-ins', String(c.loginCount || 0)], ['Orders', String(c.orders || 0)],
    ['Status', c.disabled ? 'Turned off' : 'Active'], ['Account id', c.id],
  ];
  const logins = c.logins || [];
  openDialog({
    title: c.name || c.email, wide: true,
    body: h('div.stack',
      h('section.card', h('header.card__head', h('h2.card__title', 'Details')),
        h('dl.cu-facts', facts.map(([k, v]) => h('div', h('dt', k), h('dd', v))))),
      h('section.card', h('header.card__head', h('h2.card__title', 'Recent sign-ins')),
        logins.length ? h('ul.cu-logins', logins.map((l) => h('li', h('span', l.device || 'Unknown device'), h('small', { title: fmtDate(l.at) }, fmtRelative(l.at)))))
          : h('p.hint', c.lastLoginAt ? 'Sign-in history starts from today; earlier sign-ins were not recorded.' : 'They have not signed in yet.')),
      customerHome({ meta: ctx.meta, viewAs: c })),
  });
}

function resetDialog(c) {
  const pw = pwInput(`cr-${c.id}`, 'New password', 'They are signed out everywhere. Send it to them on WhatsApp or by phone.');
  return formDialog({
    title: `Reset password · ${c.email}`, fields: [pw.el], submitText: 'Reset password',
    submit: async () => {
      const p = pw.input.value.trim();
      if (p.length < 8) throw new Error('The password needs at least 8 characters.');
      const out = await api(`/admin/customers/${c.id}`, { method: 'PATCH', body: { password: p } });
      return { customer: out.customer, password: p };
    },
  });
}

/** Link an invitation (or change the link's permissions). */
function linkDialog(ctx, c, invitations, current = null) {
  const state = { slug: current?.slug || '', themes: current?.themes ?? 'all', canChangeTheme: current?.canChangeTheme ?? false, canChangeColors: current?.canChangeColors ?? true };
  const taken = new Set((c.invitations || []).map((l) => l.slug));
  const options = invitations.filter((i) => current ? i.slug === current.slug : !taken.has(i.slug));
  const sel = h('select.input', { id: `cl-${c.id}`, disabled: Boolean(current), onchange: (e) => { state.slug = e.target.value; } },
    current ? null : h('option', { value: '' }, 'Choose an invitation'),
    options.map((i) => h('option', { value: i.slug, selected: i.slug === state.slug }, `${coupleOf(i)} · /${i.slug}`)));
  const inv = () => invitations.find((i) => i.slug === state.slug);
  return formDialog({
    title: current ? `Access · ${coupleOf(inv() || { slug: current.slug })}` : `Link an invitation · ${c.email}`,
    wide: true, submitText: current ? 'Save access' : 'Link it',
    fields: [
      h('div.field', h('label.label', { for: sel.id }, 'Invitation'), sel,
        h('p.hint', 'They open it from their dashboard after signing in. Any client link keeps working too.')),
      themePicker(ctx.meta, state.themes, (v) => { state.themes = v; }, inv()?.theme),
      toggle({ label: 'Can choose the gate, first screen and design', hint: 'Off: they see the opening you chose, with a note to ask you.', checked: state.canChangeTheme, onChange: (v) => { state.canChangeTheme = v; } }),
      toggle({ label: 'Can change colours', hint: 'The opening’s main colours, with a reset to the original.', checked: state.canChangeColors, onChange: (v) => { state.canChangeColors = v; } }),
    ],
    submit: async () => {
      if (!state.slug) throw new Error('Choose an invitation.');
      if (state.themes !== 'all' && !state.themes.length) throw new Error('Choose at least one design, or All designs.');
      const { slug, ...perms } = state;
      return (await api(`/admin/customers/${c.id}/invitations/${slug}`, { method: 'PUT', body: perms })).customer;
    },
  });
}

function newAccountDialog() {
  const email = h('input.input', { id: 'na-email', type: 'email', maxlength: 254, autocomplete: 'off', required: true });
  const name = h('input.input', { id: 'na-name', maxlength: 80, autocomplete: 'off', required: true });
  const phone = h('input.input', { id: 'na-phone', type: 'tel', maxlength: 20, autocomplete: 'off' });
  const pw = pwInput('na-pw', 'Password', 'Send it to them separately. They can change it after signing in.');
  return formDialog({
    title: 'New customer account', submitText: 'Create account',
    fields: [h('div.field', h('label.label', { for: 'na-email' }, 'Email'), email), h('div.field', h('label.label', { for: 'na-name' }, 'Name'), name),
      h('div.field', h('label.label', { for: 'na-phone' }, 'Phone or WhatsApp (optional)'), phone), pw.el],
    submit: async () => {
      if (pw.input.value.trim().length < 8) throw new Error('The password needs at least 8 characters.');
      const out = await api('/admin/customers', { method: 'POST', body: { email: email.value, name: name.value, phone: phone.value, password: pw.input.value.trim() } })
        .catch((ex) => { throw new Error(ex.body?.errors?.map((x) => `${x.path} ${x.message}`).join(', ') || ex.message); });
      return { customer: out.customer, password: pw.input.value.trim() };
    },
  });
}

/** The section shown under the client links. */
export function customersSection(ctx, loadInvitations) {
  let items = [];
  let invitations = [];
  let pending = [];
  let q = '';
  const body = h('div.tablebox', h('div.rows-skel', { 'aria-hidden': 'true' }, h('div.rows-skel__row', h('span.skel__line', { style: { width: '44%' } }))));
  const count = h('span.sect__count');
  const waiting = h('div');
  const shownPassword = (out, what) => {
    if (!out) return;
    openDialog({
      title: what, body: h('div.stack',
        h('p.dialog__text', `Send this password to ${out.customer.name || out.customer.email} (${out.customer.email}). It is not shown again.`),
        h('div.inputrow', h('input.input.linkfield', { type: 'text', readonly: true, value: out.password, onfocus: (e) => e.target.select() }),
          h('button.btn.btn--primary', { type: 'button', onclick: () => navigator.clipboard?.writeText(out.password).then(() => toast('Password copied', 'success')) }, icon('copy', 15), 'Copy'))),
    });
  };
  const replace = (c) => { items = items.map((x) => (x.id === c.id ? c : x)); draw(); };
  const draw = () => {
    count.textContent = String(items.length);
    // invitations made for an email: never linked by themselves (emails are not verified); the owner confirms
    fill(waiting, pending.length ? h('ul.rows.pend', pending.map((p) => h('li.task',
      h('span.task__icon', { class: p.account ? 'is-accent' : '' }, icon(p.account ? 'key' : 'history', 16)),
      h('div.task__main',
        h('p.task__title', p.account ? [h('b', p.account.name || p.account.email), ` (${p.account.email}) signed up: link `, h('span.mono', `/${p.slug}`), '?'] : ['Waiting for an account: ', h('span.mono', `/${p.slug}`), ` for ${p.email}`]),
        h('p.task__meta', p.account ? 'Link it only if this is your customer.' : 'When someone signs up with this email, you confirm the link here.')),
      h('div.task__acts', p.account ? pendingActs(p, load) : pendingActs(p, load).slice(1))))) : null);
    const rows = items.filter((c) => !q || `${c.email} ${c.name} ${c.phone} ${(c.invitations || []).map((l) => l.slug).join(' ')}`.toLowerCase().includes(q));
    if (!items.length) { fill(body, h('div.qempty', h('span.qempty__icon', icon('key', 18)), h('div', h('p.qempty__title', 'No accounts yet'), h('p.qempty__text', 'Customers get one when they order on the website.')))); return; }
    if (!rows.length) { fill(body, h('div.qempty', h('span.qempty__icon', icon('search', 18)), h('div', h('p.qempty__title', 'No accounts match')))); return; }
    const byslug = new Map(invitations.map((i) => [i.slug, i]));
    fill(body, h('table.dtable.dtable--cust',
      h('caption.sr-only', 'Customer accounts'),
      h('thead', h('tr', ['Customer', 'Invitations', 'Orders', 'Status', 'Last sign-in'].map((t) => h('th', { scope: 'col' }, t)), h('th', { scope: 'col', class: 'cell-act' }, h('span.sr-only', 'Actions')))),
      h('tbody', rows.map((c) => h('tr', { class: c.disabled ? 'is-off' : '' },
        h('td.cell-couple', h('button.cu-open', { type: 'button', title: 'See everything', onclick: () => detailsDialog(ctx, c) }, h('span.cell-main__t', h('b', c.name || '—'), h('small', c.email), c.phone ? h('small.mono', c.phone) : null))),
        h('td', { 'data-label': 'Invitations' }, h('div.cu-links',
          (c.invitations || []).map((l) => h('span.cu-link', { title: permsText(l) },
            h('button.link.link--quiet', { type: 'button', onclick: async () => { const n = await linkDialog(ctx, c, invitations, l); if (n) { replace(n); toast('Access saved', 'success'); } } }, byslug.get(l.slug) ? coupleOf(byslug.get(l.slug)) : `/${l.slug}`),
            h('button.cu-link__x', { type: 'button', 'aria-label': `Unlink /${l.slug}`, title: 'Unlink', onclick: async () => {
              if (!(await confirmDialog({ title: 'Unlink this invitation?', message: `${c.email} can no longer open /${l.slug} from their dashboard.`, confirm: 'Unlink', danger: true }))) return;
              try { replace((await api(`/admin/customers/${c.id}/invitations/${l.slug}`, { method: 'DELETE' })).customer); } catch (ex) { toast(ex.message, 'error'); }
            } }, icon('close', 12)))),
          h('button.btn.btn--sm', { type: 'button', onclick: async () => { const n = await linkDialog(ctx, c, invitations); if (n) { replace(n); toast('Invitation linked', 'success'); } } }, icon('link', 14), 'Link'))),
        h('td.tnum', { 'data-label': 'Orders' }, String(c.orders || 0)),
        h('td', { 'data-label': 'Status' }, c.disabled ? h('span.pill.pill--warn', 'Off') : h('span.pill.pill--ok', 'Active'), c.emailVerified ? h('span.pill.pill--muted', { title: 'Email confirmed' }, 'Email ✓') : null),
        h('td', { 'data-label': 'Last sign-in', title: c.lastLoginAt ? fmtDate(c.lastLoginAt) : '' }, c.lastLoginAt ? fmtRelative(c.lastLoginAt) : h('small', `Joined ${fmtDate(c.createdAt)}`)),
        h('td.cell-act', h('div.cell-act__in',
          iconBtn('eye', 'See everything', () => detailsDialog(ctx, c), 'btn--ghost'),
          iconBtn('key', 'Reset password', async () => shownPassword(await resetDialog(c), 'Password reset'), 'btn--ghost'),
          h('button.btn.btn--sm', { type: 'button', class: c.disabled ? '' : 'btn--danger-ghost', onclick: async () => {
            const off = !c.disabled;
            if (off && !(await confirmDialog({ title: 'Turn this account off?', message: `${c.email} is signed out at once and cannot sign in until you turn it on again.`, confirm: 'Turn off', danger: true }))) return;
            try { replace((await api(`/admin/customers/${c.id}`, { method: 'PATCH', body: { disabled: off } })).customer); toast(off ? 'Account turned off' : 'Account turned on', 'success'); } catch (ex) { toast(ex.message, 'error'); }
          } }, c.disabled ? 'Turn on' : 'Turn off'))))))));
  };
  const load = () => Promise.all([api('/admin/customers'), loadInvitations()])
    .then(([r, inv]) => { items = r.customers || []; pending = r.pending || []; invitations = inv; draw(); })
    .catch((err) => fill(body, h('p.notice.notice--error', icon('alert', 16), h('span', err.message))));
  load();
  const search = h('label.search', icon('search', 15), h('input.input.input--sm', { type: 'search', placeholder: 'Search accounts', 'aria-label': 'Search accounts', oninput: debounce((e) => { q = e.target.value.trim().toLowerCase(); draw(); }, 120) }));
  return h('section.sect.cu-admin', { 'aria-labelledby': 'cust-h' },
    h('header.sect__head', h('h2.sect__title#cust-h', 'Customer accounts', count),
      h('div.row', search, h('button.btn.btn--sm', { type: 'button', onclick: async () => { const out = await newAccountDialog(); if (out) { items = [out.customer, ...items]; draw(); shownPassword(out, 'Account created'); } } }, icon('plus', 14), 'New account'))),
    h('p.hint', 'Customers sign in at /studio/ with their email and password. An invitation you make for their email (or from their order) appears in their dashboard. Forgot the password? They message you on WhatsApp and you reset it here.'),
    waiting, body);
}
